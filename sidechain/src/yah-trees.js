// You Are Here: what grows on the hill in August. Crowns built from many small clumps of
// leaves, their light worked out over the whole crown so it shades as one soft mass with its
// clumps catching the sun, darker inside and underneath; the sun comes through the edges when
// you ride toward it; they sway in the heat and lean when the music hits. Oaks and maples,
// birches, white pines, spruces; ferns, blueberry, wildflowers in the open, granite, the old
// stone walls. Every tree has a near and a far version. Geometry only: trail.js places it.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function yahRng(seed) { let s = (seed * 2654435761) % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
export function yahNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), L(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx), fy),
    L(L(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), L(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx), fy), fz);
}
export const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const K = { bark: 0, leaf: 1, stone: 2, petal: 3 };

// ---------- a geometry builder: triangles with our own normals, albedo, kind and sway ----------
export class GB {
  constructor() { this.p = []; this.n = []; this.c = []; this.k = []; this.s = []; }
  // add a geometry's triangles; fn(p, n) may change p and n (Vector3s) and returns [r, g, b, kind, sway]
  add(geo, fn) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position, Nn = g.attributes.normal;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      p.set(P.getX(i), P.getY(i), P.getZ(i));
      if (Nn) n.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); else n.set(0, 1, 0);
      const r = fn(p, n, i);
      this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z);
      this.c.push(r[0], r[1], r[2]); this.k.push(r[3]); this.s.push(r[4]);
    }
    return this;
  }
  tri(a, b, c, col, kind, sway, nrm) {
    const n = nrm || new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const v of [a, b, c]) { this.p.push(v.x, v.y, v.z); this.n.push(n.x, n.y, n.z); this.c.push(col[0], col[1], col[2]); this.k.push(kind); this.s.push(typeof sway === 'function' ? sway(v) : sway); }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.k, 1));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.s, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// a cylinder from a to b, tapering r0 -> r1 (bark)
function limb(gb, a, b, r0, r1, seg, col, H, rough = 0.12) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, Math.max(1, Math.round(L / 2.5)), true);
  g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  gb.add(g, (p, n) => { const v = 0.82 + 0.3 * yahNoise(p.x * 3, p.y * 0.8, p.z * 3) - rough * 0.5; return [col[0] * v, col[1] * v, col[2] * v, K.bark, 0.05 * Math.pow(clamp(p.y / H, 0, 1), 2)]; });
}

// a crown of clumps. spec: centre c (Vector3), radii (rx, ry, rz), the clumps [{x,y,z,r,d}], leaf colour.
// A clump's d picks its detail (0 small and many, 1 the big ones inside)
const ICO = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1)];
function crown(gb, spec, H, detail, wob = 0.22, mix = 0.62) {
  const { c, rx, ry, rz, clumps, leaf } = spec;
  const tmp = new THREE.Vector3(), cn = new THREE.Vector3();
  clumps.forEach((k, ci) => {
    const hue = k.hue ?? 0, bright = k.bright ?? 1;
    const ico = ICO[k.d ?? detail];
    gb.add(ico, (p, n) => {
      // lumpy: each clump pushed in and out by noise in the world of the tree
      const u = p.clone();
      tmp.set(k.x + u.x * k.r, k.y + u.y * k.r * (k.sy ?? 0.85), k.z + u.z * k.r);
      const w = 1 + wob * (yahNoise(tmp.x * 1.6 + 7, tmp.y * 1.6, tmp.z * 1.6) - 0.5) * 2;
      p.set(k.x + u.x * k.r * w, k.y + u.y * k.r * w * (k.sy ?? 0.85), k.z + u.z * k.r * w);
      // the light falls on the whole crown: its normal is mostly the crown's, a little the clump's
      cn.set((p.x - c.x) / (rx * rx), (p.y - c.y) / (ry * ry), (p.z - c.z) / (rz * rz)).normalize();
      n.copy(u).normalize().multiplyScalar(1 - mix).addScaledVector(cn, mix).normalize();
      // dark inside the crown and underneath it, and where the clumps crowd each other
      const depth = Math.sqrt(((p.x - c.x) / rx) ** 2 + ((p.y - c.y) / ry) ** 2 + ((p.z - c.z) / rz) ** 2);
      let occ = 0;
      for (let j = 0; j < clumps.length; j++) { if (j === ci) continue; const o = clumps[j]; const dd = Math.hypot(p.x - o.x, (p.y - o.y) / 0.85, p.z - o.z) / o.r; if (dd < 1.25) occ += (1.25 - dd) * 0.7; }
      const under = smooth(-1.05, 0.55, (p.y - c.y) / ry);
      const ao = clamp((0.42 + 0.58 * smooth(0.35, 1.0, depth)) * (0.62 + 0.38 * under) * (1 - Math.min(0.42, occ * 0.32)), 0.18, 1);
      const top = 0.92 + 0.16 * smooth(-0.2, 1, (p.y - c.y) / ry);
      const v = ao * top * bright;
      return [leaf[0] * v * (1 + hue), leaf[1] * v, leaf[2] * v * (1 - hue * 0.6), K.leaf, Math.pow(clamp(p.y / H, 0, 1), 1.4) * 0.9];
    });
  });
}

// points spread over an ellipsoid's shell (a Fibonacci spiral, jittered)
function shell(R, n, rx, ry, rz, cy, inner = 0.62, outer = 0.95, lowCut = -0.55) {
  const out = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const t = (i + 0.5) / (n * 1.4), y = 1 - 2 * t;
    if (y < lowCut) continue;
    const r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996 + R() * 0.5;
    const s = inner + (outer - inner) * R();
    out.push(new THREE.Vector3(Math.cos(a) * r * rx * s, cy + y * ry * s, Math.sin(a) * r * rz * s));
  }
  return out;
}

// ---------- the trees ----------
// a broadleaf: oak (wide, low, spreading), maple (round, dense) or tall (a straight trunk, high crown).
// The crown is a filled core of a few big clumps under many small ones that make its edge
export function broadleaf(variant, lod) {
  const R = yahRng(101 + variant * 17);
  const kind = ['oak', 'maple', 'tall', 'oak'][variant % 4];
  const H = { oak: 11.5, maple: 12.5, tall: 15 }[kind];
  const gb = new GB();
  const bark = lin(kind === 'maple' ? 0x5a4e44 : 0x4c4036);
  const leaf = lin({ oak: 0x44602a, maple: 0x4a6a2a, tall: 0x40622c }[kind]);
  const cy = H * { oak: 0.66, maple: 0.64, tall: 0.72 }[kind];
  const rx = H * { oak: 0.4, maple: 0.33, tall: 0.26 }[kind], ry = H * { oak: 0.27, maple: 0.32, tall: 0.3 }[kind], rz = rx * (0.9 + R() * 0.15);
  const c = new THREE.Vector3((R() - 0.5) * 0.6, cy, (R() - 0.5) * 0.6);
  // the trunk leans a little and splits into limbs under the crown
  const fork = new THREE.Vector3((R() - 0.5) * 0.5, H * (kind === 'tall' ? 0.5 : 0.36), (R() - 0.5) * 0.5);
  const r0 = H * 0.034;
  limb(gb, new THREE.Vector3(0, -0.4, 0), fork, r0 * 1.25, r0 * 0.8, lod ? 5 : 8, bark, H);
  const nl = lod ? 3 : 5;
  for (let i = 0; i < nl; i++) {
    const a = i * 2.4 + R() * 0.6;
    const end = new THREE.Vector3(c.x + Math.cos(a) * rx * 0.6, cy + (R() - 0.3) * ry * 0.5, c.z + Math.sin(a) * rz * 0.6);
    limb(gb, fork, end, r0 * 0.7, r0 * 0.22, lod ? 4 : 6, bark, H);
  }
  const clumps = [];
  if (!lod) for (let i = 0; i < 7; i++) clumps.push({ x: c.x + (R() - 0.5) * rx * 0.75, y: cy + (R() - 0.4) * ry * 0.6, z: c.z + (R() - 0.5) * rz * 0.75, r: rx * 0.44, sy: 0.85, d: 1, hue: 0, bright: 0.72 });
  const pts = shell(R, lod ? 13 : 46, rx, ry, rz, cy, lod ? 0.55 : 0.78, lod ? 0.8 : 1.0, kind === 'oak' ? -0.5 : -0.66);
  for (const p of pts) clumps.push({ x: p.x + c.x, y: p.y, z: p.z + c.z, r: rx * (lod ? 0.42 : 0.24) * (0.75 + R() * 0.5), sy: kind === 'oak' ? 0.78 : 0.88, d: lod ? 0 : 1, hue: (R() - 0.5) * 0.16, bright: 0.86 + R() * 0.28 });
  crown(gb, { c, rx, ry, rz, clumps, leaf }, H, 0, lod ? 0.18 : 0.3, 0.7);
  return gb.build();
}

// a birch: two or three white stems leaning apart, a light open crown on each
export function birch(variant, lod) {
  const R = yahRng(311 + variant * 23);
  const gb = new GB();
  const H = 11 + variant * 1.5;
  const leaf = lin(0x587a2e);
  const stems = variant % 2 ? 3 : 2;
  for (let s = 0; s < stems; s++) {
    const a = s * 2.2 + R(), lean = 0.12 + R() * 0.1;
    const top = new THREE.Vector3(Math.cos(a) * H * lean, H * (0.86 + R() * 0.12), Math.sin(a) * H * lean);
    const base = new THREE.Vector3(Math.cos(a) * 0.15, -0.3, Math.sin(a) * 0.15);
    // white bark with black marks
    const d = new THREE.Vector3().subVectors(top, base), L = d.length();
    const g = new THREE.CylinderGeometry(0.07, H * 0.017, L, lod ? 4 : 7, lod ? 3 : 14, true);
    g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(base.x, base.y, base.z);
    gb.add(g, (p) => {
      const m = yahNoise(p.x * 9 + s * 7, p.y * 2.6, p.z * 9);
      const dark = m > 0.7 ? 0.12 : (p.y < 1.2 ? 0.55 : 1);
      const w = lin(0xe8e4da);
      return [w[0] * dark, w[1] * dark, w[2] * dark, K.bark, 0.08 * Math.pow(clamp(p.y / H, 0, 1), 2)];
    });
    const cy = top.y - H * 0.2, rx = H * 0.17, ry = H * 0.25;
    const c = new THREE.Vector3(top.x * 0.92, cy, top.z * 0.92);
    const clumps = [];
    if (!lod) for (let i = 0; i < 2; i++) clumps.push({ x: c.x + (R() - 0.5) * rx * 0.5, y: cy + (R() - 0.5) * ry * 0.6, z: c.z + (R() - 0.5) * rx * 0.5, r: rx * 0.5, sy: 0.9, d: 1, hue: 0, bright: 0.75 });
    const pts = shell(R, lod ? 5 : 17, rx, ry, rx, 0, lod ? 0.4 : 0.6, lod ? 0.75 : 1.0, -0.85);
    for (const p of pts) clumps.push({ x: c.x + p.x, y: cy + p.y, z: c.z + p.z, r: rx * (lod ? 0.6 : 0.31) * (0.75 + R() * 0.5), sy: 0.9, d: lod ? 0 : 1, hue: 0.04 + (R() - 0.5) * 0.12, bright: 0.9 + R() * 0.25 });
    crown(gb, { c, rx, ry, rz: rx, clumps, leaf }, H, 0, 0.32, 0.65);
  }
  return gb.build();
}

// a white pine: tall and straight, its branches reaching out level in whorls, tufted along their
// length and turned up at the tips; a ragged, layered crown, not a cone
export function pine(variant, lod) {
  const R = yahRng(509 + variant * 31);
  const gb = new GB();
  const H = 17 + variant * 2;
  const bark = lin(0x4a3c32), leaf = lin(0x3c5832);
  limb(gb, new THREE.Vector3(0, -0.4, 0), new THREE.Vector3((R() - 0.5) * 0.6, H, (R() - 0.5) * 0.6), H * 0.026, 0.08, lod ? 5 : 7, bark, H);
  const whorls = lod ? 5 : 8;
  const clumps = [];
  for (let w = 0; w < whorls; w++) {
    const f = (w + 0.5) / whorls;
    const y = H * (0.3 + 0.64 * f) + (R() - 0.5) * 0.6;
    const reach = H * 0.25 * (1 - f * 0.7) * (0.75 + R() * 0.5);
    const nb = lod ? 3 : 4;
    for (let b = 0; b < nb; b++) {
      const a = b * (6.283 / nb) + R() * 0.9 + w * 1.3;
      const dx = Math.cos(a), dz = Math.sin(a);
      if (!lod) limb(gb, new THREE.Vector3(0, y - 0.2, 0), new THREE.Vector3(dx * reach * 0.9, y + reach * 0.04, dz * reach * 0.9), 0.11, 0.035, 4, bark, H);
      for (const k of lod ? [0.7] : [0.5, 0.92]) {
        const up = k > 0.9 ? 0.35 : 0;
        clumps.push({ x: dx * reach * k + (R() - 0.5) * 0.3, y: y + reach * 0.05 * k + up, z: dz * reach * k + (R() - 0.5) * 0.3, r: (reach * (0.36 - 0.08 * k) + 0.35) * (lod ? 1.5 : 1), sy: 0.6, d: lod ? 0 : 1, hue: (R() - 0.5) * 0.1, bright: 0.86 + R() * 0.26 });
      }
    }
  }
  for (let i = 0; i < (lod ? 1 : 4); i++) clumps.push({ x: (R() - 0.5) * 0.6, y: H * (0.93 + 0.06 * i / 3), z: (R() - 0.5) * 0.6, r: H * 0.06, sy: 1.1, d: 0, hue: 0.04, bright: 1.05 });
  crown(gb, { c: new THREE.Vector3(0, H * 0.62, 0), rx: H * 0.24, ry: H * 0.42, rz: H * 0.24, clumps, leaf }, H, 0, 0.34, 0.5);
  return gb.build();
}

// a spruce: dark and pointed, skirts of branches stacked and drooping, ragged at the hem with tufts
export function spruce(variant, lod) {
  const R = yahRng(709 + variant * 13);
  const gb = new GB();
  const H = 13 + variant * 2.5;
  const bark = lin(0x3e3028), leaf = lin(0x2a4a2e);
  limb(gb, new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, H * 0.4, 0), H * 0.024, H * 0.015, lod ? 4 : 6, bark, H);
  const tiers = lod ? 5 : 11;
  const tufts = [];
  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const y0 = H * (0.16 + 0.8 * f), r = H * 0.28 * (1 - f) + 0.35, h = H * 0.22 * (1 - f * 0.4);
    const g = new THREE.ConeGeometry(r, h, lod ? 8 : 14, lod ? 1 : 3, true);
    g.translate(0, y0 + h / 2, 0);
    const seed = i * 3.1 + variant;
    gb.add(g, (p, n) => {
      // the hem droops and is ragged
      const a = Math.atan2(p.z, p.x), rad = Math.hypot(p.x, p.z);
      const hem = 1 - clamp((p.y - y0) / h, 0, 1);
      const rag = (yahNoise(a * 2.6 + seed, seed, 0) - 0.5) * 1.1 * hem;
      p.y -= hem * hem * 0.7 + rag;
      const k = 1 + (yahNoise(a * 3.4 + seed, p.y * 0.5, 1) - 0.5) * 0.35 * hem;
      p.x *= k; p.z *= k;
      n.set(p.x, rad * 0.5 + 0.35, p.z).normalize();
      const ao = (0.5 + 0.5 * (1 - hem)) * (0.72 + 0.28 * f);
      return [leaf[0] * ao, leaf[1] * ao, leaf[2] * ao, K.leaf, Math.pow(clamp(p.y / H, 0, 1), 1.5) * 0.6];
    });
    if (!lod) for (let k = 0; k < 6; k++) { const a = k * 1.047 + R() * 0.8; tufts.push({ x: Math.cos(a) * r * 0.92, y: y0 - 0.2, z: Math.sin(a) * r * 0.92, r: 0.45 + r * 0.12, sy: 0.6, d: 0, hue: (R() - 0.5) * 0.08, bright: 0.85 + R() * 0.25 }); }
  }
  if (tufts.length) crown(gb, { c: new THREE.Vector3(0, H * 0.45, 0), rx: H * 0.3, ry: H * 0.55, rz: H * 0.3, clumps: tufts, leaf }, H, 0, 0.3, 0.5);
  return gb.build();
}

// ---------- the floor of the woods, the open ground ----------
// a low bush; with berries for the blueberry on the top
export function shrub(variant, berries) {
  const R = yahRng(901 + variant * 7 + (berries ? 50 : 0));
  const gb = new GB();
  const leaf = lin(berries ? 0x4e6a2a : 0x46662a);
  const clumps = [];
  const n = 6 + variant;
  for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * 0.9; clumps.push({ x: Math.cos(a) * r, y: 0.35 + R() * 0.4, z: Math.sin(a) * r, r: 0.45 + R() * 0.35, sy: 0.8, hue: berries && R() < 0.3 ? 0.18 : (R() - 0.5) * 0.1, bright: 0.85 + R() * 0.3 }); }
  crown(gb, { c: new THREE.Vector3(0, 0.4, 0), rx: 1.3, ry: 0.7, rz: 1.3, clumps, leaf }, 1.6, 1, 0.3);
  if (berries) {
    const ico = new THREE.IcosahedronGeometry(0.07, 0);
    const blue = lin(0x2a3a8a);
    for (let i = 0; i < 40; i++) {
      const cl = clumps[i % clumps.length], a = R() * 6.28, e = R() * 1.2;
      const x = cl.x + Math.cos(a) * Math.cos(e) * cl.r * 0.95, y = cl.y + Math.sin(e) * cl.r * 0.8, z = cl.z + Math.sin(a) * Math.cos(e) * cl.r * 0.95;
      gb.add(ico, (p, nn) => { nn.copy(p).normalize(); p.add(new THREE.Vector3(x, y, z)); return [blue[0], blue[1], blue[2], K.petal, 0.1]; });
    }
  }
  return gb.build();
}

// one frond: an arching strip, its leaflets as a zigzag edge
function frond(gb, base, ang, len, droop, col, tip) {
  const segs = 7, ux = Math.cos(ang), uz = Math.sin(ang);
  let prevL = null, prevR = null, prevC = null;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const out = len * f, up = len * (0.55 * f - droop * f * f);
    const C = new THREE.Vector3(base.x + ux * out, base.y + up, base.z + uz * out);
    const w = len * 0.16 * Math.sin(Math.PI * Math.min(1, f * 1.15 + 0.05)) * (i % 2 ? 1.25 : 0.8);
    const Lp = new THREE.Vector3(C.x - uz * w, C.y + w * 0.15, C.z + ux * w), Rp = new THREE.Vector3(C.x + uz * w, C.y + w * 0.15, C.z - ux * w);
    if (prevC) {
      const k = 0.75 + 0.35 * f, cc = [col[0] * k + tip[0] * f * 0.3, col[1] * k + tip[1] * f * 0.3, col[2] * k];
      const nn = new THREE.Vector3(0, 1, 0);
      const sw = (v) => clamp(Math.hypot(v.x - base.x, v.z - base.z) / len, 0, 1) * 0.35;
      gb.tri(prevC, prevL, C, cc, K.leaf, sw, nn); gb.tri(prevL, Lp, C, cc, K.leaf, sw, nn);
      gb.tri(prevC, C, prevR, cc, K.leaf, sw, nn); gb.tri(prevR, C, Rp, cc, K.leaf, sw, nn);
    }
    prevL = Lp; prevR = Rp; prevC = C;
  }
}
// a patch of ferns, about three metres across
export function fernPatch(variant) {
  const R = yahRng(1201 + variant * 11);
  const gb = new GB();
  const col = lin(variant === 2 ? 0x6a8a2a : 0x4e7a26), tip = lin(0xb0a040);
  const n = 4 + variant;
  for (let f = 0; f < n; f++) {
    const base = new THREE.Vector3((R() - 0.5) * 2.6, 0, (R() - 0.5) * 2.6);
    const nf = 6 + Math.floor(R() * 3), len = 0.8 + R() * 0.5;
    for (let i = 0; i < nf; i++) frond(gb, base, i * (6.283 / nf) + R() * 0.5, len * (0.8 + R() * 0.3), 0.55 + R() * 0.3, col, tip);
  }
  return gb.build();
}

// grass blades in a tuft
function blades(gb, R, cx, cz, n, h, col, dry) {
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, lean = 0.15 + R() * 0.35, hh = h * (0.6 + R() * 0.6);
    const x = cx + (R() - 0.5) * 0.4, z = cz + (R() - 0.5) * 0.4, w = 0.05 + R() * 0.03;
    const b0 = new THREE.Vector3(x - Math.sin(a) * w, 0, z + Math.cos(a) * w), b1 = new THREE.Vector3(x + Math.sin(a) * w, 0, z - Math.cos(a) * w);
    const t = new THREE.Vector3(x + Math.cos(a) * hh * lean, hh, z + Math.sin(a) * hh * lean);
    const k = 0.8 + R() * 0.35, d = R() < dry ? 1 : 0;
    const c = d ? [0.32 * k, 0.26 * k, 0.09 * k] : [col[0] * k, col[1] * k, col[2] * k];
    gb.tri(b0, b1, t, c, K.leaf, (v) => v.y / h * 0.3, new THREE.Vector3(0, 1, 0));
  }
}
// August in the open: tall grass gone gold in places, goldenrod, Queen Anne's lace, chicory,
// black-eyed susans. variant picks the mix
export function flowerPatch(variant) {
  const R = yahRng(1501 + variant * 19);
  const gb = new GB();
  const grass = lin(0x6a7e2c);
  for (let i = 0; i < 9; i++) blades(gb, R, (R() - 0.5) * 3, (R() - 0.5) * 3, 9, 0.9, grass, 0.35);
  const stemC = lin(0x4a6226);
  const stem = (x, z, h, lean) => { const g = new THREE.CylinderGeometry(0.012, 0.02, h, 3, 1, true); g.translate(0, h / 2, 0); g.rotateZ(lean); g.translate(x, 0, z); gb.add(g, (p) => [stemC[0], stemC[1], stemC[2], K.leaf, p.y / h * 0.35]); return new THREE.Vector3(x - Math.sin(lean) * h, Math.cos(lean) * h, z); };
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const dots = (c, r, n, spread, col, flat) => { for (let i = 0; i < n; i++) { const o = new THREE.Vector3((R() - 0.5) * spread, (R() - 0.5) * spread * (flat ? 0.15 : 1), (R() - 0.5) * spread); gb.add(ball, (p, nn) => { nn.copy(p).normalize(); p.multiplyScalar(r).add(c).add(o); return [col[0], col[1], col[2], K.petal, 0.4]; }); } };
  const mix = [[3, 1, 1, 1], [1, 3, 1, 0], [1, 1, 0, 3], [2, 0, 3, 1]][variant % 4];   // goldenrod, lace, chicory, susans
  for (let i = 0; i < mix[0]; i++) {
    // goldenrod: an arching plume of tiny yellow
    const x = (R() - 0.5) * 2.6, z = (R() - 0.5) * 2.6, h = 0.9 + R() * 0.5, top = stem(x, z, h, (R() - 0.5) * 0.3);
    const gold = lin(0xe8b818);
    for (let j = 0; j < 7; j++) { const f = j / 7; dots(new THREE.Vector3(top.x + f * 0.35, top.y - f * f * 0.35, top.z), 0.07, 3, 0.12, [gold[0] * (0.8 + 0.4 * R()), gold[1], gold[2]], false); }
  }
  for (let i = 0; i < mix[1]; i++) {
    // Queen Anne's lace: a flat white umbel
    const x = (R() - 0.5) * 2.6, z = (R() - 0.5) * 2.6, h = 0.8 + R() * 0.5, top = stem(x, z, h, (R() - 0.5) * 0.25);
    dots(top, 0.05, 16, 0.32, lin(0xf2f0e6), true);
  }
  for (let i = 0; i < mix[2]; i++) {
    // chicory: a stiff stem with sky-blue flowers along it
    const x = (R() - 0.5) * 2.6, z = (R() - 0.5) * 2.6, h = 0.7 + R() * 0.5, lean = (R() - 0.5) * 0.3; stem(x, z, h, lean);
    for (let j = 0; j < 4; j++) { const f = 0.45 + j * 0.16; dots(new THREE.Vector3(x - Math.sin(lean) * h * f + (R() - 0.5) * 0.1, Math.cos(lean) * h * f, z + (R() - 0.5) * 0.1), 0.055, 2, 0.06, lin(0x6a8ae8), false); }
  }
  for (let i = 0; i < mix[3]; i++) {
    // black-eyed susan: yellow round a dark eye
    const x = (R() - 0.5) * 2.6, z = (R() - 0.5) * 2.6, h = 0.5 + R() * 0.35, top = stem(x, z, h, (R() - 0.5) * 0.3);
    dots(top, 0.06, 7, 0.16, lin(0xf0a810), true);
    dots(top.clone().setY(top.y + 0.03), 0.045, 1, 0, lin(0x2a1408), false);
  }
  return gb.build();
}
// tall grass at the edges, some of it dry and gold
export function grassPatch(variant) {
  const R = yahRng(1701 + variant * 5);
  const gb = new GB();
  for (let i = 0; i < 14; i++) blades(gb, R, (R() - 0.5) * 3.2, (R() - 0.5) * 3.2, 10, 1.1, lin(0x5e7a28), 0.5 + 0.15 * variant);
  return gb.build();
}

// ---------- stone ----------
// a granite boulder: lumpy and rounded, lichen in patches, moss on top in the woods
export function boulder(variant, mossy) {
  const R = yahRng(2001 + variant * 29 + (mossy ? 3 : 0));
  const gb = new GB();
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
  const sx = 1.2 + R() * 0.5, sy = 0.6 + R() * 0.3, sz = 0.9 + R() * 0.4, seed = variant * 4.7;
  const granite = lin(0x8e8a84), lichen = lin(0xb4b89a), moss = lin(0x4a6a24);
  // shape it, then light it from its own lumps
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = 1 + 0.32 * (yahNoise(x * 1.3 + seed, y * 1.3, z * 1.3) - 0.5) + 0.12 * (yahNoise(x * 3.1, y * 3.1 + seed, z * 3.1) - 0.5);
    let yy = y * sy * k; if (yy < -0.15) yy = -0.15 + (yy + 0.15) * 0.25;
    P.setXYZ(i, x * sx * k, yy + 0.15, z * sz * k);
  }
  g.computeVertexNormals();
  gb.add(g, (p, n) => {
    const lc = yahNoise(p.x * 2.2 + 3, p.y * 2.2, p.z * 2.2 + seed), grain = 0.86 + 0.22 * yahNoise(p.x * 9, p.y * 9, p.z * 9);
    let c = granite.map((v) => v * grain);
    if (lc > 0.62) c = c.map((v, j) => v + (lichen[j] - v) * 0.7);
    if (mossy && n.y > 0.55 && yahNoise(p.x * 1.5, 7, p.z * 1.5) > 0.4) c = moss.map((v) => v * (0.8 + 0.3 * grain));
    return [c[0], c[1], c[2], K.stone, 0];
  });
  return gb.build();
}
// a ledge of granite for the top: a broad slab rising out of the ground in steps
export function ledge(variant) {
  const R = yahRng(2301 + variant * 41);
  const gb = new GB();
  const g = new THREE.BoxGeometry(8, 2, 6, 10, 3, 8);
  const P = g.attributes.position, seed = variant * 3.3;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = yahNoise(x * 0.4 + seed, z * 0.4, 1);
    const round = 1 - 0.25 * Math.pow(Math.max(Math.abs(x) / 4, Math.abs(z) / 3), 4);
    x *= round * (0.85 + 0.3 * k); z *= round * (0.85 + 0.3 * k);
    if (y > 0) y = 0.6 + 0.9 * k + 0.25 * (yahNoise(x * 1.1, z * 1.1, seed) - 0.5) - 0.5 * Math.pow(Math.abs(x) / 4, 2);
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const granite = lin(0x96918a), dark = lin(0x5a5650);
  gb.add(g, (p, n) => {
    const crack = Math.abs(yahNoise(p.x * 0.8, p.z * 0.8, 5) - 0.5) < 0.03 ? 0.55 : 1;
    const c = (n.y > 0.5 ? granite : dark).map((v) => v * crack * (0.85 + 0.25 * yahNoise(p.x * 6, p.y * 6, p.z * 6)));
    return [c[0], c[1], c[2], K.stone, 0];
  });
  return gb.build();
}
// a length of old stone wall through the woods, about seven metres, tumbled at the ends
export function stoneWall(variant) {
  const R = yahRng(2601 + variant * 37);
  const gb = new GB();
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const cols = [0x8a857c, 0x7a766e, 0x9a958a, 0x6e6a62].map(lin), moss = lin(0x4e6a28);
  for (let course = 0; course < 3; course++) {
    const y0 = course * 0.32, n = 13 - course * 2;
    for (let i = 0; i < n; i++) {
      const z = -3.4 + (i + (course % 2) * 0.5) * (6.8 / n) + (R() - 0.5) * 0.2;
      const end = Math.max(0, Math.abs(z) - 2.6);
      if (course > 0 && R() < end * 0.9) continue;
      const sx = 0.32 + R() * 0.12, sy = 0.17 + R() * 0.07, sz = 0.3 + R() * 0.14, x = (R() - 0.5) * 0.15, seed = R() * 9;
      const c = cols[Math.floor(R() * cols.length)];
      gb.add(ico, (p, nn) => {
        const k = 1 + 0.25 * (yahNoise(p.x * 2 + seed, p.y * 2, p.z * 2) - 0.5);
        nn.copy(p).normalize();
        p.set(x + p.x * sx * k, y0 + sy + p.y * sy * k - end * 0.3, z + p.z * sz * k);
        const top = nn.y > 0.5 && yahNoise(p.x * 2, p.z * 2, seed) > 0.5 ? 1 : 0;
        const v = 0.85 + 0.2 * yahNoise(p.x * 7, p.y * 7, p.z * 7);
        return top ? [moss[0] * v, moss[1] * v, moss[2] * v, K.stone, 0] : [c[0] * v, c[1] * v, c[2] * v, K.stone, 0];
      });
    }
  }
  return gb.build();
}
// a fallen log, moss along its top, and a stump
export function log(variant) {
  const R = yahRng(2901 + variant * 3);
  const gb = new GB();
  const L = 6 + variant * 2, r = 0.32 + variant * 0.08;
  const g = new THREE.CylinderGeometry(r * 0.85, r, L, 9, 6, false);
  g.rotateZ(Math.PI / 2); g.translate(0, r * 0.8, 0);
  const bark = lin(0x5a4a3a), moss = lin(0x58782a), cut = lin(0xa88a62);
  gb.add(g, (p, n) => {
    const end = Math.abs(n.x) > 0.9;
    const v = 0.8 + 0.3 * yahNoise(p.x * 2, p.y * 6, p.z * 6);
    const c = end ? cut : (n.y > 0.4 && yahNoise(p.x * 0.8, 1, 2) > 0.35 ? moss : bark);
    return [c[0] * v, c[1] * v, c[2] * v, K.bark, 0];
  });
  return gb.build();
}

// ---------- the material: one shader for all of it ----------
const VS = /* glsl */`
  attribute vec3 aTint; attribute float aKind; attribute float aSway;
  uniform float uTime, uGust, uLean;
  uniform vec2 uWind;
  varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying vec3 vO; varying float vKind;
  void main(){
    #ifdef USE_INSTANCING
      mat4 im = instanceMatrix;
    #else
      mat4 im = mat4(1.0);
    #endif
    vec4 w = modelMatrix * im * vec4(position, 1.0);
    vec3 ip = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float sc = length(im[1].xyz) * length(modelMatrix[1].xyz);
    float ph = ip.x * 0.071 + ip.z * 0.093;
    // the heat's slow breeze, a flutter at the tips, and the lean when the music hits
    float sway = (0.5 + 0.5 * sin(uTime * 0.8 + ph * 0.6)) * uGust + uLean;
    float flutter = sin(uTime * 2.3 + ph + position.y * 0.6) * 0.6 + sin(uTime * 3.9 + ph * 2.1 + position.x * 1.3) * 0.4;
    w.xz += uWind * aSway * sc * (sway + flutter * 0.06 * (0.4 + uGust));
    w.y -= aSway * sc * abs(sway) * 0.12;
    vW = w.xyz; vO = position;
    vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vCol = color * aTint; vKind = aKind;
    gl_Position = projectionMatrix * (viewMatrix * w);
  }`;
const FS = /* glsl */`
  uniform vec3 uSun, uSunDir, uSky, uBounce, uFill, uFillDir, uFog, uCam;
  uniform float uSunK, uHemiK, uFillK, uFogDensity, uTrans, uGlow, uLit, uBeatGlow;
  varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying vec3 vO; varying float vKind;
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    vec3 N = vN / max(length(vN), 1e-4);
    if (!gl_FrontFacing) N = -N;
    vec3 V = uCam - vW; float d = max(length(V), 1e-3); V /= d;
    vec3 L = normalize(uSunDir);
    float leaf = step(0.5, vKind) * step(vKind, 1.5), petal = step(2.5, vKind), soft = max(leaf, petal);
    vec3 alb = vCol;
    // leaves in clusters across a crown, only up close (far off it would sparkle)
    float near = 1.0 - smoothstep(22.0, 60.0, d);
    if (leaf > 0.5 && near > 0.0) { float nn = n3(vO * 2.3) * 0.65 + n3(vO * 5.1) * 0.35; alb *= 1.0 + (nn - 0.5) * 0.55 * near; }
    float ndl = dot(N, L);
    float dif = mix(max(ndl, 0.0), clamp((ndl + 0.45) / 1.45, 0.0, 1.0), soft);
    vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
    vec3 lit = amb + uSun * uSunK * dif + uFill * uFillK * max(dot(N, normalize(uFillDir)), 0.0);
    vec3 col = alb * lit * 0.3183;
    // the sun through the leaves, when you look toward it past them
    float rim = pow(max(1.0 - abs(dot(N, V)), 0.0), 1.5);
    float back = pow(max(dot(-V, L), 0.0), 2.0) * (0.25 + 0.75 * rim);
    col += alb * vec3(1.25, 1.35, 0.5) * uSun * uSunK * back * uTrans * soft * 0.45;
    // a little of the sky on the edges
    col += uSky * uHemiK * pow(max(1.0 - max(dot(N, V), 0.0), 0.0), 4.0) * 0.05 * (0.5 + 0.5 * N.y);
    // petals and berries keep a little of their colour in the dusk, and everything a little light of
    // its own, so nothing goes black at night
    col += alb * petal * uGlow + alb * uGlow * 0.35;
    // a chorus: the whole canopy takes the beat in gold
    col += alb * vec3(1.0, 0.8, 0.35) * uBeatGlow * soft;
    // windows, lamps, the light inside: their own light, brighter as the evening comes
    if (vKind > 3.5) col = alb * uLit;
    float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;

export function natureMaterial(double) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uGust: { value: 0.25 }, uLean: { value: 0 }, uWind: { value: new THREE.Vector2(0.8, 0.6) },
      uSun: { value: new THREE.Color(1, 1, 1) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunK: { value: 3 },
      uSky: { value: new THREE.Color(0.6, 0.7, 0.9) }, uBounce: { value: new THREE.Color(0.3, 0.3, 0.2) }, uHemiK: { value: 1.5 },
      uFill: { value: new THREE.Color(1, 0.9, 0.7) }, uFillDir: { value: new THREE.Vector3(0, 1, 0) }, uFillK: { value: 0.3 },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0013 }, uCam: { value: new THREE.Vector3() }, uTrans: { value: 1.2 }, uGlow: { value: 0 }, uLit: { value: 0.4 }, uBeatGlow: { value: 0 },
    },
    vertexShader: VS, fragmentShader: FS, vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// push the light of the moment into the nature materials
export function lightNature(mats, P, cam, time, fogD, gust, lean, beatGlow = 0) {
  for (const m of mats) {
    const u = m.uniforms;
    u.uTime.value = time; u.uGust.value = gust; u.uLean.value = lean; u.uBeatGlow.value = beatGlow;
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(P.moonDir[0], P.moonDir[1], P.moonDir[2]).normalize();
    u.uSunK.value = P.sunK ?? 1; u.uHemiK.value = P.hemiK ?? 1.5;
    u.uSky.value.set(P.skyLight ?? 0x8090a0); u.uBounce.value.set(P.bounce ?? 0x404030);
    u.uFill.value.set(P.skyGlow ?? 0xffffff); if (P.glowDir) u.uFillDir.value.set(P.glowDir[0], P.glowDir[1], P.glowDir[2]).normalize(); u.uFillK.value = P.fillK ?? 0.7;
    u.uFog.value.set(P.fog); u.uFogDensity.value = fogD; u.uCam.value.copy(cam);
    // the light through the leaves is the sun's: none once it's down
    u.uTrans.value = 1.4 * clamp((P.moonDir ? P.moonDir[1] : 0.5) * 6, 0, 1);
    u.uGlow.value = 0.25 * (1 - clamp((P.sunK ?? 1) / 1.5, 0, 1));
    if (!m.userData.ownLit) u.uLit.value = 0.35 + 2.2 * clamp(P.windowK ?? 0.12, 0, 1);
  }
}
