// White Christmas: the street outside grandma's. Every house strung with lights along the eaves and
// down the roof (colours, warm white, or all blue), the roofs and the cars under snow, snowy pines,
// a snowman, an inflatable Santa, a reindeer made of white lights with a red nose, candy canes up the
// walks, wreaths on the lamp posts; carolers under a lamp; a pile of presents; and the lines on long
// wooden plaques with a garland and a bow, the kind she hangs in the hall.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, col, PARTS } from './scenery.js';
import { paint, rgb, seeded, clamp, smooth, pick, merge, box, cyl, sph, lathe, tor, rod, SIDE, FACE, VCm, tintLit, onFloor } from './wxm-lib.js';
import { HOUSE } from './wxm-room.js';

const WHITE = rgb(0xf0f2f8), SNOW = rgb(0xe8eef8), PINE = rgb(0x0e2a1c), BARK = rgb(0x3a2418), RED = rgb(0xc8141c), GOLD = rgb(0xe0b040), BLACK = rgb(0x111114), SKIN = rgb(0xe8b898);
// the bulbs' colours
export const BULB = { red: [1, 0.1, 0.08], green: [0.1, 0.95, 0.25], blue: [0.18, 0.4, 1], amber: [1, 0.62, 0.12], pink: [1, 0.3, 0.62], warm: [1, 0.78, 0.48], cold: [0.75, 0.88, 1] };
const MULTI = [BULB.red, BULB.green, BULB.blue, BULB.amber, BULB.pink];
const COATS = [[0.55, 0.08, 0.1], [0.12, 0.2, 0.42], [0.3, 0.3, 0.32], [0.45, 0.32, 0.18], [0.1, 0.32, 0.2]];
const SCHEMES = ['multi', 'multi', 'warm', 'multi', 'blue', 'redgreen', 'warm', 'multi'];
const HOUSES = [0xe8e2d4, 0xc8d6e6, 0xdccab0, 0x8e3c32, 0x5e6e5c, 0xf2f2ee, 0x3e4e60, 0xd8c0c8];
const SNOWROOF = [0.92, 0.94, 0.99];

// ---------- the things ----------
const ST = {
  // a pine with snow on every tier
  pine() {
    const parts = [paint(cyl(0.35, 0.5, 2.4, 7, 0, 1.2, 0), BARK)];
    for (const [r, h, y] of [[3.6, 4.4, 3.6], [2.8, 3.8, 5.9], [2.0, 3.2, 7.9], [1.1, 2.4, 9.7]]) {
      parts.push(paint(new THREE.ConeGeometry(r, h, 9).translate(0, y, 0), PINE));
      const ch = h * 0.5; parts.push(paint(new THREE.ConeGeometry(r * 0.56, ch, 9).translate(0, y + h / 2 - ch / 2 + 0.05, 0).scale(1.05, 1, 1.05), SNOW));
      parts.push(paint(new THREE.TorusGeometry(r * 0.94, 0.22, 4, 12).rotateX(Math.PI / 2).translate(0, y - h / 2 + 0.2, 0), SNOW));
    }
    return merge(parts);
  },
  // a snowman: three balls, coal, a carrot, a hat, a red scarf, stick arms
  snowman() {
    const parts = [paint(sph(1.6, 1, 0.92, 1, 0, 1.45, 0), SNOW), paint(sph(1.15, 1, 0.95, 1, 0, 3.7, 0), SNOW), paint(sph(0.82, 1, 1, 1, 0, 5.3, 0), SNOW)];
    for (const x of [-0.3, 0.3]) parts.push(paint(sph(0.1, 1, 1, 1, x, 5.5, 0.74, 6, 4), BLACK));
    for (let k = 0; k < 5; k++) { const a = -0.9 + k * 0.45; parts.push(paint(sph(0.06, 1, 1, 1, Math.sin(a) * 0.45, 5.0 - Math.cos(a) * 0.15 + 0.05, 0.72, 5, 4), BLACK)); }
    for (const y of [3.4, 3.9, 4.3]) parts.push(paint(sph(0.1, 1, 1, 1, 0, y, 1.08, 6, 4), BLACK));
    parts.push(paint(new THREE.ConeGeometry(0.13, 0.9, 8).rotateX(Math.PI / 2).translate(0, 5.3, 1.2), rgb(0xff7a1a)));
    parts.push(paint(cyl(0.75, 0.75, 0.1, 16, 0, 6.0, 0), BLACK), paint(cyl(0.48, 0.52, 1.0, 16, 0, 6.5, 0), BLACK), paint(cyl(0.53, 0.53, 0.18, 16, 0, 6.1, 0), RED));
    parts.push(paint(tor(0.78, 0.2, 0, 4.55, 0, 16, 6).rotateX(Math.PI / 2).translate(0, 0, 0), RED), paint(box(0.4, 1.3, 0.16, 0.45, 4.0, 0.78).rotateZ(0.1), RED));
    for (const s of [-1, 1]) { parts.push(paint(rod([s * 1.0, 4.0, 0], [s * 2.5, 5.1, 0.2], 0.07), BARK), paint(rod([s * 2.2, 4.85, 0.15], [s * 2.55, 5.5, 0.1], 0.05), BARK)); }
    return merge(parts);
  },
  // an inflatable Santa, waving, lit from inside
  santa() {
    const parts = [paint(lathe([[0, 0], [1.6, 0.2], [2.0, 1.4], [1.9, 2.8], [1.4, 3.8], [0, 4.0]], 20), rgb(0xd8141c))];
    parts.push(paint(tor(1.95, 0.22, 0, 1.6, 0, 24, 6).rotateX(Math.PI / 2).translate(0, 0, 0), BLACK), paint(box(0.7, 0.55, 0.2, 0, 1.6, 2.0), GOLD));
    parts.push(paint(tor(1.6, 0.3, 0, 0.25, 0, 24, 6).rotateX(Math.PI / 2), WHITE));
    parts.push(paint(sph(1.05, 1, 1, 1, 0, 4.7, 0), SKIN), paint(sph(1.0, 1, 0.9, 0.8, 0, 4.1, 0.45), WHITE), paint(sph(0.22, 1, 1, 1, 0, 4.7, 1.0, 8, 6), rgb(0xe88070)));
    for (const x of [-0.35, 0.35]) parts.push(paint(sph(0.11, 1, 1, 1, x, 5.0, 0.95, 6, 4), BLACK));
    parts.push(paint(new THREE.ConeGeometry(0.95, 1.9, 16).rotateZ(-0.35).translate(0.3, 6.25, 0), rgb(0xd8141c)), paint(tor(0.95, 0.24, 0, 5.45, 0, 18, 6).rotateX(Math.PI / 2), WHITE), paint(sph(0.32, 1, 1, 1, 0.95, 6.95, 0, 8, 6), WHITE));
    parts.push(paint(rod([-1.7, 3.0, 0], [-2.6, 5.0, 0.3], 0.42, 8), rgb(0xd8141c)), paint(sph(0.42, 1, 1, 1, -2.65, 5.15, 0.3, 8, 6), WHITE));
    parts.push(paint(rod([1.7, 3.0, 0], [2.3, 1.6, 0.6], 0.42, 8), rgb(0xd8141c)), paint(sph(0.42, 1, 1, 1, 2.35, 1.45, 0.65, 8, 6), WHITE));
    return merge(parts);
  },
  // a reindeer drawn in white light, on the lawn (the nose is its own light)
  deer() {
    const r = 0.07, P = [];
    const ring = (cx, cy, rx, ry, n = 14, z = 0) => { for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; P.push(rod([cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, z], [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, z], r, 4)); } };
    for (const z of [-0.45, 0.45]) ring(0, 3.2, 2.0, 0.9, 16, z);
    for (const [x, z] of [[-1.5, -0.45], [-1.3, 0.45], [1.4, -0.45], [1.6, 0.45]]) P.push(rod([x, 2.6, z], [x + 0.1, 0, z], r, 4));
    P.push(rod([1.7, 3.6, 0], [2.6, 5.4, 0], r, 4), rod([1.9, 3.1, 0], [2.9, 5.0, 0], r, 4));
    ring(3.05, 5.4, 0.62, 0.38, 10, 0);
    for (const s of [-1, 1]) { P.push(rod([2.8, 5.75, s * 0.15], [2.4, 7.0, s * 0.6], r, 4), rod([2.55, 6.5, s * 0.4], [3.0, 7.1, s * 0.5], r, 4), rod([2.45, 6.85, s * 0.55], [1.95, 7.4, s * 0.7], r, 4)); }
    P.push(rod([-2.0, 3.6, 0], [-2.5, 4.1, 0], r, 4));
    return paint(merge(P), [1, 1, 1]);
  },
  // a candy cane, striped round and round
  cane() {
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3.2, 0)));
    path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(0, 4.0, 0), new THREE.Vector3(1.1, 4.0, 0), new THREE.Vector3(1.1, 3.3, 0)));
    const g = new THREE.TubeGeometry(path, 40, 0.2, 8, false);
    const uv = g.attributes.uv, n = uv.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const red = (uv.getX(i) * 14 + uv.getY(i)) % 1 < 0.5; const v = red ? [0.85, 0.06, 0.08] : [0.97, 0.97, 0.97]; c.set(v, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  },
  // a wreath with a red bow
  wreath() {
    const parts = [paint(tor(1.0, 0.34, 0, 0, 0, 24, 8), rgb(0x2a7a3a))];
    const R = seeded(3); for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2; parts.push(paint(sph(0.12, 1, 1, 1, Math.cos(a) * (1.0 + (R() - 0.5) * 0.4), Math.sin(a) * (1.0 + (R() - 0.5) * 0.4), 0.3, 6, 4), R() < 0.5 ? RED : GOLD)); }
    parts.push(paint(sph(0.42, 1, 0.6, 0.4, -0.38, -1.05, 0.35), RED), paint(sph(0.42, 1, 0.6, 0.4, 0.38, -1.05, 0.35), RED), paint(sph(0.16, 1, 1, 1, 0, -1.05, 0.4, 8, 6), RED));
    for (const s of [-1, 1]) parts.push(paint(box(0.22, 1.0, 0.06, s * 0.25, -1.6, 0.35).rotateZ(s * 0.25), RED));
    return merge(parts);
  },
  // a present: the box (its colour per instance) and the ribbon and bow
  present() { return paint(box(1, 1, 1, 0, 0.5, 0), [1, 1, 1]); },
  ribbon() {
    const parts = [box(1.02, 1.02, 0.16, 0, 0.5, 0), box(0.16, 1.02, 1.02, 0, 0.5, 0)];
    for (const s of [-1, 1]) parts.push(sph(0.22, 1.2, 0.7, 0.6, s * 0.2, 1.08, 0, 8, 6).rotateY(0.6));
    return paint(merge(parts), [1, 1, 1]);
  },
  // a caroler: the coat (its colour per instance) ...
  coat() { return paint(merge([lathe([[0, 0.9], [0.62, 0.9], [0.5, 1.9], [0.32, 2.35], [0, 2.4]], 14), sph(0.18, 1, 1.4, 1, -0.36, 1.85, 0.25, 6, 4), sph(0.18, 1, 1.4, 1, 0.36, 1.85, 0.25, 6, 4)]), [1, 1, 1]); },
  // ... and the rest: legs, the face singing, the hat, the scarf, the book
  singer() {
    const parts = [paint(cyl(0.13, 0.13, 0.9, 6, -0.2, 0.45, 0), BLACK), paint(cyl(0.13, 0.13, 0.9, 6, 0.2, 0.45, 0), BLACK)];
    parts.push(paint(sph(0.3, 1, 1.1, 1, 0, 2.7, 0), SKIN), paint(sph(0.09, 1, 1.3, 0.6, 0, 2.58, 0.27, 6, 4), rgb(0x3a1a1a)));
    parts.push(paint(sph(0.31, 1, 0.7, 1, 0, 2.86, -0.02), rgb(0x9a1a2a)), paint(sph(0.12, 1, 1, 1, 0, 3.12, -0.05, 6, 4), WHITE));
    parts.push(paint(tor(0.3, 0.09, 0, 2.38, 0, 12, 4).rotateX(Math.PI / 2), rgb(0x1a5a2a)));
    const book = merge([box(0.5, 0.36, 0.05, -0.22, 0, 0).rotateY(0.35), box(0.5, 0.36, 0.05, 0.22, 0, 0).rotateY(-0.35)]); book.rotateX(-0.6); book.translate(0, 1.9, 0.62); parts.push(paint(book, rgb(0x6a0e14)));
    const pages = merge([box(0.46, 0.33, 0.04, -0.21, 0, 0.03).rotateY(0.35), box(0.46, 0.33, 0.04, 0.21, 0, 0.03).rotateY(-0.35)]); pages.rotateX(-0.6); pages.translate(0, 1.9, 0.64); parts.push(paint(pages, rgb(0xf4ecd8)));
    return merge(parts);
  },
  // the top of grandma's house over its front (a unit gable: half as wide as 1, the ridge running back
  // along the road over the room behind): white boards in the gable, the round attic window, snow on
  // the roof, the chimney
  gable() {
    const tri = new THREE.BufferGeometry(), A = 0.55;
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1.04, 0, 0, 1.04, 0, 0, 0, A, 0], 3)); tri.computeVertexNormals();
    const parts = [paint(tri.toNonIndexed(), rgb(0xdadde4))];
    const slope = (s) => { const g = new THREE.PlaneGeometry(Math.hypot(1.04, A) + 0.06, 1.1); g.rotateX(-Math.PI / 2); g.rotateZ(-s * Math.atan2(A, 1.04)); g.translate(s * 0.52, A / 2 + 0.012, 0.55); return g; };
    parts.push(paint(slope(-1), rgb(0xeef2f8)), paint(slope(1), rgb(0xeef2f8)));
    parts.push(paint(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 24).rotateX(Math.PI / 2).translate(0, 0.27, -0.006), rgb(0x3a2a20)));
    parts.push(paint(box(0.11, 0.3, 0.11, 0.42, 0.42, 0.5), rgb(0x7a3a2a)), paint(box(0.13, 0.03, 0.13, 0.42, 0.575, 0.5), rgb(0xeef2f8)));
    return merge(parts);
  },
  // a drift of snow
  bank() {
    const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(3.2, 1.3, 2.2);
    const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, P.getY(i) * (0.8 + 0.4 * Math.sin(x * 1.7 + z * 2.3))); }
    g.computeVertexNormals(); return paint(g, SNOW);
  },
  // the long plaque her lines are painted on: the board, a garland along the top, a bow
  plaque() {
    const parts = [paint(box(26, 9.4, 1.2, 0, 0, -0.9), rgb(0x4a2a16)), paint(box(24.8, 8.2, 0.4, 0, 0, -0.3), rgb(0xf0e6d0))];
    const R = seeded(9);
    for (let k = 0; k < 22; k++) { const x = -12.6 + k * 1.2; parts.push(paint(sph(0.95 + R() * 0.3, 1, 0.8, 0.9, x, 4.9 + R() * 0.4, -0.6, 7, 5), rgb(R() < 0.5 ? 0x0e3a1e : 0x14482a))); if (k % 3 === 1) parts.push(paint(sph(0.32, 1, 1, 1, x, 4.6, 0.3, 6, 4), R() < 0.5 ? RED : GOLD)); }
    parts.push(paint(sph(1.2, 1, 0.65, 0.5, -1.0, 5.4, 0.4), RED), paint(sph(1.2, 1, 0.65, 0.5, 1.0, 5.4, 0.4), RED), paint(sph(0.5, 1, 1, 1, 0, 5.4, 0.5, 8, 6), RED));
    for (const s of [-1, 1]) parts.push(paint(box(0.6, 3.2, 0.12, s * 0.7, 3.6, 0.5).rotateZ(s * 0.18), RED));
    return merge(parts);
  },
  // hung on two red ribbons ...
  plaqueHang() { return merge([paint(box(0.4, 40, 0.1, -9, 24.6, -0.9), RED), paint(box(0.4, 40, 0.1, 9, 24.6, -0.9), RED)]); },
  // ... or stood on two candy-cane posts in the snow
  plaquePosts() {
    const parts = [];
    for (const s of [-1, 1]) { const g = cyl(0.55, 0.55, 64, 10, s * 10, -32, -1.6); const P = g.attributes.position, n = P.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const red = ((P.getY(i) + 30) / 2.2 + Math.atan2(P.getZ(i) + 1.6, P.getX(i) - s * 10) / Math.PI) % 2 < 1; c.set(red ? [0.85, 0.06, 0.08] : [0.97, 0.97, 0.97], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g); }
    return merge(parts);
  },
};

function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }

// (the values handed to the layers, filled and handed over again and again)
const TV = { aTint: null, aK: 0 };
const tv = (c, k = 1) => { TV.aTint = c; TV.aK = k; return TV; };
// where a house's bulbs hang, in its own frame (it faces the road down its +z): along the front
// eave, up both edges of the roof's front, and over the porch
const HOUSE_BULBS = [];
for (let i = 0; i <= 8; i++) HOUSE_BULBS.push([-4.9 + i * 1.225, 5.95, 4.38]);
for (const sd of [-1, 1]) for (let i = 1; i <= 4; i++) { const f = i / 5; HOUSE_BULBS.push([sd * 4.9 * (1 - f), 5.95 + 3.4 * f, 4.38 * (1 - f)]); }
for (let i = 0; i < 3; i++) HOUSE_BULBS.push([-0.9 + 0.9 * i, 2.7, 5.15]);
function bulbAt(S, BL, p, q, yaw, s, x, y, z, c, k, halo) {
  const m = S._m, o = S._o;
  local(p, yaw, x * s, y * s, z * s, o); m.compose(o, q, S._s.set(s, s, s)); BL.add(m, tv(c, k));
  if (halo) glowAt(S, o.x, o.y, o.z, 1.8 * s, c, 0.55 * k);
}
const SV = { aIdx: 0, aWake: [1, 0] };

extend({
  layers: {
    wxmPine: (M) => [ST.pine(), VCm(M, 'wxmPineM', 0.12, { roughness: 0.9 }), 260, {}],
    wxmSnowman: (M) => [ST.snowman(), VCm(M, 'wxmSnowmanM', 0.3, { roughness: 0.8 }), 30, {}],
    wxmSanta: (M) => [ST.santa(), VCm(M, 'wxmSantaM', 0.75, { roughness: 0.6 }), 30, {}],
    wxmDeer: (M) => [ST.deer(), M.wxmDeerM || (M.wxmDeerM = tintLit(0.3, 2.2, { roughness: 0.4 })), 30, { aTint: 3, aK: 1 }],
    wxmCane: (M) => [ST.cane(), VCm(M, 'wxmCaneM', 0.35, { roughness: 0.35 }), 260, {}],
    wxmWreath: (M) => [ST.wreath(), VCm(M, 'wxmWreathM', 0.75, { roughness: 0.7 }), 220, {}],
    wxmPresent: (M) => [ST.present(), M.wxmPresentM || (M.wxmPresentM = tintLit(0.35, 0, { roughness: 0.45 })), 160, { aTint: 3, aK: 1 }],
    wxmRibbon: (M) => [ST.ribbon(), M.wxmRibbonM || (M.wxmRibbonM = tintLit(0.5, 0, { roughness: 0.3, metalness: 0.3 })), 160, { aTint: 3, aK: 1 }],
    wxmCoat: (M) => [ST.coat(), M.wxmCoatM || (M.wxmCoatM = tintLit(0.25, 0, { roughness: 0.8 })), 40, { aTint: 3, aK: 1 }],
    wxmSinger: (M) => [ST.singer(), VCm(M, 'wxmSingerM', 0.3, { roughness: 0.7 }), 40, {}],
    wxmBank: (M) => [ST.bank(), VCm(M, 'wxmBankM', 0.1, { roughness: 0.95 }), 300, {}],
    wxmBulb: (M) => [new THREE.SphereGeometry(0.34, 7, 5).scale(1, 1.35, 1), M.wxmBulbM || (M.wxmBulbM = tintLit(0.25, 2.6, { roughness: 0.3 })), 3000, { aTint: 3, aK: 1 }],
    wxmGable: (M) => [ST.gable(), VCm(M, 'wxmGableM', 0.22, { roughness: 0.8, side: THREE.DoubleSide }), 6, {}],
    wxmPlaque: (M) => [ST.plaque(), VCm(M, 'wxmPlaqueM', 0.3, { roughness: 0.75 }), 16, {}],
    wxmPlaqueHang: (M) => [ST.plaqueHang(), VCm(M, 'wxmPlaqueHangM', 0.3, { roughness: 0.8 }), 16, {}],
    wxmPlaquePosts: (M) => [ST.plaquePosts(), VCm(M, 'wxmPlaquePostsM', 0.35, { roughness: 0.4 }), 16, {}],
    wxmPlaqueFace: (M) => [signFace(24.2, 7.6, 0, 0, -0.05), M.sign, 16, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a house of the street with its lights: along the front eave and down the front of the roof
    wxmHouse(S, it, p, q, yaw) {
      PARTS.house(S, it, p, q, yaw);
      const L = S.layers; void L.wxmBulb;
      if (!S.track) return;
      // (the lights only on the houses near enough to see them: far off they're less than a pixel)
      const T = S.tNow ?? 0, near = it.t - T;
      if (near > 12) return;
      const W = S.wxm || {}, fade = 1 - smooth(8, 12, near), k0 = (0.35 + 0.65 * (W.lights ?? 1)) * fade, pulse = (W.pulse ?? 0) * fade, BL = L.wxmBulb, halos = near < 7;
      for (let n = 0; n < HOUSE_BULBS.length; n++) {
        const b = HOUSE_BULBS[n];
        const c = it.scheme === 'multi' ? MULTI[(n + it.cs) % 5] : it.scheme === 'redgreen' ? (n % 2 ? BULB.green : BULB.red) : it.scheme === 'blue' ? BULB.blue : BULB.warm;
        const tw = it.scheme === 'warm' ? 0.9 + 0.1 * Math.sin(T * 1.3 + n) : (it.chase ? (0.25 + 0.75 * (Math.sin(T * 6 - n * 0.9) > 0.2 ? 1 : 0)) : 0.55 + 0.45 * Math.sin(T * (1.1 + (n % 3) * 0.4) + n * 2.1 + it.seed * 9));
        bulbAt(S, BL, p, q, yaw, it.s, b[0], b[1], b[2], c, clamp(tw * k0 + pulse, 0, 2.4), halos && n % 3 === 0);
      }
    },
    // the snowy things on the lawns, each where it stands
    wxmThing(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['wxmPine', 'wxmSnowman', 'wxmSanta', 'wxmDeer', 'wxmCane', 'wxmWreath', 'wxmBank', 'wxmPresent', 'wxmRibbon', 'wxmCoat', 'wxmSinger', 'wxmGable', 'wxmBulb']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, o = S._o, k = it.kind;
      m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s));
      if (k === 'pine') L.wxmPine.add(m);
      else if (k === 'snowman') { L.wxmSnowman.add(m); poolAt(S, p.x, p.y + 0.1, p.z, 9 * s, BULB.warm, 0.25); }
      else if (k === 'bank') L.wxmBank.add(m);
      else if (k === 'cane') L.wxmCane.add(m);
      else if (k === 'wreathPost') { local(p, yaw, 0, 5.2, 0.32, o); m.compose(o, q, S._s.set(s, s, s)); L.wxmWreath.add(m); }
      else if (k === 'gable') {
        // grandma's house: the gable on top of its front, lights up both edges, the wreath on the door
        const hw = it.hw, top = it.top;
        local(p, yaw, 0, top, 0, o); m.compose(o, q, S._s.set(hw, hw, it.depth ?? 160)); L.wxmGable.add(m);
        const n = 26;
        for (let j = 0; j <= n; j++) for (const sd of [-1, 1]) {
          const f = j / n, c = MULTI[(j + (sd > 0 ? 2 : 0)) % 5], kk = 0.55 + 0.45 * Math.sin(T * 2.2 + j * 1.3 + sd);
          local(p, yaw, sd * 1.04 * hw * (1 - f), top + 0.55 * hw * f + 0.6, -0.6, o); m.compose(o, q, S._s.set(5, 5, 5)); L.wxmBulb.add(m, tv(c, kk));
          if (j % 2 === 0) glowAt(S, o.x, o.y, o.z, 9, c, 0.6 * kk);
        }
        local(p, yaw, 0, top + 0.27 * hw, -0.4, o); glowAt(S, o.x, o.y, o.z, 0.2 * hw, BULB.warm, 0.7);
        local(p, yaw, 0, (it.door ?? 26) + 9, -1.2, o); m.compose(o, q, S._s.set(7, 7, 7)); L.wxmWreath.add(m);
      }
      else if (k === 'santa') {
        // (it breathes: an inflatable on its blower)
        S._s.set(s * (1 + 0.02 * Math.sin(T * 2 + it.seed * 7)), s * (1 - 0.025 * Math.sin(T * 2 + it.seed * 7)), s); m.compose(p, q, S._s); L.wxmSanta.add(m);
        local(p, yaw, 0, 3 * s, 0, o); glowAt(S, o.x, o.y, o.z, 10 * s, [1, 0.25, 0.2], 0.35); poolAt(S, p.x, p.y + 0.1, p.z, 10 * s, [1, 0.3, 0.25], 0.4);
      }
      else if (k === 'deer') {
        L.wxmDeer.add(m, tv([0.92, 0.95, 1], 0.7 + 0.3 * Math.sin(T * 3 + it.seed * 5)));
        // the nose: red, and at "may your nose" it blinks
        const nose = it.nose ?? 1e9, bl = T > nose && T < nose + 2.4 ? (Math.sin((T - nose) * 14) > 0 ? 2.6 : 0.4) : 1;
        local(p, yaw, 0, 5.4 * s, 3.75 * s, o); glowAt(S, o.x, o.y, o.z, 2.2 * s * (bl > 2 ? 1.6 : 1), [1, 0.08, 0.06], 1.2 * bl);
        poolAt(S, p.x, p.y + 0.1, p.z, 9 * s, [0.8, 0.9, 1], 0.3);
      }
      else if (k === 'present') {
        // a pile: the big ones at the bottom (laid out once)
        if (!it._pile) {
          const R = seeded((it.seed * 1e6) | 0 || 7), cols = [[0.82, 0.08, 0.1], [0.1, 0.45, 0.2], [0.15, 0.3, 0.75], [0.9, 0.82, 0.7], [0.75, 0.6, 0.15], [0.6, 0.1, 0.45]];
          it._pile = [];
          for (let j = 0; j < (it.n ?? 9); j++) {
            const w = (3.6 - j * 0.22) * (0.8 + R() * 0.4), hh = w * (0.6 + R() * 0.5), a = R() * 6.28, rr = j < 5 ? R() * 4 : R() * 2;
            it._pile.push({ x: Math.cos(a) * rr, y: j < 5 ? 0 : hh * 0.6 + (j - 5) * 0.4, z: Math.sin(a) * rr, ry: R() * 1.2, w, hh, d: w * (0.7 + R() * 0.5), c: cols[Math.floor(R() * cols.length)], rc: R() < 0.5 ? [1, 0.85, 0.35] : [1, 1, 1] });
          }
        }
        const pq = S._wxq || (S._wxq = new THREE.Quaternion());
        for (const b of it._pile) {
          local(p, yaw, b.x * s, b.y * s, b.z * s, o);
          S._e.set(0, yaw + b.ry, 0); pq.setFromEuler(S._e);
          m.compose(o, pq, S._s.set(b.w * s, b.hh * s, b.d * s));
          L.wxmPresent.add(m, tv(b.c, 1)); L.wxmRibbon.add(m, tv(b.rc, 1));
        }
        local(p, yaw, 0, 4 * s, 0, o); glowAt(S, o.x, o.y, o.z, 16 * s, BULB.warm, 0.25); poolAt(S, p.x, p.y + 0.1, p.z, 16 * s, BULB.warm, 0.45);
      }
      else if (k === 'carolers') {
        // five of them in an arc under the lamp, books open, singing at the street
        for (let j = 0; j < 5; j++) {
          const a = (j - 2) * 0.42; local(p, yaw, Math.sin(a) * 4.5 * s, 0, (Math.cos(a) - 1) * 3 * s, o);
          S._e.set(0, yaw - a * 0.6 + Math.sin(T * 2.2 + j) * 0.04, 0); const cq = (S._wxq2 || (S._wxq2 = new THREE.Quaternion())).setFromEuler(S._e);
          const bob = 1 + 0.03 * Math.sin(T * 4.3 + j * 1.3);
          m.compose(o, cq, S._s.set(s, s * bob, s)); L.wxmCoat.add(m, tv(COATS[j], 1)); L.wxmSinger.add(m);
        }
        local(p, yaw, 0, 9 * s, 2 * s, o); glowAt(S, o.x, o.y, o.z, 4 * s, BULB.warm, 1.2); poolAt(S, p.x, p.y + 0.1, p.z, 14 * s, BULB.warm, 0.7);
      }
    },
    // her lines on a plaque: hung from above indoors, on candy-cane posts outdoors
    wxmPlaqueIn(S, it, p) { it.indoor = true; PARTS.wxmPlaque(S, it, p); },
    wxmPlaqueOut(S, it, p) { it.indoor = false; PARTS.wxmPlaque(S, it, p); },
    wxmPlaque(S, it, p) {
      const L = S.layers; void L.wxmPlaque; void L.wxmPlaqueHang; void L.wxmPlaquePosts; void L.wxmPlaqueFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw;
      S._e.set(0, h + Math.PI + (it.x > 0 ? -0.3 : 0.3), Math.sin(T * 1.1 + it.t) * (it.indoor ? 0.02 : 0.005));
      const fq = (S._wxpq || (S._wxpq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 13);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s));
      L.wxmPlaque.add(m); SV.aIdx = it.idx; L.wxmPlaqueFace.add(m, SV);
      if (it.indoor) L.wxmPlaqueHang.add(m); else L.wxmPlaquePosts.add(m);
      glowAt(S, p.x, p.y, p.z, 28 * s, BULB.warm, 0.12);
    },
  },
  kits: {
    // her street: the houses close on both sides with their lights, a second row behind, the lamps
    // with their wreaths, the drifts along the curb, pines between, cars under snow in the drives
    wxmStreet(S, z, R) {
      const gap = z.gap ?? 0.42;
      for (const side of [-1, 1]) for (let t = z.from + R() * gap; t < z.to; t += gap * (0.8 + R() * 0.45)) {
        const x = side * ((z.x ?? 27) + R() * 5), rot = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        S.items.push({ t, x, rot, s: 1.05 + R() * 0.35, parts: 'wxmHouse', tint: col(pick(R, HOUSES)), roofTint: SNOWROOF, seed: R(), wake0: 0.85, keepLit: true, porch: true, scheme: pick(R, SCHEMES), cs: Math.floor(R() * 5), chase: R() < 0.2 });
        if (R() < 0.45) S.items.push({ t: t + 0.06, x: x - side * 6, rot: rot + Math.PI / 2 + (R() - 0.5) * 0.2, parts: 'parked', tint: [0.86, 0.88, 0.94] });
        if (R() < 0.6) S.items.push({ t: t + gap * 0.5, x: side * (20 + R() * 3), rot: R() * 6, s: 0.8 + R() * 0.5, parts: 'wxmThing', kind: 'bank' });
        if (R() < 0.5) S.items.push({ t: t + gap * 0.5, x: side * (38 + R() * 12), rot: R() * 6, s: 0.9 + R() * 0.5, parts: 'wxmThing', kind: 'pine' });
        if (R() < 0.6) S.items.push({ t: t + R() * gap, x: side * (52 + R() * 18), rot, s: 1.0 + R() * 0.4, parts: 'wxmHouse', tint: col(pick(R, HOUSES)), roofTint: SNOWROOF, seed: R(), wake0: 0.7, keepLit: true, scheme: pick(R, SCHEMES), cs: Math.floor(R() * 5) });
        if (R() < 0.35) S.items.push({ t: t + R() * gap, x: side * (80 + R() * 70), s: 1.2 + R() * 0.8, parts: 'wxmThing', kind: 'pine', rot: R() * 6 });
      }
      for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) {
        S.items.push({ t, x: side * 16.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R() });
        S.items.push({ t, x: side * 16.3, rot: SIDE(side), s: 1.1, parts: 'wxmThing', kind: 'wreathPost' });
      }
    },
    // the lawn decorations: one of these by a house now and then
    wxmYard(S, z, R) {
      const kinds = z.kinds || ['snowman', 'santa', 'deer', 'canes', 'snowman', 'deer'];
      for (let t = z.from + R() * 0.5; t < z.to; t += (z.every ?? 1.1) * (0.7 + R() * 0.6)) {
        const side = R() < 0.5 ? -1 : 1, kind = pick(R, kinds), x = side * (23 + R() * 5);
        if (kind === 'canes') { for (let j = 0; j < 6; j++) S.items.push({ t: t + j * 0.05, x: x + side * j * 0.5, rot: SIDE(side) + (R() - 0.5) * 0.3, s: 2.2, parts: 'wxmThing', kind: 'cane' }); continue; }
        S.items.push({ t, x, rot: FACE(side), s: kind === 'deer' ? 2.3 : 2.0, seed: R(), parts: 'wxmThing', kind, nose: z.nose });
      }
    },
    // set-pieces at their moments: { t, x, kind, s }
    wxmSet(S, z) { for (const c of z.at) S.items.push({ t: c.t, x: c.x, rot: c.rot ?? FACE(c.x), s: c.s ?? 1, seed: c.t % 1, n: c.n, nose: c.nose, parts: 'wxmThing', kind: c.kind, ahead: 40 }); },
    // grandma's house over every front of it we ride in at: its gable, its lights, the wreath
    wxmGables(S) {
      for (const sp of S.plan.rooms || []) {
        const cap = (sp.caps || [])[0]; if (!cap || cap.kind !== 'front') continue;
        const [W, H] = HOUSE.dims[sp.style];
        S.items.push(onFloor(S, { t: sp.from, x: 0, rot: 0, s: 1, hw: W + 70, top: H + 24, door: cap.hh, parts: 'wxmThing', kind: 'gable', ahead: 46 }));
      }
    },
    // candy canes along both sides of a stretch (the rail's)
    wxmCanes(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.16) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 9), rot: SIDE(side) + Math.PI / 2, s: z.s ?? 2.2, parts: 'wxmThing', kind: 'cane' }); },
  },
});
