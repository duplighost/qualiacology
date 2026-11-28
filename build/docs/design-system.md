# The look

**Read this before touching `build/src/site.css`, `build/src/site.js`, the templates in
`build-site.mjs`, or one of the hand-written pages' markup.** Skip it for content-only
or game-folder work.

The site was redesigned on 28 Nov 2026, from mockups Alex brought ("an awesome new
look", "I want it to look good"). Black, ivory and one gold; the pictures are the
colour. Alex's standing words for how things should feel apply here too: "Elegantly
simple", "dont use words where you don't have to", nothing floaty.

## What it is made of

- **Two faces, both in `assets/fonts/`.** Fraunces Italic sets every name and title: the
  site's, a game's, an album's, a page's. The file is italic only; the italic is the
  face, not an emphasis, so `h1`–`h3` set `font-style: italic` and big sizes pin
  `font-variation-settings: "opsz" 144` (smaller titles use 72 or 96, or the hairlines
  go thin). Manrope sets everything else. Neither has arrows.
- **Arrows are drawn in CSS** (`--arrow`, `--arrow-out`, as masks), never typed: a typed
  → comes from whatever font the visitor's machine lends. `.button-arrow`,
  `.more-link`, `.card-action`, `.external-link`, `.arrow`, `.crumb`, `.back-link`.
- **Gold** (`--gold`) is for rules, small labels and the one thing on a view you press.
  There is no second accent. Room colours (amber, cyan, pink) are gone on purpose.
- **Rules** are 1px: gold (`--rule`) between the parts of a page, grey (`--rule-soft`)
  inside a part.
- **The rem grows with the window** on big desktop screens (`html { font-size: clamp(…) }`,
  16px to 20px between about 1400 and 2100px wide), so the page gets larger, not just
  wider. Everything is in rem for that reason. Media queries are not affected.

## The pieces

| piece | where | notes |
|---|---|---|
| header, phone menu | every page | `header()` in `build-site.mjs`. Order: Games, Music, Psychopharmacology, Arcade, Connect, Discord. Connect is `#connect`, the footer of whatever page you are on |
| footer | every page | `footer()`. It *is* the Connect section |
| `.masthead` | homepage | the thesis and the line about him |
| `.feature` | homepage | the first `featured` game, on its wide banner |
| `.banner-card` | homepage | the other two featured games |
| `.cover-card` | homepage, `/music/` | album covers; `/music/` adds tags and Listen |
| `.strip` | homepage | the Psychopharmacology Server, with the live count |
| `.page-head` | every other generated page | one big title, sometimes a line and buttons |
| `.work-card` | `/games/` | picture, kicker, title, his summary, facts, his verb |
| `.leaf …` | hand-written pages | `.album`, `.game-page`, `.lost` (the 404) |

## Things that bite

- **A block that is one link.** The feature, a banner card, a cover, a game card and the
  one-off on `/music/` each hold exactly one `<a>`, stretched over the block with
  `::after` (`::before` on `.card-action`). Don't add a second link inside without
  lifting it (`position: relative; z-index: 2`, as `.cover-listen` does). Keyboard focus
  is shown on the whole block with `:has()`.
- **The feature's name is sized off the feature** (`cqw`), so the name ends where the
  picture's subject begins at every width. If you change the feature's padding or the
  name's size, look at 800, 1100 and 1440 wide.
- **A banner's frame is not always 3:1.** `bannerFocus` in `site-data.json` says where
  the picture is held when the frame is narrower (the build writes one
  `object-position` rule per banner into the stylesheet, because pages carry no inline
  styles). `bannerTallFocus` says where the phone's 4:3 cut is taken.
- **The phone cut switches at 48rem in two places**: `tallBelow: "47.99rem"` in
  `build-site.mjs` and the `@media (min-width: 48rem)` rules for `.feature` and
  `.game-shot-wide`. Move one, move the other.
- **`sizes` describes real slot widths** (`slotSizes` in `build-site.mjs`), including
  the growing rem. Change a grid's columns and you change these.
- **No inline styles and exactly one `<h1>`** in the generated pages: the validator
  fails the build.
- **Browser QA holds onto these**: `.hero`, `.desktop-nav`, `[data-menu-open]` (named
  "Menu"), the one `<dialog>` on the homepage, `[data-audio-toggle]` ("Sound off" /
  "Sound on"), `[data-filter]`, `[data-filter-status]`, `[data-catalog-game]`,
  `.banner-media img`. The desktop menu appears at 60rem (960px).

## The pages the build dresses

Album pages (`music/<slug>/index.html`), the pages of games you download
(`murderpop-greatest-hits/`, `bring-an-umbrella/`, `sill/`, `everhouse/`) and
`404.html` are written by hand, but the build puts the site's own parts into them,
between these markers:

```html
<!-- site:head -->    fonts, the stylesheet, the script      <!-- /site:head -->
<!-- site:header -->  the header and the phone menu          <!-- /site:header -->
<!-- site:shot -->    a game page's picture (game pages only) <!-- /site:shot -->
<!-- site:footer -->  the footer                             <!-- /site:footer -->
```

Never edit between the markers; edit everything else freely, then run the build. The
list of dressed pages is `dressedPages` at the top of `build-site.mjs` (albums are
taken from `site-data.json`). A page missing a marker fails the build by name. CI
rejects a dressed page that is stale, the same way it rejects a stale hub page.

Game pages you *play* on are not dressed: nothing of the site sits over a game.

## Copy

All of it is Alex's voice (AGENTS.md, rule 2). The redesign cut what sounded like a
site describing itself. Don't bring that register back: no "doorways", "shelves" or
"worlds", no notes about how the page was made.
