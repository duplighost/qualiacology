// The rider: (s, x, H) plus a state, resolved against profile.js.
//
// Three rules hold this together, and each one is a direct answer to a bug
// Alex reported in CARVE and IONWAKE (see docs/research/*.md):
//
//   1. SWEPT boundaries, never endpoint checks. CARVE ran resolveSurface()
//      once per frame after integrating and compared end positions, so at
//      speed x could jump clean over the deck without the check ever seeing
//      the crossing. Here the move is substepped against the narrowest zone
//      and every boundary crossing is resolved at the crossing.
//
//   2. ONE pose function. CARVE assigned yaw in five independent places and
//      composed world orientation downstream from a frame that could be
//      stale -- that is "faces weird directions". Here every state writes its
//      intent into one target and riderPose applies it.
//
//   3. A rescue ladder that cannot fail to fire. Safe points stamp
//      continuously with no speed condition, plus a fixed-interval fallback,
//      a stuck timer and a NaN guard underneath.
//
// --- Round 2 -------------------------------------------------------------
// Drift is GONE. Alex played it and cut it: "Fuck drifting, we don't need it.
// the boost meter will be filled by landing tricks." So the trick IS the
// ground economy now, and the crouch-and-pop gesture inherited the commitment
// that used to live in a held drift -- load the board, let it go, spin, and
// land it square.

import {
  ZONE,
  boundariesOf,
  narrowestZone,
  profileAt,
  surfaceHeight,
  surfaceSlope,
  zoneAt,
} from './profile.js';
import { RAIL_EXIT_IMPULSE, railAt, railMouthAt } from './rails.js';

export const RIDER = Object.freeze({
  GROUND: 'ground',
  AIR: 'air',
  GRIND: 'grind',
  // Riding an authored aerial line. Position is the rail's function of s, not
  // the result of integrating against geometry -- which is what lets a rail
  // loop, sweep and invert without any of it being able to clip or wedge.
  RAIL: 'rail',
});
export const RIDER_STATES = Object.freeze(Object.values(RIDER));

// --- The pop --------------------------------------------------------------
// Hold to crouch, release to launch. The load stays, because it gives the pop a
// readable physical gesture, but it peaks quickly: SPACE should feel like a
// spring under the thumb, not a progress bar the player waits on.
export const HOP_MIN_IMPULSE = 19.5;
export const HOP_MAX_IMPULSE = 34;
export const HOP_CHARGE_SECONDS = 0.22;
export const GRAVITY = 46;
export const AIR_STEER_FORCE = 18;
// Trick inputs are commitments, not aircraft controls. One tap adds one legal
// landing unit to a target (180 spin, one body flip, or one board flip), and a
// fast motor finishes it after the player's finger has already moved on. That
// is the Tony-Hawk part of the language: the skill is choosing what fits in the
// air, not releasing a held axis inside a 70 ms landing window.
export const AIR_SPIN_RATE = 15.2;
export const AIR_FLIP_RATE = 13.6;
// A kickflip is the fastest channel because it is a foot flick, not the whole
// body. It completes in roughly a third of a second and can combine with either
// body axis on the same input frame.
export const AIR_ROLL_RATE = 21.5;
export const TRICK_INPUT_DEADZONE = 0.48;
// Dedicated trick keys are one press / one move. A/D is also steering, so its
// airborne hold repeats 180s at a readable cadence after the first tap; that
// preserves fast spin lines without turning a held Q into accidental triples.
export const TRICK_REPEAT_DELAY = 0.34;
export const TRICK_REPEAT_SECONDS = 0.26;
export const TRICK_PREPOP_BUFFER = 0.14;
export const TRICK_QUEUE_LIMIT = 5;

// --- Landing --------------------------------------------------------------
// The board lands clean on any HALF turn, not only a full one. A 180 is a real
// trick that leaves you riding switch, and at the airtime this game has,
// demanding full rotations would make almost every attempt a failure -- which
// is exactly what Alex saw: "you just kind of try one and the player ends up
// facing forward again after hitting the ground at an angle."
//
// And the result is GRADUATED, not pass/fail. Landing dead square pays the
// whole trick; a little off pays less and scrubs a little speed; badly wrong
// costs real speed. That is the cost-benefit he asked for: "you have to
// execute them correctly or you could end up slightly slower."
// Alex: "tricks need to be easier not to bail on".
//
// Measured before this change: across the +/-100ms spread a human's release
// timing actually covers, a spin trick landed 64-68% of the time. A third of
// every attempt bailed, which is why the game felt like it was refusing them.
// 0.85 rad is 69ms of allowed error at AIR_SPIN_RATE. 1.30 was tried first and
// is wrong in the other direction: it lands 100% of that entire sweep, which
// deletes the cost-benefit Alex asked for in the round before this one -- "you
// have to execute them correctly or you could end up slightly slower". 1.05 is
// 85ms and lands about nine in ten. Missing is the exception now instead of the
// coin flip, and it is still possible to miss.
export const LAND_TOLERANCE = 1.05;          // rad of yaw error still landable
export const LAND_PITCH_TOLERANCE = 1.20;
// The board flip is the most forgiving of the three, because it is the fastest
// -- at AIR_ROLL_RATE a board crosses the whole tolerance in well under a tenth
// of a second, so a tolerance as tight as the spin's would make it a coin flip
// rather than a trick.
export const LAND_ROLL_TOLERANCE = 1.45;    // rad of unfinished board flip
export const LAND_SCRUB_MAX = 0.52;
// How far past the tolerance counts as maximally wrong: the distance from the
// edge of the landing window to a quarter turn, which is the worst a landing
// can be. Derived from LAND_TOLERANCE rather than written next to it, so the
// two can never drift apart again.
export const OVERSHOOT_BAND = (Math.PI / 2) / LAND_TOLERANCE - 1;          // worst-case fraction of speed lost
// A blown landing takes your steering away, and with the raised hop it takes it
// away for longer. This is the more legible half of the penalty: a speed scrub
// is a number the player has to infer, whereas losing the line into the next
// corner is something they watch happen.
export const LAND_LOCKOUT_MAX = 0.62;        // worst-case input lockout, seconds
// How long the board takes to settle level under the rider. This is NOT a
// snap: the snap is what made the landing look broken. It is a fast continuous
// settle that reads as the board being stomped flat.
// 0.20 rather than 0.16: the board can be up to a quarter turn from its
// resting angle, and squeezing that into 0.16s crosses 9 rad/s, which is fast
// enough to read as the snap this was built to remove.
export const LAND_SETTLE_CLEAN = 0.20;
export const LAND_SETTLE_DIRTY = 0.46;

// --- The landing assist ---------------------------------------------------
//
// Why this exists, and why it is not more tolerance. The tolerance work assumed
// players mis-time a RELEASE by a hundred milliseconds either way. That is not
// what people do. They hold the spin until they can see the ground and then let
// go late, or never let go at all -- and forgiving that is most of what a Tony
// Hawk game is actually doing for you. Widening the window cannot buy it: the
// window is already 1.05 rad, and at PI/2 the mechanic literally cannot fail,
// which would delete the cost-benefit Alex asked for in the same breath.
//
// So the help is an ASSIST, not a wider target. In the last fraction of a
// second before touchdown the board stops taking rotation input and is drawn
// toward the nearest legal orientation -- but only so far. The budget below is
// what makes this a rescue for a near miss rather than an autopilot: a rider a
// quarter turn out (1.57 rad, the worst a landing can physically be) is still
// well outside the window after the assist has spent everything it has, so
// throwing a trick you cannot finish still costs you.
export const LAND_ASSIST_WINDOW = 0.16;    // seconds before impact it engages
// 0.26 rad, and the number is derived rather than chosen. The worst a landing
// can physically be is a quarter turn of yaw (PI/2 = 1.571) against a window of
// LAND_TOLERANCE (1.05), so the gap the assist could close is 0.52. Setting the
// budget TO that gap makes every landing land -- which is exactly what happened
// on the first attempt here, and the economy gate caught it inside a minute:
// "could not produce a blown landing to measure the penalty with". Half the gap
// rescues a near miss (anything inside 1.31 rad) and leaves the worst case
// comfortably blown, which is the whole point of there being a window at all.
export const LAND_ASSIST_MAX = 0.26;       // rad it may remove, per channel
// And it may not remove it all at once. The first version scaled the pull by
// the size of the error, which meant a big error got a big correction -- 0.164
// rad in a single tick, or 19.7 rad/s, which the soak correctly reported as an
// undeclared orientation jump ("the faces weird directions bug"). An assist
// that snaps is not an assist, it is the snap this catalogue keeps removing.
// Held under AIR_FLIP_RATE so the taper and the pull can never sum past the
// rate the player could already produce themselves.
export const LAND_ASSIST_RATE = 7.0;       // rad/s, the fastest it may correct
// And it is not free. A landing you squared yourself pays full quality; one the
// assist caught pays less, so the ceiling still belongs to timing.
export const LAND_ASSIST_QUALITY_COST = 0.42;

// --- Trick scoring --------------------------------------------------------
// Only FINISHED commands score. The previous system summed absolute angular
// travel, so rapidly alternating Q/E could return the deck to level and still
// be called a triple kickflip. A skate game has to credit the caught move, not
// every radian the geometry happened to visit on the way there.
const TRICK_HALF_TURN = 0.36;   // each completed 180 of yaw
const TRICK_FLIP = 0.72;        // each completed body flip
const TRICK_ROLL = 0.62;        // each completed board flip
const TRICK_GRAB = 0.32;        // per second held
const TRICK_AIRTIME = 0.08;     // small style floor; never a tier by itself
// The ladder keeps the current three-flame race economy while restoring a
// useful hierarchy: a short grab is blue, a caught kickflip is worth more than
// that grab, and a 360 + grab (or a real combination) reaches pink.
export const TRICK_TIER_CHARGE = Object.freeze([0.30, 0.72, 1.28]);
export const TRICK_TIER_COLOR = Object.freeze([0x4bb8ff, 0xff9a2e, 0xff4bd0]);
// Peak fraction of the segment speed band each flame is worth on a clean
// landing. No tier reaches the cap alone -- the cap is where tricks, rails and
// rings stack to.
// Alex: "and need to provide way more boost".
//
// Roughly half again across the board -- 0.26/0.44/0.66 before.
//
// Not further, and the gate says why: no single tier may reach the band cap on
// its own, because the cap is where tricks, rails and rings STACK to. A first
// pass put the top tier at 1.0 and the economy suite caught it immediately. A
// top-tier trick now arrives just under the ceiling by itself and goes over it
// in a chain, which is the shape the whole combo payout was built for.
// Raised again for "and actually do it". Not to 1.0 -- the economy suite
// catches that immediately, because no single tier may reach the band cap on
// its own; the cap is where tricks, rails and rings STACK to, and a chain is
// what is supposed to get you there.
export const TRICK_TIER_POWER = Object.freeze([0.50, 0.74, 0.94]);
// PEAK is what the player feels, AREA is what the economy ceiling measures --
// and these were shortened (0.8/1.25/1.85 -> 0.55/0.85/1.25) to buy headroom
// for a taller peak back when the rise was an instant step.
//
// Lengthened again now that the rise has a DURATION. A pulse decays from the
// frame it starts, so a 0.18s attack spends a third of a 0.55s pulse just
// getting there: the peak survives, the AREA does not, and the area is what
// actually carries a player down a road. These are long enough that the attack
// is a small fraction of them.
//
// Deliberately NOT justified by the economy suite's reckless-vs-square lap
// line. That comparison is reported and not asserted, and tests/economy.mjs
// says why at length: changing how fast a line moves changes which of Scoria's
// thermal-sling gates it lines up with, and gate income swamps the effect under
// test. It has already given three contradictory answers to this same question.
// The asserted penalty measurement -- build a chain, throw one trick away at
// the worst offset, measure what it cost -- is the one that means anything.
export const TRICK_TIER_SECONDS = Object.freeze([0.80, 1.15, 1.65]);

// Steering used to be worth 1.45x more inside a drift, and drift is gone, so
// the base carries that authority now. Without it the quarter-pipe became
// nearly unclimbable: reaching the coping ballistically needs 13.6 units/s of
// lateral speed and the old terminal was 11.3, so a rider ground their way up
// the transition and arrived too slowly to launch. The soak measured four
// coping pops in twenty minutes of fuzzing.
const GROUND_STEER_BASE = 46;
const GROUND_STEER_SPEED = 0.055;
// And going FAST carries you up a transition, which is the whole point of a
// quarter-pipe. Speed above par is converted into climbing authority, so
// arriving at a wall with a boost lit throws you off the top instead of
// leaving you crawling over the lip.
const WALL_CLIMB_ASSIST = 1.4;
const GROUND_LATERAL_DRAG = 4.8;
const RAIL_RESTITUTION = 0.42;
const RAIL_MIN_BOUNCE = 2.8;
const RAIL_INSET = 0.24;
const WALL_CONTACT_COOLDOWN = 0.28;
const SPACE_LATERAL_DRAG = 3.5;
const SPACE_STEER_BASE = 54;
const SPACE_STEER_SPEED = 0.045;

// --- Rescue ladder --------------------------------------------------------
const SAFE_STAMP_INTERVAL = 400;
const SAFE_LANE_FRACTION = 0.9;
const STUCK_SECONDS = 3;
const STUCK_EPSILON = 0.5;
const MAX_SUBSTEPS = 8;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const expApproach = (value, target, rate, dt) => lerp(value, target, 1 - Math.exp(-rate * dt));
const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

/** Signed distance from `value` to the nearest multiple of `step`. */
function offsetToNearest(value, step) {
  return value - Math.round(value / step) * step;
}

const TRICK_CHANNELS = Object.freeze({
  spin: Object.freeze({ value: 'yaw', target: 'spinTarget', unit: Math.PI }),
  flip: Object.freeze({ value: 'pitch', target: 'flipTarget', unit: Math.PI * 2 }),
  boardFlip: Object.freeze({ value: 'boardFlip', target: 'boardFlipTarget', unit: Math.PI * 2 }),
});

const axisSide = (raw) => (Math.abs(raw) >= TRICK_INPUT_DEADZONE ? Math.sign(raw) : 0);

function startTrickCommand(state, channel, side) {
  const spec = TRICK_CHANNELS[channel];
  state.trickActive[channel] = side;
  state[spec.target] = state[spec.value] + side * spec.unit;
}

/** Accept one authored move, concurrently across channels and serially within one. */
function enqueueTrickCommand(state, channel, side, hooks) {
  if (!side) return false;
  const queue = state.trickQueue[channel];
  if (state.trickActive[channel]) {
    if (queue.length >= TRICK_QUEUE_LIMIT) return false;
    queue.push(side);
  } else {
    startTrickCommand(state, channel, side);
  }
  state.trickInputsQueued += 1;
  if (channel === 'spin') state.spinSide = side;
  if (channel === 'boardFlip') state.boardFlipSide = side;
  hooks.onTrickInput?.({
    channel,
    side,
    queued: queue.length + (state.trickActive[channel] ? 1 : 0),
  });
  return true;
}

/**
 * Capture a direction pressed just before SPACE releases.
 *
 * 140 ms is long enough to chord Q/E/W/S with the pop at racing speed, but
 * short enough that ordinary steering from earlier in the crouch is not
 * remembered as a surprise trick. Inputs already held before loading are
 * latched but not buffered: intent needs a fresh edge.
 */
function captureGroundTrickInputs(state, input, dt) {
  const axes = { spin: input.steer, flip: input.pitch, boardFlip: input.roll };
  for (const channel of Object.keys(TRICK_CHANNELS)) {
    state.trickBufferTimer[channel] = Math.max(0, state.trickBufferTimer[channel] - dt);
    if (state.trickBufferTimer[channel] <= 0) state.trickBufferSide[channel] = 0;
    const side = axisSide(axes[channel]);
    const previous = state.trickInputSide[channel];
    if (!side) {
      state.trickInputSide[channel] = 0;
      state.trickRepeatTimer[channel] = 0;
      continue;
    }
    if (side !== previous) {
      state.trickInputSide[channel] = side;
      state.trickRepeatTimer[channel] = TRICK_REPEAT_DELAY;
      if (state.popLoading) {
        state.trickBufferSide[channel] = side;
        state.trickBufferTimer[channel] = TRICK_PREPOP_BUFFER;
      }
    } else if (state.popLoading && state.trickBufferSide[channel] === side) {
      // Holding the chord through the release keeps it alive; the 140 ms
      // expiry applies only after the player lets the direction go.
      state.trickBufferTimer[channel] = TRICK_PREPOP_BUFFER;
    }
  }
  if (!state.popLoading) {
    for (const channel of Object.keys(TRICK_CHANNELS)) {
      state.trickBufferSide[channel] = 0;
      state.trickBufferTimer[channel] = 0;
    }
  }
}

/** Edge-trigger dedicated moves; only the shared A/D spin axis repeats on hold. */
function trickAxisPress(state, channel, raw, dt) {
  const side = axisSide(raw);
  const previous = state.trickInputSide[channel];
  if (!side) {
    state.trickInputSide[channel] = 0;
    state.trickRepeatTimer[channel] = 0;
    return 0;
  }
  if (side !== previous) {
    state.trickInputSide[channel] = side;
    state.trickRepeatTimer[channel] = TRICK_REPEAT_DELAY;
    return side;
  }
  if (channel !== 'spin') return 0;
  state.trickRepeatTimer[channel] -= dt;
  if (state.trickRepeatTimer[channel] > 0) return 0;
  state.trickRepeatTimer[channel] += TRICK_REPEAT_SECONDS;
  return side;
}

/** Desired velocity toward a committed landing target. */
function trickTargetRate(value, target, maxRate) {
  const delta = target - value;
  if (Math.abs(delta) <= 1e-5) return 0;
  // The integrator below clamps the final step, so there is no reason to ease
  // into the target. Constant speed gives every command a short, learnable
  // duration and a crisp catch instead of asymptotically crawling through the
  // last few degrees.
  return Math.sign(delta) * maxRate;
}

/** Integrate without ever overshooting the target. */
function advanceTrickTarget(value, target, rate, dt) {
  const delta = target - value;
  const move = rate * dt;
  if (Math.sign(move) === Math.sign(delta) && Math.abs(move) >= Math.abs(delta)) return target;
  return value + move;
}

function queueAirTricks(state, input, dt, hooks) {
  const axes = { spin: input.steer, flip: input.pitch, boardFlip: input.roll };
  for (const channel of Object.keys(TRICK_CHANNELS)) {
    const buffered = state.trickBufferTimer[channel] > 0 ? state.trickBufferSide[channel] : 0;
    if (buffered) enqueueTrickCommand(state, channel, buffered, hooks);
    state.trickBufferSide[channel] = 0;
    state.trickBufferTimer[channel] = 0;
    const side = trickAxisPress(state, channel, axes[channel], dt);
    if (side) enqueueTrickCommand(state, channel, side, hooks);
  }
}

function completeTrickCommands(state, hooks) {
  for (const channel of Object.keys(TRICK_CHANNELS)) {
    const side = state.trickActive[channel];
    if (!side) continue;
    const spec = TRICK_CHANNELS[channel];
    if (Math.abs(state[spec.target] - state[spec.value]) > 1e-5) continue;
    state.completedTrickMoves.push({ channel, side });
    state.trickActive[channel] = 0;
    hooks.onTrickComplete?.({
      channel,
      side,
      name: trickName(state),
      score: scoreTrick(state),
      completed: state.completedTrickMoves.length,
    });
    const next = state.trickQueue[channel].shift();
    if (next) startTrickCommand(state, channel, next);
  }
}

const incompleteTrickCount = (state) => Object.keys(TRICK_CHANNELS).reduce(
  (count, channel) => count + (state.trickActive[channel] ? 1 : 0) + state.trickQueue[channel].length,
  0,
);

function clearTrickLedger(state) {
  for (const channel of Object.keys(TRICK_CHANNELS)) {
    state.trickActive[channel] = 0;
    state.trickQueue[channel].length = 0;
  }
  state.completedTrickMoves.length = 0;
  state.trickInputsQueued = 0;
}

/** Which flame the current trick charge has earned. 0 means none yet. */
export function trickTierOf(charge) {
  if (charge >= TRICK_TIER_CHARGE[2]) return 3;
  if (charge >= TRICK_TIER_CHARGE[1]) return 2;
  if (charge >= TRICK_TIER_CHARGE[0]) return 1;
  return 0;
}

export function createRiderState(segment) {
  const profile = profileAt(segment, 0);
  return {
    riderState: RIDER.GROUND,
    height: 0,
    heightVelocity: 0,
    pitch: 0,
    spinRate: 0,
    flipRate: 0,
    airTime: 0,
    inputLockout: 0,
    poseEpoch: 0,

    // --- the pop ---
    popCharge: 0,           // seconds of crouch loaded
    popLoading: false,
    crouch: 0,              // 0..1, what the art reads

    // --- the trick in progress ---
    spinTravelled: 0,
    // A tap moves one of these targets by a complete landing unit. The motor
    // keeps moving after the key is released, so a quick chord at takeoff is
    // never swallowed and simultaneous inputs genuinely combine.
    spinTarget: 0,
    flipTarget: 0,
    boardFlipTarget: 0,
    trickActive: { spin: 0, flip: 0, boardFlip: 0 },
    trickQueue: { spin: [], flip: [], boardFlip: [] },
    completedTrickMoves: [],
    trickInputSide: { spin: 0, flip: 0, boardFlip: 0 },
    trickRepeatTimer: { spin: 0, flip: 0, boardFlip: 0 },
    trickBufferSide: { spin: 0, flip: 0, boardFlip: 0 },
    trickBufferTimer: { spin: 0, flip: 0, boardFlip: 0 },
    trickInputsQueued: 0,
    // The BOARD flip is its own channel, and that is the whole point of it.
    // It used to drive `state.roll`, which the renderer applies to the pose
    // group the rider is parented under -- so a kickflip rotated the person
    // and the board together as one rigid body and read on screen as a
    // wipeout, not a trick. `roll` still means "the whole rider is inverted"
    // (a rail loop, a barrel roll in space); `boardFlip` means "the board is
    // turning over under the rider's feet", which is what a kickflip is.
    boardFlip: 0,
    boardFlipRate: 0,
    boardFlipTravelled: 0,
    boardFlipSide: 0,
    rollTravelled: 0,
    rollRate: 0,
    rollSide: 0,
    flipTravelled: 0,
    grabSeconds: 0,
    trickCharge: 0,
    // The 0..1 view of trickCharge that every art consumer reads. Initialised
    // here rather than only computed inside a step: raceSnapshot() runs once at
    // boot before any tick, and an undefined field there is a dead screen.
    trickMeter: 0,
    trickTier: 0,
    spinSide: 0,
    // Riding switch is a real state: a landed 180 leaves the board pointing
    // the other way, and the ground pose has to know that or it will drag the
    // rider back to forward and undo the trick they just landed.
    stance: 0,              // multiples of PI the board rests at
    landingSettle: 0,
    landingSettleTotal: LAND_SETTLE_CLEAN,
    landingSettleFrom: 0,
    landingSettleTo: 0,
    landingPitchFrom: 0,
    landingRollFrom: 0,
    landingRollTo: 0,
    landingBoardFlipFrom: 0,
    landingBoardFlipTo: 0,
    landingPitchTo: 0,
    landingQuality: 0,
    // How hard the assist had to work on this landing, and what it has spent.
    // Both are per-trick and both reset on the pop -- see beginAir.
    landingAssist: 0,
    landingAssistSpent: { yaw: 0, pitch: 0, boardFlip: 0 },
    // Reported so the HUD and the audio can call a caught landing what it is.
    landingSketchy: false,
    settleJustFinished: false,
    tricksLanded: 0,
    tricksBlown: 0,
    bestTrickTier: 0,

    // --- rails ---
    railShape: null,
    launchedFromRail: null,
    railIndex: -1,
    railExitUp: 1,
    railSide: 0,
    railT: 0,
    railSeconds: 0,
    railLockout: 0,
    rails: 0,

    // --- grind ---
    grindSide: 0,
    grindSeconds: 0,
    grindLockout: 0,
    grinds: 0,

    safePoint: { s: 0, lateral: 0, height: 0 },
    lastSafeStampS: 0,
    stuckTimer: 0,
    lastStuckCheckS: 0,
    boundaryResolutions: 0,
    skimTicks: 0,
    rescues: 0,
    nanRescues: 0,
    profile,
  };
}

/** The ground pose the board settles into: along travel, in its current stance. */
function groundPoseTarget(state, steer) {
  const slip = clamp(-state.lateralVelocity * 0.012, -0.35, 0.35);
  return {
    yaw: state.stance * Math.PI - steer * 0.16 + slip,
    roll: -steer * 0.12,
  };
}

/**
 * Declare an orientation discontinuity AND take it, in the same tick.
 *
 * Landings deliberately do NOT use this -- a landing that snapped the board
 * flat is exactly what read as broken. It settles instead.
 */
export function snapPose(state, steer = 0) {
  state.poseEpoch = (state.poseEpoch + 1) % 1000000;
  const target = groundPoseTarget(state, steer);
  state.yaw = target.yaw;
  state.roll = target.roll;
  state.boardFlip = 0;
  state.pitch = 0;
}

export function stampSafePoint(state, profile) {
  if (state.riderState !== RIDER.GROUND) return;
  if (Math.abs(state.lateral) > profile.roadHalf * SAFE_LANE_FRACTION) return;
  state.safePoint.s = state.globalProgress;
  state.safePoint.lateral = state.lateral;
  state.safePoint.height = 0;
  state.lastSafeStampS = state.globalProgress;
}

export function rescueRider(state, profile, reason) {
  state.railShape = null;
  state.railIndex = -1;
  state.railSeconds = 0;
  state.grindSide = 0;
  state.grindSeconds = 0;
  state.grabSeconds = 0;
  state.inputLockout = 0;
  state.popCharge = 0;
  state.popLoading = false;
  state.trickCharge = 0;
  state.trickTier = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.spinTarget = 0;
  state.flipTarget = 0;
  state.boardFlipTarget = 0;
  state.trickActive.spin = 0;
  state.trickActive.flip = 0;
  state.trickActive.boardFlip = 0;
  state.trickQueue.spin.length = 0;
  state.trickQueue.flip.length = 0;
  state.trickQueue.boardFlip.length = 0;
  state.completedTrickMoves.length = 0;
  state.trickInputSide.spin = 0;
  state.trickInputSide.flip = 0;
  state.trickInputSide.boardFlip = 0;
  state.trickRepeatTimer.spin = 0;
  state.trickRepeatTimer.flip = 0;
  state.trickRepeatTimer.boardFlip = 0;
  state.trickBufferSide.spin = 0;
  state.trickBufferSide.flip = 0;
  state.trickBufferSide.boardFlip = 0;
  state.trickBufferTimer.spin = 0;
  state.trickBufferTimer.flip = 0;
  state.trickBufferTimer.boardFlip = 0;
  state.trickInputsQueued = 0;
  state.landingSettle = 0;
  state.stance = 0;
  state.lateral = clamp(finite(state.safePoint.lateral), -profile.roadHalf * 0.8, profile.roadHalf * 0.8);
  state.lateralVelocity = 0;
  state.height = 0;
  state.heightVelocity = 0;
  state.pitch = 0;
  state.spinRate = 0;
  state.flipRate = 0;
  state.airTime = 0;
  state.riderState = RIDER.GROUND;
  state.stuckTimer = 0;
  state.rescues += 1;
  snapPose(state, 0);
  return reason;
}

export function guardFinite(state, profile) {
  const fields = [
    state.lateral, state.lateralVelocity, state.height, state.heightVelocity,
    state.pitch, state.yaw, state.roll, state.speed, state.globalProgress, state.segmentProgress,
    state.spinTarget, state.flipTarget, state.boardFlipTarget,
    state.trickRepeatTimer.spin, state.trickRepeatTimer.flip, state.trickRepeatTimer.boardFlip,
    state.trickBufferTimer.spin, state.trickBufferTimer.flip, state.trickBufferTimer.boardFlip,
    state.trickActive.spin, state.trickActive.flip, state.trickActive.boardFlip,
  ];
  if (fields.every(Number.isFinite)) return false;
  if (!Number.isFinite(state.globalProgress)) state.globalProgress = finite(state.safePoint.s);
  if (!Number.isFinite(state.segmentProgress)) state.segmentProgress = 0;
  if (!Number.isFinite(state.speed)) state.speed = profile.width * 20;
  state.yaw = 0;
  state.roll = 0;
  state.boardFlip = 0;
  rescueRider(state, profile, 'nan');
  state.nanRescues += 1;
  return true;
}

/** The outermost |x| the rider may occupy in this cross-section. */
export function lateralLimitOf(profile) {
  if (!profile.hardEdge) return profile.lipX;
  return profile.hasWall ? profile.lipX : profile.roadHalf;
}

function sweepLateral(state, profile, dx) {
  const startX = state.lateral;
  const endX = startX + dx;
  const limit = lateralLimitOf(profile);
  if (Math.abs(endX) <= limit) {
    state.lateral = endX;
    return null;
  }
  const side = Math.sign(endX) || Math.sign(startX) || 1;
  const travel = endX - startX;
  const crossing = Math.abs(travel) > 1e-9 ? clamp((side * limit - startX) / travel, 0, 1) : 0;
  const impact = Math.abs(state.lateralVelocity);
  state.boundaryResolutions += 1;
  state.lateral = side * (limit - RAIL_INSET);
  if (profile.hardEdge) {
    state.lateralVelocity = -side * Math.max(RAIL_MIN_BOUNCE, impact * RAIL_RESTITUTION);
  } else {
    state.lateralVelocity = 0;
  }
  return { side, impact, crossing, zone: zoneAt(profile, side * limit) };
}

/** Leave the ground with the trick slate clean. */
export function beginAir(state, impulse) {
  state.riderState = RIDER.AIR;
  state.heightVelocity = impulse;
  state.airTime = 0;
  state.spinRate = 0;
  state.flipRate = 0;
  state.spinTarget = state.yaw;
  state.flipTarget = state.pitch;
  state.boardFlipTarget = state.boardFlip;
  state.trickActive.spin = 0;
  state.trickActive.flip = 0;
  state.trickActive.boardFlip = 0;
  state.trickQueue.spin.length = 0;
  state.trickQueue.flip.length = 0;
  state.trickQueue.boardFlip.length = 0;
  state.completedTrickMoves.length = 0;
  state.trickInputsQueued = 0;
  state.grabSeconds = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.boardFlipRate = 0;
  state.boardFlipTravelled = 0;
  state.boardFlipSide = 0;
  state.landingAssist = 0;
  state.landingAssistSpent.yaw = 0;
  state.landingAssistSpent.pitch = 0;
  state.landingAssistSpent.boardFlip = 0;
  state.trickCharge = 0;
  state.trickTier = 0;
  state.landingSettle = 0;
  state.popCharge = 0;
  state.popLoading = false;
}

/**
 * What to call what just happened.
 *
 * Alex: "we can throw the name of the trick and the point value onto the
 * screen in a cool way when you do a trick."
 *
 * Names come from the completed-move ledger. That is a stronger promise than
 * rounding travel: if the banner says KICKFLIP, the board completed and caught
 * one authored kickflip command.
 */
const GRAB_NAMES = [[0.42, "TUCK"], [0.95, "GRAB"], [Infinity, "BONED"]];
const COUNT_PREFIX = ["", "", "DOUBLE ", "TRIPLE ", "QUAD ", "QUINT "];
const RAIL_PREFIX = { kicker: "KICKER", sweep: "SWEEP", loop: "LOOP" };

const completedCount = (state, channel, side = 0) => state.completedTrickMoves.reduce(
  (count, move) => count + (move.channel === channel && (!side || move.side === side) ? 1 : 0),
  0,
);

function countedMove(name, count) {
  if (count <= 0) return null;
  if (count >= COUNT_PREFIX.length) return `${count}X ${name}`;
  return `${COUNT_PREFIX[count]}${name}`;
}

export function trickName(state) {
  const prefix = [];
  const parts = [];
  if (state.launchedFromRail && RAIL_PREFIX[state.launchedFromRail]) {
    prefix.push(RAIL_PREFIX[state.launchedFromRail]);
  }
  if (state.stance) prefix.push("SWITCH");

  const spins = state.completedTrickMoves.filter((move) => move.channel === 'spin');
  if (spins.length) {
    const rewound = spins.some((move, index) => index > 0 && move.side !== spins[index - 1].side);
    parts.push(`${spins.length * 180}${rewound ? ' REWIND' : ''}`);
  }
  const frontFlips = completedCount(state, 'flip', 1);
  const backFlips = completedCount(state, 'flip', -1);
  if (frontFlips) parts.push(countedMove('FRONTFLIP', frontFlips));
  if (backFlips) parts.push(countedMove('BACKFLIP', backFlips));

  const kickflips = completedCount(state, 'boardFlip', -1);
  const heelflips = completedCount(state, 'boardFlip', 1);
  if (kickflips) parts.push(countedMove('KICKFLIP', kickflips));
  if (heelflips) parts.push(countedMove('HEELFLIP', heelflips));
  if (state.grabSeconds > 0.08) {
    parts.push(GRAB_NAMES.find(([limit]) => state.grabSeconds < limit)[1]);
  }
  // Something always has a name. A big straight pop off a wall is a trick.
  if (!parts.length) parts.push(state.airTime > 0.75 ? "BIG AIR" : "OLLIE");
  return `${prefix.length ? `${prefix.join(' ')} ` : ''}${parts.join(' + ')}`;
}

/** The running score of the trick currently in the air. */
function scoreTrick(state) {
  return completedCount(state, 'spin') * TRICK_HALF_TURN
    + completedCount(state, 'flip') * TRICK_FLIP
    + completedCount(state, 'boardFlip') * TRICK_ROLL
    + state.grabSeconds * TRICK_GRAB
    + state.airTime * TRICK_AIRTIME;
}

/**
 * How wrong an orientation is, in units of the landing window: 1 is exactly the
 * edge, above 1 is a blown landing.
 *
 * Extracted so the ASSIST and the JUDGE cannot disagree about what counts as a
 * miss. They did when this was written twice, and a rescue that fires on a
 * landing the judge would have passed is not a rescue -- it is a tax on getting
 * it right.
 */
export function landingError(state) {
  const orientationError = Math.max(
    Math.abs(offsetToNearest(state.yaw, Math.PI)) / LAND_TOLERANCE,
    Math.abs(offsetToNearest(state.pitch, Math.PI * 2)) / LAND_PITCH_TOLERANCE,
    Math.abs(offsetToNearest(state.boardFlip, Math.PI * 2)) / LAND_ROLL_TOLERANCE,
  );
  // A command is a promise to complete and catch the move. Touching down with
  // one still active (or queued behind it) is a bail even if it was started so
  // late that the board has only moved a few degrees. This is the clean risk
  // language: one more move either fits in the air or it does not.
  return incompleteTrickCount(state) > 0 ? Math.max(orientationError, 1.12) : orientationError;
}

/**
 * Judge a landing and start the settle.
 *
 * Everything here is graduated. `quality` is 1 for a dead-square landing and 0
 * at the edge of the tolerance; past the tolerance the trick is blown and the
 * scrub scales with how wrong it was AND with how big a trick was being
 * attempted. A near miss costs a little speed, a wild one costs a lot, and
 * doing nothing costs nothing -- which is what makes attempting a trick a
 * decision rather than a freebie.
 */
function judgeLanding(state, hooks) {
  const yawOff = offsetToNearest(state.yaw, Math.PI);
  const pitchOff = offsetToNearest(state.pitch, Math.PI * 2);
  // A board flip has to come all the way round. That is the rule the trick is
  // named for -- a kickflip landed halfway is a rider standing on the grip
  // tape -- so the board channel is judged against whole turns exactly like
  // pitch is. Judged on `boardFlip`, not `roll`: `roll` is the rider's own
  // inversion and a rail loop legitimately leaves it anywhere.
  const error = landingError(state);
  const clean = error <= 1;
  // A landing the assist had to catch is a SKETCHY landing: it counts, and it
  // pays less. That is what keeps the assist from becoming an autopilot --
  // squaring up on your own timing is still the only way to a full payout, so
  // the skill ceiling is untouched while the floor comes up.
  //
  // Charged on the correction actually SPENT, not on how close touchdown was.
  // The first version billed by proximity, which taxed every landing inside the
  // window including the ones that were already square -- a player who nailed
  // it paid for help they never received, and measured 0.569 -> 0.514 for
  // getting it right. Nobody pays for an assist that did nothing.
  const spent = Math.max(
    state.landingAssistSpent.yaw,
    state.landingAssistSpent.pitch,
    state.landingAssistSpent.boardFlip,
  );
  const assisted = LAND_ASSIST_MAX > 0 ? clamp(spent / LAND_ASSIST_MAX, 0, 1) : 0;
  state.landingAssist = assisted;
  const quality = clamp(1 - error, 0, 1) * (1 - assisted * LAND_ASSIST_QUALITY_COST);
  state.landingSketchy = clean && assisted > 0.25;
  const score = scoreTrick(state);
  const tier = trickTierOf(score);
  // And it SAYS so. A rescue the player cannot see is a rescue they cannot
  // learn from -- they would only notice that some landings pay less than
  // others and never find out why. The banner already shows the name, so the
  // name is where it goes. (PLAN ground rule 6: every mechanic ships with an
  // in-world signal. A flag nothing reads is not a signal, it is dead state.)
  const name = state.landingSketchy ? `SKETCHY ${trickName(state)}` : trickName(state);

  // The board comes to rest on the nearest half turn, so a landed 180 leaves
  // the rider switch instead of being spun back to forward against their will.
  const restingYaw = Math.round(state.yaw / Math.PI) * Math.PI;
  state.stance = Math.round(restingYaw / Math.PI);
  state.landingSettleFrom = state.yaw;
  state.landingSettleTo = restingYaw;
  state.landingSettleTotal = clean ? LAND_SETTLE_CLEAN : LAND_SETTLE_DIRTY;
  state.landingSettle = state.landingSettleTotal;
  state.landingQuality = quality;
  // Pitch settles with yaw rather than being zeroed. Zeroing it was the same
  // snap, in the other channel: the soak measured 86 rad/s of undeclared
  // rotation from a flip being deleted on contact.
  state.landingRollFrom = state.roll;
  state.landingRollTo = Math.round(state.roll / (Math.PI * 2)) * (Math.PI * 2);
  // The board finishes its flip onto the nearest whole turn rather than
  // unwinding -- the same rule pitch gets, in the channel the trick lives in.
  state.landingBoardFlipFrom = state.boardFlip;
  state.landingBoardFlipTo = Math.round(state.boardFlip / (Math.PI * 2)) * (Math.PI * 2);
  state.landingPitchFrom = state.pitch;
  state.landingPitchTo = Math.round(state.pitch / (Math.PI * 2)) * (Math.PI * 2);
  state.spinRate = 0;
  state.flipRate = 0;

  if (clean && tier > 0) {
    state.tricksLanded += 1;
    state.bestTrickTier = Math.max(state.bestTrickTier, tier);
    hooks.onTrick?.({
      tier,
      score,
      quality,
      name,
      halves: completedCount(state, 'spin'),
      flips: completedCount(state, 'flip'),
      boardFlips: completedCount(state, 'boardFlip'),
      grab: state.grabSeconds,
      airTime: state.airTime,
      // A sloppy-but-legal landing pays less than a stomped one, so the gap
      // between "landed it" and "LANDED it" is worth chasing.
      strength: TRICK_TIER_POWER[tier - 1] * (0.55 + quality * 0.45),
      seconds: TRICK_TIER_SECONDS[tier - 1],
      color: TRICK_TIER_COLOR[tier - 1],
    });
  } else if (!clean) {
    // The divisor has to move with LAND_TOLERANCE, and forgetting that is a
    // trap worth naming: `error` is |yawOff| / LAND_TOLERANCE, so widening the
    // tolerance shrinks `error` for the SAME physical mistake and silently
    // guts the penalty. Loosening the window from 0.85 to 1.05 without touching
    // this took the worst-case scrub from 52% to 24% -- the landing got easier
    // AND getting it wrong got cheaper, when only the first was asked for.
    //
    // 0.50 is not a taste value: the worst a landing can physically be is a
    // quarter turn off, which is an `error` of PI/2 / 1.05 = 1.496, so the band
    // left to ramp across is exactly 0.496 wide. The ramp spans it, which keeps
    // a near-miss cheap and a wild one ruinous.
    const overshoot = clamp((error - 1) / OVERSHOOT_BAND, 0, 1);
    // What you were ATTEMPTING, not what you scored -- a blown trick scores
    // nothing, so scoring it would make the biggest failures the cheapest.
    //
    // Airtime is in here for a reason the raised hop exposed. When a full pop
    // went from 1.08 seconds to 1.48, throwing tricks and bailing every one of
    // them came out FASTER than never leaving the ground: air is time spent not
    // touching anything, and the scrub was a flat fraction that did not care
    // how much of it you had bought. Committing to a big pop and missing has to
    // cost more than fluffing a tap, or the correct play is to spam the button.
    const ambition = clamp(
      score / TRICK_TIER_CHARGE[2] + state.airTime * 0.55,
      0.35,
      2.1,
    );
    const scrub = clamp(overshoot * ambition, 0.06, 1) * LAND_SCRUB_MAX;
    state.tricksBlown += 1;
    state.speed *= 1 - scrub;
    state.inputLockout = LAND_LOCKOUT_MAX * clamp(overshoot, 0.15, 1);
    state.lateralVelocity *= 0.45;
    hooks.onBlown?.({ yawOff, pitchOff, error, scrub, score, tier, name });
  }
  hooks.onLand?.({ airTime: state.airTime, clean, quality, tier, score, name });
  // The rail that threw you names one trick, not every trick after it.
  state.launchedFromRail = null;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.rollTravelled = 0;
  state.rollRate = 0;
  state.boardFlipTravelled = 0;
  state.boardFlipRate = 0;
  state.trickActive.spin = 0;
  state.trickActive.flip = 0;
  state.trickActive.boardFlip = 0;
  state.trickQueue.spin.length = 0;
  state.trickQueue.flip.length = 0;
  state.trickQueue.boardFlip.length = 0;
  state.completedTrickMoves.length = 0;
  state.trickBufferSide.spin = 0;
  state.trickBufferSide.flip = 0;
  state.trickBufferSide.boardFlip = 0;
  state.trickBufferTimer.spin = 0;
  state.trickBufferTimer.flip = 0;
  state.trickBufferTimer.boardFlip = 0;
  state.landingAssist = 0;
  state.landingAssistSpent.yaw = 0;
  state.landingAssistSpent.pitch = 0;
  state.landingAssistSpent.boardFlip = 0;
  state.grabSeconds = 0;
  state.trickCharge = 0;
  state.trickTier = 0;
  state.airTime = 0;
}

export function stepRider(state, segment, input, dt, hooks = {}) {
  const profile = profileAt(segment, state.segmentProgress, state.short);
  state.profile = profile;
  if (guardFinite(state, profile)) return { rescued: 'nan', profile };
  state.railLockout = Math.max(0, state.railLockout - dt);

  // --- aerial rails ------------------------------------------------------
  // Riding one is not a physics state: the rider IS the rail's line while they
  // are on it. That is the whole safety argument for letting a rail loop.
  if (state.riderState === RIDER.RAIL) {
    const rail = railAt(segment, state.segmentProgress, state.short);
    if (!rail || rail.index !== state.railIndex) {
      // The line ran out. Every rail ends in a launch, never a stop.
      leaveRail(state, 1, hooks);
    } else {
      state.railT = rail.t;
      state.railSeconds += dt;
      state.lateral = rail.lateral;
      state.height = rail.height;
      state.lateralVelocity = 0;
      state.heightVelocity = 0;
      state.roll = rail.roll;
      state.railExitUp = rail.exitUp;
      if (input.hop && !state.lastHop && !locked0(state)) leaveRail(state, rail.exitUp, hooks);
      return { rescued: null, profile, onRail: true };
    }
  }

  state.inputLockout = Math.max(0, state.inputLockout - dt);
  state.wallContactCooldown = Math.max(0, state.wallContactCooldown - dt);
  state.grindLockout = Math.max(0, state.grindLockout - dt);
  const settleWas = state.landingSettle;
  state.landingSettle = Math.max(0, state.landingSettle - dt);
  if (settleWas > 0 && state.landingSettle <= 0) state.settleJustFinished = true;
  const locked = state.inputLockout > 0;
  const steer = locked ? 0 : input.steer;

  // --- the pop -----------------------------------------------------------
  // Hold to load, release to launch. The crouch is visible, so the amount of
  // pop coming is something the player can watch themselves building.
  if (state.riderState === RIDER.GROUND && !locked) {
    if (input.hop) {
      state.popLoading = true;
      state.popCharge = Math.min(HOP_CHARGE_SECONDS, state.popCharge + dt);
    } else if (state.popLoading) {
      const loaded = state.popCharge / HOP_CHARGE_SECONDS;
      const impulse = lerp(HOP_MIN_IMPULSE, HOP_MAX_IMPULSE, loaded);
      beginAir(state, impulse);
      hooks.onPop?.({ loaded, impulse });
    }
  } else if (state.riderState !== RIDER.GROUND) {
    state.popLoading = false;
    state.popCharge = 0;
  }
  if (state.riderState === RIDER.GRIND && input.hop && !state.lastHop && !locked) {
    endGrind(state, profile, 'hop', hooks);
  }
  state.crouch = expApproach(
    state.crouch,
    state.riderState === RIDER.GROUND ? state.popCharge / HOP_CHARGE_SECONDS : 0,
    14,
    dt,
  );
  // Read fresh edges while the pop is loading so a fast chord can lead the
  // release by a handful of frames. Once beginAir runs, the buffered command
  // is consumed in the same tick as the launch.
  if (state.riderState === RIDER.GROUND) {
    captureGroundTrickInputs(state, {
      steer,
      pitch: locked ? 0 : input.pitch,
      roll: locked ? 0 : input.roll,
    }, dt);
  }

  // --- lateral and rotational intent --------------------------------------
  if (state.riderState === RIDER.AIR) {
    state.airTime += dt;
    if (input.grab && !locked) state.grabSeconds += dt;
    state.lateralVelocity += steer * AIR_STEER_FORCE * dt;
    state.lateralVelocity *= Math.exp(-0.9 * dt);
    // Queue BEFORE driving the targets. A direction flick on the exact release
    // frame therefore moves the rider this frame; the old 130 ms dead zone ate
    // that natural chord completely and made fast hands feel like missed input.
    queueAirTricks(state, {
      steer,
      pitch: locked ? 0 : input.pitch,
      roll: locked ? 0 : input.roll,
    }, dt, hooks);
    state.spinRate = trickTargetRate(state.yaw, state.spinTarget, AIR_SPIN_RATE);
    state.flipRate = trickTargetRate(state.pitch, state.flipTarget, AIR_FLIP_RATE);
    state.boardFlipRate = trickTargetRate(state.boardFlip, state.boardFlipTarget, AIR_ROLL_RATE);
    // How long until this lands, from the trajectory rather than from a guess.
    // Solving the fall exactly is what lets the window be stated in seconds --
    // the value that matters is "can the player see the ground coming", and
    // that is a time, not a height.
    const floor = surfaceHeight(profile, state.lateral);
    const fall = Math.max(0, state.height - floor);
    const g = GRAVITY;
    const timeToImpact = (state.heightVelocity + Math.sqrt(
      Math.max(0, state.heightVelocity * state.heightVelocity + 2 * g * fall),
    )) / g;
    // Re-tested every tick, and only for a rider who is actually going to miss.
    // Someone already inside the window is left completely alone: no taper, no
    // pull, no penalty. That is what keeps the top of the skill range exactly
    // where it was -- measured, this used to drag a 0.910 landing down to 0.577
    // for help it did not need. The moment the pull brings the error back
    // inside 1 the assist switches itself off and the rider keeps the rest.
    const assist = timeToImpact < LAND_ASSIST_WINDOW && landingError(state) > 1
      ? clamp(1 - timeToImpact / LAND_ASSIST_WINDOW, 0, 1)
      : 0;
    if (assist > 0) {
      // Authored commands keep their full motor rate all the way to the catch.
      // Slowing an active move here made a nominally finishable last-second
      // kickflip bail simply because it entered the assist window. The pull
      // below already skips active/queued channels; it only squares idle axes.
      // Spend from a fixed budget, tracked per channel. Once it is gone the
      // orientation is whatever the player left it at, which is the whole
      // reason a wild miss is still a miss.
      const pull = (channel, value, step) => {
        const commandChannel = channel === 'yaw' ? 'spin' : (channel === 'pitch' ? 'flip' : channel);
        if (state.trickActive[commandChannel] || state.trickQueue[commandChannel].length) return 0;
        const off = offsetToNearest(value, step);
        const room = Math.max(0, LAND_ASSIST_MAX - state.landingAssistSpent[channel]);
        if (room <= 0 || off === 0) return 0;
        const want = Math.min(LAND_ASSIST_RATE * assist * dt, room, Math.abs(off));
        state.landingAssistSpent[channel] += want;
        return -Math.sign(off) * want;
      };
      state.yaw += pull('yaw', state.yaw, Math.PI);
      state.pitch += pull('pitch', state.pitch, Math.PI * 2);
      state.boardFlip += pull('boardFlip', state.boardFlip, Math.PI * 2);
    }
    state.yaw = advanceTrickTarget(state.yaw, state.spinTarget, state.spinRate, dt);
    state.pitch = advanceTrickTarget(state.pitch, state.flipTarget, state.flipRate, dt);
    // The board channel is advanced separately so the rider stays upright.
    state.boardFlip = advanceTrickTarget(
      state.boardFlip,
      state.boardFlipTarget,
      state.boardFlipRate,
      dt,
    );
    // Completing a legal unit is the catch. It is the only moment a move is
    // added to the ledger or allowed to score.
    completeTrickCommands(state, hooks);
    // Roll is still the whole-body authored rail/space channel and stays
    // continuous.
    state.roll += state.rollRate * dt;
    state.spinTravelled += Math.abs(state.spinRate) * dt;
    state.flipTravelled += Math.abs(state.flipRate) * dt;
    state.rollTravelled += Math.abs(state.rollRate) * dt;
    state.boardFlipTravelled += Math.abs(state.boardFlipRate) * dt;
    // The flame lights while you are still in the air, so the rung you are
    // about to cash -- or about to throw away on a bad landing -- is visible
    // before the decision to keep spinning or square up.
    state.trickCharge = scoreTrick(state);
    const tier = trickTierOf(state.trickCharge);
    if (tier !== state.trickTier) {
      state.trickTier = tier;
      if (tier > 0) hooks.onTrickTier?.({ tier, color: TRICK_TIER_COLOR[tier - 1] });
    }
  } else if (state.riderState === RIDER.GRIND) {
    stepGrind(state, segment, input, dt, hooks);
  } else {
    const slope = surfaceSlope(profile, state.lateral);
    // On a transition, speed above par becomes climbing authority.
    const overPar = clamp((state.speed / Math.max(1, segment.baseSpeed)) - 1, 0, 1);
    const climb = slope !== 0 ? 1 + overPar * WALL_CLIMB_ASSIST : 1;
    const steerForce = (GROUND_STEER_BASE + state.speed * GROUND_STEER_SPEED) * climb;
    state.lateralVelocity += steer * steerForce * dt;
    if (slope !== 0) {
      const side = Math.sign(state.lateral) || 1;
      state.lateralVelocity -= side * GRAVITY * slope / (1 + slope * slope) * dt;
    }
    state.lateralVelocity *= Math.exp(-GROUND_LATERAL_DRAG * dt);
    // The settle owns pitch while it runs. Easing it here at the same time
    // made the two fight, and the loser was the player: pitch ended a full
    // flip away from level and then got dragged back at 54 rad/s.
    if (state.landingSettle <= 0 && !state.settleJustFinished) {
      state.pitch = expApproach(state.pitch, 0, 9, dt);
    }
  }

  // A rail mouth is checked against the distance travelled THIS tick, so a
  // fast rider cannot pass through the entry between two samples.
  if (state.railLockout <= 0 && state.riderState !== RIDER.GRIND) {
    const mouth = railMouthAt(
      segment,
      state.segmentProgress + state.speed * dt,
      state.segmentProgress,
      state.lateral,
      state.short,
    );
    if (mouth) {
      joinRail(state, mouth, hooks);
      return { rescued: null, profile, onRail: true };
    }
  }

  // --- swept integration ---------------------------------------------------
  const railLimit = lateralLimitOf(profile);
  const pushingIntoRail = state.wallContactSide !== 0
    && !profile.hasWall
    && Math.sign(steer) === state.wallContactSide
    && state.riderState === RIDER.GROUND
    && Math.abs(state.lateral) > railLimit - RAIL_INSET - 0.35;
  if (pushingIntoRail) {
    state.lateral = state.wallContactSide * (railLimit - RAIL_INSET);
    state.lateralVelocity = 0;
    state.railSkimming = true;
    state.skimTicks += 1;
    state.height = surfaceHeight(profile, state.lateral);
    state.heightVelocity = 0;
    return { rescued: null, profile, contact: null, skimming: true };
  }
  state.railSkimming = false;
  const dx = state.lateralVelocity * dt;
  const dh = state.riderState === RIDER.AIR ? state.heightVelocity * dt : 0;
  const step = Math.max(Math.abs(dx), Math.abs(dh));
  const substeps = clamp(Math.ceil(step / (narrowestZone(profile) * 0.5)), 1, MAX_SUBSTEPS);
  let contact = null;
  for (let i = 0; i < substeps; i += 1) {
    const beforeX = state.lateral;
    const hit = sweepLateral(state, profile, dx / substeps);
    if (hit && !contact) contact = hit;

    // Popping off the coping. There is deliberately no "settle at the edge"
    // branch -- CARVE had one and it re-fired every frame at the boundary.
    if (profile.hasWall
      && state.riderState === RIDER.GROUND
      && Math.abs(beforeX) < profile.copingX
      && Math.abs(state.lateral) >= profile.copingX) {
      const outward = Math.abs(state.lateralVelocity);
      if (outward > 6) {
        state.height = profile.wallRise;
        beginAir(state, outward);
        hooks.onCopingPop?.({ speed: outward, side: Math.sign(state.lateral) || 1 });
      }
    }

    if (state.riderState === RIDER.AIR) {
      // Catch the coping on the way down.
      if (profile.hasWall
        && state.heightVelocity <= 0
        && state.grindLockout <= 0
        && Math.abs(Math.abs(state.lateral) - profile.copingX) <= 1.6
        && Math.abs(state.height - profile.copingRailH) <= 1.6) {
        beginGrind(state, profile, hooks);
        continue;
      }
      state.heightVelocity -= (GRAVITY * dt) / substeps;
      state.height += (state.heightVelocity * dt) / substeps;
      const floor = surfaceHeight(profile, state.lateral);
      if (state.height <= floor) {
        state.height = floor;
        state.heightVelocity = 0;
        state.riderState = RIDER.GROUND;
        judgeLanding(state, hooks);
      }
    } else if (state.riderState !== RIDER.GRIND) {
      state.height = surfaceHeight(profile, state.lateral);
      state.heightVelocity = 0;
    }
  }

  if (contact) {
    const newContact = state.wallContactSide !== contact.side && state.wallContactCooldown <= 0;
    state.wallContactSide = contact.side;
    state.wallContactCooldown = WALL_CONTACT_COOLDOWN;
    if (newContact) hooks.onWall?.(contact);
  } else if (
    state.wallContactSide !== 0
    && Math.abs(state.lateral) < profile.roadHalf - RAIL_INSET - 0.18
    && Math.sign(steer) !== state.wallContactSide
  ) {
    state.wallContactSide = 0;
  }

  return { rescued: null, profile, contact };
}

/**
 * Carry the rider in with a shrinking road.
 *
 * The sweep guards against the rider crossing a boundary. It cannot guard
 * against the boundary crossing the RIDER, which is what happens as a wall
 * stretch ramps down and the deck's outer lip slides inward under someone
 * standing on it -- about 0.09 per tick at 20 Hz, and the soak caught exactly
 * that. This runs AFTER distance advances, so the rider is legal against the
 * cross-section at their current s and not merely at the one they were
 * resolved against a tick ago.
 */
export function reconcileToProfile(state, segment) {
  const profile = profileAt(segment, state.segmentProgress, state.short);
  state.profile = profile;
  // A rail rider is on the rail's line, which is allowed to be off the road --
  // that is the point of it.
  if (state.riderState === RIDER.RAIL) return profile;
  const limit = lateralLimitOf(profile);
  if (Math.abs(state.lateral) > limit) {
    const side = Math.sign(state.lateral) || 1;
    state.lateral = side * limit;
    if (state.lateralVelocity * side > 0) state.lateralVelocity = 0;
  }
  if (state.riderState !== RIDER.AIR
    && state.riderState !== RIDER.GRIND
    && state.riderState !== RIDER.RAIL) {
    state.height = surfaceHeight(profile, state.lateral);
  }
  return profile;
}

const locked0 = (state) => state.inputLockout > 0;

/** Get on an aerial rail at its mouth. */
export function joinRail(state, rail, hooks = {}) {
  state.riderState = RIDER.RAIL;
  state.railIndex = rail.index;
  state.railShape = rail.shape;
  state.railSide = rail.side;
  state.railT = 0;
  state.railSeconds = 0;
  state.railExitUp = 1;
  state.rails += 1;
  state.lateral = rail.mouth.lateral;
  state.height = rail.mouth.height;
  state.lateralVelocity = 0;
  state.heightVelocity = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.grabSeconds = 0;
  clearTrickLedger(state);
  state.trickCharge = 0;
  state.trickTier = 0;
  state.landingSettle = 0;
  snapPose(state, 0);
  hooks.onRailStart?.({ shape: rail.shape, side: rail.side });
}

/** Leave a rail. Always a launch, scaled by how steeply the line was rising. */
export function leaveRail(state, exitUp, hooks = {}) {
  const seconds = state.railSeconds;
  const shape = state.railShape;
  state.railLockout = 0.4;
  state.railSeconds = 0;
  // Kept for the trick name: a trick off a loop is not the same trick.
  state.launchedFromRail = shape;
  state.railShape = null;
  state.railIndex = -1;
  // A loop leaves the roll a full turn from where it started. Zeroing it was a
  // 6.03 rad snap; subtracting the whole turns lands on the same orientation
  // and the renderer blends by shortest arc, so the wrap costs nothing visible.
  // It is declared because numerically it IS a jump.
  const turns = Math.round(state.roll / (Math.PI * 2));
  if (turns !== 0) {
    state.roll -= turns * Math.PI * 2;
    state.poseEpoch = (state.poseEpoch + 1) % 1000000;
  }
  beginAir(state, RAIL_EXIT_IMPULSE * clamp(exitUp, 0.35, 1));
  hooks.onRailEnd?.({ shape, seconds, exitUp });
  return seconds;
}

/** Space mode: the same resolver, a soft lane instead of rails. */
export function stepRiderSpace(state, segment, input, dt) {
  const profile = profileAt(segment, state.segmentProgress, state.short);
  state.profile = profile;
  if (guardFinite(state, profile)) return { rescued: 'nan', profile };
  const steerForce = SPACE_STEER_BASE + state.speed * SPACE_STEER_SPEED;
  state.lateralVelocity += input.steer * steerForce * dt;
  state.lateralVelocity *= Math.exp(-SPACE_LATERAL_DRAG * dt);
  const dx = state.lateralVelocity * dt;
  const substeps = clamp(Math.ceil(Math.abs(dx) / (narrowestZone(profile) * 0.5)), 1, MAX_SUBSTEPS);
  for (let i = 0; i < substeps; i += 1) sweepLateral(state, profile, dx / substeps);
  state.riderState = RIDER.GROUND;
  state.pitch = expApproach(state.pitch, 0, 6, dt);
  state.crouch = expApproach(state.crouch, 0, 8, dt);
  state.railSkimming = false;
  return { rescued: null, profile };
}

/** Put the rider into a clean grounded pose. Used at a segment boundary. */
export function settleRider(state, steer = 0) {
  state.railShape = null;
  state.railIndex = -1;
  state.railSeconds = 0;
  state.grindSide = 0;
  state.grindSeconds = 0;
  state.trickCharge = 0;
  state.trickTier = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.boardFlip = 0;
  state.boardFlipRate = 0;
  state.boardFlipTravelled = 0;
  clearTrickLedger(state);
  state.spinTarget = 0;
  state.flipTarget = 0;
  state.boardFlipTarget = 0;
  state.grabSeconds = 0;
  state.popCharge = 0;
  state.popLoading = false;
  state.crouch = 0;
  state.landingSettle = 0;
  state.stance = 0;
  state.riderState = RIDER.GROUND;
  state.height = 0;
  state.heightVelocity = 0;
  state.spinRate = 0;
  state.flipRate = 0;
  state.airTime = 0;
  snapPose(state, steer);
}

// --- Grind ---------------------------------------------------------------
// Alex: "the grind rails are super cool. they just don't work great and seem
// to maybe slow you down and sometimes they don't end and you're still
// grinding. If you hit one, it should probably speed you up."
//
// So a grind ALWAYS accelerates and it ALWAYS ends. The balance meter is gone:
// it killed grinds early, paid nothing for holding them, and made the rail a
// chore. What is left is a commitment -- you are on the rail's line until you
// leave or it runs out -- and every exit is a launch, never a stop.
const GRIND_HYSTERESIS = 0.2;
const GRIND_MIN_SECONDS = 0.18;
const GRIND_EXIT_STEER = 0.8;
export const GRIND_BAND_GAIN_PER_SECOND = 0.55;

export function beginGrind(state, profile, hooks = {}) {
  const side = Math.sign(state.lateral) || 1;
  state.riderState = RIDER.GRIND;
  state.grindSide = side;
  state.lateral = side * profile.copingX;
  state.lateralVelocity = 0;
  state.height = profile.copingRailH;
  state.heightVelocity = 0;
  state.grindSeconds = 0;
  state.grindLockout = GRIND_HYSTERESIS;
  state.grinds += 1;
  state.grabSeconds = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  clearTrickLedger(state);
  state.airTime = 0;
  snapPose(state, 0);
  hooks.onGrindStart?.({ side });
}

export function endGrind(state, profile, reason, hooks = {}) {
  const side = state.grindSide || 1;
  const seconds = state.grindSeconds;
  state.grindLockout = GRIND_HYSTERESIS;
  state.grindSeconds = 0;
  state.grindSide = 0;
  // Leaving a rail always LAUNCHES. Stepping off into nothing was half of why
  // grinds felt like they slowed you down: the exit was a stop, not a throw.
  state.height = profile.copingRailH;
  state.lateral = side * (profile.copingX - 0.2);
  beginAir(state, reason === 'hop' ? HOP_MAX_IMPULSE : 11 + seconds * 3.5);
  hooks.onGrindEnd?.({ side, seconds, reason });
  return seconds;
}

function stepGrind(state, segment, input, dt, hooks = {}) {
  const profile = state.profile;
  state.grindSeconds += dt;
  state.lateral = state.grindSide * profile.copingX;
  state.lateralVelocity = 0;
  state.height = profile.copingRailH;
  state.heightVelocity = 0;
  const steer = state.inputLockout > 0 ? 0 : input.steer;
  if (state.grindSeconds < GRIND_MIN_SECONDS) return null;
  // Steering hard off the rail is a deliberate exit.
  if (Math.sign(steer) === -state.grindSide && Math.abs(steer) > GRIND_EXIT_STEER) {
    return endGrind(state, profile, 'steer-off', hooks);
  }
  // And the rail ALWAYS runs out. A wall stretch has an end and reaching it
  // throws the rider clear; there is no branch here that can leave someone
  // grinding forever, which is what Alex hit.
  if (!profile.hasWall || profile.wallStrength < 0.25) {
    return endGrind(state, profile, 'rail-ended', hooks);
  }
  return null;
}

export function stepRescue(state, profile, input, dt, hooks = {}) {
  if (state.globalProgress - state.lastSafeStampS >= SAFE_STAMP_INTERVAL) {
    state.safePoint.s = state.globalProgress;
    state.safePoint.lateral = clamp(state.lateral, -profile.roadHalf * 0.6, profile.roadHalf * 0.6);
    state.safePoint.height = 0;
    state.lastSafeStampS = state.globalProgress;
  } else {
    stampSafePoint(state, profile);
  }

  if (state.globalProgress - state.lastStuckCheckS > STUCK_EPSILON) {
    state.lastStuckCheckS = state.globalProgress;
    state.stuckTimer = 0;
  } else {
    state.stuckTimer += dt;
  }

  if (input.respawn) {
    hooks.onRescue?.(rescueRider(state, profile, 'player'));
    return 'player';
  }
  if (state.stuckTimer >= STUCK_SECONDS) {
    hooks.onRescue?.(rescueRider(state, profile, 'stuck'));
    return 'stuck';
  }
  return null;
}

/**
 * Take whole turns out of the pose without moving the board.
 *
 * A landed 720 leaves pitch at 4*PI and a landed 360 leaves yaw a full turn
 * from where it started. Those are the SAME orientation, but left in the
 * numbers they get dragged back to zero later at a rate that reads as a snap.
 * Subtracting whole turns is invisible -- the renderer blends orientations by
 * shortest arc -- and the epoch bump says so out loud.
 */
function wrapWholeTurns(state) {
  const TAU = Math.PI * 2;
  const yawTurns = Math.round((state.yaw - state.stance * Math.PI) / TAU);
  const pitchTurns = Math.round(state.pitch / TAU);
  // The board flip leaves whole turns in roll the same way a flip leaves them
  // in pitch, and for the same reason they have to come out: a double kickflip
  // that keeps 4*PI on the books gets dragged back to zero later, which is the
  // snap this whole function exists to prevent.
  const rollTurns = Math.round(state.roll / TAU);
  const boardTurns = Math.round(state.boardFlip / TAU);
  const stanceTurns = Math.round(state.stance / 2);
  if (yawTurns === 0 && pitchTurns === 0 && rollTurns === 0 && boardTurns === 0 && stanceTurns === 0) return;
  state.yaw -= yawTurns * TAU + stanceTurns * TAU;
  state.pitch -= pitchTurns * TAU;
  state.roll -= rollTurns * TAU;
  state.boardFlip -= boardTurns * TAU;
  state.stance -= stanceTurns * 2;
  state.poseEpoch = (state.poseEpoch + 1) % 1000000;
}

/**
 * The one pose function.
 *
 * The landing settle lives here, and it is the fix for the thing that read as
 * broken: the board eases to its resting angle over a fraction of a second
 * instead of teleporting flat the instant it touches down. A clean landing
 * settles in 0.16s and reads as a stomp; a blown one takes 0.46s and reads as
 * a stumble.
 */
export function riderPose(state, input, dt) {
  if (state.riderState === RIDER.AIR) {
    // The cosmetic bank -- the rider leaning into their own spin. It no longer
    // has to yield to the board flip: they are separate channels now, so the
    // lean and a kickflip can happen at the same time, which is what they do
    // on a real board. `rollTravelled` still guards it because a rail loop
    // owns roll outright while it is turning the rider over.
    if (state.rollTravelled < 0.05) {
      state.roll = expApproach(state.roll, clamp(-state.spinRate * 0.1, -0.75, 0.75), 5, dt);
    }
    return;
  }
  if (state.landingSettle > 0) {
    const remaining = clamp(state.landingSettle / Math.max(1e-6, state.landingSettleTotal), 0, 1);
    const eased = 1 - remaining * remaining;
    state.yaw = lerp(state.landingSettleFrom, state.landingSettleTo, eased);
    state.pitch = lerp(state.landingPitchFrom, state.landingPitchTo, eased);
    // Roll settles onto its nearest WHOLE turn, exactly as pitch does, rather
    // than easing to zero -- a board that flipped once has to finish the flip,
    // not unwind it.
    state.roll = lerp(state.landingRollFrom, state.landingRollTo, eased);
    state.boardFlip = lerp(state.landingBoardFlipFrom, state.landingBoardFlipTo, eased);
    return;
  }
  if (state.settleJustFinished) {
    // Wrap only. Forcing yaw and pitch onto the exact endpoint here was itself
    // a jump: the settle can be cut short by a coping pop or a grind capture,
    // and snapping the remainder away was up to 0.2 rad in one tick. Whatever
    // is left over is finished off by the ordinary ground easing below, which
    // is continuous by construction.
    state.settleJustFinished = false;
    wrapWholeTurns(state);
  }
  const target = groundPoseTarget(state, input.steer);
  state.yaw = expApproach(state.yaw, target.yaw, 6.5, dt);
  state.roll = expApproach(state.roll, target.roll, 5, dt);
  state.boardFlip = expApproach(state.boardFlip, 0, 6, dt);
}

export { ZONE, profileAt, surfaceHeight, surfaceSlope, zoneAt };
