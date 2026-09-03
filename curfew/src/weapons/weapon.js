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
    reloadTac: 0.62, reloadEmpty: 0.94,          // per shell, tube-fed
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

/* -------------------------------------------------------------------------
   ROUND 5 (docs/NEXT.md item 3) — Alex: "This initial gun is very slow and it
   should automatically reload when it gets to zero... other guns should be
   obtainable if there are locations you can beat and stuff."

   Two things, both in this file:
   1. The magazine reloads itself the moment it empties (see step(), the
      AUTO-RELOAD block). No trigger hold, no press.
   2. An arsenal: `owned`, has(), grant(), swap(), slot(). Claiming THE WEEPING
      MINE (the county's works; DESIGN §0.16 called it "Ashfall Works") grants
      the KV-7 carbine. The grant is wired to the bus channel 'place:claimed'
      and, for a returning save, read LAZILY at the first step off progress.claimed
      (progress.js restores the save's claimed list into its OWN Set; places.js
      only seeds startClaimed and never restores a claim - verification round 1
      measured the first cut, which asked places, coming back with the bolt alone).
   ------------------------------------------------------------------------- */
const GRANT_AT = 'weeping-mine';
const GRANT_WEAPON = 'carbine';
// A swap is lower-then-raise through the viewmodel's sprint-out pose. The gun changes at
// the midpoint, when it is fully out of frame.
const SWAP_S = 0.45;

/* ---- module-level scratch. The hot path allocates nothing. ---- */
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();
const _mdir = new THREE.Vector3();
const _MODS = [1, 1, 1];          // scratch for _stanceMods; never escapes
// Scratch specs for the STAT fallback paths of the HANDS perks. The hooks return their own
// frozen module-scope objects (nodes.js ACTIVE_RELOAD / HOLD_BREATH) and those are used as
// handed; these two exist only so the fallback cannot allocate either. Read and discarded
// inside the same call; nothing retains them.
const _winSpec = { from: 0, to: 0, mul: 1, jamS: 0 };
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

    this.select('bolt');           // M0 ships with the bolt rifle selected

    // --- input edge detection. We only ask the engine for four booleans and
    // derive every "pressed" ourselves, so this file survives whatever shape
    // ctx.input settles into. Requested names are in HANDOFF.
    // `sprint` is read (never written) for two HANDS verbs only: it is the button that
    // runs OUT of a reload, and the button that holds your breath while you are aimed.
    // Those two can share it because they cannot happen at once — see _input().
    this._prev = { fire: false, aim: false, reload: false, melee: false, sprint: false, swap: false, slot1: false, slot2: false };
    this._in = { fire: false, aim: false, reload: false, melee: false, sprint: false, swap: false, slot1: false, slot2: false };

    // The grant. 'place:claimed' {id, xp} is places.js's own channel (CONTRACT bus vocabulary).
    if (ctx.bus && typeof ctx.bus.on === 'function') {
      ctx.bus.on('place:claimed', (p) => {
        if (p && p.id === GRANT_AT) this.grant(GRANT_WEAPON);
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
        swap: () => this.swap(),
        slot: (n) => this.slot(n),
        ammoState: () => this.ammoState(),
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

  /** Q: cycle to the next owned weapon. */
  swap() {
    if (this.owned.length < 2) return false;
    const cur = this.swapTo || this.def.id;
    const i = this.owned.indexOf(cur);
    return this._beginSwap(this.owned[(i + 1) % this.owned.length]);
  }

  /** 1 / 2: pick a slot directly. */
  slot(n) {
    const id = this.owned[n];
    return id ? this._beginSwap(id) : false;
  }

  /**
   * Start the SWAP_S lower-and-raise. Refused mid-melee, mid-swap, and for the gun already
   * in the hands. A live reload is cancelled — PARKED when the HANDS 'Carry' node makes that
   * legal, thrown away otherwise, exactly the sprint's rule.
   */
  _beginSwap(id) {
    if (!id || !CFG.weapons.defs[id]) return false;
    if (id === this.def.id || this.melee || this.swapT >= 0) return false;
    if (this.reloading) this._cancelReload(this._canParkReload());
    this.swapTo = id;
    this.swapT = 0;
    this.swapCount++;
    const pu = this._pulse('swap:start');
    if (pu) pu.name = id;
    return true;
  }

  /**
   * The returning save, read LAZILY at the first step and never at construction. The save's
   * claimed list (progression/save.js, key curfew.progress) is restored by progress.js:324
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
    const viaPlaces = !!pl && (typeof pl.isClaimed === 'function'
      ? pl.isClaimed(GRANT_AT)
      : !!(pl.claimed && pl.claimed.has && pl.claimed.has(GRANT_AT)));
    const viaProgress = !!(pr && pr.claimed && typeof pr.claimed.has === 'function' && pr.claimed.has(GRANT_AT));
    if (viaPlaces || viaProgress) this.grant(GRANT_WEAPON, { quiet: true });
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
    return i.fire || i.aim || this.buffered > 0
      || (!!this.reloading && !this.reloading.auto && !this._canParkReload());
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
  addReserve(n) {
    const got = Math.min(n, this.reserveMax - this.reserve);
    this.reserve += got;
    // Ammo found for an empty gun: it reloads itself - the AUTO-RELOAD rule in step() reads
    // ammo/reserve every step, so nothing needs arming here.
    return got;
  }

  dump() {
    return {
      weapon: this.def.id, ammo: this.ammo, reserve: this.reserve,
      owned: this.owned.slice(), swapT: this.swapT, swapTo: this.swapTo,
      pendingSwap: this._pendingSwap,
      autoReload: this._autoReload, grantCount: this.grantCount, swapCount: this.swapCount,
      blocksSprint: this.wantsSprintCancel,
      adsT: this.adsT, spreadDeg: this._cone(), bloom: this.bloom,
      kickPitch: this.kickPitch, kickYaw: this.kickYaw,
      shotIndex: this.shotIndex, fireClock: this.fireClock,
      sprintOutTimer: this.sprintOutTimer, fireCount: this.fireCount,
      meleeCount: this.meleeCount, loud: this.loudness,
      reloading: this.reloading && {
        t: this.reloading.t, empty: this.reloading.empty, auto: !!this.reloading.auto,
        rate: this.reloading.rate, jam: this.reloading.jam,
        from: this.reloading.activeFrom, to: this.reloading.activeTo,
        used: this.reloading.activeUsed,
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
   * MAKES"), and HOOK_POINTS in nodes.js names weapons as the runner for `reloadWindow`,
   * `reloadResume` and `holdBreath`. progress.hookReport() marks a hook with installers
   * and zero runs as `dead`; these three stop being dead here.
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
    o.slot1 = held ? i.held('slot1') : !!i.slot1;
    o.slot2 = held ? i.held('slot2') : !!i.slot2;
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
    const dur = empty ? d.reloadEmpty : d.reloadTac;
    const ref = empty ? BEATS_REF_EMPTY : BEATS_REF_TAC;
    const scale = dur / ref;

    // HANDS tier 1, 'Carry' — a parked reload comes back where it was left, beats already
    // played and ammo already credited. Only a park of the SAME shape resumes: an empty
    // reload does not resume into a tactical one, because they are different choreography
    // and different durations and splicing them would credit the wrong number of rounds.
    const park = this._parked;
    if (park && park.empty === empty && this._canResumeReload()) {
      this._parked = null;
      this.reloading = {
        auto: auto || !!park.auto,
        empty, t: park.t, dur, scale,
        beats: empty ? BEATS_EMPTY : BEATS_TAC,
        bi: park.bi, credited: park.credited, cancelable: park.cancelable,
        rate: park.rate, jam: 0,
        activeFrom: park.activeFrom, activeTo: park.activeTo,
        activeMul: park.activeMul, activeJamS: park.activeJamS,
        activeUsed: park.activeUsed,
      };
      this._emitReload('start', 'resume');
      const rp = this._pulse('reload:start');
      if (rp) rp.name = 'resume';
      return;
    }
    this._parked = null;

    this.reloading = {
      auto,
      empty, t: 0, dur, scale,
      beats: empty ? BEATS_EMPTY : BEATS_TAC,
      bi: 0, credited: false, cancelable: false,
      // rate 1 and no window (activeFrom < 0) is the shipping reload exactly.
      rate: 1, jam: 0,
      activeFrom: -1, activeTo: -1, activeMul: 1, activeJamS: 0, activeUsed: false,
    };
    // HANDS tier 0, 'Active'. HOOK_POINTS names _startReload() as this hook's one legal
    // call site, and it is asked exactly once per reload: spec or null, no flag to read.
    // The window is authored in seconds against the REFERENCE choreography, so it is
    // scaled by dur/ref for the same reason every beat above is — a 3.10 s empty bolt
    // reload and a 2.10 s carbine reload must put the window on the same BEAT, not on the
    // same wall-clock second.
    const win = this._reloadWindow();
    if (win) {
      const r = this.reloading;
      r.activeFrom = win.from * scale;
      r.activeTo = win.to * scale;
      r.activeMul = win.mul > 0 ? win.mul : 1;
      r.activeJamS = win.jamS > 0 ? win.jamS : 0;
    }
    this._emitReload('start', '');
    const pu = this._pulse('reload:start');
    if (pu) pu.name = empty ? 'empty' : 'tac';
  }

  /**
   * A reload button pressed DURING a reload is the active-reload attempt. Without the node
   * there is no window and this is what it has always been: nothing. One attempt per
   * reload — a mashed button must not be a free retry, or the window is not a window.
   */
  _activeReloadPress() {
    const r = this.reloading;
    if (!r || r.activeFrom < 0 || r.activeUsed) return;
    r.activeUsed = true;
    if (r.t >= r.activeFrom && r.t <= r.activeTo) {
      r.rate = r.activeMul;               // the REST of the reload runs faster
      this._emitReload('beat', 'active');
      const pu = this._pulse('reload:beat');
      if (pu) pu.name = 'active';
    } else {
      r.jam = r.activeJamS;               // missed: the hands stall, and you hear it
      this._emitReload('beat', 'jam');
      const pu = this._pulse('reload:beat');
      if (pu) pu.name = 'jam';
    }
  }

  /**
   * The active-reload window, or null. Hook first (that is what hands_1 installs), the
   * stat block second, and a preallocated scratch spec for the stat path so a reload
   * cannot allocate. Returns null when neither says anything, and null means the shipping
   * reload with no window at all.
   */
  _reloadWindow() {
    const spec = this._perk('reloadWindow', null, this.def.id);
    if (spec && spec.to > spec.from) return spec;
    const st = this._stats();
    if (st && st.activeReload && Array.isArray(st.activeWindow)) {
      const w = _winSpec;
      w.from = st.activeWindow[0]; w.to = st.activeWindow[1];
      w.mul = st.activeSpeedMul || 1; w.jamS = st.activeJamS || 0;
      return w.to > w.from ? w : null;
    }
    return null;
  }

  /** True while a cancelled reload would be PARKED rather than thrown away. */
  _canResumeReload() {
    if (this._perk('reloadResume', false, this.def.id) === true) return true;
    const st = this._stats();
    return !!(st && st.reloadResume);
  }

  /** True while THIS reload could be parked. */
  _canParkReload() {
    return !!this.reloading && this._canResumeReload();
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
   * @param park true to keep the progress for a later resume (HANDS 'Carry'). Anything
   *        that cancels a reload for a REASON OTHER than running out of it — the trigger,
   *        the aim button, a melee swing — throws it away exactly as it always has, so
   *        owning the node never silently changes what those three buttons mean.
   */
  _cancelReload(park = false) {
    const r = this.reloading;
    if (!r) return;
    if (park && this._canParkReload()) {
      this._parked = {
        auto: !!r.auto,
        weapon: this.def.id, empty: r.empty, t: r.t, bi: r.bi,
        credited: r.credited, cancelable: r.cancelable, rate: r.rate,
        activeFrom: r.activeFrom, activeTo: r.activeTo,
        activeMul: r.activeMul, activeJamS: r.activeJamS, activeUsed: r.activeUsed,
      };
    } else {
      this._parked = null;
    }
    this._emitReload('cancel', park && this._parked ? 'park' : '');
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

    // CHANNEL 1 — aim kick. This moves the BULLETS. It is written into the
    // camera's yaw/pitch (the only aim truth) and mirrored into an accumulator
    // that only CORE.recoilReturn of ever comes back.
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
    payload.loud = d.loud;
    payload.pellets = pellets;
    payload.spreadDeg = cone / DEG;
    payload.ox = p.pos.x;
    payload.oy = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
    payload.oz = p.pos.z;

    // Tracer every third round, and always when the mag is nearly out — the
    // gun tells you it is empty before the number would. vigil weapon.js:250.
    const tracerRound = (this.fireCount % 3 === 0) || this.ammo < Math.max(2, d.mag * 0.1);

    for (let k = 0; k < pellets; k++) {
      cam.aimDir(_dir);
      _right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
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
    const firePressed = i.fire && !pr.fire;
    const aimPressed = i.aim && !pr.aim;
    const reloadPressed = i.reload && !pr.reload;
    const meleePressed = i.melee && !pr.melee;
    const swapPressed = i.swap && !pr.swap;
    const slot1Pressed = i.slot1 && !pr.slot1;
    const slot2Pressed = i.slot2 && !pr.slot2;
    pr.fire = i.fire; pr.aim = i.aim; pr.reload = i.reload; pr.melee = i.melee;
    pr.sprint = i.sprint;   // held-state only today; kept edge-ready like the other four
    pr.swap = i.swap; pr.slot1 = i.slot1; pr.slot2 = i.slot2;

    const dead = !!p.dead;

    // ---- the swap (ROUND 5). Lower for half of SWAP_S, change guns at the bottom, raise.
    // The def is read AFTER this so the rest of the step sees the gun that is in the hands.
    if (!dead) {
      if (swapPressed) this.swap();
      else if (slot1Pressed) this.slot(0);
      else if (slot2Pressed) this.slot(1);
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
    const wantAds = i.aim && !p.sprinting && !this.melee && !swapping
      && !(this.reloading && !this.reloading.cancelable) && !dead;
    this.adsT = clamp01(this.adsT + (wantAds ? dt / CORE.adsIn : -dt / CORE.adsOut));
    this.fullyAdsFor = this.adsT >= 0.999 ? this.fullyAdsFor + dt : 0;

    // ---- sprint-out gate. The gun is not up for CORE.sprintOut after a sprint.
    if (p.sprinting) this.sprintOutTimer = CORE.sprintOut;
    else this.sprintOutTimer = Math.max(0, this.sprintOutTimer - dt);

    // ---- input buffering. CORE.inputBuffer is why a pull 200 ms early still
    // lands on the cycle instead of being eaten.
    if (firePressed) this.buffered = CORE.inputBuffer;
    else this.buffered = Math.max(0, this.buffered - dt);
    if (meleePressed) this.meleeBuffered = CORE.inputBuffer;
    else this.meleeBuffered = Math.max(0, this.meleeBuffered - dt);

    // ---- melee: one owner, the whole timeline here. Legal from sprint and
    // mid-reload — it is the answer to something already on top of you.
    if (this.meleeBuffered > 0 && !this.melee && !dead && !swapping) {
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

    // ---- reload timeline
    // A reload press DURING a reload is the active-reload attempt, not a restart:
    // _startReload() already returned early on that press, so this costs nothing when the
    // node is not owned.
    if (reloadPressed && this.reloading) this._activeReloadPress();
    else if (reloadPressed && !swapping) this._startReload();

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
        && this.cycle <= 0 && !dead && !swapping) {
      this._startReload(true);
    }
    if (this.reloading) {
      const r = this.reloading;
      // HANDS: a missed active-reload JAMS — the clock stops, the beats stop, and the
      // gun is simply not ready for activeJamS. Without the node r.jam is never set.
      if (r.jam > 0) {
        r.jam = Math.max(0, r.jam - dt);
      } else {
        r.t += dt * (r.rate || 1);
      }
      while (r.bi < r.beats.length && r.t >= r.beats[r.bi][1] * r.scale) {
        const name = r.beats[r.bi++][0];
        if (name === 'seat' && !r.empty) this._creditReload();
        if (name === 'boltrelease') this._creditReload();
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
      } else if (p.sprinting && !this.melee && (this._canParkReload() || r.auto)) {
        // Running cancels the reload. With HANDS 'Carry' it is PARKED and comes back where it
        // was left; without the node, an AUTO reload (the one the gun started at zero, which
        // wantsSprintCancel deliberately does not block) is thrown away and the derived rule
        // above starts it again the step the legs stop. A reload the PLAYER asked for is not
        // touched here — it still blocks the sprint, exactly as it does on master.
        // Legal at any point in the timeline — the answer to something arriving does not wait
        // for `cancelopen`. Keyed on the player actually RUNNING (player.sprinting, the same
        // truth the sprint-out gate reads), not on the held key: shift held while standing
        // still is not a run, and a key-keyed rule would park and restart the reload every
        // step for as long as it was held.
        this._cancelReload(this._canParkReload());
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
      && this.cycle <= 0 && !dead && !swapping;
    const wantFire = d.auto ? (i.fire || this.buffered > 0) : (this.buffered > 0);
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

    // ---- publish. viewmodel is manifest entry 12 and steps next.
    const s = this.vmState;
    s.adsT = this.adsT; s.firing = this.firing; s.sinceShot = this.sinceShot;
    s.ammo = this.ammo; s.mag = d.mag; s.chambered = this.chambered;
    s.sprinting = !!p.sprinting; s.reloading = this.reloading; s.melee = this.melee;
    s.cycle = this.cycle; s.cycleLen = d.cycle; s.weapon = d.id;
    s.empty = this.ammo === 0;
    s.swapping = swapping; s.swapT = swapping ? this.swapT / SWAP_S : -1;
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
    if (cam.addPunch) cam.addPunch(-1.9, 0.9, 2.6);
    const fx = this._sys('fx');
    if (fx && fx.hitstop) fx.hitstop(MELEE.hitstop);
    this._pulse('melee:connect');
  }

  onResize(w, h) {
    const vm = this._sys('viewmodel');
    if (vm && vm.onResize) vm.onResize(w, h);
  }
}

export default Weapons;
