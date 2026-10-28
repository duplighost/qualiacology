// Heart of the Party: the set-pieces, each on its line. A disco ball over the street on "first
// one on the dance floor"; YES and MORE in neon; the backstage pass over the road; the birthday
// cake whose candles count up to nine; the ticket nobody used tearing as she passes under it;
// two dancers in a lit window, "for the both of us"; the kick drum keeping the beat; the cocktail
// shaker shaking it. Every name starts hpt.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, groundAt } from './trail.js';
import { merge, cyl, sph, box, paint, rgb, seeded, VC, fogged, HFOG, clamp, smooth, TAU } from './hpt-sets.js';

// turned to the rider coming up the road, and a little toward the road
export const FACE = (x) => Math.PI + (x > 0 ? -0.55 : 0.55);
const BLANK = {};
// a heart outline (scale 1: about 2 wide, 1.9 tall, tip at the bottom)
export function heartShape(k = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i) s.lineTo(x / 16 * k, (y + 2.5) / 16 * k); else s.moveTo(x / 16 * k, (y + 2.5) / 16 * k);
  }
  return s;
}
export const heartGeo = (k, depth, bevel = 0.1) => { const g = new THREE.ExtrudeGeometry(heartShape(k), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 14 }); g.translate(0, 0, -depth / 2); return g; };
// the ribbon's height at song time t: things over the road hang from it
const roadY = (S, t) => S.course.sample(t).y;
// the shaker's outline as seen from the front, every metre or so (radius, height)
const SHAKER_EDGE = [[3.05, 0.6], [3.15, 2.2], [3.25, 3.8], [3.32, 5.4], [3.45, 7.0], [3.6, 8.6], [3.75, 10.2], [3.35, 11.6], [2.95, 12.8], [2.3, 14.0], [1.6, 15.2], [1.55, 16.4], [0.7, 17.3], [0, 17.4]];
// our own scratch quaternion (the scenery's _q is the one handed to every part)
export const HQ = (S) => S._hptQ || (S._hptQ = new THREE.Quaternion());
// and our own Euler: yaw first, then the piece's own pitch and roll
export const HE = (S) => S._hptE || (S._hptE = new THREE.Euler(0, 0, 0, 'YXZ'));
const yawOf = (S, it) => S.course.sample(it.t).yaw + (it.rot || 0);

// ---------- models ----------
const G = {
  // the disco ball: a thousand mirror tiles, its cap; the chain is separate (it doesn't turn)
  disco() {
    const g = new THREE.IcosahedronGeometry(5, 3).toNonIndexed(), R = seeded(5), p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 3) { const v = 0.5 + R() * 0.45, r = R(); const tint = r < 0.05 ? [1, 0.45, 0.65] : r < 0.08 ? [1, 0.85, 0.5] : [v, v, v * 1.06]; for (let j = 0; j < 3; j++) c.set(tint, (i + j) * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv');
    const cap = paint(cyl(0.9, 1.3, 0.8, 12, 0, 5.2, 0), rgb(0x8a8a94)); cap.deleteAttribute('uv');
    const out = merge([g, cap]); out.computeVertexNormals(); return out;
  },
  chain() { const parts = []; for (let k = 0; k < 40; k++) { const l = new THREE.TorusGeometry(0.42, 0.12, 4, 8); if (k % 2) l.rotateY(Math.PI / 2); l.translate(0, 6 + k * 0.78, 0); parts.push(paint(l, rgb(0x9a9aa4))); } return merge(parts); },
  // a neon sign on legs: two posts, a truss across the top, a dark backing panel
  neonRig() {
    const parts = [], steel = rgb(0x24202c);
    for (const x of [-6.5, 6.5]) parts.push(paint(box(0.7, 15.5, 0.7, x, 7.75, -0.8), steel));
    for (const y of [9.1, 16.1]) parts.push(paint(box(19.6, 0.5, 0.5, 0, y, -0.8), steel));
    for (let k = 0; k < 10; k++) { const b = box(0.25, 7.6, 0.25, -9 + k * 2, 12.6, -0.8); b.rotateZ(k % 2 ? 0.26 : -0.26); parts.push(paint(b, steel)); }
    parts.push(paint(box(19, 6.4, 0.4, 0, 12.6, -0.45), rgb(0x0c0810)));
    return merge(parts);
  },
  neonFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.4, 2.4, 1); g.translate(0, 12.6, 0); return g; },
  // a backstage pass on its lanyard: a laminated card, a red band across the top, the strap
  pass() {
    const parts = [];
    parts.push(paint(box(9.6, 13.6, 0.3, 0, -6.8, 0), rgb(0xe8e4ec)));
    parts.push(paint(box(9.6, 3.2, 0.34, 0, -1.8, 0), rgb(0xd8203a)));
    const h = heartGeo(1.2, 0.2, 0.05); h.translate(0, -1.9, 0.25); parts.push(paint(h, rgb(0xfff0f4)));
    parts.push(paint(box(9.6, 1.4, 0.34, 0, -12.9, 0), rgb(0x141018)));
    parts.push(paint(cyl(0.7, 0.7, 0.4, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(0, -0.9, 0), rgb(0x2a2a30)));
    // the strap, up both sides to the clip
    for (const s of [-1, 1]) { const st = box(1.0, 26, 0.12, 0, 13, 0); st.rotateZ(s * 0.14); st.translate(s * 1.8, 0, -0.1); parts.push(paint(st, rgb(0xd8203a))); }
    parts.push(paint(box(1.6, 1.6, 0.6, 0, 0.2, 0), rgb(0xc0c4cc)));
    return merge(parts);
  },
  passFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(1.2, 1.5, 1); g.translate(0, -7.2, 0.17); return g; },
  // a birthday cake in three tiers, frosting round each, hearts on its sides; the candles are separate
  cake() {
    const parts = [], R = seeded(9);
    const white = rgb(0xfaf2f4), pink = rgb(0xff9ac0), red = rgb(0xe8203a), gold = rgb(0xe0b860);
    parts.push(paint(cyl(11.5, 10.5, 0.8, 40, 0, 0.4, 0), gold));
    parts.push(paint(cyl(1.6, 2.6, 2.4, 20, 0, 1.6, 0), gold));
    parts.push(paint(cyl(12, 12, 0.5, 40, 0, 3, 0), gold));
    let y = 3.25;
    for (const [r, h, c] of [[9.5, 5, white], [7.2, 4.4, pink], [5, 3.8, white]]) {
      parts.push(paint(cyl(r, r, h, 36, 0, y + h / 2, 0), c));
      parts.push(paint(new THREE.TorusGeometry(r, 0.45, 6, 36).rotateX(Math.PI / 2).translate(0, y + h, 0), c === white ? pink : white));
      parts.push(paint(new THREE.TorusGeometry(r + 0.05, 0.35, 6, 36).rotateX(Math.PI / 2).translate(0, y + 0.2, 0), c === white ? pink : white));
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + y; parts.push(paint(sph(0.55, 1, 1.6, 1, Math.cos(a) * r, y + h - 0.7, Math.sin(a) * r, 6, 4), c === white ? pink : white)); }
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + 0.3 + y; const hh = heartGeo(0.9 + R() * 0.3, 0.3, 0.06); hh.rotateY(Math.PI / 2 - a); hh.translate(Math.cos(a) * (r + 0.1), y + h * 0.45, Math.sin(a) * (r + 0.1)); parts.push(paint(hh, red)); }
      y += h;
    }
    return merge(parts);
  },
  // nine candles round the top tier (top at y 16.45), striped in pairs
  candles() {
    const parts = [], cs = [0xff6fb0, 0xfff2c8, 0x5ff2ff, 0xffd27a, 0xb48cff];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU, x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4;
      parts.push(paint(cyl(0.32, 0.32, 3.4, 10, x, 18.15, z), rgb(cs[k % 5])));
      for (let j = 0; j < 3; j++) parts.push(paint(cyl(0.34, 0.34, 0.3, 10, x, 17.0 + j * 1.0, z), rgb(0xffffff)));
      parts.push(paint(cyl(0.05, 0.05, 0.5, 4, x, 20.1, z), rgb(0x1a1210)));
    }
    return merge(parts);
  },
  // the ticket: the main part (ADMIT ONE goes on in front), its border, the perforation; the stub is separate
  ticket() {
    const parts = [], cream = rgb(0xf4ead2), red = rgb(0xc8102e);
    parts.push(paint(box(19.6, 9.4, 0.2, -3.2, 0, 0), cream));
    for (const [w, h, x, y] of [[19.6, 0.5, -3.2, 4.45], [19.6, 0.5, -3.2, -4.45], [0.5, 9.4, -12.75, 0]]) parts.push(paint(box(w, h, 0.26, x, y, 0), red));
    for (let k = 0; k < 14; k++) parts.push(paint(cyl(0.16, 0.16, 0.3, 6, 6.6, -4.1 + k * 0.63, 0).rotateX(Math.PI / 2).translate(0, 0, 0), rgb(0x3a2a20)));
    // the wires it hangs from, out to both sides and up
    for (const s of [-1, 1]) { const w = box(0.12, 0.12, 30, 0, 0, 0); w.rotateY(Math.PI / 2); w.rotateZ(s * 0.32); w.translate(s * 14, 9.5, 0); parts.push(paint(w, rgb(0x2a2a30))); }
    return merge(parts);
  },
  stub() {
    const parts = [], cream = rgb(0xf4ead2), red = rgb(0xc8102e);
    parts.push(paint(box(6.0, 9.4, 0.2, 3.0, 0, 0), cream));
    for (const [w, h, x, y] of [[6.0, 0.5, 3.0, 4.45], [6.0, 0.5, 3.0, -4.45], [0.5, 9.4, 5.75, 0]]) parts.push(paint(box(w, h, 0.26, x, y, 0), red));
    const hh = heartGeo(1.6, 0.25, 0.05); hh.rotateZ(Math.PI / 2); hh.translate(3.0, 0, 0.2); parts.push(paint(hh, red));
    return merge(parts);
  },
  ticketFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.1, 2.5, 1); g.translate(-3.6, 0, 0.13); return g; },
  // the window the two of them dance in: a brick wall, its frame and sill; the lit pane is separate
  duoWall() {
    const parts = [], brick = rgb(0x5a2430), trim = rgb(0xd8c8b8);
    parts.push(paint(box(22, 28, 2.4, 0, 14, -1.4), brick));
    for (let r = 0; r < 28; r++) parts.push(paint(box(22.1, 0.12, 2.42, 0, r + 0.5, -1.4), rgb(0x3a1820)));
    for (const [w, h, x, y] of [[16.4, 1.0, 0, 23.9], [16.4, 1.2, 0, 5.6], [1.0, 18.6, -7.7, 14.8], [1.0, 18.6, 7.7, 14.8], [0.5, 17.4, 0, 14.8]]) parts.push(paint(box(w, h, 0.7, x, y, 0), trim));
    parts.push(paint(box(17.6, 0.6, 2.4, 0, 4.9, 0.6), trim));
    // a little roof over it, a lamp each side
    parts.push(paint(box(23, 1.2, 3.2, 0, 28.4, -1.2), rgb(0x2a1218)));
    return merge(parts);
  },
  duoPane() { const g = new THREE.PlaneGeometry(14.8, 17.4); g.translate(0, 14.8, -0.15); return g; },
  // the kick drum, its head to +z: the shell, the hoops and lugs, the spurs; the head and beater are separate
  kick() {
    const parts = [], R = seeded(3);
    const shell = new THREE.CylinderGeometry(11, 11, 9, 48, 6, true); shell.rotateX(Math.PI / 2); shell.translate(0, 11.4, 0);
    { const p = shell.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = 0.75 + R() * 0.4; c.set([0.85 * v, 0.06 * v, 0.14 * v], i * 3); } shell.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    parts.push(shell);
    const chrome = rgb(0xd8dce4);
    for (const z of [-4.6, 4.6]) { parts.push(paint(new THREE.TorusGeometry(11.15, 0.55, 8, 48).translate(0, 11.4, z), chrome)); }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; for (const z of [-2.6, 2.6]) parts.push(paint(box(0.9, 0.9, 2.6, Math.cos(a) * 11.4, 11.4 + Math.sin(a) * 11.4, z), chrome)); parts.push(paint(box(0.35, 0.35, 9.4, Math.cos(a) * 11.6, 11.4 + Math.sin(a) * 11.6, 0), chrome)); }
    for (const s of [-1, 1]) { const sp = cyl(0.35, 0.35, 8, 8, 0, 0, 0); sp.rotateZ(s * 0.65); sp.translate(s * 10.5, 3.2, 3.2); parts.push(paint(sp, chrome)); }
    // the pedal behind it
    parts.push(paint(box(3.2, 0.6, 7, 0, 0.3, -9.5), rgb(0x2a2a30)));
    parts.push(paint(box(0.5, 4, 0.5, -1.4, 2.2, -6.8), chrome), paint(box(0.5, 4, 0.5, 1.4, 2.2, -6.8), chrome));
    const g = merge(parts); g.computeVertexNormals(); return g;
  },
  // the front head: white, a red heart on it, a ring of light where it meets the hoop
  kickHead() {
    const parts = [];
    parts.push(paint(new THREE.CircleGeometry(10.7, 48).translate(0, 11.4, 4.62), rgb(0xf6f0f2)));
    const h = heartGeo(5.6, 0.3, 0.08); h.translate(0, 9.6, 4.8); parts.push(paint(h, rgb(0xe8203a)));
    const g = merge(parts.map((p) => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); return p; }));
    return g;
  },
  // the beater: its arm from the pivot (the origin) up, the felt at its end
  beater() { const parts = [paint(cyl(0.35, 0.35, 10, 8, 0, 5, 0), rgb(0xd8dce4)), paint(sph(1.4, 1, 1, 1.2, 0, 10.2, 0, 12, 8), rgb(0xf4f0e8))]; return merge(parts); },
  // a cocktail shaker, three pieces of chrome: tin, strainer, cap (on a little stand)
  shaker() {
    const pts = [[0, 0], [3.0, 0], [3.1, 0.3], [3.4, 6], [3.7, 9.6], [3.75, 10.2], [3.4, 10.4], [3.3, 11.2], [2.7, 13.2], [1.6, 14.8], [1.7, 15.2], [1.5, 15.4], [1.55, 16.6], [1.2, 17.2], [0, 17.3]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 36);
    // the tin in rose gold, the strainer and cap paler, bright bands where they meet
    { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(p.getY(i) < 10.3 ? rgb(0xff3a8a) : rgb(0xffd27a), i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    const parts = [g, paint(new THREE.TorusGeometry(3.72, 0.22, 6, 36).rotateX(Math.PI / 2).translate(0, 10.2, 0), rgb(0xffffff)), paint(new THREE.TorusGeometry(1.6, 0.16, 6, 24).rotateX(Math.PI / 2).translate(0, 15.2, 0), rgb(0xffffff)), paint(new THREE.TorusGeometry(3.12, 0.16, 6, 36).rotateX(Math.PI / 2).translate(0, 0.4, 0), rgb(0xffffff))];
    // drops of cold on it
    const R = seeded(31); for (let k = 0; k < 40; k++) { const a = R() * TAU, y = 1 + R() * 8.5, r = 3.1 + (y / 9.6) * 0.6; parts.push(paint(sph(0.14, 1, 1.4, 1, Math.cos(a) * r, y, Math.sin(a) * r, 5, 4), rgb(0xffffff))); }
    const out = merge(parts); out.computeVertexNormals(); return out;
  },
};

// ---------- the two dancers: eight poses each, drawn once into a sheet ----------
let DUO_TEX = null;
function duoTexture() {
  const W = 256, H = 300, cv = document.createElement('canvas'); cv.width = W * 4; cv.height = H * 2;
  const g = cv.getContext('2d');
  // a figure: hip at (x, y), pose angles in radians; long hair for her
  const figure = (x, y, s, P, her) => {
    const pt = (x0, y0, a, l) => [x0 + Math.sin(a) * l, y0 - Math.cos(a) * l];
    const line = (a, b, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const hip = [x + P.sway * s, y], neck = pt(hip[0], hip[1], P.lean, 62 * s), head = pt(neck[0], neck[1], P.lean * 1.4, 22 * s);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    for (const [th, kn] of [[P.l1, P.k1], [P.l2, P.k2]]) { const k = pt(hip[0], hip[1], Math.PI + th, 44 * s); const f = pt(k[0], k[1], Math.PI + th + kn, 44 * s); line(hip, k, 15 * s); line(k, f, 13 * s); }
    // the body (a dress for her)
    if (her) { g.beginPath(); g.moveTo(neck[0] - 9 * s, neck[1] + 6 * s); g.lineTo(neck[0] + 9 * s, neck[1] + 6 * s); g.lineTo(hip[0] + 26 * s, hip[1] + 22 * s); g.lineTo(hip[0] - 26 * s, hip[1] + 22 * s); g.closePath(); g.fill(); }
    else line(neck, hip, 24 * s);
    // arms
    for (const [sh, el] of [[P.a1, P.e1], [P.a2, P.e2]]) { const sp = [neck[0], neck[1] + 6 * s]; const e = pt(sp[0], sp[1], sh, 34 * s); const hnd = pt(e[0], e[1], sh + el, 32 * s); line(sp, e, 10 * s); line(e, hnd, 9 * s); }
    g.beginPath(); g.arc(head[0], head[1], 15 * s, 0, TAU); g.fill();
    if (her) { g.beginPath(); g.moveTo(head[0] - 15 * s, head[1] - 4 * s); g.quadraticCurveTo(head[0] - 30 * s, head[1] + 30 * s, head[0] - 12 * s + P.sway * 4, head[1] + 44 * s); g.lineTo(head[0] + 4 * s, head[1] + 10 * s); g.fill(); }
  };
  const poses = [
    { sway: -6, lean: -0.1, l1: -0.25, k1: 0.1, l2: 0.15, k2: -0.2, a1: -2.6, e1: -0.3, a2: 2.7, e2: 0.2 },
    { sway: 4, lean: 0.12, l1: -0.1, k1: 0.3, l2: 0.3, k2: 0.0, a1: -1.4, e1: -1.0, a2: 1.2, e2: 1.2 },
    { sway: -2, lean: -0.05, l1: -0.3, k1: -0.2, l2: 0.1, k2: 0.4, a1: -2.9, e1: 0.2, a2: 2.4, e2: -0.4 },
    { sway: 7, lean: 0.18, l1: -0.05, k1: 0.0, l2: 0.35, k2: -0.5, a1: -0.8, e1: -1.6, a2: 2.9, e2: 0.0 },
  ];
  for (let f = 0; f < 8; f++) {
    const cx = (f % 4) * W, cy = Math.floor(f / 4) * H;
    const grd = g.createLinearGradient(0, cy, 0, cy + H); grd.addColorStop(0, '#ffb070'); grd.addColorStop(0.55, '#ff5a7a'); grd.addColorStop(1, '#b0204a');
    g.fillStyle = grd; g.fillRect(cx, cy, W, H);
    g.fillStyle = 'rgba(255,240,220,0.35)'; g.beginPath(); g.ellipse(cx + W / 2, cy + H * 0.42, W * 0.42, H * 0.36, 0, 0, TAU); g.fill();
    g.fillStyle = '#12060c'; g.strokeStyle = '#12060c';
    const pa = poses[f % 4], pb = poses[(f + 2) % 4];
    figure(cx + W * 0.34, cy + H * 0.62, 1.05, pa, true);
    figure(cx + W * 0.68, cy + H * 0.6, 1.12, { ...pb, sway: -pb.sway, a1: -pb.a2, a2: -pb.a1, e1: -pb.e2, e2: -pb.e1 }, false);
    // the floor they dance on
    g.fillStyle = '#2a0a14'; g.fillRect(cx, cy + H * 0.86, W, H * 0.14);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function duoMaterial() {
  const tex = DUO_TEX || (DUO_TEX = duoTexture());
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex }, ...HFOG },
    vertexShader: `attribute float aF; varying vec2 vUv; varying vec3 vW; void main(){ float f = floor(aF + 0.5); vUv = vec2((mod(f, 4.0) + uv.x) / 4.0, 1.0 - (floor(f / 4.0) + 1.0 - uv.y) / 2.0); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: `uniform sampler2D tMap; uniform vec3 uHptFog; uniform float uHptFogD; varying vec2 vUv; varying vec3 vW;
      void main(){ vec3 c = texture2D(tMap, vUv).rgb * 1.5; float d = length(cameraPosition - vW); float f = 1.0 - exp(-pow(d * uHptFogD, 1.5)); gl_FragColor = vec4(mix(c, uHptFog, clamp(f, 0.0, 1.0)), 1.0); }`,
    side: THREE.DoubleSide,
  });
}

// the disco ball's mirrors: a few tiles at a time throw the light back
function discoMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.22, flatShading: true });
  return fogged(m, 'Disco', (sh) => {
    sh.uniforms.uHptT = DISCO.uHptT;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHptT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 hptNv = normalize(normal);
        float hptId = dot(floor(hptNv * 11.0 + 0.5), vec3(1.0, 7.0, 13.0));
        float hptTw = step(0.86, fract(sin(hptId * 12.9898 + floor(uHptT * 10.0) * 3.17) * 43758.5453));
        totalEmissiveRadiance += diffuseColor.rgb * (0.28 + 3.0 * hptTw);`);
  });
}
export const DISCO = { uHptT: { value: 0 } };

extend({
  layers: {
    hptDisco: (M) => [G.disco(), M.hptDiscoM || (M.hptDiscoM = discoMaterial()), 4, BLANK],
    hptChain: (M) => [G.chain(), VC(M, 'hptSteelM', { roughness: 0.35, metalness: 0.6, lit: 0.3 }), 4, BLANK],
    hptNeonRig: (M) => [G.neonRig(), VC(M, 'hptDarkM', { roughness: 0.6, metalness: 0.3, lit: 0.25 }), 6, BLANK],
    hptNeonFace: (M) => [G.neonFace(), M.sign, 6, { aIdx: 1, aWake: 2 }],
    hptPass: (M) => [G.pass(), VC(M, 'hptCardM', { roughness: 0.3, metalness: 0.05, lit: 0.45 }), 2, BLANK],
    hptPassFace: (M) => [G.passFace(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    hptCake: (M) => [G.cake(), VC(M, 'hptSugarM', { roughness: 0.6, metalness: 0, lit: 0.42 }), 2, BLANK],
    hptCandles: (M) => [G.candles(), VC(M, 'hptSugarM', { roughness: 0.6, metalness: 0, lit: 0.42 }), 2, BLANK],
    hptTicket: (M) => [G.ticket(), VC(M, 'hptCardM', { roughness: 0.3, metalness: 0.05, lit: 0.45 }), 2, BLANK],
    hptStub: (M) => [G.stub(), VC(M, 'hptCardM', { roughness: 0.3, metalness: 0.05, lit: 0.45 }), 2, BLANK],
    hptTicketFace: (M) => [G.ticketFace(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    hptDuoWall: (M) => [G.duoWall(), VC(M, 'hptBrickM', { roughness: 0.85, metalness: 0, lit: 0.3 }), 2, BLANK],
    hptDuoPane: (M) => [G.duoPane(), M.hptDuoM || (M.hptDuoM = duoMaterial()), 2, { aF: 1 }],
    hptKick: (M) => [G.kick(), VC(M, 'hptDrumM', { roughness: 0.3, metalness: 0.45, lit: 0.42 }), 4, BLANK],
    hptKickHead: (M) => [G.kickHead(), VC(M, 'hptHeadM', { roughness: 0.55, metalness: 0, lit: 0.55, side: THREE.DoubleSide }), 4, BLANK],
    hptBeater: (M) => [G.beater(), VC(M, 'hptDrumM', { roughness: 0.3, metalness: 0.45, lit: 0.42 }), 4, BLANK],
    hptShaker: (M) => [G.shaker(), VC(M, 'hptRoseM', { roughness: 0.22, metalness: 0.55, lit: 0.55 }), 4, BLANK],
  },
  parts: {
    // the disco ball over the street, turning; spots of its light sweeping the ground round it
    hptDisco(S, it, p, q, yaw) {
      const L = S.layers.hptDisco, C = S.layers.hptChain;
      const T = S.tNow ?? 0, m = S._m;
      const e = HE(S); e.set(0.18, T * 0.9, 0); const bq = HQ(S).setFromEuler(e);
      m.compose(p, bq, S._s.set(1.3, 1.3, 1.3)); L.add(m);
      m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); C.add(m);
      if (S.tNow === undefined) return;
      glowAt(S, p.x, p.y, p.z, 22, [1, 0.8, 0.9], 0.22);
      const gy = S.floorFn ? S.floorFn(it.t, 0) : 0, w = S._o;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + T * 0.9 * (k % 2 ? 1 : -0.7), r = 22 + (k % 4) * 9;
        w.set(p.x + Math.cos(a) * r, gy + 0.55, p.z + Math.sin(a) * r);
        poolAt(S, w.x, w.y, w.z, 6, k % 3 ? [1, 0.9, 0.95] : [1, 0.45, 0.65], 0.85);
      }
      for (let k = 0; k < 6; k++) { const a = T * 3 + k * 1.7, b = Math.sin(T * 2.3 + k) * 0.8; glowAt(S, p.x + Math.cos(a) * 6.3, p.y + Math.sin(b) * 5, p.z + Math.sin(a) * 6.3, 2.2, [1, 0.95, 1], 1.4 * (0.5 + 0.5 * Math.sin(T * 17 + k * 2))); }
    },
    // a neon word on its rig; it.blink: on the beat
    hptNeon(S, it, p, q, yaw) {
      const Lr = S.layers.hptNeonRig, Lf = S.layers.hptNeonFace;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); Lr.add(m);
      let k = 1;
      if (S.tNow !== undefined && it.on !== undefined) k = smooth(it.on, it.on + 0.08, S.tNow);
      if (S.tNow !== undefined && it.blink) { const bp = S.course.beatAt(S.tNow); k *= 0.45 + 0.55 * Math.exp(-(bp - Math.floor(bp)) * 4); }
      Lf.add(m, { aIdx: it.idx, aWake: [0.15 + 0.85 * k, 0] });
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 12.6 * s, 2 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 26 * s, it.glow || [1, 0.25, 0.4], 0.32 * k);
    },
    // the backstage pass, hung over the road, turning a little on its strap
    hptPass(S, it, p, q, yaw) {
      const L = S.layers.hptPass, F = S.layers.hptPassFace;
      const T = S.tNow ?? 0, e = HE(S); e.set(0.05 * Math.sin(T * 1.3), yaw + 0.22 * Math.sin(T * 0.8), 0.06 * Math.sin(T * 1.1));
      const pq = HQ(S).setFromEuler(e), s = it.s ?? 1, m = S._m;
      m.compose(p, pq, S._s.set(s, s, s)); L.add(m); F.add(m, { aIdx: it.idx, aWake: [1, 0] });
      if (S.tNow === undefined) return;
      glowAt(S, p.x, p.y - 7 * s, p.z, 18 * s, [1, 0.9, 0.95], 0.16);
    },
    // the cake; its candles light one a beat from it.lights
    hptCake(S, it, p, q, yaw) {
      const L = S.layers.hptCake, Lc = S.layers.hptCandles;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.add(m); Lc.add(m);
      if (S.tNow === undefined) return;
      const T = S.tNow, w = S._o;
      for (let k = 0; k < 9; k++) {
        const on = k < (it.lit0 ?? 5) ? 1 : smooth(it.lights[k - (it.lit0 ?? 5)] ?? 1e9, (it.lights[k - (it.lit0 ?? 5)] ?? 1e9) + 0.06, T);
        if (on <= 0) continue;
        const a = (k / 9) * TAU, fl = 0.8 + 0.2 * Math.sin(T * 19 + k * 2.3);
        local(p, yaw, Math.cos(a) * 3.4 * s, 20.9 * s, Math.sin(a) * 3.4 * s, w);
        glowAt(S, w.x, w.y, w.z, 1.7 * s, [1, 0.7, 0.3], 2.2 * on * fl);
        glowAt(S, w.x, w.y + 0.6 * s, w.z, 1.0 * s, [1, 0.95, 0.75], 1.6 * on * fl);
      }
      const lit = it.lights.filter((x) => T >= x).length + (it.lit0 ?? 5);
      glowAt(S, p.x, p.y + 20 * s, p.z, 30 * s, [1, 0.65, 0.35], 0.04 * lit);
      poolAt(S, p.x, p.y + 0.2, p.z, 36 * s, [1, 0.7, 0.45], 0.05 * lit);
    },
    // the ticket over the road; its stub tears off as she gets to it and goes down turning
    hptTicket(S, it, p, q, yaw) {
      const L = S.layers.hptTicket, Ls = S.layers.hptStub, F = S.layers.hptTicketFace;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.add(m); F.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const T = S.tNow ?? 0, d = T - (it.tear ?? it.t - 0.55);
      if (d <= 0) { m.compose(p, q, S._s.set(s, s, s)); Ls.add(m); }
      else {
        // from the perforation: falling, turning, drifting back with the air
        const w = local(p, yaw, -6.6 * s, -9 * d * d * s * 0.7, -d * 6 * s, S._o);
        const e = HE(S); e.set(d * 2.1, yaw + d * 1.3, d * 3.2); const sq = HQ(S).setFromEuler(e);
        m.compose(w, sq, S._s.set(s, s, s)); Ls.add(m);
      }
      if (S.tNow === undefined) return;
      glowAt(S, p.x, p.y, p.z, 24 * s, [1, 0.9, 0.75], 0.12);
    },
    // the window with the two of them dancing in it, a pose a beat
    hptDuo(S, it, p, q, yaw) {
      const L = S.layers.hptDuoWall, Lp = S.layers.hptDuoPane;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const f = S.tNow === undefined ? 0 : Math.floor(S.course.beatAt(S.tNow)) % 8;
      Lp.add(m, { aF: f });
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 14.8 * s, 3 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 30 * s, [1, 0.5, 0.45], 0.3);
      poolAt(S, w.x, p.y + 0.15, w.z, 30 * s, [1, 0.55, 0.45], 0.6);
    },
    // the kick drum: the beater hits the head on every beat (in the bridge, only when she pumps)
    hptKick(S, it, p, q, yaw) {
      const L = S.layers.hptKick, Lh = S.layers.hptKickHead, Lb = S.layers.hptBeater;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const T = S.tNow ?? 0, bp = S.course.beatAt(T), f = bp - Math.floor(bp);
      // hit: 1 on the beat, falling away; the beater comes back over the beat and in fast at its end
      let hit = Math.exp(-f * 7), back = Math.sin(Math.PI * Math.min(1, f / 0.85));
      if (it.pump && S.heartPump !== undefined) { hit = S.heartPump; back = 1 - hit; }
      const ps = 1 + 0.035 * hit;
      m.compose(local(p, yaw, 0, 11.4 * s * (1 - ps) , 0.25 * hit * s, S._o), q, S._s.set(s * ps, s * ps, s)); Lh.add(m);
      // the beater: on its pivot behind the drum, swinging in to the back head
      const e = HE(S); e.set(0.62 - 0.85 * back, yaw, 0); const bq = HQ(S).setFromEuler(e);
      m.compose(local(p, yaw, 0, 0.6 * s, -10 * s, S._o), bq, S._s.set(s, s, s)); Lb.add(m);
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 11.4 * s, 5.4 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 32 * s, [1, 0.15, 0.25], 0.12 + 0.5 * hit);
      poolAt(S, p.x, p.y + 0.2, p.z, 40 * s, [1, 0.2, 0.3], 0.15 + 0.7 * hit);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; local(p, yaw, Math.cos(a) * 11.9 * s, (11.4 + Math.sin(a) * 11.9) * s, 4.9 * s, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 1.3 * s, [1, 0.85, 0.7], 0.3 + 1.8 * hit); }
    },
    // the shaker, shaking it on the eighths
    hptShaker(S, it, p, q, yaw) {
      const L = S.layers.hptShaker;
      const T = S.tNow ?? 0, bp = S.course.beatAt(T), s = it.s ?? 1;
      const sh = Math.sin(bp * Math.PI * 2) * (it.go === undefined || T > it.go ? 1 : 0.15);
      const e = HE(S); e.set(0.1 * sh, yaw + 0.3 * Math.sin(T * 0.7), 0.24 * sh); const sq = HQ(S).setFromEuler(e);
      const m = S._m; m.compose(local(p, yaw, 0, Math.abs(sh) * 1.6 * s, 0, S._o), sq, S._s.set(s, s, s)); L.add(m);
      if (S.tNow === undefined) return;
      glowAt(S, p.x, p.y + 10 * s, p.z, 26 * s, [1, 0.6, 0.55], 0.16 + 0.12 * Math.abs(sh));
      // a neon line round it, moving with it
      const lift = Math.abs(sh) * 1.6 * s, tilt = 0.24 * sh, ct = Math.cos(tilt), st = Math.sin(tilt);
      for (const [r, y] of SHAKER_EDGE) for (const sd of [-1, 1]) {
        const lx = sd * (r + 0.25), ly = y;
        const w = local(p, yaw, (lx * ct - ly * st) * s, (lx * st + ly * ct) * s + lift, 0.6 * s, S._o);
        glowAt(S, w.x, w.y, w.z, 0.9 * s, [1, 0.45, 0.6], 1.3 + 0.9 * Math.abs(sh));
      }
    },
  },
  kits: {
    // one set-piece where it's asked for: z.part, at z.at, x z.x (z.face: turned to her), above the
    // road if z.over (z.lift metres over it), anything else on the zone goes on the item
    hptPiece(S, z) {
      const it = { ...z, t: z.at, x: z.x ?? 0, parts: z.part, ahead: z.ahead ?? 40 };
      delete it.kits; delete it.from; delete it.to; delete it.at; delete it.part;
      if (z.face) it.rot = FACE(z.x ?? 0) + (z.turn ?? 0);
      else it.rot = z.rot ?? (z.over ? Math.PI : 0);      // over the road: turned back to face her
      if (z.sign) it.idx = S.atlas.index[z.sign];
      if (z.over) { prepare(S.course, S.plan); it.h = roadY(S, z.at) + (z.lift ?? 10); it.abs = true; }
      S.items.push(it);
    },
  },
});
