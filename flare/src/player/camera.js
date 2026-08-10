// THE CAMERA RIG — the bob, the footstep clock, the FOV ladder, the landing dip,
// the view kick and the trauma shake. W5-PLAYER.
//
// THE ONE THING THIS FILE EXISTS TO GUARANTEE: there is exactly ONE phase clock.
// `rig.phase` (t_c) drives the camera bob, the weapon bob AND the footstep events.
// Two timers reads as "floaty" and nobody can name why, because each one is
// individually correct — it is only their drift against each other that is wrong,
// and drift has no single frame you can screenshot. So the clock is a single
// number, it is advanced in exactly one place (`stepPhase`, once per fixed
// substep), and everything else in the game READS it.
//
// docs/FEEL.md §1.4, the most important paragraph in the camera chapter:
//
//   bobY  = -A_y * cos(2 * t_c)      vertical, TWICE the lateral frequency
//   bobX  =  A_x * sin(t_c)          lateral, one cycle per two steps
//   roll  =  A_r * sin(t_c + 0.35)   0.35 rad phase LEAD
//   footfalls at t_c crossing 0 and PI
//
// The 2:1 vertical:lateral ratio IS the figure-eight. cos(2*t_c) puts the camera
// lowest exactly on each footfall (weight acceptance) and highest at mid-stride,
// which is why the footstep test in tests/player.mjs can assert that every
// footstep lands on a local minimum of bobY: if a second timer ever appears, the
// two drift apart and that assertion is the thing that goes red.
//
// The 0.35 rad roll LEAD is what makes it read as a body rather than a dolly —
// the shoulders commit to the step before the weight lands on it.
//
// Amplitude scales with (v/v_ref)^0.85. SUB-LINEAR, never linear: linear makes a
// slow creep look like a static camera sliding, which docs/FEEL.md calls "the
// number-one giveaway of a hobby FPS".
//
// NO THREE.JS IMPORT. `applyTo(camera)` duck-types on .position/.rotation/.fov so
// the whole rig runs headless in tests/player.mjs with no GPU and no DOM.

import { FEEL } from '../feel.js';
import { TAU, DEG, clamp, clamp01, lerp, damp } from '../core/math.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. Everything already in FEEL.camera,
// FEEL.move, FEEL.recoil and FEEL.time is READ from there and never restated
// here — CONTRACT §5. What lives below is only what the merged bible specifies
// for the camera and the tuning block does not yet carry.
// ---------------------------------------------------------------------------
export const CAM = Object.freeze({
  // Landing dip spring, docs/FEEL.md §1.5 "Spring(freq 7.5, damping 0.62)".
  // Angular frequency in rad/s and a damping ratio, integrated semi-implicitly:
  // stable from 30 Hz to 240 Hz, and it never overshoots into a second bounce.
  dipFreq: 7.5,
  dipDamp: 0.62,
  // The pitch half of the landing impulse. Degrees per m/s of impact speed,
  // capped, on the SAME spring as the positional dip so the two cannot separate.
  dipPitchPerVy: 0.9,
  dipPitchMaxDeg: 11,
  hardLandVy: 12,            // above this the landing is a "hard" one (event flag)

  // The FOV ladder. FLARE has ONE ground speed (FEEL.move.run), so there is no
  // separate sprint verb to key a sprint FOV off; the lens widens continuously as
  // the body approaches top speed instead. That is one fewer state, one fewer
  // clock, and it cannot desync from the movement it is describing.
  sprintFovFrom: 0.72,       // fraction of RUN where the widening starts
  fovPunchLambda: 9,         // DESIGN's "bend rate 9 normal"
  fovPunchExecute: 11,       // the launch reads as acceleration, not teleportation
  fovPunchBodyCheck: -6,     // NEGATIVE, to contrast the launch punch
  fovEpsilon: 0.001,         // don't rebuild the projection matrix for nothing

  // Below this ground speed the body is not walking, so the phase clock HOLDS.
  // It is not reset — resetting it would make every stop-and-start restart the
  // stride on the same foot, which reads as a limp.
  phaseMinSpeed: 0.35,

  // Trauma shake is sampled from a fixed sum of sines on the presentation clock
  // rather than from ctx.rng. Two reasons: the picture is then identical at 60
  // and 144 Hz (an rng-driven shake consumes a different number of draws per
  // second at each refresh), and the shake costs the deterministic streams
  // nothing, so adding it can never move the recoil pattern. CONTRACT §3.
  shakeHzYaw: 31.7,
  shakeHzYaw2: 12.9,
  shakeHzPitch: 27.3,
  shakeHzPitch2: 8.1,
  shakeRollScale: 0.4,

  msToS: 0.001,
});

const C = FEEL.camera;
const B = FEEL.camera.bob;
const M = FEEL.move;
const R = FEEL.recoil;

// ---------------------------------------------------------------------------
// THE AIM BASIS. Euler YXZ, built from THIS frame's yaw and pitch — never read
// back off the camera's matrix, which is one frame stale AND carries view kick,
// bob roll and shake, none of which may move a bullet (docs/FEEL.md §1.3: three
// separate recoil channels, and only the aim kick changes where shots go).
//
// THREE's camera looks down -Z, rotation order YXZ, so R = Ry(yaw) * Rx(pitch):
//   forward = (-sin y * cos p,  sin p, -cos y * cos p)
//   right   = ( cos y,          0,     -sin y)
//   up      = ( sin y * sin p,  cos p,  cos y * sin p)
// ---------------------------------------------------------------------------
export function basisFromYawPitch(yaw, pitch, out) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  out.yaw = yaw; out.pitch = pitch;
  out.fx = -sy * cp; out.fy = sp; out.fz = -cy * cp;
  out.rx = cy; out.ry = 0; out.rz = -sy;
  out.ux = sy * sp; out.uy = cp; out.uz = cy * sp;
  return out;
}

/** The reused, sealed aim record. Never reallocated; never grown a field. */
export function newAimBasis() {
  return Object.seal({
    ox: 0, oy: 0, oz: 0,
    fx: 0, fy: 0, fz: -1,
    rx: 1, ry: 0, rz: 0,
    ux: 0, uy: 1, uz: 0,
    yaw: 0, pitch: 0,
  });
}

// ---------------------------------------------------------------------------
// THE RIG
// ---------------------------------------------------------------------------
export function createCameraRig() {
  const rig = {
    // ---- THE ONE CLOCK ----------------------------------------------------
    phase: 0,             // t_c in [0, TAU)
    phaseTotal: 0,        // the same clock, unwrapped, so PI crossings are exact
    phaseSeconds: 0,      // sim seconds the stride clock has actually advanced
    cycleHz: B.hzBase,
    footsteps: 0,
    footSide: 0,          // 0 left (t_c crossing 0), 1 right (crossing PI)
    lastFootPhase: 0,
    lastFootSeconds: 0,

    // ---- bob (read by the viewmodel: weapon* are the 0.55x lagged copies) ---
    bobX: 0, bobY: 0, bobRoll: 0,
    weaponBobX: 0, weaponBobY: 0, weaponRoll: 0,
    amp: 0,

    // ---- landing ----------------------------------------------------------
    dip: 0, dipVel: 0,
    dipPitch: 0, dipPitchVel: 0,

    // ---- lens -------------------------------------------------------------
    fov: C.fovWorld,
    fovPunch: 0,
    adsT: 0,

    // ---- view kick (channel 2 of 3: camera-only, never moves a bullet) -----
    kickPitch: 0, kickYaw: 0,

    // ---- shake (trauma^2, ROTATIONAL only) --------------------------------
    shakePitch: 0, shakeYaw: 0, shakeRoll: 0,
    trauma: 0,

    elapsed: 0,
    eye: M.eye,
  };

  // -------------------------------------------------------------------------
  // THE PHASE CLOCK. Called once per FIXED_DT substep by the controller, and
  // nowhere else. Returns the number of footfalls that happened in this substep
  // (0 or 1 in every real case; the loop is written for >1 anyway so a frame
  // spike can never swallow a step event).
  // -------------------------------------------------------------------------
  function stepPhase(dt, speedH, grounded) {
    // cycleHz is held (not zeroed) when stopped, so the NEXT step resumes the
    // stride at the cadence the body was last walking at.
    if (speedH > CAM.phaseMinSpeed) {
      rig.cycleHz = clamp(B.hzBase + B.hzPerSpeed * speedH, B.hzBase, B.hzMax);
    }
    if (!grounded || speedH <= CAM.phaseMinSpeed) return 0;

    const w = TAU * rig.cycleHz;
    const before = Math.floor(rig.phaseTotal / Math.PI);
    rig.phaseTotal += w * dt;
    rig.phaseSeconds += dt;
    const after = Math.floor(rig.phaseTotal / Math.PI);
    const falls = after - before;

    // Wrap by a whole TAU, which is an EVEN number of PI, so the left/right
    // parity of footSide survives the wrap.
    while (rig.phaseTotal >= TAU) rig.phaseTotal -= TAU;
    rig.phase = rig.phaseTotal;

    if (falls > 0) {
      rig.footsteps += falls;
      rig.footSide = (rig.footSide + falls) & 1;
      rig.lastFootPhase = rig.phase;
      rig.lastFootSeconds = rig.phaseSeconds;
    }
    return falls;
  }

  // -------------------------------------------------------------------------
  // PRESENTATION. rdt is the render clock — it keeps integrating during hitstop
  // at FEEL.time.freezeScale so a hit punches instead of stalling. The phase
  // clock deliberately does NOT advance here: it is gameplay (footsteps raise a
  // disturbance, D4) and it belongs to the fixed step.
  // -------------------------------------------------------------------------
  function update(rdt, st) {
    rig.elapsed += rdt;
    rig.adsT = clamp01(st.adsT || 0);
    rig.trauma = clamp01(st.trauma || 0);

    // ---- bob ---------------------------------------------------------------
    // (v / v_ref)^0.85 — sub-linear. A slow creep still visibly moves.
    rig.amp = Math.pow(clamp01(st.speedH / B.speedRef), B.speedPow);
    const adsK = lerp(1, B.adsScale, rig.adsT);
    const ay = B.ay * rig.amp * adsK;
    const ax = B.ax * rig.amp * adsK;
    // ADS zeroes roll ENTIRELY. Roll during ADS destroys the sight picture and
    // no reading of it feels good, so it is not scaled — it is removed.
    const ar = B.roll * rig.amp * adsK * (1 - rig.adsT);

    const p = rig.phase;
    rig.bobY = -ay * Math.cos(2 * p);
    rig.bobX = ax * Math.sin(p);
    rig.bobRoll = ar * Math.sin(p + B.rollLead);

    // The weapon reads THE SAME CLOCK, at 0.55x positional amplitude, lagged by
    // ~42 ms. The lag is applied as a phase offset rather than as a second
    // spring, which is what keeps "one clock" literally true: the gun trails the
    // body by a fixed slice of the stride at every speed, and it can never lead.
    const lag = TAU * rig.cycleHz * (B.weaponLagMs * CAM.msToS);
    const pw = p - lag;
    rig.weaponBobY = -ay * B.weaponScale * Math.cos(2 * pw);
    rig.weaponBobX = ax * B.weaponScale * Math.sin(pw);
    rig.weaponRoll = ar * B.weaponScale * Math.sin(pw + B.rollLead);

    // ---- landing dip -------------------------------------------------------
    const k = CAM.dipFreq * CAM.dipFreq;
    const c = 2 * CAM.dipDamp * CAM.dipFreq;
    rig.dipVel += (-k * rig.dip - c * rig.dipVel) * rdt;
    rig.dip += rig.dipVel * rdt;
    rig.dipPitchVel += (-k * rig.dipPitch - c * rig.dipPitchVel) * rdt;
    rig.dipPitch += rig.dipPitchVel * rdt;

    // ---- lens --------------------------------------------------------------
    const sprintT = clamp01((st.speedH / M.run - CAM.sprintFovFrom) / (1 - CAM.sprintFovFrom));
    const base = lerp(C.fovWorld, C.fovSprint, sprintT);
    const target = lerp(base, C.fovAds, rig.adsT);
    rig.fov = damp(rig.fov, target, C.fovLambda, rdt);
    rig.fovPunch = damp(rig.fovPunch, 0, CAM.fovPunchLambda, rdt);

    // ---- view kick — 100% recovered, ~180 ms at lambda 13 ------------------
    rig.kickPitch = damp(rig.kickPitch, 0, R.lambdaCamera, rdt);
    rig.kickYaw = damp(rig.kickYaw, 0, R.lambdaYaw, rdt);

    // ---- shake — amplitude is trauma SQUARED, so small trauma is genuinely
    // small, and it is rotational only. A translational shake in a first-person
    // game reads as the world moving, not as the head being hit.
    const a = rig.trauma * rig.trauma;
    const t = rig.elapsed;
    rig.shakeYaw = FEEL.time.shakeYaw * a * Math.sin(t * CAM.shakeHzYaw) * Math.cos(t * CAM.shakeHzYaw2);
    rig.shakePitch = FEEL.time.shakePitch * a * Math.sin(t * CAM.shakeHzPitch) * Math.cos(t * CAM.shakeHzPitch2);
    rig.shakeRoll = FEEL.time.shakeYaw * a * CAM.shakeRollScale * Math.sin(t * CAM.shakeHzPitch2);
  }

  /**
   * Landing impulse. MAX, never assignment — a hard landing during the recovery
   * of a softer one must not shorten the dip it is landing into.
   */
  function land(vy) {
    const v = Math.abs(vy);
    rig.dip = Math.max(rig.dip, clamp(v * C.landingDipPerVy, 0, C.landingDipMax));
    rig.dipPitch = Math.max(rig.dipPitch, clamp(v * CAM.dipPitchPerVy, 0, CAM.dipPitchMaxDeg) * DEG);
    return v >= CAM.hardLandVy;
  }

  /** Channel 2 of 3. Cosmetic; it never touches yaw/pitch and never moves a shot. */
  function addViewKick(pitch, yaw) {
    rig.kickPitch += pitch;
    rig.kickYaw += yaw;
  }

  function addFovPunch(deg) { rig.fovPunch += deg; }

  /**
   * Write the rig onto a camera. Duck-typed: .position.set, .rotation.set, .fov,
   * .updateProjectionMatrix. The camera's rotation order MUST be YXZ.
   */
  function applyTo(camera, x, feetY, z, yaw, pitch) {
    if (!camera) return;
    // bobX is LATERAL — along the camera's own right vector, not along world X.
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    camera.position.set(
      x + rx * rig.bobX,
      feetY + rig.eye + rig.bobY - rig.dip,
      z + rz * rig.bobX,
    );
    camera.rotation.set(
      pitch + rig.kickPitch + rig.shakePitch - rig.dipPitch,
      yaw + rig.kickYaw + rig.shakeYaw,
      rig.bobRoll + rig.shakeRoll,
    );
    const want = rig.fov + rig.fovPunch;
    if (Math.abs(camera.fov - want) > CAM.fovEpsilon) {
      camera.fov = want;
      if (typeof camera.updateProjectionMatrix === 'function') camera.updateProjectionMatrix();
    }
  }

  function reset() {
    rig.phase = 0; rig.phaseTotal = 0; rig.phaseSeconds = 0; rig.cycleHz = B.hzBase;
    rig.footsteps = 0; rig.footSide = 0; rig.lastFootPhase = 0; rig.lastFootSeconds = 0;
    rig.bobX = 0; rig.bobY = 0; rig.bobRoll = 0;
    rig.weaponBobX = 0; rig.weaponBobY = 0; rig.weaponRoll = 0;
    rig.dip = 0; rig.dipVel = 0; rig.dipPitch = 0; rig.dipPitchVel = 0;
    rig.fov = C.fovWorld; rig.fovPunch = 0; rig.adsT = 0;
    rig.kickPitch = 0; rig.kickYaw = 0;
    rig.shakePitch = 0; rig.shakeYaw = 0; rig.shakeRoll = 0;
    rig.trauma = 0; rig.elapsed = 0; rig.amp = 0;
  }

  rig.stepPhase = stepPhase;
  rig.update = update;
  rig.land = land;
  rig.addViewKick = addViewKick;
  rig.addFovPunch = addFovPunch;
  rig.applyTo = applyTo;
  rig.reset = reset;
  return rig;
}

export default createCameraRig;
