#!/usr/bin/env python3
"""Build and audit the responsive catalog art.

The one rule: every catalog tier is derived from the image `site-data.json` points at
for that slug. Never from a filename glob. `fetch` is exactly why - its master is
`fetch-card-keyart-<hash>.webp`, not `fetch-card-clean.*`, so a glob over
`assets/games/*-card-clean.*` silently builds that slug's tiers from a DIFFERENT
picture, and only the largest tier is wrong, so it only shows up on big screens.

A game may also declare `featuredImage` - a second, taller master used only by the
homepage principal card, whose frame grows past 16/9 to fill its two-row cell. Its
tiers are named `<slug>-featured-<width>` and keep the master's own aspect ratio.

  python build/qa/catalog-art.py audit     # compare every tier against its master
  python build/qa/catalog-art.py build     # (re)generate every tier from its master

Needs Pillow with AVIF support.
"""
import json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DATA = os.path.join(ROOT, "build", "src", "content", "site-data.json")
WIDTHS = {"games": [480, 800, 1200], "albums": [360, 600, 900]}
RATIO = {"games": 9 / 16, "albums": 1.0}
QUALITY = {"avif": dict(quality=52), "webp": dict(quality=76, method=6)}


def entries():
    """Yield (kind, name, master, ratio). ratio None means 'keep the master's own'."""
    data = json.load(open(DATA, encoding="utf-8"))
    for kind, key in (("games", "games"), ("albums", "releases")):
        for item in data.get(key, data.get(kind, [])):
            master = os.path.join(ROOT, item["image"].lstrip("/"))
            if item["image"].endswith(".svg") or not os.path.exists(master):
                continue
            yield kind, item["slug"], master, RATIO[kind]
            # Optional second master for the homepage principal, whose frame grows past
            # 16/9 to fill its two-row cell. The whole point of this cut is that it is
            # NOT 16/9, so it is the one tier set that keeps its master's own shape -
            # forcing RATIO here would squash the exact art it exists to carry.
            tall = item.get("featuredImage")
            if tall and os.path.exists(os.path.join(ROOT, tall["src"].lstrip("/"))):
                yield kind, f"{item['slug']}-featured", os.path.join(ROOT, tall["src"].lstrip("/")), None


def signature(path, n=16):
    return list(Image.open(path).convert("L").resize((n, n), Image.LANCZOS).getdata())


def audit():
    failures = 0
    failures += audit_declared_sizes()
    for kind, name, master, _ratio in entries():
        want = signature(master)
        for width in WIDTHS[kind]:
            for ext in ("avif", "webp"):
                out = os.path.join(ROOT, "assets", "catalog", kind, f"{name}-{width}.{ext}")
                if not os.path.exists(out):
                    print(f"MISSING  {kind}/{name}-{width}.{ext}"); failures += 1; continue
                got = signature(out)
                diff = sum(abs(a - b) for a, b in zip(want, got)) / len(want)
                if diff > 12:
                    print(f"MISMATCH {kind}/{name}-{width}.{ext} differs from {os.path.basename(master)} (mean {diff:.1f})")
                    failures += 1
    print("catalog art audit: " + (f"{failures} problem(s)" if failures else "every tier matches its site-data master"))
    return 1 if failures else 0


def audit_declared_sizes():
    """`featuredImage` states its master's pixel size so the Node build never decodes an
    image. Nothing else checks that claim, and a wrong one ships a wrong <img> box."""
    failures = 0
    data = json.load(open(DATA, encoding="utf-8"))
    for item in data.get("games", []):
        tall = item.get("featuredImage")
        if not tall:
            continue
        master = os.path.join(ROOT, tall["src"].lstrip("/"))
        if not os.path.exists(master):
            print(f"MISSING  featuredImage master for {item['slug']}: {tall['src']}"); failures += 1; continue
        w, h = Image.open(master).size
        if (w, h) != (tall.get("width"), tall.get("height")):
            print(f"MISMATCH {item['slug']} featuredImage declares {tall.get('width')}x{tall.get('height')}, file is {w}x{h}")
            failures += 1
    return failures


def build():
    made = 0
    for kind, name, master, ratio in entries():
        im = Image.open(master).convert("RGB")
        for width in WIDTHS[kind]:
            height = round(width * (ratio if ratio is not None else im.height / im.width))
            target = im.resize((width, height), Image.LANCZOS)
            for ext, kwargs in QUALITY.items():
                out = os.path.join(ROOT, "assets", "catalog", kind, f"{name}-{width}.{ext}")
                target.save(out, **kwargs); made += 1
    print(f"catalog art build: wrote {made} files from site-data masters")
    return 0


if __name__ == "__main__":
    sys.exit({"audit": audit, "build": build}[sys.argv[1] if len(sys.argv) > 1 else "audit"]())
