// Spiked: the pictures the place needs, drawn once on one canvas: the three notifications
// (his words: friends, family, bosses), the little ones that keep coming, the upload, the
// photographs on the corridor walls, the alarm clock's face, a phone's screen recording, and
// the bus's sign in the morning. Each is a rectangle of the sheet; a plane gets its uv.

import * as THREE from 'three';

const W = 2048, H = 1024;
// cells in pixels: x, y, w, h
export const CELL = {
  friends: [0, 0, 512, 256], family: [512, 0, 512, 256], bosses: [1024, 0, 512, 256], bubble: [1536, 0, 512, 256],
  upload: [0, 256, 512, 128], done: [0, 384, 512, 128], rec: [512, 256, 256, 256], clock: [768, 256, 256, 256],
  photo0: [1024, 256, 256, 256], photo1: [1280, 256, 256, 256], photo2: [1536, 256, 256, 256], photo3: [1792, 256, 256, 256],
  home: [0, 512, 512, 128], bubble2: [512, 512, 512, 256], bubble3: [1024, 512, 512, 256], seen: [1536, 512, 512, 256],
};

function round(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
// people in a circle: one, two, three heads and shoulders
function people(g, cx, cy, r, n, c) {
  g.fillStyle = c;
  const xs = n === 1 ? [0] : n === 2 ? [-0.28, 0.28] : [-0.38, 0, 0.38];
  for (const dx of xs) {
    const x = cx + dx * r, s = n === 1 ? 1 : 0.72;
    g.beginPath(); g.arc(x, cy - r * 0.18 * s, r * 0.24 * s, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x, cy + r * 0.48 * s, r * 0.42 * s, r * 0.36 * s, 0, Math.PI, 0); g.fill();
  }
}
function card(g, [x, y, w, h], word, ring, n) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18;
  g.fillStyle = '#f6f4fa'; round(g, x + 14, y + 22, w - 28, h - 44, 34); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = ring; g.beginPath(); g.arc(x + 100, y + h / 2, 62, 0, Math.PI * 2); g.fill();
  people(g, x + 100, y + h / 2 + 6, 60, n, '#ffffff');
  g.fillStyle = '#16141c'; g.font = '900 64px "Arial Black", Impact, sans-serif'; g.textBaseline = 'middle';
  g.fillText(word, x + 186, y + h / 2 - 26);
  g.fillStyle = '#b8b4c4'; round(g, x + 188, y + h / 2 + 22, w - 250, 18, 9); g.fill(); round(g, x + 188, y + h / 2 + 52, (w - 250) * 0.62, 18, 9); g.fill();
  // the red count
  g.fillStyle = '#ff2a3a'; g.beginPath(); g.arc(x + 150, y + h / 2 - 50, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 30px Arial, sans-serif'; g.textAlign = 'center'; g.fillText(String(n * 7 + 2), x + 150, y + h / 2 - 48);
  g.restore();
}
function bubble(g, [x, y, w, h], tint, lines) {
  g.save();
  g.fillStyle = tint; round(g, x + 20, y + 40, w - 40, h - 90, 40); g.fill();
  g.beginPath(); g.moveTo(x + 70, y + h - 52); g.lineTo(x + 54, y + h - 16); g.lineTo(x + 110, y + h - 52); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < lines; k++) { round(g, x + 60, y + 72 + k * 36, (w - 140) * (k === lines - 1 ? 0.55 : 1), 16, 8); g.fill(); }
  g.restore();
}
function photo(g, [x, y, w, h], k) {
  g.save();
  const sky = [['#ffb38a', '#ffe0b0'], ['#8ac8ff', '#e8f4ff'], ['#ff8ab8', '#ffd8e8'], ['#a8e0a0', '#f0ffe0']][k];
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
  g.fillStyle = gr; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  // a day out: the people in it, smiling at whoever held the camera
  g.fillStyle = k === 1 ? '#3a6a8a' : '#c89060'; g.fillRect(x + 8, y + h * 0.7, w - 16, h * 0.3 - 8);
  const n = [2, 3, 1, 2][k];
  for (let i = 0; i < n; i++) {
    const cx = x + w * (n === 1 ? 0.5 : 0.3 + 0.4 * i / (n - 1)), cy = y + h * 0.52;
    g.fillStyle = ['#2a1a14', '#4a2a1a', '#1a1a2a'][i % 3]; g.beginPath(); g.ellipse(cx, cy + 46, 34, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f0c8a8'; g.beginPath(); g.arc(cx, cy - 6, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1810'; g.beginPath(); g.arc(cx, cy - 12, 23, Math.PI, 0); g.fill();
  }
  g.restore();
}

let TEX = null;
export function spdTexture() {
  if (TEX) return TEX;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  card(g, CELL.friends, 'FRIENDS', '#3a8aff', 3);
  card(g, CELL.family, 'FAMILY', '#ff7a2a', 2);
  card(g, CELL.bosses, 'BOSSES', '#5a5a6a', 1);
  bubble(g, CELL.bubble, '#3a8aff', 3);
  bubble(g, CELL.bubble2, '#2ac86a', 2);
  bubble(g, CELL.bubble3, '#e8e6f0', 3);
  bubble(g, CELL.seen, '#ff4a8a', 2);
  // the upload: a word and an arrow, then 100%
  for (const [key, text] of [['upload', '↑ UPLOADING'], ['done', '100%']]) {
    const [x, y, w, h] = CELL[key];
    g.fillStyle = '#0a0a12'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.shadowColor = '#7ad8ff'; g.shadowBlur = 16; g.fillStyle = '#e8f8ff'; g.font = '900 64px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + h / 2 + 4); g.shadowBlur = 0;
  }
  // a phone recording: the frame lines, the red dot, the time
  { const [x, y, w, h] = CELL.rec; g.fillStyle = '#d8e4f0'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(x + w * f, y); g.lineTo(x + w * f, y + h); g.stroke(); g.beginPath(); g.moveTo(x, y + h * f); g.lineTo(x + w, y + h * f); g.stroke(); }
    g.fillStyle = '#ff1a2a'; g.beginPath(); g.arc(x + 46, y + 40, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 30px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('REC 00:07', x + 74, y + 42);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + w / 2, y + h - 34, 20, 0, Math.PI * 2); g.fill(); }
  // the clock: six in the morning
  { const [x, y, w, h] = CELL.clock, cx = x + w / 2, cy = y + h / 2; g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(cx, cy, 120, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1e'; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.save(); g.translate(cx + Math.sin(a) * 100, cy - Math.cos(a) * 100); g.rotate(a); g.fillRect(-4, -12, 8, 24); g.restore(); }
    g.lineCap = 'round'; g.strokeStyle = '#1a1a1e'; g.lineWidth = 12; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 62); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 92); g.stroke(); g.fillStyle = '#d82a2a'; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill(); }
  for (let k = 0; k < 4; k++) photo(g, CELL['photo' + k], k);
  // the bus's sign
  { const [x, y, w, h] = CELL.home; g.fillStyle = '#0b0804'; g.fillRect(x, y, w, h); g.shadowColor = '#ffb347'; g.shadowBlur = 18; g.fillStyle = '#ffc870'; g.font = 'bold 92px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOME', x + w / 2, y + h / 2 + 4); g.shadowBlur = 0; }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  TEX = t;
  return t;
}
// a plane of w x h metres showing a cell of the sheet
export function cellPlane(key, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const [x, y, cw, ch] = CELL[key], uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * cw) / W, 1 - (y + (1 - uv.getY(i)) * ch) / H);
  return g;
}
