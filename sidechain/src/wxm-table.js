// White Christmas: the dinner, and we are small on the table. Everybody's place set: the plates, the
// glasses, the candles going; dad's beer cans going up in a pyramid, one a beat; mom's paper crown out
// of a cracker by her glass of water; the kid's booster seat and his crayons; grandma's ham, as dry as
// her advice, her reading glasses and her tea; a phone with the photo the cousins posted (him cropped
// out but for his sleeve); the cracker that pops. Later: the clock that runs while he talks, the
// glass he raises for the eleven-minute toast, Biscuit's photograph and his bowl, the plate of
// cookies going one a beat, and the decorative orange with a bite out of it. The chairs stand round
// the table's edge, their backs above it.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, clamp, smooth, merge, box, cyl, sph, lathe, tor, rod, canvasTex, VCm, pic, tintLit, onFloor } from './wxm-lib.js';
import { TABLE } from './wxm-room.js';

const WHITE = rgb(0xf4f2ec), SILVER = rgb(0xc8ccd4), GOLD = rgb(0xd8b048), RED = rgb(0xb8141c), GREEN = rgb(0x1a5a30), WOOD = rgb(0x8a5a34), DARKWOOD = rgb(0x4a2a16), GLASS = rgb(0xd8e8f0);
const CANDLE = [1, 0.72, 0.38], WARM = [1, 0.8, 0.55];

// ---------- pictures ----------
// the photo the cousins posted: everybody in front of the tree, and at the very edge, his sleeve
function croppedTexture() {
  return canvasTex(256, 480, (g, W, H) => {
    g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, W, H);
    const P = { x: 14, y: 70, w: W - 28, h: H - 140 };
    const bg = g.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#5a3a2a'); bg.addColorStop(1, '#2a1a14'); g.fillStyle = bg; g.fillRect(P.x, P.y, P.w, P.h);
    // the tree behind them, its lights
    g.fillStyle = '#1a4a2a'; g.beginPath(); g.moveTo(P.x + 40, P.y + 20); g.lineTo(P.x + 92, P.y + 230); g.lineTo(P.x - 10, P.y + 230); g.fill();
    const R = seeded(8); for (let k = 0; k < 18; k++) { g.fillStyle = ['#ff4040', '#40ff70', '#4080ff', '#ffd040'][k % 4]; g.beginPath(); g.arc(P.x + 10 + R() * 60, P.y + 60 + R() * 160, 3, 0, 7); g.fill(); }
    // five of them, close together, smiling
    const people = [[60, '#c8b098', '#3a5aa8'], [100, '#e8c0a0', '#a82a3a'], [140, '#d8b090', '#2a6a3a'], [178, '#f0c8b0', '#6a3a8a'], [212, '#c8a080', '#8a6a2a']];
    for (const [x, sk, sh] of people) { g.fillStyle = sh; g.beginPath(); g.ellipse(P.x + x, P.y + 300, 26, 60, 0, 0, 7); g.fill(); g.fillStyle = sk; g.beginPath(); g.arc(P.x + x, P.y + 222, 17, 0, 7); g.fill(); g.strokeStyle = '#3a1a1a'; g.lineWidth = 2; g.beginPath(); g.arc(P.x + x, P.y + 226, 7, 0.2, Math.PI - 0.2); g.stroke(); }
    // ... and at the edge, a red sleeve and a hand: him, cropped
    g.fillStyle = '#b8141c'; g.fillRect(P.x + P.w - 14, P.y + 250, 14, 70); g.fillStyle = '#e0b090'; g.beginPath(); g.ellipse(P.x + P.w - 6, P.y + 322, 8, 11, 0, 0, 7); g.fill();
    // the post round it
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, W, 64); g.fillRect(0, H - 70, W, 70);
    g.fillStyle = '#c8c8cc'; g.beginPath(); g.arc(36, 32, 18, 0, 7); g.fill(); g.fillStyle = '#9a9aa0'; g.fillRect(64, 22, 120, 9); g.fillRect(64, 36, 70, 7);
    g.fillStyle = '#e83a5a'; g.font = 'bold 34px Arial'; g.fillText('♥', 18, H - 24); g.fillStyle = '#9a9aa0'; g.fillRect(64, H - 44, 150, 9);
  });
}
// Biscuit, in his frame: a scruffy little dog in a Christmas bandana
function biscuitTexture() {
  return canvasTex(320, 400, (g, W, H) => {
    const bg = g.createRadialGradient(160, 180, 20, 160, 200, 260); bg.addColorStop(0, '#d8c8a8'); bg.addColorStop(1, '#6a5a48'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#9a6a3a'; g.beginPath(); g.ellipse(160, 330, 120, 90, 0, 0, 7); g.fill();
    g.fillStyle = '#b8864a'; g.beginPath(); g.ellipse(160, 190, 92, 86, 0, 0, 7); g.fill();
    g.fillStyle = '#7a4a24'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(160 + s * 82, 200, 30, 62, s * 0.3, 0, 7); g.fill(); }
    g.fillStyle = '#e8d8b8'; g.beginPath(); g.ellipse(160, 228, 48, 38, 0, 0, 7); g.fill();
    g.fillStyle = '#1a1210'; g.beginPath(); g.ellipse(160, 210, 16, 11, 0, 0, 7); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(160 + s * 36, 168, 10, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(163 + s * 36, 165, 3, 0, 7); g.fill(); g.fillStyle = '#1a1210'; }
    g.strokeStyle = '#3a1a14'; g.lineWidth = 3; g.beginPath(); g.moveTo(160, 222); g.lineTo(160, 236); g.arc(150, 236, 10, 0, Math.PI * 0.8); g.moveTo(160, 236); g.arc(170, 236, 10, Math.PI, Math.PI * 0.2, true); g.stroke();
    g.fillStyle = '#c8141c'; g.beginPath(); g.moveTo(90, 268); g.lineTo(230, 268); g.lineTo(160, 330); g.fill();
    g.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(112 + k * 24, 280, 4, 0, 7); g.fill(); }
  });
}
// his name on the bowl
function bowlTexture() {
  return canvasTex(512, 96, (g, W, H) => { g.fillStyle = '#c8141c'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.font = 'bold 64px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BISCUIT', W / 2, H / 2 + 4); });
}
// the clock's face
function clockTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#2a1e14'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
    g.fillStyle = '#2a1e14'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const N = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    N.forEach((n, i) => { const a = i / 12 * Math.PI * 2; g.save(); g.translate(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.rotate(a); g.fillText(n, 0, 0); g.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 110 - 1, 128 - Math.cos(a) * 110 - 1, 2, i % 5 ? 2 : 6); }
  });
}
// the kid's placemat: a snowman in crayon
function placematTexture() {
  return canvasTex(384, 256, (g, W, H) => {
    g.fillStyle = '#f8f6f0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a8a3a'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16);
    g.lineWidth = 6; g.strokeStyle = '#3a5ac8';
    for (const [x, y, r] of [[190, 190, 50], [190, 110, 36], [190, 56, 24]]) { g.beginPath(); g.arc(x + Math.sin(y) * 3, y, r, 0, 7); g.stroke(); }
    g.strokeStyle = '#e83a2a'; g.beginPath(); g.moveTo(160, 82); g.lineTo(222, 86); g.stroke();
    g.fillStyle = '#ff8a1a'; g.beginPath(); g.moveTo(192, 58); g.lineTo(225, 62); g.lineTo(192, 66); g.fill();
    g.strokeStyle = '#7a4a2a'; g.beginPath(); g.moveTo(155, 110); g.lineTo(100, 80); g.moveTo(225, 110); g.lineTo(290, 70); g.stroke();
    g.fillStyle = '#e8c83a'; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(40 + k * 50 + Math.sin(k) * 10, 30 + (k % 2) * 12, 6, 0, 7); g.fill(); }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { cropped: croppedTexture(), biscuit: biscuitTexture(), bowl: bowlTexture(), clock: clockTexture(), placemat: placematTexture() });

// a candle's flame: a billboard that holds its own shape, never adds up to white
export function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aK; attribute float aSeed; varying vec2 vUv; varying float vK; varying float vSeed; void main(){ vUv = uv; vK = aK; vSeed = aSeed; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); c.xy += position.xy * vec2(sx, sy); gl_Position = projectionMatrix * c; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vK; varying float vSeed;
      void main(){
        vec2 q = vUv; float t = uTime * 7.0 + vSeed * 10.0;
        float sway = sin(t) * 0.04 + sin(t * 2.3) * 0.02;
        float w = 0.32 * (1.0 - q.y) * smoothstep(0.0, 0.25, q.y) + 0.02;
        float shape = smoothstep(w, w * 0.4, abs(q.x - 0.5 - sway * q.y * 2.0)) * smoothstep(1.0, 0.7, q.y);
        vec3 c = mix(vec3(1.0, 0.98, 0.8), vec3(1.0, 0.62, 0.18), smoothstep(0.15, 0.75, q.y));
        c = mix(vec3(0.35, 0.45, 1.0), c, smoothstep(0.02, 0.14, q.y));
        gl_FragColor = vec4(c * 1.4, clamp(shape * vK * 1.4, 0.0, 1.0));
      }`,
    depthWrite: false, transparent: true,
  });
}

// ---------- the things ----------
function crownGeometry() {
  // a paper crown: a band with points, open at the top
  const n = 14, H = 3.2, P = 1.8, R = 4.2, pos = [], idx = [];
  for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, top = i % 2 ? H + P : H; pos.push(Math.cos(a) * R, 0, Math.sin(a) * R, Math.cos(a) * R, top, Math.sin(a) * R); }
  for (let i = 0; i < n * 2; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return paint(g.toNonIndexed(), [1, 1, 1]);
}
function cookieShape(kind) {
  const s = new THREE.Shape();
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 1.5 : 3.4; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  else if (kind === 'tree') { s.moveTo(0, 3.6); s.lineTo(1.6, 1.4); s.lineTo(0.9, 1.4); s.lineTo(2.4, -1.2); s.lineTo(0.6, -1.2); s.lineTo(0.6, -2.4); s.lineTo(-0.6, -2.4); s.lineTo(-0.6, -1.2); s.lineTo(-2.4, -1.2); s.lineTo(-0.9, 1.4); s.lineTo(-1.6, 1.4); s.closePath(); }
  else { s.absarc(0, 0, 2.8, 0, Math.PI * 2, false); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}
const TB = {
  // a place: the plate with dinner on it, the cutlery, a red napkin, the glass
  setting() {
    const parts = [paint(lathe([[0, 0], [5.2, 0], [6.6, 0.5], [7.4, 0.9], [7.4, 1.0], [0, 0.4]], 36), WHITE), paint(tor(7.0, 0.16, 0, 0.95, 0, 48, 4).rotateX(Math.PI / 2), RED), paint(tor(6.2, 0.08, 0, 0.75, 0, 48, 4).rotateX(Math.PI / 2), GOLD)];
    parts.push(paint(box(4.6, 0.8, 3.2, -1.2, 1.0, -1.2).rotateY(0.3), rgb(0xd88a7a)), paint(sph(1.8, 1, 0.6, 1, 2.2, 1.0, 1.0), rgb(0xf4ecd8)));
    const R = seeded(2); for (let k = 0; k < 9; k++) parts.push(paint(cyl(0.22, 0.22, 2.4, 5, -2 + R() * 3, 0.9, 2.4 + R() * 1.4).rotateZ(Math.PI / 2 + R() * 0.3).translate(0, 0, 0), rgb(0x3a7a2a)));
    parts.push(paint(sph(1.0, 1, 0.5, 1, 1.8, 1.0, -2.6, 10, 6), rgb(0x9a0a1a)));
    parts.push(paint(box(0.7, 0.25, 9, -9, 0.15, 0), SILVER), paint(box(0.7, 0.25, 9, -10.3, 0.15, 0), SILVER), paint(box(0.7, 0.25, 9, 9, 0.15, 0), SILVER));
    parts.push(paint(box(4, 0.6, 6, -11.6, 0.3, 4).rotateY(0.2), RED));
    return merge(parts);
  },
  glass() { return paint(lathe([[0, 0], [2.6, 0], [2.6, 0.3], [0.35, 0.6], [0.3, 5.6], [1.6, 6.6], [2.6, 8.6], [2.8, 11.6], [2.65, 11.6], [2.45, 8.8], [0, 7.2]], 24), GLASS); },
  wine() { return paint(lathe([[0, 7.3], [2.3, 8.7], [2.55, 10.2], [0, 10.2]], 24), rgb(0x7a0a1a)); },
  // dad's beer, one can
  can() { return merge([paint(cyl(1.15, 1.15, 3.8, 16, 0, 1.9, 0), rgb(0xb8bcc4)), paint(cyl(1.17, 1.17, 1.6, 16, 0, 2.0, 0), rgb(0x1a3a8a)), paint(cyl(1.18, 1.18, 0.5, 16, 0, 2.0, 0), RED), paint(cyl(0.9, 1.15, 0.3, 16, 0, 3.95, 0), SILVER)]); },
  // a cracker's paper crown, its colour per instance
  crown() { return crownGeometry(); },
  water() { return merge([paint(lathe([[0, 0], [2.2, 0], [2.4, 9], [2.25, 9], [2.05, 0.4], [0, 0.4]], 24), GLASS), paint(lathe([[0, 0.4], [2.05, 0.4], [2.2, 7], [0, 7]], 24), rgb(0xd8f0ff)), paint(box(1.6, 0.9, 0.3, 1.6, 8.8, 0).rotateZ(-0.6), rgb(0xf0e040))]); },
  // the kid's place: the booster seat on his chair (the chair is its own), a sippy cup, crayons
  kid() {
    const parts = [paint(lathe([[0, 0], [2.0, 0], [2.2, 6], [1.6, 7], [0, 7.2]], 18), rgb(0x3a8ae8)), paint(cyl(1.0, 1.4, 1.4, 14, 0, 7.6, 0), rgb(0xf0f0f0))];
    for (const s of [-1, 1]) parts.push(paint(tor(1.0, 0.3, s * 2.6, 3.6, 0, 12, 6, Math.PI).rotateY(s > 0 ? 0 : Math.PI).translate(0, 0, 0), rgb(0x3a8ae8)));
    const R = seeded(5); for (let k = 0; k < 6; k++) parts.push(paint(cyl(0.35, 0.35, 4.2, 6, 0, 0, 0).rotateZ(Math.PI / 2).rotateY(R() * 3).translate(5 + R() * 6, 0.4, -3 + R() * 6), rgb([0xe83a2a, 0x3a5ac8, 0x2a9a3a, 0xf0c020, 0x9a3ab8, 0xff8a1a][k])));
    return merge(parts);
  },
  placemat() { const g = new THREE.PlaneGeometry(14, 9.4); g.rotateX(-Math.PI / 2); g.translate(9, 0.12, 0); return g; },
  booster() { return merge([paint(box(14, 5, 12, 0, 2.5, 0), rgb(0xe83a5a)), paint(box(14, 10, 2, 0, 7, -5), rgb(0xe83a5a)), paint(box(2, 6, 12, -7, 5, 0), rgb(0xe83a5a)), paint(box(2, 6, 12, 7, 5, 0), rgb(0xe83a5a))]); },
  // grandma's ham on its platter: scored, the pineapple rings, a cherry in each, the knife and fork in it
  ham() {
    const parts = [paint(lathe([[0, 0], [9, 0], [12.4, 0.9], [13, 1.4], [0, 1]], 36).scale(1, 1, 0.72), WHITE), paint(tor(12.2, 0.3, 0, 1.3, 0, 48, 4).rotateX(Math.PI / 2).scale(1, 1, 0.72), GOLD)];
    const ham = sph(7.6, 1.2, 0.8, 0.95, 0, 5, 0, 28, 18); const P = ham.attributes.position, n = P.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const sc = Math.abs(((x + y * 0.8) / 1.7) % 1) < 0.12 || Math.abs(((z + y * 0.8) / 1.7) % 1) < 0.12; c.set(sc ? [0.42, 0.16, 0.08] : [0.72, 0.36, 0.16], i * 3); }
    ham.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(ham);
    parts.push(paint(cyl(2.4, 2.4, 2.6, 16, 0, 1.6, 0).scale(1, 1, 0.8).translate(9.6, 0, 0), rgb(0xf4e4d8)));
    for (const [x, z] of [[-4, 5.6], [0, 6.6], [4.2, 5.4], [-6.8, 2.6], [6.8, 2.2], [-2, 3], [2.4, 2.6]]) {
      const y = 5 + 6.0 * Math.sqrt(Math.max(0, 1 - (x / 9.1) ** 2 - (z / 7.2) ** 2)) * 0.6;
      parts.push(paint(tor(1.5, 0.55, x, y, z, 14, 6).rotateX(0).translate(0, 0, 0), rgb(0xf0d040)), paint(sph(0.6, 1, 1, 1, x, y, z + 0.2, 8, 6), rgb(0xd80a2a)));
    }
    parts.push(paint(box(0.4, 9, 1.6, 2, 13, 0).rotateZ(0.3), SILVER), paint(box(0.8, 5, 0.8, 0.3, 17.2, 0).rotateZ(0.3), DARKWOOD));
    parts.push(paint(box(0.3, 8, 0.3, -3, 12.4, 0.5).rotateZ(-0.25), SILVER), paint(box(0.7, 4.4, 0.7, -1.9, 16.2, 0.5).rotateZ(-0.25), DARKWOOD));
    return merge(parts);
  },
  // the phone the cousins took it with, propped up, the post on its screen
  phone() { return merge([paint(box(8.4, 16.4, 0.9, 0, 8.4, 0).rotateX(-0.2), rgb(0x1a1a1e)), paint(box(10, 3, 5, 0, 0.6, 1.6), rgb(0x3a3a40))]); },
  phoneScreen() { const g = new THREE.PlaneGeometry(7.6, 15.4); g.translate(0, 8.4, 0.47); g.rotateX(-0.2); return g; },
  // two crackers: one whole, one pulled (its halves are drawn apart per frame)
  cracker() {
    const tube = (c) => merge([paint(cyl(1.2, 1.2, 7, 16).rotateZ(Math.PI / 2), c), paint(cyl(0.7, 1.2, 1.2, 16, 4.1, 0, 0).rotateZ(Math.PI / 2).translate(0, 0, 0), c), paint(cyl(1.4, 0.7, 2.2, 16, 5.8, 0, 0).rotateZ(Math.PI / 2).translate(0, 0, 0), c), paint(cyl(0.7, 1.2, 1.2, 16, -4.1, 0, 0).rotateZ(Math.PI / 2), c), paint(cyl(1.4, 0.7, 2.2, 16, -5.8, 0, 0).rotateZ(Math.PI / 2), c), paint(tor(1.25, 0.2, 0, 0, 0, 16, 4).rotateY(Math.PI / 2), GOLD)]);
    return tube(rgb(0xc8141c)).translate(0, 1.2, 0);
  },
  crackerHalf() { return merge([paint(cyl(1.2, 1.2, 3.5, 16, 0, 1.75, 0).rotateZ(Math.PI / 2), rgb(0x1a6a34)), paint(cyl(1.4, 0.7, 2.2, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(4.6, 0, 0), rgb(0x1a6a34)), paint(tor(1.25, 0.2, 2, 0, 0, 16, 4).rotateY(Math.PI / 2), GOLD)]).translate(0, 1.2, 0); },
  // a chair at the table's edge: its legs on the carpet far below, its back above the table
  chair() {
    const D = TABLE.drop, parts = [paint(box(14, 1.6, 13, 0, -D * 0.4, 0), WOOD)];
    for (const [x, z] of [[-6, -5.5], [6, -5.5], [-6, 5.5], [6, 5.5]]) parts.push(paint(cyl(0.7, 0.55, D * 0.6, 8, x, -D * 0.7, z), WOOD));
    for (const x of [-6.2, 6.2]) parts.push(paint(box(1.4, 30, 1.4, x, -D * 0.4 + 15, -6), WOOD));
    parts.push(paint(box(14, 3.2, 1.4, 0, -D * 0.4 + 29, -6), WOOD), paint(lathe([[0, 0], [6.6, 0], [6.6, 1.4], [0, 3.2]], 4).rotateY(Math.PI / 4).scale(1.4, 1, 0.25).translate(0, -D * 0.4 + 30.4, -6), WOOD));
    for (const x of [-3, 0, 3]) parts.push(paint(box(1.2, 22, 0.9, x, -D * 0.4 + 16, -6), WOOD));
    parts.push(paint(box(13, 0.8, 11.6, 0, -D * 0.4 + 1.2, 0.4), rgb(0x7a1a22)));
    return merge(parts);
  },
  cardigan() { return merge([paint(box(13, 16, 2.4, 0, -10 + 30 - TABLE.drop * 0.4 - 3, -7.4), rgb(0xa8b8a0)), paint(box(3.4, 14, 2.2, -8, 30 - TABLE.drop * 0.4 - 12, -6.6).rotateZ(0.12), rgb(0xa8b8a0)), paint(box(3.4, 14, 2.2, 8, 30 - TABLE.drop * 0.4 - 12, -6.6).rotateZ(-0.12), rgb(0xa8b8a0))]); },
  napkinThrown() { return paint(box(9, 0.5, 7, 1, -TABLE.drop * 0.4 + 2.2, 1.6).rotateY(0.6).rotateZ(0.1), RED); },
  // the candlesticks, a red taper in each (the flames are their own)
  candles() { const parts = []; for (const x of [-4, 4]) { parts.push(paint(lathe([[0, 0], [2.4, 0], [2.4, 0.6], [0.8, 1.6], [0.6, 7], [1.4, 8], [1.6, 8.6], [0, 8.6]], 18).translate(x, 0, 0), GOLD), paint(cyl(0.75, 0.75, 13, 12, x, 15, 0), rgb(0xc8141c)), paint(box(0.12, 0.8, 0.12, x, 21.9, 0), rgb(0x1a1a1a))); } return merge(parts); },
  // the mantel clock (its hands are their own)
  clock() { return merge([paint(box(13, 16, 6, 0, 8, 0), DARKWOOD), paint(lathe([[0, 0], [6.6, 0], [6.6, 1], [0, 4.2]], 4).rotateY(Math.PI / 4).scale(1.4, 1, 0.65).translate(0, 16, 0), DARKWOOD), paint(tor(5.2, 0.5, 0, 9.6, 3.05, 36, 6), GOLD), paint(box(13.6, 1.2, 6.6, 0, 0.6, 0), GOLD)]); },
  clockFace() { const g = new THREE.CircleGeometry(5.0, 40); g.translate(0, 9.6, 3.06); return g; },
  hand() { return paint(box(0.5, 1, 0.2, 0, 0.5, 0), rgb(0x1a1210)); },
  // the flute he raises
  flute() { return merge([paint(lathe([[0, 0], [2.2, 0], [2.2, 0.3], [0.3, 0.6], [0.25, 7], [1.2, 8], [1.6, 15], [1.45, 15], [1.0, 8.4], [0, 8.2]], 20), GLASS), paint(lathe([[0, 8.3], [1.0, 8.5], [1.4, 13.8], [0, 13.8]], 20), rgb(0xf0d070))]); },
  // Biscuit's photograph in its frame, his bowl (with his name)
  biscuit() { return merge([paint(box(13, 16, 1.2, 0, 9.4, 0).rotateX(-0.12), GOLD), paint(box(2, 7, 2, 0, 3.5, -3.6).rotateX(0.5), GOLD), paint(lathe([[0, 0], [4.6, 0], [5.2, 2.6], [4.8, 2.6], [4.2, 0.6], [0, 0.6]], 28).translate(13, 0, 2), rgb(0xc8141c))]); },
  biscuitPhoto() { const g = new THREE.PlaneGeometry(11, 13.8); g.translate(0, 9.6, 0.62); g.rotateX(-0.12); return g; },
  bowlName() { const g = new THREE.PlaneGeometry(8.6, 1.6); g.rotateX(-0.22); g.translate(13, 1.4, 6.95); return g; },
  // the cookie plate, and the cookies (their own: they go one at a time)
  // (raised on a glass cake stand: flat on the cloth it can't be seen)
  cookiePlate() { return merge([paint(lathe([[0, 0], [4.4, 0], [4.4, 0.6], [1.2, 1.4], [0.9, 6.6], [1.6, 7.2], [0, 7.4]], 24), GLASS), paint(lathe([[0, 7.2], [7, 7.2], [9.6, 8.0], [9.8, 8.2], [0, 7.8]], 36), rgb(0xe8f0f8)), paint(tor(9.2, 0.25, 0, 8.15, 0, 40, 4).rotateX(Math.PI / 2), GREEN)]); },
  cookieStar() { return paint(cookieShape('star'), rgb(0xf0e0b8)); },
  cookieTree() { return paint(cookieShape('tree'), rgb(0x3a9a4a)); },
  cookieRound() { return paint(cookieShape('round'), rgb(0x9a5a2a)); },
  // the decorative orange: studded with cloves, a red ribbon round it (the bite is its own)
  orange() {
    const g = sph(4.4, 1, 1, 1, 0, 4.4, 0, 28, 20); const P = g.attributes.position, n = P.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i) - 4.4, z = P.getZ(i); const a = Math.atan2(z, x), b = Math.acos(clamp(y / 4.4, -1, 1)); const clove = Math.sin(a * 9) > 0.75 && Math.sin(b * 9) > 0.75; c.set(clove ? [0.22, 0.12, 0.06] : [0.98, 0.5, 0.06], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return merge([g, paint(tor(4.5, 0.4, 0, 4.4, 0, 36, 6), rgb(0xb8141c)), paint(tor(4.5, 0.4, 0, 4.4, 0, 36, 6).rotateY(Math.PI / 2).rotateX(Math.PI / 2).translate(0, 4.4, -4.4), rgb(0xb8141c)), paint(sph(1, 1.4, 0.7, 0.6, -0.9, 9.2, 0, 8, 6), rgb(0xb8141c)), paint(sph(1, 1.4, 0.7, 0.6, 0.9, 9.2, 0, 8, 6), rgb(0xb8141c))]);
  },
  bite() { return paint(sph(2.1, 1, 1.15, 0.5, 3.0, 5.4, 2.6, 14, 10).rotateY(0), rgb(0xf8c870)); },
  // grandma's place: her reading glasses folded by her tea
  granny() {
    const parts = [paint(lathe([[0, 0], [5, 0], [6.4, 0.6], [6.4, 0.8], [0, 0.4]], 28), WHITE), paint(lathe([[0, 0.5], [2.2, 0.5], [3.2, 2.2], [3.6, 5.2], [3.4, 5.2], [3.0, 2.4], [0, 1.0]], 24).translate(0, 0, 0), WHITE), paint(lathe([[0, 1.0], [3.0, 2.4], [3.3, 4.6], [0, 4.6]], 24), rgb(0x9a5a2a)), paint(tor(1.4, 0.35, 3.8, 3.2, 0, 12, 6, Math.PI).rotateZ(-Math.PI / 2).translate(0, 0, 0), WHITE)];
    for (const x of [-1.6, 1.6]) parts.push(paint(tor(1.3, 0.16, x + 10, 0.5, 2, 18, 4).rotateX(-Math.PI / 2 + 0.2), GOLD));
    parts.push(paint(box(0.9, 0.2, 0.2, 10, 0.7, 2), GOLD), paint(box(0.2, 0.2, 5.4, 7.4, 0.4, -0.6), GOLD), paint(box(0.2, 0.2, 5.4, 12.6, 0.4, -0.6), GOLD));
    return merge(parts);
  },
};

const VV = { aTint: null, aK: 1 };
const CK = ['_wxck0', '_wxck1', '_wxck2'], COOKIES = ['wxmCookieStar', 'wxmCookieTree', 'wxmCookieRound'];
const FV = { aK: 1, aSeed: 0 };

extend({
  layers: {
    wxmSetting: (M) => [TB.setting(), VCm(M, 'wxmSettingM', 0.3, { roughness: 0.35 }), 30, {}],
    wxmGlass: (M) => [TB.glass(), VCm(M, 'wxmGlassM', 0.45, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }), 30, {}],
    wxmWine: (M) => [TB.wine(), VCm(M, 'wxmWineM', 0.4, { roughness: 0.2 }), 30, {}],
    wxmCan: (M) => [TB.can(), VCm(M, 'wxmCanM', 0.35, { roughness: 0.3, metalness: 0.5 }), 70, {}],
    wxmCrown: (M) => [TB.crown(), M.wxmCrownM || (M.wxmCrownM = tintLit(0.5, 0, { roughness: 0.6, side: THREE.DoubleSide })), 8, { aTint: 3, aK: 1 }],
    wxmWater: (M) => [TB.water(), VCm(M, 'wxmWaterM', 0.5, { roughness: 0.1 }), 6, {}],
    wxmKid: (M) => [TB.kid(), VCm(M, 'wxmKidM', 0.35, { roughness: 0.4 }), 4, {}],
    wxmPlacemat: (M) => [TB.placemat(), pic(M, 'wxmPlacematM', tex().placemat, 0.45), 4, {}],
    wxmBooster: (M) => [TB.booster(), VCm(M, 'wxmBoosterM', 0.3, { roughness: 0.5 }), 4, {}],
    wxmHam: (M) => [TB.ham(), VCm(M, 'wxmHamM', 0.3, { roughness: 0.45 }), 4, {}],
    wxmPhone: (M) => [TB.phone(), VCm(M, 'wxmPhoneM', 0.2, { roughness: 0.3 }), 4, {}],
    wxmPhoneScreen: (M) => [TB.phoneScreen(), pic(M, 'wxmPhoneScreenM', tex().cropped, 1.15), 4, {}],
    wxmCracker: (M) => [TB.cracker(), VCm(M, 'wxmCrackerM', 0.4, { roughness: 0.25, metalness: 0.4 }), 8, {}],
    wxmCrackerHalf: (M) => [TB.crackerHalf(), VCm(M, 'wxmCrackerHalfM', 0.4, { roughness: 0.25, metalness: 0.4 }), 8, {}],
    wxmChair: (M) => [TB.chair(), VCm(M, 'wxmChairM', 0.32, { roughness: 0.6 }), 40, {}],
    wxmCardigan: (M) => [TB.cardigan(), VCm(M, 'wxmCardiganM', 0.25, { roughness: 0.95 }), 4, {}],
    wxmNapkin: (M) => [TB.napkinThrown(), VCm(M, 'wxmNapkinM', 0.3, { roughness: 0.9 }), 4, {}],
    wxmCandles: (M) => [TB.candles(), VCm(M, 'wxmCandlesM', 0.35, { roughness: 0.3, metalness: 0.4 }), 20, {}],
    wxmFlame: (M) => [new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), M.wxmFlameM || (M.wxmFlameM = flameMaterial()), 50, { aK: 1, aSeed: 1 }],
    wxmClock: (M) => [TB.clock(), VCm(M, 'wxmClockM', 0.25, { roughness: 0.4 }), 4, {}],
    wxmClockFace: (M) => [TB.clockFace(), pic(M, 'wxmClockFaceM', tex().clock, 0.6), 4, {}],
    wxmHand: (M) => [TB.hand(), VCm(M, 'wxmHandM', 0.1, { roughness: 0.5 }), 8, {}],
    wxmFlute: (M) => [TB.flute(), VCm(M, 'wxmFluteM', 0.55, { roughness: 0.1, transparent: true, opacity: 0.8 }), 4, {}],
    wxmBiscuit: (M) => [TB.biscuit(), VCm(M, 'wxmBiscuitM', 0.35, { roughness: 0.35, metalness: 0.3 }), 4, {}],
    wxmBiscuitPhoto: (M) => [TB.biscuitPhoto(), pic(M, 'wxmBiscuitPhotoM', tex().biscuit, 0.6), 4, {}],
    wxmBowlName: (M) => [TB.bowlName(), pic(M, 'wxmBowlNameM', tex().bowl, 0.6), 4, {}],
    wxmCookiePlate: (M) => [TB.cookiePlate(), VCm(M, 'wxmCookiePlateM', 0.35, { roughness: 0.3 }), 4, {}],
    wxmCookieStar: (M) => [TB.cookieStar(), VCm(M, 'wxmCookieStarM', 0.35, { roughness: 0.7 }), 8, {}],
    wxmCookieTree: (M) => [TB.cookieTree(), VCm(M, 'wxmCookieTreeM', 0.35, { roughness: 0.7 }), 8, {}],
    wxmCookieRound: (M) => [TB.cookieRound(), VCm(M, 'wxmCookieRoundM', 0.35, { roughness: 0.7 }), 8, {}],
    wxmOrange: (M) => [TB.orange(), VCm(M, 'wxmOrangeM', 0.4, { roughness: 0.6 }), 4, {}],
    wxmBite: (M) => [TB.bite(), VCm(M, 'wxmBiteM', 0.5, { roughness: 0.8 }), 4, {}],
    wxmGranny: (M) => [TB.granny(), VCm(M, 'wxmGrannyM', 0.35, { roughness: 0.3 }), 4, {}],
  },
  parts: {
    wxmTableProp(S, it, p, q, yaw) {
      const L = S.layers;
      for (const k of ['wxmSetting', 'wxmGlass', 'wxmWine', 'wxmCan', 'wxmCrown', 'wxmWater', 'wxmKid', 'wxmPlacemat', 'wxmBooster', 'wxmHam', 'wxmPhone', 'wxmPhoneScreen', 'wxmCracker', 'wxmCrackerHalf', 'wxmChair', 'wxmCardigan', 'wxmNapkin', 'wxmCandles', 'wxmFlame', 'wxmClock', 'wxmClockFace', 'wxmHand', 'wxmFlute', 'wxmBiscuit', 'wxmBiscuitPhoto', 'wxmBowlName', 'wxmCookiePlate', 'wxmCookieStar', 'wxmCookieTree', 'wxmCookieRound', 'wxmOrange', 'wxmBite', 'wxmGranny']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._wxt || (S._wxt = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const o = S._o, sv = S._s;
      const put = (layer, x = 0, y = 0, z = 0, qq = q, vals, sc = s) => { const w = local(at, yaw, x * s, y * s, z * s, o); m.compose(w, qq, sv.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 0, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.45, c = WARM, r = 30) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const turn = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const flame = (x, y, z, kk = 1) => { const w = local(at, yaw, x * s, y * s, z * s, o); m.makeScale(1.8 * s, 3.8 * s * kk, 1); m.setPosition(w.x, w.y, w.z); FV.aK = kk; FV.aSeed = it.t + x; L.wxmFlame.add(m, FV); glowAt(S, w.x, w.y + 1.6 * s, w.z, 9 * s, CANDLE, 0.7 * kk); };
      if (k === 'setting') { put('wxmSetting'); put('wxmGlass', 7, 0, -6); put('wxmWine', 7, 0, -6); spot(0.3, WARM, 22); }
      else if (k === 'cans') {
        // dad's cans: one more on the pyramid every beat from 'from' (rows of five, four, three...)
        const c = S.course, b0 = c.beatAt(it.from ?? 0), have = clamp(Math.floor((it.n0 ?? 0) + Math.max(0, c.beatAt(T) - b0) * (it.rate ?? 1)), it.n0 ?? 0, it.n1 ?? 14);
        let n = 0; const rows = it.rows ?? [6, 5, 4, 3, 2, 1];
        for (let r = 0; r < rows.length && n < have; r++) for (let j = 0; j < rows[r] && n < have; j++, n++) put('wxmCan', (j - (rows[r] - 1) / 2) * 2.5, r * 3.95, 0);
        light(8, 26, WARM, 0.12, 2); spot(0.35, WARM, 24);
      }
      else if (k === 'crown') { VV.aTint = it.tint || [0.85, 0.7, 0.2]; put('wxmCrown', 0, 0.2, 0, turn('_wxcq', 0, 0.12, 0.08), VV); put('wxmWater', 9, 0, -2); put('wxmSetting', 0, 0, 10); spot(0.35, WARM, 22); }
      else if (k === 'kid') { put('wxmKid'); put('wxmPlacemat'); spot(0.35, WARM, 24); }
      else if (k === 'ham') { put('wxmHam'); light(8, 30, WARM, 0.12, 0); spot(0.5, WARM, 30); }
      else if (k === 'phone') { put('wxmPhone'); put('wxmPhoneScreen'); light(8.4, 16, [0.9, 0.95, 1], 0.35, 1.4); spot(0.35, [0.85, 0.9, 1], 20); }
      else if (k === 'crackers') {
        put('wxmCracker', -6, 0, 3, turn('_wxkq', 0.4));
        // the other one, pulled: it pops and its halves fly apart
        const pp = it.pop ?? 1e9, d = smooth(pp - 0.05, pp + 0.3, T) * 7;
        const hq = turn('_wxkq2', -0.3); put('wxmCrackerHalf', 4 - d, 0, -2, hq);
        const hq2 = turn('_wxkq3', -0.3 + Math.PI); put('wxmCrackerHalf', 12 + d, 0, -2, hq2);
        if (T > pp - 0.05 && T < pp + 0.5) light(1.6, 14, [1, 0.9, 0.6], 1.6 * (1 - (T - pp + 0.05) / 0.55), -2, 8);
        spot(0.3, WARM, 24);
      }
      else if (k === 'chair') {
        put('wxmChair');
        if (it.cardigan) put('wxmCardigan');
        if (it.napkin) put('wxmNapkin');
        if (it.booster) put('wxmBooster', 0, -TABLE.drop * 0.4 + 2, 0.5);
      }
      else if (k === 'candles') { put('wxmCandles'); for (const x of [-4, 4]) flame(x, 22.1, 0); spot(0.45, CANDLE, 30); }
      else if (k === 'clock') {
        // while he talks the clock runs: the minute hand round and round
        put('wxmClock'); put('wxmClockFace');
        // (how long it's been running, summed over its windows: a turn of the minute hand every 1.3 s)
        let run = 0, ran = 0;
        for (const [a0, a1] of it.fast || []) { run = Math.max(run, smooth(a0, a0 + 0.4, T) * (1 - smooth(a1 - 0.4, a1, T))); ran += clamp(T - a0, 0, a1 - a0); }
        const ph = ran / 1.3 * Math.PI * 2;
        // (or stopped at an hour: 2 a.m.)
        const ma = it.at !== undefined ? (it.at % 1) * Math.PI * 2 : T * 0.02 + ph, ha = it.at !== undefined ? it.at / 12 * Math.PI * 2 : T * 0.002 + ph / 12 + 2.2;
        const w = local(at, yaw, 0, 9.6 * s, 3.2 * s, S._wxcw || (S._wxcw = new THREE.Vector3()));
        const mq = turn('_wxmhq', 0, 0, -ma); m.compose(w, mq, sv.set(s, 4.4 * s, s)); L.wxmHand.add(m);
        const hq = turn('_wxhhq', 0, 0, -ha); m.compose(w, hq, sv.set(s * 1.3, 2.9 * s, s)); L.wxmHand.add(m);
        spot(0.35, WARM, 22); light(9.6, 14, WARM, 0.2 + 0.4 * run, 4);
      }
      else if (k === 'flute') {
        // the toast: the glass goes up, and up
        const up = smooth(it.toast - 0.6, it.toast + 0.4, T) * (1 - smooth(it.toast + 6, it.toast + 8, T));
        put('wxmFlute', 0, up * 16, 0, turn('_wxfq', 0, 0, -0.2 * up));
        if (up > 0.05) light(14 + up * 16, 18, [1, 0.9, 0.5], 0.5 * up, 0);
        spot(0.3, WARM, 18);
      }
      else if (k === 'biscuit') { put('wxmBiscuit'); put('wxmBiscuitPhoto'); put('wxmBowlName'); light(10, 22, WARM, 0.25, 2); spot(0.45, WARM, 26); }
      else if (k === 'cookies') {
        // nine cookies, going one at a time
        put('wxmCookiePlate');
        const c = S.course, gone = it.eat !== undefined ? clamp(Math.floor((c.beatAt(T) - c.beatAt(it.eat)) * (it.rate ?? 1.5)), 0, 9) : 0;
        for (let j = gone; j < 9; j++) { const a = j * 2.1, r = j === 8 ? 0 : 4.6 + (j % 2) * 0.6; put(COOKIES[j % 3], Math.cos(a) * r, 8.4 + (j === 8 ? 0.9 : 0), Math.sin(a) * r, turn(CK[j % 3], a)); }
        spot(0.4, WARM, 22);
      }
      else if (k === 'orange') { put('wxmOrange'); if (T > (it.bite ?? 1e9)) put('wxmBite'); spot(0.4, WARM, 18); light(5, 14, [1, 0.6, 0.2], 0.2, 2); }
      else if (k === 'granny') { put('wxmGranny'); spot(0.35, WARM, 22); }
    },
  },
  kits: {
    // the things on the table at their moments: { t, x, kind, ... }
    wxmTable(S, z) {
      for (const c of z.at) S.items.push(onFloor(S, { t: c.t, x: c.x, rot: c.rot ?? (c.x > 0 ? Math.PI / 2 + 0.35 : -Math.PI / 2 - 0.35), s: c.s ?? 1, y: c.y, kind: c.kind, from: c.from, n0: c.n0, n1: c.n1, rate: c.rate, rows: c.rows, tint: c.tint, pop: c.pop, fast: c.fast, at: c.at, toast: c.toast, eat: c.eat, bite: c.bite, cardigan: c.cardigan, napkin: c.napkin, booster: c.booster, h: 0, parts: 'wxmTableProp', ahead: c.ahead ?? 40 }));
    },
    // the places set all down both sides, a chair behind each, the candles between
    wxmPlaces(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) {
        const tt = t + R() * 0.1;
        if (!(z.skip || []).some(([a, b]) => tt > a && tt < b)) S.items.push(onFloor(S, { t: tt, x: side * (z.x ?? 31), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1, kind: 'setting', h: 0, parts: 'wxmTableProp' }));
        S.items.push(onFloor(S, { t: tt, x: side * (TABLE.half + 9), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1, kind: 'chair', h: 0, parts: 'wxmTableProp' }));
      }
      for (let t = z.from + 0.37; t < z.to; t += (z.every ?? 0.75) * 4) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0 : (z.every ?? 0.75) * 2), x: side * 19, rot: 0, s: 1, kind: 'candles', h: 0, parts: 'wxmTableProp' }));
    },
  },
});
