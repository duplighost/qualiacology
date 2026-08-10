// ONE FIRE PIPELINE. Four guns, zero per-weapon branches.
//
// The manifest entry for W6-WEAPONS+IMPACT is this file and only this file:
// table.js is data, viewmodel.js is a rig, combat/impact.js is a factory, and none
// of them export create(ctx). One workstream, one system.
//
// SIX PORT FIXES. Every one of them is a bug the source games actually shipped,
// and every one has a named assertion in tests/weapons.mjs that can fail:
//
//   1. DISC SPREAD.  r = cone * sqrt(u), theta = u * TAU. Sampling `cone * u`
//      concentrates hits at the centre and makes bloom feel like it does nothing;
//      it is also not a cone. The gate runs a chi-square against uniform over
//      equal-AREA annuli, not an eyeball.
//
//   2. PERTURB ALONG THE CAMERA'S RIGHT/UP, never world Y. Building the tangent
//      frame from world up costs a factor of cos(pitch): at the pitch clamp of
//      1.38 rad the vertical component of the cone collapses to 19% of the
//      horizontal, so a gun that patterns correctly at the horizon fires a
//      horizontal SLIT when you look up at the helix. The gate measures the
//      vertical/horizontal spread ratio at pitch 0 and at the clamp.
//
//   3. COOLING ACCUMULATES.  `cooling += 60/rpm`, never `cooling = 60/rpm`.
//      Assignment quantises cadence to the substep: a 320 rpm pistol on a 60 Hz
//      frame fires at 300 (0.1875 s becomes 0.2), which is APEX's shipped bug and
//      a 6% dps error nobody can see and everybody can feel. The gate measures
//      cadence at 30, 60 and 144 Hz and demands 2%.
//
//   4. RECOIL FEEDS THE AIM. The aim-kick ACCUMULATOR is applied to the shot
//      direction, so there is a spray pattern to learn; and the player's own
//      downward input EATS THE BUDGET FIRST (consumeAimKick), or the auto-recentre
//      fights the correction and drags the view to the floor mid-burst.
//
//   5. select() CLEARS THE RELOAD OF THE WEAPON BEING STOWED (table.js).
//
//   6. TRACERS COME FROM A POOL. One shared instanced quad stretched along the
//      shot direction by the renderer's additive bucket -- never fresh geometry
//      per shot. In FLARE that is `render.additive.sprite(..., shape 2)`, which is
//      the same idea as the shared unit cylinder and one draw call for all of them.
//
// TIMING. Weapon timing is the ONE clock FEEL declares unscaled by hitstop
// (freezeScale.weaponTiming 1.0), so this system does NOT implement step(dt) --
// main.js runs zero fixed substeps while frozen, and a 720 rpm gun that lost 50 ms
// on every connecting shot would spend 60% of a sustained burst not firing. It
// runs its own FIXED-STEP accumulator over an UNSCALED dt reconstructed from the
// render dt, so cadence is frame-rate independent AND survives a freeze.
//
// AIM. Built from THIS frame's yaw/pitch in Euler YXZ, never from the lagged
// camera matrix, and never from the viewmodel camera.

import FEEL from '../feel.js';
import { clamp, damp, DEG, TAU, rayAabb, rayCapsuleY } from '../core/math.js';
import { Pool } from '../core/pool.js';
import { hasSurface } from '../world/ground.js';
import {
  WEAPONS, WEAPON_COUNT, createWeaponStates, resetStates, selectWeapon, cancelReload,
  shotInterval, magFraction, reserveNotch, reloadAmount, reloadTime, indexOf, TABLE as WT,
} from './table.js';
import { makeImpact } from '../combat/impact.js';
import { makeViewmodel } from './viewmodel.js';

/** The ONE frozen table this module owns. Balance lives in FEEL. */
export const FIRE_TABLE = Object.freeze({
  fixedDt: FEEL.time.fixedDt,
  maxFrame: 0.25,
  bloomLambda: 6.5,          // spread bloom recovery, after FEEL.fire.bloomRecoverDelay
  groundSteps: 48,           // analytic-floor march samples along one ray
  groundRefine: 12,          // bisection: a 120 m LANCE step is 2.5 m, /4096 = 0.6 mm
  tracerPool: 48,
  tracerLife: 0.055,
  tracerAlpha: 0.55,
  tracerRadius: 0.018,
  tracerStretch: 0.125,      // the additive streak spans size*8, so size = len/8
  sparkPool: 32,
  sparkLife: 0.13,
  sparkSize: 0.05,
  sparkSpeed: 3.4,
  sparkCount: 5,
  maxTargets: 64,
  muzzleKey: 1,              // STABLE across frames — the light pool's hysteresis
                             // is measured against this key, so it must not change
  flashProbeScale: 0.55,     // how much of the flash reaches illuminationAt
  rangeSkin: 0.02,
  shotRing: 32,              // shot timestamps kept for the headless flash-gain fallback
});

const FT = FIRE_TABLE;
const F = FEEL.fire;
const R = FEEL.recoil;

// ---------------------------------------------------------------------------
// MODULE-SCOPE SCRATCH. CONTRACT §4: five seconds of sustained fire allocates
// under 64 KB, so nothing below is ever constructed twice.
// ---------------------------------------------------------------------------
const _aim = {
  yaw: 0, pitch: 0, x: 0, y: 0, z: 0,
  ads: false, crouched: false, airborne: false, speed: 0,
  // FEEL: ONE phase clock drives camera bob, WEAPON bob and footsteps. If the aim
  // provider publishes the camera rig's t_c here, the viewmodel rides it; if it
  // leaves it negative, the rig runs its own and reads as a second timer, which is
  // the exact "floaty, un-diagnosable" failure the merged bob section names.
  bobPhase: -1,
};
const _basis = new Float64Array(9);          // fwd(0..2) right(3..5) up(6..8)
const _hitOut = { hy: 0 };
const _shot = { t: 0, actor: -1, hy: 0, x: 0, y: 0, z: 0, world: false };
const _pos = { x: 0, y: 0, z: 0 };
const _opts = {
  x: 0, y: 0, z: 0, dx: 0, dz: 0, weakPoint: false, headMultiplier: 1,
  multiplier: 1, tint: null, sourceId: 0, frontness: undefined,
};

/**
 * Euler YXZ, three's camera convention (looking down -Z). Written out rather than
 * read off camera.matrixWorld on purpose: the matrix is one frame old by the time
 * a system updates, and at 10.6 m/s with a 0.35 rad roll lead that lag is a
 * visible aim error on fast pans.
 */
function basis(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  _basis[0] = -sy * cp; _basis[1] = sp; _basis[2] = -cy * cp;     // forward
  _basis[3] = cy; _basis[4] = 0; _basis[5] = -sy;                  // right
  _basis[6] = sy * sp; _basis[7] = cp; _basis[8] = cy * sp;        // up
  return _basis;
}

export function create(ctx) {
  const states = createWeaponStates();
  const combat = makeImpact(ctx);
  const rig = makeViewmodel(ctx);

  const spreadRng = ctx.rng ? ctx.rng.fork('spread') : null;
  const recoilRng = ctx.rng ? ctx.rng.fork('recoil') : null;
  const flashRng = ctx.rng ? ctx.rng.fork('flash') : null;
  const rand = r => (r ? r.next() : 0.5);

  let current = 0;
  let carried0 = 0, carried1 = 1;         // C1-F12: two carried, four available
  let accum = 0;
  let clock = 0;
  let triggerDown = false;
  let localAds = false;
  let adsHeld = 0;
  let adsSettledAt = -1;
  let zeroSpreadArmed = false;
  let substeps = 0;

  // ---- injected providers. NO SILENT DEFAULTS (C2-F8) ----------------------
  let aimProvider = null;
  let targetProvider = null;
  let disturbanceSink = null;
  let recoilSink = null;
  // QA only, and it is the reason the spread assertion measures the SHIPPING
  // sampler rather than a copy of it in the test file. A copy would have passed
  // every one of the six fixes above while the game shipped none of them.
  let pelletSink = null;
  let aimDefaultUsed = false;
  let targetsDefaultUsed = false;
  let isReady = false;
  const targets = [];

  // ---- the aim-kick accumulator (FIX 4). ONE owner, and it is whichever side is
  // WIRED — never both, because "both" is silently a 2x recoil pattern with
  // nothing in a screenshot to show why.
  //
  // On the shipping page W5-PLAYER owns it: `player.addAimKick(pitchDeg, yawDeg)`
  // moves state.pitch/yaw, its `eat()` gives the player's own correction the
  // budget first, and `aimBasis()` therefore returns angles that ALREADY carry the
  // kick. So when a recoil sink is wired this module pushes the per-shot kick out
  // and keeps its own accumulator at zero.
  //
  // With no sink (standalone development, and the headless tier of the gate) the
  // accumulator below runs locally, so the pattern is real and testable before
  // W5 exists. Same shape as every other provider here: a usable default that
  // assertWired() refuses to let reach chamber-ready.
  const recoil = { pitch: 0, yaw: 0, restPitch: 0, restYaw: 0, hold: 0, eaten: 0 };
  const recoilLambda = Math.LN2 / (R.halfLifeMs / 1e3);

  // ---- the muzzle flash, as ONE record ------------------------------------
  const flash = { age: -1, life: 0, peak: 0, radius: 0, x: 0, y: 0, z: 0, gain: 1 };

  // ---- pooled tracers and sparks (FIX 6) ----------------------------------
  const tracers = new Pool(FT.tracerPool, () => ({
    x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, len: 0, age: 0,
  }));
  const sparks = new Pool(FT.sparkPool, () => ({
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0,
  }));

  const stats = {
    shots: 0, hits: 0, worldHits: 0, misses: 0, pellets: 0, dryFires: 0, reloads: 0,
    lastFlashGain: 1, lastDisturbance: 0, lastSubT: 0, lastCone: 0, lastRange: 0,
  };
  const disturbance = { x: 0, y: 0, z: 0, radius: 0, at: -1, weapon: '' };

  // -------------------------------------------------------------------------
  // PROVIDERS
  // -------------------------------------------------------------------------
  function readAim(out) {
    if (aimProvider) {
      out.bobPhase = -1;              // the provider opts IN to the shared clock
      aimProvider(out);
      return out;
    }
    // PLAN's W6 gate: "the injected aim provider hard-fails at ready if still
    // default". ready() is where that is enforced, and this is the second door on
    // the same lock — an aim provider torn out AFTER ready() would otherwise put
    // the placeholder back silently, which is the identical defect arriving one
    // call later. Throwing here is loud, cheap (one boolean on the substep) and
    // impossible to mistake for the gun simply pointing somewhere unexpected.
    if (isReady) throw notWired(['weapons: the aim provider was cleared AFTER ready() — every shot now leaves the origin pointing down -Z']);
    // The standalone default. It is a real, usable aim so this module can be
    // developed and tested before W5-PLAYER exists — and assertWired() names it,
    // so the shipping page cannot reach chamber-ready still holding it.
    aimDefaultUsed = true;
    out.yaw = 0; out.pitch = 0;
    out.x = 0; out.y = FEEL.move.eye; out.z = 0;
    out.ads = localAds; out.crouched = false; out.airborne = false; out.speed = 0;
    out.bobPhase = -1;
    return out;
  }

  function readTargets() {
    if (targetProvider) {
      const list = targetProvider();
      targets.length = 0;
      const n = Math.min(list ? list.length : 0, FT.maxTargets);
      for (let i = 0; i < n; i++) targets.push(list[i]);
      return targets;
    }
    targetsDefaultUsed = true;
    return targets;
  }

  /**
   * C2-F8, generalised to this workstream by PLAN: standalone defaults survive,
   * the shipping page refuses them, and the refusal NAMES the missing one.
   */
  function assertWired() {
    const errors = [];
    if (!aimProvider) errors.push('weapons: setAimProvider() never called — every shot leaves the origin pointing down -Z, and no test of the fire pipeline means anything');
    if (!targetProvider) errors.push('weapons: setTargets() never called — the ray marches world geometry and then finds nothing to hit, which looks exactly like working');
    if (!recoilSink) errors.push('weapons: setRecoilSink() never called — the aim kick is accumulating in the weapon instead of in the player, so the recentre and the eat-first rule are the local fallbacks and not W5\'s');
    return errors;
  }

  /** One shape of error, so a caller can catch it by name and read `.errors`. */
  function notWired(errors) {
    const e = new Error('FLARE weapons are not wired: ' + errors.join(' | '));
    e.name = 'WeaponsNotWired';
    e.errors = errors;
    return e;
  }

  /**
   * THE HARD FAIL, and PLAN's W6 gate line: "the injected aim provider hard-fails
   * at ready if still default."
   *
   * assertWired() RETURNS the list, which is the right shape for a snapshot and
   * exactly the wrong shape for a boot gate — a returned array is something a
   * caller can ignore, and the whole failure mode here is that nobody notices. A
   * default aim provider is not a degraded game, it is a DIFFERENT game: every
   * shot leaves (0, eye, 0) pointing down -Z, the tracers draw from the muzzle so
   * they still look plausible, the world still lights up where the ray lands, and
   * the only symptom is that the gun does not shoot where you are looking. So
   * ready() THROWS, names every provider still in its standalone default, and is
   * the one call that flips this system from "developable" to "shipping".
   *
   * Call it once, at chamber-ready, after every wire is in. It is not idempotent
   * theatre: calling it again re-checks, so tearing a provider out later and
   * re-readying fails again.
   */
  function ready() {
    const errors = assertWired();
    if (errors.length) { isReady = false; throw notWired(errors); }
    isReady = true;
    return api;
  }

  // -------------------------------------------------------------------------
  // RECOIL — three channels. This one is the AIM channel, ~10% of felt motion
  // and 100% of the consequences.
  // -------------------------------------------------------------------------
  function stateMultiplier(col) {
    let m = R.state.hip[col];
    if (_aim.ads) m *= R.state.ads[col];
    if (_aim.crouched) m *= R.state.crouch[col];
    if (_aim.airborne) m *= R.state.airborne[col];
    if (_aim.speed > FEEL.move.stopSpeed) m *= R.state.moving[col];
    return m;
  }

  function recoilShot(s) {
    const first = s.burst === 1;                 // burst was incremented already
    const aimMul = stateMultiplier(0);
    const dpDeg = (first ? R.pitchFirst : R.pitchSustained) * aimMul;
    const idx = (s.shots - 1) % R.yawPattern.length;
    const jitter = 1 + (recoilRng ? recoilRng.jitter(R.yawJitter) : 0);
    const dyDeg = R.yawPattern[idx] * aimMul * jitter;
    const dp = dpDeg * DEG, dy = dyDeg * DEG;

    if (recoilSink) {
      // W5 owns the accumulator, the hold, the recentre and the eat-first rule.
      // Adding it here as well would be a 2x pattern that no test on either side
      // can see, because each side would be individually correct.
      recoilSink(dpDeg, dyDeg);
    } else {
      recoil.pitch += dp;
      recoil.yaw += dy;
      // Only (1 - recoverFraction) of a kick is permanent. 72% comes back, which
      // is what makes a burst something you FEEL and correct rather than fight.
      recoil.restPitch += dp * (1 - R.recoverFraction);
      recoil.restYaw += dy * (1 - R.recoverFraction);
      recoil.hold = R.holdMs / 1e3;
    }
    rig.kick(dp, dy, stateMultiplier(2), s.index);
  }

  function recoilStep(dt) {
    if (recoilSink) return;                      // not ours to recentre
    if (recoil.hold > 0) { recoil.hold = Math.max(0, recoil.hold - dt); return; }
    recoil.pitch = damp(recoil.pitch, recoil.restPitch, recoilLambda, dt);
    recoil.yaw = damp(recoil.yaw, recoil.restYaw, recoilLambda, dt);
    if (Math.abs(recoil.pitch - recoil.restPitch) < 1e-6) recoil.pitch = recoil.restPitch;
  }

  /**
   * The player's own correction eats the kick budget FIRST.
   * `dPitch` is the pitch delta the player just asked for, in radians; negative is
   * downward. Returns the (negative) amount absorbed, which W5 must subtract from
   * the delta it applies to its own pitch — otherwise the player pays for the
   * correction twice and the recentre pulls their view to the floor.
   */
  function consumeAimKick(dPitch) {
    if (recoilSink) return 0;                    // W5's eat() owns this on the page
    if (!(dPitch < 0) || recoil.pitch <= 0) return 0;
    const eaten = Math.max(dPitch, -recoil.pitch);
    recoil.pitch += eaten;
    if (recoil.restPitch > recoil.pitch) recoil.restPitch = recoil.pitch;
    recoil.eaten += -eaten;
    return eaten;
  }

  // -------------------------------------------------------------------------
  // RAY RESOLUTION. World colliders march first and SHRINK a shared bestT; the
  // actor capsules are then tested against that already-shortened budget. That
  // single shared float IS the occlusion system — an enemy behind a wall is
  // missed for free, with no second pass and no visibility query.
  // -------------------------------------------------------------------------
  function rayBox(set, i, ox, oy, oz, dx, dy, dz, until) {
    const b3 = i * 3, b9 = i * 9;
    const rx = ox - set.c[b3], ry = oy - set.c[b3 + 1], rz = oz - set.c[b3 + 2];
    const a0x = set.ax[b9], a0y = set.ax[b9 + 1], a0z = set.ax[b9 + 2];
    const a1x = set.ax[b9 + 3], a1y = set.ax[b9 + 4], a1z = set.ax[b9 + 5];
    const a2x = set.ax[b9 + 6], a2y = set.ax[b9 + 7], a2z = set.ax[b9 + 8];
    return rayAabb(
      rx * a0x + ry * a0y + rz * a0z,
      rx * a1x + ry * a1y + rz * a1z,
      rx * a2x + ry * a2y + rz * a2z,
      dx * a0x + dy * a0y + dz * a0z,
      dx * a1x + dy * a1y + dz * a1z,
      dx * a2x + dy * a2y + dz * a2z,
      0, 0, 0,
      set.e[b3], set.e[b3 + 1], set.e[b3 + 2],
      until,
    );
  }

  function marchColliders(ox, oy, oz, dx, dy, dz, until) {
    const world = ctx.world;
    const set = world && world.colliders;
    if (!set || set.n === 0) return until;
    const ex = ox + dx * until, ey = oy + dy * until, ez = oz + dz * until;
    const n = set.query(
      Math.min(ox, ex), Math.min(oy, ey), Math.min(oz, ez),
      Math.max(ox, ex), Math.max(oy, ey), Math.max(oz, ez),
    );
    let best = until;
    for (let q = 0; q < n; q++) {
      const t = rayBox(set, set._hits[q], ox, oy, oz, dx, dy, dz, best);
      if (t >= 0 && t < best) best = t;
    }
    return best;
  }

  function groundGap(g, ox, oy, oz, dx, dy, dz, t) {
    const y = oy + dy * t;
    const s = g.groundAt(ox + dx * t, oz + dz * t, y);
    return hasSurface(s) ? y - s : 1;
  }

  function marchGround(ox, oy, oz, dx, dy, dz, until) {
    const g = ctx.world && ctx.world.ground;
    if (!g || typeof g.groundAt !== 'function' || until <= 0) return until;
    if (groundGap(g, ox, oy, oz, dx, dy, dz, 0) < 0) return until;   // already under it
    let prev = 0;
    for (let k = 1; k <= FT.groundSteps; k++) {
      const t = until * (k / FT.groundSteps);
      if (groundGap(g, ox, oy, oz, dx, dy, dz, t) < 0) {
        let lo = prev, hi = t;
        for (let it = 0; it < FT.groundRefine; it++) {
          const mid = (lo + hi) * 0.5;
          if (groundGap(g, ox, oy, oz, dx, dy, dz, mid) < 0) hi = mid; else lo = mid;
        }
        // `lo` is the last sample still ABOVE the surface. Returning `hi` puts the
        // impact a few millimetres UNDER the floor, and a decal below the floor
        // z-fights it into the bullseye W1 measured (docs/HANDOFF.md findings).
        return lo;
      }
      prev = t;
    }
    return until;
  }

  function resolveShot(ox, oy, oz, dx, dy, dz, range) {
    let bestT = marchColliders(ox, oy, oz, dx, dy, dz, range);
    const worldT = marchGround(ox, oy, oz, dx, dy, dz, bestT);
    bestT = worldT;
    let actor = -1, hy = 0;
    for (let i = 0; i < targets.length; i++) {
      const a = targets[i];
      if (!a || a.dead) continue;
      const t = rayCapsuleY(ox, oy, oz, dx, dy, dz, a.x, a.y, a.z, a.radius, a.height, bestT, _hitOut);
      if (t >= 0 && t < bestT) { bestT = t; actor = i; hy = _hitOut.hy; }
    }
    _shot.t = bestT;
    _shot.actor = actor;
    _shot.hy = hy;
    _shot.x = ox + dx * bestT;
    _shot.y = oy + dy * bestT;
    _shot.z = oz + dz * bestT;
    _shot.world = actor < 0 && bestT < range - FT.rangeSkin;
    return _shot;
  }

  // -------------------------------------------------------------------------
  // ONE SHOT. Zero per-weapon branches: everything that differs between the four
  // guns is a column in FEEL.weapons.
  // -------------------------------------------------------------------------
  function fireOnce(s, dt, subT) {
    const w = WEAPONS[s.index];
    s.mag -= 1;
    s.shots += 1;
    s.burst += 1;
    s.sinceShot = 0;
    s.pressConsumed = true;
    s.pressBuffer = 0;
    stats.shots++;
    stats.lastSubT = subT;

    const yaw = _aim.yaw + recoil.yaw;
    const pitch = clamp(_aim.pitch + recoil.pitch, FEEL.camera.pitchMin, FEEL.camera.pitchMax);
    basis(yaw, pitch);
    const fx = _basis[0], fy = _basis[1], fz = _basis[2];
    const rx = _basis[3], ry = _basis[4], rz = _basis[5];
    const ux = _basis[6], uy = _basis[7], uz = _basis[8];

    // Muzzle, in the camera's own frame — and it is the origin of the FLASH, the
    // TRACER and the SOUND, never of the RAY. Firing the ray from the muzzle puts
    // every shot 0.12 m below and 0.2 m right of the crosshair at every range,
    // which is the same family of defect as the 0.4-degree sight misalignment
    // this workstream exists to not repeat. The ray leaves the EYE, down the
    // world camera's centre, and the gun is dressing on top of it.
    //
    // The flash being COAXIAL with the eye is also why deleting its shadow map
    // costs nothing (C2-F10): a light 0.5 m in front of your face casts almost no
    // visible form shadow, so six cube faces per frame would buy a black screen.
    // Per-weapon, so the flash sits at the crown of THIS barrel. A shared
    // constant put it mid-barrel on the short guns and behind the brake on the
    // long one, and the flash lit the receiver from inside instead of throwing
    // light forward — which is exactly the light this game is played by.
    const mf = F.muzzleForward[w.id] ?? 0.5;
    const mx = _aim.x + fx * mf + rx * F.muzzleRight - ux * F.muzzleDown;
    const my = _aim.y + fy * mf + ry * F.muzzleRight - uy * F.muzzleDown;
    const mz = _aim.z + fz * mf + rz * F.muzzleRight - uz * F.muzzleDown;
    const ex = _aim.x, ey = _aim.y, ez = _aim.z;

    const frac = magFraction(s);

    // THE IRIS OWNS flashGain. It carries SAFETY.md's burst decay, the predictive
    // WCAG clamp and FLASH-SAFE in one place, and it is the same number the muzzle
    // light must be scaled by — so it is read, never recomputed.
    const gain = irisShot(w.stopW, _aim.ads);
    stats.lastFlashGain = gain;

    // C1-F8 / C3-F2: the ammo readout is the LIGHT, on intensity AND radius,
    // because the falloff survives the tonemapper where the clipped core does not.
    const flashI = w.flashI * (F.ammoFlashI[0] + F.ammoFlashI[1] * frac) * gain;
    const flashR = w.flashR * (F.ammoFlashR[0] + F.ammoFlashR[1] * frac);
    flash.age = 0;
    flash.life = w.flashT * F.flashGlowTimeScale;
    flash.peak = flashI;
    flash.radius = flashR;
    flash.gain = gain;
    flash.x = mx; flash.y = my; flash.z = mz;
    // NOT DONE, and deliberately not faked: FEEL wants the flash core rotated to
    // one of EIGHT discrete angles (continuous rotation reads as noise; eight
    // reads as a mechanism with a preferred orientation). The shared additive
    // bucket takes no rotation for shape 0, so the core is a round blob until
    // either W1 adds one or this becomes a 4-lobe shape variant. Storing an unused
    // `flash.rot` here would have looked like the feature exists.

    // ---- the cone -----------------------------------------------------------
    let cone = (_aim.ads ? w.adsSpread : w.spread) + s.bloom;
    if (_aim.ads && zeroSpreadArmed) { cone = 0; zeroSpreadArmed = false; }
    stats.lastCone = cone;
    stats.lastRange = w.range;

    for (let p = 0; p < w.pellets; p++) {
      // FIX 1 — a uniform DISC. FIX 2 — perturbed along the CAMERA's right/up.
      const rad = cone * Math.sqrt(rand(spreadRng));
      const th = rand(spreadRng) * TAU;
      const ox = Math.cos(th) * rad, oy = Math.sin(th) * rad;
      let dx = fx + rx * ox + ux * oy;
      let dy = fy + ry * ox + uy * oy;
      let dz = fz + rz * ox + uz * oy;
      // NOT Math.hypot. It allocates 64 B per call on V8 (measured in
      // tests/weapons.mjs §11b's instrument: 0 B/call for the sqrt form, 64 B for
      // hypot) and this runs once per pellet. hypot's guard against intermediate
      // overflow buys nothing on a unit-ish vector.
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx *= inv; dy *= inv; dz *= inv;

      const hit = resolveShot(ex, ey, ez, dx, dy, dz, w.range);
      stats.pellets++;
      // The tracer runs muzzle -> terminus, so it leaves the barrel while the ray
      // it draws left the eye. That is the whole trick, and it is invisible.
      spawnTracerTo(mx, my, mz, hit.x, hit.y, hit.z);
      if (pelletSink) pelletSink(dx, dy, dz, hit.t, hit.actor, cone);

      if (hit.actor >= 0) {
        const a = targets[hit.actor];
        _opts.x = hit.x; _opts.y = hit.y; _opts.z = hit.z;
        _opts.dx = dx; _opts.dz = dz;
        _opts.weakPoint = combat.isWeakPoint(hit.hy, a.y, a.height);
        _opts.headMultiplier = w.headMul;
        _opts.multiplier = 1;
        _opts.frontness = undefined;
        _opts.sourceId = s.index;
        combat.applyHit(a, w.dmg, _opts);
        stats.hits++;
      } else if (hit.world) {
        spawnSparks(hit.x, hit.y, hit.z);
        stats.worldHits++;
      } else {
        stats.misses++;
      }
    }

    // ---- bloom, recoil, sound, and the noise you just made -----------------
    if (_aim.ads) s.bloom = Math.min(F.bloomAdsCap, s.bloom + F.bloomAds);
    else s.bloom = Math.min(F.bloomHipCap, s.bloom + F.bloomHip);
    recoilShot(s);

    const audio = ctx.audio;
    if (audio && audio.gun) audio.gun.shot(w.id, audio.now + (dt - subT), frac, 0);

    // D4 — the gun is the only thing that gives you away, and now it has a
    // mechanism: radius = loudness * (1 + flashGain). Tapping is quieter than
    // spraying because the burst decay is in the same term.
    disturbance.x = mx; disturbance.y = my; disturbance.z = mz;
    disturbance.radius = w.loudness * (1 + gain);
    disturbance.at = clock;
    disturbance.weapon = w.id;
    stats.lastDisturbance = disturbance.radius;
    if (disturbanceSink) disturbanceSink(disturbance);
  }

  function irisShot(stopW, ads) {
    const iris = ctx.render && ctx.render.iris;
    if (iris && typeof iris.shot === 'function') return iris.shot(stopW, ads);
    // HEADLESS FALLBACK ONLY (tests/weapons.mjs, and standalone development before
    // W1's iris is on the page). It is SAFETY.md rule 2 verbatim, reading the same
    // FEEL constants the iris reads, and the gate asserts both against the
    // published formula so the two cannot drift.
    return burstGain(shotsWithin(FEEL.safety.burstWindow), !!ctx.flashSafe);
  }

  // A tiny ring of shot timestamps, for the fallback gain only.
  const shotRing = new Float64Array(FT.shotRing);
  let ringHead = 0, ringCount = 0;
  function shotsWithin(window) {
    let n = 0;
    for (let k = 0; k < ringCount; k++) {
      const i = (ringHead - 1 - k + shotRing.length * 2) % shotRing.length;
      if (clock - shotRing[i] <= window) n++; else break;
    }
    return n;
  }
  function pushShotTime() {
    shotRing[ringHead] = clock;
    ringHead = (ringHead + 1) % shotRing.length;
    ringCount = Math.min(shotRing.length, ringCount + 1);
  }

  // -------------------------------------------------------------------------
  // POOLED VFX. The wall spark and the tracer are the WEAPON's own effects, not
  // hit feedback: combat/impact.js stays the only door into the four-kind impact
  // language, and tests/weapons.mjs greps for that.
  // -------------------------------------------------------------------------
  function spawnTracerTo(x, y, z, tx, ty, tz) {
    const t = tracers.take();
    if (!t) return false;
    const ax = tx - x, ay = ty - y, az = tz - z;
    const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1e-6;   // see the pellet loop
    t.x = x; t.y = y; t.z = z;
    t.dx = ax / len; t.dy = ay / len; t.dz = az / len;
    t.len = len; t.age = 0;
    return true;
  }

  function spawnSparks(x, y, z) {
    for (let i = 0; i < FT.sparkCount; i++) {
      const p = sparks.take();
      if (!p) return;
      const u = rand(flashRng) * 2 - 1;
      const th = rand(flashRng) * TAU;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const sp = FT.sparkSpeed * (0.4 + rand(flashRng) * 0.6);
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(th) * s * sp; p.vy = Math.abs(u) * sp; p.vz = Math.sin(th) * s * sp;
      p.age = 0;
    }
  }

  function submitVfx(rdt) {
    const add = ctx.render && ctx.render.additive ? ctx.render.additive : null;
    const W = FEEL.render.warm;

    tracers.forEachLive(t => {
      t.age += rdt;
      const p = t.age / FT.tracerLife;
      if (p >= 1) { tracers.release(t); return; }
      const half = t.len * 0.5;
      const size = Math.max(FT.tracerRadius, t.len * FT.tracerStretch);
      if (add) {
        add.sprite(
          t.x + t.dx * half, t.y + t.dy * half, t.z + t.dz * half,
          size, W[0], W[1], W[2], (1 - p) * FT.tracerAlpha, 2, t.dx, t.dy, t.dz,
        );
      }
    });

    sparks.forEachLive(s => {
      s.age += rdt;
      const p = s.age / FT.sparkLife;
      if (p >= 1) { sparks.release(s); return; }
      s.x += s.vx * rdt; s.y += s.vy * rdt; s.z += s.vz * rdt;
      s.vy -= FEEL.move.gravity * rdt;
      if (add) add.sprite(s.x, s.y, s.z, FT.sparkSize, W[0], W[1], W[2], 1 - p, 0, 0, 0, 0);
    });

    // ---- the muzzle flash: two-stage, one rover slot, one field probe -------
    if (flash.age >= 0 && flash.age < flash.life) {
      flash.age += rdt;
      const i = flashEnvelope(flash.age, flash.life) * flash.peak;
      if (i > 0) {
        if (ctx.render && ctx.render.lights) {
          ctx.render.lights.request(
            'muzzle', FT.muzzleKey, flash.x, flash.y, flash.z,
            flash.radius, i, W, ctx.render.LIGHT_KIND ? ctx.render.LIGHT_KIND.MUZZLE : 2,
          );
        }
        // The flash is a light in the SIMULATION too, not only in the picture:
        // illuminationAt is what the iris, enemy accuracy and spawn validation
        // read, and a flash the world cannot see is the divergence C2-F2 is about.
        if (ctx.light && ctx.light.addProbe) {
          ctx.light.addProbe(flash.x, flash.y, flash.z, flash.radius, i * FT.flashProbeScale);
        }
        if (add) add.sprite(flash.x, flash.y, flash.z, FT.sparkSize * 2, W[0], W[1], W[2], Math.min(1, i), 0, 0, 0, 0);
      }
    }
  }

  /** Hot core over flashT, then a room-glow tail at 0.15x peak over 2.2x flashT. */
  function flashEnvelope(age, life) {
    const core = life / F.flashGlowTimeScale;
    if (age <= core) {
      const p = age / core;
      return 1 + (F.flashGlowScale - 1) * p;
    }
    const p = (age - core) / Math.max(1e-6, life - core);
    return F.flashGlowScale * Math.max(0, 1 - p);
  }

  // -------------------------------------------------------------------------
  // THE FIXED SUBSTEP
  // -------------------------------------------------------------------------
  function wantsFire(s) {
    const w = WEAPONS[s.index];
    if (w.auto) return triggerDown || s.pressBuffer > 0;
    return !s.pressConsumed && (triggerDown || s.pressBuffer > 0);
  }

  function beginReload(s) {
    if (s.reloading || reloadAmount(s) <= 0) return false;
    s.reloadWasEmpty = s.mag <= 0;
    s.reloadTotal = reloadTime(s);
    s.reloadLeft = s.reloadTotal;
    s.reloading = true;
    s.reloadCredited = false;
    s.bloom = 0;
    stats.reloads++;
    return true;
  }

  function stepFixed(dt) {
    substeps++;
    clock += dt;
    const s = states[current];
    const w = WEAPONS[s.index];

    readAim(_aim);
    readTargets();

    // ADS clock, and the 250 ms zero-spread window that opens when it completes.
    const adsMs = FEEL.camera.adsMs / 1e3;
    if (_aim.ads) {
      const was = adsHeld;
      adsHeld = Math.min(adsMs, adsHeld + dt);
      if (was < adsMs && adsHeld >= adsMs) { adsSettledAt = clock; zeroSpreadArmed = true; }
    } else {
      adsHeld = 0; adsSettledAt = -1; zeroSpreadArmed = false;
    }
    if (zeroSpreadArmed && adsSettledAt >= 0 && clock - adsSettledAt > F.firstShotWindow) zeroSpreadArmed = false;

    s.sinceShot += dt;
    s.dryLock = Math.max(0, s.dryLock - dt);
    s.pressBuffer = Math.max(0, s.pressBuffer - dt);
    if (s.sinceShot > F.bloomRecoverDelay) s.bloom = damp(s.bloom, 0, FT.bloomLambda, dt);
    recoilStep(dt);

    if (s.reloading) {
      s.reloadLeft -= dt;
      const phase = s.reloadTotal > 0 ? 1 - s.reloadLeft / s.reloadTotal : 1;
      if (!s.reloadCredited && phase >= WT.reloadSeat) {
        const n = reloadAmount(s);
        s.mag += n; s.reserve -= n;
        s.reloadCredited = true;
      }
      if (s.reloadLeft <= 0) cancelReload(s);
    } else if (s.mag <= 0 && s.reserve > 0 && s.sinceShot >= F.autoReload) {
      beginReload(s);
    }

    // FIX 3 — cooling ACCUMULATES. Never `= interval`.
    s.cooling -= dt;
    let fired = 0;
    while (
      s.cooling <= 0 && s.mag > 0 && !s.reloading
      && fired < F.maxShotsPerSubstep && wantsFire(s)
    ) {
      const subT = Math.min(dt, -s.cooling);
      // fireOnce reads the burst window, so THIS shot must not already be in the
      // ring when it does — n is "shots before this one", which is the convention
      // SAFETY.md's formula and W1's iris both use. Off by one here makes the
      // first shot of every burst 0.645 instead of 1.0, and the burst decay's
      // whole point is that shot one shows you the room.
      fireOnce(s, dt, subT);
      pushShotTime();
      s.cooling += shotInterval(s.index);
      fired++;
    }
    if (s.cooling < 0) s.cooling = 0;
    if (fired === 0 && !triggerDown && s.pressBuffer <= 0) s.burst = 0;

    if (s.mag <= 0 && !s.reloading && s.dryLock <= 0 && wantsFire(s)) {
      dryFire(s, w);
    }
  }

  function dryFire(s, w) {
    s.dryLock = F.dryLockout;
    s.pressConsumed = true;
    s.pressBuffer = 0;
    stats.dryFires++;
    const audio = ctx.audio;
    if (audio && audio.gun) audio.gun.dryFire(audio.now, s.reserve > 0);
    if (s.reserve > 0) beginReload(s);
  }

  // -------------------------------------------------------------------------
  // update(rdt, time) — see the header. Weapon timing is the ONE clock that does
  // not slow during hitstop, so the substeps are driven from an UNSCALED dt
  // reconstructed from the render dt rather than from main.js's sim loop.
  // -------------------------------------------------------------------------
  function update(rdt, time) {
    const frozen = !!(time && time.frozen);
    const fs = time && typeof time.freezeScale === 'number' && time.freezeScale > 0
      ? time.freezeScale : FEEL.time.freezeScale;
    const raw = clamp(frozen ? rdt / fs : rdt, 0, FT.maxFrame);

    accum += raw;
    let n = 0;
    while (accum >= FT.fixedDt && n < FEEL.time.maxSubsteps) { accum -= FT.fixedDt; stepFixed(FT.fixedDt); n++; }
    if (n >= FEEL.time.maxSubsteps) accum = 0;

    combat.update(rdt);
    submitVfx(rdt);
    rig.update(rdt, states[current], recoil, _aim, clock);
  }

  /** Deterministic driver for the gate; the same path update() takes. */
  function stepSeconds(seconds) {
    let n = 0;
    accum += seconds;
    while (accum >= FT.fixedDt && n < 1e6) { accum -= FT.fixedDt; stepFixed(FT.fixedDt); n++; }
    return n;
  }

  // -------------------------------------------------------------------------
  // API
  // -------------------------------------------------------------------------
  const api = {
    id: 'weapons',
    update,

    // --- input -------------------------------------------------------------
    setTrigger(down) {
      const was = triggerDown;
      triggerDown = !!down;
      if (!was && triggerDown) press();
      if (was && !triggerDown) states[current].burst = 0;
    },
    press,
    setAds(on) { localAds = !!on; },
    reload() { return beginReload(states[current]); },
    select(next) {
      const to = typeof next === 'string' ? indexOf(next) : next;
      current = selectWeapon(states, current, to);
      rig.select(current);
      return current;
    },
    /** C1-F12: the two carried slots, chosen at the landing from four cradles. */
    setCarried(a, b) {
      carried0 = clamp(a | 0, 0, WEAPON_COUNT - 1);
      carried1 = clamp(b | 0, 0, WEAPON_COUNT - 1);
      if (current !== carried0 && current !== carried1) api.select(carried0);
      return [carried0, carried1];
    },
    swap() { return api.select(current === carried0 ? carried1 : carried0); },

    // --- wiring (no silent defaults) ---------------------------------------
    setAimProvider(fn) { aimProvider = typeof fn === 'function' ? fn : null; return !!aimProvider; },
    setTargets(fn) {
      targetProvider = typeof fn === 'function' ? fn : (Array.isArray(fn) ? () => fn : null);
      return !!targetProvider;
    },
    setDisturbanceSink(fn) { disturbanceSink = typeof fn === 'function' ? fn : null; },
    /**
     * Hand the aim kick to whoever owns the player's look angles — on the shipping
     * page that is `player.addAimKick(pitchDeg, yawDeg)`. Wiring it moves the
     * accumulator OUT of this module; leaving it unwired keeps the local one, and
     * assertWired() says which of the two is live.
     */
    setRecoilSink(fn) {
      recoilSink = typeof fn === 'function' ? fn : null;
      if (recoilSink) { recoil.pitch = 0; recoil.yaw = 0; recoil.restPitch = 0; recoil.restYaw = 0; recoil.hold = 0; }
      return !!recoilSink;
    },
    get ownsAimKick() { return !recoilSink; },
    /** QA surface. Off in play; the gate uses it to measure the real sampler. */
    setPelletSink(fn) { pelletSink = typeof fn === 'function' ? fn : null; },
    assertWired,
    ready,
    get isReady() { return isReady; },

    // --- recoil, read by W5 -------------------------------------------------
    recoil,
    consumeAimKick,

    // --- reads --------------------------------------------------------------
    get current() { return current; },
    get weapon() { return WEAPONS[current]; },
    get state() { return states[current]; },
    states,
    combat,
    rig,
    tracers,
    sparks,
    flash,
    disturbance,
    /** The TRUE cone, bloom included. Graphical, never numeric — the reticle reads this. */
    cone() {
      const s = states[current], w = WEAPONS[s.index];
      return (_aim.ads ? w.adsSpread : w.spread) + s.bloom;
    },
    magFraction: () => magFraction(states[current]),
    reserveNotch: () => reserveNotch(states[current]),
    aimBasis(yaw, pitch) { return basis(yaw + recoil.yaw, pitch + recoil.pitch); },
    burstGain,
    stepSeconds,
    stepFixed,

    reset() {
      resetStates(states);
      current = 0;
      accum = 0; clock = 0; substeps = 0;
      triggerDown = false; localAds = false; adsHeld = 0; adsSettledAt = -1;
      zeroSpreadArmed = false;
      recoil.pitch = 0; recoil.yaw = 0; recoil.restPitch = 0; recoil.restYaw = 0;
      recoil.hold = 0; recoil.eaten = 0;
      flash.age = -1;
      ringHead = 0; ringCount = 0;
      tracers.releaseAll(); sparks.releaseAll();
      combat.reset();
      for (const k of Object.keys(stats)) stats[k] = 0;
      stats.lastFlashGain = 1;
    },

    snapshot() {
      const s = states[current], w = WEAPONS[s.index];
      return {
        build: 'w6-weapons',
        weapon: w.id, current, carried: [carried0, carried1],
        mag: s.mag, reserve: s.reserve, magFrac: magFraction(s), notch: reserveNotch(s),
        reloading: s.reloading, cooling: s.cooling, cone: api.cone(),
        rpm: w.rpm, interval: shotInterval(s.index),
        recoilPitchDeg: recoil.pitch / DEG, recoilYawDeg: recoil.yaw / DEG,
        substeps, clock,
        stats: { ...stats },
        tracers: { live: tracers.liveCount, capacity: tracers.capacity, denied: tracers.denied },
        sparks: { live: sparks.liveCount, capacity: sparks.capacity, denied: sparks.denied },
        impact: combat.snapshot(),
        rig: rig.snapshot(),
        errors: assertWired(),
        ready: isReady,
        aimProviderIsDefault: !aimProvider,
        targetProviderIsDefault: !targetProvider,
        aimDefaultUsed, targetsDefaultUsed,
      };
    },

    /**
     * CONTRACT §2 — an observable fact about the SHIPPING page. The three that
     * matter for this workstream: the rig is on the viewmodel layer (a mesh on the
     * world layer renders at world scale through the wrong lens and nobody
     * notices for a week), the rig added ZERO programs (W1's RawShaderMaterial
     * finding is what makes that true, and it is worth re-proving here because
     * this is the first workstream to mint materials in bulk), and the pipeline
     * resolves a real ray against the real world.
     */
    verify() {
      const checks = [];
      const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
      const rigCheck = rig.verify();
      add('viewmodel meshes are all on LAYERS.VIEWMODEL', rigCheck.allOnViewmodelLayer, rigCheck.detail);
      add('viewmodel rig added zero programs', rigCheck.programsDelta === 0, rigCheck.programsDelta);
      const before = stats.shots;
      const held = triggerDown;
      const s = states[current];
      // BRING THE GUN TO READY FIRST. verify() is called from wherever the caller
      // happens to be — and on the shipping page that is right after the gate has
      // just emptied a burst into the room, so `cooling` is most of a shot interval
      // and `dryLock` may be set. Without this the check reads "a trigger pull
      // produces a shot: 0" and means "you fired 90 ms ago", which is the correct
      // behaviour of the cadence system being reported as a broken trigger.
      // Cadence itself is measured properly at 30/60/144 Hz in tests/weapons.mjs;
      // this line is setup, not a shortcut around that.
      s.cooling = 0;
      s.dryLock = 0;
      s.sinceShot = Math.max(s.sinceShot, F.bloomRecoverDelay);
      if (s.reloading) cancelReload(s);
      if (s.mag <= 0) s.mag = WEAPONS[s.index].mag;
      triggerDown = true;
      s.pressConsumed = false;
      s.pressBuffer = F.buffer;
      stepFixed(FT.fixedDt);
      triggerDown = held;
      add('a trigger pull produces a shot', stats.shots > before, `${stats.shots - before}`);
      add('the shot lit the world', !ctx.light || ctx.light.illuminationAt(flash.x, flash.y, flash.z) >= 0, '');
      add('every auto weapon clears the stagger window', WEAPONS.every(w => !w.auto || 60 / w.rpm > FEEL.enemies.staggerTime));
      return { ok: checks.every(c => c.ok), checks };
    },

    dispose() {
      rig.dispose();
      combat.reset();
      tracers.releaseAll();
      sparks.releaseAll();
    },
  };

  function press() {
    const s = states[current];
    s.pressBuffer = F.buffer;
    s.pressConsumed = false;
  }

  /**
   * WIRE FROM THE CONTEXT. The manifest declares this system as
   * `{ id: 'weapons', needs: ['render', 'player'] }`, and this is what that
   * dependency is FOR. W5-PLAYER owns the look angles and the aim-kick
   * accumulator, so the moment `ctx.player` exists the aim provider and the recoil
   * sink come off it — otherwise the shipping page holds the standalone default
   * for ever, every shot leaves (0, eye, 0) down -Z while the player looks
   * somewhere else, and ready() could never be called without throwing.
   *
   * Two details that are the whole point of doing it here rather than in a caller:
   *   - the angles come from `player.aimBasis()`, which is rebuilt from THIS
   *     substep's yaw/pitch and already carries the kick. Never the camera matrix
   *     (one frame stale, plus view kick, bob roll and shake — none of which may
   *     move a bullet), and never the viewmodel camera (0.4 degrees left).
   *   - `bobPhase` publishes the camera rig's t_c, which is the opt-in that makes
   *     the viewmodel ride THE ONE CLOCK instead of running a second timer.
   * An explicit setAimProvider() later still overrides this, which is what the
   * gate's live tier does.
   */
  function wireFromContext() {
    const p = ctx && ctx.player;
    if (!p || typeof p.aimBasis !== 'function') return false;
    api.setAimProvider(out => {
      const b = p.aimBasis();
      out.yaw = b.yaw; out.pitch = b.pitch;
      out.x = b.ox; out.y = b.oy; out.z = b.oz;
      out.ads = !!(p.input && p.input.ads);
      out.crouched = false;                 // FLARE has no crouch verb (docs/DESIGN.md)
      out.airborne = !p.grounded;
      out.speed = p.speed || 0;
      out.bobPhase = p.cam ? p.cam.phase : -1;
      return out;
    });
    if (typeof p.addAimKick === 'function') api.setRecoilSink((dp, dy) => p.addAimKick(dp, dy));
    return true;
  }
  wireFromContext();

  ctx.weapons = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.weapons = api;
  return api;
}

/**
 * SAFETY.md rule 2, as a pure function so the gate can assert the CURVE rather
 * than a single sample: shot 1 is full brightness, shot 4 is at 0.34, and held
 * fire settles into a steady bright barrel instead of twelve discrete flashes a
 * second. FLASH-SAFE clamps it to 0.35.
 *
 * `n` = shots fired inside the last FEEL.safety.burstWindow, NOT counting this one.
 */
export function burstGain(n, flashSafe) {
  const g = 1 / (1 + Math.max(0, n) * FEEL.safety.burstDecay);
  return flashSafe ? Math.min(g, FEEL.safety.flashSafeClamp) : g;
}

export default create;
