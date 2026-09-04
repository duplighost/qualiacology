// CURFEW — roads.
//
// A FIELD for every query, a SPLINE for authoring and rendering.
//
// The architecture is MOSSWAY's (`game.js:94-178`): roads are ONE function
// roadDistance(x,z) returning metres to the nearest centreline, and terrain
// flattening, ground colour, planting exclusion, spawn bands, car on/off-road
// physics and wayfinding ALL query it. MOSSWAY's lattice body is replaced with
// an authored polyline graph resampled by Catmull-Rom (SKYSHARD
// `src/world/streams.js:29-50`) over an 8 m segment hash, so the field stays
// O(1) at any map size.
//
// THIS FILE IMPORTS NO THREE. That is deliberate and load-bearing: chunk-worker.js
// must import the same road code the main thread uses, and a Worker cannot touch
// three (nor can it resolve the page's importmap). Callers pass their own `out`
// vectors; the only three-shaped thing here is `out.set(x, y)`.
//
// It also imports nothing from terrain.js — there is NO import cycle. terrain.js
// imports this module and injects its road-base sampler with setRoadBaseSampler();
// spline elevations are computed lazily on first use, by which time the injection
// has happened.
//
// HEADING CONVENTION (MOSSWAY game.js:1846-1858, and the survey's flagged trap):
// heading 0 faces +Z, forward = (sin h, cos h). Three.js objects face -Z. Anything
// that feeds bestRoadHeadingAt() into an Object3D rotation must flip it.

import { CFG } from '../config.js';
import { clamp, clamp01, lerp, smoothstep, TAU } from '../engine/math.js';

const RC = CFG.roads;

/** Returned when nothing is near enough to matter. Callers compare, never divide. */
export const ROAD_FAR = 400;

/* ------------------------------------------------------------------ *
 * Authoring: one county loop + two gravel spurs + ten forest lanes.
 * ------------------------------------------------------------------ */

// The loop is authored as a wandering ring rather than 21 typed pairs: two
// non-harmonic lobes (3 and 5 per revolution) so it never reads as a circle,
// on a mean radius of 1452 m which keeps the whole asphalt inside the 1900 m
// rim with room for verges and the odd lay-by. Length comes out ~10.6 km.
const LOOP_N = 21;
const LOOP_PTS = [];
for (let i = 0; i < LOOP_N; i++) {
  const a = (i / LOOP_N) * TAU;
  const r = 1452 + 128 * Math.sin(a * 3 + 0.7) + 96 * Math.sin(a * 5 - 1.9);
  LOOP_PTS.push([Math.cos(a) * r, Math.sin(a) * r]);
}

// M0's three destinations. The DESIGN §2 destination law says every destination
// has a road within 40 m; two of these ARE road control points, so the law holds
// by construction rather than by audit. terrain.js imports this and turns each
// into a FLATS disc — the pad and the road therefore agree about the ground.
export const M0_SITES = [
  // On the loop itself: the road runs through the yard.
  { id: 'ashfall-works', x: LOOP_PTS[3][0], z: LOOP_PTS[3][1], radius: 46, blend: 0.74 },
  // At the end of the west gravel spur.
  { id: 'filling-station', x: -520, z: 240, radius: 38, blend: 0.72 },
  // At the end of the north gravel spur.
  { id: 'briar-house', x: 410, z: -560, radius: 30, blend: 0.70 },
];

// The secondary graph deliberately uses shared point objects at junctions. It is not
// decorative paint: every lane enters the same sampled segment table and therefore the
// same distance field, terrain carve, ribbon builder, map and car-spawn queries as the
// county loop. Three of the lanes meet at WORKS_JUNCTION; the others leave and rejoin the
// loop or one of its useful spurs. Optional third values are metres added to the smoothed
// road base. A short 0 -> lip -> landing -> 0 profile makes a real crest in heightAt(),
// rather than a mesh-only bump the car and collision would drive straight through.
const STATION_JUNCTION = [M0_SITES[1].x, M0_SITES[1].z];
const MANOR_JUNCTION = [M0_SITES[2].x, M0_SITES[2].z];
const WORKS_JUNCTION = [320, 420];
const CHAPEL_WEST_JUNCTION = [-610, 1160];
const CHAPEL_EAST_JUNCTION = [-360, 1160];

const jump = (id, approach, crest, landing, recovery) => (
  { id, approach, crest, landing, recovery }
);

const ROUTES_SRC = [
  { id: 'county-loop', kind: 'asphalt', closed: true, width: RC.width, pts: LOOP_PTS },
  {
    id: 'spur-west', kind: 'gravel', closed: false, width: RC.width * 0.82,
    pts: [LOOP_PTS[10], [-1150, 232], [-840, 268], [M0_SITES[1].x, M0_SITES[1].z]],
  },
  {
    id: 'spur-north', kind: 'gravel', closed: false, width: RC.width * 0.82,
    pts: [LOOP_PTS[17], [490, -980], [520, -790], [M0_SITES[2].x, M0_SITES[2].z]],
  },
  {
    id: 'station-northwest', kind: 'forest', secondary: true, closed: false, width: 3.80,
    pts: [
      LOOP_PTS[8], [-1010, 920], [-906.60, 795.77], [-900.61, 777.31, 4.5],
      [-902.40, 758.65, -0.4], [-915.81, 739.94], [-1010, 650],
      [-860, 540], [-920, 400], [-740, 330], STATION_JUNCTION,
    ],
    jumps: [jump('northwest-pop', 2, 3, 4, 5)],
  },
  {
    id: 'reservoir-road', kind: 'forest', secondary: true, closed: false, width: 3.45,
    pts: [
      STATION_JUNCTION, [-660, 150], [-690, 143], [-715, 137],
      [-744, 130], [-790, 120], [-860, 0], [-760, -90],
      [-760, -106, 4.8], [-765, -127, -0.5], [-774, -150], [-788, -173],
      [-830, -220], [-1010, -300], [-1080, -450], LOOP_PTS[12],
    ],
    jumps: [jump('reservoir-rise', 7, 8, 9, 10)],
  },
  {
    id: 'witch-road', kind: 'forest', secondary: true, closed: false, width: 3.55,
    pts: [
      LOOP_PTS[13], [-830, -870], [-710, -980], [-560, -900], [-430, -760],
      [-400, -770], [-375, -779], [-345, -790], [-310, -802],
      [-260, -820], [-100, -700], [-15.66, -725.56], [7.96, -738.55, 4.8],
      [31.18, -750.12, -0.4], [53.61, -758.15], [80, -760], [220, -650],
      MANOR_JUNCTION,
    ],
    jumps: [jump('witch-hump', 11, 12, 13, 14)],
  },
  {
    id: 'fox-run', kind: 'forest', secondary: true, closed: false, width: 3.35,
    pts: [
      MANOR_JUNCTION, [500, -650], [580, -620], [610, -628], [635, -640],
      [663, -653], [689.68, -661.16], [704.10, -679.45, 4.7],
      [709.15, -707.94, -0.4], [717.08, -733.68], [730, -740],
      [850, -650], [920, -780], [1050, -700], LOOP_PTS[19],
    ],
    jumps: [jump('fox-lip', 6, 7, 8, 9)],
  },
  {
    id: 'ridge-switchbacks', kind: 'forest', secondary: true, closed: false, width: 3.40,
    pts: [
      LOOP_PTS[14], [-650, -1280], [-590, -1160], [-430, -1230], [-300, -1120],
      [-275, -1145], [-253, -1168], [-230, -1194], [-200, -1224],
      [-160, -1270], [-65.00, -1187.97], [-43.02, -1172.03, 5.2],
      [-21.64, -1161.81, -0.45], [-1.59, -1159.73], [0, -1160],
      [150, -1330], [310, -1240], LOOP_PTS[17],
    ],
    jumps: [jump('ridge-kicker', 10, 11, 12, 13)],
  },
  {
    id: 'chapel-backroad', kind: 'forest', secondary: true, closed: false, width: 3.30,
    pts: [
      LOOP_PTS[7], [-720, 1250], CHAPEL_WEST_JUNCTION, [-500, 1280], CHAPEL_EAST_JUNCTION,
      [-335, 1185], [-312, 1210], [-288, 1237], [-255, 1270],
      [-230, 1300], [-80, 1160], [9.19, 1230.94], [28.45, 1245.08, 4.8],
      [53.89, 1257.33, -0.4], [76.74, 1265.87], LOOP_PTS[5],
    ],
    jumps: [jump('chapel-crest', 11, 12, 13, 14)],
  },
  {
    // A narrow crooked lane leaves the chapel backroad, folds down through the trees to
    // Avery's actual arrival point, then rejoins the same backroad. The shared endpoint
    // objects make both junctions exact graph facts. Its single modest crest stays more
    // than 150 m north of the house, well clear of the 52 m pad and front approach.
    id: 'avery-lane', kind: 'forest', secondary: true, closed: false, width: 3.30,
    pts: [
      CHAPEL_WEST_JUNCTION,
      [-582, 1131], [-605, 1095], [-625, 1065], [-592, 1045, 3.5],
      [-570, 1000, -0.3], [-548, 982], [-570, 948], [-528, 918], [-488, 931], [-456, 913],
      [-434, 899],
      [-409, 916], [-382, 943], [-404, 978], [-369, 1010],
      [-392, 1045], [-352, 1076], [-381, 1106], [-345, 1134],
      CHAPEL_EAST_JUNCTION,
    ],
    jumps: [jump('avery-rise', 3, 4, 5, 6)],
  },
  {
    id: 'works-cut', kind: 'forest', secondary: true, closed: false, width: 3.90,
    pts: [
      STATION_JUNCTION, [-400, 360], [-250, 300], [-120, 430], [30, 350],
      [113.08, 455.35], [128.46, 476.50, 5.0], [144.50, 492.28, -0.45],
      [161.62, 500.34], WORKS_JUNCTION, [440, 610], [490, 595], [515, 603],
      [542, 620], [575, 640], [600, 660], [650, 760], [790, 850],
      [720, 1010], LOOP_PTS[3],
    ],
    jumps: [jump('works-crown', 5, 6, 7, 8)],
  },
  {
    id: 'east-cross', kind: 'forest', secondary: true, closed: false, width: 3.60,
    pts: [
      LOOP_PTS[1], [1320, 360], [1190, 500], [1050, 390],
      [1034.42, 395.51], [1016.24, 408.25, 4.8], [997.36, 426.22, -0.4],
      [978.31, 447.56], [900, 540], [870, 512], [845, 490], [818, 470], [785, 450],
      [740, 400], [600, 520], [480, 360], WORKS_JUNCTION,
    ],
    jumps: [jump('east-hop', 4, 5, 6, 7)],
  },
  {
    id: 'sawmill-bends', kind: 'forest', secondary: true, closed: false, width: 3.45,
    pts: [
      LOOP_PTS[20], [1230, -360], [1120, -210], [970, -330], [820, -160],
      [790, -180], [765, -195], [738, -210], [705, -228],
      [660, -250], [560, -80], [420, -30], [500, 130], [486.49, 156.64],
      [469.08, 171.19, 5.1], [448.00, 184.96, -0.45], [425.86, 199.48],
      [390, 235], WORKS_JUNCTION,
    ],
    jumps: [jump('sawmill-kick', 13, 14, 15, 16)],
  },
];

/* ------------------------------------------------------------------ *
 * Catmull-Rom resample (SKYSHARD streams.js:29-43), closed-loop aware.
 * ------------------------------------------------------------------ */

function cr(p0, p1, p2, p3, t, t2, t3) {
  return 0.5 * ((2 * p1) + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function resample(pts, closed, step) {
  const n = pts.length;
  const at = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  const out = [];
  const last = closed ? n - 1 : n - 2;
  for (let i = 0; i <= last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(segLen / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push(cr(p0[0], p1[0], p2[0], p3[0], t, t2, t3),
        cr(p0[1], p1[1], p2[1], p3[1], t, t2, t3),
        cr(p0[2] || 0, p1[2] || 0, p2[2] || 0, p3[2] || 0, t, t2, t3));
    }
  }
  if (!closed) out.push(pts[n - 1][0], pts[n - 1][1], pts[n - 1][2] || 0);
  return out;
}

/* ------------------------------------------------------------------ *
 * Sample store. Flat typed arrays; segment i of route r joins sample
 * (start+i) to (start+i+1), wrapping when the route is closed.
 * ------------------------------------------------------------------ */

const ROUTES = [];
let SX, SZ, SY, SO, SDIST;  // x, z, smoothed y, authored y offset, arc at each sample
let SEG_S = null;           // Int32Array: first-sample index of each segment
let SEG_R = null;           // Int32Array: route index of each segment
let SEG_N = 0;
let TOTAL_LENGTH = 0;
let SECONDARY_LENGTH = 0;
let JUMP_COUNT = 0;
const JUNCTION_SAMPLES = [];

{
  const xs = [], zs = [], offsets = [];
  for (let r = 0; r < ROUTES_SRC.length; r++) {
    const src = ROUTES_SRC[r];
    const flat = resample(src.pts, src.closed, RC.sample);
    const start = xs.length;
    for (let i = 0; i < flat.length; i += 3) {
      xs.push(flat[i]); zs.push(flat[i + 1]); offsets.push(flat[i + 2]);
    }
    const jumps = (src.jumps || []).map((j) => {
      const marker = (idx) => Object.freeze({
        x: src.pts[idx][0], z: src.pts[idx][1], lift: src.pts[idx][2] || 0,
      });
      return Object.freeze({
        id: j.id,
        approach: marker(j.approach), crest: marker(j.crest),
        landing: marker(j.landing), recovery: marker(j.recovery),
      });
    });
    ROUTES.push({
      id: src.id, kind: src.kind, width: src.width, closed: src.closed,
      secondary: !!src.secondary, controlCount: src.pts.length,
      jumps: Object.freeze(jumps),
      start, n: (flat.length / 3), length: 0,
    });
    JUMP_COUNT += jumps.length;
  }
  SX = Float32Array.from(xs);
  SZ = Float32Array.from(zs);
  SO = Float32Array.from(offsets);
  SY = new Float32Array(SX.length);
  SDIST = new Float32Array(SX.length);

  // Any identical samples are real graph junctions. Keep the earliest route's elevation
  // authoritative (loop, then legacy spurs, then the new lanes) and pin every later branch
  // to it while smoothing. That preserves the old roads and prevents a ribbon step where a
  // narrow lane rejoins them. The correction then diffuses back along each branch.
  const junctions = new Map();
  for (let i = 0; i < SX.length; i++) {
    const key = SX[i].toFixed(3) + '|' + SZ[i].toFixed(3);
    let group = junctions.get(key);
    if (!group) { group = []; junctions.set(key, group); }
    group.push(i);
  }
  for (const group of junctions.values()) if (group.length > 1) JUNCTION_SAMPLES.push(group);

  // Segment table. A closed route has n segments (the last wraps to the first);
  // an open route has n-1.
  let count = 0;
  for (const rt of ROUTES) count += rt.closed ? rt.n : rt.n - 1;
  SEG_S = new Int32Array(count);
  SEG_R = new Int32Array(count);
  let k = 0;
  for (let r = 0; r < ROUTES.length; r++) {
    const rt = ROUTES[r];
    const segs = rt.closed ? rt.n : rt.n - 1;
    for (let i = 0; i < segs; i++) { SEG_S[k] = rt.start + i; SEG_R[k] = r; k++; }
  }
  SEG_N = count;

  // Arc length, per route.
  for (const rt of ROUTES) {
    let d = 0;
    for (let i = 0; i < rt.n; i++) {
      const a = rt.start + i;
      SDIST[a] = d;
      const b = rt.start + ((i + 1) % rt.n);
      if (i < rt.n - 1 || rt.closed) d += Math.hypot(SX[b] - SX[a], SZ[b] - SZ[a]);
    }
    rt.length = d;
    TOTAL_LENGTH += d;
    if (rt.secondary) SECONDARY_LENGTH += d;
  }
}

/** Total centreline metres across every authored route. */
export function totalRoadLength() { return TOTAL_LENGTH; }
/** Metres of the county loop alone. */
export function loopLength() { return ROUTES[0].length; }
/** Metres authored specifically as the narrow Round 9 secondary network. */
export function secondaryRoadLength() { return SECONDARY_LENGTH; }
/** Count of deliberate approach -> crest -> landing profiles in that network. */
export function jumpCrestCount() { return JUMP_COUNT; }

/** Second endpoint of segment `s` — wraps on a closed route. */
function segEnd(s) {
  const rt = ROUTES[SEG_R[s]];
  const i = SEG_S[s] - rt.start;
  return rt.start + ((i + 1) % rt.n);
}

/* ------------------------------------------------------------------ *
 * Spatial index.
 *
 * Two levels, because a naive ring search costs 1600 lookups per terrain
 * tile and heightAt() is called per vertex:
 *   - COARSE: a 16 m chamfer distance grid. One array read answers every
 *     query that is far from a road, which is ~94% of the county.
 *   - FINE:   an 8 m segment hash (CFG.roads.hashCell) that gives the EXACT
 *     distance within EXACT_RANGE. Only the thin band along the roads pays.
 * ------------------------------------------------------------------ */

const CELL = RC.hashCell;             // 8 m
const GRID_HALF = 2400;               // county half-size + rim margin
const GRID_N = Math.ceil((GRID_HALF * 2) / CELL);
const PAD = CELL;                     // a segment is registered within 8 m of itself
const EXACT_RANGE = 40;               // the fine hash is authoritative inside this

const COARSE = 16;
const COARSE_N = Math.ceil((GRID_HALF * 2) / COARSE);

let CELL_START = null;                // Int32Array(GRID_N*GRID_N + 1)
let CELL_ITEMS = null;                // Int32Array(total entries) -> segment id
let CHAMFER = null;                   // Float32Array(COARSE_N*COARSE_N)

const gx = (x) => Math.floor((x + GRID_HALF) / CELL);
const gz = (z) => Math.floor((z + GRID_HALF) / CELL);

function buildIndex() {
  const nCells = GRID_N * GRID_N;
  const counts = new Int32Array(nCells + 1);

  // Two passes: count, then fill. A per-cell array-of-arrays would allocate
  // ~110k JS arrays; a counting sort is two typed arrays and no GC pressure.
  for (let pass = 0; pass < 2; pass++) {
    for (let s = 0; s < SEG_N; s++) {
      const a = SEG_S[s], b = segEnd(s);
      const x0 = Math.min(SX[a], SX[b]) - PAD, x1 = Math.max(SX[a], SX[b]) + PAD;
      const z0 = Math.min(SZ[a], SZ[b]) - PAD, z1 = Math.max(SZ[a], SZ[b]) + PAD;
      const cx0 = clamp(gx(x0), 0, GRID_N - 1), cx1 = clamp(gx(x1), 0, GRID_N - 1);
      const cz0 = clamp(gz(z0), 0, GRID_N - 1), cz1 = clamp(gz(z1), 0, GRID_N - 1);
      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const ci = cz * GRID_N + cx;
          if (pass === 0) counts[ci + 1]++;
          else CELL_ITEMS[counts[ci]++] = s;
        }
      }
    }
    if (pass === 0) {
      // Prefix sum turns the histogram into cell start offsets; CELL_START keeps
      // them and `counts` becomes the moving write cursor for pass 1.
      for (let i = 0; i < nCells; i++) counts[i + 1] += counts[i];
      CELL_START = Int32Array.from(counts);
      CELL_ITEMS = new Int32Array(counts[nCells]);
    }
  }

  // ---- coarse chamfer distance transform ----------------------------------
  // Seeded from the samples themselves, then two sweeps of an 8-neighbour
  // chamfer (1, sqrt2). Accurate to a few percent, which is all the far field
  // needs: it only has to be monotone for bestRoadHeadingAt and spawn bands.
  const N = COARSE_N;
  CHAMFER = new Float32Array(N * N).fill(1e9);
  for (let i = 0; i < SX.length; i++) {
    const cx = clamp(Math.floor((SX[i] + GRID_HALF) / COARSE), 0, N - 1);
    const cz = clamp(Math.floor((SZ[i] + GRID_HALF) / COARSE), 0, N - 1);
    const px = (cx + 0.5) * COARSE - GRID_HALF, pz = (cz + 0.5) * COARSE - GRID_HALF;
    const d = Math.hypot(SX[i] - px, SZ[i] - pz);
    const ci = cz * N + cx;
    if (d < CHAMFER[ci]) CHAMFER[ci] = d;
  }
  const D1 = COARSE, D2 = COARSE * Math.SQRT2;
  const relax = (ci, oi, w) => { const v = CHAMFER[oi] + w; if (v < CHAMFER[ci]) CHAMFER[ci] = v; };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const ci = z * N + x;
    if (x > 0) relax(ci, ci - 1, D1);
    if (z > 0) relax(ci, ci - N, D1);
    if (x > 0 && z > 0) relax(ci, ci - N - 1, D2);
    if (x < N - 1 && z > 0) relax(ci, ci - N + 1, D2);
  }
  for (let z = N - 1; z >= 0; z--) for (let x = N - 1; x >= 0; x--) {
    const ci = z * N + x;
    if (x < N - 1) relax(ci, ci + 1, D1);
    if (z < N - 1) relax(ci, ci + N, D1);
    if (x < N - 1 && z < N - 1) relax(ci, ci + N + 1, D2);
    if (x > 0 && z < N - 1) relax(ci, ci + N - 1, D2);
  }
  for (let i = 0; i < CHAMFER.length; i++) if (CHAMFER[i] > ROAD_FAR) CHAMFER[i] = ROAD_FAR;
}
buildIndex();

// PAD registers one short segment in several neighbouring hash cells. A ring query can
// therefore meet the same segment repeatedly, which became measurable once Round 9 grew the
// network from three routes to twelve. Stamp each segment once per query: the answer is
// bit-for-bit the same, but movement/terrain no longer redo identical projection maths.
const SEG_SEEN = new Uint32Array(SEG_N);
let SEG_STAMP = 0;

function nextSegmentStamp() {
  SEG_STAMP = (SEG_STAMP + 1) >>> 0;
  if (SEG_STAMP === 0) {
    SEG_SEEN.fill(0);
    SEG_STAMP = 1;
  }
  return SEG_STAMP;
}

/** Coarse, always-available lower bound on the distance to any centreline. */
function coarseDistance(x, z) {
  const cx = Math.floor((x + GRID_HALF) / COARSE);
  const cz = Math.floor((z + GRID_HALF) / COARSE);
  if (cx < 0 || cz < 0 || cx >= COARSE_N || cz >= COARSE_N) return ROAD_FAR;
  return CHAMFER[cz * COARSE_N + cx];
}

/* ------------------------------------------------------------------ *
 * Spline elevation. Injected by terrain.js so this module never imports it.
 * ------------------------------------------------------------------ */

let baseSampler = null;
let elevReady = false;

/**
 * terrain.js calls this once at module scope with its road-base height:
 * broad + rolling + valley + rim + FLATS discs, but NOT the 1.2 m detail
 * octave. Excluding detail at the source is MOSSWAY's trick (game.js:171-173,
 * `roadSurface = base + tiny noise`) and is what makes the road drivable
 * instead of corrugated.
 */
export function setRoadBaseSampler(fn) { baseSampler = fn; elevReady = false; }

/** Build SY once. Safe to call repeatedly; cheap after the first time. */
export function ensureRoadElevations() {
  if (elevReady) return;
  if (!baseSampler) {
    throw new Error('roads: no road-base sampler injected (terrain.js must call setRoadBaseSampler)');
  }
  for (let i = 0; i < SX.length; i++) SY[i] = baseSampler(SX[i], SZ[i]) + SO[i];

  // SKYSHARD runs 3 box passes over 2 m stream samples (streams.js:44-49), where
  // only a wisp had to look smooth. A road at the same spacing needs a much wider
  // kernel, so each configured pass runs 8 iterations of the same 1-2-1 filter —
  // a roughly 30 m window, which is what a graded verge actually looks like.
  const tmp = new Float32Array(SY.length);
  for (let pass = 0; pass < RC.smoothPasses * 8; pass++) {
    for (const rt of ROUTES) {
      for (let i = 0; i < rt.n; i++) {
        const c = rt.start + i;
        const p = rt.start + (rt.closed ? (i - 1 + rt.n) % rt.n : Math.max(0, i - 1));
        const q = rt.start + (rt.closed ? (i + 1) % rt.n : Math.min(rt.n - 1, i + 1));
        tmp[c] = (SY[p] + SY[c] * 2 + SY[q]) * 0.25;
      }
      for (let i = 0; i < rt.n; i++) SY[rt.start + i] = tmp[rt.start + i];
    }
    for (const group of JUNCTION_SAMPLES) {
      const y = SY[group[0]];
      for (let i = 1; i < group.length; i++) SY[group[i]] = y;
    }
  }
  elevReady = true;
}

/* ------------------------------------------------------------------ *
 * The field.
 * ------------------------------------------------------------------ */

// Preallocated result of the nearest-segment search. Reused every call: the hot
// path allocates nothing, so callers must consume it before querying again.
const _nri = {
  hit: false, dist: ROAD_FAR, x: 0, z: 0, y: 0,
  tx: 0, tz: 0, route: -1, seg: -1, t: 0, arc: 0, width: RC.width, kind: 'asphalt',
};

function fillFromSegment(s, t, px, pz, d) {
  const a = SEG_S[s], b = segEnd(s);
  const ax = SX[a], az = SZ[a], bx = SX[b], bz = SZ[b];
  let tx = bx - ax, tz = bz - az;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl; tz /= tl;
  const rt = ROUTES[SEG_R[s]];
  _nri.hit = true;
  _nri.dist = d;
  _nri.x = px; _nri.z = pz;
  _nri.y = lerp(SY[a], SY[b], t);
  _nri.tx = tx; _nri.tz = tz;
  _nri.route = SEG_R[s]; _nri.seg = s; _nri.t = t;
  _nri.arc = SDIST[a] + tl * t;
  _nri.width = rt.width; _nri.kind = rt.kind;
}

/**
 * Exact nearest centreline point within `maxRange`. Fills and returns the shared
 * scratch; check `.hit`. O(1) via the 8 m hash — the ring search stops as soon as
 * the ring's own lower bound exceeds the best distance found.
 */
export function nearestRoadInfo(x, z, maxRange = EXACT_RANGE) {
  _nri.hit = false; _nri.dist = ROAD_FAR;
  if (coarseDistance(x, z) > maxRange + COARSE * 1.5) return _nri;

  const stamp = nextSegmentStamp();
  const qx = gx(x), qz = gz(z);
  const maxRing = Math.min(GRID_N, Math.ceil((maxRange + PAD) / CELL) + 1);
  let best = maxRange * maxRange, bs = -1, bt = 0, bpx = 0, bpz = 0;

  for (let ring = 0; ring <= maxRing; ring++) {
    // Everything in this ring is at least (ring-1)*CELL away; once that beats the
    // best we have, no further ring can improve it.
    if (ring > 1 && (ring - 1) * CELL * (ring - 1) * CELL > best) break;
    const cx0 = qx - ring, cx1 = qx + ring, cz0 = qz - ring, cz1 = qz + ring;
    for (let cz = cz0; cz <= cz1; cz++) {
      if (cz < 0 || cz >= GRID_N) continue;
      const edgeRow = (cz === cz0 || cz === cz1);
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cx >= GRID_N) continue;
        if (!edgeRow && cx !== cx0 && cx !== cx1) continue;   // interior already scanned
        const ci = cz * GRID_N + cx;
        const s0 = CELL_START[ci], s1 = CELL_START[ci + 1];
        for (let k = s0; k < s1; k++) {
          const s = CELL_ITEMS[k];
          if (SEG_SEEN[s] === stamp) continue;
          SEG_SEEN[s] = stamp;
          const a = SEG_S[s], b = segEnd(s);
          const ax = SX[a], az = SZ[a];
          const ex = SX[b] - ax, ez = SZ[b] - az;
          const len2 = ex * ex + ez * ez;
          let t = len2 > 0 ? ((x - ax) * ex + (z - az) * ez) / len2 : 0;
          t = clamp01(t);
          const px = ax + ex * t, pz = az + ez * t;
          const dx = x - px, dz = z - pz;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) { best = d2; bs = s; bt = t; bpx = px; bpz = pz; }
        }
      }
    }
  }
  if (bs >= 0) fillFromSegment(bs, bt, bpx, bpz, Math.sqrt(best));
  return _nri;
}

/**
 * Metres to the nearest centreline. Exact within EXACT_RANGE (40 m), which
 * covers every threshold in CFG (flatten 6.65, plant exclude 7.05, width 5.7);
 * beyond that it is the chamfer approximation, which is monotone and good to a
 * few percent — enough for spawn bands and for bestRoadHeadingAt's argmin.
 */
export function roadDistance(x, z) {
  const c = coarseDistance(x, z);
  if (c > EXACT_RANGE) return c;
  const info = nearestRoadInfo(x, z, EXACT_RANGE);
  return info.hit ? info.dist : c;
}

/** Unit tangent of the nearest centreline. Returns false (and leaves out) if far. */
export function roadTangent(x, z, out) {
  const info = nearestRoadInfo(x, z, EXACT_RANGE);
  if (!info.hit) { if (out) out.set(0, 0); return false; }
  if (out) out.set(info.tx, info.tz);
  return true;
}

/** Closest point on any centreline. out.set(worldX, worldZ). */
export function nearestRoadPoint(x, z, out) {
  // Widened range: the car-spawn rule (CFG.car.spawn.roadWithin 60) asks about
  // roads further out than the terrain field ever needs.
  const info = nearestRoadInfo(x, z, 96);
  if (!info.hit) return false;
  if (out) out.set(info.x, info.z);
  return true;
}

/**
 * MOSSWAY `game.js:1504-1527`, verbatim in method: sample the road field in 24
 * directions at +-9 and +-18 m (0.55 weight on the far pair) and take the
 * direction whose summed distance is lowest. No tangents and no spline lookup,
 * so it works at junctions and it is the ready-made answer to "orient a car that
 * spawned beside a road". Returns radians in MOSSWAY's convention (0 = +Z), or
 * null when there is no road within reach.
 */
export function bestRoadHeadingAt(x, z, preferred = null) {
  if (coarseDistance(x, z) >= ROAD_FAR) return null;
  const N = RC.headingProbes, near = RC.headingNear, far = RC.headingFar;
  let bestAngle = 0, bestScore = Infinity;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI;
    const sx = Math.sin(a), sz = Math.cos(a);
    const score = roadDistance(x + sx * near, z + sz * near)
      + roadDistance(x - sx * near, z - sz * near)
      + 0.55 * roadDistance(x + sx * far, z + sz * far)
      + 0.55 * roadDistance(x - sx * far, z - sz * far);
    if (score < bestScore) { bestScore = score; bestAngle = a; }
  }
  if (preferred !== null) {
    const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    const opposite = wrap(bestAngle + Math.PI);
    if (Math.abs(wrap(opposite - preferred)) < Math.abs(wrap(bestAngle - preferred))) {
      bestAngle = opposite;
    }
  }
  return bestAngle;
}

/**
 * The pure function terrain.js calls inside heightAt. Returns the shared scratch
 * { blend, y }: blend 0 means "no road here, leave the ground alone".
 *
 * Numbers are VANTA//9's road carve (`vanta-city.ts:334-337`, inner 3.2 / outer
 * 7.3 at 0.94) as retyped into CFG.roads.flattenInner/Outer/Lerp.
 */
const _flat = { blend: 0, y: 0 };
export function roadFlatten(x, z) {
  _flat.blend = 0; _flat.y = 0;
  if (coarseDistance(x, z) > RC.flattenOuter + COARSE * 1.5) return _flat;
  if (!elevReady) ensureRoadElevations();
  const info = nearestRoadInfo(x, z, RC.flattenOuter);
  if (!info.hit) return _flat;
  _flat.blend = (1 - smoothstep(RC.flattenInner, RC.flattenOuter, info.dist)) * RC.flattenLerp;
  _flat.y = info.y;
  return _flat;
}

/** True when a point is inside the nearest route's authored driveable width. */
export function onRoad(x, z) {
  const info = nearestRoadInfo(x, z, RC.width);
  return !!(info.hit && info.dist < info.width);
}

/* ------------------------------------------------------------------ *
 * Ribbon geometry — pure arrays, no THREE. chunks.js turns these into a
 * BufferGeometry and NAMES the mesh 'road-ribbon' so the collider bake skips
 * it: one AABB over a winding road becomes a giant invisible wall
 * (VANTA `vanta-engine.ts:1264-1274`, which returns null for exactly this).
 * ------------------------------------------------------------------ */

/**
 * Build the road surface inside [x0, x0+size) x [z0, z0+size).
 * `heightFn` is terrain.heightAt — the ribbon is PROJECTED onto the heightfield,
 * never authored above it, so it cannot float or sink relative to the ground.
 * Returns null when no road crosses the tile.
 */
export function buildRibbonData(x0, z0, size, heightFn, lift = 0.06) {
  if (!elevReady) ensureRoadElevations();
  const x1 = x0 + size, z1 = z0 + size;
  const pos = [], uv = [], idx = [];

  for (let r = 0; r < ROUTES.length; r++) {
    const rt = ROUTES[r];
    const half = rt.width * 0.5;
    const margin = half + 3;
    let runStart = -1;
    const total = rt.closed ? rt.n + 1 : rt.n;   // one wrap sample closes the loop

    for (let i = 0; i <= total; i++) {
      const inside = i < total && (() => {
        const gi = rt.start + (i % rt.n);
        return SX[gi] >= x0 - margin && SX[gi] < x1 + margin
          && SZ[gi] >= z0 - margin && SZ[gi] < z1 + margin;
      })();
      if (inside && runStart < 0) runStart = i;
      if (!inside && runStart >= 0) {
        // one sample of overlap on each side so adjacent tiles' ribbons meet
        emitRun(rt, Math.max(0, runStart - 1), Math.min(total - 1, i), half, heightFn, lift, pos, uv, idx);
        runStart = -1;
      }
    }
  }
  if (idx.length === 0) return null;
  return {
    positions: Float32Array.from(pos),
    uvs: Float32Array.from(uv),
    indices: (pos.length / 3) > 65535 ? Uint32Array.from(idx) : Uint16Array.from(idx),
  };
}

function emitRun(rt, i0, i1, half, heightFn, lift, pos, uv, idx) {
  if (i1 - i0 < 1) return;
  const base = pos.length / 3;
  for (let i = i0; i <= i1; i++) {
    const c = rt.start + (i % rt.n);
    // An open lane's endpoint has one neighbour, not the opposite endpoint. Wrapping here
    // made a dead-end spur's first ribbon frame point across the entire county, producing a
    // twisted triangle exactly where it met the loop. Closed routes still wrap normally.
    const p = rt.start + (rt.closed ? ((i - 1 + rt.n) % rt.n) : Math.max(0, i - 1));
    const q = rt.start + (rt.closed ? ((i + 1) % rt.n) : Math.min(rt.n - 1, i + 1));
    let tx = SX[q] - SX[p], tz = SZ[q] - SZ[p];
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    const nx = -tz, nz = tx;

    // Bank: CARVE's frames with CFG.roads.bank (gain 50, max 0.12). This is a
    // lane, not CARVE's half-pipe — its BANK_GAIN 620 would stand the road up.
    const px = SX[p], pz = SZ[p], cx = SX[c], cz2 = SZ[c], qx = SX[q], qz = SZ[q];
    const ax = cx - px, az = cz2 - pz, bx = qx - cx, bz = qz - cz2;
    const al = Math.hypot(ax, az) || 1, bl = Math.hypot(bx, bz) || 1;
    const crossN = (ax / al) * (bz / bl) - (az / al) * (bx / bl);
    const bank = clamp(crossN * CFG.roads.bank.gain, -CFG.roads.bank.max, CFG.roads.bank.max);

    for (let s = -1; s <= 1; s += 2) {
      const ex = SX[c] + nx * half * s, ez = SZ[c] + nz * half * s;
      const y = heightFn(ex, ez) + lift + bank * half * s;
      pos.push(ex, y, ez);
      uv.push(s < 0 ? 0 : 1, SDIST[c] / 8);
    }
  }
  const n = i1 - i0 + 1;
  for (let i = 0; i < n - 1; i++) {
    const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
}

/* ------------------------------------------------------------------ *
 * ROUND 6 (lane G, ADDITIVE): the routes as {x, z} polylines for the
 * pause card's map (ui/hud.js _drawMap). The RESAMPLED spline, thinned
 * to one point every ROUTE_PL_STEP samples (12 m at RC.sample 2). The tighter
 * Round 9 cadence is what keeps a narrow switchback on the map instead of
 * cutting a 24 m chord through the inside of its bend, and is still built once.
 * the drawn road is the road the travelled wash is painted on — the 21
 * authored control points of the loop sit tens of metres off the
 * asphalt between them. Built once at module load, frozen; a closed
 * route repeats its first point at the end so a consumer strokes it
 * without knowing which kind it is.
 * ------------------------------------------------------------------ */
const ROUTE_PL_STEP = 6;
const ROUTE_POLYLINES = Object.freeze(ROUTES.map((rt) => {
  const out = [];
  for (let i = 0; i < rt.n; i += ROUTE_PL_STEP) {
    out.push(Object.freeze({ x: SX[rt.start + i], z: SZ[rt.start + i] }));
  }
  const last = rt.start + rt.n - 1;
  if (rt.closed) out.push(out[0]);
  else out.push(Object.freeze({ x: SX[last], z: SZ[last] }));
  return Object.freeze(out);
}));

/* ------------------------------------------------------------------ *
 * The system.
 * ------------------------------------------------------------------ */

export class Roads {
  static id = 'roads';

  constructor(ctx) {
    this.ctx = ctx;
    // Pure field + authored splines only. The ribbons are geometry data handed
    // to chunks.js, which owns everything that touches the scene graph.
    this.routes = ROUTES;
  }

  async init() {
    // terrain.js injects its sampler at module scope; this just forces the
    // elevation table so no gameplay frame ever pays for it.
    ensureRoadElevations();
  }

  // --- interface named in docs/CONTRACT.md ---------------------------------
  roadDistance(x, z) { return roadDistance(x, z); }
  roadTangent(x, z, out) { return roadTangent(x, z, out); }
  bestRoadHeadingAt(x, z, preferred = null) { return bestRoadHeadingAt(x, z, preferred); }
  nearestRoadPoint(x, z, out) { return nearestRoadPoint(x, z, out); }

  // --- extras other owners may find useful ---------------------------------
  nearestRoadInfo(x, z, maxRange) { return nearestRoadInfo(x, z, maxRange); }
  roadFlatten(x, z) { return roadFlatten(x, z); }
  onRoad(x, z) { return onRoad(x, z); }
  totalLength() { return TOTAL_LENGTH; }
  secondaryLength() { return SECONDARY_LENGTH; }
  jumpCount() { return JUMP_COUNT; }
  loopLength() { return ROUTES[0].length; }
  sites() { return M0_SITES; }
  /**
   * Round 6 (G): `[[{x, z}, ...], ...]`, one polyline per route, for the pause-card map.
   * NOT `routes()`: the constructor already owns `this.routes` (the ROUTES meta table, an
   * instance property) and an instance property shadows a prototype method — measured, the
   * first probe found `roads.routes is not a function`. The cross-lane contract named
   * routes(); the consumer (ui/hud.js) is this lane's own, so the name changed on this side.
   */
  routePolylines() { return ROUTE_POLYLINES; }

  ready() { return elevReady && SEG_N > 0 && CELL_ITEMS !== null; }
  dispose() { }
}

export default Roads;
