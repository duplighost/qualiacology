// CURFEW — the county's frozen water. THIS FILE IMPORTS NO THREE and never may:
// terrain.js imports it, and chunk-worker.js imports terrain.js on a thread with no
// importmap. It also imports nothing from terrain.js (that would be a cycle); terrain
// hands it the bed sampler through setIceBaseSampler(), the same pattern roads.js uses.
//
// THE RULE (contracts D15 / C9). terrain.heightAt stays the BED everywhere: chunk meshes,
// the road ribbon, flora, every planter that refuses ground under CFG.wilds.waterY, and
// the reservoir's own flood fill all keep reading it. terrain.surfaceAt(x, z) =
// max(heightAt, iceLevelAt) is what MOVERS stand on: player, car, enemies, hitscan.
// Putting the ice inside heightAt would have every planter start planting on the sheet.
//
// EVERY BODY OF WATER IN THE COUNTY, AND WHICH ONES FREEZE. Recorded here so the next
// session does not conclude 'the county has no water' again (git 0fdc783 logged it once).
//
//   FROZEN (registered here):
//   1. The reservoir inlet at The Drowned Light (-1380, -208). lore-reservoir.js flood-fills
//      a 2 m grid from (-1336, -80) over every cell under RESERVOIR_Y = 1.5 (about 26,450 m2,
//      bbox x -1470..-1270, z -322..26, bed down to -2.71). The county loop runs UNDER the
//      sheet for ~150 m at road y 0.09. Freshwater that 'had changed. It was salt', still, six
//      years of light snow: sea ice. Ingrid's nine lanterns sit 0.6 m above it, on the ice.
//   2. The four road pools (wilds.js TRAVEL_WATER_SPECS, variant 'pool'): pool-station-cut,
//      pool-witch-road, pool-works-cut, pool-sawmill. Still water beside a road. The WILDS
//      lane registers each as an 'ellipse' body with the rendered sheet's own edge.
//
//   OPEN (never registered):
//   3. The ford-blackwater (-898, -247): running water across the reservoir road, terrain-
//      following, purely visual; ice on a road would change the drive.
//   4. Brine Lock, Mother of Tides (-2614, -286): a 22 m disc you wade ankle-deep on the arena
//      floor collider. 'The lock gates breathe'; she keeps it warm.
//   5. Wading Chapel, The Mire Bride (-2755, 1261): two 7 x 18 m ellipses flanking the lane,
//      dressing on a floor collider. Warm fen.
//   6. Eelwater (-1541, 363): a 96 m black plane 1.45 m under the boardwalk, live eels, the
//      gaps in the boards are its trap. Fen hamlet.
//   7. Wild ruin variants 'pond' and 'stream': 'Warm water. Steam when the Black Hour comes.'
//   8. Gallowsfen Steeple has no water mesh at all; its black water is reeds and wall stubs.
//   9. The terrain 'reservoir basin' (terrain.js, x -820 z -120 r 400) has NO water plane.
//      It is not the reservoir you can see; the inlet above is.
//
// No boss fight uses any water: every attack is a hazard mesh on the arena floor.

import CFG from '../config.js';

// The county water level, planning constant since round 9; the inlet is clipped at it.
export const RESERVOIR_Y = CFG.wilds.waterY;

/* ------------------------------------------------------------------ *
 * The reservoir plan: a flood fill of the bed under RESERVOIR_Y on a 2 m grid.
 * ------------------------------------------------------------------ */

const X0 = -1488, Z0 = -336, STEP = 2, NX = 119, NZ = 189;
const GRID_MAX_X = X0 + (NX - 1) * STEP, GRID_MAX_Z = Z0 + (NZ - 1) * STEP;

let sampler = null;   // the bed: terrain.heightAt, installed by terrain.js at module scope
let cached = null;

/** terrain.js installs heightAt here before any plan can be asked for. A new sampler
 *  drops the cached plan, because the plan is a picture of that sampler. */
export function setIceBaseSampler(fn) {
  if (fn === sampler) return;
  sampler = fn;
  cached = null;
}

function bedAt(x, z) {
  if (!sampler) throw new Error('frozen-water: no bed sampler; import world/terrain.js first');
  return sampler(x, z);
}

export function reservoirPlan() {
  if (cached) return cached;
  const heights = new Float32Array(NX * NZ), wet = new Uint8Array(NX * NZ), queue = [];
  for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) heights[z * NX + x] = bedAt(X0 + x * STEP, Z0 + z * STEP);
  const seed = Math.round((-80 - Z0) / STEP) * NX + Math.round((-1336 - X0) / STEP);
  queue.push(seed); wet[seed] = 1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % NX, z = Math.floor(i / NX);
    for (const j of [x > 0 ? i - 1 : -1, x < NX - 1 ? i + 1 : -1, z > 0 ? i - NX : -1, z < NZ - 1 ? i + NX : -1]) {
      if (j < 0 || wet[j] || heights[j] >= RESERVOIR_Y) continue; wet[j] = 1; queue.push(j);
    }
  }
  const positions = [], depths = [];
  const clip = (ids) => {
    if (!ids.some(i => wet[i])) return;
    const p = ids.map(i => ({ x: X0 + (i % NX) * STEP, z: Z0 + Math.floor(i / NX) * STEP, h: heights[i] })), out = [];
    for (let i = 0; i < 3; i++) {
      const a = p[i], b = p[(i + 1) % 3], ain = a.h < RESERVOIR_Y, bin = b.h < RESERVOIR_Y;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (RESERVOIR_Y - a.h) / (b.h - a.h); out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: RESERVOIR_Y }); }
    }
    for (let i = 1; i < out.length - 1; i++) for (const v of [out[0], out[i], out[i + 1]]) { positions.push(v.x, RESERVOIR_Y, v.z); depths.push(Math.min(1, Math.max(0, (RESERVOIR_Y - v.h) / 2.5))); }
  };
  for (let z = 0; z < NZ - 1; z++) for (let x = 0; x < NX - 1; x++) { const a = z * NX + x; clip([a, a + NX, a + 1]); clip([a + 1, a + NX, a + NX + 1]); }
  cached = { heights, wet, positions: new Float32Array(positions), depths: new Float32Array(depths), waterY: RESERVOIR_Y, x0: X0, z0: Z0, step: STEP, nx: NX, nz: NZ };
  return cached;
}

// The exact piecewise-linear footprint of the rendered, clipped triangles. Allocation-free
// past the first call: every mover asks this every step while it is inside the grid.
export function reservoirContains(x, z) {
  const fx = (x - X0) / STEP, fz = (z - Z0) / STEP, ix = Math.floor(fx), iz = Math.floor(fz);
  if (ix < 0 || iz < 0 || ix >= NX - 1 || iz >= NZ - 1) return false;
  const p = reservoirPlan(), a = iz * NX + ix, u = fx - ix, v = fz - iz;
  const wet = p.wet, hts = p.heights;
  let h;
  if (u + v <= 1) {
    if (!(wet[a] || wet[a + 1] || wet[a + NX])) return false;
    h = hts[a] * (1 - u - v) + hts[a + 1] * u + hts[a + NX] * v;
  } else {
    if (!(wet[a + NX + 1] || wet[a + NX] || wet[a + 1])) return false;
    h = hts[a + NX + 1] * (u + v - 1) + hts[a + NX] * (1 - u) + hts[a + 1] * (1 - v);
  }
  return h < RESERVOIR_Y;
}

/* ------------------------------------------------------------------ *
 * The ice registry. A body is a level sheet at y with a footprint test; iceLevelAt is
 * the highest sheet under (x, z) or -Infinity. Bounding boxes reject before any real test.
 * ------------------------------------------------------------------ */

// The pool edge every 'pool' travel water is drawn with (wilds.js prepareWaterGeometry and
// travelPoolSurface); its maximum, 1 + 0.075 + 0.045, sizes the ellipse bounding boxes.
const POOL_EDGE_MAX = 1.12;
function poolEdge(a) { return 1 + 0.075 * Math.sin(a * 3 + 0.6) + 0.045 * Math.sin(a * 7 - 0.4); }

const bodies = [];

/** {id, kind:'reservoir'|'ellipse', x, z, yaw, rx, rz, y}. Re-registering an id replaces it.
 *  'ellipse' takes the wilds site frame (wx = x + lx cos - ... see wilds.js:302) and the
 *  pool edge above, so the ice footprint is exactly the rendered sheet. */
export function registerIceBody(spec) {
  if (!spec || !spec.id) throw new Error('frozen-water: registerIceBody needs an id');
  const kind = spec.kind === 'ellipse' ? 'ellipse' : 'reservoir';
  const y = kind === 'reservoir' ? (spec.y === undefined ? RESERVOIR_Y : spec.y) : spec.y;
  if (typeof y !== 'number' || y !== y) throw new Error('frozen-water: ice body ' + spec.id + ' needs a level y');
  const rec = { id: spec.id, kind, x: spec.x || 0, z: spec.z || 0, yaw: spec.yaw || 0, rx: spec.rx || 0, rz: spec.rz || 0, y,
    cos: 1, sin: 0, minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  if (kind === 'reservoir') {
    rec.minX = X0; rec.maxX = GRID_MAX_X; rec.minZ = Z0; rec.maxZ = GRID_MAX_Z;
  } else {
    if (!(rec.rx > 0 && rec.rz > 0)) throw new Error('frozen-water: ellipse ' + spec.id + ' needs rx and rz');
    rec.cos = Math.cos(rec.yaw); rec.sin = Math.sin(rec.yaw);
    // The rotated ellipse's axis-aligned extent, grown by the edge function's maximum.
    const ex = Math.sqrt((rec.rx * rec.cos) ** 2 + (rec.rz * rec.sin) ** 2) * POOL_EDGE_MAX;
    const ez = Math.sqrt((rec.rx * rec.sin) ** 2 + (rec.rz * rec.cos) ** 2) * POOL_EDGE_MAX;
    rec.minX = rec.x - ex; rec.maxX = rec.x + ex; rec.minZ = rec.z - ez; rec.maxZ = rec.z + ez;
  }
  unregisterIceBody(spec.id);
  bodies.push(rec);
  return rec;
}

export function unregisterIceBody(id) {
  for (let i = 0; i < bodies.length; i++) if (bodies[i].id === id) { bodies.splice(i, 1); return true; }
  return false;
}

/** The live registry, for tests and probes. Do not mutate. */
export function iceBodies() { return bodies; }

function ellipseContains(b, x, z) {
  // Inverse of the wilds site frame: wx = x + lx*cos + lz*sin, wz = z - lx*sin + lz*cos.
  const dx = x - b.x, dz = z - b.z;
  const lx = dx * b.cos - dz * b.sin, lz = dx * b.sin + dz * b.cos;
  const nx = lx / b.rx, nz = lz / b.rz;
  const r = Math.sqrt(nx * nx + nz * nz);
  if (r >= POOL_EDGE_MAX) return false;
  return r < poolEdge(Math.atan2(nz, nx));
}

/** The ice level under (x, z), or -Infinity where there is no ice. Allocation-free. */
export function iceLevelAt(x, z) {
  let best = -Infinity;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.y <= best || x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (b.kind === 'reservoir' ? reservoirContains(x, z) : ellipseContains(b, x, z)) best = b.y;
  }
  return best;
}

// The reservoir freezes at the county water level. Registered at load so every importer of
// terrain.js (the game, the node suites) gets the same surface without a system having to
// run first; the plan itself is still computed lazily, on the first query inside its grid.
registerIceBody({ id: 'drowned-light-reservoir', kind: 'reservoir', y: RESERVOIR_Y });
