import { fetchPublicAccount } from "./web/lib/public.mjs";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function metrics(videos) {
  const vids = videos.filter(v => Number(v.view_count) > 0);
  const count = vids.length;
  const total = vids.reduce((a, v) => a + Number(v.view_count || 0), 0);
  const avg = count ? total / count : 0;
  const er = count ? vids.reduce((a, v) => a + ((Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0)) / Number(v.view_count), 0) / count : 0;
  const saves = count ? vids.reduce((a, v) => a + (Number(v.save_count) || 0), 0) / count : 0;
  const likes = count ? vids.reduce((a, v) => a + (Number(v.like_count) || 0), 0) / count : 0;
  const shares = count ? vids.reduce((a, v) => a + (Number(v.share_count) || 0), 0) / count : 0;
  const comments = count ? vids.reduce((a, v) => a + (Number(v.comment_count) || 0), 0) / count : 0;
  const best = [...vids].sort((a, b) => Number(b.view_count) - Number(a.view_count))[0];
  const days = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const v of vids) {
    const d = new Date(Number(v.create_time) * 1000).getDay();
    const i = (d + 6) % 7;
    days[i].sum += Number(v.view_count || 0);
    days[i].n += 1;
  }
  const weekdays = days.map((d, i) => ({ label: DIAS[i], value: d.n ? d.sum / d.n : 0, n: d.n }));
  const bestDay = [...weekdays].filter(d => d.value > 0).sort((a, b) => b.value - a.value)[0] || null;
  const tags = new Map();
  for (const v of videos) {
    for (const t of String(v.title || "").match(/#[\p{L}\p{N}_]+/gu) || []) {
      const k = t.toLowerCase();
      tags.set(k, (tags.get(k) || 0) + 1);
    }
  }
  const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const recent30 = vids.filter(v => (Date.now() / 1000 - Number(v.create_time)) <= 30 * 86400).length;
  const oldest = vids.length ? Math.min(...vids.map(v => v.create_time)) : 0;
  const newest = vids.length ? Math.max(...vids.map(v => v.create_time)) : 0;
  const spanDays = Math.max(1, (newest - oldest) / 86400);
  const perWeek = count / (spanDays / 7);
  // top by ER
  const topER = [...vids].filter(v => v.view_count > 1000).map(v => ({ t: v.title.slice(0,40), er: ((Number(v.like_count)||0)+(Number(v.comment_count)||0)+(Number(v.share_count)||0))/Number(v.view_count), views: v.view_count, saves: Number(v.save_count)||0, shares: Number(v.share_count)||0 })).sort((a,b)=>b.er-a.er).slice(0,5);
  return { count, total, avg, er, saves, likes, shares, comments, best, weekdays, bestDay, topTags, recent30, perWeek, spanDays, oldest, newest, topER };
}

for (const u of ["cea.crime.eee", ".mogger077"]) {
  const d = await fetchPublicAccount(u, { force: true });
  const m = metrics(d.videos);
  console.log("=====", u, "=====");
  console.log(JSON.stringify({ profile: { name: d.profile.display_name, followers: d.profile.follower_count, likes: d.profile.likes_count, videos: d.profile.video_count, bio: d.profile.bio_description }, m }, null, 2));
  console.log("ALL VIDEOS:");
  for (const v of d.videos) {
    const e = Number(v.view_count) ? ((Number(v.like_count)||0)+(Number(v.comment_count)||0)+(Number(v.share_count)||0))/Number(v.view_count) : 0;
    console.log(JSON.stringify({ t: v.title.slice(0,45), date: new Date(v.create_time*1000).toISOString().slice(0,10), views: v.view_count, likes: v.like_count, c: v.comment_count, s: v.share_count, sv: v.save_count, er: e.toFixed(3), dur: v.duration }));
  }
}