// Until She Stopped Fighting: the shapes. Every builder returns one merged, vertex-coloured
// geometry (no uvs) standing on its origin, its front toward +z (the road, once it's turned
// to face it). The steelworks, the town at its gate, and the furnace at the end.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, box, seeded } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export function merge(gs) { gs = gs.map(ni); for (const g of gs) { if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); } return mergeGeometries(gs, false); }
export const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
export function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const P = (g, hex) => paint(g, rgb(hex));
// a profile in x-y pushed out along z (from z0 to z1)
function prism(pts, z0, z1) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); g.translate(0, 0, z0); return g;
}
// the same, the profile in z-y pushed out along x
function prismX(pts, x0, x1) { const g = prism(pts, x0, x1); g.rotateY(Math.PI / 2); g.scale(1, 1, -1); return flipWinding(g); }
function flipWinding(g) { g = ni(g); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } g.computeVertexNormals(); return g; }
// a lattice of four posts, braced, from y0 to y1, w across (x) and d deep (z)
function lattice(x, z, y0, y1, w, d, r, c) {
  const parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(P(tube(V(x + sx * w / 2, y0, z + sz * d / 2), V(x + sx * w / 2, y1, z + sz * d / 2), r), c));
  const n = Math.max(2, Math.round((y1 - y0) / (w * 1.2)));
  for (let k = 0; k < n; k++) {
    const a = y0 + (y1 - y0) * k / n, b = y0 + (y1 - y0) * (k + 1) / n;
    for (const sz of [-1, 1]) parts.push(P(tube(V(x - w / 2, k % 2 ? a : b, z + sz * d / 2), V(x + w / 2, k % 2 ? b : a, z + sz * d / 2), r * 0.6, r * 0.6, 5), c));
    for (const sx of [-1, 1]) parts.push(P(tube(V(x + sx * w / 2, k % 2 ? b : a, z - d / 2), V(x + sx * w / 2, k % 2 ? a : b, z + d / 2), r * 0.6, r * 0.6, 5), c));
  }
  return parts;
}

// ---------------- the works ----------------
export const G = {
  // a long shed, its long side to the road: ribbed walls, a saw-tooth roof, a canopy over the doors
  shed() {
    const parts = [], wall = 0x33333a, roof = 0x232328, rib = 0x29292f;
    parts.push(P(box(60, 22, 24, 0, 11, 0), wall));
    for (let k = 0; k < 31; k++) { const x = -30 + k * 2; parts.push(P(box(0.4, 21.6, 0.3, x, 10.8, 12.12), rib), P(box(0.4, 21.6, 0.3, x, 10.8, -12.12), rib)); }
    for (let k = 0; k < 6; k++) { const x0 = -30 + k * 10; parts.push(P(prism([[x0, 22], [x0 + 10, 22], [x0, 29]], -12, 12), roof)); }
    parts.push(P(box(61, 0.5, 5, 0, 15.6, 14.6), roof));
    for (const x of [-30, -10, 10, 30]) parts.push(P(box(0.35, 15.6, 0.35, x, 7.8, 16.9), rib));
    parts.push(P(box(61, 0.6, 0.6, 0, 22.1, 12.3), 0x1c1c20));
    for (const x of [-29.5, 29.5]) parts.push(P(cyl(0.25, 0.25, 22, 6, x, 11, 12.5), 0x1c1c20));
    return merge(parts);
  },
  // the light in a shed: its doors, the clerestory under the eaves, the glass in the saw-teeth
  shedGlow() {
    const parts = [];
    for (const x of [-20, 0, 20]) parts.push(box(10, 14, 0.3, x, 7, 12.25));
    for (let k = 0; k < 6; k++) parts.push(box(9.2, 1.8, 0.3, -25 + k * 10, 19.6, 12.25));
    for (let k = 0; k < 6; k++) { const g = new THREE.PlaneGeometry(22, 6.2); g.rotateY(-Math.PI / 2); g.translate(-30 + k * 10 - 0.06, 25.4, 0); parts.push(g); }
    return paint(merge(parts), [1, 1, 1]);
  },
  // a stack, banded at the top, a ladder up it and a light ring
  stack() {
    const parts = [P(cyl(3.2, 4.6, 80, 16, 0, 40, 0), 0x45404a), P(cyl(3.35, 3.35, 4, 16, 0, 72, 0), 0xb8382a), P(cyl(3.35, 3.35, 4, 16, 0, 64, 0), 0xd8d4d0), P(cyl(3.7, 3.7, 1, 16, 0, 80, 0), 0x26262a)];
    parts.push(P(cyl(4.4, 4.4, 0.4, 16, 0, 60, 0), 0x2a2a2e));
    parts.push(P(box(0.9, 78, 0.2, 0, 39, 4.0), 0x2a2a2e));
    return merge(parts);
  },
  // a flare stack: a thin pipe, a platform near the top, the tip
  flare() {
    const parts = [P(cyl(0.9, 1.2, 64, 10, 0, 32, 0), 0x3a3a40), P(cyl(2.6, 2.6, 0.4, 12, 0, 56, 0), 0x2a2a2e), P(cyl(1.4, 0.9, 2, 10, 0, 65, 0), 0x2a2622)];
    for (let a = 0; a < 3; a++) parts.push(P(tube(V(Math.cos(a * 2.09) * 14, 0, Math.sin(a * 2.09) * 14), V(0, 40, 0), 0.08, 0.08, 4), 0x1c1c20));
    return merge(parts);
  },
  // a gantry crane across the road: legs both sides, the girders (the trolley and hook ride on them)
  crane() {
    const parts = [], y = 0xd8a82a, d = 0x2a2a30;
    for (const s of [-1, 1]) {
      parts.push(...lattice(s * 30, 0, 0, 31, 2.4, 9, 0.35, y));
      parts.push(P(box(2.6, 1.4, 12, s * 30, 0.7, 0), d));
    }
    parts.push(P(box(64, 3, 1.6, 0, 32.5, -3), y), P(box(64, 3, 1.6, 0, 32.5, 3), y));
    for (let k = -15; k <= 15; k++) parts.push(P(box(0.3, 2.6, 6, k * 2, 32.5, 0), y));
    return merge(parts);
  },
  // what rides the crane: the trolley, the operator's cab under it (lit), the cables and the hook
  hook() {
    const parts = [P(box(7, 2.4, 8, 0, 35.2, 0), 0x2a2a30), P(box(3.2, 3.2, 2.6, 2.6, 29.4, 0), 0x3a3a40)];
    for (const x of [-0.8, 0.8]) parts.push(P(box(0.2, 11, 0.2, x, 28.5, 0), 0x2a2a30));
    parts.push(P(box(3, 2.4, 2, 0, 22.6, 0), 0xd8a82a), P(new THREE.TorusGeometry(1.4, 0.45, 8, 16, Math.PI * 1.4).rotateZ(Math.PI * 0.8).translate(0, 20.2, 0), 0x3a3a40));
    return merge(parts);
  },
  cabGlow() { return paint(box(2.8, 1.4, 2.7, 2.6, 29.9, 0), [1, 1, 1]); },
  // a pipe rack along the road
  pipes() {
    const parts = [];
    for (const z of [-7, 7]) parts.push(P(box(1.2, 16, 1.2, 0, 8, z), 0x34343c));
    parts.push(P(box(1.6, 1.2, 16, 0, 15, 0), 0x34343c), P(box(1.6, 1.0, 16, 0, 10.5, 0), 0x34343c));
    for (const [y, r, c] of [[12.2, 1.1, 0x3a2e28], [12.0, 0.7, 0x2e2e34], [16.4, 1.4, 0x40302a], [16.2, 0.7, 0x2a322a]]) parts.push(P(cyl(r, r, 14.2, 10).rotateZ(Math.PI / 2).translate(0, y, -4 + r * 6), c));
    return merge(parts);
  },
  // a covered conveyor up over the road: low end on its left (+x), high end over the right
  conveyor() {
    const parts = [], c = 0x3a3a42, a = V(62, 9), b = V(-48, 30), d = b.clone().sub(a), L = d.length(), ang = Math.atan2(d.y, d.x);
    const gal = box(L, 3.4, 3.6, 0, 0, 0); gal.rotateZ(ang); gal.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0); parts.push(P(gal, c));
    const rf = box(L, 0.4, 4.4, 0, 1.9, 0); rf.rotateZ(ang); rf.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0); parts.push(P(rf, 0x26262c));
    for (let k = 0; k <= 22; k++) { const u = k / 22, x = a.x + d.x * u, y = a.y + d.y * u; parts.push(P(box(0.3, 3.6, 3.8, x, y, 0).rotateZ(0), 0x2a2a30)); }
    for (const x of [44, -32]) { const yy = a.y + d.y * ((x - a.x) / d.x) - 1.8; parts.push(...lattice(x, 0, 0, yy, 3.4, 3.4, 0.3, 0x2a2a30)); }
    parts.push(P(box(8, 8, 8, 64, 4, 0), 0x3a3634), P(box(9, 0.6, 9, 64, 8.3, 0), 0x26262c));
    parts.push(P(box(8, 6, 8, -50, 29, 0), 0x3a3634));
    parts.push(...lattice(-50, 0, 0, 26, 7, 7, 0.4, 0x2a2a30));
    return merge(parts);
  },
  conveyorGlow() {
    const a = V(62, 9), b = V(-48, 30), d = b.clone().sub(a), L = d.length(), ang = Math.atan2(d.y, d.x), parts = [];
    for (const z of [-1.85, 1.85]) { const g = box(L * 0.96, 0.7, 0.1, 0, 0.3, z); g.rotateZ(ang); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0); parts.push(g); }
    return paint(merge(parts), [1, 1, 1]);
  },
  // an ore car on the sidings
  hopper() {
    const parts = [P(prismX([[-4.6, 2.2], [4.6, 2.2], [5.2, 5.4], [-5.2, 5.4]], -1.6, 1.6), 0x4a2c22)];
    parts.push(P(box(3.4, 0.25, 10.6, 0, 5.5, 0), 0x3a2218));
    for (const z of [-3.4, 3.4]) { parts.push(P(box(2.6, 0.8, 2.4, 0, 1.0, z), 0x1a1a1e)); for (const x of [-1.2, 1.2]) for (const zz of [-0.8, 0.8]) parts.push(P(cyl(0.45, 0.45, 0.25, 10).rotateZ(Math.PI / 2).translate(x, 0.5, z + zz), 0x141416)); }
    parts.push(P(box(0.6, 0.5, 11.4, 0, 1.4, 0), 0x1a1a1e));
    parts.push(P(box(3.2, 1.0, 9.6, 0, 6.0, 0), 0x2a2420));
    return merge(parts);
  },
  // a hot-metal car: the torpedo on its bogies, its mouth on top
  torpedo() {
    const parts = [P(cyl(2.3, 2.3, 9, 16).rotateX(Math.PI / 2), 0x4a3a32)];
    for (const s of [-1, 1]) parts.push(P(cyl(2.3, 0.9, 4.4, 16).rotateX(s * Math.PI / 2).translate(0, 0, s * 6.7), 0x4a3a32));
    parts.forEach((g) => g.translate(0, 3.6, 0));
    parts.push(P(cyl(1.0, 1.2, 1.0, 12, 0, 6.2, 0), 0x2a2420), P(box(1.4, 0.6, 18, 0, 1.3, 0), 0x1a1a1e));
    for (const z of [-7.5, -4.5, 4.5, 7.5]) { parts.push(P(box(2.6, 0.8, 2.2, 0, 0.9, z), 0x1a1a1e)); for (const x of [-1.1, 1.1]) parts.push(P(cyl(0.42, 0.42, 0.22, 10).rotateZ(Math.PI / 2).translate(x, 0.45, z), 0x141416)); }
    for (const s of [-1, 1]) parts.push(P(box(0.4, 3.4, 0.4, s * 2.0, 2.2, 0), 0x1a1a1e));
    return merge(parts);
  },
  // the ladle: a great bucket on its bail
  ladle() {
    const parts = [P(lathe([[0, 0], [7, 0], [9, 2], [10.6, 14], [11, 15], [10.2, 15.4], [9.6, 14.2], [8.2, 2.8], [0, 1.4]], 24), 0x3a2a24)];
    for (const s of [-1, 1]) parts.push(P(cyl(0.9, 0.9, 3, 10).rotateZ(Math.PI / 2).translate(s * 11.6, 9, 0), 0x2a2a30));
    for (const y of [4, 9, 13]) parts.push(P(new THREE.TorusGeometry(10.1 - (13 - y) * 0.12, 0.3, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), 0x2a1e1a));
    const bail = new THREE.TorusGeometry(12.4, 0.7, 8, 24, Math.PI); bail.translate(0, 9, 0); parts.push(P(bail, 0x2a2a30));
    parts.push(P(box(1.6, 3, 1.6, 0, 21.8, 0), 0x2a2a30));
    return merge(parts);
  },
  ladleTop() { return paint(cyl(9.9, 9.9, 0.4, 24, 0, 13.6, 0), [1, 1, 1]); },
  // ingot molds in a row (the metal in them is its own)
  molds() { const parts = []; for (let k = 0; k < 6; k++) parts.push(P(box(4.4, 6, 4.4, -12.5 + k * 5, 3, 0), 0x2a2626)); parts.push(P(box(32, 1, 7, 0, 0.5, 0), 0x1a1a1c)); return merge(parts); },
  moldMetal() { const parts = []; for (let k = 0; k < 6; k++) parts.push(box(3.4, 0.4, 3.4, -12.5 + k * 5, 6.0, 0)); return merge(parts); },
  // the steam hammer: the frame and the anvil; the ram is its own
  hammer() {
    return merge([P(box(5, 34, 6, -12, 17, 0), 0x2a3a4a), P(box(5, 34, 6, 12, 17, 0), 0x2a3a4a), P(box(30, 7, 8, 0, 37, 0), 0x2a3a4a), P(cyl(3.4, 3.4, 10, 16, 0, 44, 0), 0x3a4a5a),
      P(box(16, 6, 10, 0, 3, 0), 0x1a1a1e), P(box(10, 3, 8, 0, 7.5, 0), 0x2a2a2e), P(cyl(0.6, 0.6, 14, 8, 3, 46, 0), 0x6a6a70)]);
  },
  ram() { return merge([P(box(12, 9, 8, 0, 0, 0), 0x3a3a40), P(cyl(1.4, 1.4, 20, 10, 0, 14, 0), 0x8a8a90)]); },
  billet() { return box(7, 2.4, 5, 0, 10.2, 0); },
  // the roller table: rollers along a bed
  rollers() { const parts = [P(box(10, 14, 40, 0, 7, 0), 0x1a1a1e)]; for (let k = 0; k < 16; k++) parts.push(P(cyl(0.9, 0.9, 8, 10).rotateZ(Math.PI / 2).translate(0, 14.8, -18.75 + k * 2.5), 0x4a4a50)); return merge(parts); },
  slab() { return box(7, 2, 24, 0, 16.6, 0); },
  // a coil on its winder
  coil() { const g = new THREE.TorusGeometry(7, 3.6, 12, 32); g.translate(0, 12, 0); return g; },
  coilStand() { return merge([P(box(4, 8, 6, -9, 4, 0), 0x2a2a30), P(box(4, 8, 6, 9, 4, 0), 0x2a2a30), P(cyl(1.2, 1.2, 22, 10).rotateZ(Math.PI / 2).translate(0, 12, 0), 0x5a5a60)]); },
  // the reheat furnace beside the mill: a long box with doors (the doors' light is its own)
  reheat() {
    const parts = [P(box(14, 12, 44, 0, 6, 0), 0x3a3434), P(box(15, 1, 45, 0, 12.5, 0), 0x26262a)];
    for (let k = 0; k < 4; k++) parts.push(P(cyl(1.2, 1.4, 18, 10, -3, 21, -15 + k * 10), 0x34343a));
    for (let k = 0; k < 6; k++) parts.push(P(box(0.6, 12, 0.6, 7.2, 6, -20 + k * 8), 0x26262a));
    return merge(parts);
  },
  reheatDoors() { const parts = []; for (let k = 0; k < 5; k++) parts.push(box(0.2, 4.2, 5.2, 7.25, 4.2, -16 + k * 8)); return paint(merge(parts), [1, 1, 1]); },
  // ingots cooling
  ingot() { return box(5, 4, 10, 0, 2, 0); },
  // the converter on its trunnions
  converter() {
    const parts = [P(lathe([[0, 0], [8, 0.4], [11, 5], [12, 14], [10, 24], [6, 30], [5.4, 32], [0, 32]], 24), 0x3a3a40)];
    for (const y of [8, 16, 22]) parts.push(P(new THREE.TorusGeometry(y < 20 ? 12.1 : 10.6, 0.35, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), 0x2a2a2e));
    parts.push(P(box(4, 30, 6, -16, 15, 0), 0x2a2a30), P(box(4, 30, 6, 16, 15, 0), 0x2a2a30), P(cyl(2, 2, 34, 12).rotateZ(Math.PI / 2).translate(0, 26, 0), 0x4a4a50));
    parts.push(P(box(40, 2, 14, 0, 1, 0), 0x1c1c20));
    return merge(parts);
  },
  // slag: a pot on its carrier
  slagPot() { return merge([P(lathe([[0, 0], [5, 0], [9, 10], [10, 11], [0, 11]], 20), 0x2a2626), P(box(16, 3, 10, 0, -2, 0), 0x1a1a1e)]); },
  // the runner: a channel along the road for the iron (its iron is its own)
  runner() { const parts = [P(box(9, 0.4, 40, 0, 0.2, 0), 0x1c1816)]; for (const x of [-4, 4]) parts.push(P(box(1.0, 1.5, 40, x, 0.75, 0), 0x2a2420)); for (const z of [-19.5, 19.5]) parts.push(P(box(9, 1.5, 1.0, 0, 0.75, z), 0x2a2420)); return merge(parts); },
  runnerIron() { return box(7, 0.5, 39, 0, 1.0, 0); },
  // the trough under the road at the tap: a channel along x, sunk in the floor (its iron is its own)
  trough() {
    const parts = [];
    for (const s of [-1, 1]) parts.push(P(box(150, 2.6, 2.2, 0, 1.3, s * 6.2), 0x2a2420));
    parts.push(P(box(150, 0.6, 14.6, 0, -0.3, 0), 0x1c1816));
    for (let k = -7; k <= 7; k++) parts.push(P(box(1.2, 3.2, 15, k * 10, 1.6, 0), 0x26201c));
    return merge(parts);
  },
  troughIron() { return box(150, 1.2, 10.4, 0, 1.6, 0); },
  // the iron in the casting pit under the first jump
  pitPool() { const g = new THREE.CylinderGeometry(13, 13, 0.6, 32); g.scale(1, 1, 1.7); g.translate(0, 0.3, 0); return g; },
  // the soaking pit: its block, a small gantry over it (its lid and the tongs are their own)
  soakPit() {
    const parts = [P(box(18, 2.6, 14, 0, 1.3, 0), 0x4a4640), P(box(9, 0.3, 9, 0, 2.62, 0), 0x0e0c0c)];
    for (const s of [-1, 1]) parts.push(...lattice(s * 11, 0, 0, 22, 1.6, 4, 0.25, 0xc89a2a));
    parts.push(P(box(24, 1.8, 2.4, 0, 22.6, -1.4), 0xc89a2a), P(box(24, 1.8, 2.4, 0, 22.6, 1.4), 0xc89a2a), P(box(4, 2.2, 5, 0, 24.4, 0), 0x2a2a30));
    return merge(parts);
  },
  soakLid() { return P(box(9.6, 0.9, 9.6, 0, 0.45, 0), 0x3a3634); },
  tongs() {
    const parts = [P(box(0.2, 12, 0.2, 0, 6, 0), 0x2a2a30)];
    for (const s of [-1, 1]) parts.push(P(tube(V(0, 0, 0), V(s * 1.6, -2.2, 0), 0.25), 0x34343a), P(tube(V(s * 1.6, -2.2, 0), V(s * 1.5, -4.2, 0), 0.25), 0x34343a));
    parts.push(P(box(1.6, 1, 1, 0, 0, 0), 0x34343a));
    return merge(parts);
  },
  soakIngot() { return box(2.8, 8, 2.8, 0, 4, 0); },
  // the quench tower: concrete, open at the top, the track through its foot
  quench() {
    const parts = [P(box(13, 46, 13, 0, 23, 0), 0x5a5650), P(box(13.6, 1.2, 13.6, 0, 46.6, 0), 0x3a3836), P(box(13.2, 8, 9, 0, 4, 0), 0x141210)];
    for (let k = 0; k < 4; k++) parts.push(P(box(13.4, 0.4, 0.5, 0, 40 + k * 1.6, 6.7), 0x2a2826));
    for (let k = 0; k < 6; k++) parts.push(P(box(0.4, 44, 0.4, -6.6 + k * 2.64, 22, 6.65), 0x4a4640));
    parts.push(P(box(60, 12, 14, 40, 6, 0), 0x4a2a22), P(box(61, 1, 15, 40, 12.5, 0), 0x2a2220));
    for (let k = 0; k < 14; k++) parts.push(P(box(1.4, 9, 0.2, 13 + k * 4, 5.5, 7.05), 0x1e1814));
    return merge(parts);
  },
  // the mill gate: two braced towers, the truss over the road, the guard's hut
  gate() {
    const parts = [], c = 0x3a3a42;
    for (const s of [-1, 1]) parts.push(...lattice(s * 21, 0, 0, 26, 3, 3, 0.3, c));
    parts.push(P(box(46, 0.5, 0.5, 0, 24, -1.5), c), P(box(46, 0.5, 0.5, 0, 24, 1.5), c), P(box(46, 0.5, 0.5, 0, 27.5, -1.5), c), P(box(46, 0.5, 0.5, 0, 27.5, 1.5), c));
    for (let k = 0; k < 15; k++) { const x0 = -21 + k * 3; for (const z of [-1.5, 1.5]) parts.push(P(tube(V(x0, k % 2 ? 24 : 27.5, z), V(x0 + 3, k % 2 ? 27.5 : 24, z), 0.18, 0.18, 5), c)); }
    parts.push(P(box(4, 3.2, 3.2, -26, 1.6, 3), 0x5a5048), P(box(4.6, 0.3, 3.8, -26, 3.35, 3), 0x2a2422));
    for (const s of [-1, 1]) parts.push(P(box(1.6, 0.6, 1.0, s * 12, 23.4, 1.8), 0x1a1a1e));
    return merge(parts);
  },
  // a steam whistle on a roof
  whistle() { return merge([P(cyl(0.3, 0.3, 3, 8, 0, 1.5, 0), 0x3a3a40), P(cyl(0.7, 0.7, 2.4, 12, 0, 4.2, 0), 0xb8902a), P(cyl(0.2, 0.9, 0.5, 12, 0, 5.65, 0), 0x8a6a1a)]); },
};

// ---------------- the town at the gate ----------------
export const T = {
  // the bar: two storeys of brick at the gate, a canopy over its door, a ghost sign up its side
  bar() {
    const parts = [], br = 0x6a2e22, dk = 0x1e1614;
    parts.push(P(box(18, 9, 12, 0, 4.5, 0), br), P(box(18.8, 0.8, 12.8, 0, 9.3, 0), dk), P(box(18.8, 0.5, 12.8, 0, 3.6, 0), 0x3a1e18));
    for (const x of [-6, 0, 6]) parts.push(P(box(4.2, 2.8, 0.25, x === 0 ? 4.5 : x, 1.9, 6.05), dk));
    parts.push(P(box(2, 3.2, 0.3, -1.5, 1.6, 6.1), 0x2a1a14));
    for (const x of [-6.6, -2.2, 2.2, 6.6]) parts.push(P(box(2.2, 2.4, 0.2, x, 6.3, 6.04), 0x120e0c));
    parts.push(P(box(4.4, 0.25, 2, -1.5, 3.55, 7.1).rotateX(-0.25), 0x3a1a16));
    parts.push(P(box(0.4, 2.4, 0.4, 9.2, 1.2, 5.8), 0x2a2a2e));
    // the roof: a parapet, a vent, the sign's frame
    parts.push(P(box(3, 1.6, 2.4, -5, 10.5, -2), 0x2a2a2e), P(box(0.3, 3.6, 0.3, -3.8, 11.4, 4.4), 0x2a2a2e), P(box(0.3, 3.6, 0.3, 3.8, 11.4, 4.4), 0x2a2a2e));
    // pickups out front
    return merge(parts);
  },
  barGlow() {
    const parts = [];
    for (const x of [-6, 6]) parts.push(box(3.8, 2.4, 0.1, x, 1.9, 6.2));
    parts.push(box(3.8, 2.4, 0.1, 4.5, 1.9, 6.2), box(1.6, 0.5, 0.1, -1.5, 3.0, 6.3));
    parts.push(box(1.8, 2.0, 0.1, 2.2, 6.3, 6.16));
    return paint(merge(parts), [1, 1, 1]);
  },
  // a terrace of six houses (walls in the windowed building material; the rest is trim)
  rowWalls() { const g = new THREE.BoxGeometry(36, 6.6, 9); g.translate(0, 3.3, 0); return g; },
  rowTrim() {
    const parts = [], roof = 0x2a2626, ch = 0x5a2a20, pr = 0x8a8478;
    parts.push(P(prismX([[-5.2, 6.4], [5.2, 6.4], [0, 10.2]], -18.3, 18.3), roof));
    for (let k = 0; k <= 6; k++) { const x = -18 + k * 6; parts.push(P(prismX([[-4.7, 6.3], [4.7, 6.3], [0, 10.55]], x - 0.25, x + 0.25), 0x4a2a22)); if (k > 0 && k < 6) parts.push(P(box(1.2, 2.4, 1.6, x, 10.6, -1.2), ch)); }
    for (let k = 0; k < 6; k++) {
      const x = -15 + k * 6;
      parts.push(P(box(4.6, 0.25, 2.4, x, 3.2, 5.7), 0x3a3634), P(box(4.6, 0.4, 2.4, x, 0.6, 5.7), 0x4a4640));
      for (const s of [-1, 1]) parts.push(P(box(0.18, 2.6, 0.18, x + s * 2.1, 1.9, 6.8), pr));
      parts.push(P(box(4.6, 0.12, 0.08, x, 1.5, 6.85), pr));
      parts.push(P(box(1.0, 2.2, 0.12, x - 1.4, 1.9, 4.56), 0x2a1a14));
    }
    return merge(parts);
  },
  // the church on the hill: a brick nave along x (its windows to the road, +z), the tower at its
  // left end, the spire; the glass is its own
  church() {
    const parts = [], br = 0x5a2a22, dk = 0x2a1a16, st = 0x6a625a;
    parts.push(P(box(30, 13, 14, 2, 6.5, 0), br), P(prismX([[-7.6, 13], [7.6, 13], [0, 20.5]], -13.4, 17.4), 0x2a2224));
    for (let k = 0; k < 8; k++) parts.push(P(box(1.0, 9, 1.2, -11.6 + k * 3.8, 4.5, 7.4), dk));
    parts.push(P(box(8, 30, 8, -17, 15, 0), br), P(box(8.6, 1, 8.6, -17, 30.5, 0), st));
    parts.push(P(new THREE.ConeGeometry(5.6, 20, 4).rotateY(Math.PI / 4).translate(-17, 41, 0), 0x2a2628));
    for (const [x, z] of [[-21, -4], [-13, -4], [-21, 4], [-13, 4]]) parts.push(P(new THREE.ConeGeometry(0.6, 3.6, 4).rotateY(Math.PI / 4).translate(x, 32.8, z), 0x2a2628));
    parts.push(P(box(3.2, 5, 0.3, -17, 2.5, 4.1), 0x1a1210));
    parts.push(P(box(0.35, 3.4, 0.35, -17, 52.6, 0), 0x8a8478), P(box(1.8, 0.35, 0.35, -17, 53.3, 0), 0x8a8478));
    return merge(parts);
  },
  // the church's glass: each window carries its number (aWin) so they can go out one by one
  churchGlass() {
    const parts = [];
    const win = (x, y, w, h, z, i, c) => { const g = new THREE.PlaneGeometry(w, h, 1, 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) if (p.getY(k) > h / 2 - 0.01) p.setX(k, p.getX(k) * 0.15); g.translate(x, y, z); paint(g, c); const n = g.attributes.position.count; g.setAttribute('aWin', new THREE.BufferAttribute(new Float32Array(n).fill(i), 1)); return g; };
    const cols = [[1.0, 0.35, 0.2], [0.35, 0.5, 1.0], [1.0, 0.8, 0.3], [0.8, 0.3, 0.7]];
    for (let k = 0; k < 7; k++) parts.push(win(-9.7 + k * 3.8, 7.2, 2.0, 6.4, 7.06, k + 1, cols[k % 4]));
    parts.push(win(-17, 20, 2.4, 6, 4.06, 8, [1.0, 0.75, 0.35]), win(-17, 8, 2.4, 4.4, 4.06, 0, [1.0, 0.6, 0.3]));
    const g = merge(parts.map((p) => { p.deleteAttribute('uv'); return p; }));
    return g;
  },
};

// ---------------- the memorial at the fence, and the posters ----------------
// where the candles' flames are (memorial-local x, y, z), filled in when it's built
export const FLAMES = [];
export const M = {
  // a run of chain-link between posts, ribbons tied on it, flowers and candles at its foot, a frame
  memorial() {
    const parts = [], R = seeded(23), wire = 0x6a6a70;
    for (let k = 0; k <= 6; k++) parts.push(P(cyl(0.07, 0.07, 3.2, 6, -9 + k * 3, 1.6, 0), 0x8a8a90));
    parts.push(P(cyl(0.05, 0.05, 18, 6).rotateZ(Math.PI / 2).translate(0, 3.1, 0), 0x8a8a90));
    for (let k = 0; k < 13; k++) parts.push(P(box(18, 0.03, 0.03, 0, 0.3 + k * 0.22, 0), wire));
    for (let k = 0; k < 61; k++) parts.push(P(box(0.03, 2.8, 0.03, -9 + k * 0.3, 1.7, 0), wire));
    const rib = [0xf4f0ea, 0xf2d24a, 0xf4a8c0, 0xc8d8f8, 0xf4f0ea];
    for (let k = 0; k < 46; k++) { const x = -8.6 + R() * 17.2, y = 0.8 + R() * 2.1; const g = box(0.14, 0.55 + R() * 0.3, 0.02, x, y - 0.3, 0.06); g.rotateZ(0); parts.push(P(g, rib[k % rib.length])); parts.push(P(box(0.3, 0.1, 0.05, x, y, 0.06), rib[k % rib.length])); }
    const fl = [0xd8203a, 0xf4f0ea, 0xf48ab0, 0xf2c84a, 0xb83a8a, 0xf4f0ea];
    for (let k = 0; k < 34; k++) {
      const x = -8.5 + R() * 17, z = 0.35 + R() * 1.2;
      for (let j = 0; j < 5; j++) parts.push(P(sph(0.16 + R() * 0.06, 1, 0.8, 1, x + (R() - 0.5) * 0.5, 0.35 + R() * 0.45, z + (R() - 0.5) * 0.4, 6, 4), fl[(k + j) % fl.length]));
      parts.push(P(box(0.6, 0.3, 0.4, x, 0.15, z), 0x2a4a22));
    }
    FLAMES.length = 0;
    for (let k = 0; k < 23; k++) { const x = -7.8 + (k / 22) * 15.6 + (R() - 0.5) * 0.3, z = 0.9 + R() * 0.7; parts.push(P(cyl(0.12, 0.12, 0.34, 8, x, 0.17, z), k % 3 ? 0x8a1a1a : 0xd8d4cc), P(cyl(0.05, 0.05, 0.2, 6, x, 0.42, z), 0xf4f0e0)); FLAMES.push([x, 0.58, z]); }
    parts.push(P(box(1.0, 1.3, 0.08, 1.2, 1.0, 0.25).rotateX(-0.2), 0x2a1a10), P(box(0.8, 1.06, 0.04, 1.2, 1.0, 0.31).rotateX(-0.2), 0xb8b4ac));
    parts.push(P(sph(0.32, 1, 1, 0.8, -3.2, 0.42, 0.7), 0x8a6a4a), P(sph(0.22, 1, 1, 0.9, -3.2, 0.92, 0.72), 0x8a6a4a));
    return merge(parts);
  },
  // a bedsheet hung on the fence (the words go on it): a little wave in it
  sheet() {
    const g = new THREE.PlaneGeometry(12, 4.4, 16, 4); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k); p.setZ(k, 0.12 * Math.sin(x * 1.3) + 0.06 * Math.sin(y * 2.1 + x)); p.setY(k, y - 0.25 * Math.cos(x / 12 * Math.PI) * (y < 0 ? 1 : 0.2)); }
    g.computeVertexNormals(); g.translate(0, 0, 0); return P(g, 0xd8d2c8);
  },
  // the post a poster's on, and the paper (its header is a sign)
  posterPole() {
    const parts = [P(cyl(0.12, 0.16, 7.5, 6, 0, 3.75, 0), 0x3a3a40), P(box(0.12, 0.12, 1.8, 0, 7.4, 0.9), 0x3a3a40)];
    parts.push(P(box(1.1, 1.5, 0.02, 0, 2.6, 0.17), 0xd8d4cc), P(box(0.7, 0.55, 0.01, 0, 2.55, 0.185), 0x8a8680));
    for (let k = 0; k < 4; k++) parts.push(P(box(0.8, 0.04, 0.01, 0, 2.08 - k * 0.12, 0.185), 0x5a5650));
    return merge(parts);
  },
  // a sodium lamp on a pole (its glow is drawn by the part)
  lamp() { return merge([P(cyl(0.12, 0.18, 9, 6, 0, 4.5, 0), 0x3a3a40), P(box(0.14, 0.14, 2.6, 0, 8.9, 1.3), 0x3a3a40), P(box(0.5, 0.25, 0.9, 0, 8.8, 2.5), 0x26262a)]); },
};

// ---------------- the blast furnace (the cast at the end of the night, and the morning) ----------------
// stands on its origin; the cast house reaches toward +z
export function furnace(R = seeded(5)) {
  const parts = [], shell = 0x4a4044, dark = 0x2a2628, st = 0x5a5054;
  parts.push(P(lathe([[0, 0], [16, 0], [17, 8], [14, 30], [11, 54], [9, 60], [0, 60]], 28), shell));
  for (const [y, r] of [[12, 16.6], [26, 14.8], [40, 12.6], [52, 10.8]]) parts.push(P(new THREE.TorusGeometry(r, 0.7, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), dark));
  // the bustle pipe round its waist, the tuyeres down to it
  parts.push(P(new THREE.TorusGeometry(19, 1.6, 8, 40).rotateX(Math.PI / 2).translate(0, 16, 0), 0x3a3438));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; parts.push(P(tube(V(Math.cos(a) * 18.5, 16, Math.sin(a) * 18.5), V(Math.cos(a) * 16.4, 9, Math.sin(a) * 16.4), 0.5), dark)); }
  // the top: platforms, uptakes into the downcomer, the bleeders
  parts.push(P(cyl(13, 13, 1, 24, 0, 60.5, 0), dark));
  for (const a of [0.6, 2.2, 3.8, 5.4]) parts.push(P(tube(V(Math.cos(a) * 6, 60, Math.sin(a) * 6), V(Math.cos(a) * 3, 78, Math.sin(a) * 3), 1.6, 1.4, 10), dark));
  parts.push(P(cyl(5, 5, 3, 16, 0, 79, 0), dark), P(tube(V(0, 80, 0), V(0, 88, 0), 1.4), dark), P(tube(V(0, 79, 0), V(-30, 64, -4), 2.6, 2.6, 12), dark));
  // the dust catcher
  parts.push(P(cyl(7, 7, 18, 20, -34, 50, -4), st), P(new THREE.ConeGeometry(7, 9, 20).rotateX(Math.PI).translate(-34, 36.5, -4), st), P(tube(V(-34, 32, -4), V(-34, 0, -4), 1.2), dark));
  for (const [x, z] of [[-39, -9], [-29, -9], [-39, 1], [-29, 1]]) parts.push(P(box(1, 32, 1, x, 16, z), dark));
  // the stoves: four tall domes in a row behind
  for (let k = 0; k < 4; k++) { const x = 30 + k * 16; parts.push(P(cyl(7, 7, 54, 20, x, 27, -26), st), P(sph(7, 1, 0.75, 1, x, 54, -26, 20, 10), st), P(new THREE.TorusGeometry(7.1, 0.4, 6, 24).rotateX(Math.PI / 2).translate(x, 20, -26), dark)); }
  parts.push(P(tube(V(30, 18, -26), V(14, 16, -6), 2.2, 2.2, 10), dark), P(box(70, 3, 3, 54, 18, -17), dark));
  parts.push(P(cyl(5.5, 7, 110, 16, 110, 55, -30), 0x3a3438), P(cyl(5.6, 5.6, 4, 16, 110, 100, -30), 0xa83a2a));
  // the skip incline up to the top, with its bridge
  const a = V(80, 0, 18), b = V(6, 76, 2), d = b.clone().sub(a), L = d.length();
  const inc = box(4, 3, L, 0, 0, 0); inc.lookAt(d); inc.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); parts.push(P(inc, 0x3a3a42));
  for (let k = 1; k < 6; k++) { const u = k / 6; parts.push(P(box(1.2, a.y + d.y * u, 1.2, a.x + d.x * u, (a.y + d.y * u) / 2, a.z + d.z * u), 0x2a2a30)); }
  parts.push(P(box(26, 14, 20, 82, 7, 22), 0x4a4440), P(box(27, 1, 21, 82, 14.5, 22), dark));
  // the cast house reaching toward the road, its roof and the runners' hood
  parts.push(P(box(48, 18, 30, 0, 9, 34), 0x3a3438), P(prism([[-25, 18], [25, 18], [0, 25]], 19, 49), dark));
  for (let k = 0; k < 9; k++) parts.push(P(box(0.6, 18, 0.6, -24 + k * 6, 9, 49.2), 0x26262a));
  // the gantries and stairs round it all
  for (let k = 0; k < 3; k++) parts.push(P(cyl(18.5 - k * 2.4, 18.5 - k * 2.4, 0.5, 32, 0, 24 + k * 14, 0), 0x26262a));
  for (let k = 0; k < 20; k++) { const x = (R() - 0.5) * 160, z = -60 - R() * 40; parts.push(P(box(8 + R() * 14, 6 + R() * 24, 8 + R() * 10, x, 0, z).translate(0, 3, 0), 0x2a2628)); }
  return merge(parts);
}
// the light in it: the cast house doors and its clerestory, the stoves' lit platforms
export function furnaceGlow() {
  const parts = [];
  for (const x of [-15, 0, 15]) parts.push(box(9, 12, 0.3, x, 6.5, 49.4));
  for (let k = 0; k < 8; k++) parts.push(box(5, 1.6, 0.3, -21 + k * 6, 15.6, 49.4));
  for (let k = 0; k < 4; k++) parts.push(box(10, 0.5, 0.5, 30 + k * 16, 20.4, -18.8));
  return paint(merge(parts), [1, 1, 1]);
}
