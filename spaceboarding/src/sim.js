import {
  COURSE,
  RIVALS,
  SLICE_SEGMENT_COUNT,
  getSegment,
  hashText,
  mulberry32,
  segmentLength,
} from './content.js';
import { insideEnvelope, profileAt } from './profile.js';
import { RAIL_BAND_GAIN_PER_SECOND } from './rails.js';
import {
  GRIND_BAND_GAIN_PER_SECOND,
  RIDER,
  RIDER_STATES,
  TRICK_TIER_CHARGE,
  TRICK_TIER_COLOR,
  createRiderState,
  riderPose,
  snapPose,
  settleRider,
  reconcileToProfile,
  stepRescue,
  stepRider,
  stepRiderSpace,
} from './rider.js';

export const FIXED_STEP = 1 / 120;
// Upstream this was SPACE_WEAPONS_ARM_FRACTION: the point where the guns armed
// after launch. Space combat is cut (see docs/PLAN.md — firing auto-locked and
// always hit, so there was nothing to aim and nothing to miss), but the same
// fraction was doing a second, unrelated job in the renderer: it marks the
// moment the rocket has visibly cleared the departure structure, which is what
// the ash flow and departure FX ramp against. That job survives; the name has
// been corrected to say what it actually means.
export const SPACE_DEPARTURE_FRACTION = 0.045;

// --- The speed band -------------------------------------------------------
// Upstream, speed could never regress -- the last line of the speed update was
// state.speed = Math.max(floor, carried, speed) + accel*dt -- and every boost
// stacked on that floor with nothing above it. Measured on the deployed build
// (seed 1337, hold-forward): World I 15.4s, World IX 2.0s. Speed climbed 5.4x
// while segment lengths stayed flat. That was not a tuning accident; it was
// the shape of the equation.
//
// So the equation is gone. Each segment authors a par (cruise) and a cap
// (par * BAND_CAP, in content.js). Doing nothing settles you at par. Technique
// injects overspeed into the band, and overspeed decays back to zero. The cap
// is hard: a stacked chain of boosts is worth no more than one perfect one,
// which is what keeps a late world from collapsing.
//
// The boost meter is DERIVED from overspeed rather than stored beside it, so
// the bar the player reads and the speed they are carrying cannot disagree.
const PAR_APPROACH = 1.15;      // s^-1 -- how fast cruise settles onto par
// A boost ATTACKS. Alex, after playing the impulse version: "i do some. then i
// just see it go down."  That is exactly what an impulse looks like — the meter
// teleported to its peak in a single frame, twice, and the only motion left for
// the eye to follow was four seconds of decay. Magnitude was never the problem
// by then; the problem was that the rise had no duration, and a reward you
// cannot watch arrive is a reward that did not happen.
//
// So the rise is a chase again, but a fast one: ~0.18s to full, which is about
// eleven frames of the bar slamming up. 7.0 was the value that starved it (the
// chase was slower than the pulse it was chasing, so the peak collapsed before
// it arrived); 18 outruns even the shortest pulse and keeps ~95% of the height
// while giving the slam back.
const OVERSPEED_RISE = 18.0;    // s^-1 -- fast enough to punch, slow enough to SEE
const OVERSPEED_FALL = 0.9;     // s^-1 -- and bleeds out slowly enough to feel earned
const BAND_FLOOR = 0.55;        // hard stall guard as a fraction of par
// Converts a reward's abstract 0..1 "strength" into a fraction of the band,
// and into seconds. Trick tiers pass explicit durations instead.
const BOOST_POWER_SCALE = 2.4;
const BOOST_SECONDS_BASE = 0.45;
const BOOST_SECONDS_SCALE = 2.6;

// --- Sharpness: the live measure of how well the player is racing ----------
// A rate, not a ledger: it rises on earned technique, decays on its own, and
// is cut by mistakes. Stop racing well and it bleeds away within a few
// seconds. Decay is proportional rather than linear — linear decay is
// bistable, saturating at 1 or emptying to 0, where a proportional drain
// settles near (gain rate / decay) and so reads as current form. Half-life is
// about five seconds.
//
// Landing tricks and holding rails are the two earners. Drift used to be a
// third; Alex cut it after playing.
export const SHARPNESS_DECAY = 0.14;          // proportional, per second

// Trick and grind both feed the same measure, weighted by how much commitment
// each one actually takes.
export const SHARPNESS_GAIN = Object.freeze({
  trick: 0.34,
  rail: 0.30,
  grind: 0.24,
});
export const SHARPNESS_LOSS = Object.freeze({
  wallKiss: 0.13,
  blown: 0.3,
});
// Sharpness no longer bends the race -- Phase 7 gave the rivals their own pace
// lines and nothing on their side reads the player at all. It survives as what
// it always measured: current form. The renderer publishes it as the edge heat,
// so "I am racing well right now" is something the player feels at the corner
// of the frame rather than a number to read.

const EPSILON = 1e-7;

// --- Space: the glide -----------------------------------------------------
// A crossing is the breath between planets: shorter, freer, still racing. It
// is NOT a shooting gallery -- see Phase 1. What is left to do with your hands
// is thread the boost rings, roll through them, and draft the field.
//
// Hop is the DASH here. Alex read the first version exactly right: "I'm not
// sure what a barrel roll does. but it seems to me it could help the player
// move from side to side faster to go through those rings." So now it does.
// One tap throws the glider sideways -- instantly, in the direction you are
// leaning -- and the roll is what that looks like from behind. A ring threaded
// mid-dash is still worth double, so the move is both the way you REACH a ring
// and the way you cash it, and the button has one obvious use instead of none.
//
// The whole cycle is tuned against the ring spacing: dash plus cooldown comes
// in just under the gap between rings at par, so you can dash for any single
// ring but never for every ring in a row. Choosing which is the skill.
const RING_TOLERANCE = 0.22;        // fraction of segment width
export const ROLL_SECONDS = 0.44;
const ROLL_COOLDOWN = 0.16;
// The shove itself. Against the glide's lateral drag this is worth about five
// units of travel -- close to one ring's offset, which is the gap the dash
// exists to close.
const SPACE_DASH_IMPULSE = 20;
const ROLL_RING_MULTIPLIER = 2;
// Slipstream, from IONWAKE: a draft window just behind a rival, close in lane.
// Expressed in absolute units here rather than normalised-t, because segment
// lengths differ by a factor of three across the course.
const SLIPSTREAM_MIN_GAP = 20;
const SLIPSTREAM_MAX_GAP = 420;
const SLIPSTREAM_LANE = 5.2;
const SLIPSTREAM_BAND_GAIN = 0.22;  // fraction of the band per second

const LAUNCH_LIFT_WINDOW_SECONDS = 0.94;
const LAUNCH_LIFT_ACCELERATION = 17.55;
const LAUNCH_EXIT_LIFT_VELOCITY = 15.5;
const REENTRY_ARC_START_FRACTION = 0.70;
const REENTRY_ARC_HEIGHT = 3.4;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / Math.max(EPSILON, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const expApproach = (value, target, sharpness, dt) => lerp(value, target, 1 - Math.exp(-sharpness * dt));

function event(state, type, data = {}) {
  state.events.push({ type, time: state.time, ...data });
  if (state.events.length > 64) state.events.splice(0, state.events.length - 64);
}

function segmentStartDistance(index, short) {
  let sum = 0;
  for (let i = 0; i < index; i += 1) sum += segmentLength(COURSE[i], short);
  return sum;
}

function segmentIndexAtDistance(distance, short) {
  let cursor = Math.max(0, distance);
  for (let i = 0; i < COURSE.length; i += 1) {
    const length = segmentLength(COURSE[i], short);
    if (cursor < length || i === COURSE.length - 1) return i;
    cursor -= length;
  }
  return COURSE.length - 1;
}

function localDistanceAtGlobal(distance, short) {
  const index = segmentIndexAtDistance(distance, short);
  return distance - segmentStartDistance(index, short);
}

export function locateCourseDistance(distance, short = false) {
  const segmentIndex = segmentIndexAtDistance(distance, short);
  const segment = COURSE[segmentIndex];
  const localProgress = localDistanceAtGlobal(distance, short);
  return {
    segmentIndex,
    segment,
    localProgress,
    fraction: clamp(localProgress / segmentLength(segment, short), 0, 1),
  };
}

// Deterministic per-state RNG. Unused while combat is stripped out; Phase 7's
// rivals need seeded per-segment variation, so it stays.
function random01(state, salt = 0) {
  let x = (state.seed ^ Math.imul((state.randomCounter + 1 + salt) >>> 0, 0x9e3779b1)) >>> 0;
  state.randomCounter += 1;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// The control vocabulary. There is deliberately no throttle: the board always
// runs, and speed is earned through technique rather than held down. That
// deletes the hold-W degenerate strategy structurally instead of tuning
// around it. See docs/PLAN.md "Controls".
//
//   steer    A / D          ground: steer   ·  air: spin
//   pitch    W / S          air: flip
//   hop      Space          hold to load the board, release to pop
//   grab     Shift          ground: tuck    ·  air: grab
//   respawn  R              rescue to the last safe point
export function normalizeInput(input = {}) {
  return {
    steer: clamp(Number(input.steer) || 0, -1, 1),
    pitch: clamp(Number(input.pitch) || 0, -1, 1),
    roll: clamp(Number(input.roll) || 0, -1, 1),
    hop: Boolean(input.hop),
    grab: Boolean(input.grab),
    respawn: Boolean(input.respawn),
  };
}

export function createRaceState(options = {}) {
  const short = Boolean(options.short);
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) >>> 0 : 0x9e9d11e5;
  let segmentIndex = 0;
  if (options.startSegmentId) {
    const segment = getSegment(options.startSegmentId);
    const found = segment ? COURSE.indexOf(segment) : -1;
    if (found >= 0) segmentIndex = found;
  }
  const startDistance = segmentStartDistance(segmentIndex, short);
  // Open as a readable chase pack, so the first thing the player sees is three
  // racers to chase rather than an empty road.
  const rivalStarts = [920, 520, 180];
  const rivals = RIVALS.map((rival, i) => ({
    ...rival,
    globalProgress: Math.max(0, startDistance + rivalStarts[i]),
    speed: COURSE[segmentIndex].baseSpeed * rival.pace,
    lateral: Math.sin(rival.laneSeed) * 4,
    lateralVelocity: 0,
    overspeed: 0,
    nextBoostAt: startDistance + rivalStarts[i],
    boosts: 0,
    hitFlash: 0,
  }));
  return {
    build: '0.1.0',
    seed,
    randomCounter: 0,
    short,
    started: Boolean(options.started),
    finished: false,
    time: 0,
    segmentIndex,
    segmentProgress: 0,
    globalProgress: startDistance,
    mode: COURSE[segmentIndex].type,
    speed: COURSE[segmentIndex].baseSpeed,
    segmentElapsed: 1,
    segmentEntrySpeed: COURSE[segmentIndex].baseSpeed,
    minimumObservedSpeed: Infinity,
    // The last segment of this run. The slice (Planets I-III + Crossings 1-2)
    // is the tuning target and the thing Alex plays first; the full course is
    // still here behind ?slice=0.
    finalSegmentIndex: Math.min(
      COURSE.length - 1,
      options.slice === false ? COURSE.length - 1 : SLICE_SEGMENT_COUNT - 1,
    ),
    // Speed above par, in speed units. Decays to zero on its own; the boost
    // meter is derived from it so the two can never disagree.
    overspeed: 0,
    boostPower: 0,
    boostTimer: 0,
    boostDuration: 0,
    // Space glide
    rollTimer: 0,
    rollCooldown: 0,
    rollDirection: 0,
    dashes: 0,
    rollStart: 0,
    ringsHit: 0,
    ringsRolled: 0,
    ringsMissed: 0,
    slipstreamSeconds: 0,
    boost: 0,
    lateral: 0,
    lateralVelocity: 0,
    yaw: 0,
    roll: 0,
    // The board's own rotation about its long axis, under a rider who stays
    // upright. Separate from `roll`, which inverts the whole figure.
    boardFlip: 0,
    // The renderer's height channel is composed, not stored: the scripted
    // launch/re-entry arc and the rider's own hop height are separate truths
    // that add. Keeping them apart is what lets a player hop during a launch
    // without either one snapping.
    lift: 0,
    liftVelocity: 0,
    arcHeight: 0,
    arcVelocity: 0,
    wallContactCooldown: 0,
    wallContactSide: 0,
    railSkimming: false,
    lastSteerSide: 0,
    combo: 1,
    comboTimer: 0,
    // How long the rider has been back on the ground with a chain still open.
    // This is what actually pays the bank out -- see COMBO_GROUND_WINDOW.
    comboGroundTimer: 0,
    // The live band height, published by stepSpeedBand for the boost impulse.
    bandWidth: 1,
    // What the current chain has banked, and what it is worth. See cashCombo.
    comboBank: 0,
    comboCount: 0,
    comboScore: 0,
    comboSeconds: 0,
    comboMoves: [],
    lastComboScore: 0,
    bestComboScore: 0,
    totalScore: 0,
    position: 4,
    // Retained for the renderer's damage flash channel. Nothing drives it up
    // any more; Phase 5's bail is what will light it again.
    incomingHitFlash: 0,
    gateBoosts: 0,
    tricksLandedCount: 0,
    tricksBlownCount: 0,
    railSecondsTotal: 0,
    trickTierCounts: [0, 0, 0],
    grindSecondsTotal: 0,
    grazes: 0,
    wallKisses: 0,
    sharpness: 0,
    sharpnessPeak: 0,
    transitions: 0,
    currentGate: -1,
    lastHop: false,
    lastInput: normalizeInput(),
    laneHistory: [],
    ...createRiderState(COURSE[segmentIndex]),
    visited: [COURSE[segmentIndex].id],
    rivals,
    events: [],
    finishTime: null,
    finalPosition: null,
  };
}

export function startRace(state) {
  if (state.started || state.finished) return;
  state.started = true;
  event(state, 'race-start', { segment: COURSE[state.segmentIndex].id, intensity: 1 });
}

export function currentSegment(state) {
  return COURSE[state.segmentIndex];
}

export function getSegmentFraction(state) {
  return clamp(state.segmentProgress / segmentLength(currentSegment(state), state.short), 0, 1);
}

export function getMorphState(state) {
  const segment = currentSegment(state);
  return morphAt(segment, state.segmentProgress, state.short);
}

export function morphAt(segment, localProgress, short = false) {
  const fraction = clamp(localProgress / segmentLength(segment, short), 0, 1);
  if (segment.type === 'planet') {
    const morph = smoothstep(0.83, 0.965, fraction);
    return { morph, launch: smoothstep(0.76, 1, fraction), landing: 0, surface: 1 - morph };
  }
  const landing = smoothstep(0.80, 0.985, fraction);
  return { morph: 1 - landing, launch: smoothstep(0, 0.08, fraction), landing, surface: landing };
}

export function trackSample(segment, distance, lengthScale = 1) {
  const p = distance / Math.max(lengthScale, EPSILON);
  if (segment.type === 'space') {
    if (segment.index === 1) {
      const fraction = clamp(distance / Math.max(segment.length * lengthScale, EPSILON), 0, 1);
      const nave = smoothstep(0.08, 0.32, fraction);
      const aisle = smoothstep(0.28, 0.72, fraction);
      const approach = smoothstep(0.74, 1, fraction);
      return {
        x: Math.sin(p * 0.00125 + 0.7) * 5.5
          + Math.sin(p * 0.0032) * (2.2 + aisle * 3.8)
          + approach * approach * 7.5,
        y: Math.sin(p * 0.0017 + 0.4) * 3.4
          + Math.sin(p * 0.0045) * nave * 2.4
          - approach * approach * 7,
        bank: Math.sin(p * 0.0019 + 1) * 0.17 + Math.sin(p * 0.0041) * aisle * 0.12,
        width: segment.width * (1 - smoothstep(0.34, 0.63, fraction) * 0.12 + approach * 0.08),
      };
    }
    return {
      x: Math.sin(p * 0.0017 + segment.index * 0.7) * (4 + segment.index * 0.35)
        + Math.sin(p * 0.0041 + segment.index) * 2.5,
      y: Math.sin(p * 0.0023 + segment.index * 0.4) * 3.2,
      bank: Math.sin(p * 0.002 + segment.index) * 0.22,
      width: segment.width,
    };
  }
  const [ampA, ampB, freqA, freqB] = segment.curve;
  const [hillAmp, hillFreq] = segment.hills;
  const fraction = clamp(distance / Math.max(segment.length * lengthScale, EPSILON), 0, 1);
  const launchRamp = smoothstep(0.78, 1, fraction);
  if (segment.index === 1) {
    const furnace = smoothstep(0.14, 0.31, fraction) * (1 - smoothstep(0.52, 0.66, fraction));
    const canyon = smoothstep(0.48, 0.62, fraction) * (1 - smoothstep(0.74, 0.81, fraction));
    const caldera = smoothstep(0.70, 0.82, fraction);
    return {
      x: Math.sin(p * 0.00108 + 0.35) * 5.2
        + Math.sin(p * 0.00355 + 1.1) * (2.2 + furnace * 8.8)
        + Math.sin(p * 0.0061) * canyon * 2.1,
      y: Math.sin(p * 0.00132 + 0.6) * 2.1
        + Math.sin(p * 0.0031) * furnace * 2.8
        + canyon * 1.6
        + launchRamp * launchRamp * 96,
      bank: Math.sin(p * 0.00115 + 0.8) * 0.09
        + Math.sin(p * 0.00355 + 1.55) * furnace * 0.28
        + Math.sin(p * 0.0056) * canyon * 0.17
        + launchRamp * 0.22,
      width: segment.width * (1 - canyon * 0.18 - caldera * 0.09),
    };
  }
  return {
    x: Math.sin(p * freqA + segment.index * 0.61) * ampA
      + Math.sin(p * freqB + segment.index * 1.17) * ampB,
    y: Math.sin(p * hillFreq + segment.index * 0.53) * hillAmp + launchRamp * launchRamp * 46,
    bank: Math.sin(p * (freqA * 0.86) + segment.index) * segment.bank + launchRamp * 0.16,
    width: segment.width * (1 - launchRamp * 0.12),
  };
}

// Gates never sit on the centre line.
//
// They used to: the lane was sin(phase) * width * 0.32 and success was
// |lateral - target| < width * 0.22, so a player holding nothing at lateral 0
// cleared roughly two gates in three and was paid boost for it. Free speed for
// doing nothing is exactly what this game is not, and it also made the par
// measurement a lie -- a hands-off run was 22% faster than par.
//
// Every gimmick's raw lane is now pushed into a band on one side or the other,
// so reaching a gate always costs a real lane change. The renderer imports
// this same function to place the visible gate, so what you aim at and what
// scores are one value.
const GATE_MIN_OFFSET = 0.22;   // fraction of road width from the centre line
const GATE_MAX_OFFSET = 0.42;
export const GATE_SUCCESS_TOLERANCE = 0.12;

function offCentre(raw, width) {
  const side = Math.sign(raw) || 1;
  const magnitude = Math.min(1, Math.abs(raw) / (width * GATE_MAX_OFFSET));
  return side * width * (GATE_MIN_OFFSET + magnitude * (GATE_MAX_OFFSET - GATE_MIN_OFFSET));
}

export function gateTarget(segment, gateIndex, state = null) {
  const width = segment.width;
  const phase = gateIndex * 1.61803398875 + segment.index * 0.731;
  const raw = (() => {
    switch (segment.gimmick.id) {
      case 'magnetic-lane-swap': return ((gateIndex % 2) * 2 - 1) * width * 0.34;
      case 'wormwake': return Math.sin(phase * 0.83) * width * 0.42;
      case 'gravity-tides': return Math.sin(phase * 1.31) * width * 0.38;
      case 'echo-gates': {
        if (!state?.laneHistory.length) break;
        const past = state.laneHistory[Math.max(0, state.laneHistory.length - 12)];
        return clamp(-(past?.lateral ?? 0), -width * 0.42, width * 0.42);
      }
      case 'solar-crown': return Math.sin(phase * 3.1) * width * 0.28;
      case 'dark-current': return Math.sin(phase * 0.55) * width * 0.4;
      case 'flare-surfing': return ((gateIndex % 3) - 1) * width * 0.3 || width * 0.3;
      default: break;
    }
    return Math.sin(phase * 2.17) * width * 0.32;
  })();
  return offCentre(raw, width);
}

// --- The combo, and when it pays -----------------------------------------
//
// Alex: "just have the boost launch immediately after you finish the combo of
// tricks and grinds or whatever. it seems like it goes down anyway."
//
// He is describing a real defect and not a preference. Every reward used to
// fire its whole pulse the instant it was earned, so a chain of five tricks
// was five overlapping pulses that each decayed under the next -- the boost
// bar went up and came straight back down five times and the player never got
// a moment that felt like the chain paying off. The combo multiplier existed
// but only quietly scaled each pulse, and there was no discrete moment when a
// combo ENDED at all: it was an inequality evaluated silently once a tick,
// with no event and no hook.
//
// Now a reward is split. A quarter of it lands immediately, because an input
// with no response is a dead input. The other three quarters go into the
// bank, and when the chain finally lapses the bank fires as ONE boost, scaled
// by the multiplier the chain earned. Chaining is worth more than not, the
// payoff arrives as a single launch you can feel, and "the combo ended" is a
// real event that the HUD and the audio can both hear.
// Raised from 0.25 for the same reason the pulse got shorter -- the player has
// to feel the trick when they land it, not a second and a half afterwards.
//
// 0.35 is a measured ceiling, not a preference. This share is GLOBAL: it splits
// the rail and grind payouts too, and at 0.40 the grind line overtakes the rail
// line and breaks the gate that says a committed aerial line beats grinding the
// coping.
const COMBO_IMMEDIATE_SHARE = 0.35;
// Short on purpose. The window has to be long enough to land a trick, hit a
// rail and land another, and short enough that "immediately after you finish
// the combo" is literally true. 3.25s -- the old value -- is an age.
//
// It is now the OUTER window, and it only decides the payout when the player
// is still visibly on a line: a rail, a grind, or back in the air. See
// COMBO_GROUND_WINDOW for what happens when they are just standing there.
const COMBO_WINDOW = 1.5;
// Alex: "just have the boost launch immediately after you finish the combo."
//
// It did not. The bank fired when the 1.5s chain window LAPSED, so the surge
// arrived a second and a half after the last landing, while the player was
// riding along doing nothing -- a reward attached to a timer nobody can see
// instead of to the thing they did. Once the rider is back on the ground with
// no new air started, the chain is over and it pays out on the stomp. The long
// window survives only for rail and grind continuation, where the player can
// SEE they are still on a line.
//
// Long enough to cover the dirty landing settle (LAND_SETTLE_DIRTY, 0.46s) is
// deliberately NOT the target -- the payout should land while the board is
// still coming flat, not after it has finished.
const COMBO_GROUND_WINDOW = 0.42;

// Sharpness moves only through here so every gain and loss is one audited
// place. Positive deltas are earned technique, negative ones are damage.
function addSharpness(state, delta) {
  state.sharpness = clamp(state.sharpness + delta, 0, 1);
  if (state.sharpness > state.sharpnessPeak) state.sharpnessPeak = state.sharpness;
  return state.sharpness;
}

// One way in for every earned speed reward. Boosts extend and deepen; they do
// not stack past the band, so a chain of small rewards can never out-run one
// clean big one. That ceiling is the whole point -- see the band notes above.
//
// strength is 0..1 in reward units; options.duration overrides the derived
// seconds (Phase 4's drift tiers author 0.72 / 1.18 / 1.78 s directly).
function addBoost(state, amount, type, data = {}, options = {}) {
  const scaled = amount * (1 + Math.min(2.5, state.combo * 0.06));
  // An authored power wins over the derived one. Trick tiers are exact values
  // a player learns; gimmick gates are a scale.
  const full = clamp(options.power ?? scaled * BOOST_POWER_SCALE, 0, 1);
  const duration = options.duration ?? (BOOST_SECONDS_BASE + amount * BOOST_SECONDS_SCALE);
  // A quarter now, three quarters into the bank. See COMBO_IMMEDIATE_SHARE.
  // Rings are the exception: a crossing has no ground under it to chain from,
  // so a ring pays in full where it is hit.
  const banks = !options.immediate;
  const power = banks ? full * COMBO_IMMEDIATE_SHARE : full;
  state.boostPower = Math.max(state.boostPower, power);
  state.boostTimer = Math.max(state.boostTimer, duration);
  state.boostDuration = Math.max(state.boostDuration, duration);
  state.combo = clamp(state.combo + (options.comboGain ?? 0.22), 1, 9.9);
  state.comboTimer = COMBO_WINDOW;
  if (banks) {
    state.comboBank += full * (1 - COMBO_IMMEDIATE_SHARE);
    state.comboSeconds = Math.max(state.comboSeconds, duration);
    state.comboCount += 1;
    state.comboScore += Math.round(amount * 1000);
    if (data.name) state.comboMoves.push(data.name);
  }
  event(state, type, {
    amount: scaled,
    power,
    duration,
    intensity: clamp(scaled * 5, options.minimumIntensity ?? 0.25, 1),
    ...data,
  });
}

/**
 * The chain lapsed. Pay it.
 *
 * One boost, the size of everything banked, multiplied by the chain the player
 * actually built -- and a single event carrying the whole run, which is what
 * the trick banner reads. This is the moment the combo exists for.
 */
function cashCombo(state) {
  const bank = state.comboBank;
  const count = state.comboCount;
  if (bank <= 0 || count <= 0) {
    state.comboBank = 0;
    state.comboCount = 0;
    state.comboScore = 0;
    state.comboMoves.length = 0;
    return;
  }
  const multiplier = 1 + Math.min(2.5, state.combo * 0.06);
  const power = clamp(bank * multiplier, 0, 1);
  const duration = clamp(state.comboSeconds * (1 + count * 0.25), 0.8, 4.2);
  state.boostPower = Math.max(state.boostPower, power);
  state.boostTimer = Math.max(state.boostTimer, duration);
  state.boostDuration = Math.max(state.boostDuration, duration);
  const score = Math.round(state.comboScore * multiplier);
  state.lastComboScore = score;
  state.bestComboScore = Math.max(state.bestComboScore, score);
  state.totalScore += score;
  event(state, 'combo-cashed', {
    power,
    duration,
    count,
    multiplier: Number(multiplier.toFixed(2)),
    score,
    moves: [...state.comboMoves],
    intensity: clamp(0.45 + power * 0.55, 0.45, 1),
  });
  state.comboBank = 0;
  state.comboCount = 0;
  state.comboScore = 0;
  state.comboSeconds = 0;
  state.comboGroundTimer = COMBO_GROUND_WINDOW;
  state.comboMoves.length = 0;
}

// The whole speed model, in one place, so it can never be half-changed.
function stepSpeedBand(state, segment, dt) {
  const par = segment.baseSpeed;
  const cap = segment.maxSpeed;
  const width = Math.max(1, cap - par);
  // Published so an impulse awarded later this tick knows how tall the band
  // is. One writer, read-only everywhere else.
  state.bandWidth = width;
  if (state.boostTimer > 0) {
    state.boostTimer = Math.max(0, state.boostTimer - dt);
    if (state.boostTimer <= 0) {
      state.boostPower = 0;
      state.boostDuration = 0;
    }
  }
  // A boost is a PULSE, not a plateau: it peaks on release and falls away
  // across its duration. docs/PLAN.md asks for exactly this -- "boosts push
  // above it temporarily, decaying back to par" -- and the shape matters more
  // than it sounds. Held flat, a chained boost sat near the band cap for most
  // of a lap and was worth 35% of the run; that is the SURGE problem coming
  // back through a different door. As a pulse the peak stays big and legible
  // while the average stays honest.
  const shape = state.boostDuration > 0 ? state.boostTimer / state.boostDuration : 0;
  const overspeedTarget = state.boostPower * width * shape;
  const overspeedRate = overspeedTarget > state.overspeed ? OVERSPEED_RISE : OVERSPEED_FALL;
  state.overspeed = clamp(expApproach(state.overspeed, overspeedTarget, overspeedRate, dt), 0, width);
  const carried = Number.isFinite(state.speed) ? state.speed : par;
  // Chasing the target harder while boosted is what makes a turbo feel like a
  // shove rather than a slow inflation -- and at 3.4 it was still the slow
  // inflation. A full cash put the bar at 0.6 and then took most of a second to
  // convert it into speed, so the number climbed long after the moment that
  // earned it. At 7.2 a big boost arrives in about 0.18s: the bar slams up and
  // the world goes with it, which is the whole of "blast off hard".
  //
  // It is deliberately scaled BY the boost, so cruising is untouched -- this
  // steepens the reward and nothing else.
  const approach = PAR_APPROACH + (state.overspeed / width) * 7.2;
  // The ceiling is max(cap, carried), not cap. Crossing from a fast crossing
  // onto a slow planet carries real velocity over the boundary -- clamping to
  // the new cap would snap it down in one tick and put a jolt exactly where
  // the game's best moment is. Because the target is always par + overspeed
  // (which is <= cap), carried speed can only ever decay from above; it can
  // never be gained back above the cap.
  const ceiling = Math.max(cap, carried);
  state.speed = clamp(expApproach(carried, par + state.overspeed, approach, dt), par * BAND_FLOOR, ceiling);
  state.boost = state.overspeed / width;
}

function processSurfaceGimmick(state, segment, input, gateIndex) {
  const target = gateTarget(segment, gateIndex, state);
  const delta = Math.abs(state.lateral - target);
  let success = delta < segment.width * GATE_SUCCESS_TOLERANCE;
  let reward = segment.gimmick.reward;
  // Riding the rail is not a way to collect a gate. Wall contact suppresses
  // the reward for as long as the contact latch is live, so a barrier can
  // never become a second propulsion source.
  const rewardEligible = state.wallContactSide === 0;
  switch (segment.gimmick.id) {
    case 'thermal-vent-slings':
      if (success && rewardEligible) {
        state.liftVelocity += 8.5;
        addBoost(state, reward, 'thermal-sling', { target });
      } else {
        state.lateralVelocity += Math.sign(state.lateral - target || 1) * 2.5;
        event(state, 'vent-burst', { intensity: 0.45, target });
      }
      break;
    case 'lightning-rails':
      success = success && rewardEligible;
      if (success) addBoost(state, reward, 'lightning-ride', { target });
      else state.lateralVelocity += Math.sign(target - state.lateral) * 2.2;
      break;
    case 'vine-gates':
      if (rewardEligible && (success || Math.abs(state.lateralVelocity) > 10)) addBoost(state, reward, 'vine-cut', { target });
      else state.lateralVelocity += Math.sign(target - state.lateral) * 3.1;
      break;
    case 'friction-bloom':
      success = state.riderState === 'air' && state.trickCharge > 0.1;
      if (success && rewardEligible) addBoost(state, reward + state.trickCharge * 0.15, 'ice-bloom', { target });
      else event(state, 'ice-crack', { intensity: 0.38, target });
      break;
    case 'magnetic-lane-swap':
      state.lateralVelocity += clamp(target - state.lateral, -5, 5) * 1.7;
      if (rewardEligible && success) addBoost(state, reward, 'magnetic-throw', { target });
      break;
    case 'wormwake':
      if (success && rewardEligible) {
        state.liftVelocity += 6.2;
        addBoost(state, reward, 'worm-surf', { target });
      } else event(state, 'worm-pass', { intensity: 0.5, target });
      break;
    case 'gravity-tides':
      if (rewardEligible && success && Math.sign(input.steer || target) === Math.sign(target || 1)) addBoost(state, reward, 'gravity-lean', { target });
      else state.lateralVelocity += Math.sign(target - state.lateral) * 3.5;
      break;
    case 'echo-gates': {
      const oldLane = state.laneHistory[Math.max(0, state.laneHistory.length - 12)]?.lateral ?? 0;
      success = Math.abs(state.lateral - oldLane) > segment.width * 0.19;
      if (success && rewardEligible) addBoost(state, reward, 'echo-break', { target: oldLane });
      else state.lateralVelocity += Math.sign(state.lateral || 1) * 4.2;
      break;
    }
    case 'solar-crown':
      if (rewardEligible && (success || state.boost > 0.7)) addBoost(state, reward, 'crown-ring', { target });
      else event(state, 'sun-skim', { intensity: 0.62, target });
      break;
    default:
      if (success && rewardEligible) addBoost(state, reward, 'gate-boost', { target });
  }
  if (success && rewardEligible) state.gateBoosts += 1;
}

function processSpaceGimmick(state, segment, input, dt) {
  const p = state.segmentProgress;
  const width = segment.width;
  switch (segment.gimmick.id) {
    case 'asteroid-cathedral':
      if (Math.abs(state.lateral) > width * 0.28) state.grazes += dt * 0.8;
      break;
    case 'ion-polarity': {
      const polarity = Math.sin(p * 0.013) >= 0 ? 1 : -1;
      state.lateralVelocity += polarity * 4.2 * dt;
      if (input.steer * polarity < -0.25) state.boost = clamp(state.boost + dt * 0.018, 0, 1);
      break;
    }
    case 'comet-drafting': {
      const wake = Math.sin(p * 0.009 + state.time) * width * 0.34;
      if (Math.abs(state.lateral - wake) < 2.8) state.boost = clamp(state.boost + dt * 0.045, 0, 1);
      break;
    }
    case 'mirror-decoys':
      if (Math.abs(input.steer) > 0.25) state.boost = clamp(state.boost + dt * 0.018, 0, 1);
      break;
    case 'ghost-slipstream': {
      const convoyLane = ((Math.floor(p / 500) % 3) - 1) * width * 0.28;
      if (Math.abs(state.lateral - convoyLane) < 3.4) state.boost = clamp(state.boost + dt * 0.055, 0, 1);
      break;
    }
    case 'dark-current':
      state.lateralVelocity += Math.sin(p * 0.004 + state.time * 0.7) * 8.5 * dt;
      if (Math.abs(input.steer) > 0.2) state.boost = clamp(state.boost + dt * 0.025, 0, 1);
      break;
    case 'echo-volley':
      break;
    case 'flare-surfing': {
      const flare = Math.sin(p * 0.006) > 0.72;
      if (flare && Math.abs(input.steer) > 0.2) state.boost = clamp(state.boost + dt * 0.08, 0, 1);
      else if (flare) state.lateralVelocity += Math.sin(state.time * 8) * dt * 7;
      break;
    }
    default:
      break;
  }
}

function processGate(state, segment, input) {
  const spacing = segment.gimmick.spacing * (state.short ? 0.16 : 1);
  const gate = Math.floor(state.segmentProgress / Math.max(spacing, 18));
  if (gate <= state.currentGate) return;
  state.currentGate = gate;
  if (gate === 0) return;
  if (segment.type === 'planet') {
    processSurfaceGimmick(state, segment, input, gate);
    return;
  }
  // A boost ring. Thread it for speed; roll through it for double. The ring
  // tolerance is wider than a planet gate's because the glider is faster and
  // the crossing is meant to feel free rather than exacting.
  const target = gateTarget(segment, gate, state);
  const through = Math.abs(state.lateral - target) < segment.width * RING_TOLERANCE;
  const rolling = state.rollTimer > 0;
  if (through) {
    state.ringsHit += 1;
    if (rolling) state.ringsRolled += 1;
    addBoost(
      state,
      segment.gimmick.reward * (rolling ? ROLL_RING_MULTIPLIER : 1),
      rolling ? 'ring-rolled' : 'ring',
      { target, rolled: rolling, gimmick: segment.gimmick.id },
      // A ring pays where it is hit. A crossing has no ground to chain from --
      // there are no tricks, rails or grinds out there -- so banking a ring
      // would defer the only reward space has for no reason.
      { minimumIntensity: rolling ? 0.7 : 0.35, immediate: true },
    );
    state.grazes += 1;
  } else {
    state.ringsMissed += 1;
    state.lateralVelocity += Math.sign(target - state.lateral) * 2.2;
    event(state, 'ring-missed', { intensity: 0.32, target, gimmick: segment.gimmick.id });
  }
}

// --- Rivals ---------------------------------------------------------------
// An honest race. Each rival runs its own authored pace line through the same
// speed band the player uses, earns its own boosts at its own skill level, and
// never once looks at how fast the player is going.
//
// The rubber band that remains is symmetric and small: a rival slightly behind
// pushes, a rival slightly ahead eases, both capped at RIVAL_BAND_NUDGE of par
// and never allowed past the segment's own cap. That is enough to keep the
// field on screen -- which is a spectacle requirement -- without being enough
// to decide anything. Upstream the same mechanism was asymmetric by a factor
// of four (+330 behind, -52 ahead), which is why a player who simply
// accelerated could not be passed.
const RIVAL_BAND_NUDGE = 0.08;        // fraction of par, both directions
const RIVAL_NUDGE_RANGE = 900;        // units of s over which the nudge saturates
const RIVAL_BOOST_INTERVAL = 340;     // units of s between boost attempts at full skill
const RIVAL_BOOST_POWER = 0.24;       // fraction of the band a good rival boost is worth
const RIVAL_PACE_VARIATION = 0.035;   // per-seed, per-segment, deterministic

/** Deterministic per-rival, per-segment jitter. Same seed, same race. */
function rivalVariation(seed, rivalIndex, segmentIndex) {
  let x = (seed ^ Math.imul((rivalIndex + 1) * 0x9e3779b1, segmentIndex + 7)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

function updateRivals(state, dt) {
  const courseEnd = segmentStartDistance(state.finalSegmentIndex + 1, state.short);
  for (let i = 0; i < state.rivals.length; i += 1) {
    const rival = state.rivals[i];
    const rivalSegmentIndex = segmentIndexAtDistance(rival.globalProgress, state.short);
    const segment = COURSE[rivalSegmentIndex];
    const par = segment.baseSpeed * rival.pace;
    const cap = segment.maxSpeed;
    const width = Math.max(1, cap - segment.baseSpeed);

    // Rivals earn speed the same way the player does: pulses of overspeed that
    // decay back to par. It matters that this is the SAME shape -- a rival on
    // a flat line looks like scenery, and a rival that pulses looks like
    // someone driving.
    if (rival.globalProgress >= rival.nextBoostAt) {
      const roll = rivalVariation(state.seed, i + 11, Math.floor(rival.globalProgress / RIVAL_BOOST_INTERVAL));
      if ((roll * 0.5 + 0.5) < rival.skill) {
        rival.overspeed = Math.min(width, rival.overspeed + width * RIVAL_BOOST_POWER * rival.skill);
        rival.boosts += 1;
      }
      rival.nextBoostAt = rival.globalProgress + RIVAL_BOOST_INTERVAL / Math.max(0.25, rival.skill);
    }
    rival.overspeed = Math.max(0, rival.overspeed * Math.exp(-0.9 * dt));

    const variation = rivalVariation(state.seed, i, rivalSegmentIndex) * RIVAL_PACE_VARIATION;
    const gap = state.globalProgress - rival.globalProgress;
    const nudge = clamp(gap / RIVAL_NUDGE_RANGE, -1, 1) * par * RIVAL_BAND_NUDGE;
    const target = clamp(par * (1 + variation) + rival.overspeed + nudge, par * 0.55, cap);
    rival.speed = expApproach(rival.speed, target, 1.6, dt);
    rival.globalProgress = clamp(rival.globalProgress + rival.speed * dt, 0, courseEnd + 500);

    const width2 = segment.width;
    const local = localDistanceAtGlobal(rival.globalProgress, state.short);
    const laneTarget = Math.sin(local * 0.006 + rival.laneSeed + state.time * 0.28) * width2 * 0.35;
    rival.lateralVelocity += clamp(laneTarget - rival.lateral, -1, 1) * (12 + rival.skill * 5) * dt;
    rival.lateralVelocity *= Math.exp(-2.4 * dt);
    rival.lateral = clamp(rival.lateral + rival.lateralVelocity * dt, -width2 * 0.48, width2 * 0.48);
    rival.hitFlash = Math.max(0, rival.hitFlash - dt * 3.5);
  }
  // Position is the truth of s. Nothing else.
  state.position = 1 + state.rivals.filter((rival) => rival.globalProgress > state.globalProgress).length;
}

function stepGlide(state, segment, input, dt) {
  state.rollCooldown = Math.max(0, state.rollCooldown - dt);
  if (state.rollTimer > 0) {
    state.rollTimer = Math.max(0, state.rollTimer - dt);
    if (state.rollTimer <= 0) {
      state.rollCooldown = ROLL_COOLDOWN;
      // Unwind the full turn. state.roll has travelled exactly 2*PI from where
      // the roll began, so subtracting it lands on the same orientation --
      // numerically a jump, visually nothing. It is declared so the soak's
      // continuity check does not read a completed roll as a snap, and the
      // renderer blends orientations by shortest arc so the declaration costs
      // no visible movement either.
      state.roll -= state.rollDirection * Math.PI * 2;
      state.rollStart = 0;
      snapPose(state, input.steer);
    }
  } else if (input.hop && !state.lastHop && state.rollCooldown <= 0) {
    state.rollTimer = ROLL_SECONDS;
    state.rollDirection = Math.sign(input.steer) || state.lastSteerSide || 1;
    // The dash. A hard shove in the direction you are already leaning, applied
    // as an impulse rather than a force so it arrives on the frame you press
    // -- steering ramps, this does not, and that difference is the entire
    // reason to have the button.
    state.lateralVelocity += state.rollDirection * SPACE_DASH_IMPULSE;
    state.dashes += 1;
    // The roll starts from wherever the glider is banked, not from zero.
    // Starting from zero threw the roll channel across the whole bank range in
    // a single tick -- 35 rad/s of undeclared rotation, which is the "faces
    // weird directions" bug arriving through the one channel that is supposed
    // to be purely cosmetic.
    state.rollStart = state.roll;
    event(state, 'dash', { intensity: 0.62, side: state.rollDirection });
  }

  // Slipstream. Sitting in a rival's wake is free speed you have to earn by
  // holding a line you did not choose -- the draft window is narrow in both
  // distance and lane, so it is a decision, not a gift.
  let drafting = false;
  for (const rival of state.rivals) {
    const gap = rival.globalProgress - state.globalProgress;
    if (gap < SLIPSTREAM_MIN_GAP || gap > SLIPSTREAM_MAX_GAP) continue;
    if (Math.abs(rival.lateral - state.lateral) > SLIPSTREAM_LANE) continue;
    drafting = true;
    break;
  }
  state.drafting = drafting;
  if (drafting) {
    state.slipstreamSeconds += dt;
    const width = Math.max(1, segment.maxSpeed - segment.baseSpeed);
    state.overspeed = Math.min(width, state.overspeed + width * SLIPSTREAM_BAND_GAIN * dt);
    if (state.slipstreamSeconds > 0.4 && Math.floor(state.slipstreamSeconds * 2) !== Math.floor((state.slipstreamSeconds - dt) * 2)) {
      event(state, 'slipstream', { intensity: 0.4, seconds: Number(state.slipstreamSeconds.toFixed(2)) });
    }
  }
}

function transitionSegment(state) {
  let segment = currentSegment(state);
  let length = segmentLength(segment, state.short);
  while (state.segmentProgress >= length && !state.finished) {
    const excess = state.segmentProgress - length;
    if (state.segmentIndex >= state.finalSegmentIndex) {
      state.finished = true;
      state.finishTime = state.time;
      state.finalPosition = state.position;
      state.segmentProgress = length;
      state.boostPower = 1;
      state.boostTimer = 3;
      event(state, 'finish', { intensity: 1, position: state.finalPosition });
      break;
    }
    const previous = segment;
    const previousProfile = profileAt(previous, segmentLength(previous, state.short), state.short);
    state.segmentIndex += 1;
    segment = currentSegment(state);
    length = segmentLength(segment, state.short);
    // Reconcile the lane with the new cross-section. Segments are not all the
    // same width -- a crossing is 22 units wide and Thunderglass is 16.5 -- so
    // carrying a raw lateral offset across the boundary put the rider outside
    // the new road entirely. The soak caught it at x = -10.1 against a lip of
    // 7.9: that is the clipping bug, arriving through the one door the rider's
    // swept resolver does not guard.
    //
    // The lane is carried as a FRACTION of road width rather than clamped, so
    // a player who is riding the left third of a crossing arrives on the left
    // third of the planet. The racing line survives the boundary; only the
    // units change.
    const nextProfile = profileAt(segment, 0, state.short);
    const laneFraction = clamp(state.lateral / Math.max(1e-6, previousProfile.roadHalf), -1, 1);
    state.lateral = laneFraction * nextProfile.roadHalf;
    state.lateralVelocity *= nextProfile.roadHalf / Math.max(1e-6, previousProfile.roadHalf);
    state.profile = nextProfile;
    state.segmentProgress = excess;
    state.mode = segment.type;
    state.segmentElapsed = 0;
    state.segmentEntrySpeed = state.speed;
    state.currentGate = -1;
    state.wallContactCooldown = 0;
    state.wallContactSide = 0;
    // Crossing a boundary re-stamps the rescue point. IONWAKE respawned people
    // into the trap they had just fallen out of, because its safe point only
    // stamped when they were centred AND fast; a segment boundary is always a
    // good place to be able to come back to.
    state.safePoint = { s: state.globalProgress, lateral: 0, height: 0 };
    state.lastSafeStampS = state.globalProgress;
    state.lastStuckCheckS = state.globalProgress;
    state.stuckTimer = 0;
    // The boundary swaps the whole vehicle, so it is a declared pose
    // discontinuity. Carrying a half-finished flip across it would surface as
    // an undeclared rotation on the far side of the launch.
    settleRider(state, state.lastInput.steer);
    state.rollTimer = 0;
    state.rollCooldown = 0;
    state.drafting = false;
    state.transitions += 1;
    state.visited.push(segment.id);
    // Lift and speed cross the mode boundary without injected position or
    // velocity. Late-surface launch physics creates the outbound arc before
    // the swap; the reentry arc meets the next strip at the actual boundary.
    event(state, previous.type === 'planet' ? 'launch' : 'landing', {
      intensity: 1,
      from: previous.id,
      to: segment.id,
    });
    event(state, 'segment-change', { intensity: 0.8, segment: segment.id });
  }
}

export function stepRace(state, rawInput, rawDt = FIXED_STEP) {
  const dt = clamp(Number(rawDt) || FIXED_STEP, 1 / 1000, 1 / 20);
  const input = normalizeInput(rawInput);
  state.events.length = 0;
  if (!state.started) {
    state.lastInput = input;
    return state;
  }
  if (state.finished) {
    const finishSegment = currentSegment(state);
    state.time += dt;
    stepSpeedBand(state, finishSegment, dt);
    // Even the victory lap moves through the rider, so there is no second
    // integrator anywhere that could put the board somewhere illegal.
    if (finishSegment.type === 'planet') stepRider(state, finishSegment, input, dt);
    else stepRiderSpace(state, finishSegment, input, dt);
    riderPose(state, input, dt);
    state.lift = state.arcHeight + state.height;
    state.globalProgress += state.speed * dt;
    state.lastHop = input.hop;
    state.lastInput = input;
    return state;
  }
  state.time += dt;
  state.segmentElapsed += dt;
  const segment = currentSegment(state);
  const width = segment.width;
  state.mode = segment.type;
  // The chain lapsing is an EVENT now, not an inequality nobody hears. The
  // bank fires on the frame the window runs out -- or, far more often, on the
  // frame the rider has been standing on the ground long enough that the chain
  // is plainly over. The second of those is the one the player experiences,
  // because it is the one attached to something they did.
  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    // Back on the deck with nothing else started: the combo is finished, so
    // pay it. In the air, on a rail or on a grind the line is visibly still
    // running, and the outer window keeps it open.
    const stillOnALine = state.riderState !== 'ground' || state.height > 0.01;
    if (stillOnALine) {
      state.comboGroundTimer = COMBO_GROUND_WINDOW;
    } else if (state.comboBank > 0) {
      state.comboGroundTimer = Math.max(0, state.comboGroundTimer - dt);
      if (state.comboGroundTimer <= 0) cashCombo(state);
    }
    if (state.comboTimer <= 0) cashCombo(state);
  } else {
    state.combo = expApproach(state.combo, 1, 1.4, dt);
    state.comboGroundTimer = COMBO_GROUND_WINDOW;
  }
  state.incomingHitFlash = Math.max(0, state.incomingHitFlash - dt * 3.8);
  state.wallContactCooldown = Math.max(0, state.wallContactCooldown - dt);
  // Sharpness bleeds whenever it is not being earned. This is what makes a
  // lead losable: stop racing well and the authored rival pace comes back.
  state.sharpness = clamp(state.sharpness * Math.exp(-SHARPNESS_DECAY * dt), 0, 1);

  // trickCharge is the raw score; trickMeter is its 0..1 view, which is what
  // every art consumer wants. Derived, never stored twice.
  state.trickMeter = clamp(state.trickCharge / TRICK_TIER_CHARGE[2], 0, 1);
  stepSpeedBand(state, segment, dt);
  // Riding the rail is propulsion WHILE you hold it, not only at the end.
  // Alex: "If you hit one, it should probably speed you up." The old gain was
  // small enough that a grind felt like waiting.
  if (state.riderState === RIDER.RAIL) {
    const width = Math.max(1, segment.maxSpeed - segment.baseSpeed);
    state.overspeed = Math.min(width, state.overspeed + width * RAIL_BAND_GAIN_PER_SECOND * dt);
    state.boostPower = Math.max(state.boostPower, 0.5);
    state.boostTimer = Math.max(state.boostTimer, 0.45);
    state.boostDuration = Math.max(state.boostDuration, 0.45);
  }
  if (state.riderState === RIDER.GRIND) {
    state.overspeed = Math.min(
      Math.max(1, segment.maxSpeed - segment.baseSpeed),
      state.overspeed + (segment.maxSpeed - segment.baseSpeed) * GRIND_BAND_GAIN_PER_SECOND * dt,
    );
    state.boostPower = Math.max(state.boostPower, 0.42);
    state.boostTimer = Math.max(state.boostTimer, 0.4);
    state.boostDuration = Math.max(state.boostDuration, 0.4);
  }
  state.minimumObservedSpeed = Math.min(state.minimumObservedSpeed, state.speed);
  if (Math.abs(input.steer) > 0.11) state.lastSteerSide = Math.sign(input.steer);

  // --- movement -------------------------------------------------------
  // Every change to (x, H) goes through the rider, and the rider resolves
  // against profileAt() with swept boundary checks. There is exactly one place
  // in this file where lateral position moves, which is the whole point: CARVE
  // clipped because its boundary resolution was a once-per-frame endpoint snap
  // living somewhere else entirely.
  if (segment.type === 'planet') {
    stepRider(state, segment, input, dt, {
      // The pop. Holding loads the board and releasing launches it, so the
      // size of the air is the size of the commitment.
      onPop: ({ loaded, impulse }) => event(state, 'pop', {
        intensity: 0.3 + loaded * 0.6,
        loaded: Number(loaded.toFixed(3)),
        impulse: Number(impulse.toFixed(2)),
      }),
      // Every new flame is an event, because a tier ladder is only a skill
      // ladder if the player can see which rung they are on -- and here they
      // see it WHILE STILL IN THE AIR, before choosing to keep spinning or
      // square up for the landing.
      onTrickTier: ({ tier, color }) => event(state, 'trick-tier', {
        intensity: 0.3 + tier * 0.22,
        tier,
        color,
      }),
      // Landing a trick is the whole ground economy now. Alex cut drift and
      // put the boost meter here: "the boost meter will be filled by landing
      // tricks."
      onTrick: ({ tier, score, quality, halves, flips, grab, airTime, strength, seconds, color, name }) => {
        addBoost(
          state,
          strength,
          'trick-landed',
          {
            tier,
            quality: Number(quality.toFixed(3)),
            score: Number(score.toFixed(3)),
            halves,
            flips,
            grab: Number(grab.toFixed(2)),
            airTime: Number(airTime.toFixed(2)),
            color,
            name,
          },
          {
            power: strength,
            duration: seconds,
            comboGain: 0.1 + tier * 0.08,
            // A stomped landing announces itself louder than a scraped one.
            minimumIntensity: 0.3 + tier * 0.16 + quality * 0.2,
          },
        );
        state.tricksLandedCount += 1;
        state.trickTierCounts[tier - 1] += 1;
        addSharpness(state, SHARPNESS_GAIN.trick * clamp(strength, 0.2, 1));
      },
      // Blown. Graduated: a near miss is a scrape, a wild one is a real loss.
      // This is the cost that makes attempting a trick a decision.
      onBlown: ({ yawOff, error, scrub, tier, name }) => {
        // Bailing DROPS THE CHAIN. Everything banked is gone.
        //
        // This is the honest cost of getting it wrong, and it is a better one
        // than a bigger speed tax. Measured, the speed scrub alone could not
        // carry it: a line that threw tricks and bailed every one still beat a
        // line that never left the ground, because hopping collects the
        // planet's gimmick gates and that income covered the tax. Taking the
        // bank instead means the loss scales with exactly how much you had to
        // lose -- bail on the first trick of a chain and it costs nothing, bail
        // on the fifth and you drop the whole run. Which is the same rule every
        // skating game has, for the same reason.
        state.comboBank = 0;
        state.comboCount = 0;
        state.comboScore = 0;
        state.comboSeconds = 0;
        state.comboMoves.length = 0;
        state.comboTimer = 0;
        state.combo = 1;
        state.tricksBlownCount += 1;
        addSharpness(state, -SHARPNESS_LOSS.blown * clamp(error - 1, 0.2, 1));
        state.incomingHitFlash = clamp(scrub * 2.6, 0.25, 1);
        event(state, 'blown', {
          intensity: clamp(0.3 + scrub * 2, 0.3, 1),
          yawOff: Number(yawOff.toFixed(3)),
          error: Number(error.toFixed(3)),
          scrub: Number(scrub.toFixed(3)),
          tier,
          name,
        });
      },
      onLand: ({ airTime, clean, quality, tier }) => event(state, 'land', {
        intensity: clamp(airTime * 1.2, 0.25, 1),
        airTime: Number(airTime.toFixed(3)),
        clean,
        quality: Number(quality.toFixed(3)),
        tier,
      }),
      onCopingPop: ({ speed, side }) => event(state, 'coping-pop', {
        intensity: clamp(speed / 26, 0.3, 1),
        side,
        speed: Number(speed.toFixed(2)),
      }),
      onRailStart: ({ shape, side }) => event(state, 'rail-start', { intensity: 0.6, shape, side }),
      onRailEnd: ({ shape, seconds, exitUp }) => {
        // Thrown back onto the course FASTER than you left it. The payout
        // scales with how long the line was, and the launch itself is in the
        // rider -- every rail ends in an air, never a stop.
        const strength = clamp(seconds * RAIL_BAND_GAIN_PER_SECOND * 0.55, 0.2, 0.8);
        const railName = { kicker: 'KICKER', sweep: 'SWEEP', loop: 'LOOP' }[shape] ?? 'RAIL';
        addBoost(
          state,
          strength,
          'rail-payout',
          { shape, seconds: Number(seconds.toFixed(2)), name: railName },
          {
            power: strength,
            duration: 0.8 + seconds * 0.6,
            comboGain: 0.14 + strength * 0.2,
            minimumIntensity: 0.55,
          },
        );
        state.railSecondsTotal += seconds;
        addSharpness(state, SHARPNESS_GAIN.rail * clamp(seconds / 1.5, 0.25, 1));
        event(state, 'rail-end', { intensity: 0.7, shape, seconds: Number(seconds.toFixed(2)) });
      },
      onGrindStart: ({ side }) => event(state, 'grind-start', { intensity: 0.45, side }),
      onGrindEnd: ({ side, seconds, reason }) => {
        // A grind pays for the time you held it, on top of the speed it was
        // already giving you while you held it. Alex: "If you hit one, it
        // should probably speed you up."
        const strength = clamp(seconds * GRIND_BAND_GAIN_PER_SECOND * 0.9, 0.12, 0.6);
        addBoost(
          state,
          strength,
          'grind-payout',
          {
            side,
            seconds: Number(seconds.toFixed(2)),
            reason,
            name: seconds > 1.6 ? 'LONG GRIND' : 'GRIND',
          },
          {
            power: strength,
            duration: 0.6 + seconds * 0.55,
            comboGain: 0.1 + strength * 0.2,
            minimumIntensity: 0.35,
          },
        );
        state.grindSecondsTotal += seconds;
        addSharpness(state, SHARPNESS_GAIN.grind * clamp(seconds / 2, 0.2, 1));
        event(state, 'grind-end', { intensity: 0.45, side, seconds: Number(seconds.toFixed(2)), reason });
      },
      onWall: ({ side, impact }) => {
        // Contact is readable, never propulsion: a rail is not a faster
        // substitute for technique. A hard arrival is a mistake and costs
        // sharpness; a graze is just a scrape.
        if (impact > 3.2) {
          event(state, 'wall-kiss', { intensity: 0.34, side, impactVelocity: impact });
          state.wallKisses += 1;
          addSharpness(state, -SHARPNESS_LOSS.wallKiss);
        } else event(state, 'rail-touch', { intensity: 0.34, side, impactVelocity: impact });
      },
    });
  } else {
    // Space is a glide now, not a shooting gallery. Firing auto-locked the
    // nearest rival and always hit; dodging opened a blanket timing window
    // that ignored where you actually were. Neither could be played well or
    // badly, so both are cut rather than patched. Phase 6 fills the crossing
    // with boost rings, roll-through-ring bonuses and slipstream.
    stepRiderSpace(state, segment, input, dt);
    processSpaceGimmick(state, segment, input, dt);
    stepGlide(state, segment, input, dt);
  }
  const rescue = stepRescue(state, state.profile, input, dt, {
    onRescue: (reason) => event(state, 'rescue', { intensity: 0.6, reason }),
  });
  if (rescue) state.lastRescue = { reason: rescue, time: state.time };
  riderPose(state, input, dt);
  if (segment.type === 'space') {
    // The glider yaws harder and banks into its turns -- except mid-roll,
    // where the roll owns the channel outright. A barrel roll that the bank
    // smoothing kept fighting would read as a wobble, not a roll.
    state.yaw = expApproach(state.yaw, -input.steer * 0.28 - state.lateralVelocity * 0.008, 7.5, dt);
    if (state.rollTimer > 0) {
      const through = 1 - state.rollTimer / ROLL_SECONDS;
      state.roll = state.rollStart + state.rollDirection * Math.PI * 2 * through;
    } else {
      state.roll = expApproach(state.roll, -input.steer * 0.6, 8, dt);
    }
  }

  const segmentFraction = clamp(state.segmentProgress / segmentLength(segment, state.short), 0, 1);
  const remainingDistance = Math.max(0, segmentLength(segment, state.short) - state.segmentProgress);
  const launchTrajectoryActive = segment.type === 'planet'
    && state.segmentIndex < state.finalSegmentIndex
    && remainingDistance <= Math.max(300, state.speed * LAUNCH_LIFT_WINDOW_SECONDS);
  const reentryTrajectoryActive = segment.type === 'space'
    && segmentFraction >= REENTRY_ARC_START_FRACTION;
  // The scripted launch/re-entry arc, unchanged from the fork -- it is the
  // signature spectacle and docs/PLAN.md says keep it exactly. It integrates
  // its own height now rather than owning state.lift directly, so a hop during
  // a launch adds to the arc instead of fighting it.
  if (launchTrajectoryActive) {
    state.arcVelocity = Math.min(
      LAUNCH_EXIT_LIFT_VELOCITY,
      Math.max(0, state.arcVelocity) + LAUNCH_LIFT_ACCELERATION * dt,
    );
    state.arcHeight = Math.max(0, state.arcHeight + state.arcVelocity * dt);
  } else if (reentryTrajectoryActive) {
    const previousArc = state.arcHeight;
    const reentryPhase = clamp(
      (segmentFraction - REENTRY_ARC_START_FRACTION) / (1 - REENTRY_ARC_START_FRACTION),
      0,
      1,
    );
    state.arcHeight = REENTRY_ARC_HEIGHT * Math.sin(Math.PI * reentryPhase);
    state.arcVelocity = (state.arcHeight - previousArc) / dt;
  } else {
    state.arcVelocity -= 17 * dt;
    state.arcVelocity *= Math.exp(-0.8 * dt);
    state.arcHeight = Math.max(0, state.arcHeight + state.arcVelocity * dt);
    if (state.arcHeight <= 0 && state.arcVelocity < 0) state.arcVelocity = 0;
  }
  // The renderer's height channel is composed, never stored twice.
  state.lift = state.arcHeight + state.height;
  state.liftVelocity = state.arcVelocity + state.heightVelocity;

  processGate(state, segment, input);
  state.segmentProgress += state.speed * dt;
  state.globalProgress += state.speed * dt;
  // The road can change shape under the rider between one tick and the next.
  // Reconciling here, after the distance advances, is what makes "the rider is
  // always inside the cross-section at their own s" true rather than nearly.
  reconcileToProfile(state, segment);
  state.laneHistory.push({ time: state.time, lateral: state.lateral });
  while (state.laneHistory.length > 150) state.laneHistory.shift();
  updateRivals(state, dt);
  transitionSegment(state);

  state.lastHop = input.hop;
  state.lastInput = input;
  return state;
}

// A scripted lane-follower, used by the deterministic smoke. It is NOT a feel
// reference: see docs/PLAN.md ground rule 4 and the bots-cannot-answer-feel
// memory -- bots answer correctness questions only.
export function autopilotInput(state) {
  const segment = currentSegment(state);
  const spacing = Math.max(18, segment.gimmick.spacing * (state.short ? 0.16 : 1));
  const nextGate = Math.floor(state.segmentProgress / spacing) + 1;
  const target = gateTarget(segment, nextGate, state);
  const delta = target - state.lateral;
  const steer = clamp(delta * 0.18 - state.lateralVelocity * 0.045, -1, 1);
  return { steer, pitch: 0, hop: false, grab: false, respawn: false };
}

export function raceSnapshot(state) {
  const segment = currentSegment(state);
  const morph = getMorphState(state);
  return {
    build: state.build,
    seed: state.seed,
    short: state.short,
    started: state.started,
    finished: state.finished,
    time: Number(state.time.toFixed(3)),
    mode: segment.type,
    segmentIndex: state.segmentIndex,
    segmentId: segment.id,
    segmentName: segment.name,
    segmentFraction: Number(getSegmentFraction(state).toFixed(4)),
    globalProgress: Number(state.globalProgress.toFixed(2)),
    speed: Number(state.speed.toFixed(2)),
    segmentElapsed: Number(state.segmentElapsed.toFixed(4)),
    segmentEntrySpeed: Number(state.segmentEntrySpeed.toFixed(4)),
    boost: Number(state.boost.toFixed(4)),
    overspeed: Number(state.overspeed.toFixed(3)),
    boostPower: Number(state.boostPower.toFixed(4)),
    boostTimer: Number(state.boostTimer.toFixed(4)),
    par: segment.baseSpeed,
    cap: segment.maxSpeed,
    lateral: Number(state.lateral.toFixed(3)),
    lateralVelocity: Number(state.lateralVelocity.toFixed(4)),
    yaw: Number(state.yaw.toFixed(4)),
    roll: Number(state.roll.toFixed(4)),
    boardFlip: Number(state.boardFlip.toFixed(4)),
    lift: Number(state.lift.toFixed(4)),
    liftVelocity: Number(state.liftVelocity.toFixed(4)),
    riderState: state.riderState,
    tricksLanded: state.tricksLandedCount,
    tricksBlown: state.tricksBlownCount,
    grinds: state.grinds,
    grindSeconds: Number(state.grindSecondsTotal.toFixed(3)),
    rails: state.rails,
    railShape: state.railShape,
    railT: Number(state.railT.toFixed(4)),
    railSeconds: Number(state.railSecondsTotal.toFixed(3)),
    grabSeconds: Number(state.grabSeconds.toFixed(3)),
    inputLockout: Number(state.inputLockout.toFixed(3)),
    rollTimer: Number(state.rollTimer.toFixed(4)),
    rolling: state.rollTimer > 0,
    dashes: state.dashes,
    drafting: Boolean(state.drafting),
    ringsHit: state.ringsHit,
    ringsRolled: state.ringsRolled,
    ringsMissed: state.ringsMissed,
    slipstreamSeconds: Number(state.slipstreamSeconds.toFixed(3)),
    hasWall: Boolean(state.profile.hasWall),
    copingX: Number(state.profile.copingX.toFixed(3)),
    lipX: Number(state.profile.lipX.toFixed(3)),
    height: Number(state.height.toFixed(4)),
    heightVelocity: Number(state.heightVelocity.toFixed(4)),
    arcHeight: Number(state.arcHeight.toFixed(4)),
    pitch: Number(state.pitch.toFixed(4)),
    poseEpoch: state.poseEpoch,
    airTime: Number(state.airTime.toFixed(4)),
    rescues: state.rescues,
    boundaryResolutions: state.boundaryResolutions,
    skimTicks: state.skimTicks,
    nanRescues: state.nanRescues,
    stuckTimer: Number(state.stuckTimer.toFixed(3)),
    roadHalf: Number(state.profile.roadHalf.toFixed(3)),
    trickCharge: Number(state.trickCharge.toFixed(4)),
    trickMeter: Number(state.trickMeter.toFixed(4)),
    trickTier: state.trickTier,
    trickTierCounts: [...state.trickTierCounts],
    spinSide: state.spinSide,
    stance: state.stance,
    crouch: Number(state.crouch.toFixed(4)),
    popCharge: Number(state.popCharge.toFixed(4)),
    landingQuality: Number(state.landingQuality.toFixed(3)),
    wallContactCooldown: Number(state.wallContactCooldown.toFixed(4)),
    wallContactSide: state.wallContactSide,
    railSkimming: state.railSkimming,
    lastSteerSide: state.lastSteerSide,
    lastInput: { ...state.lastInput },
    position: state.position,
    morph: Number(morph.morph.toFixed(4)),
    sharpness: state.sharpness,
    sharpnessPeak: state.sharpnessPeak,
    incomingHitFlash: Number(state.incomingHitFlash.toFixed(4)),
    tricksLanded: state.tricksLandedCount,
    gateBoosts: state.gateBoosts,
    wallKisses: state.wallKisses,
    transitions: state.transitions,
    visited: [...state.visited],
    rivals: state.rivals.map((rival) => ({
      id: rival.id,
      delta: Number((rival.globalProgress - state.globalProgress).toFixed(3)),
      globalProgress: Number(rival.globalProgress.toFixed(3)),
      speed: Number(rival.speed.toFixed(3)),
      overspeed: Number(rival.overspeed.toFixed(3)),
      boosts: rival.boosts,
      lateral: Number(rival.lateral.toFixed(3)),
      lateralVelocity: Number(rival.lateralVelocity.toFixed(4)),
      hitFlash: Number(rival.hitFlash.toFixed(4)),
    })),
    finalPosition: state.finalPosition,
  };
}

export function stateHash(state) {
  return hashText(JSON.stringify(raceSnapshot(state))).toString(16).padStart(8, '0');
}

export function runDeterministicSmoke(options = {}) {
  const state = createRaceState({
    seed: options.seed ?? 1337,
    short: true,
    started: true,
    slice: options.slice ?? false,
  });
  const expectedSegments = state.finalSegmentIndex + 1;
  const maxSteps = options.maxSteps ?? 120 * 180;
  const seenModes = new Set([currentSegment(state).type]);
  let minimumSpeedMargin = Infinity;
  let overCap = -Infinity;
  let finite = true;
  for (let i = 0; i < maxSteps && !state.finished; i += 1) {
    stepRace(state, autopilotInput(state), FIXED_STEP);
    const activeSegment = currentSegment(state);
    // The band invariant, not the old rising floor: speed lives inside
    // [par * BAND_FLOOR, cap] at every tick. Overspeed above the cap would mean
    // the ratchet is back.
    minimumSpeedMargin = Math.min(minimumSpeedMargin, state.speed - activeSegment.baseSpeed * BAND_FLOOR);
    // Above the cap is legal only as carried velocity bleeding off after a
    // boundary, never as something gained inside the segment.
    const entryCeiling = Math.max(activeSegment.maxSpeed, state.segmentEntrySpeed);
    overCap = Math.max(overCap, state.speed - entryCeiling);
    seenModes.add(currentSegment(state).type);
    finite = finite && [state.speed, state.lateral, state.globalProgress, state.boost].every(Number.isFinite);
  }
  const snapshot = raceSnapshot(state);
  const uniqueVisited = new Set(state.visited);
  const result = {
    ok: Boolean(
      state.finished
      && finite
      && minimumSpeedMargin >= -0.001
      && overCap <= 0.001
      && uniqueVisited.size === expectedSegments
      && seenModes.has('planet')
      && seenModes.has('space')
      && state.transitions === expectedSegments - 1
      // Presence checks for technique live in tests/economy.mjs, where they
      // are measured rather than merely counted.
    ),
    finite,
    minimumSpeedMargin: Number(minimumSpeedMargin.toFixed(4)),
    overCap: Number(overCap.toFixed(4)),
    visitedCount: uniqueVisited.size,
    expectedVisited: expectedSegments,
    seenModes: [...seenModes],
    transitions: state.transitions,
    tricksLandedCount: state.tricksLandedCount,
    trickTierCounts: [...state.trickTierCounts],
    gateBoosts: state.gateBoosts,
    finishTime: state.finishTime ? Number(state.finishTime.toFixed(3)) : null,
    finalPosition: state.finalPosition,
    hash: stateHash(state),
    snapshot,
  };
  return result;
}

export function seededLayout(segment, seed = 1, count = 64) {
  const random = mulberry32((seed ^ hashText(segment.id)) >>> 0);
  const length = segment.length;
  return Array.from({ length: count }, (_, i) => ({
    progress: 80 + (i / Math.max(1, count - 1)) * (length - 160) + (random() - 0.5) * 55,
    side: random() > 0.5 ? 1 : -1,
    offset: segment.width * (0.72 + random() * 2.8),
    scale: 0.55 + random() * 2.1,
    spin: random() * Math.PI * 2,
    variant: Math.floor(random() * 4),
    height: random(),
  }));
}
