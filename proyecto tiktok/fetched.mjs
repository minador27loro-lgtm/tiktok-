import { fetchPublicAccount } from "./web/lib/public.mjs";

for (const u of ["cea.crime.eee", ".mogger077"]) {
  try {
    const d = await fetchPublicAccount(u, { force: true });
    console.log("=====", u, "=====");
    console.log(JSON.stringify(d.profile, null, 2));
    console.log("videos:", d.videos.length);
    for (const v of d.videos) {
      console.log(JSON.stringify({
        t: v.title.slice(0, 60),
        c: v.create_time,
        views: v.view_count,
        likes: v.like_count,
        comments: v.comment_count,
        shares: v.share_count,
        saves: v.save_count,
        dur: v.duration,
        url: v.share_url
      }));
    }
  } catch (e) {
    console.log("ERR", u, e.message);
  }
}