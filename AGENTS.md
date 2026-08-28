# AGENTS.md — how to work on qualiacology.com

Read this before changing anything. It is the canonical playbook for AI agents
(Codex, Claude, or anything else) and it is kept current — trust it over your
own notes or memory. Last verified: 2026-08-27.

## The two rules that matter most

1. **`main` is production.** This repo is a git-connected Netlify site
   (project `classy-strudel-55444b`, publish directory `.`, no build step on
   Netlify). Any push to `main` auto-deploys to https://qualiacology.com within
   about a minute. GitHub does not currently enforce branch protection, so
   procedural care is the guardrail: use a feature branch + PR for every
   non-trivial change and inspect Netlify's deploy-preview URL. Do not push
   directly to `main` or merge a PR without Alex's explicit approval. Rollback
   = redeploy a previous deploy in the Netlify UI.

1b. **Games other people made keep their own voice.** BOON MOOTS was written
   and built by Milo as a present for Alex, and its text — the exhibits, the
   ranks, the wave subtitles, "a pocket moon for Alex · from Milo" — is Milo's,
   not Alex's. Do not edit it toward the house register, do not tidy the jokes,
   and do not drop the dedication. Rule 2 below governs the *catalog entry* on
   the hub, which is site copy and is Alex's; the game itself is a guest. The
   same goes for anything else contributed from outside: shell it, make it work
   on a static host, fix accessibility, leave the writing alone.

2. **Copy is Alex's voice — never invent it.** All site text is written by
   Alex: plain, dry, a little charged, occasionally profane. Never write
   marketing taglines or clipped ad-copy ("Small worlds with sharp teeth" got
   an agent in trouble once). When adding a game you may draft a summary in his
   register (short declarative sentences, no hype words), but reuse his
   existing lines wherever they exist, and when unsure, ask.

## Map of the repo

- **Repo root = the deployed site.** Don't leave scratch files here; anything
  committed at root is publicly served.
- `index.html`, `games/`, `music/`, `psychopharmacology/` — the 4 **generated**
  hub pages. Never edit these directly; they are overwritten by the build.
- `build/` — the generator (not served; `_redirects` 404s `/build/*`).
  - `build/src/content/site-data.json` — **all hub copy + the game/album
    catalog.** The single source of truth.
  - `build/scripts/build-site.mjs` — page templates. Also holds count asserts
    (games/albums/featured) that must match the data.
  - `build/src/site.css`, `build/src/site.js` — hub styles/behavior
    (fingerprinted into `assets/hub/` by the build).
  - `build/scripts/validate-site.mjs` — strict validator (counts, every
    href/src/srcset resolves with exact case).
  - `build/qa/browser-qa.mjs` — full Playwright + axe suite (`npm run qa`).
    Uses system Chrome by default; set `QA_CHROME_PATH=/path/to/chrome` to point
    it at an explicit binary on a box with no Chrome channel installed (a
    container, CI). Nothing else about the run changes.
  - `build/qa/starling-boot-check.mjs` — **run this before shipping any STARLING
    change.** Same doctrine as the FETCH check below and written for the same
    reason: it boots the page the way a player does and reads the canvas back
    rather than trusting counters. It asserts birds are on screen, that a
    swerve visibly lights the flock and then passes, and — the one that matters
    — that a stoop into an unwarned flock kills and the same stoop into a
    warned one does not. That last assert has already caught two real bugs: a
    build where every bird could see the falcon itself and a player who did
    nothing lost one bird in nine stoops, and a build where the flock had grown
    small enough that one wave covered all of it. Time anything in it off
    `falcon.t`, never the wall clock — the game runs on a clamped simulation
    delta, so on a slow machine wall-clock waits land somewhere else entirely
    in the dive. Usage: serve the repo, then
    `node build/qa/starling-boot-check.mjs http://localhost:4173/starling/`.
  - `build/qa/fetch-boot-check.mjs` — **run this before shipping any FETCH
    change.** Boots the game the way a player does (real title click, no
    `?test=1`) and asserts the world is on screen AND the skull is visible in
    the player's hands *while play is running*. FETCH 0.6.1 passed 74
    counter-based checks and shipped a game Alex could hear but not see,
    because every in-repo suite boots `?test=1` — which skips the shader
    warmup — and none of them ever looked at a pixel. Note the trap it is
    built around: with `preserveDrawingBuffer` false (the real renderer),
    reading the canvas outside the frame task is black by construction, which
    once "proved" a bug that did not exist. This samples inside `game.render`.
    Calibrated 2026-08-12 against known-good production (passes) and against
    the 0.6.1 tree at `90d9b16` (correctly fails: hand-region brightness 0).
    Usage: serve the repo, then
    `node build/qa/fetch-boot-check.mjs http://localhost:4173/fetch/`.
- Per-game folders at root (`no-moon/`, `rally/`, `pasta-mortale/`, `fetch/`, …)
  and albums under `music/<slug>/` — **static, edited directly**, never touched
  by the build.
- `_redirects` (short links + guards), `_headers`, `404.html` — **hand-
  maintained.** The build does NOT regenerate these. `sitemap.xml` IS
  regenerated by the build.
- `HANDOFF.md` — local, git-ignored session diary for Claude threads on Alex's
  machine. It is not on GitHub; do not rely on it existing.
- `.github/workflows/validate-site.yml` — read-only pull-request/main CI. It
  rebuilds the hubs, validates the public tree, runs strict route smoke, and
  rejects stale generated pages. It must never commit or push generated files.

Current verified baseline: **24 games, 12 music releases, 45 reachable public
routes + 35 asserted 404s.** Pocket Sun is hosted locally in this repository;
it is not a redirect to a separate Netlify project.

This baseline goes stale fast — it was still claiming 36 games when the real
count was 39. Re-derive it from `node build/scripts/build-site.mjs` rather than
trusting the number above, and correct it here when you find it wrong.

## Editing the hub pages (home / games / music / psych)

```sh
# 1. Edit sources: build/src/content/site-data.json (copy/catalog),
#    build/scripts/build-site.mjs (templates), build/src/site.css|js.
# 2. Regenerate in place (Node built-ins only, no install needed):
node build/scripts/build-site.mjs
# 3. Validate:
node build/scripts/validate-site.mjs --root=..
# 4. Optional deeper gate (first time: cd build && npm ci):
cd build && npm run qa        # Playwright + axe, needs Chrome
#    npm run qa also audits the audio LED lit, because it animates opacity and
#    the plain pass never turns it on.
# 4b. If you touched ANY image, also run the only pixel-level gate there is:
python build/qa/catalog-art.py audit
# 5. Ship safely: commit on a feature branch, push that branch, open a PR,
#    inspect the Netlify deploy preview, then merge only with Alex's approval.
#    Merging to main deploys production.
```

**site-data.json is hand-formatted.** Never load-and-redump it with a JSON
library — that reformats the whole file and bloats the diff. Make targeted
text edits only, then validate it still parses.

## The design system (read before touching site.css or site.js)

A five-stage redesign landed 2026-08-27 (PRs #109–#112). The stylesheet now
carries two laws in its opening comment. **Read those first — they are rules,
not notes**, and both were corrected in the same commits that changed them.

**1. The discipline budget.** One aura per view; resting wing alpha ≤ 8% (both
`--wing-dim` values sit at 0.06 and were deliberately NOT spent to the ceiling);
glow shadows only on the scroll filament, the lit nav pilot light, and the
playing audio LED. Hero art no longer glows — that glow was deleted and the
clause was updated to match. If you add a glow, you are spending from a fixed
budget; say so out loud.

**2. The motion law — three lanes.** These are independent composited
properties, so entrance, pointer and press can never write the same thing:

| lane | property | where |
|---|---|---|
| entrance | `translate` | scroll timelines only — `rise`, `settle` |
| pointer | `scale` | hover/focus, always inside `@media (hover: hover) and (prefers-reduced-motion: no-preference)` |
| press | `transform` | `:active`, 45ms attack |

Entrance animations are **transform-family only, never opacity**. An opacity
keyframe makes axe fail colour-contrast on below-fold content mid-animation.
That lesson cost a session once; do not re-learn it. The stylesheet also carries
an explicit not-doing list (no card tilt, parallax, magnetic buttons, cursor
follower, cursor torch, fixed scroll lamp, `will-change` on card images) — all
desktop-only, invisible in a stranger's first ten seconds, and untestable by a
suite that runs at 390px and 1440px with no hover emulation.

### Structures you will trip over if you don't know they exist

- **The plate rail.** Grids are NOT inside `.container`. Text keeps the 76rem
  measure; `<div class="plate-bleed">` gives pictures their own 100rem one, so a
  3-up card is 440px instead of 386px. Every catalog/shelf `<ul>` is a sibling of
  `.container`, not a child. Use `rem`/`%` only inside it — **never `100vw`**: the
  Windows scrollbar sits outside the viewport width and `browser-qa.mjs` asserts
  `pageWidth <= width + 1`.
- **The sticky filter rail lives in the plate rail too**, with the grid it
  filters. A `position: sticky` element only sticks inside its own parent's box —
  leaving it behind in `.container` (which now ends above the grid) silently kills
  the stick entirely. This shipped broken once.
- **The card index is a CSS counter**, not template output. `build-site.mjs`
  emits an empty `<span class="card-index">`; `counter-reset` is on the grid and
  `counter-increment` on each `<li>`. This is what makes a filtered shelf read
  01–05 instead of 01/09/15/16/17 — `[hidden] { display: none }` means a
  filtered-out item generates no box and cannot increment. Do not put numbers
  back in the template.
- **`data-here` on `<body>` is the room signal.** An IntersectionObserver in
  site.js (rootMargin `-45% 0px -45% 0px`) reports which homepage section you are
  in, and that drives both the scroll filament's colour and the nav pilot lights.
  It replaced fixed percentage keyframes that were 10–20% out of phase and never
  showed violet. **Do not go back to percentage stops** — they drift the moment
  section heights change. Note `.home-page` is a BODY class, so `data-here` must
  live on `<body>` too.
- **Seams are tokens.** `--seam-top` / `--seam-bot`, deliberately asymmetric, and
  they double as the chapter numeral's height budget: `.ghost-index` is sized off
  them, which is what makes it arithmetically impossible for the numeral to reach
  the heading at any width. It used to strike through the `/psychopharmacology/`
  h1 by 122px.
- **Two type registers, not one.** *Locator* (uppercase, tracked): eyebrows, nav,
  kickers, filter buttons, stat labels. *Data* (sentence case, untracked):
  `.card-meta li`, `.footer-links a`. The data register exists because Alex's
  source strings are already cased on purpose — `WASD`, `LMB`, `RMB`, `Esc`,
  `TikTok` — and `text-transform: uppercase` was flattening that signal. Do not
  uppercase them again.
- **Card art rests resolved.** The old `filter: saturate(0.55) brightness(0.92)`
  is gone. Cards sit on `--surface` (lighter than the page) with a `--rule-lit`
  top edge, so dark art reads as an object on a shelf rather than a hole. The
  hover "develop" is a 3% `scale`, in the pointer lane.
- **Card action buttons sit at their natural width** and are outlined on the
  `/games/` shelf; the homepage featured three keep filled slabs on purpose. Row
  slack collects above the action (`margin-top: auto` on `.card-actions`, NOT on
  `.card-meta`) so every button in a row shares a baseline while metadata stays
  welded to the summary it describes. Alex rejected the ragged-baseline
  alternative on sight.

### Things that are load-bearing and look optional

- `heroPicture()`'s `<source media="(max-width: 44.99rem)">` phone crop and the
  CSS `aspect-ratio` switch **must use the same breakpoint**. If they disagree
  there is a band of widths where the CSS box and the downloaded image have
  different ratios.
- `.scroll-progress` has a base `transform: scaleX(0)` for the JS fallback. The
  `@supports (animation-timeline: scroll(root))` block that drives it from a
  scroll timeline sets `transform: none` **and must come after the base rule** —
  same specificity, so source order decides. Get either wrong and the filament is
  zero-width forever. The JS write is guarded by
  `CSS.supports("animation-timeline", "scroll(root)")` so both never run at once.
- Filtering: `applyFilter` captures the reader's scroll on **pointerdown**, before
  the browser's own focus-scroll fires. Clicking a filter focuses it, and because
  the rail is sticky the browser scrolls to the button's *layout* position —
  hundreds of pixels away. That, not the document collapsing, is what threw
  readers up the page. Keyboard focus deliberately still scrolls.
- An `<a>` wrapping `<dt>` + `<dd>` is **invalid** inside a `<dl>` — axe fails it
  on `definition-list` + `dlitem`. The hero's three "doors" put the anchor inside
  the `<dd>` with a stretched `::after`. Keep it that way.

### Measuring anything in a browser

`locator.click()` in Playwright runs `scrollIntoViewIfNeeded` **before** it
clicks, so any measurement of scroll position, jump, or camera behaviour is
measuring the harness. Use `page.mouse.click(x, y)` at the element's real
coordinates. A wrong number from this shipped in a written plan once. Related:
a `position: sticky` element's rect is constant while stuck, so a before/after
delta on one is always 0 — never use it as a scroll anchor.

**And verify against the deploy preview, not only localhost.** Two regressions
in this redesign were invisible locally and obvious on the preview.

## Adding a game (the full recipe)

1. **Game folder** at root, named after the slug. Runtime files only — no
   `serve.mjs`, tests, node_modules, dev references, or unused textures.
2. **Shell the game's `index.html`** so it belongs to the site:
   `<title>Game Name | Qualiacology</title>`, canonical + OG/Twitter meta
   (reuse the card image as `og:image`), the site favicon, and a home-link
   pill (`<a href="/">Qualiacology</a>`) styled to the game's palette with a
   z-index above the game's UI (hide it during pointer lock if the game uses
   it). Model: `behind-you/index.html` or `pasta-mortale/index.html`.
2b. **If the game came from somewhere else**, it will assume its old host.
   Everything on this site is self-contained and offline-capable, so before it
   ships: replace any external font/CDN link with a self-hosted copy in
   `assets/fonts/` plus its licence in `assets/fonts/licenses/` (BOON MOOTS
   pulled Anton off Google Fonts; it is now `assets/fonts/anton-latin.woff2`,
   OFL 1.1); replace host-only APIs with a browser fallback that cannot throw
   (BOON MOOTS saved through `window.storage`, which does not exist here, so
   the best score and every unlocked exhibit vanished on refresh — it now falls
   back to namespaced `localStorage` inside try/catch, because a private window
   throws on the first write); and run axe over it, since `npm run qa` only
   covers the four hub pages and never looks at a game. BOON MOOTS arrived with
   a scrollable Evidence list no keyboard could reach and `user-scalable=no`,
   which is the same zoom-blocking THROWN already removed for the same reason.

3. **Card art**: `assets/games/<slug>-card-clean.webp` (or .jpg) at 1280×720,
   plus responsive `assets/catalog/games/<slug>-{480,800,1200}.{avif,webp}`
   (albums: `assets/catalog/albums/<slug>-{360,600,900}.{avif,webp}`). The 1200/900
   tier was added 2026-08-27 when cards grew to 440px — every game master is exactly
   1280×720 and every album master 900×900, so those are real re-exports, never
   upscales. Target file sizes in line with existing cards (roughly 6–30 KB at 480w).
   SVG cards skip the catalog set.

   **Derive every tier from the image `site-data.json` points at, never from a
   filename glob.** Not every master follows `<slug>-card-clean.*` — `fetch` uses
   `fetch-card-keyart-<hash>.webp` — so a glob over `assets/games/*-card-clean.*`
   silently builds that slug's tiers from a *different picture*. That shipped once:
   only the 1200w tier was wrong, so FETCH showed another game's art on large screens
   and nowhere else. Build and check with:

   ```
   python build/qa/catalog-art.py build     # regenerate all tiers from site-data masters
   python build/qa/catalog-art.py audit     # perceptual check; run after ANY art change
   ```

   The audit compares each tier against its master and is the only thing that catches
   a wrong-picture mismatch — no other gate looks at pixels.
4. **Catalog entry** in `build/src/content/site-data.json`: slug, title,
   descriptor, `group` (one of `action` / `horror` / `worlds`), summary
   (Alex's voice!), metaDescription, image, alt, controls, actionLabel,
   optional duration/secondary. `featured: true` only by swapping — exactly 3
   games are featured (grid is 3 columns, so keep it a multiple of 3), and
   which ones is Alex's call. Featured order = games array order. Albums are
   still exactly 3 featured. The featured row was 6 until 2026-08-21, when Alex
   cut the homepage to FETCH / No Moon / MOONKICK (renamed KICKMOON later
  that same day); the three that came off
   (Duskfall, Rocket Shoes, PARTY ANIMAL) stayed on `/games/`.
5. **Bump the count asserts** in `build/scripts/build-site.mjs`,
   `build/scripts/validate-site.mjs`, AND `build/qa/browser-qa.mjs` (all three
   hardcode the canonical game total). `browser-qa.mjs` also hardcodes the
   **horror-filter roster** — the exact slug list and "Showing N worlds." — so
   any horror game added or removed needs that expectation updated too, or
   `npm run qa` fails on the filter interaction long after the counts agree.
   Changing how many games are **featured** hits a fourth spot the other three
   don't cover: `validate-site.mjs` asserts the game total near the top *and*
   re-counts `data-catalog-game=` in the rendered homepage further down
   ("Homepage must feature three games" — the message said *six* until the
   2026-08-21 cut and the assert is the thing to read, not the wording). The
   build passes and validation fails
   several steps later, which reads like a build bug — it isn't.
6. **Short links** in `_redirects` (e.g. `/dusk  /duskfall/  302`) — check for
   collisions first. Add a `_headers` block only if the game needs one.
7. **`404.html`** is hand-coded and name-drops specific games — update it if
   it references anything you removed.
8. Build → validate → serve locally
   (`node build/scripts/static-server.mjs --root=. --port=4173`) and confirm
   the game boots from the site and the games page shows the new card.
9. Commit to a feature branch, push it, inspect the PR's Netlify deploy preview,
   and merge only with Alex's explicit approval. Then verify production: game
   route 200, card assets 200, `/games/` shows it, removed things 404.

**Removing a game** is the inverse checklist: game dir, `assets/games/` card,
`assets/catalog/games/` set, any OG image, `_redirects` entries, `_headers`
block, `404.html` mentions, orphaned `assets/` files referencing it, catalog
entry, count asserts, then rebuild + validate. Grep the slug until it's zero.

Two traps the first pass always misses. **Vanity short links outlive the game
they pointed at** — `/vesper` was a 302 to `/vesperbane/`; deleting the game
without deciding what happens to the short link leaves a dead route. Repoint it
or delete it deliberately. And **add the dead routes to `retiredRoutes` in
`build/scripts/route-smoke.mjs`**, which asserts them 404 alongside the retired
book. That is what stops a later restore or a stray file from quietly putting a
removed game back on the shelf; its 404 count is derived from that list, so it
never needs bumping.

## Adding an album (Doopliss release)

Same shape as adding a game, with these differences:

1. **Cover art**: `/assets/albums/<slug>.jpg` at **900×900**, plus the responsive
   square set `/assets/catalog/albums/<slug>-{360,600}.{avif,webp}`. Source is
   usually the Suno playlist cover — it's the page's `og:image` (fetch the file
   directly; the declared `og:image:width` may lie, e.g. says 256 when the file
   is 1600). `py -3` + Pillow generates all five (AVIF supported).
2. **Catalog entry** in `site-data.json` `albums`: slug, title, `featured`,
   image, alt (`"<Title> album cover"`), summary, tags, tracks (or `null`),
   `listen` (Suno), optional `youtube`. Keep copy in Alex's voice — his YouTube
   upload's description (the `shortDescription` in the watch-page HTML) usually
   has his own blurb + a timestamped tracklist to reuse verbatim.
3. **Detail page** `music/<slug>/index.html` — copy `music/summer-people/` and
   swap content. The per-track `<em>` one-liners are Alex's voice; if you don't
   have his, list titles only, don't invent them.
4. **Bump the album-count asserts** in THREE files: `build-site.mjs`,
   `validate-site.mjs`, AND `build/qa/browser-qa.mjs` (the QA one hardcodes
   `bodyAlbumCount === "N"` and is easy to forget — it'll fail `npm run qa`).
5. Albums have **no per-album short-links** (only `/records → /music/`) — don't
   invent one. No `404.html` change needed (it names games, not albums).
6. **Featured order = albums array order.** The homepage shows the 3 featured
   albums in the order they appear in the array. To put a new release in the
   left/first featured slot, MOVE its entry to the top of the array (flagging
   `featured:true` alone puts it last). Keep exactly 3 featured — un-feature one
   to compensate; an un-featured album stays on `/music/`, it just leaves the
   homepage.
7. **No Suno link is normal** — several releases (`bite-marks-and-bubblegum`,
   `death-threats-and-makeup-sex`, `cherry-lipstick`,
   `i-miss-the-summer-people`) put the YouTube URL straight in `listen` and
   omit the `youtube` key entirely. Do not invent a Suno playlist to fill the
   slot; one link is the whole contract.
8. `build/scripts/route-smoke.mjs` derives album routes from `site-data.json`
   automatically — a new album needs no edit there, but its reachable-route
   total goes up by one, so re-read the number it prints rather than assuming.

## Verifying a deploy

```sh
# After local validation and deploy-preview approval, merge the feature PR.
# The resulting update to main is the production deploy trigger.
# Then confirm live (curl or fetch):
#   https://qualiacology.com/            → 200, expected content
#   the routes you changed               → 200 / 404 as intended
```

Netlify state can be checked via the Netlify MCP (`get-project`,
currentDeploy → `ready`) if available.

## Gotchas that have burned agents before

- **Do NOT bypass the Git-connected workflow with a manual production deploy.**
  The Netlify CLI is not logged in. Push a feature branch, inspect the PR
  preview, and merge to `main` only after approval.
- **Do not enable Netlify `pretty_urls` while both `no-moon.html` and
  `no-moon/index.html` exist.** Netlify collapses the two routes and creates a
  browser loop between `/no-moon/` and the legacy redirect stub. Keep the
  explicit `/no-moon` and `/no-moon.html` redirects pointed directly at
  `/no-moon/index.html`, then verify both legacy and canonical URLs on the
  actual Deploy Preview.
- Two agents/threads must never work this repo at the same time. Before
  editing: `git status` + `git pull`. If the tree is dirty with changes you
  didn't make, stop — another session is mid-flight.
- The hub build asserts exact counts; adding/removing catalog items without
  bumping the asserts fails the build (deliberately).
- **Nothing in the Node gates looks at pixels.** The build, the validator, the
  route smoke and `npm run qa` all pass happily while a card shows *another
  game's art*. That shipped: the 1200w tier was generated by globbing
  `assets/games/*-card-clean.*`, and `fetch` is the one game whose master is
  named differently (`fetch-card-keyart-<hash>.webp`), so FETCH showed a
  different picture on 2x screens and nowhere else. After ANY art change run
  `python build/qa/catalog-art.py audit` — it is the only thing that can catch
  this.
- `404.html`, `_redirects`, `_headers` are easy to forget — they're manual.
- **Replacing an image at the same filename does NOT reach returning visitors.**
  `_headers` serves `/assets/**` with `max-age=31536000, immutable`, so a browser
  that already cached a card keeps showing the OLD picture — you get a mix of old
  and new art that looks like a broken deploy. This has actually happened. The hub
  build now stamps catalog image URLs with a content hash (`versioned()` in
  `build-site.mjs`, emitting `…webp?v=<hash>`), so changed art gets a new URL
  automatically — just rebuild after swapping any image. Assets the build does NOT
  emit (hero art, OG images, per-game assets) still need a manual version suffix in
  the filename when replaced. Dropping only the `immutable` token would not fix
  this; the year-long `max-age` alone already prevents revalidation.
- **Canvas 2D: a path with thousands of subpaths falls off a cliff.** Batching
  many small shapes into one path and filling once is the usual advice and it is
  wrong past about a thousand subpaths — the rasteriser goes superlinear. In
  STARLING, 3,000 birds cost 45ms as one fill, 15ms in chunks of 1000, and
  2.2ms in chunks of 100: a 20x difference for identical geometry. It is not
  about how dense the shapes are on screen (the same birds spread evenly over
  the canvas cost the same 45ms) and it is not fixed by drawing fewer of them.
  Fill in small batches. A sprite atlas with one `drawImage` per bird was
  measured too and came out slower than plain batching.
- Scroll-reveal/entrance animations in `build/src/site.css` must stay
  **transform-only** (no opacity keyframes) or axe fails color-contrast on
  below-fold content mid-animation.
- `.alive-word` on the homepage hero needs its padding/margin pair —
  `background-clip: text` + negative letter-spacing shaves the last glyph
  without it.
- On Alex's Windows machine (PowerShell 5.1): no `&&` chaining, and quoted
  strings in `git commit -m` get mangled — write the message to a file and use
  `git commit -F <file>`. Write that file with `Set-Content -Encoding ascii`
  (or your editor tool), **not** `Out-File -Encoding utf8`: in 5.1 that adds a
  BOM, and `git commit -F` keeps it, so the BOM ends up as an invisible
  character at the head of the commit subject line. Commit `7d5472e` has one. Python is `py -3`. Headless browser testing: use
  Playwright from `build/node_modules` with system Chrome
  (`channel: "chrome"`), not bundled Chromium.
- Commit identity: `user.name=duplighost`, `user.email=alexdguitar@gmail.com`.

## Access

- GitHub: `duplighost/qualiacology` (public), branch `main`. On Alex's
  machine the `gh` CLI is authed as `duplighost`.
- Netlify: team "Alexander Guitar", project `classy-strudel-55444b`,
  site_id `85511573-c8bc-48fb-b23e-c9a5d2eff8f6`, domain qualiacology.com.

## What is NOT done (so nobody assumes it is)

The 2026-08-27 redesign finished its code side. What remains is art, and it
needs Alex — do not substitute your own.

- **Weak card art.** Measured share of pixels indistinguishable from the page
  background: `pocket-sun` 93.8% (and it still has the game's own HUD in frame —
  it is the only card that reads as a screenshot of a dev build), `still` 90.3%,
  `no-moon` 89.4%, `stay` 87.4% (its 480w AVIF is 1.2 KB against a 21.8 KB
  typical card), `marrow` 87.4%, `thrown` 86.7%, `wick` 86.3%. `lead` is the
  least background-dead card on the site (0.3%) and still among the least
  legible, because its subject is ~4% of frame and the rope — the whole game —
  is a hairline at card size.
- **`wick` and `vesperwake` cards are screenshots of their own title screens**,
  which is why they carry baked-in typography and print each game's title twice
  (once in the picture, once as `.card-title`). Surveyed 2026-08-27: both are
  painted/designed art, not in-engine, so they cannot be "re-rendered without the
  type". Replacing them with gameplay captures is a real art-direction change and
  is Alex's call, not an agent's.
- All seven of those games DO render in headless Chrome with a real GPU
  (`{ channel: "chrome", args: ["--use-angle=d3d11"] }`) and most expose debug
  hooks — `__LEAD`, `__VG`, `__WICK`, `__VW`, `__THREE__` — so in-engine
  recapture is technically possible. Note `pocket-sun` draws its HUD **into the
  canvas**, so screenshotting the canvas element does not exclude it; that one
  needs a flag inside the game.
- **No new site copy is pending.** Nothing in the redesign invented a word, and
  the one clause that went stale (`/games/` intro naming controls) was deleted
  with Alex's explicit yes, not rewritten.

## Keep this file true

If you change the workflow (new asset contract, new script, moved files),
update this file in the same commit. Future agents trust it blindly — stale
instructions here are worse than none.
