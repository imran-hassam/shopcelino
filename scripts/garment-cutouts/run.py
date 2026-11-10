"""
Cut the clothes out of Shop Celino's own product photos (no models, no backgrounds).

Runs on a GitHub Actions machine (it can reach the store). For the newest published products it:
  1. downloads up to 2 photos per product (size charts skipped),
  2. finds the clothing with the free U2Net cloth-segmentation model (via rembg),
  3. saves the clothing only, on a transparent background, cropped tight (WebP),
  4. writes stats.json (how clean each cut-out is) and contact sheets for a human review.

Nothing here is generated or invented: every pixel kept comes from the product's own photo.
"""

import io
import json
import os
import re
import sys

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from rembg import new_session
from scipy import ndimage

STORE = "https://shopcelino.com/wp-json/wc/store/v1/products"
OUT = sys.argv[1] if len(sys.argv) > 1 else "cutouts"
LIMIT = int(os.environ.get("LIMIT", "60"))
MAX_SIDE = 1000

os.makedirs(OUT, exist_ok=True)
chart = re.compile(r"size[-_ ]?(chart|guide)|measure", re.I)


def products():
    out, page = [], 1
    while len(out) < LIMIT:
        r = requests.get(
            STORE,
            params={"per_page": 50, "page": page, "orderby": "date", "order": "desc", "_fields": "id,slug,name,images,categories"},
            timeout=120,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        out += batch
        page += 1
    return out[:LIMIT]


def load(url):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert("RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE))
    return im


session = new_session("u2net_cloth_seg")


def cutout(im):
    # The model returns one mask per clothing group (upper body, lower body, full body); join them.
    masks = session.predict(im)
    m = np.zeros((im.height, im.width), dtype=np.float32)
    for mk in masks:
        a = np.asarray(mk.convert("L").resize(im.size), dtype=np.float32) / 255.0
        m = np.maximum(m, a)
    hard = m > 0.5
    # Clean up: fill pin-holes, drop specks.
    hard = ndimage.binary_closing(hard, iterations=2)
    hard = ndimage.binary_fill_holes(hard)
    lab, n = ndimage.label(hard)
    if n == 0:
        return None, {"area": 0}
    sizes = ndimage.sum(hard, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1]
    big = sizes[order[0]]
    keep = [i + 1 for i in order if sizes[i] >= 0.06 * big]
    keepmask = np.isin(lab, keep)
    stats = {
        "area": float(keepmask.mean()),
        "parts": len(keep),
        "largestShare": float(big / sizes[[k - 1 for k in keep]].sum()),
    }
    ys, xs = np.where(keepmask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    stats.update({"bboxW": int(x1 - x0), "bboxH": int(y1 - y0), "topRatio": float(y0 / im.height)})
    # Soft edge: feather the kept mask slightly using the model's own soft values.
    alpha = np.where(keepmask, np.clip(m * 1.4, 0, 1), 0)
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.copy()
    rgba.putalpha(alpha_img)
    pad = 6
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    return rgba.crop(box), stats


def sheet(items, path):
    cell_w, cell_h, cols = 220, 300, 8
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * cell_w, rows * (cell_h + 28)), (243, 238, 227))
    d = ImageDraw.Draw(canvas)
    for i, (label, im) in enumerate(items):
        x, y = (i % cols) * cell_w, (i // cols) * (cell_h + 28)
        t = im.copy()
        t.thumbnail((cell_w - 16, cell_h - 16))
        canvas.paste(t, (x + (cell_w - t.width) // 2, y + 8), t)
        d.text((x + 6, y + cell_h + 4), label, fill=(34, 32, 29))
    canvas.save(path, quality=80)


def main():
    stats, review = [], []
    for p in products():
        imgs = [i for i in p.get("images", []) if not chart.search(i["src"].rsplit("/", 1)[-1])][:2]
        for idx, img in enumerate(imgs):
            name = img["src"].rsplit("/", 1)[-1].rsplit(".", 1)[0]
            try:
                im = load(img["src"])
                cut, st = cutout(im)
            except Exception as e:  # keep going; report it
                print("fail", img["src"], e, flush=True)
                continue
            if cut is None:
                continue
            fn = f"{name}.webp"
            cut.save(os.path.join(OUT, fn), "WEBP", quality=86, method=6)
            st.update({"productId": p["id"], "slug": p["slug"], "name": p["name"], "imageIndex": idx, "src": img["src"], "file": fn,
                       "categories": [c["slug"] for c in p.get("categories", [])]})
            stats.append(st)
            review.append((f"{len(stats)-1}:{p['id']}/{idx} {st['parts']}p", cut))
            print(len(stats), fn, st, flush=True)
    with open(os.path.join(OUT, "stats.json"), "w") as f:
        json.dump(stats, f, indent=1)
    for k in range(0, len(review), 32):
        sheet(review[k : k + 32], os.path.join(OUT, f"_sheet_{k // 32}.jpg"))


main()
