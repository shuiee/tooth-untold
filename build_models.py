"""
Build data/models.js from the sculpted tooth models in ../teeth models/*.zip (ZBrush OBJ + colour map).

For each tooth:
  1. read the mesh and its colour texture, and mark enamel (white crown) vs root per vertex;
  2. orient it: crown up (+y), widest horizontal axis on x, the cement-enamel junction (CEJ) at y = 0;
  3. scale it to a typical real length (1 unit = 10 mm);
  4. for canines (the tooth drawn in the main view): convert it to a signed-distance volume so the
     renderer can cut it open. Channels: R = distance to the tooth surface, G = crown (enamel) mask,
     B = distance to a pulp cavity derived from the shape. The pulp is the core of each horizontal
     slice (deeper than 86% of that slice's maximum depth in the root, 68% in the crown), stopping inside the crown. It is anatomy
     drawn from the model, not data;
  5. for every tooth: sample a surface point cloud with normals (used by the intro drawings).

Run:  python3 build_models.py   (needs numpy, scipy, trimesh, rtree, pillow)
"""
import base64, gzip, io, json, os, re, tempfile, zipfile
import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
# source files: ./source/teeth models in the shared folder, or ../teeth models next to the project
SRC = next((p for p in [os.path.join(HERE, "source", "teeth models"), os.path.join(HERE, "..", "teeth models")] if os.path.isdir(p)), os.path.join(HERE, "source", "teeth models"))
Image.MAX_IMAGE_PIXELS = None

# key: (zip file, typical total length in mm, typical crown length in mm, build volume?)
TEETH = {
    "man_canine": ("mandibular-left-canine.zip", 26.0, 11.0, True),
    "max_canine": ("maxillary-canine.zip", 27.0, 10.0, True),
    "man_pm1": ("mandibular-first-premolar.zip", 22.5, 8.5, False),
    "man_pm2": ("mandibular-left-second-premolar.zip", 22.5, 8.0, False),
    "max_pm1": ("maxillary-first-premolar.zip", 22.5, 8.5, False),
    "max_pm2": ("maxillary-second-premolar.zip", 22.5, 8.5, False),
}
PITCH = 0.016          # voxel size in units (0.16 mm)
DCLAMP = 0.25          # stored distance range, +/- units


def read_zip(path):
    """Return (obj text, colour texture PIL image) from a nested Sketchfab/ZBrush zip."""
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(path) as z: z.extractall(tmp)
    for _ in range(3):   # nested zips
        for root, _, files in os.walk(tmp):
            for f in files:
                if f.lower().endswith(".zip"):
                    p = os.path.join(root, f)
                    with zipfile.ZipFile(p) as z: z.extractall(root)
                    os.remove(p)
    objs, texs = [], []
    for root, _, files in os.walk(tmp):
        for f in files:
            p = os.path.join(root, f)
            if f.lower().endswith(".obj"): objs.append(p)
            if f.lower().endswith(".png") and "NM" not in f and "textures" in root: texs.append(p)
    return open(objs[0]).read(), Image.open(texs[0]).convert("RGB")


def parse_obj(txt):
    V, VT, F, FT = [], [], [], []
    for line in txt.splitlines():
        if line.startswith("v "): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "): VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("f "):
            parts = [t.split("/") for t in line.split()[1:]]
            vi = [int(p[0]) - 1 for p in parts]
            ti = [int(p[1]) - 1 if len(p) > 1 and p[1] else -1 for p in parts]
            for i in range(1, len(vi) - 1):
                F.append([vi[0], vi[i], vi[i + 1]]); FT.append([ti[0], ti[i], ti[i + 1]])
    return np.array(V), np.array(VT), np.array(F), np.array(FT)


def enamel_mask(V, VT, F, FT, tex):
    """Per-vertex enamel score from the colour map: enamel is painted near-white, root warm beige."""
    arr = np.asarray(tex).astype(np.float32)
    H, W = arr.shape[:2]
    acc = np.zeros(len(V)); cnt = np.zeros(len(V))
    uv = VT[FT.reshape(-1)]
    px = np.clip((uv[:, 0] % 1) * (W - 1), 0, W - 1).astype(int)
    py = np.clip((1 - uv[:, 1] % 1) * (H - 1), 0, H - 1).astype(int)
    col = arr[py, px]
    score = (col[:, 2] / np.maximum(col[:, 0], 1)) > 0.9     # blue/red ratio: white ~0.95, beige ~0.75
    np.add.at(acc, F.reshape(-1), score.astype(float)); np.add.at(cnt, F.reshape(-1), 1)
    return acc / np.maximum(cnt, 1)


def orient(V, mask, length_mm, crown_mm):
    ys = V[:, 1]
    if V[mask > 0.5, 1].mean() < ys.mean():            # crown should point up
        V = V * np.array([1, -1, -1])
    c = V[mask > 0.5][:, [0, 2]].mean(0)
    V = V - np.array([c[0], 0, c[1]])
    xz = V[:, [0, 2]] - V[:, [0, 2]].mean(0)
    ev, evec = np.linalg.eigh(np.cov(xz.T)); a = evec[:, 1]           # widest horizontal direction
    ang = np.arctan2(a[1], a[0])
    R = np.array([[np.cos(ang), 0, np.sin(ang)], [0, 1, 0], [-np.sin(ang), 0, np.cos(ang)]])
    V = V @ R
    # CEJ: scan down from the crown tip until a horizontal band is mostly root
    ys = V[:, 1]; edges = np.arange(ys.max(), ys.min(), -0.01)
    cej = edges[-1]
    for hi_, lo_ in zip(edges[:-1], edges[1:]):
        sel = (ys <= hi_) & (ys > lo_)
        if sel.sum() > 20 and mask[sel].mean() < 0.5: cej = hi_; break
    V[:, 1] -= cej
    # tilt about x so the root axis lies in the cutting plane z = 0 (the section then passes through the canal)
    ys = V[:, 1]; bands = np.linspace(ys.min() + 0.02 * np.ptp(ys), -0.01 * np.ptp(ys), 12)
    cy, cz = [], []
    for a_, b_ in zip(bands[:-1], bands[1:]):
        sel = (ys >= a_) & (ys < b_)
        if sel.sum() > 30: cy.append(ys[sel].mean()); cz.append(V[sel, 2].mean())
    if len(cy) > 3:
        slope, icpt = np.polyfit(cy, cz, 1); th = np.arctan(slope)
        Rx = np.array([[1, 0, 0], [0, np.cos(th), np.sin(th)], [0, -np.sin(th), np.cos(th)]])
        V = V @ Rx.T
        V[:, 2] -= np.mean([V[(ys >= a_) & (ys < b_), 2].mean() for a_, b_ in zip(bands[:-1], bands[1:]) if ((ys >= a_) & (ys < b_)).sum() > 30])
    s = (length_mm / 10.0) / (V[:, 1].max() - V[:, 1].min())
    return V * s


def surface_points(mesh, mask_v, n, seed):
    pts, fi = trimesh.sample.sample_surface(mesh, n, seed=seed)
    nrm = mesh.face_normals[fi]
    tri = mesh.faces[fi]
    en = mask_v[tri].mean(1)
    q = np.concatenate([pts, nrm, en[:, None]], 1).astype(np.float32)
    return base64.b64encode(np.round(q * 2000).astype(np.int16).tobytes()).decode()   # /2000 to decode


def build_volume(mesh, mask_v):
    lo = mesh.bounds[0] - 0.14; hi = mesh.bounds[1] + 0.14
    dims = np.ceil((hi - lo) / PITCH).astype(int) + 1
    gx, gy, gz = [lo[i] + np.arange(dims[i]) * PITCH for i in range(3)]
    # occupancy by voxel fill, then exact distances near the surface
    vg = mesh.voxelized(PITCH / 2).fill()
    occ_pts = vg.points
    occ = np.zeros(dims, bool)
    ijk = np.round((occ_pts - lo) / PITCH).astype(int)
    ok = np.all((ijk >= 0) & (ijk < dims), 1); occ[tuple(ijk[ok].T)] = True
    occ = ndimage.binary_closing(occ, iterations=1)
    din = ndimage.distance_transform_edt(occ) * PITCH
    dout = ndimage.distance_transform_edt(~occ) * PITCH
    sd = np.where(occ, -din + PITCH / 2, dout - PITCH / 2)
    near = np.abs(sd) < 3.5 * PITCH
    P = np.stack(np.meshgrid(gx, gy, gz, indexing="ij"), -1)[near]
    _, dist, _ = trimesh.proximity.closest_point(mesh, P)
    sd[near] = np.where(sd[near] < 0, -dist, dist)
    # crown mask: carried from the nearest surface vertex
    seed = np.zeros(dims, np.float32); hit = np.zeros(dims, bool)
    vi = np.clip(np.round((mesh.vertices - lo) / PITCH).astype(int), 0, dims - 1)
    np.maximum.at(seed, tuple(vi.T), mask_v.astype(np.float32)); hit[tuple(vi.T)] = True
    _, ind = ndimage.distance_transform_edt(~hit, return_indices=True)
    crown = ndimage.gaussian_filter(seed[tuple(ind)], 1.2)
    # pulp: the deep core of each horizontal slice, ending below the crown tip
    depth = np.where(occ, din, 0)
    top = mesh.bounds[1][1]
    pulp = np.zeros(dims, bool)
    for j in range(dims[1]):
        y = gy[j]
        if y > 0.45 * top or y < mesh.bounds[0][1] + 0.05: continue
        m = depth[:, j, :].max()
        if m <= 0: continue
        pulp[:, j, :] = depth[:, j, :] > (0.68 if y > 0 else 0.86) * m
    pulp = ndimage.binary_opening(pulp, iterations=1)
    pin = ndimage.distance_transform_edt(pulp) * PITCH
    pout = ndimage.distance_transform_edt(~pulp) * PITCH
    psd = ndimage.gaussian_filter(np.where(pulp, -pin, pout), 0.8)
    # canal line: pulp centroid per slice, from apex upwards
    canal = []
    for j in range(0, dims[1], 4):
        sl = pulp[:, j, :]
        if sl.any():
            ii, kk = np.nonzero(sl); canal.append([float(gx[ii].mean()), float(gy[j]), float(gz[kk].mean())])
    q = lambda a: np.clip(np.round((np.clip(a, -DCLAMP, DCLAMP) / DCLAMP) * 127.5 + 127.5), 0, 255).astype(np.uint8)
    vol = np.stack([q(sd), np.clip(np.round(crown * 255), 0, 255).astype(np.uint8), q(psd)], -1)
    vol = np.transpose(vol, (2, 1, 0, 3)).copy()          # z, y, x order for texImage3D (x fastest)
    blob = base64.b64encode(gzip.compress(vol.tobytes(), 9)).decode()
    pc = np.argwhere(pulp)
    pulpC = (lo + pc.mean(0) * PITCH).tolist() if len(pc) else [0, 0.2, 0]
    return dict(dims=dims.tolist(), origin=lo.tolist(), pitch=PITCH, dclamp=DCLAMP, vol=blob, canal=canal, pulpC=pulpC)


out = {}
for key, (zname, L, Cmm, vol) in TEETH.items():
    txt, tex = read_zip(os.path.join(SRC, zname))
    V, VT, F, FT = parse_obj(txt)
    mask = enamel_mask(V, VT, F, FT, tex)
    # keep the main shell only (one model has a small loose piece inside)
    parts = trimesh.Trimesh(V, F, process=False).split(only_watertight=False)
    if len(parts) > 1:
        comp = trimesh.graph.connected_components(trimesh.Trimesh(V, F, process=False).edges, nodes=np.arange(len(V)))
        main = max(comp, key=len); keep = np.zeros(len(V), bool); keep[main] = True
        fk = keep[F].all(1); remap = -np.ones(len(V), int); remap[keep] = np.arange(keep.sum())
        V, mask, F = V[keep], mask[keep], remap[F[fk]]
    V = orient(V, mask, L, Cmm)
    mesh = trimesh.Trimesh(V, F, process=False)
    b = mesh.bounds
    crown = V[(V[:, 1] > 0.2 * b[1][1]) & (V[:, 1] < 0.6 * b[1][1])]
    rec = dict(source=zname, top=float(b[1][1]), rootMin=float(b[0][1]),
               boxMin=b[0].tolist(), boxMax=b[1].tolist(),
               crownHalf=[float(np.abs(crown[:, 0]).max()), float(np.abs(crown[:, 2]).max())],
               apex=V[np.argmin(V[:, 1])].tolist(),
               points=surface_points(mesh, mask, 3200, 7), enamelShare=float((mask > 0.5).mean()))
    if vol: rec.update(build_volume(mesh, mask))
    out[key] = rec
    print(key, "top %.2f root %.2f" % (rec["top"], rec["rootMin"]), "vol" if vol else "", (str(rec.get("dims")) if vol else ""),
          round(len(rec.get("vol", "")) / 1024), "KB")

with open(os.path.join(HERE, "data", "models.js"), "w") as f:
    f.write("// Generated by build_models.py from ../teeth models/*.zip (ZBrush sculpts). Do not edit by hand.\n")
    f.write("window.TOOTH_MODELS = " + json.dumps(out) + ";\n")
print("wrote data/models.js", round(os.path.getsize(os.path.join(HERE, "data", "models.js")) / 1024), "KB")
