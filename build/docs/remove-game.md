# Removing a game

Read this only when taking a game off the site. It is the inverse of the
add-game checklist — grep the slug until it's zero:

game dir → `assets/games/` card → `assets/catalog/games/` set → any OG image
→ `_redirects` entries → `_headers` block → `404.html` mentions → orphaned
`assets/` files referencing it → catalog entry in `site-data.json` → count
asserts (all four spots listed in `add-game.md` step 5, including the
horror-filter roster in `browser-qa.mjs` if it was a horror game) → rebuild +
validate.

Two traps the first pass always misses:

- **Vanity short links outlive the game they pointed at.** `/vesper` was a
  302 to `/vesperbane/`; deleting the game without deciding what happens to
  the short link leaves a dead route. Repoint it or delete it deliberately.
- **Add the dead routes to `retiredRoutes` in
  `build/scripts/route-smoke.mjs`**, which asserts them 404 alongside the
  retired book. That is what stops a later restore or a stray file from
  quietly putting a removed game back on the shelf. Its 404 count is derived
  from that list, so it never needs bumping.
