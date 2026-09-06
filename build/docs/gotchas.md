# Gotchas that have burned agents before, and what is known-unfinished

Read this when something fails in a weird way, before deciding it's a bug —
and skim it once before your first big change to this repo.

## Deploy and repo

- **Never bypass the git flow with a manual production deploy.** The Netlify
  CLI is not logged in. Feature branch → PR preview → merge on approval.
- **Do not enable Netlify `pretty_urls`** while both `no-moon.html` and
  `no-moon/index.html` exist — Netlify collapses the two routes and creates a
  browser loop between `/no-moon/` and the legacy redirect stub. Keep the
  explicit `/no-moon` and `/no-moon.html` redirects pointed directly at
  `/no-moon/index.html`, and verify both URLs on the actual deploy preview.
- **Two agents/threads must never work this repo at the same time.** Before
  editing: `git status` + `git pull`. A dirty tree with changes you didn't
  make means another session is mid-flight — stop.
- **Catalog counts live in ONE file:** `build/src/content/expected.json`,
  read by every checker via `build/scripts/expected.mjs`. A count mismatch
  fails the build immediately and the error names the file to bump. If you
  find a hardcoded catalog count anywhere else, that's a regression — move
  it to the module.
- `404.html`, `_redirects`, `_headers` are hand-maintained and easy to
  forget — the build never touches them.
- **Image at the same filename ≠ updated for returning visitors** — the
  immutable-cache trap; full story and the `?v=` hash fix in `images.md`.

## Windows / tooling (Alex's machine)

- PowerShell 5.1: no `&&` chaining; quoted `git commit -m` strings get
  mangled — write the message to a file and `git commit -F <file>`, saved
  ASCII (`Set-Content -Encoding ascii`). `Out-File -Encoding utf8` adds a BOM
  that survives into the commit subject as an invisible character (commit
  `7d5472e` has one). Git Bash avoids all of this.
- Python is `py -3`. Headless browser testing: Playwright from
  `build/node_modules` with system Chrome (`channel: "chrome"`), not bundled
  Chromium.
- Commit identity: `user.name=duplighost`, `user.email=alexdguitar@gmail.com`.

## Performance

- **Canvas 2D: a path with thousands of subpaths falls off a cliff.**
  Batching many small shapes into one path and filling once is the usual
  advice and it is wrong past ~1000 subpaths — the rasteriser goes
  superlinear. In STARLING (since retired), 3,000 birds cost 45ms as one
  fill, 15ms in chunks of 1000, 2.2ms in chunks of 100 — identical geometry,
  and spreading the birds out doesn't change it. Fill in small batches. A
  sprite atlas with one `drawImage` per bird measured slower than plain
  batching.

## CSS traps

Covered in `design-system.md`, but the two that bite hardest: entrance
animations must stay transform-only (an opacity keyframe fails axe
colour-contrast below the fold), and `.alive-word` needs its padding/margin
pair or `background-clip: text` shaves the last glyph.

## What is NOT done (so nobody assumes it is)

The 2026-08-27 redesign finished its code side. What remains is art, and it
needs Alex — do not substitute your own.

- **Weak card art** (share of pixels indistinguishable from the page
  background, measured 2026-08-27): `pocket-sun` 93.8% (still shows the
  game's own HUD — the one card that reads as a dev-build screenshot),
  `still` 90.3%, `no-moon` 89.4%, `stay` 87.4% (its 480w AVIF is 1.2 KB
  against a 21.8 KB typical card), `marrow` 87.4%, `thrown` 86.7%, `wick`
  86.3%. `lead` is the least background-dead card (0.3%) and still among the
  least legible — its subject is ~4% of frame and the rope is a hairline at
  card size.
- **The `wick` card is a screenshot of its own title screen** (so was
  VESPERWAKE's, retired 2026-09-05) — painted/designed art, not in-engine, so it
  cannot be "re-rendered without the type". Replacing it with a gameplay capture
  is an art-direction change and Alex's call, not an agent's.
- All seven of those games DO render in headless Chrome with a real GPU
  (see `qa-gates.md`) and most expose debug hooks — `__LEAD`, `__VG`,
  `__WICK`, `__VW`, `__THREE__` — so in-engine recapture is technically
  possible. `pocket-sun` draws its HUD INTO the canvas, so screenshotting the
  canvas element does not exclude it; that one needs a flag inside the game.
- **No new site copy is pending.** Nothing in the redesign invented a word;
  the one stale clause (`/games/` intro naming controls) was deleted with
  Alex's explicit yes, not rewritten.

## Site copy vs Projects source

Most games here are a copy of, or generated from, a folder under
`C:\Users\Alex\Projects\<game>`. The two have diverged in both directions:
VIGIL's site copy (v0.4) is weeks newer than its Projects folder (v0.1)
because of direct-to-main commits, while other games' Projects folders are
ahead of the site. Before copying either way, compare dates and versions
(`git log -1 -- <game>/` here, and the project's own docs/STATUS.md), and
write down in that STATUS.md which copy won. Games with a generator script
(`build-site-copy.mjs`, `build.mjs --site`, `npm run site:sync`) must be
regenerated, never hand-edited on the site side.
