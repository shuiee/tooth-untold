// Section 4 right-hand page: the metals plate studies (Plates 4.A and 4.B). Defines window.MetalsPlates and
// window.MetalPlate; app.js mounts it when the Metals section opens.
/* Section 4 · right-hand page: metals plate studies (moved in from metals-plate-studies.html; edit here) */
(function(){ let ready = false;
  window.MetalsPlates = { html: "<div class=\"dp\" id=\"mpPanel\">\n\n  <header class='sec'><span class='no'>4</span><h2>Metals</h2><p class='dek'>Lead and other metals in childhood enamel, from the Neolithic to the 20th century</p></header>\n\n  <!-- ===================================== Plate 4.A -->\n  <figure class=\"fig\" id=\"plateA\">\n    <div class=\"sheet\">\n      <span class=\"tag\"><b>Metals in enamel</b> · overlay</span>\n      <span class=\"tag r\">change from the archaeological level, log scale</span>\n      <div class=\"bloom\">\n        <svg id=\"bloomSvg\" viewBox=\"-415 -345 830 700\" role=\"img\" aria-label=\"Overlaid radial shapes, one per period, on seven element spokes\"></svg>\n        <div class=\"readout\" id=\"bloomRead\" aria-live=\"polite\"></div>\n      </div>\n      <div class=\"tl\" data-tl=\"A\"></div>\n      \n      <div class=\"kpis\" id=\"kpis\" aria-live=\"polite\"></div>\n    </div>\n    <ol class=\"notes\" data-notes></ol>\n  </figure>\n\n  <!-- ===================================== Plate 4.B -->\n  <figure class=\"fig\" id=\"plateB\">\n    <div class=\"sheet\">\n      <span class=\"tag\"><b>Metals in enamel</b> · orbs</span>\n      <span class=\"tag r\">log scale, ppm</span>\n      <svg id=\"cometSvg\" viewBox=\"0 -10 600 690\" role=\"img\" aria-label=\"Glowing orbs: median enamel lead for each era with tails from the lowest to the highest child, and each element travelling from its archaeological to its 20th-century level\"></svg>\n      <div class=\"isokey\">\n        <span><i class=\"dot\"></i>median lead (mean in the 20th century); bigger orb, more children sampled</span>\n        <span><i class=\"whisk\"></i>tail: lowest to highest child</span>\n        <span><i class=\"trail\"></i>travel from pooled archaeological to 20th century</span>\n      </div>\n      <div class=\"tl\" data-tl=\"B\"></div>\n    </div>\n    <ol class=\"notes\" data-notes></ol>\n  </figure>\n\n  </div><div id=\"mpTip\" role=\"tooltip\"></div>",
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
  host.innerHTML = "<button class='btn' type='button'>Play</button><div class='track' role='group' aria-label='Periods'><div class='base'></div><div class='fill'></div></div>";
  const btn = host.querySelector(".btn"), track = host.querySelector(".track"), fill = host.querySelector(".fill");
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
  // always playing: a click or key holds the chosen period for a few seconds, then the loop carries on
  let hold = null;
  function run() { clearInterval(timer); timer = setInterval(() => { if (!host.isConnected) { clearInterval(timer); clearTimeout(hold); return; } set((cur + 1) % PERIODS.length); }, 1800); }
  function stop() { clearInterval(timer); clearTimeout(hold); hold = setTimeout(run, 5000); }
  btn.hidden = true; btn.style.display = "none";
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
document.querySelectorAll("[data-notes]").forEach((ol, k) => ol.innerHTML = (k === 0 ? NOTES : NOTES.slice(0, 3)).map(n => "<li>" + n + "</li>").join(""));

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

// ------------------------------------------------------------------ KPI band (Plate 4.A)
function renderKPIs(p) {
  const P = PERIODS[p], c20 = p === PERIODS.length - 1, n = (v, u, cls) => "<p class='n" + (cls ? " " + cls : "") + "'>" + v + (u ? "<small>" + u + "</small>" : "") + "</p>";
  const k2 = { v: "×" + fmtX(LEAD[p] / PB_ARCH_MEAN).slice(1), c: "the pooled archaeological average, 0.63 ppm" };
  document.getElementById("kpis").innerHTML =
    "<p class='era'>" + P.name + "</p><p class='when'>CHILDHOOD " + yrs(P).toUpperCase() + " · n = " + P.n + (c20 ? " modern teeth" : " children") + "</p>" +
    "<div class='row'>" +
      "<div class='kpi k1'>" + n(String(LEAD[p]), "ppm") + "<p class='c'>" + (c20 ? "mean" : "median") + " lead in childhood enamel</p></div>" +
      "<div class='kpi k2'>" + n(k2.v, "", p ? "up" : "") + "<p class='c'>" + k2.c + "</p></div>" +
      "<div class='kpi k3'>" + n(PB_RANGE[p] ? String(PB_RANGE[p][1]) : "—", PB_RANGE[p] ? "ppm" : "") + "<p class='c'>in the most-exposed " + (c20 ? "modern tooth" : "child") + " of the " + P.n + " sampled</p></div>" +
    "</div>";
}

// ------------------------------------------------------------------ Plate 4.B: lead comets, then and now
// Top: one glowing orb per era at its median enamel lead, its tail running from the lowest to the highest child measured,
// its size the number of children sampled. Bottom: every element's pooled archaeological value travelling to its
// 20th-century value, both from the same study (Kamenov et al. 2018). Grain and glow after the team's orb reference.
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

  // ---- top: lead, era by era (Montgomery et al. 2010, Table 11.4; the 20th century from Kamenov et al. 2018)
  const T0 = 44, T1 = 300, xL = 92, xR = W - 30;
  const ex = i => xL + (xR - xL) * i / last;
  const ly = d3.scaleLog().domain([0.002, 60]).range([T1, T0]).clamp(true);
  const top = svg.append("g");
  top.append("text").attr("class", "ttl").attr("x", 0).attr("y", 18).text("Lead in childhood enamel, era by era");
  [0.01, 0.1, 1, 10].forEach(v => { top.append("line").attr("class", "grid").attr("x1", 56).attr("x2", W - 6).attr("y1", ly(v)).attr("y2", ly(v));
    top.append("text").attr("class", "ax").attr("x", 52).attr("y", ly(v) + 3).attr("text-anchor", "end").text(v + " ppm"); });
  const trend = top.append("path").attr("class", "trend");
  const eras = PERIODS.map((P, i) => {
    const g = top.append("g").attr("class", "era").attr("opacity", 0), x = ex(i), y = ly(LEAD[i]), rg = PB_RANGE[i], r = 6 + 1.9 * Math.sqrt(P.n);
    if (rg) {   // the tail: a grainy streak from the lowest to the highest child
      const id = "mpTail" + i, a = ly(rg[1]), b = ly(Math.max(0.002, rg[0])), gr = defs.append("linearGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("x2", 0).attr("y1", a).attr("y2", b);
      const m = (y - a) / Math.max(1, b - a);
      [[0, 0], [Math.max(0, m - .25), .35], [m, .85], [Math.min(1, m + .25), .35], [1, 0]].forEach(([o, op]) => gr.append("stop").attr("offset", o).attr("stop-color", P.col).attr("stop-opacity", op));
      g.append("rect").attr("class", "tail").attr("x", x - 9).attr("width", 18).attr("y", a).attr("height", b - a).attr("rx", 9).attr("fill", "url(#" + id + ")").attr("filter", "url(#mpGrain)");
      g.append("rect").attr("x", x - 4).attr("width", 8).attr("y", a).attr("height", b - a).attr("rx", 4).attr("fill", "url(#" + id + ")").attr("filter", "url(#mpSoft)").attr("opacity", .8);
    }
    orb(g, x, y, r, P.col, "mpOrb" + i, i === last);
    g.append("text").attr("class", "val").attr("x", x + r + 6).attr("y", y + 4).text(LEAD[i]);
    g.append("rect").attr("x", x - 30).attr("width", 60).attr("y", T0 - 10).attr("height", T1 - T0 + 20).attr("fill", "transparent");
    tipOn(g.datum(i), k => "<b>" + PERIODS[k].name + "</b><br>" + (k === last ? "mean " : "median ") + LEAD[k] + " ppm of lead in childhood enamel" +
      (PB_RANGE[k] ? "<br><span class='m'>lowest " + PB_RANGE[k][0] + ", highest " + PB_RANGE[k][1] + " ppm · n = " + PERIODS[k].n + "</span>" : ""));
    const lab = top.append("text").attr("class", "eraL").attr("x", x).attr("y", T1 + 26).attr("text-anchor", "middle").text(P.short);
    return { g, lab, x, y };
  });

  // ---- bottom: then and now, every element, the same study
  const B0 = 392, RH = 34, bx = d3.scaleLog().domain([0.5, 20]).range([118, W - 70]);
  const bot = svg.append("g");
  bot.append("text").attr("class", "ttl").attr("x", 0).attr("y", B0 - 30).text("Then and now, one study: change from the archaeological level");
  [0.5, 1, 2, 5, 10, 20].forEach(v => { bot.append("line").attr("class", "grid" + (v === 1 ? " one" : "")).attr("x1", bx(v)).attr("x2", bx(v)).attr("y1", B0 - 14).attr("y2", B0 + RH * 8 - 14);
    bot.append("text").attr("class", "ax").attr("x", bx(v)).attr("y", B0 + RH * 8 + 2).attr("text-anchor", "middle").text("×" + v); });
  const TN = [["Pb", PB_ARCH_MEAN, 6.55]].concat(ELS.filter(e => e.el !== "Pb").map(e => [e.el, POOLED[e.el], MODERN[e.el]])).sort((p, q) => q[2] / q[1] - p[2] / p[1]);
  const rows = TN.map(([el, a, b], k) => {
    const e = ELS.find(q => q.el === el), col = css(e.v), y = B0 + k * RH, g = bot.append("g"), xa = bx(1), xb = bx(b / a), up = b > a;
    g.append("text").attr("class", "el").attr("x", 0).attr("y", y + 5).style("fill", col).text(el).append("tspan").attr("class", "nm").attr("dx", 6).text(e.name);
    const id = "mpTrail" + k, gr = defs.append("linearGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse").attr("x1", xa).attr("x2", xb).attr("y1", 0).attr("y2", 0);
    gr.append("stop").attr("offset", 0).attr("stop-color", col).attr("stop-opacity", .05); gr.append("stop").attr("offset", 1).attr("stop-color", col).attr("stop-opacity", .75);
    const trail = g.append("rect").attr("x", Math.min(xa, xb)).attr("y", y - 6).attr("height", 12).attr("rx", 6).attr("width", 0).attr("fill", "url(#" + id + ")").attr("filter", "url(#mpGrain)");
    const then = g.append("g"); orb(then, xa, y, 6.5, d3.color(col).copy({ opacity: 1 }).brighter(.9).formatHex(), "mpThen" + k, false); then.attr("opacity", .75);
    const now = g.append("g").attr("opacity", 0); orb(now, xb, y, 9, col, "mpNow" + k, true);
    const r = b / a, txt = g.append("text").attr("class", "rx" + (up ? " up" : " down")).attr("x", up ? xb + 16 : xb - 16).attr("y", y + 4).attr("text-anchor", up ? "start" : "end")
      .attr("opacity", 0).text((up ? "▲ ×" : "▼ ×") + (r >= 10 ? r.toFixed(1) : (r < 1 ? (1 / r).toFixed(2) + " less" : r.toFixed(2))));
    g.append("rect").attr("x", 0).attr("width", W).attr("y", y - RH / 2).attr("height", RH).attr("fill", "transparent").lower();
    tipOn(g.datum(k), () => "<b>" + e.name + "</b><br>pooled archaeological " + a + " ppm → 20th century " + b + " ppm<br><span class='m'>Kamenov et al. 2018, Table 1" + (el === "Pb" ? "" : "; the archaeological teeth are from Florida, the Philippines and Peru") + "</span>");
    return { trail, now, txt, xa, xb };
  });

  let shownNow = null;
  timeline(document.querySelector("[data-tl=B]"), p => {
    const dur = reduced ? 0 : 650;
    eras.forEach((e, i) => { e.g.interrupt().transition().duration(dur).attr("opacity", i < p ? .55 : i === p ? 1 : 0).attr("transform", i === p ? "translate(0,0)" : null);
      e.lab.classed("cur", i === p).attr("opacity", i <= p ? 1 : .4); e.g.classed("cur", i === p); });
    const pts = eras.slice(0, p + 1);
    trend.transition().duration(dur).attr("d", pts.length > 1 ? "M" + pts.map(e => e.x + "," + e.y).join("L") : null);
    const atNow = p === last;
    if (atNow !== shownNow) {
      rows.forEach((r, k) => {
        const d = reduced ? 0 : 900, dl = reduced ? 0 : k * 90;
        r.trail.interrupt().transition().delay(atNow ? dl : 0).duration(d).attr("width", atNow ? Math.abs(r.xb - r.xa) : 0);
        r.now.interrupt().transition().delay(atNow ? dl + d * .7 : 0).duration(reduced ? 0 : 300).attr("opacity", atNow ? 1 : 0);
        r.txt.interrupt().transition().delay(atNow ? dl + d : 0).duration(reduced ? 0 : 300).attr("opacity", atNow ? 1 : 0);
      });
      shownNow = atNow;
    }
  }, last);
})();
})();
  ready = true; } };
})();
