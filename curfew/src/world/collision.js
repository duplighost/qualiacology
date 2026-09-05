// world/collision.js — the collider field, the kinematic capsule sweep, and the
// per-chunk bake. System id 'collision' (manifest #6, after terrain, before chunks).
//
// PORTED from VANTA//9 (app/vanta-engine.ts), which is the most rigorous character
// controller on this machine, TS -> plain JS, with four deliberate changes:
//   1. Every hard-coded PLAYER_RADIUS / PLAYER_HEIGHT is a parameter, so creatures and
//      the player share one solver (vanta-engine.ts:215-234 constants became locals here).
//   2. The 8 m hash grid is bucketed BY CHUNK ID as well as by cell, so removeChunk is
//      O(colliders in that chunk) and never a scan (vanta rebuilt the whole grid instead —
//      finalizeWorldColliders at 1292-1549 clears and re-registers everything).
//   3. The world clamp at +-128 (sweepPlayerHorizontal 1926-1927) is gone; CURFEW streams.
//   4. Anything shorter than the step height stops being an invisible wall and becomes a
//      surface you walk onto instead. VANTA required an explicit supportsPlayer flag
//      (colliderBlocksPlayer 1551-1578) and low props there read as knee-high glass.
//
// Ground is ALWAYS terrain.heightAt. Never a collider, never a mesh raycast. Colliders only
// ever ADD a standable top above the ground.
//
// This module imports no renderer and no three: it is pure math over typed arrays, so
// tests/collision.mjs can import it under node without an import map.

import { CFG } from '../config.js';
import { clamp, DEG, TAU } from '../engine/math.js';

// ---------------------------------------------------------------------------
// Masks. A collider carries a mask; a query carries a mask; they must intersect.
// ---------------------------------------------------------------------------
export const MASK = Object.freeze({
  SOLID: 1,    // blocks a moving capsule
  SHOT: 2,     // blocks a bullet
  SIGHT: 4,    // blocks line of sight / an AI's view
  GROUND: 8,   // raycast only: also march the terrain (never a collider)
  ALL: 0xffff,
});
const DEFAULT_MASK = MASK.SOLID | MASK.SHOT | MASK.SIGHT;

// ---------------------------------------------------------------------------
// Tuning that config.js does not own yet. Requested as a CFG.collision block in
// docs/HANDOFF.md; these locals are the interim home and carry their donor line.
// ---------------------------------------------------------------------------
const CELL = 8;                   // metres per broadphase cell [vanta COLLIDER_CELL_SIZE 8, :228]
const EPS = 0.001;                // [vanta COLLISION_EPSILON, :230]
const MAX_CONTACTS = 5;           // [vanta MAX_HORIZONTAL_CONTACTS, :231]
const MAX_STATIC_DEPEN = 1.1;     // [vanta MAX_STATIC_DEPENETRATION, :232] blowout threshold
const RECOVERY_RADIUS = 4.5;      // [vanta EMBEDDED_RECOVERY_RADIUS, :233]
const UNDER_TERRAIN_TOL = 0.08;   // [vanta UNDER_TERRAIN_TOLERANCE, :234]
const GROUND_SNAP = 0.48;         // [vanta GROUND_SNAP_DISTANCE, :224]
const TERRAIN_SAMPLE = 0.32;      // central-difference arm [vanta TERRAIN_SAMPLE_DISTANCE, :227]
const STEP_TOL = 0.08;            // [vanta TRAVERSAL_STEP_TOLERANCE, :223]
const SLOPE_LIMIT_DEG = 47;       // [vanta MAX_SLOPE_DEGREES, :225]
const MIN_WALKABLE_NY = Math.cos(SLOPE_LIMIT_DEG * DEG);
const SLIDE_CAP = 9.5;            // m/s down a rejected slope [vanta applySteepSlopeSlide, :2418]
const RING_STEP = 0.45;           // recovery ring spacing [vanta findSafeSupportPosition, :2026]
const RING_ANGLES = 24;
const MAX_HALF_EXTENT = 24;       // a half-extent past this cannot be a real prop: a 64 m chunk
                                  // ribbon baked to one AABB is exactly what this catches.
                                  // [vanta trap, engine :1268-1274 "a giant wall"]

// Flags packed into the flags array.
const F_ALIVE = 1;
const F_STANDABLE = 2;
const F_AUTHORED = 4;   // skips the oversize reject: an authored long wall is legitimate
const F_BREAK = 8;      // ROUND 7, lane F: a thing a car goes THROUGH, not into
const F_NOCLIMB = 16;   // semantic refusal: never a ledge. A trunk, a post, a pole.

const KIND_CIRCLE = 0;
const KIND_OBB = 1;

// ---------------------------------------------------------------------------
// BREAKABLE COLLIDERS. ROUND 7, lane F.
//
// Alex, fifth playtest: the car should be "more towards the dying light driving expansion
// type style. Car that handles great. CAN CRUSH THINGS WITH IT."
//
// A breakable carries a MASS in kilograms. A body arriving faster than
// `breakSpeed(mass)` goes through it: the collider is retired on the spot and the mover
// pays a bite of speed instead of stopping. Nothing here costs the ordinary capsule sweep
// anything — F_BREAK is read by `crush()` alone, which only the car calls, and only while
// it is moving. `_blocks`, `_overlap`, `_sweep` and `resolveCapsule` are untouched, so a
// breakable is a perfectly ordinary solid until something hits it hard enough.
//
// A builder opts in with ONE FIELD on the shape it already emits:  breakable: <kg>
// (or `true`, which means BREAK_DEFAULT). A shape whose TAG is in BREAKABLE_TAGS is
// breakable at that tag's mass without saying anything at all — which is the route that
// works today, because places.js's `emit` copies a fixed list of fields and would drop a
// `breakable` of its own (docs/ROUND-7/HANDOFF-F.md item 1).
// ---------------------------------------------------------------------------
const BREAK_DEFAULT = 40;
// The speed a mover needs to go through a thing of mass m: 2.6 m/s of floor plus 0.055 per
// kilogram. An A-board goes at 3.3 m/s (a brisk walk in a car), a fence at 4.5, a drum at
// 6.0, a market stall at 5.4, a waystone at 9.2, the tyre stack at 5.3. Nothing on this
// table is unbreakable at road speed and nothing on it breaks while you are parking.
const CRUSH_BASE = 2.6;
const CRUSH_PER_KG = 0.055;
export function breakSpeed(mass) { return CRUSH_BASE + mass * CRUSH_PER_KG; }

const BREAKABLE_TAGS = new Map([
  ['fence', 34], ['rail', 26], ['gate', 30], ['hurdle', 22],
  ['crate', 24], ['pallet', 16], ['box', 24], ['barrel', 58], ['drum', 62],
  ['tyres', 48], ['sign', 30], ['aboard', 12], ['letterbox', 20], ['stall', 50],
  ['waystone', 120], ['cairn', 76], ['sapling', 26], ['stem', 26],
  ['leg', 44], ['stake', 18], ['bin', 26], ['pot', 14], ['kit', 14], ['bike', 18],
]);

// ROUND 13: BREAKABLE BY THE GUN AND THE STOCK. Alex, seventh playtest: breakable boxes.
// The tags a round or a buttstroke takes apart, and how many landings each one needs. The
// count lives per collider (hitBreakable, below); the break retires the collider exactly the
// way crush() does, and combat.js throws the same debris the car does and emits the same
// 'world:broke'. Only the light wooden things are on this table: a drum, a sign, a waystone
// still stop a round and spark like what they are.
const SHOT_BREAK = new Map([
  ['crate', 1], ['box', 1], ['aboard', 1], ['pallet', 2], ['cache', 1],
]);

// Never a ledge, whatever its top is doing. Round things and thin standing things: a body
// cannot get a knee over a trunk, a post or a lamp column, and Alex's "one climb in forty is
// a tree" (docs/NEXT.md B5) is exactly this list arriving in the mantle's probe.
const NON_CLIMB_TAGS = new Set([
  'tree', 'trunk', 'sapling', 'stem', 'bough',   // NOT 'log': a fallen log is a thing you walk along
  'post', 'pole', 'stake', 'mast', 'pylon', 'column', 'lamp', 'lamppost', 'streetlight',
  'signpost', 'aerial', 'chimney', 'pipe', 'wire', 'cable', 'stack', 'cross', 'headstone',
]);
// A circle with no standable flag and a radius under this has no flat on top to stand on.
// A trunk is 0.26-0.88 m; the smallest authored round thing anybody stands on in this
// county is the pylon pad at 2.3 m, and every one of those is flagged standable anyway.
const MIN_ROUND_LEDGE = 0.95;

// Anything with one of these tags is scenery, not physics. Grass is here because a grass
// card must NEVER produce a collider, and road/ribbon because a terrain-following ribbon
// baked into one box is VANTA's giant invisible wall.
const NON_PHYSICAL_TAGS = new Set([
  'grass', 'tuft', 'blade', 'weed', 'flower', 'fern', 'leaf', 'leaves', 'canopy', 'frond',
  'road', 'ribbon', 'route', 'lane', 'seam', 'inlay', 'verge', 'shoulder', 'trail', 'path',
  'marking', 'decal', 'puddle', 'billboard', 'impostor', 'light', 'fog', 'sound', 'debug',
]);
// Same idea by NAME, for meshes whose tag was never set. Word-boundary-ish so 'crossroads-barn'
// still bakes but 'secondary-route-3' does not.
const NON_PHYSICAL_NAME = /(^|[-_ .])(road|roads|ribbon|route|seam|inlay|verge|trail|grass|decal|marking)([-_ .0-9]|$)/i;

const CAP0 = 4096;

function growF64(src, n) { const out = new Float64Array(n); out.set(src); return out; }
function growU8(src, n) { const out = new Uint8Array(n); out.set(src); return out; }
function growU16(src, n) { const out = new Uint16Array(n); out.set(src); return out; }
function growI32(src, n) { const out = new Int32Array(n); out.set(src); return out; }
function growU32(src, n) { const out = new Uint32Array(n); out.set(src); return out; }

export class Collision {
  static id = 'collision';

  constructor(ctx) {
    this.ctx = ctx;
    this.MASK = MASK;

    // --- struct-of-arrays collider store. Grows by doubling, never per-query. ---
    this.cap = CAP0;
    this.count = 0;               // high-water slot index (live + free)
    this.live = 0;
    this._kind = new Uint8Array(this.cap);
    this._flags = new Uint8Array(this.cap);
    this._mask = new Uint16Array(this.cap);
    this._chunk = new Int32Array(this.cap);
    this._gen = new Uint16Array(this.cap);
    this._stamp = new Uint32Array(this.cap);
    this._x = new Float64Array(this.cap);
    this._z = new Float64Array(this.cap);
    this._r = new Float64Array(this.cap);      // bounding radius in XZ (both kinds)
    this._hx = new Float64Array(this.cap);
    this._hz = new Float64Array(this.cap);
    this._yaw = new Float64Array(this.cap);
    this._cos = new Float64Array(this.cap);
    this._sin = new Float64Array(this.cap);
    this._y0 = new Float64Array(this.cap);
    this._y1 = new Float64Array(this.cap);
    this._mass = new Float64Array(this.cap);   // kg; only read when F_BREAK is set
    this._hits = new Uint8Array(this.cap);     // ROUND 13: landings a shot-breakable has taken
    this._free = [];              // recycled slot indices

    // --- broadphase: cell key -> array of slot indices ---
    this.grid = new Map();
    // --- per-chunk buckets so removal is O(colliders in chunk), not O(world) ---
    this.chunkOf = new Map();     // chunkId (string|number) -> dense chunk index
    this.chunkKeys = [];          // dense chunk index -> chunkId
    this.chunkItems = [];         // dense chunk index -> array of slot indices

    // --- query scratch (never reallocated on the hot path) ---
    this._near = new Int32Array(512);
    this._nearN = 0;
    this._query = 0;

    // --- solver scratch: plain numbers, so step()/present() allocate nothing ---
    this._nx = 0; this._nz = 0; this._depth = 0; this._toi = 0;
    this._gx = 0; this._gz = 0;
    this._sx = 0; this._sz = 0;
    this._supH = 0; this._supNy = 1; this._supCollider = -1;
    this._safeX = 0; this._safeY = 0; this._safeZ = 0;
    this._contacts = 0; this._hadStatic = false;

    // Shared result objects. Documented in HANDOFF: these are REUSED — copy what you
    // need before the next call. Returning fresh objects would allocate every frame.
    this._res = {
      pos: null, grounded: false, recovered: false, steppedUp: false, ceiling: false,
      contacts: 0, normal: { x: 0, y: 1, z: 0 },
    };
    // Tags, kept per collider so a shot can report the SURFACE it hit. combat.js needs
    // to know a trunk from the ground to pick an impact sound, a decal and a penetration
    // depth; without this every hit reported the same material.
    this._tag = [];
    this._ray = {
      hit: false, t: 0, id: -1, chunk: -1, ground: false, tag: null,
      point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 },
    };

    // Per-entity "last known good" spot, keyed by the caller's own position object so
    // the player and every creature keep their own without this module holding a roster.
    this._safe = new WeakMap();

    // ROUND 7, lane F. The shared crush result. REUSED, like everything else returned from
    // this file: read it, or copy what you need, before the next crush() call. Capped at
    // CRUSH_MAX things in one call so the arrays are allocated once, here, and never again.
    this._crushMax = 8;
    this._crush = {
      n: 0, mass: 0, speedNeeded: 0,
      x: new Float64Array(this._crushMax), y: new Float64Array(this._crushMax),
      z: new Float64Array(this._crushMax), m: new Float64Array(this._crushMax),
      top: new Float64Array(this._crushMax), rad: new Float64Array(this._crushMax),
      tag: new Array(this._crushMax).fill(null),
    };

    // Shared debugNearest result. Reused, like every other returned object here.
    this._nearest = {
      x: 0, z: 0, radius: 0, kind: 'circle', halfX: 0, halfZ: 0, yaw: 0,
      y0: 0, y1: 0, distance: 0, id: -1,
    };
    // ROUND 13: the shared record of the last thing hitBreakable() took apart. Reused.
    this._broken = { x: 0, y: 0, z: 0, top: 0, radius: 0, mass: 0, tag: null, id: -1, hits: 0 };

    this._tel = {
      total: 0,           // live colliders  (integrator request)
      buckets: 0,         // occupied grid cells (integrator request)
      recoveries: 0,      // bounded rescues that actually fired — a walk test asserts 0
      corrections: 0,     // silent sub-step-height nudges
      maxCorrection: 0,   // deepest single correction, metres
      resolves: 0, sweeps: 0, contacts: 0, rays: 0,
      rejected: 0,        // shapes refused as non-physical (grass, road ribbons)
      oversize: 0,        // shapes refused for being chunk-sized (a ribbon baked to one box)
      degenerate: 0,      // NaN / zero-radius shapes refused
      noTerrain: 0,       // resolves that ran with no terrain system (ground fell back to 0)
      breakable: 0,       // live breakable colliders ever added (round 7, lane F)
      broken: 0,          // how many have been crushed this session
      brokenMass: 0,      // and their total mass, kg
      crushes: 0,         // crush() calls
      shotBroken: 0,      // ROUND 13: taken apart by a round or the stock (hitBreakable)
    };

    this._terrainSys = null;
  }

  // -------------------------------------------------------------------------
  // system shape
  // -------------------------------------------------------------------------
  async init() { /* nothing to load: the field fills as chunks bake */ }

  step() { /* colliders are static between bakes; there is nothing to advance */ }

  ready() {
    // Genuine wiring check: terrain is manifest #4 and MUST exist by now, because
    // ground truth is heightAt and nothing else.
    const t = this._terrain();
    return !!(t && typeof t.heightAt === 'function');
  }

  dispose() {
    this.grid.clear();
    this.chunkOf.clear();
    this.chunkKeys.length = 0;
    this.chunkItems.length = 0;
    this._free.length = 0;
    this.count = 0; this.live = 0;
    this._flags.fill(0);
  }

  // Lazily, at use — never captured at construction (VIGIL combat.js captured
  // ctx.systems.enemies before enemies existed and got undefined).
  _terrain() {
    if (this._terrainSys) return this._terrainSys;
    const s = this.ctx && this.ctx.systems && this.ctx.systems.get('terrain');
    if (s) this._terrainSys = s;
    return s || null;
  }

  groundHeight(x, z) {
    const t = this._terrain();
    if (!t) { this._tel.noTerrain++; return 0; }
    return t.heightAt(x, z);
  }

  // Central-difference terrain gradient. VANTA samples at 0.32 m (:227) — small enough to
  // follow a bank, wide enough that the detail octave does not make every step a cliff.
  _gradient(x, z) {
    const t = this._terrain();
    if (!t) { this._gx = 0; this._gz = 0; return; }
    const h = TERRAIN_SAMPLE, inv = 1 / (2 * h);
    this._gx = (t.heightAt(x + h, z) - t.heightAt(x - h, z)) * inv;
    this._gz = (t.heightAt(x, z + h) - t.heightAt(x, z - h)) * inv;
  }

  _terrainNormalY(x, z) {
    this._gradient(x, z);
    const g2 = this._gx * this._gx + this._gz * this._gz;
    return 1 / Math.sqrt(1 + g2);
  }

  _walkable(ny) { return ny >= MIN_WALKABLE_NY; }

  // -------------------------------------------------------------------------
  // storage
  // -------------------------------------------------------------------------
  _ensure(n) {
    if (n <= this.cap) return;
    let cap = this.cap;
    while (cap < n) cap *= 2;
    this._kind = growU8(this._kind, cap);
    this._flags = growU8(this._flags, cap);
    this._mask = growU16(this._mask, cap);
    this._chunk = growI32(this._chunk, cap);
    this._gen = growU16(this._gen, cap);
    this._stamp = growU32(this._stamp, cap);
    this._x = growF64(this._x, cap);
    this._z = growF64(this._z, cap);
    this._r = growF64(this._r, cap);
    this._hx = growF64(this._hx, cap);
    this._hz = growF64(this._hz, cap);
    this._yaw = growF64(this._yaw, cap);
    this._cos = growF64(this._cos, cap);
    this._sin = growF64(this._sin, cap);
    this._y0 = growF64(this._y0, cap);
    this._y1 = growF64(this._y1, cap);
    this._mass = growF64(this._mass, cap);
    this._hits = growU8(this._hits, cap);
    this.cap = cap;
  }

  _chunkIndex(chunkId, create) {
    if (chunkId === undefined || chunkId === null) return -1;
    let ci = this.chunkOf.get(chunkId);
    if (ci === undefined) {
      if (!create) return -1;
      ci = this.chunkKeys.length;
      this.chunkOf.set(chunkId, ci);
      this.chunkKeys.push(chunkId);
      this.chunkItems.push([]);
    }
    return ci;
  }

  // Cell key. World is 4 km, so |cell| < 300; the +32768 bias keeps the key a small
  // positive integer and collision-free (a hashed key would silently merge two cells).
  _key(cx, cz) { return (cx + 32768) * 65536 + (cz + 32768); }

  _insertGrid(i) {
    const r = this._r[i];
    const minX = Math.floor((this._x[i] - r) / CELL), maxX = Math.floor((this._x[i] + r) / CELL);
    const minZ = Math.floor((this._z[i] - r) / CELL), maxZ = Math.floor((this._z[i] + r) / CELL);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const k = this._key(cx, cz);
        const b = this.grid.get(k);
        if (b) b.push(i); else this.grid.set(k, [i]);
      }
    }
  }

  _removeGrid(i) {
    // Recomputed from the stored fields, so it visits exactly the cells _insertGrid used.
    const r = this._r[i];
    const minX = Math.floor((this._x[i] - r) / CELL), maxX = Math.floor((this._x[i] + r) / CELL);
    const minZ = Math.floor((this._z[i] - r) / CELL), maxZ = Math.floor((this._z[i] + r) / CELL);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const k = this._key(cx, cz);
        const b = this.grid.get(k);
        if (!b) continue;
        const j = b.indexOf(i);
        if (j >= 0) { b[j] = b[b.length - 1]; b.pop(); }
        if (b.length === 0) this.grid.delete(k);
      }
    }
  }

  // -------------------------------------------------------------------------
  // addCollider — the ONLY way a collider comes into being.
  //
  // shape:
  //   { kind:'circle', x, z, r,  y0, y1, ... }
  //   { kind:'obb',    x, z, halfX, halfZ, yaw, y0, y1, ... }
  // options on either kind:
  //   standable:true   its top is a floor you can stand on
  //   authored:true    skip the chunk-sized reject (a real long wall)
  //   nonPhysical:true never bake it (roads, grass, decals)
  //   breakable:<kg>   the car can crush it; does not change its climb semantics
  //   climbable:false  never expose its top to a mantle, grab or vault probe
  //   tag / name       string; matched against the non-physical vocabulary
  //   mask             defaults to SOLID|SHOT|SIGHT
  // y0/y1 are absolute world metres. If omitted they default to
  // ground-0.18 .. ground+clamp(1.8+1.8r, 2.2, 12) [vanta normalizeCollider :1153-1173].
  //
  // Returns an id, or -1 when the shape was refused (and telemetry says why).
  // -------------------------------------------------------------------------
  addCollider(shape, chunkId) {
    if (!shape) { this._tel.degenerate++; return -1; }

    // --- name/flag rejection FIRST. A road ribbon that reaches the bake is the bug. ---
    if (shape.nonPhysical === true || shape.physical === false) { this._tel.rejected++; return -1; }
    const tag = shape.tag;
    if (tag && NON_PHYSICAL_TAGS.has(tag)) { this._tel.rejected++; return -1; }
    const name = shape.name;
    if (name && NON_PHYSICAL_NAME.test(name)) { this._tel.rejected++; return -1; }

    const isObb = shape.kind === 'obb' || shape.kind === 'box';
    const x = +shape.x, z = +shape.z;
    let hx = 0, hz = 0, r = 0;
    if (isObb) {
      hx = Math.abs(+(shape.halfX !== undefined ? shape.halfX : shape.hx));
      hz = Math.abs(+(shape.halfZ !== undefined ? shape.halfZ : shape.hz));
      r = Math.sqrt(hx * hx + hz * hz);
    } else {
      r = Math.abs(+(shape.r !== undefined ? shape.r : shape.radius));
      hx = hz = 0;
    }
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r) || r <= 1e-4) {
      this._tel.degenerate++; return -1;
    }
    const authored = shape.authored === true;
    if (!authored && (hx > MAX_HALF_EXTENT || hz > MAX_HALF_EXTENT || r > MAX_HALF_EXTENT * 1.5)) {
      // Bigger than any prop in the county. This is the shape a terrain-following ribbon
      // makes when someone bakes its bounding box. Refuse it loudly instead of building
      // an invisible wall the player walks into in the dark.
      this._tel.oversize++; return -1;
    }

    const ground = this.groundHeight(x, z);
    let y0 = shape.y0 !== undefined ? +shape.y0 : (shape.yMin !== undefined ? +shape.yMin : ground - 0.18);
    let y1 = shape.y1 !== undefined ? +shape.y1 : (shape.yMax !== undefined ? +shape.yMax
      : ground + clamp(1.8 + r * 1.8, 2.2, 12));
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) { this._tel.degenerate++; return -1; }
    if (y1 < y0 + 0.08) y1 = y0 + 0.08;

    // --- claim a slot ---
    let i;
    if (this._free.length) { i = this._free.pop(); }
    else { i = this.count; this._ensure(i + 1); this.count = i + 1; }

    const yaw = isObb ? (+shape.yaw || 0) : 0;
    this._kind[i] = isObb ? KIND_OBB : KIND_CIRCLE;
    this._x[i] = x; this._z[i] = z; this._r[i] = r;
    this._hx[i] = hx; this._hz[i] = hz;
    this._yaw[i] = yaw; this._cos[i] = Math.cos(yaw); this._sin[i] = Math.sin(yaw);
    this._y0[i] = y0; this._y1[i] = y1;
    this._mask[i] = shape.mask !== undefined ? (shape.mask | 0) : DEFAULT_MASK;
    this._tag[i] = tag || null;

    // ROUND 7, lane F. Breakability: the explicit field first, the tag table second.
    // `breakable: false` on a shape whose tag is on the table opts back OUT, which is how a
    // load-bearing fence (the manor's yard rail) stays put while the one on the verge goes.
    let mass = 0;
    const bk = shape.breakable;
    if (bk === false) mass = 0;
    else if (typeof bk === 'number' && bk > 0) mass = bk;
    else if (bk === true) mass = BREAK_DEFAULT;
    else if (tag && BREAKABLE_TAGS.has(tag)) mass = BREAKABLE_TAGS.get(tag);
    this._mass[i] = mass;
    if (mass > 0) this._tel.breakable++;

    // ...and climbability. These are SEMANTIC, ABSOLUTE refusals — the standable flag does
    // not buy its way past them, because a shape that says both 'trunk' and 'standable' is
    // a mistake and the refusal is the safer reading:
    //   climbable: false   the builder said so;
    //   a NON_CLIMB tag    a trunk, a post, a pole, a lamp column;
    // Breakability is deliberately NOT a refusal. F_BREAK only describes what the car can
    // crush. A tagged fence/rail/gate/hurdle/crate/hood in the vault band must remain visible
    // to ledgeHeight(..., anyTop=true), while the ordinary mantle/grab path still requires a
    // standable-or-steppable top and never leaves the player standing on that breakable.
    const noClimb = shape.climbable === false
      || (tag && NON_CLIMB_TAGS.has(tag));

    this._flags[i] = F_ALIVE
      | (shape.standable ? F_STANDABLE : 0)
      | (authored ? F_AUTHORED : 0)
      | (mass > 0 ? F_BREAK : 0)
      | (noClimb ? F_NOCLIMB : 0);
    this._stamp[i] = 0;

    const ci = this._chunkIndex(chunkId, true);
    this._chunk[i] = ci;
    if (ci >= 0) this.chunkItems[ci].push(i);

    this._insertGrid(i);
    this.live++;
    return i * 65536 + this._gen[i];
  }

  // Allocation-free convenience for the planting loop: emitting one object literal per
  // tree is thousands of short-lived objects per chunk build. These take numbers.
  addCircle(x, z, r, y0, y1, chunkId, standable) {
    return this._addRaw(KIND_CIRCLE, x, z, r, 0, 0, 0, y0, y1, chunkId, standable);
  }
  addObb(x, z, halfX, halfZ, yaw, y0, y1, chunkId, standable) {
    const r = Math.sqrt(halfX * halfX + halfZ * halfZ);
    return this._addRaw(KIND_OBB, x, z, r, Math.abs(halfX), Math.abs(halfZ), yaw, y0, y1, chunkId, standable);
  }

  _addRaw(kind, x, z, r, hx, hz, yaw, y0, y1, chunkId, standable) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !(r > 1e-4)) { this._tel.degenerate++; return -1; }
    if (hx > MAX_HALF_EXTENT || hz > MAX_HALF_EXTENT || r > MAX_HALF_EXTENT * 1.5) {
      this._tel.oversize++; return -1;
    }
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) { this._tel.degenerate++; return -1; }
    if (y1 < y0 + 0.08) y1 = y0 + 0.08;
    let i;
    if (this._free.length) { i = this._free.pop(); }
    else { i = this.count; this._ensure(i + 1); this.count = i + 1; }
    this._kind[i] = kind;
    this._x[i] = x; this._z[i] = z; this._r[i] = r; this._hx[i] = hx; this._hz[i] = hz;
    this._yaw[i] = yaw; this._cos[i] = Math.cos(yaw); this._sin[i] = Math.sin(yaw);
    this._y0[i] = y0; this._y1[i] = y1;
    this._mask[i] = DEFAULT_MASK;
    this._mass[i] = 0;               // the numeric fast path never makes a breakable
    this._tag[i] = null;
    this._flags[i] = F_ALIVE | (standable ? F_STANDABLE : 0);
    this._stamp[i] = 0;
    const ci = this._chunkIndex(chunkId, true);
    this._chunk[i] = ci;
    if (ci >= 0) this.chunkItems[ci].push(i);
    this._insertGrid(i);
    this.live++;
    return i * 65536 + this._gen[i];
  }

  removeCollider(id) {
    const i = Math.floor(id / 65536), gen = id % 65536;
    if (i < 0 || i >= this.count) return false;
    if (!(this._flags[i] & F_ALIVE) || this._gen[i] !== gen) return false;
    this._retire(i, true);
    return true;
  }

  _retire(i, unlinkChunk) {
    this._removeGrid(i);
    this._flags[i] = 0;
    this._mass[i] = 0;      // a recycled slot must never inherit breakability
    this._hits[i] = 0;      // ...nor another thing's bullet holes
    this._gen[i] = (this._gen[i] + 1) & 0xffff;
    if (unlinkChunk) {
      const ci = this._chunk[i];
      if (ci >= 0) {
        const list = this.chunkItems[ci];
        const j = list.indexOf(i);
        if (j >= 0) { list[j] = list[list.length - 1]; list.pop(); }
      }
    }
    this._chunk[i] = -1;
    this._free.push(i);
    this.live--;
  }

  // O(colliders in this chunk). This is the reason for the per-chunk bucket.
  removeChunk(chunkId) {
    const ci = this.chunkOf.get(chunkId);
    if (ci === undefined) return 0;
    const list = this.chunkItems[ci];
    let n = 0;
    for (let k = 0; k < list.length; k++) {
      const i = list[k];
      if (!(this._flags[i] & F_ALIVE)) continue;
      this._retire(i, false);   // the whole list goes; no per-item unlink
      n++;
    }
    list.length = 0;
    return n;
  }

  colliderCount() { return this.live; }

  stats() {
    return {
      colliders: this.live, slots: this.count, cells: this.grid.size,
      chunks: this.chunkItems.reduce((a, l) => a + (l.length ? 1 : 0), 0),
      recoveries: this._tel.recoveries, maxCorrection: this._tel.maxCorrection,
      rejected: this._tel.rejected, oversize: this._tel.oversize,
    };
  }

  // Requested by the integrator in docs/HANDOFF.md — tests/collision.mjs asserts on these.
  // Returns the LIVE telemetry object (reused; do not hold it across a reset).
  telemetry() {
    const t = this._tel;
    t.total = this.live;
    t.buckets = this.grid.size;
    return t;
  }

  // Nearest live collider to (x, z) within maxRadius, as { x, z, radius } — or null.
  // Debug/authoring only: it widens the gather ring, so it is not a hot-path query.
  debugNearest(x, z, maxRadius = 16) {
    let best = -1, bestD = Infinity;
    const n = this._gather(x, z, maxRadius);
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      const d = Math.hypot(x - this._x[i], z - this._z[i]) - this._r[i];
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0 || bestD > maxRadius) return null;
    const out = this._nearest;
    out.x = this._x[best]; out.z = this._z[best]; out.radius = this._r[best];
    out.kind = this._kind[best] === KIND_OBB ? 'obb' : 'circle';
    out.halfX = this._hx[best]; out.halfZ = this._hz[best]; out.yaw = this._yaw[best];
    out.y0 = this._y0[best]; out.y1 = this._y1[best];
    out.distance = bestD;
    out.id = best * 65536 + this._gen[best];
    return out;
  }

  /**
   * ROUND 13: the nearest live collider whose tag is in `tags` (an array), within maxRadius of
   * (x, z), measured to its rim. Returns the shared _nearest record (x, z, radius, tag,
   * distance) or null. dread.js's DROP asks it for the trunk over the landing.
   */
  nearestTagged(x, z, maxRadius, tags) {
    let best = -1, bestD = Infinity;
    const n = this._gather(x, z, maxRadius);
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      const t = this._tag[i];
      if (!t) continue;
      let ok = false;
      for (let j = 0; j < tags.length; j++) if (tags[j] === t) { ok = true; break; }
      if (!ok) continue;
      const d = Math.hypot(x - this._x[i], z - this._z[i]) - this._r[i];
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0 || bestD > maxRadius) return null;
    const out = this._nearest;
    out.x = this._x[best]; out.z = this._z[best]; out.radius = this._r[best];
    out.kind = this._kind[best] === KIND_OBB ? 'obb' : 'circle';
    out.halfX = this._hx[best]; out.halfZ = this._hz[best]; out.yaw = this._yaw[best];
    out.y0 = this._y0[best]; out.y1 = this._y1[best];
    out.distance = bestD;
    out.tag = this._tag[best];
    out.id = best * 65536 + this._gen[best];
    return out;
  }

  // -------------------------------------------------------------------------
  // crush — ROUND 7, lane F. THE CAR GOING THROUGH THINGS.
  //
  // Break every breakable collider that a disc of `radius` at (x, z) reaches between the
  // heights y0..y1, for a body arriving at `speed` m/s. Each thing is retired the instant
  // it breaks, so the very next sweep drives through the hole, and the shared result
  // describes what came apart so the caller can throw the debris and take the geometry
  // down. Returns the number broken.
  //
  // ONE gather, and only when the caller asks — the capsule sweep never sees any of this.
  // The result object is REUSED; copy what you need before the next call.
  //
  // The result:
  //   n            how many broke (0..8; the 9th in one 0.05 s tick waits for the next)
  //   mass         their total mass in kg — what the caller charges itself for
  //   x/y/z[i]     where each one stood (y is the middle of its own band)
  //   top[i]       its top, rad[i] its footprint radius, m[i] its mass, tag[i] its tag
  // -------------------------------------------------------------------------
  crush(x, z, radius, y0, y1, speed, mask) {
    const res = this._crush;
    res.n = 0; res.mass = 0; res.speedNeeded = Infinity;
    if (!(speed > CRUSH_BASE) || !(radius > 0)) return 0;
    this._tel.crushes++;
    const want = mask === undefined ? MASK.SOLID : mask;
    const n = this._gather(x, z, radius + 0.1);
    for (let k = 0; k < n && res.n < this._crushMax; k++) {
      const i = this._near[k];
      if (!(this._flags[i] & F_BREAK)) continue;
      if (!(this._mask[i] & want)) continue;
      // vertically apart: a culvert mouth under the road, or a branch over it
      if (this._y0[i] > y1 || this._y1[i] < y0) continue;
      const m = this._mass[i];
      const need = CRUSH_BASE + m * CRUSH_PER_KG;
      if (speed < need) { if (need < res.speedNeeded) res.speedNeeded = need; continue; }
      if (!this._footprintHit(i, x, z, radius)) continue;
      const j = res.n++;
      res.x[j] = this._x[i]; res.z[j] = this._z[i];
      res.y[j] = 0.5 * (this._y0[i] + this._y1[i]);
      res.top[j] = this._y1[i];
      res.rad[j] = this._r[i];
      res.m[j] = m;
      res.tag[j] = this._tag[i];
      res.mass += m;
      this._retire(i, true);
      this._tel.broken++; this._tel.brokenMass += m;
    }
    if (res.n) res.speedNeeded = 0;
    else if (!Number.isFinite(res.speedNeeded)) res.speedNeeded = 0;
    return res.n;
  }

  /** The last crush result. Shared scratch — never hold it across another crush(). */
  crushResult() { return this._crush; }

  /**
   * How many breakable colliders are live inside a radius, and their total mass. Authoring
   * and instrumentation only (it widens the gather ring), never the hot path.
   */
  breakablesNear(x, z, radius) {
    const n = this._gather(x, z, radius);
    let count = 0, mass = 0;
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      if (!(this._flags[i] & F_BREAK)) continue;
      if (Math.hypot(this._x[i] - x, this._z[i] - z) > radius + this._r[i]) continue;
      count++; mass += this._mass[i];
    }
    return { count, mass };   // allocates: instrumentation only, never called in step()
  }

  /** Is this collider id breakable, and at what mass? -1 when the id is dead. */
  massOf(id) {
    const i = Math.floor(id / 65536), gen = id % 65536;
    if (i < 0 || i >= this.count) return -1;
    if (!(this._flags[i] & F_ALIVE) || this._gen[i] !== gen) return -1;
    return this._mass[i];
  }

  /**
   * ROUND 13: a round or a buttstroke landed on collider `id`. Returns 0 when the thing is
   * not shot-breakable (or the id is dead), 1 when it took the hit and stands, 2 when it came
   * apart — then brokenResult() holds where and what, and the collider is already retired.
   * The count is per collider and dies with it; a rebuilt crate is a whole crate.
   */
  hitBreakable(id) {
    const i = Math.floor(id / 65536), gen = id % 65536;
    if (i < 0 || i >= this.count) return 0;
    if (!(this._flags[i] & F_ALIVE) || this._gen[i] !== gen) return 0;
    if (!(this._flags[i] & F_BREAK)) return 0;
    const tag = this._tag[i];
    const need = tag ? SHOT_BREAK.get(tag) : undefined;
    if (!need) return 0;
    const hits = this._hits[i] < 255 ? ++this._hits[i] : 255;
    if (hits < need) return 1;
    const b = this._broken;
    b.x = this._x[i]; b.z = this._z[i];
    b.y = 0.5 * (this._y0[i] + this._y1[i]); b.top = this._y1[i];
    b.radius = this._r[i]; b.mass = this._mass[i]; b.tag = tag; b.id = id; b.hits = hits;
    this._retire(i, true);
    this._tel.broken++; this._tel.brokenMass += b.mass; this._tel.shotBroken++;
    return 2;
  }

  /** The last hitBreakable() break. Shared scratch — read it before the next call. */
  brokenResult() { return this._broken; }

  /** How many landings a tag needs to come apart; 0 when a round cannot break it. */
  shotBreakHits(tag) { return SHOT_BREAK.get(tag) || 0; }

  resetTelemetry() {
    const t = this._tel;
    t.recoveries = 0; t.corrections = 0; t.maxCorrection = 0;
    t.resolves = 0; t.sweeps = 0; t.contacts = 0; t.rays = 0;
  }

  // -------------------------------------------------------------------------
  // broadphase gather — fills this._near / this._nearN with unique live slots.
  // Dedupe is a stamp compare, not a Set, so it allocates nothing.
  // NEVER hold _near across another _gather call.
  // -------------------------------------------------------------------------
  _gather(x, z, r) {
    const q = ++this._query;
    let n = 0;
    const minX = Math.floor((x - r) / CELL), maxX = Math.floor((x + r) / CELL);
    const minZ = Math.floor((z - r) / CELL), maxZ = Math.floor((z + r) / CELL);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const b = this.grid.get(this._key(cx, cz));
        if (!b) continue;
        for (let k = 0; k < b.length; k++) {
          const i = b[k];
          if (this._stamp[i] === q) continue;
          this._stamp[i] = q;
          if (!(this._flags[i] & F_ALIVE)) continue;
          if (n >= this._near.length) this._near = growI32(this._near, this._near.length * 2);
          this._near[n++] = i;
        }
      }
    }
    this._nearN = n;
    return n;
  }

  // -------------------------------------------------------------------------
  // narrowphase primitives — every one takes the capsule radius as a parameter
  // -------------------------------------------------------------------------

  // Does this collider stop a capsule whose feet/head are at these heights?
  _blocks(i, feet, head, grounded, stepUp) {
    if (!(this._mask[i] & MASK.SOLID)) return false;
    const y0 = this._y0[i], y1 = this._y1[i];
    if (head <= y0 + EPS || feet >= y1 - EPS) return false;    // [vanta colliderBlocksPlayer :1551]
    if (grounded && y1 >= feet - 0.035 && y1 <= feet + stepUp + STEP_TOL + EPS) {
      // Its top is inside the step. VANTA required an explicit supportsPlayer flag here,
      // which turned every low unflagged prop into an invisible wall. If you can step onto
      // it you must be able to step onto it, so it stops blocking AND starts supporting
      // (see _bestSupport, which mirrors this test).
      return false;
    }
    return true;
  }

  // Overlap test: is (px,pz) with radius `rad` inside the collider footprint?
  // Sets _nx,_nz (unit escape normal, world space) and _depth. [vanta overlapContact :1602]
  _overlap(i, px, pz, rad) {
    const dx = px - this._x[i], dz = pz - this._z[i];
    if (this._kind[i] === KIND_OBB) {
      const c = this._cos[i], s = this._sin[i];
      const lx = c * dx - s * dz, lz = s * dx + c * dz;
      const hx = this._hx[i], hz = this._hz[i];
      const cx = clamp(lx, -hx, hx), cz = clamp(lz, -hz, hz);
      const sx = lx - cx, sz = lz - cz;
      const d = Math.sqrt(sx * sx + sz * sz);
      let lnx = 0, lnz = 0, depth = 0;
      if (d > EPS) {
        if (d >= rad) return false;
        lnx = sx / d; lnz = sz / d; depth = rad - d;
      } else {
        // Centre is inside the box: leave by the nearest face, not by a zero normal.
        const fx = hx - Math.abs(lx), fz = hz - Math.abs(lz);
        if (fx < fz) { lnx = lx >= 0 ? 1 : -1; depth = rad + fx; }
        else { lnz = lz >= 0 ? 1 : -1; depth = rad + fz; }
      }
      this._nx = c * lnx + s * lnz;
      this._nz = -s * lnx + c * lnz;
      this._depth = depth;
      return true;
    }
    const d = Math.sqrt(dx * dx + dz * dz);
    const min = this._r[i] + rad;
    if (d >= min) return false;
    if (d <= EPS) { this._nx = 1; this._nz = 0; this._depth = min; return true; }
    this._nx = dx / d; this._nz = dz / d; this._depth = min - d;
    return true;
  }

  // Cheap footprint test with an arbitrary inflation, no normal. [vanta horizontalOverlap :1579]
  _footprintHit(i, px, pz, inflate) {
    const dx = px - this._x[i], dz = pz - this._z[i];
    if (this._kind[i] === KIND_OBB) {
      const c = this._cos[i], s = this._sin[i];
      const lx = c * dx - s * dz, lz = s * dx + c * dz;
      const cx = clamp(lx, -this._hx[i], this._hx[i]);
      const cz = clamp(lz, -this._hz[i], this._hz[i]);
      const ax = lx - cx, az = lz - cz;
      return ax * ax + az * az <= (inflate + EPS) * (inflate + EPS);
    }
    const rr = this._r[i] + inflate;
    return dx * dx + dz * dz <= rr * rr;
  }

  // Continuous sweep of a radius-`rad` disc from (sx,sz) along (dx,dz) against collider i.
  // Sets _toi (0..1), _nx,_nz (world normal). [vanta sweepAgainstCollider :1716-1833]
  _sweep(i, sx, sz, dx, dz, rad) {
    const rx = sx - this._x[i], rz = sz - this._z[i];
    if (this._kind[i] === KIND_CIRCLE) {
      const radius = this._r[i] + rad;
      const a = dx * dx + dz * dz;
      if (a <= 1e-12) return false;
      const c = rx * rx + rz * rz - radius * radius;
      if (c <= 0) return false;                 // already inside: depenetration's job
      const b = rx * dx + rz * dz;
      if (b >= 0) return false;                 // moving away
      const disc = b * b - a * c;
      if (disc < 0) return false;
      const toi = (-b - Math.sqrt(disc)) / a;
      if (toi < 0 || toi > 1) return false;
      const hx = rx + dx * toi, hz = rz + dz * toi;
      const len = Math.sqrt(hx * hx + hz * hz);
      if (len <= EPS) return false;
      this._toi = toi; this._nx = hx / len; this._nz = hz / len;
      return true;
    }

    // OBB: sweep in the box's local frame against the four inflated faces, then against
    // the four corner circles (the rounded Minkowski corners). Doing it in the local
    // frame is what stops a yawed fence collapsing to its bounding square.
    const c = this._cos[i], s = this._sin[i];
    const lsx = c * rx - s * rz, lsz = s * rx + c * rz;
    const ldx = c * dx - s * dz, ldz = s * dx + c * dz;
    const hx = this._hx[i], hz = this._hz[i];
    let bestT = Infinity, bnx = 0, bnz = 0;

    if (Math.abs(ldx) > 1e-10) {
      for (let k = 0; k < 2; k++) {
        const sign = k === 0 ? -1 : 1;
        const t = (sign * (hx + rad) - lsx) / ldx;
        if (t < -EPS || t > 1 + EPS || t >= bestT) continue;
        if (ldx * sign >= -EPS) continue;                       // face pointing away
        const hitZ = lsz + ldz * t;
        if (Math.abs(hitZ) > hz + EPS) continue;
        bestT = clamp(t, 0, 1); bnx = sign; bnz = 0;
      }
    }
    if (Math.abs(ldz) > 1e-10) {
      for (let k = 0; k < 2; k++) {
        const sign = k === 0 ? -1 : 1;
        const t = (sign * (hz + rad) - lsz) / ldz;
        if (t < -EPS || t > 1 + EPS || t >= bestT) continue;
        if (ldz * sign >= -EPS) continue;
        const hitX = lsx + ldx * t;
        if (Math.abs(hitX) > hx + EPS) continue;
        bestT = clamp(t, 0, 1); bnx = 0; bnz = sign;
      }
    }
    const a = ldx * ldx + ldz * ldz;
    if (a > 1e-12) {
      for (let a1 = -1; a1 <= 1; a1 += 2) {
        for (let a2 = -1; a2 <= 1; a2 += 2) {
          const cornerX = a1 * hx, cornerZ = a2 * hz;
          const mx = lsx - cornerX, mz = lsz - cornerZ;
          const b = mx * ldx + mz * ldz;
          const cc = mx * mx + mz * mz - rad * rad;
          if (cc <= 0 || b >= 0) continue;
          const disc = b * b - a * cc;
          if (disc < 0) continue;
          const t = (-b - Math.sqrt(disc)) / a;
          if (t < -EPS || t > 1 + EPS || t >= bestT) continue;
          const hitX = lsx + ldx * t, hitZ = lsz + ldz * t;
          // Only a genuine corner region, not a point the face test already owns.
          if (a1 * hitX < hx - EPS || a2 * hitZ < hz - EPS) continue;
          const nx = (hitX - cornerX) / rad, nz = (hitZ - cornerZ) / rad;
          if (ldx * nx + ldz * nz >= -EPS) continue;
          bestT = clamp(t, 0, 1); bnx = nx; bnz = nz;
        }
      }
    }
    if (!Number.isFinite(bestT)) return false;
    this._toi = bestT;
    this._nx = c * bnx + s * bnz;
    this._nz = -s * bnx + c * bnz;
    return true;
  }

  // -------------------------------------------------------------------------
  // support surfaces. Ground is terrain; colliders only ADD tops.
  // Sets _supH (height), _supNy (normal y), _supCollider (slot or -1).
  // Returns true when a surface exists in [refFeet - maxDrop, refFeet + maxRise].
  // -------------------------------------------------------------------------
  _bestSupport(x, z, refFeet, rad, maxRise, maxDrop) {
    let bestH = -Infinity, bestNy = 1, bestC = -1;
    const th = this.groundHeight(x, z);
    const tny = this._terrainNormalY(x, z);
    if (this._walkable(tny) && th <= refFeet + maxRise + EPS && th >= refFeet - maxDrop - EPS) {
      bestH = th; bestNy = tny; bestC = -1;
    }
    const n = this._gather(x, z, rad + 0.1);
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      if (!(this._mask[i] & MASK.SOLID)) continue;
      const top = this._y1[i];
      const standable = (this._flags[i] & F_STANDABLE) !== 0;
      // Mirrors _blocks: anything you may step over you may also stand on.
      const lowEnoughToStepOn = top <= refFeet + maxRise + STEP_TOL + EPS;
      if (!standable && !lowEnoughToStepOn) continue;
      if (top > refFeet + maxRise + STEP_TOL + EPS) continue;
      if (top < refFeet - maxDrop - EPS) continue;
      // 0.55x inflation: you stand on a top when most of your footprint is over it, not
      // when a fingernail overlaps it. [vanta supportSurfacesAt :1953]
      if (!this._footprintHit(i, x, z, rad * 0.55)) continue;
      if (top > bestH) { bestH = top; bestNy = 1; bestC = i; }
    }
    this._supH = bestH; this._supNy = bestNy; this._supCollider = bestC;
    return bestH > -Infinity;
  }

  // Public: the walkable height under (x,z) for feet currently at feetY.
  supportHeight(x, z, feetY, radius, stepUp) {
    const rad = radius === undefined ? CFG.player.RADIUS : radius;
    const rise = stepUp === undefined ? CFG.player.STEP_UP : stepUp;
    if (this._bestSupport(x, z, feetY, rad, rise, GROUND_SNAP)) return this._supH;
    return this.groundHeight(x, z);
  }

  // Is a capsule at (x,z) with feet at feetY free of every blocking collider?
  _isClear(x, z, feetY, rad, height) {
    const head = feetY + height;
    const n = this._gather(x, z, rad + 0.1);
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      if (!this._blocks(i, feetY, head, true, CFG.player.STEP_UP)) continue;
      if (this._overlap(i, x, z, rad)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // canOccupy — cheap authoring/spawn test. Used by the director, car spawn, prop
  // placement and by tests that assert a route is walkable.
  // -------------------------------------------------------------------------
  canOccupy(x, z, radius, height) {
    const rad = radius === undefined ? CFG.player.RADIUS : radius;
    const h = height === undefined ? CFG.player.STAND_H : height;
    const ground = this.groundHeight(x, z);
    if (!this._walkable(this._terrainNormalY(x, z))) return false;
    const feet = this._bestSupport(x, z, ground, rad, CFG.player.STEP_UP, GROUND_SNAP)
      ? this._supH : ground;
    return this._isClear(x, z, feet, rad, h);
  }

  // Public headroom test at an EXPLICIT foot height: is a capsule with its feet at feetY free
  // of every blocking collider? canOccupy answers for a body on the ground; a mantle needs
  // the same answer for a body standing on a ledge the ground knows nothing about.
  fits(x, z, feetY, radius, height) {
    const rad = radius > 0 ? radius : CFG.player.RADIUS;
    const h = height > 0 ? height : CFG.player.STAND_H;
    return this._isClear(x, z, feetY, rad, h);
  }

  // -------------------------------------------------------------------------
  // ledgeHeight — THE MANTLE'S EYES. Round 6, lane E (contract: docs/ROUND-6/BRIEF-COMMON.md).
  //
  // Alex, fifth playtest: "I'm not sure why I can't climb up stuff either." The mantle in
  // controller.js probed terrain.heightAt alone, and every crate, wall, roof and fence in the
  // county is a collider, so the verb answered nothing he walked up to.
  //
  // Returns the HIGHEST collider top at (x, z) that
  //   - lies above feetY and no more than maxRise above it,
  //   - is a floor (F_STANDABLE) or low enough to step onto — the same rule _bestSupport
  //     stands on, so a tree trunk (a circle with a 2.2-12 m top and no flag) is never a ledge
  //     and a lamp post is never a ledge,
  //   - the point is genuinely over, by the 0.55x footprint inflation _bestSupport uses (so a
  //     fingernail of overlap does not summon a climb),
  //   - and has headroom for a CROUCHED body standing on it — a shelf under a ceiling refuses.
  // or null. `anyTop` (optional) admits a non-standable top as well: the vault passes OVER a
  // fence and never stands on it, so a fence the world did not flag standable may still be
  // vaulted, but never mantled (a body left standing on it would fall through).
  //
  // No allocation. One gather; the headroom test walks the SAME gathered list, because
  // _isClear would gather the identical centre and radius (rad + 0.1) and a second gather
  // would overwrite the candidates mid-loop.
  //
  // feetY MUST BE THE FEET. The step-up exemption below is measured from it, so a caller
  // that passes some other height (the grab once passed the bottom of the hands' band,
  // eye - 0.40) turns every unflagged top within STEP_UP of THAT height into a ledge: tree
  // trunks, lamp posts, wrecks. Measured, repair 1: 16 of 40 trees near tests/climb.mjs's
  // strip were grabbed and stood on. Ask from the feet with a longer maxRise and filter the
  // answer instead (controller.js _tryClimb section 1).
  // -------------------------------------------------------------------------
  ledgeHeight(x, z, feetY, radius, maxRise, anyTop) {
    const rad = radius > 0 ? radius : CFG.player.RADIUS;
    const rise = maxRise > 0 ? maxRise : CFG.player.mantle.reach;
    const stepUp = CFG.player.STEP_UP;
    const crouchH = CFG.player.CROUCH_H;
    const n = this._gather(x, z, rad + 0.1);
    let best = -Infinity;
    for (let k = 0; k < n; k++) {
      const i = this._near[k];
      if (!(this._mask[i] & MASK.SOLID)) continue;
      const top = this._y1[i];
      if (top <= best) continue;
      if (top > feetY + rise + EPS) continue;
      if (top <= feetY + EPS) continue;                       // at or under the feet: not a ledge
      const standable = (this._flags[i] & F_STANDABLE) !== 0;
      // ROUND 7, lane F (docs/NEXT.md B5, Alex: the ledge grab climbs trees). Two refusals
      // that no height arithmetic can reach, because the height arithmetic is not what is
      // wrong: some things are simply not ledges however tall they are.
      //   1. F_NOCLIMB — the builder or semantic tag said so. A trunk, a post, a pole or a
      //      lamp column. Breakability is a separate car property and never sets this flag.
      //      This semantic refusal is what keeps the last tree out of the last forty while
      //      anyTop still lets a vault inspect a crushable fence without standing on it.
      //   2. A ROUND thing with no flat: a circle under MIN_ROUND_LEDGE across that nobody
      //      flagged standable. You cannot get a knee onto a 0.5 m disc.
      // A VAULT (anyTop) takes the same two refusals: you do not vault a tree either.
      if (this._flags[i] & F_NOCLIMB) continue;
      if (!standable && this._kind[i] === KIND_CIRCLE && this._r[i] < MIN_ROUND_LEDGE) continue;
      if (!standable && !anyTop && top > feetY + stepUp + STEP_TOL + EPS) continue;
      if (!this._footprintHit(i, x, z, rad * 0.55)) continue;
      // headroom for a crouched body whose feet are on this top
      const head = top + crouchH;
      let clear = true;
      for (let m = 0; m < n; m++) {
        const j = this._near[m];
        if (j === i) continue;
        if (!this._blocks(j, top, head, true, stepUp)) continue;
        if (this._overlap(j, x, z, rad)) { clear = false; break; }
      }
      if (!clear) continue;
      best = top;
    }
    return best > -Infinity ? best : null;
  }

  // -------------------------------------------------------------------------
  // depenetration — push out of everything currently overlapped, up to 4 passes,
  // projecting velocity on each contact. [vanta depenetratePlayer :1673-1714]
  // Reads/writes _sx,_sz. Returns the number of contacts resolved.
  // -------------------------------------------------------------------------
  _depenetrate(feet, head, grounded, rad, vel, stepUp) {
    let contacts = 0;
    for (let iter = 0; iter < 4; iter++) {
      let corrected = false;
      const n = this._gather(this._sx, this._sz, rad);
      for (let k = 0; k < n; k++) {
        const i = this._near[k];
        if (!this._blocks(i, feet, head, grounded, stepUp)) continue;
        if (!this._overlap(i, this._sx, this._sz, rad)) continue;
        const push = this._depth + EPS;
        this._sx += this._nx * push;
        this._sz += this._nz * push;
        if (push > this._tel.maxCorrection) this._tel.maxCorrection = push;
        this._tel.corrections++;
        const inward = vel.x * this._nx + vel.z * this._nz;
        if (inward < 0) { vel.x -= this._nx * inward; vel.z -= this._nz * inward; }
        contacts++;
        corrected = true;
      }
      if (!corrected) break;
    }
    return contacts;
  }

  // Horizontal sweep with sliding. Reads/writes _sx,_sz. [vanta sweepPlayerHorizontal :1835]
  _sweepHorizontal(dx, dz, feet, head, grounded, rad, vel, stepUp) {
    let contacts = this._depenetrate(feet, head, grounded, rad, vel, stepUp);
    this._hadStatic = contacts > 0;
    let rx = dx, rz = dz;
    for (let iter = 0; iter < MAX_CONTACTS; iter++) {
      const len = Math.sqrt(rx * rx + rz * rz);
      if (len <= 1e-8) break;
      // Query around the MIDPOINT with half the travel added to the radius: one gather
      // covers the whole swept segment, so a fast sprint cannot tunnel between cells.
      const mx = this._sx + rx * 0.5, mz = this._sz + rz * 0.5;
      const n = this._gather(mx, mz, len * 0.5 + rad);
      this._tel.sweeps++;
      let bestT = Infinity, bnx = 0, bnz = 0;
      for (let k = 0; k < n; k++) {
        const i = this._near[k];
        if (!this._blocks(i, feet, head, grounded, stepUp)) continue;
        if (!this._sweep(i, this._sx, this._sz, rx, rz, rad)) continue;
        if (this._toi < bestT) { bestT = this._toi; bnx = this._nx; bnz = this._nz; }
      }
      if (!Number.isFinite(bestT)) {
        this._sx += rx; this._sz += rz;
        break;
      }
      const travel = Math.max(0, bestT - EPS / len);
      this._sx += rx * travel + bnx * EPS;
      this._sz += rz * travel + bnz * EPS;
      const rest = Math.max(0, 1 - bestT);
      rx *= rest; rz *= rest;
      const inward = rx * bnx + rz * bnz;
      if (inward < 0) { rx -= bnx * inward; rz -= bnz * inward; }   // slide along the face
      const vin = vel.x * bnx + vel.z * bnz;
      if (vin < 0) { vel.x -= bnx * vin; vel.z -= bnz * vin; }
      contacts++;
    }
    contacts += this._depenetrate(feet, head, grounded, rad, vel, stepUp);
    this._contacts = contacts;
    this._tel.contacts += contacts;
    return contacts;
  }

  // Bounded ring search for a place to stand. 24 angles x 0.45 m out to 4.5 m — about 240
  // samples, and it only ever runs on a recovery, which telemetry counts.
  // [vanta findSafeSupportPosition :2026-2104]
  _findSafe(originX, originZ, refFeet, rad, height, allowBigDrop, remembered) {
    let bestScore = Infinity, found = false;
    const maxDelta = allowBigDrop ? Infinity : CFG.player.STEP_UP + GROUND_SNAP;

    const test = (sx, sz, dist) => {
      if (!this._bestSupport(sx, sz, refFeet, rad, Infinity, Infinity)) return;
      const h = this._supH;
      const delta = Math.abs(h - refFeet);
      if (delta > maxDelta) return;
      if (!this._walkable(this._supNy)) return;
      if (!this._isClear(sx, sz, h, rad, height)) return;
      const score = dist + delta * 0.08;
      if (score < bestScore) {
        bestScore = score; found = true;
        this._safeX = sx; this._safeY = h; this._safeZ = sz;
      }
    };

    test(originX, originZ, 0);
    if (found) return true;   // already standing somewhere legal; do not search a ring for fun
    if (remembered) {
      const d = Math.hypot(remembered.x - originX, remembered.z - originZ);
      if (d <= RECOVERY_RADIUS * 1.5) test(remembered.x, remembered.z, d);
    }
    for (let r = RING_STEP; r <= RECOVERY_RADIUS + EPS; r += RING_STEP) {
      for (let a = 0; a < RING_ANGLES; a++) {
        const ang = (a / RING_ANGLES) * TAU;
        test(originX + Math.cos(ang) * r, originZ + Math.sin(ang) * r, r);
      }
      if (found) break;   // the innermost ring that works wins; do not search 4.5 m for fun
    }
    return found;
  }

  // Rejected slope: gravity along the fall line, capped. [vanta applySteepSlopeSlide :2418]
  _slide(x, z, vel, dt) {
    this._gradient(x, z);
    const g = Math.sqrt(this._gx * this._gx + this._gz * this._gz);
    if (g <= 1e-6) return;
    const ny = 1 / Math.sqrt(1 + g * g);
    const accel = CFG.player.GRAVITY * Math.sqrt(Math.max(0, 1 - ny * ny));
    vel.x += (-this._gx / g) * accel * dt;
    vel.z += (-this._gz / g) * accel * dt;
    const sp = Math.hypot(vel.x, vel.z);
    if (sp > SLIDE_CAP) { vel.x = (vel.x / sp) * SLIDE_CAP; vel.z = (vel.z / sp) * SLIDE_CAP; }
  }

  // -------------------------------------------------------------------------
  // resolveCapsule — THE entry point.
  //
  //   pos  {x,y,z}  y is the FEET, in world metres. Mutated in place.
  //   vel  {x,y,z}  m/s, mutated in place (gravity is the CALLER's job; this only
  //                 cancels the components a surface eats).
  //   radius, height  capsule footprint radius and full standing height.
  //   dt   seconds.
  //
  // Returns the SHARED result object { pos, grounded, normal, recovered, contacts,
  // steppedUp, ceiling }. Copy anything you keep.
  // -------------------------------------------------------------------------
  resolveCapsule(pos, vel, radius, height, dt) {
    const res = this._res;
    res.pos = pos; res.recovered = false; res.steppedUp = false; res.ceiling = false;
    this._tel.resolves++;

    const rad = radius > 0 ? radius : CFG.player.RADIUS;
    const h = height > 0 ? height : CFG.player.STAND_H;
    const stepUp = CFG.player.STEP_UP;

    const startX = pos.x, startZ = pos.z;
    const feet = pos.y;
    const head = feet + h;
    const startVX = vel.x, startVZ = vel.z;

    // wasGrounded is INFERRED, not passed: one shared solver has no per-entity state, and
    // "my feet are within a snap of a support and I am not rising" is the honest test.
    const hadSupport = this._bestSupport(startX, startZ, feet, rad, stepUp, GROUND_SNAP);
    const startSupport = hadSupport ? this._supH : -Infinity;
    const wasGrounded = vel.y <= 0.01 && hadSupport && feet - startSupport <= GROUND_SNAP;
    const startTerrain = this.groundHeight(startX, startZ);

    // ---- 1. horizontal sweep -------------------------------------------------
    let dx = vel.x * dt, dz = vel.z * dt;
    this._sx = startX; this._sz = startZ;
    this._sweepHorizontal(dx, dz, feet, head, wasGrounded, rad, vel, stepUp);

    // ---- 2. blowout guard ----------------------------------------------------
    // If we started embedded and depenetration threw us further than the move plus 1.1 m,
    // or across a whole elevation band, the solve is nonsense: recover instead of teleporting.
    // [vanta movePlayerHorizontal :2243-2330]
    const desired = Math.hypot(dx, dz);
    const solvedDist = Math.hypot(this._sx - startX, this._sz - startZ);
    const solvedTerrain = this.groundHeight(this._sx, this._sz);
    const crossedBand = Math.abs(solvedTerrain - startTerrain) > stepUp + GROUND_SNAP;
    if (this._hadStatic && (solvedDist > desired + MAX_STATIC_DEPEN || crossedBand)) {
      const correction = Math.hypot(this._sx - (startX + dx), this._sz - (startZ + dz));
      this._tel.recoveries++;
      if (correction > this._tel.maxCorrection) this._tel.maxCorrection = correction;
      const remembered = this._safe.get(pos);
      if (this._findSafe(startX, startZ, feet, rad, h, false, remembered)) {
        pos.x = this._safeX; pos.y = this._safeY; pos.z = this._safeZ;
      } else {
        pos.x = startX; pos.z = startZ; pos.y = startTerrain;
      }
      vel.x = 0; vel.y = 0; vel.z = 0;
      res.grounded = this._walkable(this._terrainNormalY(pos.x, pos.z));
      res.recovered = true; res.contacts = this._contacts;
      res.normal.x = 0; res.normal.y = 1; res.normal.z = 0;
      this._remember(pos, res.grounded);
      return res;
    }

    // ---- 3. terrain as a barrier --------------------------------------------
    // Terrain is not in the collider field, so a hill you cannot climb has to be handled
    // here: project the move onto the contour and sweep again. [vanta :2325-2372]
    const targetTerrain = this.groundHeight(this._sx, this._sz);
    const targetNy = this._terrainNormalY(this._sx, this._sz);
    const allowance = wasGrounded ? stepUp : EPS;
    const barrier = targetTerrain > feet + allowance
      || (targetTerrain >= feet - GROUND_SNAP && !this._walkable(targetNy));
    if (barrier) {
      this._gradient(this._sx, this._sz);
      let nx, nz;
      const gl = Math.hypot(this._gx, this._gz);
      if (gl > 1e-5) { nx = -this._gx / gl; nz = -this._gz / gl; }   // points downhill
      else { const l = Math.hypot(dx, dz) || 1; nx = -dx / l; nz = -dz / l; }
      let tdx = dx, tdz = dz;
      const din = tdx * nx + tdz * nz;
      if (din < 0) { tdx -= nx * din; tdz -= nz * din; }
      vel.x = startVX; vel.z = startVZ;
      const vin = vel.x * nx + vel.z * nz;
      if (vin < 0) { vel.x -= nx * vin; vel.z -= nz * vin; }
      this._sx = startX; this._sz = startZ;
      this._sweepHorizontal(tdx, tdz, feet, head, wasGrounded, rad, vel, stepUp);
    }

    pos.x = this._sx; pos.z = this._sz;
    res.contacts = this._contacts;

    // ---- 4. step / snap while grounded ---------------------------------------
    let grounded = false;
    let ny = 1;
    if (wasGrounded) {
      if (this._bestSupport(pos.x, pos.z, feet, rad, stepUp, GROUND_SNAP)) {
        if (this._supH > feet + EPS) res.steppedUp = true;
        pos.y = this._supH;
        ny = this._supNy;
        vel.y = 0;
        grounded = true;
      }
    }

    // ---- 5. vertical ---------------------------------------------------------
    const prevFeet = pos.y;
    const prevHead = prevFeet + h;
    const desiredFeet = prevFeet + vel.y * dt;
    const desiredHead = desiredFeet + h;

    if (vel.y > 0) {
      // Rising: find the lowest underside we cross. [vanta resolvePlayerVertical :2450]
      let ceiling = Infinity;
      const n = this._gather(pos.x, pos.z, rad + 0.1);
      for (let k = 0; k < n; k++) {
        const i = this._near[k];
        if (!(this._mask[i] & MASK.SOLID)) continue;
        const under = this._y0[i];
        if (prevHead <= under + EPS && desiredHead >= under - EPS
          && this._footprintHit(i, pos.x, pos.z, rad)) {
          if (under < ceiling) ceiling = under;
        }
      }
      if (Number.isFinite(ceiling)) {
        pos.y = ceiling - h - EPS;
        vel.y = 0;
        grounded = false;
        res.ceiling = true;
      } else {
        pos.y = desiredFeet;
        grounded = false;
      }
    } else {
      // Falling (or standing): land on the highest surface the feet cross this step.
      const landed = this._bestSupport(pos.x, pos.z, prevFeet, rad, EPS, Math.max(0, prevFeet - desiredFeet) + EPS);
      if (landed && prevFeet >= this._supH - EPS && desiredFeet <= this._supH + EPS) {
        pos.y = this._supH;
        ny = this._supNy;
        vel.y = 0;
        grounded = true;
      } else {
        const th = this.groundHeight(pos.x, pos.z);
        const tny = this._terrainNormalY(pos.x, pos.z);
        if (desiredFeet <= th + EPS && !this._walkable(tny)) {
          // A slope past the limit is a floor you cannot keep: clamp and slide.
          pos.y = th + EPS;
          vel.y = 0;
          grounded = false;
          this._slide(pos.x, pos.z, vel, dt);
        } else {
          pos.y = desiredFeet;
          grounded = grounded && Math.abs(desiredFeet - prevFeet) <= EPS;
        }
      }
    }

    // ---- 6. bounded under-terrain rescue -------------------------------------
    if (this._rescue(pos, vel, rad, h, dt)) { res.recovered = true; grounded = true; }

    // ---- 7. NaN containment --------------------------------------------------
    if (!Number.isFinite(pos.x + pos.y + pos.z + vel.x + vel.y + vel.z)) {
      pos.x = startX; pos.z = startZ; pos.y = startTerrain;
      vel.x = 0; vel.y = 0; vel.z = 0;
      this._tel.recoveries++;
      res.recovered = true; grounded = true;
    }

    res.grounded = grounded;
    // Report the surface normal from the terrain gradient (a collider top is flat).
    if (grounded && this._supCollider >= 0) {
      res.normal.x = 0; res.normal.y = 1; res.normal.z = 0;
    } else {
      this._gradient(pos.x, pos.z);
      const g2 = this._gx * this._gx + this._gz * this._gz;
      const inv = 1 / Math.sqrt(1 + g2);
      res.normal.x = -this._gx * inv; res.normal.y = inv; res.normal.z = -this._gz * inv;
    }
    this._remember(pos, grounded);
    return res;
  }

  _remember(pos, grounded) {
    if (!grounded) return;
    let s = this._safe.get(pos);
    if (!s) { s = { x: 0, y: 0, z: 0 }; this._safe.set(pos, s); }
    s.x = pos.x; s.y = pos.y; s.z = pos.z;
  }

  // Under-terrain rescue. BOUNDED and self-reporting: a dip inside the step height is a
  // silent correction, anything deeper counts a recovery so a walk test can assert zero.
  // [vanta recoverPlayerIfBelowTerrain :2137-2198]
  _rescue(pos, vel, rad, h, dt) {
    const th = this.groundHeight(pos.x, pos.z);
    if (pos.y >= th - UNDER_TERRAIN_TOL) return false;
    const penetration = th - pos.y;
    const ny = this._terrainNormalY(pos.x, pos.z);

    if (penetration > this._tel.maxCorrection) this._tel.maxCorrection = penetration;

    if (penetration <= CFG.player.STEP_UP + EPS) {
      // A step's worth of sink is the solver rounding, not a failure.
      this._tel.corrections++;
      pos.y = th + EPS;
      vel.y = 0;
      if (!this._walkable(ny)) this._slide(pos.x, pos.z, vel, dt);
      return true;
    }

    this._tel.recoveries++;
    const remembered = this._safe.get(pos);
    if (this._findSafe(pos.x, pos.z, pos.y, rad, h, true, remembered)) {
      pos.x = this._safeX; pos.y = this._safeY; pos.z = this._safeZ;
      vel.x = 0; vel.y = 0; vel.z = 0;
      return true;
    }
    // Last resort: an unwalkable patch is still a better boundary than falling forever.
    pos.y = th + EPS;
    vel.y = 0;
    if (!this._walkable(ny)) this._slide(pos.x, pos.z, vel, dt);
    return true;
  }

  // -------------------------------------------------------------------------
  // raycast — exact ray vs vertical prisms, walked over the grid with a 2D DDA so a
  // 300 m bullet touches a handful of cells. Returns the SHARED result object or null.
  //
  //   origin {x,y,z}, dir {x,y,z} (normalised here defensively), maxT metres.
  //   mask   defaults to SHOT|GROUND. Include MASK.GROUND to also march the terrain
  //          through terrain.marchRay (never a mesh).
  // -------------------------------------------------------------------------
  raycast(origin, dir, maxT, mask) {
    this._tel.rays++;
    const m = mask === undefined ? (MASK.SHOT | MASK.GROUND) : mask;
    const ox = origin.x, oy = origin.y, oz = origin.z;
    let dx = dir.x, dy = dir.y, dz = dir.z;
    const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(dl > 1e-9) || !(maxT > 0)) return null;
    dx /= dl; dy /= dl; dz /= dl;

    const r = this._ray;
    let bestT = maxT, bestI = -1, bnx = 0, bny = 0, bnz = 0, ground = false;

    // --- ground first: it bounds how far the DDA has to walk ---
    if (m & MASK.GROUND) {
      const t = this._terrain();
      if (t && typeof t.marchRay === 'function') {
        const gt = t.marchRay(ox, oy, oz, dx, dy, dz, maxT);
        if (gt !== null && gt !== undefined && gt >= 0 && gt < bestT) {
          bestT = gt; ground = true; bestI = -1;
          this._gradient(ox + dx * gt, oz + dz * gt);
          const g2 = this._gx * this._gx + this._gz * this._gz;
          const inv = 1 / Math.sqrt(1 + g2);
          bnx = -this._gx * inv; bny = inv; bnz = -this._gz * inv;
        }
      }
    }

    // --- 2D DDA over the 8 m cells ---
    const q = ++this._query;
    let cx = Math.floor(ox / CELL), cz = Math.floor(oz / CELL);
    const stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
    const stepZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);
    const invDX = dx !== 0 ? 1 / dx : Infinity;
    const invDZ = dz !== 0 ? 1 / dz : Infinity;
    let tMaxX = stepX === 0 ? Infinity
      : ((cx + (stepX > 0 ? 1 : 0)) * CELL - ox) * invDX;
    let tMaxZ = stepZ === 0 ? Infinity
      : ((cz + (stepZ > 0 ? 1 : 0)) * CELL - oz) * invDZ;
    const tDeltaX = stepX === 0 ? Infinity : Math.abs(CELL * invDX);
    const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(CELL * invDZ);
    let cellEnter = 0;
    let guard = 0;
    while (cellEnter <= bestT && guard++ < 4096) {
      const b = this.grid.get(this._key(cx, cz));
      if (b) {
        for (let k = 0; k < b.length; k++) {
          const i = b[k];
          if (this._stamp[i] === q) continue;
          this._stamp[i] = q;
          if (!(this._flags[i] & F_ALIVE)) continue;
          if (!(this._mask[i] & m)) continue;
          if (!this._rayPrism(i, ox, oy, oz, dx, dy, dz, bestT)) continue;
          bestT = this._toi; bestI = i; ground = false;
          bnx = this._rnx; bny = this._rny; bnz = this._rnz;
        }
      }
      if (tMaxX < tMaxZ) { cellEnter = tMaxX; cx += stepX; tMaxX += tDeltaX; }
      else { cellEnter = tMaxZ; cz += stepZ; tMaxZ += tDeltaZ; }
      if (stepX === 0 && stepZ === 0) break;   // a purely vertical ray sees one cell
    }

    if (bestI < 0 && !ground) { r.hit = false; return null; }
    r.hit = true;
    r.t = bestT;
    r.ground = ground;
    r.id = bestI < 0 ? -1 : bestI * 65536 + this._gen[bestI];
    r.chunk = bestI < 0 ? -1 : (this._chunk[bestI] >= 0 ? this.chunkKeys[this._chunk[bestI]] : -1);
    r.tag = bestI < 0 ? null : (this._tag[bestI] || null);
    r.point.x = ox + dx * bestT; r.point.y = oy + dy * bestT; r.point.z = oz + dz * bestT;
    r.normal.x = bnx; r.normal.y = bny; r.normal.z = bnz;
    return r;
  }

  // Exact ray vs one vertical prism (circle or yawed box extruded y0..y1).
  // Sets _toi and _rnx/_rny/_rnz. Slab intersection, so a rotated wall is exact.
  _rayPrism(i, ox, oy, oz, dx, dy, dz, limit) {
    const y0 = this._y0[i], y1 = this._y1[i];
    let tMin = 0, tMax = limit;
    let axis = 0, sign = 0;      // 0 = none yet, 1 = y, 2 = x/local, 3 = z/local, 4 = radial

    // y slab
    if (Math.abs(dy) < 1e-9) {
      if (oy < y0 || oy > y1) return false;
    } else {
      let ta = (y0 - oy) / dy, tb = (y1 - oy) / dy;
      let s = -1;
      if (ta > tb) { const t = ta; ta = tb; tb = t; s = 1; }
      if (ta > tMin) { tMin = ta; axis = 1; sign = s; }
      if (tb < tMax) tMax = tb;
      if (tMin > tMax) return false;
    }

    if (this._kind[i] === KIND_CIRCLE) {
      const mx = ox - this._x[i], mz = oz - this._z[i];
      const rr = this._r[i];
      const a = dx * dx + dz * dz;
      if (a < 1e-12) {
        if (mx * mx + mz * mz > rr * rr) return false;   // vertical ray outside the disc
      } else {
        const b = mx * dx + mz * dz;
        const c = mx * mx + mz * mz - rr * rr;
        const disc = b * b - a * c;
        if (disc < 0) return false;
        const sq = Math.sqrt(disc);
        const t0 = (-b - sq) / a, t1 = (-b + sq) / a;
        if (t0 > tMin) { tMin = t0; axis = 4; }
        if (t1 < tMax) tMax = t1;
        if (tMin > tMax) return false;
      }
      if (tMin < 0 || tMin > limit) return false;
      this._toi = tMin;
      if (axis === 4) {
        const hx = ox + dx * tMin - this._x[i], hz = oz + dz * tMin - this._z[i];
        const l = Math.hypot(hx, hz) || 1;
        this._rnx = hx / l; this._rny = 0; this._rnz = hz / l;
      } else {
        this._rnx = 0; this._rny = sign >= 0 ? 1 : -1; this._rnz = 0;
      }
      return true;
    }

    // OBB: two more slabs in the local frame.
    const c = this._cos[i], s = this._sin[i];
    const rx = ox - this._x[i], rz = oz - this._z[i];
    const lox = c * rx - s * rz, loz = s * rx + c * rz;
    const ldx = c * dx - s * dz, ldz = s * dx + c * dz;
    const hx = this._hx[i], hz = this._hz[i];

    if (Math.abs(ldx) < 1e-9) {
      if (lox < -hx || lox > hx) return false;
    } else {
      let ta = (-hx - lox) / ldx, tb = (hx - lox) / ldx;
      let sg = -1;
      if (ta > tb) { const t = ta; ta = tb; tb = t; sg = 1; }
      if (ta > tMin) { tMin = ta; axis = 2; sign = sg; }
      if (tb < tMax) tMax = tb;
      if (tMin > tMax) return false;
    }
    if (Math.abs(ldz) < 1e-9) {
      if (loz < -hz || loz > hz) return false;
    } else {
      let ta = (-hz - loz) / ldz, tb = (hz - loz) / ldz;
      let sg = -1;
      if (ta > tb) { const t = ta; ta = tb; tb = t; sg = 1; }
      if (ta > tMin) { tMin = ta; axis = 3; sign = sg; }
      if (tb < tMax) tMax = tb;
      if (tMin > tMax) return false;
    }
    if (tMin < 0 || tMin > limit) return false;
    this._toi = tMin;
    let lnx = 0, lny = 0, lnz = 0;
    if (axis === 1) lny = sign >= 0 ? 1 : -1;
    else if (axis === 2) lnx = sign >= 0 ? 1 : -1;
    else if (axis === 3) lnz = sign >= 0 ? 1 : -1;
    else lny = 1;
    this._rnx = c * lnx + s * lnz;
    this._rny = lny;
    this._rnz = -s * lnx + c * lnz;
    return true;
  }

  // Line of sight between two world points at a given height. Used by AI and by the
  // torch trade. Cheap: one raycast with the SIGHT mask, no ground march.
  segmentClear(x0, y0, z0, x1, y1, z1) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-6) return true;
    _seg0.x = x0; _seg0.y = y0; _seg0.z = z0;
    _seg1.x = dx / d; _seg1.y = dy / d; _seg1.z = dz / d;
    return this.raycast(_seg0, _seg1, d, MASK.SIGHT) === null;
  }
}

// module-level scratch for segmentClear — never allocated per call
const _seg0 = { x: 0, y: 0, z: 0 };
const _seg1 = { x: 0, y: 0, z: 0 };

export default Collision;
