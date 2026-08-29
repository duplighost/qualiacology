# Quick changes — hub copy, catalog data, static pages, deploy verification

Read this if you are editing existing content: hub text, catalog entries,
a game's own files, redirects, or verifying a deploy. Adding or removing a
game/album has its own guide.

## Map of what's what

- **Generated (never edit directly):** `index.html`, `games/`, `music/`,
  `psychopharmacology/`, `sitemap.xml`. Sources live in `build/`:
  - `build/src/content/site-data.json` — ALL hub copy + the game/album
    catalog. Single source of truth. Hand-formatted: targeted text edits
    only, never load-and-redump with a JSON library, then confirm it still
    parses.
  - `build/scripts/build-site.mjs` — page templates. Also holds count asserts
    (games/albums/featured) that must match the data.
  - `build/src/site.css`, `build/src/site.js` — hub styles/behavior
    (fingerprinted into `assets/hub/` by the build). Touching these requires
    `design-system.md` first.
- **Static (edited directly, untouched by the build):** per-game folders at
  root (`no-moon/`, `rally/`, `fetch/`, …) and albums under `music/<slug>/`.
- **Hand-maintained (easy to forget):** `_redirects` (short links + guards),
  `_headers`, `404.html` (it name-drops specific games).
- `build/` itself is not served — `_redirects` 404s `/build/*`.

## The edit loop

```sh
# 1. Edit sources (site-data.json for copy/catalog, build-site.mjs for
#    templates, site.css|js for style/behavior).
node build/scripts/build-site.mjs                # 2. regenerate in place (Node built-ins only)
node build/scripts/validate-site.mjs --root=..   # 3. validate (counts, every href/src/srcset, exact case)
cd build && npm run qa                           # 4. optional deeper gate (first time: npm ci)
python build/qa/catalog-art.py audit             # 4b. REQUIRED if you touched any image
node build/scripts/static-server.mjs --root=. --port=4173   # 5. eyeball it locally
```

Then ship per the router checklist: branch, commit, push, PR, deploy preview,
Alex's approval, merge, verify production.

**Counts go stale — derive, don't trust.** Any baseline number you find in a
doc (N games, N routes) may be old. The build and
`build/scripts/route-smoke.mjs` print the real totals; correct any stale doc
number you find, in the same commit.

## Verifying a deploy

After the merge to `main` (the production trigger), confirm live with curl or
fetch: `https://qualiacology.com/` → 200 with expected content; every route
you changed → 200 or 404 as intended; new assets 200. Netlify state can be
checked via the Netlify MCP (`get-project`, currentDeploy → `ready`).

**Verify against the deploy preview, not only localhost** — two regressions in
the 2026-08 redesign were invisible locally and obvious on the preview.
