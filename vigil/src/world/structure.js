// The relay — VIGIL's hero structure and orientation compass. One parametric
// CFG drives the visible geometry, the colliders, and the ground layers, so
// the structure IS its collision (Eclipse's relay lesson). The original 9 m
// relay deck keeps its broad horde ramps; a guarded analytic helix now carries
// that movement law to an 18 m lunar observation ring.

import * as THREE from 'three';
import { TAU, clamp01, lerp, smoothstep } from '../engine/math.js';
import { batchStaticMeshes } from '../gfx/geometry.js';
import { createLunarSurface, createMetalSurface } from '../gfx/surfaces.js';

export const CFG = {
  floorY: 0.40,        // circular floor plate over the flattened bowl
  floorR: 15.5,
  deckY: 9.0,
  deckIn: 4.6,
  deckOut: 13.0,
  coreR: 4.2,          // central shaft, floor -> above deck
  columnR: 17.0,       // outer column ring (under-deck arcade)
  columns: 10,
  pylonR: 5.9,
  pylons: 6,
  rampW: 7.0,          // two straight ramps along +X / -X
  rampFoot: 26.0,      // ground end (x = rampFoot), sits on the flat bowl
  rampHead: 12.4,      // deck end   (x = rampHead), under the deck lip
  rampFootY: 0.30,     // the flat bowl height — the ramp MEETS the ground
  railH: 1.05,         // rail height above the ramp surface
  upperY: 18.0,        // third-floor lunar observation ring
  upperIn: 10.25,      // atrium lip; also the outside of the spiral
  upperOut: 22.0,
  upperRailH: 0.96,
  spiralInner: 6.65,   // clears the existing 5.9 m pylon ring
  spiralOuter: 10.25,
  spiralRailH: 1.12,
  spiralRailR: 0.15,
  spiralGap: Math.PI * 46 / 180,       // distinct bottom/top landings
  spiralGapCenter: Math.PI / 2,        // the opening faces the player start
  spiralLandingFrac: 0.055,
  spiralSegments: 64,
  beamTop: 46,
};

CFG.spiralStartA = CFG.spiralGapCenter + CFG.spiralGap / 2;
CFG.spiralSpan = TAU - CFG.spiralGap;
CFG.spiralEndA = CFG.spiralStartA + CFG.spiralSpan;
CFG.spiralMid = (CFG.spiralInner + CFG.spiralOuter) / 2;
CFG.spiralLowerT = CFG.spiralLandingFrac * 0.5;
CFG.spiralUpperT = 1 - CFG.spiralLandingFrac * 0.5;
CFG.spiralLowerA = CFG.spiralStartA + CFG.spiralSpan * CFG.spiralLowerT;
CFG.spiralUpperA = CFG.spiralStartA + CFG.spiralSpan * CFG.spiralUpperT;

const wrapPositive = (a) => ((a % TAU) + TAU) % TAU;

/** Progress around the authored helix, or null in its central seam gap. */
export function spiralProgress(x, z) {
  const d = Math.hypot(x, z);
  if (d < CFG.spiralInner || d > CFG.spiralOuter) return null;
  const rel = wrapPositive(Math.atan2(z, x) - CFG.spiralStartA);
  if (rel > CFG.spiralSpan + 1e-6) return null;
  return clamp01(rel / CFG.spiralSpan);
}

function spiralRiseAt(t) {
  const q = clamp01((t - CFG.spiralLandingFrac) / (1 - CFG.spiralLandingFrac * 2));
  // Ease only the vertical rise: the first/last few metres are calm landings,
  // while the route remains a single ordered arc with no 0/2π overlap.
  const eased = q * q * (3 - 2 * q);
  return lerp(CFG.deckY, CFG.upperY, eased);
}

/** Shared analytic stair height. Mesh, player, enemies and shots use this. */
export function spiralHeight(x, z) {
  const t = spiralProgress(x, z);
  return t === null ? null : spiralRiseAt(t);
}

export function onSpiral(x, z, y = null, tolerance = 0.95) {
  const h = spiralHeight(x, z);
  if (h === null) return false;
  // The helix overlaps the second-floor annulus in X/Z. Callers that own a
  // body height must pass it so a fighter beneath the stair is not mistaken
  // for one standing on the flight.
  return !Number.isFinite(y) || Math.abs(y - h) <= tolerance;
}

const UPPER_CRATERS = [
  { x: -14.8, z: -4.4, r: 3.4, depth: 0.24 },
  { x: 13.2, z: -9.0, r: 2.7, depth: 0.19 },
  { x: 7.0, z: 16.1, r: 2.2, depth: 0.16 },
  { x: -9.4, z: 14.0, r: 1.7, depth: 0.13 },
];

/** Slight, deterministic lunar relief. Both ring edges and the stair exit stay
 * flat, so the manufactured opening never develops a collision lip. */
export function upperSurfaceHeight(x, z) {
  const d = Math.hypot(x, z);
  if (d < CFG.upperIn || d > CFG.upperOut) return null;
  const innerBlend = smoothstep(CFG.upperIn + 2.2, CFG.upperIn + 4.8, d);
  const outerBlend = 1 - smoothstep(CFG.upperOut - 2.6, CFG.upperOut - 0.55, d);
  const reliefBlend = innerBlend * outerBlend;
  let relief = Math.sin(x * 0.34 + z * 0.11) * 0.032
    + Math.sin(z * 0.47 - x * 0.08) * 0.024;
  for (const c of UPPER_CRATERS) {
    const cd = Math.hypot(x - c.x, z - c.z);
    if (cd >= c.r) continue;
    const t = cd / c.r;
    const bowl = (1 - t * t) * (1 - t * t);
    const rim = Math.exp(-(((t - 0.82) / 0.11) ** 2)) * c.depth * 0.24;
    relief += -c.depth * bowl + rim;
  }
  return CFG.upperY + relief * reliefBlend;
}

/** Stable three-tier classifier. Mid-ramp/helix commitment remains route-owned. */
export function tierForY(y) {
  if (y > CFG.upperY - 1.45) return 2;
  if (y > CFG.deckY - 1.5) return 1;
  return 0;
}

const spiralPoint = (t, radius = CFG.spiralMid) => {
  const a = CFG.spiralStartA + CFG.spiralSpan * t;
  return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, y: spiralRiseAt(t), t };
};

const SPIRAL_ROUTE = (() => {
  const out = [];
  const apronR = CFG.spiralOuter + 1.35;
  const lowerA = CFG.spiralLowerA;
  out.push({ x: Math.cos(lowerA) * apronR, z: Math.sin(lowerA) * apronR, y: CFG.deckY, t: -0.04, landing: 'lower-apron' });
  const points = 30;
  for (let i = 0; i <= points; i++) {
    const t = lerp(CFG.spiralLowerT, CFG.spiralUpperT, i / points);
    out.push(spiralPoint(t));
  }
  const upperA = CFG.spiralUpperA;
  out.push({ x: Math.cos(upperA) * apronR, z: Math.sin(upperA) * apronR, y: CFG.upperY, t: 1.04, landing: 'upper-apron' });
  return out;
})();

/** Ordered, deterministic centreline. Down uses the exact reverse route. */
export function spiralWaypoints(direction = 'up') {
  const source = direction === 'down' ? [...SPIRAL_ROUTE].reverse() : SPIRAL_ROUTE;
  return source.map(p => ({ ...p }));
}

/* -------- Eclipse's two-hue palette, with a generated physical finish ----- */

function materials() {
  const surface = createMetalSurface(0x51a7b3);
  const lunar = createLunarSurface(0x18a71);
  // This seed owns a separate cached surface, so its platform-scale repeat
  // cannot alter the terrain material's much larger 420 m projection.
  lunar.color.repeat.set(12, 12);
  lunar.bump.repeat.set(12, 12);
  lunar.roughness.repeat.set(12, 12);
  const finish = (bumpScale) => ({
    map: surface.color,
    bumpMap: surface.bump,
    bumpScale,
    roughnessMap: surface.roughness,
    envMapIntensity: 0.82,
  });
  return {
    floor: new THREE.MeshStandardMaterial({ ...finish(0.055), color: 0x9daabb, roughness: 0.54, metalness: 0.58, emissive: 0x08162b, emissiveIntensity: 0.23 }),
    deck: new THREE.MeshStandardMaterial({ ...finish(0.045), color: 0x8495aa, roughness: 0.57, metalness: 0.49, side: THREE.DoubleSide }),
    darkMetal: new THREE.MeshStandardMaterial({ ...finish(0.038), color: 0x1d293d, roughness: 0.67, metalness: 0.53, emissive: 0x07101d, emissiveIntensity: 0.22 }),
    panelMetal: new THREE.MeshStandardMaterial({ ...finish(0.046), color: 0x30425c, roughness: 0.59, metalness: 0.49, emissive: 0x08152a, emissiveIntensity: 0.16 }),
    cyanTrim: new THREE.MeshStandardMaterial({ ...finish(0.018), color: 0x152c40, roughness: 0.30, metalness: 0.63, emissive: 0x35dfff, emissiveIntensity: 1.28 }),
    violetTrim: new THREE.MeshStandardMaterial({ ...finish(0.018), color: 0x211738, roughness: 0.31, metalness: 0.59, emissive: 0x896dff, emissiveIntensity: 1.05 }),
    lunar: new THREE.MeshStandardMaterial({
      map: lunar.color,
      bumpMap: lunar.bump,
      bumpScale: 0.14,
      roughnessMap: lunar.roughness,
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0.05,
      envMapIntensity: 0.58,
    }),
    beam: new THREE.MeshBasicMaterial({ color: 0x68ddff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  };
}

function makeUpperRingGeometry() {
  const angular = 112, radial = 18;
  const positions = [], uvs = [], colors = [], indices = [];
  const cold = new THREE.Color(0x788393), pale = new THREE.Color(0xaab2bd), tint = new THREE.Color();
  for (let j = 0; j <= radial; j++) {
    const r = lerp(CFG.upperIn, CFG.upperOut, j / radial);
    for (let i = 0; i <= angular; i++) {
      const a = (i / angular) * TAU;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = upperSurfaceHeight(x, z);
      positions.push(x, y, z);
      uvs.push(x / (CFG.upperOut * 2) + 0.5, z / (CFG.upperOut * 2) + 0.5);
      const light = clamp01(0.44 + (y - CFG.upperY) * 1.6 + Math.sin(x * 0.23 - z * 0.17) * 0.10);
      tint.copy(cold).lerp(pale, light);
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  const row = angular + 1;
  for (let j = 0; j < radial; j++) {
    for (let i = 0; i < angular; i++) {
      const a = j * row + i, b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeSpiralRibbonGeometry(yOffset = 0, reverse = false) {
  const positions = [], uvs = [], indices = [];
  const segments = CFG.spiralSegments;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = CFG.spiralStartA + CFG.spiralSpan * t;
    const y = spiralRiseAt(t) + yOffset;
    for (const r of [CFG.spiralInner, CFG.spiralOuter]) {
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
      uvs.push(t * 7.5, r === CFG.spiralInner ? 0 : 1);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 2;
    if (reverse) indices.push(a, a + 1, b, b, a + 1, b + 1);
    else indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeSpiralSideGeometry(radius, reverse = false) {
  const positions = [], uvs = [], indices = [];
  const segments = CFG.spiralSegments;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = CFG.spiralStartA + CFG.spiralSpan * t;
    const y = spiralRiseAt(t);
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    positions.push(x, y, z, x, y - 0.32, z);
    uvs.push(t * 8, 1, t * 8, 0);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 2;
    if (reverse) indices.push(a, a + 1, b, b, a + 1, b + 1);
    else indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ramp height along its run, or null when (x,z) is off this ramp.
   sign +1 = the +X ramp, -1 = the -X ramp.
   t = 0 at the FOOT (ground, far from centre), 1 at the HEAD (deck, near
   centre): the ramp climbs TOWARD the tower. The visible mesh must be
   rotated -sign*slope to match this — getting that sign backwards is what
   made the first build's ramps un-walkable and back-to-front. */
function rampHeight(x, z, sign) {
  const lx = x * sign;
  if (Math.abs(z) > CFG.rampW / 2) return null;
  if (lx < CFG.rampHead || lx > CFG.rampFoot) return null;
  const t = (CFG.rampFoot - lx) / (CFG.rampFoot - CFG.rampHead);
  return CFG.rampFootY + (CFG.deckY - CFG.rampFootY) * t;
}

/**
 * Public: the walkable centreline of a ramp, for enemy routing.
 * `foot` sits OUTSIDE the rail mouth on purpose — the rails are solid, so a
 * body must come around to the opening rather than grind against the side.
 */
export function rampWaypoints(sign) {
  return {
    foot: { x: sign * (CFG.rampFoot + 2.4), z: 0 },
    head: { x: sign * (CFG.rampHead + 0.6), z: 0 },
  };
}
/** Is (x,z) inside a ramp corridor? Returns the sign, or 0. */
export function onRamp(x, z) {
  if (Math.abs(z) > CFG.rampW / 2) return 0;
  const ax = Math.abs(x);
  if (ax < CFG.rampHead - 0.5 || ax > CFG.rampFoot + 1.0) return 0;
  return x >= 0 ? 1 : -1;
}

/**
 * Structure ground layers for groundAt: returns the highest structure surface
 * at (x,z), or null. Caller applies the one-way platform grace.
 */
export function structureSurfaces(x, z) {
  const d = Math.hypot(x, z);
  const out = [];
  if (d < CFG.floorR) out.push(CFG.floorY);
  if (d >= CFG.deckIn && d <= CFG.deckOut) out.push(CFG.deckY);
  const ra = rampHeight(x, z, 1);
  if (ra !== null) out.push(ra);
  const rb = rampHeight(x, z, -1);
  if (rb !== null) out.push(rb);
  const spiral = spiralHeight(x, z);
  if (spiral !== null) out.push(spiral);
  const upper = upperSurfaceHeight(x, z);
  if (upper !== null) out.push(upper);
  return out.length ? out : null;
}

/**
 * Highest manufactured walkable surface no higher than `maxY`.
 *
 * `groundAt()` is a per-body/per-frame query. Keeping its normal path scalar
 * avoids allocating the temporary array returned by the public inventory
 * helper above, especially while a full pack is traversing both ramps.
 */
export function structureGroundHeight(x, z, maxY = Infinity) {
  const d = Math.hypot(x, z);
  let best = -Infinity;
  if (d < CFG.floorR && CFG.floorY <= maxY) best = CFG.floorY;
  if (d >= CFG.deckIn && d <= CFG.deckOut && CFG.deckY <= maxY) best = Math.max(best, CFG.deckY);
  const ra = rampHeight(x, z, 1);
  if (ra !== null && ra <= maxY) best = Math.max(best, ra);
  const rb = rampHeight(x, z, -1);
  if (rb !== null && rb <= maxY) best = Math.max(best, rb);
  const spiral = spiralHeight(x, z);
  if (spiral !== null && spiral <= maxY) best = Math.max(best, spiral);
  const upper = upperSurfaceHeight(x, z);
  if (upper !== null && upper <= maxY) best = Math.max(best, upper);
  return best;
}

/* Bullets and siege-moon rounds see the manufactured floors as physical
 * slabs, not as the player's one-way ground selector. A point-mask lets the
 * ray marcher detect top, underside, and skirt entry with no arrays or
 * per-sample objects. The visible meshes own these exact thicknesses. */
const STRUCTURE_RAY_RADIUS = CFG.rampFoot + 0.75;
const STRUCTURE_RAY_STEP = 0.10;
const STRUCTURE_SLAB_EPS = 0.010;

function structureSlabMask(x, y, z) {
  const d = Math.hypot(x, z);
  let mask = 0;
  if (d < CFG.floorR
      && y >= CFG.floorY - 0.40 - STRUCTURE_SLAB_EPS
      && y <= CFG.floorY + STRUCTURE_SLAB_EPS) mask |= 1;
  if (d >= CFG.deckIn && d <= CFG.deckOut
      && y >= CFG.deckY - 0.55 - STRUCTURE_SLAB_EPS
      && y <= CFG.deckY + STRUCTURE_SLAB_EPS) mask |= 2;
  const ra = rampHeight(x, z, 1);
  if (ra !== null
      && y >= ra - 0.36 - STRUCTURE_SLAB_EPS
      && y <= ra + STRUCTURE_SLAB_EPS) mask |= 4;
  const rb = rampHeight(x, z, -1);
  if (rb !== null
      && y >= rb - 0.36 - STRUCTURE_SLAB_EPS
      && y <= rb + STRUCTURE_SLAB_EPS) mask |= 8;
  const spiral = spiralHeight(x, z);
  if (spiral !== null
      && y >= spiral - 0.32 - STRUCTURE_SLAB_EPS
      && y <= spiral + STRUCTURE_SLAB_EPS) mask |= 16;
  const upper = upperSurfaceHeight(x, z);
  if (upper !== null
      && y >= CFG.upperY - 0.50 - STRUCTURE_SLAB_EPS
      && y <= upper + STRUCTURE_SLAB_EPS) mask |= 32;
  return mask;
}

/**
 * First ray contact with a manufactured floor slab, or Infinity.
 *
 * The broad-phase clips work to the relay's 27 m footprint. Within it, the
 * 10 cm occupancy step is shorter than the thinnest 32 cm slab even after the
 * steepest authored ramp/helix slope. An outside -> inside transition is then
 * bisected to millimetre scale. This catches the discontinuity that a simple
 * height sign-march misses when a descending ray steps from above a one-way
 * platform to below it.
 */
export function raycastStructure(origin, dir, maxT) {
  if (!(maxT >= 0)) return Infinity;

  const radius2 = STRUCTURE_RAY_RADIUS * STRUCTURE_RAY_RADIUS;
  const a = dir.x * dir.x + dir.z * dir.z;
  let startT = 0;
  let endT = maxT;
  if (a < 1e-12) {
    if (origin.x * origin.x + origin.z * origin.z > radius2) return Infinity;
  } else {
    const b = 2 * (origin.x * dir.x + origin.z * dir.z);
    const c = origin.x * origin.x + origin.z * origin.z - radius2;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return Infinity;
    const root = Math.sqrt(disc);
    const enter = (-b - root) / (2 * a);
    const exit = (-b + root) / (2 * a);
    if (exit < 0 || enter > maxT) return Infinity;
    startT = Math.max(0, enter);
    endT = Math.min(maxT, exit);
  }
  if (endT < startT) return Infinity;

  let prevT = startT;
  let px = origin.x + dir.x * prevT;
  let py = origin.y + dir.y * prevT;
  let pz = origin.z + dir.z * prevT;
  let prevMask = structureSlabMask(px, py, pz);
  if (prevMask) return prevT;

  while (prevT < endT - 1e-9) {
    const t = Math.min(endT, prevT + STRUCTURE_RAY_STEP);
    px = origin.x + dir.x * t;
    py = origin.y + dir.y * t;
    pz = origin.z + dir.z * t;
    const mask = structureSlabMask(px, py, pz);
    const entered = mask & ~prevMask;
    if (entered) {
      let first = t;
      for (let bit = 1; bit <= 32; bit <<= 1) {
        if (!(entered & bit)) continue;
        let lo = prevT, hi = t;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) * 0.5;
          const mx = origin.x + dir.x * mid;
          const my = origin.y + dir.y * mid;
          const mz = origin.z + dir.z * mid;
          if (structureSlabMask(mx, my, mz) & bit) hi = mid;
          else lo = mid;
        }
        first = Math.min(first, hi);
      }
      return first;
    }
    prevT = t;
    prevMask = mask;
  }
  return Infinity;
}

/**
 * Allocation-free posture query for the player capsule. This mirrors every
 * layer returned by structureSurfaces(), but answers the only question the
 * controller needs: whether a structure surface crosses the body's vertical
 * span at this horizontal point.
 */
export function structureBlocksBody(x, z, feetY, headY) {
  const minY = feetY + 0.08;
  const maxY = headY + 0.02;
  const d = Math.hypot(x, z);
  if (d < CFG.floorR && CFG.floorY > minY && CFG.floorY < maxY) return true;
  if (d >= CFG.deckIn && d <= CFG.deckOut
      && CFG.deckY > minY && CFG.deckY < maxY) return true;
  const ra = rampHeight(x, z, 1);
  if (ra !== null && ra > minY && ra < maxY) return true;
  const rb = rampHeight(x, z, -1);
  if (rb !== null && rb > minY && rb < maxY) return true;
  const spiral = spiralHeight(x, z);
  if (spiral !== null && spiral > minY && spiral < maxY) return true;
  const upper = upperSurfaceHeight(x, z);
  return upper !== null && upper > minY && upper < maxY;
}

export function buildStructure(colliderApi) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'relay';
  const staticRoot = new THREE.Group();
  staticRoot.name = 'relay-static';
  g.add(staticRoot);
  const trims = { cyan: M.cyanTrim, violet: M.violetTrim };

  const add = (mesh, { shadow = true } = {}) => {
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    staticRoot.add(mesh);
    return mesh;
  };

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitTube = new THREE.CylinderGeometry(1, 1, 1, 7);
  const axisX = new THREE.Vector3(1, 0, 0), axisY = new THREE.Vector3(0, 1, 0);
  const beamDir = new THREE.Vector3(), beamQ = new THREE.Quaternion();
  const addBoxBeam = (a, b, height, depth, mat, shadow = true) => {
    beamDir.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const length = beamDir.length();
    if (length < 1e-5) return null;
    beamQ.setFromUnitVectors(axisX, beamDir.normalize());
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mesh.quaternion.copy(beamQ);
    mesh.scale.set(length + 0.055, height, depth);
    return add(mesh, { shadow });
  };
  const addTubeBeam = (a, b, radius, mat) => {
    beamDir.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const length = beamDir.length();
    if (length < 1e-5) return null;
    beamQ.setFromUnitVectors(axisY, beamDir.normalize());
    const mesh = new THREE.Mesh(unitTube, mat);
    mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mesh.quaternion.copy(beamQ);
    mesh.scale.set(radius, length + 0.055, radius);
    return add(mesh, { shadow: false });
  };
  const addPost = (x, z, floorY, height, mat) => {
    const mesh = new THREE.Mesh(unitTube, mat);
    mesh.position.set(x, floorY + height / 2, z);
    mesh.scale.set(0.075, height, 0.075);
    return add(mesh);
  };

  const addHelixRail = (radius, kind, doorway = false) => {
    const segments = CFG.spiralSegments;
    const doorSegments = doorway
      ? Math.ceil((2.9 / radius) / (CFG.spiralSpan / segments))
      : 0;
    const panelH = 0.72;
    for (let i = 0; i < segments; i++) {
      if (doorway && (i < doorSegments || i >= segments - doorSegments)) continue;
      const t0 = i / segments, t1 = (i + 1) / segments;
      const a0 = CFG.spiralStartA + CFG.spiralSpan * t0;
      const a1 = CFG.spiralStartA + CFG.spiralSpan * t1;
      const y0 = spiralRiseAt(t0), y1 = spiralRiseAt(t1);
      const p0 = { x: Math.cos(a0) * radius, y: y0, z: Math.sin(a0) * radius };
      const p1 = { x: Math.cos(a1) * radius, y: y1, z: Math.sin(a1) * radius };
      addBoxBeam(
        { ...p0, y: p0.y + panelH / 2 },
        { ...p1, y: p1.y + panelH / 2 },
        panelH, 0.13, M.darkMetal,
      );
      addTubeBeam(
        { ...p0, y: p0.y + CFG.spiralRailH },
        { ...p1, y: p1.y + CFG.spiralRailH },
        0.075, radius === CFG.spiralInner ? M.violetTrim : M.cyanTrim,
      );
      if (i % 4 === 0) addPost(p0.x, p0.z, p0.y, CFG.spiralRailH, M.panelMetal);
      colliderApi.place({
        kind,
        surface: 'metal',
        segment: {
          x1: p0.x, z1: p0.z, x2: p1.x, z2: p1.z,
          r: CFG.spiralRailR,
          yMin: Math.min(y0, y1) - 0.08,
          yMax: Math.max(y0, y1) + CFG.spiralRailH + 0.08,
        },
      });
    }
  };

  const addRingRail = (radius, kind, {
    height = CFG.upperRailH,
    gapAt = null,
    gapWidth = 0,
    cyan = true,
  } = {}) => {
    const segments = 80, panelH = Math.min(0.64, height * 0.72);
    const halfGapA = gapWidth > 0 ? gapWidth / (radius * 2) : 0;
    for (let i = 0; i < segments; i++) {
      const a0 = i / segments * TAU, a1 = (i + 1) / segments * TAU;
      const am = (a0 + a1) / 2;
      if (gapAt !== null) {
        let da = wrapPositive(am - gapAt);
        if (da > Math.PI) da -= TAU;
        if (Math.abs(da) < halfGapA) continue;
      }
      const y0 = upperSurfaceHeight(Math.cos(a0) * radius, Math.sin(a0) * radius) ?? CFG.upperY;
      const y1 = upperSurfaceHeight(Math.cos(a1) * radius, Math.sin(a1) * radius) ?? CFG.upperY;
      const p0 = { x: Math.cos(a0) * radius, y: y0, z: Math.sin(a0) * radius };
      const p1 = { x: Math.cos(a1) * radius, y: y1, z: Math.sin(a1) * radius };
      addBoxBeam(
        { ...p0, y: p0.y + panelH / 2 },
        { ...p1, y: p1.y + panelH / 2 },
        panelH, 0.14, M.darkMetal,
      );
      addTubeBeam(
        { ...p0, y: p0.y + height },
        { ...p1, y: p1.y + height },
        0.07, cyan ? M.cyanTrim : M.violetTrim,
      );
      if (i % 5 === 0) addPost(p0.x, p0.z, p0.y, height, M.panelMetal);
      colliderApi.place({
        kind,
        surface: 'metal',
        segment: {
          x1: p0.x, z1: p0.z, x2: p1.x, z2: p1.z,
          r: 0.15,
          yMin: Math.min(y0, y1) - 0.08,
          yMax: Math.max(y0, y1) + height + 0.08,
        },
      });
    }
  };

  // floor plate
  add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.floorR, CFG.floorR + 0.6, 0.4, 48), M.floor), { shadow: false })
    .position.y = CFG.floorY - 0.2;
  colliderApi.place({ kind: 'relay-floor', decor: true }); // walkable layer, not a wall

  // floor edge trim ring
  const floorRing = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.floorR + 0.3, 0.09, 8, 64), M.cyanTrim), { shadow: false });
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = CFG.floorY + 0.05;

  // central core shaft
  const core = add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.coreR, CFG.coreR + 0.5, CFG.deckY + 3.4, 24), M.panelMetal));
  core.position.y = (CFG.deckY + 3.4) / 2;
  colliderApi.place({ kind: 'relay-core', x: 0, z: 0, r: CFG.coreR + 0.25, yMin: 0, yMax: CFG.deckY + 3.4 });
  // core bands
  for (const [y, mat] of [[2.2, M.cyanTrim], [5.4, M.violetTrim], [8.4, M.cyanTrim]]) {
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.coreR + 0.28, 0.07, 8, 40), mat), { shadow: false });
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
  }
  // Flush maintenance panels break the shaft's single primitive silhouette.
  // Their radial face follows the existing taper instead of growing the core.
  const coreH = CFG.deckY + 3.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const y = 1.45 + (i % 3) * 3.2;
    const shellR = CFG.coreR + 0.5 * (1 - y / coreH);
    const panel = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.28, 1.08), M.darkMetal), { shadow: false });
    panel.position.set(Math.cos(a) * shellR, y, Math.sin(a) * shellR);
    panel.rotation.y = -a;
    if ((i & 1) === 0) {
      const status = add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.68), i % 4 ? M.cyanTrim : M.violetTrim), { shadow: false });
      status.position.set(Math.cos(a) * (shellR + 0.025), y + 0.37, Math.sin(a) * (shellR + 0.025));
      status.rotation.y = -a;
    }
  }

  // deck annulus (with a real hole)
  const deckGeo = new THREE.RingGeometry(CFG.deckIn, CFG.deckOut, 56, 1);
  deckGeo.rotateX(-Math.PI / 2);
  const deck = add(new THREE.Mesh(deckGeo, M.deck), { shadow: false });
  deck.position.y = CFG.deckY;
  const deckSkirt = add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.deckOut + 0.15, CFG.deckOut + 0.15, 0.55, 56, 1, true), M.darkMetal), { shadow: false });
  deckSkirt.position.y = CFG.deckY - 0.28;
  // deck rims
  for (const [r, mat] of [[CFG.deckOut + 0.18, M.cyanTrim], [CFG.deckIn - 0.12, M.violetTrim]]) {
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.10, 8, 64), mat), { shadow: false });
    rim.rotation.x = Math.PI / 2;
    rim.position.y = CFG.deckY + 0.10;
  }
  // Engraved concentric joints and radial panel seams sit effectively flush;
  // they improve parallax/readability without becoming new floor obstacles.
  for (const r of [6.55, 9.15, 11.65]) {
    const joint = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 5, 64), M.darkMetal), { shadow: false });
    joint.rotation.x = Math.PI / 2;
    joint.position.y = CFG.deckY + 0.018;
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    const seam = add(new THREE.Mesh(new THREE.BoxGeometry(7.72, 0.018, 0.035), M.darkMetal), { shadow: false });
    seam.position.set(Math.cos(a) * 8.82, CFG.deckY + 0.012, Math.sin(a) * 8.82);
    seam.rotation.y = -a;
  }
  for (const r of [7.8, 12.0, 14.7]) {
    const floorJoint = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.024, 5, 72), M.darkMetal), { shadow: false });
    floorJoint.rotation.x = Math.PI / 2;
    floorJoint.position.y = CFG.floorY + 0.018;
  }

  /* -------- third floor: captured regolith on a relay observation ring ---- */
  const upper = add(new THREE.Mesh(makeUpperRingGeometry(), M.lunar), { shadow: false });
  upper.name = 'upper-lunar-surface';
  // Hitscan uses the exact analytic surface; never triangle-test this mesh.
  upper.raycast = () => {};

  const upperUnderGeo = new THREE.RingGeometry(CFG.upperIn, CFG.upperOut, 112, 1);
  upperUnderGeo.rotateX(Math.PI / 2);
  const upperUnder = add(new THREE.Mesh(upperUnderGeo, M.darkMetal));
  upperUnder.position.y = CFG.upperY - 0.48;
  const upperOuterSkirt = add(new THREE.Mesh(
    new THREE.CylinderGeometry(CFG.upperOut, CFG.upperOut, 0.50, 112, 1, true),
    M.darkMetal,
  ));
  upperOuterSkirt.position.y = CFG.upperY - 0.25;
  const innerSkirtGeo = new THREE.CylinderGeometry(CFG.upperIn, CFG.upperIn, 0.50, 80, 1, true);
  innerSkirtGeo.scale(-1, 1, 1); // face the central atrium
  const upperInnerSkirt = add(new THREE.Mesh(innerSkirtGeo, M.panelMetal));
  upperInnerSkirt.position.y = CFG.upperY - 0.25;

  // Radial ribs live wholly inside the slab envelope: structural silhouette
  // from below, no new head-height obstacle on either playable floor.
  const upperRibLen = CFG.upperOut - CFG.upperIn - 0.75;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    const r = (CFG.upperIn + CFG.upperOut) / 2;
    const rib = add(new THREE.Mesh(unitBox, i % 2 ? M.darkMetal : M.panelMetal));
    rib.position.set(Math.cos(a) * r, CFG.upperY - 0.43, Math.sin(a) * r);
    rib.rotation.y = -a;
    rib.scale.set(upperRibLen, 0.22, 0.20);
  }
  // Emissive inner/outer datum rings read the platform height from the basin.
  for (const [r, mat] of [[CFG.upperIn + 0.10, M.violetTrim], [CFG.upperOut + 0.04, M.cyanTrim]]) {
    const ring = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.095, 7, 112), mat), { shadow: false });
    ring.rotation.x = Math.PI / 2;
    ring.position.y = CFG.upperY - 0.05;
  }
  colliderApi.place({ kind: 'relay-upper-floor', decor: true });

  /* -------- one authored helix; surface, silhouette and rails agree ------- */
  const spiralTop = add(new THREE.Mesh(makeSpiralRibbonGeometry(), M.deck));
  spiralTop.name = 'relay-spiral-surface';
  spiralTop.raycast = () => {};
  add(new THREE.Mesh(makeSpiralRibbonGeometry(-0.32, true), M.darkMetal));
  add(new THREE.Mesh(makeSpiralSideGeometry(CFG.spiralOuter), M.darkMetal));
  add(new THREE.Mesh(makeSpiralSideGeometry(CFG.spiralInner, true), M.panelMetal));

  // Radial treads make the continuous FPS-friendly surface read as stairs.
  const treadCount = 42;
  for (let i = 0; i <= treadCount; i++) {
    const t = i / treadCount;
    const a = CFG.spiralStartA + CFG.spiralSpan * t;
    const tread = add(new THREE.Mesh(
      new THREE.BoxGeometry(CFG.spiralOuter - CFG.spiralInner - 0.28, 0.052, 0.095),
      i === 0 || i === treadCount ? M.cyanTrim : M.darkMetal,
    ), { shadow: false });
    tread.position.set(
      Math.cos(a) * CFG.spiralMid,
      spiralRiseAt(t) + 0.036,
      Math.sin(a) * CFG.spiralMid,
    );
    tread.rotation.y = -a;
  }
  colliderApi.place({ kind: 'relay-spiral', decor: true });

  addHelixRail(CFG.spiralInner, 'spiral-inner-rail');
  addHelixRail(CFG.spiralOuter, 'spiral-outer-rail', true);

  // The 46-degree missing sector gives bottom and top distinct addresses. A
  // tall radial bulkhead through its centre makes crossing that seam physically
  // impossible, while each landing remains open at its own edge of the gap.
  const bulkA = CFG.spiralGapCenter;
  const bulkH = CFG.upperY - CFG.deckY + CFG.spiralRailH;
  const bulk = add(new THREE.Mesh(
    new THREE.BoxGeometry(CFG.spiralOuter - CFG.spiralInner, bulkH, 0.30),
    M.panelMetal,
  ));
  bulk.position.set(
    Math.cos(bulkA) * CFG.spiralMid,
    CFG.deckY + bulkH / 2,
    Math.sin(bulkA) * CFG.spiralMid,
  );
  bulk.rotation.y = -bulkA;
  for (const y of [CFG.deckY + 0.9, CFG.deckY + 4.5, CFG.upperY - 0.25]) {
    const strip = add(new THREE.Mesh(
      new THREE.BoxGeometry(CFG.spiralOuter - CFG.spiralInner - 0.35, 0.075, 0.325),
      y === CFG.deckY + 4.5 ? M.violetTrim : M.cyanTrim,
    ), { shadow: false });
    strip.position.set(Math.cos(bulkA) * CFG.spiralMid, y, Math.sin(bulkA) * CFG.spiralMid);
    strip.rotation.y = -bulkA;
  }
  colliderApi.place({
    kind: 'spiral-bulkhead',
    surface: 'metal',
    segment: {
      x1: Math.cos(bulkA) * CFG.spiralInner,
      z1: Math.sin(bulkA) * CFG.spiralInner,
      x2: Math.cos(bulkA) * CFG.spiralOuter,
      z2: Math.sin(bulkA) * CFG.spiralOuter,
      r: 0.18,
      yMin: CFG.deckY - 0.08,
      yMax: CFG.upperY + CFG.spiralRailH,
    },
  });

  // A real guarded opening: the inner rail has one 3.1 m upper exit, and the
  // broad moon shelf has a continuous low outer perimeter guard.
  addRingRail(CFG.upperIn + 0.05, 'upper-atrium-rail', {
    height: CFG.spiralRailH,
    gapAt: CFG.spiralUpperA,
    gapWidth: 3.1,
    cyan: false,
  });
  addRingRail(CFG.upperOut - 0.14, 'upper-perimeter-rail', {
    height: CFG.upperRailH,
    cyan: true,
  });

  // outer columns with cross-braces (the under-deck arcade)
  for (let i = 0; i < CFG.columns; i++) {
    const a = (i / CFG.columns) * TAU;
    const x = Math.cos(a) * CFG.columnR, z = Math.sin(a) * CFG.columnR;
    // skip columns that would block the two ramps
    if (Math.abs(z) < CFG.rampW / 2 + 0.9 && Math.abs(x) > CFG.rampHead - 1) continue;
    const col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.68, CFG.deckY, 10), M.darkMetal));
    col.position.set(x, CFG.deckY / 2, z);
    colliderApi.place({ kind: 'relay-column', x, z, r: 0.62, yMin: 0, yMax: CFG.deckY });
    const shoe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 10), M.panelMetal), { shadow: false });
    shoe.position.set(x, 0.55, z);
    const footCollar = add(new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.045, 6, 20), i % 2 ? M.violetTrim : M.cyanTrim), { shadow: false });
    footCollar.rotation.x = Math.PI / 2;
    footCollar.position.set(x, 0.80, z);
    const headCollar = add(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 6, 20), M.darkMetal), { shadow: false });
    headCollar.rotation.x = Math.PI / 2;
    headCollar.position.set(x, CFG.deckY - 0.52, z);
  }

  // pylons rising past the deck, with trim rings
  for (let i = 0; i < CFG.pylons; i++) {
    const a = (i / CFG.pylons) * TAU + 0.26;
    const x = Math.cos(a) * CFG.pylonR, z = Math.sin(a) * CFG.pylonR;
    const h = CFG.deckY + 8.5;
    const py = add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, h, 8), M.panelMetal));
    py.position.set(x, h / 2, z);
    colliderApi.place({ kind: 'relay-pylon', x, z, r: 0.5, yMin: 0, yMax: h });
    const ringT = add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 22), i % 2 ? M.violetTrim : M.cyanTrim), { shadow: false });
    ringT.rotation.x = Math.PI / 2;
    ringT.position.set(x, CFG.deckY + 6.8, z);
    for (const y of [4.15, 11.65]) {
      const collar = add(new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.035, 6, 20), M.darkMetal), { shadow: false });
      collar.rotation.x = Math.PI / 2;
      collar.position.set(x, y, z);
    }
  }

  // aperture crown above the core + dishes
  const crown = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.coreR + 0.9, 0.16, 10, 48), M.cyanTrim), { shadow: false });
  crown.rotation.x = Math.PI / 2;
  crown.position.y = CFG.deckY + 3.6;

  const dishes = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 8), M.darkMetal);
    mast.position.y = 1.3;
    mast.castShadow = true;
    arm.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 12, 0, TAU, 0, 1.05), M.panelMetal);
    dish.position.y = 2.7;
    dish.rotation.x = -0.9;
    dish.castShadow = true;
    arm.add(dish);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 6, 28), M.darkMetal);
    rim.position.y = 2.7;
    rim.rotation.x = Math.PI / 2 - 0.9;
    rim.castShadow = true;
    arm.add(rim);
    const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), M.darkMetal);
    gimbal.position.y = 2.38;
    gimbal.castShadow = true;
    arm.add(gimbal);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), s > 0 ? M.cyanTrim : M.violetTrim);
    eye.position.set(0, 2.7, 0.6);
    arm.add(eye);
    arm.position.set(s * 2.6, CFG.deckY + 3.4, s * 1.4);
    g.add(arm);
    dishes.push(arm);
  }

  // the energy beam up through the aperture — near-invisible, additive
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, CFG.beamTop, 14, 1, true), M.beam);
  beam.position.y = CFG.beamTop / 2 + 2;
  g.add(beam);

  // ---- ramps: the only way up, so they must read as a road and behave as one
  const rise = CFG.deckY - CFG.rampFootY;
  const len = CFG.rampFoot - CFG.rampHead;
  const run = Math.hypot(len, rise);
  const slope = Math.atan2(rise, len);            // 34.5 deg
  for (const sign of [1, -1]) {
    const midX = sign * (CFG.rampFoot + CFG.rampHead) / 2;
    const midY = (CFG.rampFootY + CFG.deckY) / 2;
    // deck (rotation NEGATED vs sign: the head end must be the HIGH end)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(run, 0.34, CFG.rampW), M.deck);
    ramp.position.set(midX, midY - 0.17, 0);
    ramp.rotation.z = -sign * slope;
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    staticRoot.add(ramp);
    for (const z of [-2.42, 2.42]) {
      const strip = add(new THREE.Mesh(new THREE.BoxGeometry(run - 0.9, 0.035, 0.055), M.darkMetal), { shadow: false });
      strip.position.set(
        midX + sign * Math.sin(slope) * 0.19,
        midY - 0.17 + Math.cos(slope) * 0.19,
        z,
      );
      strip.rotation.z = -sign * slope;
    }

    // treads: cross-bars that make the climb legible at a glance
    const treads = 11;
    for (let i = 0; i < treads; i++) {
      const t = (i + 0.5) / treads;                       // 0 foot .. 1 head
      const lx = sign * (CFG.rampFoot - t * len);
      const ly = CFG.rampFootY + rise * t;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, CFG.rampW - 0.5), M.darkMetal);
      bar.position.set(lx, ly + 0.03, 0);
      bar.rotation.z = -sign * slope;
      staticRoot.add(bar);
    }

    for (const zs of [-1, 1]) {
      const zEdge = zs * (CFG.rampW / 2 - 0.18);
      // rail post-and-beam, plus the emissive guide tube on top
      const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(run, 0.14, 0.16), M.darkMetal);
      beamMesh.position.set(midX, midY + CFG.railH, zEdge);
      beamMesh.rotation.z = -sign * slope;
      beamMesh.castShadow = true;
      staticRoot.add(beamMesh);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, run, 6), zs > 0 ? M.cyanTrim : M.violetTrim);
      tube.rotation.z = Math.PI / 2 - sign * slope;
      tube.position.set(midX, midY + CFG.railH + 0.14, zEdge);
      staticRoot.add(tube);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const lx = sign * (CFG.rampFoot - t * len);
        const ly = CFG.rampFootY + rise * t;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, CFG.railH, 0.12), M.darkMetal);
        post.position.set(lx, ly + CFG.railH / 2, zEdge);
        post.castShadow = true;
        staticRoot.add(post);
        const gusset = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.14), M.panelMetal), { shadow: false });
        gusset.position.set(lx, ly + 0.10, zEdge);
        gusset.rotation.z = -sign * slope;
      }
      // ONE box collider per rail: a low wall you slide along, and bullets
      // clear it above railH. Spans the ramp run in X, thin in Z.
      // The box stops 1.6 m short of the head: up there the ramp is level
      // with the deck, and a rail spanning that far would wall off the deck
      // edge and make anything standing on the deck path all the way around.
      const railLoX = CFG.rampHead + 1.6, railHiX = CFG.rampFoot;
      colliderApi.place({
        kind: 'ramp-rail',
        box: {
          minX: Math.min(sign * railLoX, sign * railHiX),
          maxX: Math.max(sign * railLoX, sign * railHiX),
          minZ: zEdge - 0.22, maxZ: zEdge + 0.22,
          yMin: CFG.rampFootY, yMax: CFG.deckY + CFG.railH,
        },
      });
    }

    // an apron wedge so the foot visibly meets the moon instead of floating
    const apron = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, CFG.rampW), M.deck);
    apron.position.set(sign * (CFG.rampFoot + 0.7), CFG.rampFootY - 0.22, 0);
    apron.receiveShadow = true;
    staticRoot.add(apron);

    colliderApi.place({ kind: 'relay-ramp', decor: true }); // walkable via structureSurfaces
  }

  // Collapse the authored relay shell after every transform is final. The
  // dishes and energy beam remain outside this subtree so they can move.
  const staticBatch = batchStaticMeshes(staticRoot);
  g.userData.staticBatch = staticBatch;

  let t = 0;
  return {
    group: g,
    dishes,
    /** trim breathing + beam + power-up over the run (world.update drives). */
    update(dt, threat, powerIn) {
      const power = 0.35 + powerIn * 0.65;
      t += dt;
      const pulse = 0.5 + 0.5 * Math.sin(t * (1.35 + threat * 0.55));
      M.cyanTrim.emissiveIntensity = (1.02 + pulse * 0.27) * power;
      M.violetTrim.emissiveIntensity = (0.84 + pulse * 0.24 + threat * 0.2) * power;
      M.floor.emissiveIntensity = 0.17 + power * 0.145;
      M.beam.opacity = power * (0.055 + pulse * 0.038 + threat * 0.018);
      beam.scale.set(0.94 + pulse * 0.08, 1, 0.94 + pulse * 0.08);
      beam.rotation.y += (0.035 + threat * 0.025) * dt;
      dishes[0].rotation.y = 0.42 + Math.sin(t * 0.075) * 0.48;
      dishes[1].rotation.y = -1.25 - Math.sin(t * 0.061 + 1.7) * 0.58;
      dishes[0].rotation.x = Math.sin(t * 0.055) * 0.12;
      dishes[1].rotation.x = Math.sin(t * 0.047 + 0.9) * 0.11;
    },
  };
}
