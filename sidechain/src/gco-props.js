// Good Company: the things in her house and on her street, about four times life size so they read
// from the board, and his sticky notes on all of them. Geometry only, vertex-coloured; the lights are
// glows the world draws, and the pictures (his notes, the lyric notes, the calendar, the photo of the
// coast, the keypad, the dog's name, the thank-you cards, the place cards, the seating chart, the
// towels, the ledger, the mug) are canvases made here. gco-world.js puts them in the place; the
// pickup, a pad of sticky notes, is at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
// a cylinder lying along z, or along x
const cylZ = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; };
const cylX = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a square-section piece from one point to another
function beam(a, b, w, d = w) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
// a tube through points (a ring's worth of segments round), for wire, handles, number candles
function tube(pts, r, seg = 24, rs = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z ?? 0)), closed);
  return new THREE.TubeGeometry(curve, seg, r, rs, closed);
}
// a triangular prism: a gable, `w` wide across x, `d` deep in z, `h` high, its foot at y = 0
function gable(w, d, h) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
  return g;
}
// a plane for a picture, w by h, its face to +z
const face = (w, h, x = 0, y = 0, z = 0) => { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); return g; };
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const NOTE = rgb(0xffe25a), NOTE_DK = rgb(0xf0c434), CREAM = rgb(0xf3ead6), WHITE = rgb(0xf6f3ec), SAGE = rgb(0x7f9e86), SAGE_DK = rgb(0x47634f),
  NAVY = rgb(0x1f2a46), WINE = rgb(0x5a0c1c), RED = rgb(0xc4283a), OAK = rgb(0x9a6838), OAK_DK = rgb(0x5a3820), CHROME = rgb(0xd6dbe2), STEEL = rgb(0x8a9099),
  BRASS = rgb(0xd2a24a), GOLD = rgb(0xe8c050), BLACK = rgb(0x16141a), DARK = rgb(0x2a2630), GREY = rgb(0xa8a6aa), PINK = rgb(0xf2a2ba), BLUSH = rgb(0xf6cdd6),
  SKY = rgb(0x8cb8de), GRASS = rgb(0x2c5a34), BRICK = rgb(0x8a4436), ROOF = rgb(0x3a3442), CHINA = rgb(0xf8f5ee), TEAL = rgb(0x4aa49c), LINEN = rgb(0xe8e2d2),
  STONE = rgb(0xc8c2b6), TERRA = rgb(0xc86a48), PEACH = rgb(0xf6c09a), BUTTER = rgb(0xf6e2a0);
// the houses on her street, each painted its own colour
export const SIDINGS = [rgb(0x9ab8d2), rgb(0xa8c4a6), rgb(0xf0e2c4), rgb(0xe6b8b8), rgb(0xd6d2e6), rgb(0xf4f0e6)];

// his handwriting (whichever marker this machine has), and print for the rest
const HAND = (s, w = 700) => `${w} ${s}px "Ink Free", "Segoe Print", "Noteworthy", "Marker Felt", "Bradley Hand", "Comic Sans MS", cursive`;
const FONT = (w, s) => `${w} ${s}px "Arial Black", Impact, sans-serif`;
const SANS = (w, s) => `${w} ${s}px "Segoe UI", Arial, sans-serif`;
const SERIF = (w, s) => `${w} ${s}px Georgia, "Times New Roman", serif`;
function centre(g, txt, x, y, font, col, maxW) { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y, maxW); }
// lines of text fitted to a box, centred on (cx, cy)
function fitLines(g, lines, cx, cy, maxW, maxH, font, size, col, lh = 1.12) {
  let s = size;
  g.font = font(s);
  const widest = () => Math.max(...lines.map((l) => g.measureText(l).width));
  while (s > 8 && (widest() > maxW || lines.length * s * lh > maxH)) { s -= 2; g.font = font(s); }
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  const y0 = cy - ((lines.length - 1) * s * lh) / 2;
  lines.forEach((l, j) => g.fillText(l, cx, y0 + j * s * lh));
  return s;
}
// his smiley, drawn the way he draws it
function smiley(g, x, y, r, col, lw) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(x - r * 0.36, y - r * 0.22, lw * 0.75, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + r * 0.36, y - r * 0.22, lw * 0.75, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x, y + r * 0.05, r * 0.52, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
}
// a square of sticky-note paper in a cell: the colour, the sticky band at the top a shade deeper,
// and the light falling off toward the curl at its foot
function paper(g, x, y, w, h, hue = '#ffe45c') {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, hue); gr.addColorStop(0.82, hue); gr.addColorStop(1, shade(hue, 0.86));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(160,110,0,0.10)'; g.fillRect(x, y, w, h * 0.13);
}
function shade(hex, k) { const c = new THREE.Color(hex).multiplyScalar(k); return '#' + c.getHexString(); }

// ---------- the pictures ----------
// his notes, 4 x 4: what he did, in his words (and the song's)
export const NOTES = ['FIXED IT', 'FED BISCUIT', "HOPE THAT'S\nFINE", 'THE ONE YOU\nMENTIONED', "DON'T WORRY\nABOUT IT", 'HAPPY TO\nHELP', 'RELAX', 'ALWAYS',
  'LET MYSELF\nIN', 'FRAMED IT\nFOR YOU', 'TABLE FOR\nTWO', 'SORTED THE\nSEATING', "YOU'RE OUT\nOF MILK", 'BACK\nTONIGHT', 'NO NEED TO\nTHANK ME', ''];
export const NOTE_CELL = Object.fromEntries(NOTES.map((t, i) => [t.replace(/\n/g, ' '), i]));
export function notesTexture() {
  return canvasTex(1024, 1024, (g) => {
    NOTES.forEach((t, k) => {
      const x0 = (k % 4) * 256, y0 = Math.floor(k / 4) * 256;
      g.save(); g.beginPath(); g.rect(x0, y0, 256, 256); g.clip();
      paper(g, x0, y0, 256, 256);
      if (t) {
        fitLines(g, t.split('\n'), x0 + 128, y0 + 112, 220, 150, (s) => HAND(s, 700), 56, '#1c2654');
        smiley(g, x0 + 196, y0 + 206, 20, '#1c2654', 5);
      } else {
        // a blank one: a few lines of his scribble
        g.strokeStyle = 'rgba(28,38,84,0.75)'; g.lineWidth = 6; g.lineCap = 'round';
        for (let j = 0; j < 4; j++) { g.beginPath(); const y = y0 + 70 + j * 42; g.moveTo(x0 + 34, y); for (let x = 34; x < 220 - j * 30; x += 14) g.lineTo(x0 + x, y + Math.sin(x * 0.4 + j) * 5); g.stroke(); }
      }
      g.restore();
    });
  });
}
// the lyric boards: one giant note per line, in his hand (4 x 4 cells of 448)
export function lyricTexture(lines) {
  const C = 448;
  return canvasTex(4 * C, 4 * C, (g) => {
    lines.slice(0, 16).forEach((t, k) => {
      const x0 = (k % 4) * C, y0 = Math.floor(k / 4) * C;
      g.save(); g.beginPath(); g.rect(x0, y0, C, C); g.clip();
      paper(g, x0, y0, C, C, '#ffe866');
      fitLines(g, t.split('\n'), x0 + C / 2, y0 + C * 0.47, C - 56, C - 120, (s) => HAND(s, 700), 92, '#18224c');
      g.strokeStyle = 'rgba(24,34,76,0.85)'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0 + C * 0.22, y0 + C * 0.86); g.quadraticCurveTo(x0 + C * 0.5, y0 + C * 0.9, x0 + C * 0.68, y0 + C * 0.85); g.stroke();
      smiley(g, x0 + C * 0.82, y0 + C * 0.84, 26, '#18224c', 7);
      g.restore();
    });
  });
}
// the calendar on the fridge: May, then June with the date ringed in red (1 x 2)
export function calendarTexture() {
  return canvasTex(512, 1024, (g) => {
    const page = (y0, month, ring) => {
      g.fillStyle = '#fbf8f0'; g.fillRect(0, y0, 512, 512);
      g.fillStyle = '#7f9e86'; g.fillRect(0, y0, 512, 120);
      centre(g, month, 256, y0 + 62, SERIF(700, 76), '#ffffff', 460);
      g.strokeStyle = 'rgba(40,40,50,0.35)'; g.lineWidth = 2;
      for (let r = 0; r <= 5; r++) { g.beginPath(); g.moveTo(16, y0 + 140 + r * 70); g.lineTo(496, y0 + 140 + r * 70); g.stroke(); }
      for (let c = 0; c <= 7; c++) { g.beginPath(); g.moveTo(16 + c * 68.6, y0 + 140); g.lineTo(16 + c * 68.6, y0 + 490); g.stroke(); }
      let d = 1;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
        if (r === 0 && c < 2) continue;
        if (d > 30) continue;
        g.fillStyle = '#3a3a44'; g.font = SANS(600, 22); g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText(String(d), 22 + c * 68.6, y0 + 146 + r * 70);
        if (ring && d === 14) {
          const cx = 50 + c * 68.6, cy = y0 + 175 + r * 70;
          g.strokeStyle = '#d8283a'; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, cy, 40, 33, 0.15, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#d8283a'; g.beginPath(); g.moveTo(cx, cy + 14); g.bezierCurveTo(cx - 22, cy - 2, cx - 10, cy - 20, cx, cy - 8); g.bezierCurveTo(cx + 10, cy - 20, cx + 22, cy - 2, cx, cy + 14); g.fill();
        }
        d++;
      }
    };
    page(0, 'MAY', false);
    page(512, 'JUNE', true);
  });
}
// the photo of the coast, the year she turned 23: a print with its white border and the date
export function coastTexture() {
  return canvasTex(512, 400, (g, W, H) => {
    g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, W, H);
    const x0 = 22, y0 = 22, w = W - 44, h = H - 80;
    const sky = g.createLinearGradient(0, y0, 0, y0 + h * 0.6); sky.addColorStop(0, '#5a6aa8'); sky.addColorStop(0.55, '#f2a07a'); sky.addColorStop(1, '#ffd89a');
    g.fillStyle = sky; g.fillRect(x0, y0, w, h);
    g.fillStyle = '#ffe2a8'; g.beginPath(); g.arc(x0 + w * 0.62, y0 + h * 0.56, 34, 0, Math.PI * 2); g.fill();
    const sea = g.createLinearGradient(0, y0 + h * 0.58, 0, y0 + h); sea.addColorStop(0, '#e89a7a'); sea.addColorStop(1, '#2a4a7a');
    g.fillStyle = sea; g.fillRect(x0, y0 + h * 0.6, w, h * 0.4);
    g.fillStyle = 'rgba(255,230,180,0.6)'; for (let k = 0; k < 9; k++) g.fillRect(x0 + w * 0.5 + (k % 3) * 18 - 10, y0 + h * 0.64 + k * 9, 40 - k * 3, 3);
    g.fillStyle = '#3a2a3a'; g.beginPath(); g.moveTo(x0, y0 + h * 0.38); g.lineTo(x0 + w * 0.18, y0 + h * 0.42); g.lineTo(x0 + w * 0.34, y0 + h * 0.62); g.lineTo(x0 + w * 0.4, y0 + h); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = '#f2ece4'; g.fillRect(x0 + w * 0.1, y0 + h * 0.22, 12, h * 0.2); g.fillStyle = '#d8283a'; g.fillRect(x0 + w * 0.1 - 2, y0 + h * 0.2, 16, 8);
    g.fillStyle = '#ff8a2a'; g.font = '700 26px "Courier New", monospace'; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText("'23  8 14", x0 + w - 12, y0 + h - 10);
  });
}
// the keypad by her door: the question, then the tick (1 x 2)
export function keypadTexture() {
  return canvasTex(256, 512, (g) => {
    for (let k = 0; k < 2; k++) {
      const y0 = k * 256;
      g.fillStyle = '#0a1418'; g.fillRect(0, y0, 256, 256);
      if (k === 0) {
        centre(g, 'SECURITY', 128, y0 + 40, SANS(700, 24), '#7ad8ff', 230);
        centre(g, 'QUESTION', 128, y0 + 68, SANS(700, 24), '#7ad8ff', 230);
        centre(g, "MOTHER'S", 128, y0 + 116, SANS(800, 30), '#ffffff', 236);
        centre(g, 'MAIDEN NAME?', 128, y0 + 150, SANS(800, 30), '#ffffff', 236);
        for (let j = 0; j < 7; j++) { g.fillStyle = '#7ad8ff'; g.beginPath(); g.arc(50 + j * 26, y0 + 206, 7, 0, Math.PI * 2); g.fill(); }
      } else {
        g.strokeStyle = '#5aff8a'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(66, y0 + 104); g.lineTo(108, y0 + 146); g.lineTo(190, y0 + 60); g.stroke();
        centre(g, 'WELCOME', 128, y0 + 196, SANS(800, 30), '#5aff8a', 236);
        centre(g, 'HOME', 128, y0 + 228, SANS(800, 30), '#5aff8a', 236);
      }
    }
  });
}
// the dog's name over the kennel door
export function nameTexture() {
  return canvasTex(512, 160, (g, W, H) => {
    g.fillStyle = '#f4ead6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c4283a'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16);
    centre(g, 'BISCUIT', W / 2, H / 2 + 4, HAND(96, 700), '#c4283a', W - 60);
  });
}
// the thank-you cards on the mantel, 4 x 2
export const CARDS = [['THANK\nYOU!', '#f6d6e0', '#c42a5a'], ["YOU'RE THE\nBEST", '#d8ecf6', '#2a5a8a'], ['WHAT WOULD\nWE DO\nWITHOUT YOU', '#fdf2c8', '#8a5a10'], ['THANKS FOR\nEVERYTHING', '#e0f0dc', '#2a6a3a'],
  ['#1\nNEIGHBOR', '#f8e0c8', '#c25a1a'], ["YOU\nSHOULDN'T\nHAVE", '#ece0f6', '#6a3a9a'], ['SO\nTHOUGHTFUL', '#ffffff', '#c4283a'], ['THANK\nYOU', '#1f2a46', '#ffd86a']];
export function cardsTexture() {
  return canvasTex(1024, 640, (g) => {
    CARDS.forEach(([t, bg, ink], k) => {
      const x0 = (k % 4) * 256, y0 = Math.floor(k / 4) * 320;
      g.save(); g.beginPath(); g.rect(x0, y0, 256, 320); g.clip();
      g.fillStyle = bg; g.fillRect(x0, y0, 256, 320);
      g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(x0 + 14, y0 + 14, 228, 292);
      fitLines(g, t.split('\n'), x0 + 128, y0 + 150, 200, 220, (s) => SERIF(700, s) + '', 52, ink);
      g.fillStyle = ink; g.beginPath(); const cx = x0 + 128, cy = y0 + 270; g.moveTo(cx, cy + 12); g.bezierCurveTo(cx - 20, cy - 2, cx - 9, cy - 18, cx, cy - 7); g.bezierCurveTo(cx + 9, cy - 18, cx + 20, cy - 2, cx, cy + 12); g.fill();
      g.restore();
    });
  });
}
// the place cards: everyone he's seated, and the two at the middle (8 x 1)
export const GUESTS = ['DANA', 'MARCUS', 'JEN', 'AUNT RUTH', 'TOM', 'PRIYA', 'YOU', 'ME'];
export function placeTexture() {
  return canvasTex(1024, 128, (g) => {
    GUESTS.forEach((n, k) => {
      const x0 = k * 128;
      g.fillStyle = '#fbf8f0'; g.fillRect(x0, 0, 128, 128);
      g.strokeStyle = '#c8a050'; g.lineWidth = 4; g.strokeRect(x0 + 6, 6, 116, 116);
      centre(g, n, x0 + 64, 66, HAND(n.length > 5 ? 22 : 36, 700), k >= 6 ? '#c4283a' : '#1c2654', 110);
    });
  });
}
// the seating chart on its easel: the round tables, every name where he put it
export function chartTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8a050'; g.lineWidth = 10; g.strokeRect(12, 12, W - 24, H - 24);
    centre(g, 'SEATING', W / 2, 66, SERIF(700, 54), '#5a0c1c', W - 60);
    const tables = [[140, 200], [372, 200], [140, 420], [372, 420], [256, 540]];
    const names = [['DANA', 'TOM', 'JEN'], ['MARCUS', 'PRIYA', 'LEE'], ['AUNT RUTH', 'SAM', 'KIM'], ['ROB', 'ALI', 'NAN'], ['YOU', 'ME']];
    tables.forEach(([x, y], i) => {
      g.strokeStyle = '#5a0c1c'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 46, 0, Math.PI * 2); g.stroke();
      centre(g, String(i + 1), x, y, SERIF(700, 34), '#5a0c1c', 60);
      names[i].forEach((n, j) => { const a = -Math.PI / 2 + j * (Math.PI * 2 / names[i].length); centre(g, n, x + Math.cos(a) * 82, y + Math.sin(a) * 66, HAND(i === 4 ? 30 : 22, 700), i === 4 ? '#c4283a' : '#1c2654', 110); });
    });
    // the last table: a heart round it, and an arrow from the others to it
    g.strokeStyle = '#c4283a'; g.lineWidth = 6; g.beginPath(); g.ellipse(256, 540, 120, 74, 0, 0, Math.PI * 2); g.stroke();
  });
}
// the towels in the hall: his and hers (1 x 2)
export function towelTexture() {
  return canvasTex(256, 512, (g) => {
    [['HIS', '#2a3a5e', '#f4f0e6'], ['HERS', '#f2b8c8', '#ffffff']].forEach(([t, bg, ink], k) => {
      const y0 = k * 256;
      g.fillStyle = bg; g.fillRect(0, y0, 256, 256);
      g.fillStyle = 'rgba(255,255,255,0.18)'; for (let j = 0; j < 3; j++) g.fillRect(0, y0 + 190 + j * 14, 256, 6);
      centre(g, t, 128, y0 + 110, SERIF(700, 64) + '', ink, 220);
    });
  });
}
// the ledger in the vault: every favour, and what's owed
export const FAVOURS = ['FIXED THE KETTLE', 'WALKED BISCUIT', 'THE WINE', 'THE DINNER PARTY', 'NEW LOCKS', 'YOUR MOTHER', 'THE TOWELS', 'THE BATH'];
export function ledgerTexture() {
  return canvasTex(1024, 640, (g, W, H) => {
    g.fillStyle = '#f2e8cc'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(90,60,20,0.18)'; g.fillRect(W / 2 - 18, 0, 36, H);
    for (const x0 of [0, W / 2]) {
      g.strokeStyle = 'rgba(60,90,140,0.35)'; g.lineWidth = 2;
      for (let r = 0; r < 12; r++) { g.beginPath(); g.moveTo(x0 + 30, 120 + r * 42); g.lineTo(x0 + W / 2 - 30, 120 + r * 42); g.stroke(); }
      g.strokeStyle = 'rgba(200,40,60,0.55)'; g.beginPath(); g.moveTo(x0 + W / 2 - 110, 70); g.lineTo(x0 + W / 2 - 110, H - 30); g.stroke();
    }
    centre(g, 'FAVOURS', W / 4, 64, SERIF(700, 48), '#3a2a1a', 400);
    centre(g, 'OWED', W * 0.75, 64, SERIF(700, 48), '#3a2a1a', 400);
    g.textBaseline = 'alphabetic';
    FAVOURS.forEach((f, i) => {
      g.font = HAND(30, 700); g.fillStyle = '#1c2654'; g.textAlign = 'left'; g.fillText(f, 40, 112 + i * 42);
      g.textAlign = 'center'; g.fillText('1', W / 2 - 60, 112 + i * 42);
      g.textAlign = 'left'; g.fillText('1 favour', W / 2 + 40, 112 + i * 42);
    });
    g.strokeStyle = '#1c2654'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2 + 40, 470); g.lineTo(W - 60, 470); g.stroke(); g.beginPath(); g.moveTo(W / 2 + 40, 478); g.lineTo(W - 60, 478); g.stroke();
    g.font = HAND(46, 700); g.fillStyle = '#c4283a'; g.textAlign = 'left'; g.fillText('BALANCE:', W / 2 + 40, 540);
    g.font = HAND(64, 700); g.fillText('YOU', W / 2 + 270, 548);
  });
}
// the mug on the lawn, all the way round
export function mugTexture() {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#faf7f0'; g.fillRect(0, 0, W, H);
    centre(g, "WORLD'S", W / 2, 66, FONT(900, 64), '#c4283a', W - 160);
    centre(g, 'NICEST MAN', W / 2, 150, FONT(900, 84), '#1f2a46', W - 120);
    for (let k = 0; k < 5; k++) { const x = W / 2 - 112 + k * 56, y = 222; g.fillStyle = '#e8b030'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 20; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
  });
}

// ---------- materials the things need beyond the shared ones ----------
// pictures from a sheet of cells, which cell (and how lit) per instance: aCell, aK; fogged like the rooms
export function cellMat(map, cols, rows, base = 0.16, gain = 1.0, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute float aCell; attribute float aK; varying vec2 vUv; varying float vK; varying vec3 vW; varying float vShade;
      void main(){
        float c = mod(aCell, ${cols}.0), r = floor(aCell / ${cols}.0 + 0.01);
        vUv = vec2((uv.x + c) / ${cols}.0, 1.0 - (r + 1.0 - uv.y) / ${rows}.0); vK = aK;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vShade = 0.78 + 0.22 * abs(n.y) + 0.12 * n.z;
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying float vK; varying vec3 vW; varying float vShade;
      void main(){
        vec3 c = texture2D(map, vUv).rgb * (${base.toFixed(3)} + ${gain.toFixed(3)} * vK) * vShade;
        float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide, polygonOffset: !!opts.offset, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
// the windows of the houses on her street: dark glass, or lit warm behind a curtain with one of his
// notes stuck in the corner; aK how lit, aSeed which panes (flat: it feeds a hash)
export function windowMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uWarm: { value: new THREE.Color(0xffc878) }, uSky: { value: new THREE.Color(0x1a2240) }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute float aK; attribute float aSeed; attribute float aPane; varying vec2 vUv; varying float vK; flat varying float vSeed; varying float vPane; varying vec3 vW;
      void main(){ vUv = uv; vK = aK; vSeed = aSeed; vPane = aPane; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uWarm, uSky, uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying float vK; flat varying float vSeed; varying float vPane; varying vec3 vW;
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float cov(float d){ float w = fwidth(d) * 1.2; return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      void main(){
        float id = floor(vPane + 0.5);
        float on = step(h1(id * 7.31 + vSeed * 91.0), 0.25 + 0.75 * vK);
        vec2 p = vUv;
        // the curtains: drawn to either side, lit through
        float cur = cov(0.24 - p.x) + cov(p.x - 0.76);
        vec3 lit = uWarm * (0.75 + 0.35 * p.y) * (1.0 - 0.35 * cur);
        vec3 dark = uSky * (0.35 + 0.4 * p.y) + vec3(0.02);
        vec3 col = mix(dark, lit * (0.6 + 1.3 * vK), on);
        // the cross of the sash
        float mull = max(1.0 - cov(abs(p.x - 0.5) - 0.025), 1.0 - cov(abs(p.y - 0.55) - 0.025));
        col = mix(col, vec3(0.92, 0.9, 0.86) * (0.3 + 0.4 * on), mull);
        // his note in the corner of the glass
        vec2 q = (p - vec2(0.66, 0.7)) / vec2(0.15, 0.12);
        float note = cov(1.0 - max(abs(q.x), abs(q.y))) * step(0.35, h1(id * 3.3 + vSeed * 17.0));
        col = mix(col, vec3(1.0, 0.86, 0.3) * (0.5 + 0.9 * on), note);
        float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}

// ---------- the things ----------
// a sticky note, 1 x 1, its face to +z, its foot curling off whatever it's stuck to
export function noteGeo(curl = 0.22, n = 6) {
  const g = new THREE.PlaneGeometry(1, 1, 1, n);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.1) { const u = (0.1 - y) / 0.6; p.setZ(i, curl * u * u); } }
  g.computeVertexNormals();
  return g;
}
// a heart outline, centred, about w across
function heartShape(w) {
  const s = new THREE.Shape(), k = w / 2;
  s.moveTo(0, -0.9 * k); s.bezierCurveTo(-0.15 * k, -0.6 * k, -1.0 * k, -0.2 * k, -1.0 * k, 0.35 * k);
  s.bezierCurveTo(-1.0 * k, 0.85 * k, -0.35 * k, 1.05 * k, 0, 0.6 * k);
  s.bezierCurveTo(0.35 * k, 1.05 * k, 1.0 * k, 0.85 * k, 1.0 * k, 0.35 * k);
  s.bezierCurveTo(1.0 * k, -0.2 * k, 0.15 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}
const extrude = (shape, depth) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2); return g; };

export const GC = {
  // ---- her street ----
  // a house on her street, four times life size: two floors of clapboard, a side-gabled roof, the
  // porch across the front with its columns and steps, the door, shutters, a brick chimney. Its front
  // to +z; `siding` its colour
  house(siding) {
    const P = [], W = 40, D = 30, H = 26;
    P.push(paint(box(W, H, D, 0, H / 2, 0), siding));
    // the clapboard lines: thin bands proud of the wall front and back
    for (let y = 2.2; y < H; y += 2.2) for (const z of [D / 2 + 0.08, -D / 2 - 0.08]) P.push(paint(box(W + 0.1, 0.18, 0.16, 0, y, z), siding.map((c) => c * 0.86)));
    // the corner boards and the sill board
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) P.push(paint(box(1.1, H, 1.1, x, H / 2, z), WHITE));
    P.push(paint(box(W + 1.6, 1.2, D + 1.6, 0, H + 0.4, 0), WHITE));
    const roof = gable(W + 4, D + 5, 14); roof.translate(0, H + 0.9, 0); P.push(paint(roof, ROOF));
    // the gable ends' trim
    P.push(paint(beam([-W / 2 - 2, H + 1, D / 2 + 2.6], [-W / 2 - 2, H + 15, 0], 0.8), WHITE));
    P.push(paint(box(4.2, 14, 4.2, W * 0.3, H + 6, -4), BRICK), paint(box(5, 1, 5, W * 0.3, H + 13.4, -4), DARK));
    // the porch: its floor, roof, columns, the rail and the steps down the middle
    P.push(paint(box(30, 1.4, 9, 0, 2.6, D / 2 + 4.5), OAK_DK), paint(box(32, 1.0, 10.4, 0, 12.4, D / 2 + 4.8), WHITE));
    P.push(paint(box(32, 0.25, 10.6, 0, 12.95, D / 2 + 4.8), ROOF));
    for (const x of [-14.4, -5.2, 5.2, 14.4]) P.push(paint(cyl(0.55, 0.65, 9.2, 10, x, 7.5, D / 2 + 8.6), WHITE));
    for (const sd of [-1, 1]) { P.push(paint(box(9.2, 0.5, 0.5, sd * 9.8, 6.4, D / 2 + 8.6), WHITE)); for (let k = 0; k < 7; k++) P.push(paint(box(0.32, 3.2, 0.32, sd * (5.8 + k * 1.3), 4.8, D / 2 + 8.6), WHITE)); }
    for (let k = 0; k < 3; k++) P.push(paint(box(9, 0.75, 1.8, 0, 1.6 - k * 0.75, D / 2 + 9.9 + k * 1.8), STONE));
    // the door, its frame, the knob and the porch light beside it
    P.push(paint(box(5.6, 9.4, 0.4, 0, 7.9, D / 2 + 0.2), RED), paint(box(7.0, 0.7, 0.6, 0, 12.9, D / 2 + 0.3), WHITE));
    for (const sd of [-1, 1]) P.push(paint(box(0.7, 10, 0.6, sd * 3.15, 8.1, D / 2 + 0.3), WHITE));
    P.push(paint(sph(0.35, 1, 1, 1, 1.8, 7.6, D / 2 + 0.6), BRASS), paint(box(0.9, 1.6, 0.9, 4.6, 10.4, D / 2 + 0.5), BLACK));
    // the shutters and the window trim (the glass is its own layer: GC.houseGlass)
    for (const [x, y] of WINS) {
      P.push(paint(box(6.2, 0.5, 0.6, x, y - 3.9, D / 2 + 0.3), WHITE), paint(box(6.2, 0.5, 0.5, x, y + 3.9, D / 2 + 0.25), WHITE));
      for (const sd of [-1, 1]) P.push(paint(box(2.2, 7.4, 0.35, x + sd * 4.4, y, D / 2 + 0.22), SAGE_DK));
    }
    return merge(P);
  },
  // every pane of a house's front and sides, each with its own aPane (which one), uv across it
  houseGlass() {
    const gs = [];
    const add = (g, k) => { const n = g.attributes.position.count, a = new Float32Array(n).fill(k); g.setAttribute('aPane', new THREE.BufferAttribute(a, 1)); gs.push(g); };
    WINS.forEach(([x, y], k) => add(face(5.4, 7.0, x, y, 15.32), k));
    for (const sd of [-1, 1]) for (const [z, y] of [[-8, 7.5], [6, 7.5], [-8, 18.5], [6, 18.5]]) { const g = face(5.4, 7.0, 0, y, 0); g.rotateY(sd * Math.PI / 2); g.translate(sd * 20.16, 0, z); add(g, 10 + gs.length); }
    return mergeGeometries(gs.map(ni), false);
  },
  // a length of picket fence, 24 long down +z: the pickets with their points, two rails behind
  fence(L = 24) {
    const P = [];
    const PK = rgb(0xd8d2c6); for (let z = -L / 2 + 0.85; z < L / 2; z += 2.0) { P.push(paint(box(0.32, 4.2, 1.45, 0, 2.1, z), PK)); const pt = new THREE.CylinderGeometry(0.01, 1.02, 0.9, 4); pt.rotateY(Math.PI / 4); pt.scale(0.4, 1, 1); pt.translate(0, 4.65, z); P.push(paint(pt, PK)); }
    for (const y of [1.1, 3.3]) P.push(paint(box(0.3, 0.5, L, -0.35, y, 0), PK));
    return merge(P);
  },
  // a street lamp: the post, the arm, the lantern (its light is a glow)
  lamp() {
    const P = [paint(cyl(0.55, 0.8, 1.6, 10, 0, 0.8, 0), BLACK), paint(cyl(0.32, 0.42, 17, 10, 0, 9.5, 0), BLACK)];
    P.push(paint(cyl(1.3, 0.6, 1.2, 8, 0, 18.4, 0), BLACK), paint(cyl(0.9, 1.25, 2.6, 8, 0, 20.3, 0), rgb(0xfff2d0)), paint(cyl(0.2, 1.5, 1.2, 8, 0, 22.2, 0), BLACK));
    return merge(P);
  },
  // a mailbox on its post, the flag up
  mailbox() {
    const P = [paint(box(0.9, 5.2, 0.9, 0, 2.6, 0), WHITE)];
    P.push(paint(box(2.8, 1.6, 5.2, 0, 5.8, 0), NAVY));
    const top = new THREE.CylinderGeometry(1.4, 1.4, 5.2, 16, 1, false, 0, Math.PI); top.rotateX(Math.PI / 2); top.rotateZ(Math.PI / 2); top.translate(0, 6.6, 0); P.push(paint(top, NAVY));
    P.push(paint(box(0.2, 2.4, 0.5, 1.5, 7.6, -1.4), RED), paint(box(0.2, 0.9, 1.4, 1.5, 8.4, -0.9), RED));
    return merge(P);
  },
  // a tree on the lawns: a trunk and a round crown in clumps
  tree() {
    const P = [paint(cyl(0.9, 1.4, 12, 8, 0, 6, 0), OAK_DK)];
    for (const [x, y, z, r] of [[0, 18, 0, 8], [5, 15, 2, 5.5], [-5, 16, -1, 6], [1, 22, -3, 5.5], [-2, 14, 4, 5]]) P.push(paint(sph(r, 1, 0.9, 1, x, y, z, 10, 8), rgb(0x24482c)));
    return merge(P);
  },
  // the kennel by her gate: walls, a red roof, the door's dark arch (its name board is GC.nameFace)
  kennel() {
    const P = [paint(box(9, 6.4, 10, 0, 3.2, 0), CREAM)];
    for (let y = 1; y < 6.4; y += 1.1) P.push(paint(box(9.1, 0.14, 10.1, 0, y, 0), rgb(0xd8ccb0)));
    const roof = gable(10.6, 12, 4.4); roof.rotateY(Math.PI / 2); roof.translate(0, 6.3, 0); P.push(paint(roof, RED));
    const arch = new THREE.Shape(); arch.moveTo(-2.1, 0); arch.lineTo(-2.1, 2.8); arch.absarc(0, 2.8, 2.1, Math.PI, 0, true); arch.lineTo(2.1, 0); arch.closePath();
    const door = new THREE.ShapeGeometry(arch, 12); door.translate(0, 0, 5.02); P.push(paint(door, rgb(0x120e10)));
    // the bowl out front, a bone beside it
    P.push(paint(lathe([[0, 0], [1.6, 0], [2.0, 0.9], [1.7, 1.0], [1.3, 0.3], [0, 0.3]], 20).translate(3.2, 0, 7.2), RED));
    P.push(paint(box(2.2, 0.5, 0.5, -3, 0.3, 7), CHINA), paint(sph(0.4, 1, 1, 1, -4.1, 0.35, 7.2), CHINA), paint(sph(0.4, 1, 1, 1, -1.9, 0.35, 6.8), CHINA));
    return merge(P);
  },
  nameFace() { return face(6.0, 1.5, 0, 5.6, 5.06); },
  // the keypad on her door frame: the panel and its little keys (its screen is GC.keyFace)
  keypad() {
    const P = [paint(box(3.0, 5.4, 0.6, 0, 0, 0), rgb(0x2a2e34))];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) P.push(paint(box(0.6, 0.45, 0.2, -0.8 + c * 0.8, -1.2 - r * 0.62, 0.36), rgb(0x8a929c)));
    return merge(P);
  },
  keyFace() { return face(2.3, 2.3, 0, 1.25, 0.32); },

  // ---- in her house ----
  // the fridge, its calendar (GC.calFace) and his notes on the door
  fridge() {
    const P = [paint(box(14, 30, 11, 0, 15, 0), rgb(0xe6ebee))];
    P.push(paint(box(14.1, 0.3, 11.1, 0, 20, 0), rgb(0xb8c0c6)));
    for (const y of [12, 24.5]) P.push(paint(box(0.7, 6, 0.9, -5.6, y, 5.9), CHROME));
    return merge(P);
  },
  calFace() { return face(7.2, 7.2, 0, 0, 0); },
  // the sideboard with the photo of the coast in its frame (GC.photoFace), and the number candles
  sideboard() {
    const P = [paint(box(18, 9, 7, 0, 4.5, 0), OAK), paint(box(18.6, 0.6, 7.6, 0, 9.3, 0), OAK_DK)];
    for (const x of [-4.5, 4.5]) P.push(paint(box(8, 6.4, 0.2, x, 4.6, 3.55), rgb(0xa87442)), paint(sph(0.3, 1, 1, 1, x + (x < 0 ? 3 : -3), 5, 3.75), BRASS));
    // the frame, leaning back on its stand
    const fr = merge([paint(box(11.6, 9.2, 0.6, 0, 0, 0), GOLD), paint(box(10.4, 8.0, 0.7, 0, 0, 0.02), WHITE)]);
    fr.rotateX(-0.16); fr.translate(-2.6, 14.5, -1.2); P.push(fr);
    return merge(P);
  },
  photoFace() { const g = face(9.8, 7.6, 0, 0, 0.42); g.rotateX(-0.16); g.translate(-2.6, 14.5, -1.2); return g; },
  // the number candles, 2 and 3, on a little cake; their flames are glows
  candles() {
    const P = [paint(cyl(2.6, 2.6, 1.6, 24, 0, 0.8, 0), CHINA), paint(cyl(2.7, 2.7, 0.3, 24, 0, 1.65, 0), PINK)];
    const two = [[-1.6, 3.9], [-1.1, 4.4], [-0.5, 4.3], [-0.3, 3.8], [-0.8, 3.1], [-1.6, 2.2], [-0.3, 2.2]].map(([x, y]) => [x, y, 0]);
    const three = [[0.4, 4.2], [1.0, 4.45], [1.5, 4.1], [1.0, 3.4], [1.55, 2.9], [1.2, 2.25], [0.4, 2.4]].map(([x, y]) => [x, y, 0]);
    P.push(paint(tube(two, 0.26, 40, 8), SKY), paint(tube(three, 0.26, 40, 8), PINK));
    P.push(paint(cyl(0.05, 0.05, 0.5, 4, -1.1, 4.75, 0), DARK), paint(cyl(0.05, 0.05, 0.5, 4, 1.0, 4.75, 0), DARK));
    return merge(P);
  },
  // the kitchen island with the wine he brought, its bow, two glasses
  island() {
    const P = [paint(box(20, 9, 9, 0, 4.5, 0), SAGE), paint(box(21, 0.8, 10, 0, 9.4, 0), rgb(0xe8e2d8))];
    for (const x of [-6.6, 0, 6.6]) P.push(paint(box(5.6, 6.6, 0.2, x, 4.4, 4.55), rgb(0x8aaa92)), paint(box(1.6, 0.3, 0.3, x, 6.8, 4.75), BRASS));
    return merge(P);
  },
  wine() {
    const P = [paint(lathe([[0, 0], [1.35, 0], [1.4, 0.3], [1.4, 5.6], [1.1, 6.6], [0.45, 7.6], [0.42, 9.6], [0.5, 9.8], [0, 9.8]], 20), rgb(0x2a0a14))];
    P.push(paint(cyl(1.42, 1.42, 2.6, 20, 0, 3.4, 0), CREAM), paint(cyl(0.5, 0.5, 1.2, 12, 0, 9.4, 0), RED));
    // the bow round its neck
    for (const sd of [-1, 1]) { const l = new THREE.TorusGeometry(0.75, 0.22, 6, 14); l.scale(1, 0.7, 0.4); l.rotateZ(sd * 0.5); l.translate(sd * 0.85, 7.3, 0.45); P.push(paint(l, RED)); P.push(paint(beam([sd * 0.2, 7.2, 0.4], [sd * 0.8, 5.6, 0.7], 0.32, 0.12), RED)); }
    P.push(paint(sph(0.35, 1, 0.8, 0.8, 0, 7.3, 0.55), RED));
    return merge(P);
  },
  glass() { return lathe([[0, 0], [1.1, 0], [1.1, 0.12], [0.12, 0.25], [0.1, 2.6], [0.9, 3.2], [1.2, 4.4], [1.15, 5.4], [1.08, 5.4], [1.1, 4.4], [0.85, 3.3], [0, 3.0]], 18); },
  wineIn() { return lathe([[0, 0], [0.8, 0.3], [1.02, 1.0], [0, 1.0]], 18); },
  // the mantel: the fireplace's surround, the shelf where the cards stand
  mantel() {
    const P = [paint(box(26, 1.2, 5, 0, 13.4, 0), WHITE), paint(box(24, 12.8, 3.6, 0, 6.4, -0.6), CREAM)];
    P.push(paint(box(11, 8, 3.8, 0, 4.2, -0.5), rgb(0x18120e)), paint(box(12.6, 0.8, 4.2, 0, 8.6, -0.3), WHITE));
    for (const x of [-10.4, 10.4]) P.push(paint(box(2.4, 12.8, 4.2, x, 6.4, -0.3), WHITE));
    P.push(paint(box(30, 0.6, 12, 0, 0.3, 3), BRICK));
    return merge(P);
  },
  // a card standing open on the mantel: its front (GC.cardFace) and back, a V seen from above
  card() {
    const back = box(4.0, 5.0, 0.08, 0, 2.5, -1.0); back.rotateY(0.5);
    return merge([paint(back, CHINA)]);
  },
  cardFace() { const g = face(4.0, 5.0, 0, 2.5, 0); g.rotateY(-0.35); g.translate(0.4, 0, 0.2); return g; },
  // a present: the box, its lid (GC.giftLid), the ribbon both ways
  gift() {
    const P = [paint(box(9, 7, 9, 0, 3.5, 0), rgb(0x2a6a8a))];
    P.push(paint(box(1.3, 7.05, 9.05, 0, 3.5, 0), GOLD), paint(box(9.05, 7.05, 1.3, 0, 3.5, 0), GOLD));
    return merge(P);
  },
  giftLid() {
    const P = [paint(box(9.6, 1.6, 9.6, 0, 0.8, 0), rgb(0x2f78a0)), paint(box(1.35, 1.65, 9.65, 0, 0.8, 0), GOLD), paint(box(9.65, 1.65, 1.35, 0, 0.8, 0), GOLD)];
    for (const a of [0.6, -0.6, 2.5, -2.5]) { const l = new THREE.TorusGeometry(1.4, 0.36, 8, 16); l.scale(1, 0.7, 0.45); l.rotateY(a); l.rotateZ(a > 0 ? 0.5 : -0.5); l.translate(Math.sin(a) * 1.2, 2.3, Math.cos(a) * 0.4); P.push(paint(l, GOLD)); }
    P.push(paint(sph(0.6, 1, 0.8, 1, 0, 2.2, 0), GOLD));
    return merge(P);
  },
  // the kitchen range and its kettle (GC.kettle on top): the oven, the knobs, the hob
  stove() {
    const P = [paint(box(15, 13, 11, 0, 6.5, 0), rgb(0xf2efe8)), paint(box(15.4, 0.6, 11.4, 0, 13.2, 0), BLACK)];
    P.push(paint(box(12, 7.4, 0.3, 0, 5.4, 5.6), rgb(0x1a1820)), paint(box(10, 0.5, 0.6, 0, 9.4, 5.9), CHROME));
    for (let k = 0; k < 5; k++) P.push(paint(cylZ(0.5, 0.5, 0.6, 12, -5 + k * 2.5, 11.3, 5.8), BLACK));
    P.push(paint(box(15, 5, 1.2, 0, 16, -5), rgb(0xf2efe8)));
    for (const [x, z] of [[-3.6, -2.4], [3.6, -2.4], [-3.6, 2.6], [3.6, 2.6]]) P.push(paint(cyl(2.2, 2.2, 0.25, 20, x, 13.6, z), rgb(0x2a2a30)));
    return merge(P);
  },
  // the kettle: chrome, its spout, the handle over the top, the whistle on the spout
  kettle() {
    const P = [paint(lathe([[0, 0], [3.0, 0], [3.4, 0.6], [3.3, 2.6], [2.6, 4.2], [1.4, 4.8], [0.9, 5.2], [0, 5.2]], 28), CHROME)];
    P.push(paint(tube([[2.6, 1.4], [4.3, 2.6], [5.2, 4.2], [5.6, 5.2]].map(([x, y]) => [x, y, 0]), 0.42, 20, 10), CHROME));
    P.push(paint(cyl(0.6, 0.48, 0.9, 10, 5.75, 5.6, 0).rotateZ(-0.5), BLACK));
    P.push(paint(tube([[-2.2, 3.8], [-1.6, 6.8], [1.6, 6.8], [2.2, 3.8]].map(([x, y]) => [x, y, 0]), 0.36, 24, 8), BLACK));
    P.push(paint(sph(0.55, 1, 0.8, 1, 0, 5.5, 0), BLACK));
    return merge(P);
  },
  // the dining room: a round table in its cloth, its chairs round it; the place cards are GC.place
  table() {
    const P = [paint(cyl(7.5, 7.5, 0.5, 32, 0, 9.2, 0), LINEN), paint(cyl(7.6, 8.4, 8.8, 32, 0, 4.6, 0), LINEN)];
    P.push(paint(lathe([[0, 9.4], [1.4, 9.4], [1.1, 10.4], [0.4, 12.6], [0.5, 13.4], [0, 13.4]], 14), CHINA));
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2, x = Math.cos(a) * 10.2, z = Math.sin(a) * 10.2;
      const VELVET = rgb(0xa8384a); const ch = merge([paint(box(4, 0.6, 4, 0, 5.4, 0), VELVET), paint(box(4, 8, 0.6, 0, 9.4, -1.8), VELVET), paint(box(0.5, 5.4, 0.5, -1.6, 2.7, 1.6), OAK_DK), paint(box(0.5, 5.4, 0.5, 1.6, 2.7, 1.6), OAK_DK), paint(box(0.5, 5.4, 0.5, -1.6, 2.7, -1.6), OAK_DK), paint(box(0.5, 5.4, 0.5, 1.6, 2.7, -1.6), OAK_DK)]);
      ch.rotateY(-a - Math.PI / 2); ch.translate(x, 0, z); P.push(ch);
      const pl = cyl(1.5, 1.2, 0.2, 18, Math.cos(a) * 5.6, 9.55, Math.sin(a) * 5.6); P.push(paint(pl, CHINA));
    }
    return merge(P);
  },
  // a place card: a little tent of card (its name is the face)
  place() { const g = face(2.6, 1.5, 0, 0, 0); g.rotateX(-0.3); return g; },
  // the seating chart on its easel (the chart is GC.chartFace)
  easel() {
    const P = [];
    for (const sd of [-1, 1]) P.push(paint(beam([sd * 4.2, 0, 1.4], [sd * 1.0, 24, 0], 0.6), OAK_DK));
    P.push(paint(beam([0, 0, -6], [0, 22, 0], 0.5), OAK_DK), paint(box(12, 0.8, 1.6, 0, 7.6, 1.0), OAK_DK));
    P.push(paint(box(12.4, 15.6, 0.4, 0, 15.8, 0.5), GOLD));
    return merge(P);
  },
  chartFace() { return face(11.4, 14.4, 0, 15.8, 0.74); },
  // a door in the hall's wall: its frame (the leaf is GC.leaf, hung at the frame's left post)
  doorFrame() {
    const P = [paint(box(1.2, 26, 2.2, -7.6, 13, 0), WHITE), paint(box(1.2, 26, 2.2, 7.6, 13, 0), WHITE), paint(box(16.4, 1.6, 2.4, 0, 26.4, 0), WHITE)];
    P.push(paint(box(14, 25.4, 0.2, 0, 12.7, -0.9), rgb(0x0e0a10)));
    return merge(P);
  },
  // the leaf: panels, the knob; its hinge at x = 0, its width down +x
  leaf() {
    const P = [paint(box(14, 25, 0.8, 7, 12.5, 0), rgb(0xe8e2d6))];
    for (const [x, y, w, h] of [[3.6, 19, 5.4, 9], [10.4, 19, 5.4, 9], [3.6, 6.5, 5.4, 10], [10.4, 6.5, 5.4, 10]]) for (const z of [0.42, -0.42]) P.push(paint(box(w, h, 0.14, x, y, z), rgb(0xd6cfc0)));
    for (const z of [0.7, -0.7]) P.push(paint(sph(0.55, 1, 1, 1, 12.4, 12.4, z), BRASS));
    return merge(P);
  },
  // the towel rail and the two towels, his and hers (their fronts are GC.towelFace)
  rail() {
    const P = [paint(box(20, 0.6, 0.6, 0, 18, 1.6), CHROME), paint(box(0.8, 3, 2.2, -10, 18, 0.6), CHROME), paint(box(0.8, 3, 2.2, 10, 18, 0.6), CHROME)];
    for (const x of [-4.6, 4.6]) P.push(paint(box(8.4, 0.5, 1.4, x, 18.3, 1.6), x < 0 ? NAVY : PINK));
    return merge(P);
  },
  towelFace() { return face(8.4, 11, 0, 12.6, 2.0); },
  // a floor lamp: the stand and the shade (lit, it's a glow inside)
  floorLamp() {
    const P = [paint(cyl(2.2, 2.6, 0.6, 18, 0, 0.3, 0), BRASS), paint(cyl(0.3, 0.3, 22, 8, 0, 11.4, 0), BRASS)];
    P.push(paint(cyl(2.6, 4.2, 5.4, 20, 0, 23.4, 0), rgb(0xf4e6c8)));
    return merge(P);
  },
  // the armchair by the lamp, the blanket folded on it, the slippers set out, the tea poured
  armchair() {
    const P = [paint(box(11, 4.4, 10, 0, 3.6, 0), SAGE), paint(box(11, 10, 2.8, 0, 8.4, -3.6), SAGE)];
    for (const sd of [-1, 1]) P.push(paint(box(2.2, 7.2, 10.5, sd * 5.6, 5.0, 0), SAGE_DK));
    P.push(paint(box(7, 1.4, 7, 0, 6.5, 0.8), rgb(0x8ab09a)), paint(box(6, 0.9, 4, 0.4, 7.6, 1.6), rgb(0xc4283a)), paint(box(6, 0.2, 4.05, 0.4, 7.6, 1.6), rgb(0xf4e6c8)));
    for (const sd of [-1, 1]) P.push(paint(sph(1.1, 1, 0.45, 2.2, sd * 1.4, 0.45, 8.6), PINK));
    P.push(paint(cyl(2.6, 2.6, 0.4, 16, 9.6, 6.8, 2), OAK), paint(cyl(0.3, 0.3, 6.6, 8, 9.6, 3.3, 2), OAK_DK));
    P.push(paint(lathe([[0, 0], [0.9, 0], [1.2, 1.2], [1.0, 1.2], [0, 0.2]], 14).translate(9.6, 7.0, 2), CHINA));
    return merge(P);
  },
  // the bath he ran: a clawfoot tub, the bubbles over its rim, candles round it
  tub() {
    const P = [];
    const shell = lathe([[0, 0], [6.5, 0.2], [7.4, 1.6], [7.6, 5.0], [7.9, 5.4], [7.4, 5.5], [7.0, 1.8], [0, 1.4]], 28); shell.scale(1.7, 1, 1); shell.translate(0, 2.0, 0); P.push(paint(shell, rgb(0xf6f4f0)));
    for (const [x, z] of [[-9.5, -4.2], [9.5, -4.2], [-9.5, 4.2], [9.5, 4.2]]) P.push(paint(sph(0.9, 1, 1.6, 1, x, 1.2, z), GOLD));
    for (let k = 0; k < 26; k++) { const a = k * 2.4, r = 3 + (k % 5) * 1.6; P.push(paint(sph(1.2 + (k % 3) * 0.5, 1, 0.8, 1, Math.cos(a) * r * 1.6, 7.2 + (k % 4) * 0.4, Math.sin(a) * r * 0.8), rgb(0xfdfaff))); }
    for (const [x, z, h] of [[-13, 6.8, 3], [-10.6, 8.2, 2.2], [12, 7.2, 3.4], [14, 5.4, 2.4], [0, 9.6, 2.8]]) P.push(paint(cyl(0.6, 0.6, h, 12, x, h / 2, z), CHINA));
    return merge(P);
  },

  // ---- the vault ----
  // a pillar of safe-deposit boxes, 4 wide: the drawers are GC.drawer, sliding out on the beat
  boxes() {
    const P = [paint(box(14, 30, 6, 0, 15, 0), rgb(0x9ca0a8)), paint(box(14.6, 1.0, 6.6, 0, 30.4, 0), rgb(0xc8a050)), paint(box(14.6, 1.0, 6.6, 0, 0.5, 0), rgb(0x5a5c62))];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) P.push(paint(box(3.0, 3.2, 0.3, -5.1 + c * 3.4, 2.4 + r * 3.6, 3.1), rgb(0xb8bcc4)));
    return merge(P);
  },
  drawer() {
    const P = [paint(box(3.0, 3.2, 0.5, 0, 0, 0.2), BRASS), paint(box(1.2, 0.35, 0.5, 0, 0.6, 0.6), rgb(0xf0d090)), paint(cylZ(0.28, 0.28, 0.3, 10, 0, -0.6, 0.55), BLACK)];
    return merge(P);
  },
  // the piggy bank: the pig, its snout, ears, legs, the curl of its tail, the slot on its back
  pig() {
    const P = [paint(sph(9, 1.25, 0.95, 1, 0, 11, 0, 24, 18), PINK)];
    P.push(paint(cylX(2.6, 2.6, 2.4, 20, 11.4, 11, 0), rgb(0xf08aa6)));
    for (const sd of [-1, 1]) { P.push(paint(sph(0.5, 1, 1, 1, 12.7, 11.6, sd * 0.9), rgb(0x7a2a3a))); P.push(paint(sph(2.4, 0.5, 1.2, 1, 7, 18.4, sd * 4.2), rgb(0xf08aa6))); P.push(paint(sph(0.7, 1, 1, 1, 9.8, 14.6, sd * 3.6), BLACK)); }
    for (const [x, z] of [[-6, -4.6], [6, -4.6], [-6, 4.6], [6, 4.6]]) P.push(paint(cyl(2.0, 1.7, 5, 14, x, 2.5, z), PINK));
    P.push(paint(tube([[-11, 12, 0], [-13, 13.4, 1], [-12.6, 15, 0], [-11.6, 14.2, -0.6], [-12.4, 13.2, 0]], 0.45, 30, 8), PINK));
    P.push(paint(box(5, 0.4, 0.9, 0, 19.6, 0), rgb(0x5a1a2a)));
    return merge(P);
  },
  coin() { const g = cyl(1.3, 1.3, 0.3, 20); g.rotateX(Math.PI / 2); return paint(g, GOLD); },
  // the ledger on its lectern, open (its pages are GC.ledgerFace)
  lectern() {
    const P = [paint(box(4, 18, 4, 0, 9, 0), OAK_DK), paint(box(10, 1, 8, 0, 0.5, 0), OAK_DK)];
    const top = box(18, 1, 12, 0, 0, 0); top.rotateX(0.5); top.translate(0, 19.4, 0); P.push(paint(top, OAK_DK));
    const cover = box(19, 0.5, 12.6, 0, 0.75, 0); cover.rotateX(0.5); cover.translate(0, 19.4, 0); P.push(paint(cover, WINE));
    return merge(P);
  },
  ledgerFace() { const g = face(18, 11.4, 0, 0, 0); g.rotateX(0.5 - Math.PI / 2); g.translate(0, 20.33, 0.51); return g; },
  // the vault door, open on its hinge: the round steel door with its bolts and wheel
  vaultDoor() {
    const P = [];
    const d = cyl(16, 16, 4, 48); d.rotateX(Math.PI / 2); P.push(paint(d, rgb(0xb8bcc2)));
    const rim = new THREE.TorusGeometry(15.4, 0.9, 10, 48); rim.translate(0, 0, 2.1); P.push(paint(rim, rgb(0x8a8e96)));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; P.push(paint(cylZ(0.9, 0.9, 3.4, 12, Math.cos(a) * 13.4, Math.sin(a) * 13.4, 1.2), CHROME)); }
    const wheel = new THREE.TorusGeometry(4.4, 0.45, 8, 32); wheel.translate(0, 0, 3.4); P.push(paint(wheel, CHROME));
    for (let k = 0; k < 3; k++) { const s = box(8.8, 0.6, 0.6, 0, 0, 3.4); s.rotateZ(k * Math.PI / 3); P.push(paint(s, CHROME)); }
    P.push(paint(cylZ(1.4, 1.4, 1.2, 16, 0, 0, 3.4), BRASS));
    return merge(P);
  },
  // ---- the choruses: her street, his reputation ----
  // the mug on the lawn, as tall as a house: the body (its print is GC.mugFace), the handle
  mug() {
    const P = [paint(cyl(13, 12.4, 30, 40, 0, 15, 0), CHINA), paint(cyl(12.2, 12.2, 0.4, 40, 0, 29.9, 0), rgb(0x3a2418))];
    const h = new THREE.TorusGeometry(7, 2.2, 12, 28, Math.PI * 1.3); h.rotateZ(Math.PI * 0.35); h.translate(-15.7, 15, 0); P.push(paint(h, CHINA));
    return merge(P);
  },
  mugFace() { const g = new THREE.CylinderGeometry(13.05, 12.45, 20, 40, 1, true, -Math.PI * 0.48, Math.PI * 0.96); g.translate(0, 15, 0); return g; },
  // a giant note on a stake, like a sign in a lawn (the note is GC.boardFace, its words his)
  stake() { return merge([paint(box(1.2, 16, 1.2, 0, 8, -1.0), OAK)]); },
  boardFace() { const g = noteGeo(0.12, 8); g.scale(17, 17, 17); g.translate(0, 23, 0); return g; },
  // the bunting: a line across the street (along x, its sag drawn by the part), and its notes
  line() { const g = cyl(0.08, 0.08, 1, 5); g.rotateZ(Math.PI / 2); return paint(g, rgb(0xe8e0d0)); },
};
// where a house's front windows are: ground floor either side of the porch, three upstairs
const WINS = [[-12.5, 7.8], [12.5, 7.8], [-12.5, 19.2], [0, 19.2], [12.5, 19.2]];

// ---------- the pickup: a pad of his sticky notes, the top one lifting ----------
export function padGeometry() {
  const parts = [];
  // the pad: a block of paper, its edges striped where the sheets are
  for (let k = 0; k < 5; k++) parts.push(paint(box(0.62, 0.05, 0.62, 0, -0.14 + k * 0.05, 0), k % 2 ? [1, 0.9, 0.42] : [1, 0.84, 0.3]));
  // the top sheet, curling up at one corner
  const top = new THREE.PlaneGeometry(0.62, 0.62, 6, 6); top.rotateX(-Math.PI / 2);
  const p = top.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), u = Math.max(0, (x + z) / 0.62 - 0.1); p.setY(i, 0.12 + 0.24 * u * u); }
  top.computeVertexNormals();
  parts.push(paint(top, [1, 0.93, 0.48]));
  const under = top.clone(); under.scale(1, 1, 1); under.translate(0, -0.004, 0); const ix = under.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; }
  parts.push(paint(under, [0.95, 0.82, 0.32]));
  // his smiley on it, in ink
  const ring = new THREE.TorusGeometry(0.15, 0.022, 6, 20); ring.rotateX(-Math.PI / 2); ring.translate(-0.06, 0.13, -0.06); parts.push(paint(ring, [0.12, 0.16, 0.36]));
  const smile = new THREE.TorusGeometry(0.085, 0.02, 6, 12, Math.PI * 0.75); smile.rotateZ(-Math.PI * 0.875); smile.rotateX(-Math.PI / 2); smile.translate(-0.06, 0.135, -0.06); parts.push(paint(smile, [0.12, 0.16, 0.36]));
  for (const sd of [-1, 1]) parts.push(paint(sph(0.022, 1, 1, 1, -0.06 + sd * 0.05, 0.135, -0.11, 6, 4), [0.12, 0.16, 0.36]));
  const g = merge(parts); g.rotateX(0.9);
  return g;
}
export const pickup = {
  key: 'sticky', geo: padGeometry, color: 0xffe25a, mat: { rough: 0.55, metal: 0, emissive: 0x5a4810, side: THREE.DoubleSide }, s: 1.75, lit: 1.2, face: true,
  move: (e, time, i, yaw) => e.set(Math.sin(time * 1.3 + i) * 0.18, yaw + Math.sin(time * 1.1 + i * 1.7) * 0.6, Math.sin(time * 0.9 + i) * 0.12),
};
