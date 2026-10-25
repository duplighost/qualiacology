// Makeup Sex at Your Funeral. Dusk on a street of old houses, the hearse at the curb, the
// letter board out front: OPEN CASKET, OPEN BAR. In through the funeral home's front door
// and we are small in it: the casket open and full of lilies, the champagne tower, her
// lipstick, the pin dropped on heaven, three thousand likes, the tissues and the mascara.
// Out the back into the cemetery for every chorus: the gate, the stones, the cypresses, the
// open grave and its dirt. The lectern for the eulogy, the prep room's white tile, the guest
// book, the mourning bouquet in the air. The cemetery chapel at 3 a.m., dawn over the graves,
// and the same chapel in white for the wedding, the urn on the altar.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, PARTS } from './scenery.js';
import { prepare, floorAt, groundAt, Terrain } from './trail.js';
import { Room, paint, rgb, seeded, box, litTint } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
// along the road, its front (+x) turned to the road
const ALONG = (x) => (x > 0 ? 0 : Math.PI);
// turned to the rider coming up the road, and a little toward the road
const FACE = (x) => Math.PI + (x > 0 ? -0.55 : 0.55);
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };

// ---------- flowers ----------
// a lily: six petals flaring from a green throat, the stamens tipped with pollen (opens up +y)
function lily(scale = 1, tint = 0xfbf8f2) {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    // a petal: long, a little cupped, its tip curling back
    const pe = new THREE.SphereGeometry(1, 10, 8); pe.scale(0.44, 1.15, 0.14); pe.translate(0, 1.05, 0);
    const p = pe.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const u = Math.max(0, p[i + 1]) / 2.2; p[i + 2] += 0.55 * u * u - 0.12 * (1 - Math.abs(p[i]) / 0.44); }
    pe.computeVertexNormals();
    pe.rotateX(0.95 + (k % 2) * 0.22); pe.rotateY((k / 6) * Math.PI * 2 + (k % 2) * 0.3);
    parts.push(paint(pe, rgb(tint)));
  }
  parts.push(paint(cyl(0.36, 0.06, 0.7, 8, 0, 0.3, 0), rgb(0xb8d890)));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; parts.push(paint(sph(0.06, 1, 1.8, 1, Math.cos(a) * 0.16, 1.0, Math.sin(a) * 0.16, 5, 4), rgb(0xb8601a))); }
  const g = merge(parts); g.scale(scale, scale, scale); return g;
}
// a white rose: a ball of petals
function rose(scale = 1, tint = 0xf6f2ec) {
  const parts = [];
  parts.push(paint(sph(0.5, 1, 0.8, 1, 0, 0.4, 0, 10, 8), rgb(tint)));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push(paint(sph(0.42, 1, 0.75, 0.5, Math.cos(a) * 0.38, 0.35, Math.sin(a) * 0.38, 8, 6).rotateY(-a), rgb(tint))); }
  const g = merge(parts); g.scale(scale, scale, scale); return g;
}
function leaf(len, x, y, z, ry, rz, c = 0x3a6a2a) { const l = sph(1, 0.3, len, 0.08, 0, len, 0, 8, 6); l.rotateZ(rz); l.rotateY(ry); l.translate(x, y, z); return paint(l, rgb(c)); }
function heartShape() {
  const s = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i) s.lineTo(x / 17, y / 17); else s.moveTo(x / 17, y / 17);
  }
  return s;
}

// ---------- the funeral home's things, at our size (about twelve times) ----------
const FG = {
  // the casket, open, full of lilies; on its draped stand. Long side to +x (the road)
  casket() {
    const parts = [], R = seeded(41);
    const wood = rgb(0x4a1a12), dark = rgb(0x2a0c08), satin = rgb(0xf6eef2), velvet = rgb(0x3a1838), brass = rgb(0xd8b060);
    parts.push(paint(box(7.4, 9, 23, 0, 4.5, 0), velvet));                         // the skirt on the stand
    for (let k = 0; k < 12; k++) parts.push(paint(box(0.2, 8.8, 0.2, 3.72, 4.5, -11 + k * 2), rgb(0x2a1028)));   // its folds
    parts.push(paint(box(7, 5.6, 25, 0, 11.8, 0), wood));                          // the body
    parts.push(paint(box(7.6, 0.9, 25.6, 0, 14.6, 0), dark));                      // the top rail
    parts.push(paint(box(7.5, 0.7, 25.4, 0, 9.3, 0), dark));                       // the base moulding
    for (const s of [-1, 1]) parts.push(paint(box(0.4, 0.5, 19, s * 3.75, 11.4, 0), brass));   // the bar handles
    for (const s of [-1, 1]) for (const z of [-8, 0, 8]) parts.push(paint(box(0.5, 1.2, 0.5, s * 3.7, 11.6, z), brass));
    // the inside: satin, ruffled at the rim
    parts.push(paint(box(6.2, 0.5, 24.2, 0, 14.3, 0), satin));
    for (let k = 0; k < 30; k++) { const z = -11.8 + k * 0.82; for (const s of [-1, 1]) parts.push(paint(sph(0.5, 1, 0.6, 1.2, s * 3.2, 15.05, z, 6, 4), satin)); }
    // the lid, open all the way back on the far side, its satin to the road
    const lid = [];
    lid.push(paint(box(7.4, 1.8, 25, 3.7, 0.9, 0), wood));
    lid.push(paint(box(6.6, 0.12, 24, 3.7, -0.02, 0), satin));
    for (let k = 0; k < 9; k++) lid.push(paint(box(6.4, 0.3, 0.3, 3.7, -0.1, -10.5 + k * 2.6), rgb(0xe8dce4)));
    for (const g of lid) { g.rotateZ(Math.PI * 0.56); g.translate(-3.7, 15.1, 0); parts.push(g); }
    // lilies, heaped and spilling over toward the road, their leaves among them
    for (let k = 0; k < 64; k++) {
      const z = (R() - 0.5) * 23, x = (R() - 0.2) * 5.6, y = 14.8 + R() * 1.6 + (Math.abs(z) < 8 ? 0.6 : 0);
      const f = lily(1.05 + R() * 0.5, R() < 0.12 ? 0xf8e8ee : 0xfbf8f2);
      f.rotateX((R() - 0.5) * 1.2); f.rotateZ(-0.3 - R() * 0.9); f.rotateY((R() - 0.5) * 0.6);
      f.translate(x, y, z); parts.push(f);
      if (R() < 0.7) parts.push(leaf(1.6 + R(), x + 0.4, y - 0.3, z + (R() - 0.5), R() * 6, -1.0 - R() * 0.6));
    }
    return merge(parts);
  },
  // the open bar: a long draped table, bottles on ice, the champagne tower
  barTable() {
    const parts = [], cloth = rgb(0x120a10);
    parts.push(paint(box(9, 9, 30, 0, 4.5, 0), cloth));
    for (let k = 0; k < 14; k++) parts.push(paint(box(0.2, 8.9, 0.24, 4.52, 4.45, -14 + k * 2.15), rgb(0x1e1218)));
    parts.push(paint(box(9.4, 0.3, 30.4, 0, 9.1, 0), rgb(0x1a1016)));
    const R = seeded(9);
    for (let k = 0; k < 9; k++) {
      const z = 2.5 + k * 1.35, c = pick(R, [0x1a3a1a, 0x2a1a0a, 0x0a1a2a, 0x3a0a14]);
      parts.push(paint(cyl(0.55, 0.55, 3.2, 10, 1.6 - (k % 2) * 1.2, 10.85, z), rgb(c)));
      parts.push(paint(cyl(0.22, 0.5, 1.4, 10, 1.6 - (k % 2) * 1.2, 13.1, z), rgb(c)));
      parts.push(paint(cyl(0.25, 0.25, 0.6, 8, 1.6 - (k % 2) * 1.2, 14.0, z), rgb(k % 3 ? 0xd8b060 : 0xe8e0d0)));
    }
    // a silver bucket with a bottle in the ice
    parts.push(paint(cyl(1.6, 1.2, 2.6, 16, 1, 10.6, -1.5), rgb(0xc8ccd4)));
    parts.push(paint(cyl(0.5, 0.5, 3, 10, 0, 0, 0).rotateZ(0.2).translate(1, 12.4, -1.5), rgb(0x1a3a1a)));
    return merge(parts);
  },
  // coupes in a pyramid; the liquid is its own (bright) layer
  coupes(liquid) {
    const parts = [], c = 1.8;
    let y = 9.3;
    for (let n = 5; n >= 1; n--) {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - (n - 1) / 2) * 1.32 * c + 0.4, z = (j - (n - 1) / 2) * 1.32 * c - 7.5;
        if (liquid) { parts.push(cyl(0.6 * c, 0.6 * c, 0.06, 14, x, y + 1.22 * c, z)); continue; }
        parts.push(paint(new THREE.CylinderGeometry(0.66 * c, 0.12 * c, 0.42 * c, 14, 1, true).translate(x, y + 1.08 * c, z), rgb(0xe8eef4)));
        parts.push(paint(cyl(0.05 * c, 0.05 * c, 0.86 * c, 5, x, y + 0.45 * c, z), rgb(0xe8eef4)));
        parts.push(paint(cyl(0.36 * c, 0.38 * c, 0.04, 10, x, y + 0.02, z), rgb(0xe8eef4)));
      }
      y += 1.32 * c;
    }
    return merge(parts);
  },
  // her lipstick, open, standing on the carpet, the cap on its side by it
  lipstick() {
    const parts = [], gold = rgb(0xe8c068), black = rgb(0x2a0a12), red = rgb(0xe0102e);
    parts.push(paint(cyl(2.5, 2.6, 5.5, 28, 0, 2.75, 0), gold));
    for (let k = 0; k < 3; k++) parts.push(paint(cyl(2.62, 2.62, 0.25, 28, 0, 1.0 + k * 1.6, 0), black));
    parts.push(paint(cyl(2.55, 2.55, 0.5, 28, 0, 5.6, 0), gold));
    parts.push(paint(cyl(2.3, 2.3, 4.2, 28, 0, 8.0, 0), gold));
    const b = new THREE.CylinderGeometry(1.85, 1.85, 6.4, 28, 4);
    const p = b.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) if (p[i + 1] > 0) p[i + 1] = 3.2 - (p[i] + 1.85) * 0.62 + (p[i + 1] - 3.2) * 0.2;
    b.computeVertexNormals(); b.translate(0, 13.3, 0); parts.push(paint(b, red));
    const cap = cyl(2.55, 2.55, 7, 28, 0, 0, 0); cap.rotateZ(Math.PI / 2); cap.rotateY(0.6); cap.translate(-1.5, 2.55, 7.5); parts.push(paint(cap, gold));
    const band = cyl(2.6, 2.6, 0.6, 28, 0, 0, 0); band.rotateZ(Math.PI / 2); band.rotateY(0.6); band.translate(-1.5 + 2.9 * Math.cos(0.6), 2.55, 7.5 - 2.9 * Math.sin(0.6)); parts.push(paint(band, gold));
    return merge(parts);
  },
  // a map pin dropped on heaven, tip down, hung from the ceiling on a wire
  pin() {
    const parts = [], red = rgb(0xe8243c);
    parts.push(paint(sph(4.2, 1, 1, 0.92, 0, 9.2, 0, 28, 20), red));
    const cone = new THREE.ConeGeometry(3.6, 8.6, 28); cone.rotateX(Math.PI); cone.translate(0, 3.6, 0); parts.push(paint(cone, red));
    for (const z of [-3.86, 3.86]) parts.push(paint(cyl(1.6, 1.6, 0.2, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 9.6, z), rgb(0xfff4f4)));
    parts.push(paint(box(0.12, 40, 0.12, 0, 33.3, 0), rgb(0x9a9aa0)));
    return merge(parts);
  },
  // the notification: a white bubble on a stand, its tail down; the words go on in front
  bubble() {
    const parts = [];
    const s = new THREE.Shape(), W = 12, H = 4.4, r = 2.2;
    s.moveTo(-W + r, -H); s.lineTo(-1.5, -H); s.lineTo(0, -H - 2.6); s.lineTo(1.5, -H); s.lineTo(W - r, -H); s.quadraticCurveTo(W, -H, W, -H + r);
    s.lineTo(W, H - r); s.quadraticCurveTo(W, H, W - r, H); s.lineTo(-W + r, H); s.quadraticCurveTo(-W, H, -W, H - r); s.lineTo(-W, -H + r); s.quadraticCurveTo(-W, -H, -W + r, -H);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3 });
    g.translate(0, 20, -0.6); parts.push(paint(g, rgb(0xfafafc)));
    parts.push(paint(box(0.5, 13, 0.5, 0, 6.5, -0.5), rgb(0x8a8a94)));
    parts.push(paint(cyl(3, 3.2, 0.5, 20, 0, 0.25, -0.5), rgb(0x6a6a74)));
    return merge(parts);
  },
  // a heart, flat-ish and glossy
  heart() { const g = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -0.15); return paint(g, rgb(0xff2a4a)); },
  // a box of tissues, one pulled up
  tissues() {
    const parts = [], R = seeded(53);
    parts.push(paint(box(5.6, 6.6, 5.6, 0, 3.3, 0), rgb(0xf4eef2)));
    // little pink roses printed all over it
    for (let k = 0; k < 40; k++) { const f = Math.floor(R() * 4), u = (R() - 0.5) * 4.8, v = 0.5 + R() * 5.6, c = rgb(pick(R, [0xe86a8a, 0xf0a0b8, 0x7aa86a])); const d = sph(0.32 + R() * 0.2, 1, 1, 0.15, 0, 0, 0, 8, 6); if (f < 2) d.translate(u, v, (f ? 1 : -1) * 2.82); else { d.rotateY(Math.PI / 2); d.translate((f === 2 ? 1 : -1) * 2.82, v, u); } parts.push(paint(d, c)); }
    parts.push(paint(cyl(1.2, 1.2, 0.1, 16, 0, 6.62, 0), rgb(0xd8c8d0)));
    const t = new THREE.PlaneGeometry(3.6, 5.2, 8, 10), p = t.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1]; p[i + 2] = Math.sin(x * 1.3 + y * 0.8) * 0.5 + Math.sin(y * 2.1) * 0.3; p[i] *= 1 - 0.4 * Math.max(0, (y + 2.6) / 5.2); }
    t.computeVertexNormals(); t.translate(0, 9.2, 0); parts.push(paint(t, rgb(0xffffff)));
    const t2 = t.clone(); t2.rotateY(Math.PI / 2); parts.push(paint(t2, rgb(0xffffff)));
    return merge(parts);
  },
  // the mascara: the tube standing, the wand leaning on it, a black smudge of brush
  mascara() {
    const parts = [], black = rgb(0x111014), silver = rgb(0xc8ccd4);
    parts.push(paint(cyl(1.5, 1.5, 13, 20, 0, 6.5, 0), black));
    parts.push(paint(cyl(1.55, 1.55, 0.7, 20, 0, 12.2, 0), silver));
    parts.push(paint(cyl(1.0, 1.0, 1.4, 16, 0, 13.6, 0), silver));
    const wand = [];
    wand.push(paint(cyl(1.4, 1.4, 6, 18, 0, 3, 0), black));
    wand.push(paint(cyl(0.22, 0.22, 7, 8, 0, 9.5, 0), silver));
    for (let k = 0; k < 60; k++) { const a = k * 2.4, y = 13.2 + (k / 60) * 4.2, r = 0.95 - Math.abs(k / 60 - 0.5) * 0.6; wand.push(paint(box(0.14, 0.14, r * 2, 0, y, 0).rotateY(a), rgb(0x0a0a0c))); }
    for (const g of wand) { g.rotateZ(-0.34); g.translate(4.6, 0, 1.2); parts.push(g); }
    return merge(parts);
  },
  // the lectern for the eulogy, its microphone on a gooseneck
  lectern() {
    const parts = [], wood = rgb(0x7a4424), brass = rgb(0xd8b060);
    const body = new THREE.CylinderGeometry(4.2, 5.6, 13, 4, 1); body.rotateY(Math.PI / 4); body.scale(1, 1, 0.7); body.translate(0, 6.5, 0); parts.push(paint(body, wood));
    const top = box(9.4, 0.8, 7, 0, 0, 0); top.rotateX(0.28); top.translate(0, 13.6, 0); parts.push(paint(top, rgb(0x5a3018)));
    parts.push(paint(box(4, 1.4, 0.2, 0, 8, 3.25), brass));
    parts.push(paint(cyl(0.18, 0.18, 2, 8, 0, 14.8, -1.8), rgb(0x1a1a1e)));
    let p = new THREE.Vector3(0, 15.8, -1.8);
    for (let k = 0; k < 10; k++) { const n = p.clone().add(new THREE.Vector3(0, 0.62 * Math.cos(k * 0.17), 0.62 * Math.sin(k * 0.17))); const d = n.clone().sub(p); const s = new THREE.CylinderGeometry(0.16, 0.16, d.length(), 6); s.translate(0, d.length() / 2, 0); s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); s.translate(p.x, p.y, p.z); parts.push(paint(s, rgb(0x2a2a30))); p = n; }
    parts.push(paint(sph(0.75, 1, 1.4, 1, p.x, p.y + 0.4, p.z + 0.4, 12, 8), rgb(0x18181c)));
    return merge(parts);
  },
  // the prep room's table: steel on a pedestal, the sheet folded at the end, the drain
  prepTable() {
    const parts = [], steel = rgb(0xdce2e8), dark = rgb(0x8a9098);
    parts.push(paint(box(10, 0.8, 26, 0, 10.6, 0), steel));
    for (const s of [-1, 1]) parts.push(paint(box(0.6, 1.2, 26, s * 4.9, 11.2, 0), steel));
    parts.push(paint(box(10, 1.2, 0.6, 0, 11.2, -12.8), steel));
    parts.push(paint(cyl(0.6, 0.6, 0.3, 12, 0, 11.05, 11.6), dark));
    parts.push(paint(cyl(1.4, 2.2, 10, 16, 0, 5, 0), dark));
    parts.push(paint(cyl(4, 4.4, 0.6, 20, 0, 0.3, 0), dark));
    parts.push(paint(box(9, 1.6, 6, 0, 11.8, -9), rgb(0xf4f6f8)));
    parts.push(paint(box(9.2, 0.5, 6.2, 0, 12.8, -9), rgb(0xe8ecf0)));
    return merge(parts);
  },
  // the big round lamp over the table, on its arm from the ceiling
  prepLamp() {
    const parts = [], steel = rgb(0xc8ccd4);
    parts.push(paint(cyl(5, 5.6, 1.2, 28, 0, 0, 0), steel));
    parts.push(paint(cyl(4.4, 4.4, 0.1, 28, 0, -0.62, 0), rgb(0xfffff4)));
    parts.push(paint(box(0.6, 14, 0.6, 0, 7.5, 0), steel));
    return merge(parts);
  },
  // the guest book's stand; the book itself is its own (textured) layer
  bookStand() {
    const parts = [], wood = rgb(0x3a1e10);
    parts.push(paint(cyl(0.9, 1.2, 7, 10, 0, 3.5, 0), wood));
    parts.push(paint(cyl(3, 3.4, 0.8, 16, 0, 0.4, 0), wood));
    const top = box(14, 0.6, 9, 0, 0, 0); top.rotateX(0.42); top.translate(0, 7.4, 0); parts.push(paint(top, wood));
    return merge(parts);
  },
  // a bouquet: lilies and roses, the greens, a black bow and its tails
  bouquet() {
    const parts = [], R = seeded(13);
    for (let k = 0; k < 9; k++) { const a = R() * 6.28, r = R() * 1.6; const f = lily(1 + R() * 0.3); f.rotateX(-0.2 + R() * 0.5); f.rotateY(a); f.translate(Math.cos(a) * r, 3.6 + R() * 1.2, Math.sin(a) * r); parts.push(f); }
    for (let k = 0; k < 7; k++) { const a = R() * 6.28, r = 0.6 + R() * 1.2; const f = rose(1.1); f.translate(Math.cos(a) * r, 3.4 + R() * 0.8, Math.sin(a) * r); parts.push(f); }
    for (let k = 0; k < 10; k++) parts.push(leaf(1.4, 0, 3.2, 0, R() * 6.28, -1.2 - R() * 0.4));
    parts.push(paint(cyl(0.5, 0.25, 3.6, 10, 0, 1.6, 0), rgb(0x3a5a2a)));
    for (const s of [-1, 1]) { parts.push(paint(sph(1, 0.9, 0.5, 0.25, s * 0.8, 2.9, 0.5, 10, 6), rgb(0x0a0a0c))); parts.push(paint(box(0.4, 2.6, 0.1, s * 0.5, 1.5, 0.5).rotateZ(s * 0.3), rgb(0x0a0a0c))); }
    return merge(parts);
  },
  // a wreath of white roses on an easel, a purple sash across it
  wreath() {
    const parts = [], R = seeded(29), gold = rgb(0xb8904a);
    for (const [x, z, rz] of [[-2.4, 1.2, 0.12], [2.4, 1.2, -0.12], [0, -2.2, 0]]) { const l = box(0.4, 21, 0.4, 0, 10.5, 0); l.rotateZ(rz); l.rotateX(z < 0 ? -0.18 : 0.08); l.translate(x, 0, z); parts.push(paint(l, gold)); }
    for (let k = 0; k < 34; k++) { const a = (k / 34) * Math.PI * 2; const f = rose(0.9 + R() * 0.3, R() < 0.2 ? 0xf8e0e8 : 0xf6f2ec); f.rotateX(Math.PI / 2); f.translate(Math.cos(a) * 4.6, 15 + Math.sin(a) * 4.6, 1.4); parts.push(f); }
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + 0.1; parts.push(paint(sph(1, 0.5, 1.1, 0.2, Math.cos(a) * 4.7, 15 + Math.sin(a) * 4.7, 1.0, 6, 4).rotateZ(0), rgb(0x2a4a24))); }
    const sash = box(10.5, 1.6, 0.15, 0, 15, 2.1); sash.rotateZ(-0.6); parts.push(paint(sash, rgb(0x5a2a7a)));
    return merge(parts);
  },
  // a pew: the seat, the back, the ends scrolled at the top (runs along x, faces +z)
  pew() {
    const parts = [];
    parts.push(box(26, 0.9, 4.6, 0, 4.8, 0));
    const back = box(26, 7.6, 0.8, 0, 9.2, -2.3); back.rotateX(-0.08); parts.push(back);
    parts.push(box(26.4, 0.5, 1.2, 0, 13.2, -2.6));
    for (const s of [-1, 1]) { parts.push(box(0.8, 11, 5.6, s * 13, 5.5, -0.4)); parts.push(sph(1, 0.45, 1.6, 2.6, s * 13, 11, -0.4, 10, 8)); }
    parts.push(box(25, 1.2, 1.4, 0, 1.4, 3.4));
    return merge(parts);
  },
  // a white bow on a pew end, for the wedding
  pewBow() {
    const parts = [];
    for (const s of [-1, 1]) {
      const loop = new THREE.TorusGeometry(1.1, 0.32, 8, 20); loop.scale(1.35, 0.75, 0.5); loop.rotateZ(s * 0.25); loop.translate(s * 1.45, 0.25, 0); parts.push(loop);
      const tail = box(0.7, 3.2, 0.1, 0, -1.6, 0); tail.rotateZ(s * 0.35); tail.translate(s * 0.35, -0.2, 0.05); parts.push(tail);
    }
    parts.push(sph(0.55, 1.1, 0.9, 0.7, 0, 0.1, 0.1, 10, 8));
    const g = merge(parts); g.translate(0, 9.6, 0); return g;
  },
  // a candelabrum: five arms, five candles (the flames are glows)
  candelabra() {
    const parts = [], brass = rgb(0xc8a050), wax = rgb(0xfff4e4);
    parts.push(paint(cyl(0.4, 0.6, 15, 10, 0, 7.5, 0), brass));
    parts.push(paint(cyl(2.4, 2.8, 0.6, 16, 0, 0.3, 0), brass));
    for (let k = -2; k <= 2; k++) {
      parts.push(paint(box(Math.abs(k) * 1.6 + 0.3, 0.3, 0.3, k * 0.8, 15, 0), brass));
      parts.push(paint(cyl(0.5, 0.3, 0.5, 8, k * 1.6, 15.4, 0), brass));
      parts.push(paint(cyl(0.32, 0.32, 3, 8, k * 1.6, 17.1, 0), wax));
      parts.push(paint(sph(0.24, 1, 2.4, 1, k * 1.6, 19.1, 0, 8, 6), rgb(0xffb030)));
    }
    return merge(parts);
  },
  // the urn: a classic shape turned on a lathe, black and gold
  urn() {
    const pts = [[0, 0], [2.4, 0], [2.4, 0.5], [1.4, 0.9], [1.2, 1.6], [2.6, 3.2], [3.2, 5], [2.9, 6.8], [1.6, 7.8], [1.5, 8.6], [2.0, 9.0], [1.2, 9.6], [0.4, 10.4], [0.5, 10.8], [0, 11.2]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 32); g.computeVertexNormals();
    const band = cyl(3.24, 3.24, 0.5, 32, 0, 5, 0), band2 = cyl(1.62, 1.62, 0.3, 24, 0, 8.6, 0);
    return merge([paint(g, rgb(0x14101a)), paint(band, rgb(0xd8b060)), paint(band2, rgb(0xd8b060))]);
  },
  // the locket, open on its chain over the aisle: a gold heart
  locket() {
    const parts = [], gold = rgb(0xe8c060);
    const h = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 4, curveSegments: 24 });
    h.translate(0, 0, -0.3); h.scale(4, 4, 4); h.translate(0, 8, 0); parts.push(paint(h, gold));
    parts.push(paint(new THREE.TorusGeometry(0.9, 0.22, 8, 16).translate(0, 9.6, 0), gold));
    for (let k = 0; k < 26; k++) parts.push(paint(new THREE.TorusGeometry(0.45, 0.12, 5, 10).rotateY(k % 2 ? Math.PI / 2 : 0).translate(0, 10.6 + k * 0.82, 0), gold));
    return merge(parts);
  },
  // the easel at the door with the board on it (the words are the sign layer in front)
  easel() {
    const parts = [], gold = rgb(0xc8a050);
    for (const [x, rz, rx] of [[-5, 0.1, 0.1], [5, -0.1, 0.1], [0, 0, -0.25]]) { const l = box(0.5, 24, 0.5, 0, 12, 0); l.rotateZ(rz); l.rotateX(rx); l.translate(x, 0, rx < 0 ? -3 : 0.6); parts.push(paint(l, gold)); }
    parts.push(paint(box(21, 0.8, 1.6, 0, 9.6, 1.4), gold));
    parts.push(paint(box(19.6, 7, 0.4, 0, 13.6, 0.9), rgb(0x2a1a10)));
    for (const [w, h, x, y] of [[20.2, 0.6, 0, 17.3], [20.2, 0.6, 0, 9.9], [0.6, 7.4, -10.1, 13.6], [0.6, 7.4, 10.1, 13.6]]) parts.push(paint(box(w, h, 0.7, x, y, 1.1), gold));
    return merge(parts);
  },
  // a pendant lantern on its chain (the light is a glow)
  pendant() {
    const parts = [], iron = rgb(0x1a1418), glass = rgb(0xfff0d0);
    parts.push(paint(cyl(0.12, 0.12, 9, 5, 0, 4.5, 0), iron));
    parts.push(paint(new THREE.CylinderGeometry(1.4, 2.2, 1.0, 6).translate(0, -0.4, 0), iron));
    parts.push(paint(new THREE.CylinderGeometry(1.9, 1.5, 3.4, 6, 1, true).translate(0, -2.6, 0), glass));
    parts.push(paint(new THREE.CylinderGeometry(1.6, 0.4, 0.8, 6).translate(0, -4.7, 0), iron));
    return merge(parts);
  },
};

// ---------- the cemetery ----------
const CG = {
  // a row of five stones of different kinds, along x
  stones(v) {
    const parts = [], R = seeded(101 + v * 31);
    for (let k = 0; k < 5; k++) {
      const x = -11 + k * 5.4 + (R() - 0.5) * 1.2, z = (R() - 0.5) * 1.4, kind = Math.floor(R() * 5), sc = 0.9 + R() * 0.45;
      const c = rgb(pick(R, [0xc8c6cc, 0xa8a8b0, 0xe4e0d8, 0xb8b4ac, 0x8a8a92, 0xf0ece4]));
      const lean = (R() - 0.5) * 0.08, g = [];
      if (kind === 0) { g.push(box(2.2, 2.4, 0.5, 0, 1.2, 0)); g.push(cyl(1.1, 1.1, 0.5, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 2.4, 0)); }
      else if (kind === 1) { g.push(box(0.55, 4.2, 0.5, 0, 2.1, 0)); g.push(box(2.3, 0.55, 0.5, 0, 3.0, 0)); g.push(box(1.6, 0.5, 1.2, 0, 0.25, 0)); }
      else if (kind === 2) { g.push(box(1.4, 1.2, 1.4, 0, 0.6, 0)); const o = new THREE.CylinderGeometry(0.35, 0.65, 5.2, 4); o.rotateY(Math.PI / 4); o.translate(0, 3.8, 0); g.push(o); g.push(new THREE.ConeGeometry(0.5, 0.8, 4).rotateY(Math.PI / 4).translate(0, 6.8, 0)); }
      else if (kind === 3) { g.push(box(2.6, 1.3, 0.9, 0, 0.65, 0)); g.push(box(2.8, 0.3, 1.1, 0, 1.4, 0)); }
      else { g.push(box(1.8, 2.8, 0.45, 0, 1.4, 0)); g.push(new THREE.CylinderGeometry(0.01, 1.3, 0.9, 4).rotateY(Math.PI / 4).scale(1, 1, 0.35).translate(0, 3.2, 0)); }
      for (const p of g) { p.scale(sc, sc, sc); p.rotateZ(lean); p.translate(x, 0, z); parts.push(paint(p, c)); }
    }
    return merge(parts);
  },
  // a cypress: tall and narrow and nearly black
  cypress() {
    const parts = [], R = seeded(7);
    parts.push(paint(cyl(0.3, 0.45, 3, 6, 0, 1.5, 0), rgb(0x3a2a1e)));
    for (let k = 0; k < 7; k++) { const y = 3 + k * 2.2, r = 2.2 * Math.sin(Math.PI * (0.15 + 0.8 * (k + 0.5) / 7)) + 0.3; parts.push(paint(sph(1, r, 2.0, r, (R() - 0.5) * 0.4, y + 1, (R() - 0.5) * 0.4, 8, 6), rgb(0x1e3a24))); }
    parts.push(paint(new THREE.ConeGeometry(0.8, 3, 7).translate(0, 19.2, 0), rgb(0x1e3a24)));
    return merge(parts);
  },
  // a mausoleum: steps, four columns, the pediment, the bronze doors (front at +z)
  mausoleum() {
    const parts = [], stone = rgb(0xb8b2a8), dark = rgb(0x8a847a), bronze = rgb(0x3a3a24);
    for (let k = 0; k < 3; k++) parts.push(paint(box(14 - k * 0.8, 0.6, 14 - k * 0.8, 0, 0.3 + k * 0.6, 0.6), dark));
    parts.push(paint(box(11, 9, 11, 0, 6.3, -0.4), stone));
    for (const x of [-4.2, -1.6, 1.6, 4.2]) parts.push(paint(cyl(0.55, 0.65, 8.2, 12, x, 5.9, 5.6), rgb(0xc8c2b8)));
    parts.push(paint(box(12, 1.2, 12.6, 0, 10.6, 0.2), dark));
    const ped = new THREE.CylinderGeometry(0.01, 6.6, 3, 3, 1); ped.rotateZ(Math.PI / 2); ped.rotateY(Math.PI / 2); ped.scale(1, 1, 0.42); ped.rotateY(Math.PI / 2); ped.translate(0, 12.6, 0.2);
    parts.push(paint(ped, stone));
    parts.push(paint(box(3.6, 6.4, 0.3, 0, 5, 5.14), bronze));
    parts.push(paint(box(0.12, 6.4, 0.34, 0, 5, 5.2), rgb(0x1a1a10)));
    return merge(parts);
  },
  // an iron lamp post with a lantern (the light is a glow)
  lanternPost() { const parts = [], iron = rgb(0x141216); parts.push(paint(cyl(0.12, 0.18, 6, 6, 0, 3, 0), iron)); parts.push(paint(new THREE.CylinderGeometry(0.55, 0.4, 1.1, 6, 1, true).translate(0, 6.6, 0), rgb(0xffe0a0))); parts.push(paint(new THREE.ConeGeometry(0.75, 0.6, 6).translate(0, 7.45, 0), iron)); return merge(parts); },
  // an iron fence, one length of it along z, spear-topped
  fence() { const parts = [], iron = rgb(0x121014); for (const y of [0.5, 2.4]) parts.push(paint(box(0.12, 0.12, 9, 0, y, 0), iron)); for (let k = 0; k < 19; k++) { const z = -4.4 + k * 0.49; parts.push(paint(box(0.08, 2.9, 0.08, 0, 1.45, z), iron)); parts.push(paint(new THREE.ConeGeometry(0.12, 0.45, 4).translate(0, 3.1, z), iron)); } return merge(parts); },
  // the gate: two stone piers and an iron arch between them over the road (span 2W, at height H)
  gate(W = 22, H = 26) {
    const parts = [], stone = rgb(0x9a948a), iron = rgb(0x121014);
    for (const s of [-1, 1]) {
      parts.push(paint(box(4, H, 4, s * W, H / 2, 0), stone));
      parts.push(paint(box(5, 1.4, 5, s * W, H + 0.7, 0), rgb(0x7a746a)));
      parts.push(paint(new THREE.SphereGeometry(1.6, 12, 10).translate(s * W, H + 2.9, 0), stone));
    }
    // the arch: two iron bands, a third of a circle, bars between, a scroll at the top
    const R = W * 1.25, cy = H - R * Math.cos(Math.asin(W / R)) + 0;
    for (const band of [0, 2.2]) for (let k = 0; k < 40; k++) {
      const a0 = -Math.asin(W / R) + (k / 40) * 2 * Math.asin(W / R), a1 = -Math.asin(W / R) + ((k + 1) / 40) * 2 * Math.asin(W / R);
      const p0 = new THREE.Vector3(Math.sin(a0) * R, cy + Math.cos(a0) * R + band, 0), p1 = new THREE.Vector3(Math.sin(a1) * R, cy + Math.cos(a1) * R + band, 0);
      const d = p1.clone().sub(p0); const s = box(0.3, d.length() + 0.05, 0.3, 0, d.length() / 2, 0); s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); s.translate(p0.x, p0.y, p0.z); parts.push(paint(s, iron));
      if (band === 0 && k % 2 === 0) parts.push(paint(box(0.18, 2.2, 0.18, p0.x, p0.y + 1.1, 0), iron));
    }
    for (const s of [-1, 1]) { const sc = new THREE.TorusGeometry(1.4, 0.18, 6, 20, Math.PI * 1.6); sc.translate(s * 2.2, cy + R + 3.6, 0); parts.push(paint(sc, iron)); }
    // the gates themselves, swung open against the piers
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) parts.push(paint(box(0.14, 9, 0.14, s * (W - 2.6), 4.5, 1.4 + k * 0.8), iron));
    return merge(parts);
  },
  // the open grave: the hole, the mound of dirt, a shovel stuck in it, the boards
  grave() {
    const parts = [], dirt = rgb(0x3a2a1a), R = seeded(17);
    parts.push(paint(box(5.2, 0.2, 10, 0, 0.02, 0), rgb(0x050403)));
    for (const s of [-1, 1]) parts.push(paint(box(0.8, 0.3, 11, s * 3.0, 0.15, 0), rgb(0x6a5a40)));
    const m = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); const p = m.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const k = 1 + 0.18 * (Math.sin(p[i] * 7 + p[i + 2] * 5) + Math.sin(p[i + 2] * 9)) * 0.5; p[i] *= k; p[i + 2] *= k; p[i + 1] *= 0.9 + 0.2 * R(); }
    m.computeVertexNormals(); m.scale(4.2, 5.4, 7.5); m.translate(-8.2, 0, 0); parts.push(paint(m, dirt));
    for (let k = 0; k < 18; k++) parts.push(paint(sph(0.5 + R() * 0.5, 1, 0.7, 1, -8.2 + (R() - 0.5) * 9, 0.2, (R() - 0.5) * 15, 6, 4), rgb(0x2e2014)));
    const sh = [box(0.3, 7, 0.3, 0, 3.5, 0), box(1.6, 2.2, 0.15, 0, -0.6, 0), box(1.2, 0.3, 0.3, 0, 7.1, 0)];
    for (const g of sh) { g.rotateZ(0.32); g.rotateX(-0.15); g.translate(-7.4, 4.2, 2); parts.push(paint(g, g === sh[1] ? rgb(0x8a8a90) : rgb(0x5a3a1e))); }
    for (let k = 0; k < 6; k++) { const f = rose(1.2, k % 2 ? 0xd0102a : 0xf6f2ec); f.translate(3.6 + (k % 2) * 0.6, 0.3, -3 + k * 1.2); parts.push(f); }
    return merge(parts);
  },
  // a big headstone near the road for the name: a slab with a rounded top and a base
  bigStone() { const parts = [], c = rgb(0xb8b4bc); parts.push(paint(box(12, 2.2, 5, 0, 1.1, 0), rgb(0x8a868e))); parts.push(paint(box(9, 11, 2, 0, 7.6, 0), c)); parts.push(paint(cyl(4.5, 4.5, 2, 32, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 13.1, 0), c)); return merge(parts); },
  // the white chapel's flower arch and altar for the end
  arch() {
    const parts = [], R = seeded(61);
    for (let k = 0; k <= 60; k++) {
      const a = Math.PI * (k / 60), x = Math.cos(a) * 12, y = 14 + Math.sin(a) * 12;
      const f = k % 3 ? rose(1.4 + R() * 0.6, pick(R, [0xf6f2ec, 0xfff4f0, 0xf8e4e8])) : lily(1.3, 0xfbf8f2);
      f.rotateX(Math.PI / 2 + (R() - 0.5) * 0.6); f.translate(x + (R() - 0.5), y + (R() - 0.5), 0.6 + (R() - 0.5)); parts.push(f);
      if (k % 2) parts.push(leaf(1.4, x, y, 0.2, R() * 6, (R() - 0.5) * 3, 0x4a7a3a));
    }
    for (const s of [-1, 1]) for (let k = 0; k < 14; k++) { const f = rose(1.5, pick(R, [0xf6f2ec, 0xf8e4e8])); f.translate(s * 12 + (R() - 0.5) * 1.6, k * 1.05, 0.6 + (R() - 0.5)); parts.push(f); }
    parts.push(paint(box(14, 8, 6, 0, 4, -2), rgb(0xf4f0ea)));
    parts.push(paint(box(14.6, 0.4, 6.6, 0, 8.1, -2), rgb(0xd8b060)));
    return merge(parts);
  },
};

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const TT = { aTint: 3 };
let BOOK_TEX = null;
function bookTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#f2ead8'; g.fillRect(0, 0, 1024, 640);
  g.fillStyle = '#d8ccb0'; g.fillRect(506, 0, 12, 640);
  const R = seeded(3);
  g.strokeStyle = '#a8b0c8'; g.lineWidth = 2;
  for (const x0 of [40, 556]) for (let k = 0; k < 13; k++) { g.beginPath(); g.moveTo(x0, 70 + k * 44); g.lineTo(x0 + 430, 70 + k * 44); g.stroke(); }
  // names in a dozen hands
  g.strokeStyle = '#1a1a3a'; g.lineWidth = 3;
  for (const x0 of [50, 566]) for (let k = 0; k < 12; k++) {
    if (x0 > 500 && k > 6) break;
    let x = x0 + R() * 30, y = 62 + k * 44;
    g.beginPath(); g.moveTo(x, y);
    const n = 14 + Math.floor(R() * 18);
    for (let i = 0; i < n; i++) { x += 9 + R() * 6; g.quadraticCurveTo(x - 6, y - 14 * R(), x, y - 4 + 8 * R()); }
    g.stroke();
  }
  // and under them, her lips
  g.save(); g.translate(760, 470); g.rotate(-0.12); g.fillStyle = '#c8102a';
  g.beginPath(); g.moveTo(-120, 0); g.bezierCurveTo(-70, -60, -20, -40, 0, -22); g.bezierCurveTo(20, -40, 70, -60, 120, 0); g.bezierCurveTo(60, -6, -60, -6, -120, 0); g.fill();
  g.beginPath(); g.moveTo(-120, 6); g.bezierCurveTo(-60, 12, 60, 12, 120, 6); g.bezierCurveTo(70, 80, -70, 80, -120, 6); g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function bookGeometry() {
  const g = new THREE.PlaneGeometry(13, 8.2, 24, 1), p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) p[i + 2] = 0.6 * Math.sin(Math.PI * Math.abs(p[i]) / 6.5);
  g.computeVertexNormals(); g.rotateX(-Math.PI / 2); g.rotateX(0.42); g.translate(0, 8.1, 0.2);
  return g;
}

extend({
  layers: {
    casket: (M) => [FG.casket(), VC(M, 'fhGloss', { roughness: 0.32, metalness: 0.1, emissive: 0x0a0606 }), 3, {}],
    barTable: (M) => [FG.barTable(), VC(M, 'fhGloss', { roughness: 0.32, metalness: 0.1, emissive: 0x0a0606 }), 3, {}],
    coupes: (M) => [FG.coupes(false), VC(M, 'fhGlass', { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.7, emissive: 0x2a2a30 }), 3, {}],
    bubbly: (M) => [FG.coupes(true), M.bubblyM || (M.bubblyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd27a).multiplyScalar(1.6) })), 3, {}],
    lipstick: (M) => [FG.lipstick(), VC(M, 'fhLip', { roughness: 0.22, metalness: 0.35, emissive: 0x3a0c10 }), 3, {}],
    fhPin: (M) => [FG.pin(), VC(M, 'fhShiny', { roughness: 0.18, metalness: 0.45, emissive: 0x100406 }), 3, {}],
    fhBubble: (M) => [FG.bubble(), VC(M, 'fhMatte', { roughness: 0.6, metalness: 0, emissive: 0x2a2a2e }), 3, {}],
    likeHeart: (M) => [FG.heart(), VC(M, 'fhHeart', { roughness: 0.25, metalness: 0.1, emissive: 0x6a0a14 }), 40, {}],
    tissues: (M) => [FG.tissues(), VC(M, 'fhMatte', { roughness: 0.6, metalness: 0, emissive: 0x2a2a2e }), 6, {}],
    mascara: (M) => [FG.mascara(), VC(M, 'fhShiny', { roughness: 0.18, metalness: 0.45, emissive: 0x100406 }), 3, {}],
    lectern: (M) => [FG.lectern(), VC(M, 'fhGloss', { roughness: 0.32, metalness: 0.1, emissive: 0x0a0606 }), 3, {}],
    prepTable: (M) => [FG.prepTable(), VC(M, 'fhSteel', { roughness: 0.3, metalness: 0.3, emissive: 0x1a2024 }), 3, {}],
    prepLamp: (M) => [FG.prepLamp(), VC(M, 'fhSteel', { roughness: 0.3, metalness: 0.3, emissive: 0x1a2024 }), 3, {}],
    bookStand: (M) => [FG.bookStand(), VC(M, 'fhGloss', { roughness: 0.32, metalness: 0.1, emissive: 0x0a0606 }), 3, {}],
    book: (M) => [bookGeometry(), M.bookM || (M.bookM = new THREE.MeshStandardMaterial({ map: (BOOK_TEX = BOOK_TEX || bookTexture()), emissiveMap: BOOK_TEX, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.85, side: THREE.DoubleSide })), 3, {}],
    bouquet: (M) => [FG.bouquet(), VC(M, 'fhBouquet', { roughness: 0.6, metalness: 0, emissive: 0x6a6460 }), 3, {}],
    wreath: (M) => [FG.wreath(), VC(M, 'fhFlower', { roughness: 0.7, metalness: 0, emissive: 0x1a1816 }), 40, {}],
    pew: (M) => [FG.pew(), M.wood, 260, TT],
    pewBow: (M) => [FG.pewBow(), M.cloth, 260, TT],
    candelabra: (M) => [FG.candelabra(), VC(M, 'fhCandle', { roughness: 0.3, metalness: 0.35, emissive: 0x2a1a08 }), 20, {}],
    urn: (M) => [FG.urn(), VC(M, 'fhShiny', { roughness: 0.18, metalness: 0.45, emissive: 0x100406 }), 3, {}],
    locket: (M) => [FG.locket(), VC(M, 'fhGold', { roughness: 0.3, metalness: 0.35, emissive: 0x7a5a14 }), 3, {}],
    easel: (M) => [FG.easel(), VC(M, 'fhGloss', { roughness: 0.32, metalness: 0.1, emissive: 0x0a0606 }), 10, {}],
    easelFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.4, 2.6, 1); g.translate(0, 13.6, 1.15); return g; })(), M.sign, 10, { aIdx: 1, aWake: 2 }],
    pendant: (M) => [FG.pendant(), VC(M, 'fhLamp', { roughness: 0.4, metalness: 0.2, emissive: 0x6a5030 }), 60, {}],
    stones0: (M) => [CG.stones(0), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 700, {}],
    stones1: (M) => [CG.stones(1), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 700, {}],
    stones2: (M) => [CG.stones(2), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 700, {}],
    cypress: (M) => [CG.cypress(), VC(M, 'fhTree', { roughness: 0.95, metalness: 0, flatShading: true }), 700, {}],
    mausoleum: (M) => [CG.mausoleum(), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 40, {}],
    lanternPost: (M) => [CG.lanternPost(), VC(M, 'fhLamp', { roughness: 0.4, metalness: 0.2, emissive: 0x6a5030 }), 260, {}],
    ironFence: (M) => [CG.fence(), VC(M, 'fhIron', { roughness: 0.5, metalness: 0.5 }), 400, {}],
    gate: (M) => [CG.gate(), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 3, {}],
    grave: (M) => [CG.grave(), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 3, {}],
    bigStone: (M) => [CG.bigStone(), VC(M, 'fhStone', { roughness: 0.92, metalness: 0, emissive: 0x060608 }), 3, {}],
    bigStoneFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(1.1, 1.3, 1); g.translate(0, 9.4, 1.03); return g; })(), M.sign, 3, { aIdx: 1, aWake: 2 }],
    arch: (M) => [CG.arch(), VC(M, 'fhFlower', { roughness: 0.7, metalness: 0, emissive: 0x1a1816 }), 2, {}],
    fhFlag: (M) => [(() => { const p = [box(0.06, 1.0, 0.06, 0, 0.5, 0), box(0.02, 0.36, 0.5, 0, 0.82, 0.26)]; return merge(p); })(), M.cloth, 120, TT],
  },
  parts: {
    casket(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.casket.add(m); glowAt(S, p.x, p.y + 18, p.z, 30, [1, 0.92, 0.85], 0.25); },
    bar(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.barTable.add(m); S.layers.coupes.add(m); S.layers.bubbly.add(m);
      const w = local(p, yaw, 0.4, 17, -7.5, S._o); glowAt(S, w.x, w.y, w.z, 22, [1, 0.82, 0.45], 0.55);
    },
    lipstick(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.lipstick.add(m); },
    pin(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.fhPin.add(m);
      // the label beside it, turned to the road coming up
      const w = local(p, yaw, 0, 9.4 * s, 0, S._o);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const lw = S._lw || (S._lw = new THREE.Vector3()); lw.copy(w); lw.y += 7.5 * s;
      m.compose(lw, fq, S._s.set(1.6 * s, 1.6 * s, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [1, 0] });
    },
    // the bubble with its count, the hearts going up behind it
    likes(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.fhBubble.add(m);
      const w = local(p, yaw, 0, 20 * s, 0.75 * s, S._o); m.compose(w, q, S._s.set(2.9 * s, 2.9 * s, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const age = (S.tNow ?? 0) - (it.t - 3.5);
      for (let k = 0; k < 18; k++) {
        const ph = ((age * 0.55 + k / 18) % 1 + 1) % 1, a = k * 2.39;
        const hp = local(p, yaw, Math.cos(a) * (3 + ph * 7) * s, (24 + ph * 26) * s, (-3 + Math.sin(a) * 4) * s, S._lw || (S._lw = new THREE.Vector3()));
        const sc = (1.6 + (k % 3) * 0.5) * s * Math.sin(Math.PI * Math.min(1, ph * 1.4));
        S._e.set(0, yaw + Math.sin(age * 2 + k) * 0.6, Math.sin(age * 1.6 + k) * 0.25); const hq = (S._q5 || (S._q5 = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(hp, hq, S._s.set(sc, sc, sc)); S.layers.likeHeart.add(m);
      }
    },
    tissues(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.tissues.add(m); },
    mascara(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.mascara.add(m); },
    lectern(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.lectern.add(m);
      // the spot on it, from up in the dark
      glowAt(S, p.x, p.y + 17, p.z, 12, [1, 0.94, 0.8], 0.8); poolAt(S, p.x, p.y + 0.1, p.z, 26, [1, 0.92, 0.75], 0.9);
    },
    prepTable(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.prepTable.add(m);
      S._o.copy(p); S._o.y += 24; m.compose(S._o, q, S._s.set(1, 1, 1)); S.layers.prepLamp.add(m);
      glowAt(S, p.x, p.y + 23.3, p.z, 14, [0.92, 1, 0.98], 0.9); poolAt(S, p.x, p.y + 0.1, p.z, 34, [0.85, 1, 0.95], 0.8);
    },
    guestbook(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bookStand.add(m); S.layers.book.add(m); glowAt(S, p.x, p.y + 16 * s, p.z, 14 * s, [1, 0.9, 0.7], 0.35); },
    // the mourning bouquet, thrown: from the far side, over the road, turning
    bouquet(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, u = clamp((T - it.t0) / (it.t1 - it.t0), 0, 1), layer = S.layers.bouquet;
      if (!S.track || T < it.t0 - 4 || T > it.t1 + 0.6) return;
      const x = it.xFrom + (it.xTo - it.xFrom) * u, sag = Math.sin(Math.PI * u);
      const g = S.track.ground(it.t, x, S._o); const y = S.course.sample(it.t).y + it.lift + sag * it.arc - (u >= 1 ? (T - it.t1) * 30 : 0);
      g.y = Math.max(y, it.h + 1);
      S._e.set(u * 5.2, yaw + u * 3, u * 2.1); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m; m.compose(g, bq, S._s.set(it.s, it.s, it.s)); S.layers.bouquet.add(m);
    },
    wreath(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.wreath.add(m); },
    pew(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.pew.add(m, { aTint: it.tint }); const bows = S.layers.pewBow; if (it.bow) { local(p, S.course.sample(it.t).yaw + (it.rot || 0), (it.x > 0 ? 13.3 : -13.3) * s, 0, 2.6 * s, S._o); m.compose(S._o, q, S._s.set(s, s, s)); S.layers.pewBow.add(m, { aTint: [1, 0.66, 0.74] }); } },
    candelabra(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.candelabra.add(m);
      const fl = 0.85 + 0.15 * Math.sin((S.tNow ?? 0) * 13 + it.seed * 40), k = (it.lit ?? 1) * fl;
      for (let j = -2; j <= 2; j++) { const w = local(p, yaw, j * 1.6 * s, 19.1 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 2.6 * s, [1, 0.72, 0.36], 1.4 * k); }
      glowAt(S, p.x, p.y + 18 * s, p.z, 16 * s, [1, 0.68, 0.32], 0.3 * k); poolAt(S, p.x, p.y + 0.1, p.z, 24 * s, [1, 0.66, 0.3], 0.5 * k);
    },
    easel(S, it, p, q) {
      if (S.floorFn) p.y = S.floorFn(it.t, it.x);
      const fq = faceRoad(S, it);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.easel.add(m); S.layers.easelFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const by = new THREE.Euler().setFromQuaternion(fq, 'YXZ').y;
      const w = local(p, by, 0, 19 * s, 3 * s, S._o); glowAt(S, w.x, w.y, w.z, 10 * s, [1, 0.9, 0.75], 0.35);
    },
    // headstones in a row, on the cemetery's ground
    stones(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers['stones' + it.v].add(m); },
    cypress(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers.cypress.add(m); },
    mausoleum(S, it, p, q, yaw) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.mausoleum.add(m); const w = local(p, yaw, 0, 10.2 * s, 6.2 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.6, [1, 0.75, 0.4], 0.9 + 0.8 * it.wakeNow); },
    lanternPost(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.lanternPost.add(m); glowAt(S, p.x, p.y + 6.7, p.z, 3.4, [1, 0.78, 0.42], 0.8 + 0.9 * it.wakeNow, S.beatLamps ? 4 : 0); poolAt(S, p.x, p.y + 0.06, p.z, 12, [1, 0.72, 0.4], 0.4 + 0.5 * it.wakeNow); },
    ironFence(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.ironFence.add(m); },
    gate(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.sy, 1)); S.layers.gate.add(m);
      for (const s of [-1, 1]) { const w = local(p, S.course.sample(it.t).yaw, s * 22 * it.s, 26 * it.sy + 4, 0, S._o); glowAt(S, w.x, w.y, w.z, 5, [1, 0.75, 0.4], 1.2); }
    },
    grave(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.grave.add(m); },
    bigStone(S, it, p, q) { const fq = faceRoad(S, it), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.bigStone.add(m); if (it.idx !== undefined) S.layers.bigStoneFace.add(m, { aIdx: it.idx, aWake: [0.7, 0] }); },
    locket(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, sw = Math.sin(T * 1.3) * 0.12;
      S._e.set(sw * 0.4, yaw + Math.PI + Math.sin(T * 0.7) * 0.4, sw); const lq = (S._q7 || (S._q7 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, lq, S._s.set(s, s, s)); S.layers.locket.add(m);
      glowAt(S, p.x, p.y + 8 * s, p.z, 12 * s, [1, 0.85, 0.5], 0.45);
    },
    urn(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.urn.add(m); },
    // a parked car with a purple flag on it: in the procession
    flagCar(S, it, p, q, yaw) { PARTS.parked(S, it, p, q); const w = local(p, yaw, 0.7, 1.35, 1.6, S._o); S._m.compose(w, q, S._s.set(1, 1, 1)); S.layers.fhFlag.add(S._m, { aTint: [0.42, 0.16, 0.62] }); },
  },
  kits: {
    // the street of old houses at dusk, cars from the procession along the curb
    fhstreet(S, z, R) {
      const tints = [0x8a9a86, 0x6a7a8a, 0xb8a888, 0x8a5a5a, 0xa89a7a, 0x7a6a7a, 0xc8b8a0];
      const roofs = [0x2a2830, 0x3a2a2a, 0x2a3036];
      const greens = [[0.9, 1, 0.9], [1, 1, 0.85], [0.85, 0.95, 0.9]];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.48 + R() * 0.2) {
          S.items.push(onGround(S, { t, x: side * (22 + R() * 4), rot: SIDE(side), s: 1.2 + R() * 0.3, parts: 'house', tint: col(pick(R, tints)), roofTint: col(pick(R, roofs)), seed: R(), wake0: 0.35, porch: true }));
          if (R() < 0.7) S.items.push(onGround(S, { t: t + 0.2, x: side * (15.5 + R() * 2), rot: SIDE(side) + (R() - 0.5) * 0.06, s: 1.0 + R() * 0.3, sy: 1.1 + R() * 0.3, parts: 'oak', tint: pick(R, greens), ahead: 30 }));
          if (R() < 0.55) S.items.push(onGround(S, { t: t + 0.1, x: side * 12.4, rot: SIDE(side) + Math.PI / 2, parts: 'flagCar', tint: col(pick(R, [0x1a1a20, 0x2a2a34, 0x3a3a44, 0x14141a, 0x6a6a74])) }));
          if (R() < 0.6) S.items.push(onGround(S, { t: t + R() * 0.3, x: side * (40 + R() * 16), rot: SIDE(side), s: 1.1 + R() * 0.3, parts: 'house', tint: col(pick(R, tints)), roofTint: col(pick(R, roofs)), seed: R(), wake0: 0.3 }));
        }
      }
      for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * 10.5, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.8 }));
    },
    // the letter board out front, on its posts
    letterboard(S, z, R) { S.items.push(onGround(S, { t: z.at, x: z.x ?? 18, s: z.s ?? 1.5, parts: 'sign', idx: S.atlas.index[z.sign], seed: 0.5, wake0: 1, keepLit: true })); },
    // rows of pews either side of the aisle; for the wedding, a white bow on every aisle end
    pews(S, z, R) {
      const clear = z.clear || [];
      for (let t = z.from; t < z.to; t += z.every ?? 0.24) for (const side of [-1, 1]) {
        if (clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
        S.items.push(onGround(S, { t, x: side * 25, rot: 0, s: 0.75, parts: 'pew', tint: z.white ? [0.92, 0.9, 0.86] : [0.42, 0.26, 0.16], bow: z.white, ahead: z.ahead }));
      }
    },
    wreaths(S, z, R) { let k = 0; for (let t = z.from + 0.2; t < z.to; t += z.every ?? 0.9) { const side = k++ % 2 ? 1 : -1; S.items.push(onGround(S, { t, x: side * (z.x ?? 36), rot: FACE(side), parts: 'wreath', s: z.s ?? 1, ahead: z.ahead })); } },
    candles(S, z, R) { for (const t of [].concat(z.at)) for (const side of z.sides || [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 20), rot: 0, s: z.s ?? 1, parts: 'candelabra', seed: R(), lit: z.lit ?? 1, ahead: z.ahead })); },
    casket(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: ALONG(z.x), parts: 'casket', ahead: z.ahead })); },
    bar(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: ALONG(z.x), parts: 'bar', ahead: z.ahead })); },
    lipstick(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: z.rot ?? 0.5, s: z.s ?? 1.7, parts: 'lipstick', ahead: z.ahead })); },
    pin(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, s: z.s ?? 1, h: S.course.sample(z.at).y + (z.lift ?? 6), idx: S.atlas.index[z.sign], parts: 'pin', ahead: z.ahead }); },
    likes(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x), s: z.s ?? 1, idx: S.atlas.index[z.sign], parts: 'likes', ahead: z.ahead })); },
    tissues(S, z, R) { for (const [t, x] of z.at) S.items.push(onGround(S, { t, x, rot: (R() - 0.5) * 0.8, s: z.s ?? 1, parts: 'tissues', ahead: z.ahead })); },
    mascara(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: z.rot ?? -0.6, s: z.s ?? 1, parts: 'mascara', ahead: z.ahead })); },
    lectern(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x), s: z.s ?? 1, parts: 'lectern', ahead: z.ahead })); },
    prepTable(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: ALONG(z.x), parts: 'prepTable', ahead: z.ahead })); },
    guestbook(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x), s: z.s ?? 1, parts: 'guestbook', ahead: z.ahead })); },
    bouquet(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, h: floorAt(S.course, z.at), t0: z.t0, t1: z.t1, xFrom: z.xFrom ?? -30, xTo: z.xTo ?? 34, lift: z.lift ?? 5, arc: z.arc ?? 12, s: z.s ?? 2.6, parts: 'bouquet', ahead: z.ahead ?? 8 }); },
    locket(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, h: S.course.sample(z.at).y + (z.lift ?? 3), parts: 'locket', ahead: z.ahead }); },
    // the cemetery: rows of stones on the lawns either side, cypresses, the odd mausoleum, lanterns on the path
    graves(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      const clear = (z.clear || []);
      const open = (t, side) => !clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.1; t < z.to; t += 0.17 + R() * 0.05) {
          for (const x0 of [19, 46]) {
            if (x0 === 19 && !open(t, side)) continue;
            if (R() < 0.12) continue;
            const x = side * (x0 + 14 + (R() - 0.5) * 4);
            S.items.push(onGround(S, { t, x, rot: SIDE(side) + (R() - 0.5) * 0.08, parts: 'stones', v: Math.floor(R() * 3), ahead: x0 > 30 ? 36 : 26 }));
          }
        }
        for (let t = z.from + R() * 0.4; t < z.to; t += 0.3 + R() * 0.5) {
          const near = R() < 0.4, x = side * (near ? 15 + R() * 3 : 70 + R() * 90);
          if (near && !open(t, side)) continue;
          S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: 0.9 + R() * 0.5, sy: 0.9 + R() * 0.4, parts: 'cypress', ahead: 40 }));
        }
        for (let t = z.from + 0.8 + R(); t < z.to; t += 2.2 + R() * 2) { if (!open(t, side)) continue; S.items.push(onGround(S, { t, x: side * (36 + R() * 14), rot: SIDE(side) + (R() - 0.5) * 0.3, s: 1 + R() * 0.35, parts: 'mausoleum', seed: R(), wake0: 0.3, ahead: 40 })); }
        for (let t = z.from; t < z.to; t += 0.55) S.items.push(onGround(S, { t, x: side * 11.5, rot: 0, parts: 'lanternPost', seed: R(), wake0: 0.4 }));
        if (z.fence) for (let t = z.from; t < z.to; t += 0.2) { if (!open(t, side)) continue; S.items.push(onGround(S, { t, x: side * 14.5, rot: 0, parts: 'ironFence', ahead: 20 })); }
      }
    },
    // the gate: wide enough for the road, tall enough to clear the ribbon here
    fhgate(S, z) {
      const c = S.course; prepare(c, S.plan);
      const g = groundAt(c, z.at, 0), y = c.sample(z.at).y;
      const sy = Math.max(1, (y - g + 14) / 26);
      S.items.push({ t: z.at, x: 0, rot: 0, h: g, s: z.s ?? 1, sy, parts: 'gate', ahead: 40 });
    },
    grave(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: ALONG(z.x) + Math.PI / 2 * 0, s: z.s ?? 1.4, parts: 'grave', ahead: z.ahead ?? 30 })); },
    bigStone(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, s: z.s ?? 1.2, idx: z.sign ? S.atlas.index[z.sign] : undefined, parts: 'bigStone', ahead: z.ahead ?? 30 })); },
  },
});

// a panel facing the rider coming up the road, turned a little toward the road
function faceRoad(S, it) {
  const h = S.course.sample(it.t).yaw;
  S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0);
  return (S._q8 || (S._q8 = new THREE.Quaternion())).setFromEuler(S._e);
}

// ---------- the rooms ----------
// chapel: walls and a pitched ceiling; flat: walls and a flat one
const chapelRing = (W = 42, H = 30, V = 16) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [W * 0.5, H + V * 0.5, 1, 3], [0, H + V, 1, 3], [-W * 0.5, H + V * 0.5, 1, 3], [-W, H, 1, 3],
];
const flatRing = (W = 40, H = 30) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const FUNERAL = {
  rings: { chapel: chapelRing, flat: flatRing },
  ringOf: (s) => (s === 'chapel' || s === 'night' || s === 'wedding' ? 'chapel' : 'flat'),
  styles: { chapel: 0, parlor: 1, prep: 2, hall: 3, foyer: 4, night: 5, wedding: 6 },
  dims: { chapel: [42, 30, 16], night: [42, 30, 16], wedding: [42, 30, 16], parlor: [40, 30], foyer: [42, 32], prep: [34, 26], hall: [20, 28] },
  // pendants in the chapels, a ring of globes in the parlours, tubes in the prep room, sconces in the hall
  lights: (id) => ({ 0: [44, 22], 1: [56, 28], 2: [20, 10], 3: [22, 11], 4: [56, 28], 6: [44, 22] }[id] || null),
};

function funeralMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc070) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color(0x0a0414) }, uSkyLow: { value: new THREE.Color(0x2a1030) },
      uMoon: { value: new THREE.Color(0x9ab0ff) }, uBeam: { value: new THREE.Vector3(0, 0, -1e5) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow, uMoon, uBeam;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      // a flower in tone on a 5 x 7 m repeat (carpets and paper)
      float floral(vec2 p){
        vec2 q = p / vec2(5.0, 7.0); q.x += 0.5 * mod(floor(q.y), 2.0);
        vec2 g = (fract(q) - 0.5) * vec2(5.0, 7.0);
        float a = atan(g.y, g.x), r = length(g);
        float petal = 1.2 + 0.45 * cos(a * 5.0);
        float m = smoothstep(petal + 0.1, petal - 0.1, r) * smoothstep(0.2, 0.45, r);
        float leafA = smoothstep(0.5, 0.35, length((abs(g) - vec2(1.6, 2.2)) * vec2(1.0, 0.6)));
        return clamp(m + leafA * 0.7, 0.0, 1.0);
      }
      // a pointed window's shape: x across from its middle, y up from its sill
      float lancet(float x, float y, float hw, float hh){
        float body = step(abs(x), hw) * step(0.0, y) * step(y, hh);
        float a = clamp((y - hh) / (hw * 1.4), 0.0, 1.0);
        float top = step(abs(x), hw * pow(1.0 - a, 0.55)) * step(hh, y) * step(y, hh + hw * 1.4);
        return max(body, top);
      }
      // stained glass: lead in diamonds, jewel colours, a rose of gold near the top
      vec3 glass(vec2 q, float seed, float bright, bool pale){
        vec2 d = vec2(q.x + q.y, q.y - q.x) / 2.1;
        vec2 c = floor(d), f = fract(d);
        float lead = 1.0 - smoothstep(0.03, 0.08, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        float k = h2(c + seed);
        vec3 jewel = k < 0.25 ? vec3(0.12, 0.2, 0.78) : (k < 0.45 ? vec3(0.72, 0.06, 0.12) : (k < 0.62 ? vec3(0.95, 0.6, 0.12) : (k < 0.8 ? vec3(0.1, 0.5, 0.26) : vec3(0.5, 0.16, 0.66))));
        float rose = smoothstep(2.4, 2.0, length(q - vec2(0.0, 13.0)));
        jewel = mix(jewel, vec3(1.0, 0.82, 0.4), rose * 0.8);
        if (pale) jewel = mix(jewel, vec3(1.0, 0.96, 0.86), 0.62);
        return mix(jewel * bright * (0.8 + 0.4 * h2(c + 3.0)), vec3(0.02), lead);
      }
      vec2 fixture(float st){
        if (st < 0.5 || st > 5.5) return vec2(44.0, 22.0);
        if (st < 1.5 || (st > 3.5 && st < 4.5)) return vec2(56.0, 28.0);
        if (st < 2.5) return vec2(20.0, 10.0);
        if (st < 3.5) return vec2(22.0, 11.0);
        return vec2(0.0);
      }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        bool chapel = st < 0.5 || st > 4.5;
        bool night = st > 4.5 && st < 5.5;
        bool white = st > 5.5;
        vec3 col;
        vec2 fx = fixture(st);
        float dl = fx.x > 0.0 ? mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5 : 1e3;
        float lightK = fx.x > 0.0 ? 0.45 + 0.75 * exp(-dl * dl / (fx.x * fx.x * 0.12)) : 0.32;
        float wa = part == 6 ? x * 1.3 + 11.0 : (side > 0.0 ? along + 13.0 : along);
        bool onWall = part == 1 || part == 2;
        if (part == 8) {
          col = white ? vec3(0.95, 0.88, 0.7) : (st > 1.5 && st < 2.5 ? vec3(0.6, 0.63, 0.66) : (st > 0.5 && st < 1.5 || st > 3.5 && st < 4.5 ? vec3(0.82, 0.76, 0.66) : vec3(0.26, 0.14, 0.08)));
          col *= uLight;
        } else if (part == 7 && st > 4.5) {
          // the cemetery chapel's front: dressed stone, buttresses, a rose window over the door
          vec2 b = vec2(x / 4.2 + mod(floor(h / 2.2), 2.0) * 0.5, h / 2.2);
          vec3 stone = white ? vec3(0.86, 0.82, 0.74) : vec3(0.3, 0.32, 0.38);
          col = stone * (0.8 + 0.25 * h2(floor(b))) * (0.82 + 0.18 * step(0.05, fract(b.x)) * step(0.07, fract(b.y)));
          float bt = step(abs(mod(x + 30.0, 60.0) - 30.0), 3.0);
          col = mix(col, stone * 0.7, bt);
          float rr = length(vec2(x, h - 44.0));
          vec3 lit = night ? uMoon * 0.25 + uWarm * 0.5 : uWarm * 1.2;
          if (rr < 10.0) {
            float ang = atan(h - 44.0, x);
            float spokes = step(0.85, fract(ang / 6.2832 * 12.0 + 0.5)) * step(3.0, rr);
            vec3 gl = glass(vec2(x * 1.2, h), 3.0, 1.0, white) * (white ? 1.4 : 0.9) + lit * 0.3;
            col = mix(gl, stone * 0.5, max(spokes, step(9.0, rr) + step(rr, 2.6) * 0.4));
          }
          float wx = mod(x + 20.0, 40.0) - 20.0;
          float lw = lancet(wx, h - 12.0, 3.4, 12.0) * step(18.0, abs(x));
          col = mix(col, glass(vec2(wx, h - 12.0), floor((x + 20.0) / 40.0), 1.0, white) * (white ? 1.4 : 0.9) + lit * 0.2, lw);
          col *= uLight * 0.85;
          col += uWarm * exp(-max(h, 0.0) * 0.1) * 0.1;
        } else if (part == 7) {
          // the funeral home's front: white boards, tall windows lit warm, green shutters
          float bd = fract(h / 1.3);
          col = vec3(0.86, 0.84, 0.8) * (0.86 + 0.14 * smoothstep(0.0, 0.12, bd)) * (0.94 + 0.06 * n2(vec2(x * 0.1, h)));
          float fl = h < 33.0 ? 0.0 : 1.0;
          vec2 wc = vec2(mod(x + 11.0, 22.0) - 11.0, h - (fl > 0.5 ? 46.0 : 18.0));
          float win = step(box2(wc, vec2(3.6, 8.5)), 0.0) * step(abs(x), 200.0) * step(16.0, abs(x) - 4.0 * (1.0 - fl));
          float shut = (step(box2(wc - vec2(5.6, 0.0), vec2(1.7, 8.5)), 0.0) + step(box2(wc + vec2(5.6, 0.0), vec2(1.7, 8.5)), 0.0)) * step(16.0, abs(x) - 4.0 * (1.0 - fl));
          vec3 lit = uWarm * (1.0 + 0.3 * h2(vec2(floor((x + 11.0) / 22.0), fl))) * 1.15;
          lit = mix(lit, vec3(0.05), step(abs(wc.x), 0.25) + step(abs(wc.y), 0.25));
          col = mix(col, vec3(0.1, 0.22, 0.16) * (0.8 + 0.2 * aaSq(wc.y * 0.9)), clamp(shut, 0.0, 1.0));
          col = mix(col, lit, win);
          col = mix(col, vec3(0.7, 0.68, 0.64), step(abs(h - 33.0), 0.8) + step(abs(h - 3.0), 1.4));
          col *= uLight * 0.8;
          col += uWarm * exp(-max(h, 0.0) * 0.1) * 0.12;
        } else if (part == 0) {
          if (chapel) {
            // the chapel: plum carpet, the aisle runner (white for the wedding, with petals on it)
            col = white ? vec3(0.62, 0.54, 0.46) * (0.9 + 0.1 * n2(vec2(x, along) * 0.2)) : vec3(0.15, 0.06, 0.11) * (0.85 + 0.25 * n2(vec2(x, along) * 0.5));
            float run = step(abs(x), 12.0);
            vec3 rn = white ? vec3(0.97, 0.95, 0.92) : vec3(0.34, 0.04, 0.08) * (0.85 + 0.2 * n2(vec2(x, along) * 0.6));
            float bdr = step(10.2, abs(x)) * (0.55 + 0.45 * aaSq(along * 0.45 + abs(x) * 0.3));
            rn = mix(rn, white ? vec3(0.9, 0.82, 0.62) : vec3(0.22, 0.03, 0.05), bdr * 0.8);
            col = mix(col, rn, run);
            if (white) { vec2 pq = vec2(x, along) * 0.6; float pet = step(0.84, h2(floor(pq))) * smoothstep(0.42, 0.18, length(fract(pq) - 0.5)); col = mix(col, vec3(0.96, 0.6, 0.66), pet * 0.85); }
          } else if (st < 1.5) {
            col = vec3(0.36, 0.22, 0.24) * (0.88 + 0.14 * n2(vec2(x, along) * 0.4));
            col = mix(col, vec3(0.3, 0.38, 0.28), floral(vec2(x, along)) * 0.45);
          } else if (st < 2.5) {
            vec2 tq = vec2(x, along) / 2.4; vec2 tf = fract(tq);
            col = vec3(0.72, 0.74, 0.74) * (0.92 + 0.08 * h2(floor(tq)));
            col *= 0.7 + 0.3 * smoothstep(0.0, 0.04, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y)));
            vec2 dq = vec2(abs(x) - 15.0, mod(along, 20.0) - 10.0);
            col = mix(col, vec3(0.2, 0.22, 0.24) * (0.6 + 0.4 * aaSq(dq.y * 2.0)), step(box2(dq, vec2(1.4, 1.4)), 0.0));
          } else if (st < 3.5) {
            float id = floor(x / 2.2);
            col = vec3(0.16, 0.09, 0.05) * (0.8 + 0.3 * h2(vec2(id, 1.0)));
            col = mix(col, vec3(0.3, 0.06, 0.08) * (0.85 + 0.2 * n2(vec2(x, along) * 0.6)), step(abs(x), 8.0));
          } else {
            vec2 dq = vec2(x + along, along - x) / 9.0;
            float dark = aaChk(dq);
            col = mix(vec3(0.82, 0.78, 0.7), vec3(0.08, 0.07, 0.08), dark);
            col = mix(col, dark > 0.5 ? vec3(0.24, 0.22, 0.24) : vec3(0.6, 0.56, 0.5), smoothstep(0.03, 0.0, abs(n2(vec2(x, along) * 0.07 + n2(vec2(x, along) * 0.3)) - 0.5)) * 0.5);
          }
          col *= lightK;
        } else if (part == 3) {
          if (chapel) {
            // boards up the slope, trusses across every fifteen metres
            float beam = step(abs(mod(along, 15.0) - 7.5), 0.9);
            vec3 board = white ? vec3(0.82, 0.76, 0.66) : vec3(0.2, 0.12, 0.07) * (0.8 + 0.2 * step(0.08, fract(x / 1.6)));
            col = mix(board, white ? vec3(0.78, 0.6, 0.3) : vec3(0.1, 0.05, 0.03), beam);
          } else if (st > 1.5 && st < 2.5) {
            vec2 tq = fract(vec2(x, along) / 2.4);
            col = vec3(0.86, 0.88, 0.88) * (0.85 + 0.15 * step(0.04, min(tq.x, tq.y)));
            vec2 lq = vec2(abs(x) - 10.0, mod(along, 20.0) - 10.0);
            col = mix(col, vec3(1.6, 1.7, 1.66), step(box2(lq, vec2(1.0, 4.0)), 0.0));
          } else {
            col = vec3(0.86, 0.83, 0.78) * (0.92 + 0.08 * n2(vec2(x, along) * 0.1));
            float r = length(vec2(x, dl));
            col = mix(col, vec3(0.95, 0.9, 0.8), step(abs(r - 5.0), 0.4) + step(abs(r - 7.0), 0.25));
          }
          col *= lightK;
        } else {
          // the walls
          if (chapel) {
            vec3 wood = white ? vec3(0.8, 0.72, 0.6) : vec3(0.22, 0.12, 0.06);
            if (h < 9.0) {
              vec2 pq = vec2(mod(wa, 6.0) - 3.0, h - 4.6);
              col = wood * (0.85 + 0.2 * n2(vec2(wa * 0.3, h * 2.0)));
              col *= 1.0 - 0.28 * (step(box2(pq, vec2(2.4, 3.4)), 0.0) - step(box2(pq, vec2(2.15, 3.15)), 0.0));
            } else {
              col = white ? vec3(0.86, 0.78, 0.7) * (0.9 + 0.1 * sin(wa * 2.2)) : vec3(0.32, 0.2, 0.3) * (0.78 + 0.22 * sin(wa * 2.2)) * (0.9 + 0.1 * n2(vec2(wa * 0.1, h * 0.05)));
              // for the wedding, garlands of blush roses swagged along the walls
              if (white) { float sw = 15.0 + 2.6 * abs(sin(wa * 3.14159 / 15.0)); float gr = smoothstep(1.2, 0.6, abs(h - sw)) * (0.6 + 0.4 * step(0.4, h2(floor(vec2(wa, h) * 1.2)))); col = mix(col, mix(vec3(0.95, 0.62, 0.68), vec3(0.4, 0.55, 0.3), step(0.8, h2(floor(vec2(wa * 1.7, h))))), gr); }
            }
            col = mix(col, white ? vec3(0.9, 0.78, 0.5) : vec3(0.32, 0.18, 0.1), step(abs(h - 9.3), 0.35));
            col *= lightK;
            // the windows: pointed, stained, every thirty metres, lit from outside
            float wx = mod(wa, 30.0) - 15.0;
            float win = lancet(wx, h - 11.0, 3.8, 11.0) * (onWall ? 1.0 : 0.0);
            float frame = lancet(wx, h - 10.4, 4.5, 11.6) * (onWall ? 1.0 : 0.0);
            vec3 outside = night ? uMoon * 0.9 : (white ? vec3(1.3, 1.2, 1.0) : uSkyLow * 1.6 + uWarm * 0.15);
            vec3 gl = glass(vec2(wx, h - 11.0), floor(wa / 30.0) * 7.0 + side, 1.0, white) * outside * (white ? 1.4 : 1.6);
            if (night) gl = mix(gl, uMoon * 0.5 * (0.6 + 0.4 * h2(floor(vec2(wx, h) / 2.1))), 0.55);
            col = mix(col, white ? vec3(0.95, 0.85, 0.6) : vec3(0.1, 0.06, 0.04), frame * (1.0 - win));
            col = mix(col, gl, win);
          } else if (st > 1.5 && st < 2.5) {
            // white tile to the rail, mint above it
            vec2 tq = vec2(wa / 1.8 + mod(floor(h / 0.9), 2.0) * 0.5, h / 0.9);
            vec2 tf = fract(tq);
            col = vec3(0.9, 0.92, 0.9) * (0.92 + 0.08 * h2(floor(tq))) * (0.78 + 0.22 * smoothstep(0.0, 0.06, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y))));
            col = mix(col, vec3(0.62, 0.74, 0.68) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.1)), step(18.0, h));
            col = mix(col, vec3(0.62, 0.64, 0.68), step(abs(h - 6.0), 0.5));
            col *= lightK;
          } else {
            // parlour, hall, foyer: painted panels below the rail, soft paper above, crown at the top
            vec3 low = st > 2.5 && st < 3.5 ? vec3(0.3, 0.2, 0.14) : vec3(0.78, 0.74, 0.66);
            vec3 high = st > 2.5 && st < 3.5 ? vec3(0.62, 0.56, 0.46) : (st > 3.5 ? vec3(0.8, 0.76, 0.68) : vec3(0.6, 0.54, 0.6));
            if (h < 9.0) {
              vec2 pq = vec2(mod(wa, 7.0) - 3.5, h - 4.6);
              col = low * (1.0 - 0.18 * (step(box2(pq, vec2(2.8, 3.2)), 0.0) - step(box2(pq, vec2(2.55, 2.95)), 0.0)));
            } else {
              col = high * (0.94 + 0.06 * aaSq(wa / 1.4));
              col = mix(col, high * 1.12, floral(vec2(wa, h)) * (st < 1.5 ? 0.35 : 0.15));
            }
            col = mix(col, vec3(0.86, 0.82, 0.72), step(abs(h - 9.3), 0.35));
            float top = st > 2.5 && st < 3.5 ? 28.0 : (st > 3.5 ? 32.0 : 30.0);
            col = mix(col, vec3(0.9, 0.86, 0.78), step(top - 1.4, h));
            col *= lightK;
            // a doorway in the hall's walls now and then
            if (st > 2.5 && st < 3.5 && part != 6) {
              float dx = mod(wa, 34.0) - 17.0;
              if (abs(dx) < 6.6 && h < 23.0) {
                vec3 dw = vec3(0.2, 0.1, 0.05) * (0.8 + 0.25 * n2(vec2(dx * 0.4, h * 4.0)));
                dw = mix(dw, vec3(0.8, 0.72, 0.6), 1.0 - step(abs(dx), 5.8) * step(h, 22.2));
                dw = mix(dw, vec3(0.95, 0.75, 0.32), step(length(vec2(dx - 4.2 * side, h - 10.5)), 0.5));
                col = dw * lightK;
              }
            }
            // a tall window with heavy curtains in the parlours, the dusk behind the sheers
            if ((st < 1.5 || st > 3.5) && onWall) {
              float wx = mod(wa, 40.0) - 20.0;
              if (abs(wx) < 9.0 && h > 6.0 && h < 27.0) {
                float glassA = step(abs(wx), 4.6) * step(9.0, h) * step(h, 25.0);
                vec3 sky = mix(uSkyLow, uSkyTop, smoothstep(9.0, 25.0, h)) * 1.3;
                sky = mix(sky, vec3(0.9, 0.86, 0.8) * uLight, 0.35 + 0.1 * sin(wx * 5.0));
                vec3 drape = vec3(0.24, 0.08, 0.2) * (0.6 + 0.4 * abs(sin(wx * 2.4))) * lightK;
                col = mix(drape, sky, glassA);
              }
            }
          }
        }
        col *= part == 7 ? vec3(1.0) : uLight;
        // the director's torch on the walls at 3 a.m.
        if (uBeam.z > -1e4) { float bd = length(vec2(vT - uBeam.x, (h - uBeam.y) / 22.0)); col += vec3(0.95, 0.92, 0.8) * (smoothstep(0.36, 0.22, bd) * 1.6 + smoothstep(0.8, 0.0, bd) * 0.25) * (onWall && side * uBeam.z > 0.0 ? 1.0 : 0.0); }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the white chapel's altar, the urn under the flowers ----------
export class WeddingFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -26;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const flowerM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, emissive: 0x2a2622 });
    this.arch = new THREE.Mesh(CG.arch(), flowerM); this.group.add(this.arch);
    this.urnM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.5, emissive: 0x100808 });
    const urn = new THREE.Mesh(FG.urn(), this.urnM); urn.position.set(0, 8.3, -2); urn.scale.setScalar(0.9); this.group.add(urn);
    const brass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.6, emissive: 0x1a1006 });
    for (const s of [-1, 1]) { const c = new THREE.Mesh(FG.candelabra(), brass); c.position.set(s * 17, 0, -1); this.group.add(c); }
    this.lit = 0.4; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const fy = floorAt(this.course, this.t);
    track.ground(this.t, this.x, this._p);
    this.group.position.set(this._p.x, fy, this._p.z);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.x < 0 ? -Math.PI / 2 : Math.PI / 2), 0);
    this.lit += ((this.fired ? 1.2 : 0.5) - this.lit) * Math.min(1, dt);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const fl = 0.85 + 0.15 * Math.sin(songT * 11);
    for (const s of [-1, 1]) for (let j = -2; j <= 2; j++) { this._w.set(s * 17 + j * 1.6, 19.1, -1).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 2.8, [1, 0.74, 0.4], 1.6 * fl * this.lit); }
    this._w.set(0, 16, 0).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 46, [1, 0.88, 0.7], 0.22 * this.lit);
    S.pool(this._w.x, fy + 0.1, this._w.z, 70, [1, 0.85, 0.62], 0.5 * this.lit);
  }
}

// ---------- the place, per frame ----------
export class FuneralWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.terrain = new Terrain(scene, S.course, S.P, S.plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 1; tu.uDry.value = 0.15; tu.uWood.value = 0;
    this.mat = funeralMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, FUNERAL));
    this.spans = this.rooms.map((r) => [r.span.from, r.span.to]);
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
    this._g = new THREE.Vector3(); this._m = new THREE.Matrix4();
  }
  update(S, dt, camera, time) {
    const T = this.terrain;
    T.update(S.track, S.rider, S.P, camera, 0);
    T.mat.uniforms.uWood.value = 0;
    // under the rooms the lawn goes down out of the way of their floors
    let sunk = false;
    for (let i = 0; i < T.N; i++) {
      const t = T.rowT0 + i * T.rowDT;
      if (!this.spans.some(([a, b]) => t > a + 0.25 && t < b - 0.25)) continue;
      for (let j = 0; j < T.M; j++) T.pos[(i * T.M + j) * 3 + 1] -= 9;
      sunk = true;
    }
    if (sunk) T.geo.attributes.position.needsUpdate = true;
    const u = this.mat.uniforms, P = S.P;
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffc070);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon); u.uMoon.value.set(P.moon ?? 0x9ab0ff);
    // at 3 a.m. the director's torch goes along the walls
    const ev = S.plan.roomEvents || {}, rt = S.rider.t;
    if (ev.torch && rt > ev.torch[0] - 2 && rt < ev.torch[1]) u.uBeam.value.set(rt + 1.9 + Math.sin(time * 0.9) * 0.7, 15 + Math.sin(time * 1.7) * 7, Math.sin(time * 0.5) > 0 ? 1 : -1);
    else u.uBeam.value.set(0, 0, -1e5);
    for (const r of this.rooms) r.update(S.track, S.rider, rt);
  }
  // what hangs in the rooms: lanterns in the chapels, globes in the parlours, tubes and sconces
  draw(T) {
    const lamp = col(this.S.P.lamp ?? 0xffc070), g = this._g, m = this._m;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const top = Math.max(...r.ring.map((p) => p[1]));
      for (const f of r.fixtures) {
        this.S.track.ground(f.t, 0, g);
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 2) { for (const s of [-1, 1]) { const w = this.S.track.ground(f.t, s * 10, this._w || (this._w = new THREE.Vector3())); T.glow(w.x, fy + r.H - 0.6, w.z, 10, [0.9, 1, 0.97], 0.8); } T.pool(g.x, fy + 0.08, g.z, 40, [0.85, 1, 0.95], 0.4); continue; }
        if (r.style === 3) { for (const s of [-1, 1]) { const w = this.S.track.ground(f.t, s * (r.W - 1), this._w || (this._w = new THREE.Vector3())); T.glow(w.x, fy + 15, w.z, 6, lamp, 0.9); } continue; }
        const y = fy + top - (r.style === 0 || r.style === 6 ? 13 : 9);
        m.makeTranslation(g.x, y + 4.6, g.z); T.layers.pendant.add(m);
        T.glow(g.x, y, g.z, r.style === 0 || r.style === 6 ? 18 : 22, lamp, 0.85);
        T.pool(g.x, fy + 0.08, g.z, 56, lamp, 0.4);
      }
    }
  }
}
