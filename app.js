/* The Statistical Tooth: storyline build (v4).
   Intro: engraved jaw, closed, swings open on its hinge -> four teeth line up -> first molar and canine close in -> 2D becomes a 3D point cloud.
   Main: header (tooth groups, time, region), two composite teeth set in a cut jaw, an era picture tied to the
   timeline, particles entering the teeth as time plays, a paused detail view, and an end state with trends.
   Every number comes from data/data.js; historical text is labelled as context. */
(function () {
  "use strict";
  const D = window.TOOTH_DATA, IMG = window.ERA_IMAGES || {};
  const T_MIN = 300, T_LAST = 1900, T_ALL = 1960, HALF = 50;
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STILL = /[?&]still=1/.test(location.search);   // test hook: marks appear without travelling
  const $ = s => document.querySelector(s);
  const stage = $("#stage");

  // ------------------------------------------------------------------ vocabulary
  const CAT = { bacteria: "#b0362f", virus: "#2f55b0", parasite: "#16907a", metal: "#b98208", particle: "#b98208", condition: "#221f1b", sampled: "#7a7265" };
  const NIGHT = { bacteria: "#ec7f70", virus: "#93aef0", parasite: "#46c7a7", metal: "#e3b54c" };
  const COMMON = {
    "Yersinia pestis": "plague", "Mycobacterium leprae": "leprosy", "Hepatitis B virus": "hepatitis B", "Variola virus": "smallpox",
    "Treponema pallidum": "treponemal disease", "Plasmodium falciparum": "malaria", "Plasmodium vivax": "malaria", "Plasmodium malariae": "malaria",
    "Salmonella enterica": "Salmonella", "Borrelia recurrentis": "relapsing fever", "Clostridium tetani": "tetanus bacterium", "Parvovirus B19": "parvovirus B19",
    "Human alphaherpesvirus 1": "herpes simplex", "Streptococcus pneumoniae": "pneumococcus", "Erysipelothrix rhusiopathiae": "Erysipelothrix",
    "Yersinia enterocolitica": "Yersinia enterocolitica", "Haemophilus influenzae": "Haemophilus influenzae", "Methanobrevibacter oralis": "an oral archaeon", "Tannerella forsythia": "a gum-disease bacterium",
  };
  const common = n => COMMON[n] || n;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // Story points on the timeline. Pop-ups for each come later; for now they are markers only.
  const STORY = [
    { id: "start", y: 300, label: "Transition from hunting and gathering" },
    { id: "blackdeath", y: 1347, label: "The Black Plague" },
    { id: "industrial", y: 1760, label: "The Industrial Revolution" },
  ];
  const REGIONS = [["all", "Europe, all"], ["Northwestern Europe", "Europe, northwestern"], ["Northeastern Europe", "Europe, northeastern"], ["Central and Southeastern Europe", "Europe, central & southeastern"], ["Mediterranean", "Europe, Mediterranean"]];

  // ------------------------------------------------------------------ records
  const all = [].concat(D.pathogens, D.metagenomes, D.metals, D.sites);
  all.forEach(r => { r.loc = r.lat != null ? (+r.lat).toFixed(1) + "," + (+r.lon).toFixed(1) : null; });

  // ------------------------------------------------------------------ state
  const S = { t: T_MIN, region: "all", jaw: "man", mode: "none", scene: "intro", playing: false, touched: false };
  const everything = () => S.t > T_LAST;

  // ------------------------------------------------------------------ helpers
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = d3.format(",");
  const pct = v => v == null || isNaN(v) ? "n/a" : (v < 0.1 ? (v * 100).toFixed(1) : Math.round(v * 100)) + "%";
  const pct1 = v => v == null || isNaN(v) ? "n/a" : (v * 100).toFixed(1) + "%";
  const mg = v => d3.format(".2~f")(v);
  const isBin = n => /^[A-Z][a-z]+ [a-z]+/.test(n) && !/virus/i.test(n);
  const nameHTML = n => isBin(n) ? "<i>" + esc(n) + "</i>" : esc(n);
  const dateStr = r => r.early === r.late ? r.early + " CE" : r.early + "–" + r.late + " CE";
  const winStr = t => Math.round(t - HALF) + "–" + Math.round(t + HALF - 1);
  const unit = u => String(u || "").replace("ug/g", "µg/g");
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function glyph(cat, s) {
    s = s || 1; const c = CAT[cat] || "#221f1b";
    if (cat === "bacteria") return "<rect x='" + (-4.6 * s) + "' y='" + (-1.7 * s) + "' width='" + (9.2 * s) + "' height='" + (3.4 * s) + "' rx='" + (1.7 * s) + "' fill='" + c + "' stroke='#fbf8f1' stroke-width='.7'/>";
    if (cat === "virus") return "<path d='" + d3.range(6).map(i => (i ? "L" : "M") + (4 * s * Math.cos(i * Math.PI / 3)).toFixed(2) + "," + (4 * s * Math.sin(i * Math.PI / 3)).toFixed(2)).join("") + "Z' fill='" + c + "' stroke='#fbf8f1' stroke-width='.7'/>";
    if (cat === "parasite") return "<circle r='" + (3.5 * s) + "' fill='#fbf8f1' stroke='" + c + "' stroke-width='1.7'/><circle r='" + (1.2 * s) + "' cx='" + (1.2 * s) + "' cy='" + (-1 * s) + "' fill='" + c + "'/>";
    if (cat === "particle") return "<path d='M" + (-4.6 * s) + ",0q" + (2.3 * s) + "," + (-3.3 * s) + " " + (4.6 * s) + ",0t" + (4.6 * s) + ",0' fill='none' stroke='" + c + "' stroke-width='1.7' stroke-linecap='round'/>";
    return "<circle r='2.6' fill='" + c + "'/>";
  }
  const tip = $("#tip");
  function showTip(ev, html) {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  function recTip(r) {
    const nm = r.kind === "pathogen" ? esc(cap(common(r.name))) + " <span class='m'>(" + esc(r.name) + ")</span>" : nameHTML(r.name);
    const v = r.kind === "metal" && r.value != null ? "<br><span class='m'>" + esc(r.measure) + ": " + r.value + " " + esc(unit(r.unit)) + "</span>" : "";
    return "<b>" + nm + "</b><br>" + esc(r.site) + ", " + esc(r.country) + "<br><span class='m'>" + esc(dateStr(r)) + " · " + esc(r.material) + "</span>" + v + "<br><span class='m'>" + esc(r.source) + "</span>";
  }

  // ------------------------------------------------------------------ pooling
  const span = t => t > T_LAST ? [250, 1950] : [t - HALF, t + HALF];
  function overlapW(r, a, b) {
    if (r.late <= r.early) return r.early >= a && r.early < b ? 1 : 0;
    const ov = Math.min(r.late, b) - Math.max(r.early, a);
    return ov > 0 ? ov / (r.late - r.early) : 0;
  }
  function inSpan(r, a, b) {
    if ((r.kind === "pathogen" || r.kind === "metagenome") && !r.precise) return r.year >= a && r.year < b;
    return r.early < b && r.late > a;
  }
  const inRegion = r => S.region === "all" || r.region === S.region;
  function composite(t) {
    const [a, b] = span(t), lk = S.jaw + "_canine";
    const G = { t, a, b, sites: 0, n: 0, teeth: 0, car: 0, pos: 0, amtl: 0, lehO: 0, leh1: 0, leh2: 0, wN: 0, wS: 0, siteList: [] };
    D.sites.forEach(s => {
      if (!inRegion(s)) return; const w = overlapW(s, a, b); if (!w) return;
      G.sites++; G.siteList.push(s); G.n += w * s.n; G.teeth += w * s.teeth; G.car += w * s.carious; G.pos += w * s.positions; G.amtl += w * s.amtl;
      const L = s.leh[lk]; G.lehO += w * L[0]; G.leh1 += w * L[1]; G.leh2 += w * L[2];
      const W = s.wear.m1; G.wN += w * W[0]; G.wS += w * W[1];
    });
    G.caries = G.teeth >= 150 ? G.car / G.teeth : null;
    G.amtlR = G.pos >= 150 ? G.amtl / G.pos : null;
    G.leh = G.lehO >= 15 ? [G.leh1 / G.lehO, G.leh2 / G.lehO] : null;
    G.wear = G.wN >= 15 ? G.wS / G.wN : null;
    G.path = D.pathogens.filter(r => inRegion(r) && inSpan(r, a, b));
    G.meta = D.metagenomes.filter(r => inRegion(r) && inSpan(r, a, b));
    G.metals = D.metals.filter(r => inRegion(r) && inSpan(r, a, b));
    const pb = G.metals.filter(r => r.material === "enamel" && r.analyte === "Pb" && r.value != null);
    G.pbRows = pb; G.pb = pb.length ? d3.median(pb, r => r.value) : null;
    G.calcRecs = [].concat(G.path.filter(r => /calculus/.test(r.material)), G.meta.filter(r => /calculus/.test(r.material)), G.metals.filter(r => r.material === "dental calculus"));
    G.calcSamples = d3.sum(G.calcRecs, r => r.kind === "metagenome" ? r.n : 1);
    G.byCommon = d3.rollups(G.path, v => v.length, r => common(r.name)).sort((x, y) => y[1] - x[1]);
    return G;
  }

  // ------------------------------------------------------------------ the two teeth
  const TEETH = [
    { key: "molar", type: "molar", label: "FIRST MOLAR", el: $("#tMolar") },
    { key: "canine", type: "canine", label: "CANINE", el: $("#tCanine") },
  ];
  TEETH.forEach(T => { T.canvas = T.el.querySelector("canvas"); try { T.R = window.ToothGL.create(T.canvas); } catch (e) { console.error(e); } T.parts = new Map(); });
  const GL = TEETH.every(T => T.R);
  if (!GL) $("#pair").insertAdjacentHTML("beforeend", "<div class='fallback'>This browser cannot draw the 3D teeth (WebGL2 is unavailable). The timeline and panels still work.</div>");
  const VIEW = { yaw: 0.55, pitch: 0.22 };
  let G = null;
  const pairEl = $("#pair"), ov = d3.select("#ov");

  function setShapes() {
    if (!GL) return;
    TEETH.forEach(T => { T.R.setShape(window.ToothGL.shape(T.type, S.jaw), true); T.parts.clear(); });
    refit();
  }
  function refit() {
    if (!GL) return;
    const top = d3.max(TEETH, T => T.R.st.S.top), bottom = d3.min(TEETH, T => T.R.st.S.bottom);
    const f = TEETH[0].R.st.cam.focal;
    const byH = ((top - bottom) / 2) * f / 0.8;
    const byW = d3.max(TEETH, T => { const S = T.R.st.S, r = T.el.getBoundingClientRect(), half = Math.max(-S.jawMin[0], S.jawMax[0], -S.jawMin[2], S.jawMax[2]) * 1.08; return r.width > 0 ? half * f * r.height / (r.width * 0.9) : 0; });
    TEETH.forEach(T => { T.R.setFrame((top + bottom) / 2 + 0.03, Math.max(byH, byW || 0)); Object.assign(T.R.st.cam, VIEW); });
  }
  function paramsFor(T) {
    const SH = T.R.st.S, top = SH.top;
    const wear = T.type === "molar" ? G.wear : null, leh = T.type === "canine" ? G.leh : null;
    const wearY = wear != null ? top - (wear - 1) / 7 * 0.55 * top : top + 0.02;
    const cr = G.caries != null ? (0.015 + 0.7 * G.caries) * (SH.B[0] / 0.5) : 0;
    const cp = SH.cariesAt === "occlusal" ? [0.06, Math.min(wearY, SH.grooveY) - 0.005, -0.03] : [SH.B[0] * 0.97, 0.44 * top, -0.13];
    const pb = G.pb != null ? clamp(Math.log10(G.pb / 0.05) / Math.log10(10 / 0.05), 0, 1) : 0;
    return { wearY, caries: [cp[0], cp[1], cp[2], cr], leh: leh || [0, 0], lehY: [0.36 * top, 0.54 * top], calc: G.calcSamples > 0 ? 1 : 0, pb, cutX: 0, jaw: true };
  }
  const NEUTRAL = SH => ({ wearY: SH.top + 0.02, caries: [0, 0, 0, 0], leh: [0, 0], lehY: [0, 0], calc: 0, pb: 0, cutX: 5, jaw: false });
  function insideSolid(T, p, m) {
    const P = T.R.st.P, d = Math.max(T.R.outerJS(p), p[1] - P.wearY);
    if (P.caries[3] > 0 && Math.hypot(p[0] - P.caries[0], p[1] - P.caries[1], p[2] - P.caries[2]) < P.caries[3] + 0.03) return false;
    return d < -m;
  }
  function findOnFace(T, y, from, step) { for (let x = from; Math.abs(x) < 1.3; x += step) { const p = [x, y, -0.002]; if (insideSolid(T, p, 0.004)) return p; } return null; }

  // particles: one mark per record, split between the two teeth (tooth type is not recorded)
  function updateParticles(animate) {
    if (!GL) return;
    const now = performance.now(), dense = everything();
    TEETH.forEach((T, ti) => {
      const want = new Map();
      G.path.forEach(r => { if (hash(r.id) % 2 === ti) want.set(r.id, r); });
      G.calcRecs.forEach(r => { if (r.kind !== "metagenome" && hash(r.id + "c") % 2 === ti) want.set(r.id, r); });
      T.parts.forEach((q, id) => { if (!want.has(id) && !q.dead) q.dead = now; });
      const placed = [...T.parts.values()].filter(q => !q.dead && q.face).map(q => q.p);
      let k = 0;
      [...want.values()].sort((x, y) => hash(x.id) - hash(y.id)).forEach(r => {
        const had = T.parts.get(r.id); if (had && !had.dead) return;
        const q = makeParticle(T, r, placed, dense); if (!q) return;
        q.born = animate && !STILL ? now + Math.min(k++ * 55, 1100) : -1e9; q.dur = 1500 + (hash(r.id) % 400);
        T.parts.set(r.id, q);
      });
    });
    kick();
  }
  function makeParticle(T, r, placed, dense) {
    const SH = T.R.st.S, P = T.R.st.P, rnd = rng(hash(r.id + S.jaw));
    if (!/calculus/.test(r.material || "")) {
      let pos = null;
      for (let k = 0; k < 500; k++) {
        const y = SH.rootMin + 0.12 + rnd() * (P.wearY - 0.04 - SH.rootMin - 0.12), x = SH.boxMin[0] + rnd() * (SH.boxMax[0] - SH.boxMin[0]);
        const p = [x, y, -0.002];
        if (!insideSolid(T, p, 0.03)) continue;
        if (k < 400 && placed.some(o => Math.hypot(o[1] - y, o[0] - x) < (dense ? 0.03 : 0.05))) continue;
        pos = p; break;
      }
      if (!pos) return null;
      placed.push(pos);
      // route: in from below the root tip, up the canal to the mark's own height, then across to it
      let axis;
      if (SH.canal && SH.canal.length) axis = SH.canal.map(c => [c[0], c[1]]);
      else {
        const root = SH.roots.slice().sort((u, v) => Math.abs(u[4] - pos[0]) - Math.abs(v[4] - pos[0]))[0];
        const a0 = [root[4], root[5] + 0.03], b0 = [root[0] * 0.6, SH.pulpC[1]];
        axis = d3.range(0, 1.001, 0.1).map(k => [a0[0] + (b0[0] - a0[0]) * k, a0[1] + (b0[1] - a0[1]) * k]);
      }
      const z = -0.002, up = axis.filter(c => c[1] <= pos[1]);
      const path = withLengths([[axis[0][0] + (rnd() - 0.5) * 0.25, SH.bottom - 0.3, z], [axis[0][0], axis[0][1], z]].concat(up.map(c => [c[0], c[1], z]), [pos]));
      return { r, p: pos, path, face: true, cat: r.cat };
    }
    const a = -0.95 + rnd() * 0.87, dir = [Math.cos(a), 0, Math.sin(a)];
    const hit = T.R.march([dir[0] * 2, 0.1 + (rnd() - 0.5) * 0.04, dir[2] * 2], [-dir[0], 0, -dir[2]], 3);
    if (!hit) return null;
    const pos = [hit.p[0] + dir[0] * 0.035, hit.p[1], hit.p[2] + dir[2] * 0.035];
    const path = withLengths([[pos[0] + 0.2, SH.top + 0.42, pos[2]], [pos[0] + 0.1, SH.top + 0.12, pos[2]], pos]);
    return { r, p: pos, path, face: false, n: dir, cat: r.cat };
  }
  function withLengths(path) {
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
    path.cum = cum; return path;
  }
  // position along a route at fraction k of its length, so marks move at an even speed
  function along(path, k) {
    const cum = path.cum, L = cum[cum.length - 1] * clamp(k, 0, 1);
    let i = 1; while (i < cum.length - 1 && cum[i] < L) i++;
    const seg = cum[i] - cum[i - 1] || 1, f = (L - cum[i - 1]) / seg, a = path[i - 1], b = path[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function toPair(T, p) { const s = T.R.project(p); return [s.x + T.el.offsetLeft, s.y + T.el.offsetTop]; }

  const gLabels = ov.append("g"), gParts = ov.append("g");
  function drawParticles(now) {
    if (!GL || S.scene !== "main") { gParts.selectAll("*").remove(); return false; }
    let busy = false;
    const items = [], trails = [], routes = { blood: 0, air: 0 };
    TEETH.forEach(T => {
      const b = T.R.st.basis; if (!b) return;
      T.parts.forEach((q, id) => {
        let op = 1;
        if (q.dead) { op = 1 - (now - q.dead) / 400; if (op <= 0) { T.parts.delete(id); return; } busy = true; }
        if (q.face && b.ro[2] <= 0) return;
        if (!q.face && q.n[0] * b.ro[0] + q.n[2] * b.ro[2] < 0.2) return;
        const k = (now - q.born) / q.dur;
        if (k < 0) { busy = true; return; }
        const e = ease(Math.min(k, 1)), pos = k >= 1 ? q.p : along(q.path, e), xy = toPair(T, pos);
        if (k < 1.5) {
          busy = true;
          const pts = d3.range(0, 25).map(i => toPair(T, along(q.path, e * i / 24)));
          trails.push({ id: T.key + id, pts, cat: q.cat, op: 0.55 * (k < 1 ? 1 : Math.max(0, 1 - (k - 1) * 2)) });
          if (k < 1) routes[q.face ? "blood" : "air"]++;
        }
        items.push({ id: T.key + id, q, x: xy[0], y: xy[1], op });
      });
    });
    gParts.selectAll("path.trail").data(trails, d => d.id).join("path").attr("class", "trail")
      .attr("d", d => "M" + d.pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L")).attr("fill", "none")
      .attr("stroke", d => CAT[d.cat] || "#221f1b").attr("stroke-width", 1.2).attr("stroke-linecap", "round").attr("opacity", d => d.op);
    const sel = gParts.selectAll("g.pt").data(items, d => d.id);
    sel.exit().remove();
    const en = sel.enter().append("g").attr("class", "pt").attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", d => common(d.q.r.name) + ", " + d.q.r.site)
      .html(d => glyph(d.q.cat, everything() ? 0.75 : 1))
      .on("mousemove", (ev, d) => showTip(ev, recTip(d.q.r))).on("mouseleave", hideTip)
      .on("pointerdown", ev => ev.stopPropagation());
    en.merge(sel).attr("transform", d => "translate(" + d.x.toFixed(1) + "," + d.y.toFixed(1) + ") rotate(" + (hash(d.id) % 180) + ")").attr("opacity", d => d.op);
    // route notes while marks travel; the routes are illustrations, not data
    const rt = [];
    if (routes.blood) { const T = TEETH[0], SH = T.R.st.S, xy = toPair(T, [0, SH.bottom - 0.14, 0]); rt.push({ id: "b", x: xy[0], y: xy[1], t: "↑ through the blood supply" }); }
    if (routes.air) { const T = TEETH[1], xy = toPair(T, [0.2, T.R.st.S.top + 0.34, 0]); rt.push({ id: "a", x: xy[0], y: xy[1], t: "↓ from food and air, into tartar" }); }
    gParts.selectAll("text.route").data(rt, d => d.id).join("text").attr("class", "route").attr("x", d => d.x).attr("y", d => d.y).attr("text-anchor", "middle").text(d => d.t);
    return busy;
  }

  // callouts: molar traces on the left, canine traces on the right
  function drawLabels() {
    gLabels.selectAll("*").remove();
    if (!GL || S.scene !== "main") return;
    const W = pairEl.clientWidth, H = pairEl.clientHeight;
    ov.attr("viewBox", "0 0 " + W + " " + H);
    const absent = [], nDNA = G.path.length, items = { molar: [], canine: [] }, letters = [];
    TEETH.forEach(T => {
      const SH = T.R.st.S, P = T.R.st.P, top = SH.top, L = items[T.key];
      if (T.type === "molar") {
        if (G.wear != null) { const h = T.R.march([-0.16, top + 0.6, -0.1], [0, -1, 0], 2); L.push({ t: "CHEWING WEAR", v: G.wear.toFixed(1) + " of 8", s: ["first molars · dashed line = unworn"], p: h && h.p }); }
        else absent.push("chewing wear (too few molars)");
        if (G.caries != null) { const c = P.caries; L.push({ t: "TOOTH DECAY", v: pct(G.caries), s: ["of teeth had cavities"], p: [c[0], c[1] + c[3] * 0.3, c[2]] }); }
        else absent.push("decay (too few teeth)");
        const q = [...T.parts.values()].filter(x => x.face && !x.dead).sort((u, v) => u.p[0] - v.p[0])[0];
        if (nDNA) L.push({ t: "DISEASE DNA", v: nDNA + " find" + (nDNA > 1 ? "s" : ""), s: ["one mark each, across both teeth", G.byCommon[0] ? "most: " + G.byCommon[0][0] : ""], p: q && q.p });
        else absent.push("disease DNA (none recorded)");
        const pe = findOnFace(T, 0.62 * Math.min(top, P.wearY), SH.boxMin[0], 0.006);
        if (pe) letters.push({ T, t: "enamel", p: [pe[0] + 0.03, pe[1] + 0.06, pe[2]] });
        const dn = findOnFace(T, 0.05, SH.boxMin[0], 0.01); if (dn) letters.push({ T, t: "dentine", p: [dn[0] + 0.14, 0.2, dn[2]] });
        letters.push({ T, t: "pulp", p: [SH.pulpC[0], SH.pulpC[1] + 0.02, -0.002] });
      } else {
        if (G.leh) { const h = T.R.march([2, P.lehY[0], -0.12], [-1, 0, 0], 3); L.push({ t: "STRESS LINES", v: pct(G.leh[0]), s: ["of people · canines", "linked to childhood illness or hunger"], p: h && h.p }); }
        else absent.push("stress lines (too few canines)");
        const pe = findOnFace(T, 0.66 * top, SH.boxMax[0], -0.006);
        if (G.pb != null) L.push({ t: "LEAD", v: mg(G.pb) + " mg/kg", s: ["median in enamel", "absorbed in early childhood"], p: pe && [pe[0] - 0.02, pe[1], pe[2]] });
        else absent.push("lead (not measured)");
        if (G.calcSamples) { const h = T.R.march([2, 0.1, -0.2], [-1, 0, 0], 3); L.push({ t: "TARTAR", v: G.calcSamples + " sample" + (G.calcSamples > 1 ? "s" : ""), s: ["studied for DNA or particles"], p: h && [h.p[0] + 0.03, h.p[1], h.p[2]] }); }
        const rt = findOnFace(T, SH.rootMin * 0.5, SH.boxMax[0], -0.01); if (rt) letters.push({ T, t: "root", p: [rt[0] - 0.06, rt[1], rt[2]] });
        letters.push({ T, t: "bone", p: [SH.jawMax[0] - 0.08, SH.bottom * 0.6, -0.002] });
      }
      const nx = toPair(T, [0, 0, 0])[0];
      gLabels.append("text").attr("class", "tname").attr("x", nx).attr("y", 14).attr("text-anchor", "middle").text(T.label);
    });
    letters.forEach(l => { const xy = toPair(l.T, l.p); gLabels.append("text").attr("class", "ana").attr("x", xy[0]).attr("y", xy[1]).attr("text-anchor", "middle").text(l.t); });
    const listEl = $("#coList"), narrow = W < 620;
    listEl.classList.toggle("on", narrow);
    listEl.innerHTML = narrow ? items.molar.concat(items.canine).map(c => "<div><b>" + esc(c.t) + "</b><span>" + esc(c.v) + "</span> " + esc(c.s.filter(Boolean).join(" · ")) + "</div>").join("") : "";
    if (!narrow) [["molar", "L"], ["canine", "R"]].forEach(([k, side]) => {
      const T = TEETH.find(x => x.key === k);
      const list = items[k].map(c => Object.assign(c, { xy: c.p ? toPair(T, c.p) : null, vis: c.p ? T.R.visible(c.p) : false }));
      list.sort((a, b) => (a.xy ? a.xy[1] : 9e3) - (b.xy ? b.xy[1] : 9e3));
      const gap = 74; let y = 44;
      list.forEach(c => { c.ly = Math.max(y, Math.min(H - 70, c.xy ? c.xy[1] - 16 : y)); y = c.ly + gap; });
      for (let i = list.length - 1; i >= 0; i--) { const lim = i === list.length - 1 ? H - 56 : list[i + 1].ly - gap; if (list[i].ly > lim) list[i].ly = Math.max(30, lim); }
      list.forEach(c => {
        const g = gLabels.append("g").attr("class", "co");
        const x = side === "L" ? 4 : W - 4, anchor = side === "L" ? "start" : "end";
        let w = 0;
        const add = (cls, dy, txt) => { if (!txt) return; const t = g.append("text").attr("class", cls).attr("x", x).attr("y", c.ly + dy).attr("text-anchor", anchor).text(txt); w = Math.max(w, t.node().getComputedTextLength()); };
        add("co-t", 0, c.t); add("co-v", 24, c.v); c.s.forEach((s, i) => add("co-s", 40 + i * 13.5, s));
        if (c.xy && c.vis) {
          const x0 = side === "L" ? x + w + 8 : x - w - 8;
          const lx = side === "L" ? Math.max(x0 + 6, Math.min(c.xy[0] - 14, x0 + 40)) : Math.min(x0 - 6, Math.max(c.xy[0] + 14, x0 - 40));
          g.append("path").attr("class", "lead").attr("d", "M" + x0 + "," + (c.ly + 16) + " L" + lx + "," + (c.ly + 16) + " L" + c.xy[0] + "," + c.xy[1]);
          g.append("circle").attr("cx", c.xy[0]).attr("cy", c.xy[1]).attr("r", 2.2).attr("fill", "#221f1b");
        }
      });
    });
    $("#absent").textContent = absent.length ? "Not shown: " + absent.join("; ") + "." : "";
  }

  // rendering
  let scheduled = false, settleT = null;
  function requestRender(low) {
    if (!GL) return;
    TEETH.forEach(T => { T.R.st.quality = low ? 0.5 : 1; });
    if (low) { clearTimeout(settleT); settleT = setTimeout(() => requestRender(false), 240); }
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; TEETH.forEach(T => T.R.render()); drawLabels(); kick(); });
  }
  let looping = false;
  function kick() { if (!looping) { looping = true; requestAnimationFrame(loop); } }
  function loop(now) {
    const busy = drawParticles(now);
    const walking = stepPlay(now);
    drawTimeline(now);
    if (busy || walking) requestAnimationFrame(loop); else looping = false;
  }

  // orbit both teeth together; a click without dragging opens the paused detail view
  (function orbit() {
    let drag = null;
    TEETH.forEach(T => {
      T.el.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; try { T.el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
      T.el.addEventListener("pointermove", e => {
        if (!drag || !GL) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
        if (drag.moved < 5) return;
        TEETH.forEach(U => { U.R.st.cam.yaw -= dx * 0.009; U.R.st.cam.pitch = clamp(U.R.st.cam.pitch + dy * 0.007, -0.4, 1.1); });
        requestRender(true);
      });
      T.el.addEventListener("pointerup", () => { drag = null; });
      T.el.addEventListener("pointercancel", () => { drag = null; });
    });
  })();

  // ------------------------------------------------------------------ side panel (end of timeline, limitations)
  let panelKey = null;
  function renderPanel(force) {
    const mode = S.mode === "limits" ? "limits" : everything() ? "end" : "none";
    const key = mode + "|" + S.region + S.jaw;
    if (key === panelKey && !force) return;
    const layoutChange = !panelKey || panelKey.split("|")[0] === "none" !== (mode === "none");
    panelKey = key;
    const el = $("#panel");
    stage.classList.toggle("haspanel", mode !== "none"); el.hidden = mode === "none";
    el.innerHTML = mode === "end" ? endHTML() : mode === "limits" ? limitsHTML() : "";
    if (mode === "end") drawEndCharts(); if (mode === "limits") drawMap();
    const on = (id, f) => { const b = $("#" + id); if (b) b.onclick = f; };
    on("back", () => { S.mode = "none"; renderPanel(); });
    on("limBtn", openLimits);
    on("again", () => { S.mode = "none"; setT(T_MIN); play(); });
    if (layoutChange && S.scene === "main") requestAnimationFrame(() => { refit(); requestRender(false); drawAxis(); drawTimeline(); });
  }
  function openLimits() { pause(); S.mode = "limits"; renderPanel(true); }

  // end state: the first century against the last, plus trend lines
  const STEPS = d3.range(T_MIN, T_LAST + 1, 25);
  const endSeries = () => STEPS.map(t => { const g = composite(t); return { t, caries: g.caries, leh: g.leh && g.leh[0], wear: g.wear, amtl: g.amtlR, pb: g.pb }; });
  function endHTML() {
    const A = composite(350), B = composite(1850);
    let pbB = B.pb, pbNote = ""; if (pbB == null) { const g = composite(1900); if (g.pb != null) { pbB = g.pb; pbNote = "(1850–1949)"; } }
    const row = (l, a, b, f, note, noChange) => {
      let ch = "<span class='same'>–</span>";
      if (noChange) ch = "<span class='same'>not comparable</span>";
      else if (a != null && b != null) { const r = (b - a) / Math.max(Math.abs(a), 1e-9); ch = Math.abs(r) < 0.03 ? "<span class='same'>≈</span>" : "<span class='" + (r > 0 ? "up" : "down") + "'>" + (r > 0 ? "↑" : "↓") + Math.round(Math.abs(r) * 100) + "%</span>"; }
      return "<tr><td>" + l + (note ? " <span class='hint'>" + note + "</span>" : "") + "</td><td>" + (a == null ? "–" : f(a)) + "</td><td>" + (b == null ? "–" : f(b)) + "</td><td>" + ch + "</td></tr>";
    };
    return "<div class='card night'><div class='row'><span class='ctxnote'>Time: everything · 300–1900 CE</span><button class='btn' id='limBtn'>Limitations →</button></div>" +
      "<div><h3>First century against the last</h3><table class='cmp'><thead><tr><th></th><th>300–399</th><th>1800–1899</th><th>change</th></tr></thead><tbody>" +
      row("Tooth decay", A.caries, B.caries, pct1) + row("Stress lines (canines)", A.leh && A.leh[0], B.leh && B.leh[0], pct1) + row("Molar wear (1–8)", A.wear, B.wear, v => v.toFixed(2)) +
      row("Tooth loss", A.amtlR, B.amtlR, pct1) + row("Lead in enamel, mg/kg", A.pb, pbB, mg, pbNote) +
      row("Disease DNA finds", A.path.length, B.path.length, v => String(v), "research effort", true) + "</tbody></table></div>" +
      "<div><h3>Disease DNA finds per century</h3><svg id='endLines' height='120' style='width:100%;display:block'></svg></div>" +
      "<div class='minis' id='endMinis'></div>" +
      "<div class='row'><span class='ctxnote'>The teeth now pool every period at once.</span><button class='btn' id='again'>Play again</button></div></div>";
  }
  function drawEndCharts() {
    const svg = d3.select("#endLines"), W = svg.node().clientWidth || 340, H = 120;
    svg.attr("viewBox", "0 0 " + W + " " + H);
    const bins = d3.range(350, 1900, 100), cats = ["bacteria", "virus", "parasite"], pool = D.pathogens.filter(inRegion);
    const yr = r => r.precise ? (r.early + r.late) / 2 : r.year;
    const data = cats.map(c => ({ c, v: bins.map(b => ({ b, n: pool.filter(r => r.cat === c && yr(r) >= b - 50 && yr(r) < b + 50).length })) }));
    const x = d3.scaleLinear().domain([300, 1900]).range([22, W - 62]), y = d3.scaleLinear().domain([0, d3.max(data, d => d3.max(d.v, q => q.n)) || 1]).nice().range([H - 16, 6]);
    svg.append("g").selectAll("line").data(y.ticks(3)).join("line").attr("x1", 22).attr("x2", W - 62).attr("y1", d => y(d)).attr("y2", d => y(d)).attr("stroke", "#3a352e");
    svg.append("g").selectAll("text").data(y.ticks(3)).join("text").attr("x", 18).attr("y", d => y(d) + 3).attr("text-anchor", "end").text(d => d);
    [500, 1000, 1500].forEach(v => svg.append("text").attr("x", x(v)).attr("y", H - 3).attr("text-anchor", "middle").text(v));
    data.forEach(d => svg.append("path").attr("d", d3.line().x(q => x(q.b)).y(q => y(q.n)).curve(d3.curveMonotoneX)(d.v)).attr("fill", "none").attr("stroke", NIGHT[d.c]).attr("stroke-width", 2));
    const labs = data.map(d => ({ c: d.c, y: y(d.v[d.v.length - 1].n) + 3 })).sort((p, q) => p.y - q.y);
    for (let i = 1; i < labs.length; i++) labs[i].y = Math.max(labs[i].y, labs[i - 1].y + 11);
    labs.forEach(l => svg.append("text").attr("x", W - 58).attr("y", Math.min(l.y, H - 4)).style("fill", NIGHT[l.c]).text({ bacteria: "bacteria", virus: "viruses", parasite: "parasites" }[l.c]));
    const ser = endSeries();
    const M = [["Molar wear (1–8)", "wear", v => v.toFixed(1), "#efe9dd"], ["Tooth decay", "caries", pct, "#efe9dd"], ["Stress lines (canines)", "leh", pct, "#efe9dd"], ["Lead in enamel (mg/kg)", "pb", mg, NIGHT.metal]];
    $("#endMinis").innerHTML = M.map(m => "<div><div class='mt'>" + m[0] + "</div><svg data-k='" + m[1] + "'></svg></div>").join("");
    M.forEach(m => {
      const s = d3.select("#endMinis svg[data-k='" + m[1] + "']"), w = s.node().clientWidth || 160, h = 52; s.attr("viewBox", "0 0 " + w + " " + h);
      const vals = ser.filter(q => q[m[1]] != null); if (!vals.length) return;
      const xx = d3.scaleLinear().domain([300, 1900]).range([2, w - 2]), ext = d3.extent(vals, q => q[m[1]]);
      const yy = d3.scaleLinear().domain(m[1] === "pb" ? [0, ext[1] * 1.1] : [ext[0] * 0.9, ext[1] * 1.05]).range([h - 12, 4]);
      s.append("line").attr("x1", 0).attr("x2", w).attr("y1", h - 12).attr("y2", h - 12).attr("stroke", "#3a352e");
      s.append("path").attr("d", d3.line().defined(q => q[m[1]] != null).x(q => xx(q.t)).y(q => yy(q[m[1]])).curve(m[1] === "pb" ? d3.curveStepAfter : d3.curveMonotoneX)(ser)).attr("fill", "none").attr("stroke", m[3]).attr("stroke-width", 1.6);
      s.append("text").attr("x", 2).attr("y", h - 2).text("300"); s.append("text").attr("x", w - 2).attr("y", h - 2).attr("text-anchor", "end").text("1900");
      s.append("text").attr("x", w - 2).attr("y", 10).attr("text-anchor", "end").text("max " + m[2](ext[1]));
    });
  }
  function limitsHTML() {
    const rs = [].concat(G.siteList, G.path, G.meta, G.metals);
    return "<div class='card'><div class='row'><span class='ctxnote'>Limitations</span><button class='btn' id='back'>← Back</button></div>" +
      "<ul><li>Finding a pathogen's DNA shows it survived in a tooth. It does not show the infection was active or caused death.</li>" +
      "<li>DNA counts show where researchers looked. Plague is studied far more than other diseases, and most hepatitis B samples come from one study.</li>" +
      "<li>DNA ages are rounded to the nearest 100 years, so marks change once per century. Where each sample was taken inside the tooth is not recorded, so marks are spread across the cut face and split between the two teeth.</li>" +
      "<li>The entry routes (up through the blood supply, down from food and air) illustrate how such traces usually arrive. They are not measurements.</li>" +
      "<li>Skeletons are people who died and were buried, not the whole living population. Sites dated across several centuries are split between windows.</li>" +
      "<li>Stress lines are scored on canines and wear on first molars. Decay and tooth loss are whole-mouth rates.</li>" +
      "<li>Lead in enamel records early childhood and cannot say where the lead came from. Lead measured in bone is not drawn in the teeth.</li>" +
      "<li>The canines are drawn from sculpted anatomical models supplied by the team. Their pulp is derived from each model's shape. The first molar is a constructed shape until a molar model is added. Gum and bone are illustrations. The opening jaw in the intro is an engraving supplied by the team; its lower arch is a mirrored copy of the upper one. None of this anatomy is data.</li>" +
      "<li>Story markers on the timeline are chosen historical moments, for context. They are not data.</li></ul>" +
      "<div><h3>Where the teeth come from</h3><svg id='map' role='img' aria-label='Map of sample locations'></svg><p class='ctxnote' style='margin-top:4px'>Dark dots: records in the current window. Blank land means no samples, not no disease.</p></div>" +
      "<div><h3>Sources</h3><ul>" + D.meta.built_from.map(s => "<li>" + esc(s) + "</li>").join("") + "</ul></div>" +
      "<details><summary class='ctxnote' style='cursor:pointer'>Records in the current window (" + rs.length + ")</summary><div class='tblwrap'><table class='data'><thead><tr><th>Evidence</th><th>Place</th><th>Dates</th><th>Material</th><th>Value</th></tr></thead><tbody>" +
      rs.map(r => "<tr><td>" + nameHTML(r.name) + "</td><td>" + esc(r.site) + ", " + esc(r.country) + "</td><td>" + esc(dateStr(r)) + "</td><td>" + esc(r.material) + "</td><td>" + (r.value != null ? r.value + " " + esc(unit(r.unit)) : r.kind === "ghhp" ? fmt(r.n) + " people" : "") + "</td></tr>").join("") + "</tbody></table></div></details></div>";
  }
  const world = topojson.feature(window.WORLD_TOPO, window.WORLD_TOPO.objects.countries);
  function drawMap() {
    const svg = d3.select("#map"); if (svg.empty()) return;
    const W = svg.node().clientWidth || 320, H = Math.round(W * 0.72);
    svg.attr("viewBox", "0 0 " + W + " " + H).attr("height", H);
    const proj = d3.geoConicConformal().parallels([40, 62]).rotate([-12, 0]).fitExtent([[2, 2], [W - 2, H - 2]], { type: "MultiPoint", coordinates: [[-10, 36.5], [31, 36.5], [33, 63], [-9, 62]] });
    const path = d3.geoPath(proj);
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#eef0f3");
    svg.append("path").attr("class", "grat").attr("d", path(d3.geoGraticule().step([5, 5])()));
    svg.append("g").selectAll("path").data(world.features).join("path").attr("class", "land").attr("d", path);
    const [a, b] = span(S.t), locs = new Map();
    all.filter(r => r.loc && inRegion(r)).forEach(r => { const o = locs.get(r.loc) || { r, on: false }; o.on = o.on || inSpan(r, a, b); locs.set(r.loc, o); });
    svg.append("g").selectAll("circle").data([...locs.values()]).join("circle").attr("r", d => d.on ? 3 : 1.6).attr("fill", d => d.on ? "#221f1b" : "#b3a88f")
      .attr("transform", d => { const p = proj([+d.r.lon, +d.r.lat]); return p ? "translate(" + p + ")" : "translate(-99,-99)"; });
  }

  // ------------------------------------------------------------------ timeline, walkers and autoplay
  const BASE = 62;
  let tlW = 800;
  const tlX = y => y > T_LAST ? tlW - 14 : 10 + (y - T_MIN) / (T_LAST - T_MIN) * (tlW - 66);
  let phase = 0, lastFrame = 0;
  const tl = d3.select("#tl"), gAxis = tl.append("g"), gWalk = tl.append("g");
  function drawAxis() {
    tlW = tl.node().clientWidth || 800;
    tl.attr("viewBox", "0 0 " + tlW + " 96"); gAxis.selectAll("*").remove();
    const mono = s => s.attr("font-family", "Archivo, system-ui, sans-serif").attr("fill", "#7b7a74");
    gAxis.append("line").attr("x1", 10).attr("x2", tlW - 6).attr("y1", BASE).attr("y2", BASE).attr("stroke", "#221f1b").attr("stroke-width", 1.2);
    gAxis.append("path").attr("d", "M" + (tlW - 12) + "," + (BASE - 5) + " L" + (tlW - 4) + "," + BASE + " L" + (tlW - 12) + "," + (BASE + 5)).attr("fill", "none").attr("stroke", "#221f1b").attr("stroke-width", 1.2);
    d3.range(300, 1901, 100).forEach(v => {
      gAxis.append("line").attr("x1", tlX(v)).attr("x2", tlX(v)).attr("y1", BASE).attr("y2", BASE + (v % 500 === 0 ? 5 : 3)).attr("stroke", "#221f1b");
      if (v % 200 === 100 || v === 1900) mono(gAxis.append("text").attr("x", tlX(v)).attr("y", BASE + 16).attr("text-anchor", "middle").attr("font-size", 9.5)).text(v);
    });
    mono(gAxis.append("text").attr("x", tlW - 14).attr("y", BASE + 16).attr("text-anchor", "middle").attr("font-size", 9.5)).text("ALL");
    gAxis.append("text").attr("x", tlW / 2).attr("y", BASE + 31).attr("text-anchor", "middle").attr("font-family", "Archivo, system-ui, sans-serif").attr("font-size", 10.5).attr("letter-spacing", "1.5").attr("fill", "#1a1a18").text("TIME");
    // story markers: a numbered stem above the axis, label beside it
    STORY.forEach((m, i) => {
      const x = tlX(m.y), g = gAxis.append("g").attr("class", "story").attr("data-id", m.id);
      g.append("line").attr("x1", x).attr("x2", x).attr("y1", BASE - 36).attr("y2", BASE).attr("stroke", "#1a1a18").attr("stroke-width", 0.8);
      g.append("circle").attr("cx", x).attr("cy", BASE - 36).attr("r", 7.5).attr("fill", "#e9e8e4").attr("stroke", "#1a1a18");
      g.append("text").attr("x", x).attr("y", BASE - 32.5).attr("text-anchor", "middle").attr("font-family", "Archivo, system-ui, sans-serif").attr("font-size", 10).attr("font-weight", 600).attr("fill", "#1a1a18").text(i + 1);
      const right = x < tlW - 220;
      g.append("text").attr("class", "slabel").attr("x", x + (right ? 12 : -12)).attr("y", BASE - 32.5).attr("text-anchor", right ? "start" : "end").attr("font-family", "Archivo, system-ui, sans-serif").attr("font-size", 11).attr("fill", "#55544f").text(m.label);
      g.append("circle").attr("cx", x).attr("cy", BASE).attr("r", 2.6).attr("fill", "#1a1a18");
    });
    gAxis.append("circle").attr("class", "cursor").attr("cy", BASE).attr("r", 6.5).attr("fill", "#e9e8e4").attr("stroke", "#1a1a18").attr("stroke-width", 2);
    gAxis.append("circle").attr("class", "cursor2").attr("cy", BASE).attr("r", 2.2).attr("fill", "#1a1a18");
  }
  function figure(g, t, ph) {
    const sw = Math.sin(ph), leg = 0.5 * sw, arm = -0.45 * sw, ink = "#1a1a18";
    const L = (x1, y1, a, len) => g.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x1 + Math.sin(a) * len).attr("y2", y1 + Math.cos(a) * len).attr("stroke", ink).attr("stroke-width", 1.4).attr("stroke-linecap", "round");
    L(0, -8, leg, 8); L(0, -8, -leg, 8); L(0, -15, arm, 6); L(0, -15, -arm, 6);
    g.append("line").attr("x1", 0).attr("y1", -15.5).attr("x2", 0).attr("y2", -8).attr("stroke", ink).attr("stroke-width", 2.2).attr("stroke-linecap", "round");
    if (t < 600) g.append("path").attr("d", "M-2.2,-15 L2.2,-15 L3.6,-6.5 L-3.6,-6.5Z").attr("fill", ink);
    else if (t < 1500) g.append("path").attr("d", "M-2.2,-15 L2.2,-15 L4,-3.5 L-4,-3.5Z").attr("fill", ink);
    else g.append("path").attr("d", "M-2.4,-15.5 L2.4,-15.5 L2.8,-8 L-2.8,-8Z").attr("fill", ink);
    g.append("circle").attr("cx", 0).attr("cy", -18.6).attr("r", 2.4).attr("fill", ink);
    if (t >= 600 && t < 1500) g.append("path").attr("d", "M-3,-17 Q0,-24 3,-17Z").attr("fill", ink);
    else if (t >= 1500 && t < 1750) g.append("ellipse").attr("cx", 0).attr("cy", -20.6).attr("rx", 4.4).attr("ry", 1.1).attr("fill", ink);
    else if (t >= 1750) { g.append("rect").attr("x", -2.2).attr("y", -25.5).attr("width", 4.4).attr("height", 4.6).attr("fill", ink); g.append("line").attr("x1", -3.8).attr("x2", 3.8).attr("y1", -21).attr("y2", -21).attr("stroke", ink).attr("stroke-width", 1.2); }
  }
  function drawTimeline(now) {
    if (now && S.playing && !REDUCED) phase += Math.min(0.1, (now - (lastFrame || now)) / 1000) * 9;
    lastFrame = now || 0;
    const xc = tlX(S.t);
    gAxis.select(".cursor").attr("cx", xc); gAxis.select(".cursor2").attr("cx", xc);
    const cur = STORY.filter(m => m.y <= Math.min(S.t, T_LAST)).pop();
    gAxis.selectAll(".story .slabel")
      .attr("fill", function () { return cur && this.parentNode.dataset.id === cur.id && !everything() ? "#1a1a18" : "#8a8983"; })
      .attr("opacity", function () { return tlW >= 900 || (cur && this.parentNode.dataset.id === cur.id) ? 1 : 0; });
    gWalk.selectAll("*").remove();
    if (!G) return;
    const n = everything() ? 6 : clamp(Math.round(G.n / 300), 1, 6);
    for (let i = 0; i < n; i++) figure(gWalk.append("g").attr("transform", "translate(" + (xc - 12 - i * 11) + "," + (BASE - 2) + ")"), everything() ? 1850 : S.t, phase + i * 1.3);
  }
  let holdUntil = 0, lastStep = 0;
  function play() {
    if (S.scene !== "main") return;
    if (everything()) setT(T_MIN);
    if (S.mode !== "none") { S.mode = "none"; renderPanel(); }
    S.playing = true; lastStep = performance.now();
    if (STORY.some(m => Math.abs(m.y - S.t) < 1)) holdUntil = lastStep + 2200;
    $("#playIcon").setAttribute("d", "M3 2h3v10H3zM8 2h3v10H8z"); $("#play").setAttribute("aria-label", "Pause");
    kick();
  }
  function pause() { S.playing = false; $("#playIcon").setAttribute("d", "M3 1.5v11l9-5.5z"); $("#play").setAttribute("aria-label", "Play"); }
  function stepPlay(now) {
    if (!S.playing) return false;
    const dt = Math.min(0.1, (now - lastStep) / 1000); lastStep = now;
    if (now < holdUntil) return true;
    const prev = S.t;
    if (prev >= T_LAST) { pause(); setT(T_ALL); return false; }
    let t = prev + dt * 52;
    const hit = STORY.find(m => m.y > prev && m.y <= t);
    if (hit) { t = hit.y; holdUntil = now + 2200; }
    if (t >= T_LAST) { t = T_LAST; holdUntil = now + 1400; }
    updateTime(t);
    return true;
  }
  function updateTime(t, force) {
    const cOld = S.t > T_LAST ? "all" : Math.floor((S.t - 250) / 100);
    S.t = t; $("#year").value = Math.round(t);
    G = composite(S.t);
    if (GL) TEETH.forEach(T => T.R.setParams(paramsFor(T)));
    const cNew = S.t > T_LAST ? "all" : Math.floor((S.t - 250) / 100);
    if (cOld !== cNew || force) updateParticles(S.scene === "main" && !REDUCED);
    header(); renderPanel(); requestRender(true);
  }
  function setT(t) { updateTime(clamp(t, T_MIN, T_ALL), true); requestRender(false); }
  function header() {
    $("#fTime").textContent = everything() ? "Everything" : Math.round(S.t);
    $("#fWin").textContent = everything() ? "all teeth, 300–1900 CE, pooled" : "teeth dated " + winStr(S.t) + " · ≈" + fmt(Math.round(G.n)) + " people";
    document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.jaw === S.jaw));
  }

  // controls
  $("#fRegion").innerHTML = REGIONS.map(([v, l]) => "<option value='" + esc(v) + "'>" + esc(l) + "</option>").join("");
  $("#fRegion").onchange = e => { S.region = e.target.value; TEETH.forEach(T => T.parts.clear()); setT(S.t); renderPanel(true); };
  document.querySelectorAll(".seg button").forEach(b => b.onclick = () => { S.jaw = b.dataset.jaw; setShapes(); setT(S.t); renderPanel(true); });
  $("#play").onclick = () => { S.touched = true; S.playing ? pause() : play(); };
  $("#year").addEventListener("input", e => { S.touched = true; pause(); if (S.mode === "limits") S.mode = "none"; updateTime(+e.target.value); });
  $("#year").addEventListener("change", () => requestRender(false));
  $("#limitsLink").onclick = openLimits;
  document.addEventListener("keydown", e => { if (e.key === " " && S.scene === "main" && !/INPUT|SELECT|BUTTON|SUMMARY/.test(document.activeElement.tagName)) { e.preventDefault(); S.touched = true; S.playing ? pause() : play(); } });

  // ------------------------------------------------------------------ intro
  const jawLayer = $("#jawLayer"), lineup = $("#lineup"), cloud = $("#cloud");
  const CLOUD = {};
  let introRun = 0;
  // The jaw is an engraving of both arches opened out flat (images/jaw-arches.webp, cut out by prepare_jaw.py).
  // Its top half is the upper jaw and stays still. Its bottom half is the lower jaw, hinged on the centre line
  // like the real jaw joint: closed, it is folded up onto the upper teeth and we see the back of the print;
  // opening swings it down towards the viewer until the picture lies flat as drawn. Illustration, not data.
  const JAW = { ok: false, rig: $("#jaw .rig"), up: $("#jaw .jw-up"), lo: $("#jaw .jw-lo"), front: $("#jaw .front"), back: $("#jaw .back"), rings: $("#jaw .rings") };
  // the lineup's four teeth on the lower right quadrant: [key, x, y, r] as fractions of the lower half's width and height
  const JAW_TEETH = [["molar", .862, .526, .08], ["pm2", .860, .661, .052], ["pm1", .814, .754, .05], ["canine", .755, .824, .048]];
  const PAPER = [238, 235, 226];
  async function loadJaw() {
    const src = IMG["jaw-arches"]; if (!src) return;
    const im = new Image(); im.src = src; await im.decode();
    const w = im.naturalWidth, hh = Math.floor(im.naturalHeight / 2);
    const half = (y0, flip) => { const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d"); if (flip) { x.translate(0, hh); x.scale(1, -1); } x.drawImage(im, 0, y0, w, hh, 0, 0, w, hh); return c; };
    JAW.upSrc = half(0); JAW.loSrc = half(im.naturalHeight - hh);
    // the back of the lower half is the same print seen through the paper: mirrored, faint
    const bk = half(im.naturalHeight - hh, true), px = bk.getContext("2d").getImageData(0, 0, w, hh).data, n = w * hh;
    const base = new Uint8ClampedArray(n * 4), order = new Uint8Array(n);
    // ink order: darkest strokes first, loosened by soft noise so the print fills in patchily, as it would
    const G = 24, gw = Math.ceil(w / G) + 2, gh = Math.ceil(hh / G) + 2, nz = Float32Array.from({ length: gw * gh }, () => Math.random());
    for (let y = 0, i = 0; y < hh; y++) for (let x = 0; x < w; x++, i++) {
      const fx = x / G, fy = y / G, x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0, g = y0 * gw + x0;
      const nv = (nz[g] * (1 - u) + nz[g + 1] * u) * (1 - v) + (nz[g + gw] * (1 - u) + nz[g + gw + 1] * u) * v;
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      order[i] = Math.round(0.72 * (r + gg + b) / 3 + 0.28 * 255 * nv);
      base[i * 4] = PAPER[0] + (r - PAPER[0]) * 0.52; base[i * 4 + 1] = PAPER[1] + (gg - PAPER[1]) * 0.52; base[i * 4 + 2] = PAPER[2] + (b - PAPER[2]) * 0.52; base[i * 4 + 3] = px[i * 4 + 3];
    }
    JAW.base = base; JAW.order = order; JAW.backSrc = document.createElement("canvas"); JAW.backSrc.width = w; JAW.backSrc.height = hh;
    [JAW.up, JAW.front, JAW.back].forEach(c => { c.width = w; c.height = hh; });
    $("#jaw").style.aspectRatio = w + " / " + (2 * hh);
    JAW.up.getContext("2d").drawImage(JAW.upSrc, 0, 0);
    JAW.rings.setAttribute("viewBox", "0 0 " + w + " " + hh);
    // molar and canine: drawn rings on a pale halo; premolars: dotted (they leave the story in the lineup)
    JAW.rings.innerHTML = JAW_TEETH.map(([k, fx, fy, fr]) => { const c = "pathLength='1' cx='" + fx * w + "' cy='" + fy * hh + "' r='" + fr * w + "'"; return k[0] === "p" ? "<g class='pm'><circle class='halo' " + c + "/><circle class='dot' " + c + "/></g>" : "<circle class='halo' " + c + "/><circle " + c + "/>"; }).join("");
    JAW.ok = true;
  }
  // 0 → 1: the paper appears, then the ink darkens in, darkest strokes first
  function jawInk(p) {
    if (!JAW.ok) return;
    const c = JAW.backSrc.getContext("2d"), d = c.createImageData(JAW.backSrc.width, JAW.backSrc.height), o = d.data, B = JAW.base, O = JAW.order;
    const lim = p * 1.35 * 255, pa = Math.min(1, p * 4);
    for (let i = 0, j = 0; i < O.length; i++, j += 4) {
      const k = Math.max(0, Math.min(1, (lim - O[i]) / 60));
      o[j] = PAPER[0] + (B[j] - PAPER[0]) * k; o[j + 1] = PAPER[1] + (B[j + 1] - PAPER[1]) * k; o[j + 2] = PAPER[2] + (B[j + 2] - PAPER[2]) * k; o[j + 3] = B[j + 3] * pa;
    }
    c.putImageData(d, 0, 0);
    jawPose(JAW.k || 0);
  }
  // 0 closed → 1 open. Faces darken a little as they turn away from a light above the viewer.
  function jawPose(k) {
    if (!JAW.ok) return;
    JAW.k = k;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * k), phi = 179.4 * (1 - e), r = phi * Math.PI / 180, nl = -0.45 * -Math.sin(r) + 0.89 * Math.cos(r);
    JAW.lo.style.transform = "translateZ(1px) rotateX(" + phi.toFixed(2) + "deg)";
    JAW.rig.style.transform = "translateY(" + (25 * (1 - e)).toFixed(2) + "%) rotateX(" + (14 * (1 - e)).toFixed(2) + "deg) rotateY(" + (-10 * (1 - e)).toFixed(2) + "deg)";
    const paint = (cv, src, dark) => { const c = cv.getContext("2d"); c.globalCompositeOperation = "copy"; c.drawImage(src, 0, 0); if (dark > 0.01) { c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(26,24,20," + dark.toFixed(3) + ")"; c.fillRect(0, 0, cv.width, cv.height); } };
    paint(JAW.front, JAW.loSrc, 0.32 * (1 - clamp(nl / 0.89, 0, 1)));
    paint(JAW.back, JAW.backSrc, 0.32 * (1 - clamp(-nl / 0.89, 0, 1)));
  }
  function jawReset() {
    if (!JAW.ok) return;
    JAW.up.style.opacity = 0; JAW.rings.classList.remove("on"); JAW.k = 0; jawInk(0);
  }
  // point sets for the intro: the molar from the constructed shape, everything else from the sculpted models
  const LINE = {};
  function snapshots() {
    if (!GL) return;
    setShapes();
    const mp = key => window.ToothGL.modelPoints(key);
    CLOUD.molar = TEETH[0].R.samplePoints(2600, 11);
    CLOUD.canine = TEETH[1].R.samplePoints(3200, 23);
    LINE.molar = CLOUD.molar; LINE.canine = CLOUD.canine;
    LINE.pm1 = mp(S.jaw + "_pm1") || []; LINE.pm2 = mp(S.jaw + "_pm2") || [];
  }
  const LV = [-0.35, 0.8, 0.55];
  function dots(ctx, R, pts, b, ox, oy, alpha, zs, size) {
    pts.forEach(q => {
      const s = R.projectWith([q.p[0], q.p[1], q.p[2] * zs], b), l = Math.max(0, q.n[0] * LV[0] + q.n[1] * LV[1] + q.n[2] * LV[2]);
      ctx.globalAlpha = alpha * (0.22 + 0.7 * (1 - l) * (1 - l) + (q.e < 0.5 ? 0.08 : 0));
      ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, size, 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function drawCloud(k, alpha) {
    const ctx = cloud.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), W = pairEl.clientWidth, H = pairEl.clientHeight;
    if (cloud.width !== Math.round(W * dpr) || cloud.height !== Math.round(H * dpr)) { cloud.width = Math.round(W * dpr); cloud.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!GL || alpha <= 0) return;
    const e = ease(k), cam = { yaw: VIEW.yaw * e, pitch: VIEW.pitch * e };
    ctx.fillStyle = "#1a1a18";
    TEETH.forEach(T => { const pts = CLOUD[T.key]; if (pts) dots(ctx, T.R, pts, T.R.basisFor(cam), T.el.offsetLeft, T.el.offsetTop, alpha, 0.08 + 0.92 * e, 0.8); });
  }
  function tween(ms, f) { return new Promise(res => { const t0 = performance.now(); const st = now => { const k = Math.min(1, (now - t0) / ms); f(k); if (k < 1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); }); }
  function centerPair(on) {
    pairEl.style.transition = "none"; pairEl.style.transform = "";
    if (on) { const sr = stage.getBoundingClientRect(), pr = pairEl.getBoundingClientRect(); pairEl.style.transform = "translateX(" + ((sr.left + sr.width / 2) - (pr.left + pr.width / 2)) + "px)"; }
    void pairEl.offsetWidth; pairEl.style.transition = "";
  }
  function setupLineup() {
    const w = TEETH[0].el.clientWidth, H = pairEl.clientHeight, o = TEETH[0].el.offsetLeft, cam = TEETH[0].R.st.cam;
    const pxu = (H / 2) * cam.focal / cam.dist, mid = o + w, d = 0.98 * pxu;
    const pos = [["molar", mid - 1.5 * d], ["pm1", mid - 0.5 * d], ["pm2", mid + 0.5 * d], ["canine", mid + 1.5 * d]];
    const shM = (o + 0.5 * w) - pos[0][1], shC = (o + 1.5 * w) - pos[3][1];
    lineup.innerHTML = "<div class='box'></div>" + pos.map(([k, c], i) => "<canvas data-i='" + i + "' style='left:" + (c - w / 2) + "px;width:" + w + "px;opacity:0'></canvas>").join("") +
      "<div class='lbl' data-i='0' style='left:" + pos[0][1] + "px'>FIRST MOLAR</div><div class='lbl' data-i='3' style='left:" + pos[3][1] + "px'>FIRST CANINE</div><div class='arrows'>→ ←</div>";
    const box = lineup.querySelector(".box");
    Object.assign(box.style, { left: (pos[0][1] - 0.85 * pxu) + "px", width: (pos[3][1] - pos[0][1] + 1.6 * pxu) + "px", top: "-4px", height: (H + 8) + "px" });
    lineup.querySelectorAll(".lbl").forEach(l => { l.style.top = "8px"; });
    lineup.querySelector(".arrows").style.top = (H - 44) + "px";
    const dpr = Math.min(devicePixelRatio || 1, 2), R = TEETH[0].R, b = R.basisFor({ yaw: 0, pitch: 0 });
    lineup.querySelectorAll("canvas").forEach(cv => {
      const i = +cv.dataset.i, pts = LINE[pos[i][0]] || [];
      cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px";
      const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#1a1a18";
      dots(ctx, R, pts, b, 0, 0, 1, 0.08, 0.75);
    });
    return { w, shM, shC };
  }
  // the opened jaw steps aside, its ringed teeth nearest the lineup; faint where there is no room beside it
  function jawAside() {
    const jb = $("#jaw").getBoundingClientRect(), bb = lineup.querySelector(".box").getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = 0.72;
    const right = bb.left - 18, dx = right - sc * jb.width / 2 - (jb.left + jb.width / 2);
    Object.assign(jawLayer.style, { transform: "translateX(" + dx + "px) scale(" + sc + ")", opacity: right - sc * jb.width >= sr.left ? 0.7 : 0.22 });
  }
  async function intro() {
    const run = ++introRun, alive = () => run === introRun;
    S.scene = "intro"; pause(); stage.classList.add("intro"); gParts.selectAll("*").remove(); gLabels.selectAll("*").remove();
    jawReset();
    Object.assign(jawLayer.style, { transform: "", opacity: 1 }); $("#introText").style.opacity = 1; lineup.innerHTML = ""; drawCloud(0, 0); cloud.style.opacity = 1;
    centerPair(true);
    await wait(120); if (!alive()) return;
    // 1 · the closed jaw inks itself in, then the lower jaw swings open on its hinge
    if (JAW.ok) {
      await tween(1600, jawInk); if (!alive()) return;
      await wait(300); if (!alive()) return;
      JAW.up.style.opacity = 1;
      await tween(3000, jawPose); if (!alive()) return;
      JAW.rings.classList.add("on");
      await wait(1500); if (!alive()) return;
    }
    // 2 · the jaw moves aside; four teeth line up, the premolars leave, molar and canine close in
    $("#introText").style.opacity = 0;
    const L = setupLineup(); jawAside();
    await wait(500); if (!alive()) return;
    lineup.querySelector(".box").style.opacity = 1;
    lineup.querySelectorAll("canvas").forEach(im => { im.style.opacity = +im.dataset.i === 1 || +im.dataset.i === 2 ? 0.45 : 1; });
    lineup.querySelectorAll(".lbl").forEach(l => { l.style.opacity = 1; });
    await wait(1600); if (!alive()) return;
    lineup.querySelector(".arrows").style.opacity = 1;
    lineup.querySelectorAll("canvas").forEach(im => { const i = +im.dataset.i; if (i === 1 || i === 2) im.style.opacity = 0; });
    await wait(600); if (!alive()) return;
    lineup.querySelectorAll("canvas,.lbl").forEach(el => { const i = +el.dataset.i, pre = el.tagName === "CANVAS" ? "" : "translateX(-50%) "; if (i === 0) el.style.transform = pre + "translateX(" + L.shM + "px)"; if (i === 3) el.style.transform = pre + "translateX(" + L.shC + "px)"; });
    await wait(1400); if (!alive()) return;
    // 3 · the flat drawings become 3D point clouds
    lineup.querySelector(".box").style.opacity = 0; lineup.querySelector(".arrows").style.opacity = 0; jawLayer.style.opacity = 0;
    lineup.querySelectorAll(".lbl").forEach(l => { l.style.opacity = 0; });
    lineup.querySelectorAll("canvas").forEach(im => { im.style.transition = "none"; });
    await tween(700, k => { drawCloud(0, k); lineup.querySelectorAll("canvas").forEach(im => { const i = +im.dataset.i; if (i === 0 || i === 3) im.style.opacity = 1 - k; }); });
    if (!alive()) return;
    await tween(2400, k => drawCloud(k, 1)); if (!alive()) return;
    // 4 · everything fades in, with the timeline at its beginning
    enterMain(true);
    cloud.style.transition = "opacity 1.2s"; cloud.style.opacity = 0;
    await wait(1300); drawCloud(0, 0); cloud.style.transition = ""; cloud.style.opacity = 1;
    await wait(1400);
    if (S.scene === "main" && !S.touched) play();
  }
  function enterMain(fromIntro) {
    introRun++;
    S.scene = "main"; S.mode = "none"; lineup.innerHTML = ""; jawLayer.style.opacity = 0;
    if (!fromIntro) drawCloud(0, 0);
    pairEl.style.transform = "";
    stage.classList.remove("intro");
    setShapes();
    drawAxis(); setT(S.t); renderPanel(true);
  }
  $("#skip").onclick = () => { enterMain(false); if (!REDUCED) setTimeout(() => { if (!S.touched) play(); }, 700); };
  $("#replay").onclick = () => { S.t = T_MIN; S.mode = "none"; S.touched = false; intro(); };

  // ------------------------------------------------------------------ start
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { drawAxis(); if (S.scene === "main") { setShapes(); setT(S.t); renderPanel(true); requestRender(false); drawTimeline(); } }, 150); });
  (async function start() {
  try { await window.ToothGL.loadModels(); } catch (e) { console.warn("tooth models not loaded; using constructed shapes", e); }
  try { await loadJaw(); } catch (e) { console.warn("jaw engraving not loaded; the intro starts at the lineup", e); }
  G = composite(S.t);
  if (GL) { snapshots(); TEETH.forEach(T => T.R.setParams(paramsFor(T))); }
  drawAxis();
  let q = null; try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
  const qs = k => q && q.get(k);
  if (qs("debug")) window.__dbg = { TEETH, S };
  if (qs("notrans")) document.head.insertAdjacentHTML("beforeend", "<style>*{transition:none!important}</style>");
  if (qs("t")) S.t = +qs("t");
  if (qs("region")) { S.region = qs("region"); $("#fRegion").value = S.region; }
  if (qs("jaw")) { S.jaw = qs("jaw"); if (GL) { snapshots(); } }
  if (REDUCED || qs("scene") === "main") {
    enterMain(false);
    if (qs("mode") === "limits") openLimits();
    if (qs("play") === "1") play();
  } else if (qs("freeze")) {
    // test hook: show one intro frame without animation
    document.querySelectorAll("#stage *").forEach(el => { el.style.transition = "none"; });
    centerPair(true); const f = +qs("freeze");
    if (JAW.ok) { jawInk(1); jawPose(Math.min(1, f)); JAW.up.style.opacity = f > 0 ? 1 : 0; JAW.rings.classList.toggle("on", f >= 1); }
    if (f >= 2) { $("#introText").style.opacity = 0; setupLineup(); jawAside(); lineup.querySelector(".box").style.opacity = 1; lineup.querySelectorAll("canvas").forEach(im => { im.style.opacity = +im.dataset.i === 1 || +im.dataset.i === 2 ? 0.45 : 1; }); lineup.querySelectorAll(".lbl").forEach(l => { l.style.opacity = 1; }); lineup.querySelector(".arrows").style.opacity = 1; }
    if (f >= 3) { lineup.innerHTML = ""; jawLayer.style.opacity = 0; drawCloud(0.6, 1); }
  } else intro();
  })();
})();
