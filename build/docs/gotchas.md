# Gotchas

Read this when something fails in a weird way.

- Never deploy manually. The Netlify CLI is not logged in; the git flow is the only path.
- Do not enable Netlify `pretty_urls`: with both `no-moon.html` and `no-moon/index.html`
  present it makes a redirect loop. Keep the explicit `/no-moon` redirects as they are.
- Catalog counts live in one file, `build/src/content/expected.json`. A mismatch fails
  the build with a message naming the file.
- `404.html`, `_redirects` and `_headers` are hand-maintained; the build never touches
  them. Removing a game means checking all three and adding its routes to
  `retiredRoutes` in `build/scripts/route-smoke.mjs`.
- An image replaced under the same filename stays cached for returning visitors; see
  `images.md` for the `?v=` fix.
- `site-data.json` is hand-formatted. Make targeted text edits; never load and re-dump
  it with a JSON library.
- PowerShell 5.1 mangles quoted commit messages; use Git Bash, or `git commit -F <file>`.
- Site copy vs Projects folder: they have diverged in both directions (VIGIL's site copy
  is the newer one). Compare `git log -1 -- <game>/` here with the project's history
  before copying either way. Games with a generator script are regenerated, never
  hand-edited on the site side.
- Canvas 2D: filling one path with thousands of subpaths goes superlinear. Fill in
  batches of about a hundred.
- Two sessions must not work this checkout at once. A dirty tree with changes you did
  not make means stop.
