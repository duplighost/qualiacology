// Sexy Trauma Costume. The costume shop's back room, where the real scary costumes live, and we
// are small in it: the racks, the hurts sold in bags with their names on; the fitting room and its
// mirror; the party under the blacklight, jack-o'-lanterns, bats, glitter; the clearance room; the
// fitting room's walls coming down; the garment bag with its zipper stuck, the heels; the tills at
// the front, the register at 29.99 and the receipt: dignity, peace of mind. Happy Halloween.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { tintMaterial } from './props.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const HALLOWEEN = [0xff7a1a, 0x8a3aff, 0x1a1a20, 0xd81a3a, 0x3ad86a, 0xf4f0f0, 0xff3ad0, 0xffc81a];
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// the mirror's glass: dark silver, a sheen across it
function glassTexture() {
  return canvasTex(128, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#3a3c48'); gr.addColorStop(0.45, '#8a8ea0'); gr.addColorStop(0.55, '#6a6e80'); gr.addColorStop(1, '#2a2c38'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.2; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(20, 0); g.lineTo(50, 0); g.lineTo(0, H * 0.6); g.lineTo(0, H * 0.3); g.fill();
  });
}
// the register's pop-up display: 29.99 in green
function displayTexture() {
  return canvasTex(256, 96, (g, W, H) => {
    g.fillStyle = '#06100a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5aff8a'; g.shadowColor = '#5aff8a'; g.shadowBlur = 14; g.font = '700 70px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('29.99', W / 2, H / 2 + 4);
  });
}
// the receipt: what it all came to
function receiptTexture() {
  return canvasTex(128, 768, (g, W, H) => {
    g.fillStyle = '#f2eee4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2a30'; g.textAlign = 'center'; g.font = '700 15px "Courier New", monospace';
    const lines = [['', 40], ['SEXY TRAUMA', 70], ['COSTUME', 88], ['29.99', 130], ['', 160], ['DIGNITY', 200], ['PEACE OF MIND', 240], ['', 270], ['HAPPY', 330], ['HALLOWEEN', 350]];
    for (const [s, y] of lines) if (s) g.fillText(s, W / 2, y);
    g.fillRect(14, 112, W - 28, 2); g.fillRect(14, 290, W - 28, 2);
    const R = seeded(4); for (let y = 400; y < H - 20; y += 16) { if (R() < 0.2) continue; g.fillRect(14, y, 20 + R() * 50, 5); g.fillRect(W - 40, y, 26, 5); }
  });
}

// ---------- the shop's things, at our size ----------
const KG = {
  // a costume in its bag, hung on a wire: the bag, the folded costume in it, the card on top (its name is the sign layer)
  bag() { const parts = []; parts.push(paint(box(22, 30, 3, 0, -15, 0), rgb(0xe8f0f8))); return merge(parts); },
  card() { const parts = []; parts.push(paint(box(22.4, 8.4, 0.8, 0, 4.2, 0), rgb(0xf4f0ea))); parts.push(paint(new THREE.TorusGeometry(1.1, 0.35, 8, 16).translate(0, 6.6, 0.5), rgb(0x2a2a30))); parts.push(paint(box(0.2, 40, 0.2, 0, 28.4, 0), rgb(0x8a8a90))); return merge(parts); },
  cardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.8, 2.8, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, -5.6, 1.65); return g; },
  garment() { const parts = []; parts.push(box(17, 22, 1.4, 0, -15, 0)); for (const s of [-1, 1]) { const sl = box(4, 12, 1.2, 0, -6, 0); sl.rotateZ(s * 0.35); sl.translate(s * 9.5, -6, 0.2); parts.push(sl); } parts.push(box(6, 2, 1.6, 0, -4, 0.1)); return merge(parts.map((g) => paint(g, [1, 1, 1]))); },
  // a rolling rack of costumes on hangers
  rack() {
    const parts = [], chrome = rgb(0xc8ccd4), R = seeded(11);
    for (const x of [-14, 14]) { parts.push(paint(cyl(0.35, 0.35, 18, 8, x, 9, 0), chrome)); parts.push(paint(box(0.6, 0.6, 8, x, 0.6, 0), chrome)); }
    parts.push(paint(cyl(0.3, 0.3, 29, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 18, 0), chrome));
    for (let k = 0; k < 11; k++) { const x = -12.5 + k * 2.5, c = rgb(pick(R, HALLOWEEN)), L = 9 + R() * 4; parts.push(paint(box(0.9, L, 6.4, x, 17.2 - L / 2, 0), c)); parts.push(paint(new THREE.TorusGeometry(0.6, 0.12, 6, 10, Math.PI).rotateY(Math.PI / 2).translate(x, 18.4, 0), chrome)); }
    return merge(parts);
  },
  // the full-length mirror: its black frame (the glass is a layer of its own)
  mirrorFrame() { const parts = [], black = rgb(0x1a1418), gold = rgb(0xd8a840); for (const [w, h, x, y] of [[20, 1.8, 0, 22.9], [20, 1.8, 0, -22.9], [1.8, 47.6, -9.1, 0], [1.8, 47.6, 9.1, 0]]) parts.push(paint(box(w, h, 1.6, x, y, 0), black)); for (const [w, h, x, y] of [[16.6, 0.4, 0, 21.8], [16.6, 0.4, 0, -21.8], [0.4, 43.6, -8.1, 0], [0.4, 43.6, 8.1, 0]]) parts.push(paint(box(w, h, 1.7, x, y, 0), gold)); parts.push(paint(box(0.2, 40, 0.2, -6, 42.8, 0), rgb(0x8a8a90))); parts.push(paint(box(0.2, 40, 0.2, 6, 42.8, 0), rgb(0x8a8a90))); return merge(parts); },
  mirrorGlass() { const g = new THREE.PlaneGeometry(16.4, 43.6); g.translate(0, 0, 0.82); return g; },
  // a price tag on its string (the word is the sign layer)
  tag() { const parts = []; const s = new THREE.Shape(); s.moveTo(-12, -6); s.lineTo(9, -6); s.lineTo(14, 0); s.lineTo(9, 6); s.lineTo(-12, 6); s.lineTo(-12, -6); const h = new THREE.Path(); h.absarc(10.2, 0, 1.1, 0, Math.PI * 2, true); s.holes.push(h); const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); g.translate(0, 0, -0.6); parts.push(paint(g, rgb(0xf0e8d8))); parts.push(paint(tube(V(10.2, 1, 0), V(10.2, 34, 0), 0.15, 5), rgb(0xe8e0d0))); return merge(parts); },
  tagFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.7, 4.2, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(-1.5, 0, 0.02); return g; },
  // a starburst, the shape round "best seller"
  burst() { const s = new THREE.Shape(); const n = 18; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 11 : 15; const x = Math.cos(a) * r * 1.35, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); } const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false }); g.translate(0, 0, -0.7); return merge([paint(g, rgb(0xffd21a)), paint(box(0.2, 40, 0.2, 0, 34, -0.4), rgb(0x8a8a90))]); },
  burstFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(3.0, 3.6, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.0); return g; },
  // a shop sign on chains across the room (the words are the sign layer)
  sign() { const parts = [], dark = rgb(0x1a1418), orange = rgb(0xff7a1a); parts.push(paint(box(34, 12.4, 0.8, 0, 0, -0.5), dark)); for (const [w, h, x, y] of [[34.8, 0.8, 0, 6.4], [34.8, 0.8, 0, -6.4], [0.8, 13.6, -17.2, 0], [0.8, 13.6, 17.2, 0]]) parts.push(paint(box(w, h, 1, x, y, -0.3), orange)); for (const s of [-1, 1]) parts.push(paint(box(0.3, 40, 0.3, s * 15, 26.2, -0.5), rgb(0x6a6a70))); return merge(parts); },
  signFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(4.0, 4.0, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
  // the accessories: angel wings, devil horns on their band, a tiara
  wings() { const parts = [], white = rgb(0xf8f6f4); for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const f = sph(1, 1, 1, 1, 0, 0, 0, 10, 8); f.scale(2.2, 7 - k * 0.7, 0.6); f.rotateZ(s * (0.3 + k * 0.22)); f.translate(s * (3 + k * 1.6), 6 + k * 0.5, -k * 0.2); parts.push(paint(f, white)); } parts.push(paint(box(2, 3, 1, 0, 6, 0), rgb(0xd8d4cc))); return merge(parts); },
  horns() { const parts = [], red = rgb(0xd8102a); const band = new THREE.TorusGeometry(6, 0.5, 8, 24, Math.PI); parts.push(paint(band, rgb(0x1a1418))); for (const s of [-1, 1]) { const h = new THREE.ConeGeometry(1.4, 5, 12); h.rotateZ(-s * 0.4); h.translate(s * 3.4, 6.8, 0); parts.push(paint(h, red)); } return merge(parts); },
  tiara() { const parts = [], gold = rgb(0xf0c850); const band = new THREE.TorusGeometry(6, 0.4, 8, 24, Math.PI); parts.push(paint(band, gold)); for (let k = 0; k < 7; k++) { const a = (k / 6) * Math.PI, h = k === 3 ? 4.2 : 2.6; const p = new THREE.ConeGeometry(0.6, h, 6); p.translate(Math.cos(a) * 6, Math.sin(a) * 6 + h / 2, 0); parts.push(paint(p, gold)); parts.push(paint(sph(0.45, 1, 1, 1, Math.cos(a) * 6, Math.sin(a) * 6 + h, 0, 8, 6), rgb(0xffffff))); } return merge(parts); },
  // a jack-o'-lantern: the pumpkin, the stem (the face glows on its own layer)
  pumpkin() {
    const g = new THREE.SphereGeometry(5, 24, 14); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.08 * Math.pow(Math.abs(Math.cos(a * 4)), 0.5); p.setXYZ(i, x * k * 1.2, y * 0.82, z * k * 1.2); }
    g.computeVertexNormals();
    return merge([paint(g, rgb(0xff7a1a)), paint(cyl(0.6, 0.9, 2.4, 8, 0, 4.8, 0), rgb(0x3a5a1a))]);
  },
  face() {
    const parts = [], s = new THREE.Shape(); s.moveTo(-1, 0); s.lineTo(1, 0); s.lineTo(0, 1.6); s.lineTo(-1, 0);
    for (const x of [-2, 2]) { const e = new THREE.ShapeGeometry(s); e.translate(x, 0.8, 0); parts.push(e); }
    const m = new THREE.Shape(); m.moveTo(-3, -0.4); for (let k = 0; k <= 6; k++) m.lineTo(-3 + k, k % 2 ? -1.2 : -2.0); m.lineTo(3, -0.4); for (let k = 6; k >= 0; k--) m.lineTo(-3 + k, k % 2 ? -0.6 : -0.9);
    parts.push(new THREE.ShapeGeometry(m));
    const g = merge(parts.map((x) => paint(x, [1, 1, 1]))); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 6 * Math.sqrt(Math.max(0.05, 1 - (x * x) / 36 - (y * y) / 16.8)) + 0.15); }
    g.computeVertexNormals(); return g;
  },
  // a bat, wings out
  bat() { const s = new THREE.Shape(); s.moveTo(0, 0.6); s.lineTo(1.6, 1.2); s.lineTo(3.4, 2.2); s.lineTo(5.6, 1.4); s.lineTo(4.6, 0.6); s.lineTo(3.8, -0.2); s.lineTo(2.6, 0.2); s.lineTo(1.4, -0.4); s.lineTo(0, -1.2); s.lineTo(-1.4, -0.4); s.lineTo(-2.6, 0.2); s.lineTo(-3.8, -0.2); s.lineTo(-4.6, 0.6); s.lineTo(-5.6, 1.4); s.lineTo(-3.4, 2.2); s.lineTo(-1.6, 1.2); s.lineTo(0, 0.6); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; },
  // the spider on its thread: body, head, eight legs bent at the knee
  spider() {
    const parts = [], black = rgb(0x24123a);
    parts.push(paint(sph(4, 1, 0.85, 1.2, 0, 0, -2, 18, 12), black)); parts.push(paint(sph(2.4, 1, 0.9, 1, 0, 0.4, 3, 14, 10), black));
    for (const [z, r] of [[-4.2, 2.6], [-2.2, 3.6], [0.2, 3.4]]) { const ring = new THREE.TorusGeometry(r, 0.32, 6, 24); ring.rotateX(Math.PI / 2); ring.scale(1, 1, 1); ring.translate(0, 2.6 - Math.abs(z + 2) * 0.4, z); parts.push(paint(ring, rgb(0x6aff8a))); }
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const a = -0.7 + k * 0.45, kx = s * 9, kz = Math.sin(a) * 9 + 1; const knee = V(kx * 0.9 + s * 1, 6, kz); parts.push(paint(tube(V(s * 1.6, 0.4, Math.sin(a) * 2), knee, 0.45, 6), black)); parts.push(paint(tube(knee, V(kx * 1.5, -6, kz * 1.4), 0.38, 6), black)); }
    for (const x of [-0.8, 0.8]) parts.push(paint(sph(0.5, 1, 1, 1, x, 1.2, 5.2, 8, 6), rgb(0xd81a3a)));
    parts.push(paint(box(0.12, 60, 0.12, 0, 32, -2), rgb(0xd8d8e0)));
    return merge(parts);
  },
  // a dress form wearing a costume: the torso turned on a lathe, the pole, the feet
  dressForm() {
    const pts = [[0, 0], [5.4, 0.2], [5.8, 2], [4.6, 5], [3.8, 8], [4.4, 11], [5.6, 14], [5.2, 16.4], [3.6, 17.6], [1.4, 18.2], [1.3, 19.4], [0, 19.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const torso = new THREE.LatheGeometry(pts, 24); torso.scale(1, 1, 0.7); torso.translate(0, 14, 0);
    const parts = [paint(torso, [1, 1, 1])];
    parts.push(paint(cyl(0.5, 0.5, 14, 8, 0, 7, 0), rgb(0x2a2a30)));
    for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(tube(V(0, 1, 0), V(Math.cos(a) * 5, 0, Math.sin(a) * 5), 0.4, 6), rgb(0x2a2a30))); }
    return merge(parts);
  },
  // the garment bag: black, long, its zipper (the slider and the costume showing are layers)
  garmentBag() { const parts = []; parts.push(paint(box(18, 44, 3.4, 0, -22, 0), rgb(0x3a3048))); parts.push(paint(box(0.8, 44, 0.2, 0, -22, 1.8), rgb(0xa8acb8))); parts.push(paint(new THREE.TorusGeometry(2.4, 0.35, 8, 20, Math.PI).translate(0, 2, 0), rgb(0xc8ccd4))); parts.push(paint(box(0.4, 40, 0.4, 0, 22, 0), rgb(0x8a8a90))); return merge(parts); },
  slider() { const parts = []; parts.push(paint(box(2.6, 3.4, 1.4, 0, 0, 2.2), rgb(0xd8dce4))); parts.push(paint(box(1.2, 4.4, 0.4, 0, -3.6, 2.9), rgb(0xd8dce4))); parts.push(paint(new THREE.TorusGeometry(0.7, 0.2, 6, 12).translate(0, -6.2, 2.9), rgb(0xd8dce4))); return merge(parts); },
  sequins() { const g = new THREE.PlaneGeometry(6, 1); g.translate(0, -0.5, 1.75); return g; },
  // a stiletto, red patent: the sole, the toe, the heel cup, the spike
  shoe() {
    const parts = [], red = rgb(0xd0102a), black = rgb(0x1a1418);
    const sole = new THREE.CylinderGeometry(2.4, 2.4, 0.5, 20); sole.scale(1, 1, 2.2); sole.rotateX(-0.42); sole.translate(0, 3.5, 2.6); parts.push(paint(sole, black));
    const toe = sph(2.5, 1, 0.7, 1.6, 0, 1.2, 6.2, 18, 10); parts.push(paint(toe, red));
    const cup = new THREE.CylinderGeometry(2.4, 2.2, 3.2, 20, 1, true, Math.PI * 0.6, Math.PI * 1.8); cup.translate(0, 8.6, -2.4); parts.push(paint(cup, red));
    const vamp = box(4.4, 1.2, 6, 0, 5.2, 1.6); vamp.rotateX(-0.45); parts.push(paint(vamp, red));
    parts.push(paint(cyl(0.18, 0.55, 7.4, 10, 0, 3.7, -3.4), black));
    return merge(parts);
  },
  riser() { return merge([paint(box(22, 8, 14, 0, 4, 0), rgb(0xf4f0ec)), paint(box(22.6, 0.6, 14.6, 0, 8.3, 0), rgb(0xd8a840))]); },
  // the checkout: the counter, the register with its display up, the drawer
  counter() {
    const parts = [], black = rgb(0x16141a), orange = rgb(0xff7a1a);
    parts.push(paint(box(28, 11, 9, 0, 5.5, 0), black)); parts.push(paint(box(28.6, 0.8, 9.6, 0, 11.4, 0), rgb(0x2a2a30))); parts.push(paint(box(28.2, 1.4, 0.2, 0, 8.6, 4.6), orange));
    parts.push(paint(box(9, 5, 7, -6, 14.3, 0), rgb(0x3a3a42))); parts.push(paint(box(8, 0.8, 5, -6, 12.2, 1.6), rgb(0x2a2a30)));
    const sc = box(8, 5, 0.8, 0, 0, 0); sc.rotateX(-0.5); sc.translate(-6, 18.4, -1); parts.push(paint(sc, rgb(0x2a2a30)));
    parts.push(paint(box(0.8, 4, 0.8, -6, 21.6, -2.6), rgb(0x2a2a30))); parts.push(paint(box(7.4, 3.2, 1.2, -6, 24.4, -2.6), rgb(0x1a1a20)));
    return merge(parts);
  },
  display() { const g = new THREE.PlaneGeometry(6.6, 2.5); g.translate(-6, 24.4, -1.95); return g; },
  receipt() { const g = new THREE.PlaneGeometry(5, 1, 1, 30); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = 0.5 - p.getY(i); const L = v * 34; let y, z; if (L < 12) { y = 15 - L; z = 3.8 + L * 0.15; } else { const a = (L - 12) / 7; y = 3 - Math.sin(Math.min(a, 1.57)) * 3; z = 5.6 + Math.min(L - 12, 11) + Math.max(0, L - 23) * 1; if (L > 23) y = 0.05; } p.setXYZ(i, p.getX(i) - 6, y, z); } g.computeVertexNormals(); return g; },
  // a lane light: the pole, the number light on it
  laneLight() { return merge([paint(cyl(0.3, 0.3, 26, 8, 0, 13, 0), rgb(0x2a2a30)), paint(box(4, 3, 4, 0, 27, 0), rgb(0xff7a1a))]); },
  // the HAPPY HALLOWEEN banner's cloth
  banner() { const parts = []; parts.push(paint(box(64, 18, 0.4, 0, 0, 0), rgb(0x16141a))); for (let k = 0; k < 16; k++) { const s = new THREE.Shape(); s.moveTo(-2, 0); s.lineTo(2, 0); s.lineTo(0, -3.2); s.lineTo(-2, 0); const tri = new THREE.ShapeGeometry(s); tri.translate(-30 + k * 4, -9, 0.25); parts.push(paint(tri, rgb(k % 2 ? 0xff7a1a : 0x8a3aff))); } for (const s of [-1, 1]) parts.push(paint(box(0.3, 34, 0.3, s * 30, 23.5, 0), rgb(0x8a8a90))); return merge(parts); },
  bannerFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(6.4, 6.4, 1); g.translate(0, 0.4, 0.25); return g; },
};

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
let TEX = null;
const tex = () => TEX || (TEX = { glass: glassTexture(), display: displayTexture(), receipt: receiptTexture() });
function glowBasic() { return new THREE.ShaderMaterial({ vertexShader: `attribute vec3 aTint; varying vec3 vC; void main(){ vC = aTint; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`, fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }`, side: THREE.DoubleSide }); }
extend({
  layers: {
    pkgBag: (M) => [KG.bag(), M.pkgBagM || (M.pkgBagM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false })), 8, {}],
    pkgCard: (M) => [KG.card(), VC(M, 'kCard', { roughness: 0.7, metalness: 0, emissive: 0x2a2826 }), 8, {}],
    pkgFace: (M) => [KG.cardFace(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    pkgGarment: (M) => [KG.garment(), M.garmentM || (M.garmentM = tintMaterial(0xffffff, { rough: 0.6, emissive: 0x1a1418 })), 8, { aTint: 3 }],
    rack: (M) => [KG.rack(), VC(M, 'kRack', { roughness: 0.6, metalness: 0.2, emissive: 0x140e10 }), 140, {}],
    longFrame: (M) => [KG.mirrorFrame(), VC(M, 'kFrame', { roughness: 0.4, metalness: 0.4, emissive: 0x100c0c }), 4, {}],
    longGlass: (M) => [KG.mirrorGlass(), M.kglassM || (M.kglassM = new THREE.MeshBasicMaterial({ map: tex().glass })), 4, {}],
    tag: (M) => [KG.tag(), VC(M, 'kTag', { roughness: 0.8, metalness: 0, emissive: 0x2a2620 }), 6, {}],
    tagFace: (M) => [KG.tagFace(), M.sign, 6, { aIdx: 1, aWake: 2 }],
    burst: (M) => [KG.burst(), VC(M, 'kBurst', { roughness: 0.5, metalness: 0, emissive: 0x6a5004 }), 3, {}],
    burstFace: (M) => [KG.burstFace(), M.sign, 3, { aIdx: 1, aWake: 2 }],
    shopSign: (M) => [KG.sign(), VC(M, 'kSign', { roughness: 0.5, metalness: 0.2, emissive: 0x2a1006 }), 8, {}],
    shopFace: (M) => [KG.signFace(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    wings: (M) => [KG.wings(), VC(M, 'kWings', { roughness: 0.9, metalness: 0, emissive: 0x3a3a3a }), 12, {}],
    horns: (M) => [KG.horns(), VC(M, 'kHorns', { roughness: 0.4, metalness: 0.1, emissive: 0x3a0408 }), 12, {}],
    tiara: (M) => [KG.tiara(), VC(M, 'kTiara', { roughness: 0.25, metalness: 0.6, emissive: 0x4a3808 }), 12, {}],
    pumpkin: (M) => [KG.pumpkin(), VC(M, 'kPumpkin', { roughness: 0.6, metalness: 0, emissive: 0x3a1404 }), 80, {}],
    pumpkinFace: (M) => [KG.face(), M.faceM || (M.faceM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd040).multiplyScalar(1.6), side: THREE.DoubleSide })), 80, {}],
    bat: (M) => [KG.bat(), M.batM || (M.batM = new THREE.MeshBasicMaterial({ color: 0x0a080c, side: THREE.DoubleSide })), 80, {}],
    spider: (M) => [KG.spider(), M.spiderM || (M.spiderM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.55 }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;'); }; return m; })()), 2, {}],
    dressForm: (M) => [KG.dressForm(), M.formM || (M.formM = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3, emissive: 0x2a1a2a })), 24, { aTint: 3 }],
    garmentBag: (M) => [KG.garmentBag(), VC(M, 'kGBag', { roughness: 0.5, metalness: 0.1, emissive: 0x0a080c }), 2, {}],
    slider: (M) => [KG.slider(), VC(M, 'kSlider', { roughness: 0.25, metalness: 0.7, emissive: 0x2a2a30 }), 2, {}],
    sequins: (M) => [KG.sequins(), M.seqM || (M.seqM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5ad8).multiplyScalar(1.3), side: THREE.DoubleSide })), 2, {}],
    shoe: (M) => [KG.shoe(), M.shoeM || (M.shoeM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.35 }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;'); }; return m; })()), 4, {}],
    wire: (M) => [box(120, 0.25, 0.25, 0, 0, 0), M.wireM || (M.wireM = new THREE.MeshBasicMaterial({ color: 0x2a2a30 })), 2, {}],
    laneLight: (M) => [KG.laneLight(), VC(M, 'kLane', { roughness: 0.5, metalness: 0.2, emissive: 0x3a1a06 }), 40, {}],
    tillCounter: (M) => [KG.counter(), VC(M, 'kCounter', { roughness: 0.5, metalness: 0.2, emissive: 0x0e0c10 }), 30, {}],
    tillDisplay: (M) => [KG.display(), M.tdispM || (M.tdispM = new THREE.MeshBasicMaterial({ map: tex().display })), 2, {}],
    tillReceipt: (M) => [KG.receipt(), M.trecM || (M.trecM = new THREE.MeshStandardMaterial({ map: tex().receipt, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex().receipt, emissiveIntensity: 0.35 })), 2, {}],
    hBanner: (M) => [KG.banner(), VC(M, 'kBanner', { roughness: 0.8, metalness: 0, emissive: 0x1a0c06, side: THREE.DoubleSide }), 2, {}],
    hBannerFace: (M) => [KG.bannerFace(), M.sign, 2, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a costume in its bag hung over the road, its name on the card
    pkg(S, it, p) {
      const garments = S.layers.pkgGarment, bags = S.layers.pkgBag;
      const h = S.course.sample(it.t).yaw, T = S.tNow ?? 0; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.35 : it.x < 0 ? 0.35 : 0) + Math.sin(T * 0.8 + it.t) * 0.06, 0); const fq = (S._kq || (S._kq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 30);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.pkgCard.add(m); S.layers.pkgFace.add(m, { aIdx: it.idx, aWake: [0.8, 0] }); garments.add(m, { aTint: it.tint }); bags.add(m);
      const lw = local(p, h + Math.PI, 0, -5.6 * s, 4 * s, S._o); glowAt(S, lw.x, lw.y, lw.z, 18 * s, [1, 0.9, 0.75], 0.35);
    },
    rack(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.rack.add(m); },
    // the long mirror hung over the road; when it calls, it glows
    longMirror(S, it, p) {
      const glass = S.layers.longGlass;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._mq || (S._mq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 26);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.longFrame.add(m); glass.add(m);
      const T = S.tNow ?? 0, call = it.call ? smooth(it.call - 1.5, it.call, T) * (0.6 + 0.4 * Math.sin(T * 9)) : 0;
      const g = local(p, h + Math.PI, 0, 0, 2 * s, S._o); glowAt(S, g.x, g.y, g.z, 30 * s, [0.75, 0.45, 1], 0.12 + 0.9 * call);
    },
    // a price tag on its string, turning a little
    tag(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + Math.sin(T * 0.9 + it.t * 3) * 0.25, Math.sin(T * 0.7) * 0.05); const tq = (S._tq || (S._tq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 18);
      const m = S._m, s = it.s ?? 1; m.compose(p, tq, S._s.set(s, s, s)); S.layers.tag.add(m); S.layers.tagFace.add(m, { aIdx: it.idx, aWake: [0.8, 0] });
    },
    burst(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 2) * 0.06); const bq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 16);
      const pulse = 1 + 0.06 * (S.beat ?? 0), m = S._m, s = (it.s ?? 1) * pulse; m.compose(p, bq, S._s.set(s, s, s)); S.layers.burst.add(m); S.layers.burstFace.add(m, { aIdx: it.idx, aWake: [0.85, 0] });
      glowAt(S, p.x, p.y, p.z, 26 * s, [1, 0.85, 0.3], 0.35);
    },
    shopSign(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 15);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.shopSign.add(m); S.layers.shopFace.add(m, { aIdx: it.idx, aWake: [0.85, 0] });
      glowAt(S, p.x, p.y + 8 * s, p.z, 14 * s, [1, 0.6, 0.3], 0.3);
    },
    // the accessories on the wall: a pair of wings, horns, a tiara
    accessory(S, it, p, q) {
      const wings = S.layers.wings, horns = S.layers.horns, tiaras = S.layers.tiara;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 16);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); (it.kind === 'wings' ? wings : it.kind === 'horns' ? horns : tiaras).add(m);
      if (it.kind === 'tiara') { const T = S.tNow ?? 0; for (let k = 0; k < 7; k++) if (Math.sin(T * 5 + k * 2.3) > 0.7) { const a = (k / 6) * Math.PI; const w = local(p, S.course.sample(it.t).yaw + (it.rot || 0), Math.cos(a) * 6 * s, (Math.sin(a) * 6 + (k === 3 ? 4.2 : 2.6)) * s, 0.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 2 * s, [1, 1, 1], 1.4); } }
    },
    // a jack-o'-lantern, lit
    pumpkin(S, it, p, q, yaw) {
      const faces = S.layers.pumpkinFace;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.pumpkin.add(m); faces.add(m);
      const T = S.tNow ?? 0, w = local(p, yaw, 0, 0.5 * s, 6.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.6, 0.15], 0.9 + 0.25 * Math.sin(T * 11 + it.seed * 20));
    },
    // bats going round under the ceiling
    bats(S, it, p) {
      const bats = S.layers.bat;
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, fy = S.floorFn ? S.floorFn(it.t, 0) : 0, m = S._m, e = S._be || (S._be = new THREE.Euler()), bq = S._bq2 || (S._bq2 = new THREE.Quaternion()), w = S._bw || (S._bw = new THREE.Vector3());
      for (let k = 0; k < 6; k++) {
        const a = T * (0.9 + k * 0.12) + k * 1.05 + it.seed * 6, r = 18 + (k % 3) * 7;
        local(p, h, Math.cos(a) * r, 0, Math.sin(a) * r * 1.4, w); w.y = fy + 30 + Math.sin(T * 2 + k) * 4 + (k % 2) * 6;
        const flap = 0.35 + 0.65 * Math.abs(Math.sin(T * 14 + k));
        e.set(Math.sin(T * 3 + k) * 0.2, -a + Math.PI / 2 + h, 0); bq.setFromEuler(e); m.compose(w, bq, S._s.set(1.2 * flap + 0.2, 1, 1.2)); bats.add(m);
      }
    },
    // the spider coming down on its thread
    spider(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, drop = smooth(it.drop ?? -1e9, (it.drop ?? -1e9) + 1.2, T);
      p.y = S.course.sample(it.t).y + 46 - 30 * drop + Math.sin(T * 1.7) * 1.2;
      S._e.set(0.15 * Math.sin(T * 1.3), h + Math.PI + Math.sin(T * 0.6) * 0.3, 0); const sq = (S._spq || (S._spq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, sq, S._s.set(s, s, s)); S.layers.spider.add(m);
      const eyes = local(p, h + Math.PI, 0, 1.2 * s, 5.4 * s, S._o); glowAt(S, eyes.x, eyes.y, eyes.z, 4 * s, [1, 0.1, 0.15], 1.2);
    },
    // a dress form in a costume
    dressForm(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.dressForm.add(m, { aTint: it.tint }); if (it.spot) glowAt(S, p.x, p.y + 30 * s, p.z, 16 * s, [1, 0.9, 0.8], 0.4); },
    // the garment bag hung over the road, its zipper stuck halfway, jiggling
    garmentBag(S, it, p) {
      const sliders = S.layers.slider, seq = S.layers.sequins;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.35 : it.x < 0 ? 0.35 : 0), 0); const fq = (S._gq || (S._gq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 52);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.garmentBag.add(m);
      const T = S.tNow ?? 0, tug = T > (it.stuck ?? 1e9) ? Math.max(0, Math.sin((T - it.stuck) * 22)) * 1.2 * Math.exp(-((T - it.stuck) % 1.2) * 3) : 0;
      const by = h + Math.PI + (it.x > 0 ? -0.35 : it.x < 0 ? 0.35 : 0), open = 18 + tug;
      const sl = local(p, by, 0, -open * s, 0, S._o).clone(); m.compose(sl, fq, S._s.set(s, s, s)); sliders.add(m);
      // the costume showing where it's open: sequins in the gap above the slider
      m.compose(p, fq, S._s.set(s, open * s, s)); seq.add(m);
      const gp = local(p, by, 0, -open * 0.5 * s, 2 * s, S._o); glowAt(S, gp.x, gp.y, gp.z, 10 * s, [1, 0.4, 0.85], 0.5);
    },
    // the heels on their riser, under a light
    heels(S, it, p) {
      const shoes = S.layers.shoe, wires = S.layers.wire;
      const h = S.course.sample(it.t).yaw, T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, hq = S._hq || (S._hq = new THREE.Quaternion());
      p.y = S.course.sample(it.t).y + (it.lift ?? 24);
      S._e.set(0, h, 0); hq.setFromEuler(S._e); m.compose(p, hq, S._s.set(1, 1, 1)); wires.add(m);
      for (const [x, ph] of [[-5, 0], [5, 1.7]]) {
        const sw = Math.sin(T * 1.7 + ph) * 0.28, w = local(p, h, x * s, -10.6 * s * Math.cos(sw), 10.6 * s * Math.sin(sw), S._o).clone();
        S._e.set(sw, h + Math.PI / 2 + (x > 0 ? 0.35 : -0.25), 0); hq.setFromEuler(S._e); m.compose(w, hq, S._s.set(s, s, s)); shoes.add(m);
      }
      glowAt(S, p.x, p.y - 6 * s, p.z, 20 * s, [1, 0.5, 0.55], 0.4);
    },
    // a checkout counter, its lane light
    counter(S, it, p, q, yaw) {
      const lanes = S.layers.laneLight;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.tillCounter.add(m);
      const w = local(p, yaw, 16 * s, 0, 0, S._o).clone(); m.compose(w, q, S._s.set(s, s, s)); lanes.add(m);
      glowAt(S, w.x, w.y + 27 * s, w.z, 5 * s, [1, 0.55, 0.15], 0.9, it.seed > 0.5 ? 0 : 1);
    },
    till(S, it, p, q, yaw) {
      const disp = S.layers.tillDisplay, rec = S.layers.tillReceipt;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.tillCounter.add(m); disp.add(m); rec.add(m);
      const w = local(p, yaw, -6 * s, 24.4 * s, -1.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 9 * s, [0.4, 1, 0.55], 0.6);
    },
    hBanner(S, it, p) { const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._hbq || (S._hbq = new THREE.Quaternion())).setFromEuler(S._e); p.y = S.course.sample(it.t).y + (it.lift ?? 17); const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.hBanner.add(m); S.layers.hBannerFace.add(m, { aIdx: it.idx, aWake: [0.9, 0] }); },
  },
  kits: {
    pkgs(S, z) { prepare(S.course, S.plan); for (const [t, sign, color, x] of z.at) S.items.push({ t, x: x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, idx: S.atlas.index[sign], tint: col(color ?? 0xd81a3a), parts: 'pkg', ahead: z.ahead ?? 40 }); },
    racks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) for (const side of [-1, 1]) S.items.push(onGround(S, { t: t + R() * 0.1, x: side * ((z.x ?? 30) + R() * 4), rot: 0, s: z.s ?? 1, parts: 'rack', ahead: z.ahead })); },
    longMirror(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, call: z.call, parts: 'longMirror', ahead: z.ahead ?? 30 }); },
    accessories(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) { const kind = ['wings', 'horns', 'tiara'][k++ % 3]; S.items.push(onGround(S, { t, x: side * (z.x ?? 40), rot: SIDE(side), s: (z.s ?? 1.4) * (kind === 'wings' ? 1.3 : 1), y: z.y, kind, parts: 'accessory', ahead: z.ahead })); } },
    pumpkins(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) S.items.push(onGround(S, { t: t + R() * 0.2, x: side * ((z.x ?? 26) + R() * 10), rot: SIDE(side) + (R() - 0.5) * 0.6, s: (z.s ?? 1.4) * (0.8 + R() * 0.5), seed: R(), parts: 'pumpkin', ahead: z.ahead })); },
    bats(S, z, R) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 2) S.items.push({ t, x: 0, rot: 0, seed: R(), parts: 'bats', ahead: z.ahead ?? 24 }); },
    spider(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1.6, drop: z.drop, parts: 'spider', ahead: z.ahead ?? 40 }); },
    dressForms(S, z, R) { for (const [t, x, color, spot] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x), s: z.s ?? 1.3, tint: col(color), spot, parts: 'dressForm', ahead: z.ahead })); },
    garmentBag(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, stuck: z.stuck, parts: 'garmentBag', ahead: z.ahead ?? 40 }); },
    heels(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1.4, lift: z.lift, parts: 'heels', ahead: z.ahead ?? 30 }); },
    counters(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 32), rot: 0, s: z.s ?? 1, seed: R(), parts: 'counter', ahead: z.ahead })); },
    till(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.4, parts: 'till', ahead: z.ahead })); },
    hBanner(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, idx: S.atlas.index[z.sign], parts: 'hBanner', ahead: z.ahead ?? 40 }); },
  },
});

// ---------- the rooms ----------
const flat = (W = 60, H = 50) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const SHOP = {
  rings: { flat },
  ringOf: () => 'flat',
  styles: { aisle: 0, fitting: 1, party: 2, clear: 3, front: 4 },
  dims: { aisle: [50, 60], fitting: [40, 50], party: [56, 62], clear: [46, 52], front: [54, 54] },
  lights: (id) => ({ 0: [24, 12], 1: [20, 10], 2: [30, 15], 3: [16, 8], 4: [22, 11] }[id] || null),
};

function shopMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffa860) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() }, uHell: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uHell;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      vec3 hue(float t){ return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool onWall = part == 1 || part == 2 || part == 6;
        vec2 fx = st < 0.5 ? vec2(24.0, 12.0) : st < 1.5 ? vec2(20.0, 10.0) : st < 2.5 ? vec2(30.0, 15.0) : st < 3.5 ? vec2(16.0, 8.0) : vec2(22.0, 11.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.6 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        bool glowy = false;
        vec3 col;
        if (part == 8) { col = st > 1.5 && st < 2.5 ? vec3(0.6, 0.2, 1.0) : vec3(0.95, 0.45, 0.1); glowy = st > 1.5 && st < 2.5; }
        else if (st < 0.5) {
          // the back room's aisles: pegboard walls hung with costumes in bags, black block above, orange light
          if (part == 0) { vec2 q = vec2(x, along) / 4.0; col = vec3(0.3, 0.29, 0.3) * (0.8 + 0.2 * h2(floor(q))) * (0.8 + 0.2 * edge(fract(q), 0.04)); col = mix(col, vec3(0.95, 0.45, 0.1), step(abs(abs(x) - 20.0), 0.6)); }
          else if (part == 3) { col = vec3(0.06, 0.05, 0.06); col = mix(col, vec3(0.2, 0.2, 0.22), step(abs(mod(x, 14.0) - 7.0), 1.6)); }
          else if (h < 30.0) {
            vec2 hq = fract(vec2(wa, h) / 1.5);
            col = vec3(0.52, 0.4, 0.28) * (1.0 - 0.5 * step(length(hq - 0.5), 0.14));
            // the costumes on their hooks: a bag, a card on top, a colour in it
            vec2 pq = vec2(wa / 7.0, (h - 2.0) / 9.0), pc = floor(pq), pf = fract(pq);
            float bag = step(0.12, pf.x) * step(pf.x, 0.88) * step(0.06, pf.y) * step(pf.y, 0.86) * step(pc.y, 2.0) * step(0.0, pc.y) * step(0.25, h2(pc));
            vec3 cc = vec3(0.0);
            float k = h2(pc + 3.0);
            cc = k < 0.2 ? vec3(0.95, 0.42, 0.08) : k < 0.4 ? vec3(0.45, 0.18, 0.85) : k < 0.55 ? vec3(0.08, 0.08, 0.1) : k < 0.7 ? vec3(0.85, 0.1, 0.18) : k < 0.85 ? vec3(0.2, 0.75, 0.35) : vec3(0.9, 0.9, 0.92);
            col = mix(col, cc * (0.8 + 0.2 * n2(pf * 6.0 + pc)), bag);
            col = mix(col, vec3(0.92, 0.9, 0.86), bag * step(0.72, pf.y));
          } else { vec2 bq = vec2(wa / 2.4 + mod(floor(h / 1.2), 2.0) * 0.5, h / 1.2); col = vec3(0.08, 0.07, 0.08) * (0.8 + 0.3 * h2(floor(bq))); col = mix(col, vec3(0.95, 0.45, 0.1), step(abs(h - 31.0), 0.4)); }
        } else if (st < 1.5) {
          // the fitting rooms: velvet curtains in stalls, white posts between, a rail; carpet
          if (part == 0) { col = vec3(0.26, 0.16, 0.2) * (0.85 + 0.15 * n2(vec2(x, along) * 0.5)); }
          else if (part == 3) { col = vec3(0.12, 0.08, 0.1); col += vec3(1.0, 0.85, 0.7) * step(length(vec2(abs(x) - 12.0, dl)), 1.2) * 0.8; }
          else if (h < 30.0 && part != 6) {
            float sx = mod(wa, 12.0);
            float fold = 0.65 + 0.35 * sin(wa * 2.4 + sin(h * 0.15 + uTime * 0.8) * 0.8);
            col = vec3(0.42, 0.04, 0.12) * fold;
            col = mix(col, vec3(0.92, 0.9, 0.88), step(sx, 1.2));
            col = mix(col, vec3(0.75, 0.6, 0.3), step(abs(h - 29.0), 0.5));
            col = mix(col, col * 0.4, step(h, 3.0) * step(abs(sx - 6.6), 4.0));
          } else { col = vec3(0.2, 0.14, 0.16) * (0.9 + 0.1 * n2(vec2(wa, h) * 0.2)); if (part == 6) col = vec3(0.32, 0.2, 0.24); }
        } else if (st < 2.5) {
          // the party under the blacklight: black, and everything that glows under it glowing
          col = vec3(0.025, 0.015, 0.04);
          if (part == 0) { vec2 q = vec2(x, along) * 0.5; col += vec3(0.6, 0.2, 1.0) * step(0.985, h2(floor(q * 2.0))) * 1.5; col += vec3(0.25, 0.05, 0.4) * step(abs(fract(along / 8.0) - 0.5), 0.02); }
          else if (part == 3) { col += vec3(0.6, 0.25, 1.0) * step(abs(mod(x, 18.0) - 9.0), 0.5) * 1.4; }
          else {
            // fishnet: a diamond net glowing hot pink
            vec2 dq = vec2(wa + h, wa - h) / 3.2; vec2 df = abs(fract(dq) - 0.5);
            float net = smoothstep(0.08, 0.0, min(df.x, df.y)) * smoothstep(4.0, 10.0, h) * (1.0 - smoothstep(26.0, 34.0, h));
            col += vec3(1.0, 0.2, 0.75) * net * 0.9;
            // cobwebs in the upper corners: spokes and rings, white-violet
            vec2 wc = vec2(mod(wa, 40.0), 62.0 - h); float r = length(wc), a = atan(wc.y, wc.x);
            float web = (smoothstep(0.12, 0.0, abs(fract(a * 2.6) - 0.5) * r * 0.3) + smoothstep(0.25, 0.0, abs(fract(r / 4.0) - 0.5))) * step(r, 18.0) * step(0.0, wc.y);
            col += vec3(0.8, 0.7, 1.0) * clamp(web, 0.0, 1.0) * 0.9;
            // splashes of neon paint, and glitter that catches the light
            col += hue(h2(floor(vec2(wa, h) / 6.0))) * step(0.93, h2(floor(vec2(wa, h) / 6.0) + 9.0)) * smoothstep(2.6, 1.0, length(fract(vec2(wa, h) / 6.0) - 0.5) * 6.0) * 1.2;
            col += vec3(1.0) * step(0.997, h2(floor(vec2(wa, h) * 2.0) + floor(uTime * 6.0))) * 2.0;
            col += vec3(0.5, 0.2, 1.0) * uBeat * 0.12;
          }
          glowy = true;
        } else if (st < 3.5) {
          // the clearance room: yellow and red, everything marked down; harsh light
          if (part == 0) { col = vec3(0.36, 0.34, 0.32) * (0.8 + 0.3 * n2(vec2(x, along) * 0.3)); }
          else if (part == 3) { col = vec3(0.6, 0.6, 0.58); col = mix(col, vec3(1.6), step(abs(abs(x) - 12.0), 1.0) * step(abs(dl), 6.0)); }
          else {
            col = mix(vec3(0.95, 0.82, 0.1), vec3(0.85, 0.08, 0.06), aaSq((wa - h) / 14.0));
            // red tags everywhere
            vec2 tq = vec2(wa / 9.0, h / 7.0), tf = fract(tq) - 0.5;
            float tagk = step(0.6, h2(floor(tq))) * step(abs(tf.x), 0.28) * step(abs(tf.y), 0.18);
            col = mix(col, vec3(0.95), tagk); col = mix(col, vec3(0.85, 0.06, 0.06), tagk * step(abs(tf.x + 0.05), 0.12) * step(abs(tf.y), 0.06));
            col = mix(col, vec3(0.1), step(h, 2.0));
          }
        } else {
          // the front of the shop: big windows on the lot at night, a counter-height wall, orange and black
          if (part == 0) { vec2 q = vec2(x, along) / 6.0; col = vec3(0.82, 0.8, 0.78) * (0.85 + 0.15 * edge(fract(q), 0.03)); col = mix(col, vec3(0.95, 0.45, 0.1), step(abs(abs(x) - 18.0), 0.6)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 8.0); col = vec3(0.86, 0.86, 0.84) * (0.85 + 0.15 * edge(q, 0.04)); col = mix(col, vec3(1.7), step(abs(fract(x / 16.0) - 0.5), 0.12) * step(abs(dl), 5.0)); }
          else if (part != 6 && h > 10.0 && h < 40.0) {
            float mx = mod(wa, 20.0);
            vec3 night = mix(vec3(0.16, 0.08, 0.12), vec3(0.03, 0.02, 0.06), (h - 10.0) / 30.0);
            // the lot: lamps in orange, the cars' roofs
            float lx = mod(wa + 7.0, 24.0) - 12.0;
            float lamp = step(abs(lx), 0.3) * step(h, 24.0) * 0.6 + smoothstep(3.0, 0.0, length(vec2(lx, h - 24.0))) * 1.4;
            night += vec3(1.0, 0.55, 0.2) * lamp;
            night = mix(night, vec3(0.05, 0.05, 0.07), step(h, 13.5) * step(0.4, h2(vec2(floor(wa / 9.0), 2.0))));
            col = mix(night, vec3(0.1, 0.1, 0.12), step(mx, 0.8) + step(abs(h - 25.0), 0.4));
          } else { col = vec3(0.1, 0.09, 0.1); col = mix(col, vec3(0.95, 0.45, 0.1), step(abs(h - 9.0), 0.8) + step(abs(h - 41.0), 0.8)); }
        }
        if (!glowy) col *= lightK * uLight;
        // "ready for hell": the shop going red
        col = mix(col, col * vec3(1.25, 0.32, 0.22) + vec3(0.12, 0.0, 0.0) * smoothstep(40.0, 0.0, h), uHell);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the till, 29.99, the receipt ----------
export class TillFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -24;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2, emissive: 0x141016 });
    this.group.add(new THREE.Mesh(KG.counter(), mat));
    this.disp = new THREE.Mesh(KG.display(), new THREE.MeshBasicMaterial({ map: tex().display })); this.group.add(this.disp);
    this.rec = new THREE.Mesh(KG.receipt(), new THREE.MeshStandardMaterial({ map: tex().receipt, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex().receipt, emissiveIntensity: 0.35 })); this.group.add(this.rec);
    this.group.scale.setScalar(1.5);
    this.lit = 0.5; this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = groundAt(this.course, this.t, this.x);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.x > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    this.lit += ((this.fired ? 1.2 : 0.6) - this.lit) * Math.min(1, dt * 2);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    this._w.set(-6, 24.4, -1.5).applyMatrix4(this.group.matrixWorld);
    S.glow(this._w.x, this._w.y, this._w.z, 10, [0.4, 1, 0.55], 0.5 * this.lit);
    S.pool(this._p.x, this._p.y + 0.1, this._p.z, 50, [1, 0.6, 0.3], 0.45 * this.lit);
  }
}

// ---------- the shop, per frame ----------
export class ShopWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = shopMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, SHOP));
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffa860);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    const one = (w) => smooth(w[0] - (w[2] ?? 0.1), w[0], t) * (1 - smooth(w[1], w[1] + (w[3] ?? 0.5), t));
    const win = (w) => (!w ? 0 : Array.isArray(w[0]) ? Math.max(...w.map(one)) : one(w));
    u.uHell.value = win(ev.hell);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
  }
  // the lights in each room: bare bulbs in the aisles, spots in the fitting rooms, purple tubes at the party
  draw(T) {
    const g = this._g || (this._g = new THREE.Vector3()), lamp = col(this.S.P.lamp ?? 0xffa860);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 2) { for (const x of [-27, 27]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 2, g.z, 12, [0.6, 0.25, 1], 0.7); } continue; }
        for (const x of r.style === 1 ? [-12, 12] : [-14, 14]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 3, g.z, 8, lamp, 0.8); }
        this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 40, lamp, 0.3);
      }
    }
  }
}
