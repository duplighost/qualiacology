// dread.js — THE DREAD SCHEDULER. Manifest #18, id 'dread'. The horror layer between
// destinations: what happens on the road when nothing is trying to kill you.
//
// donor: flare/src/director/dread.js:44-405 — the whole scheduler is lifted. loudGap 26 s,
// softRoll 0.76 with the softIfSinceLoud 13 s override, the interval
// max(2, 11 + rand*11 - tension*3.2) (flare dread.js:366-369), THE TIMER PAUSES RATHER THAN
// RESTARTS across a denied permit (flare dread.js:320-328 — its one real bug and it had no
// symptom), builds that COLLAPSE INTO SILENCE when the loud cooldown says no
// (flare dread.js:242-253), the 3.2 s enforced quiet after anything loud, and the fixed-size
// cancellable payoff ring instead of a raw timeout — flare dread.js:123-177. (Do not write
// the browser timer's NAME followed by a paren anywhere in this file: tests/syntax.mjs:64
// greps for it, and a mention in a comment failed that gate for as long as it existed.)
//
// WHY RESTRAINT IS THE MECHANIC, in FLARE's own words at dread.js:6-8: a scheduler that
// always pays off is a metronome, and a metronome is the one thing that cannot frighten
// anybody twice. 76% of beats are soft, and a build only becomes a stinger if the global
// 26-second loud cooldown allows — otherwise the absence is louder than the hit.
//
// CURFEW'S TWO CHANGES TO FLARE'S NUMBERS, both DESIGN decision 23:
//   1. THE TIMER SCALES WITH TRAVEL SPEED: timer * clamp(6.6/speed, 0.45, 1.0). FLARE's
//      timers were tuned in rooms; at 23 m/s in the car an 11-22 s interval is 250-500 m of
//      road with nothing in it, and the road goes dead. At the car's speed beats fire about
//      2.2x as often.
//   2. THE PERMIT RADIUS SCALES THE OTHER WAY: 40 * clamp(speed/6.6, 1, 2.4) m, so "no dread
//      beat while something is hunting you" still holds when you are covering ground.
//
// PLACEMENT REFUSES RATHER THAN CLIPS (uninvited/src/scares.js:84 and :88-95 — "a figure
// gliding through a wall reads as a rendering bug, not a fright"). Every refusal is counted;
// a gate should assert the count is greater than zero, because a solver that never refuses
// is a solver that is not checking.
//
// DESPAWN IS KEYED TO ATTENTION, NOT TIMERS (qualiacology/marrow/src/entity.js:356 and
// :388-391: observedTime counts up at 1x while watched and down at 2x while not; the hold
// variant is gone the instant you look away, which is far worse than fleeing).
//
// THE LIGHT CENSUS IS PINNED. This file creates no light. The lantern borrows a rover from
// gfx/lights.js:203 and releases it; every other glow here is an additively blended material.
//
// ONE PROGRAM. Every material below is a MeshBasicMaterial with `transparent: true`,
// `fog: false`, FrontSide, no map and no vertex colours, so all of them share one program
// cache key: three's getParameters puts `opaque` (which is `!transparent && blending ===
// NormalBlending`), `fog`, `map`, `vertexColors` and `side` in the key, and blending,
// depthWrite, opacity and colour are state rather than defines. Making the silhouette
// opaque and the eyes additive would have cost a second program. THE PROGRAM BUDGET ITSELF
// LIVES IN EXACTLY ONE PLACE — CFG.render.budget.programsMax — and the integrator measures
// the real count against it. No source file restates that number: four of them used to, with
// three different values, which is how a budget stops meaning anything.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import CFG from '../config.js';
import { clamp, clamp01, TAU } from '../engine/math.js';
import { createTension, scanEnemies, huntingFromLastScan } from './tension.js';
import { createAuditor, CarriedLightAuditor } from './auditor.js';
import { RoadPacer } from './hour-officers.js';
import { peacefulAt } from '../world/safety.js';

// ---------------------------------------------------------------------------
// THE ONE LOCAL TABLE. CFG.director.dread already carries loudGapS / softRoll /
// postLoudQuietS and CFG.director.permitRadius carries the 40; those are READ below and
// never restated. What is here is what CFG has no home for, and every one of them is
// requested for a CFG.dread block in docs/HANDOFF.md.
// ---------------------------------------------------------------------------
export const DREAD_TABLE = Object.freeze({
  softIfSinceLoud: 13,       // [flare dread.js:47] a build is impossible this soon after one
  timerBase: 11,             // [flare dread.js:48-50]
  timerSpan: 11,
  timerPerTension: 3.2,
  timerMin: 2.0,
  tensionPerBeat: 0.06,      // [flare dread.js:54] every beat bleeds the bus toward its floor

  buildRise: 1.35,           // [flare dread.js:56-58]
  buildLevel: 0.34,
  buildHold: 1.10,
  stingerKick: 0.30,

  timers: 8,                 // the payoff ring. Four more slots than any beat uses.

  // DESIGN decision 23 — the speed scaling, both directions.
  speedRef: 6.60,            // CFG.player.SPRINT: the speed the room-tuned numbers assume
  timerScaleMin: 0.45,
  timerScaleMax: 1.00,
  permitScaleMin: 1.00,
  permitScaleMax: 2.40,

  // The soft-beat menu, DESIGN section 5.1.
  softRadiusMin: 11,         // branch snap, at a bearing
  softRadiusMax: 21,
  callRadiusMin: 60,         // the distant call
  callRadiusMax: 140,
  mimicBehind: 2.30,         // [fetch director.js:489] p.x += sin(yaw)*2.3
  mimicOffsetBase: 0.12,     // [fetch director.js:487] offset = 0.12 + approach*0.55
  mimicOffsetPerT: 0.55,
  mimicEverySteps: 2,        // [fetch director.js:485] every other step
  mimicWindow: 7.0,          // seconds the mimic stays armed once a beat starts it

  // The dread-ahead trio, DESIGN section 4 roster row "Watcher / runner / footprints" and
  // eaten-path/src/events.js:417-571.
  watcherMin: 16, watcherMax: 26,      // [eaten-path events.js:425]
  watcherGone: 8,                      // the withdrawal distance — the gut punch
  watcherTtlMin: 9, watcherTtlMax: 16, // [eaten-path events.js:436]
  watcherFade: 0.35,                   // [eaten-path events.js:456]
  watcherDwell: 2.6,                   // seconds of held attention before it lets go
  runnerAheadMin: 12, runnerAheadMax: 20,  // [eaten-path events.js:479]
  runnerDurMin: 0.7, runnerDurMax: 1.1,    // [eaten-path events.js:485]
  runnerHalf: 6.5,                     // metres either side of the crossing point
  runnerStep: 0.16,                    // [eaten-path events.js:511] footfall cadence
  printCountMin: 7, printCountMax: 12, // [eaten-path events.js:528]
  printStride: 0.85,
  printAppear: 0.14,                   // [eaten-path events.js:540] one every 0.14 s
  printDurMin: 7, printDurMax: 11,     // [eaten-path events.js:543]

  eyesMin: 7, eyesMax: 22,             // [eaten-path events.js:214] trunk holes 7-22 m
  eyesStareChance: 0.35,               // [eaten-path events.js:168] 35% look at the camera
  eyesBlinkChance: 0.25,               // [eaten-path events.js:176]
  eyesSacMin: 0.5, eyesSacMax: 1.6,    // [eaten-path events.js:165]
  eyesLifeMin: 5, eyesLifeMax: 10,     // [eaten-path events.js:151]
  eyesFadeIn: 0.8, eyesFadeOut: 1.2,

  lanternAheadMin: 30, lanternAheadMax: 60,
  lanternGone: 9,                      // ...and it is not there when you arrive
  lanternTtl: 34,
  lanternIntensity: 26,                // candela, borrowed from the rover pool
  lanternFade: 0.55,

  stingerTrauma: 0.08,                 // a breath of camera shake, never a takeover
  beatCooldown: 22,                    // seconds before the same beat kind may repeat
  retryAfter: 3.0,                     // a REFUSED beat re-rolls in 3 s, not after a whole
                                       // interval. MEASURED: without this line a run of
                                       // refusals opened a 93 s hole in the road, and
                                       // DESIGN's pacing test forbids a gap over 45 s.
  refuseRetries: 6,                    // placement attempts before a beat gives up entirely
  minClearance: 3.0,                   // [uninvited scares.js:84] metres of clean sightline

  // A DESTINATION'S APRON, and it is read from placedata's `flat.radius` (30-50 m), never
  // guessed. apronK mirrors world/places.js:594 — the apron mesh it builds is 0.86 of the
  // pad, so this is the ground a beat can actually stand on. placeRadiusDefault is that
  // file's own fallback for a site whose disc cannot be found; see _padRadius().
  apronK: 0.86,
  placeRadiusDefault: 22,

  // THE HUSH. A sphere in which the bed drops to zero and the reverb dies, and inside which
  // audio/bed.js:703 holds its silence watchdog because that silence is AUTHORED. Its radius
  // is bed.js's own HUSH_R (bed.js:66) so the two agree by construction rather than by luck.
  hushRadius: 20,
  hushBuild: 2.6,                      // the whole build, so the payoff lands in the hole it dug
  hushCollapse: 1.4,                   // the collapse IS the cut; the absence must be audible
  hushWithdraw: 1.15,                  // [fetch enemies.js:69-85] the silence is the tell

  // D14 / horror 3: THE WATCHER FROM THE CAR. On foot the donor numbers above stand. At
  // 23 m/s, 16-26 m is under a second of travel and the 8 m hush fires at highway speed, so
  // from the car it stands on the verge 48-72 m ahead and the withdrawal is the PASSING.
  watcherCarMin: 48, watcherCarMax: 72,
  watcherCarLat: [3.0, 5.5],           // m off the road heading: the verge, not the lane
  watcherCarFade: 0.12,                // s: gone the frame it leaves the cone, not a dissolve
  // D3: the watcher withdraws under a HELD torch beam — base behaviour (was the Resolve perk).
  // Longer than the perk's dwell was: 3.5 s of beam before it gives, and it gives as a withdrawal.
  watcherResolveS: 3.5,

  // horror 8: the mimic finishes the phrase. You stop; 0.35-0.70 s after your last step it
  // lands ONE more, 1.6 m behind (one step closer), then a short hush. Once per arming.
  mimicCloseMin: 0.35, mimicCloseMax: 0.70,
  mimicCloseBehind: 1.6,
  mimicCloseHush: 0.8,

  // D14: THE HALLUCINATIONS. A rare heavy family with its own rarity budget: the oasis and
  // the laughter share one clock (one per ~12 min, at most miragePerCycle a night), need deep
  // cover far from any road or place, never play from the car, and are "not there" at
  // mirageGone. A lie is allowed to be brighter than the sky; it is the only thing here that is.
  mirageEveryS: 720, miragePerCycle: 2,
  mirageRoadMin: 60, mirageCoverMin: 0.6, miragePlaceClear: 120,
  mirageGone: 14,
  oasisAheadMin: 45, oasisAheadMax: 80,  // m ahead: far enough to walk toward, near enough to read
  oasisTtl: 150,                       // s it waits before it gives up on you
  oasisIntensity: 34,                  // cd, borrowed: warm light on the sand
  oasisCollapse: 0.9,                  // s the palms take to go to nothing
  shoreEveryMin: 9, shoreEveryMax: 13, // s between surf swells while it stands
  oasisPay: 0.30,                      // it WAS pointing at something, three times in ten
  oasisCashMin: 30, oasisCashMax: 60, oasisXp: 40,
  laughterAheadMin: 30, laughterAheadMax: 60,
  laughterGone: 10,                    // m: closer than the oasis; you can nearly see faces
  laughterTtl: 120,
  laughterIntensity: 24,               // cd, warm
  laughterTurn: 0.4,                   // s: every figure turns to face you...
  laughterFade: 0.7,                   // ...and is gone
  laughterReal: 0.25,                  // one of them was real, one time in four
  giggleMin: 2, giggleMax: 4,          // s between giggles, from a random figure
  giggleBehind: 2.3,                   // m: the last one, behind you (the mimic's distance)
  figureRing: 3.2,                     // m: the five stand inside this ring

  // C13: the glint that had a body. 1.5 m off the trunk, on your side of it.
  paleFromEyesOff: 1.5,

  // horror 16 / 17: a candle in an unclaimed window; a parked headlight that dies watched.
  candleIntensity: 9, candleColour: 0xffc98e, candleY: 2.3,   // cd; warm; m above the pad (a window)
  candleWatchS: 4,                     // s watched and it is gone
  candleSecondOff: 4.5,                // m along the wall to the second window
  dyingWatchS: 1.5,                    // s watched before the battery starts to go
  dyingColour: 0xff9a5c,               // what it warms toward as it dies
  dyingGoneGain: 0.3,

  // horror 13: the pacer's one turn. Silence, 'witnessed' at the lamp it condemned, a kick,
  // and the picture is taken for 4 s. Once per night is the species; make the one count.
  pacerHush: 4.0, pacerKick: 0.30, pacerScripted: 0.85, pacerScriptedS: 4,

  // horror 10: THE BLACK HOUR IS FELT. Beats 0.7x apart and fewer soft rolls while it lasts;
  // post's uPulse (contrast + halation) breathes at pulseHz through the 90 s telegraph and
  // holds at pulseBlack through the hour. C18: composed with the trailcam's pulseKick by max.
  blackTimerMul: 0.7, blackSoftRoll: 0.62,
  pulseTelegraph: 0.35, pulseHz: 0.8, pulseBlack: 0.15,
});

const D = DREAD_TABLE;

// D14: per-kind cooldown overrides, in seconds; a kind not listed uses D.beatCooldown (22).
// 'eyes' was the third-heaviest soft beat on a 22 s cooldown on top of two other systems
// painting eyes on trunks; the mirages are rarer than anything else here by design.
const KIND_COOLDOWN = Object.freeze({
  eyes: 90,
  oasis: 720, laughter: 720,
  'pale-from-eyes': 240,     // C13
});

export const BEAT = Object.freeze({ none: 0, soft: 1, build: 2, stinger: 3, collapse: 4 });

/**
 * EVERY NAME THIS LANE EVER ASKS FOR, in one frozen list. The second half of the dread
 * blocker was not the throw — it was that once the throw was gone every beat was SILENT,
 * because none of these existed in the audio lane's bake. "Silence reads as broken" is a law
 * in this project, so the list is data here and is copied verbatim into docs/HANDOFF.md for
 * the audio lane to bake. answer() drops any name that is not on it rather than asking for a
 * sound nobody has agreed to make.
 */
export const BEAT_SOUNDS = Object.freeze([
  'branch',        // a branch snapping at a bearing, 11-21 m out
  'call',          // the distant call, 60-140 m — a place, not a threat
  'mimic',         // your own footfall, one beat late, 2.3 m behind you
  'door',          // a door on the far side of a barn
  'eyes',          // a pair opening in a trunk
  'lantern',       // a light on the road ahead
  'lantern-gone',  // ...and it is not there when you arrive
  'watcher',       // the figure arriving, so the ear places it before the eye does
  'withdraw',      // the watcher leaving as you close. The gut punch
  'brush',         // the runner entering and leaving the crossing — both ends
  'runstep',       // its footfalls, every 0.16 s across
  'footfall',      // a print landing that you never see land
  'stinger',       // the payoff
  'collapse',      // the payoff that did not come, and the bed cutting out instead
  'tell',          // ANIMALS KNOW FIRST — 10-40 s before the Auditor's event
  'witnessed',     // being caught looking
  // ROUND 13: the jump beats' own sounds (audio.js DREAD rows dropImpact/bark/filamentPop/breathEar)
  'drop-impact',   // a body landing from the crown of the tree ahead
  'bark',          // three hounds out of the ferns at once
  'filament-pop',  // your torch dying at the eye
  'breath-ear',    // and a breath at your ear in the dark
  'canopy-rush', 'glass-strain', 'vault-resonance', 'cable-strain',
  // C10 (D14): the AUDIO lane's bakes for the hallucinations and the refuge knock
  'shore',         // soft surf swells from the oasis — a shore the county does not have
  'giggle',        // short breathed laughter from a figure in warm light
  'knock',         // three knuckles on the refuge door (world/refuge.js answers it)
]);

const SOUND_OK = Object.create(null);
for (let i = 0; i < BEAT_SOUNDS.length; i++) SOUND_OK[BEAT_SOUNDS[i]] = true;

// The soft menu. `w` is a weight, not a probability; `heavy` marks the three that put a
// silhouette on the screen and therefore may not follow each other.
const MENU = Object.freeze([
  { kind: 'branch', w: 20, heavy: false },
  { kind: 'call', w: 12, heavy: false },
  { kind: 'mimic', w: 12, heavy: false },
  { kind: 'door', w: 8, heavy: false },
  { kind: 'eyes', w: 6, heavy: false },      // D14: was 14, and see KIND_COOLDOWN
  { kind: 'lantern', w: 8, heavy: false },
  { kind: 'watcher', w: 10, heavy: true },
  { kind: 'runner', w: 8, heavy: true },
  { kind: 'prints', w: 8, heavy: true },
  // D14: the hallucinations. Heavy (a picture on the screen), and behind _mirageRefusal.
  { kind: 'oasis', w: 4, heavy: true, mirage: true },
  { kind: 'laughter', w: 4, heavy: true, mirage: true },
]);

/* ------------------------------------------------------------- module scratch -- */
// The hot path allocates nothing. Everything below is written into and read back out.
const _pos = { x: 0, y: 0, z: 0 };
const _fwd = { x: 0, y: 0, z: 0 };
const _up = new THREE.Vector3(0, 1, 0);   // ROUND 13: the drop's landing burst normal
const _TREE_TAGS = Object.freeze(['tree', 'trunk']);
const _tree = { x: 0, z: 0, r: 0 };
const _cand = { x: 0, y: 0, z: 0, ok: false };
const _spot = { x: 0, y: 0, z: 0 };
const _place = { x: 0, z: 0, radius: D.placeRadiusDefault };
const _col = new THREE.Color();           // horror 17: the dying lantern's warming colour
const _colA = new THREE.Color();
const _fellOut = [];                      // C17: what collision.fellTrees retired; emptied per use

export class Dread {
  static id = 'dread';

  constructor(ctx) {
    this.ctx = ctx;
    this.tension = null;
    this.auditor = null;
    this.root = null;
    this.clock = 0;
    this.enabled = true;
  }

  /* =========================================================== boot ======== */

  async init() {
    const ctx = this.ctx;
    const scene = ctx.scene;
    if (!scene) throw new Error('dread: ctx.scene missing (gfx must come first in the manifest)');
    this.scene = scene;
    this.rng = ctx.rng.fork('dread');
    this.explorationRng = ctx.rng.fork('dread:exploration');

    this.tension = createTension(ctx);
    this.auditor = createAuditor(ctx, this._facade());
    this.auditor.init();

    this.root = new THREE.Group();
    this.root.name = 'dread';
    this.root.matrixAutoUpdate = true;
    scene.add(this.root);

    this._buildKit();
    this.ledgerKeeper = new CarriedLightAuditor(ctx, this);
    this.pacer = new RoadPacer(ctx, this);

    /* ---- scheduler state ------------------------------------------------- */
    this.timer = this._nextInterval();
    this.lastLoud = -1e9;
    this.quietUntil = -1e9;
    this.building = false;
    this.lastBeat = BEAT.none;
    this.lastBeatAt = -1e9;
    this.lastKind = '';
    this.lastHeavyAt = -1e9;
    this.kindAt = Object.create(null);

    // The payoff ring. Fixed length, reused records, never resized; runs on the SIM clock so
    // a test can step it and a dispose can cancel it. [flare dread.js:123-124]
    this.timers = new Array(D.timers);
    for (let i = 0; i < D.timers; i++) {
      this.timers[i] = { on: false, t: 0, tag: 0, serial: 0, x: 0, y: 0, z: 0 };
    }
    this.serial = 1;
    this.TAG = { none: 0, payoff: 1, mimic: 2, breath: 3, giggle: 4 };

    this.stats = {
      beats: 0, soft: 0, builds: 0, stingers: 0, collapses: 0,
      suppressedByGap: 0, suppressedByQuiet: 0, suppressedByPermit: 0,
      refusedPlacement: 0, refusedNoTree: 0, refusedNoRoad: 0, refusedOffBand: 0,
      commissions: 0, commissionsRefused: 0,
      answers: 0, unbakedNames: 0, hushes: 0,
      byKind: Object.create(null),
      permittedSeconds: 0, deniedSeconds: 0,
      // ROUND 13: the jump beats — fired, and refused by kind with the reason counted
      jumps: 0, jumpByKind: Object.create(null), refusedJump: Object.create(null),
    };

    /* ---- ROUND 13: THE JUMP BEATS' STATE ---------------------------------------- */
    this.jumpAt = Object.create(null);     // clock at which each kind last fired
    this.lastJump = '';
    this.backCoverT = 0;                   // seconds walked with a dense stand behind
    this._lastYaw = 0;
    this._forceJump = '';                  // config({ jump: kind }) — the next permitted step
    this.dropS = { on: false, e: null, t: 0, x: 0, y: 0, z: 0, landed: false };
    this.blackoutS = { on: false, t: 0, x: 0, z: 0, revealed: false, coin: false };
    this._offJump = null;
    this.lootReturn = { on: false, t: 0, age: 0, x: 0, z: 0, hushed: false, variant: 0 };
    this.lastLootReturn = -1e9;

    /* ---- D14: the hallucinations' rarity budget, the mimic's close, the pacer's picture,
            the Pale that was a glint, the tree that walked --------------------------- */
    this.lastMirageAt = -1e9;
    this.mirageThisCycle = 0;
    this._lastStepAt = -1e9;               // horror 8: the clock at your last footfall
    this._mimicClosed = false;
    this._pacerScriptedT = 0;              // horror 13: seconds the pacer's turn owns the picture
    this._paleE = null;                    // C13: the officer, until it is released
    this._uprootRec = null;                // C17: the claimed trunk of the last uproot

    /* ---- the mimic: armed by a beat, fed by the player's own footfalls ---- */
    this.mimicT = 0;
    this.mimicCount = 0;
    this._onStep = () => this._mimicStep();
    this._onRespawn = () => {
      // DESIGN section 6: tension floored at 0.55 for 40 s after a death. The body remembers.
      this.tension.holdFloor(0.55, 40);
      this._cancelAll();
    };
    this._onKill = () => {
      // DESIGN section 4: 7 s of protected silence after every CLEAR (VIGIL SILENCE_S). The
      // rhythm is fight -> silence -> wrongness -> fight, never two at once. A clear, not a
      // kill: the bus counts the body that just died, so <= 1 left is the last one.
      if (this.tension.alive30 > 1) return;
      this.quietUntil = Math.max(this.quietUntil, this.clock + CFG.director.silenceS);
    };
    // ROUND 13: an ambush body killed pays the jump bonus on top of its species.
    this._onKillBonus = (p) => {
      const e = p && p.e;
      if (!e || !e.ambush) return;
      const prog = this._sys('progress');
      const J = CFG.director.jump;
      if (prog && typeof prog.award === 'function' && J && J.bonusXp > 0) {
        prog.award(J.bonusXp, e.pos ? e.pos.x : p.x, (e.pos ? e.pos.y : p.y) + 1.0, e.pos ? e.pos.z : p.z, 'jump');
      }
    };
    const bus = ctx.bus;
    this._offs = [];
    if (bus) {
      this._offs.push(bus.on('player:step', this._onStep));
      this._offs.push(bus.on('player:respawn', this._onRespawn));
      this._offs.push(bus.on('enemy:killed', this._onKill));
      this._offs.push(bus.on('enemy:killed', this._onKillBonus));
      this._offs.push(bus.on('world:broke', (p) => {
        if (p && ['crate', 'box', 'strongbox'].includes(p.tag)) this._queueLootReturn(p);
      }));
      this._offs.push(bus.on('pickup:cache', (p) => this._queueLootReturn(p)));
      // C13: fx says a lit wrong-height pair was walked toward. horror 13: the pacer turned.
      this._offs.push(bus.on('eyeshine:approached', (p) => this._onEyesApproached(p)));
      this._offs.push(bus.on('pacer:turned', (p) => this._onPacerTurned(p)));
      // The mirage budget is per night: a new dusk (never the boot announcement) resets it.
      this._offs.push(bus.on('phase:changed', (p) => { if (p && p.phase === 'dusk' && p.prev) this.mirageThisCycle = 0; }));
    }
  }

  /* ---------------------------------------------------------- the prop kit -- */

  _buildKit() {
    // ONE material family. See the header note on the program cache key.
    const base = new THREE.MeshBasicMaterial({
      color: 0x02030a, transparent: true, opacity: 1, fog: false,
      side: THREE.FrontSide, depthWrite: true,
    });
    base.name = 'dread.base';
    this.matBase = base;

    this.matWatcher = base.clone();
    this.matRunner = base.clone();

    // Wet prints read by being BRIGHTER than the ground, not darker: STATUS.md measured the
    // forest floor at a luminance mean of 27.9, and a dark mark on a dark floor is a mark
    // nobody sees. This is the legibility law, not a taste call.
    this.matPrint = base.clone();
    this.matPrint.color.setHex(0x2a3440);
    this.matPrint.opacity = 0.85;
    this.matPrint.depthWrite = false;

    this.matLantern = base.clone();
    this.matLantern.color.setHex(0xffc27a);
    this.matLantern.blending = THREE.AdditiveBlending;
    this.matLantern.depthWrite = false;
    this.matLantern.name = 'dread-lantern';   // ROUND 20: gfx/airlight.js gives it a body

    /* ---- the figure. Merged at boot: one draw, not four. ------------------ */
    const parts = [];
    const body = new THREE.CapsuleGeometry(0.22, .84, 4, 10);
    body.scale(1.2, 1, .62); body.rotateZ(-.065); body.translate(0, 1.25, 0);
    parts.push(body);
    const head = new THREE.SphereGeometry(.17, 12, 9);
    head.scale(.86, 1.46, .88); head.rotateZ(.22); head.translate(.035, 2.01, .04);
    parts.push(head);
    for (const side of [-1, 1]) {
      const leg = new THREE.CapsuleGeometry(.082, .72, 3, 8);
      leg.rotateZ(side * .08); leg.translate(side * .13, .49, 0); parts.push(leg);
      const arm = new THREE.CapsuleGeometry(.072, 1.05, 3, 8);
      arm.rotateZ(side * .13); arm.translate(side * .35, 1.03, .035); parts.push(arm);
      // Separated, overlong fingers and hands below the knees distinguish this from a post.
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.CapsuleGeometry(.019, .24 + i * .018, 2, 5);
        finger.rotateZ(side * (.1 + i * .05));
        finger.translate(side * (.36 + i * .034), .30, .065); parts.push(finger);
      }
    }
    const fig = mergeGeometries(parts, false);
    for (let i = 0; i < parts.length; i++) parts[i].dispose();
    this.figGeo = fig;

    this.watcher = new THREE.Mesh(fig, this.matWatcher);
    this.watcher.visible = false;
    this.watcher.frustumCulled = false;   // it is a cut-out at the fog line; never pop it
    this.root.add(this.watcher);

    this.runner = new THREE.Mesh(fig, this.matRunner);
    this.runner.visible = false;
    this.runner.frustumCulled = false;
    this.root.add(this.runner);

    // A narrow exposed face catches the eye without turning the whole silhouette
    // into an emissive mannequin. It shares the existing Basic shader family.
    this.matFace = base.clone(); this.matFace.color.setHex(0x526359);
    const faceParts = [];
    for (const side of [-1, 1]) {
      const cheek = new THREE.SphereGeometry(.07, 8, 7);
      cheek.scale(.70, 1.2, .36); cheek.translate(side * .083, 1.99, .153); faceParts.push(cheek);
      const jaw = new THREE.CapsuleGeometry(.023, .24, 2, 6);
      jaw.rotateZ(side * .23); jaw.translate(side * .052, 1.78, .15); faceParts.push(jaw);
    }
    this.faceGeo = mergeGeometries(faceParts, false);
    for (const g of faceParts) g.dispose();
    this.watcher.add(new THREE.Mesh(this.faceGeo, this.matFace));

    /* ---- footprints. One flat quad each, scaled up as they land. ---------- */
    // [eaten-path events.js:558-565] the print's arrival IS a scale envelope, so one shared
    // material can carry twelve prints at twelve different ages.
    const printGeo = new THREE.PlaneGeometry(0.20, 0.34);
    printGeo.rotateX(-Math.PI / 2);
    this.printGeo = printGeo;
    this.prints = new Array(D.printCountMax);
    for (let i = 0; i < D.printCountMax; i++) {
      const m = new THREE.Mesh(printGeo, this.matPrint);
      m.visible = false;
      m.frustumCulled = false;
      this.root.add(m);
      this.prints[i] = m;
    }

    /* ---- eyes in the trunks. Three pairs, each its own material so each can
            fade on its own clock, all four sharing one program. ------------- */
    const eyeParts = [];
    const eL = new THREE.SphereGeometry(0.036, 6, 4); eL.translate(-0.055, 0, 0);
    const eR = new THREE.SphereGeometry(0.036, 6, 4); eR.translate(0.055, 0, 0);
    eyeParts.push(eL, eR);
    const eyeGeo = mergeGeometries(eyeParts, false);
    eL.dispose(); eR.dispose();
    this.eyeGeo = eyeGeo;
    this.eyes = new Array(3);
    for (let i = 0; i < 3; i++) {
      const mat = this.matBase.clone();
      mat.color.setHex(0xb8d8c4);
      mat.blending = THREE.AdditiveBlending;
      mat.depthWrite = false;
      mat.opacity = 0;
      const mesh = new THREE.Mesh(eyeGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.eyes[i] = {
        mesh, mat, on: false, t: 0, life: 0, state: 0,  // 0 in, 1 live, 2 out
        sacT: 0, sacX: 0, sacY: 0, blink: 0, x: 0, y: 0, z: 0, owner: null,
      };
    }

    /* ---- the lantern on the road ahead ----------------------------------- */
    const lanternGeo = new THREE.SphereGeometry(0.11, 8, 6);
    this.lanternGeo = lanternGeo;
    this.lantern = {
      mesh: new THREE.Mesh(lanternGeo, this.matLantern),
      mesh2: new THREE.Mesh(lanternGeo, this.matLantern),   // horror 16: the second window
      on: false, t: 0, ttl: 0, x: 0, y: 0, z: 0, handle: null, fade: 1, owner: null,
      // horror 16 / 17: a candle (window height, 9 cd, warm) or a dying headlight; how long
      // you have watched it; its own candela and colour, so present() drives either.
      candle: false, dying: false, dyingOn: false, dyingDone: false, watchT: 0,
      intensity: D.lanternIntensity, colour: 0xffb469,
      second: { on: false, x: 0, y: 0, z: 0, handle: null },
    };
    this.lantern.mesh.visible = false;
    this.lantern.mesh.frustumCulled = false;
    this.lantern.mesh2.visible = false;
    this.lantern.mesh2.frustumCulled = false;
    this.root.add(this.lantern.mesh);
    this.root.add(this.lantern.mesh2);

    /* ---- D14: THE OASIS. Four palm cutouts, a warm disc on the sand and a flat 'water',
            all on clones of the one base material (palms opaque-black, disc and water
            additive): still one program. Built once, positioned per beat, collapsed to
            nothing when you arrive. --------------------------------------------------- */
    this.matPalm = base.clone(); this.matPalm.color.setHex(0x04040a);   // black cutouts against the glow
    this.matSand = base.clone(); this.matSand.color.setHex(0xffb469);
    this.matSand.blending = THREE.AdditiveBlending; this.matSand.depthWrite = false; this.matSand.opacity = 0.35;
    this.matWater = base.clone(); this.matWater.color.setHex(0x7fb0c8);
    this.matWater.blending = THREE.AdditiveBlending; this.matWater.depthWrite = false; this.matWater.opacity = 0.12;
    {
      // One palm: three tapered trunk segments leaning outward and six fronds as thin boxes.
      // A box has both faces; the base material is FrontSide and a plane frond would be
      // culled from behind, and DoubleSide is a second program.
      const pp = [];
      for (let s = 0; s < 3; s++) {
        const seg = new THREE.CylinderGeometry(0.11 - s * 0.02, 0.16 - s * 0.02, 2.2, 6);
        seg.translate(0, 1.1, 0);                 // foot at 0
        seg.rotateZ(-0.10 - s * 0.06);            // leaning, more each segment
        seg.translate(s * 0.34, s * 2.05, 0);
        pp.push(seg);
      }
      const topX = 3 * 0.34 - 0.10, topY = 3 * 2.05 + 0.3;
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.BoxGeometry(0.42, 2.6, 0.03);
        frond.translate(0, -1.2, 0);              // hangs from its root
        frond.rotateX(0.95);                      // droops
        frond.rotateY(f * (TAU / 6) + 0.3);
        frond.translate(topX, topY, 0);
        pp.push(frond);
      }
      this.palmGeo = mergeGeometries(pp, false);
      for (let i = 0; i < pp.length; i++) pp[i].dispose();
    }
    this.oasis = {
      group: new THREE.Group(), palms: [], on: false, t: 0, ttl: 0, x: 0, y: 0, z: 0,
      handle: null, collapsing: false, ct: 0, shoreT: 0, paid: false, sway: 0,
    };
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(this.palmGeo, this.matPalm);
      const a = i * (TAU / 4) + 0.6, r = 2.6 + (i % 2) * 1.3;
      m.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      m.rotation.y = a + Math.PI;                 // leaning out, away from the water
      const sc = 0.85 + i * 0.09;
      m.scale.set(sc, sc, sc);
      m.userData.sc = sc;
      m.frustumCulled = false;
      this.oasis.group.add(m);
      this.oasis.palms.push(m);
    }
    const sandGeo = new THREE.CircleGeometry(6, 24); sandGeo.rotateX(-Math.PI / 2); sandGeo.translate(0, 0.04, 0);
    this.sandGeo = sandGeo;
    const sand = new THREE.Mesh(sandGeo, this.matSand); sand.frustumCulled = false; this.oasis.group.add(sand);
    const waterGeo = new THREE.PlaneGeometry(7, 4.5); waterGeo.rotateX(-Math.PI / 2); waterGeo.translate(0, 0.07, 0);
    this.waterGeo = waterGeo;
    const water = new THREE.Mesh(waterGeo, this.matWater); water.frustumCulled = false; this.oasis.group.add(water);
    this.oasis.group.visible = false;
    this.root.add(this.oasis.group);

    /* ---- D14: THE LAUGHTER. Five figures on the watcher's geometry in the Pale's porcelain
            on ONE shared clone, so one opacity write fades all five; each sways on its own
            phase and every one turns to face you when you get close. ------------------- */
    this.matFigure = base.clone(); this.matFigure.color.setHex(0x7c776c);
    this.figures = new Array(5);
    this.figRec = new Array(5);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(fig, this.matFigure);
      m.visible = false; m.frustumCulled = false;
      this.root.add(m);
      this.figures[i] = m;
      this.figRec[i] = { x: 0, y: 0, z: 0, yaw0: 0, sway: 0 };
    }
    this.laughS = {
      on: false, n: 0, t: 0, ttl: 0, x: 0, y: 0, z: 0, handle: null,
      resolving: false, rt: 0, real: -1, reached: false, giggleT: 0, sway: 0,
    };

    /* ---- live beat records ----------------------------------------------- */
    this.watcherS = {
      on: false, x: 0, y: 0, z: 0, t: 0, ttl: 0, observed: 0, seen: false,
      vanishing: false, vt: 0, approached: false, sway: 0,
      car: false, beamT: 0,      // horror 3: placed from the car; D3: seconds under the torch beam
    };
    this.runnerS = {
      on: false, t: 0, dur: 1, x0: 0, z0: 0, x1: 0, z1: 0, y: 0,
      px: 0, pz: 0, py: 0, cx: 0, cz: 0, cy: 0, stepCd: 0, yaw: 0,
    };
    this.printS = { on: false, t: 0, dur: 0, n: 0 };
    // THE HUSH. One record, never two: a second hush overlapping the first would make the
    // bed's cut ambiguous, so scheduling one while another runs EXTENDS it instead.
    this.hushS = { on: false, t: 0, dur: 0, x: 0, z: 0, r: D.hushRadius };
    this.printRec = new Array(D.printCountMax);
    for (let i = 0; i < D.printCountMax; i++) {
      this.printRec[i] = { x: 0, y: 0, z: 0, yaw: 0, appear: 0, foot: 1, landed: false };
    }
  }

  /* ================================================= sibling readers ======= */
  // Everything below is read LAZILY, at use. VIGIL's combat.js captured ctx.systems.enemies
  // at construction, before enemies existed, and got undefined for the rest of the run.

  _sys(id) { const s = this.ctx.systems; return s ? s.get(id) : null; }

  _player(out) {
    const p = this._sys('player');
    if (p && p.pos) {
      out.x = p.pos.x; out.y = p.pos.y; out.z = p.pos.z;
      return p;
    }
    const c = this.ctx.camera;
    if (c) { out.x = c.position.x; out.y = c.position.y - CFG.player.EYE; out.z = c.position.z; }
    else { out.x = 0; out.y = 0; out.z = 0; }
    return null;
  }

  /** Metres per second the player is travelling, in the car or on foot. */
  _speed() {
    const sh = this.ctx.shared;
    if (sh && sh.inCar) {
      const car = this._sys('car');
      if (car && typeof car.speed === 'number') return Math.abs(car.speed);
    }
    const p = this._sys('player');
    if (p && typeof p.speed === 'number') return p.speed;
    if (p && p.vel) return Math.hypot(p.vel.x, p.vel.z);
    return 0;
  }

  /** Camera yaw/pitch as a unit forward. camera.js:296-301 uses YXZ with pitch on X. */
  _forward(out) {
    const cam = this._sys('camera');
    let yaw = 0, pitch = 0;
    if (cam) { yaw = cam.yaw; pitch = cam.pitch; }
    else {
      const p = this._sys('player');
      if (p) yaw = p.yaw;
    }
    const cp = Math.cos(pitch);
    out.x = -Math.sin(yaw) * cp;
    out.y = Math.sin(pitch);
    out.z = -Math.cos(yaw) * cp;
    return out;
  }

  _eyeY() {
    const cam = this.ctx.camera;
    if (cam) return cam.position.y;
    const p = this._sys('player');
    return (p && p.eyeY) || CFG.player.EYE;
  }

  _groundAt(x, z) {
    const t = this._sys('terrain');
    return t && typeof t.heightAt === 'function' ? t.heightAt(x, z) : 0;
  }

  regionKey() {
    this._player(_pos);
    const t = this._sys('terrain');
    if (!t || typeof t.regionAt !== 'function') return 'pines';
    const r = t.regionAt(_pos.x, _pos.z);   // shared scratch — read .key, never retain
    return (r && r.key) || 'pines';
  }

  /* ================================================= the answering ========= */

  /**
   * EVERY BEAT ANSWERS, and it answers FROM ITS OWN POSITION. Silence reads as broken; an
   * unpanned noise in the dark is a lie about where the room is. The bus event is the
   * contract — `dread:beat {kind, x, y, z, gain}`, that shape on EVERY path out of this
   * class, because the audio lane is the listener and a payload that varies by call site is
   * a payload nobody can bake against.
   *
   * THE CALL IS `audio.dread(kind, x, y, z, gain)`. It is the audio lane's door for this
   * lane and every BEAT_SOUNDS name is baked behind it (docs/HANDOFF.md, this lane).
   *
   * THE FALLBACK BUILDS A REAL SPEC AND NEVER PASSES A BARE NUMBER. audio.js:912 is
   * `playAt(name, x, y, z, o)` and its first line is `const s = o || this.spec(); s.x = x;`
   * — assigning a property to a number primitive is a TypeError in an ES module (always
   * strict), _stepRunner answers every 0.16 s, and main.js stops the loop after three
   * throws in a row. This is the bug that made every dread beat kill the game.
   */
  answer(kind, x, y, z, gain) {
    const g = typeof gain === 'number' && isFinite(gain) ? gain : 1;
    if (this.stats) this.stats.answers++;
    const bus = this.ctx.bus;
    if (bus) bus.emit('dread:beat', { kind, x, y, z, gain: g });
    const A = this._sys('audio');
    if (!A) return;
    // A name nobody has baked is a silent beat, and a silent beat is indistinguishable from
    // a broken one. Count it loudly here rather than discovering it as an absence.
    if (!SOUND_OK[kind]) { if (this.stats) this.stats.unbakedNames++; return; }
    if (typeof A.dread === 'function') { A.dread(kind, x, y, z, g); return; }
    if (typeof A.playAt === 'function' && typeof A.spec === 'function') {
      const s = A.spec();          // a pooled options record, not an allocation
      s.gain = g;
      A.playAt(kind, x, y, z, s);
      return;
    }
    // AND NOTHING AFTER THIS. A third fallback stood here — `A.oneShot(kind, x, y, z, g)` —
    // and the audio lane has never shipped a method by that name: it ships dread()
    // (audio.js:1168) and playAt() (audio.js:1148), both of which are already called above.
    // A `a typeof-function probe` probe for a name nobody ships is a feature that
    // silently never turns on, which is the failure mode this whole project keeps repeating;
    // tests/interfaces.mjs scans the tree for exactly this pattern now. Removed 2026-09-02.
  }

  /* ================================================= the hush ============== */

  /**
   * SCHEDULE A HUSH: `seconds` of authored silence in a sphere centred on (x, z), defaulting
   * to the player because the ear that has to notice the cut is his. Extends rather than
   * replaces, so a collapse landing on the end of a build's hush reads as one held breath.
   *
   * This lane makes no sound of its own for this. It publishes a fact and audio/bed.js:539
   * reads it: inside a hush the bed drops to zero, the reverb dies, and the 45 s silence
   * watchdog holds its breath instead of filling the designed quiet with a wind gust.
   */
  hush(seconds, x, z) {
    const s = seconds > 0 ? seconds : 0;
    const H = this.hushS;
    if (s <= 0 || !H) return;
    if (x === undefined || z === undefined) {
      this._player(_pos);
      H.x = _pos.x; H.z = _pos.z;
    } else { H.x = x; H.z = z; }
    H.r = D.hushRadius;
    const left = H.on ? Math.max(0, H.dur - H.t) : 0;
    H.dur = s > left ? s : left;
    H.t = 0;
    if (!H.on && this.stats) this.stats.hushes++;
    H.on = true;
  }

  /**
   * audio/bed.js:539 calls this every frame at the listener's position with its own HUSH_R.
   * True while a scheduled hush is live over that point. `radius` widens the test for a
   * caller whose ear is bigger than the sphere; it never narrows it, because the hush's size
   * is this lane's to author.
   */
  inHush(x, z, radius) {
    const H = this.hushS;
    if (!H || !H.on) return false;
    const r = (typeof radius === 'number' && radius > H.r) ? radius : H.r;
    const dx = x - H.x, dz = z - H.z;
    return dx * dx + dz * dz <= r * r;
  }

  /** ANIMALS KNOW FIRST. The Auditor's tell, 10-40 s before its event. */
  tell(x, y, z) {
    this.answer('tell', x, y, z, 0.8);
    const bus = this.ctx.bus;
    // A flushed bird is a noise in the world, so the noise channel hears it too and any
    // body that reacts to noise reacts to it. It is a direction, not a decoration.
    if (bus) bus.emit('noise', { x, z, radius: 22, source: 'fauna' });
  }

  /* ================================================= the permit ============ */

  /** The speed-scaled permit radius. DESIGN decision 23 / CFG.director.permitRadius. */
  permitRadius() {
    const s = this._speed();
    const k = clamp(s / D.speedRef, D.permitScaleMin, D.permitScaleMax);
    return CFG.director.permitRadius * k;
  }

  /**
   * Is a dread beat allowed right now. Four gates, in the order they are cheapest to fail:
   * a build already owns the picture, we are inside the post-loud quiet, the pressure
   * director has said no, or something is hunting you inside the permit radius.
   */
  permitOk() {
    if (!this.enabled || this._returning()) return false;
    const p = this._sys('player')?.pos;
    if (p && (peacefulAt(this.ctx,p.x,p.z) || this._sys('refuge')?.isProtected(p.x,p.y,p.z))) return false;
    if (this.ctx.shared.interiorHorror) return false;
    if (this.building) return false;
    if (this.clock < this.quietUntil) return false;
    const dir = this._sys('director');
    if (dir && typeof dir.permitOk === 'function' && !dir.permitOk()) return false;
    // The permit itself: no dread beat while a HUNTING body is inside the speed-scaled
    // radius. tension's own sweep is fixed at 30 m because that is what the formula needs;
    // this one is the permit's radius, which reaches 96 m in the car.
    if (this._huntingWithin(this.permitRadius()) > 0) return false;
    return true;
  }

  /**
   * THE OTHER HALF OF THE PERMIT, and it is deliberately NOT `permitOk()`. The director's
   * own comment (director/director.js:470-481) names the bug: consuming "may a BEAT happen"
   * as a spawn gate means dread switched off blocks every pressure spawn for ever, and
   * anything hunting you inside 40 m blocks the reinforcements — which is exactly the moment
   * the horde is supposed to arrive. The permit is symmetric in its LAW, not in its
   * predicate. So this answers only the two facts DESIGN section 4 actually names about
   * dread: a build owns the picture right now, or a stinger just landed.
   */
  pressureOk() {
    if (this._returning()) return false;
    if (this.ctx.shared.interiorHorror) return false;
    if (this.building) return false;
    if (this.clock - this.lastLoud < CFG.director.dread.postLoudQuietS) return false;
    return true;
  }

  /** Live HUNTING bodies inside `r`. One sweep, no allocation; 0 when enemies do not exist. */
  _huntingWithin(r) {
    this._player(_pos);
    scanEnemies(this.ctx, _pos.x, _pos.z, r);
    return huntingFromLastScan();
  }

  /* ================================================= placement ============= */

  /**
   * The heading a beat should be placed along: the road's if you are near one (so the
   * watcher stands ON the road you are walking down, which is the whole read), otherwise
   * where you are looking.
   */
  _headingAhead() {
    this._player(_pos);
    const cam = this._sys('camera');
    const p = this._sys('player');
    let yaw = cam ? cam.yaw : (p ? p.yaw : 0);
    const roads = this._sys('roads');
    if (roads && typeof roads.roadDistance === 'function' && typeof roads.bestRoadHeadingAt === 'function') {
      if (roads.roadDistance(_pos.x, _pos.z) < CFG.roads.width * 2.2) {
        const h = roads.bestRoadHeadingAt(_pos.x, _pos.z, yaw);
        if (typeof h === 'number' && isFinite(h)) yaw = h;
      }
    }
    return yaw;
  }

  /**
   * SIGHTLINE-VALIDATED PLACEMENT, and it REFUSES rather than clips
   * (uninvited/src/scares.js:84, :88-95). A candidate must:
   *   - be inside the county and on ground the body could actually stand on,
   *   - have an unbroken segment from the eye to its head, so nothing materialises
   *     through a trunk or inside a building,
   *   - and, for a crossing beat, have D.minClearance metres clear on both sides.
   *
   * The one explicit exception is an Auditor prop already lying on the road. Its caller
   * may waive only the eye-to-point ray so it can wait beyond a bend; trunk sight and a
   * crossing's side-to-side clearance remain laws even if that caller passes false.
   * Every refusal is counted; a solver that never refuses is a solver that is not checking.
   */
  /**
   * `trunkR` > 0 means THE POINT IS A TREE, not ground a body could stand on — the eyes
   * beat and the Auditor's trunk_socket family open a pair of eyes IN a trunk.
   *
   * MEASURED 2026-09-02, 1200 trunk candidates on the real map: 902 of them — 75.2%, and
   * every candidate that got past the tree search — were refused by `canOccupy(x, z, 0.34,
   * 1.75)`, and the pass rate was ZERO. Of course it was: solvePlacement's trunk branch
   * snaps the point onto the trunk's own collider on purpose, and then this asked whether a
   * body could stand inside that collider. It cannot, ever. That single line made the eyes
   * beat (menu weight 14 of 98, the third-heaviest soft beat) and two of the Auditor's
   * twenty rows unreachable for the life of the build, with no symptom but an absence.
   *
   * So a trunk placement skips the standing test, and its sightline is measured to a point
   * pulled back out of the bark toward the eye — the eyes are on the near face of the tree,
   * and a ray into the centre of a solid cylinder is blocked by the cylinder.
   */
  _validate(x, z, needClear, trunkR, requireEyeSight = true) {
    const col = this._sys('collision');
    const y = this._groundAt(x, z);
    _cand.x = x; _cand.y = y; _cand.z = z; _cand.ok = false;
    if (!isFinite(y)) return _cand;
    const half = CFG.world.SIZE * 0.5;
    if (x < -half || x > half || z < -half || z > half) return _cand;

    const t = this._sys('terrain');
    if (t && typeof t.slopeAt === 'function' && t.slopeAt(x, z) > 0.72) return _cand;

    const onTrunk = trunkR > 0;
    if (col) {
      if (!onTrunk && typeof col.canOccupy === 'function' && !col.canOccupy(x, z, 0.34, 1.75)) return _cand;
      if (typeof col.segmentClear === 'function') {
        if (onTrunk) {
          this._player(_pos);
          const ey = this._eyeY();
          // Aim at the near face, one bark thickness short of the centre.
          const bx = x - _pos.x, bz = z - _pos.z;
          const bl = Math.hypot(bx, bz) || 1;
          const back = trunkR + 0.20;
          const fx = x - (bx / bl) * back, fz = z - (bz / bl) * back;
          if (!col.segmentClear(_pos.x, ey, _pos.z, fx, y + 1.45, fz)) return _cand;
          _cand.ok = true;
          return _cand;
        }
        if (requireEyeSight) {
          this._player(_pos);
          const ey = this._eyeY();
          if (!col.segmentClear(_pos.x, ey, _pos.z, x, y + 1.45, z)) return _cand;
        }
        if (needClear > 0) {
          // The whole crossing must be clear, not just its middle — otherwise the runner
          // enters the frame through a tree, which reads as a rendering bug.
          const yaw = Math.atan2(x - _pos.x, z - _pos.z);
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          if (!col.segmentClear(x - rx * needClear, y + 0.9, z - rz * needClear,
            x + rx * needClear, y + 0.9, z + rz * needClear)) return _cand;
        }
      }
    }
    _cand.ok = true;
    return _cand;
  }

  /**
   * The Auditor's door. `surface` is one of 'road' | 'offroad' | 'trunk' | 'place' |
   * 'anywhere'. Returns the SHARED `_spot` record or null; copy it, never retain it.
   */
  solvePlacement(surface, rMin, rMax, rng, allowAuditorRoadOcclusion = false) {
    const r = rng || this.rng;
    this._player(_pos);
    const roads = this._sys('roads');
    for (let attempt = 0; attempt < D.refuseRetries; attempt++) {
      const bearing = r.next() * TAU;
      const dist = rMin + r.next() * (rMax - rMin);
      let x = _pos.x + Math.sin(bearing) * dist;
      let z = _pos.z + Math.cos(bearing) * dist;
      let trunkR = 0;

      if (surface === 'road') {
        // nearestRoadPoint wants a Vector2-shaped `out` (roads.js:417 calls out.set(x, z));
        // nearestRoadInfo hands back the same answer as a shared record with no `out` at all,
        // which is one fewer object to own. Read it here — it is scratch, like every other
        // shared return in this codebase.
        if (!roads || typeof roads.nearestRoadInfo !== 'function') { this.stats.refusedNoRoad++; continue; }
        // SAMPLE UP THE ROAD, NOT ACROSS IT. A random bearing off a player who is standing
        // ON a road snaps almost straight back to his feet, because the nearest centreline
        // point to a candidate 40 m out sideways is the one he is standing on. MEASURED: with
        // the band gate below and a raw random bearing the Auditor placed 0 events in 227 s
        // and refused 5 for placement, having previously placed one 1.2 m behind his heel.
        // So when there is a road under him the bearing becomes the road's own heading,
        // forward or back on a coin — which is where a light on the road belongs anyway —
        // and the snap then only has to correct for the curve. Off the road the raw bearing
        // stands, because then the nearest centreline really is somewhere else.
        // ...and it starts from the road, not from the player. MEASURED: with the player
        // 15.6 m off a centreline, 300 of 300 road solves in the band [18, 74] failed —
        // every candidate snapped back to the same stretch of road 15.6 m away, which is
        // under the band. Walking `dist` along the road FROM THE NEAREST ROAD POINT puts
        // the point at hypot(dist, offset) from the player, which is in band by
        // construction for every offset the county can produce.
        const home = roads.nearestRoadInfo(_pos.x, _pos.z, 240);
        if (home && home.hit && typeof roads.bestRoadHeadingAt === 'function') {
          const hx = home.x, hz = home.z;          // shared scratch: read it now
          const h = roads.bestRoadHeadingAt(hx, hz, null);
          if (typeof h === 'number' && isFinite(h)) {
            const sgn = r.next() < 0.5 ? 1 : -1;
            x = hx + (-Math.sin(h)) * dist * sgn;
            z = hz + (-Math.cos(h)) * dist * sgn;
          }
        }
        const info = roads.nearestRoadInfo(x, z, 96);
        if (!info || !info.hit) { this.stats.refusedNoRoad++; continue; }
        x = info.x; z = info.z;
      } else if (surface === 'offroad') {
        if (roads && typeof roads.roadDistance === 'function' && roads.roadDistance(x, z) < CFG.roads.width * 1.6) continue;
      } else if (surface === 'trunk') {
        const col = this._sys('collision');
        if (!col || typeof col.debugNearest !== 'function') { this.stats.refusedNoTree++; continue; }
        const near = col.debugNearest(x, z, 6);
        // A trunk, not a wall: a circle a hand's width to an arm's width across that goes
        // up past head height. debugNearest returns shared scratch, so read it here.
        if (!near || near.kind !== 'circle' || near.radius < 0.10 || near.radius > 1.20 || near.y1 < 2.0) {
          this.stats.refusedNoTree++; continue;
        }
        x = near.x; z = near.z; trunkR = near.radius;
      } else if (surface === 'place') {
        const pl = this._nearPlace(rMax * 2.5);
        if (pl) {
          // On the apron, not on the doorstep: an event standing in the middle of a
          // destination is furniture, and the wrongness belongs at its edge.
          const a = r.next() * TAU;
          const rr = (pl.radius || 12) * (0.85 + r.next() * 0.5);
          x = pl.x + Math.sin(a) * rr;
          z = pl.z + Math.cos(a) * rr;
        }
        // With no place in range this degrades to the open annulus, which is honest: the
        // event still happens, it just does not happen at a door. See docs/HANDOFF.md.
      }

      // THE BAND IS A LAW, AND EVERY SURFACE ABOVE MOVES THE POINT AFTER IT IS SAMPLED.
      //
      // MEASURED 2026-09-02, 257 s of play: the Auditor's `reflector_out_of_line` asked for
      // a lantern on the road between 18 and 74 m and got one **1.2 m behind the player's
      // heel** — bearing 180 deg, distance 1.2 m — which _stepLantern then killed 0.5 s
      // later because it was inside lanternGone (9 m). The whole beat, which is "a light on
      // the road ahead, and it is not there when you arrive", played as a half-second blip
      // at his ankle and answered 'lantern-gone' before he could turn around.
      //
      // The cause is the snap, not the sample: the player was ON a road (roadDistance 1.24),
      // so `nearestRoadInfo` pulled a candidate sampled 40 m out sideways straight back onto
      // the centreline he was standing on. 'trunk' does the same thing at up to 6 m and
      // 'place' re-centres on the apron, which can also be underfoot. The band was checked
      // before those moves and never after, so it was not a constraint at all.
      //
      // So the band is re-checked HERE, after every surface has had its say, and a point
      // that left it is REFUSED like any other bad placement (uninvited/src/scares.js:88-95).
      // A refusal costs D.retryAfter, not a whole interval, so this cannot open a hole.
      const ddx = x - _pos.x, ddz = z - _pos.z;
      const dd2 = ddx * ddx + ddz * ddz;
      if (dd2 < rMin * rMin || dd2 > rMax * rMax) { this.stats.refusedOffBand++; continue; }

      // Every current `road` Auditor row places a flat print or a borrowed lantern, never
      // a body. Those props do not materialise through a tree: they wait on the tarmac and
      // become visible when the road bends/opens. Requiring a clean eye-to-road segment
      // from inside the treeline gave the entire road family a measured 0% solve rate,
      // silently deleting wet prints, the wrong reflector/sign and both one-headlight beats.
      // The exception comes only through the Auditor's facade below; a future direct road
      // caller remains strict unless it deliberately joins that contract.
      const waiveEyeSight = allowAuditorRoadOcclusion && surface === 'road';
      const v = this._validate(x, z, 0, trunkR, !waiveEyeSight);
      if (!v.ok) { this.stats.refusedPlacement++; continue; }
      _spot.x = v.x; _spot.y = v.y; _spot.z = v.z;
      return _spot;
    }
    return null;
  }

  /** A point `dist` metres ahead along the road-or-look heading, offset laterally. */
  _aheadPoint(dist, lat) {
    this._player(_pos);
    const yaw = this._headingAhead();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const x = _pos.x + fx * dist + rx * lat;
    const z = _pos.z + fz * dist + rz * lat;
    _spot.x = x; _spot.z = z; _spot.y = this._groundAt(x, z);
    return _spot;
  }

  /* ================================================= attention ============= */

  /**
   * Is the camera holding on this point. Cone plus an unbroken line — a figure you cannot
   * see through a trunk is not being watched, and treating it as watched is how MARROW's
   * starer used to vanish for no reason the player could perceive.
   */
  watching(x, y, z, coneDot, range) {
    const cam = this.ctx.camera;
    if (!cam) return false;
    const ex = cam.position.x, ey = cam.position.y, ez = cam.position.z;
    const dx = x - ex, dy = y - ey, dz = z - ez;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-4) return true;
    if (range > 0 && d > range) return false;
    this._forward(_fwd);
    const dot = (dx * _fwd.x + dy * _fwd.y + dz * _fwd.z) / d;
    if (dot < coneDot) return false;
    const col = this._sys('collision');
    if (col && typeof col.segmentClear === 'function') return col.segmentClear(ex, ey, ez, x, y, z);
    return true;
  }

  /* ================================================= commissions =========== */

  /**
   * The Auditor's other door: make one of my props real at a point it already solved for.
   * Returns a handle (an owner token) or null when the kit is busy — and a refusal is a
   * legitimate answer, not a failure, because the alternative is two lanterns in one frame.
   */
  commission(prop, x, y, z, owner, opts) {
    let ok = false;
    if (prop === 'footprints') ok = this._startPrints(x, z);
    else if (prop === 'eyes') ok = this._startEyes(x, y, z, owner);
    else if (prop === 'lantern') ok = this._startLantern(x, y, z, owner, opts);
    if (ok) { this.stats.commissions++; return { prop, owner }; }
    this.stats.commissionsRefused++;
    return null;
  }

  decommission(handle) {
    if (!handle) return;
    if (handle.prop === 'lantern' && this.lantern.owner === handle.owner) this._endLantern();
    if (handle.prop === 'eyes') {
      for (let i = 0; i < this.eyes.length; i++) {
        const e = this.eyes[i];
        if (e.on && e.owner === handle.owner && e.state !== 2) { e.state = 2; e.t = 0; }
      }
    }
  }

  /* ================================================= the beats ============= */

  _kindReady(kind) {
    const at = this.kindAt[kind];
    const cd = KIND_COOLDOWN[kind] !== undefined ? KIND_COOLDOWN[kind] : D.beatCooldown;
    return at === undefined || this.clock - at >= cd;
  }

  _pickKind() {
    // Weighted, minus the kinds that are cooling down, minus the heavy ones if a heavy beat
    // ran recently. Three silhouettes in a row is a parade, not a haunting.
    const heavyOk = this.clock - this.lastHeavyAt > D.beatCooldown * 1.6;
    // D14: the hallucinations answer to their own rarity budget as well as the menu's.
    const mirageOk = this._mirageRefusal() === '';
    let total = 0;
    for (let i = 0; i < MENU.length; i++) {
      const m = MENU[i];
      if (!this._kindReady(m.kind)) continue;
      if (m.heavy && !heavyOk) continue;
      if (m.mirage && !mirageOk) continue;
      total += m.w;
    }
    if (total <= 0) return null;
    let r = this.rng.next() * total;
    for (let i = 0; i < MENU.length; i++) {
      const m = MENU[i];
      if (!this._kindReady(m.kind)) continue;
      if (m.heavy && !heavyOk) continue;
      if (m.mirage && !mirageOk) continue;
      r -= m.w;
      if (r <= 0) return m;
    }
    return null;
  }

  _noteKind(kind, heavy) {
    this.kindAt[kind] = this.clock;
    this.lastKind = kind;
    if (heavy) this.lastHeavyAt = this.clock;
    this.stats.byKind[kind] = (this.stats.byKind[kind] || 0) + 1;
  }

  /** The quiet beat. 76% of everything that happens out there. */
  _softBeat() {
    this.stats.soft++;
    this.lastBeat = BEAT.soft;
    this.lastBeatAt = this.clock;
    this.tension.decayBeat(D.tensionPerBeat);

    const m = this._pickKind();
    if (!m) return false;
    let ok = false;
    switch (m.kind) {
      case 'branch': ok = this._beatBranch(); break;
      case 'call': ok = this._beatCall(); break;
      case 'mimic': ok = this._beatMimic(); break;
      case 'door': ok = this._beatDoor(); break;
      case 'eyes': ok = this._beatEyes(); break;
      case 'lantern': ok = this._beatLantern(); break;
      case 'watcher': ok = this._beatWatcher(); break;
      case 'runner': ok = this._beatRunner(); break;
      case 'prints': ok = this._beatPrints(); break;
      case 'oasis': ok = this._beatOasis(); break;
      case 'laughter': ok = this._beatLaughter(); break;
      default: ok = false;
    }
    if (ok) this._noteKind(m.kind, m.heavy);
    return ok;
  }

  /** A branch snapping at a bearing, 11-21 m out. The cheapest "something moved". */
  _beatBranch() {
    this._player(_pos);
    const bearing = this.rng.next() * TAU;
    const r = D.softRadiusMin + this.rng.next() * (D.softRadiusMax - D.softRadiusMin);
    const x = _pos.x + Math.sin(bearing) * r;
    const z = _pos.z + Math.cos(bearing) * r;
    this.answer('branch', x, this._groundAt(x, z) + 1.2, z, 0.55);
    return true;
  }

  /** A distant call. Far enough that it is a place, not a threat. */
  _beatCall() {
    this._player(_pos);
    const bearing = this.rng.next() * TAU;
    const r = D.callRadiusMin + this.rng.next() * (D.callRadiusMax - D.callRadiusMin);
    const x = _pos.x + Math.sin(bearing) * r;
    const z = _pos.z + Math.cos(bearing) * r;
    this.answer('call', x, this._groundAt(x, z) + 2.4, z, 0.8);
    return true;
  }

  /**
   * Arm the mimic. It is fed by your own footfalls, one beat late, from behind you — and it
   * ALSO lands one step of its own on the way in, because a player standing still has no
   * footfalls to copy and a beat that spends its whole interval in silence is
   * indistinguishable from a beat that failed. Every beat answers.
   */
  _beatMimic() {
    this.mimicT = D.mimicWindow;
    this.mimicCount = 0;
    this._mimicClosed = false;              // horror 8: one close per arming
    this._player(_pos);
    const p = this._sys('player');
    const yaw = p ? p.yaw : this._headingAhead();
    const x = _pos.x + Math.sin(yaw) * D.mimicBehind;
    const z = _pos.z + Math.cos(yaw) * D.mimicBehind;
    const offset = D.mimicOffsetBase + this.tension.value * D.mimicOffsetPerT;
    this._after(this.TAG.mimic, offset, x, this._groundAt(x, z) + 0.1, z);
    return true;
  }

  /**
   * donor: fetch/src/director.js:471-494 — every other step, offset 0.12 + t*0.55 seconds,
   * 2.3 m behind you along yaw. FETCH suppresses it while the player runs, because your own
   * noise masks it; the same rule holds here and it is why walking is worse than sprinting.
   */
  _mimicStep() {
    if (this.mimicT <= 0 || this._returning()) return;
    const p = this._sys('player');
    if (p && (p.sprinting || p.tacSprinting)) return;
    this._lastStepAt = this.clock;          // horror 8: the close is timed from this
    this.mimicCount++;
    if (this.mimicCount % D.mimicEverySteps !== 0) return;
    this._player(_pos);
    const yaw = p ? p.yaw : 0;
    const x = _pos.x + Math.sin(yaw) * D.mimicBehind;
    const z = _pos.z + Math.cos(yaw) * D.mimicBehind;
    const offset = D.mimicOffsetBase + this.tension.value * D.mimicOffsetPerT;
    this._after(this.TAG.mimic, offset, x, this._groundAt(x, z) + 0.1, z);
  }

  /**
   * THE APRON RADIUS OF A DESTINATION, in metres — the made ground a beat may stand on.
   *
   * `d.radius` and `d.r` DO NOT EXIST on a placedata.js MAJORS row. The pad size is
   * `d.flat.radius` (world/placedata.js:154-231, 30-50 m), and three rows carry `flat: null`
   * with a `flatId` naming a disc roads.js already authored, whose radius lives in
   * terrain.flats() (M0_SITES radii 46 / 38 / 30). Reading `d.radius || d.r || 14` therefore
   * fell through to a hard 14 m for EVERY major in the county: door beats and apron
   * placements landed deep inside the Cathedral's 50 m pad and short of the small ones.
   *
   * The 0.86 and the 22 m default mirror world/places.js:594-599 exactly, because that is the
   * apron mesh that actually exists on the ground. Sharing the constant by copying it is the
   * weak link here — it is written up in docs/HANDOFF.md as a request for the places lane to
   * expose the number instead.
   */
  _padRadius(def) {
    if (!def) return D.placeRadiusDefault;
    if (def.flat && typeof def.flat.radius === 'number') return def.flat.radius * D.apronK;
    if (def.flatId) {
      const t = this._sys('terrain');           // lazy, at use
      const fl = t && typeof t.flats === 'function' ? t.flats() : null;
      if (fl) {
        for (let i = 0; i < fl.length; i++) {
          if (fl[i].id === def.flatId) return fl[i].r * D.apronK;
        }
      }
      return D.placeRadiusDefault;
    }
    if (typeof def.radius === 'number') return def.radius;
    if (typeof def.r === 'number') return def.r;
    return D.placeRadiusDefault;
  }

  /**
   * The nearest destination within `maxR`, as a plain {x, z, radius}. Reads the places lane
   * through whatever surface it offers: `nearestMajor(x,z)` is what world/places.js:1259
   * actually ships (it returns {id, def, dist} and searches the whole county, so the range
   * check is ours), and `nearest(x,z,r)` is honoured if it ever appears. Shared scratch.
   */
  _nearPlace(maxR) {
    const places = this._sys('places');
    if (!places) return null;
    this._player(_pos);
    if (typeof places.nearestMajor === 'function') {
      const m = places.nearestMajor(_pos.x, _pos.z);
      if (!m || !m.def || m.dist > maxR) return null;
      _place.x = m.def.x; _place.z = m.def.z;
      _place.radius = this._padRadius(m.def);
      _place.kind = m.def.kind;
      return _place;
    }
    // AND NOTHING AFTER THIS. A `places.nearest(x, z, r)` branch stood here as insurance
    // against a rename, and world/places.js has never shipped that name — it ships
    // nearestMajor() (places.js:1565), all() (:1545) and list() (:1552), and nearestMajor is
    // called above. A guard for a method nobody ships is not insurance: it is a door beat
    // that silently never happens, wearing the costume of one that does. Removed 2026-09-02.
    return null;
  }

  /** A door on the far side of a barn, drifting open. Refuses when there is no barn. */
  _beatDoor() {
    const target = this._nearPlace(90);
    if (!target) return false;
    // The FAR side: the sound comes from the wall you cannot see, which is the whole beat.
    const dx = target.x - _pos.x, dz = target.z - _pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const r = target.radius * 0.9;
    const x = target.x + (dx / d) * r;
    const z = target.z + (dz / d) * r;
    const cue = target.kind === 'glasshouse' ? 'glass-strain'
      : target.kind === 'bell-vault' ? 'vault-resonance'
        : target.kind === 'red-quarry' ? 'cable-strain' : 'door';
    this.answer(cue, x, this._groundAt(x, z) + 1.1, z, 0.7);
    return true;
  }

  _beatEyes() {
    const spot = this.solvePlacement('trunk', D.eyesMin, D.eyesMax, this.rng);
    if (!spot) return false;
    return this._startEyes(spot.x, spot.y + 1.55, spot.z, null);
  }

  _beatLantern() {
    const spot = this._aheadPoint(
      D.lanternAheadMin + this.rng.next() * (D.lanternAheadMax - D.lanternAheadMin), 0);
    const v = this._validate(spot.x, spot.z, 0);
    if (!v.ok) { this.stats.refusedPlacement++; return false; }
    return this._startLantern(v.x, v.y + 0.95, v.z, null);
  }

  /**
   * THE WATCHER. It stands 16-26 m ahead along your heading and it is GONE when you close to
   * 8 m. donor: eaten-path/src/events.js:417-460 — including the shape of the payoff, which
   * is that the gut punch is the WITHDRAWAL, not the approach (events.js:454).
   */
  _beatWatcher() {
    if (this.watcherS.on) return false;
    const sh = this.ctx.shared;
    const inCar = !!(sh && sh.inCar);
    for (let a = 0; a < D.refuseRetries; a++) {
      // D14 / horror 3: from the car it stands on the verge 48-72 m ahead, on a coin side;
      // on foot the donor's 16-26 m and +-0.8 m stand. Eye sight is validated either way.
      const d = inCar
        ? D.watcherCarMin + this.rng.next() * (D.watcherCarMax - D.watcherCarMin)
        : D.watcherMin + this.rng.next() * (D.watcherMax - D.watcherMin);
      const lat = inCar
        ? (this.rng.next() < 0.5 ? -1 : 1) * (D.watcherCarLat[0] + this.rng.next() * (D.watcherCarLat[1] - D.watcherCarLat[0]))
        : (this.rng.next() - 0.5) * 1.6;
      const p = this._aheadPoint(d, lat);
      const v = this._validate(p.x, p.z, 0);
      if (!v.ok) { this.stats.refusedPlacement++; continue; }
      const collision = this._sys('collision');
      if (collision && !collision.canOccupy(v.x, v.z, .42, 2.35)) continue;
      const S = this.watcherS;
      S.on = true; S.x = v.x; S.y = v.y; S.z = v.z;
      S.t = 0; S.observed = 0; S.seen = false;
      S.vanishing = false; S.vt = 0; S.approached = false; S.sway = this.rng.next() * TAU;
      S.car = inCar; S.beamT = 0;
      S.ttl = D.watcherTtlMin + this.rng.next() * (D.watcherTtlMax - D.watcherTtlMin);
      this.watcher.position.set(S.x, S.y, S.z);
      this.watcher.rotation.set(0, 0, 0);
      this.matWatcher.opacity = 1;
      this.watcher.visible = true;
      // It answers from its own position, so the ear places it before the eye does.
      this.answer('watcher', S.x, S.y + 1.5, S.z, 0.45);
      return true;
    }
    return false;
  }

  /**
   * THE RUNNER. Crosses your path in 0.7-1.1 s with a brush crash at BOTH ends — the second
   * crash is what tells you it went somewhere rather than stopped existing.
   * donor: eaten-path/src/events.js:465-519.
   */
  _beatRunner() {
    if (this.runnerS.on) return false;
    for (let a = 0; a < D.refuseRetries; a++) {
      const d = D.runnerAheadMin + this.rng.next() * (D.runnerAheadMax - D.runnerAheadMin);
      const p = this._aheadPoint(d, 0);
      const v = this._validate(p.x, p.z, D.minClearance);
      if (!v.ok) { this.stats.refusedPlacement++; continue; }
      const yaw = this._headingAhead();
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const side = this.rng.next() < 0.5 ? 1 : -1;
      const half = D.runnerHalf;
      const S = this.runnerS;
      S.on = true; S.t = 0;
      S.dur = D.runnerDurMin + this.rng.next() * (D.runnerDurMax - D.runnerDurMin);
      S.x0 = v.x - rx * half * side; S.z0 = v.z - rz * half * side;
      S.x1 = v.x + rx * half * side; S.z1 = v.z + rz * half * side;
      S.y = v.y;
      S.cx = S.x0; S.cz = S.z0; S.cy = v.y;
      S.px = S.x0; S.pz = S.z0; S.py = v.y;
      S.stepCd = 0;
      S.yaw = Math.atan2(S.x1 - S.x0, S.z1 - S.z0);
      this.matRunner.opacity = 1;
      this.runner.visible = true;
      this.answer('brush', S.x0, this._groundAt(S.x0, S.z0) + 1.0, S.z0, 0.8);
      return true;
    }
    return false;
  }

  /** FOOTPRINTS, landing one every 0.14 s ahead of you with an unseen footfall each. */
  _beatPrints() {
    const p = this._aheadPoint(3.0, 0);
    // The head of the trail is validated like anything else: a print that lands inside a
    // trunk or through a wall is the same rendering bug as a figure gliding through one.
    const v = this._validate(p.x, p.z, 0);
    if (!v.ok) { this.stats.refusedPlacement++; return false; }
    return this._startPrints(v.x, v.z);
  }

  /* ------------------------------------------------------- prop starters --- */

  _startPrints(x0, z0) {
    if (this.printS.on) return false;
    const yaw = this._headingAhead();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const n = D.printCountMin + Math.floor(this.rng.next() * (D.printCountMax - D.printCountMin + 1));
    let placed = 0;
    for (let i = 0; i < n; i++) {
      const along = i * D.printStride;
      const foot = (i % 2 === 0) ? -1 : 1;
      const lat = foot * 0.20;
      const x = x0 + fx * along + rx * lat;
      const z = z0 + fz * along + rz * lat;
      const y = this._groundAt(x, z);
      if (!isFinite(y)) continue;
      const rec = this.printRec[placed];
      rec.x = x; rec.z = z; rec.y = y + 0.035; rec.yaw = yaw;
      rec.appear = i * D.printAppear;
      rec.foot = foot; rec.landed = false;
      placed++;
    }
    if (placed < 3) { this.stats.refusedPlacement++; return false; }
    this.printS.on = true; this.printS.t = 0; this.printS.n = placed;
    this.printS.dur = D.printDurMin + this.rng.next() * (D.printDurMax - D.printDurMin);
    for (let i = 0; i < placed; i++) {
      const m = this.prints[i];
      const r = this.printRec[i];
      m.position.set(r.x, r.y, r.z);
      m.rotation.set(0, r.yaw, 0);
      m.scale.set(0.001, 0.001, 0.001);
      m.visible = true;
    }
    for (let i = placed; i < D.printCountMax; i++) this.prints[i].visible = false;
    return true;
  }

  _startEyes(x, y, z, owner) {
    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      if (e.on) continue;
      e.on = true; e.owner = owner || null;
      e.t = 0; e.state = 0;
      e.life = D.eyesLifeMin + this.rng.next() * (D.eyesLifeMax - D.eyesLifeMin);
      // D14: the shared eyes budget. fx's glint pool stands down for CFG.fx.eyeshine.exclusionS
      // after this stamp (sim time, main.js ctx.time.t, the clock fx reads too).
      { const sh = this.ctx.shared, tm = this.ctx.time; if (sh && tm) sh.eyesAt = tm.t; }
      e.sacT = 0; e.sacX = 0; e.sacY = 0; e.blink = 0;
      e.x = x; e.y = y; e.z = z;
      e.mat.opacity = 0;
      e.mesh.position.set(x, y, z);
      // Face the player, so the pair reads as two eyes rather than as one smear.
      this._player(_pos);
      e.mesh.rotation.set(0, Math.atan2(_pos.x - x, _pos.z - z), 0);
      e.mesh.visible = true;
      this.answer('eyes', x, y, z, 0.35);
      return true;
    }
    return false;
  }

  /**
   * `opts` (the Auditor's row, through commission): `candle` puts it at window height on the
   * pad at 9 cd, warm (horror 16), `two` adds a second window along the wall, `dying` lets
   * it start to die once you have watched it (horror 17). No opts is the road lantern.
   */
  _startLantern(x, y, z, owner, opts) {
    const L = this.lantern;
    if (L.on) return false;
    const candle = !!(opts && opts.candle);
    if (candle) y = this._groundAt(x, z) + D.candleY;
    L.on = true; L.owner = owner || null;
    L.t = 0; L.ttl = D.lanternTtl; L.fade = 1;
    L.x = x; L.y = y; L.z = z;
    L.candle = candle; L.dying = !!(opts && opts.dying);
    L.dyingOn = false; L.dyingDone = false; L.watchT = 0;
    L.intensity = candle ? D.candleIntensity : D.lanternIntensity;
    L.colour = candle ? D.candleColour : 0xffb469;
    L.mesh.position.set(x, y, z);
    L.mesh.visible = true;
    this.matLantern.opacity = 1;
    // The ONLY dynamic light this file makes exist, and it is borrowed, not created.
    const lights = this._sys('lights');
    if (lights && typeof lights.borrow === 'function') {
      L.handle = lights.borrow(candle ? 'candle' : 'lantern', x, y, z, L.colour, L.intensity, 0);
    }
    if (candle && opts.two) {
      // the second window: along the wall, i.e. across the line from you to the first
      this._player(_pos);
      let ax = x - _pos.x, az = z - _pos.z;
      const al = Math.hypot(ax, az) || 1;
      ax /= al; az /= al;
      const S2 = L.second;
      S2.on = true;
      S2.x = x - az * D.candleSecondOff; S2.z = z + ax * D.candleSecondOff;
      S2.y = this._groundAt(S2.x, S2.z) + D.candleY;
      L.mesh2.position.set(S2.x, S2.y, S2.z);
      L.mesh2.visible = true;
      S2.handle = lights && typeof lights.borrow === 'function'
        ? lights.borrow('candle', S2.x, S2.y, S2.z, L.colour, L.intensity, 0) : null;
    }
    // a candle is set down, not swung: the handle clink, quieter, from the window
    this.answer('lantern', x, y, z, candle ? 0.25 : 0.4);
    return true;
  }

  _endLantern() {
    const L = this.lantern;
    if (!L.on) return;
    const lights = this._sys('lights');
    if (L.handle && lights && typeof lights.release === 'function') lights.release(L.handle);
    L.handle = null;
    L.on = false; L.owner = null;
    L.mesh.visible = false;
    const S2 = L.second;
    if (S2.on) {
      if (S2.handle && lights && typeof lights.release === 'function') lights.release(S2.handle);
      S2.handle = null; S2.on = false;
      L.mesh2.visible = false;
    }
  }

  /* ================================================= build and stinger ===== */

  _startBuild() {
    this.stats.builds++;
    this.building = true;
    this.lastBeat = BEAT.build;
    this.lastBeatAt = this.clock;
    this.tension.takeScripted(clamp01(this.tension.bare + D.buildLevel));
    // The bed holds its breath for the whole build, so whichever way the coin lands — the
    // stinger or the collapse — it lands in a hole this beat dug for it.
    this.hush(D.hushBuild);
    this._after(this.TAG.payoff, D.buildRise + D.buildHold, 0, 0, 0);
  }

  /**
   * THE PAYOFF, and it is a coin the player never sees flipped. If a stinger landed inside
   * the loud gap the build simply stops, and the absence is louder than the hit would have
   * been. [flare dread.js:242-253]
   */
  _resolveBuild() {
    this.building = false;
    if (this.clock - this.lastLoud < CFG.director.dread.loudGapS) {
      this.stats.collapses++;
      this.stats.suppressedByGap++;
      this.lastBeat = BEAT.collapse;
      this.lastBeatAt = this.clock;
      this.tension.releaseScripted();
      // A collapse is not nothing: the bed drops out for a moment and THAT is the beat.
      // Authored silence only stops reading as broken when the cut itself is audible, so the
      // hush carries the hole and 'collapse' is the sound of the cut being made.
      this.hush(D.hushCollapse);
      this._player(_pos);
      this.answer('collapse', _pos.x, _pos.y + CFG.player.EYE, _pos.z, 1);
      return BEAT.collapse;
    }
    this._stinger();
    return BEAT.stinger;
  }

  _stinger() {
    this.stats.stingers++;
    this.lastLoud = this.clock;
    this.quietUntil = this.clock + CFG.director.dread.postLoudQuietS;
    this.lastBeat = BEAT.stinger;
    this.lastBeatAt = this.clock;
    this.tension.releaseScripted();
    this.tension.addKick(D.stingerKick);

    this._player(_pos);
    this.answer('stinger', _pos.x, _pos.y + CFG.player.EYE, _pos.z, 1);
    const bus = this.ctx.bus;
    if (bus) bus.emit('dread:stinger', { kind: this.lastKind || 'build' });

    // A breath of shake, never a takeover. The camera is never taken away (MARROW's law).
    // `fx.trauma` IS A NUMBER (fx/fx.js:52) and the setter is `fx.addTrauma` (fx.js:232).
    // The old `fx.trauma(v)` fallback was a TypeError waiting for the first non-zero frame,
    // so there is exactly one call here and it is the setter.
    const fx = this._sys('fx');
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(D.stingerTrauma);
  }

  /* ================================================= the payoff ring ======= */

  _after(tag, seconds, x, y, z) {
    for (let i = 0; i < D.timers; i++) {
      const s = this.timers[i];
      if (s.on) continue;
      s.on = true; s.t = seconds; s.tag = tag; s.serial = this.serial++;
      s.x = x; s.y = y; s.z = z;
      return s.serial;
    }
    return 0;   // refusing loudly beats overwriting a live payoff
  }

  _cancelAll() {
    for (let i = 0; i < D.timers; i++) { this.timers[i].on = false; this.timers[i].tag = 0; }
    if (this.building) { this.building = false; this.tension.releaseScripted(); }
    // A hush whose payoff was cancelled is a bed that never comes back. Let it go with them.
    if (this.hushS) { this.hushS.on = false; this.hushS.t = 0; this.hushS.dur = 0; }
    if (this.lootReturn) this.lootReturn.on = false;
    // D14: a mirage does not survive a death or the morning; it goes without paying.
    if (this.oasis) this._endOasis(false);
    if (this.laughS) this._endLaughter(false);
    this._paleE = null;
    this._pacerScriptedT = 0;
  }

  // A cache is usually simply a reward. Occasionally the woods answer only after
  // the player has pocketed it and walked away. Independent RNG preserves the
  // ordinary director sequence; the pending beat expires if a real fight starts.
  _queueLootReturn(p) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z) || !this.enabled) return false;
    if (!this.lootReturn || this.lootReturn.on || this.clock < 75 || this.clock - this.lastLootReturn < 90) return false;
    if (this.clock - this.lastLoud < CFG.director.jump.sinceLoudMin) return false;
    if (this.ctx.shared.inCar || !this.permitOk()) return false;
    const places = this._sys('places');
    const near = places && places.nearestMajor ? places.nearestMajor(p.x, p.z) : null;
    if (near && near.def && near.dist < 70 && (near.def.hub || (places.isClaimed && places.isClaimed(near.def.id)))) return false;
    const r = this.explorationRng;
    if (r.next() >= .24) return false;
    this._player(_pos);
    Object.assign(this.lootReturn, { on: true, t: 2.4 + r.next() * 6.8, age: 0,
      x: _pos.x, z: _pos.z, hushed: false, variant: r.next() });
    this.lastLootReturn = this.clock;
    return true;
  }

  _stepLootReturn(dt) {
    const s = this.lootReturn;
    if (!s || !s.on) return;
    s.age += dt;
    if (s.age > 24 || this.ctx.shared.inCar || !this.enabled || this._huntingWithin(40) > 0) { s.on = false; return; }
    if (!this.permitOk()) return;
    s.t -= dt;
    if (s.t > 0) return;
    this._player(_pos);
    if (Math.hypot(_pos.x - s.x, _pos.z - s.z) < 2) return;
    if (!s.hushed) {
      s.hushed = true; s.t = .45 + this.explorationRng.next() * .55;
      this.hush(1.5); return;
    }
    s.on = false;
    // No ambush damage attached to loot. The real pressure director still owns
    // threats; this answer is movement/absence, positioned in a validated lane.
    const seen = s.variant < .50 ? this._beatRunner() : this._beatWatcher();
    this._player(_pos);
    const cam = this._sys('camera'), yaw = cam ? cam.yaw : 0;
    const x = _pos.x + Math.sin(yaw + .55) * 5.5, z = _pos.z + Math.cos(yaw + .55) * 5.5;
    this.answer(seen ? 'canopy-rush' : 'breath-ear', x, _pos.y + (seen ? 3.2 : 1.65), z, seen ? .80 : .48);
    this.lastLoud = this.clock; this.lastBeatAt = this.clock; this.lastBeat = BEAT.stinger;
    this.quietUntil = this.clock + CFG.director.dread.postLoudQuietS;
    this.tension.addKick(.22); this._noteKind('loot-return', true);
  }

  _nextInterval() {
    const t = this.tension ? this.tension.value : 0;
    const base = Math.max(D.timerMin, D.timerBase + this.rng.next() * D.timerSpan - t * D.timerPerTension);
    // DESIGN decision 23. At 23 m/s this is 0.45x, so beats fire about 2.2x as often and
    // the road does not go dead.
    const s = this._speed();
    const scale = clamp(D.speedRef / Math.max(0.001, s), D.timerScaleMin, D.timerScaleMax);
    // horror 10: the black hour is FELT — beats come blackTimerMul apart while it lasts. The
    // 26 s loud gap is untouched, so the metronome law holds.
    const sh = this.ctx.shared;
    const black = sh && sh.phase === 'black' ? D.blackTimerMul : 1;
    return base * scale * black;
  }

  /* ================================================= the step ============== */

  /**
   * ZERO PROGRAMS LINK DURING PLAY. That is the law STATUS.md calls the one that matters,
   * and a pooled prop breaks it by construction: renderer.compile() walks traverseVisible
   * (marrow/src/main.js:172-179), so an invisible watcher links its shader on the frame it
   * first appears — which is, by design, the worst frame in the game to spend 30 ms on.
   * main.js:399 calls warmup() on every system before compileAsync, so everything this file
   * can ever draw is revealed at y = -400 exactly as fx does, and hidden again on the first
   * step. Two visible frames under the boot fade against a mid-game hitch.
   */
  warmup() {
    const Y = -400;
    this.watcher.position.set(0, Y, 0); this.matWatcher.opacity = 1; this.watcher.visible = true;
    this.runner.position.set(2, Y, 0); this.matRunner.opacity = 1; this.runner.visible = true;
    for (let i = 0; i < D.printCountMax; i++) {
      this.prints[i].position.set(4 + i * 0.4, Y, 0);
      this.prints[i].scale.set(1, 1, 1);
      this.prints[i].visible = true;
    }
    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      e.mesh.position.set(-2 - i, Y, 0);
      e.mesh.scale.set(1, 1, 1);
      e.mat.opacity = 1;
      e.mesh.visible = true;
    }
    this.lantern.mesh.position.set(-8, Y, 0);
    this.matLantern.opacity = 1;
    this.lantern.mesh.visible = true;
    this.lantern.mesh2.position.set(-9, Y, 0);
    this.lantern.mesh2.visible = true;
    // D14: the oasis and the five figures share the program above, and are revealed too, so
    // nothing in this kit is ever drawn for the first time in the middle of a night.
    const O = this.oasis;
    O.group.position.set(-20, Y, 0); O.group.visible = true;
    for (let i = 0; i < O.palms.length; i++) { const p = O.palms[i], sc = p.userData.sc; p.scale.set(sc, sc, sc); }
    this.matPalm.opacity = 1; this.matSand.opacity = 0.35; this.matWater.opacity = 0.12;
    for (let i = 0; i < this.figures.length; i++) { this.figures[i].position.set(-30 - i * 1.5, Y, 0); this.figures[i].visible = true; }
    this.matFigure.opacity = 1;
    this._warm = true;
  }

  _hideAll() {
    this.watcher.visible = false;
    this.runner.visible = false;
    for (let i = 0; i < D.printCountMax; i++) this.prints[i].visible = false;
    for (let i = 0; i < this.eyes.length; i++) {
      if (!this.eyes[i].on) this.eyes[i].mesh.visible = false;
    }
    if (!this.lantern.on) { this.lantern.mesh.visible = false; this.lantern.mesh2.visible = false; }
    if (!this.oasis.on) this.oasis.group.visible = false;
    if (!this.laughS.on) for (let i = 0; i < this.figures.length; i++) this.figures[i].visible = false;
  }

  _returning() { return !!(this.ctx.shared?.lateBellFinal || this.ctx.shared?.morningReturned); }

  _finishHour() {
    if (this._hourFinished) return;
    this._hourFinished = true;
    this._cancelAll();
    this.mimicT = 0; this.backCoverT = 0; this._forceJump = '';
    this.dropS.on = false; this.dropS.e = null; this.blackoutS.on = false;
    this.watcherS.on = false; this.runnerS.on = false; this.printS.on = false;
    for (const e of this.eyes) { e.on = false; e.owner = null; }
    this._endLantern();
    this._hideAll();
    // Cancel armed county incidents without awarding a witness or erasing their history.
    for (const s of this.auditor.actives) {
      this.decommission(s.handle);
      s.on = false; s.live = false; s.handle = null; s.prop = null;
    }
    this.tension.reset();
  }

  step(dt) {
    const d = dt > 0 ? dt : 0;
    if (this._warm) { this._warm = false; this._hideAll(); }
    this.clock += d;

    if (this._returning()) {
      this._finishHour();
      // The physical keeper still closes his book before he leaves.
      this.pacer?.step(d); this.ledgerKeeper?.step(d);
      this.stats.deniedSeconds += d;
      return;
    }

    this.tension.update(d);
    // A hunting body owns the picture above the bus: priority is scripted > chase > bus.
    this.tension.setChase(this.tension.hunting > 0 ? 0.62 : 0);

    if (this.mimicT > 0) this.mimicT -= d;

    // horror 8: THE MIMIC FINISHES THE PHRASE. You stopped; one more step lands behind you,
    // closer than the copies were. One only: two is a stranger, one is you.
    if (this.mimicT > 0 && !this._mimicClosed && this.mimicCount >= 2 && this._speed() < 0.3) {
      const since = this.clock - this._lastStepAt;
      if (since >= D.mimicCloseMin && since <= D.mimicCloseMax) {
        this._mimicClosed = true; this.mimicT = 0;
        const p = this._player(_pos);
        const yaw = p ? p.yaw : 0;
        const x = _pos.x + Math.sin(yaw) * D.mimicCloseBehind, z = _pos.z + Math.cos(yaw) * D.mimicCloseBehind;
        this.answer('mimic', x, this._groundAt(x, z) + 0.1, z, 0.34);
        this.hush(D.mimicCloseHush);
      }
    }
    // horror 13: the pacer's turn owned the picture; give it back on time, never under a build
    if (this._pacerScriptedT > 0) {
      this._pacerScriptedT -= d;
      if (this._pacerScriptedT <= 0 && !this.building) this.tension.releaseScripted();
    }
    // C13: the Pale that was a glint. Released (under your gaze, or close): it withdrew. A
    // body you shot is not a withdrawal.
    const PE = this._paleE;
    if (PE && !PE.alive) {
      if (!(PE.hp <= 0) && PE.pos) this.answer('withdraw', PE.pos.x, PE.pos.y + 1.4, PE.pos.z, 0.7);
      this._paleE = null;
    }

    // ROUND 13: the jump beats' running parts (the drop's landing, the blackout's return),
    // the stand-behind clock, and a forced beat from config().
    this._stepJump(d);

    const H = this.hushS;
    if (H.on) { H.t += d; if (H.t >= H.dur) { H.on = false; H.t = 0; H.dur = 0; } }

    // Payoffs run whether or not the scheduler is permitted: a build that was legally
    // started must be allowed to resolve. Cancelling one is what _cancelAll is for.
    for (let i = 0; i < D.timers; i++) {
      const s = this.timers[i];
      if (!s.on) continue;
      s.t -= d;
      if (s.t > 0) continue;
      s.on = false;
      const tag = s.tag;
      s.tag = 0;
      if (tag === this.TAG.payoff) this._resolveBuild();
      else if (tag === this.TAG.mimic) this.answer('mimic', s.x, s.y, s.z, 0.30);
      else if (tag === this.TAG.giggle) this.answer('giggle', s.x, s.y, s.z, 0.6);   // D14: the last one, behind you
      else if (tag === this.TAG.breath) {
        // ROUND 13: the blackout's breath, at the ear, from just behind
        this._player(_pos);
        const cam = this._sys('camera');
        const yaw = cam ? cam.yaw : 0;
        this.answer('breath-ear', _pos.x + Math.sin(yaw) * 0.4, s.y, _pos.z + Math.cos(yaw) * 0.4, 0.8);
      }
    }

    this._stepWatcher(d);
    this._stepRunner(d);
    this._stepPrints(d);
    this._stepEyes(d);
    this._stepLantern(d);
    this._stepOasis(d);
    this._stepLaughter(d);
    this.pacer?.step(d);
    this.ledgerKeeper?.step(d);
    this._stepLootReturn(d);
    if (this.lootReturn && this.lootReturn.on && this.lootReturn.hushed) return;

    this.auditor.step(d);

    const permitted = this.permitOk();
    if (permitted) this.stats.permittedSeconds += d;
    else this.stats.deniedSeconds += d;

    if (!permitted) { this.stats.suppressedByPermit++; return; }
    if (this.clock < this.quietUntil) { this.stats.suppressedByQuiet++; return; }

    // THE TIMER PAUSES, IT DOES NOT RESTART. Re-rolling on every rising edge was FLARE's one
    // real bug and it had no symptom: accumulating across denied stretches is what makes a
    // quiet stretch a real slice of the budget rather than a reset button.
    // [flare dread.js:320-328]
    this.timer -= d;
    if (this.timer > 0) return;
    this.timer = this._nextInterval();
    this.stats.beats++;

    // ROUND 13: THE JUMP takes the interval when its gates hold — dense cover, off the road,
    // on foot at a walk, nothing hunting, long enough since the last loud beat, its own
    // cooldown. It is loud by definition and shares the 26 s loud gap.
    if (this._tryJump('')) return;

    // THE ROLL. rand < 0.76 OR sinceLoud < 13 -> soft. Restraint is the default and the
    // build is the exception, which is the inversion that makes the build mean anything.
    const sinceLoud = this.clock - this.lastLoud;
    // horror 10: fewer soft rolls through the black hour, so more builds and more silence.
    const sh = this.ctx.shared;
    const softRoll = sh && sh.phase === 'black' ? D.blackSoftRoll : CFG.director.dread.softRoll;
    if (this.rng.next() < softRoll || sinceLoud < D.softIfSinceLoud) {
      // A beat that REFUSED its placement has not happened, so it must not cost a whole
      // interval. It re-rolls in 3 s instead. Three refusals in a row was a minute and a
      // half of empty road; see D.retryAfter.
      if (!this._softBeat()) this.timer = Math.min(this.timer, D.retryAfter);
    } else this._startBuild();
  }

  /* ============================================ ROUND 13: THE JUMP BEATS ===== */

  /** Per-step bookkeeping for the jump beats. */
  _stepJump(d) {
    const J = CFG.director.jump;
    // the stand-behind clock: seconds walked with dense cover six metres behind, reset when
    // he looks round (a yaw swing over 1.2 rad) or stops
    const cam = this._sys('camera');
    const yaw = cam ? cam.yaw : 0;
    let dy = yaw - this._lastYaw;
    while (dy > Math.PI) dy -= TAU;
    while (dy < -Math.PI) dy += TAU;
    this._lastYaw = yaw;
    const sp = this._speed();
    const sh = this.ctx.shared;
    const inCar = !!(sh && sh.inCar);
    if (Math.abs(dy) > 1.2 || inCar || sp < 1.5 || sp > J.speedMax) this.backCoverT = 0;
    else {
      this._player(_pos);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const flora = this._sys('flora');
      const c = flora && typeof flora.coverAt === 'function' ? flora.coverAt(_pos.x - fx * 6, _pos.z - fz * 6) : 0;
      this.backCoverT = c >= 0.75 ? this.backCoverT + d : 0;
    }

    // the drop's landing
    const S = this.dropS;
    if (S.on) {
      S.t += d;
      const e = S.e;
      if (!e || !e.alive) { S.on = false; S.e = null; }
      else if (!S.landed && !e.airborne) {
        S.landed = true;
        this.answer('drop-impact', e.pos.x, e.pos.y + 0.4, e.pos.z, 1.0);
        const fx = this._sys('fx');
        if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.22);
        if (fx && typeof fx.impact === 'function') { _up.x = 0; _up.y = 1; _up.z = 0; try { fx.impact('rock', e.pos, _up, 1.2); } catch (err) { void err; } }
        S.on = false; S.e = null;
      } else if (S.t > 4) { S.on = false; S.e = null; }
    }

    // the blackout's return
    const B = this.blackoutS;
    if (B.on) {
      B.t += d;
      if (!B.revealed && B.t >= J.blackoutRevealAt) {
        B.revealed = true;
        this._blackoutReveal();
      }
      if (B.t >= J.blackoutS + 0.4) B.on = false;
    }

    // a forced beat (config({ jump })): fires on the first permitted step, gates aside
    if (this._forceJump) {
      const kind = this._forceJump;
      if (this.permitOk() && !this.building) {
        this._forceJump = '';
        this._tryJump(kind);
      }
    }
  }

  /** The common gate. Returns '' when the kind may fire, else the reason it may not. */
  _jumpRefusal(kind, forced) {
    const J = CFG.director.jump;
    const sh = this.ctx.shared;
    if (sh && sh.inCar) return 'in-car';
    if (!forced) {
      if (this.clock - this.lastLoud < J.sinceLoudMin) return 'since-loud';
      const at = this.jumpAt[kind];
      if (at !== undefined && this.clock - at < J.everyS[kind]) return 'cooldown';
      const region = this.regionKey();
      if (region !== 'pines' && region !== 'ridge' && region !== 'marsh') return 'region';
      this._player(_pos);
      const flora = this._sys('flora');
      const cover = flora && typeof flora.coverAt === 'function' ? flora.coverAt(_pos.x, _pos.z) : 0;
      if (cover < J.coverMin) return 'cover';
      const roads = this._sys('roads');
      if (roads && typeof roads.roadDistance === 'function' && roads.roadDistance(_pos.x, _pos.z) < J.roadMin) return 'road';
      if (this._speed() > J.speedMax) return 'speed';
      if (this.tension && this.tension.hunting > 0) return 'hunting';
      if (this._hasNearbyPlace(J.placeClear)) return 'place';
    }
    const en = this._sys('enemies');
    if (!en || typeof en.spawn !== 'function') return 'no-enemies';
    if (kind === 'uproot') {
      // C17: the forest and the collider bake both have to be able to give a tree up
      const flora = this._sys('flora');
      if (!flora || typeof flora.claimTrunk !== 'function') return 'no-flora';
      const col = this._sys('collision');
      if (!col || typeof col.fellTrees !== 'function') return 'no-collision';
    }
    if (kind === 'turn' && this.backCoverT < J.turnWalkS && !forced) return 'walk';
    if (kind === 'blackout') {
      const L = this._sys('lights');
      if (!L || typeof L.torchOn !== 'function' || !L.torchOn()) return 'torch-off';
      if (typeof L.torchFaulted === 'function' && L.torchFaulted()) return 'faulted';
    }
    if (kind === 'pack') {
      const p = this._sys('player');
      if (p && typeof p.hp === 'number' && p.hp < J.packMinHp) return 'hp';
      if (p && typeof p.sinceHurt === 'number' && p.sinceHurt < J.packSinceHurtS) return 'hurt';
      const ph = sh && sh.phase;
      if (ph !== 'night' && ph !== 'black') return 'phase';
    }
    return '';
  }

  /** Is an authored place within r metres (a beat never plays in somebody's yard). */
  _hasNearbyPlace(r) {
    const places = this._sys('places');
    if (!places || typeof places.all !== 'function') return false;
    this._player(_pos);
    const all = places.all();
    for (let i = 0; i < all.length; i++) {
      const q = all[i];
      if (Math.hypot(q.x - _pos.x, q.z - _pos.z) < r) return true;
    }
    return false;
  }

  /**
   * Pick and fire a jump beat. `force` names a kind (config) and skips the pacing gates but
   * not the physical ones. Returns true when a beat fired and took the interval.
   */
  _tryJump(force) {
    const J = CFG.director.jump;
    if (!J) return false;
    const forced = !!force;
    let kind = force;
    if (!kind) {
      // the ready kinds, weighted; the drop is the commonest, the pack the rarest
      const W = { turn: 6, drop: 6, blackout: 5, pack: 4, uproot: 5 };
      let total = 0;
      for (const k in W) if (this._jumpRefusal(k, false) === '') total += W[k];
      if (total <= 0) return false;
      let r = this.rng.next() * total;
      for (const k in W) {
        if (this._jumpRefusal(k, false) !== '') continue;
        r -= W[k];
        if (r <= 0) { kind = k; break; }
      }
      if (!kind) return false;
    } else {
      const why = this._jumpRefusal(kind, true);
      if (why) { this.stats.refusedJump[kind + ':' + why] = (this.stats.refusedJump[kind + ':' + why] || 0) + 1; return false; }
    }
    let ok = false;
    switch (kind) {
      case 'turn': ok = this._beatTurn(); break;
      case 'drop': ok = this._beatDrop(); break;
      case 'pack': ok = this._beatPack(); break;
      case 'blackout': ok = this._beatBlackout(); break;
      case 'uproot': ok = this._beatUproot(); break;
      default: ok = false;
    }
    if (!ok) {
      this.stats.refusedJump[kind + ':placement'] = (this.stats.refusedJump[kind + ':placement'] || 0) + 1;
      this.stats.refusedPlacement++;
      return false;
    }
    this.stats.jumps++;
    this.stats.jumpByKind[kind] = (this.stats.jumpByKind[kind] || 0) + 1;
    this.jumpAt[kind] = this.clock;
    this.lastJump = kind;
    this.lastLoud = this.clock;
    this.quietUntil = this.clock + CFG.director.dread.postLoudQuietS;
    this.lastBeat = BEAT.stinger;
    this.lastBeatAt = this.clock;
    this.backCoverT = 0;
    this._noteKind(kind, true);
    this.tension.addKick(D.stingerKick);
    const bus = this.ctx.bus;
    if (bus) bus.emit('dread:jump', { kind, x: _spot.x, z: _spot.z });
    return true;
  }

  /**
   * THE TURN. A hunter standing 2.5 m behind you, arrived while the stand at your back had
   * your attention, holding its ground for turnHoldS and then attacking. Its arrival is the
   * watcher's cloth-and-breath tell; your own footstep, one beat late, is armed so the copy
   * is what makes you turn; and the moment you see it, 'witnessed' — being caught looking.
   * In dusk and dawn the hunter is not abroad, so the pallbearer stands there instead.
   */
  _beatTurn() {
    const J = CFG.director.jump;
    const en = this._sys('enemies');
    const cam = this._sys('camera');
    const p = this._player(_pos);
    if (!en || !p) return false;
    const yaw = cam ? cam.yaw : (p.yaw || 0);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const x = _pos.x - fx * J.turnBehind, z = _pos.z - fz * J.turnBehind;
    // ground behind him, and nothing solid there: no eye-sight test, it is behind him
    const c = this._validate(x, z, 0, 0, false);
    if (!c.ok) return false;
    const col = this._sys('collision');
    if (col && typeof col.canOccupy === 'function' && !col.canOccupy(x, z, 0.48, 2.2)) return false;
    const sh = this.ctx.shared;
    const ph = sh && sh.phase;
    const species = (ph === 'night' || ph === 'black') ? 'hunter' : 'pallbearer';
    const e = en.spawn(species, x, z, { ambush: true, ambushS: J.turnAmbushS, holdS: J.turnHoldS, riseS: 0.22, awake: true });
    if (!e) return false;
    _spot.x = x; _spot.z = z; _spot.y = c.y;
    this.answer('watcher', x, c.y + 1.5, z, 0.7);
    // arm the mimic: his own footstep behind him, one beat late
    this.mimicT = D.mimicWindow;
    this.mimicCount = 0;
    this._turnE = e;
    this._turnSeen = false;
    return true;
  }

  /**
   * THE DROP. A hound out of the crown of the tree ahead: the crown cracks, it falls six
   * metres and lands three metres in front of you, and it is on you before it has finished
   * getting up. Needs a trunk 2-3.5 m off the point three metres ahead, a clean landing, and a
   * free hound.
   */
  _beatDrop() {
    const J = CFG.director.jump;
    const en = this._sys('enemies');
    const col = this._sys('collision');
    if (!en) return false;
    const ahead = this._aheadPoint(3.0, 0);
    const ax = ahead.x, az = ahead.z;
    // a marked tree near the landing: the nearest trunk to the point three metres ahead,
    // between dropTreeMin and dropTreeMax from it, thick enough to hold a crown
    let tree = null;
    if (col && typeof col.nearestTagged === 'function') {
      const n = col.nearestTagged(ax, az, J.dropTreeMax + 1.0, _TREE_TAGS);
      if (n && n.radius >= 0.30) {
        const d = Math.hypot(n.x - ax, n.z - az);
        if (d >= J.dropTreeMin && d <= J.dropTreeMax) {
          _tree.x = n.x; _tree.z = n.z; _tree.r = n.radius;
          tree = _tree;
        }
      }
    }
    if (!tree) return false;
    const c = this._validate(ax, az, 1.2, 0, false);
    if (!c.ok) return false;
    if (col && typeof col.canOccupy === 'function' && !col.canOccupy(ax, az, 0.42, 1.2)) return false;
    const e = en.spawn('hound', ax, az, { ambush: true, ambushS: 6, riseS: 0.05, awake: true, feetY: c.y + J.dropH, airborne: true });
    if (!e) return false;
    _spot.x = ax; _spot.z = az; _spot.y = c.y;
    // the crown cracks overhead
    this.answer('branch', tree.x, c.y + J.dropH, tree.z, 0.9);
    this.dropS.on = true; this.dropS.e = e; this.dropS.t = 0; this.dropS.landed = false;
    this.dropS.x = ax; this.dropS.y = c.y; this.dropS.z = az;
    return true;
  }

  /**
   * THE UPROOT (D14, C17). A tree that was flora until you were close. The trunk two to four
   * and a half metres off the point three metres ahead is claimed from the forest (flora hides
   * the instance, collision retires its circle) and a treant stands where it stood — awake,
   * facing you, the crown rushing and a branch cracking. It is under WALK, so you can always
   * leave; what you cannot do is walk past it. The spawn comes AFTER the collider is retired,
   * because enemies.spawn refuses ground a trunk still occupies. A refused spawn gives the
   * forest its tree back, collider and all.
   */
  _beatUproot() {
    const J = CFG.director.jump;
    const en = this._sys('enemies');
    const col = this._sys('collision');
    const flora = this._sys('flora');
    if (!en || !col || !flora || typeof flora.claimTrunk !== 'function' || typeof col.fellTrees !== 'function') return false;
    const ahead = this._aheadPoint(3.0, 0);        // _pos is the player after this
    const ax = ahead.x, az = ahead.z;
    const yaw = this._headingAhead();
    const fwx = -Math.sin(yaw), fwz = -Math.cos(yaw);
    let tree = null;
    if (typeof col.nearestTagged === 'function') {
      const n = col.nearestTagged(ax, az, J.uprootTreeMax + 1.0, _TREE_TAGS);
      if (n && n.radius >= 0.30) {
        const d = Math.hypot(n.x - ax, n.z - az);
        // in the band, and AHEAD of him: a tree at his heel is not a thing he walked up to
        if (d >= J.uprootTreeMin && d <= J.uprootTreeMax && (n.x - _pos.x) * fwx + (n.z - _pos.z) * fwz > 0.8) {
          _tree.x = n.x; _tree.z = n.z; _tree.r = n.radius;
          tree = _tree;
        }
      }
    }
    if (!tree) return false;
    // a trunk placement: sight to the bark, no standing test (the tree is what stands there)
    const c = this._validate(tree.x, tree.z, 0, tree.r, true);
    if (!c.ok) return false;
    const rec = flora.claimTrunk(tree.x, tree.z, 1.2);
    if (!rec) { this.stats.refusedNoTree++; return false; }
    _fellOut.length = 0;
    col.fellTrees(tree.x, tree.z, 0.6, _fellOut, 1);
    // enemies' yaw convention is facing = (-sin, -cos), so facing him is this
    const face = Math.atan2(-(_pos.x - tree.x), -(_pos.z - tree.z));
    const e = en.spawn('treant', tree.x, tree.z, { ambush: true, ambushS: 8, riseS: 1.4, awake: true, yaw: face });
    if (!e) {
      if (typeof flora.restoreTrunk === 'function') flora.restoreTrunk(rec);
      if (typeof col.restoreTree === 'function') for (let i = 0; i < _fellOut.length; i++) col.restoreTree(_fellOut[i]);
      _fellOut.length = 0;
      return false;
    }
    _fellOut.length = 0;
    this._uprootRec = rec;
    _spot.x = tree.x; _spot.z = tree.z; _spot.y = c.y;
    this.answer('canopy-rush', tree.x, c.y + 6.5, tree.z, 0.9);   // the crown, letting go
    this.answer('branch', tree.x, c.y + 2.0, tree.z, 0.8);
    const fx = this._sys('fx');
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.2);
    return true;
  }

  /**
   * THE PACK. Three hounds out of the ferns 9-12 m ahead, at once, already coming — the one
   * exception to the director's arrival window, which is told so it closes behind them.
   */
  _beatPack() {
    const J = CFG.director.jump;
    const en = this._sys('enemies');
    const col = this._sys('collision');
    const flora = this._sys('flora');
    if (!en) return false;
    this._player(_pos);
    const yaw = this._headingAhead();
    let found = false, x = 0, z = 0, y = 0;
    const tries = [0, 0.35, -0.35, 0.7, -0.7];
    for (let i = 0; i < tries.length && !found; i++) {
      const a = yaw + tries[i];
      const dist = J.packAhead[0] + this.rng.next() * (J.packAhead[1] - J.packAhead[0]);
      const px = _pos.x - Math.sin(a) * dist, pz = _pos.z - Math.cos(a) * dist;
      const cover = flora && typeof flora.coverAt === 'function' ? flora.coverAt(px, pz) : 1;
      if (cover < 0.6) continue;
      const c = this._validate(px, pz, 0, 0, false);
      if (!c.ok) continue;
      if (col && typeof col.canOccupy === 'function' && !col.canOccupy(px, pz, 0.42, 1.1)) continue;
      found = true; x = px; z = pz; y = c.y;
    }
    if (!found) return false;
    const lead = en.spawn('hound', x, z, { ambush: true, ambushS: 6, pack: J.packSize, riseS: 0.14, awake: true });
    if (!lead) return false;
    const dir = this._sys('director');
    if (dir && typeof dir.noteArrival === 'function') dir.noteArrival(J.packSize);
    _spot.x = x; _spot.z = z; _spot.y = y;
    this.answer('bark', x, y + 0.6, z, 1.0);
    this.answer('brush', x, y + 0.5, z, 0.8);
    const fx = this._sys('fx');
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.15);
    return true;
  }

  /**
   * THE BLACKOUT. Your torch pops out for blackoutS seconds. A breath at your ear in the dark.
   * When the light comes back, three times in ten something is standing 1.4 m in front of
   * you (the Standing Kind, which only moves when you look away); otherwise there is the
   * sound of something withdrawing behind you, and nothing to see.
   */
  _beatBlackout() {
    const J = CFG.director.jump;
    const L = this._sys('lights');
    if (!L || typeof L.torchFault !== 'function') return false;
    const p = this._player(_pos);
    if (!p) return false;
    L.torchFault(J.blackoutS);
    const ey = this._eyeY();
    this.answer('filament-pop', _pos.x, ey, _pos.z, 1.0);
    const fx = this._sys('fx');
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.10);
    const B = this.blackoutS;
    B.on = true; B.t = 0; B.revealed = false;
    B.coin = this.rng.next() < J.blackoutRevealChance;
    B.x = _pos.x; B.z = _pos.z;
    _spot.x = _pos.x; _spot.z = _pos.z; _spot.y = _pos.y;
    // the breath at the ear, a third of a second in
    this._after(this.TAG.breath, 0.35, _pos.x, ey, _pos.z);
    return true;
  }

  _blackoutReveal() {
    const B = this.blackoutS;
    const en = this._sys('enemies');
    const col = this._sys('collision');
    const cam = this._sys('camera');
    const p = this._player(_pos);
    if (!p) return;
    const yaw = cam ? cam.yaw : (p.yaw || 0);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let placed = false;
    if (B.coin && en && typeof en.spawn === 'function') {
      const x = _pos.x + fx * 1.4, z = _pos.z + fz * 1.4;
      const c = this._validate(x, z, 0, 0, true);
      if (c.ok && !(col && typeof col.canOccupy === 'function' && !col.canOccupy(x, z, 0.34, 1.78))) {
        const e = en.spawn('standing', x, z, { ambush: true, ambushS: 4, riseS: 0.05, awake: true });
        if (e) {
          placed = true;
          const fxs = this._sys('fx');
          if (fxs && typeof fxs.addTrauma === 'function') fxs.addTrauma(0.18);
        }
      }
    }
    if (!placed) this.answer('withdraw', _pos.x - fx * 6, _pos.y + 1.4, _pos.z - fz * 6, 0.6);
  }

  /* ------------------------------------------------------- the live props -- */

  _stepWatcher(d) {
    if (this.ctx.shared?.lateBellFinal || this.ctx.shared?.morningReturned) {
      this.watcherS.on = false; this.watcher.visible = false; return;
    }
    // ROUND 13: THE TURN's payoff — the moment his eye lands on the body behind him.
    const T = this._turnE;
    if (T && !this._turnSeen) {
      if (!T.alive) { this._turnE = null; }
      else if (this.watching(T.pos.x, T.pos.y + 1.5, T.pos.z, 0.5, 6)) {
        this._turnSeen = true;
        this.answer('witnessed', T.pos.x, T.pos.y + 1.5, T.pos.z, 0.9);
        const fx = this._sys('fx');
        if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.12);
        this._turnE = null;
      }
    }
    const S = this.watcherS;
    if (!S.on) return;
    S.t += d;
    this._player(_pos);
    const dxz = Math.hypot(_pos.x - S.x, _pos.z - S.z);

    // ATTENTION, NOT A TIMER. [marrow entity.js:356] +1x watched, -2x not.
    const watched = this.watching(S.x, S.y + 1.5, S.z, 0.86, 90);
    if (watched) {
      S.observed += d;
      if (S.observed > 0.05 && !S.seen) { S.seen = true; this.ctx.bus?.emit('lore:sighting', { species: 'pale' }); }
    }
    else S.observed = Math.max(0, S.observed - d * 2);

    // D3: UNDER A HELD TORCH BEAM IT HOLDS — base behaviour now, no perk. What the beam has
    // found does not leave when you look away and the ordinary dwell does not run; and after
    // watcherResolveS of beam it WITHDRAWS, with the hush and the sound, exactly as it does
    // when you close to 8 m. The beam is the torch on and the camera on it (the lore's Pale
    // steps back from the light, but only from a light that is held on it).
    const lights = this._sys('lights');
    const beam = watched && !!(lights && typeof lights.torchOn === 'function' && lights.torchOn());
    S.beamT = beam ? S.beamT + d : 0;

    if (!S.vanishing) {
      if (S.car) {
        // horror 3: from the car the withdrawal is the PASSING. No 8 m hush at highway speed;
        // it is gone the frame it leaves the view cone after you have seen it, or the frame
        // the car passes it, and the fade is a cut, not a dissolve.
        const car = this._sys('car');
        const h = car && typeof car.heading === 'number' ? car.heading : this._headingAhead();
        const passed = (S.x - _pos.x) * -Math.sin(h) + (S.z - _pos.z) * -Math.cos(h) < 0;
        if ((S.seen && !watched) || passed || S.t > S.ttl) { S.vanishing = true; S.vt = 0; }
      } else if (dxz < D.watcherGone || S.beamT > D.watcherResolveS) {
        // The withdrawal. Closing to 8 m is the gut punch, and it beats every other exit.
        S.vanishing = true; S.vt = 0; S.approached = true;
        // [fetch enemies.js:69-85] the hush comes FIRST and it is the tell: the world stops,
        // and only then is the thing you walked up to not there any more.
        this.hush(D.hushWithdraw);
        this.answer('withdraw', S.x, S.y + 1.4, S.z, 1);
        const fx = this._sys('fx');
        if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.05);
      } else if (!beam && S.seen && !watched && S.observed <= 0) {
        // [marrow entity.js:388-391] the starer is gone the instant you look away.
        S.vanishing = true; S.vt = 0;
      } else if ((!beam && S.observed > D.watcherDwell + dxz * 0.04) || S.t > S.ttl) {
        S.vanishing = true; S.vt = 0;
      }
    }
    if (S.vanishing) {
      S.vt += d;
      if (S.vt > (S.car ? D.watcherCarFade : D.watcherFade) + 0.07) {
        S.on = false;
        this.watcher.visible = false;
      }
    }
    S.sway += d * 0.9;
  }

  _stepRunner(d) {
    const S = this.runnerS;
    if (!S.on) return;
    S.px = S.cx; S.pz = S.cz; S.py = S.cy;
    S.t += d;
    const k = Math.min(1, S.t / S.dur);
    S.cx = S.x0 + (S.x1 - S.x0) * k;
    S.cz = S.z0 + (S.z1 - S.z0) * k;
    S.cy = this._groundAt(S.cx, S.cz);
    S.stepCd -= d;
    if (S.stepCd <= 0) { S.stepCd = D.runnerStep; this.answer('runstep', S.cx, S.cy + 0.1, S.cz, 0.28); }
    if (k >= 1) {
      // The crash at the FAR end. It is what tells you it went somewhere.
      this.answer('brush', S.x1, this._groundAt(S.x1, S.z1) + 1.0, S.z1, 0.8);
      S.on = false;
      this.runner.visible = false;
    }
  }

  _stepPrints(d) {
    const S = this.printS;
    if (!S.on) return;
    S.t += d;
    for (let i = 0; i < S.n; i++) {
      const r = this.printRec[i];
      if (r.landed || S.t < r.appear) continue;
      r.landed = true;
      // You hear the steps you cannot see. [eaten-path events.js:556]
      this.answer('footfall', r.x, r.y, r.z, 0.30);
    }
    if (S.t > S.dur) {
      S.on = false;
      for (let i = 0; i < D.printCountMax; i++) this.prints[i].visible = false;
    }
  }

  _stepEyes(d) {
    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      if (!e.on) continue;
      e.t += d;
      if (e.state === 0) {
        if (e.t > D.eyesFadeIn) { e.state = 1; e.t = 0; }
      } else if (e.state === 1) {
        e.sacT -= d;
        if (e.sacT <= 0) {
          e.sacT = D.eyesSacMin + this.rng.next() * (D.eyesSacMax - D.eyesSacMin);
          // 35% of saccades land on the camera. [eaten-path events.js:168]
          if (this.rng.next() < D.eyesStareChance) {
            const cam = this.ctx.camera;
            if (cam) {
              e.sacX = clamp((cam.position.x - e.x) * 0.004, -0.05, 0.05);
              e.sacY = clamp((cam.position.y - e.y) * 0.010, -0.03, 0.03);
            } else { e.sacX = 0; e.sacY = 0; }
          } else {
            e.sacX = (this.rng.next() - 0.5) * 0.10;
            e.sacY = (this.rng.next() - 0.5) * 0.06;
          }
          if (this.rng.next() < D.eyesBlinkChance) e.blink = 0.16;
        }
        if (e.blink > 0) e.blink -= d;
        if (e.t > e.life) { e.state = 2; e.t = 0; }
      } else if (e.t > D.eyesFadeOut) {
        e.on = false; e.owner = null;
        e.mesh.visible = false;
      }
    }
  }

  _stepLantern(d) {
    const L = this.lantern;
    if (!L.on) return;
    L.t += d;
    this._player(_pos);
    const dxz = Math.hypot(_pos.x - L.x, _pos.z - L.z);
    // horror 16 / 17: the candle and the dying headlight both care whether you are LOOKING.
    if (L.candle || L.dying) {
      const watched = this.watching(L.x, L.y, L.z, 0.86, 120);
      L.watchT = watched ? L.watchT + d : Math.max(0, L.watchT - d * 2);
    }
    if (L.dying && !L.dyingOn && L.watchT > D.dyingWatchS) {
      // "They were waiting for someone to see them and then they were allowed to stop." The
      // fade starts on being watched, never on a timer, and it is given the time to finish.
      L.dyingOn = true;
      const F = CFG.setpieces && CFG.setpieces.dying;
      L.ttl = Math.max(L.ttl, L.t + ((F && F.fadeS) || 90) + 4);
    }
    if (L.dyingOn && !L.dyingDone) {
      const F = CFG.setpieces && CFG.setpieces.dying;
      const fadeS = (F && F.fadeS) || 90;
      const floor = F && typeof F.floor === 'number' ? F.floor : 0.15;
      L.fade = Math.max(floor, L.fade - d * (1 - floor) / fadeS);
      // it warms as it dies: the lamp's colour toward dyingColour by how far down it is
      _col.setHex(L.colour); _colA.setHex(D.dyingColour);
      _col.lerp(_colA, clamp01((1 - L.fade) / (1 - floor)));
      if (L.handle && typeof L.handle.setColour === 'function') L.handle.setColour(_col);
      if (L.fade <= floor + 1e-6) {
        L.dyingDone = true;
        this.answer('lantern-gone', L.x, L.y, L.z, D.dyingGoneGain);
        this._endLantern();
        return;
      }
    }
    // horror 16: a candle you have watched candleWatchS is gone, like one you walked up to
    const candleDone = L.candle && L.watchT > D.candleWatchS;
    // ...and it is not there when you arrive.
    if (dxz < D.lanternGone || L.t > L.ttl || candleDone) {
      L.fade -= d / D.lanternFade;
      if (L.handle) L.handle.setIntensity(Math.max(0, L.intensity * L.fade));
      if (L.fade <= 0) {
        if (dxz < D.lanternGone || candleDone) this.answer('lantern-gone', L.x, L.y, L.z, 0.5);
        this._endLantern();
      }
    }
  }

  /* ================================================= presentation ========== */

  /**
   * Presentation only. Everything that moves keeps prev/curr and is read here at `alpha`;
   * ignoring alpha is the CINDERBLOOM teleport, and at 0.7-1.1 s across ten metres the
   * runner is exactly the case where it shows.
   */
  present(alpha) {
    const a = alpha === undefined ? 1 : alpha;
    this.tension.apply();

    // horror 10 + C18: THE BLACK HOUR IS FELT. clock.telegraph (the last 90 s of night) breathes
    // post's uPulse — contrast and halation — at pulseHz; the hour itself holds pulseBlack.
    // The trailcam's flash kick (ctx.shared.pulseKick, the SITES lane) composes by max, so
    // neither hides the other. uPulse had no caller before this; it costs no program.
    const post = this._sys('post');
    if (post && typeof post.setPulse === 'function') {
      const sh = this.ctx.shared;
      const clk = this._sys('clock');
      const tele = clk && typeof clk.telegraph === 'number' ? clk.telegraph : 0;
      let pulse = 0;
      if (sh && sh.phase === 'black') pulse = D.pulseBlack;
      else if (tele > 0) pulse = tele * D.pulseTelegraph * (0.5 + 0.5 * Math.sin(this.clock * TAU * D.pulseHz));
      const kick = sh && typeof sh.pulseKick === 'number' ? sh.pulseKick : 0;
      post.setPulse(pulse > kick ? pulse : kick);
    }

    const S = this.watcherS;
    if (S.on) {
      // It breathes very slightly, so it is not a decal — but it never steps toward you.
      this.watcher.position.set(S.x, S.y + Math.sin(S.sway) * 0.006, S.z);
      this._player(_pos);
      this.watcher.rotation.y = Math.atan2(_pos.x - S.x, _pos.z - S.z);
      this.matWatcher.opacity = S.vanishing ? Math.max(0, 1 - S.vt / (S.car ? D.watcherCarFade : D.watcherFade)) : 1;
      this.matFace.opacity = this.matWatcher.opacity;
      this.watcher.visible = this.matWatcher.opacity > 0.002;
    }

    // D14: THE OASIS. The palms sway, the glow breathes; collapsing, they go to nothing.
    const O = this.oasis;
    if (O.on) {
      const k = O.collapsing ? Math.max(0, 1 - O.ct / D.oasisCollapse) : 1;
      for (let i = 0; i < O.palms.length; i++) {
        const p = O.palms[i];
        const sc = p.userData.sc * k;
        p.scale.set(sc, sc, sc);
        p.rotation.z = Math.sin(O.sway * 0.7 + i * 1.3) * 0.03;
      }
      const breathe = 0.9 + 0.1 * Math.sin(O.sway * 0.9);
      this.matSand.opacity = 0.35 * k * breathe;
      this.matWater.opacity = 0.12 * k * (0.85 + 0.15 * Math.sin(O.sway * 1.7 + 1));
      if (O.handle) O.handle.setIntensity(D.oasisIntensity * k * breathe);
      O.group.visible = k > 0.002;
    }

    // D14: THE LAUGHTER. Five figures swaying; resolving, every one turns to face you over
    // laughterTurn, then they fade over laughterFade and the light goes with them.
    const G = this.laughS;
    if (G.on) {
      this._player(_pos);
      const turnK = G.resolving ? clamp01(G.rt / D.laughterTurn) : 0;
      for (let i = 0; i < G.n; i++) {
        const r = this.figRec[i], m = this.figures[i];
        const toYou = Math.atan2(_pos.x - r.x, _pos.z - r.z);
        let dy = toYou - r.yaw0;
        while (dy > Math.PI) dy -= TAU;
        while (dy < -Math.PI) dy += TAU;
        m.rotation.y = r.yaw0 + dy * turnK;
        m.position.set(r.x, r.y + Math.sin(G.sway * 1.1 + r.sway) * 0.008, r.z);
      }
      const fadeK = G.resolving ? clamp01(1 - Math.max(0, G.rt - D.laughterTurn) / D.laughterFade) : 1;
      this.matFigure.opacity = fadeK;
      if (G.handle) G.handle.setIntensity(D.laughterIntensity * fadeK * (0.92 + 0.08 * Math.sin(G.sway * 1.3)));
    }

    const R = this.runnerS;
    if (R.on) {
      const x = R.px + (R.cx - R.px) * a;
      const z = R.pz + (R.cz - R.pz) * a;
      const y = R.py + (R.cy - R.py) * a;
      const k = Math.min(1, R.t / R.dur);
      const bounce = Math.abs(Math.sin(k * Math.PI * 6)) * 0.09;
      this.runner.position.set(x, y + bounce, z);
      this.runner.rotation.set(0.28, R.yaw, 0);   // leaning into the run
      this.matRunner.opacity = k > 0.85 ? Math.max(0, (1 - k) / 0.15) : 1;
    }

    const P = this.printS;
    if (P.on) {
      const fadeOut = clamp01(1 - (P.t - (P.dur - 2)) / 2);
      for (let i = 0; i < P.n; i++) {
        const r = this.printRec[i];
        const local = P.t - r.appear;
        const env = local > 0 ? Math.min(1, local / 0.22) * fadeOut : 0;
        const s = Math.max(0.001, env);
        this.prints[i].scale.set(s * (r.foot < 0 ? -1 : 1), s, s);
      }
    }

    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      if (!e.on) continue;
      let o = 0.9;
      if (e.state === 0) o = Math.min(1, e.t / D.eyesFadeIn) * 0.9;
      else if (e.state === 2) o = Math.max(0, 0.9 * (1 - e.t / D.eyesFadeOut));
      e.mat.opacity = o;
      e.mesh.position.set(e.x + e.sacX, e.y + e.sacY, e.z);
      e.mesh.scale.set(1, e.blink > 0.08 ? 0.15 : 1, 1);
    }

    const L = this.lantern;
    if (L.on) {
      // A lantern is never steady. Two non-harmonic terms so it never reads as a sine.
      // L.fade carries the road lantern's going, the dying headlight's long decline and the
      // candle's end alike, so one write drives all three.
      const flick = 0.86 + 0.10 * Math.sin(L.t * 7.3) + 0.06 * Math.sin(L.t * 3.1 + 1.7);
      this.matLantern.opacity = clamp01(flick * L.fade);
      if (L.handle) L.handle.setIntensity(Math.max(0, L.intensity * flick * L.fade));
      if (L.second.on && L.second.handle) {
        L.second.handle.setIntensity(Math.max(0, L.intensity * (0.86 + 0.10 * Math.sin(L.t * 6.1 + 2.3)) * L.fade));
      }
    }
  }

  /* =========================================== D14: THE HALLUCINATIONS ===== */

  /** The mirage family's own gate, over the menu's. '' when one may play, else the reason. */
  _mirageRefusal() {
    const sh = this.ctx.shared;
    if (sh && sh.inCar) return 'in-car';                       // never from the car
    if (this.oasis.on || this.laughS.on) return 'busy';
    if (this.clock - this.lastMirageAt < D.mirageEveryS) return 'cooldown';
    if (this.mirageThisCycle >= D.miragePerCycle) return 'cycle';
    const region = this.regionKey();
    if (region !== 'pines' && region !== 'ridge' && region !== 'marsh') return 'region';
    this._player(_pos);
    const roads = this._sys('roads');
    if (roads && typeof roads.roadDistance === 'function' && roads.roadDistance(_pos.x, _pos.z) < D.mirageRoadMin) return 'road';
    const flora = this._sys('flora');
    const cover = flora && typeof flora.coverAt === 'function' ? flora.coverAt(_pos.x, _pos.z) : 0;
    if (cover < D.mirageCoverMin) return 'cover';
    if (this._hasNearbyPlace(D.miragePlaceClear)) return 'place';
    return '';
  }

  _noteMirage() {
    this.lastMirageAt = this.clock;
    this.mirageThisCycle++;
  }

  /**
   * THE OASIS. A beach with palms and warm light, 45-80 m ahead in the pines, with surf you
   * can hear. Walk to it: at mirageGone the palms go to nothing, the light goes out, the
   * county holds its breath — and three times in ten the sand pays. It WAS pointing at
   * something.
   */
  _beatOasis() {
    for (let a = 0; a < D.refuseRetries; a++) {
      const d = D.oasisAheadMin + this.rng.next() * (D.oasisAheadMax - D.oasisAheadMin);
      const lat = (this.rng.next() - 0.5) * 12;
      const p = this._aheadPoint(d, lat);
      const v = this._validate(p.x, p.z, 3.0);          // 3 m clear each side: a clearing
      if (!v.ok) { this.stats.refusedPlacement++; continue; }
      return this._startOasis(v.x, v.y, v.z);
    }
    return false;
  }

  _startOasis(x, y, z) {
    const O = this.oasis;
    if (O.on) return false;
    O.on = true; O.t = 0; O.ttl = D.oasisTtl; O.x = x; O.y = y; O.z = z;
    O.collapsing = false; O.ct = 0; O.paid = false; O.sway = this.rng.next() * TAU;
    O.shoreT = D.shoreEveryMin + this.rng.next() * (D.shoreEveryMax - D.shoreEveryMin);
    O.group.position.set(x, y, z);
    O.group.rotation.y = this.rng.next() * TAU;
    for (let i = 0; i < O.palms.length; i++) { const p = O.palms[i], sc = p.userData.sc; p.scale.set(sc, sc, sc); }
    this.matSand.opacity = 0.35; this.matWater.opacity = 0.12;
    O.group.visible = true;
    // borrowed, never created; a mirage that gets no rover (32 logical taken) still glows
    const lights = this._sys('lights');
    O.handle = lights && typeof lights.borrow === 'function'
      ? lights.borrow('mirage', x, y + 2.5, z, 0xffc27a, D.oasisIntensity, 0) : null;
    this.answer('shore', x, y + 1.0, z, 0.7);
    this._noteMirage();
    return true;
  }

  _stepOasis(d) {
    const O = this.oasis;
    if (!O.on) return;
    O.t += d; O.sway += d;
    this._player(_pos);
    const dxz = Math.hypot(_pos.x - O.x, _pos.z - O.z);
    const sh = this.ctx.shared;
    if (!O.collapsing) {
      O.shoreT -= d;
      if (O.shoreT <= 0) {
        O.shoreT = D.shoreEveryMin + this.rng.next() * (D.shoreEveryMax - D.shoreEveryMin);
        this.answer('shore', O.x, O.y + 1.0, O.z, 0.6);
      }
      // gone when you arrive; abandoned if you drive off or it waited long enough
      if (dxz < D.mirageGone) this._collapseOasis(true);
      else if (O.t > O.ttl || (sh && sh.inCar)) this._collapseOasis(false);
      return;
    }
    O.ct += d;
    if (O.ct >= D.oasisCollapse) this._endOasis(O.paid);
  }

  _collapseOasis(reached) {
    const O = this.oasis;
    O.collapsing = true; O.ct = 0;
    // the hush first, then the sound of it leaving — the watcher's grammar
    this.hush(D.hushWithdraw);
    this.answer('withdraw', O.x, O.y + 1.2, O.z, 0.8);
    O.paid = reached && this.rng.next() < D.oasisPay;
  }

  _endOasis(pay) {
    const O = this.oasis;
    if (!O.on) return;
    const lights = this._sys('lights');
    if (O.handle && lights && typeof lights.release === 'function') lights.release(O.handle);
    O.handle = null; O.on = false; O.collapsing = false;
    O.group.visible = false;
    if (!pay) return;
    // the exact calls scavenging.js makes for a dig, so the ledger and the receipt agree
    const prog = this._sys('progress');
    const cashN = D.oasisCashMin + Math.floor(this.rng.next() * (D.oasisCashMax - D.oasisCashMin + 1));
    const cash = prog && typeof prog.payCash === 'function' ? prog.payCash(cashN, O.x, O.y + 0.4, O.z, 'mirage') : 0;
    const xp = prog && typeof prog.award === 'function' ? prog.award(D.oasisXp, O.x, O.y + 0.4, O.z, 'mirage') : 0;
    const bus = this.ctx.bus;
    if (bus) {
      bus.emit('reward:bundle', {
        title: 'Something under the sand', cash: cash || 0, xp: xp || 0, ammo: 0, bulbs: 0,
        detail: 'It was pointing at this.', x: O.x, y: O.y + 0.7, z: O.z,
      });
    }
    const fx = this._sys('fx');
    if (fx && typeof fx.reward === 'function') fx.reward(O.x, O.y, O.z, cash || 1);
  }

  /**
   * THE LAUGHTER. Five pale figures in warm light, 30-60 m ahead, laughing every few seconds.
   * At laughterGone every one of them turns to face you and they are gone; the last giggle is
   * behind you. One time in four one of them was real, and it is still standing there.
   */
  _beatLaughter() {
    for (let a = 0; a < D.refuseRetries; a++) {
      const d = D.laughterAheadMin + this.rng.next() * (D.laughterAheadMax - D.laughterAheadMin);
      const lat = (this.rng.next() - 0.5) * 8;
      const p = this._aheadPoint(d, lat);
      const v = this._validate(p.x, p.z, 4.0);          // 4 m clear each side: a lit clearing
      if (!v.ok) { this.stats.refusedPlacement++; continue; }
      return this._startLaughter(v.x, v.y, v.z);
    }
    return false;
  }

  _startLaughter(x, y, z) {
    const G = this.laughS;
    if (G.on) return false;
    const col = this._sys('collision');
    let placed = 0;
    for (let i = 0; i < this.figures.length; i++) {
      // each on its own spot inside the ring, on ground a body could stand on
      let fx = x, fz = z, ok = false;
      for (let t = 0; t < 4 && !ok; t++) {
        const a = this.rng.next() * TAU, r = 0.8 + this.rng.next() * D.figureRing;
        fx = x + Math.sin(a) * r; fz = z + Math.cos(a) * r;
        ok = !(col && typeof col.canOccupy === 'function') || col.canOccupy(fx, fz, 0.34, 1.9);
      }
      if (!ok) continue;
      const r = this.figRec[placed];
      r.x = fx; r.z = fz; r.y = this._groundAt(fx, fz);
      r.yaw0 = this.rng.next() * TAU; r.sway = this.rng.next() * TAU;
      placed++;
    }
    if (placed < 3) { this.stats.refusedPlacement++; return false; }
    G.on = true; G.n = placed; G.t = 0; G.ttl = D.laughterTtl; G.x = x; G.y = y; G.z = z;
    G.resolving = false; G.rt = 0; G.real = -1; G.reached = false; G.sway = 0;
    G.giggleT = 0.6 + this.rng.next() * 1.2;
    // the real one is chosen now: the farthest figure from you, one time in four
    if (this.rng.next() < D.laughterReal) {
      this._player(_pos);
      let far = -1, fd = -1;
      for (let i = 0; i < placed; i++) {
        const r = this.figRec[i];
        const dd = Math.hypot(r.x - _pos.x, r.z - _pos.z);
        if (dd > fd) { fd = dd; far = i; }
      }
      G.real = far;
    }
    this.matFigure.opacity = 1;
    for (let i = 0; i < this.figures.length; i++) {
      const m = this.figures[i], r = this.figRec[i];
      if (i < placed) { m.position.set(r.x, r.y, r.z); m.rotation.set(0, r.yaw0, 0); m.visible = true; }
      else m.visible = false;
    }
    const lights = this._sys('lights');
    G.handle = lights && typeof lights.borrow === 'function'
      ? lights.borrow('mirage', x, y + 2.2, z, 0xffc27a, D.laughterIntensity, 0) : null;
    this.answer('giggle', x, y + 1.5, z, 0.55);
    this._noteMirage();
    return true;
  }

  _stepLaughter(d) {
    const G = this.laughS;
    if (!G.on) return;
    G.t += d; G.sway += d;
    this._player(_pos);
    const dxz = Math.hypot(_pos.x - G.x, _pos.z - G.z);
    const sh = this.ctx.shared;
    if (!G.resolving) {
      G.giggleT -= d;
      if (G.giggleT <= 0) {
        G.giggleT = D.giggleMin + this.rng.next() * (D.giggleMax - D.giggleMin);
        const r = this.figRec[Math.floor(this.rng.next() * G.n)];
        this.answer('giggle', r.x, r.y + 1.5, r.z, 0.5);
      }
      if (dxz < D.laughterGone) this._resolveLaughter(true);
      else if (G.t > G.ttl || (sh && sh.inCar)) this._resolveLaughter(false);
      return;
    }
    G.rt += d;
    if (G.rt >= D.laughterTurn + D.laughterFade) this._endLaughter(G.reached);
  }

  _resolveLaughter(reached) {
    const G = this.laughS;
    G.resolving = true; G.rt = 0; G.reached = reached;
    this.hush(D.hushWithdraw);
    this.answer('withdraw', G.x, G.y + 1.2, G.z, 0.8);
    if (reached) {
      // the last giggle is BEHIND you, once they have gone (_pos is the player: _stepLaughter)
      const cam = this._sys('camera');
      const p = this._sys('player');
      const yaw = cam ? cam.yaw : (p ? p.yaw : 0);
      const x = _pos.x + Math.sin(yaw) * D.giggleBehind, z = _pos.z + Math.cos(yaw) * D.giggleBehind;
      this._after(this.TAG.giggle, D.laughterTurn + D.laughterFade + 0.35, x, _pos.y + 1.5, z);
    }
  }

  _endLaughter(reached) {
    const G = this.laughS;
    if (!G.on) return;
    const lights = this._sys('lights');
    if (G.handle && lights && typeof lights.release === 'function') lights.release(G.handle);
    G.handle = null; G.on = false; G.resolving = false;
    for (let i = 0; i < this.figures.length; i++) this.figures[i].visible = false;
    if (reached && G.real >= 0) {
      // one of them was real: a Pale, staged, where the farthest figure stood. It freezes
      // when looked at; it is dread-owned and costs no headcount.
      const en = this._sys('enemies');
      const r = this.figRec[G.real];
      if (en && typeof en.spawn === 'function') en.spawn('pale', r.x, r.z, { staged: true });
    }
    G.real = -1;
  }

  /* ======================================= C13: THE GLINT THAT HAD A BODY ===== */

  /**
   * fx says a wrong-height pair, lit and walked toward, is close. The lore's Pale IS the
   * eyeshine at the wrong height, so under the permit and a 240 s cooldown it gets its body:
   * a Pale 1.5 m off the trunk on your side, awake — it freezes under your gaze and is
   * released at 12 m or after 1.5 s of it — and the glint dies the same frame.
   */
  _onEyesApproached(p) {
    if (!p || !this.enabled || this._returning()) return;
    const sh = this.ctx.shared;
    if (sh && sh.inCar) return;                         // a glint from the car is a glint
    if (!this.permitOk()) return;
    if (!this._kindReady('pale-from-eyes')) return;
    const en = this._sys('enemies');
    if (!en || typeof en.spawn !== 'function') return;
    this._player(_pos);
    const dx = _pos.x - p.x, dz = _pos.z - p.z;
    const dl = Math.hypot(dx, dz) || 1;
    const x = p.x + (dx / dl) * D.paleFromEyesOff, z = p.z + (dz / dl) * D.paleFromEyesOff;
    const c = this._validate(x, z, 0, 0, true);
    if (!c.ok) { this.stats.refusedPlacement++; return; }
    const e = en.spawn('pale', x, z, { awake: true });
    if (!e) return;
    this._noteKind('pale-from-eyes', false);
    this._paleE = e;
    // the glint and the body never share a frame
    const fx = this._sys('fx');
    if (fx && typeof fx.killEyeshineNear === 'function') fx.killEyeshineNear(p.x, p.z);
  }

  /* ============================================ horror 13: THE PACER'S TURN ===== */

  /**
   * The pacer turned, once a night, and condemned a road light (dusk-to-dawn.warnVisiblePole
   * starts that pole's flicker). Silence for pacerHush, 'witnessed' from the lamp, a kick on
   * the bus, and the picture is taken for pacerScriptedS — never over a build, which owns it.
   */
  _onPacerTurned(p) {
    if (!p || !this.enabled || this._returning()) return;
    this.hush(D.pacerHush);
    const d2d = this._sys('dusk-to-dawn');
    const pole = d2d && d2d.poles && typeof p.lamp === 'number' ? d2d.poles[p.lamp] : null;
    const x = pole ? pole.hx : p.x, z = pole ? pole.hz : p.z;
    const y = pole ? pole.headY : this._groundAt(x, z) + 1.7;
    this.answer('witnessed', x, y, z, 0.9);
    this.tension.addKick(D.pacerKick);
    if (!this.building) {
      this.tension.takeScripted(D.pacerScripted);
      this._pacerScriptedT = D.pacerScriptedS;
    }
  }

  /** horror 16: is there an UNCLAIMED, un-hub major in the Auditor's reach for a candle. */
  candleOk() {
    const places = this._sys('places');
    if (!places || typeof places.nearestMajor !== 'function') return false;
    if (!this._nearPlace(74 * 2.5)) return false;      // the Auditor's placeRadiusMax x 'place' reach
    const m = places.nearestMajor(_pos.x, _pos.z);      // _nearPlace just read it: same answer
    if (!m || !m.def || m.def.hub) return false;
    if (typeof places.isClaimed === 'function' && places.isClaimed(m.def.id)) return false;
    return true;
  }

  /* ================================================= the surface =========== */

  /** The face the Auditor is given. It may reach nothing else in this class. */
  _facade() {
    const self = this;
    return {
      permitOk: () => self.permitOk(),
      // Auditor law 1 forbids body props, and dread-road-placement.mjs pins all five road
      // rows to prints/lanterns. Only this narrow door may place one beyond the current bend.
      solvePlacement: (s, a, b, r) => self.solvePlacement(s, a, b, r, s === 'road'),
      commission: (p, x, y, z, o, opts) => self.commission(p, x, y, z, o, opts),
      decommission: (h) => self.decommission(h),
      candleOk: () => self.candleOk(),      // horror 16: an unclaimed major in reach
      watching: (x, y, z, c, r) => self.watching(x, y, z, c, r),
      tell: (x, y, z) => self.tell(x, y, z),
      answer: (k, x, y, z, g) => self.answer(k, x, y, z, g),
      // The subtraction family IS a hush: the dog stops answering, the insects cut, the
      // reverb shortens. Those events have no prop and no sound of their own on purpose —
      // the cut is the event, and this is the only way to make one.
      hush: (seconds, x, z) => self.hush(seconds, x, z),
      regionKey: () => self.regionKey(),
    };
  }

  /** window.__CURFEW.state() fodder, and what the pacing test reads. */
  state() {
    return {
      tension: this.tension ? this.tension.value : 0,
      region: this.tension ? this.tension.region : '',
      beat: this.lastBeat,
      lastKind: this.lastKind,
      sinceBeat: this.clock - this.lastBeatAt,
      sinceLoud: this.lastLoud < -1e8 ? -1 : this.clock - this.lastLoud,
      timer: this.timer,
      permit: this.permitOk(),
      permitRadius: this.permitRadius(),
      building: this.building,
      watcher: this.watcherS.on, runner: this.runnerS.on, prints: this.printS.on,
      lantern: this.lantern.on,
      lootReturn: !!(this.lootReturn && this.lootReturn.on),
      hush: this.hushS.on,
      // D14
      oasis: this.oasis.on, laughter: this.laughS.on, mirages: this.mirageThisCycle,
      pale: !!this._paleE,
      // ROUND 13
      jump: { last: this.lastJump, backCoverT: +this.backCoverT.toFixed(2), blackout: this.blackoutS.on,
        drop: this.dropS.on, jumps: this.stats.jumps },
    };
  }

  snapshot() {
    return {
      clock: this.clock,
      state: this.state(),
      tension: this.tension.snapshot(),
      auditor: this.auditor.snapshot(),
      ledgerKeeper: this.ledgerKeeper?.state(), pacer: this.pacer?.state(),
      stats: Object.assign({}, this.stats, { byKind: Object.assign({}, this.stats.byKind) }),
    };
  }

  /** Live A/B only. Never a shipping default (CFG is frozen for exactly this reason). */
  config(patch) {
    if (!patch) return;
    if (typeof patch.enabled === 'boolean') this.enabled = patch.enabled;
    if (typeof patch.timer === 'number') this.timer = patch.timer;
    // ROUND 13: force a jump beat on the next permitted step (tests, and looking at one).
    if (typeof patch.jump === 'string') this._forceJump = patch.jump;
  }

  reset() {
    this._cancelAll();
    this._hourFinished = false;
    this.clock = 0;
    this.lastLootReturn = -1e9;
    this.timer = this._nextInterval();
    this.lastLoud = -1e9; this.quietUntil = -1e9;
    this.lastBeat = BEAT.none; this.lastBeatAt = -1e9; this.lastKind = '';
    this.lastHeavyAt = -1e9;
    this.lastMirageAt = -1e9; this.mirageThisCycle = 0;
    this._mimicClosed = false; this._lastStepAt = -1e9;
    for (const k in this.kindAt) delete this.kindAt[k];
    this.watcherS.on = false;
    this.runnerS.on = false;
    this.printS.on = false;
    this.hushS.on = false; this.hushS.t = 0; this.hushS.dur = 0;
    for (let i = 0; i < this.eyes.length; i++) this.eyes[i].on = false;
    this._endLantern();
    this._hideAll();
    this.tension.reset();
    this.auditor.reset();
  }

  ready() {
    return !!(this.tension && this.auditor && this.root && this.root.parent === this.scene
      && this.watcher && this.runner && this.prints && this.eyes && this.lantern);
  }

  dispose() {
    if (this._offs) { for (let i = 0; i < this._offs.length; i++) { const f = this._offs[i]; if (typeof f === 'function') f(); } }
    this._offs = null;
    if (this.auditor) this.auditor.dispose();
    this.ledgerKeeper?.dispose(); this.pacer?.dispose();
    this._endLantern();
    if (this.root && this.root.parent) this.root.parent.remove(this.root);
    if (this.figGeo) this.figGeo.dispose();
    if (this.faceGeo) this.faceGeo.dispose();
    if (this.matFace) this.matFace.dispose();
    if (this.printGeo) this.printGeo.dispose();
    if (this.eyeGeo) this.eyeGeo.dispose();
    if (this.matBase) this.matBase.dispose();
    if (this.matWatcher) this.matWatcher.dispose();
    if (this.matRunner) this.matRunner.dispose();
    if (this.matPrint) this.matPrint.dispose();
    if (this.matLantern) this.matLantern.dispose();
    for (let i = 0; i < this.eyes.length; i++) this.eyes[i].mat.dispose();
    // D14
    if (this.palmGeo) this.palmGeo.dispose();
    if (this.sandGeo) this.sandGeo.dispose();
    if (this.waterGeo) this.waterGeo.dispose();
    if (this.matPalm) this.matPalm.dispose();
    if (this.matSand) this.matSand.dispose();
    if (this.matWater) this.matWater.dispose();
    if (this.matFigure) this.matFigure.dispose();
  }
}

export default Dread;
