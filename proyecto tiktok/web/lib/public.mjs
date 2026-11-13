// Lectura de datos públicos de TikTok a partir del nombre de la cuenta.
// Sin token, sin login: perfil + vídeos recientes con sus estadísticas.

const BASE = "https://www.tiktok.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TTL = 10 * 60 * 1000;
const TTL_PROFILE = 5 * 60 * 1000;
const cache = new Map();
const profileCache = new Map();

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const stat = (v) => Math.max(0, num(v));

const cleanHandle = (u) => String(u || "").trim().replace(/^@/, "").toLowerCase();

async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`TikTok respondió ${res.status}`);
  return res.text();
}

function universal(html) {
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]).__DEFAULT_SCOPE__ || null;
  } catch {
    return null;
  }
}

function connectState(html) {
  const m = html.match(/<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function loadProfile(handle, force = false) {
  const cached = profileCache.get(handle);
  if (!force && cached && Date.now() - cached.at < TTL_PROFILE) return cached.profile;

  const html = await getHtml(`${BASE}/@${handle}?lang=en`);
  const scope = universal(html);
  const info = scope?.["webapp.user-detail"]?.userInfo;
  if (!info?.user) throw new Error(`No encuentro la cuenta @${handle}. Revisa el nombre.`);
  if (info.user.privateAccount) throw new Error(`@${handle} es una cuenta privada.`);
  const u = info.user;
  const s = info.stats || {};

  const profile = {
    display_name: u.nickname || handle,
    username: u.uniqueId || handle,
    avatar_url: u.avatarLarger || u.avatarMedium || u.avatarThumb || "",
    bio_description: u.signature || "",
    profile_deep_link: `${BASE}/@${u.uniqueId || handle}`,
    follower_count: stat(s.followerCount),
    following_count: stat(s.followingCount),
    likes_count: stat(s.heartCount ?? s.heart),
    video_count: stat(s.videoCount),
  };
  profileCache.set(handle, { at: Date.now(), profile });
  return profile;
}

export async function fetchPublicProfile(username, { force = false } = {}) {
  return loadProfile(cleanHandle(username), force);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length).fill(null);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index;
      index += 1;
      out[i] = await fn(items[i]).catch(() => null);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await Promise.all(workers);
  return out.filter(Boolean);
}

async function videoDetail(handle, id, fallback) {
  const html = await getHtml(`${BASE}/@${handle}/video/${id}?lang=en`);
  const scope = universal(html);
  const item = scope?.["webapp.video-detail"]?.itemInfo?.itemStruct;
  if (!item) throw new Error("Vídeo sin datos");
  const st = item.stats || item.statsV2 || {};
  const duration = num(item.video?.duration);
  return {
    id: String(item.id || id),
    title: item.desc || fallback?.desc || "",
    video_description: item.desc || fallback?.desc || "",
    duration: Math.round(duration > 1000 ? duration / 1000 : duration),
    cover_image_url: fallback?.coverUrl || item.video?.cover || "",
    share_url: `${BASE}/@${handle}/video/${id}`,
    create_time: num(item.createTime),
    view_count: stat(st.playCount ?? fallback?.playCount),
    like_count: stat(st.diggCount),
    comment_count: stat(st.commentCount),
    share_count: stat(st.shareCount),
    save_count: st.collectCount != null ? stat(st.collectCount) : undefined,
  };
}

export async function fetchPublicAccount(username, { limit = 12, force = false } = {}) {
  const handle = cleanHandle(username);
  if (!/^[a-z0-9._]{1,24}$/.test(handle)) throw new Error("Nombre de cuenta no válido. Usa solo letras, números, puntos o guiones bajos.");

  const cached = cache.get(handle);
  if (!force && cached && Date.now() - cached.at < TTL) return cached.data;

  const profile = await loadProfile(handle, force);

  let list = [];
  try {
    const embedHtml = await getHtml(`${BASE}/embed/@${handle}`);
    const state = connectState(embedHtml);
    const data = state?.source?.data || {};
    const key = Object.keys(data).find((k) => k.includes("/embed/"));
    list = (key ? data[key]?.videoList : null) || Object.values(data)[0]?.videoList || [];
  } catch {
    list = [];
  }

  const seen = new Set();
  const embedItems = list
    .filter((v) => v && v.id && !seen.has(String(v.id)) && seen.add(String(v.id)))
    .slice(0, limit);

  const details = await mapLimit(embedItems, 3, (v) => videoDetail(handle, String(v.id), v));

  const videos = details.length
    ? details
    : embedItems.map((v) => ({
        id: String(v.id),
        title: v.desc || "",
        video_description: v.desc || "",
        duration: 0,
        cover_image_url: v.coverUrl || "",
        share_url: `${BASE}/@${handle}/video/${v.id}`,
        create_time: 0,
        view_count: stat(v.playCount),
        like_count: 0,
        comment_count: 0,
        share_count: 0,
      }));

  videos.sort((a, b) => b.create_time - a.create_time);

  const data = {
    profile,
    videos,
    provider: "public",
    partial: true,
    note: `Datos públicos de @${handle}: perfil y ${videos.length} vídeos recientes. TikTok no permite leer el historial completo sin autorización.`,
  };
  cache.set(handle, { at: Date.now(), data });
  return data;
}

export function clearPublicCache(username) {
  if (username) {
    cache.delete(cleanHandle(username));
    profileCache.delete(cleanHandle(username));
  } else {
    cache.clear();
    profileCache.clear();
  }
}
