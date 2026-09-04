// auditor.js — THE UNSEEN THING. Built from Alex's own spec, verbatim where it is a rule:
// donor (spec, not code): donors/offseason/README.md:203-215 "The Wrongness Director" —
// the unease budget W = base[day] + disruptionDebt * DEBT_MULT with base
// [0,0,1,2,3,4,6,8,10]; JSON events with {cost, tags, family, escalatesTo, placementRules,
// prereqs, cooldownDays, oneShot, catTell}; max 2 + floor(day/3) per day; never two in the
// same district on the same day before Day 7; the witnessing rule at README.md:207
// ("if the player's viewport lingers >= 1.5 s on an active event, mark witnessed; witnessed
// events escalate along a defined family chain next spawn"); "Cats first" at README.md:208
// (the tell 10-40 s BEFORE activation); and determinism on the seeded stream
// `director:{day}` at README.md:209.
//
// CURFEW's one substitution, and it is DESIGN decision 11: the phase is keyed to
// DESTINATIONS CLAIMED, not to days. A day is a clock; a claim is something the player did.
// The Auditor learns you by what you take back, which is why the game gets worse the better
// you do at it — and it is why it may never take anything away again (decision 11 also
// rejects False Dawn un-claiming: a hidden un-claim reads as a bug).
//
// THREE HARD LAWS, and every one of them is a line of code below rather than a convention:
//   1. IT NEVER SPAWNS A BODY. `commission` is only ever called with a non-figure prop, and
//      the pool is asserted against FIGURE_PROPS at construction. The visible roster is the
//      enemies lane's and the dread-ahead trio is dread.js's; this is a layer ABOVE both.
//   2. IT IS NEVER RENDERED. It owns no mesh, no material and no light. Every event reaches
//      the screen by commissioning something dread.js already built, or it reaches only the
//      ear. If dread refuses the placement, the event refuses too and the budget is not
//      spent (UNINVITED scares.js:84 — "no clean sightline, try another scare").
//   3. IT NEVER TAKES ANYTHING AWAY. There is no un-claim, no XP debit and no stat drain in
//      this file. Looking is how you earn AND how it learns you.

import CFG from '../config.js';

// The cycle, in seconds. CFG.clock owns the four phase lengths; this is their sum, so if the
// clock lane retunes the night this number follows it instead of drifting away from it.
// NOTE for the next reader: `deepNightS` / `blackHourS` / `falseDawnS` are KEY NAMES in
// config.js (owned by engine, deep-frozen, not mine to rename). They are not phase strings.
// The phase vocabulary is exactly 'dusk' | 'night' | 'black' | 'dawn' and appears in this
// file in exactly one place: onPhaseChanged.
const CYCLE_S = CFG.clock.duskS + CFG.clock.deepNightS + CFG.clock.blackHourS + CFG.clock.falseDawnS;

// ---------------------------------------------------------------------------
// THE ONE LOCAL TABLE. Requested for a CFG.auditor block in docs/HANDOFF.md.
// ---------------------------------------------------------------------------
export const AUDITOR_TABLE = Object.freeze({
  // donors/offseason/README.md:205 — base[] indexed by phase, phase = destinations claimed.
  base: Object.freeze([0, 0, 1, 2, 3, 4, 6, 8, 10]),
  debtMult: 0.75,
  maxPhase: 8,

  // README.md:206 — max 2 + floor(phase/3) per cycle; no two in one region before phase 7.
  perCycleBase: 2,
  perCyclePhaseDiv: 3,
  regionExclusiveBelowPhase: 7,

  witnessSeconds: 1.5,        // README.md:207
  witnessCone: 0.90,          // cos of the half-angle that counts as "lingering on it"
  witnessRange: 60,           // metres; past this you cannot be said to be looking AT it
  witnessXp: 15,              // DESIGN section 5: 15 XP, capped 20 per cycle
  witnessXpCapPerCycle: 20,

  tellMin: 10, tellMax: 40,   // README.md:208 — animals know first, 10-40 s before
  rollEvery: 6.5,             // seconds between attempts to place; the budget is the limiter
  activeMax: 3,               // simultaneous live events; more than three is noise
  eventLife: 150,             // seconds an unwitnessed event stays placed before it lapses
  placeRadiusMin: 18,         // never in your lap
  placeRadiusMax: 74,         // and never past where it could be read

  debtOnDeath: 2,             // you died out there and something counted it
  debtOnBarrenCycle: 1,       // a whole cycle and you claimed nothing
});

const A = AUDITOR_TABLE;

// Props the Auditor is forbidden to ask for. Law 1, as data.
const FIGURE_PROPS = Object.freeze({ watcher: 1, runner: 1, mimic: 1, figure: 1 });

/**
 * WHAT AN EVENT SOUNDS LIKE. The Auditor invents no audio vocabulary of its own: every event
 * answers with one of dread.js's BEAT_SOUNDS, because those are the names the audio lane
 * bakes and a name outside that list is a beat that makes no sound at all. An event whose
 * prop is `null` is the subtraction family — its sound is the CUT, so it takes a hush and
 * `withdraw` is the edge of it.
 */
const PROP_SOUND = Object.freeze({
  footprints: 'footfall',
  eyes: 'eyes',
  lantern: 'lantern',
});
const SUBTRACTION_SOUND = 'withdraw';

// Seconds of authored silence a propless (subtraction) event asks dread for. DESIGN section
// 5's subtraction bible: the dog stops answering, the insects cut, your own reverb shortens.
const SUBTRACTION_HUSH_S = 3.2;

/* ---------------------------------------------------------------------------
 * THE STARTER POOL — 20 rows, JSON-shaped exactly as donors/offseason/README.md:404-415
 * defines a wrongness event, re-authored for a county of forest and back roads.
 *
 * `prop` is what dread.js is asked to make real. `null` means the event is audible only and
 * nothing else — which is not a failure: DESIGN section 5's subtraction bible says the cut IS
 * the event, and a sound with a position is a fact about the world.
 *
 * Three families carry the escalation chain from DESIGN section 5.4 and README.md:207:
 *   wet_footprints:  on the road -> leading into a building -> a wet chair at the table
 *   one_headlight:   a car with one headlight -> the same car later -> parked where you go
 *   three_figures:   facing away -> not waving -> facing you
 * ------------------------------------------------------------------------ */
export const EVENT_POOL = Object.freeze([
  // --- the wet footprints family ------------------------------------------
  {
    id: 'wet_prints_road', cost: 1, tags: ['visual', 'spatial'], family: 'wet_prints',
    escalatesTo: 'wet_prints_indoors', placement: { regions: null, minPhase: 0, surface: 'road' },
    cooldown: 2, oneShot: false, tell: true, prop: 'footprints',
  },
  {
    id: 'wet_prints_indoors', cost: 2, tags: ['visual', 'spatial'], family: 'wet_prints',
    escalatesTo: 'wet_prints_chair', placement: { regions: null, minPhase: 2, surface: 'place' },
    cooldown: 3, oneShot: false, tell: true, prop: 'footprints',
  },
  {
    id: 'wet_prints_chair', cost: 3, tags: ['visual', 'spatial'], family: 'wet_prints',
    escalatesTo: null, placement: { regions: null, minPhase: 4, surface: 'place' },
    cooldown: 4, oneShot: true, tell: true, prop: 'lantern',
  },

  // --- the one-headlight family -------------------------------------------
  {
    id: 'one_headlight_far', cost: 1, tags: ['visual', 'audio'], family: 'one_headlight',
    escalatesTo: 'one_headlight_near', placement: { regions: null, minPhase: 1, surface: 'road' },
    cooldown: 2, oneShot: false, tell: false, prop: 'lantern',
  },
  {
    id: 'one_headlight_near', cost: 2, tags: ['visual', 'audio'], family: 'one_headlight',
    escalatesTo: 'one_headlight_parked', placement: { regions: null, minPhase: 3, surface: 'road' },
    cooldown: 3, oneShot: false, tell: true, prop: 'lantern',
  },
  {
    id: 'one_headlight_parked', cost: 3, tags: ['visual'], family: 'one_headlight',
    escalatesTo: null, placement: { regions: null, minPhase: 5, surface: 'place' },
    cooldown: 4, oneShot: true, tell: true, prop: 'lantern',
  },

  // --- the three figures family. Eyes, never bodies: law 1. ----------------
  {
    id: 'three_facing_away', cost: 2, tags: ['visual'], family: 'three_figures',
    escalatesTo: 'three_not_waving', placement: { regions: ['fields', 'burn'], minPhase: 2, surface: 'offroad' },
    cooldown: 3, oneShot: false, tell: true, prop: 'eyes',
  },
  {
    id: 'three_not_waving', cost: 3, tags: ['visual'], family: 'three_figures',
    escalatesTo: 'three_facing_you', placement: { regions: ['fields', 'burn'], minPhase: 4, surface: 'offroad' },
    cooldown: 4, oneShot: false, tell: true, prop: 'eyes',
  },
  {
    id: 'three_facing_you', cost: 4, tags: ['visual'], family: 'three_figures',
    escalatesTo: null, placement: { regions: ['fields', 'burn'], minPhase: 6, surface: 'offroad' },
    cooldown: 5, oneShot: true, tell: true, prop: 'eyes',
  },

  // --- the singles. Each answers with a sound from its own position. -------
  {
    id: 'reflector_out_of_line', cost: 1, tags: ['visual'], family: 'road_wrong',
    escalatesTo: 'road_sign_turned', placement: { regions: null, minPhase: 0, surface: 'road' },
    cooldown: 2, oneShot: false, tell: false, prop: 'lantern',
  },
  {
    id: 'road_sign_turned', cost: 2, tags: ['visual', 'spatial'], family: 'road_wrong',
    escalatesTo: null, placement: { regions: null, minPhase: 3, surface: 'road' },
    cooldown: 3, oneShot: false, tell: false, prop: 'lantern',
  },
  {
    id: 'trunk_socket', cost: 1, tags: ['visual'], family: 'watched',
    escalatesTo: 'trunk_socket_pair', placement: { regions: ['pines', 'marsh'], minPhase: 0, surface: 'trunk' },
    cooldown: 1, oneShot: false, tell: true, prop: 'eyes',
  },
  {
    id: 'trunk_socket_pair', cost: 2, tags: ['visual'], family: 'watched',
    escalatesTo: null, placement: { regions: ['pines', 'marsh'], minPhase: 3, surface: 'trunk' },
    cooldown: 2, oneShot: false, tell: true, prop: 'eyes',
  },
  {
    id: 'dog_stops_answering', cost: 1, tags: ['audio'], family: 'subtraction',
    escalatesTo: 'insects_cut', placement: { regions: null, minPhase: 1, surface: 'anywhere' },
    cooldown: 3, oneShot: false, tell: false, prop: null,
  },
  {
    id: 'insects_cut', cost: 2, tags: ['audio'], family: 'subtraction',
    escalatesTo: 'own_reverb_shortens', placement: { regions: null, minPhase: 3, surface: 'anywhere' },
    cooldown: 4, oneShot: false, tell: false, prop: null,
  },
  {
    id: 'own_reverb_shortens', cost: 3, tags: ['audio'], family: 'subtraction',
    escalatesTo: null, placement: { regions: null, minPhase: 5, surface: 'anywhere' },
    cooldown: 5, oneShot: true, tell: false, prop: null,
  },
  {
    id: 'lantern_off_the_road', cost: 2, tags: ['visual', 'audio'], family: 'lantern',
    escalatesTo: 'lantern_where_you_slept', placement: { regions: null, minPhase: 2, surface: 'offroad' },
    cooldown: 3, oneShot: false, tell: true, prop: 'lantern',
  },
  {
    id: 'lantern_where_you_slept', cost: 3, tags: ['visual'], family: 'lantern',
    escalatesTo: null, placement: { regions: null, minPhase: 5, surface: 'place' },
    cooldown: 4, oneShot: true, tell: true, prop: 'lantern',
  },
  {
    id: 'bird_facing_inland', cost: 1, tags: ['animal'], family: 'fauna_wrong',
    escalatesTo: 'deer_will_not_flee', placement: { regions: null, minPhase: 1, surface: 'offroad' },
    cooldown: 2, oneShot: false, tell: false, prop: 'eyes',
  },
  {
    id: 'deer_will_not_flee', cost: 2, tags: ['animal'], family: 'fauna_wrong',
    escalatesTo: null, placement: { regions: null, minPhase: 4, surface: 'offroad' },
    cooldown: 3, oneShot: false, tell: true, prop: 'eyes',
  },
]);

const BY_ID = new Map();
for (let i = 0; i < EVENT_POOL.length; i++) BY_ID.set(EVENT_POOL[i].id, EVENT_POOL[i]);

// Law 1, enforced at load rather than trusted: no row may ask for a figure.
for (let i = 0; i < EVENT_POOL.length; i++) {
  const p = EVENT_POOL[i].prop;
  if (p && FIGURE_PROPS[p]) {
    throw new Error("auditor: event '" + EVENT_POOL[i].id + "' asks for a body prop. It never spawns a body.");
  }
}

/**
 * `dread` is the scheduler that owns the prop kit and the placement solver. The Auditor
 * decides WHAT and WHEN; dread decides WHERE it is allowed to be and refuses if it is not.
 */
export function createAuditor(ctx, dread) {
  let claimed = 0;            // destinations claimed. THE phase (DESIGN decision 11).
  let debt = 0;
  let cycle = 0;
  let placedThisCycle = 0;
  let claimsThisCycle = 0;
  let witnessXpThisCycle = 0;
  let spentThisCycle = 0;
  let rollT = A.rollEvery;
  let clock = 0;
  // THE CYCLE. It is the clock lane's to declare, through `phase:changed`. But this lane may
  // not be dead because another lane is unbuilt: everything here is measured in cycles — the
  // per-cycle cap, the per-region exclusivity, every event cooldown, the XP cap — so with no
  // clock at all the Auditor would place two events and then never again, for ever, and it
  // would look exactly like a system that works. Until a real phase:changed arrives, the
  // cycle turns on CFG.clock's own length.
  let cycleClock = 0;
  let sawPhaseEvent = false;

  // Per-event bookkeeping. cooldown is measured in CYCLES, as OFF-SEASON measures it in days.
  const lastCycleOf = Object.create(null);   // id -> cycle it last fired in
  const firedOnce = Object.create(null);     // id -> true, for oneShot
  const familyHead = Object.create(null);    // family -> the id that should spawn next
  const witnessed = Object.create(null);     // id -> true
  const regionsThisCycle = Object.create(null);

  // Live events. Fixed-size, reused records; the hot path allocates nothing.
  const actives = new Array(A.activeMax);
  for (let i = 0; i < A.activeMax; i++) {
    actives[i] = {
      on: false, id: '', family: '', prop: null, x: 0, y: 0, z: 0,
      look: 0, age: 0, armed: 0, live: false, witnessedFlag: false, handle: null,
    };
  }

  const stats = {
    considered: 0, placed: 0, refusedByBudget: 0, refusedByCooldown: 0,
    refusedByRegion: 0, refusedByPlacement: 0, refusedByPhase: 0,
    tells: 0, witnessed: 0, lapsed: 0, cycles: 0,
  };

  function phase() { return claimed < A.maxPhase ? claimed : A.maxPhase; }

  /** W = base[phase] + debt * DEBT_MULT. donors/offseason/README.md:205. */
  function budget() { return A.base[phase()] + debt * A.debtMult; }

  function perCycleCap() { return A.perCycleBase + Math.floor(phase() / A.perCyclePhaseDiv); }

  /**
   * The per-region stream. Same seed and the same sequence of claims give the same haunting
   * — which is the property a Playwright replay asserts (README.md:209). Rng.fork caches by
   * name on the root, so this is one stream per region for the life of the run rather than a
   * fresh one per call.
   */
  function rngFor(region) { return ctx.rng.fork('auditor:' + region); }

  /* ------------------------------------------------------------- the bus -- */

  function onClaimed() {
    claimed++;
    claimsThisCycle++;
  }

  function onDied() { debt += A.debtOnDeath; }

  /**
   * THE VOCABULARY IS EXACTLY 'dusk' | 'night' | 'black' | 'dawn' (CONTRACT, integrator
   * decision 1). A cycle turns when the night starts again, so the only name this cares about
   * is 'dusk' — one spelling, no capitalised alias. The old `|| 'Dusk'` was insurance against
   * a lane that spells it differently, and insurance like that is how two vocabularies live
   * side by side until one of them silently stops matching.
   */
  function onPhaseChanged(p) {
    const name = p && (p.phase !== undefined ? p.phase : p);
    if (typeof name === 'string') sawPhaseEvent = true;
    if (name !== 'dusk') return;
    // The boot announcement carries prev:null so every listener learns the phase it woke in.
    // It is not a night survived. Counting it opened the game one cycle deep and owing a
    // barren-cycle debt for a night that had not happened yet.
    if (p && typeof p === 'object' && !p.prev) return;
    turnCycle();
  }

  function turnCycle() {
    cycleClock = 0;
    // A cycle turned over. OFF-SEASON's debt accrues from the things you did not do; the
    // county's version of "a chore missed" is a whole night in which you took nothing back.
    if (claimsThisCycle === 0) debt += A.debtOnBarrenCycle;
    cycle++;
    stats.cycles++;
    placedThisCycle = 0;
    claimsThisCycle = 0;
    witnessXpThisCycle = 0;
    spentThisCycle = 0;
    for (const k in regionsThisCycle) delete regionsThisCycle[k];
  }

  let unsub = null;
  function init() {
    if (!ctx.bus) return;
    const offs = [];
    offs.push(ctx.bus.on('place:claimed', onClaimed));
    offs.push(ctx.bus.on('player:died', onDied));
    offs.push(ctx.bus.on('phase:changed', onPhaseChanged));
    unsub = () => { for (let i = 0; i < offs.length; i++) { if (typeof offs[i] === 'function') offs[i](); } };
  }

  /* --------------------------------------------------------- the choosing -- */

  function eligible(row, region) {
    if (!row) return false;
    if (row.placement.minPhase > phase()) { stats.refusedByPhase++; return false; }
    if (row.oneShot && firedOnce[row.id]) return false;
    const last = lastCycleOf[row.id];
    if (last !== undefined && cycle - last < row.cooldown) { stats.refusedByCooldown++; return false; }
    const regs = row.placement.regions;
    if (regs && regs.indexOf(region) < 0) return false;
    return true;
  }

  /**
   * The family head. THE WITNESSING RULE: an event the camera lingered on has ADVANCED its
   * chain, so the next spawn of that family is its `escalatesTo`. Looking is how it learns
   * you (donors/offseason/README.md:207).
   */
  function headOf(family, fallbackId) {
    const h = familyHead[family];
    return h === undefined ? fallbackId : h;
  }

  function pickRow(region) {
    const rng = rngFor(region);
    // Two passes over a frozen array, no allocation: count the eligible, then take the nth.
    let n = 0;
    for (let i = 0; i < EVENT_POOL.length; i++) {
      const base = EVENT_POOL[i];
      // Only consider a family through its head, so a chain never spawns out of order.
      if (headOf(base.family, base.id) !== base.id) continue;
      const row = BY_ID.get(headOf(base.family, base.id));
      if (!eligible(row, region)) continue;
      if (row.cost > budget() - spentThisCycle) { stats.refusedByBudget++; continue; }
      n++;
    }
    if (n === 0) return null;
    let want = Math.floor(rng.next() * n);
    for (let i = 0; i < EVENT_POOL.length; i++) {
      const base = EVENT_POOL[i];
      if (headOf(base.family, base.id) !== base.id) continue;
      const row = BY_ID.get(headOf(base.family, base.id));
      if (!eligible(row, region)) continue;
      if (row.cost > budget() - spentThisCycle) continue;
      if (want-- === 0) return row;
    }
    return null;
  }

  function freeSlot() {
    for (let i = 0; i < A.activeMax; i++) if (!actives[i].on) return actives[i];
    return null;
  }

  /* ----------------------------------------------------------- the placing -- */

  function tryPlace() {
    stats.considered++;
    if (placedThisCycle >= perCycleCap()) return false;
    const slot = freeSlot();
    if (!slot) return false;

    const region = dread.regionKey();
    // README.md:206 — never two in the same district in one cycle before phase 7.
    if (phase() < A.regionExclusiveBelowPhase && regionsThisCycle[region]) {
      stats.refusedByRegion++;
      return false;
    }

    const row = pickRow(region);
    if (!row) return false;

    // WHERE is dread's answer, not the Auditor's, and it REFUSES rather than clips.
    const spot = dread.solvePlacement(row.placement.surface, A.placeRadiusMin, A.placeRadiusMax, rngFor(region));
    if (!spot) { stats.refusedByPlacement++; return false; }

    slot.on = true;
    slot.id = row.id;
    slot.family = row.family;
    slot.prop = row.prop;
    slot.x = spot.x; slot.y = spot.y; slot.z = spot.z;
    slot.look = 0; slot.age = 0; slot.witnessedFlag = false; slot.handle = null;
    // ANIMALS KNOW FIRST. The tell fires now; the event itself arrives 10-40 s later, which
    // is the whole trick: the player has time to decide the woods went wrong before anything
    // has actually gone wrong (donors/offseason/README.md:208).
    if (row.tell) {
      const rng = rngFor(region);
      slot.armed = A.tellMin + rng.next() * (A.tellMax - A.tellMin);
      slot.live = false;
      dread.tell(spot.x, spot.y, spot.z);
      stats.tells++;
    } else {
      slot.armed = 0;
      slot.live = false;   // activated on the next step, so a tell-less event still goes
    }                      // through exactly one code path

    lastCycleOf[row.id] = cycle;
    if (row.oneShot) firedOnce[row.id] = true;
    placedThisCycle++;
    spentThisCycle += row.cost;
    regionsThisCycle[region] = true;
    stats.placed++;
    return true;
  }

  function activate(slot) {
    slot.live = true;
    // The commission. dread owns every mesh and every borrowed light; if it cannot make this
    // one real right now it says so, and the event is audible only rather than absent.
    if (slot.prop) slot.handle = dread.commission(slot.prop, slot.x, slot.y, slot.z, slot.id);

    // IT ANSWERS THROUGH dread.answer, and for two reasons. First, the payload: `dread:beat`
    // is `{kind, x, y, z, gain}` on EVERY path in this lane, and this emitter used to send a
    // `family` and no `gain` — a shape the audio lane cannot bake against. Second, the sound:
    // 'auditor:wet_prints_road' is a name nobody has ever baked, so this event used to be
    // silent, and silence reads as broken.
    if (slot.prop) {
      const name = PROP_SOUND[slot.prop];
      if (name) dread.answer(name, slot.x, slot.y, slot.z, 0.5);
    } else {
      // The subtraction family. The cut IS the event: the bed drops out where the player is
      // standing, and 'withdraw' is the audible edge of the cut being made.
      if (typeof dread.hush === 'function') dread.hush(SUBTRACTION_HUSH_S);
      dread.answer(SUBTRACTION_SOUND, slot.x, slot.y, slot.z, 0.45);
    }
  }

  function clearSlot(slot) {
    if (slot.handle && typeof dread.decommission === 'function') dread.decommission(slot.handle);
    slot.on = false; slot.live = false; slot.handle = null; slot.prop = null;
  }

  /* -------------------------------------------------------- the witnessing -- */

  function witness(slot) {
    slot.witnessedFlag = true;
    witnessed[slot.id] = true;
    stats.witnessed++;

    // THE CHAIN ADVANCES. Next time this family spawns it spawns the next rung.
    const row = BY_ID.get(slot.id);
    if (row && row.escalatesTo) familyHead[row.family] = row.escalatesTo;

    // Looking pays, and it is capped per cycle so it can never be farmed (DESIGN section 5;
    // NINEFOLD's cheap events fired 60-77 times a run).
    const room = A.witnessXpCapPerCycle - witnessXpThisCycle;
    const pay = room > A.witnessXp ? A.witnessXp : room;
    if (pay > 0 && ctx.bus) {
      witnessXpThisCycle += pay;
      ctx.bus.emit('xp:gained', { amount: pay, x: slot.x, y: slot.y, z: slot.z, reason: 'witness' });
    }
    // It answers. Silence reads as broken, and being caught looking must be a sound.
    // 'witnessed' is on dread.js's BEAT_SOUNDS list; the gain is explicit so the payload
    // carries a number on this path too.
    dread.answer('witnessed', slot.x, slot.y, slot.z, 0.6);
  }

  /* ---------------------------------------------------------------- step --- */

  function step(dt) {
    const d = dt > 0 ? dt : 0;
    clock += d;
    cycleClock += d;
    if (!sawPhaseEvent && cycleClock >= CYCLE_S) turnCycle();

    for (let i = 0; i < A.activeMax; i++) {
      const s = actives[i];
      if (!s.on) continue;
      if (!s.live) {
        s.armed -= d;
        if (s.armed <= 0) activate(s);
        continue;
      }
      s.age += d;

      if (!s.witnessedFlag) {
        // The look accumulator. It only counts UP while the camera holds on it; a glance
        // that passes over does not witness anything, which is what makes 1.5 s a decision.
        if (dread.watching(s.x, s.y, s.z, A.witnessCone, A.witnessRange)) {
          s.look += d;
          if (s.look >= A.witnessSeconds) witness(s);
        } else {
          s.look = 0;
        }
      }

      if (s.age > A.eventLife) { stats.lapsed++; clearSlot(s); }
    }

    rollT -= d;
    if (rollT > 0) return;
    rollT = A.rollEvery;
    // The Auditor is subject to the same permit as every other beat: never on top of a
    // hunting body, never inside a build, never in the 3.2 s after a stinger.
    if (!dread.permitOk()) return;
    tryPlace();
  }

  function reset() {
    claimed = 0; debt = 0; cycle = 0; clock = 0; cycleClock = 0; sawPhaseEvent = false;
    placedThisCycle = 0; claimsThisCycle = 0; witnessXpThisCycle = 0; spentThisCycle = 0;
    rollT = A.rollEvery;
    for (let i = 0; i < A.activeMax; i++) clearSlot(actives[i]);
    for (const k in lastCycleOf) delete lastCycleOf[k];
    for (const k in firedOnce) delete firedOnce[k];
    for (const k in familyHead) delete familyHead[k];
    for (const k in witnessed) delete witnessed[k];
    for (const k in regionsThisCycle) delete regionsThisCycle[k];
    for (const k in stats) stats[k] = 0;
  }

  function dispose() { if (unsub) unsub(); unsub = null; }

  function snapshot() {
    let live = 0;
    const ids = [];
    for (let i = 0; i < A.activeMax; i++) {
      if (!actives[i].on) continue;
      live++;
      ids.push(actives[i].id + (actives[i].live ? '' : '(armed)'));
    }
    const chains = {};
    for (const k in familyHead) chains[k] = familyHead[k];
    return {
      phase: phase(), claimed, debt, cycle, budget: budget(), cycleClock, cycleS: CYCLE_S, clockDriven: sawPhaseEvent,
      spentThisCycle, placedThisCycle, cap: perCycleCap(),
      live, ids, chains, witnessXpThisCycle,
      witnessed: Object.keys(witnessed),
      stats: Object.assign({}, stats),
    };
  }

  return {
    init, step, reset, dispose, snapshot,
    // Doors for tests and for the progression lane, which owns claims but not this clock.
    noteClaim: onClaimed,
    noteDeath: onDied,
    noteCycle: () => onPhaseChanged('dusk'),
    EVENT_POOL, AUDITOR_TABLE: A,
    get phase() { return phase(); },
    get budget() { return budget(); },
    get debt() { return debt; },
    get actives() { return actives; },
    get stats() { return stats; },
  };
}

export default createAuditor;
