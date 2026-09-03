// CURFEW — the enemy manager. Pooled, allocation-free, data-driven off
// species.js, and it is the lane the game will be judged by.
//
// THE GRAMMAR, and where each clause of it came from:
//
//   perception every 6 frames, staggered by id      vigil enemies.js:585-601
//   8 ring slots so a pack SURROUNDS               vigil enemies.js:287-300
//   MAX 2 attack tokens + a recovery breath        vigil enemies.js:15, 240-243
//   the telegraph law: >= 320 ms, 2x emissive on a shootable part, audio on
//     frame 1, and an attack that would land late is CANCELLED, never
//     chase-struck                                  vigil enemies.js:381-406
//   move OR attack, never both, for the crowd      vigil enemies.js:321-329
//   stagger, budgeted flinch, hit reactions        vigil enemies.js:117-162
//   a 2.6 s death-glow decay so dead reads against alive across a field
//                                                   vigil enemies.js:556-560
//   the grave rise, squash 0.34 -> 1               fetch enemies.js:1983-2002
//   the weeping-angel rule                          still floors.js:381-400
//   move-only-unobserved, attention not timers      marrow entity.js:355-405
//   best-distance-so-far stuck watchdog             marrow navgrid.js:124-149
//                                                   (ported into nav.js)
//
// LAWS THIS FILE IS BOUND BY, all of them from CONTRACT.md:
//   * it never creates, adds, removes or hides a LIGHT. Eye glow is emissive
//     material, not a PointLight. Anything that genuinely needs a light borrows
//     one from the rover pool with a ttl and releases it.
//   * the hot path allocates nothing. Every vector is preallocated.
//   * no Math.random: ctx.rng.fork('enemies').
//   * no setTimeout: every beat is dt-scoped so tests can step it.
//   * anything that moves visibly keeps prev/curr and implements present(alpha).
//   * siblings are read LAZILY inside step, never captured at construction —
//     VIGIL's combat.js captured ctx.systems.enemies before enemies existed.
//   * every emit rewrites EVERY field of the shared record. See evtReset().
//   * no file in this lane states a shader-program count. That number lives in
//     CFG.render.budget.programsMax and nowhere else (integrator decision 1).
//
// WHAT THIS LANE HEARS, and what it does not (integrator decision 2, 2026-09-02).
// player/controller.js owns the footfall and landing `noise` emits now; they
// used to live in src/audio/bed.js behind an audio guard that is false in every
// headless run, so crouching bought the player nothing whenever the speakers
// were off. This file subscribes to `noise` and to `weapon:fire` and to nothing
// else about the player's feet — hearing 'player:land' as well was hearing one
// landing twice, at a hard-coded radius that ignored the fall.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp, clamp01, damp, dampAngle, TAU } from '../engine/math.js';
import {
  SPECIES, ROSTER, POOL, OWNER, PHASE, PRESSURE_ROSTER, DREAD_ROSTER, validate,
} from './species.js';
import { buildBody, makeImpostor, makeBasic, whiteTex, REVEAL } from './bodies.js';
import {
  NAV, steer, progress, resetProgress, relocate, observed, lit, visible,
  groundY, followGround, SepGrid, faceYaw, bearingDot, aimAngle,
} from './nav.js';

/* --------------------------------------------------------------------------
   Locals. CFG has no `enemies` block; each of these carries its reason and
   docs/HANDOFF.md carries the request for a permanent home.
   -------------------------------------------------------------------------- */
const PERCEPT_EVERY = 6;          // frames between perception ticks per body
const PERCEPT_DREAD = 4;          // 0.067 s: under the Standing Kind's 0.08 s retest
const MAX_ATTACKERS = CFG.director.maxAttackers;   // 2 — the token that makes a pack a rhythm
const RING_SLOTS = 8;

// How long a NON-dormant body takes to unfold from its 0.34 spawn squash. The dormant species
// climb out of the ground over their own riseTime; everything else is stepping out from behind
// something and should be whole by the time the eye finds it. Short enough that it is never the
// thing you are looking at, long enough that the first frame is still partial, which is the rule
// the squash exists to serve.
const QUICK_RISE_S = 0.22;

/**
 * The lowest point of a built rig, in its own local space, with every transform its parts
 * carry applied. Zero would mean the origin is exactly on the sole of the foot.
 */
function measureFootPlane(group) {
  let minY = Infinity;
  group.updateWorldMatrix(true, true);
  group.traverse((o) => {
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    if (!bb) return;
    const e = o.matrixWorld.elements;
    for (let i = 0; i < 8; i++) {
      const x = (i & 1) ? bb.max.x : bb.min.x;
      const y = (i & 2) ? bb.max.y : bb.min.y;
      const z = (i & 4) ? bb.max.z : bb.min.z;
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      if (wy < minY) minY = wy;
    }
  });
  return Number.isFinite(minY) ? minY : 0;
}

/* ==========================================================================
   THE FIRST PLAYTEST, 2026-09-02. Alex played CURFEW and the whole of his
   report about combat is legibility, not difficulty:

     "the spot i spawn and return to when i die kills me quite quickly and I am
      never sure why. I've seen some enemies that move very quickly and seem to
      run into me and then disappear... things are killing me quickly no matter
      where i run."

   `node tools/whatkilledme.mjs --play 75` reproduces it exactly — walk forward
   from the spawn, never shoot — and the numbers under his words are:

     * 11 of 13 hits came from BEHIND him. Camera-forward bearings of -1.00,
       -0.99, -0.96, -0.94, -0.79, -0.69. The telegraph law was satisfied every
       single time, off screen, where a tell is not a tell.
     * the attacker's distance was 0.0 m on three hits and 0.6-2.2 m on the
       rest. The hound was standing INSIDE the player capsule: it ran through
       him, came out behind, and bit from there. That is the whole of "run into
       me and then disappear" — nothing was under the terrain (zero samples in
       75 s) and nothing despawned within 12 m (zero).
     * hits landed 0.5 to 1.8 s apart and killed him in 4.6 to 9.5 s from first
       contact. That is a metronome, not a pack.

   The five constants below are the answer, and every one of them buys
   LEGIBILITY rather than mercy. The hound still does 22 and still kills in
   five bites: what changes is that he can see each of them coming, back away
   from the animal instead of standing in it, and get a breath between them.
   ========================================================================== */

/* A body is not allowed to be inside you. Separation is `def.radius +
   CFG.player.RADIUS + CONTACT_PAD`, resolved the way collision resolves
   everything else — push out along the contact normal and kill only the
   INWARD component of the velocity, so a hound that reaches you stops at
   contact range and strikes from there instead of walking through your chest.
   Every strike range in the roster clears this with room: hound contact 0.84 m
   against strikeRange 1.90, pallbearer 0.94 against a 0.96 m committed point,
   the Pale 0.66 against a 0.85 m grab. Nothing loses its reach. */
const CONTACT_PAD = 0.06;

/* THE FRONT-COMMIT LAW. A crowd body may only commit to a strike from inside
   the player's forward hemisphere. 0.30 is 72 degrees off the camera axis:
   just outside the 100-degree screen edge at fov 68 / 16:9, which is the
   nearest a tell can be and still be a thing you catch in the corner of your
   eye rather than a thing you are told about afterwards. Dogs in every game
   this one is modelled on circle before they come in, and that circle is why
   they are frightening instead of annoying — you watch it and you know. */
const FRONT_DOT = 0.30;

/* AND IT COMES ROUND BY STANDING SOMEWHERE ELSE, not by orbiting.

   The first attempt at this bolted a circling waypoint onto the approach, and
   the county produced ZERO hits in 120 s — which is not a fix, it is a
   different bug. The reason is arithmetic: a hound cruises at 7.5 m/s through
   a 600/350 burst gait, which is 4.7 m/s of travel, against a 4.35 m/s walk.
   There is no 20 m arc inside a 0.35 m/s margin. A body that spends its whole
   surplus on lateral travel falls behind, trips the stuck watchdog, and gets
   relocated to the far side of the county.

   So the arc is not a manoeuvre, it is WHERE THE RING IS. The eight ring slots
   are anchored to the player's FACING instead of to world space and spread
   across +-RING_ARC of it. A pack still surrounds — 132 degrees is both your
   flanks and everything between them — and it still drifts, but no slot parks
   a body in the one bearing where its telegraph cannot be received. Chasing a
   slot 3.2 m off your shoulder is chasing YOU, so it costs a body nothing it
   was not already spending.

   1.15 rad is 66 degrees, whose cosine is 0.41: every slot in the arc, even
   the outermost, clears FRONT_DOT with margin. Widen this past ~1.25 and the
   edge slots become bodies that can never legally attack from where they stand. */
const RING_ARC = 1.15;

/* A body CAN still strike from outside the cone — the Hunter off its leash in
   the black hour, the two dread species whose whole rule is that they move
   where you are not looking, and a pack member that has spent FRONT_PATIENCE
   seconds unable to reach your front because the trees will not let it. When
   that happens the windup is nearly doubled and it goes out on the bus as a
   `rear` telegraph so the audio lane can put a loud, positioned cue in the
   2.5-5.5 kHz band its earshot ticker already reserves for things behind you.
   An unseeable tell has to be an AUDIBLE one, and a longer one. */
const REAR_TELEGRAPH_MUL = 1.85;
const FRONT_PATIENCE = 5.0;

/* THE RECOVERY BREATH, in three parts, because "five bites 1.1 s apart" is one
   animal cycling as fast as its own state machine allows and two tokens
   interleaving underneath it.
     ATTACK_BREATH   — no two commits anywhere in the field inside this.
     FIELD_RECOVERY  — and once one LANDS, the whole pack waits. This is the
                       beat that makes it read as something working on you.
     BREAKOFF_S      — the body that connected disengages: it circles OUT to
                       BREAKOFF_MUL x standoff, refuses the token, and comes
                       back. A thing that never leaves is a hazard; a thing
                       that leaves and returns is an animal.
   Lowering `dmg` was the other option and it is the wrong one — it makes the
   hound feel weak, which is the opposite of what this game wants from it. */
const ATTACK_BREATH = 1.10;
const FIELD_RECOVERY = 1.90;
const BREAKOFF_S = 3.20;
const BREAKOFF_MUL = 1.75;
const RECOMMIT_MISS = 0.85;       // a whiff costs less than a landed bite
const RING_SPIN = 0.30;           // rad/s: 0.55x a circling body, so the ring drifts
const FLINCH_BUDGET = 0.180;      // seconds between body flinches, so a burst is not a seizure
const STAGGER_T = 0.620, STAGGER_IMMUNITY = 2.2, STAGGER_WINDOW = 0.40;
const STAGGER_FRACTION = 0.35;    // of max hp inside the window
const DEATH_GLOW_S = 2.6;         // the law: dead-vs-alive must read across a field
const CORPSE_S = 42;              // then it sinks, never pops
const CORPSE_SINK_S = 3.2;
const LOD_NEAR = 40;              // full rig inside this
const LOD_HYST = 0.10;            // DESIGN's hysteresis, as a fraction of LOD_NEAR
const GRAVITY = CFG.player.GRAVITY;
const BOLT_POOL = 14;
const CAP_ALIVE = 26;             // hard ceiling on pressure bodies; dread is outside it

/* Autonomous trickle. director/director.js does not exist yet. Rather than ship
   a roster nobody can meet, this system spawns for itself UNTIL a director
   appears in ctx.systems, and then yields completely. The laws it spawns under
   are the director's own (CFG.director.spawn), so the day director.js lands
   nothing about the feel changes — only who is asking. */
const TRICKLE_GAP = 1.15;         // seconds between self-spawn attempts
const TRICKLE_RING = 70;          // headcount is measured inside this radius (DESIGN §4)

/* THE DEAD-MAN'S HANDLE. A director exists, so this system yields to it — but a
   director that jams must not be able to empty the county for ever. The audit
   found exactly that: a director that stopped asking, and a county with nothing
   in it, in a horror game whose whole pressure is that something is out there.
   So: 25 s with no order of any kind AND zero live bodies means the sibling is
   not answering, and the trickle resumes until it does. Both halves are
   required — a quiet director over a full field is a director pacing a lull,
   which is its job, and stomping that would be worse than the jam. */
const DIRECTOR_JAM_S = 25;

/* module scratch — none of this is ever allocated inside step or present */
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _sc = new THREE.Vector3(1, 1, 1);
const _UP = new THREE.Vector3(0, 1, 0);
const _sep = { x: 0, z: 0 };
const _pt = { x: 0, z: 0 };
const _hit = { t: 0, enemy: null, zone: 'torso', point: new THREE.Vector3() };
const _noise = { x: 0, z: 0, radius: 0, source: '' };
const _evt = {
  e: null, x: 0, y: 0, z: 0, xp: 0, dmg: 0, zone: '', kind: '', species: '',
  // `owner` rides on every payload so a listener can tell a pressure kill from
  // a dread one WITHOUT reaching into `e.def`. tests/enemies.mjs:101 asserts
  // every kill carries xp > 0 and the Pale and the Standing Kind pay 0 by law;
  // this is the field that lets that assertion filter instead of fail.
  owner: '',
  // TRUE when this telegraph is firing OUTSIDE the player's forward hemisphere
  // — the Hunter off its leash, either dread body, or a pack member the trees
  // have boxed in. The audio lane's request in docs/HANDOFF.md is for a loud,
  // distinct, POSITIONED cue on exactly this flag: a visual tell behind the
  // player's head is not a tell, and eleven of the thirteen hits in the first
  // playtest were behind him.
  rear: false,
};

/**
 * Fill the shared event record FROM SCRATCH, and return it.
 *
 * ONE shared record serves five channels, which is what keeps an emit
 * allocation-free — and it is also how a payload ships a field the emitter
 * never meant to send. `_kill` used to publish `enemy:killed` without touching
 * `zone`, and it was correct only because the one caller that reaches it,
 * damage(), had set `zone` two lines earlier for the same shot. Any other
 * caller — the ram stagger path, a scripted despawn, a drowning — would have
 * shipped whatever the last hurt event happened to leave behind, and
 * progression/progress.js:_onKill multiplies XP by 2 when it reads
 * `zone === 'head'`. A car running something over would have paid a headshot
 * bonus. That is correct-by-luck, and luck is not a construction.
 *
 * So EVERY field is written on EVERY emit. Callers set only what they add on
 * top. Nothing here allocates: the record is module scope and this is a
 * sequence of assignments.
 */
function evtReset(e, kind) {
  _evt.e = e || null;
  _evt.species = e ? e.species : '';
  _evt.owner = e ? e.def.owner : '';
  _evt.kind = kind || '';
  _evt.x = e ? e.pos.x : 0;
  _evt.y = e ? e.pos.y : 0;
  _evt.z = e ? e.pos.z : 0;
  _evt.xp = 0;
  _evt.dmg = 0;
  _evt.zone = '';
  _evt.rear = e ? !!e.rearStrike : false;
  return _evt;
}
// nav.relocate only ever reads .def off the record it is handed, so the trickle
// asks with this instead of allocating a record per attempt inside step().
const _spawnScratch = { id: -1, def: null };
const _aliveOut = [];
const INCAR_BLOCKED = Object.freeze({ hound: true, pale: true });

export class Enemies {
  static id = 'enemies';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('enemies');
    this.placeRng = ctx.rng.fork('enemies:place');
    this.aimRng = ctx.rng.fork('enemies:aim');

    // A violated roster law is a BOOT failure, not a quiet wrongness later.
    const bad = validate();
    if (bad.length) throw new Error('enemies: roster is illegal:\n  ' + bad.join('\n  '));

    /** @type {Array} the pool. weapons.js iterates this for melee assist
        (weapon.js:551 `for (const e of enemies.all)`), so it stays an array. */
    this.all = [];

    this._frame = 0;
    this._t = 0;
    this._commit = 0;             // live attack tokens spent
    this._breathT = 99;
    // Seconds since ANY body's strike last landed on the player. The whole
    // field breathes after a hit connects — see FIELD_RECOVERY.
    this._landedT = 99;
    this._rearStrikes = 0;        // telemetry: strikes that fired outside the cone
    this._ringPhase = 0;
    this._slots = new Int32Array(RING_SLOTS).fill(-1);
    this._lastTrickle = 0;
    this._lastContact = 0;
    this._noiseX = 0; this._noiseZ = 0; this._noiseR = 0; this._noiseT = 99;
    this._squadLeapAt = -99;
    this._killed = 0; this._spawned = 0; this._refused = 0; this._cancelled = 0;
    this._built = false;
    this._lastAsk = 0;            // last time ANY sibling asked this lane for anything
    this._jam = false;            // a director exists and has gone silent over an empty county
    this._aliveNow = 0;           // recomputed once per step; never a per-body getter call
    // Pressure bodies that currently know about you, counted in the same single
    // pass as _aliveNow. It is the QUIET branch's whole condition — nodes.js's
    // nothingIsAware() asks this question on every trigger pull — and it is
    // published as awareCount so nobody has to walk the pool with a closure to
    // get it.
    this._awareNow = 0;
    this._warmed = false;
    this._warnedSpecies = null;   // lazily made: an unknown species id is warned about ONCE

    this.impostors = new Map();
    /** The same records as `impostors`, flat. present() runs every frame and
        `Map.prototype.values()` allocates a fresh iterator on every call —
        three of them per frame here, which is exactly why main.js flattened its
        own lists. The Map stays for the by-species lookup on line ~1640. */
    this.impostorList = [];
    this.bolts = null;
    this.boltState = [];
    this._boltCursor = 0;
    /** species -> metres to lift the drawn group so its feet sit on the ground. */
    this.footLift = new Map();
    this.sep = new SepGrid(96);
    this._unsub = [];
  }

  /* =====================================================================
     BOOT
     ===================================================================== */

  async init() {
    const ctx = this.ctx;
    const scene = ctx.scene;
    if (!scene) throw new Error('enemies.init: ctx.scene does not exist yet');

    let uid = 0;
    for (const key of ROSTER) {
      const def = SPECIES[key];
      const count = POOL[key];
      for (let i = 0; i < count; i++) {
        const built = buildBody(key, this.rng);
        scene.add(built.group);
        this.all.push(makeRecord(uid++, key, def, built, this.rng));
      }
      // THE FOOT PLANE. A rig is authored around its own origin and there is no rule that
      // says the lowest vertex lands exactly on it — the hound's is 0.13 m below, measured,
      // constant, on every frame and every instance. present() puts the ORIGIN on the ground,
      // so those thirteen centimetres are paws buried in the dirt.
      //
      // Measured once here rather than per frame: a bounding box per body per frame across
      // forty-six bodies is real cost, and the answer never changes. Anything that moves the
      // rig at runtime (the rise squash, stagger, the death fall) is applied on top of this
      // and is supposed to move it.
      this.footLift.set(key, -measureFootPlane(this.all[this.all.length - 1].built.group));
      // one instanced card per species: every body past the LOD line lives here,
      // so a field of forty is six draws.
      const imp = makeImpostor(key, count);
      imp.visible = false;
      scene.add(imp);
      const rec = { mesh: imp, n: 0 };
      this.impostors.set(key, rec);
      this.impostorList.push(rec);
    }

    // poacher bolts. REAL travelling projectiles: you dodge them by moving and
    // by breaking line, never by losing a hidden roll.
    const boltGeo = new THREE.SphereGeometry(0.075, 6, 5);
    const boltMat = makeBasic(whiteTex(), 0xffd2a0);
    boltMat.opacity = 0.95;
    this.bolts = new THREE.InstancedMesh(boltGeo, boltMat, BOLT_POOL);
    this.bolts.frustumCulled = false;
    this.bolts.count = BOLT_POOL;
    this.bolts.name = 'enemy-bolts';
    scene.add(this.bolts);
    for (let i = 0; i < BOLT_POOL; i++) {
      this.boltState.push({
        live: false, age: 0, dmg: 0,
        pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(),
      });
      _m4.makeScale(0, 0, 0);
      this.bolts.setMatrixAt(i, _m4);
    }
    this.bolts.instanceMatrix.needsUpdate = true;

    // The bus, read-only. Damage arrives through damage() and ONLY through
    // damage(): that is the contract combat.js already codes against
    // (combat.js:287-291, 414-416) and it is the authority.
    //
    // There was a fourth subscription here, on 'enemy:damage', with no emitter
    // anywhere in src/ and no entry in the CONTRACT's bus vocabulary. It is
    // deleted rather than documented: a channel nothing publishes is not a
    // public API, it is a second door onto damage() that the vocabulary does
    // not know about, and the next lane that finds it would code against a
    // spelling no test covers. If a lane genuinely needs to hurt a body without
    // importing this file, it asks for the channel in docs/HANDOFF.md and the
    // integrator puts it in CONTRACT.md first. The request is filed there.
    const bus = ctx.bus;

    this._unsub.push(bus.on('weapon:fire', (p) => {
      if (!p) return;
      // ONE blast, ONE noise. weapon.js emits this per PELLET (weapon.js:511 is
      // inside the pellet loop), so a shotgun was walking the whole roster
      // eight times for a single trigger pull and stamping the same alert eight
      // times over. Only pellet 0 is the shot.
      if (p.pellet) return;
      // A shot is a NOISE. This is the verb chain that makes crouch exist.
      //
      // `p.loud` is taken AS PUBLISHED and is not discounted here. Cold Barrel
      // (QUIET tier 2) is a reduce on the emitting side — nodes.js:340-348
      // registers it on the `noiseRadius` hook with source 'shot', and
      // HOOK_POINTS names weapons/weapon.js _fire() as the site that must run
      // it. Discounting here as well would apply one node twice.
      this.hear(p.ox, p.oz, p.loud || 20, 'shot');
    }));

    this._unsub.push(bus.on('noise', (p) => {
      if (p && p.source !== 'enemy') this.hear(p.x, p.z, p.radius, p.source || 'world');
    }));

    // NOTE: there is deliberately no 'player:land' subscription. The player
    // lane owns the footfall and landing `noise` emits now (integrator decision
    // 2, and player/controller.js:736-740 publishes a landing noise scaled by
    // fall speed on the same frame as 'player:land'). Hearing both was hearing
    // one landing twice, and the second one at a hard-coded 8 m that ignored
    // how far the player had actually fallen.

    // NOTE: no 'car:entered' subscription either. Shut the Door (QUIET tier 3)
    // is a NODE, and a lane that broke hunts on every car entry would be giving
    // away for free the thing the tree sells for three points. The node owns its
    // own trigger (nodes.js registers it on 'onDoorShut' and 'onPlaceNear') and
    // reaches this lane through loseTrail(), below.

    this._built = true;
  }

  ready() {
    return this._built && this.all.length > 0 && !!this.ctx.scene;
  }

  dispose() {
    for (const off of this._unsub) { if (typeof off === 'function') off(); }
    this._unsub.length = 0;
    for (const e of this.all) {
      if (e.built.group.parent) e.built.group.parent.remove(e.built.group);
      e.built.dispose();
    }
    for (let i = 0; i < this.impostorList.length; i++) {
      const rec = this.impostorList[i];
      if (rec.mesh.parent) rec.mesh.parent.remove(rec.mesh);
      rec.mesh.geometry.dispose();
      rec.mesh.material.dispose();
    }
    this.impostorList.length = 0;
    this.impostors.clear();
    if (this.bolts) {
      if (this.bolts.parent) this.bolts.parent.remove(this.bolts);
      this.bolts.geometry.dispose();
      this.bolts.material.dispose();
    }
    this.all.length = 0;
  }

  _sys(id) {
    const s = this.ctx.systems;
    if (!s) return null;
    return typeof s.get === 'function' ? s.get(id) : s[id];
  }

  /* =====================================================================
     PUBLIC API — the shape combat.js and weapon.js already code against
     ===================================================================== */

  get aliveCount() {
    let n = 0;
    for (let i = 0; i < this.all.length; i++) if (this.all[i].alive) n++;
    return n;
  }

  get pressureCount() {
    let n = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.alive && e.def.owner === OWNER.PRESSURE) n += e.def.countsAs;
    }
    return n;
  }

  /* ---- the shape the director, the car and audio already code against ----
     Every one of these is named in docs/HANDOFF.md by the lane that needs it.
     director.js:380 wants a list() that returns the LIVE array and never
     allocates; :423 wants setHunt so the +72% is applied EXACTLY ONCE (applying
     it in two places is how ROCKET SHOES' distant enemies rocketed at the
     player); :433 wants wakeAll on the point that made the sound, never on the
     player's live coordinate, which would turn every gunshot into a wallhack. */

  /** The live array. Never a copy: the director censuses this every frame. */
  list() { return this.all; }

  /**
   * Only the bodies that are actually up, as an array.
   *
   * `tests/enemies.mjs:56` reads the roster as
   * `sys.alive ? sys.alive() : sys.list` and then iterates the result — so
   * without this method it would iterate the `list` FUNCTION and throw.
   * Reuses one array: it is a test and debug surface, not a hot path, and a
   * second caller holding the result across a call would see it change.
   */
  alive() {
    _aliveOut.length = 0;
    for (let i = 0; i < this.all.length; i++) {
      if (this.all[i].alive) _aliveOut.push(this.all[i]);
    }
    return _aliveOut;
  }

  forEachAlive(fn) {
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.alive) fn(e);
    }
  }

  /**
   * Which species this lane can actually field today. Ask this BEFORE spawn()
   * rather than reading a null return as "not now": spawn() returns null for
   * both "no free body in the pool" and "no such species", and only one of
   * those is a bug in the caller.
   */
  hasSpecies(key) { return SPECIES[key] !== undefined && POOL[key] > 0; }
  roster() { return ROSTER; }

  /** console.warn ONCE per unknown species id. Never inside a per-frame path. */
  _warnUnknown(key) {
    if (!this._warnedSpecies) this._warnedSpecies = new Set();
    if (this._warnedSpecies.has(key)) return;
    this._warnedSpecies.add(key);
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('enemies.spawn: no such species ' + JSON.stringify(key)
        + '. The roster is [' + ROSTER.join(', ') + ']. Nothing was spawned.');
    }
  }

  /** HUNT. The flag ONLY — the steering is applied in exactly one place. */
  setHunt(e, on, mul) {
    this._lastAsk = this._t;
    if (!e) return;
    e.hunt = !!on;
    e.huntSpeedMul = on ? (mul || CFG.director.huntSpeedMul) : 1;
  }

  /** The black hour: the Hunter comes off the leash, the poachers go quiet. */
  setLeash(e, on) { this._lastAsk = this._t; if (e) e.leashed = !!on; }
  setHoldFire(e, on) { this._lastAsk = this._t; if (e) e.holdFire = !!on; }

  /** Wake everything inside a noise radius. Alias of hear(), which is the same law. */
  wakeAll(x, z, radius) { this._lastAsk = this._t; this.hear(x, z, radius, 'director'); }
  wake(x, z, radius) { this._lastAsk = this._t; this.hear(x, z, radius, 'director'); }

  /**
   * The car's one call into this lane (car's HANDOFF section 4): a ram kills a
   * pallbearer at >= 8 m/s and staggers a Hunter. Called at most 5x/s from the
   * bumper, 2.1 m ahead of the car centre.
   */
  ramHit(x, z, radius, speed, dirX, dirZ) {
    const r = (radius || 2.4) + 0.4;
    let hits = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      if (dx * dx + dz * dz > (r + e.def.radius) * (r + e.def.radius)) continue;
      hits++;
      // Momentum, not a magic number: a two-tonne car at 8 m/s ends a 210 kg
      // pallbearer and rocks a 150 kg Hunter, and the same line does both.
      const dmg = Math.round(speed * speed * 2.6 / Math.max(40, e.def.mass) * 100);
      _v.set(x, e.pos.y + e.def.height * 0.5, z);
      const res = this.damage(e, Math.max(12, dmg), { zone: 'torso', point: _v, dist: 2 });
      if (!res.killed) {
        // a survivor is STAGGERED and thrown, never merely nudged
        e.staggerT = STAGGER_T;
        e.immuneT = STAGGER_T + STAGGER_IMMUNITY * 0.5;
        this._uncommit(e);
        if (e.state === 'windup' || e.state === 'attack') { e.state = 'recover'; e.stateT = 0; }
        const kick = Math.min(speed * 0.55, 9);
        e.vel.set((dirX || 0) * kick, 2.2, (dirZ || 0) * kick);
        e.airborne = true;
      }
    }
    return hits;
  }

  /**
   * Ray vs the sphere hit zones. Returns the SHARED result or null; combat.js
   * consumes it synchronously (combat.js:170-177) and retains nothing.
   */
  raycast(origin, dir, maxT) {
    let bestT = maxT, found = null, foundZone = 'torso';
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dx = dir.x, dy = dir.y, dz = dir.z;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive) continue;
      // cheap reject: the whole body's bounding sphere first
      const bx = e.pos.x - ox, by = (e.pos.y + e.def.height * 0.5) - oy, bz = e.pos.z - oz;
      const bt = bx * dx + by * dy + bz * dz;
      if (bt < -e.def.height || bt > bestT + e.def.height) continue;
      const bd2 = bx * bx + by * by + bz * bz - bt * bt;
      const br = e.def.height * 0.62 * e.scale;
      if (bd2 > br * br) continue;

      const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
      const S = e.scale;
      const zones = e.built.zones;
      for (let k = 0; k < zones.length; k++) {
        const zn = zones[k];
        const lx = zn.x * S, ly = zn.y * S, lz = zn.z * S;
        const wx = e.pos.x + lx * cy + lz * sy;
        const wy = e.pos.y + ly;
        const wz = e.pos.z - lx * sy + lz * cy;
        const px = wx - ox, py = wy - oy, pz = wz - oz;
        const tca = px * dx + py * dy + pz * dz;
        if (tca < 0 || tca > bestT) continue;
        const r = zn.r * S;
        const d2 = px * px + py * py + pz * pz - tca * tca;
        if (d2 > r * r) continue;
        const t = tca - Math.sqrt(r * r - d2);
        if (t < 0 || t >= bestT) continue;
        bestT = t; found = e; foundZone = zn.zone;
      }
    }
    if (!found) return null;
    _hit.t = bestT;
    _hit.enemy = found;
    _hit.zone = foundZone;
    _hit.point.set(ox + dx * bestT, oy + dy * bestT, oz + dz * bestT);
    return _hit;
  }

  /**
   * Take damage. combat.js calls this directly (combat.js:287-291, 414-416) and
   * reads `.killed` off the return, so this is the authority and the bus channel
   * is a convenience wrapper around it.
   */
  damage(e, amount, info) {
    if (!e || !e.alive) return { killed: false, hpFrac: 0, species: e ? e.species : '' };
    const zone = info && info.zone ? info.zone : 'torso';
    let dmg = amount;
    if (e.staggerT > 0) dmg = Math.round(dmg * 1.25);   // a staggered body takes more
    dmg = Math.max(1, dmg);                             // THE ONE LAW: never zero
    e.hp -= dmg;

    // direction: combat does not pass one, so derive it from the impact point,
    // and fall back to away-from-the-player.
    const p = this._sys('player');
    if (info && info.point) {
      _dir.set(e.pos.x - info.point.x, 0, e.pos.z - info.point.z);
    } else if (p) {
      _dir.set(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
    } else {
      _dir.set(0, 0, 1);
    }
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, 1);
    _dir.normalize();

    // hit flash: EVERY hit, unbudgeted, 60 ms. Silence reads as broken and so
    // does a hit that does not answer.
    e.flashT = 0;
    e.built.telegraph(1.0);

    // budgeted body flinch
    if (e.flinchT > FLINCH_BUDGET && e.staggerT <= 0) {
      e.flinchT = 0;
      e.flinch.set(_dir.x * 0.09, 0, _dir.z * 0.09);
    }

    // stagger: a third of max inside a 400 ms window, or one big hit on a vent
    e.windowDmg += dmg;
    e.windowT = 0;
    const weakBig = zone === 'vent' && dmg >= e.def.hp * 0.25;
    if (e.immuneT <= 0 && e.staggerT <= 0
      && (e.windowDmg >= e.def.hp * STAGGER_FRACTION || weakBig)) {
      e.staggerT = STAGGER_T;
      e.immuneT = STAGGER_T + STAGGER_IMMUNITY;
      this._uncommit(e);
      if (e.state === 'windup' || e.state === 'attack') { e.state = 'recover'; e.stateT = 0; }
      evtReset(e, 'stagger');
      this.ctx.bus.emit('enemy:telegraph', _evt);
    }

    // anything that is hurt is awake, and a dormant thing that is shot RISES
    if (e.state === 'dormant') this._wake(e);
    if (e.def.owner === OWNER.PRESSURE) e.aware = 2;
    e.memT = e.def.memHunt || 9;
    e.heardX = p ? p.pos.x : e.pos.x;
    e.heardZ = p ? p.pos.z : e.pos.z;

    // The wound is stamped ON THE RECORD as well as on the event.
    // progression/progress.js:409 reads `p.zone || p.e.lastZone` and doubles XP
    // for a head, so the body has to be able to answer "where were you hit"
    // even when the payload it is reading did not come from this call.
    e.lastZone = zone;
    e.lastMelee = !!(info && info.melee);

    evtReset(e, 'hurt');
    _evt.dmg = dmg;
    _evt.zone = zone;
    _evt.y = e.pos.y + e.def.height * 0.5;
    this.ctx.bus.emit('enemy:hurt', _evt);

    if (e.hp <= 0) {
      this._kill(e, dmg, zone, e.lastMelee);
      return { killed: true, hpFrac: 0, species: e.species };
    }
    return { killed: false, hpFrac: clamp01(e.hp / e.def.hp), species: e.species };
  }

  /**
   * Wake anything that could have heard it. `radius` is the alert radius the
   * source published — for a weapon that is CFG.weapons.defs[x].loud, which is
   * why a permanent kill is never free.
   */
  hear(x, z, radius, source) {
    if (!(radius > 0)) return;
    this._noiseX = x; this._noiseZ = z; this._noiseR = radius; this._noiseT = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.state === 'corpse' || (!e.alive && !e.def.dormant)) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d > radius) continue;
      if (e.state === 'dormant') {
        if (radius >= e.def.wakeNoise * 0.5) this._wake(e);
        continue;
      }
      if (!e.alive) continue;
      if (e.def.owner === OWNER.DREAD) continue;   // horror does not answer a gunshot
      e.heardX = x; e.heardZ = z;
      if (e.aware < 1) e.aware = 1;
      e.memT = Math.max(e.memT, e.def.memAlert || 6);
      e.navBest = undefined;
    }
  }

  /* =====================================================================
     THE QUIET BRANCH — what this lane owes it, and what it must not do.

     progression/nodes.js owns all four cards and drives them through hooks; it
     reaches in here through the two public methods below and through nothing
     else. This file deliberately implements NONE of the four itself. It did,
     briefly, this round — reading stats.coldBarrel / shutDoor / stillHeart off
     progress.stats — and every one of those keys had already been deleted from
     baseStats() by the same rewrite that moved the branch onto hooks, so the
     duplicate was both a second implementation AND a dead read. Two lanes
     implementing one node is how a x0.6 becomes a x0.36 that nobody can name.

       Soft Step   noiseRadius hook, source 'step' — player/controller.js emit
       Cold Barrel noiseRadius hook, source 'shot' — weapons/weapon.js _fire()
       Shut Door   onDoorShut / onPlaceNear -> loseTrail(), here
       Still Heart onStep                   -> loseTrail(), here

     Both radius nodes therefore land at the EMIT, before the number reaches
     hear(), which is right: a noise the county hears is the noise that was
     made. Both memory nodes land here, because memory is this lane's.
     ===================================================================== */

  /**
   * How many PRESSURE bodies currently know about you. O(1): recomputed once a
   * step in the census that already walks the pool.
   *
   * nodes.js:237 asks this on every shot through forEachAlive with a closure,
   * which allocates one function and walks all 46 records per trigger pull, and
   * counts dread bodies too — the Pale is spawned aware:2 by law, so a county
   * with one Pale in it can never be "unaware" and Cold Barrel would never once
   * fire. Read this instead. docs/HANDOFF.md carries the request.
   */
  get awareCount() { return this._awareNow; }

  /**
   * BREAK THE TRAIL. Every alerted PRESSURE body FURTHER AWAY than `beyond`,
   * and with no line to the point, loses the player: no aggro, no memory, no
   * HUNT bonus, and its last known position becomes the place it lost you
   * rather than wherever you actually are.
   *
   * `beyond`, not `within`, and that is the design and not a preference: the
   * thing standing on top of you has you regardless, and it is the search out
   * in the trees that gives up. It is also exactly what nodes.js's
   * dropDistantHunts() means by its argument, so the two agree by name.
   *
   * This is the primitive Shut the Door (12 m) and Still Heart (6 m) are both
   * written against. It is deliberately UNGATED: the node decides whether the
   * verb happens, this lane decides what the verb MEANS. Nothing in here
   * branches on a node id, and with no node owned nobody calls it.
   *
   * setHunt(e, false) is NOT a substitute, and nodes.js:250-263 currently uses
   * it as one. setHunt is the FLAG ONLY, by contract, because director.js:324
   * releases HUNT routinely whenever a hunting body closes to HUNT_RELEASE and
   * must not lose its aggro for it. So dropDistantHunts() skips every body with
   * `hunt === false`, and `hunt` is only ever set true past
   * CFG.director.huntBeyond — 80 m. A card advertising a 6 m radius can, as
   * shipped, only touch bodies more than 80 m away, which is to say nothing
   * that was following you. The branch is wired and inert. This method is the
   * handle that makes it mean what the card says; the request is in HANDOFF.
   *
   * THE LINE-OF-SIGHT CLAUSE is this lane's and belongs nowhere else: a body
   * that visibly forgets you while looking straight at you is the
   * working-but-wrong read this project keeps shipping, and `e.los` is a number
   * only this file has. So being unseen is what lets you be forgotten, and
   * being quiet is what stops them finding you again.
   *
   * @param beyond metres. Bodies closer than this keep you. Default 0.
   * @returns how many bodies lost the trail.
   */
  loseTrail(x, z, beyond) {
    // Deliberately does NOT stamp `_lastAsk`: that field measures the
    // DIRECTOR's silence for the dead-man's handle, and the player hiding is
    // not a director order. Stamping it here would let a jammed director hide
    // behind the player crouching.
    const b = beyond > 0 ? beyond : 0;
    const b2 = b * b;
    let n = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive || e.aware <= 0) continue;
      // Horror does not use doors and does not track you by aggro: the Pale is
      // frozen by the beam and the Standing Kind by being watched. Silencing
      // them would be selling the horror off the skill tree.
      if (e.def.owner !== OWNER.PRESSURE) continue;
      if (e.los) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      if (dx * dx + dz * dz < b2) continue;
      e.aware = 0;
      e.memT = 0;
      e.hunt = false;
      e.huntSpeedMul = 1;
      e.alerted = false;
      // The trail ends WHERE IT ENDED. It searches the door, not your current
      // coordinate — losing you is not forgetting you were ever there, and a
      // body that snaps its attention home reads as a switch being flipped.
      e.heardX = x; e.heardZ = z;
      e.navBest = undefined;
      n++;
    }
    return n;
  }

  /** Broadcast a noise of our own. Anything can listen; the director will. */
  _emitNoise(x, z, radius, source) {
    _noise.x = x; _noise.z = z; _noise.radius = radius; _noise.source = source;
    this.ctx.bus.emit('noise', _noise);
  }

  /**
   * Place a body. Returns the record or null — and REFUSES rather than clipping,
   * which is UNINVITED's placement law. Refusals are counted and telemetry()
   * publishes the count so a gate can assert it is above zero.
   */
  /**
   * Place a body.
   *
   * TWO SIGNATURES, because two lanes already code against different ones:
   *   spawn(species, x, y, z, opts)   <- director.js:369, the shape it documented
   *   spawn(species, x, z, opts)      <- the shorter one the tests and I use
   * `y` is ignored either way: the ground is terrain.heightAt and nothing else.
   *
   * `opts.pack` is honoured (director.js:791 sizes hound packs 2-3, or 3-7 in the
   * black hour) — the director asks for ONE order and this owns what a pack of
   * five means, exactly as its handoff says.
   *
   * Returns the LEADER's record, or null meaning "not now" — and it REFUSES
   * rather than clipping, which is UNINVITED's placement law. Refusals are
   * counted; telemetry() publishes the count so a gate can assert it is > 0.
   */
  spawn(key, a, b, c, d) {
    let x, z, opts;
    if (typeof c === 'number') { x = a; z = c; opts = d; }        // (key, x, y, z, opts)
    else { x = a; z = b; opts = c; }                              // (key, x, z, opts)
    this._lastAsk = this._t;
    const def = SPECIES[key];
    // An unknown id still returns null — refusing is right, and a caller that
    // asks for a species this lane does not field must not get a body. But it
    // is now LOUD once per id: a director/enemies roster mismatch that fails
    // silently is a county that quietly stops spawning, which is the exact
    // class of bug this audit was called for. Once, not per frame, because a
    // per-frame warn from inside step() is its own denial of service.
    if (!def) { this._warnUnknown(key); return null; }

    const pack = opts && opts.pack > 1 ? Math.min(8, opts.pack | 0) : 1;
    if (pack > 1) {
      const lead = this._spawnOne(key, x, z, opts);
      if (!lead) return null;
      for (let k = 1; k < pack; k++) {
        const ang = this.placeRng.next() * TAU;
        const r = 1.7 + this.placeRng.next() * 2.6;
        this._spawnOne(key, x + Math.cos(ang) * r, z + Math.sin(ang) * r, opts);
      }
      return lead;
    }
    return this._spawnOne(key, x, z, opts);
  }

  _spawnOne(key, x, z, opts) {
    const def = SPECIES[key];
    if (!def) return null;
    let e = null;
    for (let i = 0; i < this.all.length; i++) {
      const c = this.all[i];
      if (c.species === key && !c.alive && c.state !== 'corpse') { e = c; break; }
    }
    if (!e) { this._refused++; return null; }

    const col = this._sys('collision');
    if (col && typeof col.canOccupy === 'function' && !col.canOccupy(x, z, def.radius, def.height)) {
      this._refused++;
      return null;
    }

    e.alive = true;
    e.dead = false;
    e.alerted = def.owner === OWNER.DREAD;
    e.hunt = false; e.huntSpeedMul = 1;
    e.leashed = true; e.holdFire = false;
    e.hp = def.hp * ((opts && opts.hpScale) || 1);
    e.pos.set(x, groundY(this.ctx, x, z), z);
    e.vel.set(0, 0, 0);
    e.prevPos.copy(e.pos); e.currPos.copy(e.pos);
    const p = this._sys('player');
    e.yaw = p ? faceYaw(x, z, p.pos.x, p.pos.z) : 0;
    e.prevYaw = e.currYaw = e.yaw;
    e.stateT = 0; e.burstT = 0; e.gait = 0; e.prevGait = 0; e.currGait = 0;
    e.committed = false; e.struck = false; e.airborne = false;
    e.frontDot = 1; e.frontDeniedT = 0; e.rearStrike = false;
    e.telegraphS = def.telegraph;
    e.breakoffT = 0; e.recommitT = 0; e.seenT = 0;
    e.staggerT = 0; e.immuneT = 0; e.windowDmg = 0; e.windowT = 0;
    e.flinchT = 99; e.flinch.set(0, 0, 0);
    e.deathT = 0; e.flashT = 99;
    // a reused record must never inherit the last life's wound
    e.lastZone = 'torso'; e.lastMelee = false;
    e.aware = def.owner === OWNER.DREAD ? 2 : 0;
    e.memT = 0;
    e.heardX = e.pos.x; e.heardZ = e.pos.z;
    e.homeX = e.pos.x; e.homeZ = e.pos.z;
    e.tickT = 0; e.tick = 0;
    e.leapCd = def.leapCooldown || 0;
    e.screamCd = 2 + this.rng.next() * 4;
    e.band = pickBand(def, this.rng);
    e.riseT = 0;
    e.riseSquash = 1;
    e.prevSquash = 1; e.currSquash = 1;
    e.reveal = REVEAL.FLOOR;
    e.navBest = undefined; e.navBestT = 0; e._navValid = false;
    e.lodFar = true;

    // EVERY FIRST SIGHT IS PARTIAL BY CONSTRUCTION. A dormant species starts in
    // the ground and rises; everything else starts squashed at 0.34 and unfolds
    // over its rise time, so the first frame anybody sees is never a whole body
    // standing in the open. fetch enemies.js:1983-2002.
    const wantDormant = def.dormant && !(opts && opts.awake);
    if (wantDormant) {
      e.state = 'dormant';
      e.riseSquash = 0.0;
      e.built.group.visible = false;
    } else {
      // EVERY BODY THAT STARTS SQUASHED MUST ENTER THE STATE THAT UNSQUASHES IT.
      //
      // This line used to read `def.dormant ? 'rise' : 'approach'` while the two lines under
      // it set riseSquash to 0.34 for EVERYONE. riseSquash is advanced back toward 1 in
      // exactly one place — the 'rise' handler below — so a hound, a poacher or a Hunter went
      // straight to 'approach' and stayed at 0.34 for the whole of its life. present() then
      // scaled it to a third of its height and pushed it 0.62 body-heights into the earth,
      // every frame, forever.
      //
      // Alex found it by playing: "these are totally often underground... a few partial
      // enemies that were sticking out of the ground coming at me", and "possibly a hound
      // flying through the air sideways" — which is what a body 0.6 m under the terrain
      // looks like when it crosses a slope. Measured at the spawn: drawn group 0.57-0.64 m
      // below terrain, drawn scale.y 0.31-0.36, the top of the bounding box under the ground.
      // Its pos.y was correct to a centimetre the entire time, which is why three passes of
      // instrumentation that sampled the SIMULATION pose reported nothing wrong.
      //
      // The design is good and stays: no first sight is ever a whole body standing in the
      // open. A non-dormant species just rises FAST — it is stepping out from behind a trunk,
      // not climbing out of a grave.
      e.state = 'rise';
      e.riseT = def.dormant ? (def.riseTime || 0.55) : QUICK_RISE_S;
      e.riseDur = e.riseT;
      e.riseSquash = 0.34;
      e.built.group.visible = true;
    }
    e.prevSquash = e.currSquash = e.riseSquash;
    e.built.deathGlow(1);
    e.built.telegraph(0);
    e.built.reveal(REVEAL.FLOOR);

    this._claimSlot(e);
    this._spawned++;
    this._lastContact = this._t;
    evtReset(e, 'spawn');
    _evt.xp = def.xp;
    this.ctx.bus.emit('enemy:spawned', _evt);
    return e;
  }

  /* =====================================================================
     THE STEP
     ===================================================================== */

  step(dt) {
    if (!this._built) return;
    this._frame++;
    this._t += dt;
    this._noiseT += dt;
    this._breathT += dt;
    this._landedT += dt;
    this._ringPhase = (this._ringPhase + RING_SPIN * dt) % TAU;

    const p = this._sys('player');
    if (!p) return;

    // frozen separation snapshot, then everybody reads the SAME crowd
    this.sep.begin();
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.alive && e.state !== 'dormant') this.sep.add(e.id, e.pos.x, e.pos.z, e.def.radius);
    }

    this._commit = 0;
    this._aliveNow = 0;
    this._awareNow = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive) continue;
      this._aliveNow++;
      if (e.committed) this._commit++;
      if (e.aware > 0 && e.def.owner === OWNER.PRESSURE) this._awareNow++;
    }

    // THE DEAD-MAN'S HANDLE, decided ONCE a step. `autonomous` is read per body
    // inside _approach, so it must not be an O(n) census or a systems lookup
    // per creature per frame.
    this._jam = this._aliveNow === 0 && (this._t - this._lastAsk) > DIRECTOR_JAM_S;

    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      e.prevPos.copy(e.currPos);
      e.prevYaw = e.currYaw;
      e.prevGait = e.currGait;
      e.prevSquash = e.currSquash;
      if (e.alive) this._stepEnemy(e, dt, p);
      else if (e.state === 'corpse') this._stepCorpse(e, dt);
      e.currPos.copy(e.pos);
      e.currYaw = e.yaw;
      e.currGait = e.gait;
      e.currSquash = e.riseSquash;
    }

    this._stepBolts(dt, p);
    this._trickle(dt, p);
  }

  /* ---------------------------------------------------------- perception -- */

  _perceive(e, p) {
    const def = e.def;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
    e.dist = Math.hypot(dx, dz);
    const eyeY = e.pos.y + def.height * 0.86 * e.scale;
    e.los = e.dist < 120 && visible(this.ctx, e.pos.x, eyeY, e.pos.z);
    // "how lit are YOU" — the torch trade. The Pale reads the same number from
    // the other side: it is only frozen while the beam is on IT.
    e.litSelf = lit(this.ctx, e.pos.x, eyeY, e.pos.z, def.beamDot || 0.82, def.beamRange || 18);
    e.obsSelf = observed(this.ctx, e.pos.x, eyeY, e.pos.z,
      def.coneDot === undefined ? 0.28 : def.coneDot,
      def.coneRange === undefined ? 60 : def.coneRange);
    // Where it is standing relative to what the player is LOOKING at. No
    // raycast; this is the front-commit law's only input, and it is the number
    // whatkilledme.mjs prints as `facing`.
    e.frontDot = bearingDot(this.ctx, e.pos.x, e.pos.z);
    const shared = this.ctx.shared;
    e.playerLit = shared && typeof shared.lit === 'number' ? shared.lit
      : (this._torchOn() ? 1 : 0);
  }

  _torchOn() {
    const l = this._sys('lights');
    return !!(l && typeof l.torchOn === 'function' && l.torchOn());
  }

  /**
   * THE PHASE VOCABULARY IS EXACTLY 'dusk' | 'night' | 'black' | 'dawn'
   * (integrator decision 1, 2026-09-02). world/clock.js writes it into
   * ctx.shared.phase and `phase:changed` carries it; species.js spells its
   * `phases` rows in the same four words. There is no alias table here any
   * more — a second spelling that only works because one file happens to
   * translate for another is the next silent Hunter-never-spawns bug.
   * An absent or unknown phase reads as 'night', the mid-cycle default, so a
   * clock that has not booted yet still fields a roster.
   */
  _phase() {
    const s = this.ctx.shared;
    const raw = s && s.phase;
    return (raw === PHASE.DUSK || raw === PHASE.NIGHT
         || raw === PHASE.BLACK || raw === PHASE.DAWN) ? raw : PHASE.NIGHT;
  }

  /* ------------------------------------------------------------ one body -- */

  _stepEnemy(e, dt, p) {
    const def = e.def;

    // Perception on a stagger, so twenty bodies never all raycast on the same
    // frame. The two dread species retest faster because their whole rule IS
    // the observation test: the Standing Kind's spec says 0.08 s, and 4 frames
    // is 0.067 s. Six frames (0.100 s) would break its own number.
    const cadence = def.owner === OWNER.DREAD ? PERCEPT_DREAD : PERCEPT_EVERY;
    if (((this._frame + e.id) % cadence) === 0 || e.dist === undefined) {
      this._perceive(e, p);
    }

    e.flinchT += dt;
    e.windowT += dt;
    e.flashT += dt;
    if (e.windowT > STAGGER_WINDOW) e.windowDmg = 0;
    e.immuneT = Math.max(0, e.immuneT - dt);
    e.leapCd = Math.max(0, e.leapCd - dt);
    e.screamCd = Math.max(0, e.screamCd - dt);
    e.memT = Math.max(0, e.memT - dt);
    // the breath after a bite, and the shorter one after a whiff
    e.breakoffT = Math.max(0, e.breakoffT - dt);
    e.recommitT = Math.max(0, e.recommitT - dt);
    // how long it has been continuously inside the player's attention. It is
    // what makes "how long had he been able to see it before it hit him"
    // answerable, which is the question whatkilledme.mjs was built to ask.
    if (e.obsSelf) e.seenT += dt; else e.seenT = 0;
    if (e.memT <= 0 && e.aware > 0 && def.owner === OWNER.PRESSURE) e.aware = 0;
    // the plain-boolean mirror the director and audio read (their handoffs);
    // aware is 0/1/2 and neither lane should have to know that
    e.alerted = e.aware > 0;

    // the flash decays back to whatever the telegraph is asking for
    if (e.flashT >= 0.06 && e.flashT < 0.20) {
      e.built.telegraph(e.state === 'windup' ? clamp01(e.stateT / def.telegraph) : 0);
    }

    // dormant: in the ground, waiting for a noise. It is not drawn, it costs
    // one distance test, and it is the reason the county is never empty.
    if (e.state === 'dormant') {
      e.built.group.visible = false;
      return;
    }

    // the rise. Squash 0.34 -> 1, a lateral shudder, and it is LOUD.
    if (e.state === 'rise') {
      e.riseT = Math.max(0, e.riseT - dt);
      const remaining = e.riseT / Math.max(0.001, e.riseDur);
      e.riseSquash = 0.34 + 0.66 * (1 - remaining);
      e.yaw = dampAngle(e.yaw, faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z), 5, dt);
      followGround(this.ctx, e, dt);
      if (e.riseT <= 0) { e.state = 'approach'; e.stateT = 0; e.riseSquash = 1; }
      return;
    }

    if (e.staggerT > 0) {
      e.staggerT -= dt;
      e.vel.x = damp(e.vel.x, 0, 8, dt);
      e.vel.z = damp(e.vel.z, 0, 8, dt);
      this._integrate(e, dt);
      return;
    }

    switch (def.owner === OWNER.DREAD ? def.id : 'pressure') {
      case 'pale': this._stepPale(e, dt, p); break;
      case 'standing': this._stepStanding(e, dt, p); break;
      default: this._stepPressure(e, dt, p); break;
    }

    this._integrate(e, dt);
  }

  /* ---------------------------------------------------- the pressure brain -- */

  _stepPressure(e, dt, p) {
    const def = e.def;
    e.stateT += dt;

    switch (e.state) {
      case 'approach': this._approach(e, dt, p); break;

      case 'windup': {
        // MOVE OR ATTACK, NEVER BOTH. Everything stops; the tell is the only
        // thing happening, and it is on a shootable part with a sound already
        // broadcast on frame 1.
        e.vel.x = damp(e.vel.x, 0, 10, dt);
        e.vel.z = damp(e.vel.z, 0, 10, dt);
        // e.telegraphS, not def.telegraph: a windup that fired outside the
        // player's cone runs REAR_TELEGRAPH_MUL longer, because the only
        // channel it has is the audio cue and a cue needs time to be acted on.
        e.telegraphCharge = clamp01(e.stateT / e.telegraphS);
        e.built.telegraph(e.telegraphCharge);
        e.yaw = dampAngle(e.yaw, faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z), 7, dt);
        if (e.stateT >= e.telegraphS) {
          const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          const reach = def.id === 'poacher' ? def.strikeRange
            : (def.lungeRange || def.strikeRange) * 1.6 + 3.0;
          if (d > reach) {
            // THE TELEGRAPH LAW's other half: an attack that would land late is
            // CANCELLED. It is never turned into a chase-strike, because a
            // chase-strike is an attack the player was never shown.
            e.state = 'recover'; e.stateT = 0; this._uncommit(e);
            this._cancelled++;
          } else {
            e.state = 'attack'; e.stateT = 0; e.struck = false;
            e.strikeX = p.pos.x; e.strikeZ = p.pos.z;   // committed to a FIXED point
            if (e.attackKind === 'leap') this._launchLeap(e, p);
            // 'commit', never the attack kind again: a second event with the
            // same kind made a telegraph-to-strike gate read 0.150 s in the node
            // harness when the real windup was the full 0.320. The channel has
            // to be measurable or the law is unenforceable.
            evtReset(e, 'commit');
            this.ctx.bus.emit('enemy:telegraph', _evt);
          }
          e.built.telegraph(0);
          e.telegraphCharge = 0;
        }
        break;
      }

      case 'attack': this._attack(e, dt, p); break;

      case 'recover': {
        this._uncommit(e);
        e.vel.x = damp(e.vel.x, 0, 6, dt);
        e.vel.z = damp(e.vel.z, 0, 6, dt);
        if (e.stateT >= def.recover) {
          e.state = 'approach'; e.stateT = 0; e.burstT = 0;
          // Even a whiff costs a beat. Without this a hound whose strike missed
          // re-committed on the next pause, which is the same metronome the
          // playtest measured, only with the damage spread over more attempts.
          e.recommitT = Math.max(e.recommitT, RECOMMIT_MISS);
        }
        break;
      }

      case 'flee': {
        // retreat to cover below 25% hp: it breaks contact and comes back
        _pt.x = e.pos.x * 2 - p.pos.x; _pt.z = e.pos.z * 2 - p.pos.z;
        const s = steer(this.ctx, e, _pt.x, _pt.z, this._frame);
        const want = def.speed * 0.9;
        e.vel.x = damp(e.vel.x, s.x * want, 8, dt);
        e.vel.z = damp(e.vel.z, s.z * want, 8, dt);
        e.moving = true;
        e.yaw = dampAngle(e.yaw, Math.atan2(-e.vel.x, -e.vel.z), 8, dt);
        if (e.stateT > 4.5 || e.hp > def.hp * 0.4) { e.state = 'approach'; e.stateT = 0; }
        break;
      }

      default: e.state = 'approach'; e.stateT = 0; break;
    }
  }

  _approach(e, dt, p) {
    const def = e.def;

    // hp < 25%: break for cover. It is a hound rule but every crowd unit reads
    // better for it — a thing that never disengages is a target, not an animal.
    if (def.retreatBelow && e.hp < def.hp * def.retreatBelow && e.stateT > 0.6) {
      e.state = 'flee'; e.stateT = 0; this._uncommit(e);
      return;
    }

    // the poacher does not chase you; it works its band and keeps a line
    if (def.bands) { this._approachPoacher(e, dt, p); return; }

    // NOTICING YOU. Without this a hound stood five metres away and never
    // looked up, because nothing but a gunshot ever set `aware` — measured in
    // the node harness, 5400 frames, zero commits. A clear line inside the
    // species' notice range is enough; carrying a light stretches it by 60%,
    // which is the same torch trade the poacher's accuracy charges you for.
    if (e.aware === 0 && e.los) {
      // off the leash (the black hour, director.js:807) it does not need to
      // notice you: it already knows.
      const reach = e.leashed === false ? 1e9 : def.notice * (1 + (e.playerLit || 0) * 0.6);
      if (e.dist <= reach) {
        e.aware = 1;
        e.memT = def.memAlert;
        evtReset(e, 'notice');
        _evt.y = e.pos.y + def.height * 0.7;
        this.ctx.bus.emit('enemy:telegraph', _evt);   // it ANSWERS. Silence reads as broken.
      }
    }
    // while it can see you it always knows where you are; the memory is what
    // runs out when it cannot
    if (e.aware > 0 && e.los && e.dist < def.notice * 1.6) {
      e.heardX = p.pos.x; e.heardZ = p.pos.z;
      e.memT = Math.max(e.memT, def.memAlert);
    }

    // ---- the target: a RING SLOT, so a pack surrounds instead of stacking.
    //      A body still spending its BREAKOFF breath rings out to a readable
    //      distance instead: it bit you, and now it leaves and comes back.
    const breaking = e.breakoffT > 0;
    const standoff = breaking ? def.standoff * BREAKOFF_MUL : def.standoff;
    const slot = e.slot >= 0 ? e.slot : (e.id % RING_SLOTS);
    // THE RING IS ANCHORED TO YOUR FACE. See RING_ARC: an aware crowd body's
    // slot lives in the front arc, so it arrives where its telegraph can be
    // received. A body that has spent FRONT_PATIENCE failing to get there is
    // boxed in and keeps the old world-space ring, because at that point the
    // near-doubled windup and the rear audio cue are what it is paying with
    // instead. Everything dread-owned keeps the world ring by law.
    const fa = (def.owner === OWNER.PRESSURE && e.aware > 0
      && e.frontDeniedT < FRONT_PATIENCE) ? aimAngle(this.ctx) : null;
    let a;
    if (fa !== null) {
      const u = RING_SLOTS > 1 ? (slot / (RING_SLOTS - 1)) * 2 - 1 : 0;
      a = fa + u * RING_ARC + Math.sin(this._ringPhase + slot) * 0.10;
    } else {
      a = this._ringPhase + slot * (TAU / RING_SLOTS);
    }
    let tx = p.pos.x + Math.cos(a) * standoff;
    let tz = p.pos.z + Math.sin(a) * standoff;

    // ---- HUNT: past 80 m an alerted PRESSURE body stops flavouring and
    // converges. Dread-owned bodies are exempt by law and never get here.
    //
    // The +72% is applied in EXACTLY ONE PLACE, here, off the `hunt` flag.
    // director.js:420-427 owns setting that flag; when no director exists this
    // system sets it for itself two lines down. Applying the bonus in two
    // places is how ROCKET SHOES' distant enemies rocketed at the player
    // (its own note, systems/enemies.js:71-74), and the director's handoff
    // asks for exactly this discipline.
    if (this.autonomous) {
      e.hunt = e.aware > 0 && e.dist > CFG.director.huntBeyond;
      e.huntSpeedMul = e.hunt ? CFG.director.huntSpeedMul : 1;
    }
    let want = def.speed;
    if (e.hunt) {
      want *= e.huntSpeedMul || CFG.director.huntSpeedMul;
      tx = p.pos.x; tz = p.pos.z;
    } else if (e.aware === 0 && e.memT <= 0) {
      // unalerted: drift to the last thing it heard, or hold station
      tx = e.heardX; tz = e.heardZ;
      want = def.speed * 0.42;
    }

    // ---- burst gait: 600 ms of travel, 350 ms of stillness. A body may only
    // commit to an attack DURING a pause.
    if (def.burst < 100) {
      e.burstT += dt;
      const cycle = def.burst + def.pause;
      e.moving = (e.burstT % cycle) < def.burst;
      if (!e.moving) want = 0;
    } else e.moving = true;
    e.speedWant = want;

    const s = steer(this.ctx, e, tx, tz, this._frame);
    this.sep.separate(e.id, e.pos.x, e.pos.z, def.radius, _sep);
    const dsx = s.x * want + _sep.x * 2.2;
    const dsz = s.z * want + _sep.z * 2.2;
    e.vel.x = damp(e.vel.x, dsx, 9, dt);
    e.vel.z = damp(e.vel.z, dsz, 9, dt);

    // ---- the stuck watchdog, and the ONE place a body may be moved
    if (progress(e, dt, tx, tz) && e.dist > NAV.STUCK_MIN_DIST) {
      if (relocate(this.ctx, e, this.placeRng, _pt)) {
        e.pos.set(_pt.x, groundY(this.ctx, _pt.x, _pt.z), _pt.z);
        e.prevPos.copy(e.pos); e.currPos.copy(e.pos);   // never interpolate a relocation
        e.vel.set(0, 0, 0);
        e._navValid = false;
      }
      resetProgress(e, tx, tz);
    }

    // ---- the hunter's scream: it does not sneak, it recruits
    if (def.screamRadius && e.aware > 0 && e.screamCd <= 0 && e.dist < 46) {
      e.screamCd = def.screamCooldown;
      this._emitNoise(e.pos.x, e.pos.z, def.screamRadius, 'enemy');
      this.hear(p.pos.x, p.pos.z, def.screamRadius, 'scream');
      evtReset(e, 'scream');
      this.ctx.bus.emit('enemy:telegraph', _evt);
    }

    // ---- the attack decision
    const inBand = e.dist >= def.engage[0] && e.dist <= def.engage[1];
    const paused = def.burst > 100 || !e.moving;      // move OR attack
    const wants = inBand && e.aware > 0 && e.los;
    // THE FRONT-COMMIT LAW. It is asked BEFORE the token so that being behind
    // the player costs a body patience rather than a token, and asked with
    // `wants` so patience only accrues while it is genuinely trying.
    const mayCommit = this._frontGate(e, dt, wants);
    if (wants && paused && mayCommit && e.stateT > 0.35 && this._takeToken(e)) {
      const wantLeap = def.lungeRange && e.dist > def.lungeRange && e.dist < 9.5
        && e.leapCd <= 0 && (this._t - this._squadLeapAt) > def.squadLeapGap;
      if (wantLeap) {
        e.attackKind = 'leap';
        e.leapCd = def.leapCooldown;
        this._squadLeapAt = this._t;
      } else if (def.lungeRange && e.dist <= def.lungeRange) {
        e.attackKind = 'lunge';
      } else if (e.dist <= def.strikeRange + 1.1) {
        e.attackKind = 'strike';
      } else {
        this._uncommit(e);
        return;
      }
      this._beginWindup(e, e.attackKind, 0.6);       // AUDIO ON FRAME 1
    }

    // facing
    const spd = Math.hypot(e.vel.x, e.vel.z);
    if (spd > 0.5) e.yaw = dampAngle(e.yaw, Math.atan2(-e.vel.x, -e.vel.z), 8, dt);
    else e.yaw = dampAngle(e.yaw, faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z), 5, dt);
  }

  _approachPoacher(e, dt, p) {
    const def = e.def;
    // UNAWARE -> ALERTED -> HUNTING, with memories. It sees you by your LIGHT
    // and by what you shoot; a dark, quiet player is genuinely not seen.
    if (e.aware === 0) {
      const sees = e.los && e.dist < 60 && (e.playerLit > 0.15 || e.dist < 22);
      if (sees) { e.aware = 1; e.memT = def.memAlert; e.heardX = p.pos.x; e.heardZ = p.pos.z; }
    } else if (e.aware === 1) {
      if (e.los && e.dist < 55) {
        e.aware = 2; e.memT = def.memHunt;
        e.heardX = p.pos.x; e.heardZ = p.pos.z;
        // and once HUNTING it goes silent. The murmuring stops. That IS the tell.
        evtReset(e, 'hunting');
        this.ctx.bus.emit('enemy:telegraph', _evt);
      }
    } else if (e.los) {
      e.memT = def.memHunt;
      e.heardX = p.pos.x; e.heardZ = p.pos.z;
    }

    const prefer = def.bands[e.band];
    let tx, tz, want;
    if (e.aware === 0) {
      tx = e.homeX; tz = e.homeZ; want = def.speed * 0.5;
    } else {
      // hold the band: close if too far, back off if too near. The rusher band
      // (14) and the marksman band (44) are the same code.
      const dxp = e.pos.x - e.heardX, dzp = e.pos.z - e.heardZ;
      const d = Math.max(0.001, Math.hypot(dxp, dzp));
      const err = d - prefer;
      const k = clamp(err / Math.max(4, prefer * 0.4), -1, 1);
      tx = e.pos.x - (dxp / d) * k * 12;
      tz = e.pos.z - (dzp / d) * k * 12;
      want = (Math.abs(err) < 2.5) ? 0 : (e.aware === 2 ? def.alertSpeed : def.speed);
    }
    e.speedWant = want;
    e.moving = want > 0.1;

    const s = steer(this.ctx, e, tx, tz, this._frame);
    this.sep.separate(e.id, e.pos.x, e.pos.z, def.radius, _sep);
    e.vel.x = damp(e.vel.x, s.x * want + _sep.x * 2.0, 8, dt);
    e.vel.z = damp(e.vel.z, s.z * want + _sep.z * 2.0, 8, dt);

    if (progress(e, dt, tx, tz) && e.dist > NAV.STUCK_MIN_DIST) {
      if (relocate(this.ctx, e, this.placeRng, _pt)) {
        e.pos.set(_pt.x, groundY(this.ctx, _pt.x, _pt.z), _pt.z);
        e.prevPos.copy(e.pos); e.currPos.copy(e.pos);
        e.homeX = _pt.x; e.homeZ = _pt.z;
      }
      resetProgress(e, tx, tz);
    }

    // holdFire is the black hour's other half: the poachers go quiet
    // (director.js:809). They still stalk; they just stop shooting.
    if (e.aware === 2 && !e.holdFire && e.los && e.dist <= def.strikeRange && e.stateT > 0.4
      && this._takeToken(e)) {
      e.attackKind = 'bolt';
      this._beginWindup(e, 'aim', 0.8);
    }

    if (e.aware > 0) e.yaw = dampAngle(e.yaw, faceYaw(e.pos.x, e.pos.z, e.heardX, e.heardZ), 6, dt);
    else if (Math.hypot(e.vel.x, e.vel.z) > 0.4) {
      e.yaw = dampAngle(e.yaw, Math.atan2(-e.vel.x, -e.vel.z), 6, dt);
    }
    e.aim = e.aware === 2 ? clamp01(e.aim + dt * 3) : Math.max(0, e.aim - dt * 2);
  }

  _launchLeap(e, p) {
    const def = e.def;
    const d = Math.max(0.6, Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z));
    const T = clamp(d / def.lungeSpeed, 0.22, 0.62);
    // lead the player a little: strafing must stay a dodge you keep performing
    const tx = p.pos.x + (p.vel ? p.vel.x * 0.22 : 0);
    const tz = p.pos.z + (p.vel ? p.vel.z * 0.22 : 0);
    e.vel.set((tx - e.pos.x) / T, 0, (tz - e.pos.z) / T);
    const dy = groundY(this.ctx, tx, tz) - e.pos.y;
    e.vel.y = dy / T + 0.5 * GRAVITY * T;
    e.airborne = true;
  }

  _attack(e, dt, p) {
    const def = e.def;
    // XZ FOR THE APPROACH, BUT NOT FOR THE BLOW. Every range test in this file was a plan
    // distance, so a body standing on the dirt could strike a player standing on a
    // destination's raised floor above it, or on a bank, or a storey up — through the floor,
    // with nothing on screen. The horizontal reach is unchanged; a strike now also has to be
    // within a body's own height vertically, which is the difference between a dog biting you
    // and a dog biting the underside of the ground you are standing on.
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const dyAbs = Math.abs((p.pos.y + CFG.player.EYE * 0.45) - (e.pos.y + def.height * 0.5));
    const inReachY = dyAbs <= def.height * 0.9 + 0.55;

    if (e.attackKind === 'lunge') {
      _dir.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z);
      if (_dir.lengthSq() > 1e-6) _dir.normalize();
      const k = def.lungeSpeed * (0.25 + 0.75 * Math.pow(clamp01(e.stateT / def.lungeTime), 2));
      e.vel.x = _dir.x * k; e.vel.z = _dir.z * k;
      if (!e.struck && inReachY && d < def.strikeRange + CFG.player.RADIUS) {
        e.struck = true;
        this._hurtPlayer(e, p, _dir);
      }
      if (e.stateT >= def.lungeTime) { e.state = 'recover'; e.stateT = 0; }
      return;
    }

    if (e.attackKind === 'leap') {
      if (!e.airborne) {
        if (!e.struck && inReachY && d < def.strikeRange + 0.9) {
          e.struck = true;
          _dir.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize();
          this._hurtPlayer(e, p, _dir);
        }
        e.state = 'recover'; e.stateT = 0;
      }
      return;
    }

    if (e.attackKind === 'bolt') {
      e.vel.x = damp(e.vel.x, 0, 12, dt);
      e.vel.z = damp(e.vel.z, 0, 12, dt);
      if (!e.struck && e.stateT >= def.strikeAt) {
        e.struck = true;
        this._fireBolt(e, p);
      }
      if (e.stateT >= def.attack) { e.state = 'recover'; e.stateT = 0; }
      return;
    }

    // 'strike': committed to the FIXED point recorded at the end of the windup.
    // You dodge it by MOVING, which is the only kind of dodge worth having.
    e.vel.x = damp(e.vel.x, 0, 9, dt);
    e.vel.z = damp(e.vel.z, 0, 9, dt);
    if (!e.struck && e.stateT >= def.strikeAt) {
      e.struck = true;
      const dxp = p.pos.x - e.strikeX, dzp = p.pos.z - e.strikeZ;
      // The committed-point strike gets the same vertical reach test as the other two:
      // a pallbearer swinging at the spot you were standing must not connect through a floor.
      const dyC = Math.abs((p.pos.y + CFG.player.EYE * 0.45) - (e.pos.y + def.height * 0.5));
      if (dyC <= def.height * 0.9 + 0.55 && Math.hypot(dxp, dzp) < def.strikeRange + CFG.player.RADIUS) {
        _dir.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z);
        if (_dir.lengthSq() > 1e-6) _dir.normalize(); else _dir.set(0, 0, 1);
        this._hurtPlayer(e, p, _dir);
      } else {
        // A miss must be as loud as a hit or the player never learns the dodge.
        this._emitNoise(e.strikeX, e.strikeZ, 9, 'enemy');
        const fx = this._sys('fx');
        if (fx && fx.impact) {
          _v.set(e.strikeX, groundY(this.ctx, e.strikeX, e.strikeZ) + 0.05, e.strikeZ);
          _v2.set(0, 1, 0);
          fx.impact('dirt', _v, _v2, 1.1);
        }
      }
    }
    if (e.stateT >= def.attack) { e.state = 'recover'; e.stateT = 0; }
  }

  _hurtPlayer(e, p, dir) {
    if (typeof p.hurt === 'function') p.hurt(e.def.dmg, dir);

    // THE RECOVERY BREATH. Measured before this landed: five bites 0.5-1.8 s
    // apart, dead 4.6 s after first contact, with no gap a player could use to
    // do anything about it. So a landed hit costs the FIELD a beat and costs
    // the BODY a disengagement — it rings out to BREAKOFF_MUL x its standoff,
    // refuses the token, and comes back. Bodies with no standoff (the Pale, the
    // Standing Kind) do not break off: backing away is not what either of them
    // is, and their own 1.4-1.6 s recover already paces them.
    this._landedT = 0;
    if (e.def.standoff > 0) e.breakoffT = BREAKOFF_S;

    const fx = this._sys('fx');
    // fx.trauma is a NUMBER (fx.js:52); the setter is addTrauma (fx.js:232).
    // Calling it threw a TypeError inside step() the moment trauma went
    // non-zero, and three throws in a row stop the whole game loop.
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.28);
    // The landing goes out as a NOISE, not as enemy:telegraph. The audio lane
    // asked for that channel to be the FIRST frame of the wind-up only and to
    // be the one sound that is never occluded (its handoff, request 4); a
    // telegraph emitted when the swing lands is a telegraph that lies.
    this._emitNoise(e.pos.x, e.pos.z, 11, 'enemy:strike');
  }

  /* --------------------------------------------------------- the dread two -- */

  /**
   * THE PALE. It creeps at 0.42 m/s ONLY while the torch is off it. Look at it
   * and it does not exist as a moving thing; look away and it is closer.
   * donor: qualiacology/still/src/game/floors.js:381-400 — lifted, with the
   * beam test moved onto lights.torchOn() and collision.segmentClear.
   */
  _stepPale(e, dt, p) {
    const def = e.def;
    e.stateT += dt;

    if (e.state === 'windup' || e.state === 'attack' || e.state === 'recover') {
      this._stepPressure(e, dt, p);
      return;
    }

    // the dry joint tick: 3.2 a second, and it is the ONLY sound it makes
    e.tickT += dt;
    const tickGap = 1 / def.tickHz;
    if (e.tickT >= tickGap) {
      e.tickT -= tickGap;
      e.tick = e.tick > 0 ? -1 : 1;
      // only broadcast a tick anybody could hear: 3.2 events a second per body
      // is a lot of bus traffic for a sound thirty metres out of earshot
      if (!e.litSelf && e.dist < 30) this._emitNoise(e.pos.x, e.pos.z, 3.0, 'enemy');
    }

    if (e.litSelf) {
      // frozen. Not slowed: STOPPED, because "it moves slowly while you watch"
      // is a completely different and much worse feeling.
      e.vel.x = 0; e.vel.z = 0;
      e.moving = false;
      e.speedWant = 0;
    } else {
      const s = steer(this.ctx, e, p.pos.x, p.pos.z, this._frame);
      e.speedWant = def.speed;
      e.vel.x = s.x * def.speed;
      e.vel.z = s.z * def.speed;
      e.moving = true;
    }
    e.yaw = dampAngle(e.yaw, faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z), 4, dt);

    if (e.dist <= def.strikeRange && this._takeToken(e)) {
      e.attackKind = 'strike';
      this._beginWindup(e, 'grab', 0.7);
    }
  }

  /**
   * THE STANDING KIND. It moves only while unobserved — 42 m cone, dot > 0.28,
   * AND an unblocked ray to the head, retested on the perception tick. A leash
   * of 24 m keeps it a fixture of one place rather than a follower.
   * donor: qualiacology/marrow/src/entity.js:355-356, 388-405
   */
  _stepStanding(e, dt, p) {
    const def = e.def;
    e.stateT += dt;

    if (e.state === 'windup' || e.state === 'attack' || e.state === 'recover') {
      this._stepPressure(e, dt, p);
      return;
    }

    // observedTime: +1x while watched, -2x while not. Attention, not a timer.
    if (e.obsSelf) e.observedT = (e.observedT || 0) + dt;
    else e.observedT = Math.max(0, (e.observedT || 0) - dt * 2);

    const leashed = Math.hypot(e.pos.x - e.homeX, e.pos.z - e.homeZ) > def.leash;
    if (e.obsSelf || leashed) {
      // absolutely still. Not damped to a stop: STILL, on the frame the look
      // lands, because the whole rule has to be learnable in one encounter.
      e.vel.x = 0; e.vel.z = 0;
      e.moving = false;
      e.speedWant = 0;
    } else {
      const s = steer(this.ctx, e, p.pos.x, p.pos.z, this._frame);
      e.speedWant = def.speed;
      e.vel.x = s.x * def.speed;
      e.vel.z = s.z * def.speed;
      e.moving = true;
      e.yaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    }

    if (e.dist <= def.strikeRange && !e.obsSelf && this._takeToken(e)) {
      e.attackKind = 'strike';
      this._beginWindup(e, 'reach', 0.8);
    }
  }

  /* ------------------------------------------------------------ integrate -- */

  /**
   * THE PLAYER IS SOLID.
   *
   * Measured 2026-09-02, `whatkilledme.mjs --play 75`: the attacker's distance
   * was 0.0 m on three of thirteen hits and 0.6-2.2 m on the rest. The hound
   * was standing INSIDE the player capsule — it walked through him, came out
   * the other side, and bit from behind. In his words: "some enemies... seem to
   * run into me and then disappear. maybe some of those are beneath the
   * ground?" Nothing was beneath the ground (zero samples in 75 s) and nothing
   * despawned near him (zero). This was the whole of it.
   *
   * Resolved the way collision.resolveCapsule resolves everything else: push
   * out along the contact normal to exactly the touching distance, and remove
   * only the INWARD component of the velocity, so a body sliding past keeps its
   * tangential speed and a body pressing in stops dead instead of shuddering.
   * A creature you can be inside cannot be aimed at, cannot be backed away
   * from, and reads as a rendering fault rather than an animal.
   *
   * Every strike in the roster still reaches from contact: hound 0.84 m against
   * a 1.90 m bite, hunter 0.90 against 2.40, pallbearer 0.94 against a 0.96 m
   * committed point, the Pale 0.66 against a 0.85 m grab. Nothing is nerfed;
   * the animal simply stops at your chest instead of in it.
   */
  _pushOffPlayer(e) {
    const p = this._sys('player');
    if (!p || !p.pos) return;
    const minD = e.def.radius + CFG.player.RADIUS + CONTACT_PAD;
    let dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
    let d = Math.sqrt(dx * dx + dz * dz);
    if (d >= minD) return;
    if (d < 1e-4) {
      // exactly coincident: push it back out the way it is facing, which is
      // the only direction that is not arbitrary
      dx = -Math.sin(e.yaw); dz = -Math.cos(e.yaw); d = 1;
    }
    const nx = dx / d, nz = dz / d;
    e.pos.x = p.pos.x + nx * minD;
    e.pos.z = p.pos.z + nz * minD;
    const into = e.vel.x * nx + e.vel.z * nz;
    if (into < 0) { e.vel.x -= nx * into; e.vel.z -= nz * into; }
  }

  _integrate(e, dt) {
    const def = e.def;
    if (e.airborne) {
      e.vel.y -= GRAVITY * dt;
      const ax = e.pos.x, az = e.pos.z;
      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;
      e.pos.z += e.vel.z * dt;
      // A LEAP OBEYS WALLS. This branch used to integrate raw — the grounded path below has
      // had an occupancy test since it was written, and the airborne one had nothing — so a
      // hound that committed to a leap flew through the filling station and bit the player
      // on the other side of it. Reported from play: "they come through the building at you
      // anyway." Same cheap test the grounded path uses: if the landing spot is inside
      // something, stop at the wall and drop out of the leap rather than passing through it.
      const colA = this._sys('collision');
      if (colA && typeof colA.canOccupy === 'function'
        && !colA.canOccupy(e.pos.x, e.pos.z, def.radius, Math.min(def.height, 1.9))) {
        e.pos.x = ax; e.pos.z = az;
        e.vel.x = 0; e.vel.z = 0;
        if (e.vel.y > 0) e.vel.y = 0;                 // it hit a wall, it does not climb it
      }
      // a leap lands ON you, never THROUGH you
      this._pushOffPlayer(e);
      const g = groundY(this.ctx, e.pos.x, e.pos.z);
      if (e.pos.y <= g && e.vel.y <= 0) {
        e.pos.y = g; e.airborne = false; e.vel.y = 0;
        this._emitNoise(e.pos.x, e.pos.z, 7, 'enemy');
      }
      return;
    }

    e.pos.x += e.vel.x * dt;
    e.pos.z += e.vel.z * dt;

    // Slide out of anything we are inside. collision owns the mover for the
    // player; for a body this is the cheap version — one occupancy test and a
    // step back along the contact — because a full capsule sweep per enemy per
    // frame is a cost this frame budget has not measured.
    const col = this._sys('collision');
    if (col && typeof col.canOccupy === 'function'
      && !col.canOccupy(e.pos.x, e.pos.z, def.radius, Math.min(def.height, 1.9))) {
      const bx = e.pos.x - e.vel.x * dt, bz = e.pos.z - e.vel.z * dt;
      if (col.canOccupy(bx, e.pos.z, def.radius, Math.min(def.height, 1.9))) {
        e.pos.x = bx; e.vel.x = 0;                      // slide along Z
      } else if (col.canOccupy(e.pos.x, bz, def.radius, Math.min(def.height, 1.9))) {
        e.pos.z = bz; e.vel.z = 0;                      // slide along X
      } else {
        e.pos.x = bx; e.pos.z = bz; e.vel.x = 0; e.vel.z = 0;
      }
    }

    // LAST, after the trunk slide, or the step-back above would put a body the
    // trees rejected straight back inside the player's chest.
    this._pushOffPlayer(e);

    followGround(this.ctx, e, dt);
    e.gait += Math.hypot(e.vel.x, e.vel.z) * dt * (def.form === 'quadruped' ? 2.6 : 1.7);
  }

  /* ---------------------------------------------------------------- death -- */

  /**
   * @param zone  where the killing blow landed. REQUIRED in spirit: the kill
   *              event carries it and progression doubles XP for 'head'.
   *              Defaults to whatever the body last recorded, and to 'torso'
   *              for a body that was never hurt at all (a scripted despawn),
   *              which is the honest answer rather than the lucky one.
   */
  _kill(e, dmg, zone, melee) {
    e.alive = false;
    e.dead = true;
    e.alerted = false;
    e.hunt = false; e.huntSpeedMul = 1;
    e.state = 'corpse';
    e.deathT = 0;
    this._uncommit(e);
    this._releaseSlot(e);
    // the corpse leaves ALONG the shot, not into it: _dir points from the
    // impact point out through the body, which is the way a round pushes.
    const J = clamp(dmg * 0.70, 8, 320);
    const kick = Math.min(J * 0.055 / (e.def.mass / 60), 6);
    e.vel.set(_dir.x * kick, 1.2, _dir.z * kick);
    e.airborne = true;
    e.moving = false;
    e.deathSpin = (this.rng.next() - 0.5) * 6;
    this._killed++;
    this._lastContact = this._t;

    // a permanent kill is never free: the pop is LOUD, and it wakes the field.
    if (e.def.deathNoise > 0) {
      this._emitNoise(e.pos.x, e.pos.z, e.def.deathNoise, 'enemy');
      this.hear(e.pos.x, e.pos.z, e.def.deathNoise, 'death');
    }

    // EVERY field, EVERY emit. See evtReset() for why this is not optional.
    evtReset(e, (melee || e.lastMelee) ? 'melee' : 'kill');
    _evt.xp = e.def.xp;
    _evt.dmg = dmg;
    _evt.zone = zone || e.lastZone || 'torso';
    _evt.y = e.pos.y + e.def.height * 0.5;
    this.ctx.bus.emit('enemy:killed', _evt);
  }

  _stepCorpse(e, dt) {
    e.deathT += dt;
    if (e.airborne || e.pos.y > groundY(this.ctx, e.pos.x, e.pos.z) + 0.05) {
      e.vel.y -= GRAVITY * dt;
      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;
      e.pos.z += e.vel.z * dt;
      const g = groundY(this.ctx, e.pos.x, e.pos.z);
      if (e.pos.y <= g) {
        e.pos.y = g; e.airborne = false;
        e.vel.multiplyScalar(0.3);
      }
    }
    // the 2.6 s decay. THIS is what makes dead read against alive at 40 m.
    const glow = Math.max(0, 1 - e.deathT / DEATH_GLOW_S);
    e.built.deathGlow(glow * glow);
    if (e.deathT > CORPSE_S) {
      e.pos.y -= dt * 0.33;                     // sink, never pop
      if (e.deathT > CORPSE_S + CORPSE_SINK_S) this._release(e);
    }
  }

  _release(e) {
    e.alive = false;
    e.dead = true;
    e.alerted = false;
    e.state = 'dead';
    e.built.group.visible = false;
    this._releaseSlot(e);
  }

  /* ------------------------------------------------- the front-commit law -- */

  /**
   * MAY THIS BODY COMMIT FROM WHERE IT IS STANDING?
   *
   * Eleven of the thirteen hits in Alex's first playtest came from behind him,
   * each with a perfectly legal 320 ms visual windup that happened off screen.
   * A tell the player cannot receive is not a tell, so a crowd body has to
   * enter his forward hemisphere before it is allowed to strike. Until it does,
   * _approach walks it round.
   *
   * Three exemptions, and each of them is a design the game already has:
   *   - the two DREAD species. The Pale and the Standing Kind exist to be
   *     behind you; forcing them round would delete both of them.
   *   - the Hunter off its leash in the black hour (`leashed === false`,
   *     director.js:807). That is the one authored ambush in the game.
   *   - a body BOXED IN: FRONT_PATIENCE seconds of wanting to attack and never
   *     reaching the front, because the trees or the rest of the pack will not
   *     let it. It comes in from where it is rather than orbiting for ever.
   *
   * All three pay for it: _beginWindup sees `frontDot` under FRONT_DOT and
   * nearly doubles the windup, and the telegraph goes out with `rear: true` so
   * the audio lane can put a positioned cue where the eyes cannot go.
   *
   * @param wants  is it actually trying to attack right now? Patience only
   *               accrues while it is, or a body walking past on its way
   *               somewhere else would earn an ambush it never wanted.
   */
  _frontGate(e, dt, wants) {
    if (e.def.owner === OWNER.DREAD || e.leashed === false) return true;
    if (e.frontDot >= FRONT_DOT) { e.frontDeniedT = 0; return true; }
    if (wants) e.frontDeniedT += dt;
    return e.frontDeniedT >= FRONT_PATIENCE;
  }

  /**
   * Enter the windup. ONE place, so the telegraph law cannot be satisfied four
   * different ways: the rim flare starts, the length of the tell is decided
   * from where the body is standing relative to the player's eye, and the event
   * goes out on frame 1 carrying that decision.
   */
  _beginWindup(e, kind, yOff) {
    const def = e.def;
    e.state = 'windup'; e.stateT = 0;
    e.rearStrike = e.frontDot < FRONT_DOT;
    e.telegraphS = def.telegraph * (e.rearStrike ? REAR_TELEGRAPH_MUL : 1);
    if (e.rearStrike) this._rearStrikes++;
    e.built.telegraph(0.001);
    evtReset(e, kind);                       // reads e.rearStrike into _evt.rear
    _evt.y = e.pos.y + def.height * yOff;
    this.ctx.bus.emit('enemy:telegraph', _evt);
  }

  /* ----------------------------------------------------------- the tokens -- */

  _takeToken(e) {
    if (e.committed) return true;
    // THE CAR IS A SANCTUARY WITH EXACTLY ONE BREAKER (DESIGN decision 14).
    // Shut doors keep hounds and the Pale out — the car lane publishes
    // ctx.shared.inCar and says reading it is mine, not its to enforce.
    if (INCAR_BLOCKED[e.species] && this.ctx.shared && this.ctx.shared.inCar) return false;
    if (this._commit >= MAX_ATTACKERS) return false;
    if (this._breathT < ATTACK_BREATH) return false;   // the recovery breath
    // AND THE WHOLE FIELD BREATHES AFTER ONE LANDS. Two tokens interleaving at
    // the old 0.42 s breath is what put five bites 0.5-1.8 s apart and killed
    // him in 4.6 s from first contact. This is the beat that turns a metronome
    // into something working on you.
    if (this._landedT < FIELD_RECOVERY) return false;
    // the body that just bit him is circling out and is not allowed back in yet
    if (e.breakoffT > 0 || e.recommitT > 0) return false;
    e.committed = true;
    this._commit++;
    this._breathT = 0;
    return true;
  }

  _uncommit(e) {
    if (!e.committed) return;
    e.committed = false;
    this._commit = Math.max(0, this._commit - 1);
  }

  /* ------------------------------------------------------------ ring slots -- */

  _claimSlot(e) {
    if (e.def.owner === OWNER.DREAD) { e.slot = -1; return; }
    const p = this._sys('player');
    const want = p ? Math.atan2(e.pos.z - p.pos.z, e.pos.x - p.pos.x) : 0;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < RING_SLOTS; i++) {
      if (this._slots[i] !== -1) continue;
      const a = this._ringPhase + i * (TAU / RING_SLOTS);
      let d = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want)));
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) best = e.id % RING_SLOTS;           // full ring: double up rather than refuse
    else this._slots[best] = e.id;
    e.slot = best;
  }

  _releaseSlot(e) {
    if (e.slot >= 0 && this._slots[e.slot] === e.id) this._slots[e.slot] = -1;
    e.slot = -1;
  }

  _wake(e) {
    if (e.state !== 'dormant') return;
    e.state = 'rise';
    e.riseT = e.def.riseTime || 1.4;
    e.riseDur = e.riseT;
    e.riseSquash = 0.34;
    e.prevSquash = e.currSquash = 0.34;
    e.built.group.visible = true;
    e.aware = 1;
    e.memT = 12;
    this._emitNoise(e.pos.x, e.pos.z, 16, 'enemy');
    evtReset(e, 'rise');
    this.ctx.bus.emit('enemy:telegraph', _evt);
  }

  /* ---------------------------------------------------------------- bolts -- */

  _fireBolt(e, p) {
    const def = e.def;
    const b = this.boltState[this._boltCursor];
    this._boltCursor = (this._boltCursor + 1) % BOLT_POOL;
    const mz = e.built.muzzle;
    const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
    const S = e.scale;
    const ox = mz ? e.pos.x + mz.x * S * cy + mz.z * S * sy : e.pos.x;
    const oy = e.pos.y + (mz ? mz.y * S : def.height * 0.8);
    const oz = mz ? e.pos.z - mz.x * S * sy + mz.z * S * cy : e.pos.z;

    // accuracy x (1 + lit * 1.40). Your torch is a trade, and this is the line
    // that charges you for it. It is a SPREAD, never a hit-chance roll: the
    // round exists in the world and you can be somewhere else.
    const acc = clamp01(def.accuracy * (1 + (e.playerLit || 0) * def.litGain));
    const spread = def.spreadDeg * (1 - acc) * Math.PI / 180;
    const ty = p.eyeY !== undefined ? p.eyeY - 0.25 : p.pos.y + 1.4;
    _dir.set(p.pos.x - ox, ty - oy, p.pos.z - oz);
    const dist = Math.max(0.5, _dir.length());
    _dir.divideScalar(dist);
    // lead: half the player's velocity over the flight, so strafing is a dodge
    // you keep performing rather than a stalemate
    if (p.vel) {
      const T = dist / def.boltSpeed;
      _dir.x += p.vel.x * T * 0.5 / dist;
      _dir.z += p.vel.z * T * 0.5 / dist;
      _dir.normalize();
    }
    const a1 = (this.aimRng.next() * 2 - 1) * spread;
    const a2 = (this.aimRng.next() * 2 - 1) * spread;
    _dir.x += a1; _dir.y += a2 * 0.6; _dir.z += a2;
    _dir.normalize();

    b.live = true; b.age = 0; b.dmg = def.dmg;
    b.pos.set(ox, oy, oz);
    b.prev.copy(b.pos);
    b.vel.copy(_dir).multiplyScalar(def.boltSpeed);

    this._emitNoise(ox, oz, def.fireLoud, 'enemy');
    const lights = this._sys('lights');
    if (lights && typeof lights.borrow === 'function') {
      // the muzzle flash is a BORROWED rover with a ttl. The census never moves.
      lights.borrow('poacher-muzzle', ox, oy, oz, 0xffc27a, 26, 0.05);
    }
  }

  _stepBolts(dt, p) {
    if (!this.bolts) return;
    let dirty = false;
    const col = this._sys('collision');
    const fx = this._sys('fx');
    for (let i = 0; i < BOLT_POOL; i++) {
      const b = this.boltState[i];
      if (!b.live) continue;
      b.age += dt;
      b.prev.copy(b.pos);
      b.vel.y -= 3.2 * dt;                    // a little drop, so the arc is visible
      b.pos.addScaledVector(b.vel, dt);

      let done = false;
      const g = groundY(this.ctx, b.pos.x, b.pos.z);
      if (b.pos.y <= g + 0.05) { b.pos.y = g + 0.05; done = true; }
      if (!done && col && typeof col.raycast === 'function') {
        _v.copy(b.prev);
        _dir.copy(b.pos).sub(b.prev);
        const len = _dir.length();
        if (len > 1e-5) {
          _dir.divideScalar(len);
          const h = col.raycast(_v, _dir, len, col.MASK ? col.MASK.SHOT : 2);
          if (h && h.hit !== false) { b.pos.copy(h.point); done = true; }
        }
      }
      const dxp = p.pos.x - b.pos.x;
      const dyp = (p.eyeY !== undefined ? p.eyeY - 0.6 : p.pos.y + 1.0) - b.pos.y;
      const dzp = p.pos.z - b.pos.z;
      const rr = CFG.player.RADIUS + 0.22;
      const hitPlayer = (dxp * dxp + dzp * dzp) < rr * rr && Math.abs(dyp) < 0.95;
      if (hitPlayer) done = true;
      if (b.age > SPECIES.poacher.boltLife) done = true;

      if (done) {
        b.live = false;
        if (hitPlayer && typeof p.hurt === 'function') {
          _dir.set(-dxp, 0, -dzp);
          if (_dir.lengthSq() > 1e-6) _dir.normalize(); else _dir.set(0, 0, 1);
          p.hurt(b.dmg, _dir);
          if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.22);
        } else if (fx && fx.impact) {
          _v2.set(0, 1, 0);
          fx.impact(hitPlayer ? 'flesh' : 'dirt', b.pos, _v2, 1.0);
        }
        _m4.makeScale(0, 0, 0);
        this.bolts.setMatrixAt(i, _m4);
        dirty = true;
      }
    }
    if (dirty) this.bolts.instanceMatrix.needsUpdate = true;
  }

  /* --------------------------------------------------------------- spawns -- */

  /**
   * True while this system is spawning for itself.
   *
   * The handover to director/director.js is still complete and immediate: the
   * moment a director exists, this goes false and every spawn and every HUNT
   * flag is its to set. What is NEW is that the handover is now SAFE.
   *
   * The audit found a director jam that emptied the county — no orders, no
   * bodies, and a horror game with nothing in it, indefinitely, because this
   * lane had handed over and had no way to notice nobody caught. So the
   * handover has a dead-man's handle: DIRECTOR_JAM_S (25 s) with no order of
   * any kind AND zero live bodies means the sibling is not answering, and the
   * trickle resumes until it asks for something again (any of spawn / wake /
   * wakeAll / setHunt / setLeash / setHoldFire re-stamps `_lastAsk` and
   * therefore clears the jam on the next step).
   *
   * BOTH halves are required, deliberately. A silent director over a populated
   * field is a director pacing a lull, which is its whole job, and resuming
   * over the top of that would be a worse bug than the one this guards.
   * The game must never be able to go permanently empty, whatever a sibling does.
   */
  get autonomous() { return this._jam || !this._sys('director'); }

  /** Is the director being overridden right now? telemetry() publishes it. */
  get directorJammed() { return this._jam && !!this._sys('director'); }

  _target() {
    const phase = this._phase();
    const t = CFG.director.targets;
    // NOTE: `t.deepNight` is a key in CFG.director.targets, which the engine
    // owns and this lane may not rename. It is a CONFIG key, not a phase word:
    // the phase vocabulary is the four words in PHASE and nothing else.
    const band = phase === PHASE.DUSK ? t.dusk
      : (phase === PHASE.BLACK ? t.storm : t.deepNight);
    const shared = this.ctx.shared;
    const danger = shared && typeof shared.danger === 'number' ? clamp(shared.danger, 0, 2) : 1;
    return band[0] * danger;
  }

  /**
   * "No pressure spawn during a dread build." Asked in the order the director's
   * own addendum G settled on, and for the same reason: `dread.permitOk()`
   * answers "may a dread BEAT happen", and consuming it as "may a BODY arrive"
   * stops the county spawning the moment a fight starts.
   */
  _dreadPermit() {
    const d = this._sys('dread');
    if (!d) return true;
    if (typeof d.pressureOk === 'function') { try { return !!d.pressureOk(); } catch (e) { return true; } }
    if (typeof d.building === 'boolean') return !d.building;
    return true;
  }

  _trickle(dt, p) {
    if (!this.autonomous) return;
    if (this._t - this._lastTrickle < TRICKLE_GAP) return;
    this._lastTrickle = this._t;
    // spawn() stamps _lastAsk, and the dead-man's handle must measure the
    // DIRECTOR's silence, not this system talking to itself. Snapshot it and
    // put it back on the way out.
    const ask = this._lastAsk;
    try {
      this._trickleBody(p);
    } finally {
      this._lastAsk = ask;
    }
  }

  _trickleBody(p) {
    if (!this._dreadPermit()) return;

    // headcount inside 70 m, hounds counting half (DESIGN §4)
    let near = 0, alive = 0;
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive || e.def.owner !== OWNER.PRESSURE) continue;
      alive += 1;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < TRICKLE_RING) near += e.def.countsAs;
    }
    if (alive >= CAP_ALIVE) return;

    const target = this._target();
    // Pity: 90 s of night with no contact forces one anyway.
    const pity = (this._t - this._lastContact) > 90;
    if (near >= target && !pity) return;

    const phase = this._phase();
    // Weighted toward the crowd, because the crowd IS the crowd: an even draw
    // over four species produced a field of five poachers and no hounds in the
    // node harness, which is the wrong game.
    let key = null;
    for (let tries = 0; tries < 8 && !key; tries++) {
      const r = this.placeRng.next();
      const c = r < 0.52 ? 'hound' : r < 0.76 ? 'pallbearer' : r < 0.94 ? 'poacher' : 'hunter';
      const def = SPECIES[c];
      if (def.phases.indexOf(phase) < 0) continue;
      if (c === 'hunter' && this._countOf('hunter') >= 1) continue;
      key = c;
    }
    if (!key) key = 'hound';

    _spawnScratch.def = SPECIES[key];
    if (!relocate(this.ctx, _spawnScratch, this.placeRng, _pt)) { this._refused++; return; }

    const def = SPECIES[key];
    const pack = def.packMin
      ? def.packMin + ((this.placeRng.next() * (1 + def.packMax - def.packMin)) | 0)
      : 1;
    for (let k = 0; k < pack; k++) {
      const a = this.placeRng.next() * TAU;
      const r = k === 0 ? 0 : 1.6 + this.placeRng.next() * 2.4;
      this.spawn(key, _pt.x + Math.cos(a) * r, _pt.z + Math.sin(a) * r,
        { awake: def.dormant ? false : true });
    }

    // and one dread body, on its own clock, outside the pressure cap
    if (this.placeRng.next() < 0.22) {
      const dk = DREAD_ROSTER[(this.placeRng.next() * DREAD_ROSTER.length) | 0];
      if (this._countOf(dk) < 2) {
        _spawnScratch.def = SPECIES[dk];
        if (relocate(this.ctx, _spawnScratch, this.placeRng, _pt)) {
          this.spawn(dk, _pt.x, _pt.z, { awake: true });
        }
      }
    }
  }

  _countOf(key) {
    let n = 0;
    for (let i = 0; i < this.all.length; i++) {
      if (this.all[i].alive && this.all[i].species === key) n++;
    }
    return n;
  }

  /* =====================================================================
     PRESENT — interpolated presentation ONLY. Nothing here simulates, and
     ctx.time.alpha is genuinely consumed: ignoring it is the CINDERBLOOM
     teleport, which every other project on this machine has.
     ===================================================================== */

  present(alpha) {
    if (!this._built) return;
    const cam = this.ctx.camera;
    if (!cam) return;
    const camX = cam.position.x, camY = cam.position.y, camZ = cam.position.z;

    // the warm-up parked one of every species in the world to compile its
    // shader at boot; this is where that is undone, on the first presented
    // frame, so nothing is left hanging at y = -80.
    if (this._warmed) { this._unwarm(); this._warmed = false; }

    const imps = this.impostorList;
    for (let i = 0; i < imps.length; i++) imps[i].n = 0;

    const near = LOD_NEAR * (1 - LOD_HYST);
    const far = LOD_NEAR * (1 + LOD_HYST);

    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive && e.state !== 'corpse') { e.built.group.visible = false; continue; }
      if (e.state === 'dormant') { e.built.group.visible = false; continue; }

      const x = e.prevPos.x + (e.currPos.x - e.prevPos.x) * alpha;
      const y = e.prevPos.y + (e.currPos.y - e.prevPos.y) * alpha;
      const z = e.prevPos.z + (e.currPos.z - e.prevPos.z) * alpha;
      let dyaw = e.currYaw - e.prevYaw;
      while (dyaw > Math.PI) dyaw -= TAU;
      while (dyaw < -Math.PI) dyaw += TAU;
      const yaw = e.prevYaw + dyaw * alpha;
      const gait = e.prevGait + (e.currGait - e.prevGait) * alpha;
      const squash = e.prevSquash + (e.currSquash - e.prevSquash) * alpha;
      // A live body that is neither dormant nor rising can never be squashed: if some future
      // state forgets to finish the unfold, this is the line that keeps it out of the ground
      // rather than another playtest. tests/enemies.mjs asserts it from the drawn pose.
      if (e.alive && e.state !== 'rise' && e.state !== 'dormant' && e.riseSquash < 1) {
        e.riseSquash = 1; e.prevSquash = 1; e.currSquash = 1;
      }

      const ddx = x - camX, ddy = (y + e.def.height * 0.5) - camY, ddz = z - camZ;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);

      // LOD with hysteresis: a body on the line must not flicker between a rig
      // and a card while you walk past it.
      if (e.lodFar && dist < near) e.lodFar = false;
      else if (!e.lodFar && dist > far) e.lodFar = true;

      if (e.lodFar) {
        e.built.group.visible = false;
        const rec = this.impostors.get(e.species);
        if (rec && rec.n < rec.mesh.instanceMatrix.count) {
          const h = e.def.height * e.scale * squash;
          const w = h * rec.mesh.userData.aspect;
          // camera-facing card, upright: yaw only, so it never lies down
          _q.setFromAxisAngle(_UP, Math.atan2(camX - x, camZ - z));
          _v.set(x, y, z);
          _sc.set(w, h, 1);
          _m4.compose(_v, _q, _sc);
          rec.mesh.setMatrixAt(rec.n++, _m4);
        }
        continue;
      }

      const g = e.built.group;
      g.visible = true;
      // + the foot plane, scaled the way the body is: a squashed body's feet are nearer its
      // origin in the same proportion, so the lift has to squash with it or the rise animation
      // pops the body up out of the ground at the end instead of finishing flush.
      g.position.set(x, y + (this.footLift.get(e.species) || 0) * e.scale * squash, z);
      g.rotation.y = yaw;
      const S = e.scale;
      g.scale.set(S, S * squash, S);

      // a rising body is BELOW the ground and dragging itself out, not riding
      // an elevator up through it (fetch enemies.js:1993-1998)
      if (squash < 0.999) {
        const remaining = 1 - (squash - 0.34) / 0.66;
        g.position.y -= remaining * remaining * e.def.height * 0.62;
        g.position.x += Math.sin(gait * 31 + e.id) * 0.055 * remaining;
        g.position.z += Math.cos(gait * 24 + e.id) * 0.045 * remaining;
      }

      // stagger and flinch read on the body, at render time only
      if (e.staggerT > 0) {
        g.position.y -= 0.26 * Math.sin(Math.PI * clamp01(1 - e.staggerT / STAGGER_T));
        g.rotation.z = Math.sin(e.staggerT * 34) * 0.08;
      } else if (e.state === 'corpse') {
        const fall = clamp01(e.deathT / 0.55);
        g.rotation.z = fall * (Math.PI / 2) * (e.deathSpin > 0 ? 1 : -1) * 0.92;
        g.rotation.y = yaw + e.deathSpin * Math.min(e.deathT, 0.5);
        g.position.y += 0.2 * (1 - fall);
      } else {
        g.rotation.z = 0;
      }
      if (e.flinchT < 0.35) {
        const f = e.flinchT < 0.09 ? e.flinchT / 0.09 : 1 - (e.flinchT - 0.09) / 0.26;
        g.position.x += e.flinch.x * f;
        g.position.z += e.flinch.z * f;
      }

      // THE REVEAL BUDGET. Held back inside 6 m unless committed to a strike.
      const committedNow = e.state === 'attack' || (e.state === 'windup' && e.telegraphCharge > 0.45);
      const t = clamp01((dist - REVEAL.NEAR) / (REVEAL.FAR - REVEAL.NEAR));
      const want = committedNow ? 1 : REVEAL.FLOOR + (1 - REVEAL.FLOOR) * t;
      if (Math.abs(want - e.reveal) > 0.004) {
        e.reveal += (want - e.reveal) * 0.22;
        e.built.reveal(e.reveal);
      }

      const anim = e.anim;
      anim.gait = gait;
      anim.moveAmp = e.moving ? clamp01(Math.hypot(e.vel.x, e.vel.z) / Math.max(0.4, e.def.speed)) : 0;
      anim.coil = e.state === 'windup' ? (e.telegraphCharge || 0) : 0;
      anim.swing = e.state === 'attack' && e.attackKind === 'strike'
        ? clamp01(e.stateT / Math.max(0.001, e.def.attack)) : 0;
      anim.bank = clamp(dyaw * -3.2, -0.5, 0.5);
      anim.aim = e.aim || 0;
      anim.tick = e.tick || 0;
      e.built.animate(anim);
    }

    for (let i = 0; i < imps.length; i++) {
      const rec = imps[i];
      rec.mesh.count = rec.n;
      rec.mesh.visible = rec.n > 0;
      if (rec.n > 0) rec.mesh.instanceMatrix.needsUpdate = true;
    }

    // bolts, interpolated the same way
    if (this.bolts) {
      let dirty = false;
      for (let i = 0; i < BOLT_POOL; i++) {
        const b = this.boltState[i];
        if (!b.live) continue;
        _v.lerpVectors(b.prev, b.pos, alpha);
        _q.identity();
        _sc.set(1, 1, 1);
        _m4.compose(_v, _q, _sc);
        this.bolts.setMatrixAt(i, _m4);
        dirty = true;
      }
      if (dirty) this.bolts.instanceMatrix.needsUpdate = true;
    }
  }

  /* =====================================================================
     TEST SURFACE — everything a gate needs, and nothing it has to reason
     about. "Measure, do not reason" is the project's first law.
     ===================================================================== */

  telemetry() {
    let alive = 0, dormant = 0, corpses = 0, far = 0, committed = 0, draws = 0;
    let breaking = 0;
    const byKind = {};
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.state === 'dormant') dormant++;
      if (e.state === 'corpse') corpses++;
      if (e.built.group.visible) draws += e.built.drawCount;
      if (!e.alive) continue;
      alive++;
      if (e.lodFar) far++;
      if (e.committed) committed++;
      if (e.breakoffT > 0) breaking++;
      byKind[e.species] = (byKind[e.species] || 0) + 1;
    }
    for (let i = 0; i < this.impostorList.length; i++) {
      if (this.impostorList[i].n > 0) draws++;
    }
    return {
      pool: this.all.length,
      alive, dormant, corpses, impostors: far, committed, draws,
      pressure: this.pressureCount,
      spawned: this._spawned, killed: this._killed,
      refused: this._refused, cancelled: this._cancelled,
      maxAttackers: MAX_ATTACKERS,
      // The playtest numbers, so the next round can measure the same things
      // whatkilledme.mjs measures without re-deriving them from the bus.
      // rearStrikes  windups that fired outside the player's cone at all. Every
      //              one of these ran REAR_TELEGRAPH_MUL long and shipped
      //              `rear: true` for the audio lane.
      // breakingOff  bodies currently spending their post-bite disengagement.
      // sinceHitS    seconds since anything landed on the player: the field's
      //              own recovery breath, in the open.
      rearStrikes: this._rearStrikes,
      breakingOff: breaking,
      sinceHitS: +this._landedT.toFixed(2),
      autonomous: this.autonomous,
      directorJammed: this.directorJammed,
      sinceAskS: this._t - this._lastAsk,
      byKind,
      // Pressure bodies that currently know about you. It is Cold Barrel's
      // whole condition, and it is the number a gate needs to prove that a
      // crouched approach is genuinely quieter than a walking one rather than
      // merely feeling like it.
      awarePressure: this._awareNow,
    };
  }

  reset() {
    for (let i = 0; i < this.all.length; i++) this._release(this.all[i]);
    for (let i = 0; i < BOLT_POOL; i++) this.boltState[i].live = false;
    this._slots.fill(-1);
    this._commit = 0;
    // the field's breath is per-encounter state, not per-session
    this._breathT = 99; this._landedT = 99;
  }

  /**
   * Reveal one of every species for the boot shader warm. main.js:424 calls
   * this on every system inside warm(), just before renderer.compileAsync.
   *
   * The undo used to live in a second exported method, cooldownWarmup(), that
   * NOTHING called — so every rig parked here stayed parked and, worse, the
   * pairing read as if it were being done. Dead warm-up code is how a shader
   * compiles on the first kill instead of at boot. It is folded in now: warmup()
   * raises the flag, and the first present() after it puts everything back
   * (_unwarm, below). One method, one owner, no way to call half of it.
   */
  warmup() {
    for (const key of ROSTER) {
      for (let i = 0; i < this.all.length; i++) {
        const e = this.all[i];
        if (e.species !== key) continue;
        const b = e.built;
        b.group.visible = true;
        b.group.position.set(0, -80, 0);
        // and every uniform path the shell shader has, so the first telegraph,
        // the first hit flash and the first corpse are not the frame that
        // links a variant.
        b.reveal(1); b.telegraph(1); b.deathGlow(1);
        b.reveal(REVEAL.FLOOR); b.telegraph(0);
        break;
      }
    }
    for (let i = 0; i < this.impostorList.length; i++) {
      const rec = this.impostorList[i];
      rec.mesh.visible = true;
      rec.mesh.count = 1;
      _m4.compose(_v.set(0, -80, 0), _q.identity(), _sc.set(1, 1, 1));
      rec.mesh.setMatrixAt(0, _m4);
      rec.mesh.instanceMatrix.needsUpdate = true;
    }
    this._warmed = true;
  }

  /** The other half of warmup(), called from present() and from nowhere else. */
  _unwarm() {
    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (!e.alive && e.state !== 'corpse') e.built.group.visible = false;
    }
    for (let i = 0; i < this.impostorList.length; i++) {
      const rec = this.impostorList[i];
      rec.mesh.visible = false;
      rec.mesh.count = 0;
      rec.n = 0;
    }
  }
}

/* ==========================================================================
   The record. Every field it will ever hold is created HERE, at boot: a shape
   that grows fields at runtime is a shape V8 re-optimises mid-fight.
   ========================================================================== */

function makeRecord(id, species, def, built, rng) {
  return {
    id, species, def, built,
    // `owner`, `dead` and `alerted` are here because the director reads them by
    // name (director.js:411-415) and its fallback treats an unlabelled species
    // as dread-owned — which would make a hound invisible to the headcount, the
    // alive cap and HUNT. `audioId` is stamped by the audio lane on first sight
    // and must never be overwritten, so it is declared once, at boot, with
    // every other field: a record that grows a property mid-fight is a shape
    // V8 re-optimises mid-fight.
    owner: def.owner, dead: true, alerted: false, audioId: 0,
    hunt: false, huntSpeedMul: 1, leashed: true, holdFire: false,
    alive: false, state: 'dead',
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
    prevPos: new THREE.Vector3(), currPos: new THREE.Vector3(),
    prevYaw: 0, currYaw: 0,
    prevGait: 0, currGait: 0, gait: 0,
    prevSquash: 1, currSquash: 1, riseSquash: 1, riseT: 0, riseDur: 1,
    hp: 0, scale: built.scale,
    stateT: 0, burstT: 0, moving: false, speedWant: 0,
    attackKind: 'strike', committed: false, struck: false,
    strikeX: 0, strikeZ: 0,
    // The playtest fields, declared HERE with everything else — a record that
    // grows a property mid-fight is a shape V8 re-optimises mid-fight.
    // frontDot   the camera-forward bearing to this body, refreshed on the
    //            perception tick. It is the number the front-commit law reads.
    // frontDeniedT  seconds it has WANTED to commit and been behind you.
    // rearStrike whether the windup it is in fired outside your cone.
    // telegraphS the windup this particular commit is actually running, which
    //            is def.telegraph, or REAR_TELEGRAPH_MUL x it from behind.
    // breakoffT  it just bit you: circle out and refuse the token this long.
    // recommitT  a shorter refusal after a miss or a cancel.
    // seenT      how long it has been continuously inside your attention.
    frontDot: 1, frontDeniedT: 0, rearStrike: false, telegraphS: 0,
    breakoffT: 0, recommitT: 0, seenT: 0,
    airborne: false, leapCd: 0,
    telegraphCharge: 0,
    staggerT: 0, immuneT: 0, windowDmg: 0, windowT: 0,
    flinchT: 99, flinch: new THREE.Vector3(),
    flashT: 99,
    deathT: 0, deathSpin: 0,
    slot: -1,
    // Where this body was last hurt, and whether it was hurt by a swing. Both
    // are declared HERE, at boot, with every other field, and both exist so
    // `enemy:killed` can answer "where did the killing blow land" by
    // construction rather than because damage() happened to be the caller —
    // progression/progress.js:409 doubles XP on 'head' and reads
    // `p.zone || p.e.lastZone`, so a wrong answer is a wrong reward.
    lastZone: 'torso', lastMelee: false,
    aware: 0, memT: 0, heardX: 0, heardZ: 0, homeX: 0, homeZ: 0,
    band: 1, aim: 0, screamCd: 0,
    tickT: 0, tick: 0, observedT: 0,
    dist: undefined, los: false, litSelf: false, obsSelf: false, playerLit: 0,
    reveal: 1, lodFar: true,
    navBest: undefined, navBestT: 0,
    _navYaw: rng.next() * TAU, _navValid: false, _navBlocked: false,
    anim: { gait: 0, moveAmp: 0, coil: 0, swing: 0, bank: 0, aim: 0, tick: 0 },
  };
}

function pickBand(def, rng) {
  if (!def.bandWeights) return 1;
  const r = rng.next();
  let acc = 0;
  for (let i = 0; i < def.bandWeights.length; i++) {
    acc += def.bandWeights[i];
    if (r < acc) return i;
  }
  return def.bandWeights.length - 1;
}

export default Enemies;
