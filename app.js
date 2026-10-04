/* The Tooth Untold: storyline build (v6).
   Intro: engraved jaw, closed, swings open on its hinge -> four teeth line up -> first molar and canine close in -> 2D becomes a 3D point cloud.
   Overview: the two composite teeth, cut open in their jaw, play through 300-1900 CE with no timeline; marks arrive as each
   century's records come in. Then the radial timeline (radial.js, data in radial-data.js): four records leave a point
   between the two teeth; a name opens that record's section. Everything after the intro is set as a scientific
   journal: running heads, plates and numbered figures with captions, page numbers.
   Every number comes from data/data.js; nothing is invented. */
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
  const COMMON = {
    "Yersinia pestis": "plague", "Mycobacterium leprae": "leprosy", "Hepatitis B virus": "hepatitis B", "Variola virus": "smallpox",
    "Treponema pallidum": "treponemal disease", "Plasmodium falciparum": "malaria", "Plasmodium vivax": "malaria", "Plasmodium malariae": "malaria",
    "Salmonella enterica": "Salmonella", "Borrelia recurrentis": "relapsing fever", "Clostridium tetani": "tetanus bacterium", "Parvovirus B19": "parvovirus B19",
    "Human alphaherpesvirus 1": "herpes simplex", "Streptococcus pneumoniae": "pneumococcus", "Erysipelothrix rhusiopathiae": "Erysipelothrix",
    "Yersinia enterocolitica": "Yersinia enterocolitica", "Haemophilus influenzae": "Haemophilus influenzae", "Methanobrevibacter oralis": "an oral archaeon", "Tannerella forsythia": "a gum-disease bacterium",
  };
  const common = n => COMMON[n] || n;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // The overview plays 300 -> 1900 at this many years per second, then the radial timeline follows.
  const SPEED = 160;
  // The four sections, one per record on the radial timeline (same keys as radial-data.js). Their charts come from
  // data/layers.js (see CHARTS below). The events are PLACEHOLDERS until their dates and pictures arrive: nothing
  // in them is data. Event pictures: save images/event-<name>.jpg (e.g. event-justinian.jpg) and bundle.py embeds it.
  //   dek    the line under the section title    plate  the end of the plate caption: what the teeth show here
  //   view   how each tooth is drawn on the section's plate, chosen for what the record is about:
  //          "cut"     a cross-section, for what sits inside the tooth (decay reaching in, DNA, lead in the enamel)
  //          "whole"   the whole tooth from the side, out of its jaw like an atlas specimen, for marks on its
  //                    outer surface (stress lines) or a tooth that carries none
  //          "aerial"  the crown from above, out of its jaw, for the chewing surface (wear)
  const LAYERS = [
    { key: "caries", n: 1, name: "Caries", dek: "Decay in adults of six periods, read from the crown",
      view: { molar: "cut", canine: "cut" },
      plate: "cut open to show how far decay reaches into the tooth; the cavity grows with the share of teeth that were carious.",
      human: "Human × caries correlations across time",
      events: [] },   // the caries plate carries each period's events itself
    { key: "pathogens", n: 2, name: "Pathogens", dek: "Disease DNA recovered from European teeth, 100–1800 CE",
      view: { molar: "cut", canine: "cut" },
      plate: "cut open, because pathogen DNA is recovered from inside the tooth: one mark per genome, placed for illustration, and the tartar some were found in.",
      human: "Human × pathogen correlations across time",
      events: [{ label: "Plague of Justinian", when: "541–750s", img: "event-justinian" }, { label: "The Black Plague", when: "Year–Year", img: "event-blackdeath" }] },
    { key: "wear", n: 3, name: "Wear and LEH", dek: "Chewing wear and childhood stress lines in adults of six periods",
      view: { molar: "whole", canine: "whole" }, byPeriod: true,
      plate: "both whole, from the side, stepping through the six periods: the coloured layers on the molar are the crown that chewing wore away by the period's 60+ age band, from the layer gone by 18–24 (blue) to the one gone by 60+ (orange), as in Fig. 3.2; the grooves around the canine are stress lines (the shares of adults with one and with two or more).",
      human: "Human × wear correlations across time",
      events: [{ label: "Roller mill invented", when: "Year–Year", img: "event-rollermill" }] },
    { key: "metals", n: 4, name: "Metals", dek: "Lead and other metals in childhood enamel, from the Neolithic to the 20th century",
      view: { molar: "cut", canine: "cut" },
      plate: "cut open, because lead is locked inside the enamel as it forms, and with the particles held in the tartar.",
      human: "Human × metal correlations across time",
      events: [{ label: "Industrial Revolution", when: "Year–Year", img: "event-industrial" }] },
    { key: "interventions", n: 5, name: "Artificial interventions", dek: "Teeth somebody repaired, from medieval graves to the 2009 dental survey",
      view: { molar: "whole", canine: "whole" },
      plate: () => "whole, as an examiner sees them, with no repairs drawn: the archaeological samples hold " + LD.interventions.marks.filter(m => m.series === "archaeological").map(m => d3.format(".1f")(m.per100)).join(", ") + " repaired teeth per 100 people, too few to place on a composite tooth.",
      human: "Human × intervention correlations across time",
      events: [{ label: "Amalgam fillings", when: "Year–Year", img: "event-amalgam" }] },
  ];
  const layerOf = k => LAYERS.find(L => L.key === k);

  // ------------------------------------------------------------------ records
  const all = [].concat(D.pathogens, D.metagenomes, D.metals, D.sites);
  all.forEach(r => { r.loc = r.lat != null ? (+r.lat).toFixed(1) + "," + (+r.lon).toFixed(1) : null; });

  // ------------------------------------------------------------------ state
  // scene: intro | main (the overview) | radial (the radial timeline) | layer (one layer's dashboard); show: which marks the teeth carry
  const S = { t: T_MIN, region: "all", jaw: "man", scene: "intro", layer: null, show: "all", playing: false };
  const everything = () => S.t > T_LAST;

  // ------------------------------------------------------------------ helpers
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isBin = n => /^[A-Z][a-z]+ [a-z]+/.test(n) && !/virus/i.test(n);
  const nameHTML = n => isBin(n) ? "<i>" + esc(n) + "</i>" : esc(n);
  const dateStr = r => r.early === r.late ? r.early + " CE" : r.early + "–" + r.late + " CE";
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
  // The canine's stress lines in the Wear and LEH section, after Schultz's standard and exaggerated: one groove as strong
  // as the share with any line, three more as the share with two or more, each full at the record's highest share.
  function lehBands(v) {
    const E = LD && LD.morphology && LD.morphology.leh_canine && LD.morphology.leh_canine.eras; if (!E) return [v.any / 100, v.multi / 100];
    const a = clamp(v.any / d3.max(E, e => e.pct), 0, 1), m = clamp(v.multi / d3.max(E, e => e.comp[2]), 0, 1);
    return [a, m, m * 0.85, m * 0.7];
  }
  // the renderer's inputs for one tooth; S.show keeps only one layer's traces
  function paramsFor(T) {
    const SH = T.R.st.S, top = SH.top, L = S.show, wearOn = L === "all" || L === "wear", decay = L === "all" || L === "caries";
    // in the Wear and LEH section the teeth step through the periods (S.wl, from wearSeq()), not the pooled composite
    const wl = S.scene === "layer" && S.layer === "wear" ? S.wl : null;
    const wear = wearOn && T.type === "molar" ? (wl ? wl.wear : G.wear) : null, leh = wearOn && T.type === "canine" ? (wl ? lehBands(wl) : G.leh) : null;
    const wearY = wear != null ? top - (wear - 1) / 7 * 0.55 * top : top + 0.02;
    const cr = decay && G.caries != null ? (0.015 + 0.7 * G.caries) * (SH.B[0] / 0.5) : 0;
    const cp = SH.cariesAt === "occlusal" ? [0.06, Math.min(wearY, SH.grooveY) - 0.005, -0.03] : [SH.B[0] * 0.97, 0.44 * top, -0.13];
    const pb = (L === "all" || L === "metals") && G.pb != null ? clamp(Math.log10(G.pb / 0.05) / Math.log10(10 / 0.05), 0, 1) : 0;
    const calc = G.calcRecs.some(r => L === "all" || (L === "pathogens" && r.kind !== "metal") || (L === "metals" && r.kind === "metal")) ? 1 : 0;
    const wearAmp = wl && wear != null ? 0.035 * clamp((wear - 1) / 4, 0, 1) : 0, capTint = wl && T.type === "molar" ? [0.2, 0.36, 0.85, 0.72] : [0, 0, 0, 0];
    const strata = wl && T.type === "molar" && wl.strata ? wl.strata : null;
    return { wearY, wearAmp, capTint, capS: strata && strata.s, capC: strata && strata.c, caries: [cp[0], cp[1], cp[2], cr], leh: leh || [0, 0], lehY: leh && leh.length > 2 ? [0.44, 0.31, 0.56, 0.66].map(f => f * top) : [0.36 * top, 0.54 * top], calc, pb, cutX: viewOf(T) === "cut" ? 0 : 5, jaw: viewOf(T) === "cut" };
  }
  // the view a tooth is drawn in: cut everywhere except on a section's plate, where the section decides
  // The Wear and LEH section adds four views (S.viewMode, the buttons under its plate): top, side (its default),
  // section and perspective.
  const VIEWMODE = { top: "aerial", side: "whole", section: "cut", perspective: "whole" };
  const viewOf = T => !(S.scene === "layer" && layerOf(S.layer)) ? "cut" : S.layer === "wear" && S.viewMode ? VIEWMODE[S.viewMode] : layerOf(S.layer).view[T.key];
  // camera and framing for each view; "aerial" looks down on the crown and frames the jaw's footprint
  function frameView() {
    if (!GL) return;
    refit();
    TEETH.forEach(T => {
      const v = viewOf(T), SH = T.R.st.S, cam = T.R.st.cam;
      if (v === "aerial") {
        const r = T.el.getBoundingClientRect(), half = Math.max(-SH.boxMin[0], SH.boxMax[0], -SH.boxMin[2], SH.boxMax[2]) * 0.95;
        Object.assign(cam, { yaw: 0.35, pitch: 1.36, target: [0, SH.top * 0.8, 0], dist: half * cam.focal / Math.min(0.8, 0.8 * r.width / Math.max(1, r.height)) });
      } else if (v === "whole") Object.assign(cam, { yaw: T.key === "canine" ? 1.0 : 0.4, pitch: 0.12 });   // the canine turned to show its cusp in profile
      if (S.layer === "wear" && S.viewMode === "perspective") Object.assign(cam, { yaw: VIEW.yaw, pitch: 0.38 });
    });
  }
  const NEUTRAL = SH => ({ wearY: SH.top + 0.02, caries: [0, 0, 0, 0], leh: [0, 0], lehY: [0, 0], calc: 0, pb: 0, cutX: 5, jaw: false });
  function insideSolid(T, p, m) {
    const P = T.R.st.P, d = Math.max(T.R.outerJS(p), p[1] - window.ToothGL.wearAt(P, p[0], p[2]));
    if (P.caries[3] > 0 && Math.hypot(p[0] - P.caries[0], p[1] - P.caries[1], p[2] - P.caries[2]) < P.caries[3] + 0.03) return false;
    return d < -m;
  }

  // particles: one mark per record, split between the two teeth (tooth type is not recorded)
  const showsRec = r => S.show === "all" || (S.show === "pathogens" && r.kind === "pathogen") || (S.show === "metals" && r.kind === "metal");
  function updateParticles(animate) {
    if (!GL) return;
    const now = performance.now(), dense = everything();
    TEETH.forEach((T, ti) => {
      const want = new Map();
      G.path.forEach(r => { if (showsRec(r) && hash(r.id) % 2 === ti) want.set(r.id, r); });
      G.calcRecs.forEach(r => { if (r.kind !== "metagenome" && showsRec(r) && hash(r.id + "c") % 2 === ti) want.set(r.id, r); });
      T.parts.forEach((q, id) => { if (!want.has(id) && !q.dead) q.dead = now; });
      const placed = [...T.parts.values()].filter(q => !q.dead && q.face).map(q => q.p);
      let k = 0;
      [...want.values()].sort((x, y) => hash(x.id) - hash(y.id)).forEach(r => {
        const had = T.parts.get(r.id); if (had && !had.dead) return;
        const q = makeParticle(T, r, placed, dense); if (!q) return;
        const fast = S.playing;   // the overview moves quickly, so marks travel faster there
        q.born = animate && !STILL ? now + Math.min(k++ * (fast ? 25 : 55), fast ? 450 : 1100) : -1e9; q.dur = (fast ? 800 : 1500) + (hash(r.id) % (fast ? 250 : 400));
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
  const liveTeeth = () => S.scene === "main" || S.scene === "layer";
  function toPair(T, p) { const s = T.R.project(p); return [s.x + T.el.offsetLeft, s.y + T.el.offsetTop]; }

  const gLabels = ov.append("g"), gParts = ov.append("g");
  function drawParticles(now) {
    if (!GL || !liveTeeth()) { gParts.selectAll("*").remove(); return false; }
    let busy = false;
    const items = [], trails = [];
    TEETH.forEach(T => {
      const b = T.R.st.basis; if (!b) return;
      T.parts.forEach((q, id) => {
        let op = 1;
        if (q.dead) { op = 1 - (now - q.dead) / 400; if (op <= 0) { T.parts.delete(id); return; } busy = true; }
        if (q.face && b.ro[2] <= 0) return;
        if (!q.face && q.n[0] * b.ro[0] + q.n[2] * b.ro[2] < 0.2) return;
        const k = (now - q.born) / q.dur;
        if (k < 0) { busy = true; return; }
        const e = ease(Math.min(k, 1));
        let pos = k >= 1 ? q.p : along(q.path, e);
        const xy = toPair(T, pos);
        if (k < 1.5) {
          busy = true;
          const pts = d3.range(0, 25).map(i => toPair(T, along(q.path, e * i / 24)));
          trails.push({ id: T.key + id, pts, cat: q.cat, op: 0.55 * (k < 1 ? 1 : Math.max(0, 1 - (k - 1) * 2)) });
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
    return busy;
  }

  // in the Wear and LEH section's first act only the molar is shown
  const wlHidden = T => S.scene === "layer" && S.layer === "wear" && S.wlStage === "wear" && T.key === "canine";
  // the tooth names are the only lettering beside the teeth
  function drawLabels() {
    gLabels.selectAll("*").remove();
    if (!GL || !liveTeeth()) return;
    ov.attr("viewBox", "0 0 " + pairEl.clientWidth + " " + pairEl.clientHeight);
    if (S.scene === "layer") plateLabels();
    const y = nameY();
    if (S.layer === "wear" && !replayEl.hidden) replayEl.style.top = (pairEl.offsetTop + y - 11) + "px";   // level with the names' tops
    TEETH.filter(T => !wlHidden(T)).forEach(T => gLabels.append("text").attr("class", "tname").attr("x", toPair(T, [0, 0, 0])[0]).attr("y", y).attr("text-anchor", "middle").text(T.label));
  }
  // Atlas-style labels on a section's plate: the anatomy and the traces the section shows, each on a hairline
  // leader to the page margin (molar left, canine right). Illustration, not data.
  function plateLabels() {
    const W = pairEl.clientWidth, H = pairEl.clientHeight; if (W < 520) return;
    const sides = { molar: [], canine: [] }, L = S.layer;
    TEETH.forEach(T => {
      if (wlHidden(T)) return;
      const SH = T.R.st.S, P = T.R.st.P, top = SH.top, left = T.key === "molar", b = T.R.st.basis, v = viewOf(T);
      if (!b) return;
      const add = (t, p) => { if (p) sides[T.key].push({ t, xy: toPair(T, p) }); };
      // the visible surface point on the way from the camera to a target inside the tooth
      const seen = target => { const d = [target[0] - b.ro[0], target[1] - b.ro[1], target[2] - b.ro[2]], l = Math.hypot(...d), h = T.R.march(b.ro, d.map(x => x / l), l + 2); return h && h.p; };
      if (v === "cut") {
        if (b.ro[2] <= 0) return;
        const z = -0.002, solid = p => insideSolid(T, p, 0.008);
        const edge = (y, inset) => {   // the section's outer edge at height y on the label's side, moved inwards
          const step = left ? 0.005 : -0.005, x0 = (left ? SH.boxMin[0] : SH.boxMax[0]) - step * 10;
          for (let k = 0; k < 400; k++) { const x = x0 + step * k; if (solid([x, y, z])) return [x + (left ? inset : -inset), y, z]; }
          return null;
        };
        add("enamel", edge(Math.min(top, P.wearY) * 0.72, 0.02));
        add("dentine", edge(top * 0.2, 0.13));
        if (solid([SH.pulpC[0], SH.pulpC[1], z])) add("pulp", [SH.pulpC[0], SH.pulpC[1], z]);
        add("root", edge(SH.rootMin * 0.55, 0.03));
        const bone = [left ? SH.jawMin[0] + 0.12 : SH.jawMax[0] - 0.12, SH.bottom * 0.72, z]; if (!solid(bone)) add("bone", bone);
        if (L === "caries" && P.caries[3] > 0) add("cavity", P.caries[2] < -0.05 ? seen(P.caries.slice(0, 3)) : P.caries.slice(0, 3));   // a cavity behind the cut: point at where it shows
        if (L === "metals" && !left && P.pb > 0) add("lead in enamel", edge(top * 0.55, 0.015));
        if ((L === "metals" || L === "pathogens") && P.calc) { const h = T.R.march([left ? -2 : 2, 0.1, -0.2], [left ? 1 : -1, 0, 0], 3); if (h) add("tartar", h.p); }
      } else if (v === "aerial") {
        add(P.wearY < top ? "worn chewing surface" : "chewing surface", seen([0.02, top * 0.5, 0.02]));
        // where wear has gone through the enamel the cusps show dentine: label the cusp nearest the label side
        const cusp = P.wearY < top && SH.cusps && SH.cusps.slice().sort((a, b) => (left ? a[0] - b[0] : b[0] - a[0]))[0];
        if (cusp && cusp[1] > P.wearY) add("dentine worn through", seen([cusp[0], P.wearY, cusp[2]]));
        add("enamel", seen([(left ? -1 : 1) * SH.B[0] * 0.85, top * 0.7, SH.B[2] * 0.3]));
      } else {
        add("crown", seen([0, top * 0.8, 0]));
        if (L === "wear" && P.leh[0] > 0) add("stress lines", seen([0, P.lehY[0], 0]));
        add("neck", seen([0, 0.02, 0]));
        add("root", seen([0, SH.rootMin * 0.5, 0]));
      }
    });
    Object.entries(sides).forEach(([k, list]) => {
      const left = k === "molar", x = left ? 6 : W - 6;
      list.sort((a, b) => a.xy[1] - b.xy[1]);
      let last = -1e9; list.forEach(l => { l.y = Math.min(H - 8, Math.max(l.xy[1], last + 18, 24)); last = l.y; });
      list.forEach(l => {
        const t = gLabels.append("text").attr("class", "pl").attr("x", x).attr("y", l.y + 3.5).attr("text-anchor", left ? "start" : "end").text(l.t);
        const w = t.node().getComputedTextLength(), x0 = left ? x + w + 5 : x - w - 5;
        gLabels.append("path").attr("class", "pl-lead").attr("d", "M" + x0 + "," + l.y + "H" + (l.xy[0] + (left ? -10 : 10)) + "L" + l.xy[0] + "," + l.xy[1]);
        gLabels.append("circle").attr("class", "pl-dot").attr("cx", l.xy[0]).attr("cy", l.xy[1]).attr("r", 1.6);
      });
    });
  }
  // one baseline for both names, a little above the taller crown
  const nameY = () => Math.max(14, d3.min(TEETH, T => toPair(T, [0, T.R.st.S.top, 0])[1]) - 34);

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
    if (busy || walking) requestAnimationFrame(loop); else looping = false;
  }

  // drag to orbit both teeth together
  (function orbit() {
    let drag = null;
    TEETH.forEach(T => {
      T.el.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; try { T.el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
      T.el.addEventListener("pointermove", e => {
        if (!drag || !GL) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
        if (drag.moved < 5) return;
        TEETH.forEach(U => { U.R.st.cam.yaw -= dx * 0.009; U.R.st.cam.pitch = clamp(U.R.st.cam.pitch + dy * 0.007, -0.4, 1.45); });
        requestRender(true);
      });
      T.el.addEventListener("pointerup", () => { drag = null; });
      T.el.addEventListener("pointercancel", () => { drag = null; });
    });
  })();

  // ------------------------------------------------------------------ overview playback: 300 -> 1900, then all periods pooled, then the layers
  let holdUntil = 0, lastStep = 0, layersTimer = null;
  function play() {
    if (S.scene !== "main") return;
    if (everything()) setT(T_MIN);
    S.playing = true; lastStep = performance.now(); kick();
  }
  function pause() { S.playing = false; }
  function stepPlay(now) {
    if (!S.playing) return false;
    const dt = Math.min(0.1, (now - lastStep) / 1000); lastStep = now;
    if (now < holdUntil) return true;
    if (S.t >= T_LAST) { pause(); setT(T_ALL); layersTimer = setTimeout(() => { if (S.scene === "main") enterRadial(true); }, 1800); return false; }
    const t = Math.min(T_LAST, S.t + dt * SPEED);
    if (t >= T_LAST) holdUntil = now + 500;
    updateTime(t);
    return true;
  }
  function updateTime(t, force) {
    const cOld = S.t > T_LAST ? "all" : Math.floor((S.t - 250) / 100);
    S.t = t;
    G = composite(S.t);
    if (GL) TEETH.forEach(T => T.R.setParams(paramsFor(T)));
    const cNew = S.t > T_LAST ? "all" : Math.floor((S.t - 250) / 100);
    if (cOld !== cNew || force) updateParticles(S.scene === "main" && !REDUCED);
    readout(); requestRender(true);
  }
  function setT(t) { updateTime(clamp(t, T_MIN, T_ALL), true); requestRender(false); }
  const readout = () => { $("#when").textContent = everything() ? "300–1900 CE, all periods pooled" : Math.round(S.t) + " CE"; };

  // ------------------------------------------------------------------ the radial timeline
  const radialEl = $("#radial"), radialFoot = $("#radialFoot"), panelEl = $("#panel");
  const radialOpen = new Set();   // lines whose "how much was gathered" view is on, kept while moving around the page
  let radial = null;
  // Each tooth alone, whole and uncut, out of its jaw (the 3D model itself, as on the "whole" plates), drawn by its
  // own renderer and cropped to its silhouette. The white and black silhouettes let radial.js blur the lines inside
  // the teeth and mask them outside.
  const RADIAL_VIEW = { canine: { yaw: 1.0, pitch: 0.12 }, molar: { yaw: 0.4, pitch: 0.12 } };   // the canine shows its cusp in profile
  function radialTeeth() {
    const out = {};
    TEETH.forEach(T => {
      const R = T.R, SH = R.st.S, cam = Object.assign({}, R.st.cam);
      R.setParams(Object.assign(NEUTRAL(SH), { cutX: 5, jaw: false })); Object.assign(R.st.cam, RADIAL_VIEW[T.key]); R.st.quality = 1; R.render();
      const cw = T.canvas.width, ch = T.canvas.height, src = document.createElement("canvas");
      src.width = cw; src.height = ch;
      const sx = src.getContext("2d"); sx.drawImage(T.canvas, 0, 0);
      const px = sx.getImageData(0, 0, cw, ch).data;
      let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (px[(y * cw + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      Object.assign(R.st.cam, cam);
      if (x1 < 0) return;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const make = f => {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"), d = x.createImageData(w, h), o = d.data;
        for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
          const i = ((y + y0) * cw + xx + x0) * 4, j = (y * w + xx) * 4;
          f(o, j, px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, px[i + 3]);
        }
        x.putImageData(d, 0, 0);
        return c.toDataURL("image/png");
      };
      out[T.key] = {
        w, h,
        art: make((o, j, r, g, b, a) => {   // the renderer's pixels are premultiplied: undo that for the PNG
          const k = a > 0 ? 255 / a : 0;
          o[j] = Math.min(255, r * 255 * k); o[j + 1] = Math.min(255, g * 255 * k); o[j + 2] = Math.min(255, b * 255 * k); o[j + 3] = a;
        }),
        white: make((o, j, r, g, b, a) => { o[j] = o[j + 1] = o[j + 2] = 255; o[j + 3] = a; }),
        black: make((o, j, r, g, b, a) => { o[j] = o[j + 1] = o[j + 2] = 0; o[j + 3] = a; }),
      };
    });
    TEETH.forEach(T => T.R.setParams(paramsFor(T)));
    return out.canine && out.molar ? out : null;
  }
  // ------------------------------------------------------------------ the journal frame: running head, captions, page numbers
  const STAT = "Statistical tooth: a composite visualization generated from multiple samples";
  function setPage() {
    const L = S.scene === "layer" ? layerOf(S.layer) : null, onRadial = S.scene === "radial";
    $("#rhPlate").innerHTML = L ? "<b>Section " + L.n + "</b><span>" + esc(L.name) + "</span>"
      : onRadial ? "<b>Plate II</b><span>How far back each record reaches</span>" : "<b>Plate I</b><span>The composite teeth, 300–1900 CE</span>";
    document.querySelectorAll("#rhIdx [data-l]").forEach(b => b.setAttribute("aria-current", L && b.dataset.l === L.key ? "page" : "false"));
    $("#rhBack").hidden = !L;
    $("#capText").innerHTML = L ? "<b>Fig. " + L.n + ".1</b> " + STAT + (L.byPeriod ? ", " : ", all periods pooled, ") + esc(typeof L.plate === "function" ? (LD ? L.plate() : "") : L.plate)
      : "<b>Plate I</b> " + STAT + ". A first molar and a canine, cut open in their jaw, as the records of 300–1900 CE arrive century by century.";
    const pages = L ? [2 + 2 * L.n, 3 + 2 * L.n] : onRadial ? [2, 3] : [1, null];
    $("#folioL").textContent = pages[0] || ""; $("#folioR").textContent = pages[1] || "";
  }
  function enterRadial(animate) {
    clearTimeout(layersTimer); pause();
    leaveWear(); S.scene = "radial"; S.layer = null; S.show = "all"; S.t = T_ALL; G = composite(T_ALL); readout();
    stage.classList.remove("dashboard", "haspanel"); panelEl.hidden = true; panelEl.innerHTML = "";
    gParts.selectAll("*").remove(); gLabels.selectAll("*").remove(); setPage();
    requestAnimationFrame(() => {
      if (S.scene !== "radial") return;
      refit();
      const teeth = GL ? radialTeeth() : null;
      stage.classList.add("radial"); radialEl.hidden = false; radialFoot.hidden = false;
      if (radial) radial.destroy();
      radial = window.ToothRadial ? window.ToothRadial.mount(radialEl, { teeth, animate: animate && !REDUCED, open: radialOpen, onOpen: openLayer,
        padTop: () => $("#rh").getBoundingClientRect().bottom + 8, padBottom: () => innerHeight - radialFoot.getBoundingClientRect().top + 8 }) : null;
    });
  }
  function leaveRadial() {
    if (radial) { radial.destroy(); radial = null; }
    radialEl.hidden = true; radialFoot.hidden = true; stage.classList.remove("radial");
  }

  // ------------------------------------------------------------------ one layer's dashboard
  // Charts are drawn from data/layers.js (build_layers.py, from the team's tabular datasets in source/layer data/).
  // The "human ×" event strips stay placeholders until their pictures and dates arrive.
  const LD = window.LAYER_DATA || null;
  function openLayer(k) {
    const L = layerOf(k); if (!L) return;
    clearTimeout(layersTimer); pause();
    if (k !== "wear" || S.layer !== "wear") leaveWear();
    if (k === "wear" && !S.viewMode) S.viewMode = "side";
    S.scene = "layer"; S.layer = k; S.show = k; S.t = T_ALL; G = composite(T_ALL); readout();
    leaveRadial(); stage.classList.add("dashboard", "haspanel");
    panelEl.hidden = false; panelEl.classList.toggle("twin", k === "wear"); viewsEl.hidden = replayEl.hidden = k !== "wear"; setViewButtons();
    panelEl.innerHTML = dashHTML(L); panelEl.scrollTop = 0; setPage();
    requestAnimationFrame(() => {
      if (S.scene !== "layer") return;
      frameView(); TEETH.forEach(T => { T.parts.clear(); T.R.setParams(paramsFor(T)); });
      drawCharts(L); updateParticles(!REDUCED); requestRender(false);
    });
  }
  // each section's figures, in order; their numbers are given in dashHTML (n.2, n.3 ... after the plate n.1)
  const pct0 = v => Math.round(v) + "%";
  const CHARTS = {
    // the caries plate (caries.js): a figure of its own, with its own era rail, readout and era detail
    caries: [{ id: "cplate", html: true, title: "Caries, read from the crown",
      sub: "Two teeth seen from above, with decay drawn where it begins, in the pits and fissures of the chewing surface, spreading outward. Six periods run in sequence; each leaves its outline behind. Click a numbered mark, an outline or a period to open it.",
      notes: () => window.CariesPlate ? CariesPlate.notes(LD.caries.plate) : [] }],
    pathogens: [{ id: "pmatrix", title: "Which disease dominated the record, century by century",
      sub: "Each cell is the share of that century's recovered genomes that belong to one organism, so each column adds up to 100%. The bar on top shows how many genomes that is.",
      notes: ["A share cancels out how much digging and sequencing each century received, but it is not prevalence, and not a share of the oral microbiome: the denominator is genomes recovered, not people alive.",
        "Columns resting on a handful of genomes (the 100s–300s) swing wildly; read the bar and the cell together. The 800s have no European dental samples.",
        "Source: AncientMetagenomeDir (SPAAM community, CC-BY 4.0), European dental samples; disease labels from the team's pathogen_reference.csv."] }],
    // wear: Section 3 draws its own two figures (wearHTML(), wearMount(); wearleh.js)
    interventions: [{ id: "repair", title: "Tooth repair, drawn straight through",
      sub: () => { const M = LD.interventions.marks, a = M.filter(m => m.series === "archaeological"), mod = M.find(m => m.series === "modern");
        return "Teeth somebody repaired, per 100 individuals examined (log scale), with exact 95% Poisson intervals. The three archaeological samples hold " + a.map(m => d3.format(".1f")(m.per100)).join(", ") + "; the 2009 survey of " + fmtN(mod.n) + " people in England, " + fmtN(mod.per100) + ". Extractions are excluded at both ends."; },
      notes: () => ["Both ends count teeth a person deliberately had altered, divided by the people examined. The modern figure is the mean of restored, otherwise sound teeth per person (ADHS 2009 Table 4.3.1); it leaves out crowns, bridges, implants, dentures and extractions, so it is a floor.",
        "The pale bars are arithmetic, not estimates: the observed rate as if 90% (×10) or 99% (×100) of repairs had been missed. Even ×100 stays below the modern level; the samples would have to miss " + d3.format(".2f")(LD.interventions.breakeven * 100) + "% of all repairs for the two ends to meet.",
        "The three archaeological intervals overlap, so they show no trend among themselves. Middenbeemster comes from a conference poster.",
        "Sources: Monaco et al. 2022; Dittmar et al. 2026; Waters-Rist et al. 2013; Adult Dental Health Survey 2009 published tables, NHS Digital."] }],
    metals: [{ id: "lead", title: "Lead in the mouth, from the Neolithic to the 20th century",
      sub: "Lead in childhood enamel (ppm, log scale). Each bar spans the years of childhood it records; enamel forms once and never remodels.",
      notes: ["Pale bars are Roman-world sites from other studies, for comparison. The dashed line only joins the British series to guide the eye; there are no measurements between bars.",
        "One individual (Gristhorpe, Yorkshire, 0.003 ppm, n = 1) is left out, as in the team's draft. Sources: Montgomery et al. 2010, Moore et al. 2021, Kamenov et al. 2018."] },
      { id: "elements", title: "Industrial metals rose; the others did not",
      sub: "Modern enamel (20th-century births) against archaeological enamel pooled from 4040 BCE to 1775 CE (n = 38), same tissue and laboratory. Four metals rise nine- to fourteenfold; strontium falls.",
      notes: ["Source: Kamenov et al. 2018, Table 1, via the team's particulates and metals dataset."] }],
  };
  // the right-hand page: section opener, then each figure with its caption and numbered notes
  function dashHTML(L) {
    if (L.key === "wear") return wearHTML(L);
    const figs = CHARTS[L.key] || [], fig = i => "Fig. " + L.n + "." + (i + 2);
    const ev = L.events.map((e, i) => "<figure class='ev' style='left:" + ((i + 1) / (L.events.length + 1) * 100).toFixed(1) + "%'><figcaption><b>" + esc(e.label) + "</b>" + esc(e.when) + "</figcaption>" +
      (IMG[e.img] ? "<img src='" + IMG[e.img] + "' alt=''>" : "<div class='slot'>Image</div>") + "</figure>").join("");
    const charts = figs.map((c, i) => "<figure class='fig'>" + (c.html ? "<div id='ch-" + c.id + "'></div>" : "<svg class='chart' id='ch-" + c.id + "' role='img' aria-label='" + esc(fig(i) + " " + c.title) + "'></svg>") +
      "<figcaption><b>" + fig(i) + "</b> " + esc(c.title) + ". " + esc(typeof c.sub === "function" ? (LD ? c.sub() : "") : c.sub) + "</figcaption>" +
      "<ol class='notes'>" + (typeof c.notes === "function" ? (LD ? c.notes() : []) : c.notes).map(n => "<li>" + esc(n) + "</li>").join("") + "</ol></figure>").join("");
    return "<div class='dp'><header class='sec'><span class='no'>" + L.n + "</span><h2>" + esc(L.name) + "</h2><p class='dek'>" + esc(L.dek) + "</p></header>" +
      (LD ? charts : "<p class='dek'>data/layers.js is missing: run build_layers.py.</p>") +
      (L.events.length ? "<figure class='fig'><div class='events'>" + ev + "</div><div class='axis'><span>Time 1</span><span>Time 2</span></div>" +
      "<figcaption><b>" + fig(figs.length) + "</b> " + esc(L.human) + ". Placeholders: these events, their dates and pictures are still to come.</figcaption></figure>" : "") + "</div>";
  }
  function drawCharts(L) {
    if (!LD) return;
    if (L.key === "wear") { wearMount(); return; }
    (CHARTS[L.key] || []).forEach(c => {
      if (c.id === "cplate") { if (window.CariesPlate && LD.caries.plate) CariesPlate.mount(document.getElementById("ch-cplate"), LD.caries.plate); return; }
      const svg = d3.select("#ch-" + c.id); if (svg.empty()) return;
      svg.selectAll("*").remove(); d3.select(svg.node().parentNode).selectAll(".keylist").remove();
      ({ repair: drawRepair, pmatrix: drawPathogenMatrix, lead: drawLead, elements: drawElements })[c.id](svg, svg.node().clientWidth || 600);
    });
  }
  // ------------------------------------------------------------------ Section 3, Wear and LEH (figures in wearleh.js)
  // The plate steps through the six periods: the molar wears down to each period's mean Smith stage (the worn-away crown
  // in blue) and the canine's stress-line bands take each period's shares. As each period lands, its row of peaks lifts
  // in Fig. 3.2 and its bar grows in Fig. 3.3. Then the peaks and the bars open their period on a click; a bar's period
  // has its events and two breakdowns (lehView). Events are the team's timeline: context.
  const viewsEl = $("#views"), replayEl = $("#wlReplay");
  // Replay runs the whole section again: both acts, the peaks and the bars (the views and minimized panels stay)
  replayEl.onclick = () => { if (S.layer !== "wear") return; if (wl) wl.done = false; openLayer("wear"); };
  let wl = null;                                         // { run, timer, raf, done, peaks, c10, c9, c8, lehK, lehView }
  function setViewButtons() { viewsEl.querySelectorAll("[data-v]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.viewMode ? "true" : "false")); }
  viewsEl.querySelectorAll("[data-v]").forEach(b => { b.onclick = () => {
    S.viewMode = b.dataset.v; setViewButtons();
    if (!GL || S.layer !== "wear") return;
    frameView(); TEETH.forEach(T => T.R.setParams(paramsFor(T))); requestRender(false);
  }; });
  function leaveWear() {
    if (wl) { wl.run = -1; clearTimeout(wl.timer); cancelAnimationFrame(wl.raf); }
    wl = null; S.wl = null; S.viewMode = null; S.wlStage = null; pairEl.classList.remove("molar-only");
    panelEl.classList.remove("twin"); viewsEl.hidden = replayEl.hidden = true;
  }
  const spanTxt = e => e.span[0] + "–" + e.span[1] + " CE";
  // the team's timeline events that overlap a period and bear on wear (or on stress lines)
  const overlaps = (ev, e) => ev.start < e.span[1] && ev.end >= e.span[0];
  const wearEv = ev => ev.layer === "wear" || /wear/i.test(ev.expected);
  const lehEv = ev => ev.layer === "pathogens" || ev.layer === "food" || /hypoplasia|lesion/i.test(ev.expected);
  function eventsHTML(list) {
    if (!list.length) return "<p class='wl-none'>No event in the team's timeline overlaps this period.</p>";
    return "<ol class='wl-ev'>" + list.map(ev => "<li><span class='y'>" + (ev.start === ev.end ? ev.start : ev.start + "–" + ev.end) + "</span><div><p class='t'>" + esc(ev.label) +
      "<span class='tag'>" + esc(ev.strength) + "</span>" + (ev.act === "hinge" ? "<span class='tag'>hinge</span>" : "") + "</p>" +
      "<p class='m'><b>Expected:</b> " + esc(ev.expected) + "</p><p class='m'><b>Measured:</b> " + esc(ev.measured) + "</p></div></li>").join("") + "</ol>";
  }
  function wearHTML(L) {
    const M = LD && LD.morphology, LC = M && M.leh_canine;
    if (!M || !M.eras || !M.eras.length || !LC) return "<div class='dp'><p class='dek'>data/layers.js is missing the Wear and LEH data: run build_layers.py.</p></div>";
    const head = "<header class='sec'><span class='no'>" + L.n + "</span><h2>" + esc(L.name) + "</h2><p class='dek'>" + esc(L.dek) + "</p></header>";
    return "<div class='dp wl'>" + head +
      "<section class='wl-box' id='wlWearBox' aria-label='Molar wear'><div class='wl-top'><h3>Molar wear by age at death, period by period</h3><span class='wl-st' id='wlWearSt'>Click a peak to see breakdown</span><button class='wl-tog' type='button' data-box='wear' aria-expanded='true' aria-label='Minimize the molar wear panel'></button></div>" +
      "<figure class='fig'><div id='wlPeaks'></div><figcaption><b>Fig. 3.2</b> Mean molar wear (Smith 1984 stage, 1 unworn to 8) for each period and age at death, as peaks shaped like a molar's crown, drawn as a wire mesh over its surface. A peak's height is its stage above 1, on the same scale as the coloured layers on the molar (the crown that chewing wore away), and its surface carries the same ripple as the molar's worn surface. Colour runs from blue at 18–24 to orange at 60+; deeper colour is more wear.</figcaption>" +
      "<ol class='notes'><li>Wear is recorded for only part of the GHHP database, which its authors warn may not generalise. Several Industrial cells rest on fewer than 30 people.</li><li>The molar on the plate is worn to each period's 60+ band, and the crown it lost is layered by the age band by which each layer was gone, in the grid's colours. Wear cannot be undone, so where an older band is less worn than a younger one its layer is left out. Pooled over all ages the means are " + M.eras.map(e => e.p + " " + e.wear.toFixed(2)).join(", ") + ".</li><li>Source: Global History of Health Project, European module, decoded for this project; adults 18–69.</li></ol></figure>" +
      "<div id='wlWearDetail' class='wl-detail'></div></section>" +
      "<section class='wl-box' id='wlLehBox' aria-label='Linear enamel hypoplasia'><div class='wl-top'><h3>Stress lines on the lower canine, period by period</h3><span class='wl-st' id='wlLehSt'>Click a bar to open its period</span><button class='wl-tog' type='button' data-box='leh' aria-expanded='true' aria-label='Minimize the stress-line panel'></button></div>" +
      "<figure class='fig'><div id='wlC10'></div><figcaption><b>Fig. 3.3</b> The curve does not tilt, it lifts: the share of adults with at least one stress line (linear enamel hypoplasia) on the lower canine, by period, with 95% intervals. Each bar is drawn like a groove on the tooth, but starts at 0 and ends at its value. Click a bar to open its period.</figcaption>" +
      "<ol class='notes'><li>What a bar is: the share of adults in the period whose lower canine carries at least one line. The marker forms before about age six and enamel never remodels, so each bar is a measure of childhood, carried by an adult skeleton.</li>" +
      "<li>The whisker is a 95% Wilson interval. The Industrial bar does not overlap any period before the Late medieval, and the three medieval periods and the Early modern overlap heavily: the safe reading is a low plateau, a step up around the Late medieval period, and a second step at industrialisation.</li>" +
      "<li>Age-standardising every period to the pooled age distribution of all " + fmtN(LC.n) + " adults moves each value by at most " + d3.max(LC.eras, c => Math.abs(c.pct - c.std)).toFixed(1) + " points (in each period's detail; it differs from the draft's column by at most 0.1).</li>" +
      "<li>One tooth, deliberately: scoring the worst of up to four teeth rewards people who kept more of them. The lower canine is the best-covered single tooth, and the one this project models. On the plate it is drawn after Schultz's standard, exaggerated so it reads: one groove as strong as the share with a line (full at " + d3.max(LC.eras, c => c.pct).toFixed(1) + "%), three more as the share with two or more (full at " + d3.max(LC.eras, c => c.comp[2]).toFixed(1) + "%).</li>" +
      "<li>Source: Global History of Health Project, European module, decoded for this project; adults 18–69 with a scorable lower canine; scoring after Schultz (1988). After the team's draft C10.</li></ol></figure>" +
      "<div id='wlLehDetail' class='wl-detail lh' hidden><div class='lh-corr'></div><div class='lh-btns' role='group' aria-label='Break down Fig. 3.3'><button type='button' class='btn' data-v='age'>Break down by age</button><button type='button' class='btn' data-v='sev'>Break down by severity</button></div><div class='lh-body'></div></div></section></div>";
  }
  // set the teeth to a period's values (or between two), re-render, and name the period under the plate
  function wlApply(v, low) { S.wl = v; if (GL) TEETH.forEach(T => T.R.setParams(paramsFor(T))); requestRender(low); }
  function wlWhen(e) { $("#when").textContent = e ? e.p + ", " + spanTxt(e) : ""; }
  // A period's lifetime of wear for the molar: its age bands' stages, each at least the one before (wear cannot be
  // undone), the molar worn to the last; each band's layer in its grid colour (WearLEH.wearCol, as in Fig. 3.2).
  function strataOf(e) {
    const M = LD.morphology; let run = 1;
    const s = M.ages.map(a => (run = Math.max(run, M.wear[e.p][a] ? M.wear[e.p][a][0] : run)));
    const c = M.ages.flatMap((a, k) => { const q = d3.rgb(WearLEH.wearCol(s[k], k, M.ages.length)); return [q.r / 255, q.g / 255, q.b / 255]; });
    return { s, c, life: s[s.length - 1] };
  }
  const eraVals = e => { const st = strataOf(e), c = lehOf(e); return { wear: st.life, any: c.pct, multi: c.comp[2], strata: st }; };
  function wlTween(to, ms, done) {
    const from = Object.assign({}, S.wl), t0 = performance.now(), run = wl.run;
    const tick = now => {
      if (!wl || wl.run !== run) return;
      const k = REDUCED ? 1 : Math.min(1, (now - t0) / ms), e = ease(k);
      wlApply({ wear: from.wear + (to.wear - from.wear) * e, any: from.any + (to.any - from.any) * e, multi: from.multi + (to.multi - from.multi) * e, strata: to.strata }, k < 1);
      if (k < 1) wl.raf = requestAnimationFrame(tick); else if (done) done();
    };
    wl.raf = requestAnimationFrame(tick);
  }
  function wearMount() {
    const M = LD && LD.morphology; if (!M || !M.eras || !M.leh_canine || !window.WearLEH || !window.LEHFigs) return;
    const was = wl && wl.done;
    if (wl) { wl.run = -1; clearTimeout(wl.timer); cancelAnimationFrame(wl.raf); }
    wl = { run: Math.random(), done: false };
    wl.peaks = WearLEH.peaks($("#wlPeaks"), M, { onPick: wearPick });
    if (/[?&]debug=1/.test(location.search)) window.__wl = wl;
    panelEl.querySelectorAll(".wl-tog").forEach(b => { b.onclick = () => wlFold(b.dataset.box); });
    lehButtons(false);
    $("#wlLehBox").addEventListener("click", ev => { if (wl && wl.done && !ev.target.closest(".lf-row, .lh-btns, .lh-corr, .lh-body, .wl-tog")) lehPick(-1); });
    wlFoldApply();
    if (was || REDUCED) return wearFinish(true);
    wearSeq();
  }
  // Two acts. First the molar alone, with the wear panel: it wears down period by period and each period's row of
  // peaks lifts. Then the canine and the LEH panel come in: its grooves take each period's shares and each period's
  // bar grows in Fig. 3.3. S.wlStage hides the canine (and its labels) during the first act.
  // Either panel can be minimized to its title bar, so the other takes the whole column; both open share it half and
  // half. One always stays open: minimizing the second reopens the first. S.wlMin survives re-renders.
  function wlFold(k) {
    const m = S.wlMin = S.wlMin || { wear: false, leh: false }, other = k === "wear" ? "leh" : "wear";
    m[k] = !m[k]; if (m[k] && m[other]) m[other] = false;
    wlFoldApply();
  }
  function wlFoldApply() {
    const m = S.wlMin || { wear: false, leh: false };
    [["wear", "#wlWearBox", "molar wear"], ["leh", "#wlLehBox", "stress-line"]].forEach(([k, sel, name]) => {
      const box = $(sel), b = box && box.querySelector(".wl-tog"); if (!box) return;
      box.classList.toggle("min", !!m[k]);
      b.setAttribute("aria-expanded", m[k] ? "false" : "true"); b.setAttribute("aria-label", (m[k] ? "Expand" : "Minimize") + " the " + name + " panel");
      if (m[k]) box.scrollTop = 0;
    });
  }
  function wlStage(st) {
    S.wlStage = st;
    const wearOnly = st === "wear";
    pairEl.classList.toggle("molar-only", wearOnly);
    const dp = panelEl.querySelector(".dp.wl"); if (dp) dp.classList.toggle("wear-only", wearOnly);
    if (st === "leh" && S.wlMin && S.wlMin.leh) { S.wlMin.leh = false; wlFoldApply(); }   // the second act opens its panel
    if (!wearOnly && !wl.c10) wl.c10 = LEHFigs.c10($("#wlC10"), LD.morphology.leh_canine, { onPick: lehPick });
    requestRender(false);
  }
  function wearSeq() {
    const E = LD.morphology.eras, run = wl.run, last = E[E.length - 1];
    wlStage("wear"); wlApply({ wear: 1, any: 0, multi: 0 }, false); wlWhen(null);
    let i = 0;
    const next = (fn, ms) => { wl.timer = setTimeout(() => { if (wl && wl.run === run) fn(); }, ms); };
    const wearStep = () => {
      const e = E[i]; wlWhen(e);
      const st = strataOf(e);
      wlTween({ wear: st.life, any: 0, multi: 0, strata: st }, 1500, () => {
        wl.peaks.highlight(i);
        i++;
        if (i < E.length) next(wearStep, 1300);
        else next(() => { wl.peaks.highlight(-1); wl.peaks.interactive(true); i = 0; wlStage("leh"); next(lehStep, 900); }, 1300);
      });
    };
    // the canine takes each period's shares while that period's bar grows in Fig. 3.3, over the same time, so the two
    // finish together
    const lehStep = () => {
      const e = E[i], c = lehOf(e); wlWhen(e);
      const st = strataOf(last);
      wl.c10.show(i, REDUCED ? 0 : 1500); lehFollow();
      wlTween({ wear: st.life, any: c.pct, multi: c.comp[2], strata: st }, 1500, () => {
        i++;
        next(() => { if (i < E.length) lehStep(); else wearFinish(false); }, 1500);
      });
    };
    next(wearStep, 700);
  }
  // keep Fig. 3.3 in view as its bars grow
  function lehFollow() {
    const box = $("#wlLehBox"), svg = box && box.querySelector(".lf-c10"); if (!svg) return;
    const d = svg.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom + 14;
    if (d > 0) box.scrollBy({ top: d, behavior: REDUCED ? "auto" : "smooth" });
  }
  function wearFinish(now) {
    const E = LD.morphology.eras;
    wlStage("done");
    if (now) { wl.c10.showAll(); wlApply(eraVals(E[E.length - 1]), false); wlWhen(E[E.length - 1]); }
    wl.done = true; wl.peaks.highlight(-1); wl.peaks.interactive(true); wl.c10.live(true); lehButtons(true);
  }
  // ---- Under Fig. 3.3, once its bars are in: the human correlations of one period (Industrial unless a bar is picked:
  // its figures and the timeline events that overlap it), then two buttons that open a breakdown below them, by age
  // (Fig. 3.4, after the team's C9) or by severity (Fig. 3.5, after C8); a second click on the open one closes it.
  // A click anywhere else in the panel (not a bar, the buttons or what is under them) goes back to Industrial with
  // every bar in full colour.
  const lehOf = e => LD.morphology.leh_canine.eras.find(c => c.p === e.p);
  function lehCorr(k) {
    const M = LD.morphology, LC = M.leh_canine, c = LC.eras[k], e = M.eras[k], prev = LC.eras[k - 1];
    $("#wlLehDetail .lh-corr").innerHTML = "<p class='wl-eh lh-k'><b>Human correlations</b></p><h4>" + esc(e.p) + " <span>" + spanTxt(e) + "</span></h4>" +
      "<p class='wl-big' style='--c:" + wl.c10.col(k) + "'><b>" + c.pct.toFixed(1) + "%</b> of " + fmtN(c.n) + " adults (" + fmtN(c.k) + ") had at least one stress line on the lower canine.</p>" +
      "<ul class='wl-said'><li>95% interval " + c.ci[0] + "–" + c.ci[1] + "%; age-standardised " + c.std.toFixed(1) + "%.</li>" +
      "<li>" + c.comp[2].toFixed(1) + "% had two or more lines (" + c.comp_n[2] + " people); " + c.comp[1].toFixed(1) + "% had one.</li>" +
      (prev ? "<li>" + (c.pct >= prev.pct ? "Up" : "Down") + " from " + prev.pct.toFixed(1) + "% in " + prev.p + ".</li>" : "") + "</ul>" +
      "<p class='wl-eh'><b>Human events that may bear on it</b></p>" + eventsHTML((LD.events || []).filter(ev => lehEv(ev) && overlaps(ev, e))) +
      "<p class='wl-src'>From the team's timeline (research/Human Correlations/timeline_events_display.csv), as written: context, not data from these teeth." +
      (wl.lehK == null ? " Click a bar to see another period." : "") + "</p>";
  }
  function lehPick(k) {
    const n = LD.morphology.leh_canine.eras.length;
    if (k < 0) {
      if (wl.lehK == null) return;
      wl.lehK = null; wl.c10.select(-1); lehCorr(n - 1);
      return;
    }
    const e = LD.morphology.eras[k];
    wl.lehK = k; wl.c10.select(k); wlWhen(e);
    clearTimeout(wl.timer); cancelAnimationFrame(wl.raf); wlTween(eraVals(e), 900);
    lehCorr(k);
    if (wl.lehView === "age" && wl.c9 && wl.c9done) wl.c9.focus(k);
    const el = $("#wlLehDetail"), box = $("#wlLehBox"); box.scrollTo({ top: el.offsetTop - 8, behavior: REDUCED ? "auto" : "smooth" });
  }
  // the correlations and the buttons appear once the run ends (the severity flight needs every bar grown)
  function lehButtons(on) {
    const el = $("#wlLehDetail"); if (!el) return;
    el.hidden = !on;
    el.querySelectorAll(".lh-btns button").forEach(b => { if (!b.onclick) b.onclick = () => lehView(wl.lehView === b.dataset.v ? null : b.dataset.v); });
    if (on) lehCorr(wl.lehK == null ? LD.morphology.leh_canine.eras.length - 1 : wl.lehK);
  }
  function lehView(v) {
    const M = LD.morphology, LC = M.leh_canine, el = $("#wlLehDetail"), body = el.querySelector(".lh-body"), n = LC.eras.length;
    wl.lehView = v; wl.c9 = wl.c8 = null; wl.c9done = false; wl.lehRun = (wl.lehRun || 0) + 1;
    el.querySelectorAll(".lh-btns button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false"));
    const box = $("#wlLehBox");
    if (!v) { body.innerHTML = ""; return; }
    if (v === "age") {
      const I = LC.eras[n - 1], neg = I.sites.filter(s => s.slope < 0);
      body.innerHTML = "<figure class='fig'><div id='wlC9'></div><figcaption><b>Fig. 3.4</b> A childhood scar cannot appear later in life. Left: in each period, the share of adults with a line at each age at death, as a gap from the period's own share; each ribbon twists around its fitted line (one edge through the age bands, the other mirrored across the line). Right: the slope in each cemetery of one period. Click a ribbon or its name to see its cemeteries.</figcaption>" +
        "<ol class='notes'><li>Why zero is the expectation: the defect forms before about age six in enamel that never remodels, so how long someone lived cannot change whether they carry it. A slightly negative slope is also expected, as childhood stress shortens life. Five periods land between " + d3.min(LC.eras.slice(0, -1), q => q.slope).toFixed(2) + " and " + d3.max(LC.eras.slice(0, -1), q => q.slope).toFixed(2) + " points per decade; the Industrial period at " + (I.slope > 0 ? "+" : "") + I.slope.toFixed(2) + " does not.</li>" +
        "<li>Inside the Industrial period, " + neg.length + " of its " + I.sites.length + " cemeteries slope down (" + neg.map(s => s.name + " " + s.slope.toFixed(2)).join(", ") + "); the others slope up and carry the pooled value with them. An aggregate pointing the way most of its parts do not is Simpson's paradox: composition, not biology.</li>" +
        "<li>The lines are ordinary least squares of the 0/1 marker on age in years, on individuals, scaled to a decade and drawn at the age bands' midpoints as a gap from the period's share, so only a line's tilt carries information. Cemeteries are shown when they have at least " + LC.sites_min + " scorable canines.</li>" +
        "<li>Source: Global History of Health Project, European module, decoded for this project; scoring after Schultz (1988). After the team's draft C9.</li></ol></figure>";
      const mine = wl.c9 = LEHFigs.c9($("#wlC9"), LC, { colours: M.leh_colour, onPick: j => { if (wl.c9done) mine.focus(j); } });
      box.scrollTo({ top: body.offsetTop - 8, behavior: REDUCED ? "auto" : "smooth" });
      mine.showBands(() => { if (wl && wl.c9 === mine) { wl.c9done = true; mine.focus(n - 1); } });   // the Industrial cemeteries first
      return;
    }
    // By severity, in three movements. The bars of Fig. 3.3 fly down inside the panel to Fig. 3.5's rows, widening to
    // the full row and flattening into rectangles, while the panel scrolls down with them; once all six are in, each row
    // splits by how many lines the canine carries, one row after another; then each period's cemeteries fade in.
    const I = LC.eras[n - 1], sI = I.sites.slice().sort((a, b) => a.multi - b.multi), lo = sI[0], hi = sI[sI.length - 1];
    body.innerHTML = "<figure class='fig'><div id='wlC8'></div><figcaption><b>Fig. 3.5</b> Childhood stress, scored by how many lines the canine carries. Top: adults by the lines on their lower canine. Bottom: each cemetery's share with two or more lines, sized by sample, against the period's pooled value. Hover a period to pick it out in both panels.</figcaption>" +
      "<ol class='notes'><li>Why not an average score: the codes are 1 no line, 2 one line, 3 two or more, and the step from none to one is not the same quantity as from one to two, so the composition is shown instead.</li>" +
      "<li>A recording effect may be live: in the Industrial period the one-line share falls (" + I.comp[1].toFixed(1) + "%, below every period since Pre-medieval) while two or more triples. Intensifying stress should move people from one line to two, not empty the middle; observers counting lines differently would produce this shape.</li>" +
      "<li>Read the bottom panel before quoting the top: the Industrial reading rests on " + I.sites.length + " cemeteries, from " + lo.multi.toFixed(1) + "% (" + lo.name + ") to " + hi.multi.toFixed(1) + "% (" + hi.name + ") with two or more lines.</li>" +
      "<li>Source: Global History of Health Project, European module, decoded for this project; scoring after Schultz (1988): linear grooves only, visible to the naked eye. After the team's draft C8.</li></ol></figure>";
    const mine = wl.c8 = LEHFigs.c8($("#wlC8"), LC, {}), run = wl.lehRun, alive = () => wl && wl.c8 === mine && wl.lehRun === run;
    const c10 = box.querySelector(".lf-c10");
    box.scrollTop = Math.max(0, c10.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12);   // start where the bars are
    requestAnimationFrame(() => {
      if (!alive()) return;
      const B = box.getBoundingClientRect(), rel = r => ({ left: r.left - B.left + box.scrollLeft, top: r.top - B.top + box.scrollTop, width: r.width, height: r.height });
      const cols = d3.range(n).map(i => wl.c10.col(i));
      const from = d3.range(n).map(i => rel(wl.c10.barRect(i))), to = d3.range(n).map(i => rel(mine.rowRect(i)));
      const later = (fn, ms) => setTimeout(() => { if (alive()) fn(); }, REDUCED ? 0 : ms);
      LEHFigs.fly(box, from, to, cols, i => { if (alive()) mine.landRow(i, cols[i]); }, () => {
        const SEG = 1100, BETWEEN = 450;
        later(() => d3.range(n).forEach(i => later(() => {
          mine.revealRow(i, REDUCED ? 0 : SEG);
          if (i === n - 1) d3.range(n).forEach(j => later(() => mine.showSites(j, REDUCED ? 0 : 600), SEG + 300 + j * 450));
        }, i * (SEG + BETWEEN))), 500);
      });
      // the panel follows the bars down, at their pace and with their easing
      const s0 = box.scrollTop, s1 = Math.max(0, to[0].top - 60), t0 = performance.now() + 30, T = REDUCED ? 0 : 1600 + (n - 1) * 180;
      const follow = now => { if (!alive()) return; const u = T ? Math.min(1, Math.max(0, (now - t0) / T)) : 1, e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        box.scrollTop = s0 + (s1 - s0) * e; if (u < 1) requestAnimationFrame(follow); };
      requestAnimationFrame(follow);
    });
  }
  // a peak opens its period: the original chart's row, what the grid says about it, and the timeline's events
  function wearPick(i, j) {
    const M = LD.morphology, E = M.eras, e = E[i], p = M.periods[i], row = M.ages.map(a => M.wear[p][a]);
    wl.peaks.select(i, j); wlWhen(e);
    clearTimeout(wl.timer); cancelAnimationFrame(wl.raf); wlTween(eraVals(e), 900);
    // how this row compares with a neighbouring period, age by age: whichever way holds at more ages
    const cmp = q => { if (q < 0 || q >= E.length) return null; const r = M.ages.map(a => M.wear[M.periods[q]][a]); let lower = 0, higher = 0, n = 0;
      row.forEach((v, k) => { if (v && r[k]) { n++; if (v[0] < r[k][0]) lower++; else if (v[0] > r[k][0]) higher++; } });
      return { p: M.periods[q], n, txt: lower >= higher ? "less worn at " + lower + " of " + n + " ages" : "more worn at " + higher + " of " + n + " ages" }; };
    const prev = cmp(i - 1), next = cmp(i + 1), fi = row.findIndex(Boolean), li = row.length - 1 - row.slice().reverse().findIndex(Boolean);
    const said = [fi >= 0 ? "Within the period, wear builds from stage " + row[fi][0].toFixed(1) + " at " + M.ages[fi] + " to " + row[li][0].toFixed(1) + " at " + M.ages[li] + ": chewing wears a crown down over a lifetime." : "",
      prev ? "Against " + prev.p + ", the molars are " + prev.txt + "." : "",
      next ? "Against " + next.p + ", " + next.txt + "." : "",
      "Pooled over all ages the mean is stage " + e.wear.toFixed(2) + " (n = " + fmtN(e.wear_n) + "). The molar on the plate now shows this period, worn to its 60+ band and layered by age as in the grid."].filter(Boolean);
    const ev = (LD.events || []).filter(x => wearEv(x) && overlaps(x, e));
    const el = $("#wlWearDetail");
    el.innerHTML = "<h4>" + esc(p) + " <span>" + spanTxt(e) + "</span></h4>" +
      "<div class='wl-rowc'>" + M.ages.map((a, k) => { const v = row[k]; return "<div class='c" + (k === j ? " sel" : "") + "'" + (v ? " style='background:" + WearLEH.wearCol(v[0], k, M.ages.length) + ";color:" + (v[0] > 4.2 ? "#fbf8f1" : "#1a1a18") + "'" : "") + "><b>" + (v ? v[0].toFixed(1) : "–") + "</b><span>" + a + "</span><i>" + (v ? "n=" + v[1] : "no data") + "</i></div>"; }).join("") + "</div>" +
      "<ul class='wl-said'>" + said.map(t => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      "<p class='wl-eh'><b>Human events that may bear on it</b></p>" + eventsHTML(ev) +
      "<p class='wl-src'>From the team's timeline (research/Human Correlations/timeline_events_display.csv), as written: context, not data from these teeth. The comparisons above are read off the grid.</p>";
    const box = $("#wlWearBox"); box.scrollTo({ top: el.offsetTop - 8, behavior: REDUCED ? "auto" : "smooth" });
  }
  // interventions: repaired teeth per 100 individuals, log scale; points with their intervals, faint what-if bars
  function drawRepair(svg, W) {
    const M = LD.interventions.marks, H = 300, narrow = W < 480, m = { l: 40, r: narrow ? 64 : 150, t: 16, b: 30 }; size(svg, W, H);
    const x = d3.scaleLinear().domain([880, 2040]).range([m.l, W - m.r]), y = d3.scaleLog().domain([0.1, 1500]).range([H - m.b, m.t]);
    [0.1, 1, 10, 100, 1000].forEach(v => { svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "#dcdad3").attr("stroke-width", 0.6);
      svg.append("text").attr("x", m.l - 6).attr("y", y(v) + 3).attr("text-anchor", "end").attr("class", "ax").text(v); });
    svg.append("text").attr("x", m.l - 6).attr("y", m.t - 6).attr("text-anchor", "end").attr("class", "ax").text("per 100");
    (narrow ? [1000, 1500, 2000] : [1000, 1200, 1400, 1600, 1800, 2000]).forEach(v => svg.append("text").attr("x", x(v)).attr("y", H - 10).attr("text-anchor", "middle").attr("class", "ax").text(v));
    const mod = M.find(d => d.series === "modern"), arch = M.filter(d => d.series === "archaeological");
    svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(mod.per100)).attr("y2", y(mod.per100)).attr("stroke", "#1a1a18").attr("stroke-width", 0.7).attr("stroke-dasharray", "3 3");
    arch.forEach(d => { if (!d.whatif) return; const bw = 14;
      [[100, 0.07], [10, 0.14]].forEach(([k, op]) => svg.append("rect").attr("x", x(d.x) - bw / 2).attr("width", bw).attr("y", y(d.whatif[k])).attr("height", y(d.per100) - y(d.whatif[k])).attr("fill", "#1a1a18").attr("fill-opacity", op)); });
    svg.append("path").attr("d", d3.line().x(d => x(d.x)).y(d => y(d.per100))(arch.concat([mod]))).attr("fill", "none").attr("stroke", "#1a1a18").attr("stroke-width", 1.4);
    arch.forEach(d => svg.append("line").attr("x1", x(d.x)).attr("x2", x(d.x)).attr("y1", y(d.lo)).attr("y2", y(d.hi)).attr("stroke", "#1a1a18").attr("stroke-width", 1.4));
    tipOn(svg.append("g").selectAll("circle").data(arch.concat([mod])).join("circle").attr("cx", d => x(d.x)).attr("cy", d => y(d.per100)).attr("r", d => d.series === "modern" ? 5 : 3.6).attr("fill", "#1a1a18").attr("stroke", "#e9e8e4").attr("stroke-width", 1.2),
      d => "<b>" + esc(d.label.replace(/ — /, ", ")) + "</b><br>" + d3.format(",.2~f")(d.per100) + " repaired teeth per 100 (" + esc(d.teeth) + " / " + fmtN(d.n) + " people)" + (d.lo != null ? "<br><span class='m'>95% interval " + d.lo + "–" + d.hi + "</span>" : ""));
    // labels to the right of each point; the middle one to the left, clear of its neighbour's whisker
    if (!narrow) arch.forEach((d, i) => { const left = i === 1, lx = x(d.x) + (left ? -10 : 10), ly = y(d.per100) + 17, an = left ? "end" : "start";
      svg.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", an).attr("class", "rl").text(d.label.split(" — ")[0]);
      svg.append("text").attr("x", lx).attr("y", ly + 13).attr("text-anchor", an).attr("class", "ax").text(d.teeth + " teeth / " + d.n + " people = " + d3.format(".1f")(d.per100)); });
    const mx = x(mod.x) + 10;
    svg.append("text").attr("x", mx).attr("y", y(mod.per100) - 6).attr("class", "big").text(fmtN(mod.per100));
    if (!narrow) { svg.append("text").attr("x", mx).attr("y", y(mod.per100) + 12).attr("class", "rl").text("ADHS 2009, England");
      svg.append("text").attr("x", mx).attr("y", y(mod.per100) + 26).attr("class", "ax").text("6.7 restored teeth per person");
      svg.append("text").attr("x", x(arch[0].x) + 12).attr("y", y(arch[0].whatif[100]) + 4).attr("class", "ax").text("pale bars: ×10 and ×100, what-if only"); }
  }
  const size = (svg, W, H) => svg.attr("viewBox", "0 0 " + W + " " + H).attr("height", H);
  const tipOn = (sel, html) => sel.on("mousemove", (ev, d) => showTip(ev, html(d))).on("mouseleave", hideTip);
  const CATNAME = { bacteria: "Bacteria", virus: "Viruses", parasite: "Parasites", other: "Not disease agents" };
  const shortDisease = t => (t.agent ? t.disease.split(/ — | · |, /)[0] : t.disease.split(" — ").pop()).split(" (")[0].replace(/^louse-borne /, "");

  // pathogens: organisms × centuries, shaded by share, in the colours of the marks in the teeth
  function drawPathogenMatrix(svg, W) {
    const P = LD.pathogens, cents = P.centuries, order = ["bacteria", "virus", "parasite", "other"];
    const rowsIn = order.flatMap(c => P.taxa.filter(t => t.cat === c).sort((a, b) => b.total - a.total));
    const narrow = W < 480, labW = narrow ? Math.round(W * 0.36) : Math.min(176, Math.max(118, W * 0.27)), totW = narrow ? 22 : 30, cw = (W - labW - totW) / cents.length, rh = 28, top = 46, gap = 18;
    let y = top; const ys = []; let lastCat = null;
    rowsIn.forEach(t => { if (t.cat !== lastCat) { y += gap; lastCat = t.cat; } ys.push(y); y += rh; });
    const H = y + 22; size(svg, W, H);
    const x = i => labW + i * cw, maxN = d3.max(Object.values(P.genomes));
    const col = t => t.cat === "other" ? "#8a8983" : CAT[t.cat];
    // genomes sequenced per century
    svg.append("text").attr("x", labW - 8).attr("y", top - 20).attr("text-anchor", "end").attr("class", "ax").text(narrow ? "genomes" : "genomes recovered");
    cents.forEach((c, i) => {
      const n = P.genomes[c];
      if (n == null) {
        svg.append("rect").attr("x", x(i) + 1).attr("y", top - 34).attr("width", cw - 2).attr("height", H - top + 12 - 22).attr("class", "nodata");
        svg.append("text").attr("x", x(i) + cw / 2).attr("y", (top + H - 22) / 2).attr("text-anchor", "middle").attr("class", "ax").attr("transform", "rotate(-90," + (x(i) + cw / 2) + "," + (top + H - 22) / 2 + ")").text("no samples");
        return;
      }
      const h = Math.max(1, 22 * n / maxN);
      svg.append("rect").attr("x", x(i) + 2).attr("y", top - 8 - h).attr("width", cw - 4).attr("height", h).attr("fill", "#b9b7b0");
      if (cw >= 16) svg.append("text").attr("x", x(i) + cw / 2).attr("y", top - 11 - h).attr("text-anchor", "middle").attr("class", "ax").text(n);
      if (cw >= 34 || (cw >= 16 ? i % 2 === 0 : i % 4 === 0)) svg.append("text").attr("x", x(i) + cw / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("class", "ax").text(c + "s");
    });
    svg.append("text").attr("x", W).attr("y", top - 20).attr("text-anchor", "end").attr("class", "ax").text("total");
    // rows
    lastCat = null;
    rowsIn.forEach((t, r) => {
      const yy = ys[r];
      if (t.cat !== lastCat) { lastCat = t.cat; svg.append("text").attr("x", 0).attr("y", yy - 5).attr("class", "grp").attr("fill", col(t)).text(CATNAME[t.cat].toUpperCase()); }
      svg.append("text").attr("x", labW - 8).attr("y", yy + 10).attr("text-anchor", "end").attr("class", "rl").style("font-size", narrow ? "9.5px" : null).text(shortDisease(t));
      svg.append("text").attr("x", labW - 8).attr("y", yy + 23).attr("text-anchor", "end").attr("class", "rs").style("font-size", narrow ? "8px" : null).text(t.taxon);
      svg.append("text").attr("x", W).attr("y", yy + 16).attr("text-anchor", "end").attr("class", "ax").text(t.total);
      svg.append("line").attr("x1", labW).attr("x2", W - totW).attr("y1", yy + rh - 0.5).attr("y2", yy + rh - 0.5).attr("stroke", "#dcdad3").attr("stroke-width", 0.5);
      const cells = cents.map((c, i) => ({ c, i, v: t.cells[c], t })).filter(d => d.v);
      const g = svg.append("g");
      tipOn(g.selectAll("rect").data(cells).join("rect").attr("x", d => x(d.i) + 1).attr("y", yy + 1).attr("width", cw - 2).attr("height", rh - 3)
        .attr("fill", col(t)).attr("fill-opacity", d => 0.1 + 0.9 * Math.min(1, d.v[1] / 90)),
        d => "<b>" + esc(cap(shortDisease(t))) + "</b> <span class='m'>(" + esc(t.taxon) + ")</span><br>" + d.c + "s: " + d.v[0] + " of " + P.genomes[d.c] + " genomes · " + Math.round(d.v[1]) + "%");
      if (cw >= 20) g.selectAll("text").data(cells).join("text").attr("x", d => x(d.i) + cw / 2).attr("y", yy + rh / 2 + 3).attr("text-anchor", "middle")
        .attr("class", "cv").attr("fill", d => d.v[1] > 45 ? "#fbf8f1" : "#1a1a18").text(d => Math.round(d.v[1]));
    });
  }
  const fmtN = d3.format(",");
  const yearLab = v => v < 0 ? -v + " BCE" : v === 0 ? "0" : v + " CE";
  // metals 1: lead in childhood enamel, each bar spanning its exposure window
  function drawLead(svg, W) {
    const rows0 = LD.metals.lead, narrow = W < 480, H = narrow ? 240 : 300, m = { l: 34, r: 8, t: 14, b: 26 }; size(svg, W, H);
    // two-part time axis: 4200-900 BCE takes the first third, 900 BCE-2050 CE the rest (marked with a break)
    const brk = m.l + (W - m.l - m.r) * 0.32, x = d3.scaleLinear().domain([-4200, -900, 2050]).range([m.l, brk, W - m.r]), y = d3.scaleLog().domain([0.02, 14]).range([H - m.b, m.t]);
    [0.1, 1, 10].forEach(v => { svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "#dcdad3").attr("stroke-width", 0.6);
      svg.append("text").attr("x", m.l - 5).attr("y", y(v) + 3).attr("text-anchor", "end").attr("class", "ax").text(v); });
    svg.append("text").attr("x", m.l - 5).attr("y", m.t - 3).attr("text-anchor", "end").attr("class", "ax").text("ppm");
    (narrow ? [-4000, -2000, 0, 1000, 2000] : [-4000, -3000, -2000, -500, 0, 500, 1000, 1500, 2000]).forEach(v => svg.append("text").attr("x", x(v)).attr("y", H - 8).attr("text-anchor", "middle").attr("class", "ax").text(yearLab(v)));
    svg.append("path").attr("d", "M" + (brk - 3) + "," + (H - m.b + 4) + "l3,-7M" + (brk + 1) + "," + (H - m.b + 4) + "l3,-7").attr("stroke", "#8a8983").attr("fill", "none");
    svg.append("line").attr("x1", brk).attr("x2", brk).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "#dcdad3").attr("stroke-dasharray", "1 3");
    const base = rows0.find(r => r.series === "pooled_baseline");
    if (base) {
      svg.append("rect").attr("x", x(base.early)).attr("width", x(base.late) - x(base.early)).attr("y", y(base.ppm) - 1.5).attr("height", 3).attr("fill", CAT.metal).attr("fill-opacity", 0.22);
      svg.append("text").attr("x", x(base.early) + 4).attr("y", y(base.ppm) - 5).attr("class", "ax").text(narrow ? "pooled " + base.ppm + " ppm" : "pooled archaeological enamel " + base.ppm + " ppm (n = " + base.n + ")");
    }
    const brit = rows0.filter(r => r.series === "britain_chronological");
    svg.append("path").attr("d", d3.line().x(r => x((r.early + r.late) / 2)).y(r => y(r.ppm))(brit)).attr("fill", "none").attr("stroke", CAT.metal).attr("stroke-width", 0.9).attr("stroke-dasharray", "2 3").attr("opacity", 0.7);
    const shown = rows0.filter(r => ["britain_chronological", "roman_world_comparandum", "modern"].includes(r.series));
    tipOn(svg.append("g").selectAll("rect").data(shown).join("rect").attr("x", r => x(r.early)).attr("width", r => Math.max(3, x(r.late) - x(r.early))).attr("y", r => y(r.ppm) - 3).attr("height", 6)
      .attr("fill", r => r.series === "modern" ? "#7d5806" : CAT.metal).attr("fill-opacity", r => r.series === "roman_world_comparandum" ? 0.3 : 1),
      r => "<b>" + esc(cap(r.label)) + "</b>" + (r.series === "britain_chronological" ? " <span class='m'>(Britain)</span>" : "") + "<br>" + r.ppm + " ppm lead in childhood enamel" + (r.n ? " · n = " + r.n : "") + "<br><span class='m'>childhood exposure " + yearLab(r.early) + " – " + yearLab(r.late) + "</span>");
    // labels sit under their bars; the modern one sits above, flush right. Phones get a list under the chart instead.
    if (narrow) {
      const list = brit.concat(rows0.filter(r => r.series === "modern"));
      d3.select(svg.node().parentNode).insert("div", "svg + *").attr("class", "keylist").html(list.map(r => "<span><b>" + esc(cap(r.label)) + "</b> " + r.ppm + " ppm" + (r.n ? " · n=" + r.n : "") + "</span>").join(""));
      return;
    }
    brit.concat(rows0.filter(r => r.series === "modern")).forEach(r => {
      const modern = r.series === "modern", above = modern, anchor = modern ? "end" : "middle";
      const cx = modern ? W - m.r : Math.min(W - 44, Math.max(m.l + 30, x((r.early + r.late) / 2))), ty = above ? y(r.ppm) - 22 : y(r.ppm) + 15;
      svg.append("text").attr("x", cx).attr("y", ty).attr("text-anchor", anchor).attr("class", "rl").text(r.label);
      svg.append("text").attr("x", cx).attr("y", ty + 12.5).attr("text-anchor", anchor).attr("class", "ax").text(r.ppm + " ppm" + (r.n ? " · n=" + r.n : ""));
    });
    const rome = rows0.filter(r => r.series === "roman_world_comparandum");
    if (rome.length) { const top = d3.max(rome, r => r.ppm);
      svg.append("text").attr("x", x(d3.min(rome, r => r.early)) - 5).attr("y", y(top) + 3).attr("text-anchor", "end").attr("class", "ax").text("pale: Rome and Empire sites, " + rome.map(r => r.ppm).join(", ") + " ppm"); }
  }
  // metals 2: modern ÷ archaeological, eight elements
  function drawElements(svg, W) {
    const E = LD.metals.elements, narrow = W < 480, rh = 24, labW = narrow ? 80 : 92, valW = narrow ? 104 : Math.min(150, W * 0.3), H = E.length * rh + 30; size(svg, W, H);
    const x = d3.scaleLog().domain([0.5, 20]).range([labW, W - valW]);
    const NAME = { Cu: "copper", Cr: "chromium", Pb: "lead", Ni: "nickel", Zn: "zinc", Ba: "barium", Mg: "magnesium", Sr: "strontium" };
    svg.append("line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", 2).attr("y2", H - 22).attr("stroke", "#1a1a18").attr("stroke-width", 0.8);
    (narrow ? [0.5, 1, 5, 20] : [0.5, 1, 2, 5, 10, 20]).forEach(v => svg.append("text").attr("x", x(v)).attr("y", H - 8).attr("text-anchor", "middle").attr("class", "ax").text("×" + v));
    E.forEach((e, i) => {
      const y = 12 + i * rh, up = e.ratio >= 5, c = up ? CAT.metal : "#8a8983";
      svg.append("text").attr("x", labW - 10).attr("y", y + 4).attr("text-anchor", "end").attr("class", "rl").text(e.el + " " + (NAME[e.el] || ""));
      svg.append("line").attr("x1", x(1)).attr("x2", x(e.ratio)).attr("y1", y).attr("y2", y).attr("stroke", c).attr("stroke-width", up ? 3 : 2);
      tipOn(svg.append("circle").datum(e).attr("cx", x(e.ratio)).attr("cy", y).attr("r", 4).attr("fill", c),
        d => "<b>" + esc(cap(NAME[d.el] || d.el)) + "</b><br>archaeological " + d.arch + " ppm → modern " + d.modern + " ppm (×" + d.ratio + ")");
      svg.append("text").attr("x", W - valW + 8).attr("y", y + 4).attr("class", up ? "rl" : "ax").text(narrow ? e.arch + "→" + e.modern + " ×" + (+e.ratio.toFixed(1)) : e.arch + " → " + e.modern + " ppm  ×" + (+e.ratio.toFixed(1)));
    });
  }

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
  function drawCloud(k, alpha, sc) {
    const ctx = cloud.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), W = pairEl.clientWidth, H = pairEl.clientHeight;
    if (cloud.width !== Math.round(W * dpr) || cloud.height !== Math.round(H * dpr)) { cloud.width = Math.round(W * dpr); cloud.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!GL || alpha <= 0) return;
    const e = ease(k), cam = { yaw: VIEW.yaw * e, pitch: VIEW.pitch * e };
    ctx.fillStyle = "#1a1a18";
    TEETH.forEach(T => {
      const pts = CLOUD[T.key]; if (!pts) return;
      const cx = T.el.offsetLeft + T.el.clientWidth / 2, cy = T.el.offsetTop + H / 2, f = sc || 1;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(f, f); ctx.translate(-cx, -cy);
      dots(ctx, T.R, pts, T.R.basisFor(cam), T.el.offsetLeft, T.el.offsetTop, alpha, 0.08 + 0.92 * e, 0.8);
      ctx.restore();
    });
  }
  function tween(ms, f) { return new Promise(res => { const t0 = performance.now(); const st = now => { const k = Math.min(1, (now - t0) / ms); f(k); if (k < 1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); }); }
  function centerPair(on) {
    pairEl.style.transition = "none"; pairEl.style.transform = "";
    if (on) { const sr = stage.getBoundingClientRect(), pr = pairEl.getBoundingClientRect(); pairEl.style.transform = "translateX(" + ((sr.left + sr.width / 2) - (pr.left + pr.width / 2)) + "px)"; }
    void pairEl.offsetWidth; pairEl.style.transition = "";
  }
  function setupLineup() {
    const w = TEETH[0].el.clientWidth, H = pairEl.clientHeight, o = TEETH[0].el.offsetLeft, cam = TEETH[0].R.st.cam;
    const pxu0 = (H / 2) * cam.focal / cam.dist, fit = Math.min(1, (stage.clientWidth - 40) / (4.7 * pxu0)), pxu = pxu0 * fit, mid = o + w, d = 0.98 * pxu;
    const pos = [["molar", mid - 1.5 * d], ["pm1", mid - 0.5 * d], ["pm2", mid + 0.5 * d], ["canine", mid + 1.5 * d]];
    const shM = (o + 0.5 * w) - pos[0][1], shC = (o + 1.5 * w) - pos[3][1];
    lineup.innerHTML = "<div class='box'></div>" + pos.map(([k, c], i) => "<canvas data-i='" + i + "' style='left:" + (c - w / 2) + "px;width:" + w + "px;opacity:0'></canvas>").join("") +
      "<div class='lbl' data-i='0' style='left:" + pos[0][1] + "px'>FIRST MOLAR</div><div class='lbl' data-i='3' style='left:" + pos[3][1] + "px'>FIRST CANINE</div><div class='arrows'>→ ←</div>";
    const box = lineup.querySelector(".box");
    Object.assign(box.style, { left: (pos[0][1] - 0.85 * pxu) + "px", width: (pos[3][1] - pos[0][1] + 1.6 * pxu) + "px", top: "-4px", height: (H + 8) + "px" });
    lineup.querySelectorAll(".lbl").forEach(l => { l.style.top = (stage.clientWidth < 900 ? 46 : 8) + "px"; });   // clear of Skip intro on narrow screens
    lineup.querySelector(".arrows").style.top = (H - 44) + "px";
    const dpr = Math.min(devicePixelRatio || 1, 2), R = TEETH[0].R, b = R.basisFor({ yaw: 0, pitch: 0 });
    lineup.querySelectorAll("canvas").forEach(cv => {
      const i = +cv.dataset.i, pts = LINE[pos[i][0]] || [];
      cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px";
      const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#1a1a18";
      ctx.translate(w / 2, H / 2); ctx.scale(fit, fit); ctx.translate(-w / 2, -H / 2);
      dots(ctx, R, pts, b, 0, 0, 1, 0.08, 0.75);
    });
    return { w, shM, shC, fit };
  }
  // the opened jaw steps aside, its ringed teeth nearest the lineup; faint where there is no room beside it
  function jawAside() {
    const jb = $("#jaw").getBoundingClientRect(), bb = lineup.querySelector(".box").getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = 0.72;
    const right = bb.left - 18, dx = right - sc * jb.width / 2 - (jb.left + jb.width / 2);
    Object.assign(jawLayer.style, { transform: "translateX(" + dx + "px) scale(" + sc + ")", opacity: right - sc * jb.width >= sr.left ? 0.7 : 0.22 });
  }
  async function intro() {
    const run = ++introRun, alive = () => run === introRun;
    S.scene = "intro"; pause(); leaveRadial(); stage.classList.remove("dashboard", "haspanel"); panelEl.hidden = true; stage.classList.add("intro"); gParts.selectAll("*").remove(); gLabels.selectAll("*").remove();
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
    await tween(700, k => { drawCloud(0, k, L.fit); lineup.querySelectorAll("canvas").forEach(im => { const i = +im.dataset.i; if (i === 0 || i === 3) im.style.opacity = 1 - k; }); });
    if (!alive()) return;
    await tween(2400, k => drawCloud(k, 1, L.fit + (1 - L.fit) * ease(k))); if (!alive()) return;
    // 4 · everything fades in, with the timeline at its beginning
    enterMain(true);
    cloud.style.transition = "opacity 1.2s"; cloud.style.opacity = 0;
    await wait(1300); drawCloud(0, 0); cloud.style.transition = ""; cloud.style.opacity = 1;
    await wait(900);
    if (S.scene === "main") play();
  }
  function enterMain(fromIntro) {
    introRun++; clearTimeout(layersTimer);
    leaveWear(); S.scene = "main"; S.layer = null; S.show = "all"; lineup.innerHTML = ""; jawLayer.style.opacity = 0;
    if (!fromIntro) drawCloud(0, 0);
    pairEl.style.transform = "";
    leaveRadial(); stage.classList.remove("intro", "dashboard", "haspanel");
    panelEl.hidden = true;
    setShapes(); setT(S.t); setPage();
  }
  $("#skip").onclick = () => { enterMain(false); if (REDUCED) enterRadial(false); else setTimeout(play, 500); };
  $("#again").onclick = () => { S.t = T_MIN; enterMain(false); setTimeout(play, 300); };
  $("#rhBack").onclick = () => enterRadial(false);
  document.querySelectorAll("#rhIdx [data-l]").forEach(b => { b.onclick = () => openLayer(b.dataset.l); });

  // ------------------------------------------------------------------ start
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => {
    if (S.scene === "main") { setShapes(); setT(S.t); }
    else if (S.scene === "radial") { if (radial) radial.resize(); }
    else if (S.scene === "layer") openLayer(S.layer);
  }, 150); });
  (async function start() {
  try { await window.ToothGL.loadModels(); } catch (e) { console.warn("tooth models not loaded; using constructed shapes", e); }
  try { await loadJaw(); } catch (e) { console.warn("jaw engraving not loaded; the intro starts at the lineup", e); }
  if (document.fonts) document.fonts.ready.then(() => { if (liveTeeth()) requestRender(false); else if (S.scene === "radial" && radial) radial.resize(); });
  G = composite(S.t);
  if (GL) { snapshots(); TEETH.forEach(T => T.R.setParams(paramsFor(T))); }
  let q = null; try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
  const qs = k => q && q.get(k);
  if (qs("debug")) window.__dbg = { TEETH, S };
  if (qs("notrans")) document.head.insertAdjacentHTML("beforeend", "<style>*{transition:none!important}</style>");
  if (qs("t")) S.t = +qs("t");
  if (qs("region")) S.region = qs("region");
  if (qs("jaw")) { S.jaw = qs("jaw"); if (GL) { snapshots(); } }
  const sc = qs("scene");
  if (REDUCED || sc === "main" || sc === "radial" || sc === "layers" || sc === "layer") {
    enterMain(false);
    if (REDUCED || sc === "radial" || sc === "layers") enterRadial(!!qs("animate"));
    else if (sc === "layer") { openLayer(({ morphology: "wear" })[qs("layer")] || qs("layer") || "pathogens"); }
    else if (qs("play") === "1") play();
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
