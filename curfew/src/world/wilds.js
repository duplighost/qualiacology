// CURFEW — the wilds (manifest 'wilds', #11, after places). ROUND 6, lane F.
//
// Alex, fifth playtest: "The woods hardly has anything in it." and "There should be those
// things from dying light 2 in the vehicle expansion where there are the wooden places you
// can climb up in the wilderness... we just have to have some cool items on the map more.
// Extra xp." and "A fun map with things to find everywhere."
//
// WHAT THIS FILE OWNS
// -------------------
// Everything that stands OFF the road and is neither a major nor a road-side minor: lookout
// towers you climb for a cache, deer stands, ruins, wrecks and camps, planned once from one
// seeded stream over a ~280 m cell grid (planWilds, a pure function a test can call twice
// and diff), streamed with the player the way places.js streams its bodies, every platform
// standable, every cache one-shot per save.
//
// THE FOUR LAWS THIS FILE IS ACCOUNTABLE FOR
// ------------------------------------------
// 1. COLLIDERS ARE EMITTED IN THE BUILD, by the builder that lays the geometry, in the
//    site's own frame, through the same api shape places.js gives its builders - so the
//    stair the player climbs and the stair the player sees cannot disagree.
// 2. THE CLIMB IS THE SHIPPED CONTROLLER'S CLIMB. Every stair rises 0.42 a step against a
//    STEP_UP of 0.52: the crate stair at the Filling Station climbs this way today and lane
//    E's mantle is a bonus, never a dependency. tests/wilds.mjs walks every tower with the
//    real controller through the real input path and measures where the feet got to.
// 3. ZERO PROGRAMS. matBody and matGlow here are parameter-for-parameter the two materials
//    places.js already linked at boot (place-body, place-glow); three keys a program on
//    its parameters, so these share them. tests/wilds.mjs builds a tower at the hub and
//    asserts the count did not move.
// 4. NOTHING ALLOCATES IN step(). Every bus payload is a reused object; the residency and
//    proximity sweeps are plain loops over a flat array; list() is for the pause card and
//    allocates on purpose, off the hot path.
//
// INTERFACE (CONTRACT.md, ROUND 6)
//   list() -> [{ id, kind, x, z, found, climbed }]      lane G's map
//   padClear(x, z) -> boolean                           flora's planting loop: true = do not plant
//   climbRoute(id) -> [{ x, z, y }] | null              the audit's waypoints, tower and stand
//   bus: wild:found {id}, wild:climbed {id}, pickup:cache {id, x, z}, pickup:ammo {n},
//        xp:gained {amount, x, y, z, reason: 'wild' | 'climb' | 'cache'}

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import CFG from '../config.js';
import { clamp, clamp01, lerp, TAU, Rng } from '../engine/math.js';
import { heightAt, slopeAt } from './terrain.js';
import { roadDistance } from './roads.js';
import { MAJORS, MAJOR_BY_ID } from './placedata.js';
import { SITE_COLOURS as C, GLOW } from './sites.js';

const W = CFG.wilds;
const CHUNK = CFG.world.CHUNK;

// Pad radii: nothing (tree, fern, log, rock) is planted inside these, per kind. A tower
// stands in a clearing so its lantern reads down a line of sight; a stand is IN the trees.
const PAD_R = Object.freeze({ tower: 20, stand: 4.5, ruin: 11, wreck: 7.5, camp: 9 });
const KINDS = Object.freeze(['tower', 'stand', 'ruin', 'wreck', 'camp']);
const WATER = Object.freeze([0.038, 0.063, 0.070]);
const REED = Object.freeze([0.112, 0.105, 0.068]);
const POND_BANK = Object.freeze([0.118, 0.096, 0.066]);
const WATER_LIFT = 0.024;
const POND_RX = 3.8;
const POND_RZ = 2.8;
const POND_RELIEF_MAX = 0.65;
const EVENT_RETRY_S = 2.5;
const EVENT_RETRY_MAX = 3;
const EVENT_REARM_R = 34;
const EVENT_REARM_S = 3.0;
const TREE_ATTACK_S = 1.05;
const TREE_HIT_AT = 0.48;
const TREE_HIT_R = 5.2;
const TREE_DAMAGE = 26;
const TREE_PUSH_H = 8.0;
const TREE_PUSH_UP = 3.2;
const VARIANTS = Object.freeze({
  tower: ['tower'], stand: ['stand'],
  ruin: ['chapel', 'foundation', 'well', 'pond', 'stream'],
  wreck: ['car', 'drums', 'deadfall'],
  camp: ['cabin', 'tent', 'barn', 'farm'],
});

// The stair. A flight is LANDING + 5 treads + LANDING along one side of the stair square,
// so the square's side is exactly 2 * LANDING + 5 * TREAD and the corner landing at the
// end of one flight is the start of the next. Every number below is what makes the climb
// work against the shipped controller and is derived in docs/ROUND-6/F-woods.md.
const STEP_RISE = W.tower.rise;       // 0.42, under STEP_UP 0.52
const TREAD = W.tower.tread;          // 0.55
const STEPS = 5;
const LANDING = 0.90;
const FLIGHT_W = W.tower.width;       // 0.92
const SIDE = 2 * LANDING + STEPS * TREAD;       // 4.55
const WS = SIDE * 0.5;                          // 2.275: the stair square's half-width
const FLIGHT_RISE = STEPS * STEP_RISE;          // 2.10: head clearance under the slab above
const STRIP = 1.15;                             // the stairwell slot in the platform
const LEG_TOP = WS + 0.55 + 0.25;               // 3.075
const LEG_BASE = LEG_TOP + 0.70;                // 3.775
const PLAT_HALF = LEG_TOP + 0.25;               // 3.325
const RAIL_H = 1.05;
const SLAB_T = 0.16;

// Stand: a steep stair of rungs at 0.45 rise over 0.36 run, the platform edge being the
// last rung. rung k+2 sits 0.72 m out and 0.90 m up from rung k: outside the capsule's
// 0.36 m radius, so it never blocks; rung k+1 is a step. See the report.
const RUNG_RISE = W.stand.rise;
const RUNG_RUN = W.stand.run;
const STAND_HALF = 1.30;

// Reused bus payloads. Consumed synchronously by listeners, retained by nobody.
const _foundP = { id: '' };
const _climbP = { id: '' };
const _cacheP = { id: '', x: 0, z: 0 };
const _ammoP = { n: 0 };
const _xpP = { amount: 0, x: 0, y: 0, z: 0, reason: '' };
const _farmSpawnOpts = { staged: true, awake: false, yaw: 0 };
const _treeHitDir = new THREE.Vector3();

/** Dense height envelope under the whole level pond skin, including triangle interiors. */
function pondProfileAt(x, z) {
  let lo = heightAt(x, z), hi = lo;
  const rings = 12, seg = 64;
  for (let ring = 1; ring <= rings; ring++) {
    const t = ring / rings;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      const edge = 1 + 0.055 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 - 0.3);
      const y = heightAt(x + Math.cos(a) * POND_RX * t * edge,
        z + Math.sin(a) * POND_RZ * t * edge);
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
  }
  return { lo, hi, relief: hi - lo };
}

/* ==========================================================================
   The plan. Pure: seed + terrain + roads + the major table in, a site list out.
   ========================================================================== */

/**
 * planWilds(seed, opts) -> [{ id, kind, variant, x, z, y, yaw, cx, cz, cell, pad, cache,
 *   flights, h, ammo, xp, flagKey, found, climbed, taken, rec }]
 *
 * One candidate cell per W.cell metres over the county inside W.maxRadius; up to ten
 * draws per cell; the first that is off the road (W.roadClear), off every major
 * (W.majorClear), on ground under W.slopeMax, above the water and not inside W.separation
 * of an earlier site is kept. Kinds are dealt from a seeded shuffle of the kept cells by
 * quota (W.counts), towers first with W.towerApart between them.
 *
 * opts.rejectOverlap = false turns the separation test OFF (and only that): the test
 * suite uses it to prove its overlap assertion can fail. opts.cell overrides the grid.
 */
export function planWilds(seed, opts) {
  const o = opts || {};
  const rejectOverlap = o.rejectOverlap !== false;
  const cell = o.cell || W.cell;
  const rng = new Rng((seed >>> 0) || 1);
  const R = W.maxRadius;
  const N = Math.ceil(R / cell);
  const sep2 = W.separation * W.separation;
  const kept = [];

  const fits = (x, z) => {
    if (Math.hypot(x, z) > R) return false;
    if (roadDistance(x, z) < W.roadClear) return false;
    if (slopeAt(x, z) > W.slopeMax) return false;
    if (heightAt(x, z) < W.waterY) return false;
    for (let i = 0; i < MAJORS.length; i++) {
      const m = MAJORS[i];
      if (Math.hypot(x - m.x, z - m.z) < W.majorClear) return false;
    }
    return true;
  };

  for (let cz = -N; cz < N; cz++) {
    for (let cx = -N; cx < N; cx++) {
      const mx = (cx + 0.5) * cell, mz = (cz + 0.5) * cell;
      if (Math.hypot(mx, mz) > R) continue;
      for (let k = 0; k < 10; k++) {
        const x = (cx + 0.02 + 0.96 * rng.next()) * cell;
        const z = (cz + 0.02 + 0.96 * rng.next()) * cell;
        if (!fits(x, z)) continue;
        if (rejectOverlap) {
          let close = false;
          for (let i = 0; i < kept.length; i++) {
            const dx = x - kept[i].x, dz = z - kept[i].z;
            if (dx * dx + dz * dz < sep2) { close = true; break; }
          }
          if (close) continue;
        }
        kept.push({ cx, cz, x, z });
        break;
      }
    }
  }

  // Seeded shuffle, then deal by quota.
  for (let i = kept.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const t = kept[i]; kept[i] = kept[j]; kept[j] = t;
  }
  const sites = [];
  const towers = [];
  const taken = new Uint8Array(kept.length);
  const apart2 = W.towerApart * W.towerApart;
  // Towers go to the HIGHEST ground first (a lookout looks over the forest below it), with
  // W.towerApart between them; the shuffled order breaks ties and deals every other kind.
  const byHeight = kept.map((c, i) => [heightAt(c.x, c.z), i]).sort((a, b) => b[0] - a[0]);
  for (let h = 0; h < byHeight.length && towers.length < W.counts.tower; h++) {
    const i = byHeight[h][1];
    const c = kept[i];
    let far = true;
    for (let j = 0; j < towers.length; j++) {
      const dx = c.x - towers[j].x, dz = c.z - towers[j].z;
      if (dx * dx + dz * dz < apart2) { far = false; break; }
    }
    if (!far) continue;
    taken[i] = 1;
    const s = { kind: 'tower', variant: 'tower', cx: c.cx, cz: c.cz, x: c.x, z: c.z };
    towers.push(s); sites.push(s);
  }
  const order = ['stand', 'ruin', 'wreck', 'camp'];
  const vcount = { ruin: 0, wreck: 0, camp: 0 };
  let cursor = 0;
  for (let q = 0; q < order.length; q++) {
    const kind = order[q];
    let n = 0;
    while (n < W.counts[kind] && cursor < kept.length) {
      const i = cursor++;
      if (taken[i]) continue;
      let variant = kind;
      if (VARIANTS[kind].length > 1) {
        variant = VARIANTS[kind][vcount[kind] % VARIANTS[kind].length];
        vcount[kind]++;
      }
      // Water must read as water, which means level. A flat pond on the old arbitrary ruin
      // point crossed 3 m of terrain in the default county and more than 5 m in the seed
      // sweep. For each pond deal, swap in the first still-unused candidate whose ENTIRE
      // rendered water footprint is a shallow basin. This is deterministic, preserves every
      // quota and separation guarantee, and leaves the rejected point available to the next
      // ruin. If an exceptionally hostile seed has no basin left, it gets another stream
      // rather than a physically impossible hillside pond.
      if (variant === 'pond') {
        let chosen = i;
        let profile = kept[i].pondProfile || (kept[i].pondProfile = pondProfileAt(kept[i].x, kept[i].z));
        if (profile.relief > POND_RELIEF_MAX) {
          chosen = -1;
          for (let j = cursor; j < kept.length; j++) {
            if (taken[j]) continue;
            const p = kept[j].pondProfile || (kept[j].pondProfile = pondProfileAt(kept[j].x, kept[j].z));
            if (p.relief <= POND_RELIEF_MAX) { chosen = j; break; }
          }
          if (chosen >= 0) {
            const swap = kept[i]; kept[i] = kept[chosen]; kept[chosen] = swap;
          } else variant = 'stream';
        }
      }
      taken[i] = 1;
      const c = kept[i];
      sites.push({ kind, variant, cx: c.cx, cz: c.cz, x: c.x, z: c.z });
      n++;
    }
  }

  // Stable ids in spatial order, and the per-site draws AFTER the deal so a quota change
  // moves nothing that was placed before it.
  sites.sort((a, b) => (a.cz - b.cz) || (a.cx - b.cx));
  const hub = MAJOR_BY_ID['filling-station'];
  let encounter = null, encounterD2 = -1;
  let enemyBarns = 0, enemyFarms = 0;
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    const r = new Rng(((seed ^ (i * 2654435761)) >>> 0) || 7);
    s.id = 'w' + i;
    s.y = heightAt(s.x, s.z);
    const drawnYaw = r.next() * TAU;
    // pondProfileAt is evaluated in this frame, so ponds keep it. Their irregular outline,
    // bank stones and reeds still vary; forcing a random rotation after selection would put
    // unsampled hillside back underneath the level surface.
    s.yaw = s.variant === 'pond' ? 0 : drawnYaw;
    s.pad = PAD_R[s.kind];
    if (s.variant === 'barn' || s.variant === 'farm') s.pad = 14;
    s.cache = r.next() < W.cacheChance[s.kind];
    // A new place whose only prize is scenery is another empty staircase. The authored
    // farms, barns and waterholes always hold a cache; it is both a useful supply box on
    // foot and a light smashable for the car (cacheParts / world:broke below).
    if (s.variant === 'barn' || s.variant === 'farm' || s.variant === 'pond' || s.variant === 'stream') s.cache = true;
    s.flights = s.kind === 'tower' ? W.tower.flights[0] + Math.floor(r.next() * (W.tower.flights[1] - W.tower.flights[0] + 1)) : 0;
    s.h = s.kind === 'tower' ? s.flights * FLIGHT_RISE
      : s.kind === 'stand' ? Math.round(lerp(W.stand.height[0], W.stand.height[1], r.next()) / RUNG_RISE) * RUNG_RISE
        : 0;
    s.ammo = W.ammo[0] + Math.floor(r.next() * (W.ammo[1] - W.ammo[0] + 1));
    const age = hub ? clamp01(Math.hypot(s.x - hub.x, s.z - hub.z) / 1650) : 0.5;
    s.xp = Math.round(lerp(W.xp.cache[0], W.xp.cache[1], age));
    // a stand's stair reaches 5.6-8 m out on its -Z side, past its 4.5 m pad: a second
    // pad circle over the stair's foot keeps the trees off it (MEASURED 2026-09-03, w40: a
    // 0.7 m trunk at local (-0.46, -5.81), on rung 1, and the body pushed off the stair)
    if (s.kind === 'stand') {
      const cy2 = Math.cos(s.yaw), sy2 = Math.sin(s.yaw);
      s.pad2X = s.x + (-6.0) * sy2; s.pad2Z = s.z + (-6.0) * cy2; s.pad2R = 4.0;
    } else { s.pad2X = s.x; s.pad2Z = s.z; s.pad2R = 0; }
    s.flagKey = 'w:' + s.id;
    s.found = false; s.climbed = false; s.taken = false;
    s.eventMode = s.variant === 'barn' ? 'door' : s.variant === 'farm' ? 'scarecrow' : '';
    // Fourteen homesteads should not mean fourteen new pressure bodies. Exactly one barn
    // and one farm get a pool-backed tableau; the other twelve still have physical authored
    // door/scarecrow events but consume no enemy slot.
    s.eventKind = '';
    if (s.variant === 'barn' && enemyBarns++ === 0) s.eventKind = 'standing';
    if (s.variant === 'farm' && enemyFarms++ === 0) s.eventKind = 'hound';
    s.eventDone = false;
    s.eventLive = false; s.eventPrev = 0; s.eventCurr = 0;
    s.eventRetry = 0; s.eventTries = 0; s.eventSpawned = false;
    s.eventVisit = false; s.eventAway = 0;
    s.encounter = '';
    s.encounterDone = false; s.encounterLive = false;
    s.encounterPrev = 0; s.encounterCurr = 0;
    s.encounterHit = false;
    s.encounterX = 0; s.encounterY = 0; s.encounterZ = 0;
    s.encounterStrikeX = 0; s.encounterStrikeZ = 0;
    s.rec = null;
    s.chunk = Math.floor(s.x / CHUNK) + '|' + Math.floor(s.z / CHUNK);
    s.topY = 0;            // filled by the builder: the platform's standable top
    s.cacheX = 0; s.cacheY = 0; s.cacheZ = 0;
    s.lanternY = 0; s.lanternX = s.x; s.lanternZ = s.z; s.lanternLZ = 0;
    s.baseY = s.y;         // filled by the builder: the ground at the stair's foot
    s.hill = false;        // the terrain hides the lantern from where the player stands
    s.d2 = Infinity;       // player distance squared, refreshed every step
    if (s.variant === 'pond') {
      const p = pondProfileAt(s.x, s.z);
      s.pondFloorY = p.lo; s.pondRelief = p.relief; s.waterY = p.hi + WATER_LIFT;
    } else { s.pondFloorY = 0; s.pondRelief = 0; s.waterY = 0; }

    // Exactly one far-woods deadfall becomes the authored track encounter. Choosing the
    // farthest qualifying record is deterministic and makes it a discovery, not a spawn
    // lottery. It keeps the site's stable id and quota; only its authored contents change.
    if (s.kind === 'wreck' && s.variant === 'deadfall') {
      const ex = hub ? s.x - hub.x : s.x, ez = hub ? s.z - hub.z : s.z;
      const ed2 = ex * ex + ez * ez;
      if (ed2 > encounterD2) { encounter = s; encounterD2 = ed2; }
    }
  }
  if (encounter) {
    encounter.encounter = 'tracks';
    encounter.cache = true;
    encounter.pad = 24;             // prints, reveal tree and prize share one clear glade
  }
  return sites;
}

/* ==========================================================================
   The kit: primitives in, one coloured merged geometry out. sites.js keeps its own
   private; this one is the same idea at the size this file needs.
   ========================================================================== */
class Kit {
  constructor() { this.parts = []; }
  /** Everything is merged NON-INDEXED: an octahedron (polyhedra carry no index) and a box
   *  (indexed) in one kit would otherwise make mergeGeometries return null, silently. */
  push(geoIn, col) {
    let geo = geoIn;
    if (geo.index) { const ni = geo.toNonIndexed(); geo.dispose(); geo = ni; }
    const n = geo.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(geo);
    return geo;
  }
  at(geo, col, x, y, z, ry, rx, rz) {
    if (rz) geo.rotateZ(rz);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    geo.translate(x, y, z);
    return this.push(geo, col);
  }
  box(w, h, d, x, y, z, col, ry, rx, rz) { return this.at(new THREE.BoxGeometry(w, h, d), col, x, y, z, ry, rx, rz); }
  cyl(r0, r1, h, seg, x, y, z, col, ry, rx, rz) { return this.at(new THREE.CylinderGeometry(r0, r1, h, seg, 1, false), col, x, y, z, ry, rx, rz); }
  tube(r0, r1, h, seg, x, y, z, col, ry, rx, rz) { return this.at(new THREE.CylinderGeometry(r0, r1, h, seg, 1, true), col, x, y, z, ry, rx, rz); }
  cone(r, h, seg, x, y, z, col, ry, rx, rz) { return this.at(new THREE.ConeGeometry(r, h, seg, 1, false), col, x, y, z, ry, rx, rz); }
  quad(w, h, x, y, z, col, ry, rx) { return this.at(new THREE.PlaneGeometry(w, h), col, x, y, z, ry, rx, 0); }
  /** A glow pane with a hot core and nothing at the rim (sites.js PANE_LAMP), scaled by gain. */
  pane(w, h, x, y, z, gain, ry, rx) {
    const g = new THREE.PlaneGeometry(w, h, 6, 6);
    const p = g.attributes.position, n = p.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = p.getX(i) / (w * 0.5), v = p.getY(i) / (h * 0.5);
      const r = Math.min(1, Math.hypot(u, v));
      const k = clamp((1 - r) / 0.26, 0, 1);
      const soft = k * k * (3 - 2 * k);
      const val = gain * soft * (1 - 0.55 * r * r);
      c[i * 3] = val; c[i * 3 + 1] = val; c[i * 3 + 2] = val;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    const ni = g.toNonIndexed();
    g.dispose();
    this.parts.push(ni);
    return ni;
  }
  /** A member from (ax,ay,az) to (bx,by,bz) of radius r: legs, braces, beams. */
  strut(ax, ay, az, bx, by, bz, r, seg, col) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.01) return null;
    const g = new THREE.CylinderGeometry(r, r, len, seg || 5, 1, false);
    _sA.set(0, 1, 0); _sB.set(dx / len, dy / len, dz / len);
    _sQ.setFromUnitVectors(_sA, _sB);
    g.applyQuaternion(_sQ);
    g.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    return this.push(g, col);
  }
  /** A pitched roof as two slabs over a w x d footprint at height y, rising `rise`. */
  gable(w, d, y, rise, x, z, col, ry) {
    const slope = Math.atan2(rise, w * 0.5);
    const len = Math.hypot(rise, w * 0.5) + 0.22;
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(len, 0.14, d + 0.5);
      g.rotateZ(-s * slope);
      g.translate(s * w * 0.25, y + rise * 0.5, 0);
      if (ry) g.rotateY(ry);
      g.translate(x, 0, z);
      this.push(g, col);
    }
  }
  empty() { return this.parts.length === 0; }
  build() {
    if (!this.parts.length) return null;
    const merged = this.parts.length === 1 ? this.parts[0] : mergeGeometries(this.parts, false);
    if (this.parts.length > 1) for (const g of this.parts) g.dispose();
    this.parts.length = 0;
    if (merged) merged.computeBoundingSphere();
    return merged;
  }
}
const _sA = new THREE.Vector3(), _sB = new THREE.Vector3(), _sQ = new THREE.Quaternion();

/** The real ground under a LOCAL point of a site, world metres (sites.js groundY). */
function groundY(api, lx, lz) { return api.heightAt(api.wx(lx, lz), api.wz(lx, lz)); }

/** A wooden cache. Its lid and glint are separate meshes so the take can open it and
 *  kill the glint without touching the merged body. Returns what the site record keeps. */
function cacheParts(api, lx, ly, lz, ryaw) {
  const k = new Kit();
  k.box(0.72, 0.42, 0.46, 0, 0.21, 0, C.plank, 0);
  k.box(0.06, 0.34, 0.50, -0.34, 0.20, 0, C.dark, 0);
  k.box(0.06, 0.34, 0.50, 0.34, 0.20, 0, C.dark, 0);
  const body = k.build();
  const lid = new Kit();
  lid.box(0.76, 0.06, 0.50, 0, 0.03, 0.23, C.plank, 0);     // hinged on its back edge
  lid.box(0.20, 0.05, 0.10, 0, 0.065, 0.02, C.metal, 0);     // the hasp
  const lidGeo = lid.build();
  const glint = new Kit();
  glint.at(new THREE.OctahedronGeometry(0.14, 0), [1.6, 1.15, 0.62], 0, 0.86, 0, 0, 0, 0);
  glint.pane(0.8, 0.8, 0, 0.86, 0, 0.7, 0, 0);
  glint.pane(0.8, 0.8, 0, 0.86, 0, 0.7, Math.PI * 0.5, 0);
  const glintGeo = glint.build();
  // A taken cache still rebuilds its opened shell for continuity, but it must never
  // resurrect a solid/breakable collider after streaming out and back in.
  const colliderId = api.site.taken ? -1 : api.emit({
    kind: 'obb', x: lx, z: lz, halfX: 0.38, halfZ: 0.25, yaw: ryaw || 0,
    y0: ly - 0.3, y1: ly + 0.44, tag: 'cache', standable: true, breakable: 12,
  });
  return { body, lidGeo, glintGeo, lx, ly, lz, ryaw: ryaw || 0, colliderId };
}

/* ==========================================================================
   THE BUILDERS. api = { site, padY, yaw, rng, heightAt(wx,wz), wx(lx,lz), wz(lx,lz),
   emit(localShape) }. Local metres from the site origin in the site's own yawed frame,
   absolute Y. Every builder returns { solid: Kit, glow: Kit, cache: parts | null }.
   ========================================================================== */

/**
 * THE LOOKOUT TOWER. Four leaning legs with braces, a square helix of stairs inside them
 * (LANDING + 5 treads + LANDING per side, 0.42 a step), a plank platform with a stairwell
 * slot along the side the last flight climbs, rails, a roof on four posts, a lantern on a
 * short mast over the ridge, and the cache at the platform's centre.
 *
 * THE HELIX AND THE SLAB. A flight rises FLIGHT_RISE (2.10 m). The platform slab is a
 * standable collider from H - SLAB_T to H; a body on the top tread of the flight BELOW the
 * last one has its head at (H - 2.10) + 1.80 = H - 0.30, which is under the slab's
 * underside at H - 0.16 - so it is never blocked. The LAST flight is under the slab too
 * and its treads are inside 2 m of it, so the slab is cut back by STRIP along that side
 * (the stairwell), and the arrival landing at the far corner is its own standable box.
 * The helix always ends on local +Z (the start side is chosen so), which is why the
 * strip is where it is.
 */
function buildTower(api) {
  const site = api.site;
  const solid = new Kit(), glow = new Kit();
  const nF = site.flights;
  // THE STAIR STARTS FROM THE EARTH AT ITS OWN FOOT, never from the pad's centre height.
  // terrain.js's detail octave is +-1.2 m over ~9 m, so under a 4.55 m stair square the
  // ground at the departure landing sits up to 1.2 m under padY. MEASURED 2026-09-03
  // (tests/artifacts/probe-climb-trace.mjs, w4): the ground at the landing was -0.61 m,
  // the landing top 0.68 m over the feet against STEP_UP 0.52, and the body stood at the
  // first step for ever. The base is the LOWEST ground over the landing and the metre of
  // approach behind it, so the first step is never more than a step, and the platform
  // rises nF flights from THERE; legs and braces go to the ground wherever it is.
  const s0 = ((0 - (nF - 1)) % 4 + 4) % 4;
  const P0X = [WS, -WS, -WS, WS], P0Z = [WS, WS, -WS, -WS];
  const a0x = P0X[s0], a0z = P0Z[s0], b0x = P0X[(s0 + 1) % 4], b0z = P0Z[(s0 + 1) % 4];
  const u0x = (b0x - a0x) / SIDE, u0z = (b0z - a0z) / SIDE;
  const o0x = (Math.abs(a0x + b0x) > 1) ? Math.sign(a0x + b0x) : 0;
  const o0z = (Math.abs(a0z + b0z) > 1) ? Math.sign(a0z + b0z) : 0;
  const in0X = a0x - o0x * FLIGHT_W * 0.5 + u0x * LANDING * 0.5;
  const in0Z = a0z - o0z * FLIGHT_W * 0.5 + u0z * LANDING * 0.5;
  let yBase = groundY(api, in0X, in0Z);
  for (let k = 1; k <= 2; k++) yBase = Math.min(yBase, groundY(api, in0X - u0x * 0.6 * k, in0Z - u0z * 0.6 * k));
  const H = yBase + nF * FLIGHT_RISE;
  site.topY = H;
  site.baseY = yBase;

  // ---- legs, on the ground under each, to the platform ------------------------
  const legR = 0.17;
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
    const bx = sx * LEG_BASE, bz = sz * LEG_BASE;
    const tx = sx * LEG_TOP, tz = sz * LEG_TOP;
    const g = groundY(api, bx, bz) - 0.4;
    solid.strut(bx, g, bz, tx, H + 0.1, tz, legR, 6, C.wood);
    api.emit({ kind: 'circle', x: (bx + tx) * 0.5, z: (bz + tz) * 0.5, r: legR + 0.20, y0: g, y1: H, tag: 'wood' });
  }
  // ---- horizontal braces every ~2.1 m, X braces on every face above the first level ---
  const levels = Math.max(2, Math.round((H - yBase) / 2.1));
  for (let l = 1; l <= levels; l++) {
    const t = l / levels;
    const y = lerp(yBase, H, t);
    const w = lerp(LEG_BASE, LEG_TOP, t);
    const yPrev = lerp(yBase, H, (l - 1) / levels);
    const wPrev = lerp(LEG_BASE, LEG_TOP, (l - 1) / levels);
    for (let f = 0; f < 4; f++) {
      // the face's two corners at this level and the one below
      const c0 = f, c1 = (f + 1) % 4;
      const ax = ((c0 === 0 || c0 === 3) ? 1 : -1), az = (c0 < 2 ? 1 : -1);
      const bx = ((c1 === 0 || c1 === 3) ? 1 : -1), bz = (c1 < 2 ? 1 : -1);
      solid.strut(ax * w, y, az * w, bx * w, y, bz * w, 0.06, 4, C.wood);
      if (l > 1) {
        solid.strut(ax * wPrev, yPrev, az * wPrev, bx * w, y, bz * w, 0.045, 4, C.wood);
        solid.strut(bx * wPrev, yPrev, bz * wPrev, ax * w, y, az * w, 0.045, 4, C.wood);
      }
    }
  }

  // ---- the helix --------------------------------------------------------------
  // corners of the stair square: P0 (+,+) P1 (-,+) P2 (-,-) P3 (+,-); side s runs Ps -> Ps+1
  const PX = [WS, -WS, -WS, WS], PZ = [WS, WS, -WS, -WS];
  const f0 = ((0 - (nF - 1)) % 4 + 4) % 4;          // so the last flight lies on side 0 (+Z)
  const route = [];
  let y = yBase;
  for (let f = 0; f < nF; f++) {
    const s = (f0 + f) % 4;
    const ax = PX[s], az = PZ[s], bx = PX[(s + 1) % 4], bz = PZ[(s + 1) % 4];
    const ux = (bx - ax) / SIDE, uz = (bz - az) / SIDE;     // along the side
    // outward normal of the side: the side's own coordinate that is +-WS
    const ox = (Math.abs(ax + bx) > 1) ? Math.sign(ax + bx) : 0;
    const oz = (Math.abs(az + bz) > 1) ? Math.sign(az + bz) : 0;
    // the departure landing: the ground on the first flight, otherwise the previous top
    const inX = ax - ox * FLIGHT_W * 0.5 + ux * LANDING * 0.5;
    const inZ = az - oz * FLIGHT_W * 0.5 + uz * LANDING * 0.5;
    if (f === 0) {
      // the audit starts on the earth a stride behind the landing, where a player does
      route.push({ x: inX - ux * 1.4, z: inZ - uz * 1.4, y: groundY(api, inX - ux * 1.4, inZ - uz * 1.4) });
      route.push({ x: inX, z: inZ, y });
      solid.box(LANDING, 0.10, FLIGHT_W, inX, y + 0.02, inZ, C.plank, s * Math.PI * 0.5);
      api.emit({ kind: 'obb', x: inX, z: inZ, halfX: LANDING * 0.5, halfZ: FLIGHT_W * 0.5, yaw: -s * Math.PI * 0.5, y0: y - 0.4, y1: y + 0.07, tag: 'wood', standable: true });
    }
    // treads
    for (let i = 1; i <= STEPS; i++) {
      const t = LANDING + (i - 0.5) * TREAD;
      const cx = ax + ux * t - ox * FLIGHT_W * 0.5;
      const cz = az + uz * t - oz * FLIGHT_W * 0.5;
      const top = y + i * STEP_RISE;
      solid.box(TREAD, 0.09, FLIGHT_W, cx, top - 0.045, cz, C.plank, s * Math.PI * 0.5);
      // the riser: a board across the flight at the tread's back edge
      const rx = ax + ux * (t - TREAD * 0.5) - ox * FLIGHT_W * 0.5;
      const rz = az + uz * (t - TREAD * 0.5) - oz * FLIGHT_W * 0.5;
      solid.box(0.05, STEP_RISE - 0.09, FLIGHT_W, rx, top - 0.09 - (STEP_RISE - 0.09) * 0.5, rz, C.wood, s * Math.PI * 0.5);
      api.emit({ kind: 'obb', x: cx, z: cz, halfX: TREAD * 0.5, halfZ: FLIGHT_W * 0.5, yaw: -s * Math.PI * 0.5, y0: top - 0.30, y1: top, tag: 'wood', standable: true });
    }
    // stringers and the two rails of this flight (inner: the well; outer: the face)
    const yTop = y + FLIGHT_RISE;
    const t0 = LANDING, t1 = LANDING + STEPS * TREAD;
    for (const side of [-1, 1]) {
      const off = side < 0 ? FLIGHT_W - 0.03 : 0.03;      // inner (well) or outer
      const rx0 = ax + ux * t0 - ox * off, rz0 = az + uz * t0 - oz * off;
      const rx1 = ax + ux * t1 - ox * off, rz1 = az + uz * t1 - oz * off;
      solid.strut(rx0, y + 0.20, rz0, rx1, yTop + 0.20, rz1, 0.05, 4, C.wood);   // stringer
      solid.strut(rx0, y + RAIL_H, rz0, rx1, yTop + RAIL_H, rz1, 0.035, 4, C.wood); // handrail
      solid.strut(rx0, y + 0.2, rz0, rx0, y + RAIL_H, rz0, 0.03, 4, C.wood);
      solid.strut(rx1, yTop + 0.2, rz1, rx1, yTop + RAIL_H, rz1, 0.03, 4, C.wood);
      const railOff = side < 0 ? FLIGHT_W + 0.12 : -0.12;
      const mx = ax + ux * (t0 + t1) * 0.5 - ox * railOff, mz = az + uz * (t0 + t1) * 0.5 - oz * railOff;
      api.emit({ kind: 'obb', x: mx, z: mz, halfX: (t1 - t0) * 0.5 - 0.10, halfZ: 0.03, yaw: -s * Math.PI * 0.5, y0: y - 0.2, y1: yTop + RAIL_H, tag: 'wood' });
    }
    // the arrival landing, at the next corner (the last one is part of the platform)
    y = yTop;
    const c1 = (s + 1) % 4;
    const cx1 = PX[c1], cz1 = PZ[c1];
    const ex = -ux * LANDING * 0.5 - ox * FLIGHT_W * 0.5, ez = -uz * LANDING * 0.5 - oz * FLIGHT_W * 0.5;
    const landX = cx1 + ex, landZ = cz1 + ez;
    // a post at the landing's inner corner so the well is not an open drop from the turn
    const px = cx1 - Math.sign(cx1) * (LANDING + 0.16), pz = cz1 - Math.sign(cz1) * (LANDING + 0.16);
    solid.strut(px, y, pz, px, y + RAIL_H, pz, 0.035, 4, C.wood);
    api.emit({ kind: 'circle', x: px, z: pz, r: 0.10, y0: y - 0.2, y1: y + RAIL_H, tag: 'wood' });
    if (f < nF - 1) {
      solid.box(LANDING, 0.10, LANDING, landX, y - 0.05, landZ, C.plank, 0);
      api.emit({ kind: 'obb', x: landX, z: landZ, halfX: LANDING * 0.5, halfZ: LANDING * 0.5, yaw: 0, y0: y - 0.35, y1: y, tag: 'wood', standable: true });
      route.push({ x: landX, z: landZ, y });
    } else {
      // the top: the arrival landing joins the slab across the strip (x from -PLAT_HALF)
      const zc = (WS - STRIP + WS) * 0.5, zh = STRIP * 0.5;
      const xc = (-PLAT_HALF + (-WS + LANDING)) * 0.5, xh = (PLAT_HALF - WS + LANDING) * 0.5;
      solid.box(xh * 2, SLAB_T, zh * 2, xc, H - SLAB_T * 0.5, zc, C.plank, 0);
      api.emit({ kind: 'obb', x: xc, z: zc, halfX: xh, halfZ: zh, yaw: 0, y0: H - 0.35, y1: H, tag: 'wood', standable: true });
      route.push({ x: -WS + LANDING * 0.5, z: WS - LANDING * 0.5, y: H });
    }
  }

  // ---- the platform slab: the square minus the strip along +Z --------------------
  {
    const z0 = -PLAT_HALF, z1 = WS - STRIP;
    const zc = (z0 + z1) * 0.5, zh = (z1 - z0) * 0.5;
    // PLANKS, with gaps and two values, not one slab: seen from the eye 1.68 m over it the
    // floor is most of the frame, and one flat plane that large is a stage (ART.md 3.1)
    const nP = Math.round(PLAT_HALF * 2 / 0.28);
    for (let i = 0; i < nP; i++) {
      const x = -PLAT_HALF + (i + 0.5) * (PLAT_HALF * 2 / nP);
      solid.box(0.25, SLAB_T, zh * 2, x, H - SLAB_T * 0.5, zc, (i % 3) === 1 ? C.wood : C.plank, 0);
    }
    api.emit({ kind: 'obb', x: 0, z: zc, halfX: PLAT_HALF, halfZ: zh, yaw: 0, y0: H - 0.35, y1: H, tag: 'wood', standable: true });
    // joists under it, so the underside is a structure and not a sheet
    for (let i = -2; i <= 2; i++) solid.box(0.10, 0.22, zh * 2, i * PLAT_HALF * 0.45, H - SLAB_T - 0.11, zc, C.wood, 0);
    // rails: three full sides, the strip side at WS + 0.12, and the well's edge
    const rail = (x, z, hx, hz) => {
      api.emit({ kind: 'obb', x, z, halfX: hx, halfZ: hz, yaw: 0, y0: H - 0.2, y1: H + RAIL_H, tag: 'wood' });
      solid.box(hx * 2 + 0.06, 0.05, hz * 2 + 0.06, x, H + RAIL_H, z, C.wood, 0);
      solid.box(hx * 2 + 0.06, 0.04, hz * 2 + 0.06, x, H + RAIL_H * 0.5, z, C.wood, 0);
      const alongX = hx > hz;
      const n = Math.max(2, Math.round((alongX ? hx : hz) * 2 / 1.1));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = alongX ? x - hx + hx * 2 * t : x;
        const pz = alongX ? z : z - hz + hz * 2 * t;
        solid.box(0.06, RAIL_H, 0.06, px, H + RAIL_H * 0.5, pz, C.wood, 0);
      }
    };
    rail(0, -PLAT_HALF, PLAT_HALF, 0.03);                                   // -Z
    rail(-PLAT_HALF, (z0 + WS) * 0.5, 0.03, (WS - z0) * 0.5);                // -X
    rail(PLAT_HALF, (z0 + WS) * 0.5, 0.03, (WS - z0) * 0.5);                 // +X
    rail(0, WS + 0.12, PLAT_HALF, 0.03);                                     // +Z, over the well
    // the well's inner edge: from the landing's end to the far side
    const wx0 = -WS + LANDING + 0.10, wx1 = PLAT_HALF;
    rail((wx0 + wx1) * 0.5, WS - STRIP + 0.02, (wx1 - wx0) * 0.5, 0.03);
  }

  // ---- the roof on four posts, and the lantern on a mast over its ridge ------------
  {
    const px = PLAT_HALF - 0.35, zA = -PLAT_HALF + 0.35, zB = WS - STRIP - 0.30;
    const roofY = H + 2.35;
    for (const [x, z] of [[-px, zA], [px, zA], [-px, zB], [px, zB]]) {
      solid.box(0.14, roofY - H, 0.14, x, (H + roofY) * 0.5, z, C.wood, 0);
      api.emit({ kind: 'circle', x, z, r: 0.12, y0: H - 0.2, y1: roofY, tag: 'wood' });
    }
    const dz = (zB - zA), zc = (zA + zB) * 0.5;
    solid.gable(px * 2 + 1.0, dz, roofY, 1.1, 0, zc, C.slate, 0);
    // the mast and the lantern: a housing, the glass, and a halo that reads at 150 m
    const mastY = roofY + 1.1 + 0.9;
    solid.box(0.08, 1.4, 0.08, 0, mastY - 0.5, zc, C.metal, 0);
    solid.box(0.34, 0.06, 0.34, 0, mastY + 0.22, zc, C.metal, 0);
    solid.box(0.30, 0.06, 0.30, 0, mastY - 0.24, zc, C.metal, 0);
    site.lanternY = mastY;
    site.lanternLZ = zc;
    site.lanternX = api.wx(0, zc); site.lanternZ = api.wz(0, zc);
    glow.at(new THREE.OctahedronGeometry(0.19, 0), [1.7, 1.2, 0.66], 0, mastY, zc, 0, 0, 0);
    glow.pane(1.1, 1.1, 0, mastY, zc, 1.0, 0, 0);
    glow.pane(1.1, 1.1, 0, mastY, zc, 1.0, Math.PI * 0.5, 0);
    glow.pane(1.1, 1.1, 0, mastY, zc, 1.0, Math.PI * 0.25, 0);
    glow.pane(1.1, 1.1, 0, mastY, zc, 1.0, -Math.PI * 0.25, 0);
    // a little light in the cabin, under the roof, so the tower has a window at night
    glow.pane(0.5, 0.5, 0, H + 1.6, zc - 0.6, 0.35, 0, 0);
  }

  // ---- the cache, on the slab, mid-platform ------------------------------------
  const cache = site.cache ? cacheParts(api, 0, H, -0.6, 0) : null;
  if (cache) { site.cacheX = api.wx(0, -0.6); site.cacheZ = api.wz(0, -0.6); site.cacheY = H; }
  site.route = route;
  site.platHalfX = PLAT_HALF; site.platHalfZ = PLAT_HALF;
  return { solid, glow, cache };
}

/**
 * THE DEER STAND. A plank platform at 4-5 m on four poles, a steep stair of rungs on the
 * -Z side whose last rung IS the platform's edge, rails on three sides and either side of
 * the stair head, a low front board with the hunter's slot, and a cache half the time.
 */
function buildStand(api) {
  const site = api.site;
  const solid = new Kit(), glow = new Kit();
  void glow;
  const hw = STAND_HALF;
  const n0 = Math.max(6, Math.round(site.h / RUNG_RISE));
  const H = api.padY + n0 * RUNG_RISE;
  site.topY = H;
  // THE RUNGS START FROM THE EARTH AT THE STAIR'S FOOT (buildTower says why): the base is
  // the lowest ground over the foot and the metre behind it, the count grows until every
  // rise is under RUNG_RISE, and the stair reaches further out to carry them. MEASURED
  // 2026-09-03 before this: at six stands the foot was 0.64-1.23 m under padY and rung 1
  // stood 1.1-1.7 m over the feet; the body never left the ground.
  let z0 = -hw - n0 * RUNG_RUN;
  let g0 = Math.min(groundY(api, 0, z0), groundY(api, 0, z0 - 0.5), groundY(api, 0, z0 - 1.0));
  let n = Math.max(n0, Math.ceil((H - g0) / RUNG_RISE - 1e-6));
  z0 = -hw - n * RUNG_RUN;
  g0 = Math.min(g0, groundY(api, 0, z0), groundY(api, 0, z0 - 0.5), groundY(api, 0, z0 - 1.0));
  n = Math.max(n, Math.ceil((H - g0) / RUNG_RISE - 1e-6));
  z0 = -hw - n * RUNG_RUN;
  const rise = (H - g0) / n;
  site.baseY = g0;
  // poles
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
    const g = groundY(api, sx * (hw - 0.15), sz * (hw - 0.15)) - 0.4;
    solid.strut(sx * (hw - 0.15), g, sz * (hw - 0.15), sx * (hw - 0.15), H + 0.4, sz * (hw - 0.15), 0.11, 6, C.wood);
    api.emit({ kind: 'circle', x: sx * (hw - 0.15), z: sz * (hw - 0.15), r: 0.26, y0: g, y1: H, tag: 'wood' });
    // a diagonal brace on each pole toward the centre, low
    solid.strut(sx * (hw - 0.15), api.padY + 1.6, sz * (hw - 0.15), sx * 0.3, api.padY + 3.2, sz * 0.3, 0.05, 4, C.wood);
  }
  // the platform
  solid.box(hw * 2, 0.14, hw * 2, 0, H - 0.07, 0, C.plank, 0);
  for (let i = -1; i <= 1; i++) solid.box(hw * 2, 0.16, 0.10, 0, H - 0.22, i * hw * 0.6, C.wood, 0);
  api.emit({ kind: 'obb', x: 0, z: 0, halfX: hw, halfZ: hw, yaw: 0, y0: H - 0.35, y1: H, tag: 'wood', standable: true });
  // rails: full on +Z, +X, -X; on -Z (the stair head) two stubs outside the 1.6 m gap
  const rail = (x, z, hx, hz, h) => {
    api.emit({ kind: 'obb', x, z, halfX: hx, halfZ: hz, yaw: 0, y0: H - 0.2, y1: H + h, tag: 'wood' });
    solid.box(hx * 2 + 0.06, 0.05, hz * 2 + 0.06, x, H + h, z, C.wood, 0);
    solid.box(hx * 2 + 0.06, 0.04, hz * 2 + 0.06, x, H + h * 0.55, z, C.wood, 0);
  };
  rail(0, hw, hw, 0.03, RAIL_H);
  rail(-hw, 0, 0.03, hw, RAIL_H);
  rail(hw, 0, 0.03, hw, RAIL_H);
  rail(-(hw + 0.8) * 0.5, -hw, (hw - 0.8) * 0.5, 0.03, RAIL_H);
  rail((hw + 0.8) * 0.5, -hw, (hw - 0.8) * 0.5, 0.03, RAIL_H);
  // the hunter's board along +Z: a low wall with the slot, over the rail
  solid.box(hw * 2, 0.55, 0.06, 0, H + 0.62, hw + 0.05, C.plank, 0);
  solid.box(1.4, 0.16, 0.08, 0, H + 1.05, hw + 0.05, C.dark, 0);
  // the stair: rung k top = padY + k * RUNG_RISE at z = -hw - (n - k) * RUNG_RUN
  const stringerX = 0.44;
  const zTop = -hw;
  for (const sx of [-1, 1]) {
    solid.strut(sx * stringerX, g0 + 0.1, z0, sx * stringerX, H + 0.05, zTop, 0.05, 4, C.wood);
  }
  const route = [{ x: 0, z: z0 - 2.0, y: groundY(api, 0, z0 - 2.0) }];
  for (let k = 1; k < n; k++) {
    const top = g0 + k * rise;
    const z = -hw - (n - k) * RUNG_RUN;
    solid.box(0.80, 0.07, 0.14, 0, top - 0.035, z, C.wood, 0);
    api.emit({ kind: 'obb', x: 0, z, halfX: 0.40, halfZ: 0.07, yaw: 0, y0: top - 0.16, y1: top, tag: 'wood', standable: true });
  }
  route.push({ x: 0, z: -hw + 0.6, y: H });
  route.push({ x: 0, z: 0.3, y: H });
  site.route = route;
  site.platHalfX = hw; site.platHalfZ = hw;
  const cache = site.cache ? cacheParts(api, 0.45, H, 0.55, 0) : null;
  if (cache) { site.cacheX = api.wx(0.45, 0.55); site.cacheZ = api.wz(0.45, 0.55); site.cacheY = H; }
  return { solid, glow, cache };
}

/** A stone wall segment on the ground under it, with its collider. */
function wallSeg(k, api, x0, z0, x1, z1, h, t, col, tag) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  const cx = (x0 + x1) * 0.5, cz = (z0 + z1) * 0.5;
  const g = Math.min(groundY(api, x0, z0), groundY(api, x1, z1), groundY(api, cx, cz)) - 0.4;
  const top = api.padY + h;
  k.box(len, top - g, t, cx, (g + top) * 0.5, cz, col, yaw);
  api.emit({ kind: 'obb', x: cx, z: cz, halfX: len * 0.5, halfZ: t * 0.5, yaw, y0: g, y1: top, tag: tag || 'wall', standable: h <= 0.6 });
}

/**
 * A terrain-sampled surface from local x/z nodes and triangle indices. Every rendered
 * water vertex is exactly WATER_LIFT above heightAt at that same world point; no flat quad
 * can cut half a metre into one bank and hover over the other. Build-time only.
 */
function terrainSurface(k, api, nodes, indices, col) {
  const pos = new Float32Array(nodes.length * 3);
  const uv = new Float32Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    const x = nodes[i][0], z = nodes[i][1];
    pos[i * 3] = x; pos[i * 3 + 1] = groundY(api, x, z) + WATER_LIFT; pos[i * 3 + 2] = z;
    uv[i * 2] = x * 0.18; uv[i * 2 + 1] = z * 0.18;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.push(g, col);
}

/** An irregular six-ring pond. Unlike a stream it is genuinely level. */
function pondSurface(k, cx, cz, rx, rz, level) {
  const rings = 6, seg = 32;
  const nodes = [[cx, cz]], indices = [];
  for (let ring = 1; ring <= rings; ring++) {
    const t = ring / rings;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      const edge = 1 + 0.055 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 - 0.3);
      nodes.push([cx + Math.cos(a) * rx * t * edge, cz + Math.sin(a) * rz * t * edge]);
    }
  }
  for (let i = 0; i < seg; i++) indices.push(0, 1 + i, 1 + (i + 1) % seg);
  for (let ring = 2; ring <= rings; ring++) {
    const inner = 1 + (ring - 2) * seg, outer = 1 + (ring - 1) * seg;
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      indices.push(inner + i, outer + i, outer + j, inner + i, outer + j, inner + j);
    }
  }
  const pos = new Float32Array(nodes.length * 3);
  const uv = new Float32Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    pos[i * 3] = nodes[i][0]; pos[i * 3 + 1] = level; pos[i * 3 + 2] = nodes[i][1];
    uv[i * 2] = nodes[i][0] * 0.18; uv[i * 2 + 1] = nodes[i][1] * 0.18;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.push(g, WATER);
}

/**
 * Three-ring opaque shore: the inner edge meets the water, a raised earthen lip declares
 * the basin, and the outer apron returns to terrain + 2.5 cm. This hides no giant void—the
 * planner caps the bed relief at 65 cm—and every outer vertex conforms to the real ground.
 */
function pondBankSurface(k, api, cx, cz, rx, rz, level) {
  const seg = 32, nodes = [], indices = [];
  for (let ring = 0; ring < 3; ring++) {
    const scale = ring === 0 ? 1 : ring === 1 ? 1.18 : 1.42;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      const edge = 1 + 0.055 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 - 0.3);
      const x = cx + Math.cos(a) * rx * scale * edge;
      const z = cz + Math.sin(a) * rz * scale * edge;
      const ground = groundY(api, x, z);
      const y = ring === 0 ? level + 0.008
        : ring === 1 ? Math.max(level + 0.12, ground + 0.035)
          : ground + 0.025;
      nodes.push([x, y, z]);
    }
  }
  for (let ring = 0; ring < 2; ring++) {
    const a0 = ring * seg, b0 = (ring + 1) * seg;
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      indices.push(a0 + i, b0 + i, b0 + j, a0 + i, b0 + j, a0 + j);
    }
  }
  const pos = new Float32Array(nodes.length * 3);
  const uv = new Float32Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    pos[i * 3] = nodes[i][0]; pos[i * 3 + 1] = nodes[i][1]; pos[i * 3 + 2] = nodes[i][2];
    uv[i * 2] = nodes[i][0] * 0.16; uv[i * 2 + 1] = nodes[i][2] * 0.16;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.push(g, POND_BANK);
}

/** One continuous terrain-sampled creek ribbon, dense enough to follow the forest floor. */
function streamSurface(k, api) {
  const rows = 29, cols = 5;
  const nodes = [], indices = [];
  for (let iz = 0; iz < rows; iz++) {
    const t = iz / (rows - 1), z = -8.2 + t * 16.4;
    const phase = t * 7.5;
    const cx = Math.sin(phase) * 1.12;
    const dxDz = Math.cos(phase) * 1.12 * 7.5 / 16.4;
    const inv = 1 / Math.hypot(1, dxDz);
    const nx = inv, nz = -dxDz * inv;
    const width = 1.55 + 0.24 * Math.sin(t * TAU * 2 + 0.4);
    for (let ix = 0; ix < cols; ix++) {
      const across = (ix / (cols - 1) - 0.5) * width;
      nodes.push([cx + nx * across, z + nz * across]);
    }
  }
  for (let iz = 0; iz < rows - 1; iz++) {
    for (let ix = 0; ix < cols - 1; ix++) {
      const a = iz * cols + ix, b = a + 1, c = a + cols, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  terrainSurface(k, api, nodes, indices, WATER);
}

/** RUIN / WATERHOLE: a built remnant or one of the little wet places in the forest. */
function buildRuin(api) {
  const site = api.site;
  const solid = new Kit(), glow = new Kit();
  const r = api.rng;
  let cache = null;
  if (site.variant === 'chapel') {
    // a 6 x 9 shell, walls broken to different heights, a doorway on -Z, a gable end on +Z
    const w = 3.0, d = 4.5, t = 0.5;
    // the +Z end: the tallest wall, its top BROKEN into steps so it is a ruin and not a slab
    wallSeg(solid, api, -w, d, -1.5, d, 3.1, t, C.stone);
    wallSeg(solid, api, -1.5, d, 0.4, d, 4.6, t, C.stone);
    wallSeg(solid, api, 0.4, d, 1.8, d, 5.4, t, C.stone);
    wallSeg(solid, api, 1.8, d, w, d, 3.6, t, C.stone);
    solid.box(0.6, 1.4, t + 0.3, -1.0, api.padY + 5.2, d, C.stone, 0);        // the gable stub
    for (const bx of [-w - 0.35, w + 0.35]) {                                 // buttresses
      solid.box(0.7, 2.4, 1.1, bx, api.padY + 1.2 - 0.3, d - 0.2, C.stone, 0);
      api.emit({ kind: 'obb', x: bx, z: d - 0.2, halfX: 0.35, halfZ: 0.55, yaw: 0, y0: api.padY - 0.5, y1: api.padY + 2.1, tag: 'wall' });
    }
    wallSeg(solid, api, -w, -d, -w, d, 1.2 + r.range(0, 1.4), t, C.stone);
    wallSeg(solid, api, w, -d, w, d, 1.0 + r.range(0, 1.6), t, C.stone);
    wallSeg(solid, api, -w, -d, -1.1, -d, 2.6, t, C.stone);
    wallSeg(solid, api, 1.1, -d, w, -d, 2.6, t, C.stone);
    // the window arch in the +Z end: a dark recess and a rose that survived
    solid.box(1.2, 1.9, 0.12, 0, api.padY + 2.6, d - 0.3, C.dark, 0);
    // rubble
    for (let i = 0; i < 9; i++) {
      const lx = r.range(-w + 0.5, w - 0.5), lz = r.range(-d + 0.6, d - 0.6);
      const s = r.range(0.3, 0.8);
      const gy = groundY(api, lx, lz);
      solid.box(s, s * 0.5, s * 0.8, lx, gy + s * 0.2, lz, C.stone, r.range(0, TAU), 0, r.range(-0.2, 0.2));
      api.emit({ kind: 'circle', x: lx, z: lz, r: s * 0.45, y0: gy - 0.2, y1: gy + s * 0.45, tag: 'stone', standable: true });
    }
    // a fallen roof beam across the nave
    solid.strut(-w + 0.4, api.padY + 0.3, 1.0, w - 0.4, api.padY + 1.6, 0.2, 0.12, 5, C.wood);
    if (site.cache) cache = cacheParts(api, 1.6, api.padY, d - 1.2, 0);
    if (cache) { site.cacheX = api.wx(1.6, d - 1.2); site.cacheZ = api.wz(1.6, d - 1.2); site.cacheY = api.padY; }
  } else if (site.variant === 'foundation') {
    // a footing ring you can walk on, a chimney stack, a hearth, one standing post
    const w = 4.0, d = 3.0, t = 0.5;
    wallSeg(solid, api, -w, d, w, d, 0.5, t, C.stone, 'stone');
    wallSeg(solid, api, -w, -d, w, -d, 0.5, t, C.stone, 'stone');
    wallSeg(solid, api, -w, -d, -w, d, 0.5, t, C.stone, 'stone');
    wallSeg(solid, api, w, -d, w, d, 0.5, t, C.stone, 'stone');
    const cy = groundY(api, -w + 0.9, 0) - 0.3;
    const ch = 4.6 + r.range(0, 1.2);
    solid.box(1.3, api.padY + ch - cy, 1.3, -w + 0.9, (cy + api.padY + ch) * 0.5, 0, C.brick, 0);
    solid.box(0.9, 1.1, 0.2, -w + 0.9 + 0.65, api.padY + 0.6, 0, C.dark, 0);   // the hearth mouth
    api.emit({ kind: 'obb', x: -w + 0.9, z: 0, halfX: 0.65, halfZ: 0.65, yaw: 0, y0: cy, y1: api.padY + ch, tag: 'wall' });
    solid.strut(w - 0.6, api.padY, -d + 0.6, w - 0.6, api.padY + 2.6, -d + 0.6, 0.10, 5, C.wood);
    api.emit({ kind: 'circle', x: w - 0.6, z: -d + 0.6, r: 0.18, y0: api.padY - 0.3, y1: api.padY + 2.6, tag: 'wood' });
    // a fallen joist and the floor's few surviving boards
    solid.strut(-1.5, api.padY + 0.5, d - 0.4, 2.2, api.padY + 0.1, -d + 0.8, 0.09, 4, C.wood);
    for (let i = 0; i < 4; i++) {
      solid.box(r.range(1.5, 3.0), 0.06, 0.24, r.range(-2, 2), api.padY + 0.05, r.range(-2, 2), C.plank, r.range(-0.3, 0.3));
    }
    if (site.cache) cache = cacheParts(api, w - 1.3, api.padY, d - 1.0, 0.3);
    if (cache) { site.cacheX = api.wx(w - 1.3, d - 1.0); site.cacheZ = api.wz(w - 1.3, d - 1.0); site.cacheY = api.padY; }
  } else if (site.variant === 'well') {
    // the well: a stone ring, the frame over it, the bucket that is still there
    const R = 1.15, h = 0.95;
    solid.tube(R, R * 1.06, h + 0.4, 12, 0, api.padY + h * 0.5 - 0.2, 0, C.stone);
    solid.cyl(R - 0.25, R - 0.25, 0.1, 12, 0, api.padY + 0.25, 0, C.dark);   // the black water
    api.emit({ kind: 'circle', x: 0, z: 0, r: R + 0.05, y0: api.padY - 0.5, y1: api.padY + h, tag: 'stone', standable: true });
    solid.strut(-R - 0.1, api.padY, 0, -R - 0.1, api.padY + 2.3, 0, 0.08, 5, C.wood);
    solid.strut(R + 0.1, api.padY, 0, R + 0.1, api.padY + 2.3, 0, 0.08, 5, C.wood);
    solid.strut(-R - 0.3, api.padY + 2.3, 0, R + 0.3, api.padY + 2.3, 0, 0.07, 5, C.wood);
    solid.strut(-R - 0.1, api.padY + 2.3, 0, 0, api.padY + 2.9, 0, 0.06, 4, C.wood);
    solid.strut(R + 0.1, api.padY + 2.3, 0, 0, api.padY + 2.9, 0, 0.06, 4, C.wood);
    solid.cyl(0.03, 0.03, 1.1, 4, 0, api.padY + 1.7, 0, C.metal);
    solid.cyl(0.16, 0.14, 0.24, 8, 0, api.padY + 1.1, 0, C.metal);
    // a few flagstones and a low wall stub
    for (let i = 0; i < 6; i++) {
      const a = r.range(0, TAU), rr = r.range(1.6, 3.0);
      const lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;
      solid.box(r.range(0.5, 0.9), 0.08, r.range(0.5, 0.9), lx, groundY(api, lx, lz) + 0.03, lz, C.stone, r.range(0, TAU));
    }
    wallSeg(solid, api, 2.6, -2.0, 3.4, 1.6, 0.7, 0.4, C.stone, 'stone');
    if (site.cache) cache = cacheParts(api, -2.2, groundY(api, -2.2, 1.4), 1.4, 0.6);
    if (cache) { site.cacheX = api.wx(-2.2, 1.4); site.cacheZ = api.wz(-2.2, 1.4); site.cacheY = groundY(api, -2.2, 1.4); }
  } else if (site.variant === 'pond') {
    // A small black woodland pond: genuinely level water in a deterministically selected
    // shallow basin, with an opaque bank joining it back to the real terrain. Teal stays on
    // the shared Lambert body material: visibly water, zero additional shader programs.
    pondSurface(solid, 0, 0, POND_RX, POND_RZ, site.waterY);
    pondBankSurface(solid, api, 0, 0, POND_RX, POND_RZ, site.waterY);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + r.range(-0.08, 0.08);
      const rr = r.range(4.2, 5.3), lx = Math.cos(a) * rr, lz = Math.sin(a) * rr * 0.76;
      const sg = groundY(api, lx, lz), sz = r.range(0.22, 0.48);
      solid.at(new THREE.IcosahedronGeometry(sz, 0).scale(1.4, 0.55, 1), C.stone,
        lx, sg + sz * 0.18, lz, r.range(0, TAU), 0, 0);
    }
    for (let i = 0; i < 22; i++) {
      const side = i & 1 ? 1 : -1;
      const lx = side * r.range(3.3, 4.9), lz = r.range(-2.8, 2.8);
      const rg = groundY(api, lx, lz);
      solid.strut(lx, rg, lz, lx + r.range(-0.12, 0.12), rg + r.range(0.7, 1.5), lz + r.range(-0.10, 0.10), 0.018, 4, REED);
    }
    // old fishing planks, still step-safe and leading to the cache on dry bank
    for (let i = 0; i < 5; i++) {
      const lx = -5.4 + i * 0.72, lz = 1.7;
      solid.box(0.68, 0.10, 1.25, lx, groundY(api, lx, lz) + 0.12, lz, C.plank, r.range(-0.08, 0.08));
      api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.34, halfZ: 0.62, yaw: 0, y0: groundY(api, lx, lz) - 0.1, y1: groundY(api, lx, lz) + 0.18, tag: 'wood', standable: true });
    }
    if (site.cache) cache = cacheParts(api, -5.7, groundY(api, -5.7, 2.6), 2.6, -0.25);
    if (cache) { site.cacheX = api.wx(-5.7, 2.6); site.cacheZ = api.wz(-5.7, 2.6); site.cacheY = groundY(api, -5.7, 2.6); }
  } else {
    // One continuous creek skin sampled on a 29 x 5 grid. The old seven flat quads could
    // hover 0.8 m above a low bank or vanish into a high one; every vertex now follows the
    // terrain function shared by rendering, collision and the player.
    streamSurface(solid, api);
    for (let i = 0; i < 7; i++) {
      const z = -7.5 + i * 2.5;
      const x = Math.sin((z + 8.2) / 16.4 * 7.5) * 1.12;
      for (const side of [-1, 1]) {
        const bx = x + side * (1.0 + r.range(0, 0.35)), bz = z + r.range(-0.8, 0.8);
        const bg = groundY(api, bx, bz);
        if ((i + (side > 0 ? 1 : 0)) % 2 === 0) {
          solid.strut(bx, bg, bz, bx + r.range(-0.08, 0.08), bg + r.range(0.55, 1.2), bz, 0.016, 4, REED);
        } else {
          solid.at(new THREE.IcosahedronGeometry(0.30 + r.range(0, 0.20), 0).scale(1.4, 0.45, 1), C.stone,
            bx, bg + 0.10, bz, r.range(0, TAU), 0, 0);
        }
      }
    }
    // one battered footbridge: a readable crossing and a small authored destination
    const bg = groundY(api, 0, 0);
    for (let i = -2; i <= 2; i++) solid.box(0.62, 0.10, 2.8, i * 0.58, bg + 0.17, 0, C.plank, r.range(-0.06, 0.06));
    api.emit({ kind: 'obb', x: 0, z: 0, halfX: 1.55, halfZ: 1.42, yaw: 0, y0: bg - 0.1, y1: bg + 0.24, tag: 'wood', standable: true });
    if (site.cache) cache = cacheParts(api, 3.0, groundY(api, 3.0, 2.8), 2.8, 0.2);
    if (cache) { site.cacheX = api.wx(3.0, 2.8); site.cacheZ = api.wz(3.0, 2.8); site.cacheY = groundY(api, 3.0, 2.8); }
  }
  return { solid, glow, cache };
}

/** WRECK: a dead car, a scatter of oil drums, or a fallen tree across a gully. */
function buildWreck(api) {
  const site = api.site;
  const solid = new Kit(), glow = new Kit();
  const r = api.rng;
  let cache = null, encounter = null, encounterPosition = null;
  if (site.encounter === 'tracks') {
    // THE TRACKS. Eight strides, each almost as long as the player is tall, alternate
    // through the mud toward one tree whose symmetry is a little too anatomical. The
    // prints and the solid trunk remain in the merged body; only its crown/arms get their
    // own mesh, sweep forward, and return. The collider can therefore never be left behind.
    for (let i = 0; i < 8; i++) {
      const side = (i & 1) ? 0.52 : -0.52;
      const z = 5.0 - i * 1.82, x = side + Math.sin(i * 0.8) * 0.16;
      const gy = groundY(api, x, z) + 0.018;
      solid.box(0.62, 0.025, 1.05, x, gy, z, C.soil, side > 0 ? -0.16 : 0.16);
      for (let toe = -1; toe <= 1; toe++) {
        solid.cyl(0.13 + (toe === 0 ? 0.04 : 0), 0.15, 0.028, 8,
          x + toe * 0.22, gy + 0.004, z - 0.62, C.dark);
      }
    }
    // Bits of bark point the same way as the prints. They are the second read at torch
    // range: something has been shedding a tree-skin as it walked.
    for (let i = 0; i < 6; i++) {
      const x = r.range(-1.4, 1.4), z = 1.8 - i * 2.0;
      solid.box(r.range(0.18, 0.35), 0.035, r.range(0.55, 1.0), x,
        groundY(api, x, z) + 0.025, z, C.wood, r.range(-0.4, 0.4));
    }

    const treeZ = -13.5, treeY = groundY(api, 0, treeZ);
    encounter = new Kit();
    // The full trunk, face and ground roots are stationary and share the exact world frame
    // of the root collider. They remain visibly solid both during and after the crown sweep.
    solid.cyl(0.62, 0.92, 6.8, 7, 0, treeY + 3.4, treeZ, C.wood, 0, 0, -0.08);
    solid.cyl(0.28, 0.58, 3.8, 6, -0.30, treeY + 7.0, treeZ + 0.05, C.wood, 0, 0, 0.18);
    solid.box(1.18, 0.30, 0.20, 0, treeY + 3.15, treeZ + 0.67, C.dark, 0);
    for (let i = -2; i <= 2; i++) {
      solid.box(0.11, 0.34, 0.13, i * 0.21, treeY + 2.94, treeZ + 0.78, C.stone, 0, 0, i * 0.08);
    }
    for (const side of [-1, 1]) {
      solid.strut(side * 0.38, treeY + 1.1, treeZ, side * 1.65, treeY + 0.10,
        treeZ + side * 0.20, 0.17, 5, C.wood);
    }
    // branch-arms bend downward like elbows, then end in root-fingers
    for (const side of [-1, 1]) {
      encounter.strut(side * 0.35, 5.7, 0, side * 2.7, 4.4, 0.15, 0.23, 6, C.wood);
      encounter.strut(side * 2.7, 4.4, 0.15, side * 3.25, 2.0, 0.85, 0.16, 5, C.wood);
      for (let claw = -1; claw <= 1; claw++) {
        encounter.strut(side * 3.25, 2.0, 0.85, side * (3.65 + claw * 0.12), 1.25 + claw * 0.22,
          1.05 + claw * 0.34, 0.055, 4, C.dark);
      }
    }
    // an upside-down root crown: recognisably a tree from far away, wrong up close
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      encounter.strut(0, 8.1, 0, Math.cos(a) * (2.1 + (i & 1) * 0.7), 9.4 + (i % 3) * 0.65,
        Math.sin(a) * (1.7 + (i & 1) * 0.5), 0.13, 5, C.wood);
    }
    encounterPosition = { x: 0, y: treeY, z: treeZ };
    site.encounterX = api.wx(0, treeZ); site.encounterZ = api.wz(0, treeZ); site.encounterY = treeY;
    site.encounterStrikeX = api.wx(0, treeZ + 3.4);
    site.encounterStrikeZ = api.wz(0, treeZ + 3.4);
    // The stationary trunk is solid. The returning crown is an authored damage sweep, not
    // a moving wall that can pin the capsule against scenery or leave an invisible obstacle.
    api.emit({ kind: 'circle', x: 0, z: treeZ, r: 0.92, y0: treeY - 0.3, y1: treeY + 7.0, tag: 'wood', climbable: false });
    cache = cacheParts(api, 0.4, groundY(api, 0.4, -18.0), -18.0, 0.15);
    site.cacheX = api.wx(0.4, -18.0); site.cacheZ = api.wz(0.4, -18.0); site.cacheY = groundY(api, 0.4, -18.0);
  } else if (site.variant === 'car') {
    const yaw = r.range(-0.3, 0.3);
    const gy = api.padY;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const put = (x, z) => ({ x: x * cy + z * sy, z: -x * sy + z * cy });
    // The shell is visibly dead before interaction range: collapsed onto blocks, one axle
    // bare, bonnet vertical, engine exposed, roof caved and a door lying in the weeds.
    solid.box(4.3, 0.72, 1.85, 0, gy + 0.47, 0, C.rust, yaw, 0, r.range(-0.16, -0.08));
    solid.box(2.1, 0.62, 1.70, -0.25, gy + 1.08, 0, C.dark, yaw, 0, -0.20);
    const eng = put(1.35, 0);
    solid.box(1.05, 0.50, 1.30, eng.x, gy + 0.92, eng.z, C.metal, yaw, 0, -0.12);
    const hood = put(2.02, 0);
    solid.box(0.10, 1.35, 1.62, hood.x, gy + 1.45, hood.z, C.rust, yaw, 0, 0.22);
    // caved roof: two mismatched skins leave a deep black crease down the middle
    for (const side of [-1, 1]) {
      const roof = put(-0.35, side * 0.48);
      solid.box(1.9, 0.10, 0.72, roof.x, gy + 1.42 - (side > 0 ? 0.16 : 0), roof.z,
        C.rust, yaw, side * 0.22, side * -0.12);
    }
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1.5 : -1.5, sz = (i & 2) ? 0.85 : -0.85;
      const w = put(sx, sz);
      if (i === 1 || i === 2) continue;             // opposite wheels gone: not a usable car
      solid.tube(0.33, 0.33, 0.22, 8, w.x, gy + 0.24, w.z, C.dark, yaw, 0, Math.PI * 0.5);
    }
    for (const side of [-1, 1]) {
      const axle = put(side * 1.35, 0);
      solid.strut(axle.x, gy + 0.22, axle.z - 0.75, axle.x, gy + 0.22, axle.z + 0.75, 0.08, 6, C.metal);
    }
    const loose = put(0.5, 2.15);
    solid.tube(0.38, 0.38, 0.24, 9, loose.x, groundY(api, loose.x, loose.z) + 0.13, loose.z, C.dark);
    const door = put(-0.15, 1.75);
    solid.box(1.1, 0.08, 0.92, door.x, groundY(api, door.x, door.z) + 0.10, door.z, C.rust, yaw + 0.55, 0.1);
    api.emit({ kind: 'obb', x: 0, z: 0, halfX: 2.2, halfZ: 0.95, yaw, y0: gy - 0.2, y1: gy + 1.65, tag: 'vehicle' });
    if (site.cache) cache = cacheParts(api, -2.5, gy, 0.9, yaw);
    if (cache) { site.cacheX = api.wx(-2.5, 0.9); site.cacheZ = api.wz(-2.5, 0.9); site.cacheY = gy; }
  } else if (site.variant === 'drums') {
    const n = 6 + Math.floor(r.next() * 3);
    for (let i = 0; i < n; i++) {
      const lx = r.range(-3, 3), lz = r.range(-3, 3);
      const gy = groundY(api, lx, lz);
      const down = r.next() < 0.4;
      if (down) {
        const a = r.range(0, TAU);
        solid.cyl(0.29, 0.29, 0.88, 10, lx, gy + 0.29, lz, C.rust, a, 0, Math.PI * 0.5);
        api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.44, halfZ: 0.29, yaw: a, y0: gy - 0.2, y1: gy + 0.58, tag: 'metal', standable: true });
      } else {
        solid.cyl(0.29, 0.29, 0.88, 10, lx, gy + 0.44, lz, i % 3 ? C.rust : C.metal, 0, r.range(-0.06, 0.06), r.range(-0.06, 0.06));
        api.emit({ kind: 'circle', x: lx, z: lz, r: 0.32, y0: gy - 0.2, y1: gy + 0.88, tag: 'metal', standable: true });
      }
    }
    // a pallet and the tarp that blew off it
    solid.box(1.2, 0.12, 1.0, 1.2, groundY(api, 1.2, -2.4) + 0.06, -2.4, C.wood, r.range(0, TAU));
    solid.quad(2.2, 1.6, -2.2, groundY(api, -2.2, 2.6) + 0.04, 2.6, C.slate, r.range(0, TAU), -Math.PI * 0.5 + 0.08);
    if (site.cache) cache = cacheParts(api, 1.2, groundY(api, 1.2, -2.4) + 0.12, -2.4, 0.2);
    if (cache) { site.cacheX = api.wx(1.2, -2.4); site.cacheZ = api.wz(1.2, -2.4); site.cacheY = groundY(api, 1.2, -2.4) + 0.12; }
  } else {
    // the fallen tree: a 10 m trunk held clear of a hollow on its root ball and a rock,
    // its top under STEP_UP at both halves so it is a bridge you walk along
    const L = 10, rr = 0.30;
    const gA = groundY(api, -L * 0.5, 0), gB = groundY(api, L * 0.5, 0), gC = api.padY;
    const yA = Math.max(gA, gC) + 0.25, yB = Math.max(gB, gC) + 0.25;
    solid.strut(-L * 0.5 - 0.5, yA, 0, L * 0.5 + 0.4, yB, 0, rr, 8, C.wood);
    // the root ball
    solid.cyl(1.4, 1.1, 0.5, 9, -L * 0.5 - 0.6, yA, 0, C.soil, 0, 0, Math.PI * 0.5);
    for (let i = 0; i < 7; i++) {
      solid.strut(-L * 0.5 - 0.7, yA, 0, -L * 0.5 - 0.9 - r.range(0, 0.6), yA + r.range(-1.4, 1.5), r.range(-1.4, 1.4), 0.05, 4, C.wood);
    }
    api.emit({ kind: 'circle', x: -L * 0.5 - 0.6, z: 0, r: 1.35, y0: yA - 1.4, y1: yA + 1.4, tag: 'wood' });
    // the rock under the far end
    solid.at(new THREE.IcosahedronGeometry(0.9, 1).scale(1, 0.7, 1), C.stone, L * 0.5 + 0.2, gB + 0.1, 0.4, r.range(0, TAU), 0, 0);
    api.emit({ kind: 'circle', x: L * 0.5 + 0.2, z: 0.4, r: 0.85, y0: gB - 0.5, y1: gB + 0.6, tag: 'stone', standable: true });
    // the bridge's two halves, each under STEP_UP over the ground at its own end
    const slope = (yB - yA) / L;
    for (let hh = -1; hh <= 1; hh += 2) {
      const cx = hh * L * 0.25;
      const top = (yA + yB) * 0.5 + slope * cx + rr;
      const gnd = groundY(api, cx, 0);
      api.emit({ kind: 'obb', x: cx, z: 0, halfX: L * 0.25, halfZ: rr, yaw: 0, y0: Math.min(gnd, top - 1.2), y1: Math.min(top, gnd + 0.58), tag: 'log', standable: true });
    }
    // broken branches, a couple standing in the hollow
    for (let i = 0; i < 5; i++) {
      const lx = r.range(-3, 3);
      solid.strut(lx, (yA + yB) * 0.5 + slope * lx + rr * 0.4, 0, lx + r.range(-0.8, 0.8), (yA + yB) * 0.5 + slope * lx + r.range(0.6, 1.8), r.range(-1.2, 1.2), 0.05, 4, C.wood);
    }
    if (site.cache) cache = cacheParts(api, 1.8, groundY(api, 1.8, -2.2), -2.2, 0.4);
    if (cache) { site.cacheX = api.wx(1.8, -2.2); site.cacheZ = api.wz(1.8, -2.2); site.cacheY = groundY(api, 1.8, -2.2); }
  }
  return { solid, glow, cache, encounter, encounterPosition };
}

/** CAMP / HOMESTEAD: shelters, an old barn, or the remains of a small farm. */
function buildCamp(api) {
  const site = api.site;
  const solid = new Kit(), glow = new Kit();
  const r = api.rng;
  let cache = null, event = null, eventPosition = null;
  if (site.variant === 'cabin') {
    const w = 2.2, d = 2.8, h = 2.5, t = 0.22;
    const gmin = Math.min(groundY(api, -w, -d), groundY(api, w, -d), groundY(api, -w, d), groundY(api, w, d), api.padY) - 0.4;
    const top = api.padY + h;
    const wall = (x, z, sw, sd) => {
      solid.box(sw, top - gmin, sd, x, (top + gmin) * 0.5, z, C.plank, 0);
      api.emit({ kind: 'obb', x, z, halfX: sw * 0.5, halfZ: sd * 0.5, yaw: 0, y0: gmin, y1: top, tag: 'wall' });
    };
    wall(0, d, w * 2, t);
    wall(-w, 0, t, d * 2);
    wall(w, 0, t, d * 2);
    const gap = 1.0, side = (w * 2 - gap) * 0.5;
    wall(-(gap + side) * 0.5, -d, side, t);
    wall((gap + side) * 0.5, -d, side, t);
    solid.box(gap + 0.2, 0.4, t, 0, top - 0.2, -d, C.plank, 0);        // lintel
    // log courses proud of every wall, so the cabin is built of something and not a box
    for (let c = 0; c < 6; c++) {
      const cy = api.padY + 0.25 + c * 0.42;
      solid.box(w * 2 + 0.3, 0.12, 0.08, 0, cy, d + t * 0.5, C.wood, 0);
      solid.box(0.08, 0.12, d * 2 + 0.3, -w - t * 0.5, cy, 0, C.wood, 0);
      solid.box(0.08, 0.12, d * 2 + 0.3, w + t * 0.5, cy, 0, C.wood, 0);
      solid.box(side, 0.12, 0.08, -(gap + side) * 0.5, cy, -d - t * 0.5, C.wood, 0);
      solid.box(side, 0.12, 0.08, (gap + side) * 0.5, cy, -d - t * 0.5, C.wood, 0);
    }
    solid.gable(w * 2 + 0.4, d * 2, top, 0.9, 0, 0, C.slate, 0);
    // a window on +X, dark
    solid.box(0.06, 0.7, 0.9, w + 0.02, api.padY + 1.5, 0.4, C.glass, 0);
    // the bunk and the table
    solid.box(0.9, 0.5, 2.0, -w + 0.6, api.padY + 0.25, 0.4, C.wood, 0);
    solid.box(0.85, 0.18, 1.9, -w + 0.6, api.padY + 0.58, 0.4, C.cloth, 0);
    api.emit({ kind: 'obb', x: -w + 0.6, z: 0.4, halfX: 0.45, halfZ: 1.0, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.66, tag: 'wood', standable: true });
    solid.box(0.9, 0.06, 0.6, w - 0.7, api.padY + 0.78, d - 0.6, C.wood, 0);
    solid.box(0.08, 0.76, 0.08, w - 0.7, api.padY + 0.38, d - 0.6, C.wood, 0);
    api.emit({ kind: 'obb', x: w - 0.7, z: d - 0.6, halfX: 0.45, halfZ: 0.3, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.8, tag: 'wood', standable: true });
    // a stove pipe and the woodpile outside
    solid.cyl(0.10, 0.10, 1.6, 6, w - 0.5, top + 0.9 + 0.6, 0.6, C.metal);
    for (let i = 0; i < 6; i++) {
      solid.cyl(0.10, 0.11, 0.9, 5, w + 0.6, groundY(api, w + 0.6, -1.5 + i * 0.3) + 0.12 + (i > 2 ? 0.2 : 0), -1.5 + (i % 3) * 0.32, C.wood, 0, 0, Math.PI * 0.5);
    }
    api.emit({ kind: 'obb', x: w + 0.6, z: -1.2, halfX: 0.5, halfZ: 0.6, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.5, tag: 'wood', standable: true });
    if (site.cache) cache = cacheParts(api, -w + 0.6, api.padY + 0.66, 1.2, 0);
    if (cache) { site.cacheX = api.wx(-w + 0.6, 1.2); site.cacheZ = api.wz(-w + 0.6, 1.2); site.cacheY = api.padY + 0.66; }
  } else if (site.variant === 'barn') {
    // A walk-in barn, broad opening toward the approach and no decorative staircase to
    // nowhere. The supply cache is visible through the doors, past a staged figure.
    const w = 4.1, d = 5.4, h = 4.25, t = 0.26;
    const gmin = Math.min(api.padY, groundY(api, -w, -d), groundY(api, w, -d), groundY(api, -w, d), groundY(api, w, d)) - 0.45;
    const top = api.padY + h;
    const wall = (x, z, sw, sd, col) => {
      solid.box(sw, top - gmin, sd, x, (top + gmin) * 0.5, z, col || C.plank, 0);
      api.emit({ kind: 'obb', x, z, halfX: sw * 0.5, halfZ: sd * 0.5, yaw: 0, y0: gmin, y1: top, tag: 'wall' });
    };
    wall(0, d, w * 2, t);
    wall(-w, 0, t, d * 2);
    wall(w, 0, t, d * 2);
    const gap = 2.8, sideW = (w * 2 - gap) * 0.5;
    wall(-(gap + sideW) * 0.5, -d, sideW, t);
    wall((gap + sideW) * 0.5, -d, sideW, t);
    solid.box(gap, 1.0, t, 0, top - 0.50, -d, C.wood);
    solid.gable(w * 2 + 0.6, d * 2 + 0.3, top, 1.85, 0, 0, C.slate, 0);
    // ribs and warped external courses keep it from reading as one big game-box
    for (let z = -4.0; z <= 4.0; z += 2.0) {
      solid.strut(-w - 0.10, api.padY + 0.15, z, -w - 0.10, top, z + 0.6, 0.065, 4, C.wood);
      solid.strut(w + 0.10, api.padY + 0.15, z + 0.4, w + 0.10, top, z - 0.4, 0.065, 4, C.wood);
    }
    // both doors hang visibly open: the invitation and the warning in the same silhouette
    const leftDoorY = groundY(api, -2.05, -6.0);
    solid.box(1.34, 3.35, 0.14, -2.05, leftDoorY + 1.68, -6.0, C.plank, -0.42);
    // The right leaf is separate: it slams on the first visit, so even the twelve barns
    // with no pool-backed figure still own a physical event.
    event = new Kit();
    event.box(1.34, 3.35, 0.14, -0.67, 1.68, 0, C.plank);
    event.strut(-1.22, 0.22, 0.09, -0.12, 3.08, 0.09, 0.055, 4, C.wood);
    eventPosition = { x: 2.72, y: groundY(api, 2.72, -5.42), z: -5.42, yaw: -1.02 };
    // hay bales / feed trough make an interior rather than an empty shell
    for (let i = 0; i < 5; i++) {
      const lx = i < 3 ? -2.85 : 2.75, lz = -0.5 + (i % 3) * 1.35;
      const by = groundY(api, lx, lz);
      solid.box(1.25, 0.72, 0.85, lx, by + 0.36, lz, REED, (i & 1) * 0.12);
      api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.63, halfZ: 0.43, yaw: 0, y0: by - 0.1, y1: by + 0.72, tag: 'wood', standable: true });
    }
    const troughY = groundY(api, 2.25, 3.2);
    solid.box(2.4, 0.55, 0.85, 2.25, troughY + 0.28, 3.2, C.wood);
    api.emit({ kind: 'obb', x: 2.25, z: 3.2, halfX: 1.2, halfZ: 0.43, yaw: 0, y0: troughY - 0.2, y1: troughY + 0.55, tag: 'wood', standable: true });
    site.eventX = api.wx(0, 2.0); site.eventZ = api.wz(0, 2.0); site.eventYaw = site.yaw + Math.PI;
    const cacheY = groundY(api, -0.7, 3.8);
    cache = cacheParts(api, -0.7, cacheY, 3.8, 0.12);
    site.cacheX = api.wx(-0.7, 3.8); site.cacheZ = api.wz(-0.7, 3.8); site.cacheY = cacheY;
  } else if (site.variant === 'farm') {
    // The farmhouse has failed inward and the paddock has gone to weeds, but the root
    // store is open. It reads as a whole abandoned holding, not a lone procedural hut.
    const w = 3.15, d = 3.8, t = 0.34;
    wallSeg(solid, api, -w, d, w, d, 2.8, t, C.stone);
    wallSeg(solid, api, -w, -d, -1.15, -d, 2.2, t, C.stone);
    wallSeg(solid, api, 1.15, -d, w, -d, 1.5, t, C.stone);
    wallSeg(solid, api, -w, -d, -w, d, 2.4, t, C.stone);
    wallSeg(solid, api, w, -d, w, 0.8, 1.1, t, C.stone);
    // half a roof, folded into the kitchen
    solid.box(4.8, 0.16, 4.2, -0.7, api.padY + 1.15, 0.9, C.slate, -0.15, 0, -0.38);
    solid.box(1.15, 4.7, 1.15, -2.25, api.padY + 2.0, 2.35, C.brick);
    api.emit({ kind: 'obb', x: -2.25, z: 2.35, halfX: 0.58, halfZ: 0.58, yaw: 0, y0: api.padY - 0.4, y1: api.padY + 4.4, tag: 'wall' });
    // paddock and crooked gate, open toward the field
    for (let i = 0; i < 6; i++) {
      const x = 5.2 + (i % 3) * 2.2, z = -3.8 + Math.floor(i / 3) * 7.6;
      const pg = groundY(api, x, z);
      solid.cyl(0.10, 0.13, 1.35, 5, x, pg + 0.56, z, C.wood, 0, 0, r.range(-0.12, 0.12));
      if (i % 3 < 2) solid.box(2.2, 0.09, 0.09, x + 1.1, pg + 0.75, z, C.wood, 0, 0, r.range(-0.08, 0.08));
    }
    solid.box(2.5, 0.10, 1.8, 5.5, groundY(api, 5.5, 0) + 0.75, 0, C.wood, 0, 0, 0.65);
    // hand pump and dead furrows carry the farm read across the clearing
    const py = groundY(api, -5.1, 1.0);
    solid.cyl(0.13, 0.16, 1.35, 7, -5.1, py + 0.67, 1.0, C.metal);
    solid.strut(-5.1, py + 1.15, 1.0, -4.35, py + 1.45, 1.0, 0.07, 5, C.metal);
    for (let i = -2; i <= 2; i++) {
      const x = i * 1.15;
      solid.quad(0.55, 7.0, x, groundY(api, x, 7.0) + 0.025, 7.0, C.soil, 0, -Math.PI * 0.5);
    }
    // A scarecrow twists nearly around on the first visit. It is separate from the merged
    // farm body for that motion, and deliberately carries no collider: it cannot snag a
    // fleeing player. The one pool-backed farm spawns its Hound beside, not inside, it.
    event = new Kit();
    event.strut(0, 0, 0, 0, 2.85, 0, 0.08, 6, C.wood);
    event.strut(-1.35, 2.05, 0, 1.35, 2.05, 0, 0.07, 5, C.wood);
    event.box(1.30, 1.10, 0.18, 0, 1.72, 0, C.cloth, 0, 0, 0.10);
    event.cyl(0.30, 0.26, 0.52, 8, 0, 2.62, 0, C.paper);
    event.cone(0.58, 0.42, 8, 0, 3.10, 0, C.slate);
    eventPosition = { x: 5.7, y: groundY(api, 5.7, 1.1), z: 1.1, yaw: -0.72 };
    site.eventX = api.wx(7.0, 1.2); site.eventZ = api.wz(7.0, 1.2); site.eventYaw = site.yaw - Math.PI * 0.5;
    cache = cacheParts(api, 1.4, groundY(api, 1.4, 2.6), 2.6, -0.2);
    site.cacheX = api.wx(1.4, 2.6); site.cacheZ = api.wz(1.4, 2.6); site.cacheY = groundY(api, 1.4, 2.6);
  } else {
    // the tent: an A-frame of dark canvas, a ridge pole, a cold ring of stones, a log
    const w = 1.3, len = 2.6, h = 1.5;
    const gy = api.padY;
    solid.strut(0, gy, -len * 0.5, 0, gy + h, -len * 0.5, 0.04, 4, C.wood);
    solid.strut(0, gy, len * 0.5, 0, gy + h, len * 0.5, 0.04, 4, C.wood);
    solid.strut(0, gy + h, -len * 0.5 - 0.2, 0, gy + h, len * 0.5 + 0.2, 0.03, 4, C.wood);
    const slope = Math.atan2(w, h), sl = Math.hypot(w, h);
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(sl, len + 0.3);
      g.rotateX(-Math.PI * 0.5);
      g.rotateZ(-s * (Math.PI * 0.5 - slope));
      g.translate(s * w * 0.5, gy + h * 0.5, 0);
      solid.push(g, C.slate);
    }
    api.emit({ kind: 'obb', x: 0, z: 0, halfX: w, halfZ: len * 0.5, yaw: 0, y0: gy - 0.2, y1: gy + h, tag: 'cloth' });
    // the ring, cold, and the log seat
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, rr = 0.55;
      const lx = 2.4 + Math.cos(a) * rr, lz = Math.sin(a) * rr;
      const s = r.range(0.2, 0.32);
      solid.box(s, s * 0.7, s * 0.85, lx, groundY(api, lx, lz) + s * 0.3, lz, C.stone, r.range(0, TAU));
    }
    solid.cyl(0.4, 0.3, 0.12, 8, 2.4, groundY(api, 2.4, 0) + 0.04, 0, C.ash);
    api.emit({ kind: 'circle', x: 2.4, z: 0, r: 0.7, y0: gy - 0.2, y1: gy + 0.3, tag: 'stone', standable: true });
    const lg = groundY(api, 2.4, 1.6);
    solid.cyl(0.18, 0.2, 1.8, 7, 2.4, lg + 0.18, 1.6, C.wood, 0, 0, Math.PI * 0.5);
    api.emit({ kind: 'obb', x: 2.4, z: 1.6, halfX: 0.9, halfZ: 0.2, yaw: 0, y0: lg - 0.2, y1: lg + 0.38, tag: 'wood', standable: true });
    // a pack and a lantern that went out, hung on a stake
    solid.box(0.44, 0.36, 0.28, 3.4, groundY(api, 3.4, -0.9) + 0.18, -0.9, C.cloth, r.range(0, TAU));
    solid.strut(-1.9, gy, 1.0, -1.9, gy + 1.3, 1.0, 0.03, 4, C.wood);
    solid.box(0.18, 0.26, 0.18, -1.9, gy + 1.1, 1.0, C.metal, 0);
    if (site.cache) cache = cacheParts(api, -0.2, gy, len * 0.5 + 0.8, 0.2);
    if (cache) { site.cacheX = api.wx(-0.2, len * 0.5 + 0.8); site.cacheZ = api.wz(-0.2, len * 0.5 + 0.8); site.cacheY = gy; }
  }
  return { solid, glow, cache, event, eventPosition };
}

const BUILDERS = { tower: buildTower, stand: buildStand, ruin: buildRuin, wreck: buildWreck, camp: buildCamp };

/* ==========================================================================
   The system
   ========================================================================== */
export class Wilds {
  static id = 'wilds';

  constructor(ctx) {
    this.ctx = ctx;
    this.seed = (ctx && ctx.rng ? ctx.rng.fork('wilds').seed : 20260903) >>> 0;
    this.sites = null;              // planned lazily: flora asks padClear during the boot ring
    this._cellMap = new Map();      // planner cell number -> site, for padClear
    this._byChunk = new Map();      // chunk key -> [site]
    this.group = null;
    this.horizonGroup = null;
    this.matBody = null;
    this.matGlow = null;
    this.matHalo = null;
    this._built = false;
    this._flagsLoaded = false;
    this._horizon = [];             // the persistent lantern meshes
    this._towers = [];
    this._eventSites = [];           // fourteen authored movers; present() need not scan 114 sites
    this._encounterSite = null;
    this._notes = [];
    this._stats = { sites: 0, resident: 0, built: 0, disposed: 0, found: 0, climbed: 0, caches: 0, takes: 0, colliders: 0, events: 0, eventRefused: 0, encounters: 0, encounterCancelled: 0, treeHits: 0, treeMisses: 0 };
    this._t = 0;
    this._marchI = 0;
    this._unsubs = [];
    if (ctx && ctx.bus && ctx.bus.on) {
      // belt and braces: a site whose chunk is gone is gone, whatever the distance says
      const offChunk = ctx.bus.on('chunk:disposed', (p) => { if (p) this._chunkGone(String(p.id)); });
      // The car owns the crush calculation and already publishes this event. A cache is a
      // 12 kg wooden box: smashing it pays exactly the same once-only XP/ammo as opening it
      // on foot, instead of turning a useful prize into inert roadside debris.
      const offBroke = ctx.bus.on('world:broke', (p) => { if (p && p.tag === 'cache') this._brokenCache(p.x, p.z); });
      if (typeof offChunk === 'function') this._unsubs.push(offChunk);
      if (typeof offBroke === 'function') this._unsubs.push(offBroke);
    }
  }

  _note(s) { if (this._notes.length < 40) this._notes.push(s); }
  _sys(id) { const s = this.ctx && this.ctx.systems; return s && typeof s.get === 'function' ? s.get(id) : null; }

  async init() {
    this._ensurePlan();
    this._ensureBuilt();
  }

  /* ------------------------------------------------------------- the plan -- */
  _ensurePlan() {
    if (this.sites) return this.sites;
    const sites = planWilds(this.seed);
    this.sites = sites;
    this._cellMap.clear();
    this._byChunk.clear();
    this._towers.length = 0;
    this._eventSites.length = 0;
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      this._cellMap.set((s.cx + 1000) * 4096 + (s.cz + 1000), s);
      let arr = this._byChunk.get(s.chunk);
      if (!arr) { arr = []; this._byChunk.set(s.chunk, arr); }
      arr.push(s);
      if (s.kind === 'tower') this._towers.push(s);
      if (s.eventMode) this._eventSites.push(s);
      if (s.encounter) this._encounterSite = s;
    }
    this._stats.sites = sites.length;
    this._stats.caches = sites.filter((s) => s.cache).length;
    return sites;
  }

  /** flora's planting loop: true when (x, z) is inside a wild's pad and nothing may grow. */
  padClear(x, z) {
    const sites = this.sites || this._ensurePlan();
    void sites;
    const cell = W.cell;
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const s = this._cellMap.get((cx + dx + 1000) * 4096 + (cz + dz + 1000));
        if (!s) continue;
        const ex = x - s.x, ez = z - s.z;
        if (ex * ex + ez * ez < s.pad * s.pad) return true;
        if (s.pad2R > 0) {
          const fx = x - s.pad2X, fz = z - s.pad2Z;
          if (fx * fx + fz * fz < s.pad2R * s.pad2R) return true;
        }
      }
    }
    return false;
  }

  /* ------------------------------------------------------------ materials -- */
  _ensureBuilt() {
    if (this._built) return;
    this._built = true;
    // PARAMETER-IDENTICAL to places.js's place-body and place-glow, on purpose: three
    // keys a program on the material's parameters, so these share the two programs
    // places linked at boot and this lane links none. Measured in tests/wilds.mjs.
    this.matBody = new THREE.MeshLambertMaterial({
      vertexColors: true, dithering: true,
      side: THREE.DoubleSide, shadowSide: THREE.FrontSide,
    });
    this.matBody.name = 'wild-body';
    this.matGlow = new THREE.MeshBasicMaterial({
      vertexColors: true, fog: false, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.matGlow.name = 'wild-glow';
    // THE HALO: the same glow with its depth test OFF, so a lantern reads THROUGH the
    // canopy. MEASURED 2026-09-03 (tests/artifacts/probe-lantern.mjs): from a road point
    // 150 m from each of four towers the depth-tested lantern put 0 px on the screen with
    // the forest in and 122-133 px with it hidden - the canopy (15-18 m templates, elders
    // to 48-54 m) covers every sightline from the ground. With the flag off: 134-164 px,
    // and the program count did not move (a clone with one render-state flag shares the
    // program; places.js flips depthTest live under the same zero-programs law). It is
    // gated by distance (nothing X-rays a trunk you are standing beside) and by the
    // TERRAIN (terrain.marchRay: a hill still hides it - only the trees do not).
    this.matHalo = this.matGlow.clone();
    this.matHalo.depthTest = false;
    this.matHalo.name = 'wild-halo';
    const scene = this.ctx && this.ctx.scene;
    this.group = new THREE.Group();
    this.group.name = 'wilds';
    this.horizonGroup = new THREE.Group();
    this.horizonGroup.name = 'wilds-horizon';
    if (scene) { scene.add(this.group); scene.add(this.horizonGroup); }
    else this._note('ctx.scene missing at wilds init: nothing will be visible');

    // The horizon lanterns: the nearest W.horizonLanterns towers' lanterns, never
    // distance-culled - a glint on the glow material (fog:false), sized with distance so
    // it holds a few pixels from anywhere in the county. NOT a light: the census is 13.
    const k = new Kit();
    k.at(new THREE.OctahedronGeometry(0.22, 0), [1.7, 1.2, 0.66], 0, 0, 0, 0, 0, 0);
    k.pane(1.2, 1.2, 0, 0, 0, 1.0, 0, 0);
    k.pane(1.2, 1.2, 0, 0, 0, 1.0, Math.PI * 0.5, 0);
    k.pane(1.2, 1.2, 0, 0, 0, 1.0, Math.PI * 0.25, 0);
    k.pane(1.2, 1.2, 0, 0, 0, 1.0, -Math.PI * 0.25, 0);
    this._lanternGeo = k.build();
    for (let i = 0; i < W.horizonLanterns; i++) {
      const m = new THREE.Mesh(this._lanternGeo, this.matHalo);
      m.name = 'wild-lantern-horizon-' + i;
      m.frustumCulled = false;
      m.renderOrder = 4;
      m.visible = false;
      m.userData.site = null;
      this.horizonGroup.add(m);
      this._horizon.push(m);
    }
  }

  /* --------------------------------------------------------------- build -- */
  _apiFor(site, chunkId) {
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');
    const cy = Math.cos(site.yaw), sy = Math.sin(site.yaw);
    const ox = site.x, oz = site.z;
    const canCollide = !!(collision && typeof collision.addCollider === 'function');
    if (!canCollide) this._note('collision.addCollider missing: ' + site.id + ' is walk-through');
    const hAt = (terrain && terrain.heightAt) ? (x, z) => terrain.heightAt(x, z) : (x, z) => heightAt(x, z);
    const stats = this._stats;
    return {
      site,
      padY: site.y,
      yaw: site.yaw,
      rng: new Rng(((this.seed ^ (site.x * 7919 + site.z * 104729) | 0) >>> 0) || 3),
      heightAt: hAt,
      wx(lx, lz) { return ox + lx * cy + lz * sy; },
      wz(lx, lz) { return oz - lx * sy + lz * cy; },
      emit(shape) {
        if (!canCollide || !shape) return -1;
        const lx = +shape.x || 0, lz = +shape.z || 0;
        const w = {
          kind: shape.kind, tag: shape.tag, standable: shape.standable,
          // ROUND 7, lane F: the two opt-ins a builder has, carried through the frame
          // change. `breakable` is a mass in kg (or true, or false to opt a tagged shape
          // back out); `climbable: false` refuses the mantle a top it should never take.
          // A shape that says neither behaves exactly as it did.
          breakable: shape.breakable, climbable: shape.climbable,
          x: ox + lx * cy + lz * sy,
          z: oz - lx * sy + lz * cy,
          y0: shape.y0, y1: shape.y1,
        };
        if (shape.kind === 'obb') { w.halfX = shape.halfX; w.halfZ = shape.halfZ; w.yaw = (+shape.yaw || 0) + site.yaw; }
        else w.r = shape.r;
        const id = collision.addCollider(w, chunkId);
        if (id >= 0) stats.colliders++;
        return id;
      },
    };
  }

  _build(site) {
    if (site.rec) return site.rec;
    this._ensureBuilt();
    const B = BUILDERS[site.kind];
    if (!B) return null;
    const chunkId = 'wild:' + site.id;
    const api = this._apiFor(site, chunkId);
    let out = null;
    try { out = B(api); } catch (e) { this._note('wild ' + site.id + ' (' + site.variant + ') threw: ' + e.message); return null; }
    if (!out) return null;
    const g = new THREE.Group();
    g.name = 'wild-' + site.kind + '-' + site.id;
    g.position.set(site.x, 0, site.z);
    g.rotation.y = site.yaw;
    const solid = out.solid && !out.solid.empty() ? out.solid.build() : null;
    const glowGeo = out.glow && !out.glow.empty() ? out.glow.build() : null;
    let glow = null;
    if (solid) {
      const m = new THREE.Mesh(solid, this.matBody);
      m.name = 'wild-body-' + site.id;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    if (glowGeo) {
      glow = new THREE.Mesh(glowGeo, this.matGlow);
      glow.name = 'wild-glow-' + site.id;
      glow.renderOrder = 4;
      g.add(glow);
    }
    let halo = null;
    if (site.kind === 'tower' && site.lanternY > 0) {
      halo = new THREE.Mesh(this._lanternGeo, this.matHalo);
      halo.name = 'wild-halo-' + site.id;
      halo.position.set(0, site.lanternY, site.lanternLZ || 0);
      halo.frustumCulled = false;
      halo.renderOrder = 5;
      halo.visible = false;                 // _stepLanterns shows it past W.halo.from
      g.add(halo);
    }
    let cache = null;
    if (out.cache) {
      const c = out.cache;
      const holder = new THREE.Group();
      holder.position.set(c.lx, c.ly, c.lz);
      holder.rotation.y = c.ryaw;
      const body = new THREE.Mesh(c.body, this.matBody);
      body.name = 'wild-cache-' + site.id;
      body.castShadow = true; body.receiveShadow = true;
      const lid = new THREE.Mesh(c.lidGeo, this.matBody);
      lid.name = 'wild-cache-lid-' + site.id;
      lid.position.set(0, 0.42, -0.23);          // hinge at the back edge
      lid.castShadow = true;
      const glint = new THREE.Mesh(c.glintGeo, this.matGlow);
      glint.name = 'wild-cache-glint-' + site.id;
      glint.renderOrder = 4;
      holder.add(body); holder.add(lid); holder.add(glint);
      g.add(holder);
      cache = { holder, lid, glint, colliderId: c.colliderId };
      if (site.taken) { lid.rotation.x = -2.0; glint.visible = false; }
    }
    let event = null;
    if (out.event && !out.event.empty()) {
      const geo = out.event.build();
      event = new THREE.Mesh(geo, this.matBody);
      event.name = 'wild-event-' + site.eventMode + '-' + site.id;
      const ep = out.eventPosition || { x: 0, y: 0, z: 0, yaw: 0 };
      event.position.set(ep.x, ep.y, ep.z);
      event.rotation.y = ep.yaw || 0;
      event.castShadow = true; event.receiveShadow = true;
      g.add(event);
      site.eventBaseX = ep.x; site.eventBaseY = ep.y; site.eventBaseZ = ep.z;
      site.eventBaseYaw = ep.yaw || 0;
      if (site.eventDone) site.eventPrev = site.eventCurr = 1;
    }
    let encounter = null;
    if (out.encounter && !out.encounter.empty()) {
      const geo = out.encounter.build();
      encounter = new THREE.Mesh(geo, this.matBody);
      encounter.name = 'wild-false-tree-' + site.id;
      const ep = out.encounterPosition || { x: 0, y: 0, z: 0 };
      encounter.position.set(ep.x, ep.y, ep.z);
      encounter.castShadow = true; encounter.receiveShadow = true;
      g.add(encounter);
      site.encounterBaseX = ep.x; site.encounterBaseY = ep.y; site.encounterBaseZ = ep.z;
      if (site.encounterDone) {
        site.encounterPrev = site.encounterCurr = 1;
      }
    }
    this.group.add(g);
    site.rec = { group: g, glow, halo, cache, event, encounter, chunkId };
    this._stats.built++;
    this._stats.resident++;
    return site.rec;
  }

  _dispose(site) {
    const rec = site.rec;
    if (!rec) return;
    // Streaming must not finish a scare in an empty chunk. The visible crown, its attack
    // clock and bit 8 remain one lifecycle: an unresolved wind-up is re-armed at pose zero.
    if (site.encounterLive && !site.encounterDone) this._cancelEncounter(site);
    site.rec = null;
    this.group.remove(rec.group);
    rec.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    const collision = this._sys('collision');
    if (collision && typeof collision.removeChunk === 'function') collision.removeChunk(rec.chunkId);
    this._stats.disposed++;
    this._stats.resident--;
  }

  _chunkGone(key) {
    const arr = this._byChunk.get(key);
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) if (arr[i].rec) this._dispose(arr[i]);
  }

  /* ---------------------------------------------------------------- flags -- */
  _loadFlags() {
    if (this._flagsLoaded) return;
    const prog = this._sys('progress');
    if (!prog || typeof prog.flag !== 'function') return;
    this._flagsLoaded = true;
    const sites = this.sites;
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      const v = prog.flag(s.flagKey);
      if (typeof v !== 'number') continue;
      s.found = !!(v & 1); s.climbed = !!(v & 2); s.taken = !!(v & 4);
      s.encounterDone = !!(v & 8); s.eventDone = !!(v & 16);
      if (s.encounterDone) s.encounterPrev = s.encounterCurr = 1;
      if (s.eventDone) s.eventPrev = s.eventCurr = 1;
      if (s.found) this._stats.found++;
      if (s.climbed) this._stats.climbed++;
      if (s.taken) this._stats.takes++;
    }
  }

  _saveFlag(s) {
    const prog = this._sys('progress');
    if (!prog || typeof prog.flag !== 'function') return;
    prog.flag(s.flagKey, (s.found ? 1 : 0) | (s.climbed ? 2 : 0) | (s.taken ? 4 : 0)
      | (s.encounterDone ? 8 : 0) | (s.eventDone ? 16 : 0));
  }

  _xp(amount, x, y, z, reason) {
    _xpP.amount = amount; _xpP.x = x; _xpP.y = y; _xpP.z = z; _xpP.reason = reason;
    this.ctx.bus.emit('xp:gained', _xpP);
  }

  /* ----------------------------------------------------------------- step -- */
  step(dt) {
    if (!this.sites) this._ensurePlan();
    if (!this._built) this._ensureBuilt();
    if (!this._flagsLoaded) this._loadFlags();
    this._t += dt;
    const player = this._sys('player');
    if (!player || !player.pos) return;
    const collision = this._sys('collision');
    const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
    const sites = this.sites;
    const build2 = W.buildWithin * W.buildWithin;
    const drop2 = W.disposeBeyond * W.disposeBeyond;
    const found2 = W.foundR * W.foundR;
    const cache2 = W.cacheR * W.cacheR;
    const eventRearm2 = EVENT_REARM_R * EVENT_REARM_R;
    let budget = 1;           // one body a step: a build is a merge and a collider bake

    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      const dx = px - s.x, dz = pz - s.z;
      const d2 = dx * dx + dz * dz;
      s.d2 = d2;

      if (s.eventLive) this._advanceFarmEvent(s, dt);
      else if (s.eventRetry > 0) s.eventRetry = Math.max(0, s.eventRetry - dt);

      // residency
      if (!s.rec) {
        if (d2 < build2 && budget > 0) { this._build(s); budget--; }
      } else if (d2 > drop2) {
        this._dispose(s);
      }
      // The attack clock only runs while its rendered crown is resident. Chunk disposal
      // above cancels an unresolved wind-up; entering a car before the sweep does the same.
      if (s.encounterLive) {
        if (!s.rec) this._cancelEncounter(s);
        else if (!s.encounterDone && this.ctx.shared && this.ctx.shared.inCar) this._cancelEncounter(s);
        else this._advanceEncounter(s, dt);
      }
      if (s.eventMode && !s.eventDone) {
        if (d2 > eventRearm2) {
          s.eventAway = Math.min(EVENT_REARM_S, s.eventAway + dt);
          if (s.eventVisit && !s.eventLive && s.eventAway >= EVENT_REARM_S) {
            // A refusal budget belongs to one visit. Three seconds genuinely outside the
            // 34 m re-arm radius starts a new visit; merely feathering the 20 m trigger does
            // not. No flag is written and no body is spawned during this reset.
            s.eventVisit = false;
            s.eventTries = 0; s.eventRetry = 0; s.eventSpawned = false;
          }
        } else s.eventAway = 0;
      }
      if (d2 > found2) continue;

      // found: the first approach inside foundR, once per save
      if (!s.found) {
        s.found = true;
        this._stats.found++;
        this._saveFlag(s);
        _foundP.id = s.id;
        this.ctx.bus.emit('wild:found', _foundP);
        this._xp(W.xp.found, s.x, s.y + 1.5, s.z, 'wild');
      }
      if (!s.rec) continue;

      if (s.eventMode && !s.eventDone) {
        if (!s.eventVisit) {
          s.eventVisit = true;
          s.eventAway = 0;
          s.eventTries = 0; s.eventRetry = 0; s.eventSpawned = false;
        }
        if (!s.eventLive && s.eventRetry <= 0 && s.eventTries < EVENT_RETRY_MAX) this._tryFarmEvent(s);
      }
      if (s.encounter && !s.encounterDone && !s.encounterLive && !(this.ctx.shared && this.ctx.shared.inCar)) {
        const ex = px - s.encounterX, ez = pz - s.encounterZ;
        if (ex * ex + ez * ez < 7.2 * 7.2 && Math.abs(py - s.encounterY) < 4.0) this._startEncounter(s);
      }

      // climbed: the first time the feet stand on the platform top
      if (!s.climbed && s.topY > 0 && py >= s.topY - 0.10 && py <= s.topY + 1.2) {
        const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
        const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
        if (Math.abs(lx) <= s.platHalfX && Math.abs(lz) <= s.platHalfZ) {
          s.climbed = true;
          this._stats.climbed++;
          this._saveFlag(s);
          _climbP.id = s.id;
          this.ctx.bus.emit('wild:climbed', _climbP);
          this._xp(W.xp.climbed, s.x, s.topY + 1.0, s.z, 'climb');
        }
      }

      // the cache: taken by walking into it
      if (s.cache && !s.taken && s.rec.cache) {
        // `world:broke.tag` names the heaviest thing in a multi-prop impact. If a drum and
        // this box go together it may therefore say "drum"; the retired collider is the
        // authoritative fallback and still pays the cache on the following fixed step.
        if (s.rec.cache.colliderId >= 0 && collision && typeof collision.massOf === 'function'
          && collision.massOf(s.rec.cache.colliderId) < 0) { this._take(s); continue; }
        const cx = px - s.cacheX, cz = pz - s.cacheZ;
        if (cx * cx + cz * cz < cache2 && Math.abs(py - s.cacheY) < 1.6) this._take(s);
      }
    }

    this._stepLanterns(px, py, pz);
  }

  _take(s) {
    s.taken = true;
    this._stats.takes++;
    this._saveFlag(s);
    const c = s.rec && s.rec.cache;
    if (c) {
      c.lid.rotation.x = -2.0; c.glint.visible = false;
      const collision = this._sys('collision');
      if (c.colliderId >= 0 && collision && typeof collision.removeCollider === 'function') collision.removeCollider(c.colliderId);
      c.colliderId = -1;
    }
    _cacheP.id = s.id; _cacheP.x = s.cacheX; _cacheP.z = s.cacheZ;
    this.ctx.bus.emit('pickup:cache', _cacheP);
    this._xp(s.xp, s.cacheX, s.cacheY + 0.6, s.cacheZ, 'cache');
    _ammoP.n = s.ammo;
    this.ctx.bus.emit('pickup:ammo', _ammoP);
    // the box lights the hands that open it: a rover, borrowed, released by its own ttl
    const lights = this._sys('lights');
    if (lights && typeof lights.borrow === 'function') lights.borrow('cache', s.cacheX, s.cacheY + 0.7, s.cacheZ, GLOW.lamp, 34, 1.6);
  }

  _brokenCache(x, z) {
    const sites = this.sites;
    if (!sites) return;
    let best = null, bd = 2.6 * 2.6;
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      if (!s.cache || s.taken || !s.rec || !s.rec.cache) continue;
      const dx = x - s.cacheX, dz = z - s.cacheZ, d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = s; }
    }
    if (best) this._take(best);
  }

  _tryFarmEvent(s) {
    if (s.eventKind) {
      s.eventTries++;
      const enemies = this._sys('enemies');
      _farmSpawnOpts.yaw = s.eventYaw;
      const spawned = enemies && typeof enemies.spawn === 'function'
        ? enemies.spawn(s.eventKind, s.eventX, s.eventZ, _farmSpawnOpts) : null;
      if (!spawned) {
        // Three attempts, 2.5 s apart while the player remains in the place. Exhaustion is
        // session-local and NOT persisted: a full pool cannot silently consume the event.
        this._stats.eventRefused++;
        s.eventRetry = EVENT_RETRY_S;
        return;
      }
      s.eventSpawned = true;
    }
    s.eventLive = true;
    s.eventPrev = s.eventCurr = 0;
    this._stats.events++;
    const dread = this._sys('dread');
    if (dread && typeof dread.answer === 'function') {
      dread.answer(s.eventMode === 'door' ? 'door' : 'branch', s.eventX, s.y + 1.2, s.eventZ, 0.72);
    }
  }

  _advanceFarmEvent(s, dt) {
    s.eventPrev = s.eventCurr;
    s.eventCurr = Math.min(1, s.eventCurr + dt / (s.eventMode === 'door' ? 0.62 : 0.90));
    if (s.eventCurr < 1) return;
    s.eventLive = false;
    // The render frame may arrive with any interpolation alpha after the fixed-step mover
    // stops. Collapse the pair so a completed door/scarecrow cannot twitch forever between
    // its penultimate and final poses.
    s.eventPrev = s.eventCurr;
    // Pool-backed rows can reach this line only after spawn returned a real record.
    if (!s.eventKind || s.eventSpawned) {
      s.eventDone = true;
      this._saveFlag(s);
    }
  }

  _startEncounter(s) {
    s.encounterLive = true;
    s.encounterPrev = s.encounterCurr = 0;
    s.encounterHit = false;
    this._stats.encounters++;
    const dread = this._sys('dread');
    if (dread) {
      if (typeof dread.hush === 'function') dread.hush(1.15, s.encounterX, s.encounterZ);
      if (typeof dread.answer === 'function') dread.answer('branch', s.encounterX, s.encounterY + 4.0, s.encounterZ, 0.85);
    }
  }

  _cancelEncounter(s) {
    if (!s || !s.encounterLive || s.encounterDone) return;
    s.encounterLive = false;
    s.encounterHit = false;
    s.encounterPrev = s.encounterCurr = 0;
    this._stats.encounterCancelled++;
    const m = s.rec && s.rec.encounter;
    if (m) {
      m.position.set(s.encounterBaseX, s.encounterBaseY, s.encounterBaseZ);
      m.rotation.set(0, 0, 0);
    }
  }

  _advanceEncounter(s, dt) {
    s.encounterPrev = s.encounterCurr;
    s.encounterCurr = Math.min(1, s.encounterCurr + dt / TREE_ATTACK_S);
    if (!s.encounterHit && s.encounterCurr >= TREE_HIT_AT) this._resolveTreeAttack(s);
    if (!s.encounterLive) return;
    if (s.encounterCurr >= 1) {
      s.encounterLive = false;
      // As above, finished one-shot motion must have one final pose at every render alpha.
      s.encounterPrev = s.encounterCurr;
    }
  }

  _resolveTreeAttack(s) {
    // Getting behind a windscreen is a valid escape, not a way to spend the encounter. The
    // trigger stays unpersisted and is ready again once the player returns on foot.
    if (this.ctx.shared && this.ctx.shared.inCar) { this._cancelEncounter(s); return; }
    s.encounterHit = true;
    const dread = this._sys('dread');
    if (dread && typeof dread.answer === 'function') dread.answer('brush', s.encounterStrikeX, s.encounterY + 2.4, s.encounterStrikeZ, 1.0);
    const fx = this._sys('fx');
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.34);

    const p = this._sys('player');
    let landed = false;
    if (p && p.pos && typeof p.hurt === 'function' && !(this.ctx.shared && this.ctx.shared.inCar)) {
      let dx = p.pos.x - s.encounterStrikeX, dz = p.pos.z - s.encounterStrikeZ;
      const d = Math.hypot(dx, dz);
      if (d <= TREE_HIT_R && Math.abs(p.pos.y - s.encounterY) < 3.8) {
        if (d > 0.001) { dx /= d; dz /= d; }
        else { dx = Math.sin(s.yaw); dz = Math.cos(s.yaw); }
        _treeHitDir.set(dx, 0, dz);
        const hpBefore = typeof p.hp === 'number' ? p.hp : Infinity;
        p.hurt(TREE_DAMAGE, _treeHitDir);
        landed = typeof p.hp !== 'number' || p.hp < hpBefore;
        if (landed && p.vel) {
          p.vel.x = dx * TREE_PUSH_H; p.vel.z = dz * TREE_PUSH_H;
          p.vel.y = Math.max(p.vel.y || 0, TREE_PUSH_UP);
          if (p.grounded) { p.grounded = false; if (typeof p.sinceGround === 'number') p.sinceGround = 0; }
          if (p.sliding) p.sliding = false;
        }
      }
    }
    if (landed) this._stats.treeHits++; else this._stats.treeMisses++;
    // Completion belongs to the resolved sweep, never the proximity trigger. Quitting or
    // streaming out during the wind-up leaves bit 8 clear and the encounter can happen.
    s.encounterDone = true;
    this._saveFlag(s);
  }

  /** The lanterns as reads. Every step: one tower's sightline is marched against the
   *  terrain (round-robin, so 13 towers cost one march a step), a resident tower's halo is
   *  shown past W.halo.from and scaled up to W.halo.full and with distance, and the nearest
   *  W.horizonLanterns towers that are NOT resident get a persistent glint at their
   *  lantern's world position, scaled with distance so it holds a few px. A hill hides
   *  both; the trees hide neither (the halo material has no depth test: _ensureBuilt). */
  _stepLanterns(px, py, pz) {
    const T = this._towers, H = this._horizon, Wh = W.halo;
    const terrain = this._sys('terrain');
    const canMarch = !!(terrain && typeof terrain.marchRay === 'function');
    const ey = py + CFG.player.EYE;
    if (T.length) {
      const t = T[this._marchI % T.length];
      this._marchI = (this._marchI + 1) % 1048576;
      const lx = t.rec ? t.lanternX : t.x, lz = t.rec ? t.lanternZ : t.z;
      const ly = t.lanternY > 0 ? t.lanternY : t.y + t.flights * FLIGHT_RISE + 4.35;
      const dx = lx - px, dy = ly - ey, dz = lz - pz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let hill = false;
      if (canMarch && d > 12) {
        const hit = terrain.marchRay(px, ey, pz, dx / d, dy / d, dz / d, d - 8);
        hill = typeof hit === 'number' && hit > 0.5 && hit < d - 8;
      }
      t.hill = hill;
    }
    for (let i = 0; i < T.length; i++) {
      const t = T[i];
      const halo = t.rec && t.rec.halo;
      if (!halo) continue;
      const d = Math.sqrt(t.d2);
      const k = clamp((d - Wh.from) / (Wh.full - Wh.from), 0, 1);
      if (k <= 0 || t.hill) { halo.visible = false; continue; }
      const sc = k * Math.max(1, d / Wh.scaleAt);
      halo.scale.set(sc, sc, sc);
      halo.visible = true;
    }
    for (let k = 0; k < H.length; k++) {
      let best = null, bd = Infinity;
      for (let i = 0; i < T.length; i++) {
        const t = T[i];
        if (t.rec) continue;                              // the built body carries its own lantern
        let used = false;
        for (let j = 0; j < k; j++) if (H[j].userData.site === t) { used = true; break; }
        if (used) continue;
        if (t.d2 < bd) { bd = t.d2; best = t; }
      }
      const m = H[k];
      m.userData.site = best;
      if (!best || best.hill) { m.visible = false; continue; }
      const ly = best.lanternY > 0 ? best.lanternY : best.y + best.flights * FLIGHT_RISE + 4.35;
      const d = Math.sqrt(bd);
      const sc = Math.max(1, d / Wh.scaleAt);
      // CFG.render.far is 900 m and a tower 1.1 km off is past it (MEASURED: 0 px at
      // 1110 m, the mesh clipped). A glint is a point: it is drawn on its own sightline
      // inside the far plane, shrunk by the same ratio so its angular size is unchanged.
      const dx = best.x - px, dy = ly - ey, dz = best.z - pz;
      const d3 = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const maxD = CFG.render.far * 0.92;
      const kk = d3 > maxD ? maxD / d3 : 1;
      m.position.set(px + dx * kk, ey + dy * kk, pz + dz * kk);
      m.scale.set(sc * kk, sc * kk, sc * kk);
      m.visible = true;
    }
  }

  present(alpha) {
    const sites = this._eventSites;
    const a = clamp01(alpha);
    if (sites) {
      for (let i = 0; i < sites.length; i++) {
        const e = sites[i], m = e.rec && e.rec.event;
        if (!m) continue;
        const q0 = lerp(e.eventPrev, e.eventCurr, a);
        const q = q0 * q0 * (3 - 2 * q0);
        m.position.set(e.eventBaseX, e.eventBaseY, e.eventBaseZ);
        if (e.eventMode === 'door') {
          m.rotation.y = e.eventBaseYaw + 1.02 * q;
          m.rotation.z = -0.035 * Math.sin(q * Math.PI);
        } else {
          m.rotation.y = e.eventBaseYaw + 2.65 * q;
          m.rotation.z = 0.14 * Math.sin(q * Math.PI);
        }
      }
    }
    const s = this._encounterSite;
    const m = s && s.rec && s.rec.encounter;
    if (!m) return;
    const k0 = lerp(s.encounterPrev, s.encounterCurr, a);
    const k = k0 * k0 * (3 - 2 * k0);
    const sweep = Math.sin(k * Math.PI);
    m.position.set(s.encounterBaseX, s.encounterBaseY, s.encounterBaseZ + 3.4 * sweep);
    m.rotation.x = -0.42 * sweep;
    m.rotation.z = 0.07 * sweep;
  }

  /* ------------------------------------------------------------ interface -- */
  /** lane G's map. Allocates: for the pause card, never for a step. */
  list() {
    const sites = this.sites || this._ensurePlan();
    const out = new Array(sites.length);
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      out[i] = { id: s.id, kind: s.kind, x: s.x, z: s.z, found: s.found, climbed: s.climbed };
    }
    return out;
  }

  /** Everything a test wants to know about a site, by id. */
  site(id) {
    const sites = this.sites || this._ensurePlan();
    for (let i = 0; i < sites.length; i++) if (sites[i].id === id) return sites[i];
    return null;
  }

  /** World waypoints that climb a tower or a stand: the ground at the stair's foot, each
   *  landing, and the platform. null for a kind with nothing to climb, or before its body
   *  has been built (the route is laid by the builder). */
  climbRoute(id) {
    const s = this.site(id);
    if (!s || !s.route) return null;
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    return s.route.map((p) => ({ x: s.x + p.x * cy + p.z * sy, z: s.z - p.x * sy + p.z * cy, y: p.y }));
  }

  /** Build one site's body now, whatever the distance. For the audit. */
  buildNow(id) { const s = this.site(id); return s ? !!this._build(s) : false; }
  disposeNow(id) { const s = this.site(id); if (s) this._dispose(s); }

  stats() { return this._stats; }
  notes() { return this._notes; }

  state() {
    return {
      sites: this.sites ? this.sites.length : 0, resident: this._stats.resident,
      found: this._stats.found, climbed: this._stats.climbed, takes: this._stats.takes,
    };
  }

  ready() {
    this._ensurePlan();
    return !!(this.sites && this.sites.length > 0 && this.group && this.matBody);
  }

  dispose() {
    for (let i = 0; i < this._unsubs.length; i++) this._unsubs[i]();
    this._unsubs.length = 0;
    if (this.sites) for (const s of this.sites) this._dispose(s);
    for (const m of this._horizon) this.horizonGroup.remove(m);
    this._horizon.length = 0;
    if (this._lanternGeo) { this._lanternGeo.dispose(); this._lanternGeo = null; }
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    if (this.horizonGroup && this.horizonGroup.parent) this.horizonGroup.parent.remove(this.horizonGroup);
    if (this.matBody) { this.matBody.dispose(); this.matBody = null; }
    if (this.matGlow) { this.matGlow.dispose(); this.matGlow = null; }
    if (this.matHalo) { this.matHalo.dispose(); this.matHalo = null; }
    this._built = false;
  }
}

export default Wilds;
