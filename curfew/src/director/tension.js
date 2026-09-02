// tension.js — THE TENSION BUS. One 0..1 scalar, computed from live state every frame,
// never a scripted curve. Owned by the dread lane; constructed by dread.js and by nothing
// else, because two buses is two answers to "how bad is it" and the picture and the mix
// would each believe a different one.
//
// donor: flare/src/director/tension.js:66-292 — createTension's shape is lifted whole:
// the four-term formula, the priority stack implemented as an early return rather than as
// a convention, the transient `kick` that rides on top and decays, `decayBeat` for the
// scheduler, and the COMPOSE-DON'T-OVERWRITE rule on the fog write (flare's version
// composes with its quality governor at tension.js:227-233; ours composes with sky.setPhase,
// which owns scene.fog.density at gfx/sky.js:211-213 and rewrites it when the clock moves).
//
// WHY A BUS AND NOT A CURVE (DESIGN section 5.2, and FLARE's own comment at tension.js:3-7):
// a scripted intensity curve is a second source of truth about how bad things are, and it
// goes wrong the first time the player kills a wave in nine seconds.
//
// WHAT IT DRIVES, simultaneously, from the same number: post's uDread (which is the grade's
// contrast term AND its grain term AND the red crush in the corners), post's uTunnel
// vignette, fog density, the moon's tint where lights offers a setter, and the audio bed's
// lowpass corner. One number read six times.
//
// PRIORITY STACK: scripted > chase > bus. While a beat owns the picture the bus must not
// write, or it stomps the beat back down every frame and the beat is invisible for reasons
// nobody can find.

import CFG from '../config.js';
import { clamp01 } from '../engine/math.js';

// ---------------------------------------------------------------------------
// THE ONE LOCAL TABLE. CFG is deep-frozen and is not mine to edit; every number here is
// requested for a CFG.dread block in docs/HANDOFF.md. Everything CFG already carries
// (CFG.director.dread.*, CFG.world.fog.density, CFG.player.health.*) is READ, never restated.
// ---------------------------------------------------------------------------
export const TENSION_TABLE = Object.freeze({
  // DESIGN section 5.2, verbatim: alive30/8 + lowHealth*0.25 + darkness*0.30 + phase*0.15
  aliveRadius: 30,
  aliveDivisor: 8,
  lowHealthAdd: 0.25,
  lowHealthBelow: CFG.player.health.regenCeiling,   // 40 — the same threshold twice on purpose
  darknessAdd: 0.30,
  phaseAdd: 0.15,

  easeK: 3.5,                // [flare tension.js:145 FEEL.tension.easeK]
  scriptedFade: 3.0,         // [flare tension.js:51]
  chaseFade: 2.0,
  kickDecay: 2.4,            // [flare tension.js:49]
  kickMax: 0.45,             // [flare tension.js:50]

  // What tension does to the picture. DESIGN section 5.2: fog x(1+0.20t), tunnel
  // min(0.24, 0.34t). Contrast and grain are ALREADY uDread terms inside gfx/post.js:80 and
  // :101 — post multiplies uDread by 0.10 and 0.045 itself, so writing setDread(t) IS the
  // contrast law and the grain law, and a second multiply here would double-count them.
  fogPerT: 0.20,
  tunnelPerT: 0.34,
  tunnelMax: 0.24,
  moonRedPerT: 0.55,         // only applied where lights exposes a setter; see HANDOFF
  bedLowpassHi: 5200,        // Hz at t=0
  bedLowpassLo: 900,         // Hz at t=1 — the world going muffled and close

  emitDelta: 0.02,           // bus traffic is not free; publish movement, not frames
  regionEma: 0.35,           // per-second lambda for the per-region average storms read
});

const T = TENSION_TABLE;

// Region floors, DESIGN section 5.2.
//
// THE LOOKUP IS TOTAL, and that is the point of regionFloor() below rather than a bare index.
// Three different vocabularies meet here and none of them is complete on its own:
//   * world/terrain.js:316-319 ships exactly pines / fields / marsh / ridge — those are the
//     only keys regionAt() can ever return today;
//   * world/placedata.js authors destinations in pines / fields / ridge / fen / shore / works;
//   * DESIGN section 2 names the burn as well.
// `fen` is Gallowsfen, which is the marsh under its place-name, so it carries the marsh's
// floor rather than silently falling to the default. Anything unnamed lands on
// REGION_FLOOR_DEFAULT — a named number, not an inline 0.12 that reads like a typo.
export const REGION_FLOOR_DEFAULT = 0.12;

export const REGION_FLOOR = Object.freeze({
  pines: 0.12,
  fields: 0.20,        // Jackfield
  marsh: 0.40,         // Gallowsfen, as terrain names it
  fen: 0.40,           // Gallowsfen, as placedata names it. The same ground.
  ridge: 0.10,
  burn: 0.28,
  works: 0.52,
  shore: 0.40,
});

/** The floor for any key at all, including one nobody has authored yet. */
export function regionFloor(key) {
  const v = REGION_FLOOR[key];
  return typeof v === 'number' ? v : REGION_FLOOR_DEFAULT;
}

// The cycle phase is not a scalar you can multiply — the black hour is not "later dusk".
// One weight per named phase, multiplied by T.phaseAdd. Falls back to a shaped curve over
// phaseT when the clock system publishes only a 0..1.
//
// THE VOCABULARY IS EXACTLY 'dusk' | 'night' | 'black' | 'dawn'. That is what world/clock.js
// publishes to ctx.shared.phase and what `phase:changed` carries, and it is the whole list.
// This table used to carry DESIGN's prose spellings (deepNight / blackHour / falseDawn) too,
// as insurance against a rename. That was the bug, not the insurance: a vocabulary that works
// by accident of which file reads which spelling cannot be checked, and the two spellings
// drifted between lanes within a day. One spelling, and an unknown name falls to the phaseT
// curve below rather than silently weighing zero.
const PHASE_WEIGHT = Object.freeze({
  dusk: 0.25,
  night: 0.55,
  black: 1.0,
  dawn: 0.35,
});

/* --------------------------------------------------------- enemy adapters -- */
// READ AGAINST THE REAL enemies LANE (enemies/enemies.js, on disk 2026-09-02) and kept
// duck-typed anyway, because a roster shape is not mine to depend on:
//   * the roster is `enemies.all` — a POOL, pre-allocated at boot, so it is full of records
//     with `alive: false, state: 'dead'` (enemies.js:1614). Counting it without filtering
//     would report a full county on the title screen.
//   * aliveness is `e.alive`, not `e.dead`. `e.dead` is never set, so a `!e.dead` test
//     passes for every corpse in the pool. That is the bug this comment exists to prevent.
//   * position is `e.pos.x` / `e.pos.z`.
//   * HUNTING is `e.aware === 2` (enemies.js:818), not a state string.
// A closure per frame would allocate, so the tally callback and its inputs are module state.
let _tallyN = 0, _tallyX = 0, _tallyZ = 0, _tallyR2 = 0, _tallyHunt = 0;

function _bodyXZ(e) {
  if (!e) return null;
  if (e.pos && typeof e.pos.x === 'number') return e.pos;
  if (typeof e.x === 'number' && typeof e.z === 'number') return e;
  return null;
}

function _isAlive(e) {
  if (!e) return false;
  if (e.alive === false) return false;      // the pool's own flag, and the authority
  if (e.dead === true) return false;        // ...and the other convention, if it turns up
  if (e.state === 'dead' || e.state === 'corpse') return false;
  return true;
}

/**
 * DREAD-OWNED BODIES ARE EXEMPT FROM THE PERMIT. DESIGN section 4's ownership rule, and it
 * is not a nicety: enemies.js:470 sets `aware = 2` at spawn for every dread-owned species,
 * so a Pale or a Standing Kind standing in the trees would read as HUNTING for its whole
 * life and switch this lane off permanently, in the exact region where it is most needed.
 * `def.owner` is the string 'pressure' | 'dread' (enemies/species.js:22).
 */
function _isPressure(e) {
  const o = (e.def && e.def.owner) || e.owner;
  return o === undefined ? true : o !== 'dread';
}

function _isHunting(e) {
  if (!_isPressure(e)) return false;
  if (e.aware === 2) return true;
  if (e.hunting === true) return true;
  const s = e.state;
  if (typeof s === 'string') { const l = s.toLowerCase(); return l === 'hunting' || l === 'hunt'; }
  return false;
}

function _tally(e) {
  if (!_isAlive(e)) return;
  const p = _bodyXZ(e);
  if (!p) return;
  const dx = p.x - _tallyX, dz = p.z - _tallyZ;
  if (dx * dx + dz * dz > _tallyR2) return;
  _tallyN++;
  if (_isHunting(e)) _tallyHunt++;
}

/**
 * Count live hostiles inside `r` of (x,z) and, at the same time, how many of those are
 * HUNTING. Two answers from one sweep, because the permit needs the second one every frame
 * and a second pass over the roster to get it would be a second cost for the same walk.
 */
export function scanEnemies(ctx, x, z, r) {
  _tallyN = 0; _tallyHunt = 0; _tallyX = x; _tallyZ = z; _tallyR2 = r * r;
  const em = ctx.systems && ctx.systems.get('enemies');
  if (!em) return 0;
  const list = em.all || em.list || em.actives || em.bodies || null;
  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) _tally(list[i]);
    return _tallyN;
  }
  if (typeof em.forEachAlive === 'function') { em.forEachAlive(_tally); return _tallyN; }
  // AND NOTHING AFTER THIS. Two more branches stood here — `em.forEach(_tally)` and
  // `em.aliveWithin(x, z, r)` — and the enemies lane has never shipped either name. It
  // ships `all` (enemies.js:170, the array taken above), list() (:369), alive() (:380) and
  // forEachAlive() (:388). A `a typeof-function probe` probe for a method nobody ships
  // cannot fire, so it is not a fallback: it is a promise the file makes and cannot keep,
  // and the second of the two would have reported a HEADCOUNT with no hunting tally at all,
  // silently zeroing huntingFromLastScan() and with it the whole permit. tests/interfaces.mjs
  // scans for this pattern now. Removed 2026-09-02.
  return 0;
}

/** The hunting count from the last scanEnemies() call. */
export function huntingFromLastScan() { return _tallyHunt; }

/**
 * The bus.
 *
 * `ctx` is the ctx bag. Nothing is captured at construction — every sibling system is read
 * lazily inside update()/apply(), because VIGIL's combat.js captured ctx.systems.enemies at
 * construction, before enemies existed, and got undefined for the rest of the run.
 */
export function createTension(ctx) {
  let value = 0;        // the eased, published scalar
  let raw = 0;          // this frame's computed target, before easing
  let floor = 0;        // the region's authored floor
  let kick = 0;         // transient, rides on top, decays
  let chase = 0;        // 0..1, eased; a HUNTING body owns the picture above the bus
  let chaseWanted = 0;
  let scripted = -1;    // < 0 means "no beat owns the picture"
  let scriptedLevel = 0;
  let alive30 = 0;
  let hunting = 0;
  let darkness = 1;
  let lowHealth = 0;
  let phaseTerm = 0;
  let regionKey = 'pines';
  let lastEmit = -1;
  let writes = 0;
  let floorHold = 0;    // seconds of a forced floor ("the body remembers", DESIGN section 6)
  let floorHoldLevel = 0;

  // Per-region running average, so the weather lane can ask "has this region's dread crossed
  // CFG.clock.stormDreadThreshold" (DESIGN section 2: storms arrive when it crosses 0.6).
  const regionAvg = Object.create(null);

  // Composition state for the fog write. See apply().
  let fogBase = CFG.world.fog.density;
  let fogLastWrite = NaN;

  function setChase(v) { chaseWanted = clamp01(v); }
  function takeScripted(level) { scripted = clamp01(level); scriptedLevel = scripted; }
  function releaseScripted() { scripted = -1; }

  function addKick(v) { kick = Math.min(T.kickMax, kick + v); }

  /** The scheduler's per-beat bleed toward the floor. A beat SPENDS tension. */
  function decayBeat(amount) {
    value = Math.max(floor, value - amount);
    return value;
  }

  /**
   * Force a floor for `seconds`. DESIGN section 6: on respawn, tension is floored at 0.55 for
   * 40 s — "the body remembers" (STILL). Nothing else may pin the bus.
   */
  function holdFloor(level, seconds) {
    floorHoldLevel = clamp01(level);
    floorHold = Math.max(floorHold, seconds);
    if (value < floorHoldLevel) value = floorHoldLevel;
  }

  const _p = { x: 0, y: 0, z: 0, hp: CFG.player.health.max };

  function playerState(out) {
    const p = ctx.systems && ctx.systems.get('player');
    if (p && p.pos) {
      out.x = p.pos.x; out.y = p.pos.y; out.z = p.pos.z;
      out.hp = typeof p.hp === 'number' ? p.hp : CFG.player.health.max;
      return out;
    }
    const c = ctx.camera;
    if (c) { out.x = c.position.x; out.y = c.position.y; out.z = c.position.z; out.hp = CFG.player.health.max; return out; }
    out.x = 0; out.y = 0; out.z = 0; out.hp = CFG.player.health.max;
    return out;
  }

  /**
   * How lit the player is, 0..1. `ctx.shared.lit` is OWNED BY gfx/lights.js and is published
   * every frame (CONTRACT, integrator decision 2), so this reads it and nothing else. The
   * darkness term is 0.30 of the whole formula: while `lit` was missing, darkness sat pinned
   * at 1 and the audit measured this bus idling at 0.325 where the pines floor says 0.120.
   */
  function litNow() {
    const sh = ctx.shared;
    if (sh && typeof sh.lit === 'number') return clamp01(sh.lit);
    // The one pre-existing fallback, for the frames before lights' first publish: the torch
    // is the only light the player carries, so it is the only honest guess available.
    const L = ctx.systems && ctx.systems.get('lights');
    if (L && typeof L.torchOn === 'function' && L.torchOn()) return 0.45;
    return 0.04;
  }

  function phaseWeight() {
    const sh = ctx.shared;
    const clock = ctx.systems && ctx.systems.get('clock');
    let name = sh && sh.phase;
    if (name === undefined && clock) name = clock.phase;
    if (typeof name === 'string') {
      // One spelling. No case-folding second lookup — that was half of how the two
      // vocabularies survived side by side without anybody noticing.
      const w = PHASE_WEIGHT[name];
      if (typeof w === 'number') return w;
    }
    // No clock yet, or it publishes only a 0..1 through the cycle: the shape of the night is
    // still the shape of the night — worst around the black hour, three quarters of the way
    // in (CFG.clock: 180 + 660 + 180 of 1200 s puts its centre at t = 0.78).
    let t = sh && typeof sh.phaseT === 'number' ? sh.phaseT : (clock && typeof clock.phaseT === 'number' ? clock.phaseT : 0);
    t = clamp01(t);
    return 0.25 + 0.75 * Math.sin(Math.min(1, t / 0.78) * Math.PI * 0.5);
  }

  function regionAt(x, z) {
    const terrain = ctx.systems && ctx.systems.get('terrain');
    if (!terrain || typeof terrain.regionAt !== 'function') return 'pines';
    // terrain.regionAt returns SHARED scratch (world HANDOFF D.7). Read .key immediately and
    // never retain the object.
    const r = terrain.regionAt(x, z);
    return (r && r.key) || 'pines';
  }

  /**
   * ONE step. Deterministic, sim-clocked, no rendering: apply() does the writing. Splitting
   * them is the CONTRACT's step/present law and it is also what lets a node test step the
   * bus with no renderer at all.
   */
  function update(dt) {
    const d = dt > 0 ? dt : 0;
    const k = Math.min(1, d * T.easeK);

    playerState(_p);
    regionKey = regionAt(_p.x, _p.z);
    floor = regionFloor(regionKey);

    if (floorHold > 0) {
      floorHold -= d;
      if (floorHoldLevel > floor) floor = floorHoldLevel;
      if (floorHold <= 0) floorHoldLevel = 0;
    }

    alive30 = scanEnemies(ctx, _p.x, _p.z, T.aliveRadius);
    hunting = huntingFromLastScan();
    darkness = 1 - litNow();
    lowHealth = _p.hp < T.lowHealthBelow ? 1 : 0;
    phaseTerm = phaseWeight() * T.phaseAdd;

    // THE FORMULA (DESIGN section 5.2). Four terms, in DESIGN's order, and no fifth term
    // smuggled in — the moment this grows one, nobody can predict the picture from the
    // situation any more, which is the whole property it exists to have.
    raw = clamp01(
      alive30 / T.aliveDivisor
      + lowHealth * T.lowHealthAdd
      + darkness * T.darknessAdd
      + phaseTerm,
    );
    if (raw < floor) raw = floor;

    chase += (chaseWanted - chase) * Math.min(1, d * T.chaseFade);

    // ---- the priority stack, as a branch ----------------------------------
    if (scripted >= 0) {
      value += (scriptedLevel - value) * Math.min(1, d * T.scriptedFade);
    } else if (chase > 0.02) {
      const target = raw > chase ? raw : chase;
      value += (target - value) * Math.min(1, d * T.chaseFade);
    } else {
      value += (raw - value) * k;
    }

    if (kick > 0) { kick -= T.kickDecay * d; if (kick < 0) kick = 0; }

    const published = clamp01(value + kick);

    const prev = regionAvg[regionKey] === undefined ? published : regionAvg[regionKey];
    regionAvg[regionKey] = prev + (published - prev) * Math.min(1, d * T.regionEma);

    // ---- publish the scalar ------------------------------------------------
    // ctx.shared is the CONTRACT's flat bag of scalars. It is created here if nobody has
    // made it yet; `tension` is the only key this lane writes.
    const shared = ctx.shared || (ctx.shared = {});
    shared.tension = published;
    // `tension:changed` HAS NO LISTENER TODAY, AND THAT IS NOT A REASON TO DELETE IT. It is
    // in the CONTRACT's bus vocabulary (`tension:changed {value}`), it is the only push
    // notification of this number — everything else polls ctx.shared.tension — and the HUD
    // is the obvious taker. An audit will keep flagging it as dead; it is not dead, it is
    // unsubscribed. Emit it, throttled by emitDelta, because bus traffic is not free.
    if (lastEmit < 0 || Math.abs(published - lastEmit) >= T.emitDelta) {
      lastEmit = published;
      if (ctx.bus) ctx.bus.emit('tension:changed', { value: published, region: regionKey });
    }
    writes++;
    return published;
  }

  /**
   * The write to the picture and the mix. Presentation only — called from dread.present().
   *
   * COMPOSED, NEVER OVERWRITTEN. `scene.fog.density` belongs to gfx/sky.js:211-213, which
   * rewrites it from the cycle LUT whenever the clock moves. If this wrote
   * `CFG.world.fog.density * (1 + t*0.20)` it would delete the phase every frame and the
   * black hour would silently stop thickening the air. So: if the density is not the number
   * we last wrote, somebody who owns it wrote it, and that becomes the new base.
   */
  function apply() {
    const t = clamp01(value + kick);

    const post = ctx.systems && ctx.systems.get('post');
    if (post) {
      if (typeof post.setDread === 'function') post.setDread(t);
      if (typeof post.setTunnel === 'function') post.setTunnel(Math.min(T.tunnelMax, T.tunnelPerT * t));
    }

    const scene = ctx.scene;
    if (scene && scene.fog) {
      const cur = scene.fog.density;
      if (!(Math.abs(cur - fogLastWrite) < 1e-9)) fogBase = cur;
      const next = fogBase * (1 + t * T.fogPerT);
      scene.fog.density = next;
      fogLastWrite = next;
    }

    // The moon's redness. lights owns every light in the census and I may not touch one
    // directly, so this only runs where the lights lane has offered a setter. It ships
    // `setMoonTint` this round; THE GUARD STAYS ANYWAY, because a lane that hard-calls
    // another lane's method is a lane that takes the whole boot down when that method is
    // renamed, and this term is a tint, not a mechanic.
    const L = ctx.systems && ctx.systems.get('lights');
    if (L && typeof L.setMoonTint === 'function') L.setMoonTint(t * T.moonRedPerT);

    // The bed's lowpass. Same rule: the audio lane owns the corner, this publishes a number.
    //
    // BOTH LANDED THIS ROUND AND THE SHAPES WERE CHECKED AGAINST THE REAL FILE (audio.js:955
    // and :969, read 2026-09-02): setTension takes a 0..1 and clamps it — `t` here is already
    // clamp01(value + kick), so it is in range by construction; setBedLowpass takes HERTZ and
    // reads it as a position between its own BED_LP_REF_HI 5200 and BED_LP_REF_LO 900, which
    // are TENSION_TABLE.bedLowpassHi / bedLowpassLo copied across — bedHz() interpolates
    // between exactly those two, so the position it computes is our 0..1 back again. Do not
    // "simplify" bedHz() to a normalised 0..1: audio.js would read 0.4 Hz as fully closed.
    // THE GUARDS STAY. A lane that hard-calls another lane's method takes the whole boot down
    // the day that method is renamed, and neither of these is a mechanic — the picture and
    // the bus survive an audio lane that is switched off, which is every headless run.
    const A = ctx.systems && ctx.systems.get('audio');
    if (A) {
      if (typeof A.setTension === 'function') A.setTension(t);
      if (typeof A.setBedLowpass === 'function') A.setBedLowpass(bedHz());
    }
    return t;
  }

  function bedHz() {
    return T.bedLowpassHi + (T.bedLowpassLo - T.bedLowpassHi) * clamp01(value + kick);
  }

  /** For the weather lane: this region's running dread, against CFG.clock.stormDreadThreshold. */
  function regionTension(key) {
    const v = regionAvg[key === undefined ? regionKey : key];
    return v === undefined ? 0 : v;
  }

  function reset() {
    value = 0; raw = 0; kick = 0; chase = 0; chaseWanted = 0;
    scripted = -1; scriptedLevel = 0; writes = 0; lastEmit = -1;
    floorHold = 0; floorHoldLevel = 0;
    fogBase = CFG.world.fog.density; fogLastWrite = NaN;
    for (const k in regionAvg) delete regionAvg[k];
  }

  function snapshot() {
    const v = clamp01(value + kick);
    return {
      value: v, raw, floor, kick, chase,
      alive30, hunting, darkness, lowHealth, phaseTerm,
      region: regionKey, regionTension: regionTension(),
      scripted: scripted >= 0 ? scriptedLevel : -1,
      tunnel: Math.min(T.tunnelMax, T.tunnelPerT * v),
      fog: fogBase * (1 + v * T.fogPerT),
      bedHz: bedHz(), writes,
    };
  }

  return {
    update, apply, reset, snapshot,
    setChase, takeScripted, releaseScripted, addKick, decayBeat, holdFloor,
    regionTension, bedHz,
    TENSION_TABLE: T, REGION_FLOOR, regionFloor,
    get value() { return clamp01(value + kick); },
    get bare() { return value; },
    get target() { return raw; },
    get floor() { return floor; },
    get region() { return regionKey; },
    get alive30() { return alive30; },
    get hunting() { return hunting; },
    get darkness() { return darkness; },
    get scriptedOwns() { return scripted >= 0; },
  };
}

export default createTension;
