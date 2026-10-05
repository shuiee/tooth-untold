// Section 4 right-hand page: the metals plate studies (Plates 4.A and 4.B). Defines window.MetalsPlates and
// window.MetalPlate; app.js mounts it when the Metals section opens.
/* Section 4 · right-hand page: metals plate studies (moved in from metals-plate-studies.html; edit here) */
(function(){ let ready = false;
  window.MetalsPlates = { html: "<div class=\"dp\" id=\"mpPanel\">\n\n  <header class='sec'><span class='no'>4</span><h2>Metals</h2><p class='dek'>Lead and other metals in childhood enamel, from the Neolithic to the 20th century</p></header>\n\n  <!-- ===================================== Plate 4: the era, then the radial chart, the time axis, and the series under it -->\n  <figure class=\"fig\" id=\"plateA\">\n    <div class=\"sheet\">\n      <span class=\"tag\"><b>Metals in enamel</b> · overlay and series</span>\n      <span class=\"tag r\">log scales</span>\n      <div class=\"kpis\" id=\"kpis\" aria-live=\"polite\"></div>\n      <div class=\"bloom\"><svg id=\"bloomSvg\" viewBox=\"-415 -345 830 700\" role=\"img\" aria-label=\"Overlaid radial shapes, one per period, on seven element spokes\"></svg><div class=\"readout\" id=\"bloomRead\" aria-live=\"polite\"></div></div>\n      <div class=\"tl\" data-tl=\"A\"></div>\n      <svg id=\"cometSvg\" viewBox=\"0 0 600 548\" role=\"img\" aria-label=\"Every element in childhood enamel, era by era, on one ppm log scale: lead as glowing orbs per era with tails from the lowest to the highest child; the other seven as their pooled archaeological level and a step to their 20th-century value. Hover a line to read it.\"></svg>\n      <div class=\"isokey\">\n        <span><i class=\"dot\"></i>lead: median per era (mean in the 20th century); bigger orb, more teeth sampled</span>\n        <span><i class=\"whisk\"></i>tail: lowest to highest tooth</span>\n        <span>other metals: one pooled archaeological value (no per-era data), then the 20th-century mean</span><span>hover a line to read it</span>\n      </div>\n    </div>\n    <ol class=\"notes\" data-notes></ol>\n  </figure>\n\n  </div><div id=\"mpTip\" role=\"tooltip\"></div>",
  mount() { ready = false; (function(){
"use strict";
if (!window.d3) { document.getElementById("mpPanel").insertAdjacentHTML("beforeend","<p>d3 did not load: check the connection and reload.</p>"); return; }
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = v => getComputedStyle(document.getElementById("mpPanel")).getPropertyValue(v).trim();

// ------------------------------------------------------------------ data (every value traces to source/layer data/Metals Viz)
// Periods follow the British chronological lead series (Montgomery et al. 2010) plus 20th-century births (Kamenov et al. 2018).
// Years are the childhood exposure window (exposure_early / exposure_late in c3b_lead_timeline_data.csv).
// ctx lines are historical context, not data.
const PERIODS = [
  { key:"neo",   name:"Neolithic",      short:"Neolithic",    y:[-4040,-2525], n:31, col:"#9a8fbf", ctx:"Before metalworking." },
  { key:"bronze",name:"Bronze Age",     short:"Bronze Age",   y:[-2540,-825], n:13, col:"#8a78c4", ctx:"Copper and tin; almost no lead." },
  { key:"iron",  name:"Iron Age",       short:"Iron Age",     y:[-840,18],   n:10,  col:"#7a63c9", ctx:"Little lead in circulation." },
  { key:"roman", name:"Roman",          short:"Roman",        y:[3,375],     n:25,  col:"#3f72c4", ctx:"Roman mines, pipes and pewter." },
  { key:"post",  name:"Post-Roman",     short:"Post-Roman",   y:[360,675],   n:50,  col:"#3c9a6e", ctx:"Mines fall idle." },
  { key:"early", name:"Early medieval", short:"Early med.",   y:[660,1075],  n:26,  col:"#d4a21f", ctx:"Mines reopen." },
  { key:"late",  name:"Late medieval",  short:"Late med.",    y:[1160,1475], n:26,  col:"#d0612b", ctx:"Pewter and lead-glazed pottery." },
  { key:"c20",   name:"20th century",   short:"20th c.",      y:[1860,1975], n:77,  col:"#b0362f", ctx:"Leaded petrol, paint, industry." }
];
const LEAD = [0.1, 0.06, 0.06, 1.21, 0.39, 1.93, 4.69, 6.55];           // ppm: Britain medians, then 20th-century births (mean)
const POOLED = { Cu:0.25, Cr:0.072, Ni:0.24, Zn:145, Ba:3.2, Sr:188, Mg:2430 };   // Kamenov 2018 Table 1, archaeological enamel (Florida, Philippines, Peru), n = 38
// ranges, lowest to highest individual: lead from Montgomery 2010 Table 11.4 (British eras) and Kamenov 2018 Table 1 (20th century, n = 77)
const PB_RANGE = [[0.03, 0.68], [0.003, 0.13], [0.04, 0.15], [0.24, 30.1], [0.13, 8.16], [0.03, 31.6], [0.02, 14.5], [0.04, 45.5]];
// Kamenov 2018 Table 1, modern enamel min–max ("bdl", below detection, is drawn from the floor)
const MOD_RANGE = { Cu:[0.01, 32.9], Cr:[null, 10.3], Ni:[0.11, 36.5], Zn:[80.4, 474], Ba:[0.52, 31.3], Sr:[58, 1344] };
const PB_ARCH_MEAN = 0.63;   // Kamenov 2018 archaeological enamel, for the like-for-like 20th-century comparison
const MODERN = { Cu:3.6,  Cr:0.8,   Ni:2.2,  Zn:215, Ba:4.6, Sr:168, Mg:3075 };   // 20th-century births
const ELS = [
  { el:"Pb", name:"Lead",      v:"--pb" }, { el:"Cu", name:"Copper",   v:"--cu" }, { el:"Cr", name:"Chromium", v:"--cr" },
  { el:"Ni", name:"Nickel",    v:"--ni" }, { el:"Zn", name:"Zinc",     v:"--zn" }, { el:"Ba", name:"Barium",   v:"--ba" },
  { el:"Sr", name:"Strontium", v:"--sr" }, { el:"Mg", name:"Magnesium", v:"--mg" }
];
// one cell: ppm, its index against the element's first value on this timeline, and whether it is the pooled stand-in
function cell(el, p) {
  // every index reads against the pooled archaeological level in the same study (Kamenov et al. 2018): lead 0.63 ppm
  const last = PERIODS.length - 1;
  if (el === "Pb") return { ppm: LEAD[p], x: LEAD[p] / PB_ARCH_MEAN, pooled: false };
  const ppm = p === last ? MODERN[el] : POOLED[el];
  return { ppm, x: ppm / POOLED[el], pooled: p < last };
}
const fmtX = x => "×" + (x >= 10 ? Math.round(x) : (+x.toFixed(1)).toString());
const fmtP = v => (v >= 100 ? d3.format(",")(v) : String(v)) + " ppm";   // exactly as in the source CSV
const yr = v => v < 0 ? -v + " BCE" : v + " CE";
const yrs = p => yr(p.y[0]) + " – " + yr(p.y[1]);

// ------------------------------------------------------------------ shared geometry
const LO = 0.5, HI = 150;
const rad = (x, R, r0 = 0) => r0 + (R - r0) * Math.max(0, Math.min(1, (Math.log(x) - Math.log(LO)) / (Math.log(HI) - Math.log(LO))));
// Plates 4.A and 4.B: one shared log scale in ppm, so every element sits at its measured concentration
const PLO = 0.03, PHI = 4000;
const radP = (v, R, r0 = 0) => r0 + (R - r0) * Math.max(0, Math.min(1, (Math.log(v) - Math.log(PLO)) / (Math.log(PHI) - Math.log(PLO))));
// Plates 4.A and 4.B now draw change from the archaeological level in the same study, not raw concentration: magnesium,
// strontium and zinc sit in every tooth at hundreds to thousands of ppm, so raw ppm made them look like the story.
const XLO = 0.08, XHI = 20;
const radX = (x, R, r0 = 0) => r0 + (R - r0) * Math.max(0, Math.min(1, (Math.log(x) - Math.log(XLO)) / (Math.log(XHI) - Math.log(XLO))));
const pt = (a, r) => [Math.sin(a) * r, -Math.cos(a) * r];
// a closed petal: spoke values joined through pinched valleys between neighbours, as in the reference poster
function petalPath(radii, angles, valley = 0.5, floor = 4) {
  const n = radii.length, P = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a0 = angles[i], a1 = j ? angles[j] : angles[0] + 2 * Math.PI;
    P.push([a0, Math.max(floor, radii[i])]);
    const lo = Math.min(radii[i], radii[j]), hi = Math.max(radii[i], radii[j]);
    P.push([(a0 + a1) / 2, Math.max(floor * 0.8, lo * valley + hi * 0.24)]);
  }
  return d3.lineRadial().angle(d => d[0]).radius(d => d[1]).curve(d3.curveCatmullRomClosed.alpha(0.5))(P);
}
function morph(sel, from, to, angles, valley, dur) {
  if (reduced || !from) { sel.attr("d", petalPath(to, angles, valley)); return; }
  const it = d3.interpolateArray(from, to);
  sel.transition().duration(dur).ease(d3.easeCubicInOut).attrTween("d", () => t => petalPath(it(t), angles, valley));
}

// the start of the record is a value, not zero: say "start" there, and mark the pooled stand-ins
const xLabel = (c, p) => c.pooled ? "×1, pooled" : fmtX(c.x);

// change against the era just before: ▲ red for more metal, ▼ green for less
function delta(el, p) {
  if (p === 0) return { dir: "first", line1: "first era", line2: "on the timeline", short: "first era" };
  const now = cell(el, p), before = cell(el, p - 1), r = now.ppm / before.ppm;
  // no per-era measurement exists for this element before 1900: say so rather than imply it held steady
  if (now.pooled) return { dir: "same", line1: "no era data", line2: "pooled sample", short: "no data" };
  const prev = before.pooled ? "pooled archaeological" : PERIODS[p - 1].name;
  const f = (r > 1 ? r : 1 / r).toFixed(1) + "×";
  return r > 1 ? { dir: "up", line1: "▲ " + f + " more", line2: "than " + prev, short: "▲ " + f }
               : { dir: "down", line1: "▼ " + f + " less", line2: "than " + prev, short: "▼ " + f };
}

// ------------------------------------------------------------------ tooltip
const tip = document.getElementById("mpTip");
function showTip(ev, html) { tip.innerHTML = html; tip.style.opacity = 1;
  const w = tip.offsetWidth, h = tip.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px"; }
const hideTip = () => tip.style.opacity = 0;
const tipOn = (sel, html) => sel.on("mousemove", (ev, d) => showTip(ev, html(d))).on("mouseleave", hideTip);
const cellTip = (e, p) => { const c = cell(e.el, p), P = PERIODS[p];
  return "<b>" + e.name + ", " + P.name + "</b><br>" + fmtP(c.ppm) + " in childhood enamel · " + fmtX(c.x) +
    "<br><span class='m'>" + (c.pooled ? "no per-era measurement: pooled archaeological enamel from Florida, the Philippines and Peru (Kamenov 2018, n = 38)" : (P.n ? "n = " + P.n + " · " : "") + "childhood " + yrs(P)) + "</span>"; };

// ------------------------------------------------------------------ timeline (one per plate)
function timeline(host, onChange, start = 3) {
  host.innerHTML = "<button class='mp-replay' type='button' aria-label='Replay the periods' title='Replay'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M7.6 6.1A8 8 0 1 1 4.4 11.4'/><path d='M3.6 5.2 7.7 6.2 7.2 10.3'/></svg></button>" +
    "<div class='track' role='group' aria-label='Periods'><div class='base'></div><div class='fill'></div></div>";
  const btn = host.querySelector(".mp-replay"), track = host.querySelector(".track"), fill = host.querySelector(".fill");
  const stops = PERIODS.map((P, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "stop";
    b.style.left = (i / (PERIODS.length - 1) * 100) + "%"; b.innerHTML = "<i></i><span>" + P.short + "</span>";
    b.setAttribute("aria-label", P.name + ", " + yrs(P)); b.onclick = () => { stop(); set(i); }; track.appendChild(b); return b; });
  let cur = -1, timer = null;
  function set(i) {
    i = Math.max(0, Math.min(PERIODS.length - 1, i)); if (i === cur) return; cur = i;
    stops.forEach((b, k) => { b.classList.toggle("cur", k === i); b.classList.toggle("past", k < i); b.setAttribute("aria-current", k === i ? "step" : "false"); });
    fill.style.clipPath = "inset(0 " + (100 - i / (PERIODS.length - 1) * 100) + "% 0 0)";
    onChange(i);
    if (host.dataset.tl === "A" && ready && window.MetalPlate && MetalPlate.setPeriod) MetalPlate.setPeriod(i);
    if (host.dataset.tl === "A") { window.METALS_ERA = { i, x: Object.fromEntries(ELS.map(e => [e.el, cell(e.el, i).x])) }; window.dispatchEvent(new CustomEvent("metals:era", { detail: window.METALS_ERA })); }
  }
  // plays through once, from the first period to the last, and stops there; a click or a key on a period stops it
  // where the reader put it; the replay button runs it again from the start
  function run() { clearInterval(timer); timer = setInterval(() => { if (!host.isConnected || cur >= PERIODS.length - 1) { clearInterval(timer); return; } set(cur + 1); }, 1800); }
  function stop() { clearInterval(timer); }
  btn.onclick = () => { stop(); cur = -1; set(0); if (!reduced) run(); };
  track.addEventListener("keydown", e => { if (e.key === "ArrowRight") { stop(); set(cur + 1); stops[cur].focus(); e.preventDefault(); }
    if (e.key === "ArrowLeft") { stop(); set(cur - 1); stops[cur].focus(); e.preventDefault(); } });
  set(0); if (!reduced) run();
}

// shared notes, in the main page's wording
const NOTES = [
  "Both plates draw change, not concentration: each element against its pooled archaeological level in the same study (Kamenov et al. 2018; lead 0.63 ppm), on a log scale where ×1 is no change. In raw ppm, magnesium (about 2,400–3,100), strontium and zinc dwarf everything because they are part of enamel itself; lead's story is how far it climbs. The labels still give each value in ppm.",
  "Only lead is measured era by era (Montgomery et al. 2010, Table 11.4: British medians and ranges). Copper, chromium, nickel, zinc, barium, strontium and magnesium have one pooled archaeological value (Kamenov et al. 2018, Table 1), drawn hollow. Their flat run is an absence of per-era data, not evidence that nothing changed.",
  "That pooled sample is not European: its archaeological teeth come from prehistoric and early-historic Florida, the Philippines and Peru (n = 38). The 20th-century values are means from 77 modern teeth from Europe, the Americas, the Caribbean and Africa. Read the six non-lead elements as a then-and-now comparison, not a British series.",
  "The last step in lead mixes studies: a 20th-century mean (Kamenov) against a late-medieval British median (Montgomery). The like-for-like figure, inside Kamenov, is 0.63 to 6.55 ppm, about ten-fold.",
  "Zinc and copper are regulated by the body, so their enamel values reflect physiology as much as exposure. The line under each era name is historical context, not data."
];
const NOTES_B = [
  "This plate draws concentration, in ppm on one log scale, so every element can be read against the others. Magnesium (about 2,400–3,100 ppm), strontium and zinc sit high because they are part of enamel itself; read each line for its own change, as Plate 4.A does.",
  "Only lead is measured era by era (Montgomery et al. 2010, Table 11.4: British medians and ranges). Copper, chromium, nickel, zinc, barium, strontium and magnesium have one pooled archaeological value (Kamenov et al. 2018, Table 1), drawn as one level across the archaeological eras; its orb travels along it as the timeline plays. Their flat run is an absence of per-era data, not evidence that nothing changed. Copper (0.25 ppm) and nickel (0.24) are drawn a few pixels apart so both lines read.",
  NOTES[2], NOTES[3]
];
const NOTES_ALL = [NOTES[0].replace("Both plates draw change, not concentration:", "The radial chart draws change, not concentration:"), NOTES_B[0], NOTES_B[1], NOTES[2], NOTES[3], NOTES[4]];
document.querySelectorAll("[data-notes]").forEach(ol => ol.innerHTML = NOTES_ALL.map(n => "<li>" + n + "</li>").join(""));

// ------------------------------------------------------------------ spokes for the element dial (Plates A and B)
const EA = ELS.map((_, i) => i / ELS.length * 2 * Math.PI);
function elementSpokes(g, R, labels, r0) {
  [0.1, 1, 10].forEach(v => g.append("circle").attr("class", "ring" + (v === 1 ? " one" : "")).attr("r", radX(v, R, r0)));
  if (labels) [0.1, 1, 10].forEach(v => g.append("text").attr("class", "ax").attr("x", 4).attr("y", -radX(v, R, r0) - 3).text("×" + v + (v === 1 ? " archaeological level" : "")));
  EA.forEach((a, i) => {
    const [x, y] = pt(a, R + (labels ? 10 : 4));
    g.append("line").attr("class", "spoke").attr("x2", x).attr("y2", y);
    g.append("circle").attr("cx", x).attr("cy", y).attr("r", labels ? 3 : 2).attr("fill", css("--ink"));
  });
}

// ------------------------------------------------------------------ the era's key figures, as pictograms (laid out as on the caries plate)
// One dot is a tenth of the pooled archaeological average (0.63 ppm, Kamenov et al. 2018), so the dots stand in exact
// ratio. First figure: the era's lead as that many dots, black up to the archaeological average, lead-coloured above
// it, mixed. Second: the same dots with the lead pulled out of the black, so the whole is the ×-figure times the black
// (below the average, only the era's few black dots). Third: lead flowing
// into a child's open mouth, faster the higher the most-exposed child's value.
const DOT = PB_ARCH_MEAN / 10;
// the child, a line drawing (after the team's sketch), traced at its own scale (about 1000 units tall) and drawn
// mirrored to face left, the mouth thrown wide open between the upper lip and the jutting chin
const HEAD =
  "M320,935C350,890 380,850 360,820C345,780 330,750 318,735C290,712 260,695 240,680C160,630 100,590 75,520C45,440 50,330 80,230C110,140 190,80 300,55C400,35 500,40 560,50" +
  "C620,62 660,95 690,125C715,150 730,170 750,180C790,198 830,205 842,225C850,240 830,255 800,265C790,270 795,282 800,292C800,298 795,305 785,310" +   // crown, forehead, nose, upper lip
  "C720,350 650,390 600,410C520,440 440,465 400,505C360,545 370,610 420,665C470,715 540,745 610,745C680,740 760,700 860,630C870,628 872,636 868,645" +  // the mouth, open wide
  "C850,700 820,760 760,790C710,812 650,815 625,830C605,845 618,880 630,915C640,945 650,960 652,968C600,990 480,1000 400,985C350,975 320,960 320,935Z" + // chin, jaw, throat, neck
  "M318,298C380,265 460,225 520,185C545,165 560,140 540,132C510,128 495,118 510,105C530,90 570,95 595,78C602,74 605,70 607,68" +                       // the hair's edge
  "M318,298C270,290 210,300 190,350C175,400 185,460 230,488C260,500 300,500 318,497C322,560 335,640 318,735" +                                     // the ear, the back of the neck
  "M520,210L660,220M628,162L540,275"                                                                                                               // the eye
let kpi = null;
function buildKPIs() {
  const host = document.getElementById("kpis");
  host.innerHTML = "<p class='cp-era'></p><p class='cp-yrs'></p><div class='cp-stats mp-stats'>" +
    "<div><svg class='pg mp-pg' viewBox='0 0 120 80' role='img'></svg><div><b class='s1'></b><span class='c1'></span></div></div>" +
    "<div><svg class='pg mp-pg' viewBox='0 0 120 80' role='img'></svg><div><b class='s2'></b><span class='c2'></span></div></div>" +
    "<div><svg class='pg mp-pg' viewBox='0 0 120 80' role='img'></svg><div><b class='s3'></b><span class='c3'></span></div></div></div>";
  const svgs = host.querySelectorAll(".mp-pg"), pb = css("--pb"), ink = css("--ink");
  // a fixed random order, so the black dots fall in different places of the cloud but stay put between eras
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, key = d3.range(400).map(rnd);
  const phyllo = (i, cx, cy, c) => { const r = c * Math.sqrt(i + 0.5), a = i * 2.39996; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const g1 = d3.select(svgs[0]).append("g"), g2 = d3.select(svgs[1]).append("g");
  const s3 = d3.select(svgs[2]), flow = s3.append("g");
  s3.append("path").attr("class", "mp-head").attr("d", HEAD).attr("transform", "translate(123,2) scale(-0.075,0.075)").attr("vector-effect", "non-scaling-stroke");
  // the particles come in from the left and funnel through the gap between the upper lip and the chin (the nose's tip
  // is at about (59.6, 20), the chin's at (57.8, 50)), ending inside the mouth, so none crosses the face or body: each
  // runs a curve from its start, through a point in the gap, to the back of the mouth
  const gap = [63, 38], mouth = [87, 42.5];
  const pathAt = q => { const u = q.t;
    if (u < 0.7) { const v = u / 0.7, cx = (q.x + gap[0]) / 2 + 6, cy = q.g; return [(1 - v) * (1 - v) * q.x + 2 * (1 - v) * v * cx + v * v * gap[0], (1 - v) * (1 - v) * q.y + 2 * (1 - v) * v * cy + v * v * q.g]; }
    const v = (u - 0.7) / 0.3; return [gap[0] + (mouth[0] - gap[0]) * v, q.g + (mouth[1] - q.g) * v]; };
  let rate = 0, parts = [], t0 = performance.now(), spawn = 0;
  const tick = now => {
    if (!svgs[2].isConnected) return;
    const dt = Math.min(0.1, (now - t0) / 1000); t0 = now; spawn += rate * dt;
    while (spawn >= 1) { spawn -= 1; parts.push({ x: 2 + rnd() * 24, y: 14 + rnd() * 56, g: gap[1] + (rnd() - 0.5) * 12, t: 0, d: 1.1 + rnd() * 0.6 }); }
    parts.forEach(q => { q.t += dt / q.d; }); parts = parts.filter(q => q.t < 1);
    flow.selectAll("circle").data(parts).join("circle").attr("r", q => 2 * (1 - 0.6 * q.t)).attr("fill", pb)
      .attr("opacity", q => Math.min(1, q.t * 5) * (1 - Math.pow(q.t, 6)))
      .attr("cx", q => pathAt(q)[0]).attr("cy", q => pathAt(q)[1]);
    requestAnimationFrame(tick);
  };
  if (!reduced) requestAnimationFrame(tick);
  kpi = { host, g1, g2, pb, ink, key, phyllo, setRate: r => { rate = r; if (reduced) { parts = d3.range(10).map(k => ({ x: 6, y: 26 + k * 3, g: 33 + k * 1.1, t: k / 10, d: 1 })); tick(performance.now()); } }, svgs };
}
function renderKPIs(p) {
  if (!kpi || !kpi.host.isConnected) buildKPIs();
  const P = PERIODS[p], c20 = p === PERIODS.length - 1, L = LEAD[p], ratio = L / PB_ARCH_MEAN, hi = PB_RANGE[p] ? PB_RANGE[p][1] : null;
  const q = sel => kpi.host.querySelector(sel), dur = reduced ? 0 : 700;
  q(".cp-era").textContent = P.name;
  q(".cp-yrs").textContent = "CHILDHOOD " + yrs(P).toUpperCase() + " · n = " + P.n + (c20 ? " modern teeth" : " children");
  q(".s1").innerHTML = L + "<small>ppm</small>";
  q(".c1").innerHTML = (c20 ? "mean" : "median") + " lead in childhood enamel <i>each dot " + (+DOT.toFixed(3)) + " ppm; black up to the archaeological average</i>";
  q(".s2").innerHTML = "×" + fmtX(ratio).slice(1); q(".s2").classList.toggle("up", ratio > 1);
  q(".c2").innerHTML = "the pooled archaeological average, 0.63 ppm <i>" + (ratio > 1 ? "the lead above it, pulled out" : "below it: only the era's own dots") + "</i>";
  q(".s3").innerHTML = hi != null ? hi + "<small>ppm</small>" : "—";
  q(".c3").innerHTML = "in the most-exposed " + (c20 ? "modern tooth" : "child") + " of the " + P.n + " sampled";
  // the dots: n of them, the first ten black (the average), the rest lead
  const n = Math.max(1, Math.round(L / DOT)), D = d3.range(n).map(k => ({ k, black: k < 10 }));
  const slot = D.slice().sort((a, b) => kpi.key[a.k] - kpi.key[b.k]); slot.forEach((d, i) => { d.s = i; });
  const c1 = Math.min(4, 36 / Math.sqrt(n + 1));
  const reds = D.filter(d => !d.black), cR = Math.min(4, 33 / Math.sqrt(reds.length + 1));
  D.forEach(d => { d.p1 = kpi.phyllo(d.s, 60, 40, c1); d.p2 = d.black ? kpi.phyllo(d.k, 20, 40, 4) : kpi.phyllo(d.k - 10, 80, 40, cR); });
  const dots = (g, at) => g.selectAll("circle").data(D, d => d.k).join(
      en => en.append("circle").attr("r", 0).attr("cx", d => at(d)[0]).attr("cy", d => at(d)[1]),
      up => up, ex => ex.transition().duration(dur).attr("r", 0).remove())
    .attr("fill", d => d.black ? kpi.ink : kpi.pb)
    .transition().duration(dur).attr("r", 2.7).attr("cx", d => at(d)[0]).attr("cy", d => at(d)[1]);
  dots(kpi.g1, d => d.p1); dots(kpi.g2, d => d.p2);
  kpi.svgs[0].setAttribute("aria-label", n + " dots: " + Math.min(n, 10) + " black, the archaeological average, and " + Math.max(0, n - 10) + " lead-coloured above it");
  kpi.svgs[1].setAttribute("aria-label", ratio > 1 ? "the " + (n - 10) + " lead dots pulled out of the 10 black: ×" + ratio.toFixed(1) : n + " black dots, below the average's 10");
  kpi.svgs[2].setAttribute("aria-label", "lead flowing into a child's open mouth");
  kpi.setRate(hi != null ? 3 + 8 * Math.log2(1 + hi) : 0);   // particles a second: faster for a more exposed child
}

// ------------------------------------------------------------------ Plate 4.A: overlay bloom
// one translucent shape per period across the seven element spokes; radius is concentration on one shared ppm scale
(function plateA() {
  const R = 205, R0A = 22, svg = d3.select("#bloomSvg"), g = svg.append("g");
  elementSpokes(g, R, true, R0A);
  const labs = ELS.map((e, i) => {
    const a = EA[i], [x, y] = pt(a, R + 30), an = Math.abs(x) < 20 ? "middle" : x > 0 ? "start" : "end", dy = y < -R ? -76 : y > R * 0.5 ? 14 : -24;
    const t = g.append("g").attr("transform", "translate(" + x + "," + (y + dy) + ")");
    t.append("text").attr("class", "sym").attr("text-anchor", an).style("fill", "var(" + e.v + ")").text(e.el);
    return { ppm: t.append("text").attr("class", "x").attr("text-anchor", an).attr("y", 24),
             d1: t.append("text").attr("class", "dl").attr("text-anchor", an).attr("y", 46),
             d2: t.append("text").attr("class", "dl2").attr("text-anchor", an).attr("y", 65) };
  });
  const blobs = g.append("g"), verts = g.append("g");
  const paths = PERIODS.map(P => blobs.append("path").attr("fill", P.col).attr("stroke-width", 1.2).attr("opacity", 0));
  const radiiOf = p => ELS.map(e => radX(cell(e.el, p).x, R, R0A));
  let last = null;
  const read = document.getElementById("bloomRead");
  timeline(document.querySelector("[data-tl=A]"), p => {
    paths.forEach((path, k) => {
      if (k > p) { path.interrupt().interrupt("op").attr("opacity", 0); return; }
      if (k < p) { path.interrupt().interrupt("op").attr("d", petalPath(radiiOf(k), EA)).transition("op").duration(reduced ? 0 : 500).attr("opacity", .15).attr("stroke", css("--earlier")).attr("stroke-opacity", .9); return; }
      path.interrupt("op").attr("stroke", null).transition("op").duration(reduced ? 0 : 400).attr("opacity", .27);
      morph(path, last, radiiOf(k), EA, 0.5, 750);
    });
    last = radiiOf(p);
    const pts = ELS.map((e, i) => ({ e, i, c: cell(e.el, p), r: last[i] }));
    tipOn(verts.selectAll("circle").data(pts).join("circle").attr("class", "vx")
      .transition().duration(reduced ? 0 : 750).attr("cx", d => pt(EA[d.i], d.r)[0]).attr("cy", d => pt(EA[d.i], d.r)[1]).selection()
      .attr("r", 4.2).attr("fill", d => d.c.pooled ? css("--card") : css("--ink")).attr("stroke", css("--ink")).attr("stroke-width", 1.3), d => cellTip(d.e, p));
    labs.forEach((t, i) => { const c = cell(ELS[i].el, p), d = delta(ELS[i].el, p);
      t.ppm.text(fmtP(c.ppm)); t.d1.text(d.line1).attr("class", "dl " + d.dir); t.d2.text(d.line2); });
    const P = PERIODS[p];
    renderKPIs(p);
    read.innerHTML = "<p class='per'>" + P.name + "</p><p class='yrs'>CHILDHOOD " + yrs(P).toUpperCase() + (P.n ? " · n = " + P.n : "") + "</p>" +
      "<p class='ctx'>" + P.ctx + "<small>context, not data</small></p><dl>" +
      "<dt></dt><dd></dd><dd class='h'>ppm</dd>" +
      ELS.map(e => { const c = cell(e.el, p); return "<dt style='color:var(" + e.v + ")'>" + e.el + "</dt><dd>" + e.name + "</dd><dd class='v" + (c.pooled ? " pooled" : "") + "'>" + fmtP(c.ppm).replace(" ppm", "") + "</dd>"; }).join("") + "</dl>";
  });
})();

// ------------------------------------------------------------------ Plate 4.B: every element, era by era
// Grain and glow after the team's orb reference.
(function plateB() {
  const svg = d3.select("#cometSvg"), W = 600, last = PERIODS.length - 1;
  const defs = svg.append("defs");
  defs.html(
    "<filter id='mpGrain' x='-60%' y='-60%' width='220%' height='220%'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='1' seed='7' result='t'/>" +
    "<feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75' result='m'/><feComposite in='SourceGraphic' in2='m' operator='in'/></filter>" +
    "<filter id='mpGlow' x='-100%' y='-100%' width='300%' height='300%'><feGaussianBlur stdDeviation='7'/></filter>" +
    "<filter id='mpSoft' x='-100%' y='-100%' width='300%' height='300%'><feGaussianBlur stdDeviation='2.2'/></filter>");
  const orbGrad = (id, col, bright) => { const g = defs.append("radialGradient").attr("id", id).attr("cx", "36%").attr("cy", "34%").attr("r", "70%");
    g.append("stop").attr("offset", 0).attr("stop-color", "#fff").attr("stop-opacity", bright ? 1 : .8);
    g.append("stop").attr("offset", .28).attr("stop-color", d3.color(col).brighter(.6));
    g.append("stop").attr("offset", .75).attr("stop-color", col);
    g.append("stop").attr("offset", 1).attr("stop-color", d3.color(col).darker(.6)).attr("stop-opacity", .85); return "url(#" + id + ")"; };
  const orb = (g, x, y, r, col, id, bright) => {   // glow, grainy body, a soft core: one orb
    g.append("circle").attr("class", "halo").attr("cx", x).attr("cy", y).attr("r", r * 1.7).attr("fill", col).attr("opacity", .38).attr("filter", "url(#mpGlow)");
    g.append("circle").attr("cx", x).attr("cy", y).attr("r", r).attr("fill", orbGrad(id, col, bright)).attr("filter", "url(#mpGrain)");
    g.append("circle").attr("cx", x - r * .3).attr("cy", y - r * .32).attr("r", r * .38).attr("fill", "#fff").attr("opacity", bright ? .75 : .45).attr("filter", "url(#mpSoft)");
  };

  // ---- every element, era by era, on one ppm log scale. Lead is measured era by era (Montgomery et al. 2010, Table 11.4;
  // the 20th century from Kamenov et al. 2018): an orb per era at its median, its tail the lowest to the highest child,
  // its size the children sampled. The other seven have one pooled archaeological value (Kamenov et al. 2018, Table 1),
  // drawn as a dashed level across the archaeological eras (an absence of per-era data, not a flat series), then a solid
  // step to their 20th-century value. Every line and node is in its element's colour on Plate 4.A. Hovering a line picks
  // it out with a reading of its key values; zinc, barium, strontium and magnesium (part of enamel itself, not
  // industrial) light up together.
  const T0 = 16, T1 = 470, xL = 112, xR = W - 74;   // close under the time axis; a hovered line's reading goes under the chart
  const ex = i => xL + (xR - xL) * i / last;
  const ly = d3.scaleLog().domain([0.002, 4000]).range([T1, T0]).clamp(true);   // the top just above magnesium
  const top = svg.append("g");
  const note = top.append("g").attr("class", "note");
  // the reading for a hovered line, under the chart: its headline, then a smaller line, each wrapped to the chart's width
  const sayNote = (a, b) => { note.selectAll("*").remove(); let y = T1 + 26;
    [[a, "n1", 15], [b, "n2", 13]].forEach(([str, cls, lh]) => { if (!str) return;
      let t = note.append("text").attr("class", cls).attr("x", 0).attr("y", y), line = "";
      str.split(" ").forEach(w => { const next = line ? line + " " + w : w; t.text(next);
        if (t.node().getComputedTextLength() > W - 10 && line) { t.text(line); y += lh; t = note.append("text").attr("class", cls).attr("x", 0).attr("y", y); line = w; t.text(w); } else line = next; });
      y += lh; }); };
  [0.01, 0.1, 1, 10, 100, 1000].forEach(v => { top.append("line").attr("class", "grid").attr("x1", 72).attr("x2", xR + 8).attr("y1", ly(v)).attr("y2", ly(v));
    top.append("text").attr("class", "ax").attr("x", 68).attr("y", ly(v) + 4).attr("text-anchor", "end").text(d3.format(",")(v) + " ppm"); });
  const fmt = v => v >= 100 ? d3.format(",")(v) : String(v);
  const rOrb = n => 3 + 0.62 * Math.sqrt(n);   // an orb's radius from the teeth sampled, the same for every metal
  const NONIND = new Set(["Zn", "Ba", "Sr", "Mg"]);
  const lines = [];
  // lead
  const pbCol = css("--pb"), pbG = top.append("g").attr("class", "mline").datum("Pb");
  const pbLine = pbG.append("path").attr("class", "ln").attr("stroke", pbCol);
  const eras = PERIODS.map((P, i) => {
    const g = pbG.append("g").attr("class", "era").attr("opacity", 0), x = ex(i), y = ly(LEAD[i]), rg = PB_RANGE[i], r = rOrb(P.n);   // one size rule for every metal
    if (rg) {   // the tail: a grainy streak from the lowest to the highest child
      const id = "mpTail" + i, a = ly(rg[1]), b = ly(Math.max(0.002, rg[0])), gr = defs.append("linearGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("x2", 0).attr("y1", a).attr("y2", b);
      const m = (y - a) / Math.max(1, b - a);
      [[0, 0], [Math.max(0, m - .25), .3], [m, .75], [Math.min(1, m + .25), .3], [1, 0]].forEach(([o, op]) => gr.append("stop").attr("offset", o).attr("stop-color", pbCol).attr("stop-opacity", op));
      g.append("rect").attr("class", "tail").attr("x", x - 5).attr("width", 10).attr("y", a).attr("height", b - a).attr("rx", 7).attr("fill", "url(#" + id + ")").attr("filter", "url(#mpGrain)");
    }
    orb(g, x, y, r, pbCol, "mpOrb" + i, i === last);
    g.append("text").attr("class", "val").attr("x", i === last ? x - r - 6 : x + r + 6).attr("y", y + 4).attr("text-anchor", i === last ? "end" : "start").text(LEAD[i]);   // the last to the left, clear of the names
    tipOn(g.datum(i), k => "<b>Lead, " + PERIODS[k].name + "</b><br>" + (k === last ? "mean " : "median ") + LEAD[k] + " ppm in childhood enamel" +
      (PB_RANGE[k] ? "<br><span class='m'>lowest " + PB_RANGE[k][0] + ", highest " + PB_RANGE[k][1] + " ppm · n = " + PERIODS[k].n + "</span>" : ""));
    return { g, x, y };
  });
  const pre = LEAD.slice(0, 3), lowPre = d3.min(pre), lowNames = PERIODS.slice(0, 3).filter((P, i) => LEAD[i] === lowPre).map(P => P.name.replace(" Age", ""));
  const iR = PERIODS.findIndex(P => P.key === "roman"), iL = PERIODS.findIndex(P => P.key === "late");
  lines.push({ el: "Pb", g: pbG, pts: eras.map(e => [e.x, e.y]), endY: eras[last].y, col: pbCol,
    say: ["Lead: " + lowPre + " ppm in the " + lowNames.join(" and ") + " Ages, " + LEAD[iR] + " in Roman Britain, " + LEAD[iL] + " in the late medieval period, " + LEAD[last] + " in the 20th century.",
          "In one study, the like-for-like step is " + PB_ARCH_MEAN + " ppm in archaeological enamel to " + LEAD[last] + ", about ×" + Math.round(LEAD[last] / PB_ARCH_MEAN) + "."] });
  // the other seven, styled as lead: a solid line and glowing orbs sized by the teeth sampled (the pooled archaeological
  // sample n = 38, the 20th-century n = 77), the 20th-century orb with a tail from the lowest to the highest tooth (Kamenov
  // 2018, Table 1; none for magnesium; "bdl", below detection, from the floor), shown while its line is hovered. With no per-era data, the pooled orb
  // travels along its level as the timeline plays rather than sitting at every era. Levels closer than a few pixels
  // (copper 0.25 and nickel 0.24 ppm) are drawn a few pixels apart so both read; the notes say so.
  const N_POOL = 38, N_MOD = 77;
  const others = ELS.filter(e => e.el !== "Pb").map(e => ({ e, y0: ly(POOLED[e.el]), y1: ly(MODERN[e.el]) }));
  others.slice().sort((p, q) => p.y0 - q.y0).forEach((o, k, arr) => { if (k && o.y0 - arr[k - 1].y0 < 7) o.y0 = arr[k - 1].y0 + 7; });
  others.forEach(({ e, y0, y1 }) => {
    const col = css(e.v), a = POOLED[e.el], b = MODERN[e.el], g = top.append("g").attr("class", "mline").datum(e.el), rg = MOD_RANGE[e.el];
    const ln = g.append("path").attr("class", "ln").attr("stroke", col);
    if (rg) {   // the 20th-century tail, as lead's
      const id = "mpTailM" + e.el, ta = ly(rg[1]), tb = ly(rg[0] == null ? 0.002 : rg[0]), gr = defs.append("linearGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("x2", 0).attr("y1", ta).attr("y2", tb);
      const m = (y1 - ta) / Math.max(1, tb - ta);
      [[0, 0], [Math.max(0, m - .25), .3], [m, .75], [Math.min(1, m + .25), .3], [1, 0]].forEach(([o, op]) => gr.append("stop").attr("offset", o).attr("stop-color", col).attr("stop-opacity", op));
      g.append("rect").attr("class", "tail mtail").attr("x", ex(last) - 5).attr("width", 10).attr("y", ta).attr("height", tb - ta).attr("rx", 5).attr("fill", "url(#" + id + ")").attr("filter", "url(#mpGrain)");
    }
    const then = g.append("g").attr("class", "then"); orb(then, 0, y0, rOrb(N_POOL), col, "mpThen" + e.el, false);
    const now = g.append("g").attr("opacity", 0); orb(now, ex(last), y1, rOrb(N_MOD), col, "mpNow" + e.el, true);
    tipOn(g, () => "<b>" + e.name + "</b><br>pooled archaeological " + fmt(a) + " ppm → 20th century " + fmt(b) + " ppm" + (rg ? "<br>20th century lowest " + (rg[0] == null ? "below detection" : rg[0]) + ", highest " + rg[1] + " ppm" : "") +
      "<br><span class='m'>Kamenov et al. 2018, Table 1; archaeological n = 38 (Florida, the Philippines and Peru), modern n = 77; no per-era data</span>");
    const r = b / a;
    lines.push({ el: e.el, g, ln, then, now, tail: g.select(".mtail"), y0, y1, endY: y1, col, pts: [[ex(0), y0], [ex(last - 1), y0], [ex(last), y1]],
      say: [e.name + ": " + fmt(a) + " ppm in archaeological enamel, " + fmt(b) + " in the 20th century, " + (r >= 1 ? "×" + (r >= 10 ? Math.round(r) : r.toFixed(1)) : "down to ×" + r.toFixed(2)) + ".",
            "One pooled archaeological value: no per-era measurements before 1900 (Kamenov et al. 2018)."] });
  });
  // names at the right, spread so none overlap, on a hairline to their line's end
  const labs = lines.map(l => ({ l, y: l.endY })).sort((p, q) => p.y - q.y);
  for (let k = 1; k < labs.length; k++) labs[k].y = Math.max(labs[k].y, labs[k - 1].y + 14);
  labs.forEach(q => { const e = ELS.find(z => z.el === q.l.el);
    q.l.lab = q.l.g.append("g").attr("class", "endlab").attr("opacity", 0);
    q.l.lab.append("line").attr("class", "lead").attr("x1", ex(last) + 12).attr("x2", xR + 22).attr("y1", q.l.endY).attr("y2", q.y);
    q.l.lab.append("text").attr("class", "el").attr("x", xR + 26).attr("y", q.y + 4).style("fill", q.l.col).text(e.el); });
  // hover: a wide invisible band along each line
  lines.forEach(l => {
    l.g.insert("path", ":first-child").attr("class", "hit").attr("d", "M" + l.pts.map(q => q[0] + "," + q[1]).join("L"));
    l.g.on("mouseenter", () => {
      const grp = NONIND.has(l.el) ? lines.filter(m => NONIND.has(m.el)) : [l];
      svg.classed("hov", true); lines.forEach(m => m.g.classed("on", grp.includes(m)));
      if (NONIND.has(l.el)) sayNote("Elements that are not industrial barely moved.",
        grp.map(m => ELS.find(z => z.el === m.el).name + " " + fmt(POOLED[m.el]) + " → " + fmt(MODERN[m.el])).join(" · ") + " ppm, archaeological to 20th century");
      else sayNote(l.say[0], l.say[1]);
    }).on("mouseleave", () => { svg.classed("hov", false); lines.forEach(m => m.g.classed("on", false)); sayNote("", ""); hideTip(); });
  });
  sayNote("", "");

  const update = p => {
    const dur = reduced ? 0 : 650, atNow = p === last, xa = ex(Math.min(p, last - 1));
    eras.forEach((e, i) => { e.g.interrupt().transition().duration(dur).attr("opacity", i < p ? .6 : i === p ? 1 : 0);
      e.g.classed("cur", i === p); });
    const pts = eras.slice(0, p + 1);
    pbLine.transition().duration(dur).attr("d", pts.length > 1 ? "M" + pts.map(e => e.x + "," + e.y).join("L") : null);
    lines.filter(l => l.el !== "Pb").forEach(l => {
      const d = "M" + ex(0) + "," + l.y0 + "L" + xa + "," + l.y0 + (atNow ? "L" + ex(last) + "," + l.y1 : "");
      l.ln.interrupt().transition().duration(dur).attr("d", d);
      l.then.interrupt().transition().duration(dur).attr("transform", "translate(" + xa + ",0)").attr("opacity", atNow ? .6 : 1);
      l.now.interrupt().transition().delay(atNow ? dur * .6 : 0).duration(reduced ? 0 : 300).attr("opacity", atNow ? 1 : 0);
      l.tail.classed("shown", atNow);   // drawn while its line is hovered (seven at once would be one blur)
    });
    lines.forEach(l => l.lab.interrupt().transition().delay(atNow ? dur : 0).duration(reduced ? 0 : 300).attr("opacity", atNow ? 1 : 0));
  };
  // one time axis: Plate 4.A's timeline, between the radial chart and this one, its track over this chart's eras, drives both
  const tlA = document.querySelector("[data-tl=A]");
  // its first and last stops measured against the chart's first and last eras, and the track's margins set to match
  const alignTl = () => { if (!tlA || !svg.node().isConnected) return; const st = tlA.querySelectorAll(".stop"); if (st.length < 2) return;
    const sb = svg.node().getBoundingClientRect(); if (!sb.width) return;
    const at = i => sb.left + sb.width * ex(i) / W, mid = b => { const r = b.getBoundingClientRect(); return r.left + r.width / 2; };
    const ml = parseFloat(tlA.style.marginLeft) || 0, mr = parseFloat(tlA.style.marginRight) || 0;
    tlA.style.marginLeft = (ml + at(0) - mid(st[0])).toFixed(1) + "px"; tlA.style.marginRight = (mr - (at(last) - mid(st[st.length - 1]))).toFixed(1) + "px";
    const rb = tlA.querySelector(".mp-replay"); if (rb) rb.style.left = (-(parseFloat(tlA.style.marginLeft) || 0)) + "px"; };   // the replay button in the margin, at the chart's left edge
  if (tlA) { tlA.style.gridTemplateColumns = "minmax(0,1fr)"; tlA.querySelectorAll(".stop").forEach((b, i) => b.classList.toggle("lo", i % 2 === 1));   // every other name a line down for (let k = 0; k < 3; k++) alignTl(); requestAnimationFrame(alignTl);
    if (window.ResizeObserver) new ResizeObserver(() => { alignTl(); alignTl(); }).observe(svg.node()); }
  const onEra = e => { if (!svg.node().isConnected) { window.removeEventListener("metals:era", onEra); return; } update(e.detail.i); };
  window.addEventListener("metals:era", onEra);
  update(window.METALS_ERA ? window.METALS_ERA.i : last);
})();
})();
  ready = true; } };
})();
