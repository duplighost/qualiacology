// No Lifeguard On Duty. A public beach the week after everybody left for the season. The kid went
// home; they took the flags, the rope and the whistle and left the chair up there, still facing the
// water. The lot comes down to the sand behind a seawall, one car in it and a sign that says they tow
// on Thursdays, the steps down to the beach, the shack shut, the umbrellas chained; elsewhere dunes,
// their grass and fences. The road runs along the sand with the sea on her left until "I'm going in",
// then jumps the surf and goes out over the water: the beach a long white line off to the right, a
// sign on it big enough to read from out there, SWIM AT YOUR OWN RISK, the chair on the sand not
// looking back. In along the
// surf at sunset; out again at dusk with the water still warm; then cold, far out, the land gone in
// the dark and the lights of wherever everybody went always the same distance ahead. The last chorus
// brings her almost back in and the shore pulls away. September: the tow truck in the lot with her
// car on the hook, the sandals by the steps, a bell buoy, and the chair, still facing the water.
// The beach is a strip of ground laid along the road at fixed song times (NlgShore), its waterline
// wherever the song's `shore` says; the sea is a plane under everything (NlgSea's material).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, signV } from './scenery.js';
import { gridNormals, normalsDue, alongAt } from './trail.js';
import { paint, rgb, box } from './summer.js';
import { AA_GLSL } from './aa.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const nz = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, x, y, z, w = 10, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.translate(x, y, z); return g; };
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a square-section piece from one point to another
function beam(a, b, w, d = w) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const WHITE = rgb(0xf0ece4), RED = rgb(0xc8201a), SILVER = rgb(0xb8bcc4), WOOD = rgb(0x8f8474), CONC = rgb(0xb8b4aa), DARK = rgb(0x1c1e22), RUST = rgb(0x8a4a2a), BRASS = rgb(0xc8a050);
const LIGHT = [1, 0.86, 0.62], AMBER = [1, 0.6, 0.12], AWAY = [1, 0.78, 0.5];

// ---------- where the water is ----------
// From the song's `shore` (the waterline's distance from the road, keyed by song time; negative is
// on her left) and `lots` (stretches where a lot comes down to the sand instead of dunes): the
// ground's height anywhere, for the strip and for everything standing on it.
export function nlgGeo(plan) {
  if (plan._nlgGeo) return plan._nlgGeo;
  const K = plan.shore || [[-10, -44], [400, -44]];
  const lots = plan.lots || [];
  const shoreX = (t) => {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 0; i + 1 < K.length; i++) { const a = K[i], b = K[i + 1]; if (t <= b[0]) return a[1] + (b[1] - a[1]) * smooth(a[0], b[0], t); }
    return K[K.length - 1][1];
  };
  const lot = (t) => { let k = 0; for (const [a, b] of lots) k = Math.max(k, smooth(a, a + 1.2, t) * (1 - smooth(b - 1.2, b, t))); return k; };
  // the back of the beach: the foot of the dunes, or the seawall (further off, so the lot and what's
  // on it stand clear of the road's edge from where she rides)
  const backStart = (t) => Math.max(shoreX(t) + 54, 24 + 18 * lot(t));
  const floor = (t, x) => {
    const sx = shoreX(t), d = x - sx;
    if (d < 0) return 0.08 + d * 0.6;                    // a step down at the waterline, under the sea
    let y = 0.08 + Math.min(d, 90) * 0.022;              // the beach, rising gently from the water
    const u = x - backStart(t);
    if (u > -0.3) {
      const L = lot(t);
      // the dunes: up over thirteen metres, hummocks along the top, down the back; the land behind
      const ridge = smooth(0, 13, u) * (1 - smooth(32, 48, u)) * (0.8 + 0.2 * Math.sin(u * 0.4 + t * 1.3) * Math.sin(t * 0.47 + u * 0.13));
      const inland = smooth(40, 70, u) * (0.6 + 1.6 * nz(t * 0.07 + u * 0.012));
      const dune = (4.2 + 2.2 * nz(t * 0.13 + 3.7)) * ridge + inland;
      // or the seawall, the lot on top of it, and the land behind the lot
      const wall = 2.1 * smooth(-0.3, 0.35, u) + smooth(84, 100, u) * 0.6 * nz(t * 0.07 + u * 0.012);
      y += dune * (1 - L) + wall * L;
    }
    return y;
  };
  return (plan._nlgGeo = { shoreX, backStart, lot, floor });
}

// ---------- the things on the beach, at the size they are ----------
function faceGeo() { const g = new THREE.PlaneGeometry(1, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; }
const NLG = {
  // the lifeguard chair: four splayed legs, braces, the ladder up the front (toward the water), the
  // platform and the seat; on the back, toward the beach, a red cross and the board the sign hangs on
  chair() {
    const P = [];
    const leg = (sx, sz, y) => [sx * (1.75 - 0.6 * y / 4.4), y, sz * (1.55 - 0.6 * y / 4.4)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(paint(beam(leg(sx, sz, -0.4), leg(sx, sz, 4.5), 0.26), WHITE));
    for (const s of [-1, 1]) {
      P.push(paint(beam(leg(s, -1, 0.5), leg(s, 1, 3.5), 0.12), WHITE), paint(beam(leg(s, 1, 0.5), leg(s, -1, 3.5), 0.12), WHITE));
      P.push(paint(beam(leg(-1, s, 2.2), leg(1, s, 2.2), 0.12), WHITE), paint(beam(leg(s, -1, 2.2), leg(s, 1, 2.2), 0.12), WHITE));
    }
    P.push(paint(beam(leg(-1, -1, 0.5), leg(1, -1, 3.5), 0.12), WHITE), paint(beam(leg(1, -1, 0.5), leg(-1, -1, 3.5), 0.12), WHITE));
    for (const s of [-1, 1]) P.push(paint(beam([s * 0.5, 0, 2.3], [s * 0.5, 4.45, 1.05], 0.12, 0.16), WHITE));
    for (let h = 0.5; h < 4.3; h += 0.55) P.push(paint(box(1.0, 0.07, 0.2, 0, h, 2.3 - 1.25 * h / 4.45), WHITE));
    P.push(paint(box(2.8, 0.2, 2.4, 0, 4.5, -0.05), WHITE));
    P.push(paint(box(1.8, 0.14, 0.8, 0, 5.05, -0.3), WHITE));
    for (const s of [-1, 1]) {
      P.push(paint(box(0.12, 0.5, 0.12, s * 0.8, 4.8, 0.05), WHITE), paint(box(0.12, 0.5, 0.12, s * 0.8, 4.8, -0.65), WHITE));
      P.push(paint(box(0.14, 0.1, 0.95, s * 0.95, 5.45, -0.3), WHITE), paint(box(0.1, 0.4, 0.1, s * 0.95, 5.25, 0.1), WHITE));
    }
    P.push(paint(box(2.0, 1.4, 0.14, 0, 5.85, -0.74), WHITE));
    P.push(paint(box(0.78, 0.24, 0.05, 0, 5.95, -0.84), RED), paint(box(0.24, 0.78, 0.05, 0, 5.95, -0.84), RED));
    P.push(paint(cyl(0.05, 0.05, 3.4, 6, 0.85, 6.9, -0.8), SILVER));      // the umbrella's pole, no umbrella
    P.push(paint(box(2.6, 0.9, 0.08, 0, 3.55, -1.13), WHITE));            // the board the sign hangs on
    return merge(P);
  },
  // a flagpole with nothing on it
  pole() { return merge([paint(box(0.7, 0.35, 0.7, 0, 0.17, 0), CONC), paint(cyl(0.065, 0.11, 10.4, 8, 0, 5.5, 0), SILVER), paint(sph(0.2, 0, 10.85, 0), BRASS), paint(box(0.06, 0.3, 0.12, 0.13, 1.3, 0), SILVER)]); },
  halyard() { return paint(box(0.03, 1, 0.03, 0, -0.5, 0), rgb(0xd8d4cc)); },
  // a post the swimming rope ran between, its eye still on it
  post() { const t = new THREE.TorusGeometry(0.12, 0.035, 6, 12); t.rotateY(Math.PI / 2); t.translate(0, 2.25, 0.16); return merge([paint(box(0.3, 3.4, 0.3, 0, 0.9, 0), WOOD), paint(t, RUST)]); },
  // wooden steps down the seawall to the sand (down toward +z), a rail each side
  steps() {
    const P = [], T = rgb(0xa89880), D = rgb(0x5a4e42);
    for (let i = 0; i < 6; i++) { const h = (i + 1) * 0.35; P.push(paint(box(2.6, 0.12, 0.5, 0, h - 0.06, -i * 0.46), T), paint(box(2.5, 0.3, 0.06, 0, h - 0.27, -i * 0.46 + 0.22), D)); }
    for (const s of [-1, 1]) P.push(paint(beam([s * 1.3, 0, 0.3], [s * 1.3, 2.1, -2.5], 0.12, 0.3), D));
    for (const s of [-1, 1]) P.push(paint(beam([s * 1.2, 0, 0.1], [s * 1.2, 1.0, 0.1], 0.07), SILVER), paint(beam([s * 1.2, 2.1, -2.4], [s * 1.2, 3.05, -2.4], 0.07), SILVER), paint(beam([s * 1.2, 1.0, 0.1], [s * 1.2, 3.05, -2.4], 0.07), SILVER));
    return merge(P);
  },
  // her sandals, one a little ahead of the other, where she stepped out of them
  sandals() {
    const P = [], k = 5;
    const one = (x, z, r) => {
      const sole = new THREE.CylinderGeometry(0.5, 0.5, 1, 18); sole.scale(0.105 * k, 0.03 * k, 0.27 * k); sole.translate(0, 0.015 * k, 0);
      const parts = [paint(sole, rgb(0xff6a4a))];
      const toe = [0, 0.03 * k, 0.085 * k];
      for (const s of [-1, 1]) { const mid = [s * 0.035 * k, 0.065 * k, 0], end = [s * 0.05 * k, 0.03 * k, -0.04 * k]; parts.push(paint(beam(toe, mid, 0.022 * k, 0.012 * k), rgb(0xf4f0e6)), paint(beam(mid, end, 0.022 * k, 0.012 * k), rgb(0xf4f0e6))); }
      for (const g of parts) { g.rotateY(r); g.translate(x, 0, z); }
      return parts;
    };
    P.push(...one(-0.2 * k, 0, 0.12), ...one(0.22 * k, 0.1 * k, -0.35));
    return merge(P);
  },
  // her car: a small hatchback the sun has been at all summer (front toward +z)
  car() {
    const c = rgb(0xa8463a), P = [paint(box(1.78, 0.7, 4.0, 0, 0.62, 0), c), paint(box(1.62, 0.62, 2.0, 0, 1.28, -0.35), rgb(0x1a2228)), paint(box(1.56, 0.08, 1.9, 0, 1.62, -0.38), c)];
    for (const s of [-1, 1]) for (const z of [0.6, -1.3]) P.push(paint(box(0.1, 0.62, 0.12, s * 0.79, 1.28, z), c));
    P.push(paint(box(1.82, 0.22, 0.22, 0, 0.42, 2.05), SILVER), paint(box(1.82, 0.22, 0.22, 0, 0.42, -2.05), SILVER));
    for (const s of [-1, 1]) for (const z of [1.3, -1.3]) { const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); w.rotateZ(Math.PI / 2); w.translate(s * 0.82, 0.34, z); P.push(paint(w, rgb(0x16161a))); }
    for (const s of [-1, 1]) P.push(paint(box(0.32, 0.14, 0.05, s * 0.62, 0.78, 2.01), rgb(0xfff0d0)), paint(box(0.3, 0.14, 0.05, s * 0.64, 0.8, -2.01), rgb(0xc82020)));
    return merge(P);
  },
  // the tow truck: cab, light bar, the boom and the lift arm out the back
  truck() {
    const W = rgb(0xeeeeea), O = rgb(0xe8701a), G = rgb(0x2a2c30), P = [];
    P.push(paint(box(2.3, 1.9, 2.3, 0, 1.75, 1.9), W), paint(box(2.2, 1.0, 1.6, 0, 1.15, 3.85), W), paint(box(2.32, 0.18, 2.32, 0, 1.4, 1.9), O));
    P.push(paint(box(2.0, 0.7, 0.06, 0, 2.15, 3.06), rgb(0x1a2228)));
    P.push(paint(box(2.4, 0.45, 4.2, 0, 1.05, -1.4), rgb(0x3a3c40)));
    P.push(paint(beam([0, 1.1, -3.4], [0, 0.55, -4.9], 0.3), G), paint(box(2.0, 0.15, 0.4, 0, 0.5, -5.0), G));
    P.push(paint(beam([0, 1.3, -0.4], [0, 3.0, -2.6], 0.28), G));
    P.push(paint(box(1.7, 0.2, 0.32, 0, 2.8, 1.9), rgb(0xffa020)));
    for (const s of [-1, 1]) for (const z of [3.4, -0.6, -1.9]) { const w = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 12); w.rotateZ(Math.PI / 2); w.translate(s * 1.05, 0.48, z); P.push(paint(w, rgb(0x16161a))); }
    return merge(P);
  },
  // the snack shack, shuttered; the umbrellas shut and banded in their rack; the bins with their lids on
  shack() {
    const P = [];
    P.push(paint(box(7.2, 3.4, 4.4, 0, 1.7, 0), rgb(0x6aa8a0)), paint(box(8.0, 0.26, 5.4, 0, 3.55, 0.35), WHITE));
    P.push(paint(box(5.8, 1.7, 0.08, 0, 2.05, 2.24), rgb(0xa4a8ac)));
    for (let y = 1.3; y < 2.9; y += 0.16) P.push(paint(box(5.8, 0.03, 0.03, 0, y, 2.29), rgb(0x8a8e92)));
    P.push(paint(box(6.2, 0.14, 0.55, 0, 1.12, 2.45), WHITE), paint(box(6.8, 0.55, 0.06, 0, 3.12, 2.24), rgb(0xe8806a)), paint(box(0.18, 0.22, 0.1, 1.6, 1.25, 2.33), BRASS));
    const cols = [0xd8402a, 0x2a6ab8, 0xf0c040, 0xd8402a, 0x2aa8a0, 0xf4f0e6];
    for (let i = 0; i < 6; i++) {
      const x = 4.9 + (i % 3) * 0.45, z = 0.6 + Math.floor(i / 3) * 0.5, lean = (i - 2.5) * 0.04;
      const pl = cyl(0.04, 0.04, 2.6, 5, 0, 1.3, 0), can = new THREE.ConeGeometry(0.2, 1.5, 8); can.translate(0, 2.0, 0);
      for (const g of [pl, can]) { g.rotateZ(lean); g.translate(x, 0, z); }
      P.push(paint(pl, SILVER), paint(can, rgb(cols[i])));
    }
    P.push(paint(box(1.5, 0.08, 1.2, 5.35, 0.9, 0.85), rgb(0x3a3a3e)));
    for (const [x, z] of [[-4.6, 1.4], [-5.3, 0.5]]) P.push(paint(cyl(0.34, 0.3, 1.0, 12, x, 0.5, z), rgb(0x2a5a9a)), paint(cyl(0.37, 0.37, 0.08, 12, x, 1.04, z), rgb(0x1e4a80)));
    return merge(P);
  },
  // a lamp standard in the lot
  lamp() { return merge([paint(box(0.5, 0.4, 0.5, 0, 0.2, 0), CONC), paint(cyl(0.09, 0.14, 9, 8, 0, 4.7, 0), rgb(0x6a6e74)), paint(beam([0, 9.0, 0], [0, 9.3, 1.6], 0.1), rgb(0x6a6e74)), paint(box(0.5, 0.18, 0.9, 0, 9.25, 1.9), rgb(0x4a4e54))]); },
  // a beach sign's board (its words are the face in front of it), and a post
  board() { return merge([paint(box(10.3, 3.45, 0.22, 0, 0, -0.14), rgb(0xe8e4dc)), paint(box(10.5, 0.16, 0.3, 0, 1.8, -0.14), rgb(0xb8b4ac)), paint(box(10.5, 0.16, 0.3, 0, -1.8, -0.14), rgb(0xb8b4ac))]); },
  signPost() { return paint(box(0.32, 1, 0.32, 0, 0.5, 0), WOOD); },
  // SWIM AT YOUR OWN RISK, big enough to read from the water: a board on two tall legs, a catwalk
  riskFrame() {
    const P = [], M = rgb(0x3a3c42);
    for (const s of [-1, 1]) { P.push(paint(cyl(0.55, 0.7, 34, 8, s * 19, 17, -0.8), M)); for (let y = 4; y < 30; y += 4) P.push(paint(beam([s * 19, y, -0.8], [s * 18.2, y + 4, -1.4], 0.12), M)); }
    P.push(paint(box(44, 15, 0.6, 0, 26, -0.45), rgb(0xd8d4cc)), paint(box(44, 0.5, 0.9, 0, 33.7, -0.45), M), paint(box(44, 0.5, 0.9, 0, 18.3, -0.45), M));
    P.push(paint(box(42, 0.25, 1.8, 0, 17.6, 0.6), M));
    return merge(P);
  },
  // a bell buoy: the float, the cage, the bell in it, a light on top
  buoy() {
    const R = rgb(0xd02a20), P = [paint(cyl(0.95, 1.15, 1.5, 12, 0, 0.1, 0), R), paint(cyl(1.0, 1.0, 0.3, 12, 0, 0.85, 0), WHITE)];
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; P.push(paint(beam([Math.cos(a) * 0.75, 0.9, Math.sin(a) * 0.75], [Math.cos(a) * 0.32, 3.6, Math.sin(a) * 0.32], 0.09), R)); }
    P.push(paint(cyl(0.45, 0.45, 0.12, 10, 0, 3.6, 0), R), paint(sph(0.12, 0, 3.8, 0), rgb(0xf0f0e8)), paint(new THREE.CylinderGeometry(0.18, 0.38, 0.5, 10).translate(0, 2.35, 0), BRASS));
    return merge(P);
  },
  // a gull: two wings in a shallow V and a body (the wings beat by their height, scaled)
  gull() {
    const pos = [], c = [];
    const tri = (a, b, d, col) => { pos.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) c.push(...col); };
    const W = [0.95, 0.95, 0.93], T = [0.3, 0.31, 0.35];
    for (const s of [-1, 1]) { const r0 = [0, 0, 0.25], r1 = [0, 0, -0.3], e0 = [s * 0.8, 0.25, 0.1], e1 = [s * 0.8, 0.25, -0.22], tp = [s * 1.6, 0, -0.3]; tri(r0, e0, r1, W); tri(e0, e1, r1, W); tri(e0, tp, e1, T); }
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); w.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); w.computeVertexNormals();
    const body = new THREE.SphereGeometry(1, 8, 6); body.scale(0.16, 0.14, 0.55); paint(body, [0.95, 0.95, 0.95]);
    return merge([w, body]);
  },
  // a tuft of marram grass
  grass() {
    const P = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, lean = 0.3 + (i % 3) * 0.16, h = 1.1 + (i % 4) * 0.2;
      const b = new THREE.ConeGeometry(0.07, h, 3); b.translate(0, h / 2, 0); b.rotateZ(lean); b.rotateY(a); b.translate(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
      P.push(paint(b, i % 2 ? rgb(0xa8a060) : rgb(0x8a9450)));
    }
    return merge(P);
  },
  // six metres of sand fence, slats and wire
  fence() {
    const P = [];
    for (let z = -3; z <= 3; z += 0.38) { const h = 1.15 + Math.sin(z * 9.1) * 0.12, g = new THREE.PlaneGeometry(0.1, h); g.rotateY(Math.PI / 2); g.rotateX(Math.sin(z * 5) * 0.05); g.translate(0, h / 2 - 0.2, z); P.push(paint(g, rgb(0x7a6a58))); }
    for (const y of [0.25, 0.75]) { const g = new THREE.PlaneGeometry(6.2, 0.04); g.rotateY(Math.PI / 2); g.translate(0.02, y, 0); P.push(paint(g, DARK)); }
    return merge(P);
  },
};

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _s = new THREE.Vector3(), _smp = {};
const UP = new THREE.Vector3(0, 1, 0), BAR = [-0.6, 0.6], LEGS = [-3.6, 3.6];

extend({
  layers: {
    nlgChair: (M) => [NLG.chair(), VC(M, 'nlgChairM', 0.14, { roughness: 0.75 }), 24, {}],
    nlgFace: (M) => [faceGeo(), M.sign, 48, { aIdx: 1, aWake: 2 }],
    nlgPole: (M) => [NLG.pole(), VC(M, 'nlgPoleM', 0.12, { roughness: 0.35, metalness: 0.5 }), 12, {}],
    nlgHalyard: (M) => [NLG.halyard(), VC(M, 'nlgHalyardM', 0.2, { roughness: 0.9 }), 24, {}],
    nlgPost: (M) => [NLG.post(), VC(M, 'nlgPostM', 0.1, { roughness: 0.9 }), 16, {}],
    nlgSteps: (M) => [NLG.steps(), VC(M, 'nlgStepsM', 0.1, { roughness: 0.85 }), 4, {}],
    nlgSandals: (M) => [NLG.sandals(), VC(M, 'nlgSandalsM', 0.3, { roughness: 0.6 }), 4, {}],
    nlgCar: (M) => [NLG.car(), VC(M, 'nlgCarM', 0.12, { roughness: 0.35, metalness: 0.4 }), 4, {}],
    nlgTruck: (M) => [NLG.truck(), VC(M, 'nlgTruckM', 0.12, { roughness: 0.4, metalness: 0.3 }), 2, {}],
    nlgShack: (M) => [NLG.shack(), VC(M, 'nlgShackM', 0.12, { roughness: 0.8 }), 4, {}],
    nlgLamp: (M) => [NLG.lamp(), VC(M, 'nlgLampM', 0.1, { roughness: 0.5, metalness: 0.4 }), 8, {}],
    nlgBoard: (M) => [NLG.board(), VC(M, 'nlgBoardM', 0.25, { roughness: 0.7 }), 8, {}],
    nlgSignPost: (M) => [NLG.signPost(), VC(M, 'nlgSignPostM', 0.1, { roughness: 0.9 }), 24, {}],
    nlgRiskFrame: (M) => [NLG.riskFrame(), VC(M, 'nlgRiskM', 0.25, { roughness: 0.6 }), 2, {}],
    nlgBuoy: (M) => [NLG.buoy(), VC(M, 'nlgBuoyM', 0.2, { roughness: 0.6 }), 40, {}],
    nlgGull: (M) => [NLG.gull(), VC(M, 'nlgGullM', 0.35, { roughness: 0.8, side: THREE.DoubleSide }), 60, {}],
    nlgFence: (M) => [NLG.fence(), VC(M, 'nlgFenceM', 0.08, { roughness: 0.95, side: THREE.DoubleSide }), 260, {}],
    nlgGrass: (M) => [NLG.grass(), VC(M, 'nlgGrassM', 0.1, { roughness: 0.95 }), 320, {}],
  },
  parts: {
    // a chair, empty, facing the water; the sign hung on its back toward the beach
    nlgChair(S, it, p, q, yaw) {
      const L = S.layers; void L.nlgChair; void L.nlgFace;
      if (!S.track) return;
      const s = it.s ?? 1, m = S._m;
      m.compose(p, q, _s.set(s, s, s)); L.nlgChair.add(m);
      local(p, yaw, 0, 3.55 * s, -1.19 * s, _w);
      _q.setFromAxisAngle(UP, yaw + Math.PI);
      m.compose(_w, _q, _s.set(2.45 * s, 0.77 * s, 1)); L.nlgFace.add(m, signV(it.idx, 0.45));
    },
    // a flagpole, its halyard slapping in the wind with nothing on it
    nlgPole(S, it, p, q, yaw) {
      const L = S.layers; void L.nlgPole; void L.nlgHalyard;
      if (!S.track) return;
      const m = S._m, T = S.tNow ?? 0;
      m.compose(p, q, _s.set(1, 1, 1)); L.nlgPole.add(m);
      for (let k = 0; k < 2; k++) {
        local(p, yaw, 0.13 + k * 0.07, 10.5, 0, _w);
        const sw = 0.05 * Math.sin(T * 2.3 + it.seed * 9 + k * 1.7) + 0.03 * Math.sin(T * 5.1 + k);
        _e.set(sw, yaw, sw * 0.6); _q.setFromEuler(_e);
        m.compose(_w, _q, _s.set(1, 9.2, 1)); L.nlgHalyard.add(m);
      }
    },
    nlgPost(S, it, p, q) { void S.layers.nlgPost; if (!S.track) return; S._m.compose(p, q, _s.set(1, 1, 1)); S.layers.nlgPost.add(S._m); },
    // the steps down to the sand; her sandals at the bottom of them
    nlgSteps(S, it, p, q, yaw) {
      const L = S.layers; void L.nlgSteps; void L.nlgSandals;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, _s.set(1.4, 1.4, 1.4)); L.nlgSteps.add(m);
      if (it.sandals) {
        local(p, yaw, 0.4, 0.02, 1.9, _w);
        _q.setFromAxisAngle(UP, yaw + 0.4); m.compose(_w, _q, _s.set(1, 1, 1)); L.nlgSandals.add(m);
      }
    },
    // the lot: her car; the tow truck with her car on its lift, the bar going round; the sign; a lamp
    nlgLot(S, it, p, q, yaw) {
      const L = S.layers; void L.nlgCar; void L.nlgTruck; void L.nlgFace; void L.nlgSignPost; void L.nlgLamp;
      if (!S.track) return;
      const m = S._m, T = S.tNow ?? 0, k = it.kind;
      if (k === 'car') { m.compose(p, q, _s.set(1.5, 1.5, 1.5)); L.nlgCar.add(m); }
      else if (k === 'truck') {
        m.compose(p, q, _s.set(1.5, 1.5, 1.5)); L.nlgTruck.add(m);
        local(p, yaw, 0, 0.26 * 1.5, -6.2 * 1.5, _w); _e.set(-0.2, yaw, 0, 'YXZ'); _q.setFromEuler(_e);
        m.compose(_w, _q, _s.set(1.5, 1.5, 1.5)); L.nlgCar.add(m);
        const on = Math.sin(T * 9) > 0 ? 1 : 0;
        for (const sd of BAR) { local(p, yaw, sd * 1.5, 2.95 * 1.5, 1.9 * 1.5, _w); glowAt(S, _w.x, _w.y, _w.z, 2.4, AMBER, 0.35 + 1.5 * (sd < 0 ? on : 1 - on)); }
      }
      else if (k === 'sign') {
        m.compose(p, q, _s.set(1, 3.6, 1)); L.nlgSignPost.add(m);
        const fy = S.course.yawAt(it.t) + Math.PI + (it.x > 0 ? -0.5 : 0.5);
        local(p, yaw, 0, 3.0, 0.2, _w); _q.setFromAxisAngle(UP, fy);
        m.compose(_w, _q, _s.set(1.6, 2.05, 1)); L.nlgFace.add(m, signV(it.idx, 0.5));
      }
      else if (k === 'lamp') { m.compose(p, q, _s.set(1, 1, 1)); L.nlgLamp.add(m); }
    },
    nlgShack(S, it, p, q) { void S.layers.nlgShack; if (!S.track) return; S._m.compose(p, q, _s.set(1.25, 1.25, 1.25)); S.layers.nlgShack.add(S._m); },
    // SWIM AT YOUR OWN RISK, up on the beach, turned back down the road at her out on the water
    nlgRisk(S, it, p) {
      const L = S.layers; void L.nlgRiskFrame; void L.nlgFace;
      if (!S.track) return;
      const m = S._m, fy = S.course.yawAt(it.t) + Math.PI - 0.55;
      _q.setFromAxisAngle(UP, fy);
      m.compose(p, _q, _s.set(1, 1, 1)); L.nlgRiskFrame.add(m);
      local(p, fy, 0, 26, 0.05, _w); m.compose(_w, _q, _s.set(42, 13.1, 1)); L.nlgFace.add(m, signV(it.idx, 0.8));
    },
    // a buoy riding the swell, its light blinking; the bell buoy swings when it rings
    nlgBuoy(S, it, p, q, yaw) {
      void S.layers.nlgBuoy; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const ring = it.ring !== undefined ? Math.exp(-Math.max(0, T - it.ring) * 0.5) * (T > it.ring ? 1 : 0) : 0;
      _v.copy(p); _v.y = 0.15 * Math.sin(T * 1.3 + it.seed * 20) - 0.2;
      _e.set((0.07 + 0.2 * ring) * Math.sin(T * 1.1 + it.seed * 7), yaw + it.seed * 6, (0.07 + 0.14 * ring) * Math.sin(T * 0.9 + it.seed * 3), 'YXZ'); _q.setFromEuler(_e);
      m.compose(_v, _q, _s.set(s, s, s)); S.layers.nlgBuoy.add(m);
      const blink = Math.sin(T * 2.4 + it.seed * 10) > 0.8 ? 1 : 0;
      if (blink || it.ring !== undefined) glowAt(S, _v.x, _v.y + 3.85 * s, _v.z, 1.8 * s, it.ring !== undefined ? [1, 0.85, 0.5] : [1, 0.18, 0.12], (it.ring !== undefined ? 0.5 : 0) + 1.3 * blink);
    },
    nlgFence(S, it, p, q) { void S.layers.nlgFence; if (!S.track) return; S._m.compose(p, q, _s.set(1, 1, 1)); S.layers.nlgFence.add(S._m); },
    nlgGrass(S, it, p, q) { void S.layers.nlgGrass; if (!S.track) return; const s = it.s ?? 1; S._m.compose(p, q, _s.set(s, s * (it.sy ?? 1), s)); S.layers.nlgGrass.add(S._m); },
    // a beach sign on two posts at the edge of the sand (out in the water, on pilings), turned to her,
    // at the height she rides; the line on it
    nlgSign(S, it, p) {
      const L = S.layers; void L.nlgBoard; void L.nlgSignPost; void L.nlgFace;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, G = nlgGeo(S.plan);
      const fy = S.course.yawAt(it.t) + Math.PI + (it.x > 0 ? -0.45 : 0.45);
      _q.setFromAxisAngle(UP, fy);
      const gy = Math.max(-0.4, G.floor(it.t, it.x));
      const by = Math.max(gy + 5.5 * s, S.course.sample(it.t, _smp).y + (it.h || 3));
      _v.set(p.x, by, p.z);
      m.compose(_v, _q, _s.set(s, s, s)); L.nlgBoard.add(m);
      m.compose(_v, _q, _s.set(9.9 * s, 3.1 * s, 1)); L.nlgFace.add(m, signV(it.idx, 1));
      for (const sx of LEGS) {
        local(_v, fy, sx * s, 0, -0.3 * s, _w); const top = _w.y - 1.7 * s; _w.y = gy - 0.4;
        m.compose(_w, _q, _s.set(s, Math.max(0.5, top - _w.y), s)); L.nlgSignPost.add(m);
      }
    },
  },
  kits: {
    // the chairs, each `d` metres up the sand from the water, facing it
    nlgChairs(S, z) { const G = nlgGeo(S.plan); for (const c of z.at) { const x = G.shoreX(c.t) + (c.d ?? 10); S.items.push({ t: c.t, x, h: G.floor(c.t, x), rot: Math.PI / 2, s: c.s ?? 1.6, idx: S.atlas.index.NLGDUTY, parts: 'nlgChair' }); } },
    nlgPoles(S, z, R) { const G = nlgGeo(S.plan); for (const c of z.at) { const x = G.shoreX(c.t) + (c.d ?? 16); S.items.push({ t: c.t, x, h: G.floor(c.t, x), rot: 0, seed: R(), parts: 'nlgPole' }); } },
    // the posts the rope ran between, in a line down the sand and out into the water
    nlgRope(S, z) { const G = nlgGeo(S.plan); for (const t of z.at) { const sx = G.shoreX(t); for (const d of [12, 6, 0.5, -5, -11, -17, -23]) { const x = sx + d; S.items.push({ t, x, h: Math.max(-0.7, G.floor(t, x)), rot: 0, parts: 'nlgPost' }); } } },
    // steps down the seawall (their top on the lot), the sandals at the bottom where asked
    nlgSteps(S, z) { const G = nlgGeo(S.plan); for (const c of z.at) { const x = G.backStart(c.t) - 3.1; S.items.push({ t: c.t, x, h: G.floor(c.t, x), rot: Math.PI / 2, sandals: c.sandals, parts: 'nlgSteps' }); } },
    nlgLot(S, z) {
      const G = nlgGeo(S.plan);
      for (const c of z.at) {
        const u = c.u ?? (c.kind === 'sign' ? 1.6 : c.kind === 'lamp' ? 22 : 9), x = G.backStart(c.t) + u;
        S.items.push({ t: c.t, x, h: G.floor(c.t, x), rot: c.kind === 'truck' ? 0.35 : Math.PI / 2, kind: c.kind, idx: S.atlas.index.NLGTOW, parts: 'nlgLot' });
      }
    },
    nlgShack(S, z) { const G = nlgGeo(S.plan); for (const t of z.at) { const x = G.backStart(t) + 6; S.items.push({ t, x, h: G.floor(t, x), rot: Math.PI / 2, parts: 'nlgShack' }); } },
    nlgRisk(S, z) { const G = nlgGeo(S.plan), t = z.at, x = G.shoreX(t) + (z.d ?? 46); S.items.push({ t, x, h: G.floor(t, x), rot: 0, idx: S.atlas.index.NLGRISK, parts: 'nlgRisk' }); },
    nlgBell(S, z) { const G = nlgGeo(S.plan), t = z.at, x = G.shoreX(t) + (z.d ?? -40); S.items.push({ t, x, h: 0, rot: 0, s: 1.7, seed: 0.37, ring: z.ring ?? t - 1.2, parts: 'nlgBuoy' }); },
    // buoys out on the water; when she's out there, between her and the beach too
    nlgBuoys(S, z, R) {
      const G = nlgGeo(S.plan);
      for (let t = z.from; t < z.to; t += (z.every ?? 2.4) * (0.7 + R() * 0.6)) {
        const sx = G.shoreX(t);
        S.items.push({ t, x: sx - 26 - R() * 110, h: 0, rot: 0, seed: R(), s: 0.9 + R() * 0.3, parts: 'nlgBuoy', ahead: 30 });
        if (sx > 70 && R() < 0.5) S.items.push({ t: t + 0.6, x: 24 + R() * (sx - 50), h: 0, rot: 0, seed: R(), s: 0.9, parts: 'nlgBuoy', ahead: 30 });
      }
    },
    // sand fence along the foot of the dunes, marram grass over them (and behind the lot)
    nlgDunes(S, z, R) {
      const G = nlgGeo(S.plan);
      for (let t = z.from; t < z.to; t += 0.22) {
        const bs = G.backStart(t); if (bs > 230) continue;
        const lot = G.lot(t);
        if (lot < 0.3) { const x = bs + 1.5 + R() * 1.5; S.items.push({ t, x, h: G.floor(t, x), rot: (R() - 0.5) * 0.15, parts: 'nlgFence', ahead: 30 }); }
        for (let k = 0; k < 2; k++) { const x = bs + (lot > 0.5 ? 86 : 3) + R() * 44; S.items.push({ t: t + R() * 0.2, x, h: G.floor(t, x) - 0.1, rot: R() * 6.28, s: 1.2 + R() * 1.0, sy: 0.8 + R() * 0.5, parts: 'nlgGrass', ahead: 30 }); }
      }
    },
  },
});

// ---------- the ground: the beach strip ----------
// columns, per row: out to sea from the waterline; across the beach as fractions of it; from the
// foot of the dunes (or the seawall) back over them and the land behind
const SEA = [-120, -24, -3, -0.6];
const BEACH = [0, 0.03, 0.08, 0.15, 0.24, 0.36, 0.5, 0.66, 0.82, 0.94];
const BACK = [0, 0.35, 4, 8, 12, 16, 21, 27, 33, 40, 48, 56, 66, 78, 90, 110, 140, 190, 280, 500, 1100, 2400];

function shoreMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSand: { value: new THREE.Color(P.sand ?? 0xf0dab0) }, uGrass: { value: new THREE.Color(P.tree ?? 0x8a9a52) }, uLot: { value: new THREE.Color(0x3a3c40) }, uConc: { value: new THREE.Color(0xb8b4aa) },
      uSun: { value: new THREE.Color(P.moon) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunK: { value: 1 }, uSky: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHemiK: { value: 1.5 },
      uHorizon: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute vec2 aE; varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec2 vE;
      void main(){ vUv = uv; vE = aE; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSand, uGrass, uLot, uConc, uSun, uSunDir, uSky, uBounce, uHorizon, uFog, uCam; uniform float uSunK, uHemiK, uFogDensity, uTime;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec2 vE;
      ${AA_GLSL}
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float d = vUv.x, along = vUv.y, u = vE.x, lot = vE.y;
        vec3 N = normalize(vN);
        float pat = n2(vW.xz * 0.07) * 0.6 + n2(vW.xz * 0.31) * 0.4;
        // dry sand, the ripples the wind left
        float rip = sin(along * 1.9 + d * 0.35 + pat * 5.0) * 0.5 + 0.5;
        vec3 sand = uSand * (0.84 + 0.12 * pat + 0.05 * rip);
        // the tide line: dried weed where the water got to
        float tl = 13.0 + 3.0 * sin(along * 0.031) + 2.0 * n2(vec2(along * 0.07, 1.0));
        float wrack = smoothstep(1.4, 0.0, abs(d - tl)) * smoothstep(0.3, 0.7, n2(vec2(along * 0.4, d)));
        sand = mix(sand, uSand * vec3(0.42, 0.38, 0.3), wrack * 0.6);
        // wet near the water with the sky in it; the swash running up and back, a lace of foam
        float wet = smoothstep(8.0, 1.5, d);
        vec3 col = mix(sand, uSand * 0.38 + uHorizon * 0.2, wet);
        float fl = 1.6 + 1.4 * sin(along * 0.06 + uTime * 0.5) + 0.7 * sin(along * 0.21 - uTime * 1.1);
        float foam = smoothstep(0.9, 0.0, abs(d - fl)) * (0.5 + 0.5 * n2(vec2(along * 0.6, uTime * 0.8)));
        foam = max(foam, smoothstep(0.8, 0.0, d) * 0.85);
        col = mix(col, vec3(0.93, 0.95, 0.96), clamp(foam, 0.0, 1.0) * 0.7);
        // behind the beach: the dunes under their grass, the scrub behind them
        float g = smoothstep(1.0, 9.0, u) * (1.0 - smoothstep(44.0, 52.0, u)) * smoothstep(0.32, 0.6, pat);
        float scrub = smoothstep(46.0, 58.0, u);
        vec3 back = mix(sand, uGrass * (0.7 + 0.4 * pat), max(g * 0.85, scrub * (0.55 + 0.35 * pat)));
        col = mix(col, back, smoothstep(-1.0, 0.5, u) * (1.0 - lot));
        // or the seawall, its cap, and the lot: asphalt, the stalls painted on it, faded
        float wall = step(-0.3, u) * (1.0 - step(0.45, u));
        float cap = step(0.45, u) * (1.0 - step(1.3, u));
        float asphalt = step(1.3, u) * (1.0 - smoothstep(84.0, 88.0, u));
        // (filtered: from the road the stalls' lines are thinner than a pixel and crawled)
        float stall = aaPulse(along / 3.2, 0.045) * (step(4.0, u) * (1.0 - step(10.0, u)) + step(16.0, u) * (1.0 - step(22.0, u)) + step(40.0, u) * (1.0 - step(46.0, u)));
        float line = aaBand(u, 2.0, 0.08) + aaBand(u, 13.0, 0.08) * aaSq(along / 4.0);
        vec3 asph = uLot * (0.8 + 0.25 * pat) + vec3(0.55) * clamp(stall + line, 0.0, 1.0) * (0.35 + 0.3 * n2(vec2(along * 0.3, u)));
        vec3 lotCol = mix(mix(col, uConc * 0.85, wall), uConc, cap);
        lotCol = mix(lotCol, asph, asphalt);
        lotCol = mix(lotCol, uGrass * (0.7 + 0.4 * pat), smoothstep(84.0, 92.0, u));
        col = mix(col, lotCol, lot * step(-0.3, u));
        // the light: the sun (or the moon) and the sky; the wet sand shines where the sun's in it
        vec3 L = normalize(uSunDir);
        float ndl = max(dot(N, L), 0.0);
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
        vec3 lit = col * (amb + uSun * uSunK * ndl) / 3.14159;
        vec3 V = normalize(uCam - vW);
        lit += uSun * uSunK * pow(max(dot(N, normalize(V + L)), 0.0), 60.0) * wet * 0.5;
        float dist = length(uCam - vW);
        float fog = 1.0 - exp(-pow(dist * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(lit, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

class NlgShore {
  constructor(scene, course, G, P) {
    this.course = course; this.G = G;
    this.N = 100; this.DT = 48 / (this.N - 1);
    this.M = SEA.length + BEACH.length + BACK.length;
    const N = this.N, M = this.M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.nor = new Float32Array(N * M * 3); this.uvs = new Float32Array(N * M * 2); this.ext = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aE', new THREE.BufferAttribute(this.ext, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = shoreMaterial(P);
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._p = new THREE.Vector3(); this._rows = new Map(); this._k0 = null;
  }
  // a row's columns never change: worked out once, the first time it comes into view
  row(k) {
    let r = this._rows.get(k);
    if (r) return r;
    const t = k * this.DT, G = this.G, M = this.M;
    r = { x: new Float32Array(M), y: new Float32Array(M), d: new Float32Array(M), u: new Float32Array(M), lot: G.lot(t) };
    const sx = G.shoreX(t), bs = G.backStart(t);
    let j = 0;
    const put = (x) => { r.x[j] = x; r.y[j] = G.floor(t, x); r.d[j] = x - sx; r.u[j] = x - bs; j++; };
    for (const d of SEA) put(sx + d);
    for (const f of BEACH) put(sx + (bs - sx) * f);
    for (const u of BACK) put(bs + u);
    this._rows.set(k, r);
    return r;
  }
  update(track, rider, P, cam, time, fogD) {
    const N = this.N, M = this.M, DT = this.DT;
    const k0 = Math.floor((rider.t - 4) / DT), t0 = k0 * DT;
    const moved = k0 !== this._k0; this._k0 = k0;
    if (moved) for (const k of this._rows.keys()) if (k < k0 - 2) this._rows.delete(k);
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const r = this.row(k0 + i), t = t0 + i * DT;
      const yaw = track.groundYaw(t, 0, this._p), rx = -Math.cos(yaw), rz = Math.sin(yaw);
      for (let j = 0; j < M; j++) {
        const o = (i * M + j) * 3, x = r.x[j];
        this.pos[o] = this._p.x + rx * x; this.pos[o + 1] = r.y[j]; this.pos[o + 2] = this._p.z + rz * x;
      }
      if (moved) for (let j = 0; j < M; j++) { const q = (i * M + j) * 2; this.uvs[q] = r.d[j]; this.ext[q] = r.u[j]; this.ext[q + 1] = r.lot; }
      cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0;
      lx = this._p.x; lz = this._p.z;
    }
    const base = rider.stats.dist - alongAt(cum, (rider.t - t0) / DT);
    for (let i = 0; i < N; i++) { const a = cum[i] + base; for (let j = 0; j < M; j++) this.uvs[(i * M + j) * 2 + 1] = a; }
    if (normalsDue(this, k0)) { gridNormals(this.pos, this.nor, N, M); this.geo.attributes.normal.needsUpdate = true; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    if (moved) this.geo.attributes.aE.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uSand.value.set(P.sand ?? 0xf0dab0); u.uGrass.value.set(P.tree ?? 0x8a9a52);
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(P.moonDir[0], P.moonDir[1], P.moonDir[2]).normalize();
    u.uSunK.value = P.sunK ?? 1; u.uHemiK.value = P.hemiK ?? 1.5;
    u.uSky.value.set(P.skyLight ?? 0x8090a0); u.uBounce.value.set(P.bounce ?? 0x404030); u.uHorizon.value.set(P.horizon);
    u.uFog.value.set(P.fog); u.uFogDensity.value = fogD; u.uCam.value.copy(cam.position); u.uTime.value = time;
  }
}

// ---------- the sea ----------
// swell, the sky in it, the sun's (or the moon's) road on it; glass when it's the temperature of
// nothing; at dusk a warmth in it that keeps it from going black
function seaMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uWater: { value: new THREE.Color(P.water ?? 0x14889e) },
      uHorizon: { value: new THREE.Color(P.horizon) }, uZenith: { value: new THREE.Color(P.zenith) }, uSunDir: { value: new THREE.Vector3(0, 0.3, 1).normalize() }, uSun: { value: new THREE.Color(P.moon) },
      uTime: { value: 0 }, uCalm: { value: 0 }, uWarm: { value: 0 }, uWarmCol: { value: new THREE.Color(0xff7a3a) }, uRain: { value: 0 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCam, uFog, uWater, uHorizon, uZenith, uSunDir, uSun, uWarmCol; uniform float uFogDensity, uTime, uCalm, uWarm, uRain; varying vec3 vW;
      vec2 wv(vec2 p, vec2 d, float f, float s, float a){ float ph = dot(p, d) * f + uTime * s; return d * cos(ph) * f * a; }
      void main(){
        vec2 p = vW.xz;
        float k = (1.0 - 0.9 * uCalm) * (1.0 + 0.8 * uRain);
        vec2 g = (wv(p, normalize(vec2(1.0, 0.3)), 0.05, 1.1, 0.5) + wv(p, normalize(vec2(0.4, 1.0)), 0.11, 1.6, 0.25) + wv(p, normalize(vec2(-0.7, 0.6)), 0.23, 2.3, 0.12) + wv(p, normalize(vec2(0.9, -0.5)), 0.6, 3.1, 0.05)) * k;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(uCam - vW);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.5, R.y));
        vec3 col = uWater * 0.6 + sky * fres * 0.9;
        vec3 S = normalize(uSunDir);
        float sp = pow(max(dot(R, S), 0.0), 220.0), sp2 = pow(max(dot(R, S), 0.0), 24.0);
        col += uSun * (sp * 4.0 + sp2 * 0.25);
        col += uWarmCol * uWarm * (0.22 + 0.08 * sin(p.x * 0.03 + p.y * 0.02 + uTime * 0.4));
        col *= 1.0 - uRain * 0.25;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.4));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    // a hair behind the sand: the wet sand runs a few centimetres above the sea for metres at the
    // waterline, and down the shore into the distance the two fought for the same depth (it flickered)
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  });
}

const DEF = [0, 0.3, 1];

// ---------- the place, per frame ----------
export class NlgWorld {
  constructor(scene, S) {
    this.S = S;
    const G = this.G = nlgGeo(S.plan);
    this.shore = new NlgShore(scene, S.course, G, S.P);
    this.seaMat = seaMaterial(S.P);
    const g = new THREE.PlaneGeometry(9000, 9000, 1, 1); g.rotateX(-Math.PI / 2);
    this.sea = new THREE.Mesh(g, this.seaMat); this.sea.frustumCulled = false; this.sea.renderOrder = -4;
    scene.add(this.sea);
    this.gulls = S.plan.gulls || []; this.away = S.plan.away || [];
    if (S.town) void S.town.layers.nlgGull;
    this._g = new THREE.Vector3();
  }
  // the sun and the moon stay where the song puts them along the road (over the sea, mostly): the
  // looks' directions are taken as right/up/ahead and turned with the road near her
  turnSun(S, dt) {
    const K = S.look.keys;
    if (!this._rel) {
      this._rel = K.map((k) => [(k.P.glowDir || DEF).slice(), (k.P.moonDir || DEF).slice()]);
      for (const k of K) { k.P.glowDir = (k.P.glowDir || DEF).slice(); k.P.moonDir = (k.P.moonDir || DEF).slice(); }
    }
    const yaw = S.course.yawAt(S.rider.t + 2);
    if (this._yaw === undefined) this._yaw = yaw;
    const dy = Math.atan2(Math.sin(yaw - this._yaw), Math.cos(yaw - this._yaw));
    this._yaw += dy * Math.min(1, dt * 0.7);
    const c = Math.cos(this._yaw), s = Math.sin(this._yaw);
    for (let i = 0; i < K.length; i++) {
      const [g, mo] = this._rel[i], Gd = K[i].P.glowDir, Md = K[i].P.moonDir;
      Gd[0] = -c * g[0] + s * g[2]; Gd[1] = g[1]; Gd[2] = s * g[0] + c * g[2];
      Md[0] = -c * mo[0] + s * mo[2]; Md[1] = mo[1]; Md[2] = s * mo[0] + c * mo[2];
    }
  }
  update(S, dt, camera, time) {
    if (!this._init) { this._init = true; S.ground.visible = false; S.skyline.visible = false; }
    this.turnSun(S, dt);
    const P = S.P, t = S.rider.t;
    const fogD = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * (S.lift ? S.lift.k : 0));
    this.shore.update(S.track, S.rider, P, camera, time, fogD);
    const u = this.seaMat.uniforms;
    u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = fogD;
    u.uWater.value.set(P.water ?? 0x14889e); u.uHorizon.value.set(P.horizon); u.uZenith.value.set(P.zenith);
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(P.moonDir[0], P.moonDir[1], P.moonDir[2]).normalize();
    u.uTime.value = time; u.uRain.value = P.rain ?? 0;
    u.uCalm.value = smooth(100.5, 104.5, t) * (1 - smooth(109.5, 113, t));      // "the temperature of nothing": glass
    u.uWarm.value = smooth(161, 167, t) * (1 - smooth(176.3, 177.9, t));        // "warm water's never black"
    this.sea.position.set(camera.position.x, 0, camera.position.z);
  }
  // gulls over the beach; at night the lights of wherever everybody went, always just as far ahead
  draw(T, rider) {
    const R = rider.t, G = this.G, m = T._m, L = T.layers.nlgGull, time = T.tNow ?? R;
    for (let gi = 0; gi < this.gulls.length; gi++) {
      const a = this.gulls[gi][0], b = this.gulls[gi][1];
      if (R < a - 6 || R > b + 2) continue;
      for (let ta = Math.max(a, Math.floor((R - 2) / 3) * 3); ta < Math.min(b, R + 18); ta += 3) {
        const c = T.track.ground(ta, G.shoreX(ta) + 12 + 10 * hash(ta), this._g);
        for (let k = 0; k < 3; k++) {
          const ph = hash(ta * 3.1 + k) * 6.28, r = 7 + 5 * hash(ta + k * 7.7), w = 0.45 + 0.3 * hash(ta * 1.7 + k), a2 = time * w + ph;
          _v.set(c.x + Math.cos(a2) * r, 9 + 6 * hash(ta + k) + Math.sin(time * 0.7 + ph) * 1.2, c.z + Math.sin(a2) * r);
          const glide = Math.sin(time * 0.6 + ph) > 0.2;
          const f = glide ? 0.75 : 0.5 + 0.9 * Math.sin(time * 8 + ph * 3);
          _e.set(0, Math.atan2(-Math.sin(a2), Math.cos(a2)), -0.35, 'YXZ'); _q.setFromEuler(_e);
          m.compose(_v, _q, _s.set(1.4, 1.4 * f, 1.4)); L.add(m);
        }
      }
    }
    for (let ai = 0; ai < this.away.length; ai++) {
      const a = this.away[ai][0], b = this.away[ai][1], k = smooth(a, a + 6, R) * (1 - smooth(b - 6, b, R));
      if (k <= 0) continue;
      for (let i = 0; i < 16; i++) {
        const ta = R + 15 + i * 0.35, sx = G.shoreX(ta), p = T.track.ground(ta, Math.max(sx, 40) + 160 + 30 * hash(i * 3.3), this._g);
        glowAt(T, p.x, 3 + 9 * hash(i * 1.9), p.z, 4 + 3 * hash(i), AWAY, k * (0.7 + 0.5 * hash(i * 5.1)));
      }
    }
  }
}

// ---------- the end: the chair, still facing the water ----------
export class NlgFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t;
    this.G = nlgGeo(scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const o = new THREE.Mesh(NLG.chair(), selfLit({ roughness: 0.75 }, 0.14));
    o.scale.setScalar(cfg.s ?? 1.5); this.group.add(o);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
    this.idx = scenery.atlas.index.NLGDUTY;
    void scenery.layers.nlgFace;
  }
  fire() { this.fired = true; }
  update(track, rider) {
    const x = this.cfg.x ?? -27, t = this.t, s = this.cfg.s ?? 1.5;
    const yaw = track.groundYaw(t, x, this._p) + Math.PI / 2; this._p.y = this.G.floor(t, x);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, yaw, 0);
    const S = this.S; if (!S || t - rider.t > 46) return;
    local(this._p, yaw, 0, 3.55 * s, -1.19 * s, this._w);
    this._q.setFromAxisAngle(UP, yaw + Math.PI);
    S._m.compose(this._w, this._q, this._s.set(2.45 * s, 0.77 * s, 1)); S.layers.nlgFace.add(S._m, signV(this.idx, 0.45));
  }
}
