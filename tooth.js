/* The Statistical Tooth: 3D renderer.
   Each tooth is a signed-distance field ray-marched in a WebGL2 fragment shader. Canines come from the
   sculpted models (data/models.js, built by build_models.py) as 3D distance volumes; the first molar is
   still a constructed shape until a molar model is supplied. Data-driven changes are uniforms: wear plane,
   caries lesion, hypoplasia grooves, tartar collar, enamel lead. The surface is drawn as stipple fixed to
   the tooth, the cut face as flat anatomical fills with ink edges. A JS copy of the distance function
   places the overlay marks on the same surfaces the shader draws. */
(function () {
  "use strict";
  const MODELS = window.TOOTH_MODELS || {};
  const VOL = {};     // decoded volumes, by model key

  // ------------------------------------------------------------------ shapes
  // Units: 1 = 10 mm. The cement-enamel junction is at y = 0, crown up.
  function builtShape(type, jaw) {
    const up = jaw === "max";
    if (type === "molar") return {
      B: [0.5, 0.3, 0.44], R: 0.26, taper: 0.74, bodyY: 0.3, edge: 1, enamel: 0.12,
      cusps: [[-0.21, 0.55, 0.19, 0.21], [0.21, 0.55, 0.19, 0.2], [-0.21, 0.55, -0.19, 0.2], [0.21, 0.55, -0.19, 0.19]],
      tip: null, groove: [1, 1], grooveY: 0.68,
      roots: up
        ? [[-0.24, 0.1, 0.17, 0.2, -0.36, -1.08, 0.28, 0.055], [0.24, 0.1, 0.17, 0.19, 0.34, -1.02, 0.28, 0.05], [0, 0.1, -0.18, 0.22, 0.02, -1.18, -0.34, 0.06]]
        : [[-0.25, 0.08, 0, 0.23, -0.31, -1.16, 0, 0.06], [0.25, 0.08, 0, 0.22, 0.3, -1.1, 0, 0.055]],
      pulpC: [0, 0.2, 0], pulpR: [0.23, 0.11, 0.19], cariesAt: "occlusal",
    };
    if (type === "premolar") return {
      B: [0.36, 0.34, 0.42], R: 0.17, taper: 0.76, bodyY: 0.34, edge: 1, enamel: 0.1,
      cusps: [[0, 0.6, 0.17, 0.2], [0, 0.57, -0.17, 0.17]], tip: null, groove: [1, 0], grooveY: 0.72,
      roots: [[0, 0.1, 0, 0.26, 0, -1.38, 0, 0.06]], pulpC: [0, 0.22, 0], pulpR: [0.12, 0.15, 0.19], cariesAt: "occlusal",
    };
    return {
      B: [0.33, 0.38, 0.29], R: 0.16, taper: 0.7, bodyY: 0.38, edge: 1, enamel: 0.1,
      cusps: [], tip: [[0, 0.48, 0, 0.3], [0, 0.97, 0.03, 0.04]], groove: [0, 0], grooveY: 0,
      roots: [[0, 0.1, 0, 0.25, 0, -1.72, 0, 0.06]], pulpC: [0, 0.34, 0], pulpR: [0.09, 0.36, 0.09], cariesAt: "side",
    };
  }
  const modelKey = (type, jaw) => type === "canine" ? jaw + "_canine" : null;
  function shape(type, jaw) {
    const k = modelKey(type, jaw), M = k && MODELS[k];
    if (!M || !VOL[k]) return builtShape(type, jaw);
    return {
      mesh: true, key: k, vol: VOL[k], top: M.top, rootMin: M.rootMin, enamel: 0.1, cariesAt: "side",
      B: [M.crownHalf[0], M.top / 2, M.crownHalf[1]], pulpC: M.pulpC, pulpR: [0.07, 0.3, 0.07], canal: M.canal, apex: M.apex,
      roots: [[M.canal.length ? M.canal[M.canal.length - 1][0] / 0.6 : 0, 0.1, 0, 0.1, M.apex[0], M.apex[1], M.apex[2], 0.05]],
      cusps: [], tip: null, groove: [0, 0], grooveY: 0, R: 0.1, taper: 1, bodyY: 0.4, edge: 1,
      boxMin: [M.boxMin[0] - 0.1, M.boxMin[1] - 0.06, M.boxMin[2] - 0.1], boxMax: [M.boxMax[0] + 0.1, M.boxMax[1] + 0.06, M.boxMax[2] + 0.1],
    };
  }
  // The centre lines of the root canals and pulp chamber on the cut face (x, y pairs as segments), for the nerve
  // and vessels the realistic section draws inside the pulp. Models: their own canal line, thinned, run on up
  // into the chamber. Constructed teeth: one canal per root up to the chamber, then branches into the pulp horns.
  function canalSegs(S) {
    const seg = [];
    if (S.mesh && S.canal && S.canal.length > 1) {
      const c = S.canal.filter((_, i) => i % 2 === 0 || i === S.canal.length - 1);
      for (let i = 1; i < c.length; i++) seg.push([c[i - 1][0], c[i - 1][1], c[i][0], c[i][1]]);
      const l = c[c.length - 1], k = c[c.length - 2];
      const dx = l[0] - k[0], dy = l[1] - k[1], n = Math.hypot(dx, dy) || 1;
      seg.push([l[0], l[1], l[0] + dx / n * 0.14, l[1] + dy / n * 0.14]);
    } else {
      S.roots.forEach(r => {
        const a = [r[0] * 0.6, S.pulpC[1]], b = [r[0] + (r[4] - r[0]) * 0.93, r[1] + (r[5] - r[1]) * 0.93];
        const m = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.03, (a[1] + b[1]) / 2];
        const h = [a[0] * (S.roots.length > 1 ? 0.85 : 1), S.pulpC[1] + S.pulpR[1] * (S.tip ? 0.8 : 0.55)];
        seg.push([b[0], b[1], m[0], m[1]], [m[0], m[1], a[0], a[1]], [a[0], a[1], h[0], h[1]]);
      });
    }
    return seg.slice(0, 24);
  }
  function finishShape(S) {
    S.canalSegs = canalSegs(S);
    if (S.mesh) { S.crownH = S.top; return S; }
    S.top = S.tip ? S.tip[1][1] + S.tip[1][3] : S.cusps.length ? Math.max(...S.cusps.map(c => c[1] + c[3] * 0.72)) : 2 * S.bodyY;
    S.rootMin = Math.min(...S.roots.map(r => r[5] - r[7]));
    const xr = Math.max(S.B[0], ...S.roots.map(r => Math.abs(r[4]) + r[7]), ...S.roots.map(r => Math.abs(r[0]) + r[3]));
    const zr = Math.max(S.B[2], ...S.roots.map(r => Math.abs(r[6]) + r[7]), ...S.roots.map(r => Math.abs(r[2]) + r[3]));
    S.boxMin = [-xr - 0.14, S.rootMin - 0.08, -zr - 0.14];
    S.boxMax = [xr + 0.14, S.top + 0.08, zr + 0.14];
    S.crownH = S.top;
    return S;
  }
  // decode model volumes (gzip + base64) and point clouds
  async function loadModels() {
    if (typeof DecompressionStream === "undefined") return false;
    const jobs = Object.entries(MODELS).filter(([, M]) => M.vol).map(async ([k, M]) => {
      const bin = Uint8Array.from(atob(M.vol), c => c.charCodeAt(0));
      const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      VOL[k] = { data: new Uint8Array(buf), dims: M.dims, origin: M.origin, pitch: M.pitch, clamp: M.dclamp };
    });
    await Promise.all(jobs);
    return true;
  }
  function modelPoints(key) {
    const M = MODELS[key]; if (!M) return null;
    const bin = Uint8Array.from(atob(M.points), c => c.charCodeAt(0)), q = new Int16Array(bin.buffer), out = [];
    for (let i = 0; i < q.length; i += 7) out.push({ p: [q[i] / 2000, q[i + 1] / 2000, q[i + 2] / 2000], n: [q[i + 3] / 2000, q[i + 4] / 2000, q[i + 5] / 2000], e: q[i + 6] / 2000 });
    return out;
  }

  // ------------------------------------------------------------------ JS distance functions
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function sdRoundBox(p, b, r) {
    const q0 = Math.abs(p[0]) - b[0] + r, q1 = Math.abs(p[1]) - b[1] + r, q2 = Math.abs(p[2]) - b[2] + r;
    return Math.hypot(Math.max(q0, 0), Math.max(q1, 0), Math.max(q2, 0)) + Math.min(Math.max(q0, Math.max(q1, q2)), 0) - r;
  }
  function sdEll(p, r) {
    const k0 = Math.hypot(p[0] / r[0], p[1] / r[1], p[2] / r[2]);
    const k1 = Math.hypot(p[0] / (r[0] * r[0]), p[1] / (r[1] * r[1]), p[2] / (r[2] * r[2]));
    return k0 * (k0 - 1) / Math.max(k1, 1e-5);
  }
  function sdRC(p, a, b, r1, r2) {
    const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2];
    const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], y = pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2], z = y - l2;
    const xv = [pa[0] * l2 - ba[0] * y, pa[1] * l2 - ba[1] * y, pa[2] * l2 - ba[2] * y];
    const x2 = xv[0] * xv[0] + xv[1] * xv[1] + xv[2] * xv[2], y2 = y * y * l2, z2 = z * z * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  }
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  function volSample(V, p, ch) {
    const [nx, ny, nz] = V.dims;
    const fx = (p[0] - V.origin[0]) / V.pitch, fy = (p[1] - V.origin[1]) / V.pitch, fz = (p[2] - V.origin[2]) / V.pitch;
    if (fx < 0 || fy < 0 || fz < 0 || fx > nx - 1 || fy > ny - 1 || fz > nz - 1) {
      const cx = clamp(fx, 0, nx - 1), cy = clamp(fy, 0, ny - 1), cz = clamp(fz, 0, nz - 1);
      return Math.hypot(fx - cx, fy - cy, fz - cz) * V.pitch + V.clamp * 0.5;
    }
    const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz), x1 = Math.min(x0 + 1, nx - 1), y1 = Math.min(y0 + 1, ny - 1), z1 = Math.min(z0 + 1, nz - 1);
    const tx = fx - x0, ty = fy - y0, tz = fz - z0, d = V.data;
    const at = (x, y, z) => d[((z * ny + y) * nx + x) * 3 + ch];
    const c00 = mix(at(x0, y0, z0), at(x1, y0, z0), tx), c10 = mix(at(x0, y1, z0), at(x1, y1, z0), tx);
    const c01 = mix(at(x0, y0, z1), at(x1, y0, z1), tx), c11 = mix(at(x0, y1, z1), at(x1, y1, z1), tx);
    const v = mix(mix(c00, c10, ty), mix(c01, c11, ty), tz);
    return ch === 1 ? v / 255 : (v - 127.5) / 127.5 * V.clamp;
  }
  function bodyJS(p, S) {
    const t = clamp(p[1] / (2 * S.bodyY), 0, 1), s = mix(S.taper, 1, sstep(0, 0.55, t)), ez = mix(1, S.edge, sstep(0.3, 1, t));
    return sdRoundBox([p[0] / s, p[1] - S.bodyY, p[2] / (s * ez)], S.B, S.R) * s * ez;
  }
  // the worn surface's ripple, the same as wearN() in the shader; wearAt() is the surface height at (x, z)
  const wearN = (x, z) => 0.5 * Math.sin(x * 9.1 + 1.3) * Math.sin(z * 7.7 + 0.4) + 0.3 * Math.sin(x * 17.3 - z * 13.1 + 2) + 0.2 * Math.sin(x * 27 + z * 23 + 0.7);
  const pad4 = (a, fill) => [0, 1, 2, 3].map(i => a && a[i] != null ? a[i] : fill);   // stress lines: up to four grooves
  const wearAt = (P, x, z) => P.wearY + (P.wearAmp || 0) * wearN(x, z);
  function outerJS(p, S) {
    if (S.mesh) return volSample(S.vol, p, 0);
    let d = bodyJS(p, S);
    for (const c of S.cusps) d = smin(d, sdEll([p[0] - c[0], p[1] - c[1], p[2] - c[2]], [c[3], c[3] * 0.72, c[3]]), 0.1);
    if (S.tip) d = smin(d, sdRC(p, S.tip[0], S.tip[1], S.tip[0][3], S.tip[1][3]), 0.14);
    const g = [p[0], p[1] - S.grooveY, p[2]];
    if (S.groove[0]) d = smax(d, -sdEll(g, [0.3, 0.075, 0.028]), 0.035);
    if (S.groove[1]) d = smax(d, -sdEll(g, [0.028, 0.075, 0.28]), 0.035);
    for (const r of S.roots) d = smin(d, sdRC(p, [r[0], r[1], r[2]], [r[4], r[5], r[6]], r[3], r[7]), 0.16);
    return d;
  }

  // ------------------------------------------------------------------ shaders
  const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
  const FS = `#version 300 es
precision highp float;
precision highp sampler3D;
out vec4 o;
uniform vec2 uRes; uniform vec3 uRo, uFw, uRt, uUp; uniform float uFocal, uPx;
uniform vec3 uB; uniform float uR, uTaper, uBodyY, uEdge, uTop, uEnamel;
uniform vec4 uCusp[4]; uniform int uNC;
uniform vec4 uTipA, uTipB; uniform int uHasTip;
uniform vec2 uGroove; uniform float uGrooveY;
uniform vec4 uRootA[3]; uniform vec4 uRootB[3]; uniform int uNR;
uniform vec3 uPulpC, uPulpR;
uniform float uWearY, uCutX, uCalc, uPb, uWearAmp;
uniform vec4 uCapTint;
// the worn-away crown in layers: layer k is gone by Smith stage uCapS[k] and drawn in uCapC[k] (uCapN = 0: one colour)
uniform float uCapS[8]; uniform vec3 uCapC[8]; uniform int uCapN;
// carious decay carved into the chewing surface (the caries plate): three nested outlines (outer lesion, cavitated
// body, core), 64 radii each packed four to a vec4, about the crown's centre; uCavC = (centre x, centre z, x and z
// scale from tooth units to the outlines' units); uCavD = how deep each layer cuts in. uCavOn = 0: no carving.
uniform vec4 uCavC; uniform vec4 uCavR[48]; uniform vec3 uCavD; uniform float uCavOn;
uniform vec4 uLeh, uLehY;
uniform vec4 uCaries;
uniform vec3 uBoxMin, uBoxMax;
uniform float uJaw; uniform vec3 uJawMin, uJawMax;
uniform int uMesh; uniform sampler3D uVol; uniform vec3 uVolMin, uDims; uniform float uPitch, uVClamp;
uniform float uReal; uniform vec4 uSeg[24]; uniform int uNSeg;

const vec3 INK   = vec3(.1,.098,.094);
const vec3 ENAM  = vec3(.965,.957,.935);
const vec3 ROOTC = vec3(.918,.894,.843);
const vec3 DENT  = vec3(.918,.863,.757);
const vec3 DENTX = vec3(.878,.804,.667);
const vec3 PULP  = vec3(.8,.56,.51);
const vec3 CALC  = vec3(.851,.8,.667);
const vec3 CAV   = vec3(.227,.176,.141);
const vec3 METAL = vec3(.725,.51,.03);
const vec3 BONE  = vec3(.886,.871,.835);
const vec3 BONEH = vec3(.784,.765,.722);
const vec3 GUM   = vec3(.855,.745,.722);

float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-5); }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba=b-a; float l2=dot(ba,ba); float rr=r1-r2; float a2=l2-rr*rr; float il2=1./l2;
  vec3 pa=p-a; float y=dot(pa,ba); float z=y-l2; vec3 xv=pa*l2-ba*y; float x2=dot(xv,xv); float y2=y*y*l2; float z2=z*z*l2;
  float k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k) return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k) return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;
}
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float smax(float a,float b,float k){ return -smin(-a,-b,k); }
vec3 volTC(vec3 p){ return ((p-uVolMin)/uPitch+.5)/uDims; }
float volOut(vec3 p){ vec3 lo=uVolMin, hi=uVolMin+(uDims-1.)*uPitch; vec3 q=max(max(lo-p,p-hi),0.); return length(q); }

float body(vec3 p){
  float t=clamp(p.y/(2.*uBodyY),0.,1.);
  float s=mix(uTaper,1.,smoothstep(0.,.55,t));
  float ez=mix(1.,uEdge,smoothstep(.3,1.,t));
  vec3 q=p-vec3(0.,uBodyY,0.); q.x/=s; q.z/=s*ez;
  return sdRoundBox(q,uB,uR)*s*ez;
}
float outerU(vec3 p){
  if(uMesh==1){ float e=volOut(p); if(e>0.) return e+uVClamp*.5; return (texture(uVol,volTC(p)).r*2.-1.)*uVClamp; }
  float d=body(p);
  for(int i=0;i<4;i++){ if(i>=uNC) break; vec4 c=uCusp[i]; d=smin(d,sdEll(p-c.xyz,vec3(c.w,c.w*.72,c.w)),.1); }
  if(uHasTip==1) d=smin(d,sdRC(p,uTipA.xyz,uTipB.xyz,uTipA.w,uTipB.w),.14);
  vec3 g=p-vec3(0.,uGrooveY,0.);
  if(uGroove.x>0.) d=smax(d,-sdEll(g,vec3(.3,.075,.028)),.035);
  if(uGroove.y>0.) d=smax(d,-sdEll(g,vec3(.028,.075,.28)),.035);
  for(int i=0;i<3;i++){ if(i>=uNR) break; d=smin(d,sdRC(p,uRootA[i].xyz,uRootB[i].xyz,uRootA[i].w,uRootB[i].w),.16); }
  return d;
}
// the worn chewing surface: the wear plane, roughened where wear has gone deepest (uWearAmp; 0 = flat). The same
// ripple is wearN() in JavaScript (ToothGL.wearAt), which also shapes the peaks in the Wear and LEH section's grid.
float wearN(vec2 q){ return .5*sin(q.x*9.1+1.3)*sin(q.y*7.7+.4)+.3*sin(q.x*17.3-q.y*13.1+2.)+.2*sin(q.x*27.+q.y*23.+.7); }
float wearH(vec3 p){ return uWearY+uWearAmp*wearN(p.xz); }
// the colour of the worn-away crown at height y: its depth below the crown top as a Smith stage (the inverse of the
// wear plane's placing in app.js), then the layer that stage falls in
vec3 capCol(float y){
  if(uCapN==0) return uCapTint.rgb;
  float s=1.+(uTop-y)/(.55*uTop)*7.;
  if(s<=uCapS[0]) return uCapC[0];
  for(int k=0;k<7;k++){ if(s<=uCapS[k+1]) return mix(uCapC[k],uCapC[k+1],clamp((s-uCapS[k])/max(uCapS[k+1]-uCapS[k],1e-4),0.,1.)); }
  return uCapC[7];
}
// stress lines (LEH), drawn after Schultz's standard and exaggerated so they read: up to four grooves round the crown,
// each wavy (lehWave), deep, and with a low ridge just below it. uLeh = each groove's strength 0..1, uLehY = its height.
float lehWave(vec3 p){ float a=atan(p.z,p.x); return .014*sin(a*3.+1.)+.007*sin(a*7.+2.3)+.004*sin(a*13.+p.y*20.); }
float bandF(float y,float yb){ float u=(y-yb)/.022; return exp(-u*u); }
float ridgeF(float y,float yb){ float u=(y-yb)/.022+1.7; return exp(-u*u); }
float crownMask(float y){ return smoothstep(.03,.12,y)*(1.-smoothstep(uTop-.14,uTop-.03,y)); }
float lehAt(float y,float s,float yb){ return s*(bandF(y,yb)-.55*ridgeF(y,yb)); }
float lehD(vec3 p){ float y=p.y+lehWave(p); return crownMask(p.y)*(lehAt(y,uLeh.x,uLehY.x)+lehAt(y,uLeh.y,uLehY.y)+lehAt(y,uLeh.z,uLehY.z)+lehAt(y,uLeh.w,uLehY.w)); }
float cavR(int layer,float a){ float f=a*64.; int i=int(floor(f))%64; int j=(i+1)%64; int bi=layer*64+i, bj=layer*64+j;
  return mix(uCavR[bi/4][bi%4],uCavR[bj/4][bj%4],fract(f)); }
// how far the surface is carved in at p: each layer's depth, faded across its outline and towards the crown's sides
float cavDepth(vec3 p){
  if(uCavOn<=0.) return 0.;
  vec2 q=vec2((p.x-uCavC.x)/uCavC.z,-(p.z-uCavC.y)/uCavC.w);
  float rho=length(q), a=fract(atan(q.y,q.x)/6.2831853+1.), w=.12;
  float m=uCavD.x*smoothstep(-w,w,cavR(0,a)-rho)+uCavD.y*smoothstep(-w,w,cavR(1,a)-rho)+uCavD.z*smoothstep(-w,w,cavR(2,a)-rho);
  return m*smoothstep(uTop*.5,uTop*.8,p.y);
}
float lehInk(vec3 p){ float y=p.y+lehWave(p); return max(max(uLeh.x*bandF(y,uLehY.x),uLeh.y*bandF(y,uLehY.y)),max(uLeh.z*bandF(y,uLehY.z),uLeh.w*bandF(y,uLehY.w))); }
float crownW(vec3 p){ if(uMesh==1 && volOut(p)<=0.) return smoothstep(.35,.65,texture(uVol,volTC(p)).g)*smoothstep(-.03,.02,p.y); return smoothstep(-.005,.2,p.y); }
float enamT(vec3 p){ return uEnamel*crownW(p)*(.75+.35*smoothstep(.45,.95,p.y/uTop)); }
float pulpD(vec3 p){
  if(uMesh==1){ if(volOut(p)>0.) return 1.; return (texture(uVol,volTC(p)).b*2.-1.)*uVClamp; }
  float d=sdEll(p-uPulpC,uPulpR);
  for(int i=0;i<4;i++){ if(i>=uNC) break; vec4 c=uCusp[i]; vec3 h=vec3(c.x*.62,uPulpC.y+uPulpR.y*.75,c.z*.62); d=smin(d,sdEll(p-h,vec3(.05,.1,.05)),.06); }
  for(int i=0;i<3;i++){ if(i>=uNR) break; vec3 a=uRootA[i].xyz; vec3 b=mix(a,uRootB[i].xyz,.93); d=smin(d,sdRC(p,vec3(a.x*.6,uPulpC.y,a.z*.6),b,uRootA[i].w*.24,.012),.05); }
  return d;
}
float carD(vec3 p){ vec3 q=p-uCaries.xyz; float n=.22*sin(q.x*31.+1.)*sin(q.y*27.+2.)*sin(q.z*35.); return length(q)-uCaries.w*(1.+n); }
float calcD(vec3 p,float dU){
  if(uCalc<=0.) return 1e3;
  float ang=atan(p.z,p.x);
  float lump=.5+.5*sin(ang*5.+1.3)*sin(ang*3.-.4+p.y*20.);
  float th=uCalc*(.014+.036*lump);
  return smax(dU-th,abs(p.y-.1)-.05,.03);
}
// alveolar bone: a rounded, slightly irregular mass around the root, flat at the crest
float blockD(vec3 p){
  vec3 c=(uJawMin+uJawMax)*.5, h=(uJawMax-uJawMin)*.5;
  float e=sdEll(p-vec3(c.x,c.y+h.y*.35,c.z),vec3(h.x*1.08,h.y*1.35,h.z*1.12));
  e+=.018*sin(p.x*7.3+p.z*5.1)*sin(p.y*5.7+1.3)+.008*sin(p.x*19.+p.y*13.);
  return smax(e,p.y-uJawMax.y-.012*sin(p.x*6.+1.),.05);
}
float boneD(vec3 p,float dU){ if(uJaw<=0.) return 1e3; return smax(blockD(p),-(dU-.016),.01); }
float gumD(vec3 p,float dU){
  if(uJaw<=0.) return 1e3;
  float top=uJawMax.y;
  float band=smax(dU-.07,abs(p.y-(top+.065))-.075,.045);
  float skin=smax(blockD(p)-.028,(top-.05)-p.y,.03);
  return smax(smin(band,skin,.06),-(dU-.004),.008);
}
float mapAll(vec3 p,out float dU,out float dC,out float dT,out float dB,out float dG){
  dU=outerU(p)+.03*lehD(p)+cavDepth(p);
  float d=smax(dU,p.y-wearH(p),.008);
  if(uCaries.w>0.) d=smax(d,-carD(p),.012);
  dC=calcD(p,dU); dT=min(d,dC);
  dB=boneD(p,dU); dG=gumD(p,dU);
  return min(dT,min(dB,dG));
}
float mapT(vec3 p,out float dU,out float dC){ float dT,dB,dG; return mapAll(p,dU,dC,dT,dB,dG); }
float map(vec3 p){ float a,b; return max(mapT(p,a,b),p.z-uCutX); }
vec3 normal(vec3 p){ const vec2 k=vec2(1,-1); float h=uReal>0.?.011:.0022;   // wider on the smooth-shaded plates, so the model's voxels do not show
  return normalize(k.xyy*map(p+k.xyy*h)+k.yyx*map(p+k.yyx*h)+k.yxy*map(p+k.yxy*h)+k.xxx*map(p+k.xxx*h)); }
float calcAO(vec3 p,vec3 n){ float oc=0.,s=1.; for(int i=1;i<=4;i++){ float h=.02*float(i*i); oc+=(h-map(p+n*h))*s; s*=.6; } return clamp(1.-2.*oc,0.,1.); }
float hash3(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
// stipple fixed to the object: one jittered dot per cell, radius from darkness
float stipple(vec3 p,float dark,float k,float pw){
  vec3 q=p*k, c=floor(q), f=q-c;
  vec3 j=vec3(hash3(c),hash3(c+17.3),hash3(c+41.1))*.6+.2;
  float r=sqrt(clamp(dark,0.,1.))*.52, d=length(f-j), aa=clamp(pw*k*.9,.02,.5);
  return 1.-smoothstep(r-aa,r+aa,d);
}
float edgeLine(float d,float pw,float w){ return 1.-smoothstep(pw*w*.5,pw*w*1.4,abs(d)); }
// ---- for the realistic section (uReal): smooth value noise, and the canal centre line
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ return .55*vnoise(p)+.3*vnoise(p*2.03+7.1)+.15*vnoise(p*4.1+3.3); }
// signed distance from the canal centre line (sign = which side), and how far along it
vec2 canalD(vec2 q){
  float best=1e3, along=0.;
  for(int i=0;i<24;i++){ if(i>=uNSeg) break; vec4 s=uSeg[i]; vec2 a=s.xy, ba=s.zw-s.xy;
    float h=clamp(dot(q-a,ba)/max(dot(ba,ba),1e-6),0.,1.); vec2 v=q-a-ba*h; float d=length(v);
    if(d<abs(best)){ best=d*sign(ba.x*v.y-ba.y*v.x+1e-9); along=float(i)+h; } }
  return vec2(best,along);
}
// a ground section of tooth, coloured as in an anatomy atlas
vec3 realCut(vec3 p,float dU,float dC,float pxw,bool worn){
  float dp=pulpD(p), et=enamT(p), dD=dU+et, cr=uCaries.w>0.?carD(p):1., inn=-dU;
  bool enamel=dD>0. && crownW(p)>.5;
  vec3 col;
  if(enamel){
    // enamel: translucent blue-white, greyer towards the dentine; faint growth lines parallel to the surface,
    // and rods running in from the surface
    float u=clamp(inn/max(et,1e-3),0.,1.);
    col=mix(vec3(.955,.958,.95),vec3(.85,.865,.86),u*.75);
    col*=1.-.04*smoothstep(.55,1.,.5+.5*sin(inn*380.+fbm(p*40.)*3.));
    col*=1.-.035*smoothstep(.5,.85,vnoise(vec3(p.x*620.,p.y*620.,inn*30.)));
    float bl=max(uLeh.x*bandF(p.y,uLehY.x),uLeh.y*bandF(p.y,uLehY.y)); col*=1.-.42*clamp(bl*1.6,0.,1.);
    if(uPb>0.){ float s=stipple(p,uPb*.22,190.,pxw); col=mix(col,vec3(.66,.47,.16),s*.75); }
  } else if(dp>=0.){
    // dentine: ivory at the enamel, warmer towards the pulp; tubules run out from the pulp as fine streaks,
    // with faint growth lines parallel to the pulp wall
    float tp=clamp(dp/.22,0.,1.);
    col=mix(vec3(.87,.77,.61),vec3(.94,.885,.76),tp);
    vec2 g=vec2(pulpD(p+vec3(.004,0.,0.))-dp,pulpD(p+vec3(0.,.004,0.))-dp); g=normalize(g+1e-6); vec2 tg=vec2(-g.y,g.x);
    col*=1.-.09*smoothstep(.45,.9,vnoise(vec3(dot(p.xy,tg)*330.,dot(p.xy,g)*14.,2.7)));
    col*=.96+.04*fbm(p*24.);
    col*=1.-.022*(.5+.5*sin(dp*240.+fbm(p*30.)*2.));
    // cementum: a thin, darker skin on the root
    float cem=smoothstep(.02,-.03,p.y)*smoothstep(.014,.005,inn);
    col=mix(col,vec3(.8,.72,.57),cem*.85);
  } else {
    // pulp: soft, blood-filled tissue, darker at the wall where the dentine-forming cells sit
    float w=-dp;
    col=mix(vec3(.62,.3,.3),vec3(.83,.52,.48),smoothstep(.0,.03,w));
    col*=.84+.16*fbm(p*60.);
    col=mix(col,vec3(.6,.2,.22),.35*smoothstep(.62,.8,vnoise(vec3(p.xy*95.,1.7))));   // fine capillaries
    // the nerve, with an artery and a vein beside it, running up the canal; widths follow the canal's own width
    vec2 cd=canalD(p.xy); float lat=cd.x, r=w+abs(lat), mea=.18*sin(cd.y*5.1+1.3);
    float nw=clamp(r*.2,.0025,.0075), vw=clamp(r*.11,.0015,.0042), off=clamp(r*.55,.006,.022);
    float inside=smoothstep(.0015,.005,w);
    float nerve=1.-smoothstep(nw*.7,nw,abs(lat-off*mea*.3));
    float art=1.-smoothstep(vw*.6,vw,abs(lat-off*(1.+mea*.4)));
    float vein=1.-smoothstep(vw*.7,vw*1.15,abs(lat+off*(1.-mea*.4)));
    col=mix(col,vec3(.55,.1,.13),art*inside*.95);
    col=mix(col,vec3(.34,.2,.34),vein*inside*.9);
    col=mix(col,vec3(.96,.9,.73),nerve*inside);
    col=mix(col,vec3(.5,.2,.18),edgeLine(dp,pxw,.9)*.55);
  }
  if(cr<.028){ float k=smoothstep(.028,.01,cr); col=mix(col,mix(vec3(.33,.23,.15),vec3(.48,.34,.2),fbm(p*90.)),k); }
  if(dC<0. && dU>0.) col=vec3(.8,.73,.56)*(.88+.12*fbm(p*110.));
  // thin, soft edges instead of ink: the outer surface, the enamel-dentine junction, the worn plane, the cavity
  col=mix(col,col*.45,edgeLine(dU,pxw,1.)*.9);
  col=mix(col,col*.78,edgeLine(dD,pxw,.8)*(enamel||crownW(p)>.3?.65:0.));
  if(worn) col=mix(col,col*.6,edgeLine(p.y-uWearY,pxw,1.)*.8);
  if(uCaries.w>0.) col=mix(col,vec3(.25,.17,.11),edgeLine(cr-.028,pxw,.9)*.6);
  return col;
}

void main(){
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 rd=normalize(uv.x*uRt+uv.y*uUp+uFocal*uFw);
  vec3 ro=uRo;
  vec3 inv=1./rd; vec3 t0=(uBoxMin-ro)*inv, t1=(uBoxMax-ro)*inv; vec3 tmn=min(t0,t1), tmx=max(t0,t1);
  float tn=max(max(tmn.x,tmn.y),tmn.z), tf=min(min(tmx.x,tmx.y),tmx.z);
  float minR=1e3, minCap=1e3, capY=0.; bool hit=false, capIn=false; float t=max(tn,0.);
  bool worn = uWearY < uTop-.004;
  if(tf>tn){
    for(int i=0;i<200;i++){
      vec3 p=ro+rd*t; float dU,dC; float d=max(mapT(p,dU,dC),p.z-uCutX);
      minR=min(minR,d/t);
      float st=d;
      if(worn){ float cap=max(max(dU,wearH(p)-p.y),p.z-uCutX); if(cap<0.){ if(!capIn) capY=p.y; capIn=true; } else minCap=min(minCap,cap/t); st=min(d,abs(cap)+.006); }
      if(d<.0006*t){ hit=true; break; }
      t+=st*(uLeh.x+uLeh.y+uLeh.z+uLeh.w>0.||uCavOn>0.?.55:.75); if(t>tf) break;   // grooves and decay bend the distance field: smaller steps
    }
  }
  if(hit){
    vec3 p=ro+rd*t;
    float dU,dC,dTo,dB,dG; float dT=mapAll(p,dU,dC,dTo,dB,dG);
    bool onCut=(p.z-uCutX)>dT-.0015;
    bool isBone=uJaw>0. && dB<=min(dTo,dG)+.0004;
    bool isGum=uJaw>0. && !isBone && dG<=dTo+.0004;
    vec3 n=onCut?vec3(0.,0.,1.):normal(p);
    vec3 L=normalize(vec3(-.35,.8,.55));
    float ao=calcAO(p,n);
    float lam=max(dot(n,L),0.);
    float tone=clamp(.22+.8*lam,0.,1.)*mix(.6,1.,ao);
    float pxw=t*uPx;
    vec3 col;
    if(onCut){
      if(isBone){
        float rim=-blockD(p);
        vec3 base=rim<.035?mix(BONE,BONEH,.3):BONE;
        float ink=stipple(p,rim<.035?.16:.07,130.,pxw)*.55;
        ink=max(ink,stipple(p+.51,.05,48.,pxw)*.35);
        ink=max(ink,edgeLine(dB,pxw,1.2));
        col=mix(base,INK,ink*.85);
      } else if(isGum){
        col=mix(GUM,INK,edgeLine(dG,pxw,1.2)*.8);
      } else if(uReal>0.){
        col=realCut(p,dU,dC,pxw,worn);
      } else {
        float dp=pulpD(p), dD=dU+enamT(p), cr=uCaries.w>0.?carD(p):1.;
        bool enamel=dD>0. && crownW(p)>.5;
        vec3 base=enamel?ENAM:(p.y<0.?mix(DENT,ROOTC,.2):DENT);
        if(dp<0.) base=PULP;
        if(cr<.028) base=CAV;
        if(uCavOn>0. && cavDepth(p)>.004 && dU>-.03) base=mix(DENTX,CAV,.75);   // the decayed rim under a carved surface
        if(dC<0. && dU>0.) base=CALC;
        float ink=0.;
        if(enamel){ float bl=lehInk(p); ink=clamp(bl*1.7,0.,.9);
          if(uPb>0. && stipple(p,uPb*.3,150.,pxw)>.5) base=METAL; }
        if(dC<0. && dU>0.) ink=max(ink,stipple(p,.25,140.,pxw)*.7);
        ink=max(ink,edgeLine(dU,pxw,1.5));
        ink=max(ink,edgeLine(dD,pxw,1.)*(enamel||crownW(p)>.3?.8:0.));
        ink=max(ink,edgeLine(dp,pxw,1.1)*.85);
        if(worn) ink=max(ink,edgeLine(p.y-wearH(p),pxw,1.2));
        if(uCaries.w>0.) ink=max(ink,edgeLine(cr-.028,pxw,1.)*.8);
        col=mix(base,INK,ink);
      }
    } else {
      float cr=uCaries.w>0.?carD(p):1.;
      bool facet=worn && abs(p.y-wearH(p))<.004 && n.y>.55;
      bool isCalc=uCalc>0. && dC<=smax(dU,p.y-wearH(p),.008)+.0004;
      float cw=crownW(p);
      vec3 base=mix(ROOTC,ENAM,cw);
      if(isBone) base=BONE; if(isGum) base=GUM;
      if(isCalc) base=CALC;
      if(cr<.012) base=CAV;
      float cv=uCavOn>0.?cavDepth(p)/(uCavD.x+uCavD.y+uCavD.z):0.;   // decayed surface: browner the deeper
      if(cv>.06) base=mix(mix(DENTX,CAV,.35),CAV,smoothstep(.06,.9,cv));
      float dD=dU+enamT(p);
      if(facet) base=dD<0.?DENTX:ENAM;
      float pw=pxw/max(dot(n,-rd),.3);
      float dark=clamp(1.-tone,0.,1.);
      float ink=stipple(p,dark*dark*1.1,58.,pw);
      ink=max(ink,stipple(p+.37,max(0.,dark-.45)*1.4,97.,pw)*.9);
      if(isBone||isGum) ink*=.55;
      float rim=1.-smoothstep(.08,.28,dot(n,-rd));
      ink=max(ink,rim*.85);
      if(!facet && !isCalc && !isBone && !isGum && p.y>0.){ float b=lehInk(p); ink=max(ink,clamp(b*2.,0.,.95)*crownMask(p.y)); }
      if(facet) ink=max(ink*.3,edgeLine(dD,pw,1.2)*.8);
      if(cr<.012) ink=max(ink*.5,stipple(p,.4,120.,pw)*.5);
      col=mix(base*(.95+.05*tone),INK,ink);
      if(uReal>0.){
        // the realistic plate: smooth light instead of stipple. Enamel is pearly with a soft highlight, the root
        // a warmer, matte cementum; stress lines are faint grooves, tartar and decay are matte
        vec3 b=mix(vec3(.86,.8,.68),vec3(.95,.945,.93),cw);
        if(isCalc) b=vec3(.8,.73,.56); if(cr<.012) b=vec3(.36,.26,.17); if(facet) b=dD<0.?vec3(.86,.76,.6):vec3(.95,.945,.93);
        if(cv>.06) b=mix(vec3(.6,.47,.32),vec3(.27,.19,.12),smoothstep(.06,.9,cv));   // carved decay: browner the deeper
        b*=.93+.07*fbm(p*55.);
        float spec=pow(max(dot(reflect(-L,n),-rd),0.),28.)*.32*cw*(isCalc?0.:1.);
        col=b*(.62+.38*lam)*mix(.8,1.,ao)+spec;
        if(!facet && !isCalc && p.y>0.){ float bb=lehInk(p); col*=1.-.45*clamp(bb*1.6,0.,1.)*crownMask(p.y); }   // the wavy stress-line grooves
        col*=1.-.4*rim;
      }
    }
    o=vec4(col,1.);
  } else {
    float e=(1.-smoothstep(.6,1.6,minR/uPx))*(uReal>0.?.55:.95);
    o=vec4(INK*e,e);
  }
  if(worn && uCapTint.a>0.){
    // the worn-away crown as translucent material, with a solid outline: what chewing has taken off the tooth
    float e=(1.-smoothstep(.5,1.4,minCap/uPx))*.9;
    if(capIn){ vec3 tc=capCol(capY); o=o*(1.-uCapTint.a)+vec4(tc*uCapTint.a,uCapTint.a); }
    else o=o*(1.-e)+vec4(uCapTint.rgb*e,e);
  } else if(worn && !capIn){
    float e=(1.-smoothstep(.5,1.4,minCap/uPx))*step(.5,fract((gl_FragCoord.x+gl_FragCoord.y)*.12))*.7;
    o=o*(1.-e)+vec4(vec3(.42,.41,.39)*e,e);
  }
}`;

  // ------------------------------------------------------------------ renderer
  function create(canvas) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    function sh(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, "a"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = {}; const u = n => (U[n] = U[n] || gl.getUniformLocation(prog, n));
    const tex = gl.createTexture(); let texKey = null;
    function uploadVol(V, key) {
      if (texKey === key) return;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB8, V.dims[0], V.dims[1], V.dims[2], 0, gl.RGB, gl.UNSIGNED_BYTE, V.data);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_3D, k, gl.LINEAR));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R].forEach(k => gl.texParameteri(gl.TEXTURE_3D, k, gl.CLAMP_TO_EDGE));
      gl.uniform1i(u("uVol"), 0); texKey = key;
    }
    // a 1x1x1 placeholder so the sampler is always complete
    gl.bindTexture(gl.TEXTURE_3D, tex); gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB8, 1, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255]));

    const st = { S: null, P: null, cam: { yaw: 0.55, pitch: 0.22, dist: 6, focal: 3.2, target: [0, 0, 0] }, quality: 1, basis: null };
    function camBasis() {
      const c = st.cam, cp = Math.cos(c.pitch);
      const dir = [Math.sin(c.yaw) * cp, Math.sin(c.pitch), Math.cos(c.yaw) * cp];
      const d = c.dist * (c.zoom || 1);                  // zoom: the page sets cam.zoom (1 = the framed view)
      const ro = [c.target[0] + dir[0] * d, c.target[1] + dir[1] * d, c.target[2] + dir[2] * d];
      const fw = [-dir[0], -dir[1], -dir[2]];
      let rt = [fw[2], 0, -fw[0]]; const rl = Math.hypot(rt[0], rt[2]) || 1; rt = [-rt[0] / rl, 0, -rt[2] / rl];
      const upv = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
      return { ro, fw, rt, up: upv };
    }
    function setShape(S, jaw) {
      st.S = finishShape(S);
      S.jaw = !!jaw;
      S.jawMin = [S.boxMin[0] - 0.1, S.rootMin - 0.2, S.boxMin[2] - 0.06];
      S.jawMax = [S.boxMax[0] + 0.1, -0.08, S.boxMax[2] + 0.06];
      if (S.jaw) { S.rbMin = [S.jawMin[0] - 0.12, S.jawMin[1] - 0.12, S.jawMin[2] - 0.12]; S.rbMax = [S.jawMax[0] + 0.12, S.boxMax[1], S.jawMax[2] + 0.12]; }
      else { S.rbMin = S.boxMin; S.rbMax = S.boxMax; }
      S.bottom = S.jaw ? S.jawMin[1] - 0.04 : S.rootMin;
      const h = S.top - S.bottom;
      st.cam.target = [0, (S.top + S.bottom) / 2 + 0.02, 0];
      st.cam.dist = (h / 2) * st.cam.focal / 0.8;
      if (S.mesh) uploadVol(S.vol, S.key);
    }
    function setFrame(targetY, dist) { st.cam.target = [0, targetY, 0]; st.cam.dist = dist; }
    function setParams(P) { st.P = P; }
    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6) * st.quality;
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
    }
    function render() {
      const S = st.S, P = st.P; if (!S || !P) return;
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      const b = camBasis(); st.basis = b;
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform3fv(u("uRo"), b.ro); gl.uniform3fv(u("uFw"), b.fw); gl.uniform3fv(u("uRt"), b.rt); gl.uniform3fv(u("uUp"), b.up);
      gl.uniform1f(u("uFocal"), st.cam.focal); gl.uniform1f(u("uPx"), 2 / (canvas.height * st.cam.focal));
      gl.uniform3fv(u("uB"), S.B); gl.uniform1f(u("uR"), S.R); gl.uniform1f(u("uTaper"), S.taper); gl.uniform1f(u("uBodyY"), S.bodyY);
      gl.uniform1f(u("uEdge"), S.edge); gl.uniform1f(u("uTop"), S.top); gl.uniform1f(u("uEnamel"), S.enamel);
      const cz = new Float32Array(16); S.cusps.forEach((c, i) => cz.set(c, i * 4)); gl.uniform4fv(u("uCusp"), cz); gl.uniform1i(u("uNC"), S.cusps.length);
      gl.uniform1i(u("uHasTip"), S.tip ? 1 : 0);
      if (S.tip) { gl.uniform4fv(u("uTipA"), S.tip[0]); gl.uniform4fv(u("uTipB"), S.tip[1]); }
      gl.uniform2fv(u("uGroove"), S.groove); gl.uniform1f(u("uGrooveY"), S.grooveY);
      const ra = new Float32Array(12), rb = new Float32Array(12);
      S.roots.forEach((r, i) => { ra.set(r.slice(0, 4), i * 4); rb.set(r.slice(4, 8), i * 4); });
      gl.uniform4fv(u("uRootA"), ra); gl.uniform4fv(u("uRootB"), rb); gl.uniform1i(u("uNR"), S.mesh ? 0 : S.roots.length);
      gl.uniform3fv(u("uPulpC"), S.pulpC); gl.uniform3fv(u("uPulpR"), S.pulpR);
      gl.uniform1f(u("uWearY"), P.wearY); gl.uniform1f(u("uWearAmp"), P.wearAmp || 0); gl.uniform4fv(u("uCapTint"), P.capTint || [0, 0, 0, 0]);
      gl.uniform1f(u("uCavOn"), P.cav ? 1 : 0); if (P.cav) { gl.uniform4fv(u("uCavC"), P.cav.c); gl.uniform4fv(u("uCavR"), P.cav.r); gl.uniform3fv(u("uCavD"), P.cav.d); }
      gl.uniform1i(u("uCapN"), P.capS ? 8 : 0); if (P.capS) { gl.uniform1fv(u("uCapS"), P.capS); gl.uniform3fv(u("uCapC"), P.capC); } gl.uniform1f(u("uCutX"), P.cutX); gl.uniform1f(u("uCalc"), P.calc); gl.uniform1f(u("uPb"), P.pb);
      gl.uniform4fv(u("uLeh"), pad4(P.leh, 0)); gl.uniform4fv(u("uLehY"), pad4(P.lehY, -9)); gl.uniform4fv(u("uCaries"), P.caries);
      gl.uniform3fv(u("uBoxMin"), S.rbMin); gl.uniform3fv(u("uBoxMax"), S.rbMax);
      gl.uniform1f(u("uJaw"), S.jaw && P.jaw !== false ? 1 : 0); gl.uniform3fv(u("uJawMin"), S.jawMin); gl.uniform3fv(u("uJawMax"), S.jawMax);
      gl.uniform1i(u("uMesh"), S.mesh ? 1 : 0);
      gl.uniform1f(u("uReal"), P.real ? 1 : 0);
      const sg = new Float32Array(96); (S.canalSegs || []).forEach((q, i) => sg.set(q, i * 4));
      gl.uniform4fv(u("uSeg"), sg); gl.uniform1i(u("uNSeg"), (S.canalSegs || []).length);
      if (S.mesh) {
        uploadVol(S.vol, S.key);
        gl.uniform3fv(u("uVolMin"), S.vol.origin); gl.uniform3fv(u("uDims"), S.vol.dims); gl.uniform1f(u("uPitch"), S.vol.pitch); gl.uniform1f(u("uVClamp"), S.vol.clamp);
      }
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function sdfJS(p) {
      const S = st.S, P = st.P;
      let d = smax(outerJS(p, S), p[1] - wearAt(P, p[0], p[2]), 0.008);
      if (P.caries[3] > 0) d = smax(d, -(Math.hypot(p[0] - P.caries[0], p[1] - P.caries[1], p[2] - P.caries[2]) - P.caries[3]), 0.012);
      return Math.max(d, p[2] - P.cutX);
    }
    function march(ro, rd, maxT) {
      let t = 0;
      for (let i = 0; i < 220; i++) {
        const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
        const d = sdfJS(p);
        if (d < 0.0012) return { t, p };
        t += Math.max(d * 0.75, 0.001); if (t > maxT) break;
      }
      return null;
    }
    function basisFor(cam) { const save = st.cam; st.cam = Object.assign({}, save, cam); const b = camBasis(); st.cam = save; return b; }
    function projectWith(p, b) {
      const r = canvas.getBoundingClientRect();
      const rel = [p[0] - b.ro[0], p[1] - b.ro[1], p[2] - b.ro[2]];
      const z = rel[0] * b.fw[0] + rel[1] * b.fw[1] + rel[2] * b.fw[2];
      const x = rel[0] * b.rt[0] + rel[1] * b.rt[1] + rel[2] * b.rt[2];
      const y = rel[0] * b.up[0] + rel[1] * b.up[1] + rel[2] * b.up[2];
      return { x: r.width / 2 + x / z * st.cam.focal * r.height / 2, y: r.height / 2 - y / z * st.cam.focal * r.height / 2, z };
    }
    function samplePoints(n, seed) {
      const S = st.S; if (S.mesh) { const pts = modelPoints(S.key) || []; return pts.slice(0, n); }
      const out = []; let a = seed >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const f = p => outerJS(p, S), e = 0.002;
      const grad = p => { const g = [f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]), f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]), f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])]; const l = Math.hypot(...g) || 1; return [g[0] / l, g[1] / l, g[2] / l]; };
      for (let k = 0; k < n * 30 && out.length < n; k++) {
        let p = [S.boxMin[0] + rnd() * (S.boxMax[0] - S.boxMin[0]), S.rootMin + rnd() * (S.top - S.rootMin), S.boxMin[2] + rnd() * (S.boxMax[2] - S.boxMin[2])];
        for (let i = 0; i < 8; i++) { const d = f(p); if (Math.abs(d) < 0.0015) break; const g = grad(p); p = [p[0] - g[0] * d, p[1] - g[1] * d, p[2] - g[2] * d]; }
        if (Math.abs(f(p)) < 0.004) out.push({ p, n: grad(p), e: p[1] > 0 ? 1 : 0 });
      }
      return out;
    }
    function project(p) { return projectWith(p, st.basis || camBasis()); }
    function visible(p) {
      const b = st.basis || camBasis();
      const v = [p[0] - b.ro[0], p[1] - b.ro[1], p[2] - b.ro[2]], L = Math.hypot(...v);
      const h = march(b.ro, [v[0] / L, v[1] / L, v[2] / L], L + 0.1);
      return !h || h.t > L - 0.05;
    }
    return { gl, st, canvas, setShape, setFrame, setParams, render, project, projectWith, basisFor, samplePoints, visible, march, sdfJS, outerJS: p => outerJS(p, st.S), camBasis };
  }

  window.ToothGL = { create, shape, loadModels, modelPoints, wearN, wearAt, hasModel: (type, jaw) => !!(modelKey(type, jaw) && VOL[modelKey(type, jaw)]) };
})();
