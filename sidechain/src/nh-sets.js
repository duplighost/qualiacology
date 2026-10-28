// Nothing Happens Every Week: the set-pieces, one for each line that's sung. Geometry here,
// coloured per vertex; the words and pictures they carry are drawn into canvases here too.

import * as THREE from 'three';
import { paint, merge, box, cyl, sph, tri, beam, seeded, rgb, ni, bare, WALL, ACCENT } from './nh-geo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOLD = [1, 0.76, 0.3], IRON = [0.08, 0.08, 0.09], WHITE = [0.95, 0.94, 0.91];

function tex(c, aniso = 8) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
// words that fill a box: the biggest size where every line fits
function fitText(g, lines, x, y, w, h, font, color, lh = 1.08) {
  let size = Math.floor(h / (lines.length * lh));
  g.font = `${font} ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  const widest = () => Math.max(...lines.map((l) => g.measureText(l).width));
  while (widest() > w && size > 8) { size -= 2; g.font = `${font} ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const y0 = y + h / 2 - (lines.length - 1) * size * lh / 2;
  lines.forEach((l, i) => g.fillText(l, x + w / 2, y0 + i * size * lh));
}

// ---------- canvases ----------
export const CANVAS = {
  // a church's letter board: black letters slotted into white felt rows, a little crooked
  letterBoard(lines, opt = {}) {
    const [c, g] = canvas(1024, 512);
    g.fillStyle = opt.bg || '#f4f1e8'; g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = opt.rule || 'rgba(0,0,0,0.08)'; g.lineWidth = 3;
    for (let y = 40; y < 512; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    const R = seeded(opt.seed || 5);
    const size = opt.size || 92;
    g.font = `700 ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`; g.textBaseline = 'middle';
    const y0 = 256 - (lines.length - 1) * size * 0.58;
    lines.forEach((l, i) => {
      // letter by letter, each one set by hand
      const w = g.measureText(l).width; let x = 512 - w / 2;
      for (const ch of l) { g.save(); g.translate(x, y0 + i * size * 1.16 + (R() - 0.5) * 4); g.rotate((R() - 0.5) * 0.05); g.fillStyle = opt.ink || '#141414'; g.fillText(ch, 0, 0); g.restore(); x += g.measureText(ch).width; }
    });
    return tex(c);
  },
  // words cut across a frieze: one line of spaced capitals on a canvas the shape of the strip they're
  // on (w x h metres). (On a letter board's 2:1 sheet, squeezed onto the courthouse's 12:1 frieze,
  // COURT ADJOURNED ran off both ends and came out six times too wide)
  frieze(text, w, h, opt = {}) {
    const W = 2048, H = Math.round(W * h / w), [c, g] = canvas(W, H);
    g.fillStyle = opt.bg || '#e8e4d8'; g.fillRect(0, 0, W, H);
    const font = (s) => `700 ${s}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    let size = Math.round(H * 0.7); g.font = font(size);
    const gap = () => size * 0.28, span = () => [...text].reduce((s, ch) => s + g.measureText(ch).width, 0) + gap() * (text.length - 1);
    if (span() > W * 0.9) { size = Math.floor(size * W * 0.9 / span()); g.font = font(size); }
    g.fillStyle = opt.ink || '#3a3a40'; g.textBaseline = 'middle';
    let x = (W - span()) / 2;
    for (const ch of text) { g.fillText(ch, x, H / 2 + size * 0.04); x += g.measureText(ch).width + gap(); }
    return tex(c);
  },
  // the receipt: thermal paper, item lines, a total, a barcode (no words: you know it's a receipt)
  receipt() {
    const [c, g] = canvas(256, 1024), R = seeded(31);
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 256, 1024);
    g.fillStyle = '#2a2a2e';
    g.fillRect(58, 40, 140, 26); g.fillRect(84, 76, 88, 12); g.fillRect(70, 96, 116, 10);
    for (let y = 150; y < 790; y += 30) {
      g.fillStyle = '#4a4a50'; g.fillRect(22, y, 40 + R() * 90, 9); g.fillRect(186, y, 46, 9);
      if (R() < 0.3) { g.fillStyle = '#8a8a90'; g.fillRect(34, y + 13, 30 + R() * 60, 6); }
    }
    g.fillStyle = '#6a6a70'; for (let x = 18; x < 238; x += 12) g.fillRect(x, 812, 7, 3);
    g.fillStyle = '#1a1a1e'; g.fillRect(22, 836, 80, 18); g.fillRect(170, 836, 64, 18);
    for (let x = 30, k = 0; x < 226; k++) { const w = 1 + Math.floor(R() * 4); if (k % 2 === 0) g.fillRect(x, 900, w * 2, 70); x += w * 2 + 1; }
    return tex(c, 4);
  },
  // the mirror: a soft silver, a man rehearsing in it (three poses)
  mirror() {
    const [c, g] = canvas(1024, 512);
    for (let k = 0; k < 3; k++) {
      const x0 = k * 341;
      const gr = g.createLinearGradient(x0, 0, x0 + 341, 512);
      gr.addColorStop(0, '#dfe8ee'); gr.addColorStop(0.45, '#aab8c4'); gr.addColorStop(0.55, '#c8d4dc'); gr.addColorStop(1, '#8a9aa8');
      g.fillStyle = gr; g.fillRect(x0, 0, 341, 512);
      // him: head, shoulders, the tie, his hands doing the talking
      g.fillStyle = '#26303a';
      const cx = x0 + 170;
      g.beginPath(); g.ellipse(cx, 190, 48, 58, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx - 120, 512); g.quadraticCurveTo(cx - 118, 300, cx - 40, 268); g.lineTo(cx + 40, 268); g.quadraticCurveTo(cx + 118, 300, cx + 120, 512); g.fill();
      g.fillStyle = '#8a2a30'; g.beginPath(); g.moveTo(cx, 272); g.lineTo(cx - 12, 300); g.lineTo(cx, 400); g.lineTo(cx + 12, 300); g.fill();
      g.fillStyle = '#26303a';
      const arm = (sx, ex, ey, hx, hy) => { g.lineWidth = 34; g.lineCap = 'round'; g.strokeStyle = '#26303a'; g.beginPath(); g.moveTo(cx + sx, 300); g.lineTo(cx + ex, ey); g.lineTo(cx + hx, hy); g.stroke(); g.beginPath(); g.arc(cx + hx, hy, 22, 0, Math.PI * 2); g.fill(); };
      if (k === 0) { arm(-80, -140, 330, -120, 230); arm(80, 140, 330, 120, 230); }          // "hands up"
      if (k === 1) { arm(80, 150, 320, 175, 225); arm(-80, -110, 400, -60, 380); }         // the finger in the air
      if (k === 2) { arm(-80, -40, 360, 20, 330); arm(80, 40, 360, -20, 340); }            // hand on heart
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x0 + 30, 0); g.lineTo(x0 + 120, 0); g.lineTo(x0 + 10, 512); g.lineTo(x0 - 60, 512); g.fill();
    }
    return tex(c);
  },
  // the tear-off calendar's pages: a day a cell, red for Sunday
  calendar() {
    const [c, g] = canvas(1024, 256);
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON'];
    days.forEach((d, i) => {
      const x = i * 128;
      g.fillStyle = '#fbfaf6'; g.fillRect(x + 2, 0, 124, 256);
      g.fillStyle = i === 6 ? '#d8202a' : '#1a1a1e'; g.fillRect(x + 2, 0, 124, 58);
      g.fillStyle = '#ffffff'; g.font = '700 40px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d, x + 64, 31);
      g.fillStyle = i === 6 ? '#d8202a' : '#1a1a1e'; g.font = '700 128px "Arial Narrow", Arial, sans-serif'; g.fillText(String(12 + i), x + 64, 160);
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 7; k++) g.fillRect(x + 10 + k * 16, 4, 6, 6);
    });
    return tex(c);
  },
  // the fingerprint under the glass
  fingerprint() {
    const [c, g] = canvas(512, 512);
    g.clearRect(0, 0, 512, 512);
    // the glass: faint, a highlight across the top
    const gr = g.createRadialGradient(200, 160, 20, 256, 256, 260); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.35, 'rgba(225,240,250,0.22)'); gr.addColorStop(1, 'rgba(200,225,240,0.3)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(30,24,40,0.9)'; g.lineWidth = 7; g.lineCap = 'round';
    for (let k = 0; k < 15; k++) {
      const r = 18 + k * 14;
      g.beginPath();
      const a0 = -Math.PI * (0.05 + 0.03 * Math.sin(k)), a1 = Math.PI * (1.05 + 0.03 * Math.cos(k * 1.7));
      for (let a = a0; a <= a1 + 0.001; a += 0.05) { const rr = r * (1 + 0.06 * Math.sin(a * 3 + k)); const x = 256 + Math.cos(a) * rr * 0.82, y = 270 - Math.sin(a) * rr; if (a === a0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
      if (k > 3) { g.beginPath(); g.moveTo(256 - r * 0.82, 270); g.quadraticCurveTo(256 - r * 0.6, 270 + r * 0.6, 256 - 40 + k * 4, 470); g.stroke(); g.beginPath(); g.moveTo(256 + r * 0.82, 270); g.quadraticCurveTo(256 + r * 0.6, 270 + r * 0.6, 256 + 40 - k * 4, 470); g.stroke(); }
    }
    return tex(c);
  },
  // the newspaper: the masthead, the headline, a photo of a lawn, columns of grey
  newspaper(head) {
    const [c, g] = canvas(768, 1024), R = seeded(77);
    g.fillStyle = '#efe9da'; g.fillRect(0, 0, 768, 1024);
    g.fillStyle = '#1a1a1a'; g.fillRect(30, 30, 708, 6); g.fillRect(30, 150, 708, 4); g.fillRect(30, 160, 708, 2);
    g.fillStyle = '#2a2a2a'; for (let x = 60; x < 708; x += 26) g.fillRect(x, 60, 14 + R() * 6, 70);
    fitText(g, head, 40, 180, 688, 230, 900, '#141414', 1.0);
    g.fillStyle = '#8a9a7a'; g.fillRect(40, 430, 420, 300);
    g.fillStyle = '#6a8a5a'; g.fillRect(40, 600, 420, 130);
    g.fillStyle = '#c8b8a0'; g.fillRect(150, 470, 200, 130); g.fillStyle = '#7a4a3a'; g.beginPath(); g.moveTo(130, 480); g.lineTo(250, 420); g.lineTo(370, 480); g.fill();
    g.fillStyle = '#9a9a96';
    for (let col = 0; col < 2; col++) for (let y = 440; y < 980; y += 16) g.fillRect(480 + col * 0, y, 250 - (R() < 0.15 ? 90 : 0), 7);
    for (let y = 750; y < 980; y += 16) g.fillRect(40, y, 420 - (R() < 0.15 ? 120 : 0), 7);
    return tex(c);
  },
  // the lie detector's chart: paper with a grid (the pens draw on it live)
  chart() {
    const [c, g] = canvas(512, 256);
    g.fillStyle = '#f4f0e2'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = 'rgba(200,60,60,0.25)'; g.lineWidth = 1;
    for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let y = 0; y < 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    const t = tex(c, 4); t.wrapS = THREE.RepeatWrapping; return t;
  },
  // painted pictures for the frames in the hall: a sunny house, a donut, a tooth, a mailbox, a lawn chair, a car
  paintings() {
    const [c, g] = canvas(1536, 512);
    const scene = (i, draw) => { g.save(); g.translate(i * 256, 0); g.beginPath(); g.rect(0, 0, 256, 512); g.clip(); draw(); g.restore(); };
    const sky = (top, low) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); };
    scene(0, () => { sky('#6aa0e8', '#cfe2f0'); g.fillStyle = '#5a9a4a'; g.fillRect(0, 360, 256, 152); g.fillStyle = '#f2c8d8'; g.fillRect(60, 250, 136, 120); g.fillStyle = '#6a3a3a'; g.beginPath(); g.moveTo(44, 256); g.lineTo(128, 180); g.lineTo(212, 256); g.fill(); g.fillStyle = '#3a5a8a'; g.fillRect(112, 310, 32, 60); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(210, 70, 30, 0, 6.3); g.fill(); });
    scene(1, () => { sky('#f8e0e8', '#f4c8d4'); g.fillStyle = '#e8a060'; g.beginPath(); g.arc(128, 256, 92, 0, 6.3); g.fill(); g.fillStyle = '#ff6aa8'; g.beginPath(); g.arc(128, 248, 84, 0, 6.3); g.fill(); g.fillStyle = '#f8e0e8'; g.beginPath(); g.arc(128, 252, 30, 0, 6.3); g.fill(); ['#fff', '#4ac8ff', '#ffe040', '#7ae07a'].forEach((cc, k) => { g.fillStyle = cc; for (let j = 0; j < 6; j++) { const a = j * 1.1 + k * 0.4, r = 50 + (j % 2) * 14; g.fillRect(128 + Math.cos(a) * r, 248 + Math.sin(a) * r, 12, 4); } }); });
    scene(2, () => { sky('#c8e8f0', '#e8f4f8'); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(128, 230, 70, 60, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(98, 300, 22, 70, 0.15, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(158, 300, 22, 70, -0.15, 0, 6.3); g.fill(); g.fillStyle = 'rgba(120,180,220,0.5)'; g.beginPath(); g.ellipse(104, 206, 14, 22, -0.4, 0, 6.3); g.fill(); });
    scene(3, () => { sky('#8ab8e8', '#d8e8f0'); g.fillStyle = '#6a9a4a'; g.fillRect(0, 380, 256, 132); g.fillStyle = '#6a4a30'; g.fillRect(120, 260, 16, 140); g.fillStyle = '#2a4a8a'; g.fillRect(84, 214, 88, 56); g.beginPath(); g.arc(128, 214, 44, Math.PI, 0); g.fill(); g.fillStyle = '#e8202a'; g.fillRect(170, 196, 8, 40); });
    scene(4, () => { sky('#78b0e8', '#d0e4f0'); g.fillStyle = '#5a9a4a'; g.fillRect(0, 380, 256, 132); g.strokeStyle = '#f0f0f0'; g.lineWidth = 10; g.beginPath(); g.moveTo(70, 400); g.lineTo(110, 300); g.lineTo(190, 300); g.moveTo(110, 300); g.lineTo(90, 200); g.moveTo(190, 300); g.lineTo(200, 400); g.stroke(); g.fillStyle = '#3aa0a0'; for (let k = 0; k < 5; k++) g.fillRect(96 - k * 2, 210 + k * 18, 14, 10); for (let k = 0; k < 5; k++) g.fillRect(112 + k * 16, 290, 10, 14); });
    scene(5, () => { sky('#f0c890', '#f8e8d0'); g.fillStyle = '#8a8a8a'; g.fillRect(0, 380, 256, 132); g.fillStyle = '#d8ccb4'; g.fillRect(36, 300, 184, 54); g.fillRect(76, 262, 104, 44); g.fillStyle = '#2a3a4a'; g.fillRect(84, 270, 40, 30); g.fillRect(132, 270, 40, 30); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(80, 356, 20, 0, 6.3); g.arc(176, 356, 20, 0, 6.3); g.fill(); g.fillStyle = '#ffb000'; g.fillRect(214, 314, 8, 10); });
    return tex(c);
  },
  // the edge of town: green, white letters, both sides
  townSign(lines, sub) {
    const [c, g] = canvas(1024, 400);
    g.fillStyle = '#0b5d3b'; g.fillRect(0, 0, 1024, 400);
    g.strokeStyle = '#f2f2ea'; g.lineWidth = 12; g.strokeRect(18, 18, 988, 364);
    fitText(g, lines, 60, 40, 904, sub ? 220 : 320, 700, '#f2f2ea', 1.0);
    if (sub) fitText(g, [sub], 120, 262, 784, 96, 600, '#f2f2ea');
    return tex(c);
  },
  // the folder going into the shredder: manila, its tab, EVIDENCE stamped across it in red
  folder() {
    const [c, g] = canvas(512, 704);
    g.fillStyle = '#e8c878'; g.fillRect(0, 64, 512, 640);
    g.fillRect(40, 0, 180, 80);
    g.fillStyle = 'rgba(120,80,20,0.18)'; for (let y = 120; y < 700; y += 26) g.fillRect(30, y, 452, 2);
    g.save(); g.translate(256, 380); g.rotate(-0.22);
    g.strokeStyle = '#c4141e'; g.lineWidth = 12; g.strokeRect(-210, -70, 420, 140);
    // (sized to the stamp's box: at a fixed 96px the word ran out past it and off the folder)
    g.fillStyle = '#c4141e'; g.font = '900 96px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ew = g.measureText('EVIDENCE').width; if (ew > 372) g.font = `900 ${Math.floor(96 * 372 / ew)}px "Arial Black", Impact, sans-serif`;
    g.fillText('EVIDENCE', 0, 4);
    g.restore();
    return tex(c);
  },
  // police tape
  tape() {
    const [c, g] = canvas(1024, 64);
    g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 1024, 64);
    // four whole words to the strip, each with its slash, so it repeats along the tape without a cut
    // one (every 300 px left the fourth CAUTION running off the end: CAUTI)
    g.fillStyle = '#141414'; g.font = '800 40px "Arial Narrow", Arial, sans-serif'; g.textBaseline = 'middle';
    const cw = g.measureText('CAUTION').width; if (cw > 168) g.font = `800 ${Math.floor(40 * 168 / cw)}px "Arial Narrow", Arial, sans-serif`;
    const tw = Math.min(cw, 168);
    for (let k = 0; k < 4; k++) {
      const x = k * 256 + 16; g.fillText('CAUTION', x, 33);
      const sx = x + tw + 18; g.beginPath(); g.moveTo(sx, 54); g.lineTo(sx + 30, 10); g.lineTo(sx + 46, 10); g.lineTo(sx + 16, 54); g.fill();
    }
    const t = tex(c, 4); t.wrapS = THREE.RepeatWrapping; return t;
  },
};

// ---------- geometry ----------
export const SETS = {
  // the dentist's sign: a big white tooth on a pole
  tooth() {
    const parts = [];
    parts.push(ni(sph(1.6, 1.2, 0.78, 0.8, 0, 9.7, 0, 24, 16)));
    for (const x of [-0.85, 0.85]) {
      parts.push(ni(sph(0.95, 1, 0.8, 0.85, x, 10.45, 0, 16, 12)));
      const root = new THREE.CylinderGeometry(0.62, 0.16, 2.9, 14); root.rotateZ(-x * 0.16); root.translate(x * 1.12, 7.85, 0); parts.push(ni(root));
    }
    return merge(parts.map(bare));
  },
  toothPole() { return bare(cyl(0.16, 0.2, 6.8, 8, 0, 3.4, 0)); },
  // a stack of pancakes with butter and the syrup running down, on a pole: BRUNCH
  pancakes() {
    const parts = [], cake = [0.86, 0.6, 0.3], edge = [0.72, 0.46, 0.2], syrup = [0.55, 0.22, 0.05];
    parts.push(paint(cyl(0.22, 0.28, 8, 8, 0, 4, 0), [0.2, 0.2, 0.22]));
    parts.push(paint(cyl(3.3, 3.3, 0.25, 32, 0, 8.1, 0), [0.95, 0.95, 0.95]));
    for (let k = 0; k < 6; k++) { parts.push(paint(cyl(2.7 - (k % 2) * 0.08, 2.75, 0.62, 28, 0, 8.55 + k * 0.62, 0), k % 2 ? cake : edge)); }
    parts.push(paint(cyl(2.4, 2.65, 0.2, 28, 0, 12.3, 0), syrup));
    for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.3, l = 0.8 + (k % 3) * 0.7; parts.push(paint(sph(0.24, 1, l, 0.6, Math.cos(a) * 2.68, 12.1 - l * 0.6, Math.sin(a) * 2.68, 6, 6), syrup)); }
    parts.push(paint(box(1.2, 0.55, 1.0, 0.3, 12.65, 0.2), [1, 0.92, 0.5]));
    return merge(parts);
  },
  // the interrogation lamp: an enamel shade on a long cord, the bulb under it
  lampShade() {
    const parts = [];
    const shade = new THREE.CylinderGeometry(0.9, 5.2, 3.2, 32, 1, true); shade.translate(0, 1.6, 0);
    parts.push(paint(shade, (P, i) => [0.16, 0.34, 0.24]));
    parts.push(paint(cyl(0.95, 0.9, 0.7, 16, 0, 3.5, 0), [0.14, 0.3, 0.2]));
    parts.push(paint(cyl(0.08, 0.08, 40, 5, 0, 23.8, 0), [0.1, 0.1, 0.1]));
    const rim = new THREE.TorusGeometry(5.2, 0.12, 6, 40); rim.rotateX(Math.PI / 2); rim.translate(0, 0, 0); parts.push(paint(rim, [0.85, 0.85, 0.8]));
    return merge(parts);
  },
  bulb() { return paint(sph(1.0, 1, 1.15, 1, 0, 0.7, 0, 16, 12), [1, 1, 0.92]); },
  // a cone of light under the lamp (unit: radius 1 at the bottom, 1 high, apex at the top)
  lightCone() { const g = new THREE.ConeGeometry(1, 1, 32, 1, true); g.translate(0, -0.5, 0); return bare(g); },
  // the receipt, hanging from its clip, curled at the bottom
  receipt() {
    // a long strip, waving a little, its last third rolled up into a curl the way they come off the till
    const L = 13, g = new THREE.PlaneGeometry(2.4, L, 1, 48), p = g.attributes.position.array, u0 = 0.66, r0 = 0.9;
    for (let i = 0; i < p.length; i += 3) {
      const u = (L / 2 - p[i + 1]) / L;
      if (u <= u0) { p[i + 1] = -u * L; p[i + 2] = Math.sin(u * 7.0) * 0.35; continue; }
      const s = (u - u0) * L, yS = -u0 * L, zS = Math.sin(u0 * 7.0) * 0.35;
      let th = 0, r = r0, acc = 0;
      while (acc < s) { const d = Math.min(0.05, s - acc); r = r0 * (1 - 0.45 * Math.min(1, th / (Math.PI * 4))); th += d / r; acc += d; }
      p[i + 1] = yS - r * Math.sin(th); p[i + 2] = zS + r * (1 - Math.cos(th));
    }
    g.computeVertexNormals();
    return g;
  },
  clip() { return merge([paint(box(2.8, 0.5, 0.4, 0, 0.1, 0), [0.25, 0.25, 0.28]), paint(cyl(0.06, 0.06, 20, 5, 0, 10.3, 0), [0.12, 0.12, 0.12])]); },
  // a dressing-room mirror: the frame, a row of round bulbs all round it (they're glows), on legs
  mirrorFrame() {
    const parts = [], W = 9, H = 12, y0 = 4;
    for (const [w, h, x, y] of [[W + 1.2, 0.7, 0, y0 + H + 0.35], [W + 1.2, 0.7, 0, y0 - 0.35], [0.7, H + 1.4, -W / 2 - 0.35, y0 + H / 2], [0.7, H + 1.4, W / 2 + 0.35, y0 + H / 2]]) parts.push(paint(box(w, h, 0.6, x, y, 0), [0.92, 0.88, 0.8]));
    for (const x of [-W / 2 + 0.6, W / 2 - 0.6]) parts.push(paint(box(0.4, y0, 0.4, x, y0 / 2, -0.3), [0.3, 0.3, 0.32]));
    parts.push(paint(box(W + 2, 0.4, 2.2, 0, 0.2, -0.3), [0.3, 0.3, 0.32]));
    return merge(parts);
  },
  mirrorFace() { const g = new THREE.PlaneGeometry(9, 12); g.translate(0, 10, 0.32); return g; },
  // the tear-off calendar on its wall: a block, the binding, the page (its own layer)
  calendarBlock() { return merge([paint(box(9, 12, 1.4, 0, 0, -0.75), [0.95, 0.94, 0.9]), paint(box(9.4, 1.6, 1.8, 0, 6.4, -0.6), [0.75, 0.1, 0.12]), paint(box(0.5, 18, 0.5, -3.5, -6, -1.6), [0.2, 0.2, 0.22]), paint(box(0.5, 18, 0.5, 3.5, -6, -1.6), [0.2, 0.2, 0.22])]); },
  calendarPage() { const g = new THREE.PlaneGeometry(8.6, 11.2, 4, 6); return g; },
  // the magnifying glass: a brass rim, the handle, the lens (its own layer)
  glassRim() {
    const parts = [];
    const r = new THREE.TorusGeometry(7, 0.55, 12, 56); parts.push(paint(r, [0.8, 0.62, 0.25]));
    parts.push(paint(cyl(0.7, 0.9, 1.6, 16, 0, -8.0, 0), [0.8, 0.62, 0.25]));
    parts.push(paint(cyl(0.75, 0.6, 9, 16, 0, -13.2, 0), [0.25, 0.12, 0.08]));
    return merge(parts);
  },
  lens() { const g = new THREE.CircleGeometry(6.6, 48); return g; },
  // a car wash: the tunnel, its sign band, the big brushes (their own layer)
  carWash() {
    const parts = [], blue = [0.2, 0.45, 0.85], white = WHITE;
    parts.push(paint(box(14, 8.5, 22, 0, 4.25, 0), white));
    parts.push(paint(box(14.4, 1.8, 22.4, 0, 9.3, 0), blue));
    for (let k = 0; k < 6; k++) parts.push(paint(box(14.5, 0.3, 0.3, 0, 7.6 - k * 1.2, 11.1), k % 2 ? [0.95, 0.3, 0.6] : [0.3, 0.8, 0.95]));
    parts.push(paint(box(9, 7.2, 0.3, 0, 3.6, 11.1), [0.05, 0.06, 0.08]));
    return merge(parts);
  },
  brush() {
    const parts = [paint(cyl(0.2, 0.2, 7, 8, 0, 3.5, 0), [0.5, 0.5, 0.55])];
    for (let k = 0; k < 24; k++) { const a = k * 0.785 + Math.floor(k / 8) * 0.39, y = 1.2 + Math.floor(k / 8) * 2.2; parts.push(paint(box(0.4, 1.9, 1.6, Math.cos(a) * 1.0, y, Math.sin(a) * 1.0).rotateY(-a), k % 2 ? [0.95, 0.35, 0.65] : [0.35, 0.8, 0.95])); }
    return merge(parts);
  },
  bubble() { return bare(new THREE.IcosahedronGeometry(1, 2)); },
  // the lie detector: a console on legs, three pens on arms over the chart (the chart and the
  // ink are drawn live)
  polygraph() {
    const parts = [], wood = [0.42, 0.26, 0.16], steel = [0.7, 0.72, 0.75];
    parts.push(paint(box(22, 12, 2.0, 0, 9, -1.4), wood));
    parts.push(paint(box(23, 0.8, 2.4, 0, 15.3, -1.2), [0.3, 0.18, 0.1]));
    for (const x of [-9, 9]) parts.push(paint(box(0.8, 3.2, 0.8, x, 1.6, -1.4), [0.2, 0.2, 0.22]));
    for (const x of [-10.2, 10.2]) parts.push(paint(cyl(0.9, 0.9, 9.5, 20, x, 9.2, 0).rotateZ(0), steel));
    for (let k = 0; k < 3; k++) parts.push(paint(sph(0.5, 1, 1, 1, -8.6 + k * 0.4, 13.2 - k * 3.2, 0.6, 8, 6), [0.85, 0.15, 0.12]));
    return merge(parts);
  },
  chartFace() { const g = new THREE.PlaneGeometry(18, 9.2); g.translate(0, 9.2, -0.38); return g; },
  pen() { return merge([paint(box(5.0, 0.18, 0.18, -2.5, 0, 0), [0.75, 0.75, 0.78]), paint(new THREE.ConeGeometry(0.22, 0.6, 8).rotateZ(Math.PI / 2).translate(0.3, 0, 0), [0.15, 0.15, 0.6])]); },
  ink() { return new THREE.PlaneGeometry(1, 1); },
  // the closet: a tall wardrobe, its doors (their own layer, they swing)
  // a painted wardrobe, cornice on top, feet under it; dark inside
  closet() {
    const parts = [], body = [0.95, 0.92, 0.86], trim = [0.85, 0.8, 0.72];
    parts.push(paint(box(10, 16, 5, 0, 8.6, -2.5), body));
    parts.push(paint(box(11, 1.2, 6, 0, 17.2, -2.4), trim), paint(box(11.4, 0.4, 6.2, 0, 17.9, -2.4), body));
    parts.push(paint(box(10.6, 0.8, 5.6, 0, 0.8, -2.5), trim));
    for (const x of [-4.6, 4.6]) for (const z of [-4.6, -0.4]) parts.push(paint(cyl(0.35, 0.25, 0.8, 8, x, 0.2, z), [0.6, 0.45, 0.3]));
    parts.push(paint(box(9.2, 14.4, 0.2, 0, 8.6, 0.02), [0.05, 0.04, 0.06]));
    return merge(parts);
  },
  closetDoor() {
    const parts = [], door = [0.96, 0.7, 0.78];
    parts.push(paint(box(4.6, 14.4, 0.5, 2.3, 0, 0), door));
    for (const y of [-3.6, 3.6]) parts.push(paint(box(3.6, 5.8, 0.2, 2.3, y, 0.3), [1, 0.86, 0.9]));
    parts.push(paint(sph(0.32, 1, 1, 1, 4.1, 0, 0.5, 8, 6), [0.95, 0.78, 0.35]));
    return merge(parts);
  },
  balloon() {
    const parts = [paint(sph(1, 1, 1.18, 1, 0, 0, 0, 14, 12), WALL), paint(new THREE.ConeGeometry(0.16, 0.3, 6).rotateX(Math.PI).translate(0, -1.25, 0), WALL)];
    const s = cyl(0.015, 0.015, 3.6, 3, 0, -3.1, 0); parts.push(paint(s, [0.9, 0.9, 0.9]));
    return merge(parts);
  },
  // the white church: the nave, the steeple with its open belfry, the spire
  church() {
    const parts = [], w = WHITE, roof = [0.3, 0.32, 0.36];
    parts.push(paint(box(14, 10, 26, 0, 5, -4), w));
    const nave = new THREE.Shape(); nave.moveTo(-8, 0); nave.lineTo(0, 6); nave.lineTo(8, 0);
    const r = new THREE.ExtrudeGeometry(nave, { depth: 27, bevelEnabled: false }); r.translate(0, 10, -17.5); parts.push(paint(r, roof));
    parts.push(paint(box(6, 15, 6, 0, 7.5, 10), w));
    parts.push(paint(box(5.2, 5, 5.2, 0, 17.5, 10), w));
    for (const [x, z] of [[-2.4, 7.6], [2.4, 7.6], [-2.4, 12.4], [2.4, 12.4]]) parts.push(paint(box(0.7, 5, 0.7, x, 17.5, z), w));
    parts.push(paint(box(6.4, 0.8, 6.4, 0, 20.4, 10), w), paint(box(6.4, 0.8, 6.4, 0, 15.2, 10), w));
    parts.push(paint(new THREE.ConeGeometry(3.6, 12, 4).rotateY(Math.PI / 4).translate(0, 26.8, 10), roof));
    parts.push(paint(box(0.25, 2.4, 0.25, 0, 34, 10), GOLD), paint(box(1.4, 0.25, 0.25, 0, 34.4, 10), GOLD));
    parts.push(paint(box(2.6, 5, 0.3, 0, 2.5, 13.05), [0.45, 0.12, 0.12]));
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) parts.push(paint(box(0.25, 4.6, 2.2, s * 7.05, 5, -12 + k * 5.5), [0.4, 0.5, 0.7]));
    return merge(parts);
  },
  bell() { const g = new THREE.CylinderGeometry(0.7, 1.6, 2.2, 16, 1, true); g.translate(0, -1.1, 0); return merge([paint(g, [0.85, 0.65, 0.25]), paint(sph(0.75, 1, 0.6, 1, 0, 0, 0, 10, 6), [0.85, 0.65, 0.25]), paint(sph(0.3, 1, 1, 1, 0, -2.0, 0, 6, 4), [0.4, 0.3, 0.15])]); },
  // a letter board on two posts, its frame (the face is its own layer)
  boardFrame(w = 12, h = 6) { return merge([paint(box(w + 1, h + 1, 0.6, 0, h / 2 + 3.5, -0.32), [0.92, 0.9, 0.86]), paint(box(w + 1.6, 0.6, 1.0, 0, h + 4.2, -0.3), [0.25, 0.25, 0.3]), paint(box(0.6, 3.6, 0.6, -w / 2 + 1, 1.8, -0.3), [0.92, 0.9, 0.86]), paint(box(0.6, 3.6, 0.6, w / 2 - 1, 1.8, -0.3), [0.92, 0.9, 0.86]), paint(box(w + 3, 1.2, 2.4, 0, 0.6, -0.3), [0.6, 0.55, 0.5])]); },
  boardFace(w = 12, h = 6) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2 + 3.5, 0.01); return g; },
  // a hoop over the road: speak in loopholes
  hoop() { return paint(new THREE.TorusGeometry(9, 0.55, 12, 64), WALL); },
  // the picture house: a marquee with chaser bulbs, a blade sign up the front, posters
  cinema() {
    const parts = [], brick = [0.62, 0.22, 0.2], cream = [0.95, 0.88, 0.72];
    parts.push(paint(box(20, 15, 18, 0, 7.5, 0), brick));
    parts.push(paint(box(20.6, 1.4, 18.6, 0, 15.4, 0), cream));
    parts.push(paint(box(16, 3.4, 5, 0, 6.2, 11.4), [0.1, 0.06, 0.08]));
    parts.push(paint(box(16.4, 0.5, 5.4, 0, 7.9, 11.4), GOLD), paint(box(16.4, 0.5, 5.4, 0, 4.5, 11.4), GOLD));
    for (const x of [-6.5, 6.5]) parts.push(paint(box(3.4, 4.6, 0.3, x, 2.6, 9.05), [0.9, 0.8, 0.35]));
    parts.push(paint(box(7, 4, 0.2, 0, 2.0, 9.05), [0.1, 0.08, 0.06]));
    return merge(parts);
  },
  // the hat and the sunglasses, floating over the road
  shades() {
    const parts = [], black = [0.04, 0.04, 0.05], lens = [0.08, 0.1, 0.16];
    for (const s of [-1, 1]) {
      const l = new THREE.CylinderGeometry(4.2, 4.2, 0.6, 32); l.rotateX(Math.PI / 2); l.scale(1.25, 0.95, 1); l.translate(s * 6.2, 0, 0); parts.push(paint(l, lens));
      const f = new THREE.TorusGeometry(4.25, 0.45, 8, 40); f.scale(1.25, 0.95, 1); f.translate(s * 6.2, 0, 0.1); parts.push(paint(f, black));
      parts.push(paint(box(0.6, 0.6, 14, s * 11.6, 1.6, -7), black));
    }
    parts.push(paint(box(3.0, 0.7, 0.6, 0, 1.6, 0.1), black));
    return merge(parts);
  },
  hat() {
    const parts = [], felt = [0.24, 0.2, 0.17], band = [0.08, 0.06, 0.05];
    const brim = new THREE.CylinderGeometry(10.5, 10.8, 0.6, 40); brim.scale(1, 1, 0.82); parts.push(paint(brim, felt));
    const crown = new THREE.CylinderGeometry(5.2, 6.2, 6.2, 32); crown.scale(1, 1, 0.8); crown.translate(0, 3.4, 0);
    const p = crown.attributes.position.array; for (let i = 0; i < p.length; i += 3) if (p[i + 1] > 6) p[i + 1] -= 1.2 * Math.max(0, 1 - Math.abs(p[i]) / 2.2);
    crown.computeVertexNormals(); parts.push(paint(crown, felt));
    const b = new THREE.CylinderGeometry(6.0, 6.25, 1.1, 32, 1, true); b.scale(1, 1, 0.8); b.translate(0, 1.2, 0); parts.push(paint(b, band));
    return merge(parts);
  },
  // the paper shredder: the bin, the head, the slot (the strips are their own layer)
  shredder() {
    const parts = [], body = [0.72, 0.74, 0.78];
    parts.push(paint(box(14, 12, 9, 0, 6, 0), body));
    parts.push(paint(box(15, 4, 10, 0, 14, 0), [0.22, 0.22, 0.25]));
    parts.push(paint(box(11, 0.5, 1.4, 0, 16.1, 0), [0.02, 0.02, 0.02]));
    parts.push(paint(box(1.2, 1.2, 0.3, 5.5, 14, 5.05), [0.2, 0.85, 0.3]));
    parts.push(paint(box(12, 3, 0.2, 0, 7, 4.55), [0.3, 0.32, 0.36]));
    return merge(parts);
  },
  folder() { return merge([paint(box(9, 0.15, 12, 0, 0, 0), [0.95, 0.8, 0.45]), paint(box(3, 0.16, 1.2, -2.5, 0, 6.3), [0.95, 0.8, 0.45])]); },
  strip() { const g = new THREE.PlaneGeometry(0.5, 1, 1, 4); g.translate(0, -0.5, 0); return paint(g, [0.97, 0.96, 0.93]); },
  // the front door over the road, in its frame: the door swings (its own layer)
  doorFrame() {
    const parts = [], trim = [0.95, 0.94, 0.9];
    parts.push(paint(box(1.6, 26, 1.6, -9.2, 13, 0), trim), paint(box(1.6, 26, 1.6, 9.2, 13, 0), trim), paint(box(20.0, 2.2, 1.8, 0, 27, 0), trim));
    parts.push(paint(tri([-10.4, 28.1, 0.95], [10.4, 28.1, 0.95], [0, 31.5, 0.95]), trim));
    parts.push(paint(box(19, 0.5, 4, 0, 0.25, 1), [0.55, 0.25, 0.2]));
    return merge(parts);
  },
  door() {
    const parts = [], red = [0.68, 0.1, 0.12];
    parts.push(paint(box(17, 25, 0.8, 8.5, 12.5, 0), red));
    for (const [x, y, w, h] of [[4.3, 18.5, 6.4, 9.6], [12.7, 18.5, 6.4, 9.6], [4.3, 6.6, 6.4, 9.6], [12.7, 6.6, 6.4, 9.6]]) parts.push(paint(box(w, h, 0.3, x, y, 0.5), [0.58, 0.08, 0.1]));
    parts.push(paint(sph(0.6, 1, 1, 1, 15.6, 12.5, 0.8, 10, 8), GOLD));
    parts.push(paint(box(4, 0.8, 0.4, 8.5, 16, 0.6), GOLD));
    return merge(parts);
  },
  // a gilded frame for the hall (its picture is its own layer); the big one is the same, bigger
  frame() {
    const parts = [];
    for (const [w, h, x, y, d] of [[9, 0.7, 0, 9.7, 0.5], [9, 0.7, 0, 3.3, 0.5], [0.7, 7.1, -4.15, 6.5, 0.5], [0.7, 7.1, 4.15, 6.5, 0.5],
      [9.2, 0.2, 0, 10.05, 0.7], [9.2, 0.2, 0, 2.95, 0.7], [0.2, 7.3, -4.5, 6.5, 0.7], [0.2, 7.3, 4.5, 6.5, 0.7],
      [7.6, 0.12, 0, 9.33, 0.62], [7.6, 0.12, 0, 3.67, 0.62], [0.12, 5.8, -3.78, 6.5, 0.62], [0.12, 5.8, 3.78, 6.5, 0.62]]) parts.push(bare(box(w, h, d, x, y, 0)));
    for (const [x, y] of [[-4.15, 9.7], [4.15, 9.7], [-4.15, 3.3], [4.15, 3.3]]) parts.push(bare(sph(0.6, 1, 1, 0.5, x, y, 0.25, 8, 6)));
    return merge(parts);
  },
  frameWire() { const parts = []; for (const x of [-3.6, 3.6]) parts.push(bare(beam(V(x, 10.2, -0.1), V(0, 40, -0.1), 0.05))); return merge(parts); },
  picture() { const g = new THREE.PlaneGeometry(7.4, 5.6); g.translate(0, 6.5, 0.02); return g; },
  easel() { const parts = []; for (const [x, rz, rx, z] of [[-3, 0.1, 0.12, 0.6], [3, -0.1, 0.12, 0.6], [0, 0, -0.25, -2.5]]) { const l = box(0.4, 13, 0.4, 0, 6.5, 0); l.rotateZ(rz); l.rotateX(rx); l.translate(x, 0, z); parts.push(paint(l, [0.5, 0.36, 0.2])); } parts.push(paint(box(9, 0.5, 1.2, 0, 2.7, 0.7), [0.5, 0.36, 0.2])); return merge(parts); },
  // the courthouse: steps, six columns, the pediment, a dome with its clock
  courthouse() {
    const parts = [], stone = [0.93, 0.91, 0.86], shade = [0.8, 0.78, 0.74];
    for (let k = 0; k < 4; k++) parts.push(paint(box(30 - k * 0.8, 0.6, 5 - k * 0.6, 0, 0.3 + k * 0.6, 11 - k * 0.3), shade));
    parts.push(paint(box(28, 16, 20, 0, 10.4, -1), stone));
    parts.push(paint(box(28, 1.4, 7, 0, 18.4, 10.2), stone));
    for (let k = 0; k < 6; k++) { parts.push(paint(cyl(0.9, 1.0, 14.6, 16, -11 + k * 4.4, 10.1, 11.4), [0.97, 0.96, 0.92])); parts.push(paint(box(2.4, 0.6, 2.4, -11 + k * 4.4, 2.7, 11.4), shade), paint(box(2.4, 0.6, 2.4, -11 + k * 4.4, 17.5, 11.4), shade)); }
    parts.push(paint(tri([-14.5, 19.1, 13.8], [14.5, 19.1, 13.8], [0, 24.6, 13.8]), stone));
    const ped = new THREE.Shape(); ped.moveTo(-15, 0); ped.lineTo(0, 5.8); ped.lineTo(15, 0);
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 8, bevelEnabled: false }); pg.translate(0, 19.0, 6.0); parts.push(paint(pg, [0.4, 0.42, 0.46]));
    parts.push(paint(cyl(7, 7.4, 6, 24, 0, 21.4, -2), stone));
    const dome = new THREE.SphereGeometry(7.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(0, 24.4, -2); parts.push(paint(dome, [0.55, 0.68, 0.62]));
    parts.push(paint(cyl(1.0, 1.2, 3, 12, 0, 32.6, -2), stone), paint(sph(0.9, 1, 1, 1, 0, 34.6, -2, 10, 8), GOLD));
    for (let k = 0; k < 5; k++) parts.push(paint(box(2.2, 6, 0.3, -9 + k * 4.5, 8, 9.1), [0.3, 0.4, 0.55]));
    return merge(parts);
  },
  clockFace() { const g = new THREE.CircleGeometry(2.6, 32); g.translate(0, 21.6, 5.05); return g; },
  // the gavel, over the road: the head on its handle (it swings down), the block it hits
  gavel() {
    const parts = [], wood = [0.45, 0.24, 0.12], band = [0.9, 0.75, 0.35];
    const head = new THREE.CylinderGeometry(2.2, 2.2, 7.5, 24); head.rotateZ(Math.PI / 2); parts.push(paint(head, wood));
    for (const x of [-2.8, 2.8]) { const b = new THREE.CylinderGeometry(2.3, 2.3, 0.5, 24); b.rotateZ(Math.PI / 2); b.translate(x, 0, 0); parts.push(paint(b, band)); }
    parts.push(paint(cyl(0.55, 0.7, 16, 12, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, -8), wood));
    // the pivot at the end of the handle: the head 16 m out along +z
    return merge(parts).translate(0, 0, 16);
  },
  block() { return merge([paint(cyl(4.2, 4.6, 1.8, 28, 0, 0.9, 0), [0.4, 0.22, 0.1]), paint(cyl(4.4, 4.4, 0.3, 28, 0, 1.9, 0), [0.9, 0.75, 0.35])]); },
  // a fire truck with its water cannon on the ladder, for the send-off
  fireTruck() {
    const parts = [], red = [0.8, 0.08, 0.06], chrome = [0.85, 0.85, 0.88], dark = [0.08, 0.08, 0.09];
    parts.push(paint(box(2.6, 2.4, 10, 0, 1.9, 0), red));
    parts.push(paint(box(2.6, 1.3, 2.8, 0, 3.75, 3.2), red));
    parts.push(paint(box(2.4, 1.0, 0.1, 0, 3.7, 4.62), [0.25, 0.35, 0.45]));
    parts.push(paint(box(2.7, 0.3, 10.2, 0, 1.4, 0), chrome));
    for (const z of [3.4, -1.6, -3.4]) for (const s of [-1, 1]) parts.push(paint(cyl(0.55, 0.55, 0.4, 14, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 1.25, 0.55, z), dark));
    parts.push(paint(box(0.9, 0.3, 0.5, -0.5, 4.5, 3.6), [0.95, 0.1, 0.1]), paint(box(0.9, 0.3, 0.5, 0.5, 4.5, 3.6), [0.95, 0.1, 0.1]));
    const lad = [];
    for (const s of [-1, 1]) lad.push(paint(box(0.12, 0.12, 9, s * 0.5, 0, 0), chrome));
    for (let k = 0; k < 18; k++) lad.push(paint(box(1.0, 0.08, 0.08, 0, 0, -4.4 + k * 0.5), chrome));
    lad.push(paint(cyl(0.18, 0.28, 1.6, 8, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0.3, 5.2), [0.85, 0.7, 0.3]));
    for (const g of lad) { g.rotateX(-0.7); g.translate(0, 4.4, -1.5); parts.push(g); }
    return merge(parts);
  },
  // the lookout: a stone wall along the edge, the viewer you put a coin in, a bench
  stoneWall() { const R = seeded(19), parts = []; parts.push(paint(box(0.9, 1.0, 6, 0, 0.5, 0), [0.62, 0.6, 0.56])); for (let k = 0; k < 5; k++) parts.push(paint(box(1.05, 0.25, 1.1, (R() - 0.5) * 0.1, 1.1, -2.4 + k * 1.2), [0.68 + R() * 0.06, 0.66, 0.6])); return merge(parts); },
  viewer() {
    const parts = [], green = [0.18, 0.42, 0.32], chrome = [0.82, 0.82, 0.85];
    parts.push(paint(cyl(0.18, 0.24, 2.6, 10, 0, 1.3, 0), green), paint(cyl(0.6, 0.7, 0.3, 14, 0, 0.15, 0), green));
    parts.push(paint(box(0.9, 0.6, 0.7, 0, 2.75, 0), green));
    const head = new THREE.CylinderGeometry(0.42, 0.5, 1.4, 14); head.rotateZ(Math.PI / 2); head.scale(1, 1, 1.3); head.translate(0, 3.35, 0); parts.push(paint(head, green));
    for (const s of [-1, 1]) { const e = new THREE.CylinderGeometry(0.22, 0.26, 0.5, 12); e.rotateX(Math.PI / 2); e.translate(s * 0.28, 3.4, -0.85); parts.push(paint(e, chrome)); const f = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12); f.rotateX(Math.PI / 2); f.translate(s * 0.28, 3.4, 0.85); parts.push(paint(f, [0.1, 0.1, 0.12])); }
    parts.push(paint(box(0.2, 0.3, 0.12, 0.3, 2.75, -0.38), chrome));
    return merge(parts);
  },
  bench() { const parts = [], wood = [0.55, 0.36, 0.2], iron = IRON; parts.push(paint(box(3.2, 0.12, 0.9, 0, 0.82, 0), wood), paint(box(3.2, 0.7, 0.1, 0, 1.3, -0.46).rotateX(-0.12), wood)); for (const x of [-1.4, 1.4]) parts.push(paint(box(0.12, 0.85, 0.9, x, 0.42, 0), iron), paint(box(0.12, 0.6, 0.12, x, 1.25, -0.45), iron)); return merge(parts); },
  townSignPosts() { return merge([paint(box(0.3, 7.8, 0.3, -4.2, 3.9, -0.12), [0.55, 0.57, 0.6]), paint(box(0.3, 7.8, 0.3, 4.2, 3.9, -0.12), [0.55, 0.57, 0.6]), paint(box(10.6, 4.4, 0.12, 0, 5.4, -0.2), [0.5, 0.52, 0.55])]); },
  townSignFace() { const g = new THREE.PlaneGeometry(10.4, 4.1); g.translate(0, 5.4, 0); return g; },
  // a road sign on its pole
  roadPole() { return bare(cyl(0.06, 0.06, 3.0, 6, 0, 1.5, -0.04)); },
  roadFace() { const g = new THREE.PlaneGeometry(1.3, 1.7); g.translate(0, 3.4, 0); return g; },
  // red string, pins (the evidence)
  thread() { return bare(box(0.035, 0.035, 1, 0, 0, 0.5)); },
  pin() { return bare(new THREE.SphereGeometry(0.12, 8, 6)); },
  // a polaroid on the string
  polaroid() { return merge([paint(box(0.9, 1.05, 0.02, 0, -0.55, 0), [0.97, 0.97, 0.95]), paint(box(0.76, 0.72, 0.03, 0, -0.47, 0), WALL)]); },
  // the police tape across the road (a long strip, from x -1 to 1)
  tape() { const g = new THREE.PlaneGeometry(2, 0.12, 24, 1); return g; },
  // the phone she tells it all on: a big pink rotary phone, its dial, the coiled cord
  phone() {
    const parts = [], pink = [0.96, 0.6, 0.72], deep = [0.85, 0.45, 0.58], white = [0.97, 0.96, 0.94];
    const body = new THREE.CylinderGeometry(3.6, 4.6, 3.6, 4, 1); body.rotateY(Math.PI / 4); body.scale(1.2, 1, 1); body.translate(0, 1.8, 0); parts.push(paint(body, pink));
    parts.push(paint(box(7.6, 0.5, 6.8, 0, 0.25, 0), deep));
    // the dial, tilted toward you, its finger holes
    const dial = new THREE.CylinderGeometry(2.0, 2.0, 0.35, 28); dial.rotateX(Math.PI / 2 - 0.55); dial.translate(0, 2.7, 2.4); parts.push(paint(dial, white));
    for (let k = 0; k < 10; k++) { const a = -0.6 + k * 0.48; const h = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 10); h.rotateX(Math.PI / 2 - 0.55); h.translate(Math.cos(a) * 1.35, 2.7 + Math.sin(a) * 1.35 * Math.cos(0.55), 2.45 + Math.sin(a) * 1.35 * Math.sin(0.55)); parts.push(paint(h, [0.25, 0.22, 0.24])); }
    parts.push(paint(cyl(0.5, 0.5, 0.42, 12, 0, 0, 0).rotateX(Math.PI / 2 - 0.55).translate(0, 2.7, 2.5), deep));
    // the cradle's two prongs
    for (const s of [-1, 1]) parts.push(paint(box(0.8, 1.0, 1.0, s * 2.6, 3.9, -0.6), deep));
    // the cord, coiling out the side
    for (let k = 0; k < 70; k++) { const u = k / 70, a = u * Math.PI * 22; parts.push(paint(sph(0.16, 1, 1, 1, 4.4 + u * 4.5 + Math.cos(a) * 0.35, 0.6 + Math.sin(a) * 0.35, -1.2 + u * 1.5, 5, 4), pink)); }
    return merge(parts);
  },
  handset() {
    const parts = [], pink = [0.96, 0.6, 0.72];
    parts.push(paint(cyl(0.55, 0.55, 6.4, 12, 0, 0, 0).rotateZ(Math.PI / 2), pink));
    for (const s of [-1, 1]) { const cup = new THREE.CylinderGeometry(1.0, 0.75, 1.4, 16); cup.translate(s * 3.0, -0.6, 0); parts.push(paint(cup, pink)); }
    return merge(parts);
  },
  // a parade balloon: a great red hand, fingers up, caught red-handed
  redHand() {
    const parts = [], red = [0.86, 0.06, 0.1], cuff = [1, 1, 1];
    parts.push(paint(sph(1, 2.3, 2.6, 1.1, 0, 0, 0, 16, 12), red));
    const fingers = [[-1.55, 2.9, 0.95, 0.12], [-0.5, 3.4, 1.05, 0.04], [0.55, 3.3, 1.0, -0.04], [1.5, 2.8, 0.9, -0.12]];
    for (const [x, y, r, lean] of fingers) { const f = new THREE.CapsuleGeometry(0.55 * r, 2.6 * r, 6, 10); f.rotateZ(lean); f.translate(x, y + 0.6, 0); parts.push(paint(f, red)); }
    const th = new THREE.CapsuleGeometry(0.6, 2.2, 6, 10); th.rotateZ(1.0); th.translate(-2.6, 0.2, 0.2); parts.push(paint(th, red));
    parts.push(paint(cyl(1.9, 1.9, 1.2, 18, 0, -2.6, 0).scale(1.15, 1, 0.55), cuff));
    for (const s of [-1, 1]) parts.push(paint(cyl(0.03, 0.03, 30, 3, s * 1.2, -18, 0), [0.85, 0.85, 0.85]));
    return merge(parts);
  },
  // a ribbon and its bow at the start line
  ribbonHalf() { return paint(box(1, 0.5, 0.06, 0.5, 0, 0), [0.88, 0.06, 0.12]); },
  bow() {
    const parts = [], red = [0.88, 0.06, 0.12];
    for (const s of [-1, 1]) { const l = new THREE.TorusGeometry(0.55, 0.18, 8, 16); l.scale(1.3, 0.8, 0.5); l.translate(s * 0.75, 0.15, 0); parts.push(paint(l, red)); parts.push(paint(box(0.35, 1.3, 0.06, s * 0.3, -0.7, 0).rotateZ(s * 0.3), red)); }
    parts.push(paint(sph(0.3, 1, 1, 0.7, 0, 0.1, 0, 8, 6), red));
    return merge(parts);
  },
};
