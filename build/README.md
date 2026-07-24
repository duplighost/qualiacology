# Qualiacology build tooling

Source generator for the shared Qualiacology **hub pages** — the homepage plus
the `/psychopharmacology/`, `/games/`, and `/music/` index pages. Everything
else (individual games, album pages, and legacy redirects) lives in the
repo root and is **not** generated here; the build only regenerates the four hub
pages, their fingerprinted `assets/hub/` CSS/JS, and `sitemap.xml`, writing them
into the repo root **in place**.

## Editing the site

Change copy/data in `src/content/site-data.json`, templates/logic in
`scripts/build-site.mjs`, or styles in `src/site.css` / `src/site.js`, then from
this `build/` folder:

```powershell
node scripts/build-site.mjs              # regenerate hub pages into the repo root
node scripts/validate-site.mjs --root=.. # assert structure/parity
```

Then commit and push `main`. The Netlify site is git-connected with
`publish = "."`, so pushing auto-deploys the repo root to qualiacology.com.

`build-site.mjs` uses only Node built-ins — no `npm install` needed to build.
`npm install` is only required for the optional QA tooling (`validate` uses
html-validate; `smoke` / `qa` use a static server + Playwright/Lighthouse).

## What this redesign changed (2026-07-17, from commit `cc10304`)

- Shorter unified homepage with equal psychopharmacology, browser-world, and music paths.
- Real `/psychopharmacology/`, `/games/`, and `/music/` indexes.
- One canonical catalog for 13 games and 9 releases.
- Original night-lab hero and 1200×630 social artwork.
- Self-hosted Inter and Space Grotesk; no Font Awesome on the hub pages.
- Responsive AVIF/WebP catalog art, accessible mobile dialog nav, opt-in audio, filters.
- All copy in the site author's own voice.
