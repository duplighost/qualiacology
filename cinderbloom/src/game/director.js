// =============================================================================
// CINDERBLOOM — DIRECTOR
// Encounter pacing, spawn placement, mission spine, player life cycle.
// Implements COMBAT_FEEL §6.6 (the wave contract) and §7 (the 60-second loop).
//
// WHAT THIS FILE IS
// -----------------
// Everything else in src/game/ answers "what happens when the player pulls the
// trigger". This file answers "what is the player doing in the next sixty
// seconds, and why". It owns four things and nothing else:
//
//   1. PLACEMENT   where a creature may legally appear, given the terrain, the
//                  props, the player's facing and the sightline between them.
//   2. PACING      the CONTACT / SQUEEZE / ANCHOR / SILENCE rhythm, the spawn
//                  budget, the difficulty ramp, and the tension scalar that
//                  audio and grade read.
//   3. THE SPINE   an ordered list of authored beats for the Thessaly Basin
//                  slice, routed past the landmarks terrain.js carved.
//   4. PLAYER LIFE spawn, damage, death, respawn, checkpoints.
//
// It never creates a mesh, never touches a material, never renders. Creatures
// come from ctx.sys.enemies; impact FX from ctx.sys.vfx; sound from the bus.
//
// DEGRADATION IS A FEATURE, NOT A COURTESY
// ----------------------------------------
// This file was written while enemies.js, combat.js, weapons.js, audio.js and
// hud.js were 11-line stubs, by sibling agents working in parallel. Every
// cross-system call in here is optional-chained through a thin adapter
// (_enemyAdapter), every outbound signal is ALSO published on ctx.bus under
// several plausible names, and every beat has a hard timeout so a missing
// system can never deadlock the mission. When a sibling lands, the director
// picks it up with no edit here. When one is absent, the director still runs,
// still keeps time, still reports a full plan through debugInfo().
//
// The one thing degradation cannot fake is a creature in the frame. If
// ctx.sys.enemies.spawn does not exist, stageEncounter('showcase') stages the
// plan, dresses the site with vfx, and says so loudly in debugInfo().blocked.
//
// DETERMINISM
// -----------
// ctx.rng.fork('director') and its named children only. Never Math.random, never
// wall time. All clocks are float accumulators fed by the fixed 1/60 dt, so a
// re-run of __CB.advance(n) reproduces the same spawn sequence byte for byte.
//
// PUBLIC API
// ----------
//   director.startMission(fromBeatId?)      begin / restart the spine
//   director.stopMission()                  back to idle, despawn everything
//   director.skipTo(beatId)                 jump the spine (debug + tests)
//   director.stageEncounter(name)           deterministic staging for a vista
//   director.spawnPoint(opts)               the placement solver, exposed
//   director.damagePlayer(n, opts)          the damage entry point
//   director.setCheckpoint(pos, yaw)        checkpoint the current state
//   director.respawn()                      force a respawn now
//   director.debugInfo()                    everything, for the harness
//   director.tension                        0..1, read by audio/grade/hud
//   ctx.debug.director                      live knobs, see KNOBS below
//
// BUS CONTRACT — what this file EMITS (siblings: subscribe, do not poll)
// ---------------------------------------------------------------------
//   'director:beat'   {id, index, objective, area, waypoint}
//   'objective'       {text, sub, waypoint:{x,z,dist}}      (hud.js)
//   'director:phase'  {phase, wave, live, tension, encounter}
//   'director:spawn'  {kind, x, y, z, dist, bearing, staged}
//   'music'           {intensity, phase, wave}              (audio.js)
//   'audio:tension'   {value}                               (audio.js alias)
//   'audio:cue'       {name, x, y, z, gain, bearing}        (audio.js)
//   'rumble'          {ms, gain}                            (player.js/audio.js)
//   'player:health'   {hp, max, frac, delta}                (hud.js)
//   'player:death'    {cause, at}
//   'player:respawn'  {x, y, z, yaw}
//   'checkpoint'      {id, x, y, z, yaw}
//
// BUS CONTRACT — what this file LISTENS FOR (aliases, first match wins)
// --------------------------------------------------------------------
//   enemy death   : 'enemy:death' | 'enemy:killed' | 'enemyDeath' | 'kill'
//                   payload may be a handle, an id, or {handle|id|enemy, kind}
//   player damage : 'player:damage' | 'damage:player' | 'playerHit'  {amount}
//   weapon fired  : 'weapon:fire' | 'weapon:shot' | 'shot' | 'fire'
//   pointer lock  : 'pointerlock'  (true starts the mission — a human is here)
//
// KNOBS — ctx.debug.director
// --------------------------
//   waveScale     1.00   enemy count multiplier (mirrors COMBAT_FEEL §8; also
//                        reads ctx.debug.combat.waveScale if the weapons agent
//                        created it, so the documented knob wins)
//   autoStart     false  start the spine at boot instead of on pointer lock
//   enabled       true   master switch; false = idle, no spawns, no beats
//   autoArea      true   drive grade.setArea from the authored beat zones
//   dressFx       true   stage vfx dressing for staged encounters
//   spawnDebug    false  console.log every spawn decision, including rejects
//   tensionGain   1.00   scales the music intensity output
//   respawnDelay  2.2    seconds dead before the respawn
//   regenDelay    4.2    seconds out of damage before health regen
//   regenRate     28     hp per second
// =============================================================================
import * as THREE from 'three';
import { clamp, sat, lerp, smoothstep, damp, wrapPi, DEG } from '../util/math.js';
import { SITES, TERRAIN } from '../world/terrain.js';

// -----------------------------------------------------------------------------
// ROSTER — the director's half of COMBAT_FEEL §6.1. Only the fields that decide
// WHERE and WHEN a creature appears live here; hp, damage, telegraphs and
// animation are enemies.js's, and duplicating them would guarantee divergence.
// -----------------------------------------------------------------------------
const ROSTER = {
  // band: legal spawn distance from the player, metres. It is not the creature's
  // engagement range — a Carapace fights at 0-6 m and therefore has to START at
  // 34-52 m, or its 1.4 s rumble and its haze silhouette have nowhere to happen.
  // NB the annulus is sampled by AREA (sqrt), which biases toward the outer
  // edge: a naive [18,34] band produced a measured mean of 28.7 m and §7's
  // "three Skitters at 22 m" never happened. The bands below are set so the
  // MEAN lands where the spec wants the creature, not the minimum.
  skitter: {
    band: [16, 28], eye: 0.75, needLOS: false, coverPref: 0.85,
    weight: 1, minSpacing: 3.5,
  },
  bloomspitter: {
    // rooted artillery: it must SEE the player or it has no job at all
    band: [24, 38], eye: 1.35, needLOS: true, coverPref: 0.15,
    weight: 2.5, minSpacing: 9,
  },
  carapace: {
    // §7: rumble at 0:34, in range at 0:41 — seven seconds at 2.8 m/s is 20 m of
    // closing, so it has to start around 30 m, not 50
    band: [30, 44], eye: 1.70, needLOS: false, coverPref: 0.35,
    weight: 5, minSpacing: 12,
  },
};

// -----------------------------------------------------------------------------
// HARD LIMITS — COMBAT_FEEL §6.6. These are laws, not preferences: every one of
// them exists because violating it makes an encounter unreadable rather than
// hard. _legal() is the only place they are enforced and nothing bypasses it
// except explicitly staged review shots (staged: true), which are not play.
// -----------------------------------------------------------------------------
const RULES = {
  minSpawnDist: 14,        // never closer than this, ever
  viewConeDeg: 90,         // never inside this cone...
  viewConeSafeDist: 30,    // ...unless further away than this
  minSpawnGapMs: 600,      // between any two spawn events
  frustumPerSec: 2,        // at most 2 enemies may enter the frustum per second
  concurrent: { low: 5, medium: 7, high: 8, ultra: 8 },
  maxSlope: 0.46,          // 1 = vertical; steeper than this and it looks placed
  waterMargin: 0.55,       // metres of clearance above the standing water level
  playfield: 232,          // player.js clamps itself to 236; stay inside that
};

// -----------------------------------------------------------------------------
// THE WAVE — COMBAT_FEEL §6.6's three phases and then silence. Windows are
// seconds from the start of the wave. _buildWave() turns this table plus the
// wave index and waveScale into a concrete, ordered spawn queue.
// -----------------------------------------------------------------------------
const PHASES = [
  { id: 'contact', t0: 0, t1: 8 },
  { id: 'squeeze', t0: 8, t1: 28 },
  { id: 'anchor', t0: 28, t1: 50 },
  { id: 'silence', t0: 50, t1: 57 },
];

// -----------------------------------------------------------------------------
// THE SPINE — the Thessaly Basin slice, beat by beat.
//
// Beats 0-7 are COMBAT_FEEL §7's sixty seconds, implemented as written: six
// seconds of nothing but walking, an unlabelled tutorial that ends the moment
// the player fires, a tell that is one audio cue and one silhouette, contact on
// ONE bearing, the squeeze that gives ADS a job, the anchor with its 1.4 s
// rumble, cleanup, and then seven seconds of designed silence.
//
// Beats 8+ are the rest of the slice: it routes the player out of the channel
// across the Blackglass Flats, into the Wick Forest, and down into the
// Smoulderworks for the set-piece. Every waypoint is anchored to a site
// terrain.js actually carved (SITES), then nudged at runtime onto legal ground
// by _flatNear(), so a terrain rebuild moves the mission with it instead of
// leaving a waypoint inside a rock. That has already cost two agents a capture.
//
// `hold` is a HARD timeout in seconds. Any beat that waits on another system
// (a kill count, a shot being fired) must also be able to time out, or a stubbed
// sibling turns the mission into a soft lock.
// -----------------------------------------------------------------------------
const SPINE = [
  {
    id: 'insert', objective: 'MOVE UP THE CHANNEL', sub: 'Thessaly Basin — 06:14',
    area: 'basin', hold: 6.0, quiet: true,
  },
  {
    id: 'weapons-free', objective: 'WEAPON FREE', sub: 'Test-fire on the bloom stalks',
    hold: 6.0, until: 'fired', quiet: true,
  },
  {
    id: 'the-tell', objective: 'MOVE UP THE CHANNEL', sub: 'Contact — bearing unknown',
    hold: 6.0, cue: 'skitter_chitter', phantom: true,
  },
  {
    id: 'contact', objective: 'ENGAGE', sub: 'Skitters — one bearing',
    encounter: 'contact', hold: 26, until: 'clear',
  },
  {
    id: 'squeeze', objective: 'HOLD THE CHANNEL', sub: 'Spitter rooted — break the root',
    encounter: 'squeeze', hold: 30, until: 'clear',
  },
  {
    id: 'anchor', objective: 'BREAK THE ANCHOR', sub: 'Carapace — flank for the vents',
    encounter: 'anchor', hold: 34, until: 'clear',
  },
  { id: 'cleanup', objective: 'CLEAR THE CHANNEL', hold: 12, until: 'clear' },
  { id: 'silence', objective: '', sub: '', hold: 7.0, quiet: true },

  // --- the slice proper: route past the landmarks -----------------------------
  {
    id: 'advance-flats', objective: 'CROSS THE BLACKGLASS FLATS', area: 'water',
    waypoint: 'flats', hold: 90, quiet: true,
  },
  {
    id: 'flats-ambush', objective: 'ENGAGE', sub: 'Open ground — no cover ahead',
    encounter: 'wave', hold: 70, until: 'clear',
  },
  {
    id: 'advance-wick', objective: 'INTO THE WICK', area: 'canopy',
    waypoint: 'wick', hold: 90, quiet: true,
  },
  {
    id: 'wick-hunt', objective: 'HUNT', sub: 'They are between the stems',
    encounter: 'wave', hold: 70, until: 'clear',
  },
  {
    id: 'advance-grotto', objective: 'DESCEND — THE SMOULDERWORKS', area: 'grotto',
    waypoint: 'grotto', hold: 90, quiet: true,
  },
  {
    id: 'finale', objective: 'SEAL THE SMOULDERWORKS', sub: 'Two anchors',
    encounter: 'finale', hold: 110, until: 'clear',
  },
  { id: 'exfil', objective: 'EXFIL', sub: 'Back up the channel', waypoint: 'start', hold: 120 },
];

const SPINE_INDEX = new Map(SPINE.map((b, i) => [b.id, i]));

// -----------------------------------------------------------------------------
export class Director {
  static id = 'director';
  static deps = ['enemies', 'player', 'terrain', 'props', 'vfx'];

  constructor(ctx) {
    this.ctx = ctx;

    // deterministic streams, forked per concern (COMBAT_FEEL trap 9): adding a
    // dressing effect must not shift the spawn sequence
    this.rng = ctx.rng.fork('director');
    this.rngPlace = ctx.rng.fork('director:place');
    this.rngWave = ctx.rng.fork('director:wave');
    this.rngDress = ctx.rng.fork('director:dress');

    this.p = ctx.debug.director = {
      waveScale: 1.0,
      autoStart: false,
      enabled: true,
      autoArea: true,
      dressFx: true,
      spawnDebug: false,
      insertTeleport: true,
      tensionGain: 1.0,
      respawnDelay: 2.2,
      regenDelay: 4.2,
      regenRate: 28,
      sweepDist: 34,
      // A mandatory objective gets three honest attempts (the first run plus
      // two retries). After that the mission FAILS; it never calls a timeout a
      // victory merely to keep the spine moving.
      objectiveRetries: 2,
    };

    // --- mission state
    this.active = false;
    this.complete = false;
    this.failed = false;
    this.failureReason = null;
    // Every beat transition, with WHY it happened. Nobody could previously tell
    // a beat that was satisfied from a beat that timed out, which made "the
    // mission finished" and "the mission gave up fifteen times in a row" the
    // same observation. tests/playthrough.mjs reads this.
    this.exits = [];
    this.beat = -1;
    this.beatT = 0;
    this.beatFlags = Object.create(null);
    this.wave = 0;
    this.attempt = 0;            // deaths on the CURRENT beat; drives mercy
    this.beatFailures = 0;       // objective timeouts on the current beat
    this.encounter = null;
    this.phase = 'idle';
    this.tension = 0;
    this._tensionOut = -1;

    // --- spawn bookkeeping
    this.live = [];              // [{handle, kind, pos, t, staged}]
    this.spawned = 0;
    this.killed = 0;
    this._lastSpawnT = -99;
    this._frustumWindow = [];    // sim times of recent in-frustum spawns
    this._blocked = null;

    // --- player life
    this.hp = 100; this.maxHp = 100;
    this.dead = false; this.deadT = 0;
    this._lastHurtT = -99;
    this.checkpoint = { id: 'start', beat: 0, x: 0, y: 0, z: 30, yaw: 0 };
    this.deaths = 0;

    // --- staging (review shots)
    this.staged = null;

    // scratch — nothing in update() allocates (COMBAT_FEEL §9.8)
    this._v = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._hit = {};
    this._cand = [];
    this._qres = [];
    this.waypoints = Object.create(null);
    this._wpTarget = null;
  }

  // ===========================================================================
  // boot
  // ===========================================================================
  async init() {
    const c = this.ctx;
    this.terrain = c.sys.terrain;
    this.props = c.sys.props;
    this.player = c.sys.player;
    this.vfx = c.sys.vfx;
    this.enemies = this._enemyAdapter(c.sys.enemies);

    // combat.js is the health model when it has one; see _wireBus()
    const cb = c.sys.combat;
    this._healthOwner = (cb && typeof cb.health === 'number' && typeof cb.damagePlayer === 'function')
      ? cb : null;
    if (this._healthOwner) {
      this.hp = this._healthOwner.health;
      this.maxHp = this._healthOwner.maxHealth ?? 100;
    }

    this._buildWaypoints();

    const start = this.waypoints.start;
    if (start) this.checkpoint = { id: 'start', beat: 0, x: start.x, y: start.y, z: start.z, yaw: 0 };

    this._wireBus();

    if (this.p.autoStart) this.startMission();
    return this;
  }

  _wireBus() {
    const b = this.ctx.bus;
    const on = (keys, fn) => { for (const k of keys) b.on(k, fn); };

    on(['enemy:death', 'enemy:killed', 'enemyDeath', 'enemyKilled', 'kill', 'combat:kill'],
      (e) => this._onEnemyDeath(e));
    on(['weapon:fire', 'weapon:shot', 'shot', 'fire', 'combat:shot'],
      () => { this.beatFlags.fired = true; });

    // HEALTH OWNERSHIP. combat.js is the damage model (CONTRACT §4) and it
    // landed with `health`, `maxHealth`, its own regen and a `player:down`
    // event. Two health models would diverge within one encounter, so when
    // combat.js is present the director MIRRORS it and owns only the
    // consequence — death, the checkpoint, and the respawn. When combat.js is
    // absent (or reverts to a stub) the internal model below takes over.
    on(['player:damage', 'damage:player', 'playerHit', 'player:hit'], (e) => {
      this._lastHurtT = this.ctx.time.elapsed;
      if (this._healthOwner) { this.hp = this._healthOwner.health; return; }
      this.damagePlayer((e && (e.amount ?? e.damage ?? e.hp)) || 0, e);
    });
    on(['player:down'], () => { if (!this.dead) this._die('combat'); });

    // A human taking pointer lock is the honest "the player is playing now"
    // signal, and it never fires in the capture harness — so the review set is
    // untouched by the mission while a real session starts on its own.
    b.on('pointerlock', (locked) => {
      // Terminal states require the explicit retry/new-survey path, which runs
      // the full session reset. A stray canvas click must not resurrect beat 0
      // with zero health, an empty magazine, or stale death counters.
      if (locked && !this.active && !this.failed && !this.complete && this.p.enabled && !this.staged) {
        this.startMission();
      }
    });
  }

  /**
   * Thin, defensive shim over enemies.js. Every sibling API I could reasonably
   * expect is probed once at init and never again — the cost is one property
   * lookup at boot instead of an optional chain per spawn.
   */
  _enemyAdapter(sys) {
    const A = {
      sys,
      ok: !!(sys && typeof sys.spawn === 'function'),
      spawn: null, despawn: null, despawnAll: null, count: null, list: null,
      alive: null, posOf: null, alert: null, settle: null,
    };
    if (!sys) return A;
    if (typeof sys.spawn === 'function') {
      A.spawn = (kind, v, opts) => {
        try { return sys.spawn(kind, v, opts); } catch (e) {
          console.warn('[director] enemies.spawn threw:', e); return null;
        }
      };
    }
    for (const n of ['despawn', 'remove', 'destroy']) {
      if (typeof sys[n] === 'function') {
        A.despawn = (h) => { try { sys[n](h); } catch { /* sibling API drift */ } };
        break;
      }
    }
    // MEASURED ON THIS BUILD: enemies.js publishes despawnAll() but no
    // per-handle despawn, so the probe above finds nothing and A.despawn stays
    // null. That silently disabled COMBAT_FEEL §7's 0:12 "tell" — the beat is
    // gated on `this.enemies.despawn` existing, so the single cheapest tension
    // beat in the minute never fired once. A Creature owns deactivate() and
    // enemies.live is a plain array, which is all a retraction needs. Filed
    // under HANDOFF "## requests" for a real despawn(handle); until then this is
    // the retraction, and it is deliberately conservative — it only ever touches
    // a creature the director itself spawned.
    if (!A.despawn) {
      A.despawn = (h) => {
        try {
          if (!h) return;
          if (typeof h.deactivate === 'function') h.deactivate();
          if (Array.isArray(sys.live)) {
            const i = sys.live.indexOf(h);
            if (i >= 0) sys.live.splice(i, 1);
          }
          if (typeof sys.releaseAttack === 'function') sys.releaseAttack(h);
        } catch { /* sibling API drift */ }
      };
      A.despawnSynthetic = true;
    }
    if (typeof sys.despawnAll === 'function') {
      A.despawnAll = () => { try { sys.despawnAll(); } catch { /* sibling API drift */ } };
    }
    // Staging wants two things the spawn call cannot express: a creature that is
    // already AWARE (a still frame of six idling animals is not a firefight) and
    // a rig that has been stepped off its bind pose. enemies.js exposes both as
    // plain record fields plus its own update(), which is exactly what its own
    // showcase shim used before this file grew a stageEncounter.
    A.alert = (h) => {
      if (!h) return;
      if ('alerted' in h) h.alerted = true;
      if ('aware' in h) h.aware = 1;
      if ('los' in h) h.los = true;
    };
    // POSE — staging only. Awareness alone leaves a creature in its ALERT state,
    // and the state machine needs 0.35 s of sim before it walks. A review shot
    // taken during those 0.35 s is six animals standing still: a diorama, not a
    // firefight. Driving the state directly puts a charge and a rear in the frame
    // on the same tick the plan is laid down, so the picture reads as combat
    // whether or not any sim steps happen afterwards.
    //
    // The numbers mirror enemies.js's private S_* enum (idle/alert/approach/
    // circle/windup/attack/...). They are module-private there, so this is a
    // real coupling and it is the one place in this file that has one — filed
    // under HANDOFF "## requests" asking for a named export or a
    // setStance(handle, name). Guarded so a rename degrades to "still alerted"
    // rather than throwing or teleporting a creature into a nonexistent state.
    const STANCE = { approach: 2, circle: 3, windup: 4, attack: 5 };
    A.pose = (h, which) => {
      if (!h || typeof h._setState !== 'function') return false;
      const s = STANCE[which];
      if (s === undefined) return false;
      try {
        A.alert(h);
        h._setState(s);
        if (which === 'windup' && 'charge' in h) h.charge = 0.9;
        // stateT is what the machine tests to leave a state; starting it partway
        // in stops every staged creature animating in lockstep from t=0.
        if ('stateT' in h) h.stateT = which === 'windup' ? 0.10 : 0.22;
        return true;
      } catch { return false; }
    };
    if (typeof sys.update === 'function') {
      A.settle = (n) => { try { for (let i = 0; i < n; i++) sys.update(1 / 60); } catch { /* mid-build */ } };
    }
    if (typeof sys.count === 'function') A.count = () => { try { return sys.count() | 0; } catch { return 0; } };
    for (const n of ['list', 'all', 'actors', 'live']) {
      if (typeof sys[n] === 'function') { A.list = () => { try { return sys[n]() || []; } catch { return []; } }; break; }
      if (Array.isArray(sys[n])) { A.list = () => sys[n]; break; }
    }
    for (const n of ['isAlive', 'alive']) {
      if (typeof sys[n] === 'function') { A.alive = (h) => { try { return !!sys[n](h); } catch { return true; } }; break; }
    }
    if (typeof sys.positionOf === 'function') A.posOf = (h) => { try { return sys.positionOf(h); } catch { return null; } };
    // enemies.js has no positionOf, but a Creature carries `pos`. Without this
    // _updateTension measured proximity against the SPAWN point forever: a
    // Carapace that had closed from 34 m to 4 m still read as 34 m, so the
    // tension curve — which audio, grade and the HUD all key off — never rose as
    // anything actually approached. The whole point of the scalar is that it
    // tracks the thing getting closer.
    if (!A.posOf) {
      A.posOf = (h) => (h && h.pos && typeof h.pos.x === 'number') ? h.pos : null;
    }
    return A;
  }

  // ===========================================================================
  // WAYPOINTS — anchored to terrain.js's authored sites, resolved onto legal
  // ground at boot. Never hard-code a coordinate: two agents have already lost a
  // capture to a pose that pointed at open ground when it was written and at a
  // rock face by the time it was shot (HANDOFF, repo-wide).
  // ===========================================================================
  _buildWaypoints() {
    const T = this.terrain;
    // search radius is deliberately small: the anchor IS the design intent, and
    // a solver allowed to wander 34 m "to find flatter ground" moved the
    // Smoulderworks waypoint 25 m out of the pit in the first version of this.
    const put = (name, x, z, r = 26, search = 16) => {
      const f = this._flatNear(x, z, search) || { x, z };
      const y = T ? T.heightAt(f.x, f.z) : 0;
      this.waypoints[name] = { name, x: f.x, y, z: f.z, r };
    };
    // the carved channel on the basin floor — COMBAT_FEEL §7's location
    put('start', SITES.pocket.x + 4, SITES.pocket.z + 34, 20);
    put('channel', SITES.pocket.x, SITES.pocket.z + 6, 22);
    // The Blackglass Flats waterline. Anchored on the site CENTRE with a wide
    // search: _flatNear rejects anything under water, so the nearest legal point
    // to the middle of a flooded pan is its shore. That keeps working after the
    // next terrain rebuild, which a hard-coded shoreline coordinate would not.
    put('flats', SITES.glass.x, SITES.glass.z, 24, 60);
    // the Wick Forest floor
    put('wick', SITES.duff.x + 10, SITES.duff.z - 6, 30, 18);
    // the Smoulderworks: the pit floor itself, not its rim
    put('grotto', SITES.grotto.x, SITES.grotto.z, 20, 26);
    // an overlook toward the Sinter Benches, for the exfil read
    put('overlook', 68, -58, 26);
  }

  /**
   * Nearest point to (x,z) within `r` that is flat enough to fight on, above
   * water, and not buried in a prop. Golden-angle search so it is deterministic
   * and does not clump. Returns null if the whole disc is unusable.
   */
  _flatNear(x, z, r = 30, samples = 96) {
    const T = this.terrain;
    if (!T) return { x, z, y: 0 };
    let best = null, bestS = -1e9;
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < samples; i++) {
      const rr = r * Math.sqrt((i + 0.5) / samples), th = i * ga;
      const px = x + rr * Math.cos(th), pz = z + rr * Math.sin(th);
      if (Math.abs(px) > RULES.playfield || Math.abs(pz) > RULES.playfield) continue;
      const h = T.heightAt(px, pz);
      if (h < TERRAIN.waterLevel + RULES.waterMargin) continue;
      const slope = T.slopeAt(px, pz);
      if (slope > 0.30) continue;
      const clear = this._clearance(px, pz);
      // A waypoint is also a checkpoint/teleport destination, so nearby solid
      // dressing is not a soft aesthetic cost: it makes the destination
      // physically invalid and Player.teleport() has to push the capsule away
      // from the authored marker.  That broke deterministic session resets and
      // could respawn a player on the wrong side of cover.  _clearance() is
      // binary at the useful boundary (1 means queryColliders found nothing),
      // so reject occupied candidates exactly as this method's contract says.
      if (clear < 1) continue;
      // Distance dominates once slope and clearance have passed their gates.
      const s = -rr * 1.0 - slope * 3;
      if (s > bestS) { bestS = s; best = { x: px, z: pz, y: h }; }
    }
    return best;
  }

  /** 1 when nothing solid is within 1.6 m, 0 when the point is inside a prop. */
  _clearance(x, z) {
    const P = this.props;
    if (!P || !P.queryColliders) return 1;
    const list = P.queryColliders(x, z, 1.6, this._qres);
    return list.length === 0 ? 1 : sat(1 - list.length * 0.34);
  }

  // ===========================================================================
  // PLACEMENT — the part of this file that does real work.
  //
  // A spawn point is not "a random point in an annulus". It has to be somewhere
  // the creature could plausibly have come from, on ground it can stand on, out
  // of the player's face, and — for everything except the Bloomspitter — behind
  // something, so it emerges rather than materialises. The Bloomspitter is the
  // exception on purpose: it is rooted artillery and needs the sightline or it
  // is a decoration.
  //
  // Cost: 40 cheap terrain candidates, then at most 8 collider raycasts on the
  // survivors. A solve happens at most once per spawn event (600 ms apart at
  // minimum), never per frame.
  // ===========================================================================
  /**
   * @param {{kind?:string, bearing?:number, spread?:number, band?:number[],
   *          anchor?:THREE.Vector3, staged?:boolean, needLOS?:boolean,
   *          minSpacing?:number, tries?:number}} o
   * @returns {{x,y,z,dist,bearing,los,cover,score}|null}
   */
  spawnPoint(o = {}) {
    const T = this.terrain, P = this.props;
    const pl = this.player;
    if (!T || !pl) return null;

    const R = ROSTER[o.kind] || ROSTER.skitter;
    const band = o.band || R.band;
    const needLOS = o.needLOS !== undefined ? o.needLOS : R.needLOS;
    const staged = !!o.staged;
    // A staged composition is deliberately tight — a Carapace 13 m out and a
    // Skitter 13 m out 39 deg away are 8.7 m apart, which the gameplay spacing
    // (12 m) rejects, and the showcase silently lost its anchor creature.
    // A staged composition is deliberately tight — and tighter than it used to be
    // now that the near creatures sit at 9-12 m rather than 12-34 m. Two spawns
    // 14 deg apart at 10 m are only 2.4 m apart, so the old 4.5 m staged spacing
    // silently rejected the second one and the showcase lost creatures it had
    // planned for. 2.6 m still keeps them from intersecting.
    const spacing = o.minSpacing ?? (staged ? Math.min(R.minSpacing, 2.6) : R.minSpacing);
    const ax = o.anchor ? o.anchor.x : pl.pos.x;
    const az = o.anchor ? o.anchor.z : pl.pos.z;
    const eyeY = pl.pos.y;                              // player.pos.y IS the eye
    const bearing = o.bearing !== undefined ? o.bearing : this.rngPlace.range(-Math.PI, Math.PI);
    const spread = o.spread ?? 0.42;
    // FRAMING GATE — staged only. The world camera is 65 deg vertical at 16:9,
    // so the horizontal HALF angle is ~50 deg and anything past ~34 deg off axis
    // is in the outermost sixth of the frame or clipped out of it entirely.
    // Measured before this gate existed: the six showcase creatures landed 16,
    // 34, 37, 39, 47 and 52 deg off axis — four of them effectively outside the
    // composition — because the sightline retry was widening the BEARING and
    // throwing them sideways to find clear ground. A staged point that is not in
    // shot is not worth having, so off-axis is now a hard reject and the retry
    // widens the DISTANCE band instead (see the retry below).
    const maxOff = staged ? (o.maxOffAxis ?? 0.58) : Infinity;   // 0.58 rad = 33 deg
    const tries = o.tries ?? 40;

    // --- pass 1: cheap geometric candidates, terrain only
    const cand = this._cand; cand.length = 0;
    for (let i = 0; i < tries; i++) {
      const a = bearing + this.rngPlace.gauss(0, spread);
      // sqrt for a uniform annulus sample, not linear — the same mistake as
      // COMBAT_FEEL trap 8's spread sampling, one dimension up
      const d = lerp(band[0], band[1], Math.sqrt(this.rngPlace.next()));
      const x = ax + Math.sin(a) * d, z = az + Math.cos(a) * d;
      if (Math.abs(x) > RULES.playfield || Math.abs(z) > RULES.playfield) continue;

      const dx = x - pl.pos.x, dz = z - pl.pos.z;
      const dist = Math.hypot(dx, dz);
      if (!staged && dist < RULES.minSpawnDist) continue;

      const h = T.heightAt(x, z);
      if (h < TERRAIN.waterLevel + RULES.waterMargin) continue;
      const slope = T.slopeAt(x, z);
      if (slope > RULES.maxSlope) continue;

      // view-cone law: nothing pops into existence in front of the player's face
      if (!staged && dist < RULES.viewConeSafeDist) {
        // player.yaw is the camera yaw; forward is -Z rotated by yaw, i.e. the
        // bearing atan2(sin(yaw+PI), cos(yaw+PI))
        const rel = Math.abs(wrapPi(Math.atan2(dx, dz) - wrapPi(pl.yaw + Math.PI)));
        if (rel < RULES.viewConeDeg * 0.5 * DEG) continue;
      }

      // do not stack spawns on top of each other or on a live creature
      let tooClose = false;
      for (let k = 0; k < this.live.length; k++) {
        const L = this.live[k];
        if (Math.hypot(L.pos.x - x, L.pos.z - z) < spacing) { tooClose = true; break; }
      }
      if (tooClose) continue;

      // framing: reject anything the camera cannot see, and prefer the bearing
      // the composition actually asked for
      const off = Math.abs(wrapPi(Math.atan2(dx, dz) - wrapPi(pl.yaw + Math.PI)));
      if (off > maxOff) continue;

      const bandMid = (band[0] + band[1]) * 0.5;
      let score = -Math.abs(dist - bandMid) * 0.06 - slope * 3 + this._clearance(x, z) * 1.2;
      if (staged) score -= off * 3.0;          // on-axis beats off-axis, hard
      cand.push({ x, y: h, z, dist, bearing: Math.atan2(dx, dz), slope, score, los: null, cover: 0, off });
    }
    if (!cand.length) return null;

    // --- pass 2: sightline + cover, on the best 8 only (a raycast is ~40x the
    // cost of a heightfield sample, so it is worth sorting first)
    cand.sort((a, b) => b.score - a.score);
    const n = Math.min(8, cand.length);
    let best = null;
    for (let i = 0; i < n; i++) {
      const c = cand[i];
      const oy = c.y + R.eye;
      const dx = pl.pos.x - c.x, dy = eyeY - oy, dz = pl.pos.z - c.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      let clear = true;
      if (P && P.raycastColliders) {
        const hit = P.raycastColliders(c.x, oy, c.z, dx / len, dy / len, dz / len, len - 0.4, this._hit);
        clear = !hit;
      }
      c.los = clear;
      // cover = something solid within 7 m of the spawn to step out from
      c.cover = P && P.queryColliders ? sat(P.queryColliders(c.x, c.z, 7, this._qres).length / 3) : 0;

      let s = c.score;
      // STAGED SHOTS INVERT THE COVER PREFERENCE, and this is not a nicety.
      // Gameplay wants a Skitter to emerge from behind something (coverPref
      // 0.85 => the solver actively SCORES OCCLUSION UP). A review shot wants
      // the creature ON CAMERA. Left shared, the gameplay term won and every
      // staged encounter picked hidden ground: measured on this build,
      // stageEncounter('contact') placed 3 of 3 Skitters with los:false and
      // 'showcase' 4 of 6, which is the entire reason the 'combat' vista
      // photographed as an empty landscape while debugInfo() cheerfully
      // reported six live creatures. LOS is a hard requirement when staged.
      if (staged) s += clear ? 9 : -40;
      else if (needLOS) s += clear ? 6 : -14;          // rooted artillery must see
      else s += (clear ? -1.5 : 2.5) * (R.coverPref * 2) + c.cover * 2.2;
      c.score = s;
      if (!best || s > best.score) best = c;
    }

    // A staged pick with no sightline is a creature that will not be in the
    // picture. Retry along the SAME bearing over a wider distance range: moving
    // 6 m nearer or further usually steps out from behind the trunk that was
    // occluding it, whereas widening the bearing (what this did first) buys the
    // sightline by walking the creature out of frame — the exact trade the
    // framing gate above exists to refuse.
    if (staged && best && !best.los && !o._retry) {
      const lo = Math.max(6, band[0] - 5), hi = band[1] + 9;
      const r2 = this.spawnPoint({ ...o, band: [lo, hi], tries: 64, _retry: 1 });
      if (r2 && r2.los) return r2;
      return r2 || best;
    }

    if (needLOS && best && !best.los && !o._retry) {
      // no sightline anywhere in the sector: widen once rather than fail. An
      // encounter missing its pressure element is worse than one slightly
      // off-plan.
      return this.spawnPoint({ ...o, spread: Math.min(1.5, spread * 2.2), _retry: 1 });
    }
    if (this.p.spawnDebug) {
      console.log('[director] place', o.kind, best
        ? 'd=' + best.dist.toFixed(1) + ' los=' + best.los + ' cover=' + best.cover.toFixed(2)
        : 'FAILED', '(from ' + cand.length + ' candidates)');
    }
    return best;
  }

  /**
   * Deterministic last-resort placement for a mission order whose normal seeded
   * sector solve found no candidate. This is broader, not looser: it scans the
   * full annulus while preserving all hard placement laws.
   */
  _fallbackSpawnPoint(o = {}) {
    const T = this.terrain, P = this.props, pl = this.player;
    if (!T || !pl) return null;
    const R = ROSTER[o.kind] || ROSTER.skitter;
    const band = o.band || R.band;
    const needLOS = o.needLOS !== undefined ? o.needLOS : R.needLOS;
    const spacing = o.minSpacing ?? R.minSpacing;
    const ax = o.anchor ? o.anchor.x : pl.pos.x;
    const az = o.anchor ? o.anchor.z : pl.pos.z;
    const base = o.bearing ?? wrapPi(pl.yaw + Math.PI);
    const ga = Math.PI * (3 - Math.sqrt(5));
    let best = null, bestS = -1e9;

    for (let i = 0; i < 192; i++) {
      // Twelve radial strata rotated by the golden angle cover the annulus
      // deterministically instead of gambling on the same narrow sector again.
      const rf = ((i % 12) + 0.5) / 12;
      const d = lerp(band[0], band[1], Math.sqrt(rf));
      const a = base + i * ga;
      const x = ax + Math.sin(a) * d, z = az + Math.cos(a) * d;
      if (Math.abs(x) > RULES.playfield || Math.abs(z) > RULES.playfield) continue;

      const dx = x - pl.pos.x, dz = z - pl.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < RULES.minSpawnDist) continue;
      const y = T.heightAt(x, z);
      if (!Number.isFinite(y) || y < TERRAIN.waterLevel + RULES.waterMargin) continue;
      const slope = T.slopeAt(x, z);
      if (!Number.isFinite(slope) || slope > RULES.maxSlope) continue;

      if (dist < RULES.viewConeSafeDist) {
        const rel = Math.abs(wrapPi(Math.atan2(dx, dz) - wrapPi(pl.yaw + Math.PI)));
        if (rel < RULES.viewConeDeg * 0.5 * DEG) continue;
      }

      let crowded = false;
      for (let k = 0; k < this.live.length; k++) {
        const L = this.live[k];
        if (Math.hypot(L.pos.x - x, L.pos.z - z) < spacing) { crowded = true; break; }
      }
      if (crowded) continue;

      const clear = this._clearance(x, z);
      if (clear <= 0) continue;
      const oy = y + R.eye;
      const tx = pl.pos.x - x, ty = pl.pos.y - oy, tz = pl.pos.z - z;
      const len = Math.hypot(tx, ty, tz) || 1;
      let los = true;
      if (P?.raycastColliders) {
        los = !P.raycastColliders(x, oy, z, tx / len, ty / len, tz / len,
          len - 0.4, this._hit);
      }
      if (needLOS && !los) continue;

      const cover = P?.queryColliders
        ? sat(P.queryColliders(x, z, 7, this._qres).length / 3) : 0;
      const mid = (band[0] + band[1]) * 0.5;
      const score = clear * 3 - slope * 4 - Math.abs(dist - mid) * 0.04
        + (needLOS ? (los ? 4 : -20) : (los ? -0.5 : 1.5) * R.coverPref) + cover;
      if (score > bestS) {
        bestS = score;
        best = { x, y, z, dist, bearing: Math.atan2(dx, dz), slope, score, los, cover };
      }
    }
    return best;
  }

  /** The §6.6 gate. Returns null if legal, otherwise the reason it is not. */
  _legal(kind, pt, staged) {
    if (staged) return null;
    const t = this.ctx.time.elapsed;
    const cap = RULES.concurrent[this.ctx.quality.preset] ?? 8;
    if (this.live.length >= cap) return 'concurrent';
    if ((t - this._lastSpawnT) * 1000 < RULES.minSpawnGapMs) return 'gap';
    if (pt.dist < RULES.minSpawnDist) return 'tooClose';
    // at most two enemies may enter the frustum in the same second
    if (this._inFrustum(pt)) {
      let n = 0;
      for (let i = this._frustumWindow.length - 1; i >= 0; i--) {
        if (t - this._frustumWindow[i] < 1.0) n++; else break;
      }
      if (n >= RULES.frustumPerSec) return 'frustum';
    }
    return null;
  }

  _inFrustum(pt) {
    const cam = this.ctx.camera;
    this._v.set(pt.x, pt.y + 1, pt.z).sub(cam.position);
    const d = this._v.length();
    if (d < 0.01) return true;
    this._v.multiplyScalar(1 / d);
    this._fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    // horizontal half-angle of the world camera, with a small margin
    const halfV = cam.fov * 0.5 * DEG;
    const halfH = Math.atan(Math.tan(halfV) * cam.aspect);
    return this._v.dot(this._fwd) > Math.cos(halfH + 0.12);
  }

  // ===========================================================================
  // SPAWNING
  // ===========================================================================
  _spawn(kind, opts = {}) {
    let pt = opts.point || this.spawnPoint({ kind, ...opts });
    if (!pt && opts.fallback) pt = this._fallbackSpawnPoint({ kind, ...opts });
    if (!pt) {
      this._blocked = 'no legal spawn point for ' + kind;
      return { deferred: 'noPoint' };
    }
    const why = this._legal(kind, pt, opts.staged);
    if (why) return { deferred: why };

    let handle = null;
    if (this.enemies.ok) {
      this._v.set(pt.x, pt.y, pt.z);
      handle = this.enemies.spawn(kind, this._v, { bearing: pt.bearing, staged: !!opts.staged });
      if (handle === undefined) handle = null;
      // enemies.js returns null when ITS own pool or maxLive refuses. That is a
      // deferral, not a spawn: recording it as live would silently burn a slot
      // in our concurrency budget for a creature that does not exist.
      if (handle === null) return { deferred: 'enemiesRefused' };
      // Authored encounter bodies must enter the fight even when they emerge
      // from cover. Without awareness, a non-LOS Skitter remains in S_IDLE
      // forever and a mandatory clear objective becomes unwinnable.
      if (opts.staged || opts.alerted) this.enemies.alert(handle);
    } else {
      this._blocked = 'ctx.sys.enemies.spawn is absent — director staged the plan only';
    }

    const rec = {
      handle, kind, staged: !!opts.staged,
      pos: new THREE.Vector3(pt.x, pt.y, pt.z),
      t: this.ctx.time.elapsed, dist: pt.dist, bearing: pt.bearing, los: pt.los,
      real: handle !== null,
    };
    this.live.push(rec);
    this.spawned++;
    // A recovered order clears the diagnostic; debugInfo must describe the
    // current state, not preserve a frightening sentence from four seconds ago.
    this._blocked = null;
    this._lastSpawnT = this.ctx.time.elapsed;
    if (this._inFrustum(pt)) this._frustumWindow.push(this._lastSpawnT);
    if (this._frustumWindow.length > 16) this._frustumWindow.splice(0, 8);

    this.ctx.bus.emit('director:spawn', {
      kind, x: pt.x, y: pt.y, z: pt.z, dist: pt.dist, bearing: pt.bearing, staged: !!opts.staged,
    });
    this._cue(kind === 'carapace' ? 'carapace_approach' : kind + '_spawn', pt, 0.7);
    return rec;
  }

  _despawnAll(stagedOnly = false) {
    // Prefer the bulk clear: enemies.js pools its creatures and only despawnAll()
    // returns them to the pool AND drops the corpses. Per-handle removal is used
    // only when a sibling actually publishes one.
    if (!stagedOnly && this.enemies && this.enemies.despawnAll) {
      this.enemies.despawnAll();
      this.live.length = 0;
      return;
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const L = this.live[i];
      if (stagedOnly && !L.staged) continue;
      if (L.handle != null && this.enemies.despawn) this.enemies.despawn(L.handle);
      this.live.splice(i, 1);
    }
  }

  _onEnemyDeath(e) {
    // combat.js emits {actor, ...}; an enemies.js may emit a handle, an id, or
    // the record itself. Try them all — a missed death leaves an encounter that
    // never ends, which is the worst failure this file has.
    const h = e && (e.handle ?? e.actor ?? e.enemy ?? e.target ?? e.id ?? e);
    const id = e && e.id;
    let idx = -1;
    for (let i = 0; i < this.live.length; i++) {
      const L = this.live[i];
      if (L.handle == null) continue;
      // enemies.js emits {kind, id, pos} — an id, not the record. combat.js
      // emits {actor}. Match either.
      if (L.handle === h || (id != null && L.handle.id === id)) { idx = i; break; }
    }
    if (idx < 0 && e && e.kind) {
      for (let i = 0; i < this.live.length; i++) if (this.live[i].kind === e.kind) { idx = i; break; }
    }
    if (idx < 0) return;
    this.live.splice(idx, 1);
    this.killed++;
    this._tensionOut = -1;   // force a music update on the next frame
  }

  /**
   * Keep our list honest against whatever enemies.js is willing to tell us.
   * Cheap, twice a second, and it is the only thing standing between a silently
   * despawned creature and an encounter that never ends.
   */
  _reconcile() {
    const A = this.enemies;
    if (!A.ok) {
      // No enemies system: our records are plan-only phantoms. Expire them or a
      // stubbed sibling wedges the concurrency cap forever and every later
      // encounter in the run silently spawns nothing.
      const now = this.ctx.time.elapsed;
      for (let i = this.live.length - 1; i >= 0; i--) {
        if (!this.live[i].staged && now - this.live[i].t > 18) this.live.splice(i, 1);
      }
      return;
    }
    if (A.alive) {
      for (let i = this.live.length - 1; i >= 0; i--) {
        const L = this.live[i];
        if (L.handle != null && !A.alive(L.handle)) { this.live.splice(i, 1); this.killed++; }
      }
      return;
    }
    if (A.list) {
      // enemies.js publishes its live array; anything of ours that is no longer
      // in it is dead, despawned, or was recycled out from under us.
      const arr = A.list();
      for (let i = this.live.length - 1; i >= 0; i--) {
        const L = this.live[i];
        if (L.handle == null) continue;
        if (arr.indexOf(L.handle) < 0) { this.live.splice(i, 1); this.killed++; }
      }
      return;
    }
    if (A.count) {
      const n = A.count();
      // trust a LOWER count (something died and told nobody); never trust a
      // higher one, since another system may spawn creatures we do not own
      while (this.live.length > n && this.live.length) { this.live.shift(); this.killed++; }
    }
  }

  // ===========================================================================
  // ENCOUNTERS — a wave is an ordered queue of spawn orders with due times.
  // ===========================================================================
  /**
   * COMBAT_FEEL §6.6 made concrete. Wave 1 is the authored minute; every wave
   * after it adds bodies — never speed, and never a shorter telegraph, which is
   * the §6.2 law and the reason these creatures are allowed to be fast at all.
   *
   * @param {string} name    encounter template
   * @param {number} wave    PROGRESS index — how far through the slice we are
   * @param {number} attempt how many times the player has died on this beat
   */
  _buildWave(name, wave, attempt = 0) {
    const rs = this.rngWave;
    const scale = clamp(this.p.waveScale * (this.ctx.debug.combat?.waveScale ?? 1), 0.4, 2.2);
    const ramp = 1 + 0.18 * Math.max(0, wave - 1);
    // MERCY. A player who has died twice on the same beat is not asking for a
    // bigger wave, and the ramp above is indexed on progress precisely so this
    // term can pull the other way. Two deaths take ~13% off the body count,
    // four take ~25%, and it floors there — it never trivialises the fight, it
    // just stops a difficulty wall from being a brick wall. This is the one
    // place the director is allowed to lie to the player about the plan.
    const mercy = 1 - clamp(Math.max(0, attempt - 1) * 0.07, 0, 0.25);
    const n = (base) => Math.max(1, Math.round(base * scale * ramp * mercy));

    // ONE bearing for contact. The player learns which way to face; a second
    // bearing inside the first 8 s is the single most common way a designer
    // makes an encounter feel cheap.
    //
    // It is deliberately OFF the direction of travel by 34-66 degrees. Dead
    // ahead is worse than it sounds: the §6.6 view-cone law then forces every
    // contact spawn out past 30 m (measured: mean 28.5 m, minimum 24.3 m with
    // an on-axis bearing), so §7's "three Skitters at 22 m" becomes physically
    // unspawnable and the beat loses its turn — the player never has to find
    // the bearing, because it is already under the crosshair.
    const travel = this._travelBearing();
    const side = rs.bool() ? 1 : -1;
    const b1 = wrapPi(travel + side * rs.range(0.60, 1.15));
    const b2 = wrapPi(b1 - side * rs.range(1.9, 2.7));   // 110-155 deg, other side
    const orders = [];
    const push = (at, kind, bearing, extra) => orders.push({
      at, kind, bearing, spread: 0.34, tries: 0, done: false, ...extra,
    });

    const nSkitterA = clamp(n(3), 2, 4);
    const nSkitterB = clamp(n(4), 3, 6);

    if (name === 'contact' || name === 'wave' || name === 'finale') {
      let t = 0;
      for (let i = 0; i < nSkitterA; i++) { push(t, 'skitter', b1); t += rs.range(0.75, 1.15); }
    }
    if (name === 'squeeze' || name === 'wave' || name === 'finale') {
      const base = name === 'squeeze' ? 0 : PHASES[1].t0;
      push(base + 0.6, 'bloomspitter', wrapPi(b1 + rs.gauss(0, 0.35)), { spread: 0.55 });
      let t = base + 2.0;
      for (let i = 0; i < nSkitterB; i++) { push(t, 'skitter', b2); t += rs.range(1.3, 1.9); }
    }
    if (name === 'anchor' || name === 'wave' || name === 'finale') {
      const base = name === 'anchor' ? 0 : PHASES[2].t0;
      // the 1.4 s ground rumble is part of the spawn, not decoration (§7 0:34)
      orders.push({ at: base, kind: null, rumble: 1400, tries: 0, done: false });
      push(base + 1.4, 'carapace', wrapPi(b1 + rs.gauss(0, 0.4)), { spread: 0.3 });
      if (wave >= 3) push(base + 4.0, 'bloomspitter', b2, { spread: 0.6 });
    }
    if (name === 'finale') {
      push(PHASES[1].t0 + 4.0, 'bloomspitter', b2, { spread: 0.6 });
      push(PHASES[2].t0 + 6.0, 'carapace', b2, { spread: 0.3 });
    }

    orders.sort((a, b) => a.at - b.at);
    // A contact-only wave must not announce "anchor" to the music layer eight
    // seconds in just because the clock passed 8 s. Cap the phase label at the
    // highest phase this wave actually contains.
    const phaseCap = (name === 'contact') ? 0 : (name === 'squeeze') ? 1 : 2;
    return { name, wave, t: 0, orders, i: 0, phase: 'contact', phaseCap, done: false, b1, b2 };
  }

  /** Bearing the player is travelling in, or facing if stationary. */
  _travelBearing() {
    const pl = this.player;
    if (!pl) return 0;
    const sp = Math.hypot(pl.vel.x, pl.vel.z);
    if (sp > 0.8) return Math.atan2(pl.vel.x, pl.vel.z);
    if (this._wpTarget) {
      const w = this.waypoints[this._wpTarget];
      if (w) return Math.atan2(w.x - pl.pos.x, w.z - pl.pos.z);
    }
    return wrapPi(pl.yaw + Math.PI);
  }

  _updateEncounter(dt) {
    const E = this.encounter;
    if (!E) return;
    E.t += dt;

    // phase label for audio/hud/debug
    for (let k = 0; k < PHASES.length; k++) {
      const ph = PHASES[k];
      if (E.t >= ph.t0 && E.t < ph.t1) {
        E.phase = k === 3 ? 'silence' : PHASES[Math.min(k, E.phaseCap)].id;
        break;
      }
    }
    if (E.t >= PHASES[3].t1) E.done = true;

    while (E.i < E.orders.length) {
      const o = E.orders[E.i];
      if (E.t < o.at) break;
      if (o.rumble) {
        this.ctx.bus.emit('rumble', { ms: o.rumble, gain: 1 });
        E.i++;
        continue;
      }
      const r = this._spawn(o.kind, {
        bearing: o.bearing, spread: o.spread,
        band: o.band,
        minSpacing: o.minSpacing,
        // A mandatory clear encounter may introduce enemies from cover, but it
        // may not strand them behind cover. The current steering is local—not a
        // navmesh—so every authored order must begin with a valid sightline.
        // This is also the honest contract for the objective marker: ENGAGE
        // means there is something the player can actually engage.
        needLOS: o.needLOS !== undefined ? o.needLOS : true,
        // After four seeded sector solves, search the whole legal annulus with
        // the deterministic fallback. The order remains pending either way.
        fallback: o.tries >= 4,
        alerted: true,
      });
      if (r && r.deferred) {
        // A blocked order is DEFERRED, never silently dropped. If it remains
        // impossible the beat's explicit timeout/retry/failure policy owns the
        // result; incrementing E.i here would counterfeit a cleared encounter.
        o.at += 0.35; o.tries++;
        break;
      }
      E.i++;
    }

    if (E.i >= E.orders.length && this.live.length === 0 && E.t > 2) E.done = true;
    this.phase = E.done ? 'silence' : E.phase;
  }

  // ===========================================================================
  // THE SPINE
  // ===========================================================================

  /**
   * Return every session-owned system to the state behind BEGIN SURVEY.
   *
   * This deliberately lives here rather than in menu.js: pointer lock, the
   * harness and a future end screen all need the same reset, and a half-reset
   * (director clean, gun/health dirty) is worse than no reset because it looks
   * like a new game until the first frame of play.
   */
  resetSession(o = {}) {
    const freshLoadout = o.loadout !== false;
    const movePlayer = o.teleport !== false;

    this.active = false;
    this.complete = false;
    this.failed = false;
    this.failureReason = null;
    this.exits.length = 0;
    this.beat = -1;
    this.beatT = 0;
    this.beatFlags = Object.create(null);
    this.wave = 0;
    this.attempt = 0;
    this.beatFailures = 0;
    this.encounter = null;
    this.phase = 'idle';
    this.tension = 0;
    this._tensionOut = -1;
    this._wpTarget = null;
    this.staged = null;

    this._despawnAll();
    this.spawned = 0;
    this.killed = 0;
    this._lastSpawnT = -99;
    this._frustumWindow.length = 0;
    this._blocked = null;

    this.dead = false;
    this.deadT = 0;
    this.deaths = 0;
    this._lastHurtT = -99;
    this.hp = this.maxHp;

    const start = this.waypoints.start;
    const channel = this.waypoints.channel;
    let yaw = 0;
    if (start && channel) yaw = wrapPi(Math.atan2(channel.x - start.x, channel.z - start.z) + Math.PI);
    if (start) {
      this.checkpoint = { id: 'start', beat: 0, x: start.x, y: start.y, z: start.z, yaw };
      if (movePlayer) this.player?.teleport?.([start.x, start.y, start.z], yaw, -0.02);
    }

    const input = this.ctx.sys.input;
    input?.clearSynthetic?.();
    input?.resetTemporal?.();

    if (freshLoadout) {
      const w = this.ctx.sys.weapons;
      // setPose is the weapon's public cancellation/reset path. It clears ADS,
      // reload, melee, recoil and the review hold while restoring a full mag.
      w?.setPose?.('idle');
      if (w) {
        if (typeof w.reserve === 'number') w.reserve = 210;
        if (typeof w.shotsFired === 'number') w.shotsFired = 0;
        if (typeof w.meleeSwings === 'number') w.meleeSwings = 0;
        if (typeof w.meleeHits === 'number') w.meleeHits = 0;
        if (typeof w.meleeKills === 'number') w.meleeKills = 0;
        if (typeof w.lastShotT === 'number') w.lastShotT = -99;
      }

      const cb = this._healthOwner || this.ctx.sys.combat;
      if (cb) {
        cb.clearStage?.();
        cb.resetTemporal?.();
        if (typeof cb.maxHealth === 'number') cb.health = cb.maxHealth;
        if (typeof cb.magLeft === 'number') cb.magLeft = 30;
        if (typeof cb.reserve === 'number') cb.reserve = 210;
        if (typeof cb.reloading === 'number') cb.reloading = 0;
        if (typeof cb.fireClock === 'number') cb.fireClock = 0;
        if (typeof cb.shotsFired === 'number') cb.shotsFired = 0;
        if (typeof cb.kills === 'number') cb.kills = 0;
        if (typeof cb.killT === 'number') cb.killT = 99;
        if ('killKind' in cb) cb.killKind = null;
        if ('killZone' in cb) cb.killZone = null;
        if ('killMelee' in cb) cb.killMelee = false;
        if (typeof cb.lastHitT === 'number') cb.lastHitT = -99;
        if ('regenerating' in cb) cb.regenerating = false;
        if (Array.isArray(cb._drops)) {
          for (const d of cb._drops) d.live = false;
          cb._dropsLive = 0;
          cb._dropN = 0;
          if (cb.dropMesh) cb.dropMesh.count = 0;
        }
        if (Array.isArray(cb.caches)) for (const c of cb.caches) c.armed = true;
        if (typeof cb.pickupT === 'number') cb.pickupT = 99;
        if (typeof cb.cacheT === 'number') cb.cacheT = 99;
        this.hp = typeof cb.health === 'number' ? cb.health : this.maxHp;
        this.maxHp = cb.maxHealth ?? this.maxHp;
      }
    }

    this.ctx.sys.hud?.stage?.('clear');
    this.ctx.sys.hud?.clearObjective?.();
    this.ctx.sys.audio?.resetTemporal?.();
    this._emitObjective('', '');
    const liveWeapon = this.ctx.sys.weapons;
    this.ctx.bus.emit('weapon:ammo', {
      ammo: typeof liveWeapon?.ammo === 'number' ? liveWeapon.ammo : 30,
      reserve: typeof liveWeapon?.reserve === 'number' ? liveWeapon.reserve : 210,
    });
    this.ctx.bus.emit('player:health', {
      hp: this.hp, max: this.maxHp, frac: this.maxHp > 0 ? this.hp / this.maxHp : 0, delta: 0,
    });
    this.ctx.bus.emit('mission:reset', { freshLoadout, x: start?.x, y: start?.y, z: start?.z });
    return this;
  }

  /** Begin a genuinely new run. `startMission()` remains the resume/debug API. */
  startFreshMission(fromBeatId) {
    this.resetSession({ loadout: true, teleport: true });
    return this.startMission(fromBeatId);
  }

  startMission(fromBeatId) {
    this.active = true;
    this.complete = false;
    this.failed = false;
    this.failureReason = null;
    this.exits.length = 0;
    this.dead = false;
    this.hp = this.maxHp;
    this.wave = 0;
    this.attempt = 0;
    this.beatFailures = 0;
    this.beat = -1;              // so _enterBeat(0) is not mistaken for a retry
    this.killed = 0; this.spawned = 0;
    this.staged = null;
    this.tension = 0; this._tensionOut = -1;
    this._despawnAll();
    // The insert: put the player in the channel COMBAT_FEEL §7 describes, but
    // only if they are not already somewhere sensible. Teleporting a player who
    // just clicked to take pointer lock would be worse than starting the spine
    // where they stand — every beat is player-relative anyway.
    const w = this.waypoints.start;
    if (this.p.insertTeleport && w && this.player &&
      Math.hypot(this.player.pos.x - w.x, this.player.pos.z - w.z) > 60) {
      const face = Math.atan2(this.waypoints.channel.x - w.x, this.waypoints.channel.z - w.z);
      this.player.teleport?.([w.x, w.y, w.z], wrapPi(face + Math.PI), -0.02);
    }
    this._enterBeat(fromBeatId != null ? (SPINE_INDEX.get(fromBeatId) ?? 0) : 0);
    return this;
  }

  stopMission() {
    this.active = false;
    this.encounter = null;
    this.beat = -1;
    this.phase = 'idle';
    this._wpTarget = null;
    this._despawnAll();
    this._emitObjective('', '');
    return this;
  }

  skipTo(beatId) {
    const i = SPINE_INDEX.get(beatId);
    if (i == null) return false;
    this.active = true;
    this._despawnAll();
    this._enterBeat(i);
    return true;
  }

  _recordExit(b, reason, extra = {}) {
    if (this.exits.length >= 256) return;
    this.exits.push({
      id: b.id, index: this.beat, reason,
      t: +this.beatT.toFixed(2),
      attempt: this.attempt || 0, live: this.live.length,
      at: +this.ctx.time.elapsed.toFixed(2),
      ...extra,
    });
  }

  _mandatorySatisfied() {
    for (let i = 0; i < SPINE.length; i++) {
      const b = SPINE[i];
      if (!b.until && !b.waypoint) continue;
      if (!this.exits.some(e => e.index === i && e.reason === 'condition')) return false;
    }
    return true;
  }

  _failMission(reason, b = SPINE[this.beat]) {
    this.active = false;
    this.complete = false;
    this.failed = true;
    this.failureReason = reason || 'objective failed';
    this.encounter = null;
    this.phase = 'failed';
    this._wpTarget = null;
    this._despawnAll();
    this._emitObjective('SURVEY FAILED', b ? (b.objective || b.id) : this.failureReason);
    this.ctx.bus.emit('mission:failed', {
      at: this.ctx.time.elapsed,
      beat: b?.id || null,
      reason: this.failureReason,
      attempts: this.attempt || 0,
      failures: this.beatFailures || 0,
    });
    return false;
  }

  /**
   * @param {number} i              spine index
   * @param {boolean} retry         retry of the current beat, not progression
   * @param {boolean} restartClock  objective retry gets a fresh deadline;
   *                                death retry preserves elapsed objective time
   */
  _enterBeat(i, retry = false, restartClock = false) {
    if (i >= SPINE.length) {
      // THE END OF THE MISSION IS AN EVENT. It used to be an absence: `active`
      // went false, the beat index stuck on the last entry, and nothing on the
      // bus or in debugInfo() distinguished "the player finished the slice"
      // from "the director was switched off". Nothing could assert completion,
      // which is why nobody could say whether the game was completable.
      if (!this._mandatorySatisfied()) return this._failMission('mandatory objective incomplete');
      this.active = false;
      this.complete = true;
      this.failed = false;
      this.failureReason = null;
      this.beat = SPINE.length - 1;
      this.encounter = null;
      this.phase = 'complete';
      this._emitObjective('MISSION COMPLETE', 'Thessaly Basin — secure');
      this.ctx.bus.emit('mission:complete', {
        at: this.ctx.time.elapsed, deaths: this.deaths,
        spawned: this.spawned, killed: this.killed,
      });
      return;
    }
    const b = SPINE[i];
    const sameBeat = (this.beat === i);
    const elapsed = retry && sameBeat && !restartClock ? this.beatT : 0;
    this.beat = i; this.beatT = elapsed;
    this.beatFlags = Object.create(null);
    this.encounter = null;
    if (!sameBeat) this.beatFailures = 0;

    // ATTEMPT COUNTING, and the two bugs it fixes. Measured on this build with a
    // passive player: 240 s of sim never got past beat 4, `wave` reached 14 and
    // `deaths` reached 12.
    //
    //  (1) DEATH SPIRAL. `wave++` on every entry meant every death made the
    //      retry 18% bigger (_buildWave's ramp). Twelve deaths => 3.3x the
    //      bodies on the attempt you were already failing. Difficulty must ramp
    //      with PROGRESS, never with failure, so the wave index now only
    //      advances on a genuinely new beat.
    //  (2) SOFT LOCK. respawn() used to reset beatT to 0, so repeated deaths
    //      could postpone the objective deadline forever. A death retry now
    //      preserves beatT; only an explicit objective retry restarts its clock.
    this.attempt = (retry || sameBeat) ? (this.attempt || 0) + 1 : 0;

    // checkpoint on every beat entry — the player never replays more than one
    if (!retry) this.setCheckpoint();

    if (b.area && this.p.autoArea) this.ctx.sys.grade?.setArea?.(b.area, 1400);
    this._wpTarget = b.waypoint || null;
    this._emitObjective(b.objective ?? '', b.sub ?? '', b.waypoint ? this.waypoints[b.waypoint] : null);

    if (b.encounter) {
      if (!retry) this.wave++;
      this.encounter = this._buildWave(b.encounter, Math.max(1, this.wave), this.attempt);
      this.phase = 'contact';
    } else {
      this.phase = b.quiet ? 'quiet' : 'move';
    }
    if (b.cue) this._cue(b.cue, this._bearingPoint(wrapPi(this._travelBearing() + 2.3), 26), 0.9);

    // §7 0:12 — "the tell": one spawn, 0.4 s of silhouette, then gone. It costs
    // one cue and one spawn/despawn and it does more for tension than a scripted
    // event. This used to be dead code: it is gated on a retraction existing and
    // enemies.js ships no per-handle despawn, so the beat never fired once in a
    // measured 240 s run. _enterBeat now always has one (see _enemyAdapter).
    if (b.phantom && this.enemies.ok && this.enemies.despawn) {
      const pt = this.spawnPoint({
        kind: 'skitter', bearing: wrapPi(this._travelBearing() + 2.3), band: [24, 30],
      });
      if (pt) {
        const rec = this._spawn('skitter', { point: pt });
        if (rec && rec.handle != null) this.beatFlags.phantom = { rec, until: 0.4 };
      }
    }

    this.ctx.bus.emit('director:beat', {
      id: b.id, index: i, objective: b.objective || '',
      area: b.area || null, waypoint: b.waypoint || null,
    });
  }

  _beatComplete(b) {
    if (b.until === 'fired') return !!this.beatFlags.fired;
    if (b.until === 'clear') {
      if (this.encounter) {
        return this.encounter.i >= this.encounter.orders.length && this.live.length === 0;
      }
      return this.live.length === 0 && this.beatT > 1;
    }
    if (b.waypoint) {
      const w = this.waypoints[b.waypoint];
      const pl = this.player;
      return !!(w && pl && Math.hypot(pl.pos.x - w.x, pl.pos.z - w.z) < w.r);
    }
    return this.beatT >= (b.hold ?? 8);
  }

  _updateSpine(dt) {
    const b = SPINE[this.beat];
    if (!b) return;
    this.beatT += dt;

    // the tell: retract the silhouette after its 0.4 s
    const ph = this.beatFlags.phantom;
    if (ph && this.beatT > ph.until) {
      const idx = this.live.indexOf(ph.rec);
      if (idx >= 0) this.live.splice(idx, 1);
      if (ph.rec.handle != null && this.enemies.despawn) this.enemies.despawn(ph.rec.handle);
      this.beatFlags.phantom = null;
    }

    // republish the objective distance so the HUD can draw a real waypoint
    if ((this.ctx.time.frame % 12) === 0) {
      const pl = this.player;
      if (b.waypoint) {
        const w = this.waypoints[b.waypoint];
        if (w && pl) {
          this.ctx.bus.emit('objective', {
            id: 'primary',
            text: b.objective || '', sub: b.sub || '',
            waypoint: { x: w.x, y: w.y, z: w.z, dist: Math.hypot(pl.pos.x - w.x, pl.pos.z - w.z) },
          });
        }
      } else if (b.until === 'clear' && pl && this.live.length) {
        // A rooted or cover-bound last enemy can leave the objective technically
        // active but visually absent. Point the player at the nearest surviving
        // body so clearing the beat is navigation, not hide-and-seek against a
        // hard deadline.
        let best = null, bestD = Infinity;
        for (let i = 0; i < this.live.length; i++) {
          const L = this.live[i];
          const p = this.enemies.posOf ? this.enemies.posOf(L.handle) : L.pos;
          if (!p) continue;
          const d = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z);
          if (d < bestD) { bestD = d; best = p; }
        }
        if (best) {
          this.ctx.bus.emit('objective', {
            id: 'primary', text: b.objective || '', sub: b.sub || '',
            waypoint: { x: best.x, y: best.y || 0, z: best.z, dist: bestD },
          });
        }
      }
    }

    // --- advance, retry, or fail --------------------------------------------
    // Encounter mercy shortens repeated attempts. Navigation keeps its authored
    // window: reaching a landmark does not get easier because time elapsed.
    const mercy = b.encounter ? (1 - clamp((this.attempt || 0) * 0.15, 0, 0.6)) : 1;
    const hold = (b.hold ?? 30) * mercy;
    const done = this._beatComplete(b);
    if (done) {
      // Only the objective's own condition advances the spine.
      this._recordExit(b, 'condition', { hold: +hold.toFixed(2) });
      this._enterBeat(this.beat + 1);
      return;
    }
    if (this.beatT < hold) return;

    const mandatory = !!(b.until || b.waypoint);
    if (!mandatory) {
      // Defensive only: ordinary hold beats complete through _beatComplete().
      this._recordExit(b, 'condition', { hold: +hold.toFixed(2), fallback: true });
      this._enterBeat(this.beat + 1);
      return;
    }

    this.beatFailures++;
    const canRetry = this.beatFailures <= Math.max(0, this.p.objectiveRetries | 0);
    this._recordExit(b, canRetry ? 'retry' : 'failure', {
      cause: 'timeout', hold: +hold.toFixed(2), failure: this.beatFailures,
    });
    this.ctx.bus.emit('mission:retry', {
      beat: b.id, cause: 'timeout', retry: canRetry,
      failure: this.beatFailures, maxRetries: Math.max(0, this.p.objectiveRetries | 0),
    });
    // A failed encounter cannot leak bodies into its retry or into a failure
    // screen. More importantly, it is never swept and then counted as success.
    this._despawnAll();
    if (canRetry) this._enterBeat(this.beat, true, true);
    else this._failMission('objective timeout', b);
  }

  /**
   * Retire creatures further than `minDist` from the player. Used when a beat
   * concedes, and by the silence beats, so the field can actually empty.
   * Returns how many were retired.
   */
  _sweep(minDist = 34) {
    const pl = this.player;
    if (!pl) return 0;
    let n = 0;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const L = this.live[i];
      const p = (this.enemies.posOf && L.handle != null && this.enemies.posOf(L.handle)) || L.pos;
      if (Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z) < minDist) continue;
      if (L.handle != null && this.enemies.despawn) this.enemies.despawn(L.handle);
      this.live.splice(i, 1);
      n++;
    }
    if (n) this._tensionOut = -1;              // force a music update
    return n;
  }

  // ===========================================================================
  // PLAYER LIFE
  // ===========================================================================
  setCheckpoint(pos, yaw) {
    const pl = this.player;
    const p = pos || (pl ? pl.pos : null);
    if (!p) return this;
    this.checkpoint = {
      id: SPINE[this.beat]?.id || 'start',
      beat: this.beat < 0 ? 0 : this.beat,
      x: p.x, y: p.y, z: p.z,
      yaw: yaw !== undefined ? yaw : (pl ? pl.yaw : 0),
    };
    this.ctx.bus.emit('checkpoint', { ...this.checkpoint });
    return this;
  }

  /**
   * The damage entry point enemies.js can call without knowing who owns health.
   * Forwards to combat.js when it exists; otherwise runs the internal model.
   */
  damagePlayer(amount, o = {}) {
    if (!(amount > 0) || this.dead || !this.p.enabled) return this.hp;
    const owner = this._healthOwner;
    if (owner && owner.damagePlayer !== this.damagePlayer) {
      owner.damagePlayer(amount, o.x, o.y, o.z);
      this.hp = owner.health;
      this._lastHurtT = this.ctx.time.elapsed;
      return this.hp;
    }
    this.hp = Math.max(0, this.hp - amount);
    this._lastHurtT = this.ctx.time.elapsed;
    this.ctx.bus.emit('player:health', {
      hp: this.hp, max: this.maxHp, frac: this.hp / this.maxHp, delta: -amount,
      from: o.from ?? null, dir: o.dir ?? null,
    });
    if (this.hp <= 0) this._die(o.cause || o.from || 'unknown');
    return this.hp;
  }

  _die(cause) {
    this.dead = true; this.deadT = 0; this.deaths++;
    this.ctx.bus.emit('player:death', { cause, at: this.ctx.time.elapsed, deaths: this.deaths });
    this._setTension(0.15, true);
  }

  respawn() {
    const cp = this.checkpoint;
    this.dead = false; this.deadT = 0;
    this.hp = this.maxHp;
    this._lastHurtT = this.ctx.time.elapsed;
    const owner = this._healthOwner;
    if (owner) {
      owner.health = owner.maxHealth ?? this.maxHp;
      owner.lastHitT = -99;
      owner.regenerating = false;
      if (owner.dirs) owner.dirs.length = 0;
    }
    this._despawnAll();
    this.player?.teleport?.([cp.x, cp.y, cp.z], cp.yaw, 0);
    this.ctx.bus.emit('player:respawn', { x: cp.x, y: cp.y, z: cp.z, yaw: cp.yaw });
    this.ctx.bus.emit('player:health', { hp: this.hp, max: this.maxHp, frac: 1, delta: this.maxHp });
    // `retry: true` is what stops a death from ramping the wave and from
    // rewinding the beat clock forever. See _enterBeat.
    if (this.active && cp.beat != null && cp.beat >= 0) this._enterBeat(cp.beat, true);
    return this;
  }

  _updateLife(dt) {
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT >= this.p.respawnDelay) this.respawn();
      return;
    }
    const owner = this._healthOwner;
    if (owner) {
      // mirror only; combat.js runs its own regen at its own rate (§4)
      this.hp = owner.health;
      this.maxHp = owner.maxHealth ?? this.maxHp;
      if (this.hp <= 0) this._die('combat');
      return;
    }
    if (this.hp < this.maxHp && this.ctx.time.elapsed - this._lastHurtT > this.p.regenDelay) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + this.p.regenRate * dt);
      if ((this.ctx.time.frame % 6) === 0 && this.hp !== before) {
        this.ctx.bus.emit('player:health', {
          hp: this.hp, max: this.maxHp, frac: this.hp / this.maxHp, delta: this.hp - before,
        });
      }
    }
  }

  // ===========================================================================
  // TENSION — one scalar, published everywhere, so the music, the grade and the
  // HUD cannot disagree about how dangerous this moment is.
  // ===========================================================================
  _updateTension(dt) {
    let prox = 0;
    const pl = this.player;
    for (let i = 0; i < this.live.length; i++) {
      const L = this.live[i];
      if (this.enemies.posOf && L.handle != null) {
        const p = this.enemies.posOf(L.handle);
        if (p) L.pos.set(p.x, p.y, p.z);
      }
      if (pl) prox = Math.max(prox, smoothstep(46, 9, Math.hypot(L.pos.x - pl.pos.x, L.pos.z - pl.pos.z)));
    }
    const hurt = smoothstep(6, 0, this.ctx.time.elapsed - this._lastHurtT) * 0.35;
    const bodies = sat(this.live.length * 0.14);
    const phaseBias = this.encounter
      ? (this.encounter.phase === 'anchor' ? 0.22 : this.encounter.phase === 'squeeze' ? 0.12 : 0)
      : -0.25;
    const target = sat(bodies + prox * 0.5 + hurt + phaseBias);
    this.tension = damp(this.tension, target, 2.6, dt);
    this._setTension(this.tension, false);
  }

  _setTension(v, force) {
    const out = sat(v * this.p.tensionGain);
    if (!force && Math.abs(out - this._tensionOut) < 0.025) return;
    this._tensionOut = out;
    const payload = {
      intensity: out, value: out,
      phase: this.encounter ? this.encounter.phase : this.phase,
      wave: this.wave, live: this.live.length,
    };
    this.ctx.bus.emit('music', payload);
    this.ctx.bus.emit('audio:tension', payload);
  }

  _cue(name, pt, gain = 1) {
    const e = { name, gain, t: this.ctx.time.elapsed };
    if (pt) { e.x = pt.x; e.y = pt.y; e.z = pt.z; e.bearing = pt.bearing ?? 0; }
    this.ctx.bus.emit('audio:cue', e);
  }

  _emitObjective(text, sub, waypoint = null) {
    const id = 'primary';
    if (!waypoint) this.ctx.bus.emit('objective:clear', id);
    if (!text && !sub && !waypoint) return;
    const payload = { id, text, sub };
    if (waypoint) {
      const pl = this.player;
      payload.waypoint = {
        x: waypoint.x, y: waypoint.y, z: waypoint.z,
        dist: pl ? Math.hypot(pl.pos.x - waypoint.x, pl.pos.z - waypoint.z) : -1,
      };
    }
    this.ctx.bus.emit('objective', payload);
  }

  _bearingPoint(bearing, dist) {
    const pl = this.player;
    if (!pl) return null;
    const x = pl.pos.x + Math.sin(bearing) * dist, z = pl.pos.z + Math.cos(bearing) * dist;
    return { x, y: (this.terrain?.heightAt(x, z) ?? 0) + 1, z, bearing };
  }

  // ===========================================================================
  // STAGING — deterministic setup for a review shot. NOT gameplay: it bypasses
  // the view-cone and minimum-distance laws on purpose, because the entire point
  // of the 'combat' vista is that the creatures are in the frame.
  // ===========================================================================
  /**
   * @param {'showcase'|'contact'|'squeeze'|'anchor'|'finale'|'clear'} name
   * @returns {{name, placed:Array, blocked:string|null}}
   */
  stageEncounter(name = 'showcase') {
    const pl = this.player;
    this.active = false;          // a staged shot is not a running mission
    this.encounter = null;
    this._blocked = null;
    this._despawnAll();
    if (name === 'clear') { this.staged = null; return { name, placed: [], blocked: null }; }

    // Re-fork so a stage is reproducible no matter what ran before it. Every
    // capture of the same vista must place the same creatures in the same spots
    // or the visual regression harness is comparing two different scenes.
    this.rngPlace = this.ctx.rng.fork('director:place:' + name);
    this.rngDress = this.ctx.rng.fork('director:dress:' + name);

    // camera-relative bearings, so this works from any vista pose
    const face = pl ? wrapPi(pl.yaw + Math.PI) : 0;
    const B = (deg) => wrapPi(face + deg * DEG);

    // An authored firefight read, back to front:
    //   a Carapace anchoring the mid-left at ~24 m (the frame's mass),
    //   three Skitters closing from the right and far left (the motion),
    //   a Bloomspitter rooted at ~33 m dead ahead (the depth cue, and the reason
    //   the player is aiming down sights in this shot at all).
    // Distances are composition, not gameplay: a 1.10 m Skitter at 22 m is 90 px
    // tall in a 1080p frame at a 65 deg vertical FOV and reads as a speck. The
    // near creature has to end up inside ~9 m to carry the foreground, the
    // Carapace sits mid at ~12 m to be the frame's mass, and the Bloomspitters
    // stay past 26 m so the shot has three depth planes instead of one.
    //
    // THESE ARE SPAWN DISTANCES, NOT FRAMED DISTANCES. An alerted creature is
    // charging, and 42 fixed steps run between this call and the shutter
    // (8 settled here + gotoVista's 30 + 4 more after the temporal reset), so a
    // Skitter closes ~3.4 m and a Carapace ~2 m before the frame is taken. The
    // first version of this ignored that and put a windup-lit Skitter 5 m from
    // the lens, blown to pure white across a sixth of the frame.
    // FRAMED SIZE IS THE WHOLE PROBLEM, AND IT WAS MEASURED WRONG FOR THREE
    // REVISIONS. The distances below used to be picked so the creatures were
    // "safely in the midground" — 12 to 34 m. I projected them into the actual
    // 1920x1080 frame and the six showcase creatures came back 33, 35, 31, 82,
    // 49 and 66 pixels tall. A 33 px creature is 3% of frame height: it is a
    // speck, and against ash at 20 m in haze it is an invisible speck. That is
    // why this shot kept reading as an empty landscape even once every creature
    // provably had line of sight.
    //
    // The arithmetic, so the next agent does not have to rediscover it. Vertical
    // FOV 65 deg over 1080 px => ~16.6 px per degree. A creature of height h at
    // distance d subtends 2*atan(h/2d) degrees. For a 1.10 m Skitter:
    //     d = 20 m ->  35 px      d = 10 m ->  70 px
    //     d =  6 m -> 117 px      d =  4 m -> 175 px
    // For a 1.70 m Carapace (and it is much wider than it is tall, so it reads
    // bigger than the number):
    //     d = 16 m ->  99 px      d = 10 m -> 158 px      d = 7 m -> 225 px
    //
    // ~120 px is the floor for "that is a creature" rather than "that is a mark
    // on the ground". So the near creature goes to 4-6 m, the Carapace holds the
    // middle at 7-10 m where its mass reads, and only the Bloomspitters — which
    // are emissive, taller, and whose whole job is the depth cue — stay past
    // 18 m. Wide-and-far reads as an empty landscape; near-and-stacked reads as
    // a fight.
    //
    // THESE ARE SPAWN DISTANCES, NOT FRAMED DISTANCES. 34 fixed steps run between
    // this call and the shutter (gotoVista's 30 + 4 in resetTemporal), so an
    // approaching Skitter closes ~4.5 m and a Carapace ~3 m. Measured, not
    // assumed: plan 12.8 m came out at 8.27 m. Every band below is set so the
    // creature arrives where the composition wants it, and the near band stops
    // short of the ~2 m where a creature becomes an out-of-focus limb across the
    // lens (which is exactly what a windup Skitter did at 3.19 m).
    const PLAN = {
      showcase: [
        // foreground: lands ~5 m, ~140 px, the creature you are about to be bitten by
        { kind: 'skitter', bearing: B(-15), band: [9.0, 10.0] },
        // the frame's mass: lands ~8 m, ~200 px of Carapace shoulder
        { kind: 'carapace', bearing: B(13), band: [11.0, 12.5] },
        // midground pair, ~10-14 m, ~55-80 px — reads as bodies, not subjects
        { kind: 'skitter', bearing: B(24), band: [15.0, 16.5] },
        { kind: 'skitter', bearing: B(-27), band: [18.0, 20.0] },
        // depth plane: rooted, emissive, sac charging. Stays where it is put.
        { kind: 'bloomspitter', bearing: B(-6), band: [21, 24] },
        { kind: 'bloomspitter', bearing: B(19), band: [27, 31] },
      ],
      contact: [
        { kind: 'skitter', bearing: B(-12), band: [8.5, 9.5] },
        { kind: 'skitter', bearing: B(9), band: [13.0, 14.5] },
        { kind: 'skitter', bearing: B(22), band: [17.5, 19.5] },
      ],
      squeeze: [
        { kind: 'bloomspitter', bearing: B(-5), band: [20, 24] },
        { kind: 'skitter', bearing: B(21), band: [9.0, 10.5] },
        { kind: 'skitter', bearing: B(-25), band: [14.0, 16.0] },
      ],
      anchor: [
        // the Carapace IS the shot: 1.7 m of plate at ~7 m is ~225 px
        { kind: 'carapace', bearing: B(-7), band: [10.0, 11.5] },
        { kind: 'skitter', bearing: B(25), band: [12.0, 13.5] },
        { kind: 'bloomspitter', bearing: B(-20), band: [22, 26] },
      ],
      finale: [
        { kind: 'carapace', bearing: B(-14), band: [10.0, 11.5] },
        { kind: 'carapace', bearing: B(20), band: [16.0, 18.0] },
        { kind: 'skitter', bearing: B(-30), band: [8.5, 9.5] },
        { kind: 'skitter', bearing: B(30), band: [13.0, 14.5] },
        { kind: 'bloomspitter', bearing: B(2), band: [24, 28] },
      ],
    };
    const plan = PLAN[name] || PLAN.showcase;

    const placed = [];
    for (const o of plan) {
      // spread is wider than it looks like it should be (0.14 rad is 8 deg and
      // the LOS requirement added above needs somewhere to go). Two passes: take
      // the tight composition if it has a sightline, widen if it does not.
      const pt = this.spawnPoint({ ...o, staged: true, spread: 0.20, tries: 40 });
      if (!pt) continue;
      const rec = this._spawn(o.kind, { point: pt, staged: true });
      if (rec && !rec.deferred) {
        // STANCE — the difference between a firefight and a petting zoo. A spawn
        // is ALERT, which is a standing animal; the state machine needs 0.35 s of
        // sim to start walking and a review shot does not always get it.
        //
        // ONLY THE ROOTED CREATURE GETS A WINDUP. A Bloomspitter's windup is its
        // sac charging at 3x emissive — it is the best thing in the shot and it
        // cannot move, so it is still there when the shutter opens. A Skitter's
        // windup is a POUNCE, and gotoVista runs 30 sim steps after this returns:
        // measured, the near Skitter completed its windup and leapt from 12.9 m
        // to 3.19 m, ending up as an out-of-focus limb across the left third of
        // the frame. Everything mobile therefore charges instead, which closes a
        // survivable ~2 m over the same 30 steps.
        const stance = o.kind === 'bloomspitter' ? 'windup' : 'approach';
        this.enemies.pose?.(rec.handle, stance);
        placed.push({
          kind: o.kind, x: +pt.x.toFixed(2), y: +pt.y.toFixed(2), z: +pt.z.toFixed(2),
          dist: +pt.dist.toFixed(1), los: pt.los, real: rec.real, stance,
        });
      }
    }

    // Focus the lens on the fight. dof.js has no autofocus by design
    // (RENDER_PLAN §8.4) and explicitly asks the director to drive setFocus for
    // anything staged — without this the 'combat' shot is focused on a 26 m
    // landscape plane while the action is at 18 m.
    // Step the creature rigs off their bind pose. A spawn is a T-pose until
    // something updates it, and gotoVista's 30 sim steps happen AFTER this
    // returns — but resetAllTemporal() then runs, and anything that resets
    // temporal state would photograph the first frame after it. Settling here
    // and again in resetTemporal() is what puts them mid-stride in the picture.
    this.enemies.settle?.(8);

    // FOCUS ON THE SUBJECT, NOT ON THE AVERAGE. The mean of six distances put the
    // lens at 20 m in a composition whose two readable creatures were at 5 and
    // 8 m, so the things the shot exists to show were the softest objects in it.
    // The subject is the second-nearest creature — the near one is the framing
    // element, the one behind it is the mass — pulled in for the ~4 m it closes
    // before the shutter. f/5.6 rather than f/4 because the fight is spread over
    // 5-25 m and a shallower field throws the depth plane away.
    const ds = placed.map(p => p.dist).sort((a, b) => a - b);
    const subject = ds.length > 1 ? ds[1] : (ds.length ? ds[0] : 22);
    const focus = clamp(subject * 0.78, 3.5, 60);
    this.ctx.sys.dof?.setFocus?.(focus, 5.6, 0);

    this.phase = 'staged';
    this.wave = Math.max(1, this.wave);
    this._setTension(0.92, true);
    // `pose` is how resetTemporal knows the staging is still current: gotoVista
    // teleports before it calls setup, so the moment the review set moves to any
    // other vista the pose no longer matches and the staging expires. Without
    // this, dressing a combat shot would put muzzle dust in the next landscape.
    this.staged = {
      name, placed, focus,
      pose: pl ? { x: pl.pos.x, z: pl.pos.z, yaw: pl.yaw } : null,
    };
    this._dress(name, placed);

    if (!this.enemies.ok) {
      this._blocked = 'ctx.sys.enemies.spawn does not exist: ' + placed.length +
        ' creatures were placed and published on the bus, but nothing rendered them.';
      console.warn('[director] ' + this._blocked);
    }
    return { name, placed, blocked: this._blocked, focus };
  }

  /**
   * Environmental evidence of a firefight: kicked dust and scorch where rounds
   * have been landing, spall off the creatures, and a heat source at the nearest
   * contact. vfx.js publishes exactly this API for director.js to call.
   *
   * WHY IT IS REPLAYED IN resetTemporal(): __CB.gotoVista() runs
   * setup -> 30 sim steps -> resetAllTemporal(), and vfx.resetTemporal() clears
   * every particle and decal in the process. Anything dressed during setup is
   * therefore wiped a few lines before the screenshot. Director sorts after vfx
   * in the topological order, so re-dressing inside our own resetTemporal() is
   * the one hook that lands after the clear.
   */
  _dress(name, placed) {
    if (!this.p.dressFx || !this.vfx || !this.player) return;
    // re-forked per call, so dressing the same vista twice in one session gives
    // the same frame both times
    const rng = this.ctx.rng.fork('director:dress:' + name);
    const pl = this.player, T = this.terrain;
    const face = wrapPi(pl.yaw + Math.PI);

    // impacts along the line the player is shooting down: dust and scorch at
    // 8-26 m, tight to the aim
    for (let i = 0; i < 9; i++) {
      const a = face + rng.gauss(0, 0.16);
      const d = lerp(8, 26, rng.next());
      const x = pl.pos.x + Math.sin(a) * d, z = pl.pos.z + Math.cos(a) * d;
      const y = (T?.heightAt(x, z) ?? 0) + 0.02;
      this.vfx.impact?.({
        pos: [x, y, z], normal: [0, 1, 0], surface: rng.bool(0.7) ? 'ash' : 'rock',
        power: rng.range(0.8, 1.6),
      });
    }
    // and where the creatures are standing: something is being hit back
    for (const p of placed) {
      const y = (T?.heightAt(p.x, p.z) ?? 0) + 0.4;
      this.vfx.impact?.({
        pos: [p.x, y, p.z], normal: [0, 1, 0], surface: 'flesh',
        power: p.kind === 'carapace' ? 1.8 : 1.1, decal: false,
      });
    }
    // muzzle-side dust: the shooter's own position kicks up on full auto
    this.vfx.burst?.([pl.pos.x, pl.pos.y - 1.4, pl.pos.z], { surface: 'ash', power: 0.7 });
    // heat over the nearest contact for the shimmer pass
    const near = placed[0];
    if (near) this.vfx.setHeatSource?.(0, [near.x, near.y + 1, near.z], 4.5, 0.7);
  }

  /**
   * main.js __CB.resetAllTemporal() reaches every system. For us it is the only
   * hook that runs AFTER vfx has cleared its particles, so a staged shot can put
   * its dressing back. It also ages the particle system by hand: gotoVista takes
   * its screenshot with `seconds: 0`, so no sim step will ever run again and a
   * freshly emitted particle would be a zero-age dot at the emitter.
   */
  resetTemporal() {
    if (!this.staged || !this.p.dressFx) return;
    const pose = this.staged.pose, pl = this.player;
    if (pose && pl && (Math.hypot(pl.pos.x - pose.x, pl.pos.z - pose.z) > 0.75
      || Math.abs(wrapPi(pl.yaw - pose.yaw)) > 0.05)) {
      this.staged = null;              // the review set moved on; staging expired
      this._despawnAll(true);
      return;
    }
    const v = this.ctx.sys.vfx;
    this._dress(this.staged.name, this.staged.placed);
    // Re-assert the stance, not just awareness: the 30 sim steps gotoVista runs
    // between staging and here will have carried a windup through to ATTACK and
    // out the far side into RECOVER, which is a creature standing down. Restoring
    // it puts the rear back in the frame at shutter time.
    for (let i = 0; i < this.live.length; i++) {
      const L = this.live[i];
      if (!L.handle) continue;
      const st = this.staged.placed[i];
      if (st && st.stance && this.enemies.pose) this.enemies.pose(L.handle, st.stance);
      else this.enemies.alert(L.handle);
    }
    this.enemies.settle?.(4);
    if (v && typeof v.update === 'function') {
      // 0.55 s of ageing: long enough for dust to bloom and drift, short enough
      // that the sparks have not gone out. Deterministic — fixed step count.
      for (let i = 0; i < 33; i++) v.update(1 / 60);
      v.lateUpdate?.(1 / 60);
    }
  }

  // ===========================================================================
  // frame
  // ===========================================================================
  update(dt) {
    if (!this.p.enabled) return;
    if ((this.ctx.time.frame % 30) === 0) this._reconcile();

    // INTEGRATOR: life runs whenever the director is ENABLED, not only while a
    // mission is active. It used to be inside the `active` branch, so a player
    // killed outside a running mission — a staged encounter, a sandbox drop,
    // anything the harness drives — went to hp 0, `dead` latched true, and
    // nothing ever cleared it: no respawn, no input, no way out. Death has to
    // resolve in every mode the game can be in. The SPINE still only advances
    // while a mission is running.
    this._updateLife(dt);
    if (this.active && !this.dead) {
      this._updateSpine(dt);
      this._updateEncounter(dt);
    }
    if (this.active || this.live.length) this._updateTension(dt);

    if ((this.ctx.time.frame % 15) === 0 && (this.active || this.staged)) {
      this.ctx.bus.emit('director:phase', {
        phase: this.phase, wave: this.wave, live: this.live.length,
        tension: +this.tension.toFixed(3),
        encounter: this.encounter ? this.encounter.name : (this.staged ? this.staged.name : null),
        beat: SPINE[this.beat]?.id || null,
      });
    }
  }

  // ===========================================================================
  // introspection — the harness and the critic see the game through this
  // ===========================================================================
  debugInfo() {
    return {
      active: this.active,
      complete: this.complete,
      failed: this.failed,
      failureReason: this.failureReason,
      exits: this.exits,
      beat: SPINE[this.beat]?.id || null,
      beatIndex: this.beat,
      beatT: +this.beatT.toFixed(2),
      objective: SPINE[this.beat]?.objective || '',
      phase: this.phase,
      wave: this.wave,
      attempt: this.attempt || 0,
      beatFailures: this.beatFailures || 0,
      tension: +this.tension.toFixed(3),
      live: this.live.length,
      liveKinds: this.live.map(l => l.kind),
      spawned: this.spawned,
      killed: this.killed,
      hp: Math.round(this.hp),
      dead: this.dead,
      deaths: this.deaths,
      checkpoint: this.checkpoint.id,
      waypoint: this._wpTarget,
      waypoints: this.waypoints,
      staged: this.staged ? this.staged.name : null,
      stagedPlan: this.staged ? this.staged.placed : null,
      enemiesReady: this.enemies ? this.enemies.ok : false,
      blocked: this._blocked,
      queue: this.encounter
        ? { t: +this.encounter.t.toFixed(2), fired: this.encounter.i, of: this.encounter.orders.length }
        : null,
      spine: SPINE.map(b => b.id),
    };
  }

  dispose() {
    this._despawnAll();
    this.active = false;
  }
}

export default Director;
