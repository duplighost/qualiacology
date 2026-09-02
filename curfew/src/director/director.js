// director — WHEN and WHERE and HOW MANY. Manifest #17. Owner: director.
//
// It owns the PRESSURE budget and nothing else: it does not move a body, does not decide a
// telegraph, does not touch the camera, and never spawns a horror body (those are dread's,
// and the ownership rule in DESIGN §4 is binding both ways).
//
// The one sentence this file exists to keep true:
//
//     "A LOT OF ENEMIES" IS AN EVENT, NOT A RATE.
//
// ROCKET SHOES died of "too many things at once". So the baseline is calm, the headcount
// target is a target and not a floor, and the surges are AUTHORED: a storm, which arrives
// when a region's dread crosses 0.6, and the black hour, which changes the ROSTER rather
// than a multiplier. Density goes up; the screen never gets packed.
//
// THE LAWS, and the file:line I actually read for each:
//
//   * >= 14 m, outside the 90 deg view cone, >= 600 ms between spawn events, blocked orders
//     DEFER — a jammed county runs late, never short.
//     VIGIL's "and are never dropped" is BOUNDED here, and the bound is not a softening of
//     the law, it is the law surviving contact with an order that can never be filled:
//     _stepBudget will not roll a second composition while one is in flight, so ONE
//     unfillable order is a permanent famine, not a late arrival. So an order re-species at
//     3 failed tries, drops at 8, and a watchdog clears the whole queue if orders are
//     outstanding with nothing spawned for 30 s. See _failOrder / _stepWatchdog.
//     donor: vigil-handoff/vigil-enhanced/src/director/director.js:10-13 (the law, stated),
//       :23 (MIN_SPAWN_DIST 14, VIEW_CONE PI/4, SPAWN_GAP 0.6), :692-699 (outsideViewCone),
//       :704-756 (trySpawn: cap, gap, laws, then defer on a jammed pool).
//     VIGIL's own header at :643-646 records the bug this file must not repeat: it measured
//     the cone with atan2(dz,dx) at one site and atan2(x,z) at the other, "which silently
//     rotates the whole view-cone law into nonsense". CURFEW does not use a bearing for the
//     law at all — the cone test is a DOT PRODUCT against the camera's real forward
//     (_coneDot below), which has no convention to get wrong. Bearings survive only as the
//     placement SECTOR, and they are derived from that same forward vector.
//
//   * Placement: sqrt-annulus 26-56 m, reject water / steep slope / the road surface /
//     destination flats, require a line-of-sight corridor, PREFER COVER, and REFUSE rather
//     than clip.
//     donor: cinderbloom/src/game/director.js:584-742 (spawnPoint: two passes, 40 cheap
//       terrain candidates then <=8 raycasts on the survivors), :640-642 ("sqrt for a
//       uniform annulus sample, not linear"), :651-657 (water margin, max slope),
//       :700-716 (cover = solids within 7 m; needLOS is hard, cover scores UP),
//       :134-151 (RULES: minSpawnDist 14, viewConeDeg 90, minSpawnGapMs 600,
//       frustumPerSec 2, maxSlope 0.46, waterMargin 0.55).
//     Alex's law — they rush from covered hidden places — is the `coverPref` term. The LOS
//     corridor is NOT in tension with it: CINDERBLOOM found (:713-716) that scoring
//     occlusion up without a hard corridor gate produced legal spawns that were
//     unreachable, "legal spawns became permanent survivors". So: a corridor is required, a
//     trunk to step out from behind is rewarded.
//
//   * HUNT past 80 m at +72%.
//     donor: qualiacology/rocket-shoes/src/config.js:102-104 (HUNT.FAR/FULL/STEER,
//       SPEED_BONUS 1.72) and src/systems/enemies.js:195-204 (the blend, and the note that
//       the bonus is applied EXACTLY ONCE). Here the director only raises the flag; the
//       enemies lane owns the steering, so the bonus cannot be applied twice by accident.
//
//   * The noise economy. A permanent kill is never free.
//     donor: fetch/src/director.js:1279-1315 (forestNoise: bounded debt, wakeAll on the
//       WORLD POINT that made the sound rather than on the player's live coordinate, a
//       strict active cap on invited company, and genuine forgiveness once the debt drains)
//       and :1317-1325 (onPop feeds it).
//
//   * The budget composition.
//     donor: qualiacology/rocket-shoes/src/systems/director.js:38-65 (buildPool /
//       rollComposition: weighted pool, cost drawn down from a budget, hard cap, guard).
//
// THE PERMIT is the law shared with the dread lane, and it runs both ways:
//   permitOk()          — what DREAD asks us: may a beat happen right now?
//   dread.pressureOk()  — what we ask dread: may a body arrive right now?
// The two names are deliberately different: dread.permitOk() answers dread's OWN question
// and reading it as ours is a deadlock (_dreadPermit says why, at length).
// Nothing spawns during a dread build, for 3.2 s after a stinger, or inside the 7 s of
// protected silence after a clear. The rhythm is fight -> silence -> wrongness -> fight,
// never both at once.
//
// No allocation in step(). No Math.random. No setTimeout. All RNG from
// ctx.rng.fork('director:' + region).

import { CFG } from '../config.js';
import { clamp, clamp01, lerp } from '../engine/math.js';
import { MASK } from '../world/collision.js';

const D = CFG.director;
const SP = D.spawn;

/* ------------------------------------------------------------------ constants -- */

const MIN_DIST = SP.minDist;                              // 14 m
const CONE_HALF = (SP.viewCone * 0.5) * Math.PI / 180;    // 45 deg
const COS_CONE = Math.cos(CONE_HALF);                     // 0.7071 — the law, as a dot
const GAP_S = SP.minGapS;                                 // 0.6
const ANNULUS = SP.annulus;                               // [26, 56]
const MAX_SLOPE = 0.46;        // [cinderbloom RULES.maxSlope:150] steeper reads as placed
const CAND_TRIES = 40;         // [cinderbloom :638 tries]
const CAND_KEEP = 8;           // [cinderbloom :688 the best 8 get a raycast]
const COVER_R = 7;             // [cinderbloom :702 "something solid within 7 m"]
const SPAWN_EYE = 1.10;        // eye height of a spawning body, metres, for the LOS ray
const PLAYER_EYE = CFG.player.EYE;

// No terrain water level exists (see docs/HANDOFF.md). Two local rules stand in for one:
// the reservoir bed is the county's only standing water, it is region `marsh` (id 2), and
// its bed sits at y = -4 against a valley floor of ~22 m.
const WATER_Y = -1.0;
const DEEP_Y = -8.0;           // below this it is the reservoir bed whatever the region says
const REGION_MARSH = 2;

const HUNT_FAR = D.huntBeyond;         // 80 m — past this an alerted body commits
// ...and it is released only when it has ARRIVED, at the annulus's inner edge.
// MEASURED, and this was a real bug: the first version released at 80 - 8 = 72 m as simple
// flicker hysteresis. A body chasing a player who walks at 4.35 m/s while it moves at 3.0
// closes only while the +72% is on, so it reached 72 m, dropped to base speed, fell back to
// 80 m, re-committed — and oscillated there for ever. Over ten simulated minutes the county
// held 26 bodies of which not one ever came inside 70 m, the headcount read 0, and the
// director spent 31,000 frames behind its own alive cap. HUNT exists so the action always
// finds the player; a release band above engagement range is HUNT that never delivers.
const HUNT_RELEASE = ANNULUS[0];       // 26 m — it is here, its own AI owns it now
const HUNT_MUL = D.huntSpeedMul;       // 1.72

// The headcount target is measured inside 70 m, which is correct and is also not a cap on
// anything. MEASURED on the harness: a player walking away at 4.35 m/s from bodies chasing
// at 3 m/s keeps the 70 m count at zero for ever, and the county spawned 155 bodies into a
// field of 137 live ones. The target is a target; THIS is the cap. VIGIL's ALIVE_CAP (16,
// director.js:22) is the same law for a much smaller arena.
const ALIVE_CAP_MUL = 2.0;     // total live pressure bodies, any distance, <= cap * this

const CONTACT_R = 25;          // a body this close counts as contact, so pity does not fire
const PITY_S = 90;             // [design §4 "90 s of night with no contact"]
const CENSUS_HZ = 4;           // headcount / HUNT / cone-entry sweep, times a second

const STORM_RISE = 6, STORM_HOLD = 52, STORM_FALL = 12;   // seconds; see HANDOFF request 3
const DREAD_GAIN = 0.055;      // region dread per second at tension 1.0
const DREAD_DECAY = 0.018;     // per second, everywhere, always

const NOISE_REF = 38;          // the loudest weapon (shotgun) normalises shared.noise to 1
const NOISE_HALFLIFE = 4.0;
const NOISE_DEBT_MAX = 3;      // [fetch director.js:1287 Math.min(3, ...)]
const INVITED_CAP = 2;         // [fetch :1298 "a strict active cap"]

const ORDER_POOL = 64;         // orders never allocate; a full pool refuses loudly instead

// The bounds on "orders defer and are never dropped" — see _failOrder for why the law is
// right about a busy county and wrong about an impossible order.
const ORDER_RESPECIES_AT = 3;  // tries before the order asks for a different species
const ORDER_MAX_TRIES = 8;     // tries before the order is dropped and the slot freed
const ORDER_STALL_S = 30;      // orders outstanding + no spawn for this long = wedged

/* -------------------------------------------------------------------- roster -- */
//
// Only the fields that decide WHERE and WHEN a body appears live here. hp, damage,
// telegraphs and animation belong to the enemies lane and duplicating them would guarantee
// divergence (cinderbloom director.js:100-104 makes the same split, for the same reason).
//
//   cost      what it draws from the composition budget
//   head      what it counts toward the headcount target — hounds count 0.5 (DESIGN §4)
//   band      legal spawn distance; a sqrt sample inside it biases OUTWARD, so the mean
//             lands past the middle. cinderbloom :108-113 measured [18,34] producing a mean
//             of 28.7 and lost the encounter it had authored.
//   coverPref 0..1; 1 = must come out from behind something
//   spacing   metres between this body and any live one

// THE ROSTER IS THE PRESSURE HALF OF enemies/species.js AND NOTHING ELSE.
// It carried a fifth entry, `candlebearer`, which that table has never shipped. The cost was
// not a missing model: _pick rolled it with real weight in every region, enemies.spawn()
// returned null, _drain deferred the order for ever, _stepBudget refuses to roll a second
// composition while one is in flight, and the enemies lane switches its own trickle off the
// moment a director exists. One bad roll emptied the county for the rest of the run.
// _validateRoster() in init() now asks enemies.hasSpecies() about every id here and throws,
// so the next divergence is a boot failure with a name on it instead of a silent famine.
const ROSTER = {
  hound: { cost: 1.0, head: 0.5, band: [26, 52], coverPref: 0.90, spacing: 3.5 },
  pallbearer: { cost: 2.0, head: 1.0, band: [26, 44], coverPref: 0.95, spacing: 4.0 },
  poacher: { cost: 2.0, head: 1.0, band: [34, 56], coverPref: 0.55, spacing: 6.0 },
  hunter: { cost: 4.0, head: 1.0, band: [30, 52], coverPref: 0.75, spacing: 8.0 },
};
// Written out, not Object.keys(ROSTER): the RECIPES rows below are positional, and a
// species added to ROSTER without a column here would silently shift every weight by one.
// ready() asserts the two still agree.
const SPECIES = ['hound', 'pallbearer', 'poacher', 'hunter'];

// Region recipes. terrain.js ships FOUR regions (pines / fields / marsh / ridge), not
// DESIGN §2's seven, so the seven recipes collapse onto four; see HANDOFF.
// Rows are weights per species, indexed by terrain region id. A zero is a real "never here".
//                      hound  pallb  poach  hunter
const RECIPES = [
  /* 0 pines  'pack'    */[3.0, 1.4, 0.5, 1.0],
  /* 1 fields 'ambush'  */[1.2, 1.6, 2.4, 0.6],
  /* 2 marsh  'quiet'   */[1.0, 2.4, 0.4, 0.5],
  /* 3 ridge  'gunline' */[0.8, 0.5, 2.8, 1.2],
];

// The recipe lookup must be TOTAL. terrain ships ids 0-3, but placedata.js authors regions
// ('shore', 'works', 'fen') that terrain does not ship, and any of them reaching this file
// as a region id would index RECIPES to `undefined` and throw inside _pick — i.e. inside
// step(). An unknown region falls back to a NAMED default rather than to a hole.
const DEFAULT_REGION = 0;            // pines: the county's most common ground
const DEFAULT_RECIPE = RECIPES[DEFAULT_REGION];
function recipeFor(region) {
  const row = RECIPES[region];
  return row !== undefined ? row : DEFAULT_RECIPE;
}

// The black hour does not multiply the roster, it REPLACES it: hounds pack, the Hunter is
// off the leash, and the men go quiet and go home. DESIGN §2, "the roster CHANGES".
const BLACK_MUL = { hound: 2.4, pallbearer: 1.6, poacher: 0.0, hunter: 2.2 };
const DUSK_MUL = { hound: 0.8, pallbearer: 0.7, poacher: 1.8, hunter: 0.0 };

/* ------------------------------------------------------------- module scratch -- */

const _dir = { x: 0, y: 0, z: 0 };
const _org = { x: 0, y: 0, z: 0 };
const _body = { x: 0, y: 0, z: 0, species: '', pressure: true, alerted: false, hunting: false, alive: true };
const _permit = { ok: true, silenceT: 0, stingerT: 0, huntNear: false, dread: true };
const _placed = { x: 0, y: 0, z: 0, dist: 0, cover: 0, los: false, score: 0 };

/** A fixed-size candidate table. Allocated once; `n` is the live length. */
function makeCandidates(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = { x: 0, y: 0, z: 0, dist: 0, slope: 0, cover: 0, los: false, score: 0 };
  return a;
}

export class Director {
  static id = 'director';

  constructor(ctx) {
    this.ctx = ctx;
    this.shared = ctx.shared || (ctx.shared = {});

    /* ---- cadence and permits ---- */
    this._t = 0;
    this._sinceSpawn = GAP_S;      // the first order may go immediately
    this._silenceT = 0;            // protected silence after a clear
    this._stingerT = 0;            // 3.2 s of nothing after a dread stinger
    this._sinceContact = 0;
    this._censusT = 0;
    this._clearArmed = false;
    this._killedWhileNear = false;  // set by enemy:killed; see _census
    this._huntNear = false;

    /* ---- census ---- */
    this.head = 0;                 // weighted pressure headcount inside 70 m
    this.aliveNear = 0;            // raw bodies inside 70 m
    this.aliveTotal = 0;           // every live pressure body, any distance — the hard cap
    this.hunting = 0;              // how many are converging
    this.target = 0;
    this.cap = 0;

    /* ---- storms ---- */
    this.storm = 0;
    this._stormPhase = 'idle';     // idle | rise | hold | fall
    this._stormT = 0;
    this._stormCd = 0;
    this.regionDread = new Float64Array(RECIPES.length);
    this.stormsFired = 0;

    /* ---- noise ---- */
    this.noise = 0;
    this._noiseDebt = 0;
    this._invited = 0;

    /* ---- instrumentation. A gate asserts refusals > 0: placement that never refuses is
       placement that is clipping bodies into trees. ---- */
    this.refusals = 0;
    // Real seconds the player has been able to MOVE, and where they started. The boot loop
    // runs ninety fixed steps behind the loading shell, so counting from construction would
    // spend most of the opening grace before the player can do anything with it.
    this._playT = 0;
    this._startPos = null;
    this.spawned = 0;
    this.deferred = 0;    // orders that were tried and had to wait
    this.blocked = 0;     // frames the queue sat behind a gate
    this.orderOverflow = 0;
    this.dropped = 0;     // orders abandoned after ORDER_MAX_TRIES
    this.respecied = 0;   // orders that asked for a different species at ORDER_RESPECIES_AT
    this.stalls = 0;      // times the watchdog had to clear the queue
    this.lastRefusal = '';

    /* ---- the order pool. Orders are reused slots; nothing is allocated to queue one. ---- */
    this._orders = new Array(ORDER_POOL);
    for (let i = 0; i < ORDER_POOL; i++) {
      this._orders[i] = { live: false, species: 'hound', bearing: 0, at: 0, hold: false, tries: 0 };
    }
    this._orderCount = 0;
    this._sinceOrderSpawn = 0;     // watchdog clock: seconds since the last body arrived
    this._stallLogged = false;

    this._cand = makeCandidates(CAND_TRIES);
    // Timestamps of recent cone entries. Seeded far in the past on purpose: a zero-filled
    // ring reads as eight entries in the first second and jams every spawn until t > 1.
    this._coneEntries = new Float64Array(8).fill(-1e9);
    this._coneHead = 0;
    this._w = new Float64Array(SPECIES.length);
    this._opts = { species: '', pack: 1, blackHour: false, danger: 1, hunt: false };

    /* ---- pre-bound iterators. MEASURED: writing these as inline arrow functions at the
       call site allocated one closure per _forEachBody, which is 4/s for the census and
       FORTY per placement solve — 1.9 MB of garbage over two simulated minutes on the
       harness. They are built once here, and they communicate through the _c* scratch
       fields below instead of through captured locals. ---- */
    this._cHead = 0; this._cNear = 0; this._cTotal = 0; this._cHunting = 0;
    this._cHuntNear = false; this._cContact = false; this._cPermitR2 = 0;
    this._tcX = 0; this._tcZ = 0; this._tcS2 = 0; this._tcHit = false;
    this._wkX = 0; this._wkZ = 0; this._wkR2 = 0;

    this._fnCensus = (b, raw) => {
      const dx = b.x - this._px, dz = b.z - this._pz;
      const d2 = dx * dx + dz * dz;
      const d = Math.sqrt(d2);

      if (b.pressure) {
        this._cTotal++;
        if (d <= 70) {
          const R = ROSTER[b.species];
          this._cHead += R ? R.head : 1;
          this._cNear++;
        }
      }
      if (d < CONTACT_R) this._cContact = true;

      // The permit radius: a HUNTING pressure body close enough that a wrongness beat would
      // land on top of a fight. Dread-owned bodies never gate dread. `b.hunting`, NOT
      // `b.alerted` — see the ladder note in _readBody; reading it as alerted denied the
      // dread permit 97.1% of the time and the layer never once fired.
      if (b.pressure && b.hunting && d2 < this._cPermitR2) this._cHuntNear = true;

      // HUNT. Past 80 m an ALERTED pressure body stops flavouring and converges at +72%,
      // and it holds that until it is INSIDE 26 m — see the HUNT_RELEASE note above.
      // Dread-owned species are exempt (DESIGN §4 ownership rule).
      if (b.pressure) {
        const on = raw.hunt === true;
        if (!on && b.alerted && d > HUNT_FAR) { this._setHunt(raw, true); this._cHunting++; }
        else if (on && d < HUNT_RELEASE) this._setHunt(raw, false);
        else if (on) this._cHunting++;
      }

      // The frustum-entry budget: at most 2 bodies may cross INTO the view cone per second
      // (cinderbloom RULES.frustumPerSec:146). Nothing can be un-entered, so the budget
      // gates the next SPAWN instead: while the screen is already filling, orders wait.
      //
      // This used to be a WeakMap keyed by the body, with `{ inCone: false }` allocated on
      // first sight. The enemy pool is FIXED at 46 (enemies/species.js POOL), so the map
      // could never be a win, and every recycled body paid for a fresh object plus a hashed
      // lookup 4x a second inside the census. The flag lives on the body itself now: one
      // boolean, no allocation, no lookup. It is namespaced `_dirInCone` because it is MY
      // bookkeeping on someone else's object — the same arrangement as `raw.hunt`.
      const wasInCone = raw._dirInCone === true;
      const inCone = d > 0.01 && ((dx * this._fx + dz * this._fz) / d) > COS_CONE;
      if (inCone && !wasInCone) {
        this._coneEntries[this._coneHead] = this._t;
        this._coneHead = (this._coneHead + 1) & 7;
      }
      raw._dirInCone = inCone;
    };

    this._fnTooClose = (b) => {
      if (this._tcHit) return;
      const dx = b.x - this._tcX, dz = b.z - this._tcZ;
      if (dx * dx + dz * dz < this._tcS2) this._tcHit = true;
    };

    this._fnWake = (b, raw) => {
      const dx = b.x - this._wkX, dz = b.z - this._wkZ;
      if (dx * dx + dz * dz > this._wkR2) return;
      raw.alerted = true;
      raw.heardX = this._wkX; raw.heardZ = this._wkZ;
    };
    this._forks = null;                        // one rng per region, made at init

    /* ---- cached player/camera reads, refreshed once per step ---- */
    this._px = 0; this._py = 0; this._pz = 0; this._speed = 0;
    this._fx = 0; this._fz = -1;
    this._region = 0;

    // Subscriptions live in the constructor: every system is constructed before any init()
    // runs, so nothing that emits during boot can be missed.
    const bus = ctx.bus;
    bus.on('noise', (e) => this._onNoise(e));
    bus.on('weapon:fire', () => { this._sinceContact = 0; });
    bus.on('player:hurt', () => { this._sinceContact = 0; });
    // A kill inside the census ring is what makes the next emptying of that ring a CLEAR
    // rather than a disengagement. See _census.
    bus.on('enemy:killed', () => {
      this._sinceContact = 0;
      if (this.aliveNear > 0) this._killedWhileNear = true;
    });
    bus.on('dread:stinger', () => { this._stingerT = D.dread.postLoudQuietS; });
    bus.on('player:died', () => { this._onDeath(); });
  }

  async init() {
    // Before anything else: does the county we are about to order bodies from actually
    // exist? A roster that disagrees with enemies/species.js is not a cosmetic mismatch, it
    // is a permanent jam (see the ROSTER header), and it must fail HERE — at boot, with a
    // name — rather than as an empty county twenty minutes in.
    this._validateRoster();

    // One rng per region, forked once. ctx.rng.fork() builds a string key and caches, so
    // doing it here keeps the hot path free of both.
    this._forks = new Array(RECIPES.length);
    for (let i = 0; i < RECIPES.length; i++) this._forks[i] = this.ctx.rng.fork('director:' + i);
    this._stormCd = this._rng().range(CFG.clock.stormCooldownS[0], CFG.clock.stormCooldownS[1]);
    this.shared.danger = 1;
    this.shared.noise = 0;
  }

  /* ==========================================================================
     Sibling adapters. Every one of these is read LAZILY, at use.
     donor: cinderbloom/src/game/director.js:400-495 — the whole "sibling API drift"
       adapter block, which exists because a director that hard-codes one spelling of
       enemies.spawn() is a director that silently stops spawning when the other lane
       renames a method. Every call is optional and every failure is a DEFER, never a drop.
     The shape this file assumes is written down in docs/HANDOFF.md; if the enemies lane
     ships a different one, one of these branches already covers it or the request is filed.
     ========================================================================== */

  _sys(id) { const s = this.ctx.systems; return s ? s.get(id) : null; }
  _rng() { return this._forks ? this._forks[this._region] : this.ctx.rng; }

  /**
   * Every id in ROSTER must be a species the enemies lane can actually field. The director
   * is manifest #17 and enemies is #16, so by init() the table is there to ask.
   *
   * Throws DirectorRosterError. main.js reports a failed init() as bootError, so this lands
   * on the screen as a named boot failure — the one thing the candlebearer bug never did.
   * If the enemies lane is absent, or ships no hasSpecies(), there is nothing to check
   * against and we do not invent a failure: the spawn path already treats a missing lane as
   * a defer.
   */
  _validateRoster() {
    const en = this._sys('enemies');
    if (!en || typeof en.hasSpecies !== 'function') return;
    const unknown = [];
    for (let i = 0; i < SPECIES.length; i++) {
      let ok = false;
      try { ok = !!en.hasSpecies(SPECIES[i]); } catch (e) { ok = false; }
      if (!ok) unknown.push(SPECIES[i]);
    }
    if (unknown.length === 0) return;
    const err = new Error(
      'director ROSTER names ' + unknown.length + ' species the enemies lane cannot field: '
      + unknown.join(', ') + '. Every id in ROSTER/SPECIES/RECIPES must exist in '
      + 'enemies/species.js — an unknown id makes enemies.spawn() return null, which wedges '
      + 'the order queue and empties the county for the rest of the run.');
    err.name = 'DirectorRosterError';
    throw err;
  }

  /** Ask the enemies lane for a body. Returns a handle, or null meaning "defer". */
  _spawnBody(species, x, y, z, packSize) {
    const en = this._sys('enemies');
    if (!en) return null;
    const opts = this._opts;
    opts.species = species;
    opts.pack = packSize;
    opts.blackHour = this._phase() === 'black';
    opts.danger = this.shared.danger || 1;
    opts.hunt = false;
    let handle = null;
    // ONE NAME. There was an `en.add(...)` alternative here and the enemies lane has never
    // shipped it: enemies.js:744 ships spawn() and that is the whole door. A
    // `a typeof-function probe` probe for a method nobody ships is dead weight that
    // reads as coverage — see tests/interfaces.mjs. Removed 2026-09-02.
    try {
      if (typeof en.spawn === 'function') handle = en.spawn(species, x, y, z, opts) || null;
    } catch (e) { return null; }
    // The pool recycles bodies, so a slot can come back still carrying the cone flag from
    // its last life. Clearing it here means a body that arrives already inside the cone
    // still registers as an ENTRY, which is what the frustum budget is counting.
    if (handle && typeof handle === 'object') handle._dirInCone = false;
    return handle;
  }

  /** Iterate live bodies, filling the shared _body view. fn(view, raw). */
  _forEachBody(fn) {
    const en = this._sys('enemies');
    if (!en) return;
    let list = null;
    if (typeof en.list === 'function') { try { list = en.list(); } catch (e) { list = null; } }
    else if (Array.isArray(en.all)) list = en.all;
    if (list) {
      for (let i = 0; i < list.length; i++) {
        const raw = list[i];
        if (!raw) continue;
        if (this._readBody(raw)) fn(_body, raw);
      }
      return;
    }
    // The only other shape the enemies lane ships. An `en.each(...)` branch stood after this
    // one and that name has never existed on any system in the tree — enemies.js ships
    // list() (:369), all (:170) and forEachAlive() (:388), and the first two are taken
    // above. See tests/interfaces.mjs. Removed 2026-09-02.
    if (typeof en.forEachAlive === 'function') {
      en.forEachAlive((raw) => { if (this._readBody(raw)) fn(_body, raw); });
    }
  }

  /** Normalise one body into the shared _body view. False = not a live body. */
  _readBody(e) {
    if (!e) return false;
    if (e.dead === true || e.alive === false || e.state === 'dead' || e.state === 'dying') return false;
    const p = e.pos || e.position;
    const x = p ? p.x : e.x, z = p ? p.z : e.z;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    _body.x = x;
    _body.y = p ? p.y : (e.y !== undefined ? e.y : 0);
    _body.z = z;
    const s = e.species || e.kind || e.type || '';
    _body.species = s;
    // Pressure vs dread. The enemies lane may label it; if it does not, the roster is the
    // authority, because DESIGN's ownership rule is by species and nothing else.
    _body.pressure = e.owner ? e.owner === 'pressure' : (ROSTER[s] !== undefined);
    _body.alerted = !!(e.alerted || e.aware || e.hunting
      || e.state === 'alerted' || e.state === 'hunting' || e.state === 'chase');

    // ALERTED IS NOT HUNTING, AND CONFLATING THE TWO SWITCHED THE ENTIRE DREAD LAYER OFF.
    //
    // MEASURED 2026-09-02, ninety seconds of ordinary walking, sampled at 5 Hz (447 samples):
    // the dread permit was denied in 434 of them — 97.1% — and 419 of those denials were
    // this director's `_huntNear`. In every single sample the count of bodies at aware === 2
    // was ZERO and the count at aware === 1 was between 3 and 9, mean 7.74 inside the 40 m
    // permit radius. dread.js's own hunting test denied nothing, ever. Result: 0 beats, 0
    // sounds, 0 Auditor events in 90 s; dread.stats.permittedSeconds was 2.97 against
    // 87.27 denied, and its 11-22 s interval — which only counts down while permitted —
    // would have needed roughly five real minutes of walking to expire once.
    //
    // `alerted` is enemies.js:974, `e.aware > 0`, and aware is a THREE-valued ladder
    // (enemies.js:1227-1233): 0 unaware, 1 has noticed something, 2 committed and coming.
    // DESIGN §4 and dread.js's permit both say HUNTING, and the comment on the _cHuntNear
    // line below has always said HUNTING. Deep night holds 9-18 pressure bodies, so with
    // aware >= 1 as the test there is always one within 40 m and the permit is a constant
    // no. `alerted` stays exactly as it is — the HUNT-past-80 m rule below is right to use
    // it — and the permit gets its own, narrower fact.
    _body.hunting = e.aware === 2 || e.hunt === true
      || e.state === 'hunting' || e.state === 'chase';
    return true;
  }

  /** HUNT: the flag only. The enemies lane owns the steering (rocket-shoes enemies.js:198). */
  _setHunt(raw, on) {
    const en = this._sys('enemies');
    try {
      if (en && typeof en.setHunt === 'function') { en.setHunt(raw, on, HUNT_MUL); return; }
    } catch (e) { /* fall through to the field */ }
    raw.hunt = on;
    raw.huntSpeedMul = on ? HUNT_MUL : 1;
  }

  /** Wake everything inside a noise radius, on the WORLD POINT that made the sound. */
  _wake(x, z, radius) {
    const en = this._sys('enemies');
    try {
      if (en && typeof en.wakeAll === 'function') { en.wakeAll(x, z, radius); return; }
      if (en && typeof en.wake === 'function') { en.wake(x, z, radius); return; }
    } catch (e) { /* fall through */ }
    this._wkX = x; this._wkZ = z; this._wkR2 = radius * radius;
    this._forEachBody(this._fnWake);
  }

  /* ==========================================================================
     THE PERMIT — the law shared with dread, and the only door either lane uses.
     ========================================================================== */

  /**
   * What DREAD asks us. False while the county is busy being loud at the player:
   *  - a HUNTING pressure body inside the permit radius (40 m, scaled by travel speed so
   *    the law still holds at 23 m/s in the car — DESIGN decision 23);
   *  - the 7 s of protected silence after a clear, which is DESIGNED nothing and must not
   *    be filled by either lane.
   */
  permitOk() {
    if (this._silenceT > 0) return false;
    return !this._huntNear;
  }

  /** The same answer with its reasons, for tests and the probe. Reused object. */
  permit() {
    _permit.ok = this.permitOk();
    _permit.silenceT = Math.max(0, this._silenceT);
    _permit.stingerT = Math.max(0, this._stingerT);
    _permit.huntNear = this._huntNear;
    _permit.dread = this._dreadPermit();
    return _permit;
  }

  /**
   * What we ask dread: may a BODY arrive right now? Missing dread lane = permitted; never
   * block the whole game on an absent sibling.
   *
   * NOT the same question as `dread.permitOk()`, and reading it as if it were is a bug I
   * shipped for about ten minutes. `dread.permitOk()` answers "may a dread BEAT happen",
   * and its gates (dread.js:470-481) include `!this.enabled` and `_huntingWithin(radius)`.
   * Consuming that as a spawn gate means: dread switched off blocks every pressure spawn
   * for ever, and — much worse — **anything hunting you inside 40 m blocks reinforcements**,
   * which is exactly the moment the horde is supposed to arrive. The permit is symmetric in
   * its LAW, not in its predicate.
   *
   * So we ask for the two facts DESIGN actually names: a dread build owns the picture, and
   * the 3.2 s after a stinger is quiet. The stinger half is ours (`dread:stinger` sets
   * `_stingerT`) so the law holds even if dread never exposes anything at all.
   */
  _dreadPermit() {
    const dr = this._sys('dread');
    if (!dr) return true;
    try {
      // The right question, and the one the dread lane ships: dread.js:493 pressureOk().
      if (typeof dr.pressureOk === 'function') return !!dr.pressureOk();
      // Otherwise the one public fact we need: is a build running?
      if (typeof dr.building === 'boolean') return !dr.building;
      // and NOT dr.permitOk(). It was in this chain as a last-ditch fallback and it is a
      // trap: it answers a different question (dread.js:471, gated on `!this.enabled` and
      // on anything hunting inside the permit radius), so consuming it here would stop
      // every reinforcement at the exact moment the horde is meant to arrive. If neither
      // of the two facts above exists, the dread lane has nothing to say and the answer is
      // yes — never block the whole game on an absent sibling.
    } catch (e) { return true; }
    return true;
  }

  /** May a body arrive this instant? Every spawn goes through here. */
  _pressurePermit() {
    if (this._silenceT > 0) return false;
    if (this._stingerT > 0) return false;
    return this._dreadPermit();
  }

  /* ==========================================================================
     step
     ========================================================================== */

  step(dt) {
    this._t += dt;
    const player = this._sys('player');
    if (!player || !player.pos) return;

    this._px = player.pos.x; this._py = player.pos.y; this._pz = player.pos.z;
    this._speed = player.speed || 0;

    // The opening clock starts when the world becomes playable, not when this system was
    // built, and the bubble is anchored wherever the player actually stood at that moment.
    if (this.ctx.ready) {
      if (!this._startPos) this._startPos = { x: this._px, z: this._pz };
      this._playT += dt;
    }

    // The camera's REAL forward, flattened. Matches player/camera.js:148-155 aimDir with
    // pitch removed — one source, so the cone law and the placement sector cannot disagree.
    const cam = this._sys('camera');
    const yaw = cam ? cam.yaw : (player.yaw || 0);
    this._fx = -Math.sin(yaw);
    this._fz = -Math.cos(yaw);

    const terrain = this._sys('terrain');
    if (terrain) {
      const r = terrain.regionAt(this._px, this._pz);
      // terrain.regionAt returns SHARED scratch (world HANDOFF D.7): read .id, keep nothing.
      // Anything that is not an integer index into RECIPES — a string key from another
      // lane's region vocabulary, a NaN, a region terrain grew after this file was written —
      // becomes DEFAULT_REGION. regionDread is sized to RECIPES, so this also keeps that
      // write in bounds.
      const id = r ? r.id : DEFAULT_REGION;
      this._region = (Number.isInteger(id) && id >= 0 && id < RECIPES.length)
        ? id : DEFAULT_REGION;
    }

    this._sinceSpawn += dt;
    this._sinceContact += dt;
    if (this._silenceT > 0) this._silenceT -= dt;
    if (this._stingerT > 0) this._stingerT -= dt;

    // Noise decays on a half-life: a shot is loud for a few seconds, not forever.
    if (this.noise > 0) this.noise *= Math.pow(0.5, dt / NOISE_HALFLIFE);
    if (this.noise < 1e-3) this.noise = 0;
    if (this._noiseDebt > 0) this._noiseDebt = Math.max(0, this._noiseDebt - dt * 0.35);

    this._stepStorm(dt);

    this._censusT -= dt;
    if (this._censusT <= 0) {
      this._censusT = 1 / CENSUS_HZ;
      this._census();
    }

    this._stepBudget();
    this._drain();
    // After the drain, so a spawn this frame zeroes the clock before it is measured.
    this._stepWatchdog(dt);

    // Publish. DESIGN §2: danger = 1 + storm * 1.4. The black hour is NOT in this number —
    // it changes the roster, and a second multiplier hidden here is how "too many things at
    // once" gets back in.
    this.shared.danger = 1 + this.storm * CFG.clock.stormDanger;
    this.shared.noise = this.noise;
  }

  /* ------------------------------------------------------------------ census -- */

  _census() {
    this._cHead = 0; this._cNear = 0; this._cTotal = 0; this._cHunting = 0;
    this._cHuntNear = false; this._cContact = false;
    const permitR = D.permitRadius * clamp(this._speed / CFG.player.SPRINT, 1, 2.4);
    this._cPermitR2 = permitR * permitR;

    this._forEachBody(this._fnCensus);

    if (this._cContact) this._sinceContact = 0;
    this.head = this._cHead;
    this.aliveNear = this._cNear;
    this.aliveTotal = this._cTotal;
    this.hunting = this._cHunting;
    this._huntNear = this._cHuntNear;
    const near = this._cNear;

    // --- the clear, and the 7 s of protected silence that follows it ---
    //
    // A CLEAR IS BODIES THAT DIED. IT IS NOT BODIES YOU OUTWALKED.
    //
    // MEASURED 2026-09-02, same 447-sample run as the _huntNear note in _readBody: this
    // branch held `_silenceT > 0` in 209 samples — 46.8% of ordinary walking — and the
    // player had not killed anything. The player walks at 4.35 m/s and a pressure body
    // moves at ~3, so the pack falls past the 70 m census ring every time he keeps going;
    // `near` hits 0, this armed 7 s of protected quiet, the county spawned again, and the
    // cycle repeated for the whole run. Stacked on the aware-vs-hunting bug it is half of
    // why the dread layer got 2.97 permitted seconds out of 90.
    //
    // DESIGN §4's silence is the beat AFTER A FIGHT — "the rhythm is fight -> silence ->
    // wrongness -> fight" — and a disengagement is not a fight that ended, it is a fight
    // that is still walking after you. So the silence now requires that something actually
    // died while the ring was populated. dread.js's own `_onKill` already keys its copy of
    // this law to a real kill (dread.js:_onKill); this is the same law, told the truth.
    if (near > 0) this._clearArmed = true;
    else if (this._clearArmed) {
      this._clearArmed = false;
      if (this._killedWhileNear) this._silenceT = D.silenceS;
      this._killedWhileNear = false;
    }
  }

  /** Cone entries inside the last second. */
  _coneEntryRate() {
    let n = 0;
    for (let i = 0; i < 8; i++) if (this._t - this._coneEntries[i] < 1) n++;
    return n;
  }

  /* ------------------------------------------------------------------ storms -- */
  //
  // A storm is the EVENT that "a lot of enemies" means. It is not a rate change the player
  // lives under; it arrives, it peaks, it goes, and the county is quiet again.

  _stepStorm(dt) {
    // Region dread accumulates where the player IS, from the dread lane's tension, and
    // decays everywhere always. A region you have been frightened in becomes a region that
    // storms — which is the whole reason the storm is not on a timer.
    const tension = clamp01(this.shared.tension || 0);
    for (let i = 0; i < this.regionDread.length; i++) {
      this.regionDread[i] = Math.max(0, this.regionDread[i] - DREAD_DECAY * dt);
    }
    const r = this._region;
    this.regionDread[r] = clamp01(this.regionDread[r] + tension * DREAD_GAIN * dt);

    if (this._stormCd > 0) this._stormCd -= dt;
    this._stormT += dt;

    switch (this._stormPhase) {
      case 'idle':
        this.storm = 0;
        if (this._stormCd <= 0 && this.regionDread[r] >= CFG.clock.stormDreadThreshold) {
          this._stormPhase = 'rise'; this._stormT = 0; this.stormsFired++;
          this.regionDread[r] *= 0.35;   // spending the dread is what makes it an event
        }
        break;
      case 'rise':
        this.storm = clamp01(this._stormT / STORM_RISE);
        if (this._stormT >= STORM_RISE) { this._stormPhase = 'hold'; this._stormT = 0; }
        break;
      case 'hold':
        this.storm = 1;
        if (this._stormT >= STORM_HOLD) { this._stormPhase = 'fall'; this._stormT = 0; }
        break;
      case 'fall':
        this.storm = 1 - clamp01(this._stormT / STORM_FALL);
        if (this._stormT >= STORM_FALL) {
          this._stormPhase = 'idle'; this.storm = 0;
          this._stormCd = this._rng().range(CFG.clock.stormCooldownS[0], CFG.clock.stormCooldownS[1]);
        }
        break;
    }
  }

  /* ------------------------------------------------------------------ budget -- */

  _phase() { return this.shared.phase || 'night'; }

  /** Headcount target and cap for right now. Hounds already count 0.5 in the census. */
  _targets() {
    const T = D.targets;
    const ph = this._phase();
    // `T.deepNight` is a CFG.director.targets KEY, not a phase name. The phase vocabulary is
    // exactly 'dusk' | 'night' | 'black' | 'dawn' and every comparison in this file uses it;
    // config.js belongs to the engine lane and its key spellings are not ours to rename.
    const base = (ph === 'dusk' || ph === 'dawn') ? T.dusk : T.deepNight;
    const surge = T.storm;
    // The black hour IS a storm-tier headcount, and a real storm on top of it does not
    // stack — 14 is the number, whichever way you got there.
    const k = ph === 'black' ? 1 : this.storm;
    let tgt = lerp(base[0], surge[0], k);
    let cap = lerp(base[1], surge[1], k);
    // "The first three cycles run at 0.7x while the player learns" (DESIGN §4).
    const clock = this._sys('clock');
    if (clock && clock.cycle < 3) { tgt *= D.firstCyclesEase; cap *= D.firstCyclesEase; }
    // And the opening minute is eased harder still, ramping rather than switching on. See
    // the note beside CFG.director.openingGraceS: the measured opening was a respawn loop.
    const oe = this._openingEase();
    tgt *= oe; cap *= oe;
    this.target = tgt; this.cap = cap;
    return tgt;
  }

  /**
   * 0..1 headcount multiplier for the opening. openingEase at t=0, ramping linearly to 1 over
   * openingRampS once openingGraceS has passed. Real time since the world became playable, not
   * since construction — the boot loop runs ninety fixed steps behind the loading shell and
   * charging the player for those would give away most of the grace before they can move.
   */
  _openingEase() {
    const D = this.ctx.cfg.director;
    if (!(D.openingGraceS > 0)) return 1;
    const t = this._playT;
    if (t <= D.openingGraceS) return D.openingEase;
    const k = Math.min(1, (t - D.openingGraceS) / Math.max(0.001, D.openingRampS));
    return D.openingEase + (1 - D.openingEase) * k;
  }

  /** True while the opening bubble still forbids a spawn at (x, z). */
  _inOpeningBubble(x, z) {
    const D = this.ctx.cfg.director;
    if (this._playT > D.openingGraceS || !this._startPos) return false;
    const dx = x - this._startPos.x, dz = z - this._startPos.z;
    return dx * dx + dz * dz < D.openingGraceR * D.openingGraceR;
  }

  _stepBudget() {
    const target = this._targets();

    // Pity. 90 s of night with no contact forces ONE spawn at the next covered site
    // (rocket-shoes roomroller.js:63-70's pity counter, re-keyed from mutator rolls to
    // silence). It bypasses the composition roll and the target — never the spawn laws.
    if (this._sinceContact >= PITY_S && this._orderCount === 0 && this._pressurePermit()) {
      this._sinceContact = 0;
      this._enqueue(this._pick(true), this._sectorBearing(), 0);
      return;
    }

    if (this._orderCount > 0) return;              // one composition in flight at a time
    if (this.head >= target - 0.5) return;          // the target is a target, not a floor
    if (!this._pressurePermit()) return;

    // --- roll a composition. donor: rocket-shoes director.js:49-64 ---
    // 74% now, 26% held as reinforcement (DESIGN §4). Reinforcement orders carry hold=true
    // and are released by _drain when their time comes OR when <=2 bodies remain.
    let budget = (target - this.head) * 1.35;
    const firstBudget = budget * 0.74;
    const bearing = this._sectorBearing();
    let at = 0, guard = 24, spentFirst = 0;
    while (budget >= 1 && guard-- > 0 && this._orderCount < ORDER_POOL) {
      const sp = this._pick(false);
      const R = ROSTER[sp];
      if (R.cost > budget + 0.5) break;
      const hold = spentFirst >= firstBudget;
      // Same sector, spaced in time: a pack arrives out of ONE treeline over a couple of
      // seconds instead of materialising as a ring, and the 600 ms law still holds.
      this._enqueue(sp, bearing + (this._rng().next() - 0.5) * 0.55,
        hold ? at + lerp(1.05, 1.95, this._rng().next()) : at, hold);
      budget -= R.cost;
      if (!hold) spentFirst += R.cost;
      at += 0.75 + this._rng().next() * 0.5;
    }
  }

  /** A bearing for this composition: off the facing axis, never straight behind. */
  _sectorBearing() {
    const rng = this._rng();
    // Forward as a bearing, in the SAME atan2(x, z) convention the placement sampler uses.
    const fwd = Math.atan2(this._fx, this._fz);
    // 34-155 deg off the axis, either side: contact comes from the shoulder, never the nose
    // (which the cone law forbids anyway) and never dead astern (which reads as cheating).
    return fwd + (rng.next() < 0.5 ? -1 : 1) * lerp(0.60, 2.70, rng.next());
  }

  /** Weighted species pick for the current region, phase and roster flip. */
  _pick(preferCover) {
    const row = recipeFor(this._region);
    const ph = this._phase();
    const mul = ph === 'black' ? BLACK_MUL : (ph === 'dusk' || ph === 'dawn') ? DUSK_MUL : null;
    let total = 0;
    for (let i = 0; i < SPECIES.length; i++) {
      let w = row[i];
      if (mul) w *= mul[SPECIES[i]];
      if (preferCover) w *= ROSTER[SPECIES[i]].coverPref;   // pity spawns come from cover
      this._w[i] = w;
      total += w;
    }
    if (total <= 0) return 'hound';
    let r = this._rng().next() * total;
    for (let i = 0; i < SPECIES.length; i++) {
      r -= this._w[i];
      if (r <= 0) return SPECIES[i];
    }
    return SPECIES[SPECIES.length - 1];
  }

  _enqueue(species, bearing, at, hold = false) {
    for (let i = 0; i < ORDER_POOL; i++) {
      const o = this._orders[i];
      if (o.live) continue;
      o.live = true; o.species = species; o.bearing = bearing;
      o.at = this._t + at; o.hold = hold; o.tries = 0;
      this._orderCount++;
      return o;
    }
    // A full pool is a real fault, not a reason to drop an order: say so, loudly, once.
    this.orderOverflow++;
    return null;
  }

  /* ------------------------------------------------------------------- drain -- */

  _drain() {
    if (this._orderCount === 0) return;
    if (this._sinceSpawn < GAP_S) return;               // >= 600 ms between spawn events
    // The gates. `blocked` counts frames the queue sat behind one of them; `deferred`
    // counts real orders that were tried and had to wait. Two different facts, and the
    // first one at 60 Hz would otherwise drown the second.
    if (!this._pressurePermit()) { this.blocked++; return; }
    if (this.head >= this.cap) { this.blocked++; return; }
    if (this.aliveTotal >= this.cap * ALIVE_CAP_MUL) { this.blocked++; return; }
    if (this._coneEntryRate() >= SP.frustumEntriesPerS) { this.blocked++; return; }

    for (let i = 0; i < ORDER_POOL; i++) {
      const o = this._orders[i];
      if (!o.live) continue;
      if (o.hold) {
        // reinforcement: its clock, or the field thinning to two bodies
        if (this._t < o.at && this.aliveNear > 2) continue;
      } else if (this._t < o.at) continue;

      const R = ROSTER[o.species] || ROSTER.hound;
      if (!this._place(o.species, o.bearing, R)) {
        // BLOCKED ORDERS DEFER (vigil director.js:12) — but see _failOrder: they no longer
        // defer for ever. Widen the sector a little each time so a jammed bearing
        // eventually finds ground.
        o.bearing += (this._rng().next() - 0.5) * 0.45 * Math.min(4, o.tries + 1);
        this._failOrder(o, 0.35);
        return;
      }
      const handle = this._spawnBody(o.species, _placed.x, _placed.y, _placed.z,
        this._packSize(o.species));
      if (!handle) {
        // The pool is jammed, or this species cannot be fielded at all.
        this._failOrder(o, 0.5);
        return;
      }
      o.live = false;
      this._orderCount--;
      this.spawned++;
      this._sinceSpawn = 0;
      this._sinceOrderSpawn = 0;
      this._applyRosterFlip(handle);
      return;   // one spawn EVENT per drain; the gap law does the rest
    }
  }

  /**
   * One failed try on an order, and the escalation that keeps a bad order from becoming a
   * dead county.
   *
   * VIGIL's law — blocked orders defer and are never dropped — is right about a jammed
   * COUNTY: no legal ground right now means run late, not run short. It is wrong about an
   * order that can never be filled at all, and the difference is invisible from inside a
   * single deferral. _stepBudget will not roll a second composition while one is in flight,
   * so a single unfillable order is a permanent famine (which is exactly what a roster id
   * the enemies lane had never heard of produced).
   *
   * So the law is now bounded, in two steps that cost nothing when the county is merely busy:
   *   3 tries  — re-roll the species. The ground may be legal for something else, and if the
   *              order was for something unspawnable this is what rescues it.
   *   8 tries  — drop it, and free the slot. The next _stepBudget rolls a fresh composition
   *              against the live headcount, which is a better order than this one anyway.
   */
  _failOrder(o, delay) {
    o.tries++;
    o.at = this._t + delay;
    this.deferred++;
    if (o.tries >= ORDER_MAX_TRIES) {
      o.live = false;
      this._orderCount--;
      this.dropped++;
      this.lastRefusal = o.species + ': dropped after ' + o.tries + ' failed tries';
      return;
    }
    if (o.tries === ORDER_RESPECIES_AT) {
      o.species = this._pick(false);
      this.respecied++;
    }
  }

  /**
   * The watchdog. Everything above is a reason an order might legitimately wait; none of
   * them is a reason for the queue to stop producing bodies indefinitely. If orders are
   * outstanding and nothing at all has spawned for ORDER_STALL_S, the queue is wedged in a
   * way this file did not anticipate — so clear it, say so ONCE, and let _stepBudget start
   * over from the live headcount. A county that re-rolls is always better than a county
   * that is empty for the rest of the run.
   */
  _stepWatchdog(dt) {
    this._sinceOrderSpawn += dt;
    if (this._orderCount === 0) { this._sinceOrderSpawn = 0; this._stallLogged = false; return; }
    if (this._sinceOrderSpawn < ORDER_STALL_S) return;

    for (let i = 0; i < ORDER_POOL; i++) this._orders[i].live = false;
    this._orderCount = 0;
    this._sinceOrderSpawn = 0;
    this.stalls++;
    const why = this.lastRefusal;
    this.lastRefusal = 'watchdog: queue cleared after ' + ORDER_STALL_S + ' s with no spawn';
    if (!this._stallLogged) {
      this._stallLogged = true;
      // Once. A watchdog that shouts every 30 s is a watchdog nobody reads.
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[director] ' + this.lastRefusal
          + ' (spawned=' + this.spawned + ' deferred=' + this.deferred
          + ' dropped=' + this.dropped + ' last refusal before the clear: ' + why + ')');
      }
    }
  }

  /** Hounds pack 2-3, and 3-7 in the black hour (DESIGN §4). Everything else is one. */
  _packSize(species) {
    if (species !== 'hound') return 1;
    const rng = this._rng();
    return this._phase() === 'black'
      ? 3 + Math.floor(rng.next() * 5)
      : 2 + Math.floor(rng.next() * 2);
  }

  /**
   * The black hour on a body that has just arrived: the Hunter's leash comes off and the
   * poachers stop shooting. Both are the ENEMIES lane's behaviour; this only flips the
   * switch, through their API if they have one and through the field if they do not.
   */
  _applyRosterFlip(handle) {
    if (this._phase() !== 'black' || !handle || typeof handle !== 'object') return;
    const en = this._sys('enemies');
    try {
      if (en && typeof en.setLeash === 'function') { en.setLeash(handle, false); }
      else handle.leashed = false;
      if (en && typeof en.setHoldFire === 'function') { en.setHoldFire(handle, true); }
      else handle.holdFire = true;
    } catch (e) { /* the flip is a preference, never a spawn failure */ }
  }

  /* ==========================================================================
     PLACEMENT — refuses rather than clips.
     donor: cinderbloom/src/game/director.js:584-742, ported to CURFEW's queries:
       terrain.heightAt/slopeAt/regionAt instead of a heightfield + prop grid,
       collision.raycast(MASK.SIGHT) for the corridor and collision.debugNearest for cover.
     ========================================================================== */

  _place(species, bearing, R) {
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');
    const roads = this._sys('roads');
    if (!terrain) { this.refusals++; this.lastRefusal = 'no terrain'; return false; }

    const rng = this._rng();
    const px = this._px, pz = this._pz;
    const band = R.band;
    // The species band, clamped INTO the authored annulus — never widened by it. A
    // candle-bearer's [40,56] must not become [26,56] just because the annulus starts there.
    const bandLo = Math.max(MIN_DIST, clamp(band[0], ANNULUS[0], ANNULUS[1]));
    const bandHi = Math.max(bandLo + 2, clamp(band[1], ANNULUS[0], ANNULUS[1]));
    const mid = (bandLo + bandHi) * 0.5;
    const cand = this._cand;
    let n = 0;

    /* ---- pass 1: cheap candidates. Terrain and fields only, no raycasts. ---- */
    // The forward bearing, in the SAME atan2(x, z) convention as the sampler below.
    const fwd = Math.atan2(this._fx, this._fz);

    for (let i = 0; i < CAND_TRIES; i++) {
      let a = bearing + (rng.next() - 0.5) * 1.05;
      // Sample LEGALLY rather than sample-then-reject. The composition bearing is authored
      // 34-155 deg off the facing axis (VIGIL's CONTACT beat), and the jitter is +-30 deg,
      // so at the near edge most of the spread lands inside the 45 deg half-cone. MEASURED:
      // 290 solve failures against 23 spawns over ten simulated minutes, almost all of them
      // "no legal ground" from candidates thrown away on the cone law alone. Pushing the
      // angle out of the cone costs nothing and keeps the sector's intent; the cone test
      // below STAYS, as the law it is, and now simply never fires.
      let off = a - fwd;
      while (off > Math.PI) off -= Math.PI * 2;
      while (off < -Math.PI) off += Math.PI * 2;
      const minOff = CONE_HALF + 0.05;
      if (Math.abs(off) < minOff) a = fwd + (off < 0 ? -minOff : minOff);
      // sqrt, not linear: a linear radius samples the inner ring far too heavily and the
      // measured mean lands short of the band (cinderbloom :640-642).
      const d = lerp(bandLo, bandHi, Math.sqrt(rng.next()));
      const x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d;

      // -- the hard laws --
      const dx = x - px, dz = z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < MIN_DIST) continue;
      // outside the 90 deg cone, as a dot against the camera's real forward
      if ((dx * this._fx + dz * this._fz) / dist > COS_CONE) continue;
      // inside the county: past the rim the land walls up and nothing lives there
      if (terrain.beyondRim && terrain.beyondRim(x, z)) continue;

      const h = terrain.heightAt(x, z);
      if (!Number.isFinite(h)) continue;
      if (h < DEEP_Y) continue;                                   // the reservoir bed
      const reg = terrain.regionAt(x, z);
      if (reg && reg.id === REGION_MARSH && h < WATER_Y) continue; // standing water
      const slope = terrain.slopeAt(x, z);
      if (!(slope <= MAX_SLOPE)) continue;

      // the road surface itself: a body standing in the lane is a body that was placed
      if (roads && typeof roads.roadDistance === 'function'
        && roads.roadDistance(x, z) < CFG.roads.width + 1.5) continue;
      // destination flats: the places the player is walking TOWARD are not spawn ground
      if (this._onFlat(terrain, x, z)) continue;
      // and the opening bubble, which is the same idea in time rather than in space: the
      // first minute of a fresh session belongs to the player learning where they are.
      if (this._inOpeningBubble(x, z)) continue;

      // never on top of a live body
      if (this._tooClose(x, z, R.spacing)) continue;
      // and it must physically fit
      if (collision && typeof collision.canOccupy === 'function'
        && !collision.canOccupy(x, z, 0.42, 1.70)) continue;

      const c = cand[n++];
      c.x = x; c.y = h; c.z = z; c.dist = dist; c.slope = slope;
      c.cover = 0; c.los = false;
      c.score = -Math.abs(dist - mid) * 0.06 - slope * 3;
      if (n >= CAND_TRIES) break;
    }

    if (n === 0) {
      this.refusals++;
      this.lastRefusal = species + ': no legal ground in the sector';
      return false;
    }

    /* ---- pass 2: sightline and cover, on the best few only. A raycast is ~40x a height
       sample, so the sort earns its keep (cinderbloom :685-687). ---- */
    // insertion sort of the first n by score, descending. n <= 40 and this runs at most
    // once per 600 ms, never per frame.
    for (let i = 1; i < n; i++) {
      const c = cand[i];
      let j = i - 1;
      while (j >= 0 && cand[j].score < c.score) { cand[j + 1] = cand[j]; j--; }
      cand[j + 1] = c;
    }

    const keep = Math.min(CAND_KEEP, n);
    let best = null;
    for (let i = 0; i < keep; i++) {
      const c = cand[i];
      // -- the corridor. Not a nicety: a body placed behind cover with no line to the
      // player walks into the back of the same trunk forever, and CINDERBLOOM measured
      // exactly that turning legal spawns into permanent survivors (:713-716). --
      let clear = true;
      if (collision && typeof collision.raycast === 'function') {
        _org.x = c.x; _org.y = c.y + SPAWN_EYE; _org.z = c.z;
        const ddx = px - c.x, ddy = (this._py + PLAYER_EYE * 0.4) - _org.y, ddz = pz - c.z;
        const len = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1;
        _dir.x = ddx / len; _dir.y = ddy / len; _dir.z = ddz / len;
        const hit = collision.raycast(_org, _dir, len - 0.6, MASK.SIGHT);
        clear = !(hit && hit.hit);
      }
      c.los = clear;

      // -- cover. Alex's law: they rush from covered hidden places. Cover is the nearest
      // solid within 7 m, so a trunk, a wall, a fence post — something to come OUT of. --
      let cover = 0;
      if (collision && typeof collision.debugNearest === 'function') {
        const nr = collision.debugNearest(c.x, c.z, COVER_R);
        if (nr) {
          const dd = Math.hypot(c.x - nr.x, c.z - nr.z) - (nr.radius || 0);
          cover = clamp01(1 - dd / COVER_R);
        }
      }
      c.cover = cover;

      // The corridor is a HARD gate; cover is a strong preference on top of it.
      c.score += clear ? (6 + cover * 8 * R.coverPref) : -40;
      if (!best || c.score > best.score) best = c;
    }

    if (!best || !best.los) {
      this.refusals++;
      this.lastRefusal = species + ': no line-of-sight corridor';
      return false;
    }

    _placed.x = best.x; _placed.y = best.y; _placed.z = best.z;
    _placed.dist = best.dist; _placed.cover = best.cover; _placed.los = true;
    _placed.score = best.score;
    return true;
  }

  _onFlat(terrain, x, z) {
    const flats = typeof terrain.flats === 'function' ? terrain.flats() : null;
    if (!flats) return false;
    for (let i = 0; i < flats.length; i++) {
      const f = flats[i];
      const dx = x - f.x, dz = z - f.z;
      if (dx * dx + dz * dz < f.r * f.r) return true;
    }
    return false;
  }

  _tooClose(x, z, spacing) {
    this._tcX = x; this._tcZ = z; this._tcS2 = spacing * spacing; this._tcHit = false;
    this._forEachBody(this._fnTooClose);
    return this._tcHit;
  }

  /* ==========================================================================
     THE NOISE ECONOMY — a permanent kill is never free.
     ========================================================================== */

  _onNoise(e) {
    if (!e) return;
    const x = e.x, z = e.z;
    const radius = Math.max(0, e.radius || 0);
    if (!Number.isFinite(x) || !Number.isFinite(z) || radius <= 0) return;

    // shared.noise is the loudness the whole game reads, normalised on the loudest weapon
    // in CFG.weapons.defs (the shotgun's 38 m).
    this.noise = Math.max(this.noise, clamp01(radius / NOISE_REF));
    this._sinceContact = 0;

    // Everything inside the radius wakes, on the point that MADE the sound — not on the
    // player's live coordinate, which would turn every noise into a wallhack
    // (fetch director.js:1288-1292).
    this._wake(x, z, radius);

    // One loud choice may invite company, with a hard cap and real forgiveness once the
    // debt drains (fetch :1286-1299). Quiet play is genuinely quieter.
    const wasQuiet = this._noiseDebt < 0.35;
    this._noiseDebt = Math.min(NOISE_DEBT_MAX, this._noiseDebt + clamp(radius / NOISE_REF, 0.05, 1.5));
    if (!wasQuiet) return;
    if (this._invited >= INVITED_CAP) return;
    if (!this._pressurePermit()) return;
    // It arrives from the direction of the sound, a couple of seconds late, so it reads as
    // something that HEARD you rather than something that was told where you are.
    const bearing = Math.atan2(x - this._px, z - this._pz) + (this._rng().next() - 0.5) * 1.2;
    if (this._enqueue(this._pick(true), bearing, 2.25 + this._rng().next() * 0.75)) this._invited++;
  }

  _onDeath() {
    // Death clears the board's debts: the player comes back at the next dusk into a county
    // that is not still holding a grudge from the life before.
    for (let i = 0; i < ORDER_POOL; i++) this._orders[i].live = false;
    this._orderCount = 0;
    this._sinceOrderSpawn = 0;
    this._stallLogged = false;
    this._invited = 0;
    this._noiseDebt = 0;
    this.noise = 0;
    this._silenceT = D.silenceS;
    this._sinceContact = 0;
  }

  /* ==========================================================================
     the surface
     ========================================================================== */

  state() {
    return {
      head: +this.head.toFixed(2),
      aliveNear: this.aliveNear,
      target: +this.target.toFixed(2),
      cap: +this.cap.toFixed(2),
      hunting: this.hunting,
      danger: +(this.shared.danger || 1).toFixed(3),
      storm: +this.storm.toFixed(3),
      stormPhase: this._stormPhase,
      stormsFired: this.stormsFired,
      stormCd: +Math.max(0, this._stormCd).toFixed(1),
      regionDread: Array.from(this.regionDread, (v) => +v.toFixed(3)),
      region: this._region,
      phase: this._phase(),
      noise: +this.noise.toFixed(3),
      noiseDebt: +this._noiseDebt.toFixed(2),
      invited: this._invited,
      orders: this._orderCount,
      spawned: this.spawned,
      deferred: this.deferred,
      dropped: this.dropped,
      respecied: this.respecied,
      stalls: this.stalls,
      sinceOrderSpawn: +this._sinceOrderSpawn.toFixed(1),
      blocked: this.blocked,
      aliveTotal: this.aliveTotal,
      refusals: this.refusals,
      orderOverflow: this.orderOverflow,
      lastRefusal: this.lastRefusal,
      silenceT: +Math.max(0, this._silenceT).toFixed(2),
      stingerT: +Math.max(0, this._stingerT).toFixed(2),
      sinceContact: +this._sinceContact.toFixed(1),
      permit: this.permitOk(),
      coneEntries: this._coneEntryRate(),
    };
  }

  /** Live A/B only, never a shipping default. */
  config(patch) {
    if (!patch || !patch.director) return;
    const p = patch.director;
    if (typeof p.storm === 'number') { this.storm = clamp01(p.storm); this._stormPhase = 'hold'; this._stormT = 0; }
    if (typeof p.silence === 'number') this._silenceT = p.silence;
  }

  ready() {
    // A real wiring check. The cone law must be the 90 degrees it claims, the annulus must
    // be the authored one, and shared must carry the two keys this file owns — a director
    // that runs and publishes nothing is the working-but-invisible failure this catalogue
    // keeps shipping.
    const keys = Object.keys(ROSTER);
    if (keys.length !== SPECIES.length) return false;
    for (let i = 0; i < keys.length; i++) if (keys[i] !== SPECIES[i]) return false;
    for (let i = 0; i < RECIPES.length; i++) if (RECIPES[i].length !== SPECIES.length) return false;
    return Math.abs(COS_CONE - Math.SQRT1_2) < 1e-9
      && ANNULUS[0] === 26 && ANNULUS[1] === 56
      && this._orders.length === ORDER_POOL
      && typeof this.shared.danger === 'number'
      && typeof this.shared.noise === 'number';
  }

  dispose() {}
}
export default Director;
