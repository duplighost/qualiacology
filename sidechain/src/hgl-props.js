// Hot Girl Lobotomy: the things in the Lobotomy Bar, about four times life size so they read from the
// board. Geometry only, vertex-coloured; the lights are glows the world draws, and the pictures (the
// intake form, the treatment menu, the magazines, the phones' screens, the jar labels, the LOST
// poster, the diploma, the step-and-repeat) are canvases made here. hgl-world.js puts them in the
// place; the pickup, a pill, is at the bottom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
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
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const PINK = rgb(0xff5aa8), HOT = rgb(0xff2a8a), BLUSH = rgb(0xffbcd8), SHELL = rgb(0xfff0f5), WHITE = rgb(0xf4eef0),
  CHROME = rgb(0xd4d8e0), STEEL = rgb(0x8a909a), GOLD = rgb(0xe8b84a), BLACK = rgb(0x121016), DARK = rgb(0x2a2430),
  MINT = rgb(0x8ae0c0), LILAC = rgb(0xc8a8ff), RED = rgb(0xd82a3a), CRIMSON = rgb(0x8a1030), SKY = rgb(0x9ad8f0),
  AMETHYST = rgb(0x8a4ad8), WOOD = rgb(0x7a4a2e), MELON = rgb(0xff9a42), RIND = rgb(0xb8b070), LEAF = rgb(0x1e4a32), TRUNK = rgb(0x4a3428),
  GREEN = rgb(0x5ac860), TEAL = rgb(0x2ab0a8), BROWN = rgb(0x6a4a30), GREY = rgb(0xb8b4bc), BRASS_DARK = rgb(0xa07a2a);

const FONT = (w, s) => `${w} ${s}px "Arial Black", Impact, sans-serif`;
const SANS = (w, s) => `${w} ${s}px "Segoe UI", Arial, sans-serif`;
function centre(g, txt, x, y, font, col, maxW) { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y, maxW); }

// ---------- the pictures ----------
// the intake form on its clipboard: the reason for the visit, ticked
export function formTexture() {
  return canvasTex(512, 704, (g, W, H) => {
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff4aa0'; g.fillRect(0, 0, W, 92);
    centre(g, 'PATIENT INTAKE', W / 2, 48, FONT(900, 46), '#ffffff', W - 40);
    g.fillStyle = '#2a2430'; g.font = SANS(700, 30); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('NAME', 34, 140); g.fillRect(130, 152, 340, 3);
    g.fillText('REASON FOR VISIT:', 34, 220);
    const rows = [['BOTOX', 0], ['FILLERS', 0], ['EXISTENTIAL DREAD', 1], ['LIPS', 0]];
    rows.forEach(([t, on], i) => {
      const y = 290 + i * 78;
      g.strokeStyle = '#2a2430'; g.lineWidth = 5; g.strokeRect(40, y - 24, 48, 48);
      g.fillStyle = '#2a2430'; g.font = SANS(on ? 900 : 600, on ? 34 : 30); g.fillText(t, 112, y);
      if (on) { g.strokeStyle = '#ff2a7a'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, y - 2); g.lineTo(62, y + 22); g.lineTo(100, y - 36); g.stroke(); }
    });
    g.fillStyle = '#2a2430'; g.font = SANS(700, 26); g.fillText('SIGN HERE', 34, 640); g.fillRect(180, 652, 290, 3);
    g.strokeStyle = '#ff2a7a'; g.lineWidth = 5; g.beginPath(); g.moveTo(196, 640); g.bezierCurveTo(230, 600, 250, 670, 280, 630); g.bezierCurveTo(300, 610, 320, 660, 360, 632); g.stroke();
  });
}
// the treatment menu over the desk
export function menuTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#16101a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8b84a'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    centre(g, 'TREATMENTS', W / 2, 74, FONT(900, 50), '#e8b84a', W - 60);
    const rows = [['LIPS', '$350'], ['LASHES', '$200'], ['BROWS', '$90'], ['FILLERS', '$600'], ['LOBOTOMY', '$499']];
    rows.forEach(([a, b], i) => {
      const y = 170 + i * 92, last = i === rows.length - 1;
      g.font = SANS(last ? 900 : 700, last ? 44 : 38); g.textBaseline = 'middle'; g.fillStyle = last ? '#ff6ab8' : '#f4eef0';
      g.textAlign = 'left'; g.fillText(a, 44, y); g.textAlign = 'right'; g.fillText(b, W - 44, y);
      g.fillStyle = 'rgba(244,238,240,0.25)'; for (let x = 44 + g.measureText(a).width; x < W - 150; x += 14) g.fillRect(x + 20, y + 12, 5, 5);
    });
  });
}
// the magazines in the rack: four covers, mastheads and lines and colour, no faces
export function magTexture() {
  return canvasTex(1024, 1280, (g, W, H) => {
    const covers = [
      ['HOT GIRL', '#ff3a8a', '#ffe0ee', ['NO MORE', 'THINKING', '10 WAYS']],
      ['PRETTY', '#1a1a1a', '#ffd84a', ['JUST BE', 'PRETTY', 'THE EMPTY ISSUE']],
      ['VACANT', '#7a4aff', '#e8fff4', ['TOO CUTE', 'TO CRY', 'SPRING LOOKS']],
      ['STUNNING', '#ff7a2a', '#ffffff', ['LOOK AT ME', 'A WINNER', 'FIVE STARS']],
    ];
    covers.forEach(([title, bg, fg, lines], k) => {
      const x0 = (k % 2) * 512, y0 = Math.floor(k / 2) * 640;
      g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, 512, 640); g.clip();
      g.fillStyle = bg; g.fillRect(0, 0, 512, 640);
      // a soft shape where a face would be on a real one: a gloss of colour
      const gr = g.createRadialGradient(256, 380, 20, 256, 380, 260); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
      centre(g, title, 256, 86, FONT(900, 96), fg, 480);
      g.textAlign = 'left'; g.fillStyle = fg;
      g.font = FONT(900, 52); g.fillText(lines[0], 30, 420, 450); g.fillText(lines[1], 30, 480, 450);
      g.font = SANS(700, 30); g.fillText(lines[2], 30, 580, 450);
      g.restore();
    });
  });
}
// the phones' screens: 0 the trend, 1 the hearts, 2 five stars, 3 live (2 x 2, each cell 512 x 1024)
export function phoneTexture() {
  return canvasTex(1024, 2048, (g, W, H) => {
    const cell = (k, draw) => { const x0 = (k % 2) * 512, y0 = Math.floor(k / 2) * 1024; g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, 512, 1024); g.clip(); draw(); g.restore(); };
    const bgGrad = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 512, 1024); };
    const heart = (x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35); g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x - s * 0.1, y + s * 0.8, x, y + s); g.bezierCurveTo(x + s * 0.1, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.35); g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35); g.fill(); };
    const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    cell(0, () => {
      bgGrad('#ff3a8a', '#7a1aff');
      centre(g, 'TRENDING', 256, 210, FONT(900, 80), '#ffffff', 470);
      centre(g, 'NOW', 256, 300, FONT(900, 80), '#ffffff', 470);
      centre(g, '#HOTGIRL', 256, 520, FONT(900, 70), '#ffe0f0', 480);
      centre(g, 'LOBOTOMY', 256, 600, FONT(900, 70), '#ffe0f0', 480);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(56, 720, 400, 14); g.fillRect(56, 760, 300, 14); g.fillRect(56, 800, 350, 14);
      heart(256, 860, 110, '#ffffff');
    });
    cell(1, () => {
      bgGrad('#14081e', '#3a0a3a');
      heart(256, 260, 300, '#ff2a6a');
      centre(g, '2.4M', 256, 700, FONT(900, 120), '#ffffff', 470);
      for (let k = 0; k < 9; k++) heart(70 + (k * 53) % 380, 820 + (k % 3) * 50, 40, ['#ff5aa8', '#ff2a6a', '#ffb0d0'][k % 3]);
    });
    cell(2, () => {
      bgGrad('#3a1030', '#140818');
      for (let k = 0; k < 5; k++) star(66 + k * 95, 330, 44, '#ffc030');
      centre(g, '5.0', 256, 540, FONT(900, 160), '#ffffff', 470);
      g.fillStyle = 'rgba(255,220,240,0.45)'; for (let k = 0; k < 4; k++) g.fillRect(70, 700 + k * 52, 372 - k * 40, 18);
    });
    cell(3, () => {
      bgGrad('#2a0a1a', '#120814');
      g.fillStyle = '#ff2a3a'; g.beginPath(); g.roundRect(60, 70, 150, 70, 14); g.fill();
      centre(g, 'LIVE', 135, 106, FONT(900, 48), '#ffffff', 140);
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.roundRect(60, 200, 392, 520, 30); g.fill();
      for (let k = 0; k < 6; k++) heart(380 + (k % 2) * 40, 860 - k * 110, 50 + k * 8, ['#ff5aa8', '#ff2a6a', '#ffb0d0'][k % 3]);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(60, 790, 240, 16); g.fillRect(60, 830, 180, 16); g.fillRect(60, 870, 210, 16);
    });
  });
}
// the specimen jars' labels: one feeling a jar (4 x 4 cells of 256 x 128)
export const FEELINGS = ['SADNESS', 'DREAD', 'DOUBT', 'GUILT', 'RAGE', 'SHAME', 'GRIEF', 'LONGING', 'HURT', 'WORK', 'CARE', 'OPINIONS', 'AMBITION', 'FEAR', 'ENVY', 'HOPE'];
export function labelTexture() {
  return canvasTex(1024, 512, (g) => {
    FEELINGS.forEach((t, k) => {
      const x0 = (k % 4) * 256, y0 = Math.floor(k / 4) * 128;
      g.fillStyle = '#efe6cf'; g.fillRect(x0 + 4, y0 + 4, 248, 120);
      g.strokeStyle = '#2a2018'; g.lineWidth = 4; g.strokeRect(x0 + 12, y0 + 12, 232, 104);
      g.fillStyle = '#2a2018'; g.font = SANS(600, 18); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('NO. ' + String(k + 3).padStart(3, '0'), x0 + 22, y0 + 30);
      centre(g, t, x0 + 128, y0 + 74, '700 44px Georgia, "Times New Roman", serif', '#2a2018', 216);
    });
  });
}
// a LOST poster for her introspection, the tabs along the bottom
export function lostTexture() {
  return canvasTex(512, 704, (g, W, H) => {
    g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, W, H);
    centre(g, 'LOST', W / 2, 110, FONT(900, 150), '#1a1416', W - 40);
    g.fillStyle = '#d8d2c4'; g.fillRect(96, 200, 320, 230);
    centre(g, '?', W / 2, 318, FONT(900, 200), '#8a8478', 300);
    centre(g, 'MY', W / 2, 482, FONT(900, 48), '#1a1416', W - 60);
    centre(g, 'INTROSPECTION', W / 2, 540, FONT(900, 50), '#1a1416', W - 50);
    g.strokeStyle = '#1a1416'; g.lineWidth = 2; g.setLineDash([8, 6]);
    for (let k = 0; k <= 8; k++) { const x = 16 + k * 60; g.beginPath(); g.moveTo(x, 600); g.lineTo(x, H - 6); g.stroke(); }
    g.setLineDash([]); g.beginPath(); g.moveTo(16, 600); g.lineTo(W - 16, 600); g.stroke();
    g.fillStyle = '#1a1416'; g.font = SANS(700, 16);
    for (let k = 0; k < 8; k++) { g.save(); g.translate(46 + k * 60, 650); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('555-0100', 0, 0); g.restore(); }
  });
}
// her degree, framed, on its way across the counter
export function diplomaTexture() {
  return canvasTex(640, 480, (g, W, H) => {
    g.fillStyle = '#f8f0dc'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b08a3a'; g.lineWidth = 10; g.strokeRect(22, 22, W - 44, H - 44); g.lineWidth = 3; g.strokeRect(38, 38, W - 76, H - 76);
    centre(g, 'BACHELOR OF ARTS', W / 2, 120, '700 40px Georgia, "Times New Roman", serif', '#2a2018', W - 100);
    centre(g, 'PHILOSOPHY', W / 2, 210, 'italic 700 64px Georgia, "Times New Roman", serif', '#2a2018', W - 100);
    centre(g, 'SUMMA CUM LAUDE', W / 2, 290, '600 28px Georgia, "Times New Roman", serif', '#5a4a30', W - 100);
    g.fillStyle = '#c8202a'; g.beginPath(); g.arc(W - 130, H - 120, 48, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(W - 130, H - 120, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2018'; g.fillRect(90, H - 110, 200, 3);
  });
}
// the scale's readout counting down: 1200, 800, 400, 0 (4 cells, 512 x 192 each, stacked)
export function kcalTexture() {
  return canvasTex(512, 768, (g, W) => {
    ['1200', '800', '400', '0'].forEach((t, k) => {
      const y0 = k * 192;
      g.fillStyle = '#081008'; g.fillRect(0, y0, W, 192);
      g.font = FONT(900, 120); g.textAlign = 'right'; g.textBaseline = 'middle'; g.shadowColor = '#5aff9a'; g.shadowBlur = 24; g.fillStyle = '#7affaa';
      g.fillText(t, W - 150, y0 + 100); g.shadowBlur = 0;
      g.font = FONT(900, 40); g.fillText('KCAL', W - 24, y0 + 120);
      g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 0; x < W; x += 6) g.fillRect(x, y0, 2, 192);
    });
  });
}
// the no-thinking signs: a thought bubble struck through, the words under it
export function noThinkTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W / 2, H / 2, 250, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2430';
    const blob = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    blob(200, 210, 62); blob(270, 190, 72); blob(330, 220, 56); blob(250, 250, 64); blob(310, 260, 50); blob(180, 255, 44);
    blob(178, 330, 20); blob(150, 362, 12);
    centre(g, 'NO THINKING', W / 2, 410, FONT(900, 46), '#2a2430', 360);
    g.strokeStyle = '#e8203a'; g.lineWidth = 44; g.beginPath(); g.arc(W / 2, H / 2, 222, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(W / 2 - 157, H / 2 - 157); g.lineTo(W / 2 + 157, H / 2 + 157); g.stroke();
  });
}
// the step-and-repeat on the carpet's walls: the clinic's name and its little pick, over and over
export function logoTexture() {
  const t = canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#f8f2f6'; g.fillRect(0, 0, W, H);
    const mark = (x, y) => {
      centre(g, 'LOBOTOMY', x, y - 14, FONT(900, 46), '#ff2a8a', 240);
      centre(g, 'BAR', x, y + 30, FONT(900, 34), '#2a2430', 200);
      g.strokeStyle = '#2a2430'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 104, y - 30); g.lineTo(x + 124, y + 38); g.stroke();
      g.fillStyle = '#ff2a8a'; g.fillRect(x + 96, y - 44, 16, 16);
    };
    mark(128, 64); mark(384, 192); mark(384, -64); mark(128, 320);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// the books going into the shredder: their spines (6 cells across)
export function spineTexture() {
  return canvasTex(768, 256, (g) => {
    const books = [['PLATO', '#8a1a2a'], ['KANT', '#1a3a6a'], ['SARTRE', '#2a5a3a'], ['DE BEAUVOIR', '#6a2a6a'], ['NIETZSCHE', '#1a1a1a'], ['ARENDT', '#8a6a1a']];
    books.forEach(([t, c], k) => {
      const x0 = k * 128;
      g.fillStyle = c; g.fillRect(x0, 0, 128, 256);
      g.fillStyle = '#e8c870'; g.fillRect(x0, 20, 128, 6); g.fillRect(x0, 230, 128, 6);
      g.save(); g.translate(x0 + 64, 128); g.rotate(-Math.PI / 2); centre(g, t, 0, 0, '700 34px Georgia, serif', '#f0e0b0', 190); g.restore();
    });
  });
}

// ---------- materials the things need beyond the shared ones ----------
// pictures from a sheet of cells, which cell (and how lit) per instance: aCell, aK
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
// vertex-coloured things lit by their own aK (stars, the jars' fluid, the bubbles, the flashes)
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
// the EEG monitors' screens: three traces across a grid until "brain-dead", then flat lines
export function eegMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlat: { value: 0 } },
    vertexShader: /* glsl */`attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0))); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlat; varying vec2 vUv; varying float vK;
      float tr(float x, float y0, float a, float f, float ph){ float w = sin(x * f + ph) * 0.6 + sin(x * f * 2.7 + ph * 1.7) * 0.3 + sin(x * f * 6.1 - ph) * 0.15; return y0 + a * w * (1.0 - uFlat); }
      void main(){
        vec2 p = vUv; vec3 col = vec3(0.01, 0.03, 0.02);
        vec2 gq = abs(fract(p * vec2(10.0, 6.0)) - 0.5); float grid = 1.0 - smoothstep(0.0, fwidth(p.x * 10.0) * 1.5, min(gq.x, gq.y) - 0.0);
        col += vec3(0.0, 0.12, 0.06) * grid * 0.5;
        float sweep = fract(uTime * 0.25 + vK * 7.0);
        for (int k = 0; k < 3; k++) {
          float y0 = 0.25 + float(k) * 0.25, ph = uTime * (1.2 + 0.4 * float(k)) + vK * 13.0 + float(k) * 2.0;
          float y = tr(p.x * 6.28, y0, 0.08, 3.0 + float(k) * 1.3, ph);
          float px = fwidth(p.y), small = smoothstep(0.006, 0.02, max(px, fwidth(p.x)));
          float d = abs(p.y - y) / max(px * 2.0, 0.006);
          float lit = mix(smoothstep(0.0, 0.25, mod(p.x - sweep, 1.0)) * 0.7 + 0.3, 0.65, small);
          float tr0 = mix(exp(-d * d * 0.5), exp(-pow((p.y - y0) / 0.1, 2.0)) * 0.35, small);
          col += vec3(0.35, 1.0, 0.55) * tr0 * lit * (1.0 + uFlat);
        }
        gl_FragColor = vec4(col * (0.4 + 1.2 * vK), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
export function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, emissive: 0x1a2028 });
}

// ---------- the things ----------
// heart outline, centred, about w across
function heartShape(w) {
  const s = new THREE.Shape(), k = w / 2;
  s.moveTo(0, -0.9 * k); s.bezierCurveTo(-0.15 * k, -0.6 * k, -1.0 * k, -0.2 * k, -1.0 * k, 0.35 * k);
  s.bezierCurveTo(-1.0 * k, 0.85 * k, -0.35 * k, 1.05 * k, 0, 0.6 * k);
  s.bezierCurveTo(0.35 * k, 1.05 * k, 1.0 * k, 0.85 * k, 1.0 * k, 0.35 * k);
  s.bezierCurveTo(1.0 * k, -0.2 * k, 0.15 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}
function starShape(r) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; }
const extrude = (shape, depth) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2); return g; };

export const HG = {
  // ---- the street ----
  // a palm: the trunk leaning a little, nine fronds hanging off the top
  palm() {
    const parts = [], lean = (y) => 0.01 * y * y;
    for (let k = 0; k < 8; k++) { const y = k * 2.3, r = 0.58 - k * 0.032; parts.push(paint(cyl(r * 0.92, r, 2.4, 8, lean(y + 1.15), y + 1.15, 0), k % 2 ? TRUNK : rgb(0x5a4030))); }
    const top = [lean(18.4), 18.4, 0];
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + (k % 2) * 0.26, L = 7 + (k % 3) * 0.9, fr = [];
      let px = 0, py = 0;
      for (let j = 0; j < 5; j++) {
        const nx = (j + 1) * L / 5, ny = 0.56 * nx - 0.11 * nx * nx * (7 / L);
        const len = Math.hypot(nx - px, ny - py), ang = Math.atan2(ny - py, nx - px), w = 1.9 * Math.sin(Math.PI * (j + 0.6) / 5.4) + 0.2;
        const g = new THREE.BoxGeometry(len + 0.05, 0.08, w); g.rotateZ(ang); g.translate((px + nx) / 2, (py + ny) / 2, 0); fr.push(paint(g, k % 4 === 3 ? rgb(0x2a5a3a) : LEAF));
        px = nx; py = ny;
      }
      const f = merge(fr); f.rotateZ(-0.12 * (k % 3)); f.rotateY(a); f.translate(top[0], top[1], top[2]); parts.push(f);
    }
    parts.push(paint(sph(0.9, 1, 1.1, 1, top[0], top[1] - 0.2, top[2], 8, 6), TRUNK));
    for (let k = 0; k < 3; k++) { const a = k * 2.1; parts.push(paint(sph(0.42, 1, 1, 1, top[0] + Math.cos(a) * 0.7, top[1] - 0.9, top[2] + Math.sin(a) * 0.7, 8, 6), rgb(0x3a2a1a))); }
    return merge(parts);
  },
  // the drill on the clinic's roof, nose down into it: the body, the grip, the battery, the chuck
  drill() {
    const parts = [];
    // the body standing up, the chuck at the bottom
    parts.push(paint(cyl(3.4, 3.8, 15, 20, 0, 16, 0), HOT), paint(sph(3.4, 1, 0.6, 1, 0, 23.5, 0, 20, 10), HOT));
    parts.push(paint(cyl(3.85, 3.85, 1.2, 20, 0, 12, 0), BLACK), paint(cyl(3.9, 3.9, 0.6, 20, 0, 20.5, 0), GOLD));
    parts.push(paint(cyl(2.4, 3.6, 3, 20, 0, 7, 0), HOT), paint(cyl(1.9, 2.3, 4, 16, 0, 3.8, 0), BLACK));
    // the grip out to the side, the trigger, the battery at its end
    parts.push(paint(box(11, 4.6, 4.2, 7.5, 17, 0), BLACK), paint(box(1.6, 2.4, 1.6, 4.2, 13.8, 0), HOT));
    parts.push(paint(box(4.2, 9, 7.4, 14.5, 17, 0), DARK), paint(box(4.3, 1.2, 7.5, 14.5, 19.6, 0), HOT), paint(box(4.3, 0.5, 7.5, 14.5, 15.4, 0), GOLD));
    // vents
    for (let k = 0; k < 4; k++) parts.push(paint(box(0.4, 4, 0.5, 0, 21 - k * 0.1, 3.5 - k * 0.0), BLACK).rotateY(k * Math.PI / 2));
    return merge(parts);
  },
  // the drill's bit (turned by the world): a spiral down to a point
  bit() {
    const parts = [paint(cyl(0.9, 0.9, 6, 12, 0, -3, 0), CHROME), paint(cyl(0.9, 0.05, 2.4, 12, 0, -7.2, 0), CHROME)];
    for (let k = 0; k < 10; k++) { const g = box(2.3, 0.35, 0.5, 0, -0.6 - k * 0.6, 0); g.rotateY(k * 0.9); parts.push(paint(g, STEEL)); }
    return merge(parts);
  },
  // ---- the lobby ----
  // a column, the kind every spa has: base, shaft, capital
  column() {
    const parts = [paint(box(5, 1.2, 5, 0, 0.6, 0), WHITE), paint(cyl(2.2, 2.4, 1, 24, 0, 1.7, 0), WHITE)];
    parts.push(paint(cyl(1.7, 1.85, 22, 24, 0, 13.2, 0), SHELL));
    parts.push(paint(cyl(2.3, 1.8, 1.2, 24, 0, 24.6, 0), WHITE), paint(box(5.4, 1.1, 5.4, 0, 25.7, 0), WHITE));
    for (const z of [-2.3, 2.3]) { const g = cyl(0.8, 0.8, 5.6, 12, 0, 0, 0); g.rotateZ(Math.PI / 2); g.translate(0, 24.9, z); parts.push(paint(g, WHITE)); }
    parts.push(paint(box(5.6, 0.3, 5.6, 0, 26.4, 0), GOLD));
    return merge(parts);
  },
  // a waiting-room chair: a round velvet seat, its back, gold legs
  chair() {
    const parts = [paint(cyl(2.1, 2.0, 1.5, 18, 0, 2.6, 0), PINK)];
    const back = new THREE.CylinderGeometry(2.2, 2.2, 3.4, 18, 1, true, Math.PI * 0.5, Math.PI); back.translate(0, 4.6, 0); parts.push(paint(back, PINK));
    const backIn = new THREE.CylinderGeometry(2.0, 2.0, 3.4, 18, 1, true, Math.PI * 0.5, Math.PI); backIn.translate(0, 4.6, 0); backIn.scale(1, 1, 1); parts.push(paint(backIn, BLUSH));
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.78; parts.push(paint(cyl(0.18, 0.12, 1.9, 6, Math.cos(a) * 1.5, 0.95, Math.sin(a) * 1.5), GOLD)); }
    return merge(parts);
  },
  // the reception desk: a curved white front with a pink band, the back wall with the clinic's mark
  desk() {
    const parts = [];
    const front = new THREE.CylinderGeometry(9, 9, 4.4, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84); front.translate(0, 2.2, -4); parts.push(paint(front, WHITE));
    const band = new THREE.CylinderGeometry(9.05, 9.05, 1.0, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84); band.translate(0, 2.8, -4); parts.push(paint(band, HOT));
    const top = new THREE.CylinderGeometry(9.4, 9.4, 0.4, 32, 1, false, -Math.PI * 0.42, Math.PI * 0.84); top.translate(0, 4.6, -4); parts.push(paint(top, SHELL));
    parts.push(paint(box(22, 16, 1, 0, 8, -9), BLUSH), paint(box(22.4, 0.5, 1.3, 0, 16.2, -9), GOLD));
    const ring = new THREE.TorusGeometry(3.4, 0.35, 8, 32); ring.translate(0, 10.4, -8.4); parts.push(paint(ring, GOLD));
    return merge(parts);
  },
  // the intake form on a clipboard, on an easel
  easel() {
    const parts = [paint(beam([-3.4, 0, 1.2], [-1.6, 15, 0], 0.45), WOOD), paint(beam([3.4, 0, 1.2], [1.6, 15, 0], 0.45), WOOD), paint(beam([0, 0, -4], [0, 14, -0.3], 0.45), WOOD)];
    parts.push(paint(box(9.6, 0.5, 1.6, 0, 3.6, 0.9), WOOD));
    parts.push(paint(box(9.2, 12.6, 0.5, 0, 9.8, 0.4), BROWN), paint(box(3.6, 1.2, 0.8, 0, 16.0, 0.7), CHROME));
    return merge(parts);
  },
  formFace() { const g = face(8.2, 11.3, 0, 9.6, 0.78); return g; },
  // the treatment menu: a standing light box
  menuBox() { return merge([paint(box(10.4, 13.4, 1.2, 0, 11.2, 0), DARK), paint(box(10.8, 0.6, 1.4, 0, 18.1, 0), GOLD), paint(box(0.5, 4.6, 0.5, -3.6, 2.3, 0), GOLD), paint(box(0.5, 4.6, 0.5, 3.6, 2.3, 0), GOLD)]); },
  menuFace() { return face(9.4, 12.2, 0, 11.2, 0.74); },
  // the bin the bad parts go in: its body, the pedal (the lid is its own)
  bin() { return merge([paint(cyl(2.8, 2.5, 6.4, 24, 0, 3.2, 0), RED), paint(cyl(2.85, 2.85, 0.4, 24, 0, 6.2, 0), rgb(0xa01828)), paint(box(1.6, 0.3, 1.2, 0, 0.3, 2.8), CHROME)]); },
  binLid() { const g = merge([paint(cyl(2.95, 2.95, 0.5, 24, 0, 0.25, 2.9), RED), paint(box(1.2, 0.5, 0.6, 0, 0.6, 5.2), CHROME)]); return g; },
  binFace() { return face(3.6, 1.4, 0, 3.8, 2.95); },
  // the laughing gas: three tall tanks on a cart, their valves
  gas() {
    const parts = [paint(box(11, 1.0, 5, 0, 1.4, 0), CHROME)];
    for (const x of [-4.4, 4.4]) for (const z of [-2, 2]) parts.push(paint(cyl(0.7, 0.7, 0.6, 12, x, 0.5, z).rotateX(Math.PI / 2), BLACK));
    [[-3.3, SKY], [0, PINK], [3.3, LILAC]].forEach(([x, c]) => {
      parts.push(paint(cyl(1.5, 1.5, 11, 18, x, 7.4, 0), c), paint(sph(1.5, 1, 0.8, 1, x, 12.9, 0, 18, 8), c));
      parts.push(paint(cyl(0.45, 0.45, 1.4, 10, x, 14.4, 0), CHROME), paint(cyl(0.9, 0.9, 0.3, 10, x, 15.2, 0), CHROME), paint(cyl(1.52, 1.52, 1.8, 18, x, 9.5, 0), WHITE));
    });
    return merge(parts);
  },
  // the magazine rack: a chrome frame, four pockets
  rack() {
    const parts = [paint(box(0.4, 16, 0.4, -5.4, 8, 0), CHROME), paint(box(0.4, 16, 0.4, 5.4, 8, 0), CHROME), paint(box(11.2, 0.4, 3, 0, 0.4, 0), CHROME)];
    for (const y of [3.6, 10.6]) parts.push(paint(box(11.2, 0.3, 1.6, 0, y, 0.6), CHROME), paint(box(11.2, 1.6, 0.2, 0, y + 0.8, 1.4), CHROME));
    return merge(parts);
  },
  // one magazine in its pocket (the world picks its cover)
  mag() { const g = face(4.8, 6.2, 0, 3.1, 0); g.rotateX(-0.12); return g; },
  // ---- the procedure room ----
  // the surgical lamp's head and its arm up to the ceiling (the world hangs one at each fixture)
  lampHead() {
    const parts = [paint(cyl(4.2, 4.6, 1.2, 28, 0, 0, 0), CHROME), paint(cyl(3.6, 3.6, 0.2, 28, 0, -0.65, 0), rgb(0xfff8f0))];
    parts.push(paint(cyl(0.35, 0.35, 8, 8, 0, 4.4, 0), CHROME), paint(sph(0.9, 1, 1, 1, 0, 0.9, 0, 10, 8), CHROME));
    return merge(parts);
  },
  // the treatment chair: base, column, the seat, the back laid back, the headrest, arms, footrest
  tchair() {
    const parts = [paint(cyl(3.4, 3.6, 0.7, 24, 0, 0.35, 0), CHROME), paint(cyl(0.9, 1.1, 4, 14, 0, 2.6, 0), CHROME)];
    parts.push(paint(rrect(5.6, 6.4, 1.2, 1.4), PINK).rotateX(-Math.PI / 2).translate(0, 5.1, 0.2));
    const back = paint(rrect(5.6, 8.4, 1.4, 1.4), PINK); back.translate(0, 4.2, 0); back.rotateX(-1.05); back.translate(0, 5.4, -2.9); parts.push(back);
    const head = paint(rrect(3.4, 2.4, 1.0, 1.6), BLUSH); head.rotateX(-1.05); head.translate(0, 10.1, -10.7); parts.push(head);
    const foot = paint(rrect(5.2, 6.2, 1.2, 1.2), PINK); foot.translate(0, -3.1, 0); foot.rotateX(-0.42); foot.translate(0, 5.0, 3.3); parts.push(foot);
    for (const x of [-3.4, 3.4]) parts.push(paint(box(1.1, 0.8, 5.2, x, 6.9, -0.6), BLUSH), paint(box(0.4, 1.6, 0.4, x, 6.0, 1.2), CHROME));
    return merge(parts);
  },
  // the crystal on its plinth, the label under it
  plinth() { return merge([paint(box(7, 4, 7, 0, 2, 0), WHITE), paint(box(7.4, 0.5, 7.4, 0, 4.1, 0), GOLD), paint(box(7.4, 0.5, 7.4, 0, 0.25, 0), GOLD)]); },
  crystal() {
    const parts = [], R = seeded(41);
    for (let k = 0; k < 9; k++) {
      const h = 2.6 + R() * 3.6, r = 0.75 + R() * 0.6;
      const g = merge([cyl(r, r, h, 6, 0, h / 2, 0), cyl(0.01, r, r * 1.6, 6, 0, h + r * 0.8, 0)]);
      g.rotateZ((R() - 0.5) * 1.0); g.rotateY(R() * 6.28); g.translate((R() - 0.5) * 3, 4.3, (R() - 0.5) * 3);
      parts.push(paint(g, k % 3 ? AMETHYST : rgb(0xc89aff)));
    }
    return merge(parts);
  },
  // a shard of it (the world throws them when it goes)
  shard() { const g = new THREE.OctahedronGeometry(0.7, 0); g.scale(0.6, 1.4, 0.6); return paint(g, rgb(0xb07aff)); },
  // the ice pick, point down: the steel and the pink handle
  // (its point at the origin, the handle's end 15.5 up)
  pick() { return merge([paint(cyl(0.45, 0.06, 10, 12, 0, 5, 0), CHROME), paint(cyl(0.95, 0.95, 0.7, 14, 0, 10.3, 0), GOLD), paint(cyl(1.25, 1.05, 5, 14, 0, 13.1, 0), HOT), paint(sph(1.25, 1, 0.45, 1, 0, 15.6, 0, 14, 8), HOT)]); },
  // the mallet, head sideways
  // (its end at the origin, its head 9 up: the world swings it from there)
  mallet() { return merge([paint(cyl(0.4, 0.4, 9, 8, 0, 4.5, 0), WHITE), paint(cyl(1.6, 1.6, 4, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 9, 0), HOT), paint(cyl(1.7, 1.7, 0.4, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(1.5, 9, 0), GOLD), paint(cyl(1.7, 1.7, 0.4, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(-1.5, 9, 0), GOLD)]); },
  // ---- the feed ----
  // a phone the size of a tower: its body (the screen is its own face)
  phone() { const g = paint(rrect(9, 19, 1.5, 0.9, 8), BLACK); g.translate(0, 9.5, 0); return merge([g, paint(box(0.3, 2.2, 0.5, 4.6, 14, 0), DARK), paint(rrect(2.4, 0.5, 0.25, 0.2), DARK).translate(0, 18.3, 0.5)]); },
  phoneFace() { return face(8.2, 17.4, 0, 9.5, 0.56); },
  heart() { const g = extrude(heartShape(2.2), 0.5); return paint(g, HOT); },
  // half a cantaloupe on its plinth, cut side up, scooped
  melon() {
    const parts = [paint(cyl(3.4, 3.8, 3, 24, 0, 1.5, 0), WHITE), paint(cyl(4.2, 4.2, 0.5, 24, 0, 3.2, 0), GOLD)];
    const top = [];
    const rind = new THREE.SphereGeometry(6, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); rind.translate(0, 14.4, 0); top.push(paint(rind, RIND));
    const flesh = cyl(5.75, 5.75, 0.3, 28, 0, 14.4, 0); top.push(paint(flesh, MELON));
    top.push(paint(cyl(2.3, 2.3, 0.34, 20, 0, 14.42, 0), rgb(0xe8823a)));
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.4; top.push(paint(cyl(0.95, 0.95, 0.36, 14, Math.cos(a) * 4.0, 14.44, Math.sin(a) * 4.0), rgb(0xc8641e))); }
    const m = merge(top); m.translate(0, -14.4, 0); m.rotateX(0.42); m.translate(0, 9.6, 0.6); parts.push(m);
    return merge(parts);
  },
  baller() { return merge([paint(cyl(0.38, 0.38, 9, 10, 0, 5.4, 0), PINK), paint(cyl(0.6, 0.6, 1.2, 10, 0, 10.2, 0), GOLD), paint(new THREE.SphereGeometry(1.15, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CHROME)]); },
  ball() { return paint(sph(0.95, 1, 1, 1, 0, 0, 0, 14, 10), MELON); },
  // the pool, drained: its white coping, the pale blue shell, the ladder, the float flat on the bottom
  pool() {
    const parts = [], W = 30, D = 18, H = 3.2, t = 1.4;
    parts.push(paint(box(W, H, t, 0, H / 2, D / 2 - t / 2), WHITE), paint(box(W, H, t, 0, H / 2, -D / 2 + t / 2), WHITE));
    parts.push(paint(box(t, H, D, W / 2 - t / 2, H / 2, 0), WHITE), paint(box(t, H, D, -W / 2 + t / 2, H / 2, 0), WHITE));
    parts.push(paint(box(W - 2 * t, 0.4, D - 2 * t, 0, 0.3, 0), SKY), paint(box(W - 2 * t, 0.1, 0.5, 0, 0.55, 0), rgb(0x2a6ab0)));
    parts.push(paint(box(0.12, H - 0.2, D - 2 * t - 0.1, W / 2 - t - 0.06, H / 2, 0), rgb(0x8ac8e8)), paint(box(0.12, H - 0.2, D - 2 * t - 0.1, -W / 2 + t + 0.06, H / 2, 0), rgb(0x8ac8e8)));
    parts.push(paint(box(W - 2 * t - 0.1, H - 0.2, 0.12, 0, H / 2, D / 2 - t - 0.06), rgb(0x8ac8e8)), paint(box(W - 2 * t - 0.1, H - 0.2, 0.12, 0, H / 2, -D / 2 + t + 0.06), rgb(0x8ac8e8)));
    for (const x of [-11, -9.4]) { parts.push(paint(beam([x, 0.5, D / 2 - t - 0.6], [x, H + 1.4, D / 2 - t - 0.6], 0.22), CHROME), paint(beam([x, H + 1.4, D / 2 - t - 0.6], [x, H + 1.4, D / 2 + 0.2], 0.22), CHROME)); }
    for (let k = 0; k < 3; k++) parts.push(paint(box(1.6, 0.15, 0.5, -10.2, 0.9 + k * 0.8, D / 2 - t - 0.6), CHROME));
    const fl = new THREE.TorusGeometry(2.4, 0.8, 8, 18); fl.rotateX(Math.PI / 2); fl.scale(1, 0.35, 1); fl.translate(6, 0.7, -1.6); parts.push(paint(fl, HOT));
    parts.push(paint(cyl(0.6, 0.6, 0.06, 12, 4, 0.52, 3), rgb(0x1a2a3a)));
    return merge(parts);
  },
  // a music box, lid open: the box, the lid with its mirror, the comb (the drum turns on its own)
  musicbox() {
    const parts = [paint(box(14, 6.4, 9, 0, 4.4, 0), PINK), paint(box(14.3, 0.5, 9.3, 0, 1.4, 0), GOLD), paint(box(14.3, 0.4, 9.3, 0, 7.5, 0), GOLD)];
    for (const x of [-6, 6]) for (const z of [-3.6, 3.6]) parts.push(paint(sph(0.9, 1, 1, 1, x, 0.8, z, 10, 8), GOLD));
    parts.push(paint(box(13, 0.4, 8, 0, 7.6, 0), CRIMSON));
    const lid = merge([paint(box(14, 9, 0.8, 0, 4.5, 0), PINK), paint(box(12, 7, 0.1, 0, 4.5, 0.45), rgb(0xe0e8f0)), paint(box(14.3, 0.4, 1.0, 0, 9.0, 0), GOLD)]);
    lid.rotateX(-0.28); lid.translate(0, 7.8, -4.6); parts.push(lid);
    for (let k = 0; k < 14; k++) parts.push(paint(box(0.32, 0.18, 2.6, -3.9 + k * 0.6, 8.3, 1.9), GOLD));
    parts.push(paint(box(9.6, 1.0, 1.0, 0, 8.0, 0.4), BRASS_DARK));
    return merge(parts);
  },
  drum() { const parts = [paint(cyl(1.0, 1.0, 9, 16, 0, 0, 0).rotateZ(Math.PI / 2), GOLD)]; const R = seeded(7); for (let k = 0; k < 40; k++) { const a = R() * 6.28; parts.push(paint(box(0.12, 0.3, 0.12, -4.2 + R() * 8.4, Math.cos(a) * 1.05, Math.sin(a) * 1.05).rotateX(-a), CHROME)); } return merge(parts); },
  // the no-thinking sign on its pole
  signPole() { return merge([paint(cyl(0.28, 0.28, 12, 8, 0, 6, 0), GREY), paint(cyl(3.3, 3.3, 0.25, 32, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 12.6, -0.15), GREY)]); },
  discFace() { const g = new THREE.CircleGeometry(3.2, 32); g.translate(0, 12.6, 0.1); return g; },
  // the vanity: the table, the mirror's frame, the glass, lipsticks and a compact
  vanity() {
    const parts = [paint(box(18, 1.0, 6.4, 0, 6.2, 0), WHITE)];
    for (const x of [-8, 8]) for (const z of [-2.6, 2.6]) parts.push(paint(cyl(0.3, 0.2, 6, 8, x, 3, z), GOLD));
    parts.push(paint(box(17, 12, 0.8, 0, 13.6, -2.6), WHITE), paint(box(17.4, 0.5, 1.0, 0, 19.7, -2.6), GOLD));
    for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.32, 0.32, 1.6, 10, -5 + k * 1.1, 7.5, 1.4), GOLD), paint(cyl(0.3, 0.2, 0.7, 10, -5 + k * 1.1, 8.6, 1.4), [HOT, RED, PINK, CRIMSON][k]));
    parts.push(paint(cyl(1.3, 1.3, 0.35, 18, 4.2, 6.9, 1.2), PINK));
    return merge(parts);
  },
  mirror() { return face(15, 10.2, 0, 13.6, -2.18); },
  // ---- the recovery wing ----
  // a salon chair with its hood dryer over it
  dryer() {
    const parts = [paint(cyl(2.0, 1.9, 1.4, 18, 0, 2.6, 0), LILAC)];
    const back = new THREE.CylinderGeometry(2.1, 2.1, 3.0, 18, 1, true, Math.PI * 0.5, Math.PI); back.translate(0, 4.4, 0); parts.push(paint(back, LILAC));
    parts.push(paint(cyl(0.2, 0.2, 9, 8, 0, 4.5, -2.6), CHROME), paint(cyl(1.6, 1.6, 0.3, 16, 0, 0.15, -2.6), CHROME));
    const hood = new THREE.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55); hood.rotateX(0.5); hood.translate(0, 7.4, -0.8); parts.push(paint(hood, SHELL));
    parts.push(paint(beam([0, 8.8, -2.6], [0, 8.6, -1.2], 0.4), CHROME));
    return merge(parts);
  },
  // ---- the trade-in counter ----
  counter() {
    const parts = [paint(box(16, 5.4, 5.6, 0, 2.7, 0), WHITE), paint(box(16.4, 0.4, 6, 0, 5.6, 0), GOLD), paint(box(15.2, 3.6, 0.1, 0, 3.0, 2.82), rgb(0xd8f0ff))];
    parts.push(paint(box(17, 1.2, 1.2, 0, 15.8, -2.4), BLACK), paint(box(0.4, 10, 0.4, -7.8, 10.6, -2.4), GOLD), paint(box(0.4, 10, 0.4, 7.8, 10.6, -2.4), GOLD));
    return merge(parts);
  },
  diploma() { return merge([paint(box(6.6, 5.2, 0.5, 0, 0, 0), GOLD), paint(box(6.0, 4.6, 0.1, 0, 0, 0.27), rgb(0xf8f0dc))]); },
  diplomaFace() { return face(5.8, 4.4, 0, 0, 0.42); },
  // the syringe of filler in its box, what she got for it
  syringe() {
    const parts = [paint(box(6, 2.6, 2.6, 0, 0, 0), SHELL), paint(box(6.1, 0.6, 2.7, 0, 0.9, 0), HOT)];
    parts.push(paint(cyl(0.45, 0.45, 4.4, 12, 0, 1.6, 0).rotateZ(Math.PI / 2).translate(-0.2, 0, 0), rgb(0xffe0f0)), paint(cyl(0.05, 0.05, 1.6, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(2.9, 1.6, 0), CHROME), paint(cyl(0.6, 0.6, 0.2, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(-2.5, 1.6, 0), HOT));
    return merge(parts);
  },
  // the shredder and its bin; the books are their own
  shredder() { return merge([paint(box(8, 8, 6, 0, 4, 0), STEEL), paint(box(8.4, 3.2, 6.4, 0, 9.6, 0), DARK), paint(box(6.2, 0.2, 0.6, 0, 11.25, 0), BLACK), paint(cyl(0.3, 0.3, 0.2, 10, 3, 10.4, 3.25).rotateX(Math.PI / 2), rgb(0x3aff6a))]); },
  book() { return paint(box(5.4, 0.9, 4, 0, 0, 0), WHITE); },
  bookFace() { const g = face(5.4, 0.9, 0, 0, 2.1); return g; },
  strip() { return paint(box(0.18, 2.4, 0.04, 0, -1.2, 0), rgb(0xf4f0e6)); },
  // the doctor's scale with a readout for a head
  scale() {
    const parts = [paint(box(8, 1.2, 8, 0, 0.6, 1.2), WHITE), paint(box(7.4, 0.2, 7.4, 0, 1.3, 1.2), BLACK), paint(cyl(0.45, 0.45, 15, 10, 0, 8.6, -2.4), WHITE)];
    parts.push(paint(box(9, 4.2, 1.8, 0, 17.6, -2.4), WHITE), paint(box(9.2, 0.4, 2, 0, 19.7, -2.4), GOLD));
    return merge(parts);
  },
  scaleFace() { return face(8.0, 3.0, 0, 17.6, -1.36); },
  // dinner: a pedestal, the plate; on it what's sung (0 a smoothie, 1 a salad, 2 nothing)
  pedestal() { return merge([paint(cyl(2.4, 2.8, 8, 20, 0, 4, 0), WHITE), paint(cyl(3.0, 3.0, 0.4, 20, 0, 8.2, 0), GOLD), paint(cyl(3.4, 2.2, 0.35, 24, 0, 8.6, 0), SHELL)]); },
  smoothie() { return merge([paint(cyl(1.0, 0.8, 4.6, 16, 0, 11.1, 0), PINK), paint(cyl(1.08, 1.08, 0.3, 16, 0, 13.4, 0), SHELL), paint(beam([0.2, 12, 0], [0.9, 15.6, 0.3], 0.22), WHITE), paint(beam([0.9, 15.6, 0.3], [1.6, 15.9, 0.3], 0.22), RED)]); },
  salad() {
    const parts = [paint(new THREE.SphereGeometry(2.0, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, 10.8, 0), SHELL)];
    const R = seeded(12); for (let k = 0; k < 9; k++) parts.push(paint(sph(0.55 + R() * 0.3, 1.3, 0.5, 1, (R() - 0.5) * 2.4, 10.9 + R() * 0.4, (R() - 0.5) * 2.4, 8, 6), [GREEN, rgb(0x8ad84a), rgb(0x3a8a3a)][k % 3]));
    return merge(parts);
  },
  cutlery() { return merge([paint(box(0.25, 0.12, 4.4, -3.9, 8.84, 0), CHROME), paint(box(0.7, 0.12, 1.2, -3.9, 8.84, 2.4), CHROME), paint(box(0.3, 0.12, 5.2, 3.9, 8.84, 0), CHROME)]); },
  // the tiara on its cushion on a pedestal
  tiara() {
    const parts = [paint(cyl(2.2, 2.6, 7, 20, 0, 3.5, 0), GOLD), paint(rrect(6, 6, 1.6, 1.8), CRIMSON).rotateX(-Math.PI / 2).translate(0, 7.9, 0)];
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) parts.push(paint(cyl(0.3, 0.1, 1.2, 6, x, 7.3, z), GOLD));
    const arc = new THREE.TorusGeometry(2.4, 0.18, 6, 24, Math.PI); arc.translate(0, 8.8, 0); parts.push(paint(arc, GOLD));
    for (let k = 0; k < 5; k++) { const a = Math.PI * (k + 0.5) / 5, x = Math.cos(a) * 2.4, y = 8.8 + Math.sin(a) * 2.4; parts.push(paint(cyl(0.05, 0.3, 1.6 + (k === 2 ? 1.2 : 0), 6, x, y + 0.6, 0), GOLD), paint(new THREE.OctahedronGeometry(0.42 + (k === 2 ? 0.2 : 0), 0).translate(x, y + 1.6 + (k === 2 ? 0.6 : 0), 0), k % 2 ? SHELL : rgb(0xff9ad0))); }
    return merge(parts);
  },
  // ---- the monitor room ----
  monitor() { return merge([paint(cyl(2.2, 2.2, 0.4, 5, 0, 0.6, 0), DARK), paint(cyl(0.25, 0.25, 9, 8, 0, 5.2, 0), CHROME), paint(box(7.2, 5.4, 1.4, 0, 11.6, 0), DARK), paint(box(7.4, 0.3, 1.5, 0, 14.3, 0), MINT)]); },
  monitorFace() { return face(6.4, 4.4, 0, 11.6, 0.82); },
  // a hospital sign on a post, two faces: where the frontal lobe is, then CLOSED
  wayPost() { return merge([paint(cyl(0.3, 0.3, 16, 8, -5.2, 8, 0), GREY), paint(cyl(0.3, 0.3, 16, 8, 5.2, 8, 0), GREY)]); },
  wayFace(y) { return face(12, 3.6, 0, y, 0.05); },
  // a poster on the wall
  poster() { return face(7.2, 9.9, 0, 0, 0); },
  // ---- the hall of jars ----
  // the five stars over the road on their board
  starBoard() { return merge([paint(box(50, 12, 1.2, 0, 0, -0.8), BLACK), paint(box(51, 0.7, 1.6, 0, 6.2, -0.8), GOLD), paint(box(51, 0.7, 1.6, 0, -6.2, -0.8), GOLD), paint(box(0.3, 34, 0.3, -20, 22, -0.8), STEEL), paint(box(0.3, 34, 0.3, 20, 22, -0.8), STEEL)]); },
  star() { return paint(extrude(starShape(4.2), 1.0), GOLD); },
  // a specimen jar on its pedestal: the pedestal and lid (the glass, the fluid and the label are their own)
  jarBase() { return merge([paint(cyl(2.4, 2.8, 5, 20, 0, 2.5, 0), WHITE), paint(cyl(2.9, 2.9, 0.4, 20, 0, 5.2, 0), GOLD), paint(cyl(2.35, 2.35, 0.9, 20, 0, 13.0, 0), rgb(0x3a2a20)), paint(cyl(1.4, 1.4, 0.5, 16, 0, 13.6, 0), rgb(0x3a2a20))]); },
  jarGlass() { return paint(cyl(2.3, 2.3, 7.6, 24, 0, 9.1, 0), WHITE); },
  jarFluid() { return paint(cyl(2.12, 2.12, 6.2, 20, 0, 8.65, 0), rgb(0xd8f07a)); },
  jarLabel() { return face(3.4, 1.7, 0, 9.4, 2.46); },
  // the conveyor and its stamp: a belt section, a gantry, the press head; the compacts ride it
  belt() { return merge([paint(box(4, 1.2, 30, 0, 4.4, 0), BLACK), paint(box(4.4, 0.6, 30.4, 0, 3.6, 0), STEEL), paint(box(0.5, 3.6, 0.5, -1.8, 1.8, -12), STEEL), paint(box(0.5, 3.6, 0.5, 1.8, 1.8, -12), STEEL), paint(box(0.5, 3.6, 0.5, -1.8, 1.8, 12), STEEL), paint(box(0.5, 3.6, 0.5, 1.8, 1.8, 12), STEEL)]); },
  gantry() { return merge([paint(box(0.8, 13, 0.8, -3.6, 6.5, 0), PINK), paint(box(0.8, 13, 0.8, 3.6, 6.5, 0), PINK), paint(box(8.2, 1.6, 2, 0, 13, 0), PINK)]); },
  press() { return merge([paint(box(0.7, 5, 0.7, 0, 2.5, 0), CHROME), paint(box(3.2, 1.0, 3.2, 0, 0, 0), CHROME), paint(box(2.2, 0.2, 2.2, 0, -0.55, 0), HOT)]); },
  compact() { return merge([paint(cyl(1.3, 1.3, 0.35, 20, 0, 0.18, 0), PINK), paint(cyl(1.3, 1.3, 0.25, 20, 0, 0.5, 0), GOLD), paint(cyl(0.5, 0.5, 0.05, 12, 0, 0.66, 0), HOT)]); },
  // ---- the gallery ----
  // an empty gilt frame on its stand
  frame() {
    const parts = [], W = 13, H = 9.6, b = 1.0;
    parts.push(paint(box(W, b, 0.8, 0, H / 2 - b / 2, 0), GOLD), paint(box(W, b, 0.8, 0, -H / 2 + b / 2, 0), GOLD), paint(box(b, H, 0.8, W / 2 - b / 2, 0, 0), GOLD), paint(box(b, H, 0.8, -W / 2 + b / 2, 0, 0), GOLD));
    const g = merge(parts); g.translate(0, 13, 0);
    return merge([g, paint(beam([-3.6, 0, 1.6], [-2.2, 9, 0.4], 0.4), WOOD), paint(beam([3.6, 0, 1.6], [2.2, 9, 0.4], 0.4), WOOD), paint(beam([0, 0, -3], [0, 9, -0.4], 0.4), WOOD), paint(box(9, 0.4, 1.4, 0, 8.2, 0.6), WOOD)]);
  },
  // ---- the carpet ----
  stanchion() { return merge([paint(cyl(0.9, 1.0, 0.3, 16, 0, 0.15, 0), GOLD), paint(cyl(0.16, 0.16, 4.2, 8, 0, 2.3, 0), GOLD), paint(sph(0.4, 1, 1, 1, 0, 4.5, 0, 10, 8), GOLD)]); },
  rope() { const g = paint(cyl(0.2, 0.2, 1, 6, 0, 0.5, 0), CRIMSON); g.rotateX(Math.PI / 2); return g; },
  // a press photographer's camera on its tripod (the flash is a light)
  camera() {
    const parts = [paint(beam([0, 6.2, 0], [-1.3, 0, 1.0], 0.18), BLACK), paint(beam([0, 6.2, 0], [1.3, 0, 1.0], 0.18), BLACK), paint(beam([0, 6.2, 0], [0, 0, -1.5], 0.18), BLACK)];
    parts.push(paint(box(2.2, 1.6, 1.4, 0, 7.1, 0), BLACK), paint(cyl(0.55, 0.65, 1.6, 12, 0, 7.0, 1.4).rotateX(Math.PI / 2).translate(0, 0, 0), DARK), paint(box(1.2, 0.8, 0.6, 0.3, 8.5, 0.2), DARK), paint(box(1.0, 0.6, 0.1, 0.3, 8.5, 0.52), rgb(0xf8f8ff)));
    return merge(parts);
  },
  // an empty thought: a cloud and its two little puffs
  bubble() {
    const parts = [];
    for (const [x, y, r] of [[-4.2, 0, 3.2], [-1.4, 1.6, 4.0], [2.4, 1.2, 3.6], [4.8, -0.4, 2.8], [0.6, -1.4, 3.4], [-2.6, -1.6, 2.8], [2.6, -1.8, 2.6]]) parts.push(paint(sph(r, 1, 0.85, 0.7, x, y, 0, 16, 10), SHELL));
    parts.push(paint(sph(1.3, 1, 1, 0.8, -5.6, -5.4, 0, 10, 8), SHELL), paint(sph(0.75, 1, 1, 0.8, -7.4, -7.6, 0, 10, 8), SHELL));
    return merge(parts);
  },
  // ---- the end ----
  // the ring light on its stand
  ringLight() { const g = new THREE.TorusGeometry(5.4, 0.55, 12, 48); g.translate(0, 15, 0); return merge([paint(g, SHELL), paint(cyl(0.3, 0.3, 10, 8, 0, 5, 0), BLACK), paint(beam([0, 0.2, 0], [-2.4, 0, 1.6], 0.3), BLACK), paint(beam([0, 0.2, 0], [2.4, 0, 1.6], 0.3), BLACK), paint(beam([0, 0.2, 0], [0, 0, -2.6], 0.3), BLACK), paint(box(1.2, 1.0, 1.0, 0, 9.6, 0), BLACK)]); },
  // the phone on its tripod, filming the chair
  tripodPhone() {
    const parts = [paint(beam([0, 7, 0], [-1.6, 0, 1.2], 0.22), BLACK), paint(beam([0, 7, 0], [1.6, 0, 1.2], 0.22), BLACK), paint(beam([0, 7, 0], [0, 0, -1.8], 0.22), BLACK), paint(box(0.6, 1.2, 0.6, 0, 7.4, 0), BLACK)];
    const ph = paint(rrect(2.6, 5.2, 0.45, 0.35), BLACK); ph.translate(0, 10.6, 0); parts.push(ph);
    return merge(parts);
  },
  tripodFace() { return face(2.3, 4.8, 0, 10.6, 0.27); },
  // the tray of instruments on its stand: the pick and the baller laid on it, a bow round them
  tray() {
    const parts = [paint(cyl(0.3, 0.3, 6.4, 8, 0, 3.2, 0), CHROME), paint(cyl(1.8, 1.8, 0.3, 5, 0, 0.15, 0), CHROME), paint(box(7, 0.3, 4, 0, 6.5, 0), CHROME), paint(box(7.2, 0.6, 0.2, 0, 6.8, 2.0), CHROME), paint(box(7.2, 0.6, 0.2, 0, 6.8, -2.0), CHROME)];
    parts.push(paint(cyl(0.04, 0.14, 4.4, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.2, 6.85, -0.6), CHROME), paint(cyl(0.3, 0.26, 1.8, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(-2.9, 6.95, -0.6), HOT));
    parts.push(paint(cyl(0.14, 0.14, 4.0, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(-0.4, 6.85, 0.8), PINK), paint(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(1.9, 7.2, 0.8), CHROME));
    // the bow
    parts.push(paint(sph(0.9, 1.2, 0.7, 0.5, -1.0, 7.5, 0.1, 10, 8), HOT), paint(sph(0.9, 1.2, 0.7, 0.5, 1.0, 7.5, 0.1, 10, 8), HOT), paint(sph(0.35, 1, 1, 1, 0, 7.4, 0.1, 8, 6), HOT));
    parts.push(paint(beam([0, 7.3, 0.1], [-0.8, 6.7, 1.1], 0.3, 0.1), HOT), paint(beam([0, 7.3, 0.1], [0.8, 6.7, 1.1], 0.3, 0.1), HOT));
    return merge(parts);
  },
  // the lyric boards: a white light box with rounded corners, its pink tube, two cables
  board() { return merge([paint(rrect(28, 10.4, 2.4, 1.4), SHELL).translate(0, 0, -0.9), paint(rrect(28.8, 11.2, 2.8, 1.0), HOT).translate(0, 0, -1.4), paint(box(0.25, 40, 0.25, -11, 25, -1.4), STEEL), paint(box(0.25, 40, 0.25, 11, 25, -1.4), STEEL)]); },
  boardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(26 / 7.5, 8.6 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.02); return g; },
  // a sign face of a given size for the atlas (neon and printed signs), its face to +z
  signFace(w, h) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
};

// ---------- the pickup: a pill, pink one end, white the other ----------
export function pillGeometry() {
  const r = 0.21, L = 0.3, parts = [];
  const half = (c, up) => {
    const body = new THREE.CylinderGeometry(r, r, L, 20, 1, true); body.translate(0, (up ? 1 : -1) * L / 2, 0);
    const cap = new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2); cap.translate(0, (up ? 1 : -1) * L, 0);
    return [paint(body, c), paint(cap, c)];
  };
  parts.push(...half([1, 0.36, 0.66], true), ...half([0.98, 0.95, 0.96], false));
  const seam = new THREE.TorusGeometry(r * 1.01, 0.018, 6, 24); seam.rotateX(Math.PI / 2); parts.push(paint(seam, [0.95, 0.75, 0.3]));
  const g = merge(parts); g.rotateZ(0.7);
  return g;
}
export const pickup = {
  key: 'pill', geo: pillGeometry, color: 0xff8ac0, mat: { rough: 0.16, metal: 0.05, emissive: 0x4a1830 }, s: 1.55, lit: 1.25,
  move: (e, time, i) => e.set(Math.sin(time * 1.3 + i) * 0.3, time * 2.1 + i * 1.3, Math.sin(time * 1.7 + i) * 0.25),
};
