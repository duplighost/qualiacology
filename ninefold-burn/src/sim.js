import {
  COURSE,
  RIVALS,
  getSegment,
  hashText,
  mulberry32,
  segmentLength,
} from './content.js';

export const FIXED_STEP = 1 / 120;
// The shared surge control remains live through launch, but the gun buses arm
// only after the rocket has visibly cleared the departure structure. At the
// first crossing's floor speed this is roughly four tenths of a second: enough
// room for one clean transformation beat without stealing control or speed.
export const SPACE_WEAPONS_ARM_FRACTION = 0.045;
export const SPACE_ENTRY_SPEED_RAMP_SECONDS = 0.34;

// --- Sharpness: the live measure of how well the player is racing ----------
// This replaces the old cumulative mastery total. That total only ever grew —
// every drift, hit and dodge was banked forever — so once a player had earned
// enough relief the race could not be lost again, no matter how badly they
// drove afterwards. A sweep of 11 skill levels across 5 seeds finished 1st in
// every run above ~20% skill.
//
// Sharpness is a rate, not a ledger: it rises on earned technique, decays on
// its own, and is cut by damage. Stop racing well and it bleeds away within a
// few seconds, the rivals' authored pace comes back, and they leave. It is
// also the value the HUD renders, so the number that decides the race is the
// same number the player can see.
// Decay is proportional, not linear. Linear decay is bistable: any event rate
// above the drain saturates at 1 and anything below empties to 0, so the value
// would flicker between "perfect" and "nothing" instead of tracking form. With
// a proportional drain the level settles near (gain rate / decay), which is a
// stable, readable measure of how well the player is racing right now.
// Half-life is about five seconds.
export const SHARPNESS_DECAY = 0.14;          // proportional, per second

// Drift is weighted well above the others on purpose. Measured across the
// skill sweep, shot counts barely separate a weak run from a strong one (21 vs
// 15) while drift releases scale with real technique (6 vs 15). Weighting the
// move that actually tracks skill is what gives the race a difficulty curve.
export const SHARPNESS_GAIN = Object.freeze({
  drift: 0.58,
  hit: 0.1,
  dodge: 0.12,
});
export const SHARPNESS_LOSS = Object.freeze({
  hitTaken: 0.19,
  wallKiss: 0.13,
});
// Full sharpness buys back this much rival speed. Set against RIVALS racePace
// so that a sharp player out-paces the field and a sloppy one cannot.
export const SHARPNESS_RELIEF = 152;

// The charge at which a drift is worth taking. Nothing enforces it — the
// reward curve is continuous and holding longer still pays more — but it is
// the moment the payout stops being crumbs, and it is what the renderer
// signals so the player can learn the loop by feel instead of by guessing.
// A firm lean reaches it in roughly half a second, which is also about how
// long you can hold that lean before the rail boundary takes the drift away.
export const DRIFT_RIPE_CHARGE = 0.55;

const EPSILON = 1e-7;
// Segment maxSpeed values shape the authored acceleration curve; they are not
// hard ceilings. A reward earned after carrying space velocity onto a later
// planet must still create literal forward propulsion.
const BOOST_IMPULSE_PLANET = 82;
const BOOST_IMPULSE_SPACE = 98;
const PASSIVE_ACCELERATION = 1.35;
const BOOST_ACCELERATION = 5.8;
const PLANET_SURGE_ACCELERATION = 8.6;
const SPACE_SURGE_ACCELERATION = 2.4;
// A target must be beyond the player's nose, not merely inside a broad
// longitudinal corridor. The renderer places positive forward deltas on the
// visible negative-Z track, so this keeps simulation locks inside the visible
// presentation contract instead of allowing invisible rear-quarter hits.
const PLAYER_SHOT_MIN_FORWARD_DELTA = 6;
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

export function normalizeInput(input = {}) {
  return {
    steer: clamp(Number(input.steer) || 0, -1, 1),
    surge: Boolean(input.surge),
    slip: Boolean(input.slip),
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
  // Open as a readable chase pack: Morrow is close enough to contest
  // immediately, Saint is the first overtake, and Vanta carries one clean
  // target through Scoria's launch instead of letting every rival fall behind
  // the rocket before Space I can teach combat.
  const rivalStarts = [920, 520, 180];
  const rivals = RIVALS.map((rival, i) => ({
    ...rival,
    globalProgress: Math.max(0, startDistance + rivalStarts[i]),
    speed: COURSE[segmentIndex].baseSpeed + rival.bias,
    lateral: Math.sin(rival.laneSeed) * 4,
    lateralVelocity: 0,
    hitFlash: 0,
    shots: 0,
    hitsOnPlayer: 0,
  }));
  return {
    build: '1.0.0',
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
    boost: 0.12,
    driftCharge: 0,
    drifting: false,
    driftSide: 0,
    driftRailInvalidated: false,
    railRewardLockout: false,
    lateral: 0,
    lateralVelocity: 0,
    yaw: 0,
    roll: 0,
    lift: 0,
    liftVelocity: 0,
    shotCooldown: 0,
    dodgeCooldown: 0,
    dodgeWindow: 0,
    wallContactCooldown: 0,
    wallContactSide: 0,
    railSkimming: false,
    lastSteerSide: 0,
    combo: 1,
    comboTimer: 0,
    position: 4,
    shotsFired: 0,
    hits: 0,
    hitsTaken: 0,
    incomingDodges: 0,
    incomingHitFlash: 0,
    incomingShots: [],
    nextIncomingShotId: 1,
    qaForcedRivalShot: null,
    qaSuppressRandomRivalShots: false,
    qaForcedShotOutcome: null,
    driftBoosts: 0,
    gateBoosts: 0,
    grazes: 0,
    wallKisses: 0,
    sharpness: 0,
    sharpnessPeak: 0,
    driftVoidFlash: 0,
    transitions: 0,
    currentGate: -1,
    lastSlip: false,
    lastInput: normalizeInput(),
    laneHistory: [],
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

export function gateTarget(segment, gateIndex, state = null) {
  const width = segment.width;
  const phase = gateIndex * 1.61803398875 + segment.index * 0.731;
  const lane = Math.sin(phase * 2.17) * width * 0.32;
  if (segment.gimmick.id === 'magnetic-lane-swap') return ((gateIndex % 2) * 2 - 1) * width * 0.34;
  if (segment.gimmick.id === 'wormwake') return Math.sin(phase * 0.83) * width * 0.42;
  if (segment.gimmick.id === 'gravity-tides') return Math.sin(phase * 1.31) * width * 0.38;
  if (segment.gimmick.id === 'echo-gates' && state?.laneHistory.length) {
    const past = state.laneHistory[Math.max(0, state.laneHistory.length - 12)];
    return clamp(-(past?.lateral ?? 0), -width * 0.42, width * 0.42);
  }
  if (segment.gimmick.id === 'solar-crown') return Math.sin(phase * 3.1) * width * 0.28;
  if (segment.gimmick.id === 'dark-current') return Math.sin(phase * 0.55) * width * 0.4;
  if (segment.gimmick.id === 'flare-surfing') return ((gateIndex % 3) - 1) * width * 0.3;
  return lane;
}

// Sharpness moves only through here so every gain and loss is one audited
// place. Positive deltas are earned technique, negative ones are damage.
function addSharpness(state, delta) {
  state.sharpness = clamp(state.sharpness + delta, 0, 1);
  if (state.sharpness > state.sharpnessPeak) state.sharpnessPeak = state.sharpness;
  return state.sharpness;
}

function addBoost(state, amount, type, data = {}, options = {}) {
  const scaled = amount * (1 + Math.min(2.5, state.combo * 0.06));
  const impulseScale = options.impulseScale
    ?? (state.mode === 'space' ? BOOST_IMPULSE_SPACE : BOOST_IMPULSE_PLANET);
  const speedImpulse = Math.max(0, scaled * impulseScale);
  state.boost = clamp(state.boost + scaled, 0, 1);
  // The meter is energy storage; the impulse is the tactile reward. Keeping
  // both means a drift release or confirmed hit remains propulsion even when
  // carried velocity already exceeds the next segment's nominal maxSpeed.
  state.speed = Math.max(0, state.speed + speedImpulse);
  state.combo = clamp(state.combo + (options.comboGain ?? 0.22), 1, 9.9);
  state.comboTimer = 3.25;
  event(state, type, {
    amount: scaled,
    speedImpulse,
    intensity: clamp(scaled * 5, options.minimumIntensity ?? 0.25, 1),
    ...data,
  });
}

function processSurfaceGimmick(state, segment, input, gateIndex) {
  const target = gateTarget(segment, gateIndex, state);
  const delta = Math.abs(state.lateral - target);
  let success = delta < segment.width * 0.22;
  let reward = segment.gimmick.reward;
  // Crossing a gimmick while latched to (or still recovering from) a rail is
  // allowed to keep its authored throw/readability, but it cannot turn the
  // barrier into a second propulsion source. Reward eligibility rearms with
  // the same explicit release + interior-lane recovery as clean drifting.
  const rewardEligible = !state.railRewardLockout;
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
      success = success && input.surge && rewardEligible;
      if (success) addBoost(state, reward, 'lightning-ride', { target });
      else state.lateralVelocity += Math.sign(target - state.lateral) * 2.2;
      break;
    case 'vine-gates':
      if (rewardEligible && (success || Math.abs(state.lateralVelocity) > 10)) addBoost(state, reward, 'vine-cut', { target });
      else state.lateralVelocity += Math.sign(target - state.lateral) * 3.1;
      break;
    case 'friction-bloom':
      success = state.drifting && state.driftCharge > 0.08;
      if (success && rewardEligible) addBoost(state, reward + state.driftCharge * 0.2, 'ice-bloom', { target });
      else event(state, 'ice-crack', { intensity: 0.38, target });
      break;
    case 'magnetic-lane-swap':
      state.lateralVelocity += clamp(target - state.lateral, -5, 5) * 1.7;
      if (rewardEligible && (success || input.slip)) addBoost(state, reward, 'magnetic-throw', { target });
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
      if (input.slip && Math.abs(state.lateral) > width * 0.28) state.grazes += dt * 0.8;
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
      if (input.surge && Math.abs(input.steer) > 0.25) state.boost = clamp(state.boost + dt * 0.018, 0, 1);
      break;
    case 'ghost-slipstream': {
      const convoyLane = ((Math.floor(p / 500) % 3) - 1) * width * 0.28;
      if (Math.abs(state.lateral - convoyLane) < 3.4) state.boost = clamp(state.boost + dt * 0.055, 0, 1);
      break;
    }
    case 'dark-current':
      state.lateralVelocity += Math.sin(p * 0.004 + state.time * 0.7) * 8.5 * dt;
      if (input.slip && Math.abs(input.steer) > 0.2) state.boost = clamp(state.boost + dt * 0.025, 0, 1);
      break;
    case 'echo-volley':
      break;
    case 'flare-surfing': {
      const flare = Math.sin(p * 0.006) > 0.72;
      if (flare && input.slip) state.boost = clamp(state.boost + dt * 0.08, 0, 1);
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
  const target = gateTarget(segment, gate, state);
  const close = Math.abs(state.lateral - target) < segment.width * 0.24;
  if (close || input.slip) {
    addBoost(state, segment.gimmick.reward * 0.55, 'space-gate', { target, gimmick: segment.gimmick.id });
    state.grazes += 1;
  } else {
    state.lateralVelocity += Math.sign(target - state.lateral) * 2.2;
    event(state, 'space-near-miss', { intensity: 0.32, target, gimmick: segment.gimmick.id });
  }
}

function fireShot(state, segment) {
  state.shotsFired += 1;
  const candidates = state.rivals
    .map((rival) => ({ rival, delta: rival.globalProgress - state.globalProgress, lane: Math.abs(rival.lateral - state.lateral) }))
    .filter(({ delta, lane }) => delta > PLAYER_SHOT_MIN_FORWARD_DELTA && delta < 980 && lane < 6.2)
    .sort((a, b) => (a.lane + Math.abs(a.delta) * 0.003) - (b.lane + Math.abs(b.delta) * 0.003));
  const target = candidates[0]?.rival ?? null;
  const aimError = target ? Math.abs(target.lateral - state.lateral) : Infinity;
  // Correct aim is authoritative. A miss now comes from the rival visibly
  // leaving the lock corridor before the shot resolves, never from a hidden
  // random roll after the player put the target in the reticle.
  let hit = Boolean(target);
  if (typeof state.qaForcedShotOutcome === 'boolean') {
    hit = Boolean(target) && state.qaForcedShotOutcome;
    state.qaForcedShotOutcome = null;
  }
  event(state, 'shot', {
    intensity: 0.38,
    targetId: target?.id ?? null,
    hit: Boolean(hit),
    aimError: Number.isFinite(aimError) ? aimError : null,
  });
  if (!hit) return;
  target.hitFlash = 1;
  target.lateralVelocity += Math.sign(target.lateral - state.lateral || 1) * 2.4;
  state.hits += 1;
  addSharpness(state, SHARPNESS_GAIN.hit);
  addBoost(state, 0.115, 'shot-hit', { targetId: target.id });
  if (segment.gimmick.id === 'echo-volley') {
    state.hits += 1;
    addBoost(state, 0.07, 'echo-hit', { targetId: target.id });
  }
}

function updateRivals(state, input, dt) {
  const courseEnd = segmentStartDistance(COURSE.length, state.short);
  const playerSegment = currentSegment(state);
  // Rivals pace against the velocity the player is actually carrying, not the
  // baseSpeed of whatever segment they happen to occupy. The old segment-base
  // target stranded them half a course behind as soon as the player crossed a
  // few speed floors, making even a no-input route an uncontested win.
  //
  // Earned drift/shot/dodge technique relaxes their authored pressure so those
  // impulses survive as race position instead of being silently rubber-banded
  // away — but only while the player keeps earning it. See SHARPNESS_* above:
  // this is a live rate that decays and takes damage, not a banked total, so a
  // lead can be lost. It is capped: rivals remain present all the way home.
  // The opening begins as an overtake hunt, not three AI cars instantly
  // accelerating away from a fourth-place player. Their full authored pace
  // arrives across the first planet/space loop: mastery can reach the front by
  // Thunderglass, while a neutral route is reeled back in before the finish.
  const rivalryRamp = smoothstep(0, 50, state.time);
  // Relief rides the same ramp as the pace it exists to cancel. Sharpness can
  // reach a high level within seconds — one committed drift is worth 0.3 — so
  // without this an early drift bought a huge speed advantage over a field
  // that had not accelerated yet, and the player took the lead before the
  // first crossing with nothing left in front of them to shoot at.
  const masteryPressure = SHARPNESS_RELIEF * state.sharpness * rivalryRamp;
  for (let i = 0; i < state.rivals.length; i += 1) {
    const rival = state.rivals[i];
    const rivalSegmentIndex = segmentIndexAtDistance(rival.globalProgress, state.short);
    const rivalSegment = COURSE[rivalSegmentIndex];
    const gap = state.globalProgress - rival.globalProgress;
    // Asymmetric on purpose. Rivals behind still surge back into frame (+330,
    // raised from 220 so a dominant player still has something to shoot: at the
    // old value expert runs left the field so far back that space combat simply
    // stopped happening). Rivals ahead no longer wait for a player who has
    // stopped earning it: the old -120 floor made a lost lead nearly impossible.
    // The two directions are not the same problem, so they do not share a
    // coefficient. Behind the player, rivals need real closing speed or they
    // fall out of the race as spectacle: at the old symmetric 0.08 an expert
    // run left the field 200-900 units back for the whole course and space
    // combat stopped happening entirely (71 shots fired, 0 hits). Ahead of the
    // player they must NOT wait around, or a lead is impossible to lose.
    const catchup = gap > 0
      ? Math.min(gap * 0.35, 330)
      : Math.max(gap * 0.08, -52);
    const rhythm = Math.sin(state.time * (0.37 + i * 0.07) + rival.laneSeed) * 18;
    const targetSpeed = state.speed
      + (rival.racePace ?? 72 + rival.bias * 4) * rivalryRamp
      - masteryPressure
      + catchup
      + rhythm;
    rival.speed = expApproach(rival.speed, Math.max(rivalSegment.baseSpeed, targetSpeed), 1, dt);
    rival.globalProgress = clamp(rival.globalProgress + rival.speed * dt, 0, courseEnd + 500);
    const width = rivalSegment.width;
    const local = localDistanceAtGlobal(rival.globalProgress, state.short);
    const laneTarget = Math.sin(local * 0.006 + rival.laneSeed + state.time * 0.28) * width * 0.35;
    rival.lateralVelocity += clamp(laneTarget - rival.lateral, -1, 1) * (12 + rival.aggression * 5) * dt;
    rival.lateralVelocity *= Math.exp(-2.4 * dt);
    rival.lateral = clamp(rival.lateral + rival.lateralVelocity * dt, -width * 0.48, width * 0.48);
    rival.hitFlash = Math.max(0, rival.hitFlash - dt * 3.5);
    const forwardDelta = rival.globalProgress - state.globalProgress;
    const sharesCombatSpace = playerSegment.type === 'space'
      && rivalSegmentIndex === state.segmentIndex
      && forwardDelta > -220
      && forwardDelta < 780;
    const alreadyIncoming = state.incomingShots.some((shot) => shot.sourceId === rival.id);
    const forcedShot = state.qaForcedRivalShot?.sourceId === rival.id ? state.qaForcedRivalShot : null;
    const randomShot = !state.qaSuppressRandomRivalShots
      && random01(state, i + 900) < rival.aggression * dt * 0.45;
    if (sharesCombatSpace && !alreadyIncoming && (forcedShot || randomShot)) {
      rival.shots += 1;
      const flightTime = clamp(
        Number(forcedShot?.flightTime) || (0.32 + Math.abs(forwardDelta) * 0.00025),
        0.28,
        0.56,
      );
      const missSide = Math.sign(state.lateral - rival.lateral)
        || Math.sign(input.steer)
        || (i % 2 === 0 ? -1 : 1);
      const shot = {
        id: state.nextIncomingShotId,
        sourceId: rival.id,
        resolveAt: state.time + flightTime,
        aimLateral: clamp(
          Number.isFinite(Number(forcedShot?.aimLateral))
            ? Number(forcedShot.aimLateral)
            : state.lateral + state.lateralVelocity * flightTime * 0.38,
          -playerSegment.width * 0.48,
          playerSegment.width * 0.48,
        ),
        missSide,
      };
      state.nextIncomingShotId += 1;
      state.incomingShots.push(shot);
      if (forcedShot) state.qaForcedRivalShot = null;
      event(state, 'rival-shot', {
        intensity: 0.34,
        shotId: shot.id,
        sourceId: rival.id,
        flightTime,
        aimLateral: shot.aimLateral,
        missSide,
      });
    }
  }
  state.position = 1 + state.rivals.filter((rival) => rival.globalProgress > state.globalProgress).length;
}

function resolveIncomingShots(state) {
  if (!state.incomingShots.length) return;
  const pending = [];
  for (const shot of state.incomingShots) {
    if (state.time + EPSILON < shot.resolveAt) {
      pending.push(shot);
      continue;
    }
    const rival = state.rivals.find((candidate) => candidate.id === shot.sourceId) ?? null;
    const aimError = Math.abs(state.lateral - shot.aimLateral);
    const dodged = state.dodgeWindow > 0;
    const hit = !dodged && aimError < 4.2;
    event(state, 'rival-shot-resolved', {
      intensity: hit ? 0.72 : dodged ? 0.5 : 0.3,
      shotId: shot.id,
      sourceId: shot.sourceId,
      hit,
      dodged,
      aimError,
      missSide: shot.missSide,
    });
    if (dodged) {
      state.dodgeWindow = 0;
      state.incomingDodges += 1;
      addSharpness(state, SHARPNESS_GAIN.dodge);
      addBoost(state, 0.065, 'incoming-dodge', {
        shotId: shot.id,
        sourceId: shot.sourceId,
        side: shot.missSide,
      }, { comboGain: 0.18, minimumIntensity: 0.42 });
    } else if (hit) {
      state.hitsTaken += 1;
      addSharpness(state, -SHARPNESS_LOSS.hitTaken);
      state.incomingHitFlash = 1;
      if (rival) {
        rival.hitsOnPlayer += 1;
        rival.speed += 11.5;
      }
      // Enemy hits matter, but this game never steals forward velocity. The
      // shield throws the chassis sideways while the attacker converts the
      // clean shot into its own propulsion reward.
      state.lateralVelocity += shot.missSide * 8.4;
      event(state, 'player-hit', {
        intensity: 0.88,
        shotId: shot.id,
        sourceId: shot.sourceId,
        side: shot.missSide,
        aimError,
      });
    } else {
      event(state, 'incoming-whiff', {
        intensity: 0.3,
        shotId: shot.id,
        sourceId: shot.sourceId,
        side: shot.missSide,
        aimError,
      });
    }
  }
  state.incomingShots = pending;
}

function transitionSegment(state) {
  let segment = currentSegment(state);
  let length = segmentLength(segment, state.short);
  while (state.segmentProgress >= length && !state.finished) {
    const excess = state.segmentProgress - length;
    if (state.segmentIndex >= COURSE.length - 1) {
      state.finished = true;
      state.finishTime = state.time;
      state.finalPosition = state.position;
      state.segmentProgress = length;
      state.boost = 1;
      event(state, 'finish', { intensity: 1, position: state.finalPosition });
      break;
    }
    const previous = segment;
    state.segmentIndex += 1;
    segment = currentSegment(state);
    length = segmentLength(segment, state.short);
    state.segmentProgress = excess;
    state.mode = segment.type;
    state.segmentElapsed = 0;
    state.segmentEntrySpeed = state.speed;
    state.currentGate = -1;
    state.incomingShots = [];
    state.dodgeWindow = 0;
    state.wallContactCooldown = 0;
    state.wallContactSide = 0;
    state.drifting = false;
    state.driftCharge = 0;
    state.driftRailInvalidated = false;
    state.railRewardLockout = false;
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
    state.time += dt;
    state.boost = Math.max(state.boost, 0.86);
    state.speed = Math.max(state.speed, currentSegment(state).baseSpeed + 120);
    state.lateralVelocity += input.steer * 42 * dt;
    state.lateralVelocity *= Math.exp(-3.2 * dt);
    state.lateral = clamp(state.lateral + state.lateralVelocity * dt, -currentSegment(state).width * 0.48, currentSegment(state).width * 0.48);
    state.globalProgress += state.speed * dt;
    state.yaw = expApproach(state.yaw, -input.steer * 0.22, 6, dt);
    state.roll = expApproach(state.roll, -input.steer * 0.38, 6, dt);
    state.lastInput = input;
    return state;
  }
  state.time += dt;
  state.segmentElapsed += dt;
  const segment = currentSegment(state);
  const width = segment.width;
  state.mode = segment.type;
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer <= 0) state.combo = expApproach(state.combo, 1, 1.4, dt);
  state.shotCooldown = Math.max(0, state.shotCooldown - dt);
  state.dodgeCooldown = Math.max(0, state.dodgeCooldown - dt);
  state.dodgeWindow = Math.max(0, state.dodgeWindow - dt);
  state.incomingHitFlash = Math.max(0, state.incomingHitFlash - dt * 3.8);
  state.wallContactCooldown = Math.max(0, state.wallContactCooldown - dt);
  state.driftVoidFlash = Math.max(0, state.driftVoidFlash - dt * 2.6);
  // Sharpness bleeds whenever it is not being earned. This is what makes a
  // lead losable: stop racing well and the authored rival pace comes back.
  state.sharpness = clamp(state.sharpness * Math.exp(-SHARPNESS_DECAY * dt), 0, 1);

  const boostDrain = segment.type === 'space' ? 0.034 : (input.surge ? 0.095 : 0.052);
  state.boost = clamp(state.boost - boostDrain * dt, 0, 1);
  const canonicalSpeedFloor = segment.baseSpeed + (segment.type === 'space' ? 92 : 0);
  const entryRamp = segment.type === 'space'
    ? smoothstep(0, SPACE_ENTRY_SPEED_RAMP_SECONDS, state.segmentElapsed)
    : 1;
  const speedFloor = segment.type === 'space'
    ? lerp(state.segmentEntrySpeed, Math.max(state.segmentEntrySpeed, canonicalSpeedFloor), entryRamp)
    : canonicalSpeedFloor;
  const targetSpeed = speedFloor + state.boost * (segment.maxSpeed - speedFloor) + (input.surge && segment.type === 'planet' ? 26 : 0);
  const carriedSpeed = Number.isFinite(state.speed) ? state.speed : speedFloor;
  const upwardTarget = Math.max(carriedSpeed, targetSpeed);
  state.speed = expApproach(carriedSpeed, upwardTarget, state.boost > 0.02 ? 2.6 : 1.8, dt);
  const continuousAcceleration = PASSIVE_ACCELERATION
    + state.boost * BOOST_ACCELERATION
    + (input.surge
      ? (segment.type === 'planet' ? PLANET_SURGE_ACCELERATION : SPACE_SURGE_ACCELERATION)
      : 0);
  state.speed = Math.max(speedFloor, carriedSpeed, state.speed) + continuousAcceleration * dt;
  state.minimumObservedSpeed = Math.min(state.minimumObservedSpeed, state.speed);
  if (Math.abs(input.steer) > 0.11) state.lastSteerSide = Math.sign(input.steer);

  if (segment.type === 'planet') {
    const railRewardBoundary = width * 0.36;
    const railRecoveryBoundary = width * 0.26;
    // Approaching the rail invalidates the current drift before a release can
    // convert wall-adjacent charge into propulsion. Eligibility only rearms
    // after the player releases slip and returns to a clear interior lane.
    if (state.drifting && Math.abs(state.lateral) >= railRewardBoundary) {
      // Signal the kill. A voided drift used to just go quiet, which reads as
      // nothing happening rather than as a mistake you made.
      if (!state.driftRailInvalidated) state.driftVoidFlash = 1;
      state.driftRailInvalidated = true;
      state.railRewardLockout = true;
      state.driftCharge = 0;
    }
    if (!input.slip
      && state.wallContactSide === 0
      && Math.abs(state.lateral) <= railRecoveryBoundary) {
      state.railRewardLockout = false;
    }
    const wantsDrift = input.slip && Math.abs(input.steer) > 0.11;
    if (wantsDrift) {
      if (!state.drifting) state.driftRailInvalidated = state.railRewardLockout;
      state.drifting = true;
      state.driftSide = Math.sign(input.steer);
      // Once a drift touches a rail, that same held drift cannot resume
      // charging on the cross-track rebound. The player must release and begin
      // a new clean drift away from the barrier before propulsion is eligible
      // again. This keeps legitimate committed drifts intact while preventing
      // wall-adjacent release farming.
      if (!state.driftRailInvalidated) {
        // Charge comes from how hard you are actually leaning on the slide,
        // not from how fast the world happens to be moving. The old mix was
        // 0.13 + steer*0.19 + speed/5600, and at racing speed that last term
        // was 0.36 of roughly 0.51 - charge filled itself. Committing to a
        // real drift bought almost nothing over flicking the stick, so the
        // fastest route was 29 twitches instead of 12 committed slides.
        // The rate is scaled so that a drift you can actually hold - roughly
        // half a second of firm lean before the rail boundary takes it away -
        // lands near 0.55 charge rather than 0.27. The reward curve below is
        // superlinear, so it needs the achievable range to cover the part of
        // the curve where commitment starts paying. With the old scale the
        // whole race lived in the flat bottom of it.
        state.driftCharge = clamp(
          state.driftCharge + dt * (0.1 + Math.abs(input.steer) * 1.05 + state.speed / 24000),
          0,
          1,
        );
        state.boost = clamp(state.boost + dt * 0.012, 0, 1);
      }
    } else if (state.drifting) {
      if (state.driftCharge > 0 && !state.driftRailInvalidated) {
        const commitment = state.driftCharge;
        // Strongly superlinear, and deliberately continuous - no cliff, a short
        // slide still pays crumbs. Doubling the commitment more than quadruples
        // the payout, which is what makes one held slide beat a burst of taps.
        const reward = Math.min(0.46, 0.74 * Math.pow(commitment, 2.15));
        const comboGain = Math.min(0.34, 0.6 * Math.pow(commitment, 1.6));
        addBoost(
          state,
          reward,
          'drift-release',
          { side: state.driftSide, charge: commitment },
          { comboGain, minimumIntensity: 0.06 },
        );
        state.driftBoosts += 1;
        // Scaled by commitment. A flat gain per release meant sharpness - the
        // value the whole race is paced against - was farmed fastest by
        // tapping slip as often as possible, which is the exact opposite of
        // the technique this game is about.
        addSharpness(state, SHARPNESS_GAIN.drift * Math.pow(commitment, 1.35));
      }
      state.drifting = false;
      state.driftCharge = 0;
      state.driftRailInvalidated = false;
    }
    const grip = wantsDrift ? 0.48 : 1;
    const steerForce = (36 + state.speed * 0.055) * (wantsDrift ? 1.35 : 1);
    state.lateralVelocity += input.steer * steerForce * dt;
    state.lateralVelocity *= Math.exp(-(2.2 + grip * 2.6) * dt);
    state.yaw = expApproach(state.yaw, -input.steer * 0.16 - state.lateralVelocity * 0.012 - state.driftSide * state.driftCharge * 0.34, 6.5, dt);
    state.roll = expApproach(state.roll, -input.steer * 0.12, 5, dt);
  } else {
    const steerForce = 54 + state.speed * 0.045;
    state.lateralVelocity += input.steer * steerForce * dt;
    state.lateralVelocity *= Math.exp(-3.5 * dt);
    if (input.slip && !state.lastSlip && state.dodgeCooldown <= 0) {
      const direction = Math.sign(input.steer) || state.lastSteerSide;
      if (direction !== 0) {
        state.lateralVelocity += direction * 10.5;
        state.dodgeWindow = 0.24;
      }
      state.dodgeCooldown = 0.42;
      addBoost(state, 0.035, 'space-slip', { side: direction });
    }
    const spaceFraction = clamp(state.segmentProgress / segmentLength(segment, state.short), 0, 1);
    const spaceMorph = morphAt(segment, state.segmentProgress, state.short);
    const weaponsArmed = spaceFraction >= SPACE_WEAPONS_ARM_FRACTION && spaceMorph.landing < 0.08;
    if (input.surge && weaponsArmed && state.shotCooldown <= 0) {
      state.shotCooldown = segment.gimmick.id === 'echo-volley' ? 0.13 : 0.19;
      fireShot(state, segment);
    }
    processSpaceGimmick(state, segment, input, dt);
    state.yaw = expApproach(state.yaw, -input.steer * 0.28 - state.lateralVelocity * 0.008, 7.5, dt);
    const dodgeRollSide = Math.sign(input.steer) || state.lastSteerSide;
    state.roll = expApproach(state.roll, -input.steer * 0.6 - (input.slip ? dodgeRollSide * 0.45 : 0), 8, dt);
  }

  state.lateral += state.lateralVelocity * dt;
  const limit = width * 0.48;
  state.railSkimming = false;
  const holdingLatchedRail = state.wallContactSide !== 0
    && Math.sign(input.steer) === state.wallContactSide
    && Math.abs(state.lateral) > limit - 0.5;
  if (holdingLatchedRail) {
    // One impact, then a stable skim. Continuing to hold into the same rail no
    // longer produces a silent 7 Hz restitution buzz beneath the presentation.
    state.lateral = state.wallContactSide * (limit - 0.24);
    state.lateralVelocity = 0;
    state.railSkimming = true;
  } else if (Math.abs(state.lateral) > limit) {
    const side = Math.sign(state.lateral) || 1;
    const impactVelocity = Math.max(0, state.lateralVelocity * side);
    const newContact = state.wallContactSide !== side && state.wallContactCooldown <= 0;
    // Resolve inside the boundary so held steering cannot collide again on the
    // very next fixed tick. The contact latch only rearms after the player has
    // actively steered away, turning a wall kiss into one authored impact—not
    // a 120 Hz boost/event dispenser.
    state.lateral = side * (limit - 0.24);
    state.lateralVelocity = -side * Math.max(2.8, impactVelocity * 0.42);
    state.wallContactSide = side;
    state.wallContactCooldown = 0.28;
    if (state.drifting) {
      state.driftRailInvalidated = true;
      state.railRewardLockout = true;
      state.driftCharge = 0;
    }
    if (newContact) {
      if (input.slip && impactVelocity > 3.2) {
        // A wall kiss is readable contact, not a propulsion source. It neither
        // adds boost/speed nor weakens rival pressure; rail contact is therefore
        // never a faster substitute for clean drift, combat, or dodge mastery.
        event(state, 'wall-kiss', { intensity: 0.34, side, impactVelocity });
        state.wallKisses += 1;
        addSharpness(state, -SHARPNESS_LOSS.wallKiss);
      } else event(state, 'rail-touch', { intensity: 0.34, side, impactVelocity });
    }
  } else if (state.wallContactSide !== 0
    && Math.abs(state.lateral) < limit - 0.42
    && Math.sign(input.steer) !== state.wallContactSide) {
    state.wallContactSide = 0;
  }

  const segmentFraction = clamp(state.segmentProgress / segmentLength(segment, state.short), 0, 1);
  const remainingDistance = Math.max(0, segmentLength(segment, state.short) - state.segmentProgress);
  const launchTrajectoryActive = segment.type === 'planet'
    && state.segmentIndex < COURSE.length - 1
    && remainingDistance <= Math.max(300, state.speed * LAUNCH_LIFT_WINDOW_SECONDS);
  const reentryTrajectoryActive = segment.type === 'space'
    && segmentFraction >= REENTRY_ARC_START_FRACTION;
  if (launchTrajectoryActive) {
    state.liftVelocity = Math.min(
      LAUNCH_EXIT_LIFT_VELOCITY,
      Math.max(0, state.liftVelocity) + LAUNCH_LIFT_ACCELERATION * dt,
    );
    state.lift = Math.max(0, state.lift + state.liftVelocity * dt);
  } else if (reentryTrajectoryActive) {
    const previousLift = state.lift;
    const reentryPhase = clamp(
      (segmentFraction - REENTRY_ARC_START_FRACTION) / (1 - REENTRY_ARC_START_FRACTION),
      0,
      1,
    );
    state.lift = REENTRY_ARC_HEIGHT * Math.sin(Math.PI * reentryPhase);
    state.liftVelocity = (state.lift - previousLift) / dt;
  } else {
    state.liftVelocity -= 17 * dt;
    state.liftVelocity *= Math.exp(-0.8 * dt);
    state.lift = Math.max(0, state.lift + state.liftVelocity * dt);
    if (state.lift <= 0 && state.liftVelocity < 0) state.liftVelocity = 0;
  }

  processGate(state, segment, input);
  if (state.railSkimming && state.lateralVelocity * state.wallContactSide > 0) {
    state.lateralVelocity = 0;
  }
  state.segmentProgress += state.speed * dt;
  state.globalProgress += state.speed * dt;
  state.laneHistory.push({ time: state.time, lateral: state.lateral });
  while (state.laneHistory.length > 150) state.laneHistory.shift();
  updateRivals(state, input, dt);
  resolveIncomingShots(state);
  transitionSegment(state);

  state.lastSlip = input.slip;
  state.lastInput = input;
  return state;
}

export function autopilotInput(state) {
  const segment = currentSegment(state);
  const spacing = Math.max(18, segment.gimmick.spacing * (state.short ? 0.16 : 1));
  const nextGate = Math.floor(state.segmentProgress / spacing) + 1;
  let target = gateTarget(segment, nextGate, state);
  if (segment.type === 'space') {
    const targetRival = state.rivals
      .map((rival) => ({ rival, delta: rival.globalProgress - state.globalProgress }))
      .filter(({ delta }) => delta > -10 && delta < 800)
      .sort((a, b) => a.delta - b.delta)[0]?.rival;
    if (targetRival) target = lerp(target, targetRival.lateral, 0.65);
  }
  const delta = target - state.lateral;
  const steer = clamp(delta * 0.18 - state.lateralVelocity * 0.045, -1, 1);
  return {
    steer,
    surge: segment.type === 'space' || state.boost > 0.16,
    slip: segment.type === 'planet'
      ? Math.abs(steer) > 0.18 && (Math.floor(state.time * 1.2) % 4 !== 3)
      : Math.abs(delta) > segment.width * 0.22,
  };
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
    lateral: Number(state.lateral.toFixed(3)),
    lateralVelocity: Number(state.lateralVelocity.toFixed(4)),
    yaw: Number(state.yaw.toFixed(4)),
    roll: Number(state.roll.toFixed(4)),
    lift: Number(state.lift.toFixed(4)),
    liftVelocity: Number(state.liftVelocity.toFixed(4)),
    drifting: Boolean(state.drifting),
    driftSide: state.driftSide,
    driftCharge: Number(state.driftCharge.toFixed(4)),
    driftRailInvalidated: Boolean(state.driftRailInvalidated),
    railRewardLockout: Boolean(state.railRewardLockout),
    shotCooldown: Number(state.shotCooldown.toFixed(4)),
    dodgeCooldown: Number(state.dodgeCooldown.toFixed(4)),
    dodgeWindow: Number(state.dodgeWindow.toFixed(4)),
    wallContactCooldown: Number(state.wallContactCooldown.toFixed(4)),
    wallContactSide: state.wallContactSide,
    railSkimming: state.railSkimming,
    lastSteerSide: state.lastSteerSide,
    lastInput: { ...state.lastInput },
    position: state.position,
    morph: Number(morph.morph.toFixed(4)),
    shotsFired: state.shotsFired,
    hits: state.hits,
    hitsTaken: state.hitsTaken,
    sharpness: state.sharpness,
    sharpnessPeak: state.sharpnessPeak,
    incomingDodges: state.incomingDodges,
    incomingHitFlash: Number(state.incomingHitFlash.toFixed(4)),
    incomingShots: state.incomingShots.map((shot) => ({
      id: shot.id,
      sourceId: shot.sourceId,
      resolveIn: Number(Math.max(0, shot.resolveAt - state.time).toFixed(4)),
      aimLateral: Number(shot.aimLateral.toFixed(4)),
      missSide: shot.missSide,
    })),
    driftBoosts: state.driftBoosts,
    gateBoosts: state.gateBoosts,
    wallKisses: state.wallKisses,
    transitions: state.transitions,
    visited: [...state.visited],
    rivals: state.rivals.map((rival) => ({
      id: rival.id,
      delta: Number((rival.globalProgress - state.globalProgress).toFixed(3)),
      globalProgress: Number(rival.globalProgress.toFixed(3)),
      speed: Number(rival.speed.toFixed(3)),
      lateral: Number(rival.lateral.toFixed(3)),
      lateralVelocity: Number(rival.lateralVelocity.toFixed(4)),
      hitFlash: Number(rival.hitFlash.toFixed(4)),
      shots: rival.shots,
      hitsOnPlayer: rival.hitsOnPlayer,
    })),
    finalPosition: state.finalPosition,
  };
}

export function stateHash(state) {
  return hashText(JSON.stringify(raceSnapshot(state))).toString(16).padStart(8, '0');
}

export function runDeterministicSmoke(options = {}) {
  const state = createRaceState({ seed: options.seed ?? 1337, short: true, started: true });
  const maxSteps = options.maxSteps ?? 120 * 180;
  const seenModes = new Set([currentSegment(state).type]);
  let minimumSpeedMargin = Infinity;
  let finite = true;
  for (let i = 0; i < maxSteps && !state.finished; i += 1) {
    stepRace(state, autopilotInput(state), FIXED_STEP);
    const activeSegment = currentSegment(state);
    const canonicalFloor = activeSegment.baseSpeed + (activeSegment.type === 'space' ? 92 : 0);
    const ramp = activeSegment.type === 'space'
      ? smoothstep(0, SPACE_ENTRY_SPEED_RAMP_SECONDS, state.segmentElapsed)
      : 1;
    const activeFloor = activeSegment.type === 'space'
      ? lerp(state.segmentEntrySpeed, Math.max(state.segmentEntrySpeed, canonicalFloor), ramp)
      : canonicalFloor;
    minimumSpeedMargin = Math.min(minimumSpeedMargin, state.speed - activeFloor);
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
      && uniqueVisited.size === COURSE.length
      && seenModes.has('planet')
      && seenModes.has('space')
      && state.transitions === COURSE.length - 1
      && state.shotsFired > 0
      && state.hits > 0
      && state.driftBoosts > 0
    ),
    finite,
    minimumSpeedMargin: Number(minimumSpeedMargin.toFixed(4)),
    visitedCount: uniqueVisited.size,
    expectedVisited: COURSE.length,
    seenModes: [...seenModes],
    transitions: state.transitions,
    shotsFired: state.shotsFired,
    hits: state.hits,
    driftBoosts: state.driftBoosts,
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
