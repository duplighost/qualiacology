# HELLSPINDLE fix pass — 2026-09-03

Independent review of `GORETHREAD_HELLSPINDLE_AI_FIX_HANDOFF.zip`. The audit was checked against `PROJECT_SOURCE/game.js`, not taken on faith. Every listed high-priority defect reproduced in source. Confirmed defects were patched in place. Authored copy, art, and mechanics were left alone except where a defect required a correction.

Play this folder: open `index.html`. Keep `index.html`, `style.css`, `game.js`, and `assets/` together.

## Modified files

| File | Why |
| --- | --- |
| `game.js` | All gameplay/logic/performance fixes |
| `assets/sprites/anim/meta.json` | Frame counts/sizes matched the actual PNGs |
| `docs/STATUS.md` | What is true now |
| `tests/run-logic.mjs` | New. Headless regression suite |
| `tests/browser-regression.html` | New. Chrome harness page |
| `tests/browser-regression.js` | New. Real keyboard/mouse/touch/victory checks |
| `tests/run-browser.mjs` | New. Serves the game and drives Chrome |
| `tests/shots/browser-regression.png` | Chrome capture at end of the browser suite |
| `CHANGELOG.md` | This file |

Unchanged: `index.html`, `style.css`, every background/sprite PNG/WebP, `START_HERE.txt`, `README_FOR_AI.md`, `CLAUDE.md`.
`AGENTS.md` only got a one-line pointer at this folder and CHANGELOG.md.

## Fixes in `game.js`

### 1. Boss reset / wake (critical)
`createEnemy()` still starts a boss asleep. `resetEnemies()` still did not restore wake. The only old wake was the first time the finale checkpoint was awarded, so death, R, and Continue left a full-HP inert Abbot.

- Added `syncBossState()` after every `resetEnemies()` from `restartFromCheckpoint()`.
- If the save is not completed and the checkpoint is in the last district, the boss is forced awake and `bossActive` is true.
- First entry still wakes on the checkpoint award, as before.

### 2. Boss-gate collision mismatch (high)
`drawBossGate()` used `AREAS[last].x0 + 8` (34958). Collision used a leftover `{ x: 8525, ... }`.

- Added `bossGateRect()` from the final area start.
- `getDynamicSolids()` and `drawBossGate()` share that rectangle.
- Coordinate 8525 is gone.

### 3. Embedded flying enemies (high)
`buildWing()` fed floor-top Y to bats and censers, whose hitboxes are center-anchored, so 18 generated fliers sat in the masonry.

- Ground roster members still spawn at `floorY`.
- Bats/censers from that roster spawn at `floorY - 118`.
- Extra authored air bats at ~360 were already clear and were not moved.

### 4. Unsafe checkpoints (high/medium)
Every new district wrote Y=760. Zones 6 and 10 stand on Y=712. Zones 3, 6, and 9 overlapped entrance spikes.

- Added `supportYAt()` and `AREA_CHECKPOINTS`.
- Each district checkpoint is walked right until the player rectangle sits on a floor and misses every hazard.
- Awarded checkpoint X/Y use that table.
- Generated executioners and the boss also spawn on `supportYAt`.

### 5. Pause / save (medium)
The pause branch called `saveGame()` at 120 Hz and `game.time` still ticked.

- Save once when pause is entered.
- `game.time` and `helpFade` only advance in active `playing`.
- Pause no longer expires the tutorial.

### 6. Reflected-projectile re-parry (medium)
Wheel overlap ran on already-reflected bolts and multiplied speed.

- Reflect only if `p.hostile && !p.reflected`.

### 7. High-refresh input loss (medium)
`input.endFrame()` ran after every render, including frames with zero fixed steps, so N/M/F/R/any-key could vanish on >120 Hz displays.

- `endFrame()` runs only after at least one fixed update.

### 8. Tutorial timing (medium/low)
Title time ate `game.time` and `helpFade`. `restartFullRun()` did not reset them.

- Those timers tick only while playing.
- Full restart sets `time = 0` and `helpFade = 1`.

### 9. Victory persistence (medium/low)
Save schema had no `completed`. Continue after a win rebuilt a sleeping full-HP boss.

- Save/load `completed`.
- Boss death sets `completed` and saves.
- Continue on a completed save opens the victory screen instead of a live fight.
- N / R-from-victory still starts a new descent and clears the save.

### 10. Performance (medium/high)
`getDynamicSolids()` rebuilt every living membrane band on every call (~1.7M rects/s in the audit). The whole 38400-wide world was simulated and drawn.

- Membrane band rectangles are cached and rebuilt only when a band changes.
- Solid queries take a neighborhood around the actor (~2800 px).
- Enemy AI beyond 2400 px is skipped (boss always runs).
- `drawWorld()` culls to the camera plus a 240 px margin.

### Other confirmed maintenance
- Bone districts use `tile_spire` instead of the unused nave fallback.
- Empty `setTimeout(() => {}, 0)` in the boss slam removed.
- Checkpoint restart clears `killStreak`, `streakTimer`, `jumpBuffer`, `hurtFlash`.
- Debug hook now also exposes `world()`, `solidsAt()`, `spawnBolt()`, `setYoyo()`, `completed`, `bossGate`, `checkpointY`.

## Tests

Logic (headless, no Chrome): `node tests/run-logic.mjs`  
**89 passed, 0 failed**

Covers: flying spawn burial, checkpoint/spike overlap, gate X, tutorial freeze, pause save-storm, high-refresh KeyN, keyboard D, mouse wheel, touch drag, all 12 district transitions, save, R, death/respawn, Continue, first boss wake, restart wake, Continue wake, gate blocking, boss kill, victory, completed save, Continue-after-win, new descent, one-shot parry, membrane cache, meta/tile/8525 source checks.

Browser (real Chrome events): `node tests/run-browser.mjs`  
**17 passed, 0 failed**

Covers: title/playing paint, keyboard move, space jump, mouse aim, touch drag, pause, finale wake, restart wake, victory, completed localStorage, no page errors.

`node --check game.js` is clean.

## What was not changed on purpose

- No authored title/pause/victory sentences rewritten.
- No art redraw, no mechanics removed, no HUD added.
- Knight shield picture still stays after the shield stat breaks.
- Attack swings are still a lean on a planted frame.
- Hook inner hole is still a bit chewed.
- Unused leftovers `easeOut`, `solidRects`, `drawArch` were left in place (dead, not broken).

## Uncertain / not proven here

- Allocation counts should drop a lot; I did not re-run the audit’s 1.7M-rect profiler on a phone. Feel on Alex’s devices still beats the counters.
- No physical gamepad was plugged in. The pad path was not the reported defect.
- I did not walk all 38400 pixels by hand. Every district checkpoint, the gate, the boss wake/death/victory/reload path, and the control paths were driven in tests.
- Continue after a win now shows **THE ABBOT UNRAVELED** rather than dropping you into a dead throne to wander. That matches “persist victory.” If the wanted Continue is an empty arena with a corpse, say so.

## 2026-09-03 — drop through ledges / wheel snag

Falling showed more floor under you, but the wheel buried in the thick masonry and a clipped swing dropped the hook, so you died in the pit instead of landing.

- One-way ledges can be dropped through: S / ArrowDown, swipe down on the left thumb, or the pad stick down.
- Free wheel now slides on solid floors and the boss gate instead of passing through them. Goreweave is still cut, not bounced.
- A swing that nicks a floor top lands on it, or the rope shortens, instead of letting go.

Gaps between slabs are still death. Those are the swing voids.

## 2026-09-03 — hunter, camera, wheel snap

Learned from the other copies without merging them:
- They follow the camera on Y, so jumps and falls feel less glued to the floor. This build now eases the camera a little vertically (clamped; it is still a ground-band cathedral, not the vertical-wing game).
- Their wheel/walk numbers were mostly the same. Idle wheel return is snappier here (higher spring/damping). Ground stop is a hair tighter.
- Their hero sheets were cleaner 4-frame game sprites. This build did not steal those (male, different game). New woman hunter instead.

Hunter is now a woman: porcelain mask, red visor, torn crimson coat, idle/walk/air loops. Title still says S DROP.

Clean break point.
