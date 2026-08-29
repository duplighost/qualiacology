# Adding an album (Doopliss release)

Read this only when adding a music release. Same shape as adding a game,
with these differences:

1. **Cover art**: `/assets/albums/<slug>.jpg` at **900×900**, plus the
   responsive square set `/assets/catalog/albums/<slug>-{360,600}.{avif,webp}`.
   Source is usually the Suno playlist cover — it's the page's `og:image`
   (fetch the file directly; the declared `og:image:width` may lie, e.g. says
   256 when the file is 1600). `py -3` + Pillow generates all five (AVIF
   supported). Pipeline traps in `images.md` apply.

2. **Catalog entry** in `site-data.json` `albums`: slug, title, `featured`,
   image, alt (`"<Title> album cover"`), summary, tags, tracks (or `null`),
   `listen` (Suno), optional `youtube`. Keep copy in Alex's voice — his
   YouTube upload's description (the `shortDescription` in the watch-page
   HTML) usually has his own blurb + a timestamped tracklist to reuse
   verbatim.

3. **Detail page** `music/<slug>/index.html` — copy `music/summer-people/`
   and swap content. The per-track `<em>` one-liners are Alex's voice; if you
   don't have his, list titles only, don't invent them. Note the validator
   walks EVERY .html under root, so this page needs a
   `<meta name="description">` ending in `.`/`!`/`?`.

4. **Bump the album-count asserts** in THREE files: `build-site.mjs`,
   `validate-site.mjs`, AND `build/qa/browser-qa.mjs` (the QA one hardcodes
   `bodyAlbumCount === "N"` and is easy to forget — it fails `npm run qa`).

5. Albums have **no per-album short-links** (only `/records → /music/`) —
   don't invent one. No `404.html` change needed (it names games, not
   albums).

6. **Featured order = albums array order.** The homepage shows the 3 featured
   albums in array order. To put a new release in the first featured slot,
   MOVE its entry to the top of the array (flagging `featured:true` alone
   puts it last). Keep exactly 3 featured — un-feature one to compensate; an
   un-featured album stays on `/music/`, it just leaves the homepage.

7. **No Suno link is normal** — several releases put the YouTube URL straight
   in `listen` and omit the `youtube` key entirely. Do not invent a Suno
   playlist to fill the slot; one link is the whole contract.

8. `build/scripts/route-smoke.mjs` derives album routes from `site-data.json`
   automatically — a new album needs no edit there, but its reachable-route
   total goes up by one, so re-read the number it prints rather than assuming.
