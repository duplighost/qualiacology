// Twenty abilities across five branches. Stable IDs and costs preserve purchased saves.
// Installers register behavior through HOOK_POINTS and rebuild the sampled stats below.
// Signature effects use system APIs in perk-effects.js; importing the tree needs no renderer.

import {refillSprint, returnHeadshotRound, bloodPrice, panicGuard, tickPanic, flashlamp} from './perk-effects.js';

export const BRANCHES = Object.freeze([
  { id: 'legs',  name: 'Legs',  verb: 'run',    tint: 0x9fb4d8 },
  { id: 'hands', name: 'Hands', verb: 'reload', tint: 0xd8c07a },
  { id: 'lamp',  name: 'Lamp',  verb: 'torch',  tint: 0xf0dca8 },
  { id: 'quiet', name: 'Quiet', verb: 'crouch', tint: 0x8ec4c8 },
  // Vehicle upgrades use the same hook registry but are bought with cash at mechanics.
  { id: 'blood', name: 'Blood', verb: 'hurt',   tint: 0xc45a5a },
]);

export const BRANCH_IDS = Object.freeze(BRANCHES.map((b) => b.id));

/* -------------------------------------------------------------- hook points -- */

/** Hook names, consumers and call signatures. Unknown installations are reported.
 * Run hooks receive (ctx, ...args); reduce hooks receive (value, ctx, ...args).
 * Without an owned ability, reduce hooks leave their input unchanged.
 */
export const HOOK_POINTS = Object.freeze([
  // Event hooks dispatched by Progress.
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

  // Hooks sampled by the systems that own the action.
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
  // ROUND 6 (lane G): run by gfx/lights.js present(), inside the torch block — the beam's
  // angle and heat are set by name there, and the two reads live beside them.
  { name: 'torchFocus', kind: 'reduce', runner: 'lights', base: 'null',
    at: 'gfx/lights.js present(), the torch block', sig: '(spec|null, ctx) -> {angle}|null' },
  { name: 'highBeam', kind: 'reduce', runner: 'lights', base: 'null',
    at: 'gfx/lights.js present(), the torch block', sig: '(spec|null, ctx) -> {seconds}|null' },
  { name: 'eyeshineMul', kind: 'reduce', runner: 'enemies', base: '1',
    at: 'enemies/enemies.js the eye-glint range test', sig: '(mul, ctx) -> mul' },
  // ROUND 6 (lane G): run by director/dread.js _stepWatcher(), the withdrawal decision.
  { name: 'resolveWatchers', kind: 'reduce', runner: 'dread', base: 'false',
    at: 'director/dread.js _stepWatcher(), the watcher reveal', sig: '(bool, ctx) -> bool' },
  { name: 'noiseRadius', kind: 'reduce', runner: 'player',
    base: 'the radius about to be emitted',
    at: 'player/controller.js the footstep noise emit; weapons/weapon.js _fire()',
    sig: '(radius, ctx, source) -> radius' },
  { name: 'hotwireS', kind: 'reduce', runner: 'car', base: 'CFG.car.hotwire',
    at: 'vehicle/car.js the hotwire timer', sig: '(seconds, ctx) -> seconds' },
  { name: 'ramClean', kind: 'reduce', runner: 'car', base: 'false',
    at: 'vehicle/car.js _ram()', sig: '(bool, ctx) -> bool' },
  // 2026-09-09, Alex: "one of the car upgrades should be like nitro. just a meter that lets
  // you go fast and its fun for a bit. then it automatically regenerates." The METER is the
  // car's (car.js owns boost, drains it and fills it back); the node is what puts a tank in
  // the car at all. Null means there is no tank and shift does nothing, which is the game
  // exactly as it shipped.
  { name: 'nitro', kind: 'reduce', runner: 'car', base: 'null',
    at: 'vehicle/car.js _nitro()',
    sig: '(spec|null, ctx) -> {mul,accel,drainS,refillS,holdS}|null' },
  // 2026-09-09, Alex: "another one of the car upgrades should be that the car never breaks
  // down." Two points, because a car that stops wearing at 70% worn is still a dog: `wearAdd`
  // is every gram of new wear (ONE funnel, car.js _addWear) and `wearMend` takes off what is
  // already there while the engine runs.
  { name: 'wearAdd', kind: 'reduce', runner: 'car', base: 'the wear about to be added',
    at: 'vehicle/car.js _addWear()', sig: '(delta, ctx, why) -> delta' },
  { name: 'wearMend', kind: 'reduce', runner: 'car', base: '0',
    at: 'vehicle/car.js the wear branch of step()', sig: '(perMinute, ctx, running) -> perMinute' },
  // ROUND 18, 2026-09-09, Alex: "If an upgrade is wicked expensive and it lets it crash
  // through the trees in a forest knocking them over/temporarily destroying them, that
  // would be the best." Installed by the GARAGE (vehicle/garage.js), not by a node — the
  // five car upgrades are bought with money at a lookout now, not with points on the card.
  // The hook point still lives in this table because this table is the whole vocabulary:
  // an install onto a name that is not here is refused loudly.
  { name: 'treeBreak', kind: 'reduce', runner: 'car', base: 'null',
    at: 'vehicle/car.js _crushStep()',
    sig: '(spec|null, ctx) -> {minSpeed,radius,scrub,regrowS,maxPerStep}|null' },
  { name: 'secondWind', kind: 'reduce', runner: 'player', base: 'null',
    at: 'player/controller.js hurt(), immediately before _die()',
    sig: '(spec|null, ctx) -> {seconds}|null' },
  // Latched doors, entering the car and securing a place share the trail-loss hook.
  { name: 'onDoorShut', kind: 'run', runner: 'progress', sig: '(ctx, x, z)',
    at: 'progression/progress.js _doorShut() from door:shut, car:entered and place:claimed' },
]);

export const HOOK_NAMES = Object.freeze(HOOK_POINTS.map((h) => h.name));
export const HOOK_BY_NAME = Object.freeze(
  HOOK_POINTS.reduce((m, h) => { m[h.name] = h; return m; }, Object.create(null)),
);

/* --------------------------------------------------------------- base stats -- */

/** Sampled movement, combat and health defaults. Progress rebuilds these on load or
 * purchase; consumers read the current values and fall back to their own CFG defaults.
 */
export function baseStats() {
  return {
    dropRoll: 0,            // 1 = a fall past dropRollFromM becomes a slide, not damage
    dropRollFromM: 9.0,     // m/s of impact; controller.js's FALL_FREE is 16, so this bites first
    tacSprintTime: 4.0,     // seconds of tac-sprint
    slideCancelKeep: 0.85,  // fraction of speed kept when a slide is cancelled EARLY
    mantleReach: 2.90,      // metres of ledge the mantle probe accepts
    regenCeiling: 40,       // hp the passive regen climbs to
    hpMax: 100,             // CFG.player.health.max
    speedMul: 1.0,          // every ground speed of the body
    damageMul: 1.0,         // every round the gun lands
  };
}

export const STAT_KEYS = Object.freeze(Object.keys(baseStats()));

/** Consumer locations and CFG fallbacks for the sampled values. */
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
  // ROUND 6, lane G registers; lane E reads the first two through _stat, lane C the third
  // through _perk-style lazy reads. BRIEF-COMMON cross-lane contract table.
  hpMax: Object.freeze({
    file: 'src/player/controller.js', site: 'every read of P.health.max (the clamp, the respawn fill, heal())',
    replaces: 'CFG.player.health.max', fallback: 100,
    note: 'The body clamps hp to this and exposes it as player.hpMax so ui/hud.js can draw the arc against it.',
  }),
  speedMul: Object.freeze({
    file: 'src/player/controller.js', site: 'the ground speed resolve (walk, sprint, tac-sprint, crouch)',
    replaces: null, fallback: 1.0,
    note: 'Multiply every ground target speed. Never the car, never a fall.',
  }),
  damageMul: Object.freeze({
    file: 'src/combat/combat.js', site: 'the damage roll, before the zone multiplier',
    replaces: null, fallback: 1.0,
    note: 'Multiply the damage of every round the gun lands. Melee too.',
  }),
});

/* ------------------------------------------------------------- hook payloads -- */
// Frozen at module scope, never built inside a hook. `holdBreath`, `noiseRadius`, `penCm`,
// `nitro`, `wearAdd` and `wearMend` are reduced on frames, not on events, and a fresh object
// literal per frame is exactly the hot-path allocation the CONTRACT forbids.

const ACTIVE_RELOAD = Object.freeze({ from: 1.000, to: 1.160, mul: 1.25, jamS: 0.65 });
const HOLD_BREATH   = Object.freeze({ swayMul: 0.25, seconds: 2.5 });
// `angle` and nothing else: this spec used to carry a stunS and a costS that lights.js has
// never read and no other lane has ever asked for. A field nobody reads is a promise the
// card does not make and the game does not keep, so they are gone.
const TORCH_FOCUS   = Object.freeze({ angle: 0.25 });
const HIGH_BEAM     = Object.freeze({ seconds: 1.6 });
const SECOND_WIND   = Object.freeze({ seconds: 2.5 });

const STEP_LOUD_MUL   = 0.6;    // quiet_1
const COLD_BARREL_M   = 14;     // quiet_2, metres, and only from UNAWARE
const EYESHINE_MUL    = 2.0;    // lamp_2
const PEN_MUL         = 1.5;    // hands_4
// ROUND 18: HOTWIRE_S, RAM_MIN_SPEED and WEAR_MEND moved to vehicle/garage.js with the
// four car upgrades they belonged to. NITRO went with them.

const SHUT_DOOR_M     = 12;     // quiet_3, metres

// ROUND 6 — the numbers with teeth. Two steps each, the second the whole of it.
const HP_THICK_SKIN   = 120;    // blood_2
const HP_IRON         = 150;    // blood_4
const SPEED_STRIDE    = 1.10;   // legs_2
const SPEED_WIND      = 1.20;   // legs_4
const DMG_HEAVY       = 1.25;   // hands_2
const DMG_THROUGH     = 1.50;   // hands_4
const TAC_SPRINT_CUT  = 6.5;    // legs_3, seconds
const MANTLE_WIND     = 3.60;   // legs_4, metres

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
  // Dread figures can be permanently aware. Only the pressure population tracks
  // shots, and its maintained count is the public, allocation-free answer.
  if (Number.isFinite(en.awareCount)) return en.awareCount === 0;
  let seen = false;
  en.forEachAlive((e) => { if (e && !e.neutral && e.def?.owner !== 'dread' && e.aware > 0) seen = true; });
  return !seen;
}

/**
 * Stop hunting anything further away than `beyond`. `setHunt` is the enemies lane's public
 * API (enemies.js:338) and is the only handle this file touches — no enemy field is written
 * from here.
 */
function dropDistantHunts(ctx, x, z, beyond) {
  const en = sys(ctx, 'enemies');
  if (typeof en?.loseTrail === 'function') return en.loseTrail(x, z, beyond);
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
// one of the nine surviving stats, or registers hooks, or both. `rank` is how many times this
// node is owned — always 1 today, passed anyway so a future stacking node needs no signature
// change. `line` is the ONE sentence the pause card prints under the name: what it buys, in
// words he can repeat. Under sixty characters so it holds two lines on the card.

export const NODES = Object.freeze([
  /* ---- LEGS: the county gets smaller ------------------------------------------ */
  { id: 'legs_1', branch: 'legs', tier: 0, cost: 1, name: 'Drop-roll',
    line: 'Hold crouch as you land. Roll through a long fall.',
    install: (s) => { s.dropRoll = 1; } },
  { id: 'legs_2', branch: 'legs', tier: 1, cost: 2, name: 'Second Wind',
    line: 'Every kill refills your hard sprint. Run faster, too.',
    install: (s, hooks) => { s.speedMul = SPEED_STRIDE; hooks.on('onKill','legs_2',ctx=>refillSprint(ctx)); } },
  { id: 'legs_3', branch: 'legs', tier: 2, cost: 3, name: 'Cut',
    line: 'The hard sprint holds longer, and a slide keeps its speed.',
    install: (s) => { s.tacSprintTime = TAC_SPRINT_CUT; s.slideCancelKeep = 1.0; } },
  { id: 'legs_4', branch: 'legs', tier: 3, cost: 5, name: 'Wind',
    line: 'Vault higher. Hard landings refill your sprint.',
    // The WHOLE multiplier, not a second step on top of Long Stride: installs run in tier
    // order and this row is what the stat reads once both are owned.
    install: (s, hooks) => { s.speedMul = SPEED_WIND; s.mantleReach = MANTLE_WIND;
      hooks.on('onLand','legs_4',(ctx,p)=>{if(p?.speed>=7)refillSprint(ctx,'legs_4');}); } },

  /* ---- HANDS: the gun answers harder ------------------------------------------ */
  { id: 'hands_1', branch: 'hands', tier: 0, cost: 1, name: 'Active',
    line: 'Press R at the reload click to finish early. Mistime it and the gun jams.',
    install: (s, hooks) => {
      void s;
      // The WINDOW is the node. weapons asks once, at _startReload, and gets the spec or
      // null; there is no flag to read and no second key that could disagree with it.
      hooks.on('reloadWindow', 'hands_1', () => ACTIVE_RELOAD);
    } },
  { id: 'hands_2', branch: 'hands', tier: 1, cost: 2, name: 'Last Round',
    line: 'A headshot kill returns a round to your gun. Hit harder.',
    install: (s, hooks) => { s.damageMul = DMG_HEAVY; hooks.on('onKill','hands_2',returnHeadshotRound); } },
  { id: 'hands_3', branch: 'hands', tier: 2, cost: 3, name: 'Hold',
    line: 'Steady your aim. Interrupted reloads resume where you left them.',
    install: (s, hooks) => {
      void s;
      hooks.on('holdBreath', 'hands_3', () => HOLD_BREATH);
      hooks.on('reloadResume', 'hands_3', () => true);
    } },
  { id: 'hands_4', branch: 'hands', tier: 3, cost: 5, name: 'Through',
    line: 'Shoot through cover and the body behind it.',
    install: (s, hooks) => {
      s.damageMul = DMG_THROUGH;
      hooks.on('penCm', 'hands_4', (cm) => (typeof cm === 'number' ? cm * PEN_MUL : cm));
      hooks.on('penExits', 'hands_4', (n) => (n | 0) + 1);
    } },

  /* ---- LAMP: what the light is for -------------------------------------------- */
  { id: 'lamp_1', branch: 'lamp', tier: 0, cost: 1, name: 'Focus',
    line: 'Aim with the torch on and the beam squeezes tight.',
    install: (s, hooks) => { void s; hooks.on('torchFocus', 'lamp_1', () => TORCH_FOCUS); } },
  { id: 'lamp_2', branch: 'lamp', tier: 1, cost: 2, name: 'Eyeshine',
    line: 'Eyes catch the light twice as far out.',
    // VALUE only, never hue: the glint gets further away, it does not change colour.
    install: (s, hooks) => { void s; hooks.on('eyeshineMul', 'lamp_2', (m) => m * EYESHINE_MUL); } },
  { id: 'lamp_3', branch: 'lamp', tier: 2, cost: 3, name: 'Resolve',
    line: 'Hold a watcher in your beam. Make it withdraw.',
    install: (s, hooks) => { void s; hooks.on('resolveWatchers', 'lamp_3', () => true); } },
  { id: 'lamp_4', branch: 'lamp', tier: 3, cost: 5, name: 'Flashburn',
    line: 'Switch on the torch to repel attackers. Recharges in 12s.',
    install: (s, hooks) => { void s; hooks.on('highBeam', 'lamp_4', () => HIGH_BEAM);
      hooks.on('onStep','lamp_4',flashlamp); } },

  /* ---- QUIET: the loudness economy -------------------------------------------- */
  { id: 'quiet_1', branch: 'quiet', tier: 0, cost: 1, name: 'Soft Step',
    line: 'Crouched footsteps are silent. Running carries less.',
    // INTEGRATOR DECISION 2: the footstep noise is emitted by player/controller.js, not by
    // the audio lane, so this node keeps working with the AudioContext dead — which is every
    // headless run. The reduce is keyed on the SOURCE STRING and touches nothing else.
    install: (s, hooks) => {
      void s;
      hooks.on('noiseRadius', 'quiet_1', (r, ctx, source) => {
        return source === 'step' ? (sys(ctx,'player')?.crouched ? 0 : r * STEP_LOUD_MUL) : r;
      });
    } },
  { id: 'quiet_2', branch: 'quiet', tier: 1, cost: 2, name: 'Cold Barrel',
    line: 'An opening shot only alerts enemies close to you.',
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
    line: 'Close a door. Unseen pursuers lose your trail.',
    install: (s, hooks) => {
      void s;
      // Reaching a lit place also breaks a pursuit that no longer has line of sight.
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
  { id: 'quiet_4', branch: 'quiet', tier: 3, cost: 5, name: 'Unheard',
    line: 'Nothing you do makes a sound they can follow.',
    // 2026-09-09, Alex: "One of the quiet updates should make it so you can't be heard."
    // The whole of it, at the top of the branch that has been building toward it: the step
    // (quiet_1), the shot (quiet_2), and now everything. It is the LOUDNESS that goes, not
    // the sound — the county still hears itself, the gun is still audible to the player, and
    // an eye that is already on you still works. Sight is the price of the branch.
    install: (s, hooks) => {
      void s;
      hooks.on('noiseRadius', 'quiet_4', () => 0);
    } },


  /* ---- BLOOD: what you can survive -------------------------------------------- */
  { id: 'blood_1', branch: 'blood', tier: 0, cost: 1, name: 'Mend',
    line: 'Wounds mend back to 70 health without a medkit.',
    install: (s) => { s.regenCeiling = 70; } },
  { id: 'blood_2', branch: 'blood', tier: 1, cost: 2, name: 'Fight Back',
    line: 'When hurt near death, shove attackers back. +20 max health.',
    install: (s, hooks) => { s.hpMax = HP_THICK_SKIN;
      hooks.on('onHurt','blood_2',panicGuard);hooks.on('onStep','blood_2',tickPanic); } },
  { id: 'blood_3', branch: 'blood', tier: 2, cost: 3, name: 'Blood Price',
    line: 'Every kill restores 12 health and starts mending.',
    // The node that proved the registry: it was the only one of the 24 that ever did
    // anything, because progress actually runs onKill.
    install: (s, hooks) => {
      void s;
      hooks.on('onKill', 'blood_3', bloodPrice);
    } },
  { id: 'blood_4', branch: 'blood', tier: 3, cost: 5, name: 'Iron',
    line: '150 max health. Survive a fatal hit once each cycle and escape.',
    install: (s, hooks) => {
      // The WHOLE number, like Wind: 150 is what the body reads once Thick Skin and Iron
      // are both owned, not 120 + 30 applied in some order.
      s.hpMax = HP_IRON;
      // Second wind, ONCE A CYCLE, and the latch lives in the SAVE rather than in a closure.
      // It used to be a `let spent` declared right here. Every _recompute() re-runs this
      // installer and rebuilt that closure, so buying ANY other node — a one-point Focus in a
      // branch Iron has never heard of — handed back a spent Iron. An extra life for the price
      // of the cheapest card in the tree, as often as you liked, inside one night. The old
      // comment called that "the same shape as buying it", which is true of buying IRON and
      // not of buying anything else. Keyed to the clock's cycle number, so it also stops
      // re-arming on every reload, which the dusk reset could not see either.
      // Round 5 sold this as its own tier-1 card; it is the top of BLOOD now, where dying is
      // the subject.
      hooks.on('secondWind', 'blood_4', (v, ctx) => {
        const sys = ctx && ctx.systems;
        const prog = sys ? sys.get('progress') : null;
        if (!prog || typeof prog.flag !== 'function') return v;
        const clock = sys.get('clock');
        // +1 so an absent flag (0) always reads as "never spent", cycle 0 included.
        const key = (clock && typeof clock.cycle === 'number' ? clock.cycle : 0) + 1;
        if ((Number(prog.flag('iron:spent')) || 0) === key) return v;
        prog.flag('iron:spent', key);
        return SECOND_WIND;
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
  // ROUND 15: the Holdfast garrison. Between a hunter and a Kneeler, and there are six.
  warden: 260,
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

// September 8: retain the level-two opening, then make later choices last. The old
// total-XP curve allowed several whole levels from one destination. Save migration
// preserves earned levels, purchases and fractional progress before this curve applies.
export const LEVEL_BASE = 650;
export const LEVEL_POW = 1.35;

export function xpForLevel(level) {
  const L = Math.max(1, Math.floor(level));
  return L <= 1 ? 0 : 273 + Math.round(LEVEL_BASE * Math.pow(L - 2, LEVEL_POW));
}

export function levelFor(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  if (xp < xpForLevel(2)) return 1;
  // Closed form, then one correction step each way, because Math.pow rounding at the exact
  // threshold is the difference between "you levelled" and "you did not" and the player will
  // be looking at the light on their hands when it happens.
  let L = 2 + Math.floor(Math.pow(Math.max(0,xp - 273) / LEVEL_BASE, 1 / LEVEL_POW));
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
 * ROUND 6: nothing on the pause card deals any more; the pool serves autoDraft tests only.
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
