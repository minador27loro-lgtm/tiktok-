import { fetchPublicAccount } from "./web/lib/public.mjs";

const out = {};
for (const u of ["cea.crime.eee", ".mogger077"]) {
  const d = await fetchPublicAccount(u, { force: true });
  out[u] = d;
}
import("node:fs").then(fs => fs.writeFileSync("D:/proyecto tiktok/raw_profiles.json", JSON.stringify(out, null, 2)));
console.log("saved");