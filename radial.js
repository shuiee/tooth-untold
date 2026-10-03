/* The Tooth Untold: the radial timeline (window.ToothRadial).

   Five records leave one shared point in the gap between a canine and a first molar: caries, pathogens,
   wear and LEH, metals, artificial interventions. Drawn in perspective: the teeth sit deep in the page and the
   lines come out towards the viewer. A line's length is the time its record covers, on one shared scale; a
   stretch with no record is a gap in the line. The timeline is read off circles: one at the start of every record,
   filled where a record opens, breaks or resumes, hollow at an ordinary boundary inside a run, and a larger
   one at the far end beside the name. Inside the teeth the lines are soft and blurred; outside, crisp.

   Hand-built SVG, no libraries. The data is radial-data.js. The teeth arrive as pictures from the page's
   own renderer (app.js, radialTeeth()), each with a white and a black silhouette for the blur and the mask.
   Styles are the .rd-* rules in index.html. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- the three constants of the geometry
  // R0      radius where every record starts, just clear of the teeth
  // RMAX    radius the longest possible record reaches
  // MAX_SPAN  years that reach RMAX: the longest record in the data, so a longer one rescales every line together
  // Radius for t years into a record: R0 + (t / MAX_SPAN) * (RMAX - R0). Every record starts at R0 whatever its
  // real start date, so distance along a line means "years into that record". The figure is then projected
  // (see Perspective below) and scaled by one factor so the names stay on canvas.
  const R0 = 150, RMAX = 585;
  const DATA = window.RADIAL_DATA || [];
  const MAX_SPAN = Math.max(...DATA.map(c => c.segs[c.segs.length - 1][1] - c.segs[0][0]));
  const rAt = t => R0 + (t / MAX_SPAN) * (RMAX - R0);

  // Tall, narrow containers turn the whole set of lines (the teeth stay upright) to whichever angle lets the
  // figure be largest, so the long lines run along the long side and the names stay on canvas.
  // On small screens, names of more than one word that are longer than WRAP_AT characters break onto two lines.
  const PORTRAIT = 1.05, TURN_STEP = 6, WRAP_AT = 10;
  // Perspective. The lines lie on a cone that points at the viewer: the shared point and the teeth sit deepest,
  // and a point on a line comes nearer the further out it is, at the same rate on every line, so equal years still
  // sit at equal distances along every line (in the figure's own 3D space). A point at radius w has depth
  // Z_HUB + (Z_END - Z_HUB) * w / RMAX (positive is behind the page); the camera is CAM units in front of the page
  // and looks down a little (TILT degrees), so the cone reads as three-dimensional.
  // Circles, line widths and names grow with nearness; names by up to NAME_GROW times. K_MAX caps the screen
  // scale on very large screens.
  const CAM = 1000, Z_HUB = 760, Z_END = -170, TILT = 10, NAME_GROW = 1.5, K_MAX = 1.3;
  function project(angDeg, w) {
    const a = angDeg * Math.PI / 180, t = TILT * Math.PI / 180, x = w * Math.cos(a), y = w * Math.sin(a), z = Z_HUB + (Z_END - Z_HUB) * w / RMAX;
    const y2 = y * Math.cos(t) - z * Math.sin(t), z2 = y * Math.sin(t) + z * Math.cos(t), s = CAM / (CAM + z2);
    return [x * s, y2 * s, s];
  }
  // how much nearer than the page a point at radius w sits, averaged round the cone (for sizes)
  const depthScale = w => CAM / (CAM + (Z_HUB + (Z_END - Z_HUB) * w / RMAX) * Math.cos(TILT * Math.PI / 180));
  // teeth: height in figure units and the gap between them; the shared point is the middle of the gap
  const TOOTH_H = { canine: 206, molar: 168 }, GAP = 30;
  // decorative hairlines: composition only, no data
  const GHOSTS = 45, GHOST_SEED = 20261001, GHOST_CLEAR = 7, GHOST_APART = 2.4;
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const yr = v => v < 0 ? Math.abs(v) + " BCE" : v + " CE";
  function range(a, b) {
    if (a === b) return yr(a);
    if (a < 0 && b < 0) return Math.abs(a) + " – " + Math.abs(b) + " BCE";
    if (a >= 0 && b >= 0) return a + " – " + b + " CE";
    return yr(a) + " – " + yr(b);
  }
  const years = d => Math.max(1, d[1] - d[0]);   // a single-year record counts as one year
  const amount = (c, d) => d[2] == null ? "count not in the data" : d[2].toLocaleString("en-GB") + " " + c.unit;
  const press = f => ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); f(); } };

  /* mount(host, { teeth, animate, open, onOpen, padTop, padBottom })
       teeth    { canine: {art, white, black, w, h}, molar: {...} }  (pictures as URLs, w/h in pixels) or null
       animate  play the one entrance
       open     a Set of category keys whose "how much was gathered" view is on; kept across rebuilds
       onOpen   called with a category key when its name is activated (the page opens that section);
                without it, the name toggles the per-year view like the end dot
       padTop, padBottom  room to leave above and below the figure, in pixels (or functions returning it)  */
  function mount(host, opts) {
    const open = opts.open || new Set();
    let svg = null, timers = [];

    function build(animate) {
      timers.forEach(clearTimeout); timers = [];
      if (svg) svg.remove();
      // padTop / padBottom: room the page needs above and below the figure (its running head and caption)
      const W = Math.max(280, host.clientWidth), H = Math.max(320, host.clientHeight);
      const val = v => typeof v === "function" ? v() : v;   // numbers, or functions read on every rebuild
      const padTop = Math.max(24, val(opts.padTop) || 0), padBottom = Math.max(24, val(opts.padBottom) || 0);
      const narrow = W < 640, baseSize = narrow ? 15 : 21, pad = narrow ? 10 : 24;
      svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, class: "rd", role: "group",
        "aria-label": "Radial timeline of the tooth record, drawn in perspective: " + DATA.length + " lines come towards you from a point between a canine and a first molar, one each for " + DATA.map(c => c.name.toLowerCase()).join(", ") + ". A line's length is the time its record covers, on one shared scale; circles mark the records within it and gaps are years with no record. Hover or focus a circle for its years and how much was gathered; activate a name to open its section, or an end circle to show how much was gathered per year." }, host);
      const defs = el("defs", {}, svg);

      // ---- names: one or two lines each, sized by how near their line's end comes
      const probe = el("text", { class: "rd-name" }, svg);
      const width = (t, size) => { probe.style.fontSize = size + "px"; probe.textContent = t; return probe.getComputedTextLength(); };
      const ends = DATA.map(c => rAt(c.segs[c.segs.length - 1][1] - c.segs[0][0]));
      const sEnd = DATA.map((c, i) => depthScale(ends[i]));
      const sRef = Math.min(...sEnd), dot = w => Math.max(0.55, Math.min(1.7, depthScale(w) / sRef));
      const nameSize = DATA.map((c, i) => Math.round(baseSize * Math.min(NAME_GROW, sEnd[i] / sRef)));
      const nameLines = DATA.map((c, i) => {
        const w = c.name.split(" ");
        if (!narrow || w.length < 2 || c.name.length <= WRAP_AT) return [c.name];
        let best = null;   // the break that makes the wider line narrowest
        for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(" "), b = w.slice(k).join(" "), m = Math.max(width(a, nameSize[i]), width(b, nameSize[i])); if (!best || m < best[0]) best = [m, a, b]; }
        return [best[1], best[2]];
      });
      const nameW = nameLines.map((L, i) => Math.max(...L.map(t => width(t, nameSize[i]))));
      const lineH = i => nameSize[i] * 1.12, dotGap = i => 8 + 6 * dot(ends[i]);
      probe.remove();

      // ---- fit: the largest scale k (screen pixels per figure unit) and the shared point's place on screen that
      // keep every line, end circle and name on canvas, for a given turn of the whole set
      const layout = turn => {
        const hub = project(0, 0), rel = (a, w) => { const p = project(a, w); return [p[0] - hub[0], p[1] - hub[1]]; };
        const items = DATA.map((c, i) => {
          const o = rel(c.angle + turn, ends[i]), l = Math.hypot(o[0], o[1]) || 1, u = [o[0] / l, o[1] / l];
          const upright = Math.abs(u[0]) < 0.26, g = dotGap(i), nw = nameW[i], nh = nameLines[i].length * lineH(i);
          const bx = upright ? [-nw / 2, nw / 2] : u[0] > 0 ? [g, g + nw] : [-g - nw, -g];
          const by = upright ? (u[1] > 0 ? [g, g + nh] : [-g - nh, -g]) : [-nh / 2, nh / 2];
          return { o, u, upright, bx, by };
        });
        const ok = k => {
          let xl = pad, xh = W - pad, yl = padTop, yh = H - padBottom;
          items.forEach(t => { xl = Math.max(xl, pad - k * t.o[0] - t.bx[0]); xh = Math.min(xh, W - pad - k * t.o[0] - t.bx[1]); yl = Math.max(yl, padTop - k * t.o[1] - t.by[0]); yh = Math.min(yh, H - padBottom - k * t.o[1] - t.by[1]); });
          return xl <= xh && yl <= yh ? [(xl + xh) / 2, (yl + yh) / 2] : null;
        };
        let lo = 0.05, hi = 3;
        if (!ok(lo)) return { k: lo, at: [W / 2, (padTop + H - padBottom) / 2], items, hub };
        for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
        return { k: lo, at: ok(lo), items, hub };
      };
      let turn = 0, L = layout(0);
      if (H / W > PORTRAIT) for (let t = TURN_STEP; t < 360; t += TURN_STEP) { const c = layout(t); if (c.k > L.k * 1.005) { L = c; turn = t; } }
      const k = Math.min(L.k, K_MAX), at = L.at, ang = c => c.angle + turn;
      const P = (a, w) => { const p = project(a, w); return [at[0] + k * (p[0] - L.hub[0]), at[1] + k * (p[1] - L.hub[1])]; };
      const r0px = Math.min(...[0, 60, 120, 180, 240, 300].map(a => Math.hypot(...P(a, R0).map((v, j) => v - at[j]))));
      // a tapered band along a line, from w1 to w2: perspective makes the near end wider
      const band = (A, w1, w2, h) => {
        const p = P(A, w1), q = P(A, w2), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, a = h * dot(w1), b = h * dot(w2);
        return [[p[0] + nx * a, p[1] + ny * a], [q[0] + nx * b, q[1] + ny * b], [q[0] - nx * b, q[1] - ny * b], [p[0] - nx * a, p[1] - ny * a]].map(v => v[0].toFixed(2) + "," + v[1].toFixed(2)).join(" ");
      };

      // ---- teeth: the whole models, side by side and not touching, set deep at the shared point inside R0
      const teethG = el("g", { class: "rd-teeth", "aria-hidden": "true" });
      const maskIn = el("mask", { id: "rd-in", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      const maskOut = el("mask", { id: "rd-out", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      el("rect", { width: W, height: H, fill: "#fff" }, maskOut);
      const T = opts.teeth, sHub = depthScale(0);
      if (T && T.canine && T.molar) {
        const size = key => { const t = T[key], h = TOOTH_H[key] * k * sHub; return { t, h, w: h * t.w / t.h }; };
        const c = size("canine"), m = size("molar"), g = GAP * k * sHub;
        // shrink both together if a corner would reach past R0
        const far = (x, y, w, h) => Math.max(...[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => Math.hypot(px, py)));
        let s = 1;
        for (let n = 0; n < 6; n++) {
          const ext = Math.max(far(-g / 2 - c.w * s, -c.h * s / 2, c.w * s, c.h * s), far(g / 2, -m.h * s / 2, m.w * s, m.h * s));
          if (ext <= r0px - 6) break; s *= (r0px - 6) / ext;
        }
        [["canine", c, at[0] - g / 2 - c.w * s], ["molar", m, at[0] + g / 2]].forEach(([key, o, x]) => {
          const box = { x, y: at[1] - o.h * s / 2, width: o.w * s, height: o.h * s, preserveAspectRatio: "none" };
          el("image", Object.assign({ href: o.t.art }, box), teethG);
          el("image", Object.assign({ href: o.t.white }, box), maskIn);
          el("image", Object.assign({ href: o.t.black }, box), maskOut);
        });
      }
      el("filter", { id: "rd-soft", filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs)
        .appendChild(el("feGaussianBlur", { stdDeviation: Math.max(1.6, 2.6 * k * sHub) }));

      // ---- layers, back to front. Nothing sits above the circles' hit areas but the names and the readout.
      el("clipPath", { id: "rd-band" }, defs).appendChild(el("rect", { x: 0, y: padTop, width: W, height: H - padTop - padBottom }));
      const ghostsClip = el("g", { "clip-path": "url(#rd-band)", "aria-hidden": "true" }, svg);
      const ghosts = el("g", { class: "rd-ghosts", mask: "url(#rd-out)", "aria-hidden": "true" }, ghostsClip);
      const stems = el("g", { class: "rd-stems", mask: "url(#rd-out)", "aria-hidden": "true" }, svg);
      svg.appendChild(teethG);
      const inside = el("g", { class: "rd-inside", mask: "url(#rd-in)", "aria-hidden": "true" }, svg);
      const soft = el("g", { filter: "url(#rd-soft)" }, inside);
      const lines = el("g", { class: "rd-lines" }, svg);
      const names = el("g", { class: "rd-names" }, svg);
      const read = el("g", { class: "rd-read", "aria-hidden": "true" }, svg);
      const ring = el("circle", { class: "rd-ring", r: 0 }, svg);
      const ringBox = el("rect", { class: "rd-ring", width: 0, height: 0, rx: 3 }, svg);

      // ---- decorative hairlines from the same point, from a fixed seed so they never reshuffle
      (function () {
        let seed = GHOST_SEED;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        const dAng = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
        const busy = DATA.map(ang), out = [];
        for (let tries = 0; out.length < GHOSTS && tries < 5000; tries++) {
          const a = rnd() * 360, len = rnd();
          if (busy.some(b => dAng(a, b) < GHOST_CLEAR) || out.some(o => dAng(a, o) < GHOST_APART)) continue;
          out.push(a);
          const w = R0 + Math.pow(len, 1.7) * (RMAX - R0) * 0.75, p = P(a, 0), q = P(a, w);
          el("polygon", { class: "rd-ghost", points: band(a, 0, w, 0.32) }, ghosts);
          el("line", { class: "rd-ghost-soft", x1: p[0], y1: p[1], x2: q[0], y2: q[1] }, soft);
        }
      })();

      // ---- readout: years and amount on a thin leader line
      const rLine = el("line", {}, read), rYear = el("text", { class: "rd-yr" }, read), rCount = el("text", { class: "rd-ct" }, read);
      const dir = (A, w1, w2) => { const p = P(A, w1), q = P(A, w2), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
      // the readout sits on a short leader to one side of the line; it tries both sides and both alignments
      // and takes the first place where it touches no name and stays on canvas
      function showRead(c, d, t0) {
        const A = ang(c), wm = (rAt(d[0] - t0) + rAt(Math.min(d[1], c.segs[c.segs.length - 1][1]) - t0)) / 2, q = P(A, wm), u = dir(A, R0, RMAX);
        const ux = -u[1], uy = u[0], pref = uy >= 0 ? 1 : -1;
        rYear.textContent = range(d[0], d[1]); rCount.textContent = amount(c, d);
        const nameBoxes = nameEls.map(n => n.getBBox()), clear = bx => bx.x >= 4 && bx.x + bx.width <= W - 4 && bx.y >= 4 && bx.y + bx.height <= H - 4 &&
          nameBoxes.every(n => bx.x > n.x + n.width + 3 || n.x > bx.x + bx.width + 3 || bx.y > n.y + n.height + 2 || n.y > bx.y + bx.height + 2);
        const place = (side, anchor, len) => {
          const lx = q[0] + ux * side * len, ly = q[1] + uy * side * len, tx = lx + (anchor === "end" ? -8 : 8);
          rLine.setAttribute("x1", q[0] + ux * side * 8); rLine.setAttribute("y1", q[1] + uy * side * 8); rLine.setAttribute("x2", lx); rLine.setAttribute("y2", ly);
          [[rYear, 1], [rCount, 19]].forEach(([t, dy]) => { t.setAttribute("x", tx); t.setAttribute("y", ly + dy); t.setAttribute("text-anchor", anchor); });
          const y1 = rYear.getBBox(), y2 = rCount.getBBox(), x0 = Math.min(y1.x, y2.x), x1 = Math.max(y1.x + y1.width, y2.x + y2.width);
          return { x: x0, y: y1.y, width: x1 - x0, height: y2.y + y2.height - y1.y };
        };
        read.classList.add("on");
        const tries = [];
        [34, 58, 86, 120].forEach(len => [pref, -pref].forEach(side => { const away = ux * side >= 0 ? "start" : "end"; [away, away === "start" ? "end" : "start"].forEach(an => tries.push([side, an, len])); }));
        for (const t of tries) if (clear(place(...t))) return;
        place(...tries[0]);   // nowhere is clear: fall back to the usual place
      }
      const hideRead = () => read.classList.remove("on");
      function showRing(node) {
        if (!node.matches(":focus-visible")) return;
        if (node.tagName === "text") { const b = node.getBBox(); Object.entries({ x: b.x - 6, y: b.y - 4, width: b.width + 12, height: b.height + 8 }).forEach(([kk, v]) => ringBox.setAttribute(kk, v)); ringBox.classList.add("on"); }
        else { ring.setAttribute("cx", node.getAttribute("cx")); ring.setAttribute("cy", node.getAttribute("cy")); ring.setAttribute("r", +node.getAttribute("r") + 2); ring.classList.add("on"); }
      }
      const hideRing = () => { ring.classList.remove("on"); ringBox.classList.remove("on"); };

      // ---- the lines
      const groups = [], nameEls = [], stemEls = [];
      function lit(g, on) {
        svg.classList.toggle("rd-dim", on);
        groups.forEach((n, i) => { n.classList.toggle("lit", on && n === g); nameEls[i].classList.toggle("lit", on && n === g); });
      }
      DATA.forEach((c, ci) => {
        const A = ang(c), t0 = c.segs[0][0], tEnd = c.segs[c.segs.length - 1][1], wEnd = ends[ci], W_ = t => rAt(t - t0);
        const g = el("g", { "data-cat": c.key, class: open.has(c.key) ? "open" : null }, lines);
        groups.push(g);
        // from the shared point to R0: crisp outside the teeth, soft inside them
        const p0 = P(A, 0), p1 = P(A, R0);
        stemEls.push(el("line", { class: "rd-stem", x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], "stroke-width": (0.9 * dot(R0)).toFixed(2) }, stems));
        el("line", { class: "rd-stem-soft", x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, soft);
        // a hit strip for "hover the line", underneath every circle so it never takes their events
        const e = P(A, wEnd);
        el("line", { class: "rd-hit", x1: p1[0], y1: p1[1], x2: e[0], y2: e[1] }, g);
        // covered stretches; a break is a break. Each is a band that widens as it comes nearer.
        c.segs.forEach(sg => el("polygon", { class: "rd-span", points: band(A, W_(sg[0]), W_(sg[1]), 0.48) }, g));
        // how much was gathered per year: one soft circle on the middle of each record, scaled within this line
        let vmax = 0;
        c.dens.forEach(d => { if (d[2] != null) vmax = Math.max(vmax, d[2] / years(d)); });
        c.dens.forEach(d => {
          if (d[2] == null || !vmax) return;
          const wm = (W_(d[0]) + W_(d[1])) / 2, q = P(A, wm);
          el("circle", { class: "rd-vol", cx: q[0], cy: q[1], r: (3 + Math.sqrt(d[2] / years(d) / vmax) * 17) * dot(wm) * Math.min(1, k * 1.2) }, g);
        });
        // circles: the start of every record, filled where the record opens or resumes after a gap, hollow
        // inside a continuous run; and a filled one where the record breaks (the end of a stretch before a gap)
        const marks = [];
        c.dens.forEach((d, i) => {
          const prev = c.dens[i - 1], next = c.dens[i + 1];
          marks.push({ d, at: d[0], edge: !prev || prev[1] < d[0] });
          if (next && d[1] < next[0]) marks.push({ d, at: d[1], edge: true, brk: true });
        });
        const lastD = c.dens[c.dens.length - 1], pointEnd = lastD && lastD[0] === lastD[1] && lastD[1] === tEnd;
        const spots = marks.map(m => P(A, W_(m.at))).concat([e]);
        const hitR = q => Math.max(1, Math.min(12, ...spots.filter(o => o !== q && (o[0] !== q[0] || o[1] !== q[1])).map(o => Math.hypot(o[0] - q[0], o[1] - q[1]) / 2)));
        // the end circle goes in first, beneath the record circles, so no record's hit area is covered
        const endSlot = el("g", {}, g);
        marks.forEach((m, mi) => {
          if (pointEnd && m.d === lastD && !m.brk) return;   // drawn by the end dot below
          const d = m.d, w = W_(m.at), q = spots[mi], sc = dot(w), base = (m.edge ? 3.8 : 3.1) * sc;
          const liftLine = el("polygon", { class: "rd-lift", points: band(A, W_(d[0]), W_(d[1]), 1.2) }, g);
          const dotEl = el("circle", { class: "rd-mark" + (m.edge ? " edge" : ""), cx: q[0], cy: q[1], r: base, "stroke-width": (1.1 * sc).toFixed(2) }, g);
          const hit = el("circle", { class: "rd-markhit", cx: q[0], cy: q[1], r: hitR(q).toFixed(1), tabindex: 0, role: "button",
            "aria-label": c.name + (m.brk ? ", record breaks after " : ", ") + range(d[0], d[1]) + ", " + amount(c, d) }, g);
          const on = () => { liftLine.classList.add("on"); dotEl.setAttribute("r", base + 1.4 * sc); showRead(c, d, t0); };
          const off = () => { liftLine.classList.remove("on"); dotEl.setAttribute("r", base); hideRead(); };
          hit.addEventListener("mouseenter", on); hit.addEventListener("mouseleave", off);
          hit.addEventListener("focus", () => { on(); lit(g, true); showRing(hit); });
          hit.addEventListener("blur", () => { off(); lit(g, false); hideRing(); });
          hit.addEventListener("keydown", press(on));
        });
        // the far end: a larger circle, then the name
        const er = 6 * dot(wEnd);
        const end = el("circle", { class: "rd-end", cx: e[0], cy: e[1], r: er, tabindex: 0, role: "button",
          "aria-pressed": open.has(c.key) ? "true" : "false", "aria-label": (pointEnd ? c.name + ", " + range(lastD[0], lastD[1]) + ", " + amount(c, lastD) + ". " : c.name + ": ") + "show how much was gathered per year" }, g);
        endSlot.appendChild(end);
        if (pointEnd) {
          end.addEventListener("mouseenter", () => { end.setAttribute("r", er + 1.4); showRead(c, lastD, t0); });
          end.addEventListener("mouseleave", () => { end.setAttribute("r", er); hideRead(); });
          end.addEventListener("focus", () => showRead(c, lastD, t0));
          end.addEventListener("blur", hideRead);
        }
        // names sit beyond the end dot: to its side, or centred above or below it when the line is near vertical
        const it = L.items[ci], fs = nameSize[ci], lh = lineH(ci), nl = nameLines[ci].length, gp = dotGap(ci);
        const lx = it.upright ? e[0] : e[0] + (it.u[0] > 0 ? gp : -gp);
        const y0 = it.upright ? (it.u[1] > 0 ? e[1] + gp + fs * 0.78 : e[1] - gp - (nl - 1) * lh - fs * 0.22) : e[1] + fs / 3 - (nl - 1) * lh / 2;
        const opens = typeof opts.onOpen === "function";
        const name = el("text", { class: "rd-name" + (open.has(c.key) ? " open" : "") + (opens ? " go" : ""), x: lx, y: y0, "text-anchor": it.upright ? "middle" : it.u[0] > 0 ? "start" : "end",
          style: "font-size:" + fs + "px", tabindex: 0, role: opens ? "link" : "button", "aria-pressed": opens ? null : open.has(c.key) ? "true" : "false",
          "aria-label": opens ? c.name + ": open this section" : c.name + ": show how much was gathered per year" }, names);
        if (nl === 1) name.textContent = c.name;
        else nameLines[ci].forEach((t, li) => { el("tspan", { x: lx, dy: li ? lh : 0 }, name).textContent = t; });
        nameEls.push(name);
        function toggle() {
          const on = !open.has(c.key);
          if (on) open.add(c.key); else open.delete(c.key);
          g.classList.toggle("open", on); name.classList.toggle("open", on);
          [name, end].forEach(n => { if (n.hasAttribute("aria-pressed")) n.setAttribute("aria-pressed", on ? "true" : "false"); });
        }
        const go = opens ? () => opts.onOpen(c.key) : toggle;
        end.addEventListener("click", toggle); end.addEventListener("keydown", press(toggle));
        name.addEventListener("click", go); name.addEventListener("keydown", press(go));
        [name, end].forEach(n => {
          n.addEventListener("focus", () => { lit(g, true); showRing(n); });
          n.addEventListener("blur", () => { lit(g, false); hideRing(); });
          n.addEventListener("mouseenter", () => lit(g, true));
          n.addEventListener("mouseleave", () => lit(g, false));
        });
        g.addEventListener("mouseenter", () => lit(g, true));
        g.addEventListener("mouseleave", () => lit(g, false));
      });

      // ---- names that still run into each other: the longer one moves outward along its line
      const box = n => n.getBBox(), meets = (p, q) => p.x < q.x + q.width + 6 && q.x < p.x + p.width + 6 && p.y < q.y + q.height + 2 && q.y < p.y + p.height + 2;
      for (let pass = 0; pass < 6; pass++) {
        let moved = false;
        nameEls.forEach((p, i) => nameEls.forEach((q, j) => {
          if (j <= i || !meets(box(p), box(q))) return;
          const kk = DATA[i].name.length >= DATA[j].name.length ? i : j, n = nameEls[kk], u = L.items[kk].u;
          n.setAttribute("x", +n.getAttribute("x") + u[0] * 12); n.setAttribute("y", +n.getAttribute("y") + u[1] * 12);
          n.querySelectorAll("tspan").forEach(t => t.setAttribute("x", n.getAttribute("x")));
          moved = true;
        }));
        if (!moved) break;
      }

      // ---- one entrance: the lines draw outward from the deep point towards you, the records fade in, then the names
      if (animate && !REDUCED) {
        const set = (n, css) => Object.assign(n.style, css);
        stemEls.forEach(s => { const l = Math.hypot(s.x2.baseVal.value - s.x1.baseVal.value, s.y2.baseVal.value - s.y1.baseVal.value); set(s, { strokeDasharray: l, strokeDashoffset: l }); });
        [ghosts, inside, names].concat(groups).forEach(n => set(n, { opacity: 0 }));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const ease = "cubic-bezier(.6,0,.2,1)";
          set(inside, { transition: "opacity 700ms ease", opacity: "" });
          set(ghosts, { transition: "opacity 1200ms ease 300ms", opacity: "" });
          stemEls.forEach((s, i) => set(s, { transition: "stroke-dashoffset 700ms " + ease + " " + i * 70 + "ms", strokeDashoffset: 0 }));
          groups.forEach((n, i) => set(n, { transition: "opacity 900ms ease " + (440 + i * 90) + "ms", opacity: "" }));
          set(names, { transition: "opacity 700ms ease 1100ms", opacity: "" });
          timers.push(setTimeout(() => [ghosts, inside, names].concat(groups, stemEls).forEach(n => { n.style.transition = ""; n.style.opacity = ""; n.style.strokeDasharray = ""; n.style.strokeDashoffset = ""; }), 2600));
        }));
      }
    }

    build(!!opts.animate);
    return {
      resize() { build(false); },
      destroy() { timers.forEach(clearTimeout); if (svg) svg.remove(); svg = null; },
    };
  }

  window.ToothRadial = { mount, R0, RMAX, MAX_SPAN };
})();
