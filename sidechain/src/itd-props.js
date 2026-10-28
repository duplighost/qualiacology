// Isn't That the Dream: the things in his house and in the little graveyard he keeps. She rides through
// his house like something small that lives in it, so the house's things are huge (the coat on its
// stand as tall as the hall); the graveyard's stones are a few metres, there are just a lot of them.
// Geometry only, vertex-coloured; the lights are glows the world draws, and the pictures (the stones'
// carving, the name sticker, the patch notes, the puzzle, the box's label, the clock's face, the
// phone's screen) are canvases made here. itd-world.js puts them in the place; the pickup, a tealight,
// is at the bottom (feedback.js reads `pickup`).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
export const paintRGB = (g, c) => paint(g, c);
export const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 9) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a square-section piece from one point to another
export function beam(a, b, w, d = w) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// a flat panel whose uvs run 0..1 over it, its front to +z
function panel(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); return g; }
// a rounded rectangle as a shape, centred
function roundRect(w, h, r) {
  const s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
// uvs 0..1 over a geometry's x/y bounds (for a shape whose face shows a picture)
function planarUV(g) {
  g.computeBoundingBox(); const b = g.boundingBox, P = g.attributes.position, n = P.count, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { uv[i * 2] = (P.getX(i) - b.min.x) / (b.max.x - b.min.x); uv[i * 2 + 1] = (P.getY(i) - b.min.y) / (b.max.y - b.min.y); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}

export const STONE = rgb(0x8c8882), CAMEL = rgb(0xb8865a), CAMEL_D = rgb(0x7e5434), WOOD = rgb(0x5a3620), WOOD_L = rgb(0x9a6a40), BRASS = rgb(0xd0a850),
  IRON = rgb(0x18181c), WHITE = rgb(0xf2eee6), CREAM = rgb(0xe6dac2), BLACK = rgb(0x0e0e12), CARD = rgb(0xb48652), CARD_D = rgb(0x8a6034), TAPE = rgb(0xd2b482),
  YEW = rgb(0x163222), YEW_D = rgb(0x0e2016), RED = rgb(0xb81c2c), PINK = rgb(0xf0a8bc), GUM = rgb(0xe86a8a), ORANGE = rgb(0xf08a2a), SILVER = rgb(0xb4b8c0),
  GREY = rgb(0x5a5a62), GREEN = rgb(0x2a6a3a), CLOTH = rgb(0xf4f0ea), SAGE = rgb(0x9aae98), FABRIC = rgb(0x3a3a42);

// ---------- the pictures ----------
const SERIF = 'Georgia, "Times New Roman", serif';
// the stones' carving: each cell the same grin over a different number (the names he gave them)
// (white where it's cut, on black; the stone shader darkens what's cut and lights it when it wakes)
export const VERSIONS = ['1.0', '1.1', '1.2', '2.0', '2.1', '2.5', '3.0', '3.1', '3.5', '4.0', '4.1', '4.5', '5.0', '5.1', '5.5', '6.0'];
export function engraveTexture() {
  return canvasTex(1024, 1536, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cw = W / 4, ch = H / 4;
    VERSIONS.forEach((v, i) => {
      const x = (i % 4) * cw, y = Math.floor(i / 4) * ch;
      g.save(); g.translate(x + cw / 2, y); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
      // the grin: two eyes and the smile, the same on every one
      g.beginPath(); g.arc(-34, 112, 13, 0, Math.PI * 2); g.arc(34, 112, 13, 0, Math.PI * 2); g.fill();
      g.lineWidth = 15; g.beginPath(); g.arc(0, 128, 62, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke();
      // a rule, and the number
      g.lineWidth = 5; g.beginPath(); g.moveTo(-66, 236); g.lineTo(66, 236); g.stroke();
      g.font = `700 74px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, 0, 296);
      g.restore();
    });
  });
}
// HELLO my name is: every name before crossed out, the newest scrawled in over them
export function helloTexture() {
  return canvasTex(1024, 720, (g, W, H) => {
    const r = 70;
    g.fillStyle = '#d8202e'; g.beginPath(); g.roundRect(0, 0, W, H, r); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 150px "Arial Black", Impact, sans-serif'; g.fillText('HELLO', W / 2, 110);
    g.font = '700 58px "Arial", sans-serif'; g.fillText('my name is', W / 2, 212);
    g.fillStyle = '#fbfaf6'; g.beginPath(); g.roundRect(48, 266, W - 96, H - 316, 22); g.fill();
    // the old names: scribbles in pen, each struck through (no letters: the song never says them)
    const R = seeded(7);
    const scrawl = (x0, y0, w, h, col, lw) => {
      g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0);
      for (let x = x0; x < x0 + w; x += 14 + R() * 10) g.quadraticCurveTo(x + 6, y0 - h * (0.4 + R() * 0.8), x + 12 + R() * 8, y0 + (R() - 0.5) * h * 0.6);
      g.stroke();
    };
    const rows = [[120, 330, 520], [520, 330, 380], [140, 420, 400], [600, 420, 300]];
    for (const [x, y, w] of rows) { scrawl(x, y, w, 40, '#2a3a6a', 7); g.strokeStyle = '#1a1a22'; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 10, y + 2); g.lineTo(x + w + 6, y - 6); g.stroke(); }
    // the newest, bigger, not crossed out
    scrawl(160, 560, 700, 70, '#14141c', 12);
  });
}
// the patch notes, set out like an order of service
export function patchTexture() {
  return canvasTex(768, 1024, (g, W, H) => {
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1a1a1e'; g.lineWidth = 6; g.strokeRect(26, 26, W - 52, H - 52); g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 80);
    // the black band across the corner
    g.save(); g.translate(W, 0); g.rotate(Math.PI / 4); g.fillStyle = '#121216'; g.fillRect(-150, 70, 300, 52); g.restore();
    g.fillStyle = '#1a1a1e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 44px ${SERIF}`; g.fillText('in loving memory', W / 2, 128);
    g.font = `700 92px ${SERIF}`; g.fillText('PATCH NOTES', W / 2, 220);
    g.lineWidth = 3; g.beginPath(); g.moveTo(140, 284); g.lineTo(W - 140, 284); g.stroke();
    const items = [['+', 'warmer'], ['+', 'same grin'], ['+', 'all his jokes'], ['+', 'remembers your habits'], ['–', 'grief']];
    g.textAlign = 'left'; g.font = `400 50px ${SERIF}`;
    items.forEach(([m, s], i) => { const y = 380 + i * 104; g.font = `700 54px ${SERIF}`; g.fillText(m, 110, y); g.font = `400 50px ${SERIF}`; g.fillText(s, 170, y); });
    // the last one, struck
    g.lineWidth = 5; g.beginPath(); g.moveTo(160, 380 + 4 * 104); g.lineTo(330, 380 + 4 * 104 - 4); g.stroke();
    g.textAlign = 'center'; g.font = `italic 34px ${SERIF}`; g.fillText('the changes look great', W / 2, H - 92);
  });
}
// the jigsaw on the wall: a dawn over a roof, one piece missing
export function puzzleTexture() {
  return canvasTex(1024, 704, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#3a4a8a'); sky.addColorStop(0.55, '#f0a090'); sky.addColorStop(1, '#ffd8a0');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe8b0'; g.beginPath(); g.arc(W * 0.66, H * 0.62, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2236'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.72); g.lineTo(W * 0.22, H * 0.5); g.lineTo(W * 0.44, H * 0.72); g.lineTo(W * 0.44, H); g.fill();
    g.fillStyle = '#ffd070'; g.fillRect(W * 0.2, H * 0.74, 44, 50);
    g.fillStyle = '#1e1a28'; g.fillRect(0, H * 0.9, W, H * 0.1);
    // the cuts: a grid of pieces, each edge with its knob
    const cols = 8, rows = 5, pw = W / cols, ph = H / rows;
    g.strokeStyle = 'rgba(20,16,24,0.55)'; g.lineWidth = 3;
    const R = seeded(3);
    for (let i = 1; i < cols; i++) { const x = i * pw; g.beginPath(); for (let j = 0; j < rows; j++) { const y0 = j * ph, s = R() < 0.5 ? -1 : 1; g.moveTo(x, y0); g.lineTo(x, y0 + ph * 0.38); g.bezierCurveTo(x + s * pw * 0.28, y0 + ph * 0.25, x + s * pw * 0.28, y0 + ph * 0.75, x, y0 + ph * 0.62); g.lineTo(x, y0 + ph); } g.stroke(); }
    for (let j = 1; j < rows; j++) { const y = j * ph; g.beginPath(); for (let i = 0; i < cols; i++) { const x0 = i * pw, s = R() < 0.5 ? -1 : 1; g.moveTo(x0, y); g.lineTo(x0 + pw * 0.38, y); g.bezierCurveTo(x0 + pw * 0.25, y + s * ph * 0.28, x0 + pw * 0.75, y + s * ph * 0.28, x0 + pw * 0.62, y); g.lineTo(x0 + pw, y); } g.stroke(); }
    // the one left out: where the heart of it was
    const x0 = pw * 4, y0 = ph * 2;
    g.fillStyle = '#060508'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + pw * 0.38, y0); g.bezierCurveTo(x0 + pw * 0.25, y0 - ph * 0.28, x0 + pw * 0.75, y0 - ph * 0.28, x0 + pw * 0.62, y0); g.lineTo(x0 + pw, y0);
    g.lineTo(x0 + pw, y0 + ph * 0.38); g.bezierCurveTo(x0 + pw * 1.28, y0 + ph * 0.25, x0 + pw * 1.28, y0 + ph * 0.75, x0 + pw, y0 + ph * 0.62); g.lineTo(x0 + pw, y0 + ph);
    g.lineTo(x0 + pw * 0.62, y0 + ph); g.bezierCurveTo(x0 + pw * 0.75, y0 + ph * 1.28, x0 + pw * 0.25, y0 + ph * 1.28, x0 + pw * 0.38, y0 + ph); g.lineTo(x0, y0 + ph);
    g.lineTo(x0, y0 + ph * 0.62); g.bezierCurveTo(x0 + pw * 0.28, y0 + ph * 0.75, x0 + pw * 0.28, y0 + ph * 0.25, x0, y0 + ph * 0.38); g.closePath(); g.fill();
  });
}
// the box's label
export function labelTexture() {
  return canvasTex(768, 512, (g, W, H) => {
    g.fillStyle = '#f8f6ef'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#18181c'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#18181c'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = '900 34px "Arial", sans-serif'; g.fillText('CONTENTS:', 48, 70);
    g.font = '900 80px "Arial Black", Impact, sans-serif'; g.fillText('REPLACEMENT', 44, 160, W - 88);
    g.font = '700 38px "Arial", sans-serif'; g.fillText('FRAGILE  ·  THIS SIDE UP', 48, 250);
    for (let i = 0; i < 46; i++) { const w = [3, 5, 8, 3, 12][i % 5]; g.fillRect(48 + i * 14.5, 320, w, 130); }
  });
}
// the clock's face: midnight, or near it (the hands are their own pieces)
export function clockTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#efe6d2'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2018'; g.lineWidth = 10; g.stroke();
    g.fillStyle = '#2a2018'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 54px ${SERIF}`;
    const N = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    N.forEach((n, i) => { const a = i / 12 * Math.PI * 2; g.save(); g.translate(256 + Math.sin(a) * 196, 256 - Math.cos(a) * 196); g.rotate(a); g.fillText(n, 0, 0); g.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236); g.lineTo(256 + Math.sin(a) * (i % 5 ? 226 : 218), 256 - Math.cos(a) * (i % 5 ? 226 : 218)); g.stroke(); }
  });
}
// the phone's screen at the end: the grin, and what it says
export function screenTexture() {
  return canvasTex(512, 1024, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a1438'); bg.addColorStop(0.6, '#3a2050'); bg.addColorStop(1, '#ff9a7a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff6ee'; g.strokeStyle = '#fff6ee'; g.lineCap = 'round';
    g.beginPath(); g.arc(W / 2 - 70, 380, 26, 0, Math.PI * 2); g.arc(W / 2 + 70, 380, 26, 0, Math.PI * 2); g.fill();
    g.lineWidth = 26; g.beginPath(); g.arc(W / 2, 410, 124, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 54px "Arial", sans-serif';
    g.fillText('see you', W / 2, 690); g.fillText('tomorrow', W / 2, 756);
    g.font = '400 30px "Arial", sans-serif'; g.globalAlpha = 0.7; g.fillText('I’ll be right here', W / 2, 850);
  });
}

// ---------- the pieces ----------
export const PROP = {
  // a little headstone, rounded at the top, its face to +z (the stone shader carves it from the local
  // position: the face is x -1.2..1.2, y 0..3.6 at z > 0.25)
  stone() {
    const s = new THREE.Shape(); s.moveTo(-1.2, 0); s.lineTo(1.2, 0); s.lineTo(1.2, 2.4); s.absarc(0, 2.4, 1.2, 0, Math.PI, false); s.lineTo(-1.2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, -0.25);
    const base = new THREE.BoxGeometry(3.0, 0.4, 1.1); base.translate(0, -0.06, 0);
    const out = merge([g, base]); out.computeVertexNormals();
    return out;
  },
  // a tealight at a stone's foot (the flame is the world's glow)
  tealight() {
    return merge([paint(cyl(0.36, 0.33, 0.24, 12, 0, 0.12, 0), SILVER), paint(cyl(0.32, 0.32, 0.03, 12, 0, 0.23, 0), rgb(0xece2cc)), paint(cyl(0.025, 0.025, 0.12, 4, 0, 0.3, 0), BLACK)]);
  },
  // flowers left at a stone, lying in their paper
  flowers() {
    const parts = [];
    const wrap = new THREE.ConeGeometry(0.7, 2.2, 8, 1, true); wrap.rotateZ(Math.PI / 2 + 0.15); wrap.translate(0.3, 0.45, 0.2); parts.push(paint(wrap, rgb(0xf4ecdc)));
    const R = seeded(5), cols = [rgb(0xe82a4a), rgb(0xffffff), rgb(0xf8a8c8), rgb(0xffd060)];
    for (let k = 0; k < 7; k++) parts.push(paint(sph(0.32 + R() * 0.12, 1, 0.8, 1, -0.9 - R() * 0.5, 0.5 + R() * 0.5, 0.2 + (R() - 0.5) * 1.0, 8, 6), cols[k % cols.length]));
    for (let k = 0; k < 4; k++) parts.push(paint(sph(0.2, 1.6, 0.4, 0.8, -0.6 - R() * 0.4, 0.45 + R() * 0.3, (R() - 0.5) * 1.1, 6, 4), GREEN));
    return merge(parts);
  },
  // a yew, dark and narrow
  yew() {
    const R = seeded(11);
    const c = new THREE.ConeGeometry(3.4, 14, 9, 4); const P = c.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 6.9) continue; const k = 1 + (R() - 0.5) * 0.28; P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k); }
    c.translate(0, 8.4, 0); c.computeVertexNormals();
    return merge([paint(c, YEW), paint(cyl(0.4, 0.55, 1.6, 6, 0, 0.8, 0), WOOD)]);
  },
  // a length of iron fence, 8 m, spear-topped
  fence() {
    const parts = [];
    for (const y of [1.2, 4.2]) parts.push(box(8, 0.16, 0.16, 0, y, 0));
    for (let k = 0; k < 11; k++) { const x = -4 + k * 0.8; parts.push(cyl(0.07, 0.07, 5.2, 4, x, 2.6, 0), cyl(0, 0.16, 0.5, 4, x, 5.4, 0)); }
    parts.push(box(0.4, 6.2, 0.4, -4, 3.1, 0), cyl(0.3, 0.3, 0.3, 6, -4, 6.35, 0));
    return paint(merge(parts), IRON);
  },
  // the graveyard's way in: two stone piers, the iron arch over the road, the gates open
  gate() {
    const parts = [];
    for (const x of [-15, 15]) { parts.push(paint(box(3.6, 16, 3.6, x, 8, 0), rgb(0x6a6660)), paint(box(4.4, 1.0, 4.4, x, 16.5, 0), rgb(0x7a766e)), paint(sph(1.4, 1, 1, 1, x, 18.2, 0, 10, 8), rgb(0x7a766e))); }
    const arch = new THREE.TorusGeometry(15, 0.32, 5, 28, Math.PI); arch.translate(0, 16, 0); parts.push(paint(arch, IRON));
    const arch2 = new THREE.TorusGeometry(13.6, 0.22, 5, 28, Math.PI); arch2.translate(0, 16, 0); parts.push(paint(arch2, IRON));
    for (let k = 1; k < 12; k++) { const a = k / 12 * Math.PI; parts.push(paint(beam([Math.cos(a) * 13.6, 16 + Math.sin(a) * 13.6, 0], [Math.cos(a) * 15, 16 + Math.sin(a) * 15, 0], 0.18), IRON)); }
    // the gates, swung back against the piers
    for (const sx of [-1, 1]) {
      const leaf = [];
      for (let k = 0; k < 9; k++) leaf.push(cyl(0.09, 0.09, 13, 4, k * 1.1, 6.5, 0), cyl(0, 0.2, 0.6, 4, k * 1.1, 13.3, 0));
      for (const y of [1.5, 7, 12.3]) leaf.push(box(9.6, 0.2, 0.2, 4.4, y, 0));
      const g = paint(merge(leaf), IRON); g.rotateY(sx > 0 ? -1.25 : Math.PI + 1.25); g.translate(sx * 13.2, 0, 1.8); parts.push(g);
    }
    return merge(parts);
  },
  // a lantern on its post along the paths
  lantern() {
    return merge([paint(cyl(0.18, 0.24, 7, 6, 0, 3.5, 0), IRON), paint(box(1.1, 1.5, 1.1, 0, 7.6, 0), rgb(0x2a2a30)), paint(cyl(0, 0.9, 0.7, 4, 0, 8.7, 0), IRON)]);
  },

  // ---------- the house ----------
  // the hall stand, and his coat on it (the coat is the rider's colour: the one she's wearing now)
  coatStand() {
    const parts = [];
    parts.push(paint(cyl(0.55, 0.7, 30, 10, 0, 15, 0), WOOD));
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; parts.push(paint(beam([0, 2.2, 0], [Math.cos(a) * 4.2, 0.2, Math.sin(a) * 4.2], 0.45), WOOD)); }
    parts.push(paint(sph(0.9, 1, 1, 1, 0, 30.3, 0, 10, 8), BRASS));
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; parts.push(paint(beam([0, 28.2, 0], [Math.cos(a) * 2.2, 29.8, Math.sin(a) * 2.2], 0.32), BRASS)); }
    // the coat, on its hanger off the front hook
    const coat = [];
    const body = lathe([[0.01, 0], [4.4, 0], [4.1, 6], [3.6, 11], [3.3, 13.4], [2.0, 14.6], [0.8, 15.0], [0.01, 15.1]], 18); body.scale(1, 1, 0.55);
    coat.push(paint(body, CAMEL));
    for (const s of [-1, 1]) {
      coat.push(paint(sph(1.5, 1, 0.8, 0.9, s * 2.9, 13.9, 0, 10, 8), CAMEL));
      const sl = cyl(0.95, 1.2, 9.5, 8, 0, 0, 0); sl.rotateZ(s * 0.12); sl.rotateX(-0.12); sl.translate(s * 3.7, 9.2, 0.5); coat.push(paint(sl, CAMEL_D));
      coat.push(paint(beam([s * 0.4, 14.9, 2.0], [s * 1.9, 10.8, 2.25], 1.1, 0.25), CAMEL_D));
    }
    for (let k = 0; k < 4; k++) coat.push(paint(sph(0.26, 1, 1, 0.5, 0.75, 9.6 - k * 1.9, 2.35, 6, 4), BLACK));
    coat.push(paint(box(0.25, 15, 0.1, 0, 7.5, 2.42), CAMEL_D));
    coat.push(paint(box(6.6, 0.45, 0.6, 0, 15.2, 0), WOOD_L), paint(cyl(0.1, 0.1, 1.6, 4, 0, 16.1, 0), SILVER));
    const cg = merge(coat); cg.translate(0, 11.6, 2.4);
    parts.push(cg);
    return merge(parts);
  },
  // a spiral stair to the floor above
  spiral() {
    const parts = [paint(cyl(1.2, 1.2, 36, 12, 0, 18, 0), WHITE)];
    const N = 40;
    for (let k = 0; k < N; k++) {
      const a = k / 14 * Math.PI * 2, y = 1 + k * 0.86;
      const st = box(7.4, 0.5, 2.6, 4.6, y, 0); st.rotateY(-a); parts.push(paint(st, WOOD_L));
      const bx = Math.cos(a) * 8.0, bz = Math.sin(a) * 8.0;
      parts.push(paint(cyl(0.12, 0.12, 4.0, 4, bx, y + 2.0, bz), WHITE));
      const a2 = (k + 1) / 14 * Math.PI * 2, y2 = 1 + (k + 1) * 0.86;
      if (k < N - 1) parts.push(paint(beam([bx, y + 4.1, bz], [Math.cos(a2) * 8.0, y2 + 4.1, Math.sin(a2) * 8.0], 0.4), WOOD));
    }
    return merge(parts);
  },
  // the joke shop's wind-up teeth: two horseshoes of gum, seven big teeth round the front of each, the
  // tongue, orange feet, the key in its side. This is the bottom jaw and the feet; the top jaw (below)
  // chatters, hinged at the back.
  teethBase() {
    const parts = [];
    for (const s of [-1, 1]) parts.push(paint(sph(1.3, 1, 0.55, 1.8, s * 1.9, 0.6, 0.8, 10, 6), ORANGE));
    const gum = new THREE.TorusGeometry(2.6, 0.9, 8, 18, Math.PI * 1.2); gum.rotateX(Math.PI / 2); gum.rotateY(0.1 * Math.PI); gum.translate(0, 2.0, 0); parts.push(paint(gum, GUM));
    parts.push(paint(sph(1.9, 1, 0.35, 1.25, 0, 2.2, 0.5, 12, 8), rgb(0xd8506a)));
    for (let k = 0; k < 7; k++) {
      const a = (22 + k * 136 / 6) * Math.PI / 180, t = box(0.85, 1.5, 0.62, 0, 0, 0);
      t.rotateY(-(a + Math.PI / 2)); t.translate(Math.cos(a) * 2.65, 3.45, Math.sin(a) * 2.65); parts.push(paint(t, WHITE));
    }
    const key = [cyl(0.18, 0.18, 2.0, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(-3.9, 2.2, -0.4)];
    const bow = new THREE.TorusGeometry(0.9, 0.28, 6, 14); bow.rotateY(Math.PI / 2); bow.translate(-5.2, 2.2, -0.4); key.push(bow);
    parts.push(paint(merge(key), BRASS));
    return merge(parts);
  },
  teethTop() {
    const parts = [];
    const gum = new THREE.TorusGeometry(2.6, 0.9, 8, 18, Math.PI * 1.2); gum.rotateX(Math.PI / 2); gum.rotateY(0.1 * Math.PI); parts.push(paint(gum, GUM));
    parts.push(paint(sph(2.0, 1, 0.3, 1.3, 0, 0.35, 0.4, 12, 8), rgb(0xe86a84)));
    for (let k = 0; k < 7; k++) {
      const a = (22 + k * 136 / 6) * Math.PI / 180, t = box(0.85, 1.5, 0.62, 0, 0, 0);
      t.rotateY(-(a + Math.PI / 2)); t.translate(Math.cos(a) * 2.65, -1.45, Math.sin(a) * 2.65); parts.push(paint(t, WHITE));
    }
    const g = merge(parts); g.translate(0, 0, 0.8);   // (hinged at the back, where the horseshoe ends: the world turns it about x there)
    return g;
  },
  // a picture on an easel: the legs leaning back, the ledge (the picture is a textured panel, below)
  easel(w = 14, h = 19) {
    const parts = [];
    for (const s of [-1, 1]) parts.push(beam([s * w * 0.42, 0, 0.6], [s * w * 0.22, h + 4.5, -0.8], 0.55));
    parts.push(beam([0, 0, -5], [0, h + 3, -0.8], 0.5), box(w * 0.9, 0.6, 1.0, 0, 3.4, 0.9));
    return paint(merge(parts), WOOD);
  },
  // the picture on it, leaning back with the legs, its foot on the ledge
  picture(w, h) {
    const tilt = 1.5 / (h + 4.5), g = panel(w, h); g.rotateX(-tilt); g.translate(0, 4 + (h / 2) * Math.cos(tilt), 1.05 - (h / 2) * Math.sin(tilt));
    return g;
  },
  // his things along the walls (front to +z, against the wall behind): a lamp on a little table (the
  // shade's light is a glow), an armchair, a bookcase, a plant
  lampTable() {
    return merge([paint(cyl(2.6, 2.6, 0.4, 16, 0, 7.6, 0), WOOD_L), paint(cyl(0.35, 0.45, 7.4, 8, 0, 3.7, 0), WOOD), paint(cyl(1.6, 1.8, 0.3, 12, 0, 0.15, 0), WOOD),
      paint(sph(1.1, 1, 1.2, 1, 0, 9.0, 0, 12, 9), rgb(0x5a7a9a)), paint(cyl(0.12, 0.12, 2.4, 6, 0, 11.0, 0), BRASS), paint(cyl(1.4, 2.3, 2.8, 16, 0, 13.4, 0), rgb(0xf4e6cc))]);
  },
  armchair() {
    const V = rgb(0x2e5a46), parts = [];
    parts.push(box(7.2, 2.4, 6.4, 0, 3.6, 0), box(7.2, 7.6, 1.6, 0, 6.6, -2.6), box(1.4, 4.6, 6.4, -3.6, 5.6, 0), box(1.4, 4.6, 6.4, 3.6, 5.6, 0));
    const g = paint(merge(parts), V);
    const legs = []; for (const x of [-3.2, 3.2]) for (const z of [-2.6, 2.6]) legs.push(box(0.5, 2.4, 0.5, x, 1.2, z));
    return merge([g, paint(merge(legs), WOOD), paint(box(5.6, 1.2, 4.6, 0, 5.4, 0.6), rgb(0x386a54))]);
  },
  bookcase() {
    const parts = [paint(box(9, 22, 3.2, 0, 11, -1.4), WOOD)];
    const R = seeded(21), cols = [0x8a2a2a, 0x2a4a7a, 0xd8c8a0, 0x3a5a3a, 0x6a3a6a, 0xc89a40, 0x1a1a22, 0xe8e0d0].map(rgb);
    for (let sh = 0; sh < 5; sh++) {
      const y0 = 1.2 + sh * 4.2;
      parts.push(paint(box(8.4, 0.3, 2.8, 0, y0, 0.1), WOOD_L));
      let x = -3.9;
      while (x < 3.7) { const w = 0.4 + R() * 0.5, h = 2.2 + R() * 1.3; if (R() < 0.9) parts.push(paint(box(w * 0.92, h, 2.2, x + w / 2, y0 + 0.15 + h / 2, 0.3), cols[Math.floor(R() * cols.length)])); x += w; }
    }
    return merge(parts);
  },
  plant() {
    const R = seeded(31), parts = [paint(cyl(2.0, 1.5, 3.4, 12, 0, 1.7, 0), rgb(0xb8643a))];
    for (let k = 0; k < 9; k++) parts.push(paint(sph(1.5 + R() * 0.9, 1, 1.15, 1, (R() - 0.5) * 3.2, 5.6 + R() * 4.2, (R() - 0.5) * 3.2, 8, 6), R() < 0.5 ? rgb(0x2a6a3a) : rgb(0x3a7a44)));
    return merge(parts);
  },
  // the speaker on a low table: pale fabric, its light a band round the top (glows, from the world)
  speaker() {
    const parts = [paint(box(12, 0.6, 8, 0, 4.1, 0), WOOD_L)];
    for (const x of [-5.4, 5.4]) for (const z of [-3.4, 3.4]) parts.push(paint(box(0.6, 3.8, 0.6, x, 1.9, z), WOOD));
    parts.push(paint(cyl(2.7, 2.8, 7.2, 22, 0, 8.0, 0), rgb(0xa8a8b0)), paint(cyl(2.62, 2.7, 0.3, 22, 0, 11.75, 0), rgb(0x3a3a44)), paint(cyl(2.4, 2.4, 0.12, 22, 0, 11.95, 0), rgb(0x24242c)));
    return merge(parts);
  },
  // a flight of stairs up the wall, along the way she's going, one tread gone
  stairs() {
    const parts = [];
    for (let k = 0; k < 15; k++) {
      if (k === 8) continue;   // the step he lost
      parts.push(paint(box(9, 0.6, 2.9, 0, 1.2 + k * 1.5, k * 2.6), WOOD_L), paint(box(8.8, 1.5, 0.3, 0, 0.45 + k * 1.5, k * 2.6 - 1.2), WHITE));
    }
    parts.push(paint(beam([-4.6, 0, -1.4], [-4.6, 22.5, 37.8], 0.6, 1.2), WHITE), paint(beam([4.6, 0, -1.4], [4.6, 22.5, 37.8], 0.6, 1.2), WHITE));
    parts.push(paint(beam([-4.4, 5.6, -1.4], [-4.4, 27.2, 37.8], 0.5), WOOD));
    for (let k = 0; k < 15; k += 1) parts.push(paint(cyl(0.12, 0.12, 4.2, 4, -4.4, 3.4 + k * 1.5, k * 2.6), WHITE));
    parts.push(paint(box(1, 6, 1, -4.4, 3, -1.4), WOOD));
    return merge(parts);
  },
  // the wreath for Tuesday, on its stand
  wreath() {
    const parts = [];
    const t = new THREE.TorusGeometry(4.2, 1.3, 8, 22); t.translate(0, 15, 0.4); parts.push(paint(t, rgb(0x1a3a24)));
    const R = seeded(9);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; parts.push(paint(sph(0.75, 1, 1, 0.7, Math.cos(a) * 4.2, 15 + Math.sin(a) * 4.2, 1.4, 8, 6), R() < 0.7 ? WHITE : rgb(0xd8d4dc))); }
    for (const s of [-1, 1]) parts.push(paint(beam([s * 0.6, 10.6, 1.6], [s * 2.4, 4.6, 1.5], 1.1, 0.12), BLACK));
    parts.push(paint(box(2.4, 1.4, 0.3, 0, 10.8, 1.6), BLACK));
    for (const s of [-1, 1]) parts.push(paint(beam([s * 3.2, 0, 1.6], [s * 0.6, 16, 0], 0.4), IRON));
    parts.push(paint(beam([0, 0, -3.2], [0, 15, 0], 0.4), IRON));
    return merge(parts);
  },
  // and Friday: white balloons on a weight, a white bow
  christening() {
    const parts = [];
    const R = seeded(4);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, r = 1.2 + R() * 3.2, y = 17 + R() * 7, x = Math.cos(a) * r, z = Math.sin(a) * r;
      parts.push(paint(sph(2.1, 1, 1.18, 1, x, y, z, 12, 9), k % 3 ? WHITE : rgb(0xe8eef8)));
      parts.push(paint(beam([0, 2.4, 0], [x, y - 2.4, z], 0.07), rgb(0xd8d8d8)));
    }
    parts.push(paint(cyl(1.4, 1.6, 2.4, 10, 0, 1.2, 0), rgb(0xe8e4ea)));
    for (const s of [-1, 1]) { const l = new THREE.TorusGeometry(1.0, 0.32, 6, 12); l.scale(1.3, 0.8, 1); l.translate(s * 1.3, 2.8, 1.5); parts.push(paint(l, WHITE)); }
    for (const s of [-1, 1]) parts.push(paint(beam([0, 2.7, 1.6], [s * 1.0, 0.4, 1.7], 0.6, 0.1), WHITE));
    return merge(parts);
  },
  // a box, the way she came: open, the flaps back, packing in it
  openBox() {
    const W = 14, H = 11, D = 11, parts = [];
    parts.push(box(W, 0.4, D, 0, 0.2, 0), box(W, H, 0.3, 0, H / 2, -D / 2), box(W, H, 0.3, 0, H / 2, D / 2), box(0.3, H, D, -W / 2, H / 2, 0), box(0.3, H, D, W / 2, H / 2, 0));
    const fl = (w, d, x, z, rx, rz) => { const g = box(w, 0.25, d, 0, 0, 0); g.translate(x === 0 ? 0 : Math.sign(x) * w / 2, 0, z === 0 ? 0 : Math.sign(z) * d / 2); g.rotateX(rx); g.rotateZ(rz); g.translate(x, H, z); return g; };
    parts.push(fl(W, D / 2, 0, D / 2, 2.2, 0), fl(W, D / 2, 0, -D / 2, -2.2, 0), fl(W / 2.4, D, W / 2, 0, 0, -2.0), fl(W / 2.4, D, -W / 2, 0, 0, 2.0));
    const g = paint(merge(parts), CARD);
    const tape = paint(box(2.6, 0.06, D + 0.2, 0, H + 0.02, 0), TAPE);
    const R = seeded(13), pk = [];
    for (let k = 0; k < 26; k++) pk.push(sph(0.7, 1.4, 0.6, 0.8, (R() - 0.5) * (W - 2), H - 1.2 + R() * 1.4, (R() - 0.5) * (D - 2), 6, 4));
    return merge([g, tape, paint(merge(pk), rgb(0xf6f2e8))]);
  },
  // the next one: the same box, shut, taped, a bow on it
  sealedBox() {
    const W = 14, H = 11, D = 11;
    const parts = [paint(box(W, H, D, 0, H / 2, 0), CARD), paint(box(2.4, 0.08, D + 0.1, 0, H + 0.03, 0), TAPE), paint(box(0.08, H * 0.4, 2.4, W / 2 + 0.03, H * 0.8, 0), TAPE)];
    parts.push(paint(box(W + 0.1, 1.2, 1.2, 0, H + 0.1, 0), rgb(0xf4f0f8)), paint(box(1.2, 1.2, D + 0.1, 0, H + 0.1, 0), rgb(0xf4f0f8)));
    for (const s of [-1, 1]) { const l = new THREE.TorusGeometry(2.0, 0.5, 6, 14); l.scale(1.2, 0.8, 1); l.rotateY(0.5 * s); l.translate(s * 2.1, H + 1.8, 0); parts.push(paint(l, rgb(0xf4f0f8))); }
    return merge(parts);
  },
  // the grandfather clock (its face, hands and pendulum are pieces of their own)
  clock() {
    const parts = [paint(box(7.4, 3, 5, 0, 1.5, 0), WOOD), paint(box(6.2, 17, 4.2, 0, 11.5, 0), WOOD), paint(box(7.8, 9, 5.2, 0, 24.5, 0), WOOD), paint(box(8.6, 1.4, 5.8, 0, 29.6, 0), WOOD_L)];
    parts.push(paint(box(4.2, 12, 0.2, 0, 11.5, 2.15), rgb(0x1a1418)));
    for (const x of [-3.6, 3.6]) parts.push(paint(cyl(0.35, 0.35, 9, 8, x, 24.5, 2.4), BRASS));
    return merge(parts);
  },
  clockFace() { return panel(6.2, 6.2, 0, 24.6, 2.65); },
  hand(len, w) { const g = box(w, len, 0.15, 0, len / 2 - 0.4, 0); return paint(g, BLACK); },
  pendulum() { return merge([paint(beam([0, 0, 0], [0, -8.5, 0], 0.18), BRASS), paint(cyl(1.4, 1.4, 0.3, 16, 0, -9.2, 0).rotateX(Math.PI / 2), BRASS)]); },

  // ---------- the one room ----------
  // a length of the long table down one side, its cloth to the floor, two places laid
  table() {
    const parts = [paint(box(10.4, 0.4, 12, 0, 5.4, 0), CLOTH), paint(box(10.4, 5.0, 0.15, 0, 2.9, 6.0), CLOTH), paint(box(10.4, 5.0, 0.15, 0, 2.9, -6.0), CLOTH)];
    for (const x of [-2.6, 2.6]) {
      parts.push(paint(cyl(1.5, 1.2, 0.18, 16, x, 5.7, -2.4), WHITE), paint(cyl(0.9, 0.9, 0.06, 14, x, 5.81, -2.4), rgb(0xe0dad0)));
    }
    return merge(parts);
  },
  chair() {
    // (gilt banquet chairs, cream seats: dark ones made a comb of bars rushing past the screen's edges)
    const GILT = rgb(0xc8a464), SEAT = rgb(0xece2cc);
    const parts = [paint(box(4.2, 0.5, 4.2, 0, 3.5, 0), SEAT), paint(box(4.2, 7.0, 0.5, 0, 7.2, -1.9), GILT), paint(box(3.4, 3.2, 0.2, 0, 8.0, -1.62), SEAT)];
    for (const x of [-1.8, 1.8]) for (const z of [-1.8, 1.8]) parts.push(paint(box(0.45, 3.3, 0.45, x, 1.65, z), GILT));
    return merge(parts);
  },
  // a candelabra on the table (its flames are glows)
  candelabra() {
    const parts = [paint(cyl(1.0, 1.3, 0.4, 12, 0, 0.2, 0), SILVER), paint(cyl(0.22, 0.3, 5.5, 8, 0, 2.95, 0), SILVER)];
    for (const x of [-2.2, 0, 2.2]) { if (x) parts.push(paint(beam([0, 4.4, 0], [x, 5.4, 0], 0.22), SILVER)); parts.push(paint(cyl(0.28, 0.28, 2.2, 8, x, 6.6, 0), rgb(0xf4ecd8))); }
    return merge(parts);
  },
  // the bubble someone's typing in, over each empty chair (its dots are the world's)
  typing() {
    const s = roundRect(6.4, 3.4, 1.7);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -0.15);
    const tail = new THREE.ConeGeometry(0.7, 1.4, 4); tail.rotateZ(0.6); tail.translate(-2.2, -2.0, 0);
    return paint(merge([g, tail]), rgb(0xe4e2ec));
  },
  dot() { return paint(sph(0.42, 1, 1, 0.4, 0, 0, 0, 8, 6), rgb(0x6a6878)); },
  // a mirror's gilt frame, for the end of the room (the glass is the world's)
  mirrorFrame(hw, hh) {
    const parts = [], t = 1.6;
    parts.push(box(2 * hw + 2 * t, t, 1.2, 0, hh + t / 2, 0), box(t, hh + t, 1.2, -hw - t / 2, hh / 2 + t / 2, 0), box(t, hh + t, 1.2, hw + t / 2, hh / 2 + t / 2, 0));
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI; parts.push(sph(1.0, 1, 1, 0.5, Math.cos(a) * 4, hh + t + 1.4 + Math.sin(a) * 2.6, 0.2, 8, 6)); }
    return paint(merge(parts), BRASS);
  },

  // ---------- the end: the newest one, standing among them ----------
  phone() {
    const s = roundRect(11, 22, 1.8);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 11.6, -0.5);
    const parts = [paint(g, rgb(0x1a1a20))];
    parts.push(paint(box(0.3, 2.6, 0.5, 5.65, 17, 0), rgb(0x2a2a32)), paint(box(0.3, 1.4, 0.5, -5.65, 18, 0), rgb(0x2a2a32)), paint(box(0.3, 1.4, 0.5, -5.65, 16.2, 0), rgb(0x2a2a32)));
    // its stand: a little wedge dock in the grass
    parts.push(paint(box(9, 1.6, 6, 0, 0.8, 0.6), rgb(0x2a2a30)), paint(box(9, 2.4, 0.8, 0, 1.6, 2.5), rgb(0x2a2a30)));
    return merge(parts);
  },
  phoneScreen() { const s = roundRect(10.2, 21.0, 1.4); const g = new THREE.ShapeGeometry(s, 8); planarUV(g); g.translate(0, 11.6, 0.71); return g; },
};

// ---------- the pickup: a tealight, lit ----------
function tealightGeometry() {
  const parts = [paint(cyl(0.42, 0.38, 0.3, 14, 0, -0.18, 0), [0.7, 0.72, 0.78]), paint(cyl(0.37, 0.37, 0.04, 14, 0, -0.02, 0), [0.86, 0.82, 0.74]), paint(cyl(0.025, 0.025, 0.14, 4, 0, 0.06, 0), [0.08, 0.06, 0.06])];
  const f = lathe([[0.01, 0], [0.11, 0.06], [0.14, 0.16], [0.1, 0.3], [0.04, 0.42], [0.005, 0.5]], 10); f.translate(0, 0.08, 0); parts.push(paint(f, [1, 0.78, 0.3]));
  const f2 = lathe([[0.01, 0], [0.06, 0.05], [0.07, 0.13], [0.03, 0.24], [0.005, 0.28]], 8); f2.scale(1.1, 1, 1.1); f2.translate(0, 0.1, 0); parts.push(paint(f2, [1, 0.97, 0.8]));
  const g = merge(parts); g.scale(1.25, 1.25, 1.25); g.computeVertexNormals();
  return g;
}
// (gem colour first: the palettes keep their gem near white so the wax and the flame read true)
export const pickup = {
  key: 'tealight', geo: tealightGeometry, color: 0xfff2dc,
  mat: { rough: 0.3, metal: 0.25, emissive: 0xffffff, emissiveK: 0.85, glowColour: true },
  s: 1.45, lit: 1.25, flicker: true,
  move: (e, time, i) => e.set(Math.sin(time * 1.3 + i) * 0.14, time * 0.9 + i * 1.3, Math.sin(time * 1.1 + i) * 0.12),
};
