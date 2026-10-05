/* The Tooth Untold: the radial timeline (window.ToothRadial).

   Five lines leave the centre of the page, one for each kind of record: caries, pathogens, wear and LEH, metals,
   artificial interventions. The centre point sits in the gap between a first molar (left, as on every other plate)
   and a canine (right). Along each line a hollow circle marks the year each record begins, and the line is darker
   over the years its records cover, so a gap in the record is a pale stretch.
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
  // R0: where the records leave the teeth (the latest year); RMAX: the oldest year. Square-root time scale.
  const R0 = 200, RMAX = 620;
  const DATA = window.RADIAL_DATA || [];
  const NOW = Math.max(...DATA.map(c => c.segs[c.segs.length - 1][1]));
  const MAX_AGE = NOW - Math.min(...DATA.map(c => c.segs[0][0]));
  const rAge = a => R0 + Math.sqrt(Math.max(0, a) / MAX_AGE) * (RMAX - R0);
  const rYear = y => rAge(NOW - y);
  const TOOTH_H = { canine: 230, molar: 300 }, GAP = 26, RS = RMAX * 1.1;
  // each record leaves the teeth in its own direction in space: azimuth from the data, elevation here
  const ELEV = { caries: 12, metals: -22, pathogens: 18, wear: -40, interventions: 22 };
  const COLS = { caries: "#C2611A", metals: "#A67C00", pathogens: "#B0362F", wear: "#16907A", interventions: "#2F55B0" };
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const yr = v => v < 0 ? Math.abs(v) + " BCE" : v + " CE";
  function range(a, b) { if (a === b) return yr(a); if (a < 0 && b < 0) return Math.abs(a) + " – " + Math.abs(b) + " BCE"; if (a >= 0 && b >= 0) return a + " – " + b + " CE"; return yr(a) + " – " + yr(b); }
  const amount = (c, d) => d[2] == null ? "count not in the data" : d[2].toLocaleString("en-GB") + " " + c.unit;
  const press = f => ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); f(); } };
  const ease = t => 1 - Math.pow(1 - t, 3), cl = (v, a, b) => Math.max(a, Math.min(b, v)), fx = v => v.toFixed(1);
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function mount(host, opts) {
    let svg = null, raf = 0, S = null, dragging = false, px = 0, py = 0, lastInput = -1e9, stars = null;
    const HOME = { yaw: -0.5, pitch: 0.3, dist: 1480 };
    const intro = !!opts.animate && !REDUCED;
    const cam = { yaw: HOME.yaw - (intro ? 1.1 : 0), pitch: intro ? 0.9 : HOME.pitch, dist: intro ? 2300 : HOME.dist, tYaw: HOME.yaw, tPitch: HOME.pitch, tDist: HOME.dist };
    const sky = document.createElement("canvas"); sky.className = "rd-sky"; host.prepend(sky);
    const hint = document.createElement("div"); hint.className = "rd-hint"; hint.textContent = "Drag to orbit · scroll to travel · double-click to reset"; host.appendChild(hint);
    const hud = document.createElement("div"); hud.className = "rd-hud"; host.appendChild(hud);
    // the two teeth as real 3D models at the centre, drawn in the journal's ink, turning with the camera
    let GLT = null;
    if (window.THREE && window.TOOTH_MESHES) try {
      const TH = THREE, tcv = document.createElement("canvas"); tcv.className = "rd-tgl"; host.insertBefore(tcv, sky.nextSibling);
      const rd = new TH.WebGLRenderer({ canvas: tcv, alpha: true, antialias: true }); rd.setPixelRatio(Math.min(2, devicePixelRatio || 1)); rd.setClearColor(0, 0);
      const sc = new TH.Scene(), tc = new TH.PerspectiveCamera(30, 1, 1, 20000);
      const dec = M => { const vb = atob(M.v), n = vb.length / 2, Pv = new Float32Array(n); for (let i = 0; i < n; i++) { let v = vb.charCodeAt(2 * i) | (vb.charCodeAt(2 * i + 1) << 8); if (v > 32767) v -= 65536; Pv[i] = v / 32767 * M.s; }
        const fb = atob(M.f), I = new Uint16Array(fb.length / 2); for (let i = 0; i < I.length; i++) I[i] = fb.charCodeAt(2 * i) | (fb.charCodeAt(2 * i + 1) << 8);
        const g = new TH.BufferGeometry(); g.setAttribute("position", new TH.BufferAttribute(Pv, 3)); g.setIndex(new TH.BufferAttribute(I, 1)); g.center(); g.computeBoundingBox(); return g; };
      const mat = new TH.ShaderMaterial({ transparent: true, depthWrite: true, side: TH.FrontSide,
        vertexShader: "varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vY = position.y; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float r = 1.0-abs(dot(normalize(vN),normalize(vV))); float rim = pow(r,1.8); float h = step(0.62, fract(vY*0.16 + vN.x*1.4)); vec3 ink = vec3(0.10,0.10,0.094); vec3 paper = vec3(0.95,0.94,0.91); float m = clamp(rim*1.1 + h*0.25*(0.35+rim), 0.0, 1.0); gl_FragColor = vec4(mix(paper, ink, m), 0.22 + 0.74*rim + h*0.16); }" });
      const mkT = (M, hgt, side, widen) => { const g = dec(M), b = g.boundingBox, k = hgt / (b.max.y - b.min.y); g.scale(k, k, k);
        if (widen !== 1) { const A = g.attributes.position.array; for (let i = 0; i < A.length; i += 3) { A[i] *= widen; A[i + 2] *= widen * 0.9; } }
        g.computeVertexNormals(); g.computeBoundingBox(); const m = new TH.Mesh(g, mat), w = g.boundingBox.max.x - g.boundingBox.min.x; m.userData.x = side * (16 + w / 2); m.position.x = m.userData.x; sc.add(m); return m; };
      GLT = { rd, sc, tc, tcv, molar: mkT(TOOTH_MESHES.UL4, 300, 0, 1.45) };
    } catch (e) { GLT = null; }

    function build(animate) {
      if (svg) svg.remove();
      const W = Math.max(280, host.clientWidth), H = Math.max(320, host.clientHeight), val = v => typeof v === "function" ? v() : v;
      let pt = Math.max(24, val(opts.padTop) || 0), pb = Math.max(24, val(opts.padBottom) || 0); if (H - pt - pb < H * 0.4) pt = pb = 24;
      const C = [W / 2, pt + (H - pt - pb) * 0.5], F = Math.min(W * 1.1, (H - pt - pb - 60) * 1.95);
      svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, class: "rd rd3", role: "group",
        "aria-label": "Three-dimensional radial timeline: " + DATA.map(c => c.name.toLowerCase()).join(", ") + " leave the teeth in different directions; distance is how long ago, dot size is how much was gathered. Drag to orbit, scroll to move." }, host);
      const defs = el("defs", {}, svg);
      [["rd-b1", 1.4], ["rd-b2", 3.2], ["rd-b3", 6]].forEach(([id, sd]) => el("feGaussianBlur", { stdDeviation: sd }, el("filter", { id, x: "-100%", y: "-100%", width: "300%", height: "300%" }, defs)));
      const gl = el("filter", { id: "rd-glow", x: "-100%", y: "-100%", width: "300%", height: "300%" }, defs); el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 3, result: "b" }, gl); const mg = el("feMerge", {}, gl); el("feMergeNode", { in: "b" }, mg); el("feMergeNode", { in: "SourceGraphic" }, mg);
      const hg = el("radialGradient", { id: "rd-halo" }, defs); el("stop", { offset: 0, "stop-color": "#8a6d47", "stop-opacity": .12 }, hg); el("stop", { offset: 1, "stop-color": "#2348D8", "stop-opacity": 0 }, hg);
      const mk = el("marker", { id: "rd-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, markerUnits: "userSpaceOnUse", orient: "auto" }, defs); el("path", { d: "M0 1 L9 5 L0 9 z", fill: "#8a8983" }, mk);
      const gHalo = el("circle", { fill: "url(#rd-halo)" }, svg);
      const gSphere = el("g", { class: "rd-sphere", "aria-hidden": "true" }, svg);
      const sph = [];
      [-60, -30, 30, 60].forEach(lat => sph.push({ kind: "lat", v: lat * Math.PI / 180, el: el("polyline", { class: "rd-wire" }, gSphere) }));
      for (let m = 0; m < 180; m += 20) sph.push({ kind: "lon", v: m * Math.PI / 180, el: el("polyline", { class: "rd-wire" }, gSphere) });
      const equator = el("polyline", { class: "rd-equator" }, gSphere), axis = el("line", { class: "rd-axis" }, gSphere), poleA = el("circle", { class: "rd-pole" }, gSphere), poleB = el("circle", { class: "rd-pole" }, gSphere);
      const AGES = [300, 1000, 2000, 4000, 6000].filter(a => a <= MAX_AGE * 1.02);
      const shells = AGES.map((a, i) => ({ w: rAge(a), a, el: el("polyline", { class: "rd-shell", style: "animation-delay:" + (-i * 1.1) + "s" }, gSphere), lab: el("text", { class: "rd-slab" }, gSphere) }));
      shells.forEach(r => r.lab.textContent = r.a.toLocaleString("en-GB") + " years ago");
      const wave = el("polyline", { class: "rd-wave" }, gSphere), waveLab = el("text", { class: "rd-wlab" }, gSphere);
      const gAmb = el("g", { "aria-hidden": "true" }, svg), gLines = el("g", {}, svg), gArrows = el("g", { "aria-hidden": "true" }, svg), gBack = el("g", {}, svg), gTeeth = el("g", { class: "rd-teeth", "aria-hidden": "true" }, svg), gHub = el("g", { "aria-hidden": "true" }, svg), gFront = el("g", {}, svg), gCards = el("g", {}, svg), gRead = el("g", { class: "rd-read", "aria-hidden": "true" }, svg);
      const hubDot = el("circle", { class: "rd-hubdot" }, gHub), hubR1 = el("circle", { class: "rd-hubr r1" }, gHub), hubR2 = el("circle", { class: "rd-hubr r2" }, gHub), hubR3 = el("circle", { class: "rd-hubr r3" }, gHub);
      const opens = typeof opts.onOpen === "function";
      const lines = DATA.map((c, ci) => {
        const A = c.angle * Math.PI / 180, E = (ELEV[c.key] != null ? ELEV[c.key] : (ci * 23 % 60) - 30) * Math.PI / 180, col = COLS[c.key] || "#5CCBFF";
        const d = [Math.cos(E) * Math.cos(A), Math.sin(E), Math.cos(E) * Math.sin(A)], n1 = norm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), n2 = cross(d, n1);
        const marks = c.dens.map(dd => ({ d: dd, w: rYear(dd[0]) })), wEnd = Math.max(...marks.map(m => m.w)), mx = Math.max(1, ...c.dens.map(dd => dd[2] || 0));
        const g = el("g", { "data-cat": c.key, style: "--c:" + col }, gLines), base = el("line", { class: "rd-ray", "marker-end": "url(#rd-arrow)" }, g);
        const spans = c.segs.map(sg => ({ a: rYear(sg[1]), b: rYear(sg[0]), el: el("line", { class: "rd-beam" }, g) }));
        const pulse = el("circle", { class: "rd-pulse" }, g);
        const ms = marks.map((m, mi) => {
          const mgp = el("g", { class: "rd-mark", style: "--c:" + col }), halo = el("circle", { class: "rd-bokeh" }, mgp), dot = el("circle", { class: "rd-core" + (m.d[2] == null ? " nocount" : "") }, mgp),
            hit = el("circle", { class: "rd-hit", tabindex: 0, role: "button", "aria-label": c.name + ", " + range(m.d[0], m.d[1]) + ", " + amount(c, m.d) }, mgp);
          const arrow = el("line", { class: "rd-arw", "data-cat": c.key, style: "--c:" + col }, gArrows); const o = { c, m, ci, arrow, mg: mgp, halo, dot, hit, col, ph: mi * 1.9 + ci, sz: m.d[2] == null ? 0.35 : 0.3 + 0.7 * Math.sqrt(m.d[2] / mx), blur: -1 };
          const on = () => { mgp.classList.add("on"); S.read = o; lit(ci, true); }, off = () => { mgp.classList.remove("on"); if (S.read === o) S.read = null; lit(ci, false); };
          hit.addEventListener("mouseenter", on); hit.addEventListener("mouseleave", off); hit.addEventListener("focus", on); hit.addEventListener("blur", off);
          const fly = () => { const yaw = Math.atan2(d[0], d[2]), k = Math.round((cam.yaw - yaw) / (2 * Math.PI)); cam.tYaw = yaw + (k - 1) * 2 * Math.PI; cam.tPitch = cl(Math.asin(d[1]) + 0.15, -1.2, 1.35); cam.tDist = cl(o.m.w + 620, 780, 3000); lastInput = performance.now() + 5000; S.pin = o; on(); };
          hit.addEventListener("click", fly); hit.addEventListener("keydown", press(fly));
          return o;
        });
        const card = el("g", { class: "rd-card" + (opens ? " go" : ""), style: "--c:" + col, tabindex: opens ? 0 : null, role: opens ? "link" : null, "aria-label": opens ? c.name + ": open this section" : null }, gCards);
        const sub = range(c.segs[0][0], c.segs[c.segs.length - 1][1]), cw = Math.max(c.name.length * 10.2, sub.length * 6.9) + 6;
        const lead = el("line", { class: "rd-lead" }, gCards), rect = el("rect", { width: cw, height: 46, class: "rd-cbox" }, card);   // no box drawn: an invisible hit area for the name
        const t1 = el("text", { class: "rd-cname", x: 0, y: 19 }, card), t2 = el("text", { class: "rd-csub", x: 0, y: 36 }, card); t1.textContent = c.name.toUpperCase(); t2.textContent = sub;
        if (opens) { const go = () => opts.onOpen(c.key); card.addEventListener("click", go); card.addEventListener("keydown", press(go)); }
        card.addEventListener("mouseenter", () => lit(ci, true)); card.addEventListener("mouseleave", () => lit(ci, false));
        g.addEventListener("mouseenter", () => lit(ci, true)); g.addEventListener("mouseleave", () => lit(ci, false));
        return { c, ci, g, base, spans, pulse, ms, wEnd, d, n1, n2, col, card, lead, cw };
      });
      function lit(ci, on) { svg.classList.toggle("rd-dim", on); lines.forEach(L => { const y = on && L.ci === ci; [L.g, L.card].forEach(e => e.classList.toggle("lit", y)); L.ms.forEach(o => { o.mg.classList.toggle("lit", y); o.arrow.classList.toggle("lit", y); }); }); }
      let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const amb = Array.from({ length: 0 }, (_, i) => { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = R0 * 1.25 + rnd() * (RS * 0.95 - R0 * 1.25), q = Math.sqrt(1 - u * u);
        const o = { p: [r * q * Math.cos(a), r * u * 0.8, r * q * Math.sin(a)], s: 0.5 + rnd(), ph: rnd() * 6.28, blur: -1, c: el("circle", { class: "rd-amb" }, gAmb) };
        if (i % 8 === 3) { o.t = el("text", { class: "rd-albl" }, gAmb); o.t.textContent = String(i).padStart(2, "0") + " · " + "NSEWBFD"[i % 7]; } return o; });
      const T = opts.teeth, teeth = [];
      if (!GLT && T && T.canine && T.molar) [["molar", 0]].forEach(([key, side]) => teeth.push({ key, side, t: T[key], el: el("image", { href: T[key].art, preserveAspectRatio: "none" }, gTeeth) }));
      const rLine = el("line", {}, gRead), rBg = el("rect", { class: "rd-rbg", rx: 3 }, gRead), rYr = el("text", { class: "rd-yr" }, gRead), rCt = el("text", { class: "rd-ct" }, gRead);
      const dpr = Math.min(2, window.devicePixelRatio || 1); sky.width = W * dpr; sky.height = H * dpr;
      if (!stars) stars = Array.from({ length: 260 }, () => { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 1800 + Math.random() * 2200, s = Math.sqrt(1 - u * u); return [r * s * Math.cos(a), r * u, r * s * Math.sin(a), Math.random()]; });
      S = { W, H, C, F, pt, dpr, amb, wave, waveLab, sph, equator, axis, poleA, poleB, shells, lines, teeth, gHalo, hubDot, hubR1, hubR2, hubR3, gBack, gFront, gRead, rLine, rBg, rYr, rCt, read: null, born: performance.now(), anim: animate, last: 0 };
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const s = S; if (!s) return;
      const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0); s.last = now; const t = (now - s.born) / 1000;
      if (!REDUCED && !dragging && now - lastInput > 4000 && (!s.anim || t > 3)) cam.tYaw += dt * 0.02;
      const kc = Math.min(1, dt * (dragging ? 9 : s.anim && t < 3.2 ? 1.3 : 3.5));
      cam.yaw += (cam.tYaw - cam.yaw) * kc; cam.pitch += (cam.tPitch - cam.pitch) * kc; cam.dist += (cam.tDist - cam.dist) * kc;
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), D = cam.dist;
      const pos = [D * cp * sy, D * sp, D * cp * cy], fw = [-pos[0] / D, -pos[1] / D, -pos[2] / D], rt = [cy, 0, -sy], up = cross(rt, fw);
      const { C, F } = s, U = F / D;
      const pj = (x, y, z) => { const d0 = x - pos[0], d1 = y - pos[1], d2 = z - pos[2], zc = d0 * fw[0] + d1 * fw[1] + d2 * fw[2], q = F / Math.max(30, zc);
        return [C[0] + (d0 * rt[0] + d1 * rt[1] + d2 * rt[2]) * q, C[1] - (d0 * up[0] + d1 * up[1] + d2 * up[2]) * q, q, zc]; };
      const seg = (e, p, q) => { if (p[3] < 60 || q[3] < 60) { e.setAttribute("visibility", "hidden"); return false; } e.removeAttribute("visibility"); e.setAttribute("x1", fx(p[0])); e.setAttribute("y1", fx(p[1])); e.setAttribute("x2", fx(q[0])); e.setAttribute("y2", fx(q[1])); return true; };
      const poly = (e, fn, n) => { const pts = []; for (let i = 0; i <= n; i++) { const p = fn(i / n * Math.PI * 2); if (p[3] > 60) pts.push(fx(p[0]) + "," + fx(p[1])); } e.setAttribute("points", pts.join(" ")); };
      const appear = s.anim ? cl(t / 1.4, 0, 1) : 1;
      if (GLT) { const { rd, tc } = GLT; if (GLT.w !== s.W || GLT.h !== s.H) { rd.setSize(s.W, s.H, false); GLT.w = s.W; GLT.h = s.H; }
        tc.fov = 2 * Math.atan(s.H / 2 / F) * 180 / Math.PI; tc.aspect = s.W / s.H; tc.setViewOffset(s.W, s.H, s.W / 2 - C[0], s.H / 2 - C[1], s.W, s.H); tc.updateProjectionMatrix();
        tc.position.set(pos[0], pos[1], pos[2]); tc.up.set(up[0], up[1], up[2]); tc.lookAt(0, 0, 0);
        const sw = REDUCED ? 0 : Math.sin(t * 0.45) * 0.35; GLT.molar.rotation.y = 0.5 + sw + t * 0.12;
        GLT.molar.position.y = REDUCED ? 0 : Math.sin(t * 0.7) * 6;
        GLT.tcv.style.opacity = appear; rd.render(GLT.sc, tc); }
      // sky
      const ctx = sky.getContext("2d"); ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); ctx.clearRect(0, 0, s.W, s.H);
      if (false) stars.forEach(st => { const p = pj(st[0], st[1], st[2]); if (p[3] < 60) return; const tw = 0.35 + 0.35 * Math.sin(t * (0.6 + st[3]) + st[3] * 9); ctx.fillStyle = "rgba(190,210,255," + (tw * appear).toFixed(2) + ")"; ctx.fillRect(p[0], p[1], 1 + st[3] * 1.2, 1 + st[3] * 1.2); });
      // wire sphere, equator, axis, time shells
      s.sph.forEach(o => poly(o.el, o.kind === "lat" ? a => pj(RS * Math.cos(o.v) * Math.cos(a), RS * Math.sin(o.v), RS * Math.cos(o.v) * Math.sin(a)) : a => pj(RS * Math.cos(a) * Math.cos(o.v), RS * Math.sin(a), RS * Math.cos(a) * Math.sin(o.v)), 64));
      poly(s.equator, a => pj(RS * Math.cos(a), 0, RS * Math.sin(a)), 96);
      const pa = pj(0, RS * 1.08, 0), pb2 = pj(0, -RS * 1.08, 0); seg(s.axis, pa, pb2);
      [[s.poleA, pa], [s.poleB, pb2]].forEach(([e, p]) => { e.setAttribute("cx", fx(p[0])); e.setAttribute("cy", fx(p[1])); e.setAttribute("r", fx(cl(7 * p[2] / U, 3, 10))); });
      const LA = s.lines.map(L => L.c.angle * Math.PI / 180), dA = (x, y) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y))), Ab = Math.atan2(cy, sy);
      let A0 = Ab + 0.5; for (let n = 0; n < 40; n++) { const c = Ab + 0.5 + (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 0.16; if (LA.every(x => dA(c, x) > 0.42)) { A0 = c; break; } }
      let lastP = null;
      s.shells.forEach(r => { poly(r.el, a => pj(r.w * Math.cos(a), 0, r.w * Math.sin(a)), 96); r.el.style.opacity = appear;
        const p = pj(r.w * Math.cos(A0), 0, r.w * Math.sin(A0)); r.lab.setAttribute("x", fx(p[0] + 6)); r.lab.setAttribute("y", fx(p[1] - 6)); const ok = p[3] > 60 && (lastP == null || Math.abs(p[0] - lastP[0]) > 90 || Math.abs(p[1] - lastP[1]) > 15); if (ok) lastP = p; r.lab.style.opacity = ok ? appear * 0.85 : 0; });
      // hub
      const hb = pj(0, 0, 0), hubZ = hb[3], hr = cl(46 * hb[2] / U, 26, 80);
      s.gHalo.setAttribute("cx", fx(hb[0])); s.gHalo.setAttribute("cy", fx(hb[1])); s.gHalo.setAttribute("r", fx(hr * 5.5));
      s.hubDot.setAttribute("cx", fx(hb[0])); s.hubDot.setAttribute("cy", fx(hb[1])); s.hubDot.setAttribute("r", fx(cl(6 * hb[2] / U, 4, 9)));
      [[s.hubR1, 1.9], [s.hubR2, 2.5], [s.hubR3, 3.3]].forEach(([e, m]) => { e.setAttribute("cx", fx(hb[0])); e.setAttribute("cy", fx(hb[1])); e.setAttribute("r", fx(hr * m)); });
      const tc = pj(0, 0, 0), sc = tc[2];
      s.teeth.forEach(o => { const h = TOOTH_H[o.key] * sc, w = h * o.t.w / o.t.h, x = o.side === 0 ? tc[0] - w / 2 : o.side < 0 ? tc[0] - GAP / 2 * sc - w : tc[0] + GAP / 2 * sc;
        o.el.setAttribute("x", fx(x)); o.el.setAttribute("y", fx(tc[1] - h / 2)); o.el.setAttribute("width", fx(w)); o.el.setAttribute("height", fx(h)); o.el.style.opacity = appear; });
      // the reading wave: a ring that sweeps out from today to the oldest record; marks swell as it passes their year
      { const u = REDUCED ? 0 : (t * 0.075) % 1, w = R0 + u * (RMAX - R0); s.wW = REDUCED ? 0 : w; poly(s.wave, a => pj(w * Math.cos(a), 0, w * Math.sin(a)), 96); s.wave.style.opacity = (appear * Math.sin(Math.PI * u) * 0.9).toFixed(2);
        const q = pj(w * Math.cos(Ab), 0, w * Math.sin(Ab)), age = Math.pow((w - R0) / (RMAX - R0), 2) * MAX_AGE, y0 = Math.round(NOW - age);
        s.waveLab.setAttribute("x", fx(q[0])); s.waveLab.setAttribute("y", fx(q[1] + 18)); s.waveLab.setAttribute("text-anchor", "middle"); s.waveLab.textContent = yr(y0 < 0 ? Math.round(y0 / 10) * 10 : y0); s.waveLab.style.opacity = s.wave.style.opacity; }
      // ambient field: grey bodies drifting in the volume, focus-blurred by depth
      const ay = REDUCED ? 0 : t * 0.025;
      s.amb.forEach(o => { const ca = Math.cos(ay), sa = Math.sin(ay), x = o.p[0] * ca - o.p[2] * sa, z = o.p[0] * sa + o.p[2] * ca, y = o.p[1] + (REDUCED ? 0 : Math.sin(t * 0.4 + o.ph) * 10);
        const p = pj(x, y, z); if (p[3] < 60) { o.c.setAttribute("visibility", "hidden"); if (o.t) o.t.setAttribute("visibility", "hidden"); return; }
        o.c.removeAttribute("visibility"); const r = cl(7 * o.s * p[2] / U, 1.4, 16); o.c.setAttribute("cx", fx(p[0])); o.c.setAttribute("cy", fx(p[1])); o.c.setAttribute("r", fx(r));
        const dz = Math.abs(p[3] - D * 0.92), bl = dz < 160 ? 0 : dz < 340 ? 1 : dz < 560 ? 2 : 3; if (bl !== o.blur) { o.blur = bl; if (bl) o.c.setAttribute("filter", "url(#rd-b" + bl + ")"); else o.c.removeAttribute("filter"); }
        o.c.style.opacity = (appear * cl(1.2 - (p[3] - D) / (RMAX * 1.8), 0.25, 0.9)).toFixed(2);
        if (o.t) { o.t.removeAttribute("visibility"); o.t.setAttribute("x", fx(p[0] + r + 6)); o.t.setAttribute("y", fx(p[1] + 3)); o.t.style.opacity = (appear * 0.8).toFixed(2); } });
      // records
      const all = [];
      s.lines.forEach(L => {
        const g = s.anim ? ease(cl((t - 0.7 - L.ci * 0.18) / 1.6, 0, 1)) : 1, wNow = R0 + (L.wEnd - R0) * g, at = w => pj(L.d[0] * w, L.d[1] * w, L.d[2] * w);
        const p0 = at(R0 * 0.6), pe = at(wNow); seg(L.base, p0, pe); L._s = p0[3] > 60 && pe[3] > 60 ? [p0, pe] : null;
        L.spans.forEach(spn => { const a = Math.min(spn.a, wNow), b = Math.min(spn.b, wNow); if (b - a < 0.5) { spn.el.setAttribute("visibility", "hidden"); return; }
          const p = at(a), q = at(b); if (seg(spn.el, p, q)) spn.el.setAttribute("stroke-width", fx(cl(3.6 * (p[2] + q[2]) / 2 / U, 2, 6.5))); });
        const u = REDUCED ? 0.5 : (t * 0.09 + L.ci * 0.23) % 1, tp = at(R0 + u * (wNow - R0));
        L.pulse.setAttribute("cx", fx(tp[0])); L.pulse.setAttribute("cy", fx(tp[1])); L.pulse.setAttribute("r", fx(cl(4 * tp[2] / U, 2, 7))); L.pulse.style.opacity = (Math.sin(Math.PI * u) * g * 0.85).toFixed(2);
        L.ms.forEach(o => { o.arrow.setAttribute("visibility", "hidden"); if (o.m.w > wNow + 0.5) { o.mg.setAttribute("visibility", "hidden"); return; }
          const pop = s.anim ? ease(cl((wNow - o.m.w) / 60, 0, 1)) : 1, ph = o.ph, hrx = 0;
          const x = L.d[0] * o.m.w + (L.n1[0] * Math.cos(ph) + L.n2[0] * Math.sin(ph)) * hrx, y = L.d[1] * o.m.w + (L.n1[1] * Math.cos(ph) + L.n2[1] * Math.sin(ph)) * hrx, z = L.d[2] * o.m.w + (L.n1[2] * Math.cos(ph) + L.n2[2] * Math.sin(ph)) * hrx;
          const p = pj(x, y, z); if (p[3] < 60) { o.mg.setAttribute("visibility", "hidden"); return; } o.mg.removeAttribute("visibility");
          const bo = s.wW ? Math.exp(-Math.pow((o.m.w - s.wW) / 16, 2)) : 0, r = cl((1.8 + 3.4 * o.sz) * p[2] / U, 1.5, 6.5) * pop * (1 + 0.5 * bo); o.top = p; o.r = r; o.z = p[3];
          [o.halo, o.dot, o.hit].forEach((e, j) => { e.setAttribute("cx", fx(p[0])); e.setAttribute("cy", fx(p[1])); e.setAttribute("r", fx(j === 0 ? r * 2.6 : j === 2 ? r + 6 : r)); });
          const bl = 0;
          if (bl !== o.blur) { o.blur = bl; if (bl) o.mg.setAttribute("filter", "url(#rd-b" + bl + ")"); else o.mg.removeAttribute("filter"); }
          o.mg.style.setProperty("--fog", cl(1.25 - (p[3] - D) / (RMAX * 1.8), 0.35, 1).toFixed(2)); all.push(o);
          { const k0 = R0 * 0.36 / (Math.hypot(x, y, z) || 1), ps = pj(x * k0, y * k0, z * k0); if (ps[3] > 60) { const vx = p[0] - ps[0], vy = p[1] - ps[1], len = Math.hypot(vx, vy), L2 = len - r - 6;
            if (L2 > 10) { const ux = vx / len, uy = vy / len, ph2 = (t * 0.16 + o.ph * 0.173) % 1, gg = REDUCED ? pop : ease(Math.min(1, ph2 / 0.4)) * pop;
              o.arrow.removeAttribute("visibility"); o.arrow.setAttribute("x1", fx(ps[0])); o.arrow.setAttribute("y1", fx(ps[1])); o.arrow.setAttribute("x2", fx(ps[0] + ux * L2 * gg)); o.arrow.setAttribute("y2", fx(ps[1] + uy * L2 * gg));
              o.arrow.style.opacity = (REDUCED ? 0.3 : ph2 < 0.8 ? 0.34 : 0.34 * (1 - (ph2 - 0.8) / 0.2)).toFixed(2); } } }
        });
        // card at the far end of each record
        const ne = at(L.wEnd * 1.04), ux0 = ne[0] - hb[0], uy0 = ne[1] - hb[1], dl = Math.hypot(ux0, uy0) || 1, ux = ux0 / dl, uy = uy0 / dl;
        L._b = { L, x: ne[0] + ux * 30 - (ux < 0 ? L.cw : 0), y: ne[1] + uy * 30 - 23, w: L.cw, ux, uy, ne, vis: ne[3] > 60,
          op: (s.anim ? cl((t - 2 - L.ci * 0.18) / 0.6, 0, 1) : 1) * cl(1.3 - (ne[3] - D) / (RMAX * 2), 0.45, 1) };
      });
      // cards: keep inside the safe area (clear of the running head and the HUD) and push overlapping ones apart
      const cards = s.lines.map(L => L._b).filter(b => b.vis), yMin = s.pt + 6, yMax = s.H - 60;
      // the teeth at the centre: a circle around the hub, roughly the height of the molar on screen
      const tTop = pj(0, 170, 0), tR = Math.max(60, Math.hypot(tTop[0] - hb[0], tTop[1] - hb[1]) * 1.15);
      const onTooth = b => { const nx = cl(hb[0], b.x - 6, b.x + b.w + 6), ny = cl(hb[1], b.y - 6, b.y + 52); return Math.hypot(nx - hb[0], ny - hb[1]) < tR; };
      // re-anchor each name beside its own line's far end, on the outside, before resolving collisions
      cards.forEach(b => { b.x = b.ne[0] + b.ux * 18 - (b.ux < 0 ? b.w : 0); b.y = b.ne[1] + b.uy * 18 - 23; });
      for (let it = 0; it < 24; it++) {
        cards.forEach(b => { b.x = cl(b.x, 16, s.W - b.w - 16); b.y = cl(b.y, yMin, yMax - 46); });
        cards.sort((a, b) => a.y - b.y);
        for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) { const a = cards[i], c = cards[j];
          if (a.x < c.x + c.w + 10 && c.x < a.x + a.w + 10 && a.y < c.y + 54 && c.y < a.y + 54) { const push = (a.y + 54 - c.y) / 2 + 0.5; a.y -= push; c.y += push; } }
        // keep cards off the other records' lines and marks
        cards.forEach(b => { const hits = s.lines.some(L2 => { if (L2 === b.L || !L2._s) return false; const [a1, a2] = L2._s; for (let k = 0; k <= 16; k++) { const qx = a1[0] + (a2[0] - a1[0]) * k / 16, qy = a1[1] + (a2[1] - a1[1]) * k / 16; if (qx > b.x - 6 && qx < b.x + b.w + 6 && qy > b.y - 6 && qy < b.y + 52) return true; } return false; })
          || all.some(o => o.c !== b.L.c && o.top && o.top[0] > b.x - 8 && o.top[0] < b.x + b.w + 8 && o.top[1] > b.y - 8 && o.top[1] < b.y + 54);
          if (hits || onTooth(b)) { b.x += b.ux * 14; b.y += b.uy * 14; }
          // its own line: a name pushed back against the page edge can land on it; step sideways, off the line
          const own = b.L._s; if (own) { const [a1, a2] = own; let on = false;
            for (let k = 0; k <= 20; k++) { const qx = a1[0] + (a2[0] - a1[0]) * k / 20, qy = a1[1] + (a2[1] - a1[1]) * k / 20; if (qx > b.x - 6 && qx < b.x + b.w + 6 && qy > b.y - 4 && qy < b.y + 44) { on = true; break; } }
            if (on) { let nx = -b.uy, ny = b.ux; if (ny * (b.uy >= 0 ? 1 : -1) < 0) { nx = -nx; ny = -ny; } b.x += nx * 14; b.y += ny * 14; } }
          // the camera readout and the hint at the bottom of the page
          if (b.y + 46 > s.H - 84 && b.x < 230) b.x += 14;
        });
      }
      s.lines.forEach(L => { const b = L._b;
        if (!b.vis) { L.card.style.opacity = 0; L.lead.setAttribute("visibility", "hidden"); return; }
        L.card.setAttribute("transform", "translate(" + fx(b.x) + "," + fx(b.y) + ")"); L.card.style.opacity = b.op.toFixed(2);
        seg(L.lead, b.ne, [b.ux < 0 ? b.x + b.w : b.x, b.y + 23, 1, b.ne[3]]); L.lead.style.opacity = L.card.style.opacity; });
      { // shell labels: pick the ray, in screen space, that keeps them clear of every record line and mark; hide any that still collide
        const segs = s.lines.map(L => L._s).filter(Boolean), dts = all.map(o => o.top), cards2 = cards;
        const dseg = (q, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, u = cl(((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / l2, 0, 1); return Math.hypot(q[0] - a[0] - u * vx, q[1] - a[1] - u * vy); };
        const bad = q => { const c = [q[0] + 46, q[1] - 9]; return segs.some(sg => dseg(c, sg[0], sg[1]) < 24 || dseg([q[0] + 6, c[1]], sg[0], sg[1]) < 12 || dseg([q[0] + 86, c[1]], sg[0], sg[1]) < 12) || dts.some(d => Math.abs(d[0] - c[0]) < 56 && Math.abs(d[1] - c[1]) < 20) || cards2.some(b => c[0] + 52 > b.x && c[0] - 52 < b.x + b.w && c[1] + 12 > b.y && c[1] - 12 < b.y + 46); };
        let bestA = A0, bestN = 1e9;
        for (let n = 0; n < 36; n++) { const A = Ab + 0.5 + n / 36 * Math.PI * 2; let c = 0; s.shells.forEach(r => { const q = pj(r.w * Math.cos(A), 0, r.w * Math.sin(A)); if (q[3] > 60 && bad(q)) c++; }); if (c < bestN) { bestN = c; bestA = A; if (!c) break; } }
        let lp = null;
        s.shells.forEach(r => { const q = pj(r.w * Math.cos(bestA), 0, r.w * Math.sin(bestA)); r.lab.setAttribute("x", fx(q[0] + 6)); r.lab.setAttribute("y", fx(q[1] - 6));
          const ok = q[3] > 60 && !bad(q) && (lp == null || Math.abs(q[0] - lp[0]) > 90 || Math.abs(q[1] - lp[1]) > 15); if (ok) lp = q; r.lab.style.opacity = ok ? (appear * 0.85).toFixed(2) : 0; });
      }
      all.sort((a, b) => b.z - a.z).forEach(o => (o.z > hubZ ? s.gBack : s.gFront).appendChild(o.mg));
      const o = s.read || s.pin;
      if (o && o.top) { const left = o.top[0] + 200 > s.W, x = left ? o.top[0] - o.r - 14 : o.top[0] + o.r + 14, y = o.top[1] - o.r - 10;
        s.rLine.setAttribute("x1", fx(o.top[0] + (left ? -o.r : o.r))); s.rLine.setAttribute("y1", fx(o.top[1])); s.rLine.setAttribute("x2", fx(x)); s.rLine.setAttribute("y2", fx(y));
        s.rYr.textContent = range(o.m.d[0], o.m.d[1]); s.rCt.textContent = amount(o.c, o.m.d);
        [[s.rYr, 0], [s.rCt, 17]].forEach(([e, d]) => { e.setAttribute("x", fx(x + (left ? -4 : 4))); e.setAttribute("y", fx(y + d)); e.setAttribute("text-anchor", left ? "end" : "start"); });
        { const b1 = s.rYr.getBBox(), b2 = s.rCt.getBBox(), x0 = Math.min(b1.x, b2.x) - 9, y0 = b1.y - 6, x1 = Math.max(b1.x + b1.width, b2.x + b2.width) + 9, y1 = b2.y + b2.height + 6; s.rBg.setAttribute("x", fx(x0)); s.rBg.setAttribute("y", fx(y0)); s.rBg.setAttribute("width", fx(x1 - x0)); s.rBg.setAttribute("height", fx(y1 - y0)); }
        s.gRead.classList.add("on"); } else s.gRead.classList.remove("on");
      hud.textContent = "AZ " + (((cam.yaw * 180 / Math.PI) % 360 + 360) % 360).toFixed(1).padStart(5, "0") + "°   EL " + (cam.pitch * 180 / Math.PI).toFixed(1) + "°   R " + Math.round(D) + (o ? "   T−" + (NOW - o.m.d[0]).toLocaleString("en-GB") + " YRS" : "");
      hint.style.opacity = lastInput > 0 && now - lastInput < 6000 ? 0 : (s.anim ? cl(t - 3.2, 0, 1) : 1) * 0.85;
    }

    host.addEventListener("pointerdown", e => { if (e.target.closest && e.target.closest(".rd-card,.rd-hit")) return; if (S) S.pin = null; dragging = true; px = e.clientX; py = e.clientY; try { host.setPointerCapture(e.pointerId); } catch (_) {} host.classList.add("grab"); lastInput = performance.now(); });
    host.addEventListener("pointermove", e => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; cam.tYaw -= dx * 0.006; cam.tPitch = cl(cam.tPitch + dy * 0.005, -1.2, 1.35); lastInput = performance.now(); });
    const endDrag = () => { dragging = false; host.classList.remove("grab"); };
    host.addEventListener("pointerup", endDrag); host.addEventListener("pointercancel", endDrag);
    host.addEventListener("wheel", e => { e.preventDefault(); cam.tDist = cl(cam.tDist * Math.exp(e.deltaY * 0.0011), 760, 3000); lastInput = performance.now(); }, { passive: false });
    host.addEventListener("dblclick", () => { cam.tYaw = HOME.yaw + Math.round((cam.yaw - HOME.yaw) / (Math.PI * 2)) * Math.PI * 2; cam.tPitch = HOME.pitch; cam.tDist = HOME.dist; lastInput = performance.now(); });

    build(!!opts.animate);
    raf = requestAnimationFrame(frame);
    return {
      resize() { const b = S ? S.born : 0, a = S && S.anim; build(a); if (S) S.born = b; },
      destroy() { cancelAnimationFrame(raf); if (svg) svg.remove(); svg = null; S = null; hint.remove(); hud.remove(); sky.remove(); },
    };
  }

  window.ToothRadial = { mount, R0, RMAX, NOW };
})();
