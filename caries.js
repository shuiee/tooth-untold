/* The Tooth Untold: the caries plate (the Caries dashboard).
   Two teeth seen from above, a lower first molar and a lower canine, with decay drawn where occlusal caries begins: in the
   pits and fissures, spreading outward. Six eras play in sequence as one lesion that grows and recedes; each finished era
   leaves its outline behind. A click on a numbered mark, an outline or an era opens that era's detail.
   The shaded area encodes the share of adults in the era with caries (data/layers.js, caries), not damage to one tooth.
   The outlines are drawn from cusp lobes and the fissure pattern: illustration, not measurement.
   window.CariesPlate.mount(el, data) fills el; it is safe to call again on the same element. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg", TAU = Math.PI * 2, K = 360;
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Expanded scale: the whole record lies between 52.4 and 76.1%, so a rate of 51 shades 8% of the crown and 77 shades 80%.
  // That magnifies every difference about 2.8 times and still leaves a rim of enamel at the top. The notes say so.
  const LO = 51, HI = 77, A0 = 0.08, A1 = 0.80;
  const frac = r => Math.max(0.03, Math.min(0.86, A0 + (A1 - A0) * (r - LO) / (HI - LO)));

  // Context, not data: what was happening in each era and why it may have reached the teeth. The events are the team's
  // (research/Human Correlations/timeline_events_display.csv); "hinge" events changed what the tooth could record.
  // The numbers quoted in "why" are the era's own figures from data/layers.js.
  const CONTEXT = {
    "Pre-medieval": {
      why: "Roman and late-antique diets were built on coarse, stone-ground grain. The flour carried grit from the millstones, which wore teeth down quickly but left little fermentable residue sitting in the fissures. Caries is already common, but the severe tail is thin: <b>only 2.9%</b> of adults carried ten or more carious teeth.",
      ev: [["1–400", "Roman lead production peaks", "Industrial-scale mining and smelting; lead in plumbing, vessels, cosmetics and as a wine sweetener."],
        ["1–400", "Water-powered milling spreads", "Mill density indexes how much of the population ate stone-ground flour rather than home-processed grain."],
        ["1–300", "Sorghum and millet in the Roman diet", "Establishes the dietary baseline against which later change is measured."],
        ["1–200", "Extraction becomes a trade", "Teeth removed from the record, at volume, for payment.", 1]] },
    "Early medieval": {
      why: "The decay pulls back. Long-distance trade and urban commerce had collapsed with the western empire, and with them the routes that carry refined carbohydrate. <b>44.5%</b> of adults reached death with no carious tooth at all, and this is the largest sample in the record.",
      ev: [["400–700", "Lead exposure collapses after Rome", "Collapse of industrial-scale mining and smelting with the western empire."],
        ["400–700", "The first plague pandemic", "Plague reaches Europe five centuries before the Black Death."],
        ["700–1000", "Black pepper reaches central Italy", "Long-distance spice trade reaching non-elite populations."],
        ["3000 BCE–1900", "Dairying established across Europe", "Milk consumption is continuous across the period rather than a change point."]] },
    "High medieval": {
      why: "The least decay in the record. Watermills and windmills had put stone-ground flour in front of most of Europe, and stone-ground flour is abrasive and coarse rather than sweet. Sugar was still a medicine, not a staple. <b>Only 0.5%</b> of adults carried ten or more carious teeth.",
      ev: [["1086", "Domesday records thousands of watermills", "Mill density indexes how much of the population ate stone-ground flour rather than home-processed grain."],
        ["1180–1250", "Windmills appear in northwest Europe", "Further extends stone-ground flour consumption; abrasive load unchanged."],
        ["1200–1500", "Lead exposure exceeds the Roman peak", "Resumed mining, plus leaded glazes, pewter vessels and cosmetics in higher-status households."],
        ["1000–1400", "Leprosy rises and then recedes", "A disease the record can be watched leaving, not only arriving."]] },
    "Late medieval": {
      why: "The turn. Twelve points of prevalence arrive in roughly two centuries and the decay spreads back past where it started, while the untouched share falls from 47.2% to <b>35.5%</b>. Urban commercial economies delivered refined flour and imported sugar to towns well before the countryside.",
      ev: [["1300–1500", "Cities become worse for teeth than the countryside", "Urban commercial economies deliver refined flour and imported sugar to towns first."],
        ["1100–1700", "Sugar and refined starch reshape the mouth", "Fermentable carbohydrate becomes a routine rather than an occasional exposure."],
        ["1347–1351", "The Black Death", "A mortality event severe enough to change who ends up in the cemeteries being read."],
        ["1100–1536", "Mercury used against leprosy and syphilis", "A chemical trace of human response to disease rather than of disease itself.", 1]] },
    "Early modern": {
      why: "The outline barely moves, and that is the point. Prevalence holds where the late medieval period left it, but the severity underneath it moves hard: the share carrying five or more carious teeth climbs from 15.3% to <b>23.2%</b>, and the worst tenth of affected mouths goes from seven teeth to nine. The same headline number now covers a worse distribution.",
      ev: [["1500–1600", "New World crops reach European fields", "Expands the calorie base and the starch fraction of the diet."],
        ["1600–1700", "Maize and potato appear in European mouths", "Direct evidence that New World crops had entered the diet of the urban poor."],
        ["1650–1750", "Tea and sugar become everyday goods in Britain", "Sustained daily exposure to fermentable sucrose, including between meals."],
        ["1495–1700", "Syphilis spreads through Europe", "New epidemic disease; drives the mercury treatment response."]] },
    "Industrial": {
      why: "Cheap sugar, roller-milled flour, and the removal of the grit that used to scour the fissures clean. Three-quarters of adults carried caries and <b>8.7%</b> carried ten or more carious teeth, seventeen times the high medieval share. This is also where the record begins to fail: once amalgam makes repair routine, a filled tooth is a lesion that has been concealed, and the tooth stops being able to report its own history.",
      ev: [["1846", "Britain equalises sugar duties", "Price fall increases per-capita sugar consumption across income groups."],
        ["1870–1890", "Roller mills; industrial food processing", "Eliminates the principal source of dietary grit while raising the share of refined, rapidly fermentable starch."],
        ["1750–1900", "Industrial urbanisation", "Concentrates population in cities with commercial food supply and no fresh produce."],
        ["1826–1900", "Amalgam makes tooth repair routine", "A filled tooth is a caries lesion that has been concealed. DMFT separates D, M and F precisely because disease can no longer be read from the tooth alone.", 1]] },
  };
  // severity bands, none to ten or more carious teeth: the page's neutral ramp, as in the wear chart
  const BAND = ["#e2e0d9", "#b9b6ad", "#8f8b81", "#5e5b54", "#2b2925"];

  // ------------------------------------------------------------------ geometry: a radial profile per tooth
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // sum of gaussian blobs [x, y, radius, weight] -> a scalar field
  function field(lobes) {
    return (x, y) => { let a = 0; for (const l of lobes) { const dx = x - l[0], dy = y - l[1]; a += l[3] * Math.exp(-(dx * dx + dy * dy) / (2 * l[2] * l[2])); } return a; };
  }
  // iso-contour of a field as a radial profile about the origin: bisect along each of K rays
  function profile(F, iso, warp) {
    const r = new Float64Array(K);
    for (let k = 0; k < K; k++) {
      const t = k / K * TAU, ux = Math.cos(t), uy = Math.sin(t);
      let lo = 0.005, hi = 2.4;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (F(ux * m, uy * m) > iso) lo = m; else hi = m; }
      r[k] = lo * (warp ? warp(t) : 1);
    }
    return r;
  }
  // the same contour for the decay, which is clipped to just inside the crown anyway: each ray only searches up to that
  // limit (lim = the clip radius before the warp). Seeds are packed into one array, as this runs ~100k times per era.
  function decayProfile(seeds, s, lim) {
    const n = seeds.length, P = new Float64Array(n * 4);
    seeds.forEach((q, i) => { P[i * 4] = q[0]; P[i * 4 + 1] = q[1]; P[i * 4 + 2] = 1 / (2 * q[2] * s * q[2] * s); P[i * 4 + 3] = q[3]; });
    const F = (x, y) => { let a = 0; for (let i = 0; i < n * 4; i += 4) { const dx = x - P[i], dy = y - P[i + 1]; a += P[i + 3] * Math.exp(-(dx * dx + dy * dy) * P[i + 2]); } return a; };
    const r = new Float64Array(K);
    for (let k = 0; k < K; k++) {
      const t = k / K * TAU, ux = Math.cos(t), uy = Math.sin(t), L = lim[k];
      if (F(ux * L, uy * L) > 0.5) { r[k] = L; continue; }
      let lo = 0.005, hi = L;
      for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (F(ux * m, uy * m) > 0.5) lo = m; else hi = m; }
      r[k] = lo;
    }
    return r;
  }
  // circular moving average: removes the spikes left by clipping to the crown
  function smoothR(r, w) {
    const o = new Float64Array(K);
    for (let k = 0; k < K; k++) { let a = 0; for (let j = -w; j <= w; j++) a += r[(k + j + 2 * K) % K]; o[k] = a / (2 * w + 1); }
    return o;
  }
  function areaOf(T, r) {
    let a = 0;
    for (let k = 0; k < K; k++) {
      const j = (k + 1) % K, t1 = k / K * TAU, t2 = j / K * TAU;
      a += Math.cos(t1) * r[k] * T.sx * Math.sin(t2) * r[j] * T.sy - Math.cos(t2) * r[j] * T.sx * Math.sin(t1) * r[k] * T.sy;
    }
    return Math.abs(a / 2);
  }
  const dOf = (T, r) => { let d = ""; for (let k = 0; k < K; k++) { const t = k / K * TAU; d += (k ? "L" : "M") + (T.cx + Math.cos(t) * r[k] * T.sx).toFixed(2) + " " + (T.cy - Math.sin(t) * r[k] * T.sy).toFixed(2); } return d + "Z"; };
  const lineOf = (T, f) => f.map((q, i) => (i ? "L" : "M") + (T.cx + q[0] * T.sx).toFixed(1) + " " + (T.cy - q[1] * T.sy).toFixed(1)).join("");

  // cusp lobes: five on the lower first molar (two lingual, three buccal) plus the central fossa; three on the canine plus a lingual one
  const MOLAR_LOBES = [[-0.46, 0.36, 0.30, 1], [0.44, 0.34, 0.30, 1], [-0.48, -0.36, 0.30, 1], [0.30, -0.38, 0.29, 1], [0.68, -0.06, 0.24, 0.85], [0, 0, 0.46, 0.55]];
  const CANINE_LOBES = [[0, -0.36, 0.26, 1], [-0.28, 0.06, 0.23, 0.95], [0.28, 0.04, 0.22, 0.95], [0, 0.34, 0.18, 0.72]];
  // occlusal grooves: the molar's central fissure with its buccal, lingual and distobuccal branches and the fossae;
  // the canine's labial ridge and its mesial and distal marginal ridges
  const MOLAR_FISS = [[[-0.56, 0.05], [-0.24, -0.02], [0.10, 0.04], [0.44, -0.02], [0.74, -0.08]], [[-0.02, 0.02], [-0.03, 0.28], [-0.04, 0.56]],
    [[-0.06, -0.01], [-0.07, -0.30], [-0.08, -0.56]], [[0.44, -0.02], [0.49, -0.28], [0.52, -0.50]],
    [[-0.56, 0.05], [-0.70, 0.28]], [[-0.56, 0.05], [-0.72, -0.20]], [[0.74, -0.08], [0.86, 0.14]], [[0.74, -0.08], [0.84, -0.28]]];
  const CANINE_FISS = [[[0, 0.07], [0.01, -0.26], [0.02, -0.56]], [[0, 0.07], [-0.24, 0.24], [-0.30, 0.34]], [[0, 0.07], [0.24, 0.22], [0.30, 0.32]], [[-0.20, 0.38], [0, 0.44], [0.20, 0.37]]];

  function mkTooth(lobes, iso, fiss, cx, cy, sx, sy, no, cap, seed) {
    const T = { cx, cy, sx, sy, no, cap, fiss }, nz = rng(seed);
    // a small fixed ripple (mean zero) so neither the crown nor the decay reads as machined
    const h = [[3, 0.030, nz() * TAU], [5, 0.020, nz() * TAU], [8, 0.012, nz() * TAU]];
    T.warp = t => 1 + h.reduce((a, q) => a + q[1] * Math.sin(q[0] * t + q[2]), 0);
    T.crown = profile(field(lobes), iso, T.warp);
    T.area = areaOf(T, T.crown);
    // decay seeds along the fissures, where occlusal caries starts, plus a few pits off them; fixed for all eras
    const seeds = [];
    for (const f of fiss) for (let i = 0; i < f.length - 1; i++) for (let s = 0; s < 3; s++) {
      const u = (s + 0.5) / 3;
      seeds.push([f[i][0] + (f[i + 1][0] - f[i][0]) * u + (nz() - 0.5) * 0.06, f[i][1] + (f[i + 1][1] - f[i][1]) * u + (nz() - 0.5) * 0.06, 0.055 + 0.055 * nz(), 0.75 + 0.55 * nz()]);
    }
    for (let i = 0; i < 6; i++) { const t = nz() * TAU, rr = 0.22 + 0.38 * nz(); seeds.push([Math.cos(t) * rr, Math.sin(t) * rr * 0.78, 0.045 + 0.045 * nz(), 0.55 + 0.4 * nz()]); }
    T.seeds = seeds; T.core = seeds.filter((s, i) => i % 3 === 0);
    return T;
  }
  // the extent is solved, not drawn: grow the seeds until the shaded share of the crown is the era's target
  // (regula falsi with the Illinois step on the log of the seed-radius multiplier: the shaded share rises steadily with it;
  // it stops within 0.3% of the target)
  function decayAt(T, seedSet, target) {
    if (!T.lim) T.lim = Float64Array.from(T.crown, (c, k) => c * 0.955 / T.warp(k / K * TAU));
    const shade = u => {
      const r = decayProfile(seedSet, Math.exp(u), T.lim);
      for (let k = 0; k < K; k++) r[k] = Math.min(r[k] * T.warp(k / K * TAU), T.crown[k] * 0.955);
      const sm = smoothR(r, 6);
      for (let k = 0; k < K; k++) sm[k] = Math.min(sm[k], T.crown[k] * 0.955);
      return { sm, f: areaOf(T, sm) / T.area - target };
    };
    let a = Math.log(0.25), b = Math.log(4.0), A = shade(a), B = shade(b), fa = A.f, fb = B.f, side = 0, best = Math.abs(fa) < Math.abs(fb) ? A : B;
    if (fa >= 0) return A.sm;
    if (fb <= 0) return B.sm;
    for (let i = 0; i < 24 && Math.abs(best.f) > 0.003 * target; i++) {
      const s = (a * fb - b * fa) / (fb - fa), C = shade(s);
      if (Math.abs(C.f) < Math.abs(best.f)) best = C;
      if (C.f > 0) { b = s; fb = C.f; if (side === -1) fa /= 2; side = -1; }
      else { a = s; fa = C.f; if (side === 1) fb /= 2; side = 1; }
    }
    return best.sm;
  }
  // Profiles are solved one era at a time (about 0.1 s each) and kept, so the page never stalls on all six at once.
  let TEETH = null, PROF = [], ERAS = [], BLANK = null, forRates = "";
  function geometry(eras) {
    if (!TEETH) TEETH = [mkTooth(MOLAR_LOBES, 0.62, MOLAR_FISS, 182, 196, 160, 160, "Fig. 1", "lower first molar, occlusal", 11),
      mkTooth(CANINE_LOBES, 0.52, CANINE_FISS, 506, 196, 132, 192, "Fig. 2", "lower canine, incisal", 29)];
    BLANK = BLANK || TEETH.map(() => { const z = new Float64Array(K).fill(0.015); return { out: z, mid: z, inn: z }; });
    const key = eras.map(d => d.std).join();
    if (key !== forRates) { PROF = []; ERAS = eras; forRates = key; }
  }
  // three layers per era: the whole lesion, the cavitated body and the deepest point (the inner two from a subset of seeds)
  function era(i) {
    const A = frac(ERAS[i].std);
    return PROF[i] || (PROF[i] = TEETH.map(T => ({ out: decayAt(T, T.seeds, A), mid: decayAt(T, T.core, A * 0.50), inn: decayAt(T, T.core, A * 0.22) })));
  }
  const allEras = () => ERAS.forEach((d, i) => era(i));

  // ------------------------------------------------------------------ the page
  const NOTES = n => [
    ["What the decay shows", "The shaded area is the share of adults in that era who carried at least one carious tooth, not the damage to one tooth. Its shape grows from the fissure pattern, where occlusal caries starts, and is the same shape in every era; only its extent changes."],
    ["The scale is expanded", "The shaded share of the crown runs from 8% at a rate of 51% to 80% at a rate of 77%, because the whole record sits between 52.4% and 76.1%. That magnifies every difference about 2.8 times. Even so, eras 1, 4 and 5 lie within a point of one another (63.7, 64.5 and 64.0%), so their outlines all but coincide: that is the finding, not a fault in the drawing."],
    ["One reference population", "Every rate is age-standardised to the pooled age distribution of all " + n.toLocaleString("en") + " adults (18–69), so no era reads higher merely because more of its people lived long enough to accumulate decay. It moves each value by at most 1.2 points and changes no ordering."],
    ["The drawings", "Both outlines are built from cusp lobes, five on the lower first molar and three on the canine, with the occlusal groove pattern over them: drawn, not measured. Era spans are the 10th to 90th percentile of site dates, so they overlap. A ‘hinge’ marks an event that changed what the tooth could record rather than what it recorded."],
    ["Source", "Global History of Health Project, European module, decoded for this project. Events and the ‘why’ text are context from the team's timeline, not data."]];
  const HTML = "<div class='cp'>" +
    "<div class='cp-fig'><svg class='cp-plate' viewBox='0 0 660 430' role='img' aria-label='A lower first molar and a lower canine seen from above, with the extent of carious decay drawn for six eras.'></svg></div>" +
    "<div class='cp-foot'><span class='cp-hint'>Reading the record forward…</span><button class='btn cp-replay' type='button'>Replay</button></div>" +
    "<div class='cp-rail'></div>" +
    "<div class='cp-read'><p class='cp-era'></p><p class='cp-yrs'></p>" +
    "<div class='cp-stats'><div><b class='cp-s1'></b><span>of adults carried caries</span></div><div><b class='cp-s2'></b><span>carious teeth, on average, in an affected mouth</span></div><div><b class='cp-s3'></b><span>or more, in the worst-affected tenth</span></div></div>" +
    "<p class='cp-bh'>Teeth carious, per person</p><div class='cp-bar'></div><div class='cp-keys'></div></div>" +
    "<div class='cp-detail' hidden><div class='cp-dtop'><p class='cp-dh'></p><button class='link cp-close' type='button'>Close</button></div>" +
    "<p class='cp-h4'>What was happening</p><div class='cp-ev'></div><p class='cp-h4'>Why it may have reached the teeth</p><p class='cp-why'></p>" +
    "<p class='cp-h4'>All six eras</p><div class='cp-cmp'></div></div>" +
    "<div class='cp-notes'></div></div>";

  function mount(el, data) {
    if (!el || !data || !data.eras) return;
    if (el.dataset.mounted) return;                // resize redraws must not restart the run
    el.dataset.mounted = "1";
    const PD = data.eras, N = PD.length;
    geometry(PD);
    el.innerHTML = HTML;
    const q = s => el.querySelector(s), svg = q(".cp-plate");
    const span = d => "c. " + d.lo + "–" + d.hi + " CE";
    const live = [], ghostG = [], marks = [];

    // ---- build the plate
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML = "<radialGradient id='cpEnamel' cx='46%' cy='42%' r='66%'><stop offset='0%' stop-color='#fbfaf6'/><stop offset='62%' stop-color='#f1efe9'/><stop offset='100%' stop-color='#d9d6cd'/></radialGradient>" +
      "<radialGradient id='cpDecay' cx='48%' cy='46%' r='62%'><stop offset='0%' stop-color='#17140f'/><stop offset='55%' stop-color='#2c2619'/><stop offset='100%' stop-color='#4d4330'/></radialGradient>";
    svg.appendChild(defs);
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
    TEETH.forEach((T, ti) => {
      const g = mk("g", {}, svg);
      mk("path", { class: "cp-enamel", d: dOf(T, T.crown) }, g);
      T.fiss.forEach(f => mk("path", { class: "cp-fiss", d: lineOf(T, f) }, g));
      ghostG[ti] = mk("g", {}, g);
      const halo = mk("path", { class: "cp-halo" }, g), out = mk("path", { class: "cp-out" }, g), mid = mk("path", { class: "cp-mid" }, g), inn = mk("path", { class: "cp-in" }, g);
      const dclip = mk("clipPath", { id: "cpClip" + ti }, defs), dcp = mk("path", {}, dclip);
      const sp = mk("g", { class: "cp-speck", "clip-path": "url(#cpClip" + ti + ")" }, g), nz = rng(500 + ti * 37);
      for (let i = 0; i < 190; i++) { const t = nz() * TAU, rr = Math.sqrt(nz()); mk("circle", { cx: (T.cx + Math.cos(t) * rr * T.sx * 0.9).toFixed(1), cy: (T.cy - Math.sin(t) * rr * T.sy * 0.9).toFixed(1), r: (0.6 + nz() * 1.5).toFixed(2) }, sp); }
      T.fiss.forEach(f => mk("path", { class: "cp-fiss-deep", "clip-path": "url(#cpClip" + ti + ")", d: lineOf(T, f) }, g));   // the grooves read through the decay
      ghostG[ti].over = mk("g", { "clip-path": "url(#cpClip" + ti + ")" }, g);   // the same outlines, pale, where they fall inside the live lesion
      mk("text", { class: "cp-no", x: T.cx, y: 398, "text-anchor": "middle" }, g).textContent = T.no;
      mk("text", { class: "cp-cap", x: T.cx, y: 416, "text-anchor": "middle" }, g).textContent = T.cap;
      live[ti] = { halo, out, mid, inn, dcp };
    });
    // one numbered mark per era, on the molar
    const mg = mk("g", {}, svg);
    PD.forEach((d, i) => {
      const g = mk("g", { class: "cp-mark", tabindex: 0, role: "button", "aria-label": "Era " + (i + 1) + ", " + d.p + ", " + d.std + " per cent" }, mg);
      mk("circle", { r: 10 }, g); mk("text", { "text-anchor": "middle" }, g).textContent = i + 1;
      g.addEventListener("click", () => pick(i));
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } });
      marks[i] = g;
    });

    function paintShape(a, b, u) {
      TEETH.forEach((T, ti) => {
        const L = live[ti], A = a[ti], B = b[ti];
        const mix = (p, r) => { const o = new Float64Array(K); for (let k = 0; k < K; k++) o[k] = p[k] + (r[k] - p[k]) * u; return o; };
        const dOut = dOf(T, mix(A.out, B.out));
        L.out.setAttribute("d", dOut); L.halo.setAttribute("d", dOut); L.dcp.setAttribute("d", dOut);
        L.mid.setAttribute("d", dOf(T, mix(A.mid, B.mid))); L.inn.setAttribute("d", dOf(T, mix(A.inn, B.inn)));
      });
    }
    // the outlines each finished era leaves behind; they are also click targets
    function setGhosts(upto) {
      TEETH.forEach((T, ti) => {
        ghostG[ti].textContent = ""; ghostG[ti].over.textContent = "";
        for (let i = 0; i <= upto; i++) {
          const d = dOf(T, era(i)[ti].out);
          mk("path", { class: "cp-ghost", d, opacity: (0.3 + 0.07 * i).toFixed(2) }, ghostG[ti]);
          mk("path", { class: "cp-ghost cp-ghost-in", d, opacity: (0.4 + 0.07 * i).toFixed(2) }, ghostG[ti].over);
          mk("path", { class: "cp-ghost-hit", d }, ghostG[ti]).addEventListener("click", () => pick(i));
        }
      });
      placeMarks(upto);
    }
    // each mark sits on its own era's outline, at the candidate angle farthest from the marks already placed
    function placeMarks(upto) {
      const put = [], M = TEETH[0];
      marks.forEach((m, i) => {
        if (i > upto) { m.setAttribute("opacity", 0); m.style.pointerEvents = "none"; return; }
        m.setAttribute("opacity", 1); m.style.pointerEvents = "";
        let best = null, bestD = -1;
        for (let c = 0; c < 48; c++) {
          const k = Math.round(c / 48 * K) % K, t = k / K * TAU, r = era(i)[0].out[k];
          const x = M.cx + Math.cos(t) * r * M.sx, y = M.cy - Math.sin(t) * r * M.sy;
          let d = put.length ? Math.min(...put.map(p => Math.hypot(x - p[0], y - p[1]))) : 1e9 - c;
          if (d > bestD) { bestD = d; best = [x, y]; }
        }
        put.push(best);
        m.querySelector("circle").setAttribute("cx", best[0].toFixed(1)); m.querySelector("circle").setAttribute("cy", best[1].toFixed(1));
        m.querySelector("text").setAttribute("x", best[0].toFixed(1)); m.querySelector("text").setAttribute("y", (best[1] + 3.5).toFixed(1));
      });
    }

    // ---- the readout beside the figure: era, three figures, one severity bar
    const bar = q(".cp-bar"), segs = data.bands.map((b, j) => {
      const s = document.createElement("span"); s.style.background = BAND[j]; s.style.color = j >= 2 ? "#fbf8f1" : "#1a1a18"; bar.appendChild(s);
      q(".cp-keys").insertAdjacentHTML("beforeend", "<span><i style='background:" + BAND[j] + "'></i>" + esc(b) + "</span>");
      return s;
    });
    const chips = PD.map((d, i) => {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = "<span class='n'>" + (i + 1) + "</span>" + esc(d.p) + "<span class='y'>" + d.lo + "–" + d.hi + "</span>";
      b.addEventListener("click", () => pick(i)); q(".cp-rail").appendChild(b); return b;
    });
    q(".cp-notes").innerHTML = NOTES(data.n).map(n => "<p class='ctxnote'><b>" + esc(n[0]) + "</b>" + esc(n[1]) + "</p>").join("");

    function readout(i) {
      const d = PD[i];
      q(".cp-era").textContent = d.p; q(".cp-yrs").textContent = span(d);
      q(".cp-s1").innerHTML = d.std.toFixed(1) + "<small>%</small>"; q(".cp-s2").textContent = d.aff; q(".cp-s3").textContent = d.p90;
      d.sev.forEach((v, j) => { segs[j].style.width = v + "%"; segs[j].textContent = v >= 9 ? Math.round(v) : ""; });
      chips.forEach((c, j) => c.setAttribute("aria-pressed", j === i ? "true" : "false"));
      marks.forEach((m, j) => m.classList.toggle("on", j === i));
    }
    function openDetail(i) {
      const d = PD[i], C = CONTEXT[d.p] || { why: "", ev: [] };
      q(".cp-dh").innerHTML = esc(d.p) + "<em>" + esc(span(d)) + " · n = " + d.n.toLocaleString("en") + " adults · crude rate " + d.crude.toFixed(1) + "% · mean age at death " + d.age + "</em>";
      q(".cp-why").innerHTML = C.why;                // trusted copy from CONTEXT above (it carries <b>)
      q(".cp-ev").innerHTML = C.ev.map(e => "<div class='cp-e'><span class='y'>" + esc(e[0]) + "</span><div><p class='t'>" + esc(e[1]) + (e[3] ? "<span class='tag'>hinge</span>" : "") + "</p><p class='m'>" + esc(e[2]) + "</p></div></div>").join("");
      q(".cp-cmp").innerHTML = PD.map((r, j) => "<button type='button' class='cp-row" + (j === i ? " on" : "") + "' data-i='" + j + "'><span class='nm'>" + esc(r.p) + "</span><span class='cb'>" +
        r.sev.map((v, k) => "<span style='width:" + v + "%;background:" + BAND[k] + "'></span>").join("") + "</span><span class='v'>" + r.std.toFixed(1) + "%</span></button>").join("");
      q(".cp-cmp").querySelectorAll(".cp-row").forEach(r => r.addEventListener("click", () => pick(+r.dataset.i)));
      q(".cp-detail").hidden = false;
    }

    // ---- motion: one live lesion, interpolated between eras
    let raf = null, timer = null, cur = N - 1;
    const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const halt = () => { if (raf) cancelAnimationFrame(raf); if (timer) clearTimeout(timer); raf = timer = null; };
    function animate(from, to, ms, done) {
      const t0 = performance.now();
      const tick = now => {
        if (!svg.isConnected) { halt(); return; }    // the dashboard was closed
        const u = Math.min(1, (now - t0) / ms);
        paintShape(from, to, ease(u));
        if (u < 1) raf = requestAnimationFrame(tick); else { raf = null; if (done) done(); }
      };
      raf = requestAnimationFrame(tick);
    }
    function pick(i) {
      halt();
      const from = PROF[cur] || BLANK; cur = i;
      readout(i); setGhosts(N - 1);
      if (REDUCED) { paintShape(era(i), era(i), 1); openDetail(i); }
      else animate(from, era(i), 820, () => openDetail(i));
      q(".cp-hint").textContent = "Era " + (i + 1) + ": " + PD[i].p + ".";
    }
    function run() {
      halt();
      q(".cp-detail").hidden = true; q(".cp-hint").textContent = "Reading the record forward…";
      setGhosts(-1); paintShape(BLANK, BLANK, 0);
      let i = 0;
      const step = () => {
        if (!svg.isConnected) { halt(); return; }
        readout(i);
        animate(i === 0 ? BLANK : era(i - 1), era(i), 1150, () => {
          setGhosts(i); cur = i; i++;
          if (i < N) timer = setTimeout(step, 520);
          else { timer = null; q(".cp-hint").textContent = "Click a numbered mark, an outline or an era to open it."; }
        });
      };
      timer = setTimeout(step, 300);
    }
    q(".cp-replay").addEventListener("click", () => { if (REDUCED) { pick(N - 1); return; } run(); });
    q(".cp-close").addEventListener("click", () => { q(".cp-detail").hidden = true; });

    // first paint is already a finished figure (the last era), so a thumbnail is never an empty tooth; the other eras are
    // solved one per task after it, then their outlines appear and the run starts
    readout(N - 1); setGhosts(-1); paintShape(era(N - 1), era(N - 1), 1);
    let next = 0;
    const prep = () => {
      if (!svg.isConnected) return;
      if (next < N - 1) { era(next++); timer = setTimeout(prep, 0); return; }
      timer = null; setGhosts(N - 1);
      if (!REDUCED) run(); else q(".cp-hint").textContent = "Click a numbered mark, an outline or an era to open it.";
    };
    timer = setTimeout(prep, 0);
  }

  // for checks in the console: shaded share of each crown per era, and how close the lesion is to the crown's shape
  function check(data) {
    geometry(data.eras);
    const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let c = 0, va = 0, vb = 0; for (let k = 0; k < n; k++) { c += (a[k] - ma) * (b[k] - mb); va += (a[k] - ma) ** 2; vb += (b[k] - mb) ** 2; } return c / Math.sqrt(va * vb); };
    return data.eras.map((d, i) => ({ era: d.p, target: +frac(d.std).toFixed(4), shaded: TEETH.map(T => +(areaOf(T, era(i)[TEETH.indexOf(T)].out) / T.area).toFixed(4)), corr: TEETH.map((T, ti) => +corr(Array.from(era(i)[ti].out), Array.from(T.crown)).toFixed(3)) }));
  }
  window.CariesPlate = { mount, check };
})();
