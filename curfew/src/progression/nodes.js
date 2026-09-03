// CURFEW — the tree. 24 nodes, 6 branches x 4 tiers, and the XP economy's tables.
// Owner: progression. Pure data + pure functions. No THREE, no ctx, no side effects, so
// tests/progression.mjs and anybody else can import it without booting a renderer.
//
// THE ONE LAW OF THIS FILE: EVERY NODE CHANGES A VERB, NOT A NUMBER.
// "+8% damage" is a node the player can never feel and can never describe to somebody else.
// Every row below either adds a thing you can DO (drop-roll, hold breath, a horn, a focus
// click) or changes the shape of a verb you already have (a reload you can sprint out of and
// come back to; a slide-cancel that keeps its speed). The few plain numbers that survive —
// tac-sprint seconds, mantle reach, the regen ceiling — are all the SIZE of a verb, which is
// the only kind of number worth a card.
//
// THE SECOND LAW, ADDED AFTER THE SECOND AUDIT: THE HOOK REGISTRY IS THE CONTRACT.
// The first shape of this file wrote forty-odd keys into a `stats` bag and trusted five other
// lanes to remember to read them. A grep of all of src/ then found ZERO readers of ANY key:
// 22 of the 24 nodes did nothing at all, and the two that worked (blood_3, blood_4) worked
// because they registered a HOOK. A key nobody reads fails silently forever; a hook nobody
// runs is countable, and `progress.hookReport()` counts it.
//
// So every node now INSTALLS ITS OWN EFFECT into the registry. The node carries the code. No
// sibling switches on a node id, and no sibling has to remember a key name — it calls ONE
// named hook point at ONE named line, and every node that cares is already listening.
// `HOOK_POINTS` below names every point, who RUNS it, and the exact call site.
//
// FIVE VALUES SURVIVE AS STATS, and only because another lane samples them inside its own
// physics every step, where a function call per frame would be the wrong shape: dropRoll,
// tacSprintTime, slideCancelKeep, mantleReach, regenCeiling. Each has a row in
// `STAT_CONTRACT` naming the exact file, the exact CFG number it replaces, and the fallback.
// `baseStats()` holds those and nothing else, so "a key with no consumer" is now an assertion
// a gate can make rather than a thing an audit has to discover.
//
// donor: palehollow/src/progress.js:10-40 — the {id, branch, tier, cost, apply(s)} row shape
//   and :66-74 recompute(), where stats are rebuilt FROM SCRATCH on every purchase rather
//   than mutated in place. That is what makes a refund, a load and a respec all the same
//   code path, and it is why nothing here does `s.x += 1` against a live object.
// donor: qualiacology/rocket-shoes/src/systems/items.js:7-31 — the hook registry.
//   "Item effect hook table. Systems call hooks; no system switches on item ids." A node is
//   an INSTALLER: it registers behaviour. Nothing anywhere in CURFEW is allowed to branch on
//   a node id, so the tree can grow without touching another lane.
// donor: qualiacology/rocket-shoes/src/systems/draft.js:22-34 — weighted 3-card dealing,
//   ported to progress.js (this file only supplies the pool and the weights).

/* ------------------------------------------------------------------ branches -- */

/**
 * `verb` is the bus/state event whose FIRST occurrence auto-grants the branch's tier-0 node,
 * free, without spending a point. DESIGN section 6: "Each branch's first node is auto-granted
 * on first use of its verb, so the tree teaches itself." progress.js owns the detection; this
 * column is the contract between the two.
 */
export const BRANCHES = Object.freeze([
  { id: 'legs',  name: 'Legs',  verb: 'run',    tint: 0x9fb4d8 },
  { id: 'hands', name: 'Hands', verb: 'reload', tint: 0xd8c07a },
  { id: 'lamp',  name: 'Lamp',  verb: 'torch',  tint: 0xf0dca8 },
  { id: 'quiet', name: 'Quiet', verb: 'crouch', tint: 0x8ec4c8 },
  { id: 'wheel', name: 'Wheel', verb: 'drive',  tint: 0xc47a3a },
  { id: 'blood', name: 'Blood', verb: 'hurt',   tint: 0xc45a5a },
]);

export const BRANCH_IDS = Object.freeze(BRANCHES.map((b) => b.id));

/* -------------------------------------------------------------- hook points -- */

/**
 * THE WHOLE VOCABULARY. A node may not install onto a name that is not in this table, and
 * progress.js console.errors on one that is not — a typo used to be a node that silently did
 * nothing, which is the failure this round exists to end.
 *
 *   kind    'run'    fire and forget.   progress.fire(name, a, b)      -> fn(ctx, a, b)
 *           'reduce' a value in and out. progress.perk(name, value, a) -> fn(value, ctx, a)
 *   runner  which lane calls it. 'progress' means this system already does, today.
 *   at      the EXACT file and function of the single call site. One site per point.
 *   base    what the runner passes as the starting value of a 'reduce'.
 *
 * Every 'reduce' is written so that with NO nodes owned it returns `base` untouched: the whole
 * tree is a no-op on a fresh save and no lane special-cases an empty tree.
 */
export const HOOK_POINTS = Object.freeze([
  /* ---- run by progress.js itself, today, with no cooperation from anybody ------ */
  { name: 'onStep', kind: 'run', runner: 'progress', sig: '(ctx, dt)',
    at: 'progression/progress.js step()' },
  { name: 'onKill', kind: 'run', runner: 'progress', sig: '(ctx, payload)',
    at: 'progression/progress.js _onKill() from enemy:killed' },
  { name: 'onPhase', kind: 'run', runner: 'progress', sig: '(ctx, phase)',
    at: 'progression/progress.js _wire() from phase:changed' },
  { name: 'onHurt', kind: 'run', runner: 'progress', sig: '(ctx, payload)',
    at: 'progression/progress.js _wire() from player:hurt' },
  { name: 'onLand', kind: 'run', runner: 'progress', sig: '(ctx, payload)',
    at: 'progression/progress.js _wire() from player:land' },
  { name: 'onNoise', kind: 'run', runner: 'progress', sig: '(ctx, payload)',
    at: 'progression/progress.js _wire() from noise' },
  { name: 'onPlaceNear', kind: 'run', runner: 'progress', sig: '(ctx, payload)',
    at: 'progression/progress.js _wire() from place:near' },

  /* ---- run by another lane. ONE line each, named. Requests are in docs/HANDOFF.md ---- */
  { name: 'reloadWindow', kind: 'reduce', runner: 'weapons', base: 'null',
    at: 'weapons/weapon.js _startReload()',
    sig: '(spec|null, ctx, weapon) -> {from,to,mul,jamS}|null' },
  { name: 'reloadResume', kind: 'reduce', runner: 'weapons', base: 'false',
    at: 'weapons/weapon.js _cancelReload()', sig: '(bool, ctx, weapon) -> bool' },
  { name: 'holdBreath', kind: 'reduce', runner: 'weapons', base: 'null',
    at: 'weapons/weapon.js _stanceMods()', sig: '(spec|null, ctx, weapon) -> {swayMul,seconds}|null' },
  { name: 'penCm', kind: 'reduce', runner: 'weapons', base: 'CFG.weapons.pen[material]',
    at: 'combat/combat.js the penetration test', sig: '(cm, ctx, material) -> cm' },
  { name: 'penExits', kind: 'reduce', runner: 'weapons', base: '0',
    at: 'combat/combat.js the exit-count loop', sig: '(n, ctx) -> n' },
  { name: 'torchFocus', kind: 'reduce', runner: 'lights', base: 'null',
    at: 'gfx/lights.js the torch update', sig: '(spec|null, ctx) -> {angle,stunS,costS}|null' },
  { name: 'highBeam', kind: 'reduce', runner: 'lights', base: 'null',
    at: 'gfx/lights.js the torch update', sig: '(spec|null, ctx) -> {seconds}|null' },
  { name: 'eyeshineMul', kind: 'reduce', runner: 'enemies', base: '1',
    at: 'enemies/enemies.js the eye-glint range test', sig: '(mul, ctx) -> mul' },
  { name: 'resolveWatchers', kind: 'reduce', runner: 'dread', base: 'false',
    at: 'director/dread.js the watcher reveal', sig: '(bool, ctx) -> bool' },
  { name: 'noiseRadius', kind: 'reduce', runner: 'player',
    base: 'the radius about to be emitted',
    at: 'player/controller.js the footstep noise emit; weapons/weapon.js _fire()',
    sig: '(radius, ctx, source) -> radius' },
  { name: 'hotwireS', kind: 'reduce', runner: 'car', base: 'CFG.car.hotwire',
    at: 'vehicle/car.js the hotwire timer', sig: '(seconds, ctx) -> seconds' },
  { name: 'ramMinSpeed', kind: 'reduce', runner: 'car', base: 'Infinity',
    at: 'vehicle/car.js _ram()', sig: '(mps, ctx) -> mps' },
  { name: 'wearRepair', kind: 'reduce', runner: 'car', base: '0',
    at: 'vehicle/car.js the parked branch', sig: '(perMinute, ctx) -> perMinute' },
  { name: 'onHorn', kind: 'run', runner: 'car', sig: '(ctx, x, z)',
    at: 'vehicle/car.js the horn input' },
  { name: 'secondWind', kind: 'reduce', runner: 'player', base: 'null',
    at: 'player/controller.js hurt(), immediately before _die()',
    sig: '(spec|null, ctx) -> {seconds}|null' },
  // Declared for places; RUN BY PROGRESS since round 5. There are no doors to close yet, so
  // the car door (car:entered) and a claimed place's door (place:claimed) are the two, and
  // progress runs it from the bus like onHurt/onLand/onNoise. When places grows a real door
  // it takes this line back and progress drops its two.
  { name: 'onDoorShut', kind: 'run', runner: 'progress', sig: '(ctx, x, z)',
    at: 'progression/progress.js _doorShut() from car:entered and place:claimed' },
]);

export const HOOK_NAMES = Object.freeze(HOOK_POINTS.map((h) => h.name));
export const HOOK_BY_NAME = Object.freeze(
  HOOK_POINTS.reduce((m, h) => { m[h.name] = h; return m; }, Object.create(null)),
);

/* --------------------------------------------------------------- base stats -- */

/**
 * THE STAT CONTRACT — five keys now, not forty, because a value only earns a key if another
 * lane samples it INSIDE ITS OWN PHYSICS EVERY STEP. Everything else is a hook and carries
 * its own code.
 *
 * Read them as `ctx.systems.get('progress').stats.<key>` LAZILY, inside step, never captured.
 * Every read is counted; `progress.statReport()` names any key nothing has ever read, and a
 * gate asserts that list is empty.
 *
 * The defaults are the M0 game exactly as it ships today, so `baseStats()` with no nodes owned
 * is a no-op on every system.
 */
export function baseStats() {
  return {
    dropRoll: 0,            // 1 = a fall past dropRollFromM becomes a slide, not damage
    dropRollFromM: 9.0,     // m/s of impact; controller.js's FALL_FREE is 16, so this bites first
    tacSprintTime: 4.0,     // seconds of tac-sprint
    slideCancelKeep: 0.85,  // fraction of speed kept when a slide is cancelled EARLY
    mantleReach: 2.90,      // metres of ledge the mantle probe accepts
    regenCeiling: 40,       // hp the passive regen climbs to
  };
}

export const STAT_KEYS = Object.freeze(Object.keys(baseStats()));

/**
 * One row per key: WHO reads it, WHAT frozen CFG number it replaces, and what the lane falls
 * back to when progress is not in the manifest. This table is the HANDOFF request, kept in
 * code so it cannot drift away from the file it describes.
 */
export const STAT_CONTRACT = Object.freeze({
  dropRoll: Object.freeze({
    file: 'src/player/controller.js', site: 'the landing branch, controller.js:679-682',
    replaces: null, fallback: 0,
    note: 'When 1 and the landing speed exceeds dropRollFromM, start a slide instead of calling hurt().',
  }),
  dropRollFromM: Object.freeze({
    file: 'src/player/controller.js', site: 'the landing branch, controller.js:679-682',
    replaces: null, fallback: 9.0,
    note: 'Impact speed in m/s. Only meaningful while dropRoll is 1.',
  }),
  tacSprintTime: Object.freeze({
    file: 'src/player/controller.js', site: 'controller.js:570, if (this.tacT >= P.tacSprint.time || broke)',
    replaces: 'CFG.player.tacSprint.time', fallback: 4.0,
    note: 'Read the stat where P.tacSprint.time is read today; fall back to it when progress is absent.',
  }),
  slideCancelKeep: Object.freeze({
    file: 'src/player/controller.js', site: '_endSlide(), controller.js:809',
    replaces: null, fallback: 0.85,
    note: 'Scale the horizontal speed when a slide is ended EARLY (stand or jump out), never when it times out.',
  }),
  mantleReach: Object.freeze({
    file: 'src/player/controller.js', site: '_tryMantle(), controller.js:850, the rise > M.reach test',
    replaces: 'CFG.player.mantle.reach', fallback: 2.90,
    note: 'The reach test only. M.tiers and M.clearance stay CFG.',
  }),
  regenCeiling: Object.freeze({
    file: 'src/player/controller.js', site: 'controller.js:508-509 AND :724-725, both regen branches',
    replaces: 'CFG.player.health.regenCeiling', fallback: 40,
    note: 'Both sites, or the ceiling is 70 in one branch and 40 in the other.',
  }),
});

/* ------------------------------------------------------------- hook payloads -- */
// Frozen at module scope, never built inside a hook. `holdBreath`, `noiseRadius`, `penCm` and
// `wearRepair` are reduced on frames, not on events, and a fresh object literal per frame is
// exactly the hot-path allocation the CONTRACT forbids.

const ACTIVE_RELOAD = Object.freeze({ from: 1.000, to: 1.160, mul: 1.25, jamS: 0.65 });
const HOLD_BREATH   = Object.freeze({ swayMul: 0.25, seconds: 2.5 });
const TORCH_FOCUS   = Object.freeze({ angle: 0.25, stunS: 0.8, costS: 3.0 });
const HIGH_BEAM     = Object.freeze({ seconds: 1.6 });
const SECOND_WIND   = Object.freeze({ seconds: 2.5 });

const STEP_LOUD_MUL   = 0.6;    // quiet_1
const COLD_BARREL_M   = 14;     // quiet_2, metres, and only from UNAWARE
const EYESHINE_MUL    = 2.0;    // lamp_2
const PEN_MUL         = 1.5;    // hands_4
const HOTWIRE_S       = 0.5;    // wheel_1
const RAM_MIN_SPEED   = 12;     // wheel_2, m/s
const HORN_RADIUS     = 80;     // wheel_3, metres
const WEAR_REPAIR     = 0.1;    // wheel_4, wear per minute while parked somewhere lit
const STILL_HEART_SPD = 0.4;    // quiet_4, m/s
const STILL_HEART_M   = 6;      // quiet_4, metres
const SHUT_DOOR_M     = 12;     // quiet_3, metres

/* ------------------------------------------------------------------ helpers -- */
// Every one of these reaches a sibling LAZILY, at the moment the hook runs, and retains
// nothing. That is the CONTRACT's cross-system rule, and it is why a node installed at boot
// can still act on a system that is built after progression.

function sys(ctx, id) {
  return ctx && ctx.systems ? ctx.systems.get(id) : null;
}

/** True while nothing alive has noticed you. Reads enemies through its public iterator. */
function nothingIsAware(ctx) {
  const en = sys(ctx, 'enemies');
  if (!en || typeof en.forEachAlive !== 'function') return false;
  let seen = false;
  en.forEachAlive((e) => { if (e && e.aware > 0) seen = true; });
  return !seen;
}

/**
 * Stop hunting anything further away than `beyond`. `setHunt` is the enemies lane's public
 * API (enemies.js:338) and is the only handle this file touches — no enemy field is written
 * from here.
 */
function dropDistantHunts(ctx, x, z, beyond) {
  const en = sys(ctx, 'enemies');
  if (!en || typeof en.forEachAlive !== 'function' || typeof en.setHunt !== 'function') return 0;
  const b2 = beyond * beyond;
  let n = 0;
  en.forEachAlive((e) => {
    if (!e || !e.hunt || !e.pos) return;
    const dx = e.pos.x - x, dz = e.pos.z - z;
    if (dx * dx + dz * dz < b2) return;
    en.setHunt(e, false, 1);
    n++;
  });
  return n;
}

/* -------------------------------------------------------------------- nodes -- */

// A node is an INSTALLER (rocket-shoes items.js:7-31): `install(stats, hooks, rank)` writes
// one of the five surviving stats, or registers hooks, or both. `rank` is how many times this
// node is owned — always 1 today, passed anyway so a future stacking node needs no signature
// change.

export const NODES = Object.freeze([
  /* ---- LEGS: the county gets smaller. All four are frame-sampled stats. -------- */
  { id: 'legs_1', branch: 'legs', tier: 0, cost: 1, name: 'Drop-roll',
    line: 'A long fall ends in a slide instead of a stop.',
    install: (s) => { s.dropRoll = 1; } },
  { id: 'legs_2', branch: 'legs', tier: 1, cost: 2, name: 'Long Wind',
    line: 'The sprint that costs you holds for six and a half seconds.',
    install: (s) => { s.tacSprintTime = 6.5; } },
  { id: 'legs_3', branch: 'legs', tier: 2, cost: 3, name: 'Cut',
    line: 'Standing out of a slide keeps all of it.',
    install: (s) => { s.slideCancelKeep = 1.0; } },
  { id: 'legs_4', branch: 'legs', tier: 3, cost: 5, name: 'Reach',
    line: 'Second-storey windows are a handhold.',
    install: (s) => { s.mantleReach = 3.60; } },

  /* ---- HANDS: the gun answers faster ------------------------------------------ */
  { id: 'hands_1', branch: 'hands', tier: 0, cost: 1, name: 'Active',
    line: 'There is a moment in the reload. Take it, or jam.',
    install: (s, hooks) => {
      void s;
      // The WINDOW is the node. weapons asks once, at _startReload, and gets the spec or
      // null; there is no flag to read and no second key that could disagree with it.
      hooks.on('reloadWindow', 'hands_1', () => ACTIVE_RELOAD);
    } },
  { id: 'hands_2', branch: 'hands', tier: 1, cost: 2, name: 'Carry',
    line: 'Run out of a reload and come back to where you left it.',
    install: (s, hooks) => { void s; hooks.on('reloadResume', 'hands_2', () => true); } },
  { id: 'hands_3', branch: 'hands', tier: 2, cost: 3, name: 'Hold',
    line: 'Two and a half seconds where the sight does not drift.',
    install: (s, hooks) => { void s; hooks.on('holdBreath', 'hands_3', () => HOLD_BREATH); } },
  { id: 'hands_4', branch: 'hands', tier: 3, cost: 5, name: 'Through',
    line: 'The round leaves the far side.',
    install: (s, hooks) => {
      void s;
      hooks.on('penCm', 'hands_4', (cm) => (typeof cm === 'number' ? cm * PEN_MUL : cm));
      hooks.on('penExits', 'hands_4', (n) => (n | 0) + 1);
    } },

  /* ---- LAMP: what the light is for -------------------------------------------- */
  { id: 'lamp_1', branch: 'lamp', tier: 0, cost: 1, name: 'Focus',
    line: 'Squeeze the beam. A Hunter stops for most of a second.',
    install: (s, hooks) => { void s; hooks.on('torchFocus', 'lamp_1', () => TORCH_FOCUS); } },
  { id: 'lamp_2', branch: 'lamp', tier: 1, cost: 2, name: 'Eyeshine',
    line: 'Eyes catch the light twice as far out.',
    // VALUE only, never hue: the glint gets further away, it does not change colour.
    install: (s, hooks) => { void s; hooks.on('eyeshineMul', 'lamp_2', (m) => m * EYESHINE_MUL); } },
  { id: 'lamp_3', branch: 'lamp', tier: 2, cost: 3, name: 'Resolve',
    line: 'What the beam finds stops being a suggestion.',
    install: (s, hooks) => { void s; hooks.on('resolveWatchers', 'lamp_3', () => true); } },
  { id: 'lamp_4', branch: 'lamp', tier: 3, cost: 5, name: 'High Beam',
    line: 'Everything inside the cone is blind for a moment.',
    install: (s, hooks) => { void s; hooks.on('highBeam', 'lamp_4', () => HIGH_BEAM); } },

  /* ---- QUIET: the loudness economy -------------------------------------------- */
  { id: 'quiet_1', branch: 'quiet', tier: 0, cost: 1, name: 'Soft Step',
    line: 'Your feet carry a good deal less.',
    // INTEGRATOR DECISION 2: the footstep noise is emitted by player/controller.js, not by
    // the audio lane, so this node keeps working with the AudioContext dead — which is every
    // headless run. The reduce is keyed on the SOURCE STRING and touches nothing else.
    install: (s, hooks) => {
      void s;
      hooks.on('noiseRadius', 'quiet_1', (r, ctx, source) => {
        void ctx;
        return source === 'step' ? r * STEP_LOUD_MUL : r;
      });
    } },
  { id: 'quiet_2', branch: 'quiet', tier: 1, cost: 2, name: 'Cold Barrel',
    line: 'The first shot at something that has not seen you is a small sound.',
    install: (s, hooks) => {
      void s;
      hooks.on('noiseRadius', 'quiet_2', (r, ctx, source) => {
        if (source !== 'shot' && source !== 'gun') return r;
        if (r <= COLD_BARREL_M) return r;
        // "has not seen you" is a question only the enemies lane can answer, and the node
        // asks it itself. No lane has to know what cold-barrel means.
        return nothingIsAware(ctx) ? COLD_BARREL_M : r;
      });
    } },
  { id: 'quiet_3', branch: 'quiet', tier: 2, cost: 3, name: 'Shut the Door',
    line: 'A door closed behind you ends the argument.',
    install: (s, hooks) => {
      void s;
      // Two triggers, one effect. `onDoorShut` runs on the car door and on claiming a place
      // (progress.js _doorShut); crossing into a lit place is the same beat and progress
      // already hears it. Before round 5 nothing ran onDoorShut at all.
      const shut = (ctx, x, z) => {
        const p = sys(ctx, 'player');
        const px = Number.isFinite(x) ? x : (p && p.pos ? p.pos.x : 0);
        const pz = Number.isFinite(z) ? z : (p && p.pos ? p.pos.z : 0);
        dropDistantHunts(ctx, px, pz, SHUT_DOOR_M);
      };
      hooks.on('onDoorShut', 'quiet_3', shut);
      hooks.on('onPlaceNear', 'quiet_3', (ctx, pl) => {
        if (!pl || (pl.lit !== true && pl.hub !== true)) return;
        shut(ctx, pl.x, pl.z);
      });
    } },
  { id: 'quiet_4', branch: 'quiet', tier: 3, cost: 5, name: 'Still Heart',
    line: 'Crouched and barely moving, you stop being a thing they are following.',
    install: (s, hooks) => {
      void s;
      // Runs off progress's OWN step, so it needs nothing from anybody. Costs one distance
      // test per hunting enemy per step and only while you are actually crouched and still.
      hooks.on('onStep', 'quiet_4', (ctx) => {
        const p = sys(ctx, 'player');
        if (!p || !p.crouched || p.dead) return;
        if (typeof p.speed === 'number' && p.speed > STILL_HEART_SPD) return;
        dropDistantHunts(ctx, p.pos.x, p.pos.z, STILL_HEART_M);
      });
    } },

  /* ---- WHEEL: the car is a verb ----------------------------------------------- */
  { id: 'wheel_1', branch: 'wheel', tier: 0, cost: 1, name: 'Hotwire',
    line: 'Half a second under the column.',
    install: (s, hooks) => { void s; hooks.on('hotwireS', 'wheel_1', () => HOTWIRE_S); } },
  { id: 'wheel_2', branch: 'wheel', tier: 1, cost: 2, name: 'Ram',
    line: 'At speed, a body is not an obstacle.',
    // The base is Infinity, so with this node unowned the car rams NOTHING. That is the
    // point of the card: today car.js:1037 rams unconditionally and the node buys nothing.
    install: (s, hooks) => {
      void s;
      hooks.on('ramMinSpeed', 'wheel_2', (v) => Math.min(v, RAM_MIN_SPEED));
    } },
  { id: 'wheel_3', branch: 'wheel', tier: 2, cost: 3, name: 'Horn',
    line: 'Call everything awake to the car. Then get out and walk away.',
    install: (s, hooks) => {
      void s;
      // The node does the whole thing. `wakeAll` is the enemies lane's public API
      // (enemies.js:350) and the car only has to say that the horn was pressed.
      hooks.on('onHorn', 'wheel_3', (ctx, x, z) => {
        const en = sys(ctx, 'enemies');
        const car = sys(ctx, 'car');
        const hx = Number.isFinite(x) ? x : (car ? car.x : 0);
        const hz = Number.isFinite(z) ? z : (car ? car.z : 0);
        if (en && typeof en.wakeAll === 'function') en.wakeAll(hx, hz, HORN_RADIUS);
        if (ctx && ctx.bus) ctx.bus.emit('noise', { x: hx, z: hz, radius: HORN_RADIUS, source: 'horn' });
      });
    } },
  { id: 'wheel_4', branch: 'wheel', tier: 3, cost: 5, name: 'Keep',
    line: 'Parked somewhere lit, it mends itself.',
    install: (s, hooks) => {
      void s;
      hooks.on('wearRepair', 'wheel_4', (v, ctx) => {
        // Somewhere LIT is the condition, and lights already publishes it every step.
        const lit = ctx && ctx.shared && typeof ctx.shared.lit === 'number' ? ctx.shared.lit : 0;
        return lit >= 0.6 ? v + WEAR_REPAIR : v;
      });
    } },

  /* ---- BLOOD: what you can survive -------------------------------------------- */
  { id: 'blood_1', branch: 'blood', tier: 0, cost: 1, name: 'Ceiling',
    line: 'You come back further on your own.',
    install: (s) => { s.regenCeiling = 70; } },
  { id: 'blood_2', branch: 'blood', tier: 1, cost: 2, name: 'Second Wind',
    line: 'Once a cycle, the end of you is two and a half seconds of running.',
    install: (s, hooks) => {
      void s;
      // ONCE A CYCLE, and the node keeps its own latch in a closure. A recompute re-installs
      // the node and re-arms it, which is the same shape as buying it — correct either way,
      // and nothing outside this row knows the latch exists.
      let spent = false;
      hooks.on('secondWind', 'blood_2', (v) => {
        if (spent) return v;
        spent = true;
        return SECOND_WIND;
      });
      hooks.on('onPhase', 'blood_2', (ctx, phase) => { void ctx; if (phase === 'dusk') spent = false; });
    } },
  { id: 'blood_3', branch: 'blood', tier: 2, cost: 3, name: 'Quick Clot',
    line: 'Killing it starts the mending.',
    // The node that proved the registry: it was the only one of the 24 that ever did
    // anything, because progress actually runs onKill.
    install: (s, hooks) => {
      void s;
      hooks.on('onKill', 'blood_3', (ctx) => {
        const p = sys(ctx, 'player');
        if (p && typeof p.sinceHurt === 'number') {
          const delay = ctx.cfg.player.health.regenDelay;
          if (p.sinceHurt < delay) p.sinceHurt = delay;
        }
      });
    } },
  { id: 'blood_4', branch: 'blood', tier: 3, cost: 5, name: 'False Dawn',
    line: 'When the light lies to you, it mends you anyway.',
    install: (s, hooks) => {
      void s;
      hooks.on('onPhase', 'blood_4', (ctx, phase) => {
        if (phase !== 'dawn') return;
        const p = sys(ctx, 'player');
        if (p && typeof p.heal === 'function') p.heal(ctx.cfg.player.health.max);
      });
    } },
]);

export const NODE_BY_ID = Object.freeze(
  NODES.reduce((m, n) => { m[n.id] = n; return m; }, Object.create(null)),
);

/** The tier-0 node of each branch, keyed by the verb that auto-grants it. */
export const FIRST_NODE_BY_VERB = Object.freeze(
  BRANCHES.reduce((m, b) => {
    const n = NODES.find((x) => x.branch === b.id && x.tier === 0);
    if (n) m[b.verb] = n.id;
    return m;
  }, Object.create(null)),
);

/** donor: palehollow/src/progress.js:54-57 — a tier needs the tier below it, same branch. */
export function prereqOf(node) {
  if (!node || node.tier === 0) return null;
  const p = NODES.find((n) => n.branch === node.branch && n.tier === node.tier - 1);
  return p ? p.id : null;
}

/* ------------------------------------------------------------- the economy -- */

// DESIGN section 6. The Pale and the Auditor give nothing, on purpose: a thing you are not
// meant to fight must not pay, or the player will learn to fight it.
export const XP_BY_SPECIES = Object.freeze({
  hound: 20,
  pallbearer: 24,
  poacher: 45,
  hunter: 90,
  standing: 120,
  candle: 60,
  drowned: 150,
  kneeler: 600,
  pale: 0,
  pacer: 0,
  auditor: 0,
});

export const XP_DEFAULT_KILL = 20;      // an unknown species still pays; silence reads as broken
export const XP_HEADSHOT_MUL = 1.25;
export const XP_MELEE_MUL = 1.15;       // a quiet kill is worth more than a loud one

export const XP_PLACE = Object.freeze({
  findMinor: 150, findMajor: 300,
  claimMinor: 300, claimMajor: 900,
});

export const XP_ROAD_PER_100M = 4;      // FIRST travel only, and paid the same driving
export const ROAD_BUCKET_M = 100;

// The clock pays you for being out in the worst of it. clock.js publishes
// 'dusk' | 'night' | 'black' | 'dawn' on ctx.shared.phase.
export const PHASE_MUL = Object.freeze({ dusk: 1.0, night: 1.5, black: 2.0, dawn: 1.0 });

export const STREAK_WINDOW_S = 0.9;     // skyshard motes.js:275
export const STREAK_PITCH_STEP = 0.09;  // 1 + min(streak, 8) * 0.09
export const STREAK_MAX = 8;

/* ---------------------------------------------------------------- levelling -- */

// DESIGN section 6: `100 * L^1.45` is the TOTAL lifetime XP needed to BE level L.
// L2 275, L5 1030, L10 2820, L20 7700 — those four are the design's own worked examples and
// this curve reproduces them to the rounding they were written at.
export const LEVEL_BASE = 100;
export const LEVEL_POW = 1.45;

export function xpForLevel(level) {
  const L = Math.max(1, Math.floor(level));
  return L <= 1 ? 0 : Math.round(LEVEL_BASE * Math.pow(L, LEVEL_POW));
}

export function levelFor(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  if (xp < xpForLevel(2)) return 1;
  // Closed form, then one correction step each way, because Math.pow rounding at the exact
  // threshold is the difference between "you levelled" and "you did not" and the player will
  // be looking at the light on their hands when it happens.
  let L = Math.floor(Math.pow(xp / LEVEL_BASE, 1 / LEVEL_POW));
  while (L > 1 && xpForLevel(L) > xp) L--;
  while (xpForLevel(L + 1) <= xp) L++;
  return Math.max(1, L);
}

/** 0..1 through the current level. Drawn by nothing — it is the shape of the carried light. */
export function levelFrac(totalXp) {
  const L = levelFor(totalXp);
  const a = xpForLevel(L), b = xpForLevel(L + 1);
  return b > a ? Math.max(0, Math.min(1, (totalXp - a) / (b - a))) : 0;
}

/* --------------------------------------------------------------- the draft -- */

/**
 * The pool a 3-card draft may deal from: unowned, prereq satisfied, affordable is NOT a
 * filter (a card you cannot afford yet is a reason to keep the point).
 * donor: qualiacology/rocket-shoes/src/systems/draft.js:15-19 availableItems().
 */
export function draftPool(owned) {
  const out = [];
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    if (owned.has(n.id)) continue;
    const pre = prereqOf(n);
    if (pre && !owned.has(pre)) continue;
    out.push(n);
  }
  return out;
}

/**
 * Weight a card. Cheap tiers come up more often early; a branch you have already invested in
 * comes up slightly more, so a run develops a shape instead of drifting.
 * donor: qualiacology/rocket-shoes/src/systems/draft.js:22-34 (weight * stack bonus, then a
 *   weighted spliced pick so one deal never shows the same card twice).
 */
export function draftWeight(node, owned) {
  let w = 1 / node.cost;
  let inBranch = 0;
  for (const id of owned) if (NODE_BY_ID[id] && NODE_BY_ID[id].branch === node.branch) inBranch++;
  w *= 1 + 0.18 * Math.min(3, inBranch);
  return w;
}

export default NODES;
