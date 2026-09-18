// CURFEW — the gun core. LIFTED from Projects/vigil/src/weapons/weapon.js
// (which is Cinderbloom's COMBAT_FEEL bible transplanted number-for-number).
// This file is the ONE owner of trigger, recoil, spread, ADS, reload and the
// melee timeline. combat.js owns ballistic resolution and feedback only; the
// viewmodel owns nothing but pose. (Cinderbloom's dual ownership of the
// trigger needed a bus latch and an outcome-checked melee handshake to stay
// honest. We do not repeat it.)
//
// WHAT CHANGED FROM VIGIL, and only this:
//   1. VIGIL's module constant block (vigil weapon.js:11-59) is generalised
//      into a per-weapon def read from CFG.weapons.defs. The carbine's numbers
//      come through that path unchanged, so the VIGIL cadence/kick/ADS gate
//      still measures the same gun.
//   2. VIGIL's weapon.js CREATED the viewmodel. CURFEW's manifest lists them
//      as separate systems (11 and 12), so this file publishes state and a
//      pulse queue and viewmodel.js drains it in its own step, one entry later
//      in manifest order — zero latency, and no captured sibling reference.
//   3. Every def carries `loud` in metres. Loudness IS the alert radius; it
//      rides on every weapon:fire so M1's director can build the verb chain
//      that makes crouch and the hatchet exist. A permanent kill is never free.
//   4. Counter-input is measured by differencing the camera's own yaw/pitch
//      across the step rather than asking the camera for a lookDelta. The
//      camera writes aim before we do (manifest order 10 then 11) and juice is
//      added at render, so the difference since our last write IS the player's
//      counter-input. One less cross-owner interface for the same rule.
//   5. THE HANDS BRANCH IS WIRED HERE (progression/nodes.js). Three of its four verbs
//      live in this file — the active-reload window, a reload a sprint cancels and
//      RESUMES where it left off, and hold-breath — and the fourth (penetration) lives in
//      combat.js, where a ray decides what it goes through. Every one is read lazily
//      through progress.perk() — the HOOK registry, because the HANDS installers write no
//      stat — and with no node owned the gun behaves EXACTLY as it does today. That is not
//      a courtesy: progress is manifest entry 20 and weapons is 13, so in an M0 build the
//      system genuinely is not there.
//
// THE RULE THAT THIS FILE EXISTS TO PROTECT (vigil weapon.js:399-424):
// PLAYER COUNTER-INPUT EATS THE RECOIL ACCUMULATOR FIRST. If the auto-recentre
// is allowed to run while the player is already pulling down, the two add and
// the view is dragged to the floor. Nobody who plays it can name why; they
// just stop being able to aim.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp } from '../engine/math.js';
import CFG from '../config.js';
// Data only (placedata.js imports no THREE and touches no scene): the `reward` column, a
// weapon def id on the rows whose claim hands you a gun. Read at use, never captured.
import { MAJORS, MAJOR_BY_ID } from '../world/placedata.js';

const CORE = CFG.weapons.core;
const MELEE = CFG.weapons.melee;

/* -------------------------------------------------------------------------
   Per-weapon extras.

   Everything with a home in config lives in config. These are the columns
   config does not carry yet: fire mode, the authored recoil table, the reload
   durations and the range/damage bands. They are LOCAL CONSTS ON PURPOSE and
   a request to move them into CFG.weapons.defs is filed in docs/HANDOFF.md.
   Numbers cited: DESIGN.md §3 weapons table (bolt/shotgun/revolver), and
   vigil/src/weapons/weapon.js:16-27 (the carbine's authored 16-shot pattern).
   ------------------------------------------------------------------------- */

// The authored 16-shot aim-kick pattern, deg: seven up, drift right, hook
// left. vigil weapon.js:17-22, itself cinderbloom weapons.js:226-232.
const CARBINE_PATTERN = [
  [0.62, 0.00], [0.44, 0.06], [0.42, 0.11], [0.40, 0.17],
  [0.38, 0.22], [0.34, 0.26], [0.30, 0.24], [0.26, 0.14],
  [0.22, -0.02], [0.20, -0.18], [0.18, -0.28], [0.16, -0.31],
  [0.15, -0.28], [0.14, -0.20], [0.13, -0.09], [0.12, 0.04],
];
const CARBINE_SUSTAIN_YAW = [0.10, 0.18, 0.12, -0.04, -0.16, -0.22, -0.12, 0.02];

const EXTRA = {
  // KILN spec, DESIGN §3: bands 78 / 62 / 54 out to 26 / 44 m, one 2.6 deg
  // vertical hop, 320 ms settle, 5+1. A bolt gun is one shot per pull; the
  // 0.220 s input buffer is what makes the second pull land on the cycle.
  bolt: {
    auto: false,
    pattern: [[2.6, 0.00]],
    sustainPitch: 2.6, sustainYaw: [0.06, -0.06],
    bands: [[26, 78], [44, 62], [Infinity, 54]],
    reloadTac: 2.40, reloadEmpty: 3.10,
    cycle: 0.62,             // the bolt throw, wholly inside the 1.091 s interval
    surface: 'rifle',
  },
  shotgun: {
    auto: false,
    pattern: [[3.1, 0.00]],
    sustainPitch: 3.1, sustainYaw: [0.10, -0.10],
    bands: [[8, 12], [16, 7], [Infinity, 3]],   // per pellet; range 16 from CFG
    // A TUBE. reloadTac/reloadEmpty are PER SHELL (0.62 s a shell; the first shell of an
    // empty gun 0.94 s, because it also has to be chambered) and _startReload builds one
    // 'shell' beat per round needed, so the reload is as long as the shells it puts in and
    // an interrupted reload keeps every shell already in. Before this the two numbers were
    // read as the WHOLE reload: six shells in 0.62 s and a HUD arc five times faster than
    // any other gun's (Alex: "the reload circle got really fast, especially with the shotgun").
    tube: true,
    reloadTac: 0.62, reloadEmpty: 0.94,
    cycle: 0.44,
    surface: 'rifle',
  },
  revolver: {
    auto: false,
    pattern: [[1.03, 0.00]],
    sustainPitch: 1.03, sustainYaw: [0.14, -0.11, 0.08, -0.16],
    bands: [[18, 28], [34, 23], [Infinity, 18]],
    reloadTac: 2.05, reloadEmpty: 2.55,
    cycle: 0.0,
    surface: 'pistol',
  },
  carbine: {
    auto: true,
    pattern: CARBINE_PATTERN,
    sustainPitch: 0.12, sustainYaw: CARBINE_SUSTAIN_YAW,
    bands: [[26, 34], [44, 28], [70, 24], [Infinity, 20]],   // vigil combat.js:11
    reloadTac: 2.100, reloadEmpty: 2.850,
    cycle: 0.0,
    surface: 'rifle',
  },
};

// [aim, view, weapon] channel multipliers by stance. vigil weapon.js:30-33.
// The three channels are STRICTLY SEPARATE: aim moves the bullets and recovers
// only CORE.recoilReturn of itself; view is cosmetic and recovers fully; the
// weapon channel is ~70% of the felt motion and happens in a scene that does
// not even share the world camera.
const MOD = {
  hip: [1, 1, 1], ads: [0.86, 0.55, 0.32],
  crouch: [0.88, 0.90, 0.92], crouchAds: [0.76, 0.50, 0.30],
  air: [1.55, 1.40, 1.25], moving: [1.08, 1.05, 1.00],
};

// vigil weapon.js:35 gives four spread values per gun; CFG.weapons.defs gives
// two (the standing ones). The walking values are derived by VIGIL's own
// measured ratios — hipWalk/hipStand = 2.900/2.100, adsWalk/adsStand =
// 0.085/0.050 — so the tuned RELATIONSHIP survives even though the absolute
// numbers now come from the def.
const WALK_MUL = { hip: 2.900 / 2.100, ads: 0.085 / 0.050 };
const BLOOM = {
  hipAdd: 0.160, hipCap: 1.300, hipHL: 0.180,
  adsAdd: 0.012, adsCap: 0.090, adsHL: 0.140, delay: 0.110,
};

// Melee acquisition, vigil weapon.js:44-48. CFG.weapons.melee has the whole
// timeline but not the cone or the assist range; requested in HANDOFF.
// A 42-deg cone with the vertical squashed, because a 1.1 m thing at 1.6 m
// sits ~35 deg BELOW the eye and a camera-axis ray cannot hit anything
// shorter than you are.
const MELEE_ASSIST = 2.70, MELEE_CONE_DEG = 42;

// Reload beat sheets, vigil weapon.js:53-62. Held as (name, time) against a
// REFERENCE duration and scaled by dur/ref, so a 5-round bolt gun and a 30-
// round carbine share one choreography without either losing its own length.
const BEATS_REF_TAC = 2.100, BEATS_REF_EMPTY = 2.850;
const BEATS_TAC = [
  ['release', 0.130], ['drop', 0.190], ['enter', 0.620], ['contact', 0.900],
  ['seat', 1.080], ['tug', 1.420], ['cancelopen', 1.560],
];
const BEATS_EMPTY = [
  ['release', 0.130], ['drop', 0.210], ['enter', 0.700], ['contact', 1.010],
  ['seat', 1.180], ['boltrelease', 1.940], ['cancelopen', 2.340],
];

const MAXT = 300;                 // metres a shot is allowed to travel
// THE LOWERED STANCE (D1). X toggles it; fire, aim, melee or R raise it, and the raising
// press is spent on the raise (a second click fires). 0.26 s down, 0.24 s up: quicker up than
// down, because the answer to something arriving must never be the slow half.
const LOWER_IN_S = .26, LOWER_OUT_S = .24;
// THE ACTIVE RELOAD, base behaviour on every reload (D2). Authored in seconds against the
// REFERENCE choreography like the beats above and scaled per gun: 1.00-1.30 s of the 2.10 s
// reference is the moment the magazine seats. A hit runs the rest of the reload at x1.35; a
// miss costs nothing (the reload simply continues - there is no jam any more). ACTIVE_MIN_S
// floors the scaled window so a short reload (the shotgun's first shell, a Steady-fast
// carbine) is still a window a hand can find.
const BASE_ACTIVE = Object.freeze({ from: 1.000, to: 1.300, mul: 1.35 });
const ACTIVE_MIN_S = 0.18;
// The tube reload's close: after the last shell the hand comes back to the grip.
const TUBE_CLOSE_S = 0.30;
// The tube beat sheet's capacity: the biggest tube (6) + 1 chambered + 'cancelopen', with room.
const TUBE_BEATS_MAX = 16;

/* -------------------------------------------------------------------------
   ROUND 5 (docs/NEXT.md item 3) — Alex: "This initial gun is very slow and it
   should automatically reload when it gets to zero... other guns should be
   obtainable if there are locations you can beat and stuff."

   Two things, both in this file:
   1. The magazine reloads itself the moment it empties (see step(), the
      AUTO-RELOAD block). No trigger hold, no press.
   2. An arsenal: `owned`, has(), grant(), swap(), slot(). Claiming a place whose
      placedata row carries `reward` grants that gun. The grant is wired to the bus
      channel 'place:claimed' and, for a returning save, read LAZILY at the first
      step off progress.claimed (progress.js restores the save's claimed list into
      its OWN Set; places.js only seeds startClaimed and never restores a claim -
      verification round 1 measured the first cut, which asked places, coming back
      with the bolt alone).

   ROUND 6 (Alex, fifth playtest: "I'm assuming there are other guns, right? I haven't
   found any... Those would be great rewards for completing areas"). Round 5's single
   GRANT_AT / GRANT_WEAPON pair is gone: every `reward` row in placedata.js grants on
   its claim — the Drowned Light's revolver, Jackfield's shotgun, the Weeping Mine's
   carbine — and a gun you already own pays a FULL RESERVE of its ammo instead, so a
   second visit is never nothing. Lane F's caches speak `pickup:ammo {n}` on the bus and
   that lands on the gun in the hands through addReserve(n).
   ------------------------------------------------------------------------- */
// A swap is lower-then-raise through the viewmodel's sprint-out pose. The gun changes at
// the midpoint, when it is fully out of frame.
const SWAP_S = 0.45;

/* ---- module-level scratch. The hot path allocates nothing. ---- */
const _dir = new THREE.Vector3();
const _aim0 = new THREE.Vector3();       // the aim at the trigger pull, before the kick (fire())
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();
const _mdir = new THREE.Vector3();
const _MODS = [1, 1, 1];          // scratch for _stanceMods; never escapes
// Scratch spec for the STAT fallback path of hold-breath. The hook returns its own frozen
// module-scope object (nodes.js HOLD_BREATH) and that is used as handed; this exists only so
// the fallback cannot allocate either. Read and discarded inside the same call.
const _breathSpec = { swayMul: 1, seconds: 0 };

export class Weapons {
  static id = 'weapons';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('weapon-recoil');
    this.spreadRng = ctx.rng.fork('weapon-spread');

    // --- the arsenal (ROUND 5). One ammo record per def, allocated here so a swap in
    // step() writes into a record that already exists. select() saves the outgoing gun
    // into its record and loads the incoming one, so ammo is REMEMBERED across swaps.
    this.owned = ['bolt'];
    this._rec = {};
    // One frozen def object PER WEAPON, built here and only pointed at by select(), so the
    // swap that select()s at its midpoint inside step() allocates nothing (verification
    // round 1: the first cut built the def literal on every selection).
    this._defs = {};
    for (const id in CFG.weapons.defs) {
      const b = CFG.weapons.defs[id];
      this._rec[id] = { ammo: b.mag, reserve: b.reserve, chambered: true, parked: null };
      if (EXTRA[id]) this._defs[id] = this._makeDef(id);
    }
    this.swapT = -1;               // -1 = not swapping; else seconds into the swap
    this.swapTo = null;
    this._pendingSwap = null;      // a grant's raise that arrived mid-melee or mid-swap
    this._grantPayload = { id: '' };
    this._arsenalSynced = false;   // the lazy read of places.claimed, done at the first step
    this._autoReload = false;      // true while the gun in the hands is empty with reserve (derived each step)
    this.grantCount = 0;
    this.swapCount = 0;
    this.lowered = false; this.lowerT = 0;          // D1: the stance, X's toggle (C21: the HUD reads both)
    this._raiseEaten = false;                        // this step's fire/aim/melee press was spent raising the gun
    this._lowerClock = 0; this._shopLowerUntil = -Infinity;
    this._shopWas = false;                           // C7: a shop menu was open last step
    this.primed = false;                             // D3: an active-reload hit; every round until the next reload hits harder
    this.dryFlashT = 0;                              // C21: seconds of the HUD's dry-click flash left
    // The shotgun's beat sheet, written in place by _startTubeReload (EXTRA.shotgun `tube`).
    this._tubeBeats = [];
    for (let k = 0; k < TUBE_BEATS_MAX; k++) this._tubeBeats.push(['shell', 0]);

    this.select('bolt');           // M0 ships with the bolt rifle selected

    // --- input edge detection. We only ask the engine for four booleans and
    // derive every "pressed" ourselves, so this file survives whatever shape
    // ctx.input settles into. Requested names are in HANDOFF.
    // `sprint` is read (never written) for two HANDS verbs only: it is the button that
    // runs OUT of a reload, and the button that holds your breath while you are aimed.
    // Those two can share it because they cannot happen at once — see _input().
    this._prev = { fire: false, aim: false, reload: false, melee: false, sprint: false, swap: false, swapprev: false, slot1: false, slot2: false, slot3: false, slot4: false, lower: false };
    this._in = { fire: false, aim: false, reload: false, melee: false, sprint: false, swap: false, swapprev: false, slot1: false, slot2: false, slot3: false, slot4: false, lower: false };

    // The grant. 'place:claimed' {id, xp} is places.js's own channel (CONTRACT bus vocabulary).
    // ROUND 6: the row's `reward` decides the gun; an owned gun is paid a full reserve.
    // 'pickup:ammo' {n} is lane F's caches: rounds for the gun in the hands.
    this.rewardCount = 0;          // grants + ammo payments made through the reward path
    this.ammoPickups = 0;
    if (ctx.bus && typeof ctx.bus.on === 'function') {
      ctx.bus.on('place:claimed', (p) => {
        const row = p && p.id !== undefined ? MAJOR_BY_ID[p.id] : null;
        if (row && row.reward) this.reward(row.reward);
      });
      ctx.bus.on('pickup:ammo', (p) => {
        const n = p ? Math.floor(+p.n) : 0;
        if (n > 0) { this.ammoPickups++; this.addReserve(n); }
      });
      ctx.bus.on('prompt',p=>{
        // The existing shop/payment prompt owns low-ready; leaving it restores
        // the player's chosen stance rather than overwriting that choice.
        if((p?.label||'E')==='E'&&/\b(COINS|BUY|PAY|REPAIR)\b/.test((p.detail||'')+' '+(p.subdetail||'')))this._shopLowerUntil=this._lowerClock+.16;
      });
    }

    // --- counter-input tracking (see the header). Seeded on first step.
    this._lastCamYaw = null;
    this._lastCamPitch = 0;

    // --- the pulse queue the viewmodel drains. Fixed pool, never grows.
    this.pulses = [];
    this.pulseCount = 0;
    for (let i = 0; i < 24; i++) {
      this.pulses.push({ type: '', index: 0, mW: 1, subT: 0, adsT: 0, name: '' });
    }

    // --- the single reused weapon:fire payload. Listeners MUST consume it
    // synchronously; nothing may retain it. This is what keeps a shot from
    // allocating inside step().
    this._firePayload = {
      weapon: 'bolt', ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 1,
      subT: 0, index: 0, tracer: false, lowAmmo: false, loud: 26,
      pellets: 1, pellet: 0, spreadDeg: 0,
      dmgMul: 1,                 // D3: the primed magazine's multiplier; combat.resolveShot multiplies by it
    };
    this._reloadPayload = { phase: 'start', name: '', empty: false, ammo: 0, reserve: 0, credited: false };

    // --- state the viewmodel reads. One object, mutated, never replaced.
    this.vmState = {
      adsT: 0, firing: false, sinceShot: 99, ammo: 0, mag: 1, chambered: true,
      sprinting: false, reloading: null, melee: null, meleeSpec: MELEE,
      cycle: 0, cycleLen: 0, weapon: 'bolt', empty: false,
      // HANDS. `swayMul` is 1 unless the breath is held, so the viewmodel needs no
      // knowledge of the skill tree at all — it just multiplies by what it is handed.
      swayMul: 1, breathHeld: false, breathLeft: 0,
      // ROUND 5: the swap motion. swapT is 0..1 progress while swapping, else -1.
      swapping: false, swapT: -1,
      lowered:false,lowerT:0,
    };
    // select() ran before vmState existed; publish the selected weapon now.
    this.vmState.weapon = this.def.id; this.vmState.mag = this.def.mag;

    this.flashEV = 0;              // post.js reads this for the exposure transient
    this.fireTimes = [];           // ideal sim-time of each shot (the feel gate reads it)
    this.fireCount = 0;
    this.meleeCount = 0;
  }

  /* ---------------------------------------------------------------------- */

  /**
   * Put weapon `id` in the hands, immediately, with no motion. The player never reaches this
   * directly — swap()/slot()/grant() run the SWAP_S lower-and-raise and call it at the
   * midpoint. Ammo, reserve, the chambered flag and a parked reload are saved into the
   * outgoing gun's record and restored from the incoming one (ROUND 5: "remembered across
   * swaps, not reset by select()").
   */
  select(id) {
    const def = this._defs && this._defs[id];
    if (!def) throw new Error('weapons: no def for ' + id);

    if (this.def && this._rec && this._rec[this.def.id]) {
      const out = this._rec[this.def.id];
      out.ammo = this.ammo; out.reserve = this.reserve; out.chambered = this.chambered;
      out.parked = this._parked || null;
    }
    const rec = this._rec ? this._rec[id] : null;

    // Read everywhere, written nowhere; built once per weapon in the constructor.
    this.def = def;

    this.ammo = rec ? rec.ammo : this.def.mag;
    this.reserve = rec ? rec.reserve : this.def.reserve;
    this.reserveMax = this.def.reserve * 2;
    this.chambered = rec ? rec.chambered : true;
    this.fireClock = this.def.interval;   // primed: the first pull is instant
    this.firing = false;
    this.shotIndex = 0;
    this.sinceShot = 99;
    this.kickPitch = 0; this.kickYaw = 0;
    this.recoverP = 0; this.recoverY = 0; this.recovering = false;
    this.bloom = 0;
    this.adsT = 0; this.fullyAdsFor = 0;
    this.sprintOutTimer = 0;
    this.buffered = 0; this.meleeBuffered = 0;
    this.reloading = null;
    this.dryLatch = false; this.dryHeld = 0;
    this.melee = null;
    this.cycle = 0;                        // bolt-throw clock, 0 = not cycling
    // A parked reload belongs to the gun it was parked from. It travels in that gun's
    // record, so a swap never resumes somebody else's beat sheet at somebody else's
    // timestamp — and coming back to the gun finds its own park where it was left.
    this._parked = rec ? rec.parked : null;
    // An EMPTY gun coming into the hands with rounds in reserve reloads itself the moment it
    // is up: the AUTO-RELOAD rule in step() is derived from ammo/reserve every step, so it
    // needs no arming here. Measured before the rule: the bolt swapped back in at 0 with 20
    // in reserve sat empty for 4 s and clicked.
    this.breathHeld = false;
    this.breathLeft = null;                // null = "no hold-breath verb / not seeded yet"
    this.breathSway = 1;                   // 1 = the gun exactly as it ships
    if (this.vmState) {
      this.vmState.weapon = id; this.vmState.mag = this.def.mag;
      this.vmState.swayMul = 1; this.vmState.breathHeld = false; this.vmState.breathLeft = 0;
    }
    if (this._firePayload) this._firePayload.weapon = id;
  }

  /** The frozen per-weapon def. Called once per def in the constructor, never in step(). */
  _makeDef(id) {
    const base = CFG.weapons.defs[id];
    if (!base) throw new Error('weapons: no def for ' + id);
    const extra = EXTRA[id];
    if (!extra) throw new Error('weapons: no fire-mode extras for ' + id);
    return {
      id,
      rpm: base.rpm, mag: base.mag, reserve: base.reserve,
      dmg: base.dmg, headMul: base.headMul,
      spreadHip: base.spreadHip, spreadAds: base.spreadAds,
      kick: base.kick ?? extra.pattern[0][0],
      settle: base.settle ?? CORE.recoilHalfLife,
      loud: base.loud,
      pellets: base.pellets ?? 1,
      range: base.range ?? MAXT,
      auto: extra.auto,
      pattern: extra.pattern,
      sustainPitch: extra.sustainPitch,
      sustainYaw: extra.sustainYaw,
      bands: extra.bands,
      reloadTac: extra.reloadTac, reloadEmpty: extra.reloadEmpty,
      tube: !!extra.tube,
      cycle: extra.cycle,
      surface: extra.surface,
      interval: 60 / base.rpm,
    };
  }

  async init() {
    // The test API is engine-owned and filled by each system (CONTRACT).
    // Additive only: we create the bag if it is not there and claim one key.
    if (typeof window !== 'undefined') {
      const T = (window.__CURFEW = window.__CURFEW || {});
      T.weapons = {
        dump: () => this.dump(),
        select: (id) => this.select(id),
        def: () => this.def,
        loudness: () => this.loudness,
        fireTimes: () => this.fireTimes,
        // ROUND 5: the arsenal.
        owned: () => this.owned.slice(),
        has: (id) => this.has(id),
        grant: (id, opts) => this.grant(id, opts),
        swap: (dir) => this.swap(dir),
        slot: (n) => this.slot(n),
        ammoState: () => this.ammoState(),
        // ROUND 6
        reward: (id) => this.reward(id),
        addReserve: (n) => this.addReserve(n),
        addReserveAll: (frac) => this.addReserveAll(frac),
        reserveOf: (id) => this.reserveOf(id),
        serialize: () => this.serialize(),
      };
    }
  }

  /* ---- the arsenal (ROUND 5) ------------------------------------------ */

  has(id) { return this.owned.indexOf(id) >= 0; }

  /**
   * Add a weapon to the arsenal. Emits 'weapon:granted' {id} on the bus and raises the new
   * gun into frame through the swap motion — the grant moment must be NOTICED without a word
   * on screen, and the gun rising into the hands is that notice. `quiet` is the returning-
   * save path: the weapon is owned, nothing plays, the bolt stays in the hands and Q swaps.
   * Returns true only when something was actually granted.
   */
  grant(id, opts) {
    if (!CFG.weapons.defs[id] || !EXTRA[id]) return false;
    if (this.has(id)) return false;
    this.owned.push(id);
    this.grantCount++;
    if (opts && opts.quiet) return true;
    this._grantPayload.id = id;
    this.ctx.bus.emit('weapon:granted', this._grantPayload);
    // The rise IS the notice — there is no word on screen and Q is not on the pause card, so
    // a grant that does not raise the gun is a feature that never reached the player.
    // _beginSwap refuses mid-melee and mid-swap, and the mine's claim is a 2.8 m touch at the
    // winding-house breaker reached with the pack on you: verification round 2 measured a
    // claim landing during a hatchet swing and the carbine was owned, announced and INVISIBLE
    // for the rest of the game (swapCount 0 five seconds later, the bolt still in the hands).
    // So a refused grant-swap is QUEUED and step() begins it the first step the hands are free.
    if (!this._beginSwap(id)) this._pendingSwap = id;
    return true;
  }

  /**
   * ROUND 6: what a claim pays. A gun you do not own is GRANTED (and rises into the hands,
   * grant()'s own notice); a gun you already own is paid a full reserve of its ammo, into its
   * own record — or straight into the hands if it is the gun you are holding. Returns
   * 'grant', 'ammo' or null (no such def).
   */
  reward(id) {
    if (!CFG.weapons.defs[id] || !EXTRA[id]) return null;
    if (!this.has(id)) {
      this.grant(id);
      this.rewardCount++;
      return 'grant';
    }
    this.addReserveTo(id, CFG.weapons.defs[id].reserve);
    this.rewardCount++;
    return 'ammo';
  }

  /** Rounds in reserve for `id`: the live gun's, or its parked record's. */
  reserveOf(id) {
    if (this.def && this.def.id === id) return this.reserve;
    const rec = this._rec[id];
    return rec ? rec.reserve : 0;
  }

  /** Rounds into ONE gun's reserve, capped at twice its base: the live gun's, or its record's. */
  addReserveTo(id, n) {
    n = Math.floor(+n) || 0;
    if (n <= 0) return 0;
    if (this.def && this.def.id === id) {
      const got = Math.max(0, Math.min(n, this.reserveMax - this.reserve));
      this.reserve += got;
      return got;
    }
    const rec = this._rec[id], base = CFG.weapons.defs[id];
    if (!rec || !base) return 0;
    const max = base.reserve * 2;                 // the same ceiling select() gives the live gun
    const got = Math.max(0, Math.min(n, max - rec.reserve));
    rec.reserve += got;
    return got;
  }

  /**
   * D8: every ammo source spreads. `n` rounds into EVERY owned gun, each capped at its own
   * ceiling; returns the total credited. Crates, caches, digs and pickups all land here, so
   * the shotgun you are not holding is never the one gun that stays dry.
   */
  addReserve(n) {
    let total = 0;
    for (let k = 0; k < this.owned.length; k++) total += this.addReserveTo(this.owned[k], n);
    return total;
  }

  /** D7: the shop's one AMMUNITION row. One base bundle x `frac` into every owned gun. */
  addReserveAll(frac = 1) {
    let total = 0;
    for (let k = 0; k < this.owned.length; k++) {
      const id = this.owned[k], base = CFG.weapons.defs[id];
      if (base) total += this.addReserveTo(id, Math.round(base.reserve * frac));
    }
    return total;
  }

  /** Q and wheel down: the next owned weapon. Wheel up (dir -1): the previous. */
  swap(dir = 1) {
    if (this.owned.length < 2) return false;
    const cur = this.swapTo || this.def.id;
    const n = this.owned.length;
    const i = this.owned.indexOf(cur);
    return this._beginSwap(this.owned[(i + (dir < 0 ? -1 : 1) + n) % n]);
  }

  /** 1-4: pick a slot directly. */
  slot(n) {
    const id = this.owned[n];
    return id ? this._beginSwap(id) : false;
  }

  /**
   * Start the SWAP_S lower-and-raise. Refused mid-melee, mid-swap, and for the gun already
   * in the hands. A live reload is PARKED (D3: base behaviour, the next R resumes it) and a
   * primed magazine is a magazine you put down (D3).
   */
  _beginSwap(id) {
    if (!id || !CFG.weapons.defs[id]) return false;
    if (id === this.def.id || this.melee || this.swapT >= 0) return false;
    if (this.reloading) this._cancelReload(true);
    this.primed = false;
    this.swapTo = id;
    this.swapT = 0;
    this.swapCount++;
    const pu = this._pulse('swap:start');
    if (pu) pu.name = id;
    return true;
  }

  /**
   * The returning save, read LAZILY at the first step and never at construction. The save's
   * claimed list (progression/save.js, key curfew.eleven) is restored by progress.js:324
   * into progress.claimed - progress's OWN Set. places.claimed is NOT restored from the save
   * (places.js:482 seeds startClaimed and nothing else), so asking places alone finds
   * nothing on a returning boot. Verification round 1 measured the first cut, which asked
   * places: claim the mine, reload the page, owned came back ['bolt'] while the save still
   * said weeping-mine. Both systems are asked; either is enough. A returning save that
   * already holds the mine owns the carbine from the first step, quietly (no motion, no bus,
   * the bolt in the hands, Q swaps).
   */
  _syncArsenal() {
    this._arsenalSynced = true;
    const pl = this._sys('places');
    const pr = this._sys('progress');
    // C2 / D9 FIRST: the save's own arsenal (progress.save.data.arsenal, written from
    // serialize() at every flush). Owned order as bought, each gun's magazine and reserve as
    // they were, the bolt in the hands. An older save has an empty list here and falls
    // through to the flags and the claimed rewards below, which still grant.
    const ars = pr && pr.save && pr.save.data ? pr.save.data.arsenal : null;
    if (ars && Array.isArray(ars.owned)) {
      for (let k = 0; k < ars.owned.length; k++) this.grant(ars.owned[k], { quiet: true });
      const rec = ars.rec && typeof ars.rec === 'object' ? ars.rec : null;
      if (rec) for (const id in rec) this._restoreRec(id, rec[id]);
    }
    // Shop purchases and the merchant's death reward do not claim a destination.
    // Restore their saved ownership before play, with the same quiet grant path.
    for (const id of Object.keys(EXTRA)) {
      if (pr?.flag?.('dealer:weapon:' + id)) this.grant(id, { quiet: true });
    }
    // ROUND 6: every reward row, not one. A returning save that holds a place owns its gun
    // from the first step, quietly; the ammo a second claim pays is not replayed (it was
    // paid when it happened, and the save does not carry reserves).
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      if (!d.reward) continue;
      const viaPlaces = !!pl && (typeof pl.isClaimed === 'function'
        ? pl.isClaimed(d.id)
        : !!(pl.claimed && pl.claimed.has && pl.claimed.has(d.id)));
      const viaProgress = !!(pr && pr.claimed && typeof pr.claimed.has === 'function' && pr.claimed.has(d.id));
      if (viaPlaces || viaProgress) this.grant(d.reward, { quiet: true });
    }
  }

  /** One gun's saved magazine/reserve back into its record, or into the hands for the held gun. */
  _restoreRec(id, r) {
    const base = CFG.weapons.defs[id];
    if (!base || !this._rec[id] || !r || typeof r !== 'object' || !this.has(id)) return;
    const ammo = clamp(Math.floor(+r.ammo) || 0, 0, base.mag + 1);
    const reserve = clamp(Math.floor(+r.reserve) || 0, 0, base.reserve * 2);
    const chambered = ammo > 0 && r.chambered !== false;
    if (this.def && this.def.id === id) {
      this.ammo = ammo; this.reserve = reserve; this.chambered = chambered;
    } else {
      const rec = this._rec[id];
      rec.ammo = ammo; rec.reserve = reserve; rec.chambered = chambered;
    }
  }

  /**
   * C2 / D9: what the save keeps of the arsenal. progress calls this at flush time, never per
   * step, so the allocation is fine: owned order and each gun's magazine, reserve and chambered
   * flag, the held gun's taken from the hands. _syncArsenal reads it back on a returning save.
   */
  serialize() {
    const rec = {};
    for (let k = 0; k < this.owned.length; k++) {
      const id = this.owned[k], r = this._rec[id];
      if (!r) continue;
      rec[id] = this.def && this.def.id === id
        ? { ammo: this.ammo, reserve: this.reserve, chambered: this.chambered }
        : { ammo: r.ammo, reserve: r.reserve, chambered: r.chambered };
    }
    return { owned: this.owned.slice(), rec };
  }

  ready() { return !!this.def && this.pulses.length > 0; }

  dispose() { this.pulseCount = 0; }

  /* ---- what other owners read ------------------------------------------ */

  get loudness() { return this.melee ? MELEE.loud : this.def.loud; }
  get spreadDeg() { return this._cone(); }
  /**
   * True while the trigger, the aim button or a live reload should cancel a sprint.
   * A reload blocks the sprint UNLESS the HANDS 'Carry' node is owned — the whole point of
   * that node is that you can run out of a reload, so it must stop being a sprint block or
   * the verb it buys cannot be performed.
   *
   * ...OR unless the GUN started the reload itself (verification round 2). On master nothing
   * reloaded without R or a 0.7 s trigger hold, so this only ever blocked a sprint the player
   * had asked for. NEXT.md item 3 asks the gun to reload at zero on its own, and with this
   * line unchanged that turned into a 3.1 s refusal to run at 0 ammo with reserve — measured:
   * shift+forward held from 1.0 s after the last shot gave the first sprinting step at 3.1 s
   * and 20.1 m in 4 s, where master ran at 0.017 s and covered 26.0 m. Fleeing is the verb in
   * this game; a reload the player did not ask for may not take it away. An auto reload is
   * thrown away (or parked, with 'Carry') the moment the legs actually move, and the derived
   * rule in step() starts it again when they stop. A MANUAL reload is unchanged.
   */
  get wantsSprintCancel() {
    const i = this._input();
    if (this.lowered || this.lowerT > 0) return false;
    // D3: a reload never blocks the legs any more. Running PARKS it (the timeline in step())
    // and the next R resumes it where it was. Fleeing is the verb in this game.
    return i.fire || i.aim || this.buffered > 0;
  }
  ammoState() {
    return { ammo: this.ammo, reserve: this.reserve, reloading: !!this.reloading, chambered: this.chambered };
  }
  kickState() { return { pitch: this.kickPitch, yaw: this.kickYaw }; }
  meleeState() {
    return this.melee && {
      phase: this.melee.phase, t: this.melee.t,
      hasTarget: !!this.melee.target, struck: this.melee.struck,
    };
  }
  /** Fully lowered and idle: the controller pays the 1.25x travel boost while this is true. */
  get travelReady() { return this.lowered && this.lowerT >= .999 && !this.reloading && !this.melee; }

  _setLowered(on) {
    this.lowered = !!on;
    this.buffered = this.meleeBuffered = 0;
    if (on && this.melee) { this.melee = null; this._pulse('melee:end'); }
    if (on && this.reloading) this._cancelReload(true);   // D3: parked; the next R resumes it
    this.ctx.bus.emit('weapon:stance', { lowered: this.lowered });
  }

  /**
   * D1, THE STANCE. X TOGGLES lowered. While lowered, fire, aim, melee or R RAISE the gun and
   * that press is spent on the raise: a second click fires (presses during the 0.24 s rise are
   * buffered in step(), so the next click after the gun is up lands). R never lowers: with the
   * gun up it reloads, and during a reload it is the active-reload attempt, resolved ON THE
   * PRESS with the press-time sample (D2). Returns true when this press starts a reload.
   */
  _stepLowering(dt, i, reloadPressed, lowerPressed, raiseEdge, dead) {
    this._lowerClock += dt;
    this._raiseEaten = false;
    let reloadTap = false;
    if (!dead) {
      if (lowerPressed) this._setLowered(!this.lowered);
      else if (this.lowered && (raiseEdge || reloadPressed)) { this._setLowered(false); this._raiseEaten = raiseEdge; }
      else if (reloadPressed) {
        if (this.reloading) this._activeReloadPress(this.reloading.t);
        else reloadTap = true;
      }
    }
    // The shop/payment prompt's low-ready (the 'prompt' listener in the constructor): the gun
    // dips while you are paying and lifts the moment you ask for it. That first press is spent
    // on the lift, exactly like a raise from X, so paying never turns into a shot.
    const shopHeld = this._lowerClock <= this._shopLowerUntil;
    const shop = shopHeld && !i.fire && !i.aim && !i.melee;
    if (raiseEdge && !this.lowered && shopHeld && this.lowerT > .001) this._raiseEaten = true;
    const target = this.lowered || shop;
    this.lowerT = clamp01(this.lowerT + (target ? dt / LOWER_IN_S : -dt / LOWER_OUT_S));
    return reloadTap;
  }

  // Perks recover a real cartridge into the current magazine; excess is never minted.
  recoverRound(n = 1) {
    const got = Math.max(0, Math.min(Math.floor(n), this.def.mag - this.ammo));
    this.ammo += got;
    if (got) { this.chambered = true; this.dryLatch = false; }
    return got;
  }

  dump() {
    return {
      weapon: this.def.id, ammo: this.ammo, reserve: this.reserve,
      owned: this.owned.slice(), swapT: this.swapT, swapTo: this.swapTo,
      pendingSwap: this._pendingSwap,
      autoReload: this._autoReload, grantCount: this.grantCount, swapCount: this.swapCount,
      rewardCount: this.rewardCount, ammoPickups: this.ammoPickups,
      blocksSprint: this.wantsSprintCancel,
      lowered: this.lowered, lowerT: this.lowerT, travelReady: this.travelReady,
      primed: this.primed, dryFlashT: this.dryFlashT,
      adsT: this.adsT, spreadDeg: this._cone(), bloom: this.bloom,
      kickPitch: this.kickPitch, kickYaw: this.kickYaw,
      shotIndex: this.shotIndex, fireClock: this.fireClock,
      sprintOutTimer: this.sprintOutTimer, fireCount: this.fireCount,
      meleeCount: this.meleeCount, loud: this.loudness,
      reloading: this.reloading && {
        t: this.reloading.t, dur: this.reloading.dur, empty: this.reloading.empty, auto: !!this.reloading.auto,
        rate: this.reloading.rate,
        from: this.reloading.activeFrom, to: this.reloading.activeTo,
        used: this.reloading.activeUsed, hit: this.reloading.activeHit,
      },
      parked: this._parked && { t: this._parked.t, empty: this._parked.empty },
      breathHeld: this.breathHeld, breathLeft: this.breathLeft,
      swayMul: this.breathSway, canResume: this._canResumeReload(),
      melee: this.meleeState(),
    };
  }

  /** The viewmodel calls this once per step, immediately after ours. */
  drainPulses(fn) {
    for (let i = 0; i < this.pulseCount; i++) fn(this.pulses[i]);
    this.pulseCount = 0;
  }

  _pulse(type) {
    // Fixed pool. If 24 pulses land in one step something is very wrong and
    // dropping the overflow is better than growing the array in the hot path.
    if (this.pulseCount >= this.pulses.length) return null;
    const p = this.pulses[this.pulseCount++];
    p.type = type; p.index = 0; p.mW = 1; p.subT = 0; p.adsT = 0; p.name = '';
    return p;
  }

  /* ---- siblings, read LAZILY at use ------------------------------------ */

  _sys(id) { return this.ctx.systems && this.ctx.systems.get(id); }

  /**
   * THE SKILL TREE'S HANDS BRANCH, read LAZILY at use and never captured.
   *
   * `progress` is manifest entry 20 and weapons is 13, so it does not exist when this file
   * is constructed and in an M0 build it never exists at all. Every read below is guarded
   * and every absent perk leaves the gun behaving EXACTLY as it does today.
   *
   * WHICH INTERFACE, AND WHY IT MATTERS: the HANDS installers in progression/nodes.js
   * (hands_1..hands_4) register HOOKS and deliberately write no stat — `void s;` is the
   * first line of each of them. So reading `progress.stats.activeReload` would have found
   * 0 forever and this whole branch would have stayed inert while looking wired, which is
   * the exact failure class this round exists to end. The declared call is
   * `progress.perk(name, base, arg)` (progress.js: "THE TWO CALLS EVERY OTHER LANE
   * MAKES"), and HOOK_POINTS in nodes.js names weapons as the runner for `holdBreath` and
   * `reloadSpeed` (D2/D3 retired `reloadWindow` and `reloadResume`: the active window and
   * reload parking are base behaviour, so no node sells them). progress.hookReport() marks
   * a hook with installers and zero runs as `dead`; these stop being dead here.
   *
   * `_stats()` stays as a second-best fallback so that if a future node writes the stat
   * instead of installing the hook, the verb still exists.
   */
  _perk(name, base, arg) {
    const pr = this._sys('progress');
    if (!pr || typeof pr.perk !== 'function') return base;
    const v = pr.perk(name, base, arg);
    return v === undefined ? base : v;
  }

  _stats() {
    const pr = this._sys('progress');
    const s = pr && pr.stats;
    return (s && typeof s === 'object') ? s : null;
  }

  _input() {
    // Four booleans is the whole contract with the engine's input layer. Every
    // edge is derived here so a missing `firePressed` cannot silently disarm
    // the input buffer.
    const i = this.ctx.input || {};
    const o = this._in;                 // reused: step() runs this every frame
    o.fire = !!(i.fire ?? i.shoot);
    o.aim = !!(i.aim ?? i.ads);
    o.reload = !!i.reload;
    o.melee = !!i.melee;
    // The engine's Input exposes getters for fire/aim/ads/reload/melee/torch and NOT sprint
    // (engine/input.js), so the two named reads fall through to held('sprint') - the same
    // held set the getters wrap. Verification round 1: before this line the read was always
    // false, and the HANDS 'Carry' park and 'Hold' breath (both keyed on it) could never run.
    const held = typeof i.held === 'function';
    o.sprint = !!(i.sprint ?? i.run ?? (held && i.held('sprint')));
    // The three arsenal keys (engine/input.js KEYMAP: KeyQ, Digit1, Digit2) are not in the
    // engine's ACTIONS list, so they arrive through held() rather than a named getter.
    o.swap = held ? i.held('swap') : !!i.swap;
    o.swapprev = held ? i.held('swapprev') : !!i.swapprev;
    o.slot1 = held ? i.held('slot1') : !!i.slot1;
    o.slot2 = held ? i.held('slot2') : !!i.slot2;
    o.slot3 = held ? i.held('slot3') : !!i.slot3;
    o.slot4 = held ? i.held('slot4') : !!i.slot4;
    o.lower = held ? i.held('lower') : !!i.lower;
    // In the car, or with a shop menu open (C7: shop-menu.js sets ctx.shared.shopOpen on every
    // step a menu shows and reads the fire/number edges itself), the gun hears nothing:
    // nothing fires, nothing swaps, nothing lowers.
    const sh = this.ctx.shared;
    if (sh && (sh.inCar || sh.shopOpen)) {
      o.fire = o.aim = o.reload = o.melee = o.swap = o.swapprev = o.lower = false;
      o.slot1 = o.slot2 = o.slot3 = o.slot4 = false;
    }
    return o;
  }

  /* ---- spread / stance ------------------------------------------------- */

  _stanceMods(out) {
    const p = this._sys('player');
    let m = this.adsT > 0.55
      ? (p && p.crouched ? MOD.crouchAds : MOD.ads)
      : (p && p.crouched ? MOD.crouch : MOD.hip);
    out[0] = m[0]; out[1] = m[1]; out[2] = m[2];
    if (p && p.grounded === false) {
      out[0] *= MOD.air[0]; out[1] *= MOD.air[1]; out[2] *= MOD.air[2];
    } else if (p && p.speed > 3) {
      out[0] *= MOD.moving[0]; out[1] *= MOD.moving[1]; out[2] *= MOD.moving[2];
    }
    return out;
  }

  _cone() {
    const p = this._sys('player');
    const d = this.def;
    const moving = !!(p && p.speed > 0.5);
    const ads = this.adsT > 0.55;
    let cone = ads
      ? d.spreadAds * (moving ? WALK_MUL.ads : 1)
      : d.spreadHip * (moving ? WALK_MUL.hip : 1);
    if (p && p.crouched) cone *= 0.78;
    if (p && p.grounded === false) cone *= 2.40;
    if (p && p.sliding) cone *= 1.35;
    // Sprint-out: the gun is not up yet and the game must say so. vigil:105.
    if (this.sprintOutTimer > 0) {
      cone = lerp(cone, Math.max(cone, 4.600), clamp01(this.sprintOutTimer / 0.220));
    }
    cone += this.bloom;
    // HANDS 'Hold': held breath is not only a still viewmodel, or it is decoration. The
    // same multiplier the sway gets is applied to the cone, so the node buys a shot you
    // can feel as well as see. breathSway is 1 unless step() said otherwise this frame,
    // and it can only be anything else while the node is owned.
    if (this.breathSway !== 1) cone *= this.breathSway;
    // First-shot-perfect: within 250 ms of completing ADS, shot 1 is exact.
    if (this.adsT >= 0.999 && this.fullyAdsFor <= 0.250 && this.shotIndex === 0) cone = 0;
    return cone;
  }

  /* ---- reload ----------------------------------------------------------- */

  /**
   * @param auto true when the AUTO-RELOAD rule in step() started it rather than the player.
   *   A reload the GUN decided on must never take a verb away from the player: `auto` is what
   *   wantsSprintCancel and the sprint branch of the reload timeline read (verification round
   *   2 measured the cost of not marking it - 3.1 s of refused sprint at 0 ammo with reserve,
   *   in a game where running is the answer to everything).
   */
  _startReload(auto = false) {
    if (this.reloading || this.reserve <= 0) return;
    const d = this.def;
    const empty = this.ammo === 0;
    if (this.ammo >= d.mag + (this.chambered ? 1 : 0)) return;
    // C6: the reduce hook 'reloadSpeed' (base 1; hands_3 'Steady' installs 0.8 = 20% faster).
    // The beats and the active window scale with the duration, so they stay on the motion.
    const spd = this._perk('reloadSpeed', 1, d.id);
    const speed = spd > 0 ? spd : 1;
    if (d.tube) { this._startTubeReload(auto, empty, speed); return; }

    const dur = (empty ? d.reloadEmpty : d.reloadTac) * speed;
    const ref = empty ? BEATS_REF_EMPTY : BEATS_REF_TAC;
    const scale = dur / ref;

    // D3, base behaviour: a parked reload comes back where it was left, beats already played
    // and ammo already credited, primed if the hit was already taken. Only a park of the SAME
    // shape resumes: an empty reload does not resume into a tactical one, because they are
    // different choreography and different durations and splicing them would credit the
    // wrong number of rounds.
    const park = this._parked;
    if (park && park.empty === empty) {
      this._parked = null;
      this.reloading = {
        auto: auto || !!park.auto,
        empty, t: park.t, dur, scale,
        beats: park.beats, beatN: park.beatN,
        bi: park.bi, credited: park.credited, cancelable: park.cancelable,
        rate: park.rate,
        activeFrom: park.activeFrom, activeTo: park.activeTo, activeMul: park.activeMul,
        activeUsed: park.activeUsed, activeHit: park.activeHit,
      };
      this._emitReload('start', 'resume');
      const rp = this._pulse('reload:start');
      if (rp) rp.name = 'resume';
      return;
    }
    this._parked = null;
    this.primed = false;                 // D3: a fresh reload ends the primed magazine

    const beats = empty ? BEATS_EMPTY : BEATS_TAC;
    this.reloading = {
      auto,
      empty, t: 0, dur, scale,
      beats, beatN: beats.length,
      bi: 0, credited: false, cancelable: false,
      rate: 1,
      activeFrom: -1, activeTo: -1, activeMul: 1, activeUsed: false, activeHit: false,
    };
    this._setWindow(this.reloading, scale, dur);
    this._emitReload('start', '');
    const pu = this._pulse('reload:start');
    if (pu) pu.name = empty ? 'empty' : 'tac';
  }

  /**
   * The shotgun (def.tube): one 'shell' beat per round needed, each shell CREDITED the moment it
   * goes in, so an interrupted reload keeps every shell already in and a new R simply loads the
   * rest. The first shell of an empty gun takes reloadEmpty (it is also chambered), every other
   * shell reloadTac, then TUBE_CLOSE_S brings the hand back. 'cancelopen' sits on the first
   * shell: after that, the trigger or the sight cancels and fires what is in. The active window
   * sits inside the first shell's interval. A tube reload is never parked - there is nothing
   * to park, the shells are in the gun.
   */
  _startTubeReload(auto, empty, speed) {
    const d = this.def;
    this._parked = null;
    this.primed = false;
    const cap = d.mag + (empty ? 0 : 1);
    const need = Math.max(1, Math.min(cap - this.ammo, this.reserve, TUBE_BEATS_MAX - 1));
    const first = (empty ? d.reloadEmpty : d.reloadTac) * speed;
    const each = d.reloadTac * speed;
    const beats = this._tubeBeats;
    let n = 0, t = first;
    for (let k = 0; k < need; k++) {
      const b = beats[n++]; b[0] = 'shell'; b[1] = t;
      if (k === 0) { const c = beats[n++]; c[0] = 'cancelopen'; c[1] = t; }
      t += each;
    }
    const dur = t - each + TUBE_CLOSE_S;
    this.reloading = {
      auto, empty, t: 0, dur, scale: 1,           // tube beats are authored in real seconds
      beats, beatN: n,
      bi: 0, credited: false, cancelable: false,
      rate: 1,
      activeFrom: -1, activeTo: -1, activeMul: 1, activeUsed: false, activeHit: false,
    };
    this._setWindow(this.reloading, first / BEATS_REF_TAC, first);
    this._emitReload('start', '');
    const pu = this._pulse('reload:start');
    if (pu) pu.name = empty ? 'empty' : 'tac';
  }

  /**
   * D2: the active window onto a reload that has just started. BASE_ACTIVE is the window on
   * every gun (D2/D3 retired the 'reloadWindow' hook: no node widens or sells it). Scaled
   * by `scale` like every beat, floored at ACTIVE_MIN_S wide, and kept inside `limit` (the
   * reload, or the tube's first shell).
   */
  _setWindow(r, scale, limit) {
    const f = BASE_ACTIVE.from, t = BASE_ACTIVE.to, m = BASE_ACTIVE.mul;
    const from = f * scale;
    const to = Math.min(Math.max(t * scale, from + ACTIVE_MIN_S), limit - 0.02);
    if (!(to > from)) return;                    // a reload too short for a window has none
    r.activeFrom = from; r.activeTo = to; r.activeMul = m;
  }

  /**
   * R pressed DURING a reload: the active-reload attempt (D2), resolved on the press with the
   * press-time sample. One attempt per reload - a mashed button must not be a free retry, or
   * the window is not a window. A hit runs the rest of the reload at activeMul and, when the
   * HANDS 'Primed' stat says so (D3), makes every round until the next reload hit harder. A
   * miss costs nothing: the reload just goes on.
   */
  _activeReloadPress(at) {
    const r = this.reloading;
    if (!r || r.activeFrom < 0 || r.activeUsed) return;
    r.activeUsed = true;
    const time = Number.isFinite(at) ? at : r.t;
    if (time < r.activeFrom || time > r.activeTo) return;
    r.rate = r.activeMul;                 // the REST of the reload runs faster
    r.activeHit = true;
    this.primed = this._primedMul() > 1;
    this._emitReload('beat', 'active');
    const pu = this._pulse('reload:beat');
    if (pu) pu.name = 'active';
  }

  /** D3: the HANDS 'Primed' damage multiplier (stats.primedMul, hands_1 sets 1.5); 1 with nothing owned. */
  _primedMul() {
    const st = this._stats();
    const m = st ? +st.primedMul : 1;
    return m > 0 ? m : 1;
  }

  /** D3: parking is base behaviour. Kept as a method because dump() and tests/weapon.mjs read it. */
  _canResumeReload() { return true; }

  /** True while THIS reload could be parked (a tube reload keeps its shells instead). */
  _canParkReload() {
    return !!this.reloading && !this.def.tube;
  }

  /** One shell into the tube (def.tube). Credited per beat, so an interrupted reload keeps it. */
  _creditShell() {
    const r = this.reloading;
    if (this.reserve <= 0 || this.ammo >= this.def.mag + 1) return;
    this.ammo++;
    this.reserve--;
    this.chambered = true;
    r.credited = true;
  }

  _creditReload() {
    const r = this.reloading, d = this.def;
    const keep = r.empty ? 0 : this.ammo;
    const want = d.mag + (keep > 0 ? 1 : 0) - keep;
    const take = Math.min(want, this.reserve);
    this.ammo = keep + take;
    this.reserve -= take;
    this.chambered = this.ammo > 0;
    r.credited = true;
  }

  /**
   * @param park true to keep the progress for a later resume (D3: a sprint, a swap, X).
   *        Anything that cancels a reload for a REASON OTHER than running out of it - the
   *        trigger, the aim button, a melee swing - throws it away, so those three buttons
   *        mean exactly what they always meant. A tube reload is never parked (its shells
   *        are already in the gun; see _startTubeReload).
   */
  _cancelReload(park = false) {
    const r = this.reloading;
    if (!r) return;
    if (park && this._canParkReload()) {
      this._parked = {
        auto: !!r.auto,
        weapon: this.def.id, empty: r.empty, t: r.t,
        beats: r.beats, beatN: r.beatN, bi: r.bi,
        credited: r.credited, cancelable: r.cancelable, rate: r.rate,
        activeFrom: r.activeFrom, activeTo: r.activeTo, activeMul: r.activeMul,
        activeUsed: r.activeUsed, activeHit: r.activeHit,
      };
    } else {
      this._parked = null;
    }
    this._emitReload('cancel', this._parked ? 'park' : '');
    this.reloading = null;
    this._pulse('reload:end');
  }

  _emitReload(phase, name) {
    const p = this._reloadPayload;
    p.phase = phase; p.name = name;
    p.empty = !!(this.reloading && this.reloading.empty);
    p.credited = !!(this.reloading && this.reloading.credited);
    p.ammo = this.ammo; p.reserve = this.reserve;
    this.ctx.bus.emit('weapon:reload', p);
  }

  /* ---- the shot --------------------------------------------------------- */

  _fire(subT) {
    const ctx = this.ctx, d = this.def;
    const cam = this._sys('camera');
    const p = this._sys('player');
    if (!cam || !p) return;

    this.ammo--;
    this.chambered = this.ammo > 0;
    // ROUND 5: the shot that empties the magazine is what the AUTO-RELOAD rule in step()
    // sees next step (ammo 0, reserve > 0); it starts the reload once the bolt throw is done.
    this.fireCount++;
    const idx = this.shotIndex++;
    this.sinceShot = 0;
    this.recovering = false;
    this.cycle = d.cycle;                    // start the bolt throw

    // ---------- recoil, three strictly separate channels ----------
    const mods = this._stanceMods(_MODS);
    const mA = mods[0], mV = mods[1], mW = mods[2];
    let pk, yk;
    if (idx < d.pattern.length) {
      pk = d.pattern[idx][0]; yk = d.pattern[idx][1];
    } else {
      pk = d.sustainPitch;
      yk = d.sustainYaw[(idx - d.pattern.length) % d.sustainYaw.length];
      const j = 1 + (this.rng.next() * 2 - 1) * 0.08;   // "Do not raise it." [cinderbloom]
      pk *= j; yk *= j;
    }
    // No extra first-shot multiplier: the authored table's opener IS the boost.
    // Applying it twice double-counts and breaks the pattern's degree sum.

    // CHANNEL 1 — aim kick. This moves the BULLETS THAT FOLLOW. It is written into the
    // camera's yaw/pitch (the only aim truth) and mirrored into an accumulator
    // that only CORE.recoilReturn of ever comes back.
    //
    // ROUND 6 repair: the ray of THIS shot is taken from the aim BEFORE the kick lands.
    // MEASURED 2026-09-03 (tests/artifacts/r1-bellhit-2.txt): standing still, full ADS, inside
    // the first-shot-perfect window (cone 0, shotIndex 0), the bolt's round left 2.2 degrees
    // ABOVE the crosshair from every one of four stances (aimDir y 0.516 -> fired dy 0.549),
    // because the opener's pitch kick was added to cam.pitch and then cam.aimDir() built the
    // ray from the kicked camera. That put the round 1.35 m over the Bell Tower's bell at 35 m
    // and made the rule below ("shot 1 is exact") a promise the gun never kept. The pattern's
    // numbers are untouched: the kick still moves the aim, for the next round.
    cam.aimDir(_aim0);
    const yaw0 = cam.yaw;
    cam.pitch += pk * mA * DEG;
    cam.yaw += -yk * mA * DEG;               // +yaw pattern = right = negative world yaw
    this.kickPitch += pk * mA;
    this.kickYaw += yk * mA;

    // CHANNEL 2 — view kick. Cosmetic, added at render, recovers fully, can
    // never corrupt aim (CFG.camera comment: juice is ADDED at render time).
    if (cam.addPunch) cam.addPunch(pk * 1.6 * mV, yk * 1.4 * mV, (idx % 2 ? 0.9 : -0.9) * mV);

    // CHANNEL 3 — weapon kick. ~70% of the felt motion, and it happens in a
    // scene that does not share the world camera, so it cannot move a bullet
    // by a millimetre no matter how violent it looks.
    const pu = this._pulse('kick');
    if (pu) { pu.index = idx; pu.mW = mW; }

    // ---------- spread: uniform disc around the aim ray ----------
    const cone = this._cone() * DEG;
    const pellets = d.pellets;
    const payload = this._firePayload;
    payload.weapon = d.id;
    payload.subT = subT;
    payload.index = idx;
    payload.lowAmmo = this.ammo <= Math.max(1, Math.floor(d.mag * 0.2));
    // ROUND 7 (lane G): quiet_2 "Cold Barrel". HOOK_POINTS names this exact line as the site
    // and nobody had written it; enemies.js's own comment at :534 says it takes p.loud as
    // published so the discount happens once, here.
    {
      const pr = this.ctx.systems ? this.ctx.systems.get('progress') : null;
      payload.loud = (pr && typeof pr.perk === 'function')
        ? pr.perk('noiseRadius', d.loud, 'shot') : d.loud;
    }
    payload.pellets = pellets;
    payload.spreadDeg = cone / DEG;
    // D3: the primed magazine (an active-reload hit with HANDS 'Primed' owned) hits harder
    // until the next reload. combat.resolveShot multiplies the round by this; melee never.
    payload.dmgMul = this.primed ? this._primedMul() : 1;
    payload.ox = p.pos.x;
    payload.oy = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
    payload.oz = p.pos.z;

    // Tracer every third round, and always when the mag is nearly out — the
    // gun tells you it is empty before the number would. vigil weapon.js:250.
    const tracerRound = (this.fireCount % 3 === 0) || this.ammo < Math.max(2, d.mag * 0.1);

    for (let k = 0; k < pellets; k++) {
      _dir.copy(_aim0);                        // the aim at the trigger pull, not after the kick
      _right.set(Math.cos(yaw0), 0, -Math.sin(yaw0));
      _upv.crossVectors(_right, _dir).normalize();
      const u = this.spreadRng.next(), a = this.spreadRng.next() * TAU;
      const r = cone * Math.sqrt(u);
      _dir.addScaledVector(_right, Math.cos(a) * r)
        .addScaledVector(_upv, Math.sin(a) * r)
        .normalize();
      payload.dx = _dir.x; payload.dy = _dir.y; payload.dz = _dir.z;
      payload.pellet = k;
      payload.tracer = tracerRound && k === 0;
      // ONE reused payload object. combat.js consumes it synchronously and
      // retains nothing; that is what keeps a shot allocation-free.
      this.ctx.bus.emit('weapon:fire', payload);
    }

    this.bloom = Math.min(
      this.adsT > 0.55 ? BLOOM.adsCap : BLOOM.hipCap,
      this.bloom + (this.adsT > 0.55 ? BLOOM.adsAdd : BLOOM.hipAdd),
    );

    this.fireTimes.push(this.ctx.time.t - subT);
    if (this.fireTimes.length > 64) this.fireTimes.shift();

    const fl = this._pulse('flash');
    if (fl) { fl.subT = subT; fl.adsT = this.adsT; }
    this.flashEV = 0.35;
  }

  /* ---- melee ------------------------------------------------------------ */

  /**
   * Acquire a melee target: nearest live enemy inside the assist range whose
   * bearing is inside the cone, measured with Y SQUASHED so a creature at your
   * feet costs the same as one at your shoulder. Both the reach and the cone
   * are squashed (vigil weapon.js:120-142) — squashing the range alone was not
   * enough, because one metre of downhill terrain pushed a short thing outside
   * a raw 42-deg cone and the swing read as a ray instead of an arc.
   * M0 has no enemies system, so this returns null and the swing resolves
   * against the world through combat.meleeSweep().
   */
  _acquireMelee() {
    const enemies = this._sys('enemies');
    const p = this._sys('player');
    const cam = this._sys('camera');
    if (!enemies || !enemies.all || !p || !cam) return null;
    cam.aimDir(_mdir);
    const S = MELEE.ySquash;
    const ex = p.pos.x, ey = p.eyeY, ez = p.pos.z;
    const cosCone = Math.cos(MELEE_CONE_DEG * DEG);
    const ax = _mdir.x, ay = _mdir.y * S, az = _mdir.z;
    const an = Math.max(1e-4, Math.hypot(ax, ay, az));
    const col = this._sys('collision');
    let best = null, bestD = Infinity;
    for (const e of enemies.all) {
      if (!e.alive) continue;
      const vx = e.pos.x - ex;
      const vy = ((e.pos.y + e.def.height * 0.5) - ey) * S;
      const vz = e.pos.z - ez;
      const dd = Math.hypot(vx, vy, vz);
      if (dd > MELEE_ASSIST + e.def.radius) continue;
      const dot = (vx * ax + vy * ay + vz * az) / (Math.max(1e-4, dd) * an);
      if (dot < cosCone) continue;
      // ...AND you have to be able to reach it. Range and facing were the whole test, so the
      // assist locked bodies through walls, shut doors and trunks - every solid in the game is
      // thinner than the 2.70 m assist. Worst at the refuge, whose door leaf is 0.18 m: the
      // round-7 beat is get inside and shut it, and you could kill what was scratching at it
      // from the safe side. combat.meleeSweep() traces properly and always did; the assist
      // simply pre-empted it. A blocked body is now no target, so the swing falls through to
      // the sweep and resolves against the wall, with the wall's own thunk.
      if (col && typeof col.segmentClear === 'function') {
        const tx = e.pos.x, ty = e.pos.y + e.def.height * 0.5, tz = e.pos.z;
        const bx = tx - ex, by = ty - ey, bz = tz - ez;
        const bl = Math.max(1e-4, Math.hypot(bx, by, bz));
        // Stop short of the body by its own radius: a boss carries a collider and must not
        // be the thing that refuses the swing. Anything BETWEEN you and it still is.
        const k = Math.max(0, bl - Math.min(bl * 0.9, e.def.radius + 0.1)) / bl;
        if (!col.segmentClear(ex, ey, ez, ex + bx * k, ey + by * k, ez + bz * k)) continue;
      }
      if (dd < bestD) { best = e; bestD = dd; }
    }
    return best;
  }

  _startMelee() {
    if (this.melee) return;
    this.melee = { t: 0, phase: 'windup', target: null, struck: false };
    if (this.reloading) this._cancelReload();
    this._pulse('melee:start');
  }

  /* ---- the step --------------------------------------------------------- */

  step(dt) {
    const ctx = this.ctx;
    const p = this._sys('player');
    const cam = this._sys('camera');
    if (!p || !cam) return;                 // camera/player build the aim truth

    if (!this._arsenalSynced) this._syncArsenal();

    const i = this._input();
    const pr = this._prev;
    if (ctx.shared?.inCar) {
      this.buffered = this.meleeBuffered = 0;
      // Finish an existing swing visually without landing an invisible cabin hit.
      if (this.melee) this.melee.struck = true;
    }
    // C7: the step a shop menu closes, whatever is still held is not a fresh press - the click
    // that bought something must never become the shot that follows it.
    const shop = !!ctx.shared?.shopOpen;
    if (shop !== this._shopWas) {
      this._shopWas = shop;
      if (!shop) {
        pr.fire = i.fire; pr.aim = i.aim; pr.reload = i.reload; pr.melee = i.melee;
        pr.swap = i.swap; pr.swapprev = i.swapprev; pr.lower = i.lower;
        pr.slot1 = i.slot1; pr.slot2 = i.slot2; pr.slot3 = i.slot3; pr.slot4 = i.slot4;
      }
    }
    const firePressed = i.fire && !pr.fire;
    const aimPressed = i.aim && !pr.aim;
    const reloadPressed = i.reload && !pr.reload;
    const meleePressed = i.melee && !pr.melee;
    const swapPressed = i.swap && !pr.swap;
    const swapPrevPressed = i.swapprev && !pr.swapprev;
    const slot1Pressed = i.slot1 && !pr.slot1;
    const slot2Pressed = i.slot2 && !pr.slot2;
    const slot3Pressed = i.slot3 && !pr.slot3;
    const slot4Pressed = i.slot4 && !pr.slot4;
    const lowerPressed = i.lower && !pr.lower;
    pr.fire = i.fire; pr.aim = i.aim; pr.reload = i.reload; pr.melee = i.melee;
    pr.sprint = i.sprint;   // held-state only today; kept edge-ready like the other four
    pr.swap = i.swap; pr.swapprev = i.swapprev; pr.lower = i.lower;
    pr.slot1 = i.slot1; pr.slot2 = i.slot2; pr.slot3 = i.slot3; pr.slot4 = i.slot4;

    const dead = !!p.dead;
    // D1: fire, aim and melee all mean "I want the gun" - any of them raises a lowered one.
    const reloadTap = this._stepLowering(dt, i, reloadPressed, lowerPressed, firePressed || aimPressed || meleePressed, dead);
    const handsFree = !p.scaling && !p.scaleDescending && !p.climb;
    const weaponReady = !this.lowered && this.lowerT <= .001 && handsFree;
    // The gun is on its way up (a raise, or the shop low-ready lifting): presses queue for it.
    const raising = !this.lowered && this.lowerT > .001 && handsFree;

    // ---- the swap (ROUND 5). Lower for half of SWAP_S, change guns at the bottom, raise.
    // The def is read AFTER this so the rest of the step sees the gun that is in the hands.
    // D6: Q and wheel down go forward, wheel up goes back, 1-4 pick a slot.
    if (!dead) {
      if (swapPressed) this.swap(1);
      else if (swapPrevPressed) this.swap(-1);
      else if (slot1Pressed) this.slot(0);
      else if (slot2Pressed) this.slot(1);
      else if (slot3Pressed) this.slot(2);
      else if (slot4Pressed) this.slot(3);
    }
    // A grant whose raise was refused (mid-melee, mid-swap) comes back here, the first step
    // the hands are free. Dropped if the player has already put that gun in their hands, or
    // if the melee is still running when they die.
    if (this._pendingSwap && this.swapT < 0 && !this.melee) {
      const want = this._pendingSwap;
      this._pendingSwap = null;
      if (!dead && this.has(want)) this._beginSwap(want);
    }
    if (this.swapT >= 0) {
      const was = this.swapT;
      this.swapT += dt;
      if (was < SWAP_S * 0.5 && this.swapT >= SWAP_S * 0.5 && this.swapTo) {
        this.select(this.swapTo);
        const pu = this._pulse('swap:mid');
        if (pu) pu.name = this.swapTo;
      }
      if (this.swapT >= SWAP_S) {
        this.swapT = -1; this.swapTo = null;
        this._pulse('swap:end');
      }
    }
    const swapping = this.swapT >= 0;

    const d = this.def;
    this.sinceShot += dt;
    if (this.cycle > 0) this.cycle = Math.max(0, this.cycle - dt);

    // ---- ADS. Interruptible, never restarts. vigil weapon.js:305-308.
    // ROUND 6 (NEXT.md item 3): a reload the GUN started at zero no longer drops the sight
    // — measured on this branch before the change: aiming the bolt dry took the sight away
    // for 2.75 s (from 0.62 s to 3.35 s after the last shot, adsT to 0), every time the gun
    // emptied while aimed. An auto reload keeps the sight up through its non-cancelable
    // window; a reload the player pressed R for still lowers it, as it always has.
    const wantAds = weaponReady&&i.aim && !p.sprinting && !this.melee && !swapping
      && !(this.reloading && !this.reloading.cancelable && !this.reloading.auto) && !dead;
    this.adsT = clamp01(this.adsT + (wantAds ? dt / CORE.adsIn : -dt / CORE.adsOut));
    this.fullyAdsFor = this.adsT >= 0.999 ? this.fullyAdsFor + dt : 0;

    // ---- sprint-out gate. The gun is not up for CORE.sprintOut after a sprint.
    if (p.sprinting) this.sprintOutTimer = CORE.sprintOut;
    else this.sprintOutTimer = Math.max(0, this.sprintOutTimer - dt);

    // ---- input buffering. CORE.inputBuffer is why a pull 200 ms early still
    // lands on the cycle instead of being eaten. D1: a press while the gun is RISING queues
    // the same way, so the click after the raising click fires the instant the gun is up;
    // the raising press itself (_raiseEaten) never queues - it was spent on the raise.
    if (!weaponReady && !raising) this.buffered = this.meleeBuffered = 0;
    if (firePressed && !this._raiseEaten && (weaponReady || raising)) this.buffered = CORE.inputBuffer;
    else this.buffered = Math.max(0, this.buffered - dt);
    if (meleePressed && !this._raiseEaten && (weaponReady || raising)) this.meleeBuffered = CORE.inputBuffer;
    else this.meleeBuffered = Math.max(0, this.meleeBuffered - dt);

    // ---- melee: one owner, the whole timeline here. Legal from sprint and
    // mid-reload — it is the answer to something already on top of you.
    if (this.meleeBuffered > 0 && !this.melee && !dead && !swapping&&weaponReady) {
      this.meleeBuffered = 0;
      this._startMelee();
    }
    if (this.melee) {
      const m = this.melee;
      m.t += dt;
      if (m.phase === 'windup') {
        // The wind-up TRAVELS for MELEE.travel then HOLDS still for MELEE.hold.
        // The pose curve lives in the viewmodel; the timeline lives here, and
        // travel + hold === windup is the invariant that makes the anticipation
        // read. Anticipation only reads if the motion STOPS.
        if (m.t >= MELEE.windup) {
          m.phase = 'active';
          m.t -= MELEE.windup;
          m.target = this._acquireMelee();
        }
      } else if (m.phase === 'active') {
        // Re-trace every active frame: the lock must still be in range or the
        // escape counts as a real miss.
        if (!m.struck) {
          const combat = this._sys('combat');
          if (m.target) {
            const still = this._acquireMelee();
            if (still === m.target && combat && combat.meleeStrike) {
              m.struck = true;
              combat.meleeStrike(m.target, MELEE.dmg);
              this._meleeImpactJuice(cam);
            }
          } else if (combat && combat.meleeSweep) {
            // M0: no enemies exist, so the swing resolves against the world.
            // This is what proves the melee timeline end to end tonight.
            if (combat.meleeSweep(MELEE.range, MELEE.dmg)) {
              m.struck = true;
              this._meleeImpactJuice(cam);
            }
          }
        }
        if (m.t >= MELEE.active) { m.phase = 'recover'; m.t -= MELEE.active; }
      } else if (m.t >= MELEE.recover) {
        this.melee = null;
        this.meleeCount++;
        this._pulse('melee:end');
      }
    }

    // R reloads on the PRESS (D1: nothing else lives on R any more). A press during a reload
    // was already the active-reload attempt inside _stepLowering; while lowered it raised.
    if (reloadTap && !swapping && weaponReady) this._startReload();

    // ---- AUTO-RELOAD (ROUND 5, NEXT.md item 3). Alex: "it should automatically reload when
    // it gets to zero". DERIVED from the gun's own state every step, never armed by an edge.
    // Verification round 1: the first cut was armed by the shot that emptied the magazine and
    // cleared on its way out, so a melee - legal mid-reload, and it cancels the reload - left
    // the gun at 0 with nothing to re-arm it, clicking for good (measured: 0/40 six seconds
    // after the hatchet, one tap, 'dry'). Now the condition is simply: empty, rounds in
    // reserve, no reload running. It starts the reload the first step the gun is free - the
    // trigger's own conditions (no melee, no sprint-out, the bolt throw finished, alive) plus
    // no swap in flight - and because it is re-read every step, whatever cancels the reload
    // (a melee, a swap, a Carry park on a sprint) is followed by another start the moment the
    // hands are free; a parked reload resumes through _startReload()'s own Carry path.
    // _startReload() refuses while a reload runs, so a manual R is never cancelled. With
    // reserve 0 the condition is false and the dry click below is what the player gets. A
    // reload it starts is a normal reload: the HANDS active-reload window opens in
    // _startReload() exactly as for R.
    //
    // Verification round 2 (the second thing this rule had to learn): a reload the GUN starts
    // may not cost the player a sprint. `p.sprinting` is in the condition below so the rule
    // never starts one while the legs are moving, wantsSprintCancel above ignores an auto
    // reload so the legs are never refused, and the timeline further down throws an auto
    // reload away the moment a real sprint begins. Keyed on player.sprinting (the legs), not
    // on the held key, exactly as the 'Carry' park is: shift held while standing still is not
    // a run, and a key-keyed rule would start-and-cancel every step for as long as it was held.
    this._autoReload = this.ammo === 0 && this.reserve > 0 && !this.reloading;
    if (this._autoReload && !this.melee && !p.sprinting && this.sprintOutTimer <= 0
        && this.cycle <= 0 && !dead && !swapping && !ctx.shared?.inCar && weaponReady) {
      this._startReload(true);
    }
    if (this.reloading) {
      const r = this.reloading;
      r.t += dt * (r.rate || 1);          // rate > 1 after an active-reload hit (D2)
      while (r.bi < r.beatN && r.t >= r.beats[r.bi][1] * r.scale) {
        const name = r.beats[r.bi++][0];
        if (name === 'shell') this._creditShell();
        else if (name === 'seat' && !r.empty) this._creditReload();
        else if (name === 'boltrelease') this._creditReload();
        if (name === 'cancelopen') r.cancelable = true;
        this._emitReload('beat', name);
        const pu = this._pulse('reload:beat');
        if (pu) pu.name = name;
      }
      if (r.t >= r.dur) {
        this._emitReload('finish', '');
        this._parked = null;
        this.reloading = null;
        this._pulse('reload:end');
      } else if (p.sprinting && !this.melee) {
        // D3: running PARKS the reload, whoever started it, and it comes back where it was
        // left - an AUTO one the step the legs stop (the derived rule above), a manual one on
        // the next R. Legal at any point in the timeline - the answer to something arriving
        // does not wait for `cancelopen`. Keyed on the player actually RUNNING (player.sprinting,
        // the same truth the sprint-out gate reads), not on the held key: shift held while
        // standing still is not a run, and a key-keyed rule would park and restart the reload
        // every step for as long as it was held.
        this._cancelReload(true);
      } else if ((i.fire || this.buffered > 0 || aimPressed) && r.cancelable) {
        this._cancelReload();
      }
    }

    // ---- HANDS tier 2, 'Hold'. Sprint-while-aimed holds your breath: the two cannot
    // collide because wantsSprintCancel already makes aiming forbid a sprint, so the key
    // is free the whole time the sight is up. `seconds` of budget, spent while held and
    // recovered at half rate. Absent the node the hook returns null, breathHeld never
    // becomes true and swayMul stays 1 — the gun exactly as it ships.
    //
    // Asked ONCE per step and cached in this.breathSway, because _cone() and the publish
    // block below both need it and neither may reach for a sibling on its own.
    const hb = this._holdBreathSpec();
    if (hb) {
      const cap = hb.seconds > 0 ? hb.seconds : 0;
      if (this.breathLeft === null) this.breathLeft = cap;
      const want = i.sprint && this.adsT > 0.55 && !this.melee && !this.reloading && !dead;
      if (want && this.breathLeft > 0) {
        this.breathHeld = true;
        this.breathLeft = Math.max(0, this.breathLeft - dt);
      } else {
        this.breathHeld = false;
        this.breathLeft = Math.min(cap, this.breathLeft + dt * 0.5);
      }
      this.breathSway = (this.breathHeld && hb.swayMul > 0) ? hb.swayMul : 1;
    } else {
      this.breathHeld = false;
      this.breathLeft = null;
      this.breathSway = 1;
    }

    // ---- trigger. Sub-frame fire clock or bust: at 725 rpm the interval is
    // 4.97 frames, so a per-frame gate quantises the cadence and the gun
    // stutters. The clock carries its remainder into fire()'s subT so the
    // muzzle flash and the tracer are placed where the shot actually was.
    const canFire = !this.reloading && !this.melee && this.sprintOutTimer <= 0
      && this.cycle <= 0 && !dead && !swapping && !ctx.shared?.inCar&&weaponReady;
    const wantFire = d.auto ? (i.fire || this.buffered > 0) : (this.buffered > 0);
    if (firePressed) this.dryLatch = false;   // every CLICK clicks (the latch is per held pull)
    this.firing = false;
    if (wantFire && canFire && this.ammo > 0) {
      // A PULL THAT DOES NOT FIRE MUST COST NOTHING. This block used to clear `buffered`
      // and then, at the end, unconditionally reset `fireClock` to 0 for a non-auto weapon
      // — INCLUDING on the frames where the rate limit had not yet elapsed and no round
      // actually left the barrel. The bolt rifle's cycle is 0.62 s and its interval is
      // 1.091 s, so a player tapping at any rate quicker than once a second landed inside
      // that window every time, and each eaten press reset the very clock that was counting
      // toward the next shot. Measured before the fix: thirty trigger pulls over four
      // seconds produced exactly ONE round, and the magazine still held four. The gun fired
      // once and then never again, and no suite caught it because the enemies test shot into
      // the dark and never asked whether anything died.
      //
      // So: consume the buffer and reset the clock only when a shot HAPPENED.
      this.dryLatch = false;
      this.firing = true;
      this.fireClock += dt;
      let guard = 0, fired = 0;
      while (this.fireClock >= d.interval && guard++ < 16) {
        if (this.ammo <= 0) { this.fireClock = 0; break; }
        this.fireClock -= d.interval;
        this._fire(this.fireClock);
        fired++;
        if (!d.auto) break;                 // one pull, one round
      }
      if (fired > 0) {
        this.buffered = 0;
        if (!d.auto) this.fireClock = 0;
      } else {
        // Nothing left the barrel. Keep the pull alive so it lands the instant the gun is
        // ready — that is what CORE.inputBuffer is for — and keep the clock climbing.
        this.buffered = Math.max(0, this.buffered - dt);
        this.firing = false;
        if (this.fireClock > d.interval) this.fireClock = d.interval;
      }
    } else {
      // Keep the clock primed so the first shot is instant, never late.
      this.fireClock = Math.min(this.fireClock + dt, d.interval);
      if (wantFire && canFire && this.ammo === 0) {
        if (!this.dryLatch) {
          this.dryLatch = true;
          this._pulse('dry');
          // Heard and seen. Alex, in the Avery house: "the gun looked like it was shooting but
          // no sound and no damage" - an empty gun with an empty reserve gave a silent jolt.
          // The click goes out as a reload beat (guns.reloadCue maps 'dry' to the dry click)
          // and the HUD flashes the ammo box for 0.3 s (C21: dryFlashT).
          this._emitReload('beat', 'dry');
          this.dryFlashT = 0.3;
        }
        this.dryHeld += dt;
        if (this.dryHeld > 0.700) { this.dryHeld = 0; this._startReload(); }
      } else {
        this.dryHeld = 0;
        if (!wantFire) this.dryLatch = false;
      }
    }
    if (!this.firing && this.sinceShot > 0.4) this.shotIndex = 0;

    // ---- bloom decay, after BLOOM.delay
    if (this.sinceShot > BLOOM.delay) {
      const hl = this.adsT > 0.55 ? BLOOM.adsHL : BLOOM.hipHL;
      this.bloom *= Math.pow(0.5, dt / hl);
      if (this.bloom < 0.001) this.bloom = 0;
    }

    // ---- recoil recovery. CORE.recoilReturn of the accumulator comes back,
    // half-life CORE.recoilHalfLife (per-weapon settle, where the def has one),
    // after CORE.recoilHold of stillness.
    //
    // AND FIRST, ALWAYS FIRST: the player's counter-input eats the accumulator.
    // cam.yaw/pitch moved since our last write, and everything that moved them
    // that was not us is the player pulling back down. If the auto-recentre is
    // allowed to run on top of that, the two add and it drags the view to the
    // floor. This block is the reason the file exists.
    if (this._lastCamYaw === null) { this._lastCamYaw = cam.yaw; this._lastCamPitch = cam.pitch; }
    const lookYaw = cam.yaw - this._lastCamYaw;
    const lookPitch = cam.pitch - this._lastCamPitch;
    if (this.kickPitch > 0 && lookPitch < 0) {
      this.kickPitch -= Math.min(this.kickPitch, -lookPitch / DEG);
    }
    if (this.kickYaw !== 0 && lookYaw !== 0 && Math.sign(-lookYaw) === Math.sign(this.kickYaw)) {
      const eatenY = Math.min(Math.abs(this.kickYaw), Math.abs(lookYaw) / DEG);
      this.kickYaw -= Math.sign(this.kickYaw) * eatenY;
    }

    const hl = d.settle;
    if (this.sinceShot > CORE.recoilHold
        && (this.kickPitch > 0.001 || Math.abs(this.kickYaw) > 0.001)) {
      if (!this.recovering) {
        this.recovering = true;
        this.recoverP = this.kickPitch * (1 - CORE.recoilReturn);
        this.recoverY = this.kickYaw * (1 - CORE.recoilReturn);
      }
      const k = 1 - Math.pow(0.5, dt / hl);
      const rp = (this.kickPitch - this.recoverP) * k;
      const ry = (this.kickYaw - this.recoverY) * k;
      this.kickPitch -= rp;
      this.kickYaw -= ry;
      cam.pitch -= rp * DEG;
      cam.yaw -= -ry * DEG;
    }
    this._lastCamYaw = cam.yaw;
    this._lastCamPitch = cam.pitch;

    // ---- exposure transient. post.js reads weapons.flashEV.
    this.flashEV *= Math.pow(0.5, dt / 0.083);
    if (this.flashEV < 0.002) this.flashEV = 0;
    if (this.dryFlashT > 0) this.dryFlashT = Math.max(0, this.dryFlashT - dt);

    // ---- publish. viewmodel is manifest entry 12 and steps next.
    const s = this.vmState;
    s.adsT = this.adsT; s.firing = this.firing; s.sinceShot = this.sinceShot;
    s.ammo = this.ammo; s.mag = d.mag; s.chambered = this.chambered;
    s.sprinting = !!p.sprinting; s.reloading = this.reloading; s.melee = this.melee;
    s.cycle = this.cycle; s.cycleLen = d.cycle; s.weapon = d.id;
    s.empty = this.ammo === 0;
    s.swapping = swapping; s.swapT = swapping ? this.swapT / SWAP_S : -1;
    s.lowered=this.lowered;s.lowerT=this.lowerT;
    // The viewmodel multiplies its sway by this and needs to know nothing else. 1 = today.
    s.breathHeld = this.breathHeld;
    s.breathLeft = this.breathLeft === null ? 0 : this.breathLeft;
    s.swayMul = this.breathSway;
  }

  /**
   * The hold-breath spec, or null. HOOK_POINTS declares the call site as `_stanceMods()`,
   * which cannot be right for this verb: _stanceMods runs only on a shot, and a breath
   * budget has to be spent per frame or holding it costs nothing. It is asked once per
   * step() instead and cached. A correction to that one line of nodes.js is filed in
   * docs/HANDOFF.md — the hook NAME and SIGNATURE are honoured exactly.
   */
  _holdBreathSpec() {
    const spec = this._perk('holdBreath', null, this.def.id);
    if (spec && spec.seconds > 0) return spec;
    const st = this._stats();
    if (st && st.holdBreath && st.holdBreathS > 0) {
      const w = _breathSpec;
      w.swayMul = st.holdBreathSwayMul > 0 ? st.holdBreathSwayMul : 1;
      w.seconds = st.holdBreathS;
      return w;
    }
    return null;
  }

  _meleeImpactJuice(cam) {
    // The kick goes DOWN. A kick that goes up is a recoil, not an impact.
    // ROUND 18: roughly doubled, with the hitstop taken up from CFG's 0.075 to 0.125 for
    // this one frame. Hitstop is the single cheapest weight there is — the world stops
    // for an eighth of a second and then carries on — and 75 ms was under the threshold
    // where a player registers it as anything but a stutter.
    if (cam.addPunch) cam.addPunch(-3.6, 1.8, 5.0);
    const fx = this._sys('fx');
    if (fx && fx.hitstop) fx.hitstop(Math.max(MELEE.hitstop, 0.125));
    this._pulse('melee:connect');
  }

  onResize(w, h) {
    const vm = this._sys('viewmodel');
    if (vm && vm.onResize) vm.onResize(w, h);
  }
}

export default Weapons;
