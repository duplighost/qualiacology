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

### Input, camera, and one gradient per particle

A long adversarial diagnostic pass over the original build confirmed the rope
and collision reads above, and turned up four more that survived into the
current one.

**A cancelled mouse pointer left the wheel held down forever.** The release
handler tested `e.button === 0`, but `pointercancel` reports `-1`, so the flag
never cleared. Reproduced: hold the wheel, fire a pointercancel, and the wheel
is still active. It clears now.

**A second finger in the left half became the aim stick.** Touch assignment fell
through from "left zone and the movement thumb is taken" straight to "make it
the aim stick", so a stray thumb over there steered the wheel from the wrong
side of the screen. The left half is the movement thumb and nothing else now.

**A controller had to hold the stick deflected to keep a hook.** The right stick
recentring for an instant read as letting go. A right bumper or trigger counts
as gripping the wheel now, which is how a controller should hold anything.

**Every glowing particle minted its own radial gradient, every frame.** The glow
is the same shape each time — only colour and radius change — so it is a cached
unit gradient per colour, sized by the transform. Radial gradients per frame in
combat: 7.2 before, 3.0 after, and the cost is now bounded by the number of
colours rather than by the number of particles on screen.

**The camera recoiled every time she stopped.** Lookahead was raw velocity, so
the target stepped 115px the instant she stopped and 230px on a turn, and the
camera visibly lurched chasing it. The lookahead eases slower than the camera
follows now, so the target never presents a step: worst single-frame camera
movement on a stop drops from 20.5px to 13.5px.

Also cleared: a jump pressed during the death fall used to sit in the queue with
nothing consuming it, since updateGame returns early while dead. It is flushed
on respawn along with a pause tapped at the same time.

### Her animation, restored and then some

The first art pass halved her. Grok's sheets carried six walk poses, four air and
four idle, and the build the game shipped with had twelve, eight and eight — so
swapping the character in cost half her frames, and that was not called out at
the time. Eight more sheets arrived; sliced, deduplicated and measured, they
carry what was missing.

| set | shipped in the rar | first art pass | now |
| --- | --- | --- | --- |
| hunter_walk | 12 | 6 | **12** |
| hunter_idle | 8 | 4 | **8** |
| hunter_air | 8 | 4 | **11** |
| knight_walk | 12 | 6 | 6 |

Of 66 cells across the eight sheets only 55 poses are distinct — two sheets are
byte-identical to each other and two more overlap in eight of twelve cells — so
everything is fingerprinted and deduplicated before use. One sheet had to be
sliced on a forced grid: the flail's chain runs between the columns and merges
them, so column detection found two cells where there are four.

The air set is eleven frames and its ORDER is a contract drawPlayer reads:
index 0 is the leap, 1 through 8 are a float loop, 9 is the fall, 10 is the
dive. The eight new airborne poses turned out to be a hang loop rather than a
jump arc — they have no rise-to-fall progression — so the three arc poses from
the earlier sheet stay, picked off vertical speed, and the new eight cycle while
she floats near the apex where a body actually hangs.

Two compositing corrections came out of it. Frames are centred on her BODY now,
measured from the alpha mass of the top 45 percent of the figure, not on the
bounding box — her sash streams far enough to one side that a bbox centre put
the figure visibly off the collision box she is drawn on. And because the sash
needs headroom, her body only fills 0.747 of the frame, so the draw height moved
to 197 to keep her standing the same 147px tall the game shipped with.

Cost of tripling her frame count, measured interleaved against the previous
build in the same session: none. 1.60ms against 1.70ms. Every frame is baked to
its draw size once and blitted after that.

Not used: three poses of her swinging the chained flail. They are real attack
art, but the game draws the wheel and its chain itself, from her hand to
wherever the wheel physically is — art with a chain and a ball painted into it
would put a second wheel on screen. The mace ball is a detached blob in two of
the three and could be cut cleanly; the chain in the third is welded to her arm.

### She can be hurt, she can die, and she throws the thing

Grok's second drop: 19 files, 18 distinct sheets, 116 figures, 95 distinct poses.
Sheets are no longer sliced on a guessed grid — a flail's chain crossing a gutter
merges the columns and breaks grid detection entirely — so every figure is
pulled out as its own connected component instead, which is what a pose is.

New animation the game has never had:

| set | frames | when |
| --- | --- | --- |
| hunter_throw | 4 | the wheel leaves her hand, first 0.42s only |
| hunter_hurt | 2 | 0.34s of recoil after a hit |
| hunter_death | 5 | collapse, then three poses settling on the floor |
| knight_death | 6 | the same, for him |

And the knight is finally off six frames: **knight_walk is 12**, built from two
same-grade sheets with the second colour-matched to the first channel by channel
(gain 0.809/0.869/0.873) so the cycle cannot flicker between them. The fourth
knight sheet is the dark regenerated plate and is left out — mixing grades is
exactly the flicker the match is there to prevent.

Two things this forced:

**Death used to be a free-fall.** `killPlayer` gave her -240 of upward velocity
and then dropped her out of the world with no collision, which is fine for a
faceless sprite and absurd for a body: the lying-down poses read as a corpse
sinking through the floor. She now collapses onto whatever she was standing on
and stays there. The old free-fall is kept only for dying in mid-air or down a
pit, where there is nothing to land on and she is off the bottom of the screen
regardless.

**A dying knight was never drawn.** drawEnemy returned early on `!e.alive`, so
his death animation had nowhere to play. Dying knights now keep drawing until
`deadTimer` runs out — which is exactly when the last pose has been on screen
long enough to read — and fade over the final 0.45s.

The shared hunter canvas had to grow from 318 to 618 wide to hold a death
sprawl, which is four times wider than she is tall. Her body fills 0.748 of the
frame either way, so the draw height stays at 197 and she is the same size she
has always been. Frame cost went from 1.20ms to 1.40ms measured interleaved
against the previous build — the player blit is 2.7x the pixels it was, and it
is 1% of a frame budget.

A one-shot animation player was added alongside the looping one. A death that
loops is a body that gets up again.

### The things that fight you die, and they wind up first

Grok's third and fourth drops. Everything is pulled out as connected components
and fingerprinted against everything already built, so the sets below are only
the poses that were actually new — 47 files came in and 13 of them were.

Every enemy in the game has a death now, and three of them have a swing.

| set | frames | drawn at | what it is |
| --- | --- | --- | --- |
| crawler_death | 4 | 70px | sprawls flat, ribs out |
| bat_death | 4 | 123px | crumples wing-spread |
| censer_death | 4 | 228px | the brazier cracks open and spills |
| executioner_death | 4 | 227px | goes down under his own axe |
| boss_death | 4 | 250px | falls flat, wings under him |
| knight_attack | 6 | 172px | the advance with the blade out |
| executioner_attack | 6 | 216px | axe cocked behind the head, round, through |
| boss_attack | 6 | 215px | guard, arms up, crash down, stand, cast |

Each set is composited onto its own canvas sized to that enemy's widest pose, so
a crawler lying down is 671px wide against a censer's 286 and neither one is
padded to the other's frame. The draw height per set is derived from how much of
its own canvas the figure occupies, which is why a crawler corpse is 70px tall
and a boss corpse is 250 without either of them being hand-tuned.

Three things this forced:

**A dying flier hung in the air.** The corpse code only ever counted down a
timer, so a bat killed mid-flap stayed at the altitude it died at and faded out
there, which is the one thing a body never does. Corpses find the ground under
them and fall to it now, at 2100px/s², and stop when they land. The floor they
look for is the first surface BELOW them and it counts one-way ledges — the
existing `groundYNear` picks the nearest solid in either direction and ignores
one-way entirely, which would have dropped anything killed on the gallery
straight through the gallery onto the road. Driven in a browser across eighteen
districts: 71 bodies, 68 landed exactly on the first surface under them, two
died over a void and stayed where they were, none passed through anything.

**Only knights were allowed to die on screen.** `drawEnemy` returned early on
`!e.alive` for everything except a knight — that exemption was added when the
knight was the only one with a death sheet. It is any enemy whose `deadTimer` is
still running now, which is the same 1.4s window the fade already used.

**The boss doesn't wind up.** His verbs are slam, charge, leap and summon, not
windup/swing/recover, so feeding him the executioner's three-beat left him on a
single held frame for every attack he has — and on his idle pose while airborne.
He has his own pose map now: frame 2 lands on the shockwave rather than near it,
the leap holds the arms-up wingspread, the charge holds the forward crouch, and
the summon breaks into the cast frame at the halfway point. The executioner's
strike constant was 0.30 against a slam that is actually 0.26 long, so the first
sixth of his swing arc was being skipped; it matches now.

And his death needed two more corrections before it could play at all. Every
other enemy is timed off a 1.4s countdown, but the boss's countdown is a
placeholder 99 with the real 3.5s living in `bossDeadTimer`, so indexing the
sheet by countdown pinned him on frame 0 for a minute and a half. Deaths run off
the moment of death now, which is the same clock for everyone. And killing him
clears `bossActive`, which is the flag `drawEnemy` uses to decide whether the
boss exists — so the frame after he died he stopped being drawn entirely. He
keeps drawing while his fall plays out. He falls, too: he dies mid-leap often
enough that leaving him hanging in the air was the same bug the fliers had.

Verified in a browser at readable zoom rather than from the sheets: every enemy
type killed on screen, cropped around the body, and the corpse confirmed lying
on the floor it fell to. Frame cost with all eight sets live: 2.40ms median in
open combat, 1.60ms in the boss arena.

Not used yet: the hunter's kick and attack poses. They are good art and there is
no melee button to hang them on — that is a design decision, not a slice.

### Two stale assertions in the suite that ships

`tests/run-logic.mjs` was reporting two failures, and neither was a defect in
the game.

**"no generated flying enemies buried in floors" flagged five fliers.** The
check compared each bat and censer against `supportY` — the TOPMOST solid floor
at that x — which was the right answer when a district was one corridor and is
wrong now that it is four heights: a bat legitimately flying in the undercroft
sits *below* the road, and a vault ledge sits above everything, so the topmost
floor is routinely nowhere near the body. It tests the actual invariant now —
does the flier's hitbox overlap a solid rectangle — and the answer across all
62 generated fliers is no, none of them, which an independent geometry pass
confirmed before the assertion was touched.

**"meta hunter_air is 8 frames" failed because it is eleven on purpose.**
Pinning individual frame counts rots the moment a set is redrawn. Three checks
replace it and cannot rot: every set named in `meta.json` has a folder, every
`count` matches the files actually on disk, and every `loadAnim` call in
`game.js` asks for no more frames than exist. That would have caught the
halved hunter sets on its own.

95 passed, 0 failed.

### One measurement that looked like a regression and was not

The older `regress.mjs` swing sweep reported 41 of 41 swings ending in an
involuntary drop. Its own comment gives it away — it latches a hook through the
debug API and never presses the wheel — and the game releases a hook 0.05s
after the grip goes away, which is the correct behaviour and the whole point of
the hold-grace fix. Run as an A/B over the same 69 hooks in both directions,
changing nothing but whether a pointer is held: **48 latched and 48 dropped
without a grip, 27 latched and 0 dropped with one.** The rope holds when you
hold it. `swing.mjs`, which does hold the pointer, independently reports 31
swings and 0 drops.

The parts of that suite that were measuring something real came back clean:
0 land failures across every solid platform in the world, 0 deaths while
landing, 0 run-right stalls.
