// Conectores con APIs de terceros (sin Login Kit).
// Cada proveedor se normaliza al mismo formato que usa la app.

const TIMEOUT_MS = 180000;

export const PROVIDERS = {
  apify: {
    label: "Apify",
    signup: "https://console.apify.com/sign-up",
    tokens: "https://console.apify.com/settings/integrations",
    note: "TikTok Scraper de Apify. Plan gratis con 5 $ de crédito; 30 vídeos cuestan unos 0,15 $.",
  },
  ensembledata: {
    label: "EnsembleData",
    signup: "https://dashboard.ensembledata.com/register",
    tokens: "https://dashboard.ensembledata.com/",
    note: "Prueba gratis al registrarte. El token está en la esquina superior del panel.",
  },
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");
const coverUrl = (obj) => obj?.url_list?.[0] || obj?.url || "";

function baseVideo(username, id) {
  return `https://www.tiktok.com/@${username}/video/${id}`;
}

/* ---------------------------------------------------------------- Apify */
export function normalizeApify(items, username) {
  if (!Array.isArray(items)) throw new Error("Apify no devolvió una lista de vídeos.");
  const rows = items.filter((i) => i && (i.id || i.awemeId));

  const videos = rows.map((i) => {
    const id = String(first(i.id, i.awemeId, ""));
    const text = first(i.text, i.desc, i.description, "");
    const duration = num(first(i.videoMeta?.duration, i.duration, 0));
    return {
      id,
      title: text,
      video_description: text,
      duration: Math.round(duration > 1000 ? duration / 1000 : duration),
      cover_image_url: first(i.videoMeta?.coverUrl, i.videoMeta?.originalCoverUrl, coverUrl(i.covers?.default), ""),
      share_url: first(i.webVideoUrl, baseVideo(username, id)),
      create_time: num(first(i.createTime, i.createTimeISO ? Date.parse(i.createTimeISO) / 1000 : 0)),
      view_count: num(first(i.playCount, i.viewCount)),
      like_count: num(first(i.diggCount, i.likeCount)),
      comment_count: num(first(i.commentCount, i.commentsCount)),
      share_count: num(i.shareCount),
      save_count: i.collectCount != null ? num(i.collectCount) : undefined,
    };
  }).filter((v) => v.id);

  const author = rows.find((i) => i.authorMeta)?.authorMeta || {};
  const handle = first(author.name, username);
  const profile = {
    display_name: first(author.nickName, author.name, username),
    username: handle,
    avatar_url: first(author.avatar, author.avatarUrl, ""),
    bio_description: first(author.signature, ""),
    profile_deep_link: `https://www.tiktok.com/@${handle}`,
    follower_count: num(author.fans),
    following_count: num(author.following),
    likes_count: num(author.heart),
    video_count: num(author.video) || videos.length,
  };

  videos.sort((a, b) => b.create_time - a.create_time);
  return { profile, videos, provider: "apify" };
}

async function fetchApify({ token, username, limit }) {
  const url = `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profiles: [username],
      resultsPerPage: Math.max(1, Math.min(100, limit)),
      excludePinnedPosts: false,
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Apify devolvió una respuesta inesperada (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error?.type || `HTTP ${res.status}`;
    throw new Error(`Apify: ${msg}`);
  }
  const result = normalizeApify(data, username);
  if (!result.videos.length) {
    throw new Error("Apify no encontró vídeos para ese usuario. Revisa el nombre o si la cuenta es privada.");
  }
  return result;
}

/* ---------------------------------------------------------------- EnsembleData */
export function normalizeEnsemble(postsBody, userBody, username) {
  const payload = postsBody?.data ?? postsBody ?? {};
  const list = Array.isArray(payload) ? payload : (payload.data || payload.posts || []);
  if (!Array.isArray(list)) throw new Error("EnsembleData no devolvió una lista de vídeos.");

  const videos = list.map((p) => {
    const id = String(first(p.aweme_id, p.awemeId, p.id, ""));
    const stats = p.statistics || p.stats || {};
    const text = first(p.desc, p.title, p.content_desc, "");
    const durationMs = num(first(p.video?.duration, p.video?.duration_high_precision?.duration_precision, 0));
    return {
      id,
      title: text,
      video_description: text,
      duration: Math.round(durationMs / 1000),
      cover_image_url: first(
        coverUrl(p.video?.cover),
        coverUrl(p.video?.origin_cover),
        coverUrl(p.video?.dynamic_cover),
        coverUrl(p.video?.ai_dynamic_cover),
        "",
      ),
      share_url: first(p.share_url, p.url, baseVideo(username, id)),
      create_time: num(first(p.create_time, p.createTime)),
      view_count: num(first(stats.play_count, stats.playCount, p.play_count)),
      like_count: num(first(stats.digg_count, stats.diggCount, p.digg_count)),
      comment_count: num(first(stats.comment_count, stats.commentCount, p.comment_count)),
      share_count: num(first(stats.share_count, stats.shareCount, p.share_count)),
      save_count: first(stats.collect_count, stats.collectCount, p.collect_count) != null
        ? num(first(stats.collect_count, stats.collectCount, p.collect_count))
        : undefined,
    };
  }).filter((v) => v.id);

  const author = list.find((p) => p.author)?.author || {};
  const info = userBody?.data?.user || userBody?.data || {};
  const handle = first(info.unique_id, author.unique_id, username);

  const profile = {
    display_name: first(info.nickname, author.nickname, handle),
    username: handle,
    avatar_url: first(
      coverUrl(info.avatar_thumb),
      coverUrl(info.avatar_larger),
      coverUrl(author.avatar_thumb),
      coverUrl(author.avatar_larger),
      "",
    ),
    bio_description: first(info.signature, author.signature, ""),
    profile_deep_link: `https://www.tiktok.com/@${handle}`,
    follower_count: num(first(info.follower_count, author.follower_count)),
    following_count: num(first(info.following_count, author.following_count)),
    likes_count: num(first(info.total_favorited, author.total_favorited, author.heart_count)),
    video_count: num(first(info.aweme_count, author.aweme_count)) || videos.length,
  };

  videos.sort((a, b) => b.create_time - a.create_time);
  return { profile, videos, provider: "ensembledata" };
}

async function fetchEnsemble({ token, username, limit }) {
  const depth = Math.max(1, Math.min(10, Math.ceil(limit / 10)));
  const postsUrl = `https://ensembledata.com/apis/tt/user/posts?${new URLSearchParams({
    username,
    depth: String(depth),
    start_cursor: "0",
    token,
  })}`;

  const res = await fetch(postsUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail || body?.message || `HTTP ${res.status}`;
    throw new Error(`EnsembleData: ${detail}`);
  }

  let userBody = null;
  try {
    const infoRes = await fetch(`https://ensembledata.com/apis/tt/user/info?${new URLSearchParams({ username, token })}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (infoRes.ok) userBody = await infoRes.json();
  } catch {
    // el perfil se deduce de los posts
  }

  const result = normalizeEnsemble(body, userBody, username);
  if (!result.videos.length) {
    throw new Error("EnsembleData no encontró vídeos para ese usuario. Revisa el nombre o si la cuenta es privada.");
  }
  return result;
}

/* ---------------------------------------------------------------- API pública */
export async function fetchProviderData({ provider, token, username, limit = 30 }) {
  const user = String(username || "").replace(/^@/, "").trim();
  if (!user) throw new Error("Falta el usuario de TikTok.");
  if (!token) throw new Error("Falta el token de la API.");
  if (!PROVIDERS[provider]) throw new Error("Proveedor no soportado.");

  const args = { token: String(token).trim(), username: user, limit };
  if (provider === "apify") return fetchApify(args);
  return fetchEnsemble(args);
}
