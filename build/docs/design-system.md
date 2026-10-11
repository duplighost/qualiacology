# The design system

**Required reading before touching `build/src/site.css`, `build/src/site.js`,
or the templates in `build-site.mjs`.** Skip it entirely for content-only or
game-folder work. A five-stage redesign landed 2026-08-27 (PRs #109–#112);
the stylesheet's opening comment carries two laws — they are rules, not notes.

## Law 1: the discipline budget

One aura per view; resting wing alpha ≤ 8% (both `--wing-dim` values sit at
0.06 and were deliberately NOT spent to the ceiling); glow shadows only on
the scroll filament, the lit nav pilot light, and the playing audio LED.
Hero art no longer glows — that glow was deleted on purpose. If you add a
glow, you are spending from a fixed budget; say so out loud.

## Law 2: the motion law — three lanes

Independent composited properties, so entrance, pointer and press can never
write the same thing:

| lane | property | where |
|---|---|---|
| entrance | `translate` | scroll timelines only — `rise`, `settle` |
| pointer | `scale` | hover/focus, always inside `@media (hover: hover) and (prefers-reduced-motion: no-preference)` |
| press | `transform` | `:active`, 45ms attack |

Entrance animations are **transform-family only, never opacity** — an opacity
keyframe makes axe fail colour-contrast on below-fold content mid-animation.
That lesson cost a session once. The stylesheet also carries an explicit
not-doing list (no card tilt, parallax, magnetic buttons, cursor follower,
cursor torch, fixed scroll lamp, `will-change` on card images) — all
desktop-only, invisible in a stranger's first ten seconds, and untestable by
a suite that runs at 390px and 1440px with no hover emulation.

## Structures you will trip over if you don't know they exist

- **The plate rail.** Grids are NOT inside `.container`. Text keeps the 76rem
  measure; `<div class="plate-bleed">` gives pictures their own 100rem one,
  so a 3-up card is 440px instead of 386px. Every catalog/shelf `<ul>` is a
  sibling of `.container`, not a child. Use `rem`/`%` only inside it — never
  `100vw`: the Windows scrollbar sits outside the viewport width and
  `browser-qa.mjs` asserts `pageWidth <= width + 1`.
- **The sticky filter rail lives in the plate rail too**, with the grid it
  filters. A `position: sticky` element only sticks inside its own parent's
  box — leaving it behind in `.container` (which ends above the grid)
  silently kills the stick entirely. This shipped broken once.
- **The card index is a CSS counter**, not template output. `build-site.mjs`
  emits an empty `<span class="card-index">`; `counter-reset` is on the grid,
  `counter-increment` on each `<li>`. That is what makes a filtered shelf
  read 01–05 instead of 01/09/15 — `[hidden] { display: none }` means a
  filtered-out item generates no box and cannot increment. Do not put numbers
  back in the template.
- **`data-here` on `<body>` is the room signal.** An IntersectionObserver in
  site.js (rootMargin `-45% 0px -45% 0px`) reports which homepage section you
  are in, driving the scroll filament's colour and the nav pilot lights. It
  replaced fixed percentage keyframes that were 10–20% out of phase. **Do not
  go back to percentage stops** — they drift the moment section heights
  change. `.home-page` is a BODY class, so `data-here` must live on `<body>`
  too.
- **Seams are tokens.** `--seam-top` / `--seam-bot`, deliberately asymmetric;
  they double as the chapter numeral's height budget: `.ghost-index` is sized
  off them, which makes it arithmetically impossible for the numeral to reach
  the heading at any width. It used to strike through the
  `/psychopharmacology/` h1 by 122px.
- **Two type registers, not one.** *Locator* (uppercase, tracked): eyebrows,
  nav, kickers, filter buttons, stat labels. *Data* (sentence case,
  untracked): `.card-meta li`, `.footer-links a`. The data register exists
  because Alex's source strings are already cased on purpose — `WASD`, `LMB`,
  `Esc`, `TikTok` — and `text-transform: uppercase` was flattening that
  signal. Do not uppercase them again.
- **Card art rests resolved.** The old `filter: saturate(0.55)
  brightness(0.92)` is gone. Cards sit on `--surface` (lighter than the page)
  with a `--rule-lit` top edge, so dark art reads as an object on a shelf,
  not a hole. The hover "develop" is a 3% `scale`, in the pointer lane.
- **Card action buttons sit at their natural width**, outlined on the
  `/games/` shelf; the homepage featured three keep filled slabs on purpose.
  Row slack collects above the action (`margin-top: auto` on `.card-actions`,
  NOT on `.card-meta`) so every button in a row shares a baseline while
  metadata stays welded to its summary. Alex rejected the ragged-baseline
  alternative on sight.
- **The homepage featured games are three equal 16:9 cards**, the same row
  as `/games/`, every picture whole. Alex picked this on 11 Oct 2026 over a
  double-height first card, which stretched its picture to a near-square
  frame (about half the art showed) that ran past the bottom of a laptop
  screen.

## Things that are load-bearing and look optional

- **`sizes` in `catalogPicture()` must describe the real slot width.**
  Nothing asserts on `currentSrc`, so a `sizes` that under-asks silently
  upscales the picture (a 31vw description once got a 480w file stretched
  over an 875px slot). Change it whenever a card grid's columns change.
- `heroPicture()`'s `<source media="(max-width: 44.99rem)">` phone crop and
  the CSS `aspect-ratio` switch **must use the same breakpoint**, or a band
  of widths gets a CSS box and a downloaded image with different ratios.
- `.scroll-progress` has a base `transform: scaleX(0)` for the JS fallback.
  The `@supports (animation-timeline: scroll(root))` block sets
  `transform: none` **and must come after the base rule** — same specificity,
  source order decides. Get either wrong and the filament is zero-width
  forever. The JS write is guarded by
  `CSS.supports("animation-timeline", "scroll(root)")` so both never run at
  once.
- Filtering: `applyFilter` captures the reader's scroll on **pointerdown**,
  before the browser's own focus-scroll fires. Clicking a filter focuses it,
  and because the rail is sticky the browser scrolls to the button's *layout*
  position — hundreds of pixels away. That, not the document collapsing, is
  what threw readers up the page. Keyboard focus deliberately still scrolls.
- An `<a>` wrapping `<dt>` + `<dd>` is **invalid** inside a `<dl>` — axe
  fails it on `definition-list` + `dlitem`. The hero's three "doors" put the
  anchor inside the `<dd>` with a stretched `::after`. Keep it that way.
- `.alive-word` on the homepage hero needs its padding/margin pair —
  `background-clip: text` + negative letter-spacing shaves the last glyph
  without it.
