// CURFEW — movement that does not embarrass itself.
//
// There is no navmesh and there is not going to be one: the county is 4 x 4 km
// of analytic terrain that streams, and a grid big enough to cover it is a grid
// nobody can afford to rebuild. So navigation here is three cheap things:
//
//   1. STEER on the analytic ground. terrain.heightAt is the only ground truth
//      and nothing raycasts the mesh (world's guarantee A.1/A.2).
//   2. AVOID trunks by asking collision.canOccupy about a few whiskers ahead
//      and sliding along the first clear one. The trunk colliders are already
//      exactly trunk-sized — that was M0's last blocker — so this is enough.
//   3. NOTICE when it is not working. MARROW's best-distance-so-far watchdog:
//      keep the closest approach ever made to the target, and when it stops
//      improving for long enough, relocate — but ONLY somewhere the player
//      cannot see, because a body that pops is a bug and a body that was
//      already there when you turned round is the game.
//      donor: qualiacology/marrow/src/world/navgrid.js:124-149 (_nearestReached
//      + randomReachedNear: 're-emerge the hunter somewhere it could genuinely
//      have walked to') and entity.js:355-356 (observedTime, +1x watched /
//      -2x not, which is why relocation is keyed to ATTENTION and not a timer)
//
// Every function here is allocation-free and takes its output vector in. All
// scratch is module scope. Nothing in this file holds a reference to a system:
// they are all read lazily off ctx.systems at the call, per the CONTRACT.

import * as THREE from 'three';
import { TAU } from '../engine/math.js';
import { CFG } from '../config.js';

/* Tuning. CFG has no enemies/nav block; docs/HANDOFF.md carries the request.
   Every one of these is a local const with its reason beside it. */
export const NAV = Object.freeze({
  // Whiskers. Lookahead shorter than a frame's travel fights the damped
  // velocity and produces jitter — VIGIL's ramp comment, the Eclipse lesson.
  // A body at 7.8 m/s covers 0.13 m in a step, so 1.1 m is eight frames of
  // warning and still inside a 2 m tree gap.
  LOOKAHEAD_MIN: 1.10,
  LOOKAHEAD_MUL: 0.26,          // seconds of travel added to the minimum
  WHISKERS: [0.00, 0.39, -0.39, 0.79, -0.79, 1.24, -1.24],  // radians off the desired heading
  PROBE_EVERY: 3,               // frames between avoidance probes, staggered by id

  // Stuck. MARROW's rule with a horror-game's patience: six seconds of no
  // improvement is a long time to watch something scrabble at a trunk.
  PROGRESS_EPS: 0.35,           // metres of improvement that counts as progress
  PATIENCE: 6.0,                // seconds without progress before it is stuck
  STUCK_MIN_DIST: 16,           // never relocate something already on top of you

  // Relocation, and the director's placement laws it must not break
  // (CFG.director.spawn: minDist 14, viewCone 90, annulus 26-56).
  RELOC_TRIES: 12,
  RELOC_MIN: 22, RELOC_MAX: 46,
  RELOC_OFF_ROAD: 3.4,          // metres clear of a road surface: they come from cover

  // Ground follow. Damped, never snapped — a snapped body reads as a decal.
  GROUND_LAMBDA: 16,
  GROUND_TELEPORT: 2.5,         // metres of disagreement that means "it moved", not "it stepped"
});

const _aim = new THREE.Vector3();
const _out = { x: 0, z: 0, blocked: false };

/* ------------------------------------------------------------------ ground -- */

/** The ONE ground truth. Returns 0 if terrain is not up yet — never throws. */
export function groundY(ctx, x, z) {
  const t = ctx.systems.get ? ctx.systems.get('terrain') : ctx.systems.terrain;
  if (!t || typeof t.heightAt !== 'function') return 0;
  const h = t.heightAt(x, z);
  return Number.isFinite(h) ? h : 0;
}

/** Steepness 0..1 at a point; used to refuse a spawn on a cliff. */
export function slope(ctx, x, z) {
  const t = sysOf(ctx, 'terrain');
  if (!t || typeof t.slopeAt !== 'function') return 0;
  const s = t.slopeAt(x, z);
  return Number.isFinite(s) ? s : 0;
}

export function sysOf(ctx, id) {
  const s = ctx.systems;
  if (!s) return null;
  return typeof s.get === 'function' ? s.get(id) : s[id];
}

/* ------------------------------------------------------------------ steer -- */

/**
 * Steer toward (tx, tz), avoiding trunks.
 *
 * Writes a UNIT heading into the shared result and returns it. The result is
 * module scratch: read it before the next call, never retain it. That is the
 * same convention terrain.normalAt and chunks' event payload already use.
 *
 * @param e  the enemy record. Reads e.pos, e.def.radius/height, e.id, and
 *           caches its own avoidance heading on e._navYaw / e._navProbe.
 */
export function steer(ctx, e, tx, tz, frame) {
  const dx = tx - e.pos.x, dz = tz - e.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  _out.blocked = false;
  if (!(d > 1e-4)) { _out.x = 0; _out.z = 0; return _out; }
  const wantX = dx / d, wantZ = dz / d;

  const col = sysOf(ctx, 'collision');
  if (!col || typeof col.canOccupy !== 'function') {
    _out.x = wantX; _out.z = wantZ; return _out;
  }

  // Probe on a stagger so twenty-four bodies are not all asking the broadphase
  // on the same frame. Between probes the last accepted heading is REUSED —
  // which is also what stops a body flickering between two equal detours.
  const due = ((frame + e.id) % NAV.PROBE_EVERY) === 0;
  if (!due && e._navValid) {
    _out.x = Math.cos(e._navYaw); _out.z = Math.sin(e._navYaw);
    _out.blocked = e._navBlocked;
    return _out;
  }

  const r = e.def.radius;
  const h = Math.min(e.def.height, 1.9);        // probe at body height, not at the crown
  const speed = Math.abs(e.speedWant || e.def.speed);
  const look = Math.max(NAV.LOOKAHEAD_MIN, speed * NAV.LOOKAHEAD_MUL);
  const base = Math.atan2(wantZ, wantX);

  for (let i = 0; i < NAV.WHISKERS.length; i++) {
    const a = base + NAV.WHISKERS[i];
    const cx = Math.cos(a), cz = Math.sin(a);
    // two samples down the whisker: a half step and a full one. One sample
    // walks a body's shoulder into a trunk it cleared at the tip.
    if (!col.canOccupy(e.pos.x + cx * look * 0.5, e.pos.z + cz * look * 0.5, r, h)) continue;
    if (!col.canOccupy(e.pos.x + cx * look, e.pos.z + cz * look, r, h)) continue;
    e._navYaw = a;
    e._navValid = true;
    e._navBlocked = i !== 0;
    _out.x = cx; _out.z = cz; _out.blocked = i !== 0;
    return _out;
  }

  // Boxed in on every whisker. Keep the desired heading rather than stopping:
  // collision.resolveCapsule is the mover and it will slide us along whatever
  // we are actually touching, and a body that stops dead in a thicket reads as
  // broken where one that grinds forward reads as trying.
  e._navYaw = base;
  e._navValid = true;
  e._navBlocked = true;
  _out.x = wantX; _out.z = wantZ; _out.blocked = true;
  return _out;
}

/* ---------------------------------------------------------------- progress -- */

/** Reset the watchdog. Call on spawn, on relocate, and on a target change. */
export function resetProgress(e, tx, tz) {
  const dx = tx - e.pos.x, dz = tz - e.pos.z;
  e.navBest = Math.sqrt(dx * dx + dz * dz);
  e.navBestT = 0;
}

/**
 * MARROW's best-distance-so-far. Returns true the moment the body has stopped
 * getting closer for NAV.PATIENCE seconds. Distance, not position: a body
 * circling a target at a constant radius is not stuck, it is orbiting, and a
 * position-delta watchdog would relocate it for doing its job.
 */
export function progress(e, dt, tx, tz) {
  const dx = tx - e.pos.x, dz = tz - e.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (e.navBest === undefined || d < e.navBest - NAV.PROGRESS_EPS) {
    e.navBest = d;
    e.navBestT = 0;
    return false;
  }
  e.navBestT = (e.navBestT || 0) + dt;
  return e.navBestT > NAV.PATIENCE;
}

/* -------------------------------------------------------------- attention -- */

/**
 * Is the point (x, y, z) inside the player's attention?
 *
 * cone dot AND an unblocked ray, exactly as the Standing Kind's rule is
 * written: "42 m cone dot > 0.28 AND an unblocked ray to the head". The ray is
 * collision.segmentClear, which is one SIGHT-masked raycast with no ground
 * march — cheap enough to run per enemy on the perception tick.
 */
export function observed(ctx, x, y, z, coneDot, maxRange) {
  const p = sysOf(ctx, 'player');
  const cam = sysOf(ctx, 'camera');
  if (!p || !cam) return false;
  const ex = p.pos.x, ey = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE, ez = p.pos.z;
  const dx = x - ex, dy = y - ey, dz = z - ez;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d > maxRange) return false;
  if (d < 1e-4) return true;
  cam.aimDir(_aim);
  const dot = (dx * _aim.x + dy * _aim.y + dz * _aim.z) / d;
  if (dot < coneDot) return false;
  const col = sysOf(ctx, 'collision');
  if (col && typeof col.segmentClear === 'function') {
    return col.segmentClear(ex, ey, ez, x, y, z);
  }
  return true;
}

/**
 * WHERE IS THIS THING RELATIVE TO WHAT THE PLAYER IS LOOKING AT?
 *
 * Returns the cosine between the camera's forward — flattened to the ground,
 * the plane every enemy decision is already made in — and the bearing to
 * (x, z): +1 dead ahead, 0 exactly beside, -1 directly behind the head.
 *
 * This exists because of a measurement, not a theory. `tools/whatkilledme.mjs
 * --play 75`, run on 2026-09-02 exactly as Alex played — walk forward from the
 * spawn, never shoot — recorded fifteen hits and ELEVEN of them came from
 * behind him: bearings of -1.00, -0.99, -0.96, -0.94, -0.79, -0.69. Every one
 * of those hits obeyed the telegraph law and every one of those telegraphs
 * fired where he could not receive it. A 320 ms rim flare behind the player's
 * head is not a tell, and "I am never sure why" is what that measures as in a
 * chair.
 *
 * It is the CHEAP half of observed(): no raycast and no range test, so it is
 * affordable on every perception tick for every body. It answers 1 — "in front
 * of you" — when there is no camera at all, so a headless harness with no view
 * never deadlocks a pack that is waiting to be seen.
 */
export function bearingDot(ctx, x, z) {
  const p = sysOf(ctx, 'player');
  const cam = sysOf(ctx, 'camera');
  if (!p || !cam || typeof cam.aimDir !== 'function') return 1;
  cam.aimDir(_aim);
  const fl = Math.sqrt(_aim.x * _aim.x + _aim.z * _aim.z);
  if (fl < 1e-5) return 1;
  const dx = x - p.pos.x, dz = z - p.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1e-5) return 1;
  return (dx * _aim.x + dz * _aim.z) / (d * fl);
}

/**
 * The angle the player is FACING, in the same convention the ring slots use: a
 * point at angle `a` and radius `r` is (p.x + cos(a) * r, p.z + sin(a) * r).
 * A body that has to come round into view steers to an arc measured off this.
 * Returns null when there is no camera, and every caller reads that as "nobody
 * is looking, come straight in".
 */
export function aimAngle(ctx) {
  const cam = sysOf(ctx, 'camera');
  if (!cam || typeof cam.aimDir !== 'function') return null;
  cam.aimDir(_aim);
  if (Math.abs(_aim.x) < 1e-6 && Math.abs(_aim.z) < 1e-6) return null;
  return Math.atan2(_aim.z, _aim.x);
}

/**
 * Is the point inside the TORCH beam? The Pale's whole rule, and the poacher's
 * accuracy trade, are both this number. The torch is a real light in the census
 * so its state comes from lights.torchOn(), never from an input flag.
 * donor: qualiacology/still/src/game/floors.js:386-389 (flashOn && dot > 0.82
 *        && d < 16 && segmentClear)
 */
export function lit(ctx, x, y, z, coneDot, range) {
  const lights = sysOf(ctx, 'lights');
  if (!lights || typeof lights.torchOn !== 'function' || !lights.torchOn()) return false;
  return observed(ctx, x, y, z, coneDot, range);
}

/** Unblocked ray from the player's eye to a point. No cone, no range. */
export function visible(ctx, x, y, z) {
  const p = sysOf(ctx, 'player');
  const col = sysOf(ctx, 'collision');
  if (!p) return false;
  if (!col || typeof col.segmentClear !== 'function') return true;
  const ey = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
  return col.segmentClear(p.pos.x, ey, p.pos.z, x, y, z);
}

/* -------------------------------------------------------------- relocation -- */

/**
 * Find somewhere this body could plausibly have walked to, that the player
 * cannot currently see. Writes { x, z } into `out` and returns true, or returns
 * false and leaves `out` alone — REFUSING rather than clipping, which is
 * UNINVITED's placement law and the reason its scares never spawned in a wall.
 *
 * The rejections, in the order they are cheapest:
 *   too close            (CFG.director.spawn.minDist — the director's own law)
 *   inside the view cone (CFG.director.spawn.viewCone, measured on the camera's
 *                         REAL forward, not the player's yaw)
 *   on a road surface    (they come from cover, never off the tarmac)
 *   too steep            (terrain.slopeAt)
 *   not occupiable       (collision.canOccupy — the last and priciest question)
 */
export function relocate(ctx, e, rng, out) {
  const p = sysOf(ctx, 'player');
  const cam = sysOf(ctx, 'camera');
  const col = sysOf(ctx, 'collision');
  if (!p) return false;

  const minDist = CFG.director.spawn.minDist;
  const cosCone = Math.cos((CFG.director.spawn.viewCone * 0.5) * Math.PI / 180);
  const roads = sysOf(ctx, 'roads');
  const ey = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
  if (cam) cam.aimDir(_aim);

  for (let i = 0; i < NAV.RELOC_TRIES; i++) {
    const a = rng.next() * TAU;
    // sqrt so the samples are area-uniform in the annulus rather than bunched
    // at the inner edge (CINDERBLOOM's solver does the same).
    const u = rng.next();
    const rad = Math.sqrt(NAV.RELOC_MIN * NAV.RELOC_MIN
      + u * (NAV.RELOC_MAX * NAV.RELOC_MAX - NAV.RELOC_MIN * NAV.RELOC_MIN));
    const x = p.pos.x + Math.cos(a) * rad;
    const z = p.pos.z + Math.sin(a) * rad;

    const dx = x - p.pos.x, dz = z - p.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < minDist) continue;

    if (cam) {
      const gy = groundY(ctx, x, z) + e.def.height * 0.6;
      const vy = gy - ey;
      const dd = Math.sqrt(dx * dx + vy * vy + dz * dz) || 1;
      const dot = (dx * _aim.x + vy * _aim.y + dz * _aim.z) / dd;
      // Inside the cone is only a refusal if it is also actually VISIBLE — a
      // body behind a treeline in front of you is fine, and refusing it too
      // is how a placer runs out of candidates in a forest.
      if (dot > cosCone && (!col || col.segmentClear(p.pos.x, ey, p.pos.z, x, gy, z))) continue;
    }

    if (roads && typeof roads.roadDistance === 'function') {
      if (roads.roadDistance(x, z) < NAV.RELOC_OFF_ROAD) continue;
    }
    if (slope(ctx, x, z) > 0.55) continue;
    if (col && typeof col.canOccupy === 'function'
      && !col.canOccupy(x, z, e.def.radius, e.def.height)) continue;

    out.x = x; out.z = z;
    return true;
  }
  return false;
}

/* ---------------------------------------------------------- ground follow -- */

/**
 * Damped vertical follow. NEVER a snap: a snapped body climbing a bank reads as
 * a decal sliding up a hill. A disagreement bigger than GROUND_TELEPORT means
 * the body was moved rather than walked, so that one case DOES snap.
 */
export function followGround(ctx, e, dt) {
  const g = groundY(ctx, e.pos.x, e.pos.z);
  if (Math.abs(e.pos.y - g) > NAV.GROUND_TELEPORT) { e.pos.y = g; return g; }
  e.pos.y += (g - e.pos.y) * (1 - Math.exp(-NAV.GROUND_LAMBDA * dt));
  return g;
}

/* ------------------------------------------------------------- separation --
   A uniform hash grid over a FROZEN snapshot of the crowd, so no body can react
   to another body's reaction inside the same step (which is how a pack starts
   oscillating). Cell 4 m: the largest separation radius in the roster is about
   1.1 m, so a 3x3 neighbourhood always contains every possible neighbour and
   the grid never degenerates to O(n^2). DESIGN says a 16 m grid; 16 m cells put
   the whole pack in one bucket and would BE the O(n^2) it forbids, so the
   spirit is honoured and the number is not. Noted in HANDOFF.
   -------------------------------------------------------------------------- */

const CELL = 4.0;

export class SepGrid {
  constructor(cap) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.z = new Float32Array(cap);
    this.r = new Float32Array(cap);
    this.id = new Int32Array(cap);
    this.n = 0;
    this.buckets = new Map();
    this._free = [];
  }

  begin() {
    this.n = 0;
    // recycle the arrays instead of dropping them: clearing a Map of arrays
    // every frame is the allocation this class exists to avoid
    for (const list of this.buckets.values()) { list.length = 0; this._free.push(list); }
    this.buckets.clear();
  }

  add(id, x, z, r) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.x[i] = x; this.z[i] = z; this.r[i] = r; this.id[i] = id;
    const k = key(x, z);
    let b = this.buckets.get(k);
    if (!b) { b = this._free.pop() || []; this.buckets.set(k, b); }
    b.push(i);
  }

  /**
   * Accumulate a push-out vector for one body into `out`. Reads only the frozen
   * snapshot, so the result does not depend on iteration order.
   */
  separate(id, x, z, r, out) {
    out.x = 0; out.z = 0;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const b = this.buckets.get(cellKey(cx + ox, cz + oz));
        if (!b) continue;
        for (let k = 0; k < b.length; k++) {
          const i = b[k];
          if (this.id[i] === id) continue;
          const dx = x - this.x[i], dz = z - this.z[i];
          const d2 = dx * dx + dz * dz;
          const minD = r + this.r[i] + 0.30;
          if (d2 <= 1e-6 || d2 >= minD * minD) continue;
          const d = Math.sqrt(d2);
          out.x += (dx / d) * (minD - d);
          out.z += (dz / d) * (minD - d);
        }
      }
    }
    // cap rather than speed-scale: a shove proportional to speed turns a queue
    // into a catapult the first time three bodies meet at a gate
    const l = Math.sqrt(out.x * out.x + out.z * out.z);
    if (l > 2.5) { out.x = out.x / l * 2.5; out.z = out.z / l * 2.5; }
    return out;
  }
}

function cellKey(cx, cz) { return (cx + 32768) * 65536 + (cz + 32768); }
function key(x, z) { return cellKey(Math.floor(x / CELL), Math.floor(z / CELL)); }

/* ------------------------------------------------------------------ misc -- */

/** Shortest signed angle from a to b. */
export function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

/** The facing convention for every body in CURFEW: yaw 0 looks down -Z. */
export function faceYaw(fromX, fromZ, toX, toZ) {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}

export default {
  NAV, steer, progress, resetProgress, relocate, observed, lit, visible,
  bearingDot, aimAngle,
  groundY, slope, followGround, SepGrid, faceYaw, angleDelta, sysOf,
};
