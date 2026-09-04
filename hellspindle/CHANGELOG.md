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

## 2026-09-04 — speed, the rope, routes, the Reliquary

### Speed

The frame was composed into a second canvas that never gets shown, then blitted
onto the visible one. A canvas that is never presented does not get hardware
acceleration, so that one line uploaded 1600x900 pixels from the CPU every
frame. Measured in headless Chromium: **29.8ms of a ~30ms frame, about 87% of
all CPU time, inside a single `drawImage`.** Painting straight onto the visible
canvas takes the same frame to **0.90ms**. Browsers already present a canvas
atomically at the end of a rAF callback and `render()` never yields, so the
tearing the offscreen buffer guarded against cannot happen anyway.

Also:
- The backing store is sized to what the display can actually resolve instead
  of always 1600x900. A phone stops painting pixels that get thrown away.
- Static masonry is bucketed by x. The collision queries were doing two to
  three million rectangle tests a second against a world that is the same shape
  it was at boot.
- Goreweave band rectangles, platform gradients and the hook halo are built
  once instead of per frame.
- Oversized source sprites are baked to their draw size once instead of being
  resampled every frame.
- The wheel's combat pass skips anything the chain cannot reach.

### The rope

It used to search for a legal pendulum pose and teleport you onto it, walking
outward through neighbouring arcs when the ideal pose clipped masonry, and
dropping the hook when nothing in that narrow window fit. That is why grazing a
slab let go of the ring, and why an arc that brushed geometry went dead instead
of sliding — every rejected candidate silently deformed the swing.

It is a constraint now. You are an ordinary body moved by the same collision
code as everything else; the rope only removes outward radial velocity and takes
up slack, and it is a rope rather than a rod, so being closer to the ring than
the rope is long is simply allowed. **Nothing in the solver can release the
hook. Only you do.** Hanging ledges are scenery while you are on the rope, a
corner graze costs a little speed instead of the whole arc, a latch pops you
clear of the floor, and a pointer that vanishes for a frame no longer counts as
letting go.

### Collision

The horizontal pass zeroed velocity on its first hit, so a body overlapping two
abutting slabs never escaped the second one and wedged in the seam. It resolves
each block now and stops once at the end. The vertical pass treated any overlap
while descending as a landing, which snapped a body brushing the side of a block
up onto its roof; it checks that you actually came from outside that face now.

### The cathedral is one place

The twelve districts cross-fade — palette, panorama and the air itself — over
900px either side of the line, instead of cutting the moment the title card
fires.

### Routes

A district is four heights now, not one corridor.

- **The vault**, around y=300. Solid ledges high over the district, each under
  its own ring. Those rings are out of chain range from the road on purpose:
  you get up there from the gallery, or with more chain.
- **The gallery**, around y=545. One-way ledges running the other way round the
  gaps, so taking it is a choice and not a shortcut.
- **The road**, y=760. The floor, with the same lethal gaps as before — except
  one slab in each district is a grate. Hold down on it and you fall through.
- **The undercroft**, y=960. Under the road, its own gap, its own reliquary,
  and a stair of ledges back up so it is a loop and not a trap. The landing
  floor spans the whole grate, so dropping in is a decision and never a death;
  the stair out sits behind you as you land, and the reliquary is one jump
  ahead. That gap is 120px, not 170: a jump you HOLD carries 260px, but a jump
  you TAP releases early into the 1.85x cut-off gravity and carries 166, and at
  170 the crypt was demanding a perfect held jump with four pixels of margin.
  Driven in a browser, that killed a competent run eight times out of eight.

Reliquary caches hang on the routes worth taking. Breaking one is XP. They stay
broken through death and are saved.

### The Reliquary

Levelling used to silently add life and damage the instant the bar filled. Each
level hands over a relic now, and nothing happens until you open the Reliquary
and spend it.

| Relic | Ranks | What it does |
| --- | --- | --- |
| THE VESSEL | 5 | +16 life |
| THE EDGE | 5 | +10% wheel damage |
| THE CHAIN | 4 | +38px chain — reach, arc width, rings you could not touch |
| THE TENDON | 4 | +14% pump and swing cap |
| THE CARRION | 4 | +3 life on kill |
| THE SPITE | 3 | +45% release fling |

Chain length, pump strength and swing cap were constants; they are derived
stats now, so THE CHAIN and THE TENDON genuinely change what you can reach and
how the pendulum behaves.

Tab or E opens it, W/S choose, Space or D spends, Tab or Esc closes. On touch a
badge appears in the HUD when a relic is waiting: tap it to open, tap a row to
spend, tap outside to close. Saves made before the Reliquary existed hand their
banked levels back as points rather than losing them.

### The hunter

New painted sheets, keyed off their magenta background, despilled, and
composited into one shared canvas per character so she is the same size walking,
airborne or on the rope. Air poses are chosen by vertical speed — rise, leap,
fall, dive — rather than cycled on a timer, and the dive comes out at speed on
the rope. Landing compresses her in proportion to the fall; a hard takeoff
stretches her.

The idle is four real poses. The full-resolution idle sheet only ever turned up
inside the GPT handoff zip (`gen/hunter/raw-idle.jpg`, 1408x1408, same magenta
key, 2x2), never in the direct uploads, so the first pass had faked a rest pose
from the narrowest walk frame. Her character is drawn 22% larger in that sheet
than in the walk sheet, so it is scaled to match before compositing — measured
character height is now 497-504px in idle against 497-502 in walk, which is why
she does not pop size when she stops moving. The procedural breath is a whisper
on top now that the poses carry the weight shift themselves.
