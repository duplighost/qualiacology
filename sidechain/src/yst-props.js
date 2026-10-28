// If You See This: the things, at the size they take up from the road, and the pictures painted on
// them. (yst-world.js puts them where he sings them.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded, box } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const torus = (r, t, x, y, z, n = 40) => { const g = new THREE.TorusGeometry(r, t, 8, n); g.translate(x, y, z); return g; };
export { paint, rgb, seeded, box };

const WHITE = rgb(0xf0eee8), ENAMEL = rgb(0xe8ece8), CHROME = rgb(0xb8c0c8), DARK = rgb(0x22242a), WOOD = rgb(0x6a4428), DWOOD = rgb(0x3a2418);
export const CERULEAN = [0.16, 0.48, 0.86], TEAL = [0.1, 0.62, 0.6];

// ---------- the laundromat ----------
// a washer with its dryer stacked on top, front at +z: enamel, the coin plates, the door rings
// (the glass and the washing going round are the drum layer's)
export function washTower() {
  const p = [];
  p.push(paint(box(11, 10.6, 10, 0, 5.3, 0), ENAMEL), paint(box(11.2, 0.5, 10.2, 0, 10.6, 0), rgb(0xc8ccd0)));
  p.push(paint(box(11, 11, 10, 0, 16.4, 0), ENAMEL), paint(box(11.2, 0.5, 10.2, 0, 21.9, 0), rgb(0xc8ccd0)));
  // the control strip and coin plate on each
  for (const y of [9.4, 20.7]) {
    p.push(paint(box(10.4, 1.6, 0.4, 0, y, 5.1), rgb(0x3a3e46)));
    p.push(paint(box(2.6, 1.1, 0.5, -3.4, y, 5.25), CHROME));
    for (const x of [-4.1, -3.4, -2.7]) p.push(paint(box(0.26, 0.6, 0.2, x, y, 5.55), DARK));
    p.push(paint(cyl(0.45, 0.45, 0.5, 14, 0, 0, 0).rotateX(Math.PI / 2).translate(3.4, y, 5.3), CHROME));
    p.push(paint(box(0.9, 0.3, 0.3, 1.6, y, 5.35), rgb(0xff5a3a)));
  }
  // the door rings: chrome round the glass
  p.push(paint(torus(3.5, 0.42, 0, 4.6, 5.2), CHROME), paint(torus(3.9, 0.42, 0, 15.6, 5.2), CHROME));
  p.push(paint(box(0.6, 1.6, 0.5, 3.9, 4.6, 5.6), CHROME), paint(box(0.6, 1.6, 0.5, 4.3, 15.6, 5.6), CHROME));
  // feet and the kick plate
  p.push(paint(box(10.6, 0.8, 0.3, 0, 0.6, 5.05), rgb(0x9aa0a8)));
  return merge(p);
}
// the round glass of a door: a disc facing +z (drawn by the drum shader)
export function drumDisc() { const g = new THREE.CircleGeometry(1, 40); return g; }

// the folding table: neat squares at one end, the chaos at the other
export function foldTable() {
  const p = [paint(box(30, 1, 11, 0, 9, 0), rgb(0xd8d4c8)), paint(box(30.4, 0.5, 11.4, 0, 8.4, 0), rgb(0x9aa0a8))];
  for (const [x, z] of [[-14, -5], [14, -5], [-14, 5], [14, 5]]) p.push(paint(box(0.8, 8.2, 0.8, x, 4.1, z), rgb(0x8a9098)));
  const R = seeded(77), cols = [0xe8c8a0, 0x6a8ac8, 0xf0ece4, 0xc86a6a, 0x4a6a5a, 0xe8d860, 0x8a5aa8, 0x2a3a5a];
  // three stacks, folded square
  for (let s = 0; s < 3; s++) {
    let y = 9.85;
    const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) { const h = 0.55 + R() * 0.25; p.push(paint(box(4.2, h, 4.2, 4 + s * 5, y + h / 2, (R() - 0.5) * 0.4).rotateY((R() - 0.5) * 0.08), rgb(cols[Math.floor(R() * cols.length)]))); y += h; }
  }
  // the chaos: a heap of washing, sleeves hanging off
  for (let k = 0; k < 16; k++) p.push(paint(sph(1.6 + R() * 1.2, 1.4, 0.6, 1, -9 + (R() - 0.5) * 8, 10.5 + R() * 1.6, (R() - 0.5) * 6, 8, 6), rgb(cols[Math.floor(R() * cols.length)])));
  // (each sleeve a little in front of the last: tilted, neighbours overlapped at the same depth and flickered)
  for (let k = 0; k < 4; k++) p.push(paint(box(1.2, 4 + R() * 3, 0.3, -12 + k * 2.4, 7.5, 5.6 + 0.05 * k).rotateZ((R() - 0.5) * 0.4), rgb(cols[Math.floor(R() * cols.length)])));
  return merge(p);
}
// the change machine on its stand: the quarters come out at the bottom
export function changeMachine() {
  const p = [paint(box(9, 19, 5, 0, 9.5, 0), rgb(0x8a8e96)), paint(box(8, 12, 0.3, 0, 11, 2.6), rgb(0xc8ccd2))];
  p.push(paint(box(5.6, 1.2, 0.5, 0, 14, 2.8), DARK), paint(box(1.8, 0.4, 0.5, 2, 9.6, 2.8), DARK));
  p.push(paint(box(4, 2.6, 2.2, 0, 3.6, 3.4), rgb(0x5a5e66)), paint(box(3.4, 0.4, 1.8, 0, 2.5, 3.6), rgb(0x3a3e44)));
  p.push(paint(box(8, 2.4, 0.4, 0, 17.4, 2.7), rgb(0x2a6ab8)));
  for (let k = 0; k < 7; k++) p.push(paint(cyl(0.48, 0.48, 0.16, 14, -1.2 + (k % 4) * 0.8, 2.8 + Math.floor(k / 4) * 0.18, 3.5 + (k % 2) * 0.3), rgb(0xc8ccd4)));
  return merge(p);
}
// a quarter, spun out of the machine
export function quarter() { const g = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 16); g.rotateX(Math.PI / 2); return paint(g, rgb(0xd8dce4)); }
// the slatted bench along the windows
export function bench() {
  const p = [];
  for (let k = 0; k < 3; k++) p.push(paint(box(22, 0.5, 1.4, 0, 6.2, -1.6 + k * 1.6), rgb(0xa86a3a)));
  for (let k = 0; k < 2; k++) p.push(paint(box(22, 1.2, 0.4, 0, 9 + k * 2, -3.2), rgb(0xa86a3a)));
  for (const x of [-9.5, 9.5]) { p.push(paint(box(0.6, 6, 0.6, x, 3, 1.6), DARK), paint(box(0.6, 12, 0.6, x, 6, -3.4), DARK), paint(box(0.6, 0.6, 5, x, 5.8, -0.9), DARK)); }
  return merge(p);
}
// her paints left on the bench: the jar of brushes, the palette with the blue on it, a tube
export function paints() {
  const p = [paint(cyl(1.3, 1.2, 3.2, 16, -3, 8.1, 0), rgb(0xc8e0e8))];
  const R = seeded(12);
  for (let k = 0; k < 5; k++) { const g = cyl(0.12, 0.1, 6.5, 6, 0, 0, 0); g.rotateZ((R() - 0.5) * 0.5); g.rotateX((R() - 0.5) * 0.4); g.translate(-3 + (R() - 0.5), 10, (R() - 0.5)); p.push(paint(g, rgb(0xb88a5a))); }
  p.push(paint(sph(3.2, 1.4, 0.12, 1, 3, 6.6, 0, 20, 6), rgb(0xe8dcc8)));
  const blobs = [[CERULEAN, 2.4, 0.4], [TEAL, 4.2, -0.8], [[0.95, 0.95, 0.92], 3.6, 1.2], [CERULEAN, 1.4, -1]];
  for (const [c, x, z] of blobs) p.push(paint(sph(0.7, 1, 0.4, 1, x, 6.95, z, 10, 6), c));
  p.push(paint(cyl(0.45, 0.45, 3, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(-0.5, 6.7, 2.4), rgb(0xd8dce4)), paint(cyl(0.48, 0.48, 1.2, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.6, 6.7, 2.4), CERULEAN));
  return merge(p);
}
// the thick Russian book, open on the bench: the covers and the page blocks (the pages are pictures)
export function book() {
  const p = [paint(box(14.6, 0.5, 10.4, 0, 0.25, 0), rgb(0x6a1a1a))];
  for (const s of [-1, 1]) { const g = box(7, 4.6, 9.8, s * 3.6, 2.8, 0); g.rotateZ(-s * 0.08); p.push(paint(g, rgb(0xf0e8d4))); }
  p.push(paint(box(0.9, 1.2, 10.2, 0, 0.6, 0), rgb(0x5a1414)));
  return merge(p);
}
export function bookPages() {
  const g = new THREE.PlaneGeometry(13.6, 9.4); g.rotateX(-Math.PI / 2); g.translate(0, 5.2, 0);
  return g;
}

// the corkboard by the door, where the flyers go (the flyer itself is pinned on by the flyer layer)
export function corkboard() {
  const p = [paint(box(12, 13, 0.6, 0, 6.5, -0.4), rgb(0xa8784a)), paint(box(13, 0.8, 1, 0, 13.2, -0.3), rgb(0x5a3a22)), paint(box(13, 0.8, 1, 0, -0.2, -0.3), rgb(0x5a3a22))];
  for (const x of [-6.1, 6.1]) p.push(paint(box(0.8, 14.2, 1, x, 6.5, -0.3), rgb(0x5a3a22)));
  const R = seeded(23);
  // (each note a little in front of the one before: where two overlapped at the same depth they flickered)
  for (let k = 0; k < 6; k++) { const x = (R() - 0.5) * 9, y = 1.4 + R() * 10.4; p.push(paint(box(2 + R() * 1.6, 2.2 + R() * 1.6, 0.02, x, y, 0.01 + 0.022 * k).rotateZ((R() - 0.5) * 0.3), rgb([0xf0e8d0, 0xffe880, 0xc8e8ff, 0xffc8d8][k % 4]))); p.push(paint(sph(0.22, 1, 1, 1, x, y + 1, 0.2, 6, 4), rgb([0xff3a3a, 0x3a8aff, 0xffd03a][k % 3]))); }
  return merge(p);
}

// ---------- the ritual ----------
// a keyboard key the size of a room: the cap, its skirt (the label is its own, on top)
export function keycap() {
  const p = [];
  const sk = new THREE.CylinderGeometry(9.2 / Math.SQRT2, 10.6 / Math.SQRT2, 5, 4, 1); sk.rotateY(Math.PI / 4); sk.translate(0, 2.5, 0);
  p.push(paint(sk, rgb(0xb8bcc6)));
  const top = new THREE.CylinderGeometry(8.6 / Math.SQRT2, 9.2 / Math.SQRT2, 0.6, 4, 1); top.rotateY(Math.PI / 4); top.translate(0, 5.3, 0);
  p.push(paint(top, rgb(0xdcdfe6)));
  return merge(p);
}
export function keyLabel() { const g = new THREE.PlaneGeometry(7.6, 7.6); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI); g.translate(0, 5.62, 0); return g; }

// one bar of the loading spinner, pointing out from the middle
export function spoke() { const g = new THREE.BoxGeometry(3.2, 11, 1.2); g.translate(0, 5.5, 0); return g; }

// ---------- the street ----------
// a wooden pole, staples and the ghosts of old flyers on it
export function pole() {
  const p = [paint(cyl(0.55, 0.7, 22, 10, 0, 11, 0), rgb(0x4a3a2c))];
  const R = seeded(9);
  for (let k = 0; k < 7; k++) { const y = 4 + R() * 9, a = R() * 6.28; const g = box(1.6 + R() * 1.6, 1 + R() * 2, 0.06, 0, 0, 0.72); g.rotateY(a); g.translate(0, y, 0); p.push(paint(g, rgb([0xd8d0c0, 0xc8c0a8, 0xe0d8c8, 0xb8b0a0][k % 4]))); }
  return merge(p);
}
// the flyer itself: a sheet (its picture from the flyer atlas), taped at the top
export function flyerSheet() { const g = new THREE.PlaneGeometry(7.2, 9); g.translate(0, 4.5, 0); return g; }
export function flyerTape() { return merge([paint(box(1.6, 0.7, 0.04, -2.9, 8.85, 0.03).rotateZ(0.35), rgb(0xe8e0b8)), paint(box(1.6, 0.7, 0.04, 2.9, 8.85, 0.03).rotateZ(-0.35), rgb(0xe8e0b8))]); }
// a café chair (bentwood): seat, legs, the hoop of the back
export function chair() {
  const c = rgb(0xb8844a), p = [paint(cyl(3.2, 3.2, 0.7, 24, 0, 9, 0), rgb(0xd0a060))];
  for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) p.push(paint(cyl(0.22, 0.26, 9, 6, x, 4.5, z), c));
  const ring = new THREE.TorusGeometry(3.1, 0.16, 6, 24); ring.rotateX(Math.PI / 2); ring.translate(0, 3.2, 0); p.push(paint(ring, c));
  const hoop = new THREE.TorusGeometry(2.6, 0.24, 6, 24, Math.PI); hoop.translate(0, 13.6, -2.7); p.push(paint(hoop, c));
  for (const x of [-2.6, 2.6]) p.push(paint(cyl(0.24, 0.24, 4.6, 6, x, 11.3, -2.7), c));
  for (const x of [-1, 1]) p.push(paint(cyl(0.18, 0.18, 4.4, 6, x, 11.3, -2.7), c));
  return merge(p);
}
// what saves a seat: a coat over the back and down the seat
export function coat() {
  const c = rgb(0xd03a2a), p = [];
  p.push(paint(box(6.2, 6.4, 0.7, 0, 12.4, -2.9).rotateX(0.06), c));
  p.push(paint(box(6.4, 0.7, 5.6, 0, 9.7, -0.4), c));
  p.push(paint(box(6.2, 4, 0.6, 0, 7.8, 2.6).rotateX(-0.12), c));
  for (const s of [-1, 1]) p.push(paint(box(1.4, 7, 1.4, s * 3.9, 11.2, -2.4).rotateZ(s * 0.18), c));
  p.push(paint(box(6.8, 1, 1.2, 0, 15.9, -2.9), rgb(0xa02a1e)));
  return merge(p);
}
// a round café table on its foot, and a cup and saucer on it
export function cafeTable() {
  const p = [paint(cyl(6.6, 6.6, 0.7, 32, 0, 14.6, 0), rgb(0xe8e0d0)), paint(cyl(6.7, 6.7, 0.3, 32, 0, 14.15, 0), rgb(0x9a8a6a))];
  p.push(paint(cyl(0.6, 0.6, 14, 10, 0, 7.2, 0), rgb(0x2a2420)), paint(cyl(3.6, 4, 0.6, 20, 0, 0.3, 0), rgb(0x2a2420)));
  return merge(p);
}
export function cup(x = 0, z = 0) {
  const p = [paint(lathe([[0, 0], [2.2, 0], [2.5, 0.35], [2.5, 0.45], [0, 0.2]], 28), WHITE).translate(x, 15, z)];
  p.push(paint(lathe([[0, 0], [1.1, 0], [1.6, 0.6], [1.75, 2.2], [1.6, 2.2], [1.45, 0.7], [0, 0.4]], 24), WHITE).translate(x, 15.35, z));
  p.push(paint(torus(0.6, 0.18, 0, 0, 0, 14).rotateY(Math.PI / 2).translate(x + 1.95, 16.6, z), WHITE));
  p.push(paint(cyl(1.5, 1.5, 0.05, 20, x, 17.3, z), rgb(0x5a3418)));
  return merge(p);
}
// the counter: wood front, the top, the espresso machine, the pastry case (its glow is a layer of its own)
export function counter() {
  const p = [paint(box(44, 11, 8, 0, 5.5, 0), rgb(0x4a2c1a)), paint(box(45, 0.9, 9, 0, 11.4, 0), rgb(0x2a2a2e))];
  for (let k = 0; k < 11; k++) p.push(paint(box(0.3, 9, 0.2, -20 + k * 4, 5.5, 4.1), rgb(0x3a2214)));
  // the machine
  p.push(paint(box(13, 8, 6, -10, 15.8, -0.6), rgb(0xb8bec6)), paint(box(13.4, 1, 6.4, -10, 20.3, -0.6), rgb(0x8a9098)));
  for (const x of [-14, -10, -6]) { p.push(paint(cyl(0.9, 0.9, 1.2, 14, x, 13.2, 2.8), CHROME), paint(box(0.4, 0.4, 2.6, x, 12.6, 3.6), DARK)); }
  p.push(paint(cyl(0.18, 0.18, 4, 6, -3.6, 13.6, 2.2).rotateZ(0.3), CHROME));
  for (let k = 0; k < 6; k++) p.push(paint(lathe([[0, 0], [0.9, 0], [1.2, 1.6], [1.0, 1.6], [0.8, 0.2], [0, 0.2]], 14), WHITE).translate(-15 + k * 2.2, 20.8, -2));
  // the pastry case's frame
  p.push(paint(box(16, 0.6, 7, 11, 12.1, 0), CHROME), paint(box(16, 0.4, 7, 11, 19.2, 0), CHROME));
  for (const x of [3.2, 18.8]) p.push(paint(box(0.4, 7.4, 7, x, 15.7, 0), CHROME));
  // the till
  p.push(paint(box(4.6, 4, 4, -19.8, 13.8, 0.5), DARK), paint(box(4, 0.3, 2.6, -19.8, 16, 1).rotateX(-0.5), rgb(0x3a3e46)));
  return merge(p);
}
// inside the pastry case: what's left at this hour
export function pastries() {
  const p = [], R = seeded(4);
  for (const y of [12.6, 15.8]) for (let k = 0; k < 6; k++) {
    const x = 5 + k * 2.4 + (R() - 0.5) * 0.4;
    if (R() < 0.35) continue;
    p.push(paint(R() < 0.5 ? sph(0.9, 1.3, 0.6, 1, x, y + 0.5, 0, 10, 6) : box(1.6, 1, 1.6, x, y + 0.5, 0), rgb([0xd8a05a, 0xe8c890, 0x8a4a2a, 0xf0d8b0][Math.floor(R() * 4)])));
  }
  return merge(p);
}
export function caseGlass() { const g = new THREE.PlaneGeometry(15, 6.8); g.translate(11, 15.7, 3.55); return g; }
// the cream station: the carafes, the sugar, the napkins, the stirrers; the tissue on the table by it
export function creamStation() {
  const p = [paint(box(16, 13, 7, 0, 6.5, 0), rgb(0x3a2a20)), paint(box(16.6, 0.6, 7.6, 0, 13.3, 0), rgb(0xd8d0c0))];
  for (const x of [-5, -2]) p.push(paint(lathe([[0, 0], [1.3, 0], [1.4, 2.6], [0.9, 3.6], [0.9, 4.1], [0, 4.1]], 18), CHROME).translate(x, 13.6, -1));
  p.push(paint(lathe([[0, 0], [1, 0], [1, 2.4], [0.5, 3.2], [0, 3.3]], 14), rgb(0xe8eef0)).translate(1.6, 13.6, 0.6));
  p.push(paint(box(3, 2.4, 2.4, 5, 14.8, -0.6), DARK), paint(box(2.6, 1.6, 0.1, 5, 15.2, 0.62), WHITE));
  p.push(paint(cyl(0.8, 0.7, 2.2, 12, 1.6, 14.7, -2.2), rgb(0xc8a878)));
  for (let k = 0; k < 6; k++) p.push(paint(box(0.12, 3, 0.12, 1.4 + (k % 3) * 0.2, 16.2, -2.2 + Math.floor(k / 3) * 0.2).rotateZ((k - 2.5) * 0.06), rgb(0xd8c8a0)));
  return merge(p);
}
// a tissue, pulled up out of its box, left on the table
export function tissue() { return merge([paint(box(3.2, 1.6, 2, 0, 15.7, 0), rgb(0xd8e8f0)), paint(sph(1, 0.9, 1.3, 0.5, 0.2, 17.4, 0, 10, 8), WHITE), paint(sph(1.2, 1.2, 0.6, 1.1, 4, 15.3, 1.5, 10, 6), WHITE)]); }
// the camera on its tripod, the film magazine on top, pointed at a table
export function filmCamera() {
  const p = [];
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const g = cyl(0.3, 0.3, 15, 6, 0, 0, 0); g.translate(0, -7.5, 0); g.rotateZ(0.32); g.rotateY(a); g.translate(0, 15, 0); p.push(paint(g, DARK)); }
  p.push(paint(box(4.6, 4.2, 7, 0, 17.6, 0), rgb(0x1a1a1e)), paint(cyl(1.4, 1.7, 3.8, 18, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 17.8, 5.2), DARK));
  p.push(paint(cyl(2.2, 2.2, 0.9, 20, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 21.6, 1.2), rgb(0x2a2a2e)), paint(cyl(2.2, 2.2, 0.9, 20, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 21.6, -2.8), rgb(0x2a2a2e)));
  p.push(paint(box(0.3, 1.6, 2.2, 2.5, 18.6, -1.6), rgb(0xff3a2a)));
  return merge(p);
}
// a film light on its stand: the legs, the pole, the lamp head (its lens glows by itself)
export function filmLight() {
  const p = [];
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const g = cyl(0.22, 0.22, 7, 6, 0, -3.5, 0); g.rotateZ(0.5); g.rotateY(a); g.translate(0, 5.6, 0); p.push(paint(g, DARK)); }
  p.push(paint(cyl(0.3, 0.3, 18, 6, 0, 13, 0), rgb(0x3a3a40)));
  p.push(paint(box(5, 5, 6, 0, 23.5, 0), rgb(0x2a2a30)));
  for (const s of [-1, 1]) { p.push(paint(box(0.2, 5, 3, s * 2.6, 23.5, 3.8).rotateY(s * 0.6), rgb(0x2a2a30))); p.push(paint(box(5, 0.2, 3, 0, 23.5 + s * 2.6, 3.8).rotateX(-s * 0.6), rgb(0x2a2a30))); }
  return merge(p);
}
export function lightLens() { const g = new THREE.CircleGeometry(2.1, 24); g.translate(0, 23.5, 3.02); return g; }
// the clapperboard on its stand: the slate (the sticks are their own, hinged at the top left)
export function slate() {
  const p = [paint(cyl(0.25, 0.25, 12, 6, 0, 6, 0), DARK), paint(box(9, 7, 0.5, 0, 15.5, 0), rgb(0x1a1a1e))];
  for (let k = 0; k < 3; k++) p.push(paint(box(8.4, 0.12, 0.1, 0, 13.6 + k * 1.6, 0.28), rgb(0xe8e8e8)));
  return merge(p);
}
export function clapSticks() {
  const p = [];
  for (let k = 0; k < 6; k++) { const g = box(1.5, 1.3, 0.55, 0.75 + k * 1.5, 0.65, 0); g.rotateZ(0); p.push(paint(g, k % 2 ? rgb(0xf0f0f0) : rgb(0x1a1a1e))); }
  return merge(p);
}
// the director's chair, canvas, nobody in it
export function directorChair() {
  const p = [], wood = rgb(0x8a6a4a), cloth = rgb(0x1a1a24);
  for (const s of [-1, 1]) { p.push(paint(box(0.5, 19, 0.5, s * 3.6, 9.5, -2.5), wood), paint(box(0.5, 12, 0.5, s * 3.6, 6, 2.5), wood)); const x1 = box(0.4, 9, 0.4, s * 3.6, 4.5, 0); x1.rotateX(0.5); p.push(paint(x1, wood)); const x2 = box(0.4, 9, 0.4, s * 3.6, 4.5, 0); x2.rotateX(-0.5); p.push(paint(x2, wood)); p.push(paint(box(0.6, 0.5, 6, s * 3.6, 12, 0), wood)); }
  p.push(paint(box(7.2, 0.3, 5, 0, 9.4, 0), cloth), paint(box(7.2, 3.6, 0.2, 0, 16.2, -2.5), cloth));
  return merge(p);
}
// a crumpled page: one of the hundred endings
export function crumple() {
  const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position, R = seeded(31);
  for (let i = 0; i < P.count; i++) { const k = 0.7 + R() * 0.5; P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k); }
  g.computeVertexNormals();
  return paint(ni(g), rgb(0xf2f0ea));
}
// a folding chair with the script left on it, one line marked
export function scriptChair() {
  const p = [], m = rgb(0x6a6e76);
  for (const s of [-1, 1]) { const a = box(0.4, 14, 0.4, s * 3, 7, 0); a.rotateX(0.3); p.push(paint(a, m)); const b = box(0.4, 10, 0.4, s * 3, 5, 0); b.rotateX(-0.3); p.push(paint(b, m)); }
  p.push(paint(box(6.6, 0.5, 5.6, 0, 8.4, 0.4), m), paint(box(6.6, 3, 0.4, 0, 13.6, -2.2).rotateX(0.3), m));
  p.push(paint(box(4.2, 0.4, 5.4, 0.2, 8.9, 0.6).rotateY(0.2), rgb(0xf4f2ea)), paint(box(2.6, 0.08, 0.5, 0.4, 9.15, 1.2).rotateY(0.2), rgb(0xffe23a)));
  return merge(p);
}

// ---------- the screen ----------
// a square in the grid: a photo (the tile shader paints it)
export function tile() { const g = new THREE.PlaneGeometry(1, 1); return g; }
// a line between two people who know each other: a unit bar along +z
export function wire() { const g = new THREE.BoxGeometry(0.16, 0.16, 1); g.translate(0, 0, 0.5); return g; }
// the bubble of a message being typed: a rounded box and its tail (the dots are glows)
export function bubble() {
  const s = new THREE.Shape(), w = 16, h = 8, r = 3.6;
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + 1); s.lineTo(-w / 2 - 2.4, -h / 2 - 1.6); s.lineTo(-w / 2 + 2, -h / 2); s.lineTo(-w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.6);
  return paint(ni(g), rgb(0x3a7aff));
}
// the school she went to: a schoolhouse, its bell in the tower
export function school() {
  const p = [paint(box(30, 14, 16, 0, 7, 0), rgb(0x9a4a3a))];
  const roof = new THREE.CylinderGeometry(0.01, 12.6, 7, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.7, 1, 0.92); roof.translate(0, 17.5, 0); p.push(paint(roof, rgb(0x3a3a44)));
  p.push(paint(box(6, 9, 6, 0, 24, 0), rgb(0xe8e0d0)));
  const top = new THREE.CylinderGeometry(0.01, 4.6, 5, 4, 1); top.rotateY(Math.PI / 4); top.translate(0, 31, 0); p.push(paint(top, rgb(0x3a3a44)));
  for (let k = 0; k < 6; k++) p.push(paint(box(2.6, 4.4, 0.3, -11 + k * 4.4, 8, 8.05), rgb(0xffe0a0)));
  p.push(paint(box(4, 7, 0.3, 0, 3.5, 8.1), rgb(0x4a2a1a)));
  return merge(p);
}
// the birthday cake: two tiers, icing, the candles (their flames are glows)
export function cake() {
  const p = [paint(cyl(9, 9, 6, 32, 0, 3, 0), rgb(0xf4d8e0)), paint(cyl(6.2, 6.2, 5, 32, 0, 8.5, 0), rgb(0xf8e8ee)), paint(cyl(10.5, 10.5, 0.6, 32, 0, 0.3, 0), rgb(0xe8e8f0))];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; p.push(paint(sph(0.9, 1, 0.8, 1, Math.cos(a) * 9, 6, Math.sin(a) * 9, 8, 6), rgb(0xff8ab0))); }
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; p.push(paint(cyl(0.35, 0.35, 3, 8, Math.cos(a) * 3.8, 12.5, Math.sin(a) * 3.8), rgb([0x6ab0ff, 0xffd060, 0xff6a9a][k % 3]))); }
  return merge(p);
}

// ---------- the climax ----------
// a door that stays shut, in its frame, the light behind it showing round the edges
export function door() {
  const p = [paint(box(13, 24, 1.6, 0, 12, -0.6), rgb(0x1a1a22))];
  p.push(paint(box(10, 20, 0.8, 0, 10.2, 0.2), rgb(0x5a2a2a)));
  for (const [y, h] of [[5, 6], [15, 8]]) for (const x of [-2.4, 2.4]) p.push(paint(box(3.6, h, 0.3, x, y, 0.65), rgb(0x4a2222)));
  p.push(paint(sph(0.5, 1, 1, 1, 3.8, 10, 0.9, 10, 8), rgb(0xd8b060)));
  p.push(paint(box(11, 1, 3, 0, 0.5, 1.2), rgb(0x3a3a40)));
  return merge(p);
}
// the light round a shut door: a thin frame of quads just proud of the wall
export function doorSeam() {
  const g = [];
  for (const [w, h, x, y] of [[0.5, 20.4, -5.25, 10.2], [0.5, 20.4, 5.25, 10.2], [11, 0.5, 0, 20.45], [11, 0.6, 0, 0.1]]) { const q = new THREE.PlaneGeometry(w, h); q.translate(x, y, 0.62); g.push(q); }
  return merge(g);
}
// a storefront on the street (the laundromat, the café): its block, its window lit or dark
export function storefront() {
  const p = [paint(box(30, 30, 14, 0, 15, -7), rgb(0x6a4a42)), paint(box(30.4, 1.4, 14.4, 0, 30.6, -7), rgb(0x4a3a36))];
  p.push(paint(box(30, 3.6, 0.6, 0, 13.4, 0.3), rgb(0x2a2a30)));
  p.push(paint(box(30, 1.2, 0.8, 0, 0.6, 0.4), rgb(0x3a3a40)));
  for (const x of [-14.6, 14.6]) p.push(paint(box(0.8, 12, 0.8, x, 6, 0.4), rgb(0x2a2a30)));
  for (let k = 0; k < 4; k++) for (let r = 0; r < 2; r++) p.push(paint(box(4, 5, 0.3, -10.5 + k * 7, 19 + r * 7, 0.1), rgb(0x1a1c26)));
  return merge(p);
}
export function storeWindow() { const g = new THREE.PlaneGeometry(28.4, 10.6); g.translate(0, 6.3, 0.35); return g; }
export function storeSign() { const g = new THREE.PlaneGeometry(26, 3); g.translate(0, 13.4, 0.66); return g; }

// ---------- the end ----------
// a table at closing: the chairs up on it, legs in the air
export function closedTable() {
  const p = [paint(box(14, 0.8, 9, 0, 14.6, 0), rgb(0x3a2418))];
  for (const [x, z] of [[-6, -3.8], [6, -3.8], [-6, 3.8], [6, 3.8]]) p.push(paint(box(0.6, 14.2, 0.6, x, 7.1, z), rgb(0x2a1a12)));
  for (const s of [-1, 1]) {
    const seat = box(6, 0.6, 6, s * 3.5, 15.6, 0); p.push(paint(seat, rgb(0x2a1a14)));
    for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) p.push(paint(box(0.35, 8, 0.35, s * 3.5 + x, 19.9, z), rgb(0x2a1a14)));
    p.push(paint(box(6, 4, 0.4, s * 3.5, 13.4 + 0.2, s * 3), rgb(0x2a1a14)));
  }
  return merge(p);
}
// the laptop, open: its base and lid (the screen is a picture of its own)
export function laptop() {
  const p = [paint(box(9, 0.5, 6.4, 0, 15.25, 0), rgb(0x9aa0aa)), paint(box(8, 0.06, 3.4, 0, 15.53, 0.8), rgb(0x2a2c32))];
  const lid = box(9, 6.2, 0.35, 0, 3.1, 0); lid.rotateX(-0.25); lid.translate(0, 15.5, -3.2); p.push(paint(lid, rgb(0x9aa0aa)));
  return merge(p);
}
export function laptopScreen() { const g = new THREE.PlaneGeometry(8.2, 5.4); g.translate(0, 3.1, 0.19); g.rotateX(-0.25); g.translate(0, 15.5, -3.2); return g; }
// the back table: a plain square table, a lamp hanging low over it
export function backTable() {
  const p = [paint(box(18, 0.9, 12, 0, 14.6, 0), rgb(0x4a2c1c))];
  for (const [x, z] of [[-8, -5], [8, -5], [-8, 5], [8, 5]]) p.push(paint(box(0.8, 14.2, 0.8, x, 7.1, z), rgb(0x2a1a12)));
  p.push(paint(cyl(0.06, 0.06, 16, 4, 0, 34, 0), DARK), paint(lathe([[0.4, 0], [4, -2.6], [4.2, -2.8], [0.6, -0.2]], 24), rgb(0x2a4a3a)).translate(0, 26.2, 0));
  return merge(p);
}

// ---------- pictures ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const HAND = '"Segoe Print", "Marker Felt", "Bradley Hand", "Comic Sans MS", cursive';

// the thick book's pages: dense lines of a script you can't read from here
export function pageTexture() {
  return canvasTex(512, 352, (g, W, H) => {
    g.fillStyle = '#f2ead6'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(W / 2 - 10, 0, 20, H);
    const R = seeded(5); g.fillStyle = '#3a3430';
    for (const x0 of [26, W / 2 + 22]) for (let row = 0; row < 18; row++) { let x = x0; const y = 22 + row * 17.4; const end = x0 + 200 - (row === 17 ? 90 : 0); while (x < end) { const w = 6 + R() * 22; g.fillRect(x, y, Math.min(w, end - x), 5); x += w + 5; } }
    g.font = 'bold 14px serif'; g.fillText('— 412 —', W / 4 - 26, H - 8); g.fillText('— 413 —', W * 0.75 - 26, H - 8);
  });
}
// a key's label: F5, the way it's printed on a keyboard
export function keyTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#dcdfe6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#22242c'; g.font = '600 64px "Segoe UI", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('F5', 30, 26);
    g.strokeStyle = '#22242c'; g.lineWidth = 7; g.beginPath(); g.arc(178, 178, 32, -Math.PI * 0.15, Math.PI * 1.45); g.stroke();
    g.beginPath(); g.moveTo(206, 152); g.lineTo(212, 178); g.lineTo(188, 170); g.closePath(); g.fillStyle = '#22242c'; g.fill();
  });
}
// the handprint she left on the glass, in her blue
export function handTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath(); g.ellipse(128, 160, 52, 60, 0, 0, Math.PI * 2); g.fill();
    for (const [x, y, r, l, a] of [[78, 100, 13, 58, -0.35], [104, 78, 13, 70, -0.12], [132, 72, 13, 74, 0.02], [158, 82, 12, 64, 0.15], [186, 138, 13, 52, 0.85]]) {
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.roundRect(-r, -l / 2, r * 2, l, r); g.fill(); g.restore();
    }
    // the smear where it slid
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(84, 200, 90, 46);
  });
}
// her hands, the photo the algorithm found: paint dried under the nails
export function handPhotoTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#d8cbb8'); gr.addColorStop(1, '#8a7a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8b898';
    g.beginPath(); g.ellipse(132, 200, 62, 70, 0, 0, Math.PI * 2); g.fill();
    const nails = [];
    for (const [x, y, r, l, a] of [[74, 128, 15, 92, -0.3], [104, 100, 15, 112, -0.1], [136, 94, 15, 116, 0.04], [166, 106, 14, 100, 0.18], [196, 176, 15, 70, 0.95]]) {
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.roundRect(-r, -l / 2, r * 2, l, r); g.fill(); g.restore();
      nails.push([x + Math.sin(a) * (l / 2 - 10), y - Math.cos(a) * (l / 2 - 10), a, r]);
    }
    for (const [x, y, a, r] of nails) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#f4dcd0'; g.beginPath(); g.roundRect(-r * 0.7, -10, r * 1.4, 18, 6); g.fill(); g.fillStyle = '#2a7ad8'; g.beginPath(); g.roundRect(-r * 0.7, 2, r * 1.4, 6, 3); g.fill(); g.restore(); }
    g.fillStyle = 'rgba(42,122,216,0.6)'; g.beginPath(); g.ellipse(150, 220, 16, 7, 0.4, 0, Math.PI * 2); g.fill();
  });
}

// a shop window from the street, lit, with what's inside: the café's tables and pendant lamps, or
// the laundromat's machines in a row under the tubes
export function shopWindowTexture(kind) {
  return canvasTex(512, 192, (g, W, H) => {
    const warm = kind === 'cafe';
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, warm ? '#ffe2b0' : '#eefff8'); gr.addColorStop(1, warm ? '#b86a30' : '#9acac2'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (warm) {
      g.fillStyle = 'rgba(70,34,14,0.9)'; g.fillRect(0, H * 0.58, W, 10);
      for (let k = 0; k < 4; k++) { const x = 64 + k * 128; g.beginPath(); g.ellipse(x, H * 0.74, 34, 7, 0, 0, Math.PI * 2); g.fill(); g.fillRect(x - 3, H * 0.74, 6, H * 0.26); g.fillRect(x - 48, H * 0.66, 5, H * 0.34); g.fillRect(x + 43, H * 0.66, 5, H * 0.34); g.fillRect(x - 48, H * 0.78, 16, 4); g.fillRect(x + 32, H * 0.78, 16, 4); }
      for (let k = 0; k < 5; k++) { const x = 40 + k * 108; g.fillStyle = 'rgba(70,34,14,0.85)'; g.fillRect(x, 0, 2, 38); g.beginPath(); g.moveTo(x - 12, 46); g.lineTo(x + 14, 46); g.lineTo(x + 7, 36); g.lineTo(x - 5, 36); g.fill(); g.fillStyle = '#fff8e0'; g.beginPath(); g.arc(x + 1, 49, 6, 0, Math.PI * 2); g.fill(); }
    } else {
      for (let k = 0; k < 8; k++) { const x = 32 + k * 64; g.fillStyle = 'rgba(60,84,80,0.45)'; g.fillRect(x - 27, H * 0.24, 54, H * 0.76); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x, H * 0.44, 15, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, H * 0.8, 14, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.95)'; for (let k = 0; k < 4; k++) g.fillRect(36 + k * 124, 8, 84, 6);
    }
    g.fillStyle = warm ? '#0c2a20' : '#1c262c'; for (const x of [0, W / 3 - 3, (2 * W) / 3 - 3, W - 7]) g.fillRect(x, 0, 7, H); g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
  });
}

// the laundromat's sign over its door, and the café's gold 7 on its glass
export function signTexture(text, sub, bg, fg) {
  return canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = fg; g.shadowColor = fg; g.shadowBlur = 18; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${sub ? 64 : 80}px "Arial Black", Impact, sans-serif`; g.fillText(text, W / 2 - (sub ? 120 : 0), H / 2 + 4);
    if (sub) { g.font = '700 34px Arial, sans-serif'; g.fillText(sub, W - 150, H / 2 + 2); }
  });
}
// the laptop's screen: her post, a blank reply box, the spinner of the page reloading
export function postTexture() {
  return canvasTex(512, 336, (g, W, H) => {
    g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a5a9a'; g.fillRect(0, 0, W, 34);
    g.fillStyle = '#ffffff'; g.fillRect(14, 10, 60, 14); g.fillRect(84, 10, 120, 14);
    g.fillStyle = '#1a1a22'; g.font = `700 26px ${HAND}`; g.fillText('if you see this', 26, 78);
    const R = seeded(8); g.fillStyle = '#6a6e78';
    for (let row = 0; row < 6; row++) { let x = 26; const y = 100 + row * 22; const end = row === 5 ? 200 : 460; while (x < end) { const w = 14 + R() * 50; g.fillRect(x, y, Math.min(w, end - x), 8); x += w + 8; } }
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 2; g.strokeRect(26, 248, 380, 60);
    g.strokeStyle = '#2a5a9a'; g.lineWidth = 5; g.beginPath(); g.arc(460, 278, 18, 0, Math.PI * 1.5); g.stroke();
  });
}

// The flyers: one picture per line he sings, on paper or (inside the screen) on a dark card, a
// little drawing on each, the tear-off tabs along the bottom with her number on them, a few gone.
export const FLYER_COLS = 6, FLYER_ROWS = 8, FLYER_W = 256, FLYER_H = 320;
const DOODLES = ['heart', 'washer', 'cup', 'chair', 'door', 'none'];
function doodle(g, kind, x, y, s, ink) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = ink; g.lineWidth = 3.2 / s; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (kind === 'heart') { g.moveTo(0, 8); g.bezierCurveTo(-16, -4, -9, -16, 0, -7); g.bezierCurveTo(9, -16, 16, -4, 0, 8); }
  else if (kind === 'washer') { g.rect(-12, -14, 24, 28); g.moveTo(8, 2); g.arc(0, 2, 8, 0, Math.PI * 2); g.moveTo(-9, -9); g.lineTo(-3, -9); }
  else if (kind === 'cup') { g.moveTo(-9, -8); g.lineTo(-7, 9); g.lineTo(7, 9); g.lineTo(9, -8); g.moveTo(9, -4); g.arc(11, 0, 4, -Math.PI / 2, Math.PI / 2); g.moveTo(-3, -12); g.quadraticCurveTo(-1, -16, -3, -20); g.moveTo(3, -12); g.quadraticCurveTo(5, -16, 3, -20); }
  else if (kind === 'chair') { g.moveTo(-8, -14); g.lineTo(-8, 12); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineTo(8, 12); g.moveTo(-8, -14); g.lineTo(-4, -14); }
  else if (kind === 'door') { g.rect(-8, -14, 16, 28); g.moveTo(4, 1); g.arc(3.5, 1, 0.5, 0, Math.PI * 2); }
  g.stroke(); g.restore();
}
function wrapLines(g, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
    if (line) out.push(line);
  }
  return out;
}
export function flyerAtlas(list) {
  return canvasTex(FLYER_COLS * FLYER_W, FLYER_ROWS * FLYER_H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, FLYER_COLS * FLYER_W, FLYER_ROWS * FLYER_H);
    list.forEach((f, i) => {
      const x0 = (i % FLYER_COLS) * FLYER_W, y0 = Math.floor(i / FLYER_COLS) * FLYER_H, W = FLYER_W, H = FLYER_H;
      const R = seeded(1000 + i * 37), screen = f.screen;
      g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip(); g.translate(x0, y0);
      // the sheet: paper going a little yellow at the edges, or a phone's dark card
      if (screen) {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16223a'); gr.addColorStop(1, '#0c1222'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = '#2a4a7a'; g.beginPath(); g.arc(30, 30, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#4a6a9a'; g.fillRect(52, 22, 70, 8); g.fillRect(52, 34, 44, 6);
      } else {
        const gr = g.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H / 2, W * 0.8); gr.addColorStop(0, '#f4f1e8'); gr.addColorStop(1, '#ddd6c2'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(120,110,90,0.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H * 0.48 + (R() - 0.5) * 10); g.lineTo(W, H * 0.5 + (R() - 0.5) * 10); g.stroke();
      }
      const ink = screen ? '#eef4ff' : (f.ink || '#1c1c26');
      // the words, as big as fit, in marker
      const maxW = W - 36, top = screen ? 58 : 26, bottom = H - 92;
      let size = 46, lines;
      for (; size > 14; size -= 2) { g.font = `700 ${size}px ${HAND}`; lines = wrapLines(g, f.text, maxW); if (lines.length * size * 1.12 <= bottom - top) break; }
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lh = size * 1.12, ty = top + (bottom - top - lines.length * lh) / 2 + lh / 2;
      lines.forEach((l, j) => g.fillText(l, W / 2 + (R() - 0.5) * 4, ty + j * lh));
      const dk = f.doodle ?? DOODLES[i % DOODLES.length];
      if (dk !== 'none' && !screen) doodle(g, dk, W - 34, bottom + 4, 1.0, f.ink || '#1c1c26');
      // the tabs: her number written down each one in blue pen, a couple torn off
      if (!screen) {
        const n = 9, tw = W / n;
        g.strokeStyle = 'rgba(60,60,60,0.5)'; g.setLineDash([4, 4]); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(0, H - 76); g.lineTo(W, H - 76); g.stroke(); g.setLineDash([]);
        for (let k = 0; k < n; k++) {
          const gone = (f.torn ?? 2) > 0 && R() < 0.22;
          if (gone) { g.fillStyle = '#000'; g.fillRect(k * tw + 1, H - 74, tw - 2, 74); continue; }
          g.strokeStyle = 'rgba(80,80,80,0.45)'; g.beginPath(); g.moveTo(k * tw, H - 76); g.lineTo(k * tw, H); g.stroke();
          g.save(); g.translate(k * tw + tw / 2, H - 38); g.rotate(-Math.PI / 2);
          g.fillStyle = '#2a5ab8'; g.font = `600 13px ${HAND}`; g.textAlign = 'center'; g.fillText('if you see this', 0, 0); g.restore();
        }
      } else {
        g.fillStyle = '#3a7aff'; g.fillRect(18, H - 52, 64, 26); g.fillStyle = '#9ab8e8'; g.fillRect(96, H - 46, 120, 12);
      }
      g.restore();
    });
  });
}
