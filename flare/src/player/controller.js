// THE PLAYER — controller, dash, execute, recoil channels, input latching.
// W5-PLAYER. Owns: src/player/controller.js, src/player/camera.js, tests/player.mjs.
//
// Four rules run through every line of this file, and each of them is a bug that
// has already shipped somewhere in this portfolio:
//
// 1. THE MONOTONIC CLOCK LAW (docs/DESIGN.md, CONTRACT §5). Every duration clock
//    ACCRUES. A player action may SCALE accrual (the dash charge regenerates at
//    1.35x while grounded) but may never decrement or reset one, and every clock
//    carries a separate UNSCALED wall-clock ceiling that no input can extend.
//    KICK BALL 3.4 shipped a secondary action that rewound the flight clock and
//    reset it every loop; the human verdict was "i actually liked the last
//    version more when it was faster". `class Clock` below makes the law
//    structural: `start()` REFUSES to touch a running clock, `accrue()` only ever
//    adds, and both the scaled and the unscaled totals are published so
//    tests/player.mjs can prove it from outside rather than take my word for it.
//
// 2. EDGE INPUTS LATCH ABOVE THE FREEZE. fire / jump / dash / reload presses are
//    latched on the rAF frame, in `input.press()`, which is called from a DOM
//    handler and is never behind a hitstop early-return. They DRAIN on the next
//    substep that executes. A frame with zero substeps therefore buffers rather
//    than drops (C2-F14). Taps eaten by impact frames only happen while things
//    are dying — i.e. exactly when the player is pressing buttons — and present
//    as "the game dropped my input" with no reproducible case.
//
// 3. THREE SEPARATE RECOIL CHANNELS (docs/FEEL.md §1.3). AIM kick moves yaw/pitch
//    and changes where bullets go; VIEW kick is camera-only; WEAPON kick is
//    viewmodel-only and is ~70% of what the player perceives. The aim channel
//    carries an ACCUMULATOR that the player's own correction eats FIRST, or the
//    auto-recentre fights the player and drags their view to the floor during any
//    corrected burst. I own the channel; W6-WEAPONS owns the pattern.
//
// 4. EVERY VERTICAL VERB USES max(vel.y, X), NEVER ASSIGNMENT. Jump, dash hop,
//    dash lift, mantle pop and the execute launch all raise the ceiling; none of
//    them may ever ROB an already-faster ascent. And `endDash()` zeroing the
//    timer is the ONLY way a dash stops, because the dash branch OVERWRITES
//    vel.x/vel.z every substep and a stopping impulse into those does nothing.
//
// The player integrates ONCE PER FIXED_DT SUBSTEP (GROUPED G10): at the air-dash
// speed of 28 m/s that is 0.233 m per step against 1.0 m colliders, behind a
// conservative-advancement swept slide. Tunnelling is structurally unreachable
// rather than avoided by tuning.
//
// NO THREE.JS IMPORT and NO DOM AT MODULE SCOPE, so tests/player.mjs drives the
// real shipping controller headlessly against the real world resolver.

import { FEEL } from '../feel.js';
import { FIXED_DT } from '../core/time.js';
import { clamp, clamp01, DEG } from '../core/math.js';
import { GROUND, hasSurface } from '../world/ground.js';
import { makeCapsule, moveCapsule, highestSupport, isFree } from '../world/collide.js';
import { createCameraRig, basisFromYawPitch, newAimBasis, CAM } from './camera.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. Everything already in FEEL.move,
// FEEL.dash, FEEL.camera, FEEL.recoil, FEEL.ads, FEEL.fire, FEEL.economy and
// FEEL.field is READ from there and never restated. CONTRACT §5.
// ---------------------------------------------------------------------------
export const PLAYER = Object.freeze({
  // --- D4, the awareness model's player half -------------------------------
  // The dash-execute raises NO disturbance. It is the game's only silent kill,
  // and that is the entire reason D1's defanged 24-damage dash still has a job:
  // closing is dangerous, and the reward for closing is that nothing hears it.
  disturbanceDashExecute: 0,

  // --- body-check rebound (DESIGN's table; not a FEEL constant) ------------
  heavyRadius: 0.7,
  reboundHeavyGround: 6.5, reboundHeavyAir: 5,
  reboundLightGround: 4, reboundLightAir: 3,
  reboundPopGround: 3, reboundPopAir: 2,

  // --- i-frames -------------------------------------------------------------
  contactIframe: 0.2,        // DESIGN's CONTACT_IFRAME, raised on a body-check

  // --- dash charge regen ----------------------------------------------------
  // The ONE place a player action is allowed to SCALE a clock's accrual. Being
  // grounded runs the regen 1.35x faster; the unscaled wall-clock ceiling stays
  // FEEL.dash.regen and no input can extend it. (DESIGN: "accrues dt*1.35
  // grounded, dt*1.0 airborne".)
  regenGroundedScale: 1.35,

  // --- state thresholds -----------------------------------------------------
  movingRecoilSpeed: 3,      // docs/FEEL.md §3.4's "moving > 3 m/s" recoil state
  landRumbleVy: 4,           // below this a landing is a step, not an event

  // --- mantle ---------------------------------------------------------------
  // Deliberately a POP, not a locked path animation. docs/FEEL.md §2.5: "keeping
  // aim live through a vault is the difference between a traversal system and an
  // interruption". A pop keeps aim, keeps the dash, keeps the gun, and costs one
  // clock instead of a state machine.
  mantleProbe: 0.55,         // metres forward of the capsule surface
  mantleClearance: 0.12,     // the pop must clear the lip by this much
  mantleMinRise: 0.05,       // below this the step-up branch in collide.js has it

  // --- spawn ----------------------------------------------------------------
  spawnLift: 0.02,

  // --- fixed-capacity working sets (CONTRACT §4: the hot path allocates nothing)
  maxEnemiesPerPass: 32,
  eventCapacity: 64,

  // --- input ---------------------------------------------------------------
  lookClampPerFrame: 0.6,    // radians; a pointer-lock spike is a teleport, not aim

  // Edge-latched actions, as a bitmask so latching is one OR and costs nothing.
  // They live in the table rather than as a second frozen export because C2-F7's
  // lint is "one frozen table per module" and one is one.
  edge: Object.freeze({ fire: 1, jump: 2, dash: 4, reload: 8 }),
});

const M = FEEL.move;
const D = FEEL.dash;
const C = FEEL.camera;
const R = FEEL.recoil;
const MS = CAM.msToS;

export const EDGE = PLAYER.edge;

// ---------------------------------------------------------------------------
// THE MONOTONIC CLOCK. Two totals, both strictly non-decreasing while running:
//   t     — SCALED accrual. A player action may make this run faster.
//   wall  — UNSCALED accrual. Nothing may make this run slower, and `ceiling` is
//           the hard stop no input can extend.
// The clock finishes on whichever total arrives first. `start()` refuses a
// running clock outright, so "resetting a cooldown by pressing the button again"
// is not a bug that can be introduced here — it is a call that returns false.
// ---------------------------------------------------------------------------
export class Clock {
  constructor(name, restartable = false) {
    this.name = name;
    this.restartable = restartable;
    this.t = 0; this.wall = 0;
    this.duration = 0; this.ceiling = 0;
    this.running = false;
    this.starts = 0; this.restarts = 0; this.refusals = 0;
  }

  /** Begin a fresh run. REFUSES while running unless this clock is a buffer. */
  start(duration, ceiling) {
    if (this.running) {
      if (!this.restartable) { this.refusals++; return false; }
      this.restarts++;
    } else {
      this.starts++;
    }
    this.t = 0; this.wall = 0;
    this.duration = duration;
    this.ceiling = ceiling === undefined ? duration : ceiling;
    this.running = true;
    return true;
  }

  /** Accrue one substep. `scale` may be > 1; the wall clock never is. */
  accrue(dt, scale) {
    if (!this.running) return false;
    this.t += dt * (scale === undefined ? 1 : scale);
    this.wall += dt;
    if (this.t >= this.duration || this.wall >= this.ceiling) {
      this.t = Math.max(this.t, this.duration);
      this.running = false;
      return true;               // completed on THIS substep
    }
    return false;
  }

  /** Consumed early (a buffer that fired). Jumping a clock FORWARD is legal. */
  consume() {
    if (!this.running) return;
    this.t = Math.max(this.t, this.duration);
    this.wall = Math.max(this.wall, this.ceiling);
    this.running = false;
  }

  get remaining() { return this.running ? Math.max(0, this.duration - this.t) : 0; }
  get progress() { return this.duration > 0 ? clamp01(this.t / this.duration) : 1; }
}

// ---------------------------------------------------------------------------
// EVENTS — a fixed ring of reused records. W3-AUDIO wants footsteps and landings,
// W7-ENEMIES wants the disturbance radius, W6 wants the dash strikes. Nobody gets
// a callback per event, because a callback per event is an allocation per event.
// ---------------------------------------------------------------------------
function makeEvents(capacity) {
  const buf = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    buf[i] = { type: '', x: 0, y: 0, z: 0, a: 0, b: 0, id: -1, disturbance: 0, at: 0 };
  }
  let w = 0, r = 0, dropped = 0;
  return {
    capacity,
    emit(type, x, y, z, a, b, id, disturbance, at) {
      if ((w - r) >= capacity) { dropped++; r++; }
      const e = buf[w % capacity];
      e.type = type; e.x = x; e.y = y; e.z = z;
      e.a = a; e.b = b; e.id = id; e.disturbance = disturbance; e.at = at;
      w++;
      return e;
    },
    drain(fn) {
      let n = 0;
      while (r < w) { fn(buf[r % capacity]); r++; n++; }
      return n;
    },
    peekLast() { return w > r ? buf[(w - 1) % capacity] : null; },
    get pending() { return w - r; },
    get dropped() { return dropped; },
    clear() { r = w; },
  };
}

// ---------------------------------------------------------------------------
// THE CONTROLLER. `create(ctx)` wraps this with DOM input; the core takes no DOM
// at all so the gate can drive the shipping code with a scripted input stream.
// ---------------------------------------------------------------------------
export function createController(ctx, opts = {}) {
  const getWorld = opts.world
    ? (typeof opts.world === 'function' ? opts.world : () => opts.world)
    : () => ctx && ctx.world;

  const cam = createCameraRig();
  const body = makeCapsule(0, 0, 0);
  const aim = newAimBasis();
  const events = makeEvents(PLAYER.eventCapacity);

  // ---- clocks. Every one of them obeys the law above. ---------------------
  const clocks = {
    dashActive: new Clock('dashActive'),
    dashCooldown: new Clock('dashCooldown'),
    dashRegen: new Clock('dashRegen'),
    dashIframe: new Clock('dashIframe'),
    hurtIframe: new Clock('hurtIframe'),
    mantleCooldown: new Clock('mantleCooldown'),
    // Buffers and holds are RESTARTABLE: a fresh press is a fresh clock, not a
    // rewind of the old one. tests/player.mjs asserts they only ever restart on
    // the substep an edge was actually drained, which is the assertion that keeps
    // "restartable" from becoming "unbounded".
    jumpBuffer: new Clock('jumpBuffer', true),
    dashBuffer: new Clock('dashBuffer', true),
    fireBuffer: new Clock('fireBuffer', true),
    recoilHold: new Clock('recoilHold', true),
  };
  const clockList = Object.keys(clocks).map(k => clocks[k]);

  // ---- input. Written by DOM handlers / the gate; read by the substep. -----
  const input = {
    moveX: 0, moveZ: 0,          // -1..1, right and forward
    lookX: 0, lookY: 0,          // accumulated pointer deltas, drained per frame
    ads: false, jumpHeld: false, fireHeld: false,
    edges: 0,                    // LATCHED above any freeze
    edgesDrained: 0,             // what the last executed substep actually took
    press(action) { this.edges |= action; },
    look(dx, dy) { this.lookX += dx; this.lookY += dy; },
    move(x, z) { this.moveX = clamp(x, -1, 1); this.moveZ = clamp(z, -1, 1); },
    setAds(v) { this.ads = !!v; },
    setFireHeld(v) { this.fireHeld = !!v; },
    setJumpHeld(v) { this.jumpHeld = !!v; },
    clear() { this.moveX = 0; this.moveZ = 0; this.lookX = 0; this.lookY = 0; this.edges = 0; },
  };

  // ---- injected providers. NO SILENT DEFAULTS (C2-F8): each default sets a
  // flag, and assertWired() names every one still in place at chamber-ready.
  const EMPTY = Object.freeze([]);
  const defaulted = { enemies: true, impact: true, refillWeapon: true, disturb: true };
  const provide = {
    enemies: () => EMPTY,
    impact: () => {},
    refillWeapon: () => {},
    disturb: () => {},
  };

  const state = {
    yaw: 0, pitch: 0,
    adsT: 0,
    speedH: 0,
    grounded: false, airTime: 0, coyoteSpent: false, jumpCutArmed: false,
    dashCharges: D.charges, maxCharges: D.charges,
    dashDirX: 0, dashDirZ: 0, dashSpeed: 0, dashFromGround: false,
    health: FEEL.economy.maxHealth, maxHealth: FEEL.economy.maxHealth,
    alive: true, trauma: 0,
    simTime: 0, substeps: 0,
  };

  // ---- the AIM-KICK accumulator (channel 1 of 3) --------------------------
  const kick = { pitch: 0, yaw: 0, restPitch: 0, restYaw: 0, recovering: false };
  const recoilStats = { kickPitch: 0, kickYaw: 0, eatenPitch: 0, eatenYaw: 0, recentrePitch: 0, recentreYaw: 0, shots: 0 };

  const stats = {
    footsteps: 0, jumps: 0, dashes: 0, dashRefusals: 0, mantles: 0,
    strikes: 0, executes: 0, executeRefusals: 0, bodyChecks: 0, landings: 0, hardLandings: 0,
    // Two counters, and the gate reads BOTH: `frozenSubsteps` is the dash lunging
    // through a hitstop, `frozenFramesHeld` is every other frozen frame, where the
    // player's sim did not advance at all. A build that ran the player through the
    // freeze scores zero on the second one, which is the assertion.
    frozenSubsteps: 0, frozenFramesHeld: 0,
  };

  // ---- dash strike bookkeeping, preallocated ------------------------------
  const struck = new Int32Array(PLAYER.maxEnemiesPerPass);
  let struckN = 0;

  let stepsThisFrame = 0;
  let frozenAccum = 0;
  let newFrame = true;

  // =========================================================================
  // AIM — the only place yaw and pitch are written.
  // =========================================================================
  /**
   * Write pitch, honouring the clamp, and repay the accumulator whatever the
   * clamp threw away. Without this the recentre later removes kick that the aim
   * never actually received, and the view walks downward one burst at a time —
   * the exact failure the accumulator exists to prevent, arriving by a side door.
   */
  function applyPitch(d) {
    const want = state.pitch + d;
    const got = clamp(want, C.pitchMin, C.pitchMax);
    state.pitch = got;
    const clipped = want - got;
    if (clipped !== 0) kick.pitch -= clipped;
    return got - (want - d);
  }

  /** Only input OPPOSING the outstanding kick consumes the budget. */
  function eat(accum, d) {
    if (accum > 0) return clamp(d, -accum, 0);
    if (accum < 0) return clamp(d, 0, -accum);
    return 0;
  }

  function applyLook(dx, dy) {
    if (dx === 0 && dy === 0) return;
    const sens = state.adsT > 0 ? (C.sensHip + (C.sensAds - C.sensHip) * state.adsT) : C.sensHip;
    // THREE's rotation.y is LEFT-positive; docs/FEEL.md's "+yaw right" is the
    // player-facing sign. The conversion happens here, exactly once.
    let dYaw = -dx * sens;
    let dPitch = -dy * sens;
    dYaw = clamp(dYaw, -PLAYER.lookClampPerFrame, PLAYER.lookClampPerFrame);
    dPitch = clamp(dPitch, -PLAYER.lookClampPerFrame, PLAYER.lookClampPerFrame);

    const ep = eat(kick.pitch, dPitch);
    kick.pitch += ep; recoilStats.eatenPitch += ep;
    const ey = eat(kick.yaw, dYaw);
    kick.yaw += ey; recoilStats.eatenYaw += ey;

    applyPitch(dPitch);
    state.yaw += dYaw;
  }

  /**
   * Channel 1 of 3, driven by W6-WEAPONS. Degrees, player-facing signs:
   * +pitch is up, +yaw is right.
   */
  function addAimKick(pitchDeg, yawDeg) {
    const dp = (pitchDeg || 0) * DEG;
    const dy = -(yawDeg || 0) * DEG;
    kick.pitch += dp; kick.yaw += dy;
    recoilStats.kickPitch += dp; recoilStats.kickYaw += dy; recoilStats.shots++;
    applyPitch(dp);
    state.yaw += dy;
    // A fresh shot restarts the hold: nothing recentres during a burst, the
    // burst has to land. The hold is the one clock a player action may restart,
    // and only because a new shot IS a new clock.
    clocks.recoilHold.start(R.holdMs * MS);
    kick.recovering = false;
    return kick;
  }

  /**
   * The auto-recentre. Only 72% comes back; 28% is permanent, which is what
   * makes a 10-shot burst leave the player 1.00 degrees high and makes trigger
   * discipline worth something. The rest point is LATCHED when the hold expires,
   * so a moving target cannot turn "72% returns" into "100% returns".
   */
  function recentre(dt) {
    if (clocks.recoilHold.running) return;
    if (kick.pitch === 0 && kick.yaw === 0) { kick.recovering = false; return; }
    if (!kick.recovering) {
      kick.recovering = true;
      kick.restPitch = kick.pitch * (1 - R.recoverFraction);
      kick.restYaw = kick.yaw * (1 - R.recoverFraction);
    }
    const f = 1 - Math.pow(2, -dt / (R.halfLifeMs * MS));

    let ex = kick.pitch - kick.restPitch;
    // NEVER push aim in the direction that would re-open the kick. If the player
    // has already eaten past the rest point, the correct amount to recover is
    // zero — not "back up to where the gun wanted to be".
    if (kick.pitch > 0) ex = Math.max(0, ex); else if (kick.pitch < 0) ex = Math.min(0, ex); else ex = 0;
    if (ex !== 0) {
      const r = ex * f;
      kick.pitch -= r; recoilStats.recentrePitch += r;
      applyPitch(-r);
    }

    let ey = kick.yaw - kick.restYaw;
    if (kick.yaw > 0) ey = Math.max(0, ey); else if (kick.yaw < 0) ey = Math.min(0, ey); else ey = 0;
    if (ey !== 0) {
      const r = ey * f;
      kick.yaw -= r; recoilStats.recentreYaw += r;
      state.yaw -= r;
    }
  }

  /**
   * The aim basis, rebuilt from THIS substep's yaw and pitch. Never read off the
   * camera matrix: that is one frame stale AND carries view kick, bob roll and
   * trauma shake, none of which may move a bullet.
   */
  function aimBasis() {
    basisFromYawPitch(state.yaw, state.pitch, aim);
    aim.ox = body.x + Math.cos(state.yaw) * cam.bobX;
    aim.oy = body.y + M.eye + cam.bobY - cam.dip;
    aim.oz = body.z - Math.sin(state.yaw) * cam.bobX;
    return aim;
  }

  // =========================================================================
  // MOVEMENT
  // =========================================================================
  // NOT Math.hypot, here or in the two sites below. It allocates 64 B per call on
  // V8 and these three run on EVERY fixed substep — measured with the instrument
  // in tests/weapons.mjs §11b as 0 B/call for the sqrt form against 64 B/call for
  // hypot. hypot's guard against intermediate overflow buys nothing against a
  // 30 m/s velocity and a 120 m sightline. CONTRACT §4.
  function friction(dt) {
    const sp = Math.sqrt(body.vx * body.vx + body.vz * body.vz);
    if (sp < 1e-6) { body.vx = 0; body.vz = 0; return; }
    const control = sp < M.stopSpeed ? M.stopSpeed : sp;
    const drop = control * M.friction * dt;
    const k = Math.max(0, sp - drop) / sp;
    body.vx *= k; body.vz *= k;
  }

  function accelerate(wx, wz, wishSpeed, accel, dt) {
    const cur = body.vx * wx + body.vz * wz;
    const add = wishSpeed - cur;
    if (add <= 0) return;
    const a = Math.min(accel * dt, add);
    body.vx += wx * a; body.vz += wz * a;
  }

  function wishDir(out) {
    const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw);
    const rx = Math.cos(state.yaw), rz = -Math.sin(state.yaw);
    let x = rx * input.moveX + fx * input.moveZ;
    let z = rz * input.moveX + fz * input.moveZ;
    const len = Math.sqrt(x * x + z * z);
    if (len > 1e-6) { x /= len; z /= len; } else { x = 0; z = 0; }
    out[0] = x; out[1] = z; out[2] = len > 1e-6 ? 1 : 0;
    return out;
  }
  const _wish = new Float64Array(3);

  // =========================================================================
  // DASH
  // =========================================================================
  function startDash() {
    wishDir(_wish);
    let dx = _wish[0], dz = _wish[1];
    if (_wish[2] === 0) {
      // No move input: dash along aim, flattened. Never along the camera's
      // forward vector including pitch — a downward dash into the floor is a
      // stall, and an upward one is a jump the player did not ask for.
      dx = -Math.sin(state.yaw); dz = -Math.cos(state.yaw);
    }
    const fromGround = body.grounded;
    state.dashDirX = dx; state.dashDirZ = dz;
    state.dashFromGround = fromGround;
    state.dashSpeed = fromGround ? D.speed : D.airSpeed;

    const dur = fromGround ? D.time : D.airTime;
    clocks.dashActive.start(dur);
    clocks.dashIframe.start(dur + D.iframeExtra);
    state.dashCharges--;
    struckN = 0;

    // VERTICAL VERB: max, never assignment.
    body.vy = Math.max(body.vy, fromGround ? D.hopGround : D.liftAir);
    if (fromGround) body.grounded = false;

    clocks.dashBuffer.consume();
    stats.dashes++;
    events.emit('dash', body.x, body.y, body.z, dx, dz, -1, 0, state.simTime);
    return true;
  }

  /**
   * THE ONLY STOP. The dash branch overwrites vel.x/vel.z every substep, so an
   * opposing impulse is erased on the very next line — zeroing the timer here is
   * what actually ends it, and the rebound is applied AFTER that.
   */
  function endDash(rebound, popY) {
    if (!clocks.dashActive.running) return false;
    clocks.dashActive.consume();
    clocks.dashCooldown.start(D.cooldown);
    if (rebound) {
      body.vx = -state.dashDirX * rebound;
      body.vz = -state.dashDirZ * rebound;
    }
    if (popY) body.vy = Math.max(body.vy, popY);   // VERTICAL VERB: max
    return true;
  }

  function alreadyStruck(id) {
    for (let i = 0; i < struckN; i++) if (struck[i] === id) return true;
    return false;
  }

  /**
   * D1 — the execute gate. hp <= maxHp * 0.42. NO absolute floor, NO archetype
   * exceptions. The draft's `max(55, maxHp*0.42)` executed a full-health RUNNER
   * and a full-health LANTERN, which made the dash a better weapon than every
   * gun in a game where twenty of twenty-one systems are about shooting. With
   * this gate the panic move is SHOOT, THEN CHARGE — the loop under pressure
   * rather than a bypass of it.
   */
  function canExecute(e) {
    const maxHp = e.maxHp || e.maxHealth || 0;
    if (!(maxHp > 0)) return false;
    return e.hp <= maxHp * D.executeFraction;
  }

  function execute(e) {
    stats.executes++;
    e.hp = 0;
    if (e.dead !== undefined) e.dead = true;

    state.health = Math.min(state.maxHealth, state.health + D.executeHeal);
    provide.refillWeapon(e);

    // THE STOP RULE. The dash branch overwrites vel.x/vel.z every substep, so a
    // launch applied while the dash is still running is erased on the next line
    // of the next substep and the player goes nowhere. End the dash FIRST; the
    // timer is the only stop there is.
    endDash(0, 0);

    // The launch: KICK BALL's law. The beat the player already does two hundred
    // times a run is also how they cross the room.
    const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw);
    body.vx = fx * D.executeLaunch;
    body.vz = fz * D.executeLaunch;
    body.vy = Math.max(body.vy, D.executeLaunchY);       // VERTICAL VERB: max
    state.jumpCutArmed = false;                          // not our jump to cut
    cam.addFovPunch(CAM.fovPunchExecute);

    // D4: radius ZERO. The game's only silent kill. The disturbance call is made
    // anyway, with 0, so that a future consumer cannot mistake "no call" for
    // "not implemented" — the silence is asserted, not assumed.
    provide.disturb(body.x, body.y, body.z, PLAYER.disturbanceDashExecute, 'execute');
    provide.impact('execute', e.x, e.y, e.z, e.id);
    events.emit('execute', e.x, e.y, e.z, D.executeHeal, D.executeLaunch, e.id,
      PLAYER.disturbanceDashExecute, state.simTime);
    // NO dash-charge refund (D1). The execute refunds health, ammo and distance;
    // refunding the charge that paid for it made the whole verb free.
    return true;
  }

  const idOf = (e, i) => (typeof e.id === 'number' ? e.id : i);

  function dashPasses() {
    const list = provide.enemies();
    if (!list || list.length === 0) return;
    const px = body.x, pz = body.z;
    const dirX = state.dashDirX, dirZ = state.dashDirZ;
    const n = Math.min(list.length, PLAYER.maxEnemiesPerPass);

    // Pass 1 — STRIKE. A generous bubble that damages every enemy exactly once
    // per dash. `struck` is cleared at dash start, never per substep.
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (!e || e.dead || e.hp <= 0) continue;
      const id = idOf(e, i);
      if (alreadyStruck(id)) continue;
      const er = e.radius || 0;
      const dx = e.x - px, dz = e.z - pz;
      if (dx * dx + dz * dz > (D.strikeRadius + er) * (D.strikeRadius + er)) continue;
      if (struckN < PLAYER.maxEnemiesPerPass) struck[struckN++] = id;
      stats.strikes++;
      if (canExecute(e)) { execute(e); continue; }
      stats.executeRefusals++;
      e.hp -= D.damage;                                  // 24: a shove, not a weapon
      provide.impact(e.hp <= 0 ? 'break' : 'hurt', e.x, e.y, e.z, id);
      events.emit('dashStrike', e.x, e.y, e.z, D.damage, e.hp, id, 0, state.simTime);
    }

    // Pass 2 — STOP. Only after the committed-lunge grace, and only on a
    // survivor genuinely ahead. Never a phase-through. An execute in pass 1 has
    // already ended the dash, so there is nothing left to body-check with.
    if (!clocks.dashActive.running) return;
    if (clocks.dashActive.t < D.contactGrace) return;
    let best = -1, bestD2 = Infinity;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (!e || e.dead || e.hp <= 0) continue;
      const er = e.radius || 0;
      const dx = e.x - px, dz = e.z - pz;
      const d2 = dx * dx + dz * dz;
      const stopR = body.radius + er + D.stopPad;
      if (d2 > stopR * stopR) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-6) continue;
      if ((dx / d) * dirX + (dz / d) * dirZ < D.stopDot) continue;
      if (d2 < bestD2) { bestD2 = d2; best = i; }
    }
    if (best < 0) return;
    const e = list[best];
    const heavy = (e.radius || 0) >= PLAYER.heavyRadius;
    const grounded = body.grounded;
    const rebound = heavy
      ? (grounded ? PLAYER.reboundHeavyGround : PLAYER.reboundHeavyAir)
      : (grounded ? PLAYER.reboundLightGround : PLAYER.reboundLightAir);
    const pop = grounded ? PLAYER.reboundPopGround : PLAYER.reboundPopAir;
    endDash(rebound, pop);
    clocks.hurtIframe.start(PLAYER.contactIframe);
    cam.addFovPunch(CAM.fovPunchBodyCheck);
    stats.bodyChecks++;
    provide.impact(heavy ? 'bodyCheckHeavy' : 'bodyCheck', e.x, e.y, e.z, idOf(e, best));
    events.emit('bodyCheck', e.x, e.y, e.z, rebound, pop, idOf(e, best), 0, state.simTime);
  }

  // =========================================================================
  // MANTLE — a pop, not a cutscene. Aim stays live throughout.
  // =========================================================================
  function tryMantle(world) {
    if (clocks.mantleCooldown.running) return false;
    if (input.moveZ <= 0) return false;
    const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw);
    const reach = body.radius + PLAYER.mantleProbe;
    const px = body.x + fx * reach, pz = body.z + fz * reach;
    const lo = body.y + M.maxStep, hi = body.y + M.mantleReach;
    const top = highestSupport(world, px, pz, body.radius, lo, hi);
    if (!hasSurface(top)) return false;
    if (top - body.y < PLAYER.mantleMinRise) return false;
    if (!isFree(world, px, top, pz, body.radius, body.height)) return false;
    const rise = top - body.y + PLAYER.mantleClearance;
    // VERTICAL VERB: max. A mantle may never rob a faster ascent.
    body.vy = Math.max(body.vy, Math.sqrt(2 * M.gravity * rise));
    body.grounded = false;
    state.coyoteSpent = true;
    clocks.mantleCooldown.start(M.mantleCooldown);
    stats.mantles++;
    events.emit('mantle', px, top, pz, rise, 0, -1, 0, state.simTime);
    return true;
  }

  // =========================================================================
  // ONE SUBSTEP. The ONLY place the player integrates.
  // =========================================================================
  function substep(dt, frozen) {
    const world = getWorld();
    state.substeps++;
    state.simTime += dt;
    if (frozen) stats.frozenSubsteps++;

    // ---- 1. DRAIN THE LATCHED EDGES. They were latched on the rAF frame,
    // above any freeze; this is where they execute. A frame that ran zero
    // substeps left them latched, so nothing was dropped.
    let drained = 0;
    if (newFrame) {
      drained = input.edges;
      input.edges = 0;
      input.edgesDrained = drained;
      newFrame = false;
      if (drained & EDGE.jump) clocks.jumpBuffer.start(M.jumpBuffer);
      if (drained & EDGE.dash) clocks.dashBuffer.start(D.buffer);
      if (drained & EDGE.fire) clocks.fireBuffer.start(FEEL.fire.buffer);
      // reload is W6's; the latch above is what makes it survive a hitstop.
      applyLook(input.lookX, input.lookY);
      input.lookX = 0; input.lookY = 0;
    } else {
      input.edgesDrained = 0;
    }

    // ---- 2. ADS transition (FEEL.camera.adsMs), on the input channel.
    const adsStep = dt / (C.adsMs * MS);
    state.adsT = clamp01(state.adsT + (input.ads ? adsStep : -adsStep));

    // ---- 3. CLOCKS. Accrue first, so a clock that completes this substep is
    // already not running when the verbs below ask.
    clocks.dashActive.accrue(dt);
    clocks.dashCooldown.accrue(dt);
    clocks.dashIframe.accrue(dt);
    clocks.hurtIframe.accrue(dt);
    clocks.mantleCooldown.accrue(dt);
    clocks.jumpBuffer.accrue(dt);
    const dashBufferExpired = clocks.dashBuffer.accrue(dt);
    clocks.fireBuffer.accrue(dt);
    clocks.recoilHold.accrue(dt);

    // Dash charge regen. A player action SCALES accrual (1.35x grounded) — it
    // never resets it, and the unscaled ceiling is the wall clock no input can
    // extend. Spending a charge mid-regen does not restart the regen.
    if (state.dashCharges < state.maxCharges) {
      if (!clocks.dashRegen.running) clocks.dashRegen.start(D.regen, D.regen);
      if (clocks.dashRegen.accrue(dt, body.grounded ? PLAYER.regenGroundedScale : 1)) {
        state.dashCharges = Math.min(state.maxCharges, state.dashCharges + 1);
      }
    } else if (clocks.dashRegen.running) {
      clocks.dashRegen.consume();
    }

    recentre(dt);

    // ---- 4. DASH START / DASH BRANCH
    if (clocks.dashBuffer.running && !clocks.dashActive.running
      && !clocks.dashCooldown.running && state.dashCharges > 0) {
      startDash();
    }
    if (dashBufferExpired) stats.dashRefusals++;   // buffered and never spent

    const dashing = clocks.dashActive.running;
    if (dashing) {
      // OVERWRITES horizontal velocity. This is why endDash is the only stop.
      body.vx = state.dashDirX * state.dashSpeed;
      body.vz = state.dashDirZ * state.dashSpeed;
    } else {
      // ---- 5. GROUND / AIR MOVEMENT
      wishDir(_wish);
      const moveScale = 1 + (FEEL.ads.move - 1) * state.adsT;
      const wishSpeed = M.run * moveScale * (_wish[2] ? 1 : 0);
      if (body.grounded) {
        friction(dt);
        if (_wish[2]) accelerate(_wish[0], _wish[1], wishSpeed, M.groundAccel, dt);
      } else if (_wish[2]) {
        // Quake air control with a hard cap, so bunny-hopping cannot exist:
        // ~38 deg/s of redirection and exactly zero m/s of speed gain.
        accelerate(_wish[0], _wish[1], Math.min(wishSpeed, M.airCap), M.airAccel, dt);
      }
    }

    // ---- 6. GRAVITY, JUMP, JUMP-CUT
    body.vy -= M.gravity * dt;

    if (clocks.jumpBuffer.running) {
      const coyoteOk = !state.coyoteSpent && state.airTime <= M.coyote;
      if (body.grounded || coyoteOk) {
        body.vy = Math.max(body.vy, M.jump);            // VERTICAL VERB: max
        body.grounded = false;
        state.coyoteSpent = true;
        state.jumpCutArmed = true;
        clocks.jumpBuffer.consume();
        stats.jumps++;
        events.emit('jump', body.x, body.y, body.z, M.jump, 0, -1, 0, state.simTime);
      } else if (world && tryMantle(world)) {
        clocks.jumpBuffer.consume();
      }
    }
    // The jump cut is ARMED BY THE JUMP and by nothing else. Applying it to any
    // upward velocity would silently shorten the dash lift, the mantle pop and
    // the execute launch — three verbs the player never asked to cut.
    if (state.jumpCutArmed && !input.jumpHeld && body.vy > 0 && !dashing) {
      body.vy *= Math.pow(M.jumpCut, dt);
    }

    // ---- 7. INTEGRATE. Once. Here. Nowhere else.
    const wasGrounded = body.grounded;
    const vyBefore = body.vy;
    if (world) moveCapsule(world, body, dt);
    else { body.x += body.vx * dt; body.y += body.vy * dt; body.z += body.vz * dt; }

    // ---- 8. LANDING + THE ONE PHASE CLOCK
    if (body.grounded && !wasGrounded) {
      state.airTime = 0; state.coyoteSpent = false; state.jumpCutArmed = false;
      stats.landings++;
      const hard = cam.land(vyBefore);
      if (hard) stats.hardLandings++;
      // G8's allowlist: footfall/landing rumble routes through impact(), so the
      // vfx-entry-point lint needs no exception for this module at all.
      if (Math.abs(vyBefore) >= PLAYER.landRumbleVy) provide.impact('rumble', body.x, body.y, body.z, -1);
      events.emit('land', body.x, body.y, body.z, vyBefore, hard ? 1 : 0, -1, 0, state.simTime);
    } else if (body.grounded) {
      state.airTime = 0; state.coyoteSpent = false; state.jumpCutArmed = false;
    } else {
      state.airTime += dt;
    }

    state.speedH = Math.sqrt(body.vx * body.vx + body.vz * body.vz);
    state.grounded = body.grounded;

    const falls = cam.stepPhase(dt, state.speedH, body.grounded);
    if (falls > 0) {
      stats.footsteps += falls;
      // D4's quieter half: moving through LIT ground raises a 5 m disturbance.
      // Standing in what you made is what makes light a trade rather than a
      // reward, and this is the line that charges you for walking on it.
      const lit = ctx && ctx.light
        ? 1 - Math.exp(-ctx.light.illuminationAt(body.x, body.y, body.z) * FEEL.field.normK)
        : 0;
      const dist = lit > 0 ? FEEL.fire.footstepLoudnessLit * lit : 0;
      if (dist > 0) provide.disturb(body.x, body.y, body.z, dist, 'footstep');
      events.emit('footstep', body.x, body.y, body.z, cam.footSide, cam.phase, -1, dist, state.simTime);
    }

    // ---- 9. DASH CONTACT PASSES, after the move, against real positions.
    if (dashing) dashPasses();
  }

  // =========================================================================
  // THE SYSTEM SURFACE
  // =========================================================================
  function step(dt) {
    stepsThisFrame++;
    substep(dt, false);
  }

  function update(rdt, time) {
    // ---- THE FREEZE. -------------------------------------------------------
    // EDGE INPUTS ARE LATCHED ABOVE THIS, AND ABOVE EVERY EARLY RETURN BELOW IT:
    // `input.press()` runs in the DOM handler, and `input.edges` is cleared in
    // exactly one place — inside substep(). A frame that executes zero substeps
    // therefore BUFFERS the tap and the next substep that runs drains it. That is
    // rule 2 at the top of this file and it is what the freeze must not break.
    //
    // What the freeze DOES stop is the simulation. docs/DESIGN.md: "break and
    // hurt freeze the sim", and time is the load-bearing feedback channel — a
    // player who keeps walking, falling, jumping, mantling and raising footstep
    // disturbances through a kill's hitstop is not being given the hit, and the
    // enemies hear a footstep in a frame the world did not advance.
    //
    // FEEL.md gives freezeScale as five channels — camera .18, fx .18, input 1.0,
    // dash 1.0, weaponTiming 1.0. Exactly ONE of them is a movement verb, so
    // exactly one verb is allowed through here: an ALREADY-RUNNING dash, which
    // must lunge crisply THROUGH the freeze instead of stuttering in it
    // (docs/DESIGN.md §"the dual-dt rule is the prize"). A dash that has not
    // started yet does not start here — its press is latched, its buffer is
    // 0.16 s and the longest hitstop in FEEL is 0.085 s, so it survives the
    // freeze and spends on the far side of it.
    //
    // main.js grants ZERO substeps during hitstop, so `stepsThisFrame === 0` is
    // the guard that makes the two paths mutually exclusive by construction: a
    // future main.js that does grant substeps during a freeze silently disables
    // this branch rather than double-stepping the dash.
    const frozen = !!(time && time.frozen);
    if (frozen && stepsThisFrame === 0 && rdt > 0 && clocks.dashActive.running) {
      // Read the scale off the time system when it has one — core/time.js keeps
      // its own copy of 0.18 rather than reading FEEL, and backing out of the
      // wrong number would make the dash lunge at the wrong speed.
      const fs = (time.freezeScale > 0 ? time.freezeScale : FEEL.time.freezeScale) || 1;
      frozenAccum += rdt / fs;                 // back out to unscaled real time
      let guard = FEEL.time.maxSubsteps;
      // The dash clock is re-read every iteration: the substep that ends the dash
      // is the last one the freeze runs, so the frames after it are a real freeze
      // again rather than free movement bought by having dashed recently.
      while (frozenAccum >= FIXED_DT && guard-- > 0 && clocks.dashActive.running) {
        frozenAccum -= FIXED_DT;
        substep(FIXED_DT, true);
      }
      if (!clocks.dashActive.running) frozenAccum = 0;
    } else {
      if (frozen && stepsThisFrame === 0) stats.frozenFramesHeld++;
      frozenAccum = 0;
    }
    stepsThisFrame = 0;
    newFrame = true;

    // The shake reads the TIME system's trauma, which is the single accumulator
    // impact() writes and which decays on the render clock. Piping it through
    // `state` keeps the camera rig free of any dependency on ctx, so the rig can
    // be driven standalone by the gate.
    state.trauma = time && typeof time.trauma === 'number' ? time.trauma : 0;
    cam.update(rdt, state);
    if (ctx && ctx.camera) cam.applyTo(ctx.camera, body.x, body.y, body.z, state.yaw, state.pitch);
  }

  function spawn(x, y, z, yaw) {
    const world = getWorld();
    body.x = x; body.z = z;
    body.vx = 0; body.vy = 0; body.vz = 0;
    let g = y;
    if (world) {
      const sup = world.ground.groundAt(x, z, y === undefined ? GROUND.top : y + M.height);
      g = hasSurface(sup) ? sup + PLAYER.spawnLift : (y || 0);
    }
    body.y = g;
    body.grounded = false;
    state.yaw = yaw === undefined ? state.yaw : yaw;
    state.airTime = 0; state.coyoteSpent = false;
    return body;
  }

  function invulnerable() { return clocks.dashIframe.running || clocks.hurtIframe.running; }

  function hurt(amount) {
    if (invulnerable() || !state.alive) return 0;
    const taken = Math.max(1, amount);          // THE ONE LAW, from the far side
    state.health = Math.max(0, state.health - taken);
    clocks.hurtIframe.start(FEEL.economy.hitInvuln);
    if (state.health <= 0) state.alive = false;
    events.emit('hurt', body.x, body.y, body.z, taken, state.health, -1, 0, state.simTime);
    return taken;
  }

  function recoilState() {
    if (!body.grounded) return 'airborne';
    if (state.adsT > 0.5) return 'ads';
    if (state.speedH > PLAYER.movingRecoilSpeed) return 'moving';
    return 'hip';
  }

  const api = {
    id: 'player',
    PLAYER, EDGE,
    body, state, input, events, clocks, cam,
    stats, recoil: recoilStats, kick,

    step, update, spawn, hurt,
    // The trigger, read by the weapons system every frame. It is HELD state, not
    // the latched edge: the REPEATER is automatic, and an edge can only ever fire
    // one round per click. The edge still exists alongside it — it is what
    // survives a hitstop frame so a tap during an impact is not swallowed.
    get firing() { return input.fireHeld; },
    get adsHeld() { return input.ads; },
    aimBasis, addAimKick,
    addViewKick: (p, y) => cam.addViewKick(p, y),
    recoilState,
    invulnerable,
    get health() { return state.health; },
    get dashCharges() { return state.dashCharges; },
    get grounded() { return body.grounded; },
    get speed() { return state.speedH; },
    get yaw() { return state.yaw; },
    get pitch() { return state.pitch; },
    get adsT() { return state.adsT; },
    /** D4 — published so the silence is asserted, never assumed. */
    disturbanceOf(kind) {
      if (kind === 'execute') return PLAYER.disturbanceDashExecute;
      if (kind === 'footstep') return FEEL.fire.footstepLoudnessLit;
      return 0;
    },

    /** C2-F8: injected providers, and NO SILENT DEFAULTS at chamber-ready. */
    inject(p) {
      if (!p) return api;
      for (const k of Object.keys(defaulted)) {
        if (typeof p[k] === 'function') { provide[k] = p[k]; defaulted[k] = false; }
      }
      return api;
    },
    assertWired() {
      const missing = [];
      for (const k of Object.keys(defaulted)) if (defaulted[k]) missing.push(k);
      return missing;
    },

    /** The gate reads these. One record per clock, no allocation per call. */
    clockList,
    snapshot() {
      return {
        x: body.x, y: body.y, z: body.z,
        vx: body.vx, vy: body.vy, vz: body.vz,
        yaw: state.yaw, pitch: state.pitch, adsT: state.adsT,
        grounded: body.grounded, airTime: state.airTime,
        speed: state.speedH, health: state.health,
        dashCharges: state.dashCharges, dashing: clocks.dashActive.running,
        invulnerable: invulnerable(),
        phase: cam.phase, cycleHz: cam.cycleHz, footsteps: cam.footsteps,
        bobY: cam.bobY, bobX: cam.bobX, roll: cam.bobRoll, fov: cam.fov,
        kickPitch: kick.pitch, kickYaw: kick.yaw,
        substeps: state.substeps, simTime: state.simTime,
      };
    },
    reset() {
      cam.reset();
      state.yaw = 0; state.pitch = 0; state.adsT = 0; state.speedH = 0;
      state.airTime = 0; state.coyoteSpent = false; state.simTime = 0; state.substeps = 0;
      state.dashCharges = state.maxCharges; state.jumpCutArmed = false;
      state.health = state.maxHealth; state.alive = true;
      kick.pitch = 0; kick.yaw = 0; kick.restPitch = 0; kick.restYaw = 0; kick.recovering = false;
      for (const k of Object.keys(recoilStats)) recoilStats[k] = 0;
      for (const k of Object.keys(stats)) stats[k] = 0;
      for (const c of clockList) { c.running = false; c.t = 0; c.wall = 0; c.duration = 0; c.ceiling = 0; c.starts = 0; c.restarts = 0; c.refusals = 0; }
      input.clear(); events.clear();
      struckN = 0; stepsThisFrame = 0; frozenAccum = 0; newFrame = true;
      body.vx = 0; body.vy = 0; body.vz = 0;
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// THE SYSTEM. One manifest entry: { id: 'player', module: './player/controller.js',
// needs: ['ground'] }. camera.js exports no create() on purpose — it is the rig
// this system owns, not a system of its own, so tests/manifest.mjs must not
// expect it in SYSTEMS.
// ---------------------------------------------------------------------------
export function create(ctx) {
  const player = createController(ctx);
  ctx.player = player;

  // ---- DOM input. Guarded so the module imports cleanly in node. ----------
  const doc = typeof document !== 'undefined' ? document : null;
  const canvas = ctx && ctx.canvas;
  const held = { w: false, a: false, s: false, d: false };
  const listeners = [];

  function on(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    listeners.push([target, type, fn, opts]);
  }

  function syncMove() {
    player.input.move((held.d ? 1 : 0) - (held.a ? 1 : 0), (held.w ? 1 : 0) - (held.s ? 1 : 0));
  }

  /**
   * THE INPUT GATE. Every listener here is on `document`, because a canvas cannot
   * receive key events without focus and a focus-based gate is how an FPS ends up
   * silently ignoring WASD. The cost of listening at the document is that the
   * handlers are live from the moment this system is CONSTRUCTED — which is during
   * boot, behind the start screen, while the player is reading it and may be
   * typing anywhere on the page. Ungated, `KeyW` in the start screen walks the
   * player, `Space` latches a jump, and the first frame of play begins with a
   * pressed-and-buffered edge nobody issued.
   *
   * So the gate is the same one the mouse handlers below already use, stated once:
   * the game must be RUNNING and the pointer must be LOCKED TO OUR CANVAS. Keyboard
   * and mouse then share exactly one definition of "the player is at the controls",
   * which is what stops the two channels from disagreeing about whether input is
   * live. Losing lock does not forfeit or reset anything (docs/DESIGN.md: play
   * state is decoupled from pointer-lock state) — it only stops NEW input, and the
   * pointerlockchange handler releases whatever was held so nothing sticks down.
   */
  function accepting() {
    return !!(doc && ctx && ctx.running && doc.pointerLockElement === canvas);
  }

  if (doc) {
    on(doc, 'keydown', e => {
      if (e.repeat) return;
      if (!accepting()) return;
      switch (e.code) {
        case 'KeyW': held.w = true; syncMove(); break;
        case 'KeyA': held.a = true; syncMove(); break;
        case 'KeyS': held.s = true; syncMove(); break;
        case 'KeyD': held.d = true; syncMove(); break;
        // LATCHED HERE, above everything. Nothing between a press and this line
        // may return early, or taps issued during impact frames vanish.
        case 'Space': player.input.setJumpHeld(true); player.input.press(EDGE.jump); break;
        case 'ShiftLeft': case 'ShiftRight': player.input.press(EDGE.dash); break;
        case 'KeyR': player.input.press(EDGE.reload); break;
        default: return;
      }
      e.preventDefault();
    });
    // keyup is DELIBERATELY NOT GATED. Every branch in it only ever RELEASES
    // something, so running it with the gate shut can never drive the player — and
    // skipping it can: a key held at the instant lock is lost would stay down
    // forever, which is the classic "I alt-tabbed and now I strafe left".
    on(doc, 'keyup', e => {
      switch (e.code) {
        case 'KeyW': held.w = false; syncMove(); break;
        case 'KeyA': held.a = false; syncMove(); break;
        case 'KeyS': held.s = false; syncMove(); break;
        case 'KeyD': held.d = false; syncMove(); break;
        case 'Space': player.input.setJumpHeld(false); break;
        default: return;
      }
    });
    on(doc, 'mousemove', e => {
      if (!accepting()) return;
      player.input.look(e.movementX || 0, e.movementY || 0);
    });
    on(doc, 'mousedown', e => {
      if (!accepting()) return;
      if (e.button === 0) { player.input.press(EDGE.fire); player.input.setFireHeld(true); }
      if (e.button === 2) player.input.setAds(true);
    });
    on(doc, 'mouseup', e => {
      if (e.button === 0) player.input.setFireHeld(false);
      if (e.button === 2) player.input.setAds(false);
    });
    on(doc, 'contextmenu', e => { if (doc.pointerLockElement === canvas) e.preventDefault(); });
    on(doc, 'pointerlockchange', () => {
      if (doc.pointerLockElement !== canvas) {
        held.w = held.a = held.s = held.d = false;
        syncMove();
        player.input.setAds(false);
        player.input.setJumpHeld(false);
        player.input.setFireHeld(false);
      }
    });
  }

  // Stand where the chamber says the player enters — never at the world origin.
  // THE INTAKE's whole teaching design is measured from its authored start (nine
  // columns inside a 45-degree, 12 m cone, so the first shot reveals more of them
  // than you thought). Spawning at 0,0 puts the player 19.8 m away from that,
  // facing a wall, and every authored reveal in the game silently stops working.
  // The chamber's Y is used when it declares one. spawn(x, undefined, z) resolves
  // to the HIGHEST surface at (x,z), and THE HELIX's deck is an annulus at y 34
  // directly over its spawn mark — an undefined-Y spawn materialises the player
  // 34 m up, at the END of the chamber they were about to climb.
  const start = (ctx.chamber && ctx.chamber.playerStart) || { x: 0, z: 0, yaw: 0 };
  player.spawn(start.x, Number.isFinite(start.y) ? start.y : undefined, start.z, start.yaw || 0);

  const system = {
    id: 'player',
    player,
    step: dt => player.step(dt),
    update: (rdt, time) => player.update(rdt, time),
    dispose() {
      for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
      listeners.length = 0;
      if (ctx.player === player) ctx.player = null;
    },
    assertWired: () => player.assertWired(),
    snapshot: () => player.snapshot(),
    /** QA surface for the input gate above. The gate is asserted, never assumed. */
    acceptingInput: () => accepting(),
    /**
     * CONTRACT §2 — an observable change on the SHIPPING page, not on a scratch
     * harness. Walk forward for a second of substeps and prove the body actually
     * travelled, the stride clock actually ran, and the eye sits exactly one
     * EYE height plus this frame's bob above the feet.
     */
    verify() {
      const before = player.snapshot();
      player.input.move(0, 1);
      const n = Math.round(1 / FIXED_DT);
      for (let i = 0; i < n; i++) player.step(FIXED_DT);
      player.update(FIXED_DT, ctx.time);
      const after = player.snapshot();
      player.input.move(0, 0);
      const moved = Math.hypot(after.x - before.x, after.z - before.z);
      const eyeOk = !ctx.camera || Math.abs(
        ctx.camera.position.y - (player.body.y + FEEL.move.eye + player.cam.bobY - player.cam.dip),
      ) < 1e-6;
      const stepped = after.footsteps > before.footsteps;
      return {
        ok: moved > 5 && stepped && eyeOk && player.body.grounded,
        detail: `moved=${moved.toFixed(2)} m in 1 s, footsteps=${after.footsteps}, speed=${after.speed.toFixed(2)}, eyeOk=${eyeOk}`,
      };
    },
  };
  return system;
}

export { createCameraRig, CAM };
export default create;
