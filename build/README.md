# Qualiacology build tooling

Generates the hub pages (the homepage, `/games/`, `/arcade/`, `/music/`,
`/psychopharmacology/`), their fingerprinted `assets/hub/` CSS and JS, and `sitemap.xml`,
writing them into the repo root in place. It also dresses the hand-written pages (albums,
the pages of games you download, `404.html`) with the site's header, footer and
stylesheet, between their `<!-- site:… -->` markers. Games and redirects live at the repo
root and are not generated.

Edit copy and the catalog in `src/content/site-data.json`, templates in
`scripts/build-site.mjs`, styles and behaviour in `src/site.css` and `src/site.js`, then
from the repo root:

```sh
node build/scripts/preflight.mjs   # build + validate + route smoke (add --art after image changes)
```

`build-site.mjs`, `validate-site.mjs` and `route-smoke.mjs` need only Node built-ins.
`npm ci` here is needed only for the optional browser QA (`npm run qa`: Playwright and
axe over the four hub pages).

How to ship is in the repo's `AGENTS.md`; the task guides are in `docs/`.
