// CURFEW — progression. Manifest #20, id 'progress'. Owner: progression.
//
// THE REASON TO KEEP PLAYING, and the whole of it is delivery. A kill that adds a number to a
// variable is not a reward; a kill that throws a bright thing out of the wound, which flies at
// you, which you HEAR arrive, is. Everything in this file exists to make the moment of getting
// paid a physical event in the world rather than a bookkeeping entry behind the frame.
//
// NO NUMBER EVER APPEARS ON SCREEN. Not here, not in ui/hud.js. Alex's standing UI law is
// "delete words from game UI; show state through in-world visuals so the player feels it
// rather than reads it." So the entire readout of this system is: the mote, its light, its
// chime, the streak's rising pitch, the light you carry when you have not banked, and the
// column where you died. tests/progression.mjs walks the DOM and fails on a single visible
// glyph.
//
// FOUR THINGS THIS FILE OWNS
//   1. XP: kills (delivered by mote), places, and road first travelled — times the hour.
//   2. The tree: 24 nodes. THE HOOK REGISTRY IS THE CONTRACT — every node installs its own
//      effect (nodes.js, second law); only five frame-sampled values survive as `stats` keys,
//      and `report()` names any key nothing reads and any hook point nothing runs. The second
//      audit found 22 of the 24 nodes doing nothing at all, silently, and this is the shape
//      that makes that a number rather than a discovery.
//   3. The bank: unbanked XP is a light on you, it banks somewhere lit, and dying drops it
//      as a column you can walk back into.
//   4. The save.
//
// donor: skyshard qualiacology/skyshard/src/fx/motes.js:192-207 (spawn: scatter velocity and
//   a per-mote phase) and :226-284 (the flight: a delay, then a pull that grows with age, an
//   orbit weave around the home vector, a per-frame drag of pow(0.92, dt*60), collection at
//   1.0 m, and the streak — `(now - this.lastCollect < 0.9) ? this.streak + 1 : 0` with
//   `pitch: 1 + Math.min(this.streak, 8) * 0.09`, which is the chime this brief specifies to
//   the digit).
// donor: cinderbloom src/game/combat.js:1093-1105 and :1171-1205 (`_kill`) — the kill fills
//   ONE reused `_killInfo` and emits it, and the corpse leaves ALONG the round with the
//   impulse clamped. The mote here is ejected the same way, on the same latched shot
//   direction, for the same reason: a reward that flies out of the wound in a random
//   direction does not read as having come out of the thing you shot.
// donor: palehollow src/progress.js:66-89 — recompute() from scratch on every purchase,
//   canBuy() = not owned + affordable + prereq, buy() = spend, add, recompute.
// donor: qualiacology/rocket-shoes/src/systems/items.js:7-31 — the hook registry (a node is
//   an installer; systems call hooks and never branch on ids).
// donor: qualiacology/rocket-shoes/src/systems/draft.js:41-49 (`autoGrant`) — "deal the usual
//   3 cards, take one, grant it. No menu, no pause — pure flow." That is the reduction this
//   build ships in place of the paper-map draft; see docs/HANDOFF.md P-3.

import { CFG } from '../config.js';
import { clamp, clamp01, lerp, TAU } from '../engine/math.js';
import {
  BRANCHES, NODES, NODE_BY_ID, FIRST_NODE_BY_VERB, baseStats, prereqOf,
  HOOK_POINTS, HOOK_BY_NAME, STAT_CONTRACT, STAT_KEYS,
  XP_BY_SPECIES, XP_DEFAULT_KILL, XP_HEADSHOT_MUL, XP_MELEE_MUL, XP_PLACE,
  XP_ROAD_PER_100M, ROAD_BUCKET_M, PHASE_MUL,
  STREAK_WINDOW_S, STREAK_PITCH_STEP, STREAK_MAX,
  levelFor, levelFrac, xpForLevel, draftPool, draftWeight,
} from './nodes.js';
import { SaveBlob } from './save.js';

/* ---------------------------------------------------------------- constants -- */
// None of these have a home in CFG yet. config.js is the engine owner's file and is deep
// frozen, so every one is a named local with its reason beside it and a request is filed in
// docs/HANDOFF.md P-4 for a `CFG.progress` block. Nothing below is a magic number twice.

const SAVE_KEY = 'curfew.progress';
const SAVE_VERSION = 1;

const MAX_MOTES = 24;           // a shotgun into a pack is the worst case; 24 is generous
const MOTE_FREE_S = 0.28;       // DESIGN section 6: free flight before the homing starts
const MOTE_LIFE_S = 2.60;       // DESIGN section 6: then up to 2.6 s of homing
const MOTE_SPEED_LO = 13;       // m/s at the start of the homing
const MOTE_SPEED_HI = 21;       // m/s by the end of it
const MOTE_SPEED_RAMP_S = 1.20; // seconds of homing to reach MOTE_SPEED_HI
const MOTE_EJECT = 5.4;         // m/s out of the wound, along the round
const MOTE_LIFT = 2.6;          // m/s up, so it clears the body it came out of
const MOTE_GRAV = 7.0;          // only during the free flight
const MOTE_TURN = 11;           // how hard the velocity is damped onto the homing vector
const MOTE_WEAVE = 5.5;         // skyshard's orbit: it arrives on a curve, not a straight line
const MOTE_CATCH_M = 1.05;      // skyshard motes.js:270 collects at 1.0
const MOTE_TRAIL_STEPS = 3;     // one particle every third fixed step: 20/s per mote
const MOTE_COLOUR = 0xf0d49a;   // warm bone. The one colour in the game that means "yours".

// The rover pool is 8 physical lights shared with the muzzle flash, impacts and the car.
// A pack of eight motes must never be able to starve a gunshot of its light, so only the
// three oldest live motes carry one; the rest are particles, which are free.
const MOTE_LIT_MAX = 3;
// DESIGN section 6 asks for i 0.34 at r 2.6. On THIS pool that number is invisible:
// combat.js:379 borrows 9 for an impact spark and fx.flash borrows 6-12, against
// CFG.lights.rovers.decay 1.8 and a 46 m fade in lights.present(). 3.2 sits a third of the
// way to a spark — findable in the dark at 30 m, never a flare. Filed in HANDOFF P-4.
const MOTE_LIGHT_I = 3.2;

// The carried light: everything earned since the last lit fire, in THREE steps (DESIGN
// section 6). The thresholds are the kill economy read back — one hound is nothing, a good
// fight is step two, a whole cycle out is step three.
const CARRY_STEPS = [60, 240, 700];
const CARRY_I = [2.2, 5.0, 9.5];
const CARRY_COLOUR = 0xf0d49a;
const CARRY_LAMBDA = 3.2;       // the step change eases in; a light that pops reads as a bug

// ctx.shared.lit is OWNED BY gfx/lights.js and published every frame, 0..1 (CONTRACT,
// integrator decision 2). This file READS it and keeps no fallback of its own: while nobody
// published it the whole carried-light-to-banked-XP loop was dead except via place:claimed.
// 0.60 is "standing in a light", not "carrying one" — director/tension.js reckons a lone
// torch at 0.45, and a torch must not bank you in the middle of a field.
const BANK_LIT = 0.60;          // ctx.shared.lit at or above this IS a lit threshold
const BANK_LIT_HOLD_S = 0.45;   // ...held this long, so walking past a lamp is not a bank
const BANK_COOL_S = 6.0;        // one lit place is one bank, not sixty
const BANK_CYCLE_BONUS = 1.25;  // a whole cycle out before banking (DESIGN section 6)

const CORPSE_RADIUS_M = 3.0;    // walk back INTO it
const CORPSE_ARM_M = 8.0;       // ...but only after you have LEFT it (see _onDeath)
const CORPSE_COLUMN_M = 40;     // DESIGN section 6; here it is embers, not a shader beacon
const CORPSE_LIGHT_I = 7.0;
const CORPSE_EMBER_HZ = 16;     // particles per second while the player is inside DRAW_M
const CORPSE_DRAW_M = 140;      // beyond this the column costs nothing at all

const ROAD_CHECK_STEPS = 6;     // 0.1 s. At 23 m/s that is 2.3 m against a 100 m bucket.

// An `xp:gained` from another lane carrying one of these reasons has ALREADY been paid here,
// from its own domain event. places.js:972 emits 'discover' and 'claim'; if a lane ever adds
// another double-paying reason, it goes in this set rather than into a special case.
const REDUNDANT_REASONS = new Set(['discover', 'discovery', 'claim', 'place', 'find']);

const CHIME_BASE_HZ = 880;      // the mote chime's fundamental
const BANK_BELL_HZ = 196;       // one bell, low, once (DESIGN's arrival beat)

/* ------------------------------------------------------------ hook registry -- */
/**
 * donor: qualiacology/rocket-shoes/src/systems/items.js:7-31.
 * "Systems call hooks; no system switches on item ids."
 * Fixed arity rather than rest args, because `run(name, ...args)` allocates an array on every
 * call and this runs on every kill.
 *
 * THE REGISTRY IS THE CONTRACT NOW (nodes.js, second law), so it does two things the first
 * version did not:
 *
 *   1. IT REFUSES AN UNDECLARED NAME. `hooks.on('onKil', ...)` used to be a node that silently
 *      never fired. It is now a console.error at install and a row in hookReport() with zero
 *      installers, which a gate can see.
 *   2. IT COUNTS RUNS, FOR THE LIFETIME OF THE SYSTEM, ACROSS clear(). `_recompute()` wipes and
 *      re-installs the whole tree on every purchase, so a per-registry counter would reset to
 *      zero every time a node was bought. The counters live outside the registry precisely so
 *      "this hook point has installers and has NEVER been called" survives a respec — that
 *      sentence is the entire audit finding, made into a number.
 */
function makeHooks() {
  const registry = new Map();
  const runs = new Map();       // name -> lifetime call count, NEVER cleared
  const unknown = new Map();    // name -> how many installs were refused
  return {
    on(name, ownerId, fn) {
      if (!HOOK_BY_NAME[name]) {
        unknown.set(name, (unknown.get(name) || 0) + 1);
        console.error('[progress] node ' + ownerId + ' installed on undeclared hook "' + name
          + '". Add it to HOOK_POINTS in nodes.js or fix the spelling.');
        return;
      }
      let a = registry.get(name);
      if (!a) { a = []; registry.set(name, a); }
      a.push({ ownerId, fn });
    },
    run(name, a, b, c) {
      runs.set(name, (runs.get(name) || 0) + 1);
      const list = registry.get(name);
      if (!list) return;
      for (let i = 0; i < list.length; i++) list[i].fn(a, b, c);
    },
    reduce(name, value, a, b) {
      runs.set(name, (runs.get(name) || 0) + 1);
      const list = registry.get(name);
      if (!list) return value;
      let v = value;
      for (let i = 0; i < list.length; i++) v = list[i].fn(v, a, b);
      return v;
    },
    count(name) { return (registry.get(name) || []).length; },
    runsOf(name) { return runs.get(name) || 0; },
    owners(name) {
      const list = registry.get(name);
      if (!list) return [];
      const out = [];
      for (let i = 0; i < list.length; i++) out.push(list[i].ownerId);
      return out;
    },
    unknownNames() { return Array.from(unknown.keys()); },
    /** Installers only. Run counts are lifetime and deliberately survive this. */
    clear() { registry.clear(); },
  };
}

/**
 * The stats bag, with every read counted.
 *
 * A key nothing reads is the exact defect this round exists to repair, and the only honest way
 * to know is to watch the reads happen. The trap does not allocate and does not branch on
 * anything but a Map lookup, so a lane may sample `stats.tacSprintTime` every step at no cost
 * worth measuring. Installers are handed the RAW object, never this, so writing a stat is not
 * mistaken for reading one.
 */
function makeStatsProxy(raw, reads) {
  if (typeof Proxy !== 'function') return raw;    // no Proxy: no report, but the game plays
  return new Proxy(raw, {
    get(t, k) {
      if (typeof k === 'string' && k in t) reads.set(k, (reads.get(k) || 0) + 1);
      return t[k];
    },
  });
}

/* ------------------------------------------------------------------- system -- */

export class Progress {
  static id = 'progress';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('progress');

    this.save = new SaveBlob(SAVE_KEY, SAVE_VERSION, () => ({
      v: SAVE_VERSION,
      xp: 0,            // BANKED lifetime XP
      unbanked: 0,      // carried since the last lit fire; at risk, and only this is
      level: 1,
      nodes: [],        // owned node ids (bought AND auto-granted)
      auto: [],         // the subset that was auto-granted, so it never costs a point
      found: [],        // place ids discovered
      claimed: [],      // place ids claimed
      roadLit: [],      // 100 m road buckets already paid for
      worldFlags: {},   // free-form; other lanes may write through flag()
      corpse: { live: 0, x: 0, y: 0, z: 0, xp: 0 },
      cyclesOut: 0,     // full cycles survived since the last bank
      cycleCount: 0,
      witnessed: 0,
      lastHub: '',
    }));
    // The blob is assembled ONCE, inside the write, instead of five Array.from() calls on
    // every step of the debounce window (roadLit alone can be hundreds of entries).
    this.save.beforeFlush = () => this._syncBlob();

    this._owned = new Set();
    this._auto = new Set();
    this.found = new Set();
    this.claimed = new Set();
    this.roadLit = new Set();

    this.hooks = makeHooks();
    // ONE raw object for the life of the system, refilled in place by _recompute(). Nothing
    // that has captured `stats` can ever be looking at a stale bag, and the read counters
    // survive every purchase and every respec.
    this._statsRaw = baseStats();
    this._statReads = new Map();
    this.stats = makeStatsProxy(this._statsRaw, this._statReads);

    this.level = 1;
    this.points = 0;
    this.spent = 0;

    // --- the mote pool. Preallocated, never grown, never allocated from. ---------
    this.motes = new Array(MAX_MOTES);
    for (let i = 0; i < MAX_MOTES; i++) {
      this.motes[i] = {
        live: false, t: 0, xp: 0, phase: 0,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        px: 0, py: 0, pz: 0,          // previous, for present(alpha)
        trail: 0, light: null,
      };
    }
    this.moteCursor = 0;
    this.lit = 0;                      // how many motes currently hold a rover

    this.streak = 0;
    this.sinceCredit = 99;

    // --- the shot direction a mote is thrown along ------------------------------
    this.shotX = 0; this.shotY = 0; this.shotZ = -1;

    // --- carried light ----------------------------------------------------------
    this.carryHandle = null;
    this.carryI = 0;
    this.carryStep = -1;

    // --- corpse column ----------------------------------------------------------
    this.corpseHandle = null;
    this.corpseEmber = 0;
    this.corpseArmed = true;   // a loaded save was never standing on it

    // --- banking ----------------------------------------------------------------
    this.litT = 0;
    this.litLevel = 0;      // last ctx.shared.lit seen, for state() — NOT this.lit (motes)
    this.bankCool = 0;

    // --- death ------------------------------------------------------------------
    // No latch and no emit. player:died and player:respawn are OWNED BY
    // src/player/controller.js (integrator decision 3); this file is a pure listener. The
    // only guard left is frame-level dedupe, which clears itself.
    this._deathStep = -1;

    // --- draft ------------------------------------------------------------------
    // TRUE ships the reduction: at a lit fire a level's point deals three cards and takes
    // one, rocket-shoes autoGrant() style, because there is no paper map to ink them on yet.
    // Set false the day a draft surface exists and pendingDraft/pick() drive it.
    this.autoDraft = true;
    this.draftCards = null;

    this._audit = null;        // filled by _selfTest() at init, read by ready()
    this._majorIds = null;
    this._roadTick = 0;
    this._chimeReady = false;
    this._unsub = [];
    this._stat = {
      motesSpawned: 0, motesCredited: 0, motesExpired: 0,
      kills: 0, banks: 0, deaths: 0, recoveries: 0, levelUps: 0, autoGrants: 0,
    };
  }

  /* ------------------------------------------------------------------- init -- */

  async init() {
    this._selfTest();
    this.save.load().bind();
    const d = this.save.data;

    for (const id of d.nodes) if (NODE_BY_ID[id]) this._owned.add(id);
    for (const id of d.auto) if (NODE_BY_ID[id]) this._auto.add(id);
    for (const id of d.found) this.found.add(id);
    for (const id of d.claimed) this.claimed.add(id);
    for (const b of d.roadLit) this.roadLit.add(b | 0);

    this._recompute();
    // Derive the level from the loaded total DIRECTLY rather than through _checkLevel(),
    // which would fire a level:up on the boot frame of every returning save.
    this.level = levelFor(this.total());
    d.level = this.level;
    this._points();
    this._publish();
    this._wire();

    if (typeof window !== 'undefined') {
      const T = (window.__CURFEW = window.__CURFEW || {});
      T.progress = {
        state: () => this.state(),
        nodes: () => NODES,
        owned: () => this._ownedList(),
        buy: (id) => this.buy(id),
        canBuy: (id) => this.canBuy(id),
        draft: () => this.draft(),
        pick: (i) => this.pick(i),
        bank: () => this.bank('debug'),
        grant: (n) => this.award(n, 0, 0, 0, 'debug'),
        stats: () => this.stats,
        // The gate's surface. `report().deadHooks` and `report().unreadStats` are the two
        // lists that must be empty after a session that has exercised the tree.
        report: () => this.report(),
        hookReport: () => this.hookReport(),
        statReport: () => this.statReport(),
        perk: (name, value, a) => this.perk(name, value, a),
        wipe: () => { this.save.reset(); },
      };
    }
  }

  /**
   * BOOT GATE. Install all 24 nodes into a throwaway registry, whatever is actually owned,
   * and count what came out. It is 24 function calls, once, and it catches at boot the two
   * failures that used to be invisible until an audit: a node whose install throws, and a
   * node that installs nothing at all and therefore buys the player nothing.
   *
   * Nodes that write one of the five surviving stats are allowed to install no hook — those
   * are the frame-sampled values, and STAT_CONTRACT says who reads each one.
   */
  _selfTest() {
    const probe = makeHooks();
    const bag = baseStats();
    const inert = [];
    let installs = 0;
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const before = { hooks: 0, keys: JSON.stringify(bag) };
      for (let h = 0; h < HOOK_POINTS.length; h++) before.hooks += probe.count(HOOK_POINTS[h].name);
      try { n.install(bag, probe, 1); } catch (e) {
        console.error('[progress] node ' + n.id + ' failed to install', e);
        inert.push(n.id);
        continue;
      }
      let after = 0;
      for (let h = 0; h < HOOK_POINTS.length; h++) after += probe.count(HOOK_POINTS[h].name);
      installs += after - before.hooks;
      if (after === before.hooks && JSON.stringify(bag) === before.keys) inert.push(n.id);
    }
    const undeclared = probe.unknownNames();
    if (inert.length) {
      console.error('[progress] nodes that change nothing: ' + inert.join(', '));
    }
    if (undeclared.length) {
      console.error('[progress] undeclared hook names: ' + undeclared.join(', '));
    }
    this._audit = { inert, undeclared, hookInstalls: installs };
    return this._audit;
  }

  ready() {
    // The tree must be whole. A branch that lost its tier-0 node can never be entered and
    // the player would simply never see it — the FLARE failure, one manifest down.
    if (NODES.length !== 24) return false;
    for (const b of BRANCHES) if (!FIRST_NODE_BY_VERB[b.verb]) return false;
    // ...and every node must DO something. 22 of 24 buying nothing shipped once already.
    const a = this._audit || this._selfTest();
    if (a.inert.length || a.undeclared.length) return false;
    return !!this.save && this.stats !== null;
  }

  dispose() {
    for (const off of this._unsub) { try { off(); } catch (e) { void e; } }
    this._unsub.length = 0;
    this._releaseAll();
    this.save.dispose();
  }

  /* -------------------------------------------------------------------- bus -- */

  _wire() {
    const b = this.ctx.bus;
    const on = (k, fn) => this._unsub.push(b.on(k, (p) => {
      // A listener that throws must never take the frame down with it, but it must also not
      // be silent — the CONTRACT's bus deliberately does not swallow, so we log once.
      try { fn(p || {}); } catch (e) { console.error('[progress] ' + k, e); }
    }));

    on('weapon:fire', (p) => {
      // Latch the round's direction. The mote is thrown ALONG the shot that killed the thing
      // (cinderbloom combat.js:1186 does the same for the corpse impulse), and by the time
      // enemy:killed arrives the payload no longer carries it.
      if (Number.isFinite(p.dx)) { this.shotX = p.dx; this.shotY = p.dy; this.shotZ = p.dz; }
    });

    on('enemy:killed', (p) => this._onKill(p));

    on('place:discovered', (p) => {
      const id = p.id;
      if (id !== undefined && this.found.has(id)) return;
      if (id !== undefined) this.found.add(id);
      const base = this._placeXp(p, 'find');
      if (base > 0) this.award(base, this._placeX(p), this._placeY(p), this._placeZ(p), 'discovery');
      this.save.mark();
    });

    on('place:claimed', (p) => {
      const id = p.id;
      if (id !== undefined && this.claimed.has(id)) return;
      if (id !== undefined) this.claimed.add(id);
      const base = this._placeXp(p, 'claim');
      if (base > 0) this.award(base, this._placeX(p), this._placeY(p), this._placeZ(p), 'claim');
      // A claim is always somewhere lit. This is the arrival beat's other half.
      this.bank('claim');
      this.save.mark();
    });

    // places.js:108 emits the WHOLE place and reuses one scalar object:
    // { id, name, major, lit, hub, x, z, discovered, claimed }. Read the two booleans and
    // retain nothing. This is the second banking path, for a lit hub whose ctx.shared.lit
    // never crosses BANK_LIT — a porch lamp is a place even when it is not a floodlight.
    on('place:near', (p) => {
      this.hooks.run('onPlaceNear', this.ctx, p);
      if (p.lit === true || p.hub === true) this._tryBank('hub');
    });

    on('xp:gained', (p) => {
      // Other lanes pay on this channel without routing through award(): the Auditor's
      // witness pay (director/auditor.js:444) and places' own `_gainXp` (places.js:972).
      // Credit them — EXCEPT the ones this file has already paid from their domain event.
      // places.js:844 and :963 emit BOTH `place:discovered`/`place:claimed` AND an
      // `xp:gained` for the same arrival; crediting both would pay for every place twice.
      if (p._own) return;
      if (REDUNDANT_REASONS.has(p.reason)) return;
      const n = Number(p.amount) || 0;
      if (n > 0) this._bank_in(n);
    });

    on('level:up', (p) => { void p; });   // ours; listed so the channel is obviously live

    on('weapon:reload', (p) => { if (p.phase !== 'cancel') this._verb('reload'); });
    on('car:entered', () => this._verb('drive'));

    // The four bus channels this system already sees, now published to the registry so a node
    // can act on them without another lane learning that the node exists. Every one of these
    // is a `run`, never a `reduce`: a listener on the bus cannot change what was emitted.
    on('player:hurt', (p) => { this._verb('hurt'); this.hooks.run('onHurt', this.ctx, p); });
    on('player:land', (p) => this.hooks.run('onLand', this.ctx, p));
    on('noise', (p) => this.hooks.run('onNoise', this.ctx, p));

    on('phase:changed', (p) => {
      this.hooks.run('onPhase', this.ctx, p.phase);
      if (p.phase === 'dusk') {
        this.save.data.cycleCount++;
        this.save.data.cyclesOut++;
        this.save.mark();
      }
    });

    // LISTEN, NEVER EMIT. Both channels belong to src/player/controller.js, which also clears
    // its own dead flag. The corpse column and the XP recovery loop run off the real events.
    on('player:died', (p) => this._onDeath(p));
    on('player:respawn', () => { this.streak = 0; this.sinceCredit = 99; });
  }

  /* -------------------------------------------------------------- the money -- */

  _phaseMul() {
    const ph = this.ctx.shared && this.ctx.shared.phase;
    const m = PHASE_MUL[ph];
    return typeof m === 'number' ? m : 1;
  }

  _onKill(p) {
    this._stat.kills++;

    // The enemies lane publishes its own `xp` on the event. The species table wins where it
    // has an opinion — it is the one place the Pale's zero and the Standing Kind's 120 are
    // written down (DESIGN section 6) — and the event's number is the fallback so a species
    // this file has never heard of still pays.
    const species = p.species || (p.e && p.e.species) || '';
    const tabled = XP_BY_SPECIES[species];
    let base = tabled !== undefined ? tabled
      : (Number.isFinite(p.xp) && p.xp > 0 ? p.xp : XP_DEFAULT_KILL);
    if (base <= 0) return;                       // the Pale and the Auditor give nothing

    const zone = p.zone || (p.e && p.e.lastZone) || '';
    if (zone === 'head') base *= XP_HEADSHOT_MUL;
    if (p.melee || p.kind === 'melee') base *= XP_MELEE_MUL;

    this.hooks.run('onKill', this.ctx, p);

    // Where the wound is: the event carries the body's mid-height already (enemies.js:1092).
    const x = Number.isFinite(p.x) ? p.x : 0;
    const y = Number.isFinite(p.y) ? p.y : 1;
    const z = Number.isFinite(p.z) ? p.z : 0;
    this._spawnMote(x, y, z, Math.round(base));
  }

  /**
   * places.js emits `{ id, xp }` and nothing else — no `major` flag and no position — so the
   * majors are identified by asking the places system itself. `places.list()` (places.js:1227)
   * iterates MAJORS and only MAJORS, so membership in it IS the major/minor question. Built
   * once, lazily, because places is manifest #10 and its list is static after init.
   */
  _majorSet() {
    if (this._majorIds) return this._majorIds;
    const pl = this.ctx.systems.get('places');
    if (!pl || !pl.list) return null;               // not built yet: ask again next time
    const s = new Set();
    const rows = pl.list();
    for (let i = 0; i < rows.length; i++) s.add(rows[i].id);
    this._majorIds = s;
    return s;
  }

  /**
   * DESIGN section 6 pays 150/300 for a discovery and 300/900 for a claim. The places lane
   * carries its own much smaller `xpFind`/`xpClaim` per row (25 / 120-200) and puts them on
   * the event; an explicit ZERO is honoured, because the Filling Station starts claimed and
   * waking up must never pay. Anything else takes the design's number. See HANDOFF P-1.7.
   */
  _placeXp(p, which) {
    if (p.xp === 0) return 0;
    const set = this._majorSet();
    const major = p.major === true || p.tier === 'major' || p.kind === 'major'
      || !!(set && p.id !== undefined && set.has(p.id));
    if (which === 'find') return major ? XP_PLACE.findMajor : XP_PLACE.findMinor;
    return major ? XP_PLACE.claimMajor : XP_PLACE.claimMinor;
  }

  /**
   * Where to throw the pulse. places' payload carries no position, so fall back to the major's
   * own pad and then to the player — the XP arrives AT you either way, and an event at the
   * world origin would put the flash 2 km away in the dark.
   */
  _placeX(p) { return Number.isFinite(p.x) ? p.x : this._playerAt(0); }
  _placeY(p) { return Number.isFinite(p.y) ? p.y : this._playerAt(1) + 1.2; }
  _placeZ(p) { return Number.isFinite(p.z) ? p.z : this._playerAt(2); }
  _playerAt(i) {
    const pl = this.ctx.systems.get('player');
    if (!pl) return 0;
    return i === 0 ? pl.pos.x : i === 1 ? pl.pos.y : pl.pos.z;
  }

  /**
   * Pay. `base` is pre-multiplier; the hour is applied here so no caller has to remember it.
   * This is the ONLY place ctx.shared.xp moves and the only emitter of 'xp:gained' for
   * anything this system pays.
   */
  award(base, x, y, z, reason) {
    const amount = Math.round(Math.max(0, base) * this._phaseMul());
    if (amount <= 0) return 0;
    this._bank_in(amount);
    this.ctx.bus.emit('xp:gained', {
      amount, x: x || 0, y: y || 0, z: z || 0, reason: reason || 'kill', _own: true,
    });
    return amount;
  }

  /** Add to the carried pile and re-derive the level. Never emits; award() does that. */
  _bank_in(amount) {
    const d = this.save.data;
    d.unbanked += amount;
    this.save.mark();
    this._publish();
    this._checkLevel();
  }

  total() { const d = this.save.data; return d.xp + d.unbanked; }

  _publish() {
    const sh = this.ctx.shared;
    if (!sh) return;
    sh.xp = this.total();
    sh.level = this.level;
  }

  _checkLevel() {
    const L = levelFor(this.total());
    if (L === this.level) { this._points(); return; }
    const up = L > this.level;
    this.level = L;
    this.save.data.level = L;
    this._points();
    this._publish();
    if (up) {
      this._stat.levelUps++;
      this.ctx.bus.emit('level:up', { level: L });
    }
  }

  _points() {
    // A point per level past the first. Auto-granted nodes cost nothing, which is what makes
    // "the tree teaches itself" free rather than a tax.
    let spent = 0;
    for (const id of this._owned) {
      if (this._auto.has(id)) continue;
      const n = NODE_BY_ID[id];
      if (n) spent += n.cost;
    }
    this.spent = spent;
    this.points = Math.max(0, (this.level - 1) - spent);
  }

  /* ------------------------------------------------------------------ motes -- */

  _spawnMote(x, y, z, xp) {
    let m = null;
    for (let k = 0; k < MAX_MOTES; k++) {
      const i = (this.moteCursor + k) % MAX_MOTES;
      if (!this.motes[i].live) { m = this.motes[i]; this.moteCursor = (i + 1) % MAX_MOTES; break; }
    }
    // Pool full: pay immediately rather than drop the reward. Nothing is ever taken away.
    if (!m) { this.award(xp, x, y, z, 'kill'); return; }

    m.live = true; m.t = 0; m.xp = xp;
    m.phase = this.rng.next() * TAU;
    m.x = x; m.y = y; m.z = z;
    m.px = x; m.py = y; m.pz = z;
    m.trail = 0;

    // donor: skyshard motes.js:200-204 — scatter, then home. The scatter here is not random:
    // it is the killing round's own direction, so the mote reads as having come out of the
    // wound rather than having been spawned near it.
    const j = 0.55;
    m.vx = this.shotX * MOTE_EJECT + (this.rng.next() - 0.5) * MOTE_EJECT * j;
    m.vy = MOTE_LIFT + this.shotY * MOTE_EJECT * 0.4 + this.rng.next() * 0.8;
    m.vz = this.shotZ * MOTE_EJECT + (this.rng.next() - 0.5) * MOTE_EJECT * j;

    if (this.lit < MOTE_LIT_MAX) {
      const lights = this.ctx.systems.get('lights');
      if (lights && lights.borrow) {
        m.light = lights.borrow('mote', x, y, z, MOTE_COLOUR, MOTE_LIGHT_I, 0);
        if (m.light) this.lit++;
      }
    }
    this._stat.motesSpawned++;
  }

  _stepMotes(dt) {
    const player = this.ctx.systems.get('player');
    if (!player) return;
    const tx = player.pos.x;
    const ty = player.pos.y + 1.10;      // the chest, not the feet: skyshard motes.js:229
    const tz = player.pos.z;
    const fx = this.ctx.systems.get('fx');

    for (let i = 0; i < MAX_MOTES; i++) {
      const m = this.motes[i];
      if (!m.live) continue;
      m.px = m.x; m.py = m.y; m.pz = m.z;
      m.t += dt;

      if (m.t < MOTE_FREE_S) {
        // Free flight. Ballistic, so the eye can follow it out of the body.
        m.vy -= MOTE_GRAV * dt;
        // skyshard motes.js:264 uses 0.92 per 1/60 on a mote already clear of the body.
      // MEASURED here at 0.90: the mote travelled 0.75 m in its whole free flight and read as
      // a spark ON the corpse rather than a thing thrown out of it. 0.96 puts it 1.2 m out.
      const drag = Math.pow(0.96, dt * 60);
        m.vx *= drag; m.vy *= drag; m.vz *= drag;
      } else {
        const ht = m.t - MOTE_FREE_S;
        const speed = lerp(MOTE_SPEED_LO, MOTE_SPEED_HI, clamp01(ht / MOTE_SPEED_RAMP_S));
        let dx = tx - m.x, dy = ty - m.y, dz = tz - m.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= d; dy /= d; dz /= d;
        // The orbit weave (skyshard motes.js:249-257): it arrives on a curve. A dead-straight
        // homing line reads as a UI element flying at the camera.
        const hor = Math.sqrt(dx * dx + dz * dz) || 1;
        const ph = m.t * 12 + m.phase;
        const w = Math.cos(ph) * MOTE_WEAVE;
        const k = 1 - Math.exp(-MOTE_TURN * dt);
        m.vx += ((dx * speed + (-dz / hor) * w) - m.vx) * k;
        m.vy += ((dy * speed + Math.sin(ph) * MOTE_WEAVE * 0.42) - m.vy) * k;
        m.vz += ((dz * speed + (dx / hor) * w) - m.vz) * k;

        if (d < MOTE_CATCH_M) { this._credit(m); continue; }
      }

      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;

      // The body of the mote. fx's Points pool is additive and already in the frame, so this
      // costs no draw call and no program — which is the whole reason progress.js owns no
      // mesh of its own. The shader-program budget is CFG.render.budget.programsMax and
      // nothing here restates it: four files carried four different hard-coded numbers and
      // all four were wrong (INTEGRATOR DECISION 1). The integrator measures it and sets it.
      if (fx && fx.spawnParticle && (++m.trail % MOTE_TRAIL_STEPS) === 0) {
        const puls = 0.085 + 0.035 * Math.sin(m.t * 15 + m.phase);
        fx.spawnParticle(m.x, m.y, m.z, 0, 0, 0, 0.22, puls, 0.96, 0.83, 0.58, 0, 3.4, 0.95);
      }

      if (m.t > MOTE_FREE_S + MOTE_LIFE_S) {
        // It ran out of flight without reaching you — you drove off, or it was born inside
        // geometry. Pay it anyway, silently. Nothing in CURFEW is ever taken away.
        this._stat.motesExpired++;
        this.award(m.xp, m.x, m.y, m.z, 'kill');
        this._killMote(m);
      }
    }
  }

  _credit(m) {
    const x = m.x, y = m.y, z = m.z, xp = m.xp;
    this._killMote(m);
    this._stat.motesCredited++;

    // donor: skyshard motes.js:275 — the streak window and the chime's pitch, verbatim.
    this.streak = this.sinceCredit < STREAK_WINDOW_S ? this.streak + 1 : 0;
    this.sinceCredit = 0;

    this.award(xp, x, y, z, 'kill');

    // THE ANSWER. Silence reads as broken, so the contact makes a sound and a light on the
    // same frame it makes the credit.
    const rate = 1 + Math.min(this.streak, STREAK_MAX) * STREAK_PITCH_STEP;
    this._chime('xp_mote', x, y, z, rate, 0.55);
    const fx = this.ctx.systems.get('fx');
    if (fx && fx.flash) fx.flash(x, y, z, MOTE_COLOUR, 5.5 + this.streak * 0.35, 0.10);
  }

  _killMote(m) {
    m.live = false;
    if (m.light) {
      const lights = this.ctx.systems.get('lights');
      if (lights && lights.release) lights.release(m.light);
      m.light = null;
      this.lit = Math.max(0, this.lit - 1);
    }
  }

  /* ------------------------------------------------------- the carried light -- */

  _stepCarry(dt) {
    const d = this.save.data;
    const player = this.ctx.systems.get('player');
    if (!player) return;

    let step = -1;
    for (let i = CARRY_STEPS.length - 1; i >= 0; i--) {
      if (d.unbanked >= CARRY_STEPS[i]) { step = i; break; }
    }
    const target = step < 0 ? 0 : CARRY_I[step];
    this.carryStep = step;
    this.carryI += (target - this.carryI) * (1 - Math.exp(-CARRY_LAMBDA * dt));

    const lights = this.ctx.systems.get('lights');
    if (!lights) return;
    if (this.carryI > 0.05) {
      if (!this.carryHandle && lights.borrow) {
        this.carryHandle = lights.borrow('carry', player.pos.x, player.pos.y + 1.2,
          player.pos.z, CARRY_COLOUR, this.carryI, 0);
      }
      if (this.carryHandle) this.carryHandle.peak = this.carryI;
    } else if (this.carryHandle) {
      lights.release(this.carryHandle);
      this.carryHandle = null;
      this.carryI = 0;
    }
  }

  /**
   * Bank. Everything carried becomes permanent, the light on you goes out, and one bell
   * rings once. A whole cycle survived out here before banking pays a quarter more.
   */
  bank(reason) {
    const d = this.save.data;
    if (d.unbanked <= 0) {
      // Even an empty bank is a lit threshold: remember it, and give the draft its moment.
      this._maybeDraft();
      return 0;
    }
    let moved = d.unbanked;
    if (d.cyclesOut >= 1) moved = Math.round(moved * BANK_CYCLE_BONUS);
    d.xp += moved;
    d.unbanked = 0;
    d.cyclesOut = 0;
    this._stat.banks++;
    this.save.mark();
    this._publish();
    this._checkLevel();

    const player = this.ctx.systems.get('player');
    const x = player ? player.pos.x : 0, y = player ? player.pos.y + 1.2 : 0, z = player ? player.pos.z : 0;
    this._chime('xp_bank', x, y, z, 1, 0.7);
    const fx = this.ctx.systems.get('fx');
    if (fx && fx.flash) fx.flash(x, y, z, CARRY_COLOUR, 11, 0.45);
    void reason;
    this._maybeDraft();
    return moved;
  }

  /**
   * The ONE gate in front of bank(). Both banking paths — the lit hold and the lit-hub
   * place:near — come through here, so a hub that is both cannot pay twice and cannot deal a
   * fresh draft on every step it is in range for.
   */
  _tryBank(reason) {
    if (this.bankCool > 0) return 0;
    this.bankCool = BANK_COOL_S;
    return this.bank(reason);
  }

  _stepBanking(dt) {
    if (this.bankCool > 0) this.bankCool = Math.max(0, this.bankCool - dt);
    const sh = this.ctx.shared;
    // Read it straight. gfx/lights.js publishes ctx.shared.lit every frame; there is no
    // second opinion here and there must not be one.
    const lit = sh && typeof sh.lit === 'number' ? sh.lit : 0;
    this.litLevel = lit;
    if (lit >= BANK_LIT) {
      this.litT += dt;
      if (this.litT >= BANK_LIT_HOLD_S) { this.litT = 0; this._tryBank('lit'); }
    } else if (this.litT !== 0) {
      this.litT = 0;
    }
  }

  /* ------------------------------------------------------------------ death -- */

  _onDeath(p) {
    // Two player:died in ONE step would zero `unbanked` twice and then halve the corpse it
    // had just dropped, so the arrival is deduped by SIM STEP (main.js:292 — not `frame`,
    // which a headless __CURFEW.step() never bumps). That is not a latch: it needs no
    // respawn to clear it, and it cannot swallow a second, real death on a later step.
    const f = (this.ctx.time && this.ctx.time.step) | 0;
    if (f === this._deathStep) return;
    this._deathStep = f;
    this._stat.deaths++;

    const d = this.save.data;
    const player = this.ctx.systems.get('player');
    const x = Number.isFinite(p.x) ? p.x : (player ? player.pos.x : 0);
    const y = Number.isFinite(p.y) ? p.y : (player ? player.pos.y : 0);
    const z = Number.isFinite(p.z) ? p.z : (player ? player.pos.z : 0);

    // Any motes still in the air are yours: they land in the corpse, not in nothing.
    let flying = 0;
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = this.motes[i];
      if (!m.live) continue;
      flying += m.xp;
      this._killMote(m);
    }

    // A corpse you never went back for HALVES, and only then. DESIGN decision 21.
    const carried = d.unbanked + flying + (d.corpse.live ? Math.floor(d.corpse.xp * 0.5) : 0);
    d.unbanked = 0;
    d.corpse.live = carried > 0 ? 1 : 0;
    d.corpse.x = x; d.corpse.y = y; d.corpse.z = z; d.corpse.xp = carried;
    this.streak = 0;
    // MEASURED, not reasoned: without this the corpse is recovered on the frame it is
    // dropped, because you are standing exactly where you died and _stepCorpse runs later in
    // the same step. The column has to be LEFT before it can be walked back into. Respawning
    // at the last lit hub would also solve it, and does not exist yet.
    this.corpseArmed = false;
    this.save.mark();
    this._publish();
    this._checkLevel();
    this._releaseCarry();
    // Release the OLD corpse's rover: the handle carries a position, and reusing it would
    // leave the light where you died last time while the embers rise where you died now.
    if (this.corpseHandle) {
      const lights = this.ctx.systems.get('lights');
      if (lights) lights.release(this.corpseHandle);
      this.corpseHandle = null;
    }
  }

  _stepCorpse(dt) {
    const d = this.save.data;
    if (!d.corpse.live) {
      if (this.corpseHandle) {
        const lights = this.ctx.systems.get('lights');
        if (lights) lights.release(this.corpseHandle);
        this.corpseHandle = null;
      }
      return;
    }
    const player = this.ctx.systems.get('player');
    if (!player) return;
    const dx = player.pos.x - d.corpse.x, dz = player.pos.z - d.corpse.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Arm it once you have walked away from it. A save loaded fresh is armed already: you
    // were not standing there when it dropped, whatever the coordinates say.
    if (!this.corpseArmed && dist > CORPSE_ARM_M) this.corpseArmed = true;

    if (this.corpseArmed && !player.dead && dist < CORPSE_RADIUS_M) {
      d.corpse.live = 0;
      this._stat.recoveries++;
      this._bank_in(d.corpse.xp);
      this._chime('xp_bank', d.corpse.x, d.corpse.y + 1, d.corpse.z, 1.18, 0.6);
      const fx = this.ctx.systems.get('fx');
      if (fx && fx.flash) fx.flash(d.corpse.x, d.corpse.y + 1.4, d.corpse.z, CARRY_COLOUR, 13, 0.5);
      d.corpse.xp = 0;
      this.save.mark();
      return;
    }
    if (dist > CORPSE_DRAW_M) return;

    // The column. DESIGN wants FILAMENT's beacon shader; a new ShaderMaterial is a new
    // program against CFG.render.budget.programsMax, so this is embers rising 40 m through
    // the fx Points pool plus one borrowed rover at the base. Reduced, and honest about it.
    // No count is restated here — the integrator owns that number (DECISION 1).
    const lights = this.ctx.systems.get('lights');
    if (lights && lights.borrow && !this.corpseHandle) {
      this.corpseHandle = lights.borrow('corpse', d.corpse.x, d.corpse.y + 1.0, d.corpse.z,
        CARRY_COLOUR, CORPSE_LIGHT_I, 0);
    }
    const fx = this.ctx.systems.get('fx');
    if (!fx || !fx.spawnParticle) return;
    this.corpseEmber += dt * CORPSE_EMBER_HZ;
    while (this.corpseEmber >= 1) {
      this.corpseEmber -= 1;
      const a = this.rng.next() * TAU;
      const r = 0.35 + this.rng.next() * 0.55;
      const rise = 3.0 + this.rng.next() * 3.2;
      fx.spawnParticle(
        d.corpse.x + Math.cos(a) * r, d.corpse.y + 0.15, d.corpse.z + Math.sin(a) * r,
        0, rise, 0,
        // life = height / speed, with grav AND drag at zero, or the ember decelerates and
        // the column tops out at a third of its height. fx.step():299 integrates
        // v *= exp(-drag*dt) then v.y -= grav*dt, so both have to be 0 for a straight rise.
        // fx fades alpha as (1 - t*t), so the top of the column is already the faint end.
        CORPSE_COLUMN_M / rise, 0.10,
        0.96, 0.84, 0.60, 0, 0, 0.85,
      );
    }
  }

  _releaseCarry() {
    if (!this.carryHandle) return;
    const lights = this.ctx.systems.get('lights');
    if (lights) lights.release(this.carryHandle);
    this.carryHandle = null;
    this.carryI = 0;
  }

  _releaseAll() {
    for (let i = 0; i < MAX_MOTES; i++) if (this.motes[i].live) this._killMote(this.motes[i]);
    this._releaseCarry();
    if (this.corpseHandle) {
      const lights = this.ctx.systems.get('lights');
      if (lights) lights.release(this.corpseHandle);
      this.corpseHandle = null;
    }
  }

  /* --------------------------------------------------------------- road XP -- */

  _stepRoad() {
    if ((++this._roadTick % ROAD_CHECK_STEPS) !== 0) return;
    const player = this.ctx.systems.get('player');
    const roads = this.ctx.systems.get('roads');
    if (!player || !roads || !roads.nearestRoadInfo) return;
    const info = roads.nearestRoadInfo(player.pos.x, player.pos.z, 24);
    if (!info || !info.hit || info.dist > (info.width || CFG.roads.width)) return;
    // route + arc-length bucket. Distance-keyed, never time-keyed, which is exactly why
    // driving is FASTER XP and never FREE XP (DESIGN section 6).
    const bucket = (info.route | 0) * 100000 + Math.floor(info.arc / ROAD_BUCKET_M);
    if (this.roadLit.has(bucket)) return;
    this.roadLit.add(bucket);
    this.save.mark();
    this.award(XP_ROAD_PER_100M, player.pos.x, player.pos.y + 1, player.pos.z, 'road');
  }

  /* ---------------------------------------------------------- auto-granting -- */

  /** First use of a branch's verb grants its tier-0 node, free. The tree teaches itself. */
  _verb(name) {
    const id = FIRST_NODE_BY_VERB[name];
    if (!id || this._owned.has(id)) return;
    this._owned.add(id);
    this._auto.add(id);
    this._stat.autoGrants++;
    this._recompute();
    this._points();
    this.save.mark();
    this.ctx.bus.emit('node:bought', { id, auto: true });
    const player = this.ctx.systems.get('player');
    if (player) this._chime('xp_bank', player.pos.x, player.pos.y + 1.4, player.pos.z, 1.32, 0.5);
  }

  _stepVerbs() {
    const player = this.ctx.systems.get('player');
    if (player) {
      if (player.tacSprinting || player.sliding) this._verb('run');
      if (player.crouched) this._verb('crouch');
    }
    const lights = this.ctx.systems.get('lights');
    if (lights && lights.torchOn && lights.torchOn()) this._verb('torch');
  }

  /* ----------------------------------------------------------------- the tree -- */

  /**
   * donor: palehollow/src/progress.js:66-74 — from scratch, every time. The bag is refilled
   * IN PLACE rather than replaced, so the proxy, its read counters and any lane that captured
   * `progress.stats` all stay pointed at the live object.
   */
  _recompute() {
    this.hooks.clear();
    const raw = this._statsRaw;
    const base = baseStats();
    for (const k in base) raw[k] = base[k];
    // Tier order, so a node that reads a stat a lower tier wrote sees it written. Installers
    // get the RAW bag: an install is not a read and must not count as one.
    for (let t = 0; t < 4; t++) {
      for (let i = 0; i < NODES.length; i++) {
        const n = NODES[i];
        if (n.tier !== t || !this._owned.has(n.id)) continue;
        try { n.install(raw, this.hooks, 1); } catch (e) { console.error('[progress] node ' + n.id, e); }
      }
    }
    return this.stats;
  }

  /* --------------------------------------------------- the lane-facing surface -- */
  /**
   * THE TWO CALLS EVERY OTHER LANE MAKES. Both are safe when no node is owned, both supply
   * `ctx` so a call site is one short line, and both swallow a node's exception rather than
   * take the frame down with it — a bought perk must never be able to stop the game.
   *
   *   const r = progress.perk('noiseRadius', radius, 'step');   // reduce: value in, value out
   *   progress.fire('onHorn', x, z);                            // run: fire and forget
   *
   * `HOOK_POINTS` in nodes.js names the one legal call site for each. Anything not in that
   * table is refused loudly at install time.
   */
  perk(name, value, a) {
    try { return this.hooks.reduce(name, value, this.ctx, a); } catch (e) {
      console.error('[progress] perk ' + name, e);
      return value;
    }
  }

  fire(name, a, b) {
    try { this.hooks.run(name, this.ctx, a, b); } catch (e) {
      console.error('[progress] fire ' + name, e);
    }
  }

  nodes() { return NODES; }
  branches() { return BRANCHES; }
  /** tests/progression.mjs calls `s.owned()` — it is a METHOD, not the Set. */
  owned() { return Array.from(this._owned); }
  _ownedList() { return Array.from(this._owned); }
  ownedSet() { return this._owned; }
  auto() { return Array.from(this._auto); }

  canBuy(id) {
    const n = NODE_BY_ID[id];
    if (!n || this._owned.has(id)) return false;
    if (this.points < n.cost) return false;
    const pre = prereqOf(n);
    return !pre || this._owned.has(pre);
  }

  buy(id) {
    if (!this.canBuy(id)) return false;
    this._owned.add(id);
    this._recompute();
    this._points();
    this.save.mark();     // _syncBlob() writes the lists when the debounce fires
    this.ctx.bus.emit('node:bought', { id, auto: false });
    return true;
  }

  /**
   * Deal three. donor: rocket-shoes draft.js:22-34 — weighted, spliced so one deal never
   * shows the same card twice.
   */
  draft(n = 3) {
    const pool = draftPool(this._owned);
    const cards = [];
    for (let k = 0; k < n && pool.length; k++) {
      let total = 0;
      for (let i = 0; i < pool.length; i++) total += draftWeight(pool[i], this._owned);
      let roll = this.rng.next() * total;
      let idx = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        roll -= draftWeight(pool[i], this._owned);
        if (roll <= 0) { idx = i; break; }
      }
      cards.push(pool.splice(idx, 1)[0]);
    }
    this.draftCards = cards.length ? cards : null;
    return this.draftCards;
  }

  pick(i) {
    if (!this.draftCards || !this.draftCards[i]) return false;
    const ok = this.buy(this.draftCards[i].id);
    if (ok) this.draftCards = null;
    return ok;
  }

  /**
   * At a lit fire, spend what is spendable. THE REDUCTION: DESIGN section 6 wants the three
   * cards inked on the underside of the paper map and the player to choose one. The map does
   * not exist yet and a menu mid-play is forbidden, so this deals the three and takes one —
   * rocket-shoes draft.js:41-49's own answer to the same problem ("No menu, no pause — pure
   * flow"). Set this.autoDraft = false the day there is a surface to draw the cards on.
   */
  _maybeDraft() {
    if (!this.autoDraft) { if (this.points > 0) this.draft(3); return; }
    let guard = 0;
    while (this.points > 0 && guard++ < 8) {
      const cards = this.draft(3);
      if (!cards) return;
      let picked = false;
      for (let i = 0; i < cards.length; i++) {
        const j = (i + Math.floor(this.rng.next() * cards.length)) % cards.length;
        if (this.canBuy(cards[j].id)) { this.buy(cards[j].id); picked = true; break; }
      }
      this.draftCards = null;
      if (!picked) return;      // nothing affordable: keep the point for a deeper tier
    }
  }

  /* ------------------------------------------------------------------ audio -- */

  /**
   * There is no chime in the audio lane's bake and audio.js is not my file, so this bakes two
   * buffers through its PUBLIC reg() and plays them through playAt(). Lazy, because audio is
   * manifest #21 and does not exist when progress (#20) inits.
   */
  _chime(name, x, y, z, rate, gain) {
    const A = this.ctx.systems.get('audio');
    if (!A || !A.reg || !A.playAt) return;
    if (!this._chimeReady) {
      if (!A.actx || !A.baked) return;
      this._bakeChimes(A);
      this._chimeReady = true;
    }
    if (!A.has || !A.has(name)) return;
    const s = A.spec ? A.spec() : null;
    if (s) { s.rate = rate; s.gain = gain; s.bus = 'world'; s.priority = 2; }
    A.playAt(name, x, y, z, s);
  }

  _bakeChimes(A) {
    const sr = A.sr || 48000;
    const mk = (secs, hz, partials, decay, bite) => {
      const n = Math.max(1, Math.floor(sr * secs));
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.exp(-t * decay) * (1 - Math.exp(-t * 900));
        let v = 0;
        for (let p = 0; p < partials.length; p++) {
          v += Math.sin(TAU * hz * partials[p][0] * t) * partials[p][1];
        }
        b[i] = clamp(v * env * bite, -1, 1);
      }
      return b;
    };
    // The mote: a small struck thing, two partials and an octave sparkle, 0.30 s.
    if (!A.has('xp_mote')) {
      A.reg('xp_mote', [mk(0.30, CHIME_BASE_HZ, [[1, 0.62], [1.5, 0.26], [3.0, 0.11]], 12, 0.42)], sr);
    }
    // The bank: ONE bell, low, long. DESIGN's arrival beat rings once.
    if (!A.has('xp_bank')) {
      A.reg('xp_bank', [mk(1.60, BANK_BELL_HZ, [[1, 0.55], [2.01, 0.24], [2.98, 0.13], [5.4, 0.05]], 2.4, 0.5)], sr);
    }
  }

  /* ------------------------------------------------------------------- loop -- */

  step(dt) {
    this.sinceCredit += dt;
    if (this.sinceCredit > STREAK_WINDOW_S) this.streak = 0;

    this._stepMotes(dt);
    this._stepCarry(dt);
    this._stepBanking(dt);
    this._stepCorpse(dt);
    this._stepRoad();
    this._stepVerbs();

    // Every node that needs a frame runs here, from OUR step, so a per-frame perk needs
    // nothing at all from the lane it acts on. Zero installers is a Map miss and a return.
    this.hooks.run('onStep', this.ctx, dt);

    // The serialised lists are assembled by _syncBlob() inside save.flush(), ONCE per write.
    // Building them here rebuilt five arrays on every step of the debounce window.
    this.save.step(dt);
  }

  /**
   * CONTRACT: anything that moves visibly keeps prev/curr and consumes alpha. The mote's
   * light is the thing that moves; the interpolated pose is written into the borrowed handle
   * here. lights.present() runs at manifest #2, before ours at #20, so a handle written now
   * is read on the NEXT frame — one frame of lag on a point light at 21 m/s is 0.35 m and is
   * not observable, where writing the stepped pose instead IS (the CINDERBLOOM teleport).
   */
  present(alpha) {
    const a = clamp01(alpha);
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = this.motes[i];
      if (!m.live || !m.light) continue;
      m.light.x = m.px + (m.x - m.px) * a;
      m.light.y = m.py + (m.y - m.py) * a;
      m.light.z = m.pz + (m.z - m.pz) * a;
    }
    if (this.carryHandle) {
      const p = this.ctx.systems.get('player');
      if (p) {
        // renderPos is the controller's own interpolated pose; using it means the light on
        // your hands never swims against the camera.
        const rp = p.renderPos || p.pos;
        this.carryHandle.x = rp.x;
        this.carryHandle.y = (p.renderEyeY !== undefined ? p.renderEyeY : rp.y + CFG.player.EYE) - 0.42;
        this.carryHandle.z = rp.z;
      }
    }
  }

  /* ------------------------------------------------------------- test surface -- */

  state() {
    const d = this.save.data;
    return {
      xp: d.xp, unbanked: d.unbanked, total: this.total(),
      level: this.level, levelFrac: +levelFrac(this.total()).toFixed(3),
      nextAt: xpForLevel(this.level + 1),
      points: this.points, spent: this.spent,
      owned: this._ownedList(), auto: Array.from(this._auto),
      found: this.found.size, claimed: this.claimed.size, roadBuckets: this.roadLit.size,
      motes: this._liveMotes(), lit: this.lit, streak: this.streak,
      carryStep: this.carryStep, carryI: +this.carryI.toFixed(2),
      // The banking loop, visible: what lights published, how long it has been held, and
      // whether the gate is open. A dead ctx.shared.lit now shows up here as a flat zero
      // instead of as a feature that silently never fires.
      litLevel: +this.litLevel.toFixed(3), litT: +this.litT.toFixed(2),
      bankCool: +this.bankCool.toFixed(2), banks: this._stat.banks,
      corpse: d.corpse.live ? { x: d.corpse.x, z: d.corpse.z, xp: d.corpse.xp } : null,
      phaseMul: this._phaseMul(), cyclesOut: d.cyclesOut,
      save: { from: this.save.loadedFrom, writes: this.save.writes, dirty: this.save.dirty },
      // The tree, visible from state() rather than only from a separate call, because the
      // thing that went wrong last round was that nobody looked.
      tree: (() => {
        const r = this.report();
        return {
          hookInstalls: r.hookInstalls,
          deadHooks: r.deadHooks,
          unreadStats: r.unreadStats,
          undeclared: r.undeclared,
        };
      })(),
      counts: this._stat,
    };
  }

  _liveMotes() { let n = 0; for (let i = 0; i < MAX_MOTES; i++) if (this.motes[i].live) n++; return n; }

  /* ------------------------------------------------- the readerless-key report -- */
  /**
   * THE GATE THE SECOND AUDIT SHOULD HAVE HAD.
   *
   * The finding was that 22 of 24 nodes did nothing, and it took a human grep of all of src/
   * to notice, because a stat nobody reads and a hook nobody runs are both perfectly silent.
   * These two reports make both of them a number, so a test can assert them after a play
   * session instead of a person having to go looking once a milestone.
   *
   *   statReport()  every key in baseStats(), how many times it has been READ, and the
   *                 STAT_CONTRACT row naming the file that owes the read. `reads === 0` after
   *                 a session that exercised the verb is a dead key.
   *   hookReport()  every point in HOOK_POINTS: how many nodes installed on it, which nodes,
   *                 which lane owes the call, and how many times it has actually RUN.
   *                 `installers > 0 && runs === 0` is a bought perk that does nothing, which
   *                 is the defect itself.
   *   report()      both, plus the two lists a gate wants outright.
   *
   * Note `runs` counts CALLS, not effects: a point with zero installers still counts its
   * calls, which is how a lane can prove it wired its side before any node is bought.
   */
  statReport() {
    const out = [];
    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i];
      const c = STAT_CONTRACT[k] || null;
      out.push({
        key: k,
        value: this._statsRaw[k],
        reads: this._statReads.get(k) || 0,
        consumer: c ? c.file : null,
        site: c ? c.site : null,
        replaces: c ? c.replaces : null,
        fallback: c ? c.fallback : null,
      });
    }
    return out;
  }

  hookReport() {
    const out = [];
    for (let i = 0; i < HOOK_POINTS.length; i++) {
      const h = HOOK_POINTS[i];
      const installers = this.hooks.count(h.name);
      const runs = this.hooks.runsOf(h.name);
      out.push({
        name: h.name, kind: h.kind, runner: h.runner, at: h.at,
        installers, nodes: this.hooks.owners(h.name), runs,
        dead: installers > 0 && runs === 0,
      });
    }
    return out;
  }

  /**
   * The whole health check in one object. `deadHooks` empty and `unreadStats` empty is the
   * assertion; `undeclared` empty means no node installed onto a name nobody declared.
   */
  report() {
    const hooks = this.hookReport();
    const stats = this.statReport();
    const deadHooks = [];
    for (let i = 0; i < hooks.length; i++) if (hooks[i].dead) deadHooks.push(hooks[i].name);
    const unreadStats = [];
    for (let i = 0; i < stats.length; i++) if (stats[i].reads === 0) unreadStats.push(stats[i].key);
    let installed = 0;
    for (let i = 0; i < hooks.length; i++) installed += hooks[i].installers;
    return {
      owned: this._owned.size, nodes: NODES.length,
      hookInstalls: installed,
      hooks, stats, deadHooks, unreadStats,
      undeclared: this.hooks.unknownNames(),
    };
  }

  /**
   * The live Sets become arrays HERE and nowhere else — once, inside save.flush(), never on
   * the frames the debounce is only counting down.
   */
  _syncBlob() {
    const d = this.save.data;
    d.nodes = Array.from(this._owned);
    d.auto = Array.from(this._auto);
    d.found = Array.from(this.found);
    d.claimed = Array.from(this.claimed);
    d.roadLit = Array.from(this.roadLit);
    d.level = this.level;
  }

  /** Free-form world flags, for any lane that needs one persisted. */
  flag(key, value) {
    if (value === undefined) return this.save.data.worldFlags[key];
    this.save.data.worldFlags[key] = value;
    this.save.mark();
    return value;
  }

  config(patch) {
    const p = patch && patch.progress;
    if (!p) return;
    if (p.autoDraft !== undefined) this.autoDraft = !!p.autoDraft;
  }
}

export default Progress;
