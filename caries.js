/* The Tooth Untold: the caries plate (Section 1's figure).
   The decay is drawn on the 3D molar, seen from above: where occlusal caries begins, in the pits and fissures, spreading
   outward. Six eras play in sequence as one lesion that grows and recedes; each finished era leaves its outline behind,
   with a numbered mark. This module solves each era's lesion (the shaded share of the crown is the share of adults in the
   era with caries, data/layers.js caries.plate, on an expanded scale), runs the eras, and fills the readout beside the
   plate: era, three figures, a severity bar and, on request, the era's events and text. The page lays the outlines onto
   the molar (app.js, drawCariesOverlay()) and sends clicks on them back through pick().
   window.CariesPlate.mount(el, data, { onFrame }) fills el and returns its api; CariesPlate.notes(data) gives the
   figure's notes for the page to set under its caption. */
(function () {
  "use strict";
  const TAU = Math.PI * 2, K = 360;
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
    ["The scale is expanded", "The shaded share of the crown runs from 8% at a rate of 51% to 80% at a rate of 77%, because the whole record sits between 52.4% and 76.1%. That magnifies every difference about 2.8 times. Even so, Pre-medieval, Late medieval and Early modern lie within a point of one another (63.7, 64.5 and 64.0%), so their outlines all but coincide: that is the finding, not a fault in the drawing. On the molar the three are drawn side by side, a few pixels apart in rate order, so each can be seen and clicked; the middle one is at its true place."],
    ["The pictograms", "The share of adults is drawn as ten figures, each a tenth of the period's adults. The counts of carious teeth are drawn on a mouth of 28, a full adult set without wisdom teeth: the record's adults had on average 17 to 20 teeth that could be scored, so the mouths show how many teeth were carious, not what share of the scored teeth that was."],
    ["One reference population", "Every rate is age-standardised to the pooled age distribution of all " + n.toLocaleString("en") + " adults (18–69), so no era reads higher merely because more of its people lived long enough to accumulate decay. It moves each value by at most 1.2 points and changes no ordering."],
    ["The drawing", "The outlines are grown from a drawing of a lower first molar's cusps and fissures and carved into the 3D molar's chewing surface, in three depths (the lesion, its cavitated body and its core) that are illustrative and exaggerated so the decay reads: drawn, not measured. The shaded share of the crown is the data; how deep it cuts is not. Era spans are the 10th to 90th percentile of site dates, so they overlap. A ‘hinge’ marks an event that changed what the tooth could record rather than what it recorded."],
    ["Source", "Global History of Health Project, European module, decoded for this project. Events and the ‘why’ text are context from the team's timeline, not data."]];
  const HTML = "<div class='cp'>" +
    "<div class='cp-read'><p class='cp-era'></p><p class='cp-yrs'></p>" +
    "<div class='cp-stats'>" +
    "<div><svg class='pg pg-people' role='img'></svg><div><b class='cp-s1'></b><span>of adults carried caries <i>each figure is 10% of adults</i></span></div></div>" +
    "<div><svg class='pg pg-teeth' role='img'></svg><div><b class='cp-s2'></b><span>carious teeth, on average, in an affected mouth <i>of 28</i></span></div></div>" +
    "<div><svg class='pg pg-teeth' role='img'></svg><div><b class='cp-s3'></b><span>or more, in the worst-affected tenth of affected mouths <i>of 28</i></span></div></div></div>" +
    "<p class='cp-bh'>Teeth carious, per person</p><div class='cp-bar'></div><div class='cp-ax' aria-hidden='true'><span style='left:0%'>0%</span><span style='left:25%'>25%</span><span style='left:50%'>50%</span><span style='left:75%'>75%</span><span style='left:100%'>100%</span></div><p class='cp-axt'>share of all adults in the period</p><div class='cp-keys'></div></div>" +
    "<div class='cp-detail' hidden><div class='cp-dtop'><button class='link cp-close' type='button'>Close</button></div>" +
    "<p class='cp-h4'>What was happening</p><div class='cp-ev'></div><p class='cp-h4'>Why it may have reached the teeth</p><p class='cp-why'></p>" +
    "<p class='cp-h4'>All six eras</p><div class='cp-cmp'></div></div>" +
    "<div class='cp-all' hidden><p class='cp-allh'>All six eras</p><p class='cp-ally'></p>" +
    "<div class='cp-allsev'><div class='cp-sevall'></div><div class='cp-keys cp-keys-all'></div></div>" +
    "<div class='cp-allage' hidden><div class='cp-agech'></div><p class='cp-agenote'></p></div>" +
    "<button type='button' class='cp-agebtn' aria-pressed='false'>Break down by age</button></div>" +
    "</div>";

  // ---- the three figures as pictograms: people for the share of adults (ten figures, each 10%), a 28-tooth mouth for
  // the counts of carious teeth. An icon is filled as far as the value reaches into it, so 3.2 shows three teeth and a
  // fifth of a fourth. The mouth is schematic (a full adult set without wisdom teeth); see the notes.
  const PERSON = "M6,0a3,3 0 1 1 0,6a3,3 0 1 1 0,-6zM3.2,7.2h5.6a2.2,2.2 0 0 1 2.2,2.2v8.2h-2.1v-6.1h-.5v18.5h-2.5v-10.3h-.8v10.3h-2.5v-18.5h-.5v6.1h-2.1v-8.2a2.2,2.2 0 0 1 2.2,-2.2z";
  const TOOTH = "M4.2,1.2c1.6,0 2.4,.9 3.8,.9s2.2,-.9 3.8,-.9c2.4,0 3.7,2.1 3.4,4.7c-.3,2.4 -1.3,3.8 -1.7,6c-.4,2.3 -.5,5.6 -2,5.6c-1.4,0 -1.5,-3.1 -2,-4.7c-.3,-1.1 -1,-1.1 -1.3,0c-.5,1.6 -.6,4.7 -2,4.7c-1.5,0 -1.6,-3.3 -2,-5.6c-.4,-2.2 -1.4,-3.6 -1.7,-6c-.3,-2.6 1,-4.7 3.4,-4.7z";
  let pgN = 0;
  function pictos(svg, n, cols, kind) {
    const NS = "http://www.w3.org/2000/svg", P = kind === "person" ? { d: PERSON, w: 12, h: 30, gx: 3, gy: 4 } : { d: TOOTH, w: 16, h: 18, gx: 3, gy: 3 };
    const rows = Math.ceil(n / cols), W = cols * (P.w + P.gx) - P.gx, H = rows * (P.h + P.gy) - P.gy, id = "pg" + (++pgN) + "_";
    svg.setAttribute("viewBox", "-1 -1 " + (W + 2) + " " + (H + 2)); svg.setAttribute("preserveAspectRatio", "xMinYMax meet");   // all three sit on one baseline
    const mk = (tag, a, par) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); par.appendChild(e); return e; };
    const defs = mk("defs", {}, svg), clips = [];
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * (P.w + P.gx), y = Math.floor(i / cols) * (P.h + P.gy), g = mk("g", { transform: "translate(" + x + "," + y + ")" }, svg);
      const cp = mk("clipPath", { id: id + i }, defs); clips.push(mk("rect", { x: -1, y: -1, width: 0, height: P.h + 2 }, cp));
      mk("path", { d: P.d, class: "pg-e " + kind }, g); mk("path", { d: P.d, class: "pg-f", "clip-path": "url(#" + id + i + ")" }, g);
    }
    return (v, label) => { clips.forEach((r, i) => r.setAttribute("width", (P.w + 2) * Math.max(0, Math.min(1, v - i)))); svg.setAttribute("aria-label", label); };
  }

  // The page draws the lesion on the 3D molar; this module runs the eras and the readout beside it. opt.onFrame(state)
  // is called whenever the drawing changes: { lesion: { out, mid, inn } (radial profiles of K radii about the crown's
  // centre, in the units of crown), upto (the last era whose outline is left behind), sel (the era being read) }. The returned api has pick(i),
  // ring(i) (era i's outline), replay(), crown, K and N.
  function mount(el, data, opt) {
    opt = opt || {};
    if (!el || !data || !data.eras) return null;
    if (el.dataset.mounted && el._cp) return el._cp;   // resize redraws must not restart the run
    el.dataset.mounted = "1";
    const PD = data.eras, N = PD.length;
    geometry(PD);
    const T = TEETH[0];
    el.innerHTML = HTML;
    const q = s => el.querySelector(s);
    const span = d => "c. " + d.lo + "–" + d.hi + " CE";
    let lesion = null, upto = -1, sel = N - 1;
    const emit = () => { if (opt.onFrame && el.isConnected) opt.onFrame({ lesion, upto, sel }); };

    function paintShape(a, b, u) {
      const A = a[0], B = b[0], mix = (p, r) => { const o = new Float64Array(K); for (let k = 0; k < K; k++) o[k] = p[k] + (r[k] - p[k]) * u; return o; };
      lesion = { out: mix(A.out, B.out), mid: mix(A.mid, B.mid), inn: mix(A.inn, B.inn) };
      emit();
    }
    // the outlines each finished era leaves behind
    function setGhosts(n) { upto = n; emit(); }

    // ---- the readout: era, three figures, one severity bar
    const bar = q(".cp-bar"), segs = data.bands.map((b, j) => {
      const s = document.createElement("span"); s.style.background = BAND[j]; s.style.color = j >= 2 ? "#fbf8f1" : "#1a1a18"; bar.appendChild(s);
      q(".cp-keys").insertAdjacentHTML("beforeend", "<span><i style='background:" + BAND[j] + "'></i>" + esc(b) + "</span>");
      return s;
    });
    const pgs = el.querySelectorAll(".pg"), people = pictos(pgs[0], 10, 5, "person"), avg = pictos(pgs[1], 28, 7, "tooth"), worst = pictos(pgs[2], 28, 7, "tooth");
    function readout(i) {
      const d = PD[i]; sel = i; q(".cp-read").hidden = false; q(".cp-all").hidden = true;
      q(".cp-era").textContent = d.p;
      q(".cp-yrs").textContent = span(d) + " · n = " + d.n.toLocaleString("en") + " adults · crude rate " + d.crude.toFixed(1) + "% · mean age at death " + d.age;
      q(".cp-s1").innerHTML = d.std.toFixed(1) + "<small>%</small>"; q(".cp-s2").textContent = d.aff; q(".cp-s3").textContent = d.p90;
      people(d.std / 10, d.std.toFixed(1) + "% of adults carried caries"); avg(d.aff, d.aff + " of 28 teeth carious, on average, in an affected mouth"); worst(d.p90, d.p90 + " or more of 28 teeth carious in the worst-affected tenth");
      d.sev.forEach((v, j) => { segs[j].style.width = v + "%"; segs[j].textContent = v >= 9 ? Math.round(v) : ""; });
      emit();
    }
    function openDetail(i) {
      const d = PD[i], C = CONTEXT[d.p] || { why: "", ev: [] };
      q(".cp-why").innerHTML = C.why;                // trusted copy from CONTEXT above (it carries <b>)
      q(".cp-ev").innerHTML = C.ev.map(e => "<div class='cp-e'><span class='y'>" + esc(e[0]) + "</span><div><p class='t'>" + esc(e[1]) + (e[3] ? "<span class='tag'>hinge</span>" : "") + "</p><p class='m'>" + esc(e[2]) + "</p></div></div>").join("");
      q(".cp-cmp").innerHTML = PD.map((r, j) => "<button type='button' class='cp-row" + (j === i ? " on" : "") + "' data-i='" + j + "'><span class='nm'>" + esc(r.p) + "</span><span class='cb'>" +
        r.sev.map((v, k) => "<span style='width:" + v + "%;background:" + BAND[k] + "'></span>").join("") + "</span><span class='v'>" + r.std.toFixed(1) + "%</span></button>").join("");
      q(".cp-cmp").querySelectorAll(".cp-row").forEach(r => r.addEventListener("click", () => pick(+r.dataset.i)));
      q(".cp-detail").hidden = false;
    }

    // ---- motion: one live lesion, interpolated between eras
    let raf = null, timer = null, cur = N - 1, ready = false;
    const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const halt = () => { if (raf) cancelAnimationFrame(raf); if (timer) clearTimeout(timer); raf = timer = null; };
    function animate(from, to, ms, done) {
      const t0 = performance.now();
      const tick = now => {
        if (!el.isConnected) { halt(); return; }     // the section was closed
        const u = Math.min(1, (now - t0) / ms);
        paintShape(from, to, ease(u));
        if (u < 1) raf = requestAnimationFrame(tick); else { raf = null; if (done) done(); }
      };
      raf = requestAnimationFrame(tick);
    }
    function pick(i) {
      if (!ready) return;
      if (i === sel) { all(); return; }   // the era already open, picked again: all six eras
      halt();
      const from = cur < 0 ? union() : PROF[cur] || BLANK; cur = i;
      readout(i); setGhosts(N - 1);
      if (REDUCED) { paintShape(era(i), era(i), 1); openDetail(i); }
      else animate(from, era(i), 820, () => openDetail(i));
    }
    function run() {
      halt();
      q(".cp-detail").hidden = true; q(".cp-all").hidden = true; q(".cp-read").hidden = false;
      setGhosts(-1); paintShape(BLANK, BLANK, 0);
      let i = 0;
      const step = () => {
        if (!el.isConnected) { halt(); return; }
        readout(i);
        animate(i === 0 ? BLANK : era(i - 1), era(i), 1150, () => {
          setGhosts(i); cur = i; i++;
          if (i < N) timer = setTimeout(step, 520);
          else timer = null;
        });
      };
      timer = setTimeout(step, 300);
    }
    q(".cp-close").addEventListener("click", () => { q(".cp-detail").hidden = true; });

    // ---- all six eras at once: the team's severity figure (C2B) as one stacked bar per era, and, behind a button, their
    // caries-by-age figure (C1B) as one line per era. The eras carry the timeline's colours (opt.colors); a click on an
    // era's bar, line or label opens it. The molar shows every era's outline and no single lesion.
    const COLS = opt.colors || PD.map(() => "#1a1a18"), byAge = opt.byAge, AGES = opt.ages || [];
    let ageOn = false;
    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (W, H) => { const v = document.createElementNS(NS, "svg"); v.setAttribute("viewBox", "0 0 " + W + " " + H); v.setAttribute("width", W); v.setAttribute("height", H); return v; };
    const keyAct = (node, i) => { node.setAttribute("tabindex", 0); node.setAttribute("role", "button");
      node.addEventListener("click", () => pick(i)); node.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(i); } }); };
    q(".cp-keys-all").innerHTML = data.bands.map((b, j) => "<span><i style='background:" + BAND[j] + "'></i>" + esc(b) + "</span>").join("");
    function drawSev() {
      const box = q(".cp-sevall"), W = Math.max(280, box.clientWidth), LW = Math.min(150, W * 0.3), NW = 52, RH = 26, G = 9, top = 4;
      const H = top + N * (RH + G) + 38, x = v => LW + (W - LW - NW) * v / 100, v = svgEl(W, H);
      let h = "";
      PD.forEach((d, i) => {
        const y = top + i * (RH + G);
        h += "<g class='sv-row' data-i='" + i + "' aria-label='" + esc(d.p) + ": " + d.sev.map((s, j) => s + "% " + data.bands[j]).join(", ") + "'>" +
          "<rect class='sv-sw' x='0' y='" + (y + RH / 2 - 5) + "' width='10' height='10' fill='" + COLS[i] + "'/>" +
          "<text class='sv-nm' x='16' y='" + (y + RH / 2 + 4) + "'>" + esc(d.p) + "</text>";
        let l = 0;
        d.sev.forEach((s, j) => {
          h += "<rect x='" + x(l) + "' y='" + y + "' width='" + Math.max(0, x(l + s) - x(l)) + "' height='" + RH + "' fill='" + BAND[j] + "'/>";
          if (s >= 6) h += "<text class='sv-v' x='" + (x(l) + x(l + s)) / 2 + "' y='" + (y + RH / 2 + 3.5) + "' fill='" + (j >= 2 ? "#fbf8f1" : "#1a1a18") + "'>" + Math.round(s) + "</text>";
          l += s;
        });
        h += "<rect class='sv-frame' x='" + x(0) + "' y='" + y + "' width='" + (x(100) - x(0)) + "' height='" + RH + "' stroke='" + COLS[i] + "'/>" +
          "<text class='sv-n' x='" + (W - NW + 8) + "' y='" + (y + RH / 2 + 3.5) + "'>n = " + d.n.toLocaleString("en") + "</text></g>";
      });
      const yb = top + N * (RH + G) + 2;
      [0, 25, 50, 75, 100].forEach(t => { h += "<line class='sv-tk' x1='" + x(t) + "' x2='" + x(t) + "' y1='" + (yb - 2) + "' y2='" + (yb + 2) + "'/><text class='sv-ax' x='" + x(t) + "' y='" + (yb + 12) + "'>" + t + "%</text>"; });
      h += "<text class='sv-axt' x='" + (x(0) + x(100)) / 2 + "' y='" + (yb + 30) + "'>share of all adults in the period</text>";
      v.innerHTML = h; box.replaceChildren(v);
      v.querySelectorAll(".sv-row").forEach(g => keyAct(g, +g.dataset.i));
    }
    function drawAge() {
      const box = q(".cp-agech"), W = Math.max(280, box.clientWidth), short = W < 440, RW = short ? 96 : 150,   // narrow: the lines end in short names
        L = 38, T = 10, B = 40, H = Math.round(Math.min(340, Math.max(240, W * 0.62)));
      const X = [21.5, 27.5, 32.5, 37.5, 42.5, 47.5, 55, 65];   // the age bands' midpoints, spaced as in the team's figure
      const vals = PD.map(d => AGES.map(a => byAge[d.p] && byAge[d.p][a] ? byAge[d.p][a][0] : null));
      const flat = vals.flat().filter(v => v != null), y0 = Math.floor(Math.min(...flat) / 10) * 10, y1 = Math.ceil(Math.max(...flat) / 10) * 10;
      const sx = t => L + (W - L - RW) * (t - X[0]) / (X[X.length - 1] - X[0]), sy = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
      const v = svgEl(W, H); let h = "";
      for (let g = y0; g <= y1; g += 10) h += "<line class='ag-grid' x1='" + L + "' x2='" + (W - RW) + "' y1='" + sy(g) + "' y2='" + sy(g) + "'/><text class='ag-ax' x='" + (L - 6) + "' y='" + (sy(g) + 3) + "' text-anchor='end'>" + g + "%</text>";
      AGES.forEach((a, k) => { h += "<text class='ag-ax' x='" + sx(X[k]) + "' y='" + (H - B + 16) + "' text-anchor='middle'>" + esc(a) + "</text>"; });
      h += "<text class='ag-lab' x='" + ((L + W - RW) / 2) + "' y='" + (H - 6) + "' text-anchor='middle'>age at death</text>";
      // end labels, spread so none overlap
      const ends = vals.map((r, i) => ({ i, y: sy(r[r.length - 1]) })).sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 15);
      const endY = []; ends.forEach(e => { endY[e.i] = e.y; });
      vals.forEach((r, i) => {
        const pts = r.map((val, k) => val == null ? null : [sx(X[k]), sy(val)]).filter(Boolean), last = pts[pts.length - 1];
        h += "<g class='ag-ln' data-i='" + i + "' style='--c:" + COLS[i] + "' aria-label='" + esc(PD[i].p) + ": " + AGES.map((a, k) => esc(a) + " " + r[k] + "%").join(", ") + "'>" +
          "<path class='ag-hit' d='M" + pts.map(p => p.join(",")).join("L") + "'/><path class='ag-path' d='M" + pts.map(p => p.join(",")).join("L") + "'/>" +
          pts.map((p, k) => "<circle cx='" + p[0] + "' cy='" + p[1] + "' r='3'><title>" + esc(PD[i].p) + ", " + esc(AGES[k]) + ": " + r[k] + "% (n = " + byAge[PD[i].p][AGES[k]][1] + ")</title></circle>").join("") +
          "<line class='ag-lead' x1='" + (last[0] + 4) + "' y1='" + last[1] + "' x2='" + (last[0] + 14) + "' y2='" + endY[i] + "'/>" +
          "<text class='ag-end' x='" + (last[0] + 18) + "' y='" + (endY[i] + 4) + "'>" + esc(short ? PD[i].p.replace("Pre-medieval", "Pre-med.").replace(" medieval", " med.").replace(" modern", " mod.") : PD[i].p) + " " + Math.round(r[r.length - 1]) + "%</text></g>";
      });
      v.innerHTML = h; box.replaceChildren(v);
      v.querySelectorAll(".ag-ln").forEach(g => { keyAct(g, +g.dataset.i);
        g.addEventListener("pointerenter", () => { v.classList.add("hov"); g.classList.add("hot"); });
        g.addEventListener("pointerleave", () => { v.classList.remove("hov"); g.classList.remove("hot"); }); });
      // the young end, the comparison the team's figure makes: computed from the same cells
      const A0 = AGES[0], hm = byAge["High medieval"] && byAge["High medieval"][A0], ind = byAge["Industrial"] && byAge["Industrial"][A0];
      q(".cp-agenote").textContent = hm && ind ? "At " + A0 + ", " + Math.round(100 - hm[0]) + "% of high-medieval young adults still had no caries at all; by the industrial era only " + Math.round(100 - ind[0]) + "% did. Every point has at least " + d3min(byAge) + " adults." : "";
    }
    const d3min = B => Math.min(...Object.values(B).flatMap(r => Object.values(r).map(c => c[1])));
    function drawAll() { if (ageOn) drawAge(); else drawSev(); }
    function setAge(on) {
      ageOn = on; q(".cp-allsev").hidden = on; q(".cp-allage").hidden = !on;
      const b = q(".cp-agebtn"); b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Back to severity" : "Break down by age";
      q(".cp-ally").textContent = on ? "Share of adults with at least one carious tooth, by age at death" : "Every adult in the record, by how many of their own teeth were carious";
      drawAll();
    }
    q(".cp-agebtn").addEventListener("click", () => setAge(!ageOn));
    if (!byAge) q(".cp-agebtn").hidden = true;
    // all six lesions overlapped: at each radius the furthest any era reached, so the molar carries every era's decay at
    // once and the page lays each era's outline over it
    let UNION = null;
    const union = () => UNION || (UNION = era(0).map((_, t) => {
      const u = key => { const o = new Float64Array(K); for (let k = 0; k < K; k++) o[k] = Math.max(...PD.map((d, i) => era(i)[t][key][k])); return o; };
      return { out: u("out"), mid: u("mid"), inn: u("inn") };
    }));
    function all() {
      if (!ready || (sel < 0 && !timer && !raf)) return;
      halt(); sel = -1;
      const from = PROF[cur] || BLANK; cur = -1;
      q(".cp-read").hidden = true; q(".cp-detail").hidden = true; q(".cp-all").hidden = false; setAge(ageOn);
      setGhosts(N - 1);
      if (REDUCED) paintShape(union(), union(), 1); else animate(from, union(), 600);
    }
    if (window.ResizeObserver) { let w0 = 0; new ResizeObserver(() => { const w = el.clientWidth; if (w !== w0 && !q(".cp-all").hidden) drawAll(); w0 = w; }).observe(el); }

    // first paint is already a finished figure (the last era), so a thumbnail is never an empty tooth; the other eras are
    // solved one per task after it, then their outlines appear and the run starts
    readout(N - 1); setGhosts(-1); paintShape(era(N - 1), era(N - 1), 1);
    let next = 0;
    const prep = () => {
      if (!el.isConnected) return;
      if (next < N - 1) { era(next++); timer = setTimeout(prep, 0); return; }
      timer = null; ready = true; setGhosts(N - 1);
      if (!REDUCED) run();
    };
    timer = setTimeout(prep, 0);
    // replay(): the plate's Replay button runs the eras again
    const api = { pick, all, ring: i => era(i)[0].out, crown: T.crown, K, N, replay: () => { if (!ready) return; if (REDUCED) pick(N - 1); else run(); } };
    el._cp = api;
    return api;
  }

  // for checks in the console: shaded share of each crown per era, and how close the lesion is to the crown's shape
  function check(data) {
    geometry(data.eras);
    const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let c = 0, va = 0, vb = 0; for (let k = 0; k < n; k++) { c += (a[k] - ma) * (b[k] - mb); va += (a[k] - ma) ** 2; vb += (b[k] - mb) ** 2; } return c / Math.sqrt(va * vb); };
    return data.eras.map((d, i) => ({ era: d.p, target: +frac(d.std).toFixed(4), shaded: TEETH.map(T => +(areaOf(T, era(i)[TEETH.indexOf(T)].out) / T.area).toFixed(4)), corr: TEETH.map((T, ti) => +corr(Array.from(era(i)[ti].out), Array.from(T.crown)).toFixed(3)) }));
  }
  // the figure's notes, for the page to set under its caption: one sentence-led line each
  const notes = data => NOTES(data.n).map(n => n[0] + ". " + n[1]);
  window.CariesPlate = { mount, check, notes };
})();
