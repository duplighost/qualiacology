// Summa Cum Stupid: the things on the midway, about one and a half times life size so they read at
// speed. Geometry only, vertex-coloured; the bulbs are glows the world draws, and the pictures (the
// grade scale, the score board, the talk's slides, the spelling bee) are canvases made here.
// scs-world.js puts them in the place; the pickup, a gold W, is wGeometry at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded, box } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
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

export const RED = rgb(0xd8202a), WHITE = rgb(0xf4eee6), GOLD = rgb(0xe8b030), BRASS = rgb(0xc89a40), PINK = rgb(0xff5aa8), TEAL = rgb(0x30c8c0),
  BLUE = rgb(0x2a5ad8), YELLOW = rgb(0xffcc2a), PURPLE = rgb(0x7a3ad0), GREEN = rgb(0x2aa860), STEEL = rgb(0x8a8e98), DARK = rgb(0x18141c),
  WOOD = rgb(0x8a5a32), CREAM = rgb(0xf2e6cc), VELVET = rgb(0x8a1428), GREY = rgb(0x8a8680), BLACK = rgb(0x121014);
// the colour pairs the booths' roofs are striped in
export const STRIPES = [[RED, WHITE], [BLUE, WHITE], [YELLOW, RED], [PINK, WHITE], [GREEN, CREAM], [PURPLE, YELLOW]];

// a cone (or a roof) in alternating coloured wedges
function wedges(r0, r1, h, n, cA, cB, y = 0) {
  const parts = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.CylinderGeometry(r1, r0, h, 2, 1, true, (k / n) * Math.PI * 2, (1 / n) * Math.PI * 2);
    g.translate(0, y + h / 2, 0); parts.push(paint(g, k % 2 ? cA : cB));
  }
  return parts;
}

// ---------- the pictures ----------
// the strength tester's scale: grades up the pole, 4.0 at the bell
export function scaleTexture() {
  return canvasTex(256, 2048, (g, W, H) => {
    g.fillStyle = '#f6efe0'; g.fillRect(0, 0, W, H);
    const rows = ['4.0', 'A+', 'A', 'B', 'C', 'D', 'F'];
    const cols = ['#ff2a4a', '#ff7a1a', '#ffc81a', '#40c860', '#2a9ae8', '#7a5ae0', '#8a8a8a'];
    rows.forEach((r, i) => {
      const y = 60 + i * 280;
      g.fillStyle = cols[i]; g.fillRect(16, y, W - 32, 240);
      g.fillStyle = '#ffffff'; g.font = `900 ${i ? 150 : 128}px "Arial Black", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(r, W / 2, y + 124, W - 40);
    });
    g.strokeStyle = '#1a1414'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
  });
}
// the score board: four faces in one picture, one at a time (the board picks its quarter)
//  0: GPA 4.0   1: her big brain blue-screened   2: 4.0 going wrong   3: 0.4
export function boardTexture() {
  return canvasTex(1024, 1024, (g, W, H) => {
    const cell = (k, draw) => { g.save(); g.translate(0, k * 256); g.beginPath(); g.rect(0, 0, W, 256); g.clip(); draw(); g.restore(); };
    const leds = (txt, col, size, y = 128) => {
      g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 30; g.fillStyle = col; g.fillText(txt, W / 2, y); g.shadowBlur = 0;
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 2, 256); for (let yy = 0; yy < 256; yy += 8) g.fillRect(0, yy, W, 2);
    };
    cell(0, () => { g.fillStyle = '#08060a'; g.fillRect(0, 0, W, 256); g.font = '900 54px "Arial Black", Impact, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ffd040'; g.fillText('GPA', 40, 70); leds('4.0', '#ff3a3a', 220, 150); });
    cell(1, () => {
      g.fillStyle = '#1a3ad0'; g.fillRect(0, 0, W, 256);
      g.fillStyle = '#ffffff'; g.font = '900 120px "Segoe UI", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(':(', 60, 96);
      g.font = '700 34px "Segoe UI", Arial, sans-serif'; g.fillText('LOGIC HAS STOPPED.', 240, 80); g.fillText('PLEASE GO STUPID.', 240, 128);
      g.font = '400 24px "Segoe UI", Arial, sans-serif'; g.fillText('0% complete', 240, 186);
    });
    cell(2, () => { g.fillStyle = '#08060a'; g.fillRect(0, 0, W, 256); leds('4.0', '#ff3a3a', 220, 150); g.fillStyle = '#08060a'; const R = seeded(31); for (let k = 0; k < 40; k++) g.fillRect(R() * W, R() * 256, 20 + R() * 120, 6 + R() * 18); g.font = '900 54px "Arial Black", Impact, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ff3a3a'; g.fillText('ERR', 40, 70); });
    cell(3, () => { g.fillStyle = '#08060a'; g.fillRect(0, 0, W, 256); g.font = '900 54px "Arial Black", Impact, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ffd040'; g.fillText('GPA', 40, 70); leds('0.4', '#ff3a3a', 220, 150); });
  });
}
// the talk's slides: the first a graph and a word, then the words coming apart
export function slidesTexture() {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = seeded(12);
    const cell = (k, draw) => { g.save(); g.translate(0, k * 512); g.beginPath(); g.rect(0, 0, W, 512); g.clip(); draw(); g.restore(); };
    cell(0, () => {
      g.fillStyle = '#f6f4f0'; g.fillRect(0, 0, W, 512);
      g.fillStyle = '#16141a'; g.font = '900 110px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE MIND', W / 2, 110);
      g.strokeStyle = '#ff2a3a'; g.lineWidth = 14; g.beginPath(); g.moveTo(140, 420); g.lineTo(340, 360); g.lineTo(520, 300); g.lineTo(700, 250); g.lineTo(880, 190); g.stroke();
      g.strokeStyle = '#8a8a90'; g.lineWidth = 4; g.beginPath(); g.moveTo(120, 200); g.lineTo(120, 440); g.lineTo(900, 440); g.stroke();
    });
    cell(1, () => {
      g.fillStyle = '#f6f4f0'; g.fillRect(0, 0, W, 512);
      const words = ['THE', 'MIMD', 'IS', 'A', 'BLEEP', 'uhh', 'BRAIN', 'GOOD', 'mmm', 'WHAT', 'BLORP', '??', 'THE THE', 'nnngh', 'WOW', 'MIND'];
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let k = 0; k < 26; k++) {
        g.save(); g.translate(60 + R() * (W - 120), 50 + R() * 410); g.rotate((R() - 0.5) * 1.2);
        g.fillStyle = ['#16141a', '#e8205a', '#d89a10', '#1a8ad0'][k % 4]; g.font = `900 ${40 + R() * 70}px "Arial Black", Impact, sans-serif`;
        g.fillText(words[k % words.length], 0, 0); g.restore();
      }
    });
  });
}
// the spelling bee: words she used to know, spelt the way she spells them now
export function beeTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#16301e'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8a050'; g.lineWidth = 18; g.strokeRect(9, 9, W - 18, H - 18);
    g.fillStyle = '#ffd040'; g.font = '900 64px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SPELLING BEE', W / 2, 70);
    g.fillStyle = '#f2f0e6'; g.font = '700 70px "Comic Sans MS", "Segoe Print", cursive';
    const words = [['VALEDICTORAN', 160], ['EPISTEMOLGY', 250], ['SMRAT', 340], ['GENOUS', 430]];
    for (const [w, y] of words) g.fillText(w, W / 2, y);
    g.strokeStyle = '#ff3a3a'; g.lineWidth = 6;
    for (const [, y] of words) { g.beginPath(); g.moveTo(W - 150, y - 26); g.lineTo(W - 100, y + 26); g.moveTo(W - 100, y - 26); g.lineTo(W - 150, y + 26); g.stroke(); }
  });
}
// the trophy's plaque
export function plaqueTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f8dc8a'); gr.addColorStop(0.5, '#c8962a'); gr.addColorStop(1, '#8a5a12');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#5a3a08'; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = '#3a2404'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 54px Georgia, "Times New Roman", serif'; g.fillText('SUMMA CUM', W / 2, 92);
    g.font = '900 76px Georgia, "Times New Roman", serif'; g.fillText('STUPID', W / 2, 172);
  });
}
// the placard in front of the rock
export function placardTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2a2018'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#2a2018'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 78px Georgia, "Times New Roman", serif'; g.fillText('MY BRAIN', W / 2, 108);
    g.font = 'italic 36px Georgia, serif'; g.fillText('(smooth, polished)', W / 2, 182);
  });
}

// ---------- the pieces ----------
export const PROP = {
  // the way in: two towers, the arch over the road between them, its sign the world swaps
  arch() {
    const parts = [];
    for (const x of [-27, 27]) {
      parts.push(paint(box(5, 46, 5, x, 23, 0), RED), paint(box(5.6, 1.2, 5.6, x, 46.6, 0), GOLD), paint(box(6.4, 3, 6.4, x, 1.5, 0), WHITE));
      for (let y = 6; y < 44; y += 6) parts.push(paint(box(5.3, 0.8, 5.3, x, y, 0), WHITE));
      parts.push(paint(new THREE.ConeGeometry(3.6, 8, 4).rotateY(Math.PI / 4).translate(x, 51, 0), GOLD));
    }
    // the arch itself, in segments over the top
    const N = 16;
    for (let k = 0; k < N; k++) {
      const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N;
      const p = (a) => [-27 * Math.cos(a), 44 + 9 * Math.sin(a), 0];
      // (the white segments a little fatter than the red: the same size, their ends overlapped at one depth and flickered)
      parts.push(paint(k % 2 ? beam(p(a0), p(a1), 2.6, 3) : beam(p(a0), p(a1), 2.8, 3.2), k % 2 ? RED : WHITE));
    }
    parts.push(paint(box(50, 1.4, 2.6, 0, 37, 0), GOLD), paint(box(42, 9, 1.2, 0, 30.6, 0.2), DARK));
    return merge(parts);
  },
  // a pole the bulb strings hang from
  pole() { return merge([paint(cyl(0.35, 0.45, 18, 6, 0, 9, 0), WHITE), paint(cyl(0.9, 0.9, 0.6, 8, 0, 18.3, 0), GOLD), paint(cyl(0.9, 1.1, 0.8, 8, 0, 0.4, 0), DARK)]); },
  // a game booth: the counter, the back wall hung with prizes, the posts, the sign plate on top;
  // the roof is its own piece (stripes in a colour pair)
  booth() {
    const parts = [], R = seeded(4);
    parts.push(paint(box(16, 4.4, 4, 0, 2.2, 3), WHITE), paint(box(16.4, 0.6, 4.6, 0, 4.7, 3.2), RED));
    for (let i = 0; i < 8; i++) parts.push(paint(box(1.8, 3.6, 0.3, -7 + i * 2, 2.2, 5.05), i % 2 ? RED : WHITE));
    parts.push(paint(box(16, 12, 0.6, 0, 6, -4), CREAM));
    for (const x of [-7.8, 7.8]) parts.push(paint(box(0.6, 12, 0.6, x, 6, 4.6), WHITE));
    // prizes on the back wall: plush in every colour
    const cols = [PINK, YELLOW, TEAL, PURPLE, RED, BLUE, GREEN, WHITE];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) parts.push(paint(sph(0.85 + R() * 0.35, 1, 1.15, 0.8, -6 + c * 2 + (r % 2) * 0.6, 6.4 + r * 2.1, -3.2, 8, 6), cols[(r * 3 + c) % cols.length]));
    // the plate the sign goes on
    parts.push(paint(box(13, 3.8, 0.6, 0, 14.4, 4.4), DARK));
    return merge(parts);
  },
  boothRoof(cA, cB) {
    const parts = [], n = 10;
    for (let k = 0; k < n; k++) {
      const x = -8 + 16 * (k + 0.5) / n, c = k % 2 ? cA : cB;
      for (const s of [-1, 1]) { const g = box(16 / n, 0.25, 6.6, 0, 0, 0); g.rotateX(s * 0.42); g.translate(x, 13 + 1.35, s * 2.9 + 0.6); parts.push(paint(g, c)); }
    }
    // the scalloped valance along the front
    for (let k = 0; k < 16; k++) { const g = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 10, 1, false, 0, Math.PI); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI); g.translate(-7.5 + k, 11.8, 6.2); parts.push(paint(g, k % 2 ? cA : cB)); }
    return merge(parts);
  },
  // a food stand: a little wagon with a striped awning and a big sign plate
  stand() {
    const parts = [];
    parts.push(paint(box(11, 6, 6, 0, 4, 0), CREAM), paint(box(11.2, 0.6, 6.2, 0, 7.3, 0), RED), paint(box(9, 2.6, 0.2, 0, 4.6, 3.05), DARK));
    for (const x of [-4, 4]) parts.push(paint(cyl(1, 1, 0.6, 12, x, 1, 3.1).rotateZ(0), DARK));
    for (let k = 0; k < 8; k++) { const g = box(11 / 8, 0.2, 3.4, -5.5 + 11 * (k + 0.5) / 8, 9.2, 4.2); g.rotateX(-0.25); parts.push(paint(g, k % 2 ? RED : WHITE)); }
    parts.push(paint(box(9, 3.2, 0.5, 0, 11.8, 0), DARK));
    return merge(parts);
  },
  // the coaster under her road: one bay of its trestle, 6 m tall (two legs, a tie across the top, an X of
  // bracing with one brace a little in front of the other so they never share a face), stacked up to the
  // road's height; one bay stretched to the whole height made its braces slabs metres thick
  bent() {
    const parts = [];
    for (const x of [-6.2, 6.2]) parts.push(paint(box(0.7, 6, 0.7, x, 3, 0), WHITE));
    parts.push(paint(box(12.4, 0.45, 0.5, 0, 5.75, 0), WHITE));
    parts.push(paint(beam([-6.0, 0.4, 0.1], [6.0, 5.5, 0.1], 0.35, 0.35), WHITE), paint(beam([6.0, 0.4, -0.1], [-6.0, 5.5, -0.1], 0.35, 0.35), WHITE));
    return merge(parts);
  },
  bentTop() { return merge([paint(box(14, 0.8, 1.0, 0, -0.4, 0), WHITE), paint(box(1.2, 1.2, 1.2, -6.2, -1.0, 0), GOLD), paint(box(1.2, 1.2, 1.2, 6.2, -1.0, 0), GOLD)]); },

  // ----- the carousel (the world turns it) -----
  // the deck and the column, the canopy: one piece that turns
  carousel() {
    const parts = [];
    parts.push(paint(cyl(15, 15, 1.2, 40, 0, 1.6, 0), WOOD), paint(new THREE.CylinderGeometry(15.3, 15.3, 1.0, 40, 1, true).translate(0, 1.9, 0), RED), paint(cyl(14, 15, 1.0, 40, 0, 0.5, 0), DARK));
    // the column: mirrored panels, gold bands
    parts.push(paint(cyl(2.6, 2.6, 13, 12, 0, 8.5, 0), GOLD));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const g = box(1.2, 8, 0.2, 0, 8.5, 2.62); g.rotateY(a); parts.push(paint(g, rgb(0xd8e8ff))); }
    for (const y of [4.4, 12.6]) parts.push(paint(cyl(2.9, 2.9, 0.7, 16, 0, y, 0), RED));
    // the canopy: a striped cone, a gold rim and its scallops, the crown on top
    parts.push(...wedges(17, 2.5, 6.5, 24, RED, WHITE, 15));
    parts.push(paint(cyl(17.2, 17.2, 1.6, 40, 0, 15.2, 0), GOLD));
    for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; const g = new THREE.CylinderGeometry(1.0, 1.0, 0.3, 10, 1, false, 0, Math.PI); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI); g.translate(0, 14.4, 17.25); g.rotateY(a); parts.push(paint(g, k % 2 ? RED : WHITE)); }
    parts.push(paint(cyl(2.8, 2.8, 1.4, 16, 0, 22.2, 0), GOLD), paint(cyl(0.3, 0.3, 4.6, 6, 0, 25.2, 0), GOLD));
    // the brass poles
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 9.5 : 12.5; parts.push(paint(cyl(0.18, 0.18, 12.6, 6, Math.cos(a) * r, 8.9, Math.sin(a) * r), BRASS)); }
    return merge(parts);
  },
  // a horse on its pole: rides up and down, a mortarboard on its head
  horse() {
    const parts = [], W = rgb(0xf6f0e8), M = rgb(0xffd0e0), S = rgb(0xd83040);
    parts.push(paint(sph(1, 2.2, 1.1, 0.9, 0, 0, 0, 14, 10), W));                      // the body
    const neck = sph(0.6, 0.7, 1.5, 0.6, 1.7, 1.2, 0, 10, 8); neck.rotateZ(-0.5); parts.push(paint(neck, W));
    const head = sph(0.55, 1.4, 0.7, 0.6, 2.7, 2.2, 0, 10, 8); head.rotateZ(-0.35); parts.push(paint(head, W));
    for (const [x, z, r] of [[1.4, 0.45, 0.9], [1.4, -0.45, 0.5], [-1.4, 0.45, -0.7], [-1.4, -0.45, -0.3]]) { const l = box(0.3, 2.2, 0.3, 0, -1, 0); l.rotateZ(r); l.translate(x, -0.6, z); parts.push(paint(l, W)); }
    parts.push(paint(box(1.6, 0.25, 1.3, 0.1, 1.05, 0), S), paint(sph(0.5, 1, 1.6, 0.3, -2.1, 0.3, 0, 8, 6), M));   // the saddle, the tail
    // the mortarboard
    const cap = box(1.5, 0.12, 1.5, 0, 0, 0); cap.rotateY(0.785); cap.translate(2.75, 2.85, 0); parts.push(paint(cap, BLACK));
    parts.push(paint(cyl(0.45, 0.5, 0.35, 10, 2.75, 2.65, 0), BLACK), paint(box(0.08, 0.8, 0.08, 3.4, 2.5, 0.2), GOLD));
    return merge(parts);
  },
  // the dunce cap the carousel and the trophy wear
  dunce() { return merge([paint(new THREE.ConeGeometry(1, 3.2, 20).translate(0, 1.6, 0), rgb(0xfff4d8)), paint(cyl(1.02, 1.02, 0.4, 20, 0, 0.2, 0), rgb(0x2a5ad8)), paint(sph(0.28, 1, 1, 1, 0, 3.25, 0, 8, 6), rgb(0xff3a5a))]); },

  // ----- the strength tester -----
  striker() {
    const parts = [];
    parts.push(paint(box(4, 1.2, 4, 0, 0.6, 0), RED), paint(box(2.4, 0.8, 1.6, 0, 1.6, 2.2), GOLD));      // the base, the pad you hit
    parts.push(paint(box(1.6, 34, 0.8, 0, 18, -0.6), WHITE), paint(box(0.3, 34, 0.3, 0, 18, 0.1), STEEL));  // the board, the wire
    parts.push(paint(lathe([[0.1, 0], [1.6, -0.2], [2.4, -1.2], [2.6, -2.2], [0.1, -2.1]], 20).translate(0, 37.6, 0), BRASS));  // the bell
    parts.push(paint(cyl(0.25, 0.25, 2.4, 6, 0, 36.6, 0), STEEL), paint(box(10.4, 3.8, 0.5, 0, 41.6, 0), DARK), paint(box(0.5, 3.4, 0.5, 0, 39.3, 0), STEEL));
    // the mallet, leaning
    const h = box(0.35, 7, 0.35, 0, 3.5, 0); h.rotateZ(0.25); h.translate(3.2, 0.4, 2.0); parts.push(paint(h, WOOD));
    const hd = cyl(0.9, 0.9, 2.4, 12, 0, 0, 0); hd.rotateZ(Math.PI / 2 + 0.25); hd.translate(1.5, 7.1, 2.0); parts.push(paint(hd, RED));
    return merge(parts);
  },
  scaleFace() { const g = new THREE.PlaneGeometry(1.4, 31); g.translate(0, 18.5, -0.08); return g; },
  puck() { return merge([paint(box(1.3, 1.0, 0.9, 0, 0, 0.2), rgb(0xff2a3a)), paint(box(0.3, 1.2, 0.3, 0, 0, -0.2), STEEL)]); },

  // ----- the claw machine (the glass is its own piece) -----
  claw() {
    const parts = [];
    parts.push(paint(box(12, 5, 10, 0, 2.5, 0), PINK), paint(box(12.4, 0.6, 10.4, 0, 5.2, 0), GOLD), paint(box(4, 2, 0.4, 0, 3.4, 5.1), DARK));
    for (const [x, z] of [[-5.8, -4.8], [5.8, -4.8], [-5.8, 4.8], [5.8, 4.8]]) parts.push(paint(box(0.5, 13, 0.5, x, 11.8, z), GOLD));
    parts.push(paint(box(12.4, 3.2, 10.4, 0, 19.6, 0), PINK), paint(box(10, 2.4, 0.4, 0, 19.6, 5.3), DARK));  // the top, its marquee plate
    parts.push(paint(box(11, 0.4, 0.5, 0, 17.6, 0), STEEL));   // the gantry rail
    // the pile of plush brains
    const R = seeded(9);
    for (let k = 0; k < 22; k++) parts.push(paint(brainBlob(R, 0.9 + R() * 0.3).translate(-4.6 + R() * 9.2, 5.8 + R() * 1.2, -3.8 + R() * 7.6), rgb(0xff9ac0)));
    return merge(parts);
  },
  clawGlass() { return paint(box(11.6, 13, 9.6, 0, 11.8, 0), rgb(0xc8e8ff)); },
  // the claw: its cable, the hub, three prongs (the world opens and closes them by scaling)
  clawHead() {
    const parts = [paint(box(0.12, 7, 0.12, 0, 3.6, 0), STEEL), paint(cyl(0.6, 0.45, 0.8, 10, 0, 0, 0), GOLD)];
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const g = box(0.25, 1.8, 0.25, 0, -1.1, 0); g.rotateZ(0.5); g.translate(0.55, 0, 0); g.rotateY(a); parts.push(paint(g, GOLD)); }
    return merge(parts);
  },
  brain() { return paint(brainBlob(seeded(3), 1.1), rgb(0xff9ac0)); },

  // ----- the score board: on two legs, its face the world flips between four pictures -----
  scoreboard() {
    const parts = [];
    for (const x of [-10, 10]) parts.push(paint(box(1.6, 22, 1.6, x, 11, -1.4), STEEL));
    parts.push(paint(box(34, 18, 2.4, 0, 30, -1.2), DARK), paint(box(35, 1, 3, 0, 39.4, -1.2), GOLD), paint(box(35, 1, 3, 0, 20.6, -1.2), GOLD));
    parts.push(paint(box(14, 3.4, 1.2, 0, 41.8, -1.2), RED));
    return merge(parts);
  },
  scoreFace() { const g = new THREE.PlaneGeometry(31, 15.4); g.translate(0, 30, 0.14); return g; },

  // ----- the drop tower: the tower, its crown; the ring of seats is its own piece -----
  dropTower() {
    const parts = [];
    for (let k = 0; k < 18; k++) parts.push(paint(box(3.4, 5, 3.4, 0, 2.5 + k * 5, 0), k % 2 ? RED : WHITE));
    parts.push(paint(cyl(4.6, 3.6, 4, 12, 0, 92, 0), GOLD), paint(cyl(5, 5, 0.6, 12, 0, 94.3, 0), RED), paint(cyl(0.3, 0.3, 8, 6, 0, 98.6, 0), STEEL));
    parts.push(paint(cyl(7, 8, 2, 16, 0, 1, 0), DARK));
    return merge(parts);
  },
  dropRing() {
    const parts = [paint(new THREE.TorusGeometry(7.4, 1.1, 8, 28).rotateX(Math.PI / 2), RED)];
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const g = box(2.4, 3.4, 2.0, 0, -1.8, 8.6); g.rotateY(a); parts.push(paint(g, k % 2 ? YELLOW : TEAL)); }
    return merge(parts);
  },
  // ----- the swings: the tower; the crown turns, the seats fly out on their chains -----
  swingTower() {
    const parts = [paint(cyl(1.6, 2.4, 26, 10, 0, 13, 0), STEEL), paint(cyl(8, 9, 1.4, 24, 0, 0.7, 0), DARK)];
    for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.6, 0.6, 26.4, 6, 0, 13.2, 0).translate(Math.cos(k * 1.57) * 1.8, 0, Math.sin(k * 1.57) * 1.8), WHITE));
    return merge(parts);
  },
  swingCrown() { return merge([...wedges(12, 3, 4, 16, PURPLE, YELLOW, 0), paint(cyl(12.2, 12.2, 1.2, 32, 0, 0, 0), GOLD), paint(sph(1.4, 1, 1, 1, 0, 4.6, 0, 10, 8), GOLD)]); },
  swingSeat() { return merge([paint(box(0.08, 9, 0.08, -0.5, -4.5, 0), STEEL), paint(box(0.08, 9, 0.08, 0.5, -4.5, 0), STEEL), paint(box(1.6, 0.25, 1.4, 0, -9, 0), RED), paint(box(1.6, 1.4, 0.2, 0, -8.3, -0.6), RED)]); },

  // ----- the prize W's -----
  wStack() {
    const parts = [], cols = [GOLD, PINK, TEAL, YELLOW, PURPLE, RED];
    let k = 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) { const g = wGeometryRaw(); g.scale(5.2, 5.2, 2.0); g.translate(-11 + c * 11 + r * 5.5, 6 + r * 10.8, 0); parts.push(paint(g, cols[k++ % cols.length])); }
    parts.push(paint(box(34, 0.8, 6, 0, 0.4, 0), DARK), paint(box(16.4, 4.6, 0.6, 0, 39, -0.4), DARK), paint(box(0.6, 6, 0.6, -6, 34.4, -0.4), STEEL), paint(box(0.6, 6, 0.6, 6, 34.4, -0.4), STEEL));
    return merge(parts);
  },
  bigW() { const g = wGeometryRaw(); g.scale(4, 4, 4); g.translate(0, 4.6, 0); return paint(g, GOLD); },

  // ----- the rock in its case: the plinth, the cushion, the rock; the dome is its own piece -----
  rock() {
    const parts = [paint(cyl(4.2, 4.6, 9, 24, 0, 4.5, 0), rgb(0x2a1a22)), paint(cyl(4.6, 4.6, 0.6, 24, 0, 9.3, 0), GOLD), paint(sph(3.2, 1, 0.35, 1, 0, 10.3, 0, 18, 10), VELVET)];
    const r = new THREE.IcosahedronGeometry(1.9, 2), P = r.attributes.position, R = seeded(77);
    for (let i = 0; i < P.count; i++) { const k = 0.82 + 0.12 * Math.sin(P.getX(i) * 2.1 + P.getY(i) * 1.3) + 0.05 * R(); P.setXYZ(i, P.getX(i) * k * 1.25, P.getY(i) * k * 0.8, P.getZ(i) * k); }
    r.translate(0, 12.0, 0); parts.push(paint(r, rgb(0x8a8680)));
    return merge(parts);
  },
  dome() { const g = new THREE.SphereGeometry(4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 1.25, 1); g.translate(0, 9.6, 0); return paint(g, rgb(0xd8f0ff)); },
  placardFace() { const g = new THREE.PlaneGeometry(4.4, 2.2); g.rotateX(-0.5); g.translate(0, 9.2, 4.9); return g; },
  rosette() {
    const parts = [paint(cyl(0.9, 0.9, 0.2, 16, 0, 0, 0).rotateX(Math.PI / 2), rgb(0x2a5ad8)), paint(cyl(0.45, 0.45, 0.25, 12, 0, 0, 0.02).rotateX(Math.PI / 2), GOLD)];
    for (const s of [-1, 1]) { const g = box(0.5, 1.6, 0.1, 0, -1.3, 0); g.rotateZ(s * 0.25); g.translate(s * 0.3, 0, 0); parts.push(paint(g, rgb(0x2a5ad8))); }
    return merge(parts);
  },
  mortar() { return merge([paint(box(3.4, 0.25, 3.4, 0, 0, 0).rotateY(0.785), BLACK), paint(cyl(1.1, 1.2, 0.8, 14, 0, -0.5, 0), BLACK), paint(box(0.12, 1.6, 0.12, 2.1, -0.7, 0), GOLD)]); },

  // ----- the trophy: the cup, the handles, the dunce cap on top (its plinth is the finale's own) -----
  trophy() {
    const parts = [];
    parts.push(paint(lathe([[3.6, 0], [3.4, 1.2], [1.2, 2.2], [0.9, 6.2], [2.6, 7.6], [5.6, 11], [7.4, 16.5], [7.8, 19.5], [7.2, 19.6], [0.1, 13]], 40), GOLD));
    for (const s of [-1, 1]) { const h = new THREE.TorusGeometry(3.2, 0.55, 8, 20, Math.PI * 1.2); h.rotateZ(s > 0 ? -Math.PI * 0.6 : Math.PI * 0.4 + Math.PI); h.translate(s * 7.6, 15.5, 0); parts.push(paint(h, GOLD)); }
    const d = PROP.dunce(); d.scale(3.6, 3.6, 3.6); d.translate(0, 19.4, 0); parts.push(d);
    return merge(parts);
  },
  trophyPlaque() { const g = new THREE.PlaneGeometry(9, 4.5); g.translate(0, 8, 6.15); return g; },

  // ----- the big top: its talk stage, the chairs in rows, the screen, the bee's board -----
  stage() {
    const parts = [paint(cyl(13, 13.6, 2.4, 40, 0, 1.2, 0), DARK), paint(cyl(11, 11, 0.12, 40, 0, 2.46, 0), rgb(0xd81830))];   // the round red carpet
    parts.push(paint(box(2.6, 4.6, 1.6, -4, 4.7, 3), rgb(0x2a2a30)), paint(box(3, 0.4, 2, -4, 7.1, 3.1), rgb(0x3a3a44)));   // the lectern
    parts.push(paint(cyl(0.05, 0.05, 1.6, 4, -4, 8.0, 3.6).rotateX(0), STEEL));
    return merge(parts);
  },
  screen() { return merge([paint(box(30, 17, 1, 0, 19, 0), DARK), paint(box(1, 12, 1, -12, 6, 0), STEEL), paint(box(1, 12, 1, 12, 6, 0), STEEL)]); },
  screenFace() { const g = new THREE.PlaneGeometry(28, 15); g.translate(0, 19, 0.64); return g; },
  chair() { return merge([paint(box(1.6, 0.2, 1.6, 0, 2.2, 0), rgb(0xc8202a)), paint(box(1.6, 2.2, 0.2, 0, 3.4, -0.75), rgb(0xc8202a)), ...[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z]) => paint(box(0.12, 2.2, 0.12, x, 1.1, z), STEEL))]); },
  beeBoard() { return merge([paint(box(22, 12, 0.8, 0, 14, 0), WOOD), paint(box(1, 9, 1, -8, 4.5, 0), WOOD), paint(box(1, 9, 1, 8, 4.5, 0), WOOD)]); },
  beeFace() { const g = new THREE.PlaneGeometry(20.6, 10.6); g.translate(0, 14, 0.54); return g; },
  // the letters she's dropping: alphabet blocks
  block() { return paint(box(1.6, 1.6, 1.6, 0, 0.8, 0), WHITE); },

  // a face for the shared sign sheet, w x h (the sheet's cells are 512 x 160, inset a little)
  signFace(w, h) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
  // a lyric marquee hung over the road: the box, its two chains
  marquee() { return merge([paint(box(27, 9.6, 1.4, 0, 0, -0.8), rgb(0x1a0c22)), paint(box(27.6, 0.8, 1.8, 0, 5.1, -0.8), GOLD), paint(box(27.6, 0.8, 1.8, 0, -5.1, -0.8), GOLD), paint(box(0.3, 30, 0.3, -12, 20, -0.8), STEEL), paint(box(0.3, 30, 0.3, 12, 20, -0.8), STEEL)]); },
};

// a plush brain: a lumpy two-lobed blob, its folds pushed in
function brainBlob(R, s) {
  const g = new THREE.SphereGeometry(s, 14, 10), P = g.attributes.position, ph = R() * 10;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const fold = 1 + 0.07 * Math.sin(x * 9 / s + ph) * Math.sin(y * 8 / s) + 0.05 * Math.sin(z * 11 / s + ph);
    const cleft = 1 - 0.18 * Math.exp(-(z * z) / (0.04 * s * s)) * (y > -0.2 * s ? 1 : 0);
    P.setXYZ(i, x * 1.25 * fold, y * 0.85 * fold * cleft, z * 1.0 * fold);
  }
  g.computeVertexNormals();
  return g;
}

// a W, two units wide and tall, a little thick, centred
function wGeometryRaw() {
  const s = new THREE.Shape();
  const pts = [[-1, 1], [-0.62, 1], [-0.42, -0.28], [-0.17, 0.72], [0.17, 0.72], [0.42, -0.28], [0.62, 1], [1, 1], [0.6, -1], [0.27, -1], [0, 0.22], [-0.27, -1], [-0.6, -1]];
  s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 });
  g.translate(0, 0, -0.18);
  return g.index ? g.toNonIndexed() : g;
}
// the pickup: a gold W (feedback.js makes the pickups from it; the HUD's icon is in styles.css)
export function wGeometry() {
  const g = wGeometryRaw(); g.scale(0.5, 0.5, 0.5);
  if (g.attributes.uv) g.deleteAttribute('uv');
  paint(g, [1, 0.82, 0.3]);
  g.computeVertexNormals();
  return g;
}
