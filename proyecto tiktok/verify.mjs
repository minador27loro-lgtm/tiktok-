const api = async (p, o = {}) => {
  const r = await fetch("http://localhost:3000" + p, { headers: { "Content-Type": "application/json" }, ...o });
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || ("HTTP " + r.status));
  return d;
};
const ov = await api("/api/accounts/overview?refresh=1");
console.log("accounts:", ov.accounts.map(a => a.username).join(", "));
const html = await (await fetch("http://localhost:3000/")).text();
console.log("page len:", html.length);
console.log("script src:", (html.match(/src="([^"]+)"/) || [])[1]);