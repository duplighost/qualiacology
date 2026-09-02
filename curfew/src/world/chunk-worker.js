// CURFEW — the chunk builder. Runs on a module Worker, and on the main thread.
//
// This file is BOTH the worker entry point and the pure builder that chunks.js calls
// synchronously. One source of truth: if the two diverged, a chunk would look different
// depending on which thread happened to build it, and that class of bug is invisible
// until a screenshot disagrees with a test.
//
// It imports NO THREE and touches NO DOM — it cannot, a Worker has neither, and it
// cannot resolve the page's importmap either. Its whole dependency set is
// config.js / engine/math.js / world/terrain.js / world/roads.js, all four of which are
// three-free at module scope (roads.js says so in its own header; terrain.js is written
// that way for exactly this reason). chunks.js is the only file here that imports three,
// and it turns these typed arrays into BufferGeometry.
//
// The output is TRANSFERABLE: positions, normals, colours, indices and the optional
// placement list are all typed arrays handed over with a transfer list, so a finished
// chunk crosses the thread boundary as a pointer move rather than a structured clone.
//
// NORMALS ARE ANALYTIC, from a one-cell halo of extra height samples rather than from
// computeVertexNormals(). Two reasons and both are visible: the halo samples land
// exactly on the neighbouring chunk's edge vertices, so lighting has no seam at a chunk
// boundary or at a tier boundary; and it costs (n+2)^2 height samples instead of the
// 5*(n+1)^2 that per-vertex normalAt() would.

import { CFG } from '../config.js';
import { clamp01, lerp, smoothstep } from '../engine/math.js';
import { heightAt, regionWeights, REGIONS, REGION_COUNT } from './terrain.js';
import { roadDistance, nearestRoadInfo, buildRibbonData } from './roads.js';

const CHUNK = CFG.world.CHUNK;                 // 64 m

/**
 * The three terrain LOD tiers, derived from CFG.world.tiers.
 *   quad 1.6  -> 40 quads -> 41x41 vertices   (docs/PLAN.md 1.5)
 *   quad 6.4  -> 10 quads -> 11x11
 *   quad 25.6 ->  3 quads ->  4x4
 * `skirt` is how far the tier-edge skirt hangs below the ground. It is sized off the
 * quad, because the worst seam a tier can show is half a quad of vertical disagreement
 * with its neighbour: at 25.6 m quads that is metres, and a gap there shows SKY through
 * the ground, which reads as a hole in the world rather than as a LOD artefact.
 */
export const TIERS = CFG.world.tiers.map((t) => {
  const seg = Math.max(1, Math.round(CHUNK / t.quad));
  const quad = CHUNK / seg;
  return { quad, seg, radius: t.radius, skirt: quad * 1.6 + 1.2 };
});

/** Cheap deterministic per-vertex grain so big colour fields never band. */
function grain(x, z) {
  let h = (Math.round(x * 8) * 374761393 + Math.round(z * 8) * 668265263 + 1013904223) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Verge: the ground darkens toward the road surface, so the asphalt is not a stripe
// pasted onto untouched forest floor. Gravel/dirt scuffed off the shoulder.
const VERGE = [0.042, 0.041, 0.039];
const VERGE_IN = 3.2;      // fully verge inside this
const VERGE_OUT = 11.0;    // untouched ground past this
// A chunk's half-diagonal is 45.3 m. roads.js's coarse chamfer field is good to a few
// percent, so 58 m at the centre cannot miss a road that reaches VERGE_OUT of a corner.
const ROAD_GATE = 58;
// Road surface sits this far above the ground it is projected onto. 6 cm is under the
// player's STEP_UP and under one tier-0 quad of vertical error, so it never reads as a
// kerb; chunks.js also gives the ribbon material a polygon offset.
const RIBBON_LIFT = 0.06;

// Slope-to-cliff blend. 0.18..0.55 in the 1-normal.y measure is roughly 33..64 degrees.
const CLIFF_LO = 0.18;
const CLIFF_HI = 0.55;

// Module scratch, so a build allocates only its output arrays.
const _w = new Float64Array(REGION_COUNT);

/**
 * Build one chunk's ground.
 *
 * @param {number} cx chunk x index (world x0 = cx * 64)
 * @param {number} cz chunk z index
 * @param {number} tier index into TIERS
 * @param {object} [opts] { placement: boolean } — see the note on `place` below.
 * @returns {object} payload with transferable typed arrays. Positions are LOCAL in x/z
 *   (0..64) and ABSOLUTE in y; chunks.js sets mesh.position to (x0, 0, z0). Keeping x/z
 *   local keeps float32 vertex precision constant across a 4 km county.
 */
export function buildChunkData(cx, cz, tier, opts) {
  const T = TIERS[tier] || TIERS[TIERS.length - 1];
  const seg = T.seg, quad = T.quad, n = seg + 1;
  const x0 = cx * CHUNK, z0 = cz * CHUNK;

  // ---- 1. height grid with a one-cell halo ------------------------------------------
  // (n+2)^2 samples. The halo ring is what makes normals seam-free: those samples ARE
  // the neighbouring chunk's edge vertices, evaluated from the same pure function.
  const hn = n + 2;
  const hs = new Float64Array(hn * hn);
  for (let iz = -1; iz <= seg + 1; iz++) {
    const wz = z0 + iz * quad;
    const row = (iz + 1) * hn;
    for (let ix = -1; ix <= seg + 1; ix++) {
      hs[row + ix + 1] = heightAt(x0 + ix * quad, wz);
    }
  }

  // ---- 2. is there any road in reach? -----------------------------------------------
  // One query per chunk instead of one per vertex. Most of the county has no road in it
  // and pays nothing; the thin band along the asphalt pays for its verge.
  // One query per chunk instead of one per vertex, and it also gates the ribbon scan:
  // a chunk's half-diagonal is 45.3 m and buildRibbonData's own margin is under 6 m, so
  // nothing inside 58 m of the centre can be missed even allowing for the coarse
  // chamfer's few percent of error. 95% of the county answers "no road" and pays once.
  const cxm = x0 + CHUNK * 0.5, czm = z0 + CHUNK * 0.5;
  const roadNear = roadDistance(cxm, czm) < ROAD_GATE;
  // Tier 2 is the 640 m+ shell. FogExp2 at CFG.world.fog.density 0.0075 leaves 0.6% of a
  // surface visible at 300 m, so an 11 m verge stripe out there is well under a pixel and
  // under the fog; it is the one place the query is genuinely not worth its cost.
  const verge = tier < 2 && roadNear;

  // ---- 3. interior vertices ---------------------------------------------------------
  const ringLen = 4 * seg;
  const vCount = n * n + ringLen;
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);
  const colors = new Float32Array(vCount * 3);

  let minY = Infinity, maxY = -Infinity;
  const inv2q = 1 / (2 * quad);

  for (let iz = 0; iz <= seg; iz++) {
    const wz = z0 + iz * quad;
    for (let ix = 0; ix <= seg; ix++) {
      const wx = x0 + ix * quad;
      const hi = (iz + 1) * hn + (ix + 1);
      const y = hs[hi];
      const v = iz * n + ix;
      const o = v * 3;

      positions[o] = ix * quad;
      positions[o + 1] = y;
      positions[o + 2] = iz * quad;

      // analytic normal from the halo
      const gx = (hs[hi + 1] - hs[hi - 1]) * inv2q;
      const gz = (hs[hi + hn] - hs[hi - hn]) * inv2q;
      const invLen = 1 / Math.sqrt(gx * gx + gz * gz + 1);
      normals[o] = -gx * invLen;
      normals[o + 1] = invLen;
      normals[o + 2] = -gz * invLen;

      // ---- colour: region blend, then cliff by slope, then verge by road ----------
      regionWeights(wx, wz, y, _w);
      let r = 0, g = 0, b = 0, cr = 0, cg = 0, cb = 0;
      for (let k = 0; k < REGION_COUNT; k++) {
        const wk = _w[k];
        if (wk <= 0) continue;
        const G = REGIONS[k].ground, C = REGIONS[k].cliff;
        r += G[0] * wk; g += G[1] * wk; b += G[2] * wk;
        cr += C[0] * wk; cg += C[1] * wk; cb += C[2] * wk;
      }
      const slope = 1 - invLen;
      const cl = smoothstep(CLIFF_LO, CLIFF_HI, slope);
      r = lerp(r, cr, cl); g = lerp(g, cg, cl); b = lerp(b, cb, cl);

      if (verge) {
        // nearestRoadInfo with a 12 m range, NOT roadDistance. roadDistance is exact out
        // to roads.js's EXACT_RANGE of 40 m, and that ring search costs about 3x this one
        // per vertex — measured 14.8 ms vs 5.3 ms over one 41x41 road chunk on this
        // machine. The verge only reaches VERGE_OUT, so 40 m of precision is 35 m of
        // precision we pay for and then throw away.
        const info = nearestRoadInfo(wx, wz, VERGE_OUT + 1);
        if (info.hit && info.dist < VERGE_OUT) {
          const t = 1 - smoothstep(VERGE_IN, VERGE_OUT, info.dist);
          r = lerp(r, VERGE[0], t); g = lerp(g, VERGE[1], t); b = lerp(b, VERGE[2], t);
        }
      }

      const gn = 0.90 + grain(wx, wz) * 0.20;
      colors[o] = r * gn; colors[o + 1] = g * gn; colors[o + 2] = b * gn;

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // ---- 4. the skirt -----------------------------------------------------------------
  // The perimeter, traversed once as a closed loop: +x along the -Z edge, +z along the
  // +X edge, -x along the +Z edge, -z along the -X edge. Each ring vertex gets a copy
  // dropped by T.skirt, and the two are stitched with outward-facing quads.
  const ring = new Int32Array(ringLen);
  let k = 0;
  for (let ix = 0; ix < seg; ix++) ring[k++] = 0 * n + ix;
  for (let iz = 0; iz < seg; iz++) ring[k++] = iz * n + seg;
  for (let ix = seg; ix > 0; ix--) ring[k++] = seg * n + ix;
  for (let iz = seg; iz > 0; iz--) ring[k++] = iz * n + 0;

  const skirtBase = n * n;
  for (let j = 0; j < ringLen; j++) {
    const src = ring[j] * 3;
    const dst = (skirtBase + j) * 3;
    positions[dst] = positions[src];
    positions[dst + 1] = positions[src + 1] - T.skirt;
    positions[dst + 2] = positions[src + 2];
    normals[dst] = normals[src]; normals[dst + 1] = normals[src + 1]; normals[dst + 2] = normals[src + 2];
    colors[dst] = colors[src]; colors[dst + 1] = colors[src + 1]; colors[dst + 2] = colors[src + 2];
  }

  // ---- 5. indices -------------------------------------------------------------------
  const triCount = seg * seg * 2 + ringLen * 2;
  const indices = vCount > 65535 ? new Uint32Array(triCount * 3) : new Uint16Array(triCount * 3);
  let ii = 0;
  // donor: Projects/filament/src/world/terrain.js:222-224 — the proven +Y winding for a
  // heightfield laid out as (x = ix, z = iz).
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * n + ix, b = a + 1, c = a + n, d = c + 1;
      indices[ii++] = a; indices[ii++] = c; indices[ii++] = b;
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
    }
  }
  for (let j = 0; j < ringLen; j++) {
    const j2 = (j + 1) % ringLen;
    const t0 = ring[j], t1 = ring[j2];
    const b0 = skirtBase + j, b1 = skirtBase + j2;
    indices[ii++] = t0; indices[ii++] = t1; indices[ii++] = b0;
    indices[ii++] = t1; indices[ii++] = b1; indices[ii++] = b0;
  }

  // ---- 6. the road ribbon -----------------------------------------------------------
  // roads.js builds the surface as pure arrays with no THREE in sight, precisely so it
  // can be built here, off the main thread, alongside the ground it sits on. The ribbon
  // is PROJECTED onto heightAt (roads.js does that itself), so it cannot float or sink
  // relative to the ground even though the two are separate meshes at different LODs.
  // chunks.js NAMES the resulting mesh 'road-ribbon:<key>' — see the note there.
  const rib = roadNear ? buildRibbonData(x0, z0, CHUNK, heightAt, RIBBON_LIFT) : null;

  // ---- 7. the placement list --------------------------------------------------------
  // The protocol slot for tree/scatter placement. flora.js owns planting in M0 and runs
  // its own hash-grid pass on the main thread with its own rng fork, so nothing consumes
  // this yet and chunks.js leaves it off: producing an array no one reads would be frame
  // time spent on nothing. It is implemented, not stubbed — chunks.js turns it on the
  // moment a consumer exists (it looks for flora.acceptPlacement), and M1's off-thread
  // collider bake needs no protocol change to use it.
  let place = null, placeCount = 0;
  if (opts && opts.placement) {
    const r = placementFor(cx, cz);
    place = r.place; placeCount = r.count;
  }

  return {
    op: 'chunk', key: cx + '|' + cz, cx, cz, tier,
    seg, quad, x0, z0,
    positions, normals, colors, indices,
    verts: vCount, tris: triCount,
    minY, maxY,
    rib,
    place, placeCount,
  };
}

/* ------------------------------------------------------------------ *
 * Placement candidates. Stride 6: [x, z, y, yaw, scale, cover].
 * Deterministic from (cx, cz) alone — the worker and the main thread agree.
 * ------------------------------------------------------------------ */

const PLACE_STRIDE = 6;
const PLACE_MAX = 1024;
const PLACE_CELL = 2.6;                    // matches flora.js PLANT_CELL

function phash(ix, iz, salt) {
  let h = (ix * 1597334677 + iz * 3812015801 + salt * 2246822519) | 0;
  h = (h ^ (h >>> 15)) | 0;
  h = Math.imul(h, 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export function placementFor(cx, cz) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const cell = PLACE_CELL;
  const pFull = clamp01(CFG.flora.treeDensity * cell * cell);
  const exclude = CFG.roads.plantExclude.tree;
  const gx0 = Math.floor(x0 / cell), gx1 = Math.ceil((x0 + CHUNK) / cell);
  const gz0 = Math.floor(z0 / cell), gz1 = Math.ceil((z0 + CHUNK) / cell);
  const out = new Float32Array(PLACE_MAX * PLACE_STRIDE);
  let count = 0;

  for (let gz = gz0; gz < gz1 && count < PLACE_MAX; gz++) {
    for (let gx = gx0; gx < gx1 && count < PLACE_MAX; gx++) {
      const h1 = phash(gx, gz, 1), h2 = phash(gx, gz, 2), h3 = phash(gx, gz, 3);
      const wx = (gx + 0.10 + h1 * 0.80) * cell;
      const wz = (gz + 0.10 + h2 * 0.80) * cell;
      if (wx < x0 || wz < z0 || wx >= x0 + CHUNK || wz >= z0 + CHUNK) continue;
      const cover = smoothstep(0.15, 0.85, 0.5 + 0.5 * (phash(gx >> 4, gz >> 4, 9) * 2 - 1));
      if (h3 > (0.06 + 0.94 * cover) * pFull) continue;
      if (roadDistance(wx, wz) < exclude) continue;
      const o = count * PLACE_STRIDE;
      out[o] = wx; out[o + 1] = wz; out[o + 2] = heightAt(wx, wz);
      out[o + 3] = phash(gx, gz, 4) * Math.PI * 2;
      out[o + 4] = 0.72 + phash(gx, gz, 5) * 0.72;
      out[o + 5] = cover;
      count++;
    }
  }
  return { place: out.subarray(0, count * PLACE_STRIDE).slice(), count };
}

/* ------------------------------------------------------------------ *
 * Worker entry.
 *
 * Only installed when this module is actually running inside a Worker. chunks.js imports
 * the same file on the main thread for its synchronous path, and there `window` and
 * `document` exist, so nothing below runs.
 * ------------------------------------------------------------------ */

const IS_WORKER = typeof self !== 'undefined'
  && typeof self.postMessage === 'function'
  && typeof window === 'undefined'
  && typeof document === 'undefined';

if (IS_WORKER) {
  self.onmessage = (ev) => {
    const m = ev && ev.data;
    if (!m) return;

    // The handshake. chunks.js dispatches nothing until this answer comes back, which is
    // what makes the worker a pure accelerator: if it never loads, never links, or the
    // browser refuses module workers, the streamer simply keeps building on the main
    // thread and no chunk can ever be stranded in flight.
    if (m.op === 'hello') { self.postMessage({ op: 'hello', tiers: TIERS.length }); return; }

    if (m.op === 'build') {
      let payload;
      try {
        payload = buildChunkData(m.cx, m.cz, m.tier, m);
      } catch (e) {
        self.postMessage({ op: 'fail', key: m.key, error: String((e && e.message) || e) });
        return;
      }
      payload.key = m.key;
      const transfer = [
        payload.positions.buffer, payload.normals.buffer,
        payload.colors.buffer, payload.indices.buffer,
      ];
      if (payload.rib) {
        transfer.push(payload.rib.positions.buffer, payload.rib.uvs.buffer, payload.rib.indices.buffer);
      }
      if (payload.place) transfer.push(payload.place.buffer);
      self.postMessage(payload, transfer);
    }
  };
}

export default buildChunkData;
