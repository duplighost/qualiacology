// CURFEW — ballistic resolution and hit feedback. The gun owns the trigger;
// this file owns only what a fired ray HITS, what that costs, and what the
// player sees come off it. One owner per concern (Cinderbloom split the
// trigger across two files and needed a bus latch to keep them honest).
//
// THE SHAPE: a three-stage ray sharing ONE shrinking bestT.
//   1. enemy hit zones   (ctx.systems 'enemies' — does not exist in M0)
//   1b. the boss's zones  (ctx.systems 'kneeler', ROUND 6 — plate, head, two vents)
//   2. chunk-local colliders (collision.raycast — trees, props, buildings)
//   3. the analytic ground march (terrain.marchRay — no mesh is ever raycast)
// Each stage is handed the best t found so far as its maxT, so world geometry
// OCCLUDES FOR FREE: a tree between you and a thing simply wins the compare,
// and there is no separate line-of-sight test to forget to write.
// (vigil combat/combat.js:373-426; APEX's single _fireRays pipeline is the
// shape — one entry point, never two code paths that can disagree.)
//
// THE ONE LAW (FLARE impact.js, DESIGN §3):
//   EVERY CONNECTING SHOT REMOVES AT LEAST 1 HP AND VISIBLY LIGHTS WHAT IT HIT
//   FOR AT LEAST 0.35 s. Armour and angle decide HOW MUCH, never WHETHER.
//   Nothing ever ghosts. A deflection that looks like a miss is a bug report
//   the player cannot write, because they think the game is fine and they are
//   bad at it.
//
// M0 has no enemies, so stage 1 is inert and stages 2 and 3 carry the proof:
// a shot into a tree or into the hillside spawns a decal and a spark burst
// through fx and borrows a rover to light the impact for 0.35 s. That is the
// whole pipeline, end to end, tonight — the manifest is the truth, and a
// system that resolves rays nobody can see does not exist.

import * as THREE from 'three';
import { DEG, lerp } from '../engine/math.js';
import CFG from '../config.js';

const MAXT = 300;                    // metres a round is allowed to travel
const LIT_S = 0.35;                  // THE ONE LAW's floor, in seconds

// Zone multipliers. `head` is not here: it comes from the weapon def's
// headMul, because how much a headshot is worth is a property of the round.
// vigil combat.js:12.
const ZONE_MUL = { torso: 1.00, limb: 0.85, plate: 0.55, vent: 2.40 };

// Equivalent depth in cm that a round defeats, by surface. CFG.weapons.pen
// carries the three the design named; the rest are cinderbloom physics.js:96.
const PEN_CM = {
  wood: CFG.weapons.pen.wood,
  flesh: CFG.weapons.pen.flesh,
  metal: CFG.weapons.pen.metal,
  foliage: CFG.weapons.pen.wood,
  plank: CFG.weapons.pen.wood,
  tin: CFG.weapons.pen.metal,
  glass: 1.2,
  rock: 1.5,
  plate: 0,
  dirt: 0,                           // the ground is not a wall you shoot through
};

// A collider's tag, set by whoever placed it, mapped to the surface vocabulary combat
// speaks: it picks the impact sound, the decal and the penetration depth. collision.js
// publishes the tag on its ray result; flora tags every trunk 'tree'. Anything untagged
// is wood, which is what M0 plants.
const TAG_SURFACE = Object.freeze({
  tree: 'wood', trunk: 'wood', log: 'wood', plank: 'wood', fence: 'wood',
  rock: 'stone', stone: 'stone', wall: 'stone', building: 'stone',
  metal: 'metal', vehicle: 'metal', tank: 'metal',
});

// Impact colour by surface — the spark burst reads as material before the
// player has consciously identified what they hit.
const SPARK = {
  wood: 0xc09258, plank: 0xc09258, foliage: 0x7c9a5c,
  metal: 0xfff0c8, tin: 0xfff0c8, rock: 0xd8d2c4, glass: 0xcfe4f2,
  dirt: 0x9a8468, flesh: 0xa4222a, plate: 0xfff0c8,
};

const MAX_PENS = 2;                  // cinderbloom combat.js:955
const PEN_BUDGET_CM = 50;
const PEN_DEFLECT = 0.40 * DEG;      // per surface exited, cinderbloom combat.js:967
const EXIT_STEP = 0.02;              // 2 cm march when looking for the far side
const EXIT_MAX = 0.50;               // metres of solid we will search through

/* ---- module scratch. Nothing here allocates per shot. ---- */
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _n = new THREE.Vector3(0, 1, 0);
const _back = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _tmp = new THREE.Vector3();

export class Combat {
  static id = 'combat';

  constructor(ctx) {
    this.ctx = ctx;

    this.penRng = ctx.rng.fork('penetration');

    this.shots = 0;
    this.hits = 0;
    this.misses = 0;               // rays that reached MAXT with nothing in them
    this.pens = 0;
    this.ghosts = 0;               // landings that dealt < 1 hp. MUST stay 0.
    // Reused: a shotgun lands 8 of these in one step and none may allocate. This object is
    // MUTATED IN PLACE by _land() and is never reassigned — the comment used to say
    // "reused" while _land built a fresh literal on every landing, so eight pellets meant
    // eight garbage objects per trigger pull inside the hot path. Anything that reads it
    // (dump(), a test) is reading live state, not a snapshot; copy it if you need to keep it.
    this.lastHit = {
      valid: false, kind: '', x: 0, y: 0, z: 0,
      dmg: 0, dist: 0, pen: false, deflected: false, killed: false, lit: 0, t: 0,
    };
    this.litTimers = [];           // borrowed rover handles, released by ttl

    // Reused outbound payload. Listeners consume it synchronously and retain
    // nothing; that is what keeps a shot allocation-free in the hot path.
    this._hitPayload = {
      kind: 'dirt', surface: 'dirt', x: 0, y: 0, z: 0,
      nx: 0, ny: 1, nz: 0, dist: 0, dmg: 0, zone: null,
      enemy: null, killed: false, deflected: false, pen: false, weapon: '',
    };

    // NB: 'enemies' is not in the M0 manifest at all, and in M1 it is
    // constructed AFTER combat. It MUST be read lazily at call time — VIGIL
    // captured it in its constructor and got undefined for the whole game.
    this._onFire = (p) => this.resolveShot(p);
    ctx.bus.on('weapon:fire', this._onFire);
  }

  async init() {
    if (typeof window !== 'undefined') {
      const T = (window.__CURFEW = window.__CURFEW || {});
      T.combat = {
        dump: () => this.dump(),
        probe: (ox, oy, oz, dx, dy, dz, maxT) => this.probe(ox, oy, oz, dx, dy, dz, maxT),
      };
    }
  }
  ready() { return !!this._hitPayload; }
  dispose() { this.litTimers.length = 0; }

  _sys(id) { return this.ctx.systems && this.ctx.systems.get(id); }

  /**
   * The skill tree's HANDS tier 3 ('Through'), read LAZILY at use and never captured:
   * `progress` is manifest entry 20 and combat is 15, so it does not exist when this file
   * is constructed and in an M0 build it never exists at all.
   *
   * `progress.perk(name, base, arg)` is the declared call and the base is returned
   * untouched when nothing is owned, so a shot with no points spent resolves EXACTLY as it
   * does today. HOOK_POINTS in progression/nodes.js names combat.js as the site for both
   * `penCm` (the penetration test) and `penExits` (the exit-count loop), and hands_4
   * installs onto both — it writes no stat at all, so reading progress.stats.penExtra
   * would have found 0 forever and left the node inert. `_progStats()` below is only a
   * fallback in case a later node writes the stat instead of installing the hook.
   */
  _perk(name, base, arg) {
    const pr = this._sys('progress');
    if (!pr || typeof pr.perk !== 'function') return base;
    const v = pr.perk(name, base, arg);
    return v === undefined ? base : v;
  }

  _progStats() {
    const pr = this._sys('progress');
    const s = pr && pr.stats;
    return (s && typeof s === 'object') ? s : null;
  }

  /* ------------------------------------------------------------------
     Damage bands. The gun's def carries [maxRange, dmg] pairs and the
     boundaries BLEND over 2 m, so walking one step does not change the
     shot count on a target. vigil combat.js:18-29.
     ------------------------------------------------------------------ */
  static bandDamage(bands, dist) {
    for (let i = 0; i < bands.length; i++) {
      const max = bands[i][0], dmg = bands[i][1];
      if (dist <= max - 2 || i === bands.length - 1) return dmg;
      if (dist <= max + 2) return lerp(dmg, bands[i + 1][1], (dist - (max - 2)) / 4);
    }
    return bands[bands.length - 1][1];
  }

  /* ------------------------------------------------------------------
     THE THREE-STAGE RAY. One shrinking bestT, three stages, one exit.
     ------------------------------------------------------------------ */

  /**
   * Trace one ray and return the nearest hit, or null.
   * Fills the shared `_stage` record; the caller must consume it before the
   * next call. Stages are ordered cheap-and-specific first, and each is
   * capped by the best t so far, which is what makes occlusion free.
   */
  _trace(ox, oy, oz, dx, dy, dz, maxT) {
    const s = _stage;
    s.hit = false; s.t = maxT; s.kind = 'dirt'; s.zone = null; s.enemy = null; s.exit = false; s.boss = false;

    _o.set(ox, oy, oz);
    _d.set(dx, dy, dz);

    // ---- stage 1: enemy hit zones (inert in M0)
    const enemies = this._sys('enemies');
    if (enemies && enemies.raycast) {
      const e = enemies.raycast(_o, _d, s.t);
      if (e && e.t < s.t) {
        s.hit = true; s.t = e.t; s.kind = 'flesh'; s.zone = e.zone || 'torso'; s.enemy = e.enemy;
        s.x = e.point.x; s.y = e.point.y; s.z = e.point.z;
        s.nx = -dx; s.ny = -dy; s.nz = -dz;
      }
    }

    // ---- stage 1b: the boss's zones (ROUND 6, lane C). Same shape as stage 1, read
    // lazily (kneeler is manifest entry 26 and combat is 15), taking the NEARER hit so a
    // hound standing in front of the Kneeler still catches the round first. The stage
    // record carries `boss` so resolveShot hands the damage to the right owner.
    const kneeler = this._sys('kneeler');
    if (kneeler && kneeler.raycast) {
      const b = kneeler.raycast(_o, _d, s.t);
      if (b && b.t < s.t) {
        s.hit = true; s.t = b.t; s.kind = 'flesh'; s.zone = b.zone || 'plate'; s.enemy = b.enemy; s.boss = true;
        s.x = b.point.x; s.y = b.point.y; s.z = b.point.z;
        s.nx = -dx; s.ny = -dy; s.nz = -dz;
      }
    }

    // ---- stage 2: chunk-local colliders, capped by stage 1
    const collision = this._sys('collision');
    if (collision && collision.raycast) {
      // MASK.SHOT only — deliberately NOT 0xffffffff. The all-bits mask includes
      // MASK.GROUND, which makes collision.raycast march the terrain internally and return
      // the ground hit; stage 3 below then recomputed the identical distance, its `gt < s.t`
      // guard was false, and every ground hit came back labelled as the collider default.
      // Stage 2 asks about colliders. Stage 3 owns the ground.
      const c = collision.raycast(_o, _d, s.t, collision.MASK ? collision.MASK.SHOT : 2);
      if (c && c.hit !== false && c.t < s.t) {
        s.hit = true; s.t = c.t; s.enemy = null; s.zone = null; s.boss = false;
        // collision publishes the tag the placer gave it (flora tags trunks 'tree').
        s.kind = TAG_SURFACE[c.tag] || 'wood';
        if (c.point) { s.x = c.point.x; s.y = c.point.y; s.z = c.point.z; }
        else { s.x = ox + dx * c.t; s.y = oy + dy * c.t; s.z = oz + dz * c.t; }
        if (c.normal) { s.nx = c.normal.x; s.ny = c.normal.y; s.nz = c.normal.z; }
        else { s.nx = -dx; s.ny = -dy; s.nz = -dz; }
      }
    }

    // ---- stage 3: the analytic ground march, capped by stages 1 and 2.
    // Nothing raycasts the terrain mesh — heightAt is the ONE ground truth
    // and marchRay walks it. [CONTRACT: world/terrain.js]
    const terrain = this._sys('terrain');
    if (terrain && terrain.marchRay) {
      const gt = terrain.marchRay(ox, oy, oz, dx, dy, dz, s.t);
      if (gt !== null && gt !== undefined && gt < s.t) {
        s.hit = true; s.t = gt; s.enemy = null; s.zone = null; s.boss = false; s.kind = 'dirt';
        s.x = ox + dx * gt; s.y = oy + dy * gt; s.z = oz + dz * gt;
        if (terrain.normalAt) {
          terrain.normalAt(s.x, s.z, _tmp);
          s.nx = _tmp.x; s.ny = _tmp.y; s.nz = _tmp.z;
        } else { s.nx = 0; s.ny = 1; s.nz = 0; }
      }
    }
    return s.hit ? s : null;
  }

  /** Is this point inside world solid? Two cheap tests, no raycast, no
   *  allocation: under the heightfield, or overlapping a prop collider.
   *  (cinderbloom combat.js:_insideSolid) */
  _insideSolid(x, y, z) {
    const terrain = this._sys('terrain');
    if (terrain && terrain.heightAt && y < terrain.heightAt(x, z)) return true;
    const collision = this._sys('collision');
    // canOccupy is a standing test, so it answers for a full-height trunk but
    // not for the gap under a raised floor. Good enough for M0's colliders,
    // and a real solid-point query is requested in docs/HANDOFF.md.
    if (collision && collision.canOccupy && !collision.canOccupy(x, z, 0.02, 0.02)) return true;
    return false;
  }

  /** March forward from just past a hit until we are out of solid. Returns the
   *  t of the far surface, or -1 if it is thicker than the search budget. */
  _findExit(ox, oy, oz, dx, dy, dz, tIn, budget) {
    // No solidity oracle means we cannot tell a 5 cm sapling from a 60 cm oak,
    // and guessing would let every round wallbang every tree. Refuse instead:
    // a round that stops is a shot the player can read; a round that ghosts
    // through cover is one they cannot.
    const collision = this._sys('collision');
    if (!collision || !collision.canOccupy) return -1;
    const lim = Math.min(EXIT_MAX, budget);
    for (let t = tIn + EXIT_STEP; t <= tIn + lim; t += EXIT_STEP) {
      if (!this._insideSolid(ox + dx * t, oy + dy * t, oz + dz * t)) return t;
    }
    return -1;
  }

  /* ------------------------------------------------------------------
     The shot. Called synchronously from the weapon:fire bus event with the
     gun's REUSED payload object — read it here, keep nothing.
     ------------------------------------------------------------------ */
  resolveShot(f) {
    const wep = this._sys('weapons');
    if (!wep) return;
    const def = wep.def;
    const bands = def.bands;
    const limit = Math.min(MAXT, def.range || MAXT);

    let ox = f.ox, oy = f.oy, oz = f.oz;
    let dx = f.dx, dy = f.dy, dz = f.dz;
    this.shots++;

    // HANDS tier 3, 'Through' — "the round leaves the far side". The exit COUNT is asked
    // once per shot rather than once per bounce, so a shotgun costs eight reduces and not
    // twenty-four. Absent the node this is exactly MAX_PENS and nothing changes.
    const ps = this._progStats();
    const extraExits = (this._perk('penExits', 0) | 0) || ((ps && ps.penExtra) | 0);
    const maxPens = MAX_PENS + Math.max(0, extraExits);
    const statPenMul = (ps && ps.penMul) || 1;

    let travelled = 0;              // metres already flown through earlier hits
    let traversedCm = 0;            // cm of solid already punched through
    let pens = 0;
    let firstDist = -1;
    let connected = false;

    for (let bounce = 0; bounce <= maxPens; bounce++) {
      const h = this._trace(ox, oy, oz, dx, dy, dz, limit - travelled);
      if (!h) break;
      const dist = travelled + h.t;
      if (firstDist < 0) firstDist = dist;
      connected = true;

      // --- damage. THE ONE LAW's first half lives on the next four lines.
      const base = Combat.bandDamage(bands, dist);
      const zmul = h.zone ? (h.zone === 'head' ? def.headMul : (ZONE_MUL[h.zone] || 1)) : 1;
      const penMul = pens > 0 ? Math.max(0.20, 1 - traversedCm / Math.max(0.001, PEN_CM[h.kind] ?? 1)) : 1;
      // Round UP off zero: armour and angle decide HOW MUCH, never WHETHER.
      // HANDS 'damageMul' (ROUND 6, lane G registers it; lane C reads it): a multiplier on
      // every round, base 1, so with nothing owned a shot resolves exactly as it did.
      const dmg = Math.max(1, Math.round(base * zmul * penMul * this._perk('damageMul', 1)));

      const deflected = h.zone === 'plate';
      let killed = false;

      if (h.enemy) {
        // the boss owns its own hp (enemies/kneeler.js); everything else is the pool's
        const owner = this._sys(h.boss ? 'kneeler' : 'enemies');
        const res = owner && owner.damage
          ? owner.damage(h.enemy, dmg, { zone: h.zone, point: _pt.set(h.x, h.y, h.z), dist })
          : { killed: false };
        killed = !!res.killed;
      }

      // --- feedback. THE ONE LAW's second half: light it for >= 0.35 s.
      this._land(h, dmg, dist, deflected, killed, pens > 0, def.id);

      // A round does not continue through a creature into another.
      if (h.enemy) break;

      // --- penetration (cinderbloom combat.js:954-982)
      // THE PENETRATION TEST is the declared site for the `penCm` hook, and its signature
      // is (cm, ctx, material) -> cm. The base is CFG.weapons.pen for this surface, so
      // with nothing owned the reduce hands the same centimetres straight back and a
      // surface that is 0 cm (plate, dirt) stays 0 however it is scaled.
      const baseCm = (PEN_CM[h.kind] ?? 0) * statPenMul;
      const penCm = baseCm > 0 ? this._perk('penCm', baseCm, h.kind) : 0;
      if (pens >= maxPens || penCm <= 0) break;
      const exit = this._findExit(ox, oy, oz, dx, dy, dz, h.t, (PEN_BUDGET_CM - traversedCm) / 100);
      if (exit < 0) break;                                  // thicker than the budget
      const thickCm = (exit - h.t) * 100;
      if (thickCm >= penCm) break;                          // defeated by the material
      traversedCm += thickCm;
      if (traversedCm >= PEN_BUDGET_CM) break;
      pens++; this.pens++;

      // Exit feedback on the far side, or penetration is INVISIBLE and the
      // player learns nothing from having done it.
      const ex = ox + dx * exit, ey = oy + dy * exit, ez = oz + dz * exit;
      _exitRec.kind = h.kind; _exitRec.x = ex; _exitRec.y = ey; _exitRec.z = ez;
      _exitRec.nx = -h.nx; _exitRec.ny = -h.ny; _exitRec.nz = -h.nz;
      _exitRec.zone = null; _exitRec.enemy = null; _exitRec.t = exit; _exitRec.exit = true;
      this._land(_exitRec, 0, dist, false, false, true, def.id);

      // 0.40 deg of deflection per surface exited, seeded so a replay repeats.
      dx += (this.penRng.next() - 0.5) * 2 * PEN_DEFLECT;
      dy += (this.penRng.next() - 0.5) * 2 * PEN_DEFLECT;
      const inv = 1 / Math.max(1e-6, Math.hypot(dx, dy, dz));
      dx *= inv; dy *= inv; dz *= inv;
      travelled += exit + 0.01;
      ox = ex + dx * 0.01; oy = ey + dy * 0.01; oz = ez + dz * 0.01;
    }

    if (!connected) this.misses++;

    // --- tracer. The ray left the EYE; the tracer is dressing that appears to
    // leave the barrel, so it starts at an estimated muzzle, not at the origin.
    if (f.tracer) {
      const fx = this._sys('fx');
      if (fx && fx.tracer) {
        const cam = this._sys('camera');
        _muzzle.set(f.ox, f.oy - 0.10, f.oz);
        if (cam) {
          _muzzle.x += -Math.sin(cam.yaw) * 0.55 + Math.cos(cam.yaw) * 0.14;
          _muzzle.z += -Math.cos(cam.yaw) * 0.55 - Math.sin(cam.yaw) * 0.14;
        }
        _d.set(f.dx, f.dy, f.dz);
        fx.tracer(_muzzle, _d, Math.max((firstDist > 0 ? firstDist : 220) - 0.4, 2));
      }
    }
  }

  /**
   * One landing. Decal + spark burst through fx, a borrowed rover so the spot
   * is LIT for LIT_S, and one weapon:hit on the bus. Every path into feedback
   * goes through here so there is exactly one place to break it.
   */
  _land(h, dmg, dist, deflected, killed, pen, weaponId) {
    // An exit burst is the far side of a wallbang and carries no damage of its
    // own. Everything else that lands MUST have removed at least 1 hp.
    if (h.exit) { /* exit burst: feedback only */ }
    else if (dmg >= 1) this.hits++;
    else this.ghosts++;            // THE ONE LAW is broken if this ever moves
    const fx = this._sys('fx');
    _pt.set(h.x, h.y, h.z);
    _n.set(h.nx, h.ny, h.nz);
    _back.set(-h.nx, -h.ny, -h.nz);

    // Decal + sparks. fx owns the pools; we own only the decision.
    //
    // fx.impact(kind, point, normal, power) already places the decal at the right per-surface
    // size and throws the sparks, so it is the ONLY call needed here. The two calls that used
    // to follow were interface drift: fx.decal's signature is (point, normal, size), so passing
    // (kind, point, normal, size) fed a STRING into point and a Vector3 into size, composed a
    // NaN matrix and wrote it into the shared decal InstancedMesh on every landing — silently,
    // because Vector3.copy of a string does not throw. And fx exposes no sparks() at all.
    if (fx && fx.impact) fx.impact(h.kind, _pt, _n, deflected ? 0.7 : 1);

    // THE ONE LAW, made literal: borrow a rover and light the hit for 0.35 s.
    // This is not decoration — it is the reason a deflection can never read as
    // a ghost. If fx is not finished yet, the shot STILL lights what it hit.
    const lights = this._sys('lights');
    if (lights && lights.borrow) {
      lights.borrow('impact', h.x + h.nx * 0.12, h.y + h.ny * 0.12, h.z + h.nz * 0.12,
        SPARK[h.kind] ?? 0xd8d2c4, deflected ? 7 : 9, LIT_S);
    }

    const p = this._hitPayload;
    p.kind = h.kind; p.surface = h.kind;
    p.x = h.x; p.y = h.y; p.z = h.z;
    p.nx = h.nx; p.ny = h.ny; p.nz = h.nz;
    p.dist = dist; p.dmg = dmg; p.zone = h.zone; p.enemy = h.enemy;
    p.killed = killed; p.deflected = deflected; p.pen = pen; p.weapon = weaponId;
    this.ctx.bus.emit('weapon:hit', p);

    // Mutate the preallocated record; NEVER reassign it. (See the constructor.)
    const L = this.lastHit;
    L.valid = true;
    L.kind = h.kind; L.x = h.x; L.y = h.y; L.z = h.z;
    L.dmg = dmg; L.dist = dist; L.pen = pen;
    L.deflected = deflected; L.killed = killed;
    L.lit = LIT_S; L.t = this.ctx.time.t;
  }

  /* ------------------------------------------------------------------
     Melee. The weapon owns the swing and the target lock; this owns damage
     and feedback, so there is exactly one path into each. Flat damage, no
     zone multipliers — a buttstroke is not aimed.
     ------------------------------------------------------------------ */

  meleeStrike(enemy, damage) {
    const p = this._sys('player');
    const enemies = this._sys('enemies');
    if (!enemy || !p) return { killed: false };
    _back.set(enemy.pos.x - p.pos.x, 0, enemy.pos.z - p.pos.z).normalize();
    const r = enemy.def ? enemy.def.radius : 0.4;
    const hh = enemy.def ? enemy.def.height * 0.5 : 0.9;
    _stage.kind = 'flesh'; _stage.zone = 'torso'; _stage.enemy = enemy;
    _stage.x = enemy.pos.x - _back.x * r;
    _stage.y = enemy.pos.y + hh;
    _stage.z = enemy.pos.z - _back.z * r;
    _stage.nx = -_back.x; _stage.ny = 0; _stage.nz = -_back.z;
    const res = enemies && enemies.damage
      ? enemies.damage(enemy, Math.max(1, Math.round(damage)),
        { zone: 'torso', point: _pt.set(_stage.x, _stage.y, _stage.z), dist: 2 })
      : { killed: false };
    this._land(_stage, Math.max(1, Math.round(damage)), 2, false, !!res.killed, false, 'melee');
    const cam = this._sys('camera');
    if (cam && cam.addTrauma) cam.addTrauma(0.22);
    return res;
  }

  /**
   * M0's melee: with no enemies in the world, the swing resolves against the
   * world so the whole timeline is provable tonight. Two probes — along the
   * aim, and one biased down, which is the flat version of the ySquash that
   * makes a swing an arc instead of a ray. Returns true if it connected.
   */
  meleeSweep(range, damage) {
    const p = this._sys('player');
    const cam = this._sys('camera');
    if (!p || !cam) return false;
    const oy = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
    for (let probe = 0; probe < 2; probe++) {
      cam.aimDir(_d);
      let dx = _d.x, dy = _d.y, dz = _d.z;
      if (probe === 1) {
        // The squashed-cone probe, flattened to a second ray. In squashed
        // space one metre of vertical costs ySquash metres of lateral, so the
        // downward bias is (1 - ySquash): reach for something shorter than you.
        dy -= (1 - CFG.weapons.melee.ySquash);
        const inv = 1 / Math.max(1e-6, Math.hypot(dx, dy, dz));
        dx *= inv; dy *= inv; dz *= inv;
      }
      const h = this._trace(p.pos.x, oy, p.pos.z, dx, dy, dz, range);
      if (h) {
        this._land(h, Math.max(1, Math.round(damage)), h.t, false, false, false, 'melee');
        return true;
      }
    }
    return false;
  }

  /* ---- test probe: fire a ray with no gun and no ammo ---- */
  probe(ox, oy, oz, dx, dy, dz, maxT = MAXT) {
    const inv = 1 / Math.max(1e-6, Math.hypot(dx, dy, dz));
    const h = this._trace(ox, oy, oz, dx * inv, dy * inv, dz * inv, maxT);
    return h ? { t: h.t, kind: h.kind, x: h.x, y: h.y, z: h.z, zone: h.zone } : null;
  }

  step(dt) {
    if (this.lastHit && this.lastHit.lit > 0) {
      this.lastHit.lit = Math.max(0, this.lastHit.lit - dt);
    }
  }

  dump() {
    return {
      shots: this.shots, hits: this.hits, misses: this.misses,
      pens: this.pens, ghosts: this.ghosts,
      lastHit: this.lastHit,
      // THE ONE LAW as an assertion a test can read in one line: not one
      // landing in this session dealt less than 1 hp, and every landing lit
      // what it hit for LIT_S. If `ghosts` is ever non-zero the law is broken.
      lawOk: this.ghosts === 0,
      litSeconds: LIT_S,
    };
  }
}

/* One shared hit record and one shared exit record. The trace fills them and
   the caller consumes them before the next call — no per-shot allocation. */
const _stage = {
  hit: false, t: 0, kind: 'dirt', zone: null, enemy: null, exit: false, boss: false,
  x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
};
const _exitRec = {
  hit: true, t: 0, kind: 'dirt', zone: null, enemy: null, exit: true, boss: false,
  x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
};

export default Combat;
