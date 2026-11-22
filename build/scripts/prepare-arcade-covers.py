#!/usr/bin/env python3
"""Prepare the arcade's reviewed images and exact-title artwork.

This does not capture gameplay or infer that a game works. Source images must
have an explicit, visually reviewed family assignment. Private provenance is
read locally and is never copied into the public override manifest.

Example:
  python build/scripts/prepare-arcade-covers.py \
    --catalog /path/to/arcade_catalog.json \
    --mapping /path/to/recovered_covers/mapping.json \
    --qa-dir /path/to/arcade_qa \
    --qa-reviews /path/to/recovered_covers/qa_cover_reviews.private.json \
    --manifest /path/to/arcade_cover_overrides.json

Only Pillow is required. Output images are 800 x 450 WebP, preserving the whole
source image without cropping. Missing screenshots receive deterministic SVG
title graphics, clearly identified as title artwork in both image and metadata.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
from collections import Counter
from pathlib import Path

from PIL import Image, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
TITLE_CAPTION = "Title artwork · gameplay screenshot not yet captured"
PALETTE = [
    ("#ef7c57", "#241b21"), ("#d8ae67", "#252126"),
    ("#77bcb5", "#18262c"), ("#a696d6", "#231e30"),
    ("#d99cb4", "#29202a"), ("#9cbd83", "#202921"),
    ("#7ba9cf", "#1c2432"), ("#d6cb85", "#29271f"),
    ("#c69aca", "#292133"), ("#b0c7c6", "#1e282c"),
    ("#da9d80", "#2b211e"), ("#84baa0", "#1c2926"),
]


def read_json(path: Path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def font(size: int):
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def title_lines(title: str):
    for size in (62, 58, 54, 50, 46, 42, 38):
        face = font(size)
        lines, current = [], ""
        for word in title.split():
            test = f"{current} {word}".strip()
            if current and face.getlength(test) > 654:
                lines.append(current)
                current = word
            else:
                current = test
        if current:
            lines.append(current)
        if len(lines) <= 4:
            return size, lines, face
    return size, lines, face


def title_svg(game: dict) -> bytes:
    title = game["title"]
    seed = hashlib.sha256(game["id"].encode()).digest()
    accent, background = PALETTE[seed[0] % len(PALETTE)]
    style = seed[1] % 4
    size, lines, face = title_lines(title)
    line_height = size * 1.11
    start_y = 118 + (210 - len(lines) * line_height) / 2 + size
    texts = []
    for i, line in enumerate(lines):
        width = min(654, round(face.getlength(line), 1))
        texts.append(
            f'<text x="62" y="{start_y+i*line_height:.1f}" '
            f'font-size="{size}" textLength="{width}" '
            f'lengthAdjust="spacingAndGlyphs">{html.escape(line)}</text>'
        )
    if style == 0:
        motif = '<path d="M584 95h118v118M618 95v118M584 129h118"/>'
    elif style == 1:
        motif = '<circle cx="670" cy="139" r="62"/><circle cx="670" cy="139" r="42"/>'
    elif style == 2:
        motif = '<path d="M576 183l95-95 57 57-95 95zM600 206l95-95"/>'
    else:
        motif = '<path d="M611 85v105m-52-52h105M695 206h34m-17-17v34"/>'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)} — title artwork</title>
<desc id="desc">{TITLE_CAPTION}</desc>
<rect width="800" height="450" fill="{background}"/>
<rect x="24" y="24" width="752" height="402" rx="15" fill="none" stroke="{accent}" stroke-opacity=".45"/>
<path d="M24 92h752M24 360h752" stroke="{accent}" stroke-opacity=".3" stroke-dasharray="3 7"/>
<circle cx="24" cy="92" r="7" fill="{background}"/><circle cx="776" cy="92" r="7" fill="{background}"/>
<circle cx="24" cy="360" r="7" fill="{background}"/><circle cx="776" cy="360" r="7" fill="{background}"/>
<g fill="none" stroke="{accent}" stroke-width="2" opacity=".13">{motif}</g>
<g font-family="Arial, Helvetica, sans-serif" fill="{accent}" font-size="13" font-weight="700" letter-spacing="3">
<text x="62" y="65">QUALIACOLOGY / ARCADE</text>
<text x="62" y="392" font-size="12" letter-spacing="2">TITLE ARTWORK</text>
</g>
<g fill="#f3eee6" font-family="Arial, Helvetica, sans-serif" font-weight="800">{''.join(texts)}</g>
<text x="62" y="414" font-family="Arial, Helvetica, sans-serif" fill="#c2bcb7" font-size="11">Gameplay screenshot not yet captured</text>
<g transform="translate(694 58)" stroke="{accent}" stroke-width="2" fill="none" opacity=".8"><path d="M-9 0h18M0-9v18"/><circle cx="35" cy="-5" r="3"/><circle cx="43" cy="5" r="3"/></g>
</svg>'''
    return svg.encode("utf-8")


def webp_image(source: Path) -> bytes:
    with Image.open(source) as opened:
        im = ImageOps.exif_transpose(opened).convert("RGBA")
        # Contain, rather than crop: portrait game controls and title text stay visible.
        im.thumbnail((800, 450), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (800, 450), "#171820")
        canvas.alpha_composite(im, ((800-im.width)//2, (450-im.height)//2))
        result = io.BytesIO()
        canvas.convert("RGB").save(result, format="WEBP", quality=84, method=6)
        return result.getvalue()


def collect_sources(mapping: dict, qa_dir: Path | None, qa_reviews: Path | None):
    sources = {}
    for row in mapping.get("recommended", []):
        if not (row.get("familyId") and row.get("visualReviewed") and row.get("suitableForCover")):
            continue
        path = Path(row["localPath"])
        if not path.is_file():
            raise FileNotFoundError(f"Reviewed cover is missing: {path}")
        kind = "art" if row.get("imageType") in {"existing-cover-art", "existing-game-art"} else "screenshot"
        sources[row["familyId"]] = {
            "path": path, "kind": kind,
            "caption": row.get("caption", "Saved game screen"),
            "imageType": row.get("imageType", "saved-game-screen"),
            "source": "reviewed-existing-image", "priority": row.get("coverPriority", 80),
        }
    if qa_dir:
        index = read_json(qa_dir / "cover-index.json", [])
        external_reviews = read_json(qa_dir / "review.json", {})
        own_reviews = read_json(qa_reviews, {}) if qa_reviews else {}
        for row in index:
            fid, path = row["familyId"], Path(row["cover"])
            if not path.is_file():
                continue
            own = own_reviews.get(fid, {})
            external = external_reviews.get(fid, {})
            # A false review is a real visual rejection, not a failed loading heuristic.
            if external.get("approved") is False:
                continue
            own_matches = own.get("sourceFileSha256") == digest(path.read_bytes())
            if own_matches and own.get("approved") is False:
                continue
            approved = external.get("approved") is True or (own_matches and own.get("approved") is True)
            if not approved:
                continue
            # A prior gameplay scene can be stronger than a newly captured title menu.
            # Reviewed QA captures replace title artwork or generic historical screens.
            priority = own.get("priority", 82) if own_matches else 82
            if sources.get(fid, {}).get("priority", 0) > priority:
                continue
            sources[fid] = {"path": path, "kind": "screenshot", "caption": "Captured game screen · 22 Nov 2026", "imageType": "captured-game-screen", "source": "reviewed-current-capture", "priority": priority}
    return sources


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--mapping", type=Path, required=True)
    parser.add_argument("--qa-dir", type=Path)
    parser.add_argument("--qa-reviews", type=Path)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "assets/arcade/covers")
    parser.add_argument("--url-prefix", default="/assets/arcade/covers")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--cache", type=Path, help="Optional local encoding cache (hashes only; no source paths)")
    args = parser.parse_args()
    catalog = read_json(args.catalog)
    games = catalog["games"] if isinstance(catalog, dict) else catalog
    if len({g["id"] for g in games}) != len(games):
        raise ValueError("Family IDs must be unique before cover import")
    mapping = read_json(args.mapping)
    sources = collect_sources(mapping, args.qa_dir, args.qa_reviews)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    cache = read_json(args.cache, {}) if args.cache else {}
    families, output_paths, prepared = {}, set(), {}
    for game in games:
        fid, title = game["id"], game["title"]
        source = sources.get(fid)
        if source:
            cache_key = digest(b"arcade-webp-contain-800x450-q84-v1\0" + source["path"].read_bytes())
            if cache_key not in prepared:
                cached_path = args.output_dir / cache.get(cache_key, "missing")
                cached_data = cached_path.read_bytes() if cached_path.is_file() else b""
                if cached_data and digest(cached_data)[:24] == cached_path.stem:
                    prepared[cache_key] = cached_data
                else:
                    prepared[cache_key] = webp_image(source["path"])
            content, extension = prepared[cache_key], "webp"
            image_kind, caption = source["kind"], source["caption"]
            provenance_type = source["source"]
        else:
            content, extension = title_svg(game), "svg"
            image_kind, caption = "title", TITLE_CAPTION
            provenance_type = "exact-title-graphic"
        filename = f"{digest(content)[:24]}.{extension}"
        if source:
            cache[cache_key] = filename
        path = args.output_dir / filename
        if not path.exists() or path.read_bytes() != content:
            path.write_bytes(content)
        output_paths.add(path.resolve())
        families[fid] = {
            "imageUrl": f"{args.url_prefix.rstrip('/')}/{filename}",
            "imageKind": image_kind,
            "imageCaption": caption,
            "imageAlt": f"{title} — {'title artwork' if image_kind == 'title' else 'cover art' if image_kind == 'art' else 'game screen'}",
            "imageWidth": 800, "imageHeight": 450,
            "imageSourceKind": provenance_type,
        }
    # Only this script's content-addressed artifacts are eligible for cleanup.
    # Existing files are retained so an earlier deployed catalog cannot lose its image.
    counts = dict(Counter(v["imageKind"] for v in families.values()))
    summary = {"families": len(families), "counts": counts, "uniqueFiles": len(output_paths), "totalBytes": sum(p.stat().st_size for p in output_paths)}
    manifest = {"schemaVersion": 1, "summary": summary, "families": families}
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if args.cache:
        args.cache.parent.mkdir(parents=True, exist_ok=True)
        args.cache.write_text(json.dumps(cache, sort_keys=True)+"\n", encoding="utf-8")
    print(json.dumps(summary, sort_keys=True))


if __name__ == "__main__":
    main()
