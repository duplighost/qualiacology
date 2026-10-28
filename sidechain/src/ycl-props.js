// YOUR CAR IS AT THE BOTTOM OF THE LAKE: the things along the way, at the scale they take up from up
// on the road. His suitcase on her side of the lake, the rack he took his keys from, her cabin, the
// pier; on the water his suitcase and his mixtape floating; at her door the police, his face on every
// pole, the coffee she pours them, the shop he went to for cigarettes; the depth posts counting down to
// fifty feet; the boat ramp; under the water the weeds, the light coming down, the bubbles; the spare
// key, kept. Placed by the zones in ycl-song.js.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col, tintV, signV } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';
import { landY, shoreDist, bedY, vnoise } from './ycl-lake.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// lit a little by itself, brighter where the vertex colour is bright (so a lit window glows, wood doesn't)
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.75, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
const basic = (M, key, c, k = 1) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));

const WOOD = rgb(0x4a3424), DARK = rgb(0x1c1814), CREAM = rgb(0xe8dcc0), BRASS = rgb(0xd0a850), WHITE = rgb(0xece8e0);
const PORCH = [1, 0.78, 0.48], LAMP = [1, 0.8, 0.52], HEAD = [1, 0.95, 0.82], TAIL = [1, 0.08, 0.06], SIREN_R = [1, 0.06, 0.08], SIREN_B = [0.12, 0.3, 1];
const LAKE = [0.35, 0.95, 0.85], MOONLIT = [0.75, 0.85, 1], GLINT = [1, 0.9, 0.6], STEAM = [0.9, 0.88, 0.85], SHOPLIGHT = [1, 0.95, 0.8], NEON = [1, 0.35, 0.3], PAPER = [0.9, 0.9, 1], BEACON = [1, 0.25, 0.2];
// (the layers the set-pieces use, and the hooks on the rack with a key still on them: made once)
const PROP_LAYERS = ['yclSuitcase', 'yclRack', 'yclKey', 'yclCabin', 'yclCabinGlass', 'yclTape', 'yclTapeLabel', 'yclRibbon', 'yclMug', 'yclShop', 'yclShopSign', 'yclRamp', 'yclRowboat', 'yclRing', 'yclShiftBoot', 'yclShiftRod', 'yclShiftFace'];
const RACK_KEYS = [[0, -8], [1, -4], [3, 4], [4, 8]], KEY_Q = ['_yckq0', '_yckq1', '_yckq2', '_yckq3', '_yckq4'];

// ---------- the pictures ----------
// his face on the poles: MISSING, a photo of a man, the lines under it too small to read from the road
function posterTexture() {
  return canvasTex(400, 560, (g, W, H) => {
    g.fillStyle = '#f2eee2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a1a1a'; g.font = '900 86px "Archivo Black", Impact, sans-serif'; g.textAlign = 'center'; g.fillText('MISSING', W / 2, 98);
    // the photo: a man in a collared shirt, smiling, a little out of focus
    g.fillStyle = '#7a8a94'; g.fillRect(70, 126, 260, 250);
    const grd = g.createLinearGradient(0, 126, 0, 376); grd.addColorStop(0, '#9aaab4'); grd.addColorStop(1, '#5a6a74'); g.fillStyle = grd; g.fillRect(74, 130, 252, 242);
    g.fillStyle = '#e0b898'; g.beginPath(); g.ellipse(200, 228, 46, 56, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2a1e'; g.beginPath(); g.ellipse(200, 186, 50, 26, 0, Math.PI, Math.PI * 2); g.fill();
    g.fillStyle = '#2a3a5a'; g.beginPath(); g.moveTo(108, 372); g.quadraticCurveTo(120, 292, 200, 286); g.quadraticCurveTo(280, 292, 292, 372); g.fill();
    g.fillStyle = '#e8e8e8'; g.beginPath(); g.moveTo(178, 292); g.lineTo(200, 322); g.lineTo(222, 292); g.fill();
    g.strokeStyle = '#3a2a22'; g.lineWidth = 4; g.beginPath(); g.arc(200, 240, 18, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#2a2a2a'; for (let r = 0; r < 5; r++) { const w = r === 0 ? 300 : 230 + (r % 2) * 50; g.fillRect((W - w) / 2, 404 + r * 28, w, r === 0 ? 14 : 9); }
    for (let k = 0; k < 8; k++) { g.fillRect(18 + k * 48, 528, 18, 30); }
  });
}
// the cassette's label: his writing, a red stripe
function tapeTexture() {
  return canvasTex(512, 320, (g, W, H) => {
    g.fillStyle = '#16161a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#efe6cc'; g.fillRect(36, 30, W - 72, 170);
    g.fillStyle = '#c8323a'; g.fillRect(36, 30, W - 72, 26);
    g.strokeStyle = '#2a3a8a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
    const R = seeded(9); let x = 70; g.moveTo(x, 120);
    while (x < 400) { g.quadraticCurveTo(x + 8, 92 + R() * 20, x + 16, 120); x += 16 + R() * 6; }
    g.stroke();
    g.font = 'italic 700 44px Georgia, serif'; g.fillStyle = '#2a3a8a'; g.fillText('for the drive', 96, 178);
    // the window and the two reels
    g.fillStyle = '#2a2420'; g.fillRect(150, 214, 212, 70);
    for (const cx of [196, 316]) { g.fillStyle = '#f0ece4'; g.beginPath(); g.arc(cx, 249, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = '#16161a'; g.beginPath(); g.arc(cx, 249, 12, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4a2a1a'; g.beginPath(); g.arc(196, 249, 52, -0.6, 0.6); g.fill();
  });
}
// the shift pattern on the knob, worn white lines and numbers on black
function shiftTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#121214'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8e4da'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(58, 128); g.lineTo(198, 128); for (const x of [58, 128, 198]) { g.moveTo(x, 62); g.lineTo(x, 194); } g.stroke();
    g.fillStyle = '#e8e4da'; g.font = '900 40px "Archivo Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [['1', 58, 36], ['3', 128, 36], ['5', 198, 36], ['2', 58, 222], ['4', 128, 222], ['R', 198, 222]].forEach(([c, x, y]) => g.fillText(c, x, y));
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { poster: posterTexture(), tape: tapeTexture(), shift: shiftTexture() });

// ---------- the things ----------
const YC = {
  // his suitcase, open, clothes in it and over the side; the lid stands up behind
  suitcase() {
    const shell = rgb(0x2a6a7a), trim = rgb(0xd8c8a0), parts = [paint(box(24, 5, 16, 0, 2.5, 0), shell)];
    const cl = [0xe8e0d0, 0x4a6a9a, 0xd8a050, 0x2a2a30, 0xc86a8a, 0x8a3a3a];
    for (let k = 0; k < 9; k++) parts.push(paint(box(7, 1.6, 4.6, -7.4 + (k % 3) * 7.2, 5.4 + Math.floor(k / 3) * 0.5, -4.6 + Math.floor(k / 3) * 4.6), rgb(cl[k % cl.length])));
    parts.push(paint(box(6, 0.5, 9, 13.2, 1.6, 2).rotateZ(-0.5), rgb(0x4a6a9a)));                 // a shirt sleeve over the side
    const lid = box(24, 1.6, 16, 0, 0.8, 8); lid.rotateX(-1.82); lid.translate(0, 5, -8); parts.push(paint(lid, shell));
    for (const x of [-7, 7]) { const s = box(0.7, 0.3, 11, x, 1.8, 8); s.rotateX(-1.82); s.translate(0, 5, -8); parts.push(paint(s, trim)); }
    parts.push(paint(box(7, 1.4, 1.2, 0, 3.2, 8.4), DARK), paint(box(25, 0.5, 0.5, 0, 5.1, 8.1), trim));
    return merge(parts);
  },
  // the rack by the door: a board, five hooks; his hook empty
  rack() {
    const parts = [paint(box(20, 7, 1.2, 0, 0, 0), WOOD), paint(box(21, 0.7, 1.6, 0, 3.7, 0.2), DARK), paint(box(21, 0.7, 1.6, 0, -3.7, 0.2), DARK)];
    for (let k = 0; k < 5; k++) { const x = -8 + k * 4; parts.push(paint(cyl(0.32, 0.32, 2.2, 10, 0, 0, 0).rotateX(Math.PI / 2).translate(x, 1.2, 1.4), BRASS), paint(sph(0.5, 1, 1, 1, x, 1.2, 2.5, 10, 8), BRASS)); }
    // the lamp over it
    parts.push(paint(box(0.5, 0.5, 3.4, 0, 4.4, 1.2), DARK), paint(cyl(0.4, 1.6, 1.1, 14, 0, 5.4, 3.0), DARK));
    // on two posts, so it stands at the roadside at the height you see it from
    for (const x of [-7, 7]) parts.push(paint(box(1.2, 14, 1.2, x, -7, -1.2), DARK));
    for (const p of parts) p.translate(0, 14, 0);
    return merge(parts);
  },
  // a key, hung from its bow
  key() {
    const bow = new THREE.TorusGeometry(1.1, 0.42, 8, 20); bow.translate(0, -1.2, 0);
    return merge([paint(bow, BRASS), paint(box(0.5, 4.6, 0.22, 0, -4.6, 0), BRASS), paint(box(0.75, 0.5, 0.22, 0.55, -5.9, 0), BRASS), paint(box(0.6, 0.42, 0.22, 0.48, -6.6, 0), BRASS), paint(box(0.85, 0.5, 0.22, 0.6, -5.0, 0), BRASS)]);
  },
  // her cabin by the water: siding, a gable roof, the porch along the front with its rail and
  // steps, the door, two windows, the chimney (the lit glass and the porch light are their own)
  cabin() {
    const wall = rgb(0x4a3a30), trim = rgb(0xd8d0c0), roof = rgb(0x22242a), parts = [];
    parts.push(paint(box(26, 9, 16, 0, 4.5, 0), wall));
    // siding lines
    for (let y = 1; y < 9; y += 1.1) parts.push(paint(box(26.1, 0.12, 16.1, 0, y, 0), rgb(0x3a2c24)));
    const r1 = box(28, 0.8, 11, 0, 0, 0); r1.rotateX(0.62); r1.translate(0, 12.3, -3.9); parts.push(paint(r1, roof));
    const r2 = box(28, 0.8, 11, 0, 0, 0); r2.rotateX(-0.62); r2.translate(0, 12.3, 3.9); parts.push(paint(r2, roof));
    // gable ends
    for (const x of [-13, 13]) { const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(0, 6.1); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateY(Math.PI / 2); g.translate(x, 9, 0); parts.push(paint(g, wall)); }
    parts.push(paint(box(2.6, 7, 2.6, 8, 14, -3), rgb(0x5a3a2e)));
    // the porch: floor, posts, rail, steps, its roof
    parts.push(paint(box(26, 0.8, 7, 0, 1.4, 11.5), WOOD));
    for (const x of [-12.4, -4, 4, 12.4]) parts.push(paint(box(0.7, 7.6, 0.7, x, 5.6, 14.6), trim));
    parts.push(paint(box(26, 0.5, 0.5, 0, 4.6, 14.6), trim), paint(box(9, 0.5, 0.5, -8.2, 3.0, 14.6), trim), paint(box(9, 0.5, 0.5, 8.2, 3.0, 14.6), trim));
    for (let k = 0; k < 3; k++) parts.push(paint(box(7, 0.6, 1.6, 0, 0.4 + k * 0.45, 15.6 + (2 - k) * 1.5), WOOD));
    const pr = box(27, 0.6, 8, 0, 0, 0); pr.rotateX(0.18); pr.translate(0, 9.6, 11.3); parts.push(paint(pr, roof));
    // the door and the window frames
    parts.push(paint(box(4.2, 7, 0.4, 0, 5.3, 8.1), rgb(0x7a2a24)), paint(box(5, 0.5, 0.5, 0, 9, 8.2), trim));
    for (const x of [-8.5, 8.5]) { parts.push(paint(box(6.2, 0.5, 0.5, x, 7.6, 8.2), trim), paint(box(6.2, 0.5, 0.5, x, 3.4, 8.2), trim), paint(box(0.5, 4.6, 0.5, x - 3, 5.5, 8.2), trim), paint(box(0.5, 4.6, 0.5, x + 3, 5.5, 8.2), trim), paint(box(0.3, 4.2, 0.4, x, 5.5, 8.25), trim)); }
    return merge(parts);
  },
  // the cabin's lit glass: the two windows and the door's little window
  cabinGlass() { return merge([box(5.4, 3.9, 0.2, -8.5, 5.5, 8.1), box(5.4, 3.9, 0.2, 8.5, 5.5, 8.1), box(2, 1.6, 0.2, 0, 7.2, 8.35)].map(ni)); },
  // a telephone pole: the crossbar, the insulators (the poster is its own)
  pole() {
    const w = rgb(0x5a4632), parts = [paint(cyl(0.45, 0.6, 30, 8, 0, 15, 0), w), paint(box(9, 0.6, 0.6, 0, 27.5, 0), w)];
    for (const x of [-3.8, -1.6, 1.6, 3.8]) parts.push(paint(cyl(0.22, 0.28, 0.9, 6, x, 28.2, 0), rgb(0x6a8a7a)));
    return merge(parts);
  },
  poster() { const g = new THREE.PlaneGeometry(6, 8.4); g.translate(0, 8.6, 0.65); return g; },
  // the cassette (the label is its own picture) and the tape pulled out of it, loose on the water
  tape() {
    const parts = [paint(box(16, 1.6, 10, 0, 0.8, 0), rgb(0x18181c)), paint(box(16.2, 0.4, 10.2, 0, 1.7, 0), rgb(0x2a2a30))];
    for (const x of [-5.6, 5.6]) parts.push(paint(cyl(0.7, 0.7, 0.3, 12, x, 1.9, -3.6), rgb(0x8a8a90)));
    return merge(parts);
  },
  tapeLabel() { const g = new THREE.PlaneGeometry(15.2, 9.4); g.rotateX(-Math.PI / 2); g.translate(0, 1.95, 0); return g; },
  ribbon() {
    // a long loose loop of tape lying on the water, wandering away from the cassette
    const pts = [], R = seeded(17);
    let x = 7, z = 2, a = 0.3;
    for (let i = 0; i < 70; i++) { pts.push([x, z]); a += (R() - 0.5) * 0.7 + Math.sin(i * 0.35) * 0.25; x += Math.cos(a) * 1.2; z += Math.sin(a) * 1.2; }
    const pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const [px, pz] = pts[i], [qx, qz] = pts[Math.min(pts.length - 1, i + 1)], [ox, oz] = pts[Math.max(0, i - 1)];
      let dx = qx - ox, dz = qz - oz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const tw = 0.35 + 0.2 * Math.sin(i * 0.9);
      pos.push(px - dz * tw, 0.25 + 0.15 * Math.sin(i * 0.5), pz + dx * tw, px + dz * tw, 0.25 + 0.15 * Math.sin(i * 0.5), pz - dx * tw);
      if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return paint(g, rgb(0x3a2418));
  },
  // a coffee mug, steaming (the steam is light)
  mug() {
    const body = lathe([[0, 0], [3.6, 0], [3.8, 0.3], [3.9, 7.6], [3.6, 7.8], [3.4, 0.9], [0, 0.9]], 36);
    const handle = new THREE.TorusGeometry(2.1, 0.55, 10, 24, Math.PI * 1.2); handle.rotateZ(-Math.PI * 0.6); handle.translate(3.9, 4.2, 0);
    const coffee = new THREE.CircleGeometry(3.45, 32); coffee.rotateX(-Math.PI / 2); coffee.translate(0, 6.8, 0);
    return merge([paint(body, WHITE), paint(handle, WHITE), paint(coffee, rgb(0x2a160c))]);
  },
  // the shop by the water he went to for cigarettes: the box of it, its window (the sign is text)
  shop() {
    const parts = [paint(box(22, 9, 14, 0, 4.5, 0), rgb(0x3a4a4a)), paint(box(23, 1, 15, 0, 9.4, 0), rgb(0x1a1c20)), paint(box(10, 4.2, 0.3, -4, 4, 7.1), rgb(0xfff0c0)), paint(box(3.4, 6.4, 0.3, 6.5, 3.2, 7.1), rgb(0x6a7a7a))];
    for (const x of [-10, 10]) parts.push(paint(box(0.6, 16, 0.6, x, 8, 7.4), rgb(0x2a2a2e)));
    return merge(parts);
  },
  shopSign() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(20 / 7.5, 6.2 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 13.2, 7.6); return g; },
  // a depth post standing out of the water, striped, its number plate (the number is text)
  depth() {
    const parts = [];
    for (let k = 0; k < 7; k++) parts.push(paint(cyl(0.9, 0.9, 2.4, 10, 0, 1.2 + k * 2.4, 0), k % 2 ? WHITE : rgb(0xc8322a)));
    parts.push(paint(sph(1.1, 1, 0.6, 1, 0, 17, 0, 10, 6), rgb(0xc8322a)));
    return merge(parts);
  },
  depthPlate() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(8 / 7.5, 4.2 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 11.2, 1.0); return g; },
  // a length of pier: planks across, the stringers, a piling at each corner going down into the water
  pier() {
    const parts = [];
    for (let z = -7; z < 7; z += 1.0) parts.push(paint(box(9, 0.35, 0.86, 0, 0, z + 0.5), rgb(z % 2 ? 0x5a4a3a : 0x4e4032)));
    for (const x of [-4.2, 4.2]) parts.push(paint(box(0.5, 0.7, 14.2, x, -0.5, 0), DARK), paint(cyl(0.45, 0.45, 6, 8, x, -3.2, -6.5), DARK), paint(box(0.3, 2.4, 0.3, x, 1.2, -6.5), rgb(0x6a5a4a)), paint(box(0.25, 0.25, 14, x, 2.3, 0), rgb(0x6a5a4a)));
    return merge(parts);
  },
  // a lamp on the pier: its post and its shade (the light is a glow)
  pierLamp() { return merge([paint(cyl(0.18, 0.22, 7, 8, 0, 3.5, 0), DARK), paint(box(1.4, 0.3, 0.3, 0.5, 7, 0), DARK), paint(cyl(0.2, 0.7, 0.6, 12, 1.1, 6.8, 0), DARK)]); },
  // the boat ramp: a concrete slab down into the water, two tyre tracks going in
  ramp() {
    const parts = [paint(box(16, 0.6, 46, 0, 0, 0), rgb(0x6a6a66))];
    for (const x of [-2.6, 2.6]) parts.push(paint(box(1.6, 0.05, 46, x, 0.33, 0), rgb(0x2a2622)));
    for (const p of parts) { p.rotateX(0.075); }
    return merge(parts);
  },
  // his stick shift, out of the water: the leather boot round its foot (the rod and the knob lean
  // on their own, in gear and then in neutral)
  shiftBoot() {
    const boot = lathe([[0, 0], [5.2, 0], [5.0, 0.6], [3.6, 2.2], [2.2, 4.4], [1.3, 6.0], [1.1, 6.4], [0, 6.4]], 24);
    const parts = [paint(boot, rgb(0x1c1a1a)), paint(cyl(6.4, 6.6, 1.2, 28, 0, -0.2, 0), rgb(0x2a2a2e))];
    for (let k = 0; k < 4; k++) parts.push(paint(new THREE.TorusGeometry(3.9 - k * 0.7, 0.12, 6, 24).rotateX(Math.PI / 2).translate(0, 1.6 + k * 1.15, 0), rgb(0x0e0e10)));
    return merge(parts);
  },
  shiftRod() { return merge([paint(cyl(0.55, 0.7, 14, 12, 0, 7, 0), rgb(0xc8ccd4)), paint(sph(3.0, 1, 0.9, 1, 0, 16.2, 0, 22, 16), rgb(0x141416))]); },
  shiftFace() { const g = new THREE.CircleGeometry(2.1, 32); g.translate(0, 16.4, 2.85); return g; },
  // her rowboat at the dock, upturned on the bank
  rowboat() {
    const hull = lathe([[0, -3], [1.6, -2.4], [2.2, -0.5], [2.2, 1.6], [1.4, 3.6], [0, 4.4]], 12);
    hull.rotateX(Math.PI / 2); hull.scale(1, 0.55, 1); hull.translate(0, 0.6, 0);
    return paint(hull, rgb(0x2a4a5a));
  },
  // a board for her lines: routed letters on a dark green board, on two posts, a lamp over it
  board() {
    const parts = [paint(box(26, 9.4, 1.0, 0, 0, -0.6), rgb(0x16261e)), paint(box(26.8, 0.8, 1.4, 0, 5.0, -0.4), rgb(0x3a2a1e)), paint(box(26.8, 0.8, 1.4, 0, -5.0, -0.4), rgb(0x3a2a1e))];
    for (const x of [-10.5, 10.5]) parts.push(paint(box(1.1, 30, 1.1, x, -14, -1.2), rgb(0x3a2a1e)));
    parts.push(paint(box(0.4, 0.4, 3.4, 0, 6.6, 0.8), DARK), paint(cyl(0.3, 1.1, 0.9, 12, 0, 6.4, 2.3), DARK));
    return merge(parts);
  },
  boardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(24.4 / 7.5, 8.2 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, -0.05); return g; },
  // under the water: a frond of weed (it sways in the shader), a rock, a shaft of light down from the surface
  weed() {
    const pos = [], uv = [], idx = [], N = 8;
    for (let i = 0; i <= N; i++) { const v = i / N, w = 0.9 * (1 - v * 0.7); pos.push(-w, v * 14, 0, w, v * 14, 0); uv.push(0, v, 1, v); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  },
  rock() { const g = new THREE.DodecahedronGeometry(3, 0); g.scale(1.4, 0.6, 1); g.translate(0, 0.6, 0); return paint(g, rgb(0x2a3430)); },
  shaft() { const g = new THREE.PlaneGeometry(1, 1, 1, 6); g.translate(0, -0.5, 0); return g; },
  // a ring spreading on the water (a splash, something floating, the bubbles coming up)
  ring() { const g = new THREE.RingGeometry(0.86, 1, 40, 1); g.rotateX(-Math.PI / 2); return g; },
};

// weed, swaying with the water and a little with the beat
function weedMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.006 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute vec3 aTint; attribute float aSeed; uniform float uTime; varying vec2 vUv; varying vec3 vC; varying vec3 vW;
      void main(){
        vUv = uv; vC = aTint;
        vec3 p = position;
        float sway = sin(uTime * 0.9 + aSeed * 6.28 + p.y * 0.25) * 1.6 + sin(uTime * 1.7 + aSeed * 3.0) * 0.5;
        p.x += sway * uv.y * uv.y;
        p.z += cos(uTime * 0.7 + aSeed * 4.0) * 0.8 * uv.y * uv.y;
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying vec3 vC; varying vec3 vW;
      void main(){
        float edge = 1.0 - smoothstep(0.6, 1.0, abs(vUv.x - 0.5) * 2.0);
        vec3 col = vC * (0.35 + 0.65 * vUv.y) * (0.7 + 0.3 * edge);
        float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}
// light coming down through the water: brightest under the surface, gone before the bottom
function shaftMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
    vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vS; varying float vF;
      void main(){
        vUv = uv; vS = aSeed;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        // (how square-on it is to the camera: side-on a sheet of light is only a line)
        vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));
        vF = smoothstep(0.15, 0.5, abs(dot(n, normalize(cameraPosition - w.xyz))));
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uK; varying vec2 vUv; varying float vS; varying float vF;
      void main(){
        float x = abs(vUv.x - 0.5) * 2.0;
        float a = exp(-x * x * 5.0) * (1.0 - x) * pow(clamp(vUv.y, 0.0, 1.0), 2.2) * (0.6 + 0.4 * sin(uTime * 0.8 + vS * 9.0 + vUv.y * 3.0)) * uK * vF;
        a = (a == a) ? clamp(a, 0.0, 2.0) : 0.0;
        gl_FragColor = vec4(vec3(0.45, 0.85, 0.8) * a * 0.24, 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
// a spreading ring of light on the water, fading as it grows
function ringMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute float aK; varying float vK; void main(){ vK = aK; gl_Position = projectionMatrix * (viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `varying float vK; void main(){ float k = (vK == vK) ? clamp(vK, 0.0, 2.0) : 0.0; gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * k, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

const POL = col(0xe8eaf0), PINES = [0x16261c, 0x1a2e20, 0x223422, 0x142218], CABINS = [0x5a4232, 0x4a3a32, 0x6a4a3a, 0x3e3a3a, 0x5a5048];
const RK = { aK: 0 }, WS = { aTint: null, aSeed: 0 }, SS = { aSeed: 0 };

extend({
  layers: {
    yclSuitcase: (M) => [YC.suitcase(), VC(M, 'yclSuitcaseM', 0.28, { roughness: 0.6 }), 4, {}],
    yclRack: (M) => [YC.rack(), VC(M, 'yclRackM', 0.25, { roughness: 0.7, metalness: 0.2 }), 2, {}],
    yclKey: (M) => [YC.key(), VC(M, 'yclKeyM', 0.6, { roughness: 0.25, metalness: 0.8 }), 12, {}],
    yclCabin: (M) => [YC.cabin(), VC(M, 'yclCabinM', 0.22, { roughness: 0.85 }), 4, {}],
    yclCabinGlass: (M) => [YC.cabinGlass(), basic(M, 'yclCabinGlassM', 0xffc878, 1.25), 4, {}],
    yclPole: (M) => [YC.pole(), VC(M, 'yclPoleM', 0.15, { roughness: 0.9 }), 40, {}],
    yclPoster: (M) => [YC.poster(), pic(M, 'yclPosterM', tex().poster, 0.55), 40, {}],
    yclTape: (M) => [YC.tape(), VC(M, 'yclTapeM', 0.2, { roughness: 0.35 }), 2, {}],
    yclTapeLabel: (M) => [YC.tapeLabel(), pic(M, 'yclTapeLabelM', tex().tape, 0.6), 2, {}],
    yclRibbon: (M) => [YC.ribbon(), VC(M, 'yclRibbonM', 0.3, { roughness: 0.2, metalness: 0.5, side: THREE.DoubleSide }), 2, {}],
    yclMug: (M) => [YC.mug(), VC(M, 'yclMugM', 0.35, { roughness: 0.3 }), 4, {}],
    yclShop: (M) => [YC.shop(), VC(M, 'yclShopM', 0.3, { roughness: 0.8 }), 2, {}],
    yclShopSign: (M) => [YC.shopSign(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    yclDepth: (M) => [YC.depth(), VC(M, 'yclDepthM', 0.3, { roughness: 0.6 }), 8, {}],
    yclDepthPlate: (M) => [YC.depthPlate(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    yclPier: (M) => [YC.pier(), VC(M, 'yclPierM', 0.18, { roughness: 0.9 }), 120, {}],
    yclPierLamp: (M) => [YC.pierLamp(), VC(M, 'yclPierLampM', 0.1, { roughness: 0.6 }), 40, {}],
    yclRamp: (M) => [YC.ramp(), VC(M, 'yclRampM', 0.18, { roughness: 0.95 }), 2, {}],
    yclRowboat: (M) => [YC.rowboat(), VC(M, 'yclRowboatM', 0.2, { roughness: 0.7 }), 6, {}],
    yclShiftBoot: (M) => [YC.shiftBoot(), VC(M, 'yclShiftBootM', 0.15, { roughness: 0.85 }), 2, {}],
    yclShiftRod: (M) => [YC.shiftRod(), VC(M, 'yclShiftRodM', 0.35, { roughness: 0.18, metalness: 0.75 }), 2, {}],
    yclShiftFace: (M) => [YC.shiftFace(), pic(M, 'yclShiftFaceM', tex().shift, 0.7), 2, {}],
    yclBoard: (M) => [YC.board(), VC(M, 'yclBoardM', 0.2, { roughness: 0.8 }), 12, {}],
    yclBoardFace: (M) => [YC.boardFace(), M.sign, 12, { aIdx: 1, aWake: 2 }],
    yclWeed: (M) => [YC.weed(), M.yclWeedM || (M.yclWeedM = weedMaterial()), 700, { aTint: 3, aSeed: 1 }],
    yclRock: (M) => [YC.rock(), VC(M, 'yclRockM', 0.1, { roughness: 0.95 }), 160, {}],
    yclShaft: (M) => [YC.shaft(), M.yclShaftM || (M.yclShaftM = shaftMaterial()), 60, { aSeed: 1 }],
    yclRing: (M) => [YC.ring(), M.yclRingM || (M.yclRingM = ringMaterial()), 80, { aK: 1 }],
  },
  parts: {
    // the set-pieces, each where it's sung
    yclProp(S, it, p, q, yaw) {
      const L = S.layers; if (!S.track) for (const k of PROP_LAYERS) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._ycv || (S._ycv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      // floating: riding the swell a little
      if (it.float) at.y = -0.4 + 0.25 * Math.sin(T * 1.3 + it.t);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, c, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const pool = (x, z, size, c, k2, y = 0.15) => { const w = local(at, yaw, x * s, 0, z * s, S._o); poolAt(S, w.x, (it.float ? -0.4 : at.y) + y, w.z, size * s, c, k2); };
      const ring = (x, z, r, k2) => { const w = local(at, yaw, x * s, 0, z * s, S._o); w.y = -0.36; m.makeScale(r, 1, r); m.setPosition(w.x, w.y, w.z); RK.aK = k2; L.yclRing.add(m, RK); };
      if (k === 'suitcase') {
        // with shaking hands: the lid trembles while it's sung
        const shake = it.shake ? Math.sin(T * 38) * 0.03 * (1 - smooth(it.shake + 2.2, it.shake + 3.2, T)) * smooth(it.shake - 0.3, it.shake, T) : 0;
        put('yclSuitcase', 0, 0, 0, shake ? quat('_ycsq', shake, 0, shake * 0.5) : (it.float ? quat('_ycsq', 0, Math.sin(T * 1.1 + it.t) * 0.04, Math.sin(T * 0.9) * 0.05) : q));
        if (it.float) { for (let j = 0; j < 2; j++) { const f = ((T * 0.35 + j * 0.5 + it.t) % 1); ring(0, 0, (16 + 30 * f) * s, 0.5 * (1 - f)); } pool(0, 0, 40, MOONLIT, 0.25, 0.05); }
        else { light(0, 18, 6, 26, LAMP, 0.25); pool(0, 0, 44, LAMP, 0.45); }
      } else if (k === 'rack') {
        put('yclRack');
        // the keys left on their hooks, swinging a little; his hook empty, still swinging hardest
        for (const [j, hx] of RACK_KEYS) {
          const sw = Math.sin(T * (1.4 + j * 0.3) + j) * 0.12 + (it.grab ? Math.exp(-Math.max(0, T - it.grab) * 0.8) * Math.sin((T - it.grab) * 9) * 0.5 * (T > it.grab ? 1 : 0) : 0);
          put('yclKey', hx, 15.2, 2.6, quat(KEY_Q[j], Math.sin(T * 0.7 + j) * 0.3, 0, sw));
          if (Math.sin(T * 2.4 + j * 1.9) > 0.92) light(hx, 9.5, 3, 3.5, GLINT, 1.4);
        }
        light(0, 19.6, 3.2, 5, LAMP, 1.6); light(0, 15, 5, 34, LAMP, 0.5); pool(0, 6, 50, LAMP, 0.6);
      } else if (k === 'cabin') {
        put('yclCabin'); put('yclCabinGlass');
        light(-8.5, 5.5, 9.5, 14, PORCH, 0.55); light(8.5, 5.5, 9.5, 14, PORCH, 0.55);
        light(0, 9.4, 12.6, 4.5, PORCH, 1.6); light(0, 9.4, 12.6, 22, PORCH, 0.45);
        pool(0, 15, 34, PORCH, 0.6);
        // the police at her door: the lights going round, red and blue across the front of the house
        if (it.police) { const ph = Math.floor(T * 3) % 2; pool(0, 20, 70, ph ? SIREN_R : SIREN_B, 0.75); light(0, 6, 9.2, 34, ph ? SIREN_B : SIREN_R, 0.7); light(-8.5, 5.5, 9.5, 16, ph ? SIREN_R : SIREN_B, 0.6); light(8.5, 5.5, 9.5, 16, ph ? SIREN_B : SIREN_R, 0.6); }
      } else if (k === 'police') {
        // a police car, the bar on its roof going (the car is the town's own)
        m.compose(at, quat('_ycpq', it.turn ?? 0), S._s.set(s, s, s)); L.car.add(m, tintV(POL));
        // (the bar's two lamps strobing, and the colour they throw round the car, the yard, the trees)
        const ph = Math.floor(T * 3) % 2;
        const w1 = local(at, yaw, -0.4 * s, 1.75 * s, 0, S._o); glowAt(S, w1.x, w1.y, w1.z, 5 * s, SIREN_R, 3.0, 2);
        const w2 = local(at, yaw, 0.4 * s, 1.75 * s, 0, S._o); glowAt(S, w2.x, w2.y, w2.z, 5 * s, SIREN_B, 3.0, 3);
        const w3 = local(at, yaw, 0, 2.5 * s, 0, S._o); glowAt(S, w3.x, w3.y, w3.z, 14 * s, ph ? SIREN_R : SIREN_B, 0.5);
        const w4 = local(at, yaw, 0, 0, 0, S._o); poolAt(S, w4.x, at.y + 0.1, w4.z, 26 * s, ph ? SIREN_R : SIREN_B, 0.85);
      } else if (k === 'tape') {
        put('yclTape', 0, 0, 0, quat('_yctq', Math.sin(T * 0.8 + it.t) * 0.05, Math.sin(T * 1.2) * 0.03, 0)); put('yclTapeLabel', 0, 0, 0, S._yctq); put('yclRibbon', 0, 0, 0, S._yctq);
        for (let j = 0; j < 2; j++) { const f = ((T * 0.3 + j * 0.5 + it.t * 0.7) % 1); ring(0, 0, (12 + 26 * f) * s, 0.45 * (1 - f)); }
        pool(0, 0, 34, MOONLIT, 0.22, 0.05);
      } else if (k === 'mug') {
        put('yclMug', 0, 0, 0, q);
        for (let j = 0; j < 4; j++) { const f = (T * 0.4 + j / 4 + it.t) % 1; light(Math.sin(T + j) * 1.2, 8.5 + f * 9, 0, 3 + f * 5, STEAM, 0.35 * (1 - f) * smooth(0, 0.15, f)); }
        light(0, 6, 4, 18, PORCH, 0.25);
      } else if (k === 'shop') {
        put('yclShop'); m.compose(local(at, yaw, 0, 0, 0, S._o), q, S._s.set(s, s, s)); L.yclShopSign.add(m, signV(it.idx, 1));
        light(-4, 4, 8.5, 18, SHOPLIGHT, 0.4); pool(0, 12, 40, SHOPLIGHT, 0.5);
        light(0, 13.2, 9, 30, NEON, 0.3);
      } else if (k === 'ramp') {
        put('yclRamp', 0, -1.6, 0, q);
        pool(0, 10, 36, MOONLIT, 0.18);
      } else if (k === 'shift') {
        // his stick shift, standing out of the water in fourth; on "neutral" it snaps across into
        // neutral and stands straight up, rocking a little
        put('yclShiftBoot');
        const nt = it.neutral ?? 1e9, u = smooth(nt - 0.12, nt + 0.05, T), wob = T > nt ? Math.exp(-(T - nt) * 3) * Math.sin((T - nt) * 16) * 0.08 : 0;
        const lean = 0.42 * (1 - u) + wob;
        S._e.set(-lean * 0.75, yaw, lean * 0.6); const rq = (S._ycshr || (S._ycshr = new THREE.Quaternion())).setFromEuler(S._e);
        put('yclShiftRod', 0, 0.4, 0, rq); put('yclShiftFace', 0, 0.4, 0, rq);
        light(0, 26, 4, 30, MOONLIT, 0.22); pool(0, 0, 40, MOONLIT, 0.3, 0.85);
        if (T > nt - 0.05 && T < nt + 0.5) light(0, 17, 3, 12, GLINT, 1.6 * (1 - (T - nt) / 0.55));
        for (let j = 0; j < 2; j++) { const f = ((T * 0.3 + j * 0.5) % 1); ring(0, 0, (8 + 24 * f), 0.4 * (1 - f)); }
      } else if (k === 'rowboat') {
        put('yclRowboat', 0, 0, 0, quat('_ycrq', it.turn ?? 0.4));
      } else if (k === 'sparekey') {
        // the spare key, kept: the same rack, every hook empty but the last, the key on it turning
        // slowly and catching the porch light (and glinting as it's sung)
        put('yclRack');
        const sw = Math.sin(T * 1.1) * 0.08;
        put('yclKey', 8, 15.2, 2.6, quat('_ycsk', T * 0.6, 0, sw), s * 1.6);
        if (it.ring !== undefined && T > it.ring - 0.05 && T < it.ring + 0.6) light(8, 9, 4, 9, GLINT, 2.2 * (1 - (T - it.ring) / 0.65));
        light(8, 9.5, 4, 5, PORCH, 1.1 + 0.4 * Math.sin(T * 2.3));
        light(0, 19.6, 3.2, 5, PORCH, 1.6); light(0, 15, 5, 34, PORCH, 0.5); pool(0, 6, 50, PORCH, 0.6);
      }
    },
    // his face on a pole
    yclPole(S, it, p, q) {
      const L = S.layers; void L.yclPole; void L.yclPoster;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.yclPole.add(m); L.yclPoster.add(m);
      if (!S.track) return;
      const w = local(p, S.course.yawAt(it.t) + (it.rot || 0), 0, 15 * s, 3.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 12 * s, PAPER, 0.12);
    },
    // a depth post out in the water, its number lit
    yclDepth(S, it, p, q) {
      const L = S.layers; void L.yclDepth; void L.yclDepthPlate;
      const m = S._m, s = it.s ?? 1; p.y = -0.6; m.compose(p, q, S._s.set(s, s, s)); L.yclDepth.add(m); L.yclDepthPlate.add(m, signV(it.idx, 1));
      if (!S.track) return;
      glowAt(S, p.x, p.y + 17.4 * s, p.z, 3 * s, BEACON, 1.4, 1);
    },
    // a length of the pier, and its lamp where it has one
    yclPier(S, it, p, q, yaw) {
      const L = S.layers; void L.yclPier; void L.yclPierLamp;
      const m = S._m; p.y = it.deck ?? 1.2; m.compose(p, q, S._s.set(it.s ?? 1, 1, it.len ?? 1)); L.yclPier.add(m);
      if (!it.lamp || !S.track) return;
      const hw = 4.6 * (it.s ?? 1);
      const w = local(p, yaw, hw * it.lamp, 0, 0, S._o); m.compose(w, q, S._s.set(it.lamp, 1, 1)); L.yclPierLamp.add(m);
      const g = local(p, yaw, (hw + 1.1) * it.lamp, 6.6, 0, S._o); glowAt(S, g.x, g.y, g.z, 3.2, LAMP, 1.5); glowAt(S, g.x, g.y, g.z, 14, LAMP, 0.25);
      poolAt(S, g.x, p.y + 0.2, g.z, 18, LAMP, 0.4); poolAt(S, g.x, -0.35, g.z, 30, LAMP, 0.18);
    },
    // her lines on a lake sign
    yclSign(S, it, p) {
      const L = S.layers; void L.yclBoard; void L.yclBoardFace;
      if (!S.course) return;
      const yawF = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.45 : 0.45);
      S._e.set(0, yawF, 0); const fq = (S._ycsq2 || (S._ycsq2 = new THREE.Quaternion())).setFromEuler(S._e);
      const base = it.h ?? 0, s = it.s ?? 1;
      p.y = base + 22 * s;
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s)); L.yclBoard.add(m); L.yclBoardFace.add(m, signV(it.idx, 1));
      const w = local(p, yawF, 0, 6.2 * s, 2.4 * s, S._o); glowAt(S, w.x, w.y, w.z, 3.2 * s, LAMP, 1.3); glowAt(S, p.x, p.y, p.z, 30 * s, LAMP, 0.1);
    },
    // under the water: a weed, a rock, a shaft of light
    yclWeed(S, it, p, q) { if (S.track && !S._yclWet) return; const m = S._m; p.y = it.h ?? 0; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); WS.aTint = it.tint; WS.aSeed = it.seed; S.layers.yclWeed.add(m, WS); },
    yclRock(S, it, p, q) { if (S.track && !S._yclWet) return; const m = S._m; p.y = (it.h ?? 0) - 0.4; m.compose(p, q, S._s.set(it.s, it.s * 0.8, it.s)); S.layers.yclRock.add(m); },
    yclShaft(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.yclShaft; return; }
      if (!S._yclWet) return;
      const m = S._m; S._e.set(it.tilt ?? 0.18, yaw + (it.rot2 ?? 0), it.lean ?? 0.1); (S._ycshq || (S._ycshq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = it.top ?? 70; m.compose(p, S._ycshq, S._s.set(it.w ?? 10, it.len ?? 70, 1)); SS.aSeed = it.seed; S.layers.yclShaft.add(m, SS);
    },
  },
  kits: {
    yclProps(S, z) {
      for (const c of z.at) {
        const it = { ...c, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, parts: 'yclProp', ahead: c.ahead ?? 44 };
        it.h = c.float ? 0 : (c.h ?? Math.max(0, landY(c.t, c.x)));
        if (c.sign) it.idx = S.atlas.index[c.sign];
        S.items.push(it);
      }
    },
    // pines on the land, wherever there's land
    yclPines(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.16) for (const side of [-1, 1]) {
        const x = side * ((z.x ?? 28) + Math.pow(R(), 0.8) * (z.spread ?? 200));
        if (shoreDist(t, x) < 5 || (z.road && t < z.road[1] && t > z.road[0] && Math.abs(x - z.road[2]) < 10)) continue;
        if (R() < (z.skip ?? 0.35)) continue;
        const s = (z.s ?? 1) * (1.5 + R() * 1.3);
        S.items.push({ t: t + R() * 0.12, x, rot: R() * 6.28, s, sy: 1 + R() * 0.5, h: landY(t, x) - 0.2, parts: 'tree', pine: true, tint: col(pick(R, PINES)), seed: R() });
      }
    },
    // cabins in the trees, their windows lit
    yclCabins(S, z, R) {
      for (let t = z.from; t < z.to; t += (z.every ?? 1.4) * (0.7 + R() * 0.6)) {
        const side = z.side ?? (R() < 0.5 ? -1 : 1), x = side * ((z.x ?? 46) + R() * (z.spread ?? 80));
        if (shoreDist(t, x) < 8) continue;
        S.items.push({ t, x, rot: SIDE(side) + (R() - 0.5) * 0.5, s: 1.3 + R() * 0.6, h: landY(t, x), parts: 'house', tint: col(pick(R, CABINS)), roofTint: col(0x22242a), seed: R(), wake0: 0.75, keepLit: true, porch: R() < 0.6 });
      }
    },
    // the poles along her road, his face on every one
    yclPoles(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) S.items.push({ t, x: z.x, rot: (z.x > 0 ? -1 : 1) * 0.2 + Math.PI, s: z.s ?? 1, h: Math.max(0, landY(t, z.x)), parts: 'yclPole', seed: R() }); },
    // the depth posts, counting down
    yclDepths(S, z) { z.at.forEach(([t, x, key]) => S.items.push({ t, x, rot: FACE(x) + Math.PI, s: z.s ?? 1, idx: S.atlas.index[key], parts: 'yclDepth', ahead: 40 })); },
    // the pier, a length every few hundredths of a second of song, lamps along one side
    yclPier(S, z) {
      for (let t = z.from, i = 0; t < z.to; t += z.every ?? 0.12, i++) S.items.push({ t, x: z.x, rot: 0, s: z.w ?? 1, len: z.len ?? 1.1, deck: z.deck ?? 1.2, lamp: i % (z.lampEvery ?? 6) === 3 ? (z.lampSide ?? 1) : 0, parts: 'yclPier', ahead: 40 });
    },
    // the lake's bottom where she rides under it: weed in clumps, rocks, light coming down
    yclUnder(S, z, R) {
      const T0 = z.from, T1 = z.to;
      for (let t = T0; t < T1; t += 0.06) for (const side of [-1, 1]) {
        if (R() < 0.45) continue;
        const x = side * (12 + Math.pow(R(), 0.7) * 150);
        const clump = vnoise(t * 0.8, x / 30);
        if (clump < 0.45) continue;
        S.items.push({ t, x, rot: R() * 6.28, s: 0.9 + R() * 1.1, sy: 0.7 + R() * 0.9 + clump, h: bedY(t, x) - 0.2, tint: col(pick(R, [0x1e4a34, 0x2a5a3a, 0x3a5a2a, 0x1a3a30])), seed: R(), parts: 'yclWeed', ahead: 30 });
      }
      for (let t = T0; t < T1; t += 0.35) for (const side of [-1, 1]) if (R() < 0.6) { const x = side * (16 + R() * 120); S.items.push({ t: t + R() * 0.3, x, rot: R() * 6.28, s: 0.8 + R() * 2.2, h: bedY(t, x), parts: 'yclRock', ahead: 30 }); }
      for (let t = T0 + 0.4; t < T1; t += 0.8) S.items.push({ t, x: (R() - 0.5) * 150, rot: 0, rot2: (R() - 0.5) * 1.2, w: 8 + R() * 14, len: 60 + R() * 20, top: 72, tilt: 0.1 + R() * 0.2, lean: (R() - 0.5) * 0.3, seed: R(), parts: 'yclShaft', ahead: 26 });
    },
  },
});

export { YC, selfLit };
