// School Shooter Sweetheart. A school day, and we are small in it: in through the front doors
// and the metal detector, the halls of lockers, the note left in one with a heart sticker on
// it, the clock at noon, three lockers slamming, the siren down the hall, a classroom's
// windows full of police lights, a WANTED poster with her kiss on it, glitter, the gym done up
// for homecoming with the crown over the court. The final bell, the doors, the news vans in the
// lot at six, and the stadium's lights coming on for homecoming.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, PARTS } from './scenery.js';
import { prepare, floorAt, groundAt, Terrain } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const ALONG = (x) => (x > 0 ? 0 : Math.PI);
const FACE = (x) => Math.PI + (x > 0 ? -0.55 : 0.55);
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };

// ---------- textures: the WANTED poster, the clock's face ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function lips(g, x, y, s, color = '#c8102a') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color;
  g.beginPath(); g.moveTo(-120, 0); g.bezierCurveTo(-70, -60, -20, -40, 0, -22); g.bezierCurveTo(20, -40, 70, -60, 120, 0); g.bezierCurveTo(60, -6, -60, -6, -120, 0); g.fill();
  g.beginPath(); g.moveTo(-120, 6); g.bezierCurveTo(-60, 12, 60, 12, 120, 6); g.bezierCurveTo(70, 80, -70, 80, -120, 6); g.fill();
  g.restore();
}
function posterTexture() {
  return canvasTex(512, 720, (g, W, H) => {
    g.fillStyle = '#efe2c0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 10; g.strokeRect(16, 16, W - 32, H - 32);
    g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.font = '900 120px "Arial Black", Impact, sans-serif'; g.fillText('WANTED', W / 2, 150);
    g.fillStyle = '#d8c8a4'; g.fillRect(76, 200, W - 152, 300); g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.strokeRect(76, 200, W - 152, 300);
    lips(g, W / 2, 340, 1.25);
    g.fillStyle = '#ff4f8a'; g.beginPath(); const hx = 400, hy = 250; g.moveTo(hx, hy + 18); g.bezierCurveTo(hx - 40, hy - 10, hx - 18, hy - 40, hx, hy - 16); g.bezierCurveTo(hx + 18, hy - 40, hx + 40, hy - 10, hx, hy + 18); g.fill();
    g.fillStyle = '#2a1a10'; g.font = '900 64px "Arial Black", Impact, sans-serif'; g.fillText('SWEETHEART', W / 2, 590);
    g.font = '700 40px "Arial Narrow", Arial, sans-serif'; g.fillText('REWARD', W / 2, 660);
  });
}
function clockTexture() {
  return canvasTex(512, 512, (g, W) => {
    g.fillStyle = '#f8f6f0'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1e';
    for (let k = 0; k < 60; k++) { g.save(); g.translate(256, 256); g.rotate(k / 60 * Math.PI * 2); g.fillRect(-(k % 5 ? 2 : 6), -238, k % 5 ? 4 : 12, k % 5 ? 16 : 36); g.restore(); }
    g.font = '700 64px "Arial", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; g.fillText(String(k), 256 + Math.sin(a) * 172, 256 - Math.cos(a) * 172); }
  });
}

// ---------- the school's things, at our size ----------
const SG = {
  // the walk-through metal detector: two panels, the header, the lights in the posts
  detector() {
    const parts = [], grey = rgb(0xc8ccd4), dark = rgb(0x3a3e46);
    for (const s of [-1, 1]) { parts.push(paint(box(2.6, 28, 6, s * 12, 14, 0), grey)); parts.push(paint(box(2.8, 1.2, 6.4, s * 12, 0.6, 0), dark)); parts.push(paint(box(0.3, 18, 0.6, s * (12 - 1.35), 14, 2.9), dark)); }
    parts.push(paint(box(27, 3.4, 6.2, 0, 29.2, 0), grey));
    parts.push(paint(box(6, 1.6, 0.3, 0, 29.4, 3.2), rgb(0x1a1a1e)));
    return merge(parts);
  },
  // a locker standing open: the cabinet, the door swung out, the shelf, the note on it
  openLocker() {
    const parts = [], blue = rgb(0x2a5ac8), inside = rgb(0x1a3466);
    // hollow, open at the front: the back, the sides, top and bottom, the shelf
    parts.push(paint(box(4.4, 20, 0.3, 0, 10, -2.65), inside));
    for (const s of [-1, 1]) parts.push(paint(box(0.3, 20, 2.8, s * 2.05, 10, -1.4), blue));
    parts.push(paint(box(4.4, 0.3, 2.8, 0, 19.85, -1.4), blue)); parts.push(paint(box(4.4, 0.3, 2.8, 0, 0.15, -1.4), inside));
    parts.push(paint(box(3.8, 0.3, 2.5, 0, 15, -1.4), rgb(0x8a8e96)));
    // the door, hinged on the far side and swung right open, so you see in as you come
    const door = [box(4.2, 19.6, 0.3, 2.1, 10, 0), box(2.6, 0.3, 0.32, 2.1, 17.4, 0.02), box(2.6, 0.3, 0.32, 2.1, 16.6, 0.02), box(2.6, 0.3, 0.32, 2.1, 15.8, 0.02), box(0.4, 2.4, 0.5, 3.6, 10, 0.2)];
    for (const g of door) { g.rotateY(-1.745); g.translate(-2.1, 0, 0); parts.push(paint(g, g === door[0] ? blue : rgb(0x1a3a7a))); }
    return merge(parts);
  },
  // the note: folded pink paper, propped on the shelf, a heart sticker on it
  note() {
    const parts = [];
    // folded in half and stood on the shelf, the two halves leaning together at the top
    const a = box(3.6, 2.6, 0.08, 0, 1.3, 0); a.rotateX(-0.3); a.translate(0, 15.2, -0.55); parts.push(paint(a, rgb(0xffc0d8)));
    const b = box(3.6, 2.6, 0.08, 0, 1.3, 0); b.rotateX(0.3); b.translate(0, 15.2, -2.09); parts.push(paint(b, rgb(0xff9ac0)));
    const h = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.1, bevelEnabled: false, curveSegments: 12 }); h.scale(0.66, 0.66, 1); h.rotateX(-0.3); h.translate(0, 16.5, -0.82); parts.push(paint(h, rgb(0xff1a4a)));
    return merge(parts);
  },
  // a locker door on its own, for the ones that slam (hinged at x = 0, opening to -z)
  lockerDoor() { const parts = [box(4.2, 19.6, 0.3, 2.1, 10, 0)]; for (const y of [17.4, 16.6, 15.8, 4.2, 3.4]) parts.push(box(2.6, 0.3, 0.34, 2.1, y, 0.02)); parts.push(box(0.4, 2.4, 0.5, 3.6, 10, 0.2)); return merge(parts); },
  // the clock: the rim, the face (its own layer), the hands
  clockRim() { const parts = []; parts.push(paint(new THREE.TorusGeometry(9.2, 0.9, 10, 48), rgb(0x2a2a30))); parts.push(paint(cyl(9, 9, 1.2, 48, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, -0.7), rgb(0x2a2a30))); parts.push(paint(box(0.4, 26, 0.4, 0, 22, -0.4), rgb(0x6a6a70))); return merge(parts); },
  sClockFace() { const g = new THREE.CircleGeometry(8.8, 48); g.translate(0, 0, 0.0); return g; },
  hand(L, w) { const g = box(w, L, 0.2, 0, L / 2 - 0.8, 0.4); return g; },
  // a red beacon on its bracket, for the siren
  beacon() { const parts = []; parts.push(paint(box(2.4, 1.0, 2.4, 0, 0, 0), rgb(0x2a2a30))); parts.push(paint(cyl(1.0, 1.1, 2.0, 16, 0, 1.4, 0), rgb(0xff2a2a))); parts.push(paint(sph(1.0, 1, 0.6, 1, 0, 2.4, 0, 12, 6), rgb(0xff3a3a))); return merge(parts); },
  // a desk with its chair, the classroom kind (faces +z)
  desk() {
    const parts = [], wood = rgb(0xc89a5a), steel = rgb(0x4a5058), blue = rgb(0x2a4a8a);
    parts.push(paint(box(9, 0.6, 6, 0, 9, 1.5), wood));
    for (const x of [-4, 4]) for (const z of [-1, 4]) parts.push(paint(box(0.4, 9, 0.4, x, 4.5, z), steel));
    parts.push(paint(box(6, 0.6, 5, 0, 5.4, -5), blue));
    parts.push(paint(box(6, 6, 0.5, 0, 9, -7.4), blue));
    for (const x of [-2.6, 2.6]) for (const z of [-3, -7]) parts.push(paint(box(0.4, 5.4, 0.4, x, 2.7, z), steel));
    return merge(parts);
  },
  // a corkboard in its frame (the poster is its own layer)
  corkboard() { const parts = []; parts.push(paint(box(30, 20.4, 0.6, 0, 0, 0), rgb(0xa87a4a))); for (const [w, h, x, y] of [[31, 1, 0, 10.4], [31, 1, 0, -10.4], [1, 21.8, -15.4, 0], [1, 21.8, 15.4, 0]]) parts.push(paint(box(w, h, 1.2, x, y, 0.2), rgb(0x6a4a2a))); const R = seeded(83); for (let k = 0; k < 6; k++) { const x = (k % 2 ? 1 : -1) * (10.6 + R() * 1.2), y = -6 + Math.floor(k / 2) * 6.5 + R(); parts.push(paint(box(4.6, 5.6, 0.1, x, y, 0.4), rgb(pick(R, [0xffffff, 0xfff4a0, 0xb8e0ff, 0xffd0e0])))); } return merge(parts); },
  poster() { const g = new THREE.PlaneGeometry(13, 18.3); g.translate(0, 0, 0.55); return g; },
  // a banner hung across the gym (the word is the sign layer)
  banner() { const parts = []; parts.push(paint(box(64, 20.4, 0.4, 0, 0, 0), rgb(0x2a1a6a))); for (const s of [-1, 1]) parts.push(paint(box(0.3, 34, 0.3, s * 30, 27, 0), rgb(0x8a8a90))); return merge(parts); },
  bannerFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(8, 8, 1); g.translate(0, 0, 0.25); return g; },
  // the crown: a gold band, its points, jewels (hung over the court; and the one at the end)
  crown() {
    const parts = [], gold = rgb(0xf0c040), R = seeded(9);
    const band = new THREE.CylinderGeometry(7, 7, 4.4, 40, 1, true); parts.push(paint(band, gold));
    parts.push(paint(new THREE.TorusGeometry(7, 0.5, 8, 40).rotateX(Math.PI / 2).translate(0, -2.2, 0), gold));
    parts.push(paint(new THREE.TorusGeometry(7, 0.4, 8, 40).rotateX(Math.PI / 2).translate(0, 2.2, 0), gold));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, x = Math.cos(a) * 7, z = Math.sin(a) * 7;
      const pt = new THREE.ConeGeometry(1.5, 6, 8); pt.translate(x, 5.2, z); parts.push(paint(pt, gold));
      parts.push(paint(sph(0.8, 1, 1, 1, x, 8.4, z, 10, 8), rgb(0xfff4c0)));
      parts.push(paint(sph(0.9, 1, 1.2, 0.5, Math.cos(a + 0.4) * 7.2, 0, Math.sin(a + 0.4) * 7.2, 10, 8), rgb(pick(R, [0xff2a6a, 0x3a8aff, 0x2ae08a, 0xffffff]))));
    }
    return merge(parts);
  },
  // balloons in a bunch, on their strings
  balloons() {
    const parts = [], R = seeded(29);
    for (let k = 0; k < 7; k++) { const x = (R() - 0.5) * 6, y = 14 + R() * 8, z = (R() - 0.5) * 6, c = rgb(pick(R, [0xff3d8b, 0xffffff, 0x8a5aff, 0xffd23a, 0x3ad8ff])); parts.push(paint(sph(2.2, 1, 1.18, 1, x, y, z, 14, 10), c)); parts.push(paint(box(0.06, y - 2, 0.06, x * 0.5, (y - 2) / 2, z * 0.5), rgb(0xe8e8e8))); }
    return merge(parts);
  },
  // the bleachers: rows stepping back and up (along x, facing +z)
  bleachers(n = 6) { const parts = []; for (let k = 0; k < n; k++) { parts.push(paint(box(60, 0.8, 4.2, 0, 2.4 + k * 3.2, -k * 4.2), rgb(0xd8b878))); parts.push(paint(box(60, 2.4 + k * 3.2, 0.4, 0, (2.4 + k * 3.2) / 2, -k * 4.2 + 2.1), rgb(0x6a6a72))); } return merge(parts); },
  // the school bell on the wall: the gong, the striker
  bell() { const parts = []; parts.push(paint(cyl(4.4, 4.4, 1.2, 32, 0, 0, 0).rotateX(Math.PI / 2), rgb(0xd01818))); parts.push(paint(cyl(1.6, 1.6, 2.4, 16, 0, 0, -1.4).rotateX(Math.PI / 2), rgb(0x3a3a40))); return merge(parts); },
  striker() { const g = box(0.5, 3, 0.5, 0, 1.5, 0); const b = sph(0.8, 1, 1, 1, 0, 3.2, 0, 10, 8); return merge([paint(g, rgb(0x4a4a50)), paint(b, rgb(0x6a6a70))]); },
  // a light tower: the pole, the bank of lamps (the light is glows), at the stadium
  tower() { const parts = []; parts.push(paint(cyl(0.9, 1.4, 52, 10, 0, 26, 0), rgb(0x8a8e96))); parts.push(paint(box(18, 10, 1.6, 0, 55, 0), rgb(0x3a3e46))); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) parts.push(paint(box(2.2, 2.2, 0.8, -7.5 + i * 3, 52 + j * 3, 0.9), rgb(0xe8eef4))); return merge(parts); },
  // the goalposts: yellow, an H on its stalk
  goal() { const y = rgb(0xffd23a), parts = []; parts.push(paint(cyl(0.5, 0.6, 12, 10, 0, 6, -2), y)); parts.push(paint(box(0.8, 0.8, 4, 0, 12, 0), y)); parts.push(paint(box(22, 0.9, 0.9, 0, 12, 2), y)); for (const s of [-1, 1]) parts.push(paint(cyl(0.4, 0.4, 24, 10, s * 11, 24, 2), y)); return merge(parts); },
  // a paper banner hung across the hall on two strings, tape at the corners (his words are the sign layer)
  paperBanner() {
    const parts = [];
    for (const s of [-1, 1]) { parts.push(paint(box(0.14, 40, 0.14, s * 14.6, 24.9, 0), rgb(0xe8e4dc))); parts.push(paint(box(3.2, 1.5, 0.12, s * 14.6, 4.3, 0.42), rgb(0xd8c8a0))); }
    return merge(parts);
  },
  paperFace() {
    const g = new THREE.PlaneGeometry(7.5, 2.35, 14, 1); g.scale(4.2, 4.2, 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { p.setZ(i, Math.sin(p.getX(i) * 0.33) * 0.3); uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); }
    g.computeVertexNormals(); return g;
  },
  // the sign out front: a brick base and posts, a board, a cap (the letters are the sign layer)
  letterBoard() {
    const parts = [], brick = rgb(0x8a3a2a);
    parts.push(paint(box(36, 4, 3.4, 0, 2, 0), brick));
    for (const s of [-1, 1]) parts.push(paint(box(3, 17, 3.4, s * 18, 8.5, 0), brick));
    parts.push(paint(box(33, 11.8, 1.2, 0, 10, -0.4), rgb(0x1a1a1e)));
    parts.push(paint(box(40, 1.4, 4, 0, 17.6, 0), rgb(0xd8d4cc)));
    return merge(parts);
  },
  letterFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(4.25, 4.75, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 10, 0.3); return g; },
  // a news van: the box, the cab, two bands of colour (no names on it), the mast up with its dish, a dish on the roof
  newsVan() {
    const parts = [], white = rgb(0xf0f0f2), dark = rgb(0x1a1c22);
    parts.push(paint(box(5.2, 5.6, 10, 0, 3.9, -1.5), white));
    parts.push(paint(box(5.0, 3.6, 4.0, 0, 2.9, 5.4), white));
    parts.push(paint(box(4.6, 1.6, 0.2, 0, 3.9, 7.42), rgb(0x2a3440)));
    for (const s of [-1, 1]) { parts.push(paint(box(0.1, 0.8, 13.4, s * 2.62, 3.5, 0.2), rgb(0x2a6ad8))); parts.push(paint(box(0.1, 0.4, 13.4, s * 2.62, 2.6, 0.2), rgb(0xd8203a))); }
    for (const z of [-4.6, 4.6]) for (const s of [-1, 1]) { const w = cyl(1.1, 1.1, 0.8, 14, 0, 0, 0); w.rotateZ(Math.PI / 2); w.translate(s * 2.4, 1.1, z); parts.push(paint(w, dark)); }
    parts.push(paint(cyl(0.3, 0.42, 18, 8, 0, 15.7, -4.5), rgb(0xc8ccd4)));
    const dish = new THREE.SphereGeometry(2.6, 18, 6, 0, Math.PI * 2, 0, 0.9); dish.rotateX(-2.05); dish.translate(0, 24.6, -4.5); parts.push(paint(dish, rgb(0xe8eaee)));
    const dish2 = new THREE.SphereGeometry(1.7, 16, 6, 0, Math.PI * 2, 0, 0.9); dish2.rotateX(-0.9); dish2.translate(0, 7.4, 0.8); parts.push(paint(dish2, rgb(0xe8eaee)));
    return merge(parts);
  },
  // a police car: dark, white doors, the light bar on top (its lights are glows), no markings
  cruiser() {
    const parts = [], dark = rgb(0x14161c), glassC = rgb(0x2a3440);
    parts.push(paint(box(4.4, 1.5, 10, 0, 1.6, 0), dark));
    parts.push(paint(box(4.46, 1.2, 4.2, 0, 1.75, -0.2), rgb(0xe8e8ec)));
    parts.push(paint(box(3.8, 1.4, 5, 0, 3.0, -0.6), glassC));
    parts.push(paint(box(3.9, 0.25, 5.1, 0, 3.75, -0.6), dark));
    parts.push(paint(box(3.2, 0.45, 0.9, 0, 4.1, -0.4), rgb(0x2a2a30)));
    parts.push(paint(box(1.5, 0.4, 0.8, -0.8, 4.45, -0.4), rgb(0xff2a2a)));
    parts.push(paint(box(1.5, 0.4, 0.8, 0.8, 4.45, -0.4), rgb(0x2a5aff)));
    for (const z of [-3.2, 3.2]) for (const s of [-1, 1]) { const w = cyl(0.85, 0.85, 0.6, 14, 0, 0, 0); w.rotateZ(Math.PI / 2); w.translate(s * 2.1, 0.85, z); parts.push(paint(w, rgb(0x0e0e10))); }
    return merge(parts);
  },
  // a string of pennants across the hall, sagging in the middle
  pennants() {
    const parts = [], cols = [0xff3d6e, 0xffd23a, 0x8a5aff, 0xffffff], n = 15, sag = (u) => -Math.sin(Math.PI * u) * 5;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(1.6, 0); s.lineTo(0, -4.2); s.lineTo(-1.6, 0);
      const tri = new THREE.ShapeGeometry(s); tri.translate(-28 + 56 * u, sag(u), 0); parts.push(paint(tri, rgb(cols[k % cols.length])));
    }
    for (let k = 0; k < 16; k++) { const u0 = k / 16, u1 = (k + 1) / 16; parts.push(paint(tube(V(-28 + 56 * u0, sag(u0)), V(-28 + 56 * u1, sag(u1)), 0.1, 4), rgb(0xe8e8e8))); }
    return merge(parts);
  },
  // a painted line on the ground (scaled per use: the yard lines, the parking spaces)
  stripe() { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; },
  // a heart sticker, die-cut with its white edge
  stickerHeart() {
    const w = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.1, bevelEnabled: false, curveSegments: 16 }); w.scale(1.16, 1.16, 1); w.translate(0, 0.03, 0);
    const r = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.1, bevelEnabled: false, curveSegments: 16 }); r.translate(0, 0, 0.06);
    return merge([paint(w, rgb(0xffffff)), paint(r, rgb(0xff1a4a))]);
  },
};
// a tube from a to b
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function V(x, y, z = 0) { return new THREE.Vector3(x, y, z); }
function heartShape() {
  const s = new THREE.Shape();
  for (let i = 0; i <= 48; i++) { const t = (i / 48) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); if (i) s.lineTo(x / 17, y / 17); else s.moveTo(x / 17, y / 17); }
  return s;
}

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const TT = { aTint: 3 };
let POSTER = null, CLOCK = null, KISS = null;
extend({
  layers: {
    detector: (M) => [SG.detector(), VC(M, 'sMetal', { roughness: 0.35, metalness: 0.3, emissive: 0x1a1c20 }), 3, {}],
    openLocker: (M) => [SG.openLocker(), VC(M, 'sLocker', { roughness: 0.5, metalness: 0.1, emissive: 0x16306a }), 3, {}],
    note: (M) => [SG.note(), VC(M, 'sNote', { roughness: 0.7, metalness: 0, emissive: 0x4a2030 }), 3, {}],
    lockerDoor: (M) => [SG.lockerDoor(), M.lockerDoorM || (M.lockerDoorM = new THREE.MeshStandardMaterial({ color: 0x2a5ac8, roughness: 0.5, metalness: 0.1, emissive: 0x1a3a8a })), 12, {}],
    clockRim: (M) => [SG.clockRim(), VC(M, 'sMetal', { roughness: 0.35, metalness: 0.3, emissive: 0x1a1c20 }), 3, {}],
    sClockFace: (M) => [SG.sClockFace(), M.sClockM || (M.sClockM = new THREE.MeshBasicMaterial({ map: (CLOCK = CLOCK || clockTexture()) })), 3, {}],
    clockHand: (M) => [SG.hand(7, 0.7), new THREE.MeshBasicMaterial({ color: 0x14141a }), 9, {}],
    clockSecond: (M) => [SG.hand(8, 0.25), new THREE.MeshBasicMaterial({ color: 0xd81a1a }), 3, {}],
    beacon: (M) => [SG.beacon(), VC(M, 'sBeacon', { roughness: 0.3, metalness: 0.1, emissive: 0x6a0808 }), 90, {}],
    desk: (M) => [SG.desk(), VC(M, 'sDesk', { roughness: 0.6, metalness: 0.1, emissive: 0x100c08 }), 200, {}],
    corkboard: (M) => [SG.corkboard(), VC(M, 'sCork', { roughness: 0.9, metalness: 0, emissive: 0x140e08 }), 6, {}],
    poster: (M) => [SG.poster(), M.posterM || (M.posterM = new THREE.MeshStandardMaterial({ map: (POSTER = POSTER || posterTexture()), emissiveMap: POSTER, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.9 })), 6, {}],
    banner: (M) => [SG.banner(), VC(M, 'sCloth', { roughness: 0.85, metalness: 0, emissive: 0x0a0618 }), 4, {}],
    bannerFace: (M) => [SG.bannerFace(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    crown: (M) => [SG.crown(), VC(M, 'sGold', { roughness: 0.25, metalness: 0.4, emissive: 0x5a3a08 }), 3, {}],
    balloons: (M) => [SG.balloons(), VC(M, 'sBalloon', { roughness: 0.25, metalness: 0.05, emissive: 0x1a1018 }), 90, {}],
    bleachers: (M) => [SG.bleachers(), VC(M, 'sBleach', { roughness: 0.6, metalness: 0.1, emissive: 0x0e0c08 }), 80, {}],
    schoolBell: (M) => [SG.bell(), VC(M, 'sBell', { roughness: 0.3, metalness: 0.4, emissive: 0x3a0606 }), 3, {}],
    striker: (M) => [SG.striker(), VC(M, 'sMetal', { roughness: 0.35, metalness: 0.3, emissive: 0x1a1c20 }), 3, {}],
    lightTower: (M) => [SG.tower(), VC(M, 'sTower', { roughness: 0.5, metalness: 0.4, emissive: 0x101214 }), 20, {}],
    goal: (M) => [SG.goal(), VC(M, 'sGoal', { roughness: 0.4, metalness: 0.2, emissive: 0x3a2a04 }), 4, {}],
    paperBanner: (M) => [SG.paperBanner(), VC(M, 'sPaper', { roughness: 0.9, metalness: 0, emissive: 0x2a2620 }), 8, {}],
    paperFace: (M) => [SG.paperFace(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    letterBoard: (M) => [SG.letterBoard(), VC(M, 'sBrick', { roughness: 0.85, metalness: 0, emissive: 0x100604 }), 3, {}],
    letterFace: (M) => [SG.letterFace(), M.sign, 3, { aIdx: 1, aWake: 2 }],
    newsVan: (M) => [SG.newsVan(), VC(M, 'sVan', { roughness: 0.4, metalness: 0.2, emissive: 0x18181c }), 16, {}],
    cruiser: (M) => [SG.cruiser(), VC(M, 'sCruiser', { roughness: 0.3, metalness: 0.4, emissive: 0x0a0a0e }), 16, {}],
    pennants: (M) => [SG.pennants(), VC(M, 'sPennant', { roughness: 0.8, metalness: 0, emissive: 0x1a1018, side: THREE.DoubleSide }), 30, {}],
    kiss: (M) => [new THREE.PlaneGeometry(1, 1), M.kissM || (M.kissM = new THREE.MeshBasicMaterial({ map: (KISS = KISS || canvasTex(256, 256, (g) => lips(g, 128, 128, 0.95, '#c80a26'))), transparent: true, depthWrite: false, side: THREE.DoubleSide })), 4, {}],
    sticker: (M) => [SG.stickerHeart(), VC(M, 'sSticker', { roughness: 0.15, metalness: 0.1, emissive: 0x5a0614 }), 4, {}],
    stripe: (M) => [SG.stripe(), M.stripeM || (M.stripeM = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.9, emissive: 0x2a2a2a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), 700, {}],
  },
  parts: {
    // the arch you go through; its lights go from green to red as you pass
    detector(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.sy, it.s)); S.layers.detector.add(m);
      const near = (S.tNow ?? 0) > it.t - 0.15, yaw = S.course.sample(it.t).yaw;
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const w = local(p, yaw, s * (12 - 1.35) * it.s, (7 + k * 3) * it.sy, 3.2 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 1.8 * it.s, near ? [1, 0.1, 0.1] : [0.2, 1, 0.4], near ? 2.2 : 1.2, near ? 2 : 0); }
    },
    openLocker(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.openLocker.add(m); S.layers.note.add(m);
      const w = local(p, yaw, 0, 16.4 * s, -1.4 * s, S._o); glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.5, 0.7], 0.7);
    },
    // a locker door that slams shut at its moment (it.slam), the bang with it
    slamDoor(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, u = clamp((T - (it.slam - 0.09)) / 0.09, 0, 1);
      const open = u < 1 ? (1 - u * u) * (it.open ?? 1.7) : Math.max(0, Math.sin((T - it.slam) * 28) * 0.08 * Math.exp(-(T - it.slam) * 9));
      const e = S._de || (S._de = new THREE.Euler()); e.set(0, yaw - open, 0);
      const dq = S._dq || (S._dq = new THREE.Quaternion()); dq.setFromEuler(e);
      const m = S._m, s = it.s ?? 1; m.compose(p, dq, S._s.set(s * (it.sx ?? 1), s, s)); S.layers.lockerDoor.add(m);
    },
    clock(S, it, p, q, yaw) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.clockRim.add(m); S.layers.sClockFace.add(m);
      // noon: both hands up; the second hand ticking round
      const T = S.tNow ?? 0, hq = S._hq || (S._hq = new THREE.Quaternion()), e2 = S._he || (S._he = new THREE.Euler());
      for (const [a, L, zk] of [[0.02, 0.8, 1], [-0.04, 1, 1.8]]) { e2.set(0, h + Math.PI, a); hq.setFromEuler(e2); m.compose(p, hq, S._s.set(s, s * L, s * zk)); S.layers.clockHand.add(m); }
      e2.set(0, h + Math.PI, -Math.floor(T) * Math.PI / 30); hq.setFromEuler(e2); m.compose(p, hq, S._s.set(s, s, s)); S.layers.clockSecond.add(m);
    },
    // the siren down the hall: a red beacon on the wall, flashing
    beacon(S, it, p, q) {
      const on = S.alarm ?? 0; const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.beacon.add(m);
      if (on > 0.02) { glowAt(S, p.x, p.y + 1.8 * it.s, p.z, 9 * it.s, [1, 0.08, 0.06], 2.4 * on, it.seed > 0.5 ? 2 : 3); poolAt(S, p.x, (S.floorFn ? S.floorFn(it.t, it.x) : 0) + 0.1, p.z, 34, [1, 0.1, 0.08], 0.6 * on); }
    },
    desk(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.desk.add(m); },
    corkboard(S, it, p, q, yaw) {
      const posters = S.layers.poster;   // made now, not the first time it's drawn
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 17);
      const fq = it.face ? q : faceRoad(S, it), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s));
      if (!it.bare) S.layers.corkboard.add(m);
      if (it.wanted) posters.add(m);
      glowAt(S, p.x, p.y + 6 * s, p.z, 12 * s, [1, 0.95, 0.85], 0.25);
    },
    banner(S, it, p, q) { const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e); const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.banner.add(m); S.layers.bannerFace.add(m, { aIdx: it.idx, aWake: [1, 0] }); },
    crown(S, it, p, q) {
      const T = S.tNow ?? 0; S._e.set(0.15 * Math.sin(T * 0.8), T * 0.5, 0.1 * Math.cos(T * 0.7)); const cq = (S._q5 || (S._q5 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, cq, S._s.set(s, s, s)); S.layers.crown.add(m);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + T * 0.5; glowAt(S, p.x + Math.cos(a) * 7 * s, p.y + 8.4 * s, p.z - Math.sin(a) * 7 * s, 2.4 * s, [1, 0.95, 0.7], 1.2 * (0.6 + 0.4 * Math.sin(T * 6 + k))); }
      glowAt(S, p.x, p.y, p.z, 24 * s, [1, 0.8, 0.4], 0.3);
    },
    balloons(S, it, p, q) { const T = S.tNow ?? 0; S._e.set(0, it.rot + Math.sin(T * 0.6 + it.seed * 9) * 0.2, 0); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e); const m = S._m, s = it.s ?? 1; m.compose(p, bq, S._s.set(s, s, s)); S.layers.balloons.add(m); },
    bleachers(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bleachers.add(m); },
    // the bell on the wall, ringing at its moment
    schoolBell(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, ring = T > it.ring && T < it.ring + 1.6;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0.5 ? -0.5 : it.x < -0.5 ? 0.5 : 0), 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.schoolBell.add(m);
      const by = new THREE.Euler().setFromQuaternion(fq, 'YXZ').y;
      S._e.set(0, by, ring ? Math.sin(T * 60) * 0.5 : 0); const sq = (S._q7 || (S._q7 = new THREE.Quaternion())).setFromEuler(S._e);
      const w = local(p, by, 0, -6.2 * s, 2 * s, S._o); m.compose(w, sq, S._s.set(s, s, s)); S.layers.striker.add(m);
    },
    lightTower(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.lightTower.add(m);
      const on = S.stadium ?? 0; if (on < 0.02) return;
      for (let i = 0; i < 3; i++) { const w = local(p, yaw, -6 + i * 6, 55, 2, S._o); glowAt(S, w.x, w.y, w.z, 16, [1, 0.96, 0.86], 1.4 * on); }
      glowAt(S, p.x, p.y + 55, p.z, 70, [1, 0.94, 0.8], 0.25 * on);
    },
    goal(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.goal.add(m); },
    // a paper banner across the hall with his words painted on it, hung where you pass under it
    spiritBanner(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 13);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.paperBanner.add(m); S.layers.paperFace.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
    },
    // the school's sign out front, his words on it in black letters, two lamps on it
    letterBoard(S, it, p) {
      if (S.floorFn) p.y = S.floorFn(it.t, it.x);
      const fq = faceRoad(S, it), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.letterBoard.add(m); S.layers.letterFace.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5);
      for (const x of [-10, 10]) { const w = local(p, by, x * s, 1.5 * s, 4 * s, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, [1, 0.95, 0.85], 0.8); }
    },
    newsVan(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.newsVan.add(m);
      const w = local(p, yaw, 0, 27.4 * s, -4.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.8 * s, [1, 0.15, 0.1], 1.6, 1);
      const f = local(p, yaw, 0, 3.4 * s, 7.8 * s, S._o); glowAt(S, f.x, f.y, f.z, 4 * s, [1, 0.95, 0.85], 0.6);
    },
    // a police car, its lights going
    cruiser(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.cruiser.add(m);
      const a = it.seed > 0.5 ? 2 : 3;
      for (const [x, c, md] of [[-0.8, [1, 0.08, 0.06], a], [0.8, [0.15, 0.3, 1], 5 - a]]) { const w = local(p, yaw, x * s, 4.5 * s, -0.4 * s, S._o); glowAt(S, w.x, w.y, w.z, 4.4 * s, c, 2.6, md); }
      poolAt(S, p.x, p.y + 0.1, p.z, 20 * s, [0.6, 0.2, 0.8], 0.25);
    },
    pennants(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 16);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.pennants.add(m);
    },
    // a lipstick kiss on a locker, a heart sticker on another, flat on the wall
    decal(S, it, p, q) {
      const kisses = S.layers.kiss, stickers = S.layers.sticker;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 12);
      const m = S._m, s = it.s ?? 1;
      if (it.kind === 'kiss') { m.compose(p, q, S._s.set(s * 10, s * 10, 1)); kisses.add(m); }
      else { m.compose(p, q, S._s.set(s * 5, s * 5, s * 5)); stickers.add(m); glowAt(S, p.x, p.y, p.z, 8 * s, [1, 0.3, 0.45], 0.3); }
    },
    stripe(S, it, p, q) { const m = S._m; p.y += 0.12; m.compose(p, q, S._s.set(it.w, 1, it.l)); S.layers.stripe.add(m); },
  },
  kits: {
    detector(S, z) {
      const c = S.course; prepare(c, S.plan);
      const g = floorAt(c, z.at), y = c.sample(z.at).y;
      S.items.push({ t: z.at, x: 0, rot: 0, h: g, s: 1, sy: Math.max(1, (y - g + 9) / 29), parts: 'detector', ahead: 30 });
    },
    openLocker(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'openLocker', ahead: z.ahead })); },
    slams(S, z) { for (const [t, x, slam] of z.at) S.items.push(onGround(S, { t, x, rot: z.face ? Math.PI : SIDE(x), s: z.s ?? 1, sx: z.sx, open: z.open, slam, parts: 'slamDoor', ahead: z.ahead })); },
    clock(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, s: z.s ?? 1, h: S.course.sample(z.at).y + (z.lift ?? 12), parts: 'clock', ahead: z.ahead }); },
    beacons(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 28.5), rot: SIDE(side) + Math.PI, s: z.s ?? 1.4, seed: R(), parts: 'beacon', h: floorAt(S.course, t) + (z.y ?? 24), ahead: z.ahead })); },
    desks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.28) for (const side of [-1, 1]) for (const xx of [20, 33]) S.items.push(onGround(S, { t: t + (R() - 0.5) * 0.04, x: side * xx, rot: (R() - 0.5) * 0.12, s: z.s ?? 1, parts: 'desk', ahead: z.ahead ?? 24 })); },
    corkboard(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: z.face ? Math.PI : 0, face: z.face, bare: z.bare, s: z.s ?? 1.2, y: z.y, wanted: z.wanted, parts: 'corkboard', ahead: z.ahead })); },
    banner(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, s: z.s ?? 1, h: S.course.sample(z.at).y + (z.lift ?? 14), idx: S.atlas.index[z.sign], parts: 'banner', ahead: z.ahead ?? 30 }); },
    crown(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, s: z.s ?? 1, h: z.ground ? groundAt(S.course, z.at, z.x ?? 0) + (z.y ?? 10) : S.course.sample(z.at).y + (z.lift ?? 10), parts: 'crown', ahead: z.ahead ?? 30 }); },
    balloons(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onGround(S, { t: t + R() * 0.2, x: side * (z.x ?? 24) + (R() - 0.5) * 8, rot: R() * 6, s: z.s ?? 1.4, seed: R(), parts: 'balloons', ahead: z.ahead ?? 26 })); },
    bleachers(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 40), rot: SIDE(side), s: z.s ?? 1, parts: 'bleachers', ahead: z.ahead ?? 40 })); },
    schoolBell(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, s: z.s ?? 1.4, ring: z.ring, parts: 'schoolBell', h: floorAt(S.course, z.at) + (z.y ?? 26), ahead: z.ahead })); },
    lightTowers(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 2.4) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 62), rot: SIDE(side) + Math.PI, parts: 'lightTower', ahead: 46 })); },
    goal(S, z) { S.items.push(onGround(S, { t: z.at, x: 0, rot: 0, s: z.s ?? 1.6, parts: 'goal', ahead: 40 })); },
    // the lot outside: lamp posts along it, the spaces painted either side
    lot(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.lampX ?? 50), rot: SIDE(side), parts: 'lamp', seed: R(), dim: z.dim ?? 0.9 }));
      for (let t = z.from; t < z.to; t += 0.14) for (const side of [-1, 1]) for (const xc of z.rows ?? [26, 42]) S.items.push(onGround(S, { t, x: side * xc, rot: 0, w: 12, l: 0.35, parts: 'stripe', ahead: 30 }));
    },
    pennants(S, z) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, h: 0, parts: 'pennants', ahead: z.ahead ?? 30 }); },
    newsVans(S, z) { for (const [t, x, turn] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x) + Math.PI / 2 + (turn ?? 0), s: z.s ?? 1.5, parts: 'newsVan', ahead: 40 })); },
    cruisers(S, z, R) { for (const [t, x, turn] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x) + Math.PI / 2 + (turn ?? 0), s: z.s ?? 1.4, seed: R(), parts: 'cruiser', ahead: 40 })); },
    // the yard lines across the field
    decals(S, z) { for (const [t, x, kind, y, s] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x), kind, y, s, parts: 'decal', ahead: z.ahead })); },
    yardLines(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.2) S.items.push(onGround(S, { t, x: 0, rot: 0, w: z.w ?? 96, l: 0.8, parts: 'stripe', ahead: 40 })); },
  },
});

function faceRoad(S, it) { const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); return (S._q8 || (S._q8 = new THREE.Quaternion())).setFromEuler(S._e); }

// ---------- the rooms ----------
const flat = (W = 30, H = 30) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const SCHOOL = {
  rings: { flat },
  ringOf: () => 'flat',
  styles: { hall: 0, class: 1, gym: 2 },
  dims: { hall: [30, 36], class: [38, 30], gym: [62, 46] },
  lights: (id) => ({ 0: [28.8, 14.4], 1: [28.8, 14.4], 2: [40, 20] }[id] || null),
};

function schoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xfff4e0) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() },
      uAlarm: { value: 0 }, uPolice: { value: 0 }, uLocker: { value: new THREE.Color(0x2a5ac8) }, uStripe: { value: new THREE.Color(0xd82a3a) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uAlarm, uPolice;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow, uLocker, uStripe;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool onWall = part == 1 || part == 2;
        vec2 fx = st > 1.5 ? vec2(40.0, 20.0) : vec2(28.8, 14.4);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.6 + 0.5 * exp(-dl * dl / (fx.x * fx.x * 0.15));
        vec3 col;
        if (part == 8) { col = vec3(0.42, 0.44, 0.48); }
        else if (part == 7) {
          // the school's front: red brick, rows of white-framed windows, the band of concrete over the doors
          vec2 b = vec2(x / 2.6 + mod(floor(h / 1.0), 2.0) * 0.5, h / 1.0);
          col = vec3(0.5, 0.18, 0.12) * (0.78 + 0.3 * h2(floor(b))) * (0.8 + 0.2 * step(0.06, fract(b.x)) * step(0.08, fract(b.y)));
          vec2 wc = vec2(mod(x + 9.0, 18.0) - 9.0, mod(h - 6.0, 20.0) - 10.0);
          float win = step(box2(wc, vec2(5.5, 6.5)), 0.0) * step(18.0, abs(x)) * step(6.0, h) * step(h, 62.0);
          float fr = step(box2(wc, vec2(6.2, 7.2)), 0.0) * step(18.0, abs(x)) * step(6.0, h) * step(h, 62.0);
          col = mix(col, vec3(0.9), fr);
          col = mix(col, mix(uSkyLow, uSkyTop, 0.5) * 0.6 + uWarm * 0.3 * step(0.5, h2(floor(vec2((x + 9.0) / 18.0, (h - 6.0) / 20.0)))), win);
          col = mix(col, vec3(0.72, 0.7, 0.66), step(abs(h - 31.0), 1.8) * step(abs(x), 30.0));
          col *= uLight;
        } else if (part == 0) {
          if (st > 1.5) {
            // the gym floor: maple boards, the court's painted lines
            float id = floor(x / 1.8);
            col = vec3(0.78, 0.56, 0.3) * (0.82 + 0.18 * h2(vec2(id, floor((along + h2(vec2(id, 3.0)) * 30.0) / 30.0))) + 0.12 * n2(vec2(x * 0.5, along * 0.05)));
            col *= 0.86 + 0.14 * smoothstep(0.0, 0.04, fract(x / 1.8));
            float ca = mod(along, 160.0) - 80.0;
            float lines = step(abs(abs(x) - 52.0), 0.5) + step(abs(ca), 0.5) + step(abs(length(vec2(x, ca)) - 18.0), 0.5) + step(abs(length(vec2(x, abs(ca) - 80.0)) - 38.0), 0.5) * step(abs(x), 38.0);
            col = mix(col, vec3(0.92), clamp(lines, 0.0, 1.0));
            col = mix(col, vec3(0.7, 0.12, 0.16), step(length(vec2(x, ca)), 9.0) * 0.8);
          } else {
            // tiles: cream with the odd grey, a stripe of school colour down the middle
            vec2 tq = vec2(x, along) / 3.6;
            col = mix(vec3(0.82, 0.8, 0.74), vec3(0.62, 0.62, 0.6), step(0.85, h2(floor(tq)))) * (0.75 + 0.25 * edge(fract(tq), 0.04));
            col = mix(col, uStripe * 0.8, step(abs(x), 6.0) * 0.8);
          }
          col *= lightK;
        } else if (part == 3) {
          if (st > 1.5) {
            // the gym's roof: steel joists, the high lights
            float j = step(abs(mod(along, 10.0) - 5.0), 0.5);
            col = mix(vec3(0.3, 0.32, 0.36), vec3(0.16, 0.17, 0.2), j);
          } else {
            // a dropped ceiling: tiles, and the long light panels
            vec2 tq = vec2(x, along) / 7.2;
            col = vec3(0.85, 0.85, 0.82) * (0.88 + 0.12 * edge(fract(tq), 0.03));
            vec2 lq = vec2(abs(x) - 10.8, dl);
            col = mix(col, vec3(1.7, 1.75, 1.68), step(box2(lq, vec2(3.4, 6.6)), 0.0));
          }
          col *= lightK;
        } else {
          if (st < 0.5) {
            // the hall: lockers to the rail, cinder block above, a stripe
            if (h < 1.2) col = vec3(0.1);
            else if (h < 21.0) {
              float lx = fract(wa / 4.2), id = floor(wa / 4.2);
              col = uLocker * (0.85 + 0.12 * h2(vec2(id, 1.0)));
              col *= 0.6 + 0.4 * smoothstep(0.0, 0.03, min(lx, 1.0 - lx));
              // the vents, the handle, the number plate
              float vent = step(abs(h - 18.4), 1.0) * aaSq(h * 2.5) * step(0.2, lx) * step(lx, 0.8);
              float vent2 = step(abs(h - 3.6), 0.8) * aaSq(h * 2.5) * step(0.2, lx) * step(lx, 0.8);
              col *= 1.0 - 0.45 * (vent + vent2);
              col = mix(col, vec3(0.7, 0.72, 0.76), step(abs(lx - 0.86), 0.035) * step(abs(h - 11.0), 1.4));
              col = mix(col, vec3(0.85, 0.8, 0.5), step(abs(lx - 0.5), 0.08) * step(abs(h - 15.6), 0.3));
            } else {
              vec2 bq = vec2(wa / 4.8 + mod(floor((h - 21.0) / 2.4), 2.0) * 0.5, (h - 21.0) / 2.4);
              col = vec3(0.86, 0.83, 0.74) * (0.85 + 0.15 * edge(fract(bq), 0.05));
              col = mix(col, uStripe, step(abs(h - 23.5), 0.9));
            }
          } else if (st < 1.5) {
            // a classroom: windows down one side (police lights in them), the board on the other
            vec2 bq = vec2(wa / 4.8 + mod(floor(h / 2.4), 2.0) * 0.5, h / 2.4);
            col = vec3(0.86, 0.84, 0.76) * (0.88 + 0.12 * edge(fract(bq), 0.05));
            if (side > 0.0 && part != 6) {
              float wx = mod(wa, 24.0) - 12.0;
              if (abs(wx) < 10.0 && h > 7.0 && h < 25.0) {
                vec3 sky = mix(uSkyLow, uSkyTop, (h - 7.0) / 18.0) * 1.3;
                float ph = aaSq(uTime * 2.2 + floor(wa / 24.0) * 0.37);
                // the police lights down in the lot, their glow coming up into the sky
                vec3 pol = mix(vec3(1.0, 0.1, 0.12), vec3(0.2, 0.35, 1.0), ph);
                sky = mix(sky, sky * 0.45 + pol * (0.35 + 1.5 * smoothstep(20.0, 7.0, h)), uPolice);
                float slat = 0.7 + 0.3 * step(0.25, fract(h * 1.2));
                col = mix(sky * slat, vec3(0.9), step(abs(wx), 0.3) + step(abs(h - 16.0), 0.3) + (1.0 - step(abs(wx), 9.6)) + (1.0 - step(abs(h - 16.0), 8.6)));
              }
            } else if (part != 6) {
              float bx = mod(wa, 70.0) - 35.0;
              if (abs(bx) < 26.0 && h > 8.0 && h < 21.0) {
                col = vec3(0.12, 0.2, 0.16) * (0.85 + 0.15 * n2(vec2(wa, h) * 0.3));
                // chalk: tally marks, four down and one across, group after group
                vec2 tq = vec2(bx + 26.0, h - 11.0);
                float gid = floor(tq.x / 6.0), gx = mod(tq.x, 6.0);
                float strokes = 0.0;
                for (int k = 0; k < 4; k++) strokes += step(abs(gx - 1.0 - float(k) * 1.0), 0.13);
                strokes *= step(0.0, tq.y) * step(tq.y, 6.0);
                float diag = abs((gx - 0.4) * 6.0 - tq.y * 4.0) / 7.2;
                strokes += step(diag, 0.13) * step(0.2, tq.y) * step(tq.y, 5.8);
                col = mix(col, vec3(0.86, 0.88, 0.84), clamp(strokes, 0.0, 1.0) * (0.55 + 0.35 * n2(vec2(wa, h) * 4.0)) * step(0.15, h2(vec2(gid, 4.0))));
                col = mix(col, vec3(0.5, 0.36, 0.2), step(abs(h - 8.3), 0.4) + step(25.8, abs(bx)));
              }
            }
            col = mix(col, vec3(0.3, 0.26, 0.2), step(h, 1.2));
          } else {
            // the gym: blue mats along the bottom, painted block, a stripe, windows high up
            vec2 bq = vec2(wa / 4.8 + mod(floor(h / 2.4), 2.0) * 0.5, h / 2.4);
            col = vec3(0.86, 0.84, 0.78) * (0.88 + 0.12 * edge(fract(bq), 0.05));
            if (h < 11.0) { float mq = fract(wa / 5.0); col = vec3(0.12, 0.24, 0.6) * (0.75 + 0.25 * smoothstep(0.0, 0.05, min(mq, 1.0 - mq))); }
            col = mix(col, uStripe, step(abs(h - 13.0), 1.2));
            float wx = mod(wa, 26.0) - 13.0;
            if (abs(wx) < 9.0 && h > 33.0 && h < 42.0 && part != 6) col = mix(uSkyLow, uSkyTop, 0.5) * 1.2;
          }
          col *= lightK;
        }
        col *= part == 7 ? vec3(1.0) : uLight;
        // the police lights coming in through the classroom windows, red then blue on everything
        if (st > 0.5 && st < 1.5 && part != 7) col += mix(vec3(1.0, 0.1, 0.12), vec3(0.2, 0.35, 1.0), aaSq(uTime * 2.2)) * uPolice * (side > 0.0 && onWall ? 0.12 : 0.07);
        // the alarm: the whole place in pulses of red
        float pulse = 0.5 + 0.5 * sin(uTime * 9.0);
        col = mix(col, col * vec3(1.0, 0.25, 0.25) + vec3(0.35, 0.0, 0.0) * pulse, uAlarm * (part == 7 ? 0.0 : 1.0));
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the crown at midfield, the lights on ----------
export class CrownFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -20;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    this.crownM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.4, emissive: 0x6a4808 });
    this.crown = new THREE.Mesh(SG.crown(), this.crownM); this.crown.position.y = 11.4; this.crown.scale.setScalar(1.3); this.group.add(this.crown);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 6, 32), new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.5 })); plinth.position.y = 3; this.group.add(plinth);
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 12), new THREE.MeshStandardMaterial({ color: 0xc8143a, roughness: 0.8, emissive: 0x2a0408 })); cushion.scale.set(1, 0.35, 1); cushion.position.y = 6.6; this.group.add(cushion);
    this.lit = 0.4; this.fired = false;
    this._p = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = groundAt(this.course, this.t, this.x);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw, 0);
    this.crown.rotation.y = songT * 0.4;
    this.lit += ((this.fired ? 1.2 : 0.5) - this.lit) * Math.min(1, dt);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    const p = this._p;
    S.glow(p.x, p.y + 15, p.z, 40, [1, 0.85, 0.5], 0.35 * this.lit);
    S.pool(p.x, p.y + 0.1, p.z, 60, [1, 0.9, 0.7], 0.45 * this.lit);
  }
}

// ---------- the school, per frame ----------
export class SchoolWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.terrain = new Terrain(scene, S.course, S.P, S.plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 1; tu.uDry.value = 0.2; tu.uWood.value = 0;
    this.mat = schoolMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, SCHOOL));
    this.spans = this.rooms.map((r) => [r.span.from, r.span.to]);
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
  }
  update(S, dt, camera, time) {
    const T = this.terrain;
    T.update(S.track, S.rider, S.P, camera, 0); T.mat.uniforms.uWood.value = 0;
    const t0 = S.rider.t - 4, t1 = S.rider.t + 46;
    let sunk = false;
    for (let i = 0; i < T.N; i++) { const t = t0 + (t1 - t0) * (i / (T.N - 1)); if (!this.spans.some(([a, b]) => t > a + 0.25 && t < b - 0.25)) continue; for (let j = 0; j < T.M; j++) T.pos[(i * T.M + j) * 3 + 1] -= 9; sunk = true; }
    if (sunk) T.geo.attributes.position.needsUpdate = true;
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xfff4e0);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    const one = (w) => smooth(w[0] - (w[2] ?? 0.1), w[0], t) * (1 - smooth(w[1], w[1] + (w[3] ?? 0.5), t));
    const win = (w) => (!w ? 0 : Array.isArray(w[0]) ? Math.max(...w.map(one)) : one(w));
    const alarm = win(ev.alarm); u.uAlarm.value = alarm * 0.55; S.town.alarm = alarm;
    u.uPolice.value = win(ev.police);
    S.town.stadium = win(ev.stadium);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
  }
  // the light panels' glow in the halls; the gym's high lights
  draw(T) {
    const g = this._g || (this._g = new THREE.Vector3()), lamp = col(this.S.P.lamp ?? 0xfff4e0);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 2) { for (const s of [-1, 1]) { this.S.track.ground(f.t, s * 30, g); T.glow(g.x, fy + r.H - 2, g.z, 14, lamp, 0.7); } continue; }
        for (const s of [-1, 1]) { this.S.track.ground(f.t, s * 10.8, g); T.glow(g.x, fy + r.H - 0.5, g.z, 9, [1, 1, 0.96], 0.5); }
      }
    }
  }
}
