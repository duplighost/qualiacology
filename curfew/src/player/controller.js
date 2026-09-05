// CURFEW — player body.
//
// LIFTED from Projects/vigil/src/player/controller.js (Alex played this and said it feels
// good), plus the v0.4 site build's held-crouch + canFitBody additions
// (vigil-handoff/vigil-enhanced/src/player/controller.js:13-16, 49-57), plus DUSKFALL's
// mantle (qualiacology/src/player/controller.js:289-330) and CINDERBLOOM's specced-but-
// never-built tac-sprint (COMBAT_FEEL §2).
//
// THREE THINGS THIS FILE IS RESPONSIBLE FOR, in order of how badly they break the game:
//
//  1. ONE stride clock. bobPhase lives here and ONLY here. Camera bob, weapon bob and the
//     'player:step' footstep event all read this single phase. COMBAT_FEEL says this twice
//     on purpose: two timers reads as "floaty" and the player will never be able to name
//     why. If you are about to add a second timer, don't.
//  2. prev/curr + present(alpha). The sim runs at a fixed 1/60; the camera renders the
//     interpolated pose. Writing the render pose inside step() is the CINDERBLOOM teleport
//     and it is the single most-repeated bug in this catalogue.
//  3. Sprint and slide are DEFAULTS. No stamina, no gate, no meter. [DESIGN §3]
//  4. THE FOOTSTEP `noise` EVENT. Integrator decision 2: this file emits it, not the audio
//     lane, because the audio lane returns early with no Web Audio (every headless gate,
//     every autoplay-blocked browser) and the verb chain crouch -> quiet -> unseen must not
//     die with the sound. The audio lane plays the SOUND; this file publishes the EVENT.
//     A gameplay verb may never live behind an audio guard.
//
// Feel numbers are NOT re-derived here — every one comes from CFG.player / CFG.camera,
// which took them from VIGIL, which took them from CINDERBLOOM's COMBAT_FEEL. Locals below
// are only the handful VIGIL had that config does not carry yet; each is cited and each is
// listed as a request in docs/HANDOFF.md.

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp, damp, ease, Spring } from '../engine/math.js';
import { CFG } from '../config.js';

const P = CFG.player;

// ---- numbers VIGIL had that CFG.player does not carry yet ------------------
// Requested in docs/HANDOFF.md; local consts meanwhile so nothing is invented silently.
const STICK = 0.42;            // [vigil controller.js:13] ground stick band, keeps you glued going downhill
const AIR_CAP = 1.40;          // [vigil controller.js:10] air-control cap; bhop cannot exist
// How far above terrain.heightAt the solver's own floor has to be before this file believes
// it is a COLLIDER top rather than the same terrain sample by another name. The solver reads
// the identical analytic field (collision.js groundHeight -> terrain.heightAt), so on open
// ground the two agree to the bit and this branch is never taken; 2 cm is the same slack the
// airborne test below already uses. Round 5, integrator item 2.
const COLLIDER_FLOOR_EPS = 0.02;
const CROUCH_ADS = 1.55;       // [vigil controller.js:9]
const SLIDE_COOLDOWN = 1.10;   // [vigil controller.js:15]
const SLIDE_FRIC_A = 3.40, SLIDE_FRIC_B = 1.60;   // [vigil controller.js slide physics]
const SLIDE_FRIC_MUL = 0.32;   // [vigil] the speed-proportional half of slide drag
const SLIDE_EXIT_SPEED = 2.60; // [vigil] below this the slide is over
const SLIDE_STEER = 0.663;     // rad/s, +-38 deg/s of steering with zero acceleration [vigil]
const SLIDE_CANCEL_KEEP = 0.85;// slide-cancel keeps 0.85x horizontal speed - a combat move, not tech [vigil]
const SLIDE_EYE_DROP = 0.82;   // absolute eye height at the bottom of a slide [vigil]
const SLIDE_VIEW_IN = 0.14;    // s to drop into the slide posture [vigil v0.1]
const SLIDE_VIEW_OUT = 7;      // damped rise back out; the view outlives the physics [vigil v0.4]
const CROUCH_IN = 12, CROUCH_OUT = 9.5;   // 190/240 ms crouch transition [vigil]
// Crouch is also the downhill travel verb. Flat VIGIL slides keep every number above;
// these only open and sustain the same slide when the terrain is actually falling away
// in the player's travel direction. 0.075 is a 4.3 degree signed grade, enough to reject
// road crown/noise while accepting the county's authored slopes.
const DOWNHILL_SLIDE_GRADE = 0.075;
// Below the 2.10 m/s crouch cap so holding crouch BEFORE a crest can still become a
// descent slide once the ground falls away. The old 2.60 threshold made that natural
// input order mathematically impossible; only a precisely timed press while walking worked.
const DOWNHILL_SLIDE_ENTRY = 2.00;
const DOWNHILL_DRAG_HI = 0.55, DOWNHILL_DRAG_LO = 0.28;
const DOWNHILL_FULL_GRADE = 0.22;
const DOWNHILL_AIR_GRACE = 0.30;   // terrain crests must not cancel the descent verb in one frame
const HIT_GRACE = 0.35;        // three simultaneous lunges must not triple-tap [vigil]
const FALL_FREE = 16;          // m/s of impact that is free; ~a 5.8 m drop [vigil]
const FALL_HP_PER = 8;         // hp per m/s over FALL_FREE [vigil]
const LAND_DIP_GAIN = 0.030, LAND_DIP_MAX = 0.42, LAND_DIP_IMPULSE = 9;  // [vigil]
const LAND_MIN_SPEED = 1.6;    // below this a landing is not an event [vigil]
const SPRINT_PULSE = 0.006 * 9;// subliminal per-footfall pulse while sprinting [vigil]
const STEP_MIN_SPEED = 0.4;    // stride clock only advances above this [vigil]

// Tac-sprint entry. CINDERBLOOM specced the verb (9.20 / 4.0 / 6.0, all in CFG) but never
// an input for it, because it was never built. Double-tap-and-hold sprint is the idiom the
// verb is written against (it must be reachable mid-flight, one hand, no menu).
const TAC_DOUBLE_TAP = 0.28;   // s between the two sprint presses

// ---- the footstep `noise` radii — THIS FILE OWNS THEM (integrator decision 2) ------
// The only emitters of `noise` for footfall and landing used to live in src/audio/bed.js,
// behind `if (!A.baked || A.silent) return`. That guard is true in every headless gate and
// in any browser that hard-blocks autoplay, so in those environments footsteps woke nothing
// and crouching bought the player exactly nothing. A GAMEPLAY VERB MAY NOT LIVE BEHIND AN
// AUDIO GUARD: the audio lane keeps playing the SOUND, this file publishes the EVENT, and
// they are now independent failures.
//
// Scale is read against CFG.weapons loudness so the two live on one ruler: revolver 14,
// bolt 26, shotgun/carbine 38, melee 0. A crouched step must be quieter than anything a
// creature makes on its own; a tac-sprint should be nearly as loud as a bolt-action.
// The first three are the audio lane's own numbers, carried over verbatim from its handoff
// note rather than re-derived, so moving the emit changed WHERE it fires and nothing else.
const NOISE_CROUCH = 4.0;      // crouched walk: quieter than anything a creature makes
const NOISE_WALK = 9.0;        // walk: about a room and the next one
const NOISE_SPRINT = 17.0;     // sprint: half a shotgun
const NOISE_TAC = 23.0;        // tac-sprint: the chase verb announces itself, on purpose
const NOISE_LAND_MIN = 8.0;    // the softest landing that is an event at all
const NOISE_LAND_MAX = 26.0;   // a bolt-action. A hard landing is the loudest the body gets

// ---- death and respawn -----------------------------------------------------
// THIS FILE OWNS player:died AND player:respawn. Nothing else may emit either.
// Before this round `dead` was set in hurt() and cleared only by reset(), which nothing
// called: you died, the body stopped, the weapons refused, and the M1 death-and-recovery
// loop could never complete. player:respawn had two listeners and zero emitters.
//
// ALEX'S BINDING RULE: control is never taken away at the scary moment. There is no fade,
// no cut, no spectator orbit and no "you died" screen. The camera stays exactly where your
// eyes are, sinks like a body giving up, and the county goes on running around you for four
// seconds — which is worse, and is the point.
const DEATH_S = 4.0;            // killing blow -> respawn
// The lowest the eye may ever sit above the ground the body is standing on. Above the near
// plane, above a destination's raised apron, and low enough that a death still reads as
// going down hard.
const EYE_FLOOR = 0.42;
const DEATH_SINK = 0.95;        // m the eye settles by across the beat
const DEATH_SINK_LAMBDA = 1.9;  // damped: a collapse, not an elevator
const RESPAWN_RING = 6.0;       // m out from a place's centre when the centre is a building
const RESPAWN_PROBES = 8;       // fixed ring, never ctx.rng: a respawn has to be reproducible

/**
 * ALEX PLAYED IT, 2026-09-02: "the spot i spawn and and return to when i die kills me quite
 * quickly and I am never sure why." MEASURED with tools/whatkilledme.mjs --play 75: he died
 * at 30.0 s, was back on 78 hp at 45.0 s and dead again at 58.4 s, in the same place, to the
 * same pack, which the director's _onDeath() does not clear — it cancels pending ORDERS and
 * leaves every body that is already up exactly where it is, adjacent, alerted.
 *
 * Three things answer that, and two of them are mine:
 *
 *  1. RESPAWN_INVULN — a window in which damage cannot land at all. 2.5 s is the number:
 *     a hound closes at ~3 m/s and the bites in the trace landed 1.0-5.0 s apart, so this
 *     buys one refused bite and the beginning of a second, which is the difference between
 *     "I came back and died" and "I came back and ran". It is NOT a soft damage reduction:
 *     partial mitigation is unreadable, and a window the player cannot see the edge of is a
 *     mechanic he will never learn to use. ui/hud.js draws it as a closing arc that empties
 *     over exactly these seconds, so the edge is visible before it arrives.
 *  2. RESPAWN_AWAY — come back on the FAR SIDE of the place from the body you left. The ring
 *     probes are ordered outward from the bearing pointing away from the death site instead
 *     of always starting at angle 0, so the respawn is still perfectly reproducible (no rng,
 *     derived from two positions) but it no longer hands you back to the same jaw.
 *  3. NOT MINE: the pack itself. player:respawn now carries `clearRadius` and the death
 *     coordinates so the director can sweep the ground before it gives the body back.
 *     Requested in docs/HANDOFF.md.
 */
const RESPAWN_INVULN = 2.5;     // s of true immunity after coming back
const RESPAWN_AWAY = 18.0;      // if you died within this of the respawn point, ring out
const RESPAWN_AWAY_RING = 12.0; // m of that ring — far enough that a committed body must re-close
const RESPAWN_CLEAR_R = 26.0;   // m the director is asked to clear around the returning body

// Mantle. CFG.player.mantle carries reach/clearance/cooldown/tiers; these are the probe
// geometry DUSKFALL used (controller.js:289-330) expressed against our terrain field.
const MANTLE_LEAD = 0.55;      // m ahead of the body shell we probe for a lip
const MANTLE_IN = 5.5;         // m/s of inward carry so the pop lands ON the ledge [duskfall:322]
const MANTLE_VEL_AWAY = -1.5;  // do not yank someone who is clearly moving away [duskfall:318]

// ---- CLIMBING. Round 6, lane E. ----------------------------------------------------
// Alex, fifth playtest (2026-09-03): "I'm not sure why I can't climb up stuff either. That
// would be fun. Like dying light style parkour stuff." Fourth: "it would be cool if you could
// get on top of this stuff."
//
// The terrain mantle above is DUSKFALL's ballistic pop and it stays exactly as it was for
// terrain lips (tests/collision.mjs pins it). It cannot climb a COLLIDER: the inward carry
// is projected out by the very wall it is trying to top (measured on the course in
// tests/climb.mjs before this block existed: a 1.9 m wall stopped the body at 2.44 m, its
// face minus the radius, and nothing rose). So a collider ledge is climbed KINEMATICALLY —
// the body is carried from where it is to the landing on a curve, the solver is not run
// while it is carried, and it ends standing on the top with a soft landing. Three verbs:
//   GRAB   airborne, a lip in the hands' band: catch, hang (climb.hangS), pull up (climb.pullS).
//   MANTLE grounded (or airborne under the hands), a top inside reach: pull straight up.
//   VAULT  sprinting into a thin waist-high obstacle with a clear far side: over it, no jump.
// Aim is never touched by any of them (the FLARE rule). The hands are lane D1's viewmodel
// and there is no hand animation: the eye's curve and the landing are the whole read.
// The feel numbers (the hands' band, the hang, the pull, the vault window) are CFG.player.climb;
// the locals below are probe geometry and the shape of the curves.
const CL = P.climb;
const _landOut = { x: 0, z: 0 };   // ROUND 13: _landingOn's answer, allocation-free
// ROUND 13: the held-Space chain and its one fling per hold (see CFG.player.climb.hold).
const HOLD = CL.hold || { chainS: 0.30, flingMaxRise: 3.30, handsHi: 0.80, intentS: 0.36, outSpeed: 2.6, landIn: 0.42 };
const HOLD_FLING_CARRY = 1.2;  // m/s of forward carry added at the fling so the hands reach the face at apex
const CLIMB_NONE = 0, CLIMB_HANG = 1, CLIMB_PULL = 2, CLIMB_VAULT = 3;
const MANTLE_LEAD2 = 0.36;     // a second probe one more radius out: a lip you run at is not always one shell away
// A deliberate Space press gets one farther COLLIDER probe. The ordinary movement mantle,
// terrain pop, vault and car roof keep their existing reach: this only closes the measured
// 0.43 m dead band where the station crate looked reachable but Space just hopped.
const SPACE_CLIMB_EXTRA = 0.50;
// ROUND 10: Space is an explicit request to get hands onto what the CAMERA is facing. Keep
// that request through the first 0.22 s of an ordinary jump so an early-airborne lip can be
// caught, and fan the facing probe only 11 degrees each side. The passive movement mantle
// below still receives its one exact movement bearing and never inherits this forgiveness.
const SPACE_CLIMB_INTENT_S = 0.22;
const SPACE_CLIMB_FAN = 0.20;  // lateral component before normalising: atan(0.20) = 11.3 deg
// On a running jump a lower neighbour enters the hands band before the taller lip under the
// reticle. The exact facing/movement rays get this much first refusal; the side fan then
// joins while the same Space intent is still alive. Standing/walking and queued chains do not
// need the delay because they are not sweeping several metres of frontage during take-off.
const SPACE_CLIMB_FAN_DELAY_S = 0.12;
// A completed pull should flow into the next piece of geometry instead of leaving the player
// almost stopped behind the full general-purpose refusal cooldown. Dropping a hold still uses
// the full cooldown; these two numbers apply only to a successful landing.
const CLIMB_EXIT_KEEP = 0.82;
const CLIMB_CHAIN_COOLDOWN = 0.12;
const MANTLE_MIN_RISE = 0.62;  // STEP_UP + STEP_TOL + 0.02: anything lower the solver steps onto, and a step is not a climb
const PULL_LIFT_END = 0.72;    // fraction of the pull by which the feet reach the top
const PULL_OVER_START = 0.30;  // fraction of the pull at which the body starts moving over the lip
const LAND_IN = HOLD.landIn;   // m past the probe point the feet come to rest, so the footprint is well on the top
                               // (ROUND 13: 0.42 = the radius and a hand — "some kind of natural space")
const LAND_BACKOFF = [LAND_IN, 0.32, 0.22];   // ROUND 13: a narrow top gets a nearer landing, never a fall
const CLIMB_HEAVE = 0.06;      // m the eye dips through the eye spring as the pull begins (a heave, not a hop)
const VAULT_LAND_SPEED = 1.8;  // a vault's far-side plant: barely an event
const VAULT_SCAN = 0.25;       // m between the probes that find the obstacle and measure its thickness
const VAULT_SIGHT = 2;         // scan steps past the first probe a vault may first be sighted at (covers the mantle's second probe)
const VAULT_BEYOND = 0.40;     // m past the far face the feet land
const VAULT_TRIGGER = 1.00;    // m from the body's centre to the near face when the vault starts (sighted earlier, held until here)
const VAULT_DIP = 0.12;        // m the eye dips through the eye spring as the hand plants
const VAULT_CLEAR = 0.05;      // m the feet pass over the obstacle's top
const STEP_SMOOTH_MIN = 0.10;  // m of instantaneous floor change (a step onto a crate) routed through the eye spring.
                               // Only a step ON or OFF a COLLIDER top counts (repair 1): terrain CAN move the feet
                               // this far in one frame — tac-sprint down the county rim's 39 deg slope is 0.105 m,
                               // and speedMul 1.25 puts ordinary 28 deg ground at 0.101 — and there the eye rode
                               // 0.21 m high going downhill (measured). Open ground is the eye's own business.
const _climbPayload = { kind: 'mantle', top: 0, x: 0, z: 0 };

/**
 * MEASURED BUG, 2026-09-02, and it is not mine to fix in place: engine/math.js is shared
 * and read-only. Spring.update() picks its substep count from ceil(dt*w/1.2), which only
 * accounts for the STIFFNESS term. The damping term needs 2*z*w*h < 2 as well, so a
 * high-damping spring at 60 Hz gets exactly one substep and diverges.
 *
 * CFG.player.springs.eye is [9, 1.0]: w = 56.5, and at dt = 1/60 the update matrix has an
 * eigenvalue of -1.40. Sixty steps later the "0.09 m slide overshoot" is 3.3e6 metres and
 * the camera is in deep space. Verified numerically before this line was written.
 *
 * So: substep every spring here to h*w*(1 + 2z) < 1.2, which is stable for every freq and
 * damping in CFG. Requested as a fix to math.js in docs/HANDOFF.md — gfx and weapons take
 * springs from the same config block and will hit this too.
 */
function stepSpring(s, dt) {
  const n = Math.max(1, Math.ceil(dt * s.w * (1 + 2 * s.z) / 1.2));
  const h = dt / n;
  for (let i = 0; i < n; i++) s.update(h);
}

/**
 * Peak |value| a spring reaches from a unit impulse, MEASURED through stepSpring() at the
 * loop's own dt and sampled where the game samples - once per fixed step.
 *
 * Not a nicety. The closed form for a critically damped impulse is v/(w*e), which for
 * springs.eye says an impulse of 13.8 gives the 0.09 m dip CFG asks for. Semi-implicit
 * Euler at h*w = 0.31 bleeds most of that away and the real dip comes out at 0.036 m -
 * 40% of the number in config. Measuring the integrator we actually run means the number
 * in config is the number you see, and it self-corrects if math.js is ever fixed.
 * Runs ~24 iterations, once, at construction.
 */
function unitImpulsePeak(freq, damping, dt) {
  const probe = new Spring(freq, damping);
  probe.nudge(1);
  let peak = 0;
  for (let i = 0; i < 24; i++) { stepSpring(probe, dt); peak = Math.max(peak, Math.abs(probe.value)); }
  return peak > 1e-9 ? peak : 1;
}

// ---- module-level scratch. The hot path allocates nothing. ------------------
const _wish = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _groundNormal = new THREE.Vector3(0, 1, 0);
let _preX = 0, _preZ = 0;      // pre-integration footprint, for the wall back-out
// Bus payloads are module scratch: step() allocates nothing, and a death that allocates is
// a death that hitches.
//
// player:step and player:land used to build a fresh object literal per emit. player:step
// fires roughly twice a second, forever, for the whole run — the two hot-path allocations
// the audit found in the entire tree. Same treatment as died/respawn: one struct each,
// rewritten in place. Listeners must READ these synchronously and never retain them, which
// is the same contract enemies.js already keeps for its own `noise` scratch.
const _diedPayload = { x: 0, y: 0, z: 0 };
// Declared with every field it will ever carry, at module load: a payload that grows a
// property on the second death is a shape V8 re-optimises at the worst possible moment, and
// a listener that reads `clearRadius` must never see undefined on the first respawn.
const _respawnPayload = {
  x: 0, y: 0, z: 0,
  invuln: RESPAWN_INVULN,     // s of immunity the body is coming back with
  clearRadius: RESPAWN_CLEAR_R, // m the director is asked to sweep around x,z
  fromX: 0, fromZ: 0,         // where the body died — the other place worth sweeping
  movedM: 0,                  // how far the respawn point was pushed off the place centre
};
const _stepPayload = { sprint: false, tac: false, crouch: false, speed: 0, parity: 0, pos: null };
const _rayO = { x: 0, y: 0, z: 0 };   // the grab's wall-finding ray, module scratch
const _rayD = { x: 0, y: 0, z: 0 };
const _landPayload = { speed: 0, pos: null };
const _noisePayload = { x: 0, z: 0, radius: 0, source: 'step' };

export class PlayerController {
  static id = 'player';

  constructor(ctx) {
    this.ctx = ctx;

    // ---- simulation pose
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;                     // body facing, mirrored from the camera each step

    // ---- render pose: prev -> curr, lerped by present(alpha). See header note 2.
    this.prevPos = new THREE.Vector3();
    this.currPos = new THREE.Vector3();
    this.renderPos = new THREE.Vector3();
    this.prevYaw = 0; this.currYaw = 0; this.renderYaw = 0;
    this.prevEyeY = 0; this.currEyeY = 0; this.renderEyeY = 0;

    // ---- ground / air state
    this.grounded = true;
    this.sinceGround = 0;
    this.jumpBuffered = -1;

    // ---- posture
    this.sprinting = false;
    this.crouched = false;
    this.crouchHeld = false;
    this.standingClear = true;        // refreshed each step from collision.canOccupy [vigil v0.4:49-57]
    this.crouchT = 0;                 // 0 stand .. 1 crouch

    // ---- slide
    this.sliding = false;
    this.slideT = 0;
    this.slideCooldown = 0;
    this.slideViewT = 0;              // camera posture outlives the physical slide [vigil v0.4]
    this.slideDir = new THREE.Vector3();
    this.downhillSliding = false;     // only this variant receives grade assist / extra time
    this.slideAirT = 0;

    // ---- tac-sprint: the chase verb. Default, no stamina, no HUD. [DESIGN §3, risk #1]
    this.tacSprinting = false;
    this.tacT = 0;                    // seconds burned of tacSprint.time
    this.tacCooldown = 0;
    this.sinceSprintPress = 99;

    this._slideDipped = false;        // has this slide's overshoot impulse fired yet

    // ---- mantle
    this.mantleCooldown = 0;
    this.spaceClimbIntent = 0;                            // Space may catch a lip during early jump
    this.climbQueued = false;                             // Space tapped during a carry: climb only on landing
    // ROUND 13: the held-Space chain.
    this.holdChain = false;                               // landed from a climb with Space still held: re-probe now
    this.holdFling = false;                               // a fling is in the air: the hands' band is raised
    this.holdSpent = false;                               // this hold has spent its one fling; release to re-arm

    // ---- climb (grab / pull / vault): the body is carried, the solver does not run
    this.climb = CLIMB_NONE;
    this.climbT = 0;
    this.climbDur = 0;
    this.climbX0 = 0; this.climbY0 = 0; this.climbZ0 = 0;   // where the carry starts
    this.climbX1 = 0; this.climbY1 = 0; this.climbZ1 = 0;   // where the feet end (on the top)
    this.climbDirX = 0; this.climbDirZ = 0;                 // unit, into the lip
    this.climbTop = 0;                                      // the top's height, for the vault's arc
    this.climbSpeed = 0;                                    // horizontal speed on entry (the vault keeps 0.85x)
    this.climbLX = 0; this.climbLZ = 0;                     // a grab's landing, decided at the catch
    this.climbRefuse = false;                               // let go of a lip: no climb until the feet land
    this.floorWasCollider = false;                          // last frame's floor was a collider top (the step-up smoothing gate)

    // ---- the ONE stride clock. Nothing else may keep a locomotion timer.
    this.bobPhase = 0;
    this.stepParity = 0;

    // ---- springs, freq/damping straight out of CFG.player.springs
    this.landSpring = new Spring(P.springs.landing[0], P.springs.landing[1]);   // landing dip
    this.eyeSpring = new Spring(P.springs.eye[0], P.springs.eye[1]);            // slide-drop overshoot
    // Solve for the 0.09 m overshoot CFG asks for instead of hard-coding VIGIL's raw -3.4
    // impulse, against the integrator we actually run. See unitImpulsePeak().
    this.slideImpulse = P.slide.overshoot
      / unitImpulsePeak(P.springs.eye[0], P.springs.eye[1], CFG.loop.FIXED);
    // The same solve for the climb's heave and the vault's hand-plant dip.
    const eyeUnit = unitImpulsePeak(P.springs.eye[0], P.springs.eye[1], CFG.loop.FIXED);
    this.heaveImpulse = CLIMB_HEAVE / eyeUnit;
    this.vaultImpulse = VAULT_DIP / eyeUnit;

    // ---- health [CFG.player.health; FLARE feel.js:232 shape]
    this.hp = P.health.max;
    this.sinceHurt = 99;
    this.dead = false;
    this.deathT = 0;                  // seconds into the death beat
    this.deathDrop = 0;               // m the eye has sunk; added into eyeY, nothing else
    // Where the killing blow landed, so the respawn can put the body somewhere else and the
    // director can be told which ground to sweep.
    this.deathX = 0; this.deathZ = 0;
    // THE RESPAWN WINDOW. > 0 means hurt() refuses outright. `invulnMax` exists so the HUD
    // can draw the fraction remaining without knowing this file's constant — a window nobody
    // can see the edge of is a mechanic nobody learns.
    this.invuln = 0;
    this.invulnMax = RESPAWN_INVULN;

    // ---- carried by the car. See setCarried() / carryTo().
    this.carried = false;

    // Where init() put us. The respawn's last resort when no place has been claimed —
    // which cannot happen in a normal game (the Filling Station starts claimed) but can
    // happen in a test that constructs the player without places.
    this.spawnX = 0; this.spawnZ = 0;

    this.forwardAxis = 0; this.strafeAxis = 0;   // published for the camera's lean
    this._in = null;                  // input layer, resolved once per step
    // Previous-frame edge state, for input layers that do not do edge detection themselves.
    this._edge = { jump: false, sprint: false, crouch: false, tacsprint: false };
    this._spawned = false;
  }

  // Systems are read LAZILY, at use, never captured at construction: construction order is
  // manifest order and terrain/collision may be half-built when we are made.
  get _terrain() { return this.ctx.systems.get('terrain'); }
  get _collision() { return this.ctx.systems.get('collision'); }
  get _camera() { return this.ctx.systems.get('camera'); }
  get _weapons() { return this.ctx.systems.get('weapons'); }
  get _input() { return this.ctx.input || this.ctx.systems.get('input'); }

  /**
   * THE SKILL TREE, READ LAZILY. progression/progress.js is manifest slot 20 and we are 11,
   * so it does not exist when we are constructed — capturing `stats` in the constructor is
   * VIGIL's combat.js bug and would pin every legs node to its default forever. This is a
   * Map lookup and a property read: no allocation, safe to call several times a step.
   *
   * The CFG value is ALWAYS the fallback, so the body still runs with no progression system
   * at all (every headless gate that builds a partial manifest, and the reverse case where
   * a save is missing). A stat that is not a finite number is not a stat.
   */
  _stat(key, fallback) {
    const sys = this.ctx.systems;
    const prog = sys ? sys.get('progress') : null;
    const stats = prog ? prog.stats : null;
    const v = stats ? stats[key] : undefined;
    return typeof v === 'number' && v === v ? v : fallback;
  }

  // The input layer is engine's, and TWO shapes are in play: VIGIL's engine/input.js
  // (held / pressed / consumeLook, keyed by action name) and the struct docs/HANDOFF.md says
  // setInput must accept ({ forward, strafe, sprint, crouch, jump, ... }). Both are read here
  // so the body works whichever one engine lands on, and so setInput drives the same code the
  // keyboard does. Resolved once per step into this._in; no closures, no allocation.
  _held(a) {
    const i = this._in;
    if (!i) return false;
    if (typeof i[a] === 'boolean') return i[a];      // struct shape
    return i.held ? !!i.held(a) : false;             // action shape
  }

  /** Rising edge. Uses the input layer's own edge detection when it has one, else derives it. */
  _pressed(a) {
    const i = this._in;
    if (!i) return false;
    if (i.pressed) return !!i.pressed(a);
    const now = this._held(a);
    return now && !this._edge[a];
  }

  /** Signed movement axes, from either shape. */
  _axisForward() {
    const i = this._in;
    if (!i) return 0;
    if (typeof i.forward === 'number') return clamp(i.forward, -1, 1);
    return (this._held('forward') ? 1 : 0) - (this._held('back') ? 1 : 0);
  }
  _axisStrafe() {
    const i = this._in;
    if (!i) return 0;
    if (typeof i.strafe === 'number') return clamp(i.strafe, -1, 1);
    return (this._held('right') ? 1 : 0) - (this._held('left') ? 1 : 0);
  }

  init() {
    const terr = this._terrain;
    // World owns the spawn; until it publishes one we start at the origin of the valley.
    const start = (terr && terr.playerStart) || this.ctx.spawn || null;
    const x = start ? start.x : 0;
    const z = start ? start.z : 0;
    this.spawnX = x; this.spawnZ = z;
    this.pos.set(x, terr ? terr.heightAt(x, z) : 0, z);
    this.vel.set(0, 0, 0);
    this._sync();
    this._spawned = true;
  }

  ready() {
    // Wiring check, not a health check: the body is meaningless without ground and input.
    return !!this._terrain && !!this._input;
  }

  // ---------------------------------------------------------------- readouts
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get landDip() { return this.landSpring.value; }
  get bodyHeight() { return lerp(P.STAND_H, P.CROUCH_H, ease.outQuad(this.crouchT)); }

  /** Simulation-time eye height (absolute world Y). present() interpolates it. */
  get eyeY() {
    const stand = lerp(P.EYE, P.EYE_CROUCH, ease.outQuad(this.crouchT));
    // IN fast (v0.1's 0.14 s ramp), OUT slow (v0.4's damped slideViewT, so the camera does
    // not snap back up the instant the physics ends). The overshoot spring is added
    // UNSCALED: gating it on the view ramp - which is what v0.4 does - swallows the entire
    // 0.09 m dip, and that dip is the whole feeling of the slide. Measured: scaled it peaks
    // at 0.02 m, unscaled at the 0.09 m config asks for.
    const drop = lerp(stand, SLIDE_EYE_DROP, this.slideViewT) + this.eyeSpring.value;
    // The death sink rides the SAME channel every other eye motion does, which is how the
    // camera can sink without anybody taking the camera away: player/camera.js reads
    // renderEyeY and knows nothing about dying.
    // FOUR SEPARATE CHANNELS SUBTRACT FROM THE EYE — the crouch lerp, the slide dip, the
    // land spring and the death sink — and nothing was stopping them from summing to more
    // than the eye had. Two of them together already did. This is the floor: the camera may
    // sink, collapse and dip, and it may never end up in the soil, whatever combination
    // arrives. Cheap, unconditional, and it makes the whole class impossible rather than the
    // one case that was reported.
    const eye = this.pos.y + drop + this.landSpring.value - this.deathDrop;
    return Math.max(eye, this.pos.y + EYE_FLOOR);
  }

  /** Stride length in metres for the current posture. ONE table, ONE clock. */
  get stride() {
    if (this.sprinting || this.tacSprinting) return P.stride.sprint;
    if (this.crouched) return P.stride.crouch;
    return P.stride.walk;
  }

  // ---------------------------------------------------------------- verbs
  hurt(amount, fromDir) {
    if (this.dead || this.ctx.debug?.god) return;
    // The respawn window. TRUE immunity, not a multiplier: partial mitigation across a 2.5 s
    // window is invisible, and the whole point of this window is that it can be seen.
    if (this.invuln > 0) return;
    if (this.sinceHurt < HIT_GRACE) return;
    this.hp -= amount;
    this.sinceHurt = 0;
    this.ctx.bus.emit('player:hurt', { amount, fromDir, hp: this.hp });
    if (this.hp <= 0) {
      // ROUND 7 (lane G): 'secondWind', the other half of blood_4 "Iron" — "once a cycle the
      // end of you is a run". Declared in nodes.js since round 6, never called. Base is null,
      // so with no node owned this is one property read and a death, exactly as before.
      const pr = this._sys ? this._sys('progress') : (this.ctx.systems && this.ctx.systems.get('progress'));
      const wind = (pr && typeof pr.perk === 'function') ? pr.perk('secondWind', null) : null;
      if (wind && wind.seconds > 0) {
        this.hp = 1;
        this.invuln = Math.max(this.invuln, wind.seconds);
        return;
      }
      this._die();
    }
  }

  heal(v) { this.hp = Math.min(this.hpMax, this.hp + v); }

  /**
   * THE BODY BRANCH'S 'hpMax' (round 6, lane G registers it; lane E reads it). Alex: "Things
   * that work to make your health bigger." Every ceiling in this file reads THIS and never
   * CFG.player.health.max directly, so buying the node raises the initial hp, the respawn hp,
   * the heal ceiling and the regen ceiling together. With no progression system, or with the
   * stat unregistered, it is exactly CFG.player.health.max and nothing changes.
   */
  get hpMax() { return this._stat('hpMax', P.health.max); }

  /**
   * The killing blow. THE ONLY EMITTER of player:died in the game (integrator decision 3):
   * director, dread, progression, audio, hud and the car all listen, and progression was
   * emitting it on this lane's behalf from manifest slot 20 because nothing here ever did.
   *
   * Aim is untouched. yaw and pitch belong to the camera and no line in this file has ever
   * written them — that is the difference between dying and being shown a cutscene.
   */
  _die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.deathT = 0;
    this.deathDrop = 0;
    this.deathX = this.pos.x; this.deathZ = this.pos.z;
    this.invuln = 0;
    this.vel.set(0, 0, 0);
    this.sliding = false; this.slideT = 0; this._slideDipped = false;
    this.sprinting = false; this.tacSprinting = false; this.tacT = 0;
    this.climb = CLIMB_NONE;
    this.jumpBuffered = -1;
    _diedPayload.x = this.pos.x; _diedPayload.y = this.pos.y; _diedPayload.z = this.pos.z;
    this.ctx.bus.emit('player:died', _diedPayload);
  }

  /**
   * Come back. Four seconds after the blow, at the nearest activated safe point: either a
   * DISCOVERED lit major or a lookout the player has climbed. The latter is Alex's dropped
   * "could serve as a respawn point" half of the wilderness towers. Deer stands share the
   * climb reward, but wilds.lookouts() excludes them from this rule.
   *
   * A death that cannot end is worse than no death at all, so this always has an answer:
   * the Filling Station starts found and claimed, and spawnX/Z remain the final fallback.
   *
   * The dead flag is cleared and hp restored BEFORE the event, so every listener sees a
   * living player. Input was never taken away, so there is nothing to give back.
   */
  _respawn() {
    let bx = this.spawnX, bz = this.spawnZ;
    // The body does not travel during the four-second death beat today, but the recorded
    // killing point is the invariant this decision belongs to. Initialise with the spawn
    // fallback so a missing places lane cannot let a farther lookout make the answer worse.
    const fromX = Number.isFinite(this.deathX) ? this.deathX : this.pos.x;
    const fromZ = Number.isFinite(this.deathZ) ? this.deathZ : this.pos.z;
    let dx = bx - fromX, dz = bz - fromZ;
    let bd2 = dx * dx + dz * dz;
    const places = this.ctx.systems ? this.ctx.systems.get('places') : null;
    if (places && typeof places.list === 'function') {
      // list() allocates. This runs once per death, not on the hot path.
      const l = places.list();
      for (let i = 0; i < l.length; i++) {
        const pl = l[i];
        // Discovered AND claimed. places.js turns a place's lamps on when you claim it, so
        // claimed IS lit; a place you have merely seen is a dark building.
        if (!pl.found || !pl.claimed) continue;
        dx = pl.x - fromX; dz = pl.z - fromZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < bd2) { bd2 = d2; bx = pl.x; bz = pl.z; }
      }
    }

    // A tower becomes a checkpoint on the same first feet-on-platform edge that sets its
    // persistent climbed bit. `lookouts()` is stable and nonallocating; checking the bit here
    // keeps an ordinary discovered tower and every climbed deer stand out of the candidate set.
    const wilds = this.ctx.systems ? this.ctx.systems.get('wilds') : null;
    if (wilds && typeof wilds.lookouts === 'function') {
      const l = wilds.lookouts();
      for (let i = 0; i < l.length; i++) {
        const tower = l[i];
        if (!tower || !tower.climbed || !Number.isFinite(tower.x) || !Number.isFinite(tower.z)) continue;
        dx = tower.x - fromX; dz = tower.z - fromZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < bd2) { bd2 = d2; bx = tower.x; bz = tower.z; }
      }
    }

    // The centre of a place is usually a building. Fixed ring, never ctx.rng: a respawn
    // has to land in the same spot twice for a test to mean anything.
    //
    // TWO reasons to leave the centre now, and the second is the one he felt. The old one:
    // the centre is a wall. The new one: YOU DIED HERE. If the killing blow landed within
    // RESPAWN_AWAY of the point we are about to hand him back at, the thing that landed it
    // is still standing on that point — so the probes are walked outward from the bearing
    // pointing AWAY from the death site (0, +1, -1, +2, -2 ... in steps of TAU/8) and the
    // first that can hold a standing body wins. Still no rng and still reproducible: the
    // answer is a pure function of two positions.
    const col = this._collision;
    const centreBlocked = !!(col && col.canOccupy && !col.canOccupy(bx, bz, P.RADIUS, P.STAND_H));
    const dxd = bx - this.deathX, dzd = bz - this.deathZ;
    const diedOnTop = Math.hypot(dxd, dzd) < RESPAWN_AWAY;
    if (centreBlocked || diedOnTop) {
      const ring = diedOnTop ? RESPAWN_AWAY_RING : RESPAWN_RING;
      // Degenerate case (died exactly on the point) falls back to the body's own facing,
      // which is at least not the centre.
      const away = (dxd * dxd + dzd * dzd) > 1e-6 ? Math.atan2(dzd, dxd) : this.yaw;
      const ox = bx, oz = bz;
      for (let i = 0; i < RESPAWN_PROBES; i++) {
        const k = (i + 1) >> 1;
        const a = away + (i & 1 ? 1 : -1) * k * (TAU / RESPAWN_PROBES);
        const cx = ox + Math.cos(a) * ring;
        const cz = oz + Math.sin(a) * ring;
        if (!col || !col.canOccupy || col.canOccupy(cx, cz, P.RADIUS, P.STAND_H)) {
          bx = cx; bz = cz; break;
        }
      }
    }

    this.dead = false;
    this.hp = this.hpMax;
    this.sinceHurt = 0;          // the regen delay restarts; coming back is not a free top-up
    this.deathT = 0;
    this.deathDrop = 0;
    this.carried = false;
    this.landSpring.set(0); this.eyeSpring.set(0);
    this.crouched = false; this.crouchHeld = false; this.crouchT = 0;
    this.sliding = false; this.slideT = 0; this.slideViewT = 0; this.slideCooldown = 0;
    this.tacSprinting = false; this.tacT = 0; this.tacCooldown = 0;
    this.climb = CLIMB_NONE;
    this.bobPhase = 0;
    // The window opens BEFORE the event, so a listener that reads player.invuln on the same
    // frame sees it armed rather than zero.
    this.invuln = RESPAWN_INVULN;
    // teleport() re-syncs prev == curr, which is exactly right for a single placement:
    // without it present(alpha) draws one frame of streak across the whole county.
    this.teleport(bx, bz);
    _respawnPayload.x = this.pos.x; _respawnPayload.y = this.pos.y; _respawnPayload.z = this.pos.z;
    _respawnPayload.invuln = RESPAWN_INVULN;
    _respawnPayload.clearRadius = RESPAWN_CLEAR_R;
    _respawnPayload.fromX = this.deathX; _respawnPayload.fromZ = this.deathZ;
    _respawnPayload.movedM = +Math.hypot(this.pos.x - this.deathX, this.pos.z - this.deathZ).toFixed(2);
    this.ctx.bus.emit('player:respawn', _respawnPayload);
  }

  /**
   * The vehicle lane's door (vehicle/car.js:1090). While carried the body does not
   * integrate, does not resolve the capsule, and emits neither player:step nor player:land
   * — you could hear yourself walking at 23 m/s — but prev/curr keep rolling, so
   * present(alpha) interpolates for the whole drive.
   *
   * The car used to call teleport() every driving step. teleport() runs _sync(), which
   * collapses prev == curr == render, so the player's interpolation was dead the entire
   * time you were in a vehicle. Freezing is a state, not a placement.
   */
  setCarried(on) {
    const v = !!on;
    if (v === this.carried) return;
    this.carried = v;
    if (v) {
      this.vel.set(0, 0, 0);
      this.sliding = false; this.slideT = 0; this._slideDipped = false;
      this.downhillSliding = false; this.slideAirT = 0;
      this.sprinting = false; this.tacSprinting = false; this.tacT = 0;
      this.crouched = false; this.crouchHeld = false;
      this.jumpBuffered = -1;
      this.spaceClimbIntent = 0; this.climbQueued = false;
      this.climb = CLIMB_NONE;
      this.grounded = true; this.sinceGround = 0;
      // Deliberately NOT _sync(): collapsing prev/curr here is the bug this door exists
      // to fix, not the fix.
    } else {
      // Hand the body back and let the next step's ground clamp catch it.
      this.sinceGround = 0;
    }
  }

  /**
   * Write the ridden pose (vehicle/car.js:1078, optional half of the carried contract).
   * Rolls our own prev/curr against the car's pose so the interpolation you see while
   * driving is the car's real motion rather than a step behind it.
   */
  carryTo(x, y, z) {
    // A second call in the same step would roll prev onto curr and kill the very
    // interpolation this exists for.
    if (x !== this.currPos.x || y !== this.currPos.y || z !== this.currPos.z) {
      this.prevPos.copy(this.currPos);
      this.prevEyeY = this.currEyeY;
    }
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.currPos.copy(this.pos);
    this.currEyeY = this.eyeY;
  }

  /** Test hook. Both prev and curr are set so no interpolation streak is drawn. */
  teleport(x, z, yaw) {
    const terr = this._terrain;
    this.pos.set(x, terr ? terr.heightAt(x, z) : this.pos.y, z);
    this.vel.set(0, 0, 0);
    if (typeof yaw === 'number') this.yaw = yaw;
    this.sliding = false; this.slideT = 0; this.slideViewT = 0;
    this.downhillSliding = false; this.slideAirT = 0; this.floorWasCollider = false;
    this.tacSprinting = false; this.tacT = 0;
    this.spaceClimbIntent = 0; this.climbQueued = false;
    this.climb = CLIMB_NONE;
    this.grounded = true; this.sinceGround = 0;
    this._sync();
  }

  reset() {
    this.hp = this.hpMax; this.dead = false; this.sinceHurt = 99;
    this.deathT = 0; this.deathDrop = 0; this.carried = false; this.invuln = 0;
    this.sliding = false; this.crouched = false; this.sprinting = false;
    this.downhillSliding = false; this.slideAirT = 0; this.floorWasCollider = false;
    this.tacSprinting = false; this.tacT = 0; this.tacCooldown = 0;
    this.spaceClimbIntent = 0; this.climbQueued = false;
    this.bobPhase = 0;
    this.init();
  }

  _sync() {
    this.prevPos.copy(this.pos); this.currPos.copy(this.pos); this.renderPos.copy(this.pos);
    this.prevYaw = this.currYaw = this.renderYaw = this.yaw;
    const e = this.eyeY;
    this.prevEyeY = this.currEyeY = this.renderEyeY = e;
  }

  // ---------------------------------------------------------------- the step
  step(dt) {
    if (!this._spawned) this.init();

    // Aim is the camera's only truth, and the body must move along THIS step's aim, not the
    // previous one. The camera sits after us in the manifest, so we pull its look forward;
    // stepLook() is idempotent within a step and the camera skips it in its own step().
    const cam = this._camera;
    if (cam && cam.stepLook) cam.stepLook(dt);
    this.yaw = cam ? cam.yaw : this.yaw;

    // prev is captured BEFORE anything moves. This pair is the whole reason the camera can
    // render smoothly at any refresh rate.
    this.prevPos.copy(this.currPos);
    this.prevYaw = this.currYaw;
    this.prevEyeY = this.currEyeY;

    // The respawn window burns in ONE place, above every early return, so it cannot be
    // paused by being carried, by dying again, or by any branch added later. It is zero
    // while dead, so the death beat costs it nothing.
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);

    // ---- the death beat ------------------------------------------------------
    // No fade, no cut, no spectator. The eye sinks on the same channel a slide uses and
    // everything else in the county keeps stepping around you for four seconds.
    if (this.dead) {
      this.deathT += dt;
      // CROUCH OUT FIRST. This branch returns before the crouch damp at the bottom of step(),
      // so dying crouched left crouchT pinned at 1 for the whole beat — and the death sink is
      // sized for a STANDING eye. Crouched eye 1.06 minus a 0.95 sink puts the camera at
      // ground + 0.11 m: in the dirt, under the near plane, and under a destination's raised
      // floor. That is exactly what Alex saw — "when i died i kind of sank down... i could
      // see more underneath. There was an enemy underneath the ground" — and it is why the
      // buried hounds were visible from there and nowhere else.
      this.crouchT = damp(this.crouchT, 0, CROUCH_OUT, dt);
      this.slideViewT = damp(this.slideViewT, 0, SLIDE_VIEW_OUT, dt);
      this.deathDrop = damp(this.deathDrop, DEATH_SINK, DEATH_SINK_LAMBDA, dt);
      stepSpring(this.landSpring, dt);
      stepSpring(this.eyeSpring, dt);
      if (this.deathT >= DEATH_S) this._respawn();
      this._commit();
      return;
    }

    // ---- riding the car ------------------------------------------------------
    // The car writes our position (carryTo / p.pos) and we run no locomotion at all:
    // no integrate, no capsule resolve, no stride clock, and so no player:step and no
    // player:land. prev/curr still roll, so present(alpha) never stops interpolating.
    if (this.carried) {
      this._in = null;
      this.forwardAxis = 0; this.strafeAxis = 0;
      this.crouchT = damp(this.crouchT, 0, CROUCH_OUT, dt);
      this.slideViewT = damp(this.slideViewT, 0, SLIDE_VIEW_OUT, dt);
      stepSpring(this.landSpring, dt);
      stepSpring(this.eyeSpring, dt);
      this.sinceHurt += dt;
      this._regen(dt);
      this._commit();
      return;
    }

    // Cached once per step, not per query: closures here would allocate on the hot path.
    this._in = this._input || null;

    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    this.mantleCooldown = Math.max(0, this.mantleCooldown - dt);
    this.spaceClimbIntent = Math.max(0, this.spaceClimbIntent - dt);
    this.tacCooldown = Math.max(0, this.tacCooldown - dt);
    this.sinceSprintPress += dt;

    // ---- intent -------------------------------------------------------------
    const f = this._axisForward();
    const s = this._axisStrafe();
    // Published so the camera's strafe lean reads the SAME axis the body moved on, whichever
    // input shape produced it, instead of re-querying and disagreeing on a gamepad stick.
    this.forwardAxis = f; this.strafeAxis = s;
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    _wish.set(0, 0, 0).addScaledVector(_fwd, f).addScaledVector(_right, s);
    const hasInput = _wish.lengthSq() > 0;
    if (hasInput) _wish.normalize();

    // ---- headroom: can this body stand up where it is? [vigil v0.4:49-57] ----
    // ROUND 6, lane E: asked at the FEET'S OWN HEIGHT (collision.fits), not canOccupy's,
    // which puts the feet on the terrain. On a crate top the terrain-level body overlapped
    // the crate it was standing on, read "no headroom", and CROUCHED — measured: every
    // collider top under 1.8 m tall was stood on at eye 1.06 and 2.10 m/s, the crate stair
    // included, since the day it shipped. canOccupy stays as the fallback for a solver
    // without fits().
    const col = this._collision;
    this.standingClear = !col ? true
      : col.fits ? col.fits(this.pos.x, this.pos.z, this.pos.y, P.RADIUS, P.STAND_H)
      : col.canOccupy ? col.canOccupy(this.pos.x, this.pos.z, P.RADIUS, P.STAND_H)
      : true;

    // ---- sprint + tac-sprint ------------------------------------------------
    const wep = this._weapons;
    const adsT = wep ? (wep.adsT || 0) : 0;
    const wepBlocks = wep ? !!wep.wantsSprintCancel : false;
    const sprintHeld = this._held('sprint');
    // Snapshot the edges BEFORE anything consumes them; committed at the end of the step.
    const edgeJump = this._pressed('jump'), edgeSprint = this._pressed('sprint');
    const edgeTac = this._pressed('tacsprint');

    // ---- a climb in progress: the body is carried, nothing below runs -------------
    // Sprint, crouch, slide, jump, the solver and gravity all wait. Space during this carry
    // queues a fresh CLIMB request at the landing, never a buffered jump: no accidental
    // bunny-hop can come out of a pull-up.
    if (this.climb !== CLIMB_NONE) {
      if (edgeJump) {
        this.climbQueued = true;
        this.jumpBuffered = -1;
      }
      this._stepClimb(dt, hasInput);
      this._stepTail(dt, sprintHeld, this._held('crouch'));
      return;
    }

    if (edgeSprint) {
      // Double-tap-and-hold enters tac-sprint. First tap is an ordinary sprint, so the
      // verb costs nothing and hides nothing: you always got the sprint you asked for.
      if (this.sinceSprintPress <= TAC_DOUBLE_TAP && this.tacCooldown <= 0
          && f > 0 && this.grounded && !this.crouched && !this.sliding && adsT < 0.5) {
        this.tacSprinting = true;
        this.tacT = 0;
      }
      this.sinceSprintPress = 0;
    }
    // An explicit binding wins if the input layer ever grows one.
    if (edgeTac && this.tacCooldown <= 0 && f > 0 && this.grounded
        && !this.crouched && !this.sliding && adsT < 0.5) {
      this.tacSprinting = true; this.tacT = 0;
    }

    if (this.tacSprinting) {
      this.tacT += dt;
      const broke = !sprintHeld || f <= 0 || this.crouched || this.sliding
        || adsT >= 0.5 || wepBlocks || this.dead;
      // LEGS: the 'long legs' node buys 6.5 s instead of 4.0. Read at use, never captured.
      if (this.tacT >= this._stat('tacSprintTime', P.tacSprint.time) || broke) {
        // The window closes the same way whether it ran out or you cancelled it. The
        // 6.0 s is what makes the chase a decision instead of a hold-shift.
        this.tacSprinting = false;
        this.tacCooldown = P.tacSprint.cooldown;
      }
    }

    this.sprinting = sprintHeld && f > 0 && !this.crouched && !wepBlocks
      && this.grounded && !this.sliding;

    // ---- crouch (held, not toggled) + slide entry [vigil v0.4:13-16] --------
    const wantCrouch = this._held('crouch');
    if (wantCrouch && this.grounded && !this.sliding && hasInput) {
      const grade = hasInput ? this._downhillAlong(_wish.x, _wish.z) : 0;
      // Re-evaluate genuine downhill while the key stays held. A player may crouch on the
      // flat, cross a crest, then expect gravity to take over; requiring a fresh key edge at
      // the exact first downhill frame made the feature exist only for its scripted test.
      if ((!this.crouchHeld && (this.sprinting || this.tacSprinting))
          || grade >= DOWNHILL_SLIDE_GRADE) {
        this._startSlide(grade);
      }
    }
    this.crouchHeld = wantCrouch;
    // You are crouched if you asked to be, if you are sliding, or if the ceiling says so.
    this.crouched = this.sliding || wantCrouch || !this.standingClear;
    this.crouchT = damp(this.crouchT, this.crouched ? 1 : 0, this.crouched ? CROUCH_IN : CROUCH_OUT, dt);
    this.slideViewT = this.sliding
      ? Math.max(this.slideViewT, clamp01(this.slideT / SLIDE_VIEW_IN))
      : damp(this.slideViewT, 0, SLIDE_VIEW_OUT, dt);
    // The overshoot is fired when the eye ARRIVES at the bottom, not when the slide starts.
    // springs.eye is [9, 1.0] - critically damped - so it cannot overshoot a moving target;
    // only an impulse produces the dip, and an impulse at entry has decayed to 0.0007 m by
    // the time the 0.14 s descent finishes. Measured both ways; this is the one you feel.
    if (this.sliding && !this._slideDipped && this.slideViewT >= 1) {
      this._slideDipped = true;
      this.eyeSpring.nudge(-this.slideImpulse);
    }

    // ---- jump buffer + coyote ----------------------------------------------
    if (edgeJump) {
      this.jumpBuffered = P.JUMP_BUFFER;
      this.spaceClimbIntent = SPACE_CLIMB_INTENT_S;
    }
    else this.jumpBuffered -= dt;
    // ROUND 13: releasing Space re-arms the hold's one fling and ends any chain.
    if (!this._held('jump')) { this.holdSpent = false; this.holdChain = false; }

    // Space is the advertised jump AND climb key. Look where the CAMERA points before spending
    // the jump, with two small lateral probes, then (only if different) the movement bearing.
    // Open ground still falls through to the exact VIGIL jump below.
    if (edgeJump && this.climb === CLIMB_NONE) {
      this._trySpaceClimb(hasInput);
      if (this.climb !== CLIMB_NONE) {
        this._stepClimb(dt, hasInput);
        this._stepTail(dt, sprintHeld, wantCrouch);
        return;
      }
    }
    if (this.jumpBuffered > 0 && this._tryJump()) this.jumpBuffered = -1;

    // ---- horizontal move ----------------------------------------------------
    if (this.sliding) {
      this._stepSlide(dt, hasInput);
    } else if (this.grounded) {
      this._stepGround(dt, hasInput, adsT);
    } else if (hasInput) {
      // Air control, capped: you may steer, you may not accelerate. Bhop cannot exist.
      const cur = this.vel.x * _wish.x + this.vel.z * _wish.z;
      const add = Math.min(AIR_CAP, this._speedCap(adsT)) - cur;
      if (add > 0) {
        const a = Math.min(P.AIR_ACCEL * dt, add);
        this.vel.x += _wish.x * a;
        this.vel.z += _wish.z * a;
      }
    }

    // ---- mantle / grab / vault ----------------------------------------------
    // Deliberately BEFORE gravity so the pop is not eaten by the same frame's fall. A climb
    // that starts here carries the body from this frame on: the solver below must not run
    // against the wall the body is now being lifted over.
    // The explicit Space intent remains alive through early take-off. It receives the same
    // facing-first fan in the air, which can start a real hands-band grab. Only after that
    // refuses do we offer the old narrow, movement-directed automatic mantle.
    if (this.spaceClimbIntent > 0) this._trySpaceClimb(hasInput);
    if (this.climb === CLIMB_NONE && hasInput) this._tryClimb(false);
    if (this.climb !== CLIMB_NONE) {
      this._stepClimb(dt, hasInput);
      this._stepTail(dt, sprintHeld, wantCrouch);
      return;
    }

    // ---- gravity + integrate -----------------------------------------------
    this.vel.y -= P.GRAVITY * dt;
    const wasAirborne = !this.grounded;
    const fallSpeed = -this.vel.y;
    const preY = this.pos.y;                  // for the step-up smoothing below
    _preX = this.pos.x; _preZ = this.pos.z;   // kept for the wall back-out below

    // ---- horizontal collision, then the ground clamp ------------------------
    // Order matters: colliders push you sideways, terrain owns Y. Terrain is analytic and
    // clamped, so tunnelling through the ground is not representable.
    //
    // resolveCapsule IS THE MOVER. It integrates internally (collision.js: `dx = vel.x * dt`,
    // sweeps from pos, writes pos), which is what CONTRACT.md line 174 specifies. This file
    // used to integrate first and then hand the already-moved pos to the solver, so every
    // horizontal step travelled 2 * vel * dt: WALK 4.35 played as 8.7, SPRINT as 13.2,
    // tac-sprint as 18.4, and every feel number lifted from VIGIL was wrong by exactly 2x
    // while looking superficially fine. Only integrate here when there is no solver.
    //
    // AND IT ALSO ANSWERS `grounded`. resolveCapsule finds the support under the feet,
    // puts the feet on it and reports the flag (collision.js:978 and :1017). This file used
    // to throw that answer away and re-derive the ground from terrain.heightAt alone, so a
    // body standing on a collider top — the filling-station canopy, the shop roof, the crate
    // stair — was metres above terrain, read as AIRBORNE, ran the air branch (no friction,
    // AIR_CAP, no jump) and coasted off the edge. Measured on the shipped tree: canopy
    // centre grounded=false, 1.40 m/s still on release, never stopped in 10 s, drift 4.51 m,
    // FELL at 3.1 s, where the terrain control stopped in 0.12 s and drifted 0.23 m.
    let solverFloor = -Infinity;
    if (col && col.resolveCapsule) {
      const r = col.resolveCapsule(this.pos, this.vel, P.RADIUS, this.bodyHeight, dt);
      if (r) {
        if (r.pos && r.pos !== this.pos) this.pos.copy(r.pos);
        if (r.recovered) { this.vel.x = 0; this.vel.z = 0; }
        if (r.grounded) solverFloor = this.pos.y;
      }
    } else {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.pos.y += this.vel.y * dt;
    }

    const terr = this._terrain;
    let g = terr ? terr.heightAt(this.pos.x, this.pos.z) : 0;

    // A WALL IS NOT A SLOPE. Lifted straight, this clamp snaps you to heightAt() however far
    // above you it is, which teleports the body up any cliff and makes the mantle pointless.
    // Back out to where we started the step instead, and let the mantle be the way over.
    // At M0 amplitudes (CFG.world.height: 35 m @ 0.0022, 6 @ 0.011, 1.2 @ 0.055) terrain
    // tops out near 35 deg, which is ~0.05 m of rise per step at walk pace - so this branch
    // never fires on open ground and only ever catches a genuine step.
    if (g - this.pos.y > P.STEP_UP && this.vel.y <= 0.001) {
      this.pos.x = _preX; this.pos.z = _preZ;
      const gBack = terr ? terr.heightAt(this.pos.x, this.pos.z) : 0;
      // Only kill the run if backing out actually cleared it. If we were already buried
      // (spawn inside a hill, a chunk that rebuilt under us) fall through and recover
      // upward: being under the world is never an acceptable resting state.
      if (gBack - this.pos.y <= P.STEP_UP) { this.vel.x = 0; this.vel.z = 0; }
      g = gBack;
      // We just moved back to where the step started, so the solver's floor was measured at
      // an (x, z) the body no longer occupies. Drop it rather than stand on a stale answer.
      solverFloor = -Infinity;
    }

    // THE FLOOR IS WHICHEVER IS HIGHER: the terrain field, or the collider top the solver
    // actually put the feet on. Only a floor ABOVE the terrain here can be a collider — the
    // case heightAt cannot see — so everywhere else this is `g` and nothing changed.
    const floorIsCollider = solverFloor > g + COLLIDER_FLOOR_EPS;
    const floorY = floorIsCollider ? solverFloor : g;

    if (this.pos.y <= floorY + (this.vel.y <= 0 ? STICK : 0) && this.vel.y <= 0.001) {
      this.pos.y = floorY;
      // Ground state is committed BEFORE the landing beat, because the beat can start a
      // slide (drop-roll) and _startSlide() refuses while the body still reads as airborne.
      this.vel.y = 0;
      this.grounded = true;
      this.sinceGround = 0;
      this.holdFling = false;                 // ROUND 13: a fling that caught nothing has landed
      if (wasAirborne && fallSpeed > LAND_MIN_SPEED) {
        this._land(fallSpeed);
      } else if (!wasAirborne && (floorIsCollider || this.floorWasCollider)) {
        // THE STEP-UP JOLT (round 6, lane E; NEXT.md section 3). A grounded body whose floor
        // moved by more than a terrain frame's worth — the solver stepping the feet onto a
        // 0.30 m kerb, or off it — used to move the EYE by that much in one frame: measured
        // 16.5 m/s up onto a 0.30 m crate and 19.5 m/s off it at walk, against a landing
        // spring whose hardest excursion is a few m/s. The feet still move at once (the solver
        // is right about where the body is); the eye is held back by the same amount on its
        // spring and rises through it, so a kerb reads as a step and not as a teleport.
        // Only when the step is ON or OFF a collider top: on terrain the feet follow the
        // ground however steep it is, and the eye follows the feet (repair 1: tac-sprint down
        // the rim's 39 deg slope moved the feet 0.105 m a frame and the eye rode 0.21 m high).
        const dy = this.pos.y - preY;
        if (dy > STEP_SMOOTH_MIN || dy < -STEP_SMOOTH_MIN) this.eyeSpring.value -= dy;
      }
      this.floorWasCollider = floorIsCollider;
    } else {
      this.floorWasCollider = false;
      this.grounded = this.pos.y <= floorY + 0.02 && this.vel.y <= 0;
      this.sinceGround += dt;
      // The under-terrain rescue stays on `g`: being below the TERRAIN is the unacceptable
      // state, and a collider top is never the thing you have to be pushed up out of.
      if (!this.grounded && this.pos.y < g) {
        this.pos.y = g; this.vel.y = Math.max(0, this.vel.y);
        this.grounded = true; this.sinceGround = 0;
      }
    }
    if (this.sliding) {
      if (this.grounded) this.slideAirT = 0;
      else {
        this.slideAirT += dt;
        // Ordinary VIGIL slides still stop the instant the feet leave support. Downhill
        // slides tolerate the little ballistic skips produced by real rolling terrain;
        // a genuine drop still ends the verb after 0.30 s.
        if (!this.downhillSliding || this.slideAirT > DOWNHILL_AIR_GRACE) this._endSlide();
      }
    }

    // ---- THE ONE STRIDE CLOCK ----------------------------------------------
    // Camera bob, weapon bob and footstep audio all read bobPhase. Do not add a second.
    const hSpeed = this.speed;
    if (this.grounded && hSpeed > STEP_MIN_SPEED && !this.sliding) {
      const prev = this.bobPhase;
      // stored at half rate: a full stride is half a cycle, so the camera reads phase * 2
      this.bobPhase = (this.bobPhase + TAU * (hSpeed / this.stride) * dt * 0.5) % TAU;
      const half = Math.PI;
      if ((prev < half && this.bobPhase >= half) || (prev > this.bobPhase)) {
        this.stepParity ^= 1;
        _stepPayload.sprint = this.sprinting || this.tacSprinting;
        _stepPayload.tac = this.tacSprinting;
        _stepPayload.crouch = this.crouched;
        _stepPayload.speed = hSpeed;
        _stepPayload.parity = this.stepParity;
        _stepPayload.pos = this.pos;
        this.ctx.bus.emit('player:step', _stepPayload);
        // ...and the footfall is a NOISE, published right here, next to the sound cue and
        // independent of it. Gait order matters: tac beats sprint beats crouch beats walk,
        // the same precedence `stride` uses, so one footfall never claims two volumes.
        const r = this.tacSprinting ? NOISE_TAC
          : this.sprinting ? NOISE_SPRINT
          : this.crouched ? NOISE_CROUCH
          : NOISE_WALK;
        // QUIET branch: 'soft soles' multiplies the footstep radius (x0.6). Landings are
        // deliberately NOT discounted — the node buys you a quieter walk, not a free fall.
        this._emitNoise(r * this._stat('stepLoudMul', 1), 'step');
        if (this.sprinting || this.tacSprinting) this.landSpring.nudge(SPRINT_PULSE);
      }
    }

    this._stepTail(dt, sprintHeld, wantCrouch);
  }

  /** The end of every walking step and of every carried-by-a-climb step: springs, regen, edges, commit. */
  _stepTail(dt, sprintHeld, wantCrouch) {
    stepSpring(this.landSpring, dt);
    stepSpring(this.eyeSpring, dt);

    // ---- regen: slow, and only back to the ceiling. A lit fire is the full heal. -----
    this.sinceHurt += dt;
    this._regen(dt);

    this._edge.jump = this._held('jump');
    this._edge.sprint = sprintHeld;
    this._edge.crouch = wantCrouch;
    this._edge.tacsprint = this._held('tacsprint');

    this._commit();
  }

  /**
   * The landing beat: the dip, the event, the noise, the damage. One place, so a climb that
   * ends on a roof lands the way a drop onto it does — softly, through the same spring and
   * the same bus event — and never through a second copy of the rule.
   */
  _land(fallSpeed) {
    const dip = clamp(fallSpeed * LAND_DIP_GAIN, 0, LAND_DIP_MAX);
    this.landSpring.nudge(-dip * LAND_DIP_IMPULSE);
    _landPayload.speed = fallSpeed; _landPayload.pos = this.pos;
    this.ctx.bus.emit('player:land', _landPayload);
    // A landing is a NOISE whether or not the speakers are working. Scaled by how hard
    // it was, so dropping off a kerb is not the same broadcast as dropping off a roof.
    this._emitNoise(
      lerp(NOISE_LAND_MIN, NOISE_LAND_MAX, clamp01(fallSpeed / FALL_FREE)), 'land');
    // ~5.8 m is free; stepping off something tall stings without reading as a death
    // sentence for one slip. [vigil]
    if (fallSpeed > FALL_FREE) {
      // LEGS / drop-roll: with the node owned, a fall that would have hurt costs
      // nothing IF you were holding crouch when you touched down — and the speed you
      // arrived with carries on into a slide instead of being eaten by the floor.
      // It is a decision made in the air, not a passive damage reduction, which is
      // why it is gated on the held input and not merely on owning the node.
      if (this.crouchHeld && this._stat('dropRoll', 0) > 0) {
        this.slideCooldown = 0;       // a roll is never refused by the slide cooldown
        this._startSlide();           // no-op below entrySpeed: a straight drop lands soft
      } else {
        this.hurt((fallSpeed - FALL_FREE) * FALL_HP_PER, null);
      }
    }
  }

  /**
   * Slow regen back to the ceiling and no further — a lit fire is still the only full heal.
   * BODY: 'second wind' lifts the ceiling 40 -> 70. Read at use, one place, so the carried
   * branch and the walking branch can never disagree about how much health comes back.
   */
  _regen(dt) {
    // The ceiling is a PROPORTION of the body: 40 of 100 stays 40 of 100 when 'hpMax' lifts
    // the maximum to 130, so 'second wind' (70) and a bigger body compound instead of one
    // silently capping the other.
    const ceiling = this._stat('regenCeiling', P.health.regenCeiling) * (this.hpMax / P.health.max);
    if (this.sinceHurt > P.health.regenDelay && this.hp > 0 && this.hp < ceiling) {
      this.hp = Math.min(ceiling, this.hp + P.health.regenRate * dt);
    }
  }

  /**
   * Publish a `noise` on the bus at the body's feet. INTEGRATOR DECISION 2: this file, not
   * the audio lane, is the emitter for footfall and landing, because the audio lane returns
   * early whenever there is no Web Audio and the verb chain crouch -> quiet -> unseen must
   * survive a muted browser and a headless gate.
   *
   * `source` is never 'enemy', so enemies.js's own filter (enemies.js:216) passes it through
   * to hear(), and the director reads it for ctx.shared.noise. Module scratch, rewritten in
   * place; every listener reads it synchronously.
   */
  _emitNoise(radius, source) {
    if (!(radius > 0)) return;
    // ROUND 7 (lane G): the 'noiseRadius' hook, which nodes.js has declared since round 6 with
    // `at: 'player/controller.js the footstep noise emit'` and which nothing ever ran. quiet_1
    // "Soft Step" and quiet_2 "Cold Barrel" both key on the SOURCE string. With no node owned
    // the reduce returns the radius untouched, so a fresh save measures what it always did.
    const pr = this._sys ? this._sys('progress') : (this.ctx.systems && this.ctx.systems.get('progress'));
    if (pr && typeof pr.perk === 'function') radius = pr.perk('noiseRadius', radius, source);
    if (!(radius > 0)) return;
    _noisePayload.x = this.pos.x;
    _noisePayload.z = this.pos.z;
    _noisePayload.radius = radius;
    _noisePayload.source = source;
    this.ctx.bus.emit('noise', _noisePayload);
  }

  _commit() {
    this.currPos.copy(this.pos);
    this.currYaw = this.yaw;
    this.currEyeY = this.eyeY;
  }

  // ---------------------------------------------------------------- movement parts
  _speedCap(adsT) {
    // 'speedMul' (round 6, lane G registers it): Alex, "things that work to make you faster".
    // It multiplies WALK, SPRINT and TAC and nothing else — the crouch, the ADS walk, the
    // slide and the air cap are untouched, so a faster body still has a quiet gait and a
    // steady aim. Absent, it is exactly 1 and every number here is the one he played.
    const mul = this._stat('speedMul', 1);
    if (this.tacSprinting) return P.tacSprint.speed * mul;
    let cap = this.crouched ? P.CROUCH : this.sprinting ? P.SPRINT * mul : P.WALK * mul;
    if (adsT > 0.5) cap = this.crouched ? CROUCH_ADS : P.ADS_WALK;
    return cap;
  }

  // Quake-with-snap. Friction runs at 0.55x while you are pushing a direction, so the body
  // keeps its speed through a turn but still parks instantly when you let go. [COMBAT_FEEL §2.1]
  _stepGround(dt, hasInput, adsT) {
    const cap = this._speedCap(adsT);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const fr = P.FRICTION * (hasInput ? P.FRICTION_INPUT_MUL : 1);
    let ns = Math.max(0, sp - sp * fr * dt);
    // The snap is what makes stopping feel like a decision rather than a skid.
    if (!hasInput && ns < 1.2) ns = Math.max(0, ns - P.STOP_SNAP * dt);
    if (sp > 0.001) { this.vel.x *= ns / sp; this.vel.z *= ns / sp; }
    if (hasInput) {
      const cur = this.vel.x * _wish.x + this.vel.z * _wish.z;
      const add = Math.min(P.GROUND_ACCEL * dt, Math.max(0, cap - cur));
      this.vel.x += _wish.x * add;
      this.vel.z += _wish.z * add;
      const sp2 = Math.hypot(this.vel.x, this.vel.z);
      if (sp2 > cap) { this.vel.x *= cap / sp2; this.vel.z *= cap / sp2; }
    }
  }

  _stepSlide(dt, hasInput) {
    this.slideT += dt;
    const fr = SLIDE_FRIC_A + SLIDE_FRIC_B * this.slideT;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    let grade = 0, dragScale = 1;
    if (this.downhillSliding && sp > 0.01) {
      grade = this._downhillAlong(this.vel.x / sp, this.vel.z / sp);
      const relief = clamp01((grade - DOWNHILL_SLIDE_GRADE)
        / (DOWNHILL_FULL_GRADE - DOWNHILL_SLIDE_GRADE));
      dragScale = lerp(DOWNHILL_DRAG_HI, DOWNHILL_DRAG_LO, relief);
    }
    const ns = Math.max(0, sp
      - fr * sp * dt * SLIDE_FRIC_MUL * dragScale
      - fr * dt * dragScale);
    if (sp > 0.01) { this.vel.x *= ns / sp; this.vel.z *= ns / sp; }
    if (hasInput) {
      // Steering only: +-38 deg/s, zero acceleration. A slide is a commitment.
      const want = Math.atan2(-_wish.x, -_wish.z);
      const cur = Math.atan2(-this.vel.x, -this.vel.z);
      let d = want - cur;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const turn = clamp(d, -SLIDE_STEER * dt, SLIDE_STEER * dt);
      const cs = Math.cos(turn), sn = Math.sin(turn);
      const vx = this.vel.x * cs - this.vel.z * sn;
      const vz = this.vel.x * sn + this.vel.z * cs;
      this.vel.x = vx; this.vel.z = vz;
    }

    // The horizontal part of the unit terrain normal points straight downhill. Gravity's
    // projection through it supplies the missing acceleration; the existing slide cap is
    // still absolute, so this cannot become a speed exploit or a bunny-hop feeder.
    if (this.downhillSliding && grade > 0) {
      this.vel.x += _groundNormal.x * P.GRAVITY * dt;
      this.vel.z += _groundNormal.z * P.GRAVITY * dt;
      const assisted = Math.hypot(this.vel.x, this.vel.z);
      if (assisted > P.slide.cap) {
        this.vel.x *= P.slide.cap / assisted;
        this.vel.z *= P.slide.cap / assisted;
      }
    }

    const finalSpeed = Math.hypot(this.vel.x, this.vel.z);
    const descending = this.downhillSliding && this.crouchHeld
      && grade >= DOWNHILL_SLIDE_GRADE * 0.5;
    // Crouch remains the descent verb for as long as the ground is genuinely falling away.
    // The instant it flattens or the player turns across/uphill, the original 0.85 s limit
    // wins (and usually expires immediately if this was a long hill).
    const timeLimit = descending ? Infinity : P.slide.time;
    if (this.slideT >= timeLimit || finalSpeed < SLIDE_EXIT_SPEED) this._endSlide();
  }

  _startSlide(downhillGrade = 0) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const downhill = downhillGrade >= DOWNHILL_SLIDE_GRADE;
    const entrySpeed = downhill ? DOWNHILL_SLIDE_ENTRY : P.slide.entrySpeed;
    if (hs < entrySpeed || this.slideCooldown > 0 || !this.grounded) return;
    this.sliding = true;
    this.downhillSliding = downhill;
    this.slideAirT = 0;
    this.slideT = 0;
    this.slideDir.set(this.vel.x, 0, this.vel.z).normalize();
    const s = Math.min(hs * P.slide.boost, P.slide.cap);
    this.vel.x = this.slideDir.x * s;
    this.vel.z = this.slideDir.z * s;
    // The 0.09 m eye overshoot IS the feeling of the slide. The impulse itself is fired in
    // step(), when the eye reaches the bottom of its travel - see the note there.
    this.eyeSpring.set(0);
    this._slideDipped = false;
    // Tac-sprint ends here but its cooldown starts, so slide-cancelling is not free speed.
    if (this.tacSprinting) { this.tacSprinting = false; this.tacCooldown = P.tacSprint.cooldown; }
  }

  _endSlide() {
    if (!this.sliding) return;
    this.sliding = false;
    this.downhillSliding = false;
    this.slideAirT = 0;
    this.slideCooldown = SLIDE_COOLDOWN;
  }

  /** Signed downhill grade along a unit XZ direction. Terrain normal writes into module
   * scratch, so both the fixed step and a long descent remain allocation-free. Collider
   * tops deliberately read as flat: terrain far below a roof cannot pull the body sideways. */
  _downhillAlong(dx, dz) {
    const terr = this._terrain;
    if (!terr || typeof terr.normalAt !== 'function' || this.floorWasCollider) return 0;
    terr.normalAt(this.pos.x, this.pos.z, _groundNormal);
    return dx * _groundNormal.x + dz * _groundNormal.z;
  }

  _tryJump() {
    if (this.sinceGround > P.COYOTE) return false;
    this.vel.y = P.JUMP;
    this.grounded = false;
    this.sinceGround = P.COYOTE + 1;
    if (this.sliding) {
      // A voluntary jump ALWAYS ends the downhill variant. Its short air grace exists only
      // for terrain falling away under the feet; leaving this flag alive through Space let
      // _stepSlide project gravity into horizontal speed while the player was airborne.
      // Ordinary VIGIL slides retain their authored 0.30 s cancel gate.
      const endDownhill = this.downhillSliding;
      if (this.slideT > 0.30) {
        // LEGS: 'clean break' takes the cancel from 0.85 to 1.0 — slide-cancelling stops
        // costing anything and becomes a real movement option rather than a compromise.
        const keep = this._stat('slideCancelKeep', SLIDE_CANCEL_KEEP);
        this.vel.x *= keep;
        this.vel.z *= keep;
      }
      if (endDownhill || this.slideT > 0.30) this._endSlide();
    }
    return true;
  }

  /**
   * A deliberate Space climb: camera-facing centre, then the nearer side of a small lateral
   * fan, then the other side, and finally the exact movement bearing when it is genuinely
   * different. `_wish` is restored before returning because ground/air movement still owns
   * that vector for the rest of the fixed step. No allocations, and no widened passive grab.
   */
  _trySpaceClimb(hasInput) {
    if (this.spaceClimbIntent <= 0 || this.mantleCooldown > 0
        || this.climb !== CLIMB_NONE || this.carried) return false;

    const moveX = _wish.x, moveZ = _wish.z;
    const side = hasInput && moveX * _right.x + moveZ * _right.z > 0 ? 1 : -1;
    const horizontalSpeed = Math.hypot(this.vel.x, this.vel.z);
    const freshRunningJump = this.grounded && this.jumpBuffered > 0
      && horizontalSpeed > P.WALK + 0.05;
    const airborneFanReady = SPACE_CLIMB_INTENT_S - this.spaceClimbIntent
      >= SPACE_CLIMB_FAN_DELAY_S;
    const allowFan = !freshRunningJump && (this.grounded || airborneFanReady);

    _wish.copy(_fwd);
    this._tryClimb(true);
    let caught = this.climb !== CLIMB_NONE || this.mantleCooldown > 0;

    if (!caught && allowFan) {
      _wish.copy(_fwd).addScaledVector(_right, SPACE_CLIMB_FAN * side).normalize();
      this._tryClimb(true);
      caught = this.climb !== CLIMB_NONE || this.mantleCooldown > 0;
    }
    if (!caught && allowFan) {
      _wish.copy(_fwd).addScaledVector(_right, -SPACE_CLIMB_FAN * side).normalize();
      this._tryClimb(true);
      caught = this.climb !== CLIMB_NONE || this.mantleCooldown > 0;
    }

    // A diagonal/back/strafe input may honestly point at a second ledge. Do not repeat almost
    // the same ray when movement is within the facing fan: centre/left/right already covered it.
    const moveDotFacing = moveX * _fwd.x + moveZ * _fwd.z;
    if (!caught && hasInput && moveDotFacing < 0.98) {
      _wish.set(moveX, 0, moveZ);
      this._tryClimb(true);
      caught = this.climb !== CLIMB_NONE || this.mantleCooldown > 0;
    }

    // ROUND 13: THE FLING. Landed from a climb with Space still held, nothing within reach,
    // but a lip above reach and inside HOLD.flingMaxRise straight ahead: one jump at it, with
    // the hands' band raised for the catch at the apex. Once per hold — release to re-arm —
    // and never on open ground: with no lip sighted nothing happens (the hold is not a jump).
    let flung = false;
    if (!caught && this.holdChain && this.grounded && !this.holdSpent && this.mantleCooldown <= 0) {
      _wish.copy(_fwd);
      if (this._flingTarget() !== null) { this._fling(); flung = true; }
    }

    _wish.set(moveX, 0, moveZ);
    if (caught) {
      this.spaceClimbIntent = 0;
      this.jumpBuffered = -1;
    }
    return caught || flung;
  }

  /** ROUND 13: the fling itself — one jump at a lip the hands will reach at the apex. */
  _fling() {
    this.vel.y = P.JUMP;
    this.vel.x += _fwd.x * HOLD_FLING_CARRY;
    this.vel.z += _fwd.z * HOLD_FLING_CARRY;
    this.grounded = false;
    this.sinceGround = P.COYOTE + 1;
    this.holdFling = true;
    this.holdSpent = true;
    this.holdChain = false;
    this.spaceClimbIntent = HOLD.intentS;
    this.jumpBuffered = -1;
    this._endSlide();
  }

  /**
   * ROUND 13: a lip the fling can reach — above the mantle's reach, inside the fling band,
   * along the facing (`_wish` is _fwd here), at the three probe leads, with a body's worth of
   * crouched headroom over it. The same ledgeHeight as every other climb, so trunks, posts,
   * poles and round tops stay refused.
   */
  _flingTarget() {
    const col = this._collision;
    if (!col || !col.ledgeHeight) return null;
    const reach = this._stat('mantleReach', P.mantle.reach);
    const lead1 = P.RADIUS + MANTLE_LEAD, lead2 = lead1 + MANTLE_LEAD2, lead3 = lead2 + SPACE_CLIMB_EXTRA;
    let best = null;
    for (let k = 0; k < 3; k++) {
      const lead = k === 0 ? lead1 : (k === 1 ? lead2 : lead3);
      const px = this.pos.x + _wish.x * lead, pz = this.pos.z + _wish.z * lead;
      const top = col.ledgeHeight(px, pz, this.pos.y, P.RADIUS, HOLD.flingMaxRise);
      if (top === null) continue;
      const rise = top - this.pos.y;
      if (rise <= reach || rise > HOLD.flingMaxRise) continue;
      if (col.fits && !col.fits(px, pz, top, P.RADIUS, P.CROUCH_H)) continue;
      if (best === null || top > best) best = top;
    }
    return best;
  }

  // Mantle: DUSKFALL controller.js:289-330, re-expressed against the analytic terrain field
  // instead of DUSKFALL's platform discs. Reach, clearance, cooldown and the ledge tiers all
  // come from CFG.player.mantle.
  //
  // AIM IS RETAINED THROUGH THE POP. We never touch yaw or pitch here; the camera owns them
  // and nothing in this file writes them. That is the FLARE rule, and it is the difference
  // between a vault and a cutscene.
  /**
   * ROUND 6, lane E: the probe now sees the TERRAIN, the COLLIDER FIELD (collision.ledgeHeight,
   * the contract in BRIEF-COMMON) and the CAR ROOF (car.roofHeightAt, lane H's contract,
   * guarded). Two movement probes for colliders: one shell ahead as before, and one radius
   * further, because a lip you are running at is not always exactly one shell away. A grounded
   * explicit Space press gets one third probe 0.50 m farther; it is intentional reach, never
   * automatic magnetism. The terrain keeps the single probe so the eight places in the county
   * where DUSKFALL's pop can fire (tests/collision.mjs) are exactly the eight they were.
   *
   * Every gate the pop had is kept: velocity into the lip, somewhere to stand on top, the
   * cooldown, and aim untouched. What changed is what happens for a collider: the pop cannot
   * top a wall (its inward carry is projected out by the wall it is climbing — measured), so
   * a collider ledge is climbed kinematically by _startPull, and a lip caught mid-air in the
   * hands' band is a GRAB (hang, then pull), and a thin waist-high thing hit at a sprint is a
   * VAULT.
   */
  _tryClimb(explicitJump = false) {
    if (this.mantleCooldown > 0 || this.climb !== CLIMB_NONE || this.carried) return;
    // A let-go grab refuses every climb until the feet are back on something: without this,
    // crouch + forward re-mantled the very lip you just let go of, every 0.35 s, for ever.
    if (this.climbRefuse) { if (this.grounded) this.climbRefuse = false; else return; }
    const M = P.mantle;
    const terr = this._terrain;
    if (!terr) return;
    const col = this._collision;
    const sees = !!(col && col.ledgeHeight && col.fits);

    // LEGS: 'long arms' lifts the reach 2.90 -> 3.60, which is the whole node — a wall that
    // refused you before now answers. Read at use so buying it changes the world instantly.
    const reach = this._stat('mantleReach', M.reach);

    // Intent: never yank someone who is moving away from the lip they are facing.
    // (DUSKFALL also tested wishInto because it probed a platform CENTRE that need not lie
    // along the wish direction; our probe is taken along the wish direction itself, so that
    // second test is identically true here and is left out rather than faked.)
    const velInto = this.vel.x * _wish.x + this.vel.z * _wish.z;
    if (velInto < MANTLE_VEL_AWAY) return;

    // Probe one body-shell ahead of the wish direction. That is the lip you are walking into.
    const lead1 = P.RADIUS + MANTLE_LEAD;
    const p1x = this.pos.x + _wish.x * lead1, p1z = this.pos.z + _wish.z * lead1;
    const lead2 = lead1 + MANTLE_LEAD2;
    const p2x = this.pos.x + _wish.x * lead2, p2z = this.pos.z + _wish.z * lead2;
    // The farther Space probe is for a deliberate standing/walking climb, not the first
    // frame of a running jump. Letting a sprint-speed Space press use it made the controller
    // pull onto an intermediate crate before the jump existed, stealing the airborne grab.
    const horizontalSpeed = Math.hypot(this.vel.x, this.vel.z);
    // ROUND 13: a held-Space landing re-probe keeps the far lead whatever speed it carries
    // (the speed gate protects a fresh running jump's airborne grab, not a chain).
    const allowSpaceReach = explicitJump && this.grounded
      && (this.holdChain || (!this.sprinting && !this.tacSprinting && horizontalSpeed <= P.WALK + 0.05));
    const lead3 = lead2 + SPACE_CLIMB_EXTRA;
    const p3x = this.pos.x + _wish.x * lead3, p3z = this.pos.z + _wish.z * lead3;

    // ---- 1. THE GRAB: airborne, moving into a lip the hands can reach. ----------------
    // The band is on the EYE: eyeY - 0.40 to eyeY + 0.50 (+ what 'Reach' adds). A wall
    // brushed mid-air whose top is above the band, or that has no top to stand on, or no
    // headroom over it, is a wall and not a hold: ledgeHeight refuses it, and the body falls.
    // "Moving into" is the HELD direction (the probe runs along the wish), not the velocity:
    // a body that jumped at a wall is pressed against it at the apex with its inward
    // velocity already projected out by the sweep, and that is exactly the moment the hands
    // close on the lip. A stricter gate on velocity refused every wall jump (measured).
    //
    // ASK FROM THE REAL FEET (repair 1). ledgeHeight admits an UNFLAGGED top only within
    // STEP_UP of the feet it is given (a kerb you can step onto you can stand on). The first
    // build passed the BOTTOM OF THE HANDS' BAND as the feet, so every unflagged top inside
    // [eye - 0.40, eye + 0.20] was a ledge to the grab: tree trunks (2.2-3.4 m circles with no
    // flag), lamp posts, wrecks. Measured: 16 of 40 trees near the suite's strip were grabbed
    // and the body left standing on the trunk collider inside the foliage. The feet go in as
    // the feet, the reach runs to the top of the band, and only a top INSIDE the band is a
    // hold — an unflagged top is then admitted only within STEP_UP of the feet, which is
    // under the hands and never a grab.
    if (sees && !this.grounded) {
      const lo = this.pos.y + P.EYE - CL.handsLo;
      // ROUND 13: the band's top is raised only while a FLING is in the air; tapped and
      // passive grabs keep 0.50 (tests/climb.mjs pins them).
      const hi = this.pos.y + P.EYE + (this.holdFling ? HOLD.handsHi : CL.handsHi) + (reach - M.reach);
      let top = col.ledgeHeight(p1x, p1z, this.pos.y, P.RADIUS, hi - this.pos.y);
      let px = p1x, pz = p1z;
      if (top !== null && top < lo) top = null;
      if (top === null) {
        top = col.ledgeHeight(p2x, p2z, this.pos.y, P.RADIUS, hi - this.pos.y); px = p2x; pz = p2z;
        if (top !== null && top < lo) top = null;
      }
      if (top === null) { top = this._roofAt(p1x, p1z, lo, hi - lo); px = p1x; pz = p1z; }
      if (top !== null) { this._startGrab(top, px, pz); return; }
    }

    // ---- 2. THE VAULT: sprinting into a thin, waist-high thing with a clear far side. --
    // 1 = vaulting from this frame; 2 = a vault target sighted but still out of range, which
    // holds the mantle off it (the mantle's second probe reaches further than a vault wants
    // to start from, and won the race to every fence by a few frames — measured).
    if (!explicitJump && sees && this.grounded
      && (this.sprinting || this.tacSprinting) && velInto > P.WALK) {
      if (this._tryVault(col, lead1)) return;
    }

    // ---- 3. THE MANTLE: the highest of terrain, collider top and car roof at the probe. -
    const tTop = terr.heightAt(p1x, p1z);
    let cTop = -Infinity, cx = p1x, cz = p1z;
    if (sees) {
      const a = col.ledgeHeight(p1x, p1z, this.pos.y, P.RADIUS, reach);
      if (a !== null) cTop = a;
      else {
        const b = col.ledgeHeight(p2x, p2z, this.pos.y, P.RADIUS, reach);
        if (b !== null) { cTop = b; cx = p2x; cz = p2z; }
        else if (allowSpaceReach) {
          const c = col.ledgeHeight(p3x, p3z, this.pos.y, P.RADIUS, reach);
          if (c !== null) { cTop = c; cx = p3x; cz = p3z; }
        }
      }
    }
    const rTop = this._roofAt(p1x, p1z, this.pos.y, reach);
    if (rTop !== null && rTop > cTop) { cTop = rTop; cx = p1x; cz = p1z; }

    if (tTop >= cTop) {
      // A TERRAIN lip: DUSKFALL's pop, exactly as it was.
      const rise = tTop - this.pos.y;
      // Below the step-up height the body walks over it; above the reach nothing can be done.
      // The two tiers are the ledges the world is authored to: a kerb and a car roof.
      if (rise <= Math.max(P.STEP_UP, M.tiers[0]) || rise > reach) return;
      // There has to be somewhere to land: a body's worth of clear space on top.
      if (col && col.canOccupy && !col.canOccupy(p1x, p1z, P.RADIUS, P.CROUCH_H)) return;
      // Math.max so a mantle never ROBS an already-faster ascent - brushing a lip mid-jump
      // only ever helps. [duskfall:320]
      this.vel.y = Math.max(this.vel.y, Math.sqrt(2 * P.GRAVITY * (rise + M.clearance)));
      this.vel.x += _wish.x * MANTLE_IN;
      this.vel.z += _wish.z * MANTLE_IN;
      this.mantleCooldown = CLIMB_CHAIN_COOLDOWN;
      this.grounded = false;
      this.sinceGround = P.COYOTE + 1;
      this._endSlide();
      return;
    }

    // A COLLIDER (or car roof) top. Anything under MANTLE_MIN_RISE the solver already steps
    // onto — the crate stair, a kerb — and a step is not a climb. AIRBORNE there are no legs
    // to push with: a top at or above the hands' band is the grab's (section 1, which refused
    // it this frame), and only a top BELOW the hands is hopped onto mid-jump. Without this the
    // full 2.90 m reach applied in the air and the pull fired on every lip a frame before the
    // hands could have closed on it — the grab never happened once (measured).
    const rise = cTop - this.pos.y;
    if (rise < MANTLE_MIN_RISE || rise > reach) return;
    if (!this.grounded && rise >= P.EYE - CL.handsLo) return;
    this._startPull(cTop, cx, cz, this.pos.x, this.pos.y, this.pos.z,
      CL.pullMinS + (CL.pullMaxS - CL.pullMinS) * clamp01((rise - 1.0) / 1.9), 'mantle');
  }

  /** The car roof as a ledge (lane H's contract: car.roofHeightAt(x, z) -> number | null). Guarded. */
  _roofAt(x, z, feetY, maxRise) {
    const sys = this.ctx.systems;
    const car = sys ? sys.get('car') : null;
    if (!car || typeof car.roofHeightAt !== 'function') return null;
    const h = car.roofHeightAt(x, z);
    if (typeof h !== 'number' || h !== h) return null;
    if (h <= feetY + 0.001 || h > feetY + maxRise) return null;
    const col = this._collision;
    if (col && col.fits && !col.fits(x, z, h, P.RADIUS, P.CROUCH_H)) return null;
    return h;
  }

  /** Is `top` still the ledge at (x, z)? Used to push the landing a little further onto it. */
  _topAt(x, z, top) {
    const col = this._collision;
    if (col && col.ledgeHeight) {
      const h = col.ledgeHeight(x, z, top - 0.10, P.RADIUS, 0.20);
      if (h !== null && Math.abs(h - top) < 0.02) return true;
    }
    const r = this._roofAt(x, z, top - 0.10, 0.20);
    return r !== null && Math.abs(r - top) < 0.02;
  }

  /**
   * THE VAULT. Sprinting into a 0.60-1.20 m top that is thin along the run (a fence, a wreck's
   * hood, a low wall), with somewhere to land on the far side within a step of the feet and
   * room to stand there: over it, no jump press, climb.vault.keep of the speed kept. Never
   * into a wall: the far side is tested for a standing body just past the face AND at the
   * landing. The obstacle need not be standable — a vault never stands on it — but a roof is
   * not a fence: past climb.vault.maxThick the top is still there and this returns false, and
   * the mantle takes it instead.
   */
  _tryVault(col, lead1) {
    const V = CL.vault;
    const feet = this.pos.y;
    const lo = feet + V.lo - 0.01, span = V.hi - V.lo + 0.01;
    // Sight the obstacle: the first probe from one shell ahead that sees a top in the band.
    // The sighting reaches as far as the mantle's second probe, or the mantle would win the
    // race to a fence by a few frames (measured: a 0.12 m fence was pulled onto, not vaulted).
    let top = null, d0 = 0;
    for (let k = 0; k <= VAULT_SIGHT && top === null; k++) {
      d0 = lead1 + VAULT_SCAN * k;
      top = col.ledgeHeight(this.pos.x + _wish.x * d0, this.pos.z + _wish.z * d0, lo, P.RADIUS, span, true);
    }
    if (top === null) return 0;
    // Walk the probe on along the run until the top is gone: that is the far face, give or
    // take one scan step. Anything still there past maxThick is a roof, not a fence.
    let far = -1;
    for (let k = 1; k <= 9; k++) {
      const d = d0 + VAULT_SCAN * k;
      const t = col.ledgeHeight(this.pos.x + _wish.x * d, this.pos.z + _wish.z * d, lo, P.RADIUS, span, true);
      if (t === null || Math.abs(t - top) > 0.15) { far = d; break; }
    }
    if (far < 0) return 0;
    // The far face lies inside the last scan step. Bisect it three times (to ~3 cm), then
    // take off the footprint inflation the probe sees the top through — without this the
    // landing sat half a metre past the face and a 0.32 s vault took 0.50 (measured).
    let seen = far - VAULT_SCAN, gone = far;
    for (let k = 0; k < 3; k++) {
      const mid = 0.5 * (seen + gone);
      const t = col.ledgeHeight(this.pos.x + _wish.x * mid, this.pos.z + _wish.z * mid, lo, P.RADIUS, span, true);
      if (t === null || Math.abs(t - top) > 0.15) gone = mid; else seen = mid;
    }
    const faceD = 0.5 * (seen + gone) - P.RADIUS * 0.55;
    const landD = faceD + P.RADIUS + VAULT_BEYOND;
    const lx = this.pos.x + _wish.x * landD, lz = this.pos.z + _wish.z * landD;
    const support = col.supportHeight ? col.supportHeight(lx, lz, feet, P.RADIUS, P.STEP_UP) : feet;
    if (Math.abs(support - feet) > V.lo) return 0;                     // a ditch, or a stack
    if (!col.fits(lx, lz, support, P.RADIUS, P.STAND_H)) return 0;      // a wall behind it
    const nx = this.pos.x + _wish.x * (faceD + P.RADIUS + 0.05), nz = this.pos.z + _wish.z * (faceD + P.RADIUS + 0.05);
    if (!col.fits(nx, nz, support, P.RADIUS, P.STAND_H)) return 0;      // a wall right behind it
    // The near face: the same bisection from the first sighting back toward the body.
    let nearSeen = d0, nearGone = Math.max(P.RADIUS, d0 - VAULT_SCAN);
    for (let k = 0; k < 3; k++) {
      const mid = 0.5 * (nearSeen + nearGone);
      const t = col.ledgeHeight(this.pos.x + _wish.x * mid, this.pos.z + _wish.z * mid, lo, P.RADIUS, span, true);
      if (t === null || Math.abs(t - top) > 0.15) nearGone = mid; else nearSeen = mid;
    }
    const nearD = 0.5 * (nearSeen + nearGone) + P.RADIUS * 0.55;
    // The thickness is face to face, both bisected with the inflation taken off; the coarse
    // scan alone read a 1.2 m hood as 1.85 (0.2 m of inflation each side and a scan step).
    if (faceD - nearD > V.maxThick) return 0;                          // a roof, not a fence
    if (nearD > VAULT_TRIGGER) return 2;                               // sighted; not yet
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const dur = Math.max(V.time, landD / (speed * V.keep));
    this._beginClimb(CLIMB_VAULT, dur, this.pos.x, feet, this.pos.z, lx, support, lz, top, 'vault');
    this.climbSpeed = speed;
    this.eyeSpring.nudge(-this.vaultImpulse);      // the hand plants; the eye dips, then rises over
    return 1;
  }

  /** The grab: catch the lip (a 0.10 s ease to the hang pose against the face), hang, then pull. */
  _startGrab(top, px, pz) {
    const col = this._collision;
    // Find the face: a ray just under the lip, along the wish. The hang pose is one radius
    // short of it. No face (a slab on posts): hang where the hands closed.
    let hx = this.pos.x, hz = this.pos.z;
    if (col && col.raycast) {
      _rayO.x = this.pos.x; _rayO.y = top - 0.30; _rayO.z = this.pos.z;
      _rayD.x = _wish.x; _rayD.y = 0; _rayD.z = _wish.z;
      const hit = col.raycast(_rayO, _rayD, P.RADIUS + MANTLE_LEAD + MANTLE_LEAD2 + 0.5, col.MASK ? col.MASK.SOLID : 1);
      if (hit && hit.hit) {
        const d = Math.max(0, hit.t - P.RADIUS - 0.03);
        hx = this.pos.x + _wish.x * d; hz = this.pos.z + _wish.z * d;
      }
    }
    // The hang pose: the eye under the lip, between a chin-up and full stretch, moved as
    // little as possible from where the hands closed. The feet follow from the eye.
    const eyeHang = clamp(this.pos.y + P.EYE, top - CL.hangEyeBelow[1], top - CL.hangEyeBelow[0]);
    this._beginClimb(CLIMB_HANG, CL.catchS + CL.hangS, this.pos.x, this.pos.y, this.pos.z,
      hx, eyeHang - P.EYE, hz, top, 'grab');
    // where the feet will end, decided now and kept
    this._landingOn(px, pz, top);
    this.climbLX = _landOut.x; this.climbLZ = _landOut.z;
  }

  /**
   * ROUND 13: where the feet come to rest on a top — LAND_IN past the probe point when the
   * whole footprint fits there, a nearer point on a narrow top, the probe point itself as the
   * last resort. Writes _landOut.
   */
  _landingOn(px, pz, top) {
    const col = this._collision;
    for (let i = 0; i < LAND_BACKOFF.length; i++) {
      const lx = px + _wish.x * LAND_BACKOFF[i], lz = pz + _wish.z * LAND_BACKOFF[i];
      if (!this._topAt(lx, lz, top)) continue;
      if (col && col.fits && !col.fits(lx, lz, top, P.RADIUS, P.CROUCH_H)) continue;
      _landOut.x = lx; _landOut.z = lz;
      return true;
    }
    _landOut.x = px; _landOut.z = pz;
    return false;
  }

  /** The pull: from (x0, y0, z0) to standing on `top`, over `dur` seconds. Lift first, then over. */
  _startPull(top, px, pz, x0, y0, z0, dur, kind) {
    this._landingOn(px, pz, top);
    this._beginClimb(CLIMB_PULL, dur, x0, y0, z0, _landOut.x, top, _landOut.z, top, kind);
    this.eyeSpring.nudge(-this.heaveImpulse);     // the heave: a dip, then the rise through it
  }

  _beginClimb(kind, dur, x0, y0, z0, x1, y1, z1, top, name) {
    this.climb = kind;
    this.climbT = 0;
    this.climbDur = dur;
    this.climbX0 = x0; this.climbY0 = y0; this.climbZ0 = z0;
    this.climbX1 = x1; this.climbY1 = y1; this.climbZ1 = z1;
    this.climbDirX = _wish.x; this.climbDirZ = _wish.z;
    this.climbTop = top;
    this.climbSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.sinceGround = P.COYOTE + 1;
    this.jumpBuffered = -1;
    this.holdFling = false;                   // ROUND 13: the hands closed; the fling is over
    this._endSlide();
    if (kind !== CLIMB_VAULT) {
      // A climb interrupts the chase verb the way a slide does, and its cooldown starts.
      this.sprinting = false;
      if (this.tacSprinting) { this.tacSprinting = false; this.tacCooldown = P.tacSprint.cooldown; }
    }
    _climbPayload.kind = name; _climbPayload.top = top;
    _climbPayload.x = x1; _climbPayload.z = z1;
    this.ctx.bus.emit('player:climb', _climbPayload);
  }

  /** The carried body, one fixed step. Aim is never touched here. */
  _stepClimb(dt, hasInput) {
    this.climbT += dt;
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.sinceGround = P.COYOTE + 1;
    this.crouched = false;
    this.slideViewT = damp(this.slideViewT, 0, SLIDE_VIEW_OUT, dt);
    const u = this.climbDur > 0 ? clamp01(this.climbT / this.climbDur) : 1;

    if (this.climb === CLIMB_HANG) {
      // Holding crouch, or pushing away from the lip, lets go.
      const away = hasInput && (_wish.x * this.climbDirX + _wish.z * this.climbDirZ) < -0.5;
      if (this._held('crouch') || away) { this._dropClimb(); return; }
      const c = ease.outQuad(clamp01(this.climbT / CL.catchS));
      this.pos.x = lerp(this.climbX0, this.climbX1, c);
      this.pos.y = lerp(this.climbY0, this.climbY1, c);
      this.pos.z = lerp(this.climbZ0, this.climbZ1, c);
      this.crouchT = damp(this.crouchT, 0, CROUCH_OUT, dt);
      if (u >= 1) {
        // the hang is over: pull from the hang pose to the landing decided at the grab
        this._startPull(this.climbTop, this.climbLX, this.climbLZ, this.pos.x, this.pos.y, this.pos.z, CL.pullS, 'pull');
      }
      return;
    }

    if (this.climb === CLIMB_PULL) {
      // The head goes up first, then the body swings over the lip.
      const lift = ease.inOutQuad(clamp01(u / PULL_LIFT_END));
      const over = ease.inOutQuad(clamp01((u - PULL_OVER_START) / (1 - PULL_OVER_START)));
      this.pos.y = lerp(this.climbY0, this.climbY1, lift);
      this.pos.x = lerp(this.climbX0, this.climbX1, over);
      this.pos.z = lerp(this.climbZ0, this.climbZ1, over);
      this.crouchT = damp(this.crouchT, 0, CROUCH_OUT, dt);
      if (u >= 1) this._endClimb();
      return;
    }

    // THE VAULT: straight across at constant speed, the feet on an arc that clears the top,
    // the legs tucked over it (crouchT) so the eye rides lower than the feet's arc.
    this.pos.x = lerp(this.climbX0, this.climbX1, u);
    this.pos.z = lerp(this.climbZ0, this.climbZ1, u);
    const base = lerp(this.climbY0, this.climbY1, u);
    const hump = Math.max(0, this.climbTop + VAULT_CLEAR - 0.5 * (this.climbY0 + this.climbY1));
    this.pos.y = base + hump * Math.sin(Math.PI * u);
    this.crouchT = damp(this.crouchT, u < 0.65 ? 1 : 0, u < 0.65 ? CROUCH_IN : CROUCH_OUT, dt);
    if (this.tacSprinting) this.tacT += dt;
    if (u >= 1) this._endClimb();
  }

  /** The feet land on the top: a soft landing through the same beat every landing uses. */
  _endClimb() {
    const vault = this.climb === CLIMB_VAULT;
    this.pos.x = this.climbX1; this.pos.y = this.climbY1; this.pos.z = this.climbZ1;
    this.climb = CLIMB_NONE;
    this.grounded = true;
    this.sinceGround = 0;
    // ROUND 13: Space still HELD at the landing chains at once — the re-probe window opens
    // now, the far lead stays on, and the body keeps running speed over the lip. Still no
    // jumpBuffered write: the chain climbs, or flings at a lip it has seen, never hops.
    const held = this._held('jump');
    this.holdChain = held && !vault;
    const out = vault
      ? this.climbSpeed * CL.vault.keep
      : Math.max(this.holdChain ? HOLD.outSpeed : CL.outSpeed, this.climbSpeed * CLIMB_EXIT_KEEP);
    this.vel.x = this.climbDirX * out; this.vel.z = this.climbDirZ * out; this.vel.y = 0;
    this.mantleCooldown = CLIMB_CHAIN_COOLDOWN;
    if (this.climbQueued || this.holdChain) {
      // Start the short window NOW, not when Space was pressed halfway through a long pull.
      // There is deliberately no jumpBuffered write here: this can chain a climb, never hop.
      this.spaceClimbIntent = this.holdChain ? HOLD.chainS : SPACE_CLIMB_INTENT_S;
      this.climbQueued = false;
    }
    this._land(vault ? VAULT_LAND_SPEED : CL.landSpeed);
    // ROUND 13: "keep holding space and the character flings up to the next ledge." On the
    // landing frame itself, with Space still held and this hold's fling unspent, look along
    // the facing for a lip above reach and go for it at once — a narrow top gives no time to
    // wait out the chain cooldown, and the passive mantle takes anything within reach.
    if (this.holdChain && !this.holdSpent) {
      const wx = _wish.x, wz = _wish.z;
      _wish.copy(_fwd);
      const top = this._flingTarget();
      _wish.set(wx, 0, wz);
      if (top !== null) this._fling();
    }
  }

  /** Let go of the lip. Falls from the hang; nothing is climbed again until the feet land. */
  _dropClimb() {
    this.climb = CLIMB_NONE;
    this.climbRefuse = true;
    this.climbQueued = false;
    this.spaceClimbIntent = 0;
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.sinceGround = P.COYOTE + 1;
    this.mantleCooldown = P.mantle.cooldown;
  }

  // ---------------------------------------------------------------- presentation
  /**
   * Interpolated render pose. Simulation only ever touches pos/yaw/eyeY; the camera reads
   * ONLY the render* fields. If alpha is ignored here, the game judders at every refresh
   * rate that is not exactly 60 - which is the bug this whole pattern exists to kill.
   */
  present(alpha) {
    const a = alpha === undefined ? 1 : alpha;
    this.renderPos.x = lerp(this.prevPos.x, this.currPos.x, a);
    this.renderPos.y = lerp(this.prevPos.y, this.currPos.y, a);
    this.renderPos.z = lerp(this.prevPos.z, this.currPos.z, a);
    this.renderEyeY = lerp(this.prevEyeY, this.currEyeY, a);
    // Yaw is mirrored from the camera and can wrap; lerp the short way.
    let d = (this.currYaw - this.prevYaw) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    this.renderYaw = this.prevYaw + d * a;
  }

  /** For window.__CURFEW.state(). */
  state() {
    return {
      pos: this.pos,
      yaw: this.yaw,
      hp: this.hp,
      speed: this.speed,
      grounded: this.grounded,
      crouched: this.crouched,
      sliding: this.sliding,
      downhillSliding: this.downhillSliding,
      sprinting: this.sprinting,
      tacSprinting: this.tacSprinting,
      tacCooldown: this.tacCooldown,
      climb: this.climb,
      hpMax: this.hpMax,
      eyeY: this.eyeY,
      bobPhase: this.bobPhase,
      dead: this.dead,
      deathT: this.deathT,
      carried: this.carried,
      invuln: +this.invuln.toFixed(3),
      invulnMax: this.invulnMax,
    };
  }

  dispose() {}
}

export default PlayerController;
