"""Generate the responsive catalog image set for game cards.
Reads assets/games/<slug>-card-clean.<ext> and writes
assets/catalog/games/<slug>-{480,800}.{avif,webp}
Usage: py -3 build/scripts/make-catalog-images.py slug1 slug2 ...
"""
import sys, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(ROOT, "assets", "games")
OUT_DIR = os.path.join(ROOT, "assets", "catalog", "games")
os.makedirs(OUT_DIR, exist_ok=True)

WIDTHS = [480, 800]
# quality tuned to land in the 6-30 KB band the existing cards use
Q = {480: {"webp": 76, "avif": 62}, 800: {"webp": 74, "avif": 58}}

def find_src(slug):
    for ext in ("jpg", "webp", "png"):
        p = os.path.join(SRC_DIR, f"{slug}-card-clean.{ext}")
        if os.path.exists(p):
            return p
    return None

for slug in sys.argv[1:]:
    src = find_src(slug)
    if not src:
        print(f"{slug:20} NO SOURCE (skipped - svg cards skip the catalog set)")
        continue
    im = Image.open(src).convert("RGB")
    # cards are authored 16:9; crop to exactly 16:9 if the capture drifted
    tw, th = im.size
    target = 16 / 9
    if abs(tw / th - target) > 0.01:
        if tw / th > target:
            nw = int(th * target); im = im.crop(((tw - nw) // 2, 0, (tw - nw) // 2 + nw, th))
        else:
            nh = int(tw / target); im = im.crop((0, (th - nh) // 2, tw, (th - nh) // 2 + nh))
    out = []
    for w in WIDTHS:
        h = round(w * 9 / 16)
        rs = im.resize((w, h), Image.LANCZOS)
        for fmt in ("webp", "avif"):
            p = os.path.join(OUT_DIR, f"{slug}-{w}.{fmt}")
            rs.save(p, format=fmt.upper(), quality=Q[w][fmt], method=6 if fmt == "webp" else None)
            out.append(f"{w}.{fmt}={os.path.getsize(p)//1024}KB")
    print(f"{slug:20} " + "  ".join(out))
