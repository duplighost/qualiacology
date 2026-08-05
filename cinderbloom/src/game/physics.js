// =============================================================================
// CINDERBLOOM — physics: broadphase, raycasts, rigid debris, ragdolls.
// Owner: physics agent. CONTRACT §4. Everything here is allocation-free in the
// steady state: every query writes into a caller-supplied (or pooled) record.
// =============================================================================
//
// ## PUBLIC API — weapons.js, enemies.js, combat.js, vfx.js, player.js
//
// ### 1. Raycasting — the one call the whole game uses
//
//     import { PH } from './physics.js';
//     const hit = ctx.sys.physics.raycast(ox,oy,oz, dx,dy,dz, maxT, mask, out);
//
// `dx,dy,dz` need NOT be normalised (it is done for you). `mask` is a bitfield
// from `PH.MASK` — default `PH.MASK.ALL`. `out` is an optional record to write
// into; omit it and you get physics' own scratch record, which is valid until
// your next raycast. Returns `null` on a miss.
//
//     hit = {
//       t,              // metres along the unit direction
//       x, y, z,        // world hit point
//       nx, ny, nz,     // unit world surface normal
//       kind,           // 'terrain' | 'prop' | 'actor' | 'water'
//       surface,        // vfx surface name: ash|rock|sinter|glass|flora|coal|metal|flesh
//       penCm,          // COMBAT_FEEL §4.8 penetration depth of this material, cm
//       tag,            // prop class name, or actor part name
//       actor,          // actor record when kind === 'actor', else null
//       part,           // part record when kind === 'actor', else null
//       zone,           // 'head'|'torso'|'limb'|'plate'|'vent' when kind === 'actor'
//     }
//
// Convenience wrappers, same record shape:
//
//     physics.raycastWorld(...)                 // terrain + props + water
//     physics.raycastCamera(maxT, out)          // down the game camera's forward
//     physics.meleeCast(..., range, out, radius) // swept creature volume + world
//     physics.groundY(x, z)                     // terrain, or the prop on top of it
//     physics.surfaceAt(x, z)                   // surface NAME of the ground there
//
// ### 2. Actors — capsules with hit zones
//
//     const a = physics.addActor({ kind:'skitter', x, y, z, yaw, hp, obj });
//     physics.removeActor(a);
//     physics.actors            // live array
//     a.setPose(x, y, z, yaw)   // call every frame from enemies.js
//
// `kind` selects a default part set from `ACTOR_KINDS` (skitter / carapace /
// bloomspitter / player) with COMBAT_FEEL §6.1 dimensions and hit zones. Pass
// your own `parts:[...]` to override. Parts are authored in LOCAL space
// (+Y up, −Z forward) and transformed by the actor's yaw once per frame.
// `a.ventOpen` gates the Carapace's dorsal vents: a `gate:'ventOpen'` part
// reports zone `plate` while the gate is false.
//
// ### 3. Character collision
//
//     physics.resolveCapsule(x, y, z, radius, height, out)
//       -> out { x, y, z, n, depth, tag, grounded, groundY }
//
// `x,y,z` is the capsule's FOOT. Returns the translation to apply. Runs the
// two end spheres through props' narrowphase plus the heightfield.
//
// ### 4. Rigid bodies — debris, shells, gibs
//
//     const b = physics.spawnBody({ x,y,z, vx,vy,vz, r, life, restitution,
//                                   friction, spinX, spinY, spinZ, kind, gravity });
//     b.pos (Vector3)  b.quat (Quaternion)  b.alive  b.sleeping  b.age  b.kind
//
// Bodies are pooled (128). The caller renders them — physics only simulates.
// Poll `physics.bodies` and skip `!alive`. A body that comes to rest sleeps
// (zero cost) and dies at `life` seconds. `onLand(body, speed)` fires once, on
// the first real ground contact — that is the brass *tink*.
//
// ### 5. Ragdolls
//
//     const r = physics.spawnRagdoll(actor, { ix, iy, iz, hx, hy, hz });
//       // impulse vector + world hit point (the killing shot's bone)
//     r.points   // Float32Array [x,y,z] * n, world space — skin to these
//     r.links    // [{a, b, rest}]   r.names   r.sleeping   r.sink   r.age
//
// Verlet particles + distance constraints. Budget 6 / 4 / 2 by preset; the
// OLDEST is frozen, never deleted (COMBAT_FEEL §6.5). Corpses sink over 1200 ms
// starting at t+45 s, then retire.
//
// ### 6. Debug
//
//     ctx.debug.physics = { gravity, sleepVel, rayStep, bodyDrag, enabled }
//     physics.debugInfo()
// =============================================================================

import * as THREE from 'three';
import { clamp } from '../util/math.js';

/** Bitmask + shared material tables. Imported by combat.js. */
export const PH = {
  MASK: { TERRAIN: 1, PROPS: 2, ACTORS: 4, WATER: 8, WORLD: 1 | 2 | 8, ALL: 15 },
  /** COMBAT_FEEL §4.8 — equivalent depth in cm this round defeats. */
  PEN_CM: {
    flora: 40, metal: 8, chitin: 6, ash: 4, coal: 4,
    rock: 1.5, sinter: 1.5, glass: 1.2, flesh: 12, plate: 0, water: 60,
  },
};

/**
 * Default hit-zone rigs. COMBAT_FEEL §6.1 heights, §3.3 zones.
 * Local space: +Y up, −Z forward, metres. `r` is the shape radius.
 * enemies.js may pass its own `parts` and ignore all of this.
 */
export const ACTOR_KINDS = {
  // RIG RULE, learned by measuring: a part whose surface lies entirely inside
  // another part is DEAD GEOMETRY — the nearest-hit trace can never reach it, so
  // that hit zone silently does not exist. The first cut of this table buried
  // the Skitter's head inside its thorax and put every weak point on the back.
  // `tests/_scratch/combatprobe.mjs` walks every part from 8 bearings and
  // asserts each one is reachable from at least one of them.
  skitter: {
    height: 1.10, radius: 0.30, hp: 55, mass: 42,
    parts: [
      { name: 'head', zone: 'head', t: 'sphere', x: 0, y: 0.93, z: -0.24, r: 0.17 },
      { name: 'bloom', zone: 'vent', t: 'sphere', x: 0, y: 0.66, z: -0.36, r: 0.15 },
      { name: 'thorax', zone: 'torso', t: 'capsule', x: 0, y: 0.44, z: 0.14, x1: 0, y1: 0.68, z1: -0.06, r: 0.23 },
      { name: 'legL', zone: 'limb', t: 'capsule', x: -0.30, y: 0.10, z: 0.08, x1: -0.15, y1: 0.50, z1: 0.04, r: 0.085 },
      { name: 'legR', zone: 'limb', t: 'capsule', x: 0.30, y: 0.10, z: 0.08, x1: 0.15, y1: 0.50, z1: 0.04, r: 0.085 },
    ],
    bones: ['head', 'chest', 'hips', 'footL', 'footR'],
    bonePos: [[0, 0.93, -0.24], [0, 0.68, -0.06], [0, 0.42, 0.14], [-0.28, 0.09, 0.08], [0.28, 0.09, 0.08]],
  },
  carapace: {
    height: 2.40, radius: 0.72, hp: 340, mass: 640,
    parts: [
      { name: 'head', zone: 'head', t: 'sphere', x: 0, y: 2.14, z: -0.34, r: 0.28 },
      { name: 'plateFront', zone: 'plate', t: 'capsule', x: -0.44, y: 1.26, z: -0.34, x1: 0.44, y1: 1.26, z1: -0.34, r: 0.52 },
      { name: 'ventL', zone: 'vent', gate: 'ventOpen', t: 'sphere', x: -0.32, y: 1.92, z: 0.30, r: 0.19 },
      { name: 'ventR', zone: 'vent', gate: 'ventOpen', t: 'sphere', x: 0.32, y: 1.92, z: 0.30, r: 0.19 },
      { name: 'abdomen', zone: 'torso', t: 'capsule', x: 0, y: 1.16, z: 0.34, x1: 0, y1: 1.58, z1: 0.62, r: 0.46 },
      { name: 'legL', zone: 'limb', t: 'capsule', x: -0.74, y: 0.08, z: 0.10, x1: -0.48, y1: 1.02, z1: 0.02, r: 0.15 },
      { name: 'legR', zone: 'limb', t: 'capsule', x: 0.74, y: 0.08, z: 0.10, x1: 0.48, y1: 1.02, z1: 0.02, r: 0.15 },
    ],
    bones: ['head', 'chest', 'hips', 'footL', 'footR'],
    bonePos: [[0, 2.14, -0.34], [0, 1.50, -0.10], [0, 1.12, 0.34], [-0.70, 0.10, 0.10], [0.70, 0.10, 0.10]],
  },
  bloomspitter: {
    height: 1.80, radius: 0.42, hp: 120, mass: 130,
    parts: [
      { name: 'head', zone: 'head', t: 'sphere', x: 0, y: 1.58, z: -0.16, r: 0.20 },
      // the sac is the telegraph AND the weak point (§6.2), so it must face the
      // player: local −Z is forward.
      { name: 'sac', zone: 'vent', t: 'sphere', x: 0, y: 1.04, z: -0.30, r: 0.27 },
      { name: 'stalk', zone: 'torso', t: 'capsule', x: 0, y: 0.34, z: 0.10, x1: 0, y1: 1.36, z1: 0.02, r: 0.22 },
      { name: 'root', zone: 'limb', t: 'capsule', x: -0.28, y: 0.06, z: 0.12, x1: 0.28, y1: 0.06, z1: -0.12, r: 0.15 },
    ],
    bones: ['head', 'chest', 'hips', 'rootL', 'rootR'],
    bonePos: [[0, 1.58, -0.16], [0, 1.14, -0.06], [0, 0.58, 0.10], [-0.26, 0.06, 0.12], [0.26, 0.06, -0.12]],
  },
  player: {
    height: 1.80, radius: 0.36, hp: 100, mass: 82,
    parts: [
      { name: 'head', zone: 'head', t: 'sphere', x: 0, y: 1.62, z: 0, r: 0.16 },
      { name: 'torso', zone: 'torso', t: 'capsule', x: 0, y: 0.86, z: 0, x1: 0, y1: 1.46, z1: 0, r: 0.28 },
      { name: 'legs', zone: 'limb', t: 'capsule', x: 0, y: 0.14, z: 0, x1: 0, y1: 0.84, z1: 0, r: 0.22 },
    ],
    bones: ['head', 'chest', 'hips', 'footL', 'footR'],
    bonePos: [[0, 1.62, 0], [0, 1.30, 0], [0, 0.90, 0], [-0.18, 0.06, 0], [0.18, 0.06, 0]],
  },
};

/** props tag -> the vfx surface name a bullet hitting it should produce. */
const PROP_SURFACE = {
  boulder: 'rock', hoodoo: 'rock', fin: 'rock', arch: 'rock',
  kiln: 'sinter', stump: 'flora', log: 'flora',
};

const RAGDOLL_BUDGET = { low: 2, medium: 4, high: 6, ultra: 6 };

const newHit = () => ({
  t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
  kind: null, surface: 'ash', penCm: 4, tag: null,
  actor: null, part: null, zone: null,
  // --- the enemies.js bridge (see `_rayCreatures`). `creature` is non-null only
  // when the hit came from a real enemies.js SkinnedMesh rather than one of our
  // own capsule actors, and it is the signal combat.js branches on.
  creature: null, mult: 1, weak: false, armour: false,
});

/**
 * enemies.js hitbox part name -> COMBAT_FEEL §3.3 zone. Its `weak` and `armour`
 * flags win over the name, so this only has to classify the ordinary boxes.
 * Kept as a table rather than a regex chain because it is on the hitscan path.
 */
const CREATURE_ZONE = {
  head: 'head', crown: 'head',
  thorax: 'torso', body: 'torso', stalk: 'torso', front: 'torso', plough: 'torso',
  legL: 'limb', legR: 'limb', root0: 'limb', root1: 'limb', root2: 'limb',
};

export class Physics {
  static id = 'physics';
  static deps = ['terrain', 'props'];

  constructor(ctx) {
    this.ctx = ctx;
    this.actors = [];
    this.bodies = [];
    this.ragdolls = [];

    // ---- scratch: every one of these exists so the hot path never allocates
    this._hit = newHit();
    this._hitA = newHit();
    this._hitB = newHit();
    this._hitC = newHit();
    this.enemies = undefined;              // resolved lazily; enemies may init after us
    this._res = { x: 0, y: 0, z: 0, n: 0, depth: 0, tag: null, grounded: false, groundY: 0 };
    this._pushA = { x: 0, y: 0, z: 0, n: 0, depth: 0, tag: null };
    this._pushB = { x: 0, y: 0, z: 0, n: 0, depth: 0, tag: null };
    this._propHit = {};
    this._n3 = new THREE.Vector3();
    this._qd = new THREE.Quaternion();
    this._bq = { w: new Float32Array(6) };
    this._freeBodies = [];
    this._bodyLive = 0;
    this._stats = { rays: 0, rayIters: 0 };
  }

  async init() {
    const { ctx } = this;
    this.terrain = ctx.sys.terrain || null;
    this.props = ctx.sys.props || null;
    this.water = null;                     // resolved lazily: water may init after us

    ctx.debug.physics = this.knobs = {
      gravity: 22.0,        // m/s^2 — matches player.js
      sleepVel: 0.16,       // m/s below which a resting body sleeps
      rayStep: 1.0,         // multiplier on the heightfield march step
      bodyDrag: 0.10,       // linear drag coefficient
      maxBodies: 128,
      enabled: true,
    };

    // Body pool. Allocated once; `alive` is the only liveness signal.
    for (let i = 0; i < this.knobs.maxBodies; i++) {
      this.bodies.push({
        i, alive: false, sleeping: false, kind: 'debris', age: 0, life: 4,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(),
        wx: 0, wy: 0, wz: 0,                 // angular velocity, rad/s
        r: 0.02, restitution: 0.32, friction: 0.55, gravity: 22, drag: 0.12,
        bounces: 0, maxBounces: 3, rest: 0, onLand: null, fade: 0.6, user: null,
      });
      this._freeBodies.push(i);
    }
  }

  // ===========================================================================
  // WORLD ACCESSORS — all null-safe, so a missing sibling degrades, never throws
  // ===========================================================================

  _waterSys() {
    if (this.water === null) this.water = this.ctx.sys.water || false;
    return this.water || null;
  }

  heightAt(x, z) { return this.terrain ? this.terrain.heightAt(x, z) : 0; }

  /**
   * Top of the world at (x,z): the heightfield, or a prop standing on it.
   *
   * `from` MATTERS and is not a performance hint. `props.surfaceAt` casts DOWN
   * from it and returns the first prop below, so passing a generous ceiling
   * finds props *above* the query point: a ragdoll clamped with `from = y + 3`
   * was teleported five metres up onto the cap of a hoodoo it was standing
   * beside. Callers doing a ground clamp must pass barely more than the point's
   * own y; only a character controller (which really does want the surface
   * under its whole capsule) should pass a ceiling.
   *
   * NB the scratch record — `props.surfaceAt`'s `hit` parameter defaults to a
   * fresh `{}`, and this is called ~20x per ragdoll per frame.
   *
   * THE DEFAULT USED TO BE `from = 1e4` AND THAT IS A TRAP THE DOC ABOVE WARNS
   * ABOUT WHILE THE SIGNATURE ENCOURAGES IT. `groundY(x, z)` is the obvious way
   * to ask "what is the floor here", and with a 10 km ceiling it answers "the
   * cap of the hoodoo 30 m above you". I lost a debugging cycle to exactly this:
   * a probe placed a test creature at `groundY(x, z)`, the placement landed on a
   * prop cap well above the terrain, every shot at it hit the prop first, and it
   * read as a broken raycast. The default is now the terrain plus a 2.2 m
   * head-clearance — tall enough to find the slab or log you are standing on,
   * short enough that it cannot find something you are standing beside. Pass an
   * explicit ceiling if you really do want one (a character controller does).
   */
  groundY(x, z, from) {
    if (from === undefined) from = this.heightAt(x, z) + 2.2;
    const g = this.heightAt(x, z);
    const p = this.props && this.props.surfaceAt
      ? this.props.surfaceAt(x, z, from, this._srfHit || (this._srfHit = {}))
      : null;
    return (p !== null && p !== undefined && p > g) ? p : g;
  }

  /**
   * Surface NAME of the ground at (x,z) — the biome/slope/wetness decision that
   * decides whether a bullet throws ash, rock chips, glass or coal. One place,
   * so vfx, audio and footsteps all agree.
   */
  surfaceAt(x, z, slope) {
    const t = this.terrain;
    if (!t) return 'ash';
    const w = this._waterSys();
    if (w && w.getDepthAt(x, z) > 0.03) return 'water';
    const s = slope !== undefined ? slope : (t.slopeAt ? t.slopeAt(x, z) : 0);
    if (t.biomeWeightAt) {
      if (t.biomeWeightAt(x, z, 'glass') > 0.5) return 'glass';
      if (t.biomeWeightAt(x, z, 'smoulder') > 0.5) return 'coal';
      const b = t.biomeAt(x, z, this._bq);
      if (b && b.crust > 0.55) return 'sinter';
    }
    // Anything this steep is exposed bedrock: ash cannot hold on it (ART §4.4).
    return s > 0.52 ? 'rock' : 'ash';
  }

  // ===========================================================================
  // RAYCAST
  // ===========================================================================

  /**
   * The unified trace. Terrain heightfield + prop colliders + actor capsules +
   * liquid surface, nearest hit wins.
   */
  raycast(ox, oy, oz, dx, dy, dz, maxT = 512, mask = PH.MASK.ALL, out) {
    const hit = out || this._hit;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let best = maxT, found = false;

    if (mask & (PH.MASK.TERRAIN | PH.MASK.WATER)) {
      const h = this._rayTerrain(ox, oy, oz, dx, dy, dz, best, mask, this._hitA);
      if (h) { best = h.t; found = true; this._copyHit(h, hit); }
    }
    if ((mask & PH.MASK.PROPS) && this.props && this.props.raycastColliders) {
      const p = this.props.raycastColliders(ox, oy, oz, dx, dy, dz, best, this._propHit);
      if (p && p.t < best) {
        best = p.t; found = true;
        hit.t = p.t; hit.x = p.x; hit.y = p.y; hit.z = p.z;
        hit.nx = p.nx; hit.ny = p.ny; hit.nz = p.nz;
        hit.kind = 'prop'; hit.tag = p.tag;
        hit.surface = PROP_SURFACE[p.tag] || 'rock';
        hit.penCm = PH.PEN_CM[hit.surface] !== undefined ? PH.PEN_CM[hit.surface] : 1.5;
        hit.actor = null; hit.part = null; hit.zone = null;
        hit.creature = null; hit.mult = 1; hit.weak = false; hit.armour = false;
      }
    }
    if (mask & PH.MASK.ACTORS) {
      const a = this._rayActors(ox, oy, oz, dx, dy, dz, best, this._hitB);
      if (a) { best = a.t; found = true; this._copyHit(a, hit); }
      const c = this._rayCreatures(ox, oy, oz, dx, dy, dz, best, this._hitC);
      if (c) { best = c.t; found = true; this._copyHit(c, hit); }
    }
    this._stats.rays++;
    return found ? hit : null;
  }

  raycastWorld(ox, oy, oz, dx, dy, dz, maxT = 512, out) {
    return this.raycast(ox, oy, oz, dx, dy, dz, maxT, PH.MASK.WORLD, out);
  }

  /**
   * Swept melee query with the same hit record as raycast(). World geometry and
   * cheap proxy actors remain exact rays; enemies.js creatures use its authored
   * bone-capsule sweep. Whichever is nearest wins, so a swing cannot pass
   * through a rock to reach a creature behind it.
   */
  meleeCast(ox, oy, oz, dx, dy, dz, maxT = 2.4, out, radius) {
    const hit = out || this._hit;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let best = maxT, found = false;

    const t = this._rayTerrain(ox, oy, oz, dx, dy, dz, best, PH.MASK.WORLD, this._hitA);
    if (t) { best = t.t; found = true; this._copyHit(t, hit); }
    if (this.props && this.props.raycastColliders) {
      const p = this.props.raycastColliders(ox, oy, oz, dx, dy, dz, best, this._propHit);
      if (p && p.t < best) {
        best = p.t; found = true;
        hit.t = p.t; hit.x = p.x; hit.y = p.y; hit.z = p.z;
        hit.nx = p.nx; hit.ny = p.ny; hit.nz = p.nz;
        hit.kind = 'prop'; hit.tag = p.tag;
        hit.surface = PROP_SURFACE[p.tag] || 'rock';
        hit.penCm = PH.PEN_CM[hit.surface] !== undefined ? PH.PEN_CM[hit.surface] : 1.5;
        hit.actor = null; hit.part = null; hit.zone = null;
        hit.creature = null; hit.mult = 1; hit.weak = false; hit.armour = false;
      }
    }

    const a = this._rayActors(ox, oy, oz, dx, dy, dz, best, this._hitB);
    if (a) { best = a.t; found = true; this._copyHit(a, hit); }

    if (this.enemies === undefined) this.enemies = this.ctx.sys.enemies || null;
    const en = this.enemies;
    if (en && typeof en.meleeSweep === 'function' && best > 0) {
      let r = null;
      try { r = en.meleeSweep(ox, oy, oz, dx, dy, dz, best, radius); } catch { r = null; }
      if (r && r.creature && r.t < best) {
        best = r.t; found = true; this._fillCreatureHit(r, hit);
      }
    }
    this._stats.rays++;
    return found ? hit : null;
  }

  /** Trace down the game camera's forward axis. Used by combat's fallback aim. */
  raycastCamera(maxT = 512, out, mask = PH.MASK.ALL) {
    const c = this.ctx.camera;
    const d = this._n3.set(0, 0, -1).applyQuaternion(c.quaternion);
    return this.raycast(c.position.x, c.position.y, c.position.z, d.x, d.y, d.z, maxT, mask, out);
  }

  /**
   * Heightfield march. Adaptive: the step is bounded by the vertical clearance,
   * which is a safe-ish sphere trace on a field whose slopes are mostly under 1,
   * plus a distance-proportional term so a 400 m trace does not cost 800
   * samples. Refines with 10 bisections — 5 cm at 50 m.
   */
  _rayTerrain(ox, oy, oz, dx, dy, dz, maxT, mask, hit) {
    const t = this.terrain;
    if (!t) return null;
    const k = this.knobs ? this.knobs.rayStep : 1;
    const w = (mask & PH.MASK.WATER) ? this._waterSys() : null;
    const wantTerrain = (mask & PH.MASK.TERRAIN) !== 0;

    let tPrev = 0;
    let hPrev = oy - t.heightAt(ox, oz);
    if (wantTerrain && hPrev <= 0) {
      // origin already underground: report an immediate hit rather than tunnelling
      this._fillTerrain(hit, 0, ox, oy, oz);
      return hit;
    }
    let wPrev = 1;
    if (w) {
      const lv = w.getLevelAt(ox, oz);
      wPrev = (lv === -Infinity) ? 1 : oy - lv;
      if (wPrev <= 0) { this._fillWater(hit, 0, ox, oy, oz); return hit; }
    }

    let tc = 0, iters = 0;
    while (tc < maxT && iters < 400) {
      iters++;
      const step = Math.max(0.30, Math.min(9.0, hPrev * 0.85 + tc * 0.02)) * k;
      tc = Math.min(tc + step, maxT);
      const px = ox + dx * tc, py = oy + dy * tc, pz = oz + dz * tc;
      const hc = py - t.heightAt(px, pz);
      if (w) {
        const lv = w.getLevelAt(px, pz);
        const wc = (lv === -Infinity) ? 1 : py - lv;
        if (wc <= 0 && wPrev > 0) {
          const f = wPrev / (wPrev - wc);
          const tt = tPrev + (tc - tPrev) * f;
          this._fillWater(hit, tt, ox + dx * tt, oy + dy * tt, oz + dz * tt);
          this._stats.rayIters += iters;
          return hit;
        }
        wPrev = wc;
      }
      if (wantTerrain && hc <= 0) {
        let a = tPrev, b = tc;
        for (let i = 0; i < 10; i++) {
          const m = (a + b) * 0.5;
          if ((oy + dy * m) - t.heightAt(ox + dx * m, oz + dz * m) > 0) a = m; else b = m;
        }
        this._fillTerrain(hit, b, ox + dx * b, oy + dy * b, oz + dz * b);
        this._stats.rayIters += iters;
        return hit;
      }
      tPrev = tc; hPrev = hc;
      if (tc >= maxT) break;
    }
    this._stats.rayIters += iters;
    return null;
  }

  _fillTerrain(hit, t, x, y, z) {
    const n = this.terrain.normalAt(x, z, this._n3);
    hit.t = t; hit.x = x; hit.y = y; hit.z = z;
    hit.nx = n.x; hit.ny = n.y; hit.nz = n.z;
    hit.kind = 'terrain'; hit.tag = null;
    hit.surface = this.surfaceAt(x, z, 1 - clamp(n.y, 0, 1));
    hit.penCm = PH.PEN_CM[hit.surface] !== undefined ? PH.PEN_CM[hit.surface] : 4;
    hit.actor = null; hit.part = null; hit.zone = null;
    hit.creature = null; hit.mult = 1; hit.weak = false; hit.armour = false;
    return hit;
  }

  _fillWater(hit, t, x, y, z) {
    hit.t = t; hit.x = x; hit.y = y; hit.z = z;
    hit.nx = 0; hit.ny = 1; hit.nz = 0;
    hit.kind = 'water'; hit.tag = null; hit.surface = 'water';
    hit.penCm = PH.PEN_CM.water;
    hit.actor = null; hit.part = null; hit.zone = null;
    hit.creature = null; hit.mult = 1; hit.weak = false; hit.armour = false;
    return hit;
  }

  _copyHit(a, b) {
    if (a === b) return b;
    b.t = a.t; b.x = a.x; b.y = a.y; b.z = a.z;
    b.nx = a.nx; b.ny = a.ny; b.nz = a.nz;
    b.kind = a.kind; b.surface = a.surface; b.penCm = a.penCm; b.tag = a.tag;
    b.actor = a.actor; b.part = a.part; b.zone = a.zone;
    b.creature = a.creature; b.mult = a.mult; b.weak = a.weak; b.armour = a.armour;
    return b;
  }

  // ---------------------------------------------------------------------------
  // THE enemies.js BRIDGE
  //
  // enemies.js does NOT register its creatures as physics actors. It grows its
  // own bone-driven capsule set per SkinnedMesh (`HITBOX`, `refreshHitboxes`)
  // and publishes `enemies.raycast(ox,oy,oz,dx,dy,dz,maxT)`. That is the right
  // design — the hitboxes have to follow the skeleton, and only enemies.js has
  // the skeleton — but it left `PH.MASK.ACTORS` finding nothing at all, so
  // `physics.actors` was empty in every vista and **every creature in the frame
  // was unshootable**. combat.js traced straight through them into the terrain
  // behind, which is why no vista had ever produced a hitmarker.
  //
  // Rather than ask enemies.js to change, `MASK.ACTORS` now means "anything
  // alive": our own capsule actors (used by the harness and by anything that
  // wants a cheap proxy) PLUS every enemies.js creature, resolved to whichever
  // is nearer. Callers keep one call and one record shape.
  //
  // The record grows four fields. `creature` non-null is the branch signal:
  // enemies.js owns that creature's damage multiplier, hit flash, impact FX,
  // stagger, death and ragdoll, so combat.js must route through
  // `enemies.applyDamage` and must NOT re-apply the multiplier or spawn a
  // second impact. `zone` and `surface` are still filled so audio, penetration
  // and the HUD do not need to know which of the two paths produced the hit.
  // ---------------------------------------------------------------------------

  _rayCreatures(ox, oy, oz, dx, dy, dz, maxT, hit) {
    if (this.enemies === undefined) this.enemies = this.ctx.sys.enemies || null;
    const en = this.enemies;
    if (!en || typeof en.raycast !== 'function' || maxT <= 0) return null;
    // enemies.raycast seeds its own `bestT` with maxT and rejects anything
    // further, so passing the running best keeps nearest-hit ordering correct
    // across the two actor sources without a second comparison here.
    let r = null;
    // A regular ray is always a ray. Melee uses meleeCast(), so the old hidden
    // active-window auto-sweep can no longer alter unrelated short traces.
    try { r = en.raycast(ox, oy, oz, dx, dy, dz, maxT, 0); } catch { return null; }
    if (!r || !r.creature || !(r.t < maxT)) return null;
    return this._fillCreatureHit(r, hit);
  }

  _fillCreatureHit(r, hit) {
    hit.t = r.t; hit.x = r.x; hit.y = r.y; hit.z = r.z;
    hit.nx = r.nx; hit.ny = r.ny; hit.nz = r.nz;
    hit.kind = 'actor';
    hit.actor = null;                        // not one of ours
    hit.creature = r.creature;
    hit.part = null;
    hit.tag = r.part || 'body';
    hit.mult = r.mult !== undefined ? r.mult : 1;
    hit.weak = !!r.weak;
    hit.armour = !!r.armour;
    hit.zone = hit.armour ? 'plate' : hit.weak ? 'vent' : (CREATURE_ZONE[hit.tag] || 'torso');
    hit.surface = hit.armour ? 'chitin' : 'flesh';
    hit.penCm = hit.armour ? PH.PEN_CM.plate : PH.PEN_CM.flesh;
    return hit;
  }

  // ---------------------------------------------------------------------------
  // actor capsules
  // ---------------------------------------------------------------------------

  _rayActors(ox, oy, oz, dx, dy, dz, maxT, hit) {
    let best = maxT, found = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.alive || a.noHit) continue;
      // cheap reject against the actor's bounding sphere first
      const cx = a.x - ox, cy = a.y + a.height * 0.5 - oy, cz = a.z - oz;
      const proj = cx * dx + cy * dy + cz * dz;
      const br = a.height * 0.5 + a.radius + 0.2;
      if (proj < -br || proj - br > best) continue;
      const d2 = cx * cx + cy * cy + cz * cz - proj * proj;
      if (d2 > br * br) continue;

      const w = a._world;
      for (let p = 0; p < a.parts.length; p++) {
        const pr = a.parts[p], o = p * 7;
        const t = (pr.t === 'sphere')
          ? raySphere(ox, oy, oz, dx, dy, dz, w[o], w[o + 1], w[o + 2], w[o + 6])
          : rayCapsule(ox, oy, oz, dx, dy, dz, w[o], w[o + 1], w[o + 2], w[o + 3], w[o + 4], w[o + 5], w[o + 6]);
        if (t < 0 || t >= best) continue;
        best = t; found = true;
        const hx = ox + dx * t, hy = oy + dy * t, hz = oz + dz * t;
        // normal from the medial axis, which is exact for both shapes
        let ax = w[o], ay = w[o + 1], az = w[o + 2];
        if (pr.t !== 'sphere') {
          const ex = w[o + 3] - ax, ey = w[o + 4] - ay, ez = w[o + 5] - az;
          const dd = ex * ex + ey * ey + ez * ez;
          let u = dd > 1e-9 ? ((hx - ax) * ex + (hy - ay) * ey + (hz - az) * ez) / dd : 0;
          u = u < 0 ? 0 : u > 1 ? 1 : u;
          ax += ex * u; ay += ey * u; az += ez * u;
        }
        const nx = hx - ax, ny = hy - ay, nz = hz - az;
        const nl = Math.hypot(nx, ny, nz) || 1;
        hit.t = t; hit.x = hx; hit.y = hy; hit.z = hz;
        hit.nx = nx / nl; hit.ny = ny / nl; hit.nz = nz / nl;
        hit.kind = 'actor'; hit.actor = a; hit.part = pr; hit.tag = pr.name;
        const zone = (pr.gate && !a[pr.gate]) ? 'plate' : pr.zone;
        hit.zone = zone;
        hit.surface = (zone === 'plate') ? 'metal' : 'flesh';
        hit.penCm = (zone === 'plate') ? PH.PEN_CM.plate : PH.PEN_CM.flesh;
        hit.creature = null;
        hit.mult = zone === 'head' ? 1.60 : zone === 'vent' ? 2.40 : zone === 'plate' ? 0.55 : zone === 'limb' ? 0.85 : 1.0;
        hit.weak = zone === 'vent'; hit.armour = zone === 'plate';
      }
    }
    return found ? hit : null;
  }

  // ===========================================================================
  // ACTORS
  // ===========================================================================

  addActor(o = {}) {
    const K = ACTOR_KINDS[o.kind] || ACTOR_KINDS.skitter;
    const parts = o.parts || K.parts;
    const self = this;
    const a = {
      id: o.id !== undefined ? o.id : (this._aid = (this._aid || 0) + 1),
      kind: o.kind || 'skitter',
      alive: true, noHit: false,
      x: o.x || 0, y: o.y || 0, z: o.z || 0, yaw: o.yaw || 0,
      height: o.height !== undefined ? o.height : K.height,
      radius: o.radius !== undefined ? o.radius : K.radius,
      hp: o.hp !== undefined ? o.hp : K.hp,
      maxHp: o.hp !== undefined ? o.hp : K.hp,
      mass: o.mass !== undefined ? o.mass : K.mass,
      ventOpen: false, dead: false, obj: o.obj || null, user: o.user || null,
      parts, _world: new Float32Array(parts.length * 7),
      bones: o.bones || K.bones, bonePos: o.bonePos || K.bonePos,
      setPose(x, y, z, yaw) {
        a.x = x; a.y = y; a.z = z; if (yaw !== undefined) a.yaw = yaw;
        self._syncActor(a);
        return a;
      },
    };
    this._syncActor(a);
    this.actors.push(a);
    return a;
  }

  removeActor(a) {
    if (!a) return;
    a.alive = false;
    const i = this.actors.indexOf(a);
    if (i >= 0) this.actors.splice(i, 1);
  }

  /** Transform local parts into the world cache. ~30 flops per part. */
  _syncActor(a) {
    const s = Math.sin(a.yaw), c = Math.cos(a.yaw);
    const w = a._world;
    for (let i = 0; i < a.parts.length; i++) {
      const p = a.parts[i], o = i * 7;
      w[o] = a.x + p.x * c + p.z * s;
      w[o + 1] = a.y + p.y;
      w[o + 2] = a.z - p.x * s + p.z * c;
      if (p.t === 'sphere') { w[o + 3] = w[o]; w[o + 4] = w[o + 1]; w[o + 5] = w[o + 2]; }
      else {
        w[o + 3] = a.x + p.x1 * c + p.z1 * s;
        w[o + 4] = a.y + p.y1;
        w[o + 5] = a.z - p.x1 * s + p.z1 * c;
      }
      w[o + 6] = p.r;
    }
  }

  // ===========================================================================
  // CHARACTER COLLISION
  // ===========================================================================

  /**
   * Capsule vs world. `x,y,z` is the FOOT position. Writes the translation to
   * apply into `out` plus `grounded` / `groundY`.
   */
  resolveCapsule(x, y, z, radius, height, out) {
    const o = out || this._res;
    o.x = 0; o.y = 0; o.z = 0; o.n = 0; o.depth = 0; o.tag = null;
    const gy = this.groundY(x, z, y + height);
    o.groundY = gy;
    o.grounded = y <= gy + 0.06;
    if (this.props && this.props.resolveSphere) {
      const lowY = y + radius, hiY = y + Math.max(radius, height - radius);
      const a = this.props.resolveSphere(x, lowY, z, radius, this._pushA);
      const ax = a.x, ay = a.y, az = a.z, an = a.n, ad = a.depth, at = a.tag;
      const b = this.props.resolveSphere(x, hiY, z, radius, this._pushB);
      // Vertical correction from the LOW sphere is halved: taking it in full
      // makes a controller climb boulders it should walk around.
      o.x = ax + b.x; o.z = az + b.z;
      o.y = Math.max(0, ay) * 0.5 + b.y;
      o.n = an + b.n;
      o.depth = Math.max(ad, b.depth);
      o.tag = ad >= b.depth ? at : b.tag;
    }
    return o;
  }

  // ===========================================================================
  // RIGID BODIES
  // ===========================================================================

  spawnBody(o = {}) {
    if (!this._freeBodies.length) {
      // steal the oldest live body rather than dropping the request
      let oldest = -1, age = -1;
      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        if (b.alive && b.age > age) { age = b.age; oldest = i; }
      }
      if (oldest < 0) return null;
      this.killBody(this.bodies[oldest]);
    }
    const b = this.bodies[this._freeBodies.pop()];
    b.alive = true; b.sleeping = false; b.age = 0; b.bounces = 0; b.rest = 0;
    b.kind = o.kind || 'debris';
    b.life = o.life !== undefined ? o.life : 4.0;
    b.pos.set(o.x || 0, o.y || 0, o.z || 0);
    b.vel.set(o.vx || 0, o.vy || 0, o.vz || 0);
    b.quat.set(o.qx || 0, o.qy || 0, o.qz || 0, o.qw !== undefined ? o.qw : 1);
    b.wx = o.spinX || 0; b.wy = o.spinY || 0; b.wz = o.spinZ || 0;
    b.r = o.r !== undefined ? o.r : 0.02;
    b.restitution = o.restitution !== undefined ? o.restitution : 0.32;
    b.friction = o.friction !== undefined ? o.friction : 0.55;
    b.gravity = o.gravity !== undefined ? o.gravity : this.knobs.gravity;
    b.drag = o.drag !== undefined ? o.drag : this.knobs.bodyDrag;
    b.maxBounces = o.maxBounces !== undefined ? o.maxBounces : 3;
    b.fade = o.fade !== undefined ? o.fade : 0.6;
    b.onLand = o.onLand || null;
    b.user = o.user || null;
    this._bodyLive++;
    return b;
  }

  killBody(b) {
    if (!b || !b.alive) return;
    b.alive = false; b.onLand = null; b.user = null;
    this._freeBodies.push(b.i);
    this._bodyLive--;
  }

  _stepBodies(dt) {
    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b.alive) continue;
      b.age += dt;
      if (b.age >= b.life) { this.killBody(b); continue; }
      if (b.sleeping) continue;

      b.vel.y -= b.gravity * dt;
      const dmp = 1 - Math.min(0.9, b.drag * dt);
      b.vel.x *= dmp; b.vel.y *= dmp; b.vel.z *= dmp;
      b.pos.x += b.vel.x * dt; b.pos.y += b.vel.y * dt; b.pos.z += b.vel.z * dt;

      // integrate orientation from angular velocity (exponential map)
      const wl = Math.hypot(b.wx, b.wy, b.wz);
      if (wl > 1e-4) {
        const ang = wl * dt * 0.5, s = Math.sin(ang) / wl;
        this._qd.set(b.wx * s, b.wy * s, b.wz * s, Math.cos(ang));
        b.quat.premultiply(this._qd).normalize();
      }

      // + 0.25, not a ceiling: see groundY's note. A generous `from` makes a
      // bouncing shell snap onto the top of the boulder it rolled past.
      // Terrain ONLY for the ground clamp. `groundY` (which consults
      // props.surfaceAt) ratchets: it returns the top of a prop the body is
      // beside, the body is lifted onto it, and next frame the search starts
      // higher still — measured, a corpse walked five metres up a hoodoo.
      // Props are handled by resolveSphere below, which pushes along the
      // shortest exit and cannot ratchet.
      const gy = this.heightAt(b.pos.x, b.pos.z) + b.r;
      if (this.props && this.props.resolveSphere && b.r > 0.005) {
        const p = this.props.resolveSphere(b.pos.x, b.pos.y, b.pos.z, b.r, this._pushA);
        if (p.n) {
          b.pos.x += p.x; b.pos.y += p.y; b.pos.z += p.z;
          const l = Math.hypot(p.x, p.y, p.z) || 1;
          const nx = p.x / l, ny = p.y / l, nz = p.z / l;
          const vn = b.vel.x * nx + b.vel.y * ny + b.vel.z * nz;
          if (vn < 0) {
            const e = b.restitution;
            b.vel.x -= (1 + e) * vn * nx; b.vel.y -= (1 + e) * vn * ny; b.vel.z -= (1 + e) * vn * nz;
            b.vel.multiplyScalar(1 - Math.min(0.8, b.friction * 0.6));
            b.bounces++;
            if (b.onLand && -vn > 0.5) { const cb = b.onLand; b.onLand = null; cb(b, -vn); }
          }
          const sp2 = b.vel.length();
          if (sp2 < this.knobs.sleepVel) { b.rest += dt; if (b.rest > 0.28) { b.sleeping = true; b.vel.set(0, 0, 0); b.wx = b.wy = b.wz = 0; } }
        }
      }
      if (b.pos.y <= gy) {
        const impact = -b.vel.y;
        b.pos.y = gy;
        const n = this.terrain ? this.terrain.normalAt(b.pos.x, b.pos.z, this._n3) : this._n3.set(0, 1, 0);
        const vn = b.vel.x * n.x + b.vel.y * n.y + b.vel.z * n.z;
        if (vn < 0) {
          const e = b.restitution;
          // split into normal (restitution) and tangential (friction) parts
          const tx = b.vel.x - vn * n.x, ty = b.vel.y - vn * n.y, tz = b.vel.z - vn * n.z;
          const f = 1 - Math.min(1, b.friction);
          b.vel.x = tx * f - vn * e * n.x;
          b.vel.y = ty * f - vn * e * n.y;
          b.vel.z = tz * f - vn * e * n.z;
          b.wx *= 0.45; b.wy *= 0.45; b.wz *= 0.45;
          b.bounces++;
          if (b.onLand && impact > 0.5) { const cb = b.onLand; b.onLand = null; cb(b, impact); }
          if (b.bounces > b.maxBounces) { b.vel.multiplyScalar(0.15); b.restitution = 0; }
        }
        const sp = b.vel.length();
        if (sp < this.knobs.sleepVel) {
          b.rest += dt;
          if (b.rest > 0.28) {
            b.sleeping = true;
            b.vel.set(0, 0, 0); b.wx = b.wy = b.wz = 0;
            b.pos.y = gy;
          }
        } else b.rest = 0;
      }
    }
  }

  // ===========================================================================
  // RAGDOLLS  — Verlet particles + distance constraints
  // ===========================================================================

  spawnRagdoll(actor, imp) {
    if (!actor) return null;
    const budget = RAGDOLL_BUDGET[this.ctx.quality.preset] || 4;
    let awake = 0;
    for (let i = 0; i < this.ragdolls.length; i++) if (!this.ragdolls[i].frozen) awake++;
    if (awake >= budget) {
      // freeze the OLDEST, never delete it (COMBAT_FEEL §6.5)
      let old = null;
      for (let i = 0; i < this.ragdolls.length; i++) {
        const r = this.ragdolls[i];
        if (!r.frozen && (!old || r.age > old.age)) old = r;
      }
      if (old) old.frozen = true;
    }
    const names = actor.bones || ACTOR_KINDS.skitter.bones;
    const bp = actor.bonePos || ACTOR_KINDS.skitter.bonePos;
    const n = names.length;
    const rd = {
      actor, names, n, age: 0, frozen: false, sleeping: false, retired: false, sink: 0,
      points: new Float32Array(n * 3),
      prev: new Float32Array(n * 3),
      links: [],
      radius: Math.max(0.08, actor.radius * 0.5),
    };
    const s = Math.sin(actor.yaw), c = Math.cos(actor.yaw);
    for (let i = 0; i < n; i++) {
      const p = bp[i];
      const x = actor.x + p[0] * c + p[2] * s;
      const y = actor.y + p[1];
      const z = actor.z - p[0] * s + p[2] * c;
      rd.points[i * 3] = x; rd.points[i * 3 + 1] = y; rd.points[i * 3 + 2] = z;
      rd.prev[i * 3] = x; rd.prev[i * 3 + 1] = y; rd.prev[i * 3 + 2] = z;
    }
    // a chain plus cross-braces keeps the silhouette from collapsing to a line
    const pairs = [[0, 1], [1, 2], [2, 3], [2, 4], [0, 2], [3, 4], [1, 3], [1, 4]];
    for (let i = 0; i < pairs.length; i++) {
      const a = pairs[i][0], b = pairs[i][1];
      if (a >= n || b >= n) continue;
      const dx = rd.points[a * 3] - rd.points[b * 3];
      const dy = rd.points[a * 3 + 1] - rd.points[b * 3 + 1];
      const dz = rd.points[a * 3 + 2] - rd.points[b * 3 + 2];
      rd.links.push({ a, b, rest: Math.hypot(dx, dy, dz) });
    }
    // killing impulse at the hit bone, COMBAT_FEEL §4.9 (clamped by the caller)
    if (imp) {
      const m = Math.max(20, actor.mass || 60);
      let bi = 1, bd = Infinity;
      if (imp.hx !== undefined) {
        for (let i = 0; i < n; i++) {
          const ddx = rd.points[i * 3] - imp.hx, ddy = rd.points[i * 3 + 1] - imp.hy, ddz = rd.points[i * 3 + 2] - imp.hz;
          const d = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d < bd) { bd = d; bi = i; }
        }
      }
      // Verlet: shifting `prev` backwards IS applying a velocity.
      const k = (1 / m) * (1 / 60);
      for (let i = 0; i < n; i++) {
        const w = i === bi ? 1.0 : 0.42;
        rd.prev[i * 3] -= imp.ix * k * w;
        rd.prev[i * 3 + 1] -= imp.iy * k * w + 0.0016;
        rd.prev[i * 3 + 2] -= imp.iz * k * w;
      }
    }
    this.ragdolls.push(rd);
    return rd;
  }

  _stepRagdolls(dt) {
    const g = this.knobs.gravity * dt * dt;
    const list = this.ragdolls;
    for (let ri = list.length - 1; ri >= 0; ri--) {
      const rd = list[ri];
      rd.age += dt;
      if (rd.age > 46.2) { list.splice(ri, 1); rd.retired = true; continue; }
      if (rd.age > 45) rd.sink = Math.min(1, (rd.age - 45) / 1.2);
      if (rd.frozen || rd.sleeping) continue;

      const p = rd.points, q = rd.prev, n = rd.n;
      let maxV = 0;
      for (let i = 0; i < n; i++) {
        const o = i * 3;
        const vx = (p[o] - q[o]) * 0.992, vy = (p[o + 1] - q[o + 1]) * 0.992, vz = (p[o + 2] - q[o + 2]) * 0.992;
        q[o] = p[o]; q[o + 1] = p[o + 1]; q[o + 2] = p[o + 2];
        p[o] += vx; p[o + 1] += vy - g; p[o + 2] += vz;
        const v = Math.hypot(vx, vy, vz) / dt;
        if (v > maxV) maxV = v;
      }
      for (let k = 0; k < 4; k++) {
        for (let l = 0; l < rd.links.length; l++) {
          const L = rd.links[l], a = L.a * 3, b = L.b * 3;
          let dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
          const d = Math.hypot(dx, dy, dz) || 1e-6;
          const diff = (d - L.rest) / d * 0.5;
          dx *= diff; dy *= diff; dz *= diff;
          p[a] += dx; p[a + 1] += dy; p[a + 2] += dz;
          p[b] -= dx; p[b + 1] -= dy; p[b + 2] -= dz;
        }
        // Terrain clamp only — see the note in _stepBodies. heightAt is a pure
        // function of (x,z) so it cannot ratchet; props.surfaceAt can.
        for (let i = 0; i < n; i++) {
          const o = i * 3;
          const gy = this.heightAt(p[o], p[o + 2]) + rd.radius;
          if (p[o + 1] < gy) {
            p[o + 1] = gy;
            // tangential friction, applied by dragging `prev` toward `p`
            q[o] += (p[o] - q[o]) * 0.35;
            q[o + 2] += (p[o + 2] - q[o + 2]) * 0.35;
          }
        }
      }
      // Props once per step, not once per relaxation pass: 5 points x 4 passes
      // would be 20 broadphase queries per ragdoll per frame for no benefit.
      if (this.props && this.props.resolveSphere) {
        for (let i = 0; i < n; i++) {
          const o = i * 3;
          const r = this.props.resolveSphere(p[o], p[o + 1], p[o + 2], rd.radius, this._pushA);
          if (r.n) { p[o] += r.x; p[o + 1] += r.y; p[o + 2] += r.z; }
        }
      }
      if (rd.age > 0.5 && maxV < 0.06) rd.sleeping = true;
    }
  }

  // ===========================================================================
  // FRAME
  // ===========================================================================

  update(dt) {
    if (this.knobs && !this.knobs.enabled) return;
    this._stepBodies(dt);
    this._stepRagdolls(dt);
  }

  /** __CB.resetAllTemporal() — a capture must not photograph a stale corpse. */
  resetTemporal() {
    for (let i = 0; i < this.bodies.length; i++) if (this.bodies[i].alive) this.killBody(this.bodies[i]);
    this.ragdolls.length = 0;
    this._stats.rays = 0; this._stats.rayIters = 0;
  }

  debugInfo() {
    let asleep = 0;
    for (let i = 0; i < this.bodies.length; i++) if (this.bodies[i].alive && this.bodies[i].sleeping) asleep++;
    return {
      actors: this.actors.length,
      bodies: this._bodyLive,
      bodiesAsleep: asleep,
      ragdolls: this.ragdolls.length,
      colliders: (this.props && this.props.colliders) ? this.props.colliders.length : 0,
      rays: this._stats.rays,
      meanRayIters: this._stats.rays ? +(this._stats.rayIters / this._stats.rays).toFixed(1) : 0,
    };
  }
}

// =============================================================================
// primitive intersections — module scope, no allocation, no `this`
// =============================================================================

/** Nearest positive root of |o + t d − c| = r. Returns −1 on a miss. */
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const mx = ox - cx, my = oy - cy, mz = oz - cz;
  const b = mx * dx + my * dy + mz * dz;
  const c = mx * mx + my * my + mz * mz - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  return t0 >= 0 ? t0 : (-b + s);
}

/**
 * Ray vs capsule (segment ab, radius r). The cylinder body is solved
 * analytically; the caps fall back to the two end spheres. −1 on a miss.
 */
function rayCapsule(ox, oy, oz, dx, dy, dz, ax, ay, az, bx, by, bz, r) {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const ll = ux * ux + uy * uy + uz * uz;
  if (ll < 1e-9) return raySphere(ox, oy, oz, dx, dy, dz, ax, ay, az, r);
  const px = ox - ax, py = oy - ay, pz = oz - az;
  const dU = dx * ux + dy * uy + dz * uz;
  const pU = px * ux + py * uy + pz * uz;
  const A = 1 - (dU * dU) / ll;
  const B = (px * dx + py * dy + pz * dz) - (pU * dU) / ll;
  const C = (px * px + py * py + pz * pz) - (pU * pU) / ll - r * r;

  let best = -1;
  if (Math.abs(A) > 1e-9) {
    const disc = B * B - A * C;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      let t = (-B - s) / A;
      if (t < 0) t = (-B + s) / A;
      if (t >= 0) {
        const h = (pU + t * dU) / ll;
        if (h >= 0 && h <= 1) best = t;
      }
    }
  } else if (C <= 0) {
    best = 0;   // parallel to the axis and already inside the cylinder
  }
  const ta = raySphere(ox, oy, oz, dx, dy, dz, ax, ay, az, r);
  if (ta >= 0 && (best < 0 || ta < best)) best = ta;
  const tb = raySphere(ox, oy, oz, dx, dy, dz, bx, by, bz, r);
  if (tb >= 0 && (best < 0 || tb < best)) best = tb;
  return best;
}
