import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { fetchProviderData, PROVIDERS } from "./lib/providers.mjs";
import { fetchPublicAccount, fetchPublicProfile, clearPublicCache } from "./lib/public.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// ---------------------------------------------------------------- config
function readDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const DEMO = process.argv.includes("--demo") || process.env.MOCK === "1";
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const SCOPES = "user.info.basic,user.info.stats,video.list";
const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API_BASE = "https://open.tiktokapis.com/v2";

let CLIENT_KEY = "";
let CLIENT_SECRET = "";
let REDIRECT_URI = "";
let configured = false;

function refreshConfig() {
  const env = readDotEnv();
  CLIENT_KEY = env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_KEY || "";
  CLIENT_SECRET = env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_CLIENT_SECRET || "";
  REDIRECT_URI = env.REDIRECT_URI || process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;
  configured = Boolean(CLIENT_KEY && CLIENT_SECRET);
}
refreshConfig();

// ---------------------------------------------------------------- storage
const EMPTY_DB = () => ({ tokens: null, source: null, accounts: [], localVideos: [], localProfile: {}, meta: {}, competitors: [], ideas: [] });

async function readDb() {
  try {
    const raw = await fsp.readFile(DB_FILE, "utf8");
    return { ...EMPTY_DB(), ...JSON.parse(raw) };
  } catch {
    return EMPTY_DB();
  }
}

let writeChain = Promise.resolve();
async function writeDb(db) {
  writeChain = writeChain.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fsp.rename(tmp, DB_FILE);
  });
  return writeChain;
}

// ---------------------------------------------------------------- helpers
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const now = () => Date.now();
const pendingStates = new Map();

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string" && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "Content-Type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function isFresh(tokens, skewMs = 120000) {
  return tokens && tokens.expires_at && tokens.expires_at - skewMs > now();
}

async function refreshTokens(db) {
  const t = db.tokens;
  if (!t?.refresh_token) throw new Error("No hay refresh token. Vuelve a conectar la cuenta.");
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: t.refresh_token,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error_description || data.error || "No se pudo renovar el token");
  db.tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    open_id: data.open_id,
    scope: data.scope,
    expires_at: now() + Number(data.expires_in || 86400) * 1000,
    refresh_expires_at: now() + Number(data.refresh_expires_in || 31536000) * 1000,
  };
  await writeDb(db);
  return db.tokens;
}

async function accessToken(db) {
  if (!db.tokens) throw new Error("Cuenta no conectada");
  if (isFresh(db.tokens)) return db.tokens.access_token;
  const t = await refreshTokens(db);
  return t.access_token;
}

async function tiktokFetch(db, url, options = {}) {
  let token = await accessToken(db);
  const doCall = (tk) =>
    fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${tk}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  let res = await doCall(token);
  if (res.status === 401) {
    const t = await refreshTokens(db);
    token = t.access_token;
    res = await doCall(token);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data?.error && data.error.code && data.error.code !== "ok")) {
    const msg = data?.error?.message || `TikTok respondió ${res.status}`;
    const err = new Error(msg);
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------- demo data
function demoProfile() {
  return {
    open_id: "demo-open-id",
    display_name: "Адриан",
    username: "cea.crime.eee",
    avatar_url: "",
    bio_description: "Casos, crimen y misterio. Historias que no te contaron.",
    profile_deep_link: "https://www.tiktok.com/@cea.crime.eee",
    is_verified: false,
    follower_count: 1284,
    following_count: 213,
    likes_count: 108720,
    video_count: 12,
  };
}

function demoVideos() {
  const base = [
    ["El caso que la policía nunca pudo cerrar", 128400, 9800, 412, 1200, 74, 46],
    ["Lo que encontraron en la habitación 302", 64200, 5200, 233, 610, 58, 41],
    ["3 desapariciones sin resolver en España", 231000, 18400, 980, 3100, 68, 49],
    ["Nadie habla de esta parte del caso", 18700, 1400, 96, 180, 51, 32],
    ["El mensaje que llegó después de la muerte", 96700, 8100, 640, 1900, 71, 44],
    ["POV: encuentras esto en el bosque", 412000, 37600, 1200, 8900, 82, 58],
    ["La coartada que no cuadraba", 33800, 2600, 187, 340, 56, 37],
    ["Mito vs realidad: el caso de los 3 testigos", 74200, 6100, 510, 980, 64, 43],
    ["Respondo al comentario más repetido", 21500, 1900, 240, 210, 59, 39],
    ["El detalle que nadie vio en la foto", 154000, 12900, 730, 2400, 76, 47],
    ["Un día grabando true crime (sin filtros)", 8900, 620, 48, 75, 44, 28],
    ["Cómo investigo un caso antes de grabarlo", 45600, 4100, 160, 1250, 66, 45],
  ];
  const start = Date.UTC(2026, 9, 12);
  return base.map((v, i) => {
    const [title, views, likes, comments, shares, ret3, retAvg] = v;
    const created = Math.floor((start + i * 6 * 86400000) / 1000);
    return {
      id: `demo-${i + 1}`,
      title,
      video_description: title,
      duration: 25 + ((i * 7) % 40),
      cover_image_url: "",
      share_url: `https://www.tiktok.com/@cea.crime.eee/video/${7400000000000000000 + i}`,
      create_time: created,
      view_count: views,
      like_count: likes,
      comment_count: comments,
      share_count: shares,
      _demo_retention_3s: ret3,
      _demo_retention_avg: retAvg,
    };
  });
}

// ---------------------------------------------------------------- api
const cache = { profile: null, profileAt: 0, videos: null, videosAt: 0, third: null, thirdAt: 0 };
const CACHE_MS = 60000;

function sourceOf(db) {
  return db.source && db.source.mode ? db.source : null;
}

function isConnected(db) {
  if (DEMO) return true;
  const source = sourceOf(db);
  if (source) {
    if (source.mode === "official") return Boolean(db.tokens);
    if (source.mode === "local" || source.mode === "public") return true;
    return Boolean(source.token);
  }
  return Boolean(db.tokens);
}

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function localProfile(db) {
  const videos = db.localVideos || [];
  const p = db.localProfile || {};
  const handle = db.source?.username || "cea.crime.eee";
  return {
    display_name: p.display_name || "Адриан",
    username: handle,
    avatar_url: "",
    bio_description: "",
    profile_deep_link: `https://www.tiktok.com/@${handle}`,
    follower_count: toNum(p.followers),
    following_count: toNum(p.following),
    likes_count: toNum(p.likes) || videos.reduce((a, v) => a + (Number(v.like_count) || 0), 0),
    video_count: videos.length,
  };
}

function lanUrls() {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal && net.address) {
        urls.push(`http://${net.address}:${PORT}`);
      }
    }
  }
  return [...new Set(urls)];
}

function ensureAccounts(db) {
  if (!Array.isArray(db.accounts)) db.accounts = [];
  if (!db.accounts.length && db.source?.mode === "public" && db.source.username) {
    db.accounts.push({ username: db.source.username, addedAt: now(), history: [] });
  }
}

function snapshot(account, profile) {
  const today = new Date().toISOString().slice(0, 10);
  const point = { date: today, followers: profile.follower_count, likes: profile.likes_count, videos: profile.video_count };
  account.history = Array.isArray(account.history) ? account.history : [];
  const last = account.history[account.history.length - 1];
  if (last && last.date === today) account.history[account.history.length - 1] = point;
  else account.history.push(point);
  if (account.history.length > 120) account.history = account.history.slice(-120);
}

function makeLocalVideo(b) {
  const title = String(b.title || "").trim();
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    title,
    video_description: title,
    duration: toNum(b.duration),
    cover_image_url: "",
    share_url: String(b.url || "").trim(),
    create_time: parseTs(b.date),
    view_count: toNum(b.views),
    like_count: toNum(b.likes),
    comment_count: toNum(b.comments),
    share_count: toNum(b.shares),
    save_count: b.saves !== undefined && b.saves !== null && b.saves !== "" ? toNum(b.saves) : undefined,
  };
}

function parseTs(date) {
  const s = String(date || "").trim();
  if (!s) return Math.floor(now() / 1000);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Math.floor(Date.parse(`${s}T12:00:00Z`) / 1000);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return Math.floor(Date.UTC(year, Number(m[2]) - 1, Number(m[1]), 12) / 1000);
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? Math.floor(t / 1000) : Math.floor(now() / 1000);
}

async function getThird(db, refresh = false) {
  if (!refresh && cache.third && now() - cache.thirdAt < CACHE_MS) return cache.third;
  const source = sourceOf(db);
  const data = await fetchProviderData({
    provider: source.mode,
    token: source.token,
    username: source.username || "cea.crime.eee",
    limit: 30,
  });
  cache.third = data;
  cache.thirdAt = now();
  return data;
}

async function getProfile(db) {
  if (DEMO) return demoProfile();
  const source = sourceOf(db);
  if (source && source.mode === "public") return (await fetchPublicAccount(source.username)).profile;
  if (source && source.mode === "local") return localProfile(db);
  if (source && source.mode !== "official") return (await getThird(db)).profile;
  if (cache.profile && now() - cache.profileAt < CACHE_MS) return cache.profile;
  const fields = [
    "open_id",
    "display_name",
    "avatar_url",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");
  const data = await tiktokFetch(db, `${API_BASE}/user/info/?fields=${encodeURIComponent(fields)}`);
  const user = data?.data?.user || {};
  cache.profile = user;
  cache.profileAt = now();
  return user;
}

async function getVideos(db) {
  if (DEMO) return demoVideos();
  const source = sourceOf(db);
  if (source && source.mode === "public") return (await fetchPublicAccount(source.username)).videos;
  if (source && source.mode === "local") {
    return [...(db.localVideos || [])].sort((a, b) => (b.create_time || 0) - (a.create_time || 0));
  }
  if (source && source.mode !== "official") return (await getThird(db)).videos;
  if (cache.videos && now() - cache.videosAt < CACHE_MS) return cache.videos;
  const fields = [
    "id",
    "title",
    "video_description",
    "duration",
    "cover_image_url",
    "share_url",
    "create_time",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
  ].join(",");
  const all = [];
  let cursor = null;
  for (let page = 0; page < 10; page += 1) {
    const body = cursor ? { cursor, max_count: 20 } : { max_count: 20 };
    const data = await tiktokFetch(db, `${API_BASE}/video/list/?fields=${encodeURIComponent(fields)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const list = data?.data?.videos || [];
    all.push(...list);
    if (!data?.data?.has_more || !list.length) break;
    cursor = data.data.cursor;
  }
  cache.videos = all;
  cache.videosAt = now();
  return all;
}

// ---------------------------------------------------------------- static
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "Prohibido" });
  try {
    const buf = await fsp.readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(buf);
  } catch {
    send(res, 404, { error: "No encontrado" });
  }
}

// ---------------------------------------------------------------- router
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname, searchParams } = url;

  try {
    refreshConfig();

    if (pathname === "/auth/login") {
      if (!configured) return send(res, 400, { error: "Faltan TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en el archivo .env" });
      const state = b64url(crypto.randomBytes(16));
      const verifier = b64url(crypto.randomBytes(48));
      const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
      pendingStates.set(state, { verifier, at: now() });
      const q = new URLSearchParams({
        client_key: CLIENT_KEY,
        scope: SCOPES,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
      res.writeHead(302, { Location: `${AUTH_URL}?${q}` });
      return res.end();
    }

    if (pathname === "/auth/callback") {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      if (error) return send(res, 400, `TikTok devolvió un error: ${error}`, { Location: "/" });
      const pending = state ? pendingStates.get(state) : null;
      if (!code || !pending) return send(res, 400, "Estado de autorización no válido. Vuelve a intentarlo.");
      pendingStates.delete(state);
      if (now() - pending.at > 10 * 60 * 1000) return send(res, 400, "La autorización caducó. Vuelve a intentarlo.");

      const body = new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code_verifier: pending.verifier,
      });
      const r = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
        body,
      });
      const data = await r.json();
      if (!r.ok || data.error) {
        return send(res, 400, `No se pudo completar la conexión: ${data.error_description || data.error || r.status}`);
      }
      const db = await readDb();
      db.tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        open_id: data.open_id,
        scope: data.scope,
        expires_at: now() + Number(data.expires_in || 86400) * 1000,
        refresh_expires_at: now() + Number(data.refresh_expires_in || 31536000) * 1000,
      };
      db.source = { mode: "official", username: "cea.crime.eee" };
      await writeDb(db);
      cache.profile = null;
      cache.videos = null;
      res.writeHead(302, { Location: "/?connected=1" });
      return res.end();
    }

    if (pathname === "/api/status") {
      const db = await readDb();
      const source = sourceOf(db);
      const mode = DEMO ? "demo" : source?.mode || (db.tokens ? "official" : "none");
      return send(res, 200, {
        demo: DEMO,
        configured,
        connected: isConnected(db),
        mode,
        provider: mode === "public" ? "TikTok público" : mode === "local" ? "Manual" : PROVIDERS[mode]?.label || null,
        redirectUri: REDIRECT_URI,
        scopes: SCOPES.split(","),
        urls: { local: `http://localhost:${PORT}`, lan: lanUrls() },
        username: source?.username || "cea.crime.eee",
        clientKeyHint: CLIENT_KEY ? CLIENT_KEY.slice(0, 4) + "…" : "",
        tokenScope: db.tokens?.scope || null,
        hasSourceToken: Boolean(source?.token),
        providers: Object.fromEntries(
          Object.entries(PROVIDERS).map(([key, v]) => [key, { label: v.label, signup: v.signup, tokens: v.tokens, note: v.note }]),
        ),
      });
    }

    if (pathname === "/api/source" && req.method === "POST") {
      const body = await readBody(req);
      const mode = String(body.mode || "");
      if (!["local", "public"].includes(mode) && !PROVIDERS[mode]) {
        return send(res, 400, { error: "Elige el modo público, manual o una API de terceros." });
      }
      const username = String(body.username || "cea.crime.eee").replace(/^@/, "").trim();
      if (!username) return send(res, 400, { error: "Falta el usuario de TikTok." });

      const db = await readDb();
      if (mode === "public") {
        const data = await fetchPublicAccount(username, { force: true });
        db.source = { mode: "public", username, addedAt: now() };
        db.tokens = null;
        await writeDb(db);
        cache.third = null;
        cache.thirdAt = 0;
        cache.profile = null;
        cache.videos = null;
        return send(res, 200, { ok: true, provider: "public", videos: data.videos.length, profile: data.profile });
      }
      if (mode === "local") {
        db.source = { mode: "local", username, addedAt: now() };
        db.tokens = null;
        await writeDb(db);
        cache.third = null;
        cache.thirdAt = 0;
        cache.profile = null;
        cache.videos = null;
        return send(res, 200, { ok: true, provider: "local", videos: (db.localVideos || []).length });
      }

      const token = String(body.token || "").trim();
      if (!token) return send(res, 400, { error: "Pega el token de tu cuenta de " + PROVIDERS[mode].label + "." });

      // Probamos antes de guardar: si el token no vale, no se queda nada a medias.
      const data = await fetchProviderData({ provider: mode, token, username, limit: 30 });
      db.source = { mode, token, username, addedAt: now() };
      db.tokens = null;
      await writeDb(db);
      cache.third = data;
      cache.thirdAt = now();
      cache.profile = null;
      cache.videos = null;
      return send(res, 200, { ok: true, provider: mode, videos: data.videos.length, profile: data.profile });
    }

    if (pathname === "/api/public/account" && req.method === "GET") {
      const username = String(searchParams.get("username") || "").replace(/^@/, "").trim();
      if (!username) return send(res, 400, { error: "Falta el nombre de la cuenta." });
      const data = await fetchPublicAccount(username, { force: searchParams.get("refresh") === "1" });
      return send(res, 200, { profile: data.profile, videos: data.videos, note: data.note });
    }

    if (pathname === "/api/source" && req.method === "DELETE") {
      const db = await readDb();
      db.source = null;
      db.tokens = null;
      await writeDb(db);
      cache.third = null;
      cache.thirdAt = 0;
      cache.profile = null;
      cache.videos = null;
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/profile") {
      const db = await readDb();
      if (!isConnected(db)) return send(res, 401, { error: "Conecta tu cuenta de TikTok primero." });
      const profile = await getProfile(db);
      return send(res, 200, { profile });
    }

    if (pathname === "/api/videos") {
      const db = await readDb();
      if (!isConnected(db)) return send(res, 401, { error: "Conecta tu cuenta de TikTok primero." });
      if (searchParams.get("refresh") === "1") {
        cache.profile = null;
        cache.videos = null;
        cache.third = null;
        cache.thirdAt = 0;
        const src = sourceOf(db);
        if (src?.mode === "public") clearPublicCache(src.username);
      }
      const videos = await getVideos(db);
      return send(res, 200, { videos });
    }

    if (pathname === "/api/local/videos" && req.method === "POST") {
      const db = await readDb();
      if (sourceOf(db)?.mode !== "local") return send(res, 400, { error: "Activa el modo manual primero." });
      const body = await readBody(req);
      const video = makeLocalVideo(body);
      if (!video.title) return send(res, 400, { error: "Pon un título al vídeo." });
      db.localVideos = [...(db.localVideos || []), video];
      await writeDb(db);
      return send(res, 200, { ok: true, video });
    }

    if (pathname.startsWith("/api/local/videos/") && req.method === "DELETE") {
      const id = decodeURIComponent(pathname.split("/").pop() || "");
      const db = await readDb();
      db.localVideos = (db.localVideos || []).filter((v) => v.id !== id);
      await writeDb(db);
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/local/import" && req.method === "POST") {
      const db = await readDb();
      if (sourceOf(db)?.mode !== "local") return send(res, 400, { error: "Activa el modo manual primero." });
      const body = await readBody(req);
      const rows = Array.isArray(body.videos) ? body.videos : [];
      const valid = rows.map(makeLocalVideo).filter((v) => v.title);
      db.localVideos = [...(db.localVideos || []), ...valid];
      await writeDb(db);
      return send(res, 200, { ok: true, imported: valid.length, skipped: rows.length - valid.length });
    }

    if (pathname === "/api/local/profile" && req.method === "PUT") {
      const body = await readBody(req);
      const db = await readDb();
      db.localProfile = {
        display_name: String(body.display_name || "Адриан"),
        followers: toNum(body.followers),
        following: toNum(body.following),
        likes: toNum(body.likes),
      };
      await writeDb(db);
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/accounts/overview" && req.method === "GET") {
      const db = await readDb();
      ensureAccounts(db);
      const accounts = [];
      for (const account of db.accounts) {
        const entry = { username: account.username, history: account.history || [] };
        try {
          const data = await fetchPublicAccount(account.username, { limit: 12, force: searchParams.get("refresh") === "1" });
          entry.profile = data.profile;
          entry.videos = data.videos;
        } catch (err) {
          entry.error = err.message;
        }
        accounts.push(entry);
      }
      return send(res, 200, { accounts, active: db.source?.mode === "public" ? db.source.username : null });
    }

    if (pathname === "/api/accounts" && req.method === "GET") {
      const db = await readDb();
      ensureAccounts(db);
      const active = db.source?.mode === "public" ? db.source.username : null;
      const accounts = [];
      for (const account of db.accounts) {
        const entry = {
          username: account.username,
          addedAt: account.addedAt || null,
          history: account.history || [],
          active: String(active || "").toLowerCase() === account.username.toLowerCase(),
        };
        try {
          const profile = await fetchPublicProfile(account.username);
          entry.profile = profile;
          snapshot(account, profile);
        } catch (err) {
          entry.error = err.message;
        }
        accounts.push(entry);
      }
      await writeDb(db);
      return send(res, 200, { accounts, active });
    }

    if (pathname === "/api/accounts" && req.method === "POST") {
      const body = await readBody(req);
      const username = String(body.username || "").replace(/^@/, "").trim();
      if (!username) return send(res, 400, { error: "Escribe el nombre de la cuenta." });
      const profile = await fetchPublicProfile(username, { force: true });
      const db = await readDb();
      ensureAccounts(db);
      let account = db.accounts.find((a) => a.username.toLowerCase() === profile.username.toLowerCase());
      if (!account) {
        account = { username: profile.username, addedAt: now(), history: [] };
        db.accounts.push(account);
      }
      snapshot(account, profile);
      if (!db.source || db.source.mode !== "public") db.source = { mode: "public", username: profile.username };
      await writeDb(db);
      return send(res, 200, { ok: true, account: { username: profile.username, profile }, active: db.source.username });
    }

    if (pathname === "/api/accounts/active" && req.method === "POST") {
      const body = await readBody(req);
      const username = String(body.username || "").replace(/^@/, "").trim().toLowerCase();
      const db = await readDb();
      ensureAccounts(db);
      const account = db.accounts.find((a) => a.username.toLowerCase() === username);
      if (!account) return send(res, 404, { error: "Esa cuenta no está en tu lista." });
      db.source = { mode: "public", username: account.username };
      await writeDb(db);
      clearPublicCache(account.username);
      return send(res, 200, { ok: true });
    }

    if (pathname.startsWith("/api/accounts/") && req.method === "DELETE") {
      const raw = decodeURIComponent(pathname.slice("/api/accounts/".length));
      if (!raw) return send(res, 400, { error: "Falta la cuenta." });
      const db = await readDb();
      ensureAccounts(db);
      const target = db.accounts.find((a) => a.username.toLowerCase() === raw.toLowerCase());
      db.accounts = db.accounts.filter((a) => a.username.toLowerCase() !== raw.toLowerCase());
      if (db.source?.mode === "public" && db.source.username.toLowerCase() === raw.toLowerCase()) db.source = null;
      await writeDb(db);
      clearPublicCache(raw);
      return send(res, 200, { ok: true, removed: Boolean(target) });
    }

    if (pathname === "/api/db" && req.method === "GET") {
      const db = await readDb();
      return send(res, 200, { meta: db.meta || {}, competitors: db.competitors || [], ideas: db.ideas || [] });
    }

    if (pathname === "/api/db" && req.method === "PUT") {
      const patch = await readBody(req);
      const db = await readDb();
      if (patch.meta && typeof patch.meta === "object") db.meta = patch.meta;
      if (Array.isArray(patch.competitors)) db.competitors = patch.competitors;
      if (Array.isArray(patch.ideas)) db.ideas = patch.ideas;
      await writeDb(db);
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/disconnect" && req.method === "POST") {
      const db = await readDb();
      db.tokens = null;
      db.source = null;
      await writeDb(db);
      cache.profile = null;
      cache.videos = null;
      cache.third = null;
      cache.thirdAt = 0;
      clearPublicCache();
      return send(res, 200, { ok: true });
    }

    if (pathname.startsWith("/api/")) {
      return send(res, 404, { error: "Ruta no encontrada" });
    }

    return serveStatic(req, res, pathname);
  } catch (err) {
    const message = err?.message || "Error inesperado";
    console.error(`[error] ${req.method} ${pathname}: ${message}`);
    return send(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  TikTok Studio  ·  ${DEMO ? "MODO DEMO" : "modo real"}`);
  console.log(`  Ordenador: http://localhost:${PORT}`);
  for (const url of lanUrls()) console.log(`  Móvil:     ${url}`);
  console.log(`  Callback:  ${REDIRECT_URI}`);
  console.log(`  App:       ${configured ? "credenciales cargadas" : "sin API oficial (modo público)"}\n`);
});
