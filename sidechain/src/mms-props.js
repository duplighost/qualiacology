// Miss Misdemeanor: the things in the courthouse on pageant night, a few times life size so they read
// from the board. Geometry only, vertex-coloured; the lights are glows the world draws, and the pictures
// (the rap sheet the sash is printed with, the judges' cards, her number, the height chart, the poster,
// the exhibit tents, the newspapers, her name in bulbs, the script, the bricks, the question) are
// canvases made here. mms-world.js puts them in the place; the pickup, a rose, is at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const tor = (r, t, x = 0, y = 0, z = 0, arc = Math.PI * 2, n = 24) => { const g = new THREE.TorusGeometry(r, t, 8, n, arc); g.translate(x, y, z); return g; };
const _Y = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion();
// a round rod from one point to another
function rod(a, b, r, n = 8) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.CylinderGeometry(r, r, len, n);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
// a square-section piece from one point to another
function beam(a, b, w, d = w) {
  _bd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _bd.length(); _bd.multiplyScalar(1 / len);
  const g = new THREE.BoxGeometry(w, len, d);
  _bq.setFromUnitVectors(_Y, _bd); g.applyQuaternion(_bq);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
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
// a plane for a picture, w by h, its face to +z
const face = (w, h, x = 0, y = 0, z = 0) => { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); return g; };
// a tube along points (a gilt hoop, a wire)
const tube = (pts, r, n = 48) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), n, r, 8, false);
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const RED = rgb(0xe8103a), CHERRY = rgb(0xff2f6d), PINK = rgb(0xff7ab0), BLUSH = rgb(0xffc4d8), SATIN = rgb(0xff4a8a),
  GOLD = rgb(0xe8b84a), BRASS = rgb(0xb88a2a), CREAM = rgb(0xf2e8d8), MARBLE = rgb(0xe8e2d8), WHITE = rgb(0xf4f0ec),
  BLACK = rgb(0x121016), DARK = rgb(0x2a2430), STEEL = rgb(0x8a909a), CHROME = rgb(0xd4d8e0), VELVET = rgb(0x8a0a22),
  WOOD = rgb(0x5a3418), WALNUT = rgb(0x3a2010), OAK = rgb(0x8a5a30), LEATHER = rgb(0x4a1a12), AMBER = rgb(0xffa020),
  NAVY = rgb(0x1a2440), TWEED = rgb(0x7a6450), GREEN = rgb(0x2a7a3a), LEAF = rgb(0x1e5a2a), TAN = rgb(0xc8a070),
  PAPER = rgb(0xece6d6), GLOSS = rgb(0xff5a96), ORANGE = rgb(0xff6a10), SILVER = rgb(0xc8ccd4), GREY = rgb(0x8a8890),
  BLUE = rgb(0x2a5ad8), YELLOW = rgb(0xffd23a), CARPET = rgb(0x3a0810);

const FONT = (w, s) => `${w} ${s}px "Arial Black", Impact, sans-serif`;
const SERIF = (w, s) => `${w} ${s}px Georgia, "Times New Roman", serif`;
const SANS = (w, s) => `${w} ${s}px "Segoe UI", Arial, sans-serif`;
function centre(g, txt, x, y, font, col, maxW) { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y, maxW); }

// ---------- the pictures ----------
// the rap sheet her sash is cut from: satin, gold edges, her name and her charges, round and round
export function rapTexture() {
  const t = canvasTex(2048, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ff5a96'); gr.addColorStop(0.5, '#ff2f6d'); gr.addColorStop(1, '#c8104a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd76a'; g.fillRect(0, 6, W, 7); g.fillRect(0, H - 13, W, 7);
    const items = ['MISS MISDEMEANOR', 'DISORDERLY CONDUCT', 'MISS MISDEMEANOR', 'DISTURBING THE PEACE', 'MISS MISDEMEANOR', 'RESISTING'];
    g.font = SERIF(700, 50); g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = 30;
    for (const it of items) { g.fillStyle = '#fff6ec'; g.fillText(it, x, H / 2 + 2); x += g.measureText(it).width + 34; g.fillStyle = '#ffd76a'; g.fillText('✦', x, H / 2); x += 70; }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
// the judges' cards: a ten, and the other side
export function cardTexture() {
  return canvasTex(512, 192, (g, W, H) => {
    for (let k = 0; k < 2; k++) {
      const x = k * 256;
      g.fillStyle = '#fbf8f0'; g.fillRect(x, 0, 256, H);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 8; g.strokeRect(x + 8, 8, 240, H - 16);
      if (k === 0) centre(g, '10', x + 128, H / 2 + 6, FONT(900, 120), '#1a1a1a', 220);
      else centre(g, 'GUILTY', x + 128, H / 2 + 4, FONT(900, 56), '#c8102a', 224);
    }
  });
}
// her number, pinned on; and the same card on its easel
export function numberTexture() {
  return canvasTex(512, 368, (g, W, H) => {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8102a'; g.lineWidth = 10; g.strokeRect(16, 16, W - 32, H - 32);
    centre(g, '13', W / 2, H / 2 + 20, FONT(900, 230), '#16121a', W - 80);
    centre(g, 'CONTESTANT', W / 2, 52, SANS(800, 34), '#c8102a', W - 80);
  });
}
// the booking board she holds in the last picture
export function placardTexture() {
  return canvasTex(768, 448, (g, W, H) => {
    g.fillStyle = '#121014'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8e4dc'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
    centre(g, 'COUNTY COURTHOUSE', W / 2, 70, SANS(800, 40), '#e8e4dc', W - 60);
    centre(g, 'MISS MISDEMEANOR', W / 2, 190, FONT(900, 70), '#ffffff', W - 60);
    centre(g, 'NO. 13', W / 2, 300, FONT(900, 76), '#ff4a7a', W - 60);
    centre(g, '10 29 26', W / 2, 390, SANS(700, 38), '#e8e4dc', W - 60);
  });
}
// the height chart: a line every two inches, the feet marked, 3'6" to 7'6"
export function chartTexture() {
  return canvasTex(512, 1024, (g, W, H) => {
    g.fillStyle = '#d4d6d0'; g.fillRect(0, 0, W, H);
    const lo = 42, hi = 90, inch = H / (hi - lo);
    for (let i = lo; i <= hi; i += 2) {
      const y = H - (i - lo) * inch, major = i % 6 === 0;
      g.fillStyle = major ? '#1a1a1e' : '#4a4a50';
      g.fillRect(0, y - (major ? 3 : 1.2), W, major ? 6 : 2.4);
      if (major) {
        const ft = Math.floor(i / 12), inn = i % 12, s = inn ? `${ft}'${inn}"` : `${ft}'`;
        g.font = FONT(900, 36); g.textBaseline = 'bottom'; g.textAlign = 'left'; g.fillStyle = '#1a1a1e'; g.fillText(s, 14, y - 6);
        g.textAlign = 'right'; g.fillText(s, W - 14, y - 6);
      }
    }
  });
}
// the pageant's poster, torn on "tear me apart"
export function posterTexture() {
  return canvasTex(512, 896, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5a0414'); gr.addColorStop(1, '#16020a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8b84a'; g.lineWidth = 12; g.strokeRect(18, 18, W - 36, H - 36);
    centre(g, 'MISS', W / 2, 110, FONT(900, 92), '#ffd76a', W - 70);
    centre(g, 'MISDEMEANOR', W / 2, 200, FONT(900, 64), '#ffd76a', W - 70);
    // the sash, across where a heart would be
    g.save(); g.translate(W / 2, 470); g.rotate(-0.55); g.fillStyle = '#ff2f6d'; g.fillRect(-260, -42, 520, 84); g.fillStyle = '#fff2e8'; g.font = SERIF(700, 40); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAD LITTLE WINNER', 0, 2); g.restore();
    // a tiara over it all
    g.strokeStyle = '#ffd76a'; g.lineWidth = 9; g.beginPath(); g.moveTo(140, 340); g.lineTo(170, 290); g.lineTo(205, 330); g.lineTo(256, 262); g.lineTo(307, 330); g.lineTo(342, 290); g.lineTo(372, 340); g.closePath(); g.stroke();
    centre(g, 'LIVE · ONE NIGHT ONLY', W / 2, 700, SANS(800, 34), '#fff2e8', W - 70);
    centre(g, 'NO. 13', W / 2, 790, FONT(900, 64), '#ff2f6d', W - 70);
  });
}
// the evidence tents: A to E
export function tentTexture() {
  return canvasTex(640, 160, (g, W, H) => {
    for (let k = 0; k < 5; k++) { const x = k * 128; g.fillStyle = '#ffd23a'; g.fillRect(x, 0, 128, H); g.fillStyle = '#16121a'; g.fillRect(x + 6, 6, 116, 10); centre(g, 'ABCDE'[k], x + 64, H / 2 + 10, FONT(900, 100), '#16121a', 110); }
  });
}
// the front pages: headlines she gets made into
export function paperTexture() {
  const heads = [['YOUR FAVORITE', 'CAUTIONARY TALE'], ['MISS', 'MISDEMEANOR'], ['THE GIRL', 'ON TRIAL'], ['BAD LITTLE', 'WINNER']];
  return canvasTex(1024, 1408, (g, W, H) => {
    heads.forEach(([a, b], k) => {
      const x = (k % 2) * 512, y = Math.floor(k / 2) * 704;
      g.fillStyle = '#ece6d6'; g.fillRect(x, y, 512, 704);
      centre(g, 'THE COUNTY HERALD', x + 256, y + 52, SERIF(900, 46), '#16121a', 470);
      g.fillStyle = '#16121a'; g.fillRect(x + 24, y + 86, 464, 5); g.fillRect(x + 24, y + 96, 464, 2);
      centre(g, a, x + 256, y + 160, FONT(900, 58), '#16121a', 470);
      centre(g, b, x + 256, y + 236, FONT(900, 64), '#c8102a', 470);
      // a photo box and the columns
      g.fillStyle = '#3a3438'; g.fillRect(x + 24, y + 300, 228, 200);
      g.fillStyle = '#ff2f6d'; g.fillRect(x + 60, y + 360, 160, 26);
      for (let r = 0; r < 26; r++) { g.fillStyle = '#7a7470'; g.fillRect(x + 270, y + 306 + r * 14, 218 - (r % 5 === 4 ? 70 : 0), 6); }
      for (let r = 0; r < 12; r++) { g.fillStyle = '#7a7470'; g.fillRect(x + 24, y + 520 + r * 14, 464 - (r % 4 === 3 ? 120 : 0), 6); }
    });
  });
}
// her name in bulbs, a letter at a time: cell n has the first n letters lit
export const NAME = 'MISS MISDEMEANOR';
export function nameTexture() {
  return canvasTex(2048, 512, (g, W, H) => {
    const cw = 512, ch = 128;
    for (let n = 0; n < 16; n++) {
      const x0 = (n % 4) * cw, y0 = Math.floor(n / 4) * ch;
      g.fillStyle = '#140608'; g.fillRect(x0, y0, cw, ch);
      g.font = FONT(900, 58); g.textBaseline = 'middle'; g.textAlign = 'left';
      const full = g.measureText(NAME).width, k = Math.min(1, (cw - 30) / full);
      g.save(); g.translate(x0 + cw / 2 - full * k / 2, y0 + ch / 2 + 3); g.scale(k, 1);
      let x = 0, lit = 0;
      for (const chr of NAME) {
        const on = chr !== ' ' && lit < n; if (chr !== ' ') lit++;
        g.shadowColor = on ? '#ffc040' : 'transparent'; g.shadowBlur = on ? 18 : 0;
        g.fillStyle = on ? '#fff0c8' : '#3a1a14'; g.fillText(chr, x, 0); x += g.measureText(chr).width;
      }
      g.restore();
    }
  });
}
// the script on its stand: names and lines
export function scriptTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, W, H);
    let y = 60;
    for (let k = 0; k < 7; k++) {
      centre(g, k % 2 ? 'HER' : 'YOU', W / 2, y, SANS(800, 30), '#1a1a1a', W - 80); y += 40;
      for (let r = 0; r < 2; r++) { g.fillStyle = k % 2 ? '#c8102a' : '#6a6460'; g.fillRect(90, y - 6, W - 180 - (r ? 90 : 0), 10); y += 22; }
      y += 22;
    }
  });
}
// the bricks behind the open mic
export function brickTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#2a1410'; g.fillRect(0, 0, W, H);
    const bw = 64, bh = 28;
    for (let r = 0; r * bh < H; r++) for (let c = -1; c * bw < W; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = 0.75 + 0.25 * Math.sin(r * 12.9 + c * 7.3);
      g.fillStyle = `rgb(${Math.round(130 * v)},${Math.round(48 * v)},${Math.round(36 * v)})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
    }
  });
}
// the question out of the bowl
export function questionTexture() {
  return canvasTex(384, 256, (g, W, H) => {
    g.fillStyle = '#fbf6ec'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8b84a'; g.lineWidth = 8; g.strokeRect(10, 10, W - 20, H - 20);
    centre(g, '?', W / 2, H / 2 + 8, FONT(900, 190), '#c8102a', W - 40);
  });
}
// the numbers over the lineup's places, 1 to 5
export function slotTexture() {
  return canvasTex(640, 160, (g, W, H) => {
    for (let k = 0; k < 5; k++) { const x = k * 128; g.fillStyle = '#16161a'; g.fillRect(x, 0, 128, H); centre(g, String(k + 1), x + 64, H / 2 + 6, FONT(900, 120), '#ffe04a', 110); }
  });
}

// ---------- materials ----------
// a picture cut into cells: each instance shows its own cell (aCell), lit by aK
export function cellMat(map, cols, rows, base = 0.14, gain = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uK: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aCell; attribute float aK; varying vec2 vUv; varying float vK;
      void main(){
        float c = mod(aCell, ${cols}.0), r = floor(aCell / ${cols}.0 + 0.01);
        vUv = vec2((uv.x + c) / ${cols}.0, 1.0 - (r + 1.0 - uv.y) / ${rows}.0); vK = aK;
        gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0)));
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uK; varying vec2 vUv; varying float vK;
      void main(){ vec3 c = texture2D(map, vUv).rgb; gl_FragColor = vec4(c * (${base.toFixed(3)} + ${gain.toFixed(3)} * vK) * uK, 1.0); }`,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
// vertex colours lit by how much each instance is on (aK)
export function kMat(base = 0.12, gain = 2.2) {
  return new THREE.ShaderMaterial({
    vertexColors: true,
    vertexShader: /* glsl */`
      attribute float aK; varying vec3 vC; varying float vK; varying vec3 vN;
      void main(){ vC = color; vK = aK; vN = mat3(instanceMatrix) * normal; gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0))); }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vK; varying vec3 vN;
      void main(){ float l = 0.5 + 0.5 * max(dot(normalize(vN), normalize(vec3(0.3, 0.8, 0.5))), 0.0); gl_FragColor = vec4(vC * (${base.toFixed(3)} * l + ${gain.toFixed(3)} * vK * (0.7 + 0.3 * l)), 1.0); }`,
  });
}
export function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, emissive: 0x1a2028 });
}

// ---------- the things ----------
// a stiletto in profile, extruded: toe forward (+z)
function heelGeo() {
  const s = new THREE.Shape();
  s.moveTo(5.2, 0.3); s.lineTo(3.0, 0.0); s.lineTo(1.1, 0.0);
  s.bezierCurveTo(-0.6, 0.25, -2.0, 2.6, -3.2, 3.7); s.lineTo(-4.4, 4.0);
  s.lineTo(-4.6, 5.7); s.bezierCurveTo(-3.4, 5.55, -1.4, 4.85, 0.4, 3.6);
  s.bezierCurveTo(1.6, 2.9, 3.0, 2.8, 4.2, 2.45); s.bezierCurveTo(5.0, 2.1, 5.55, 1.2, 5.2, 0.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.22, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -1.2); g.rotateY(-Math.PI / 2);
  return g;
}
const SEAT_W = 3.0, TIER_D = 5.4, TIER_H = 2.2;
// the gown on its form: a bodice, a skirt flaring to the floor (its colour, its trim)
function gownGeo(c, trim, h = 1) {
  return [
    paint(cyl(0.18, 0.18, 2.2 * h, 6, 0, 17.2 * h, 0), STEEL),
    paint(cyl(1.4, 1.9, 4.6 * h, 18, 0, 13.6 * h, 0), c),
    paint(cyl(1.95, 5.2, 10.6 * h, 24, 0, 6.0 * h, 0), c),
    paint(cyl(5.25, 5.25, 0.35, 24, 0, 0.9, 0), trim),
    paint(new THREE.TorusGeometry(1.5, 0.16, 8, 24).rotateX(Math.PI / 2).translate(0, 15.9 * h, 0), trim),
  ];
}
export const MG = {
  // ---- the steps ----
  // the marquee frame over the courthouse door
  marquee() { return merge([paint(box(47, 9.2, 1.0, 0, 0, -0.7), BLACK), paint(box(48, 0.6, 1.6, 0, 4.7, -0.4), GOLD), paint(box(48, 0.6, 1.6, 0, -4.7, -0.4), GOLD), paint(box(0.6, 10, 1.6, -23.8, 0, -0.4), GOLD), paint(box(0.6, 10, 1.6, 23.8, 0, -0.4), GOLD)]); },
  signFace(w, h) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
  // ---- the hall ----
  // a marble column: plinth, shaft, capital
  column() {
    return merge([paint(box(6, 1.4, 6, 0, 0.7, 0), MARBLE), paint(box(5.2, 0.8, 5.2, 0, 1.8, 0), CREAM), paint(cyl(2.0, 2.25, 26, 20, 0, 15.2, 0), MARBLE),
      paint(cyl(2.5, 2.0, 1.0, 20, 0, 28.6, 0), CREAM), paint(box(6.2, 1.2, 6.2, 0, 29.7, 0), MARBLE), paint(box(5.6, 0.5, 5.6, 0, 2.4, 0), GOLD)]);
  },
  // a stiletto, patent red
  heel() { return merge([paint(heelGeo(), RED), paint(cyl(0.42, 0.13, 4.1, 10, 0, 2.05, -4.05), RED), paint(box(1.9, 0.25, 4.4, 0, 4.25, -2.9), BLACK)]); },
  // the lipgloss: the tube of gloss, the gold neck, the black cap, the beacon on it
  gloss() {
    const parts = [paint(cyl(2.2, 2.4, 0.6, 24, 0, 0.3, 0), BLACK), paint(cyl(1.75, 1.75, 9.4, 28, 0, 5.3, 0), GLOSS), paint(cyl(1.85, 1.85, 0.6, 28, 0, 10.2, 0), GOLD),
      paint(cyl(1.8, 1.8, 4.4, 28, 0, 12.7, 0), BLACK), paint(cyl(1.1, 1.3, 0.7, 16, 0, 15.25, 0), DARK)];
    for (const y of [11.2, 12.7, 14.2]) parts.push(paint(cyl(1.84, 1.84, 0.18, 28, 0, y, 0), GOLD));
    return merge(parts);
  },
  beacon() { return paint(sph(1.05, 1, 1.15, 1, 0, 16.1, 0), AMBER); },
  // the thrift-store rack, the suit on it
  suit() {
    const parts = [];
    for (const x of [-6.5, 6.5]) { parts.push(paint(cyl(0.22, 0.22, 17, 8, x, 8.5, 0), CHROME), paint(box(0.5, 0.4, 5, x, 0.2, 0), CHROME)); }
    parts.push(paint(rod([-6.5, 17, 0], [6.5, 17, 0], 0.22), CHROME));
    parts.push(paint(tor(0.7, 0.12, 0, 17.4, 0, Math.PI * 1.4), STEEL), paint(beam([-3.2, 14.8, 0], [0, 15.9, 0], 0.25), WOOD), paint(beam([3.2, 14.8, 0], [0, 15.9, 0], 0.25), WOOD));
    parts.push(paint(box(6.8, 8.8, 1.3, 0, 10.6, 0), TWEED), paint(beam([-1.6, 14.6, 0.7], [0.1, 10.4, 0.7], 0.9, 0.12), rgb(0x5a4838)), paint(beam([1.6, 14.6, 0.7], [-0.1, 10.4, 0.7], 0.9, 0.12), rgb(0x5a4838)));
    parts.push(paint(beam([-3.6, 14.5, 0], [-4.4, 6.6, 0], 1.6, 1.2), TWEED), paint(beam([3.6, 14.5, 0], [4.4, 6.6, 0], 1.6, 1.2), TWEED));
    for (const y of [9.4, 8.0]) parts.push(paint(cyl(0.22, 0.22, 0.1, 8).rotateX(Math.PI / 2).translate(0.4, y, 0.7), BRASS));
    // the price tag on its string
    parts.push(paint(box(1.0, 1.5, 0.06, 4.6, 5.4, 0.8), WHITE), paint(box(0.04, 1.3, 0.04, 4.5, 6.6, 0.8), STEEL));
    return merge(parts);
  },
  // the sash, over the suit
  suitSash() { return paint(beam([-3.1, 14.0, 0.8], [2.9, 6.6, 0.8], 1.5, 0.16), CHERRY); },
  // ---- the firing squad: a camera on its tripod, aimed (+z) ----
  camera() {
    return merge([paint(beam([0, 7.6, 0], [2.4, 0, 1.2], 0.3), DARK), paint(beam([0, 7.6, 0], [-2.4, 0, 1.2], 0.3), DARK), paint(beam([0, 7.6, 0], [0, 0, -2.6], 0.3), DARK),
      paint(box(1.0, 0.7, 1.0, 0, 7.9, 0), DARK), paint(box(3.2, 2.2, 2.0, 0, 9.3, 0), BLACK), paint(cyl(0.8, 0.9, 2.4, 18).rotateX(Math.PI / 2).translate(0, 9.3, 2.2), DARK),
      paint(box(1.7, 1.0, 1.0, 0, 10.95, 0.4), SILVER), paint(box(1.5, 0.75, 0.12, 0, 10.95, 0.95), WHITE)]);
  },
  // ---- the seats: a stand of tiers, each with its row of seat backs and arms; +z to the road ----
  riser(tiers = 4) {
    const parts = [];
    for (let i = 0; i < tiers; i++) {
      const top = 1.2 + i * TIER_H, z0 = -i * TIER_D;
      parts.push(paint(box(13, top, TIER_D, 0, top / 2, z0 - TIER_D / 2), CARPET), paint(box(13, 0.18, 0.25, 0, top + 0.05, z0 - 0.1), GOLD));
      const zb = z0 - TIER_D + 1.0;
      for (let s = 0; s < 4; s++) {
        const x = -4.5 + s * SEAT_W;
        parts.push(paint(box(2.5, 3.4, 0.55, x, top + 2.6, zb), VELVET), paint(box(2.6, 0.5, 0.7, x, top + 4.3, zb), rgb(0x5a0616)));
        for (const ax of [-1.4, 1.4]) parts.push(paint(box(0.32, 1.9, 2.3, x + ax, top + 1.6, zb + 1.05), BLACK));
      }
    }
    return merge(parts);
  },
  // a row of four seat cushions, hinged at the back (y 0, z 0), down = flat toward the road
  cushions() { const parts = []; for (let s = 0; s < 4; s++) parts.push(paint(box(2.35, 0.6, 2.2, -4.5 + s * SEAT_W, 0, 1.1), VELVET), paint(box(2.2, 0.12, 1.9, -4.5 + s * SEAT_W, -0.33, 1.05), BLACK)); return merge(parts); },
  // her mother's: the handbag on the seat
  handbag() { return merge([paint(rrect(2.2, 1.5, 0.35, 1.0), BLACK).translate(0, 0.75, 0), paint(tor(0.7, 0.1, 0, 1.5, 0, Math.PI), BLACK), paint(box(0.4, 0.3, 0.1, 0, 1.1, 0.52), GOLD)]); },
  // ---- the safety pin through her number ----
  pinBody() {
    const parts = [paint(tor(1.3, 0.3, -7.2, 0, 0, Math.PI * 2, 20), SILVER), paint(rod([-6.9, -0.9, 0], [7.0, -0.9, 0], 0.3), SILVER),
      paint(rrect(2.6, 2.6, 0.6, 1.4), SILVER).translate(7.8, 0, 0), paint(box(1.6, 0.5, 1.5, 7.6, 0.2, 0), STEEL)];
    return merge(parts);
  },
  pinLeg() { return merge([paint(rod([0, 0, 0], [14.6, 0, 0], 0.3), SILVER), paint(cyl(0.3, 0.02, 0.8, 8).rotateZ(-Math.PI / 2).translate(15.0, 0, 0), SILVER)]); },
  card() { return merge([paint(rrect(9.4, 6.8, 0.5, 0.35), WHITE), paint(beam([-3, -3.4, -0.4], [-4.0, -6.4, -1.4], 0.35), WOOD), paint(beam([3, -3.4, -0.4], [4.0, -6.4, -1.4], 0.35), WOOD), paint(beam([0, 2.8, -0.4], [0, -6.4, -3.8], 0.35), WOOD)]); },
  cardFace() { const g = face(9.0, 6.4, 0, 0, 0.19); return g; },
  // ---- the height chart and the booking camera ----
  chart(w = 34, h = 24) { return merge([paint(box(w + 1.2, h + 1.2, 0.8, 0, h / 2, -0.5), DARK)]); },
  chartFace(w = 34, h = 24) { const g = face(w, h, 0, h / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / 18); return g; },
  booking() {
    const parts = [paint(beam([0, 8, 0], [3, 0, 1.6], 0.45), WALNUT), paint(beam([0, 8, 0], [-3, 0, 1.6], 0.45), WALNUT), paint(beam([0, 8, 0], [0, 0, -3.2], 0.45), WALNUT),
      paint(box(4.4, 3.8, 3.6, 0, 9.9, -0.4), WALNUT), paint(box(3.6, 3.4, 1.0, 0, 9.9, 1.8), BLACK), paint(cyl(1.2, 1.3, 1.6, 18).rotateX(Math.PI / 2).translate(0, 9.9, 3.0), DARK),
      paint(cyl(1.0, 1.0, 0.2, 18).rotateX(Math.PI / 2).translate(0, 9.9, 3.85), rgb(0x3a5a8a))];
    // the flash umbrella on its stand beside it
    parts.push(paint(cyl(0.18, 0.18, 14, 8, 5.4, 7, -1), STEEL), paint(new THREE.ConeGeometry(4.2, 3.0, 20, 1, true).rotateX(-Math.PI / 2).translate(5.4, 14, 0.4), WHITE));
    return merge(parts);
  },
  // ---- the courtroom ----
  // the pageant's microphone on its stand
  mic() { return merge([paint(cyl(2.0, 2.4, 0.4, 24, 0, 0.2, 0), CHROME), paint(cyl(0.16, 0.16, 10.4, 8, 0, 5.4, 0), CHROME), paint(tor(1.0, 0.12, 0, 11.2, 0), CHROME), paint(sph(0.95, 0.72, 1.3, 0.9, 0, 11.2, 0), CHROME), paint(box(0.2, 2.2, 0.22, 0, 11.2, 0.82), DARK)]); },
  // the judges' bench: panelled, the seal on its front, three nameplates, three high-backed chairs
  bench() {
    const parts = [paint(box(20, 7, 5, 0, 3.5, 0), WOOD), paint(box(20.8, 0.6, 5.8, 0, 7.3, 0.1), WALNUT), paint(box(20.4, 0.5, 5.4, 0, 0.25, 0.1), WALNUT)];
    for (const x of [-6.4, 0, 6.4]) { parts.push(paint(box(5.2, 4.6, 0.3, x, 3.7, 2.6), OAK), paint(box(3.0, 0.8, 0.3, x, 8.0, 2.2), GOLD), paint(box(3.4, 9, 1.0, x, 8.2, -2.4), LEATHER), paint(box(3.6, 0.5, 1.2, x, 12.8, -2.4), GOLD)); }
    parts.push(paint(cyl(1.7, 1.7, 0.35, 28).rotateX(Math.PI / 2).translate(0, 5.0, 2.85), GOLD));
    // the gavel on its block, and the lamps' green shades
    parts.push(paint(cyl(0.9, 1.0, 0.5, 18, 3.2, 7.85, 1.2), WALNUT), paint(cyl(0.45, 0.45, 2.4, 12).rotateZ(Math.PI / 2).translate(3.2, 8.7, 1.2), WALNUT), paint(rod([3.2, 8.7, 1.2], [5.6, 8.7, 2.4], 0.16), WALNUT));
    for (const x of [-9, 9]) parts.push(paint(cyl(0.12, 0.12, 2.0, 6, x, 8.6, 1.4), BRASS), paint(cyl(0.5, 1.3, 0.8, 16, x, 9.7, 1.4), GREEN));
    return merge(parts);
  },
  // a judge's card on its stick; its two faces
  paddle() { return merge([paint(cyl(0.16, 0.16, 6, 8, 0, 3, 0), WALNUT), paint(box(4.4, 3.2, 0.2, 0, 7.6, 0), WHITE)]); },
  paddleFace(back) { const g = face(4.1, 2.9, 0, 7.6, 0.12); if (back) g.rotateY(Math.PI); return g; },
  // the fishbowl of questions on its pedestal; the cards in it
  bowlStand() { return merge([paint(cyl(1.8, 2.4, 0.6, 20, 0, 0.3, 0), GOLD), paint(cyl(0.9, 1.4, 6.6, 18, 0, 3.9, 0), WHITE), paint(cyl(2.2, 1.4, 0.6, 20, 0, 7.4, 0), GOLD)]); },
  bowl() { const g = new THREE.SphereGeometry(4.6, 28, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.55); g.translate(0, 11.4, 0); return g; },
  bowlCards() {
    const parts = [], C = [WHITE, BLUSH, CREAM, PINK];
    for (let k = 0; k < 22; k++) { const a = k * 2.4, r = 0.6 + (k % 5) * 0.62; parts.push(paint(box(1.8, 0.12, 1.2, Math.cos(a) * r, 8.4 + (k % 4) * 0.3, Math.sin(a) * r).rotateY(a), C[k % 4])); }
    return merge(parts);
  },
  qcard() { return merge([paint(box(4.8, 3.2, 0.1), WHITE)]); },
  qcardFace() { return face(4.6, 3.0, 0, 0, 0.06); },
  // the courtroom's bar: a panelled wooden partition with a brass lamp (solid: a row of thin balusters
  // flickered rushing past the screen's edges)
  rail() {
    const parts = [paint(box(14, 0.6, 1.0, 0, 6.2, 0), WALNUT), paint(box(14, 0.6, 0.9, 0, 0.3, 0), WALNUT), paint(box(13.6, 5.4, 0.5, 0, 3.2, 0), WOOD)];
    for (const x of [-3.4, 3.4]) parts.push(paint(box(5.6, 3.6, 0.3, x, 3.2, 0.3), OAK), paint(box(5.6, 3.6, 0.3, x, 3.2, -0.3), OAK));
    parts.push(paint(cyl(0.2, 0.2, 5.4, 8, 6.6, 9.4, 0), BRASS), paint(cyl(0.6, 1.4, 1.0, 16, 6.6, 12.4, 0), GREEN));
    return merge(parts);
  },
  // ---- the stage ----
  // the sash across the road: a long satin band, one end high, hanging in a curve; the rap sheet on it
  sash(flip) {
    const N = 64, L = 58, W = 5.2, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = (u * 2 - 1) * L, sx = flip ? -x : x;
      const y = 12 - 0.13 * sx - 10 * (1 - (x / L) ** 2), z = Math.sin(u * Math.PI * 3) * 1.2;
      // its face to -z, toward her coming up the road: read left to right from there
      pos.push(-x, y + W / 2, z, -x, y - W / 2, z);
      uv.push(u * 4, 1, u * 4, 0);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  },
  // the gavel, pivoting at the end of its handle (+z to the head); its block
  gavel() {
    return merge([paint(cyl(0.5, 0.65, 12, 12).rotateX(Math.PI / 2).translate(0, 0, 6), WALNUT), paint(cyl(1.7, 1.7, 7.4, 22).rotateZ(Math.PI / 2).translate(0, 0, 13.2), WALNUT),
      paint(cyl(1.8, 1.8, 0.5, 22).rotateZ(Math.PI / 2).translate(-2.4, 0, 13.2), GOLD), paint(cyl(1.8, 1.8, 0.5, 22).rotateZ(Math.PI / 2).translate(2.4, 0, 13.2), GOLD),
      paint(cyl(1.85, 1.85, 0.3, 22).rotateZ(Math.PI / 2).translate(-3.75, 0, 13.2), OAK), paint(cyl(1.85, 1.85, 0.3, 22).rotateZ(Math.PI / 2).translate(3.75, 0, 13.2), OAK)]);
  },
  gavelBlock() { return merge([paint(cyl(4.6, 5.0, 2.2, 28, 0, 1.1, 13.2), WALNUT), paint(cyl(4.7, 4.7, 0.3, 28, 0, 2.3, 13.2), GOLD), paint(box(1.2, 4.2, 1.2, 0, 2.1, 0), WALNUT)]); },
  // the sign over it: GUILTY in a light box
  lightBox(w = 12, h = 3.6) { return merge([paint(box(w + 1, h + 1, 1.2, 0, 0, -0.7), BLACK), paint(box(w + 1.4, 0.4, 1.4, 0, h / 2 + 0.5, -0.6), GOLD)]); },
  // the poster on its frame, in two halves that come apart
  posterFrame() { return merge([paint(cyl(0.3, 0.3, 26, 8, -7.2, 13, -0.6), GOLD), paint(cyl(0.3, 0.3, 26, 8, 7.2, 13, -0.6), GOLD), paint(rod([-7.6, 25.6, -0.6], [7.6, 25.6, -0.6], 0.35), GOLD), paint(box(16, 0.6, 3, 0, 0.3, -0.6), BLACK)]); },
  // (each half hangs from its outer top corner, so it swings out when it goes)
  posterHalf(right) { const g = face(6.8, 21, right ? -3.4 : 3.4, -10.5, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (right ? 0.5 : 0) + 0.5 * uv.getX(i)); return g; },
  // a truss across the stage: a box girder, its lamps hanging under it
  truss() {
    const parts = [], L = 92;
    for (const [y, z] of [[0, -1], [0, 1], [2, -1], [2, 1]]) parts.push(paint(rod([-L / 2, y, z], [L / 2, y, z], 0.22, 6), SILVER));
    for (let k = 0; k <= 30; k++) { const x = -L / 2 + k * L / 30; parts.push(paint(rod([x, 0, -1], [x + L / 60, 2, 1], 0.1, 4), SILVER), paint(rod([x, 0, 1], [x + L / 60, 2, -1], 0.1, 4), SILVER)); }
    for (let k = 0; k < 10; k++) { const x = -40 + k * (80 / 9); parts.push(paint(cyl(0.8, 0.95, 1.8, 12, x, -1.3, 0), BLACK)); }
    // the cables up out of the light
    for (const x of [-30, 30]) parts.push(paint(cyl(0.06, 0.06, 40, 4, x, 21, 0), DARK));
    return merge(parts);
  },
  // a flame jet's nozzle on the stage's edge
  jet() { return merge([paint(box(2.6, 1.6, 2.6, 0, 0.8, 0), BLACK), paint(cyl(0.7, 0.9, 1.6, 12, 0, 2.4, 0), STEEL), paint(box(2.8, 0.2, 2.8, 0, 1.65, 0), YELLOW)]); },
  // ---- the lineup room ----
  // a stretch of the lineup's wall: the chart, its number over it (+z to the road)
  lineWall() { return merge([paint(box(15, 25, 0.8, 0, 12.5, -0.6), DARK)]); },
  lineFace() { const g = face(14, 23, 0, 12.5, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 14 / 18); return g; },
  slotFace() { return face(3.2, 4.0, 0, 21.2, 0.08); },
  // what each of them left: a letterman jacket, a guitar, a helmet, dead roses, a skateboard
  exes() {
    const hook = (y) => paint(tor(0.5, 0.12, 0, y, 0.6, Math.PI), STEEL);
    const jacket = merge([hook(16.2), paint(box(6.2, 8.0, 1.2, 0, 11.4, 0.9), NAVY), paint(beam([-3.4, 15.0, 0.9], [-4.6, 8.0, 0.9], 1.6, 1.1), CREAM), paint(beam([3.4, 15.0, 0.9], [4.6, 8.0, 0.9], 1.6, 1.1), CREAM),
      paint(box(1.8, 2.2, 0.2, -1.6, 12.8, 1.55), RED), paint(box(6.3, 0.6, 1.3, 0, 7.6, 0.9), CREAM), paint(beam([-3.0, 15.4, 0.9], [3.0, 15.4, 0.9], 0.3), WOOD)]);
    const guitar = merge([hook(17.4), paint(sph(2.6, 1, 1.05, 0.35, 0, 7.2, 0.9), rgb(0xc85a20)), paint(sph(2.0, 1, 1.05, 0.35, 0, 10.6, 0.9), rgb(0xc85a20)), paint(cyl(0.7, 0.7, 0.2, 16).rotateX(Math.PI / 2).translate(0, 9.0, 1.65), BLACK),
      paint(box(0.7, 6.4, 0.35, 0, 15.2, 0.9), WALNUT), paint(box(1.2, 1.8, 0.4, 0, 18.6, 0.9), BLACK)]);
    const helmet = merge([hook(15.6), paint(sph(3.0, 1, 0.95, 1, 0, 12.0, 0.9, 20, 14), BLACK), paint(box(4.6, 1.6, 0.6, 0, 11.6, 3.6), rgb(0x3a3a4a)), paint(box(6.2, 0.3, 6.2, 0, 9.3, 0.9), BLACK)]);
    const rosesP = [paint(cyl(3.0, 0.4, 7, 12, 0, 8.5, 0.9), BLUSH), hook(15.6), paint(new THREE.TorusGeometry(1.1, 0.28, 8, 24).rotateX(Math.PI / 2).translate(0, 6.4, 0.9), CHERRY)];
    for (let k = 0; k < 9; k++) { const a = k * 0.8, r = k ? 1.6 : 0; rosesP.push(paint(sph(1.0, 1, 0.85, 1, Math.cos(a) * r, 12.6 + (k % 2) * 0.7, 0.9 + Math.sin(a) * r), rgb(0xc8102a)), paint(sph(0.9, 1.6, 0.25, 0.7, Math.cos(a) * (r + 1.1), 11.6, 0.9 + Math.sin(a) * (r + 1.1)).rotateY(a), LEAF)); }
    const roses = merge(rosesP);
    const skate = merge([hook(18.0), paint(rrect(2.6, 12, 1.2, 0.5), rgb(0xff4a8a)).translate(0, 11.0, 0.9), paint(cyl(0.5, 0.5, 0.5, 12).rotateZ(Math.PI / 2).translate(-0.9, 7.0, 1.6), WHITE), paint(cyl(0.5, 0.5, 0.5, 12).rotateZ(Math.PI / 2).translate(0.9, 7.0, 1.6), WHITE), paint(cyl(0.5, 0.5, 0.5, 12).rotateZ(Math.PI / 2).translate(-0.9, 15.0, 1.6), WHITE), paint(cyl(0.5, 0.5, 0.5, 12).rotateZ(Math.PI / 2).translate(0.9, 15.0, 1.6), WHITE)]);
    return [jacket, guitar, helmet, roses, skate];
  },
  // the talent: a baton (rod and tips) over its little round stage
  batonStage() { return merge([paint(cyl(6, 6.2, 1.2, 32, 0, 0.6, 0), BLACK), paint(cyl(6.1, 6.1, 0.25, 32, 0, 1.25, 0), GOLD), paint(box(9, 2.8, 0.4, 0, 4.4, -5.2), BLACK)]); },
  baton() { return merge([paint(cyl(0.22, 0.22, 14, 10).rotateZ(Math.PI / 2), SILVER), paint(sph(1.0, 1.2, 1, 1, -7.4, 0, 0), WHITE), paint(sph(0.75, 1, 1, 1, 7.3, 0, 0), WHITE), paint(cyl(0.34, 0.34, 2.4, 10).rotateZ(Math.PI / 2), rgb(0x3a3a4a))]); },
  // the evidence table: bags, a letter in each, its tent
  evidence() {
    const parts = [paint(box(12, 0.6, 5.4, 0, 5.6, 0), STEEL)];
    for (const [x, z] of [[-5.5, -2.3], [5.5, -2.3], [-5.5, 2.3], [5.5, 2.3]]) parts.push(paint(box(0.4, 5.4, 0.4, x, 2.7, z), DARK));
    for (const x of [-3.2, 1.6]) parts.push(paint(box(3.4, 0.1, 2.6, x, 6.0, 0.2).rotateY(0.15), PAPER), paint(cyl(0.45, 0.45, 0.12, 14, x + 0.6, 6.1, 0.4), RED));
    parts.push(paint(box(2.6, 0.06, 2.0, 4.6, 6.0, -0.6).rotateY(-0.2), PAPER));
    return merge(parts);
  },
  evidenceBags() { const parts = []; for (const x of [-3.2, 1.6]) parts.push(box(3.9, 0.35, 3.1, x, 6.1, 0.2).rotateY(0.15)); return merge(parts); },
  tent() { return merge([paint(beam([-1.2, 0, 0.8], [0, 2.0, 0], 2.4, 0.08), YELLOW), paint(beam([1.2, 0, 0.8], [0, 2.0, 0], 2.4, 0.08), YELLOW)]).rotateY(Math.PI / 2); },
  tentFace() { const g = face(2.2, 1.7, 0, 1.0, 0.5); g.rotateX(-0.55); return g; },
  // ---- the trophy hall ----
  // a stand of three trophies: cups and stars, gold, on white steps
  trophies() {
    const parts = [paint(box(9, 1.6, 4.6, 0, 0.8, 0), WHITE), paint(box(6, 1.6, 4.6, 0, 2.4, -0.2), WHITE), paint(box(3, 1.6, 4.6, 0, 4.0, -0.4), WHITE)];
    const cup = (x, y, h) => { parts.push(paint(box(1.8, 1.0, 1.8, x, y + 0.5, 0), WALNUT), paint(cyl(0.35, 0.5, h, 10, x, y + 1 + h / 2, 0), GOLD), paint(cyl(1.5, 0.5, 2.2, 18, x, y + 2.1 + h, 0), GOLD), paint(tor(0.7, 0.14, x - 1.6, y + 2.3 + h, 0), GOLD), paint(tor(0.7, 0.14, x + 1.6, y + 2.3 + h, 0), GOLD)); };
    const star = (x, y, h) => { parts.push(paint(box(1.6, 1.0, 1.6, x, y + 0.5, 0), WALNUT), paint(cyl(0.3, 0.4, h, 10, x, y + 1 + h / 2, 0), GOLD)); const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.8 : 1.9; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); g.translate(x, y + 2.6 + h, -0.25); parts.push(paint(g, GOLD)); };
    cup(-3.2, 1.6, 3.6); star(0, 4.8, 4.6); cup(3.2, 1.6, 2.6);
    return merge(parts);
  },
  // ---- the open mic: the brick wall, the stool, the stand ----
  standup() { return merge([paint(box(15, 16, 0.6, 0, 8, -3.2), DARK), paint(cyl(1.4, 1.4, 0.5, 18, 3.2, 7.2, -0.6), BLACK), paint(cyl(0.18, 0.18, 7, 6, 2.2, 3.5, -1.4), STEEL), paint(cyl(0.18, 0.18, 7, 6, 4.2, 3.5, -1.4), STEEL), paint(cyl(0.18, 0.18, 7, 6, 3.2, 3.5, 0.4), STEEL), ...[0].map(() => paint(cyl(1.6, 1.8, 0.3, 20, -2.4, 0.15, 0.8), CHROME)), paint(cyl(0.14, 0.14, 9.6, 8, -2.4, 4.9, 0.8), CHROME), paint(sph(0.6, 0.8, 1.3, 0.8, -2.4, 10.1, 0.8), DARK)]); },
  brickFace() { return face(14.4, 15.4, 0, 8, -2.86); },
  // ---- the gown, sequined, on its form; the gasoline gown and its can ----
  gown() { return merge([paint(cyl(2.2, 2.6, 0.5, 20, 0, 0.25, 0), BLACK), ...gownGeo(rgb(0xe8183c), SILVER)]); },
  gasgown() { return merge([paint(cyl(2.2, 2.6, 0.5, 20, 0, 0.25, 0), BLACK), ...gownGeo(rgb(0xd8102a), BLACK), paint(box(3.4, 4.4, 1.8, 6.4, 2.2, 1.6), RED), paint(box(2.2, 0.5, 0.5, 6.4, 4.8, 1.6), RED), paint(rod([7.6, 4.2, 1.6], [8.8, 5.8, 1.6], 0.3), YELLOW), paint(box(3.5, 0.3, 1.9, 6.4, 3.0, 1.6), YELLOW)]); },
  // the gowns along the dressing room's walls: a rack of four (+z to the road)
  rack(v) {
    const C = [[rgb(0xff4a8a), rgb(0xffd76a), rgb(0x8a3aff), rgb(0x2ad8c8)], [rgb(0xff2f6d), rgb(0xf4f0ec), rgb(0xffb020), rgb(0xff7ab0)], [rgb(0x3a6aff), rgb(0xff4a8a), rgb(0xe8e8f0), rgb(0x8a0a22)]][v % 3];
    const parts = [paint(rod([-13, 20, 0], [13, 20, 0], 0.3), CHROME)];
    for (const x of [-13, 13]) parts.push(paint(cyl(0.3, 0.3, 20, 8, x, 10, 0), CHROME), paint(box(0.6, 0.5, 6, x, 0.25, 0), CHROME));
    for (let k = 0; k < 4; k++) { const x = -9.6 + k * 6.4; for (const g of gownGeo(C[k], GOLD, 1.05)) parts.push(g.translate(x, 0, 0)); parts.push(paint(tor(0.6, 0.1, x, 19.6, 0, Math.PI), STEEL)); }
    return merge(parts);
  },
  // the script on its music stand: the stand, the two open pages
  script() { return merge([paint(cyl(2.4, 2.4, 0.3, 18, 0, 0.15, 0), BLACK), paint(cyl(0.2, 0.2, 9, 8, 0, 4.6, 0), BLACK), paint(box(10, 0.6, 1.2, 0, 9.2, 0.6).rotateX(-0.5).translate(0, 4.6, 4.2), BLACK), paint(box(10.4, 7.4, 0.3, 0, 12.6, 0).rotateX(-0.45).translate(0, 5.6, 5.6), BLACK)]); },
  scriptFace() { const parts = [face(4.8, 7.0, -2.5, 12.6, 0.2), face(4.8, 7.0, 2.5, 12.6, 0.2)]; const g = merge(parts); g.rotateX(-0.45); g.translate(0, 5.6, 5.6); return g; },
  // ---- the dressing room: the matchbook, its match ----
  matchbook() {
    const parts = [paint(box(9, 1.2, 6, 0, 0.6, 0), rgb(0xff2f6d)), paint(box(9, 0.4, 1.4, 0, 1.4, 2.3), rgb(0x3a2418)), paint(box(9, 8, 0.4, 0, 5.2, -3.0).rotateX(-0.25).translate(0, 0, 0), rgb(0xff2f6d)), paint(box(7.4, 3.6, 0.1, 0, 5.4, -2.4).rotateX(-0.25), rgb(0xffd76a))];
    for (let k = 0; k < 8; k++) { const x = -3.5 + k; parts.push(paint(box(0.5, 4.6, 0.25, x, 3.4, -0.6), PAPER), paint(sph(0.4, 1, 1.2, 0.8, x, 5.9, -0.6), RED)); }
    return merge(parts);
  },
  match() { return merge([paint(box(0.7, 10, 0.7, 0, 5, 0), TAN), paint(sph(0.75, 1, 1.4, 1, 0, 10.4, 0), RED)]); },
  // ---- the witness stand, the oath ----
  stand() {
    const parts = [paint(box(11, 7.4, 8, 0, 3.7, 0), WOOD), paint(box(11.6, 0.6, 8.6, 0, 7.6, 0), WALNUT), paint(box(10.4, 5.6, 0.3, 0, 3.9, 4.1), OAK)];
    parts.push(paint(box(4.0, 10, 1.0, 0, 10.4, -3.0), LEATHER), paint(cyl(0.16, 0.16, 4.4, 8, -3.6, 10, 2.4), BRASS), paint(sph(0.6, 0.8, 1.2, 0.8, -3.6, 12.4, 2.4), DARK));
    // the book on its lectern
    parts.push(paint(box(4.2, 1.4, 0.8, 3.0, 8.4, 2.6).rotateX(-0.2), WALNUT), paint(box(3.8, 0.6, 5.0, 3.0, 9.4, 2.4).rotateX(-0.35), rgb(0x2a1008)), paint(box(3.6, 0.5, 4.8, 3.0, 9.85, 2.35).rotateX(-0.35), rgb(0xd8c8a0)));
    return merge(parts);
  },
  // a mask on a pole; the mask by itself (it turns)
  maskPole() { return merge([paint(cyl(0.22, 0.26, 10, 8, 0, 5, 0), BLACK), paint(cyl(1.4, 1.6, 0.4, 16, 0, 0.2, 0), BLACK)]); },
  mask() {
    const g = new THREE.SphereGeometry(1.8, 22, 16, 0, Math.PI, 0, Math.PI); g.rotateY(-Math.PI / 2); g.scale(1, 1.3, 0.55);
    return merge([paint(g, WHITE), paint(sph(0.42, 1.2, 0.7, 0.3, -0.62, 0.45, 0.88), BLACK), paint(sph(0.42, 1.2, 0.7, 0.3, 0.62, 0.45, 0.88), BLACK),
      paint(tor(0.7, 0.12, 0, -0.35, 0.92, Math.PI, 16).rotateZ(Math.PI).translate(0, -0.7, 0), CHERRY), paint(cyl(0.05, 0.05, 2.0, 4).rotateX(Math.PI / 2).translate(0, 0, -0.6), BLACK)]);
  },
  // ---- the street of headlines ----
  paper() { return merge([paint(box(9.2, 12.4, 0.3), PAPER)]); },
  paperFace() { return face(9.0, 12.2, 0, 0, 0.17); },
  // the tiara cage: five gilt hoops over the road, tiara points at their tops, bars along the sides
  cage() {
    const parts = [], Wd = 30, Hh = 46, Z = [-28, -14, 0, 14, 28];
    for (const z of Z) {
      const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push([Math.cos(a) * Wd, Math.sin(a) * Hh - 6, z]); }
      parts.push(paint(tube(pts, 0.55, 48), GOLD));
      for (let k = -2; k <= 2; k++) { const x = k * 6, top = Math.sqrt(Math.max(0, 1 - (x / Wd) ** 2)) * Hh - 6, h = k === 0 ? 9 : (Math.abs(k) === 1 ? 6 : 4); parts.push(paint(new THREE.ConeGeometry(1.2, h, 6).translate(x, top + h / 2, z), GOLD)); }
    }
    for (const sd of [-1, 1]) for (const y of [-4, 4, 14, 26]) { const x = sd * Math.sqrt(Math.max(0, 1 - ((y + 6) / Hh) ** 2)) * Wd; parts.push(paint(rod([x, y, -28], [x, y, 28], 0.3, 6), GOLD)); }
    return merge(parts);
  },
  // her number on its easel ("thirteen")
  // the marquee with her name: its frame, its face
  nameBoard() { return merge([paint(box(68, 11, 1.4, 0, 0, -0.9), BLACK), paint(box(69, 0.7, 1.8, 0, 5.7, -0.7), GOLD), paint(box(69, 0.7, 1.8, 0, -5.7, -0.7), GOLD), paint(box(0.7, 12, 1.8, -34.3, 0, -0.7), GOLD), paint(box(0.7, 12, 1.8, 34.3, 0, -0.7), GOLD)]); },
  nameFace() { return face(66, 9.4, 0, 0, 0.02); },
  // the bars that come down: a cell's front across the road
  bars() {
    const parts = [paint(box(66, 1.8, 1.8, 0, 32, 0), STEEL), paint(box(66, 1.0, 1.0, 0, 16, 0), STEEL), paint(box(66, 1.0, 1.0, 0, 0.5, 0), STEEL)];
    for (let k = 0; k <= 24; k++) parts.push(paint(cyl(0.38, 0.38, 32, 8, -30 + k * 2.5, 16, 0), STEEL));
    return merge(parts);
  },
  // ---- the lyric boards: a marquee board hung over the road ----
  board() { return merge([paint(rrect(28, 10.4, 1.6, 1.4), rgb(0x2a0610)).translate(0, 0, -0.9), paint(rrect(29.4, 11.8, 2.0, 1.0), GOLD).translate(0, 0, -1.5), paint(box(0.25, 40, 0.25, -11, 25, -1.4), STEEL), paint(box(0.25, 40, 0.25, 11, 25, -1.4), STEEL)]); },
  boardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(26 / 7.5, 8.6 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.02); return g; },
  // ---- the end: the stool with the sash over it, the roses on the floor ----
  stool() { return merge([paint(cyl(1.0, 1.0, 0.3, 18, 0, 3.2, 0), BLACK), paint(rod([0.7, 3.1, 0.7], [1.0, 0, 1.0], 0.1), CHROME), paint(rod([-0.7, 3.1, 0.7], [-1.0, 0, 1.0], 0.1), CHROME), paint(rod([0.7, 3.1, -0.7], [1.0, 0, -1.0], 0.1), CHROME), paint(rod([-0.7, 3.1, -0.7], [-1.0, 0, -1.0], 0.1), CHROME), paint(beam([-0.9, 3.5, 0.2], [0.7, 0.9, 1.2], 0.55, 0.06), CHERRY)]); },
  placardStand() { return merge([paint(cyl(0.08, 0.08, 4.2, 6, 0, 2.1, 0), CHROME), paint(cyl(0.6, 0.6, 0.1, 12, 0, 0.05, 0), CHROME), paint(box(2.9, 1.75, 0.08, 0, 4.4, 0.02), BLACK)]); },
  placardFace() { return face(2.8, 1.64, 0, 4.4, 0.07); },
};

// ---------- the pickup: a red rose, its stem and a leaf ----------
export function roseGeometry() {
  const parts = [];
  const add = (g, c) => parts.push(paint(g, c));
  // the bloom: petals curled round in two turns
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.06 + i * 0.022, h = 0.22 + i * 0.012;
    const p = new THREE.SphereGeometry(0.16 + i * 0.012, 10, 8, 0, Math.PI * 1.1); p.scale(1, 1.4, 0.5); p.rotateY(a); p.translate(Math.cos(a) * r, 0.18 + h * 0.4, Math.sin(a) * r);
    add(p, i < 3 ? [0.62, 0.02, 0.1] : [0.86, 0.06, 0.16]);
  }
  add(new THREE.SphereGeometry(0.12, 10, 8).translate(0, 0.08, 0), [0.25, 0.42, 0.12]);
  add(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 6).translate(0, -0.36, 0), [0.15, 0.4, 0.12]);
  const leaf = new THREE.SphereGeometry(0.12, 8, 6); leaf.scale(1.5, 0.2, 0.7); leaf.rotateZ(0.4); leaf.translate(0.13, -0.38, 0); add(leaf, [0.2, 0.5, 0.14]);
  const g = merge(parts); g.computeVertexNormals();
  return g;
}
export const pickup = {
  key: 'rose', geo: roseGeometry, color: 0xff2a4a, mat: { rough: 0.35, metal: 0.05, emissive: 0x4a0410 }, s: 1.55, lit: 1.25, face: true,
  // tossed onstage: a slow turn, the bloom nodding
  move: (e, time, i, yaw) => e.set(-0.25 + Math.sin(time * 1.4 + i) * 0.18, yaw + Math.sin(time * 1.1 + i * 1.7) * 0.7, Math.sin(time * 1.2 + i) * 0.2),
};
