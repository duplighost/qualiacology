# BREAKWATER

An original desktop browser action game for Qualiacology. The runtime and all of
its assets are in `breakwater/`; it makes no CDN or third-party requests during
play. Existing games are unchanged. This branch adds the game and its generated
catalog entry; it does not deploy production.

## Play and develop

Use Node 22 and install the existing build tools with `npm ci --prefix build`.
From the repository root:

```sh
node build/scripts/static-server.mjs --root=. --port=4173
```

Open the `/breakwater/` route on that server in a current desktop browser with
WebGL 2. Click New game or Continue to enable audio and capture the mouse.
WASD moves, Space jumps/swims upward, Shift dashes, Ctrl/C slides/swims down,
LMB charges/releases the lance, RMB or R recalls it, E parries/catches/climbs,
Tab opens the constellation, and Escape pauses. Baseline movement abilities are
available immediately. Difficulty, sensitivity, volume, FOV, camera shake and
rendering quality are adjustable without restarting.

Progress uses the namespaced localStorage key `qualiacology.breakwater.v1`.
Arena checkpoints, unlocked sectors, secrets, skills and settings persist.
Retry preserves the last cleared encounter. Completed chapters can be replayed
with the current constellation. A private browser that refuses storage still
runs the game, but cannot retain progress.

## Implementation

- `main.js`: state transitions, saves, progression and rendering.
- `input.js`, `player.js`, `weapon.js`: buffered inputs, fixed-step movement,
  collision, swimming, lance flight, recalls and parries.
- `world.js`: authored district architecture, visible collision surfaces,
  side routes, secret rooms, interactable ladders and breakable props.
- `combat.js`, `combat-visuals.js`: nine maintenance-machine archetypes,
  seven boss controllers, waves, hazards, counter opportunities and animation.
- `campaign.js`, `progression.js`: 25 sectors and twelve behavior-changing skills.
- `materials.js`, `props.js`: local photographic PBR maps and shared CC0 models.
- `audio.js`: adaptive original music, recorded/synthesized effects, spatial
  feedback and a separate underwater gameplay filter.
- `ui.js`, `style.css`: menus, HUD, keyboard-operated constellation and feedback.

The development-only URL parameter `?dev=1` exposes `window.__BREAKWATER__` for
inspection and controlled checks. Ordinary visitors receive no visible debug
menu. Assets and their source/checksum records are documented in
[`breakwater/CREDITS.md`](../../breakwater/CREDITS.md).

## Verification

The task explicitly requested broad game testing beyond the repository's usual
single-route boot check. Reproducible checks live outside the game runtime:

```sh
node build/qa/breakwater/regression.mjs
node build/qa/breakwater/combat-regression.mjs
node build/qa/breakwater/public.mjs
node build/qa/breakwater/campaign.mjs
node build/scripts/preflight.mjs --art
```

The campaign check requires the local server and Chromium. It uses the existing
Playwright dependency, automatically selects `/usr/bin/chromium` when available,
and otherwise uses Playwright's installed browser. `BREAKWATER_CHROMIUM` can select
another Chromium executable; `BREAKWATER_QA_URL` changes the test route and
`BREAKWATER_QA_OUT` changes its evidence directory. The default output is under
the operating system's temporary directory.

The first suite exercises real Player/Weapon code for collision, buffered resets,
near-wall throws, charge thresholds, catch state and skill side effects. The
second uses controlled travel and enemy defeats through the real runtime to
check all campaign transitions, checkpoints, death/retry, reload and the ending.
**It is not an ordinary playthrough or a duration measurement.**

See the [validation report](breakwater-validation.md) for real-input checks,
physics traversal, asset verification, audio evidence, boss tests and their
limits. The [design record](breakwater-design.md) contains the ten concepts
considered and the chosen campaign's mechanics and content plan.

## Quality limits

This is a playable browser campaign, not a demonstrated modern AAA production.
Independent visual reviews found improvements across several iterations, but
still identify procedural architecture, repetition and limited environmental
fidelity. Hardware GPU performance and a two-hour first playthrough have not
been established. The 129 minutes in `campaign.js` are design targets only;
there are no time gates, mandatory waits or requirements to replay content.
These unmet parts of the original brief must not be represented as passed.
