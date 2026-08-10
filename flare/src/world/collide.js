// TAGGED COLLIDER BAKE + SWEPT CAPSULE — the only thing in the game that decides
// whether a body may be somewhere.
//
// Three inheritances, all of them scar tissue:
//
//   VANTA//9 — colliders are BAKED FROM THE WORLD MATRIX at load, tagged with
//   {tag, chamber} in the same record AI, audio occlusion and the spawn validator
//   read. One bake, one truth. And the ribbon-mesh trap: a long winding mesh that
//   follows terrain across elevation bands bakes to an AABB the size of the map
//   and becomes one giant invisible wall. Anything wider than 40 m on an axis is
//   REFUSED with a reason, never silently accepted.
//
//   RELAY//ECLIPSE — the resolver is allocation-free and multi-deck. Vertical is
//   resolved separately from horizontal, and the support test is SWEPT (highest
//   surface crossed between the previous feet and the desired feet), never a band
//   test: a band test tunnels through a platform on one frame hitch.
//
//   GROUPED G10 — the player integrates ONCE PER FIXED SUBSTEP. At FEEL.dash
//   airSpeed 28 m/s that is 0.233 m per step against 1.0 m colliders, so
//   tunnelling is structurally impossible rather than avoided by tuning. The
//   horizontal sweep is conservative advancement over the exact capsule/box
//   separation distance, so even a single oversized dt cannot pass through.
//
// NO THREE.JS IMPORT. Baking is duck-typed on `matrixWorld.elements`, which is
// what lets tests/geometry.mjs run headless in under ten seconds with no GPU.

import { FEEL } from '../feel.js';
import { clamp, TAU } from '../core/math.js';
import {
  GROUND, createGround, hasSurface,
  helixAngleAt, helixRampY, helixRailGap, helixTAt, newSurface,
} from './ground.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. The capsule and resolver constants are
// NOT duplicated here — height, radius, maxStep, groundSnap, maxSlopeCos,
// colliderCell, epsilon, maxContacts, maxDepen and the recovery ring all live in
// FEEL.move and are read from there. CONTRACT §5.
// ---------------------------------------------------------------------------
export const COLLIDE = Object.freeze({
  capacity: 4096,
  maxAabb: 40,                 // the ribbon-mesh trap, in metres, on any axis
  stepDownTol: 0.035,          // a support this far BELOW the feet still does not block
  depenIters: 4,               // DESIGN: depenetrate 4 → swept slide 5 → depenetrate
  sweepIters: 12,              // conservative-advancement budget per slide iteration
  segmentSamples: 5,           // capsule samples against a box that is not upright
  tiny: 1e-12,
  dedupeQuantum: 0.01,         // duplicate-proxy suppression grid, metres
  wallSegment: 12,             // a wall run is chopped into pieces this long
  // Broadphase cell key, PACKED rather than XOR-mixed. The usual
  // `cx*73856093 ^ cy*19349663 ^ cz*83492791` is not injective — 582 of the 1521
  // cells in a 13x9x13 block collide, and the light field is currently
  // double-counting scars because of exactly that (docs/HANDOFF.md, 2026-08-10).
  // Ten bits per axis is exact for any world inside +-512 cells (+-4 km at an
  // 8 m cell) and costs two multiplies instead of three.
  cellBias: 512,
  cellMask: 1023,
  cellSpan: 1024,
  probeApproach: 0.2,          // probeRail starts this far inside the rail
  probeSpeed: 6,
  probeSteps: 20,              // 20 * 6 * (1/120) = 1.0 m of travel: clears the rail if open
  flags: Object.freeze({ support: 1, barrier: 2, ceiling: 4 }),
  tag: Object.freeze({
    surface: 'surface', barrier: 'barrier', ceiling: 'ceiling',
    wall: 'wall', prop: 'prop', rail: 'rail', pillar: 'pillar',
  }),
  // Names that must never be baked. A route/ribbon/spline mesh is geometry the
  // player looks at, not geometry the player hits.
  blacklist: /ribbon|route|spline|trail|path|wire|cable|decal|beacon|scar/i,
});

const F = FEEL.move;
const key3 = (cx, cy, cz) =>
  ((((cx + COLLIDE.cellBias) & COLLIDE.cellMask) * COLLIDE.cellSpan)
    + ((cy + COLLIDE.cellBias) & COLLIDE.cellMask)) * COLLIDE.cellSpan
  + ((cz + COLLIDE.cellBias) & COLLIDE.cellMask);

// ---------------------------------------------------------------------------
// COLLIDER SET — struct-of-arrays, so the hot path touches typed arrays and the
// bake is the only thing that ever allocates.
// ---------------------------------------------------------------------------
export class ColliderSet {
  constructor(capacity = COLLIDE.capacity) {
    this.cap = capacity;
    this.n = 0;
    this.c = new Float64Array(capacity * 3);      // centre, world
    this.e = new Float64Array(capacity * 3);      // half extents, box space
    this.ax = new Float64Array(capacity * 9);     // three unit axes, row-major
    this.aabb = new Float64Array(capacity * 6);   // world min xyz, max xyz
    this.flags = new Uint8Array(capacity);
    this.upright = new Uint8Array(capacity);      // box local Y is world Y → exact capsule test
    this.tag = new Array(capacity).fill(null);
    this.chamber = new Array(capacity).fill(null);
    this.name = new Array(capacity).fill(null);

    this.buckets = new Map();
    this._stamp = new Int32Array(capacity);
    this._mark = 0;
    this._hits = new Int32Array(capacity);
    this.hitCount = 0;
    this._dedupe = new Set();

    /** The bake's audit trail. A refused mesh is never silent. */
    this.rejected = [];
  }

  clear() {
    this.n = 0;
    this.buckets.clear();
    this._dedupe.clear();
    this.rejected.length = 0;
    this._stamp.fill(0);
    this._mark = 0;
    this.tag.fill(null); this.chamber.fill(null); this.name.fill(null);
  }

  /** Every collider carries the same userData three other systems read. */
  userDataOf(i, out = {}) {
    out.tag = this.tag[i];
    out.chamber = this.chamber[i];
    out.name = this.name[i];
    out.flags = this.flags[i];
    return out;
  }
  tagOf(i) { return this.tag[i]; }
  chamberOf(i) { return this.chamber[i]; }
  supports(i) { return (this.flags[i] & COLLIDE.flags.support) !== 0; }
  topOf(i) { return this.aabb[i * 6 + 4]; }
  bottomOf(i) { return this.aabb[i * 6 + 1]; }

  /**
   * Add an oriented box. `axes` is nine numbers (three unit rows); omit it for
   * an axis-aligned box. Returns the index, or -1 if refused.
   */
  addBox(cx, cy, cz, hx, hy, hz, tag, chamber, flags, axes, name) {
    if (this.n >= this.cap) { this.rejected.push({ name: name || tag, reason: 'collider capacity reached' }); return -1; }

    let a0x = 1, a0y = 0, a0z = 0, a1x = 0, a1y = 1, a1z = 0, a2x = 0, a2y = 0, a2z = 1;
    if (axes) {
      a0x = axes[0]; a0y = axes[1]; a0z = axes[2];
      a1x = axes[3]; a1y = axes[4]; a1z = axes[5];
      a2x = axes[6]; a2y = axes[7]; a2z = axes[8];
      // A box is symmetric, so flipping a downward local Y costs nothing and buys
      // the exact upright capsule test below.
      if (a1y < 0) { a1x = -a1x; a1y = -a1y; a1z = -a1z; }
    }

    // World AABB of the oriented box.
    const wx = Math.abs(a0x) * hx + Math.abs(a1x) * hy + Math.abs(a2x) * hz;
    const wy = Math.abs(a0y) * hx + Math.abs(a1y) * hy + Math.abs(a2y) * hz;
    const wz = Math.abs(a0z) * hx + Math.abs(a1z) * hy + Math.abs(a2z) * hz;

    // THE RIBBON-MESH TRAP. Refuse, loudly, with the measurement in the reason.
    const span = Math.max(wx, wy, wz) * 2;
    if (span > COLLIDE.maxAabb) {
      this.rejected.push({ name: name || tag, reason: `baked AABB ${span.toFixed(1)} m exceeds ${COLLIDE.maxAabb} m`, span });
      return -1;
    }
    if (!(Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz) && hx > 0 && hy > 0 && hz > 0)) {
      this.rejected.push({ name: name || tag, reason: 'degenerate or non-finite box' });
      return -1;
    }

    // Duplicate-proxy suppression: the same box baked twice doubles its own
    // depenetration and makes a wall feel sticky for no visible reason.
    const q = COLLIDE.dedupeQuantum;
    const dk = `${Math.round(cx / q)},${Math.round(cy / q)},${Math.round(cz / q)},${Math.round(hx / q)},${Math.round(hy / q)},${Math.round(hz / q)},${flags}`;
    if (this._dedupe.has(dk)) { this.rejected.push({ name: name || tag, reason: 'duplicate proxy' }); return -1; }
    this._dedupe.add(dk);

    const i = this.n++;
    const b3 = i * 3, b6 = i * 6, b9 = i * 9;
    this.c[b3] = cx; this.c[b3 + 1] = cy; this.c[b3 + 2] = cz;
    this.e[b3] = hx; this.e[b3 + 1] = hy; this.e[b3 + 2] = hz;
    this.ax[b9] = a0x; this.ax[b9 + 1] = a0y; this.ax[b9 + 2] = a0z;
    this.ax[b9 + 3] = a1x; this.ax[b9 + 4] = a1y; this.ax[b9 + 5] = a1z;
    this.ax[b9 + 6] = a2x; this.ax[b9 + 7] = a2y; this.ax[b9 + 8] = a2z;
    this.aabb[b6] = cx - wx; this.aabb[b6 + 1] = cy - wy; this.aabb[b6 + 2] = cz - wz;
    this.aabb[b6 + 3] = cx + wx; this.aabb[b6 + 4] = cy + wy; this.aabb[b6 + 5] = cz + wz;
    this.flags[i] = flags;
    this.upright[i] = (Math.abs(a0y) < 1e-6 && Math.abs(a2y) < 1e-6 && a1y > 0) ? 1 : 0;
    this.tag[i] = tag || COLLIDE.tag.barrier;
    this.chamber[i] = chamber || null;
    this.name[i] = name || null;
    this._insert(i);
    return i;
  }

  _insert(i) {
    const c = F.colliderCell, b = i * 6;
    const x0 = Math.floor(this.aabb[b] / c), x1 = Math.floor(this.aabb[b + 3] / c);
    const y0 = Math.floor(this.aabb[b + 1] / c), y1 = Math.floor(this.aabb[b + 4] / c);
    const z0 = Math.floor(this.aabb[b + 2] / c), z1 = Math.floor(this.aabb[b + 5] / c);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const k = key3(x, y, z);
      let bucket = this.buckets.get(k);
      if (!bucket) { bucket = []; this.buckets.set(k, bucket); }
      bucket.push(i);
    }
  }

  /** Broadphase. Writes unique indices into `_hits` and returns the count. */
  query(minx, miny, minz, maxx, maxy, maxz) {
    const c = F.colliderCell;
    if (++this._mark >= 0x3fffffff) { this._stamp.fill(0); this._mark = 1; }
    const mark = this._mark;
    let n = 0;
    const x0 = Math.floor(minx / c), x1 = Math.floor(maxx / c);
    const y0 = Math.floor(miny / c), y1 = Math.floor(maxy / c);
    const z0 = Math.floor(minz / c), z1 = Math.floor(maxz / c);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const bucket = this.buckets.get(key3(x, y, z));
      if (!bucket) continue;
      for (let k = 0; k < bucket.length; k++) {
        const i = bucket[k];
        if (this._stamp[i] === mark) continue;
        this._stamp[i] = mark;
        const b = i * 6;
        if (this.aabb[b] > maxx || this.aabb[b + 3] < minx) continue;
        if (this.aabb[b + 1] > maxy || this.aabb[b + 4] < miny) continue;
        if (this.aabb[b + 2] > maxz || this.aabb[b + 5] < minz) continue;
        this._hits[n++] = i;
      }
    }
    this.hitCount = n;
    return n;
  }

  /** Largest baked AABB span on any axis — the ribbon-trap assertion, in one call. */
  maxSpan() {
    let m = 0;
    for (let i = 0; i < this.n; i++) {
      const b = i * 6;
      m = Math.max(m, this.aabb[b + 3] - this.aabb[b], this.aabb[b + 4] - this.aabb[b + 1], this.aabb[b + 5] - this.aabb[b + 2]);
    }
    return m;
  }
}

// ---------------------------------------------------------------------------
// BAKE — from the world matrix, never from authored numbers typed twice.
// ---------------------------------------------------------------------------
const _m = new Float64Array(16);
const _axes = new Float64Array(9);

function flagsFromUserData(ud) {
  let f = 0;
  if (ud.traversalSurface) f |= COLLIDE.flags.support;
  if (ud.traversalBarrier) f |= COLLIDE.flags.barrier;
  if (ud.traversalCeiling) f |= COLLIDE.flags.ceiling;
  return f;
}

function tagFromUserData(ud) {
  if (ud.tag) return ud.tag;
  if (ud.traversalSurface) return COLLIDE.tag.surface;
  if (ud.traversalCeiling) return COLLIDE.tag.ceiling;
  return COLLIDE.tag.barrier;
}

/** column-major 4x4 multiply: out = a * b, both `elements`-style. */
function mul16(a, b, out) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

function localBounds(obj, out) {
  const ud = obj.userData || {};
  if (ud.colliderHalf) {
    const ch = ud.colliderCenter || [0, 0, 0];
    out[0] = ch[0]; out[1] = ch[1]; out[2] = ch[2];
    out[3] = ud.colliderHalf[0]; out[4] = ud.colliderHalf[1]; out[5] = ud.colliderHalf[2];
    return true;
  }
  const g = obj.geometry;
  if (!g) return false;
  if (!g.boundingBox && typeof g.computeBoundingBox === 'function') g.computeBoundingBox();
  const bb = g.boundingBox;
  if (!bb) return false;
  out[0] = (bb.min.x + bb.max.x) * 0.5;
  out[1] = (bb.min.y + bb.max.y) * 0.5;
  out[2] = (bb.min.z + bb.max.z) * 0.5;
  out[3] = (bb.max.x - bb.min.x) * 0.5;
  out[4] = (bb.max.y - bb.min.y) * 0.5;
  out[5] = (bb.max.z - bb.min.z) * 0.5;
  return true;
}

const _lb = new Float64Array(6);

function bakeMatrix(set, m, lb, tag, chamber, flags, name) {
  const sx = Math.hypot(m[0], m[1], m[2]) || 1;
  const sy = Math.hypot(m[4], m[5], m[6]) || 1;
  const sz = Math.hypot(m[8], m[9], m[10]) || 1;
  _axes[0] = m[0] / sx; _axes[1] = m[1] / sx; _axes[2] = m[2] / sx;
  _axes[3] = m[4] / sy; _axes[4] = m[5] / sy; _axes[5] = m[6] / sy;
  _axes[6] = m[8] / sz; _axes[7] = m[9] / sz; _axes[8] = m[10] / sz;
  const cx = m[0] * lb[0] + m[4] * lb[1] + m[8] * lb[2] + m[12];
  const cy = m[1] * lb[0] + m[5] * lb[1] + m[9] * lb[2] + m[13];
  const cz = m[2] * lb[0] + m[6] * lb[1] + m[10] * lb[2] + m[14];
  return set.addBox(cx, cy, cz, lb[3] * sx, lb[4] * sy, lb[5] * sz, tag, chamber, flags, _axes, name);
}

/**
 * Bake one object. Returns the number of colliders added (an InstancedMesh adds
 * one per instance). An object with no traversal userData is skipped silently —
 * that is the vast majority of the scene and it is not an error.
 */
export function bakeObject(set, obj, chamber) {
  const ud = obj.userData || {};
  const flags = flagsFromUserData(ud);
  if (!flags) return 0;
  const name = obj.name || '';
  if (COLLIDE.blacklist.test(name)) {
    set.rejected.push({ name, reason: 'blacklisted name (ribbon/route mesh)' });
    return 0;
  }
  if (!localBounds(obj, _lb)) {
    set.rejected.push({ name, reason: 'no geometry bounds and no userData.colliderHalf' });
    return 0;
  }
  const world = obj.matrixWorld && obj.matrixWorld.elements;
  if (!world) { set.rejected.push({ name, reason: 'no matrixWorld' }); return 0; }
  const tag = tagFromUserData(ud);
  const ch = ud.chamber || chamber || null;

  if (obj.isInstancedMesh && obj.instanceMatrix && obj.count) {
    const arr = obj.instanceMatrix.array;
    let added = 0;
    for (let k = 0; k < obj.count; k++) {
      mul16(world, arr.subarray ? arr.subarray(k * 16, k * 16 + 16) : arr.slice(k * 16, k * 16 + 16), _m);
      if (bakeMatrix(set, _m, _lb, tag, ch, flags, name) >= 0) added++;
    }
    return added;
  }
  for (let k = 0; k < 16; k++) _m[k] = world[k];
  return bakeMatrix(set, _m, _lb, tag, ch, flags, name) >= 0 ? 1 : 0;
}

/** Walk a scene graph (duck-typed on `.children`) and bake everything tagged. */
export function bake(set, root, chamber) {
  let added = 0;
  const stack = [root];
  while (stack.length) {
    const o = stack.pop();
    if (!o) continue;
    added += bakeObject(set, o, chamber);
    const kids = o.children;
    if (kids) for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
  }
  return added;
}

/**
 * A wall run, chopped into segments no longer than COLLIDE.wallSegment. A 48 m
 * room wall baked as ONE box is 50.4 m on an axis and the 40 m rule refuses it —
 * correctly. Segmenting is not a workaround for the rule, it is the rule's
 * intent: one long box is one enormous broadphase cell tenant and a single
 * contact normal for the whole side of a room.
 */
function wallRun(set, along, halfAlong, fixed, cy, hy, halfThick, chamber, name) {
  const count = Math.max(1, Math.ceil((halfAlong * 2) / COLLIDE.wallSegment));
  const step = (halfAlong * 2) / count;
  let n = 0;
  for (let i = 0; i < count; i++) {
    const c = -halfAlong + step * (i + 0.5);
    const hx = along === 'x' ? step * 0.5 : halfThick;
    const hz = along === 'x' ? halfThick : step * 0.5;
    const cx = along === 'x' ? c : fixed;
    const cz = along === 'x' ? fixed : c;
    if (set.addBox(cx, cy, cz, hx, hy, hz, COLLIDE.tag.wall, chamber, COLLIDE.flags.barrier, null, `${name}-${i}`) >= 0) n++;
  }
  return n;
}

/**
 * Four barrier runs around a rectangular room. What M0 GREYBOX stands inside.
 * A DISC room gets nothing from this — a circular chamber must bake its own ring
 * of chords, and `createWorld` deliberately does not guess one for it, because a
 * wall the player can leave is worse than no wall at all: it reads as a bug in
 * the controller rather than as missing level geometry.
 */
export function bakeRoomWalls(set, spec, chamber) {
  const t = spec.wallThickness || COLLIDE.dedupeQuantum;
  const hy = (spec.wallHeight || 1) * 0.5;
  const cy = spec.floorY + hy;
  const hx = spec.halfX, hz = spec.halfZ;
  return wallRun(set, 'x', hx + t, -hz - t, cy, hy, t, chamber, 'wall-n')
    + wallRun(set, 'x', hx + t, hz + t, cy, hy, t, chamber, 'wall-s')
    + wallRun(set, 'z', hz + t, -hx - t, cy, hy, t, chamber, 'wall-w')
    + wallRun(set, 'z', hz + t, hx + t, cy, hy, t, chamber, 'wall-e');
}

// ---------------------------------------------------------------------------
// CAPSULE / BOX SEPARATION — exact for an upright box (which every wall, pillar
// and yaw-rotated prop is), sampled for a tilted one.
// ---------------------------------------------------------------------------
// HOT-PATH SCRATCH, as typed arrays rather than object literals.
//
// V8 removed unboxed double fields (v8:8887), so EVERY store of a double into a
// plain object property allocates a HeapNumber. capsuleBoxSep runs up to
// (5 slide iterations x 12 advancement steps + 8 depenetration passes) times per
// substep per candidate, and it wrote five doubles per call. Measured on this
// box: 820 KB per five seconds of sustained contact, from two scratch records
// that were supposed to be the thing that made the path allocation-free.
// A Float64Array stores in place and allocates nothing. CONTRACT §4.
const SEP_DIST = 0, SEP_DEPTH = 1, SEP_NX = 2, SEP_NY = 3, SEP_NZ = 4;
const _sep = new Float64Array(5);

function capsuleBoxSep(set, i, x, feetY, z, r, h, out) {
  const b3 = i * 3, b9 = i * 9;
  const cx = set.c[b3], cy = set.c[b3 + 1], cz = set.c[b3 + 2];
  const ex = set.e[b3], ey = set.e[b3 + 1], ez = set.e[b3 + 2];
  const a0x = set.ax[b9], a0y = set.ax[b9 + 1], a0z = set.ax[b9 + 2];
  const a1x = set.ax[b9 + 3], a1y = set.ax[b9 + 4], a1z = set.ax[b9 + 5];
  const a2x = set.ax[b9 + 6], a2y = set.ax[b9 + 7], a2z = set.ax[b9 + 8];

  const segLo = feetY + r, segHi = feetY + h - r;
  let qx = 0, qy = 0, qz = 0, lx = 0, ly = 0, lz = 0;

  if (set.upright[i]) {
    const dx = x - cx, dz = z - cz;
    lx = dx * a0x + dz * a0z;
    lz = dx * a2x + dz * a2z;
    const lyA = segLo - cy, lyB = segHi - cy;
    qx = lx - clamp(lx, -ex, ex);
    qz = lz - clamp(lz, -ez, ez);
    if (lyA > ey) { qy = lyA - ey; ly = lyA; }
    else if (lyB < -ey) { qy = lyB + ey; ly = lyB; }
    else { qy = 0; ly = clamp((lyA + lyB) * 0.5, -ey, ey); }
  } else {
    let best = Infinity;
    const n = COLLIDE.segmentSamples;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1);
      const py = segLo + (segHi - segLo) * f;
      const dx = x - cx, dy = py - cy, dz = z - cz;
      const sx = dx * a0x + dy * a0y + dz * a0z;
      const sy = dx * a1x + dy * a1y + dz * a1z;
      const sz = dx * a2x + dy * a2y + dz * a2z;
      const ux = sx - clamp(sx, -ex, ex);
      const uy = sy - clamp(sy, -ey, ey);
      const uz = sz - clamp(sz, -ez, ez);
      const d2 = ux * ux + uy * uy + uz * uz;
      if (d2 < best) { best = d2; qx = ux; qy = uy; qz = uz; lx = sx; ly = sy; lz = sz; }
    }
  }

  const d2 = qx * qx + qy * qy + qz * qz;
  if (d2 > COLLIDE.tiny) {
    const d = Math.sqrt(d2), inv = 1 / d;
    const bx = qx * inv, by = qy * inv, bz = qz * inv;
    out[SEP_NX] = a0x * bx + a1x * by + a2x * bz;
    out[SEP_NY] = a0y * bx + a1y * by + a2y * bz;
    out[SEP_NZ] = a0z * bx + a1z * by + a2z * bz;
    out[SEP_DIST] = d;
    out[SEP_DEPTH] = r - d;
    return out;
  }

  // The capsule axis is inside the box: minimum translation out, in box space.
  let exit = ex - lx, dirx = a0x, diry = a0y, dirz = a0z;
  let cand = lx + ex; if (cand < exit) { exit = cand; dirx = -a0x; diry = -a0y; dirz = -a0z; }
  cand = ey - ly; if (cand < exit) { exit = cand; dirx = a1x; diry = a1y; dirz = a1z; }
  cand = ly + ey; if (cand < exit) { exit = cand; dirx = -a1x; diry = -a1y; dirz = -a1z; }
  cand = ez - lz; if (cand < exit) { exit = cand; dirx = a2x; diry = a2y; dirz = a2z; }
  cand = lz + ez; if (cand < exit) { exit = cand; dirx = -a2x; diry = -a2y; dirz = -a2z; }
  out[SEP_NX] = dirx; out[SEP_NY] = diry; out[SEP_NZ] = dirz;
  out[SEP_DIST] = 0;
  out[SEP_DEPTH] = r + (exit > 0 ? exit : 0);
  return out;
}

/** Horizontal distance from (x,z) to a collider's footprint. Support selection. */
function xzDistanceToBox(set, i, x, z) {
  const b3 = i * 3, b9 = i * 9;
  if (set.upright[i]) {
    const dx = x - set.c[b3], dz = z - set.c[b3 + 2];
    const lx = dx * set.ax[b9] + dz * set.ax[b9 + 2];
    const lz = dx * set.ax[b9 + 6] + dz * set.ax[b9 + 8];
    const ux = lx - clamp(lx, -set.e[b3], set.e[b3]);
    const uz = lz - clamp(lz, -set.e[b3 + 2], set.e[b3 + 2]);
    return Math.sqrt(ux * ux + uz * uz);
  }
  const b = i * 6;
  const ux = Math.max(set.aabb[b] - x, 0, x - set.aabb[b + 3]);
  const uz = Math.max(set.aabb[b + 2] - z, 0, z - set.aabb[b + 5]);
  return Math.sqrt(ux * ux + uz * uz);
}

/**
 * THE ONE BRANCH THAT MATTERS. A supportsPlayer collider whose top sits inside
 * [feetY - 0.035, feetY + MAX_STEP + STEP_TOLERANCE] does NOT block. That single
 * test turns stair-stepped instanced geometry into a walkable ramp for free, and
 * without it every 30 cm lip in the tower is a wall.
 */
export function colliderBlocksPlayer(set, i, feetY) {
  if (!(set.flags[i] & COLLIDE.flags.support)) return true;
  const top = set.aabb[i * 6 + 4];
  if (top >= feetY - COLLIDE.stepDownTol && top <= feetY + F.maxStep + F.stepTol) return false;
  return true;
}

// ---------------------------------------------------------------------------
// CAPSULE STATE
// ---------------------------------------------------------------------------
export function makeCapsule(x = 0, y = 0, z = 0) {
  return {
    x, y, z,                       // y is the FEET, never the centre and never the eye
    vx: 0, vy: 0, vz: 0,
    radius: F.radius, height: F.height,
    grounded: false, walkable: true, tier: 0, surfaceKind: GROUND.kind.void,
    surf: newSurface(),
    lastCorrection: 0, abandoned: false, recovered: false,
  };
}

export const eyeOf = s => s.y + F.eye;

function newStats() {
  return {
    moves: 0, contacts: 0, railContacts: 0,
    depenetrations: 0, maxDepen: 0,
    abandoned: 0, recoveries: 0, recoveryFailures: 0,
    recoveryAttempts: 0, recoveryProbes: 0,
    maxCorrection: 0, sweepStalls: 0,
  };
}

// ---------------------------------------------------------------------------
// WORLD — a ground evaluator plus a collider set. Everything the resolver needs.
// ---------------------------------------------------------------------------
export function createWorld(opts = {}) {
  const ground = createGround(opts.ground || opts.spec || GROUND.greybox);
  const colliders = opts.colliders || new ColliderSet(opts.capacity);
  const world = { id: opts.id || ground.id, ground, colliders, stats: newStats() };
  if (opts.walls && ground.spec && ground.spec.wallHeight && ground.shape === 'rect') {
    bakeRoomWalls(colliders, ground.spec, world.id);
  }
  return world;
}

// ---------------------------------------------------------------------------
// SUPPORT / CEILING — swept, never a band test.
// ---------------------------------------------------------------------------
export function highestSupport(world, x, z, radius, lo, hi) {
  let best = world.ground.highestBetween(x, z, lo, hi);
  const set = world.colliders;
  if (set.n === 0) return best;
  const n = set.query(x - radius, lo, z - radius, x + radius, hi, z + radius);
  for (let q = 0; q < n; q++) {
    const i = set._hits[q];
    if (!(set.flags[i] & COLLIDE.flags.support)) continue;
    const top = set.aabb[i * 6 + 4];
    if (top < lo || top > hi || top <= best) continue;
    if (xzDistanceToBox(set, i, x, z) > radius) continue;
    best = top;
  }
  return best;
}

export function lowestCeiling(world, x, z, radius, fromY, toY) {
  let best = world.ground.ceilingAt(x, z, fromY);
  const set = world.colliders;
  if (set.n === 0) return best;
  const n = set.query(x - radius, fromY, z - radius, x + radius, toY, z + radius);
  for (let q = 0; q < n; q++) {
    const i = set._hits[q];
    const bottom = set.aabb[i * 6 + 1];
    if (bottom < fromY || bottom >= best) continue;
    if (xzDistanceToBox(set, i, x, z) > radius) continue;
    best = bottom;
  }
  return best;
}

// ---------------------------------------------------------------------------
// DEPENETRATION — deepest contact first, up to COLLIDE.depenIters passes.
// Returns the total distance pushed, which is what MAX_DEPEN judges.
// ---------------------------------------------------------------------------
export function depenetrate(world, s, iters = COLLIDE.depenIters) {
  const set = world.colliders;
  if (set.n === 0) return 0;
  let total = 0;
  for (let it = 0; it < iters; it++) {
    const n = set.query(
      s.x - s.radius, s.y, s.z - s.radius,
      s.x + s.radius, s.y + s.height, s.z + s.radius,
    );
    let depth = 0, nx = 0, ny = 0, nz = 0, found = false;
    for (let q = 0; q < n; q++) {
      const i = set._hits[q];
      if (!colliderBlocksPlayer(set, i, s.y)) continue;
      capsuleBoxSep(set, i, s.x, s.y, s.z, s.radius, s.height, _sep);
      if (_sep[SEP_DEPTH] <= 0) continue;
      if (_sep[SEP_DEPTH] > depth) { depth = _sep[SEP_DEPTH]; nx = _sep[SEP_NX]; ny = _sep[SEP_NY]; nz = _sep[SEP_NZ]; found = true; }
    }
    if (!found) break;
    const push = depth + F.epsilon;
    s.x += nx * push; s.y += ny * push; s.z += nz * push;
    total += push;
    world.stats.depenetrations++;
    if (total > F.maxDepen) break;
  }
  if (total > world.stats.maxDepen) world.stats.maxDepen = total;
  return total;
}

/** True if the capsule is inside blocking geometry at this pose. */
export function isFree(world, x, feetY, z, radius, height) {
  const set = world.colliders;
  if (set.n === 0) return true;
  const n = set.query(x - radius, feetY, z - radius, x + radius, feetY + height, z + radius);
  for (let q = 0; q < n; q++) {
    const i = set._hits[q];
    if (!colliderBlocksPlayer(set, i, feetY)) continue;
    capsuleBoxSep(set, i, x, feetY, z, radius, height, _sep);
    if (_sep[SEP_DEPTH] > F.epsilon) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// HORIZONTAL SWEEP — conservative advancement over the exact separation
// distance. It cannot tunnel at ANY dt, because it never advances further than
// the current clearance; the fixed-substep rule is the second guarantee, not the
// only one.
// ---------------------------------------------------------------------------
const SW_T = 0, SW_NX = 1, SW_NZ = 2;
const _sweep = new Float64Array(3);
let _sweepHit = false;

function sweepHorizontal(world, s, dx, dz) {
  _sweep[SW_T] = 1; _sweep[SW_NX] = 0; _sweep[SW_NZ] = 0;
  _sweepHit = false;
  const set = world.colliders;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < COLLIDE.tiny || set.n === 0) return;

  const minx = Math.min(s.x, s.x + dx) - s.radius, maxx = Math.max(s.x, s.x + dx) + s.radius;
  const minz = Math.min(s.z, s.z + dz) - s.radius, maxz = Math.max(s.z, s.z + dz) + s.radius;
  const n = set.query(minx, s.y, minz, maxx, s.y + s.height, maxz);
  if (n === 0) return;

  const skin = F.epsilon;
  let t = 0;
  for (let k = 0; k < COLLIDE.sweepIters; k++) {
    const x = s.x + dx * t, z = s.z + dz * t;
    let best = Infinity, bnx = 0, bnz = 0, bi = -1;
    for (let q = 0; q < n; q++) {
      const i = set._hits[q];
      if (!colliderBlocksPlayer(set, i, s.y)) continue;
      capsuleBoxSep(set, i, x, s.y, z, s.radius, s.height, _sep);
      const clearance = _sep[SEP_DIST] - s.radius;
      if (clearance < best) { best = clearance; bnx = _sep[SEP_NX]; bnz = _sep[SEP_NZ]; bi = i; }
    }
    if (bi < 0) { _sweep[SW_T] = 1; return; }
    if (best <= skin) {
      _sweep[SW_T] = t; _sweepHit = true;
      const hl = Math.sqrt(bnx * bnx + bnz * bnz);
      if (hl > COLLIDE.tiny) { _sweep[SW_NX] = bnx / hl; _sweep[SW_NZ] = bnz / hl; }
      else { _sweep[SW_NX] = -dx / len; _sweep[SW_NZ] = -dz / len; }
      return;
    }
    const adv = (best - skin) / len;
    t += adv;
    if (t >= 1) { _sweep[SW_T] = 1; return; }
  }
  // Budget exhausted: stop where we are. Short of the wall is always safe;
  // past it never is.
  _sweep[SW_T] = t;
  world.stats.sweepStalls++;
}

export function sweptSlide(world, s, dt) {
  let dx = s.vx * dt, dz = s.vz * dt;
  for (let iter = 0; iter < F.maxContacts; iter++) {
    if (dx * dx + dz * dz < COLLIDE.tiny) break;
    sweepHorizontal(world, s, dx, dz);
    const t = _sweep[SW_T], nx = _sweep[SW_NX], nz = _sweep[SW_NZ];
    s.x += dx * t;
    s.z += dz * t;
    if (!_sweepHit) break;
    world.stats.contacts++;
    const rem = 1 - t;
    const rx = dx * rem, rz = dz * rem;
    const d = rx * nx + rz * nz;
    dx = rx - nx * d;
    dz = rz - nz * d;
    const vd = s.vx * nx + s.vz * nz;
    if (vd < 0) { s.vx -= nx * vd; s.vz -= nz * vd; }
  }
}

// ---------------------------------------------------------------------------
// VERTICAL — separate, and the support test is SWEPT. GROUND_SNAP is applied by
// widening the search downward when the body was already grounded, which is what
// keeps a descent along the helix from micro-launching once per substep.
// ---------------------------------------------------------------------------
export function resolveVertical(world, s, dt) {
  const prev = s.y;
  const wasGrounded = s.grounded;
  let desired = prev + s.vy * dt;

  if (s.vy > 0) {
    const head = prev + s.height;
    const want = desired + s.height;
    const ceil = lowestCeiling(world, s.x, s.z, s.radius, head - F.epsilon, want);
    if (ceil < GROUND.top && want > ceil) { desired = ceil - s.height - F.epsilon; s.vy = 0; }
    s.y = desired;
    s.grounded = false;
    return;
  }

  const lo = wasGrounded ? Math.min(desired, prev - F.groundSnap) : desired;
  const hi = prev + (wasGrounded ? F.maxStep : F.stepTol);
  const sup = highestSupport(world, s.x, s.z, s.radius, lo, hi);
  if (hasSurface(sup)) { s.y = sup; s.vy = 0; s.grounded = true; }
  else { s.y = desired; s.grounded = false; }
}

function publishSurface(world, s) {
  world.ground.surfaceAt(s.x, s.z, s.y + GROUND.selfLift, s.surf);
  s.tier = s.surf.tier;
  s.surfaceKind = s.surf.kind;
  s.walkable = s.surf.walkable;
}

// ---------------------------------------------------------------------------
// THE HANDRAIL — a swept annulus, solid only while the body's vertical span
// overlaps its physical band, open at the three doorways. Jump and you genuinely
// clear it. DESIGN is explicit that this pass MUST be followed by a second
// ordinary collide pass, or the radial correction leaves a one-frame
// penetration into whatever the correction pushed you into.
// ---------------------------------------------------------------------------
export function resolveRail(world, s, prevX, prevZ) {
  const h = world.ground.helix;
  if (!h) return false;

  const t = helixTAt(h, s.x, s.z, s.y);
  if (t < 0) return false;
  if (helixRailGap(h, t)) return false;                      // doorway: walk straight through

  const ry = helixRampY(h, t);
  const bandLo = ry + h.railBandLo, bandHi = ry + h.railBandHi;
  if (s.y >= bandHi || s.y + s.height <= bandLo) return false;   // cleared it

  const r1 = Math.sqrt(s.x * s.x + s.z * s.z);
  if (r1 < COLLIDE.tiny) return false;
  const R = h.rampOuterR + h.railOffset;
  const r0 = Math.sqrt(prevX * prevX + prevZ * prevZ);
  const inside = r0 <= R;
  const limit = inside ? R - h.railTube - s.radius : R + h.railTube + s.radius;
  if (inside ? r1 <= limit : r1 >= limit) return false;

  const nx = s.x / r1, nz = s.z / r1;
  s.x = nx * limit; s.z = nz * limit;
  const vr = s.vx * nx + s.vz * nz;
  if (inside ? vr > 0 : vr < 0) { s.vx -= nx * vr; s.vz -= nz * vr; }
  world.stats.railContacts++;
  return true;
}

// ---------------------------------------------------------------------------
// EMBEDDED RECOVERY — 24 angles x 0.45 m out to 4.5 m. Deterministic order,
// nearest ring first, so the correction is the smallest one that works and two
// runs of the same seed recover to the same metre. It ALWAYS terminates: the
// loop bound is rings x angles and there is no early continue that can skip it.
// ---------------------------------------------------------------------------
export function recover(world, s) {
  const st = world.stats;
  st.recoveryAttempts++;
  const rings = Math.max(1, Math.round(F.recoveryRadius / F.recoveryStep));
  const angles = F.recoveryAngles;
  const ox = s.x, oy = s.y, oz = s.z;
  let probes = 0;

  for (let ring = 1; ring <= rings; ring++) {
    const rad = ring * F.recoveryStep;
    for (let a = 0; a < angles; a++) {
      probes++;
      const th = (a / angles) * TAU;
      const x = ox + Math.cos(th) * rad;
      const z = oz + Math.sin(th) * rad;
      const sup = highestSupport(world, x, z, s.radius, oy - F.recoveryRadius, oy + F.recoveryRadius);
      if (!hasSurface(sup)) continue;
      if (!isFree(world, x, sup, z, s.radius, s.height)) continue;
      s.x = x; s.y = sup; s.z = z;
      s.vx = 0; s.vy = 0; s.vz = 0;
      s.grounded = true; s.recovered = true;
      st.recoveries++; st.recoveryProbes += probes;
      publishSurface(world, s);
      return true;
    }
  }
  st.recoveryProbes += probes;
  st.recoveryFailures++;
  return false;
}

// ---------------------------------------------------------------------------
// THE MOVE. Order is DESIGN's, verbatim:
//   depenetrate 4 → swept slide 5 → depenetrate → vertical (separate)
//   → rail → MANDATORY second ordinary collide pass.
// A depenetration further than MAX_DEPEN abandons the move and ring-searches.
// It never teleports silently; `stats.abandoned` and `s.abandoned` both say so.
// ---------------------------------------------------------------------------
function abandon(world, s, px, py, pz) {
  s.x = px; s.y = py; s.z = pz;
  s.vx = 0; s.vy = 0; s.vz = 0;
  s.abandoned = true;
  world.stats.abandoned++;
  if (!isFree(world, s.x, s.y, s.z, s.radius, s.height)) recover(world, s);
  publishSurface(world, s);
  return s;
}

export function moveCapsule(world, s, dt) {
  const px = s.x, py = s.y, pz = s.z;
  s.abandoned = false; s.recovered = false;
  world.stats.moves++;

  let pushed = depenetrate(world, s, COLLIDE.depenIters);
  if (pushed > F.maxDepen) return abandon(world, s, px, py, pz);

  sweptSlide(world, s, dt);

  pushed += depenetrate(world, s, COLLIDE.depenIters);
  if (pushed > F.maxDepen) return abandon(world, s, px, py, pz);

  resolveVertical(world, s, dt);

  if (world.ground.helix) {
    resolveRail(world, s, px, pz);
    pushed += depenetrate(world, s, COLLIDE.depenIters);
    if (pushed > F.maxDepen) return abandon(world, s, px, py, pz);
  }

  publishSurface(world, s);

  const cx = s.x - px, cz = s.z - pz;
  s.lastCorrection = Math.sqrt(cx * cx + cz * cz);
  if (s.lastCorrection > world.stats.maxCorrection) world.stats.maxCorrection = s.lastCorrection;
  return s;
}

// ---------------------------------------------------------------------------
// PROBES — pure geometry, no rendering, no controller. `probeRail` runs the REAL
// resolver so the gate proves the shipping code rather than a second copy of it.
// ---------------------------------------------------------------------------
let _railWorld = null;
export function helixWorld() {
  if (!_railWorld) _railWorld = createWorld({ id: 'helix', ground: 'helix' });
  return _railWorld;
}

const _probe = makeCapsule();

export function probeRail(t, footLift = 0, out = {}) {
  const world = helixWorld();
  const h = world.ground.helix;
  const a = helixAngleAt(h, t);
  const ry = helixRampY(h, t);
  const R = h.rampOuterR + h.railOffset;
  const limit = R - h.railTube - F.radius;
  const start = limit - COLLIDE.probeApproach;
  const ca = Math.cos(a), sa = Math.sin(a);

  const s = _probe;
  s.radius = F.radius; s.height = F.height;
  s.x = ca * start; s.z = sa * start; s.y = ry + footLift;
  s.vx = ca * COLLIDE.probeSpeed; s.vz = sa * COLLIDE.probeSpeed; s.vy = 0;
  s.grounded = true;

  let blocked = false;
  for (let k = 0; k < COLLIDE.probeSteps; k++) {
    const px = s.x, pz = s.z;
    s.x += s.vx * FEEL.time.fixedDt;
    s.z += s.vz * FEEL.time.fixedDt;
    if (resolveRail(world, s, px, pz)) blocked = true;
  }

  const r = Math.sqrt(s.x * s.x + s.z * s.z);
  const nx = s.x / r, nz = s.z / r;
  out.t = t;
  out.footLift = footLift;
  out.radius = r;
  out.railRadius = R;
  out.limit = limit;
  out.rampY = ry;
  out.bandLo = ry + h.railBandLo;
  out.bandHi = ry + h.railBandHi;
  out.doorway = helixRailGap(h, t);
  out.overlapsBand = !(s.y >= out.bandHi || s.y + s.height <= out.bandLo);
  out.cleared = !out.overlapsBand;
  out.blocked = blocked;
  out.solid = blocked && r <= limit + F.epsilon;
  out.open = r > R;
  out.radialVelocity = s.vx * nx + s.vz * nz;
  return out;
}

// ---------------------------------------------------------------------------
// THE SYSTEM. One manifest entry: { id: 'ground', module: './world/collide.js' }.
// ground.js exports no create() on purpose — it is pure functions and holds no
// state, so tests/manifest.mjs must not expect it in SYSTEMS.
// ---------------------------------------------------------------------------
export function create(ctx) {
  let world = createWorld({ id: 'greybox', ground: GROUND.greybox, walls: true });
  ctx.world = world;

  const api = {
    id: 'ground',
    get world() { return world; },
    /** A chamber calls this at build with its own ground spec. */
    load(spec, opts = {}) {
      world = createWorld({ id: opts.id || (spec && spec.id), ground: spec, walls: opts.walls !== false });
      ctx.world = world;
      return world;
    },
    makeCapsule,
    moveCapsule: (s, dt) => moveCapsule(world, s, dt),
    groundAt: (x, z, y) => world.ground.groundAt(x, z, y),
    surfaceAt: (x, z, y, out) => world.ground.surfaceAt(x, z, y, out),
    probeRail,
    stats: () => world.stats,
    dispose() {
      world.colliders.clear();
      if (ctx.world === world) ctx.world = null;
    },
    /**
     * CONTRACT §2 / PLAN: an observable assertion on the SHIPPING page, not on a
     * scratch harness. A capsule dropped from head height above the room floor
     * must land on the analytic ground, and the room's walls must be in the bake.
     */
    verify() {
      const g = world.ground;
      const floor = g.groundAt(0, 0, GROUND.top);
      const s = makeCapsule(0, floor + F.height, 0);
      s.grounded = false;
      for (let i = 0; i < 240; i++) {
        s.vy -= F.gravity * FEEL.time.fixedDt;
        moveCapsule(world, s, FEEL.time.fixedDt);
      }
      const landed = s.grounded && Math.abs(s.y - floor) <= F.groundSnap;
      const baked = world.colliders.n;
      const spanOk = world.colliders.maxSpan() <= COLLIDE.maxAabb;
      return {
        ok: hasSurface(floor) && landed && baked > 0 && spanOk,
        detail: `ground=${floor.toFixed(3)} landed=${landed} colliders=${baked} maxSpan=${world.colliders.maxSpan().toFixed(1)}`,
      };
    },
  };
  return api;
}

export { GROUND, createGround, hasSurface };
export default create;
