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

For nontrivial changes, commit to a feature branch, open a pull request, and
verify the Netlify Deploy Preview. Merge to `main` only after Alex explicitly
approves the production release. The Netlify site is git-connected with
`publish = "."`, so merging to `main` auto-deploys the repo root to
qualiacology.com.

`build-site.mjs`, `validate-site.mjs`, and `route-smoke.mjs` use only Node
built-ins, so no install is needed for build, static validation, or route
smoke. `npm ci` is required only for the optional browser QA, which uses
Playwright and Axe.

## What this redesign changed (2026-07-17, from commit `cc10304`)

- Shorter unified homepage with equal psychopharmacology, browser-world, and music paths.
- Real `/psychopharmacology/`, `/games/`, and `/music/` indexes.
- One canonical catalog, initially launched with 13 games and 9 releases.
- Original night-lab hero and 1200×630 social artwork.
- Self-hosted Inter and Space Grotesk; no Font Awesome on the hub pages.
- Responsive AVIF/WebP catalog art, accessible mobile dialog nav, opt-in audio, filters.
- All copy in the site author's own voice.

## Current verified baseline (2026-08-05)

- 35 locally hosted games and 10 music releases.
- Pocket Sun is hosted under `/pocket-sun/`; it no longer depends on a separate
  Netlify project.
- The four generated hub pages, fingerprinted hub assets, and `sitemap.xml`
  must remain byte-current with `src/content/site-data.json`.
- Pull requests run the read-only validation workflow in
  `.github/workflows/validate-site.yml`; that workflow never deploys or mutates
  another branch.
