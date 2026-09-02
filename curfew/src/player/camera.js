// CURFEW — first-person camera.
//
// LIFTED from Projects/vigil/src/player/camera.js (Duskfall discipline before that).
//
// THE LAW OF THIS FILE, and it is not negotiable:
//   yaw and pitch are the ONLY truth. Bob, punch, shake, lean, landing dip and FOV are
//   ADDED at render time, in present(), and are never written back into yaw/pitch. That is
//   why juice can never corrupt aim, why a mantle keeps the shot you were lining up, and
//   why the weapon can read lookDelta and give the player's counter-input first claim on
//   the recoil accumulator.
//
// Two structural things beyond VIGIL:
//   1. prev/curr for yaw and pitch, lerped by present(alpha). VIGIL composed the camera
//      inside the sim step; CURFEW's loop is fixed-step with interpolated rendering, so
//      look must be interpolated with everything else or the whole point is lost.
//   2. stepLook() is split out of step(). The player sits BEFORE the camera in the manifest
//      but has to move along THIS step's aim, so the controller pulls stepLook() forward.
//      It is idempotent inside a step: whichever of the two calls it first wins, and step()
//      skips it if it already ran.
//
// Every feel number is CFG.camera / CFG.player.springs / CFG.render.fov. Locals below are
// the handful VIGIL had that config does not carry yet; each is cited and each is a request
// in docs/HANDOFF.md.

import { TAU, DEG, clamp, clamp01, lerp, damp, ease, Spring, Spring3 } from '../engine/math.js';
import { CFG } from '../config.js';

const C = CFG.camera;
const P = CFG.player;

// ---- numbers VIGIL had that CFG.camera does not carry yet ------------------
const PUNCH_IMPULSE = 22;      // deg -> spring impulse scale [vigil camera.js addPunch]
const TRAUMA_DECAY = 1.6;      // per second [vigil]
const SHAKE_HZ = 28;           // shake clock rate [vigil]
const SHAKE_P = 0.09, SHAKE_Y = 0.09, SHAKE_R = 0.10;   // rotational shake amplitudes [vigil]
const SHAKE_ADS_CUT = 0.6;     // ADS eats most of the pitch shake so you can still aim [vigil]
const LEAN_RAD = 0.032;        // strafe cant, ~1.83 deg [vigil camera.js lean]
const SLIDE_LEAN_DEG = 4.5;    // slide cant [vigil]
const SLIDE_LEAN_IN = 0.16;    // s to reach it [vigil]
const LAND_PITCH = -0.35;      // landing dip also pitches the view down [vigil]
const BOB_ROLL_DEG = 0.42;     // roll at walk pace; ^2.6 with amp reaches VIGIL's 1.15 deg at sprint
const BOB_ROLL_CURVE = 2.6;
const SPRINT_BOB_PITCH = -0.55;// deg, sprint-only head nod [vigil]
const AMP_MAX = 1.6, AMP_CURVE = 0.85;  // bob amplitude vs speed [vigil]
const ADS_BOB_CUT = 0.25;      // bob is quartered at full ADS [vigil]
const SPRINT_T_IN = 9, SPRINT_T_OUT = 13;  // sprint blend rates [vigil]
const TAC_FOV_EXTRA = 3.0;     // tac-sprint has to LOOK faster than sprint or the verb is invisible
const YAW_LEAN_GAIN = 0.010;   // s of lean per rad/s of turn
const YAW_LEAN_MAX = 0.035;    // rad
const YAW_RATE_DAMP = 8;

// Module scratch. The hot path allocates nothing, getters included. See lookDelta below.
const _lookDelta = { pitch: 0, yaw: 0 };

/**
 * See the long note in controller.js: engine/math.js's Spring.update() sizes its substep
 * from the stiffness term only (ceil(dt*w/1.2)) and ignores damping, so a high-damping
 * spring at 60 Hz gets one substep and diverges. CFG.player.springs.eye [9, 1.0] provably
 * explodes. Both of my springs here are currently inside the stable region, but they are
 * config-driven and a retune of springs.punch or springs.lean would silently blow the
 * camera up. Substep to h*w*(1 + 2z) < 1.2 and it cannot. Fix requested in docs/HANDOFF.md.
 */
function stepSpring(s, dt) {
  const n = Math.max(1, Math.ceil(dt * s.w * (1 + 2 * s.z) / 1.2));
  const h = dt / n;
  for (let i = 0; i < n; i++) s.update(h);
}

export class PlayerCamera {
  static id = 'camera';

  constructor(ctx) {
    this.ctx = ctx;

    // ---- THE ONLY TRUTH ------------------------------------------------------
    this.yaw = 0;
    this.pitch = 0;

    // ---- interpolation pair --------------------------------------------------
    this.prevYaw = 0; this.currYaw = 0;
    this.prevPitch = 0; this.currPitch = 0;

    // ---- look accumulation ---------------------------------------------------
    // Pointer-lock deltas and test-injected deltas land in the SAME accumulator and are
    // consumed once per fixed step, so a headless test drives look through the identical
    // path a mouse does. (Engine's input layer keeps VIGIL's noLock flag for the same
    // reason: with noLock set, mousemove is accepted without pointer lock.)
    this._injDx = 0; this._injDy = 0;
    this.lookDeltaYaw = 0;
    this.lookDeltaPitch = 0;
    this._yawRate = 0;

    // ---- additive juice, none of which touches yaw/pitch ---------------------
    this.punch = new Spring3(P.springs.punch[0], P.springs.punch[1]);
    this.leanSpring = new Spring(P.springs.lean[0], P.springs.lean[1]);
    this.trauma = 0;
    this.shakeT = 0;
    this.sprintT = 0;
    this.tacT = 0;
    this.fovNow = CFG.render.fov;      // ONE damped FOV clock: base / sprint / ADS all on it

    this._lookDone = false;
  }

  // Siblings are read lazily, at use. Never captured at construction.
  get _player() { return this.ctx.systems.get('player'); }
  get _weapons() { return this.ctx.systems.get('weapons'); }
  get _input() { return this.ctx.input || this.ctx.systems.get('input'); }

  init() {
    this.prevYaw = this.currYaw = this.yaw;
    this.prevPitch = this.currPitch = this.pitch;
    const cam = this.ctx.camera;
    if (cam) { cam.rotation.order = 'YXZ'; cam.fov = this.fovNow; cam.updateProjectionMatrix(); }
  }

  ready() {
    // The camera is meaningless without a three camera to drive and a body to sit on.
    return !!this.ctx.camera && !!this._player;
  }

  // ---------------------------------------------------------------- public API
  /**
   * The player's OWN look input applied this step (radians) — weapons read this to give
   * counter-input first claim on the recoil accumulator.
   *
   * Backed by module scratch, not a fresh literal. Nothing calls it today, but the moment
   * weapons does it becomes a per-step allocation in the hot path, which is exactly the
   * defect the audit found twice in the controller. Read it synchronously; never retain it.
   * The scalars lookDeltaYaw / lookDeltaPitch are the allocation-free path and are preferred.
   */
  get lookDelta() {
    _lookDelta.pitch = this.lookDeltaPitch;
    _lookDelta.yaw = this.lookDeltaYaw;
    return _lookDelta;
  }

  /** view kick: visual only, recovers to zero. Degrees. */
  addPunch(pitchDeg, yawDeg, rollDeg) {
    this.punch.x.nudge(pitchDeg * DEG * PUNCH_IMPULSE);
    this.punch.y.nudge(yawDeg * DEG * PUNCH_IMPULSE);
    this.punch.z.nudge(rollDeg * DEG * PUNCH_IMPULSE);
  }

  addTrauma(v) { this.trauma = Math.min(1, this.trauma + v); }

  /** Aim kick: the ONE thing allowed to move truth, because it must move bullets too. */
  addAimKick(pitchRad, yawRad) {
    this.pitch = clamp(this.pitch + pitchRad, -C.pitchClamp, C.pitchClamp);
    this.yaw = (this.yaw + yawRad) % TAU;
  }

  /** Test/headless look injection. Same accumulator as the mouse, consumed the same step. */
  injectLook(dx, dy) { this._injDx += dx; this._injDy += dy; }

  setAim(yaw, pitch) {
    this.yaw = yaw % TAU;
    this.pitch = clamp(pitch, -C.pitchClamp, C.pitchClamp);
    this.prevYaw = this.currYaw = this.yaw;
    this.prevPitch = this.currPitch = this.pitch;
  }

  /** world-space aim direction, recoil included — shots track the kick. */
  aimDir(out) {
    out.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    return out;
  }

  // ---------------------------------------------------------------- look
  /**
   * Consume the accumulated look delta and integrate yaw/pitch. Called by the controller at
   * the top of ITS step (so the body moves along this step's aim) and by our own step() if
   * the controller did not get there first. Runs at most once per fixed step.
   */
  stepLook(dt) {
    if (this._lookDone) return;
    this._lookDone = true;

    this.prevYaw = this.currYaw;
    this.prevPitch = this.currPitch;

    const wep = this._weapons;
    const adsT = wep ? (wep.adsT || 0) : 0;
    // ADS sensitivity is a straight multiplier from config, not a zoom-relative derivation:
    // one number the player can be told, instead of a curve they have to feel out.
    const sens = C.sens * lerp(1, C.adsSensMul, adsT);

    let dx = this._injDx, dy = this._injDy;
    this._injDx = 0; this._injDy = 0;
    // Two input shapes are in play (see docs/HANDOFF.md): VIGIL's consumeLook(), and the
    // { lookX, lookY } struct setInput is specified to accept. Read whichever exists so the
    // synthetic path and the mouse path are literally the same line of integration below.
    const inp = this._input;
    if (inp) {
      if (inp.consumeLook) { const l = inp.consumeLook(); dx += l.dx; dy += l.dy; }
      else if (typeof inp.lookX === 'number' || typeof inp.lookY === 'number') {
        dx += inp.lookX || 0; dy += inp.lookY || 0;
      }
    }

    this.lookDeltaYaw = -dx * sens;
    this.lookDeltaPitch = -dy * sens;
    this.yaw = (this.yaw + this.lookDeltaYaw) % TAU;
    this.pitch = clamp(this.pitch + this.lookDeltaPitch, -C.pitchClamp, C.pitchClamp);

    this.currYaw = this.yaw;
    this.currPitch = this.pitch;

    // Turn rate, smoothed, feeds the yaw lean below.
    this._yawRate = damp(this._yawRate, dt > 0 ? this.lookDeltaYaw / dt : 0, YAW_RATE_DAMP, dt);
  }

  // ---------------------------------------------------------------- step
  step(dt) {
    this.stepLook(dt);      // no-op if the controller already pulled it forward

    const player = this._player;
    const wep = this._weapons;
    const adsT = wep ? (wep.adsT || 0) : 0;

    stepSpring(this.punch.x, dt); stepSpring(this.punch.y, dt); stepSpring(this.punch.z, dt);
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * dt);
    this.shakeT += dt * SHAKE_HZ;

    const sprinting = player ? (player.sprinting || player.tacSprinting) : false;
    const tac = player ? !!player.tacSprinting : false;
    this.sprintT = damp(this.sprintT, sprinting ? 1 : 0, sprinting ? SPRINT_T_IN : SPRINT_T_OUT, dt);
    this.tacT = damp(this.tacT, tac ? 1 : 0, tac ? SPRINT_T_IN : SPRINT_T_OUT, dt);

    // ---- FOV pipeline: base -> sprint -> ADS, ONE damped clock -----------------
    // Separate clocks per source is how a camera ends up fighting itself; CFG.camera.fovDamp
    // is the single rate. ADS wins outright because it is an aiming state, not a flourish.
    const adsEase = ease.inOutQuad(adsT);
    let target = lerp(CFG.render.fov, C.fovSprint + TAC_FOV_EXTRA * this.tacT, ease.outCubic(this.sprintT));
    target = lerp(target, C.fovAds, adsEase);
    if (wep && wep.fovPunch) target += wep.fovPunch;
    this.fovNow = damp(this.fovNow, target, C.fovDamp, dt);

    // ---- lean: strafe cant + a lead into the turn ------------------------------
    // Lean reads the same strafe axis the body does, from either input shape.
    const strafe = player ? player.strafeAxis : 0;
    const slideLean = player && player.sliding
      ? SLIDE_LEAN_DEG * DEG * clamp01(player.slideT / SLIDE_LEAN_IN)
      : 0;
    const yawLean = clamp(this._yawRate * YAW_LEAN_GAIN, -YAW_LEAN_MAX, YAW_LEAN_MAX);
    this.leanSpring.target = (-strafe * LEAN_RAD * (1 - adsT)) + yawLean - slideLean;
    stepSpring(this.leanSpring, dt);

    this._lookDone = false;   // re-arm for the next fixed step
  }

  // ---------------------------------------------------------------- presentation
  /**
   * Compose the final camera transform. EVERYTHING added here is cosmetic: remove this whole
   * method and the game still aims identically. alpha interpolates the fixed-step pose, which
   * is the difference between a smooth 144 Hz pan and a 60-step staircase.
   */
  present(alpha) {
    const cam = this.ctx.camera;
    const player = this._player;
    if (!cam || !player) return;
    const a = alpha === undefined ? 1 : alpha;

    // Weapons is manifest 11 and writes yaw/pitch (the aim-kick channel) AFTER our step has
    // already latched currYaw. Re-latch here, at the end of all simulation, so the kick is
    // interpolated in across this frame instead of arriving one frame late. Anything that
    // legitimately moves aim after us is picked up the same way.
    this.currYaw = this.yaw;
    this.currPitch = this.pitch;

    // interpolated truth (short-way yaw so the wrap does not spin the world)
    let d = (this.currYaw - this.prevYaw) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    const yaw = this.prevYaw + d * a;
    const pitch = lerp(this.prevPitch, this.currPitch, a);

    const wep = this._weapons;
    const adsT = wep ? (wep.adsT || 0) : 0;

    // ---- bob, from the ONE stride clock the controller owns -------------------
    // phase is stored at half rate there, so a full stride is one sin() cycle here.
    const t = player.bobPhase * 2;
    const amp = Math.pow(clamp(player.speed / P.WALK, 0, AMP_MAX), AMP_CURVE)
      * (player.grounded && !player.sliding ? 1 : 0)
      * lerp(1, ADS_BOB_CUT, adsT);
    // CFG.camera.bob.walk is the vertical amplitude and .sprint the lateral one, both at the
    // walk reference; the sprint/crouch tiering falls out of speed/WALK above rather than
    // from a second table. (0.021 / 0.030 = 0.70 matches VIGIL's lateral:vertical ratio.)
    const bobY = -C.bob.walk * Math.cos(2 * t) * amp;
    const bobX = C.bob.sprint * Math.sin(t) * amp;
    const bobRoll = BOB_ROLL_DEG * DEG * Math.pow(amp, BOB_ROLL_CURVE)
      * Math.sin(t + C.bob.rollLead) * (1 - adsT);
    const bobPitch = player.sprinting || player.tacSprinting
      ? SPRINT_BOB_PITCH * DEG * Math.cos(2 * t) * amp : 0;

    // ---- shake: rotational only. Never translate a first-person camera for shake. ----
    const sAmp = this.trauma * (0.4 + 0.6 * this.trauma);
    const shP = Math.sin(this.shakeT * 1.13) * SHAKE_P * sAmp * (1 - adsT * SHAKE_ADS_CUT);
    const shY = Math.sin(this.shakeT * 0.97 + 4.2) * SHAKE_Y * sAmp;
    const shR = Math.sin(this.shakeT * 1.31 + 1.7) * SHAKE_R * sAmp;

    // ---- position: the interpolated body, plus lateral bob in view space ------
    const px = player.renderPos ? player.renderPos.x : player.pos.x;
    const pz = player.renderPos ? player.renderPos.z : player.pos.z;
    const eye = player.renderEyeY !== undefined ? player.renderEyeY : player.eyeY;
    cam.position.set(px + bobX * Math.cos(yaw), eye + bobY, pz - bobX * Math.sin(yaw));

    cam.rotation.order = 'YXZ';
    cam.rotation.set(
      pitch + this.punch.x.value + shP + bobPitch + player.landDip * LAND_PITCH,
      yaw + this.punch.y.value + shY,
      this.punch.z.value + shR + bobRoll + this.leanSpring.value,
    );

    if (cam.fov !== this.fovNow) { cam.fov = this.fovNow; cam.updateProjectionMatrix(); }
  }

  /** For window.__CURFEW.state(). */
  state() {
    return { yaw: this.yaw, pitch: this.pitch, fov: this.fovNow, trauma: this.trauma };
  }

  dispose() {}
}

export default PlayerCamera;
