/* TikTok Studio — panel local para @cea.crime.eee */

const FORMATOS = ["Tutorial", "Tips / Lista", "Storytime", "POV", "Trend / Audio", "Detrás de cámaras", "Producto / Demo", "Reacción", "Comparativa", "Otro"];
const ESTADOS = ["Pendiente", "En guion", "Grabado", "Publicado", "Descartado"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const DEFAULT_IDEAS = [
  { idea: "Serie de 3 partes: «Errores que comete el 90% al empezar»", formato: "Tips / Lista", gancho: "Si haces esto, tu cuenta no va a crecer", why: "Guardados y retención: la gente guarda lo que le corrige un error", ref: "Tu competencia directa", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Reacciono a los vídeos de mi competencia", formato: "Reacción", gancho: "Este vídeo tiene 200k y está mal explicado: te digo por qué", why: "Comentarios y compartidos: el debate dispara el alcance", ref: "Competencia", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Antes / después de mi último cambio", formato: "Comparativa", gancho: "Así era mi cuenta hace 30 días (y así está hoy)", why: "Seguidores y prueba social: demuestra que lo que enseñas funciona", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "POV con una situación que todo el mundo vive", formato: "POV", gancho: "POV: abres TikTok y ves 0 views otra vez", why: "Retención 3 s y compartidos: identificación inmediata", ref: "—", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Tutorial de 60 s: resultado concreto en 3 pasos", formato: "Tutorial", gancho: "Aprende a hacer X en 60 segundos", why: "Guardados: los tutoriales son el formato que más se guarda", ref: "—", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Respondo al comentario más repetido (en vídeo)", formato: "Reacción", gancho: "Me habéis preguntado esto 40 veces", why: "Comentarios y comunidad: demuestra que escuchas", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Mito vs realidad de tu nicho", formato: "Comparativa", gancho: "Deja de creer esto: te lo explico en 40 s", why: "Comentarios y compartidos: corrige una creencia muy extendida", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Lo que nadie te cuenta de tu tema", formato: "Storytime", gancho: "Nadie habla de esta parte de [tema]", why: "Retención media: la curiosidad aguanta hasta el final", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Un día en mi vida (versión honesta, sin filtros)", formato: "Detrás de cámaras", gancho: "Esto no se ve en mis vídeos", why: "Conexión y seguidores: humaniza la cuenta", ref: "—", prioridad: "Baja", estado: "Pendiente" },
  { idea: "Trend con audio en tendencia aplicado a tu tema", formato: "Trend / Audio", gancho: "Usa un audio con más de 50.000 usos", why: "Alcance nuevo: el audio te presta su distribución", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Comparo 3 opciones y elijo una", formato: "Comparativa", gancho: "¿Cuál merece la pena? Las 3, comparadas", why: "Guardados: la gente guarda comparativas antes de decidir", ref: "—", prioridad: "Baja", estado: "Pendiente" },
  { idea: "Serie semanal: «La pregunta de la semana»", formato: "Tips / Lista", gancho: "Cada semana respondo la duda más votada", why: "Serie recurrente: los comentarios alimentan el siguiente vídeo", ref: "—", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Si empezara de cero hoy: 3 cosas que haría distinto", formato: "Tips / Lista", gancho: "Si empezara de cero, haría esto", why: "Guardados y autoridad: consejo directo y accionable", ref: "—", prioridad: "Alta", estado: "Pendiente" },
  { idea: "Día 1 vs día 30: mi evolución real", formato: "Comparativa", gancho: "Así cambió mi cuenta en 30 días", why: "Seguidores y prueba social: demuestra resultados reales", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Los errores que veo en los vídeos de mi nicho", formato: "Reacción", gancho: "Este error lo comete casi todo el mundo", why: "Comentarios y compartidos: opinión + utilidad", ref: "—", prioridad: "Media", estado: "Pendiente" },
  { idea: "Respondo a un comentario negativo (con humor)", formato: "Reacción", gancho: "Me dijeron esto en los comentarios", why: "Comunidad y retención: humaniza y genera simpatía", ref: "—", prioridad: "Baja", estado: "Pendiente" },
].map((x, i) => ({ id: `idea-${i + 1}`, ...x }));

const state = {
  status: null,
  profile: null,
  videos: [],
  meta: {},
  competitors: [],
  ideas: [],
  tab: "resumen",
  setupMode: "apify",
  localForm: false,
  accounts: [],
  activeAccount: null,
  overview: null,
  overviewLoading: false,
  strategyAccount: null,
  newByAccount: {},
  lastUpdate: null,
  q: "",
  fmt: "",
  sort: { key: "create_time", dir: "desc" },
  error: null,
  loading: true,
};

/* ---------------------------------------------------------------- helpers */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("es-ES");
const cf = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const pf = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 1 });

const fmtNum = (n) => nf.format(Math.round(Number(n) || 0));
const fmtCompact = (n) => cf.format(Number(n) || 0);
const fmtPct = (r) => pf.format(Number(r) || 0);
const fmtDuration = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.round((s || 0) % 60)).padStart(2, "0")}`;
const fmtDate = (ts) => new Date((ts || 0) * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
const fmtDateShort = (ts) => new Date((ts || 0) * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  let data = {};
  try { data = await res.json(); } catch { /* respuesta no JSON */ }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg, kind = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3200);
}

let saveTimer;
function save(patch) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api("/api/db", { method: "PUT", body: JSON.stringify(patch) }).catch((e) => toast(e.message, "err"));
  }, 250);
}

function er(v) {
  const views = Number(v.view_count) || 0;
  if (!views) return 0;
  return ((Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0)) / views;
}

function etiqueta(r) { return r >= 0.08 ? "good" : r >= 0.04 ? "mid" : "low"; }
function prioridadClass(p) { return p === "Alta" ? "alta" : p === "Media" ? "media" : "baja"; }

/* ---------------------------------------------------------------- stats */
function stats() {
  const videos = state.videos.filter((v) => Number(v.view_count) > 0);
  const totalViews = videos.reduce((a, v) => a + Number(v.view_count || 0), 0);
  const totalLikes = videos.reduce((a, v) => a + Number(v.like_count || 0), 0);
  const totalComments = videos.reduce((a, v) => a + Number(v.comment_count || 0), 0);
  const totalShares = videos.reduce((a, v) => a + Number(v.share_count || 0), 0);
  const avgViews = videos.length ? totalViews / videos.length : 0;
  const avgER = videos.length ? videos.reduce((a, v) => a + er(v), 0) / videos.length : 0;

  const byDay = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  for (const v of videos) {
    const d = new Date((v.create_time || 0) * 1000).getDay();
    const idx = (d + 6) % 7; // lunes = 0
    byDay[idx].sum += Number(v.view_count || 0);
    byDay[idx].count += 1;
  }
  const weekdays = byDay.map((d, i) => ({ label: DIAS[i], value: d.count ? Math.round(d.sum / d.count) : 0, count: d.count }));
  const bestDay = [...weekdays].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)[0] || null;

  const formats = new Map();
  for (const v of videos) {
    const f = state.meta[v.id]?.formato;
    if (!f) continue;
    const item = formats.get(f) || { formato: f, count: 0, views: 0, er: 0 };
    item.count += 1;
    item.views += Number(v.view_count || 0);
    item.er += er(v);
    formats.set(f, item);
  }
  const formatRows = [...formats.values()]
    .map((f) => ({ ...f, avgViews: f.views / f.count, avgER: f.er / f.count }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const spanDays = videos.length > 1
    ? Math.max(1, (Math.max(...videos.map((v) => v.create_time)) - Math.min(...videos.map((v) => v.create_time))) / 86400)
    : 1;
  const perWeek = videos.length / Math.max(1, spanDays / 7);

  const top = [...videos].sort((a, b) => Number(b.view_count) - Number(a.view_count)).slice(0, 5);

  return { count: videos.length, totalViews, totalLikes, totalComments, totalShares, avgViews, avgER, weekdays, bestDay, formatRows, perWeek, top };
}

/* ---------------------------------------------------------------- charts */
function barChart(items, { color = "", small = false, showValue = true } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars ${small ? "small" : ""}">
    ${items.map((i) => `
      <div class="bar-item" title="${esc(i.label)}: ${fmtNum(i.value)}">
        <div class="bar-val">${showValue && i.value ? fmtCompact(i.value) : ""}</div>
        <div class="bar-track"><div class="bar-fill ${color}" style="height:${Math.max(i.value ? 3 : 0, (i.value / max) * 100)}%"></div></div>
        <div class="bar-label">${esc(i.label)}</div>
      </div>`).join("")}
  </div>`;
}

/* ---------------------------------------------------------------- account */
function renderAccount() {
  const el = $("#account");
  if (state.loading) { el.innerHTML = `<span class="badge off">Cargando…</span>`; return; }
  const s = state.status || {};
  const p = state.profile || {};
  const name = p.display_name || "Адриан";
  const handle = "@" + (s.username || "cea.crime.eee");
  const initial = esc((name || "A").trim().charAt(0).toUpperCase());
  const avatar = p.avatar_url
    ? `<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />`
    : initial;
  const label = s.mode === "public" ? "TikTok público" : s.mode === "local" ? "Manual" : s.provider || "Conectado";
  const badge = s.demo
    ? `<span class="badge demo">Modo demo</span>`
    : s.connected
      ? `<span class="badge ok">${esc(label)}</span>`
      : `<span class="badge off">Sin conectar</span>`;
  el.innerHTML = `
    <div class="acc-user">
      <div class="acc-avatar">${avatar}</div>
      <div class="acc-meta"><span class="acc-name">${esc(name)}</span><span class="acc-handle">${esc(handle)}</span></div>
    </div>
    ${badge}`;
}

/* ---------------------------------------------------------------- setup */
function setupCard() {
  const s = state.status || {};
  const providers = s.providers || {};
  const mode = state.setupMode && providers[state.setupMode] ? state.setupMode : Object.keys(providers)[0] || "apify";
  const p = providers[mode] || {};
  return `
    <section class="card" style="margin-bottom:18px">
      <div class="card-head">
        <div>
          <div class="card-title">Conectar tu cuenta</div>
          <div class="card-sub">Escribe el nombre de la cuenta. Sin registro, sin token y sin Login Kit.</div>
        </div>
        <span class="badge off">Sin conectar</span>
      </div>

      <form data-form="connect-public">
        <div class="form-grid">
          <div class="field" style="grid-column:span 3">
            <label>Cuenta de TikTok</label>
            <input class="input" name="username" required value="${esc(s.username || "cea.crime.eee")}" placeholder="@usuario" />
          </div>
          <div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Ver mis datos</button></div>
        </div>
      </form>

      <p class="note" style="margin:12px 0 0">Trae seguidores, me gusta, nº de vídeos y las estadísticas de tus últimos vídeos: views, likes, comentarios, compartidos y guardados.</p>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center">
        <div>
          <b style="font-size:14px">Sin token: a mano o importando un CSV</b>
          <p class="note" style="margin:4px 0 0">Gratis y sin cuentas. Copia los números de la app de TikTok o sube el CSV de TikTok Analytics; incluye guardados y retención si los tienes.</p>
        </div>
        <button class="btn" data-action="start-local">Empezar en modo manual</button>
      </div>

      <details style="margin-top:18px">
        <summary class="note" style="cursor:pointer">Avanzado: API de terceros con tu token (Apify / EnsembleData)</summary>
        <form data-form="connect-source" style="margin-top:12px">
          <div class="form-grid">
            <div class="field">
              <label>Proveedor</label>
              <select class="select" name="mode">
                ${Object.entries(providers).map(([key, v]) => `<option value="${key}" ${(state.setupMode || "apify") === key ? "selected" : ""}>${esc(v.label)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>Token</label><input class="input" name="token" placeholder="Token del proveedor" autocomplete="off" spellcheck="false" /></div>
            <div class="field"><label>Usuario</label><input class="input" name="username" value="${esc(s.username || "cea.crime.eee")}" /></div>
            <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Conectar API</button></div>
          </div>
        </form>
        <p class="note" style="margin:8px 0 0">Suele dar más datos por vídeo, pero requiere cuenta y token (Apify desde ~0,01 $ por vídeo; EnsembleData con prueba gratis).</p>
      </details>
    </section>`;
}

function notConnected() {
  return `
    ${setupCard()}
    <section class="card">
      <div class="empty">
        <h3>Todavía no hay datos que mostrar</h3>
        <p>Escribe tu cuenta arriba y pulsa <b>Ver mis datos</b>. Si prefieres, también puedes añadir los vídeos a mano o importar un CSV.</p>
      </div>
    </section>`;
}

/* ---------------------------------------------------------------- resumen */
function renderResumen() {
  const s = state.status || {};
  if (!s.connected) return notConnected();
  const st = stats();
  const p = state.profile || {};

  const kpis = [
    { label: "Seguidores", value: fmtNum(p.follower_count || 0), hint: `${fmtNum(p.following_count || 0)} siguiendo`, cls: "" },
    { label: "Me gusta totales", value: fmtCompact(p.likes_count || 0), hint: "en toda la cuenta", cls: "k2" },
    { label: "Vídeos", value: fmtNum(st.count), hint: `${st.perWeek.toFixed(1)} por semana`, cls: "k3" },
    { label: "Views totales", value: fmtCompact(st.totalViews), hint: "últimos vídeos", cls: "k4" },
    { label: "Media por vídeo", value: fmtCompact(st.avgViews), hint: "views", cls: "k5" },
    { label: "ER medio", value: fmtPct(st.avgER), hint: "me gusta + comentarios + compartidos", cls: "k6" },
  ];

  const timeline = [...state.videos]
    .filter((v) => Number(v.create_time) > 0)
    .sort((a, b) => a.create_time - b.create_time)
    .slice(-12)
    .map((v) => ({ label: fmtDateShort(v.create_time), value: Number(v.view_count) || 0 }));

  return `
    ${s.demo ? `<div class="card" style="margin-bottom:18px;border-color:rgba(255,176,32,.35);background:var(--amber-soft)">
      <b style="color:var(--amber)">Modo demo.</b> <span class="note">Estos datos son inventados para probar la interfaz. Para ver los de @cea.crime.eee, configura <b>.env</b> y arranca en modo real.</span>
    </div>` : ""}

    <div class="kpi-grid">
      ${kpis.map((k) => `<div class="kpi ${k.cls}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-hint">${esc(k.hint)}</div></div>`).join("")}
    </div>

    <div class="grid two" style="margin-bottom:18px">
      <section class="card">
        <div class="card-head"><div class="card-title">Views por vídeo</div><div class="card-sub">últimos ${timeline.length}</div></div>
        ${timeline.length ? barChart(timeline, { showValue: timeline.length <= 8 }) : `<div class="empty"><p>Sin vídeos todavía.</p></div>`}
      </section>
      <section class="card">
        <div class="card-head"><div class="card-title">Mejor día para publicar</div><div class="card-sub">media de views</div></div>
        ${barChart(st.weekdays.map((d) => ({ ...d, value: d.value })), { color: "cyan" })}
        <p class="note" style="margin:10px 0 0">${st.bestDay ? `Tu mejor día es <b>${st.bestDay.label}</b> (${fmtNum(st.bestDay.value)} views de media).` : "Aún no hay suficientes datos."}</p>
      </section>
    </div>

    <div class="grid two" style="margin-bottom:18px">
      <section class="card">
        <div class="card-head"><div class="card-title">Top 5 vídeos</div><div class="card-sub">por views</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Vídeo</th><th class="num">Views</th><th class="num">ER</th></tr></thead>
          <tbody>
            ${st.top.map((v, i) => `<tr>
              <td class="num">${i + 1}</td>
              <td><a class="video-title" href="${esc(v.share_url || "#")}" target="_blank" rel="noreferrer">${esc(v.title || v.video_description || "Sin título")}</a></td>
              <td class="num">${fmtNum(v.view_count)}</td>
              <td class="num er ${etiqueta(er(v))}">${fmtPct(er(v))}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div class="card-title">Rendimiento por formato</div><div class="card-sub">etiqueta tus vídeos en la pestaña Vídeos</div></div>
        ${st.formatRows.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Formato</th><th class="num">Vídeos</th><th class="num">Media views</th><th class="num">ER</th></tr></thead>
          <tbody>${st.formatRows.map((f) => `<tr>
            <td>${esc(f.formato)}</td>
            <td class="num">${f.count}</td>
            <td class="num">${fmtCompact(f.avgViews)}</td>
            <td class="num er ${etiqueta(f.avgER)}">${fmtPct(f.avgER)}</td>
          </tr>`).join("")}</tbody>
        </table></div>` : `<div class="empty"><p>Aún no has etiquetado ningún vídeo con un formato.</p></div>`}
      </section>
    </div>

    <div class="grid two-even">
      <section class="card">
        <div class="card-head"><div class="card-title">Interacciones</div></div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Me gusta</td><td class="num">${fmtNum(st.totalLikes)}</td></tr>
            <tr><td>Comentarios</td><td class="num">${fmtNum(st.totalComments)}</td></tr>
            <tr><td>Compartidos</td><td class="num">${fmtNum(st.totalShares)}</td></tr>
            <tr><td>Total</td><td class="num">${fmtNum(st.totalLikes + st.totalComments + st.totalShares)}</td></tr>
          </tbody>
        </table></div>
      </section>
      <section class="card">
        <div class="card-head"><div class="card-title">Nota</div></div>
        <p class="note" style="margin:0">${esc(
          s.demo
            ? "Estos datos son inventados para probar la interfaz."
            : s.mode === "public"
              ? `Datos públicos de @${s.username}: perfil y últimos vídeos. TikTok no permite leer el historial completo ni la retención sin autorización.`
              : s.mode === "local"
                ? "Estos datos los has metido tú. Añade los guardados de cada vídeo para afinar el análisis; la retención y el alcance solo están en la app de TikTok."
                : `Datos públicos obtenidos con ${s.provider || "una API de terceros"}: views, me gusta, comentarios y compartidos. No incluye retención ni alcance.`,
        )}</p>
      </section>
    </div>`;
}

/* ---------------------------------------------------------------- vídeos */
function hasSaves() {
  return state.videos.some((v) => v.save_count !== undefined && v.save_count !== null);
}

function isLocal() {
  return state.status?.mode === "local";
}

function localTools() {
  if (!isLocal()) return "";
  return `<section class="card" style="margin-bottom:18px">
    <div class="card-head">
      <div>
        <div class="card-title">Modo manual</div>
        <div class="card-sub">Añade cada vídeo con los números de TikTok o importa el CSV de Analytics. Todo se guarda en este ordenador.</div>
      </div>
      <span class="badge ok">${fmtNum(state.videos.length)} vídeos</span>
    </div>
    <div class="toolbar" style="margin-bottom:0">
      <button class="btn primary" data-action="toggle-local-form">Añadir vídeo</button>
      <button class="btn" data-action="pick-csv">Importar CSV</button>
      <input type="file" id="csv-file" accept=".csv,.txt,text/csv,text/plain" style="display:none" />
      <span class="note">Si el CSV viene de tiktok.com/analytics, detecta las columnas solo.</span>
    </div>
    ${state.localForm ? localForm() : ""}
  </section>`;
}

function localForm() {
  return `<form data-form="add-local-video" style="margin-top:16px;border-top:1px solid var(--line);padding-top:16px">
    <div class="form-grid">
      <div class="field" style="grid-column:span 2"><label>Título / gancho</label><input class="input" name="title" required placeholder="Ej.: El caso que nadie resolvió" /></div>
      <div class="field"><label>Fecha</label><input class="input" name="date" type="date" /></div>
      <div class="field"><label>Duración (s)</label><input class="input" name="duration" type="number" min="0" placeholder="0" /></div>
      <div class="field"><label>Views</label><input class="input" name="views" type="number" min="0" required placeholder="0" /></div>
      <div class="field"><label>Me gusta</label><input class="input" name="likes" type="number" min="0" placeholder="0" /></div>
      <div class="field"><label>Comentarios</label><input class="input" name="comments" type="number" min="0" placeholder="0" /></div>
      <div class="field"><label>Compartidos</label><input class="input" name="shares" type="number" min="0" placeholder="0" /></div>
      <div class="field"><label>Guardados</label><input class="input" name="saves" type="number" min="0" placeholder="0" /></div>
      <div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Guardar vídeo</button></div>
    </div>
  </form>`;
}

function videoTableRows() {
  const q = state.q.trim().toLowerCase();
  const fmtFilter = state.fmt;
  let rows = state.videos.filter((v) => {
    const title = `${v.title || ""} ${v.video_description || ""}`.toLowerCase();
    if (q && !title.includes(q)) return false;
    if (fmtFilter && (state.meta[v.id]?.formato || "") !== fmtFilter) return false;
    return true;
  });

  const { key, dir } = state.sort;
  rows = rows.sort((a, b) => {
    const va = key === "er" ? er(a) : Number(a[key]) || 0;
    const vb = key === "er" ? er(b) : Number(b[key]) || 0;
    return dir === "asc" ? va - vb : vb - va;
  });

  if (!rows.length) {
    const cols = 8 + (hasSaves() ? 1 : 0) + (isLocal() ? 1 : 0);
    return `<tr><td colspan="${cols}"><div class="empty"><p>No hay vídeos que coincidan con el filtro.</p></div></td></tr>`;
  }

  return rows.map((v) => {
    const cur = state.meta[v.id]?.formato || "";
    const title = v.title || v.video_description || "Sin título";
    return `<tr>
      <td>
        <div class="video-cell">
          ${v.cover_image_url ? `<img class="cover" src="${esc(v.cover_image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" />` : `<div class="cover cover-ph">▶</div>`}
          <div style="min-width:0">
            <a class="video-title" href="${esc(v.share_url || "#")}" target="_blank" rel="noreferrer">${esc(title)}</a>
            <div class="video-sub">${v.duration ? `${fmtDuration(v.duration)} · ` : ""}${fmtDate(v.create_time)}</div>
          </div>
        </div>
      </td>
      <td class="num">${fmtNum(v.view_count)}</td>
      <td class="num">${fmtNum(v.like_count)}</td>
      <td class="num">${fmtNum(v.comment_count)}</td>
      <td class="num">${fmtNum(v.share_count)}</td>
      ${hasSaves() ? `<td class="num">${v.save_count != null ? fmtNum(v.save_count) : "—"}</td>` : ""}
      <td class="num er ${etiqueta(er(v))}">${fmtPct(er(v))}</td>
      <td>
        <select class="select slim" data-video-format="${esc(v.id)}">
          <option value="">—</option>
          ${FORMATOS.map((f) => `<option ${cur === f ? "selected" : ""}>${f}</option>`).join("")}
        </select>
      </td>
      <td>
        <input class="input slim" style="min-width:180px" placeholder="Nota (qué probaste…)" value="${esc(state.meta[v.id]?.notas || "")}" data-video-note="${esc(v.id)}" />
      </td>
      ${isLocal() ? `<td class="num"><button class="btn sm ghost" data-action="del-local-video" data-id="${esc(v.id)}" title="Eliminar">✕</button></td>` : ""}
    </tr>`;
  }).join("");
}

function videoTableHTML() {
  const arrow = (key) => state.sort.key === key ? `<span class="arrow">${state.sort.dir === "asc" ? "▲" : "▼"}</span>` : "";
  return `<div class="table-wrap"><table class="wide">
    <thead><tr>
      <th class="sortable" data-sort="create_time">Vídeo ${arrow("create_time")}</th>
      <th class="num sortable" data-sort="view_count">Views ${arrow("view_count")}</th>
      <th class="num sortable" data-sort="like_count">Me gusta ${arrow("like_count")}</th>
      <th class="num">Coment.</th>
      <th class="num">Compart.</th>
      ${hasSaves() ? `<th class="num">Guardados</th>` : ""}
      <th class="num sortable" data-sort="er">ER ${arrow("er")}</th>
      <th>Formato</th>
      <th>Notas</th>
      ${isLocal() ? `<th></th>` : ""}
    </tr></thead>
    <tbody>${videoTableRows()}</tbody>
  </table></div>`;
}

function renderVideos() {
  if (!state.status?.connected) return notConnected();
  return `
    <div class="section-title">Vídeos <span>${fmtNum(state.videos.length)} publicados</span></div>
    ${localTools()}
    <section class="card">
      <div class="toolbar">
        <input class="input" id="q" type="search" placeholder="Buscar por título…" value="${esc(state.q)}" />
        <select class="select" id="fmt-filter">
          <option value="">Todos los formatos</option>
          ${FORMATOS.map((f) => `<option ${state.fmt === f ? "selected" : ""}>${f}</option>`).join("")}
        </select>
        <div class="spacer"></div>
        <button class="btn" data-action="refresh">Actualizar</button>
      </div>
      <div id="videos-table">${videoTableHTML()}</div>
      <p class="note" style="margin:14px 0 0">Etiquetar el formato y anotar qué probaste te permite ver qué tipo de vídeo funciona. Se guarda automáticamente en este ordenador.</p>
    </section>`;
}

/* ---------------------------------------------------------------- cuentas */
function sparkline(values) {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / span) * 22).toFixed(1)}`)
    .join(" ");
  return `<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="var(--cyan)" stroke-width="2" /></svg>`;
}

function accountCard(a) {
  const p = a.profile || {};
  const hist = Array.isArray(a.history) ? [...a.history].sort((x, y) => String(x.date).localeCompare(String(y.date))) : [];
  const first = hist[0];
  const last = hist[hist.length - 1];
  const delta = first && last ? Number(last.followers) - Number(first.followers) : null;
  const initial = esc(String(p.display_name || a.username || "?").trim().charAt(0).toUpperCase());
  const avatar = p.avatar_url
    ? `<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />`
    : initial;
  return `<article class="acct ${a.active ? "is-active" : ""}">
    <div class="acct-top">
      <div class="acct-avatar">${avatar}</div>
      <div class="acct-id">
        <h3>${esc(p.display_name || a.username)}</h3>
        <a href="https://www.tiktok.com/@${esc(a.username)}" target="_blank" rel="noreferrer">@${esc(a.username)}</a>
      </div>
      ${a.active ? `<span class="pill ok">Viendo ahora</span>` : ""}
    </div>
    ${a.error
      ? `<p class="note warn">${esc(a.error)}</p>`
      : `<div class="acct-stats">
          <div><b>${fmtCompact(p.follower_count)}</b><span>seguidores</span></div>
          <div><b>${fmtCompact(p.likes_count)}</b><span>me gusta</span></div>
          <div><b>${fmtNum(p.video_count)}</b><span>vídeos</span></div>
        </div>
        <div class="acct-growth">
          ${delta == null || hist.length < 2
            ? `<span class="note">Histórico de seguidores: empieza hoy${first?.date ? ` (${esc(first.date)})` : ""}.</span>`
            : delta === 0
              ? `<span class="note">Sin cambios desde ${esc(first.date)}.</span>`
              : `<span class="${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : ""}${fmtNum(delta)} seguidores</span> <span class="note">desde ${esc(first.date)}</span>`}
          ${sparkline(hist.map((h) => Number(h.followers) || 0))}
        </div>
        <div class="acct-actions">
          ${a.active ? "" : `<button class="btn sm primary" data-action="use-account" data-username="${esc(a.username)}">Ver panel</button>`}
          <button class="btn sm ghost danger" data-action="del-account" data-username="${esc(a.username)}">Quitar</button>
        </div>`}
  </article>`;
}

function renderAccounts() {
  const list = state.accounts || [];
  return `
    <div class="section-title">Mis cuentas <span>${fmtNum(list.length)} en seguimiento</span></div>

    <section class="card" style="margin-bottom:18px">
      <div class="card-head">
        <div><div class="card-title">Añadir cuenta</div><div class="card-sub">solo el nombre; guardamos un histórico diario de seguidores</div></div>
      </div>
      <form data-form="add-account">
        <div class="form-grid">
          <div class="field" style="grid-column:span 3"><label>Cuenta de TikTok</label><input class="input" name="username" required placeholder="@usuario" /></div>
          <div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Añadir y seguir</button></div>
        </div>
      </form>
      <p class="note" style="margin:12px 0 0">Cada vez que abras la web se actualizan los datos y se guarda un punto de seguidores al día para ver la evolución.</p>
    </section>

    ${list.length
      ? `<div class="accounts">${list.map(accountCard).join("")}</div>`
      : `<section class="card"><div class="empty"><h3>Sin cuentas todavía</h3><p>Añade @cea.crime.eee y @.mogger077 arriba para tenerlas controladas en un sitio.</p></div></section>`}
  `;
}

/* ---------------------------------------------------------------- estrategia */
const CONTENT_IDEAS = {
  cea: [
    ["Recicla el vídeo de 4,5 M en 3 partes", "Storytime", "Este vídeo tiene 4,5 M y 46 k guardados: lo troceo", "El algoritmo ya validó ese vídeo; cortarlo en 3 con otro gancho lo revive sin perder su peso."],
    ["Recicla el M5 e60v10 de 287 k", "Storytime", "287 k views, 46 k likes y lo publicué hace 3 años", "Mismo motivo: un hit viejo con datos duros es el gancho de autoridad."],
    ["Serie «El coche de la semana»", "Storytime / POV", "Este BMW huele a gasolina y a malas decisiones", "Serie reconocible: la gente vuelve cada semana a ver cuál toca."],
    ["Serie «Coste real»", "Tips / Lista", "Nadie te dice lo que cuesta mantener un V10", "Los costes reales se guardan y se comparten; es tu formato de mayor ER."],
    ["POV: arrancas el V10 a las 7 de la mañana", "POV", "POV: el vecino ya me odia", "Sonido + primer segundo = retención."],
    ["Moscow vs LA: el mismo coche, otra vida", "Comparativa", "El mismo M5, dos ciudades, dos vidas", "Tu ángulo diferencial: dos mundos, mismo coche. Es tu sección más vista."],
    ["Música + coche: el formato que te dio ER 0,10", "Trend / Audio", "#ceacrimeee #songsvibes77: la canción y el coche", "Tu vídeo de mayo tiene ER 0,10 — más que el promedio. Repite la fórmula: coche + canción + texto."],
    ["Antes / después del detallado", "Producto / Demo", "3 horas de limpieza en 15 segundos", "Satisfying puro: guardados y compartidos."],
    ["Reacciono a configuraciones de BMW de mis seguidores", "Reacción", "Con 18 años y este M3: hablemos", "Comentarios y comunidad."],
    ["Ruta nocturna con lluvia (sin hablar)", "Trend / Audio", "Solo el motor y la ciudad", "ASMR visual: se ve entero."],
    ["3 detalles que solo entiende un dueño de BMW", "Tips / Lista", "Solo un dueño de BMW sabe esto", "Nicho + identidad. Alto guardado."],
    ["El coche que todos quieren y nadie aguanta", "Tips / Lista", "Lo compras por 20 y lo vendes por 40", "Debate sano en comentarios."],
    ["Si empezara de cero: 3 cosas que haría distinto", "Tips / Lista", "Si empezara de cero, haría esto", "Autoridad directa: la gente guarda consejos sin filtros."],
    ["El vídeo que no publicaría si empezara de cero", "Storytime", "Por qué este vídeo fue un error", "Autenticidad y comentarios: corrige un error público."],
    ["Un mes sin publicar: qué pasó", "Detrás de cámaras", "Hace 2 meses no subo un vídeo", "Explica la caída de frecuencia y vuelve a conectar."],
  ],
  mogger: [
    ["Recicla el edit de 220 k en 3 versiones", "Trend / Audio", "220 k views con un audio de trend y un coche: lo repito 3 veces", "Tu vídeo más grande (220 k, 3,8 k compartidos) fue trend + coche + vibes. Esa fórmula ya está validada; cámbrala y republícala."],
    ["Recicla el Smallville edit de 31,6 k", "Trend / Audio", "31,6 k views, 240 guardados: el primer looksmaxxer fue Clark Kent", "El mismo formato con otro personaje (Bruce Wayne, Robert Pattinson…) reproduce la fórmula."],
    ["Serie «Glow up en 30 días»", "Storytime", "Día 1: así estoy hoy. Día 30: veremos", "Serie con promesa: seguidores y motivo para volver."],
    ["«Factos» del gym: 1 mes al año", "Humor / Tips", "1 mes al año van al gym… y luego qué", "Tu vídeo de noviembre tiene 661 views y buen ratio de comentarios. El formato humor + truth funciona."],
    ["Reacciona a looksmaxxing de TikTok", "Reacción", "Esto NO es looksmaxxing", "Debate sano; te posiciona como voz crítica. 15 comentarios en el vídeo de #vibesss demuestra que tu audiencia habla."],
    ["POV: llevas 1 año en el gym y nadie lo nota", "POV", "Hasta que te quitas la sudadera", "Identificación total con tu audiencia."],
    ["Transformación en 15 segundos (glow up montage)", "Edición / Trend", "Así estoy en 15 s: día 1 → hoy", "Montaje rápido: alto potencial de guardados y compartidos. El formato que más funciona en tu nicho."],
    ["3 cortes que te suben la cara según tu forma", "Tips / Lista", "Tu cara no es el problema: es el corte", "Guardados altos y muy compartible."],
    ["El outfit que te hace parecer 5 cm más alto", "Tips / Lista", "Nadie te dice esto de la ropa", "Compartidos y debate."],
    ["Rutina de piel de 3 pasos (sin gastar 100 €)", "Tutorial", "Deja de comprar 12 productos", "Utilidad real: guardados."],
    ["Cómo hacerte fotos para verte mejor (sin filtros)", "Tutorial", "El ángulo lo cambia todo", "Guardados y compartidos."],
    ["3 errores de grooming que te restan", "Tips / Lista", "El error nº1 es la barba", "Comentarios y consultas."],
    ["¿Qué canción suena cuando entras al gym?", "Trend / Audio", "#vibesss: la playlist que pone el momento", "Tu vídeo con #vibesss tuvo ER 0,148 — la más alta de los últimos 2 meses. Las playlists/music videos son tu hueco."],
    ["Mi rutina de gym + estilo en 60 s", "Detrás de cámaras", "Lo que hago un día normal", "Conexión y confianza."],
    ["El corte que me arregló la vida", "Storytime", "Antes de este corte, nadie me miraba", "Storytime de transformación: combina grooming + emoción."],
    ["Qué NO hacer si quieres verte mejor", "Tips / Lista", "Deja de hacer esto si quieres un glow up", "Corregir creencias es lo que más genera comentarios."],
  ],
};

const LOOKS_PHRASES = [
  { title: "Mandíbula y rostro", items: [
    "Tu mandíbula no necesita cirugía: necesita menos sodio y más sueño.",
    "La postura cambia tu cara más que cualquier filtro.",
    "No estás feo, estás hinchado.",
    "El 80 % del glow-up es dormir, comer y entrenar.",
    "La mandíbula no seedita: se entrena con el cuello y la respiración.",
    "Si tu perfil se ve hundido, no es la mandíbula: es la cabeza hacia adelante.",
  ]},
  { title: "Pelo y barba", items: [
    "El corte de pelo es el filtro más barato que existe.",
    "Antes de cambiar de cara, cambia de barbero.",
    "Una barba bien perfilada te da dos puntos gratis.",
    "Si tu pelo no te favorece, no es tu cara: es el corte.",
    "El pelo fino no es un problema: es un corte que no le hace honor.",
    "Un corte limpio arregla más que cualquier producto.",
  ]},
  { title: "Piel", items: [
    "La piel se arregla con tres cosas, no con doce productos.",
    "Deja de lavarte la cara con el gel del cuerpo.",
    "El sol envejece más que cualquier genética.",
    "Una piel sana se nota más que un filtro.",
    "La piel bonita no es la que más productos usa: es la que no se destruye.",
    "Duerme bien y tu piel lo notará antes que tu cartera.",
  ]},
  { title: "Cuerpo y gym", items: [
    "No estás gordo, estás desentrenado.",
    "El gym no te cambia la cara: te cambia la postura y la confianza.",
    "Empieza por tres días. El resto es ruido.",
    "La proteína no es magia, pero ayuda.",
    "1 mes al año van al gym… el resto del año se nota menos.",
    "Los hombros son el nuevo rostro: ensancha lo que te queda.",
  ]},
  { title: "Estilo", items: [
    "La ropa no te hace guapo: te hace visible.",
    "Menos logos, mejor fit.",
    "Un básico que te queda bien vale más que diez tendencias.",
    "Si dudas: negro y bien planchado.",
    "El fit no es lo que llevas: es cómo te sientes con lo que llevas.",
    "Un corte que te quede bien te quita 5 años de encima.",
  ]},
  { title: "Mentalidad", items: [
    "El mejor looksmaxxing es dejar de mirarte con lupa.",
    "Compararte con editores de TikTok es el peor filtro.",
    "Nadie nota tus defectos tanto como tú.",
    "La seguridad suma más que cualquier rasgo.",
    "Glow up no es solo físico: es dejar de postergar lo que sabes que debes hacer.",
    "Nadie te ve tan mal como tú te ves al espejo… excepto cuando te miras con lupa.",
  ]},
];

const GROWTH = {
  cea: [
    "Recicla el vídeo de 4,5 M (46 k guardados) y el de 287 k (6,9 k guardados): pártelos en series de 3 y vuelve a publicarlos con otro gancho. Son tus dos activos más valiosos y están parados.",
    "Cadencia real: subes 1 vídeo cada 2-3 meses (último 09/11). Subir a 3 por semana es el salto más grande que puedes dar; empieza por 2.",
    "Primer segundo visual: arranque, detalle del motor o sonido del escape. Nada de intro hablada. Tu mejor ER (0,16) vino de un vídeo con sonido de coche.",
    "Tus formatos con mejor ER son Trend/Audio (0,10-0,16) y Tips/Lista (0,11). Prioriza coche + canción (#songsvibes77) y costes reales.",
    "Crea series con nombre fijo («El coche de la semana», «Coste real», «Moscow vs LA») para que vuelvan.",
    "Colabora con cuentas de coches de tu ciudad: duetos y vídeos juntos. Tu audiencia es 4,1 k y crece por contenido, no por ruido.",
    "Bio y enlace limpios; hashtags de coche (#bmw, #m5, #e60, #mercedes) + #fyp. Tu hashtag #ceacrimeeee ya tiene presencia propia: úsalo como seña.",
  ],
  mogger: [
    "Recicla el edit de 220 k (3,8 k compartidos, 1,75 k guardados) y el Smallville de 31,6 k: son tus dos motores. Repítelos con otro personaje/audio y mide.",
    "Cadencia: 9 vídeos en 30 días (0,28/semana en el histórico). Subir a 4-5 por semana con formato fijo es el salto. Día 1 → día 30 es tu serie de referencia.",
    "Tus formatos con mejor ER: Trend/Audio (0,12-0,15) y Reacción (0,11). El vídeo #vibesss con ER 0,148 es tu referencia: música + momento + texto.",
    "Hooks de 1 segundo con texto grande; vídeos de 7-15 s para retención. Cierra siempre con una pregunta o un «guarda esto»: comentarios y guardados.",
    "Series: «Glow up en 30 días», «Factos del gym», «Reacciono a looksmaxxing». Una por semana, mismo día y hora.",
    "Colabs con gymbros y creadores de estilo; comenta en sus vídeos con criterio. Tu audiencia (673) es pequeña pero activa: 15 comentarios en un vídeo de 364 views es señal de comunidad.",
    "Nada de blackpill ni comparaciones tóxicas: estilo, grooming, gym y cabeza. Ese es tu posicionamiento que no caduca.",
  ],
  common: [
    "4-5 vídeos por semana, mismos días. La constancia pesa más que la idea suelta.",
    "Mira los datos a las 24 h y a los 7 días; duplica el formato que gane.",
    "Un experimento por semana: un formato o un gancho nuevo, y lo mides.",
    "Guarda cada vídeo en la pestaña Vídeos con su formato y una nota de qué probaste.",
    "La pestaña Estrategia se actualiza sola cada 10 min: revisa la radiografía cada vez que subes un vídeo y anota qué cambió.",
  ],
};

function strategyKey(username) {
  return String(username || "").toLowerCase().includes("mogger") ? "mogger" : "cea";
}

function accountMetrics(data) {
  const videos = (data.videos || []).filter((v) => Number(v.view_count) > 0);
  const count = videos.length;
  const total = videos.reduce((a, v) => a + Number(v.view_count || 0), 0);
  const avg = count ? total / count : 0;
  const er = count ? videos.reduce((a, v) => a + ((Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0)) / Number(v.view_count), 0) / count : 0;
  const saves = count ? videos.reduce((a, v) => a + (Number(v.save_count) || 0), 0) / count : 0;
  const best = [...videos].sort((a, b) => Number(b.view_count) - Number(a.view_count))[0];
  const days = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const v of videos) {
    const d = new Date(Number(v.create_time) * 1000).getDay();
    const i = (d + 6) % 7;
    days[i].sum += Number(v.view_count);
    days[i].n += 1;
  }
  const weekdays = days.map((d, i) => ({ label: DIAS[i], value: d.n ? d.sum / d.n : 0 }));
  const bestDay = [...weekdays].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)[0] || null;
  const tags = new Map();
  for (const v of videos) {
    for (const t of String(v.title || "").match(/#[\p{L}\p{N}_]+/gu) || []) {
      const k = t.toLowerCase();
      tags.set(k, (tags.get(k) || 0) + 1);
    }
  }
  const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent30 = videos.filter((v) => (Date.now() / 1000 - Number(v.create_time)) <= 30 * 86400).length;
  return { count, total, avg, er, saves, best, weekdays, bestDay, topTags, recent30 };
}

async function loadOverview(force = false) {
  if (state.overviewLoading) return;
  state.overviewLoading = true;
  state.overviewError = null;
  try {
    const res = await api(`/api/accounts/overview${force ? "?refresh=1" : ""}`);
    state.overview = res.accounts || [];
    state.lastUpdate = Date.now();
    trackNewVideos(state.overview);
  } catch (err) {
    state.overviewError = err.message;
  } finally {
    state.overviewLoading = false;
    render();
  }
}

function trackNewVideos(accounts) {
  const out = {};
  for (const a of accounts) {
    if (!a.videos?.length) continue;
    const key = `tt-seen-${a.username}`;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || "[]"); } catch { seen = []; }
    const ids = a.videos.map((v) => String(v.id));
    out[a.username] = seen.length ? ids.filter((id) => !seen.includes(id)).length : 0;
    localStorage.setItem(key, JSON.stringify([...new Set([...seen, ...ids])].slice(-300)));
  }
  state.newByAccount = out;
}

function renderStrategy() {
  if (!state.overview && !state.overviewLoading) {
    loadOverview();
    return `<section class="card"><div class="empty"><h3>Recopilando datos de tus cuentas…</h3><p>Leo el perfil y los últimos vídeos de cada cuenta. Tarda unos segundos.</p></div></section>`;
  }
  if (!state.overview) {
    return `<section class="card"><div class="empty"><h3>No se pudieron cargar los datos</h3><p>${esc(state.overviewError || "")}</p><button class="btn primary" data-action="reload-overview" style="margin-top:12px">Reintentar</button></div></section>`;
  }

  const accounts = state.overview;
  const active = accounts.find((a) => a.username === state.strategyAccount)
    || accounts.find((a) => a.username === state.activeAccount)
    || accounts[0];

  const key = strategyKey(active.username);
  const m = accountMetrics(active);
  const ideas = CONTENT_IDEAS[key] || CONTENT_IDEAS.cea;
  const growth = GROWTH[key] || GROWTH.cea;
  const fresh = state.newByAccount[active.username] || 0;
  const tags = m.topTags.map(([t, n]) => `<span class="pill">${esc(t)} · ${n}</span>`).join(" ");
  const rows = (active.videos || []).slice(0, 12).map((v) => {
    const views = Number(v.view_count) || 0;
    const e = views ? ((Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0)) / views : 0;
    return `<tr>
      <td>${fmtDate(v.create_time)}</td>
      <td><a class="video-title" href="${esc(v.share_url || "#")}" target="_blank" rel="noreferrer">${esc((v.title || "Sin título").slice(0, 64))}</a></td>
      <td class="num">${fmtNum(views)}</td>
      <td class="num">${fmtNum(v.like_count)}</td>
      <td class="num">${fmtNum(v.comment_count)}</td>
      <td class="num">${fmtNum(v.share_count)}</td>
      <td class="num">${v.save_count != null ? fmtNum(v.save_count) : "—"}</td>
      <td class="num er ${etiqueta(e)}">${fmtPct(e)}</td>
    </tr>`;
  }).join("");

  return `
    <div class="section-title">Estrategia <span>datos, ideas y plan de crecimiento</span></div>

    <div class="strategy-bar">
      <div class="seg">
        ${accounts.map((a) => `<button class="seg-btn ${a.username === active.username ? "is-active" : ""}" data-action="strategy-account" data-username="${esc(a.username)}">@${esc(a.username)}</button>`).join("")}
      </div>
      <span class="note">Actualizado ${state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
      <button class="btn sm" data-action="reload-overview">Actualizar</button>
    </div>

    ${fresh > 0 ? `<div class="fresh">${fresh} vídeo${fresh > 1 ? "s" : ""} nuevo${fresh > 1 ? "s" : ""} en @${esc(active.username)} desde tu última visita.</div>` : ""}

    ${accounts.length > 1 ? `<section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Radiografía comparada (las dos cuentas)</div><div class="card-sub">misma persona, dos perfiles — qué le va mejor a cada uno</div></div>
      <div class="compare-grid">
        ${accounts.map((a) => {
          const mm = accountMetrics(a);
          const isActive = a.username === active.username;
          const best = mm.best ? `${esc((mm.best.title || "").slice(0, 34) || "sin texto")} · ${fmtCompact(mm.best.view_count)}` : "—";
          return `<div class="compare-card ${isActive ? "is-active" : ""}">
            <div class="compare-head">
              <span class="compare-name">@${esc(a.username)}</span>
              <span class="pill ${isActive ? "ok" : ""}">${isActive ? "activa" : "—"}</span>
            </div>
            <div class="compare-grid2">
              <div><b>${fmtCompact(a.profile?.follower_count)}</b><span>seg.</span></div>
              <div><b>${fmtCompact(a.profile?.likes_count)}</b><span>likes</span></div>
              <div><b>${fmtCompact(mm.avg)}</b><span>media views</span></div>
              <div><b>${fmtPct(mm.er)}</b><span>ER</span></div>
              <div><b>${fmtCompact(mm.saves)}</b><span>guard./vídeo</span></div>
              <div><b>${mm.bestDay ? mm.bestDay.label : "—"}</b><span>mejor día</span></div>
            </div>
            <div class="compare-foot">
              <span>${mm.count} vídeos analizados</span>
              <span>${mm.recent30 ? mm.recent30 + " en 30 d" : "—"}</span>
              <span class="muted">Mejor: ${best}</span>
            </div>
          </div>`;
        }).join("")}
      </div>
      <p class="note" style="margin:12px 0 0">
        <b>${esc(active.username)}</b> es la cuenta activa. Cambia el selector de arriba para mover el foco; los datos y las ideas se recargan solos.
        ${accounts.length > 2 ? ` Hay ${accounts.length - 1} cuenta${accounts.length > 2 ? "s" : ""} más.` : ""}
      </p>
    </section>` : ""}

    <section class="card" style="margin-bottom:18px">
      <div class="card-head">
        <div><div class="card-title">Radiografía de @${esc(active.username)}</div><div class="card-sub">${esc(active.profile?.display_name || "")}</div></div>
        <span class="badge ok">${fmtNum(active.profile?.video_count)} vídeos en la cuenta</span>
      </div>
      <div class="metric-grid">
        <div><b>${fmtCompact(active.profile?.follower_count)}</b><span>seguidores</span></div>
        <div><b>${fmtCompact(active.profile?.likes_count)}</b><span>me gusta</span></div>
        <div><b>${fmtCompact(m.avg)}</b><span>media views (12)</span></div>
        <div><b>${fmtPct(m.er)}</b><span>ER medio</span></div>
        <div><b>${fmtCompact(m.saves)}</b><span>guardados / vídeo</span></div>
        <div><b>${m.bestDay ? m.bestDay.label : "—"}</b><span>mejor día</span></div>
      </div>
      <p class="note" style="margin:12px 0 0">
        ${m.best ? `Tu vídeo más fuerte: <b>${esc((m.best.title || "").slice(0, 60) || "sin texto")}</b> con ${fmtCompact(m.best.view_count)} views.` : "Sin datos suficientes."}
        ${m.recent30 ? ` ${m.recent30} vídeo${m.recent30 > 1 ? "s" : ""} en los últimos 30 días.` : ""}
      </p>
      <div style="margin-top:8px" class="tags-row">${tags}</div>
      <div class="table-wrap" style="margin-top:14px"><table class="wide">
        <thead><tr><th>Fecha</th><th>Vídeo</th><th class="num">Views</th><th class="num">Likes</th><th class="num">Com.</th><th class="num">Comp.</th><th class="num">Guard.</th><th class="num">ER</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="8"><div class="empty"><p>Sin vídeos públicos.</p></div></td></tr>`}</tbody>
      </table></div>
    </section>

    <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Ideas de contenido para esta audiencia</div><div class="card-sub">formato + gancho + por qué funciona</div></div>
      <div class="idea-grid">
        ${ideas.map(([title, format, hook, why], i) => `<article class="idea-card">
          <div class="idea-num">${i + 1}</div>
          <div>
            <h4>${esc(title)}</h4>
            <p class="hook">“${esc(hook)}”</p>
            <p class="why">${esc(why)}</p>
            <span class="pill">${esc(format)}</span>
          </div>
        </article>`).join("")}
      </div>
    </section>

    ${key === "mogger" ? `<section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Frases de looksmaxxing</div><div class="card-sub">para @${esc(active.username)}: úsalas de gancho o de cierre</div></div>
      <div class="phrase-grid">
        ${LOOKS_PHRASES.map((group) => `<div class="phrase-group">
          <h4>${esc(group.title)}</h4>
          <ul>${group.items.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        </div>`).join("")}
      </div>
      <p class="note warn" style="margin:14px 0 0">Nada de blackpill, cirugías milagro ni comparaciones que hundan: estilo, grooming, gym y cabeza. Ese es el posicionamiento que no caduca.</p>
    </section>` : ""}

    <section class="card">
      <div class="card-head"><div class="card-title">Plan para hacer crecer @${esc(active.username)}</div><div class="card-sub">basado en tus datos</div></div>
      <ol class="plan-list">
        ${growth.map((p) => `<li>${esc(p)}</li>`).join("")}
      </ol>
      <div class="divider"></div>
      <div class="card-title" style="margin-bottom:8px">Reglas comunes a las dos cuentas</div>
      <ul class="plan-list">
        ${GROWTH.common.map((p) => `<li>${esc(p)}</li>`).join("")}
      </ul>
    </section>`;
}

/* ---------------------------------------------------------------- competencia */
function compStats(comp) {
  const vids = comp.videos || [];
  const views = vids.reduce((a, v) => a + (Number(v.views) || 0), 0);
  const ers = vids.filter((v) => Number(v.views) > 0).map((v) => ((Number(v.likes) || 0) + (Number(v.comments) || 0) + (Number(v.shares) || 0)) / Number(v.views));
  return {
    count: vids.length,
    avgViews: vids.length ? views / vids.length : 0,
    avgER: ers.length ? ers.reduce((a, b) => a + b, 0) / ers.length : 0,
  };
}

function renderCompetencia() {
  const mine = stats();
  const comps = state.competitors || [];
  const best = comps.map((c) => ({ c, s: compStats(c) })).filter((x) => x.s.count).sort((a, b) => b.s.avgViews - a.s.avgViews)[0];

  return `
    <div class="section-title">Competencia <span>compara sus vídeos con tu media</span></div>

    ${best ? `<section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Tu cuenta vs ${esc(best.c.handle)}</div><div class="card-sub">media por vídeo</div></div>
      <div class="comp-stats">
        <span>Tu media: <b>${fmtCompact(mine.avgViews)}</b> views</span>
        <span>Su media: <b>${fmtCompact(best.s.avgViews)}</b> views</span>
        <span>${best.s.avgViews >= mine.avgViews ? `Te supera <b>${(best.s.avgViews / Math.max(1, mine.avgViews)).toFixed(1)}×</b>` : `Vas por delante por <b>${(mine.avgViews / Math.max(1, best.s.avgViews)).toFixed(1)}×</b>`}</span>
        <span>Tu ER <b>${fmtPct(mine.avgER)}</b> · su ER <b>${fmtPct(best.s.avgER)}</b></span>
      </div>
    </section>` : ""}

    ${!comps.length ? `<section class="card" style="margin-bottom:18px"><div class="empty"><h3>Aún no comparas con nadie</h3><p>Añade 2-3 competidores y sus mejores vídeos. Verás cuántas veces te superan, su ER y qué formato les funciona.</p></div></section>` : ""}

    ${comps.map((c) => {
      const s = compStats(c);
      const ratio = mine.avgViews ? (s.avgViews / mine.avgViews).toFixed(1) : "—";
      return `<section class="card" style="margin-bottom:18px">
        <div class="comp-head">
          <div>
            <div class="card-title">${esc(c.handle)}</div>
            <div class="comp-stats" style="margin-top:6px">
              <span><b>${fmtNum(c.followers)}</b> seguidores</span>
              <span><b>${s.count}</b> vídeos</span>
              <span>media <b>${fmtCompact(s.avgViews)}</b> views</span>
              <span>ER <b>${fmtPct(s.avgER)}</b></span>
              <span>× tu media <b style="color:${Number(ratio) >= 3 ? "var(--red)" : "var(--text)"}">${Number(ratio) < 0 ? "—" : ratio}×</b></span>
            </div>
          </div>
          <button class="btn sm danger" data-action="del-comp" data-id="${c.id}">Quitar</button>
        </div>

        ${s.count ? `<div class="table-wrap"><table>
          <thead><tr><th>Vídeo</th><th>Formato</th><th class="num">Views</th><th class="num">Me gusta</th><th class="num">Coment.</th><th class="num">Compart.</th><th class="num">ER</th><th></th></tr></thead>
          <tbody>${(c.videos || []).map((v) => {
            const ver = Number(v.views) || 0;
            const verER = ver ? ((Number(v.likes) || 0) + (Number(v.comments) || 0) + (Number(v.shares) || 0)) / ver : 0;
            return `<tr>
              <td>${esc(v.title)}</td>
              <td>${esc(v.formato || "—")}</td>
              <td class="num">${fmtNum(ver)}</td>
              <td class="num">${fmtNum(v.likes)}</td>
              <td class="num">${fmtNum(v.comments)}</td>
              <td class="num">${fmtNum(v.shares)}</td>
              <td class="num er ${etiqueta(verER)}">${fmtPct(verER)}</td>
              <td class="num"><button class="btn sm ghost" data-action="del-comp-video" data-id="${c.id}" data-vid="${v.id}">✕</button></td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>` : `<p class="note">Añade su primer vídeo para empezar a comparar.</p>`}

        <details style="margin-top:14px">
          <summary class="note" style="cursor:pointer">Añadir un vídeo a mano</summary>
          <form data-form="add-comp-video" data-id="${c.id}" style="margin-top:10px">
            <div class="form-grid">
              <div class="field"><label>Título</label><input class="input" name="title" required placeholder="Gancho del vídeo" /></div>
              <div class="field"><label>Formato</label><select class="select" name="formato"><option value="">—</option>${FORMATOS.map((f) => `<option>${f}</option>`).join("")}</select></div>
              <div class="field"><label>Views</label><input class="input" name="views" type="number" min="0" required placeholder="0" /></div>
              <div class="field"><label>Me gusta</label><input class="input" name="likes" type="number" min="0" placeholder="0" /></div>
              <div class="field"><label>Comentarios</label><input class="input" name="comments" type="number" min="0" placeholder="0" /></div>
              <div class="field"><label>Compartidos</label><input class="input" name="shares" type="number" min="0" placeholder="0" /></div>
              <div class="field" style="grid-column:span 2"><button class="btn primary" type="submit">Añadir vídeo</button></div>
            </div>
          </form>
        </details>
      </section>`;
    }).join("")}

    <section class="card">
      <div class="card-head"><div class="card-title">Añadir competidor</div><div class="card-sub">solo el nombre: traemos sus seguidores y sus últimos vídeos</div></div>
      <form data-form="add-comp-public">
        <div class="form-grid">
          <div class="field" style="grid-column:span 3"><label>Cuenta de TikTok</label><input class="input" name="username" required placeholder="@usuario" /></div>
          <div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Buscar y comparar</button></div>
        </div>
      </form>
      <p class="note" style="margin:12px 0 0">Si además quieres afinar, puedes añadir sus vídeos a mano en cada ficha.</p>
    </section>`;
}

/* ---------------------------------------------------------------- ideas */
function renderIdeas() {
  const ideas = state.ideas || [];
  const counts = {
    alta: ideas.filter((i) => i.prioridad === "Alta" && i.estado === "Pendiente").length,
    guion: ideas.filter((i) => i.estado === "En guion").length,
    publicados: ideas.filter((i) => i.estado === "Publicado").length,
  };
  const order = { Alta: 0, Media: 1, Baja: 2 };
  const list = [...ideas].sort((a, b) => (order[a.prioridad] ?? 3) - (order[b.prioridad] ?? 3));

  return `
    <div class="section-title">Ideas <span>${counts.alta} en alta · ${counts.guion} en guion · ${counts.publicados} publicadas</span></div>

    <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Nueva idea</div><div class="card-sub">se guarda automáticamente</div></div>
      <form data-form="add-idea">
        <div class="form-grid">
          <div class="field" style="grid-column:span 2"><label>Idea / concepto</label><input class="input" name="idea" required placeholder="Ej.: Serie «3 errores al empezar»" /></div>
          <div class="field"><label>Formato</label><select class="select" name="formato">${FORMATOS.map((f) => `<option>${f}</option>`).join("")}</select></div>
          <div class="field"><label>Prioridad</label><select class="select" name="prioridad">${PRIORIDADES.map((p) => `<option ${p === "Media" ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="field" style="grid-column:span 2"><label>Gancho (primeros 3 s)</label><input class="input" name="gancho" placeholder="La frase que para el scroll" /></div>
          <div class="field" style="grid-column:span 2"><label>&nbsp;</label><button class="btn primary" type="submit">Guardar idea</button></div>
        </div>
      </form>
    </section>

    <section class="card">
      ${list.length ? list.map((i) => `
        <article class="idea">
          <div>
            <h4>${esc(i.idea)}</h4>
            ${i.gancho ? `<p class="hook">“${esc(i.gancho)}”</p>` : ""}
            ${i.why ? `<p class="why">${esc(i.why)}</p>` : ""}
            <p class="ref">${esc(i.formato || "—")}${i.ref ? ` · ${esc(i.ref)}` : ""}</p>
          </div>
          <div class="idea-actions">
            <span class="pill ${prioridadClass(i.prioridad)}">${esc(i.prioridad)}</span>
            <select class="select slim" data-idea-estado="${i.id}">
              ${ESTADOS.map((e) => `<option ${i.estado === e ? "selected" : ""}>${e}</option>`).join("")}
            </select>
            <button class="btn sm ghost" data-action="del-idea" data-id="${i.id}" title="Eliminar">✕</button>
          </div>
        </article>`).join("") : `<div class="empty"><h3>Sin ideas todavía</h3><p>Añade la primera arriba. Regla: nunca empieces la semana sin 2 en prioridad Alta.</p></div>`}
    </section>`;
}

/* ---------------------------------------------------------------- ajustes */
function renderAjustes() {
  const s = state.status || {};
  const local = s.mode === "local";
  const lan = s.urls?.lan || [];
  const mobileUrls = lan.length ? lan : [];
  const modeLabel = s.demo
    ? "Demo (datos inventados)"
    : s.mode === "public"
      ? "Datos públicos de TikTok (sin token)"
      : local
        ? "Manual (tú introduces los datos)"
        : s.connected
          ? `API de terceros · ${s.provider || ""}`
          : "Sin conectar";
  return `
    <div class="section-title">Ajustes <span>conexión y datos</span></div>

    <section class="card" style="margin-bottom:18px">
      <div class="card-head">
        <div><div class="card-title">Abrir en el móvil</div><div class="card-sub">el móvil y el ordenador tienen que estar en la misma Wi-Fi</div></div>
      </div>
      ${mobileUrls.length
        ? mobileUrls.map((u) => `<div class="code-row" style="margin-bottom:8px">
            <code class="code">${esc(u)}</code>
            <button class="btn sm" data-action="copy-url" data-url="${esc(u)}">Copiar</button>
          </div>`).join("")
        : `<p class="note warn">No he detectado una red local. Conéctate a la Wi-Fi y recarga.</p>`}
      <p class="note" style="margin:10px 0 0">Escribe esa dirección en Chrome o Safari del móvil. Si no carga: comprueba que estáis en la misma Wi-Fi y permite el puerto ${esc(String(state.status?.urls?.local?.split(":").pop() || "3000"))} cuando Windows lo pregunte.</p>
    </section>

    <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Fuente de datos</div>
        <span class="badge ${s.connected ? "ok" : "off"}">${s.demo ? "Modo demo" : s.connected ? esc(s.provider || "Conectado") : "Sin conectar"}</span>
      </div>
      <div class="table-wrap"><table><tbody>
        <tr><td>Modo</td><td>${modeLabel}</td></tr>
        <tr><td>Usuario</td><td>@${esc(s.username || "cea.crime.eee")}</td></tr>
        ${local || s.mode === "public" ? "" : `<tr><td>Token</td><td>${s.hasSourceToken ? "Guardado en este ordenador" : "—"}</td></tr>`}
      </tbody></table></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        ${s.connected && !s.demo ? `<button class="btn danger" data-action="disconnect">Desconectar</button>` : ""}
        ${s.connected ? `<button class="btn" data-action="refresh">Actualizar datos</button>` : ""}
      </div>
    </section>

    ${local
      ? `<section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Tu cuenta</div><div class="card-sub">solo para calcular los KPIs</div></div>
      <form data-form="local-profile">
        <div class="form-grid">
          <div class="field"><label>Seguidores</label><input class="input" name="followers" type="number" min="0" value="${Number(state.profile?.follower_count) || 0}" /></div>
          <div class="field"><label>Siguiendo</label><input class="input" name="following" type="number" min="0" value="${Number(state.profile?.following_count) || 0}" /></div>
          <div class="field"><label>Me gusta totales</label><input class="input" name="likes" type="number" min="0" value="${Number(state.profile?.likes_count) || 0}" /></div>
          <div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Guardar</button></div>
        </div>
      </form>
    </section>`
      : ""}

    <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div class="card-title">Tus datos</div></div>
      <p class="note" style="margin-top:0">Todo se guarda en <b>web/.data/db.json</b>, en tu ordenador: el token (si usas una API), tus vídeos manuales, etiquetas, competidores e ideas.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button class="btn" data-action="export">Exportar todo a JSON</button>
        <button class="btn danger" data-action="reset-local">Borrar etiquetas, competencia e ideas</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div class="card-title">Qué datos se pueden ver</div></div>
      <p class="note" style="margin:0">Con una API de terceros: perfil y, por vídeo, views, me gusta, comentarios, compartidos y (según proveedor) guardados. Con el modo manual puedes añadir también guardados y retención. La retención y el alcance solo están en la app de TikTok.</p>
    </section>`;
}

/* ---------------------------------------------------------------- manual / CSV */
async function reloadAll() {
  state.status = await api("/api/status");
  const accountsRes = await api("/api/accounts").catch(() => ({ accounts: [], active: null }));
  state.accounts = accountsRes.accounts || [];
  state.activeAccount = accountsRes.active || null;
  if (state.status.connected) {
    const [p, v, db] = await Promise.all([api("/api/profile"), api("/api/videos"), api("/api/db")]);
    state.profile = p.profile || {};
    state.videos = v.videos || [];
    state.meta = db.meta || state.meta;
    state.competitors = db.competitors || [];
    if (db.ideas?.length) state.ideas = db.ideas;
  } else {
    state.profile = null;
    state.videos = [];
  }
  render();
}

function parseCsv(text) {
  const clean = String(text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.slice(0, clean.indexOf("\n") === -1 ? clean.length : clean.indexOf("\n"));
  const delim = firstLine.includes("\t")
    ? "\t"
    : (firstLine.split(";").length > firstLine.split(",").length ? ";" : ",");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function mapCsvHeaders(headers) {
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const hs = headers.map(norm);
  const find = (...names) => {
    for (const n of names) {
      const exact = hs.indexOf(n);
      if (exact >= 0) return exact;
    }
    for (const n of names) {
      const partial = hs.findIndex((h) => h.includes(n));
      if (partial >= 0) return partial;
    }
    return null;
  };
  return {
    title: find("titulo", "title", "descripcion", "description", "video"),
    date: find("fecha", "date", "dia", "publicado", "published"),
    views: find("views", "visualizaciones", "reproducciones", "vistas", "plays"),
    likes: find("megusta", "likes", "like", "digg"),
    comments: find("comentarios", "comments", "comment"),
    shares: find("compartidos", "shares", "share"),
    saves: find("guardados", "saves", "favoritos", "favorites", "saved"),
    duration: find("duracion", "duration"),
  };
}

function parseCsvNumber(value) {
  if (value == null) return 0;
  let s = String(value).replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

async function importCsvFile(file) {
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("El archivo no tiene datos.");
  const map = mapCsvHeaders(rows[0]);
  if (map.title == null || map.views == null) {
    throw new Error(`No encuentro las columnas de título y views. Cabeceras: ${rows[0].slice(0, 8).join(" · ")}`);
  }
  const videos = rows.slice(1).map((r) => ({
    title: String(r[map.title] || "").trim(),
    date: map.date != null ? r[map.date] : "",
    views: parseCsvNumber(r[map.views]),
    likes: map.likes != null ? parseCsvNumber(r[map.likes]) : 0,
    comments: map.comments != null ? parseCsvNumber(r[map.comments]) : 0,
    shares: map.shares != null ? parseCsvNumber(r[map.shares]) : 0,
    saves: map.saves != null ? parseCsvNumber(r[map.saves]) : undefined,
    duration: map.duration != null ? parseCsvNumber(r[map.duration]) : 0,
  })).filter((v) => v.title);

  if (!videos.length) throw new Error("No he podido leer ningún vídeo del CSV.");
  const res = await api("/api/local/import", { method: "POST", body: JSON.stringify({ videos }) });
  toast(`${res.imported} vídeos importados${res.skipped ? `, ${res.skipped} sin título` : ""}`, "ok");
  await reloadAll();
}

/* ---------------------------------------------------------------- render */
const TABS = { resumen: renderResumen, accounts: renderAccounts, videos: renderVideos, competencia: renderCompetencia, strategy: renderStrategy, ideas: renderIdeas, ajustes: renderAjustes };

function render() {
  renderAccount();
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === state.tab));
  const view = $("#view");
  if (state.error) {
    view.innerHTML = `<section class="card"><div class="empty"><h3>No se pudieron cargar los datos</h3><p>${esc(state.error)}</p><button class="btn primary" data-action="retry" style="margin-top:14px">Reintentar</button></div></section>`;
    return;
  }
  view.innerHTML = (TABS[state.tab] || renderResumen)();
}

function setTab(tab) {
  if (!TABS[tab]) tab = "resumen";
  state.tab = tab;
  if (location.hash !== `#${tab}`) location.hash = tab;
  else render();
}

window.addEventListener("hashchange", () => {
  const tab = location.hash.slice(1);
  if (TABS[tab] && tab !== state.tab) { state.tab = tab; render(); }
});

function refreshVideoTable() {
  const box = document.querySelector("#videos-table");
  if (box) box.innerHTML = videoTableHTML();
}

/* ---------------------------------------------------------------- events */
document.addEventListener("click", async (e) => {
  const tab = e.target.closest(".tab");
  if (tab) { setTab(tab.dataset.tab); return; }

  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === "retry") { location.reload(); }
    if (action === "need-config") {
      toast("Guarda TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en web/.env y vuelve a pulsar Conectar.", "err");
    }
    if (action === "setup-mode") {
      state.setupMode = actionEl.dataset.mode;
      render();
    }
    if (action === "start-local") {
      try {
        await api("/api/source", { method: "POST", body: JSON.stringify({ mode: "local", username: state.status?.username || "cea.crime.eee" }) });
        await reloadAll();
        toast("Modo manual activado. Añade tu primer vídeo.", "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "toggle-local-form") {
      state.localForm = !state.localForm;
      render();
    }
    if (action === "pick-csv") {
      const input = document.querySelector("#csv-file");
      if (input) input.click();
    }
    if (action === "strategy-account") {
      state.strategyAccount = actionEl.dataset.username;
      render();
    }
    if (action === "reload-overview") {
      state.overview = null;
      loadOverview(true);
      toast("Actualizando datos de las cuentas…");
    }
    if (action === "use-account") {
      try {
        await api("/api/accounts/active", { method: "POST", body: JSON.stringify({ username: actionEl.dataset.username }) });
        await reloadAll();
        toast(`Ahora ves @${actionEl.dataset.username}`, "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "del-account") {
      const handle = actionEl.dataset.username;
      if (!confirm(`¿Quitar @${handle} de tus cuentas? No borra nada de TikTok.`)) return;
      try {
        await api(`/api/accounts/${encodeURIComponent(handle)}`, { method: "DELETE" });
        await reloadAll();
        toast("Cuenta quitada", "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "del-local-video") {
      try {
        await api(`/api/local/videos/${encodeURIComponent(actionEl.dataset.id)}`, { method: "DELETE" });
        await reloadAll();
        toast("Vídeo eliminado", "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "copy-redirect") {
      const text = state.status?.redirectUri || "";
      try { await navigator.clipboard.writeText(text); toast("URL copiada", "ok"); } catch { toast("No se pudo copiar", "err"); }
    }
    if (action === "copy-url") {
      try { await navigator.clipboard.writeText(actionEl.dataset.url || ""); toast("Dirección copiada", "ok"); } catch { toast("No se pudo copiar", "err"); }
    }
    if (action === "refresh") {
      try {
        toast("Actualizando…");
        const { videos } = await api("/api/videos?refresh=1");
        state.videos = videos;
        render();
        toast("Datos actualizados", "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "disconnect") {
      if (!confirm("¿Desconectar la cuenta de TikTok? Tus etiquetas e ideas se conservan.")) return;
      try { await api("/api/disconnect", { method: "POST" }); location.reload(); } catch (err) { toast(err.message, "err"); }
    }
    if (action === "export") {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: state.profile, videos: state.videos, meta: state.meta, competitors: state.competitors, ideas: state.ideas }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tiktok-studio.json";
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (action === "reset-local") {
      if (!confirm("Se borrarán etiquetas, competidores e ideas. Las métricas de TikTok no se tocan. ¿Continuar?")) return;
      try {
        await api("/api/db", { method: "PUT", body: JSON.stringify({ meta: {}, competitors: [], ideas: [] }) });
        state.meta = {}; state.competitors = []; state.ideas = [];
        render();
        toast("Datos locales borrados", "ok");
      } catch (err) { toast(err.message, "err"); }
    }
    if (action === "del-comp") {
      state.competitors = state.competitors.filter((c) => c.id !== actionEl.dataset.id);
      save({ competitors: state.competitors });
      render();
    }
    if (action === "del-comp-video") {
      const comp = state.competitors.find((c) => c.id === actionEl.dataset.id);
      if (comp) comp.videos = (comp.videos || []).filter((v) => v.id !== actionEl.dataset.vid);
      save({ competitors: state.competitors });
      render();
    }
    if (action === "del-idea") {
      state.ideas = state.ideas.filter((i) => i.id !== actionEl.dataset.id);
      save({ ideas: state.ideas });
      render();
    }
    return;
  }

  const sortTh = e.target.closest("th[data-sort]");
  if (sortTh) {
    const key = sortTh.dataset.sort;
    state.sort = { key, dir: state.sort.key === key && state.sort.dir === "desc" ? "asc" : "desc" };
    refreshVideoTable();
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "q") { state.q = e.target.value; refreshVideoTable(); }
  if (e.target.matches("[data-video-note]")) {
    const id = e.target.dataset.videoNote;
    state.meta[id] = { ...(state.meta[id] || {}), notas: e.target.value };
    save({ meta: state.meta });
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "csv-file") {
    importCsvFile(e.target.files?.[0]).catch((err) => toast(err.message, "err"));
    e.target.value = "";
  }
  if (e.target.id === "fmt-filter") { state.fmt = e.target.value; refreshVideoTable(); }
  if (e.target.matches("[data-video-format]")) {
    const id = e.target.dataset.videoFormat;
    state.meta[id] = { ...(state.meta[id] || {}), formato: e.target.value };
    save({ meta: state.meta });
    if (state.tab === "resumen") render();
  }
  if (e.target.matches("[data-idea-estado]")) {
    const id = e.target.dataset.ideaEstado;
    const idea = state.ideas.find((i) => i.id === id);
    if (idea) { idea.estado = e.target.value; save({ ideas: state.ideas }); render(); }
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    if (kind === "add-idea") {
      state.ideas.push({
        id: `idea-${Date.now()}`,
        idea: data.idea.trim(),
        formato: data.formato,
        gancho: (data.gancho || "").trim(),
        why: "",
        ref: "",
        prioridad: data.prioridad || "Media",
        estado: "Pendiente",
      });
      save({ ideas: state.ideas });
      render();
      toast("Idea guardada", "ok");
    }

    if (kind === "add-comp-public") {
      const username = String(data.username || "").replace(/^@/, "").trim();
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "Buscando…"; }
      try {
        const res = await api(`/api/public/account?username=${encodeURIComponent(username)}`);
        const handle = `@${res.profile.username}`;
        if (state.competitors.some((c) => c.handle.toLowerCase() === handle.toLowerCase())) {
          toast(`${handle} ya está en la lista.`, "err");
        } else {
          state.competitors.push({
            id: `comp-${Date.now()}`,
            handle,
            followers: Number(res.profile.follower_count) || 0,
            likes: Number(res.profile.likes_count) || 0,
            videos: (res.videos || []).map((v) => ({
              id: v.id,
              title: v.title || "(sin texto)",
              formato: "",
              views: v.view_count,
              likes: v.like_count,
              comments: v.comment_count,
              shares: v.share_count,
              saves: v.save_count,
              fecha: v.create_time,
              url: v.share_url,
            })),
            fetchedAt: Date.now(),
          });
          save({ competitors: state.competitors });
          toast(`${handle}: ${res.videos.length} vídeos añadidos`, "ok");
        }
      } catch (err) {
        toast(err.message, "err");
      } finally {
        if (button) { button.disabled = false; button.textContent = "Buscar y comparar"; }
        render();
      }
    }

    if (kind === "add-comp") {
      const handle = data.handle.trim();
      if (!handle) return;
      state.competitors.push({
        id: `comp-${Date.now()}`,
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        followers: Number(data.followers) || 0,
        videos: [],
      });
      save({ competitors: state.competitors });
      render();
      toast("Competidor añadido", "ok");
    }

    if (kind === "add-comp-video") {
      const comp = state.competitors.find((c) => c.id === form.dataset.id);
      if (!comp) return;
      comp.videos = comp.videos || [];
      comp.videos.push({
        id: `v-${Date.now()}`,
        title: data.title.trim(),
        formato: data.formato || "",
        views: Number(data.views) || 0,
        likes: Number(data.likes) || 0,
        comments: Number(data.comments) || 0,
        shares: Number(data.shares) || 0,
      });
      save({ competitors: state.competitors });
      render();
      toast("Vídeo añadido", "ok");
    }

    if (kind === "add-account") {
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "Comprobando…"; }
      try {
        const res = await api("/api/accounts", { method: "POST", body: JSON.stringify({ username: data.username }) });
        toast(`@${res.account.username} añadida`, "ok");
        await reloadAll();
      } catch (err) {
        toast(err.message, "err");
        if (button) { button.disabled = false; button.textContent = "Añadir y seguir"; }
      }
    }

    if (kind === "connect-public") {
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "Leyendo…"; }
      try {
        const res = await api("/api/source", {
          method: "POST",
          body: JSON.stringify({ mode: "public", username: data.username }),
        });
        toast(`@${res.profile?.username || data.username}: ${res.videos} vídeos leídos.`, "ok");
        await reloadAll();
      } catch (err) {
        toast(err.message, "err");
        if (button) { button.disabled = false; button.textContent = "Ver mis datos"; }
      }
    }

    if (kind === "connect-source") {
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "Probando…"; }
      try {
        const res = await api("/api/source", {
          method: "POST",
          body: JSON.stringify({ mode: data.mode, token: data.token, username: data.username }),
        });
        toast(`Conectado. ${res.videos ?? 0} vídeos encontrados.`, "ok");
        await reloadAll();
      } catch (err) {
        toast(err.message, "err");
        if (button) { button.disabled = false; button.textContent = "Conectar y probar"; }
      }
    }

    if (kind === "add-local-video") {
      await api("/api/local/videos", { method: "POST", body: JSON.stringify(data) });
      state.localForm = false;
      await reloadAll();
      toast("Vídeo guardado", "ok");
    }

    if (kind === "local-profile") {
      await api("/api/local/profile", { method: "PUT", body: JSON.stringify(data) });
      await reloadAll();
      toast("Datos de la cuenta guardados", "ok");
    }
  } catch (err) {
    toast(err.message, "err");
  }
});

/* ---------------------------------------------------------------- boot */
async function boot() {
  const initial = location.hash.slice(1);
  if (TABS[initial]) state.tab = initial;
  try {
    state.status = await api("/api/status");
    const accountsRes = await api("/api/accounts").catch(() => ({ accounts: [], active: null }));
    state.accounts = accountsRes.accounts || [];
    state.activeAccount = accountsRes.active || null;
    if (!state.strategyAccount) state.strategyAccount = state.activeAccount;
    if (state.status.connected) {
      const [p, v, db] = await Promise.all([api("/api/profile"), api("/api/videos"), api("/api/db")]);
      state.profile = p.profile || {};
      state.videos = v.videos || [];
      state.meta = db.meta || {};
      state.competitors = db.competitors || [];
      state.ideas = db.ideas || [];
    }
  } catch (err) {
    state.error = err.message;
  } finally {
    state.loading = false;
  }

  if (!state.error && !state.ideas.length) {
    state.ideas = DEFAULT_IDEAS.map((i) => ({ ...i }));
    save({ ideas: state.ideas });
  }

  render();

  const params = new URLSearchParams(location.search);
  if (params.get("connected")) {
    history.replaceState({}, "", "/");
    toast("Cuenta conectada. Datos actualizados.", "ok");
  }
}

setInterval(() => {
  if (document.hidden) return;
  const el = document.activeElement;
  if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
  if (["resumen", "videos", "accounts", "strategy", "competencia"].includes(state.tab)) {
    reloadAll().catch(() => {});
    if (state.overview && state.tab === "strategy") loadOverview(true);
  }
}, 10 * 60 * 1000);

boot();
