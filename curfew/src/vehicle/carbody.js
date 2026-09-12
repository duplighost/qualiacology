// Public vehicle dimensions and debris. The coachwork builder owns surfaces and fittings.
// car.js alone owns driving, wheel poses, door motion and collision.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CFG } from '../config.js';
import { buildCoachwork } from './car-coachwork.js';

/* --------------------------------------------------------------- dimensions --
 * WHEELBASE is CFG.car.wheelbase (2.55). Everything else is local: config.js is
 * engine's file and a request for a CFG.car.body block is in docs/HANDOFF.md.
 * ------------------------------------------------------------------------- */
const WB = CFG.car.wheelbase;          // 2.55
const HALF_WB = WB * 0.5;              // 1.275
const BODY_HX = 0.93;                  // half width of the lower body
const TRACK = 0.84;                    // wheel centre offset from the spine
const WHEEL_R = 0.40;
const NOSE_Z = -2.14;                  // front bumper face
const TAIL_Z = 2.16;                   // rear bumper face
export const ROOF_Y = 1.97;            // top of the roof plate — the mantle target
/** The body's footprint, car-local (forward is -Z): car.js roofHeightAt answers inside it. */
export const FOOTPRINT = Object.freeze({ hx: BODY_HX, z0: NOSE_Z, z1: TAIL_Z });
export const DOOR = Object.freeze({ x: -1.00, y: 1.05, z: -0.30 });   // driver door, local
export const LAMP_GOOD = Object.freeze({ x: -0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const LAMP_DEAD = Object.freeze({ x: 0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const WHEEL_RADIUS = WHEEL_R;

export const DOOR_HINGE = Object.freeze({ x: -0.90, y: 0, z: -0.92 });
/** Radians at full open. 60 degrees is a door you could not mistake for a shut one. */
export const DOOR_OPEN_MAX = 1.05;
export const WHEEL_OFFSETS = Object.freeze([
  Object.freeze({ x: -TRACK, y: WHEEL_R, z: -HALF_WB, front: true }),
  Object.freeze({ x: TRACK, y: WHEEL_R, z: -HALF_WB, front: true }),
  Object.freeze({ x: -TRACK, y: WHEEL_R, z: HALF_WB, front: false }),
  Object.freeze({ x: TRACK, y: WHEEL_R, z: HALF_WB, front: false }),
]);

export function buildCarBody(rng) {
  const seed = rng ? (1 + Math.floor(rng.next() * 4096)) : 17;
  return buildCoachwork({seed, door: DOOR, hinge: DOOR_HINGE, openMax: DOOR_OPEN_MAX,
    roofY: ROOF_Y, lampOffsets: {good: LAMP_GOOD, dead: LAMP_DEAD}});
}

/* ==========================================================================
   DEBRIS — ROUND 7, lane F. What comes off a fence when you drive through it.

   Alex asked to be able to crush things with the car. A collider that quietly disappears
   is the exact failure this project keeps shipping: it works, and nothing reaches the
   screen. So a crush throws real geometry.

   ONE merged geometry, ONE mesh, ONE draw call, and NO NEW MATERIAL — car.js hands this
   the places lane's own body material, which already exists and already has a program, so
   the light census and the program budget are both untouched (AGENTS.md). Every piece is a
   little box; car.js writes its vertices each frame from a position and a rotation. The
   pieces are UNIT-SPACE here and world-space there, which is why the base arrays come back
   out with the geometry: the sim never allocates.

   `pieces` boxes, each 24 vertices (a BoxGeometry is indexed: 24 verts, 36 indices), so
   16 pieces is 384 vertices. Rewriting all of them every frame is nothing.
   ========================================================================== */
export const DEBRIS_VERTS = 24;

export function buildDebrisGeometry(pieces) {
  const n = Math.max(1, pieces | 0);
  const geos = [];
  for (let i = 0; i < n; i++) {
    // A spread of shapes: planks, blocks and splinters, so a smashed thing does not read
    // as a bag of identical dice.
    const t = i / n;
    // Kept small on purpose: a piece is thrown 1-3 m in front of the camera, where a 0.8 m
    // slab fills a third of the frame and reads as a door, not as a splinter. Photographed
    // at tests/shots/f-crush-debris.png before this was trimmed.
    const w = 0.09 + (i % 3) * 0.10;
    const h = 0.05 + ((i * 7) % 5) * 0.035;
    const d = 0.09 + ((i * 5) % 4) * 0.10 + t * 0.12;
    const g = new THREE.BoxGeometry(w, h, d);
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) { c[v * 3] = 0.14; c[v * 3 + 1] = 0.13; c[v * 3 + 2] = 0.12; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  // The rest pose, kept so every frame can rebuild from it instead of accumulating drift.
  const src = geo.attributes.position.array;
  const srcN = geo.attributes.normal.array;
  const base = new Float32Array(src.length);
  base.set(src);
  const baseN = new Float32Array(srcN.length);
  baseN.set(srcN);
  // Nothing culls it: the pieces move far from wherever the bounding sphere was computed.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6);
  return { geo, base, baseN, pieces: n, per: DEBRIS_VERTS };
}

export default buildCarBody;
