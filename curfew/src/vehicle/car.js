// vehicle/car.js — the car that finds you. System id 'car', M1+ manifest #19.
// Owner: vehicle. Files: src/vehicle/car.js, src/vehicle/carbody.js. Nothing else.
//
// THE CAR IS A BEAT, NOT A VEHICLE SPAWN (DESIGN decision 14). You never have to use it:
// every major is 600-750 m from its neighbour, which is 90-115 s at sprint, and the
// forest is legs country by construction. So the car does not sit on the map waiting to
// be found. When you are out on a road, far from anywhere lit, it comes down the road
// behind you with one headlight and stops. Nobody explains it.
//
// Three things this file is built around, in order of how much they matter:
//
//   1. Alex's brief: "It should feel nice and easy to do to drive, or to move." That is
//      why the kinematics are MOSSWAY's verbatim — MOSSWAY is a game whose entire
//      subject is driving through a forest and whose numbers were tuned by hand — and
//      why the controls are the four keys you already have your fingers on.
//   2. The arrival is heard before it is seen. The pilot drives the last 30 m
//      (CFG.car.spawn.pilotLast) and brakes to a stop, so the beat is an ENGINE getting
//      louder behind you, not a mesh appearing.
//   3. It is never safe. The engine is a 60 m noise event on the 'noise' bus every
//      0.4 s that it runs; the headlamp makes you visible far past what it lets you see.
//
// THREE FIXES ON PORT, each a real bug in the donor (DESIGN section 3, "The car"):
//   fix 1  Euler order YXZ on every composed pose. MOSSWAY builds a lookAt matrix so it
//          never hits this; a Three car with the default XYZ tilts the horizon the
//          moment you look sideways and up at the same time.
//   fix 2  The pose is INTERPOLATED between fixed steps. prev/curr + present(alpha).
//          This is the CINDERBLOOM teleport and it is the single most-repeated bug in
//          this catalogue (CONTRACT, "The loop").
//   fix 3  MOSSWAY scrubs `vehicle.speed *= 0.58` on a tree hit — donor
//          donors/mossway/game.js:1801, inside resolveTreeCollisions. It is PER FRAME and
//          it is the one frame-rate-dependent line in that file: at 144 fps the same
//          contact costs 2.4x more speed than at 60. Here it is
//          damp(speed, speed * CFG.car.treeHit.targetMul, CFG.car.treeHit.lambda, dt)
//          plus a heading nudge along the trunk, which is also what makes it SLIDE off
//          a trunk instead of stopping dead.
//
// THE LIGHT CENSUS IS PINNED (CONTRACT). This file creates no light, ever. The headlamp
// is `lights.setHeadlights(...)` — the one SpotLight the census allots to it — plus one
// borrowed rover for the warm pool at the lens. DESIGN asks for "two pooled headlight
// spots"; the census in CONTRACT allots exactly one SpotLight to the headlights and the
// census outranks it. See docs/HANDOFF.md.
//
// AND IT IS SWITCHED OFF AGAIN (audit blocker 1, fixed this round). The three
// _setHeadlights(true) sites had no _setHeadlights(false) anywhere in the file, so a
// single autonomous spawn pinned ctx.shared.lit at >= 0.52 for the rest of the session
// and inverted the whole "seeing is how you are seen" trade. There are now three ways it
// goes out: _beginExit, _forceRelease (death / respawn, unconditional), and the PARK
// COOL-DOWN in _stepIdle, which dims the filament over PARK_DARK_S while the block ticks
// and then drops the SpotLight — the arrival is a light coming toward you, the wait is a
// light going out, and then the woods come back.
//
// THE WHEEL BRANCH OF THE SKILL TREE IS WIRED HERE. progression/nodes.js declares four
// hook points whose `runner` is 'car' and every one of them names a call site in this
// file: 'hotwireS' (_beginEnter), 'ramMinSpeed' (_ram), 'onHorn' (_horn) and 'wearRepair'
// (_stepIdle's parked branch). Until this round none of them was ever called, so the whole
// branch was four cards that bought nothing. progress is read LAZILY through `_progress`,
// it is manifest #20 against our #19, and every call site works with it absent.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp, clamp01, damp, lerp, ease, TAU } from '../engine/math.js';
import { ACTIONS } from '../engine/input.js';
import { MASK } from '../world/collision.js';
import { buildCarBody, WHEEL_OFFSETS, WHEEL_RADIUS, ROOF_Y, DOOR } from './carbody.js';

const K = CFG.car;
const SP = K.spawn;
const SEAT = K.seat;

/* ---------------------------------------------------------------------------
 * Locals config.js does not own yet. Each carries its donor or its reason; a
 * CFG.car block for them is requested in docs/HANDOFF.md.
 * ------------------------------------------------------------------------- */
const ON_ROAD_D = 5.7;            // [mossway game.js:1825] rd < 5.7 is "on the road"
const MAX_REV_ON = 7.0;           // [mossway game.js:1827-1828]
const MAX_REV_OFF = 4.5;
const CREEP_ON = 4.2, CREEP_OFF = 2.8;   // [mossway game.js:1832]
const HARD_BRAKE_LAMBDA = 8.5;    // [mossway game.js:1834] space
const STEER_LAMBDA = 7.0;         // [mossway game.js:1842]
const SAMPLE_FWD = 2.2, SAMPLE_SIDE = 1.25;   // [mossway game.js:1855-1856]
const TILT_LAMBDA = 5.2;          // [mossway game.js:1865-1866]
const BOB_LAMBDA = 8.0;           // [mossway game.js:1873]
const GROUND_LAMBDA = 12.0;       // [peachful vehicle.js:99] damp to ground, not snap
const HIT_COOLDOWN = 0.45;        // [mossway game.js:1809]

const ENTER_RANGE = 2.2;          // DESIGN section 3: hold E within 2.2 m of the driver door
const HOLD_TIME = 0.40;           // DESIGN section 3
const REPARENT = 0.35;            // DESIGN section 3: the camera moves, it never cuts
const EXIT_OFFSET = 1.20;         // DESIGN section 3: 1.2 m off the driver side
const EXIT_MAX_SPEED = 1.6;       // you cannot step out of a moving car; the refusal has a sound

const ENGINE_NOISE_R = 60;        // DESIGN section 3: "the engine is a 60 m disturbance"
const ENGINE_NOISE_EVERY = 0.40;
const COOL_TICKS = 5;             // the engine ticking as it cools, after an arrival
const COOL_GAP = 1.15;

const PILOT_CRUISE = 9.5;         // m/s the pilot holds on its approach
const PILOT_BRAKE_AT = 13.0;      // start shedding speed this far out
const PILOT_ARRIVE = 1.4;         // close enough: cut the engine

const RAM_SPEED = 8.0;            // DESIGN section 3: kills a pallbearer at >= 8 m/s
const RAM_RADIUS = 2.4;
const RAM_EVERY = 0.20;

// BLOCKER 1. A parked car goes DARK, and the going-dark is a beat rather than a switch:
// the filament falls off over this while the block ticks itself cool, and when it reaches
// zero the census SpotLight goes out with it and the woods come back. Long enough that
// you can watch it happen from the treeline, short enough that a car that arrived and was
// never used stops lighting you up within one approach.
const PARK_DARK_S = 6.5;

// The warm pool the borrowed rover lays on the car's own nose. It is a local because the
// borrow() call and the cool-down scaling both need it and two literals that must agree is
// how they stop agreeing. A CFG.car.lamp block is requested in docs/HANDOFF.md.
const HEAD_POOL = 3.2;

const HORN_NOISE_R = 46;          // the horn ITSELF, before any node makes it a lure
const HORN_COOLDOWN = 1.6;

// Wear. 0 is a car somebody looked after; 1 is one that will not do much more than crawl.
// It starts part-worn because it was already abandoned when it found you.
const WEAR_START = 0.15;
const WEAR_PER_IMPACT = 0.055;    // scaled by how much speed the contact actually cost
const WEAR_PER_RAM_HIT = 0.020;   // a body at speed dents a wing
const WEAR_SPEED_LOSS = 0.28;     // fraction of top speed a fully worn car has lost
const WEAR_LAMP_LOSS = 0.45;      // and the one working lamp browns out with it

const SPAWN_CHECK_EVERY = 0.50;   // the spawn rule is evaluated twice a second, not per frame
const SPAWN_COOLDOWN = 8.0;       // after a spawn or an exit, before another can be considered
const VIEW_CONE_COS = Math.cos(45 * Math.PI / 180);   // the 90 degree cone, half-angle

// DEFECT 2, MEASURED. The beat had never fired in a real session and the rule could not say
// why, because every clause returned void. Reproduced deterministically (kill the player,
// then teleport it to the one road point the suite picks): 96 consecutive checks, 43 refused
// 'player-dead' and 53 refused 'at-a-major', zero spawns, `car.pos` still (0,0,0) — which is
// the "573 m away" in the report, the distance from the origin to the Filling Station.
//
// The chain is: the player dies out on the loop -> controller.js:_respawn puts it at the
// nearest CLAIMED place, and the Filling Station starts claimed -> the player is now 0 m from
// a major -> `minPlayerToMajor` 120 vetoes every check for the rest of the life. Die once and
// the car never comes again until you have walked 120 m, which is not a rule anybody wrote.
//
// Three things below fix it, and none of them conjures a car at a door:
//
//   OWED.  The gates are evaluated in position order and `dead` is tested LAST, so a check
//          that got all the way to a living-player test knows the player was eligible. That
//          dispatch is then OWED: dying does not un-send a car that was already coming. It
//          is redeemed on the first check after the respawn — which is the only clause that
//          is allowed past the major gate, and only once, and only inside OWED_TTL.
//   RECALL. This file's own header promises ">300 m away or lost ... is how you never have to
//          walk back to where you left it". It never did: a lost car parked 1.4 km away was
//          vetoed by the same major gate. A recall is not a new beat, so it skips it too.
//   YARD.  Both of those can now aim a car at a player standing in a lit yard, so the STOP
//          POINT gets a clearance it never had. The old rule gated the PLAYER at 120 m and
//          the car at nothing, so it would happily park 30 m inside Ashfall's 46 m yard.
const OWED_TTL = 60;              // s. A dispatch earned before a death does not wait forever.
const YARD_CLEAR = 16;            // m past a major's own radius. The car parks OUT of the yard.
const RELAX_CONE_MIN = 65;        // m. Last-resort candidates may be ahead, but only this far
                                  // out — at 65 m in this fog a cold, dark car is not visible,
                                  // and the pilot still drives the last 30 m so you hear it.

// AUDIT FIX. player/camera.js also writes cam.fov every frame. If both lanes write
// whenever they see a value that is not their own, each one's write looks like a change
// to the other and the pair recompiles the projection matrix every single frame for the
// whole drive. So this file compares against ITS OWN last written target, never against
// cam.fov, and writes only when that target actually moved.
const FOV_EPS = 0.02;

/* Module scratch. The hot path allocates nothing (CONTRACT). */
const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _org = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _s = new THREE.Vector3(1, 1, 1);
const _pos = new THREE.Vector3();

function wrapAngle(a) {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}
/** shortest signed angle from a to b */
function angleDelta(a, b) { return wrapAngle(b - a); }

export class Car {
  static id = 'car';

  constructor(ctx) {
    this.ctx = ctx;

    // ---- simulation pose (MOSSWAY's vehicle record, in Three's basis)
    this.x = 0; this.y = 0; this.z = 0;
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.pitch = 0;
    this.roll = 0;
    this.bob = 0;
    this.travel = 0;
    this.wheelRot = 0;
    this.hitCooldown = 0;

    // ---- fix 2: prev/curr, lerped by present(alpha). Nothing else may draw the car.
    this.prevX = 0; this.prevY = 0; this.prevZ = 0;
    this.prevHeading = 0; this.prevPitch = 0; this.prevRoll = 0; this.prevBob = 0;
    this.prevWheelRot = 0; this.prevSteer = 0;

    // ---- lifecycle
    this.exists = false;
    this.mode = 'none';    // none | arriving | idle | entering | driving | exiting
    this.hotwired = false;  // reset by every spawn: the first entry is always a hotwire
    this.engineOn = false;
    this.headlightsOn = false;
    // 0..1 filament level for the ONE working lamp. `headlightsOn` is the census
    // SpotLight's switch and is a boolean because lights.setHeadlights is; this is the
    // continuous part, and it is what makes the park cool-down a dim and not a cut.
    this.lampFade = 0;
    // How beaten the car is, 0..1. Costs top speed and browns the lamp; the WHEEL branch's
    // 'Keep' node is the only thing in the game that takes any of it back.
    this.wear = WEAR_START;

    // ---- timers, all dt-scoped. No setTimeout anywhere (CONTRACT).
    this.holdT = 0;
    this.enterT = 0;
    this.hotwireT = 0;
    this.crankPips = 0;
    this.coolT = 0;
    this.coolLeft = 0;
    this.spawnCheckT = 0;
    this.spawnCooldown = 2.0;
    // The dispatch the player earned and then died before it landed. See OWED above.
    this.owed = false;
    this.owedT = 0;

    // THE REFUSAL LEDGER. A rule that silently declines is indistinguishable from a rule
    // that never runs, and this one declined silently for three rounds. Preallocated and
    // written in place: _considerSpawn is on the fixed step and allocates nothing. The
    // director exposes a refusal count for the same reason; this exposes the reason too.
    this._dbg = {
      checks: 0, spawns: 0,
      why: 'never-ran',           // the reason the LAST check gave
      inCar: 0, noSystems: 0, atMajor: 0, noRoad: 0, carIsHere: 0, playerDead: 0,
      noCandidate: 0, ok: 0,
      // what the last check actually measured, so a number can be argued with
      playerRoad: -1, nearestMajor: -1, carDist: -1,
      // what the last candidate sweep saw
      bearings: 0, coneRejects: 0, roadMisses: 0, bandRejects: 0, yardRejects: 0,
      relaxed: false, bestScore: 0,
    };
    this.noiseT = 0;
    this.ramT = 0;
    this.hornT = 0;
    // The hotwire length the WHEEL branch actually granted for THIS entry. The crank pips
    // are spaced off it, so a half-second hotwire still gets three of them.
    this.hotwireTotal = K.hotwire;
    this.refuseLatch = false;

    // ---- pilot
    this.pilotX = 0; this.pilotZ = 0;
    // The winning stop point _findStop wrote. Fields, not a returned Vector2: the sweep
    // runs twice a second on the fixed step and the hot path allocates nothing.
    this._stopX = 0; this._stopZ = 0;

    // ---- camera reparent
    this.fromX = 0; this.fromY = 0; this.fromZ = 0;
    this.fovNow = SEAT.fov;
    // The fov the camera lane was holding when we took the seat, and the last fov THIS
    // file wrote. `_fovLast` is NaN whenever we do not own the fov, so the first frame of
    // an entry always writes and the camera lane gets it back untouched on exit.
    this.baseFov = (CFG.render && CFG.render.fov) || SEAT.fov;
    this._fovLast = NaN;

    // ---- the carry (see _carryPlayer). `_carried` is what WE asked for; the player lane
    // owns whether it took, and owns player:died / player:respawn (integrator decision 3).
    this._carried = false;
    this._carrySeated = false;   // the one-frame placement has happened for this entry

    // ---- render
    this.body = null;
    this.headHandle = null;
    this._roofColliders = [-1, -1, -1];
    this._roofPlaced = false;

    // ---- the 'use' action. engine/input.js has no 'use' in ACTIONS yet (requested in
    // docs/HANDOFF.md), so this shim binds KeyE through input's OWN _down/_up — the same
    // door the DOM listeners use, never a second source of truth — and removes itself
    // the moment engine adds the action.
    this._ownsUseKey = false;
    this._synthUse = false;
    this._synthHorn = false;
    this._onKeyDown = null;
    this._onKeyUp = null;

    this.rng = null;
  }

  /**
   * World position, for anyone who wants to measure to the car (tests/world-game.mjs
   * reads `s.pos`). A preallocated object filled on read — a getter that allocated a
   * Vector3 would be a per-frame garbage source for every caller who polls it.
   * COPY IT; the next read overwrites it.
   */
  get pos() {
    const o = this._posOut || (this._posOut = { x: 0, y: 0, z: 0 });
    o.x = this.x; o.y = this.y; o.z = this.z;
    return o;
  }

  // Siblings are read LAZILY, at use, never captured at construction: construction order
  // is manifest order and VIGIL's combat.js got `undefined` for exactly this.
  get _terrain() { return this.ctx.systems.get('terrain'); }
  get _roads() { return this.ctx.systems.get('roads'); }
  get _collision() { return this.ctx.systems.get('collision'); }
  get _player() { return this.ctx.systems.get('player'); }
  get _camera() { return this.ctx.systems.get('camera'); }
  get _lights() { return this.ctx.systems.get('lights'); }
  get _fx() { return this.ctx.systems.get('fx'); }
  get _enemies() { return this.ctx.systems.get('enemies'); }
  get _input() { return this.ctx.input || this.ctx.systems.get('input'); }
  // The WHEEL branch of the skill tree. progress is manifest #20 and we are #19, so it
  // does not exist when this file is constructed and it may not exist at all in a
  // stripped test build — every read of it is lazy, at use, behind a guard, and every
  // call site below still does the right thing when it returns undefined.
  get _progress() { return this.ctx.systems.get('progress'); }

  async init() {
    this.rng = this.ctx.rng ? this.ctx.rng.fork('car') : null;

    // ctx.shared does not exist in the M0 ctx bag; CONTRACT says it must, and it is a
    // flat bag of scalars. Create it if absent, then own exactly one key.
    if (!this.ctx.shared) this.ctx.shared = {};
    this.ctx.shared.inCar = false;

    this.body = buildCarBody(this.rng ? this.rng.fork('body') : null);
    this.body.root.visible = false;
    // ctx.scene is read here and not in the constructor: the viewmodel attached its
    // brass pool before gfx had made the scene and ran a whole system on an orphan.
    const scene = this.ctx.scene;
    if (!scene) throw new Error('car: ctx.scene missing (gfx must be manifest #1)');
    scene.add(this.body.root);

    // LISTEN, NEVER EMIT (integrator decision 3): player/controller.js owns player:died
    // and player:respawn and clears its own dead flag. This file only has to let go —
    // without this, a death at 20 m/s leaves the body frozen in a seat it can never get
    // out of, and the respawn puts the player straight back into the car.
    const bus = this.ctx.bus;
    if (bus && bus.on) {
      bus.on('player:died', () => this._forceRelease());
      bus.on('player:respawn', () => {
        this._forceRelease();
        // Redeem an owed dispatch on the FIRST step after the respawn, not up to half a
        // second later. controller.js:_respawn drops the player into the nearest claimed
        // place, so this is exactly the frame the old rule started refusing forever.
        this.spawnCheckT = 0;
        this.spawnCooldown = Math.min(this.spawnCooldown, 0);
      });
    }

    this._bindUse();
  }

  ready() {
    return !!(this.body && this.body.root && this.body.root.parent);
  }

  /* ------------------------------------------------------------------ input */

  _bindUse() {
    if (typeof window === 'undefined') return;
    // The two actions are checked SEPARATELY. The old single guard bailed on the whole
    // binding the moment engine adopted 'use', which would have taken the horn with it —
    // exactly the silent half-failure this project keeps finding.
    const has = (a) => !!(ACTIONS && ACTIONS.indexOf && ACTIONS.indexOf(a) >= 0);
    const ownsUse = has('use'), ownsHorn = has('horn');
    if (ownsUse && ownsHorn) return;                       // engine owns both now
    const inp = this._input;
    if (!inp || typeof inp._down !== 'function' || typeof inp._up !== 'function') return;
    // KeyE is the door, KeyH is the horn. Both go through input's OWN _down/_up — the
    // same door the DOM listeners use, never a second source of truth — so the edge
    // bookkeeping (_pressed, _latch, the deferred release) is input's, not ours.
    const act = (code) => {
      if (code === 'KeyE') return ownsUse ? null : 'use';
      if (code === 'KeyH') return ownsHorn ? null : 'horn';
      return null;
    };
    this._onKeyDown = (ev) => {
      if (ev.repeat) return;
      const a = act(ev.code);
      if (!a) return;
      const i = this._input; if (i && i.enabled !== false) i._down(a);
    };
    this._onKeyUp = (ev) => {
      const a = act(ev.code);
      if (!a) return;
      const i = this._input; if (i) i._up(a);
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._ownsUseKey = true;
  }

  /** Test door: drive the hold without a keyboard. __CURFEW can call car.setUse(true). */
  setUse(on) { this._synthUse = !!on; }

  /** Test door: one honk, consumed by the next step. */
  honk() { this._synthHorn = true; }

  _useHeld() {
    if (this._synthUse) return true;
    const i = this._input;
    return !!(i && i.held && i.held('use'));
  }

  /** A rising edge on the horn. `pressed` is cleared by input.endStep, so this is read
   *  in the fixed step exactly once per press. */
  _hornPressed() {
    if (this._synthHorn) { this._synthHorn = false; return true; }
    const i = this._input;
    return !!(i && i.pressed && i.pressed('horn'));
  }

  _axis(neg, pos) {
    const i = this._input;
    if (!i || !i.held) return 0;
    return (i.held(pos) ? 1 : 0) - (i.held(neg) ? 1 : 0);
  }

  /* ------------------------------------------------------------------- bus  */

  _emit(ev, payload) { if (this.ctx.bus) this.ctx.bus.emit(ev, payload); }

  /**
   * Every sound in this file goes out on the 'noise' bus with a `source` string.
   * There is no audio system yet (manifest 21, another lane) and CONTRACT forbids
   * inventing a local channel, so 'noise {x, z, radius, source}' carries both jobs:
   * it is what the director hears AND it is the cue audio will key on. Silence reads
   * as broken, so the refusals emit too — see docs/HANDOFF.md.
   */
  _noise(source, radius, x, z) {
    if (!this.ctx.bus) return;
    this.ctx.bus.emit('noise', {
      x: x === undefined ? this.x : x,
      z: z === undefined ? this.z : z,
      radius, source,
    });
  }

  /* ---------------------------------------------------------------- spawning */

  /**
   * THE SPAWN RULE, which is the whole design idea. On foot, out past every lit yard,
   * within 60 m of a road, and the car >300 m away or lost: put it on the road 40-90 m
   * off, OUTSIDE the 90 degree view cone measured with the camera's REAL forward (the
   * VIGIL law: a spawn measured against the body's yaw pops into view every time the
   * player is looking over their shoulder), and let the pilot bring it the last 30 m.
   *
   * EVERY EXIT WRITES A REASON. See the DEFECT 2 note at the top of this file for what
   * that cost: 96 silent refusals in a row and a report that read "the car is broken".
   * `_dbg.why` is the last reason, the counters are the lifetime totals, and
   * `state().spawn` is where a test reads them.
   */
  _considerSpawn() {
    const D = this._dbg;
    D.checks++;

    if (this.ctx.shared.inCar) { D.why = 'in-car'; D.inCar++; return; }
    const p = this._player, roads = this._roads;
    if (!p || !roads) { D.why = 'no-systems'; D.noSystems++; return; }

    const px = p.pos.x, pz = p.pos.z;

    // A RECALL is not a new beat: the car exists and is lost, and this file's header
    // promises you never have to walk back to it. An OWED dispatch is one the player
    // already earned and then died before it landed. Both are allowed past the yard gate
    // and nothing else is.
    let carD2 = Infinity;
    if (this.exists) {
      const dx = this.x - px, dz = this.z - pz;
      carD2 = dx * dx + dz * dz;
    }
    D.carDist = this.exists ? Math.sqrt(carD2) : -1;
    const recall = this.exists && carD2 >= SP.lostBeyond * SP.lostBeyond;

    // The car you already have is tested FIRST, not third. It is the cheapest clause and it
    // is the most informative answer to "why did nothing happen" — a ledger that reports
    // 'at-a-major' while a car sits 67 m away is technically true and useless.
    if (this.exists && !recall) { D.why = 'car-is-here'; D.carIsHere++; return; }

    // Out past every lit yard. The clearance is each site's OWN radius plus YARD_CLEAR,
    // and the flat CFG.car.spawn.minPlayerToMajor is the floor under it, so this is the
    // old 120 m everywhere the old rule applied and it is a shape rather than a guess at
    // a place with a 46 m yard. (CONFIG CHANGES FOR THE INTEGRATOR, docs/HANDOFF.md.)
    const sites = roads.sites ? roads.sites() : null;
    let nearMajor = -1, blocked = false;
    if (sites) {
      for (let i = 0; i < sites.length; i++) {
        const dx = px - sites[i].x, dz = pz - sites[i].z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (nearMajor < 0 || d < nearMajor) nearMajor = d;
        const r = (sites[i].radius || 0) + YARD_CLEAR;
        if (d < Math.max(SP.minPlayerToMajor, r)) blocked = true;
      }
    }
    D.nearestMajor = nearMajor;
    if (blocked && !recall && !this.owed) { D.why = 'at-a-major'; D.atMajor++; return; }

    // within 60 m of a road.
    const rd = roads.roadDistance(px, pz);
    D.playerRoad = rd;
    if (rd > SP.roadWithin) { D.why = 'no-road'; D.noRoad++; return; }

    // DEAD IS TESTED LAST, ON PURPOSE. Everything above is about WHERE the player is, and
    // a check that reaches this line has proved the player was somewhere a car should come
    // to. So the dispatch is owed: dying does not un-send it, and the respawn — which drops
    // the player into a lit yard — redeems it on the very next check.
    if (p.dead) {
      this.owed = true;
      this.owedT = OWED_TTL;
      D.why = 'player-dead';
      D.playerDead++;
      return;
    }

    // the camera's REAL forward, not the body's yaw.
    const cam = this._camera;
    if (cam && cam.aimDir) cam.aimDir(_fwd);
    else if (this.ctx.camera) this.ctx.camera.getWorldDirection(_fwd);
    else _fwd.set(0, 0, -1);
    const fl = Math.hypot(_fwd.x, _fwd.z) || 1;
    const fx = _fwd.x / fl, fz = _fwd.z / fl;

    // Pass 1 keeps the view cone. Pass 2 only runs when pass 1 found nothing, and it drops
    // the cone for candidates past RELAX_CONE_MIN — a dead-end spur has road on one side
    // only, and refusing forever because the player happens to be facing up it is the same
    // silent decline in a smaller costume.
    let found = this._findStop(px, pz, fx, fz, sites, false);
    if (!found) found = this._findStop(px, pz, fx, fz, sites, true);
    if (!found) { D.why = 'no-candidate'; D.noCandidate++; return; }

    D.why = 'ok';
    D.ok++;
    D.spawns++;
    this.owed = false;
    this.owedT = 0;
    this._place(this._stopX, this._stopZ);
  }

  /**
   * The candidate sweep: 24 bearings x 5 radii, scored to prefer BEHIND the player and the
   * far end of the 40-90 m band so the arrival has road to be heard on. Writes the winner
   * to `_stopX/_stopZ` and returns a boolean — a Vector2 return would allocate on a method
   * the fixed step calls twice a second.
   *
   * THE YARD REJECT IS NEW. The old sweep gated the PLAYER at 120 m from a site centre and
   * the STOP POINT at nothing at all, so with the player at 121 m the car could park 31 m
   * from Ashfall — inside its own 46 m yard. Now the car itself has to clear every yard,
   * which is the half of "it will spawn near them outside of destinations" that was missing.
   */
  _findStop(px, pz, fx, fz, sites, relax) {
    const D = this._dbg;
    const roads = this._roads;
    if (!relax) {
      D.bearings = 0; D.coneRejects = 0; D.roadMisses = 0; D.bandRejects = 0; D.yardRejects = 0;
    }
    D.relaxed = !!relax;
    let bestX = 0, bestZ = 0, bestScore = -Infinity, found = false;
    const jitter = this.rng ? this.rng.next() : 0;
    for (let i = 0; i < 24; i++) {
      const ang = (i + jitter) / 24 * TAU;
      const ux = Math.sin(ang), uz = Math.cos(ang);
      D.bearings++;
      // Outside the 90 degree cone: the dot of the bearing with the real forward.
      const dot = ux * fx + uz * fz;
      if (dot > VIEW_CONE_COS && !relax) { D.coneRejects++; continue; }
      for (let r = SP.max; r >= SP.min; r -= 12) {
        const cx = px + ux * r, cz = pz + uz * r;
        const info = roads.nearestRoadInfo ? roads.nearestRoadInfo(cx, cz, 40) : null;
        if (!info || !info.hit) { D.roadMisses++; continue; }
        const sx = info.x, sz = info.z;
        // re-measure from the ROAD POINT, which is what actually has to land in the band
        const ddx = sx - px, ddz = sz - pz;
        const d = Math.hypot(ddx, ddz);
        if (d < SP.min || d > SP.max) { D.bandRejects++; continue; }
        const bx = ddx / (d || 1), bz = ddz / (d || 1);
        const ahead = bx * fx + bz * fz;
        if (ahead > VIEW_CONE_COS && !(relax && d >= RELAX_CONE_MIN)) { D.coneRejects++; continue; }
        // and it never parks inside a lit yard.
        if (sites) {
          let inYard = false;
          for (let k = 0; k < sites.length; k++) {
            const qx = sx - sites[k].x, qz = sz - sites[k].z;
            const rr = (sites[k].radius || 0) + YARD_CLEAR;
            if (qx * qx + qz * qz < rr * rr) { inYard = true; break; }
          }
          if (inYard) { D.yardRejects++; continue; }
        }
        // score: further back is better, further away is better
        const score = (1 - ahead) * 2.0 + d / SP.max;
        if (score > bestScore) { bestScore = score; bestX = sx; bestZ = sz; found = true; }
      }
      if (found && bestScore > 2.6) break;   // good enough; do not burn 96 road queries
    }
    D.bestScore = found ? bestScore : 0;
    if (!found) return false;
    this._stopX = bestX; this._stopZ = bestZ;
    return true;
  }

  /**
   * Put the car on the road `pilotLast` metres short of the stop point and hand it to
   * the pilot. It arrives cold: one working headlight, then the engine ticking as it
   * cools, then a door-ajar chime. Nobody explains it.
   */
  _place(stopX, stopZ) {
    const roads = this._roads, terr = this._terrain;
    if (!roads || !terr) return;

    // heading of the road at the stop point, then walk backwards along it.
    let h = roads.bestRoadHeadingAt(stopX, stopZ, null);
    if (h === null || h === undefined || !isFinite(h)) h = 0;
    // bestRoadHeadingAt is MOSSWAY's (+Z at h=0); this file is in Three's basis where
    // forward is -Z. Convert once, here, and never again.
    let heading = wrapAngle(h + Math.PI);

    // Two directions of approach are equally valid roads; take whichever leaves the
    // start further from the player, so the arrival is a longer sound.
    const p = this._player;
    const px = p ? p.pos.x : 0, pz = p ? p.pos.z : 0;
    let bestH = heading, bestX = stopX, bestZ = stopZ, bestD = -1;
    for (let k = 0; k < 2; k++) {
      const hh = k === 0 ? heading : wrapAngle(heading + Math.PI);
      // start = stop - forward * pilotLast   (forward is -Z at heading 0)
      const sx = stopX + Math.sin(hh) * SP.pilotLast;
      const sz = stopZ + Math.cos(hh) * SP.pilotLast;
      if (roads.nearestRoadPoint) {
        const info = roads.nearestRoadInfo(sx, sz, 24);
        if (!info || !info.hit) continue;
        const d = Math.hypot(info.x - px, info.z - pz);
        if (d > bestD) { bestD = d; bestH = hh; bestX = info.x; bestZ = info.z; }
      }
    }

    this.x = bestX; this.z = bestZ;
    this.y = terr.heightAt(this.x, this.z);
    this.heading = bestH;
    this.speed = PILOT_CRUISE;
    this.steer = 0; this.pitch = 0; this.roll = 0; this.bob = 0;
    this.pilotX = stopX; this.pilotZ = stopZ;

    this.exists = true;
    this.mode = 'arriving';
    this.hotwired = false;      // every spawn is a fresh hotwire
    this.engineOn = true;
    this.hitCooldown = 0;
    this.spawnCooldown = SPAWN_COOLDOWN;
    this._sync();
    this._removeRoof();
    this.body.root.visible = true;
    this._setHeadlights(true);
    this._emit('car:spawned', { x: this.x, z: this.z });
    this._noise('car:arrive', ENGINE_NOISE_R);
  }

  /** prev == curr: no interpolation streak across a placement. */
  _sync() {
    this.prevX = this.x; this.prevY = this.y; this.prevZ = this.z;
    this.prevHeading = this.heading;
    this.prevPitch = this.pitch; this.prevRoll = this.roll; this.prevBob = this.bob;
    this.prevWheelRot = this.wheelRot; this.prevSteer = this.steer;
  }

  /* ----------------------------------------------------------------- lights */

  /**
   * The one working lamp's filament, 0..1. The park cool-down dims it and wear browns it,
   * and both have to be in one number or the two would fight over body.setLamp.
   */
  _filament() {
    return clamp01(this.lampFade) * (1 - WEAR_LAMP_LOSS * clamp01(this.wear));
  }

  /**
   * BLOCKER 1. This file used to call _setHeadlights(TRUE) in three places — _place,
   * _beginEnter and placeAt — and _setHeadlights(false) in NONE of them. One autonomous
   * spawn therefore lit the census SpotLight for the rest of the session: ctx.shared.lit
   * pinned at >= 0.52 forever, and "seeing is how you are seen" inverted into a trade with
   * no cost. It is now switched off on exit, on death/respawn, and by the park cool-down.
   *
   * The lampFade write is deliberately ABOVE the no-change early-out: re-asserting `true`
   * on a car that is already lit but half-way through its cool-down has to bring the
   * filament back up, and the early-out would have swallowed that.
   */
  _setHeadlights(on) {
    on = !!on;
    this.lampFade = on ? 1 : 0;
    if (on === this.headlightsOn) {
      if (on && this.body) this.body.setLamp(this._filament(), true);
      return;
    }
    this.headlightsOn = on;
    const L = this._lights;
    if (!on) {
      if (L && L.setHeadlights) L.setHeadlights(false);
      if (this.headHandle) { if (L) L.release(this.headHandle); this.headHandle = null; }
      if (this.body) this.body.setLamp(0, false);
      return;
    }
    // One borrowed rover for the warm pool ON the lens itself — the census gives the
    // headlights one SpotLight and the beam alone leaves the car's own nose black.
    // ttl 0 = persistent until released.
    if (L && L.borrow && !this.headHandle) {
      this.headHandle = L.borrow('headlamp', this.x, this.y + 1.0, this.z, 0xffdca6, HEAD_POOL, 0);
    }
    if (this.body) this.body.setLamp(this._filament(), true);
  }

  /* ------------------------------------------------------------------ roof  */

  /**
   * The roof is a mantle target and the body is something you take cover behind — but
   * ONLY while it is parked. Colliders are static between bakes (collision.js header)
   * and re-adding three of them every fixed step at 23 m/s is churn nobody needs, so
   * the car is solid when it is still and is a moving pose when it is not. Three
   * circles along the spine, not one OBB: a circle has no yaw convention to get wrong.
   */
  _placeRoof() {
    if (this._roofPlaced) return;
    const col = this._collision;
    if (!col || !col.addCircle) return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const y0 = this.y + 0.30, y1 = this.y + ROOF_Y;
    for (let i = 0; i < 3; i++) {
      const t = (i - 1) * 1.30;
      this._roofColliders[i] = col.addCircle(
        this.x + fx * t, this.z + fz * t, 0.98, y0, y1, 'car', true,
      );
    }
    this._roofPlaced = true;
  }

  /**
   * Is this collider id one of ours? The car adds three roof circles while it is parked
   * and must never depenetrate off them. collision.js is another lane's file, so we do
   * not tag anything there — we own three ids and a three-way compare is cheaper than a
   * string test anyway. Allocates nothing.
   */
  _isOwnCollider(id) {
    if (id === undefined || id === null || id < 0) return false;
    const r = this._roofColliders;
    return id === r[0] || id === r[1] || id === r[2];
  }

  _removeRoof() {
    if (!this._roofPlaced) return;
    const col = this._collision;
    if (col && col.removeCollider) {
      for (let i = 0; i < 3; i++) {
        if (this._roofColliders[i] >= 0) col.removeCollider(this._roofColliders[i]);
        this._roofColliders[i] = -1;
      }
    }
    this._roofPlaced = false;
  }

  /* ------------------------------------------------------------------- step */

  step(dt) {
    if (!this.body) return;

    this.prevX = this.x; this.prevY = this.y; this.prevZ = this.z;
    this.prevHeading = this.heading;
    this.prevPitch = this.pitch; this.prevRoll = this.roll; this.prevBob = this.bob;
    this.prevWheelRot = this.wheelRot; this.prevSteer = this.steer;

    this.hitCooldown -= dt;
    this.spawnCooldown -= dt;
    // An owed dispatch expires. A car that was sent for you four deaths ago is not a beat.
    if (this.owed) {
      this.owedT -= dt;
      if (this.owedT <= 0) { this.owed = false; this.owedT = 0; }
    }

    if (!this.exists) {
      this.spawnCheckT -= dt;
      if (this.spawnCheckT <= 0) {
        this.spawnCheckT = SPAWN_CHECK_EVERY;
        if (this.spawnCooldown <= 0) this._considerSpawn();
      }
      return;
    }

    switch (this.mode) {
      case 'arriving': this._stepArriving(dt); break;
      case 'idle': this._stepIdle(dt); break;
      case 'entering': this._stepEntering(dt); break;
      case 'driving': this._stepDriving(dt); break;
      case 'exiting': this._stepExiting(dt); break;
      default: break;
    }

    // The seat yaw clamp moves AIM, so it belongs to the step, not to present. camera is
    // manifest 12 and has already integrated this step's look by the time we run.
    this._clampSeatLook();

    // The engine is a disturbance for as long as it runs, wherever it is.
    if (this.engineOn) {
      this.noiseT -= dt;
      if (this.noiseT <= 0) {
        this.noiseT = ENGINE_NOISE_EVERY;
        this._noise('car:engine', ENGINE_NOISE_R);
      }
    }

    // The spawn rule keeps running while a car exists: this is the ">300 m away or
    // lost" clause, which is how you never have to walk back to where you left it.
    if (!this.ctx.shared.inCar) {
      this.spawnCheckT -= dt;
      if (this.spawnCheckT <= 0) {
        this.spawnCheckT = SPAWN_CHECK_EVERY;
        if (this.spawnCooldown <= 0 && (this.mode === 'idle' || this.mode === 'arriving')) {
          this._considerSpawn();
        }
      }
    }
  }

  /* ------------------------------------------------------------- the pilot  */

  /**
   * PEACHFUL's `_pilot` (Desktop/peachful/src/vehicle.js:155-179): sample the path field
   * left and right of a look-ahead point and steer toward the lower one. Here the field
   * is roads.roadDistance and the pilot also has a destination, because it is not
   * cruising — it is arriving. It brakes to a stop at the point the spawn rule chose,
   * SO THE PLAYER HEARS IT ARRIVE.
   */
  _stepArriving(dt) {
    const roads = this._roads;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);

    const dx = this.pilotX - this.x, dz = this.pilotZ - this.z;
    const remaining = Math.hypot(dx, dz);

    // steer: half from the road field ahead, half from the bearing to the stop point.
    let steerIn = 0;
    if (roads) {
      const look = 12;
      const lx = this.x + fx * look, lz = this.z + fz * look;
      const dL = roads.roadDistance(lx - rx * 4.5, lz - rz * 4.5);
      const dR = roads.roadDistance(lx + rx * 4.5, lz + rz * 4.5);
      steerIn = clamp((dR - dL) * 0.42, -1, 1);
    }
    if (remaining > 0.5) {
      const lat = (dx * rx + dz * rz) / remaining;
      const along = (dx * fx + dz * fz) / remaining;
      // a target behind us is a lost cause; just stop.
      if (along < -0.2) { this.pilotX = this.x; this.pilotZ = this.z; }
      else steerIn = clamp(steerIn * 0.45 - lat * 1.9, -1, 1);
    }

    // throttle: cruise, then shed speed into the stop.
    let want = PILOT_CRUISE;
    if (remaining < PILOT_BRAKE_AT) want = PILOT_CRUISE * clamp01(remaining / PILOT_BRAKE_AT);
    const throttle = this.speed < want ? 1 : 0;
    const brake = this.speed > want + 0.6 ? 1 : 0;

    this._integrate(dt, steerIn, throttle, brake, 0);

    if (remaining <= PILOT_ARRIVE || (this.speed < 0.10 && remaining < 6)) {
      this.speed = 0;
      this.steer = 0;
      this.mode = 'idle';
      this.engineOn = false;
      // arrives cold: the block ticks as it cools, then the door chimes because it is ajar
      this.coolLeft = COOL_TICKS;
      this.coolT = COOL_GAP;
      this._noise('car:door-chime', 24);
      this._placeRoof();
    }
  }

  /* -------------------------------------------------------------- parked -- */

  _stepIdle(dt) {
    this.speed = damp(this.speed, 0, 6, dt);
    this.steer = damp(this.steer, 0, 6, dt);
    this._settle(dt);

    // the engine ticking as it cools. Five ticks, slowing, then nothing.
    if (this.coolLeft > 0) {
      this.coolT -= dt;
      if (this.coolT <= 0) {
        this.coolLeft--;
        this.coolT = COOL_GAP * (1 + (COOL_TICKS - this.coolLeft) * 0.35);
        this._noise('car:cool-tick', 12);
      }
    }

    // BLOCKER 1, the beat. A car that arrived on its own and parked used to sit there
    // with its lamp burning for the rest of the session. Now the filament falls away over
    // PARK_DARK_S while the block ticks, and the census SpotLight goes out at the bottom
    // of the fade — so the arrival is a light coming toward you, the wait is a light going
    // out, and the woods come back. Nothing here creates or destroys a light.
    if (this.headlightsOn && !this.ctx.shared.inCar) {
      this.lampFade -= dt / PARK_DARK_S;
      if (this.lampFade <= 0) { this.lampFade = 0; this._setHeadlights(false); }
      else if (this.body) this.body.setLamp(this._filament(), false);
    }

    // WHEEL 4, 'Keep' — hook 'wearRepair', base 0 per minute (nodes.js:123-124 names this
    // exact call site as "the parked branch"). Reduced on FRAMES, not on events. With the
    // node unowned the chain hands the 0 straight back and this costs one Map lookup; with
    // it owned, and only somewhere lit, the car mends itself while it sits.
    const pr = this._progress;
    if (pr && typeof pr.perk === 'function') {
      const perMin = pr.perk('wearRepair', 0);
      if (perMin > 0 && this.wear > 0) {
        this.wear = Math.max(0, this.wear - perMin * dt / 60);
        if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), false);
      }
    }

    this._pollEnter(dt);
  }

  /**
   * Hold E for 0.4 s within 2.2 m of the driver door. THE DOOR CREAKS: an interaction
   * that answers with nothing reads as broken, and so does a refusal, so pressing at a
   * car you cannot reach makes its own (much smaller) sound.
   */
  _pollEnter(dt) {
    const p = this._player;
    if (!p || p.dead) { this.holdT = 0; return; }

    // driver door in world space
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const doorX = this.x + rx * DOOR.x + fx * DOOR.z;
    const doorZ = this.z + rz * DOOR.x + fz * DOOR.z;
    const d = Math.hypot(p.pos.x - doorX, p.pos.z - doorZ);

    const held = this._useHeld();
    if (!held) {
      this.holdT = 0;
      this.refuseLatch = false;
      return;
    }
    if (d > ENTER_RANGE) {
      // a press at something out of reach: one dry latch, once, then silence until the
      // key comes up. The world always answers.
      if (!this.refuseLatch && d < 9) {
        this.refuseLatch = true;
        this._noise('car:handle-refuse', 6, doorX, doorZ);
      }
      this.holdT = 0;
      return;
    }
    this.holdT += dt;
    if (this.holdT >= HOLD_TIME) {
      this.holdT = 0;
      this._beginEnter();
    }
  }

  _beginEnter() {
    const cam = this.ctx.camera;
    if (cam) {
      this.fromX = cam.position.x; this.fromY = cam.position.y; this.fromZ = cam.position.z;
      // the fov the camera lane was holding on foot: the reparent blends out of it and
      // the exit blends back into it, so we hand the value back exactly as we found it.
      if (typeof cam.fov === 'number') this.baseFov = cam.fov;
    } else { this.fromX = this.x; this.fromY = this.y + SEAT.y; this.fromZ = this.z; }
    this.mode = 'entering';
    this.enterT = 0;
    // WHEEL 1, 'Hotwire' — hook 'hotwireS', base CFG.car.hotwire (nodes.js:119-120).
    // Read at the moment the door shuts, never captured: a node bought between two entries
    // has to bite on the next one. Clamped at 0 so a hostile chain cannot make it negative.
    const pr = this._progress;
    const hotS = (pr && typeof pr.perk === 'function') ? pr.perk('hotwireS', K.hotwire) : K.hotwire;
    this.hotwireTotal = Number.isFinite(hotS) ? Math.max(0, hotS) : K.hotwire;
    this.hotwireT = this.hotwired ? 0 : this.hotwireTotal;
    this.crankPips = 0;
    this.ctx.shared.inCar = true;
    this.fovNow = this.baseFov;
    this._fovLast = NaN;
    this._removeRoof();

    // Freeze the body, then place it ONCE. teleport() collapses prev/curr, which is
    // exactly right for a single placement and exactly wrong every step (the audit bug).
    this._setCarried(true);
    const p = this._player;
    if (!this._carrySeated && p && typeof p.teleport === 'function') {
      p.teleport(this.x, this.z, this.heading);
      this._carrySeated = true;
    }

    this._noise('car:door-creak', 18);
    this._setHeadlights(true);
  }

  _stepEntering(dt) {
    this.speed = damp(this.speed, 0, 8, dt);
    this._settle(dt);
    this.enterT += dt;

    // the player rides with the car from the moment the door shuts, so the world streams
    // around the CAR and the torch, the moon box and the chunk ring all follow it.
    this._carryPlayer();

    if (this.enterT < REPARENT) return;

    // A hotwire with an audible crank: three pips of a starter that does not catch, then
    // it does. This only happens on the FIRST entry after a spawn. The pips are spaced off
    // `hotwireTotal`, not off CFG, so WHEEL 1's half-second hotwire is still three pips and
    // not one — the perk makes the beat faster, it does not delete it.
    if (this.hotwireT > 0) {
      const before = this.hotwireT;
      this.hotwireT -= dt;
      const pip = Math.floor((this.hotwireTotal - this.hotwireT) / (this.hotwireTotal / 3));
      if (pip > this.crankPips && before > 0) {
        this.crankPips = pip;
        this._noise('car:crank', 22);
      }
      if (this.hotwireT > 0) return;
      this.hotwired = true;
    }
    this.engineOn = true;
    this.noiseT = 0;
    this.mode = 'driving';
    this._emit('car:entered', null);
    this._noise('car:start', ENGINE_NOISE_R);
  }

  /* ------------------------------------------------------------- driving -- */

  _stepDriving(dt) {
    // A steers left. In Three's basis forward is (-sin h, 0, -cos h), so INCREASING the
    // heading swings the nose to the player's left — the axis goes straight through.
    // (Measured: a negation here turned the car right when you pressed A.)
    const steerIn = this._axis('right', 'left');
    const throttle = this._axis('back', 'forward') > 0 ? 1 : 0;
    const brake = this._axis('back', 'forward') < 0 ? 1 : 0;
    const i = this._input;
    const hardBrake = !!(i && i.held && i.held('jump'));   // Space [mossway game.js:1823]

    this._integrate(dt, steerIn, throttle, brake, hardBrake ? 1 : 0);
    this._carryPlayer();
    this._ram(dt);
    this._horn(dt);

    // exit: the same 0.4 s hold, and it refuses at speed with a sound.
    if (this._useHeld()) {
      if (Math.abs(this.speed) > EXIT_MAX_SPEED) {
        if (!this.refuseLatch) { this.refuseLatch = true; this._noise('car:door-refuse', 8); }
        this.holdT = 0;
      } else {
        this.holdT += dt;
        if (this.holdT >= HOLD_TIME) { this.holdT = 0; this._beginExit(); }
      }
    } else {
      this.holdT = 0;
      this.refuseLatch = false;
    }
  }

  _beginExit() {
    this.mode = 'exiting';
    this.enterT = 0;
    this.engineOn = false;
    this.speed = 0;
    this.coolLeft = COOL_TICKS;
    this.coolT = COOL_GAP;
    this._noise('car:door-creak', 18);

    // BLOCKER 1. You turn it off when you get out. Without this the census SpotLight the
    // headlights own stayed lit for the rest of the session and ctx.shared.lit stayed
    // pinned with it, so crouching in a hedge 200 m away still read as standing in a
    // floodlight. The block goes on ticking either way — the engine cooling is the beat,
    // the light going is what gives the woods back.
    this._setHeadlights(false);

    // Unfreeze BEFORE the placement, so the controller owns its own body again from the
    // frame it lands on. The exit teleport is a placement, so the prev/curr collapse in
    // teleport() is what we want here.
    this._setCarried(false);
    this._carrySeated = false;

    // 1.2 m off the driver side, on the ground, facing along the car's heading.
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const ox = this.x - rx * (EXIT_OFFSET + 0.55);
    const oz = this.z - rz * (EXIT_OFFSET + 0.55);
    const p = this._player;
    if (p && p.teleport) {
      const col = this._collision;
      const r = CFG.player && CFG.player.RADIUS ? CFG.player.RADIUS : 0.35;
      const h = CFG.player && CFG.player.STAND_H ? CFG.player.STAND_H : 1.8;
      let tx = ox, tz = oz;
      if (col && col.canOccupy && !col.canOccupy(ox, oz, r, h)) {
        // refuse-rather-than-clip: try the other side, then the tail.
        const ax = this.x + rx * (EXIT_OFFSET + 0.55), az = this.z + rz * (EXIT_OFFSET + 0.55);
        if (col.canOccupy(ax, az, r, h)) { tx = ax; tz = az; }
        else {
          const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
          tx = this.x - fx * 3.2; tz = this.z - fz * 3.2;
        }
      }
      p.teleport(tx, tz, this.heading);
    }

    // present() blends cam.position = lerp(from, seat, t) with t running 1 -> 0 across
    // the exit, so `from` has to be where you are STANDING, not where the camera is now.
    // Capturing cam.position here (which is the seat, because this file put it there)
    // made the exit hold at the seat for 0.35 s and then CUT to the body. Alex's law is
    // that the camera never gets taken away; a cut is the camera being taken away.
    //
    // MEASURED THIS ROUND, and it was a 75 metre cut nobody had ever looked at. This line
    // used to read `p.pos.y + p.eyeY`, but controller.js:331 documents `eyeY` as "absolute
    // world Y" — it already contains pos.y, plus the crouch blend, the slide drop, the land
    // spring and the death sink. Adding pos.y to it DOUBLED the height: on a hill 75 m above
    // sea level the exit blend lifted the camera to 152.95 m over 0.35 s and then dropped it
    // back to 77.32 in a single frame the moment the car let go. Read exactly what
    // player/camera.js:310 reads — renderEyeY, the interpolated one, falling back to eyeY —
    // and the whole thing becomes the 1.75 m step out of a door it was always supposed to be.
    if (p && p.pos) {
      this.fromX = p.pos.x;
      const eye = (typeof p.renderEyeY === 'number' && isFinite(p.renderEyeY)) ? p.renderEyeY
        : (typeof p.eyeY === 'number' && isFinite(p.eyeY)) ? p.eyeY
          : p.pos.y + ((CFG.player && CFG.player.EYE) || 1.68);
      this.fromY = eye;
      this.fromZ = p.pos.z;
    } else {
      const cam = this.ctx.camera;
      if (cam) { this.fromX = cam.position.x; this.fromY = cam.position.y; this.fromZ = cam.position.z; }
    }
  }

  _stepExiting(dt) {
    this._settle(dt);
    this.enterT += dt;
    if (this.enterT < REPARENT) return;
    this.mode = 'idle';
    this.ctx.shared.inCar = false;
    this.spawnCooldown = SPAWN_COOLDOWN;
    this._fovLast = NaN;          // the camera lane owns cam.fov again from here
    this._placeRoof();
    this._emit('car:exited', null);
  }

  /* ---------------------------------------------------- MOSSWAY kinematics  */

  /**
   * donor: donors/mossway/game.js:1813-1876 (updateVehicle), verbatim numbers, hosted in
   * PEACHFUL's basis (Desktop/peachful/src/vehicle.js:117-121 _syncBasis — Three's local
   * forward is -Z, so fwd = (-sin, 0, -cos) and right = (cos, 0, -sin)). Every constant
   * that CFG.car owns is read from CFG; the rest carry their donor line above.
   */
  _integrate(dt, steerIn, throttle, brake, hardBrake) {
    const roads = this._roads, terr = this._terrain;
    const rd = roads ? roads.roadDistance(this.x, this.z) : 99;
    const onRoad = rd < ON_ROAD_D;
    // Wear costs top speed and nothing else: a beaten car is a slower car, which is a read
    // you get through the windscreen instead of off a gauge. WHEEL 4 is the only thing
    // that gives any of it back. At WEAR_START the on-road cap is 22.0 rather than 23.0.
    const worn = 1 - WEAR_SPEED_LOSS * clamp01(this.wear);
    const maxForward = (onRoad ? K.onRoad : K.offRoad) * worn;
    const maxReverse = (onRoad ? MAX_REV_ON : MAX_REV_OFF) * worn;

    if (throttle) this.speed += (onRoad ? K.accelOn : K.accelOff) * dt;
    if (brake) {
      if (this.speed > 0.55) this.speed -= K.brake * dt;
      else this.speed -= (onRoad ? CREEP_ON : CREEP_OFF) * dt;
    }
    if (hardBrake) this.speed = damp(this.speed, 0, HARD_BRAKE_LAMBDA, dt);

    const drag = (onRoad ? 0.20 : 0.72) + Math.abs(this.speed) * (onRoad ? 0.012 : 0.025);
    if (!throttle && !brake) this.speed = damp(this.speed, 0, drag, dt);
    if (this.speed > maxForward) this.speed = damp(this.speed, maxForward, 3.4, dt);
    if (this.speed < -maxReverse) this.speed = damp(this.speed, -maxReverse, 4.0, dt);
    // ONE DELIBERATE DEVIATION from MOSSWAY. Its cap is a damp, not a clamp, so throttle
    // and pull reach equilibrium ABOVE the cap: 23 + accel/lambda = 23 + 7.0/3.4 = 25.06
    // m/s, measured. CFG.car.onRoad says 23.0 and DESIGN's whole "3.5x foot speed / the
    // Hunter is 1.2 m/s slower than you" arithmetic is written against 23.0, so the soft
    // approach is kept and the number is made true.
    this.speed = clamp(this.speed, -maxReverse, maxForward);

    // steering lock shrinks with speed [mossway game.js:1841; CFG.car.steerLock/Shrink/ShrinkAt]
    const limit = K.steerLock * (1 - Math.min(Math.abs(this.speed) / K.steerShrinkAt, K.steerShrink));
    this.steer = damp(this.steer, steerIn * limit, STEER_LAMBDA, dt);
    const effect = 0.045 * this.speed / (1 + Math.abs(this.speed) * 0.018);
    this.heading = wrapAngle(this.heading + this.steer * effect * dt);

    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    this.travel += Math.abs(this.speed) * dt;
    this.wheelRot -= this.speed * dt / WHEEL_RADIUS;

    this._resolveContacts(dt, fx, fz);

    const gy = terr ? terr.heightAt(this.x, this.z) : 0;
    this.y = damp(this.y, gy, GROUND_LAMBDA, dt);

    this._tilt(dt, onRoad);
  }

  /** Four terrain samples for pitch and roll, clamped [CFG.car.pitchClamp/rollClamp]. */
  _tilt(dt, onRoad) {
    const terr = this._terrain;
    if (!terr) return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const hf = terr.heightAt(this.x + fx * SAMPLE_FWD, this.z + fz * SAMPLE_FWD);
    const hb = terr.heightAt(this.x - fx * SAMPLE_FWD, this.z - fz * SAMPLE_FWD);
    const hr = terr.heightAt(this.x + rx * SAMPLE_SIDE, this.z + rz * SAMPLE_SIDE);
    const hl = terr.heightAt(this.x - rx * SAMPLE_SIDE, this.z - rz * SAMPLE_SIDE);
    // nose-up on a climb: forward is -Z, so a rising front is a POSITIVE x rotation.
    const wantPitch = Math.atan2(hf - hb, SAMPLE_FWD * 2) * 0.78;
    // roll is about the car's local Z (which points BACKWARD), so a positive roll raises
    // the car's local +X — its RIGHT. Higher ground on the right therefore wants a
    // POSITIVE roll, and a left turn wants a NEGATIVE one, because a body leans OUT of a
    // corner and not into it. Both signs were wrong on the first pass and both are
    // invisible in a number; they show up the moment you look at the horizon.
    const wantRoll = Math.atan2(hr - hl, SAMPLE_SIDE * 2) * 0.72
      - this.steer * Math.min(Math.abs(this.speed) / K.onRoad, 1) * 0.035;
    this.pitch = damp(this.pitch, clamp(wantPitch, -K.pitchClamp, K.pitchClamp), TILT_LAMBDA, dt);
    this.roll = damp(this.roll, clamp(wantRoll, -K.rollClamp, K.rollClamp), TILT_LAMBDA, dt);

    const rough = onRoad ? 0.010 : 0.032;   // [mossway game.js:1871]
    const targetBob = Math.sin(this.travel * (onRoad ? 1.35 : 1.8)) * rough
      * Math.min(Math.abs(this.speed), 14);
    this.bob = damp(this.bob, targetBob, BOB_LAMBDA, dt);
  }

  /** Parked/entering/exiting: keep the pose alive on the terrain without driving it. */
  _settle(dt) {
    const terr = this._terrain;
    if (terr) this.y = damp(this.y, terr.heightAt(this.x, this.z), GROUND_LAMBDA, dt);
    this._tilt(dt, true);
  }

  /**
   * FIX 3. Trunks are resolved through collision so the car SLIDES off them; MOSSWAY
   * pushed out of its own tree list and multiplied speed by 0.58 PER FRAME
   * (donors/mossway/game.js:1799-1801), which stops the car dead and does it harder the
   * faster your monitor is. Here: a forward probe for the impact, then depenetration
   * off the two axle points, then a TIME-BASED scrub and a heading nudge along the
   * surface, which is the difference between hitting a tree and glancing off one.
   */
  _resolveContacts(dt, fx, fz) {
    const col = this._collision;
    if (!col) return;
    const feet = this.y;
    let hit = false, nx = 0, nz = 0;

    // --- forward probe: what did we just drive into ---
    if (col.raycast && Math.abs(this.speed) > 0.4) {
      const s = this.speed > 0 ? 1 : -1;
      _org.set(this.x - fx * s * 0.2, feet + 0.85, this.z - fz * s * 0.2);
      _dir.set(fx * s, 0, fz * s);
      const reach = Math.abs(this.speed) * dt + 2.35;
      const r = col.raycast(_org, _dir, reach, MASK.SOLID);
      // AUDIT FIX. This used to read `r.tag !== 'car'`. collision.js only fills `_tag`
      // from the object form of addCollider; addCircle (which is what _placeRoof uses)
      // never sets one, and 'car' there is the CHUNK ID, not a tag. So the guard was
      // dead and the car could depenetrate off its own parked roof. We know our own
      // collider ids — skip by id, and never reach into collision.js to fix it there.
      if (r && r.hit && !r.ground && !this._isOwnCollider(r.id)) {
        hit = true; nx = r.normal.x; nz = r.normal.z;
      }
    }

    // --- depenetration off THREE points along the spine, up to 3 passes ---
    // MEASURED: with only the two axle probes, a trunk beside the car's middle was never
    // seen and the body ended up 0.98 m from a trunk it should have been 1.57 m off —
    // the car ate the tree. Three points at -1.4 / 0 / +1.4 cover a 4.3 m body.
    if (col.debugNearest) {
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (let a = 0; a < 3; a++) {
          const t = (a - 1) * 1.40;
          const ax = this.x + fx * t, az = this.z + fz * t;
          const near = col.debugNearest(ax, az, 3.0);
          if (!near) continue;
          // copy the scalars: debugNearest returns shared scratch (collision.js:497-506).
          const cx = near.x, cz = near.z, cr = near.radius;
          const y0 = near.y0, y1 = near.y1;
          // Skip our OWN roof colliders by id (collision.js:505 fills out.id). `near.tag`
          // is never set for an addCircle collider, so the old tag compare was dead code.
          if (this._isOwnCollider(near.id)) continue;
          if (y1 < feet + 0.34 || y0 > feet + ROOF_Y) continue;   // a kerb, or an overhang
          const minD = cr + 1.02;
          let dx = ax - cx, dz = az - cz;
          let d = Math.hypot(dx, dz);
          if (d >= minD) continue;
          if (d < 1e-4) { dx = -fz; dz = fx; d = 1; }
          const push = (minD - d) + 0.01;
          this.x += dx / d * push;
          this.z += dz / d * push;
          if (!hit) { nx = dx / d; nz = dz / d; }
          hit = true; moved = true;
        }
        if (!moved) break;
      }
    }

    if (!hit) return;

    // The scrub, time-based. CFG.car.treeHit = { targetMul: 0.35, lambda: 12 }.
    const before = this.speed;
    this.speed = damp(this.speed, this.speed * K.treeHit.targetMul, K.treeHit.lambda, dt);

    // The nudge: steer along the trunk rather than into it. The tangent is the normal
    // turned 90 degrees; take whichever of the two is closer to where we are pointing.
    const tx = -nz, tz = nx;
    const s = (tx * fx + tz * fz) >= 0 ? 1 : -1;
    const want = Math.atan2(-tx * s, -tz * s);   // inverse of fwd = (-sin, 0, -cos)
    const dh = angleDelta(this.heading, want);
    this.heading = wrapAngle(this.heading + dh * clamp01(Math.abs(before) / 14) * 3.2 * dt);

    const lost = Math.abs(before) - Math.abs(this.speed);
    if (this.hitCooldown <= 0 && lost > 0.35) {
      this.hitCooldown = HIT_COOLDOWN;
      this._noise('car:impact', 34);
      // The car keeps the dent. Drive it into enough trees and it will not do 23 any more,
      // and the one working lamp browns out with it — which is the only reason WHEEL 4's
      // 'Keep' has anything to repair.
      this.wear = clamp01(this.wear + clamp01(lost / 9) * WEAR_PER_IMPACT);
      if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), true);
      const fx2 = this._fx;
      if (fx2) {
        // BLOCKER. fx.trauma is a NUMBER (fx/fx.js:52); the setter is addTrauma
        // (fx/fx.js:232). `fx2.trauma(...)` threw a TypeError inside step() the moment
        // trauma went non-zero, and three throws in a row stop the whole loop.
        if (typeof fx2.addTrauma === 'function') fx2.addTrauma(clamp01(lost / 9) * 0.55);
        if (fx2.impact) {
          _v.set(this.x + fx * 2.0, feet + 0.9, this.z + fz * 2.0);
          _dir.set(nx, 0, nz);
          fx2.impact('wood', _v, _dir, clamp01(lost / 6) * 1.4);
        }
      }
    }
  }

  /* ----------------------------------------------------------------- ram -- */

  /**
   * A ram kills a pallbearer above 8 m/s and staggers a Hunter (DESIGN section 3). The
   * enemies system is another lane and is read lazily; if it does not expose ramHit the
   * car simply drives through nothing and no test lies about it. Requested in HANDOFF.
   */
  _ram(dt) {
    this.ramT -= dt;
    if (this.ramT > 0) return;
    // WHEEL 2, 'Ram' — hook 'ramMinSpeed', base Infinity (nodes.js:121-122). The base is
    // Infinity ON PURPOSE: with the node unowned the car rams NOTHING, which is the whole
    // reason the card is worth a point. This file used to ram unconditionally at 8 m/s,
    // which meant the node bought the player something they already had. With progress out
    // of the manifest entirely we fall back to DESIGN's 8 m/s so an M0 build still behaves.
    const pr = this._progress;
    const minSpeed = (pr && typeof pr.perk === 'function')
      ? pr.perk('ramMinSpeed', Infinity) : RAM_SPEED;
    if (!(Math.abs(this.speed) >= minSpeed)) return;
    this.ramT = RAM_EVERY;
    const en = this._enemies;
    if (!en || typeof en.ramHit !== 'function') return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const s = this.speed > 0 ? 1 : -1;
    const hits = en.ramHit(
      this.x + fx * s * 2.1, this.z + fz * s * 2.1,
      RAM_RADIUS, Math.abs(this.speed), fx * s, fz * s,
    );
    // A ram is not free. enemies.ramHit returns how many it caught (enemies.js:455), so
    // the car pays for exactly the bodies it actually hit and never for a swing at air.
    if (hits > 0) {
      this.wear = clamp01(this.wear + WEAR_PER_RAM_HIT * hits);
      if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), true);
      this._noise('car:ram', 30);
      const fxs = this._fx;
      if (fxs && typeof fxs.addTrauma === 'function') fxs.addTrauma(clamp01(hits * 0.18) * 0.6);
    }
  }

  /* ---------------------------------------------------------------- horn -- */

  /**
   * WHEEL 3, 'Horn' — hook 'onHorn' (nodes.js:125-126). H, from the seat.
   *
   * The horn belongs to the CAR: pressing it is a 46 m disturbance whatever you own, and
   * a control that answers with nothing reads as broken. The NODE is what turns it into a
   * TOOL — it wakes everything already alerted inside 80 m and walks it in to this spot,
   * which is what makes "then get out and walk away" a plan rather than a joke. So the
   * hook is fired unconditionally and the tree decides what the sound means. Firing it
   * with nothing installed is also what keeps progress.hookReport() honest: a hook point
   * with installers and zero lifetime runs is the defect that audit hunts for.
   */
  _horn(dt) {
    this.hornT -= dt;
    // The cooldown is tested BEFORE the edge is read, so a honk that lands inside the
    // cooldown is not silently swallowed out of the test door's one-shot latch.
    if (this.hornT > 0) return;
    if (!this._hornPressed()) return;
    this.hornT = HORN_COOLDOWN;
    this._noise('car:horn', HORN_NOISE_R);
    const pr = this._progress;
    if (pr && typeof pr.fire === 'function') pr.fire('onHorn', this.x, this.z);
  }

  /* --------------------------------------------------------------- carry -- */

  /**
   * While you are in it, the player body rides the car. The chunk ring, the moon's
   * shadow box, the torch and every distance query in the game are keyed off the
   * player, so a passenger who stayed at the door would stream the wrong county.
   *
   * AUDIT FIX, and it is a feel bug, not a tidy-up. This used to call p.teleport() EVERY
   * driving step. teleport() runs the controller's _sync(), which collapses prev == curr
   * == render — so the player's interpolation was dead for the whole drive, and because
   * the controller kept simulating underneath the car it went on emitting player:step
   * and player:land into the dread lane's mimic beat and the audio lane's footsteps
   * while you were sitting in a vehicle. You could hear yourself walking at 23 m/s.
   *
   * THE CARRIED PATH (player lane owns it, added this round):
   *   p.setCarried(true|false)  — the controller freezes: no locomotion, no ground
   *                              resolve, and crucially no player:step / player:land.
   *   p.carryTo(x, y, z)        — optional; write the ridden pose and let the controller
   *                              roll its own prev/curr so interpolation stays alive.
   * With neither present we write p.pos directly, which is still strictly better than
   * teleport because it never calls _sync(). The only teleport is the single placement
   * at _beginEnter — one frame, one time, where a prev/curr collapse is CORRECT.
   */
  _carryPlayer() {
    const p = this._player;
    if (!p) return;
    if (typeof p.carryTo === 'function') { p.carryTo(this.x, this.y, this.z); }
    else if (p.pos) { p.pos.x = this.x; p.pos.y = this.y; p.pos.z = this.z; }
    if (p.vel) p.vel.set(0, 0, 0);
    // yaw is NOT written: the camera lane owns aim, and _clampSeatLook already holds it
    // inside the seat's cone. Writing it here fought the clamp and the mouse both.
  }

  /**
   * Ask the player lane to freeze / unfreeze. `setCarried` is the door; `freeze` is the
   * flag form of the same thing. Neither is required for the car to work — see
   * _carryPlayer — but without one of them the controller keeps stepping under the car.
   */
  _setCarried(on) {
    on = !!on;
    this._carried = on;
    const p = this._player;
    if (!p) return;
    if (typeof p.setCarried === 'function') p.setCarried(on);
    else if (typeof p.freeze === 'boolean') p.freeze = on;
    if (!on && p.vel) p.vel.set(0, 0, 0);
  }

  /**
   * Let go of the player, right now, without running the exit animation. Called from the
   * player:died / player:respawn listeners — we LISTEN to those, we never emit them.
   */
  _forceRelease() {
    const wasIn = !!(this.ctx.shared && this.ctx.shared.inCar);
    this._setCarried(false);
    this._carrySeated = false;
    this._fovLast = NaN;
    this.holdT = 0;
    this.hornT = 0;
    this.refuseLatch = false;
    // BLOCKER 1, and this one is unconditional: it runs even when the player was not in
    // the car, because death and respawn are exactly the moments a car left lit somewhere
    // out on the loop would go on pinning ctx.shared.lit with nobody near it. No cool-down
    // beat here — a death is not a beat this file gets to add to.
    this._setHeadlights(false);
    if (!wasIn) return;
    if (this.ctx.shared) this.ctx.shared.inCar = false;
    this.engineOn = false;
    this.speed = 0; this.steer = 0;
    this.mode = this.exists ? 'idle' : 'none';
    this.spawnCooldown = SPAWN_COOLDOWN;
    if (this.exists) this._placeRoof();
    this._emit('car:exited', null);
  }

  /* ------------------------------------------------------------- present -- */

  /**
   * FIX 2. Everything visible is composed from the interpolated pose. Removing this
   * method leaves the simulation identical and the car a 60 Hz staircase.
   */
  present(alpha) {
    if (!this.body || !this.exists) return;
    const a = alpha === undefined ? 1 : alpha;

    const x = lerp(this.prevX, this.x, a);
    const y = lerp(this.prevY, this.y, a);
    const z = lerp(this.prevZ, this.z, a);
    const h = this.prevHeading + angleDelta(this.prevHeading, this.heading) * a;
    const pitch = lerp(this.prevPitch, this.pitch, a);
    const roll = lerp(this.prevRoll, this.roll, a);
    const bob = lerp(this.prevBob, this.bob, a);
    const steer = lerp(this.prevSteer, this.steer, a);
    const wheelRot = lerp(this.prevWheelRot, this.wheelRot, a);

    const root = this.body.root;
    root.position.set(x, y + bob, z);
    root.rotation.order = 'YXZ';             // fix 1
    root.rotation.set(pitch, h, roll);
    // No updateMatrixWorld here: the renderer walks the scene once per frame and nothing
    // in this file reads the car's world matrix. Forcing the subtree would be nine
    // redundant compositions every frame for a prop that is one object.

    /* ---- wheels: they steer and they spin ---- */
    const wheels = this.body.wheels;
    for (let i = 0; i < WHEEL_OFFSETS.length; i++) {
      const w = WHEEL_OFFSETS[i];
      _e.set(wheelRot, w.front ? steer * 0.92 : 0, 0, 'YXZ');
      _q.setFromEuler(_e);
      _pos.set(w.x, w.y, w.z);
      _m.compose(_pos, _q, _s);
      this.body.wheels.setMatrixAt(i, _m);
    }
    wheels.instanceMatrix.needsUpdate = true;
    // The rim group is tilted back on its column, so its local +Z points up-and-back —
    // at the driver. A positive rotation about it reads counter-clockwise from the seat,
    // which is what a left turn looks like from behind a steering wheel.
    this.body.steer.rotation.z = steer * 5.6;

    /* ---- the working headlamp ---- */
    if (this.headlightsOn) {
      const L = this._lights;
      // Self-heal: borrow() returns null when all 32 logical slots are taken, and the
      // switch that asked for it has already latched on. Without this retry a headlamp
      // that lost the draw once stays half-dark for the life of the page — the silent
      // half-failure this project keeps finding.
      if (!this.headHandle && L && L.borrow) {
        this.headHandle = L.borrow('headlamp', x, y + 1.0, z, 0xffdca6, HEAD_POOL, 0);
      }
      const fx = -Math.sin(h), fz = -Math.cos(h);
      const rx = Math.cos(h), rz = -Math.sin(h);
      const lx = x + rx * -0.66 + fx * 2.16;
      const ly = y + bob + 1.02;
      const lz = z + rz * -0.66 + fz * 2.16;
      // ART.md 7.3 — THE COOL-DOWN HAS TO BE A DIM, AND MEASURED IT WAS NOT. The park
      // cool-down faded the lens emissive and the beat looked right on the car, but
      // ctx.shared.lit sat flat at 0.567 through lampFade 0.844 -> 0.226 and then fell off a
      // cliff to 0.069 when the SpotLight was finally switched off. The lamp dimmed; the
      // light in the world did not. That is the working-but-illegible failure again, on the
      // one signal this game trades in — "seeing is how you are seen".
      //
      // Two of the three lamps that make up that beat are ours and are dimmed here:
      //   the lens emissive (body.setLamp, driven by _filament()), and
      //   the borrowed rover that pools warm light on the nose (setIntensity below).
      // The third is the census SpotLight, and gfx/lights.js:555 has no level argument:
      // setHeadlights(on, ...) writes CFG.lights.headlight.intensity or zero and nothing
      // between. The request for a level parameter is in docs/HANDOFF.md; the filament is
      // passed as the eighth argument NOW, which today's signature simply ignores, so the
      // beat completes itself the day that lands with no further edit here.
      const fil = this._filament();
      // aimed forward and 3 degrees down, so 60 m of road is lit and the canopy is not
      if (L && L.setHeadlights) L.setHeadlights(true, lx, ly, lz, fx, -0.055, fz, fil);
      if (this.headHandle && this.headHandle.setPosition) {
        this.headHandle.setPosition(lx + fx * 0.9, ly + 0.05, lz + fz * 0.9);
        // The rover IS ours (lights.js:344 borrow / :161 setIntensity), so this half of the
        // dim works today. HEAD_POOL is the value the borrow asked for; scaling it is the
        // whole of the change.
        if (this.headHandle.setIntensity) this.headHandle.setIntensity(HEAD_POOL * fil);
      }
    }

    /* ---- the seat camera ---- */
    // MOSSWAY game.js:2212-2236 (updateCamera): offset (-0.31, 1.66, -0.50), the look
    // added to the heading, the car's own pitch bled in at 0.12, FOV rising with speed.
    // Composed here, AFTER player/camera.js has written its own pose (manifest 12 vs our
    // 19), so we never fight it and never replace ctx.camera — we mutate it.
    const inCar = this.mode === 'driving' || this.mode === 'entering' || this.mode === 'exiting';
    if (!inCar) return;
    const cam = this.ctx.camera;
    if (!cam) return;

    const fx2 = -Math.sin(h), fz2 = -Math.cos(h);
    const rx2 = Math.cos(h), rz2 = -Math.sin(h);
    const sx = x + rx2 * SEAT.x + fx2 * SEAT.z;
    const sy = y + bob * 0.46 + SEAT.y;
    const sz = z + rz2 * SEAT.x + fz2 * SEAT.z;

    // the reparent: 0.35 s of ease, never a cut, and the player keeps the mouse the
    // whole way. Alex's law: never take the camera away at the scary moment.
    let t = 1;
    if (this.mode === 'entering') t = ease.outCubic(clamp01(this.enterT / REPARENT));
    else if (this.mode === 'exiting') t = 1 - ease.outCubic(clamp01(this.enterT / REPARENT));
    if (t < 1) {
      cam.position.set(
        lerp(this.fromX, sx, t),
        lerp(this.fromY, sy, t),
        lerp(this.fromZ, sz, t),
      );
    } else {
      cam.position.set(sx, sy, sz);
    }

    // the car's own pitch bleeds into the view at 0.12 and the roll at 0.5 — enough to
    // feel the camber, not enough to make the horizon a see-saw.
    cam.rotation.order = 'YXZ';              // fix 1: with XYZ, look up + look sideways tilts
    cam.rotation.x += pitch * 0.12 * t;
    cam.rotation.z += roll * 0.50 * t;

    // FOV 68 -> 74.5 with speed [CFG.car.seat.fov / .fovFast]
    //
    // AUDIT FIX. This used to compute `lerp(cam.fov, this.fovNow, t)` and write whenever
    // the result differed from cam.fov. player/camera.js writes cam.fov too, so each
    // lane read the other's value as a change of its own and both called
    // updateProjectionMatrix() every frame of every drive. Now: blend from the fov we
    // took the seat with, compare against OUR OWN last write, and write only when our
    // target really moved. `_fovLast` is NaN whenever we do not own the fov, and NaN
    // fails the epsilon test, so the first frame of an entry always writes.
    const want = lerp(SEAT.fov, SEAT.fovFast, clamp01(Math.abs(this.speed) / K.onRoad));
    const dt = (this.ctx.time && this.ctx.time.dt) || CFG.loop.FIXED;
    this.fovNow = damp(this.fovNow, want, 3.0, dt);
    const target = t >= 1 ? this.fovNow : lerp(this.baseFov, this.fovNow, t);
    if (!(Math.abs(target - this._fovLast) <= FOV_EPS)) {
      this._fovLast = target;
      cam.fov = target;
      cam.updateProjectionMatrix();
    }
  }

  /**
   * The seat yaw clamp, +-1.48 rad [CFG.car.seat.yawClamp]. Written in step (not
   * present) because it moves AIM, and aim is truth. It widens to a full circle during
   * the 0.35 s reparent so that entering never yanks the view — the clamp arrives with
   * you rather than snapping you into the seat.
   */
  _clampSeatLook() {
    const cam = this._camera;
    if (!cam) return;
    const inSeat = this.mode === 'driving' || this.mode === 'entering';
    if (!inSeat) return;
    const t = this.mode === 'driving' ? 1 : clamp01(this.enterT / REPARENT);
    const width = lerp(Math.PI, SEAT.yawClamp, t);
    const d = angleDelta(this.heading, cam.yaw);
    if (d > width) cam.yaw = wrapAngle(this.heading + width);
    else if (d < -width) cam.yaw = wrapAngle(this.heading - width);
  }

  /* ---------------------------------------------------------------- debug -- */

  /** For window.__CURFEW.state(). Allocates; never called in the loop. */
  state() {
    const D = this._dbg;
    return {
      exists: this.exists,
      mode: this.mode,
      x: this.x, y: this.y, z: this.z,
      heading: this.heading,
      speed: this.speed,
      inCar: !!(this.ctx.shared && this.ctx.shared.inCar),
      hotwired: this.hotwired,
      engineOn: this.engineOn,
      headlights: this.headlightsOn,
      lampFade: this.lampFade,
      wear: this.wear,
      hotwireTotal: this.hotwireTotal,
      tris: this.body ? this.body.tris : 0,
      holdT: this.holdT,
      // WHY THE CAR DID NOT COME. A rule that silently declines is indistinguishable from
      // a rule that never runs, and for three rounds this one was the former while being
      // reported as the latter. `why` is the last check's verdict, the counters are the
      // lifetime totals, and the three measurements underneath are what it decided on.
      // Copied out, not handed out: `_dbg` is written in place on the fixed step.
      spawn: {
        checks: D.checks, spawns: D.spawns, why: D.why,
        owed: this.owed, owedT: this.owedT,
        checkIn: this.spawnCheckT, cooldown: this.spawnCooldown,
        playerRoad: D.playerRoad, nearestMajor: D.nearestMajor, carDist: D.carDist,
        refused: {
          inCar: D.inCar, noSystems: D.noSystems, atMajor: D.atMajor, noRoad: D.noRoad,
          carIsHere: D.carIsHere, playerDead: D.playerDead, noCandidate: D.noCandidate,
        },
        sweep: {
          bearings: D.bearings, coneRejects: D.coneRejects, roadMisses: D.roadMisses,
          bandRejects: D.bandRejects, yardRejects: D.yardRejects,
          relaxed: D.relaxed, bestScore: D.bestScore,
        },
      },
    };
  }

  /** Test/debug door: put the car here, cold and parked, with no spawn rule. */
  placeAt(x, z, heading) {
    const terr = this._terrain;
    this.x = x; this.z = z;
    this.y = terr ? terr.heightAt(x, z) : 0;
    this.heading = heading === undefined ? this.heading : heading;
    this.speed = 0; this.steer = 0;
    this.exists = true;
    this.mode = 'idle';
    this.hotwired = false;
    this.engineOn = false;
    this._sync();
    this.body.root.visible = true;
    // Lit, then parked — which means the park cool-down in _stepIdle will dim it out over
    // PARK_DARK_S like any other parked car. A screenshot rig that wants the lamp lit
    // should take its frame inside that window or re-call placeAt; a rig that wants the
    // dark car simply steps past it. There is no third state where a car sits lit forever.
    this._setHeadlights(true);
    this._removeRoof();
    this._placeRoof();
    this._emit('car:spawned', { x, z });
  }

  dispose() {
    this._setCarried(false);      // never leave the player frozen in a car that is gone
    this._carrySeated = false;
    this._fovLast = NaN;
    this._removeRoof();
    // Same blocker, last door. This used to release the borrowed rover and leave the
    // census SpotLight burning at a car that no longer exists — a disposed system that
    // goes on lighting the player is the purest form of working-but-wrong. It runs before
    // body.dispose() below, because _setHeadlights writes body.setLamp.
    this._setHeadlights(false);
    if (this.headHandle) {
      const L = this._lights;
      if (L) L.release(this.headHandle);
      this.headHandle = null;
    }
    if (this._ownsUseKey && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
      this._ownsUseKey = false;
    }
    if (this.body) { this.body.dispose(); this.body = null; }
    if (this.ctx.shared) this.ctx.shared.inCar = false;
  }
}

export default Car;
