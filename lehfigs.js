/* The Tooth Untold: the stress-line (LEH) figures of Section 3, after the team's drafts C10, C9 and C8 (window.LEHFigs).
   Needs d3. L is LAYER_DATA.morphology.leh_canine (build_layers.py): adults 18–69 with a scorable lower canine.

   LEHFigs.c10(el, L, opt)   the share of adults with at least one line, one bar per period with its 95% interval. Each
     bar is drawn like a groove on a tooth (wavy edges, ribs across it), but it starts at 0 and ends at its value, so its
     length reads against the axis. show(k) grows bar k from left to right (over ms, with easing ez if given). { show(k, ms, ez), showAll, live, select, barRect, col }
     opt.onPick(k) on a click on bar k once live.
   LEHFigs.c9(el, L, opt)    C9A: a check, not a finding: by age at death, each period's gap from its own share. The
     fitted (least-squares) line is the reading, heavy and opaque; each age band is a dot, filled at n >= 40 and hollow
     below; a faint, non-interactive ribbon runs between the bands and their mirror across the line (drawing, not
     uncertainty), its ribs fading with the band's sample. C9B: the slope in each cemetery of the chosen period.
     { showBands(done), focus(k) }; opt.onPick(k) when a band is clicked.
   LEHFigs.c8(el, L, opt)    C8A: each period's adults by how many lines the canine carries; C8B: each cemetery's share
     with two or more lines, sized by sample, against the period's pooled value. { rowRect(k), landRow(k), revealRow(k),
     showSites(k), focus(k), pin(k) }. Hovering a period's column dims the other periods in both panels; leaving puts
     them back.
   LEHFigs.fly(box, from, to, cols, land, all)  copies of C10's bars fly down inside the panel to C8A's rows, widen and
     flatten into rectangles. */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the bars' blue: light for the earliest period, deep for the latest (as in the draft)
  const barCol = (k, n) => d3.interpolateLab("#8fbbee", "#173f86")(k / Math.max(1, n - 1));
  // a groove's edge: a few slow sine waves, fixed per bar. In pixels (about ±1.5), and kept so: never scaled with the
  // chart, so it stays well under half a percentage point of the axis
  const wob = (x, k, s) => 1.5 * Math.sin(x * 0.045 + k * 1.7 + s) + 0.9 * Math.sin(x * 0.13 + k * 0.9 + 2 * s) + 0.5 * Math.sin(x * 0.31 + k * 2.3);

  // ------------------------------------------------------------------ C10
  function c10(el, L, opt) {
    opt = opt || {};
    const E = L.eras, n = E.length, W = Math.max(320, el.clientWidth || 560), narrow = W < 460;
    const m = { l: narrow ? 92 : 108, r: narrow ? 92 : 128, t: 8, b: 40 }, rh = 34, bh = 17;
    const H = m.t + n * rh + m.b, xmax = 55;
    const x = d3.scaleLinear().domain([0, xmax]).range([m.l, W - m.r]);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("class", "lf-c10").attr("viewBox", "0 0 " + W + " " + H).attr("width", "100%").attr("role", "img")
      .attr("aria-label", "Share of adults with at least one stress line on the lower canine, by period, with 95% intervals");
    const defs = svg.append("defs");
    [0, 10, 20, 30, 40, 50].forEach(v => { svg.append("line").attr("class", "grid").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t).attr("y2", H - m.b + 4);
      svg.append("text").attr("class", "lf-ax").attr("x", x(v)).attr("y", H - m.b + 17).attr("text-anchor", "middle").text(v + "%"); });
    svg.append("text").attr("class", "lf-ax").attr("x", (m.l + W - m.r) / 2).attr("y", H - 4).attr("text-anchor", "middle").text("share of adults with a line on the lower canine");
    const rows = E.map((e, k) => {
      const y0 = m.t + k * rh + (rh - bh) / 2, x0 = x(0), x1 = x(e.pct), col = barCol(k, n);
      const g = svg.append("g").attr("class", "lf-row").attr("tabindex", -1).attr("role", "button").attr("aria-label", e.p + ": " + e.pct + "% of " + e.n);
      g.append("text").attr("class", "lf-rl").attr("x", m.l - 10).attr("y", y0 + bh / 2 + 4).attr("text-anchor", "end").text(e.p);
      // the groove: wavy top and bottom edges, a soft rounded end, ribs across it; revealed left to right by a clip
      const S = Math.max(8, Math.round((x1 - x0) / 3)), top = [], bot = [];
      for (let i = 0; i <= S; i++) { const xx = x0 + (x1 - x0) * i / S, end = Math.min(1, (x1 - xx) / 5);
        top.push([xx, y0 + 1.6 + wob(xx, k, 0) * 0.7 + (1 - end) * 4]); bot.push([xx, y0 + bh - 1.6 + wob(xx, k, 1.3) * 0.7 - (1 - end) * 4]); }
      const d = "M" + top.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "L" + bot.reverse().map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";
      const cid = "lfc" + k + Math.round(Math.random() * 1e6);
      const clip = defs.append("clipPath").attr("id", cid).append("rect").attr("x", x0 - 1).attr("y", y0 - 6).attr("height", bh + 12).attr("width", 0);
      const bar = g.append("g").attr("clip-path", "url(#" + cid + ")");
      const grad = "lfg" + cid; const lg = defs.append("linearGradient").attr("id", grad).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
      lg.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateLab(col, "#ffffff")(0.35));
      lg.append("stop").attr("offset", "55%").attr("stop-color", col); lg.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateLab(col, "#000000")(0.25));
      bar.append("path").attr("class", "lf-bar").attr("d", d).attr("fill", "url(#" + grad + ")").attr("stroke", d3.interpolateLab(col, "#000")(0.3));
      bar.append("path").attr("class", "lf-ribs").attr("d", d3.range(x0 + 3, x1 - 2, 3.4).map(xx => "M" + xx.toFixed(1) + "," + (y0 + 2.5 + wob(xx, k, 0) * 0.7).toFixed(1) + "V" + (y0 + bh - 2.5 + wob(xx, k, 1.3) * 0.7).toFixed(1)).join(""))
        .attr("stroke", d3.interpolateLab(col, "#000")(0.35));
      const wk = g.append("g").attr("class", "lf-whisk").attr("opacity", 0);
      wk.append("path").attr("d", "M" + x(e.ci[0]) + "," + (y0 + bh / 2) + "H" + x(e.ci[1]) + "M" + x(e.ci[0]) + "," + (y0 + 3) + "v" + (bh - 6) + "M" + x(e.ci[1]) + "," + (y0 + 3) + "v" + (bh - 6));
      const lx = Math.max(x1, x(e.ci[1])) + 8;
      wk.append("text").attr("class", "lf-v").attr("x", lx).attr("y", y0 + bh / 2 + 4).text(e.pct.toFixed(1) + "%");
      wk.append("text").attr("class", "lf-ax").attr("x", lx + (narrow ? 38 : 44)).attr("y", y0 + bh / 2 + 4).text(narrow ? e.k + "/" + e.n : e.k + " of " + d3.format(",")(e.n));
      wk.append("title").text(e.p + ": " + e.k + " of " + e.n + " adults (" + e.pct + "%), 95% interval " + e.ci[0] + "–" + e.ci[1] + "%; age-standardised " + e.std + "%");
      g.on("click", () => { if (svg.classed("live") && opt.onPick) opt.onPick(k); })
        .on("keydown", ev => { if ((ev.key === "Enter" || ev.key === " ") && svg.classed("live") && opt.onPick) { ev.preventDefault(); opt.onPick(k); } });
      return { g, clip, wk, x0, x1, bar };
    });
    const grow = (k, ms, ez) => { const r = rows[k]; r.g.classed("on", true);
      (ms ? r.clip.transition().duration(ms).ease(ez || d3.easeCubicOut) : r.clip).attr("width", r.x1 - r.x0 + 8);
      (ms ? r.wk.transition().delay(ms * 0.8).duration(400) : r.wk).attr("opacity", 1); };
    return {
      show(k, ms, ez) { grow(k, REDUCED ? 0 : ms == null ? 1300 : ms, ez); },
      showAll() { rows.forEach((r, k) => grow(k, 0)); },
      live(on) { svg.classed("live", on); rows.forEach(r => r.g.attr("tabindex", on ? 0 : -1)); },
      select(k) { svg.classed("picked", k >= 0); rows.forEach((r, j) => r.g.classed("sel", j === k)); },
      barRect(k) { return rows[k].bar.node().getBoundingClientRect(); },
      col: k => barCol(k, n),
    };
  }

  // ------------------------------------------------------------------ C9
  // monotone cubic through points (passes through every value, never overshoots), sampled every few px
  function monotone(xs, ys, step) {
    const n = xs.length, dx = [], m = [], s = [];
    if (n < 2) return xs.map((x, i) => [x, ys[i]]);
    for (let k = 0; k < n - 1; k++) { dx[k] = xs[k + 1] - xs[k]; s[k] = (ys[k + 1] - ys[k]) / dx[k]; }
    m[0] = s[0]; m[n - 1] = s[n - 2];
    for (let k = 1; k < n - 1; k++) m[k] = s[k - 1] * s[k] <= 0 ? 0 : 3 * (dx[k - 1] + dx[k]) / ((2 * dx[k] + dx[k - 1]) / s[k - 1] + (dx[k] + 2 * dx[k - 1]) / s[k]);
    const out = [];
    for (let k = 0; k < n - 1; k++) {
      const steps = Math.max(2, Math.round(dx[k] / step));
      for (let q = 0; q < steps; q++) { const t = q / steps, h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
        out.push([xs[k] + t * dx[k], h00 * ys[k] + h10 * dx[k] * m[k] + h01 * ys[k + 1] + h11 * dx[k] * m[k + 1]]); }
    }
    out.push([xs[n - 1], ys[n - 1]]);
    return out;
  }
  function c9(el, L, opt) {
    opt = opt || {};
    const E = L.eras, n = E.length, Wall = Math.max(320, el.clientWidth || 560), side = Wall >= 760;
    const WA = side ? Math.round(Wall * 0.58) : Wall, WB = side ? Wall - WA - 24 : Wall, cols = opt.colours || {};
    el.innerHTML = "<div class='lf-c9" + (side ? " side" : "") + "'><div class='lf-c9a'></div><div class='lf-c9b'></div></div>";
    const elA = el.querySelector(".lf-c9a"), elB = el.querySelector(".lf-c9b");
    // ---- A: ribbons around the fitted lines
    const m = { l: 40, r: 112, t: 14, b: 34 }, H = 300, A = L.ages;
    const x = d3.scalePoint().domain(A).range([m.l + 6, WA - m.r]).padding(0.05);
    const ext = d3.max(E, e => d3.max(e.cells, c => Math.max(Math.abs(c.dev), Math.abs(c.fit), Math.abs(2 * c.fit - c.dev))));
    const lim = Math.ceil((ext + 1) / 5) * 5, y = d3.scaleLinear().domain([-lim, lim]).range([H - m.b, m.t]);
    const svg = d3.select(elA).append("svg").attr("class", "lf-c9a-svg").attr("viewBox", "0 0 " + WA + " " + H).attr("width", "100%").attr("role", "img")
      .attr("aria-label", "Stress lines by age at death, as a gap from each period's own share, with fitted lines");
    d3.range(-lim, lim + 1, 5).forEach(v => { svg.append("line").attr("class", v ? "grid" : "zero").attr("x1", m.l).attr("x2", WA - m.r).attr("y1", y(v)).attr("y2", y(v));
      svg.append("text").attr("class", "lf-ax").attr("x", m.l - 5).attr("y", y(v) + 3).attr("text-anchor", "end").text(v > 0 ? "+" + v : v); });
    svg.append("text").attr("class", "lf-ax").attr("x", 10).attr("y", (m.t + H - m.b) / 2).attr("text-anchor", "middle").attr("transform", "rotate(-90,10," + (m.t + H - m.b) / 2 + ")").text("points from the period's share");
    A.forEach((a, i) => { if (WA >= 440 || i % 2 === 0 || i === A.length - 1) svg.append("text").attr("class", "lf-ax").attr("x", x(a)).attr("y", H - m.b + 16).attr("text-anchor", "middle").text(a); });
    svg.append("text").attr("class", "lf-ax").attr("x", (m.l + WA - m.r) / 2).attr("y", H - 2).attr("text-anchor", "middle").text("age at death");
    const P = (pts) => "M" + pts.map(q => q[0].toFixed(1) + "," + y(q[1]).toFixed(1)).join("L");
    const nMax = d3.max(E, e => d3.max(e.cells, c => c.n));
    const bands = E.map((e, k) => {
      const xs = e.cells.map(c => x(c.a)), data = monotone(xs, e.cells.map(c => c.dev), 3), fitS = monotone(xs, e.cells.map(c => c.fit), 3);
      const mirror = data.map((q, i) => [q[0], 2 * fitS[i][1] - q[1]]), col = cols[e.p] || "#55544f";
      const g = svg.append("g").attr("class", "lf-band").style("--c", col).attr("opacity", 0).style("pointer-events", "none");
      g.append("path").attr("class", "fill").attr("d", P(data) + "L" + mirror.slice().reverse().map(q => q[0].toFixed(1) + "," + y(q[1]).toFixed(1)).join("L") + "Z");
      // each rib's strength follows the sample under it (interpolated between the age bands), so the pinches that rest on
      // few adults recede on their own
      const nAt = xx => { let i = Math.max(0, Math.min(xs.length - 2, d3.bisectRight(xs, xx) - 1)); const u = Math.max(0, Math.min(1, (xx - xs[i]) / ((xs[i + 1] - xs[i]) || 1)));
        return e.cells[i].n + (e.cells[i + 1].n - e.cells[i].n) * u; };
      const ribs = g.append("g").attr("class", "ribs");
      data.forEach((q, i) => { if (i % 2) return; ribs.append("line").attr("x1", q[0]).attr("x2", q[0]).attr("y1", y(q[1])).attr("y2", y(mirror[i][1])).attr("stroke-opacity", (0.05 + 0.4 * Math.sqrt(nAt(q[0]) / nMax)).toFixed(3)); });
      g.append("path").attr("class", "edge").attr("d", P(data)); g.append("path").attr("class", "edge mirror").attr("d", P(mirror));
      g.append("path").attr("class", "fit").attr("d", P(fitS));
      g.selectAll("circle").data(e.cells).join("circle").attr("class", c => c.n >= 40 ? "full" : "thin").attr("cx", c => x(c.a)).attr("cy", c => y(c.dev)).attr("r", 2.8)
        .append("title").text(c => e.p + ", died " + c.a + ": " + c.pct + "% (" + (c.dev > 0 ? "+" : "") + c.dev.toFixed(1) + " points from the period's " + e.pct + "%), n = " + c.n + (c.n < 40 ? " (fewer than 40)" : ""));
      g.append("path").attr("class", "hit").attr("d", P(fitS));
      g.on("click", () => { if (opt.onPick) opt.onPick(k); });
      return { g, e, col, endY: y(fitS[fitS.length - 1][1]) };
    });
    // names and slopes at the right end, spread apart
    const labs = bands.map((b, k) => ({ b, k, y: b.endY })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) labs[i].y = Math.max(labs[i].y, labs[i - 1].y + 13);
    const labG = svg.append("g");
    labs.forEach(l => { l.t = labG.append("text").attr("class", "lf-bl").attr("x", WA - m.r + 6).attr("y", l.y + 3).style("fill", l.b.col).attr("opacity", 0)
      .text(l.b.e.p + " " + (l.b.e.slope > 0 ? "+" : "") + l.b.e.slope.toFixed(2)).on("click", () => opt.onPick && opt.onPick(l.k)); l.b.label = l.t; });
    svg.append("text").attr("class", "lf-ax").attr("x", WA - m.r + 6).attr("y", m.t + 2).text("slope, points per decade");
    // ---- B: cemeteries of one period
    function drawB(k) {
      const e = E[k], S = e.sites.filter(s => s.slope != null), rows = S.concat([{ name: "POOLED", n: e.n, pct: e.pct, slope: e.slope, pooled: true }]);
      // the period's own colour, as its line in the chart beside: a dark shade for cemeteries that slope down, a light one
      // for those that slope up
      const base = cols[e.p] || "#55544f", dark = d3.color(base).darker(0.9).formatHex(), light = d3.interpolateLab(base, "#ffffff")(0.5);
      const rh = 22, mB = { l: side ? 112 : 124, r: side ? 92 : 128, t: 34, b: 34 }, HB = mB.t + rows.length * rh + mB.b;
      const big = d3.max(rows, r => Math.abs(r.slope)), xl = Math.max(4, Math.ceil(big * 1.3 + 0.5));   // room for the value labels
      const xb = d3.scaleLinear().domain([-xl, xl]).range([mB.l, WB - mB.r]);
      elB.innerHTML = "";
      const sb = d3.select(elB).append("svg").attr("class", "lf-c9b-svg").attr("viewBox", "0 0 " + WB + " " + HB).attr("width", "100%").attr("role", "img")
        .attr("aria-label", "Slope of stress lines on age at death in each cemetery of the " + e.p + " period");
      sb.append("text").attr("class", "lf-h").attr("x", 0).attr("y", 12).text(e.p + ": slope in each cemetery");
      sb.append("text").attr("class", "lf-ax").attr("x", 0).attr("y", 26).text("cemeteries with at least " + L.sites_min + " scorable canines (" + S.length + " of " + e.sites_all + ")");
      sb.append("rect").attr("class", "neg").attr("x", xb(-xl)).attr("y", mB.t - 4).attr("width", xb(0) - xb(-xl)).attr("height", rows.length * rh + 4);
      xb.ticks(6).forEach(v => { sb.append("line").attr("class", v ? "grid" : "zero").attr("x1", xb(v)).attr("x2", xb(v)).attr("y1", mB.t - 4).attr("y2", mB.t + rows.length * rh);
        sb.append("text").attr("class", "lf-ax").attr("x", xb(v)).attr("y", mB.t + rows.length * rh + 14).attr("text-anchor", "middle").text(v); });
      sb.append("text").attr("class", "lf-ax").attr("x", (mB.l + WB - mB.r) / 2).attr("y", HB - 4).attr("text-anchor", "middle").text("slope on age at death, points per decade");
      rows.forEach((r, i) => {
        const yy = mB.t + i * rh + rh / 2, pos = r.slope > 0, c = pos ? light : dark, g = sb.append("g").attr("class", "lf-site" + (r.pooled ? " pooled" : ""));
        g.append("text").attr("class", "lf-sn").attr("x", mB.l - 8).attr("y", yy + 4).attr("text-anchor", "end").text(r.name.length > 18 ? r.name.slice(0, 17) + "…" : r.name).append("title").text(r.name);
        g.append("line").attr("x1", xb(0)).attr("x2", xb(r.slope)).attr("y1", yy).attr("y2", yy).attr("stroke", c).attr("stroke-opacity", 0.85).attr("stroke-width", 5);
        g.append("circle").attr("cx", xb(r.slope)).attr("cy", yy).attr("r", r.pooled ? 6 : 4.6).attr("fill", c).attr("stroke", "#f3f2ee").attr("stroke-width", 1.5);
        g.append("text").attr("class", "lf-sv").attr("x", xb(r.slope) + (pos ? 10 : -10)).attr("y", yy + 4).attr("text-anchor", pos ? "start" : "end").style("fill", pos ? base : dark).text((pos ? "+" : "") + r.slope.toFixed(2));
        g.append("text").attr("class", "lf-ax").attr("x", WB - mB.r + 10).attr("y", yy + 4).text("n = " + r.n + " · " + Math.round(r.pct) + "%");
        g.append("title").text(r.name + ": " + (pos ? "+" : "") + r.slope.toFixed(2) + " points per decade; " + r.n + " scorable canines, " + r.pct + "% with a line");
      });
    }
    let shown = 0;
    return {
      // the ribbons one after another, earliest first; done() once the last is in
      showBands(done) {
        const step = k => {
          if (k >= n) { if (done) done(); return; }
          const b = bands[k]; b.g.style("pointer-events", null);
          (REDUCED ? b.g : b.g.transition().duration(700)).attr("opacity", 1); (REDUCED ? b.label : b.label.transition().duration(700)).attr("opacity", 1);
          shown = k + 1; setTimeout(() => step(k + 1), REDUCED ? 0 : 650);
        };
        step(0);
      },
      focus(k) { svg.classed("picked", k >= 0); bands.forEach((b, j) => { b.g.classed("sel", j === k); b.label.classed("dim", j !== k); }); if (k >= 0) drawB(k); },
    };
  }

  // ------------------------------------------------------------------ C8
  const SEG = ["#dedcd5", "#8fbbee", "#1f5aa8"], SEGN = ["no line", "one line", "two or more lines"];
  function c8(el, L, opt) {
    opt = opt || {};
    const E = L.eras, n = E.length, W = Math.max(320, el.clientWidth || 560), narrow = W < 460;
    el.innerHTML = "<div class='lf-c8'><div class='lf-c8a'></div><div class='lf-c8b'></div></div>";
    const wrap = el.querySelector(".lf-c8");
    // ---- A
    const m = { l: narrow ? 92 : 108, r: narrow ? 58 : 70, t: 30, b: 34 }, rh = 28, bh = 18, H = m.t + n * rh + m.b;
    const x = d3.scaleLinear().domain([0, 100]).range([m.l, W - m.r]);
    const svg = d3.select(wrap.querySelector(".lf-c8a")).append("svg").attr("viewBox", "0 0 " + W + " " + H).attr("width", "100%").attr("role", "img")
      .attr("aria-label", "Adults by how many stress lines the lower canine carries, by period");
    let lx = m.l; SEGN.forEach((s, i) => { svg.append("rect").attr("x", lx).attr("y", 6).attr("width", 11).attr("height", 11).attr("fill", SEG[i]);
      const t = svg.append("text").attr("class", "lf-ax").attr("x", lx + 15).attr("y", 15).text(s); lx += 15 + t.node().getComputedTextLength() + 16; });
    [0, 25, 50, 75, 100].forEach(v => { svg.append("line").attr("class", "grid").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H - m.b + 4);
      svg.append("text").attr("class", "lf-ax").attr("x", x(v)).attr("y", H - m.b + 17).attr("text-anchor", "middle").text(v + "%"); });
    svg.append("text").attr("class", "lf-ax").attr("x", (m.l + W - m.r) / 2).attr("y", H - 3).attr("text-anchor", "middle").text("share of adults with a scorable lower canine");
    const rowsA = E.map((e, k) => {
      const y0 = m.t + k * rh + (rh - bh) / 2, g = svg.append("g").attr("class", "lf-c8row").attr("data-k", k).attr("opacity", 0);
      const base = g.append("rect").attr("class", "base").attr("x", x(0)).attr("y", y0).attr("width", x(100) - x(0)).attr("height", bh).attr("opacity", 0);
      g.append("text").attr("class", "lf-rl").attr("x", m.l - 10).attr("y", y0 + bh / 2 + 4).attr("text-anchor", "end").text(e.p);
      let acc = 0; const segs = e.comp.map((v, i) => { const a = acc; acc += v;
        const r = g.append("rect").attr("x", x(a)).attr("y", y0).attr("height", bh).attr("width", 0).attr("fill", SEG[i]).attr("data-w", Math.max(0, x(a + v) - x(a) - (i < 2 ? 1 : 0)));
        r.append("title").text(e.p + ": " + v + "% " + SEGN[i] + " (" + e.comp_n[i] + " of " + e.n + ")");
        const t = g.append("text").attr("class", "lf-cv").attr("x", (x(a) + x(a + v)) / 2).attr("y", y0 + bh / 2 + 4).attr("text-anchor", "middle").attr("opacity", 0)
          .style("fill", i === 2 ? "#fbf8f1" : "#1a1a18").text(x(a + v) - x(a) > 20 ? Math.round(v) : "");
        return { r, t }; });
      g.append("text").attr("class", "lf-ax").attr("x", W - m.r + 8).attr("y", y0 + bh / 2 + 4).text("n = " + d3.format(",")(e.n));
      g.on("mouseenter", () => focus(k, false)).on("mouseleave", () => focus(-1, false)).on("click", () => focus(k, true));
      return { g, segs, y0, base };
    });
    // ---- B
    const mb = { l: 38, r: narrow ? 8 : 110, t: 22, b: 46 }, HB = 270, cw = (W - mb.l - mb.r) / n;
    const yB = d3.scaleLinear().domain([0, 60]).range([HB - mb.b, mb.t]);
    const sb = d3.select(wrap.querySelector(".lf-c8b")).append("svg").attr("viewBox", "0 0 " + W + " " + HB).attr("width", "100%").attr("role", "img")
      .attr("aria-label", "Each cemetery's share with two or more lines, by period");
    sb.append("text").attr("class", "lf-ax").attr("x", 0).attr("y", 10).text("each cemetery with at least " + L.sites_min + " scorable canines, sized by sample · the bar is the period's pooled value");
    [0, 20, 40, 60].forEach(v => { sb.append("line").attr("class", "grid").attr("x1", mb.l).attr("x2", W - mb.r).attr("y1", yB(v)).attr("y2", yB(v));
      sb.append("text").attr("class", "lf-ax").attr("x", mb.l - 5).attr("y", yB(v) + 3).attr("text-anchor", "end").text(v + "%"); });
    const rS = d3.scaleSqrt().domain([0, d3.max(E, e => d3.max(e.sites, s => s.n))]).range([0, Math.min(11, cw / 5)]);
    const colsB = E.map((e, k) => {
      const cx = mb.l + cw * (k + 0.5), g = sb.append("g").attr("class", "lf-c8col").attr("data-k", k).attr("opacity", 0).style("pointer-events", "none");
      g.append("rect").attr("class", "hov").attr("x", cx - cw / 2).attr("width", cw).attr("y", mb.t - 6).attr("height", HB - mb.t - mb.b + 40);
      g.on("mouseenter", () => focus(k, false)).on("mouseleave", () => focus(-1, false)).on("click", () => focus(k, true));
      g.append("text").attr("class", "lf-rl").attr("x", cx).attr("y", HB - mb.b + 30).attr("text-anchor", "middle").style("font-size", narrow ? "9.5px" : null).text(narrow ? e.p.replace(" medieval", " med.").replace("Early modern", "E. modern") : e.p);
      g.append("text").attr("class", "lf-ax").attr("x", cx).attr("y", HB - mb.b + 14).attr("text-anchor", "middle").text(e.sites.length + " sites");
      g.append("line").attr("class", "pool").attr("x1", cx - cw * 0.34).attr("x2", cx + cw * 0.34).attr("y1", yB(e.comp[2])).attr("y2", yB(e.comp[2]));
      g.append("text").attr("class", "lf-pv").attr("x", cx + cw * 0.36).attr("y", yB(e.comp[2]) + 4).text(Math.round(e.comp[2]));
      e.sites.forEach((s, i) => {
        const jx = cx + (((i * 0.618) % 1) - 0.5) * cw * 0.55;
        const d = g.append("g").attr("class", "lf-dot").attr("transform", "translate(" + jx.toFixed(1) + "," + yB(s.multi).toFixed(1) + ")");
        d.append("circle").attr("r", Math.max(2.4, rS(s.n))).attr("fill", "#5b93dd").attr("fill-opacity", 0.75).attr("stroke", "#f3f2ee").attr("stroke-width", 0.8);
        d.append("title").text(s.name + " (" + e.p + "): " + s.multi + "% with two or more lines · " + s.n + " scorable canines");
        if (k === n - 1 && !narrow) d.append("text").attr("class", "lf-ax").attr("x", W - mb.r - jx + 4).attr("y", 3).text(s.name);
      });
      return g;
    });
    let pinned = -1;
    // a period picked out in both panels while the pointer is on it (or after a click on it); leaving puts every
    // period back to full colour
    function focus(k, pin) {
      if (pin) pinned = k; else if (k < 0) pinned = -1;
      const f = k >= 0 ? k : pinned;
      wrap.classList.toggle("focused", f >= 0);
      rowsA.forEach((r, j) => r.g.classed("dim", f >= 0 && j !== f));
      colsB.forEach((g, j) => g.classed("dim", f >= 0 && j !== f));
    }
    return {
      rowRect(k) { const r = rowsA[k], b = svg.node().getBoundingClientRect(), s = b.width / W;
        return { left: b.left + x(0) * s, top: b.top + r.y0 * s, width: (x(100) - x(0)) * s, height: bh * s }; },
      // a flown bar has landed: the row shows as one bar in its C10 colour
      landRow(k, col) { const r = rowsA[k]; r.base.attr("fill", col).attr("opacity", 1); r.g.attr("opacity", 1); },
      // then it splits by how many lines, one segment after another, left to right, and its numbers come in
      revealRow(k, ms) { const r = rowsA[k]; r.g.attr("opacity", 1); const each = ms / 3;
        r.segs.forEach((q, i) => { (ms ? q.r.transition().delay(i * each).duration(each * 0.9).ease(d3.easeCubicInOut) : q.r).attr("width", q.r.attr("data-w"));
          (ms ? q.t.transition().delay(i * each + each * 0.7).duration(300) : q.t).attr("opacity", 1); });
        (ms ? r.base.transition().delay(ms).duration(200) : r.base).attr("opacity", 0); },
      showSites(k, ms) { colsB[k].style("pointer-events", null); (ms ? colsB[k].transition().duration(ms) : colsB[k]).attr("opacity", 1); },
      focus,
      pin(k) { pinned = k; focus(-1, false); },
    };
  }

  // ------------------------------------------------------------------ the flight from C10 down to C8A
  // Copies of C10's bars, inside the panel (box: the scrolling box, which clips them; from/to are rects in its content's
  // coordinates), wavy at first (a clip-path polygon), fly to C8A's rows, widen to the full row and flatten into
  // rectangles. land(k) as each arrives; all() once the last has.
  function fly(box, from, to, cols, land, all) {
    const wave = (k, flat) => "polygon(" + d3.range(0, 21).map(i => (i * 5) + "% " + (flat ? 0 : 14 + 10 * Math.sin(i * 0.9 + k)).toFixed(1) + "%").concat(d3.range(20, -1, -1).map(i => (i * 5) + "% " + (flat ? 100 : 86 + 10 * Math.sin(i * 1.1 + k * 2)).toFixed(1) + "%")).join(",") + ")";
    const dur = REDUCED ? 0 : 1600, gap = REDUCED ? 0 : 180, ease = "cubic-bezier(.45,0,.2,1)"; let landed = 0;
    from.forEach((a, k) => {
      const b = to[k], div = document.createElement("div");
      div.className = "lf-fly"; Object.assign(div.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px", background: cols[k], clipPath: wave(k, false) });
      box.appendChild(div);
      setTimeout(() => {
        Object.assign(div.style, { transition: ["left", "top", "width", "height", "clip-path"].map(p => p + " " + dur + "ms " + ease).join(","),
          left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px", clipPath: wave(k, true) });
        setTimeout(() => { land(k); div.remove(); if (++landed === from.length && all) all(); }, dur + 30);
      }, k * gap + 30);
    });
  }

  window.LEHFigs = { c10, c9, c8, fly, barCol };
})();
