// Grocery Store at 2 AM: the things in the store and its lot, about four times life size so they read
// from the board (the cans in the corn display and the ones you collect are bigger than that).
// Geometry only, vertex-coloured; the lights are glows the world draws. The pictures (the frozen
// dinner's back panel set like scripture, the store clock, the cooler's ice cream from above, the
// lot's letterboard, the notebook margins) are canvases made here; the shelves' products are drawn
// by a shader in gsa-world.js. The pickup, a can of corn, is at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a square-section piece from one point to another
function beam(a, b, w, d = w) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(1e-3, _bd.length()); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
// a round tube from one point to another
function tube(a, b, r, n = 8) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(1e-3, _bd.length()); _bd.multiplyScalar(1 / len);
  const g = new THREE.CylinderGeometry(r, r, len, n, 1, true);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
// a plane for a picture, w by h, its face to +z
const face = (w, h, x = 0, y = 0, z = 0) => { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); return g; };
export function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export const WHITE = rgb(0xf2f2ee), CHROME = rgb(0xc8ccd4), STEEL = rgb(0x8a909a), DARKSTEEL = rgb(0x4a4e58), BLACK = rgb(0x121214), DARK = rgb(0x26262c),
  RED = rgb(0xd8282e), DEEPRED = rgb(0x8a1418), ORANGE = rgb(0xff7a1a), PUMPKIN = rgb(0xf06a10), YELLOW = rgb(0xffd02a), CORN = rgb(0xf6c42a),
  GREEN = rgb(0x2a8a3a), LEAF = rgb(0x3a7a2a), KRAFT = rgb(0xb8915a), BEIGE = rgb(0xd8cfb8), GREY = rgb(0xa8a8a4), LIGHTGREY = rgb(0xd0d0cc),
  BLUE = rgb(0x2a5ab8), NAVY = rgb(0x1a2440), PURPLE = rgb(0x6a3aa8), BROWN = rgb(0x5a3a22), OLIVE = rgb(0x4a5230), CREAM = rgb(0xf4ead2),
  GLOWY = rgb(0xffe8a0), GLOWO = rgb(0xffa040), GLOWW = rgb(0xf4f8ff), ICE = rgb(0xbfe6ff);

const FONT = (w, s) => `${w} ${s}px "Arial Black", Impact, sans-serif`;
const SANS = (w, s) => `${w} ${s}px "Segoe UI", Arial, sans-serif`;
const SERIF = (w, s) => `${w} ${s}px Georgia, "Times New Roman", serif`;
function centre(g, txt, x, y, font, col, maxW) { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y, maxW); }

// ---------- the pictures ----------
// the back of the frozen dinner, its ingredients set like a page of scripture: a drop cap, chapter
// and verse, two columns, a rule, the nutrition box like a footnote
export function scriptureTexture() {
  return canvasTex(768, 1024, (g, W, H) => {
    g.fillStyle = '#f1e8d4'; g.fillRect(0, 0, W, H);
    // the box's printed border: a frozen blue band top and bottom
    g.fillStyle = '#1a4a9a'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 54, W, 54);
    centre(g, 'SALISBURY STEAK DINNER', W / 2, 36, FONT(900, 34), '#ffffff', W - 60);
    centre(g, 'KEEP FROZEN', W / 2, H - 27, FONT(900, 26), '#cfe2ff', W - 60);
    centre(g, 'INGREDIENTS', W / 2, 118, SERIF(700, 46), '#5a1a12', W - 80);
    centre(g, 'CHAPTER 3', W / 2, 160, SERIF(400, 24), '#6a5a48', W - 80);
    g.strokeStyle = '#8a6a48'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 184); g.lineTo(W - 80, 184); g.stroke();
    const verses = ['WATER', 'BEEF', 'ENRICHED FLOUR', 'POTATOES', 'GRAVY', 'SALT', 'MODIFIED CORN STARCH', 'ONIONS', 'SOY PROTEIN', 'CARAMEL COLOR', 'BUTTER', 'PEAS', 'CARROTS', 'SUGAR', 'YEAST EXTRACT', 'GARLIC', 'NATURAL FLAVOR', 'DEXTROSE', 'BLACK PEPPER', 'CELERY'];
    // the drop cap
    g.fillStyle = '#8a1a14'; g.font = SERIF(700, 120); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('W', 70, 320);
    g.font = SERIF(400, 27); g.fillStyle = '#2a2018';
    const colX = [196, 470], top = 226, lh = 47;
    verses.forEach((v, i) => {
      const col = i < 10 ? 0 : 1, row = i % 10;
      const x = col === 0 && row < 3 ? colX[0] : col === 0 ? 70 : colX[1] - 60, y = top + row * lh + (col === 0 && row < 3 ? 0 : 0);
      g.fillStyle = '#9a3a24'; g.font = SERIF(700, 18); g.fillText(String(i + 1), x, y - 12);
      g.fillStyle = '#2a2018'; g.font = SERIF(400, 27); g.fillText(i === 0 ? 'ATER,' : v + ',', x + 26, y);
    });
    g.beginPath(); g.moveTo(80, 712); g.lineTo(W - 80, 712); g.stroke();
    // the nutrition facts, small, a footnote
    g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.strokeRect(110, 742, W - 220, 214);
    g.fillStyle = '#2a2018'; g.font = FONT(900, 32); g.textAlign = 'left'; g.fillText('Nutrition Facts', 128, 784);
    g.fillRect(128, 798, W - 256, 8);
    g.font = SANS(700, 22); g.fillText('Serving Size 1 Tray', 128, 836); g.fillText('Calories 410', 128, 874);
    g.font = SANS(400, 20); g.fillText('Servings Per Container  1', 128, 908); g.fillText('Amount Per Serving: alone', 128, 938);
  });
}
// the store's clock: two in the morning
export function clockTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, 250, 0, Math.PI * 2); g.fillStyle = '#f6f4ee'; g.fill();
    g.lineWidth = 16; g.strokeStyle = '#1a1a1c'; g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 214 : 190, r1 = 230;
      g.lineWidth = i % 5 ? 4 : 10; g.strokeStyle = '#1a1a1c';
      g.beginPath(); g.moveTo(W / 2 + Math.sin(a) * r0, H / 2 - Math.cos(a) * r0); g.lineTo(W / 2 + Math.sin(a) * r1, H / 2 - Math.cos(a) * r1); g.stroke();
    }
    for (let n = 1; n <= 12; n++) { const a = n / 12 * Math.PI * 2; centre(g, String(n), W / 2 + Math.sin(a) * 158, H / 2 - Math.cos(a) * 158 + 4, SANS(700, 46), '#1a1a1c'); }
  });
}
// the ice cream in the chest freezer, from above, under frost: tubs and boxes in rows
export function coolerTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#a8d4f0'; g.fillRect(0, 0, W, H);
    const cols = ['#f4d8e4', '#ffe6b0', '#c8b0e8', '#fff4ee', '#ffb0c0', '#b8e8d0', '#f0c890', '#e85a6a', '#6a3a2a', '#ffffff'];
    let s = 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 48) {
      const c = cols[Math.floor(R() * cols.length)];
      if (R() < 0.5) { g.fillStyle = c; g.beginPath(); g.arc(x + 24, y + 32, 21, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 12, y + 26, 24, 6); }
      else { g.fillStyle = c; g.fillRect(x + 4, y + 6, 40, 52); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 4, y + 40, 40, 6); }
    }
    // frost over everything
    const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7); gr.addColorStop(0, 'rgba(230,246,255,0.15)'); gr.addColorStop(1, 'rgba(230,246,255,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, true);
}

// ---------- the shelves ----------
export const GS = {
  // a double-sided shelving unit along the road, 24 long (z), 8.6 tall, 3.6 deep: its two faces are
  // planes the product shader draws on (uv in metres: along it, up it)
  shelfFaces() {
    const a = face(24, 8.2, 0, 4.5, 0); a.rotateY(Math.PI / 2); a.translate(1.86, 0, 0);
    const b = face(24, 8.2, 0, 4.5, 0); b.rotateY(-Math.PI / 2); b.translate(-1.86, 0, 0);
    for (const g of [a, b]) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 24, 0.4 + uv.getY(i) * 8.2); }
    return merge([a, b]);
  },
  shelfFrame() {
    const parts = [];
    parts.push(paint(box(24.2, 0.6, 3.9, 0, 0.3, 0).rotateY(Math.PI / 2), DARKSTEEL));     // the kick plate
    parts.push(paint(box(24.4, 0.35, 4.32, 0, 8.8, 0).rotateY(Math.PI / 2), LIGHTGREY));   // the top (wider than the ends: their sides met it face to face)
    for (const z of [-12.1, 12.1]) parts.push(paint(box(4.1, 8.6, 0.35, 0, 4.3, z), LIGHTGREY));   // the ends (stopping under the top)
    parts.push(paint(box(0.25, 8.4, 24, 0, 4.5, 0), GREY));                               // the spine
    return merge(parts);
  },
  // a hanging aisle marker: two thin wires up to the ceiling, the double-sided panel (its face is a
  // sign cell), a number box on top
  aisleFrame() {
    const parts = [paint(box(9.2, 5.4, 0.5, 0, 0, 0), NAVY), paint(box(2.6, 2.6, 0.6, 0, 4.0, 0), RED)];
    for (const x of [-3.8, 3.8]) parts.push(paint(box(0.08, 40, 0.08, x, 22.7, 0), STEEL));
    return merge(parts);
  },
  // a sign panel w by h, both sides
  panel(w, h, d = 0.27) { const a = face(w, h, 0, 0, d); const b = face(w, h, 0, 0, 0); b.rotateY(Math.PI); b.translate(0, 0, -d); return merge([a, b]); },
  // a dark slab a sign's faces stand on
  slab(w, h, d) { return paint(box(w, h, d), rgb(0x16181c)); },
  // the chest freezer island, one 6 m length of it: white body, a steel rim, the frosty top
  coolerBody() {
    const parts = [paint(box(13, 3.2, 6.02, 0, 1.6, 0), WHITE), paint(box(13.4, 0.35, 6.04, 0, 3.3, 0), STEEL), paint(box(0.6, 0.5, 6.04, 0, 3.6, 0), STEEL), paint(box(13.1, 0.6, 6.02, 0, 0.3, 0), DARKSTEEL)];
    return merge(parts);
  },
  coolerTop() { const g = face(12.2, 6.0, 0, 0, 0); g.rotateX(-Math.PI / 2); g.translate(0, 3.15, 0); return g; },
  // a shopping cart, nose to +z: the wire basket on its frame, the red handle, four wheels
  cart() {
    const parts = [], W = 1.15, L = 1.9, z0 = -1.6, top = 4.0, bot = 2.2;
    const wire = (a, b) => parts.push(paint(beam(a, b, 0.07), CHROME));
    // the basket: rims, corners, the wires down the sides, the floor
    const rim = [[-W, top, z0], [W, top, z0], [W * 0.82, top, z0 + 2 * L], [-W * 0.82, top, z0 + 2 * L]];
    const rimB = [[-W * 0.86, bot, z0 + 0.3], [W * 0.86, bot, z0 + 0.3], [W * 0.7, bot, z0 + 2 * L - 0.2], [-W * 0.7, bot, z0 + 2 * L - 0.2]];
    for (let i = 0; i < 4; i++) { wire(rim[i], rim[(i + 1) % 4]); wire(rimB[i], rimB[(i + 1) % 4]); wire(rim[i], rimB[i]); }
    for (let k = 1; k < 9; k++) {
      const f = k / 9;
      for (const sd of [0, 1]) { const a = sd ? [rim[1], rim[2]] : [rim[0], rim[3]], b = sd ? [rimB[1], rimB[2]] : [rimB[0], rimB[3]]; const p = a[0].map((v, j) => v + (a[1][j] - v) * f), q = b[0].map((v, j) => v + (b[1][j] - v) * f); wire(p, q); }
    }
    for (let k = 1; k < 5; k++) { const f = k / 5; for (const pair of [[rim[2], rim[3], rimB[2], rimB[3]], [rim[0], rim[1], rimB[0], rimB[1]]]) { const p = pair[0].map((v, j) => v + (pair[1][j] - v) * f), q = pair[2].map((v, j) => v + (pair[3][j] - v) * f); wire(p, q); } }
    for (let k = 0; k <= 4; k++) { const f = k / 4; const p = rimB[0].map((v, j) => v + (rimB[3][j] - v) * f), q = rimB[1].map((v, j) => v + (rimB[2][j] - v) * f); wire(p, q); }
    // the frame under it, the bottom rack, the wheels
    for (const x of [-1, 1]) { parts.push(paint(beam([x * 0.9, 0.55, z0 - 0.2], [x * 0.72, 0.55, z0 + 2 * L], 0.12), CHROME)); parts.push(paint(beam([x * 0.9, 0.55, z0 - 0.2], [x * W, top, z0 - 0.15], 0.12), CHROME)); }
    parts.push(paint(box(1.6, 0.06, 2.8, 0, 0.75, z0 + 1.9), CHROME));
    for (const [x, z] of [[-0.85, z0], [0.85, z0], [-0.7, z0 + 2 * L - 0.2], [0.7, z0 + 2 * L - 0.2]]) { const wh = cyl(0.28, 0.28, 0.16, 12); wh.rotateZ(Math.PI / 2); wh.translate(x, 0.28, z); parts.push(paint(wh, BLACK)); }
    // the handle
    parts.push(paint(box(2.5, 0.22, 0.22, 0, top + 0.35, z0 - 0.45), RED));
    for (const x of [-1, 1]) parts.push(paint(beam([x * W, top, z0], [x * 1.2, top + 0.35, z0 - 0.45], 0.1), CHROME));
    return merge(parts);
  },
  // ... and a coat over its handle
  coat() {
    const parts = [paint(box(2.4, 0.55, 0.8, 0, 4.55, -2.05), OLIVE), paint(box(1.0, 2.6, 0.35, -0.7, 3.2, -2.35).rotateX(0.12), OLIVE), paint(box(1.0, 2.2, 0.35, 0.75, 3.4, -2.3).rotateX(0.1), OLIVE), paint(box(0.5, 1.4, 0.3, 0.2, 2.3, -2.45).rotateZ(0.3), OLIVE)];
    return merge(parts);
  },
  // a can, upright, 0.9 tall: the label, the rims
  can(label = CORN, band = GREEN) {
    const parts = [paint(cyl(0.3, 0.3, 0.62, 16, 0, 0.45, 0), label), paint(cyl(0.302, 0.302, 0.12, 16, 0, 0.36, 0), band), paint(cyl(0.29, 0.29, 0.07, 16, 0, 0.11, 0), CHROME), paint(cyl(0.29, 0.29, 0.07, 16, 0, 0.8, 0), CHROME), paint(cyl(0.27, 0.27, 0.02, 16, 0, 0.84, 0), STEEL)];
    return merge(parts);
  },
  // the display table under the corn
  pallet() { return merge([paint(box(9.6, 1.0, 5.6, 0, 0.5, 0), KRAFT), paint(box(9.8, 0.25, 5.8, 0, 1.1, 0), BROWN)]); },
  // the tissue box someone set down on the shelf edge, one pulled
  tissues() { return merge([paint(box(1.6, 0.9, 0.9, 0, 0.45, 0), rgb(0x8ac0e8)), paint(box(0.7, 0.04, 0.3, 0, 0.92, 0), WHITE), paint(sph(0.35, 1, 1.3, 0.25, 0, 1.25, 0, 8, 6), WHITE)]); },
  // the frozen dinner, standing on its end in front of the freezer doors, its back to the road
  dinnerBox() { return paint(box(6.0, 8.0, 1.2, 0, 4.0, 0), rgb(0x1a4a9a)); },
  dinnerFace() { return face(5.7, 7.6, 0, 4.0, 0.7); },
  // the plinth it stands on, like a lectern
  lectern() { return merge([paint(box(5.0, 0.5, 2.4, 0, 0.25, 0), BROWN), paint(cyl(0.5, 0.7, 1.2, 10, 0, 0.6, 0), BROWN)]); },
  // the kiddie ride: a red and white rocket on its coin box
  rocket() {
    const parts = [paint(box(3.4, 1.4, 3.4, 0, 0.7, 0), rgb(0x2a4ad8)), paint(box(1.0, 0.6, 0.2, 0, 1.0, 1.72), YELLOW)];
    const body = cyl(1.05, 1.05, 3.6, 18, 0, 0, 0); body.rotateX(Math.PI / 2); body.translate(0, 3.2, 0); parts.push(paint(body, WHITE));
    const nose = cyl(0.02, 1.05, 2.0, 18, 0, 0, 0); nose.rotateX(Math.PI / 2); nose.translate(0, 3.2, 2.8); parts.push(paint(nose, RED));
    const tail = cyl(1.05, 0.7, 0.8, 18, 0, 0, 0); tail.rotateX(Math.PI / 2); tail.translate(0, 3.2, -2.2); parts.push(paint(tail, RED));
    for (let k = 0; k < 4; k++) { const f = box(0.12, 1.4, 1.4, 0, 0, 0); f.translate(0, 1.0, 0); f.rotateZ(k * Math.PI / 2 + Math.PI / 4); f.translate(0, 3.2, -1.6); parts.push(paint(f, RED)); }
    parts.push(paint(box(1.2, 0.5, 1.4, 0, 4.2, 0.2), BLACK));   // the seat
    parts.push(paint(sph(0.5, 1, 1, 0.3, 0, 3.3, 3.75, 10, 8), rgb(0x8ad8ff)));
    return merge(parts);
  },
  // a jack-o'-lantern, about 3 across: the ribbed body, the stem; its face is lit separately
  pumpkin() {
    const g = new THREE.SphereGeometry(1.5, 20, 14); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 4)), 0.5); p.setXYZ(i, x * r * 1.12, y * 0.82 + 1.3, z * r * 1.12); }
    g.computeVertexNormals();
    return merge([paint(g, PUMPKIN), paint(cyl(0.12, 0.18, 0.6, 6, 0, 2.7, 0).rotateZ(0.2), rgb(0x4a5a1a))]);
  },
  pumpkinFace() {
    const parts = [];
    const tri = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]); const gg = new THREE.ShapeGeometry(s); return gg; };
    parts.push(tri([-0.75, 1.55, -0.25, 1.55, -0.5, 1.95]), tri([0.25, 1.55, 0.75, 1.55, 0.5, 1.95]), tri([-0.15, 1.25, 0.15, 1.25, 0, 1.5]));
    parts.push(tri([-0.85, 0.95, 0.85, 0.95, 0.6, 0.62, 0.35, 0.82, 0.1, 0.6, -0.15, 0.82, -0.4, 0.6, -0.62, 0.82]));
    const g = merge(parts.map((x) => paint(x, GLOWY))); g.translate(0, 0, 1.62);
    return g;
  },
  // a white sheet ghost on a stake, the seasonal aisle's
  ghost() {
    const g = lathe([[0.01, 5.2], [0.7, 5.0], [1.0, 4.4], [1.1, 3.4], [1.3, 2.4], [1.6, 1.4], [1.75, 1.0]], 14);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y < 1.6) { const a = Math.atan2(z, x); p.setY(i, y + 0.25 * Math.sin(a * 6)); } }
    g.computeVertexNormals();
    return merge([paint(g, WHITE), paint(sph(0.18, 1, 1.4, 0.4, -0.38, 4.3, 0.95, 8, 6), BLACK), paint(sph(0.18, 1, 1.4, 0.4, 0.38, 4.3, 0.95, 8, 6), BLACK), paint(cyl(0.07, 0.07, 1.0, 5, 0, 0.5, 0), BROWN)]);
  },
  // a fake fir, a little early, on a box
  fir() {
    const parts = [paint(box(2.4, 1.2, 2.4, 0, 0.6, 0), RED)];
    for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.02, 2.4 - k * 0.45, 2.4, 12, 0, 2.2 + k * 1.3, 0), rgb(0x1a5a2a)));
    return merge(parts);
  },
  // a checkout lane, its belt toward +z: the counter, the belt, the register on its pole, the lane
  // light's pole (its number is a sign cell up top), the bag carousel at the end
  checkout() {
    const parts = [paint(box(3.2, 3.4, 11, 0, 1.7, 0), rgb(0x5a5a62)), paint(box(2.2, 0.16, 10.6, 0, 3.58, 0), BLACK), paint(box(3.4, 0.2, 11.2, 0, 3.4, 0), LIGHTGREY)];
    parts.push(paint(box(1.4, 0.4, 1.6, 0.2, 3.6, 3.4), BLACK));                                     // the scanner
    parts.push(paint(cyl(0.12, 0.12, 2.6, 6, -1.2, 4.6, 2.0), STEEL));                               // the register's pole
    parts.push(paint(box(1.6, 1.2, 0.4, -1.2, 6.0, 2.0).rotateX(-0.25).translate(0, 1.4, 0.4), DARK)); // the screen
    parts.push(paint(cyl(0.16, 0.16, 11, 6, 1.5, 5.5, -5.2), STEEL));                               // the lane light's pole
    parts.push(paint(box(2.4, 2.4, 0.8, 1.5, 11.6, -5.2), DARK));
    // the candy rack where you wait
    parts.push(paint(box(0.9, 5.2, 4.2, -2.4, 2.6, -2.8), rgb(0x3a3a44)));
    for (let k = 0; k < 5; k++) parts.push(paint(box(0.96, 0.7, 4.0, -2.5, 0.8 + k * 1.0, -2.8), [YELLOW, RED, BLUE, ORANGE, PURPLE][k]));
    // the bag carousel
    parts.push(paint(cyl(0.14, 0.14, 4.4, 6, 0, 2.2, 6.8), STEEL));
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; parts.push(paint(beam([0, 4.3, 6.8], [Math.cos(a) * 1.6, 4.3, 6.8 + Math.sin(a) * 1.6], 0.1), STEEL)); }
    return merge(parts);
  },
  // a plastic bag hung open on the carousel (its mouth up), 2.6 tall
  bag() {
    const g = lathe([[0.01, 0], [0.9, 0.1], [1.3, 0.8], [1.35, 1.8], [1.15, 2.4], [1.05, 2.5]], 12);
    g.scale(1, 1, 0.55);
    const parts = [paint(g, rgb(0xf2f2f0))];
    for (const x of [-0.75, 0.75]) parts.push(paint(new THREE.TorusGeometry(0.42, 0.06, 5, 10, Math.PI).translate(x, 2.5, 0), rgb(0xf2f2f0)));
    parts.push(paint(cyl(0.6, 0.62, 0.5, 12, 0, 1.4, 0).scale(1.1, 1, 0.56), rgb(0xd82a2a)));       // THANK YOU, a red band
    return merge(parts);
  },
  // a paper bag standing open
  paperBag() {
    const parts = [paint(box(2.6, 3.6, 1.6, 0, 1.8, 0), KRAFT)];
    parts.push(paint(box(2.62, 0.3, 1.62, 0, 3.45, 0), rgb(0xa07a48)));
    const g = merge(parts);
    // (the open top: the box's lid taken off by squashing it into the walls)
    return g;
  },
  // a sign on legs (the PAPER / PLASTIC pair): a post either side of a sign cell
  standSign() { return merge([paint(box(0.3, 9, 0.3, -4.4, 4.5, 0), DARKSTEEL), paint(box(0.3, 9, 0.3, 4.4, 4.5, 0), DARKSTEEL), paint(box(9.4, 3.4, 0.4, 0, 8.6, -0.05), DARK)]); },
  // the deli's NOW SERVING sign on its post, the ticket roll beside it
  serving() { return merge([paint(cyl(0.2, 0.2, 9, 8, 0, 4.5, 0), STEEL), paint(box(6.4, 3.4, 1.0, 0, 10.4, 0), BLACK), paint(box(1.4, 1.6, 1.2, 2.2, 6.0, 0.3), RED)]); },
  // the deli counter, closed for the night: the glass case with a cloth over it
  deli() { return merge([paint(box(30, 3.0, 4.6, 0, 1.5, 0), rgb(0xd8d4cc)), paint(box(30.4, 2.0, 4.0, 0, 4.0, -0.2), rgb(0x3a5a4a)), paint(box(30.6, 0.4, 4.8, 0, 3.05, 0), STEEL)]); },
  // the clock on its bracket
  clockBody() { return merge([paint(cyl(4.4, 4.4, 0.8, 32, 0, 0, 0).rotateX(Math.PI / 2), BLACK), paint(box(0.6, 6, 0.6, 0, 6.6, -0.2), STEEL)]); },
  clockFace() { return face(8.4, 8.4, 0, 0, 0.5); },
  hand(len, w) { return paint(box(w, len, 0.1, 0, len / 2 - 0.4, 0.5), BLACK); },
  // produce: a tilted table (fruit is instanced on it)
  produceTable() { return merge([paint(box(10, 2.4, 6, 0, 1.2, 0), rgb(0x6a4a2a)), paint(box(10.4, 0.5, 6.4, 0, 2.6, 0).rotateX(-0.3).translate(0, 0.6, 0.6), rgb(0x2a5a2a))]); },
  fruit() { const g = new THREE.SphereGeometry(0.5, 10, 8); return paint(g, WHITE); },
  // the misting bar over the produce
  mister() { return merge([paint(cyl(0.1, 0.1, 11, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 6.2, -1.4), STEEL), paint(box(0.2, 1.8, 0.2, -5.4, 5.3, -1.4), STEEL), paint(box(0.2, 1.8, 0.2, 5.4, 5.3, -1.4), STEEL)]); },
  // the security dome on the ceiling, and a camera on its arm
  dome() { return merge([paint(cyl(1.2, 1.2, 0.4, 16, 0, 0, 0), WHITE), paint(sph(1.0, 1, 0.8, 1, 0, -0.2, 0, 16, 8), BLACK)]); },
  // the public-view monitor: a black box with a screen (the screen's a separate face)
  crt() { return merge([paint(box(6.4, 5.0, 4.4, 0, 0, -1.6), DARK), paint(box(6.6, 0.4, 4.6, 0, -2.7, -1.6), BLACK), paint(box(0.12, 26, 0.12, -2.4, 15.5, -1.6), STEEL), paint(box(0.12, 26, 0.12, 2.4, 15.5, -1.6), STEEL), paint(sph(0.5, 1, 1, 1, 0, 2.9, 0.3, 10, 8), BLACK)]); },
  crtFace() { const g = face(5.6, 4.2, 0, 0, 0.7); return g; },
  // the lot's light pole: the pole, its arm, the head
  pole() { return merge([paint(cyl(0.45, 0.6, 34, 8, 0, 17, 0), rgb(0x3a3c44)), paint(box(1.6, 1.0, 1.6, 0, 0.5, 0), rgb(0x8a8a86)), paint(box(0.4, 0.4, 7, 0, 33.6, 3.2), rgb(0x3a3c44)), paint(box(2.8, 0.9, 4.2, 0, 33.4, 6.8), rgb(0x2a2c32))]); },
  // the cart corral: two pipe rails on posts, a loop at the end, a sign
  corral(L = 20) {
    const parts = [];
    for (const x of [-2.2, 2.2]) for (const y of [2.6, 4.6]) parts.push(paint(tube([x, y, -L / 2], [x, y, L / 2], 0.18, 8), CHROME));
    for (let z = -L / 2; z <= L / 2 + 0.01; z += L / 4) for (const x of [-2.2, 2.2]) parts.push(paint(tube([x, 0, z], [x, 4.6, z], 0.2, 8), CHROME));
    parts.push(paint(tube([-2.2, 4.6, L / 2], [2.2, 4.6, L / 2], 0.18, 8), CHROME));
    parts.push(paint(box(4.6, 2.2, 0.2, 0, 6.2, L / 2), BLUE));
    return merge(parts);
  },
  // the sliding doors: one leaf (glass in an aluminium frame), 13 wide, 22 tall
  doorLeaf() { const fr = [paint(box(13, 0.8, 0.5, 0, 21.6, 0), CHROME), paint(box(13, 0.8, 0.5, 0, 0.4, 0), CHROME), paint(box(0.8, 22, 0.5, -6.1, 11, 0), CHROME), paint(box(0.8, 22, 0.5, 6.1, 11, 0), CHROME), paint(box(12, 1.2, 0.3, 0, 9.2, 0), rgb(0x9ab8c8))]; return merge(fr); },
  doorGlass() { return face(11.4, 20.4, 0, 11, 0); },
  // a pole sign with a letterboard (its face is a sign cell): the box, the two legs
  letterboard(w = 22, h = 7) { return merge([paint(box(w + 1.2, h + 1.2, 1.4, 0, 0, -0.1), rgb(0x1a1a20)), paint(box(0.7, 22, 0.7, -w * 0.32, -11 - h / 2, -0.2), rgb(0x3a3c44)), paint(box(0.7, 22, 0.7, w * 0.32, -11 - h / 2, -0.2), rgb(0x3a3c44))]); },
  // the songwriter's notebook page: lined paper on a board
  page() { return paint(box(15.4, 11.6, 0.3, 0, 0, -0.2), rgb(0x2a2a30)); },
  // the store itself, seen from its lot: a long box, the front's picture is a face; a canopy over
  // the doors, a pole sign at the road
  storeBody() {
    const parts = [paint(box(180, 30, 60, 0, 15, -30), rgb(0x8a847a)), paint(box(182, 3, 62, 0, 31.5, -30), rgb(0x6a645c))];
    parts.push(paint(box(46, 2.2, 14, 0, 22, 7), rgb(0xe8e4dc)));
    for (const x of [-21, 21]) parts.push(paint(box(1.6, 22, 1.6, x, 11, 13), rgb(0xe8e4dc)));
    return merge(parts);
  },
  storeFront() { return face(180, 30, 0, 15, 0.6); },   // (far from the wall enough to stay in front of it from the other end of the lot)
  bigSign() { return merge([paint(box(1.6, 34, 1.6, -10, 17, 0), rgb(0x3a3c44)), paint(box(1.6, 34, 1.6, 10, 17, 0), rgb(0x3a3c44)), paint(box(31, 21, 2.4, 0, 44, 0), rgb(0x1a1a20))]); },
  // the letterboard that turns over: its box alone (it turns on its legs), the legs
  letterBox(w = 22.4, h = 7) { return paint(box(w + 1.2, h + 1.2, 1.4, 0, 0, 0), rgb(0x1a1a20)); },
  letterLegs(w = 22.4, h = 7) { return merge([paint(box(0.7, 22, 0.7, -w * 0.32, -11 - h / 2, 0), rgb(0x3a3c44)), paint(box(0.7, 22, 0.7, w * 0.32, -11 - h / 2, 0), rgb(0x3a3c44)), paint(box(1.6, 1.6, 1.6, 0, -h / 2 - 0.4, 0), rgb(0x3a3c44))]); },
};

// the parts of a shelf unit, the pickup's can: exported so the world builds its layers from them
export function cornGeometry() { return GS.can(); }

// ---------- the pickup: a can of corn ----------
function canGeometry() {
  // a tall can: the yellow label with its green band and the white panel the brand sits in, the
  // ribbed steel top and bottom
  const parts = [paint(cyl(0.25, 0.25, 0.62, 20, 0, 0.0, 0), CORN), paint(cyl(0.252, 0.252, 0.1, 20, 0, -0.17, 0), rgb(0x1e7a2e)), paint(cyl(0.252, 0.252, 0.03, 20, 0, -0.105, 0), rgb(0xfff4dc))];
  const panel = new THREE.CylinderGeometry(0.256, 0.256, 0.2, 10, 1, true, -0.55, 1.1); panel.translate(0, 0.09, 0); parts.push(paint(panel, rgb(0xfff6e4)));
  for (const y of [-0.34, 0.34]) { parts.push(paint(cyl(0.24, 0.24, 0.07, 20, 0, y, 0), CHROME)); parts.push(paint(new THREE.TorusGeometry(0.235, 0.022, 5, 20).rotateX(Math.PI / 2).translate(0, y + Math.sign(y) * 0.035, 0), CHROME)); }
  parts.push(paint(cyl(0.21, 0.21, 0.01, 20, 0, 0.375, 0), rgb(0xa8acb4)));
  const g = merge(parts); g.scale(1.35, 1.35, 1.35); g.computeVertexNormals();
  return g;
}
export const pickup = {
  key: 'can', geo: canGeometry, color: 0xfff4dc,
  mat: { rough: 0.28, metal: 0.45, emissive: 0x3a2e10 },
  s: 1.4, lit: 1.25,
  move: (e, time, i) => e.set(0.25 + Math.sin(time * 1.4 + i) * 0.18, time * 1.9 + i * 1.3, Math.sin(time * 1.1 + i) * 0.16),
};
