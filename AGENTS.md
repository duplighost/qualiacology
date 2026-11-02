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
# the site shell (title, meta; no link home on game pages): keep it, or re-shell the new one.
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

A game with its own source lives in `D:\Projects\<site folder>`, named exactly like its
folder here, and has a private GitHub repository `duplighost/<site folder>` (FETCH's is
public). Commit and push there after working on a game, then make the site copy as below.
Old copies and retired folders are in `D:\Archive`; never copy from there.

| site folder | how the site copy is made (run inside `D:\Projects\<site folder>`) |
|---|---|
| olly-olly | `node tools/build-site-copy.mjs`; never hand-edit the site copy |
| arc, thrown | `node build-site-copy.mjs`; never hand-edit the site copy |
| curfew | `node build-site-copy.mjs`; never hand-edit |
| winterline | `node tools/build-site-copy.mjs`; never hand-edit |
| iron-psalm | package source is in `source/`; `py -3 tools/build_website.py` rebuilds `publish/`, then `node build-site-copy.mjs` copies the runtime with the site shell |
| kickmoon | copy the `game/` runtime; keep the site's index.html shell |
| hearse | `node tools/build-site-copy.mjs`; never hand-edit the site copy |
| belfry | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy |
| skip | `node build-site-copy.mjs --site=<this repo>`; never hand-edit the site copy |
| tideglass | `node build-site-copy.mjs`; never hand-edit the site copy |
| fetch | copy the changed `src/` files; keep the site's index.html shell |
| vigil | none: the site copy here is the source. The older standalone folder is in `D:\Archive\Projects\vigil`; never copy it over the site copy |
| spooky | none: Alex's Halloween page, hand-made, not generated. It repeats the five games' lines from `site-data.json`: change both |
| strung | `node build-site-copy.mjs <this repo>`; never hand-edit the site copy |
| collateral | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy |
| sidechain (was last-chorus; `_redirects` sends that there) | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy. Its Android signing key never goes in a repository |
| tinbound | `node tools/build-site-copy.mjs <this repo>`; it copies the runtime, card and link-preview image. The offline single-file build stays separate. |
| black-lacquer | `node tools/build-site-copy.mjs <this repo>`; it copies the finished runtime, gameplay card and link-preview image. Never hand-edit the site copy. |
| in-every-direction | `node tools/build-site-copy.mjs <this repo>` (it writes the card too); never hand-edit the site copy |
| the-way-i-came | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy |
| threshold | `node tools/build-site-copy.mjs <this repo>` (it copies the link-preview image too); never hand-edit the site copy. Alex's Halloween game for his psychopharmacology Discord; not on the hub pages |
| pasta | `node tools/build-site-copy.mjs <this repo>`. One PASTA catalog card and six-game menu; three GPT Pro runtimes live in `pasta/games/`. Keep the original three local games at their existing routes and preserve their saves. Read the collection AGENTS.md for source versions. Alex requested the combined collection on 28 Oct, superseding earlier separation notes. |
| spaghetti-sunshine | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy. Included in PASTA; keep its direct route, without adding a separate card. |
| spaghetti | `node tools/build-site-copy.mjs <this repo>`; never hand-edit the site copy. Its original two-game opening remains available. PASTA opens its seven-level select directly. |
| al-dente | copy `src/` (and `vendor/` only if three.js changes) into `al-dente/`; keep the site's index.html shell (it self-hosts the fonts and three.js). Included in PASTA and still reachable from the original /spaghetti/ opening. |
| rally, rocket-shoes | plain copies; compare dates both ways before copying |
| starstruck | `node tools/build-site-copy.mjs --site=<this repo>` writes `starstruck/`; never hand-edit the site copy |
| sill | the page here (`sill/index.html`) is hand-written. The game is a Windows desktop app built in `D:\Projects\sill`; its download is `SILL-windows.zip` on this repo's GitHub release `sill-v1.0.0` |
| everything else | none: the site copy here is the only source |

## Access and machine notes

- GitHub `duplighost/qualiacology`; `gh` on this machine is logged in as duplighost.
  Each game's source also has its own private repository, `duplighost/<site folder>`.
  Netlify team "Alexander Guitar", project `classy-strudel-55444b`.
- CI (`.github/workflows/validate-site.yml`) rebuilds the hubs, validates, smoke-tests
  every route and rejects stale generated pages. It never deploys.
- PowerShell 5.1 has no `&&`; Git Bash does. Python is `py -3`.
