# AGENTS.md — how to work on qualiacology.com

Read this first. It is the canonical entry point for AI agents (Codex, Claude,
anything else) and is kept current — trust it over your own notes or memory.
It is deliberately short: it holds the rules that always apply and routes you
to a task guide in `build/docs/`. **Read only the guides your task touches.**
Last verified: 2026-08-29.

## The three iron rules

1. **`main` is production.** This is a git-connected Netlify site (project
   `classy-strudel-55444b`, publish directory `.`, no Netlify build step). Any
   push to `main` is live at https://qualiacology.com within about a minute,
   and GitHub enforces no branch protection. So: feature branch → PR → inspect
   the Netlify deploy preview → merge only with Alex's explicit approval.
   **"Ship it" from Alex in his request IS that approval**: verify the deploy
   preview is green and correct, merge, then verify production. Without those
   words, stop at the open PR and wait. Never deploy manually — the Netlify
   CLI is not logged in; the git flow is the only deploy path. Rollback =
   redeploy a previous deploy in the Netlify UI.

2. **All site copy is Alex's voice — never invent it.** Plain, dry, a little
   charged, occasionally profane. No marketing taglines, no hype words
   ("Small worlds with sharp teeth" got an agent in trouble once). Reuse his
   existing lines; when unsure, ask. Games contributed by others keep their
   own words: shell them, fix accessibility, never edit their text. Only the
   hub catalog entry is Alex's copy.

3. **The four hub pages are generated — never edit them directly.**
   `index.html`, `games/`, `music/`, `psychopharmacology/` are build output.
   Sources: `build/src/content/site-data.json` (all copy + the game/album
   catalog; hand-formatted — make targeted text edits only, NEVER
   load-and-redump with a JSON library), templates in
   `build/scripts/build-site.mjs`, styles/behavior in `build/src/site.css|js`.
   Everything else at root (per-game folders, `music/<slug>/`, `_redirects`,
   `_headers`, `404.html`) is static and hand-edited; the build regenerates
   `sitemap.xml` but never those. Repo root IS the served site — never leave
   scratch files here.

## The ship flow (every change)

```sh
# 0. Before editing: git status && git pull. A dirty tree with changes you
#    didn't make means another session is mid-flight — STOP.
git checkout -b <feature-branch>
node build/scripts/preflight.mjs                 # build + validate + route smoke, one command
#   add --art if you touched ANY image; add --qa for the full Playwright+axe
#   gate (first time: cd build && npm ci; needs Chrome)
git add <files> && git commit                    # identity: duplighost / alexdguitar@gmail.com
git push -u origin <feature-branch>
gh pr create                                     # then inspect the Netlify deploy preview
# merge ONLY with Alex's approval ("ship it" counts), then verify production:
# changed routes 200/404 as intended on https://qualiacology.com
```

Windows notes (Alex's machine, PowerShell 5.1): no `&&` chaining in
PowerShell; write commit messages to a file and use `git commit -F <file>`,
saving it ASCII (`Set-Content -Encoding ascii`) — `Out-File -Encoding utf8`
adds a BOM that becomes an invisible character in the subject line (commit
`7d5472e` has one). Python is `py -3`. Git Bash avoids all of this.

## Where to go for your task

| Task | Read |
|---|---|
| Edit hub copy / catalog data, edit a static page, verify a deploy | `build/docs/quick-changes.md` |
| Add a game | `build/docs/add-game.md` |
| Remove a game | `build/docs/remove-game.md` |
| Add an album | `build/docs/add-album.md` |
| Touch `site.css`, `site.js`, or page templates | `build/docs/design-system.md` (**required**) |
| Touch any image | `build/docs/images.md` (**required**) |
| Run QA gates, boot checks, or measure anything in a browser | `build/docs/qa-gates.md` |
| Something failed in a weird way / what's known-unfinished | `build/docs/gotchas.md` |

`HANDOFF.md` at root is a local, git-ignored session diary on Alex's machine —
read it for recent context if present; do not rely on it existing.
`.github/workflows/validate-site.yml` is read-only CI on PRs/main: it rebuilds
the hubs, validates, runs route smoke, and rejects stale generated pages. It
must never commit or push generated files.

## Access

- GitHub: `duplighost/qualiacology` (public), branch `main`. The `gh` CLI on
  Alex's machine is authed as `duplighost`.
- Netlify: team "Alexander Guitar", project `classy-strudel-55444b`, site_id
  `85511573-c8bc-48fb-b23e-c9a5d2eff8f6`, domain qualiacology.com. Deploy
  state can be checked via the Netlify MCP (`get-project`, currentDeploy →
  `ready`) if available.

## Keep these docs true

If you change the workflow (new asset contract, new script, moved files),
update this router and the affected guide **in the same commit**. Future
agents trust these files blindly — stale instructions are worse than none.
Never print counts in prose that can rot: derive game/album/route totals from
`node build/scripts/build-site.mjs` and the route-smoke output, not from any
number written in a doc.
