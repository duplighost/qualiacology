// Come Countdown. A launch site where nothing lifts off. The pad at night, the rocket in its tower
// under the floodlights, the countdown clock: ten, nine, eight, one, and done before we started. The
// viewing stands, empty; the stopwatch; the pressure gauge in the red; the stage with its curtain;
// ready, set, go, no show. The big curtain closing across the road, the toy rocket falling. The exit,
// the broken clock over the door; inside mission control: the spreadsheet, the bell curve, the
// participation trophy, the lights going out. Out again: the review, one star out of five, morning.
// Houston: the red, the rocket stuck in its hole, the dish, the smoke with nothing going up; the
// stopwatch at ten seconds, nine scrubs, the eight ball. And the pad at the end, the clock at zero.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
// beside the road, facing it, turned a little toward you coming up it
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function tube(a, b, r, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const STEEL = (M, key) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ color: 0x5a5e68, roughness: 0.6, metalness: 0.5, emissive: 0x0c0e12 }));
const FONT = '"Arial Black", Impact, sans-serif';
const XENON = [0.85, 0.92, 1.0];
const RED = [1, 0.12, 0.08];
const AMBER = [1, 0.62, 0.18];
const FLAME = [1, 0.55, 0.2];

// ---------- the pictures ----------
// the countdown clock's numbers: 10 down to 1 in amber, then 0 and 00 in red, on black
function digitsTexture() {
  return canvasTex(1024, 384, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cells = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0', '00'];
    cells.forEach((s, i) => {
      const x = (i % 4) * 256 + 128, y = Math.floor(i / 4) * 128 + 68;
      g.font = `900 112px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const c = i >= 10 ? '#ff3a2a' : '#ffa424';
      for (const [blur, f] of [[24, c], [6, c], [0, i >= 10 ? '#ffd8d0' : '#fff0c8']]) { g.shadowColor = c; g.shadowBlur = blur; g.fillStyle = f; g.fillText(s, x, y); }
    });
  });
}
// ready, set, go, one under the other
function treeTexture() {
  return canvasTex(256, 768, (g, W) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, W, 768);
    ['READY', 'SET', 'GO'].forEach((s, i) => { g.fillStyle = '#e8e8ec'; g.font = `900 ${s === 'READY' ? 52 : 70}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, W / 2, i * 256 + 128); });
  });
}
// the stopwatch's face
function watchTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    g.strokeStyle = '#16161a'; g.lineCap = 'round';
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 ? 222 : 196; g.lineWidth = k % 5 ? 4 : 10; g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240); g.stroke(); }
    g.fillStyle = '#16161a'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; g.fillText(String(k * 5), 256 + Math.sin(a) * 160, 256 - Math.cos(a) * 160); }
  });
}
// a wall clock's face, the hours
function dialTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#f0ede4'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    g.strokeStyle = '#1a1a1e';
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2; g.lineWidth = k % 5 ? 3 : 9; const r0 = k % 5 ? 226 : 206; g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240); g.stroke(); }
    g.fillStyle = '#1a1a1e'; g.font = `900 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; g.fillText(String(k), 256 + Math.sin(a) * 168, 256 - Math.cos(a) * 168); }
  });
}
// the pressure gauge's face: green, yellow, the red
function gaugeTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    g.lineWidth = 40;
    for (const [a, b, c] of [[0.75, 1.5, '#3ab04a'], [1.5, 1.9, '#f0c030'], [1.9, 2.25, '#d82a2a']]) { g.strokeStyle = c; g.beginPath(); g.arc(256, 256, 196, Math.PI * a, Math.PI * b); g.stroke(); }
    g.strokeStyle = '#16161a'; g.lineWidth = 7; for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k / 10 * Math.PI * 1.5; g.beginPath(); g.moveTo(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150); g.lineTo(256 + Math.cos(a) * 174, 256 + Math.sin(a) * 174); g.stroke(); }
    g.fillStyle = '#16161a'; g.font = `900 50px ${FONT}`; g.textAlign = 'center'; g.fillText('PSI', 256, 390);
  });
}
// the big screens: the spreadsheet of malfunctions, and the bell curve with its deviations marked
function screenTexture() {
  return canvasTex(2048, 512, (g) => {
    g.fillStyle = '#eef2f6'; g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = '#b0b8c4'; g.lineWidth = 2; for (let x = 0; x <= 1024; x += 102) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y <= 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    g.fillStyle = '#c8d4e2'; g.fillRect(0, 0, 1024, 32); g.fillRect(0, 0, 102, 512);
    const R = seeded(13); g.font = '700 22px "Courier New", monospace'; g.textAlign = 'right';
    for (let r = 1; r < 16; r++) for (let c = 1; c < 10; c++) { const bad = R() < 0.4; if (bad) { g.fillStyle = 'rgba(216,42,42,0.2)'; g.fillRect(c * 102 + 1, r * 32 + 1, 100, 30); } g.fillStyle = bad ? '#c81e1e' : '#2a2e36'; g.fillText((bad ? '-' : '') + (R() * 99).toFixed(1), c * 102 + 94, r * 32 + 24); }
    g.fillStyle = '#06101a'; g.fillRect(1024, 0, 1024, 512);
    g.strokeStyle = '#163444'; g.lineWidth = 2; for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(1024 + x, 30); g.lineTo(1024 + x, 482); g.stroke(); } for (let y = 30; y < 482; y += 64) { g.beginPath(); g.moveTo(1024, y); g.lineTo(2048, y); g.stroke(); }
    const X = (u) => 1024 + 60 + u * 904, Y = (u) => { const z = (u - 0.5) * 6; return 470 - Math.exp(-z * z / 2) * 400; };
    for (const [k, a] of [[1, 0.1], [2, 0.18], [3, 0.26]]) { g.fillStyle = `rgba(122,208,255,${a})`; g.beginPath(); g.moveTo(X(0.5 - k / 6), 470); for (let j = 0; j <= 40; j++) { const u = 0.5 - k / 6 + j / 40 * (2 * k / 6); g.lineTo(X(u), Y(u)); } g.lineTo(X(0.5 + k / 6), 470); g.fill(); }
    g.strokeStyle = '#7ad0ff'; g.lineWidth = 9; g.beginPath(); for (let k = 0; k <= 200; k++) { const u = k / 200; if (k) g.lineTo(X(u), Y(u)); else g.moveTo(X(u), Y(u)); } g.stroke();
    g.strokeStyle = '#ff3a2a'; g.lineWidth = 6; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(X(0.955), 40); g.lineTo(X(0.955), 470); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(X(0.955), Y(0.955), 14, 0, 7); g.fill();
    g.fillStyle = '#7ad0ff'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; for (const k of [-2, -1, 1, 2]) g.fillText((k > 0 ? '+' : '−') + Math.abs(k) + 'σ', X(0.5 + k / 6), 506);
  });
}
// the review: a form, every box crossed in red, a circle at the bottom
function reviewTexture() {
  return canvasTex(384, 512, (g, W, H) => {
    g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16181e'; g.fillRect(28, 30, W - 56, 16); g.fillRect(28, 58, 150, 9);
    const R = seeded(6);
    for (let k = 0; k < 7; k++) { const y = 104 + k * 54; g.strokeStyle = '#3a3e48'; g.lineWidth = 4; g.strokeRect(30, y, 34, 34); g.fillStyle = '#5a5e68'; g.fillRect(82, y + 12, 90 + R() * 170, 10); g.strokeStyle = '#d82a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(34, y + 4); g.lineTo(60, y + 30); g.moveTo(60, y + 4); g.lineTo(34, y + 30); g.stroke(); }
    g.strokeStyle = '#d82a2a'; g.lineWidth = 7; g.beginPath(); g.ellipse(W - 92, H - 50, 66, 30, -0.12, 0, 7); g.stroke();
  });
}
// the eight ball's window
function eightTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#05060e'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1c2c9a'; g.beginPath(); g.moveTo(256, 92); g.lineTo(446, 420); g.lineTo(66, 420); g.closePath(); g.fill();
    g.fillStyle = '#e8ecff'; g.font = `900 50px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#8aa0ff'; g.shadowBlur = 10;
    g.fillText('TRY', 256, 262); g.fillText('AGAIN', 256, 318); g.fillText('LATER', 256, 374);
  });
}
function exitTexture() {
  return canvasTex(512, 192, (g, W, H) => {
    g.fillStyle = '#0a5a32'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#eafff2'; g.font = `900 124px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', W / 2 - 34, H / 2 + 6);
    g.beginPath(); g.moveTo(W - 96, H / 2 - 42); g.lineTo(W - 30, H / 2); g.lineTo(W - 96, H / 2 + 42); g.closePath(); g.fill();
  });
}
// the launch board: nine attempts this week, every one scrubbed
function scrubTexture() {
  return canvasTex(1024, 640, (g, W, H) => {
    g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7ad0ff'; g.font = `900 46px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('ATTEMPT', 48, 40); g.textAlign = 'right'; g.fillText('STATUS', W - 48, 40);
    g.fillStyle = '#1a2a3a'; g.fillRect(40, 70, W - 80, 4);
    for (let k = 0; k < 9; k++) {
      const y = 106 + k * 60;
      g.fillStyle = '#d8e0ea'; g.font = `900 40px ${FONT}`; g.textAlign = 'left'; g.fillText(String(k + 1).padStart(2, '0'), 56, y);
      g.fillStyle = '#ff3a2a'; g.shadowColor = '#ff3a2a'; g.shadowBlur = 12; g.textAlign = 'right'; g.fillText('SCRUBBED', W - 56, y); g.shadowBlur = 0;
    }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { digits: digitsTexture(), tree: treeTexture(), watch: watchTexture(), dial: dialTexture(), gauge: gaugeTexture(), screens: screenTexture(), review: reviewTexture(), eight: eightTexture(), exit: exitTexture(), scrub: scrubTexture() });
const paper = (M, key, map, k = 0.5, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const lit = (M, key, map, k = 1) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
// a cell of a picture grid per instance, lit; switched by aOn; dotted like LEDs when led is set
function cellLed(map, cols, rows, k = 1, led = false) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uK: { value: k } },
    vertexShader: `attribute float aCell; attribute float aOn; varying vec2 vUv; varying float vCell; varying float vOn; void main(){ vUv = uv; vCell = aCell; vOn = aOn; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uK; varying vec2 vUv; varying float vCell; varying float vOn; void main(){ float cell = floor(vCell + 0.5); float c = mod(cell, ${cols.toFixed(1)}), r = floor((cell + 0.5) / ${cols.toFixed(1)}); vec3 t = texture2D(tMap, vec2((c + vUv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - vUv.y) / ${rows.toFixed(1)})).rgb; ${led ? 'vec2 lq = vUv * vec2(88.0, 44.0); float near = clamp(1.6 - 2.0 * max(fwidth(lq.x), fwidth(lq.y)), 0.0, 1.0); t *= mix(0.85, 0.45 + 0.9 * smoothstep(0.5, 0.2, length(fract(lq) - 0.5)), near);' : ''} gl_FragColor = vec4(t * uK * vOn, 1.0); }`,
    side: THREE.DoubleSide,
  });
}
// a plain colour per instance, unlit (lamps)
function tintBasic() { return new THREE.ShaderMaterial({ vertexShader: `attribute vec3 aTint; varying vec3 vC; void main(){ vC = aTint; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`, fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }`, side: THREE.DoubleSide }); }
// a lit colour per instance (the stars, the flags)
function tintLit(rough = 0.4, metal = 0.1, k = 0.25) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: metal, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= min(vTint, vec3(1.0));').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vTint * ' + k.toFixed(2) + ';');
  };
  return m;
}
// smoke and steam: soft round billows facing the camera, lit by whatever lights them
function puffMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xd8dce8) } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vK; void main(){ vec2 q = vUv - 0.5; float d = length(q) * 2.0; float a = smoothstep(1.0, 0.15, d) * (0.75 + 0.25 * sin(q.x * 9.0 + q.y * 7.0)); gl_FragColor = vec4(uCol * a * vK * 0.3, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}
// the light coming down from a spot
function coneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xfff0d8) } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vK; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = 0.2 + 0.8 * y * y; gl_FragColor = vec4(uCol * a * 0.11 * vK, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

// ---------- the launch site's things, at its scale ----------
function finGeo() {
  const sh = new THREE.Shape(); sh.moveTo(4.9, 22); sh.lineTo(4.9, 4); sh.lineTo(11.5, -1); sh.lineTo(11.5, 7); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: false }); g.translate(0, 0, -0.5);
  return g;
}
const LG = {
  // the countdown clock: a long black board in a steel frame; its numbers are a layer
  clock() { const parts = [], st = rgb(0x4a4e58); parts.push(paint(box(46, 24, 3, 0, 0, -1.9), rgb(0x0c0d10))); for (const [w, h, x, y] of [[47.6, 1.0, 0, 11.4], [47.6, 1.0, 0, -11.4], [1.0, 23.8, -23.3, 0], [1.0, 23.8, 23.3, 0]]) parts.push(paint(box(w, h, 3.4, x, y, -1.9), st)); parts.push(paint(box(30, 3, 2.4, 0, -13.8, -1.9), rgb(0x2a2e36))); return merge(parts); },
  clockFace() { return new THREE.PlaneGeometry(44, 21); },
  leg() { return box(1.4, 1, 1.4, 0, 0.5, 0); },
  // the rocket: white, black bands, the nose, the fins, the engine bells
  rocket() {
    const parts = [], white = rgb(0xeeeef2), black = rgb(0x18181e), grey = rgb(0x7a7e88);
    parts.push(paint(cyl(5, 5, 66, 32, 0, 39, 0), white));
    for (const y of [18, 34, 56]) parts.push(paint(cyl(5.06, 5.06, 3, 32, 0, y, 0), black));
    parts.push(paint(cyl(4.2, 5, 8, 32, 0, 76, 0), white)); parts.push(paint(cyl(4.26, 4.26, 1.6, 32, 0, 79, 0), black));
    parts.push(paint(new THREE.ConeGeometry(4.2, 14, 32).translate(0, 87, 0), white)); parts.push(paint(cyl(0.35, 0.15, 6, 8, 0, 96.5, 0), grey));
    for (let k = 0; k < 4; k++) { const f = finGeo(); f.rotateY(k * Math.PI / 2 + Math.PI / 4); parts.push(paint(f, black)); }
    for (const [x, z] of [[2.3, 2.3], [-2.3, 2.3], [2.3, -2.3], [-2.3, -2.3], [0, 0]]) parts.push(paint(cyl(1.0, 2.0, 5, 16, x, 3.5, z), grey));
    return merge(parts);
  },
  // its tower: a red lattice, arms reaching to it, a mast on top
  tower() {
    const parts = [], red = rgb(0xb8301e), grey = rgb(0x5a5e68);
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) parts.push(paint(box(1.2, 110, 1.2, x, 55, z), red));
    for (let y = 6; y < 110; y += 8) { for (const [a, b] of [[V(-4, y, -4), V(4, y + 8, -4)], [V(4, y, 4), V(-4, y + 8, 4)], [V(-4, y, 4), V(-4, y + 8, -4)], [V(4, y, -4), V(4, y + 8, 4)]]) parts.push(paint(tube(a, b, 0.32, 5), red)); parts.push(paint(box(9, 0.6, 9, 0, y, 0), red)); }
    for (const y of [40, 70, 90]) parts.push(paint(box(11, 2, 3, 9.5, y, 0), grey));
    parts.push(paint(cyl(0.7, 1.2, 14, 8, 0, 117, 0), grey));
    return merge(parts);
  },
  // the pad: a concrete block with the flame trench cut through it
  pad() { const parts = [], c = rgb(0x8a8a90); parts.push(paint(box(26, 6, 60, -17, 3, 0), c)); parts.push(paint(box(26, 6, 60, 17, 3, 0), c)); parts.push(paint(box(8, 1, 60, 0, 0.5, 0), rgb(0x1a1a1e))); parts.push(paint(box(12, 6, 14, 0, 3, 0), c)); for (const x of [-30.5, 30.5]) parts.push(paint(box(1, 1.4, 60, x, 6.7, 0), rgb(0xe8c030))); return merge(parts); },
  // a floodlight mast: a pole, a frame of lamps at the top turned down
  flood() { const parts = [], g = rgb(0x5a5e68); parts.push(paint(cyl(0.7, 1.1, 50, 8, 0, 25, 0), g)); const fr = box(10, 5, 1.2, 0, 0, 0); fr.rotateX(0.5); fr.translate(0, 51, 0.6); parts.push(paint(fr, g)); return merge(parts); },
  floodLamps() { const parts = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const c = new THREE.CircleGeometry(0.95, 14); c.translate(-3.6 + i * 2.4, -1.1 + j * 2.2, 0.7); c.rotateX(0.5); c.translate(0, 51, 0.6); parts.push(c); } return merge(parts); },
  // the viewing stands: benches stepping up and back, the wall behind, a roof, nobody
  stands() { const parts = []; for (let k = 0; k < 8; k++) { parts.push(paint(box(40, 0.7, 2.6, 0, 1.6 + k * 1.8, -k * 3), rgb(0x9a9ea8))); parts.push(paint(box(40, 1.8 + k * 1.8, 0.4, 0, (1.8 + k * 1.8) / 2, -k * 3 + 1.2), rgb(0x3a3e48))); } parts.push(paint(box(40, 18, 0.6, 0, 9, -24.5), rgb(0x2a2e36))); for (const x of [-20, 20]) parts.push(paint(box(0.6, 18, 26, x, 9, -11.6), rgb(0x2a2e36))); parts.push(paint(box(44, 1.2, 30, 0, 18.6, -11.5), rgb(0x22262e))); return merge(parts); },
  flag() { const g = new THREE.PlaneGeometry(6, 3.6, 8, 1); g.translate(3, 0, 0); return g; },
  pole() { return box(0.3, 1, 0.3, 0, 0.5, 0); },
  // the stopwatch: the chrome case, the crown and its ring, the button; the face and the hand are layers
  watch() { const parts = [], chrome = rgb(0xc8ccd4); parts.push(paint(cyl(13, 13, 3.4, 48, 0, 0, 0).rotateX(Math.PI / 2), chrome)); parts.push(paint(new THREE.TorusGeometry(12.6, 0.9, 10, 48).translate(0, 0, 1.9), chrome)); parts.push(paint(cyl(2, 2.2, 3.2, 16, 0, 14.4, 0), chrome)); parts.push(paint(new THREE.TorusGeometry(3, 0.75, 8, 20).translate(0, 18.6, 0), chrome)); parts.push(paint(cyl(1.3, 1.3, 3.4, 12, 0, 0, 0).rotateZ(0.7).translate(-10.4, 10.4, 0), chrome)); return merge(parts); },
  watchFace() { const g = new THREE.CircleGeometry(12, 48); g.translate(0, 0, 2.15); return g; },
  hand() { return merge([paint(box(0.8, 12, 0.3, 0, 4.4, 2.6), rgb(0xd82a2a)), paint(cyl(1.1, 1.1, 0.6, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, 2.6), rgb(0x16161a))]); },
  // the pressure gauge on its pipe
  gauge() { const parts = [], brass = rgb(0xc8a050); parts.push(paint(cyl(12, 12, 3, 48, 0, 0, 0).rotateX(Math.PI / 2), brass)); parts.push(paint(new THREE.TorusGeometry(11.6, 0.8, 10, 48).translate(0, 0, 1.7), brass)); parts.push(paint(cyl(2, 2, 40, 12, 0, -32, -1), rgb(0x6a6e78))); parts.push(paint(cyl(3, 3, 3, 12, 0, -12.6, -1), brass)); parts.push(paint(box(9, 1.6, 9, 0, -52, -1), rgb(0x3a3e48))); return merge(parts); },
  gaugeFace() { const g = new THREE.CircleGeometry(11, 48); g.translate(0, 0, 1.95); return g; },
  needle() { return merge([paint(box(0.9, 10.5, 0.3, 0, 4, 2.4), rgb(0x16161a)), paint(cyl(1.2, 1.2, 0.6, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, 2.4), rgb(0x16161a))]); },
  // the stage: boards, the arch, the curtains drawn back and tied
  stage() {
    const parts = [], red = rgb(0x9a1424), gold = rgb(0xc8a040), dark = rgb(0x120c10);
    parts.push(paint(box(40, 5, 16, 0, 2.5, 0), rgb(0x4a3020))); parts.push(paint(box(48, 40, 2, 0, 20, -8), dark));
    for (const s of [-1, 1]) { parts.push(paint(box(4, 40, 3, s * 22, 20, -6), gold)); for (let k = 0; k < 6; k++) parts.push(paint(cyl(1.4, 1.6 + k * 0.1, 31, 10, s * (19 - k * 1.5), 20.5, -5.2 + k * 0.1), red)); }
    parts.push(paint(box(48, 5, 3, 0, 41.5, -6), gold)); parts.push(paint(box(44, 3.4, 2, 0, 38, -5), red));
    return merge(parts);
  },
  // the big curtain across the road: one half, its folds; the walls it comes out of; the top
  curtain() { const g = new THREE.PlaneGeometry(44, 1, 44, 1); g.translate(22, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 1.3) * 0.9); g.computeVertexNormals(); return g; },
  arch() {
    const parts = [], gold = rgb(0xc8a040), wall = rgb(0x3a0c14);
    for (const s of [-1, 1]) { parts.push(paint(box(60, 1, 4, s * 74, 0.5, -1), wall)); parts.push(paint(box(5, 1, 6, s * 46.5, 0.5, -0.5), gold)); }
    return merge(parts);
  },
  // (the valance stands proud of the walls' faces and above their tops: flush, it shared them and fought)
  valance() { const parts = [], gold = rgb(0xc8a040), red = rgb(0x8a1020); parts.push(paint(box(190, 10, 4, 0, 5.3, -0.7), red)); parts.push(paint(box(190, 1.6, 4.4, 0, 0.4, -0.8), gold)); parts.push(paint(box(190, 1.6, 4.4, 0, 9.6, -0.8), gold)); return merge(parts); },
  // ready, set, go: a tall black housing; the lamps and the words are layers
  tree() { return paint(box(28, 42, 3, 0, 0, -1.6), rgb(0x141418)); },
  treeLabel() { const g = new THREE.PlaneGeometry(12, 36); g.translate(6, 0, 0.05); return g; },
  lamp() { const g = new THREE.CircleGeometry(4.2, 32); g.translate(-6.5, 0, 0.05); return g; },
  // the broken clock: a round wall clock, its glass cracked
  wallClock() { return merge([paint(cyl(13, 13, 2.4, 48, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, -1.2), rgb(0x22222a)), paint(new THREE.TorusGeometry(12.5, 0.8, 10, 48).translate(0, 0, 0.3), rgb(0x8a8e98))]); },
  dial() { const g = new THREE.CircleGeometry(12, 48); g.translate(0, 0, 0.45); return g; },
  crack() { const parts = []; const R = seeded(9); for (let k = 0; k < 10; k++) { const a = R() * 6.28, L = 4 + R() * 8; const s = new THREE.PlaneGeometry(L, 0.26); s.translate(L / 2, 0, 0); s.rotateZ(a); s.translate(2.5, 3, 1.4); parts.push(s); for (let j = 0; j < 2; j++) { const b = new THREE.PlaneGeometry(2 + R() * 3, 0.2); b.translate(1, 0, 0); b.rotateZ(a + (R() - 0.5) * 1.6); b.translate(2.5 + Math.cos(a) * L * (0.4 + R() * 0.4), 3 + Math.sin(a) * L * (0.4 + R() * 0.4), 1.4); parts.push(b); } } return merge(parts); },
  clockHand(len, w) { return paint(box(w, len, 0.3, 0, len / 2 - 1.2, 0.9), rgb(0x16161a)); },
  // the exit sign
  exitBox() { return merge([paint(box(22, 8.8, 2, 0, 0, -1.4), rgb(0x16181e)), paint(box(0.3, 40, 0.3, -8, 24.4, -1.4), rgb(0x5a5e68)), paint(box(0.3, 40, 0.3, 8, 24.4, -1.4), rgb(0x5a5e68))]); },
  exitFace() { return new THREE.PlaneGeometry(21, 7.9); },
  // a big screen hung over the floor
  screen() { return merge([paint(box(46, 24, 2, 0, 0, -1.6), rgb(0x16181e)), paint(box(0.3, 40, 0.3, -16, 32, -1.6), rgb(0x5a5e68)), paint(box(0.3, 40, 0.3, 16, 32, -1.6), rgb(0x5a5e68))]); },
  screenFace() { return new THREE.PlaneGeometry(44, 22); },
  // a mission control desk: the sloped top, two screens, the chair (nobody in it)
  console() { const parts = [], dark = rgb(0x2a2e38); parts.push(paint(box(26, 8, 7, 0, 4, 0), dark)); const top = box(26, 1, 8, 0, 0, 0); top.rotateX(0.3); top.translate(0, 8.6, 1.2); parts.push(paint(top, rgb(0x3a3e48))); for (const x of [-7, 7]) parts.push(paint(box(10.4, 7, 1.0, x, 13.6, -2.6), rgb(0x101216))); parts.push(paint(box(4, 1, 4, 0, 4.6, 8), rgb(0x1a1c22))); parts.push(paint(box(4, 5, 0.8, 0, 7, 9.8), rgb(0x1a1c22))); return merge(parts); },
  consoleFace() { const parts = []; for (const x of [-7, 7]) { const g = new THREE.PlaneGeometry(9.4, 6); g.translate(x, 13.6, -1.9); parts.push(g); } return merge(parts); },
  // the participation trophy: a gold cup, its handles, a ribbon on it; the plinth
  trophy() {
    const parts = [], gold = rgb(0xf0c040);
    const pts = [[0, 0], [7, 0], [7, 2], [3, 3], [2.2, 6], [1.6, 12], [3, 14], [7, 17], [9, 22], [9.6, 30], [9.8, 31]].map(([r, y]) => new THREE.Vector2(r, y));
    parts.push(paint(new THREE.LatheGeometry(pts, 32), gold));
    for (const s of [-1, 1]) parts.push(paint(new THREE.TorusGeometry(4, 0.8, 8, 20, Math.PI).rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2).translate(s * 9.4, 24, 0), gold));
    const ros = new THREE.CircleGeometry(3.6, 20); ros.translate(0, 10, 2.5); parts.push(paint(ros, rgb(0x2a5ad8)));
    for (const s of [-1, 1]) { const tl = new THREE.PlaneGeometry(2.2, 7); tl.rotateZ(s * 0.25); tl.translate(s * 1.5, 5, 2.4); parts.push(paint(tl, rgb(0x2a5ad8))); }
    return merge(parts);
  },
  plinth() { return merge([paint(box(18, 14, 18, 0, 7, 0), rgb(0x1a1c24)), paint(box(19, 1, 19, 0, 14.4, 0), rgb(0x8a8e98))]); },
  // a five-pointed star
  star() { const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.9 : 4.6; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.35, bevelSegments: 2 }); g.translate(0, 0, -0.5); return g; },
  wire() { return box(1, 0.16, 0.16, 0, 0, 0); },
  // the review on its clipboard
  clip() { return merge([paint(box(17, 23, 0.8, 0, 0, -1.0), rgb(0x8a6a44)), paint(box(7, 2.6, 1.4, 0, 11, -0.5), rgb(0xa8acb8)), paint(box(0.2, 40, 0.2, -6, 31, -1.0), rgb(0x6a6e78)), paint(box(0.2, 40, 0.2, 6, 31, -1.0), rgb(0x6a6e78))]); },
  clipFace() { const g = new THREE.PlaneGeometry(15, 20); g.translate(0, -1, 0); return g; },
  // ground control's dish, its feed, the mount
  dish() {
    const parts = [], w = rgb(0xd8dce4), g = rgb(0x8a8e98);
    const d = new THREE.SphereGeometry(16, 32, 8, 0, Math.PI * 2, Math.PI - 0.95, 0.95); d.translate(0, 16, 0); d.rotateX(0.75); d.translate(0, 26, 0); parts.push(paint(d, w));
    const ax = new THREE.Vector3(0, Math.cos(0.75), Math.sin(0.75)), c = new THREE.Vector3(0, 26, 0);
    parts.push(paint(tube(c, c.clone().addScaledVector(ax, 12), 0.45, 6), g)); parts.push(paint(cyl(1, 1, 2.4, 10, 0, 0, 0).translate(0, 26 + 12 * ax.y, 12 * ax.z), g));
    parts.push(paint(box(5, 24, 5, 0, 12, -2), g)); parts.push(paint(box(14, 2, 14, 0, 1, -2), rgb(0x5a5e68)));
    return merge(parts);
  },
  // the eight ball, its eight; the window on its back
  eight() {
    const parts = [paint(new THREE.SphereGeometry(12, 40, 28), rgb(0x0c0c10))];
    const cap = new THREE.SphereGeometry(12.3, 32, 6, 0, Math.PI * 2, 0, 0.44); cap.rotateX(Math.PI / 2); parts.push(paint(cap, rgb(0xf4f4f4)));
    const a = new THREE.TorusGeometry(1.5, 0.55, 8, 20); a.translate(0, 1.7, 12.55); const b = new THREE.TorusGeometry(2.0, 0.6, 8, 20); b.translate(0, -1.9, 12.55); parts.push(paint(a, rgb(0x0c0c10)), paint(b, rgb(0x0c0c10)));
    return merge(parts);
  },
  eightWindow() { const g = new THREE.SphereGeometry(12.3, 32, 6, 0, Math.PI * 2, 0, 0.5); g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv, R = 12.3 * Math.sin(0.5); for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getX(i) / (2 * R) + 0.5, p.getY(i) / (2 * R) + 0.5); return g; },
  // the launch board
  scrub() { return paint(box(34, 22, 2, 0, 0, -1.4), rgb(0x16181e)); },
  scrubFace() { return new THREE.PlaneGeometry(32, 20); },
  quad() { return new THREE.PlaneGeometry(2, 2); },
  cone() { const g = new THREE.CylinderGeometry(1, 9, 1, 24, 1, true); g.translate(0, -0.5, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return g; },
  crater() { const g = new THREE.RingGeometry(6, 22, 32, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.45, 0); return g; },
  // his lines on the site's signs: dark, hazard stripes along the top and the bottom
  signBoard() {
    const parts = [paint(box(25, 9.4, 1, 0, 0, -1.0), rgb(0x0a1018))];
    for (const y of [5.0, -5.0]) for (let k = 0; k < 20; k++) parts.push(paint(box(1.3, 1.1, 1.3, -12.35 + k * 1.3, y, -0.8), k % 2 ? rgb(0x101014) : rgb(0xf0c020)));
    for (const x of [-9, 9]) parts.push(paint(box(0.25, 40, 0.25, x, 25.4, -1.0), rgb(0x5a5e68)));
    return merge(parts);
  },
};

// a clock's number now: the last of its times that's come
function clockCell(it, T) {
  if (it.tick) { const [t0, dt, n0] = it.tick; return T < t0 ? 10 - n0 : 10 - Math.max(0, n0 - Math.floor((T - t0) / dt)); }
  let c = it.seq[0][1]; for (const [t0, k] of it.seq) if (T >= t0) c = k; return c;
}
// legs from the ground up to something, either side of it
function legs(S, c, yaw, hx, base, top, s, z = -1.6) {
  const m = S._m, lp = S._lp || (S._lp = new THREE.Vector3()), q0 = S._q0 || (S._q0 = new THREE.Quaternion());
  for (const sd of [-1, 1]) { const w = local(c, yaw, sd * hx, 0, z * s, S._o); lp.set(w.x, base, w.z); m.compose(lp, q0, S._s.set(s, Math.max(0.1, top - base), s)); S.layers.ccLeg.add(m); }
}

extend({
  layers: {
    ccClock: (M) => [LG.clock(), VCm(M, 'ccClockM', 0.12, { roughness: 0.5, metalness: 0.4 }), 12, {}],
    ccClockFace: (M) => [LG.clockFace(), M.ccDigitsM || (M.ccDigitsM = cellLed(tex().digits, 4, 3, 1.35, true)), 12, { aCell: 1, aOn: 1 }],
    ccLeg: (M) => [LG.leg(), STEEL(M, 'ccLegM'), 60, {}],
    ccRocket: (M) => [LG.rocket(), VCm(M, 'ccRocketM', 0.2, { roughness: 0.45, metalness: 0.15 }), 8, {}],
    ccTower: (M) => [LG.tower(), VCm(M, 'ccTowerM', 0.12, { roughness: 0.6, metalness: 0.3 }), 6, {}],
    ccPad: (M) => [LG.pad(), VCm(M, 'ccPadM', 0.06, { roughness: 0.9 }), 6, {}],
    ccFlood: (M) => [LG.flood(), VC(M, 'ccFloodM', { roughness: 0.6, metalness: 0.4, emissive: 0x0a0c10 }), 120, {}],
    ccFloodLamps: (M) => [LG.floodLamps(), M.ccFloodLampsM || (M.ccFloodLampsM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1).multiplyScalar(2.4), side: THREE.DoubleSide })), 120, {}],
    ccStands: (M) => [LG.stands(), VCm(M, 'ccStandsM', 0.05, { roughness: 0.8 }), 12, {}],
    ccFlag: (M) => [LG.flag(), M.ccFlagM || (M.ccFlagM = tintLit(0.8, 0, 0.3)), 40, { aTint: 3 }],
    ccPole: (M) => [LG.pole(), M.ccPoleM || (M.ccPoleM = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.5, metalness: 0.6, emissive: 0x1a1a20 })), 60, {}],
    ccWatch: (M) => [LG.watch(), VCm(M, 'ccWatchM', 0.2, { roughness: 0.15, metalness: 0.85 }), 6, {}],
    ccWatchFace: (M) => [LG.watchFace(), lit(M, 'ccWatchFaceM', tex().watch, 0.95), 6, {}],
    ccHand: (M) => [LG.hand(), VCm(M, 'ccHandM', 0.4, { roughness: 0.4 }), 6, {}],
    ccGauge: (M) => [LG.gauge(), VCm(M, 'ccGaugeM', 0.2, { roughness: 0.25, metalness: 0.7 }), 4, {}],
    ccGaugeFace: (M) => [LG.gaugeFace(), lit(M, 'ccGaugeFaceM', tex().gauge, 0.95), 4, {}],
    ccNeedle: (M) => [LG.needle(), VCm(M, 'ccNeedleM', 0.3, { roughness: 0.4 }), 4, {}],
    ccStage: (M) => [LG.stage(), VCm(M, 'ccStageM', 0.32, { roughness: 0.7 }), 3, {}],
    ccCone: (M) => [LG.cone(), M.ccConeM || (M.ccConeM = coneMaterial()), 12, { aK: 1 }],
    ccCurtain: (M) => [LG.curtain(), M.ccCurtainM || (M.ccCurtainM = new THREE.MeshStandardMaterial({ color: 0x9a1020, roughness: 0.75, emissive: 0x3a0610, side: THREE.DoubleSide })), 4, {}],
    ccArch: (M) => [LG.arch(), VCm(M, 'ccArchM', 0.15, { roughness: 0.6 }), 2, {}],
    ccValance: (M) => [LG.valance(), VCm(M, 'ccValanceM', 0.22, { roughness: 0.6 }), 2, {}],
    ccTree: (M) => [LG.tree(), VC(M, 'ccTreeM', { roughness: 0.5, metalness: 0.3, emissive: 0x08080a }), 3, {}],
    ccTreeLabel: (M) => [LG.treeLabel(), lit(M, 'ccTreeLabelM', tex().tree, 1.0), 3, {}],
    ccLamp: (M) => [LG.lamp(), M.ccLampM || (M.ccLampM = tintBasic()), 12, { aTint: 3 }],
    ccWallClock: (M) => [LG.wallClock(), VC(M, 'ccWallClockM', { roughness: 0.4, metalness: 0.5, emissive: 0x0a0a0e }), 2, {}],
    ccDial: (M) => [LG.dial(), lit(M, 'ccDialM', tex().dial, 0.9), 2, {}],
    ccCrack: (M) => [LG.crack(), M.ccCrackM || (M.ccCrackM = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })), 2, {}],
    ccHandL: (M) => [LG.clockHand(11, 0.9), VC(M, 'ccHandLM', { roughness: 0.5 }), 2, {}],
    ccHandS: (M) => [LG.clockHand(7, 1.3), VC(M, 'ccHandSM', { roughness: 0.5 }), 2, {}],
    ccExit: (M) => [LG.exitBox(), VC(M, 'ccExitM', { roughness: 0.5, emissive: 0x08080a }), 2, {}],
    ccExitFace: (M) => [LG.exitFace(), lit(M, 'ccExitFaceM', tex().exit, 1.25), 2, {}],
    ccScreen: (M) => [LG.screen(), VC(M, 'ccScreenM', { roughness: 0.5, emissive: 0x08080a }), 4, {}],
    ccScreenFace: (M) => [LG.screenFace(), M.ccScreenFaceM || (M.ccScreenFaceM = cellLed(tex().screens, 2, 1, 1.0)), 4, { aCell: 1, aOn: 1 }],
    ccConsole: (M) => [LG.console(), VCm(M, 'ccConsoleM', 0.06, { roughness: 0.6, metalness: 0.2 }), 260, {}],
    ccConsoleFace: (M) => [LG.consoleFace(), M.ccConsoleFaceM || (M.ccConsoleFaceM = cellLed(tex().screens, 2, 1, 0.8)), 260, { aCell: 1, aOn: 1 }],
    ccTrophy: (M) => [LG.trophy(), VCm(M, 'ccTrophyM', 0.35, { roughness: 0.18, metalness: 0.9 }), 2, {}],
    ccPlinth: (M) => [LG.plinth(), VC(M, 'ccPlinthM', { roughness: 0.4, metalness: 0.3, emissive: 0x08080c }), 2, {}],
    ccStar: (M) => [LG.star(), M.ccStarM || (M.ccStarM = tintLit(0.25, 0.6, 0.55)), 12, { aTint: 3 }],
    ccWire: (M) => [LG.wire(), M.ccWireM || (M.ccWireM = new THREE.MeshBasicMaterial({ color: 0x16161a })), 40, {}],
    ccClip: (M) => [LG.clip(), VC(M, 'ccClipM', { roughness: 0.6, emissive: 0x140e08 }), 2, {}],
    ccClipFace: (M) => [LG.clipFace(), paper(M, 'ccReviewM', tex().review, 0.8), 2, {}],
    ccDish: (M) => [LG.dish(), VCm(M, 'ccDishM', 0.12, { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), 3, {}],
    ccEight: (M) => [LG.eight(), VCm(M, 'ccEightM', 0.1, { roughness: 0.08, metalness: 0.2 }), 2, {}],
    ccEightWin: (M) => [LG.eightWindow(), lit(M, 'ccEightWinM', tex().eight, 1.1), 2, {}],
    ccScrub: (M) => [LG.scrub(), VC(M, 'ccScrubM', { roughness: 0.5, emissive: 0x08080a }), 2, {}],
    ccScrubFace: (M) => [LG.scrubFace(), lit(M, 'ccScrubFaceM', tex().scrub, 1.1), 2, {}],
    ccPuff: (M) => [LG.quad(), M.ccPuffM || (M.ccPuffM = puffMaterial()), 900, { aK: 1 }],
    ccCrater: (M) => [LG.crater(), M.ccCraterM || (M.ccCraterM = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1 })), 2, {}],
    ccSignBoard: (M) => [LG.signBoard(), VCm(M, 'ccSignM', 0.2, { roughness: 0.5, metalness: 0.3 }), 24, {}],
    ccSignFace: (M) => [signFace(23, 7.2, 0, 0, 0.02), M.sign, 24, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the countdown clock: over the road on its legs, or beside it
    ccClock(S, it, p, q, yaw) {
      const L = S.layers, board = L.ccClock, face = L.ccClockFace; L.ccLeg;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 0.7, m = S._m;
      const cell = clockCell(it, T);
      const on = it.blink && T > it.blink[0] && T < it.blink[1] ? (Math.sin(T * 17) > 0 ? 1 : 0.1) : 1;
      let fy = yaw, y;
      if (it.over) { const sm = S.course.sample(it.t); fy = sm.yaw + Math.PI; y = sm.y + (it.lift ?? 18); } else y = (it.h ?? 0) + (it.y ?? 22);
      S._e.set(0, fy, 0); const fq = (S._cq || (S._cq = new THREE.Quaternion())).setFromEuler(S._e);
      const c = S._cc || (S._cc = new THREE.Vector3()); c.set(p.x, y, p.z);
      m.compose(c, fq, S._s.set(s, s, s)); board.add(m); face.add(m, { aCell: cell, aOn: on });
      legs(S, c, fy, (it.over ? 25 : 15) * s, it.over ? 0 : (it.h ?? 0), y - 11 * s, s, -1.9);
      glowAt(S, c.x, c.y, c.z, 52 * s, cell >= 10 ? RED : AMBER, 0.16 * on);
      for (const sd of [-1, 1]) { const w = local(c, fy, sd * 21 * s, 12.8 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 3.4 * s, RED, Math.sin(T * 4 + sd) > 0 ? 1.4 : 0.15); }
    },
    // the pad: the rocket in its tower under the floodlights; the engines lighting, the smoke, and nothing
    ccPad(S, it, p, q, yaw) {
      const L = S.layers, pad = L.ccPad, rocket = L.ccRocket, tower = L.ccTower, flood = L.ccFlood, lamps = L.ccFloodLamps, puff = L.ccPuff;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, rs = s * 0.8, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); pad.add(m);
      let burn = 0; for (const [a, b, k] of it.burn || []) burn = Math.max(burn, (k ?? 1) * smooth(a, a + 0.25, T) * (1 - smooth(b, b + 0.7, T)));
      const sh = burn * 0.22 * s, r = S._rv || (S._rv = new THREE.Vector3());
      local(p, yaw, Math.sin(T * 41) * sh, 6 * s, Math.cos(T * 37) * sh, r);
      m.compose(r, q, S._s.set(rs, rs, rs)); rocket.add(m);
      const tw = local(p, yaw, -20 * rs, 6 * s, 0, S._o); m.compose(tw, q, S._s.set(rs, rs, rs)); tower.add(m);
      const tt = local(p, yaw, -20 * rs, 6 * s + 124 * rs, 0, S._o); glowAt(S, tt.x, tt.y, tt.z, 5 * s, RED, Math.sin(T * 3) > 0.2 ? 1.5 : 0.1);
      // the floodlights at the corners, turned in on it
      const fq = S._fq || (S._fq = new THREE.Quaternion()), fw = S._fw || (S._fw = new THREE.Vector3());
      for (const [fx, fz] of [[46, 34], [-46, 34], [46, -34], [-46, -34]]) {
        local(p, yaw, fx * s, 0, fz * s, fw); const fyaw = yaw + Math.atan2(-fx, -fz); S._e.set(0, fyaw, 0); fq.setFromEuler(S._e);
        m.compose(fw, fq, S._s.set(s, s, s)); flood.add(m); lamps.add(m);
        const top = local(fw, fyaw, 0, 52 * s, 2 * s, S._o); glowAt(S, top.x, top.y, top.z, 16 * s, XENON, 0.9);
      }
      poolAt(S, p.x, 0.15, p.z, 110 * s, XENON, 0.32);
      const rk = local(p, yaw, 0, 40 * rs + 6 * s, 0, S._o); glowAt(S, rk.x, rk.y, rk.z, 70 * rs, XENON, 0.12);
      // the engines: a glow under it, smoke rolling out both ends of the trench
      if (burn > 0.01) { const e = local(p, yaw, 0, 6 * s, 0, S._o); const fl = 0.75 + 0.25 * Math.sin(T * 53) * Math.sin(T * 31); glowAt(S, e.x, e.y + 2 * s, e.z, 44 * s * fl, FLAME, 2.6 * burn); glowAt(S, e.x, e.y + 14 * s, e.z, 120 * s, FLAME, 0.35 * burn); poolAt(S, e.x, 0.2, e.z, 110 * s, FLAME, 1.0 * burn); }
      const life = 5.5, dt = 0.08, w = S._pw || (S._pw = new THREE.Vector3());
      for (const [a, b, k] of it.burn || []) {
        if (T < a || T > b + 0.7 + life) continue;
        const first = a + Math.max(0, Math.ceil((T - life - a) / dt)) * dt;
        for (let ts = first; ts <= Math.min(T, b + 0.4); ts += dt) {
          const age = T - ts;
          for (const sd of [-1, 1]) {
            const h = hash(ts * 37.1 + sd * 3.3), g = hash(ts * 11.7 + sd);
            local(p, yaw, (h - 0.5) * 14 * s, (4 + age * 7 + age * age * 1.6 + g * 6) * s, sd * (31 + age * 19 * (1 - age / 14)) * s, w);
            const sz = (10 + age * 13 + g * 6) * s, kk = (k ?? 1) * (1 - age / life) * Math.min(1, age * 6) * 1.1;
            m.makeScale(sz, sz, sz); m.setPosition(w.x, w.y, w.z); puff.add(m, { aK: kk });
          }
        }
      }
    },
    // floodlight masts along the road, a little nervous when it's nervous
    ccFlood(S, it, p, q, yaw) {
      const L = S.layers; L.ccFlood; L.ccFloodLamps;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); L.ccFlood.add(m); L.ccFloodLamps.add(m);
      const nv = S.ccNerves ?? 0, fl = nv > 0 ? 1 - nv * (hash(Math.floor(T * 14) + it.seed * 50) < 0.35 ? 0.85 : 0) : 1;
      const top = local(p, yaw, 0, 52 * s, 1.5 * s, S._o); glowAt(S, top.x, top.y, top.z, 14 * s, XENON, 0.85 * fl);
      const f = local(p, yaw, 0, 0, 14 * s, S._o); poolAt(S, f.x, 0.12, f.z, 46 * s, XENON, 0.3 * fl);
    },
    // red lights on masts a long way off, blinking slow
    ccBeacon(S, it, p) { if (!S.track) return; const T = S.tNow ?? 0; p.y = it.y; glowAt(S, p.x, p.y, p.z, 7, RED, Math.sin(T * 2.4 + it.seed * 9) > 0.3 ? 1.6 : 0.08); },
    // the viewing stands, empty, the flags going
    ccStands(S, it, p, q, yaw) {
      const L = S.layers; L.ccStands; L.ccFlag; L.ccPole;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); L.ccStands.add(m);
      const fq = S._flq || (S._flq = new THREE.Quaternion()), q0 = S._q0 || (S._q0 = new THREE.Quaternion());
      for (let k = 0; k < 3; k++) {
        const w = local(p, yaw, (-16 + k * 16) * s, 0, -26 * s, S._o).clone();
        m.compose(w, q0, S._s.set(s, 30 * s, s)); L.ccPole.add(m);
        w.y += 28 * s; S._e.set(0, yaw + Math.PI / 2 + Math.sin(T * 2.2 + k * 1.3 + it.seed * 5) * 0.4, 0); fq.setFromEuler(S._e);
        m.compose(w, fq, S._s.set(s, s, s)); L.ccFlag.add(m, { aTint: [[0.9, 0.92, 1], [0.24, 0.5, 0.9], [0.9, 0.2, 0.2]][k] });
      }
      const g = local(p, yaw, 0, 20 * s, -11 * s, S._o); glowAt(S, g.x, g.y, g.z, 34 * s, XENON, 0.18); poolAt(S, p.x, 0.12, p.z, 50 * s, XENON, 0.25);
    },
    // the stopwatch: ticking on the beat, running backward, or stopped at ten seconds
    ccWatch(S, it, p, q, yaw) {
      const L = S.layers; L.ccWatch; L.ccWatchFace; L.ccHand; L.ccLeg;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      let fy = yaw; const c = S._wc || (S._wc = new THREE.Vector3());
      if (it.over) { const sm = S.course.sample(it.t); fy = sm.yaw + Math.PI; c.set(p.x, sm.y + (it.lift ?? 20), p.z); } else c.set(p.x, (it.h ?? 0) + (it.y ?? 24), p.z);
      S._e.set(0, fy, Math.sin(T * 1.3 + it.t) * 0.04); const wq = (S._wq || (S._wq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, wq, S._s.set(s, s, s)); L.ccWatch.add(m); L.ccWatchFace.add(m);
      let sec;
      if (it.fixed !== undefined) sec = it.fixed;
      else if (it.back) sec = 60 - ((T - (it.go ?? 0)) * 24) % 60;
      else sec = Math.floor(S.course.beatAt ? S.course.beatAt(T) : T * 3) % 60;
      S._e.set(0, fy, -sec / 60 * Math.PI * 2); const hq = (S._hq2 || (S._hq2 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, hq, S._s.set(s, s, s)); L.ccHand.add(m);
      glowAt(S, c.x, c.y, c.z, 40 * s, [1, 0.97, 0.9], 0.16);
      if (!it.over) { const lp = S._lp || (S._lp = new THREE.Vector3()), q0 = S._q0 || (S._q0 = new THREE.Quaternion()); lp.set(c.x, it.h ?? 0, c.z); m.compose(lp, q0, S._s.set(1.6 * s, Math.max(0.1, c.y - (it.h ?? 0) - 13 * s), 1.6 * s)); L.ccLeg.add(m); }
    },
    // the pressure gauge, the needle going into the red and staying there, shaking
    ccGauge(S, it, p, q, yaw) {
      const L = S.layers; L.ccGauge; L.ccGaugeFace; L.ccNeedle;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S._gc || (S._gc = new THREE.Vector3()); c.set(p.x, (it.h ?? 0) + 52.8 * s, p.z);
      m.compose(c, q, S._s.set(s, s, s)); L.ccGauge.add(m); L.ccGaugeFace.add(m);
      const u = smooth(it.go, it.go + (it.dur ?? 2.4), T), th = Math.PI * (0.8 + 1.38 * u) + Math.sin(T * 47) * 0.05 * u + Math.sin(T * 13) * 0.04 * u;
      S._e.set(0, yaw, -(th + Math.PI / 2)); const nq = (S._nq || (S._nq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, nq, S._s.set(s, s, s)); L.ccNeedle.add(m);
      const f = local(c, yaw, 0, 0, 4 * s, S._o); glowAt(S, f.x, f.y, f.z, 36 * s, u > 0.8 ? [1, 0.4, 0.3] : [1, 0.95, 0.85], 0.2 + 0.2 * u);
    },
    // the stage, the spot on it, nobody on it
    ccStage(S, it, p, q, yaw) {
      const L = S.layers; L.ccStage; L.ccCone;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); L.ccStage.add(m);
      const on = smooth(it.spot ?? -1e9, (it.spot ?? -1e9) + 0.4, T), c = local(p, yaw, 0, 60 * s, 4 * s, S._o).clone(), q0 = S._q0 || (S._q0 = new THREE.Quaternion());
      m.compose(c, q0, S._s.set(s * 0.9, 55 * s, s * 0.9)); L.ccCone.add(m, { aK: on });
      const f = local(p, yaw, 0, 5.2 * s, 2 * s, S._o); poolAt(S, f.x, f.y, f.z, 18 * s, [1, 0.95, 0.85], 0.9 * on); glowAt(S, f.x, f.y + 10 * s, f.z, 30 * s, [1, 0.9, 0.75], 0.25 * on);
      for (const sd of [-1, 1]) { const w = local(p, yaw, sd * 21 * s, 42 * s, -2 * s, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, [1, 0.8, 0.5], 0.8); }
    },
    // the big curtain across the road: the frame, the two halves coming in, shut behind you
    ccCurtains(S, it, p) {
      const L = S.layers; L.ccArch; L.ccValance; L.ccCurtain;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), yaw = sm.yaw, m = S._m, top = sm.y + (it.top ?? 40);
      S._e.set(0, yaw, 0); const aq = (S._aq || (S._aq = new THREE.Quaternion())).setFromEuler(S._e);
      const g = S._ag || (S._ag = new THREE.Vector3()); g.set(p.x, 0, p.z);
      m.compose(g, aq, S._s.set(1, top, 1)); L.ccArch.add(m);
      const v = local(g, yaw, 0, top - 10, 0, S._o); m.compose(v, aq, S._s.set(1, 1, 1)); L.ccValance.add(m);
      const f = smooth(it.close0, it.close1, T) * 0.82 + smooth(it.t + 0.15, it.t + 0.9, T) * 0.18;
      const e = 44 - 44 * f;
      const cq = S._ccq || (S._ccq = new THREE.Quaternion());
      for (const sd of [-1, 1]) {
        const w = local(g, yaw, sd * e, 0, 0.5, S._o); S._e.set(0, yaw + (sd > 0 ? 0 : Math.PI), 0); cq.setFromEuler(S._e);
        m.compose(w, cq, S._s.set(1, top - 9, sd > 0 ? 1 : -1)); L.ccCurtain.add(m);
      }
      for (const sd of [-1, 1]) { const w = local(g, yaw, sd * 30, top + 2, 8, S._o); glowAt(S, w.x, w.y, w.z, 9, [1, 0.85, 0.6], 1.0); const pl = local(g, yaw, sd * 14, 0.2, -4, S._o); poolAt(S, pl.x, pl.y, pl.z, 40, [1, 0.5, 0.4], 0.4); }
      const c = local(g, yaw, 0, top * 0.5, 2, S._o); glowAt(S, c.x, c.y, c.z, 80, [1, 0.3, 0.3], 0.12);
    },
    // a toy rocket going up, over, and nose-first back into the ground
    ccToy(S, it, p) {
      const L = S.layers; L.ccRocket; L.ccPuff;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), yaw = sm.yaw, m = S._m, s = it.s ?? 0.16;
      const u = clamp((T - it.go) / it.dur, 0, 1), x0 = it.x0 ?? -40, x1 = it.x1 ?? 46, hm = it.hm ?? 64;
      const at = (uu, out) => local(p, yaw, x0 + (x1 - x0) * uu, (uu <= 0 ? 0 : 4 * hm * uu * (1 - uu)) + 3, (uu - 0.5) * 30, out);
      const w = at(u, S._o).clone();
      let phi = 0;
      if (u > 0 && u < 1) { const vx = x1 - x0, vy = 4 * hm * (1 - 2 * u); phi = Math.atan2(-vx, vy); }
      else if (u >= 1) { phi = Math.atan2(-(x1 - x0), -4 * hm) * 0.9; w.y = 3; }
      S._e.set(0, yaw, phi); const tq = (S._tq || (S._tq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(w, tq, S._s.set(s, s, s)); L.ccRocket.add(m);
      const pw = S._pw || (S._pw = new THREE.Vector3());
      if (u > 0 && u < 1) glowAt(S, w.x, w.y, w.z, 7, FLAME, 1.8);
      for (let k = 0; k < 26; k++) { const uu = u - k * 0.02; if (uu <= 0) break; at(uu, pw); const a = k * 0.02 * it.dur; m.makeScale(3 + a * 6, 3 + a * 6, 3 + a * 6); m.setPosition(pw.x, pw.y, pw.z); L.ccPuff.add(m, { aK: 0.9 * (1 - k / 26) }); }
      if (u >= 1) { const a = T - it.go - it.dur; for (let k = 0; k < 10; k++) { const h = hash(k * 3.7); local(p, yaw, x1 + (h - 0.5) * 6, 2 + a * (3 + h * 3) + k * 1.2, (hash(k) - 0.5) * 6, pw); const sz = 5 + a * 4 + k; m.makeScale(sz, sz, sz); m.setPosition(pw.x, pw.y, pw.z); L.ccPuff.add(m, { aK: Math.max(0, 1 - a / 6) * 0.8 }); } const e = local(p, yaw, x1, 2, 0, S._o); glowAt(S, e.x, e.y, e.z, 14, FLAME, Math.max(0, 1.4 - a * 0.5)); }
    },
    // ready, set, go; then no show: every lamp red
    ccTree(S, it, p, q, yaw) {
      const L = S.layers; L.ccTree; L.ccTreeLabel; L.ccLamp; L.ccLeg;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S._tc || (S._tc = new THREE.Vector3()); c.set(p.x, (it.h ?? 0) + (it.y ?? 26), p.z);
      m.compose(c, q, S._s.set(s, s, s)); L.ccTree.add(m); L.ccTreeLabel.add(m);
      legs(S, c, yaw, 9 * s, it.h ?? 0, c.y - 21 * s, s);
      const [tr, ts, tg, tno] = it.at, dead = T > tno;
      const flick = (t0) => (T > t0 && T < t0 + 0.6 ? (Math.sin((T - t0) * 40) > 0 ? 1 : 0.2) : 1);
      const lamps = [[12, T > tr ? 1 : 0, AMBER], [0, T > ts ? 1 : 0, AMBER], [-12, T > tg ? 1 : 0, [0.3, 1, 0.4]]];
      lamps.forEach(([y, on, cc], k) => {
        let k2 = on * (k === 0 ? flick(tr + 0.5) : k === 1 ? flick(ts + 0.65) : 1), cl = cc;
        if (dead) { cl = RED; k2 = (it.blinks || []).some((b) => T > b && T < b + 0.25) ? 0.15 : 1; }
        const w = local(c, yaw, 0, y * s, 0, S._o); m.compose(w, q, S._s.set(s, s, s));
        L.ccLamp.add(m, { aTint: [cl[0] * (0.08 + 2.2 * k2), cl[1] * (0.08 + 2.2 * k2), cl[2] * (0.08 + 2.2 * k2)] });
        const g = local(c, yaw, -6.5 * s, y * s, 1.5 * s, S._o); glowAt(S, g.x, g.y, g.z, 12 * s, cl, 1.3 * k2);
      });
    },
    // the broken clock over the door: the glass cracked, the hands going any way they like
    ccBroken(S, it, p) {
      const L = S.layers; L.ccWallClock; L.ccDial; L.ccCrack; L.ccHandL; L.ccHandS;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), m = S._m, s = it.s ?? 1, fy = sm.yaw + Math.PI;
      S._e.set(0, fy, 0); const fq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(S._e);
      const c = S._bc || (S._bc = new THREE.Vector3()); c.set(p.x, floorAt(S.course, it.t) + (it.y ?? 46), p.z);
      c.copy(local(c, fy, 0, 0, 1.4, S._o));
      m.compose(c, fq, S._s.set(s, s, s)); L.ccWallClock.add(m); L.ccDial.add(m); L.ccCrack.add(m);
      const tick = Math.floor(T * 3.12), big = Math.sin(tick * 2.3) * 3 + tick * 0.9, small = -T * 2.6 + Math.sin(T * 7) * 0.6;
      const hq = S._hq3 || (S._hq3 = new THREE.Quaternion());
      for (const [lay, a] of [[L.ccHandL, big], [L.ccHandS, small]]) { S._e.set(0, fy, a); hq.setFromEuler(S._e); m.compose(c, hq, S._s.set(s, s, s)); lay.add(m); }
      const f = local(c, fy, 0, 0, 6 * s, S._o); glowAt(S, f.x, f.y, f.z, 34 * s, [1, 0.97, 0.9], 0.2);
    },
    // hung over the road: the exit, the screens, the review
    ccHung(S, it, p) {
      const L = S.layers; L.ccExit; L.ccExitFace; L.ccScreen; L.ccScreenFace; L.ccClip; L.ccClipFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw; S._e.set(0, h + Math.PI + Math.sin(T * 0.9 + it.t) * 0.06, Math.sin(T * 1.2 + it.t) * 0.025); const fq = (S._hgq || (S._hgq = new THREE.Quaternion())).setFromEuler(S._e);
      const k = it.kind, s = (it.s ?? 1) * ({ exit: 0.75, screen: 0.6, review: 0.6 }[k] ?? 1);
      p.y = sm.y + (it.lift ?? 16);
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s));
      const on = S.ccLights ?? 1;
      if (k === 'exit') { L.ccExit.add(m); L.ccExitFace.add(m); glowAt(S, p.x, p.y, p.z, 30 * s, [0.3, 1, 0.5], 0.3); }
      else if (k === 'screen') { L.ccScreen.add(m); L.ccScreenFace.add(m, { aCell: it.cell ?? 0, aOn: 0.25 + 0.75 * on }); glowAt(S, p.x, p.y, p.z, 40 * s, it.cell ? [0.5, 0.8, 1] : [0.9, 0.95, 1], 0.25 * on); }
      else if (k === 'review') { L.ccClip.add(m); L.ccClipFace.add(m); glowAt(S, p.x, p.y, p.z, 34 * s, [1, 0.95, 0.85], 0.22); }
    },
    // rows of desks down both sides of mission control, their screens on until the lights go
    ccConsoles(S, it, p, q) {
      const L = S.layers; L.ccConsole; L.ccConsoleFace;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ccConsole.add(m);
      const on = S.ccLights ?? 1; L.ccConsoleFace.add(m, { aCell: it.cell, aOn: 0.15 + 0.85 * on * (0.85 + 0.15 * Math.sin((S.tNow ?? 0) * 3 + it.seed * 20)) });
    },
    // the participation trophy on its plinth, turning slowly in a spot
    ccTrophy(S, it, p, q, yaw) {
      const L = S.layers; L.ccTrophy; L.ccPlinth; L.ccCone;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); L.ccPlinth.add(m);
      const c = local(p, yaw, 0, 15 * s, 0, S._o).clone(); S._e.set(0, yaw + T * 0.8, 0); const tq = (S._trq || (S._trq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, tq, S._s.set(s, s, s)); L.ccTrophy.add(m);
      const on = smooth(it.spot ?? -1e9, (it.spot ?? -1e9) + 0.3, T), top = (it.h ?? 0) + (it.ceil ?? 36), cc = S._tcc || (S._tcc = new THREE.Vector3()); cc.set(p.x, top, p.z);
      m.compose(cc, S._q0 || (S._q0 = new THREE.Quaternion()), S._s.set(s * 1.3, top - p.y - 14 * s, s * 1.3)); L.ccCone.add(m, { aK: on });
      glowAt(S, c.x, c.y + 18 * s, c.z, 28 * s, [1, 0.85, 0.4], 0.35 * on); poolAt(S, p.x, (it.h ?? 0) + 0.1, p.z, 30 * s, [1, 0.92, 0.75], 0.6 * on);
      for (let k = 0; k < 5; k++) { const a = T * 1.7 + k * 1.26, w = local(c, yaw, Math.cos(a) * 9 * s, (12 + Math.sin(a * 1.3) * 10) * s, Math.sin(a) * 9 * s, S._o); if (Math.sin(T * 7 + k * 2) > 0.4) glowAt(S, w.x, w.y, w.z, 2 * s, [1, 0.9, 0.6], 1.1 * on); }
    },
    // five stars on a wire over the road: one out of five
    ccStars(S, it, p) {
      const L = S.layers; L.ccStar; L.ccWire;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), yaw = sm.yaw, m = S._m, s = it.s ?? 1, y = sm.y + (it.lift ?? 15);
      const c = S._sc || (S._sc = new THREE.Vector3()); c.set(p.x, y + 6 * s, p.z);
      S._e.set(0, yaw, 0); const wq = (S._swq || (S._swq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, wq, S._s.set(70 * s, 1, 1)); L.ccWire.add(m);
      const on = smooth(it.on, it.on + 0.25, T), sq = S._sq || (S._sq = new THREE.Quaternion());
      for (let k = 0; k < 5; k++) {
        const w = local(c, yaw, (2 - k) * 11 * s, -6 * s, 0, S._o).clone();
        S._e.set(0, yaw + Math.PI + Math.sin(T * 1.4 + k) * 0.25, Math.sin(T * 1.1 + k * 2) * 0.08); sq.setFromEuler(S._e);
        const lt = k === 0 ? on : 0;
        m.compose(w, sq, S._s.set(s, s, s)); L.ccStar.add(m, { aTint: lt > 0 ? [1.0 + 1.6 * lt, 0.8 + 1.1 * lt, 0.2 + 0.2 * lt] : [0.1, 0.1, 0.12] });
        if (lt > 0) glowAt(S, w.x, w.y, w.z, 16 * s, [1, 0.8, 0.3], 1.2 * lt);
        const st = local(c, yaw, (2 - k) * 11 * s, -1.7 * s, 0, S._o); m.makeScale(0.16, 3.4 * s, 0.16); m.setPosition(st.x, st.y, st.z); L.ccWire.add(m);
      }
    },
    // ground control's dish, turning, looking for something
    ccDish(S, it, p, q, yaw) {
      const L = S.layers; L.ccDish;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, dy = yaw + Math.sin(T * 0.5 + it.seed * 4) * 0.9;
      S._e.set(0, dy, 0); const dq = (S._dq || (S._dq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, dq, S._s.set(s, s, s)); L.ccDish.add(m);
      const f = local(p, dy, 0, (26 + 12 * Math.cos(0.75) + 1.5) * s, 12 * Math.sin(0.75) * s, S._o); glowAt(S, f.x, f.y, f.z, 4 * s, RED, Math.sin(T * 3) > 0 ? 1.5 : 0.2);
      poolAt(S, p.x, 0.12, p.z, 50 * s, XENON, 0.25);
    },
    // the rocket stuck nose-first in a hole by the road, still smoking
    ccStuck(S, it, p, q, yaw) {
      const L = S.layers; L.ccRocket; L.ccCrater; L.ccPuff;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 0.5, m = S._m;
      m.compose(p, q, S._s.set(s * 2.2, 1, s * 2.2)); L.ccCrater.add(m);
      S._e.set(0, yaw, Math.PI + (it.tilt ?? 0.35)); const rq = (S._rq || (S._rq = new THREE.Quaternion())).setFromEuler(S._e);
      const c = local(p, yaw, 0, 52 * s, 0, S._o); m.compose(c, rq, S._s.set(s, s, s)); L.ccRocket.add(m);
      const w = S._pw || (S._pw = new THREE.Vector3());
      for (let k = 0; k < 18; k++) { const a = ((T * 0.35 + k / 18) % 1), h = hash(k * 5.3); local(p, yaw, (h - 0.5) * 18 * s + a * 10 * s, (4 + a * 60) * s, (hash(k * 2.1) - 0.5) * 18 * s, w); const sz = (10 + a * 30) * s; m.makeScale(sz, sz, sz); m.setPosition(w.x, w.y, w.z); L.ccPuff.add(m, { aK: 0.7 * (1 - a) * Math.min(1, a * 8) }); }
      const g = local(p, yaw, 0, 3, 0, S._o); glowAt(S, g.x, g.y, g.z, 30 * s, FLAME, 0.6 + 0.3 * Math.sin(T * 9));
    },
    // the eight ball, turning round to give its answer
    ccEight(S, it, p, q, yaw) {
      const L = S.layers; L.ccEight; L.ccEightWin;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S._ec || (S._ec = new THREE.Vector3());
      const turn = smooth(it.turn, it.turn + 0.7, T), bob = Math.sin(T * 1.6) * 0.8 * s;
      c.set(p.x, (it.h ?? 0) + 14 * s + bob, p.z);
      S._e.set(Math.sin(T * 0.9) * 0.08, yaw + turn * Math.PI, Math.sin(T * 1.2) * 0.06); const eq = (S._eq || (S._eq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(c, eq, S._s.set(s, s, s)); L.ccEight.add(m); L.ccEightWin.add(m);
      const f = local(c, yaw, 0, 2 * s, 14 * s, S._o); glowAt(S, f.x, f.y, f.z, 30 * s, [0.5, 0.6, 1], 0.12 + 0.35 * turn);
      poolAt(S, p.x, 0.12, p.z, 40 * s, [0.6, 0.7, 1], 0.2);
    },
    // the launch board: nine attempts, nine scrubbed
    ccScrub(S, it, p, q, yaw) {
      const L = S.layers; L.ccScrub; L.ccScrubFace; L.ccLeg;
      if (!S.track) return;
      const s = it.s ?? 1, m = S._m, c = S._uc || (S._uc = new THREE.Vector3()); c.set(p.x, (it.h ?? 0) + (it.y ?? 24), p.z);
      m.compose(c, q, S._s.set(s, s, s)); L.ccScrub.add(m); L.ccScrubFace.add(m);
      legs(S, c, yaw, 12 * s, it.h ?? 0, c.y - 11 * s, s, -1.4);
      const f = local(c, yaw, 0, 0, 5 * s, S._o); glowAt(S, f.x, f.y, f.z, 40 * s, [1, 0.3, 0.2], 0.16);
    },
    // his lines on the site's signs, hung over the road
    ccSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._csq || (S._csq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.ccSignBoard.add(m); S.layers.ccSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o;
      for (const sd of [-1, 1]) { local(p, h + Math.PI, sd * 11.6 * s, 5.9 * s, 0.4 * s, w); glowAt(S, w.x, w.y, w.z, 2.6 * s, RED, Math.sin(T * 4 + sd) > 0 ? 1.3 : 0.12); }
      glowAt(S, p.x, p.y, p.z, 30 * s, XENON, 0.12);
    },
  },
  kits: {
    ccClock(S, z) { prepare(S.course, S.plan); for (const c of [].concat(z.at)) S.items.push({ t: c.t, x: c.x ?? 0, rot: c.x ? FACE(c.x) : 0, over: !c.x, lift: c.lift, y: c.y, h: 0, s: c.s ?? z.s ?? 0.7, seq: c.seq, tick: c.tick, blink: c.blink, parts: 'ccClock', ahead: z.ahead ?? 46 }); },
    ccPad(S, z) { for (const c of [].concat(z.at)) S.items.push({ t: c.t, x: c.x, rot: c.rot ?? 0, s: c.s ?? 1, burn: c.burn, h: 0, parts: 'ccPad' }); },
    ccFloods(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 1.6) { const side = k++ % 2 ? 1 : -1; S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 52) + R() * 10), rot: SIDE(side), s: z.s ?? 1, seed: R(), h: 0, parts: 'ccFlood', ahead: z.ahead ?? 40 }); } },
    ccBeacons(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) S.items.push({ t: t + R(), x: (R() < 0.5 ? -1 : 1) * (160 + R() * 260), y: 30 + R() * 60, seed: R(), parts: 'ccBeacon' }); },
    ccStands(S, z, R) { for (const [t, x] of z.at) S.items.push({ t, x, rot: SIDE(x), s: z.s ?? 1, seed: R(), h: 0, parts: 'ccStands', ahead: 40 }); },
    ccWatch(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: z.x ? FACE(z.x) : 0, over: !z.x, lift: z.lift, y: z.y, h: 0, s: z.s ?? 1, fixed: z.fixed, back: z.back, go: z.go, parts: 'ccWatch', ahead: z.ahead ?? 40 }); },
    ccGauge(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x), h: 0, s: z.s ?? 1, go: z.go, dur: z.dur, parts: 'ccGauge', ahead: z.ahead ?? 40 }); },
    ccStage(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x), h: 0, s: z.s ?? 1, spot: z.spot, parts: 'ccStage', ahead: z.ahead ?? 40 }); },
    ccCurtains(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: 0, top: z.top, close0: z.close0, close1: z.close1, parts: 'ccCurtains', ahead: 46 }); },
    ccToy(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: 0, go: z.go, dur: z.dur, x0: z.x0, x1: z.x1, hm: z.hm, s: z.s, parts: 'ccToy', ahead: 46 }); },
    ccTree(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x), h: 0, y: z.y, s: z.s ?? 1, at: z.times, blinks: z.blinks, parts: 'ccTree', ahead: 40 }); },
    ccBroken(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: 0, y: z.y, s: z.s ?? 1, parts: 'ccBroken', ahead: 46 }); },
    ccHung(S, z) { prepare(S.course, S.plan); for (const [t, kind, x, cell] of z.at) S.items.push({ t, x: x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, kind, cell, parts: 'ccHung', ahead: z.ahead ?? 30 }); },
    ccConsoles(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.32) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.04, x: side * (z.x ?? 32), rot: SIDE(side), s: z.s ?? 1, cell: R() < 0.5 ? 0 : 1, seed: R(), parts: 'ccConsoles', ahead: z.ahead ?? 24 })); },
    ccTrophy(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, spot: z.spot, ceil: z.ceil, parts: 'ccTrophy', ahead: 30 })); },
    ccStars(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: 0, on: z.on, lift: z.lift, s: z.s ?? 1, parts: 'ccStars', ahead: 40 }); },
    ccDish(S, z, R) { S.items.push({ t: z.at, x: z.x, rot: SIDE(z.x) + (z.x > 0 ? 0.6 : -0.6), h: 0, s: z.s ?? 1, seed: R(), parts: 'ccDish', ahead: 46 }); },
    ccStuck(S, z) { S.items.push({ t: z.at, x: z.x, rot: z.rot ?? 0, h: 0, s: z.s ?? 0.5, tilt: z.tilt, parts: 'ccStuck', ahead: 46 }); },
    ccEight(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x), h: 0, s: z.s ?? 1, turn: z.turn, parts: 'ccEight', ahead: 40 }); },
    ccScrub(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x), h: 0, y: z.y, s: z.s ?? 1, parts: 'ccScrub', ahead: 40 }); },
  },
});

// ---------- mission control ----------
const flatRing = (W = 40, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const CONTROL = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { control: 0 },
  dims: { control: [46, 36] },
  lights: (id) => ({ 0: [24, 12] }[id] || null),
};

function controlMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLights: { value: 1 }, uA: { value: new THREE.Color(0x7ad0ff) }, uB: { value: new THREE.Color(0xffb040) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uLights;
      uniform vec3 uFog, uCam, uLight, uA, uB;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        float dl = mod(along, 24.0) - 12.0;
        float lightK = (0.55 + 0.5 * exp(-dl * dl / 70.0)) * uLights + 0.12;
        vec3 glow = vec3(0.0);
        vec3 col;
        float scr = 0.3 + 0.7 * uLights;
        if (part == 7) {
          // the building from outside: pale concrete in panels, a band of dark glass lit blue inside
          vec2 q = vec2(x / 9.0, h / 6.0);
          col = vec3(0.62, 0.62, 0.6) * (0.85 + 0.15 * n2(vec2(x, h) * 0.2)) * (0.86 + 0.14 * edge(fract(q), 0.03));
          float band = step(56.0, h) * step(h, 66.0);
          col = mix(col, vec3(0.04, 0.06, 0.09), band);
          float win = band * step(0.12, fract(x / 7.0)) * step(0.3, h2(vec2(floor(x / 7.0), 3.0)));
          glow += uA * win * 0.35 * (0.6 + 0.4 * h2(vec2(floor(x / 7.0), 1.0)));
          col *= 0.42;
        }
        else if (part == 8) { col = vec3(0.1, 0.11, 0.13); glow += uA * 0.5 * step(abs(fract(h * 0.25) - 0.5), 0.06); }
        else {
          if (part == 0) {
            // raised floor: dark tiles, the seams
            vec2 q = vec2(x, along) / 4.0; col = vec3(0.13, 0.15, 0.19) * (0.8 + 0.2 * h2(floor(q))) * (0.8 + 0.2 * edge(fract(q), 0.04));
          } else if (part == 3) {
            // the ceiling: dark, a long light panel over each row
            col = vec3(0.06, 0.07, 0.09);
            float panel = step(abs(abs(x) - 16.0), 3.0) * step(abs(dl), 8.0);
            glow += vec3(0.85, 0.92, 1.0) * panel * 0.9 * uLights;
          } else {
            // the walls: tiers of desks with their screens, and over them the big displays
            col = vec3(0.12, 0.13, 0.16) * (0.9 + 0.1 * n2(vec2(wa, h) * 0.3));
            float notCap = part == 6 ? 0.0 : 1.0;
            for (int k = 0; k < 3; k++) {
              float y0 = 3.0 + float(k) * 4.2;
              vec2 sq = vec2(mod(wa + float(k) * 2.1, 4.2), h - y0);
              float s = step(0.4, sq.x) * step(sq.x, 3.6) * step(0.0, sq.y) * step(sq.y, 2.2);
              float id = h2(vec2(floor((wa + float(k) * 2.1) / 4.2), float(k)));
              vec3 sc = id < 0.6 ? uA : id < 0.85 ? vec3(0.3, 1.0, 0.45) : uB;
              float line = step(0.5, fract(sq.y * 2.6 + 0.2)) * step(0.15, h2(vec2(floor(sq.y * 2.6), floor(wa / 4.2) + float(k) * 7.0 + floor(uTime * 2.0 + id * 8.0))));
              glow += sc * s * (0.12 + 0.55 * line * step(sq.x, 0.6 + 2.8 * h2(vec2(floor(sq.y * 2.6), id * 9.0)))) * scr * notCap;
              col = mix(col, vec3(0.03), s * notCap);
            }
            // the big displays up the walls: a grid, a trajectory that comes back down, a dot that never gets far
            float big = step(16.0, h) * step(h, 31.0);
            vec2 dq = vec2(mod(wa, 26.0), h - 16.0);
            float frame = big * step(1.0, dq.x) * step(dq.x, 25.0);
            col = mix(col, vec3(0.01, 0.02, 0.04), frame);
            vec2 gg = abs(fract(dq / 3.0) - 0.5);
            glow += uA * 0.06 * frame * step(min(gg.x, gg.y), 0.04);
            float pid = h2(vec2(floor(wa / 26.0), 5.0));
            float u = (dq.x - 1.0) / 24.0, arc = 1.0 + 13.0 * sin(clamp(u, 0.0, 1.0) * 3.14159) * (0.6 + 0.4 * h2(vec2(floor(wa / 26.0), 2.0)));
            float tr = smoothstep(0.35, 0.0, abs(dq.y - arc)) * step(u, fract(uTime * 0.1 + pid));
            glow += mix(uA, vec3(1.0, 0.3, 0.2), step(0.5, u)) * tr * frame * 0.9 * scr;
            float dt = smoothstep(0.9, 0.3, length(vec2(dq.x - 1.0 - 24.0 * fract(uTime * 0.1 + pid), dq.y - arc)));
            glow += vec3(1.0, 0.4, 0.3) * dt * frame * 1.4 * scr;
            glow += uA * 0.35 * step(abs(h - 33.5), 0.3) * notCap * (0.3 + 0.7 * uLights);
          }
        }
        col *= lightK * uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the pad in the morning, the clock at zero, the rocket still standing on it ----------
function digitMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uCell: { value: 0 }, uK: { value: 1.35 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uCell, uK; varying vec2 vUv; void main(){ float c = mod(uCell, 4.0), r = floor((uCell + 0.5) / 4.0); vec3 t = texture2D(tMap, vec2((c + vUv.x) / 4.0, 1.0 - (r + 1.0 - vUv.y) / 3.0)).rgb; vec2 lq = vUv * vec2(88.0, 44.0); float near = clamp(1.6 - 2.0 * max(fwidth(lq.x), fwidth(lq.y)), 0.0, 1.0); t *= mix(0.85, 0.45 + 0.9 * smoothstep(0.5, 0.2, length(fract(lq) - 0.5)), near); gl_FragColor = vec4(t * uK, 1.0); }`,
    side: THREE.DoubleSide,
  });
}
export class RocketFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -60;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const rs = 0.8;
    this.group.add(new THREE.Mesh(LG.pad(), selfLit({ roughness: 0.9 }, 0.08)));
    this.rocket = new THREE.Mesh(LG.rocket(), selfLit({ roughness: 0.45, metalness: 0.15 }, 0.22)); this.rocket.position.set(0, 6, 0); this.rocket.scale.setScalar(rs); this.group.add(this.rocket);
    const tw = new THREE.Mesh(LG.tower(), selfLit({ roughness: 0.6, metalness: 0.3 }, 0.12)); tw.position.set(-20 * rs, 6, 0); tw.scale.setScalar(rs); this.group.add(tw);
    // the clock by the pad, facing the road
    const cy = cfg.clockY ?? 30;
    this.clock = new THREE.Group(); this.clock.position.set(cfg.clockX ?? 40, cy, cfg.clockZ ?? 10); this.clock.rotation.y = cfg.clockRot ?? 0; this.group.add(this.clock);
    this.clock.add(new THREE.Mesh(LG.clock(), selfLit({ roughness: 0.5, metalness: 0.4 }, 0.12)));
    this.digits = digitMaterial(tex().digits); this.clock.add(new THREE.Mesh(LG.clockFace(), this.digits));
    const legM = new THREE.MeshStandardMaterial({ color: 0x5a5e68, roughness: 0.6, metalness: 0.5, emissive: 0x0c0e12 });
    const cs = cfg.clockS ?? 0.8;
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(LG.leg(), legM); l.position.set(sd * 15, -cy / cs, -1.9); l.scale.set(1, cy / cs - 11, 1); this.clock.add(l); }
    this.clock.scale.setScalar(cs);
    for (const [fx, fz] of [[46, 34], [-46, 34], [46, -34], [-46, -34]]) { const f = new THREE.Group(); f.position.set(fx, 0, fz); f.rotation.y = Math.atan2(-fx, -fz); f.add(new THREE.Mesh(LG.flood(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4, emissive: 0x0a0c10 }))); f.add(new THREE.Mesh(LG.floodLamps(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1).multiplyScalar(2.4), side: THREE.DoubleSide }))); this.group.add(f); }
    this.group.scale.setScalar(cfg.s ?? 1);
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? 0), 0);
    const c = this.cfg, seq = c.seq || [[-1e9, 10]];
    let cell = seq[0][1]; for (const [t0, k] of seq) if (songT >= t0) cell = k;
    this.digits.uniforms.uCell.value = cell;
    // zero: the engines light, shake it, and die
    const bf = c.burnFor ?? 1.6, burn = smooth(c.zero, c.zero + 0.2, songT) * (1 - smooth(c.zero + bf, c.zero + bf + 0.8, songT));
    const sh = burn * 0.25;
    this.rocket.position.set(Math.sin(songT * 41) * sh, 6, Math.cos(songT * 37) * sh);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const W = this._w, mw = this.group.matrixWorld, s = c.s ?? 1;
    for (const [fx, fz] of [[46, 34], [-46, 34], [46, -34], [-46, -34]]) { const a = Math.atan2(-fx, -fz); W.set(fx + Math.sin(a) * 2, 52, fz + Math.cos(a) * 2).applyMatrix4(mw); S.glow(W.x, W.y, W.z, 16 * s, XENON, 0.6); }
    W.set(0, 0.2, 0).applyMatrix4(mw); S.pool(W.x, 0.2, W.z, 110 * s, XENON, 0.12 + 0.7 * burn);
    W.set(-16, 6 + 99, 0).applyMatrix4(mw); S.glow(W.x, W.y, W.z, 5 * s, RED, Math.sin(songT * 3) > 0.2 ? 1.5 : 0.1);
    this.clock.updateMatrixWorld(true); W.set(0, 0, 3).applyMatrix4(this.clock.matrixWorld); S.glow(W.x, W.y, W.z, 44 * s, cell >= 10 ? RED : AMBER, 0.18);
    if (burn > 0.01) { W.set(0, 8, 0).applyMatrix4(mw); const fl = 0.75 + 0.25 * Math.sin(songT * 53) * Math.sin(songT * 31); S.glow(W.x, W.y, W.z, 36 * s * fl, FLAME, 2.4 * burn); S.pool(W.x, 0.25, W.z, 90 * s, FLAME, 0.9 * burn); }
    // the smoke from the trench, rolling out and hanging there in the morning
    const life = 7, step = 0.08, a0 = c.zero, b0 = c.zero + bf, m = this._m, puff = S.layers.ccPuff;
    if (songT > a0) {
      const first = a0 + Math.max(0, Math.ceil((songT - life - a0) / step)) * step;
      for (let ts = first; ts <= Math.min(songT, b0); ts += step) {
        const age = songT - ts;
        for (const sd of [-1, 1]) {
          const h = hash(ts * 37.1 + sd * 3.3), g = hash(ts * 11.7 + sd);
          W.set((h - 0.5) * 16, 4 + age * 6 + age * age * 0.6 + g * 6, sd * (31 + age * 11 * (1 - age / 20))).applyMatrix4(mw);
          const sz = (7 + age * 6 + g * 5) * s; m.makeScale(sz, sz, sz); m.setPosition(W.x, W.y, W.z); puff.add(m, { aK: Math.pow(1 - age / life, 2) * Math.min(1, age * 6) * 0.6 });
        }
      }
    }
  }
}

// ---------- the place, per frame ----------
export class LaunchWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = controlMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, CONTROL));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uA.value.set(P.fret ?? 0x7ad0ff); u.uB.value.set(P.hold ?? 0xffb040);
    // the lights going out, one bank at a time
    const off = ev.off || [];
    let lights = 1; for (const k of off) if (t > k) lights -= 1 / off.length;
    u.uLights.value += (Math.max(0, lights) - u.uLights.value) * Math.min(1, dt * 12);
    S.town.ccLights = u.uLights.value;
    const nv = ev.nerves; S.town.ccNerves = nv ? smooth(nv[0], nv[0] + 0.3, t) * (1 - smooth(nv[1], nv[1] + 0.5, t)) : 0;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats;
    if (M.ccPuffM) M.ccPuffM.uniforms.uCol.value.set(P.smoke ?? 0xd8dce8);
  }
  // the panels in mission control's ceiling
  draw(T) {
    const g = this._g, on = this.mat.uniforms.uLights.value;
    if (on < 0.02) return;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        for (const x of [-16, 16]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1.5, g.z, 10, [0.85, 0.92, 1], 0.7 * on); }
        this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 46, [0.8, 0.9, 1], 0.3 * on);
      }
    }
  }
}
