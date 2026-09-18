// Rooms and work yards that make the county's landmarks worth entering.
// Everything is baked into the caller's existing solid/glow kits. No lights,
// materials, per-frame work or random placement: doors and useful lanes stay authored.
import * as THREE from 'three';
import { C, groundY, PANE_LAMP } from './sites.js';


const P = {
  timber: [0.094, 0.064, 0.042], iron: [0.048, 0.053, 0.060],
  stone: [0.121, 0.123, 0.112], soot: [0.031, 0.035, 0.040],
  rust: [0.152, 0.065, 0.038], cloth: [0.171, 0.156, 0.126],
  bone: [0.265, 0.244, 0.208], green: [0.055, 0.112, 0.094],
};

function box(k, a, x, z, w, d, base, h, colour, tag = 'wood', standable = true, yaw = 0) {
  k.solid.box(w, h, d, x, a.padY + base + h * 0.5, z, colour, yaw);
  a.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: a.padY + base, y1: a.padY + base + h, tag, standable,
    climbable: standable });
}

function floor(k, a, x, z, w, d, top, colour = P.timber) {
  box(k, a, x, z, w, d, top - 0.16, 0.16, colour);
  // Seams and joists are in the same slab silhouette, not loose collision promises.
  const n = Math.max(2, Math.ceil(w / 0.64));
  for (let i = 1; i < n; i++) k.solid.box(0.022, 0.018, d - 0.05,
    x - w * 0.5 + i * w / n, a.padY + top - 0.005, z, P.soot);
  for (const side of [-1, 1]) k.solid.box(w, 0.24, 0.16,
    x, a.padY + top - 0.27, z + side * (d * 0.5 - 0.13), P.iron);
}

function beam(k, a, v, w, radius = 0.065, col = P.iron) {
  const direction = new THREE.Vector3(w[0] - v[0], w[1] - v[1], w[2] - v[2]);
  const g = new THREE.CylinderGeometry(radius, radius, direction.length(), 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate((v[0] + w[0]) * 0.5, a.padY + (v[1] + w[1]) * 0.5, (v[2] + w[2]) * 0.5);
  k.solid.push(g, col);
}

function bench(k, a, x, z, w, base = 0, yaw = 0) {
  box(k, a, x, z, w, 0.58, base + 0.40, 0.12, P.timber, 'wood', true, yaw);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const side of [-1, 1]) k.solid.box(0.12, 0.40, 0.46,
    x + side * (w * 0.5 - 0.18) * c, a.padY + base + 0.20,
    z - side * (w * 0.5 - 0.18) * s, P.iron, yaw);
  k.solid.box(w, 0.47, 0.09, x + 0.27 * s, a.padY + base + 0.83,
    z + 0.27 * c, P.timber, yaw);
  // Include the back in the physical shape. The seat remains its own usable top.
  a.emit({ kind: 'obb', x: x + 0.27 * s, z: z + 0.27 * c,
    halfX: w * 0.5, halfZ: 0.045, yaw, y0: a.padY + base + 0.59,
    y1: a.padY + base + 1.065, tag: 'wood', climbable: false });
}

function table(k, a, x, z, w, d, base = 0, col = P.timber) {
  box(k, a, x, z, w, d, base + 0.78, 0.12, col);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    k.solid.box(0.10, 0.78, 0.10, x + sx * (w * 0.5 - 0.15),
      a.padY + base + 0.39, z + sz * (d * 0.5 - 0.15), P.iron);
}

/** A plain chair on a floor at local height `base`; the sitter faces (sin yaw, cos yaw).
 *  The seat is a standable block from the floor and the back is its own thin body. */
function chair(k, a, x, z, base, yaw, col = P.timber) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  k.solid.box(0.42, 0.045, 0.42, x, a.padY + base + 0.4575, z, col, yaw);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const [px, pz] = at(sx * 0.18, sz * 0.18);
    k.solid.box(0.04, 0.435, 0.04, px, a.padY + base + 0.2175, pz, P.iron, yaw);
  }
  const [bx, bz] = at(0, -0.19);
  k.solid.box(0.40, 0.44, 0.04, bx, a.padY + base + 0.70, bz, col, yaw);
  a.emit({ kind: 'obb', x, z, halfX: 0.21, halfZ: 0.21, yaw, y0: a.padY + base, y1: a.padY + base + 0.48,
    tag: 'wood', standable: true });
  a.emit({ kind: 'obb', x: bx, z: bz, halfX: 0.20, halfZ: 0.03, yaw, y0: a.padY + base + 0.48,
    y1: a.padY + base + 0.92, tag: 'wood', climbable: false });
}

function cabinet(k, a, x, z, w = 1.6, base = 0, yaw = 0, col = P.green) {
  box(k, a, x, z, w, 0.66, base, 2.10, col, 'metal', true, yaw);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i < 3; i++) {
    const lx = -w * 0.5 + (i + 0.5) * w / 3;
    const px = x + lx * c - 0.343 * s, pz = z - lx * s - 0.343 * c;
    k.solid.box(w / 3 - 0.06, 1.87, 0.04, px, a.padY + base + 1.08, pz, P.iron, yaw);
    for (let j = 0; j < 3; j++) k.solid.box(w / 3 - 0.14, 0.027, 0.06,
      px, a.padY + base + 1.73 + j * 0.075, pz, P.soot, yaw);
    k.solid.box(0.052, 0.22, 0.075, px + 0.11 * c,
      a.padY + base + 1.02, pz - 0.11 * s, P.rust, yaw);
  }
}

function light(k, a, x, z, y, yaw = 0) {
  k.solid.box(0.36, 0.45, 0.20, x, a.padY + y, z, P.iron, yaw);
  k.glow.pane(0.22, 0.31, x + Math.sin(yaw) * 0.12,
    a.padY + y, z + Math.cos(yaw) * 0.12, PANE_LAMP, yaw, 0, 4, 5);
}

function partition(k, a, x, z, w, top, base = 0, gap = 2.2, rightWidth = null) {
  const side = (w - gap) * 0.5;
  for (const s of [-1, 1]) {
    const width = s > 0 && rightWidth !== null ? rightWidth : side;
    box(k, a, x + s * (gap + width) * 0.5, z,
      width, 0.22, base, top - base, P.timber, 'wall', false);
  }
  box(k, a, x, z, gap, 0.24, base + 2.55, top - base - 2.55,
    P.iron, 'wall', false);
}

function rib(k, a, x, z, span, spring, peak, colour = P.stone) {
  const points = [[x - span * 0.5, spring, z], [x - span * 0.36, peak - 1.1, z],
    [x, peak, z], [x + span * 0.36, peak - 1.1, z], [x + span * 0.5, spring, z]];
  for (let i = 0; i < points.length - 1; i++) beam(k, a, points[i], points[i + 1], 0.15, colour);
}

function coat(k, a, x, z, base, yaw = 0) {
  // An empty coat with an open collar and two hanging sleeves. It is wall dressing,
  // safely outside a route, not an inert NPC that could be confused with a live threat.
  k.solid.box(0.40, 0.88, 0.13, x, a.padY + base + 0.60, z, P.cloth, yaw);
  for (const s of [-1, 1]) k.solid.box(0.14, 0.68, 0.16,
    x + s * 0.27 * Math.cos(yaw), a.padY + base + 0.73,
    z - s * 0.27 * Math.sin(yaw), P.cloth, yaw, 0, s * 0.19);
  k.solid.box(0.14, 0.11, 0.15, x, a.padY + base + 1.07, z, P.soot, yaw);
}

function stair(k, a, x, startZ, w, target, n, tread, direction = -1) {
  const stages = [];
  for (let i = 0; i < n; i++) {
    const h = target * (i + 1) / n, z = startZ + direction * i * tread;
    box(k, a, x, z, w, tread + 0.07, 0, h, i & 1 ? P.timber : P.iron);
    k.solid.box(w - 0.06, 0.045, 0.09, x, a.padY + h - 0.025,
      z - direction * tread * 0.46, P.cloth);
    stages.push({ x, z, y: a.padY + h });
  }
  return stages;
}

function record(a, name, entry, points) {
  if (!a.site.destinationRooms) a.site.destinationRooms = [];
  const value = { name, space: 'local', entry, points };
  const previous = a.site.destinationRooms.findIndex(r => r.name === name);
  if (previous < 0) a.site.destinationRooms.push(value);
  else a.site.destinationRooms[previous] = value;
}

function hospice(k, a) {
  // The hospice had seventeen metres of empty shell. Now it has an entrance hall,
  // wash room, ground recovery room and an upstairs ward with a real stair and gallery.
  floor(k, a, -13, 3, 10.04, 16.50, 0.08, P.stone);
  partition(k, a, -13, 3.0, 10.0, 3.25, 0.08, 2.8, 1.0);
  floor(k, a, -13, -2.7, 10.0, 5.0, 3.25);
  const stages = stair(k, a, -9.08, 7.8, 1.85, 3.25, 11, 0.75);
  // The landing overlaps both the top tread and gallery; no hand-width final gap.
  floor(k, a, -9.08, -0.06, 1.85, 1.18, 3.25);
  // Rails face the drop, stop before the stair opening, and match their exact collision.
  box(k, a, -14.25, -0.16, 7.50, 0.10, 3.25, 1.0, P.iron, 'metal', false);
  bench(k, a, -16.1, 8.6, 2.8);
  cabinet(k, a, -17.70, 5.8, 2.0, 0.08, Math.PI * 0.5);
  // A wash trough, taps, medicine bottles and drain; no fake second sleep interaction.
  box(k, a, -16.7, 0.6, 2.8, 0.8, 0.08, 0.75, P.green, 'stone');
  k.solid.box(2.54, 0.045, 0.56, -16.7, a.padY + 0.85, 0.6, P.soot);
  for (const x of [-17.45, -16.0]) {
    beam(k, a, [x, 0.84, 0.91], [x, 1.20, 0.91], 0.035);
    beam(k, a, [x, 1.20, 0.91], [x, 1.20, 0.65], 0.035);
  }
  for (let i = 0; i < 5; i++) coat(k, a, -17.74, 9.2 - i * 1.0, 1.1, Math.PI * 0.5);
  cabinet(k, a, -11.45, -4.90, 2.0, 0.08, 0, P.timber);
  // Empty ward: chairs face a scraped, human-height absence on the end wall.
  for (const x of [-16.3, -13.3, -10.3]) bench(k, a, x, -2.1, 1.8, 3.25);
  k.solid.box(1.5, 2.25, 0.055, -13.2, a.padY + 4.55, -5.20, P.cloth);
  k.solid.box(0.52, 1.35, 0.07, -13.2, a.padY + 4.48, -5.16, P.soot);
  k.solid.cone(0.31, 0.53, 7, -13.2, a.padY + 5.28, -5.14, P.soot);
  for (const z of [-3.9, 0.2, 4.4, 8.7]) rib(k, a, -13, z, 9.4, 5.95, 7.70, P.timber);
  light(k, a, -13, 3.16, 2.52);
  light(k, a, -13.1, -5.13, 5.95);
  // Explicitly preserve the ground sleep pocket at (-16.2,-2).
  record(a, 'hospice-ward', { x: -13, z: 11.05, y: a.padY + 0.08 },
    [{ x: -13, z: 5, y: a.padY + 0.08 }, { x: -13, z: -2.2, y: a.padY + 3.25 }]);
  a.site.interiorClimb = { kind: 'hospice-ward-stair', space: 'local', stages,
    approach: { x: -9.08, z: 9.25, y: groundY(a, -9.08, 9.25) },
    target: { x: -9.08, z: -1.0, y: a.padY + 3.25 } };
}

function cathedral(k, a) {
  // Vault rhythm gives the eighteen-metre room depth; vertical furnishings leave the
  // central aisle open around the existing pews and altar.
  for (const z of [7.4, 12.1, 16.8, 21.4]) {
    rib(k, a, 0, z, 16.2, 9.6, 15.7);
    for (const s of [-1, 1]) {
      k.solid.box(0.22, 8.8, 0.34, s * 8.10, a.padY + 5.0, z, P.green);
      k.solid.box(0.50, 0.18, 0.56, s * 8.10, a.padY + 9.45, z, P.stone);
    }
  }
  // The organ is in the south-west corner, tall enough to register above the pews.
  box(k, a, -6.25, 6.25, 3.0, 1.20, 0.08, 1.45, P.timber, 'wood');
  for (let i = 0; i < 11; i++) {
    const x = -7.55 + i * 0.26, h = 3.1 + 2.3 * (1 - Math.abs(i - 5) / 5);
    k.solid.cyl(0.09, 0.09, h, 6, x, a.padY + 1.43 + h * 0.5, 6.22, i % 3 ? P.iron : P.rust);
    k.solid.box(0.12, 0.32, 0.035, x, a.padY + 1.91, 6.11, P.soot);
  }
  // Door reveals: the broken front is visibly an entrance from the road, flanked
  // by recesses and open leaves, with no centred buttress or decoration in the aperture.
  for (const s of [-1, 1]) {
    box(k, a, s * 2.32, 23.30, 0.38, 0.70, 0, 4.7, P.stone, 'stone', false);
    k.solid.box(1.48, 3.2, 0.17, s * 2.46, a.padY + 1.64, 24.13,
      P.timber, s * 1.20);
    for (const y of [0.56, 2.68]) k.solid.box(1.5, 0.11, 0.20,
      s * 2.46, a.padY + y, 24.13, P.iron, s * 1.20);
  }
  rib(k, a, 0, 23.35, 4.9, 4.25, 6.3, P.stone);
  // Stonework above the tall portal closes the shell's otherwise fourteen-metre
  // doorway. Its rosette sits above the player's view through the real entrance.
  box(k, a, 0, 23.0, 3.0, 0.46, 6.2, 8.3, P.stone, 'wall', false);
  const rose = new THREE.TorusGeometry(1.02, 0.11, 5, 18);
  rose.translate(0, a.padY + 9.7, 23.31); k.solid.push(rose, P.green);
  for (let i = 0; i < 4; i++) beam(k, a,
    [Math.cos(i * Math.PI / 4) * 0.98, 9.7 + Math.sin(i * Math.PI / 4) * 0.98, 23.32],
    [-Math.cos(i * Math.PI / 4) * 0.98, 9.7 - Math.sin(i * Math.PI / 4) * 0.98, 23.32],
    0.046, P.iron);
  record(a, 'cathedral-nave', { x: 0, z: 23.35, y: a.padY },
    [{ x: 0, z: 18.0, y: a.padY }, { x: 0, z: 10.0, y: a.padY }]);
}

function granary(k, a) {
  // The solid elevator stays between two working passages. A loft runs down its
  // east side; the open store at either end makes a front-to-back loop possible.
  floor(k, a, 14.5, -5.5, 11.52, 16.52, 0.08, P.stone);
  floor(k, a, 19.14, -9.5, 2.32, 8.2, 3.50);
  floor(k, a, 14.4, -12.20, 7.16, 2.80, 3.50);
  const stages = stair(k, a, 19.08, 1.28, 1.92, 3.50, 12, 0.58);
  // The gallery ends at z=-5.4, beside the FINAL tread at z=-5.1. Its entire
  // approach flight is open overhead; a continuous slab would seal the staircase.
  table(k, a, 10.45, -0.60, 2.25, 1.0);
  // The grain measures sit ON the top (0.90); they floated 2.5 cm over it at 1.0.
  for (let i = 0; i < 3; i++) k.solid.box(0.32, 0.15, 0.25,
    9.75 + i * 0.5, a.padY + 0.975, -0.34, i % 2 ? P.cloth : P.rust, 0.12 * i);
  // THE FISKS' BREAK. Four tin mugs set out along the table and four chairs: three still
  // at it, one pushed back from the end as if its man had been called outside and meant to
  // come back to it. Measured on the granary grid (feet 0.08, r 0.22): the north side of the
  // table (z -1.3..-2.0) and its east end are open floor; the south side is the lean-to's crate.
  for (const [cx, cz, yaw] of [[9.70, -1.56, 0], [10.45, -1.60, 0.05], [11.20, -1.55, -0.06], [12.40, -0.95, -1.05]]) {
    chair(k, a, cx, cz, 0.08, yaw);
  }
  for (const [mx, mz] of [[9.70, -0.88], [10.47, -0.86], [11.22, -0.90], [11.44, -0.52]]) {
    k.solid.cyl(0.043, 0.040, 0.095, 8, mx, a.padY + 0.9475, mz, [0.11, 0.115, 0.12]);
    k.solid.cyl(0.034, 0.034, 0.004, 8, mx, a.padY + 0.993, mz, P.soot);
    const handle = new THREE.TorusGeometry(0.026, 0.006, 3, 8, Math.PI);
    handle.rotateZ(-Math.PI * 0.5); handle.translate(mx + 0.043, a.padY + 0.95, mz);
    k.solid.push(handle, [0.11, 0.115, 0.12]);
  }
  // a pair of boots inside the door, worn through at the toes, left where he stepped out of them
  for (const s of [-1, 1]) {
    const bx = 16.2 + s * 0.13, bz = 2.25;
    k.solid.box(0.12, 0.05, 0.30, bx, a.padY + 0.105, bz, P.soot, s * 0.08);
    k.solid.box(0.11, 0.22, 0.12, bx, a.padY + 0.24, bz + 0.08, P.soot, s * 0.08);
    k.solid.box(0.07, 0.03, 0.06, bx, a.padY + 0.12, bz - 0.13, P.bone, s * 0.08);
  }
  // THE WORN RING: four horses walked the threshing floor's gear round for years, outside
  // its teeth (r 4.0), and wore a path into the stone. A band on the floor's collider top.
  {
    const RX = -10.5, RZ = -8.5, top = groundY(a, RX, RZ) + 0.18 + 0.004;
    const ring = new THREE.RingGeometry(4.55, 5.10, 48, 1);
    ring.rotateX(-Math.PI * 0.5); ring.translate(RX, top, RZ);
    k.solid.push(ring, [0.055, 0.050, 0.044]);
  }
  cabinet(k, a, 9.1, -5.1, 2.0, 0.08, Math.PI * 0.5, P.timber);
  for (const z of [-8.1, -11.2]) {
    box(k, a, 10.4, z, 1.8, 1.5, 0.08, 0.67, P.timber);
    for (let i = 0; i < 4; i++) k.solid.box(0.68, 0.26, 0.58,
      10.0 + (i & 1) * 0.76, a.padY + 0.89 + Math.floor(i / 2) * 0.25,
      z + ((i & 1) ? 0.12 : -0.10), P.cloth, 0.11 * i);
  }
  // Belts and chutes stay above standing head height. Physical work surfaces below
  // them, grain measures and packed sacks explain the building without text.
  for (const z of [-11.7, -2.7]) {
    beam(k, a, [9.0, 5.8, z], [20.0, 5.8, z], 0.15, P.timber);
    k.solid.cyl(0.62, 0.62, 0.24, 10, 17.0, a.padY + 5.35, z, P.rust, 0, 0, Math.PI * 0.5);
  }
  for (const x of [12.0, 14.4, 16.7]) cabinet(k, a, x, -13.40, 1.5, 3.5, 0, P.timber);
  light(k, a, 14.4, -13.68, 2.7);
  light(k, a, 20.04, -8.4, 5.6, -Math.PI * 0.5);
  record(a, 'granary-floor', { x: 14.5, z: 3.0, y: a.padY + 0.08 },
    [{ x: 10.9, z: -3.0, y: a.padY + 0.08 }, { x: 11.0, z: -12.2, y: a.padY + 0.08 }]);
  a.site.interiorClimb = { kind: 'granary-east-stair', space: 'local', stages,
    approach: { x: 19.08, z: 2.30, y: groundY(a, 19.08, 2.30) },
    target: { x: 19.08, z: -6.3, y: a.padY + 3.50 } };
}

// THE CHAIN ROOM, under the tipple (destination-compounds weepingMine: legs at
// (-11.5 +-5.3, 8 +-4.2), sorting deck underside at 8.02). A pit-head chain room is where
// a shift hung its clothes: each man's hook hauled up to the roof on its own chain, the
// chain run down to a rail and padlocked with his number. Clothes up, man down the shaft.
// Six are still up there. Nobody came back up to lower them.
//
// It used to stand at z 8.1, and the works landmark's 46 m stack (sites.js, r 2.4 at
// (-13, 8)) stands there: both benches and five of the six coats were inside the brick,
// on a beam at 5.4 m that touched nothing. Everything here is on the north strip now,
// 0.3 m or more clear of the stack, hung from a rail fixed under the deck.
export const CHAIN_ROOM = Object.freeze({
  railY: 7.96,            // the pulley rail's centre, its top against the deck's underside
  railZ: 10.9,
  railX0: -16.4, railX1: -8.6,
  benchZ: 11.3,           // seat 0.40..0.52 over the floor, back at +0.27
  benches: [-14.5, -11.3],
  hoisted: [-15.4, -14.6, -13.8, -12.0, -11.2, -10.4],
  lockZ: 11.85, lockY: 1.5, lockX0: -16.3, lockX1: -8.0,
  // the seventh hook, on the open floor past the east bench's end (measured clear; between the
  // benches the stack stood between it and every way into the room). world-stories hangs what
  // is on it.
  seventh: { x: -9.55, z: 10.9 },
});

const CHAIN = [0.075, 0.052, 0.040];   // old chain: rust gone dark, not a copper wire

function mine(k, a) {
  const R = CHAIN_ROOM;
  const base = groundY(a, -12.9, R.benchZ) - a.padY;
  // the pulley rail, bolted under the sorting deck: it touches the deck, so it hangs from
  // something, and every chain in the room hangs from it
  k.solid.box(R.railX1 - R.railX0, 0.12, 0.14, (R.railX0 + R.railX1) * 0.5,
    a.padY + R.railY, R.railZ, P.iron);
  // the lock rail on two posts, behind the benches: the chains come down to it
  for (const x of [R.lockX0, R.lockX1]) {
    k.solid.box(0.10, R.lockY + 0.10, 0.10, x, a.padY + base + (R.lockY + 0.10) * 0.5, R.lockZ, P.timber);
    a.emit({ kind: 'circle', x, z: R.lockZ, r: 0.07, y0: a.padY + base, y1: a.padY + base + R.lockY + 0.1,
      tag: 'post', climbable: false });
  }
  k.solid.box(R.lockX1 - R.lockX0, 0.10, 0.08, (R.lockX0 + R.lockX1) * 0.5,
    a.padY + base + R.lockY, R.lockZ, P.timber);
  a.emit({ kind: 'obb', x: (R.lockX0 + R.lockX1) * 0.5, z: R.lockZ, halfX: (R.lockX1 - R.lockX0) * 0.5,
    halfZ: 0.05, yaw: 0, y0: a.padY + base + R.lockY - 0.05, y1: a.padY + base + R.lockY + 0.05,
    tag: 'wood', climbable: false });
  // A pulley turns in the y-z plane: the chain comes off its front to the hook, and its
  // tail comes off the back and down to the padlock on the rail behind the benches.
  const pulley = (px) => {
    k.solid.cyl(0.09, 0.09, 0.05, 8, px, a.padY + R.railY - 0.16, R.railZ, P.iron, 0, 0, Math.PI * 0.5);
    beam(k, a, [px, R.railY - 0.16, R.railZ + 0.09], [px, base + R.lockY + 0.03, R.lockZ - 0.05], 0.012, CHAIN);
    k.solid.box(0.05, 0.07, 0.03, px, a.padY + base + R.lockY - 0.07, R.lockZ - 0.055, P.bone);
  };
  R.hoisted.forEach((px, i) => {
    const cb = 5.62 + (i % 3) * 0.17;          // hauled up, not all to the same height
    pulley(px);
    beam(k, a, [px, R.railY - 0.16, R.railZ - 0.02], [px, cb + 1.11, R.railZ], 0.014, CHAIN);
    coat(k, a, px, R.railZ, cb);
  });
  // the seventh hook: its pulley and its padlock, and nothing on it. world-stories hangs
  // what is on it (CHAIN_ROOM.seventh), so it can be there one time you look and not the next.
  pulley(R.seventh.x);
  // SIXTEEN LUNCH PAILS on the benches, a name tag on each. Two have their lids off and
  // are empty; the other fourteen were never opened.
  let n = 0;
  for (const bx of R.benches) {
    bench(k, a, bx, R.benchZ, 2.4, base);
    for (let i = 0; i < 8; i++, n++) {
      const px = bx - 1.05 + i * 0.3, pz = R.benchZ - 0.08, seat = a.padY + base + 0.52;
      const open = n === 5 || n === 12;
      const col = n % 3 ? P.iron : P.rust;
      if (open) {
        // open and empty: the dark of its inside, level with the rim
        k.solid.cyl(0.105, 0.095, 0.20, 10, px, seat + 0.10, pz, col);
        k.solid.cyl(0.094, 0.094, 0.004, 10, px, seat + 0.201, pz, P.soot);
        // its lid, set down on the seat behind it
        k.solid.cyl(0.11, 0.11, 0.018, 10, px + 0.12, seat + 0.009, pz + 0.19, col);
      } else {
        k.solid.cyl(0.105, 0.095, 0.20, 10, px, seat + 0.10, pz, col);
        k.solid.cyl(0.112, 0.112, 0.022, 10, px, seat + 0.211, pz, P.soot);
        const bail = new THREE.TorusGeometry(0.095, 0.006, 3, 10, Math.PI);
        bail.rotateY(0.25 * ((n % 5) - 2));
        bail.translate(px, seat + 0.222, pz);
        k.solid.push(bail, P.iron);
      }
      k.solid.box(0.08, 0.035, 0.006, px, seat + 0.13, pz - 0.103, P.bone);
    }
  }
  cabinet(k, a, -16.12, 5.5, 2.3, base, Math.PI * 0.5);
  // Lamp repair station beside the winding-house approach, kept west of its door.
  table(k, a, 5.1, -9.8, 2.1, 0.8);
  for (let i = 0; i < 5; i++) {
    k.solid.cyl(0.12, 0.12, 0.28, 6, 4.35 + i * 0.37,
      a.padY + 1.04, -9.8, P.iron);
    k.solid.box(0.07, 0.15, 0.07, 4.35 + i * 0.37,
      a.padY + 1.27, -9.8, P.cloth);
  }
  for (const z of [-10.8, -7.5, -4.4]) {
    k.solid.box(0.13, 0.13, 10.5, 12.5, a.padY + 5.03, z, P.iron, Math.PI * 0.5);
    light(k, a, 17.95, z, 4.22, -Math.PI * 0.5);
  }
  record(a, 'tipple-chain-room', { x: -6.8, z: 9.0, y: a.padY + base },
    [{ x: -9.4, z: 9.6, y: a.padY + base }, { x: -12.2, z: 4.6, y: a.padY + base }]);
}

function fen(k, a) {
  // The drowned church's crossing between its surviving aisles. The wake table that stood
  // here stood inside two of the chancel pews (destination-compounds lays them on the turned
  // chancel floor, and it is solid pews: there is no aisle for a table), with five candles
  // hanging off its edge in the air. It is on the ringing floor now (dress-interiors
  // WAKE_TABLE), under the bell rope. The main causeway and hanging-lamp shot remain open.
  for (const x of [-5.5, 5.5]) {
    const y = groundY(a, x, 16) - a.padY;
    bench(k, a, x, 16, 3.6, y + 0.35, x < 0 ? 0.20 : -0.20);
    for (let i = 0; i < 4; i++) beam(k, a,
      [x - 1.5 + i, y + 0.3, 15.9], [x - 1.3 + i, y - 0.3, 16.7], 0.05, P.timber);
  }
  // Three drying sheets are suspended from the surviving east transept, above
  // heads and away from its climb route, silhouetting whatever moves behind them.
  for (let i = 0; i < 3; i++) {
    const x = 11.2 + i * 1.55;
    k.solid.box(1.20, 2.30 - i * 0.20, 0.065, x, a.padY + 5.45,
      10.25, i === 1 ? P.cloth : P.timber, 0, 0, (i - 1) * 0.055);
    beam(k, a, [x, 6.7, 10.25], [x, 8.0, 10.25], 0.025);
  }
}

function garden(k, a) {
  // The ossuary's curved shelves make its dome shelter a room rather than empty
  // columns. Small repeated pale urns live behind dark grilles; the open west
  // approach is untouched and the middle has walking space around the examination slab.
  const base = groundY(a, 13.5, -17) - a.padY + 0.20;
  for (const angle of [-1.5, -0.8, -0.1, 0.6, 1.3]) {
    const x = 13.5 + Math.cos(angle) * 4.9, z = -17 + Math.sin(angle) * 4.9;
    const yaw = Math.PI * 0.5 - angle;
    cabinet(k, a, x, z, 1.65, base, yaw, P.stone);
    for (let i = 0; i < 3; i++) {
      const px = x + (i - 1) * 0.43 * Math.cos(yaw), pz = z - (i - 1) * 0.43 * Math.sin(yaw);
      k.solid.cyl(0.13, 0.18, 0.32, 7, px, a.padY + base + 2.26, pz, P.bone);
      k.solid.cyl(0.17, 0.13, 0.07, 7, px, a.padY + base + 2.455, pz, P.green);
    }
  }
  table(k, a, 13.5, -17, 2.60, 1.0, base, P.stone);
  k.solid.box(1.8, 0.03, 0.72, 13.5, a.padY + base + 0.93, -17, P.cloth);
  // Parallel marks run across the cloth and continue off the table, a specific
  // wrong detail at arm's length rather than a general field of red splashes.
  for (let i = 0; i < 5; i++) k.solid.box(0.025, 0.017, 0.55,
    13.05 + i * 0.19, a.padY + base + 0.955, -16.93, P.soot, -0.14);
  light(k, a, 17.70, -17, base + 3.30, -Math.PI * 0.5);
  record(a, 'ossuary', { x: 8.5, z: -17, y: a.padY + base },
    [{ x: 11.0, z: -17, y: a.padY + base }]);
}

function relay(k, a) {
  // A recognizable maintenance bay against the cable rack: repair bench, ceramic
  // insulators, dead radios, a perimeter cable run and the doors nobody re-latched.
  const y = groundY(a, -13.8, 2.3) - a.padY;
  table(k, a, -14.6, 2.35, 3.4, 0.90, y, P.iron);
  for (let i = 0; i < 4; i++) {
    const x = -15.8 + i * 0.78;
    k.solid.box(0.51, 0.33, 0.34, x, a.padY + y + 1.08, 2.35, P.green);
    k.solid.box(0.27, 0.13, 0.035, x - 0.06, a.padY + y + 1.13, 2.16, P.soot);
    k.solid.cyl(0.022, 0.022, 0.65, 4, x + 0.17, a.padY + y + 1.51, 2.35, P.iron);
  }
  cabinet(k, a, -18.0, -0.9, 2.0, y, Math.PI * 0.5);
  for (const x of [8.4, 10.7, 13.0]) {
    const base = groundY(a, x, -11.8) - a.padY;
    box(k, a, x, -11.8, 1.7, 0.8, base, 1.1, P.green, 'metal');
    for (let i = 0; i < 5; i++) k.solid.box(1.45, 0.075, 0.04,
      x, a.padY + base + 0.24 + i * 0.15, -11.36, P.soot);
  }
}

function drowned(k, a) {
  // A rescue store by the winch: flotation rings, oars, cork floats and oil crates.
  // The pair of skids makes the existing wreck read as a grounded boat repair area.
  const y = groundY(a, -13, -1) - a.padY;
  for (const x of [-15.0, -11.1]) box(k, a, x, -1, 0.30, 3.8,
    y - 0.05, 0.37, P.timber);
  for (let i = 0; i < 3; i++) {
    const x = -14.7 + i * 1.34;
    beam(k, a, [x, y + 2.3, 4.65], [x + 0.22, y + 0.45, 4.65], 0.038, P.timber);
    k.solid.box(0.22, 0.65, 0.05, x + 0.22, a.padY + y + 0.53, 4.65, P.cloth);
  }
  const ring = new THREE.TorusGeometry(0.54, 0.15, 5, 14);
  ring.translate(-15.30, a.padY + y + 2.9, 4.60); k.solid.push(ring, P.cloth);
  for (let i = 0; i < 7; i++) k.solid.cyl(0.09, 0.09, 0.22, 6,
    -14.7 + i * 0.42, a.padY + y + 2.9 - 0.44 * Math.sin(i * Math.PI / 6),
    4.60, P.rust, 0, 0, Math.PI * 0.5);
  light(k, a, -15.30, 4.66, y + 4.15);
}

function bell(k, a) {
  // The processional court becomes a roofless bell foundry with scale, moulds,
  // a broken casting channel and the wall of small failed bells beside the main one.
  for (const side of [-1, 1]) {
    const x = side * 12.8, y = groundY(a, x, 17) - a.padY;
    table(k, a, x, 17, 3.1, 1.0, y, P.stone);
    for (let i = 0; i < 4; i++) {
      const px = x - 1.06 + i * 0.72;
      k.solid.tube(0.25, 0.10, 0.55 + i * 0.08, 8, px,
        a.padY + y + 1.18 + i * 0.04, 17, i & 1 ? P.green : P.rust);
      k.solid.cyl(0.035, 0.035, 0.24, 5, px,
        a.padY + y + 1.55 + i * 0.08, 17, P.iron);
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = -5.8 - i * 0.72, z = 18.0 + i * 0.20;
    const y = groundY(a, x, z) - a.padY;
    box(k, a, x, z, 0.82, 0.36, y, 0.22, i & 1 ? P.stone : P.rust, 'stone');
  }
}

function jackfield(k, a) {
  // Stalls have harness hooks, cattle tags and trough boards; the loft's back wall
  // carries the last harvest as tied sheaves. Objects stay against known side walls.
  for (let i = 0; i < 4; i++) {
    const z = -3.2 + i * 2.15;
    coat(k, a, -9.64, z, 1.25, Math.PI * 0.5);
    k.solid.box(0.035, 0.25, 0.18, -9.58, a.padY + 1.16, z, P.bone);
    k.solid.box(0.19, 0.035, 1.48, -8.63, a.padY + 0.62, z, P.cloth);
  }
  for (let i = 0; i < 7; i++) {
    const x = 2.35 + i * 1.04;
    coat(k, a, x, 5.55, 4.12, 0);
    k.solid.box(0.045, 0.20, 0.16, x, a.padY + 4.95, 5.45, P.iron);
  }
  for (const z of [-4.8, 0, 4.8]) rib(k, a, 0, z, 19.0, 6.2, 9.2, P.timber);
  // Workbench under the machinery canopy, clear of its existing climb and wheels.
  const y = groundY(a, 21.6, 11.9) - a.padY;
  table(k, a, 21.6, 11.9, 3.0, 1.0, y);
  for (let i = 0; i < 5; i++) k.solid.box(0.18, 0.12, 0.52,
    20.50 + i * 0.47, a.padY + y + 0.98, 11.9, i & 1 ? P.iron : P.rust, 0.18 * i);
  cabinet(k, a, 23.3, 8.7, 2.5, y, -Math.PI * 0.5, P.timber);
  record(a, 'jackfield-stalls', { x: 0, z: -6.4, y: a.padY },
    [{ x: -3.6, z: 2.2, y: a.padY }]);
}

const DETAIL = Object.freeze({
  'weeping-mine': mine, cathedral, chapel: hospice, gallowsfen: fen,
  'hollow-mill': granary, 'garden-of-rest': garden,
  relay, 'drowned-light': drowned, 'bell-tower': bell, jackfield,
});

export function addDestinationDetails(kits, api) {
  const build = DETAIL[api.site.id];
  if (build) build(kits, api);
  // ROUND 18: the climb faces and hidden caches used to be added here, and this function
  // does not run for every destination — Blackthorn Manor and the Avery House are compiled
  // from their own room tables and never call it. They live in places.js _dress() now, which
  // every major goes through whatever built it. See world/climbs-and-caches.js.
}
