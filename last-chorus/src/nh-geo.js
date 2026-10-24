// Nothing Happens Every Week: the town's things, built from code. Houses with gables and
// porches, street trees, the lamps and hydrants of a small town, and the set-pieces the song
// sings about. Coloured per vertex; three colours are keys the town's material swaps for an
// instance's own (WALL, ROOF, ACCENT), so one draw does a street of different houses.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ni = (g) => (g.index ? g.toNonIndexed() : g);
export function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
export const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export const WALL = [1, 0, 0], ROOF = [0, 0, 1], ACCENT = [0, 1, 0];
export function paint(g, c) {
  g = ni(g);
  if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(typeof c === 'function' ? c(g.attributes.position, i) : c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const merge = (gs) => mergeGeometries(gs, false);
export const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
export const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(r0, r1, h, n).translate(x, y, z);
export const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 12, hh = 8) => new THREE.SphereGeometry(r, w, hh).scale(sx, sy, sz).translate(x, y, z);
export const bare = (g) => { g = ni(g); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
// a flat triangle, both faces
export function tri(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3));
  g.computeVertexNormals();
  return g;
}
// a beam from a to b (vectors), w x w in section
export function beam(a, b, w, d = w) {
  const v = new THREE.Vector3().subVectors(b, a), L = v.length();
  const g = new THREE.BoxGeometry(w, L, d); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const WHITE = [0.94, 0.93, 0.9], GREY = [0.55, 0.53, 0.5], DARK = [0.1, 0.11, 0.13], BRICK = [0.55, 0.24, 0.17], PANE = [0.1, 0.13, 0.17];

// ---------- houses ----------
// A gable roof with its ridge along x, over walls W wide and D deep whose tops are at y0: two
// slabs from the ridge (h higher) down past the eaves.
function gable(W, D, y0, h, ox = 0.45, oz = 0.6, th = 0.24) {
  const parts = [], run = D / 2 + oz, ang = Math.atan2(h, D / 2), L = run / Math.cos(ang);
  for (const s of [-1, 1]) {
    const g = box(W + 2 * ox, th, L);
    g.rotateX(s * ang);
    // centre of the slab: halfway from the ridge to the eave, lifted half its thickness off the plane
    const zc = s * run / 2, yc = y0 + h - (run / 2) * Math.tan(ang) + (th / 2) / Math.cos(ang);
    g.translate(0, yc, zc);
    parts.push(g);
  }
  return parts;
}
// the triangles under a gable roof, at each end (x = +-W/2)
function gableEnds(W, D, y0, h) {
  return [-1, 1].map((s) => tri([s * W / 2, y0, -D / 2], [s * W / 2, y0, D / 2], [s * W / 2, y0 + h, 0]));
}
// flowers in a bed along the front of a house, and the bed
function flowerBed(R, x0, x1, z) {
  const parts = [paint(box(x1 - x0, 0.3, 0.9, (x0 + x1) / 2, 0.15, z), [0.32, 0.22, 0.14])];
  const cols = [[0.95, 0.3, 0.45], [1, 0.8, 0.25], [0.95, 0.95, 0.9], [0.8, 0.35, 0.85], [1, 0.5, 0.25]];
  // blooms: little octahedra, a few to a clump (cheap, and they read as flowers from the road)
  for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.55) {
    const b = new THREE.OctahedronGeometry(0.26, 0); b.scale(1, 0.8, 1); b.translate(x + (R() - 0.5) * 0.1, 0.45, z + (R() - 0.5) * 0.3);
    parts.push(paint(b, cols[Math.floor(R() * cols.length)]));
  }
  return parts;
}
function shrub(R, x, z, r = 0.9) {
  const parts = [];
  for (let k = 0; k < 2; k++) { const b = new THREE.IcosahedronGeometry(r * (0.75 + R() * 0.3), 0); b.scale(1, 0.85, 1); b.translate(x + (R() - 0.5) * r, r * 0.7, z + (R() - 0.5) * r * 0.6); parts.push(paint(b, [0.2 + R() * 0.06, 0.4 + R() * 0.08, 0.16])); }
  return parts;
}
// shutters, a sill under each front window; the window grid is the walls' (2.4 x 2.9 m, sill 0.9)
function frontWindows(xs, rows, z, skip = () => false) {
  const parts = [];
  for (const y0 of rows) for (const c of xs) {
    const yb = 0.9 + y0 * 2.9 + 0.16 * 2.9, yt = 0.9 + y0 * 2.9 + 0.74 * 2.9, ym = (yb + yt) / 2;
    parts.push(paint(box(1.62, 0.13, 0.22, c, yb - 0.06, z + 0.08), WHITE));
    parts.push(paint(box(1.62, 0.16, 0.12, c, yt + 0.08, z + 0.05), WHITE));
    for (const s of [-1, 1]) if (!skip(c, y0, s)) parts.push(paint(box(0.44, yt - yb, 0.08, c + s * 0.99, ym, z + 0.05), ACCENT));
  }
  return parts;
}
function door(x, z, y0 = 0.5) {
  return [paint(box(0.9, 2.15, 0.1, x, y0 + 1.07, z + 0.03), ACCENT), paint(box(1.36, 0.24, 0.14, x, y0 + 2.28, z + 0.04), WHITE),
    paint(box(0.2, 2.2, 0.13, x - 0.56, y0 + 1.1, z + 0.04), WHITE), paint(box(0.2, 2.2, 0.13, x + 0.56, y0 + 1.1, z + 0.04), WHITE),
    paint(sph(0.05, 1, 1, 1, x + 0.3, y0 + 1.05, z + 0.1, 5, 4), [0.85, 0.7, 0.3])];
}

// The walls (drawn with lit windows) and everything else (keyed colours) of each kind of house.
export const HOUSES = {
  // a two-storey colonial: the door in the middle under a little portico, shutters, a chimney
  colonial() {
    const W = 14.4, D = 9.6, H = 6.6, R = seeded(3);
    const walls = bare(box(W, H, D, 0, H / 2, 0));
    const p = [];
    gableEnds(W, D, H, 3.4).forEach((g) => p.push(paint(g, WALL)));
    gable(W, D, H, 3.4).forEach((g) => p.push(paint(g, ROOF)));
    p.push(paint(box(W + 0.12, 0.34, D + 0.12, 0, H - 0.17, 0), WHITE));
    for (const x of [-1, 1]) for (const z of [-1, 1]) p.push(paint(box(0.26, H, 0.26, x * W / 2, H / 2, z * D / 2), WHITE));
    p.push(paint(box(W + 0.2, 0.5, D + 0.2, 0, 0.25, 0), GREY));
    p.push(...door(0, D / 2));
    // the portico: two columns, a flat roof, a pediment
    for (const s of [-1, 1]) p.push(paint(cyl(0.12, 0.15, 2.55, 8, s * 0.82, 0.5 + 1.27, D / 2 + 1.25), WHITE));
    p.push(paint(box(2.3, 0.22, 1.7, 0, 3.15, D / 2 + 0.85), WHITE));
    p.push(paint(tri([-1.15, 3.26, D / 2 + 1.7], [1.15, 3.26, D / 2 + 1.7], [0, 3.95, D / 2 + 1.7]), WHITE));
    p.push(paint(box(1.7, 0.24, 1.2, 0, 0.12, D / 2 + 0.95), GREY), paint(box(1.7, 0.24, 0.6, 0, 0.36, D / 2 + 0.7), GREY));
    p.push(...frontWindows([-6, -3.6, -1.2, 1.2, 3.6, 6], [0, 1], D / 2, (c, row, s) => row === 0 && Math.abs(c) < 2 && s === -Math.sign(c)));
    p.push(paint(box(1.15, 5.4, 1.0, 5.4, H + 1.3, -1.9), BRICK), paint(box(1.35, 0.22, 1.2, 5.4, H + 4.0, -1.9), GREY));
    p.push(...flowerBed(R, -6.6, -1.4, D / 2 + 0.6), ...flowerBed(R, 1.4, 6.6, D / 2 + 0.6));
    p.push(...shrub(R, -7.6, D / 2 - 0.4, 1.1), ...shrub(R, 7.6, D / 2 - 0.4, 1.1));
    return { walls, rest: merge(p) };
  },
  // a bungalow: one storey, a gable to the street, a deep porch on fat columns
  bungalow() {
    const W = 9.6, D = 9.6, H = 3.8, R = seeded(5);
    const walls = bare(box(W, H, D, 0, H / 2, 0));
    const p = [];
    const ends = gableEnds(D, W, H, 3.0); ends.forEach((g) => { g.rotateY(Math.PI / 2); p.push(paint(g, WALL)); });
    const roof = gable(D + 0.6, W, H, 3.0, 0.7, 0.55); roof.forEach((g) => { g.rotateY(Math.PI / 2); p.push(paint(g, ROOF)); });
    p.push(paint(box(1.5, 1.1, 0.12, 0, H + 1.25, D / 2 + 0.02), WHITE), paint(box(1.15, 0.8, 0.14, 0, H + 1.25, D / 2 + 0.03), PANE));
    p.push(paint(box(W + 0.2, 0.55, D + 0.2, 0, 0.27, 0), GREY));
    for (const x of [-1, 1]) for (const z of [-1, 1]) p.push(paint(box(0.24, H, 0.24, x * W / 2, H / 2, z * D / 2), WHITE));
    // the porch: a floor, fat tapering columns on brick piers, its own shallow roof
    p.push(paint(box(W + 0.4, 0.45, 3.0, 0, 0.45, D / 2 + 1.5), [0.62, 0.6, 0.56]));
    for (const x of [-4.4, -1.5, 1.5, 4.4]) { p.push(paint(box(0.62, 1.0, 0.62, x, 1.15, D / 2 + 2.6), BRICK)); p.push(paint(cyl(0.17, 0.26, 1.85, 8, x, 2.55, D / 2 + 2.6), WHITE)); }
    p.push(paint(box(W + 0.5, 0.32, 0.36, 0, 3.6, D / 2 + 2.6), WHITE));
    const pr = box(W + 1.0, 0.22, 3.6, 0, 0, 0); pr.rotateX(0.12); pr.translate(0, 3.92, D / 2 + 1.75); p.push(paint(pr, ROOF));
    p.push(paint(box(2.0, 0.24, 0.8, 0, 0.12, D / 2 + 3.4), GREY));
    p.push(...door(0, D / 2, 0.68));
    p.push(...frontWindows([-3.6, -1.2, 1.2, 3.6], [0], D / 2, (c, row, s) => Math.abs(c) < 2 && s === -Math.sign(c)));
    p.push(paint(box(1.2, 7.4, 1.1, -W / 2 - 0.45, 3.7, -1.5), BRICK));
    p.push(...flowerBed(R, -5.2, -2.0, D / 2 + 3.4), ...flowerBed(R, 2.0, 5.2, D / 2 + 3.4));
    p.push(...shrub(R, -5.6, -D / 2 + 1, 1.0));
    return { walls, rest: merge(p) };
  },
  // a ranch: long and low, the garage on the end with a hoop over its door
  ranch() {
    const W = 14.4, D = 9.6, H = 3.4, R = seeded(7);
    const walls = bare(box(W, H, D, 0, H / 2, 0));
    const p = [];
    // the garage, its door in white panels
    p.push(paint(box(6.0, 3.2, D, 10.2, 1.6, 0), WALL));
    p.push(paint(box(4.8, 2.5, 0.1, 10.2, 1.3, D / 2 + 0.02), [0.96, 0.95, 0.92]));
    for (const y of [0.65, 1.28, 1.91]) p.push(paint(box(4.8, 0.07, 0.14, 10.2, y, D / 2 + 0.04), [0.72, 0.72, 0.7]));
    p.push(paint(box(5.4, 0.2, 0.16, 10.2, 2.65, D / 2 + 0.03), WHITE));
    // one low gable over both
    const RW = W + 6.0;
    gableEnds(RW, D, H, 1.9).forEach((g) => { g.translate(3.0, 0, 0); p.push(paint(g, WALL)); });
    gable(RW, D, H, 1.9, 0.5, 0.9).forEach((g) => { g.translate(3.0, 0, 0); p.push(paint(g, ROOF)); });
    p.push(paint(box(RW + 0.1, 0.3, D + 0.1, 3.0, H - 0.15, 0), WHITE));
    p.push(paint(box(W + 0.2, 0.45, D + 0.2, 0, 0.22, 0), GREY));
    p.push(...door(2.4, D / 2, 0.45));
    p.push(paint(box(1.6, 0.24, 1.0, 2.4, 0.12, D / 2 + 0.6), GREY));
    p.push(...frontWindows([-6, -3.6, -1.2, 1.2, 3.6, 6], [0], D / 2, (c, row, s) => Math.abs(c - 2.4) < 1.5 && s === Math.sign(2.4 - c)));
    // the driveway, the hoop over the garage
    p.push(paint(box(5.4, 0.06, 7.0, 10.2, 0.03, D / 2 + 3.5), [0.6, 0.6, 0.6]));
    p.push(paint(box(1.8, 1.15, 0.07, 10.2, 3.9, D / 2 + 0.25), [0.97, 0.97, 0.95]));
    p.push(paint(box(0.6, 0.45, 0.08, 10.2, 3.75, D / 2 + 0.27), [0.85, 0.2, 0.15]));
    const rim = new THREE.TorusGeometry(0.24, 0.025, 5, 14); rim.rotateX(Math.PI / 2); rim.translate(10.2, 3.42, D / 2 + 0.55); p.push(paint(rim, [1, 0.45, 0.1]));
    p.push(...flowerBed(R, -6.6, -2.0, D / 2 + 0.6), ...shrub(R, -7.7, D / 2 - 0.2, 1.0), ...shrub(R, 6.6, D / 2 + 0.5, 0.8));
    return { walls, rest: merge(p) };
  },
  // a cape: a storey and a half, a steep roof with two dormers
  cape() {
    const W = 9.6, D = 9.6, H = 3.4, R = seeded(11);
    const walls = bare(box(W, H, D, 0, H / 2, 0));
    const p = [];
    gableEnds(W, D, H, 4.2).forEach((g) => p.push(paint(g, WALL)));
    gable(W, D, H, 4.2, 0.35, 0.5).forEach((g) => p.push(paint(g, ROOF)));
    for (const s of [-1, 1]) {
      const x = s * 2.4;
      p.push(paint(box(1.9, 1.7, 2.6, x, 5.05, 2.15), WALL));
      gable(1.9, 2.6, 5.9, 0.85, 0.2, 0.25, 0.16).forEach((g) => { g.rotateY(Math.PI / 2); g.translate(x, 0, 2.15); p.push(paint(g, ROOF)); });
      p.push(paint(tri([x - 0.95, 5.9, 3.46], [x + 0.95, 5.9, 3.46], [x, 6.75, 3.46]), WALL));
      p.push(paint(box(1.2, 1.15, 0.1, x, 5.0, 3.47), WHITE), paint(box(0.95, 0.9, 0.12, x, 5.0, 3.48), PANE));
    }
    p.push(paint(box(W + 0.12, 0.28, D + 0.12, 0, H - 0.14, 0), WHITE));
    for (const x of [-1, 1]) for (const z of [-1, 1]) p.push(paint(box(0.24, H, 0.24, x * W / 2, H / 2, z * D / 2), WHITE));
    p.push(paint(box(W + 0.2, 0.45, D + 0.2, 0, 0.22, 0), GREY));
    p.push(...door(0, D / 2, 0.45));
    p.push(paint(box(1.6, 0.22, 0.9, 0, 0.11, D / 2 + 0.5), GREY));
    p.push(...frontWindows([-3.6, -1.2, 1.2, 3.6], [0], D / 2, (c, row, s) => Math.abs(c) < 2 && s === -Math.sign(c)));
    p.push(paint(box(1.3, 3.0, 1.2, 0, 8.0, -0.6), BRICK));
    p.push(...flowerBed(R, -4.8, -1.4, D / 2 + 0.6), ...flowerBed(R, 1.4, 4.8, D / 2 + 0.6));
    p.push(...shrub(R, -5.4, D / 2 - 0.5, 1.0), ...shrub(R, 5.4, D / 2 - 0.5, 1.0));
    return { walls, rest: merge(p) };
  },
};

// ---------- trees ----------
function blobTree(R, crown, trunkH, trunkR, greens) {
  const parts = [];
  const trunk = cyl(trunkR * 0.6, trunkR, trunkH, 7, 0, trunkH / 2, 0); parts.push(paint(trunk, [0.33, 0.24, 0.17]));
  for (const [x, y, z, r] of crown) {
    const b = ni(new THREE.IcosahedronGeometry(r, 1)); const p = b.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const s = 1 + (R() - 0.5) * 0.2; p[i] *= s; p[i + 1] *= s; p[i + 2] *= s; }
    b.translate(x, y, z);
    const g = greens[Math.floor(R() * greens.length)], top = (y - trunkH) / 6;
    parts.push(paint(b, (P, i) => { const k = 0.82 + 0.3 * Math.max(0, Math.min(1, (P.getY(i) - trunkH) / 6)) + (P.getX(i) * 0.37 + P.getZ(i) * 0.21) % 0.06; return [g[0] * k, g[1] * k, g[2] * k]; }));
  }
  return merge(parts);
}
export const TREES = {
  // a round street maple
  maple() {
    const R = seeded(13);
    return blobTree(R, [[0, 6.6, 0, 3.1], [2.0, 5.6, 0.6, 2.3], [-1.9, 5.8, -0.5, 2.4], [0.5, 8.3, -0.6, 2.3], [-0.7, 5.3, 1.8, 2.0], [0.9, 5.5, -2.0, 2.0], [-0.3, 7.6, 1.2, 1.9]],
      4.2, 0.42, [[0.28, 0.5, 0.18], [0.33, 0.55, 0.2], [0.24, 0.45, 0.16]]);
  },
  // a tall elm, vase-shaped
  elm() {
    const R = seeded(17), parts = [];
    parts.push(paint(cyl(0.28, 0.5, 5.5, 7, 0, 2.75, 0), [0.32, 0.25, 0.18]));
    for (const a of [0, 2.1, 4.2]) parts.push(paint(beam(V(0, 5.0, 0), V(Math.cos(a) * 2.2, 8.6, Math.sin(a) * 2.2), 0.3), [0.32, 0.25, 0.18]));
    const crown = [[0, 10.2, 0, 3.4], [2.6, 9.4, 0.8, 2.6], [-2.4, 9.6, -0.8, 2.7], [0.6, 11.8, -0.7, 2.4], [-1.0, 9.0, 2.4, 2.4], [1.2, 9.2, -2.4, 2.3], [-0.4, 12.2, 1.2, 2.0]];
    const t = blobTree(R, crown, 6.5, 0.01, [[0.25, 0.46, 0.18], [0.3, 0.5, 0.2], [0.22, 0.42, 0.17]]);
    return merge([...parts, t]);
  },
  // a spruce in a yard
  spruce() {
    const parts = [paint(cyl(0.18, 0.32, 2.6, 6, 0, 1.3, 0), [0.3, 0.22, 0.16])];
    const tiers = [[3.2, 4.6, 3.8], [2.6, 4.0, 6.0], [2.0, 3.4, 8.0], [1.3, 2.8, 9.8], [0.7, 2.0, 11.2]];
    tiers.forEach(([r, h, y], k) => parts.push(paint(new THREE.ConeGeometry(r, h, 9).translate(0, y, 0), [0.12, 0.3 + k * 0.012, 0.18])));
    return merge(parts);
  },
};

// ---------- the street ----------
export const STREET = {
  // an acorn street lamp, black, a white globe (its light is a glow)
  lamp() {
    const iron = [0.08, 0.08, 0.09];
    return merge([paint(cyl(0.32, 0.4, 0.7, 10, 0, 0.35, 0), iron), paint(cyl(0.09, 0.12, 4.2, 8, 0, 2.6, 0), iron), paint(cyl(0.18, 0.12, 0.3, 10, 0, 4.75, 0), iron),
      paint(sph(0.36, 1, 1.25, 1, 0, 5.3, 0, 12, 10), [1, 0.98, 0.9]), paint(new THREE.ConeGeometry(0.3, 0.36, 10).translate(0, 5.86, 0), iron),
      paint(box(0.06, 0.06, 0.9, 0, 4.2, 0.45), iron)]);
  },
  // the banner hung from a lamp post's arm (its cloth sways)
  banner() { const g = new THREE.PlaneGeometry(0.85, 2.0, 1, 4); g.rotateY(Math.PI / 2); g.translate(0, 3.15, 0.5); return paint(g, WALL); },
  hydrant() {
    const red = [0.82, 0.08, 0.06], cap = [0.9, 0.9, 0.85];
    return merge([paint(cyl(0.2, 0.22, 0.7, 10, 0, 0.35, 0), red), paint(cyl(0.27, 0.27, 0.1, 10, 0, 0.05, 0), red), paint(cyl(0.26, 0.26, 0.1, 10, 0, 0.72, 0), red),
      paint(sph(0.21, 1, 0.75, 1, 0, 0.78, 0, 10, 6), cap), paint(cyl(0.05, 0.05, 0.12, 6, 0, 0.98, 0), cap),
      paint(cyl(0.09, 0.09, 0.62, 8, 0, 0.48, 0).rotateZ(Math.PI / 2), red), paint(cyl(0.11, 0.11, 0.18, 8, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0.5, 0.2), cap)]);
  },
  mailbox() {
    const parts = [];
    parts.push(paint(box(0.1, 1.05, 0.1, 0, 0.52, 0), [0.4, 0.3, 0.22]));
    const b = new THREE.CylinderGeometry(0.22, 0.22, 0.62, 12, 1, false, 0, Math.PI); b.rotateX(Math.PI / 2); b.rotateZ(Math.PI / 2); b.translate(0, 1.12, 0);
    parts.push(paint(b, WALL), paint(box(0.44, 0.24, 0.62, 0, 1.0, 0), WALL), paint(box(0.03, 0.32, 0.09, 0.24, 1.27, -0.12), [0.9, 0.12, 0.1]));
    return merge(parts);
  },
  // a wheelie bin out for Monday
  bin() {
    return merge([paint(box(0.62, 1.0, 0.72, 0, 0.55, 0), WALL), paint(box(0.68, 0.08, 0.8, 0, 1.08, -0.02), WALL),
      paint(cyl(0.1, 0.1, 0.06, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.32, 0.1, -0.32), DARK), paint(cyl(0.1, 0.1, 0.06, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(-0.32, 0.1, -0.32), DARK)]);
  },
  // a pink plastic flamingo on its wire legs
  flamingo() {
    const pink = [1, 0.4, 0.62];
    const neck = new THREE.TorusGeometry(0.22, 0.045, 5, 12, Math.PI * 1.25); neck.rotateY(Math.PI / 2); neck.translate(0, 1.18, 0.12);
    return merge([paint(sph(0.24, 0.8, 0.62, 1.35, 0, 0.92, 0, 10, 8), pink), paint(neck, pink), paint(sph(0.09, 1, 1, 1.3, 0, 1.32, 0.3, 8, 6), pink),
      paint(new THREE.ConeGeometry(0.04, 0.16, 5).rotateX(Math.PI * 0.75).translate(0, 1.26, 0.42), [0.1, 0.1, 0.1]),
      paint(cyl(0.012, 0.012, 0.75, 4, 0.05, 0.38, 0), [0.15, 0.15, 0.15]), paint(cyl(0.012, 0.012, 0.75, 4, -0.05, 0.38, 0.04), [0.15, 0.15, 0.15])]);
  },
  // a length of bunting: pennants on a line across the road (x from -1 to 1, sagging; scaled to span)
  bunting() {
    const parts = [], N = 22, cols = [[0.95, 0.2, 0.25], [1, 1, 1], [0.2, 0.45, 0.9], [1, 0.8, 0.2], [0.3, 0.75, 0.45]];
    for (let i = 0; i < N; i++) {
      const u0 = -1 + (i + 0.15) * 2 / N, u1 = -1 + (i + 0.85) * 2 / N, um = (u0 + u1) / 2;
      const y0 = -(1 - u0 * u0), y1 = -(1 - u1 * u1), ym = -(1 - um * um);
      // the drop is in x units here; the part scales x by the half-span and y by the sag
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([u0, y0, 0, u1, y1, 0, um, ym - 0.9, 0, u0, y0, 0, um, ym - 0.9, 0, u1, y1, 0], 3));
      g.computeVertexNormals();
      parts.push(paint(g, cols[i % cols.length]));
    }
    return merge(parts);
  },
  line() { const g = new THREE.CylinderGeometry(0.02, 0.02, 1, 4, 8); g.rotateZ(Math.PI / 2); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const u = p[i] * 2; p[i] = u; p[i + 1] += -(1 - u * u); } g.computeVertexNormals(); return paint(g, [0.9, 0.9, 0.88]); },
};
