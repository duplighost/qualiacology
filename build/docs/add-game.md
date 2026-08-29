# Adding a game — the full recipe

Read this only when adding a game to the site. Also read `images.md` (card
art pipeline) before step 3, and `design-system.md` only if you end up
touching site.css/site.js/templates.

1. **Game folder** at root, named after the slug. Runtime files only — no
   `serve.mjs`, tests, node_modules, dev references, or unused textures.

2. **Shell the game's `index.html`** so it belongs to the site:
   `<title>Game Name | Qualiacology</title>`, canonical + OG/Twitter meta
   (reuse the card image as `og:image`), the site favicon, and a home-link
   pill (`<a href="/">Qualiacology</a>`) styled to the game's palette with a
   z-index above the game's UI (hide it during pointer lock if the game uses
   it). Model: `behind-you/index.html` or `pasta-mortale/index.html`.

2b. **If the game came from somewhere else**, it will assume its old host.
   Everything on this site is self-contained and offline-capable, so before
   it ships:
   - Replace any external font/CDN link with a self-hosted copy in
     `assets/fonts/` plus its licence in `assets/fonts/licenses/` (BOON MOOTS
     pulled Anton off Google Fonts; it is now `assets/fonts/anton-latin.woff2`,
     OFL 1.1).
   - Replace host-only APIs with a browser fallback that cannot throw. BOON
     MOOTS saved through `window.storage`, which does not exist here, so
     progress vanished on refresh — it now falls back to namespaced
     `localStorage` inside try/catch (a private window throws on first write).
   - Run axe over the game itself — `npm run qa` only covers the four hub
     pages. Watch for unreachable keyboard scroll areas and
     `user-scalable=no` (zoom-blocking; removed from THROWN and BOON MOOTS
     for this reason).
   - Its text is the contributor's voice — do not edit it (iron rule 2).

3. **Card art** — full pipeline, specs, and traps in `images.md`. Short form:
   master `assets/games/<slug>-card-clean.webp` (or .jpg) at 1280×720, plus
   responsive tiers `assets/catalog/games/<slug>-{480,800,1200}.{avif,webp}`,
   generated with `python build/qa/catalog-art.py build` and checked with
   `... audit`. SVG cards skip the catalog set. Optional `featuredImage` for
   homepage slot 1 — see `images.md`.

4. **Catalog entry** in `build/src/content/site-data.json`: slug, title,
   descriptor, `group` (one of `action` / `horror` / `worlds`), summary
   (Alex's voice!), metaDescription, image, alt, controls, actionLabel,
   optional duration/secondary.
   - **`controls` is not rendered on the card** (2026-08-27, Alex's explicit
     yes). Keep supplying it — it is true data and game pages use it — but do
     not "fix" its absence from the shelf, and do not restore the `/games/`
     intro clause naming controls. `duration` DOES still render and is the
     only thing in `.card-meta`.
   - `featured: true` only by swapping — exactly 3 games are featured (grid
     is 3 columns; keep it a multiple of 3), and which ones is Alex's call.
     Featured order = games array order.

5. **Bump `build/src/content/expected.json`** — the ONE place catalog
   counts are declared (games/albums/featuredGames/featuredAlbums). Every
   checker reads it via `build/scripts/expected.mjs`; the horror-filter
   roster and "Showing N worlds." derive from `site-data.json`
   automatically, so a horror game needs no QA edit. Forget the bump and
   the build fails immediately with a message naming this file.

6. **Short links** in `_redirects` (e.g. `/dusk  /duskfall/  302`) — check
   for collisions first. Add a `_headers` block only if the game needs one.

7. **`404.html`** is hand-coded and name-drops specific games — update it if
   it references anything you removed.

8. Build → validate → serve locally
   (`node build/scripts/static-server.mjs --root=. --port=4173`) and confirm
   the game boots from the site and `/games/` shows the new card.

9. Ship per the router: feature branch, PR, deploy preview, Alex's approval,
   merge, then verify production (game route 200, card assets 200, `/games/`
   shows it).
