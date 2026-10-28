// Pretty Until Proven Guilty. The courthouse, and she's the one on trial, and we are small in it:
// the courtroom and its bench, the gavel on "order in the court"; the marble halls and the scales;
// the jury box and the witness stand with its ring lights; the key thrown away; the evidence room,
// the hoodie in its bag, the receipts, the broken heart in a case; red handprints down the hall;
// the cells locking; the cuffs worn like jewellery in a room of mirrors, her lawyer the mirror; the
// scales going pretty, guilty, pretty, guilty; "case closed", and the lipstick standing at the end.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';
import { PpgPaper, PpgPages } from './ppg-paper.js';
import { PpgBoards, PpgPress } from './ppg-sets.js';
import { PpgOutside } from './ppg-finale.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
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
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function heartShape() {
  const s = new THREE.Shape();
  for (let i = 0; i <= 48; i++) { const t = (i / 48) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); if (i) s.lineTo(x / 17, y / 17); else s.moveTo(x / 17, y / 17); }
  return s;
}
// half a heart, broken down a jagged line (side -1 the left half, 1 the right); both halves share the crack
const CRACK = [[0, 0.29], [0.12, 0.1], [-0.06, -0.12], [0.1, -0.34], [-0.05, -0.58], [0.04, -0.8], [0, -1.0]];
function halfHeart(side) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.29);
  for (let i = 1; i <= 24; i++) { const t = (i / 24) * Math.PI * side; s.lineTo(16 * Math.pow(Math.sin(t), 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17); }
  for (let i = CRACK.length - 2; i >= 1; i--) s.lineTo(CRACK[i][0], CRACK[i][1]);
  return s;
}
// a handprint in red paint
function handTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#ee1844';
    g.beginPath(); g.ellipse(128, 160, 52, 58, 0, 0, Math.PI * 2); g.fill();
    for (const [x, y, a, l] of [[78, 120, -0.5, 70], [104, 92, -0.15, 88], [134, 86, 0.05, 92], [162, 96, 0.22, 82], [184, 150, 0.95, 62]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, -l / 2, 13, l / 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  });
}
// a swipe of red paint, a roller's width
function splatTexture() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = '#ee1844';
    g.beginPath(); g.moveTo(10, 90); for (let x = 10; x <= 500; x += 10) g.lineTo(x, 70 + Math.sin(x * 0.05) * 10); for (let x = 500; x >= 10; x -= 10) g.lineTo(x, 150 + Math.sin(x * 0.07 + 1) * 12); g.closePath(); g.fill();
    g.globalAlpha = 0.5; for (let x = 20; x < 500; x += 34) g.fillRect(x, 78 + Math.sin(x) * 6, 18, 60);
  });
}
// the mirror's glass: silver, a soft sheen across it
function mirrorTexture() {
  return canvasTex(256, 512, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#9aa4b8'); gr.addColorStop(0.45, '#e8eef8'); gr.addColorStop(0.55, '#c8d0e0'); gr.addColorStop(1, '#7a8498'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.25; g.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(40 + k * 60, 0); g.lineTo(90 + k * 60, 0); g.lineTo(10 + k * 60, H); g.lineTo(-40 + k * 60, H); g.fill(); }
  });
}
// a receipt: thermal paper, lines of print
function receiptTexture() {
  return canvasTex(64, 512, (g, W, H) => {
    g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6a6a70'; const R = seeded(21);
    for (let y = 20; y < H - 10; y += 14) { if (R() < 0.15) continue; const w = 20 + R() * 30; g.fillRect(6, y, w, 4); g.fillRect(W - 6 - 12, y, 12, 4); }
  });
}
// the newspaper page round the headline: the paper, the masthead rule, columns of print
function paperTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#ece6d6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2a2e'; g.fillRect(24, 22, W - 48, 6); g.fillRect(24, 34, W - 48, 2);
    g.fillRect(24, 250, W - 48, 3);
    const R = seeded(31);
    for (let c = 0; c < 3; c++) for (let y = 270; y < H - 24; y += 12) { if (R() < 0.08) continue; g.fillRect(24 + c * 158, y, 140 - (R() < 0.2 ? R() * 60 : 0), 5); }
    g.fillStyle = '#8a8478'; g.fillRect(340, 290, 148, 110);
  });
}

// ---------- the courthouse's things, at our size ----------
const CT = {
  // the judge's bench (one half, either side of a door): raised panelled front, the desk top, brass along it
  bench() {
    const parts = [], wood = rgb(0x4a2a16), panel = rgb(0x6a3a1e), brass = rgb(0xc8a050);
    parts.push(paint(box(22, 16, 7, 0, 8, 0), wood));
    for (let k = 0; k < 3; k++) parts.push(paint(box(5.6, 10, 0.4, -7 + k * 7, 8, 3.6), panel));
    parts.push(paint(box(23.4, 1.2, 8.4, 0, 16.6, 0.4), rgb(0x3a2010)));
    parts.push(paint(box(23.4, 0.3, 0.3, 0, 16, 4.6), brass));
    parts.push(paint(box(22, 26, 1.2, 0, 13, -6), wood));
    return merge(parts);
  },
  // the judge's chair, high-backed, red leather
  chair() { const parts = [], red = rgb(0x5a0e14); parts.push(paint(box(7, 2, 6, 0, 18.5, -3), red)); parts.push(paint(box(7, 12, 1.6, 0, 25, -6), red)); parts.push(paint(box(7.6, 1, 2, 0, 31.2, -6), rgb(0xc8a050))); return merge(parts); },
  // the gavel: the head and the handle (it swings about the handle's end); and its block
  gavel() { const parts = [], wood = rgb(0x7a4a22), brass = rgb(0xd8b060); const h = cyl(1.3, 1.3, 5.2, 16, 0, 0, 0); h.rotateZ(Math.PI / 2); h.translate(0, 0, 7); parts.push(paint(h, wood)); for (const x of [-2.4, 2.4]) { const b = cyl(1.36, 1.36, 0.4, 16, 0, 0, 0); b.rotateZ(Math.PI / 2); b.translate(x, 0, 7); parts.push(paint(b, brass)); } const hd = cyl(0.38, 0.45, 7, 10, 0, 0, 0); hd.rotateX(Math.PI / 2); hd.translate(0, 0, 3.5); parts.push(paint(hd, wood)); return merge(parts); },
  block() { return merge([paint(cyl(2.2, 2.4, 1.1, 24, 0, 0.55, 0), rgb(0x5a3016))]); },
  // the scales: the hanger, the beam (it tips), the pans on their rods
  hanger() { const parts = [], gold = rgb(0xd8b050); parts.push(paint(cyl(0.5, 0.5, 40, 8, 0, 20.5, 0), rgb(0x8a8a90))); parts.push(paint(new THREE.TorusGeometry(1.6, 0.4, 8, 20), gold)); parts.push(paint(sph(1.8, 1, 1, 1, 0, -1.8, 0, 12, 8), gold)); return merge(parts); },
  beam() { const parts = [], gold = rgb(0xd8b050); parts.push(paint(box(32, 1, 1, 0, 0, 0), gold)); for (const x of [-16, 16]) parts.push(paint(sph(1, 1, 1, 1, x, 0, 0, 10, 8), gold)); parts.push(paint(cyl(0.4, 1.4, 3, 12, 0, 1.5, 0), gold)); return merge(parts); },
  pan() { const parts = [], gold = rgb(0xd8b050); const bowl = new THREE.SphereGeometry(5.5, 28, 8, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4); bowl.translate(0, -10.6, 0); parts.push(paint(bowl, gold)); for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(tube(V(0, 0, 0), V(Math.cos(a) * 4.6, -12.2, Math.sin(a) * 4.6), 0.12, 4), rgb(0xb89040))); } return merge(parts); },
  // a lipstick: the gold case, the silver collar, the red bullet cut on the slant
  lipstick() {
    const parts = [], gold = rgb(0xd8a840), red = rgb(0xd0102a);
    parts.push(paint(cyl(3, 3, 9, 32, 0, 4.5, 0), gold)); parts.push(paint(cyl(3.15, 3.15, 0.6, 32, 0, 9, 0), rgb(0xf0d890)));
    parts.push(paint(cyl(2.5, 2.5, 3.4, 32, 0, 10.9, 0), rgb(0xd8dce4)));
    const b = cyl(2.1, 2.1, 5, 32, 0, 15, 0); const pos = b.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 15) pos.setY(i, pos.getY(i) + pos.getX(i) * 0.9); b.computeVertexNormals(); parts.push(paint(b, red));
    return merge(parts);
  },
  // the jury box: a rail round it, two rows of six empty chairs
  jury() {
    const parts = [], wood = rgb(0x5a3218), seat = rgb(0x2a4a3a);
    parts.push(paint(box(40, 7, 1.2, 0, 3.5, 9), wood)); for (const x of [-20, 20]) parts.push(paint(box(1.2, 7, 18, x, 3.5, 0), wood));
    parts.push(paint(box(40, 3, 8, 0, 1.5, -5), wood));
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const x = -15 + k * 6, y = r ? 3 : 0, z = r ? -5 : 3; parts.push(paint(box(4, 1, 4, x, y + 4, z), seat)); parts.push(paint(box(4, 5, 0.8, x, y + 7, z - 2), seat)); }
    return merge(parts);
  },
  // the witness stand: its box, the rail, the microphone
  stand() { const parts = [], wood = rgb(0x5a3218); parts.push(paint(box(12, 10, 10, 0, 5, 0), wood)); parts.push(paint(box(12.6, 0.8, 10.6, 0, 10.2, 0), rgb(0x3a2010))); parts.push(paint(cyl(0.15, 0.15, 5, 6, 0, 12.5, 4), rgb(0x2a2a2e))); parts.push(paint(sph(0.7, 1, 1.3, 1, 0, 15.3, 4, 10, 8), rgb(0x1a1a1e))); return merge(parts); },
  // a ring light on its tripod, a phone in the middle of it (the light is the glow and the ring layer)
  tripod() { const parts = [], dark = rgb(0x2a2a30); for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(tube(V(Math.cos(a) * 3, 0, Math.sin(a) * 3), V(0, 12, 0), 0.16, 5), dark)); } parts.push(paint(cyl(0.2, 0.2, 6, 6, 0, 15, 0), dark)); parts.push(paint(box(1.4, 2.6, 0.3, 0, 18, 0.2), rgb(0x101014))); return merge(parts); },
  ringLight() { const g = new THREE.TorusGeometry(3.2, 0.42, 10, 40); g.translate(0, 18, 0); return g; },
  // a column of marble: the base, the shaft, the capital
  column() { const parts = [], m = rgb(0xece8e2); parts.push(paint(box(7, 2, 7, 0, 1, 0), m)); parts.push(paint(cyl(2.4, 2.6, 34, 24, 0, 19, 0), m)); parts.push(paint(box(6.4, 2.4, 6.4, 0, 37.2, 0), m)); parts.push(paint(box(7.4, 1, 7.4, 0, 38.9, 0), rgb(0xd8b060))); return merge(parts); },
  // a big old key: the bow, the shaft, the bit
  key() { const parts = [], brass = rgb(0xd8a840); const bow = new THREE.TorusGeometry(3.2, 0.9, 10, 28); bow.translate(0, 0, 0); parts.push(paint(bow, brass)); parts.push(paint(cyl(0.7, 0.7, 16, 12, 0, -11, 0), brass)); parts.push(paint(box(3, 1.2, 1.2, 1.5, -16.4, 0), brass)); parts.push(paint(box(1.2, 2.6, 1.2, 2.4, -17.6, 0), brass)); parts.push(paint(box(2, 1, 1.2, 1.3, -14.4, 0), brass)); return merge(parts); },
  // a dressing-room mirror: the frame (the glass and the bulbs are their own)
  mirrorFrame(w = 18, h = 26) { const parts = [], gold = rgb(0xd8b060); for (const [bw, bh, x, y] of [[w + 2.4, 1.6, 0, h / 2 + 0.8], [w + 2.4, 1.6, 0, -h / 2 - 0.8], [1.6, h + 3.2, -w / 2 - 0.8, 0], [1.6, h + 3.2, w / 2 + 0.8, 0]]) parts.push(paint(box(bw, bh, 1.2, x, y, 0), gold)); parts.push(paint(box(w, h, 0.4, 0, 0, -0.5), rgb(0x2a2a30))); return merge(parts); },
  mirrorGlass(w = 18, h = 26) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, 0, 0.05); return g; },
  // the hoodie, laid out, in its evidence bag (the bag is see-through, the tag is red)
  hoodie() {
    const parts = [], c = rgb(0xb8a8d0), d = rgb(0x8a78a8);
    parts.push(paint(box(11, 13, 2.4, 0, 0, 0), c));
    for (const s of [-1, 1]) { const sl = box(3.4, 12, 2.2, 0, -6, 0); sl.rotateZ(s * 0.5); sl.translate(s * 6.2, 4.6, 0); parts.push(paint(sl, c)); }
    parts.push(paint(sph(3.6, 1.2, 1, 0.5, 0, 7.6, -0.4, 16, 10), d));
    parts.push(paint(box(6, 3.4, 0.4, 0, -3.4, 1.3), d));
    for (const x of [-1, 1]) parts.push(paint(box(0.25, 4, 0.25, x, 3, 1.4), rgb(0xf0f0f0)));
    return merge(parts);
  },
  bag() { const parts = []; parts.push(paint(box(17, 26, 4, 0, 1, 0), rgb(0xe8eef4))); return merge(parts); },
  tag() { const parts = []; parts.push(paint(box(17.2, 1.6, 4.2, 0, 12.6, 0), rgb(0xd0102a))); parts.push(paint(box(5, 3, 0.2, 5, 9.6, 2.2), rgb(0xf4f0e8))); parts.push(paint(box(5, 0.6, 0.22, 5, 10.4, 2.2), rgb(0xd0102a))); return merge(parts); },
  receipt() { const g = new THREE.PlaneGeometry(1.8, 30, 1, 12); g.translate(0, -15, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, Math.sin(y * 0.25) * 0.8); } g.computeVertexNormals(); return g; },
  // the broken heart in its case on a pedestal
  heartHalf(side) { const g = new THREE.ExtrudeGeometry(halfHeart(side), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.08, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -0.3); return g; },
  pedestal() { const parts = [], m = rgb(0xece8e2); parts.push(paint(box(10, 14, 10, 0, 7, 0), m)); parts.push(paint(box(11, 1, 11, 0, 14.5, 0), rgb(0xd8b060))); parts.push(paint(box(11, 1, 11, 0, 0.5, 0), rgb(0xc8c4bc))); return merge(parts); },
  caseGlass() { return box(9, 11, 9, 0, 20.5, 0); },
  // a paint bucket spilt, the roller lying by it
  bucket() { const parts = []; parts.push(paint(cyl(2.4, 2.1, 4.4, 20, 0, 2.2, 0), rgb(0xd8dce4))); parts.push(paint(cyl(2.3, 2.3, 0.2, 20, 0, 4.3, 0), rgb(0xee1844))); const sp = new THREE.CircleGeometry(6, 24); sp.rotateX(-Math.PI / 2); sp.scale(1.4, 1, 0.8); sp.translate(4, 0.06, 1); parts.push(paint(sp, rgb(0xee1844))); const r = cyl(1, 1, 5, 14, 0, 0, 0); r.rotateZ(Math.PI / 2); r.translate(-5, 1, 3); parts.push(paint(r, rgb(0xee1844))); parts.push(paint(tube(V(-5, 1, 3), V(-9, 1, 9), 0.25, 5), rgb(0x2a2a2e))); return merge(parts); },
  // a cell door: the bars, the bands across (it slides)
  cellDoor() { const parts = [], steel = rgb(0x4a4e58); for (let k = 0; k <= 8; k++) parts.push(paint(cyl(0.3, 0.3, 22, 8, 0, 11, -4.8 + k * 1.2), steel)); for (const y of [1, 8, 21.5]) parts.push(paint(box(0.8, 0.8, 10.4, 0, y, 0), steel)); parts.push(paint(box(1, 2.4, 1.6, 0.4, 11, 4.6), rgb(0x2a2a30))); return merge(parts); },
  // the cuffs: two rings, the chain between, each ring's arm (the arms swing shut); the cushion and stand
  cuffRing() { const parts = [], silver = rgb(0xe8ecf4); const r = new THREE.TorusGeometry(4, 0.75, 12, 40, Math.PI * 1.35); r.rotateZ(Math.PI * 0.82); parts.push(paint(r, silver)); parts.push(paint(box(2.2, 2.4, 1.8, 0, -4.4, 0), silver)); return merge(parts); },
  cuffArm() { const g = new THREE.TorusGeometry(4, 0.55, 10, 24, Math.PI * 0.7); g.rotateZ(-Math.PI * 0.35 + Math.PI / 2); return merge([paint(g, rgb(0xd8dce8))]); },
  chain() { const parts = []; for (let k = 0; k < 3; k++) { const l = new THREE.TorusGeometry(1, 0.28, 8, 16); if (k % 2) l.rotateY(Math.PI / 2); l.translate(-2 + k * 2, 0, 0); parts.push(paint(l, rgb(0xe8ecf4))); } return merge(parts); },
  display() { const parts = []; parts.push(paint(box(18, 12, 12, 0, 6, 0), rgb(0x1a1418))); parts.push(paint(box(18.6, 0.8, 12.6, 0, 12.4, 0), rgb(0xd8b060))); parts.push(paint(sph(8, 1, 0.28, 0.75, 0, 13.6, 0, 24, 12), rgb(0x7a0a1e))); return merge(parts); },
  // a placard on chains across the room (his words are the sign layer)
  placard() { const parts = [], wood = rgb(0x3a2010), gold = rgb(0xd8b060); parts.push(paint(box(34, 12.4, 0.8, 0, 0, -0.5), wood)); for (const [w, h, x, y] of [[34.8, 0.8, 0, 6.4], [34.8, 0.8, 0, -6.4], [0.8, 13.6, -17.2, 0], [0.8, 13.6, 17.2, 0]]) parts.push(paint(box(w, h, 1, x, y, -0.3), gold)); for (const s of [-1, 1]) parts.push(paint(box(0.3, 40, 0.3, s * 15, 26.2, -0.5), rgb(0xb89040))); return merge(parts); },
  placardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(4.0, 4.0, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
  // the newspaper hung across: the page (the headline is the sign layer)
  paper() { const g = new THREE.PlaneGeometry(32, 40); g.translate(0, -8, -0.1); return g; },
  paperFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(3.9, 3.6, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 4.6, 0.05); return g; },
};

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const selfLit = (k) => (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * ' + k.toFixed(2) + ';'); };
let TEX = null;
const tex = () => TEX || (TEX = { hand: handTexture(), splat: splatTexture(), mirror: mirrorTexture(), receipt: receiptTexture(), paper: paperTexture() });
extend({
  layers: {
    judgeBench: (M) => [CT.bench(), VC(M, 'jWood', { roughness: 0.55, metalness: 0.05, emissive: 0x1a0c06 }), 6, {}],
    judgeChair: (M) => [CT.chair(), VC(M, 'jChair', { roughness: 0.5, metalness: 0.05, emissive: 0x1a0406 }), 4, {}],
    gavel: (M) => [CT.gavel(), VC(M, 'jGavel', { roughness: 0.35, metalness: 0.2, emissive: 0x2a1406 }), 4, {}],
    gavelBlock: (M) => [CT.block(), VC(M, 'jGavel', { roughness: 0.35, metalness: 0.2, emissive: 0x2a1406 }), 4, {}],
    hanger: (M) => [CT.hanger(), VC(M, 'jGold', { roughness: 0.25, metalness: 0.6, emissive: 0x3a2808 }), 6, {}],
    beam: (M) => [CT.beam(), VC(M, 'jGold', { roughness: 0.25, metalness: 0.6, emissive: 0x3a2808 }), 6, {}],
    scalePan: (M) => [CT.pan(), VC(M, 'jGoldD', { roughness: 0.25, metalness: 0.6, emissive: 0x3a2808, side: THREE.DoubleSide }), 12, {}],
    courtLipstick: (M) => [CT.lipstick(), VC(M, 'jLip', { roughness: 0.25, metalness: 0.4, emissive: 0x3a0a0a }), 8, {}],
    jury: (M) => [CT.jury(), VC(M, 'jWood2', { roughness: 0.6, metalness: 0.05, emissive: 0x140a06 }), 4, {}],
    stand: (M) => [CT.stand(), VC(M, 'jWood2', { roughness: 0.6, metalness: 0.05, emissive: 0x140a06 }), 4, {}],
    tripod: (M) => [CT.tripod(), VC(M, 'jDark', { roughness: 0.5, metalness: 0.3, emissive: 0x0a0a0c }), 16, {}],
    ringLight: (M) => [CT.ringLight(), M.ringM || (M.ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff8f0).multiplyScalar(1.5) })), 16, {}],
    column: (M) => [CT.column(), VC(M, 'jMarble', { roughness: 0.3, metalness: 0.05, emissive: 0x1e1c1a }), 80, {}],
    key: (M) => [CT.key(), VC(M, 'jKey', { roughness: 0.25, metalness: 0.6, emissive: 0x4a3008 }), 3, {}],
    vanityFrame: (M) => [CT.mirrorFrame(), VC(M, 'jGold', { roughness: 0.25, metalness: 0.6, emissive: 0x3a2808 }), 40, {}],
    vanityGlass: (M) => [CT.mirrorGlass(), M.mglassM || (M.mglassM = new THREE.MeshBasicMaterial({ map: tex().mirror })), 40, {}],
    bigFrame: (M) => [CT.mirrorFrame(40, 26), VC(M, 'jGold', { roughness: 0.25, metalness: 0.6, emissive: 0x3a2808 }), 3, {}],
    bigGlass: (M) => [CT.mirrorGlass(40, 26), M.mglassM || (M.mglassM = new THREE.MeshBasicMaterial({ map: tex().mirror })), 3, {}],
    hoodie: (M) => [CT.hoodie(), VC(M, 'jHood', { roughness: 0.9, metalness: 0, emissive: 0x1a1420 }), 3, {}],
    bag: (M) => [CT.bag(), M.bagM || (M.bagM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false })), 3, {}],
    bagTag: (M) => [CT.tag(), VC(M, 'jTag', { roughness: 0.6, metalness: 0, emissive: 0x2a0408 }), 3, {}],
    receipt: (M) => [CT.receipt(), M.rcptM || (M.rcptM = new THREE.MeshStandardMaterial({ map: tex().receipt, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x3a3a38 })), 120, {}],
    heartL: (M) => [CT.heartHalf(-1), M.heartM || (M.heartM = new THREE.MeshStandardMaterial({ color: 0xe0102a, roughness: 0.2, metalness: 0.1, emissive: 0x6a0410 })), 3, {}],
    heartR: (M) => [CT.heartHalf(1), M.heartM || (M.heartM = new THREE.MeshStandardMaterial({ color: 0xe0102a, roughness: 0.2, metalness: 0.1, emissive: 0x6a0410 })), 3, {}],
    pedestal: (M) => [CT.pedestal(), VC(M, 'jMarble', { roughness: 0.3, metalness: 0.05, emissive: 0x1e1c1a }), 3, {}],
    caseGlass: (M) => [CT.caseGlass(), M.caseM || (M.caseM = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false })), 3, {}],
    hand: (M) => [new THREE.PlaneGeometry(1, 1), M.handM || (M.handM = new THREE.MeshBasicMaterial({ map: tex().hand, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15) })), 40, {}],
    splat: (M) => [new THREE.PlaneGeometry(2, 1), M.splatM || (M.splatM = new THREE.MeshBasicMaterial({ map: tex().splat, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.1, 1.1, 1.1) })), 20, {}],
    bucket: (M) => [CT.bucket(), VC(M, 'jBucket', { roughness: 0.35, metalness: 0.2, emissive: 0x1a0606 }), 8, {}],
    cellDoor: (M) => [CT.cellDoor(), VC(M, 'jSteel', { roughness: 0.35, metalness: 0.5, emissive: 0x0e0e12 }), 30, {}],
    cuffRing: (M) => [CT.cuffRing(), M.cuffM || (M.cuffM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.75 }); m.onBeforeCompile = selfLit(0.7); return m; })()), 4, {}],
    cuffArm: (M) => [CT.cuffArm(), M.cuffM || (M.cuffM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.75 }); m.onBeforeCompile = selfLit(0.7); return m; })()), 4, {}],
    chain: (M) => [CT.chain(), M.cuffM || (M.cuffM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.75 }); m.onBeforeCompile = selfLit(0.7); return m; })()), 16, {}],
    display: (M) => [CT.display(), VC(M, 'jVelvet', { roughness: 0.7, metalness: 0.1, emissive: 0x1a0408 }), 2, {}],
    placard: (M) => [CT.placard(), VC(M, 'jPlacard', { roughness: 0.5, metalness: 0.3, emissive: 0x140a04 }), 8, {}],
    placardFace: (M) => [CT.placardFace(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    paper: (M) => [CT.paper(), M.paperM || (M.paperM = new THREE.MeshStandardMaterial({ map: tex().paper, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex().paper, emissiveIntensity: 0.35 })), 3, {}],
    newsFace: (M) => [CT.paperFace(), M.sign, 3, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // half the judge's bench, against the wall; the left half has the chair and the gavel
    judgeBench(S, it, p, q, yaw) {
      const chairs = S.layers.judgeChair, gavels = S.layers.gavel, blocks = S.layers.gavelBlock;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.judgeBench.add(m);
      if (!it.judge) return;
      chairs.add(m);
      // the gavel lifts and comes down at each strike
      const T = S.tNow ?? 0; let lift = 0.3;
      for (const st of it.strikes || []) {
        const d = T - st;
        if (d > -0.45 && d <= 0) { const u = (d + 0.45) / 0.45; lift = u < 0.6 ? 0.3 + 0.9 * smooth(0, 1, u / 0.6) : 1.2 * (1 - Math.pow((u - 0.6) / 0.4, 2)); }
        else if (d > 0 && d < 0.5) lift = 0.3 * (d / 0.5);
      }
      const b = local(p, yaw, 6 * s, 17.2 * s, 1 * s, S._o).clone(); m.compose(b, q, S._s.set(s, s, s)); blocks.add(m);
      const e = S._ge || (S._ge = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(-lift, yaw + Math.PI / 2, 0); const gq = S._gq || (S._gq = new THREE.Quaternion()); gq.setFromEuler(e);
      const g = local(p, yaw, 6 * s - 7 * s, 19.6 * s, 1 * s, S._o).clone(); m.compose(g, gq, S._s.set(s, s, s)); gavels.add(m);
      for (const st of it.strikes || []) { const d = T - st; if (d >= 0 && d < 0.25) glowAt(S, b.x, b.y + 1.5 * s, b.z, 14 * s, [1, 0.9, 0.7], 1.6 * (1 - d / 0.25)); }
    },
    // the scales hung over the road; the beam tips, the pans hang level, a lipstick in one and a gavel in the other
    scales(S, it, p) {
      const beams = S.layers.beam, pans = S.layers.scalePan, lips = S.layers.courtLipstick, gavels = S.layers.gavel;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 26);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.hanger.add(m);
      // which way it leans: idle sway, then hard over on each word (+1 pretty side down, -1 guilty side down)
      const T = S.tNow ?? 0; let tilt = Math.sin(T * 1.1 + it.t) * 0.08;
      if (it.tips) { let last = null; for (const [tt, d] of it.tips) if (T >= tt) last = [tt, d]; if (last) { const u = clamp((T - last[0]) / 0.18, 0, 1); let prev = 0; for (const [tt, d] of it.tips) if (tt < last[0]) prev = d; tilt = (prev + (last[1] - prev) * (u * u * (3 - 2 * u))) * 0.32 + Math.sin(T * 9) * 0.02 * (1 - u); } }
      const by = h + Math.PI, e = S._be || (S._be = new THREE.Euler()), bq = S._bq || (S._bq = new THREE.Quaternion());
      e.set(0, by, tilt); bq.setFromEuler(e); const c = local(p, by, 0, -3.6 * s, 0, S._o).clone(); m.compose(c, bq, S._s.set(s, s, s)); beams.add(m);
      for (const sd of [-1, 1]) {
        const end = local(c, by, sd * 16 * Math.cos(tilt) * s, sd * 16 * Math.sin(tilt) * s, 0, S._o).clone();
        m.compose(end, fq, S._s.set(s, s, s)); pans.add(m);
        const inPan = local(end, by, 0, (sd < 0 ? -15.4 : -14.4) * s, 0, S._o).clone();
        if (sd < 0) { m.compose(inPan, fq, S._s.set(s * 0.42, s * 0.42, s * 0.42)); lips.add(m); }
        else { const gq2 = S._gq2 || (S._gq2 = new THREE.Quaternion()); S._e.set(0, by + 0.6, 0); gq2.setFromEuler(S._e); m.compose(inPan, gq2, S._s.set(s * 0.8, s * 0.8, s * 0.8)); gavels.add(m); }
        glowAt(S, end.x, end.y - 9 * s, end.z, 10 * s, [1, 0.85, 0.55], 0.35);
      }
    },
    jury(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.jury.add(m); },
    // the witness stand and its ring lights, all on
    stand(S, it, p, q, yaw) {
      const tripods = S.layers.tripod, rings = S.layers.ringLight;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.stand.add(m);
      for (const [x, z, turn] of [[-11, 6, 0.5], [10, 7, -0.5], [0, 13, 0]]) {
        const w = local(p, yaw, x * s, 0, z * s, S._o).clone(); S._e.set(0, yaw + Math.PI + turn, 0); const tq = (S._tq || (S._tq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, tq, S._s.set(s, s, s)); tripods.add(m); rings.add(m);
        glowAt(S, w.x, w.y + 18 * s, w.z, 9 * s, [1, 0.97, 0.92], 0.9);
      }
      poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, [1, 0.95, 0.9], 0.45);
    },
    column(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.column.add(m); },
    // the key: hanging on its hook, then thrown, end over end, away
    key(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, u = clamp((T - it.throwAt) / 1.6, 0, 1);
      const fy = S.floorFn ? S.floorFn(it.t, 0) : 0;
      if (u >= 1) { S.layers.key; return; }
      const w = local(p, h, (-6 + 70 * u) * (it.dir ?? 1), 0, 120 * u, S._o).clone(); w.y = fy + 26 + 40 * u - 46 * u * u;
      const e = S._ke || (S._ke = new THREE.Euler()); e.set(u * 14, h + Math.PI, 0.4 + u * 9); const kq = S._kq || (S._kq = new THREE.Quaternion()); kq.setFromEuler(e);
      const m = S._m, s = it.s ?? 1; m.compose(w, kq, S._s.set(s, s, s)); S.layers.key.add(m);
      glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.85, 0.5], 0.3);
    },
    // a dressing-room mirror on the wall, bulbs round it
    vanity(S, it, p, q, yaw) {
      const glass = S.layers.vanityGlass;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 18);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.vanityFrame.add(m); glass.add(m);
      // the bulbs: a pop on each "pretty", and in a final they chase round the frame on the beat
      const T = S.tNow ?? 0; let pop = 0;
      for (const tp of S.plan.ppgPretty || []) { const d = T - tp; if (d >= 0 && d < 0.32) pop = Math.max(pop, 1 - d / 0.32); }
      const sec = S.course.sectionAt(T), chase = sec.kind === 'final' || sec.kind === 'chorus', step = Math.floor(S.course.beatAt(T) * 2);
      for (let k = 0; k < 14; k++) { let x, y; if (k < 4) { x = -10.6; y = -12 + k * 8; } else if (k < 7) { x = -6 + (k - 4) * 6; y = 14.6; } else if (k < 11) { x = 10.6; y = 12 - (k - 7) * 8; } else { x = 6 - (k - 11) * 6; y = -14.6; } const w = local(p, yaw, x * s, y * s, 1 * s, S._o); glowAt(S, w.x, w.y, w.z, (1.8 + 1.6 * pop) * s, [1, 0.92, 0.75], 1.2 + 2.6 * pop * pop + (chase && (k + step) % 4 === 0 ? 1.5 : 0)); }
    },
    // her lawyer: the big mirror hung across the room, bulbs all round it
    lawyer(S, it, p) {
      const glass = S.layers.bigGlass;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._lq || (S._lq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 20);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.bigFrame.add(m); glass.add(m);
      const by = h + Math.PI;
      for (let k = 0; k < 30; k++) { let x, y; if (k < 10) { x = -19 + k * 4.2; y = 14.6; } else if (k < 20) { x = -19 + (k - 10) * 4.2; y = -14.6; } else if (k < 25) { x = -21.6; y = -10 + (k - 20) * 5; } else { x = 21.6; y = -10 + (k - 25) * 5; } const w = local(p, by, x * s, y * s, 1 * s, S._o); glowAt(S, w.x, w.y, w.z, 2 * s, [1, 0.92, 0.75], 1.3); }
    },
    // the hoodie in its bag, pinned up as evidence
    hoodie(S, it, p, q) {
      const bags = S.layers.bag, tags = S.layers.bagTag;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 18);
      const fq = faceRoad(S, it), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.hoodie.add(m); tags.add(m); bags.add(m);
      glowAt(S, p.x, p.y + 4 * s, p.z, 22 * s, [1, 0.95, 0.85], 0.3);
    },
    // receipts hanging down in long curls, every gift accounted for
    receipts(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, fy = S.floorFn ? S.floorFn(it.t, 0) : 0, m = S._m, e = S._re || (S._re = new THREE.Euler()), rq = S._rq || (S._rq = new THREE.Quaternion());
      const top = Math.max(fy + (it.top ?? 50), S.course.sample(it.t).y + 36);
      for (let k = 0; k < it.n; k++) {
        const x = it.xs[k], w = local(p, h, x, 0, it.zs[k], S._o); w.y = top;
        e.set(Math.sin(T * 0.9 + k) * 0.06, h + it.rs[k], Math.sin(T * 0.7 + k * 1.7) * 0.05); rq.setFromEuler(e);
        m.compose(w, rq, S._s.set(1.2, it.ls[k], 1.2)); S.layers.receipt.add(m);
      }
    },
    // the broken heart in a glass case
    heartCase(S, it, p, q, yaw) {
      const L = S.layers.heartL, Rh = S.layers.heartR, glass = S.layers.caseGlass;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.pedestal.add(m); glass.add(m);
      const T = S.tNow ?? 0, fq = faceRoad(S, it), by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5);
      for (const [layer, sd] of [[L, -1], [Rh, 1]]) {
        const w = local(p, by, sd * 0.5 * s, (20.5 + Math.sin(T * 1.3) * 0.3) * s, 0, S._o).clone();
        const e = S._he || (S._he = new THREE.Euler()); e.set(0, by, -sd * 0.12); const hq = S._hq || (S._hq = new THREE.Quaternion()); hq.setFromEuler(e);
        m.compose(w, hq, S._s.set(4 * s, 4 * s, 4 * s)); layer.add(m);
      }
      glowAt(S, p.x, p.y + 20 * s, p.z, 16 * s, [1, 0.3, 0.35], 0.6);
    },
    // red handprints and a swipe of paint on the wall
    paintDecal(S, it, p, q) {
      const hands = S.layers.hand, splats = S.layers.splat;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.y ?? 12);
      const m = S._m, s = it.s ?? 1, e = S._de || (S._de = new THREE.Euler()), dq = S._dq || (S._dq = new THREE.Quaternion());
      e.set(0, S.course.sample(it.t).yaw + (it.rot || 0), it.spin ?? 0); dq.setFromEuler(e);
      if (it.kind === 'splat') { m.compose(p, dq, S._s.set(12 * s, 12 * s, 1)); splats.add(m); }
      else { m.compose(p, dq, S._s.set(9 * s, 9 * s, 1)); hands.add(m); }
    },
    bucket(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bucket.add(m); },
    // a cell door slid open; on "lock me up" it slams shut
    cellDoor(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, u = clamp((T - it.shut) / 0.14, 0, 1), off = (1 - u * u) * 9.6 + (u >= 1 ? Math.max(0, Math.sin((T - it.shut - 0.14) * 30) * 0.4 * Math.exp(-(T - it.shut) * 7)) : 0);
      const w = local(p, yaw, -off * (it.x > 0 ? 1 : -1), 0, 0, S._o).clone();
      const m = S._m, s = it.s ?? 1; S._e.set(0, yaw + Math.PI / 2, 0); const cq = (S._cq || (S._cq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(w, cq, S._s.set(s, s, s)); S.layers.cellDoor.add(m);
    },
    // the cuffs on their cushion under a light, the arms clicking shut
    cuffs(S, it, p, q, yaw) {
      const rings = S.layers.cuffRing, arms = S.layers.cuffArm, chains = S.layers.chain;
      const m = S._m, s = it.s ?? 1, displays = S.layers.display;
      if (it.hang) { p.y = S.course.sample(it.t).y + (it.lift ?? 14) - 19.2 * s; local(p, 0, 0, 0, 0, S._o); }
      else { m.compose(p, q, S._s.set(s, s, s)); displays.add(m); }
      const T = S.tNow ?? 0, u = clamp((T - (it.click ?? 1e9)) / 0.12, 0, 1), open = 1.4 * (1 - u * u);
      const by = S.course.sample(it.t).yaw + Math.PI + (it.hang ? 0 : it.x > 0 ? -0.6 : 0.6);
      const e = S._ce || (S._ce = new THREE.Euler(0, 0, 0, 'YXZ')), cq = S._cq2 || (S._cq2 = new THREE.Quaternion());
      for (const sd of [-1, 1]) {
        const c = local(p, by, sd * 5.4 * s, 19.2 * s, 0, S._o).clone();
        e.set(0, by, sd * 0.15); cq.setFromEuler(e); m.compose(c, cq, S._s.set(s, s, s)); rings.add(m);
        e.set(0, by, sd * 0.15 + open * sd); cq.setFromEuler(e); m.compose(c, cq, S._s.set(s, s, s)); arms.add(m);
        for (let k = 0; k < 5; k++) { const a = k * 1.3 + T * 0.8 + sd; const g = local(c, by, Math.cos(a) * 4.2 * s, Math.sin(a) * 4.2 * s, 0.8 * s, S._o); glowAt(S, g.x, g.y, g.z, 1.3 * s, [1, 1, 1], 1.6 * Math.max(0, Math.sin(T * 6 + k * 2.1 + sd))); }
      }
      const ch = local(p, by, 0, 15.4 * s, 0, S._o).clone(); S._e.set(0, by, 0); cq.setFromEuler(S._e); m.compose(ch, cq, S._s.set(s, s, s)); chains.add(m);
      if (it.hang) { const top = local(p, by, 0, 15.4 * s, 0, S._o).clone(); S._e.set(0, by, Math.PI / 2); cq.setFromEuler(S._e); for (let k = 1; k <= 6; k++) { local(top, by, 0, k * 2.2 * s, 0, S._o); m.compose(S._o, cq, S._s.set(s, s, s)); chains.add(m); } glowAt(S, p.x, p.y + 19 * s, p.z, 20 * s, [1, 0.95, 0.9], 0.35); return; }
      glowAt(S, p.x, p.y + 30 * s, p.z, 26 * s, [1, 0.95, 0.85], 0.45);
      poolAt(S, p.x, p.y + 0.1, p.z, 34 * s, [1, 0.92, 0.8], 0.7);
    },
    // a placard on chains across the room, his words on it
    placard(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._pq || (S._pq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.placard.add(m); S.layers.placardFace.add(m, { aIdx: it.idx, aWake: [0.85, 0] });
      glowAt(S, p.x, p.y + 8 * s, p.z, 14 * s, [1, 0.9, 0.6], 0.3);
    },
    // the newspaper hung across, his words for its headline
    newspaper(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._nq || (S._nq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 24);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.paper.add(m); S.layers.newsFace.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
    },
    lipstickStand(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.pedestal.add(m); local(p, 0, 0, 15 * s, 0, S._o); m.compose(S._o, q, S._s.set(s * 1.1, s * 1.1, s * 1.1)); S.layers.courtLipstick.add(m); glowAt(S, p.x, p.y + 26 * s, p.z, 16 * s, [1, 0.3, 0.35], 0.5); },
  },
  kits: {
    judgeBench(S, z) { for (const [t, x, judge] of z.at) S.items.push(onGround(S, { t, x, rot: Math.PI, s: z.s ?? 1, judge, strikes: z.strikes, parts: 'judgeBench', ahead: z.ahead })); },
    scales(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, tips: z.tips, parts: 'scales', ahead: z.ahead ?? 40 }); },
    jury(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'jury', ahead: z.ahead })); },
    stand(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'stand', ahead: z.ahead })); },
    columns(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 42), rot: 0, s: z.s ?? 1, parts: 'column', ahead: z.ahead })); },
    key(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, throwAt: z.throwAt, dir: z.dir, parts: 'key', ahead: z.ahead ?? 30 }); },
    vanities(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.8) { const side = k++ % 2 ? 1 : -1; S.items.push(onGround(S, { t, x: side * (z.x ?? 37), rot: SIDE(side), s: z.s ?? 1, y: z.y, parts: 'vanity', ahead: z.ahead })); } },
    lawyer(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'lawyer', ahead: z.ahead ?? 40 }); },
    hoodie(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, s: z.s ?? 1.3, y: z.y, parts: 'hoodie', ahead: z.ahead })); },
    receipts(S, z, R) {
      prepare(S.course, S.plan);
      for (const t of [].concat(z.at)) { const n = z.n ?? 26, xs = [], zs = [], rs = [], ls = []; for (let k = 0; k < n; k++) { const sd = k % 2 ? 1 : -1; xs.push(sd * (9 + R() * 36)); zs.push((R() - 0.5) * 30); rs.push((R() - 0.5) * 1.2); ls.push(0.6 + R() * 0.7); } S.items.push({ t, x: 0, rot: 0, n, xs, zs, rs, ls, top: z.top, parts: 'receipts', ahead: z.ahead ?? 30 }); }
    },
    heartCase(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.2, parts: 'heartCase', ahead: z.ahead })); },
    paintDecals(S, z, R) { for (const [t, x, kind, y, s] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x), kind, y, s, spin: (R() - 0.5) * 0.6, parts: 'paintDecal', ahead: z.ahead })); },
    buckets(S, z, R) { for (const [t, x] of z.at) S.items.push(onGround(S, { t, x, rot: R() * 6, s: z.s ?? 1.6, parts: 'bucket', ahead: z.ahead })); },
    cellDoors(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.45) { const side = k % 2 ? 1 : -1; S.items.push(onGround(S, { t, x: side * (z.x ?? 33), rot: SIDE(side), s: z.s ?? 1, shut: (z.shut ?? 0) + Math.floor(k / 2) * (z.gap ?? 0.1), parts: 'cellDoor', ahead: z.ahead })); k++; } },
    cuffs(S, z) { if (z.hang) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1.4, click: z.click, hang: true, lift: z.lift, parts: 'cuffs', ahead: z.ahead ?? 30 }); return; } S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.4, click: z.click, parts: 'cuffs', ahead: z.ahead })); },
    standLipstick(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1.4, parts: 'lipstickStand', ahead: z.ahead })); },
  },
});

function faceRoad(S, it) { const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); return (S._fq || (S._fq = new THREE.Quaternion())).setFromEuler(S._e); }

// ---------- the rooms ----------
const flat = (W = 60, H = 50) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const COURT = {
  rings: { flat },
  ringOf: () => 'flat',
  styles: { court: 0, hall: 1, evidence: 2, cells: 3, mirror: 4 },
  dims: { court: [56, 48], hall: [50, 52], evidence: [44, 40], cells: [38, 30], mirror: [46, 44] },
  lights: (id) => ({ 0: [28, 14], 1: [30, 15], 2: [18, 9], 3: [16, 8], 4: [26, 13] }[id] || null),
};

function courtMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffd8a0) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() }, uRed: { value: 0 }, uCold: { value: 0 }, uGlitch: { value: 0 }, uPulse: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uRed, uCold, uGlitch, uPulse;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // marble: white, grey veins running through it
      vec3 marble(vec2 q, vec3 base){ float v = n2(q * 0.08) * 0.6 + n2(q * 0.21) * 0.3 + n2(q * 0.6) * 0.1; float vein = smoothstep(0.035, 0.0, abs(fract(v * 4.0 + q.x * 0.01) - 0.5) - 0.44); return base * (0.92 + 0.08 * n2(q * 0.4)) - vec3(0.22) * vein; }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool onWall = part == 1 || part == 2 || part == 6;
        // "I'm the glitch in your game": bands of the wall jump sideways, a few frames at a time
        float gb = floor(h * 0.22), gf = floor(uTime * 18.0), gr = h2(vec2(gb, gf));
        if (uGlitch > 0.001 && onWall) wa += step(1.0 - 0.5 * uGlitch, gr) * (h2(vec2(gb + 7.0, gf)) - 0.5) * 70.0;
        vec2 fx = st < 0.5 ? vec2(28.0, 14.0) : st < 1.5 ? vec2(30.0, 15.0) : st < 2.5 ? vec2(18.0, 9.0) : st < 3.5 ? vec2(16.0, 8.0) : vec2(26.0, 13.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.62 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        vec3 col;
        if (part == 8) { col = st < 0.5 ? vec3(0.32, 0.18, 0.09) : vec3(0.85, 0.7, 0.4); }
        else if (st < 0.5) {
          // the courtroom: walnut panels to the rail, cream plaster with tall windows, a coffered ceiling, red carpet
          if (part == 0) { vec2 q = vec2(x, along) / 3.0; col = vec3(0.42, 0.06, 0.08) * (0.85 + 0.15 * aaSq(q.x + q.y) * aaSq(q.x - q.y + 0.5)); col = mix(col, vec3(0.75, 0.6, 0.3), step(abs(abs(x) - 9.0), 0.4)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 10.0); col = mix(vec3(0.9, 0.86, 0.76), vec3(0.62, 0.56, 0.44), 1.0 - edge(q, 0.12)); col = mix(col, vec3(0.8, 0.66, 0.36), step(abs(edge(q, 0.12) - 0.5), 0.04)); }
          else if (h < 14.0) {
            float px = fract(wa / 7.0), py = fract(h / 7.0);
            col = vec3(0.3, 0.16, 0.08) * (0.85 + 0.15 * n2(vec2(wa * 0.5, h * 4.0)));
            col *= 0.75 + 0.25 * (1.0 - edge(vec2(px, py), 0.1)) + 0.15 * step(0.18, min(min(px, 1.0 - px), min(py, 1.0 - py)));
            col = mix(col, vec3(0.6, 0.45, 0.22), step(abs(h - 13.7), 0.3));
          } else {
            col = vec3(0.86, 0.8, 0.68) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.1));
            float wx = mod(wa, 22.0) - 11.0;
            float arch = h > 34.0 ? length(vec2(wx, h - 34.0)) - 6.0 : abs(wx) - 6.0;
            if (part != 6 && h > 18.0 && h < 41.0) { col = mix(col, vec3(0.75, 0.62, 0.36), step(arch, 0.8)); col = mix(col, mix(uSkyLow, uSkyTop, (h - 18.0) / 23.0) * (0.75 + 0.25 * aaSq(h * 0.6)), step(arch, 0.0)); }
            col = mix(col, vec3(0.7, 0.58, 0.34), step(abs(h - 44.0), 1.0));
          }
        } else if (st < 1.5) {
          // the marble hall: white marble, pilasters, a gold frieze; the floor in black and white squares
          if (part == 0) { vec2 q = vec2(x, along) / 8.0; float c = aaChk(q); col = mix(marble(vec2(x, along), vec3(0.92, 0.9, 0.86)), marble(vec2(x, along) + 40.0, vec3(0.16, 0.15, 0.16)), c) * (0.8 + 0.2 * edge(fract(q), 0.02)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 12.0); col = mix(vec3(0.95, 0.92, 0.85), vec3(0.85, 0.68, 0.32), 1.0 - edge(q, 0.1)); }
          else {
            col = marble(vec2(wa, h), vec3(0.93, 0.91, 0.87));
            float px = mod(wa, 16.0) - 8.0;
            col = mix(col, marble(vec2(wa, h) + 9.0, vec3(0.98, 0.96, 0.92)) * 1.04, step(abs(px), 2.2) * (part == 6 ? 0.0 : 1.0));
            col = mix(col, vec3(0.85, 0.68, 0.32), step(abs(h - 36.0), 1.6) + step(h, 1.4));
            col = mix(col, vec3(0.6, 0.48, 0.24), step(abs(h - 36.0), 0.3));
          }
        } else if (st < 2.5) {
          // the evidence room: steel shelving full of boxes, concrete, a fluorescent hum
          if (part == 0) { col = vec3(0.36, 0.36, 0.37) * (0.85 + 0.2 * n2(vec2(x, along) * 0.1)); col = mix(col, vec3(0.92, 0.75, 0.12), step(abs(abs(x) - 24.0), 0.4)); }
          else if (part == 3) { col = vec3(0.12, 0.12, 0.13); col = mix(col, vec3(1.6, 1.65, 1.6), step(abs(abs(x) - 10.0), 0.6) * step(abs(dl), 6.0)); }
          else {
            float sy = fract(h / 7.0), sid = floor(h / 7.0);
            col = vec3(0.16, 0.17, 0.19);
            float bw = 3.0 + 3.0 * h2(vec2(floor(wa / 6.0), sid)), bx = mod(wa, 6.0);
            float boxk = step(0.14, sy) * step(sy, 0.62 + 0.3 * h2(vec2(floor(wa / 6.0), sid + 7.0))) * step(bx, bw) * step(0.5, h2(vec2(floor(wa / 6.0) + 3.0, sid)) + 0.3);
            col = mix(col, vec3(0.62, 0.48, 0.3) * (0.8 + 0.3 * h2(vec2(floor(wa / 6.0), sid + 1.0))), boxk);
            col = mix(col, vec3(0.9, 0.88, 0.82), boxk * step(abs(sy - 0.32), 0.04) * step(abs(bx - bw * 0.5), 0.8));
            col = mix(col, vec3(0.5, 0.52, 0.56), step(sy, 0.08));
            col = mix(col, vec3(0.42, 0.44, 0.48), step(abs(mod(wa, 24.0) - 12.0), 0.25));
            if (h > 35.0) col = vec3(0.3, 0.3, 0.31);
          }
        } else if (st < 3.5) {
          // the cells: bars all down both sides, the cells dim behind them; concrete
          if (part == 0) { col = vec3(0.38, 0.38, 0.4) * (0.85 + 0.2 * n2(vec2(x, along) * 0.12)); col *= 0.9 + 0.1 * step(0.02, fract(along / 8.0)); }
          else if (part == 3) { col = vec3(0.16, 0.16, 0.17); }
          else if (h < 22.0 && part != 6) {
            float cx = mod(wa, 12.0);
            col = vec3(0.12, 0.12, 0.14) * (0.7 + 0.3 * smoothstep(22.0, 0.0, h));
            col = mix(col, vec3(0.3, 0.3, 0.32), step(abs(h - 7.0), 0.6) * step(1.5, cx) * step(cx, 9.0));
            float bar = step(abs(fract(wa / 1.2) - 0.5), 0.13);
            col = mix(col, vec3(0.42, 0.44, 0.5), bar);
            col = mix(col, vec3(0.45, 0.46, 0.5), step(cx, 0.9) + step(abs(h - 21.0), 0.6));
          } else { col = vec3(0.5, 0.5, 0.52) * (0.85 + 0.15 * n2(vec2(wa, h) * 0.2)); col = mix(col, vec3(0.75, 0.62, 0.14), step(abs(h - 25.0), 0.8)); }
        } else {
          // the room of mirrors: tall glass in gold frames, pink marble underfoot, gold above
          if (part == 0) { col = marble(vec2(x, along), vec3(0.95, 0.72, 0.76)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 9.0); col = mix(vec3(0.95, 0.85, 0.6), vec3(0.72, 0.52, 0.22), 1.0 - edge(q, 0.15)); }
          else {
            float mx = mod(wa, 14.0) - 7.0;
            col = vec3(0.85, 0.66, 0.3);
            if (part != 6 && abs(mx) < 5.6 && h > 3.0 && h < 38.0) {
              float sheen = 0.7 + 0.8 * smoothstep(0.75, 1.0, sin(wa * 0.35 + h * 0.18 + uTime * 0.3));
              col = mix(vec3(0.22, 0.24, 0.3), vec3(0.5, 0.52, 0.6), (h - 3.0) / 35.0) * sheen;
              col = mix(col, uWarm * 0.5, 0.2 * n2(vec2(wa * 0.2, h * 0.1)));
            }
            if (part == 6) col = marble(vec2(wa, h), vec3(0.95, 0.8, 0.82));
          }
        }
        // in a chorus the whole room breathes with the beat
        col *= lightK * uLight * (1.0 + 0.24 * uPulse);
        if (uGlitch > 0.001 && onWall) { float g2 = h2(vec2(gb + 3.0, gf + 11.0)); if (g2 < 0.3 * uGlitch) col = vec3(col.b, col.r * 0.6, col.g) * 1.7; else if (g2 > 1.0 - 0.12 * uGlitch) col *= 0.12; }
        // red-handed: the hall going red
        col = mix(col, col * vec3(1.15, 0.45, 0.45), uRed * 0.6);
        // "let the cold bite deep": frost creeping in
        if (uCold > 0.001) { float fr = n2(vec2(wa, h) * 0.6) * 0.5 + n2(vec2(wa, h) * 2.3) * 0.5; col = mix(col, vec3(0.55, 0.7, 0.86) * (0.6 + 0.4 * fr), uCold * (onWall ? 0.8 * smoothstep(0.4, 0.8, fr + 0.25 * smoothstep(20.0, 0.0, h)) : 0.3)); }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: out the front doors into the press, her monument in the square (ppg-finale.js) ----------
export { PpgMonument as LipstickFinale } from './ppg-finale.js';

// ---------- the courthouse, per frame ----------
export class CourtWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = courtMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, COURT));
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
    // the front page over the courtroom doors, and the pages the press leaves after it
    const np = S.plan.ppgPaper;
    if (np) { this.paper = new PpgPaper(scene, S, np); if (np.pages) this.pages = new PpgPages(scene, S, { text: np.text, deck: np.deck, windows: np.pages }); }
    if (S.plan.ppgBoards) this.boards = new PpgBoards(scene, S, S.plan.ppgBoards);
    this.press = new PpgPress(scene, S, S.plan.ppgPress || {});
    if (S.plan.ppgOutside) this.outside = new PpgOutside(scene, S, S.plan.ppgOutside);
  }
  update(S, dt, camera, time) {
    if (this.paper) this.paper.update(S, dt, camera, time);
    if (this.pages) this.pages.update(S);
    if (this.boards) this.boards.update(S);
    this.press.update(S);
    if (this.outside) this.outside.update(S, dt, camera);
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffd8a0);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    const one = (w) => smooth(w[0] - (w[2] ?? 0.1), w[0], t) * (1 - smooth(w[1], w[1] + (w[3] ?? 0.5), t));
    const win = (w) => (!w ? 0 : Array.isArray(w[0]) ? Math.max(...w.map(one)) : one(w));
    u.uRed.value = win(ev.red); u.uCold.value = win(ev.cold); u.uGlitch.value = win(ev.glitch);
    u.uPulse.value = (S.lift ? S.lift.k : 0) * (S.town.beat || 0);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
  }
  // what hangs in each room: globes in the courtroom, chandeliers in the halls, tubes, cages
  draw(T) {
    // the press: flashbulbs down the gallery in every chorus
    this.press.draw(T);
    const g = this._g || (this._g = new THREE.Vector3()), lamp = col(this.S.P.lamp ?? 0xffd8a0);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 0) { for (const x of [-16, 16]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 9, g.z, 9, lamp, 0.85); } }
        else if (r.style === 1 || r.style === 4) { this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 7, g.z, 20, lamp, 0.7); for (let k = 0; k < 8; k++) { const a = k * 0.785; T.glow(g.x + Math.cos(a) * 5, fy + r.H - 8.5, g.z + Math.sin(a) * 5, 2.4, lamp, 1.1); } }
        else if (r.style === 2) { for (const x of [-10, 10]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1, g.z, 7, [0.9, 1, 0.95], 0.6); } }
        else { this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 2, g.z, 6, [1, 0.95, 0.8], 0.8); }
        this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 44, lamp, 0.3);
      }
    }
  }
}
