/* The Tooth Untold: the two figures of Section 3, Wear and LEH (window.WearLEH): the wear landscape. Needs d3.

   WearLEH.peaks(el, M, opt)    molar wear as a landscape: the wear grid (period × age at death) on isometric axes, with
     the Industrial 18–24 cell the corner nearest the viewer and ages reading left to right. Each cell is a peak shaped
     like the crown of a lower first molar (five cusps, the central fissure and its branches, and the same ripple as the
     3D molar's worn surface, ToothGL.wearN), drawn as a wire mesh over that surface: isocurves in both directions,
     spanning the whole cell, so the cells join into one sheet that rises into a crown wherever there is data. A peak is as tall as its stage above 1 (unworn),
     on the same scale as the blue (the crown that chewing wore away) on the 3D molar. Colour runs across the ages from blue (18–24) to orange (60+); within that, saturation is the stage.
     Returns { highlight(i), interactive(on), select(i, j) }; opt.onPick(i, j) is called on a click once interactive.

   The stress-line figures are lehfigs.js.

   The stage numbers show one row at a time, so they stay legible: the row playing, the row under the pointer, the row
   picked. M is LAYER_DATA.morphology (build_layers.py). A peak is drawn only where its cell has data. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const ripple = (x, z) => window.ToothGL && ToothGL.wearN ? ToothGL.wearN(x, z) : 0;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // ------------------------------------------------------------------ the wear landscape
  // colour by age (blue at 18–24 to orange at 60+), greyed towards little wear (Smith stages 2 to 6 span the record)
  const AGE0 = "#2f66d0", AGE1 = "#e8841f";
  const wearCol = (v, j, nJ) => d3.interpolateLab("#cfcdc6", d3.interpolateLab(AGE0, AGE1)(j / ((nJ || 8) - 1)))(0.3 + 0.7 * clamp01((v - 2) / 3.9));

  // a lower first molar's crown as a height field over its footprint (u mesiodistal, w buccolingual, both -1..1):
  // a low dome, five cusps (three buccal, two lingual), the central fissure with its buccal and lingual branches,
  // and the worn surface's ripple. off shifts the ripple so neighbouring peaks are not identical.
  const CUSPS = [[-0.5, 0.42, 1], [0.06, 0.5, 0.95], [0.58, 0.22, 0.8], [-0.42, -0.42, 0.96], [0.36, -0.44, 0.9]];
  function crown(u, w, off) {
    const r = Math.cbrt(Math.abs(u / 0.98) ** 3 + Math.abs(w / 0.88) ** 3); if (r >= 1) return 0;
    let h = 0.42 * Math.sqrt(1 - r);
    for (const c of CUSPS) h += 0.44 * c[2] * Math.exp(-((u - c[0]) ** 2 + (w - c[1]) ** 2) / (2 * 0.25 * 0.25));
    h -= 0.17 * Math.exp(-(w * w) / (2 * 0.055 * 0.055)) * (1 - 0.5 * Math.abs(u));               // central fissure
    h -= 0.11 * Math.exp(-((u + 0.2) ** 2) / (2 * 0.05 * 0.05)) * Math.exp(-(w * w) / 0.45);       // buccal and lingual grooves
    h -= 0.09 * Math.exp(-((u - 0.34) ** 2) / (2 * 0.05 * 0.05)) * Math.exp(-(w * w) / 0.45);
    h += 0.07 * ripple(u * 0.45 + off[0], w * 0.45 + off[1]);                                         // crenellation
    return Math.max(0, h * Math.min(1, (1 - r) / 0.14));
  }
  const G = 30;                                              // samples across a peak's footprint
  function field(off) {
    const v = new Float64Array(G * G); let max = 0;
    for (let b = 0; b < G; b++) for (let a = 0; a < G; a++) { const h = crown(a / (G - 1) * 2 - 1, b / (G - 1) * 2 - 1, off); v[b * G + a] = h; if (h > max) max = h; }
    for (let k = 0; k < v.length; k++) v[k] /= max;
    v.max = max;
    return v;
  }

  function peaks(el, M, opt) {
    opt = opt || {};
    const P = M.periods, A = M.ages, nI = P.length, nJ = A.length;
    const W = Math.max(320, el.clientWidth || 560), narrow = W < 460;
    const vmax = d3.max(P, p => d3.max(A, a => M.wear[p][a] ? M.wear[p][a][0] : 0)), labL = narrow ? 88 : 100, padR = 10;
    // isometric: both floor axes at 30 degrees, on one scale. One age step runs up and to the right (EA), one period
    // step comes down and to the right (EP), so the Industrial 18–24 corner (i = nI, j = 0) is the bottom vertex, the
    // nearest; ages read left to right up the front-right edge, periods along the front-left edge.
    const cos = Math.cos(Math.PI / 6), EA = [cos, -0.5], EP = [cos, 0.5];
    const c = (W - labL - padR) / (cos * (nI + nJ));
    // px of peak per Smith stage above 1: the most worn cell (stage ~5.8) rises about one cell, about as tall as a molar
    // crown is wide, so peaks keep a crown's proportions while the stages stay easy to compare
    const HS = c * 0.2;
    const ox = labL, oy = (vmax - 1) * HS + 24 + 0.5 * nJ * c;
    const X = (i, j) => ox + (EP[0] * i + EA[0] * j) * c, Y = (i, j) => oy + (EP[1] * i + EA[1] * j) * c;
    const H = Y(nI, 0) + 58;
    el.innerHTML = "";
    const svg = mk("svg", { class: "wl-peaks", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": "Mean molar wear by period and age at death, drawn as molar-shaped peaks on isometric axes" }, el);

    // the floor: outline and dashed cell lines; period names along the left edge, ages along the front edge
    const floor = mk("g", { class: "wl-floor" }, svg);
    mk("path", { d: "M" + [[0, 0], [0, nJ], [nI, nJ], [nI, 0]].map(q => X(q[0], q[1]).toFixed(1) + "," + Y(q[0], q[1]).toFixed(1)).join("L") + "Z", class: "edge" }, floor);
    // period names outside the front-left edge; ages level under the front-right edge, one per cell (each step down the
    // edge drops half a cell, so neighbouring ages never touch); the axis title under them
    const rowLab = P.map((p, i) => { const t = mk("text", { x: X(i + 0.5, 0) - 10, y: Y(i + 0.5, 0) + 8, "text-anchor": "end", class: "wl-rl" }, floor); t.textContent = p; return t; });
    A.forEach((a, j) => { if (narrow && j % 2) return;
      mk("text", { x: X(nI, j + 0.5) + 4, y: Y(nI, j + 0.5) + 16, "text-anchor": "start", class: "wl-ax wl-age", fill: d3.interpolateLab(AGE0, AGE1)(j / (nJ - 1)) }, floor).textContent = a; });
    mk("text", { x: X(nI, nJ - 2.5) + 30, y: Y(nI, nJ - 2.5) + 50, "text-anchor": "start", class: "wl-ax" }, floor).textContent = "age at death ↗";

    // one group per period row, back to front (and right to left within a row); labels in their own groups on top
    const rows = [], labs = [], cells = [];
    const peakG = mk("g", {}, svg), labG = mk("g", { class: "wl-labs" }, svg);
    P.forEach((p, i) => {
      const g = mk("g", { class: "wl-row wl-peak-row" }, peakG), lg = mk("g", { class: "wl-row" }, labG);
      rows.push(g); labs.push(lg);
      for (let j = nJ - 1; j >= 0; j--) {
        const a = A[j], v = M.wear[p][a]; if (!v) continue;
        const h = (v[0] - 1) * HS, col = wearCol(v[0], j, nJ), F = field([i * 0.37 + j * 0.11, j * 0.53 - i * 0.07]);
        const pk = mk("g", { class: "wl-peak", tabindex: -1, role: "button", "aria-label": p + ", died " + a + ": mean Smith stage " + v[0].toFixed(1) + ", n = " + v[1] }, g);
        mk("title", {}, pk).textContent = p + ", died " + a + " · mean Smith stage " + v[0].toFixed(2) + " · n = " + v[1];
        // the peak as a wire mesh over the crown's surface: isocurves in both directions across the whole cell (u along
        // the ages, v along the periods), so neighbouring cells join into one sheet, flat between the peaks
        const fp = 0.43, off = [i * 0.37 + j * 0.11, j * 0.53 - i * 0.07];
        const hAt = (su, sv) => crown((su - 0.5) / fp, (sv - 0.5) / fp, off) / F.max;   // su, sv: 0..1 across the cell
        const at = (su, sv) => { const z = hAt(su, sv), gi = i + sv, gj = j + su; return [X(gi, gj), Y(gi, gj) - z * h]; };
        const pt = (a, b, z) => { const gi = i + 0.5 + (b / (G - 1) * 2 - 1) * fp, gj = j + 0.5 + (a / (G - 1) * 2 - 1) * fp; return [X(gi, gj), Y(gi, gj) - z * h]; };
        const N = 6, S = 30, all = [];                       // six mesh lines per cell each way, like a draped grid
        let du = "", dv = "";
        for (let k = 0; k <= N; k++) {
          const q = k / N; let lu = "", lv = "";
          for (let m = 0; m <= S; m++) {
            const r = m / S, A = at(r, q), B = at(q, r); if (hAt(r, q) > 0.004) all.push(A); if (hAt(q, r) > 0.004) all.push(B);
            lu += (m ? "L" : "M") + A[0].toFixed(1) + "," + A[1].toFixed(1); lv += (m ? "L" : "M") + B[0].toFixed(1) + "," + B[1].toFixed(1);
          }
          du += lu; dv += lv;
        }
        // a light fill over the crown's silhouette (not the flat floor around it), so overlapping peaks stay apart
        const hull = all.length > 2 && d3.polygonHull(all);
        if (hull) mk("path", { d: "M" + hull.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z", fill: col, class: "body" }, pk);
        mk("path", { d: du, stroke: col, class: "mesh u" }, pk);
        mk("path", { d: dv, stroke: col, class: "mesh v" }, pk);
        let top = 0; for (let k = 1; k < F.length; k++) if (F[k] > F[top]) top = k;
        const tp = pt(top % G, Math.floor(top / G), 1);
        const t = mk("text", { x: tp[0], y: tp[1] - 6, "text-anchor": "middle", class: "wl-v" }, lg); t.textContent = v[0].toFixed(1);
        pk.addEventListener("mouseenter", () => lg.classList.add("hov")); pk.addEventListener("mouseleave", () => lg.classList.remove("hov"));
        pk.addEventListener("click", () => { if (svg.classList.contains("live") && opt.onPick) opt.onPick(i, j); });
        pk.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && svg.classList.contains("live") && opt.onPick) { e.preventDefault(); opt.onPick(i, j); } });
        cells.push({ i, j, pk, t });
      }
    });
    return {
      // one row bright and lifted while its period plays; -1 settles every row
      highlight(i) { svg.classList.toggle("playing", i >= 0); rows.forEach((g, k) => { g.classList.toggle("hi", k === i); labs[k].classList.toggle("hi", k === i); rowLab[k].classList.toggle("hi", k === i); }); },
      interactive(on) { svg.classList.toggle("live", on); cells.forEach(q => q.pk.setAttribute("tabindex", on ? 0 : -1)); },
      select(i, j) { cells.forEach(q => { const on = q.i === i && (j == null || q.j === j); q.pk.classList.toggle("sel", on); q.t.classList.toggle("sel", on); }); rowLab.forEach((t, k) => t.classList.toggle("sel", k === i)); labs.forEach((g, k) => g.classList.toggle("sel", k === i)); },
    };
  }

  window.WearLEH = { peaks, wearCol };
})();
