// Rent Free: the things in the house, built at the house's size (she is small in his head:
// about twelve times). Geometry coloured per vertex, the pictures and the words drawn into
// canvases. Names that reach the scenery registry live in rnt-sets.js (all start with rnt).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => mergeGeometries(gs.map(ni), false);
export function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
export const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
// a stick from a to b
export function beam(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- shared clocks for the house's own materials (rnt-sets.js writes them each frame) ----------
export const RU = { time: { value: 0 }, beat: { value: 0 }, lift: { value: 0 }, song: { value: 0 } };

// coloured per vertex and lit a little by itself, so nothing goes black in a dark room
export function litVC(k, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(3) + ';'); };
  m.customProgramCacheKey = () => 'rntLitVC' + k.toFixed(3);
  return m;
}
// ... tinted per instance (aTint) on top of the vertex colours, a glint per instance on the beat (aGlint)
export function tintVC(k, glint, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRBeat = RU.beat;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute float aGlint; varying vec3 vRTint; varying float vRGlint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRTint = aTint; vRGlint = aGlint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRBeat; varying vec3 vRTint; varying float vRGlint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vRTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * (' + k.toFixed(3) + ' + ' + glint.toFixed(3) + ' * vRGlint * uRBeat);');
  };
  m.customProgramCacheKey = () => 'rntTintVC' + k.toFixed(3) + '_' + glint.toFixed(3);
  return m;
}
// a picture from a sheet of pictures: each instance says which cell (aCell = column, row)
export function cellMat(tex, cols, rows, k = 0.5, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_MAP
        vMapUv = vec2((aCell.x + vMapUv.x) / ${cols.toFixed(1)}, 1.0 - (aCell.y + 1.0 - vMapUv.y) / ${rows.toFixed(1)});
        #endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(3) + ';');
  };
  m.customProgramCacheKey = () => 'rntCell' + cols + 'x' + rows + '_' + k.toFixed(3) + (opts.alphaTest ? 'a' : '');
  return m;
}

// ---------- canvases ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, aniso = 8) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }

// her face, head and shoulders, looking out: the same woman in every picture in the house
// (g is translated to the middle of the face; s scales her)
export function drawHer(g, opt = {}) {
  const dress = opt.dress || '#1a0e14', tilt = opt.tilt || 0, look = opt.look || 0, mouth = opt.mouth || 'closed';
  g.save(); g.rotate(tilt);
  g.fillStyle = opt.hairBack || '#1a0c08';
  g.beginPath(); g.moveTo(-120, -90); g.bezierCurveTo(-170, 60, -150, 210, -110, 300); g.lineTo(110, 300); g.bezierCurveTo(150, 210, 170, 60, 120, -90);
  g.bezierCurveTo(100, -190, -100, -190, -120, -90); g.fill();
  if (!opt.noBody) { g.fillStyle = dress; g.beginPath(); g.moveTo(-230, 360); g.bezierCurveTo(-200, 220, -110, 190, -60, 175); g.lineTo(60, 175); g.bezierCurveTo(110, 190, 200, 220, 230, 360); g.fill(); }
  const skin = g.createLinearGradient(-80, -100, 90, 120); skin.addColorStop(0, '#f2cdb0'); skin.addColorStop(1, '#b8846a');
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(-42, 70); g.lineTo(-48, 190); g.quadraticCurveTo(0, 215, 48, 190); g.lineTo(42, 70); g.fill();
  g.beginPath(); g.ellipse(0, -20, 78, 104, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = opt.hair || '#24120c';
  g.beginPath(); g.moveTo(-86, -40); g.bezierCurveTo(-90, -140, 40, -170, 92, -70); g.bezierCurveTo(60, -110, -20, -105, -40, -60); g.bezierCurveTo(-60, -20, -70, 40, -96, 80); g.fill();
  g.beginPath(); g.moveTo(84, -50); g.bezierCurveTo(110, 30, 96, 120, 120, 200); g.bezierCurveTo(140, 110, 130, 0, 84, -50); g.fill();
  for (const sx of [-1, 1]) {
    const wink = opt.wink && sx > 0;
    if (wink) { g.strokeStyle = '#2a1408'; g.lineWidth = 5; g.beginPath(); g.moveTo(sx * 30 - 16, -22); g.quadraticCurveTo(sx * 30, -14, sx * 30 + 16, -22); g.stroke(); }
    else {
      g.fillStyle = '#f4ece4'; g.beginPath(); g.ellipse(sx * 30, -24, 15, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = opt.eye || '#2a1a10'; g.beginPath(); g.arc(sx * 30 + 1 + look * 7, -24, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx * 30 + 3 + look * 7, -26, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a1a10'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx * 30, -24, 16, 8, 0, Math.PI, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = '#3a1a10'; g.lineWidth = 4; g.beginPath(); g.moveTo(sx * 14, -42 - (opt.brow && sx > 0 ? 6 : 0)); g.quadraticCurveTo(sx * 30, -50 - (opt.brow && sx > 0 ? 8 : 0), sx * 46, -42); g.stroke();
  }
  g.strokeStyle = 'rgba(120, 70, 50, 0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, -20); g.quadraticCurveTo(10, 10, 0, 22); g.stroke();
  g.fillStyle = '#a8202e';
  if (mouth === 'smirk') { g.beginPath(); g.moveTo(-24, 46); g.quadraticCurveTo(4, 34, 30, 38); g.quadraticCurveTo(4, 60, -24, 46); g.fill(); }
  else if (mouth === 'kiss') { g.beginPath(); g.ellipse(0, 46, 12, 10, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a0a14'; g.beginPath(); g.ellipse(0, 46, 4, 4, 0, 0, Math.PI * 2); g.fill(); }
  else { g.beginPath(); g.moveTo(-24, 46); g.quadraticCurveTo(0, 36, 24, 46); g.quadraticCurveTo(0, 62, -24, 46); g.fill(); }
  g.fillStyle = 'rgba(255, 140, 130, 0.18)'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 44, 14, 20, 0, Math.PI * 2); g.fill(); }
  if (!opt.noBody) { g.fillStyle = '#f4f0e8'; for (let i = -6; i <= 6; i++) { g.beginPath(); g.arc(i * 9, 196 + Math.abs(i) * Math.abs(i) * -0.9 + 10, 5, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}

// her portraits: one woman, four sittings (the house's main pictures; mansion.js hangs them)
export function portraitTexture() {
  const W = 512, H = 640, [c, g] = canvas(W * 2, H * 2);
  const sittings = [
    { bg: ['#3a5a5a', '#0e1a1c'], dress: '#1a0e14', tilt: -0.06, light: 0.0 },
    { bg: ['#6a1a2a', '#1a060a'], dress: '#0e0e16', tilt: 0.08, light: 0.15, mouth: 'smirk' },
    { bg: ['#7a6030', '#1e1408'], dress: '#3a0a14', tilt: -0.12, light: -0.1, look: 0.6 },
    { bg: ['#2a2a4a', '#08080e'], dress: '#2a2a2e', tilt: 0.04, light: 0.05, brow: true },
  ];
  sittings.forEach((s, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H;
    g.save(); g.translate(ox, oy);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    const bg = g.createRadialGradient(W * 0.45, H * 0.32, 20, W * 0.5, H * 0.45, H * 0.75);
    bg.addColorStop(0, s.bg[0]); bg.addColorStop(1, s.bg[1]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H * 0.44);
    drawHer(g, s);
    g.restore();
    g.save(); g.translate(ox, oy);
    const lt = g.createLinearGradient(0, 0, W, 0); lt.addColorStop(0, `rgba(255, 220, 160, ${0.12 + s.light})`); lt.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    g.fillStyle = lt; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10, 5, 0, 0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(30, 20, 10, 0.18)'; g.lineWidth = 1;
    const R = seeded(77 + k);
    for (let i = 0; i < 70; i++) { let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    g.restore();
  });
  return tex(c);
}

// what used to hang there: his peace of mind (a still lake at evening), his self-esteem (a gold
// cup and a blue rosette on velvet), and Jesus (gold leaf, a halo, open hands)
export function oldPicturesTexture() {
  const W = 512, H = 640, [c, g] = canvas(W * 2, H * 2);
  // 0: the lake
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  let sky = g.createLinearGradient(0, 0, 0, H * 0.55); sky.addColorStop(0, '#3a5a8a'); sky.addColorStop(0.6, '#e8a87a'); sky.addColorStop(1, '#f6d8a0');
  g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.55);
  g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(W * 0.62, H * 0.47, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a5a6a'; g.beginPath(); g.moveTo(0, H * 0.5); for (let x = 0; x <= W; x += 32) g.lineTo(x, H * 0.5 - 30 - 40 * Math.sin(x * 0.012) - 20 * Math.sin(x * 0.031)); g.lineTo(W, H * 0.55); g.lineTo(0, H * 0.55); g.fill();
  let lake = g.createLinearGradient(0, H * 0.55, 0, H); lake.addColorStop(0, '#d8a888'); lake.addColorStop(0.3, '#6a7a9a'); lake.addColorStop(1, '#1a2a3a');
  g.fillStyle = lake; g.fillRect(0, H * 0.55, W, H * 0.45);
  g.strokeStyle = 'rgba(255, 240, 200, 0.5)'; g.lineWidth = 3; for (let k = 0; k < 9; k++) { const y = H * 0.6 + k * 18; g.beginPath(); g.moveTo(W * 0.62 - 50 + k * 3, y); g.lineTo(W * 0.62 + 50 - k * 3, y); g.stroke(); }
  g.fillStyle = '#1a2414'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.7); g.quadraticCurveTo(W * 0.2, H * 0.74, W * 0.3, H); g.fill();
  g.restore();
  // 1: the cup and the rosette
  g.save(); g.translate(W, 0); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  let vel = g.createRadialGradient(W / 2, H * 0.4, 30, W / 2, H / 2, H * 0.7); vel.addColorStop(0, '#2a3a7a'); vel.addColorStop(1, '#0a1030');
  g.fillStyle = vel; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8b840';
  g.beginPath(); g.moveTo(W / 2 - 110, 150); g.lineTo(W / 2 + 110, 150); g.bezierCurveTo(W / 2 + 110, 330, W / 2 + 40, 360, W / 2 + 20, 380); g.lineTo(W / 2 - 20, 380); g.bezierCurveTo(W / 2 - 40, 360, W / 2 - 110, 330, W / 2 - 110, 150); g.fill();
  g.lineWidth = 16; g.strokeStyle = '#e8b840'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(W / 2 + s * 120, 220, 40, 60, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke(); }
  g.fillRect(W / 2 - 18, 380, 36, 60); g.fillRect(W / 2 - 80, 440, 160, 30); g.fillStyle = '#c89830'; g.fillRect(W / 2 - 100, 470, 200, 36);
  g.fillStyle = 'rgba(255, 255, 220, 0.45)'; g.beginPath(); g.ellipse(W / 2 - 50, 230, 18, 60, 0.2, 0, Math.PI * 2); g.fill();
  g.save(); g.translate(W * 0.74, H * 0.74); g.fillStyle = '#1a4ac8';
  for (let k = 0; k < 18; k++) { g.save(); g.rotate((k / 18) * Math.PI * 2); g.beginPath(); g.ellipse(0, -46, 14, 26, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.fillStyle = '#e8c860'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a4ac8'; g.fillRect(-26, 40, 22, 90); g.fillRect(6, 40, 22, 90);
  g.restore();
  g.restore();
  // 2: the icon
  g.save(); g.translate(0, H); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  let gold = g.createLinearGradient(0, 0, W, H); gold.addColorStop(0, '#d8a840'); gold.addColorStop(0.5, '#f0cc70'); gold.addColorStop(1, '#a87820');
  g.fillStyle = gold; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f8e0a0'; g.beginPath(); g.arc(W / 2, 190, 96, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#a87020'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, 190, 96, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#7a1a1a'; g.beginPath(); g.moveTo(W / 2 - 60, 250); g.bezierCurveTo(W / 2 - 170, 330, W / 2 - 170, 560, W / 2 - 150, H); g.lineTo(W / 2 + 150, H); g.bezierCurveTo(W / 2 + 170, 560, W / 2 + 170, 330, W / 2 + 60, 250); g.fill();
  g.fillStyle = '#1a3a7a'; g.beginPath(); g.moveTo(W / 2 - 20, 260); g.bezierCurveTo(W / 2 - 160, 380, W / 2 - 120, 560, W / 2 - 150, H); g.lineTo(W / 2 - 60, H); g.bezierCurveTo(W / 2 - 40, 500, W / 2 - 20, 380, W / 2 - 20, 260); g.fill();
  g.fillStyle = '#4a2a14'; g.beginPath(); g.ellipse(W / 2, 200, 58, 74, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e0b490'; g.beginPath(); g.ellipse(W / 2, 196, 40, 54, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a2a14'; g.beginPath(); g.ellipse(W / 2, 236, 30, 22, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#e0b490'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(W / 2 + s * 120, 420, 22, 30, s * 0.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
  // 3: an empty cell (the faded square where a picture used to be)
  g.save(); g.translate(W, H); g.fillStyle = '#6a5040'; g.fillRect(0, 0, W, H); g.restore();
  return tex(c);
}

// little faces of her in a circle (thought bubbles, the dollhouse window): transparent round them
export function cameoTexture() {
  const S = 512, [c, g] = canvas(S * 2, S * 2);
  const kinds = [{ mouth: 'smirk', look: 0.5, bg: '#f4d8e0' }, { wink: true, mouth: 'kiss', bg: '#f0e0f4' }, { brow: true, mouth: 'smirk', look: -0.4, bg: '#e8f0f8' }, { mouth: 'closed', bg: '#f8eedc' }];
  kinds.forEach((k, i) => {
    const ox = (i % 2) * S, oy = Math.floor(i / 2) * S;
    g.save(); g.translate(ox + S / 2, oy + S / 2);
    g.beginPath(); g.arc(0, 0, S * 0.47, 0, Math.PI * 2); g.clip();
    g.fillStyle = k.bg; g.fillRect(-S / 2, -S / 2, S, S);
    g.translate(0, 40); g.scale(0.92, 0.92);
    drawHer(g, { ...k, dress: '#3a0a18' });
    g.restore();
  });
  return tex(c);
}

// photographs: the two of them, four summers (the flashbacks)
export function polaroidTexture() {
  const W = 256, H = 300, [c, g] = canvas(W * 4, H);
  const scenes = [
    { sky: ['#f8c890', '#e86a6a'], ground: '#2a4a6a', kind: 'beach' },
    { sky: ['#2a1a4a', '#6a2a6a'], ground: '#1a0a14', kind: 'party' },
    { sky: ['#9ad0f0', '#e8f4f8'], ground: '#5a8a3a', kind: 'park' },
    { sky: ['#1a1a2a', '#3a2a3a'], ground: '#0a0a10', kind: 'car' },
  ];
  scenes.forEach((s, i) => {
    g.save(); g.translate(i * W, 0);
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, W, H);
    g.save(); g.beginPath(); g.rect(16, 16, W - 32, W - 32); g.clip();
    const sk = g.createLinearGradient(0, 16, 0, W - 16); sk.addColorStop(0, s.sky[0]); sk.addColorStop(1, s.sky[1]);
    g.fillStyle = sk; g.fillRect(16, 16, W - 32, W - 32);
    g.fillStyle = s.ground; g.fillRect(16, W * 0.68, W - 32, W);
    if (s.kind === 'party') for (let k = 0; k < 30; k++) { g.fillStyle = ['#ff6ab0', '#ffd27a', '#7ae0ff'][k % 3]; g.beginPath(); g.arc(20 + (k * 53) % 210, 24 + (k * 37) % 120, 3, 0, Math.PI * 2); g.fill(); }
    // two of them, close, the second leaning in
    for (const [x, h, col] of [[W * 0.42, 1, '#2a1410'], [W * 0.6, 0.92, '#1a1a24']]) {
      g.fillStyle = col; g.beginPath(); g.ellipse(x, W * 0.42 + (1 - h) * 40, 20, 24, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x - 36, W); g.quadraticCurveTo(x - 34, W * 0.55, x, W * 0.52 + (1 - h) * 40); g.quadraticCurveTo(x + 34, W * 0.55, x + 36, W); g.fill();
    }
    g.fillStyle = 'rgba(255, 240, 220, 0.25)'; g.fillRect(16, 16, W - 32, W - 32);
    g.restore();
    g.restore();
  });
  return tex(c, 4);
}

// the futures he pictures, and she's in every one: the wedding, the house with the fence, the
// beach at sunset, the kitchen in the morning
export function futuresTexture() {
  const W = 512, H = 640, [c, g] = canvas(W * 2, H * 2);
  const her = (x, y, s = 1) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#b8102a'; g.beginPath(); g.ellipse(0, -96, 22, 28, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1a0c08'; g.beginPath(); g.ellipse(0, -100, 26, 32, 0, Math.PI, Math.PI * 2); g.fill(); g.fillStyle = '#b8102a'; g.beginPath(); g.moveTo(-22, -66); g.lineTo(22, -66); g.lineTo(44, 60); g.lineTo(-44, 60); g.fill(); g.restore(); };
  const him = (x, y, s = 1) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#1a1a22'; g.beginPath(); g.ellipse(0, -100, 22, 28, 0, 0, Math.PI * 2); g.fill(); g.fillRect(-28, -70, 56, 130); g.restore(); };
  const cell = (k, f) => { const ox = (k % 2) * W, oy = Math.floor(k / 2) * H; g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, W, H); g.clip(); f(); const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,0,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore(); };
  // the wedding: an arch of white flowers, him at the altar, her beside him in red
  cell(0, () => {
    g.fillStyle = '#f0e6dc'; g.fillRect(0, 0, W, H); g.fillStyle = '#d8ccc0'; g.fillRect(0, H * 0.72, W, H);
    g.strokeStyle = '#ffffff'; g.lineWidth = 40; g.beginPath(); g.arc(W / 2, H * 0.55, 170, Math.PI, 0); g.stroke();
    for (let k = 0; k < 40; k++) { const a = Math.PI + (k / 39) * Math.PI; g.fillStyle = k % 3 ? '#fff8f8' : '#f8c8d0'; g.beginPath(); g.arc(W / 2 + Math.cos(a) * 170, H * 0.55 + Math.sin(a) * 170, 16, 0, Math.PI * 2); g.fill(); }
    him(W / 2 - 50, H * 0.74, 1.6); her(W / 2 + 55, H * 0.74, 1.6);
  });
  // the house with the fence: her in the upstairs window
  cell(1, () => {
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#8ac8f0'); sk.addColorStop(1, '#e8f4f0'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6aa04a'; g.fillRect(0, H * 0.72, W, H);
    g.fillStyle = '#f4eee4'; g.fillRect(W * 0.22, H * 0.36, W * 0.56, H * 0.38);
    g.fillStyle = '#8a3a3a'; g.beginPath(); g.moveTo(W * 0.16, H * 0.37); g.lineTo(W / 2, H * 0.16); g.lineTo(W * 0.84, H * 0.37); g.fill();
    g.fillStyle = '#3a2a2a'; g.fillRect(W * 0.45, H * 0.56, W * 0.1, H * 0.18);
    g.fillStyle = '#ffe8a0'; g.fillRect(W * 0.3, H * 0.42, W * 0.12, W * 0.12); g.fillRect(W * 0.58, H * 0.42, W * 0.12, W * 0.12);
    g.save(); g.beginPath(); g.rect(W * 0.58, H * 0.42, W * 0.12, W * 0.12); g.clip(); her(W * 0.64, H * 0.5, 0.55); g.restore();
    g.fillStyle = '#ffffff'; for (let x = 6; x < W; x += 26) { g.fillRect(x, H * 0.74, 12, 70); g.beginPath(); g.moveTo(x, H * 0.74); g.lineTo(x + 6, H * 0.72); g.lineTo(x + 12, H * 0.74); g.fill(); }
    g.fillRect(0, H * 0.79, W, 8);
  });
  // the beach at sunset: him on the sand, her shadow next to his
  cell(2, () => {
    const sk = g.createLinearGradient(0, 0, 0, H * 0.6); sk.addColorStop(0, '#5a3a7a'); sk.addColorStop(1, '#f8a060'); g.fillStyle = sk; g.fillRect(0, 0, W, H * 0.6);
    g.fillStyle = '#ffe0a0'; g.beginPath(); g.arc(W / 2, H * 0.58, 60, Math.PI, 0); g.fill();
    g.fillStyle = '#3a4a7a'; g.fillRect(0, H * 0.58, W, H * 0.14);
    g.fillStyle = '#e8c890'; g.fillRect(0, H * 0.72, W, H);
    him(W * 0.38, H * 0.86, 1.3); her(W * 0.6, H * 0.86, 1.3);
  });
  // the kitchen in the morning: two cups, her at the window
  cell(3, () => {
    g.fillStyle = '#f2e8d4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#bfe0f0'; g.fillRect(W * 0.3, H * 0.16, W * 0.4, H * 0.32); g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(W * 0.3, H * 0.16, W * 0.4, H * 0.32); g.beginPath(); g.moveTo(W / 2, H * 0.16); g.lineTo(W / 2, H * 0.48); g.stroke();
    g.fillStyle = '#7a5a3a'; g.fillRect(0, H * 0.62, W, H * 0.08); g.fillStyle = '#5a7a6a'; g.fillRect(0, H * 0.7, W, H);
    for (const x of [W * 0.3, W * 0.42]) { g.fillStyle = '#ffffff'; g.fillRect(x, H * 0.55, 34, 40); }
    her(W * 0.68, H * 0.66, 1.4);
  });
  return tex(c);
}

// cross-stitch samplers, his words in red thread on linen (the boards), 2 x 5 on one sheet
export const SAMPLER_COLS = 2, SAMPLER_ROWS = 6;
export function samplerTexture(lines) {
  const CW = 1024, CH = 400, [c, g] = canvas(CW * SAMPLER_COLS, CH * SAMPLER_ROWS);
  const tc = document.createElement('canvas'); tc.width = CW / 4; tc.height = CH / 4;
  const tg = tc.getContext('2d', { willReadFrequently: true });
  lines.forEach((spec, i) => {
    const ox = (i % SAMPLER_COLS) * CW, oy = Math.floor(i / SAMPLER_COLS) * CH;
    const thread = spec.thread || '#a8102a', accent = spec.accent || '#2a5a3a';
    g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, CW, CH); g.clip();
    // the linen: cream, a fine weave
    g.fillStyle = spec.linen || '#ece2cc'; g.fillRect(0, 0, CW, CH);
    g.fillStyle = 'rgba(120, 100, 70, 0.07)'; for (let x = 0; x < CW; x += 6) g.fillRect(x, 0, 1, CH); for (let y = 0; y < CH; y += 6) g.fillRect(0, y, CW, 1);
    // the border: a row of little hearts and a vine, stitched
    const st = (x, y, col, s = 6) => { g.strokeStyle = col; g.lineWidth = s * 0.42; g.beginPath(); g.moveTo(x - s / 2, y - s / 2); g.lineTo(x + s / 2, y + s / 2); g.moveTo(x + s / 2, y - s / 2); g.lineTo(x - s / 2, y + s / 2); g.stroke(); };
    for (let x = 30; x < CW - 24; x += 12) { st(x, 26, accent); st(x, CH - 26, accent); }
    for (let y = 38; y < CH - 30; y += 12) { st(26, y, accent); st(CW - 26, y, accent); }
    const heart = (cx, cy, col) => { for (const [dx, dy] of [[-2, -1], [-1, -2], [1, -2], [2, -1], [-2, 0], [-1, 0], [0, -1], [1, 0], [2, 0], [-1, -1], [1, -1], [0, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) st(cx + dx * 7, cy + dy * 7, col, 7); };
    for (const [x, y] of [[60, 60], [CW - 60, 60], [60, CH - 60], [CW - 60, CH - 60]]) heart(x, y, thread);
    // the words: drawn small, then every lit pixel becomes one cross stitch
    tg.clearRect(0, 0, tc.width, tc.height);
    const txt = spec.text.split('\n');
    let size = Math.floor(tc.height * 0.68 / txt.length);
    tg.font = `900 ${size}px "Arial Black", "Arial", sans-serif`;
    const maxW = tc.width - 22;
    const widest = Math.max(...txt.map((l) => tg.measureText(l).width));
    if (widest > maxW) { size = Math.floor(size * maxW / widest); tg.font = `900 ${size}px "Arial Black", "Arial", sans-serif`; }
    tg.fillStyle = '#fff'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
    const lh = size * 1.12, y0 = tc.height / 2 - (txt.length - 1) * lh / 2 + 1;
    txt.forEach((l, k) => tg.fillText(l, tc.width / 2, y0 + k * lh));
    const px = tg.getImageData(0, 0, tc.width, tc.height).data;
    const sx = CW / tc.width, sy = CH / tc.height;
    for (let y = 0; y < tc.height; y++) for (let x = 0; x < tc.width; x++) {
      if (px[(y * tc.width + x) * 4 + 3] < 110) continue;
      st(x * sx + sx / 2, y * sy + sy / 2, thread, sx * 0.86);
    }
    g.restore();
  });
  return tex(c, 8);
}

// the pennants of a WELCOME HOME banner: one letter on each, 12 cells across
export function bannerTexture(word = 'WELCOME HOME') {
  const CW = 128, CH = 160, [c, g] = canvas(CW * 12, CH);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, CH);
  [...word.padEnd(12, ' ')].forEach((ch, i) => {
    g.fillStyle = '#ffffff'; g.fillRect(i * CW, 0, CW, CH);
    g.fillStyle = '#2a0a1a'; g.font = '900 92px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, i * CW + CW / 2, CH * 0.36);
  });
  return tex(c, 4);
}

// the lease: a page of small type, the signature line empty, her lips on it instead
export function leaseTexture() {
  const [c, g] = canvas(768, 1024), R = seeded(11);
  g.fillStyle = '#f2ead6'; g.fillRect(0, 0, 768, 1024);
  g.fillStyle = '#1a1414'; g.font = '700 96px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.fillText('LEASE', 384, 130);
  g.fillRect(140, 160, 488, 4);
  g.fillStyle = '#4a4040';
  for (let y = 220; y < 760; y += 30) { let x = 70; while (x < 690) { const w = 12 + R() * 60; if (x + w > 698) break; g.fillRect(x, y, w, 9); x += w + 10; } }
  g.fillStyle = '#1a1414'; g.fillRect(380, 880, 300, 4);
  g.save(); g.translate(530, 850); g.rotate(-0.1); g.fillStyle = '#c0102a';
  g.beginPath(); g.moveTo(-110, 0); g.bezierCurveTo(-65, -55, -18, -36, 0, -20); g.bezierCurveTo(18, -36, 65, -55, 110, 0); g.bezierCurveTo(55, -6, -55, -6, -110, 0); g.fill();
  g.beginPath(); g.moveTo(-110, 6); g.bezierCurveTo(-55, 12, 55, 12, 110, 6); g.bezierCurveTo(65, 74, -65, 74, -110, 6); g.fill();
  g.restore();
  return tex(c);
}

// MINE, in her lipstick, on the walls (4 hands)
export function lipstickTexture() {
  const [c, g] = canvas(1024, 512);
  g.clearRect(0, 0, 1024, 512);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * 512, oy = Math.floor(k / 2) * 256;
    g.save(); g.translate(ox + 256, oy + 132); g.rotate([-0.08, 0.06, -0.14, 0.1][k]);
    g.font = `italic 900 ${[150, 140, 160, 146][k]}px "Brush Script MT", "Segoe Script", cursive`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(200, 20, 40, 0.6)'; g.shadowBlur = 6;
    g.fillStyle = '#d0102c'; g.fillText('MINE', 0, 0);
    g.globalAlpha = 0.4; g.fillStyle = '#ff5a6a'; g.fillText('MINE', -3, -3);
    g.restore();
  }
  return tex(c, 4);
}

// ---------- the front of the house: a porch with columns, a pediment, steps (faces -z, the way she comes) ----------
export function porchGeo() {
  const parts = [], stone = rgb(0xd8d0c4), dark = rgb(0xa89c8c), gold = rgb(0xd0a850);
  for (const sx of [-1, 1]) for (const x of [14.5, 20]) {
    const cx = sx * x;
    parts.push(paint(box(4, 1.6, 4, cx, 0.8, -6), dark));
    parts.push(paint(cyl(1.25, 1.45, 31, 18, cx, 17.1, -6), stone));
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; parts.push(paint(box(0.25, 30, 0.3, cx + Math.cos(a) * 1.33, 17.1, -6 + Math.sin(a) * 1.33).rotateY(0), dark)); }
    parts.push(paint(box(3.6, 1.4, 3.6, cx, 33.3, -6), stone));
    for (const s2 of [-1, 1]) parts.push(paint(sph(0.9, 1, 1, 0.6, cx + s2 * 1.4, 33.0, -4.2, 8, 6), stone));
  }
  parts.push(paint(box(48, 3, 4.4, 0, 35.5, -6), stone));
  parts.push(paint(box(49, 0.8, 5, 0, 37.3, -6), dark));
  const tri = new THREE.Shape(); tri.moveTo(-24.5, 0); tri.lineTo(24.5, 0); tri.lineTo(0, 8.8); tri.lineTo(-24.5, 0);
  const ped = new THREE.ExtrudeGeometry(tri, { depth: 4.4, bevelEnabled: false }); ped.translate(0, 37.7, -8.2);
  parts.push(paint(ped, stone));
  // a round window in the pediment, lit
  parts.push(paint(cyl(2.4, 2.4, 0.4, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 41, -3.5), rgb(0xffc870)));
  parts.push(paint(new THREE.TorusGeometry(2.6, 0.35, 8, 24).translate(0, 41, -3.4), gold));
  // the steps up to the door
  for (let k = 0; k < 4; k++) parts.push(paint(box(30 - k * 1.2, 1.4, 3, 0, 0.7 + k * 1.4, -12 + k * 2.4), dark));
  return merge(parts);
}
// a carriage lantern: iron frame, glass (the light is a glow)
export function lanternGeo() {
  const parts = [], iron = rgb(0x141016), glass = [2.6, 2.1, 1.3];
  parts.push(paint(cyl(0.18, 0.18, 6, 6, 0, 3, 0), iron));
  parts.push(paint(new THREE.CylinderGeometry(1.5, 1.1, 0.6, 6).translate(0, 6.3, 0), iron));
  parts.push(paint(new THREE.CylinderGeometry(1.4, 1.2, 3.2, 6, 1, true).translate(0, 8.2, 0), glass));
  parts.push(paint(new THREE.ConeGeometry(1.8, 1.6, 6).translate(0, 10.6, 0), iron));
  parts.push(paint(sph(0.4, 1, 1, 1, 0, 11.6, 0, 6, 4), iron));
  return merge(parts);
}
// a clipped topiary in a stone urn: a ball on a ball on a cone
export function topiaryGeo() {
  const parts = [], green = rgb(0x1e3a22), urn = rgb(0xb8b0a4);
  parts.push(paint(cyl(2.2, 1.6, 3, 12, 0, 1.5, 0), urn)); parts.push(paint(cyl(2.6, 2.6, 0.6, 12, 0, 3.2, 0), urn));
  parts.push(paint(cyl(0.3, 0.3, 4, 6, 0, 5, 0), rgb(0x3a2a1a)));
  parts.push(paint(sph(2.6, 1, 1, 1, 0, 7.5, 0, 12, 8), green)); parts.push(paint(sph(1.8, 1, 1, 1, 0, 11.4, 0, 10, 8), green)); parts.push(paint(new THREE.ConeGeometry(1.1, 3, 8).translate(0, 14.4, 0), green));
  return merge(parts);
}

// ---------- the furniture, uncovered: velvet and gilt ----------
const VELVET = [0x6a0e1e, 0x3a0e3a, 0x0e3a2a, 0x7a3a0a];
export function chairGeo() {
  const parts = [], v = rgb(0x6a0e1e), vd = rgb(0x4a0814), gold = rgb(0xc8a050), wood = rgb(0x3a1e12);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(cyl(0.45, 0.28, 2.4, 10, sx * 3.7, 1.2, sz * 3.2), wood));
  parts.push(paint(box(9, 2.6, 8.4, 0, 3.7, 0), v));
  parts.push(paint(box(9.1, 0.35, 0.2, 0, 2.5, 4.22), gold));
  parts.push(paint(sph(1, 3.7, 0.8, 3.5, 0, 5.3, 0.4, 18, 10), v));
  parts.push(paint(box(9, 9.5, 1.6, 0, 9.6, -3.6), v));
  parts.push(paint(sph(1, 4.6, 1.4, 0.9, 0, 14.3, -3.6, 18, 10), v));
  for (const sx of [-1, 1]) {
    parts.push(paint(box(1.4, 6.5, 3.6, sx * 4.0, 10.6, -2.0), vd));
    parts.push(paint(cyl(0.95, 0.95, 7.2, 14, 0, 0, 0).rotateX(Math.PI / 2).translate(sx * 4.2, 6.6, 0.4), v));
    parts.push(paint(sph(1.05, 1, 1, 0.5, sx * 4.2, 6.6, 4.0, 12, 8), gold));
  }
  for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k++) parts.push(paint(sph(0.22, 1, 1, 0.6, k * 2.6 + (r % 2) * 1.3 - 0.65, 7.5 + r * 2.2, -2.75, 6, 4), gold));
  return merge(parts);
}
export function sofaGeo() {
  const parts = [], v = rgb(0x3a0e3a), vd = rgb(0x2a0828), gold = rgb(0xc8a050), wood = rgb(0x3a1e12);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(cyl(0.45, 0.3, 2.2, 10, sx * 9.2, 1.1, sz * 3.4), wood));
  parts.push(paint(box(20, 3, 8.6, 0, 3.7, 0), v));
  parts.push(paint(box(20.1, 0.35, 0.2, 0, 2.4, 4.32), gold));
  for (const x of [-6.2, 0, 6.2]) parts.push(paint(sph(1, 3.0, 0.8, 3.6, x, 5.5, 0.4, 16, 8), v));
  parts.push(paint(box(20, 6.4, 1.8, 0, 8.2, -3.4), v));
  parts.push(paint(cyl(1.1, 1.1, 20.4, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 11.4, -3.4), vd));
  for (const sx of [-1, 1]) parts.push(paint(cyl(1.3, 1.3, 8.6, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(sx * 10, 7.0, 0.2), v));
  for (let r = 0; r < 2; r++) for (let k = -4; k <= 4; k++) parts.push(paint(sph(0.24, 1, 1, 0.6, k * 2.1 + (r % 2) * 1.05, 7.2 + r * 2.4, -2.45, 6, 4), gold));
  return merge(parts);
}
// a tall clock on its own, the pendulum box with a gold face (the house's nightmares have clocks)
export function clockGeo() {
  const parts = [], wood = rgb(0x3a1a0e), gold = rgb(0xd8b060), face = rgb(0xf4ead0);
  parts.push(paint(box(5.2, 1.2, 4.0, 0, 0.6, 0), wood));
  parts.push(paint(box(4.2, 13, 3.2, 0, 7.7, 0), wood));
  parts.push(paint(box(2.2, 6, 0.3, 0, 8, 1.65), rgb(0x1a0a06)));
  parts.push(paint(cyl(0.8, 0.8, 0.15, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 6.2, 1.75), gold));
  parts.push(paint(box(5, 5.4, 3.6, 0, 16.9, 0), wood));
  parts.push(paint(cyl(2.0, 2.0, 0.2, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 17, 1.85), face));
  parts.push(paint(box(0.2, 1.6, 0.1, 0, 17.6, 1.98), rgb(0x1a1414)));
  parts.push(paint(box(1.2, 0.2, 0.1, 0.5, 17, 1.98), rgb(0x1a1414)));
  parts.push(paint(cyl(0.01, 2.8, 2.4, 4, 0, 0, 0).rotateY(Math.PI / 4).scale(1, 1, 0.75).translate(0, 20.8, 0), wood));
  parts.push(paint(sph(0.5, 1, 1, 1, 0, 22.2, 0, 8, 6), gold));
  return merge(parts);
}
export { VELVET };

// ---------- the ghost: a sheet with two holes for eyes, arms out for her partner ----------
export function ghostGeo() {
  const pts = [[0.001, 9.6], [0.9, 9.52], [1.7, 9.15], [2.25, 8.5], [2.52, 7.6], [2.58, 6.6], [2.72, 5.3], [3.05, 3.9], [3.5, 2.5], [3.95, 1.2], [4.3, 0.15]];
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32, 0, Math.PI * 2);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2], a = Math.atan2(x, z), k = clamp(1 - y / 7, 0, 1);
    const f = 1 + 0.07 * Math.sin(a * 7) * k + 0.03 * Math.sin(a * 13 + 1) * k;
    p[i] = x * f; p[i + 2] = z * f;
    if (y < 1.6) p[i + 1] = y + Math.sin(a * 6 + 0.5) * 0.55 * (1.6 - y) / 1.6;
  }
  g.computeVertexNormals();
  const n = g.attributes.position.count, cA = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = p[i * 3 + 1], k = clamp(y / 9.6, 0, 1); cA[i * 3] = 0.82 + 0.16 * k; cA[i * 3 + 1] = 0.84 + 0.14 * k; cA[i * 3 + 2] = 0.95 + 0.05 * k; }
  g.setAttribute('color', new THREE.BufferAttribute(cA, 3));
  const parts = [g];
  const dark = rgb(0x0a0610);
  for (const sx of [-1, 1]) parts.push(paint(sph(1, 0.42, 0.62, 0.22, sx * 0.85, 7.7, 2.42, 12, 8).rotateY(sx * 0.33), dark));
  parts.push(paint(sph(1, 0.34, 0.44, 0.2, 0, 6.6, 2.5, 10, 8), dark));
  // arms: two lobes reaching forward, for holding her partner
  for (const sx of [-1, 1]) { const a = sph(1, 0.85, 0.75, 2.1, 0, 0, 0, 12, 8); a.rotateY(sx * 0.5); a.rotateX(-0.2); a.translate(sx * 2.9, 5.5, 1.2); parts.push(paint(a, rgb(0xe8eaf6))); }
  return merge(parts);
}

// ---------- a cloud of a thought: puffs, and the little bubbles trailing down from it ----------
export function thoughtGeo() {
  const parts = [], white = rgb(0xf6f4fa), R = seeded(19);
  for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2; const r = 1.9 + R() * 0.9; parts.push(paint(sph(r, 1, 0.92, 0.75, Math.cos(a) * 5.0, Math.sin(a) * 3.0, 0, 14, 10), white)); }
  parts.push(paint(sph(4.2, 1.15, 0.78, 0.55, 0, 0, -0.4, 18, 12), white));
  for (const [x, y, r] of [[-4.6, -4.8, 1.0], [-6.2, -6.6, 0.7], [-7.4, -8.0, 0.45]]) parts.push(paint(sph(r, 1, 1, 0.8, x, y, 0, 10, 8), white));
  return merge(parts);
}
// the face inside it: a round cameo, a little in front
export function cameoGeo(r = 3.0, z = 2.3) { const g = new THREE.PlaneGeometry(r * 2, r * 2); g.translate(0, 0, z); return g; }

// ---------- the bar cart, every decanter empty ----------
export function barCartGeo() {
  const parts = [], brass = rgb(0xd8b060), glass = rgb(0xc8d8e0), dark = rgb(0x1a1418);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(cyl(0.18, 0.18, 11, 8, sx * 6, 5.5, sz * 3), brass));
  for (const y of [2.4, 8.2]) { parts.push(paint(box(12.6, 0.3, 6.6, 0, y, 0), dark)); parts.push(paint(box(12.8, 0.4, 0.2, 0, y + 0.3, 3.3), brass)); parts.push(paint(box(12.8, 0.4, 0.2, 0, y + 0.3, -3.3), brass)); }
  for (const sx of [-1, 1]) parts.push(paint(new THREE.TorusGeometry(1.4, 0.18, 6, 20).rotateY(Math.PI / 2).translate(sx * 6, 1.4, 3.2), dark));
  parts.push(paint(new THREE.TorusGeometry(2.4, 0.16, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(6.2, 11, 0), brass));
  // decanters: cut glass, stoppers in, nothing in them
  for (const [x, z, h] of [[-3.8, -1, 4.2], [-1.2, 1, 3.6], [1.6, -0.8, 4.6]]) {
    parts.push(paint(cyl(1.2, 1.4, h, 8, x, 8.4 + h / 2, z), glass));
    parts.push(paint(cyl(0.45, 0.9, 1.2, 8, x, 8.4 + h + 0.5, z), glass));
    parts.push(paint(sph(0.7, 1, 0.8, 1, x, 8.4 + h + 1.5, z, 8, 6), glass));
  }
  // a glass with her lipstick on the rim, and the bottle down on its side
  parts.push(paint(cyl(0.9, 0.6, 2.2, 12, 4.2, 9.6, 1.4), glass)); parts.push(paint(cyl(0.92, 0.92, 0.25, 12, 4.5, 10.6, 1.4).scale(0.3, 1, 0.6), rgb(0xd0102a)));
  const b = [paint(cyl(1.0, 1.0, 5, 12, 0, 2.5, 0), rgb(0x2a0a10)), paint(cyl(0.38, 0.6, 2.4, 10, 0, 6.2, 0), rgb(0x2a0a10)), paint(cyl(1.02, 1.02, 1.8, 12, 0, 2.6, 0), rgb(0xe8dcc0))];
  for (const gg of b) { gg.rotateZ(Math.PI / 2 - 0.05); gg.rotateY(0.4); gg.translate(-1, 3.6, 0.5); parts.push(gg); }
  return merge(parts);
}

// ---------- her luggage, just arrived: suitcases, a hatbox, the trunk ----------
export function luggageGeo() {
  const parts = [], R = seeded(7);
  const leathers = [0x7a4a24, 0x5a2a14, 0x8a5a2a, 0x3a1e10], brass = rgb(0xd8b060), strap = rgb(0x2a160c);
  // the steamer trunk at the bottom
  parts.push(paint(box(14, 7, 7.5, 0, 3.5, 0), rgb(0x2a3a5a)));
  for (const x of [-6, -2, 2, 6]) parts.push(paint(box(0.5, 7.1, 7.6, x, 3.5, 0), rgb(0x8a6a3a)));
  parts.push(paint(box(1.8, 1.4, 0.3, 0, 5.8, 3.8), brass));
  let y = 7;
  for (let k = 0; k < 4; k++) {
    const w = 11 - k * 1.6 + R() * 1.2, h = 2.6 + R() * 1.2, d = 6.4 - k * 0.6;
    const c = rgb(leathers[k % 4]);
    const g = box(w, h, d, 0, y + h / 2, 0); g.rotateY((R() - 0.5) * 0.35); parts.push(paint(g, c));
    for (const sx of [-0.28, 0.28]) { const s = box(0.5, h + 0.06, d + 0.06, sx * w, y + h / 2, 0); s.rotateY((R() - 0.5) * 0.02); parts.push(paint(s, strap)); }
    parts.push(paint(new THREE.TorusGeometry(0.8, 0.2, 6, 12, Math.PI).translate(0, y + h, 0), strap));
    // the stickers from everywhere she's been
    for (let j = 0; j < 3; j++) parts.push(paint(box(1.4 + R(), 1.0 + R() * 0.6, 0.06, (R() - 0.5) * w * 0.7, y + h * (0.3 + R() * 0.4), d / 2 + 0.03), rgb([0xf0d070, 0xe86a6a, 0x6ab0e8, 0xf4eee0][j])));
    y += h;
  }
  // the hatbox on top, striped
  for (let k = 0; k < 8; k++) parts.push(paint(cyl(3.0, 3.0, 0.42, 24, 0, y + 0.21 + k * 0.42, 0), rgb(k % 2 ? 0xf4e8f0 : 0xd84a7a)));
  parts.push(paint(cyl(3.2, 3.2, 0.5, 24, 0, y + 3.6, 0), rgb(0xf4e8f0)));
  parts.push(paint(new THREE.TorusGeometry(2.6, 0.15, 6, 20, Math.PI).translate(0, y + 3.8, 0), rgb(0x1a0a10)));
  return merge(parts);
}

// ---------- the padlock he put on it, and her hairpin in it ----------
export function lockBodyGeo() {
  const parts = [], brass = rgb(0xd8a840), dark = rgb(0x1a1008);
  const body = new THREE.CylinderGeometry(5, 5, 4, 32, 1); body.rotateX(Math.PI / 2); body.scale(1, 1.05, 1);
  const p = body.attributes.position.array; for (let i = 0; i < p.length; i += 3) { if (p[i + 1] > 0) p[i + 1] = Math.min(p[i + 1], 1.2) + (p[i + 1] > 1.2 ? (p[i + 1] - 1.2) * 0.2 : 0); }
  body.computeVertexNormals(); parts.push(paint(body, brass));
  parts.push(paint(box(10.02, 2.4, 4.02, 0, 0.6, 0), brass));
  for (const z of [2.06, -2.06]) parts.push(paint(box(9.2, 0.35, 0.06, 0, 2.2, z), rgb(0xf0c860)));
  // the keyhole, and her pin standing in it
  parts.push(paint(cyl(0.7, 0.7, 0.1, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, -0.6, 2.06), dark));
  parts.push(paint(box(0.6, 1.8, 0.1, 0, -1.6, 2.06), dark));
  const pin = [box(0.16, 4.2, 0.16, -0.25, -2.0, 0), box(0.16, 3.8, 0.16, 0.25, -1.8, 0), sph(0.3, 1, 0.6, 1, 0, 0.1, 0, 8, 6)];
  for (const g of pin) { g.rotateZ(0.75); g.translate(1.3, -2.0, 2.3); parts.push(paint(g, rgb(0x2a2a30))); }
  return merge(parts);
}
export function lockShackleGeo() {
  const parts = [], steel = rgb(0xc8ccd4);
  const arc = new THREE.TorusGeometry(3.3, 0.7, 10, 24, Math.PI); arc.translate(0, 4.0, 0); parts.push(paint(arc, steel));
  for (const sx of [-1, 1]) parts.push(paint(cyl(0.7, 0.7, 2.4, 12, sx * 3.3, 2.8, 0), steel));
  return merge(parts);
}

// ---------- a door leaf: panels, a knob, a knocker (hinge at x 0, opens toward +z) ----------
export function doorLeafGeo(w, h, flip) {
  const parts = [], wood = rgb(0x3a1a0e), panel = rgb(0x4a2414), brass = rgb(0xe0b850);
  const s = flip ? -1 : 1;
  parts.push(paint(box(w, h, 0.9, s * w / 2, h / 2, 0), wood));
  for (const [py, ph] of [[h * 0.2, h * 0.28], [h * 0.62, h * 0.42]]) for (const z of [0.5, -0.5]) parts.push(paint(box(w * 0.64, ph, 0.2, s * w / 2, py, z), panel));
  for (const z of [0.6, -0.6]) parts.push(paint(sph(0.55, 1, 1, 0.5, s * (w - 1.2), h * 0.45, z, 10, 8), brass));
  for (const z of [0.55, -0.55]) parts.push(paint(new THREE.TorusGeometry(0.9, 0.18, 8, 20).translate(s * (w - 1.6), h * 0.62, z), brass));
  for (const y of [h * 0.12, h * 0.5, h * 0.88]) parts.push(paint(box(1.4, 0.5, 1.1, s * 0.5, y, 0), rgb(0x1a1410)));
  return merge(parts);
}

// ---------- the WELCOME HOME banner: a string across, a pennant per letter ----------
// spans x -span..span at y 0, sagging; each pennant has its letter cell in its uv
export function bannerGeo(span) {
  const parts = [], N = 12, cols = [rgb(0xf0c040), rgb(0xe8508a), rgb(0x9a5ae0), rgb(0xf8ece0)];
  const sag = (x) => -span * 0.16 * (1 - (x / span) ** 2);
  const str = []; for (let k = 0; k < 24; k++) { const x0 = -span + (k / 24) * 2 * span, x1 = -span + ((k + 1) / 24) * 2 * span; str.push(paint(beam(V(x0, sag(x0), 0), V(x1, sag(x1), 0), 0.12, 4), rgb(0x2a1a14))); }
  parts.push(...str);
  for (let i = 0; i < N; i++) {
    const x = -span * 0.82 + (i + 0.5) / N * span * 1.64, y = sag(x);
    const w = span * 1.64 / N * 0.86, h = w * 1.25;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([x - w / 2, y, 0, x + w / 2, y, 0, x, y - h, 0]);
    const uv = new Float32Array([i / 12, 1, (i + 1) / 12, 1, (i + 0.5) / 12, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    parts.push(paint(g, cols[i % 4]));
  }
  // anything without uv gets one (merge needs the same attributes)
  for (const g of parts) if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2).fill(0.999), 2));
  for (const g of parts) if (!g.attributes.normal) g.computeVertexNormals();
  return merge(parts);
}

// ---------- a balloon on its string ----------
export function balloonGeo() {
  const parts = [], w = rgb(0xffffff);
  const b = new THREE.SphereGeometry(2.2, 16, 12); const p = b.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const y = p[i + 1]; const k = y < 0 ? 1 + y / 2.2 * 0.35 : 1; p[i] *= k; p[i + 2] *= k; p[i + 1] *= 1.2; }
  b.computeVertexNormals(); b.translate(0, 2.6, 0); parts.push(paint(b, w));
  parts.push(paint(cyl(0.12, 0.4, 0.5, 8, 0, -0.1, 0), w));
  parts.push(paint(box(0.06, 9, 0.06, 0, -4.8, 0), rgb(0xe8e0d8)));
  return merge(parts);
}

// ---------- forget-me-nots: a clump of little blue flowers ----------
export function forgetGeo() {
  const parts = [], R = seeded(41), blue = [rgb(0x5a8ae8), rgb(0x7aa8f4), rgb(0x8ab4ff), rgb(0x9a8ae8)], leaf = rgb(0x2a5a2a), eye = rgb(0xf8d040);
  parts.push(paint(sph(1, 3.4, 1.2, 3.0, 0, 0.4, 0, 12, 6), leaf));
  for (let k = 0; k < 9; k++) { const a = R() * 6.28, r = 1 + R() * 2.4; const l = sph(1, 0.5, 0.18, 1.3, 0, 0, 0, 8, 4); l.rotateY(a); l.translate(Math.cos(a) * r, 1.2 + R() * 0.6, Math.sin(a) * r); parts.push(paint(l, leaf)); }
  for (let k = 0; k < 30; k++) {
    const a = R() * 6.28, r = R() * 3.4, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 1.8 + R() * 1.8 * (1 - r / 4);
    const c = blue[k % 4];
    for (let j = 0; j < 5; j++) { const pa = (j / 5) * Math.PI * 2; parts.push(paint(sph(0.5, 1, 0.35, 1, cx + Math.cos(pa) * 0.55, cy, cz + Math.sin(pa) * 0.55, 6, 4), c)); }
    parts.push(paint(sph(0.26, 1, 0.6, 1, cx, cy + 0.1, cz, 6, 4), eye));
  }
  return merge(parts);
}

// ---------- the house he drew to keep her out, as a blueprint in the air: white lines ----------
export function dollhouseGeo() {
  const parts = [], r = 0.22;
  const edgeBox = (x0, y0, z0, x1, y1, z1) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]].map(([a, b, d]) => V(a, b, d));
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) parts.push(beam(c[i], c[j], r, 4));
  };
  const roof = (x0, x1, z0, z1, y, ry) => { const m = (z0 + z1) / 2; for (const x of [x0, x1]) { parts.push(beam(V(x, y, z0), V(x, ry, m), r, 4)); parts.push(beam(V(x, y, z1), V(x, ry, m), r, 4)); } parts.push(beam(V(x0, ry, m), V(x1, ry, m), r, 4)); };
  edgeBox(-8, 0, -5, 8, 14, 5); roof(-8, 8, -5, 5, 14, 20);
  for (const s of [-1, 1]) { edgeBox(s * 8, 0, -4, s * 15, 9, 4); roof(s * 8, s * 15, -4, 4, 9, 13); }
  edgeBox(-2.4, 0, 4.6, 2.4, 6.4, 5.4);
  // the tower, its cone
  edgeBox(10, 9, -2.5, 14, 17, 1.5); for (const [x, z] of [[10, -2.5], [14, -2.5], [14, 1.5], [10, 1.5]]) parts.push(beam(V(x, 17, z), V(12, 23, -0.5), r, 4));
  // windows on the front
  for (const [x, y] of [[-5.5, 3], [5.5, 3], [-5.5, 9], [0, 9], [5.5, 9], [-11.5, 3], [11.5, 3]]) { for (const [a, b] of [[[-1.1, -1.5], [1.1, -1.5]], [[1.1, -1.5], [1.1, 1.5]], [[1.1, 1.5], [-1.1, 1.5]], [[-1.1, 1.5], [-1.1, -1.5]]]) parts.push(beam(V(x + a[0], y + a[1], 5.05), V(x + b[0], y + b[1], 5.05), 0.14, 4)); }
  return paint(merge(parts), [1, 1, 1]);
}

// ---------- the fireplace: marble, the fire, the mirror over it, candlesticks ----------
export function fireplaceGeo() {
  const parts = [], marble = rgb(0xe8e2d8), vein = rgb(0xc8c0b4), dark = rgb(0x120a08), gold = rgb(0xd0a850), brass = rgb(0xd8b060);
  for (const sx of [-1, 1]) { parts.push(paint(box(3, 12, 3, sx * 8.5, 6, 0), marble)); parts.push(paint(box(3.4, 1, 3.4, sx * 8.5, 0.5, 0), vein)); parts.push(paint(box(3.4, 1, 3.4, sx * 8.5, 11.6, 0), vein)); }
  parts.push(paint(box(21, 2.2, 4.4, 0, 13.1, 0.3), marble));
  parts.push(paint(box(22, 0.6, 5, 0, 14.5, 0.3), vein));
  parts.push(paint(box(14, 10, 2.5, 0, 6.5, -1.0), dark));
  parts.push(paint(box(24, 0.6, 9, 0, 0.3, 2.5), vein));
  // logs
  for (const [x, rz] of [[-2, 0.15], [2, -0.2], [0, 0.05]]) parts.push(paint(cyl(0.9, 0.9, 7, 8, 0, 0, 0).rotateZ(Math.PI / 2 + rz).translate(x * 0.5, 1.6 + Math.abs(x) * 0.3, 0.4), rgb(0x3a2010)));
  // the mirror, gilt
  parts.push(paint(box(16, 14, 0.4, 0, 23, -1.6), rgb(0x8a8c98)));
  for (const [w, h, x, y] of [[17.4, 1.2, 0, 30.4], [17.4, 1.2, 0, 15.6], [1.2, 15.6, -8.4, 23], [1.2, 15.6, 8.4, 23]]) parts.push(paint(box(w, h, 1, x, y, -1.2), gold));
  parts.push(paint(sph(1.6, 1.4, 1, 0.6, 0, 31.6, -1.2, 10, 8), gold));
  // candlesticks and a little clock on the mantel
  for (const sx of [-1, 1]) { parts.push(paint(cyl(0.3, 0.6, 3, 8, sx * 7, 16.3, 0.6), brass)); parts.push(paint(cyl(0.28, 0.28, 2.4, 8, sx * 7, 19, 0.6), rgb(0xfff4e4))); }
  parts.push(paint(box(3, 3.4, 1.6, 0, 16.5, 0.6), gold)); parts.push(paint(cyl(1.1, 1.1, 0.1, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 16.8, 1.45), rgb(0xf4ead0)));
  return merge(parts);
}
// flames: a few tongues, emissive (the flicker is in the scale)
export function flameGeo() {
  const parts = [];
  for (const [x, h, r] of [[-2.2, 4.6, 1.4], [0, 6.4, 1.8], [2.2, 4.2, 1.3], [-1, 3.4, 1.1], [1.2, 3.8, 1.1]]) { const c = new THREE.ConeGeometry(r, h, 10); c.translate(x, h / 2, 0); parts.push(paint(c, h > 5 ? rgb(0xffd060) : rgb(0xff7020))); }
  return merge(parts);
}

// ---------- a candelabrum on the floor: iron, five candles (flames are glows) ----------
export function candelabraGeo() {
  const parts = [], iron = rgb(0x1a1416), wax = rgb(0xfff2e0);
  parts.push(paint(cyl(0.35, 0.55, 15, 8, 0, 7.5, 0), iron));
  parts.push(paint(cyl(2.2, 2.6, 0.6, 12, 0, 0.3, 0), iron));
  for (let k = -2; k <= 2; k++) {
    if (k) parts.push(paint(new THREE.TorusGeometry(Math.abs(k) * 0.9, 0.16, 6, 12, Math.PI).rotateZ(k > 0 ? 0 : Math.PI).translate(k * 0.9, 15 - Math.abs(k) * 0.2, 0), iron));
    parts.push(paint(cyl(0.45, 0.3, 0.5, 8, k * 1.8, 15.2, 0), iron));
    parts.push(paint(cyl(0.3, 0.3, 2.6 + (k % 2) * 0.6, 8, k * 1.8, 16.8 + (k % 2) * 0.3, 0), wax));
  }
  return merge(parts);
}

// ---------- the giant mirror at the drop: an oval in a gilt frame, standing over the road ----------
export function bigMirrorFrameGeo(rx, ry) {
  const parts = [], gold = rgb(0xd8b050), dark = rgb(0x8a6a28);
  const N = 64;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
    parts.push(paint(beam(V(Math.cos(a0) * rx, Math.sin(a0) * ry, 0), V(Math.cos(a1) * rx, Math.sin(a1) * ry, 0), 1.3, 8), gold));
    parts.push(paint(beam(V(Math.cos(a0) * (rx + 1.6), Math.sin(a0) * (ry + 1.6), -0.3), V(Math.cos(a1) * (rx + 1.6), Math.sin(a1) * (ry + 1.6), -0.3), 0.6, 6), dark));
    if (k % 4 === 0) parts.push(paint(sph(1.1, 1, 1, 0.6, Math.cos(a0) * (rx + 2.4), Math.sin(a0) * (ry + 2.4), 0, 8, 6), gold));
  }
  // a crest at the top
  parts.push(paint(sph(2.8, 1.4, 1, 0.6, 0, ry + 3.6, 0, 12, 8), gold));
  for (const sx of [-1, 1]) parts.push(paint(sph(1.6, 1.6, 0.8, 0.5, sx * 4, ry + 2.6, 0, 10, 8), gold));
  return merge(parts);
}
// the glass: her reflection where yours should be (an oval of the portrait sheet)
export function bigMirrorGlassGeo(rx, ry) { const g = new THREE.CircleGeometry(1, 48); g.scale(rx, ry, 1); g.translate(0, 0, -0.1); return g; }
// a shard of it
export function shardGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1.6, 0, -1.1, -0.9, 0, 1.2, -0.7, 0]), 3));
  g.computeVertexNormals();
  // silvered glass: bright at one edge, darker into the back of it
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([0.95, 0.92, 1, 0.55, 0.5, 0.62, 0.7, 0.66, 0.78]), 3));
  return g;
}

// ---------- her bust on a column: made herself eternal ----------
export function bustGeo() {
  const parts = [], marble = rgb(0xf0ece6), vein = rgb(0xd8d2ca);
  parts.push(paint(box(7, 1.2, 7, 0, 0.6, 0), vein));
  parts.push(paint(cyl(2.4, 2.8, 14, 20, 0, 8.2, 0), marble));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; parts.push(paint(box(0.3, 13.6, 0.4, Math.cos(a) * 2.55, 8.2, Math.sin(a) * 2.55).rotateY(-a), vein)); }
  parts.push(paint(box(7.4, 1.4, 7.4, 0, 15.9, 0), vein));
  parts.push(paint(sph(1, 4.2, 2.6, 2.4, 0, 18.2, 0, 20, 12), marble));
  parts.push(paint(cyl(1.0, 1.2, 2.6, 12, 0, 20.8, 0), marble));
  parts.push(paint(sph(1, 1.9, 2.4, 2.1, 0, 23.8, 0.2, 18, 14), marble));
  parts.push(paint(sph(1, 2.1, 1.7, 1.9, 0, 25.2, -0.6, 16, 10), marble));
  parts.push(paint(sph(1, 1.2, 1.2, 1.2, 0, 26.6, -1.6, 12, 8), marble));
  parts.push(paint(sph(1, 0.7, 0.55, 0.4, 0, 22.9, 1.95, 10, 6), rgb(0xe8ded6)));
  return merge(parts);
}

// ---------- the bed for the end: a four-poster, a canopy, him asleep, and her on her pillow ----------
export function bedGeo() {
  const parts = [], wood = rgb(0x3a1a0e), sheet = rgb(0xf2ebe8), duvet = rgb(0x7a1a2e), gold = rgb(0xd0a850), velvet = rgb(0x4a0e1e);
  parts.push(paint(box(30, 4, 38, 0, 3, 0), wood));
  parts.push(paint(box(28.6, 3.6, 36.4, 0, 6.6, 0), sheet));
  // the headboard, tufted, a gilt crest
  parts.push(paint(box(30, 16, 1.6, 0, 12, -19), wood));
  parts.push(paint(box(26, 11, 0.6, 0, 13.5, -18.1), velvet));
  for (let r = 0; r < 3; r++) for (let k = -4; k <= 4; k++) parts.push(paint(sph(0.3, 1, 1, 0.6, k * 2.8 + (r % 2) * 1.4, 10.5 + r * 3, -17.7, 6, 4), gold));
  parts.push(paint(sph(2.4, 1.6, 1, 0.5, 0, 20.4, -19, 12, 8), gold));
  // posts, finials, the canopy rails, drapes tied back at the corners
  for (const x of [-14.2, 14.2]) for (const z of [-18.4, 18.4]) {
    parts.push(paint(cyl(0.7, 0.85, 34, 10, x, 17, z), wood));
    parts.push(paint(sph(1.1, 1, 1, 1, x, 34.6, z, 10, 8), gold));
    const dr = new THREE.CylinderGeometry(1.4, 2.6, 30, 12, 6, true); const dp = dr.attributes.position.array;
    for (let i = 0; i < dp.length; i += 3) { const y = dp[i + 1]; const pinch = 1 - 0.55 * Math.exp(-((y + 4) ** 2) / 8); dp[i] *= pinch; dp[i + 2] *= pinch; }
    dr.computeVertexNormals(); dr.translate(x + (x > 0 ? 0.9 : -0.9), 18.5, z); parts.push(paint(dr, velvet));
    parts.push(paint(new THREE.TorusGeometry(1.0, 0.25, 6, 14).rotateX(Math.PI / 2).translate(x + (x > 0 ? 0.9 : -0.9), 14.5, z), gold));
  }
  for (const z of [-18.4, 18.4]) parts.push(paint(box(30, 1.6, 1, 0, 33.8, z), wood));
  for (const x of [-14.2, 14.2]) parts.push(paint(box(1, 1.6, 38, x, 33.8, 0), wood));
  // the canopy over it, sagging a little
  const cn = new THREE.PlaneGeometry(29, 37, 10, 12); cn.rotateX(Math.PI / 2); const cp = cn.attributes.position.array;
  for (let i = 0; i < cp.length; i += 3) cp[i + 1] = -1.2 * (1 - (cp[i] / 14.5) ** 2) * (1 - (cp[i + 2] / 18.5) ** 2);
  cn.computeVertexNormals(); cn.translate(0, 34.4, 0); parts.push(paint(cn, velvet));
  // pillows: his, and hers
  for (const x of [-7, 7]) parts.push(paint(sph(1, 5.4, 1.7, 3.2, x, 9.7, -14.2, 16, 10), sheet));
  // the duvet over him, the shape of him under it
  const dv = new THREE.PlaneGeometry(30, 28, 30, 28); dv.rotateX(-Math.PI / 2);
  const p = dv.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], z = p[i + 2];
    let y = 9.1 + 0.6 * Math.sin(x * 0.35 + z * 0.2) * Math.sin(z * 0.3) - (Math.abs(x) > 14 ? (Math.abs(x) - 14) * 3 : 0);
    y += 3.0 * Math.exp(-(((x + 6.5) / 4.2) ** 2) - (((z + 2) / 11) ** 2));              // him
    y += 2.6 * Math.exp(-(((x - 6.5) / 4.0) ** 2) - (((z + 4) / 9) ** 2));               // her, tucked in
    p[i + 1] = y;
  }
  dv.computeVertexNormals(); dv.translate(0, 0, 4.8); parts.push(paint(dv, duvet));
  // his head on his pillow (dark hair), her ghost's head on hers, two holes for eyes
  parts.push(paint(sph(2.2, 1.1, 1, 1, -7, 11.6, -12.6, 14, 10), rgb(0x2a1a12)));
  parts.push(paint(sph(2.5, 1, 1.15, 1, 7, 12.0, -12.4, 16, 12), rgb(0xf0f0fa)));
  for (const sx of [-1, 1]) parts.push(paint(sph(1, 0.38, 0.55, 0.2, 7 + sx * 0.8, 12.6, -10.2, 10, 6), rgb(0x0a0610)));
  return merge(parts);
}
// rose petals strewn on it and round it
export function petalsGeo(n = 160, spread = 22, seed = 3) {
  const parts = [], R = seeded(seed), reds = [rgb(0xc0102a), rgb(0xe02a4a), rgb(0x8a0a1a)];
  for (let k = 0; k < n; k++) { const g = sph(0.55, 1, 0.12, 0.7, (R() - 0.5) * 2 * spread, R() * 0.1, (R() - 0.5) * 2 * spread * 0.8, 6, 3); g.rotateY(R() * 6.28); parts.push(paint(g, reds[k % 3])); }
  return merge(parts);
}
// a nightstand with a lamp (the light he leaves on): the shade is its own layer
export function standLampGeo() {
  const parts = [], wood = rgb(0x3a1a0e), brass = rgb(0xd8b060);
  parts.push(paint(box(9, 10, 7.5, 0, 5, 0), wood)); parts.push(paint(box(9.6, 0.6, 8.2, 0, 10.3, 0), wood));
  for (const y of [3.2, 7]) parts.push(paint(sph(0.4, 1, 1, 0.6, 0, y, 3.8, 8, 6), brass));
  parts.push(paint(sph(1.6, 1, 1.2, 1, 0, 12.4, 0, 12, 8), brass)); parts.push(paint(cyl(0.25, 0.25, 4, 8, 0, 15, 0), brass));
  return merge(parts);
}
export function shadeGeo() { const g = new THREE.CylinderGeometry(2.4, 4.0, 4.4, 24, 1, true); g.translate(0, 18.4, 0); return g; }
// a tall window in the wall with the moon in it and the curtains drawn back
export function windowGeo() {
  const parts = [], frame = rgb(0xe8e0d0), drape = rgb(0x5a0e22), gold = rgb(0xd0a850);
  for (const [w, h, x, y] of [[13, 1, 0, 0.5], [13, 1, 0, 26], [1, 26, -6, 13], [1, 26, 6, 13], [11, 0.5, 0, 13]]) parts.push(paint(box(w, h, 0.6, x, y, 0.3), frame));
  parts.push(paint(sph(6.5, 1, 0.5, 0.1, 0, 26.2, 0.3, 16, 8), frame));
  for (const sx of [-1, 1]) {
    const d = new THREE.CylinderGeometry(1.4, 3.2, 28, 12, 6, true); const dp = d.attributes.position.array;
    for (let i = 0; i < dp.length; i += 3) { const y = dp[i + 1]; const pinch = 1 - 0.6 * Math.exp(-((y + 3) ** 2) / 6); dp[i] *= pinch; dp[i + 2] *= pinch * 0.5; }
    d.computeVertexNormals(); d.translate(sx * 8, 14, 1); parts.push(paint(d, drape));
    parts.push(paint(new THREE.TorusGeometry(1.2, 0.25, 6, 12).translate(sx * 8, 11, 1.6), gold));
  }
  parts.push(paint(box(20, 1.2, 1.2, 0, 28.6, 1), gold));
  return merge(parts);
}
export function moonGlassGeo() { const g = new THREE.PlaneGeometry(11, 25); g.translate(0, 13, 0.1); return g; }
