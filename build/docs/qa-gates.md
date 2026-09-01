# QA gates, boot checks, and measuring in a browser

Read this when running or writing tests, or measuring anything in a browser.

## The gates, in order of depth

- `node build/scripts/validate-site.mjs --root=..` — strict validator:
  counts, every href/src/srcset resolves with exact case, and it walks EVERY
  .html under root (hand-authored pages need a `<meta name="description">`
  ending in `.`/`!`/`?`).
- `node build/scripts/route-smoke.mjs` — reachable routes + asserted 404s.
  Album routes derive from `site-data.json`; retired routes live in its
  `retiredRoutes` list. Re-read the totals it prints; never trust a number
  from a doc.
- `cd build && npm run qa` — full Playwright + axe suite (first time:
  `npm ci`). Uses system Chrome by default; set
  `QA_CHROME_PATH=/path/to/chrome` on a box with no Chrome channel (a
  container, CI). It also audits the audio LED lit, because it animates
  opacity and the plain pass never turns it on. It covers ONLY the four hub
  pages — never the games.
- `python build/qa/catalog-art.py audit` — the ONLY pixel-level gate on the
  site. Required after any art change (see `images.md`).

## Per-game boot checks (run before shipping a change to that game)

They all exist for the same reason: counter-based suites passed while the
player saw nothing. They boot the page the way a player does and read the
canvas back. Serve the repo first
(`node build/scripts/static-server.mjs --root=. --port=4173`). The full set is
whatever `build/qa/*-boot-check.mjs` currently holds — the ones worth calling
out are below.

- `node build/qa/fetch-boot-check.mjs http://localhost:4173/fetch/` — real
  title click, no `?test=1` (which skips the shader warmup); asserts the
  world is on screen AND the skull is visible in the player's hands while
  play runs. FETCH 0.6.1 passed 74 counter checks and shipped a game Alex
  could hear but not see. Trap it is built around: with
  `preserveDrawingBuffer` false, reading the canvas outside the frame task is
  black by construction — it samples inside `game.render`. Calibrated
  2026-08-12 against known-good production (passes) and the 0.6.1 tree at
  `90d9b16` (correctly fails).
- `node build/qa/the-last-room-boot-check.mjs http://localhost:4173/the-last-room/`
  — real ENTER gesture, architectural state + spatial audio, all 15 painting
  textures load, storage-disabled boot, Axe over the game, real 390px touch
  layout.
- `node build/qa/secondhand-saint-boot-check.mjs http://localhost:4173/secondhand-saint/`
  — real START click and real keys; asserts the **authored** player shell
  bound rather than the procedural fallback, since the fallback boots green
  and still looks wrong. Also checks all 20 bone mappings, that the greatblade
  stays in her hand, that swings land damage, that pointer lock takes the
  Qualiacology pill off screen and gives it back, and Axe over the game. It is
  keyboard/mouse/gamepad only, so 390px is checked for a clean page and a way
  home, not for playability.
- `node build/qa/glide-mechanics-check.mjs http://localhost:4173/glide/`
  and `node build/qa/glide-mobile-check.mjs http://localhost:4173/glide/`
  — required after GLIDE movement, tree, title, keyboard, or touch changes. The
  desktop check reproduces real trunk contact and physical C behavior; the
  mobile check drives real two-thumb CDP input, distinguishes stationary holds
  from camera swipes and quick double taps, proves tree-to-ground detachment,
  and captures the persistent title at phone and desktop sizes. Use
  `glide-performance-check.mjs` as well for renderer, streaming, or weather
  performance changes.
- `cd build && npm run qa:skyshard-world` — required after any SKYSHARD
  authored-world placement change. It verifies that every major, minor, trial,
  threshold, and wonder remains in its declared biome and that authored
  footprints preserve at least 20m of edge clearance.
- `cd build && npm run qa:skyshard-progression` — required after any SKYSHARD
  progression, completion, interior, boss, Aster, upgrade, reward, or loadout
  change. It parses every gameplay module and asserts reward-owned guardian
  completion, retained collapsed monuments, scene-owned interior enemies,
  flush optional routes, staged challenge UI, distinct Aster motes, death-loss
  currency, persistent skins, late capstones, and isolated forecourt-boss saves.

## Measuring anything in a browser

- `locator.click()` in Playwright runs `scrollIntoViewIfNeeded` BEFORE it
  clicks, so any measurement of scroll position, jump, or camera behaviour is
  measuring the harness. Use `page.mouse.click(x, y)` at the element's real
  coordinates. A wrong number from this shipped in a written plan once.
- A `position: sticky` element's rect is constant while stuck, so a
  before/after delta on one is always 0 — never use it as a scroll anchor.
- Lazy-loaded images report "not loaded" if you measure without scrolling —
  that's `loading="lazy"`, not broken art; force `img.loading = "eager"`
  before asserting.
- Headless game rendering works with system Chrome and a real GPU:
  Playwright from `build/node_modules` with
  `{ channel: "chrome", args: ["--use-angle=d3d11"] }`, not bundled Chromium.
- **Verify against the deploy preview, not only localhost.** Two redesign
  regressions were invisible locally and obvious on the preview.
