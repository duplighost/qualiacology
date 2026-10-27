// Don't Anybody Move: her things, and the stops. Everything here is built at its real size in metres
// and scaled where it stands (her house is a giant's house: we are small in it). Whatever moves runs
// on the party's clock, which stops dead while the band is out: the sprinkler's water hangs in the
// air, the dollar lights stop twinkling, the disco ball's specks stop going round, the balloons stop
// bobbing, the confetti hangs where it was.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col, tintV, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
// turned to face her coming up the road, a little toward the road
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5);
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
// self-lit and tinted per thing (aTint): the bulbs, the balloons, the coats
function tintLit(opts, k = 0.5, glowK = 0) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint * vTint;' + (glowK ? ` totalEmissiveRadiance += vTint * ${glowK.toFixed(2)};` : ''));
  };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const TLm = (M, key, k, opts, glowK) => M[key] || (M[key] = tintLit(opts, k, glowK));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.75, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const WHITE = rgb(0xf2eee6), WOOD = rgb(0x7a5232), DARKWOOD = rgb(0x4a3020), STEEL = rgb(0xc8ccd4), RED = rgb(0xd8302a);
const LAMP = [1, 0.78, 0.5], FLAME = [1, 0.7, 0.3], FLASH = [1, 0.98, 0.94];
// the dollar lights' colours, and the coats'
const BULBS = [[1, 0.25, 0.2], [1, 0.8, 0.25], [0.3, 1, 0.45], [0.3, 0.55, 1], [1, 0.4, 0.8], [1, 0.6, 0.2]];
const COATS = [0xc8a070, 0x2a2a30, 0x2a3a5a, 0x8a2a2a, 0x3a5a3a, 0xd8d0c0, 0x5a3a2a, 0x8a6a9a];

// ---------- the stops ----------
// [from, to] in song time: from where the band drops out ("don't anybody move") to where it's back
export const stopsOf = (plan) => (plan && plan.stops) || [];
// the party's clock: song time, less the time spent stopped before it
export function clockAt(stops, T) {
  let c = T;
  for (let i = 0; i < stops.length; i++) { const a = stops[i][0], b = stops[i][1]; if (T > a) c -= Math.min(T, b) - a; }
  return c;
}
// inside a stop: the song time it stopped at; otherwise T
export function heldAt(stops, T) {
  for (let i = 0; i < stops.length; i++) if (T >= stops[i][0] && T < stops[i][1]) return stops[i][0];
  return T;
}
export const stillAt = (stops, T) => heldAt(stops, T) !== T;
const clockOf = (S) => (S._damC !== undefined && S._damCT === S.tNow ? S._damC : (S._damCT = S.tNow, S._damC = clockAt(stopsOf(S.plan), S.tNow ?? 0)));

// ---------- the pictures ----------
// the set list on her fridge: ten songs in marker, the first ones crossed off
const SETLIST = ['KISS ME LIKE A CAR CRASH', 'AI GF', 'SUMMER PEOPLE', 'YOUR WIFE, MY NUMBER', 'A MILLION DUCKS', 'COME COUNTDOWN', 'UNLOADED', 'MAKE IT A NO', 'SPIKED', "DON'T ANYBODY MOVE"];
function setListTexture(crossed) {
  return canvasTex(512, 700, (g, W, H) => {
    g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, W, H);
    // the tape at the top corners
    g.fillStyle = 'rgba(230,220,180,0.85)'; g.save(); g.translate(60, 22); g.rotate(-0.3); g.fillRect(-46, -14, 92, 28); g.restore(); g.save(); g.translate(W - 60, 22); g.rotate(0.3); g.fillRect(-46, -14, 92, 28); g.restore();
    g.fillStyle = '#1a1a22'; g.textBaseline = 'middle';
    const R = seeded(77);
    for (let i = 0; i < SETLIST.length; i++) {
      const y = 78 + i * 62, sz = 34;
      g.font = `700 ${sz}px "Archivo Black", "Arial Black", sans-serif`;
      g.save(); g.translate(34 + R() * 10, y); g.rotate((R() - 0.5) * 0.04);
      const txt = `${i + 1}. ${SETLIST[i]}`;
      let w = g.measureText(txt).width; const k = Math.min(1, (W - 70) / w); g.scale(k, 1); g.fillText(txt, 0, 0); w *= k;
      g.restore();
      if (i < crossed) { g.strokeStyle = '#c8282a'; g.lineWidth = 6; g.beginPath(); g.moveTo(28, y + 3); g.bezierCurveTo(28 + w * 0.3, y - 4, 28 + w * 0.7, y + 8, 40 + w, y - 1); g.stroke(); }
    }
  });
}
// the photo in her hallway: a bad flash some June. Black behind, faces blown white, the date in the corner,
// everyone blurry and laughing; her at the right-hand edge, half out of frame, both hands full
function photoTexture() {
  return canvasTex(1024, 640, (g, W, H) => {
    g.fillStyle = '#060504'; g.fillRect(0, 0, W, H);
    const R = seeded(612);
    const person = (x, y, s, tint, blur, turn = 0) => {
      for (let k = blur ? 3 : 1; k >= 1; k--) {
        g.globalAlpha = k === 1 ? 1 : 0.22;
        const dx = (k - 1) * 18 * s;
        // shoulders and body in the flash
        const gr = g.createRadialGradient(x + dx, y + 150 * s, 10, x + dx, y + 150 * s, 170 * s);
        gr.addColorStop(0, tint); gr.addColorStop(1, '#0a0806');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x + dx, y + 175 * s, 105 * s, 120 * s, 0, Math.PI, 0); g.fill();
        g.fillRect(x + dx - 105 * s, y + 175 * s, 210 * s, 200 * s);
        // the face blown out
        const fg = g.createRadialGradient(x + dx - 10 * s, y + 30 * s, 4, x + dx, y + 40 * s, 66 * s);
        fg.addColorStop(0, '#fffaf2'); fg.addColorStop(0.55, '#f6dcc4'); fg.addColorStop(1, '#5a3a2a');
        g.fillStyle = fg; g.beginPath(); g.ellipse(x + dx + turn * 8, y + 40 * s, 52 * s, 64 * s, 0, 0, Math.PI * 2); g.fill();
        // hair
        g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(x + dx + turn * 4, y + 6 * s, 56 * s, 38 * s, 0, Math.PI, 0); g.fill();
        if (k === 1) {
          // red eyes, a laughing mouth
          g.fillStyle = '#ff2a1a'; for (const ex of [-18, 18]) { g.beginPath(); g.arc(x + ex * s + turn * 10, y + 34 * s, 5 * s, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#3a0a0a'; g.beginPath(); g.ellipse(x + turn * 10, y + 70 * s, 18 * s, 11 * s, 0, 0, Math.PI); g.fill();
        }
      }
      g.globalAlpha = 1;
    };
    const tints = ['#e8604a', '#f2c14a', '#4a8ad8', '#f4f0e8', '#d84a8a', '#5ac8a0', '#ffa060', '#8a5ad8'];
    // the back row, then the front
    for (let i = 0; i < 6; i++) person(120 + i * 150 + R() * 30, 150 + R() * 40, 0.75, tints[i % tints.length], R() < 0.7, R() - 0.5);
    for (let i = 0; i < 4; i++) person(180 + i * 200 + R() * 40, 300 + R() * 30, 1.0, tints[(i + 3) % tints.length], R() < 0.6, R() - 0.5);
    // her: half out of the frame on the right, turned away toward the door, a bag of ice and the cups
    person(W - 20, 240, 1.05, '#ffffff', false, 1.2);
    g.fillStyle = '#e8f4ff'; g.beginPath(); g.ellipse(W - 95, 470, 60, 78, 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8282a'; for (let k = 0; k < 6; k++) g.fillRect(W - 170 + k * 2, 360 + k * 26, 52 - k * 2, 30);
    // the flash's hot spot, the vignette
    const v = g.createRadialGradient(W * 0.45, H * 0.45, 60, W * 0.5, H * 0.5, W * 0.7);
    v.addColorStop(0, 'rgba(255,250,240,0.18)'); v.addColorStop(0.6, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    // the date, the camera's orange digits
    g.font = '700 46px "Courier New", monospace'; g.fillStyle = '#ff8a2a'; g.shadowColor = '#ff6a10'; g.shadowBlur = 12; g.textAlign = 'right';
    g.fillText("6 14 '08", W - 40, H - 40);
  });
}
// the back of the photo: brown card, the stand's hinge, a word in pencil
function backTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#8a6a48'; g.fillRect(0, 0, W, H);
    const R = seeded(9);
    for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '60,40,20' : '170,140,100'},${0.05 + R() * 0.08})`; g.fillRect(R() * W, R() * H, 2 + R() * 3, 1); }
    g.fillStyle = 'rgba(40,26,14,0.35)'; g.fillRect(W * 0.46, H * 0.18, W * 0.08, H * 0.5);
    g.fillStyle = '#c8a878'; g.fillRect(W * 0.42, H * 0.14, W * 0.16, H * 0.05);
    g.font = 'italic 64px "Segoe Script", "Brush Script MT", cursive'; g.fillStyle = 'rgba(50,40,36,0.75)'; g.textAlign = 'center';
    g.fillText('June', W * 0.5, H * 0.84);
  });
}
// a road map, folded open, a route marked in red: four hours of it
function mapTexture() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = '#f2ecd8'; g.fillRect(0, 0, W, H);
    const R = seeded(41);
    g.strokeStyle = 'rgba(120,150,110,0.35)'; g.lineWidth = 18; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(R() * W, 0); g.bezierCurveTo(R() * W, H * 0.4, R() * W, H * 0.6, R() * W, H); g.stroke(); }
    g.strokeStyle = '#d8a848'; g.lineWidth = 4; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(R() * W, R() * H); g.lineTo(R() * W, R() * H); g.stroke(); }
    g.strokeStyle = '#4a7ad8'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H * 0.7); g.bezierCurveTo(W * 0.3, H * 0.5, W * 0.6, H * 0.9, W, H * 0.4); g.stroke();
    g.strokeStyle = '#d8282a'; g.lineWidth = 7; g.beginPath(); g.moveTo(W * 0.08, H * 0.12); g.bezierCurveTo(W * 0.3, H * 0.3, W * 0.5, H * 0.2, W * 0.62, H * 0.55); g.bezierCurveTo(W * 0.7, H * 0.75, W * 0.85, H * 0.7, W * 0.92, H * 0.88); g.stroke();
    g.fillStyle = '#d8282a'; for (const [x, y] of [[0.08, 0.12], [0.92, 0.88]]) { g.beginPath(); g.arc(W * x, H * y, 10, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; for (const x of [W / 3, 2 * W / 3]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { set3: setListTexture(3), set8: setListTexture(8), photo: photoTexture(), back: backTexture(), map: mapTexture() });

// a flame that holds its shape and never adds up to white (the match)
function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); c.xy += position.xy * vec2(sx, sy); gl_Position = projectionMatrix * c; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vK;
      void main(){
        vec2 q = vUv; float t = uTime * 8.0;
        float sway = sin(t) * 0.05 + sin(t * 2.3) * 0.02;
        float w = 0.34 * (1.0 - q.y) * smoothstep(0.0, 0.22, q.y) + 0.02;
        float shape = smoothstep(w, w * 0.35, abs(q.x - 0.5 - sway * q.y * 2.0)) * smoothstep(1.0, 0.65, q.y);
        vec3 c = mix(vec3(1.0, 0.97, 0.8), vec3(1.0, 0.55, 0.15), smoothstep(0.15, 0.75, q.y));
        c = mix(vec3(0.35, 0.45, 1.0), c, smoothstep(0.02, 0.14, q.y));
        gl_FragColor = vec4(c * 1.5, clamp(shape * vK * 1.4, 0.0, 1.0));
      }`,
    depthWrite: false, transparent: true,
  });
}

// ---------- her things, at their real size in metres ----------
const DM = {
  // the cooler at the curb, lid up, heaped with the good ice (the crushed kind), two bags beside it
  cooler() {
    const parts = [paint(box(0.8, 0.42, 0.45, 0, 0.21, 0), rgb(0x2a7ad8)), paint(box(0.82, 0.05, 0.47, 0, 0.42, 0), WHITE)];
    const lid = box(0.82, 0.07, 0.47, 0, 0.035, 0.235); lid.rotateX(-1.95); lid.translate(0, 0.44, -0.235); parts.push(paint(lid, WHITE));
    for (const s of [-1, 1]) parts.push(paint(box(0.06, 0.04, 0.16, s * 0.43, 0.32, 0), WHITE));
    const R = seeded(13);
    for (let k = 0; k < 40; k++) parts.push(paint(sph(0.035 + R() * 0.03, 1, 0.8, 1, (R() - 0.5) * 0.7, 0.43 + R() * 0.07 + 0.05 * Math.cos((R() - 0.5) * 2), (R() - 0.5) * 0.36, 6, 4), rgb(R() < 0.5 ? 0xf0f8ff : 0xd0e8ff)));
    for (const [x, z, r] of [[0.7, 0.15, 0.4], [0.62, -0.32, -0.6]]) { const b = sph(0.2, 1, 0.6, 0.7, 0, 0.12, 0, 12, 8); b.rotateY(r); b.translate(x, 0, z); parts.push(paint(b, rgb(0xe8f2fa))); const tag = box(0.16, 0.08, 0.01, 0, 0.16, 0.14); tag.rotateY(r); tag.translate(x, 0, z); parts.push(paint(tag, rgb(0x2a5ab8))); }
    return merge(parts);
  },
  // a mailbox on its post, with a bunch of balloons tied to it (the balloons are their own)
  mailbox() { return merge([paint(box(0.08, 1.1, 0.08, 0, 0.55, 0), WOOD), paint(box(0.24, 0.24, 0.48, 0, 1.18, 0), rgb(0x2a2a30)), paint(cyl(0.12, 0.12, 0.48, 14, 0, 1.3, 0).rotateX(Math.PI / 2), rgb(0x2a2a30)), paint(box(0.03, 0.18, 0.08, 0.14, 1.36, 0.1), RED)]); },
  balloon() { return merge([sph(0.15, 1, 1.18, 1, 0, 0, 0, 14, 10), cyl(0.012, 0.03, 0.04, 6, 0, -0.18, 0)]); },
  string() { return box(1, 1, 1, 0.5, 0, 0); },
  // a lawn sprinkler (its water is its own)
  sprinkler() { return merge([paint(box(0.3, 0.05, 0.12, 0, 0.025, 0), rgb(0x3a8a3a)), paint(cyl(0.02, 0.02, 0.12, 8, 0, 0.1, 0), rgb(0xb8bcc4)), paint(box(0.28, 0.025, 0.025, 0, 0.17, 0), rgb(0xd8d8d0)), paint(cyl(0.01, 0.01, 2.5, 5, 0, 0.01, -1.3).rotateX(Math.PI / 2), rgb(0x2a6a2a))]); },
  drop() { return sph(0.022, 1, 2.0, 1, 0, 0, 0, 6, 4); },
  // the fridge, its doors, magnets (the set list is its own)
  fridge() {
    const parts = [paint(box(0.9, 1.8, 0.72, 0, 0.9, 0), rgb(0xe8e4dc)), paint(box(0.88, 0.012, 0.012, 0, 1.25, 0.366), rgb(0x9a9a98))];
    for (const [y, h] of [[1.5, 0.3], [0.85, 0.5]]) parts.push(paint(box(0.03, h, 0.04, -0.38, y, 0.39), STEEL));
    const R = seeded(5); for (let k = 0; k < 9; k++) parts.push(paint(box(0.05 + R() * 0.03, 0.04 + R() * 0.03, 0.015, (R() - 0.3) * 0.6, 1.35 + R() * 0.38, 0.37), rgb(pick(R, [0xff4a4a, 0x4a8aff, 0xffd84a, 0x4ac86a, 0xff8ad8]))));
    parts.push(paint(box(0.86, 0.06, 0.66, 0, 0.03, 0.02), rgb(0x2a2a2a)));
    return merge(parts);
  },
  setList() { const g = new THREE.PlaneGeometry(0.42, 0.57); g.translate(0.08, 0.86, 0.372); return g; },
  // the counter: cabinets, the top, bottles, stacks of red cups, the punch bowl, a bowl of ice
  counter() {
    const parts = [paint(box(2.4, 0.88, 0.6, 0, 0.44, 0), rgb(0xf0e8d8)), paint(box(2.44, 0.05, 0.64, 0, 0.905, 0), rgb(0x3a3a40))];
    for (let k = 0; k < 4; k++) { parts.push(paint(box(0.56, 0.7, 0.01, -0.9 + k * 0.6, 0.42, 0.305), rgb(0xe4dccb))); parts.push(paint(box(0.12, 0.02, 0.02, -0.9 + k * 0.6, 0.7, 0.315), STEEL)); }
    const R = seeded(19);
    for (let k = 0; k < 9; k++) {
      const x = -1.05 + k * 0.17 + R() * 0.04, h = 0.22 + R() * 0.12, c = rgb(pick(R, [0x2a6a3a, 0x6a3a1a, 0xe8e0d0, 0x3a2a4a, 0xc8a040, 0x8a1a2a]));
      parts.push(paint(cyl(0.035, 0.035, h, 10, x, 0.93 + h / 2, -0.12), c), paint(cyl(0.012, 0.03, 0.08, 8, x, 0.93 + h + 0.04, -0.12), c));
    }
    for (const x of [0.45, 0.58]) for (let k = 0; k < 7; k++) parts.push(paint(lathe([[0.037, 0], [0.045, 0.0], [0.052, 0.11], [0.048, 0.11], [0.038, 0.012]], 14).translate(x, 0.93 + k * 0.022, 0.12), RED));
    parts.push(paint(lathe([[0.04, 0], [0.12, 0.01], [0.2, 0.08], [0.21, 0.14], [0.19, 0.14], [0.03, 0.02]], 26).translate(0.95, 0.93, 0), rgb(0xd8f0ff)));
    parts.push(paint(cyl(0.18, 0.18, 0.02, 20, 0.95, 1.05, 0), rgb(0xff4a6a)));
    parts.push(paint(lathe([[0.03, 0], [0.12, 0.02], [0.15, 0.09], [0.13, 0.09], [0.02, 0.02]], 20).translate(-0.5, 0.93, 0.14), rgb(0xe8e4dc)));
    for (let k = 0; k < 12; k++) parts.push(paint(sph(0.02 + R() * 0.015, 1, 0.8, 1, -0.5 + (R() - 0.5) * 0.18, 1.02, 0.14 + (R() - 0.5) * 0.16, 5, 4), rgb(0xf0f8ff)));
    return merge(parts);
  },
  // the sink: the counter with a basin in it, the tap, a rack of glasses
  sink() {
    const parts = [paint(box(1.8, 0.88, 0.6, 0, 0.44, 0), rgb(0xf0e8d8)), paint(box(0.62, 0.05, 0.64, -0.62, 0.905, 0), rgb(0x3a3a40)), paint(box(0.62, 0.05, 0.64, 0.62, 0.905, 0), rgb(0x3a3a40))];
    parts.push(paint(box(0.56, 0.02, 0.5, 0, 0.72, 0), rgb(0x8a8e94)), paint(box(0.02, 0.2, 0.5, -0.29, 0.82, 0), STEEL), paint(box(0.02, 0.2, 0.5, 0.29, 0.82, 0), STEEL), paint(box(0.56, 0.2, 0.02, 0, 0.82, -0.25), STEEL), paint(box(0.56, 0.2, 0.02, 0, 0.82, 0.25), STEEL));
    const tap = new THREE.TorusGeometry(0.12, 0.015, 6, 12, Math.PI); tap.translate(0, 0.93 + 0.12 + 0.12, -0.2); parts.push(paint(tap, STEEL), paint(cyl(0.015, 0.02, 0.24, 8, -0.12, 1.05, -0.2), STEEL));
    for (let k = 0; k < 4; k++) parts.push(paint(lathe([[0.03, 0], [0.035, 0.0], [0.04, 0.12], [0.036, 0.12], [0.026, 0.01]], 12).translate(0.5 + k * 0.08, 0.93, -0.1), rgb(0xd8f0f8)));
    return merge(parts);
  },
  mapSheet() { const g = new THREE.PlaneGeometry(0.5, 0.38); g.rotateX(-Math.PI / 2 + 0.05); g.translate(0.62, 0.935, 0.06); return g; },
  // the shoes by the door, kicked off in a heap
  shoes() {
    const parts = [], R = seeded(23);
    for (let k = 0; k < 16; k++) {
      const c = rgb(pick(R, [0xf4f0e8, 0x1a1a1e, 0xc8302a, 0x4a6aa8, 0xd8a050, 0x2a2a2a, 0xe87ab0])), x = (R() - 0.5) * 1.2, z = (R() - 0.5) * 0.9, r = R() * 6.28, y = R() < 0.3 ? 0.06 : 0;
      const kind = R();
      let g;
      if (kind < 0.55) g = merge([paint(box(0.27, 0.035, 0.1, 0, 0.018, 0), WHITE), paint(sph(0.1, 1.4, 0.55, 0.52, 0.02, 0.05, 0, 10, 6), c)]);
      else if (kind < 0.8) g = merge([paint(box(0.24, 0.02, 0.08, 0, 0.09, 0).rotateZ(0.35), c), paint(box(0.015, 0.09, 0.015, -0.1, 0.045, 0), c), paint(box(0.1, 0.06, 0.08, 0.06, 0.03, 0), c)]);
      else g = merge([paint(box(0.26, 0.04, 0.1, 0, 0.02, 0), rgb(0x2a1a10)), paint(box(0.1, 0.3, 0.1, -0.07, 0.17, 0), c), paint(box(0.18, 0.08, 0.1, 0.04, 0.06, 0), c)]);
      g.rotateZ(y ? 0.5 : 0); g.rotateY(r); g.translate(x, y, z); parts.push(g);
    }
    return merge(parts);
  },
  // her bed, made, and the coats asleep on it
  bed() {
    const parts = [paint(box(1.55, 0.32, 2.05, 0, 0.16, 0), DARKWOOD), paint(box(1.5, 0.22, 2.0, 0, 0.43, 0), rgb(0xe8e4f0)), paint(box(1.6, 1.05, 0.08, 0, 0.53, -1.02), DARKWOOD), paint(box(1.52, 0.08, 1.4, 0, 0.56, 0.28), rgb(0x8aa0c8))];
    for (const x of [-0.38, 0.38]) parts.push(paint(sph(0.32, 1, 0.32, 0.6, x, 0.62, -0.72, 12, 8), WHITE));
    return merge(parts);
  },
  // a coat, its arms out, asleep (one of a heap)
  coat() { return merge([sph(0.36, 1, 0.22, 0.62, 0, 0.1, 0, 12, 8), sph(0.1, 2.2, 0.55, 0.55, 0.42, 0.06, -0.12, 8, 6), sph(0.1, 2.2, 0.55, 0.55, -0.4, 0.06, 0.1, 8, 6), sph(0.14, 1, 0.5, 1.4, 0, 0.2, -0.26, 8, 6)]); },
  // the bowl of everyone's car keys on the side table: nobody's going home
  keys() {
    const parts = [paint(box(0.55, 0.04, 0.45, 0, 0.72, 0), WOOD), ...[[-0.24, -0.19], [0.24, -0.19], [-0.24, 0.19], [0.24, 0.19]].map(([x, z]) => paint(box(0.04, 0.7, 0.04, x, 0.35, z), WOOD))];
    parts.push(paint(lathe([[0.04, 0], [0.14, 0.01], [0.2, 0.08], [0.21, 0.12], [0.19, 0.12], [0.04, 0.02]], 24).translate(0, 0.74, 0), rgb(0x3a6aa8)));
    const R = seeded(71);
    for (let k = 0; k < 22; k++) {
      const a = R() * 6.28, r = R() * 0.15, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.84 + R() * 0.05 + (0.15 - r) * 0.3;
      const kk = box(0.08, 0.012, 0.02, 0, 0, 0); kk.rotateY(R() * 6.28); kk.rotateZ((R() - 0.5) * 0.6); kk.translate(x, y, z); parts.push(paint(kk, rgb(0xd8c070)));
      const fob = box(0.05, 0.02, 0.035, 0, 0, 0); fob.rotateY(R() * 6.28); fob.translate(x + (R() - 0.5) * 0.05, y + 0.01, z + (R() - 0.5) * 0.05); parts.push(paint(fob, rgb(pick(R, [0x1a1a1e, 0x2a2a30, 0xc83a3a, 0x3a5ad8, 0x2a2a2a]))));
    }
    // one set hanging over the rim
    const hang = box(0.012, 0.12, 0.02, 0.2, 0.78, 0.05); parts.push(paint(hang, rgb(0xd8c070)));
    return merge(parts);
  },
  // the matchbox on the floor, one big match out of it (its flame is its own)
  match() {
    const parts = [paint(box(0.5, 0.12, 0.32, 0, 0.06, 0), rgb(0xe8d040)), paint(box(0.42, 0.02, 0.33, 0, 0.13, 0), rgb(0xd83a2a)), paint(box(0.52, 0.1, 0.02, 0, 0.06, 0.165), rgb(0x6a3a2a))];
    const stick = box(0.04, 0.9, 0.04, 0, 0.45, 0); stick.rotateZ(-0.35); stick.translate(0.1, 0.1, 0); parts.push(paint(stick, rgb(0xe8c88a)));
    const head = sph(0.045, 1, 1.5, 1, 0, 0, 0, 10, 8); head.translate(0, 0.92, 0); head.rotateZ(-0.35); head.translate(0.1, 0.1, 0); parts.push(paint(head, rgb(0xc82a20)));
    return merge(parts);
  },
  // the speaker on its stand (the cone is lit with the kick)
  speaker() { return merge([paint(box(0.5, 0.9, 0.4, 0, 0.65, 0), rgb(0x1a1a1e)), paint(box(0.08, 0.2, 0.08, 0, 0.1, 0), rgb(0x2a2a2a)), paint(box(0.42, 0.02, 0.36, 0, 0.2, 0), rgb(0x2a2a2a))]); },
  cone() { const g = new THREE.CircleGeometry(0.17, 24); g.translate(0, 0.55, 0.205); const t = new THREE.CircleGeometry(0.06, 16); t.translate(0, 0.92, 0.205); return merge([g, t]); },
  // the couch pushed back against the wall for the dancing
  couch() {
    const c = rgb(0x5a7a6a), d = rgb(0x4a6a5a), parts = [paint(box(2.2, 0.32, 0.86, 0, 0.3, 0), d), paint(box(2.2, 0.62, 0.22, 0, 0.75, -0.33), d)];
    for (const x of [-0.68, 0, 0.68]) { parts.push(paint(box(0.66, 0.16, 0.7, x, 0.53, 0.06), c)); }
    for (const s of [-1, 1]) parts.push(paint(box(0.2, 0.58, 0.88, s * 1.08, 0.42, 0), d));
    for (const [x, z] of [[-1.0, -0.36], [1.0, -0.36], [-1.0, 0.36], [1.0, 0.36]]) parts.push(paint(box(0.06, 0.14, 0.06, x, 0.07, z), WOOD));
    parts.push(paint(sph(0.2, 1, 0.45, 0.9, -0.7, 0.68, -0.1, 10, 6), rgb(0xe8a050)), paint(sph(0.2, 1, 0.45, 0.9, 0.75, 0.68, -0.08, 10, 6), rgb(0xd8586a)));
    return merge(parts);
  },
  // the disco ball (one from a shop, too small for the room) and its chain
  disco() {
    const g = new THREE.IcosahedronGeometry(0.25, 2).toNonIndexed();
    const n = g.attributes.position.count, a = new Float32Array(n * 3), R = seeded(3);
    for (let i = 0; i < n; i += 3) { const v = 0.55 + R() * 0.45, b = R() < 0.12 ? 1.3 : v; for (let k = 0; k < 3; k++) { a[(i + k) * 3] = b; a[(i + k) * 3 + 1] = b; a[(i + k) * 3 + 2] = b * 1.02; } }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals();
    return merge([g, paint(box(0.01, 0.7, 0.01, 0, 0.6, 0), rgb(0x8a8a8a))]);
  },
  // the smoke alarm on the ceiling (its light is its own)
  alarm() { return merge([paint(cyl(0.07, 0.065, 0.04, 20, 0, -0.02, 0), WHITE), paint(cyl(0.045, 0.045, 0.012, 16, 0, -0.045, 0), rgb(0xe0dcd4))]); },
  // the back yard: a kiddie pool, the grill, lawn chairs, a pole for the lights
  pool() { const g = lathe([[0, 0], [0.9, 0], [0.92, 0.28], [0.86, 0.3], [0.84, 0.05], [0, 0.05]], 36); const parts = [paint(g, rgb(0x4ab8e8))]; parts.push(paint(cyl(0.83, 0.83, 0.02, 36, 0, 0.2, 0), rgb(0x8ad8f8))); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; parts.push(paint(sph(0.07, 1, 0.3, 1, Math.cos(a) * 0.9, 0.29, Math.sin(a) * 0.9, 8, 4), rgb(k % 2 ? 0xffd84a : 0xff6a8a))); } return merge(parts); },
  grill() { return merge([paint(sph(0.3, 1, 0.75, 1, 0, 0.75, 0, 16, 10), rgb(0x1a1a1e)), paint(cyl(0.31, 0.31, 0.02, 20, 0, 0.78, 0), rgb(0x3a3a3e)), ...[0, 2.1, 4.2].map((a) => paint(cyl(0.015, 0.015, 0.7, 6, Math.cos(a) * 0.2, 0.35, Math.sin(a) * 0.2).rotateZ(Math.cos(a) * 0.15), rgb(0x2a2a2a))), paint(cyl(0.02, 0.02, 0.08, 6, 0, 1.0, 0), rgb(0x8a8a8a))]); },
  chair() { const c = rgb(0x3ac8a8), parts = [paint(box(0.55, 0.03, 0.5, 0, 0.38, 0), c), paint(box(0.55, 0.6, 0.03, 0, 0.66, -0.26).rotateX(-0.25), c)]; for (const x of [-0.26, 0.26]) parts.push(paint(box(0.03, 0.4, 0.55, x, 0.2, 0).rotateX(0.0), STEEL)); return merge(parts); },
  pole() { return paint(box(0.08, 1, 0.08, 0, 0.5, 0), WOOD); },
  bulb() { return sph(0.035, 1, 1.25, 1, 0, -0.04, 0, 8, 6); },
  wire() { return box(1, 1, 1, 0.5, 0, 0); },
  // the deck boards out the back, the light coming up between them (painted by the world's floor)
  // a red cup, the kind she was counting
  cup() { return lathe([[0, 0], [0.034, 0], [0.046, 0.12], [0.042, 0.12], [0.03, 0.006], [0, 0.006]], 14); },
  // the bag of ice under her arm, the cups in her hand (the photograph)
  iceBag() { return merge([sph(0.17, 1, 1.3, 0.75, 0, 0, 0, 12, 8), cyl(0.03, 0.05, 0.08, 8, 0, 0.24, 0)]); },
  // a door in its frame, standing open, light behind it (the one she's checking)
  doorFrame() { return merge([paint(box(0.08, 2.1, 0.12, -0.46, 1.05, 0), WHITE), paint(box(0.08, 2.1, 0.12, 0.46, 1.05, 0), WHITE), paint(box(1.0, 0.08, 0.12, 0, 2.14, 0), WHITE), paint(box(0.04, 2.0, 0.85, -0.42, 1.0, 0.43), rgb(0xd8d0c0)).rotateY(0)]); },
  doorLight() { const g = new THREE.PlaneGeometry(0.84, 2.06); g.translate(0, 1.03, -0.02); return g; },
  // the camera on its tripod (the finale has its own; this is the photo's flash)
  // the letter board her lines are on: black felt, a wooden frame, on an easel
  board() { return merge([paint(box(25.8, 10.4, 0.9, 0, 0, -0.6), rgb(0x6a4a2a)), paint(box(24.8, 9.4, 0.3, 0, 0, -0.1), rgb(0x141414))]); },
  boardLeg() { return paint(box(0.7, 1, 0.7, 0, -0.5, 0), rgb(0x5a3a22)); },
};
const boardFace = () => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(24 / 7.5, 8.6 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.08); return g; };

// the photograph in the cheap frame at the end of the hall, the size of the doorway we go through it by
const PM = 2.4, PW = 40 - 2 * PM, PH = 26 - 2 * PM;
function frameGeo() {
  const parts = [], t = 1.8, m = PM, k = rgb(0x111114), mat = rgb(0xf4f0e8);
  for (const [w, h, x, y] of [[PW + 2 * (m + t), t, 0, PH + 2 * m + t / 2], [t, PH + 2 * m + t, -(PW / 2 + m + t / 2), (PH + 2 * m + t) / 2], [t, PH + 2 * m + t, PW / 2 + m + t / 2, (PH + 2 * m + t) / 2]]) parts.push(paint(box(w, h, 1.6, x, y, -1.0), k));
  for (const [w, h, x, y] of [[PW + 2 * m, m, 0, PH + m * 1.5], [m, PH + m, -(PW / 2 + m / 2), (PH + m) / 2], [m, PH + m, PW / 2 + m / 2, (PH + m) / 2]]) parts.push(paint(box(w, h, 0.4, x, y, -0.4), mat));
  return merge(parts);
}
const photoPlane = () => { const g = new THREE.PlaneGeometry(PW, PH); g.translate(0, PH / 2 + PM, -0.3); return g; };
// the back of it, a hole torn through where we come out
function backGeo() {
  const W = 60, H = 46, hw = 13, hh = 30, parts = [];
  for (const [xa, ya, xb, yb] of [[-W, 0, -hw, H], [hw, 0, W, H], [-hw, hh, hw, H]]) { const g = new THREE.PlaneGeometry(xb - xa, yb - ya); g.translate((xa + xb) / 2, (ya + yb) / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, ((xa + xb) / 2 + (uv.getX(i) - 0.5) * (xb - xa) + W) / (2 * W), ((ya + yb) / 2 + (uv.getY(i) - 0.5) * (yb - ya)) / H); parts.push(g); }
  return merge(parts);
}

extend({
  layers: {
    damCooler: (M) => [DM.cooler(), VCm(M, 'damCoolerM', 0.22, { roughness: 0.5 }), 4, {}],
    damMailbox: (M) => [DM.mailbox(), VCm(M, 'damMailboxM', 0.2, { roughness: 0.6 }), 4, {}],
    damBalloon: (M) => [DM.balloon(), TLm(M, 'damBalloonM', 0.35, { roughness: 0.25, metalness: 0.1 }, 0.08), 200, { aTint: 3 }],
    damString: (M) => [DM.string(), VCm(M, 'damStringM', 0.2, { roughness: 0.9 }), 200, {}],
    damSprinkler: (M) => [DM.sprinkler(), VCm(M, 'damSprinklerM', 0.2, { roughness: 0.5 }), 6, {}],
    damDrop: (M) => [DM.drop(), M.damDropM || (M.damDropM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.9, 1.25) })), 900, {}],
    damFridge: (M) => [DM.fridge(), VCm(M, 'damFridgeM', 0.25, { roughness: 0.35 }), 4, {}],
    damSet3: (M) => [DM.setList(), pic(M, 'damSet3M', tex().set3, 0.7), 2, {}],
    damSet8: (M) => [DM.setList(), pic(M, 'damSet8M', tex().set8, 0.7), 2, {}],
    damCounter: (M) => [DM.counter(), VCm(M, 'damCounterM', 0.25, { roughness: 0.4 }), 4, {}],
    damSink: (M) => [DM.sink(), VCm(M, 'damSinkM', 0.25, { roughness: 0.35, metalness: 0.2 }), 2, {}],
    damMap: (M) => [DM.mapSheet(), pic(M, 'damMapM', tex().map, 0.65), 2, {}],
    damShoes: (M) => [DM.shoes(), VCm(M, 'damShoesM', 0.25, { roughness: 0.7 }), 2, {}],
    damBed: (M) => [DM.bed(), VCm(M, 'damBedM', 0.22, { roughness: 0.85 }), 2, {}],
    damCoat: (M) => [DM.coat(), TLm(M, 'damCoatM', 0.18, { roughness: 0.9 }), 30, { aTint: 3 }],
    damKeys: (M) => [DM.keys(), VCm(M, 'damKeysM', 0.3, { roughness: 0.3, metalness: 0.5 }), 2, {}],
    damMatch: (M) => [DM.match(), VCm(M, 'damMatchM', 0.25, { roughness: 0.6 }), 2, {}],
    damFlame: (M) => [new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), M.damFlameM || (M.damFlameM = flameMaterial()), 4, { aK: 1 }],
    damSpeaker: (M) => [DM.speaker(), VCm(M, 'damSpeakerM', 0.15, { roughness: 0.6 }), 6, {}],
    damCone: (M) => [DM.cone(), M.damConeM || (M.damConeM = new THREE.MeshBasicMaterial({ color: 0x2a2a30 })), 6, {}],
    damCouch: (M) => [DM.couch(), VCm(M, 'damCouchM', 0.2, { roughness: 0.9 }), 4, {}],
    damDisco: (M) => [DM.disco(), VCm(M, 'damDiscoM', 0.5, { roughness: 0.12, metalness: 0.9 }), 3, {}],
    damAlarm: (M) => [DM.alarm(), VCm(M, 'damAlarmM', 0.3, { roughness: 0.5 }), 2, {}],
    damPool: (M) => [DM.pool(), VCm(M, 'damPoolM', 0.3, { roughness: 0.3 }), 3, {}],
    damGrill: (M) => [DM.grill(), VCm(M, 'damGrillM', 0.15, { roughness: 0.4, metalness: 0.4 }), 3, {}],
    damChair: (M) => [DM.chair(), VCm(M, 'damChairM', 0.25, { roughness: 0.5 }), 40, {}],
    damPole: (M) => [DM.pole(), VCm(M, 'damPoleM', 0.15, { roughness: 0.9 }), 160, {}],
    damBulb: (M) => [DM.bulb(), TLm(M, 'damBulbM', 1.4, { roughness: 0.3 }, 0.6), 1600, { aTint: 3 }],
    damWire: (M) => [DM.wire(), M.damWireM || (M.damWireM = new THREE.MeshBasicMaterial({ color: 0x1a1612 })), 1400, {}],
    damCup: (M) => [DM.cup(), M.damCupM || (M.damCupM = new THREE.MeshStandardMaterial({ color: 0xd8302a, roughness: 0.35, emissive: 0x3a0806, side: THREE.DoubleSide })), 260, {}],
    damIce: (M) => [DM.iceBag(), M.damIceM || (M.damIceM = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.2, emissive: 0x6a7a8a })), 12, {}],
    damDoor: (M) => [DM.doorFrame(), VCm(M, 'damDoorM', 0.2, { roughness: 0.6 }), 6, {}],
    damDoorLight: (M) => [DM.doorLight(), M.damDoorLightM || (M.damDoorLightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.75), side: THREE.DoubleSide })), 6, {}],
    damEdge: (M) => [paint(box(1.2, 34, 16, 0, 17, 0), rgb(0xf6f2ea)), VCm(M, 'damEdgeM', 0.32, { roughness: 0.6 }), 2, {}],
    damFrame: (M) => [frameGeo(), VCm(M, 'damFrameM', 0.25, { roughness: 0.4 }), 2, {}],
    damPhoto: (M) => [photoPlane(), M.damPhotoM || (M.damPhotoM = new THREE.MeshBasicMaterial({ map: tex().photo, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15) })), 2, {}],
    damBack: (M) => [backGeo(), pic(M, 'damBackM', tex().back, 0.35, { roughness: 0.95 }), 2, {}],
    damBoard: (M) => [DM.board(), VCm(M, 'damBoardM', 0.25, { roughness: 0.8 }), 20, {}],
    damBoardLeg: (M) => [DM.boardLeg(), VCm(M, 'damBoardLegM', 0.2, { roughness: 0.8 }), 40, {}],
    damBoardFace: (M) => [boardFace(), M.sign, 20, { aIdx: 1, aWake: 2 }],
    damFlake: (M) => [new THREE.PlaneGeometry(0.5, 0.32), TLm(M, 'damFlakeM', 0.9, { roughness: 0.4, side: THREE.DoubleSide }, 0.3), 900, { aTint: 3 }],
  },
  parts: {
    // her things, each where she sings it
    damProp(S, it, p, q, yaw) {
      const L = S.layers;
      for (const k of PROP_LAYERS[it.kind] || []) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, C = clockOf(S), s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._dmv || (S._dmv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 0.4, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.45, c = LAMP, r = 2.6) => poolAt(S, at.x, at.y + 0.12, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'cooler') { put('damCooler'); light(0.6, 1.4, [0.8, 0.9, 1], 0.35); spot(0.4, [0.8, 0.9, 1]); }
      else if (k === 'mailbox') {
        put('damMailbox');
        // the balloons tied to it, bobbing (still while the band's out)
        for (let j = 0; j < 6; j++) {
          const bx = Math.sin(j * 2.1) * 0.35 + Math.sin(C * 1.3 + j) * 0.06, bz = Math.cos(j * 1.7) * 0.3 + Math.cos(C * 1.1 + j * 2) * 0.06, by = 2.6 + (j % 3) * 0.32 + Math.sin(C * 1.7 + j * 1.3) * 0.05;
          put('damBalloon', bx, by, bz, q, s, tintV(BULBS[j % BULBS.length]));
          const top = local(at, yaw, bx * s, (by - 0.17) * s, bz * s, S._o), base = S._dmb || (S._dmb = new THREE.Vector3()); local(at, yaw, 0, 1.3 * s, 0, base);
          wireTo(S, 'damString', base, top, 0.01 * s);
        }
      }
      else if (k === 'sprinkler') {
        put('damSprinkler');
        // the water: a fan of drops going over and back; it hangs in the air while everything's stopped
        const sweep = Math.sin(C * 1.1);
        for (let j = 0; j < 70; j++) {
          const u = (C * 0.55 + j / 70) % 1, lane = (j % 7) / 6 - 0.5, ang = sweep * 0.7 + lane * 0.35;
          const d = u * 2.8, y = 0.2 + 2.2 * u - 2.3 * u * u;
          local(at, yaw, Math.sin(ang) * d * s, y * s, Math.cos(ang) * d * s * 0.6 + lane * 0.3 * s, S._o);
          m.compose(S._o, q, S._s.set(s * 0.9, s * 0.9, s * 0.9)); L.damDrop.add(m);
        }
        spot(0.25, [0.7, 0.85, 1], 3);
      }
      else if (k === 'fridge') { put('damFridge'); put(it.list === 8 ? 'damSet8' : 'damSet3'); light(1.6, 1.8, [0.9, 0.95, 1], 0.25, 0.5); spot(0.4, [0.95, 0.95, 1]); }
      else if (k === 'counter') { put('damCounter'); light(1.3, 2.2, LAMP, 0.25); spot(0.45); }
      else if (k === 'sink') { put('damSink'); put('damMap'); light(1.4, 2, LAMP, 0.25); spot(0.45); }
      else if (k === 'shoes') { put('damShoes'); spot(0.4); }
      else if (k === 'bed') {
        put('damBed');
        if (!it._coats) { const R = seeded(it.seed * 997 | 0); it._coats = []; for (let j = 0; j < 7; j++) it._coats.push([(R() - 0.5) * 0.9, 0.62 + j * 0.07, -0.3 + (R() - 0.3) * 1.3, R() * 6.28, col(COATS[j % COATS.length])]); }
        for (const c of it._coats) put('damCoat', c[0], c[1], c[2], quat('_dmcq', c[3]), s, tintV(c[4]));
        light(1.2, 2.4, LAMP, 0.2); spot(0.45);
      }
      else if (k === 'keys') { put('damKeys'); light(1.0, 1.3, [1, 0.9, 0.6], 0.5); spot(0.45); }
      else if (k === 'match') {
        put('damMatch');
        // struck on "match": the head flares, then burns
        const st = it.strike ?? 1e9, on = smooth(st - 0.05, st + 0.05, T), flare = Math.exp(-Math.max(0, T - st) * 3) * on;
        if (on > 0.01) {
          const w = local(at, yaw, 0.42 * s, 1.0 * s, 0, S._o);
          m.makeScale(0.32 * s * (1 + flare * 1.5), 0.62 * s * (1 + flare * 2.2), 1); m.setPosition(w.x, w.y - 0.05 * s, w.z); FK.aK = on; L.damFlame.add(m, FK);
          glowAt(S, w.x, w.y + 0.2 * s, w.z, (0.8 + 3 * flare) * s, FLAME, 1.0 + 2 * flare);
          poolAt(S, at.x, at.y + 0.12, at.z, (3 + 4 * flare) * s, FLAME, 0.5 * on + flare);
        }
      }
      else if (k === 'speaker') {
        put('damSpeaker'); put('damCone');
        const pump = Math.pow(1 - ((S.beat ?? 0) % 1), 3) * (stillAt(stopsOf(S.plan), T) ? 0 : 1);
        light(0.55, 0.5 + 0.3 * pump, [1, 0.5, 0.8], 0.25 + 0.6 * pump, 0.25);
        spot(0.3 + 0.2 * pump, [1, 0.5, 0.8], 2.2);
      }
      else if (k === 'couch') { put('damCouch'); spot(0.35); }
      else if (k === 'alarm') {
        put('damAlarm');
        // the good kind of alarm: a red blink, on the clock
        const bl = (C * 2.2) % 1 < 0.22 ? 1 : 0.08;
        light(-0.06, 0.18, [1, 0.12, 0.08], 1.8 * bl, 0.06);
      }
      else if (k === 'pool') { put('damPool'); spot(0.35, [0.6, 0.9, 1], 3); }
      else if (k === 'grill') {
        put('damGrill');
        for (let j = 0; j < 7; j++) { const f = (C * 0.35 + j / 7) % 1; const w = local(at, yaw, Math.sin(C * 0.8 + j) * 0.1 * s, (1.1 + f * 2.2) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (0.2 + f * 0.6) * s, [0.75, 0.72, 0.7], 0.22 * (1 - f)); }
        light(0.85, 0.5, [1, 0.45, 0.15], 0.6);
      }
      else if (k === 'chairs') {
        if (!it._ch) { const R = seeded(it.seed * 333 | 0); it._ch = [0, 1, 2].map(() => [(R() - 0.5) * 0.4, (R() - 0.5) * 0.8]); }
        for (let j = 0; j < 3; j++) put('damChair', (j - 1) * 0.8, 0, it._ch[j][0], quat('_dmhq', it._ch[j][1]));
      }
      else if (k === 'door') {
        put('damDoor'); put('damDoorLight');
        light(1.0, 1.6, LAMP, 0.6, -0.1); poolAt(S, local(at, yaw, 0, 0, 1.2 * s, S._o).x, at.y + 0.12, S._o.z, 3 * s, LAMP, 0.55);
      }
      else if (k === 'cups') {
        // a tower of red cups, counted
        if (!it._st) { const R = seeded(it.seed * 555 | 0); it._st = []; for (let c = 0; c < (it.stacks ?? 5); c++) it._st.push([(c - 2) * 0.13 + (R() - 0.5) * 0.04, (R() - 0.5) * 0.1, 8 + Math.floor(R() * 26)]); }
        for (const [cx, cz, n] of it._st) for (let j = 0; j < n; j++) put('damCup', cx, j * 0.022, cz);
        light(0.5, 1.5, [1, 0.4, 0.3], 0.25); spot(0.4);
      }
      else if (k === 'edge') {
        // the white edge of the photograph, standing through her
        put('damEdge');
        light(18, 26, FLASH, 0.12, 0);
      }
      else if (k === 'load') {
        // what she's carrying: the bag of ice against her, the sleeve of cups in her other hand
        put('damIce', -0.16, 1.05, 0.22);
        for (let j = 0; j < 9; j++) put('damCup', -0.02, 0.98 + j * 0.022, 0.3);
      }
      else if (k === 'ice') { for (let j = 0; j < 3; j++) put('damIce', (j - 1) * 0.36, 0.16, (j % 2) * 0.12); poolAt(S, at.x, at.y + 0.1, at.z, 1.6 * s, [0.7, 0.85, 1], 0.5); }
    },
    // the dollar lights, strung across the road from pole to pole (or along her porch), twinkling on the clock
    damGarland(S, it, p, q, yaw) {
      const L = S.layers; void L.damBulb; void L.damWire; void L.damPole;
      if (!S.track) return;
      const C = clockOf(S), m = S._m;
      const y0 = it.ground ? 0 : (it.h ?? 0), top = it.top ?? 22, sag = it.sag ?? 3.5, hw = it.hw ?? 30, n = it.n ?? 16;
      const a = S._dga || (S._dga = new THREE.Vector3()), b = S._dgb || (S._dgb = new THREE.Vector3());
      // the poles
      for (const sd of [-1, 1]) { local(p, yaw, sd * hw, 0, 0, a); a.y = y0; m.compose(a, q, S._s.set(it.pole ?? 3, top - y0, it.pole ?? 3)); L.damPole.add(m); }
      let px = 0, py = 0, pz = 0;
      for (let j = 0; j <= n; j++) {
        const u = j / n, x = -hw + 2 * hw * u, y = top - sag * (1 - (2 * u - 1) * (2 * u - 1));
        local(p, yaw, x, 0, 0, b); b.y = y;
        if (j) { a.set(px, py, pz); wireTo(S, 'damWire', a, b, it.thick ?? 0.25); }
        px = b.x; py = b.y; pz = b.z;
        if (j > 0 && j < n) {
          const c = BULBS[(j + (it.seed * 10 | 0)) % BULBS.length], tw = 0.75 + 0.25 * Math.sin(C * 3.1 + j * 1.9 + it.seed * 20);
          m.compose(b, q, S._s.set(it.bulb ?? 9, it.bulb ?? 9, it.bulb ?? 9)); L.damBulb.add(m, tintV(c));
          glowAt(S, b.x, b.y - 0.3, b.z, (it.glow ?? 4.2) * tw, c, 0.9 * tw);
        }
      }
    },
    // the disco ball in the middle of the ceiling, and the specks of light it throws round the walls
    damDisco(S, it, p, q, yaw) {
      const L = S.layers; void L.damDisco;
      if (!S.track) return;
      const C = clockOf(S), s = it.s ?? 1, m = S._m, fy = it.h ?? 0;
      const at = S._ddv || (S._ddv = new THREE.Vector3()); at.set(p.x, fy + (it.top ?? 26), p.z);
      S._e.set(0, C * 0.9, 0); const rq = (S._ddq || (S._ddq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(at, rq, S._s.set(s, s, s)); L.damDisco.add(m);
      glowAt(S, at.x, at.y, at.z, 5 * s * 0.25, [1, 0.95, 0.9], 0.7);
      const w = S._o, W = it.wall ?? 33.4;
      for (let k = 0; k < 26; k++) {
        const ang = C * 0.9 + k * 2.39996, sd = Math.cos(ang) > 0 ? 1 : -1;
        const along = Math.sin(ang) * 70, y = fy + 5 + ((k * 0.618) % 1) * 22;
        local(p, yaw, sd * W, 0, along, w); w.y = y;
        glowAt(S, w.x, w.y, w.z, 1.4, k % 4 ? [1, 0.95, 0.9] : [1, 0.5, 0.8], 1.1 * Math.abs(Math.cos(ang)));
      }
    },
    // the photograph at the end of the hall in its cheap frame; it's gone as we go into it
    damPhotoFrame(S, it, p, q, yaw) {
      const L = S.layers; void L.damFrame; void L.damPhoto;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      const at = S._dpf || (S._dpf = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      S._e.set(0, S.course.yawAt(it.t), 0); const fq = (S._dpq || (S._dpq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(at, fq, S._s.set(1, 1, 1)); L.damFrame.add(m);
      if (T < it.t - 0.32) L.damPhoto.add(m);
      local(at, S.course.yawAt(it.t), 0, 18, -6, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 30, [1, 0.97, 0.9], 0.18);
    },
    // the back of the photograph, brown card, a hole through it where we come out
    damPhotoBack(S, it, p) {
      const L = S.layers; void L.damBack;
      if (!S.track) return;
      const m = S._m, at = S._dpb || (S._dpb = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      S._e.set(0, S.course.yawAt(it.t) + Math.PI, 0); const fq = (S._dbq || (S._dbq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(at, fq, S._s.set(1, 1, 1)); L.damBack.add(m);
    },
    // her lines, on a letter board on an easel at the side
    damSign(S, it, p) {
      const L = S.layers; void L.damBoard; void L.damBoardLeg; void L.damBoardFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, h = S.course.yawAt(it.t), m = S._m, s = it.s ?? 1;
      S._e.set(-0.08, h + Math.PI + (it.x > 0 ? -0.3 : 0.3), 0); const fq = (S._dsq || (S._dsq = new THREE.Quaternion())).setFromEuler(S._e);
      const base = it.floor ? floorAt(S.course, it.t) : 0;
      p.y = S.course.yyw(it.t, S._dsy || (S._dsy = {})).y + (it.h || 7);
      m.compose(p, fq, S._s.set(s, s, s)); L.damBoard.add(m); L.damBoardFace.add(m, signV(it.idx, 1));
      // its two legs down to the floor
      const legH = Math.max(1, p.y - 5 * s - base), w = S._o;
      for (const sd of [-1, 1]) { local(p, h + Math.PI + (it.x > 0 ? -0.3 : 0.3), sd * 9 * s, -5 * s, -0.6 * s, w); m.compose(w, fq, S._s.set(s, legH, s)); L.damBoardLeg.add(m); }
      void T;
      glowAt(S, p.x, p.y + 6 * s, p.z, 22 * s, LAMP, 0.1);
    },
    // confetti from the last chorus, hanging in the air when everything stops
    damConfetti(S, it, p) {
      const L = S.layers; void L.damFlake;
      if (!S.track) return;
      const C = clockOf(S), m = S._m, fy = it.ground ? 0 : (it.h ?? 0), top = it.top ?? 34, yaw = S.course.yawAt(it.t);
      if (!it._fl) { const R = seeded(it.seed * 7777 | 0); it._fl = []; for (let j = 0; j < (it.n ?? 24); j++) it._fl.push([(R() - 0.5) * 2 * (it.hw ?? 40), (R() - 0.5) * 30, 1.6 + R() * 1.4, R(), 2 + R() * 3, 1 + R() * 2]); }
      for (let j = 0; j < it._fl.length; j++) {
        const [x, z, sp, ph, r1, r2] = it._fl[j];
        const y = fy + top - ((C * sp * 0.12 + ph) % 1) * (top - 1);
        const w = S._o; local(p, yaw, x + Math.sin(C * 1.7 + j) * 1.2, 0, z + Math.cos(C * 1.3 + j) * 1.2, w); w.y = y;
        S._e.set(C * r1 + j, C * r2, j); const fq = (S._dcq || (S._dcq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, fq, S._s.set(2.4, 2.4, 2.4)); L.damFlake.add(m, tintV(BULBS[j % BULBS.length]));
      }
    },
  },
  kits: {
    damProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, list: c.list, strike: c.strike, seed: c.seed ?? (c.t * 0.137) % 1, stacks: c.stacks, h: 0, parts: 'damProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // dollar lights strung across the road every so often
    damLights(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) { const it = { t, x: 0, rot: 0, seed: R(), hw: z.hw ?? 30, sag: z.sag, n: z.n, pole: z.pole, bulb: z.bulb, glow: z.glow, ground: !z.floor, h: 0, parts: 'damGarland', ahead: 22 }; if (z.floor) onFloor(S, it); it.top = z.above !== undefined ? S.course.sample(t).y + z.above : (z.floor ? it.h : 0) + (z.top ?? 22); S.items.push(it); } },
    damDisco(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, s: z.s ?? 12, top: z.top, wall: z.wall, h: 0, parts: 'damDisco', ahead: 40 })); },
    damPhotoFrame(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, h: 0, parts: 'damPhotoFrame', ahead: 46 })); },
    damPhotoBack(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, h: 0, parts: 'damPhotoBack', ahead: 46 })); },
    damConfetti(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) { const it = { t, x: 0, rot: 0, seed: R(), n: z.n, hw: z.hw, top: z.top, ground: !z.floor, h: 0, parts: 'damConfetti', ahead: 30 }; S.items.push(z.floor ? onFloor(S, it) : it); } },
    // her street: houses with their porches lit, trees, lamps, cars along the curb (and, the
    // night of the party, people's cars parked all the way down)
    damStreet(S, z, R) {
      const PAST = [0xd8e4f0, 0xf0e0c8, 0xe8d0d8, 0xd0e8d8, 0xf4ecd8, 0xc8d4e8];
      for (let t = z.from; t < z.to; t += 0.13 + R() * 0.05) {
        for (const side of z.side ? [z.side] : [-1, 1]) {
          const r1 = R();
          if (r1 < 0.62) {
            const x = side * ((z.x ?? 34) + R() * 6), tt = t + R() * 0.05;
            S.items.push({ t: tt, x, rot: SIDE(side), s: (z.s ?? 1.6) * (0.9 + R() * 0.2), parts: 'house', tint: col(pick(R, PAST)), roofTint: col(pick(R, [0x2a2030, 0x30243a, 0x3a2a24])), seed: R(), wake0: 0.55, keepLit: true, porch: true });
            if (R() < 0.6) S.items.push({ t: tt + 0.04, x: x - side * 9, rot: SIDE(side) + Math.PI / 2 + (R() - 0.5) * 0.1, parts: 'parked', tint: col(pick(R, [0xd83a3a, 0x3a5ad8, 0xe8e0d0, 0x2a2a30, 0x6a8a5a, 0xd8a040])) });
          } else if (r1 < 0.85) S.items.push({ t, x: side * ((z.x ?? 34) - 6 + R() * 10), s: 1.1 + R() * 0.5, parts: 'tree', tint: col(pick(R, [0x1c3a2a, 0x223a2a, 0x2a3a24])), seed: R() });
          if (R() < 0.45) S.items.push({ t: t + R() * 0.1, x: side * ((z.x ?? 34) + 30 + R() * 20), rot: SIDE(side), s: 1.5 + R() * 0.3, parts: 'house', tint: col(pick(R, PAST)), roofTint: col(0x2a2030), seed: R(), wake0: 0.45 });
          if (R() < 0.25) S.items.push({ t, x: side * (90 + R() * 70), s: 1.3 + R() * 0.8, parts: 'tree', tint: col(0x16281e), pine: R() < 0.4, seed: R() });
        }
        if ((Math.round(t / 0.13)) % 3 === 0) for (const side of z.side ? [z.side] : [-1, 1]) S.items.push({ t, x: side * (z.lampX ?? 16), rot: SIDE(side), parts: 'lamp', seed: R() });
      }
    },
    // the back yard: a picket fence down both sides, the neighbours' yards dark beyond it
    damYard(S, z, R) {
      for (let t = z.from; t < z.to; t += 0.16) for (const side of [-1, 1]) {
        S.items.push({ t, x: side * (z.fence ?? 46), rot: 0, s: 2.2, parts: 'fence', tint: col(0xe8e4dc) });
        if (R() < 0.4) S.items.push({ t: t + R() * 0.1, x: side * (70 + R() * 30), rot: SIDE(side), s: 1.6, parts: 'house', tint: col(pick(R, [0xc8d0d8, 0xe0d4c0, 0xd8c8c8])), roofTint: col(0x2a2030), seed: R(), wake0: 0.35 });
        if (R() < 0.35) S.items.push({ t: t + R() * 0.1, x: side * (52 + R() * 14), s: 1.2 + R() * 0.5, parts: 'tree', tint: col(pick(R, [0x1c3a2a, 0x22402a])), seed: R() });
      }
    },
  },
});

// which layers each of her things uses (asked for up front, so nothing compiles mid-ride)
const PROP_LAYERS = {
  cooler: ['damCooler'], mailbox: ['damMailbox', 'damBalloon', 'damString'], sprinkler: ['damSprinkler', 'damDrop'], fridge: ['damFridge', 'damSet3', 'damSet8'],
  counter: ['damCounter'], sink: ['damSink', 'damMap'], shoes: ['damShoes'], bed: ['damBed', 'damCoat'], keys: ['damKeys'], match: ['damMatch', 'damFlame'],
  speaker: ['damSpeaker', 'damCone'], couch: ['damCouch'], alarm: ['damAlarm'], pool: ['damPool'], grill: ['damGrill'], chairs: ['damChair'],
  door: ['damDoor', 'damDoorLight'], cups: ['damCup'], ice: ['damIce'], edge: ['damEdge'], load: ['damIce', 'damCup'],
};

// a thin box from a to b (a wire, a balloon's string): the unit box along +x, stretched and turned
const _wx = new THREE.Vector3(), _wy = new THREE.Vector3(), _wz = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _alt = new THREE.Vector3(1, 0, 0);
function wireTo(S, layer, a, b, thick) {
  _wx.subVectors(b, a); const len = _wx.length(); if (len < 1e-4) return;
  _wx.multiplyScalar(1 / len);
  _wz.crossVectors(_wx, _up); if (_wz.lengthSq() < 1e-6) _wz.crossVectors(_wx, _alt); _wz.normalize();
  _wy.crossVectors(_wz, _wx);
  const m = S._m;
  m.makeBasis(_wx.multiplyScalar(len), _wy.multiplyScalar(thick), _wz.multiplyScalar(thick)).setPosition(a);
  S.layers[layer].add(m);
}
const FK = { aK: 0 };
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
