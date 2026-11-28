#!/usr/bin/env python3
"""Build and audit the responsive catalog art.

The one rule: every tier is derived from the image `site-data.json` points at for that
slug. Never from a filename glob. `fetch` is exactly why - its master is
`fetch-card-keyart-<hash>.webp`, not `fetch-card-clean.*`, so a glob over
`assets/games/*-card-clean.*` silently builds that slug's tiers from a DIFFERENT
picture, and only the largest tier is wrong, so it only shows up on big screens.

  python build/qa/catalog-art.py audit                      # compare every tier against its master
  python build/qa/catalog-art.py build                      # (re)generate every tier from its master
  python build/qa/catalog-art.py build --only=the-wake,sill # only these slugs (leaves the rest alone)

Three kinds of picture:
  games    16:9 card, `image` in site-data      -> assets/catalog/games/<slug>-{480,800,1200}
  albums   square cover, `image` in site-data   -> assets/catalog/albums/<slug>-{360,600,900}
  banners  3:1 wide art, `banner` in site-data  -> assets/banners/<slug>-wide-{800,1200,1600,2160}
           and a 4:3 cut of it for phones       -> assets/banners/<slug>-tall-{640,960}
           (`bannerTallFocus`, 0-100, says where across the wide picture the cut is taken)

Needs Pillow with AVIF support.
"""
import json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DATA = os.path.join(ROOT, "build", "src", "content", "site-data.json")
WIDTHS = {"games": [480, 800, 1200], "albums": [360, 600, 900]}
RATIO = {"games": 9 / 16, "albums": 1.0}
BANNER_WIDE = [800, 1200, 1600, 2160]
BANNER_TALL = [640, 960]
QUALITY = {"avif": dict(quality=52), "webp": dict(quality=76, method=6)}
BANNER_QUALITY = {"avif": dict(quality=58), "webp": dict(quality=80, method=6)}


def only():
    for arg in sys.argv[2:]:
        if arg.startswith("--only="):
            return set(arg[7:].split(","))
    return None


def entries():
    """Yield (kind, name, master, ratio)."""
    data = json.load(open(DATA, encoding="utf-8"))
    for kind, key in (("games", "games"), ("albums", "releases")):
        for item in data.get(key, data.get(kind, [])):
            master = os.path.join(ROOT, item["image"].lstrip("/"))
            if item["image"].endswith(".svg") or not os.path.exists(master):
                continue
            yield kind, item["slug"], master, RATIO[kind]


def banners():
    """Yield (slug, master, tall focus 0-100)."""
    data = json.load(open(DATA, encoding="utf-8"))
    for item in data["games"]:
        if item.get("banner"):
            yield item["slug"], os.path.join(ROOT, item["banner"].lstrip("/")), item.get("bannerTallFocus", 50)


def tall_cut(im, focus):
    """The 4:3 cut of a 3:1 banner, taken the way CSS object-position would take it."""
    width = round(im.height * 4 / 3)
    left = round((im.width - width) * focus / 100)
    return im.crop((left, 0, left + width, im.height))


def banner_targets(slug, master, focus):
    """Yield (path stem, picture) for every banner tier."""
    im = Image.open(master).convert("RGB")
    for width in BANNER_WIDE:
        yield f"{slug}-wide-{width}", im.resize((width, round(width / 3)), Image.LANCZOS)
    tall = tall_cut(im, focus)
    for width in BANNER_TALL:
        yield f"{slug}-tall-{width}", tall.resize((width, round(width * 3 / 4)), Image.LANCZOS)


def signature(source, n=16):
    im = source if isinstance(source, Image.Image) else Image.open(source)
    small = im.convert("L").resize((n, n), Image.LANCZOS)
    # Pillow 13 renamed getdata(); the old name goes away in 14.
    return list(getattr(small, "get_flattened_data", small.getdata)())


def differs(want, path):
    got = signature(path)
    return sum(abs(a - b) for a, b in zip(want, got)) / len(want)


def audit():
    failures = 0
    for kind, name, master, _ratio in entries():
        want = signature(master)
        for width in WIDTHS[kind]:
            for ext in ("avif", "webp"):
                out = os.path.join(ROOT, "assets", "catalog", kind, f"{name}-{width}.{ext}")
                if not os.path.exists(out):
                    print(f"MISSING  {kind}/{name}-{width}.{ext}"); failures += 1; continue
                diff = differs(want, out)
                if diff > 12:
                    print(f"MISMATCH {kind}/{name}-{width}.{ext} differs from {os.path.basename(master)} (mean {diff:.1f})")
                    failures += 1
    for slug, master, focus in banners():
        if not os.path.exists(master):
            print(f"MISSING  banner master for {slug}"); failures += 1; continue
        for stem, target in banner_targets(slug, master, focus):
            want = signature(target)
            for ext in ("avif", "webp"):
                out = os.path.join(ROOT, "assets", "banners", f"{stem}.{ext}")
                if not os.path.exists(out):
                    print(f"MISSING  banners/{stem}.{ext}"); failures += 1; continue
                diff = differs(want, out)
                if diff > 12:
                    print(f"MISMATCH banners/{stem}.{ext} differs from {os.path.basename(master)} (mean {diff:.1f})")
                    failures += 1
    print("catalog art audit: " + (f"{failures} problem(s)" if failures else "every tier matches its site-data master"))
    return 1 if failures else 0


def build():
    made = 0
    chosen = only()
    for kind, name, master, ratio in entries():
        if chosen is not None and name not in chosen:
            continue
        im = Image.open(master).convert("RGB")
        for width in WIDTHS[kind]:
            height = round(width * ratio)
            target = im.resize((width, height), Image.LANCZOS)
            for ext, kwargs in QUALITY.items():
                out = os.path.join(ROOT, "assets", "catalog", kind, f"{name}-{width}.{ext}")
                target.save(out, **kwargs); made += 1
    for slug, master, focus in banners():
        if chosen is not None and slug not in chosen:
            continue
        os.makedirs(os.path.join(ROOT, "assets", "banners"), exist_ok=True)
        for stem, target in banner_targets(slug, master, focus):
            for ext, kwargs in BANNER_QUALITY.items():
                target.save(os.path.join(ROOT, "assets", "banners", f"{stem}.{ext}"), **kwargs); made += 1
    print(f"catalog art build: wrote {made} files from site-data masters")
    return 0


if __name__ == "__main__":
    sys.exit({"audit": audit, "build": build}[sys.argv[1] if len(sys.argv) > 1 else "audit"]())
