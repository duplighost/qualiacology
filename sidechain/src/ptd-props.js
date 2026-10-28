// PTSDream Girl: the things in his night and in hers, big enough to read at speed (the rooms are
// about seven times life size, so the things in them are too). Geometry only, vertex-coloured;
// the lights are glows the world draws, the pictures (her perfume's label, the calendar, his
// journal, the compass) are canvases made here. ptd-world.js puts them in the place; the pickup,
// a dog tag on its chain, is at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const box = (w, h, d, x, y, z, c) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return c ? paint(g, c) : g; };
const cyl = (r0, r1, h, n, x, y, z, c) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return c ? paint(g, c) : g; };
const sph = (r, sx, sy, sz, x, y, z, c, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return c ? paint(g, c) : g; };
const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const tor = (R, r, x, y, z, c, rs = 10, ts = 28, arc = Math.PI * 2) => { const g = new THREE.TorusGeometry(R, r, rs, ts, arc); g.translate(x, y, z); return c ? paint(g, c) : g; };
// a ring lying flat (round the y axis) at height y
const hring = (R, r, y, c, rs = 6, ts = 48) => { const g = new THREE.TorusGeometry(R, r, rs, ts); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return c ? paint(g, c) : g; };
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a square-section piece from one point to another
export function beam(a, b, w, d = w, c) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return c ? paint(g, c) : g;
}
const rod = (a, b, r, c, n = 8) => {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.CylinderGeometry(r, r, len, n);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return c ? paint(g, c) : g;
};
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const RED = rgb(0xd8122a), DRED = rgb(0x5a0410), LIPSTICK = rgb(0xff1a3c), PINK = rgb(0xff5a96), GOLD = rgb(0xe8a838), BRASS = rgb(0xb88a3a),
  STEEL = rgb(0x8a8e98), CHROME = rgb(0xd8dce4), BLACK = rgb(0x0e0c10), CHAR = rgb(0x24222a), WHITE = rgb(0xf2f0ee), YELLOW = rgb(0xffc81a),
  WOOD = rgb(0x6a3e1e), DWOOD = rgb(0x3a2010), CREAM = rgb(0xf0e6cc), VELVET = rgb(0x8a0418), LEATHER = rgb(0x5a2a14), GREEN = rgb(0x2a7a3a),
  LEAF = rgb(0x3a9a4a), BLUE = rgb(0x1a4ab8), SKY = rgb(0x8ac8ff), ORANGE = rgb(0xff7a14), COPPER = rgb(0xc8682a), PAPER = rgb(0xf4f0e2),
  PORCELAIN = rgb(0xf6f6f8), TILE = rgb(0xdfe6ea), BASKET = rgb(0xd81a2a), GLASSC = rgb(0xc8d8e8), WINE = rgb(0x6a0414), LAMPSHADE = rgb(0xf4e2b8),
  CARDBOARD = rgb(0xb08850), TAPE = rgb(0xc8a870), PALE = rgb(0xe8dcd0), PLUM = rgb(0x4a1a3a), CORAL = rgb(0xffb0a0), TEAL = rgb(0x1a8a8a);

// ---------- the pictures ----------
// her perfume's label: DREAM GIRL in gold on black, eau de parfum under it
export function labelTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#0a0406'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8b048'; g.lineWidth = 10; g.strokeRect(24, 24, W - 48, H - 48); g.lineWidth = 3; g.strokeRect(44, 44, W - 88, H - 88);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#f0c060'; g.font = 'italic 700 150px Georgia, "Times New Roman", serif'; g.fillText('Dream Girl', W / 2, H * 0.44, W - 120);
    g.font = '600 46px Georgia, serif'; g.fillStyle = '#e8b048'; g.fillText('E A U   D E   P A R F U M', W / 2, H * 0.75);
    // her crown over the name
    crownGlyph(g, W / 2, H * 0.16, 46, '#f0c060');
  });
}
// a little crown, her mark on everything
function crownGlyph(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath();
  g.moveTo(-s, s * 0.6); g.lineTo(-s, -s * 0.2); g.lineTo(-s * 0.5, s * 0.15); g.lineTo(0, -s * 0.6); g.lineTo(s * 0.5, s * 0.15); g.lineTo(s, -s * 0.2); g.lineTo(s, s * 0.6); g.closePath(); g.fill();
  for (const px of [-s, 0, s]) { g.beginPath(); g.arc(px, px ? -s * 0.28 : -s * 0.68, s * 0.14, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// the calendar: two pages in one picture. The top half OCTOBER, the days crossed off up to the
// one he couldn't finish; the bottom half the month of their first fight, its day ringed in red
export function calendarTexture() {
  return canvasTex(1024, 2048, (g, W, H) => {
    const page = (y0, month, upTo, ring) => {
      g.fillStyle = '#f6f2e8'; g.fillRect(0, y0, W, 1024);
      g.fillStyle = '#c8202a'; g.fillRect(0, y0, W, 210);
      g.fillStyle = '#ffffff'; g.font = '900 150px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(month, W / 2, y0 + 110, W - 80);
      g.font = '700 34px Arial, sans-serif'; g.fillStyle = '#5a5050';
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => g.fillText(d, 74 + i * 146, y0 + 252));
      const cw = 146, ch = 130, x0 = 0, yy = y0 + 290;
      g.strokeStyle = '#b8b0a4'; g.lineWidth = 3;
      for (let r = 0; r <= 5; r++) { g.beginPath(); g.moveTo(x0, yy + r * ch); g.lineTo(W, yy + r * ch); g.stroke(); }
      for (let c = 0; c <= 7; c++) { g.beginPath(); g.moveTo(x0 + c * cw, yy); g.lineTo(x0 + c * cw, yy + 5 * ch); g.stroke(); }
      for (let d = 1; d <= 31; d++) {
        const k = d + 2, r = Math.floor(k / 7), c = k % 7, x = x0 + c * cw, y = yy + r * ch;
        if (r > 4) continue;
        g.fillStyle = '#2a2424'; g.font = '700 46px Arial, sans-serif'; g.textAlign = 'left'; g.fillText(String(d), x + 14, y + 36);
        if (d <= upTo) { g.strokeStyle = '#1a1a2a'; g.lineWidth = 9; g.beginPath(); g.moveTo(x + 20, y + 20); g.lineTo(x + cw - 20, y + ch - 20); g.moveTo(x + cw - 20, y + 20); g.lineTo(x + 20, y + ch - 20); g.stroke(); }
        if (d === ring) { g.strokeStyle = '#e0102a'; g.lineWidth = 14; g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, cw * 0.62, ch * 0.62, -0.2, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(x + cw / 2 + 4, y + ch / 2 - 3, cw * 0.66, ch * 0.58, -0.1, 0.3, Math.PI * 1.9); g.stroke(); }
      }
    };
    page(0, 'OCTOBER', 17, 0);
    page(1024, 'MARCH', 0, 14);
  });
}
// his journal: ruled pages, his writing in blue, crossed out, and her in the margins in red: crowns,
// a ring of a wine glass, a stain spreading in from the edge
export function journalTexture() {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = seeded(77);
    g.fillStyle = '#f4efe0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#9ab8d8'; g.lineWidth = 3;
    for (let y = 120; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#e07a8a'; g.lineWidth = 4; g.beginPath(); g.moveTo(150, 0); g.lineTo(150, H); g.stroke();
    // his lines: scribbles of writing, some struck through
    g.strokeStyle = '#1a2a6a'; g.lineWidth = 4; g.lineCap = 'round';
    for (let y = 152; y < H - 40; y += 46) {
      let x = 172; const end = 520 + R() * 430;
      g.beginPath();
      while (x < end) { const w = 30 + R() * 70; for (let k = 0; k < w; k += 9) g.lineTo(x + k, y - 6 - 14 * Math.abs(Math.sin(k * 0.31 + R() * 3))); x += w + 18; g.moveTo(x, y - 8); }
      g.stroke();
      if (R() < 0.3) { g.lineWidth = 6; g.beginPath(); g.moveTo(166, y - 12); g.lineTo(end, y - 14); g.stroke(); g.lineWidth = 4; }
    }
    // her: the red in the margin
    g.fillStyle = '#d0102a';
    for (let k = 0; k < 7; k++) crownGlyph(g, 74, 170 + k * 128 + R() * 30, 30, '#d0102a');
    g.strokeStyle = 'rgba(150,10,30,0.8)'; g.lineWidth = 10; g.beginPath(); g.arc(860, 300, 92, 0, Math.PI * 2); g.stroke();
    const grd = g.createRadialGradient(990, 820, 20, 990, 820, 260); grd.addColorStop(0, 'rgba(160,0,24,0.95)'); grd.addColorStop(0.6, 'rgba(170,0,30,0.7)'); grd.addColorStop(1, 'rgba(170,0,30,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(990, 820, 260, 0, Math.PI * 2); g.fill();
  });
}
// the compass: a rose in brass and cream, and where north should be, her crown
export function compassTexture() {
  return canvasTex(1024, 1024, (g, W, H) => {
    const cx = W / 2, cy = H / 2;
    g.fillStyle = '#efe4c4'; g.beginPath(); g.arc(cx, cy, 500, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6a4a1a'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 470, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 400, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r0 = i % 9 === 0 ? 408 : 432; g.lineWidth = i % 9 === 0 ? 6 : 3; g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * 466, cy - Math.cos(a) * 466); g.stroke(); }
    // the rose
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, r = i % 2 ? 230 : 380;
      g.fillStyle = i % 2 ? '#8a6a3a' : '#2a2020';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a - 0.16) * 70, cy - Math.cos(a - 0.16) * 70); g.lineTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r); g.closePath(); g.fill();
      g.fillStyle = i % 2 ? '#b8945a' : '#5a4a40';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a + 0.16) * 70, cy - Math.cos(a + 0.16) * 70); g.lineTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r); g.closePath(); g.fill();
    }
    g.fillStyle = '#2a2020'; g.font = '900 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('S', cx, cy + 352); g.fillText('E', cx + 352, cy); g.fillText('W', cx - 352, cy);
    crownGlyph(g, cx, cy - 340, 46, '#d0102a');
  });
}

// ---------- the things ----------
export const PROP = {
  // her perfume: a grenade of red glass, its gold lever down the side, the cap; the label wraps it
  bottle() {
    const g = lathe([[0, 0], [3.4, 0.25], [5.8, 1.3], [7.1, 3.3], [7.7, 6.0], [7.8, 9.0], [7.5, 12.0], [6.7, 14.6], [5.3, 16.6], [3.5, 18.0], [2.7, 18.6]], 48);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z);
      if (r < 0.01 || y < 0.6 || y > 17.5) continue;
      const th = Math.atan2(z, x);
      const lump = Math.pow((0.5 + 0.5 * Math.cos(th * 12)) * (0.5 + 0.5 * Math.cos((y - 1.2) * Math.PI * 2 / 3.3)), 0.6);
      const k = 1 + 0.05 * lump;
      P.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals();
    const n = P.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const y = P.getY(i), x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); const k = 0.55 + 0.45 * Math.min(1, (r - 6.9) / 0.6 + 0.6); const hi = y / 18; col[i * 3] = (0.8 + 0.2 * hi) * k; col[i * 3 + 1] = 0.03 + 0.08 * hi * k; col[i * 3 + 2] = (0.14 + 0.1 * hi) * k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  },
  bottleGold() {
    const parts = [];
    parts.push(cyl(2.7, 2.9, 2.4, 24, 0, 19.6, 0, GOLD));
    parts.push(cyl(3.2, 3.2, 2.8, 24, 0, 22.2, 0, GOLD));
    parts.push(sph(3.2, 1, 0.42, 1, 0, 23.6, 0, GOLD, 24, 10));
    // the lever down her side
    const pts = [[2.6, 23.4], [5.6, 21.6], [7.6, 17.6], [8.6, 13.4], [8.7, 9.6], [8.3, 7.0]];
    for (let i = 0; i + 1 < pts.length; i++) parts.push(beam([pts[i][0], pts[i][1], 0], [pts[i + 1][0], pts[i + 1][1], 0], 0.55, 2.6, GOLD));
    // the band the label sits in, top and bottom
    parts.push(hring(7.85, 0.22, 7.4, GOLD)); parts.push(hring(7.85, 0.22, 11.2, GOLD));
    return merge(parts);
  },
  // the label's face: a band of the bottle's own curve, the picture wrapped on it
  bottleLabel() { const g = new THREE.CylinderGeometry(7.95, 7.95, 3.6, 32, 1, true, -0.62, 1.24); g.translate(0, 9.3, 0); return g; },
  // the pin: its ring and the shaft through the cap, from where it sits in the cap (x 0)
  pin() { return merge([tor(2.0, 0.32, -2.9, -1.7, 0, GOLD, 8, 28), rod([0.2, 0, 0], [-1.4, -0.2, 0], 0.26, GOLD), rod([-1.4, -0.2, 0], [-0.9, -0.2, 0], 0.26, GOLD), rod([7.0, 0, 0], [0.2, 0, 0], 0.24, GOLD)]); },
  // the glass when it goes: a shard
  shard() { const g = new THREE.TetrahedronGeometry(1.0); g.scale(1.4, 0.5, 0.9); return paint(g, [0.95, 0.12, 0.25]); },
  // the plinth her bottle stands on: black lacquer, a gold edge
  plinth() { return merge([cyl(10.5, 11, 1.4, 48, 0, 0.7, 0, BLACK), cyl(10.6, 10.6, 0.25, 48, 0, 1.45, 0, GOLD)]); },

  // four start lights on a striped gantry over the road: the count to four
  gantry() {
    const parts = [];
    for (const x of [-14, 14]) { parts.push(box(1.4, 26, 1.4, x, 13, 0, CHAR)); parts.push(box(3, 0.8, 3, x, 0.4, 0, CHAR)); }
    for (let k = 0; k < 15; k++) parts.push(box(2.0, 2.0, 1.8, -14 + k * 2.0, 25, 0, k % 2 ? BLACK : YELLOW));
    for (const x of [-7.5, -2.5, 2.5, 7.5]) {
      const h = new THREE.CylinderGeometry(1.9, 1.9, 1.6, 20); h.rotateX(Math.PI / 2); h.translate(x, 21.6, 0); parts.push(paint(h, BLACK));
      parts.push(box(0.4, 1.6, 0.4, x, 23.6, 0, CHAR));
      for (const z of [-0.9, 0.9]) { const v = new THREE.CircleGeometry(1.5, 20); if (z < 0) v.rotateY(Math.PI); v.translate(x, 21.6, z); parts.push(paint(v, [0.28, 0.02, 0.04])); }
    }
    return merge(parts);
  },
  // a road warning sign: the yellow diamond with its black rim, on a post (the words are a face)
  warnSign() {
    const parts = [cyl(0.32, 0.32, 15, 8, 0, 7.5, -0.4, STEEL)];
    const d = new THREE.BoxGeometry(10.6, 10.6, 0.3); d.rotateZ(Math.PI / 4); d.translate(0, 15, -0.2); parts.push(paint(d, BLACK));
    const y = new THREE.BoxGeometry(9.6, 9.6, 0.3); y.rotateZ(Math.PI / 4); y.translate(0, 15, 0); parts.push(paint(y, YELLOW));
    return merge(parts);
  },
  // a roadworks barricade: two A-frames, two striped boards, a beacon on the top corner
  barricade() {
    const parts = [];
    for (const x of [-5.2, 5.2]) { parts.push(beam([x, 0, -1.6], [x, 9.6, 0], 0.5, 0.5, WHITE)); parts.push(beam([x, 0, 1.6], [x, 9.6, 0], 0.5, 0.5, WHITE)); }
    for (const [y, h] of [[8.4, 1.5], [5.4, 1.5]]) for (let k = 0; k < 6; k++) {
      const g = new THREE.BoxGeometry(2.0, h, 0.35); g.translate(-5.6 + 1 + k * 2.0 + 0.12, y, 0); g.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0.55, 0, 0, 0)); parts.push(paint(g, k % 2 ? WHITE : RED));
    }
    parts.push(box(1.2, 0.9, 1.2, 5.2, 10.0, 0, BLACK));
    return merge(parts);
  },
  // the beacon's dome (lit from inside: the world gives it its own material)
  dome() { const g = new THREE.SphereGeometry(0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(0, 0, 0); return paint(g, [1, 0.12, 0.12]); },
  // a beam of light: an open cone up its own y, from the lamp outward
  beamCone(len = 36, r = 4.2) { const g = new THREE.CylinderGeometry(r, 0.35, len, 14, 1, true); g.translate(0, len / 2, 0); return g; },
  // a tall frame for a neon sign: two posts, a backing box (the sign is a face)
  neonFrame() { return merge([box(0.8, 32, 0.8, -12, 16, -0.9, CHAR), box(0.8, 32, 0.8, 12, 16, -0.9, CHAR), box(27, 9, 0.8, 0, 27, -0.9, rgb(0x120608))]); },
  // the empty cushion her crown should be on: a column, its top, red velvet with gold tassels
  cushion() {
    const parts = [lathe([[0, 0], [5.2, 0], [5.2, 1.2], [3.8, 1.8], [3.4, 2.6], [3.0, 12], [3.6, 12.6], [5.0, 13.2], [5.0, 14.2], [0, 14.2]], 32)];
    paint(parts[0], WHITE);
    parts.push(sph(1, 4.4, 1.1, 4.4, 0, 15.2, 0, VELVET, 24, 12));
    for (const [x, z] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) { parts.push(sph(0.5, 1, 1, 1, x, 15.2, z, GOLD, 8, 6)); parts.push(cyl(0.18, 0.55, 1.6, 8, x * 1.05, 14.0, z * 1.05, GOLD)); }
    parts.push(hring(4.3, 0.2, 15.2, GOLD, 6, 40));
    return merge(parts);
  },
  // her crown: a gold band, its points with pearls, red stones round the band, red velvet inside
  crown() {
    const parts = [];
    const band = lathe([[3.0, 0], [3.2, 0.1], [3.2, 1.8], [3.0, 1.9], [2.8, 1.8], [2.8, 0.1]], 40); parts.push(paint(band, GOLD));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, tall = i % 2 ? 2.2 : 3.4;
      const c = new THREE.ConeGeometry(0.62, tall, 4); c.translate(0, 1.8 + tall / 2, 0); c.rotateY(a); c.translate(Math.cos(a) * 3.0, 0, -Math.sin(a) * 3.0); parts.push(paint(c, GOLD));
      parts.push(sph(0.34, 1, 1, 1, Math.cos(a) * 3.0, 1.9 + tall, -Math.sin(a) * 3.0, i % 2 ? WHITE : LIPSTICK, 10, 8));
      const b = a + Math.PI / 8; parts.push(sph(0.42, 1, 1, 0.6, Math.cos(b) * 3.22, 0.95, -Math.sin(b) * 3.22, i % 2 ? BLUE : LIPSTICK, 10, 8));
    }
    parts.push(sph(2.75, 1, 0.75, 1, 0, 1.6, 0, VELVET, 20, 10));
    parts.push(sph(0.5, 1, 1, 1, 0, 3.8, 0, GOLD, 10, 8)); parts.push(box(0.3, 1.4, 0.3, 0, 4.7, 0, GOLD)); parts.push(box(1.1, 0.3, 0.3, 0, 4.9, 0, GOLD));
    return merge(parts);
  },

  // ---------- his apartment ----------
  // his front door: the door itself blown in, lying on the floor inside
  doorLeaf() { return merge([box(12, 0.8, 24, 0, 0.4, 0, rgb(0x3a2a2a)), box(9, 0.3, 9, 0, 0.9, -5, rgb(0x4a3636)), box(9, 0.3, 9, 0, 0.9, 6, rgb(0x4a3636)), cyl(0.6, 0.6, 0.6, 12, 4.6, 1.1, 1, BRASS), box(1.6, 0.3, 1.4, 0, 0.95, 10.4, BRASS)]); },
  // her things in boxes, taped shut, stacked by the wall
  boxes() {
    const parts = [], R = seeded(11);
    const stack = [[0, 0, 0, 9, 7, 8], [10, 0, 1, 8, 6, 7], [3, 7, 0.5, 8, 6, 7], [-9, 0, 0, 7, 5, 7], [-8.6, 5, -0.4, 6, 4.5, 6]];
    for (const [x, y, z, w, h, d] of stack) {
      const rot = (R() - 0.5) * 0.2;
      const b = box(w, h, d, 0, h / 2, 0, CARDBOARD); b.rotateY(rot); b.translate(x, y, z); parts.push(b);
      const t = box(w + 0.05, 0.08, 1.4, 0, h + 0.02, 0, TAPE); t.rotateY(rot); t.translate(x, y, z); parts.push(t);
      const t2 = box(1.4, h * 0.5, d + 0.05, 0, h * 0.75, 0, TAPE); t2.rotateY(rot); t2.translate(x, y, z); parts.push(t2);
    }
    return merge(parts);
  },
  // a picture frame left face down on a little table
  frameDown() { return merge([box(10, 0.6, 7, 0, 9.6, 0, DWOOD), box(1, 9.3, 1, -4.2, 4.65, -2.8, DWOOD), box(1, 9.3, 1, 4.2, 4.65, -2.8, DWOOD), box(1, 9.3, 1, -4.2, 4.65, 2.8, DWOOD), box(1, 9.3, 1, 4.2, 4.65, 2.8, DWOOD), box(6.4, 0.5, 4.8, 0.4, 10.15, 0.2, rgb(0x1a1210)), box(5.6, 0.52, 4.0, 0.4, 10.17, 0.2, rgb(0xe8e0d0))]); },
  // her red coat still on the stand by the door
  coat() {
    const parts = [cyl(0.4, 0.4, 24, 8, 0, 12, 0, DWOOD), cyl(3.2, 3.6, 0.8, 16, 0, 0.4, 0, DWOOD)];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; parts.push(rod([0, 22, 0], [Math.cos(a) * 2.4, 23.6, Math.sin(a) * 2.4], 0.22, DWOOD)); }
    const body = lathe([[0.4, 0], [3.6, 0.2], [4.2, 4], [3.8, 9], [3.1, 12.5], [2.4, 14.5], [1.0, 15.6], [0.2, 15.8]], 24); body.scale(1, 1, 0.55); body.translate(0, 6.2, 0.6); parts.push(paint(body, RED));
    for (const x of [-1, 1]) parts.push(paint(beam([x * 2.6, 20.6, 0.6], [x * 3.6, 11.0, 1.0], 1.5, 1.6), DRED));
    parts.push(box(0.3, 9, 0.2, 0, 14, 2.65, DRED));
    return merge(parts);
  },
  // the hole in the wall at fist height (a face on the wall: dark inside, the broken edge, the cracks)
  hole() {
    const parts = [], R = seeded(5);
    const s = new THREE.Shape(); const N = 14;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = 2.0 + R() * 1.2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); }
    s.closePath(); parts.push(paint(new THREE.ShapeGeometry(s), [0.02, 0.015, 0.015]));
    for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, r0 = 2.6, r1 = 5 + R() * 5; let px = Math.cos(a) * r0, py = Math.sin(a) * r0; for (let k = 0; k < 3; k++) { const qa = a + (R() - 0.5) * 0.8, l = (r1 - r0) / 3, qx = px + Math.cos(qa) * l, qy = py + Math.sin(qa) * l; const g = beam([px, py, 0.02], [qx, qy, 0.02], 0.12, 0.02, [0.12, 0.1, 0.1]); parts.push(g); px = qx; py = qy; } }
    return merge(parts);
  },

  // ---------- the bathroom ----------
  // the shower: its tray, the chrome frame and the glass (the glass is its own), the pipe, the head
  shower() {
    const parts = [box(18, 1.2, 14, 0, 0.6, 0, PORCELAIN)];
    for (const [x, z] of [[-9, 7], [9, 7], [-9, -7], [9, -7]]) parts.push(box(0.5, 27, 0.5, x, 13.5, z, CHROME));
    parts.push(box(18.5, 0.5, 0.5, 0, 27, 7, CHROME)); parts.push(box(0.5, 0.5, 14.5, -9, 27, 0, CHROME)); parts.push(box(0.5, 0.5, 14.5, 9, 27, 0, CHROME)); parts.push(box(18.5, 0.5, 0.5, 0, 27, -7, CHROME));
    parts.push(cyl(0.35, 0.35, 22, 10, 0, 12, -6.6, CHROME));
    parts.push(rod([0, 23, -6.6], [0, 24.4, -3.4], 0.35, CHROME));
    parts.push(box(1.6, 1.2, 1.0, -2, 9, -6.5, CHROME)); parts.push(box(1.6, 1.2, 1.0, 2, 9, -6.5, CHROME));
    return merge(parts);
  },
  showerHead() { return merge([cyl(1.9, 0.9, 0.7, 20, 0, 0, 0, CHROME), cyl(1.95, 1.95, 0.15, 20, 0, -0.42, 0, rgb(0x9aa0aa))]); },
  showerGlass() { return merge([box(18, 26, 0.2, 0, 13.6, 7, GLASSC), box(0.2, 26, 14, 9, 13.6, 0, GLASSC)]); },
  // the basin, and the cup with his toothbrush and the new girl's in it
  sink() {
    const parts = [lathe([[0, 0], [2.2, 0], [1.8, 0.6], [1.6, 9], [5.6, 10.6], [6.2, 12.0], [6.0, 12.2], [4.6, 11.4], [0, 11.6]], 32)];
    paint(parts[0], PORCELAIN);
    parts.push(rod([0, 12.2, -5.4], [0, 15, -5.4], 0.4, CHROME)); parts.push(rod([0, 15, -5.4], [0, 15, -3.2], 0.36, CHROME));
    parts.push(cyl(1.2, 1.0, 3.2, 16, 3.4, 13.8, -4.2, rgb(0xa8d8e8)));
    parts.push(rod([3.0, 13.2, -4.2], [2.2, 19.6, -4.4], 0.22, rgb(0x2a6ad8))); parts.push(box(0.7, 1.3, 0.5, 2.15, 19.6, -4.1, WHITE));
    parts.push(rod([3.8, 13.2, -4.2], [4.8, 19.4, -4.1], 0.22, rgb(0xff6aa8))); parts.push(box(0.7, 1.3, 0.5, 4.85, 19.4, -3.85, WHITE));
    return merge(parts);
  },
  // a mirror's frame (the glass is a face with her writing on it)
  mirrorFrame() { return merge([box(21, 1, 0.8, 0, 6.6, 0, CHROME), box(21, 1, 0.8, 0, -6.6, 0, CHROME), box(1, 14.2, 0.8, -10.4, 0, 0, CHROME), box(1, 14.2, 0.8, 10.4, 0, 0, CHROME), box(21.6, 14.6, 0.3, 0, 0, -0.5, rgb(0x2a2a30))]); },

  // ---------- the kitchen ----------
  // the counter along the wall: cupboards, the top, the knife block with one slot empty, the kettle
  counter() {
    const parts = [box(34, 9, 8, 0, 4.5, 0, rgb(0x2a3a4a)), box(35, 0.9, 9, 0, 9.45, 0.3, rgb(0xe8e4dc))];
    for (let i = 0; i < 4; i++) { parts.push(box(7.6, 7.4, 0.3, -12.75 + i * 8.5, 4.7, 4.1, rgb(0x34485a))); parts.push(box(2.4, 0.4, 0.4, -12.75 + i * 8.5, 7.6, 4.4, CHROME)); }
    const blk = box(5, 7, 4, 0, 3.5, 0, WOOD); blk.rotateX(-0.35); blk.translate(-4, 9.9, -0.5); parts.push(blk);
    for (let k = 0; k < 6; k++) {
      // (the empty one: a dark slot where her knife went)
      if (k === 4) { const s = box(0.9, 0.7, 0.9, 0, 0, 0, [0.0, 0.0, 0.0]); s.translate(-0.65, 7.0, 0.6); s.rotateX(-0.35); s.translate(-4, 9.9, -0.5); parts.push(s); continue; }
      const h = cyl(0.32, 0.38, 3.2, 8, 0, 1.6, 0, BLACK); h.translate(-1.9 + (k % 3) * 1.25, 6.9, (k < 3 ? -0.6 : 0.6)); h.rotateX(-0.35); h.translate(-4, 9.9, -0.5); parts.push(h);
    }
    parts.push(cyl(2.0, 2.4, 4.4, 20, 8, 12.1, -1, CHROME)); parts.push(rod([10.2, 13.6, -1], [11.4, 11.4, -1], 0.4, BLACK)); parts.push(rod([6.2, 14.2, -1], [5.0, 14.8, -1], 0.4, CHROME));
    return merge(parts);
  },

  // ---------- the store ----------
  // the endcap of her perfume, its grenades in rows, the tester on top
  perfumeStand() {
    const parts = [box(13, 15, 6, 0, 7.5, 0, rgb(0x1a1418)), box(13.6, 0.6, 6.6, 0, 15.3, 0, GOLD)];
    for (let r = 0; r < 3; r++) {
      parts.push(box(12.4, 0.4, 3.0, 0, 3 + r * 4.1, 3.4, rgb(0x2a2228)));
      for (let k = 0; k < 6; k++) { const x = -5.2 + k * 2.08, y = 3.2 + r * 4.1; parts.push(sph(0.85, 1, 1.2, 1, x, y + 1.0, 3.6, RED, 10, 8)); parts.push(cyl(0.34, 0.34, 0.5, 8, x, y + 2.25, 3.6, GOLD)); }
    }
    const big = lathe([[0, 0], [1.6, 0.1], [2.2, 1.2], [2.3, 2.6], [1.8, 3.8], [0.9, 4.3], [0, 4.4]], 20); big.translate(0, 15.6, 0); parts.push(paint(big, RED));
    parts.push(cyl(0.5, 0.5, 1.2, 10, 0, 20.4, 0, GOLD)); parts.push(box(0.8, 0.8, 1.4, 0, 21.2, 0.5, GOLD));
    return merge(parts);
  },
  // the sign hung over aisle four: rods up to the ceiling, the blue board (its words are a face)
  aisleSign() { return merge([box(0.3, 9, 0.3, -6.5, 4.5, 0, STEEL), box(0.3, 9, 0.3, 6.5, 4.5, 0, STEEL), box(17, 6.4, 0.6, 0, -3.2, 0, rgb(0x0a2a8a)), box(17.4, 0.4, 0.8, 0, 0, 0, WHITE), box(17.4, 0.4, 0.8, 0, -6.4, 0, WHITE)]); },
  // a checkout: the counter, the belt, the scanner window, the register on its pole, the candy
  checkout() {
    const parts = [box(7, 7.4, 26, 0, 3.7, 0, rgb(0xd8d4cc)), box(7.2, 0.4, 26.2, 0, 7.6, 0, rgb(0x8a8e98))];
    parts.push(box(4.6, 0.3, 17, -0.6, 7.9, -4, rgb(0x16161a)));
    for (let k = 0; k < 9; k++) parts.push(box(4.4, 0.06, 0.25, -0.6, 8.06, -12 + k * 2, rgb(0x34343a)));
    parts.push(box(4.6, 0.25, 4.0, -0.6, 7.95, 6.6, rgb(0x0a0a0c)));
    parts.push(box(0.7, 7, 0.7, 2.8, 11.2, 10, CHAR)); parts.push(box(4.2, 3.2, 1.6, 2.8, 15.6, 10, CHAR));
    parts.push(box(3.0, 9, 3.2, 1.8, 4.5, -15, rgb(0xb8b4ac)));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) parts.push(box(0.5, 2.0, 0.6, 3.4, 1.8 + r * 2.6, -16.1 + k * 0.78, [[1, 0.2, 0.3], [0.2, 0.5, 1], [1, 0.8, 0.1], [0.3, 0.8, 0.3]][(r + k) % 4]));
    return merge(parts);
  },
  // the red basket, dropped on its side
  basket() {
    const parts = [];
    parts.push(box(9, 0.5, 6, 0, 0.25, 0, BASKET));
    for (const z of [-3, 3]) for (let k = 0; k < 5; k++) parts.push(box(9, 0.5, 0.4, 0, 0.8 + k * 1.0, z, BASKET));
    for (const x of [-4.5, 4.5]) for (let k = 0; k < 5; k++) parts.push(box(0.4, 0.5, 6, x, 0.8 + k * 1.0, 0, BASKET));
    for (let k = 0; k < 6; k++) { parts.push(box(0.4, 5, 0.4, -4.5 + k * 1.8, 2.6, 3, BASKET)); parts.push(box(0.4, 5, 0.4, -4.5 + k * 1.8, 2.6, -3, BASKET)); }
    for (const z of [-2.2, 2.2]) { const h = tor(3.4, 0.28, 0, 5.2, z, BLACK, 6, 16, Math.PI); parts.push(h); }
    const g = merge(parts); g.rotateX(Math.PI / 2 - 0.15); g.translate(0, 3, 0); return g;
  },
  orange() { return sph(1.3, 1, 1, 1, 0, 1.3, 0, ORANGE, 12, 8); },

  // ---------- the bedroom ----------
  // a nightstand with its lamp (the shade lights from the world)
  nightLamp() { return merge([box(7, 6, 6, 0, 3, 0, WOOD), box(7.3, 0.4, 6.3, 0, 6.2, 0, DWOOD), box(5.6, 0.25, 0.3, 0, 4.4, 3.05, BRASS), cyl(1.4, 1.8, 0.7, 16, 0, 6.75, 0, BRASS), cyl(0.35, 0.35, 4, 8, 0, 9, 0, BRASS)]); },
  lampShade() { const g = lathe([[3.85, 0], [2.45, 3.6], [2.3, 3.62], [3.7, 0.02]], 24); g.translate(0, 10.4, 0); return paint(g, LAMPSHADE); },
  floorLamp() { return merge([cyl(2.4, 2.6, 0.6, 16, 0, 0.3, 0, CHAR), cyl(0.3, 0.3, 20, 8, 0, 10, 0, CHAR)]); },
  floorShade() { const g = lathe([[4.2, 0], [2.6, 4.4], [2.5, 4.42], [4.1, 0.02]], 24); g.translate(0, 19.4, 0); return paint(g, LAMPSHADE); },
  // her phone on its stand on the nightstand (its screen is a face)
  phone() { return merge([box(8, 6, 6, 0, 3, 0, WOOD), box(8.3, 0.4, 6.3, 0, 6.2, 0, DWOOD), box(3.6, 0.6, 2.4, 0, 6.7, 0.2, CHAR), box(0.6, 3.2, 1.6, 0, 8.4, -1.0, CHAR), box(6.8, 12.6, 0.7, 0, 13.2, 0, rgb(0x16161c))]); },
  // a pin stuck in the floor like one on a map
  pin2() { return merge([cyl(0.08, 0.16, 6.4, 6, 0, 3.2, 0, CHROME), sph(1.15, 1, 1, 1, 0, 6.8, 0, LIPSTICK, 12, 8), cyl(0.5, 0.8, 0.8, 10, 0, 5.9, 0, LIPSTICK)]); },

  // ---------- the therapist's office ----------
  armchair() {
    const parts = [box(12, 4, 11, 0, 2.6, 0, LEATHER), box(12, 11, 2.6, 0, 7, -4.6, LEATHER), box(2.4, 6.8, 11, -6.6, 4.0, 0.2, LEATHER), box(2.4, 6.8, 11, 6.6, 4.0, 0.2, LEATHER)];
    for (const [x, z] of [[-6, -4.8], [6, -4.8], [-6, 4.8], [6, 4.8]]) parts.push(cyl(0.4, 0.3, 0.8, 6, x, 0.4, z, DWOOD));
    for (let k = 0; k < 5; k++) for (let j = 0; j < 3; j++) parts.push(sph(0.22, 1, 1, 0.5, -4 + k * 2, 5 + j * 2.6, -3.25, BRASS, 6, 4));
    return merge(parts);
  },
  // the little table by the chair: the box of tissues, the glass of water, the notepad propped (a face)
  sideTable() {
    const parts = [cyl(3.6, 3.6, 0.5, 20, 0, 9, 0, DWOOD), cyl(0.5, 0.6, 9, 8, 0, 4.5, 0, DWOOD), cyl(2.2, 2.4, 0.4, 14, 0, 0.2, 0, DWOOD)];
    parts.push(box(3.4, 2.0, 2.2, -1.2, 10.25, -0.6, rgb(0x8ac0c8))); parts.push(sph(0.8, 1.2, 0.8, 0.8, -1.2, 11.6, -0.6, WHITE, 8, 6));
    parts.push(cyl(0.7, 0.6, 2.2, 12, 1.8, 10.35, 1.2, rgb(0xb8d0e0)));
    return merge(parts);
  },
  // the notepad's backing on its little easel
  padBoard() { return merge([box(7.4, 9.6, 0.4, 0, 4.8, 0, rgb(0x8a5a2a)), box(2.6, 0.9, 0.7, 0, 9.4, 0.3, CHROME), beam([0, 0, -0.2], [0, 4.4, -3.2], 0.4, 0.4, DWOOD)]); },
  // a wall clock: its face, rim and hands (the hands turn: a layer of their own)
  clock() { return merge([cyl(4.2, 4.2, 0.8, 32, 0, 0, 0, CHAR).rotateX(Math.PI / 2), cyl(3.8, 3.8, 0.85, 32, 0, 0, 0.05, WHITE).rotateX(Math.PI / 2)]); },
  hand(len = 3.2, w = 0.3) { const g = box(w, len, 0.15, 0, len / 2 - 0.4, 0.6, BLACK); return g; },
  // his journal open on the floor: two pages (the writing is the world's picture), a pen
  journal() {
    const parts = [];
    const cov = box(30, 0.8, 21, 0, 0.4, 0, rgb(0x3a1a12)); parts.push(cov);
    // (propped up toward you, like a book on a stand)
    const g = merge(parts); g.rotateX(1.15); g.translate(0, 9.6, 0); return g;
  },
  journalPages() {
    const L = new THREE.PlaneGeometry(14.2, 20, 8, 1), Rg = new THREE.PlaneGeometry(14.2, 20, 8, 1);
    for (const [g, sg] of [[L, -1], [Rg, 1]]) {
      g.rotateX(-Math.PI / 2);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i); const u = (x + 7.1) / 14.2; const xx = sg * (u * 14.2 + 0.2); P.setXYZ(i, xx, 1.0 + 1.6 * Math.sin(Math.min(1, (sg > 0 ? u : 1 - u) * 1.2) * Math.PI * 0.5) * (sg > 0 ? 1 - u : u) * 2.2, P.getZ(i)); }
      if (sg < 0) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
      g.computeVertexNormals();
    }
    const out = merge([L, Rg]); out.rotateX(1.15); out.translate(0, 9.6, 0);
    return out;
  },
  pen() { const g = merge([rod([-8, 2.6, 4], [6, 2.6, -5], 0.42, rgb(0x14142a)), rod([6, 2.6, -5], [7.4, 2.6, -5.9], 0.25, GOLD)]); g.rotateX(1.15); g.translate(0, 9.6, 0); return g; },

  // ---------- inside his head ----------
  // the twin-bell alarm clock at 3:47 (the face and hands are drawn on it)
  alarmClock() {
    const parts = [cyl(7, 7, 4, 40, 0, 0, 0, RED).rotateX(Math.PI / 2).translate(0, 10, 0), cyl(6.2, 6.2, 4.1, 40, 0, 0, 0, CREAM).rotateX(Math.PI / 2).translate(0, 10, 0.05)];
    for (const x of [-1, 1]) { parts.push(sph(3.0, 1, 1, 1, x * 4.4, 17.2, -0.4, CHROME, 16, 8)); parts.push(rod([x * 2.2, 15.6, 0], [x * 3.6, 16.4, -0.3], 0.3, CHROME)); parts.push(rod([x * 3.6, 0.6, 0], [x * 4.6, 4.6, 0], 0.5, CHROME)); }
    parts.push(rod([0, 16.4, 0], [0, 19.6, 0], 0.3, CHROME)); parts.push(box(2.6, 0.4, 0.6, 0, 19.8, 0, CHROME));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; parts.push(box(i % 3 ? 0.35 : 0.6, i % 3 ? 1.0 : 1.6, 0.2, Math.sin(a) * 5.2, 10 + Math.cos(a) * 5.2, 2.15, BLACK)); }
    // 3:47: the hour hand just short of four, the minute hand on 47
    const hh = box(0.7, 3.4, 0.25, 0, 1.4, 0, BLACK); hh.rotateZ(-((3 + 47 / 60) / 12) * Math.PI * 2); hh.translate(0, 10, 2.3); parts.push(hh);
    const mh = box(0.45, 5.0, 0.25, 0, 2.2, 0, BLACK); mh.rotateZ(-(47 / 60) * Math.PI * 2); mh.translate(0, 10, 2.35); parts.push(mh);
    return merge(parts);
  },
  // the calendar page stood up like a slab (the page is the world's picture)
  calendarSlab() { return merge([box(15, 21, 1, 0, 11.5, -0.6, rgb(0x2a2228)), box(15.4, 1.2, 1.4, 0, 22.4, -0.4, CHROME), cyl(0.3, 0.3, 1.6, 8, -4, 22.4, 0.3, CHROME), box(4, 1, 4, 0, 0.5, 0, CHAR)]); },
  // a wine glass on its side, the wine gone out of it
  wineGlass() {
    const g = lathe([[0, 0], [3.4, 0.05], [3.4, 0.35], [0.4, 0.6], [0.35, 6.5], [1.2, 7.4], [3.2, 9.6], [3.8, 12.6], [3.6, 15.6], [3.45, 15.6], [3.65, 12.6], [3.05, 9.7], [0, 7.6]], 32);
    paint(g, GLASSC); g.rotateZ(Math.PI / 2 - 0.08); g.translate(7.6, 3.5, 0);
    return g;
  },
  penny() { const g = new THREE.CylinderGeometry(0.9, 0.9, 0.16, 16); return paint(g, COPPER); },
  // a motion floodlight on a pole, its head tipped at the road
  flood() { return merge([cyl(0.35, 0.45, 20, 8, 0, 10, 0, CHAR), box(1.2, 1.2, 1.8, 0, 19.6, 0.6, CHAR), box(4.6, 3.2, 2.0, 0, 20.4, 1.8, rgb(0x1e1e22)), box(1.2, 1.0, 1.2, 0, 17.6, 0.8, WHITE)]); },
  floodLens() { const g = new THREE.PlaneGeometry(4.0, 2.6); g.translate(0, 20.4, 2.82); return paint(g, [1, 1, 0.92]); },
  // a security camera on its pole; the head turns (its own layer)
  camPole() { return merge([cyl(0.3, 0.4, 18, 8, 0, 9, 0, CHAR), box(1.4, 1.4, 1.4, 0, 18.4, 0, CHAR)]); },
  camHead() { const parts = [box(2.4, 2.4, 6.2, 0, 0, 1.4, WHITE), box(2.8, 0.4, 6.8, 0, 1.4, 1.2, rgb(0xb8bcc4)), cyl(0.9, 0.9, 0.6, 14, 0, 0, 0, BLACK).rotateX(Math.PI / 2).translate(0, 0, 4.6), box(0.8, 1.6, 0.8, 0, -1.6, 0, CHAR)]; return merge(parts); },
  // her parting gift: the box, its lid beside it, the ribbon and the bow
  gift() {
    const parts = [box(12, 9, 12, 0, 4.5, 0, rgb(0xf0ecea)), box(1.8, 9.05, 12.05, 0, 4.5, 0, LIPSTICK), box(12.05, 9.05, 1.8, 0, 4.5, 0, LIPSTICK)];
    const lid = box(13, 2.4, 13, 0, 1.2, 0, rgb(0xf0ecea)); lid.rotateX(0.5); lid.translate(-3, 2.0, 11); parts.push(lid);
    const rb = box(1.9, 2.45, 13.05, 0, 1.2, 0, LIPSTICK); rb.rotateX(0.5); rb.translate(-3, 2.0, 11); parts.push(rb);
    for (const s of [-1, 1]) { const l = tor(2.2, 0.55, 0, 0, 0, LIPSTICK, 8, 20); l.scale(1.2, 0.8, 0.6); l.rotateZ(s * 0.5); l.translate(-3 + s * 2.3, 4.6, 11.6); parts.push(l); }
    return merge(parts);
  },
  // the hippocampus: a seahorse in pale coral, its head down and its tail curled
  seahorse() {
    const pts = [[0, 28, 0], [1.2, 24.4, 0], [1.8, 20.0, 0], [1.2, 15.4, 0], [-0.6, 11.4, 0], [-1.6, 7.6, 0], [-0.8, 4.4, 0], [1.4, 3.0, 0], [2.6, 4.6, 0], [1.6, 6.0, 0]];
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const N = 64, tube = new THREE.TubeGeometry(curve, N, 1, 14, false);
    const P = tube.attributes.position, radius = (u) => (u < 0.1 ? 2.6 + 20 * u : u < 0.45 ? 4.6 - (u - 0.1) * 1.5 : 4.1 * Math.pow(1 - (u - 0.45) / 0.55, 1.2) + 0.25);
    // the tube was made with radius 1: push each ring out to the seahorse's own radius
    const tmp = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      const ring = Math.floor(i / 15), u = ring / N; curve.getPointAt(Math.min(1, u), c);
      tmp.set(P.getX(i), P.getY(i), P.getZ(i)).sub(c);
      const ridge = 1 + 0.08 * Math.sin(u * 160);
      tmp.multiplyScalar(radius(u) * ridge * (tmp.z > 0 ? 0.85 : 0.85)); tmp.x *= 1.15;
      P.setXYZ(i, c.x + tmp.x, c.y + tmp.y, c.z + tmp.z);
    }
    tube.computeVertexNormals();
    const parts = [paint(tube, CORAL)];
    // the head, its snout reaching forward, the coronet
    parts.push(sph(3.4, 1.15, 0.95, 0.9, 0.6, 29.2, 0, CORAL, 18, 12));
    parts.push(rod([2.4, 29.4, 0], [8.6, 27.4, 0], 1.0, CORAL, 12)); parts.push(sph(1.2, 1, 1, 1, 8.8, 27.3, 0, CORAL, 10, 8));
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; parts.push(cyl(0.05, 0.45, 2.2, 6, -0.4 + Math.cos(a) * 1.0, 33.4, Math.sin(a) * 1.0, CORAL)); }
    parts.push(sph(0.7, 1, 1, 0.6, 2.2, 30.4, 2.6, BLACK, 8, 6)); parts.push(sph(0.7, 1, 1, 0.6, 2.2, 30.4, -2.6, BLACK, 8, 6));
    // the fin on its back
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.quadraticCurveTo(-5.0, 2.4, -4.4, 7.2); fin.lineTo(0, 6.6); fin.closePath();
    const fg = new THREE.ShapeGeometry(fin); fg.translate(-2.2, 13.6, 0); parts.push(paint(fg, rgb(0xffd0c8)));
    // the belly plates
    for (let k = 0; k < 9; k++) parts.push(box(3.4, 0.35, 5.6, 3.6 - k * 0.32, 22 - k * 1.9, 0, rgb(0xffc8b8)));
    return merge(parts);
  },
  // the carved heart on its belly: a raised rim (the letters are a face)
  heartRim() {
    const s = new THREE.Shape(); s.moveTo(0, -3.2); s.bezierCurveTo(-5.2, 0.6, -2.8, 4.2, 0, 2.1); s.bezierCurveTo(2.8, 4.2, 5.2, 0.6, 0, -3.2);
    const h = new THREE.Shape(); h.moveTo(0, -2.4); h.bezierCurveTo(-4.0, 0.5, -2.2, 3.3, 0, 1.6); h.bezierCurveTo(2.2, 3.3, 4.0, 0.5, 0, -2.4); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); return paint(g, rgb(0x8a1020));
  },
  // the compass: its brass case stood on edge facing the road, the lid open behind (the face and
  // needle are their own)
  compassCase() {
    const parts = [];
    const ring = lathe([[10.4, -1.2], [11.2, -0.6], [11.4, 0.6], [10.8, 1.4], [10.2, 1.2], [10.1, -1.0]], 64); ring.rotateX(Math.PI / 2); parts.push(paint(ring, BRASS));
    const back = cyl(10.4, 10.4, 0.8, 48, 0, 0, 0, BRASS); back.rotateX(Math.PI / 2); back.translate(0, 0, -1.0); parts.push(back);
    const lid = cyl(11.0, 11.0, 0.8, 48, 0, 0, 0, BRASS); lid.rotateX(Math.PI / 2); lid.translate(0, 0, 0); lid.rotateX(-0.5); lid.translate(0, 9.6, -12.2); parts.push(lid);
    parts.push(tor(1.8, 0.45, 0, 12.6, 0, BRASS, 8, 20)); parts.push(box(1.6, 2.2, 1.6, 0, 11.4, 0, BRASS));
    const g = merge(parts); g.translate(0, 12.6, 0); return g;
  },
  compassFace() { const g = new THREE.CircleGeometry(10.2, 48); g.translate(0, 12.6, 0.42); return g; },
  needle() {
    const s = new THREE.Shape(); s.moveTo(0, 8.6); s.lineTo(1.1, 0); s.lineTo(0, -8.6); s.lineTo(-1.1, 0); s.closePath();
    const g = new THREE.ShapeGeometry(s), P = g.attributes.position, n = P.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const up = P.getY(i) > 0.01; c[i * 3] = up ? 0.95 : 0.9; c[i * 3 + 1] = up ? 0.08 : 0.88; c[i * 3 + 2] = up ? 0.16 : 0.84; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return merge([g, cyl(0.7, 0.7, 0.4, 12, 0, 0, 0.1, BRASS).rotateX(Math.PI / 2)]);
  },

  // ---------- the new girl's things ----------
  // a plant in a pot on a stool, a lit candle, a mug of tea, flowers in a jar
  plant() {
    const parts = [cyl(3.2, 3.2, 0.6, 16, 0, 8.4, 0, WOOD), cyl(0.4, 0.4, 8, 6, -2, 4, -2, WOOD), cyl(0.4, 0.4, 8, 6, 2, 4, -2, WOOD), cyl(0.4, 0.4, 8, 6, 0, 4, 2.4, WOOD)];
    parts.push(cyl(2.6, 1.9, 3.6, 16, 0, 10.5, 0, rgb(0xd8784a)));
    const R = seeded(23);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + R(), l = 3 + R() * 4; parts.push(rod([0, 12, 0], [Math.cos(a) * l * 0.5, 12 + l, Math.sin(a) * l * 0.5], 0.18, GREEN)); parts.push(sph(1.1, 1.4, 0.3, 0.8, Math.cos(a) * l * 0.55, 12.2 + l, Math.sin(a) * l * 0.55, LEAF, 8, 6)); }
    return merge(parts);
  },
  candle() { return merge([cyl(3.0, 3.0, 0.5, 16, 0, 8.4, 0, WOOD), cyl(0.4, 0.4, 8, 6, 0, 4, 0, WOOD), cyl(1.6, 1.6, 5, 16, 0, 11.2, 0, CREAM), cyl(0.08, 0.08, 0.8, 4, 0, 14.1, 0, BLACK)]); },
  mug() { return merge([cyl(3.0, 3.0, 0.5, 16, 0, 8.4, 0, WOOD), cyl(0.4, 0.4, 8, 6, 0, 4, 0, WOOD), cyl(1.8, 1.6, 3.8, 18, 0, 10.6, 0, rgb(0xf0d84a)), tor(1.1, 0.35, 1.9, 10.7, 0, rgb(0xf0d84a), 6, 14), cyl(1.6, 1.6, 0.1, 18, 0, 12.4, 0, rgb(0x8a5020))]); },
  flowers() {
    const parts = [cyl(3.0, 3.0, 0.5, 16, 0, 8.4, 0, WOOD), cyl(0.4, 0.4, 8, 6, 0, 4, 0, WOOD), cyl(1.4, 1.2, 4.0, 14, 0, 10.7, 0, rgb(0xb8e0e8))];
    const R = seeded(41), cols = [rgb(0xffe04a), rgb(0xfff0f4), rgb(0xff9ac0), rgb(0xa8c8ff)];
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, l = 4 + R() * 3, x = Math.cos(a) * 1.6, z = Math.sin(a) * 1.6; parts.push(rod([0, 12, 0], [x, 12 + l, z], 0.14, GREEN)); parts.push(sph(1.0, 1, 0.6, 1, x, 12.3 + l, z, cols[k % 4], 8, 6)); }
    return merge(parts);
  },

  // ---------- the last chorus ----------
  // a road flare lying on the floor (the fire is the world's)
  flare() { return merge([cyl(0.5, 0.5, 6, 10, 0, 0, 0, RED).rotateZ(Math.PI / 2 - 0.1).translate(0, 0.6, 0), cyl(0.52, 0.52, 1.2, 10, 0, 0, 0, WHITE).rotateZ(Math.PI / 2 - 0.1).translate(-2.4, 0.4, 0)]); },
  // a table set for two under one lamp: the cloth, two chairs, two glasses, a candle
  table2() {
    const parts = [cyl(6, 6, 0.6, 32, 0, 9, 0, WHITE), lathe([[6.05, 9.3], [6.4, 5.8], [6.35, 5.7], [0, 5.7]], 32), cyl(0.6, 0.8, 9, 8, 0, 4.5, 0, CHAR), cyl(3, 3.2, 0.4, 16, 0, 0.2, 0, CHAR)];
    paint(parts[1], WHITE);
    for (const s of [-1, 1]) {
      const z = s * 9.4;
      parts.push(box(6.2, 0.7, 6.2, 0, 6.2, z, WINE)); parts.push(box(6.2, 9, 0.8, 0, 11, z + s * 2.9, WINE));
      for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) parts.push(cyl(0.3, 0.3, 6, 6, dx, 3, z + dz, CHAR));
      const gl = lathe([[0, 0], [1.1, 0.05], [0.15, 0.3], [0.12, 2.0], [0.8, 2.6], [1.0, 3.6], [0.95, 4.2], [0, 2.8]], 14); gl.translate(s * 2.2, 9.3, s * 2.2); parts.push(paint(gl, GLASSC));
    }
    parts.push(cyl(0.6, 0.6, 2.4, 10, 0, 10.5, 0, CREAM));
    parts.push(cyl(0.12, 0.12, 30, 4, 0, 36, 0, CHAR));
    return merge(parts);
  },
  pendant() { const g = lathe([[0.4, 0], [4.2, -3.6], [4.0, -3.7], [0.3, -0.2]], 24); g.translate(0, 21, 0); return paint(g, rgb(0x1a1a20)); },
  // one leaf of an EMERGENCY EXIT door, its push bar both sides (the world swings two of them open)
  exitDoor() { return merge([box(11.6, 22, 0.8, 0, 11, 0, rgb(0x8a1418)), box(9.4, 0.8, 1.0, 0, 10.6, 0.8, CHROME), box(9.4, 0.8, 1.0, 0, 10.6, -0.8, CHROME), box(11.8, 0.6, 1.0, 0, 21.7, 0, rgb(0x5a0a10))]); },
  // an LED alert board's housing: a black box with a steel frame (the words are a face)
  boardBox() { return merge([box(27, 9.4, 1.6, 0, 0, -0.9, rgb(0x0a0a0c)), box(27.8, 0.6, 2.0, 0, 4.9, -0.9, STEEL), box(27.8, 0.6, 2.0, 0, -4.9, -0.9, STEEL), box(0.6, 10.4, 2.0, -13.7, 0, -0.9, STEEL), box(0.6, 10.4, 2.0, 13.7, 0, -0.9, STEEL), box(3, 1.6, 1.0, 10.8, -3.8, -0.05, rgb(0x1a1a1e))]); },
};

// ---------- what furnishes his rooms, along their walls (each stands on the floor, its back to the
// wall, its front at +z) ----------
const BOOKS = [rgb(0x8a1a1a), rgb(0x1a3a6a), rgb(0xd8c8a0), rgb(0x2a5a3a), rgb(0x5a3a6a), rgb(0xc89a2a), rgb(0x1a1a1a), rgb(0xe8e0d0), rgb(0x8a5a2a), rgb(0x3a7a8a)];
export const FURN = {
  bookshelf() {
    const parts = [box(16, 22, 0.6, 0, 11, -2.2, DWOOD), box(0.8, 22, 5, -7.6, 11, 0, WOOD), box(0.8, 22, 5, 7.6, 11, 0, WOOD), box(16, 0.8, 5, 0, 21.6, 0, WOOD)];
    const R = seeded(5);
    for (let s = 0; s < 5; s++) {
      const y = 0.4 + s * 4.3; parts.push(box(15.2, 0.6, 4.8, 0, y, 0, WOOD));
      let x = -7.0;
      while (x < 6.6) { const w = 0.45 + R() * 0.55, h = 2.4 + R() * 1.3; if (R() < 0.08) { x += 1.2; continue; } const b = box(w, h, 3.4 + R() * 0.6, x + w / 2, y + 0.3 + h / 2, 0.2, BOOKS[Math.floor(R() * BOOKS.length)]); if (R() < 0.06) b.rotateZ(0.25); parts.push(b); x += w + 0.05; }
    }
    return merge(parts);
  },
  sideboard() {
    const parts = [box(18, 7, 5, 0, 3.8, 0, WOOD), box(18.4, 0.5, 5.4, 0, 7.5, 0, DWOOD)];
    for (const x of [-6, 0, 6]) { parts.push(box(5.6, 5.6, 0.25, x, 3.9, 2.55, DWOOD)); parts.push(box(0.5, 0.5, 0.4, x + 2.0, 4.6, 2.8, BRASS)); }
    for (const x of [-7.5, 7.5]) parts.push(box(0.5, 0.6, 4, x, 0.3, 0, DWOOD));
    // his own photo still up on it, and a bowl for his keys
    parts.push(box(3.4, 4.2, 0.4, 5, 9.9, -1, DWOOD)); parts.push(box(2.8, 3.6, 0.42, 5, 9.9, -0.98, rgb(0x8aa0b8)));
    parts.push(cyl(2.0, 1.2, 0.9, 16, -4, 8.2, 0.4, rgb(0x3a5a6a)));
    return merge(parts);
  },
  radiator() { const parts = [box(11, 0.5, 1.2, 0, 1.2, 0, WHITE), box(11, 0.5, 1.2, 0, 6.6, 0, WHITE)]; for (let k = 0; k < 12; k++) parts.push(box(0.55, 5.6, 1.4, -5.2 + k * 0.94, 3.9, 0, WHITE)); parts.push(box(0.6, 1.2, 0.6, -5.6, 0.6, 0, CHROME)); return merge(parts); },
  door() { return merge([box(1.2, 25, 1.2, -6.4, 12.5, 0, WHITE), box(1.2, 25, 1.2, 6.4, 12.5, 0, WHITE), box(14, 1.2, 1.2, 0, 25.6, 0, WHITE), box(11.6, 24.4, 0.5, 0, 12.2, -0.2, rgb(0x6a5a50)), box(9.6, 9.6, 0.3, 0, 17.6, 0.15, rgb(0x5a4a42)), box(9.6, 9.6, 0.3, 0, 6.2, 0.15, rgb(0x5a4a42)), sph(0.6, 1, 1, 1, 4.6, 11.8, 0.4, BRASS, 8, 6)]); },
  sofa() {
    const parts = [box(22, 4, 9, 0, 3.6, 0, rgb(0x3a4a5a)), box(22, 7, 2.6, 0, 7.6, -3.4, rgb(0x34424f)), box(2.6, 5.6, 9, -10.5, 5.0, 0, rgb(0x34424f)), box(2.6, 5.6, 9, 10.5, 5.0, 0, rgb(0x34424f))];
    for (const x of [-5, 5]) parts.push(box(9.4, 1.8, 6.4, x, 6.4, 0.6, rgb(0x46566a)));
    for (const x of [-9, 9]) for (const z of [-3.6, 3.6]) parts.push(box(0.8, 1.6, 0.8, x, 0.8, z, DWOOD));
    parts.push(box(3.6, 3.2, 1.6, -7.2, 8.6, -1.6, rgb(0xb83a3a)));
    return merge(parts);
  },
  tv() { return merge([box(16, 5, 5, 0, 2.5, 0, DWOOD), box(15, 8.6, 0.6, 0, 10.0, -0.8, rgb(0x08080a)), box(15.4, 9.0, 0.4, 0, 10.0, -1.1, rgb(0x1a1a1e)), box(3, 0.6, 2, 0, 5.3, -0.8, CHAR), box(0.6, 1.0, 0.6, 0, 5.6, -0.8, CHAR)]); },
  // the kitchen's wall: cupboards down below, cupboards up above, the hob, the hood
  cupboards() {
    const parts = [box(26, 9, 8, 0, 4.5, 0, rgb(0x2a3a4a)), box(26.6, 0.9, 8.8, 0, 9.45, 0.3, rgb(0xe8e4dc)), box(26, 8, 4.4, 0, 19.5, -1.8, rgb(0x2a3a4a))];
    for (let i = 0; i < 3; i++) { const x = -8.7 + i * 8.7; parts.push(box(8.0, 7.4, 0.3, x, 4.7, 4.1, rgb(0x34485a))); parts.push(box(8.0, 7.4, 0.3, x, 19.5, 0.5, rgb(0x34485a))); parts.push(box(2.4, 0.4, 0.4, x, 7.6, 4.4, CHROME)); parts.push(box(2.4, 0.4, 0.4, x, 16.4, 0.8, CHROME)); }
    for (const [x, z] of [[-3, -1.5], [3, -1.5], [-3, 2], [3, 2]]) parts.push(tor(1.3, 0.25, 0, 0, 0, BLACK, 6, 16).rotateX(Math.PI / 2).translate(x + 8.7, 10.0, z));
    return merge(parts);
  },
  fridge() { return merge([box(10, 24, 9, 0, 12, 0, rgb(0xd8dce0)), box(10.1, 0.3, 9.1, 0, 15.6, 0, rgb(0x8a8e94)), box(0.6, 6, 0.8, 4.0, 19, 4.6, CHROME), box(0.6, 6, 0.8, 4.0, 10, 4.6, CHROME), box(2.2, 2.6, 0.2, -2.2, 19.6, 4.55, rgb(0xff6a8a)), box(1.8, 1.8, 0.2, 1.0, 18.0, 4.55, rgb(0x6ac8ff))]); },
  // the bathroom: the tub, a towel rail with his towels, a shelf of bottles
  tub() { return merge([box(24, 6.4, 10, 0, 3.2, 0, PORCELAIN), box(22, 0.8, 8, 0, 6.3, 0, rgb(0xc8d4dc)), rod([-10, 6.6, -3.6], [-10, 9.4, -3.6], 0.35, CHROME), rod([-10, 9.4, -3.6], [-8.6, 9.4, -3.6], 0.3, CHROME), box(24.6, 0.4, 10.6, 0, 6.6, 0, WHITE)]); },
  towels() { const parts = [box(12, 0.5, 0.5, 0, 16, 0.6, CHROME), box(0.5, 0.5, 1.2, -5.8, 16, 0, CHROME), box(0.5, 0.5, 1.2, 5.8, 16, 0, CHROME)]; parts.push(box(4.6, 9, 0.8, -3, 11.6, 1.0, rgb(0x5a8ab8))); parts.push(box(4.6, 7, 0.8, 2.4, 12.6, 1.0, rgb(0xf0f0f0))); return merge(parts); },
  bathShelf() { const parts = [box(12, 0.5, 3, 0, 14, 0, WHITE), box(12, 0.5, 3, 0, 19, 0, WHITE)]; const R = seeded(9); for (const y of [14.25, 19.25]) for (let k = 0; k < 6; k++) { const h = 1.6 + R() * 1.6; parts.push(cyl(0.5, 0.55, h, 10, -5 + k * 2, y + h / 2, 0, [rgb(0xff8ab0), rgb(0x8ac8ff), WHITE, rgb(0xffd06a), rgb(0x9affc8)][Math.floor(R() * 5)])); } return merge(parts); },
  // the bedroom: a chest of drawers, the wardrobe
  dresser() { const parts = [box(16, 10, 6, 0, 5, 0, WOOD), box(16.4, 0.5, 6.4, 0, 10.2, 0, DWOOD)]; for (let r = 0; r < 3; r++) for (const x of [-4, 4]) { parts.push(box(7.4, 2.8, 0.3, x, 1.8 + r * 3.0, 3.05, DWOOD)); parts.push(box(1.6, 0.4, 0.4, x, 1.8 + r * 3.0, 3.3, BRASS)); } return merge(parts); },
  wardrobe() { return merge([box(14, 25, 7, 0, 12.5, 0, WOOD), box(6.8, 23, 0.3, -3.5, 12.5, 3.55, DWOOD), box(6.8, 23, 0.3, 3.5, 12.5, 3.55, DWOOD), box(0.4, 3, 0.4, -0.6, 12.5, 3.8, BRASS), box(0.4, 3, 0.4, 0.6, 12.5, 3.8, BRASS), box(14.4, 1, 7.4, 0, 25.2, 0, DWOOD)]); },
  // the office: the desk, its lamp, the papers
  desk() { return merge([box(20, 0.8, 9, 0, 9, 0, DWOOD), box(0.8, 9, 8, -9.4, 4.5, 0, DWOOD), box(6, 9, 8, 7, 4.5, 0, DWOOD), box(5, 0.3, 6.6, -2, 9.55, 0.4, PAPER), box(4, 0.3, 5.6, 2.6, 9.6, -0.6, PAPER), cyl(1.0, 1.4, 0.4, 12, -7, 9.6, -2.6, BRASS), rod([-7, 9.6, -2.6], [-7, 14, -2.6], 0.2, BRASS), rod([-7, 14, -2.6], [-5, 15, -1.6], 0.2, BRASS)]); },
  tallPlant() { const parts = [cyl(3, 2.4, 6, 16, 0, 3, 0, rgb(0x2a2a30))]; const R = seeded(31); for (let k = 0; k < 11; k++) { const a = k * 2.4 + R(), l = 6 + R() * 8; parts.push(rod([0, 5.5, 0], [Math.cos(a) * l * 0.4, 5.5 + l, Math.sin(a) * l * 0.4], 0.2, GREEN)); parts.push(sph(1.6, 1.6, 0.4, 0.8, Math.cos(a) * l * 0.45, 6 + l, Math.sin(a) * l * 0.45, LEAF, 8, 6)); } return merge(parts); },
};

// ---------- the pickup: a dog tag, his, with her name stamped on it ----------
export function tagGeometry() {
  const s = new THREE.Shape(), w = 0.3, h = 0.5, r = 0.11;
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
  // (the notch in its side)
  s.lineTo(w, -0.12); s.quadraticCurveTo(w - 0.07, -0.04, w, 0.04);
  s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  const hole = new THREE.Path(); hole.absarc(0, h - 0.12, 0.05, 0, Math.PI * 2, true); s.holes.push(hole);
  const tag = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 6 });
  tag.translate(0, 0, -0.018);
  const parts = [paint(tag, [0.86, 0.87, 0.9])];
  // the stamped lines and her crown, a little proud of the face
  for (const [y, l] of [[0.16, 0.36], [0.04, 0.42], [-0.08, 0.3], [-0.2, 0.38]]) parts.push(box(l, 0.035, 0.03, -0.02, y, 0.03, [0.62, 0.63, 0.68]));
  parts.push(box(0.18, 0.08, 0.03, 0, -0.33, 0.03, [0.95, 0.12, 0.2]));
  for (const x of [-0.07, 0, 0.07]) parts.push(box(0.035, 0.08, 0.03, x, -0.27, 0.03, [0.95, 0.12, 0.2]));
  // a second tag behind, hanging a little lower and turned
  const t2 = tag.clone(); t2.rotateZ(0.22); t2.translate(0.1, -0.14, -0.07); parts.push(paint(t2, [0.74, 0.75, 0.8]));
  // the ball chain through the hole, up in a loop
  for (let k = 0; k <= 16; k++) { const a = Math.PI * (0.08 + 0.84 * k / 16); parts.push(sph(0.032, 1, 1, 1, Math.cos(a) * 0.3, 0.38 + Math.sin(a) * 0.42, 0, [0.7, 0.71, 0.76], 6, 4)); }
  const g = merge(parts); g.computeVertexNormals(); g.translate(0, -0.1, 0);
  return g;
}

export const pickup = {
  key: 'tag', geo: tagGeometry, color: 0xeef0f4,
  mat: { rough: 0.22, metal: 0.78, emissive: 0x3a2a30 },
  s: 1.55, lit: 1.25, face: true,
  // hanging off the chain: a little swing, a slow turn
  move: (e, time, i, yaw) => e.set(Math.sin(time * 1.7 + i) * 0.16, yaw + Math.sin(time * 1.1 + i * 1.9) * 0.55, Math.sin(time * 2.3 + i) * 0.14),
};
