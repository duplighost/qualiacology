// Try Me Free!: the things on the breakfast table, about a hundred times life size (a cereal box is
// a tower block, a bowl a crater, she's the toy out of the box riding over them). Geometry only,
// vertex-coloured; the pictures (every box front with its song's picture on it, the back of the box,
// the nutrition facts, the TV's screens, the alphabet letters, the TRY ME FREE! starburst) are
// canvases made here. tmf-world.js puts them on the table; the pickup, a free sample box, is at the
// bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
export const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const tor = (R, r, rs, ts, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc);
// a rounded rectangle, w by h, `depth` thick, centred, its face to +z
function rrect(w, h, r, depth, seg = 6) {
  const s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, -depth / 2);
  return g;
}
const extrude = (shape, depth, seg = 10) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -depth / 2); return g; };
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const WHITE = rgb(0xfaf6f2), CREAM = rgb(0xf4ead8), RED = rgb(0xe8202e), CHERRY = rgb(0xc8102a), YELLOW = rgb(0xffd21a), GOLD = rgb(0xe8b84a),
  BLUE = rgb(0x2a6aff), SKY = rgb(0x8ad8ff), PINK = rgb(0xff6ab0), MILK = rgb(0xfbf8f4), CHROME = rgb(0xd8dce4), STEEL = rgb(0x8a909c),
  BLACK = rgb(0x14121a), DARK = rgb(0x2a2632), WOOD = rgb(0x6a4228), TOAST = rgb(0xd89a4a), ORANGE = rgb(0xff8a1a), GREEN = rgb(0x5ad860),
  PURPLE = rgb(0x8a4ae8), TEAL = rgb(0x2ad0c8), GREY = rgb(0xbab6c0), GLASS = rgb(0xdff0ff);

// Fonts: the site's own heavy face (loaded by the page) for the boxes
const DISPLAY = (s) => `400 ${s}px "Archivo Black", "Arial Black", Impact, sans-serif`;
const SANS = (w, s) => `${w} ${s}px "Inter", "Segoe UI", Arial, sans-serif`;
// text fitted to a width: shrinks the size until it fits
function fitText(g, txt, x, y, font, size, maxW, fill, stroke, sw) {
  let s = size; g.font = font(s);
  while (g.measureText(txt).width > maxW && s > 8) { s -= 2; g.font = font(s); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = sw ?? s * 0.18; g.strokeText(txt, x, y); }
  g.fillStyle = fill; g.fillText(txt, x, y);
  return s;
}
// a block of words broken over lines to fit a box, each line as large as the box allows
function fitLines(g, lines, cx, cy, w, h, font, fill, stroke, lh = 1.0) {
  let s = Math.floor(h / lines.length / lh);
  g.font = font(s);
  const widest = () => Math.max(...lines.map((l) => g.measureText(l).width));
  while (widest() > w && s > 8) { s -= 2; g.font = font(s); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const y0 = cy - ((lines.length - 1) * s * lh) / 2;
  lines.forEach((l, i) => {
    if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = s * 0.2; g.strokeText(l, cx, y0 + i * s * lh); }
    g.fillStyle = fill; g.fillText(l, cx, y0 + i * s * lh);
  });
  return s;
}
function starPath(g, x, y, r0, r1, n, rot = 0) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r1 : r0; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a cereal piece, an O, drawn flat
function loop(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x, y, r * 0.42, 0, Math.PI * 2, true); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, Math.PI * 2); g.fill(); }
const LOOPCOL = ['#ff3a4a', '#ffd21a', '#2ad86a', '#ff8a1a', '#a85aff', '#3ab8ff', '#ff6ab0'];
// the mascot: an O with a face, one eye shut when it winks
function mascot(g, x, y, r, wink, col = '#ffb43a') {
  g.save();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x, y, r * 0.38, 0, Math.PI * 2, true); g.fill();
  g.strokeStyle = 'rgba(120,50,0,0.5)'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.97, 0, Math.PI * 2); g.stroke();
  // eyes on the top of the ring, a grin along the bottom
  const ey = y - r * 0.68, ex = r * 0.34;
  for (const s of [-1, 1]) {
    if (wink && s > 0) { g.strokeStyle = '#1a0e08'; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(x + s * ex, ey + r * 0.04, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + s * ex, ey, r * 0.16, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(x + s * ex + r * 0.04, ey + r * 0.04, r * 0.08, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#1a0e08'; g.lineWidth = r * 0.08; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + r * 0.12, r * 0.74, Math.PI * 0.28, Math.PI * 0.72); g.stroke();
  g.restore();
}

// ---------- the boxes ----------
// The songs Try Me Free! takes its lines from, each a cereal of its own: its picture from the song
// list on the front in a bowl-shaped window, its name across the top, its number on the record in a
// starburst. Plus the cereal itself, TRY ME FREE!, the back of the box and its side.
export const QUOTED = [
  { id: 'pretty-until-proven-guilty', title: 'PRETTY UNTIL PROVEN GUILTY', num: 11, bg: '#f4e6c4', band: '#c8102a', ink: '#ffffff', star: '#1a1a2a', starInk: '#ffd86a' },
  { id: 'makeup-sex-at-your-funeral', title: 'MAKEUP SEX AT YOUR FUNERAL', num: 22, bg: '#2a1636', band: '#ff6a8a', ink: '#ffffff', star: '#fff4f6', starInk: '#2a1636' },
  { id: 'i-fucked-your-dad', title: 'I FUCKED YOUR DAD', num: 10, bg: '#f8f4ee', band: '#1a3a9a', ink: '#ffffff', star: '#e8202e', starInk: '#ffffff' },
  { id: 'overdose-aesthetic', title: 'OVERDOSE AESTHETIC', num: 8, bg: '#14080e', band: '#ff3a9a', ink: '#ffffff', star: '#ffe0ec', starInk: '#14080e' },
  { id: 'school-shooter-sweetheart', title: 'SCHOOL SHOOTER SWEETHEART', num: 15, bg: '#5a2ad0', band: '#2ad8c8', ink: '#14082a', star: '#ffd21a', starInk: '#5a2ad0' },
];
// cells of the art sheet: 0 TRY ME FREE!, 1-5 the five above, 6 the back, 7 the side, 8 COLLECT
// THEM ALL (the back panel stood up on its own), 9 NUTRITION FACTS (the side stood up), 10 the
// prize, 11 spare (plain)
export const CELL = { FREE: 0, BACK: 6, SIDE: 7, COLLECT: 8, FACTS: 9, PRIZE: 10, PLAIN: 11 };
export const ART_COLS = 4, ART_ROWS = 3, ART_W = 512, ART_H = 682;
const QUOTE_CELL = Object.fromEntries(QUOTED.map((q, i) => [q.id, i + 1]));
export const cellOf = (id) => QUOTE_CELL[id] ?? CELL.FREE;

function drawFree(g, W, H) {
  // the cereal: yellow, a red name, a blue starburst, a bowl of loops, the mascot leaning in
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, W, H);
  // sun rays
  g.save(); g.translate(W / 2, H * 0.62); for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.fillStyle = i % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(255,150,0,0.12)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -900); g.lineTo(60, -900); g.closePath(); g.fill(); } g.restore();
  g.fillStyle = '#e8202e'; g.fillRect(0, 0, W, 196);
  g.fillStyle = '#ffffff'; g.fillRect(0, 196, W, 10);
  fitLines(g, ['TRY ME', 'FREE!'], W / 2, 100, W - 50, 170, DISPLAY, '#ffffff', '#7a0010', 0.95);
  // the bowl
  const bx = W / 2, by = H * 0.7;
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(bx, by, 190, 44, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 46; i++) { const a = (i * 2.399) % (Math.PI * 2), rr2 = 30 + (i * 37 % 150); loop(g, bx + Math.cos(a) * rr2 * 1.05, by - 20 + Math.sin(a) * rr2 * 0.22 - (i % 5) * 6, 17, LOOPCOL[i % LOOPCOL.length]); }
  g.fillStyle = '#2a6aff'; g.beginPath(); g.moveTo(bx - 200, by); g.bezierCurveTo(bx - 190, by + 150, bx + 190, by + 150, bx + 200, by); g.closePath(); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(bx - 200, by + 4, 400, 10);
  mascot(g, 96, H * 0.46, 70, true);
  // the starburst
  g.fillStyle = '#2a6aff'; starPath(g, W - 110, 300, 92, 70, 14, 0.1); g.fill();
  fitLines(g, ['NOW', 'WITH', 'MORE!'], W - 110, 300, 120, 110, DISPLAY, '#ffffff');
  g.fillStyle = '#e8202e'; g.fillRect(0, H - 56, W, 56);
  fitText(g, 'NET WT 42 SONGS', W / 2, H - 28, DISPLAY, 30, W - 60, '#ffffff');
}
function drawQuoted(g, W, H, q, img) {
  g.fillStyle = q.bg; g.fillRect(0, 0, W, H);
  // the name band
  g.fillStyle = q.band; g.fillRect(0, 0, W, 214);
  const words = q.title.split(' '), lines = [];
  for (const w of words) { const last = lines[lines.length - 1]; if (last && (last + ' ' + w).length <= 11) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); }
  fitLines(g, lines, W / 2, 107, W - 40, 186, DISPLAY, q.ink, 'rgba(0,0,0,0.35)', 1.0);
  // the picture in a bowl-shaped window
  const wx = 36, wy = 244, ww = W - 72, wh = 300;
  g.save();
  g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + ww, wy); g.lineTo(wx + ww, wy + wh * 0.42); g.bezierCurveTo(wx + ww, wy + wh * 1.1, wx, wy + wh * 1.1, wx, wy + wh * 0.42); g.closePath();
  g.fillStyle = '#000000'; g.fill(); g.clip();
  if (img) { const k = Math.max(ww / img.width, (wh * 0.95) / img.height); const iw = img.width * k, ih = img.height * k; g.drawImage(img, wx + (ww - iw) / 2, wy + (wh * 0.95 - ih) / 2 - 10, iw, ih); }
  else { const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, q.band); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh); }
  g.restore();
  g.strokeStyle = '#ffffff'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + ww, wy); g.lineTo(wx + ww, wy + wh * 0.42); g.bezierCurveTo(wx + ww, wy + wh * 1.1, wx, wy + wh * 1.1, wx, wy + wh * 0.42); g.closePath(); g.stroke();
  // its number on the record
  g.fillStyle = q.star; starPath(g, W - 90, 250, 78, 58, 12, 0.13); g.fill();
  fitLines(g, ['NO.', String(q.num).padStart(2, '0')], W - 90, 250, 92, 92, DISPLAY, q.starInk, null, 0.95);
  // loops spilling along the bottom, and the line every box carries
  for (let i = 0; i < 14; i++) loop(g, 40 + i * 34 + (i % 2) * 8, H - 108 + (i % 3) * 7, 15, LOOPCOL[(i * 3) % LOOPCOL.length]);
  g.fillStyle = q.band; g.fillRect(0, H - 64, W, 64);
  fitText(g, 'COLLECT THEM ALL', W / 2, H - 32, DISPLAY, 34, W - 60, q.ink);
}
// the back of every box: COLLECT THEM ALL, the record as a sheet of little boxes, and a maze
function drawBack(g, W, H, songs) {
  g.fillStyle = '#ffe9a8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8202e'; g.fillRect(0, 0, W, 110);
  fitLines(g, ['COLLECT', 'THEM ALL!'], W / 2, 55, W - 40, 100, DISPLAY, '#ffffff', null, 0.92);
  const cols = 6, rows = 7, cw = (W - 40) / cols, ch = 52;
  for (let i = 0; i < 42; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = 20 + c * cw, y = 128 + r * (ch + 8);
    const s = songs[i];
    g.fillStyle = s ? s.accent : '#cccccc'; rr(g, x + 3, y, cw - 6, ch, 8); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.stroke();
    fitText(g, String(i + 1).padStart(2, '0'), x + cw / 2, y + ch / 2, DISPLAY, 26, cw - 16, '#ffffff', 'rgba(0,0,0,0.45)', 5);
  }
  // the maze in the corner
  g.save(); g.translate(W / 2, H - 120); g.strokeStyle = '#2a6aff'; g.lineWidth = 7; g.lineCap = 'round';
  for (let k = 1; k <= 5; k++) { g.beginPath(); g.arc(0, 0, k * 17, 0.3 * k, Math.PI * 2 - 0.5 + 0.2 * k); g.stroke(); }
  g.restore();
  mascot(g, W / 2, H - 120, 14, false);
  fitText(g, 'HELP HER FIND THE PRIZE!', W / 2, H - 22, DISPLAY, 22, W - 40, '#2a6aff');
}
// the side: nutrition facts, the plain black-and-white kind
function drawFacts(g, W, H) {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#000000'; g.lineWidth = 6; g.strokeRect(22, 22, W - 44, H - 44);
  g.fillStyle = '#000'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = DISPLAY(58); g.fillText('Nutrition', 40, 100); g.fillText('Facts', 40, 162);
  g.fillRect(36, 182, W - 72, 4);
  g.font = SANS(600, 26); g.fillText('Serving size 1 bowl', 40, 222); g.fillText('Servings per box 42', 40, 256);
  g.fillRect(36, 274, W - 72, 18);
  const rows = [['Calories', '0', 1], ['Sugars', '100%', 0], ['Regret', '100%', 0], ['Vitamin D', '0%', 0], ['Vitamin B', '0%', 0], ['Fortified', 'yes', 1], ['Holy water', 'plus', 0]];
  rows.forEach(([a, b, big], i) => {
    const y = 326 + i * 46;
    g.font = big ? DISPLAY(32) : SANS(700, 28); g.textAlign = 'left'; g.fillText(a, 40, y); g.textAlign = 'right'; g.fillText(b, W - 40, y);
    g.fillRect(36, y + 12, W - 72, 3);
  });
  g.font = SANS(500, 20); g.textAlign = 'left';
  g.fillText('* part of this balanced breakfast', 40, H - 46);
}
// the prize's card: FREE PRIZE INSIDE!
function drawPrize(g, W, H) {
  g.fillStyle = '#2a6aff'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,40,0.12)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -700); g.lineTo(90, -700); g.closePath(); g.fill(); } g.restore();
  g.fillStyle = '#ffd21a'; starPath(g, W / 2, H * 0.3, 215, 160, 16, 0.05); g.fill();
  fitLines(g, ['FREE', 'PRIZE', 'INSIDE!'], W / 2, H * 0.3, 280, 250, DISPLAY, '#e8202e', null, 0.92);
  fitText(g, 'ONE IN EVERY BOX', W / 2, H * 0.6, DISPLAY, 38, W - 60, '#ffffff');
}
function drawPlain(g, W, H) { g.fillStyle = '#ffd21a'; g.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) loop(g, (i * 97) % W, (i * 151) % H, 20, LOOPCOL[i % LOOPCOL.length]); }

// the art sheet, drawn once its fonts and the five pictures are in (ready); drawn plain at once so
// nothing waits on it if a picture doesn't come
let ART = null;
export function artSheet(songs) {
  if (ART) return ART;
  const c = document.createElement('canvas'); c.width = ART_COLS * ART_W; c.height = ART_ROWS * ART_H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const imgs = {};
  const cell = (k, draw) => { const x = (k % ART_COLS) * ART_W, y = Math.floor(k / ART_COLS) * ART_H; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, ART_W, ART_H); g.clip(); draw(g, ART_W, ART_H); g.restore(); };
  const drawAll = () => {
    cell(CELL.FREE, drawFree);
    QUOTED.forEach((q, i) => cell(i + 1, (gg, W, H) => drawQuoted(gg, W, H, q, imgs[q.id])));
    cell(CELL.BACK, (gg, W, H) => drawBack(gg, W, H, songs));
    cell(CELL.SIDE, drawFacts);
    cell(CELL.COLLECT, (gg, W, H) => drawBack(gg, W, H, songs));
    cell(CELL.FACTS, drawFacts);
    cell(CELL.PRIZE, drawPrize);
    cell(CELL.PLAIN, drawPlain);
    tex.needsUpdate = true;
  };
  drawAll();
  const load = (q) => new Promise((res) => { const im = new Image(); im.onload = () => { imgs[q.id] = im; res(); }; im.onerror = () => res(); im.src = `assets/menu/${q.id}.jpg`; });
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load(DISPLAY(64)), document.fonts.load(SANS(700, 28))]).catch(() => {}) : Promise.resolve();
  // (never more than a few seconds: a picture that doesn't come is drawn without)
  const ready = Promise.race([Promise.all([fonts, ...QUOTED.map(load)]), new Promise((r) => setTimeout(r, 6000))]).then(drawAll);
  ART = { tex, ready };
  return ART;
}

// the whole record as plain boxes for the aisles: each song's colour, its name, its number (8 x 6)
export const TITLE_COLS = 8, TITLE_ROWS = 6;
let TITLES = null;
export function titleSheet(songs) {
  if (TITLES) return TITLES;
  const W = 256, H = 341;
  const c = document.createElement('canvas'); c.width = TITLE_COLS * W; c.height = TITLE_ROWS * H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = () => {
    songs.forEach((s, i) => {
      if (i >= TITLE_COLS * TITLE_ROWS) return;
      const x0 = (i % TITLE_COLS) * W, y0 = Math.floor(i / TITLE_COLS) * H;
      g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      g.fillStyle = s.accent; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.16)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(W / 2, H * 0.62); g.lineTo(k * 60 - 40, -10); g.lineTo(k * 60 - 10, -10); g.closePath(); g.fill(); }
      const words = s.title.toUpperCase().split(' '), lines = [];
      for (const w of words) { const last = lines[lines.length - 1]; if (last && (last + ' ' + w).length <= 10) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); }
      fitLines(g, lines.slice(0, 4), W / 2, 74, W - 22, 128, DISPLAY, '#ffffff', 'rgba(0,0,0,0.4)', 1.0);
      // a bowl of loops
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W / 2, 224, 86, 20, 0, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 16; k++) loop(g, W / 2 - 64 + (k * 29) % 128, 214 - (k % 3) * 6, 9, LOOPCOL[(k + i) % LOOPCOL.length]);
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.moveTo(W / 2 - 90, 226); g.bezierCurveTo(W / 2 - 84, 290, W / 2 + 84, 290, W / 2 + 90, 226); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; starPath(g, W - 44, 170, 36, 27, 10, 0.1); g.fill();
      fitText(g, String(s.num).padStart(2, '0'), W - 44, 171, DISPLAY, 30, 44, s.accent);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, H - 34, W, 34);
      fitText(g, 'COLLECT THEM ALL', W / 2, H - 17, DISPLAY, 18, W - 24, '#ffffff');
      g.restore();
    });
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load(DISPLAY(64)).then(draw, () => {});
  TITLES = { tex };
  return TITLES;
}

// ---------- the other pictures ----------
// the TV's screens (3 x 2, each 512 x 384): 0 the commercial, 1 LIVE, 2 NEW SUBSCRIBER, 3 SWIPE UP,
// 4 the follower count, 5 the count at ten million
export function screenTexture() {
  return canvasTex(1536, 768, (g) => {
    const cell = (k, draw) => { const x0 = (k % 3) * 512, y0 = Math.floor(k / 3) * 384; g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, 512, 384); g.clip(); draw(); g.restore(); };
    const scan = () => { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < 384; y += 4) g.fillRect(0, y, 512, 2); };
    cell(0, () => {
      g.fillStyle = '#2a6aff'; g.fillRect(0, 0, 512, 384);
      g.save(); g.translate(256, 230); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,60,0.15)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-50, -500); g.lineTo(50, -500); g.closePath(); g.fill(); } g.restore();
      g.fillStyle = '#ffd21a'; starPath(g, 256, 140, 150, 112, 16, 0.08); g.fill();
      fitLines(g, ['TRY ME', 'FREE!'], 256, 140, 210, 170, DISPLAY, '#e8202e', null, 0.92);
      mascot(g, 110, 300, 58, true);
      for (let i = 0; i < 9; i++) loop(g, 220 + i * 32, 330 - (i % 2) * 14, 13, LOOPCOL[i % LOOPCOL.length]);
      scan();
    });
    cell(1, () => {
      g.fillStyle = '#120a1a'; g.fillRect(0, 0, 512, 384);
      g.fillStyle = '#ff1a3a'; rr(g, 40, 40, 160, 66, 12); g.fill();
      fitText(g, '● LIVE', 120, 74, DISPLAY, 40, 140, '#ffffff');
      fitText(g, '👁 2,481,906', 256, 190, DISPLAY, 54, 440, '#ffffff');
      g.fillStyle = 'rgba(255,255,255,0.12)'; rr(g, 40, 270, 432, 70, 35); g.fill();
      fitText(g, 'add a comment…', 256, 305, SANS.bind(null, 600), 28, 400, 'rgba(255,255,255,0.6)');
      scan();
    });
    cell(2, () => {
      const gr = g.createLinearGradient(0, 0, 512, 384); gr.addColorStop(0, '#ff3a8a'); gr.addColorStop(1, '#7a2aff'); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
      g.fillStyle = '#ffffff'; rr(g, 50, 110, 412, 164, 30); g.fill();
      fitLines(g, ['YOU HAVE A NEW', 'SUBSCRIBER'], 256, 192, 370, 110, DISPLAY, '#7a2aff', null, 1.0);
      g.fillStyle = '#ffd21a'; g.beginPath(); g.arc(440, 112, 34, 0, Math.PI * 2); g.fill();
      fitText(g, '1', 440, 113, DISPLAY, 40, 50, '#7a2aff');
      scan();
    });
    cell(3, () => {
      g.fillStyle = '#0a0a12'; g.fillRect(0, 0, 512, 384);
      g.strokeStyle = '#ffffff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const y of [150, 210]) { g.beginPath(); g.moveTo(196, y + 30); g.lineTo(256, y - 20); g.lineTo(316, y + 30); g.stroke(); }
      fitText(g, 'SWIPE UP', 256, 300, DISPLAY, 60, 440, '#ffffff');
      scan();
    });
    cell(4, () => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 384);
      fitText(g, 'FOLLOWERS', 256, 96, DISPLAY, 46, 440, '#7a7a8a');
      fitText(g, '9,999,998', 256, 210, DISPLAY, 88, 470, '#14121a');
      g.fillStyle = '#2a8aff'; rr(g, 156, 280, 200, 60, 30); g.fill();
      fitText(g, 'FOLLOW', 256, 310, DISPLAY, 34, 180, '#ffffff');
      scan();
    });
    cell(5, () => {
      g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 512, 384);
      fitText(g, 'FOLLOWERS', 256, 96, DISPLAY, 46, 440, '#e8202e');
      fitText(g, '10,000,000', 256, 210, DISPLAY, 88, 480, '#14121a');
      g.fillStyle = '#2a6aff'; starPath(g, 440, 300, 50, 38, 10, 0.1); g.fill();
      fitText(g, '✓', 440, 302, DISPLAY, 46, 60, '#ffffff');
      scan();
    });
  });
}
// alphabet cereal: R I P G F M L O, and the vitamins D and B, toasted, one per cell (10 x 1, 128 x 128)
export const LETTERS = 'RIPGFMLODB';
export function letterTexture() {
  return canvasTex(1280, 128, (g) => {
    g.clearRect(0, 0, 1280, 128);
    for (let i = 0; i < LETTERS.length; i++) {
      const x = i * 128 + 64;
      g.font = DISPLAY(104); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.strokeStyle = '#8a4a14'; g.lineWidth = 14; g.strokeText(LETTERS[i], x, 70);
      const gr = g.createLinearGradient(0, 20, 0, 120); gr.addColorStop(0, '#ffd88a'); gr.addColorStop(1, '#d88a2a');
      g.fillStyle = gr; g.fillText(LETTERS[i], x, 70);
      g.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 6; k++) g.fillRect(x - 30 + (k * 23) % 60, 40 + (k * 31) % 50, 4, 4);
    }
  });
}
// the starbursts on poles: TRY ME FREE! (red on yellow), NEW! (white on blue), COLLECT THEM ALL
export function burstTexture() {
  return canvasTex(1536, 512, (g) => {
    const one = (k, fill, ink, lines, edge) => {
      g.save(); g.translate(k * 512 + 256, 256);
      g.fillStyle = edge; starPath(g, 0, 0, 250, 196, 18, 0.05); g.fill();
      g.fillStyle = fill; starPath(g, 0, 0, 228, 178, 18, 0.05); g.fill();
      fitLines(g, lines, 0, 4, 300, 240, DISPLAY, ink, null, 0.92);
      g.restore();
    };
    g.clearRect(0, 0, 1536, 512);
    one(0, '#ffd21a', '#e8202e', ['TRY ME', 'FREE!'], '#e8202e');
    one(1, '#2a6aff', '#ffffff', ['NOW', 'WITH', 'MORE!'], '#ffffff');
    one(2, '#e8202e', '#ffffff', ['COLLECT', 'THEM', 'ALL'], '#ffd21a');
  });
}

// ---------- the things ----------
// a scalloped badge and a tick, for "blue check on my trauma"
function badgeShape(r) { const s = new THREE.Shape(); const n = 16; for (let i = 0; i <= n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, rr2 = r * (0.92 + 0.08 * Math.cos(a * n)); const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; if (i) s.lineTo(x, y); else s.moveTo(x, y); } return s; }
function tickShape(k) { const s = new THREE.Shape(); s.moveTo(-0.55 * k, 0.05 * k); s.lineTo(-0.32 * k, 0.28 * k); s.lineTo(-0.12 * k, 0.06 * k); s.lineTo(0.42 * k, 0.6 * k); s.lineTo(0.62 * k, 0.38 * k); s.lineTo(-0.12 * k, -0.4 * k); s.closePath(); return s; }
// the window of a stained-glass panel: a rectangle with a round top
function archShape(w, h, y0 = 0) { const s = new THREE.Shape(); s.moveTo(-w / 2, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, y0); return s; }

export const TM = {
  // the cereal box: a unit box on the table; its faces are the shader's to draw (front, back, sides)
  cereal() { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; },
  // the box's top flaps standing a little open, the box's own colour (aTint)
  flaps() { const a = box(1, 0.012, 0.5, 0, 0, 0.25); a.rotateX(-0.5); a.translate(0, 1.0, -0.02); const b = box(1, 0.012, 0.5, 0, 0, -0.25); b.rotateX(0.45); b.translate(0, 1.0, 0.02); return merge([a, b]); },
  // the TV: a big old set on four short legs, rabbit ears; its screen is its own piece
  tv() {
    const parts = [];
    parts.push(paint(rrect(64, 46, 6, 40), rgb(0x5a3a28)).translate(0, 31, 0));
    parts.push(paint(rrect(49, 39, 5, 2), rgb(0x1a1418)).translate(-6, 31, 20.2));
    for (const [x, z] of [[-26, -14], [26, -14], [-26, 14], [26, 14]]) parts.push(paint(cyl(1.4, 0.9, 8, 8, x, 4, z), rgb(0x2a1a12)));
    // the dials and the speaker grille down the right
    for (const y of [42, 33]) parts.push(paint(cyl(2.6, 2.6, 1.6, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(24.5, y, 20.6), CHROME));
    parts.push(paint(box(8, 12, 0.6, 24.5, 18.5, 20.4), rgb(0x2a2018)));
    // the rabbit ears
    for (const s of [-1, 1]) { const ear = cyl(0.5, 0.5, 34, 6, 0, 17, 0); ear.rotateZ(s * 0.5); ear.translate(s * 2, 54, -6); parts.push(paint(ear, CHROME)); }
    parts.push(paint(sph(4, 1.4, 0.7, 1, 0, 54.5, -6), rgb(0x2a1a12)));
    return merge(parts);
  },
  tvScreen() { const g = new THREE.PlaneGeometry(44, 33, 8, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 22, y = p.getY(i) / 16.5; p.setZ(i, 2.0 * (1 - x * x * 0.6 - y * y * 0.6)); } g.computeVertexNormals(); g.translate(-6, 31, 20.4); return g; },
  // the bowl: a crater of a cereal bowl, white with a red band, the milk a disc inside
  bowl() {
    const pts = [];
    const R0 = 13, R1 = 30, H = 16, T = 1.4;
    pts.push(new THREE.Vector2(0.01, 0)); pts.push(new THREE.Vector2(R0, 0)); pts.push(new THREE.Vector2(R0 + 1, 0.6));
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(R0 + (R1 - R0) * Math.pow(u, 0.8), 0.6 + H * u)); }
    pts.push(new THREE.Vector2(R1 - T * 0.4, H + 0.9)); pts.push(new THREE.Vector2(R1 - T, H + 0.6));
    for (let i = 10; i >= 0; i--) { const u = i / 10; pts.push(new THREE.Vector2(R0 - T + (R1 - R0) * Math.pow(u, 0.8), 1.8 + (H - 1.2) * u)); }
    pts.push(new THREE.Vector2(0.01, 1.8));
    const g = new THREE.LatheGeometry(pts, 48);
    const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const y = p.getY(i), r = Math.hypot(p.getX(i), p.getZ(i)); const band = y > 11.5 && y < 14 && r > R1 - 6; const col = band ? RED : WHITE; c.set(col, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  },
  milk() { const g = new THREE.CircleGeometry(1, 48); g.rotateX(-Math.PI / 2); return g; },
  // the font's pedestal: a white column on a base
  pedestal() { return merge([paint(cyl(10, 13, 2, 32, 0, 1, 0), WHITE), paint(cyl(5, 6.5, 13, 24, 0, 8.5, 0), WHITE), paint(cyl(9, 6, 2.4, 32, 0, 16, 0), WHITE)]); },
  // a spoon lying on the table, its bowl up
  spoon() {
    const parts = [];
    const bowl = sph(1, 7, 1.6, 10, 0, 1.6, 0, 24, 12); const p = bowl.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 1.6) p.setY(i, 1.6 + (p.getY(i) - 1.6) * 0.15);
    parts.push(paint(bowl, CHROME));
    const handle = box(3.2, 1.0, 46, 0, 2.4, 30); const hp = handle.attributes.position; for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); hp.setY(i, hp.getY(i) + Math.max(0, (z - 8) * 0.12)); hp.setX(i, hp.getX(i) * (z > 40 ? 1.5 : 1)); }
    parts.push(paint(handle, CHROME));
    return merge(parts);
  },
  // a milk carton: a box with its gable top
  carton() {
    const parts = [];
    parts.push(paint(box(14, 26, 14, 0, 13, 0), WHITE));
    parts.push(paint(box(14.2, 9, 14.2, 0, 15, 0), SKY));
    const roof = new THREE.CylinderGeometry(0.01, 10, 7, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.18); roof.translate(0, 29.5, 0);
    const gable = new THREE.BufferGeometry(); gable.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-7, 26, 7, 7, 26, 7, 0, 33, 0, 7, 26, -7, -7, 26, -7, 0, 33, 0, 7, 26, 7, 7, 26, -7, 0, 33, 0, -7, 26, -7, -7, 26, 7, 0, 33, 0]), 3)); gable.computeVertexNormals();
    parts.push(paint(gable, WHITE));
    parts.push(paint(box(14.4, 1.4, 1.2, 0, 33, 0), WHITE));
    return merge(parts);
  },
  // a juice glass, the juice in it
  glass() { return merge([paint(cyl(7, 6, 0.8, 24, 0, 0.4, 0), GLASS), paint(cyl(6.4, 5.6, 15, 24, 0, 8.2, 0), ORANGE)]); },
  glassShell() { const g = new THREE.CylinderGeometry(7.2, 6.2, 20, 28, 1, true); g.translate(0, 10, 0); return paint(g, GLASS); },
  // the mascot: a cereal O standing on its edge, eyes on top, a grin; the eyes are separate (they
  // wink)
  mascotRing() { const g = tor(9, 3.6, 16, 40); g.translate(0, 13, 0); return paint(g, rgb(0xffb43a)); },
  mascotEye() { return merge([paint(sph(1, 1.5, 1.8, 0.8, 0, 0, 0, 16, 12), WHITE), paint(sph(0.8, 1, 1, 0.5, 0.3, -0.2, 0.75, 12, 8), BLACK)]); },
  mascotGrin() { const g = tor(5.6, 0.55, 8, 20, Math.PI * 0.5); g.rotateZ(Math.PI * 1.25); g.translate(0, 13 - 1.2, 3.4); return paint(g, BLACK); },
  // the badge for "blue check on my trauma"
  badge() { return merge([paint(extrude(badgeShape(10), 2.2, 4), rgb(0x2a8aff)), paint(extrude(tickShape(11), 1.2).translate(0, -0.6, 1.6), WHITE)]); },
  // a plain panel on two legs (the back of the box and its side, stood up as signs)
  panel() { return merge([paint(box(1.02, 1.02, 0.04, 0, 0.5, -0.03), WHITE), paint(box(0.04, 0.5, 0.04, -0.4, -0.25, -0.05), STEEL), paint(box(0.04, 0.5, 0.04, 0.4, -0.25, -0.05), STEEL)]); },
  panelFace() { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0.0); return g; },
  // a starburst on a pole: the face is a picture with its own edge
  burstPole() { return paint(cyl(0.5, 0.6, 30, 8, 0, 15, -0.4), STEEL); },
  burstFace() { const g = new THREE.PlaneGeometry(22, 22); g.translate(0, 38, 0); return g; },
  // a letter of the alphabet cereal, a little thick
  letter() { const g = new THREE.PlaneGeometry(8, 8); return g; },
  // a cereal piece: an O, flat-ish (instanced; aTint the colour)
  piece() { const g = tor(1.0, 0.42, 5, 12); return g; },
  // a stained-glass window on its own frame, arched (the glass is the shader's)
  archFrame() { const s = archShape(26, 52), hole = archShape(22.4, 49, 0.8); s.holes.push(hole);   // a sill rail: a hole down to the table put its inner floor on the cloth (they fought)
    return paint(extrude(s, 2.4, 16), rgb(0x2a2228)); },
  archGlass() { const g = new THREE.ShapeGeometry(archShape(22.6, 49.2), 16); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 22.6 + 0.5, p.getY(i) / 49.2); return g; },
  // the target ("I'm his target demographic"): rings on a stand
  target() {
    const parts = [];
    [[13, RED], [10.4, WHITE], [7.8, RED], [5.2, WHITE], [2.6, RED]].forEach(([r, c], i) => parts.push(paint(cyl(r, r, 0.6, 40, 0, 0, i * 0.25).rotateX(Math.PI / 2).translate(0, 22, 0), c)));
    parts.push(paint(box(1, 22, 1, -6, 11, -1), WOOD), paint(box(1, 22, 1, 6, 11, -1), WOOD));
    return merge(parts);
  },
  // the lyric board: the back of a box hung on two wires, a red edge
  board() { return merge([paint(rrect(28, 10.4, 1.6, 1.0), WHITE).translate(0, 0, -0.6), paint(rrect(29.6, 12.0, 2.0, 0.8), RED).translate(0, 0, -1.2), paint(box(0.2, 44, 0.2, -11, 27, -1.2), STEEL), paint(box(0.2, 44, 0.2, 11, 27, -1.2), STEEL)]); },
  boardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(26 / 7.5, 8.6 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.02); return g; },
  // the prize: a sealed packet (see-through), a toy board inside, and the card behind it
  packet() { const g = rrect(14, 20, 2.4, 2.6, 8); g.translate(0, 10, 0); return g; },
  packetCard() { const g = new THREE.PlaneGeometry(13, 19); g.translate(0, 10, -0.9); return g; },
  toyBoard() {
    const s = new THREE.Shape(); const L = 5.2, W = 1.5; s.moveTo(-L, 0); s.absarc(-L + W, 0, W, Math.PI, Math.PI * 1.5, false); s.lineTo(L - W, -W); s.absarc(L - W, 0, W, Math.PI * 1.5, Math.PI * 2.5, false); s.lineTo(-L + W, W); s.absarc(-L + W, 0, W, Math.PI * 0.5, Math.PI, false);
    const g = extrude(s, 0.6); g.scale(0.82, 0.82, 1); g.rotateZ(0.32); g.translate(0.4, 4.2, 0.4);
    return paint(g, rgb(0x5af2ff));
  },
};

// ---------- the pickup: a free sample, a cereal box small enough to hold ----------
export function sampleGeometry() {
  const parts = [];
  const add = (g, c) => { g = ni(g); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g); };
  const W = 0.62, H = 0.86, D = 0.24;
  add(box(W, H, D, 0, 0, 0), [1.0, 0.82, 0.1]);                 // the box: yellow
  add(box(W + 0.01, 0.24, D + 0.01, 0, H / 2 - 0.12, 0), [0.92, 0.1, 0.16]);   // its red name band
  // a blue starburst on the front and the back
  const st = new THREE.Shape(); for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10, r = i % 2 ? 0.12 : 0.17; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) st.lineTo(x, y); else st.moveTo(x, y); } st.closePath();
  for (const s of [1, -1]) { const f = extrude(st, 0.02); if (s < 0) f.rotateY(Math.PI); f.translate(0.12 * s, -0.12, (D / 2 + 0.012) * s); add(f, [0.16, 0.42, 1.0]); }
  // a white bowl shape under it
  for (const s of [1, -1]) { const b = new THREE.CircleGeometry(0.17, 16, Math.PI, Math.PI); if (s < 0) b.rotateY(Math.PI); b.translate(-0.08 * s, -0.22, (D / 2 + 0.008) * s); add(b, [1, 1, 1]); }
  const g = mergeGeometries(parts, false); g.computeVertexNormals();
  return g;
}
export const pickup = {
  key: 'sample', geo: sampleGeometry, color: 0xffffff, mat: { rough: 0.35, metal: 0.05, emissive: 0x3a2a10 }, s: 1.5, lit: 1.25, face: true,
  move: (e, time, i, yaw) => e.set(Math.sin(time * 1.6 + i) * 0.18, yaw + Math.sin(time * 1.3 + i * 1.7) * 0.6 + time * 0.6, Math.sin(time * 1.2 + i) * 0.14),
};
