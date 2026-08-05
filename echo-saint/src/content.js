/**
 * Authored campaign data for ECHO//SAINT.
 *
 * Coordinate values in paths/formation anchors are normalized to the 540x960
 * portrait playfield. Timings are seconds and motion/bullet speeds are pixels
 * per second. Pattern identifiers resolve through PATTERNS.
 */

function freezeEffects(effects) {
  return Object.freeze(effects.map((effect) => Object.freeze({ ...effect })));
}

const UNSAFE_PATH_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function pathKeys(path) {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("Content effect stat paths must be non-empty strings");
  }
  const keys = path.split(".");
  if (keys.some((key) => key.length === 0 || UNSAFE_PATH_KEYS.has(key))) {
    throw new Error(`Unsafe content effect stat path: ${path}`);
  }
  return keys;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function readPath(target, path) {
  return pathKeys(path).reduce((value, key) => value?.[key], target);
}

function writePath(target, path, value) {
  const keys = pathKeys(path);
  let owner = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!owner[key] || typeof owner[key] !== "object") owner[key] = {};
    owner = owner[key];
  }

  owner[keys[keys.length - 1]] = value;
}

/**
 * Apply portable `{ stat, op, value }` effects to a mutable run-stat object.
 * Supported operations: set, add, multiply, min, max, and toggle.
 */
export function applyEffects(stats, effects = []) {
  if (!stats || typeof stats !== "object") {
    throw new TypeError("applyEffects expects a mutable stats object");
  }

  for (const effect of effects) {
    const current = readPath(stats, effect.stat);
    let next;

    switch (effect.op) {
      case "set":
        next = effect.value;
        break;
      case "add":
        next = (Number.isFinite(current) ? current : 0) + effect.value;
        break;
      case "multiply":
        next = (Number.isFinite(current) ? current : 1) * effect.value;
        break;
      case "min":
        next = Math.min(Number.isFinite(current) ? current : effect.value, effect.value);
        break;
      case "max":
        next = Math.max(Number.isFinite(current) ? current : effect.value, effect.value);
        break;
      case "toggle":
        next = !current;
        break;
      default:
        throw new Error(`Unknown content effect operation: ${effect.op}`);
    }

    writePath(stats, effect.stat, next);
  }

  return stats;
}

function withEffects(definition) {
  const effects = freezeEffects(definition.effects ?? []);
  return Object.freeze({
    ...definition,
    effects,
    apply(stats) {
      return applyEffects(stats, effects);
    },
  });
}

export function createDefaultStats() {
  return {
    maxHull: 3,
    hull: 3,
    maxHp: 3,
    hp: 3,
    moveSpeed: 330,
    focusSpeed: 155,
    invulnerability: 1.1,
    damage: 11,
    fireRate: 1,
    shotSpeed: 760,
    projectiles: 0,
    spread: 1,
    pierce: 0,
    homing: 0,
    echoDamage: 1,
    echoSplit: 0,
    threadMax: 100,
    threadRegen: 1,
    threadEfficiency: 1,
    grazeRadius: 27,
    captureDamage: 1,
    lastWord: false,
    afterimage: false,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    weapon: {
      mode: "needle",
      interval: 0.09,
      damage: 12,
      speed: 940,
      count: 1,
      spread: 0,
      pierce: 1,
      homing: 0,
    },
    closure: {
      maxVertices: 6,
      traceSeconds: 1.65,
      cooldown: 4.8,
      minArea: 900,
      captureLimit: 32,
      echoDamage: 9,
      echoSpeed: 560,
      echoTurnRate: 8.5,
      echoLifetime: 3.2,
      echoPierce: 0,
      echoSplit: 0,
      barrier: 0,
      bossDamageMultiplier: 1,
      afterimage: false,
    },
    graze: {
      radius: 26,
      charge: 1,
      score: 1,
      chainWindow: 1.8,
    },
    scoreMultiplier: 1,
  };
}

export const DEFAULT_RUN_STATS = deepFreeze(createDefaultStats());

/**
 * Reusable pattern parameters. The engine is free to render fewer bullets in
 * low-power mode while preserving each pattern's topology.
 */
export const PATTERNS = deepFreeze({
  "aimed-single": Object.freeze({ type: "aimed", interval: 1.05, count: 1, speed: 245, radius: 5 }),
  "aimed-triplet": Object.freeze({ type: "fan", interval: 1.25, count: 3, arc: 0.34, speed: 250, radius: 5 }),
  "petal-burst": Object.freeze({ type: "radial", interval: 1.55, count: 10, speed: 190, spin: 0.12, radius: 5 }),
  "cross-stitch": Object.freeze({ type: "cross", interval: 1.35, count: 8, speed: 225, spin: 0.2, radius: 5 }),
  "glass-fan": Object.freeze({ type: "fan", interval: 1.1, count: 7, arc: 1.05, speed: [180, 270], radius: 4 }),
  "orbit-drop": Object.freeze({ type: "orbit", interval: 1.7, count: 6, orbitSeconds: 0.75, speed: 220, radius: 5 }),
  "witness-radio-rosary": Object.freeze({ type: "radial", interval: 0.72, count: 18, speed: [155, 215], spin: 0.105, radius: 5 }),
  "witness-dead-channel": Object.freeze({ type: "aimed-fan", interval: 0.55, count: 5, arc: 0.5, speed: 285, alternate: true, radius: 4 }),
  "witness-signal-cross": Object.freeze({ type: "cross", interval: 0.84, count: 16, speed: 235, spin: -0.16, radius: 5 }),
  "witness-last-testimony": Object.freeze({ type: "spiral", interval: 0.12, arms: 3, speed: 250, angularStep: 0.23, radius: 4 }),
  "mother-red-thread": Object.freeze({ type: "aimed-stream", interval: 0.16, burst: 9, rest: 0.8, speed: 270, curve: 0.32, radius: 4 }),
  "mother-knot-rose": Object.freeze({ type: "rose", interval: 0.95, petals: 7, beads: 4, speed: [150, 245], spin: 0.09, radius: 5 }),
  "mother-orchard-rain": Object.freeze({ type: "rain", interval: 0.34, columns: 9, speed: [210, 315], sway: 38, radius: 4 }),
  "mother-umbilical": Object.freeze({ type: "tether-fan", interval: 0.58, count: 9, arc: 1.55, speed: 235, curve: -0.45, radius: 5 }),
  "choir-ninefold": Object.freeze({ type: "radial", interval: 0.62, count: 27, speed: [145, 255], spin: 0.075, radius: 4 }),
  "choir-antiphon": Object.freeze({ type: "alternating-fans", interval: 0.42, count: 8, arc: 1.2, speed: 275, mirror: true, radius: 4 }),
  "choir-shatter-fugue": Object.freeze({ type: "delayed-split", interval: 0.8, count: 12, speed: 170, splitAfter: 1.05, splitCount: 3, radius: 5 }),
  "choir-perfect-note": Object.freeze({ type: "lattice", interval: 0.48, rows: 2, columns: 11, speed: 245, gapCycle: 9, radius: 4 }),
  "sun-eraser-rays": Object.freeze({ type: "rotating-walls", interval: 0.68, spokes: 6, beads: 7, speed: 195, spin: 0.11, radius: 5 }),
  "sun-white-page": Object.freeze({ type: "curtain", interval: 0.5, columns: 13, speed: 275, gapCycle: 7, reverseEvery: 4, radius: 4 }),
  "sun-event-horizon": Object.freeze({ type: "inward-ring", interval: 1.05, count: 30, speed: 205, orbit: 0.34, radius: 4 }),
  "sun-unwritten-name": Object.freeze({ type: "glyph-spiral", interval: 0.1, arms: 5, speed: [190, 290], angularStep: 0.17, radius: 4 }),
  "sun-last-amen": Object.freeze({ type: "closure-test", interval: 0.34, count: 14, speed: 310, safePolygonSides: 5, spin: -0.08, radius: 4 }),
});

export const ENEMIES = Object.freeze({
  candle: Object.freeze({ id: "candle", name: "VOTIVE", hp: 28, radius: 13, speed: 118, score: 700, contactDamage: 1, move: "drift", pattern: "aimed-single", fireInterval: 1.15 }),
  thurible: Object.freeze({ id: "thurible", name: "THURIBLE", hp: 54, radius: 17, speed: 92, score: 1250, contactDamage: 1, move: "swing", pattern: "petal-burst", fireInterval: 1.55 }),
  scriptor: Object.freeze({ id: "scriptor", name: "SCRIPTOR", hp: 78, radius: 19, speed: 78, score: 1900, contactDamage: 1, move: "hold-and-retreat", pattern: "cross-stitch", fireInterval: 1.35 }),
  knotling: Object.freeze({ id: "knotling", name: "KNOTLING", hp: 42, radius: 15, speed: 138, score: 1050, contactDamage: 1, move: "sine", pattern: "aimed-triplet", fireInterval: 1.12 }),
  harvester: Object.freeze({ id: "harvester", name: "HARVESTER", hp: 105, radius: 22, speed: 66, score: 2600, contactDamage: 1, move: "weave", pattern: "petal-burst", fireInterval: 1.28 }),
  shard: Object.freeze({ id: "shard", name: "CHOIR SHARD", hp: 35, radius: 14, speed: 152, score: 1150, contactDamage: 1, move: "ricochet", pattern: "glass-fan", fireInterval: 1.08 }),
  cantor: Object.freeze({ id: "cantor", name: "CANTOR", hp: 132, radius: 23, speed: 58, score: 3200, contactDamage: 1, move: "anchor", pattern: "orbit-drop", fireInterval: 1.5 }),
  eraser: Object.freeze({ id: "eraser", name: "ERASER", hp: 92, radius: 20, speed: 112, score: 2400, contactDamage: 1, move: "intercept", pattern: "cross-stitch", fireInterval: 0.96 }),
  apostle: Object.freeze({ id: "apostle", name: "FALSE APOSTLE", hp: 185, radius: 26, speed: 74, score: 4400, contactDamage: 1, move: "flank", pattern: "orbit-drop", fireInterval: 1.12 }),
});

export const ENEMY_LIST = Object.freeze(Object.values(ENEMIES));

export const STAGES = Object.freeze([
  Object.freeze({
    id: "static-nave",
    movement: 1,
    name: "STATIC NAVE",
    kicker: "MOVEMENT I",
    subtitle: "THE DEAD ARE STILL BROADCASTING",
    duration: 56,
    bossAt: 49,
    palette: Object.freeze({ background: "#05030b", mid: "#25113a", accent: "#b365ff", danger: "#ff3fa4", echo: "#55f6e8" }),
    enemyWeights: Object.freeze({ candle: 5, thurible: 3, scriptor: 1 }),
    waves: Object.freeze([
      Object.freeze({ at: 2, enemy: "candle", count: 7, interval: 0.52, formation: "descending-vee", pattern: "aimed-single" }),
      Object.freeze({ at: 10, enemy: "thurible", count: 4, interval: 1.15, formation: "alternating-sides", pattern: "petal-burst" }),
      Object.freeze({ at: 18, enemy: "candle", count: 10, interval: 0.36, formation: "double-procession", pattern: "aimed-single" }),
      Object.freeze({ at: 27, enemy: "scriptor", count: 3, interval: 1.8, formation: "altar-line", pattern: "cross-stitch" }),
      Object.freeze({ at: 36, enemy: "thurible", count: 6, interval: 0.8, formation: "pendulum", pattern: "aimed-triplet" }),
      Object.freeze({ at: 43, enemy: "candle", count: 12, interval: 0.25, formation: "closing-aisle", pattern: "aimed-single" }),
    ]),
    boss: Object.freeze({
      id: "first-witness",
      name: "THE FIRST WITNESS",
      maxHp: 1650,
      radius: 54,
      score: 125000,
      phases: Object.freeze([
        Object.freeze({ name: "VERSE I - RECEIVE", threshold: 1, patterns: Object.freeze(["witness-radio-rosary", "witness-dead-channel"]) }),
        Object.freeze({ name: "VERSE II - REPEAT", threshold: 0.66, patterns: Object.freeze(["witness-signal-cross", "witness-dead-channel"]) }),
        Object.freeze({ name: "VERSE III - TESTIFY", threshold: 0.32, patterns: Object.freeze(["witness-last-testimony", "witness-radio-rosary"]) }),
      ]),
    }),
  }),
  Object.freeze({
    id: "red-orchard",
    movement: 2,
    name: "RED ORCHARD",
    kicker: "MOVEMENT II",
    subtitle: "EVERY FRUIT REMEMBERS THE NOOSE",
    duration: 63,
    bossAt: 55,
    palette: Object.freeze({ background: "#090207", mid: "#3b0d21", accent: "#ff486f", danger: "#ff9b45", echo: "#6fffe4" }),
    enemyWeights: Object.freeze({ knotling: 5, harvester: 2, thurible: 2 }),
    waves: Object.freeze([
      Object.freeze({ at: 2, enemy: "knotling", count: 9, interval: 0.42, formation: "sine-braid", pattern: "aimed-triplet" }),
      Object.freeze({ at: 10, enemy: "harvester", count: 3, interval: 1.65, formation: "orchard-row", pattern: "petal-burst" }),
      Object.freeze({ at: 18, enemy: "knotling", count: 12, interval: 0.3, formation: "crossing-vines", pattern: "aimed-single" }),
      Object.freeze({ at: 27, enemy: "thurible", count: 6, interval: 0.74, formation: "falling-fruit", pattern: "cross-stitch" }),
      Object.freeze({ at: 36, enemy: "harvester", count: 4, interval: 1.22, formation: "root-cage", pattern: "petal-burst" }),
      Object.freeze({ at: 45, enemy: "knotling", count: 15, interval: 0.23, formation: "red-thread", pattern: "aimed-triplet" }),
    ]),
    boss: Object.freeze({
      id: "mother-of-knots",
      name: "MOTHER OF KNOTS",
      maxHp: 2750,
      radius: 62,
      score: 220000,
      phases: Object.freeze([
        Object.freeze({ name: "GRAFT I - SEED", threshold: 1, patterns: Object.freeze(["mother-red-thread", "mother-orchard-rain"]) }),
        Object.freeze({ name: "GRAFT II - BIND", threshold: 0.7, patterns: Object.freeze(["mother-knot-rose", "mother-red-thread"]) }),
        Object.freeze({ name: "GRAFT III - RIPEN", threshold: 0.38, patterns: Object.freeze(["mother-umbilical", "mother-knot-rose", "mother-orchard-rain"]) }),
      ]),
    }),
  }),
  Object.freeze({
    id: "glass-choir",
    movement: 3,
    name: "GLASS CHOIR",
    kicker: "MOVEMENT III",
    subtitle: "NINE VOICES. NO THROATS.",
    duration: 70,
    bossAt: 61,
    palette: Object.freeze({ background: "#02080d", mid: "#112d42", accent: "#70d7ff", danger: "#f777ff", echo: "#fff28a" }),
    enemyWeights: Object.freeze({ shard: 5, cantor: 2, scriptor: 2 }),
    waves: Object.freeze([
      Object.freeze({ at: 2, enemy: "shard", count: 10, interval: 0.38, formation: "prism-fall", pattern: "glass-fan" }),
      Object.freeze({ at: 11, enemy: "cantor", count: 3, interval: 1.8, formation: "triad", pattern: "orbit-drop" }),
      Object.freeze({ at: 20, enemy: "shard", count: 14, interval: 0.27, formation: "ricochet-canon", pattern: "aimed-triplet" }),
      Object.freeze({ at: 30, enemy: "scriptor", count: 5, interval: 1.05, formation: "staff-lines", pattern: "cross-stitch" }),
      Object.freeze({ at: 40, enemy: "cantor", count: 4, interval: 1.36, formation: "broken-chord", pattern: "orbit-drop" }),
      Object.freeze({ at: 50, enemy: "shard", count: 18, interval: 0.21, formation: "ninefold-wheel", pattern: "glass-fan" }),
    ]),
    boss: Object.freeze({
      id: "ninefold-choir",
      name: "THE NINEFOLD CHOIR",
      maxHp: 4300,
      radius: 68,
      score: 360000,
      phases: Object.freeze([
        Object.freeze({ name: "HYMN I - UNISON", threshold: 1, patterns: Object.freeze(["choir-ninefold", "choir-antiphon"]) }),
        Object.freeze({ name: "HYMN II - FUGUE", threshold: 0.72, patterns: Object.freeze(["choir-shatter-fugue", "choir-antiphon"]) }),
        Object.freeze({ name: "HYMN III - DISSONANCE", threshold: 0.44, patterns: Object.freeze(["choir-perfect-note", "choir-ninefold"]) }),
        Object.freeze({ name: "HYMN IX - SILENCE", threshold: 0.2, patterns: Object.freeze(["choir-perfect-note", "choir-shatter-fugue", "choir-ninefold"]) }),
      ]),
    }),
  }),
  Object.freeze({
    id: "unwritten-sun",
    movement: 4,
    name: "UNWRITTEN SUN",
    kicker: "FINAL MOVEMENT",
    subtitle: "CLOSE THE SHAPE THAT CLOSES THE WORLD",
    duration: 82,
    bossAt: 70,
    palette: Object.freeze({ background: "#080705", mid: "#473918", accent: "#ffd978", danger: "#ff4c70", echo: "#f7ffff" }),
    enemyWeights: Object.freeze({ eraser: 4, apostle: 2, shard: 2, knotling: 2 }),
    waves: Object.freeze([
      Object.freeze({ at: 2, enemy: "eraser", count: 9, interval: 0.44, formation: "margin-cut", pattern: "cross-stitch" }),
      Object.freeze({ at: 11, enemy: "apostle", count: 3, interval: 1.75, formation: "false-trinity", pattern: "orbit-drop" }),
      Object.freeze({ at: 21, enemy: "shard", count: 12, interval: 0.28, formation: "white-prism", pattern: "glass-fan" }),
      Object.freeze({ at: 31, enemy: "eraser", count: 12, interval: 0.31, formation: "deletion-wave", pattern: "aimed-triplet" }),
      Object.freeze({ at: 42, enemy: "apostle", count: 5, interval: 1.18, formation: "burning-script", pattern: "petal-burst" }),
      Object.freeze({ at: 53, enemy: "knotling", count: 18, interval: 0.2, formation: "history-braid", pattern: "aimed-single" }),
      Object.freeze({ at: 61, enemy: "eraser", count: 14, interval: 0.24, formation: "closing-page", pattern: "cross-stitch" }),
    ]),
    boss: Object.freeze({
      id: "saint-zero",
      name: "SAINT ZERO, THE UNWRITTEN SUN",
      maxHp: 7200,
      radius: 76,
      score: 1000000,
      phases: Object.freeze([
        Object.freeze({ name: "APOCRYPHA I - ERASE", threshold: 1, patterns: Object.freeze(["sun-eraser-rays", "sun-white-page"]) }),
        Object.freeze({ name: "APOCRYPHA II - DEVOUR", threshold: 0.78, patterns: Object.freeze(["sun-event-horizon", "sun-eraser-rays"]) }),
        Object.freeze({ name: "APOCRYPHA III - UNNAME", threshold: 0.53, patterns: Object.freeze(["sun-unwritten-name", "sun-white-page"]) }),
        Object.freeze({ name: "APOCRYPHA IV - CLOSE", threshold: 0.27, patterns: Object.freeze(["sun-last-amen", "sun-event-horizon", "sun-unwritten-name"]) }),
      ]),
    }),
  }),
]);

export const RELICS = Object.freeze([
  withEffects({
    id: "red-thread",
    name: "RED THREAD",
    description: "Thread regenerates 28% faster. The line remembers where your hands failed.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 3,
    effects: [{ stat: "threadRegen", op: "multiply", value: 1.28 }],
  }),
  withEffects({
    id: "mercy-is-an-area",
    name: "MERCY IS AN AREA",
    description: "Thread is 20% more efficient while tracing. Mercy is violence with better borders.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 2,
    effects: [{ stat: "threadEfficiency", op: "multiply", value: 1.2 }],
  }),
  withEffects({
    id: "second-edge",
    name: "SECOND EDGE",
    description: "Gain 18 maximum Thread. Draw a longer sentence before the ammunition answers.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 2,
    effects: [{ stat: "threadMax", op: "add", value: 18 }],
  }),
  withEffects({
    id: "gospel-of-teeth",
    name: "GOSPEL OF TEETH",
    description: "Echoes deal 35% more damage and your Vow pierces one additional target.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 3,
    effects: [
      { stat: "echoDamage", op: "multiply", value: 1.35 },
      { stat: "pierce", op: "add", value: 1 },
    ],
  }),
  withEffects({
    id: "borrowed-halo",
    name: "BORROWED HALO",
    description: "Your Vow gains stronger homing and Echoes deal 12% more damage.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 3,
    effects: [
      { stat: "homing", op: "add", value: 0.045 },
      { stat: "echoDamage", op: "multiply", value: 1.12 },
    ],
  }),
  withEffects({
    id: "glass-tongue",
    name: "GLASS TONGUE",
    description: "Graze reach grows 16% and Thread regenerates 20% faster. Speak dangerously close.",
    rank: "COMMON",
    tier: 1,
    maxStacks: 3,
    effects: [
      { stat: "grazeRadius", op: "multiply", value: 1.16 },
      { stat: "threadRegen", op: "multiply", value: 1.2 },
    ],
  }),
  withEffects({
    id: "choir-in-reverse",
    name: "CHOIR IN REVERSE",
    description: "Echoes gain a 45% chance to split, but each deals 18% less damage.",
    rank: "RARE",
    tier: 2,
    maxStacks: 2,
    effects: [
      { stat: "echoSplit", op: "add", value: 0.45 },
      { stat: "echoDamage", op: "multiply", value: 0.82 },
    ],
  }),
  withEffects({
    id: "empty-palm",
    name: "EMPTY PALM",
    description: "Taking a hit mid-trace seals the unfinished Closure before the blow lands.",
    rank: "RARE",
    tier: 2,
    maxStacks: 1,
    effects: [{ stat: "lastWord", op: "set", value: true }],
  }),
  withEffects({
    id: "ninth-scar",
    name: "NINTH SCAR",
    description: "Gain one maximum Hull and heal it now. Pain is just storage with bad branding.",
    rank: "RARE",
    tier: 2,
    maxStacks: 2,
    effects: [
      { stat: "maxHp", op: "add", value: 1 },
      { stat: "onAcquireHeal", op: "add", value: 1 },
    ],
  }),
  withEffects({
    id: "black-votive",
    name: "BLACK VOTIVE",
    description: "Lose one maximum Hull. All weapon damage rises by 55%. A candle with teeth.",
    rank: "RARE",
    tier: 2,
    maxStacks: 1,
    effects: [
      { stat: "maxHp", op: "add", value: -1 },
      { stat: "damage", op: "multiply", value: 1.55 },
    ],
  }),
  withEffects({
    id: "saints-afterimage",
    name: "SAINT'S AFTERIMAGE",
    description: "A Closure of six or more bullets repeats once as a delayed phantom cut.",
    rank: "RARE",
    tier: 2,
    maxStacks: 1,
    effects: [
      { stat: "afterimage", op: "set", value: true },
    ],
  }),
  withEffects({
    id: "perfect-crime",
    name: "PERFECT CLOSURE",
    description: "Echoes deal 60% more damage and enclosed targets take 50% more. Geometry confesses nothing.",
    rank: "EXALTED",
    tier: 3,
    maxStacks: 1,
    effects: [
      { stat: "echoDamage", op: "multiply", value: 1.6 },
      { stat: "captureDamage", op: "multiply", value: 1.5 },
    ],
  }),
]);

export const VOWS = Object.freeze([
  withEffects({
    id: "needle",
    name: "NEEDLE",
    tagline: "FOCUSED / PIERCING",
    description: "Suture the screen with a merciless line. Focus fire punches through armor.",
    color: "#55f6e8",
    fire: Object.freeze({ interval: 0.09, damage: 12, speed: 940, count: 1, spread: 0, pierce: 1, homing: 0 }),
    focus: Object.freeze({ interval: 0.075, damage: 15, speed: 1040, count: 1, spread: 0, pierce: 2, homing: 0 }),
    effects: [
      { stat: "weapon.mode", op: "set", value: "needle" },
      { stat: "weapon.interval", op: "set", value: 0.09 },
      { stat: "weapon.damage", op: "set", value: 12 },
      { stat: "weapon.speed", op: "set", value: 940 },
      { stat: "weapon.count", op: "set", value: 1 },
      { stat: "weapon.spread", op: "set", value: 0 },
      { stat: "weapon.pierce", op: "set", value: 1 },
      { stat: "weapon.homing", op: "set", value: 0 },
    ],
  }),
  withEffects({
    id: "bloom",
    name: "BLOOM",
    tagline: "WIDE / RELENTLESS",
    description: "A five-petal murder flower. Focus folds the blossom into a brutal trident.",
    color: "#ff3fa4",
    fire: Object.freeze({ interval: 0.13, damage: 7, speed: 790, count: 5, spread: 0.24, pierce: 0, homing: 0 }),
    focus: Object.freeze({ interval: 0.105, damage: 9, speed: 860, count: 3, spread: 0.07, pierce: 0, homing: 0 }),
    effects: [
      { stat: "weapon.mode", op: "set", value: "bloom" },
      { stat: "weapon.interval", op: "set", value: 0.13 },
      { stat: "weapon.damage", op: "set", value: 7 },
      { stat: "weapon.speed", op: "set", value: 790 },
      { stat: "weapon.count", op: "set", value: 5 },
      { stat: "weapon.spread", op: "set", value: 0.24 },
      { stat: "weapon.pierce", op: "set", value: 0 },
      { stat: "weapon.homing", op: "set", value: 0 },
    ],
  }),
  withEffects({
    id: "halo",
    name: "HALO",
    tagline: "HOMING / PATIENT",
    description: "Slow golden verdicts curve toward unfinished enemies. Focus sharpens their faith.",
    color: "#ffd978",
    fire: Object.freeze({ interval: 0.18, damage: 11, speed: 650, count: 2, spread: 0.11, pierce: 0, homing: 5.5 }),
    focus: Object.freeze({ interval: 0.15, damage: 14, speed: 710, count: 2, spread: 0.04, pierce: 0, homing: 8.5 }),
    effects: [
      { stat: "weapon.mode", op: "set", value: "halo" },
      { stat: "weapon.interval", op: "set", value: 0.18 },
      { stat: "weapon.damage", op: "set", value: 11 },
      { stat: "weapon.speed", op: "set", value: 650 },
      { stat: "weapon.count", op: "set", value: 2 },
      { stat: "weapon.spread", op: "set", value: 0.11 },
      { stat: "weapon.pierce", op: "set", value: 0 },
      { stat: "weapon.homing", op: "set", value: 5.5 },
    ],
  }),
]);

export const DIFFICULTIES = Object.freeze([
  Object.freeze({
    id: "pilgrim",
    name: "PILGRIM",
    description: "A merciful first pilgrimage: slower fire, stronger Closure, four Hull.",
    startingHull: 4,
    maxHull: 4,
    integrity: 4,
    playerHp: 4,
    modifiers: Object.freeze({ enemyHp: 0.86, bossHp: 0.9, bulletSpeed: 0.8, enemyFireRate: 0.82, spawnRate: 0.88, score: 0.82, grazeRadius: 1.2, closureCooldown: 0.85, closureCapture: 1.25 }),
    enemyHp: 0.86,
    bossHp: 0.9,
    bulletSpeed: 0.8,
    fireRate: 0.82,
    enemyFireRate: 0.82,
    spawnRate: 0.88,
    score: 0.82,
  }),
  Object.freeze({
    id: "apostate",
    name: "APOSTATE",
    description: "The intended heresy. Three Hull, full patterns, no celestial hand-holding.",
    startingHull: 3,
    maxHull: 3,
    integrity: 3,
    playerHp: 3,
    modifiers: Object.freeze({ enemyHp: 1, bossHp: 1, bulletSpeed: 1, enemyFireRate: 1, spawnRate: 1, score: 1, grazeRadius: 1, closureCooldown: 1, closureCapture: 1 }),
    enemyHp: 1,
    bossHp: 1,
    bulletSpeed: 1,
    fireRate: 1,
    enemyFireRate: 1,
    spawnRate: 1,
    score: 1,
  }),
  Object.freeze({
    id: "martyr",
    name: "MARTYR",
    description: "Two Hull. Faster scripture. Richer blood. Built for beautiful bad decisions.",
    startingHull: 2,
    maxHull: 2,
    integrity: 2,
    playerHp: 2,
    modifiers: Object.freeze({ enemyHp: 1.16, bossHp: 1.22, bulletSpeed: 1.2, enemyFireRate: 1.25, spawnRate: 1.16, score: 1.55, grazeRadius: 0.9, closureCooldown: 1.08, closureCapture: 0.9 }),
    enemyHp: 1.16,
    bossHp: 1.22,
    bulletSpeed: 1.2,
    fireRate: 1.25,
    enemyFireRate: 1.25,
    spawnRate: 1.16,
    score: 1.55,
  }),
]);

function indexById(list) {
  return Object.freeze(Object.fromEntries(list.map((entry) => [entry.id, entry])));
}

export const STAGE_BY_ID = indexById(STAGES);
export const RELIC_BY_ID = indexById(RELICS);
export const VOW_BY_ID = indexById(VOWS);
export const DIFFICULTY_BY_ID = indexById(DIFFICULTIES);

export function getStage(id) {
  return STAGE_BY_ID[id];
}

export function getRelic(id) {
  return RELIC_BY_ID[id];
}

export function getVow(id) {
  return VOW_BY_ID[id];
}

export function getDifficulty(id) {
  return DIFFICULTY_BY_ID[id];
}

export default Object.freeze({
  STAGES,
  PATTERNS,
  ENEMIES,
  RELICS,
  VOWS,
  DIFFICULTIES,
});
