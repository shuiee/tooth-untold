"""Cut the intro jaw engraving out of its white background:
source/jaw engraving/jaw-arches.webp  →  images/jaw-arches.webp (with transparency). bundle.py embeds it.

The picture must show both dental arches opened out flat: upper arch in the top half, lower arch in the
bottom half, the back of the mouth (the jaw hinge) on the horizontal centre line. The intro starts with
the lower half folded up onto the upper half along that line and swings it open.

Background = large near-white areas (the page corners, the gaps between the pieces, the midline slits).
Small bright specks inside the engraving are highlights and stay opaque."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source", "jaw engraving", "jaw-arches.webp")
OUT = os.path.join(HERE, "images", "jaw-arches.webp")

rgb = np.asarray(Image.open(SRC).convert("RGB"))
W = rgb.shape[1]
white = rgb.min(2) >= 246                       # paper white, including faint compression noise
lab, n = ndi.label(white)
sizes = ndi.sum(white, lab, range(1, n + 1))
boxes = ndi.find_objects(lab)
mid = (W // 2 - 12, W // 2 + 12)                # the thin gap between left and right halves
bg_ids = [i + 1 for i, (s, b) in enumerate(zip(sizes, boxes))
          if s >= 1000 or (s > 50 and b[1].start >= mid[0] and b[1].stop <= mid[1])]
fg = (~np.isin(lab, bg_ids)).astype(float)
alpha = np.maximum(ndi.gaussian_filter(fg, 0.6), fg)   # soft 1 px edge, solid inside
rgba = np.dstack([rgb, (alpha * 255).round().astype(np.uint8)])
os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.fromarray(rgba, "RGBA").save(OUT, "WEBP", quality=90, method=6)
print(OUT, rgb.shape[1], "x", rgb.shape[0], "px,", round(os.path.getsize(OUT) / 1024), "KB,", round(fg.mean() * 100), "% opaque")
