/* The Tooth Untold: the radial timeline (window.ToothRadial).

   Four records leave one shared point in the gap between a canine and a first molar: caries, pathogens,
   wear and LEH, metals. A line's length is the time its record covers, on one shared scale; a stretch with
   no record is a gap in the line. The timeline is read off circles: one at the start of every record,
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
  // real start date, so distance along a line means "years into that record". On a small screen the whole
  // figure is scaled by one factor (fit) so the names stay on canvas.
  const R0 = 150, RMAX = 585;
  const DATA = window.RADIAL_DATA || [];
  const MAX_SPAN = Math.max(...DATA.map(c => c.segs[c.segs.length - 1][1] - c.segs[0][0]));
  const rAt = t => R0 + (t / MAX_SPAN) * (RMAX - R0);

  // Tall, narrow containers turn the whole set of lines (the teeth stay upright) to whichever angle lets the
  // figure be largest, so the long lines run along the long side and the names stay on canvas.
  // On small screens, names of more than one word that are longer than WRAP_AT characters break onto two lines.
  const PORTRAIT = 1.05, TURN_STEP = 6, WRAP_AT = 10;
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
      const CX = W / 2, CY = (padTop + H - padBottom) / 2, HALF = (H - padTop - padBottom) / 2;
      const narrow = W < 640, nameSize = narrow ? 14 : 18, lineH = nameSize * 1.12;
      svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, class: "rd", role: "group",
        "aria-label": "Radial timeline of the tooth record: " + DATA.length + " lines leave a point between a canine and a first molar, one each for " + DATA.map(c => c.name.toLowerCase()).join(", ") + ". A line's length is the time its record covers, on one shared scale; circles mark the records within it and gaps are years with no record. Hover or focus a circle for its years and how much was gathered; activate a name to open its section, or an end circle to show how much was gathered per year." }, host);
      const defs = el("defs", {}, svg);

      // ---- names: one or two lines, and how much room each needs
      const probe = el("text", { class: "rd-name", style: "font-size:" + nameSize + "px" }, svg);
      const width = t => { probe.textContent = t; return probe.getComputedTextLength(); };
      const nameLines = DATA.map(c => {
        const w = c.name.split(" ");
        if (!narrow || w.length < 2 || c.name.length <= WRAP_AT) return [c.name];
        let best = null;   // the break that makes the wider line narrowest
        for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(" "), b = w.slice(k).join(" "), m = Math.max(width(a), width(b)); if (!best || m < best[0]) best = [m, a, b]; }
        return [best[1], best[2]];
      });
      const nameW = nameLines.map(L => Math.max(...L.map(width)));
      probe.remove();

      // ---- fit: one scale factor so every line plus its name stays on canvas, for a given turn of the whole set
      const pad = narrow ? 10 : 24, dotGap = 14;
      const fitFor = turn => {
        let f = 1.15;
        DATA.forEach((c, i) => {
          const a = (c.angle + turn) * Math.PI / 180, end = rAt(c.segs[c.segs.length - 1][1] - c.segs[0][0]);
          const cx = Math.abs(Math.cos(a)), cy = Math.abs(Math.sin(a)), tall = nameLines[i].length * lineH;
          if (cx > 0.01) f = Math.min(f, cx < 0.26 ? (W / 2 - pad - nameW[i] / 2) / (cx * end) : (W / 2 - pad - dotGap - nameW[i]) / (cx * end));
          if (cy > 0.01) f = Math.min(f, (HALF - tall - 4) / (cy * end));
        });
        return f;
      };
      let turn = 0;
      if (H / W > PORTRAIT) for (let t = 0; t < 360; t += TURN_STEP) if (fitFor(t) > fitFor(turn) + 0.005) turn = t;
      const ang = c => c.angle + turn;
      const fit = Math.max(0.28, fitFor(turn));
      const R = t => fit * rAt(t), r0 = fit * R0;
      const pt = (ang, r) => { const a = ang * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };

      // ---- teeth, side by side and not touching, both inside R0
      const teethG = el("g", { class: "rd-teeth", "aria-hidden": "true" });
      const maskIn = el("mask", { id: "rd-in", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      const maskOut = el("mask", { id: "rd-out", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      el("rect", { width: W, height: H, fill: "#fff" }, maskOut);
      const T = opts.teeth;
      if (T && T.canine && T.molar) {
        const size = k => { const t = T[k], h = TOOTH_H[k] * fit; return { t, h, w: h * t.w / t.h }; };
        let c = size("canine"), m = size("molar");
        // shrink both together if a corner would reach past R0
        const far = (x, y, w, h) => Math.max(...[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => Math.hypot(px, py)));
        const g = GAP * fit;
        let s = 1;
        for (let k = 0; k < 6; k++) {
          const ext = Math.max(far(-g / 2 - c.w * s, -c.h * s / 2, c.w * s, c.h * s), far(g / 2, -m.h * s / 2, m.w * s, m.h * s));
          if (ext <= r0 - 10 * fit) break; s *= (r0 - 10 * fit) / ext;
        }
        [["canine", c, CX - g / 2 - c.w * s], ["molar", m, CX + g / 2]].forEach(([k, o, x]) => {
          const box = { x, y: CY - o.h * s / 2, width: o.w * s, height: o.h * s, preserveAspectRatio: "none" };
          el("image", Object.assign({ href: o.t.art }, box), teethG);
          el("image", Object.assign({ href: o.t.white }, box), maskIn);
          el("image", Object.assign({ href: o.t.black }, box), maskOut);
        });
      }
      el("filter", { id: "rd-soft", filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs)
        .appendChild(el("feGaussianBlur", { stdDeviation: 3.5 * Math.max(0.6, fit) }));

      // ---- layers, back to front. Nothing sits above the circles' hit areas but the names and the readout.
      const ghosts = el("g", { class: "rd-ghosts", mask: "url(#rd-out)", "aria-hidden": "true" }, svg);
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
          const ang = rnd() * 360, len = rnd();
          if (busy.some(b => dAng(ang, b) < GHOST_CLEAR) || out.some(o => dAng(ang, o) < GHOST_APART)) continue;
          out.push(ang);
          const r = r0 + Math.pow(len, 1.7) * (fit * RMAX - r0) * 0.75, a = pt(ang, 0), b = pt(ang, r);
          el("line", { class: "rd-ghost", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, ghosts);
          el("line", { class: "rd-ghost-soft", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, soft);
        }
      })();

      // ---- readout: years and amount on a thin leader line
      const rLine = el("line", {}, read), rYear = el("text", { class: "rd-yr" }, read), rCount = el("text", { class: "rd-ct" }, read);
      // the readout sits on a short leader to one side of the line; it tries both sides and both alignments
      // and takes the first place where it touches no name and stays on canvas
      function showRead(c, d, t0) {
        const q = pt(ang(c), (R(d[0] - t0) + R(Math.min(d[1], c.segs[c.segs.length - 1][1]) - t0)) / 2);
        const a = ang(c) * Math.PI / 180, ux = -Math.sin(a), uy = Math.cos(a), pref = uy >= 0 ? 1 : -1;
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
        if (node.tagName === "text") { const b = node.getBBox(); Object.entries({ x: b.x - 6, y: b.y - 4, width: b.width + 12, height: b.height + 8 }).forEach(([k, v]) => ringBox.setAttribute(k, v)); ringBox.classList.add("on"); }
        else { ring.setAttribute("cx", node.getAttribute("cx")); ring.setAttribute("cy", node.getAttribute("cy")); ring.setAttribute("r", 11); ring.classList.add("on"); }
      }
      const hideRing = () => { ring.classList.remove("on"); ringBox.classList.remove("on"); };

      // ---- the four lines
      const groups = [], nameEls = [], stemEls = [];
      function lit(g, on) {
        svg.classList.toggle("rd-dim", on);
        groups.forEach((n, i) => { n.classList.toggle("lit", on && n === g); nameEls[i].classList.toggle("lit", on && n === g); });
      }
      DATA.forEach((c, ci) => {
        const A = ang(c);
        const t0 = c.segs[0][0], tEnd = c.segs[c.segs.length - 1][1], endR = R(tEnd - t0);
        const g = el("g", { "data-cat": c.key, class: open.has(c.key) ? "open" : null }, lines);
        groups.push(g);
        // from the shared point to R0: crisp outside the teeth, soft inside them
        const p0 = pt(A, 0), p1 = pt(A, r0);
        stemEls.push(el("line", { class: "rd-stem", x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, stems));
        el("line", { class: "rd-stem-soft", x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, soft);
        // a hit strip for "hover the line", underneath every circle so it never takes their events
        const a = pt(A, r0), b = pt(A, endR);
        el("line", { class: "rd-hit", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, g);
        // covered stretches; a break is a break
        c.segs.forEach(sg => { const p = pt(A, R(sg[0] - t0)), q = pt(A, R(sg[1] - t0)); el("line", { class: "rd-span", x1: p[0], y1: p[1], x2: q[0], y2: q[1] }, g); });
        // how much was gathered per year: one soft circle on the middle of each record, scaled within this line
        let vmax = 0;
        c.dens.forEach(d => { if (d[2] != null) vmax = Math.max(vmax, d[2] / years(d)); });
        c.dens.forEach(d => {
          if (d[2] == null || !vmax) return;
          const q = pt(A, (R(d[0] - t0) + R(d[1] - t0)) / 2);
          el("circle", { class: "rd-vol", cx: q[0], cy: q[1], r: (3 + Math.sqrt(d[2] / years(d) / vmax) * 17) * Math.max(0.7, fit) }, g);
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
        marks.forEach(m => {
          if (pointEnd && m.d === lastD && !m.brk) return;   // drawn by the end dot below
          const d = m.d, q = pt(A, R(m.at - t0)), base = m.edge ? 3.8 : 3.1;
          const from = pt(A, R(d[0] - t0)), to = pt(A, R(d[1] - t0));
          const liftLine = el("line", { class: "rd-lift", x1: from[0], y1: from[1], x2: to[0], y2: to[1] }, g);
          const dot = el("circle", { class: "rd-mark" + (m.edge ? " edge" : ""), cx: q[0], cy: q[1], r: base }, g);
          const hit = el("circle", { class: "rd-markhit", cx: q[0], cy: q[1], r: 12, tabindex: 0, role: "button",
            "aria-label": c.name + (m.brk ? ", record breaks after " : ", ") + range(d[0], d[1]) + ", " + amount(c, d) }, g);
          const on = () => { liftLine.classList.add("on"); dot.setAttribute("r", base + 1.4); showRead(c, d, t0); };
          const off = () => { liftLine.classList.remove("on"); dot.setAttribute("r", base); hideRead(); };
          hit.addEventListener("mouseenter", on); hit.addEventListener("mouseleave", off);
          hit.addEventListener("focus", () => { on(); lit(g, true); showRing(hit); });
          hit.addEventListener("blur", () => { off(); lit(g, false); hideRing(); });
          hit.addEventListener("keydown", press(on));
        });
        // the far end: a larger circle, then the name
        const e = pt(A, endR);
        const end = el("circle", { class: "rd-end", cx: e[0], cy: e[1], r: 6, tabindex: 0, role: "button",
          "aria-pressed": open.has(c.key) ? "true" : "false", "aria-label": (pointEnd ? c.name + ", " + range(lastD[0], lastD[1]) + ", " + amount(c, lastD) + ". " : c.name + ": ") + "show how much was gathered per year" }, g);
        if (pointEnd) {
          end.addEventListener("mouseenter", () => { end.setAttribute("r", 7.4); showRead(c, lastD, t0); });
          end.addEventListener("mouseleave", () => { end.setAttribute("r", 6); hideRead(); });
          end.addEventListener("focus", () => showRead(c, lastD, t0));
          end.addEventListener("blur", hideRead);
        }
        // names sit beyond the end dot: to its side, or centred above or below it when the line is near vertical
        const cs = Math.cos(A * Math.PI / 180), sn = Math.sin(A * Math.PI / 180), upright = Math.abs(cs) < 0.26;
        const right = cs > 0, lp = upright ? pt(A, endR + dotGap + (sn > 0 ? nameSize * 0.7 : 0)) : pt(A, endR + dotGap + 2);
        const opens = typeof opts.onOpen === "function";
        // the block of lines sits centred on the end dot beside it, or grows away from the dot above or below it
        const nl = nameLines[ci].length, y0 = upright ? (sn > 0 ? lp[1] + nameSize / 3 : lp[1] + nameSize / 3 - (nl - 1) * lineH) : lp[1] + nameSize / 3 - (nl - 1) * lineH / 2;
        const name = el("text", { class: "rd-name" + (open.has(c.key) ? " open" : "") + (opens ? " go" : ""), x: lp[0], y: y0, "text-anchor": upright ? "middle" : right ? "start" : "end",
          style: "font-size:" + nameSize + "px", tabindex: 0, role: opens ? "link" : "button", "aria-pressed": opens ? null : open.has(c.key) ? "true" : "false",
          "aria-label": opens ? c.name + ": open this section" : c.name + ": show how much was gathered per year" }, names);
        if (nl === 1) name.textContent = c.name;
        else nameLines[ci].forEach((t, li) => { el("tspan", { x: lp[0], dy: li ? lineH : 0 }, name).textContent = t; });
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
          const k = DATA[i].name.length >= DATA[j].name.length ? i : j, n = nameEls[k], a = ang(DATA[k]) * Math.PI / 180;
          n.setAttribute("x", +n.getAttribute("x") + Math.cos(a) * 12); n.setAttribute("y", +n.getAttribute("y") + Math.sin(a) * 12);
          n.querySelectorAll("tspan").forEach(t => t.setAttribute("x", n.getAttribute("x")));
          moved = true;
        }));
        if (!moved) break;
      }

      // ---- one entrance: the lines draw outward from the point, the records fade in, then the names
      if (animate && !REDUCED) {
        const set = (n, css) => Object.assign(n.style, css);
        stemEls.forEach(s => set(s, { strokeDasharray: r0, strokeDashoffset: r0 }));
        [ghosts, inside, names].concat(groups).forEach(n => set(n, { opacity: 0 }));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const ease = "cubic-bezier(.6,0,.2,1)";
          set(inside, { transition: "opacity 700ms ease", opacity: "" });
          set(ghosts, { transition: "opacity 1200ms ease 300ms", opacity: "" });
          stemEls.forEach((s, i) => set(s, { transition: "stroke-dashoffset 700ms " + ease + " " + i * 70 + "ms", strokeDashoffset: 0 }));
          groups.forEach((n, i) => set(n, { transition: "opacity 900ms ease " + (440 + i * 90) + "ms", opacity: "" }));
          set(names, { transition: "opacity 700ms ease 1100ms", opacity: "" });
          timers.push(setTimeout(() => [ghosts, inside, names].concat(groups, stemEls).forEach(n => n.removeAttribute("style")), 2600));
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
