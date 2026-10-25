// Unloaded. The candy factory where his songs get made, at night, and we are small in it: the
// peppermint over the doors, the syrup kitchen dripping, the production floor with its
// coating pans, the taffy puller folding, the green tanks of the sweetest venom; the stamping
// room stuttering, the showroom with the trap and the gumball machine; the power tripping, a
// mood ring in the dark; then out the loading dock onto your block, where it's still playing.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { tintMaterial } from './props.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';
import { CdyRush } from './cdy-rush.js';
import './cdy-sets.js';
import './cdy-block.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const ALONG = (x) => (x > 0 ? 0 : Math.PI);
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const hue = (t) => [0.5 + 0.5 * Math.cos(6.2832 * t), 0.5 + 0.5 * Math.cos(6.2832 * (t + 0.33)), 0.5 + 0.5 * Math.cos(6.2832 * (t + 0.67))];
const CANDY = [0xff5fb0, 0x6af0c8, 0xffd23a, 0xb070ff, 0xff8a3a, 0xff3a5a, 0x5ab0ff, 0xffffff];
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// the busted clock's face: the numbers, and the glass cracked across it
function crackedClock() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 60px Georgia, serif';
    const RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.save(); g.translate(256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); g.rotate(a); g.fillText(RN[k], 0, 0); g.restore(); }
    g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 3;
    const R = seeded(5); const c0 = [300, 190];
    for (let k = 0; k < 9; k++) { let x = c0[0], y = c0[1], a = R() * Math.PI * 2; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * 40; y += Math.sin(a) * 40; g.lineTo(x, y); } g.stroke(); }
    for (let r = 20; r < 70; r += 22) { g.beginPath(); g.arc(c0[0], c0[1], r, R() * 6, R() * 6 + 2); g.stroke(); }
  });
}

// ---------- the factory's things, at our size ----------
const CG = {
  // the peppermint over the doors: red and white, its wrapper twisted off either side
  peppermint() {
    const parts = [], red = rgb(0xe0102a), white = rgb(0xf6f2f2), wrap = rgb(0xe4ecf2);
    for (let k = 0; k < 12; k++) for (const z of [1.05, -1.05]) { const w = new THREE.CircleGeometry(16, 10, (k / 12) * Math.PI * 2, Math.PI * 2 / 12); if (z < 0) w.rotateY(Math.PI); w.translate(0, 0, z); parts.push(paint(w, k % 2 ? red : white)); }
    const rim = new THREE.CylinderGeometry(16, 16, 2.1, 64, 1, true); rim.rotateX(Math.PI / 2); parts.push(paint(rim, white));
    for (const s of [-1, 1]) {
      const c = new THREE.ConeGeometry(7, 10, 20, 1, true); c.rotateZ(s * Math.PI / 2); c.translate(s * 22.5, 0, 0); parts.push(paint(c, wrap));
      const t = new THREE.TorusGeometry(1.6, 0.7, 8, 16); t.rotateY(Math.PI / 2); t.translate(s * 17.4, 0, 0); parts.push(paint(t, wrap));
    }
    return merge(parts);
  },
  // a box truck: the box, the cab, a pink band (no names), the wheels
  truck() {
    const parts = [], dark = rgb(0x1a1a20);
    parts.push(paint(box(5.4, 7.4, 15, 0, 5.1, -2), rgb(0xf2eef0)));
    parts.push(paint(box(5.2, 5.2, 5, 0, 3.9, 8.2), rgb(0xff5fb0)));
    parts.push(paint(box(4.8, 2.0, 0.2, 0, 5.2, 10.72), rgb(0x2a3440)));
    for (const s of [-1, 1]) parts.push(paint(box(0.1, 1.2, 14.4, s * 2.72, 4.4, -2), rgb(0xff5fb0)));
    for (const z of [-7, -3.6, 7.6]) for (const s of [-1, 1]) { const w = cyl(1.3, 1.3, 1, 14, 0, 0, 0); w.rotateZ(Math.PI / 2); w.translate(s * 2.5, 1.3, z); parts.push(paint(w, dark)); }
    return merge(parts);
  },
  // a smokestack painted in bands
  stack() { const parts = []; for (let k = 0; k < 10; k++) parts.push(paint(cyl(5.6 - k * 0.12, 5.6 - (k + 1) * 0.12 + 0.12, 12, 24, 0, 6 + k * 12, 0), rgb(k % 2 ? 0xf2eeee : 0xd8102a))); parts.push(paint(cyl(5.2, 4.6, 3, 24, 0, 121.5, 0), rgb(0x1a1a1e))); return merge(parts); },
  // a syrup kettle: open steel, the syrup in it, its legs
  vat() {
    const parts = [], steel = rgb(0xd8dce4);
    const k = new THREE.CylinderGeometry(9, 8, 13, 36, 1, true); k.translate(0, 9.5, 0); parts.push(paint(k, steel));
    parts.push(paint(cyl(8, 8, 0.6, 36, 0, 3.2, 0), steel));
    parts.push(paint(new THREE.TorusGeometry(9, 0.45, 8, 40).rotateX(Math.PI / 2).translate(0, 16, 0), rgb(0xd8dce4)));
    for (let a = 0; a < 4; a++) parts.push(paint(cyl(0.5, 0.5, 4, 8, Math.cos(a * 1.57 + 0.78) * 6.5, 1.5, Math.sin(a * 1.57 + 0.78) * 6.5), steel));
    return merge(parts);
  },
  syrup() { const g = new THREE.CircleGeometry(8.6, 36); g.rotateX(-Math.PI / 2); g.translate(0, 14.4, 0); return g; },
  // the pipe across the kitchen overhead, flanges along it, a nozzle over each kettle
  pipe(nozzles) {
    const parts = [], copper = rgb(0xc8783a);
    const p = cyl(1.4, 1.4, 120, 16, 0, 0, 0); p.rotateZ(Math.PI / 2); parts.push(paint(p, copper));
    for (let x = -56; x <= 56; x += 8) { const f = cyl(1.9, 1.9, 0.8, 16, 0, 0, 0); f.rotateZ(Math.PI / 2); f.translate(x, 0, 0); parts.push(paint(f, rgb(0x8a4a24))); }
    for (const x of nozzles) { parts.push(paint(cyl(0.6, 0.6, 4, 10, x, -2.4, 0), copper)); parts.push(paint(cyl(0.6, 1.1, 1.4, 12, x, -5, 0), rgb(0x8a4a24))); }
    for (const x of [-58, 58]) parts.push(paint(cyl(0.9, 0.9, 30, 10, x, 15, 0), copper));
    return merge(parts);
  },
  drip() { return new THREE.SphereGeometry(1.3, 12, 8); },
  // a coating pan: a tilted bowl that turns, ribs inside so you see it turn, on its stand
  pan() { const g = new THREE.SphereGeometry(10, 36, 14, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const x = g.attributes.position.getX(i), z = g.attributes.position.getZ(i), a = Math.atan2(z, x); const k = (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2) ? 0.62 : 0.78; c[i * 3] = k * 1.05; c[i * 3 + 1] = k * 0.82; c[i * 3 + 2] = k * 0.62; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; },
  panStand() { const parts = [], dark = rgb(0x4a4e58); parts.push(paint(box(8, 10, 8, 0, 5, 0), dark)); parts.push(paint(cyl(1.6, 1.6, 8, 12, 0, 12, 0), rgb(0x6a6e78))); parts.push(paint(box(10, 1, 10, 0, 0.5, 0), dark)); return merge(parts); },
  ball() { return new THREE.SphereGeometry(1.15, 12, 8); },
  // the taffy puller: its back plate, the two hubs and the fixed pin (the arms and the taffy move)
  puller() {
    const parts = [], cream = rgb(0xf2e8d8), steel = rgb(0x8a8e98);
    parts.push(paint(box(26, 26, 2, 0, 0, -1), cream));
    for (const [w, h, x, y] of [[27, 1.2, 0, 13.2], [27, 1.2, 0, -13.2], [1.2, 27, -13.2, 0], [1.2, 27, 13.2, 0]]) parts.push(paint(box(w, h, 2.6, x, y, -0.8), rgb(0xff5fb0)));
    for (const x of [-5, 5]) { const hub = cyl(1.8, 1.8, 1.2, 20, 0, 0, 0); hub.rotateX(Math.PI / 2); hub.translate(x, -2, 0.6); parts.push(paint(hub, steel)); }
    const pin = cyl(0.9, 0.9, 4, 12, 0, 0, 0); pin.rotateX(Math.PI / 2); pin.translate(0, 8, 2); parts.push(paint(pin, steel));
    parts.push(paint(box(30, 3, 10, 0, -15.5, 3), rgb(0x4a4e58)));
    return merge(parts);
  },
  arm() { const parts = [], steel = rgb(0x9a9ea8); parts.push(paint(box(8.4, 1.2, 0.8, 4.2, 0, 1.3), steel)); const pin = cyl(0.8, 0.8, 4, 12, 0, 0, 0); pin.rotateX(Math.PI / 2); pin.translate(8, 0, 3); parts.push(paint(pin, steel)); return merge(parts); },
  rope() { const g = new THREE.CylinderGeometry(1.25, 1.25, 1, 10, 1); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; },
  // a tank of the green: steel at top and bottom, glass between (the venom and its bubbles are layers of their own)
  tankFrame() {
    const parts = [], steel = rgb(0x7a7e88);
    parts.push(paint(cyl(8.4, 8.4, 3, 32, 0, 1.5, 0), steel)); parts.push(paint(cyl(8.4, 7.4, 3, 32, 0, 32.5, 0), steel));
    for (let a = 0; a < 6; a++) parts.push(paint(cyl(0.45, 0.45, 28, 8, Math.cos(a * 1.047) * 8.1, 17, Math.sin(a * 1.047) * 8.1), steel));
    parts.push(paint(cyl(1.2, 1.2, 14, 12, 0, 40, 0), steel));
    const elbow = cyl(1.2, 1.2, 16, 12, 0, 0, 0); elbow.rotateZ(Math.PI / 2); elbow.translate(-8, 47, 0); parts.push(paint(elbow, steel));
    return merge(parts);
  },
  tankGlass() { const g = new THREE.CylinderGeometry(7.8, 7.8, 28, 32, 1, true); g.translate(0, 17, 0); return g; },
  venom() { return cyl(7.4, 7.4, 23, 32, 0, 14.5, 0); },
  bubble() { return new THREE.SphereGeometry(0.5, 8, 6); },
  // a conveyor along the wall: the belt on its legs (what rides it is the wrapped layer)
  belt() { const parts = [], dark = rgb(0x2a2c32); parts.push(paint(box(7, 1.2, 60, 0, 8, 0), dark)); parts.push(paint(box(6.2, 0.2, 60, 0, 8.7, 0), rgb(0x16161a))); for (const s of [-1, 1]) parts.push(paint(box(0.4, 1.6, 60, s * 3.6, 9, 0), rgb(0xffd23a))); for (let z = -27; z <= 27; z += 9) for (const s of [-1, 1]) parts.push(paint(box(0.6, 8, 0.6, s * 3, 4, z), dark)); return merge(parts); },
  // a wrapped sweet: the middle, a twist of wrapper either side
  wrapped() { const parts = []; parts.push(sph(1.4, 1.3, 1, 1, 0, 0, 0, 14, 10)); for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(1.1, 1.6, 10); c.rotateZ(s * Math.PI / 2); c.translate(s * 2.4, 0, 0); parts.push(c); } return merge(parts.map((g) => paint(g, [1, 1, 1]))); },
  // a stamping press: two columns, the crown, the bed (the ram moves)
  press() { const parts = [], frame = rgb(0xc8186a), yel = rgb(0xfff2f6), dark = rgb(0x2a1a24); for (const x of [-7, 7]) parts.push(paint(box(3, 34, 4, x, 17, 0), frame)); parts.push(paint(box(19, 6, 6, 0, 35, 0), frame)); parts.push(paint(box(17, 5, 9, 0, 2.5, 0), dark)); for (const x of [-7, 7]) for (const y of [6, 12, 18, 24]) parts.push(paint(box(3.1, 1.2, 4.1, x, y, 0), yel)); parts.push(paint(box(19.2, 1, 6.1, 0, 32.6, 0), yel)); return merge(parts); },
  ram() { const parts = []; parts.push(paint(box(11, 5, 6, 0, 0, 0), rgb(0x8a8e98))); parts.push(paint(box(9, 1.2, 5, 0, -3, 0), rgb(0xff5fb0))); parts.push(paint(box(1.6, 12, 1.6, 0, 8, 0), rgb(0x6a6e78))); return merge(parts); },
  // the mousetrap: the board, the spring, the trigger with the sweet on it (the hammer swings)
  trap() {
    const parts = [], wood = rgb(0xd8a868), steel = rgb(0xb8bcc4);
    parts.push(paint(box(18, 1.6, 40, 0, 0.8, 0), wood));
    for (let k = 0; k < 7; k++) parts.push(paint(box(17.8, 0.05, 0.25, 0, 1.62, -18 + k * 6), rgb(0xb88848)));
    for (const s of [-1, 1]) { const sp = new THREE.TorusGeometry(1.4, 0.35, 8, 16); sp.rotateY(Math.PI / 2); sp.translate(s * 5, 2.4, 0); parts.push(paint(sp, steel)); }
    parts.push(paint(box(5, 0.4, 7, 0, 1.9, 12), rgb(0xc8ccd4)));
    parts.push(paint(box(0.35, 0.35, 20, 0, 2.2, 0), steel));
    return merge(parts);
  },
  hammer() { const parts = [], steel = rgb(0xc8ccd4); for (const s of [-1, 1]) parts.push(paint(box(0.45, 0.45, 17, s * 7.5, 0, 8.5), steel)); parts.push(paint(box(15.4, 0.45, 0.45, 0, 0, 17), steel)); parts.push(paint(box(15.4, 0.45, 0.45, 0, 0, 0), steel)); return merge(parts); },
  // the gumball machine: the stand, the coin box and its knob, the chute, the cap (the globe and the balls are layers)
  gumStand() {
    const parts = [], red = rgb(0xe0102a), chrome = rgb(0xd8dce4);
    parts.push(paint(cyl(11, 13, 3, 36, 0, 1.5, 0), red));
    parts.push(paint(cyl(5, 7, 14, 32, 0, 10, 0), red));
    parts.push(paint(cyl(10, 9, 6, 36, 0, 19, 0), red));
    parts.push(paint(box(8, 5, 2, 0, 19, 9.2), chrome));
    const knob = cyl(1.8, 1.8, 2, 16, 0, 0, 0); knob.rotateX(Math.PI / 2); knob.translate(0, 19.5, 10.8); parts.push(paint(knob, chrome));
    parts.push(paint(box(4, 3, 3, 0, 14.5, 9.6), chrome));
    parts.push(paint(cyl(5, 9, 4, 32, 0, 50.5, 0), red));
    parts.push(paint(sph(2.2, 1, 1, 1, 0, 53.5, 0, 12, 8), red));
    return merge(parts);
  },
  globe() { return sph(15, 1, 1, 1, 0, 36, 0, 40, 24); },
  gumball() { return new THREE.SphereGeometry(2.4, 14, 10); },
  // a lollipop: the swirl, the stick
  lolly() {
    const parts = [];
    for (let k = 0; k < 16; k++) for (const z of [0.6, -0.6]) { const w = new THREE.CircleGeometry(7, 6, (k / 16) * Math.PI * 2 + k * 0.08, Math.PI * 2 / 16); if (z < 0) w.rotateY(Math.PI); w.translate(0, 0, z); parts.push(paint(w, k % 2 ? [1, 1, 1] : [0.8, 0.8, 0.8])); }
    const rim = new THREE.CylinderGeometry(7, 7, 1.2, 40, 1, true); rim.rotateX(Math.PI / 2); parts.push(paint(rim, [1, 1, 1]));
    for (const g of parts) g.translate(0, 26, 0);
    parts.push(paint(cyl(0.5, 0.5, 20, 8, 0, 10, 0), rgb(0xf4f0ec)));
    return merge(parts);
  },
  // the breaker on the wall: its box, the big handle (which flips)
  breaker() { const parts = []; parts.push(paint(box(12, 20, 4, 0, 10, 0), rgb(0x9aa0aa))); parts.push(paint(box(10, 3, 0.4, 0, 17, 2.1), rgb(0xffc81a))); for (let k = 0; k < 4; k++) parts.push(paint(box(1.6, 3, 0.6, -4.5 + k * 3, 5, 2.2), rgb(0x1a1a1e))); parts.push(paint(box(12.6, 0.8, 4.6, 0, 20.2, 0), rgb(0x4a4e58))); return merge(parts); },
  lever() { const parts = []; parts.push(paint(box(1.6, 9, 1.6, 0, 4.5, 0), rgb(0x2a2a2e))); parts.push(paint(box(5.5, 2.2, 2.2, 0, 9, 0), rgb(0xe0102a))); return merge(parts); },
  // the mood ring: the band (gold), the bezel; the stone is its own layer
  ring() { const parts = [], gold = rgb(0xe8c050); const t = new THREE.TorusGeometry(15, 1.8, 16, 72); parts.push(paint(t, gold)); const bz = new THREE.TorusGeometry(4.6, 0.9, 10, 32); bz.scale(1, 1.25, 1); bz.translate(0, 18.6, 0); parts.push(paint(bz, gold)); parts.push(paint(box(3, 2.4, 3, 0, 16.2, 0), gold)); return merge(parts); },
  stone() { return sph(4.4, 1, 1.25, 0.6, 0, 18.6, 0.4, 24, 16); },
  // the fire pit on the block: the stones, the logs (the flames move); marshmallows on sticks over it
  pit() {
    const parts = [], R = seeded(13);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; parts.push(paint(sph(1.4, 1, 0.8, 1, Math.cos(a) * 5, 0.9, Math.sin(a) * 5, 8, 6), rgb(pick(R, [0x6a6460, 0x8a8480, 0x5a5450])))); }
    for (let k = 0; k < 4; k++) { const l = cyl(0.6, 0.6, 7, 8, 0, 0, 0); l.rotateZ(Math.PI / 2); l.rotateY(k * 0.8); l.translate(0, 0.9 + k * 0.4, 0); parts.push(paint(l, rgb(0x4a2a18))); }
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.4, x = Math.cos(a) * 9, z = Math.sin(a) * 9;
      const st = tube(V(x, 0.4, z), V(Math.cos(a) * 2.2, 7.4, Math.sin(a) * 2.2), 0.18, 6); parts.push(paint(st, rgb(0x8a6a48)));
      const mm = cyl(1.1, 1.1, 2.2, 14, 0, 0, 0); mm.rotateZ(Math.PI / 2); mm.rotateY(-a); mm.translate(Math.cos(a) * 2.6, 7.2, Math.sin(a) * 2.6); parts.push(paint(mm, rgb(k === 1 ? 0xc89050 : 0xf8f2e8)));
    }
    return merge(parts);
  },
  flame() { const g = new THREE.ConeGeometry(1.6, 6, 10, 1, true); g.translate(0, 3, 0); return g; },
  // the street clock: the post, the case (the face and hands are layers)
  clockPost() {
    const parts = [], green = rgb(0x1a3a2a), gold = rgb(0xc8a050);
    parts.push(paint(cyl(2.2, 2.8, 4, 16, 0, 2, 0), green)); parts.push(paint(cyl(0.9, 1.1, 24, 12, 0, 16, 0), green));
    parts.push(paint(cyl(1.6, 1.6, 1, 16, 0, 27.5, 0), gold));
    const c = cyl(7, 7, 2.4, 40, 0, 0, 0); c.rotateX(Math.PI / 2); c.translate(0, 35, 0); parts.push(paint(c, green));
    const r = new THREE.TorusGeometry(6.6, 0.4, 8, 40); r.translate(0, 35, 1.25); parts.push(paint(r, gold));
    parts.push(paint(sph(1.2, 1, 1, 1, 0, 42.6, 0, 10, 8), gold));
    return merge(parts);
  },
  clockFace() { const g = new THREE.CircleGeometry(6.4, 40); g.translate(0, 35, 1.24); return g; },
  hand(L, w) { return box(w, L, 0.25, 0, L / 2 - 0.6, 0); },
  // string lights: a little bulb (the light is a glow)
  bulb() { return new THREE.SphereGeometry(0.45, 8, 6); },
  // a steel sign hung across: the plate, the striped border, the chains (his words are the sign layer)
  hazard() {
    const parts = [], dark = rgb(0x1a1a1e), yel = rgb(0xffc81a);
    parts.push(paint(box(34, 12.4, 0.8, 0, 0, -0.5), dark));
    for (let k = 0; k < 18; k++) { const x = -16 + k * (32 / 17); parts.push(paint(box(1.6, 1.2, 0.9, x, 5.9, -0.3), k % 2 ? yel : dark)); parts.push(paint(box(1.6, 1.2, 0.9, x, -5.9, -0.3), k % 2 ? dark : yel)); }
    for (const s of [-1, 1]) parts.push(paint(box(0.3, 40, 0.3, s * 15, 26.2, -0.5), rgb(0x6a6a70)));
    return merge(parts);
  },
  hazardFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(4.0, 4.0, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.0); return g; },
  // the boombox: the body, two speakers, the deck, the handle, the antenna
  boombox() {
    const parts = [], body = rgb(0x2a2a30), chrome = rgb(0xc8ccd4);
    parts.push(paint(box(22, 11, 6, 0, 5.5, 0), body));
    for (const x of [-7, 7]) { const g = cyl(4.4, 4.4, 0.4, 32, 0, 0, 0); g.rotateX(Math.PI / 2); g.translate(x, 5.5, 3.05); parts.push(paint(g, chrome)); }
    parts.push(paint(box(6, 3.4, 0.4, 0, 6.6, 3.05), rgb(0x0a0a0c)));
    for (let k = 0; k < 6; k++) parts.push(paint(box(0.7, 0.6, 0.5, -1.9 + k * 0.76, 3.4, 3.1), chrome));
    for (const x of [-10, 10]) parts.push(paint(box(0.8, 3.4, 0.8, x, 12.4, 0), chrome));
    parts.push(paint(box(20.8, 0.9, 0.9, 0, 14.1, 0), chrome));
    parts.push(paint(tube(V(8, 11, -2), V(14, 22, -2), 0.18, 6), chrome));
    return merge(parts);
  },
  cone() { const g = new THREE.CylinderGeometry(3.6, 1.2, 1.6, 28, 1, true); g.rotateX(Math.PI / 2); return g; },
  stoop() { const parts = [], stone = rgb(0x8a7a6a); for (let k = 0; k < 4; k++) parts.push(paint(box(16, 2.2, 3.4, 0, 1.1 + k * 2.2, 5.1 - k * 3.4), stone)); parts.push(paint(box(16, 8.8, 8, 0, 4.4, -8.4), stone)); for (const s of [-1, 1]) parts.push(paint(box(0.4, 6, 14, s * 8, 9, 0), rgb(0x1a1a1e))); return merge(parts); },
};

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
// lit only by its own colour (bulbs, the ring's stone): each instance its colour
function tintBasic(k = 1) {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aTint; varying vec3 vC; varying vec3 vN; void main(){ vC = aTint; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying vec3 vN; void main(){ float l = 0.6 + 0.4 * max(0.0, vN.z); gl_FragColor = vec4(vC * l * ${k.toFixed(2)}, 1.0); }`,
  });
}
let CLOCKTEX = null;
extend({
  layers: {
    peppermint: (M) => [CG.peppermint(), M.mintM || (M.mintM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05, emissive: 0xffffff, emissiveIntensity: 0.55 }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;'); }; return m; })()), 2, {}],
    truck: (M) => [CG.truck(), VC(M, 'cTruck', { roughness: 0.45, metalness: 0.2, emissive: 0x141016 }), 8, {}],
    stack: (M) => [CG.stack(), VC(M, 'cStack', { roughness: 0.7, metalness: 0, emissive: 0x1a0a0c }), 6, {}],
    vat: (M) => [CG.vat(), VC(M, 'cSteel', { roughness: 0.35, metalness: 0.35, emissive: 0x3a3c44 }), 24, {}],
    syrup: (M) => [CG.syrup(), M.syrupM || (M.syrupM = new THREE.MeshStandardMaterial({ color: 0xff7ab8, emissive: 0xc8306a, emissiveIntensity: 0.6, roughness: 0.15 })), 24, {}],
    pipe: (M) => [CG.pipe([-40, -26, 26, 40]), VC(M, 'cCopper', { roughness: 0.3, metalness: 0.6, emissive: 0x2a1408 }), 4, {}],
    drip: (M) => [CG.drip(), M.dripM || (M.dripM = new THREE.MeshStandardMaterial({ color: 0xff7ab8, emissive: 0xd8407a, emissiveIntensity: 0.8, roughness: 0.1 })), 60, {}],
    pan: (M) => [CG.pan(), VC(M, 'cPan', { roughness: 0.25, metalness: 0.6, emissive: 0x1a120a, side: THREE.DoubleSide }), 12, {}],
    panStand: (M) => [CG.panStand(), VC(M, 'cDark', { roughness: 0.5, metalness: 0.3, emissive: 0x0e0e12 }), 12, {}],
    ball: (M) => [CG.ball(), M.ballC || (M.ballC = tintMaterial(0xffffff, { rough: 0.2, emissive: 0x2a2a2a })), 400, { aTint: 3 }],
    puller: (M) => [CG.puller(), VC(M, 'cPuller', { roughness: 0.5, metalness: 0.1, emissive: 0x1a1612 }), 4, {}],
    arm: (M) => [CG.arm(), VC(M, 'cArm', { roughness: 0.3, metalness: 0.5, emissive: 0x101214 }), 8, {}],
    taffy: (M) => [CG.rope(), M.taffyM || (M.taffyM = new THREE.MeshStandardMaterial({ color: 0xff8ac0, emissive: 0x8a2050, emissiveIntensity: 0.6, roughness: 0.25 })), 24, {}],
    tankFrame: (M) => [CG.tankFrame(), VC(M, 'cTank', { roughness: 0.35, metalness: 0.6, emissive: 0x0e1012 }), 12, {}],
    tankGlass: (M) => [CG.tankGlass(), M.tglassM || (M.tglassM = new THREE.MeshStandardMaterial({ color: 0xd8f0e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false })), 12, {}],
    venom: (M) => [CG.venom(), M.venomM || (M.venomM = new THREE.MeshStandardMaterial({ color: 0x6aff6a, emissive: 0x2aff4a, emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.75, depthWrite: false })), 12, {}],
    venomBubble: (M) => [CG.bubble(), M.vbubM || (M.vbubM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8ffd8).multiplyScalar(1.4) })), 240, {}],
    belt: (M) => [CG.belt(), VC(M, 'cBelt', { roughness: 0.6, metalness: 0.2, emissive: 0x0a0a0c }), 24, {}],
    wrapped: (M) => [CG.wrapped(), M.wrapM || (M.wrapM = tintMaterial(0xffffff, { rough: 0.2, metal: 0.1, emissive: 0x202020 })), 420, { aTint: 3 }],
    press: (M) => [CG.press(), VC(M, 'cPress', { roughness: 0.45, metalness: 0.4, emissive: 0x0c0c10 }), 30, {}],
    ram: (M) => [CG.ram(), VC(M, 'cRam', { roughness: 0.35, metalness: 0.5, emissive: 0x141418 }), 30, {}],
    trap: (M) => [CG.trap(), VC(M, 'cTrap', { roughness: 0.6, metalness: 0.1, emissive: 0x1a120a }), 2, {}],
    hammer: (M) => [CG.hammer(), VC(M, 'cHammer', { roughness: 0.3, metalness: 0.6, emissive: 0x18181c }), 2, {}],
    gumStand: (M) => [CG.gumStand(), VC(M, 'cGum', { roughness: 0.3, metalness: 0.2, emissive: 0x2a0408 }), 2, {}],
    globe: (M) => [CG.globe(), M.globeM || (M.globeM = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false })), 2, {}],
    gumball: (M) => [CG.gumball(), M.gumM || (M.gumM = tintMaterial(0xffffff, { rough: 0.25, emissive: 0x303030 })), 140, { aTint: 3 }],
    gumBubble: (M) => [new THREE.SphereGeometry(1, 32, 20), M.gbM || (M.gbM = new THREE.MeshStandardMaterial({ color: 0xff8ac8, emissive: 0xc83a7a, emissiveIntensity: 0.5, roughness: 0.15, transparent: true, opacity: 0.85 })), 2, {}],
    lolly: (M) => [CG.lolly(), M.lollyM || (M.lollyM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, emissive: 0x2a2a2a }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(vTint, vec3(1.0), step(0.9, vColor.r));'); }; return m; })()), 60, { aTint: 3 }],
    breaker: (M) => [CG.breaker(), VC(M, 'cBreaker', { roughness: 0.5, metalness: 0.2, emissive: 0x2a2c32 }), 2, {}],
    lever: (M) => [CG.lever(), VC(M, 'cLever', { roughness: 0.4, metalness: 0.2, emissive: 0x4a0a0a }), 2, {}],
    moodRing: (M) => [CG.ring(), VC(M, 'cRing', { roughness: 0.25, metalness: 0.5, emissive: 0x7a5814 }), 2, {}],
    stone: (M) => [CG.stone(), M.stoneM || (M.stoneM = tintBasic(1.3)), 2, { aTint: 3 }],
    pit: (M) => [CG.pit(), VC(M, 'cPit', { roughness: 0.8, metalness: 0, emissive: 0x140a06 }), 2, {}],
    flame: (M) => [CG.flame(), M.flameM || (M.flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a3a).multiplyScalar(1.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), 24, {}],
    clockPost: (M) => [CG.clockPost(), VC(M, 'cPost', { roughness: 0.5, metalness: 0.4, emissive: 0x0a120c }), 2, {}],
    bustedFace: (M) => [CG.clockFace(), M.bustedM || (M.bustedM = new THREE.MeshBasicMaterial({ map: (CLOCKTEX = CLOCKTEX || crackedClock()) })), 2, {}],
    streetHand: (M) => [CG.hand(5.6, 0.6), new THREE.MeshBasicMaterial({ color: 0x14141a }), 6, {}],
    bulb: (M) => [CG.bulb(), M.bulbM || (M.bulbM = tintBasic(1)), 600, { aTint: 3 }],
    hazard: (M) => [CG.hazard(), VC(M, 'cHazard', { roughness: 0.5, metalness: 0.4, emissive: 0x141210 }), 8, {}],
    hazardFace: (M) => [CG.hazardFace(), M.sign, 8, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the peppermint over the factory's doors, turned to you; bulbs round it chasing
    peppermint(S, it, p) {
      p.y = (S.floorFn ? S.floorFn(it.t, 0) : 0) + (it.y ?? 50);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._cq || (S._cq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.peppermint.add(m);
      const T = S.tNow ?? 0, by = h + Math.PI;
      for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2, on = ((k + Math.floor(T * 7)) % 4) ? 1 : 0.2; const w = local(p, by, Math.cos(a) * 17.4 * s, Math.sin(a) * 17.4 * s, 1.4 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * s, [1, 0.85, 0.75], 1.3 * on); }
      glowAt(S, p.x, p.y, p.z, 44 * s, [1, 0.35, 0.5], 0.3);
    },
    truck(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.truck.add(m); },
    stack(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, it.sy ?? 1, 1)); S.layers.stack.add(m); glowAt(S, p.x, p.y + 124 * (it.sy ?? 1), p.z, 6, [1, 0.15, 0.1], 1.4, 1); },
    // a kettle of syrup, its steam
    vat(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.vat.add(m); S.layers.syrup.add(m);
      const T = S.tNow ?? 0; glowAt(S, p.x, p.y + 18 * s, p.z, 12 * s, [1, 0.85, 0.9], 0.25 + 0.1 * Math.sin(T * 2 + it.seed * 9));
    },
    // the pipe across overhead, the syrup dripping from its nozzles into the kettles below
    pipe(S, it, p) {
      const drips = S.layers.drip;
      const fy = S.floorFn ? S.floorFn(it.t, 0) : 0; p.y = fy + (it.y ?? 38);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h, 0); const fq = (S._cq2 || (S._cq2 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m; m.compose(p, fq, S._s.set(1, 1, 1)); S.layers.pipe.add(m);
      const T = S.tNow ?? 0, w = S._dw || (S._dw = new THREE.Vector3()), fall = p.y - 5.8 - (fy + 14.4);
      for (const x of [-40, -26, 26, 40]) for (let k = 0; k < 3; k++) {
        const u = ((T * 0.9 + k / 3 + x * 0.013) % 1 + 1) % 1;
        local(p, h, x, -5.8 - fall * u * u, 0, w);
        m.makeScale(1, 1 + 3.2 * u, 1); m.setPosition(w); drips.add(m);
      }
    },
    // a coating pan turning, the sweets tumbling in it
    pan(S, it, p, q, yaw) {
      const balls = S.layers.ball;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.panStand.add(m);
      const T = S.tNow ?? 0, c = local(p, yaw, 0, 18 * s, 0, S._o).clone();
      const e2 = S._pe2 || (S._pe2 = new THREE.Euler(0, 0, 0, 'YXZ')); e2.set(0.62, yaw, 0); const pq = (S._pq || (S._pq = new THREE.Quaternion())).setFromEuler(e2);
      const spin = S._ps || (S._ps = new THREE.Quaternion()); spin.setFromAxisAngle(S._py || (S._py = new THREE.Vector3(0, 1, 0)), T * 1.6 * (it.seed > 0.5 ? 1 : -1)); pq.multiply(spin);
      m.compose(c, pq, S._s.set(s, s, s)); S.layers.pan.add(m);
      // the heap low in the bowl, tumbling
      const w = S._pw || (S._pw = new THREE.Vector3());
      for (let k = 0; k < 26; k++) {
        const a = k * 2.399 + T * (0.8 + (k % 3) * 0.25), r = (2 + (k * 0.618 % 1) * 4.6) * s, lift = Math.abs(Math.sin(T * 3 + k)) * 1.2 * s;
        local(c, yaw, Math.cos(a) * r, -6.0 * s + lift + (k % 4) * 0.5 * s, -3.0 * s + Math.sin(a) * r * 0.55, w);
        m.makeScale(s, s, s); m.setPosition(w); balls.add(m, { aTint: col(CANDY[k % CANDY.length]) });
      }
      glowAt(S, c.x, c.y - 4 * s, c.z, 12 * s, [1, 0.75, 0.55], 0.12);
    },
    // the taffy puller: two arms going round, the taffy looped over the three pins
    puller(S, it, p, q, yaw) {
      const ropes = S.layers.taffy, arms = S.layers.arm;
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + 20 * (it.s ?? 1);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.puller.add(m);
      const T = S.tNow ?? 0, th = T * 1.7;
      const pins = [[0, 8], [-5 + 8 * Math.cos(th), -2 + 8 * Math.sin(th)], [5 + 8 * Math.cos(-th + Math.PI), -2 + 8 * Math.sin(-th + Math.PI)]];
      const e = S._ae || (S._ae = new THREE.Euler(0, 0, 0, 'YXZ')), aq = S._aq || (S._aq = new THREE.Quaternion()), w = S._aw || (S._aw = new THREE.Vector3());
      for (const [hx, ang] of [[-5, th], [5, -th + Math.PI]]) { e.set(0, yaw, ang); aq.setFromEuler(e); local(p, yaw, hx * s, -2 * s, 0, w); m.compose(w, aq, S._s.set(s, s, s)); arms.add(m); }
      const a = S._ta || (S._ta = new THREE.Vector3()), b = S._tb || (S._tb = new THREE.Vector3()), d = S._td || (S._td = new THREE.Vector3()), Z = S._tz || (S._tz = new THREE.Vector3(0, 0, 1)), rq = S._trq || (S._trq = new THREE.Quaternion());
      for (let k = 0; k < 3; k++) {
        const [x0, y0] = pins[k], [x1, y1] = pins[(k + 1) % 3];
        local(p, yaw, x0 * s, y0 * s, 3 * s, a); local(p, yaw, x1 * s, y1 * s, 3 * s, b);
        d.subVectors(b, a); const L = d.length(); if (L < 0.1) continue;
        rq.setFromUnitVectors(Z, d.normalize()); m.compose(a, rq, S._s.set(s, s, L)); ropes.add(m);
      }
      glowAt(S, p.x, p.y, p.z, 26 * s, [1, 0.5, 0.75], 0.25);
    },
    // a tank of the green, bubbling, glowing
    tank(S, it, p, q, yaw) {
      const bubbles = S.layers.venomBubble;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.tankFrame.add(m); S.layers.venom.add(m); S.layers.tankGlass.add(m);
      const T = S.tNow ?? 0, w = S._vw || (S._vw = new THREE.Vector3());
      for (let k = 0; k < 18; k++) { const ph = (T * (0.25 + (k % 5) * 0.05) + k * 0.137) % 1, a = k * 2.399, r = 6 * Math.sqrt((k * 0.618) % 1); local(p, yaw, Math.cos(a) * r * s, (4 + ph * 21) * s, Math.sin(a) * r * s, w); m.makeScale(s * (0.8 + ph), s * (0.8 + ph), s * (0.8 + ph)); m.setPosition(w); bubbles.add(m); }
      glowAt(S, p.x, p.y + 15 * s, p.z, 30 * s, [0.3, 1, 0.35], 0.55 * (it.dim ?? 1));
      poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, [0.3, 1, 0.4], 0.5 * (it.dim ?? 1));
    },
    // a conveyor along the wall, the sweets riding it toward you
    belt(S, it, p, q, yaw) {
      const sweets = S.layers.wrapped;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.belt.add(m);
      const T = S.tNow ?? 0, w = S._bw || (S._bw = new THREE.Vector3()), e = S._be || (S._be = new THREE.Euler()), bq = S._bq || (S._bq = new THREE.Quaternion());
      for (let k = 0; k < 12; k++) {
        const z = 30 - (((T * 9 + k * 5) % 60) + 60) % 60;
        local(p, yaw, (k % 2 ? 1 : -1) * 1.2, 10.3, z, w);
        e.set(0, yaw + k, 0); bq.setFromEuler(e); m.compose(w, bq, S._s.set(1.2, 1.2, 1.2)); sweets.add(m, { aTint: col(CANDY[(k + it.seed * 8 | 0) % CANDY.length]) });
      }
    },
    // a stamping press, the ram coming down on every beat
    press(S, it, p, q, yaw) {
      const rams = S.layers.ram;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.press.add(m);
      const k = S.beat ?? 0, w = S._rw || (S._rw = new THREE.Vector3());
      local(p, yaw, 0, (8.5 + 13.5 * (1 - k)) * s, 0, w); m.compose(w, q, S._s.set(s, s, s)); rams.add(m);
      const top = local(p, yaw, 0, 39 * s, 0, S._o); glowAt(S, top.x, top.y, top.z, 3.4 * s, [1, 0.15, 0.08], 1.2 + 1.4 * k);
      if (k > 0.85) { const b = local(p, yaw, 0, 6 * s, 3 * s, S._o); glowAt(S, b.x, b.y, b.z, 9 * s, [1, 0.7, 0.4], 0.8 * k); }
    },
    // the trap, the sweet on it; the hammer comes over on "snapped"
    trap(S, it, p, q, yaw) {
      const hammers = S.layers.hammer, sweets = S.layers.wrapped;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.trap.add(m);
      const T = S.tNow ?? 0, u = clamp((T - it.snap) / 0.08, 0, 1);
      const ang = u < 1 ? Math.PI * (1 - u * u) : Math.max(0, Math.sin((T - it.snap) * 30) * 0.12 * Math.exp(-(T - it.snap) * 8));
      const e = S._he || (S._he = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(-ang, yaw, 0); const hq = S._hq || (S._hq = new THREE.Quaternion()); hq.setFromEuler(e);
      const w = local(p, yaw, 0, 2.4 * s, 0, S._o).clone(); m.compose(w, hq, S._s.set(s, s, s)); hammers.add(m);
      const c = local(p, yaw, 0, 4.4 * s, 12 * s, S._o); m.compose(c, q, S._s.set(s * 2.2, s * 2.2, s * 2.2)); sweets.add(m, { aTint: col(0xff3a5a) });
      glowAt(S, c.x, c.y, c.z, 12 * s, [1, 0.4, 0.5], 0.4);
    },
    // the gumball machine; its bubble growing out of the chute, then gone
    gumball(S, it, p, q, yaw) {
      const balls = S.layers.gumball, bub = S.layers.gumBubble;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.gumStand.add(m); S.layers.globe.add(m);
      const R = seeded(77), w = S._gw || (S._gw = new THREE.Vector3());
      for (let k = 0; k < 120; k++) {
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 12.2, y = 23 + R() * 17;
        if (rr * rr + (y - 36) * (y - 36) > 12.6 * 12.6) continue;
        local(p, yaw, Math.cos(a) * rr * s, y * s, Math.sin(a) * rr * s, w); m.makeScale(s, s, s); m.setPosition(w); balls.add(m, { aTint: col(CANDY[k % CANDY.length]) });
      }
      const T = S.tNow ?? 0, g = smooth(it.blow0, it.pop, T), popped = T >= it.pop;
      if (!popped && g > 0.01) { const c = local(p, yaw, 0, 14.5 * s, (12 + 8 * g) * s, S._o); m.compose(c, q, S._s.set(9 * g * s, 9 * g * s, 9 * g * s)); bub.add(m); }
      if (popped && T < it.pop + 0.5) { const k = (T - it.pop) / 0.5; for (let j = 0; j < 14; j++) { const a = j * 2.4, r = (6 + 14 * k) * s; const c = local(p, yaw, Math.cos(a) * r, (14.5 + Math.sin(a * 1.3) * r * 0.6) * s, (20 + Math.sin(a) * r * 0.4) * s, S._o); glowAt(S, c.x, c.y, c.z, 3 * s, [1, 0.5, 0.8], 1.4 * (1 - k)); } }
      glowAt(S, p.x, p.y + 36 * s, p.z, 34 * s, [1, 0.7, 0.85], 0.3);
    },
    // a lollipop planted like a tree
    lolly(S, it, p, q) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + Math.sin(T * 0.7 + it.seed * 6) * 0.25, 0); const lq = (S._lq || (S._lq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, lq, S._s.set(s, s, s)); S.layers.lolly.add(m, { aTint: it.tint });
    },
    // the breaker: the handle up, then thrown down on "trips", sparks
    breaker(S, it, p, q, yaw) {
      const levers = S.layers.lever;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.breaker.add(m);
      const T = S.tNow ?? 0, u = clamp((T - it.trip) / 0.12, 0, 1), ang = 0.7 - 2.4 * u * u;
      const e = S._le || (S._le = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(ang, yaw, 0); const lq = S._lq2 || (S._lq2 = new THREE.Quaternion()); lq.setFromEuler(e);
      const w = local(p, yaw, 0, 11 * s, 2.4 * s, S._o).clone(); m.compose(w, lq, S._s.set(s, s, s)); levers.add(m);
      if (T > it.trip && T < it.trip + 0.6) for (let j = 0; j < 8; j++) { const a = j * 2.4 + T * 40; const c = local(p, yaw, Math.cos(a) * 6 * s, (11 + Math.sin(a) * 6) * s, 3 * s, S._o); glowAt(S, c.x, c.y, c.z, 3.6 * s, [1, 0.9, 0.5], 2.4 * (Math.sin(T * 90 + j) > 0 ? 1 : 0)); }
      if (T > it.trip && T < it.trip + 0.18) { const c = local(p, yaw, 0, 11 * s, 3 * s, S._o); glowAt(S, c.x, c.y, c.z, 26 * s, [0.8, 0.9, 1], 2.2 * (1 - (T - it.trip) / 0.18)); }
      if (T < it.trip) { const g = local(p, yaw, 0, 17 * s, 2.6 * s, S._o); glowAt(S, g.x, g.y, g.z, 5 * s, [0.4, 1, 0.5], 1.0); }
    },
    // the mood ring you ride through; its stone going through every colour
    moodRing(S, it, p) {
      const stones = S.layers.stone;
      p.y = S.course.sample(it.t).y + (it.lift ?? 3);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._rq2 || (S._rq2 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.moodRing.add(m);
      const T = S.tNow ?? 0, c = hue(T * 0.35); stones.add(m, { aTint: c });
      const st = local(p, h + Math.PI, 0, 18.6 * s, 0, S._o); glowAt(S, st.x, st.y, st.z, 18 * s, c, 0.9);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + T; const w = local(p, h + Math.PI, Math.cos(a) * 15 * s, Math.sin(a) * 15 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 5 * s, hue(T * 0.35 + k * 0.05), 1.0); }
      glowAt(S, p.x, p.y, p.z, 34 * s, c, 0.3);
    },
    // the fire pit on the block, marshmallows over it
    pit(S, it, p, q) {
      const flames = S.layers.flame;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.pit.add(m);
      const T = S.tNow ?? 0, w = S._fw || (S._fw = new THREE.Vector3());
      for (let k = 0; k < 7; k++) { const a = k * 2.4, r = (k ? 1.6 : 0) * s; w.set(p.x + Math.cos(a) * r, p.y + 1.2 * s, p.z + Math.sin(a) * r); const f = 0.7 + 0.35 * Math.sin(T * (9 + k) + k * 3) + 0.2 * Math.sin(T * 23 + k); m.makeScale(s * (0.8 + 0.3 * f), s * (0.9 + 0.7 * f) * (k ? 0.8 : 1.3), s * (0.8 + 0.3 * f)); m.setPosition(w); flames.add(m); }
      glowAt(S, p.x, p.y + 6 * s, p.z, 9 * s, [1, 0.55, 0.2], 0.55 + 0.15 * Math.sin(T * 13));
      poolAt(S, p.x, p.y + 0.1, p.z, 26 * s, [1, 0.5, 0.2], 0.6);
    },
    // the street clock, busted: its hands going round and round
    streetClock(S, it, p) {
      const faces = S.layers.bustedFace, hands = S.layers.streetHand;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.35 : 0.35), 0); const fq = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.clockPost.add(m); faces.add(m);
      const T = S.tNow ?? 0, by = h + Math.PI + (it.x > 0 ? -0.35 : 0.35), c = local(p, by, 0, 35 * s, 1.5 * s, S._o).clone();
      const e = S._ce || (S._ce = new THREE.Euler()), cq = S._cq3 || (S._cq3 = new THREE.Quaternion());
      for (const [rate, L, zk] of [[-2.2, 0.75, 1], [-11, 1, 1.6]]) { e.set(0, by, T * rate); cq.setFromEuler(e); m.compose(c, cq, S._s.set(s, s * L, s * zk)); hands.add(m); }
      glowAt(S, c.x, c.y, c.z, 12 * s, [1, 0.95, 0.8], 0.4);
    },
    // string lights across the street, sagging between the buildings
    lights(S, it, p) {
      const bulbs = S.layers.bulb;
      const fy = S.floorFn ? S.floorFn(it.t, 0) : 0, h = S.course.sample(it.t).yaw, w = S._lw || (S._lw = new THREE.Vector3());
      const on = 0.5 + 0.9 * (S.party ?? 0), k = S.beat ?? 0, m = S._m, span = it.span ?? 33;
      for (let j = 0; j <= 22; j++) {
        const u = j / 22, x = -span + 2 * span * u, y = fy + 26 - 6 * (1 - Math.pow(2 * u - 1, 2));
        local(p, h, x, 0, 0, w); w.y = y;
        const c = col([0xffb070, 0xff7ac8, 0x8af0d0, 0xfff0c0][j % 4]);
        m.makeScale(1, 1, 1); m.setPosition(w); bulbs.add(m, { aTint: [c[0] * 1.6, c[1] * 1.6, c[2] * 1.6] });
        glowAt(S, w.x, w.y, w.z, 2.6, c, on * (0.8 + (S.party ?? 0) * 0.5 * k));
      }
    },
    // a steel sign across the floor with his words on it
    hazardSign(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._hq2 || (S._hq2 = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.hazard.add(m); S.layers.hazardFace.add(m, { aIdx: it.idx, aWake: [0.8, 0] });
      glowAt(S, p.x, p.y + 8 * s, p.z, 14 * s, [1, 0.9, 0.6], 0.3);
    },
  },
  kits: {
    peppermint(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, y: z.y, parts: 'peppermint', ahead: z.ahead ?? 46 }); },
    trucks(S, z) { for (const [t, x, turn] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x) + Math.PI / 2 + (turn ?? 0), s: z.s ?? 1.3, parts: 'truck' })); },
    stacks(S, z) { for (const [t, x, sy] of z.at) S.items.push(onGround(S, { t, x, rot: 0, sy, parts: 'stack', ahead: 46 })); },
    vats(S, z, R) { for (const [t, x, s] of z.at) S.items.push(onGround(S, { t, x, rot: 0, s: s ?? 1, seed: R(), parts: 'vat', ahead: z.ahead })); },
    pipe(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: 0, rot: 0, y: z.y, parts: 'pipe', ahead: z.ahead }); },
    pans(S, z, R) { for (const [t, x, s] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x), s: s ?? 1, seed: R(), parts: 'pan', ahead: z.ahead })); },
    puller(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.3, parts: 'puller', ahead: z.ahead })); },
    tanks(S, z) { for (const [t, x, s] of z.at) S.items.push(onGround(S, { t, x, rot: 0, s: s ?? 1, dim: z.dim, parts: 'tank', ahead: z.ahead })); },
    belts(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.4) for (const side of [-1, 1]) S.items.push(onGround(S, { t, x: side * (z.x ?? 44), rot: 0, seed: R(), parts: 'belt', ahead: z.ahead })); },
    presses(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.75) { const side = k++ % 2 ? 1 : -1; S.items.push(onGround(S, { t, x: side * (z.x ?? 28), rot: SIDE(side), s: z.s ?? 1, parts: 'press', ahead: z.ahead })); } },
    trap(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1.5, snap: z.snap, parts: 'trap', ahead: z.ahead })); },
    gumball(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, blow0: z.blow0, pop: z.pop, parts: 'gumball', ahead: z.ahead })); },
    lollies(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) S.items.push(onGround(S, { t: t + R() * 0.2, x: side * ((z.x ?? 30) + R() * 8), rot: 0, s: (z.s ?? 1) * (0.8 + R() * 0.5), seed: R(), tint: col(pick(R, CANDY.slice(0, 7))), parts: 'lolly', ahead: z.ahead })); },
    breaker(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.6, trip: z.trip, parts: 'breaker', ahead: z.ahead })); },
    moodRing(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'moodRing', ahead: z.ahead ?? 40 }); },
    pit(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 2, parts: 'pit', ahead: z.ahead })); },
    streetClock(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, s: z.s ?? 1, parts: 'streetClock', ahead: z.ahead })); },
    stringLights(S, z) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 1.3) S.items.push({ t, x: 0, rot: 0, span: z.span, parts: 'lights', ahead: z.ahead ?? 30 }); },
  },
});

// ---------- the rooms ----------
const flat = (W = 60, H = 50) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const FACTORY = {
  rings: { flat },
  ringOf: () => 'flat',
  styles: { cook: 0, floor: 1, press: 2, show: 3, sugar: 4, coat: 5, rainbow: 6, mix: 7 },
  dims: { cook: [50, 44], floor: [64, 54], press: [46, 42], show: [44, 38], sugar: [48, 46], coat: [56, 50], rainbow: [60, 52], mix: [84, 66] },
  lights: (id) => ({ 0: [24, 12], 1: [32, 16], 2: [20, 10], 3: [22, 11], 4: [22, 11], 5: [26, 13], 6: [30, 15], 7: [36, 18] }[id] || null),
};

function candyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffb0d8) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() }, uDark: { value: 0 },
      uPulse: { value: 0 }, uMove: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uDark, uPulse, uMove;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // grout lines that settle to their average where the tiles get small on screen
      float grout(vec2 p, float w){
        vec2 d = max(fwidth(p), vec2(1e-4)), f = abs(fract(p) - 0.5);
        vec2 g = smoothstep(0.5 - w - d, 0.5 - w + d, f);
        float mean = 1.0 - (1.0 - 2.0 * w) * (1.0 - 2.0 * w);
        return mix(max(g.x, g.y), mean, clamp(max(d.x, d.y) * 2.5 - 0.6, 0.0, 1.0));
      }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool onWall = part == 1 || part == 2 || part == 6;
        vec2 fx = st < 0.5 ? vec2(24.0, 12.0) : st < 1.5 ? vec2(32.0, 16.0) : st < 2.5 ? vec2(20.0, 10.0) : st < 4.5 ? vec2(22.0, 11.0) : st < 5.5 ? vec2(26.0, 13.0) : st < 6.5 ? vec2(30.0, 15.0) : vec2(36.0, 18.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.62 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        vec3 col;
        if (part == 8) { col = vec3(0.55, 0.5, 0.52); }
        else if (part == 7) {
          // the factory's front: dark red brick, tall round-topped windows lit pink, a cream band, a candy-striped top
          vec2 b = vec2(x / 2.4 + mod(floor(h / 1.0), 2.0) * 0.5, h / 1.0);
          col = vec3(0.36, 0.1, 0.09) * (0.75 + 0.35 * h2(floor(b))) * (0.8 + 0.2 * step(0.06, fract(b.x)) * step(0.08, fract(b.y)));
          float wx = mod(x + 10.0, 20.0) - 10.0;
          float arch = h > 34.0 ? length(vec2(wx, h - 34.0)) - 5.0 : abs(wx) - 5.0;
          float inWin = step(10.0, h) * step(h, 40.0) * step(30.0, abs(x));
          col = mix(col, vec3(0.85, 0.8, 0.74), step(arch, 0.9) * inWin);
          float mull = clamp(step(abs(wx), 0.3) + step(abs(mod(h, 6.0) - 3.0), 0.25), 0.0, 1.0);
          col = mix(col, uWarm * (0.85 + 0.4 * h2(vec2(floor((x + 10.0) / 20.0), 3.0))) * (1.0 - 0.7 * mull), step(arch, 0.0) * inWin);
          col = mix(col, vec3(0.82, 0.76, 0.64), step(abs(h - 45.0), 1.5));
          col = mix(col, mix(vec3(0.85, 0.06, 0.12), vec3(0.95, 0.92, 0.92), aaSq((x + h) / 7.0)), step(56.0, h));
          col = mix(col, vec3(0.2, 0.18, 0.2), step(abs(h - 56.0), 0.7));
        } else if (st < 0.5) {
          // the syrup kitchen: white tiles with pink grout, copper pipes along, green brick above; red quarry tiles underfoot
          if (part == 0) { vec2 tq = vec2(x, along) / 3.0; col = vec3(0.46, 0.14, 0.1) * (0.8 + 0.25 * h2(floor(tq))) * (0.7 + 0.3 * edge(fract(tq), 0.05)); }
          else if (part == 3) { col = vec3(0.13, 0.11, 0.11); col = mix(col, vec3(0.22, 0.19, 0.18), step(abs(mod(along, 12.0) - 6.0), 0.8)); }
          else if (h < 18.0) { vec2 tq = vec2(wa / 2.4 + mod(floor(h / 1.2), 2.0) * 0.5, h / 1.2); col = mix(vec3(0.95, 0.55, 0.7), vec3(0.93, 0.91, 0.87), edge(fract(tq), 0.05)); }
          else if (h < 27.0) {
            col = vec3(0.16, 0.18, 0.17);
            for (int k = 0; k < 3; k++) { float py = 19.5 + float(k) * 2.6; float d = abs(h - py); col = mix(col, vec3(0.8, 0.44, 0.22) * (0.55 + 0.6 * (1.0 - d)), step(d, 1.0)); }
            col = mix(col, vec3(0.5, 0.28, 0.16), step(abs(mod(wa, 9.0) - 4.5), 0.3));
          } else { vec2 bq = vec2(wa / 2.4 + mod(floor(h / 1.0), 2.0) * 0.5, h / 1.0); col = vec3(0.22, 0.3, 0.27) * (0.8 + 0.25 * h2(floor(bq))) * (0.8 + 0.2 * edge(fract(bq), 0.06)); }
        } else if (st < 1.5) {
          // the production floor: mint steel to the hazard band, pink brick above with tall windows; concrete with yellow lines
          if (part == 0) {
            col = vec3(0.33, 0.32, 0.34) * (0.85 + 0.2 * n2(vec2(x, along) * 0.08));
            col = mix(col, vec3(0.92, 0.74, 0.1), step(abs(abs(x) - 30.0), 0.5));
            col *= 0.85 + 0.15 * step(0.02, fract(along / 10.0)) * step(0.02, fract(x / 10.0));
          } else if (part == 3) {
            float sf = fract(along / 16.0);
            col = mix(vec3(0.1, 0.09, 0.12), mix(uSkyLow, uSkyTop, 0.6) * 0.9, step(sf, 0.35));
            col = mix(col, vec3(0.32, 0.34, 0.38), step(abs(sf - 0.5), 0.03));
          } else if (h < 14.0) {
            col = vec3(0.45, 0.8, 0.68) * (0.85 + 0.15 * h2(vec2(floor(wa / 12.0), 2.0))) * (1.0 - 0.25 * step(abs(fract(wa / 3.0) - 0.5), 0.06));
          } else if (h < 16.0) {
            col = mix(vec3(0.08), vec3(0.95, 0.75, 0.1), aaSq((wa + h) / 3.0));
          } else {
            vec2 bq = vec2(wa / 2.4 + mod(floor(h / 1.0), 2.0) * 0.5, h / 1.0);
            col = vec3(0.92, 0.55, 0.68) * (0.85 + 0.15 * h2(floor(bq))) * (0.85 + 0.15 * edge(fract(bq), 0.06));
            float wx = mod(wa, 16.0) - 8.0;
            if (part != 6 && abs(wx) < 5.0 && h > 22.0 && h < 46.0) {
              vec3 night = mix(uSkyLow, uSkyTop, (h - 22.0) / 24.0);
              float mull = clamp(step(abs(wx), 0.25) + step(abs(mod(h, 4.0) - 2.0), 0.2), 0.0, 1.0);
              col = mix(night, vec3(0.25, 0.22, 0.25), mull);
            }
          }
        } else if (st < 2.5) {
          // the stamping room: riveted steel, hazard stripes along the bottom, a red band that kicks on the beat
          if (part == 0) { vec2 q = vec2(x, along) * 0.8; vec2 f = fract(q) - 0.5; float d = step(abs(f.x + f.y), 0.12) * step(abs(f.x - f.y), 0.6); col = vec3(0.3, 0.31, 0.33) * (0.8 + 0.4 * d); }
          else if (part == 3) { col = vec3(0.07, 0.07, 0.08); }
          else {
            vec2 pq = vec2(wa / 6.0, h / 4.0);
            col = vec3(0.24, 0.25, 0.27) * (0.85 + 0.15 * h2(floor(pq))) * (0.8 + 0.2 * edge(fract(pq), 0.03));
            vec2 rf = fract(pq) - 0.5; col += vec3(0.14) * step(length((rf - vec2(0.42, 0.4)) * vec2(6.0, 4.0)), 0.3);
            if (h < 4.0) col = mix(vec3(0.06), vec3(0.95, 0.75, 0.1), aaSq((wa + h) / 3.0));
            col = mix(col, vec3(0.85, 0.08, 0.06) * (0.5 + 1.4 * uBeat), step(abs(h - 24.0), 0.9));
          }
        } else if (st < 3.5) {
          // the showroom: candy-stripe paper, a mint dado, shelves of jars; black and white floor
          if (part == 0) { vec2 tq = vec2(x, along) / 4.0; col = mix(vec3(0.92, 0.9, 0.88), vec3(0.08), aaChkM(tq, vec2(0.0, uMove / 4.0))) * (0.8 + 0.2 * edge(fract(tq), 0.04)); }
          else if (part == 3) { col = vec3(0.95, 0.72, 0.84) * 0.75; }
          else {
            col = mix(vec3(0.98, 0.78, 0.88), vec3(1.0, 0.95, 0.97), aaSq(wa / 2.0));
            if (h < 8.0) col = vec3(0.55, 0.85, 0.75) * (0.85 + 0.15 * step(0.05, fract(wa / 4.0)));
            col = mix(col, vec3(0.95), step(abs(h - 8.0), 0.3));
            if (part != 6) for (int k = 0; k < 3; k++) {
              float sy = 12.0 + float(k) * 7.0;
              if (h > sy && h < sy + 5.6) {
                float jx = mod(wa, 4.0) - 2.0, jid = floor(wa / 4.0) + float(k) * 31.0;
                vec3 jc = 0.5 + 0.5 * cos(6.2832 * (h2(vec2(jid, 7.0)) + vec3(0.0, 0.33, 0.67)));
                col = mix(col, jc * 0.9 + 0.1, step(length(vec2(jx, (h - sy - 2.6) * 0.75)), 1.6));
                col = mix(col, vec3(0.9, 0.86, 0.8), step(abs(jx), 1.3) * step(abs(h - sy - 5.0), 0.4));
              }
              col = mix(col, vec3(0.6, 0.4, 0.3), step(abs(h - sy + 0.3), 0.3));
            }
          }
        } else if (st < 4.5) {
          // the sugar room: white tile with pink grout, a mint dado, a candy-stripe frieze, round
          // windows on the night up top; a big pink and white checker underfoot; skylights
          if (part == 0) { vec2 tq = vec2(x, along) / 6.0; col = mix(vec3(0.96, 0.93, 0.95), vec3(0.95, 0.5, 0.7), aaChkM(tq, vec2(0.0, uMove / 6.0))); col *= 0.92 + 0.08 * n2(vec2(x, along) * 0.2); }
          else if (part == 3) { float sf = fract(along / 14.0); col = mix(vec3(0.9, 0.88, 0.92), mix(uSkyLow, uSkyTop, 0.5), step(abs(sf - 0.5), 0.18) * step(abs(x), 30.0)); }
          else if (h < 7.0) { col = vec3(0.55, 0.88, 0.78) * (0.9 + 0.1 * step(0.5, fract(wa / 3.0))); col = mix(col, vec3(0.98), step(6.6, h)); }
          else if (h < 26.0) { vec2 tq = vec2(wa / 2.4, h / 2.4); col = mix(vec3(0.97, 0.95, 0.96), vec3(0.98, 0.5, 0.72), aaChkM(tq, vec2(uMove / 2.4, 0.0))); col = mix(col, vec3(0.85, 0.82, 0.86), grout(tq, 0.04)); }
          else if (h < 29.0) { col = mix(vec3(0.95, 0.12, 0.3), vec3(0.98, 0.96, 0.96), aaSq((wa + h) / 2.5)); }
          else {
            col = vec3(0.86, 0.8, 0.95);
            float wx = mod(wa, 14.0) - 7.0, wy = h - 36.0;
            float r = length(vec2(wx, wy));
            if (part != 6) { col = mix(col, mix(uSkyLow, uSkyTop, clamp((wy + 4.0) / 8.0, 0.0, 1.0)) * 1.2 + vec3(0.05), step(r, 4.0)); col = mix(col, vec3(0.95, 0.82, 0.4), step(abs(r - 4.3), 0.35)); }
          }
        } else if (st < 5.5) {
          // the coating room: glossy pink walls with candy running down them from the top, the
          // coating's drips longer on the beat; chocolate tile below; dark floor, strip lights
          if (part == 0) { vec2 tq = vec2(x, along) / 5.0; col = vec3(0.22, 0.11, 0.07) * (0.85 + 0.25 * n2(floor(tq) * 3.1)); col = mix(col, vec3(0.32, 0.17, 0.1), grout(tq, 0.04)); col = mix(col, vec3(0.95, 0.4, 0.62), step(abs(abs(x) - 24.0), 0.6)); }
          else if (part == 3) { col = vec3(0.08, 0.05, 0.07); col = mix(col, vec3(1.0, 0.6, 0.8) * (1.4 + 1.2 * uPulse), step(abs(mod(x + 6.0, 12.0) - 6.0), 0.35) * step(abs(x), 40.0)); }
          else if (h < 9.0) { vec2 tq = vec2(wa / 2.0, h / 1.0); col = vec3(0.3, 0.15, 0.09) * (0.85 + 0.2 * h2(floor(tq))); col = mix(col, vec3(0.42, 0.22, 0.13), grout(tq, 0.05)); }
          else {
            col = vec3(0.95, 0.42, 0.66) * (0.85 + 0.15 * n2(vec2(wa * 0.3, h * 0.05)));
            // drips: each column runs down from the top as far as its own clock takes it
            float cid = floor(wa / 1.3), cf = fract(wa / 1.3);
            float run = 6.0 + 20.0 * fract(h2(vec2(cid, 2.0)) + uTime * (0.05 + 0.08 * h2(vec2(cid, 5.0)))) + 4.0 * uPulse;
            float top = 50.0 - run, head = smoothstep(0.0, 1.0, (h - top) * 0.6);
            float drip = step(top, h) * smoothstep(0.42, 0.18, abs(cf - 0.5) - 0.1 * (1.0 - head));
            col = mix(col, vec3(1.0, 0.72, 0.85), drip * 0.85);
            col += vec3(1.0) * drip * pow(max(0.0, 1.0 - abs(cf - 0.4) * 6.0), 4.0) * 0.4;
            col = mix(col, vec3(0.98, 0.9, 0.94), step(abs(h - 9.4), 0.4));
          }
        } else if (st < 6.5) {
          // the rainbow room: broad stripes of every colour sliding down the walls, faster on the
          // beat; a white floor that throws them back; dark above
          if (part == 0) { col = vec3(0.92, 0.9, 0.93) * (0.9 + 0.1 * n2(vec2(x, along) * 0.15)); col = mix(col, vec3(0.75, 0.72, 0.8), grout(vec2(x, along) / 8.0, 0.02)); float ref = 0.5 + 0.5 * sin(along * 0.12 - uTime * 2.0); col = mix(col, 0.5 + 0.5 * cos(6.2832 * (along / 60.0 + vec3(0.0, 0.33, 0.67))), 0.18 * ref * smoothstep(40.0, 10.0, abs(x))); }
          else if (part == 3) { col = vec3(0.06, 0.05, 0.08); }
          else {
            float sp = wa * 0.06 + h * 0.03 - uTime * (0.25 + 0.5 * uPulse);
            float band = floor(sp * 6.0);
            vec3 rb = 0.5 + 0.5 * cos(6.2832 * (band / 6.0 + vec3(0.0, 0.33, 0.67)));
            col = mix(rb * 0.9 + 0.08, vec3(1.0), 0.15 * aaSq(sp * 12.0));
            col *= 0.85 + 0.35 * uPulse;
            if (h < 5.0) col = vec3(0.98, 0.96, 0.97);
          }
        } else {
          // the mixing hall: tall riveted steel in pale mint, great arched windows on the night,
          // a catwalk round it; steel plate underfoot with its safety lines
          if (part == 0) { vec2 q = vec2(x, along) * 0.8; vec2 f = fract(q) - 0.5; float d = step(abs(f.x + f.y), 0.12) * step(abs(f.x - f.y), 0.6); col = vec3(0.3, 0.32, 0.34) * (0.85 + 0.25 * d); col = mix(col, vec3(0.95, 0.75, 0.1), step(abs(abs(x) - 34.0), 0.6)); }
          else if (part == 3) { float sf = fract(along / 24.0); col = mix(vec3(0.1, 0.1, 0.12), vec3(0.2, 0.22, 0.24), step(abs(sf - 0.5), 0.05)); }
          else {
            vec2 pq = vec2(wa / 5.0, h / 3.0);
            col = vec3(0.3, 0.4, 0.38) * (0.85 + 0.15 * h2(floor(pq))) * (0.85 + 0.15 * edge(fract(pq), 0.03));
            float wx = mod(wa, 22.0) - 11.0;
            float arch = h > 46.0 ? length(vec2(wx, h - 46.0)) - 8.0 : abs(wx) - 8.0;
            if (part != 6 && h > 18.0 && arch < 0.0) {
              vec3 night = mix(uSkyLow, uSkyTop, clamp((h - 18.0) / 36.0, 0.0, 1.0));
              float mull = clamp(step(abs(wx), 0.3) + step(abs(mod(h, 6.0) - 3.0), 0.22), 0.0, 1.0);
              col = mix(night, vec3(0.22, 0.26, 0.26), mull);
            }
            col = mix(col, vec3(0.12, 0.13, 0.15), step(abs(h - 16.0), 0.9));
            col = mix(col, vec3(0.95, 0.75, 0.1), step(abs(h - 17.4), 0.2));
            if (h < 3.0) col = mix(vec3(0.06), vec3(0.95, 0.75, 0.1), aaSq((wa + h) / 3.0));
          }
        }
        if (part != 7) col *= lightK * uLight;
        // the chorus: the walls breathe with the beat
        if (onWall && part != 7) col *= 1.0 + 0.22 * uPulse;
        // the power gone: dark but for an amber light going round
        if (uDark > 0.001 && part != 7) {
          float sweep = pow(max(0.0, sin(wa * 0.11 - uTime * 3.5)), 8.0) * (onWall ? 1.0 : 0.35);
          col = mix(col, col * 0.05 + vec3(1.0, 0.55, 0.12) * sweep * 0.9, uDark);
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the candy truck tipped on your block, the boombox on its load (cdy-block.js) ----------
export { UnloadedFinale as BoomboxFinale } from './cdy-block.js';

// ---------- the factory, per frame ----------
export class CandyWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = candyMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, FACTORY));
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
    this.dark = 0;
    // the sugar rush: the cannons, the curtains, the hoppers, the candy canes (cdy-rush.js)
    this.rush = new CdyRush(scene, S, S.plan.cdyRush || {});
  }
  update(S, dt, camera, time) {
    this.rush.update(S, dt, camera, time);
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uMove.value = S.rider.v * Math.min(dt, 1 / 30);     // metres she goes in a frame
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.window ?? 0xffb0d8);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    const one = (w) => smooth(w[0] - (w[2] ?? 0.05), w[0], t) * (1 - smooth(w[1], w[1] + (w[3] ?? 0.3), t));
    const win = (w) => (!w ? 0 : Array.isArray(w[0]) ? Math.max(...w.map(one)) : one(w));
    // the power trips: a flicker, then dark
    let dark = win(ev.dark); if (dark > 0 && dark < 1) dark = dark * (Math.sin(time * 47) > 0 ? 1 : 0.4);
    this.dark = dark; u.uDark.value = dark; S.town.dark = dark;
    u.uPulse.value = (S.lift ? S.lift.k : 0) * (S.town.beat || 0);
    // the walk-ups' windows: the beat and its phase for the dancers, the party in the drop
    const fl = S.town._layers.cdyFacade;
    if (fl) {
      const fu = fl.mesh.material.uniforms, b = S.course.beatAt(Math.max(t, 0));
      fu.uBeat.value = S.town.beat || 0; fu.uPhase.value = (b % 2) / 2; fu.uParity.value = Math.floor(b) % 2; fu.uTime.value = time;
      fu.uParty.value = S.town.party || 0; fu.uWin.value = P.windowK ?? 1.6;
      fu.uWarm.value.set(P.window ?? 0xffc890); fu.uAlt.value.set(P.windowAlt ?? 0xff9ad8);
      fu.uFog.value.set(P.fog); fu.uFogDensity.value = P.fogDensity ?? 0.002; fu.uCam.value.copy(camera.position);
    }
    S.town.party = win(ev.party);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
  }
  // the lights that hang in each room
  draw(T) {
    this.rush.draw(T);
    const g = this._g || (this._g = new THREE.Vector3()), lamp = col(this.S.P.lamp ?? 0xfff0f8), k = 1 - this.dark;
    if (k < 0.02) return;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        const xs = r.style === 1 ? [-22, 22] : r.style === 3 ? [0] : r.style === 7 ? [-30, 30] : r.style === 6 ? [-20, 0, 20] : r.style === 5 ? [-18, 18] : [-14, 14];
        const drop = r.style === 1 ? 8 : r.style === 7 ? 14 : 4;
        for (const x of xs) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - drop, g.z, r.style === 3 ? 12 : r.style === 7 ? 16 : 10, lamp, 0.75 * k); }
        if (r.style !== 2) { this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, r.style === 1 ? 60 : 40, lamp, 0.3 * k); }
      }
    }
  }
}
