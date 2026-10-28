// Your Wife, My Number: the end. The glass house at dusk, every room lit: a travertine terrace,
// the pool glowing with the house upside down in it, the ground floor all glass (the fire, the
// long table, the island under its pendants, the stair, the paintings), the upper floor
// cantilevered out over the lawn with its ribbon window, wood soffits with their downlights,
// cypresses black against the sky. Upstairs she's at the window with her phone lit; downstairs
// he sits alone at the end of the long table. Across the glass, in lipstick: the number from
// the napkin. Her car on the drive. String lights over the terrace, fireworks if she earned them.
//
// House-local: +z is the front (toward the road), x along the front, y up from the lawn.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { groundAt, prepare } from './trail.js';
import { box, cyl, sph, lathe, tube, V, rgb, paint, shade, merge, seeded, vcMat, canvasTex, clamp, smooth, TAU } from './ywn-lib.js';

const D = 2.0;                                     // the terrace's top
const GF = { x0: -34, x1: 30, z0: -16, z1: -2, y0: D, y1: D + 5.2 };     // the glass ground floor
const UF = { x0: -22, x1: 42, z0: -18, z1: 1, y0: 8.0, y1: 13.0 };      // the cantilevered upper floor
const POOL = { x0: -30, x1: 30, z0: 6, z1: 34, y: D - 0.16 };

// ---------- pictures ----------
// three paintings for the back wall: colour fields in her colours
function artTexture() {
  return canvasTex(1536, 512, (g) => {
    const R = seeded(77);
    const field = (x0, cols) => {
      g.fillStyle = cols[0]; g.fillRect(x0, 0, 512, 512);
      for (let k = 1; k < cols.length; k++) { g.globalAlpha = 0.85; g.fillStyle = cols[k]; const y = 40 + (k - 1) * (430 / (cols.length - 1)); g.fillRect(x0 + 40 + R() * 20, y, 420 + R() * 20, 430 / (cols.length - 1) - 24); }
      g.globalAlpha = 1;
      for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,255,255,${0.03 * R()})`; g.fillRect(x0 + R() * 512, R() * 512, 30 * R(), 2); }
    };
    field(0, ['#e8c060', '#d8484a', '#f2d8a0', '#2a4a48']);
    field(512, ['#1e3a2a', '#e0b84a', '#c8d8c8']);
    field(1024, ['#f0c8c8', '#c0204a', '#f8eee4', '#e8a040']);
  });
}
// the number in lipstick across the glass, a kiss after it
function lipstickTexture() {
  return canvasTex(2048, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(880, 280); g.rotate(-0.07);
    g.font = 'italic 700 250px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const R = seeded(5);
    // waxy strokes: the same words laid down a few times, a little off each time
    for (let k = 0; k < 7; k++) { g.globalAlpha = 0.28 + 0.1 * R(); g.fillStyle = k % 2 ? '#c8102a' : '#e01834'; g.fillText('555-0173', (R() - 0.5) * 7, (R() - 0.5) * 7); }
    g.globalAlpha = 0.9; g.fillStyle = '#d0142c'; g.fillText('555-0173', 0, 0);
    // a line under it, quick
    g.globalAlpha = 0.85; g.strokeStyle = '#d0142c'; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-560, 150); g.bezierCurveTo(-200, 190, 260, 175, 600, 120); g.stroke();
    g.restore();
    // the kiss
    g.save(); g.translate(1720, 250); g.rotate(-0.2); g.fillStyle = '#c80e28'; g.globalAlpha = 0.92;
    g.beginPath(); g.moveTo(-150, 0); g.bezierCurveTo(-90, -80, -25, -55, 0, -28); g.bezierCurveTo(25, -55, 90, -80, 150, 0); g.bezierCurveTo(75, -8, -75, -8, -150, 0); g.fill();
    g.beginPath(); g.moveTo(-150, 8); g.bezierCurveTo(-75, 16, 75, 16, 150, 8); g.bezierCurveTo(90, 100, -90, 100, -150, 8); g.fill();
    g.globalAlpha = 0.35; g.strokeStyle = '#7a0010'; g.lineWidth = 3;
    for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * 20, -40); g.lineTo(k * 22, -6); g.stroke(); g.beginPath(); g.moveTo(k * 20, 14); g.lineTo(k * 22, 70); g.stroke(); }
    g.restore();
  });
}

// ---------- shaders ----------
const FOGV = /* glsl */`varying vec3 vW;`;
// glass: the sky in it at an angle, the lit rooms through it face on
const GLASS_VS = /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * (viewMatrix * w); }`;
const GLASS_FS = /* glsl */`
  uniform vec3 uZen, uHor, uSun, uSunDir, uCam, uFog; uniform float uFogD;
  varying vec3 vW; varying vec3 vN;
  void main(){
    vec3 V = normalize(uCam - vW), N = normalize(vN);
    if (dot(N, V) < 0.0) N = -N;
    float c = clamp(dot(V, N), 0.0, 1.0);
    float fres = 0.12 + 0.88 * pow(max(1.0 - c, 0.0), 4.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHor, uZen, smoothstep(-0.02, 0.55, R.y));
    sky += uSun * pow(max(dot(R, normalize(uSunDir)), 0.0), 48.0) * 1.6;
    vec3 grd = uHor * 0.18;
    vec3 refl = mix(grd, sky, smoothstep(-0.12, 0.02, R.y));
    // long soft streaks across the panes, so even face on it reads as glass
    float st = pow(max(sin((vW.x + vW.z) * 0.21 + vW.y * 0.32), 0.0), 6.0) * 0.07;
    float a = clamp(fres + st, 0.0, 0.92);
    float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogD, 1.5));
    gl_FragColor = vec4(mix(refl, uFog, clamp(fog, 0.0, 1.0)), a);
  }`;
// the soffits: warm wood boards, a downlight every few metres pooling on them
const SOFFIT_FS = /* glsl */`
  uniform vec3 uCam, uFog; uniform float uFogD, uLit;
  varying vec3 vW; varying vec3 vL;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    float board = floor(vL.z / 0.42);
    vec3 wood = vec3(0.62, 0.36, 0.17) * (0.82 + 0.3 * h2(vec2(board, 3.0))) * (0.9 + 0.1 * sin(vL.x * 3.1 + board * 7.0));
    wood *= 0.92 + 0.08 * smoothstep(0.0, 0.05, fract(vL.z / 0.42));
    vec2 g = vec2(mod(vL.x + 1.5, 3.0) - 1.5, mod(vL.z + 1.5, 3.0) - 1.5);
    float r = length(g);
    float spot = exp(-r * r * 0.9);
    vec3 col = wood * (0.42 + 1.25 * spot * uLit) + vec3(1.6, 1.35, 1.0) * smoothstep(0.16, 0.08, r) * uLit;
    float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogD, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;
const LOCAL_VS = /* glsl */`varying vec3 vW; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`;
// the pool: lit turquoise from under, a web of light on its floor, and the house in it upside down
// (a reflection worked out against the house's front: its lit glass, its slabs, the sky over it)
const POOL_FS = /* glsl */`
  uniform float uTime, uLit; uniform vec3 uCamL, uZen, uHor, uCam, uFog; uniform float uFogD;
  varying vec3 vW; varying vec3 vL;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float cell(vec2 p){ vec2 i = floor(p), f = fract(p); float m = 1.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(float(x), float(y)); vec2 r = o + 0.5 + 0.4 * sin(uTime * 0.9 + 6.2831 * vec2(h2(i + o), h2(i + o + 9.1))) - f; m = min(m, dot(r, r)); } return m; }
  vec3 facade(vec2 h){
    // h: x along the front, y up. Lit glass, slab edges, the stone wall, sky above the roof
    vec3 sky = mix(uHor, uZen, smoothstep(13.6, 40.0, h.y));
    if (h.y > 13.6 || h.x < -40.0 || h.x > 46.0) return sky;
    if (h.x < -34.0) return vec3(0.42, 0.38, 0.33) * (h.y < 15.0 ? 1.0 : 0.0) + sky * step(15.0, h.y);
    vec3 warm = vec3(1.25, 0.82, 0.46) * uLit;
    if (h.y > 13.0) return vec3(0.32, 0.3, 0.3);
    if (h.y > 8.8 && h.y < 12.4 && h.x > -20.0 && h.x < 40.0) return warm * (0.85 + 0.15 * step(0.06, fract(h.x / 5.0)));
    if (h.y > 7.2 && h.y < 13.0 && h.x > -22.0 && h.x < 42.0) return vec3(0.3, 0.29, 0.28);
    if (h.y > 7.2 && h.y < 8.0) return vec3(0.3, 0.29, 0.28);
    if (h.y > 2.0 && h.y < 7.2 && h.x < 30.0) return warm * (0.75 + 0.25 * step(0.04, fract(h.x / 4.0)));
    if (h.y < 2.0) return vec3(0.18, 0.16, 0.14);
    return sky;
  }
  void main(){
    vec2 q = vL.xz;
    float t = uTime;
    vec2 nrm = vec2(sin(q.x * 1.1 + t * 1.3) + 0.6 * sin(q.x * 2.3 - q.y * 1.7 + t * 1.9), sin(q.y * 1.4 - t * 1.1) + 0.6 * sin(q.y * 2.9 + q.x * 0.7 + t * 2.3)) * 0.035;
    vec3 N = normalize(vec3(nrm.x, 1.0, nrm.y));
    vec3 Vw = normalize(uCamL - vL);
    vec3 R = reflect(-Vw, N);
    vec3 refl;
    if (R.z < -0.02) { float s = (-1.0 - vL.z) / R.z; vec3 hh = vL + R * s; refl = facade(hh.xy); }
    else refl = mix(uHor, uZen, smoothstep(0.0, 0.5, R.y));
    // under the water: lights in the walls, a web of light on the floor
    float edge = min(min(vL.x - ${POOL.x0.toFixed(1)}, ${POOL.x1.toFixed(1)} - vL.x), min(vL.z - ${POOL.z0.toFixed(1)}, ${POOL.z1.toFixed(1)} - vL.z));
    float c = cell(q * 0.55 + nrm * 6.0); float web = smoothstep(0.02, 0.0, abs(sqrt(c) - 0.42)) * 0.0 + pow(1.0 - clamp(sqrt(c), 0.0, 1.0), 6.0);
    vec3 deep = vec3(0.01, 0.2, 0.3), lit = vec3(0.04, 0.78, 0.98);
    vec3 under = mix(deep, lit, (0.35 + 0.65 * exp(-edge * 0.22)) * uLit) + vec3(0.6, 1.0, 1.0) * web * 0.35 * uLit;
    float fres = 0.05 + 0.95 * pow(max(1.0 - max(Vw.y, 0.0), 0.0), 5.0);
    // lit from under, the water keeps its colour even seen low: the house in it, the sky only a little
    float isHouse = R.z < -0.02 ? 1.0 : 0.0;
    vec3 col = mix(under * 1.2, refl, clamp(fres * (0.3 + 0.25 * isHouse) + 0.05, 0.0, 1.0));
    float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogD, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;

// ---------- the pieces ----------
// a cypress, tall and narrow
function cypress(h, R) {
  const parts = [paint(cyl(0.35, 0.5, 2.4, 6, 0, 1.2, 0), rgb(0x3a2a1e))];
  const n = 8;
  for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, y = 2 + u * (h - 3), r = (h * 0.11) * Math.sin(Math.PI * (0.12 + 0.82 * u)) + 0.3; parts.push(paint(sph(1, r, h / n * 0.75, r, (R() - 0.5) * 0.3, y, (R() - 0.5) * 0.3, 8, 6), rgb(0x1a3424), 0.85 + 0.3 * u)); }
  parts.push(paint(new THREE.ConeGeometry(0.7, 2.6, 7).translate(0, h, 0), rgb(0x1e3a28)));
  return merge(parts);
}
// an olive tree in a pot
function olive(R, s = 1) {
  const parts = [paint(cyl(1.1, 0.9, 1.4, 14, 0, 0.7, 0), rgb(0x3a3430)), paint(tube(V(0, 1.2, 0), V(0.3, 3.4, 0.1), 0.18, 0.12, 6), rgb(0x5a4a3a))];
  for (let k = 0; k < 9; k++) parts.push(paint(sph(1, 1.1 + R() * 0.5, 0.75 + R() * 0.3, 1.1 + R() * 0.5, (R() - 0.5) * 2.2, 3.6 + R() * 1.4, (R() - 0.5) * 2.2, 8, 6), rgb(0x6a7a5a), 0.8 + 0.4 * R()));
  const g = merge(parts); g.scale(s, s, s); return g;
}
// a woman standing at a window, her phone up: a figure in shadow (front +z)
function woman() {
  const k = rgb(0x0a0809), parts = [];
  for (const s of [-1, 1]) parts.push(paint(tube(V(s * 0.09, 0, 0), V(s * 0.1, 0.82, 0), 0.05, 0.075, 6), k));
  parts.push(paint(lathe([[0.0, 0.62], [0.36, 0.62], [0.22, 1.05], [0.15, 1.18], [0.18, 1.4], [0.13, 1.47], [0.0, 1.47]], 12), k));   // dress to the shoulders
  parts.push(paint(sph(0.105, 1, 1.15, 1, 0, 1.6, 0, 10, 8), k));                    // head
  parts.push(paint(sph(0.14, 1, 1.25, 0.9, 0, 1.6, -0.04, 10, 8), k));               // hair, up
  parts.push(paint(tube(V(0.17, 1.42, 0), V(0.22, 1.12, 0.05), 0.04, 0.035, 5), k));  // her arm down
  parts.push(paint(tube(V(-0.17, 1.42, 0), V(-0.2, 1.2, 0.12), 0.04, 0.035, 5), k));  // the other bent up...
  parts.push(paint(tube(V(-0.2, 1.2, 0.12), V(-0.08, 1.42, 0.24), 0.035, 0.03, 5), k));  // ...the phone in front of her
  return merge(parts);
}
// a man sitting at the end of a table, his head down (front +z)
function man() {
  const k = rgb(0x0a0809), parts = [];
  parts.push(paint(box(0.42, 0.1, 0.44, 0, 0.48, 0), k));
  for (const s of [-1, 1]) { parts.push(paint(tube(V(s * 0.12, 0.5, 0.18), V(s * 0.13, 0.03, 0.22), 0.06, 0.05, 6), k)); parts.push(paint(tube(V(s * 0.12, 0.5, -0.02), V(s * 0.12, 0.52, 0.2), 0.07, 0.07, 6), k)); }
  parts.push(paint(tube(V(0, 0.52, -0.06), V(0, 1.08, 0.08), 0.17, 0.2, 8), k));
  parts.push(paint(sph(0.11, 1, 1.1, 1, 0, 1.2, 0.2, 10, 8), k));
  for (const s of [-1, 1]) parts.push(paint(tube(V(s * 0.2, 1.0, 0.08), V(s * 0.12, 0.8, 0.42), 0.045, 0.04, 5), k));
  return merge(parts);
}

function exteriorGeometry(R, lift = 0) {
  const P = [];
  const trav = rgb(0xe6dac4), white = rgb(0xf2efe8), steel = rgb(0x16161a);
  // the podium it stands on, up out of the lawn, and its broad steps down at the front
  const front = POOL.z1 + 1.2;            // the podium's front edge: the pool runs right out to it
  if (lift > 0.1) {
    // laid in courses of stone, a dark joint under the terrace's lip
    const n = Math.max(2, Math.round(lift / 1.2));
    for (let k = 0; k < n; k++) { const c = 0.8 + 0.12 * ((k * 7) % 3) / 2; P.push(paint(box(100 - (k % 2) * 0.3, lift / n - 0.06, front + 24 - (k % 2) * 0.3, 2, -lift + (k + 0.5) * lift / n, (front - 24) / 2), [0.8 * c, 0.74 * c, 0.64 * c])); }
    P.push(paint(box(100.4, 0.25, front + 24.4, 2, -0.1, (front - 24) / 2), rgb(0x2a2622)));
    // the steps down the right wing, their cheeks
    for (let k = 0; k < 6; k++) P.push(shade(box(14, lift * (6 - k) / 6, 1.6, 43, -lift + lift * (6 - k) / 12, front + 0.8 + k * 1.6), trav, 0.75, 1.0));
    for (const x of [35.2, 50.8]) P.push(paint(box(1.6, lift + 1.2, 9.6, x, -lift / 2 + 0.6, front + 4.8), rgb(0xd8ccb4)));
    // clipped box along its foot, either side of the steps
    for (const [x0, x1] of [[-48, 34], [52, 53]]) for (let x = x0 + 1.2; x < x1; x += 2.4) P.push(shade(sph(1.5, 1, 0.8, 1, x, -lift + 0.9, front + 1.4, 8, 6), rgb(0x1e4426), 0.75, 1.05));
  }
  // the terrace: deep back to the house, a wing each side of the pool, a thin lip at the infinity edge
  for (const [w, h, d, x, z] of [[100, D, POOL.z0 + 24, 2, (POOL.z0 - 24) / 2], [18, D, front - POOL.z0, -39, (front + POOL.z0) / 2], [22, D, front - POOL.z0, 41, (front + POOL.z0) / 2]]) P.push(shade(box(w, h, d, x, h / 2, z), trav, 0.7, 1.0));
  P.push(paint(box(60, D - 0.35, front - POOL.z1 - 0.1, 0, (D - 0.35) / 2, (front + POOL.z1 - 0.1) / 2), rgb(0x1a3a44)));
  // the coping, a white lip round the water (lower at the infinity edge)
  for (const [w, d, x, z, y] of [[61.6, 0.8, 0, POOL.z0 - 0.4, D + 0.06], [0.8, POOL.z1 - POOL.z0 + 0.8, -30.4, (POOL.z0 + POOL.z1) / 2, D + 0.06], [0.8, POOL.z1 - POOL.z0 + 0.8, 30.4, (POOL.z0 + POOL.z1) / 2, D + 0.06], [61.6, 0.5, 0, POOL.z1 + 0.25, POOL.y - 0.02]]) P.push(paint(box(w, 0.12, d, x, y, z), rgb(0xfaf8f2)));
  // the stone wall at the left end, laid in courses, and its chimney
  for (let k = 0; k < 10; k++) { const c = 0.82 + 0.16 * R(); P.push(paint(box(6.2 - (k % 2) * 0.2, 1.5, 24 - (k % 2) * 0.3, -37, 0.75 + k * 1.5, -8), [0.76 * c, 0.7 * c, 0.6 * c])); }
  for (let k = 0; k < 3; k++) { const c = 0.8 + 0.15 * R(); P.push(paint(box(4.4, 1.0, 5.2, -37, 15.5 + k * 1.0, -17.4), [0.72 * c, 0.66 * c, 0.58 * c])); }
  P.push(paint(box(5.0, 0.3, 5.8, -37, 18.15, -17.4), rgb(0x2a2a2c)));
  // the slab over the ground floor and the roof: white edges (their undersides are the soffits)
  P.push(shade(box(70, 0.8, 21, -1, 7.6, -7.5), white, 0.85, 1.0));
  P.push(shade(box(8, 0.8, 19, 38, 7.6, -8.5), white, 0.85, 1.0));            // the floor of the cantilever, out over the lawn
  P.push(shade(box(72, 0.6, 25, 10, 13.3, -8.5), white, 0.85, 1.0));
  // the upper floor: white render round its ribbon window, glass at its far end
  P.push(paint(box(64, 0.8, 0.5, 10, 8.4, UF.z1 - 0.25), white));
  P.push(paint(box(64, 0.6, 0.5, 10, 12.7, UF.z1 - 0.25), white));
  P.push(paint(box(2, 3.6, 0.5, -21, 10.6, UF.z1 - 0.25), white));
  P.push(paint(box(0.5, 5, 19, UF.x0 + 0.25, 10.5, -8.5), white));
  P.push(paint(box(64, 5, 0.5, 10, 10.5, UF.z0 + 0.25), white));
  // a thin steel column at the ground floor's open corner, and the mullions
  P.push(paint(box(0.22, 5.2, 0.22, 33.6, D + 2.6, 2.6), steel));
  for (let k = 0; k <= 16; k++) P.push(paint(box(0.14, 5.2, 0.2, GF.x0 + k * 4, D + 2.6, GF.z1), steel));
  for (const y of [D + 0.05, GF.y1 - 0.05]) P.push(paint(box(64, 0.12, 0.22, -2, y, GF.z1), steel));
  for (let k = 0; k <= 3; k++) P.push(paint(box(0.2, 5.2, 0.14, GF.x1, D + 2.6, GF.z0 + k * 14 / 3), steel));
  for (let k = 0; k <= 12; k++) P.push(paint(box(0.12, 3.6, 0.16, -20 + k * 5, 10.6, UF.z1 - 0.02), steel));
  for (let k = 0; k <= 4; k++) P.push(paint(box(0.16, 5, 0.12, UF.x1, 10.5, UF.z0 + k * 19 / 4), steel));
  // the wings: loungers along each, a big furled umbrella, the fire bowl, the poles of the string lights
  for (const [x0, sd] of [[-44.5, 1], [37.5, 1]]) for (let k = 0; k < 4; k++) {
    const x = x0 + (k % 2) * 3.2, z = POOL.z0 + 4 + Math.floor(k / 2) * 9;
    P.push(paint(box(2.1, 0.3, 0.85, x, D + 0.3, z), rgb(0x8a5a32)));
    P.push(paint(box(2.0, 0.14, 0.8, x, D + 0.5, z), rgb(0xf4f0e6)));
    const back = box(0.9, 0.14, 0.8, 0, 0, 0); back.rotateZ(sd * 0.9); back.translate(x - sd * 0.9, D + 0.85, z); P.push(paint(back, rgb(0xf4f0e6)));
  }
  for (const x of [-38, 46]) { P.push(paint(cyl(0.08, 0.08, 4.6, 6, x, D + 2.3, POOL.z0 + 22), rgb(0xd8d0c0))); P.push(paint(cyl(0.35, 0.12, 2.6, 10, x, D + 3.6, POOL.z0 + 22), rgb(0xf4ecdc))); }
  P.push(paint(cyl(1.4, 1.0, 0.7, 18, 44, D + 0.35, front - 4), rgb(0x2a2a2c)));
  for (const [x, z] of [[-34, front - 1], [34, front - 1]]) P.push(paint(cyl(0.12, 0.16, 6.4, 6, x, D + 3.2, z), rgb(0x2a2420)));
  return merge(P);
}

function interiorGeometry(R) {
  const P = [];
  const oak = rgb(0x9a6236), plaster = rgb(0xf0b878), walnut = rgb(0x4a2a18), cream = rgb(0xf2dcc0), marble = rgb(0xf4f0ea), dark = rgb(0x2a201a);
  // floors and back walls (warm, as if lit)
  P.push(paint(box(GF.x1 - GF.x0, 0.06, GF.z1 - GF.z0, (GF.x0 + GF.x1) / 2, D + 0.03, (GF.z0 + GF.z1) / 2), oak, 0.75));
  P.push(shade(box(GF.x1 - GF.x0, 5.2, 0.2, (GF.x0 + GF.x1) / 2, D + 2.6, GF.z0 + 0.1), plaster, 0.42, 0.95));
  P.push(shade(box(0.2, 5.2, GF.z1 - GF.z0, GF.x0 + 0.1, D + 2.6, (GF.z0 + GF.z1) / 2), plaster, 0.55, 0.9));
  P.push(paint(box(UF.x1 - UF.x0, 0.06, 11, (UF.x0 + UF.x1) / 2, UF.y0 + 0.03, -4.5), oak, 0.7));
  P.push(shade(box(UF.x1 - UF.x0, 5, 0.2, (UF.x0 + UF.x1) / 2, 10.5, -10), rgb(0xf0a888), 0.45, 0.95));
  // the fire in the back wall, its stone surround
  P.push(paint(box(10, 3.2, 0.6, -22, D + 1.6, GF.z0 + 0.3), rgb(0x5a5450)));
  P.push(paint(box(7, 0.25, 0.7, -22, D + 2.05, GF.z0 + 0.35), dark));
  // the sofa, its back to the glass, facing the fire; a rug, a low table, an arc lamp
  P.push(paint(box(10, 0.04, 7, -22, D + 0.05, -10.5), rgb(0x8a7a6a)));
  P.push(paint(box(8, 0.8, 2.4, -22, D + 0.42, -7.8), cream)); P.push(paint(box(8, 1.0, 0.6, -22, D + 1.0, -6.9), cream));
  P.push(paint(box(2.4, 0.8, 4.5, -27.8, D + 0.42, -10.5), cream));
  P.push(paint(box(3.2, 0.42, 1.6, -21.6, D + 0.22, -11.6), walnut));
  P.push(paint(cyl(0.5, 0.5, 0.1, 12, -12, D + 0.05, -9), rgb(0x2a2a2a)));
  P.push(paint(tube(V(-12, D, -9), V(-12.6, D + 3.1, -9), 0.05, 0.05, 5), rgb(0x2a2a2a)));
  P.push(paint(tube(V(-12.6, D + 3.1, -9), V(-15.4, D + 2.9, -9), 0.05, 0.05, 5), rgb(0x2a2a2a)));
  P.push(paint(sph(0.45, 1, 0.6, 1, -15.5, D + 2.75, -9, 12, 8), rgb(0xf8e0b0)));
  // the long table and its chairs; the lone glass at his end
  P.push(paint(box(11, 0.16, 2.4, 2, D + 0.82, -9.4), walnut));
  for (const x of [-2.6, 6.6]) P.push(paint(box(0.3, 0.8, 2.0, x, D + 0.4, -9.4), walnut));
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const x = -2 + k * 2.2, z = -9.4 + s * 1.7; P.push(paint(box(0.6, 0.08, 0.6, x, D + 0.5, z), dark)); P.push(paint(box(0.6, 0.9, 0.08, x, D + 0.95, z + s * 0.28), dark)); }
  P.push(paint(cyl(0.06, 0.05, 0.22, 8, -2.6, D + 1.0, -9.0), rgb(0xe8f0f0)));
  // the island under its pendants, and the cabinets behind it
  P.push(paint(box(7, 1.0, 2.0, 21, D + 0.5, -8.4), marble)); P.push(paint(box(7.2, 0.08, 2.2, 21, D + 1.04, -8.4), rgb(0xfaf8f4)));
  P.push(paint(box(13, 2.6, 0.7, 21, D + 1.3, GF.z0 + 0.45), walnut)); P.push(paint(box(13, 0.06, 0.7, 21, D + 3.4, GF.z0 + 0.45), walnut));
  for (let k = 0; k < 14; k++) P.push(paint(box(0.32, 0.8, 0.5, 15.2 + k * 0.85, D + 3.9, GF.z0 + 0.4), [0.6 + 0.4 * R(), 0.4 + 0.3 * R(), 0.3 + 0.3 * R()]));
  for (let k = 0; k < 3; k++) { P.push(paint(cyl(0.02, 0.02, 1.8, 4, 18.6 + k * 2.4, D + 4.2, -8.4), dark)); P.push(paint(cyl(0.25, 0.42, 0.45, 12, 18.6 + k * 2.4, D + 3.15, -8.4), rgb(0xd8b068))); }
  // the stair going up, its treads floating off the back wall
  for (let k = 0; k < 18; k++) P.push(paint(box(0.5, 0.12, 1.5, 8.2 + k * 0.52, D + 0.33 * (k + 1), GF.z0 + 1.0), walnut));
  // olive trees in pots by the glass
  for (const [x, z] of [[-4, -4], [27.5, -4.5]]) { const g = olive(R, 0.9); g.translate(x, D, z); P.push(g); }
  // frames for the paintings
  for (const x of [-9, 2, 13]) P.push(paint(box(5.4, 3.6, 0.12, x, D + 3.1, GF.z0 + 0.22), rgb(0x1a1612)));
  // upstairs: the bed, its headboard, two lamps on their tables; a chair and a bar cart in the lounge
  P.push(paint(box(4.2, 0.7, 4.6, -8, UF.y0 + 0.35, -6.8), rgb(0xf8f0e6))); P.push(paint(box(4.6, 1.6, 0.3, -8, UF.y0 + 0.8, -9.3), rgb(0x6a4a3a)));
  for (const x of [-11.2, -4.8]) P.push(paint(box(1.0, 0.7, 0.8, x, UF.y0 + 0.35, -8.6), walnut));
  P.push(paint(box(1.6, 0.9, 1.6, 30, UF.y0 + 0.45, -6), rgb(0xc8a07a))); P.push(paint(box(1.6, 1.0, 0.3, 30, UF.y0 + 1.0, -6.8), rgb(0xc8a07a)));
  P.push(paint(box(1.6, 1.0, 0.7, 36, UF.y0 + 0.5, -8.6), rgb(0xc8a050)));
  for (const x of [16, 24]) P.push(paint(box(4.6, 3.0, 0.12, x, 10.8, -9.86), rgb(0x1a1612)));
  return merge(P);
}

function soffitGeometry() {
  // undersides, facing down: the ground floor's ceiling and overhang, the roof's
  const P = [];
  for (const [w, d, x, y, z] of [[70, 21, -1, 7.19, -7.5], [8, 19, 38, 7.19, -8.5], [72, 25, 10, 12.99, -8.5]]) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(Math.PI / 2); g.translate(x, y, z); P.push(g); }
  return merge(P);
}
function glassGeometry() {
  const P = [];
  const front = new THREE.PlaneGeometry(GF.x1 - GF.x0, 5.2); front.translate((GF.x0 + GF.x1) / 2, D + 2.6, GF.z1); P.push(front);
  const side = new THREE.PlaneGeometry(GF.z1 - GF.z0, 5.2); side.rotateY(Math.PI / 2); side.translate(GF.x1, D + 2.6, (GF.z0 + GF.z1) / 2); P.push(side);
  const up = new THREE.PlaneGeometry(60, 3.6); up.translate(10, 10.6, UF.z1); P.push(up);
  const end = new THREE.PlaneGeometry(UF.z1 - UF.z0, 5); end.rotateY(Math.PI / 2); end.translate(UF.x1, 10.5, (UF.z0 + UF.z1) / 2); P.push(end);
  return merge(P);
}

export class GlassHouseFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -64; this.rot = cfg.rot ?? -2.1; this.s = cfg.s ?? 1;
    prepare(course, scenery && scenery.plan);
    const R = seeded(23);
    // it stands on a podium so its terrace and pool are up at her level, not down under the road's edge
    this.lift = cfg.lift ?? clamp(course.sample(this.t).y - groundAt(course, this.t, this.x) - (cfg.below ?? 1.4), 0, 14);
    this.group = new THREE.Group(); scene.add(this.group);
    this.inner = new THREE.Group(); this.inner.scale.setScalar(this.s); this.inner.position.y = this.lift; this.group.add(this.inner);
    const G = this.inner;
    // the outside: self-lit a little so the white reads in the blue
    this.extM = vcMat({ rough: 0.75, k: 1.6 });
    G.add(new THREE.Mesh(exteriorGeometry(R, this.lift / this.s), this.extM));
    // the trees behind and beside it, down on the lawn; olives in planters up on the terrace
    const trees = [];
    for (let k = 0; k < 13; k++) { const g = cypress(19 + R() * 9 + this.lift, R); g.translate(-62 + k * 10 + (R() - 0.5) * 4, 0, -32 - R() * 6); trees.push(g); }
    for (const [x, z, h] of [[-58, 36, 22], [64, 38, 24], [-60, 8, 21], [66, 6, 22]]) { const g = cypress(h + this.lift, R); g.translate(x, 0, z); trees.push(g); }
    this.treeM = vcMat({ rough: 0.95, k: 0.5, flat: true });
    { const m = new THREE.Mesh(merge(trees), this.treeM); m.scale.setScalar(this.s); this.group.add(m); }
    const olives = []; for (const [x, z] of [[-44, 14], [48, 30]]) { const g = olive(R, 1.2); g.translate(x, D, z); olives.push(g); }
    G.add(new THREE.Mesh(merge(olives), this.treeM));
    // the rooms: unlit colour, as if the light in them is their own
    this.inM = new THREE.MeshBasicMaterial({ vertexColors: true });
    G.add(new THREE.Mesh(interiorGeometry(R), this.inM));
    this.artM = new THREE.MeshBasicMaterial({ map: artTexture() });
    for (const [x, u] of [[-9, 0], [2, 1], [13, 2]]) { const g = new THREE.PlaneGeometry(5, 3.2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (u + uv.getX(i)) / 3); g.translate(x, D + 3.1, GF.z0 + 0.29); G.add(new THREE.Mesh(g, this.artM)); }
    for (const [x, u] of [[16, 1], [24, 0]]) { const g = new THREE.PlaneGeometry(4.2, 2.6); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (u + uv.getX(i)) / 3); g.translate(x, 10.8, -9.78); G.add(new THREE.Mesh(g, this.artM)); }
    // the fire
    this.fireM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.9, 0.25) });
    G.add(new THREE.Mesh(box(6.4, 0.55, 0.1, -22, D + 2.45, GF.z0 + 0.66), this.fireM));
    // the two of them
    this.figM = new THREE.MeshBasicMaterial({ color: 0x060405 });
    const wm = new THREE.Mesh(woman(), this.figM); wm.position.set(26, UF.y0, -0.4); wm.scale.setScalar(1.05); G.add(wm);
    const mn = new THREE.Mesh(man(), this.figM); mn.position.set(-3.3, D, -9.4); mn.rotation.y = Math.PI / 2; G.add(mn);
    // a sheer half drawn across the bedroom
    this.sheerM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.72), transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    { const g = new THREE.PlaneGeometry(14, 3.5, 28, 1); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 2] = Math.sin(p[i] * 1.9) * 0.18; g.translate(-13, 10.55, UF.z1 - 0.6); const m = new THREE.Mesh(g, this.sheerM); m.renderOrder = 2; G.add(m); }
    // soffits
    this.soffitM = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.001 }, uLit: { value: 1 } }, vertexShader: LOCAL_VS, fragmentShader: SOFFIT_FS, side: THREE.DoubleSide });
    G.add(new THREE.Mesh(soffitGeometry(), this.soffitM));
    // the pool
    this.poolM = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uLit: { value: 1 }, uCamL: { value: new THREE.Vector3() }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.001 } }, vertexShader: LOCAL_VS, fragmentShader: POOL_FS });
    { const g = new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.z1 - POOL.z0, 1, 1); g.rotateX(-Math.PI / 2); g.translate((POOL.x0 + POOL.x1) / 2, POOL.y, (POOL.z0 + POOL.z1) / 2); G.add(new THREE.Mesh(g, this.poolM)); }
    // the water sheeting over the infinity edge, lit from the pool
    this.sheetM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.62, 0.72) });
    { const g = new THREE.PlaneGeometry(60, D - 0.3, 1, 1); g.translate(0, (D - 0.3) / 2, POOL.z1 + 1.22); G.add(new THREE.Mesh(g, this.sheetM)); }
    // the glass, last, over all of it
    this.glassM = new THREE.ShaderMaterial({ uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.001 } }, vertexShader: GLASS_VS, fragmentShader: GLASS_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    { const m = new THREE.Mesh(glassGeometry(), this.glassM); m.renderOrder = 3; G.add(m); }
    // the number, in lipstick on the glass
    this.lipM = new THREE.MeshBasicMaterial({ map: lipstickTexture(), transparent: true, depthWrite: false, color: new THREE.Color(1.1, 1.0, 1.0) });
    { const g = new THREE.PlaneGeometry(38, 9.5); g.translate(-8, D + 2.7, GF.z1 + 0.04); const m = new THREE.Mesh(g, this.lipM); m.renderOrder = 4; G.add(m); }
    // her car on the drive, its lights on
    this.ready = new GLTFLoader().loadAsync('assets/props/coupe.glb').then((g) => {
      const obj = g.scene;
      obj.traverse((o) => {
        if (!o.isMesh) return;
        const n = (o.material && o.material.name) || '';
        if (n === 'Glass') o.material = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.85 });
        else o.material = o.material.clone();
        const m = o.material;
        if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(0xf2f0ea); m.metalness = 0.6; m.roughness = 0.22; m.emissive = new THREE.Color(0xf2f0ea); m.emissiveIntensity = 0.3; }
        if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 1.6; }
      });
      const bb = new THREE.Box3().setFromObject(obj), sz = new THREE.Vector3(); bb.getSize(sz);
      const k = 4.8 / Math.max(sz.x, sz.z); obj.scale.setScalar(k); obj.position.set(60, -bb.min.y * k, 46); obj.rotation.y = -2.3;
      this.group.add(obj); this.car = obj;
    }).catch(() => {});
    this.lit = 0.85; this.fired = false; this.earned = 0; this.shells = [];
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._inv = new THREE.Matrix4(); this._c = new THREE.Vector3();
    this._lights = this._lightList(R);
  }
  // every light the place has, house-local: [x, y, z, size, r, g, b, strength, kind]
  _lightList(R) {
    const L = [];
    for (let i = 0; i < 24; i++) { const x = -34 + (i % 12) * 6, z = i < 12 ? 1.6 : -6; L.push([x, 7.0, z, 1.6, 1, 0.86, 0.66, 0.9, 0]); }            // downlights under the slab
    for (let i = 0; i < 14; i++) L.push([-24 + i * 5, 12.8, 3.0, 1.5, 1, 0.86, 0.66, 0.8, 0]);                                                           // under the roof's edge
    for (const x of [-26, -14, -2, 10, 22]) for (const z of [POOL.z0 + 0.6, POOL.z1 - 0.6]) L.push([x, POOL.y - 0.5, z, 4.5, 0.3, 0.9, 1, 1.0, 1]);
    for (const x of [POOL.x0 + 0.6, POOL.x1 - 0.6]) for (const z of [12, 20, 28]) L.push([x, POOL.y - 0.5, z, 4.5, 0.3, 0.9, 1, 1.0, 1]);                         // pool lights
    for (let k = 0; k < 8; k++) L.push([-1 + k * 1.4, D + 3.4, -9.4, 0.9, 1, 0.8, 0.55, 1.2, 0]);                                                        // the table's pendant
    for (let k = 0; k < 3; k++) L.push([18.6 + k * 2.4, D + 2.9, -8.4, 1.2, 1, 0.78, 0.48, 1.3, 0]);                                                       // the island's
    for (const x of [-11.2, -4.8]) L.push([x, UF.y0 + 1.2, -8.6, 1.4, 1, 0.74, 0.5, 1.1, 0]);                                                           // bedside lamps
    L.push([-15.5, D + 2.6, -9, 1.5, 1, 0.8, 0.55, 1.1, 0]);                                                                                             // the arc lamp
    L.push([36, UF.y0 + 1.8, -8.6, 1.0, 1, 0.8, 0.5, 0.9, 0]);
    L.push([25.6, UF.y0 + 1.48, -0.1, 0.55, 0.75, 0.88, 1, 2.2, 2]);                                                                                     // her phone
    for (let k = 0; k < 6; k++) L.push([-46 + k * 16, -this.lift / this.s + 0.8, POOL.z1 + 2.8, 2.6, 1, 0.82, 0.55, 0.7, 0]);                                              // lanterns by the steps
    for (const x of [-62, -52, -42, -32, -22, -12, -2, 8, 18, 28, 38, 48, 58]) L.push([x, 1.0 - this.lift / this.s, -30, 5, 1, 0.82, 0.55, 0.32, 0]);   // up-lights on the trees, down on the lawn
    L.push([44, D + 1.2, POOL.z1 - 2.8, 3.2, 1, 0.55, 0.2, 1.4, 3]);                                                                                               // the fire bowl
    // string lights: from the slab's edge out to poles at the front of the terrace
    for (let s = 0; s < 6; s++) { const x0 = -32 + s * 13, x1 = s < 3 ? -34 : 34, z1 = POOL.z1 - 1; for (let k = 1; k < 14; k++) { const u = k / 14; L.push([x0 + (x1 - x0) * u, 7.4 + (D + 6.2 - 7.4) * u - Math.sin(Math.PI * u) * 1.6, 3 + (z1 - 3) * u, 0.7, 1, 0.82, 0.5, 1.3, 4 + s * 14 + k]); } }
    return L;
  }
  fire(earned) {
    this.fired = true; this.earned = earned;
    // shells over the house, a few for anyone and more for a good ride
    const n = 4 + Math.round(7 * earned);
    for (let k = 0; k < n; k++) this.shells.push({ at: 0.4 + k * 0.42 + (k % 3) * 0.13, x: -40 + (k * 37 % 90), y: 38 + (k * 13 % 22), done: false });
    this.fireT = 0;
  }
  update(track, rider, songT, dt, fireworks) {
    const c = this.course, gy = groundAt(c, this.t, this.x);
    track.ground(this.t, this.x, this._p); this._p.y = gy;
    this.group.position.copy(this._p);
    // its front turned to where she stops (and a little past, so it's seen three-quarters on)
    const H = track.ground(this.cfg.faceT ?? (c.duration + 0.8), 0, this._h || (this._h = new THREE.Vector3()));
    this.group.rotation.set(0, Math.atan2(H.x - this._p.x, H.z - this._p.z) + (this.cfg.turn ?? 0.35), 0);
    const near = this.t - rider.t < 34;
    this.group.visible = near;
    if (!near) return;
    this.lit += ((this.fired ? 1.0 + 0.25 * this.earned : 0.85) - this.lit) * Math.min(1, dt * 1.5);
    const P = this.S ? this.S.P : this.P, cam = this.camPos;
    this.group.updateMatrixWorld(true);
    // shader inputs
    const time = songT;
    for (const m of [this.soffitM, this.poolM, this.glassM]) { const u = m.uniforms; if (cam) u.uCam.value.copy(cam); u.uFog.value.set(P.fog); u.uFogD.value = P.fogDensity; }
    this.soffitM.uniforms.uLit.value = this.lit;
    const pu = this.poolM.uniforms; pu.uTime.value = time; pu.uLit.value = this.lit; pu.uZen.value.set(P.zenith); pu.uHor.value.set(P.horizon);
    if (cam) { this._inv.copy(this.inner.matrixWorld).invert(); pu.uCamL.value.copy(cam).applyMatrix4(this._inv); }
    const gu = this.glassM.uniforms; gu.uZen.value.set(P.zenith); gu.uHor.value.set(P.horizon); gu.uSun.value.set(P.moon ?? 0xffe0c0); if (P.moonDir) gu.uSunDir.value.set(...P.moonDir);
    this.sheetM.color.setRGB(0.16 * this.lit, (0.56 + 0.06 * Math.sin(time * 5)) * this.lit, 0.66 * this.lit);
    const fl = 0.82 + 0.18 * Math.sin(time * 11.3) * Math.sin(time * 7.1 + 1);
    this.fireM.color.setRGB(2.4 * fl, 0.9 * fl, 0.25 * fl);
    // fireworks over it: the volley a good ride earns, then one now and then for as long as you stay
    if (this.fired && fireworks) {
      this.fireT += dt;
      for (const sh of this.shells) if (!sh.done && this.fireT >= sh.at) {
        sh.done = true;
        const from = this._w.set(sh.x, 0, -20).applyMatrix4(this.inner.matrixWorld).clone();
        const to = from.clone(); to.y += sh.y;
        fireworks.launch(from, to, 1.0 + 0.4 * this.earned);
      }
      if (this.fireT > (this.nextShell ?? 4)) {
        const k = Math.floor(this.fireT * 7.3) % 9;
        this.nextShell = this.fireT + 1.4 + (k % 3) * 0.5;
        const from = this._w.set(-36 + k * 9, 0, -26).applyMatrix4(this.inner.matrixWorld).clone();
        const to = from.clone(); to.y += 40 + (k % 4) * 6;
        fireworks.launch(from, to, 1.1);
      }
    }
    const S = this.S; if (!S) return;
    // its lights
    const W = this._w, mw = this.inner.matrixWorld, s = this.s;
    for (const l of this._lights) {
      let k = l[7] * this.lit;
      if (l[8] === 2) k *= 0.85 + 0.15 * Math.sin(time * 3.1);
      if (l[8] === 3) k *= fl;
      W.set(l[0], l[1], l[2]);
      if (l[8] >= 4) { const sw = Math.sin(time * 1.3 + l[8] * 0.7) * 0.12; W.y += sw; k *= 0.8 + 0.25 * Math.sin(time * 2 + l[8]); }
      W.applyMatrix4(mw);
      S.glow(W.x, W.y, W.z, l[3] * s, [l[4], l[5], l[6]], k);
    }
    // the lit rooms throw light out on the terrace, the pool on everything round it
    W.set(-2, D + 0.05, 2).applyMatrix4(mw); S.pool(W.x, W.y, W.z, 46 * s, [1, 0.78, 0.5], 0.45 * this.lit);
    W.set(0, D + 0.05, 16).applyMatrix4(mw); S.pool(W.x, W.y, W.z, 54 * s, [0.3, 0.85, 1], 0.35 * this.lit);
    W.set(0, 9, -6).applyMatrix4(mw); S.glow(W.x, W.y, W.z, 70 * s, [1, 0.75, 0.45], 0.12 * this.lit);
  }
}
