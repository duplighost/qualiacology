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
// Hold to crouch, release to launch. A tap is a quick hop for a quick trick; a
// full load buys enough airtime for a 540. This is where the commitment that
// used to live in a held drift went, and it is the same gesture: load it up,
// let go at the right moment, and what you get back is the size of what you
// put in.
export const HOP_MIN_IMPULSE = 19.5;
export const HOP_MAX_IMPULSE = 34;
export const HOP_CHARGE_SECONDS = 0.28;
export const GRAVITY = 46;
export const AIR_STEER_FORCE = 18;
// A tap gives 0.67s of air and a full load 1.08s. At AIR_SPIN_RATE that is
// 4.8 rad off a tap and 7.8 off a full pop -- so both ends of the charge are
// worth something and the top end is worth committing to.
export const AIR_SPIN_RATE = 12.4;
export const AIR_FLIP_RATE = 9.2;
// The board flip, about the board's long axis. Faster than either of the
// others: a kickflip is a flick of the foot, not a rotation of the whole
// body, and it has to be able to fit two of them inside one hop.
export const AIR_ROLL_RATE = 15.5;
// Without a spin delay the instant of the pop reads as the start of a spin and
// every hop lands crooked. CARVE was right about this one.
export const HOP_SPIN_DELAY = 0.13;

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
// Rotation counts as distance TRAVELLED, so a spin out and back scores; the
// landing is what demands you come down square. Grab and airtime pay too, so a
// big straight pop off a wall is a trick even without rotation.
const TRICK_HALF_TURN = 0.30;   // per half turn of yaw
const TRICK_FLIP = 0.34;        // per full flip of pitch
const TRICK_ROLL = 0.30;        // per full flip of the board
const TRICK_GRAB = 0.42;        // per second held
const TRICK_AIRTIME = 0.26;     // per second airborne
// Charge thresholds for the three flames, reachable in order: a tap hop with a
// grab lights blue, a full pop with a 360 lights orange, and pink wants a wall
// or a rail launch behind it.
// Re-measured after the air was raised for "like a tony hawk game but even
// faster": a full pop is now 1.48 seconds and 12.6 units high, against 1.08 and
// 5.8 before, and the spin ceiling went from 1.24 turns to 2.92.
//
// The whole ladder, driven through the sim with a release timed to land square,
// which is what a player actually does:
//
//   tap + grab                0.61      full pop + grab            1.00
//   tap + 360 + grab          1.21      full pop + 360 + grab      1.60
//   full pop + 720 + grab     2.21      full pop + 900 + grab      2.50
//   full pop + 1080           blown -- 3 turns is past the 2.92 ceiling
//
// The rungs sit BETWEEN those, not on them. On the old thresholds every one of
// these landed pink, which is the same as having no tiers at all.
export const TRICK_TIER_CHARGE = Object.freeze([0.45, 0.90, 1.45]);
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
  state.grabSeconds = 0;
  state.spinTravelled = 0;
  state.flipTravelled = 0;
  state.boardFlipRate = 0;
  state.boardFlipTravelled = 0;
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
 * Every part of the name is read off something the sim already tracks, and
 * nothing is invented: spin is yaw travelled, flip is pitch travelled, the
 * grab is a held second count, switch is the stance flag, and the rail shape
 * is whatever line threw you. A name that claims a component the simulation
 * does not have is a lie the player will eventually catch.
 *
 * Skate naming is degrees plus modifiers, so that is what this is. Spin
 * rounds to the nearest half turn because the landing is judged on half turns
 * -- calling a 340 a 360 is not flattery, it is the same rounding the landing
 * already did.
 */
const GRAB_NAMES = [[0.42, "TUCK"], [0.95, "GRAB"], [Infinity, "BONED"]];
const FLIP_NAMES = ["", "FLIP", "DOUBLE FLIP", "TRIPLE FLIP"];
const ROLL_COUNTS = ["", "", "DOUBLE", "TRIPLE", "QUAD"];
const RAIL_PREFIX = { kicker: "KICKER", sweep: "SWEEP", loop: "LOOP" };

export function trickName(state) {
  const parts = [];
  if (state.launchedFromRail && RAIL_PREFIX[state.launchedFromRail]) {
    parts.push(RAIL_PREFIX[state.launchedFromRail]);
  }
  if (state.stance) parts.push("SWITCH");
  const halfTurns = Math.round(state.spinTravelled / Math.PI);
  if (halfTurns >= 1) parts.push(String(halfTurns * 180));
  const flips = Math.round(state.flipTravelled / (Math.PI * 2));
  if (flips >= 1) parts.push(FLIP_NAMES[Math.min(flips, FLIP_NAMES.length - 1)]);
  // Which way the board went decides which of the two names it gets, the same
  // way it does on a real board.
  const boardFlips = Math.round(state.boardFlipTravelled / (Math.PI * 2));
  if (boardFlips >= 1) {
    const kind = state.boardFlipSide < 0 ? 'KICKFLIP' : 'HEELFLIP';
    parts.push(boardFlips > 1 ? `${ROLL_COUNTS[Math.min(boardFlips, ROLL_COUNTS.length - 1)]} ${kind}` : kind);
  }
  if (state.grabSeconds > 0.08) {
    parts.push(GRAB_NAMES.find(([limit]) => state.grabSeconds < limit)[1]);
  }
  // Something always has a name. A big straight pop off a wall is a trick.
  if (!parts.length) return state.airTime > 0.75 ? "BIG AIR" : "OLLIE";
  return parts.join(" ");
}

/** The running score of the trick currently in the air. */
function scoreTrick(state) {
  return (state.spinTravelled / Math.PI) * TRICK_HALF_TURN
    + (state.flipTravelled / (Math.PI * 2)) * TRICK_FLIP
    + (state.boardFlipTravelled / (Math.PI * 2)) * TRICK_ROLL
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
  return Math.max(
    Math.abs(offsetToNearest(state.yaw, Math.PI)) / LAND_TOLERANCE,
    Math.abs(offsetToNearest(state.pitch, Math.PI * 2)) / LAND_PITCH_TOLERANCE,
    Math.abs(offsetToNearest(state.boardFlip, Math.PI * 2)) / LAND_ROLL_TOLERANCE,
  );
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
      halves: Math.floor(state.spinTravelled / Math.PI),
      flips: Math.floor(state.flipTravelled / (Math.PI * 2)),
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

  // --- lateral and rotational intent --------------------------------------
  if (state.riderState === RIDER.AIR) {
    state.airTime += dt;
    if (input.grab && !locked) state.grabSeconds += dt;
    state.lateralVelocity += steer * AIR_STEER_FORCE * dt;
    state.lateralVelocity *= Math.exp(-0.9 * dt);
    if (state.airTime >= HOP_SPIN_DELAY) {
      state.spinRate = steer * AIR_SPIN_RATE;
      state.flipRate = (locked ? 0 : input.pitch) * AIR_FLIP_RATE;
      // The board flip. Alex: "there should be tricks where your flip your
      // board as well." The BOARD -- so this drives `boardFlip`, which the rig
      // applies to the deck alone. Driving `roll` here inverted the rider too,
      // and a rider on their side in mid-air reads as a crash.
      state.boardFlipRate = (locked ? 0 : input.roll) * AIR_ROLL_RATE;
      if (Math.abs(input.roll) > 0.2) state.boardFlipSide = Math.sign(input.roll);
      if (Math.abs(steer) > 0.2) state.spinSide = Math.sign(steer);
    }
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
      // Input tapers out rather than being cut, so a player still holding the
      // spin does not feel the controls go dead -- the board just stops
      // arguing with the ground.
      const taper = 1 - assist;
      state.spinRate *= taper;
      state.flipRate *= taper;
      state.boardFlipRate *= taper;
      // Spend from a fixed budget, tracked per channel. Once it is gone the
      // orientation is whatever the player left it at, which is the whole
      // reason a wild miss is still a miss.
      const pull = (channel, value, step) => {
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
    state.yaw += state.spinRate * dt;
    state.pitch += state.flipRate * dt;
    state.roll += state.rollRate * dt;
    state.boardFlip += state.boardFlipRate * dt;
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
    if (state.landingSettle <= 0) state.pitch = expApproach(state.pitch, 0, 9, dt);
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
