// CURFEW — the dog-caller (manifest 'dogcaller'). ROUND 22, lane C.
//
// Alex, 2026-09-10: "Somewhere in the woods, a voice calling a dog's name. Over and over. The
// hounds respond to it." And, under BOSS: "The dog-caller. The voice in the woods calling a
// name all game is a person. Biggest light in the county, hunts you with the pack. Kill him
// and the hounds stop answering. Buildable with systems you already have — people plus
// hounds — and it pays off the sound design."
//
// So he is a POOL BODY (species.js `dogcaller`: a poacher's brain in a human rig with a
// rifle), and this system is the part of him that is not a pool body: where he is put, when
// he calls, who answers, the lantern in his hand, and what his death changes.
//
//   placement  once per session, PLACE_MIN..PLACE_MAX metres from the player in the pines,
//              off any road, as a STAGED body (still, unaware, held at his spot). `unique`
//              makes cull / standDown / the respawn sweep refuse him: he is never thermostat
//              stock and never vanishes between encounters.
//   the drift  while he has not noticed you, every DRIFT_EVERY s his spot steps DRIFT_STEP m
//              toward you and never inside DRIFT_FLOOR. The call gets nearer over the night.
//   the call   bus 'dogcaller:call' {x, z, name} every callEvery s idle, callHuntEvery s
//              while he has you (lane G plays the voice there, a quarter mile off). Every
//              IDLE hound inside callRadius that is nearer to him than to you is re-homed
//              to HIM and trots over (enemies.rally) — that is what "the hounds respond to
//              it" is; a hound that is already on you, or standing nearer you than him, is
//              not pulled off you. While he hunts, every hound inside packRadius shares his
//              eyes: your last-known point becomes theirs.
//   the light  "Biggest light in the county": a glow bead in his left hand (makeBasic, the
//              bolts' own program — no new program) plus ONE borrowed rover while you are
//              inside lantern.near, released past near + a pad, on death, and in dispose().
//              Never a new light.
//   the death  bus 'dogcaller:dead' {x, z}: the hounds stop answering (no more rallies) and
//              the call never plays again (lane G). progress.flag('dogcaller:dead') persists
//              it: a boss you killed stays dead.
//
// THE DOG'S NAME IS ONE NAME FOR THE WHOLE GAME: "Blue". Exported for lane G, which bakes
// the voice. Nothing here puts it on the HUD; it is a sound.
//
// donor: src/enemies/kneeler.js (a body's own system beside the pool: constructor subscribes,
//   init builds, step owns the clocks, dispose releases what it borrowed);
//   src/director/dread.js _startLantern (the ONE way a dynamic light exists: lights.borrow).

import * as THREE from 'three';
import { CFG } from '../config.js';
import { SPECIES } from './species.js';
import { makeBasic, whiteTex } from './bodies.js';
import { groundY } from './nav.js';

export const DOGCALLER_NAME = 'Blue';
export const DOGCALLER_NAMES = Object.freeze([DOGCALLER_NAME]);

/* --------------------------------------------------------------------------
   The numbers. CFG.director.dogCaller has the placement and the drift; species.js's
   row has the call cadence and the lantern, beside his hp and his bands. Fallbacks are
   the same numbers, so a config without the block still fields him.
   -------------------------------------------------------------------------- */
const DC = (CFG.director && CFG.director.dogCaller) || {};
const PLACE_MIN = DC.placeMin || 650;     // m from the player: far enough to be a voice, not a body
const PLACE_MAX = DC.placeMax || 900;
const ROAD_CLEAR = DC.roadClear || 40;    // m off any road: he is in the woods
const DRIFT_EVERY = DC.driftEveryS || 30; // s between steps toward the player
const DRIFT_STEP = DC.driftStep || 40;    // m per step
const DRIFT_FLOOR = DC.driftFloor || 200; // m: the drift never brings him inside this
const DRIFT_ROAD_CLEAR = 12;              // m off a road the drift may land (looser: he is walking)
const PLACE_TRIES = 6;                    // candidates per step while unplaced
const PLACE_RELAX_REGION = 240;           // tries before "the pines" becomes "anywhere"
const PLACE_RELAX_ROAD = 720;             // tries before the road clearance is dropped too
const PINES = 0;                          // terrain.js region id 0
const SHARE_EVERY = 1.5;                  // s between "the pack shares his eyes" rallies
const CALL_MEM_S = 24;                    // s a hound holds the call point
const SHARE_MEM_S = 12;                   // s a hound holds his last-known point of you
const ROVER_PAD = 20;                     // m past lantern.near before the rover is let go
const BEAD_R = 0.06;                      // the lantern bead, metres
// the left hand in rig space (art/people.js: arm pivot y 1.405, elbow -0.29, forearm -0.31)
const HAND_X = -0.26, HAND_Y = 0.80, HAND_Z = -0.08;
const FLAG = 'dogcaller:dead';

/* module scratch — nothing below allocates inside step() */
const _call = { x: 0, z: 0, name: DOGCALLER_NAME };
const _dead = { x: 0, z: 0 };

function range(rng, lo, hi) { return lo + rng.next() * (hi - lo); }

export class DogCaller {
  static id = 'dogcaller';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('dogcaller');
    this.def = SPECIES.dogcaller;
    this.name = DOGCALLER_NAME;
    this.e = null;               // his pool record, found at init
    this.bead = null;
    this.beadMat = null;
    this.rover = null;
    this._gen = -1;              // the life of the record this system is tracking
    this._placed = false;
    this._dead = false;          // this session (the flag is the persisted half)
    this._callT = 0;
    this._shareT = 0;
    this._driftT = 0;
    this._tries = 0;
    this.calls = 0;
    this.rallied = 0;
    this.drifts = 0;
    this.lastCallT = -1;
    this._t = 0;
    this._unsub = [];
    const bus = ctx.bus;
    if (bus && bus.on) {
      const off = bus.on('enemy:killed', (p) => {
        if (!p || p.species !== 'dogcaller') return;
        this._onDeath(p);
      });
      if (typeof off === 'function') this._unsub.push(off);
    }
  }

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }

  async init() {
    if (typeof window === 'undefined') return;   // node syntax checks build nothing
    const en = this._sys('enemies');
    if (!en || typeof en.list !== 'function') return;
    const all = en.list();
    for (let i = 0; i < all.length; i++) {
      if (all[i].species === 'dogcaller') { this.e = all[i]; break; }
    }
    if (!this.e || !this.e.built || !this.e.built.group) return;
    // THE BEAD. The bolts' material, so it costs no program; a warm point in his left hand
    // that the rover (below) lights the woods from. It rides the rig: hidden with it past
    // the LOD line, drawn with it inside.
    const L = this.def.lantern || {};
    this.beadMat = makeBasic(whiteTex(), L.colour || 0xffb469);
    this.beadMat.opacity = 0.95;
    const geo = new THREE.SphereGeometry(BEAD_R, 8, 6);
    const bead = new THREE.Mesh(geo, this.beadMat);
    const k = (this.def.height || 1.8) / 1.8;
    bead.position.set(HAND_X * k, HAND_Y * k, HAND_Z * k);
    bead.frustumCulled = true;
    bead.name = 'dogcaller-lantern';
    this.e.built.group.add(bead);
    this.bead = bead;

    const T = (window.__CURFEW = window.__CURFEW || {});
    T.dogcaller = {
      state: () => this.state(),
      place: (x, z) => this._place(x, z, true),
      call: () => this._callNow(),
      kill: () => this._kill(),
      name: () => this.name,
    };
  }

  ready() { return true; }

  /* ------------------------------------------------------------------ step -- */

  step(dt) {
    const e = this.e;
    if (!e) return;
    this._t += dt;
    const ctx = this.ctx;
    if (!ctx.playing) return;
    const p = this._sys('player');
    if (!p || !p.pos) return;

    // a boss you killed stays dead: the persisted flag, read lazily (progress boots after us)
    if (!this._dead && this._flagged()) this._dead = true;
    if (this._dead) { this._dropRover(); return; }

    // the record's life: not alive and not a corpse means he was released (a reset) — place again
    if (!e.alive) {
      this._dropRover();
      if (e.state !== 'corpse') { this._placed = false; this._tryPlace(p); }
      return;
    }
    if (e.gen !== this._gen) { this._gen = e.gen; this._armClocks(); }

    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // THE DRIFT: the call gets nearer over the night. Only while he has not noticed you,
    // never inside DRIFT_FLOOR, and never while he is on screen (obsSelf) — a man who
    // teleports in front of you is a bug, not a beat.
    if (e.aware <= 0) {
      this._driftT += dt;
      if (this._driftT >= DRIFT_EVERY) {
        this._driftT = 0;
        if (dist > DRIFT_FLOOR + DRIFT_STEP && !e.obsSelf) this._drift(e, p, dist);
      }
    } else this._driftT = 0;

    // THE CALL. Idle cadence while he waits; faster while he has you.
    this._callT -= dt;
    if (this._callT <= 0) {
      this._callNow();
    }

    // THE PACK SHARES HIS EYES while he hunts.
    if (e.aware > 0) {
      this._shareT -= dt;
      if (this._shareT <= 0) {
        this._shareT = SHARE_EVERY;
        const en = this._sys('enemies');
        if (en && typeof en.rally === 'function') {
          this.rallied += en.rally(e.pos.x, e.pos.z, this.def.packRadius || 45, 'hound',
            e.heardX, e.heardZ, SHARE_MEM_S, true);
        }
      }
    } else this._shareT = 0;

    // THE LANTERN'S ROVER: borrowed inside lantern.near, released past near + pad.
    const L = this.def.lantern || {};
    const near = L.near || 140;
    if (!this.rover && dist <= near) {
      const lights = this._sys('lights');
      if (lights && typeof lights.borrow === 'function') {
        this.rover = lights.borrow('dogcaller', e.pos.x, e.pos.y + HAND_Y, e.pos.z,
          L.colour || 0xffb469, L.intensity || 44, 0);
      }
    } else if (this.rover && dist > near + ROVER_PAD) {
      this._dropRover();
    }
    if (this.rover) {
      if (!this.rover.inUse) this.rover = null;    // the pool took it back (a ttl it never had; be honest)
      else {
        // the bead's world point: the hand offset turned by his yaw (local forward is -Z)
        const k = (this.def.height || 1.8) / 1.8;
        const c = Math.cos(e.yaw), s = Math.sin(e.yaw);
        const lx = HAND_X * k, lz = HAND_Z * k;
        this.rover.setPosition(e.pos.x + lx * c + lz * s, e.pos.y + HAND_Y * k, e.pos.z - lx * s + lz * c);
      }
    }
  }

  /* --------------------------------------------------------------- placing -- */

  _tryPlace(p) {
    for (let i = 0; i < PLACE_TRIES; i++) {
      this._tries++;
      const a = this.rng.next() * Math.PI * 2;
      const d = range(this.rng, PLACE_MIN, PLACE_MAX);
      const x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d;
      if (this._place(x, z, false)) return true;
    }
    return false;
  }

  /**
   * Put him at (x, z) if it is legal ground: inside the county, in the pines (relaxed after
   * PLACE_RELAX_REGION tries: a spawn deep in the fields would otherwise never find him a
   * wood), off the roads (relaxed after PLACE_RELAX_ROAD), and somewhere a man can stand.
   * `force` is the test surface: any ground, right now.
   */
  _place(x, z, force) {
    const en = this._sys('enemies');
    if (!en || typeof en.spawn !== 'function') return false;
    if (this.e && this.e.alive) return false;
    const terrain = this._sys('terrain');
    if (!force) {
      if (terrain && terrain.beyondRim && terrain.beyondRim(x, z)) return false;
      if (terrain && terrain.regionAt && this._tries < PLACE_RELAX_REGION) {
        const r = terrain.regionAt(x, z);
        if (r && r.id !== PINES) return false;
      }
      const roads = this._sys('roads');
      if (roads && typeof roads.roadDistance === 'function' && this._tries < PLACE_RELAX_ROAD) {
        if (roads.roadDistance(x, z) < ROAD_CLEAR) return false;
      }
    }
    const col = this._sys('collision');
    if (col && typeof col.canOccupy === 'function'
      && !col.canOccupy(x, z, this.def.radius || 0.4, this.def.height || 1.8)) return false;
    const yaw = this.rng.next() * Math.PI * 2;
    const rec = en.spawn('dogcaller', x, z, { staged: true, awake: false, unique: true, yaw });
    if (!rec) return false;
    this.e = rec;
    this._gen = rec.gen;
    this._placed = true;
    this._armClocks();
    return true;
  }

  _armClocks() {
    const idle = this.def.callEvery || [22, 38];
    // the first call comes soon: the voice is the first thing the county says about him
    this._callT = range(this.rng, 4, Math.max(6, idle[0] * 0.5));
    this._shareT = 0;
    this._driftT = 0;
  }

  /** One step of the drift. Moves his staged spot (he is a tableau) or his home (he is walking). */
  _drift(e, p, dist) {
    const nx = (p.pos.x - e.pos.x) / dist, nz = (p.pos.z - e.pos.z) / dist;
    // a little sideways so the line of the calls is not a bearing you could shoot down
    const side = (this.rng.next() - 0.5) * 0.8;
    const x = e.pos.x + nx * DRIFT_STEP - nz * DRIFT_STEP * side;
    const z = e.pos.z + nz * DRIFT_STEP + nx * DRIFT_STEP * side;
    const terrain = this._sys('terrain');
    if (terrain && terrain.beyondRim && terrain.beyondRim(x, z)) return;
    const roads = this._sys('roads');
    if (roads && typeof roads.roadDistance === 'function' && roads.roadDistance(x, z) < DRIFT_ROAD_CLEAR) return;
    const col = this._sys('collision');
    if (col && typeof col.canOccupy === 'function'
      && !col.canOccupy(x, z, this.def.radius || 0.4, this.def.height || 1.8)) return;
    const y = groundY(this.ctx, x, z);
    if (e.staged) {
      e.stagedX = x; e.stagedZ = z; e.stagedY = y;
      e.pos.set(x, y, z);
      e.prevPos.copy(e.pos); e.currPos.copy(e.pos);   // never interpolate a move nobody saw
    }
    e.homeX = x; e.homeZ = z;
    e.heardX = x; e.heardZ = z;
    e.navBest = undefined;
    this.drifts++;
  }

  /* --------------------------------------------------------------- the call -- */

  _callNow() {
    const e = this.e;
    if (!e || !e.alive || this._dead) return false;
    const hunting = e.aware > 0;
    const c = hunting ? (this.def.callHuntEvery || [9, 14]) : (this.def.callEvery || [22, 38]);
    this._callT = range(this.rng, c[0], c[1]);
    _call.x = e.pos.x; _call.z = e.pos.z; _call.name = this.name;
    this.ctx.bus.emit('dogcaller:call', _call);
    this.calls++;
    this.lastCallT = this._t;
    // the hounds respond to it: every IDLE one inside callRadius is re-homed to HIM and
    // trots over (enemies.rally, wake=false: a hound already on you is not pulled off you)
    const en = this._sys('enemies');
    if (en && typeof en.rally === 'function') {
      this.rallied += en.rally(e.pos.x, e.pos.z, this.def.callRadius || 220, 'hound',
        e.pos.x, e.pos.z, CALL_MEM_S, false);
    }
    return true;
  }

  /* -------------------------------------------------------------- the death -- */

  _onDeath(p) {
    if (this._dead) return;
    this._dead = true;
    this._dropRover();
    // the bead goes dark: a dark colour, the same material (never a new one)
    if (this.beadMat) { this.beadMat.color.setHex(0x000000); this.beadMat.opacity = 0.0; }
    _dead.x = Number.isFinite(p.x) ? p.x : (this.e ? this.e.pos.x : 0);
    _dead.z = Number.isFinite(p.z) ? p.z : (this.e ? this.e.pos.z : 0);
    this.ctx.bus.emit('dogcaller:dead', _dead);
    const pr = this._sys('progress');
    if (pr && typeof pr.flag === 'function') { try { pr.flag(FLAG, 1); } catch (err) { void err; } }
  }

  _flagged() {
    const pr = this._sys('progress');
    if (!pr || typeof pr.flag !== 'function') return false;
    try { return !!pr.flag(FLAG); } catch (err) { return false; }
  }

  _kill() {
    const en = this._sys('enemies');
    const e = this.e;
    if (!en || !e || !e.alive || typeof en.damage !== 'function') return null;
    return en.damage(e, 1e6, { zone: 'head' });
  }

  _dropRover() {
    if (!this.rover) return;
    try { this.rover.release(); } catch (err) { void err; }
    this.rover = null;
  }

  /* ------------------------------------------------------------ the surface -- */

  state() {
    const e = this.e;
    const p = this._sys('player');
    const alive = !!(e && e.alive);
    const dist = (alive && p && p.pos) ? Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) : -1;
    const terrain = this._sys('terrain');
    const reg = (alive && terrain && terrain.regionAt) ? terrain.regionAt(e.pos.x, e.pos.z) : null;
    return {
      name: this.name,
      placed: this._placed, alive, dead: this._dead, flagged: this._flagged(),
      staged: !!(e && e.staged), aware: e ? e.aware : 0, state: e ? e.state : '',
      x: alive ? +e.pos.x.toFixed(1) : 0, z: alive ? +e.pos.z.toFixed(1) : 0,
      dist: +dist.toFixed(1), region: reg ? reg.id : -1,
      hp: e ? e.hp : 0,
      calls: this.calls, lastCallT: +this.lastCallT.toFixed(1), nextCallS: +Math.max(0, this._callT).toFixed(1),
      rallied: this.rallied, drifts: this.drifts, tries: this._tries,
      rover: !!(this.rover && this.rover.inUse),
    };
  }

  dispose() {
    this._dropRover();
    for (let i = 0; i < this._unsub.length; i++) { try { this._unsub[i](); } catch (err) { void err; } }
    this._unsub.length = 0;
    if (this.bead && this.bead.parent) this.bead.parent.remove(this.bead);
    if (this.bead) { this.bead.geometry.dispose(); }
    if (this.beadMat) this.beadMat.dispose();
    this.bead = null; this.beadMat = null;
  }
}

export default DogCaller;
