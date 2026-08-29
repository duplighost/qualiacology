# Images — the art pipeline and its traps

Read this before touching ANY image: card art, catalog tiers, covers, hero
art, OG images.

## Specs

- Game card master: `assets/games/<slug>-card-clean.webp` (or .jpg) at
  1280×720. Responsive tiers:
  `assets/catalog/games/<slug>-{480,800,1200}.{avif,webp}`.
- Album cover master: `assets/albums/<slug>.jpg` at 900×900. Tiers:
  `assets/catalog/albums/<slug>-{360,600,900}.{avif,webp}`.
- Every game master is exactly 1280×720 and every album master 900×900, so
  the large tiers are real re-exports, never upscales. Target file sizes in
  line with existing cards (roughly 6–30 KB at 480w). SVG cards skip the
  catalog set.

## The two commands

```sh
python build/qa/catalog-art.py build     # regenerate all tiers from site-data masters
python build/qa/catalog-art.py audit     # perceptual check; REQUIRED after ANY art change
```

- **Derive every tier from the image `site-data.json` points at, never from a
  filename glob.** Not every master follows `<slug>-card-clean.*` — `fetch`
  uses `fetch-card-keyart-<hash>.webp` — so a glob silently builds that
  slug's tiers from a *different picture*. That shipped once: only the 1200w
  tier was wrong, so FETCH showed another game's art on large screens and
  nowhere else. The audit compares each tier against its master and is the
  ONLY gate that looks at pixels — build, validator, route smoke, and
  `npm run qa` all pass happily while a card shows another game's art.
- **`catalog-art.py build` re-encodes every tier on the site** (~120 dirty
  files even for one slug). Run it, then `git checkout --` the catalog paths
  you did not mean to change, THEN rebuild the hubs — the `?v=` hashes are
  content hashes of files on disk, so a rebuild BEFORE the revert bakes in
  hashes for files that no longer exist.

## The cache trap

**Replacing an image at the same filename does NOT reach returning visitors.**
`_headers` serves `/assets/**` with `max-age=31536000, immutable`, so a
browser that cached a card keeps showing the OLD picture — a mix of old and
new art that looks like a broken deploy. This has actually happened. The hub
build stamps catalog image URLs with a content hash (`versioned()` in
`build-site.mjs`, emitting `…webp?v=<hash>`), so changed art gets a new URL
automatically — just rebuild after swapping any image. Assets the build does
NOT emit (hero art, OG images, per-game assets) still need a manual version
suffix in the filename when replaced. Dropping only the `immutable` token
would not fix this; the year-long `max-age` alone prevents revalidation.

## Optional taller master for the homepage principal: `featuredImage`

Homepage slot 1's frame is square-to-portrait (see the principal-fill rule in
`design-system.md`), not 16/9. A game can ship a second cut for just that
slot:

```json
"featuredImage": { "src": "/assets/games/<slug>-featured-<hash>.webp",
                   "width": 1200, "height": 1500 }
```

It cannot simply replace `image`: that master is also the `/games/` shelf
card and that grid IS 16/9, so a portrait file there breaks the shelf. Tiers
land at `assets/catalog/games/<slug>-featured-{480,800,1200}.{avif,webp}` and
are the one set that keeps its master's own aspect ratio. `width`/`height`
are declared so the Node build never decodes an image; the audit checks the
declaration against the real file and fails on a mismatch. Entirely optional
— with no `featuredImage`, the principal crops the 16/9 master, which is what
every game does today. A composition with anything important near the left or
right edge needs one (the frame runs 0.72–1.12 and centre-crops the sides).
