/* The Tooth Untold: the radial timeline (window.ToothRadial).

   Five lines leave the centre of the page, one for each kind of record: caries, pathogens, wear and LEH, metals,
   artificial interventions. The centre point sits in the gap between a first molar (left, as on every other plate)
   and a canine (right). Along each line a hollow circle marks the year each record begins, read against the dotted
   year rings, and the line is darker over the years its records cover, so a gap in the record is a pale stretch.
   Every name is the same size, at the far end of its line.

   Drawn in perspective: the teeth and the centre sit deep in the page and the lines come out towards the viewer,
   so the further back a record reaches, the wider the line and the larger its circle. Distance from the centre is
   how long before the latest record a year is, on one square-root scale for every line. Inside the teeth the lines
   are soft and blurred; outside, crisp.

   Hand-built SVG, no libraries. The teeth arrive as pictures from the page's own renderer (app.js, radialTeeth()),
   each with a white and a black silhouette for the blur and the mask. Styles are the .rd-* rules in index.html. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- geometry
  // R0      radius where the lines leave the teeth: the latest year in the data
  // RMAX    radius of the oldest year in the data
  // NOW     the latest year in the data; distance from the centre is how many years before NOW a year is
  // Radius for a year A years before NOW: R0 + sqrt(A / MAX_AGE) * (RMAX - R0). The square root gives the last two
  // thousand years room beside the six thousand of the metals record; the rings (RINGS, calendar years) mark the
  // scale. The figure is projected (see Perspective) and scaled by one factor so every circle and name stays on
  // canvas, with the centre point fixed at the centre of the page.
  const R0 = 230, RMAX = 585;
  const DATA = window.RADIAL_DATA || [];
  const NOW = Math.max(...DATA.map(c => c.segs[c.segs.length - 1][1]));
  const MAX_AGE = NOW - Math.min(...DATA.map(c => c.segs[0][0]));
  const rAge = a => R0 + Math.sqrt(Math.max(0, a) / MAX_AGE) * (RMAX - R0);
  const rYear = y => rAge(NOW - y);
  const RINGS = [1800, 1500, 1000, 500, -1000, -3000], RING_AT = 72;   // RING_AT: the direction their labels sit in
  // Tall, narrow containers turn the whole set (the teeth stay upright) to whichever angle lets the figure be
  // largest. On small screens, names of more than one word longer than WRAP_AT characters break onto two lines.
  const PORTRAIT = 1.05, TURN_STEP = 6, WRAP_AT = 10;
  // Perspective. The lines lie on a cone that points at the viewer: the centre and the teeth sit deepest, and a
  // point comes nearer the further out it is. A point at radius w has depth Z_HUB + (Z_END - Z_HUB) * w / RMAX
  // (positive is behind the page); the camera is CAM units in front of the page and looks down a little (TILT
  // degrees), so the cone reads as three-dimensional. K_MAX caps the screen scale on very large screens.
  const CAM = 1000, Z_HUB = 760, Z_END = -170, TILT = 10, K_MAX = 1.3;
  function project(angDeg, w) {
    const a = angDeg * Math.PI / 180, t = TILT * Math.PI / 180, x = w * Math.cos(a), y = w * Math.sin(a), z = Z_HUB + (Z_END - Z_HUB) * w / RMAX;
    const y2 = y * Math.cos(t) - z * Math.sin(t), z2 = y * Math.sin(t) + z * Math.cos(t), s = CAM / (CAM + z2);
    return [x * s, y2 * s, s];
  }
  // how much nearer than R0 a point at radius w sits (for line widths and circle sizes)
  const depthScale = w => CAM / (CAM + (Z_HUB + (Z_END - Z_HUB) * w / RMAX) * Math.cos(TILT * Math.PI / 180));
  const near = w => depthScale(w) / depthScale(R0);
  // teeth: height in figure units and the gap between them; the centre point is the middle of the gap
  const TOOTH_H = { canine: 340, molar: 276 }, GAP = 40;
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
  const amount = (c, d) => d[2] == null ? "count not in the data" : d[2].toLocaleString("en-GB") + " " + c.unit;
  const press = f => ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); f(); } };
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* mount(host, { teeth, animate, onOpen, padTop, padBottom })
       teeth    { canine: {art, white, black, w, h}, molar: {...} }  (pictures as URLs, w/h in pixels) or null
       animate  play the one entrance: the lines shoot out of the centre towards the viewer
       onOpen   called with a category key when its name is activated (the page opens that section)
       padTop, padBottom  room to leave above and below the figure, in pixels (or functions returning it)  */
  function mount(host, opts) {
    let svg = null, raf = 0;

    function build(animate) {
      cancelAnimationFrame(raf);
      if (svg) svg.remove();
      const W = Math.max(280, host.clientWidth), H = Math.max(320, host.clientHeight);
      const val = v => typeof v === "function" ? v() : v;
      const padTop = Math.max(24, val(opts.padTop) || 0), padBottom = Math.max(24, val(opts.padBottom) || 0);
      const narrow = W < 640, nameSize = narrow ? 15 : 20, pad = narrow ? 10 : 24;
      const C = [W / 2, H / 2];   // the centre point: the centre of the page
      svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, class: "rd", role: "group",
        "aria-label": "Radial timeline of the tooth record, drawn in perspective: five lines leave a point between a first molar and a canine at the centre, one each for " + DATA.map(c => c.name.toLowerCase()).join(", ") + ". Distance from the centre is how long ago a year is; a circle marks the year each record begins and the line is darker over the years the records cover. Hover or focus a circle for its years and how much was gathered; activate a name to open its section." }, host);
      const defs = el("defs", {}, svg);

      // ---- each line: its records' circles at the year each begins, and the stretches its records cover
      const LINES = DATA.map(c => {
        const marks = c.dens.map(d => ({ c, d, w: rYear(d[0]) }));
        return { c, marks, wEnd: Math.max(...marks.map(m => m.w)), spans: c.segs.map(sg => [rYear(sg[1]), rYear(sg[0])]) };
      });

      // ---- names: one or two lines each, all the same size
      const probe = el("text", { class: "rd-name", style: "font-size:" + nameSize + "px" }, svg);
      const width = t => { probe.textContent = t; return probe.getComputedTextLength(); };
      const nameLines = DATA.map(c => {
        const w = c.name.split(" ");
        if (!narrow || w.length < 2 || c.name.length <= WRAP_AT) return [c.name];
        let best = null;   // the break that makes the wider line narrowest
        for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(" "), b = w.slice(k).join(" "), m = Math.max(width(a), width(b)); if (!best || m < best[0]) best = [m, a, b]; }
        return [best[1], best[2]];
      });
      const nameW = nameLines.map(L => Math.max(...L.map(width))), lineH = nameSize * 1.12, nameGap = narrow ? 10 : 14;
      probe.remove();
      const circR = (w, k) => 4.6 * near(w) * Math.min(1.25, Math.max(0.7, k));

      // ---- fit: the largest scale k (screen pixels per figure unit) that keeps every circle and name on canvas with
      // the centre point at C, for a given turn of the whole set
      const layout = turn => {
        const hub = project(0, 0), rel = (a, w) => { const p = project(a, w); return [p[0] - hub[0], p[1] - hub[1]]; };
        const names = LINES.map((Ln, ci) => {
          const o = rel(Ln.c.angle + turn, Ln.wEnd), l = Math.hypot(o[0], o[1]) || 1, u = [o[0] / l, o[1] / l];
          const upright = Math.abs(u[0]) < 0.3, nw = nameW[ci], nh = nameLines[ci].length * lineH;
          const bx = upright ? [-nw / 2, nw / 2] : u[0] > 0 ? [0, nw] : [-nw, 0];
          const by = upright ? (u[1] > 0 ? [0, nh] : [-nh, 0]) : [-nh / 2, nh / 2];
          return { o, u, upright, bx, by };
        });
        const ok = k => {
          const inX = x => x >= pad && x <= W - pad, inY = y => y >= padTop && y <= H - padBottom;
          for (const n of names) {
            const r = 10 * Math.min(1.25, k), g = nameGap + r, ex = C[0] + k * n.o[0], ey = C[1] + k * n.o[1], x = ex + n.u[0] * g, y = ey + n.u[1] * g;
            if (!inX(ex - r) || !inX(ex + r) || !inY(ey - r) || !inY(ey + r)) return false;
            if (!inX(x + n.bx[0]) || !inX(x + n.bx[1]) || !inY(y + n.by[0]) || !inY(y + n.by[1])) return false;
          }
          return true;
        };
        let lo = 0.05, hi = 3;
        if (ok(lo)) for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
        return { k: lo, names, hub };
      };
      let turn = 0, L = layout(0);
      if (H / W > PORTRAIT) for (let t = TURN_STEP; t < 360; t += TURN_STEP) { const c = layout(t); if (c.k > L.k * 1.005) { L = c; turn = t; } }
      const k = Math.min(L.k, K_MAX);
      const P = (a, w) => { const p = project(a, w); return [C[0] + k * (p[0] - L.hub[0]), C[1] + k * (p[1] - L.hub[1])]; };
      const r0px = Math.min(...[0, 60, 120, 180, 240, 300].map(a => Math.hypot(...P(a, R0).map((v, j) => v - C[j]))));
      // a tapered band along a line, from w1 to w2: perspective makes the near end wider
      const band = (A, w1, w2, h) => {
        const p = P(A, w1), q = P(A, w2), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, a = h * near(w1), b = h * near(w2);
        return [[p[0] + nx * a, p[1] + ny * a], [q[0] + nx * b, q[1] + ny * b], [q[0] - nx * b, q[1] - ny * b], [p[0] - nx * a, p[1] - ny * a]].map(v => v[0].toFixed(2) + "," + v[1].toFixed(2)).join(" ");
      };

      // ---- teeth: the whole models, molar left and canine right, set deep at the centre point inside R0
      const teethG = el("g", { class: "rd-teeth", "aria-hidden": "true" });
      const maskIn = el("mask", { id: "rd-in", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      const maskOut = el("mask", { id: "rd-out", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      el("rect", { width: W, height: H, fill: "#fff" }, maskOut);
      const T = opts.teeth, sHub = depthScale(0), teethBoxes = [];
      if (T && T.canine && T.molar) {
        const size = key => { const t = T[key], h = TOOTH_H[key] * k * sHub; return { t, h, w: h * t.w / t.h }; };
        const m = size("molar"), c = size("canine"), g = GAP * k * sHub;
        // shrink both together if a corner would reach past R0
        const far = (x, y, w, h) => Math.max(...[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => Math.hypot(px, py)));
        let s = 1;
        for (let n = 0; n < 6; n++) {
          const ext = Math.max(far(-g / 2 - m.w * s, -m.h * s / 2, m.w * s, m.h * s), far(g / 2, -c.h * s / 2, c.w * s, c.h * s));
          if (ext <= r0px - 4) break; s *= (r0px - 4) / ext;
        }
        [["molar", m, C[0] - g / 2 - m.w * s], ["canine", c, C[0] + g / 2]].forEach(([key, o, x]) => {
          const box = { x, y: C[1] - o.h * s / 2, width: o.w * s, height: o.h * s, preserveAspectRatio: "none" };
          teethBoxes.push({ x: box.x, y: box.y, width: box.width, height: box.height });
          el("image", Object.assign({ href: o.t.art }, box), teethG);
          el("image", Object.assign({ href: o.t.white }, box), maskIn);
          el("image", Object.assign({ href: o.t.black }, box), maskOut);
        });
      }
      el("filter", { id: "rd-soft", filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs)
        .appendChild(el("feGaussianBlur", { stdDeviation: Math.max(1.6, 2.6 * k * sHub) }));

      // ---- layers, back to front
      el("clipPath", { id: "rd-band" }, defs).appendChild(el("rect", { x: 0, y: padTop, width: W, height: H - padTop - padBottom }));
      const ringG = el("g", { class: "rd-rings", "clip-path": "url(#rd-band)", "aria-hidden": "true" }, svg);
      const stems = el("g", { class: "rd-stems", mask: "url(#rd-out)", "aria-hidden": "true" }, svg);
      svg.appendChild(teethG);
      const inside = el("g", { class: "rd-inside", mask: "url(#rd-in)", "aria-hidden": "true" }, svg);
      const soft = el("g", { filter: "url(#rd-soft)" }, inside);
      el("circle", { class: "rd-hub", cx: C[0], cy: C[1], r: Math.max(3, 4.2 * k), "stroke-width": Math.max(1, 1.3 * k) }, svg);
      const lines = el("g", { class: "rd-lines" }, svg);
      const names = el("g", { class: "rd-names" }, svg);
      const read = el("g", { class: "rd-read", "aria-hidden": "true" }, svg);
      const ring = el("circle", { class: "rd-ring", r: 0 }, svg);
      const ringBox = el("rect", { class: "rd-ring", width: 0, height: 0, rx: 3 }, svg);
      // the year rings, on the cone: faint and dotted (kept between the running head and the Replay button)
      RINGS.forEach(Y => {
        const w = rYear(Y), pts = [];
        for (let a = 0; a <= 360; a += 4) pts.push(P(a, w).map(v => v.toFixed(1)).join(","));
        el("polyline", { class: "rd-yring", points: pts.join(" ") }, ringG);
      });

      // ---- readout: years and amount on a short leader, on whichever side touches no name and stays on canvas
      const rLine = el("line", {}, read), rYr = el("text", { class: "rd-yr" }, read), rCount = el("text", { class: "rd-ct" }, read);
      const nameEls = [];
      function showRead(m, q, r) {
        const u = [q[0] - C[0], q[1] - C[1]], l = Math.hypot(u[0], u[1]) || 1, ux = -u[1] / l, uy = u[0] / l, pref = uy >= 0 ? 1 : -1;
        rYr.textContent = range(m.d[0], m.d[1]); rCount.textContent = amount(m.c, m.d);
        const nameBoxes = nameEls.map(n => n.getBBox()), clear = bx => bx.x >= 4 && bx.x + bx.width <= W - 4 && bx.y >= 4 && bx.y + bx.height <= H - 4 &&
          nameBoxes.every(n => bx.x > n.x + n.width + 3 || n.x > bx.x + bx.width + 3 || bx.y > n.y + n.height + 2 || n.y > bx.y + bx.height + 2);
        const place = (side, anchor, len) => {
          const lx = q[0] + ux * side * (r + len), ly = q[1] + uy * side * (r + len), tx = lx + (anchor === "end" ? -8 : 8);
          rLine.setAttribute("x1", q[0] + ux * side * (r + 3)); rLine.setAttribute("y1", q[1] + uy * side * (r + 3)); rLine.setAttribute("x2", lx); rLine.setAttribute("y2", ly);
          [[rYr, 1], [rCount, 19]].forEach(([t, dy]) => { t.setAttribute("x", tx); t.setAttribute("y", ly + dy); t.setAttribute("text-anchor", anchor); });
          const y1 = rYr.getBBox(), y2 = rCount.getBBox(), x0 = Math.min(y1.x, y2.x), x1 = Math.max(y1.x + y1.width, y2.x + y2.width);
          return { x: x0, y: y1.y, width: x1 - x0, height: y2.y + y2.height - y1.y };
        };
        read.classList.add("on");
        const tries = [];
        [26, 50, 80, 116].forEach(len => [pref, -pref].forEach(side => { const away = ux * side >= 0 ? "start" : "end"; [away, away === "start" ? "end" : "start"].forEach(an => tries.push([side, an, len])); }));
        for (const t of tries) if (clear(place(...t))) return;
        place(...tries[0]);
      }
      const hideRead = () => read.classList.remove("on");
      function showRing(node) {
        if (!node.matches(":focus-visible")) return;
        if (node.tagName === "text") { const b = node.getBBox(); Object.entries({ x: b.x - 6, y: b.y - 4, width: b.width + 12, height: b.height + 8 }).forEach(([kk, v]) => ringBox.setAttribute(kk, v)); ringBox.classList.add("on"); }
        else { ring.setAttribute("cx", node.getAttribute("cx")); ring.setAttribute("cy", node.getAttribute("cy")); ring.setAttribute("r", +node.getAttribute("r") + 2.5); ring.classList.add("on"); }
      }
      const hideRing = () => { ring.classList.remove("on"); ringBox.classList.remove("on"); };

      // ---- the five lines
      const groups = [], drawn = [], dots = [];
      function lit(g, on) {
        svg.classList.toggle("rd-dim", on);
        groups.forEach((n, i) => { n.classList.toggle("lit", on && n === g); nameEls[i].classList.toggle("lit", on && n === g); });
      }
      const allMarks = LINES.flatMap(Ln => Ln.marks.map(m => ({ m, q: P(Ln.c.angle + turn, m.w) })));
      LINES.forEach((Ln, ci) => {
        const c = Ln.c, A = c.angle + turn, g = el("g", { "data-cat": c.key }, lines), p1 = P(A, R0), e = P(A, Ln.wEnd);
        groups.push(g);
        // the line: a hairline from the centre to the oldest year, crisp outside the teeth and soft inside them; a
        // hit strip under it for "hover the line"; darker over the years the records cover
        const o = { Ln, A,
          stem: el("polygon", { class: "rd-stem", points: band(A, 0, Ln.wEnd, 0.42) }, stems),
          soft: el("line", { class: "rd-stem-soft", x1: C[0], y1: C[1], x2: p1[0], y2: p1[1] }, soft),
          hitLine: el("line", { class: "rd-hitline", x1: p1[0], y1: p1[1], x2: e[0], y2: e[1] }, g),
          spans: Ln.spans.map(sp => ({ sp, el: el("polygon", { class: "rd-span", points: band(A, sp[0], sp[1], 1.1) }, g) })), marks: [] };
        // a circle at the year each record begins, no wider than the room between it and its neighbours on the line
        const qs = Ln.marks.map(m => P(A, m.w));
        Ln.marks.forEach((m, mi) => {
          const q = qs[mi], room = Math.min(...qs.filter((x, j) => j !== mi).map(x => Math.hypot(x[0] - q[0], x[1] - q[1])));
          const r = Math.min(circR(m.w, k), Math.max(1.8, 0.44 * room));
          const dot = el("circle", { class: "rd-dot" + (m.d[2] == null ? " nocount" : ""), cx: q[0], cy: q[1], r, "stroke-width": (1.6 * near(m.w) * Math.min(1.2, Math.max(0.75, k))).toFixed(2) }, g);
          const others = allMarks.filter(x => x.m !== m).map(x => Math.hypot(x.q[0] - q[0], x.q[1] - q[1]) / 2);
          const hit = el("circle", { class: "rd-hit", cx: q[0], cy: q[1], r: Math.max(1, Math.min(14, ...others)).toFixed(1), tabindex: 0, role: "button", "aria-label": c.name + ", " + range(m.d[0], m.d[1]) + ", " + amount(c, m.d) }, g);
          const on = () => { dot.classList.add("on"); showRead(m, q, r); };
          const off = () => { dot.classList.remove("on"); hideRead(); };
          hit.addEventListener("mouseenter", on); hit.addEventListener("mouseleave", off);
          hit.addEventListener("focus", () => { on(); lit(g, true); showRing(dot); });
          hit.addEventListener("blur", () => { off(); lit(g, false); hideRing(); });
          hit.addEventListener("keydown", press(on));
          const dd = { m, q, r, dot }; o.marks.push(dd); dots.push(dd);
        });
        drawn.push(o);
        // the name, beyond the oldest circle: to its side, or centred above or below it when the line is near vertical
        const it = L.names[ci], gp = nameGap + circR(Ln.wEnd, k), nl = nameLines[ci].length;
        const lx = e[0] + it.u[0] * gp, ly = e[1] + it.u[1] * gp;
        const y0 = it.upright ? (it.u[1] > 0 ? ly + nameSize * 0.78 : ly - (nl - 1) * lineH - nameSize * 0.22) : ly + nameSize / 3 - (nl - 1) * lineH / 2;
        const opens = typeof opts.onOpen === "function";
        const name = el("text", { class: "rd-name" + (opens ? " go" : ""), x: lx, y: y0, "text-anchor": it.upright ? "middle" : it.u[0] > 0 ? "start" : "end",
          style: "font-size:" + nameSize + "px", tabindex: opens ? 0 : null, role: opens ? "link" : null, "aria-label": opens ? c.name + ": open this section" : null }, names);
        if (nl === 1) name.textContent = c.name;
        else nameLines[ci].forEach((t, li) => { el("tspan", { x: lx, dy: li ? lineH : 0 }, name).textContent = t; });
        nameEls.push(name);
        if (opens) { const go = () => opts.onOpen(c.key); name.addEventListener("click", go); name.addEventListener("keydown", press(go)); }
        name.addEventListener("focus", () => { lit(g, true); showRing(name); });
        name.addEventListener("blur", () => { lit(g, false); hideRing(); });
        name.addEventListener("mouseenter", () => lit(g, true));
        name.addEventListener("mouseleave", () => lit(g, false));
        g.addEventListener("mouseenter", () => lit(g, true));
        g.addEventListener("mouseleave", () => lit(g, false));
      });

      // ---- a name that runs into a circle or another name moves outward along its line
      const box = n => n.getBBox(), meets = (p, q) => p.x < q.x + q.width + 6 && q.x < p.x + p.width + 6 && p.y < q.y + q.height + 2 && q.y < p.y + p.height + 2;
      const dotBox = d => ({ x: d.q[0] - d.r, y: d.q[1] - d.r, width: 2 * d.r, height: 2 * d.r });
      for (let pass = 0; pass < 12; pass++) {
        let moved = false;
        nameEls.forEach((n, i) => {
          const b = box(n), hitsDot = dots.some(d => meets(b, dotBox(d))), hitsName = nameEls.some((m, j) => j !== i && DATA[i].name.length >= DATA[j].name.length && meets(b, box(m)));
          if (!hitsDot && !hitsName) return;
          const u = L.names[i].u;
          n.setAttribute("x", +n.getAttribute("x") + u[0] * 8); n.setAttribute("y", +n.getAttribute("y") + u[1] * 8);
          n.querySelectorAll("tspan").forEach(t => t.setAttribute("x", n.getAttribute("x")));
          moved = true;
        });
        if (!moved) break;
      }
      // ---- the rings' year labels, in the widest gap between lines; a label that would touch another label, a name, a
      // circle or the teeth, or leave the band between the running head and the Replay button, is left out
      const placed = nameEls.map(n => n.getBBox()).concat(dots.map(dotBox), teethBoxes);
      RINGS.forEach(Y => {
        const q = P(RING_AT + turn, rYear(Y));
        const t = el("text", { class: "rd-ylab", x: q[0] + 4, y: q[1] - 4 }, ringG); t.textContent = Y < 0 ? -Y + " BCE" : Y + " CE";
        const b = t.getBBox();
        if (b.y < padTop + 2 || b.y + b.height > H - padBottom - 2 || b.x < pad || b.x + b.width > W - pad || placed.some(p => meets(b, p))) t.remove(); else placed.push(b);
      });

      // ---- one entrance: each line shoots out of the centre towards the viewer, one after another, dropping its
      // circles as it passes their years; then the names
      if (animate && !REDUCED) {
        names.style.opacity = 0;
        const t0 = performance.now(), DUR = 1300;
        drawn.forEach(o => o.marks.forEach(d => d.dot.setAttribute("r", 0)));
        const frame = now => {
          let done = true;
          drawn.forEach((o, i) => {
            const t = Math.max(0, Math.min(1, (now - t0 - i * 160) / DUR)), w = o.Ln.wEnd * ease(t);
            if (t < 1) done = false;
            o.stem.setAttribute("points", band(o.A, 0, Math.max(1, w), 0.42));
            o.spans.forEach(s => s.el.setAttribute("points", band(o.A, Math.min(s.sp[0], w), Math.min(s.sp[1], w), 1.1)));
            o.marks.forEach(d => d.dot.setAttribute("r", w >= d.m.w - 0.5 ? d.r : 0));
          });
          if (!done) raf = requestAnimationFrame(frame);
          else { names.style.transition = "opacity 600ms ease"; names.style.opacity = ""; }
        };
        raf = requestAnimationFrame(frame);
      }
    }

    build(!!opts.animate);
    return {
      resize() { build(false); },
      destroy() { cancelAnimationFrame(raf); if (svg) svg.remove(); svg = null; },
    };
  }

  window.ToothRadial = { mount, R0, RMAX, NOW };
})();
