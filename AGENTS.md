# AGENTS.md — how to work on qualiacology.com

Read this first. It is the entry point for every AI agent (Codex, Claude,
anything else) and is kept current: trust it over your own notes or memory.
It is deliberately short: the rules that always apply, two ship flows, and a
table routing to a task guide in `build/docs/`. **Read only the guides your
task touches.** Last verified: 2026-09-03.

## The three rules

1. **`main` is production.** Netlify (project `classy-strudel-55444b`,
   publish directory `.`, no build step) deploys every push to `main` within
   about a minute, and GitHub enforces no branch protection. So: feature
   branch → PR → merge → open the live URL. **Publish with Alex's approval.**
   "Ship it", "put it live", or another clear instruction to publish is enough;
   no exact phrase is required. Once approved, merge when CI is green and verify
   production without asking again. If publication has not been approved, leave
   the PR ready for review. Never deploy manually; the git flow is
   the only deploy path. Rollback = redeploy a previous deploy in the Netlify UI.

2. **All site copy is Alex's voice; never invent it.** Plain, dry, a little
   charged, occasionally profane. No taglines, no hype words. Reuse his
   existing lines; when unsure, ask. Games contributed by others keep their
   own words: shell them, fix accessibility, never edit their text.

3. **The four hub pages are generated; never edit them directly.**
   `index.html`, `games/`, `music/`, `psychopharmacology/` are build output.
   Sources: `build/src/content/site-data.json` (all copy plus the catalog;
   hand-formatted, so make targeted text edits only and NEVER load-and-redump
   with a JSON library), the templates in `build/scripts/build-site.mjs`, and
   `build/src/site.css|js`. Everything else at root (per-game folders,
   `music/<slug>/`, `_redirects`, `_headers`, `404.html`) is static and
   hand-edited. Repo root IS the served site; never leave scratch files here.

## Before you edit anything

```sh
git status && git pull
```

A dirty tree with changes you didn't make means another session is
mid-flight in this checkout: stop and say so. Other sessions may be working
in separate worktrees of this repo at the same time; that is fine.

## Flow A: you changed files inside one game folder (the common case)

Updating a game that is already on the site. No hub build, no preflight, no
QA run. CI validates the PR for you.

```sh
git checkout -b <game>-<what-changed>
# Put the new files in <game>/. If the game also lives under
# C:\Users\Alex\Projects\<game>, check which copy is newer BEFORE copying
# (gotchas.md, "Site copy vs Projects source"). Some games generate the
# site copy with a script (arc, thrown, thurible, curfew: see their docs).
node build/scripts/static-server.mjs --root=. --port=4173
#   open http://localhost:4173/<game>/ and see it boot. That is the check.
git add <game>/ && git commit -m "<GAME>: <what changed>"
git push -u origin <branch> && gh pr create --fill
# Wait for CI and Alex's approval → gh pr merge --squash --delete-branch, then open
# https://qualiacology.com/<game>/ and confirm it boots. Done.
```

If the game has its own `build/qa/<game>-boot-check.mjs` AND you changed how
it boots, run that one check against localhost. Nothing else.

## Flow B: you changed the hub

Catalog entries, hub copy, templates, `site.css` or `site.js`, images, or
adding/removing a game or album.

```sh
git checkout -b <feature-branch>
node build/scripts/preflight.mjs        # build + validate + route smoke
#   --art if you touched ANY image; --qa only if you touched site.css/js or templates
git add <files> && git commit && git push -u origin <branch> && gh pr create --fill
# Inspect the Netlify deploy preview. With Alex's approval → merge, then check the
# changed routes on https://qualiacology.com.
```

Windows notes (Alex's machine, PowerShell 5.1): no `&&` chaining there; write
commit messages to a file and `git commit -F <file>`, saved ASCII. Git Bash
avoids all of this. Python is `py -3`.

## Where to go for your task

| Task | Read |
|---|---|
| Update an existing game's files | Flow A above. Nothing else. |
| Edit hub copy / catalog data, edit a static page, verify a deploy | `build/docs/quick-changes.md` |
| Add a game | `build/docs/add-game.md` |
| Remove a game | `build/docs/remove-game.md` |
| Add an album | `build/docs/add-album.md` |
| Touch `site.css`, `site.js`, or page templates | `build/docs/design-system.md` (**required**) |
| Touch any image | `build/docs/images.md` (**required**) |
| Write or run tests, boot checks, or measure anything in a browser | `build/docs/qa-gates.md` |
| Something failed in a weird way / what's known-unfinished | `build/docs/gotchas.md` |

`HANDOFF.md` at root is a long, git-ignored local session diary. Do not read
it whole; grep it if you need history on one specific change.
`.github/workflows/validate-site.yml` is read-only CI on PRs and main: it
rebuilds the hubs, validates, runs route smoke, and rejects stale generated
pages. It never commits or pushes.

## Access

- GitHub: `duplighost/qualiacology` (public), branch `main`. The `gh` CLI on
  Alex's machine is authed as `duplighost`. Commit identity `duplighost` /
  `alexdguitar@gmail.com`.
- Netlify: team "Alexander Guitar", project `classy-strudel-55444b`, site_id
  `85511573-c8bc-48fb-b23e-c9a5d2eff8f6`, domain qualiacology.com. Deploy
  state via the Netlify MCP (`get-project`, currentDeploy → `ready`) if
  available, or just open the URL.

## Keep these docs true

If you change the workflow (new asset contract, new script, moved files),
update this router and the affected guide **in the same commit**. Future
agents trust these files; stale instructions are worse than none. Never print
counts in prose that can rot: the build and route-smoke print the real totals.

