import * as THREE from '../vendor/three.module.min.js';
import {
  ENCOUNTERS,
  CAMPAIGN_ATTACKS,
  TRANSIT_TIMELINE,
  encounterByIndex,
  phaseBounds,
  phaseForHealth,
  transitBeat,
} from './campaign-data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const damp = (current, target, lambda, dt) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const moveAngle = (current, target, maxDelta) => current + clamp(angleDelta(current, target), -maxDelta, maxDelta);
const crossed = (previous, current, threshold) => previous < threshold && current >= threshold;

export const BOSS_EVENT_GEOMETRY_KINDS = Object.freeze([
  'arc', 'shadowArc', 'line', 'aimLine', 'mirrorBeam', 'aimAoe',
  'lowRing', 'outer', 'lane', 'laneCross', 'sectors',
]);

export function bossEventAim(event = {}, aim, aimAngle = 0) {
  const position = aim.clone();
  const sideX = Math.cos(aimAngle);
  const sideZ = -Math.sin(aimAngle);
  const forwardX = Math.sin(aimAngle);
  const forwardZ = Math.cos(aimAngle);
  position.x += sideX * (event.offsetX || 0) + forwardX * (event.offsetZ || 0);
  position.z += sideZ * (event.offsetX || 0) + forwardZ * (event.offsetZ || 0);
  return position;
}

export function bossDistanceToRay(point, origin, angle, range) {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  const fx = Math.sin(angle);
  const fz = Math.cos(angle);
  const along = dx * fx + dz * fz;
  if (along < -.5 || along > range) return Infinity;
  return Math.abs(dx * fz - dz * fx);
}

export function bossEventHits(event, {
  playerPosition,
  bossPosition,
  attackFacing = 0,
  aimAngle = 0,
  aim = playerPosition,
  laneAngle = 0,
}) {
  const groundedEnough = playerPosition.y < .95;
  if (event.jumpSafe && !groundedEnough) return false;
  const dx = playerPosition.x - bossPosition.x;
  const dz = playerPosition.z - bossPosition.z;
  const distance = Math.hypot(dx, dz);
  if (event.kind === 'arc' || event.kind === 'shadowArc') {
    const angle = Math.atan2(dx, dz);
    const facing = event.kind === 'shadowArc' ? aimAngle : attackFacing;
    return distance <= event.range && Math.abs(angleDelta(facing, angle)) <= event.arc * .5;
  }
  if (event.kind === 'line') {
    return bossDistanceToRay(playerPosition, bossPosition, attackFacing, event.range) <= event.width;
  }
  if (event.kind === 'aimLine' || event.kind === 'mirrorBeam') {
    return bossDistanceToRay(playerPosition, bossPosition, aimAngle, event.range) <= event.width;
  }
  if (event.kind === 'aimAoe') {
    const eventAim = bossEventAim(event, aim, aimAngle);
    return Math.hypot(playerPosition.x - eventAim.x, playerPosition.z - eventAim.z) <= event.radius;
  }
  if (event.kind === 'lowRing') return distance >= event.inner && distance <= event.outer && groundedEnough;
  if (event.kind === 'outer') return Math.hypot(playerPosition.x, playerPosition.z) > event.safeRadius;
  if (event.kind === 'lane') {
    const angle = laneAngle + event.angleOffset;
    return Math.abs(playerPosition.x * Math.cos(angle) - playerPosition.z * Math.sin(angle)) <= event.width;
  }
  if (event.kind === 'laneCross') {
    // Preserve the authored diagonal used by both the warning and the original
    // shipping hit test rather than introducing a boundary change during the
    // testability extraction.
    const diagonal = .707;
    const left = Math.abs(playerPosition.x * diagonal - playerPosition.z * diagonal);
    const right = Math.abs(playerPosition.x * diagonal + playerPosition.z * diagonal);
    return Math.min(left, right) <= event.width;
  }
  if (event.kind === 'sectors') {
    const sector = Math.floor(((Math.atan2(playerPosition.z, playerPosition.x) + TAU) % TAU) / (TAU / 4));
    return sector % 2 === event.dangerParity;
  }
  return false;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3(0, 0, 1);

// Grounded play keeps Nera large enough to read at a glance. Phase III adds
// the exact amount removed here back into its boss-aware pullback so the
// airborne Saint and reflected missiles retain their established framing.
const GROUNDED_CAMERA_DISTANCE = 5.4;
const MIN_CAMERA_DISTANCE = 5.15;
const MAX_CAMERA_DISTANCE = 9.6;
const PHASE_THREE_CAMERA_COMPENSATION = 0.55;
const BOSS_WEAPON_CAMERA_HIDE_DISTANCE = 7.15;
const BOSS_WEAPON_CAMERA_SHOW_DISTANCE = 8.05;
// Matches the visible greatblade's 0.78 m grip plus 0.31 m rear thorn.
const BOSS_WEAPON_COUNTERWEIGHT_REACH = 1.10;
const BOSS_WEAPON_SCREEN_GUARD_DISTANCE = 10.75;
const BOSS_WEAPON_SCREEN_CLEARANCE = .28;
const BOSS_WEAPON_SCREEN_MIN_SPAN = .62;

function pointSegmentDistanceSq(point, start, end) {
  const abx = end.x - start.x;
  const aby = end.y - start.y;
  const abz = end.z - start.z;
  const apx = point.x - start.x;
  const apy = point.y - start.y;
  const apz = point.z - start.z;
  const lengthSq = abx * abx + aby * aby + abz * abz;
  const t = lengthSq > 1e-8
    ? clamp((apx * abx + apy * aby + apz * abz) / lengthSq, 0, 1)
    : 0;
  const dx = start.x + abx * t - point.x;
  const dy = start.y + aby * t - point.y;
  const dz = start.z + abz * t - point.z;
  return dx * dx + dy * dy + dz * dz;
}

function pointSegmentDistanceSq2D(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq > 1e-8 ? clamp01((apx * abx + apy * aby) / lengthSq) : 0;
  const dx = px - (ax + abx * t);
  const dy = py - (ay + aby * t);
  return dx * dx + dy * dy;
}

class RNG {
  constructor(seed = 0x5ec0d) { this.state = seed >>> 0 || 1; }
  next() {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }
  int(max) { return Math.floor(this.next() * max); }
  reset(seed) { this.state = seed >>> 0 || 1; }
}

export const PLAYER_ACTIONS = Object.freeze({
  light1: { duration: .44, hit: .155, range: 3.45, arc: 2.05, damage: 38, poise: 10, hitstop: .03, move: 2.9, family: 'quick', meter: 6, chain: .20 },
  light2: { duration: .47, hit: .18, range: 3.6, arc: 2.25, damage: 43, poise: 11, hitstop: .034, move: 2.35, family: 'quick', meter: 5, chain: .23 },
  light3: { duration: .58, hit: .245, range: 3.85, arc: 2.5, damage: 55, poise: 16, hitstop: .044, move: 2.6, family: 'quickFinisher', meter: 8, seam: true, chain: .32 },
  heavy: { duration: .76, hit: .39, range: 4.05, arc: 1.85, damage: 92, poise: 27, hitstop: .07, move: 1.45, family: 'heavy', meter: 8, rupture: true },
  launcher: { duration: .67, hit: .30, range: 3.55, arc: 1.9, damage: 67, poise: 30, hitstop: .058, move: 1.9, family: 'launcher', meter: 9, seam: true, launch: true },
  airLight1: { duration: .41, hit: .15, range: 3.65, arc: 2.4, damage: 36, poise: 8, hitstop: .028, move: 1.2, family: 'air', meter: 6, chain: .19 },
  airLight2: { duration: .43, hit: .17, range: 3.7, arc: 2.5, damage: 39, poise: 9, hitstop: .03, move: 1.05, family: 'air', meter: 5, chain: .21 },
  airLight3: { duration: .51, hit: .23, range: 3.95, arc: 2.7, damage: 49, poise: 14, hitstop: .04, move: 1.1, family: 'airFinisher', meter: 8, seam: true, chain: .3 },
  plunge: { duration: .72, hit: .34, range: 4.25, arc: TAU, damage: 88, poise: 29, hitstop: .075, move: 0, family: 'plunge', meter: 10, rupture: true },
  chase: { duration: .50, hit: .26, range: 3.75, arc: 2.4, damage: 48, poise: 14, hitstop: .038, move: 8.8, family: 'chase', meter: 7, seam: true },
  shot: { duration: .40, hit: .17, range: 25, arc: TAU, damage: 17, poise: 3, hitstop: .018, move: 0, family: 'shot', meter: 2, ranged: true },
  special: { duration: .88, hit: .45, range: 30, arc: TAU, damage: 172, poise: 65, hitstop: .11, move: 12, family: 'special', meter: 0, special: true }
});

const BOSS_PHASE_POOLS = ENCOUNTERS[0].phasePools;
export const BOSS_HEALTH = Object.freeze({
  max: BOSS_PHASE_POOLS[1] + BOSS_PHASE_POOLS[2] + BOSS_PHASE_POOLS[3],
  phase2Threshold: BOSS_PHASE_POOLS[2] + BOSS_PHASE_POOLS[3],
  phase3Threshold: BOSS_PHASE_POOLS[3],
  phasePools: BOSS_PHASE_POOLS,
});

export const DEFENSE_WINDOWS = Object.freeze({
  parryStart: .045,
  parryEnd: .155,
  dodgePerfectStart: .055,
  dodgePerfectEnd: .195,
  missileVisibleGrace: .22,
});

const LEGACY_BOSS_ATTACKS = Object.freeze({
  measureCut: {
    phase: 1, anim: 'slash', duration: 1.72, telegraph: .46, cue: 'cut', punish: .39, recoveryStart: 1.33,
    events: [
      { t: .49, kind: 'arc', range: 5.0, arc: 2.05, damage: 10, parryable: true, knock: 2.4 },
      { t: .87, kind: 'arc', range: 5.15, arc: 2.25, damage: 11, parryable: true, knock: 2.7 },
      { t: 1.23, kind: 'line', range: 7.3, width: 1.25, damage: 14, parryable: true, knock: 4.0 }
    ]
  },
  plumbDrop: {
    phase: 1, anim: 'slam', duration: 1.82, telegraph: .86, cue: 'dive', punish: .76, recoveryStart: 1.06,
    events: [{ t: .91, kind: 'aimAoe', radius: 3.25, damage: 18, parryable: true, knock: 4.5 }]
  },
  noonRing: {
    phase: 1, anim: 'sweep', duration: 1.80, telegraph: .90, cue: 'ring', punish: .69, recoveryStart: 1.11,
    events: [{ t: .96, kind: 'lowRing', inner: 1.7, outer: 12, damage: 13, parryable: false, jumpSafe: true, knock: 3.3 }]
  },
  spearline: {
    phase: 1, anim: 'thrust', duration: 1.86, telegraph: 1.02, cue: 'thrust', punish: .66, recoveryStart: 1.20,
    events: [{ t: 1.08, kind: 'aimLine', range: 21, width: 1.05, damage: 16, parryable: true, knock: 5.2 }]
  },
  orbitShear: {
    phase: 2, anim: 'sweep', duration: 1.98, telegraph: .68, cue: 'ring', punish: .63, recoveryStart: 1.35,
    events: [
      { t: .72, kind: 'lowRing', inner: 1.6, outer: 13.5, damage: 12, parryable: false, jumpSafe: true, knock: 2.8 },
      { t: 1.22, kind: 'aimLine', range: 20, width: 1.2, damage: 15, parryable: true, knock: 4.4 }
    ]
  },
  triangulation: {
    phase: 2, anim: 'cast', duration: 2.40, telegraph: .78, cue: 'cast', punish: .54, recoveryStart: 1.86,
    events: [
      { t: .83, kind: 'lane', angleOffset: 0, width: .95, damage: 11, parryable: false, knock: 2.5 },
      { t: 1.28, kind: 'lane', angleOffset: Math.PI / 3, width: .95, damage: 11, parryable: false, knock: 2.5 },
      { t: 1.73, kind: 'lane', angleOffset: -Math.PI / 3, width: .95, damage: 13, parryable: false, knock: 3.2 }
    ]
  },
  zenithDive: {
    phase: 2, anim: 'dive', duration: 2.24, telegraph: .92, cue: 'dive', punish: .80, recoveryStart: 1.44,
    events: [
      { t: 1.00, kind: 'aimAoe', radius: 3.4, damage: 18, parryable: true, knock: 5.3 },
      { t: 1.31, kind: 'lowRing', inner: 1.0, outer: 11.5, damage: 12, parryable: false, jumpSafe: true, knock: 3.6 }
    ]
  },
  coronaCage: {
    phase: 2, anim: 'cast', duration: 2.36, telegraph: .82, cue: 'cast', punish: .59, recoveryStart: 1.77,
    events: [
      { t: .92, kind: 'outer', safeRadius: 12.5, damage: 8, parryable: false, knock: -2.5 },
      { t: 1.28, kind: 'outer', safeRadius: 9.8, damage: 9, parryable: false, knock: -3.0 },
      { t: 1.64, kind: 'outer', safeRadius: 7.2, damage: 11, parryable: false, knock: -3.5 }
    ]
  },
  twinMeridian: {
    phase: 3, anim: 'cast', duration: 3.28, telegraph: .96, cue: 'cast', punish: 1.08, recoveryStart: 2.20,
    events: [
      { t: 1.02, kind: 'missile', side: -1, speed: 6.2, turn: 2.8, damage: 13, reflectable: true, parryable: false },
      { t: 1.52, kind: 'missile', side: 1, speed: 6.5, turn: 3.0, damage: 13, reflectable: true, parryable: false },
      { t: 2.02, kind: 'missile', side: -1, speed: 6.8, turn: 3.1, damage: 15, reflectable: true, parryable: false }
    ]
  },
  hourbreak: {
    phase: 3, anim: 'cast', duration: 3.52, telegraph: 1.02, cue: 'cast', punish: 1.19, recoveryStart: 2.33,
    events: [
      { t: 1.18, kind: 'sectors', dangerParity: 0, damage: 14, parryable: false, knock: 3.8 },
      { t: 1.62, kind: 'missile', side: 1, speed: 6.6, turn: 3.1, damage: 14, reflectable: true, parryable: false },
      { t: 2.16, kind: 'missile', side: -1, speed: 7.0, turn: 3.2, damage: 16, reflectable: true, parryable: false }
    ]
  },
  totality: {
    phase: 3, anim: 'cast', duration: 4.34, telegraph: 1.12, cue: 'dive', punish: 1.34, recoveryStart: 3.00,
    events: [
      { t: 1.22, kind: 'laneCross', width: .72, damage: 13, parryable: false, knock: 3.2 },
      { t: 1.62, kind: 'missile', side: -1, speed: 6.8, turn: 3.1, damage: 14, reflectable: true, parryable: false },
      { t: 2.02, kind: 'missile', side: 1, speed: 7.0, turn: 3.2, damage: 14, reflectable: true, parryable: false },
      { t: 2.42, kind: 'missile', side: -1, speed: 7.2, turn: 3.25, damage: 16, reflectable: true, parryable: false },
      { t: 2.82, kind: 'missile', side: 1, speed: 7.4, turn: 3.35, damage: 16, reflectable: true, parryable: false }
    ]
  },
  blackSpearline: {
    phase: 3, anim: 'thrust', duration: 3.20, telegraph: 1.06, cue: 'thrust', punish: .87, recoveryStart: 2.33,
    events: [
      { t: 1.18, kind: 'aimLine', range: 30, width: .88, damage: 17, parryable: true, knock: 5.1 },
      { t: 1.68, kind: 'missile', side: -1, speed: 7.0, turn: 3.25, damage: 15, reflectable: true, parryable: false },
      { t: 2.16, kind: 'missile', side: 1, speed: 7.0, turn: 3.25, damage: 15, reflectable: true, parryable: false }
    ]
  }
});

// Keep the complete roster on the public combat manifest while retaining the
// original Vespera-only object above as a readable historical tuning record.
// Legacy QA receives a filtered manifest from main.js when `?duel=1` is used.
export const BOSS_ATTACKS = CAMPAIGN_ATTACKS;

const PHASE_ATTACKS = {
  1: ['measureCut', 'plumbDrop', 'noonRing', 'spearline'],
  2: ['orbitShear', 'triangulation', 'zenithDive', 'coronaCage'],
  3: ['twinMeridian', 'hourbreak', 'totality', 'blackSpearline']
};

const STYLE_NAMES = [
  [0, 'STILL'], [15, 'PULSE'], [35, 'EDGE'], [60, 'TEMPEST'], [85, 'ECLIPSE']
];

function styleName(meter) {
  let result = STYLE_NAMES[0][1];
  for (const [threshold, name] of STYLE_NAMES) if (meter >= threshold) result = name;
  return result;
}

function horizontalDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function facingTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }

export class DuelGame {
  constructor({
    renderer, scene, camera, world, playerRig, bossRig, effects, audio, input, ui,
    seed = 1337,
    campaignEnabled = true,
  }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.playerRig = playerRig;
    this.bossRig = bossRig;
    this.effects = effects;
    this.audio = audio;
    this.input = input;
    this.ui = ui;
    this.seed = seed >>> 0;
    this.campaignEnabled = Boolean(campaignEnabled);
    this.encounterIndex = 0;
    this.encounterTime = 0;
    this.campaignTime = 0;
    this.gravityWells = [];
    this.travel = { from: 0, to: 0, switched: false, duration: TRANSIT_TIMELINE.duration };
    this.rng = new RNG(this.seed);
    this.mode = 'title';
    this.paused = false;
    this.time = 0;
    this.fightTime = 0;
    this.tick = 0;
    this.hitstop = 0;
    this.slowMotion = 1;
    this.cameraYaw = Math.PI;
    this.cameraPitch = .36;
    this.cameraDistance = GROUNDED_CAMERA_DISTANCE;
    this.cameraPhasePullback = 0;
    this.cameraShake = 0;
    this.cameraShakeTime = 0;
    this.cameraCollisionCorrection = 0;
    this.bossWeaponCameraDistance = 999;
    this.bossWeaponCameraOccluded = false;
    this.bossWeaponScreenDistance = 999;
    this.bossWeaponScreenSpan = 0;
    this.sequenceTime = 0;
    this._victorySound = false;
    this._victoryFracture = false;
    this.events = [];
    this.eventSeq = 0;
    this.maxEvents = 1200;
    this.bootId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.rendererInstanceId = crypto.randomUUID?.() || `renderer-${Date.now()}`;
    this.restartCount = 0;
    this.rematchCount = 0;
    this.worldGeneration = 0;
    this.debugMutationCount = 0;
    this.frameTimes = [];
    this.longFrames = 0;
    this._initState();
    this._createTrails();
    this._createMissilePool();
    this._bindUI();
    this._applyEncounterPresentation({ immediate: true });
    this._syncTransforms();
  }

  _encounter() { return encounterByIndex(this.encounterIndex); }

  _phaseBounds(phase = this.boss?.phase || 1) {
    return phaseBounds(this._encounter(), phase);
  }

  _initState() {
    const encounter = this._encounter();
    const [playerX, playerY, playerZ] = encounter.playerStart;
    const [bossX, bossY, bossZ] = encounter.bossStart;
    this.player = {
      position: new THREE.Vector3(playerX, playerY, playerZ),
      velocity: new THREE.Vector3(),
      facing: Math.PI,
      hp: 100,
      maxHp: 100,
      // The original compact duel keeps its two authored second chances. The
      // longer mechanic-led campaign encounters get one additional stolen
      // second so a solved multi-phase fight is not erased by one hostile
      // overlap near the end.
      resolve: encounter.strategy === 'duel' ? 2 : 3,
      action: 'idle',
      actionTime: 0,
      previousActionTime: 0,
      actionHit: false,
      grounded: true,
      vy: 0,
      airJumps: 0,
      airDodge: true,
      invulnerable: 0,
      parrySuccess: false,
      perfectThisDodge: false,
      locked: true,
      meter: 0,
      styleName: 'STILL',
      combo: 0,
      comboTime: 0,
      seams: 0,
      seamTime: 0,
      lastSeamFamily: '',
      recentFamilies: [],
      repeatedFamily: '',
      shotCooldown: 0,
      damageTaken: 0,
      parries: 0,
      perfectDodges: 0,
      actionsUsed: new Set(),
      lastAcceptedAction: null,
      lastAcceptedTick: -1,
      hitConfirmed: false,
      dodgeDirection: new THREE.Vector3(0,0,-1)
    };
    this.boss = {
      position: new THREE.Vector3(bossX, bossY, bossZ),
      velocity: new THREE.Vector3(),
      facing: 0,
      hp: encounter.health.max,
      maxHp: encounter.health.max,
      phase: 1,
      action: 'bossIdle',
      actionId: null,
      actionTime: 0,
      previousActionTime: 0,
      duration: 0,
      hitEvents: new Set(),
      warningEvents: new Set(),
      aim: new THREE.Vector3(),
      aimAngle: 0,
      attackFacing: 0,
      laneAngle: 0,
      cooldown: .75,
      poise: 0,
      invulnerable: false,
      stunned: false,
      dead: false,
      lastAttack: null,
      attacksSeen: new Set(),
      consecutiveRanged: 0,
      passiveTime: 0,
      lastPlayerHitTime: 0,
      adaptiveGuard: '',
      punishable: false,
      telegraphing: false,
      onScreen: true,
      orbitAngle: Math.PI,
      orbitDirection: 1,
      orbitStun: 0,
      reflectedMissileHits: 0,
      missileTutorialShown: false,
      mechanicSealed: encounter.strategy !== 'duel',
      mechanicBroken: 0,
      mechanicBrokenIndices: [],
      mechanicTotal: encounter.mechanicTargets?.[0] || 0,
      mechanicOpen: encounter.strategy === 'duel',
      mechanicOpenProgress: encounter.strategy === 'duel' ? 1 : 0,
      exposureTime: 0,
      activeNode: 0,
    };
    this.stats = {
      startTime: 0,
      clearTime: 0,
      damage: 0,
      parries: 0,
      missileReflections: 0,
      missileReturns: 0,
      swordReturns: 0,
      deflectReturns: 0,
      reflectedMissileDamage: 0,
      maxMeter: 0,
      phaseEntries: [1],
      encounterEntries: [this.encounterIndex],
      encounterClears: [],
      encounterTimes: {},
      victory: false,
    };
  }

  _createTrails() {
    this.playerTrail = this.effects.createTrail(0x31dce8, 17, {
      baseAlpha: .045,
      tipAlpha: .72,
      fade: 18,
      renderOrder: 18,
      widthHistoryPower: 1.18,
      alphaHistoryPower: 1.9,
    });
    this.playerTrailCore = this.effects.createTrail(0xe9ffff, 12, {
      baseAlpha: .1,
      tipAlpha: 1,
      fade: 23,
      renderOrder: 19,
      widthHistoryPower: 1.38,
      alphaHistoryPower: 2.2,
    });
    this.bossTrail = this.effects.createTrail(0xe24791, 18, {
      baseAlpha: .035,
      tipAlpha: .7,
      fade: 17,
      renderOrder: 18,
      widthHistoryPower: 1.28,
      alphaHistoryPower: 2,
    });
    this.bossTrailCore = this.effects.createTrail(0xffe7bc, 12, {
      baseAlpha: .08,
      tipAlpha: .92,
      fade: 22,
      renderOrder: 19,
      widthHistoryPower: 1.45,
      alphaHistoryPower: 2.25,
    });
    this._trailSamples = {
      pBase: new THREE.Vector3(),
      pTip: new THREE.Vector3(),
      pOuter: new THREE.Vector3(),
      pCore: new THREE.Vector3(),
      bBase: new THREE.Vector3(),
      bTip: new THREE.Vector3(),
      bOuter: new THREE.Vector3(),
      bCore: new THREE.Vector3(),
    };
  }

  _createMissilePool() {
    this.missileGroup = new THREE.Group();
    this.missileGroup.name = 'violet-shoulder-ordnance';
    this.scene.add(this.missileGroup);
    this.missileSerial = 0;
    this.missiles = [];

    const bodyGeometry = new THREE.ConeGeometry(.29, 1.08, 9, 1);
    bodyGeometry.rotateX(Math.PI * .5);
    const collarGeometry = new THREE.TorusGeometry(.33, .065, 7, 18);
    const coreGeometry = new THREE.OctahedronGeometry(.245, 1);
    const finGeometry = new THREE.BoxGeometry(.07, .42, .5);
    const hostileBody = new THREE.MeshStandardMaterial({
      color: 0x17131d,
      metalness: .88,
      roughness: .24,
      emissive: 0x721db6,
      emissiveIntensity: 1.42,
    });
    // A white-hot core and cyan collar stay countable against the violet
    // Black Noon sky. Violet remains on the metal body and launch burst.
    const hostileCore = new THREE.MeshBasicMaterial({ color: 0xf8fbff, toneMapped: false });
    const hostileRim = new THREE.MeshBasicMaterial({ color: 0x72efff, toneMapped: false });
    const returnedBody = new THREE.MeshStandardMaterial({
      color: 0x3b2b16,
      metalness: .9,
      roughness: .19,
      emissive: 0x6d4015,
      emissiveIntensity: .92,
    });
    const returnedCore = new THREE.MeshBasicMaterial({ color: 0xfff6ca, toneMapped: false });
    const returnedRim = new THREE.MeshBasicMaterial({ color: 0xffca62, toneMapped: false });
    this.missileResources = {
      geometries: [bodyGeometry, collarGeometry, coreGeometry, finGeometry],
      materials: [hostileBody, hostileCore, hostileRim, returnedBody, returnedCore, returnedRim],
      hostileBody,
      hostileCore,
      hostileRim,
      returnedBody,
      returnedCore,
      returnedRim,
    };

    for (let index = 0; index < 12; index += 1) {
      const root = new THREE.Group();
      root.name = `shoulder-missile-${index + 1}`;
      root.visible = false;
      const body = new THREE.Mesh(bodyGeometry, hostileBody);
      // The projectile is read through emissive silhouette and its tail. A
      // sub-metre moving shadow was invisible at combat distance and forced an
      // extra animated shadow submission for every live missile.
      body.castShadow = false;
      root.add(body);
      const collar = new THREE.Mesh(collarGeometry, hostileRim);
      collar.position.z = -.22;
      root.add(collar);
      const core = new THREE.Mesh(coreGeometry, hostileCore);
      core.position.z = -.5;
      root.add(core);
      const fins = [];
      const ghosts = [];
      for (let finIndex = 0; finIndex < 3; finIndex += 1) {
        const fin = new THREE.Mesh(finGeometry, hostileBody);
        fin.position.z = -.27;
        fin.rotation.z = finIndex * TAU / 3;
        root.add(fin);
        fins.push(fin);
      }
      for (let ghostIndex = 0; ghostIndex < 5; ghostIndex += 1) {
        const ghostMaterial = hostileRim.clone();
        ghostMaterial.transparent = true;
        ghostMaterial.depthWrite = false;
        ghostMaterial.opacity = .42 - ghostIndex * .055;
        const ghost = new THREE.Mesh(coreGeometry, ghostMaterial);
        ghost.position.z = -.86 - ghostIndex * .38;
        ghost.scale.setScalar(.8 - ghostIndex * .1);
        root.add(ghost);
        ghosts.push(ghost);
      }
      this.missileGroup.add(root);
      this.missiles.push({
        id: index,
        root,
        body,
        collar,
        core,
        fins,
        ghosts,
        active: false,
        reflected: false,
        avoided: false,
        state: 'spent',
        position: new THREE.Vector3(),
        previousPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        targetPoint: new THREE.Vector3(),
        age: 0,
        life: 0,
        speed: 0,
        maxSpeed: 0,
        acceleration: 0,
        turn: 0,
        commitAge: 0,
        visibleTime: 0,
        onScreen: false,
        sourceMove: '',
        sourceEvent: -1,
        damage: 0,
        returnDamage: 0,
        method: '',
      });
    }
  }

  _clearMissiles(reason = 'reset') {
    if (!this.missiles) return;
    for (const missile of this.missiles) {
      missile.active = false;
      missile.reflected = false;
      missile.avoided = false;
      missile.state = 'spent';
      missile.life = 0;
      missile.root.visible = false;
    }
    if (reason !== 'reset') this._event('missile.clear', { reason });
  }

  _bindUI() {
    this.ui.startButton.addEventListener('click', () => this.start());
    this.ui.resumeButton.addEventListener('click', () => this.setPaused(false));
    this.ui.restartButton.addEventListener('click', () => this.restart('pause'));
    this.ui.rematchButton.addEventListener('click', () => this.rematch());
    this.ui.mute.addEventListener('click', () => this.ui.setMuted(this.audio.toggleMuted()));
    window.addEventListener('blur', () => {
      if (this.mode === 'playing' && !this.paused) this.setPaused(true, 'focus');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing' && !this.paused) this.setPaused(true, 'visibility');
    });
  }

  async start() {
    if (this.mode !== 'title') return;
    await this.audio.start().catch(() => {});
    this.mode = 'playing';
    this.paused = false;
    this.stats.startTime = this.time;
    this.ui.showGame();
    this.input.clearBuffers();
    document.getElementById('game')?.focus();
    document.getElementById('game')?.requestPointerLock?.().catch?.(() => {});
    this._event('game.start', { immediateControl: true });
  }

  setPaused(paused, source = 'input') {
    if (!['playing', 'victorySequence', 'travelSequence'].includes(this.mode)) return;
    this.paused = paused;
    this.ui.setPaused(paused);
    this.input.clearHeld();
    this.input.clearBuffers();
    if (paused) {
      document.exitPointerLock?.();
    } else {
      document.getElementById('game')?.focus();
      if (source !== 'focus') document.getElementById('game')?.requestPointerLock?.().catch?.(() => {});
    }
    this._event(paused ? 'game.pause' : 'game.resume', { source });
  }

  restart(reason = 'death') {
    this.restartCount++;
    this._resetFight(reason, false);
    this._event('game.restart', { reason, restartCount: this.restartCount });
  }

  rematch() {
    this.rematchCount++;
    this._resetFight('rematch', true);
    this._event('game.rematch', { rematchCount: this.rematchCount });
  }

  _applyEncounterPresentation({ immediate = false, configureMechanic = true } = {}) {
    const encounter = this._encounter();
    this.world.setEncounter?.(this.encounterIndex, { immediate });
    this.world.setPhase?.(this.boss?.phase || 1, { immediate });
    this.bossRig.setEncounter?.(this.encounterIndex);
    this.bossRig.setPhase?.(this.boss?.phase || 1);
    this.audio.setEncounter?.(this.encounterIndex);
    this.audio.setPhase?.(this.boss?.phase || 1);
    this.ui.setEncounter?.(encounter, {
      index: this.encounterIndex,
      total: this.campaignEnabled ? ENCOUNTERS.length : 1,
    });
    if (configureMechanic && this.boss) this._configureEncounterMechanic({ silent: true });
  }

  _configureEncounterMechanic({ silent = false } = {}) {
    const encounter = this._encounter();
    const b = this.boss;
    const total = encounter.mechanicTargets?.[Math.max(0, b.phase - 1)] || 0;
    b.mechanicTotal = total;
    b.mechanicBroken = 0;
    b.mechanicBrokenIndices = [];
    b.mechanicSealed = encounter.strategy !== 'duel';
    b.mechanicOpen = encounter.strategy === 'duel';
    b.mechanicOpenProgress = b.mechanicOpen ? 1 : 0;
    b.activeNode = 0;
    b.exposureTime = 0;
    b.invulnerable = b.mechanicSealed || b.action === 'transition';
    const state = {
      strategy: encounter.strategy,
      sealed: b.mechanicSealed,
      broken: b.mechanicBroken,
      total: b.mechanicTotal,
      openProgress: b.mechanicOpenProgress,
      activeNode: b.activeNode,
      brokenIndices: [...b.mechanicBrokenIndices],
    };
    this.world.setMechanicState?.(state);
    this.bossRig.setMechanicState?.(state);
    this.ui.setMechanic?.({ ...state, label: encounter.mechanicLabel || '' });
    if (!silent && encounter.strategy === 'mirror') this.ui.callout('LET HER SEE HERSELF', 'cyan');
    if (!silent && encounter.strategy === 'tether') this.ui.callout('THREADSHOT THE CROWN', 'amber');
  }

  _loadEncounter(index, { preserveCampaign = false } = {}) {
    const aggregate = preserveCampaign ? this.stats : null;
    this.encounterIndex = Math.max(0, Math.min(ENCOUNTERS.length - 1, Math.round(index || 0)));
    this.encounterTime = 0;
    this._initState();
    if (aggregate) {
      this.stats = {
        ...this.stats,
        startTime: aggregate.startTime,
        damage: aggregate.damage,
        parries: aggregate.parries,
        missileReflections: aggregate.missileReflections,
        missileReturns: aggregate.missileReturns,
        swordReturns: aggregate.swordReturns,
        deflectReturns: aggregate.deflectReturns,
        reflectedMissileDamage: aggregate.reflectedMissileDamage,
        maxMeter: aggregate.maxMeter,
        encounterEntries: [...aggregate.encounterEntries, this.encounterIndex],
        encounterClears: [...aggregate.encounterClears],
        encounterTimes: { ...aggregate.encounterTimes },
      };
    }
    this._applyEncounterPresentation({ immediate: true });
  }

  _resetFight(reason, rematch) {
    const oldEvents = this.events;
    const preserveCampaign = this.campaignEnabled && !rematch && this.encounterIndex > 0;
    if (rematch) {
      this.campaignTime = 0;
      this._loadEncounter(0, { preserveCampaign: false });
    } else {
      this._loadEncounter(this.encounterIndex, { preserveCampaign });
    }
    this.events = oldEvents;
    this.worldGeneration++;
    this.mode = 'playing';
    this.paused = false;
    this.fightTime = 0;
    this.encounterTime = 0;
    this.hitstop = 0;
    this.slowMotion = 1;
    this.cameraShake = 0;
    this.cameraShakeTime = 0;
    this.cameraCollisionCorrection = 0;
    this.cameraDistance = GROUNDED_CAMERA_DISTANCE;
    this.cameraPhasePullback = 0;
    this.bossWeaponCameraDistance = 999;
    this.bossWeaponCameraOccluded = false;
    this.bossWeaponScreenDistance = 999;
    this.bossWeaponScreenSpan = 0;
    this.sequenceTime = 0;
    this._victorySound = false;
    this._victoryFracture = false;
    this.rng.reset(this.seed);
    this.effects.clear();
    this.gravityWells.length = 0;
    this._clearMissiles();
    this.audio.stopAll();
    this.audio.reset();
    this.playerRig.setPhase?.(1);
    this.playerRig.setSeams?.(0);
    this.bossRig.setPhase?.(1);
    this.bossRig.setSeams?.(0);
    this.playerRig.group.visible = true;
    this.bossRig.group.visible = true;
    if (this.bossRig.weapon) this.bossRig.weapon.visible = true;
    this.input.clearHeld();
    this.input.clearBuffers();
    this.ui.hideResult();
    this.ui.setPaused(false);
    this.ui.showGame();
    const encounter = this._encounter();
    this.ui.callout(rematch ? 'THE SAINTS REMEMBER' : encounter.strategy === 'duel' ? 'RISE ON THE BEAT' : 'RISE · THE HUNT CONTINUES', 'amber');
    this._syncTransforms();
    document.getElementById('game')?.focus();
    document.getElementById('game')?.requestPointerLock?.().catch?.(() => {});
  }

  _event(type, data = {}) {
    const event = { seq: ++this.eventSeq, tick: this.tick, time: Number(this.fightTime.toFixed(3)), type, data };
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    return event;
  }

  eventsSince(sequence = 0) { return this.events.filter((event) => event.seq > sequence); }

  update(dt, now = performance.now() / 1000) {
    this.input.beginFrame(now);
    this.audio.update();
    this.time += dt;
    if (this.input.consume('pause', .2)) {
      if (this.mode === 'title') return;
      if (this.resultVisible()) this.rematch();
      else this.setPaused(!this.paused);
      return;
    }
    if (this.mode === 'title') {
      if (this.input.consume('start', .3)) this.start();
      this._updatePresentation(dt);
      return;
    }
    if (this.resultVisible() && this.input.consume('start', .35)) {
      this.rematch();
      return;
    }
    if (this.paused) return;

    this.tick++;
    this.fightTime += dt;
    this.campaignTime += dt;
    if (this.mode === 'playing') this.encounterTime += dt;
    this.player.shotCooldown = Math.max(0, this.player.shotCooldown - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.comboTime = Math.max(0, this.player.comboTime - dt);
    if (this.player.comboTime <= 0) this.player.combo = 0;
    if (this.player.seams > 0) {
      this.player.seamTime -= dt;
      if (this.player.seamTime <= 0) this._clearSeams('expired');
    }
    if (this.player.comboTime <= 0 && this.player.meter > 0) this.player.meter = Math.max(0, this.player.meter - dt * 6);
    this.player.styleName = styleName(this.player.meter);
    this.stats.maxMeter = Math.max(this.stats.maxMeter, this.player.meter);

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this._updateCamera(dt * .22);
      this._updatePresentation(dt * .3);
      this.ui.update(this, dt);
      return;
    }

    const simDt = dt * this.slowMotion;
    this.slowMotion = damp(this.slowMotion, 1, 7, dt);
    if (this.mode === 'playing') {
      this._processPlayerInput();
      this._updatePlayer(simDt);
      this._updateBoss(simDt);
      this._updateMissiles(simDt);
      this._updateGravityWells(simDt);
      this._resolveSeparation();
    } else if (this.mode === 'victorySequence') {
      this._updateVictorySequence(simDt);
    } else if (this.mode === 'travelSequence') {
      this._updateTravelSequence(simDt);
    } else if (this.mode === 'deathSequence') {
      this._updateDeathSequence(simDt);
    }
    this._syncTransforms();
    this._updateCamera(dt);
    this._updatePresentation(dt);
    this.effects.update(dt);
    this.world.update?.(this.time, dt, this.boss.phase === 3 ? 1 : this.boss.phase * .3);
    this.ui.update(this, dt);
  }

  resultVisible() { return this.ui.result.getAttribute('aria-hidden') === 'false'; }

  _processPlayerInput() {
    const p = this.player;
    if (p.action === 'death' || p.action === 'hit') return;

    if (this.input.peek('lock')) {
      this.input.consume('lock');
      p.locked = !p.locked;
      this.ui.callout(p.locked ? 'MERIDIAN LOCK' : 'LOCK RELEASED');
      this._event('player.lock', { locked: p.locked });
    }

    if (this.input.peek('parry') && this._canCancelInto('parry')) {
      this.input.consume('parry'); this._startPlayerAction('parry'); return;
    }
    if (this.input.peek('dodge') && this._canCancelInto('dodge')) {
      this.input.consume('dodge'); this._startPlayerAction('dodge'); return;
    }
    if (this.input.peek('jump') && this._canJump()) {
      this.input.consume('jump'); this._jump(); return;
    }
    if (this.input.peek('special') && p.meter >= 100 && this._canCancelInto('special')) {
      this.input.consume('special'); this._startPlayerAction('special'); return;
    }
    if (this.input.peek('chase') && this._canAttackCancel()) {
      this.input.consume('chase'); this._startPlayerAction('chase'); return;
    }
    if (this.input.peek('shot') && p.shotCooldown <= 0 && this._canAttackCancel()) {
      this.input.consume('shot'); this._startPlayerAction('shot'); return;
    }
    if (this.input.peek('heavy') && this._canAttackCancel()) {
      this.input.consume('heavy');
      if (!p.grounded) this._startPlayerAction('plunge');
      else if (p.action === 'light2' && p.actionTime >= PLAYER_ACTIONS.light2.hit) this._startPlayerAction('launcher');
      else this._startPlayerAction('heavy');
      return;
    }
    if (this.input.peek('quick') && this._canQuick()) {
      this.input.consume('quick');
      let next;
      if (!p.grounded) {
        next = p.action === 'airLight1' ? 'airLight2' : p.action === 'airLight2' ? 'airLight3' : 'airLight1';
      } else {
        next = p.action === 'light1' ? 'light2' : p.action === 'light2' ? 'light3' : 'light1';
      }
      this._startPlayerAction(next);
    }
  }

  _canCancelInto(target) {
    const p = this.player;
    if (['idle','run','jump','fall'].includes(p.action)) return true;
    if (p.action === 'parry' || p.action === 'dodge' || p.action === 'special') return false;
    const attack = PLAYER_ACTIONS[p.action];
    if (!attack) return false;
    if (target === 'dodge' || target === 'parry') return p.actionTime >= attack.hit || p.hitConfirmed;
    if (target === 'special') return p.actionTime >= attack.hit;
    return false;
  }

  _canAttackCancel() {
    const p = this.player;
    if (['idle','run','jump','fall'].includes(p.action)) return true;
    if (p.action === 'dodge') return p.actionTime >= .25;
    const attack = PLAYER_ACTIONS[p.action];
    return Boolean(attack && p.actionTime >= (attack.chain ?? attack.hit + .08));
  }

  _canQuick() {
    const p = this.player;
    if (['idle','run','jump','fall'].includes(p.action)) return true;
    if (p.action === 'dodge') return p.actionTime >= .24;
    if (p.action === 'light1' || p.action === 'light2' || p.action === 'airLight1' || p.action === 'airLight2') {
      const attack = PLAYER_ACTIONS[p.action];
      return p.actionTime >= attack.chain;
    }
    return false;
  }

  _canJump() {
    const p = this.player;
    if (p.grounded && ['idle','run'].includes(p.action)) return true;
    if (!p.grounded && p.airJumps < 1 && ['jump','fall','airLight1','airLight2','airLight3','chase'].includes(p.action)) return true;
    const attack = PLAYER_ACTIONS[p.action];
    return Boolean(attack && p.hitConfirmed && p.actionTime >= attack.hit && p.airJumps < 1);
  }

  _jump() {
    const p = this.player;
    if (!p.grounded) p.airJumps++;
    p.grounded = false;
    p.vy = p.airJumps ? 9.2 : 10.6;
    p.action = 'jump';
    p.actionTime = 0;
    p.previousActionTime = 0;
    p.hitConfirmed = false;
    this.effects.dust(p.position.clone().add(_v1.set(0,.08,0)), 0x74849c, 9, 2.4);
    this.audio.jump?.(Boolean(p.airJumps));
    this._acceptAction('jump');
  }

  _startPlayerAction(action) {
    const p = this.player;
    p.action = action;
    p.actionTime = 0;
    p.previousActionTime = 0;
    p.actionHit = false;
    p.hitConfirmed = false;
    p.parrySuccess = false;
    if (action === 'dodge') {
      const move = this._moveDirection();
      if (move.lengthSq() < .01) move.set(Math.sin(p.facing), 0, Math.cos(p.facing)).multiplyScalar(-1);
      p.dodgeDirection.copy(move).normalize();
      p.invulnerable = .23;
      p.perfectThisDodge = false;
      this.effects.dust(p.position, 0x6ad8e7, 12, 3.6);
      this.audio.quickSwing();
    } else if (action === 'parry') {
      this.audio.guard();
      this.effects.shockwave(p.position, 0x8ef6ff, 1.05, .2);
    } else if (action === 'shot') {
      p.shotCooldown = .34;
    } else if (action === 'special') {
      p.meter = 0;
      p.invulnerable = .72;
      this.audio.special();
      this.ui.callout('BLACK MERIDIAN', 'amber');
      this.effects.shockwave(p.position, 0xf4ae53, 2.7, .36);
      this.effects.impactSlash(p.position.clone().add(_v1.set(0, 1.05, 0)), {
        color: 0x43e7ef,
        coreColor: 0xffdfa0,
        radius: 1.4,
        duration: .42,
        facing: p.facing,
        crossed: true,
        spin: .72,
      });
      this._event('player.special.start');
    } else if (action === 'heavy' || action === 'launcher' || action === 'plunge') {
      const attack = PLAYER_ACTIONS[action];
      this.audio.heavySwing(0, Math.max(0, attack.hit - .18));
      this.effects.shockwave(
        p.position,
        action === 'launcher' ? 0x8ef6ff : 0xf4ae53,
        action === 'plunge' ? 1.65 : 1.2,
        action === 'plunge' ? .28 : .2,
      );
    } else if (action === 'chase') {
      this.audio.quickSwing(0, Math.max(0, PLAYER_ACTIONS.chase.hit - .09));
      this.effects.shockwave(p.position, 0x68e9ef, .9, .17);
    } else if (PLAYER_ACTIONS[action]) {
      this.audio.quickSwing(0, Math.max(0, PLAYER_ACTIONS[action].hit - .09));
    }
    this._acceptAction(action);
  }

  _acceptAction(action) {
    this.player.actionsUsed.add(action);
    this.player.lastAcceptedAction = action;
    this.player.lastAcceptedTick = this.tick;
    this._event('player.action.start', {
      action,
      device: this.input.lastActionDevice || this.input.lastDevice,
    });
  }

  _moveDirection() {
    const move = this.input.getMove();
    if (move.length < .01) return new THREE.Vector3();
    const forward = _v1.set(0,0,-1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = _v2.crossVectors(forward, _up).normalize();
    return new THREE.Vector3().addScaledVector(forward, move.y).addScaledVector(right, move.x).normalize();
  }

  _updatePlayer(dt) {
    const p = this.player;
    p.previousActionTime = p.actionTime;
    p.actionTime += dt;
    const moveInput = this.input.getMove();
    const direction = this._moveDirection();
    const freeMove = ['idle','run','jump','fall'].includes(p.action);

    if (freeMove) {
      const targetSpeed = p.locked ? 6.3 : 7.4;
      const desiredX = direction.x * targetSpeed * moveInput.length;
      const desiredZ = direction.z * targetSpeed * moveInput.length;
      const lambda = moveInput.length > .01 ? 12 : 18;
      p.velocity.x = damp(p.velocity.x, desiredX, lambda, dt);
      p.velocity.z = damp(p.velocity.z, desiredZ, lambda, dt);
      if (p.grounded) p.action = moveInput.length > .08 ? 'run' : 'idle';
    } else if (p.action === 'dodge') {
      const speed = p.actionTime < .28 ? 13.8 * (1 - p.actionTime * 1.3) : 2.4;
      p.velocity.x = p.dodgeDirection.x * speed;
      p.velocity.z = p.dodgeDirection.z * speed;
    } else {
      const attack = PLAYER_ACTIONS[p.action];
      if (attack) {
        const forwardSpeed = this._attackMoveSpeed(p.action, p.actionTime, attack);
        const targetAngle = p.locked ? facingTo(p.position, this.boss.position) : p.facing;
        p.facing = moveAngle(p.facing, targetAngle, dt * 8);
        p.velocity.x = Math.sin(p.facing) * forwardSpeed;
        p.velocity.z = Math.cos(p.facing) * forwardSpeed;
      } else {
        p.velocity.x = damp(p.velocity.x, 0, 14, dt);
        p.velocity.z = damp(p.velocity.z, 0, 14, dt);
      }
    }

    if (p.locked && p.action !== 'dodge') p.facing = moveAngle(p.facing, facingTo(p.position, this.boss.position), dt * 12.6);
    else if (direction.lengthSq() > .01 && freeMove) p.facing = moveAngle(p.facing, Math.atan2(direction.x, direction.z), dt * 12.6);

    p.position.x += p.velocity.x * dt;
    p.position.z += p.velocity.z * dt;

    if (!p.grounded) {
      p.vy -= 27 * dt;
      p.position.y += p.vy * dt;
      if (p.position.y <= 0) {
        const wasPlunge = p.action === 'plunge';
        p.position.y = 0;
        p.vy = 0;
        p.grounded = true;
        p.airJumps = 0;
        p.airDodge = true;
        if (wasPlunge && !p.actionHit) this._tryPlayerHit(PLAYER_ACTIONS.plunge, 'plunge');
        p.action = 'idle';
        p.actionTime = 0;
        this.effects.dust(p.position, 0x8290a8, wasPlunge ? 25 : 8, wasPlunge ? 5 : 2);
        if (wasPlunge) this.effects.shockwave(p.position, 0x87eef4, 4.5, .3);
      } else if (p.vy < 0 && p.action === 'jump') p.action = 'fall';
    }

    const attack = PLAYER_ACTIONS[p.action];
    if (attack && crossed(p.previousActionTime, p.actionTime, attack.hit)) {
      this._tryPlayerHit(attack, p.action);
    }

    if (p.action === 'dodge' && p.actionTime >= .42) this._finishPlayerAction();
    else if (p.action === 'parry' && p.actionTime >= (p.parrySuccess ? .18 : .36)) this._finishPlayerAction();
    else if (p.action === 'hit' && p.actionTime >= .43) this._finishPlayerAction();
    else if (attack && p.actionTime >= attack.duration) this._finishPlayerAction();

    const radius = this._currentPlayerRadius();
    const r = Math.hypot(p.position.x, p.position.z);
    if (r > radius) {
      const nx = p.position.x / r, nz = p.position.z / r;
      p.position.x = nx * radius; p.position.z = nz * radius;
      const outward = p.velocity.x * nx + p.velocity.z * nz;
      if (outward > 0) { p.velocity.x -= nx * outward * 1.6; p.velocity.z -= nz * outward * 1.6; }
    }
  }

  _currentPlayerRadius() {
    const arena = Math.min(this.world.arenaRadius || 18.25, 18.2);
    const finalRadius = Math.min(arena, this.world.finalPlayerRadius || 12);
    const rupture = clamp01(this.world.ruptureBlend || 0);
    const collisionBlend = rupture * rupture * (3 - 2 * rupture);
    return THREE.MathUtils.lerp(arena, finalRadius, collisionBlend);
  }

  _attackMoveSpeed(action, time, attack) {
    if (action === 'special') return time < .52 ? 15 : 0;
    if (action === 'chase') {
      const distance = horizontalDistance(this.player.position, this.boss.position);
      return distance > 2.9 ? 13.5 : 1.8;
    }
    if (action === 'plunge') return 1.8;
    const p = clamp01(time / Math.max(.05, attack.hit));
    return attack.move * Math.sin(p * Math.PI) * (time <= attack.hit ? 1 : .2);
  }

  _finishPlayerAction() {
    const p = this.player;
    p.action = p.grounded ? (this.input.getMove().length > .08 ? 'run' : 'idle') : (p.vy > 0 ? 'jump' : 'fall');
    p.actionTime = 0;
    p.previousActionTime = 0;
    p.actionHit = false;
    p.hitConfirmed = false;
  }

  _tryPlayerHit(attack, action) {
    const p = this.player, b = this.boss;
    p.actionHit = true;
    if (this._trySwordReflectMissile(attack, action)) {
      p.hitConfirmed = true;
      p.combo++;
      p.comboTime = 2.7;
      return;
    }
    if (b.dead) return;
    if (this._encounter().strategy === 'tether' && b.mechanicSealed && action === 'shot') {
      if (horizontalDistance(p.position, b.position) <= attack.range + 3) this._breakCrownTether();
      return;
    }
    let hit = false;
    const distance = horizontalDistance(p.position, b.position);
    if (attack.ranged || attack.special) hit = distance <= attack.range;
    else {
      const angle = facingTo(p.position, b.position);
      hit = distance <= attack.range && Math.abs(angleDelta(p.facing, angle)) <= attack.arc * .5 && Math.abs(p.position.y - b.position.y) < 4;
    }
    if (!hit) return;

    p.hitConfirmed = true;
    const contact = this._contactPoint();
    if (b.invulnerable) {
      this.effects.sparks(contact, 0xc5c8d2, 10, 3.2);
      this.audio.hit(.45);
      const sealedCallout = this._encounter().strategy === 'mirror'
        ? 'PRISM WARD · BAIT THE GAZE'
        : this._encounter().strategy === 'tether'
          ? 'CROWN SEALED · USE THREADSHOT'
          : 'DIAL SEALED';
      this.ui.callout(sealedCallout, 'danger');
      return;
    }

    let damage = attack.damage;
    let poise = attack.poise;
    const family = attack.family;
    const lastThree = p.recentFamilies.slice(-3);
    if (lastThree.length === 3 && lastThree.every((f) => f === family)) {
      b.adaptiveGuard = family;
      damage *= .42;
      poise *= .25;
      this.ui.callout('ROUTE READ · CHANGE FORM', 'danger');
      this.effects.sparks(contact, 0xff83b7, 14, 4);
      this._event('boss.adapt', { family });
    } else if (b.adaptiveGuard && b.adaptiveGuard !== family) {
      b.adaptiveGuard = '';
      damage *= 1.12;
      poise *= 1.25;
      this.ui.callout('GUARD BROKEN', 'amber');
    }
    p.recentFamilies.push(family);
    if (p.recentFamilies.length > 8) p.recentFamilies.shift();

    if (attack.rupture && p.seams > 0) {
      const seams = p.seams;
      damage += seams * 28;
      poise += seams * 14;
      this.audio.rupture();
      this.effects.burst(contact, 0xf4ae53, 20 + seams * 12, 5 + seams);
      this.effects.shockwave(b.position, 0xf4ae53, 3.5 + seams * 1.3, .38);
      this.ui.callout(`${seams} SEAM${seams > 1 ? 'S' : ''} RUPTURED`, 'amber');
      this._gainMeter([0,8,15,25][seams] || 25, 'rupture');
      this._event('combat.rupture', { seams, action });
      this._clearSeams('ruptured');
    } else if (attack.seam) {
      this._addSeam(family);
    } else if (attack.ranged && p.seams > 0) {
      p.seamTime = Math.min(6, p.seamTime + 1);
    }

    if (attack.special) {
      damage = Math.min(damage, 360);
      this.ui.callout('THE SECOND CUT OPEN', 'amber');
      this.effects.shockwave(contact, 0xcdfdff, 9, .52);
    }

    this._damageBoss(damage, poise, attack.hitstop, action, contact);
    this._gainMeter(attack.meter + (p.recentFamilies.at(-2) !== family ? 4 : 0), family);
    p.combo++;
    p.comboTime = 2.7;
    b.passiveTime = 0;
    b.lastPlayerHitTime = this.fightTime;
    if (attack.launch && !b.invulnerable) {
      b.poise += 22;
      if (!p.grounded) p.vy = Math.max(p.vy, 3);
      else { p.grounded = false; p.position.y = .15; p.vy = 7.8; }
      this._event('combat.launch', { poise: b.poise });
    }
  }

  _syncMechanicState() {
    const encounter = this._encounter();
    const b = this.boss;
    const state = {
      strategy: encounter.strategy,
      sealed: b.mechanicSealed,
      broken: b.mechanicBroken,
      total: b.mechanicTotal,
      openProgress: b.mechanicOpenProgress,
      activeNode: b.activeNode,
      brokenIndices: [...b.mechanicBrokenIndices],
      exposureTime: b.exposureTime,
    };
    this.world.setMechanicState?.(state);
    this.bossRig.setMechanicState?.(state);
    this.ui.setMechanic?.({ ...state, label: encounter.mechanicLabel || '' });
  }

  _breakCrownTether() {
    const b = this.boss;
    // The crown's relight/phase-change pose is the readable reset beat between
    // exposure cycles. Threadshot previously bypassed ordinary invulnerability
    // and could cut the next node during that animation before it was actually
    // presented to the player.
    if (!b.mechanicSealed || b.mechanicBroken >= b.mechanicTotal
      || b.dead || b.action === 'transition') return false;
    const node = this.bossRig.nodes?.[b.activeNode];
    const contact = new THREE.Vector3();
    if (node?.core?.getWorldPosition) node.core.getWorldPosition(contact);
    else contact.copy(b.position).add(_v1.set(0, 2.4, 0));
    b.mechanicBroken++;
    b.activeNode = Math.min(Math.max(0, b.mechanicTotal - 1), b.mechanicBroken);
    this.player.hitConfirmed = true;
    this.player.combo++;
    this.player.comboTime = 2.7;
    this._gainMeter(7, 'crownTether');
    this.effects.burst(contact, 0xffcf6b, 34, 7.5);
    this.effects.shockwave(contact, 0xa977ff, 3.2, .34);
    this.audio.nodeBreak?.(b.mechanicBroken, b.mechanicTotal);
    this.hitstop = Math.max(this.hitstop, .045);
    this.cameraShake = Math.max(this.cameraShake, .42);
    this.cameraShakeTime = .14;
    this.ui.callout(`${b.mechanicBroken} / ${b.mechanicTotal} CROWN TETHER${b.mechanicBroken === 1 ? '' : 'S'} CUT`, 'amber');
    this._event('mechanic.tether.break', { broken: b.mechanicBroken, total: b.mechanicTotal });
    if (b.mechanicBroken >= b.mechanicTotal) this._openBossMechanic('tether');
    else this._syncMechanicState();
    return true;
  }

  _openBossMechanic(strategy) {
    const b = this.boss;
    const p = this.player;
    const encounter = this._encounter();
    let recovered = 0;
    b.mechanicSealed = false;
    b.mechanicOpen = true;
    b.mechanicOpenProgress = 1;
    b.invulnerable = false;
    b.poise = 0;
    b.actionId = null;
    b.action = 'stagger';
    b.actionTime = 0;
    b.duration = strategy === 'tether' ? 1.18 : 1.0;
    b.stunned = true;
    b.telegraphing = false;
    b.punishable = true;
    if (strategy === 'tether') {
      b.exposureTime = encounter.exposureDuration?.[b.phase] || 9;
      // A complete crown sever releases the saintglass charge Cathedra was
      // feeding into its furnace. Unlike Lacrima's small per-prism return,
      // this is one larger reward for finishing the full precision sequence.
      recovered = Math.min(10, p.maxHp - p.hp);
      p.hp += recovered;
      if (recovered > 0) {
        this.effects.burst(p.position.clone().add(_v1.set(0, 1.1, 0)), 0xffca61, 18, 4.2);
        this.effects.shockwave(p.position, 0xa977ff, 1.7, .28);
      }
      this.ui.callout('STAR-EATER DRAGGED DOWN', 'amber');
    } else {
      this.ui.callout('PRISM WARD SHATTERED', 'cyan');
    }
    this.audio.wardOpen?.(strategy);
    this.effects.shockwave(b.position, strategy === 'tether' ? 0xffca61 : 0x7ff9ff, 8.5, .56);
    this._syncMechanicState();
    this._event('mechanic.open', {
      strategy,
      phase: b.phase,
      duration: b.exposureTime,
      recovered,
      playerHp: p.hp,
    });
  }

  _contactPoint() {
    return this.player.position.clone().lerp(this.boss.position, .7).add(_v1.set(0, 1.45, 0));
  }

  _damageBoss(damage, poise, hitstop, action, contact) {
    const b = this.boss;
    const before = b.hp;
    b.hp = Math.max(0, b.hp - damage);
    b.poise += poise;
    const sourceAngle = facingTo(b.position, this.player.position);
    const reactionSide = angleDelta(b.facing, sourceAngle) < 0 ? -1 : 1;
    this.bossRig.react?.({
      strength: clamp(damage / 150, .24, 1),
      side: reactionSide,
      lift: action === 'launcher' ? 1 : action === 'special' ? .42 : action === 'heavy' || action === 'plunge' ? .16 : 0,
      kind: action,
      armored: Boolean(b.actionId && !b.stunned && !['transition', 'death'].includes(b.action)),
    });
    this.bossRig.hitFlash?.(Math.min(.78, .24 + damage / 210));
    // Keep ordinary contact readable: the sharp vertical cut is the hit glyph.
    // Only finishers kick an environmental echo across the floor, where it
    // cannot masquerade as another body-height circular impact marker.
    const environmentEcho = ['light3', 'airLight3', 'heavy', 'launcher', 'plunge', 'special'].includes(action);
    if (environmentEcho) {
      const echoColor = action === 'special' || action === 'heavy' || action === 'plunge' ? 0xf4ae53 : 0x8ff7ff;
      this.world.pulse?.(b.position, echoColor, Math.min(.8, damage / 170));
    }
    this.effects.sparks(contact, action === 'special' ? 0xf4ae53 : 0x8df5ff, 12 + Math.round(damage / 12), 4.2 + damage / 80);
    const finisher = ['light3', 'airLight3', 'heavy', 'launcher', 'plunge', 'special'].includes(action);
    const impactColor = action === 'special' || action === 'heavy' || action === 'plunge' ? 0xf4ae53 : 0x54e8f0;
    const impactRadius = action === 'special' ? 2.4 : action === 'heavy' || action === 'plunge' ? 1.55 : finisher ? 1.32 : action === 'shot' ? .58 : .92;
    this.effects.impactSlash(contact, {
      color: impactColor,
      coreColor: action === 'special' ? 0xf7ffff : 0xeaffff,
      radius: impactRadius,
      duration: action === 'special' ? .36 : finisher ? .27 : .2,
      facing: this.player.facing,
      crossed: finisher,
      spin: action === 'special' ? .54 : .16,
    });
    this.audio.hit(clamp(damage / 75, .55, 1.6));
    this.ui.impact(clamp(damage / 90, .5, 1.6));
    this.hitstop = Math.max(this.hitstop, hitstop);
    this.cameraShake = Math.max(this.cameraShake, clamp(damage / 100, .15, 1.2));
    this.cameraShakeTime = .16;
    this.input.vibrate(55 + Math.min(80, damage), clamp(damage / 180, .12, .75), clamp(damage / 100, .25, 1));
    this._event('combat.hit', { source: 'player', target: 'boss', attack: action, damage: Number(damage.toFixed(1)), bossHp: Number(b.hp.toFixed(1)), hitstop });

    const poiseThreshold = this._encounter().poise?.[b.phase] || (b.phase === 1 ? 105 : b.phase === 2 ? 125 : 150);
    if (b.poise >= poiseThreshold && !['transition','death'].includes(b.action)) this._staggerBoss(action === 'launcher' ? 1.0 : .82);
    if (b.hp <= 0 && before > 0) {
      this._defeatBoss();
      return;
    }
    const desiredPhase = phaseForHealth(this._encounter(), b.hp);
    if (desiredPhase > b.phase) this._enterPhase(desiredPhase);
  }

  _addSeam(family) {
    const p = this.player;
    if (p.lastSeamFamily === family) {
      p.seamTime = 6;
      return;
    }
    p.lastSeamFamily = family;
    p.seams = Math.min(3, p.seams + 1);
    p.seamTime = 6;
    this.bossRig.setSeams?.(p.seams);
    this.ui.callout(`${p.seams} SEAM${p.seams > 1 ? 'S' : ''} INSCRIBED`);
    this._event('combat.seam', { count: p.seams, family });
  }

  _clearSeams(reason) {
    this.player.seams = 0;
    this.player.seamTime = 0;
    this.player.lastSeamFamily = '';
    this.bossRig.setSeams?.(0);
    this._event('combat.seams.clear', { reason });
  }

  _gainMeter(amount, reason) {
    const p = this.player;
    const before = p.meter;
    p.meter = clamp(p.meter + amount, 0, 100);
    if (before < 100 && p.meter >= 100) {
      this.ui.callout('BLACK MERIDIAN READY', 'amber');
      this._event('player.meter.full', { reason });
    }
  }

  _launchMissile(event, eventIndex) {
    const missile = this.missiles.find((entry) => !entry.active);
    if (!missile) {
      this._event('missile.skipped', { reason: 'pool-full', move: this.boss.actionId, event: eventIndex });
      return null;
    }
    const b = this.boss;
    const side = event.side || (this.missileSerial % 2 ? 1 : -1);
    const forwardX = Math.sin(b.facing);
    const forwardZ = Math.cos(b.facing);
    const rightX = Math.cos(b.facing);
    const rightZ = -Math.sin(b.facing);
    missile.active = true;
    missile.reflected = false;
    missile.avoided = false;
    missile.state = 'track';
    missile.age = 0;
    missile.life = 5.4;
    missile.speed = event.speed || 6.5;
    missile.maxSpeed = event.maxSpeed || 13.2;
    missile.acceleration = event.acceleration || 4.8;
    missile.turn = event.turn || 3;
    missile.commitAge = 0;
    missile.visibleTime = 0;
    missile.onScreen = false;
    missile.sourceMove = b.actionId || 'debugMissile';
    missile.sourceEvent = eventIndex;
    missile.damage = event.damage || 14;
    missile.returnDamage = 0;
    missile.method = '';
    missile.serial = ++this.missileSerial;
    const fallbackMuzzle = _v3.set(
      b.position.x + rightX * side * 1.22 + forwardX * .3,
      b.position.y + 2.72,
      b.position.z + rightZ * side * 1.22 + forwardZ * .3,
    );
    const muzzle = side < 0 ? this.bossRig.leftShoulderMuzzle : this.bossRig.rightShoulderMuzzle;
    if (muzzle?.getWorldPosition) {
      this.bossRig.group.position.copy(b.position);
      this.bossRig.group.rotation.y = b.facing;
      this.bossRig.group.updateMatrixWorld(true);
      muzzle.getWorldPosition(missile.position);
      if (!Number.isFinite(missile.position.x)) missile.position.copy(fallbackMuzzle);
    } else missile.position.copy(fallbackMuzzle);
    missile.previousPosition.copy(missile.position);
    const target = _v1.copy(this.player.position).add(_v2.set(0, 1.08, 0));
    missile.targetPoint.copy(target);
    missile.velocity.copy(target).sub(missile.position).normalize().multiplyScalar(missile.speed);
    missile.root.position.copy(missile.position);
    missile.root.quaternion.setFromUnitVectors(_forward, missile.velocity.clone().normalize());
    missile.root.scale.setScalar(.48);
    missile.root.visible = true;
    missile.body.material = this.missileResources.hostileBody;
    missile.fins.forEach((fin) => { fin.material = this.missileResources.hostileBody; });
    missile.collar.material = this.missileResources.hostileRim;
    missile.core.material = this.missileResources.hostileCore;
    missile.ghosts.forEach((ghost, index) => {
      ghost.material.color.set(0x72efff);
      ghost.material.opacity = .42 - index * .055;
      ghost.position.z = -.86 - index * .38;
      ghost.scale.setScalar(.8 - index * .1);
    });

    this.effects.burst(missile.position, 0xb946ff, 16, 4.8);
    this.world.pulse?.(b.position, 0x9d41ef, .55);
    this.audio.missileLaunch?.(side);
    if (!b.missileTutorialShown) {
      b.missileTutorialShown = true;
      this.ui.callout('RETURN THE VIOLET FIRE', 'amber');
    }
    this._event('missile.launch', {
      id: missile.serial,
      move: b.actionId,
      event: eventIndex,
      side,
      speed: missile.speed,
      reflectable: true,
    });
    return missile;
  }

  _commitMissile(missile) {
    if (!missile?.active || missile.reflected || missile.state !== 'track') return;
    missile.state = 'commit';
    missile.commitAge = 0;
    missile.targetPoint.copy(this.player.position).add(_v1.set(0, 1.02, 0));
    missile.turn = .22;
    missile.speed = Math.max(missile.speed, 10.8);
    missile.maxSpeed = Math.max(missile.maxSpeed, 13.6);
    this.effects.warning({
      position: missile.targetPoint.clone().setY(.035),
      radius: .92,
      duration: .5,
      color: 0xe6a6ff,
      from: 2.45,
    });
    this.effects.impactSlash(missile.position, {
      color: 0xd86bff,
      coreColor: 0xffffff,
      radius: .7,
      duration: .18,
      facing: facingTo(missile.position, this.player.position),
      crossed: true,
    });
    this.audio.missileCommit?.(missile.sourceEvent % 2 ? 1 : -1);
    this._event('missile.commit', {
      id: missile.serial,
      move: missile.sourceMove,
      event: missile.sourceEvent,
      target: missile.targetPoint.toArray().map((value) => Number(value.toFixed(3))),
      eta: Number((missile.position.distanceTo(missile.targetPoint) / missile.speed).toFixed(3)),
    });
  }

  _reflectMissile(missile, method) {
    if (!missile?.active || missile.reflected) return false;
    const p = this.player;
    missile.reflected = true;
    missile.state = 'reflected';
    missile.method = method;
    missile.age = 0;
    missile.life = 5.2;
    missile.speed = method === 'deflect' ? 19.5 : method === 'meridian' ? 21.5 : 17.2;
    missile.maxSpeed = missile.speed;
    missile.acceleration = 0;
    missile.turn = method === 'deflect' ? 6.2 : 5.4;
    missile.returnDamage = method === 'deflect' ? 300 : method === 'meridian' ? 350 : 220;
    const target = _v1.copy(this.boss.position).add(_v2.set(0, 1.85, 0));
    missile.targetPoint.copy(target);
    missile.velocity.copy(target).sub(missile.position).normalize().multiplyScalar(missile.speed);
    missile.body.material = this.missileResources.returnedBody;
    missile.fins.forEach((fin) => { fin.material = this.missileResources.returnedBody; });
    missile.collar.material = this.missileResources.returnedRim;
    missile.core.material = this.missileResources.returnedCore;
    missile.ghosts.forEach((ghost, index) => {
      ghost.material.color.set(method === 'deflect' ? 0x8effff : 0xffd477);
      ghost.material.opacity = .38 - index * .05;
      // Stretch the already-pooled exhaust markers into a clear return stroke.
      // This changes no collision timing and allocates no combat-time objects.
      ghost.position.z = -1.1 - index * .52;
      ghost.scale.setScalar(.9 - index * .11);
    });

    p.hitConfirmed = true;
    this.stats.missileReflections++;
    if (method === 'deflect') this.stats.deflectReturns++;
    else this.stats.swordReturns++;
    this._gainMeter(method === 'deflect' ? 18 : 10, `missile-${method}`);
    this.hitstop = Math.max(this.hitstop, method === 'deflect' ? .085 : .045);
    if (method === 'deflect') this.slowMotion = .42;
    this.effects.burst(missile.position, method === 'deflect' ? 0xc9fdff : 0xffd477, 30, 7.2);
    this.effects.impactSlash(missile.position, {
      color: method === 'deflect' ? 0x5cebf2 : 0xffc75d,
      coreColor: 0xffffff,
      radius: method === 'deflect' ? 1.65 : 1.28,
      duration: method === 'deflect' ? .32 : .25,
      facing: p.facing,
      crossed: true,
      spin: method === 'deflect' ? .4 : .22,
    });
    this.audio.missileReflect?.(method);
    this.ui.callout(method === 'deflect' ? 'PERFECT RETURN' : 'ORDNANCE RETURNED', 'amber');
    this.ui.perfect();
    this.input.vibrate(method === 'deflect' ? 115 : 75, .55, method === 'deflect' ? 1 : .72);
    this._event('combat.missile.reflect', { id: missile.serial, method, returnDamage: missile.returnDamage });
    return true;
  }

  _trySwordReflectMissile(attack, action) {
    if (!attack || action === 'shot') return false;
    const p = this.player;
    let candidate = null;
    let candidateDistance = Infinity;
    for (const missile of this.missiles) {
      if (!missile.active || missile.reflected) continue;
      const dx = missile.position.x - p.position.x;
      const dz = missile.position.z - p.position.z;
      const horizontal = Math.hypot(dx, dz);
      const vertical = Math.abs(missile.position.y - (p.position.y + 1.05));
      const reach = Math.min(4.35, attack.range + (['heavy', 'launcher', 'plunge', 'special'].includes(action) ? .55 : .15));
      if (horizontal > reach || vertical > 2.05) continue;
      const angle = Math.atan2(dx, dz);
      if (Math.abs(angleDelta(p.facing, angle)) > Math.min(TAU, attack.arc + .45) * .5) continue;
      if (horizontal < candidateDistance) {
        candidate = missile;
        candidateDistance = horizontal;
      }
    }
    if (!candidate) return false;
    return this._reflectMissile(candidate, action === 'special' ? 'meridian' : 'sword');
  }

  _registerMissilePerfectDodge(missile) {
    const p = this.player;
    if (p.perfectThisDodge) return;
    p.perfectThisDodge = true;
    p.perfectDodges++;
    this._gainMeter(14, 'missile-perfect-dodge');
    this.slowMotion = .45;
    this.hitstop = Math.max(this.hitstop, .045);
    this.audio.perfectDodge();
    this.ui.callout('MISSILE HAIRLINE');
    this.ui.perfect();
    this.effects.sparks(missile.position, 0x8ef6ff, 24, 6.5);
    this._event('combat.perfectDodge', { move: 'shoulderMissile', missile: missile.serial });
  }

  _deactivateMissile(missile, reason, color = 0x9d41ef) {
    if (!missile?.active) return;
    missile.active = false;
    missile.state = 'spent';
    missile.root.visible = false;
    missile.life = 0;
    this.effects.burst(missile.position, color, reason === 'returned' ? 38 : 18, reason === 'returned' ? 8 : 4.5);
    this._event('missile.resolve', { id: missile.serial, reason, reflected: missile.reflected });
  }

  _updateMissiles(dt) {
    if (!this.missiles?.length) return;
    const p = this.player;
    const b = this.boss;
    for (const missile of this.missiles) {
      if (!missile.active) continue;
      missile.age += dt;
      missile.life -= dt;
      if (missile.life <= 0) {
        this._deactivateMissile(missile, 'expired', missile.reflected ? 0xffcf67 : 0x7f36c4);
        continue;
      }

      missile.onScreen = this._projectileFramed(missile.position);
      if (missile.onScreen) missile.visibleTime += dt;
      const livePlayerTarget = _v1.copy(p.position).add(_v2.set(0, 1.02, 0));
      const distanceToPlayer = missile.position.distanceTo(livePlayerTarget);
      if (!missile.reflected && missile.state === 'track' && distanceToPlayer <= 6.05) {
        this._commitMissile(missile);
      }

      missile.previousPosition.copy(missile.position);
      if (missile.acceleration > 0) {
        const nearButUnframed = !missile.reflected && !missile.onScreen && distanceToPlayer < 7;
        missile.speed = nearButUnframed
          ? Math.max(5.2, missile.speed - dt * 8)
          : Math.min(missile.maxSpeed, missile.speed + missile.acceleration * dt);
      }
      const target = missile.reflected
        ? _v1.copy(b.position).add(_v2.set(0, 1.85, 0))
        : missile.state === 'commit'
          ? _v1.copy(missile.targetPoint)
          : _v1.copy(livePlayerTarget);
      const desired = _v3.copy(target).sub(missile.position).normalize().multiplyScalar(missile.speed);
      const steer = 1 - Math.exp(-missile.turn * dt);
      missile.velocity.lerp(desired, steer).normalize().multiplyScalar(missile.speed);
      missile.position.addScaledVector(missile.velocity, dt);
      if (missile.state === 'commit') missile.commitAge += dt;
      missile.onScreen = this._projectileFramed(missile.position);
      missile.root.position.copy(missile.position);
      missile.root.quaternion.setFromUnitVectors(_forward, _v3.copy(missile.velocity).normalize());
      const commitPulse = missile.state === 'commit' ? 1 + Math.sin(missile.commitAge * 38) * .08 : 1;
      const returnReadability = missile.reflected ? 1.26 : 1;
      missile.root.scale.setScalar((.42 + .58 * Math.min(1, missile.age * 7)) * commitPulse * returnReadability);
      missile.collar.rotation.z += dt * (missile.reflected ? 17 : 11);
      missile.core.rotation.z -= dt * 8;
      missile.fins.forEach((fin, index) => { fin.rotation.z += dt * (index % 2 ? -2.6 : 2.6); });

      if (missile.reflected) {
        if (pointSegmentDistanceSq(target, missile.previousPosition, missile.position) <= 1.5 * 1.5) {
          if (!b.invulnerable && !b.dead) {
            const contact = missile.position.clone();
            b.reflectedMissileHits++;
            b.orbitStun = Math.max(b.orbitStun, missile.method === 'deflect' ? .72 : .5);
            this.stats.missileReturns++;
            this.stats.reflectedMissileDamage += missile.returnDamage;
            this._damageBoss(missile.returnDamage, missile.method === 'deflect' ? 46 : 31, .075, 'missileReturn', contact);
            this.ui.callout('CANNON JUDGED', 'amber');
            this.audio.missileReturnHit?.();
            this._event('combat.missile.returnHit', {
              id: missile.serial,
              method: missile.method,
              damage: missile.returnDamage,
              bossHp: Number(b.hp.toFixed(1)),
            });
          }
          this._deactivateMissile(missile, 'returned', 0xffd477);
        }
        continue;
      }

      const playerTarget = _v1.copy(p.position).add(_v2.set(0, 1.02, 0));
      const sweptContact = pointSegmentDistanceSq(playerTarget, missile.previousPosition, missile.position) <= .92 * .92;
      if (!sweptContact || !missile.onScreen || missile.visibleTime < DEFENSE_WINDOWS.missileVisibleGrace) {
        if (missile.state === 'commit') {
          const beforeDistance = missile.previousPosition.distanceTo(missile.targetPoint);
          const afterDistance = missile.position.distanceTo(missile.targetPoint);
          if (missile.commitAge > 1.12 || (afterDistance > beforeDistance + .02 && afterDistance > 1.05)) {
            this._deactivateMissile(missile, 'missed', 0x8752b5);
          }
        }
        continue;
      }
      const parryActive = p.action === 'parry'
        && p.actionTime >= DEFENSE_WINDOWS.parryStart
        && p.actionTime <= DEFENSE_WINDOWS.parryEnd;
      if (parryActive) {
        p.parrySuccess = true;
        p.parries++;
        this.stats.parries++;
        this._reflectMissile(missile, 'deflect');
        this.audio.parry();
        this._event('combat.parry', { move: 'shoulderMissile', missile: missile.serial });
        continue;
      }
      if (p.action === 'special') {
        this._reflectMissile(missile, 'meridian');
        continue;
      }
      if (p.invulnerable > 0) {
        if (p.action === 'dodge'
          && p.actionTime >= DEFENSE_WINDOWS.dodgePerfectStart
          && p.actionTime <= DEFENSE_WINDOWS.dodgePerfectEnd) this._registerMissilePerfectDodge(missile);
        this._deactivateMissile(missile, 'evaded', 0x8ef6ff);
        continue;
      }
      this.effects.impactSlash(playerTarget, {
        color: 0xb94cff,
        coreColor: 0xffd9ff,
        radius: 1.25,
        duration: .24,
        facing: facingTo(missile.position, p.position),
        crossed: true,
      });
      this._damagePlayer(missile.damage, 3.4, 'shoulderMissile', missile.velocity);
      this._deactivateMissile(missile, 'playerHit', 0xb94cff);
    }
  }

  _updateBoss(dt) {
    const b = this.boss;
    if (b.dead) return;
    const encounter = this._encounter();
    const orbiting = (encounter.strategy === 'duel' && b.phase === 3)
      || (encounter.strategy === 'tether' && b.mechanicSealed);
    b.orbitStun = Math.max(0, b.orbitStun - dt);
    b.previousActionTime = b.actionTime;
    b.actionTime += dt;
    b.passiveTime += dt;
    // Attack orientation commits when the telegraph begins.  Tracking through
    // contact makes an honest wind-up become an animation lie.
    if (!b.actionId) b.facing = moveAngle(b.facing, facingTo(b.position, this.player.position), dt * 8);
    b.poise = Math.max(0, b.poise - dt * 4.5);
    if (orbiting) this._updateFinalBossOrbit(dt, b.action === 'transition');
    else if (encounter.strategy === 'tether' && b.mechanicOpen) this._updateTetherExposure(dt);

    if (b.action === 'transition') {
      if (b.actionTime >= b.duration) {
        b.invulnerable = b.mechanicSealed;
        b.action = 'bossIdle';
        b.actionId = null;
        b.actionTime = 0;
        b.cooldown = .48;
      }
      return;
    }
    if (b.action === 'stagger') {
      if (b.actionTime >= b.duration) {
        b.stunned = false;
        b.action = 'bossIdle';
        b.actionTime = 0;
        b.cooldown = .5;
      }
      return;
    }
    if (b.actionId) {
      const attack = BOSS_ATTACKS[b.actionId];
      b.telegraphing = attack.events.some((event, index) => {
        const lead = this._bossWarningLead(event, index);
        return b.actionTime >= Math.max(0, event.t - lead) && b.actionTime < event.t;
      });
      b.punishable = b.actionTime >= attack.recoveryStart;
      if (!orbiting) this._moveBossDuringAttack(attack, dt);
      this._updateBossWarnings(attack);
      attack.events.forEach((event, index) => {
        if (!b.hitEvents.has(index) && crossed(b.previousActionTime, b.actionTime, event.t)) {
          b.hitEvents.add(index);
          this._resolveBossHit(event, b.actionId, index);
        }
      });
      if (b.actionTime >= attack.duration) {
        b.lastAttack = b.actionId;
        b.actionId = null;
        b.action = 'bossIdle';
        b.actionTime = 0;
        b.cooldown = .38 + this.rng.next() * .22;
        b.telegraphing = false;
        b.punishable = false;
      }
      return;
    }

    b.cooldown -= dt;
    const distance = horizontalDistance(b.position, this.player.position);
    if (orbiting) {
      if (b.cooldown <= 0 && b.actionTime >= .2) this._chooseBossAttack(distance);
      return;
    }
    let move = 0;
    if (distance > 5.8) move = 3.5 + b.phase * .4;
    else if (distance < 3.0) move = -2.2;
    const side = Math.sin(this.fightTime * .75 + b.phase) * .55;
    b.velocity.x = Math.sin(b.facing) * move + Math.cos(b.facing) * side;
    b.velocity.z = Math.cos(b.facing) * move - Math.sin(b.facing) * side;
    b.position.x += b.velocity.x * dt;
    b.position.z += b.velocity.z * dt;
    this._clampBoss();

    if (b.cooldown <= 0 && b.actionTime >= .2) this._chooseBossAttack(distance);
  }

  _updateFinalBossOrbit(dt, transitioning = false) {
    const b = this.boss;
    const radius = this.world.finalBossOrbitRadius || 18.5;
    const baseHeight = this.world.finalBossFlightHeight || 5.15;
    const orbitSpeed = b.orbitStun > 0 || b.stunned
      ? 0
      : transitioning
        ? .14
        : b.actionId
          ? .075
          : .245;
    b.orbitAngle += dt * orbitSpeed * b.orbitDirection;
    const targetX = Math.sin(b.orbitAngle) * radius;
    const targetZ = Math.cos(b.orbitAngle) * radius;
    const targetY = baseHeight + Math.sin(this.fightTime * .83 + b.orbitAngle * 1.7) * .48;
    const oldX = b.position.x;
    const oldY = b.position.y;
    const oldZ = b.position.z;
    const response = transitioning ? 1.8 : 5.2;
    b.position.x = damp(b.position.x, targetX, response, dt);
    b.position.y = damp(b.position.y, targetY, response, dt);
    b.position.z = damp(b.position.z, targetZ, response, dt);
    b.velocity.set(
      (b.position.x - oldX) / Math.max(dt, 1 / 240),
      (b.position.y - oldY) / Math.max(dt, 1 / 240),
      (b.position.z - oldZ) / Math.max(dt, 1 / 240),
    );
    b.facing = moveAngle(b.facing, facingTo(b.position, this.player.position), dt * (transitioning ? 3.5 : 7.5));
  }

  _updateTetherExposure(dt) {
    const b = this.boss;
    if (!b.mechanicOpen || b.dead || b.action === 'transition') return;
    b.exposureTime = Math.max(0, b.exposureTime - dt);
    const targetAngle = facingTo(b.position, this.player.position);
    const targetDistance = 4.35;
    const targetX = this.player.position.x - Math.sin(targetAngle) * targetDistance;
    const targetZ = this.player.position.z - Math.cos(targetAngle) * targetDistance;
    b.position.x = damp(b.position.x, targetX, 2.4, dt);
    b.position.y = damp(b.position.y, 0, 5.5, dt);
    b.position.z = damp(b.position.z, targetZ, 2.4, dt);
    if (b.exposureTime <= 0) this._resealCrown();
  }

  _resealCrown() {
    const b = this.boss;
    if (this._encounter().strategy !== 'tether' || b.dead || b.mechanicSealed) return;
    b.mechanicSealed = true;
    b.mechanicOpen = false;
    b.mechanicOpenProgress = 0;
    b.mechanicBroken = 0;
    b.mechanicBrokenIndices = [];
    b.activeNode = 0;
    b.exposureTime = 0;
    b.invulnerable = true;
    b.action = 'transition';
    b.actionId = null;
    b.actionTime = 0;
    b.duration = 1.05;
    b.stunned = false;
    b.telegraphing = false;
    b.punishable = false;
    b.orbitAngle = Math.atan2(b.position.x, b.position.z);
    this._syncMechanicState();
    this.ui.callout('THE CROWN RELIGHTS', 'danger');
    this.audio.transition?.(b.phase);
    this.effects.shockwave(b.position, 0x8c63ff, 7.2, .5);
    this._event('mechanic.tether.reseal', { phase: b.phase });
  }

  _moveBossDuringAttack(attack, dt) {
    const b = this.boss;
    let speed = 0;
    if (b.actionId === 'measureCut' && b.actionTime < .45) speed = 3.2;
    if (b.actionId === 'spearline' && b.actionTime > .8 && b.actionTime < 1.15) speed = 10;
    if (b.actionId === 'orbitShear' && b.actionTime < .6) speed = 2.5;
    if (b.actionId === 'zenithDive' && b.actionTime > .82 && b.actionTime < 1.05) speed = 13;
    if (b.actionId === 'twinMeridian' && b.actionTime < 1.45) speed = 3.8;
    if (b.actionId === 'hourbreak' && b.actionTime > 1.36 && b.actionTime < 1.68) speed = 14;
    if (b.actionId === 'totality' && b.actionTime > 1.7 && b.actionTime < 2.0) speed = 15;
    if (speed) {
      const angle = ['spearline','zenithDive','hourbreak','totality'].includes(b.actionId) ? b.aimAngle : b.attackFacing;
      b.position.x += Math.sin(angle) * speed * dt;
      b.position.z += Math.cos(angle) * speed * dt;
      this._clampBoss();
    }
  }

  _clampBoss() {
    const encounter = this._encounter();
    if ((encounter.strategy === 'duel' && this.boss.phase === 3)
      || (encounter.strategy === 'tether' && this.boss.mechanicSealed)) return;
    const radius = Math.max(8, (encounter.arenaRadius || 18) - 1.15);
    const r = Math.hypot(this.boss.position.x, this.boss.position.z);
    if (r > radius) { this.boss.position.x *= radius / r; this.boss.position.z *= radius / r; }
  }

  _chooseBossAttack(distance) {
    const b = this.boss;
    const encounter = this._encounter();
    if (!this._bossFramed()) {
      this.player.locked = true;
      b.cooldown = .32;
      this._event('camera.safety.reacquire', { reason: 'boss-offscreen' });
      return;
    }
    let candidates = [...(encounter.phaseAttacks[b.phase] || PHASE_ATTACKS[b.phase])];
    if (encounter.strategy === 'tether' && b.mechanicOpen) {
      candidates = [...(encounter.exposureAttacks || candidates)];
    } else if (encounter.strategy === 'mirror' && b.mechanicSealed) {
      const gaze = candidates.find((id) => BOSS_ATTACKS[id]?.events?.some((event) => event.kind === 'mirrorBeam'));
      if (gaze && (b.passiveTime > 1.8 || !b.attacksSeen.has(gaze))) candidates = [gaze];
    } else if (encounter.strategy === 'duel' && b.phase === 3) {
      if (b.passiveTime > 4.6) candidates = ['totality', 'hourbreak'];
      else candidates = candidates.filter((id) => id !== b.lastAttack);
    } else if (encounter.strategy === 'duel' && b.passiveTime > 3.1 && b.phase >= 2) candidates = ['coronaCage'];
    else if (encounter.strategy === 'duel' && distance > 8) candidates = [b.phase === 1 ? 'spearline' : 'coronaCage'];
    else candidates = candidates.filter((id) => id !== b.lastAttack);
    if (!candidates.length) candidates = [...(encounter.phaseAttacks[b.phase] || PHASE_ATTACKS[b.phase])];
    const openingOrders = encounter.openingOrders;
    const unseen = openingOrders[b.phase].find((id) => !b.attacksSeen.has(id) && candidates.includes(id));
    const id = unseen || candidates[this.rng.int(candidates.length)];
    this._startBossAttack(id);
  }

  _startBossAttack(id) {
    const b = this.boss;
    const attack = BOSS_ATTACKS[id];
    b.actionId = id;
    b.action = attack.anim;
    b.actionTime = 0;
    b.previousActionTime = 0;
    b.duration = attack.duration;
    b.hitEvents.clear();
    b.warningEvents.clear();
    b.aim.copy(this.player.position);
    b.aimAngle = facingTo(b.position, b.aim);
    b.facing = b.aimAngle;
    b.attackFacing = b.aimAngle;
    b.laneAngle = b.aimAngle + (this.rng.next() - .5) * .35;
    b.attacksSeen.add(id);
    b.telegraphing = true;
    b.punishable = false;
    this.audio.telegraph(attack.cue);
    this.ui.telegraph(attack.telegraph);
    this._spawnBossTelegraph(attack);
    this._event('boss.telegraph.start', { move: id, phase: b.phase, duration: attack.telegraph });
  }

  _bossWarningLead(event, index) {
    if (index === 0) return event.t;
    const leadByKind = {
      line: .53,
      aimLine: .53,
      aimAoe: .52,
      lowRing: .48,
      outer: .42,
      lane: .52,
      laneCross: .56,
      sectors: .68,
      missile: .74,
      mirrorBeam: .72,
      gravityWell: .7,
    };
    return Math.min(event.t, leadByKind[event.kind] ?? .5);
  }

  _updateBossWarnings(attack) {
    const b = this.boss;
    attack.events.forEach((event, index) => {
      if (b.warningEvents.has(index)) return;
      const lead = this._bossWarningLead(event, index);
      const warningStart = Math.max(0, event.t - lead);
      if (b.actionTime + 1e-6 < warningStart) return;
      b.warningEvents.add(index);
      if (event.retarget) {
        b.aim.copy(this.player.position);
        b.aimAngle = facingTo(b.position, b.aim);
      }
      this._spawnBossEventTelegraph(event, lead);
      if (index > 0) {
        this.audio.telegraph(event.kind === 'missile' ? 'cast' : attack.cue);
        this.ui.telegraph(lead);
      }
      this._event('boss.warning.start', {
        move: b.actionId,
        event: index,
        kind: event.kind,
        lead: Number(lead.toFixed(3)),
      });
    });
  }

  _spawnBossEventTelegraph(event, duration) {
    const b = this.boss;
    const encounter = this._encounter();
    const pink = encounter.phaseAccent?.[b.phase - 1] || (b.phase === 3 ? 0xd9a0ff : 0xff5ca8);
    const bossPosition = () => b.position.clone().setY(.035);
    const line = (angle, range, width, lineDuration, followBoss = true) => {
      const from = bossPosition();
      const to = from.clone().add(new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(range));
      this.effects.lineWarning({ from, to, width, duration: lineDuration, color: pink, follow: followBoss ? this.bossRig.group : null });
    };
    const worldLane = (angle, width, laneDuration) => {
      const length = 19;
      const from = new THREE.Vector3(-Math.sin(angle) * length, .035, -Math.cos(angle) * length);
      const to = new THREE.Vector3(Math.sin(angle) * length, .035, Math.cos(angle) * length);
      this.effects.lineWarning({ from, to, width, duration: laneDuration, color: pink });
    };

    // The geometry below is built from the same event fields as hit testing.
    // Later beats are spawned near their own reaction window instead of
    // presenting an entire multi-hit equation at the first wind-up.
    if (event.kind === 'line') {
      line(b.attackFacing, event.range, event.width, duration);
    } else if (event.kind === 'arc' || event.kind === 'shadowArc') {
      const facing = event.kind === 'shadowArc' ? b.aimAngle : b.attackFacing;
      this.effects.warning({
        position: bossPosition(),
        radius: event.range,
        duration,
        color: pink,
        from: .88,
        follow: this.bossRig.group,
      });
      for (const side of [-1, 1]) line(facing + side * event.arc * .5, event.range, .075, duration);
    } else if (event.kind === 'aimLine' || event.kind === 'mirrorBeam') {
      line(b.aimAngle, event.range, event.width, duration);
    } else if (event.kind === 'aimAoe') {
      this.effects.warning({ position: this._eventAim(event).setY(.035), radius: event.radius, duration, color: pink, from: 1.7 });
    } else if (event.kind === 'gravityWell') {
      this.effects.warning({ position: this._eventAim(event).setY(.035), radius: event.radius, duration, color: 0x9c6dff, from: .16 });
    } else if (event.kind === 'lowRing') {
      this.effects.warning({ position: bossPosition(), radius: event.outer, duration, color: 0xf4ae53, from: .12, follow: this.bossRig.group });
    } else if (event.kind === 'outer') {
      this.effects.warning({ position: new THREE.Vector3(0, .035, 0), radius: event.safeRadius, duration, color: pink, from: 1.025 });
    } else if (event.kind === 'lane') {
      worldLane(b.laneAngle + event.angleOffset, event.width, duration);
    } else if (event.kind === 'laneCross') {
      worldLane(Math.PI / 4, event.width, duration);
      worldLane(-Math.PI / 4, event.width, duration);
    } else if (event.kind === 'sectors') {
      this.effects.sectorWarning({
        dangerParity: event.dangerParity,
        radius: b.phase === 3 ? (this.world.finalPlayerRadius || 12) : 18,
        duration,
        color: pink,
      });
    } else if (event.kind === 'missile') {
      this.effects.warning({
        position: this.player.position.clone().setY(.035),
        radius: 1.15,
        duration,
        color: 0xc85cff,
        from: 2.65,
        follow: this.playerRig.group,
      });
    }
  }

  _spawnBossTelegraph(attack) {
    const b = this.boss;
    const pink = this._encounter().phaseAccent?.[b.phase - 1] || (b.phase === 3 ? 0xd9a0ff : 0xff5ca8);
    const bossPosition = () => b.position.clone().setY(.035);
    this._updateBossWarnings(attack);
    // Melee arcs are read from the weapon pose and committed facing; a modest
    // reach ring adds spatial scale without pretending the whole disc is hit.
    const arcEvents = attack.events.filter((event) => event.kind === 'arc' || event.kind === 'shadowArc');
    const arcReach = Math.max(0, ...arcEvents.map((event) => event.range || 0));
    if (arcReach) {
      this.effects.warning({ position: bossPosition(), radius: arcReach, duration: attack.telegraph, color: pink, from: .78, follow: this.bossRig.group });
      const widest = arcEvents.reduce((best, event) => !best || event.arc > best.arc ? event : best, null);
      if (widest) {
        for (const side of [-1, 1]) {
          const angle = b.attackFacing + side * widest.arc * .5;
          const from = bossPosition();
          const to = from.clone().add(new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(widest.range));
          this.effects.lineWarning({ from, to, width: .095, duration: attack.telegraph, color: pink, follow: this.bossRig.group });
        }
      }
    }
  }

  _eventAim(event = {}) {
    return bossEventAim(event, this.boss.aim, this.boss.aimAngle);
  }

  _resolveBossHit(event, attackId, eventIndex) {
    const p = this.player, b = this.boss;
    if (event.kind === 'missile') {
      this._launchMissile(event, eventIndex);
      this.cameraShake = Math.max(this.cameraShake, .26);
      this.cameraShakeTime = .1;
      this._event('boss.attack.active', {
        move: attackId,
        event: eventIndex,
        kind: 'missile',
        launched: true,
        wouldHit: false,
        framed: this._bossFramed(),
      });
      return;
    }
    if (event.kind === 'gravityWell') {
      this._spawnGravityWell(event, attackId, eventIndex);
      this._event('boss.attack.active', {
        move: attackId,
        event: eventIndex,
        kind: event.kind,
        launched: true,
        wouldHit: false,
        framed: this._bossFramed(),
      });
      return;
    }
    const mirrorIntercepted = event.kind === 'mirrorBeam'
      && this._resolveMirrorBeam(event, attackId, eventIndex);
    const framed = this._bossFramed();
    const wouldHit = !mirrorIntercepted && framed && this._bossEventHits(event);
    const impactPos = event.kind === 'aimAoe' ? this._eventAim(event) : p.position.clone();
    impactPos.y = .12;
    if (event.kind === 'lowRing' || event.kind === 'outer' || event.kind === 'sectors' || event.kind === 'laneCross') this.effects.shockwave(event.kind === 'outer' ? new THREE.Vector3(0,.04,0) : b.position, event.kind === 'lowRing' ? 0xf4ae53 : 0xff5ca8, event.outer || 10, .32);
    if (!mirrorIntercepted && ['aimAoe','line','aimLine','mirrorBeam','lane','laneCross','sectors'].includes(event.kind)) this.effects.burst(impactPos, this._encounter().phaseAccent?.[b.phase - 1] || 0xff5ca8, 18, 5);
    if (!mirrorIntercepted) this.world.pulse?.(impactPos, this._encounter().accent || 0xff5ca8, .6);
    this.audio.bossRelease?.(event.kind, b.phase);
    this.cameraShake = Math.max(this.cameraShake, .35);
    this.cameraShakeTime = .12;
    this._event('boss.attack.active', {
      move: attackId,
      event: eventIndex,
      wouldHit,
      framed,
      mirrorIntercepted,
    });
    if (!wouldHit || p.action === 'death') return;

    const parryActive = p.action === 'parry'
      && p.actionTime >= DEFENSE_WINDOWS.parryStart
      && p.actionTime <= DEFENSE_WINDOWS.parryEnd;
    if (event.parryable && parryActive) {
      p.parrySuccess = true;
      p.parries++;
      this.stats.parries++;
      this._gainMeter(15, 'parry');
      this.hitstop = Math.max(this.hitstop, .09);
      this.slowMotion = .38;
      this.bossRig.react?.({
        strength: 1,
        side: angleDelta(b.facing, facingTo(b.position, p.position)) < 0 ? -1 : 1,
        lift: .36,
        kind: 'parry',
        armored: false,
      });
      this._staggerBoss(.9);
      this.effects.burst(this._contactPoint(), 0xc9fdff, 38, 8);
      this.effects.shockwave(this._contactPoint(), 0xc9fdff, 4.8, .34);
      this.effects.impactSlash(this._contactPoint(), {
        color: 0x5cebf2,
        coreColor: 0xffd889,
        radius: 1.9,
        duration: .34,
        facing: p.facing,
        crossed: true,
        spin: .42,
      });
      this.audio.parry();
      this.ui.callout('PERFECT DEFLECT');
      this.ui.perfect();
      this.input.vibrate(110, .65, 1);
      this._event('combat.parry', { move: attackId, event: eventIndex });
      return;
    }

    if (p.invulnerable > 0 || p.action === 'special') {
      if (p.action === 'dodge' && !p.perfectThisDodge
        && p.actionTime >= DEFENSE_WINDOWS.dodgePerfectStart
        && p.actionTime <= DEFENSE_WINDOWS.dodgePerfectEnd) {
        p.perfectThisDodge = true;
        p.perfectDodges++;
        this._gainMeter(12, 'perfectDodge');
        this.slowMotion = .45;
        this.hitstop = Math.max(this.hitstop, .045);
        this.audio.perfectDodge();
        this.ui.callout('HAIRLINE DODGE');
        this.ui.perfect();
        this.effects.sparks(p.position.clone().add(_v1.set(0,1,0)), 0x8ef6ff, 22, 6);
        this.effects.impactSlash(p.position.clone().add(_v1.set(0, 1.05, 0)), {
          color: 0x46dce8,
          radius: .9,
          duration: .22,
          facing: p.facing,
          spin: -.28,
        });
        this._event('combat.perfectDodge', { move: attackId, event: eventIndex });
      }
      return;
    }
    this.effects.impactSlash(p.position.clone().add(_v1.set(0, 1.0, 0)), {
      color: b.phase === 3 ? 0xbd68ff : 0xff4f9c,
      coreColor: 0xffe7b5,
      radius: 1.3,
      duration: .24,
      facing: b.attackFacing,
      crossed: event.kind === 'aimAoe' || event.kind === 'laneCross',
      spin: -.18,
    });
    this._damagePlayer(event.damage, event.knock || 2.5, attackId);
  }

  _resolveMirrorBeam(event, attackId, eventIndex) {
    const b = this.boss;
    const p = this.player;
    if (this._encounter().strategy !== 'mirror' || !b.mechanicSealed) return false;
    const candidates = (this.world.mechanicTargets?.() || [])
      .filter((target) => this._distanceToRay(target.position, b.position, b.aimAngle, event.range) <= event.width + 1.05)
      .sort((left, right) => horizontalDistance(left.position, b.position) - horizontalDistance(right.position, b.position));
    const target = candidates[0];
    if (!target || b.mechanicBrokenIndices.includes(target.index)) return false;
    b.mechanicBrokenIndices.push(target.index);
    b.mechanicBroken = b.mechanicBrokenIndices.length;
    const impact = target.position.clone().add(_v1.set(0, 1.9, 0));
    this.effects.burst(impact, 0xbafcff, 46, 8.5);
    this.effects.shockwave(target.position, 0xff91e2, 4.8, .42);
    this.world.pulse?.(target.position, 0x83f8ff, .9);
    this.audio.anchorBreak?.(b.mechanicBroken, b.mechanicTotal);
    this.hitstop = Math.max(this.hitstop, .06);
    this.slowMotion = Math.min(this.slowMotion, .62);
    this.cameraShake = Math.max(this.cameraShake, .58);
    this.cameraShakeTime = .18;
    // Lacrima stole vitality into the living mirrors. Baiting her beam into a
    // prism returns a small, visible portion of it, rewarding mastery of this
    // encounter's core strategy without turning ordinary sword hits into
    // passive sustain.
    const recovered = Math.min(5, p.maxHp - p.hp);
    p.hp += recovered;
    if (recovered > 0) {
      this.effects.burst(p.position.clone().add(_v2.set(0, 1.05, 0)), 0x83f8ff, 14, 3.8);
      this.effects.shockwave(p.position, 0xbafcff, 1.45, .24);
    }
    this.ui.callout(`${b.mechanicBroken} / ${b.mechanicTotal} PRISM${b.mechanicBroken === 1 ? '' : 'S'} BROKEN`, 'cyan');
    this._event('mechanic.mirror.break', {
      move: attackId,
      event: eventIndex,
      target: target.index,
      broken: b.mechanicBroken,
      total: b.mechanicTotal,
      recovered,
      playerHp: p.hp,
    });
    if (b.mechanicBroken >= b.mechanicTotal) this._openBossMechanic('mirror');
    else this._syncMechanicState();
    return true;
  }

  _spawnGravityWell(event, attackId, eventIndex) {
    const position = this._eventAim(event).setY(.04);
    const well = {
      id: `${attackId}:${eventIndex}:${this.tick}`,
      position,
      age: 0,
      duration: Math.max(.4, event.duration || 2.8),
      radius: event.radius || 4.5,
      pull: event.pull || 10,
      damage: event.damage || 18,
      collapsed: false,
    };
    this.gravityWells.push(well);
    this.effects.warning({ position: position.clone(), radius: well.radius, duration: well.duration, color: 0x8c63ff, from: .12 });
    this.effects.shockwave(position, 0x5c37c8, well.radius * .58, .45);
    this.world.pulse?.(position, 0x8e66ff, .82);
    this.audio.gravityWell?.();
    this._event('mechanic.gravity.spawn', {
      id: well.id,
      position: position.toArray().map((value) => Number(value.toFixed(2))),
      radius: well.radius,
      duration: well.duration,
    });
  }

  _updateGravityWells(dt) {
    if (!this.gravityWells.length) return;
    const p = this.player;
    for (const well of this.gravityWells) {
      well.age += dt;
      const dx = well.position.x - p.position.x;
      const dz = well.position.z - p.position.z;
      const distance = Math.hypot(dx, dz) || .001;
      const reach = well.radius * 1.85;
      if (distance < reach && well.age < well.duration) {
        const strength = well.pull * Math.pow(1 - distance / reach, 1.45);
        p.velocity.x += dx / distance * strength * dt;
        p.velocity.z += dz / distance * strength * dt;
      }
      if (!well.collapsed && well.age >= well.duration) {
        well.collapsed = true;
        this.effects.burst(well.position.clone().add(_v1.set(0, .35, 0)), 0xc7a2ff, 58, 8.2);
        this.effects.shockwave(well.position, 0xffc85e, well.radius * 1.22, .5);
        this.cameraShake = Math.max(this.cameraShake, .62);
        this.cameraShakeTime = .18;
        if (distance <= well.radius && p.invulnerable <= 0 && p.action !== 'special') {
          this._damagePlayer(well.damage, 4.2, 'gravityWell', _v2.set(-dx, 0, -dz));
        }
        this.audio.gravityCollapse?.();
        this._event('mechanic.gravity.collapse', { id: well.id, hit: distance <= well.radius });
      }
    }
    this.gravityWells = this.gravityWells.filter((well) => well.age < well.duration + .16);
  }

  _bossEventHits(event) {
    const b = this.boss;
    return bossEventHits(event, {
      playerPosition: this.player.position,
      bossPosition: b.position,
      attackFacing: b.attackFacing,
      aimAngle: b.aimAngle,
      aim: b.aim,
      laneAngle: b.laneAngle,
    });
  }

  _distanceToRay(point, origin, angle, range) {
    return bossDistanceToRay(point, origin, angle, range);
  }

  _bossFramed() {
    if (!this.camera) return true;
    const projected = _v3.copy(this.boss.position).add(_v2.set(0, 1.55, 0)).project(this.camera);
    return projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .94 && projected.y > -.95 && projected.y < .9;
  }

  _projectileFramed(position) {
    if (!this.camera) return true;
    const projected = _v3.copy(position).project(this.camera);
    return projected.z > -1 && projected.z < 1
      && Math.abs(projected.x) < .92
      && projected.y > -.92
      && projected.y < .88;
  }

  _damagePlayer(damage, knock, source, impulse = null) {
    const p = this.player;
    const encounterScale = source === 'qa' ? 1 : (this._encounter().incomingDamageScale || 1);
    const resolvedDamage = Math.max(1, Math.round(damage * encounterScale));
    p.hp = Math.max(0, p.hp - resolvedDamage);
    p.damageTaken += resolvedDamage;
    this.stats.damage += resolvedDamage;
    p.meter = Math.max(0, p.meter - 22);
    p.combo = 0;
    p.comboTime = 0;
    p.action = 'hit';
    p.actionTime = 0;
    p.previousActionTime = 0;
    p.invulnerable = .42;
    const away = impulse
      ? _v1.copy(impulse).setY(0).normalize()
      : _v1.copy(p.position).sub(this.boss.position).setY(0).normalize();
    p.velocity.addScaledVector(away, knock);
    this.playerRig.hitFlash?.(.52);
    this.effects.burst(p.position.clone().add(_v2.set(0,1,0)), 0xff5ca8, 24, 6);
    this.audio.playerHit();
    this.ui.damage();
    this.cameraShake = Math.max(this.cameraShake, .75);
    this.cameraShakeTime = .2;
    this.hitstop = Math.max(this.hitstop, .045);
    this.input.vibrate(150, .85, .65);
    this._event('player.damage', { damage: resolvedDamage, source, hp: p.hp });
    if (p.hp <= 0) {
      if (p.resolve > 0) {
        p.resolve--;
        p.hp = 34;
        p.invulnerable = 1.15;
        this.ui.callout('A SECOND STOLEN BACK', 'amber');
        this.effects.shockwave(p.position, 0xf4ae53, 5.5, .5);
        this.audio.transition(this.boss.phase);
        this._event('player.resolve', { remaining: p.resolve });
      } else this._defeatPlayer();
    }
  }

  _staggerBoss(duration = .82) {
    const b = this.boss;
    if (b.dead || b.action === 'transition') return;
    b.action = 'stagger';
    b.actionId = null;
    b.actionTime = 0;
    b.duration = duration;
    b.poise = 0;
    b.stunned = true;
    b.telegraphing = false;
    b.punishable = true;
    this.ui.callout('SAINT UNBALANCED', 'amber');
    this._event('boss.stagger', { duration });
  }

  _enterPhase(phase) {
    const b = this.boss;
    const encounter = this._encounter();
    b.phase = phase;
    b.action = 'transition';
    b.actionId = null;
    b.actionTime = 0;
    b.duration = phase === 3 ? 2.35 : 1.58;
    b.invulnerable = true;
    b.poise = 0;
    b.stunned = false;
    b.cooldown = .5;
    b.attacksSeen.clear();
    b.telegraphing = false;
    if ((encounter.strategy === 'duel' && phase === 3) || encounter.strategy === 'tether') {
      b.orbitAngle = Math.atan2(b.position.x, b.position.z);
      b.orbitDirection = this.rng.next() < .5 ? -1 : 1;
      this._clearMissiles('phase-transition');
    }
    this.gravityWells.length = 0;
    this.world.setPhase?.(phase);
    this.bossRig.setPhase?.(phase);
    this._configureEncounterMechanic({ silent: true });
    this.audio.transition(phase);
    const phaseColor = encounter.phaseAccent?.[phase - 1] || (phase === 3 ? 0xb774ff : 0xf4ae53);
    this.effects.shockwave(b.position, phaseColor, phase === 3 ? 13 : 9, .75);
    this.effects.burst(b.position.clone().add(_v1.set(0,1.8,0)), phaseColor, 70, 10);
    this.ui.callout(encounter.phaseCallouts?.[phase] || `PHASE ${phase}`, encounter.phaseTone?.[phase] || (phase === 3 ? 'danger' : 'amber'));
    this.stats.phaseEntries.push(phase);
    this._event('boss.phase.enter', { phase });
  }

  _defeatPlayer() {
    const p = this.player;
    p.action = 'death';
    p.actionTime = 0;
    p.velocity.set(0,0,0);
    this.mode = 'deathSequence';
    this._clearMissiles('player-defeat');
    this.sequenceTime = 0;
    this.audio.defeat();
    this._event('player.death');
  }

  _defeatBoss() {
    const b = this.boss;
    const p = this.player;
    const encounter = this._encounter();
    b.dead = true;
    b.hp = 0;
    b.action = 'death';
    b.actionId = null;
    b.actionTime = 0;
    b.telegraphing = false;
    b.invulnerable = true;
    b.defeatOrigin = b.position.clone();
    // Victory is a deliberate authored state, not a low-powered continuation
    // of gameplay.  Clear buffered input and arrest locomotion immediately so
    // the result panel can never sit above a silently jogging character.
    p.velocity.set(0, 0, 0);
    p.action = 'victory';
    p.actionTime = 0;
    p.previousActionTime = 0;
    p.hitConfirmed = false;
    this.input.clearHeld();
    this.input.clearBuffers();
    this.mode = 'victorySequence';
    this._clearMissiles('boss-defeat');
    this.sequenceTime = 0;
    this.stats.encounterTimes[encounter.id] = Number(this.encounterTime.toFixed(3));
    if (!this.stats.encounterClears.includes(this.encounterIndex)) this.stats.encounterClears.push(this.encounterIndex);
    this.stats.clearTime = this.campaignEnabled ? this.campaignTime : this.fightTime;
    this.stats.victory = !this.campaignEnabled || this.encounterIndex >= ENCOUNTERS.length - 1;
    this.effects.burst(b.position.clone().add(_v1.set(0,2,0)), 0xf4ae53, 110, 12);
    this.effects.shockwave(b.position, 0xf4ae53, 14, .85);
    this.audio.rupture();
    this._event('boss.defeat', {
      encounter: encounter.id,
      encounterIndex: this.encounterIndex,
      clearTime: this.stats.clearTime,
      encounterTime: Number(this.encounterTime.toFixed(3)),
    });
  }

  _updateDeathSequence(dt) {
    this.sequenceTime += dt;
    this.player.actionTime += dt;
    this.player.velocity.multiplyScalar(Math.exp(-8*dt));
    if (this.sequenceTime > 1.2 && !this.resultVisible()) {
      document.exitPointerLock?.();
      this.ui.showResult({ victory: false, time: this.fightTime, rank: this.player.styleName, damage: this.stats.damage, parries: this.stats.parries });
      this._event('game.defeat.result');
    }
  }

  _updateVictorySequence(dt) {
    this.sequenceTime += dt;
    this.boss.actionTime += dt;
    // In Black Noon the defeated reliquary loses its impossible outer-rail
    // flight and spirals back toward the ruptured dial. This makes the death
    // pose readable at gameplay distance while preserving the final arena.
    if (this.boss.phase === 3 && this.boss.defeatOrigin) {
      const raw = clamp01(this.sequenceTime / 1.95);
      const fall = raw * raw * (3 - 2 * raw);
      const origin = this.boss.defeatOrigin;
      const towardX = origin.x - this.player.position.x;
      const towardZ = origin.z - this.player.position.z;
      const towardLength = Math.hypot(towardX, towardZ) || 1;
      const dirX = towardX / towardLength;
      const dirZ = towardZ / towardLength;
      const targetX = this.player.position.x + dirX * 5.8;
      const targetZ = this.player.position.z + dirZ * 5.8;
      const sideArc = Math.sin(fall * Math.PI) * 1.15 * (this.boss.orbitDirection || 1);
      this.boss.position.set(
        THREE.MathUtils.lerp(origin.x, targetX, fall) - dirZ * sideArc,
        THREE.MathUtils.lerp(origin.y, .48, fall) + Math.sin(fall * Math.PI) * .55,
        THREE.MathUtils.lerp(origin.z, targetZ, fall) + dirX * sideArc,
      );
    }
    if (this.sequenceTime >= .72 && !this._victoryFracture) {
      this._victoryFracture = true;
      const fracture = this.boss.position.clone().add(_v1.set(0, 1.75, 0));
      this.effects.burst(fracture, 0xf5f1ff, 84, 9.5);
      this.effects.shockwave(this.boss.position, 0xb774ff, 10, .58);
    }
    if (!this.resultVisible()) this.player.actionTime += dt;
    this.player.velocity.multiplyScalar(Math.exp(-12 * dt));
    if (!this.player.grounded) {
      this.player.vy -= 27 * dt;
      this.player.position.y += this.player.vy * dt;
      if (this.player.position.y <= 0) {
        this.player.position.y = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.effects.dust(this.player.position, 0xd9edf0, 8, 1.8);
      }
    }
    if (this.sequenceTime > .35 && this.sequenceTime < 2.2 && Math.floor(this.sequenceTime * 10) % 3 === 0) {
      const pos = this.boss.position.clone().add(new THREE.Vector3((Math.random()-.5)*3, .4+Math.random()*3, (Math.random()-.5)*3));
      this.effects.burst(pos, Math.random()>.5 ? 0xf4ae53 : 0x8ef6ff, 5, 4);
    }
    if (this.sequenceTime > 1.7 && !this._victorySound) { this._victorySound = true; this.audio.victory(); }
    if (this.sequenceTime > 2.3 && !this.resultVisible()) {
      if (this.campaignEnabled && this.encounterIndex < ENCOUNTERS.length - 1) {
        this._beginTravelSequence();
        return;
      }
      document.exitPointerLock?.();
      this.ui.showResult({ victory: true, time: this.stats.clearTime, rank: this.player.styleName, damage: this.stats.damage, parries: this.stats.parries });
      this._event('game.victory', { stats: { ...this.stats } });
    }
  }

  _beginTravelSequence() {
    const from = this.encounterIndex;
    const to = from + 1;
    this.mode = 'travelSequence';
    this.sequenceTime = 0;
    this.travel = { from, to, switched: false, duration: TRANSIT_TIMELINE.duration };
    this.gravityWells.length = 0;
    this._clearMissiles('campaign-transit');
    this.world.beginTransit?.(from, to);
    this.ui.showTransit?.({ from: this._encounter(), to: encounterByIndex(to) });
    this.audio.travel?.(from, to);
    this._event('campaign.transit.begin', { from, to });
  }

  _switchTravelEncounter() {
    if (this.travel.switched) return;
    this.travel.switched = true;
    const oldEvents = this.events;
    this._loadEncounter(this.travel.to, { preserveCampaign: true });
    this.events = oldEvents;
    this.effects.clear();
    this.gravityWells.length = 0;
    this._clearMissiles();
    this.playerRig.group.visible = false;
    this.bossRig.group.visible = false;
    this._event('campaign.encounter.loaded', {
      encounter: this._encounter().id,
      encounterIndex: this.encounterIndex,
    });
  }

  _updateTravelSequence(dt) {
    this.sequenceTime += dt;
    const beat = transitBeat(this.sequenceTime / this.travel.duration);
    const progress = beat.progress;
    this.world.updateTransit?.(progress, this.time);
    if (beat.actorsHidden) {
      this.playerRig.group.visible = false;
      this.bossRig.group.visible = false;
    }
    if (beat.swapped && !this.travel.switched) this._switchTravelEncounter();
    this.ui.updateTransit?.(progress, { from: encounterByIndex(this.travel.from), to: encounterByIndex(this.travel.to) });
    if (!beat.complete) return;

    if (!this.travel.switched) this._switchTravelEncounter();
    this.world.endTransit?.();
    this.playerRig.group.visible = true;
    this.bossRig.group.visible = true;
    if (this.bossRig.weapon) this.bossRig.weapon.visible = true;
    this.mode = 'playing';
    this.sequenceTime = 0;
    this._victorySound = false;
    this._victoryFracture = false;
    this.ui.hideTransit?.();
    this.ui.showGame();
    this.input.clearHeld();
    this.input.clearBuffers();
    this._configureEncounterMechanic({ silent: false });
    this._syncTransforms();
    document.getElementById('game')?.focus();
    document.getElementById('game')?.requestPointerLock?.().catch?.(() => {});
    this._event('campaign.transit.end', { encounter: this._encounter().id, encounterIndex: this.encounterIndex });
  }

  _resolveSeparation() {
    const p = this.player, b = this.boss;
    const dx = p.position.x - b.position.x;
    const dz = p.position.z - b.position.z;
    const distance = Math.hypot(dx,dz) || .001;
    const minimum = 1.45;
    if (distance < minimum) {
      const push = (minimum - distance) * .5;
      const nx = dx/distance, nz = dz/distance;
      p.position.x += nx*push; p.position.z += nz*push;
      b.position.x -= nx*push; b.position.z -= nz*push;
      this._clampBoss();
    }
  }

  _syncTransforms() {
    const p = this.player, b = this.boss;
    const encounter = this._encounter();
    this.playerRig.group.position.copy(p.position);
    this.playerRig.group.rotation.y = p.facing;
    this.bossRig.group.position.copy(b.position);
    this.bossRig.group.rotation.y = b.facing;
    const playerAnim = p.action;
    if (!(this.mode === 'victorySequence' && this.resultVisible())) {
      this.playerRig.update?.({ action: playerAnim, actionTime: p.actionTime, moveSpeed: Math.hypot(p.velocity.x,p.velocity.z), airborne: !p.grounded, airJumps: p.airJumps, verticalVelocity: p.vy, facing: p.facing, healthRatio: p.hp/p.maxHp, telegraph: 0, stunned: p.action === 'hit', dead: p.action === 'death', victory: this.mode === 'victorySequence' }, this.time, 1/60);
    }
    this.bossRig.update?.({
      action: b.action,
      move: b.actionId || '',
      actionTime: b.actionTime,
      moveSpeed: Math.hypot(b.velocity.x,b.velocity.z),
      airborne: (encounter.strategy === 'duel' && b.phase === 3)
        || (encounter.strategy === 'tether' && b.mechanicSealed)
        || (['dive','cast','bombard','gravity'].includes(b.action) && b.phase >= 2),
      facing: b.facing,
      healthRatio: b.hp/b.maxHp,
      telegraph: b.telegraphing ? 1-clamp01(b.actionTime/(BOSS_ATTACKS[b.actionId]?.telegraph || 1)) : 0,
      stunned: b.stunned,
      dead: b.dead,
      victory: false,
      phase: b.phase,
      encounter: encounter.id,
      mechanicSealed: b.mechanicSealed,
      mechanicOpen: b.mechanicOpen,
      mechanicBroken: b.mechanicBroken,
      mechanicTotal: b.mechanicTotal,
      exposureTime: b.exposureTime,
    }, this.time, 1/60);
  }

  _updateCamera(dt) {
    const p = this.player, b = this.boss;
    if (this.mode === 'travelSequence') {
      const desired = this.world.transitCameraPosition || this.camera.position;
      const target = this.world.transitCameraTarget || new THREE.Vector3(0, 1.5, 0);
      this.camera.position.lerp(desired, 1 - Math.exp(-6.5 * dt));
      this.camera.lookAt(target);
      this.camera.fov = damp(this.camera.fov, 62, 5, dt);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
      this.ui.positionTelegraph(50, 31, false);
      return;
    }
    const encounter = this._encounter();
    const airborneBoss = (encounter.strategy === 'duel' && b.phase === 3)
      || (encounter.strategy === 'tether' && b.mechanicSealed);
    const camInput = this.input.consumeCamera();
    if (!p.locked) {
      this.cameraYaw -= camInput.x * .00225;
      this.cameraPitch = clamp(this.cameraPitch - camInput.y * .0017, .16, .68);
    }
    this.cameraDistance = clamp(
      this.cameraDistance + camInput.wheel * .36,
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );
    const focusWeight = p.locked ? (airborneBoss ? .34 : .255) : 0;
    const focus = _v1.copy(p.position).lerp(b.position, focusWeight).add(_v2.set(0,1.5,0));
    let nearestInbound = null;
    let nearestInboundDistance = Infinity;
    for (const missile of this.missiles || []) {
      if (!missile.active || missile.reflected) continue;
      const distance = missile.position.distanceTo(p.position);
      if (distance < nearestInboundDistance) {
        nearestInbound = missile;
        nearestInboundDistance = distance;
      }
    }
    if (nearestInbound) {
      const missileFocus = THREE.MathUtils.lerp(.045, .12, clamp01((8 - nearestInboundDistance) / 6));
      focus.lerp(nearestInbound.position, missileFocus);
    }
    let desired;
    let phasePullback = 0;
    if (p.locked) {
      const away = _v2.copy(p.position).sub(b.position).setY(0);
      if (away.lengthSq() < .1) away.set(Math.sin(p.facing+Math.PI),0,Math.cos(p.facing+Math.PI));
      away.normalize();
      const combatDistance = horizontalDistance(p.position, b.position);
      const sideAmount = THREE.MathUtils.lerp(3.05, 1.38, clamp01((combatDistance - 3) / 11));
      const side = _v3.crossVectors(_up, away).multiplyScalar(sideAmount);
      phasePullback = airborneBoss
        ? clamp(
          (combatDistance - 6) * .12 + PHASE_THREE_CAMERA_COMPENSATION,
          1.0 + PHASE_THREE_CAMERA_COMPENSATION,
          3.0 + PHASE_THREE_CAMERA_COMPENSATION,
        )
        : 0;
      const height = airborneBoss ? 4.15 : 3.28;
      desired = p.position.clone().addScaledVector(away, this.cameraDistance + phasePullback).add(side).add(new THREE.Vector3(0,height,0));
      this.cameraYaw = Math.atan2(away.x, away.z);
    } else {
      desired = p.position.clone().add(new THREE.Vector3(Math.sin(this.cameraYaw)*Math.cos(this.cameraPitch), Math.sin(this.cameraPitch), Math.cos(this.cameraYaw)*Math.cos(this.cameraPitch)).multiplyScalar(this.cameraDistance));
      desired.y += 1.42;
    }
    this.cameraPhasePullback = phasePullback;
    const desiredRadius = Math.hypot(desired.x, desired.z);
    // Let the virtual camera pass beyond the low architectural lip so it can
    // remain behind Nera at the boundary. The nearest monumental gate is
    // hidden by world camera-occlusion and the raised lip opens around the
    // projected player/boss composition, preserving combat framing without cuts.
    const preferredCameraRadius = (this.world.arenaRadius || 18.25) + .98;
    const maxCameraRadius = (this.world.arenaRadius || 18.25) + 6.5;
    this.cameraCollisionCorrection = Math.max(0, desiredRadius - preferredCameraRadius);
    const edgeAssist = clamp01(this.cameraCollisionCorrection / 4.5);
    if (edgeAssist > 0) {
      desired.y += edgeAssist * (airborneBoss ? 1.15 : .85);
      if (p.locked) {
        focus.copy(p.position).lerp(b.position, THREE.MathUtils.lerp(focusWeight, .32, edgeAssist));
        focus.y += THREE.MathUtils.lerp(1.5, 1.44, edgeAssist);
      }
    }
    if (desiredRadius > maxCameraRadius) {
      const correctedScale = maxCameraRadius / desiredRadius;
      desired.x *= correctedScale;
      desired.z *= correctedScale;
    }
    desired.y = Math.max(2.48, desired.y);
    const smooth = 1 - Math.exp(-9.4*dt);
    this.camera.position.lerp(desired, smooth);
    const shake = this.cameraShakeTime > 0 ? this.cameraShake * (this.cameraShakeTime/.2) : 0;
    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime = Math.max(0,this.cameraShakeTime-dt);
      this.camera.position.x += Math.sin(this.time*131.7)*shake*.055;
      this.camera.position.y += Math.sin(this.time*157.3)*shake*.045;
      this.camera.position.z += Math.cos(this.time*119.1)*shake*.055;
    } else this.cameraShake *= .8;
    const look = focus.clone();
    if (this.cameraShakeTime > 0) { look.x += Math.sin(this.time*91)*shake*.025; look.y += Math.cos(this.time*103)*shake*.02; }
    this.camera.lookAt(look);
    if (b.actionId && b.telegraphing && this.bossRig.core) {
      this.bossRig.core.getWorldPosition(_v2);
      _v2.y += 1.15;
      this.camera.updateMatrixWorld();
      _v2.project(this.camera);
      this.ui.positionTelegraph((_v2.x * .5 + .5) * 100, (-_v2.y * .5 + .5) * 100, _v2.z >= -1 && _v2.z <= 1);
    } else {
      this.ui.positionTelegraph(50, 31, false);
    }
    const hostileMissiles = this.missiles?.some((missile) => missile.active && !missile.reflected) ? 1 : 0;
    const fovTarget = 56.5
      + edgeAssist * 4.2
      + (airborneBoss ? 4.2 : 0)
      + hostileMissiles * 1.5
      + (['dodge','chase','special'].includes(p.action) ? 3.4 : 0)
      + (b.actionId === 'totality' ? 1.8 : 0);
    this.camera.fov = damp(this.camera.fov, fovTarget, 8, dt);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.world.setCameraOcclusion?.(this.camera, p.position, b.position);
  }

  _updatePresentation(dt) {
    const { pBase, pTip, pOuter, pCore, bBase, bTip, bOuter, bCore } = this._trailSamples;
    this.playerRig.weapon?.getWorldPosition(pBase);
    this.playerRig.weaponTip?.getWorldPosition(pTip);
    this.bossRig.weapon?.getWorldPosition(bBase);
    this.bossRig.weaponTip?.getWorldPosition(bTip);
    const bossAttack = BOSS_ATTACKS[this.boss.actionId];
    const weaponDriven = ['slash', 'thrust', 'sweep', 'slam', 'dive'].includes(bossAttack?.anim);
    // The boss greatblade is intentionally enormous, but it must never become a
    // full-screen camera wipe. Extend the tested segment through its rear
    // counterweight, then hide only its idle rendered presentation while it
    // crosses the protected close-combat frame. Weapon-driven attacks always
    // override this guard so their pose, edge, trail, and contact language stay
    // truthful. Combat geometry, timing, telegraphs, and hit resolution never
    // change.
    bOuter.copy(bTip).sub(bBase);
    if (bOuter.lengthSq() > .000001) bOuter.normalize();
    bCore.copy(bBase).addScaledVector(bOuter, -BOSS_WEAPON_COUNTERWEIGHT_REACH);
    this.bossWeaponCameraDistance = Math.sqrt(pointSegmentDistanceSq(this.camera.position, bCore, bTip));
    pOuter.copy(this.player.position).add(_up).project(this.camera);
    pCore.copy(bCore).project(this.camera);
    bOuter.copy(bTip).project(this.camera);
    const weaponScreenDepthVisible = pCore.z < 1 && bOuter.z < 1 && (pCore.z > -1 || bOuter.z > -1);
    this.bossWeaponScreenSpan = Math.hypot(bOuter.x - pCore.x, bOuter.y - pCore.y);
    this.bossWeaponScreenDistance = Math.sqrt(Math.min(
      pointSegmentDistanceSq2D(pOuter.x, pOuter.y, pCore.x, pCore.y, bOuter.x, bOuter.y),
      pointSegmentDistanceSq2D(0, 0, pCore.x, pCore.y, bOuter.x, bOuter.y),
    ));
    const weaponScreenRisk = weaponScreenDepthVisible
      && this.bossWeaponCameraDistance < BOSS_WEAPON_SCREEN_GUARD_DISTANCE
      && this.bossWeaponScreenSpan > BOSS_WEAPON_SCREEN_MIN_SPAN
      && this.bossWeaponScreenDistance < BOSS_WEAPON_SCREEN_CLEARANCE;
    const weaponDistanceRisk = this.bossWeaponCameraDistance < (
      this.bossWeaponCameraOccluded
        ? BOSS_WEAPON_CAMERA_SHOW_DISTANCE
        : BOSS_WEAPON_CAMERA_HIDE_DISTANCE
    );
    this.bossWeaponCameraOccluded = this.encounterIndex === 0 && !weaponDriven && (weaponDistanceRisk || weaponScreenRisk);
    if (this.bossRig.weapon) this.bossRig.weapon.visible = !this.bossWeaponCameraOccluded;
    if (this.renderer.domElement?.dataset) {
      this.renderer.domElement.dataset.bossWeaponCameraDistance = this.bossWeaponCameraDistance.toFixed(3);
      this.renderer.domElement.dataset.bossWeaponCameraOccluded = String(this.bossWeaponCameraOccluded);
      this.renderer.domElement.dataset.bossWeaponAttackActive = String(weaponDriven);
      this.renderer.domElement.dataset.bossWeaponScreenDistance = this.bossWeaponScreenDistance.toFixed(3);
      this.renderer.domElement.dataset.bossWeaponScreenSpan = this.bossWeaponScreenSpan.toFixed(3);
    }
    pOuter.copy(pBase).lerp(pTip, .66);
    pCore.copy(pBase).lerp(pTip, .86);
    bOuter.copy(bBase).lerp(bTip, .68);
    bCore.copy(bBase).lerp(bTip, .86);
    const playerAttack = PLAYER_ACTIONS[this.player.action];
    const playerLead = this.player.action === 'special' ? .16
      : ['heavy', 'launcher', 'plunge'].includes(this.player.action) ? .13
      : ['light3', 'airLight3', 'chase'].includes(this.player.action) ? .1
      : .085;
    const playerLag = this.player.action === 'special' ? .22
      : ['heavy', 'launcher', 'plunge'].includes(this.player.action) ? .16
      : .11;
    const playerTrailActive = Boolean(playerAttack && this.player.action !== 'shot'
      && this.player.actionTime > Math.max(.025, playerAttack.hit - playerLead)
      && this.player.actionTime < playerAttack.hit + playerLag);
    const weaponEvents = weaponDriven
      ? bossAttack.events.filter((event) => ['arc', 'shadowArc', 'line', 'aimLine', 'aimAoe'].includes(event.kind))
      : [];
    const bossTrailActive = !this.bossWeaponCameraOccluded
      && weaponEvents.some((event) => this.boss.actionTime > event.t - .17 && this.boss.actionTime < event.t + .105);
    this.effects.sampleTrail(this.playerTrail, pOuter, pTip, playerTrailActive, this.player.action === 'special' ? 1.05 : .68, dt);
    this.effects.sampleTrail(this.playerTrailCore, pCore, pTip, playerTrailActive, this.player.action === 'special' ? 1.2 : .84, dt);
    this.effects.sampleTrail(this.bossTrail, bOuter, bTip, bossTrailActive, this.boss.phase === 3 ? .92 : .62, dt);
    this.effects.sampleTrail(this.bossTrailCore, bCore, bTip, bossTrailActive, this.boss.phase === 3 ? 1.05 : .78, dt);
  }

  recordFrame(ms) {
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 1800) this.frameTimes.shift();
    if (ms > 50) this.longFrames++;
  }

  perfSummary() {
    const sorted = [...this.frameTimes].sort((a,b)=>a-b);
    const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))] : 0;
    return {
      samples: sorted.length,
      p50: Number(percentile(.5).toFixed(2)),
      p95: Number(percentile(.95).toFixed(2)),
      p99: Number(percentile(.99).toFixed(2)),
      max: Number((sorted.at(-1)||0).toFixed(2)),
      over20: sorted.filter(v=>v>20).length,
      over33: sorted.filter(v=>v>33.34).length,
      longFrames: this.longFrames
    };
  }

  snapshot() {
    const p = this.player, b = this.boss;
    const info = this.renderer.info;
    const finiteVec = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
    const activeMissiles = (this.missiles || []).filter((missile) => missile.active).map((missile) => {
      const target = missile.reflected
        ? b.position.clone().add(new THREE.Vector3(0, 1.85, 0))
        : missile.state === 'commit'
          ? missile.targetPoint.clone()
          : p.position.clone().add(new THREE.Vector3(0, 1.08, 0));
      const distance = missile.position.distanceTo(target);
      const collisionRadius = missile.reflected ? 1.5 : .92;
      return {
        id: missile.serial,
        state: missile.state,
        sourceMove: missile.sourceMove,
        sourceEvent: missile.sourceEvent,
        position: missile.position.toArray().map((value) => Number(value.toFixed(3))),
        velocity: missile.velocity.toArray().map((value) => Number(value.toFixed(3))),
        reflected: missile.reflected,
        method: missile.method,
        distance: Number(distance.toFixed(3)),
        eta: Number((Math.max(0, distance - collisionRadius) / Math.max(.01, missile.speed)).toFixed(3)),
        speed: Number(missile.speed.toFixed(3)),
        onScreen: missile.onScreen,
        visibleTime: Number(missile.visibleTime.toFixed(3)),
        commitAge: Number(missile.commitAge.toFixed(3)),
        reflectable: !missile.reflected,
        life: Number(missile.life.toFixed(3)),
        finite: finiteVec(missile.position) && finiteVec(missile.velocity),
      };
    });
    const bounds = this._phaseBounds(b.phase);
    const encounter = this._encounter();
    const orbiting = (encounter.strategy === 'duel' && b.phase === 3)
      || (encounter.strategy === 'tether' && b.mechanicSealed);
    return {
      buildId: 'secondhand-saint-2.0.0', bootId: this.bootId, rendererInstanceId: this.rendererInstanceId,
      tick: this.tick, mode: this.mode, paused: this.paused, focused: document.hasFocus(),
      timeOrigin: performance.timeOrigin, fightTime: Number(this.fightTime.toFixed(3)), hitstop: Number(this.hitstop.toFixed(4)),
      campaign: {
        enabled: this.campaignEnabled,
        encounterIndex: this.encounterIndex,
        encounterCount: this.campaignEnabled ? ENCOUNTERS.length : 1,
        encounterId: encounter.id,
        area: encounter.area,
        bossName: encounter.bossName,
        strategy: encounter.strategy,
        encounterTime: Number(this.encounterTime.toFixed(3)),
        campaignTime: Number(this.campaignTime.toFixed(3)),
        clears: [...this.stats.encounterClears],
        travel: { ...this.travel, progress: this.mode === 'travelSequence' ? clamp01(this.sequenceTime / this.travel.duration) : 0 },
      },
      qa: { debugMutationCount: this.debugMutationCount },
      input: { ...this.input.snapshot(), lastAcceptedAction: p.lastAcceptedAction, lastAcceptedTick: p.lastAcceptedTick },
      player: {
        position: p.position.toArray().map(v=>Number(v.toFixed(3))), velocity: p.velocity.toArray().map(v=>Number(v.toFixed(3))), facing: Number(p.facing.toFixed(3)), grounded: p.grounded, airJumps: p.airJumps, verticalVelocity: Number(p.vy.toFixed(3)), flipProgress: Number(this.playerRig.group.userData.secondJumpFlipProgress || 0),
        hp: Number(p.hp.toFixed(1)), maxHp: p.maxHp, resolve: p.resolve, action: p.action, actionTime: Number(p.actionTime.toFixed(3)), invulnerable: Number(p.invulnerable.toFixed(3)),
        locked: p.locked, lockDistance: Number(horizontalDistance(p.position,b.position).toFixed(2)), meter: Number(p.meter.toFixed(1)), styleRank: p.styleName, combo: p.combo, seams: p.seams,
        damageTaken: p.damageTaken, parries: p.parries, perfectDodges: p.perfectDodges, actionsUsed: Array.from(p.actionsUsed), finite: finiteVec(p.position)&&finiteVec(p.velocity)
      },
      boss: {
        position: b.position.toArray().map(v=>Number(v.toFixed(3))), facing: Number(b.facing.toFixed(3)), hp: Number(b.hp.toFixed(1)), maxHp: b.maxHp, phase: b.phase,
        phaseHp: Number(Math.max(0, b.hp - bounds.floor).toFixed(1)), phaseMaxHp: bounds.max,
        action: b.action, attack: b.actionId, actionTime: Number(b.actionTime.toFixed(3)), telegraphing: b.telegraphing, punishable: b.punishable, invulnerable: b.invulnerable,
        poise: Number(b.poise.toFixed(1)), stunned: b.stunned, dead: b.dead, onScreen: this._bossFramed(), finite: finiteVec(b.position),
        orbiting: orbiting && !b.dead,
        orbitRadius: Number(Math.hypot(b.position.x, b.position.z).toFixed(3)),
        orbitHeight: Number(b.position.y.toFixed(3)),
        orbitStun: Number(b.orbitStun.toFixed(3)),
        unreachable: orbiting,
        reflectedMissileHits: b.reflectedMissileHits,
        mechanic: {
          strategy: encounter.strategy,
          sealed: b.mechanicSealed,
          open: b.mechanicOpen,
          broken: b.mechanicBroken,
          total: b.mechanicTotal,
          activeNode: b.activeNode,
          exposureTime: Number(b.exposureTime.toFixed(3)),
          brokenIndices: [...b.mechanicBrokenIndices],
        },
      },
      camera: {
        position: this.camera.position.toArray().map(v=>Number(v.toFixed(3))),
        fov: Number(this.camera.fov.toFixed(2)),
        targetDistance: Number(this.cameraDistance.toFixed(3)),
        phasePullback: Number(this.cameraPhasePullback.toFixed(3)),
        collisionCorrection: Number(this.cameraCollisionCorrection.toFixed(3)),
        bossWeaponDistance: Number(this.bossWeaponCameraDistance.toFixed(3)),
        bossWeaponOccluded: this.bossWeaponCameraOccluded,
        bossWeaponScreenDistance: Number(this.bossWeaponScreenDistance.toFixed(3)),
        bossWeaponScreenSpan: Number(this.bossWeaponScreenSpan.toFixed(3)),
        finite: finiteVec(this.camera.position),
      },
      world: {
        arenaRadius: this.world.arenaRadius || 18,
        playerRadius: this._currentPlayerRadius(),
        finalPlayerRadius: this.world.finalPlayerRadius || 12,
        finalBossOrbitRadius: this.world.finalBossOrbitRadius || 18.5,
        phaseTarget: this.world.phaseTarget || 1,
        phaseProgress: Number(this.world.phaseProgress || 0),
        ruptureBlend: Number(this.world.ruptureBlend || 0),
        cameraOccludedBoundarySegments: this.world.cameraOccludedBoundarySegments || 0,
        cameraNearOccludedBoundarySegments: this.world.cameraNearOccludedBoundarySegments || 0,
        cameraCompositionBoundarySegments: this.world.cameraCompositionBoundarySegments || 0,
        cameraScreenCompositionBoundarySegments: this.world.cameraScreenCompositionBoundarySegments || 0,
        cameraVisibleCompositionBoundarySegments: this.world.cameraVisibleCompositionBoundarySegments || 0,
        cameraVisibleScreenCompositionBoundarySegments: this.world.cameraVisibleScreenCompositionBoundarySegments || 0,
        cameraOccludedHourGates: this.world.cameraOccludedHourGates || 0,
        cameraSightlineHourGates: this.world.cameraSightlineHourGates || 0,
        cameraVisibleSightlineHourGates: this.world.cameraVisibleSightlineHourGates || 0,
        cameraCompositionFocusCount: this.world.cameraCompositionFocusCount || 0,
        playerOutOfBounds: Math.hypot(p.position.x,p.position.z) > this._currentPlayerRadius() + .1,
        bossOutOfBounds: Math.hypot(b.position.x,b.position.z) > (orbiting ? (this.world.finalBossOrbitRadius || 18.5) + 1.2 : (encounter.arenaRadius || 18) + .2),
        mechanicTargets: (this.world.mechanicTargets?.() || []).map((target) => ({
          index: target.index,
          position: target.position.toArray().map((value) => Number(value.toFixed(3))),
        })),
      },
      missiles: {
        capacity: this.missiles.length,
        active: activeMissiles.length,
        hostile: activeMissiles.filter((missile) => !missile.reflected).length,
        committed: activeMissiles.filter((missile) => missile.state === 'commit').length,
        reflected: activeMissiles.filter((missile) => missile.reflected).length,
        entries: activeMissiles,
      },
      gravityWells: this.gravityWells.map((well) => ({
        id: well.id,
        position: well.position.toArray().map((value) => Number(value.toFixed(3))),
        age: Number(well.age.toFixed(3)),
        duration: well.duration,
        radius: well.radius,
        collapsed: well.collapsed,
      })),
      runtime: {
        draws: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures,
        particles: this.effects.snapshot().particles, warnings: this.effects.snapshot().warnings, missiles: activeMissiles.length, audioVoices: this.audio.snapshot().voices, sceneChildren: this.scene.children.length
      },
      resets: { worldGeneration: this.worldGeneration, restartCount: this.restartCount, rematchCount: this.rematchCount },
      eventSequence: this.eventSeq, stats: { ...this.stats, phaseEntries: [...this.stats.phaseEntries] }
    };
  }

  debugReset(reason = 'qa') { this.debugMutationCount++; this.restart(reason); return this.snapshot(); }

  _configureDebugPhase(phase, { settleWorld = false } = {}) {
    const b = this.boss;
    const encounter = this._encounter();
    const bounds = phaseBounds(encounter, phase);
    b.phase = phase;
    b.hp = phase === 1 ? encounter.health.max : Math.max(bounds.floor + 1, bounds.ceiling - 20);
    b.invulnerable = false;
    b.action = 'bossIdle';
    b.actionId = null;
    b.actionTime = 0;
    b.previousActionTime = 0;
    b.cooldown = 999;
    b.telegraphing = false;
    b.punishable = false;
    b.stunned = false;
    b.orbitStun = 0;
    this.world.setPhase?.(phase);
    this.bossRig.setPhase?.(phase);
    this._configureEncounterMechanic({ silent: true });
    const orbiting = (encounter.strategy === 'duel' && phase === 3)
      || (encounter.strategy === 'tether' && b.mechanicSealed);
    if (orbiting) {
      const radius = this.world.finalBossOrbitRadius || 18.55;
      const height = this.world.finalBossFlightHeight || 5.2;
      b.orbitAngle = Math.PI;
      b.orbitDirection = 1;
      b.position.set(0, height, -radius);
      this.player.position.fromArray(encounter.playerStart);
      this.player.facing = Math.PI;
      b.facing = facingTo(b.position, this.player.position);
    } else {
      b.position.fromArray(encounter.bossStart);
      b.facing = 0;
    }
    if (settleWorld && this.world.update) {
      for (let index = 0; index < 80; index += 1) this.world.update(this.time + index * .05, .05, phase === 3 ? 1 : phase * .3);
    }
    this._syncTransforms();
    return b;
  }

  _configureDebugMissileScenario(name) {
    this._resetFight(`qa-${name}`, false);
    this._configureDebugPhase(3, { settleWorld: true });
    this._clearMissiles();
    const missile = this._launchMissile({
      side: name === 'missile-deflect' ? 1 : -1,
      speed: 6.5,
      maxSpeed: 6.5,
      acceleration: 0,
      turn: 3,
      damage: 14,
      reflectable: true,
    }, 0);
    if (missile) {
      missile.position.set(this.player.position.x, 1.08, this.player.position.z - 7.2);
      missile.previousPosition.copy(missile.position);
      missile.targetPoint.copy(this.player.position).add(_v1.set(0, 1.02, 0));
      missile.velocity.copy(missile.targetPoint).sub(missile.position).normalize().multiplyScalar(missile.speed);
      missile.root.position.copy(missile.position);
      missile.root.quaternion.setFromUnitVectors(_forward, _v2.copy(missile.velocity).normalize());
      missile.sourceMove = name;
      missile.sourceEvent = 0;
      missile.life = 4.2;
    }
    return this.snapshot();
  }

  debugScenario(name) {
    this.debugMutationCount++;
    if (name.startsWith('attack:')) {
      const attackId = name.slice('attack:'.length);
      const attack = BOSS_ATTACKS[attackId];
      if (!attack) throw new Error(`unknown boss attack scenario: ${attackId}`);
      const attackEncounter = ENCOUNTERS.findIndex((entry) => entry.id === (attack.encounter || 'vespera'));
      if (attackEncounter >= 0) this.encounterIndex = attackEncounter;
      this._resetFight(`qa-${attackId}`, false);
      this._configureDebugPhase(attack.phase, { settleWorld: attack.phase === 3 });
      this.boss.cooldown = 0;
      this._startBossAttack(attackId);
    }
    else if (name.startsWith('encounter:')) {
      const key = name.slice('encounter:'.length).toLowerCase();
      const numeric = Number(key);
      const index = Number.isFinite(numeric)
        ? clamp(Math.round(numeric), 0, ENCOUNTERS.length - 1)
        : Math.max(0, ENCOUNTERS.findIndex((entry) => entry.id === key));
      const oldEvents = this.events;
      this._loadEncounter(index, { preserveCampaign: false });
      this.events = oldEvents;
      this.mode = 'playing';
      this.ui.showGame();
      this._syncTransforms();
    }
    else if (name === 'phase2') { this._configureDebugPhase(2, { settleWorld: true }); }
    else if (name === 'phase3') { this._configureDebugPhase(3, { settleWorld: true }); }
    else if (name === 'victory') {
      if (this.campaignEnabled && this.encounterIndex !== ENCOUNTERS.length - 1) {
        const oldEvents = this.events;
        this._loadEncounter(ENCOUNTERS.length - 1, { preserveCampaign: false });
        this.events = oldEvents;
      }
      this._configureDebugPhase(3, { settleWorld: true });
      this.boss.hp = 1;
      this._damageBoss(5,0,.01,'qa',this.boss.position.clone());
    }
    else if (name === 'transit') {
      const oldEvents = this.events;
      this._loadEncounter(0, { preserveCampaign: false });
      this.events = oldEvents;
      this.mode = 'playing';
      this.ui.showGame();
      this._configureDebugPhase(3, { settleWorld: true });
      this.boss.hp = 1;
      this._damageBoss(5, 0, .01, 'qa', this.boss.position.clone());
      // Shipping play keeps the full 2.3 s collapse. This named QA scenario
      // begins at its advertised transit boundary so deterministic capture is
      // not coupled to a focus-sensitive cutscene prelude.
      if (this.campaignEnabled && this.mode === 'victorySequence') {
        this._beginTravelSequence();
        // Land the deterministic scenario inside the radial star-drive. The
        // ordinary campaign path never calls this block; its 5.6 s timing is
        // still advanced exclusively by the fixed-step game loop.
        for (let index = 0; index < 126; index += 1) this._updateTravelSequence(1 / 60);
      }
    }
    else if (name === 'portrait') {
      this._resetFight('qa-portrait', false);
      this._configureDebugPhase(1, { settleWorld: true });
      this.player.position.set(3, 0, 0);
      this.player.facing = 0;
      this.player.locked = false;
      this.boss.position.set(18, 0, 18);
      this.boss.facing = Math.PI;
      this.boss.cooldown = 999;
      this.bossRig.group.visible = false;
      this.cameraYaw = 0;
      this.cameraPitch = .22;
      this.cameraDistance = MIN_CAMERA_DISTANCE;
      this._syncTransforms();
    }
    else if (name === 'bossPortrait') {
      this._resetFight('qa-boss-portrait', false);
      this._configureDebugPhase(1, { settleWorld: true });
      this.player.position.set(3, 0, 0);
      this.player.facing = 0;
      this.player.locked = true;
      this.boss.position.set(3, 0, 5.2);
      this.boss.facing = Math.PI;
      this.boss.cooldown = 999;
      this.playerRig.group.visible = false;
      this.cameraDistance = 5.35;
      this._syncTransforms();
    }
    else if (name === 'death') { this.player.resolve = 0; this._damagePlayer(999,0,'qa'); }
    else if (name === 'totality') { this.encounterIndex = 0; this._resetFight('qa-totality', false); this._configureDebugPhase(3, { settleWorld: true }); this.boss.cooldown = 0; this._startBossAttack('totality'); }
    else if (name === 'missile-sword' || name === 'missile-deflect') return this._configureDebugMissileScenario(name);
    else if (name === 'parry') { this._startBossAttack(this.boss.phase === 3 ? 'twinMeridian' : 'measureCut'); }
    return this.snapshot();
  }
}
