# qualiacology.com

The repo root is the served site. Netlify deploys every push to `main` within about a
minute. There is no other deploy path and no branch protection. Rollback is redeploying
an earlier deploy in the Netlify UI.

## Three rules

1. **`main` is production.** Branch, PR, merge, open the live URL. Alex's "ship it" is
   merge approval: once he has said it, merge as soon as CI is green and run nothing else
   first. Without it, stop at the open PR.
2. **All copy is Alex's voice.** Reuse his lines; never invent taglines. Games other
   people made keep their own words.
3. **The hub pages are generated.** `index.html`, `games/`, `music/`,
   `psychopharmacology/` and `sitemap.xml` come from `build/`; never edit them directly.
   Everything else at root (game folders, `music/<slug>/`, `_redirects`, `_headers`,
   `404.html`) is static and hand-edited.

## Shipping a game change (the common case)

```sh
git status && git pull        # changes you did not make = another session mid-flight: stop
git checkout -b <game>-<what>
# Put the new files in <game>/ (see the table below). The site's own index.html carries
# the site shell (title, meta, home pill): keep it, or re-shell the new one.
node build/scripts/static-server.mjs --root=. --port=4173
#   open http://localhost:4173/<game>/ and see it boot. That is the whole check.
git add <game>/ && git commit -m "<GAME>: <what changed>"
git push -u origin <branch> && gh pr create --fill
# CI runs. On "ship it": gh pr merge --squash --delete-branch, then open
# https://qualiacology.com/<game>/?cb=<anything> and confirm it boots.
```

No preflight, no QA sweep, no new tests. `build/qa/` holds boot checks for a few games;
run one only if you changed how that game boots.

## Changing the hub

Catalog entries, hub copy, templates, `site.css`, `site.js`, images, adding or removing
a game or album:

```sh
node build/scripts/preflight.mjs   # build + validate + route smoke; add --art if you touched an image
```

then branch, PR, "ship it", merge, and check the changed routes live. Guides, read only
the one your task needs: `build/docs/quick-changes.md` (copy and catalog edits),
`add-game.md`, `remove-game.md`, `add-album.md`, `images.md` (any image),
`design-system.md` (site.css, site.js, templates), `gotchas.md`.

## Where each game's files come from

| site folder | source | how the site copy is made |
|---|---|---|
| arc, thrown | `Projects\arc`, `Projects\thrown` | `node build-site-copy.mjs` there; never hand-edit the site copy |
| curfew | `Projects\curfew` | `node build-site-copy.mjs` there; never hand-edit |
| winterline | `Projects\winterline` | `node tools/build-site-copy.mjs` there; never hand-edit |
| iron-psalm | `Projects\iron-psalm` | package source is in `source/`; `py -3 tools/build_website.py` rebuilds `publish/`, then `node build-site-copy.mjs` copies the runtime with the site shell |
| kickmoon | `Projects\kick-ball-moonkick` (not `kick-ball`) | copy the `game/` runtime; keep the site's index.html shell |
| pocket-sun | `Projects\pocket-sun` | `npm run build:site` then `npm run copy:site` there |
| spaceboarding | `Projects\spaceboarding` | copy `assets src styles.css vendor`; keep the site's index.html shell |
| fetch | `Projects\fetch` (GitHub duplighost/fetch) | copy the changed `src/` files; keep the site's index.html shell |
| vigil | this repo | the site copy is newer than `Projects\vigil`; never copy that folder over it |
| lead, rally, rocket-shoes, eaten-path, wick, galaxy-sandbox, the-last-room, secondhand-saint | a `Projects` folder of the same name | plain copies; compare dates both ways before copying |
| everything else | this repo | the site copy is the only source |

## Access and machine notes

- GitHub `duplighost/qualiacology`; `gh` on this machine is logged in as duplighost.
  Netlify team "Alexander Guitar", project `classy-strudel-55444b`.
- CI (`.github/workflows/validate-site.yml`) rebuilds the hubs, validates, smoke-tests
  every route and rejects stale generated pages. It never deploys.
- PowerShell 5.1 has no `&&`; Git Bash does. Python is `py -3`.
