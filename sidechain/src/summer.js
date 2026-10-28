// Your Apartment Smells Like Summer. A hot night in the city: walk-ups with fire escapes,
// every window open, a fan or an air conditioner in half of them, sheets on the lines
// across the street. Then her apartment, and we are small in it: the floor fan, the tower
// of dirty dishes, the dead plant still in bloom, the mattress on the carpet, the war
// inside the wall, the photograph turned to face it. Out the window into the chorus,
// fireworks in the alley, sirens down the block, the storm. The hallway with the busted
// light, her door, and the last chorus in her apartment while the walls fall through.

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, PARTS } from './scenery.js';
import { tintMaterial } from './props.js';
import { prepare, floorAt } from './trail.js';
// the song's own place since its October pass (yas-*.js; none of them import this file)
import { YasWorld } from './yas-world.js';
import { YasRoof } from './yas-finale.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
export const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
// paint a whole piece one colour (for the vertex-coloured props)
export function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
// a stretch of street kept clear, on one side or both: clear: [[t0, t1, side], ...]
const cleared = (z, t, side) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
// set-pieces inside a room stand on its floor
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };

// tinted, and lit a little by itself (the washing catches the light from the windows)
export function litTint(k) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  return m;
}

// ---------- the street: walk-ups, their fire escapes, what's in the windows ----------
const SG = {
  // a fire escape down the middle bay of a city block's front (the block is 14 wide, 24
  // tall, its front at z 7, its windows 2.6 x 3.1 from 1.2 up): a landing at every floor
  fireEscape() {
    const parts = [];
    const X0 = -2.9, X1 = 2.9, D = 1.4, z0 = 7.02;
    for (let k = 1; k <= 6; k++) {
      const y = 1.2 + k * 3.1 - 0.12;
      parts.push(box(X1 - X0, 0.1, D, 0, y, z0 + D / 2));
      parts.push(box(X1 - X0, 0.06, 0.06, 0, y + 1.0, z0 + D));
      parts.push(box(X1 - X0, 0.04, 0.04, 0, y + 0.5, z0 + D));
      for (const x of [X0, X1]) { parts.push(box(0.06, 0.06, D, x, y + 1.0, z0 + D / 2)); parts.push(box(0.06, 1.0, 0.06, x, y + 0.5, z0 + D)); }
      for (let x = X0 + 0.45; x < X1 - 0.2; x += 0.45) parts.push(box(0.03, 1.0, 0.03, x, y + 0.5, z0 + D));
      if (k > 1) {
        // the stair down to the landing below, back and forth
        const dir = k % 2 ? 1 : -1;
        const a = new THREE.Vector3(dir * -2.3, y, z0 + 0.55), b = new THREE.Vector3(dir * 1.7, y - 3.1, z0 + 0.55);
        const d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        for (const dz of [-0.36, 0.36]) { const s = new THREE.BoxGeometry(0.06, L, 0.12); s.translate(0, L / 2, 0); s.applyQuaternion(q); s.translate(a.x, a.y, a.z + dz); parts.push(s); }
        for (let i = 1; i < 9; i++) { const p = a.clone().lerp(b, i / 9); parts.push(box(0.14, 0.04, 0.7, p.x, p.y, p.z)); }
      }
    }
    // the drop ladder, pulled up under the lowest landing
    for (const x of [-0.3, 0.3]) parts.push(box(0.05, 2.6, 0.05, 2.2 + x, 4.3 - 1.4, z0 + 1.3));
    for (let i = 0; i < 6; i++) parts.push(box(0.6, 0.04, 0.04, 2.2, 2.9 + i * 0.42 - 1.0, z0 + 1.3));
    return merge(parts);
  },
  // what's in the other windows: an air conditioner, or a box fan
  windowKit(v) {
    const parts = [], R = seeded(31 + v * 17);
    for (let j = 1; j < 7; j++) for (const x of [-6.5, -3.9, 3.9, 6.5]) {
      if (R() > 0.34) continue;
      const y = 1.2 + 3.1 * (j + 0.16);
      if (R() < 0.55) parts.push(box(1.05, 0.62, 0.75, x, y + 0.31, 7.3));
      else { parts.push(box(1.3, 1.3, 0.22, x, y + 0.66, 7.06)); parts.push(box(0.9, 0.9, 0.24, x, y + 0.66, 7.07)); }
    }
    return merge(parts);
  },
  // the line across the street, one metre along +x (scaled), and a thing hung on it
  line() { const g = new THREE.BoxGeometry(1, 0.07, 0.07); g.translate(0.5, 0, 0); return g; },
  cloth() { const g = new THREE.PlaneGeometry(1, 1, 1, 3); g.translate(0, -0.5, 0); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 2] = Math.sin(p[i] * 3.0 + p[i + 1] * 2.0) * 0.05; return g; },
  peg() { return box(0.06, 0.16, 0.06, 0, 0, 0); },
};

// ---------- her apartment: the things in it, at our size ----------
const AG = {
  // the floor fan: a base, the pole, the head (it turns), the blades (they spin)
  fanBase() {
    const parts = [];
    const b = new THREE.CylinderGeometry(3.4, 3.7, 0.6, 32); b.translate(0, 0.3, 0); parts.push(paint(b, rgb(0xe8e4dc)));
    const d = new THREE.SphereGeometry(1.6, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 0.4, 1); d.translate(0, 0.6, 0); parts.push(paint(d, rgb(0xe8e4dc)));
    const p = new THREE.CylinderGeometry(0.32, 0.36, 11, 12); p.translate(0, 6.0, 0); parts.push(paint(p, rgb(0xc8ccd2)));
    const c = new THREE.CylinderGeometry(0.55, 0.55, 1.2, 12); c.translate(0, 10.4, 0); parts.push(paint(c, rgb(0xe8e4dc)));
    return merge(parts);
  },
  fanHead() {
    const parts = [];
    const m = new THREE.CylinderGeometry(1.25, 1.45, 2.6, 20); m.rotateX(Math.PI / 2); m.translate(0, 0, -1.6); parts.push(paint(m, rgb(0xe8e4dc)));
    const back = new THREE.SphereGeometry(1.25, 16, 10); back.scale(1, 1, 0.6); back.translate(0, 0, -2.9); parts.push(paint(back, rgb(0xe8e4dc)));
    const chrome = rgb(0xd8dce4);
    for (const z of [0.9, -0.55]) { const r = new THREE.TorusGeometry(4.3, 0.1, 6, 48); r.translate(0, 0, z); parts.push(paint(r, chrome)); }
    for (const r0 of [1.6, 2.6, 3.5]) { const r = new THREE.TorusGeometry(r0, 0.05, 4, 40); r.translate(0, 0, 0.9 + (4.3 - r0) * 0.12); parts.push(paint(r, chrome)); }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      for (const z of [0.9, -0.55]) { const s = box(0.06, 4.2, 0.06, 0, 2.15, 0); s.rotateZ(a); s.translate(0, 0, z); parts.push(paint(s, chrome)); }
    }
    const badge = new THREE.CylinderGeometry(0.75, 0.75, 0.12, 20); badge.rotateX(Math.PI / 2); badge.translate(0, 0, 1.05); parts.push(paint(badge, rgb(0x5aa0d8)));
    return merge(parts);
  },
  fanBlades() {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const b = new THREE.SphereGeometry(1, 16, 8); b.scale(1.25, 2.1, 0.12); b.translate(0, 2.2, 0); b.rotateY(0.32); b.rotateZ((k / 3) * Math.PI * 2);
      parts.push(paint(b, rgb(0xbfe0f4)));
    }
    const hub = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16); hub.rotateX(Math.PI / 2); parts.push(paint(hub, rgb(0xe8e4dc)));
    return merge(parts);
  },
  // a tower of dirty dishes, leaning: plates, bowls, mugs, a saucepan on top with a fork in it
  dishes() {
    const parts = [], R = seeded(7);
    const cols = [0xf4f2ec, 0xe8e2d4, 0xc8dce8, 0xd8e4d0, 0xf2e0d0, 0xffffff];
    let y = 0, ox = 0, oz = 0;
    for (let k = 0; k < 34; k++) {
      ox += (R() - 0.35) * 0.32; oz += (R() - 0.5) * 0.3;
      const kind = R();
      if (kind < 0.68) {
        const r = 2.4 + R() * 0.9, h = 0.34;
        const p = new THREE.CylinderGeometry(r, r * 0.82, h, 28); p.translate(ox, y + h / 2, oz); parts.push(paint(p, rgb(pick(R, cols))));
        const rim = new THREE.TorusGeometry(r * 0.98, 0.07, 4, 28); rim.rotateX(Math.PI / 2); rim.translate(ox, y + h, oz); parts.push(paint(rim, rgb(R() < 0.5 ? 0x4a7ab8 : 0xd8c8a8)));
        y += h * (0.8 + R() * 0.5);
      } else if (kind < 0.86) {
        const r = 1.7 + R() * 0.6;
        const b = new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); b.translate(ox, y + r * 0.95, oz); parts.push(paint(b, rgb(pick(R, cols))));
        y += r * 0.7;
      } else {
        // a mug on its side in the stack
        const m = new THREE.CylinderGeometry(0.95, 0.95, 2.0, 16); m.rotateZ(Math.PI / 2); m.rotateY(R() * 3); m.translate(ox, y + 0.95, oz); parts.push(paint(m, rgb(pick(R, [0xd84a3a, 0x3a6ad8, 0xf2d04a, 0x2a2a30]))));
        y += 1.6;
      }
    }
    // the saucepan on top, handle out, a fork standing in it
    const pan = new THREE.CylinderGeometry(2.3, 2.1, 1.8, 24, 1, true); pan.translate(ox, y + 0.9, oz); parts.push(paint(pan, rgb(0xb8bcc4)));
    const bot = new THREE.CylinderGeometry(2.1, 2.1, 0.12, 24); bot.translate(ox, y + 0.06, oz); parts.push(paint(bot, rgb(0xb8bcc4)));
    const handle = box(4.6, 0.32, 0.55, ox + 4.4, y + 1.5, oz); handle.rotateZ(0.0); parts.push(paint(handle, rgb(0x2a2a2e)));
    const fork = box(0.18, 5.2, 0.12, ox + 0.6, y + 3.2, oz); fork.rotateZ(0.0); parts.push(paint(fork, rgb(0xd8dce4)));
    for (const dx of [-0.28, -0.09, 0.09, 0.28]) parts.push(paint(box(0.07, 1.1, 0.07, ox + 0.6 + dx, y + 6.3, oz), rgb(0xd8dce4)));
    parts.push(paint(box(0.7, 0.18, 0.12, ox + 0.6, y + 5.8, oz), rgb(0xd8dce4)));
    return merge(parts);
  },
  // a dead plant, still in bloom: a clay pot, dry stalks, brown leaves hanging, one pink flower
  plant() {
    const parts = [], R = seeded(19);
    const pot = new THREE.CylinderGeometry(3.1, 2.3, 4.8, 24); pot.translate(0, 2.4, 0); parts.push(paint(pot, rgb(0xb8643c)));
    const lip = new THREE.TorusGeometry(3.1, 0.28, 8, 28); lip.rotateX(Math.PI / 2); lip.translate(0, 4.8, 0); parts.push(paint(lip, rgb(0xa8583a)));
    const soil = new THREE.CylinderGeometry(2.95, 2.95, 0.1, 24); soil.translate(0, 4.6, 0); parts.push(paint(soil, rgb(0x3a2a1e)));
    const stems = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + R() * 0.5, lean = 0.25 + R() * 0.35, L = 6 + R() * 5;
      let p = new THREE.Vector3(Math.cos(a) * 0.8, 4.6, Math.sin(a) * 0.8), dir = new THREE.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean).normalize();
      for (let s = 0; s < 5; s++) {
        const seg = L / 5, q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const c = new THREE.CylinderGeometry(0.1, 0.14, seg, 6); c.translate(0, seg / 2, 0); c.applyQuaternion(q); c.translate(p.x, p.y, p.z); parts.push(paint(c, rgb(0x6a5a3a)));
        p = p.clone().addScaledVector(dir, seg);
        dir.y -= 0.32; dir.normalize();                           // drooping
        if (s >= 1) {
          const lf = new THREE.SphereGeometry(1, 8, 6); lf.scale(0.7, 1.6, 0.12); lf.translate(0, -1.4, 0); lf.rotateY(a + R()); lf.rotateZ((R() - 0.5) * 0.6); lf.translate(p.x, p.y, p.z);
          parts.push(paint(lf, rgb(pick(R, [0x8a6a3a, 0x7a5a32, 0x9a7a44, 0x6a4a2a]))));
        }
      }
      stems.push(p);
    }
    // the one that's still blooming
    const top = new THREE.Vector3(0.6, 14.6, 0.2);
    const st = new THREE.CylinderGeometry(0.11, 0.14, 10, 6); st.translate(0.3, 9.6, 0.1); parts.push(paint(st, rgb(0x4a6a3a)));
    for (let k = 0; k < 6; k++) {
      const pe = new THREE.SphereGeometry(1, 10, 8); pe.scale(0.85, 1.5, 0.2); pe.translate(0, 1.2, 0); pe.rotateX(-0.5); pe.rotateY((k / 6) * Math.PI * 2); pe.translate(top.x, top.y, top.z);
      parts.push(paint(pe, rgb(0xff5aa8)));
    }
    const ctr = new THREE.SphereGeometry(0.55, 10, 8); ctr.translate(top.x, top.y + 0.4, top.z); parts.push(paint(ctr, rgb(0xffd24a)));
    return merge(parts);
  },
  // the mattress on the carpet: no frame, a twisted sheet, two pillows
  mattress() {
    const parts = [];
    const body = new THREE.BoxGeometry(20, 4.2, 28, 8, 2, 10); body.translate(0, 2.1, 0);
    const p = body.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const ex = Math.abs(p[i]) / 10, ez = Math.abs(p[i + 2]) / 14; const k = Math.pow(Math.max(ex, ez), 6); p[i + 1] -= k * 0.5 * (p[i + 1] > 2.1 ? 1 : -1); }
    parts.push(paint(body, rgb(0xe8e6f0)));
    const sheet = new THREE.PlaneGeometry(19, 22, 24, 30); sheet.rotateX(-Math.PI / 2);
    const s = sheet.attributes.position.array;
    for (let i = 0; i < s.length; i += 3) { const x = s[i], z = s[i + 2]; s[i + 1] = 4.25 + 0.6 * Math.sin(x * 0.7 + z * 0.3) * Math.sin(z * 0.45) + 0.4 * Math.sin(x * 1.7 - z * 0.9); }
    sheet.translate(0, 0, 2.5); parts.push(paint(sheet, rgb(0xb8d4f0)));
    for (const x of [-4.8, 4.8]) { const pl = new THREE.SphereGeometry(1, 16, 10); pl.scale(4.2, 1.1, 2.6); pl.translate(x, 5.0, -10.8); parts.push(paint(pl, rgb(0xf8f4f0))); }
    return merge(parts);
  },
  // a photograph on the wall, turned to face it: the brown back, the wire, a sticker
  photoBack() {
    const parts = [];
    parts.push(paint(box(8.2, 10.8, 0.45, 0, 0, 0), rgb(0x9a7a52)));
    parts.push(paint(box(8.8, 11.4, 0.3, 0, 0, -0.16), rgb(0x2a2018)));
    parts.push(paint(box(2.8, 1.6, 0.02, 2.0, -3.8, 0.24), rgb(0xf4f0e4)));
    parts.push(paint(box(0.9, 4.6, 0.12, 0, -2.6, 0.3), rgb(0x7a5a3a)));
    for (const s of [-1, 1]) { const w = box(0.07, 4.4, 0.07, 0, 0, 0); w.rotateZ(-s * 1.1); w.translate(s * 1.9, 4.2, 0.26); parts.push(paint(w, rgb(0x9aa0a8))); }
    return merge(parts);
  },
  // her lamp, at the end: a heavy base, a tall pole, a pleated shade lit from inside
  lampBase() {
    const parts = [];
    const b = new THREE.CylinderGeometry(3.2, 3.6, 0.7, 28); b.translate(0, 0.35, 0); parts.push(paint(b, rgb(0x2a2420)));
    const p = new THREE.CylinderGeometry(0.28, 0.3, 21, 10); p.translate(0, 11, 0); parts.push(paint(p, rgb(0xb89a5a)));
    return merge(parts);
  },
  lampShade() {
    const g = new THREE.CylinderGeometry(3.4, 5.6, 6.4, 24, 1, true); g.translate(0, 23.6, 0);
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const a = Math.atan2(p[i + 2], p[i]); const k = 1 + 0.04 * Math.cos(a * 24); p[i] *= k; p[i + 2] *= k; }
    return g;
  },
};

const TT = { aTint: 3 };
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
extend({
  layers: {
    fireEscape: (M) => [SG.fireEscape(), M.metal, 260, TT],
    winKitA: (M) => [SG.windowKit(0), M.concrete, 260, TT],
    winKitB: (M) => [SG.windowKit(1), M.concrete, 260, TT],
    line: (M) => [SG.line(), M.clothLit || (M.clothLit = litTint(0.55)), 900, TT],
    cloth: (M) => [SG.cloth(), M.clothLit || (M.clothLit = litTint(0.55)), 700, TT],
    peg: (M) => [SG.peg(), M.wood, 700, TT],
    fanBase: (M) => [AG.fanBase(), VC(M, 'plastic', { roughness: 0.35, metalness: 0.1 }), 6, {}],
    fanHead: (M) => [AG.fanHead(), VC(M, 'plastic', { roughness: 0.35, metalness: 0.1 }), 6, {}],
    fanBlades: (M) => [AG.fanBlades(), VC(M, 'bladeM', { roughness: 0.25, metalness: 0, transparent: true, opacity: 0.82 }), 6, {}],
    dishes: (M) => [AG.dishes(), VC(M, 'ceramic', { roughness: 0.28, metalness: 0 }), 4, {}],
    plant: (M) => [AG.plant(), VC(M, 'plantM', { roughness: 0.8, metalness: 0, emissive: 0x100608 }), 4, {}],
    mattress: (M) => [AG.mattress(), VC(M, 'fabric', { roughness: 0.92, metalness: 0 }), 4, {}],
    photoBack: (M) => [AG.photoBack(), VC(M, 'fabric', { roughness: 0.92, metalness: 0 }), 4, {}],
  },
  parts: {
    // a walk-up: the city's block (shops at the bottom, a water tank on some roofs), a fire
    // escape on most, an air conditioner or a fan in some of the other windows
    tenement(S, it, p, q, yaw) {
      PARTS.block(S, it, p, q);
      const m = S._m, sy = it.sy ?? it.s;
      m.compose(p, q, S._s.set(it.s, sy, it.s));
      if (it.escape) S.layers.fireEscape.add(m, { aTint: [0.1, 0.09, 0.1] });
      S.layers[it.seed > 0.5 ? 'winKitA' : 'winKitB'].add(m, { aTint: [0.72, 0.72, 0.7] });
    },
    // a clothesline across the street, sagging, with the washing pegged on it
    clothesline(S, it, p, q, yaw) {
      const L = it.span ?? 18, n = 12, sag = 1.6, m = S._m;
      const pts = S._cl || (S._cl = Array.from({ length: n + 1 }, () => new THREE.Vector3()));
      for (let k = 0; k <= n; k++) { const u = k / n; local(p, yaw, -L + 2 * L * u, 0, 0, pts[k]); pts[k].y = it.h - sag * (1 - Math.pow(2 * u - 1, 2)); }
      const d = S._d || (S._d = new THREE.Vector3()), qq = S._qq || (S._qq = new THREE.Quaternion()), X = S._xAxis || (S._xAxis = new THREE.Vector3(1, 0, 0));
      for (let k = 0; k < n; k++) {
        d.copy(pts[k + 1]).sub(pts[k]); const len = d.length();
        qq.setFromUnitVectors(X, d.normalize()); m.compose(pts[k], qq, S._s.set(len, 1, 1)); S.layers.line.add(m, { aTint: [0.85, 0.82, 0.78] });
      }
      // the washing: sheets and shirts, turned to you, moving a little in the hot air
      const R = seeded(Math.floor(it.seed * 1e6) + 1), sway = Math.sin(S.tNow * 1.3 + it.seed * 9) * 0.12;
      const cq = S._cq || (S._cq = new THREE.Quaternion()), ce = S._ce || (S._ce = new THREE.Euler(0, 0, 0, 'YXZ'));
      for (let k = 1; k < n; k++) {
        if (R() < 0.3) continue;
        const sheet = R() < 0.35, w = sheet ? 2.6 + R() * 0.8 : 1.3 + R() * 0.5, h = sheet ? 3.2 + R() * 0.8 : 1.6 + R() * 0.5;
        ce.set(sway * (0.6 + R()), yaw, 0); cq.setFromEuler(ce);
        m.compose(pts[k], cq, S._s.set(w, h, 1));
        S.layers.cloth.add(m, { aTint: col(pick(R, [0xf4f0e8, 0xffffff, 0xf2d4dc, 0xcfe4f4, 0xf6e3b4, 0xd84a5a, 0x4a7ab8, 0xf4f4f4])) });
        for (const s of [-0.4, 0.4]) { local(pts[k], yaw, s * w, 0.05, 0, S._o); m.makeTranslation(S._o.x, S._o.y, S._o.z); S.layers.peg.add(m, { aTint: [0.7, 0.55, 0.35] }); }
      }
    },
    // the floor fan, turning its head, the blades a blur, shaking a little on the beat
    floorFan(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, t = S.tNow;
      const j = (S.beat || 0) * 0.12 * s;
      const pp = S._fp || (S._fp = new THREE.Vector3()); pp.copy(p); pp.x += j * Math.sin(t * 41); pp.z += j * Math.cos(t * 37);
      m.compose(pp, q, S._s.set(s, s, s)); S.layers.fanBase.add(m);
      const head = S._hq || (S._hq = new THREE.Quaternion()), e = S._he || (S._he = new THREE.Euler(0, 0, 0, 'YXZ'));
      e.set(-0.08, yaw + (it.face ?? 0) + Math.sin(t * 0.9 + (it.seed ?? 0) * 6) * 0.55, 0); head.setFromEuler(e);
      local(pp, yaw, 0, 11.6 * s, 0, S._o); m.compose(S._o, head, S._s.set(s, s, s)); S.layers.fanHead.add(m);
      const spin = S._bq || (S._bq = new THREE.Quaternion()); spin.setFromAxisAngle(S._zA || (S._zA = new THREE.Vector3(0, 0, 1)), t * 14);
      const bq = S._bq2 || (S._bq2 = new THREE.Quaternion()); bq.copy(head).multiply(spin);
      const f = S._f2 || (S._f2 = new THREE.Vector3()); f.set(0, 0, 0.25 * s).applyQuaternion(head).add(S._o);
      m.compose(f, bq, S._s.set(s, s, s)); S.layers.fanBlades.add(m);
    },
    dishes(S, it, p, q) {
      const m = S._m, s = it.s ?? 1, e = S._de || (S._de = new THREE.Euler(0, 0, 0, 'YXZ'));
      const yaw = S.course.sample(it.t).yaw + (it.rot || 0);
      e.set(Math.sin(S.tNow * 1.1) * 0.025, yaw, Math.sin(S.tNow * 0.8 + 1) * 0.03); const qq = S._dq || (S._dq = new THREE.Quaternion()); qq.setFromEuler(e);
      m.compose(p, qq, S._s.set(s, s, s)); S.layers.dishes.add(m);
    },
    plant(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.plant.add(m); },
    mattress(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.mattress.add(m); },
    // against the wall, its face to it
    photoBack(S, it, p, q, yaw) { const m = S._m; S._o.copy(p); S._o.y += it.y ?? 16; m.compose(S._o, q, S._s.set(1, 1, 1)); S.layers.photoBack.add(m); },
  },
  kits: {
    tenements(S, z, R) {
      const bricks = [0xb86a54, 0xc47a5c, 0xa85a48, 0xd08a6a, 0x9a5a4a, 0xc89a7a, 0xb07060, 0x9a7a72];
      const lo = z.low ? 0.42 : 0.74, span = z.low ? 0.18 : 0.26;
      const boards = z.gaps ? (S.plan.lyrics || []).map((l, i) => [l.t + (l.lead ?? 1.4), l.side ?? (i % 2 ? -1 : 1)]) : [];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.33 + R() * 0.08) {
          if (cleared(z, t, side) || boards.some(([bt, bs]) => bs === side && Math.abs(t - bt) < 0.3)) continue;
          S.items.push({ t, x: side * ((z.x ?? 23.5) + R() * 1.5), rot: SIDE(side), s: 0.95 + R() * 0.1, sy: lo + R() * span, parts: 'tenement', tint: col(pick(R, bricks)), seed: R(), escape: R() < 0.72, wake0: z.wake0 ?? 0.6 });
          if (R() < 0.6) S.items.push({ t: t + R() * 0.2, x: side * (44 + R() * 30), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: lo + 0.1 + R() * 0.6, parts: 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 0.35, noShop: true });
          if (R() < 0.35) S.items.push({ t, x: side * (90 + R() * 120), rot: R() * 0.4, s: 0.9, sy: 0.9 + R() * 1.2, parts: R() < 0.5 ? 'tower' : 'block', tint: col(0x5a4a5a), seed: R(), wake0: 0.3 });
        }
      }
      for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.85 });
      if (z.lines) for (let t = z.from + 0.4; t < z.to; t += z.lines * (0.8 + R() * 0.4)) S.items.push({ t, x: 0, parts: 'clothesline', seed: R(), h: Math.max(S.course.sample(t).y + 8.5, 14), ahead: 30 });
    },
    // the far city only: blocks and towers well out, for when the walls come down
    farcity(S, z, R) {
      const greys = [0x6a4a52, 0x7a5a5a, 0x5a4a5a, 0x8a5a4a];
      for (const side of [-1, 1]) for (let t = z.from; t < z.to; t += 0.25 + R() * 0.2) {
        S.items.push({ t, x: side * ((z.x ?? 84) + R() * 30), rot: SIDE(side), s: 1 + R() * 0.3, sy: 0.7 + R() * 0.9, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: 0.55, noShop: true, ahead: z.ahead });
        if (R() < 0.6) S.items.push({ t: t + R() * 0.2, x: side * (130 + R() * 140), rot: R() * 0.4, s: 1, sy: 1 + R() * 1.6, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: 0.5, ahead: z.ahead });
      }
    },
    floorFan(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0, face: z.face ?? Math.PI, s: z.s ?? 1, parts: 'floorFan', seed: 0.3, ahead: z.ahead })); },
    dishes(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0, s: z.s ?? 1, parts: 'dishes', ahead: z.ahead })); },
    plant(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.4, s: z.s ?? 1, parts: 'plant', ahead: z.ahead })); },
    mattress(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.08, s: z.s ?? 1, parts: 'mattress', ahead: z.ahead })); },
    photoBack(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y ?? 16, parts: 'photoBack', ahead: z.ahead })); },
  },
});

// ---------- the rooms ----------
// ring: the outline across the course; rel = height from the floor under the ribbon.
// part: 0 floor, 1/2 walls, 3 ceiling (caps: 6 plain wall, 7 brick front, 8 trim)
const RINGS = {
  apartment: (W = 38, H = 38) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-26, 0, 1, 0], [-13, 0, 1, 0], [0, 0, 1, 0], [13, 0, 1, 0], [26, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
  hallway: (W = 13, H = 30) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-6, 0, 1, 0], [0, 0, 1, 0], [6, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
};
const STYLE = { living: 0, bedroom: 1, hallway: 2, kitchen: 3 };
const DIMS = { living: [38, 38], bedroom: [38, 38], kitchen: [38, 38], hallway: [13, 30] };
// what a Room needs to know about a place's rooms: their outlines, style numbers, sizes, where the lights hang
const APARTMENT = { rings: RINGS, ringOf: (s) => (s === 'hallway' ? 'hallway' : 'apartment'), styles: STYLE, dims: DIMS, lights: (id) => (id === 2 ? [24, 0] : [64, 32]) };

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc070) }, uLight: { value: new THREE.Color(1, 1, 1) }, uCity: { value: new THREE.Color(0x3a2a4a) },
      uSkyTop: { value: new THREE.Color(0x0c0a24) }, uSkyLow: { value: new THREE.Color(0x6a3a5a) },
      uFlicker: { value: 1 }, uBust: { value: -1e5 }, uLit: { value: 1 },
      uWar: { value: new THREE.Vector2(-1e5, -1e5) }, uFight: { value: new THREE.Vector2(-1e5, -1e5) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uFlicker, uBust, uLit;
      uniform vec3 uFog, uCam, uWarm, uLight, uCity, uSkyTop, uSkyLow;
      uniform vec2 uWar, uFight;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      // the city at night through a window: u across, v up, both 0..1
      vec3 nightCity(float u, float v, float seed){
        vec3 col = mix(uSkyLow, uSkyTop, smoothstep(0.05, 0.9, v));
        col += vec3(1.0, 0.95, 0.85) * step(0.996, h2(floor(vec2(u * 160.0, v * 100.0)) + seed)) * smoothstep(0.5, 0.8, v) * 0.8;
        float c2 = floor(u * 11.0 + seed * 3.0), hf = 0.42 + 0.3 * h2(vec2(c2, seed + 5.0));
        col = mix(col, uCity * 0.6, step(v, hf));
        float c = floor(u * 6.0 + seed * 7.0), hb = 0.25 + 0.38 * h2(vec2(c, seed));
        vec2 wg = vec2(fract(u * 30.0), fract(v * 22.0));
        float lit = step(0.55, h2(floor(vec2(u * 30.0, v * 22.0)) + seed * 11.0)) * step(0.25, wg.x) * step(wg.x, 0.75) * step(0.3, wg.y) * step(wg.y, 0.8);
        col = mix(col, uCity * 0.22 + uWarm * lit * 1.3, step(v, hb));
        // the fire escape across the way
        col = mix(col, vec3(0.02), step(abs(fract(u * 3.0) - 0.5), 0.012) * step(v, hb) * 0.8);
        return col;
      }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        vec3 col = vec3(0.0);
        float side = x < 0.0 ? -1.0 : 1.0;
        if (part == 8) { col = vec3(0.82, 0.78, 0.7) * uLight * 0.9; }
        else if (part == 7) {
          // the brick front of a building: courses of brick, lit windows, the street light on it
          vec2 b = vec2(x / 0.9 + (mod(floor(h / 0.34), 2.0) * 0.5), h / 0.34);
          vec2 bf = fract(b);
          col = vec3(0.34, 0.16, 0.12) * (0.75 + 0.4 * h2(floor(b))) * (0.75 + 0.25 * step(0.08, bf.x) * step(0.12, bf.y));
          vec2 wc = vec2(fract(x / 4.4) - 0.5, fract((h - 1.5) / 3.6) - 0.5);
          float win = step(box2(wc * vec2(4.4, 3.6), vec2(0.8, 1.05)), 0.0) * step(4.0, h);
          float on = step(0.45, h2(floor(vec2(x / 4.4, (h - 1.5) / 3.6))));
          col = mix(col, mix(vec3(0.02, 0.02, 0.04), uWarm * 1.2, on), win);
          col *= uLight;
          col += uWarm * exp(-max(h, 0.0) * 0.12) * 0.25;
        } else if (uStyle < 1.5 || uStyle > 2.5) {
          // her apartment
          float fx = mod(along, 64.0) - 32.0;                         // to the light in this stretch
          float lightK = 0.5 + 0.7 * exp(-fx * fx / 900.0);
          if (part == 0) {
            if (uStyle > 2.5) {
              // the kitchen: big black and white tiles, not very clean
              vec2 tq = vec2(x, along) / 3.4;
              col = mix(vec3(0.62, 0.6, 0.55), vec3(0.06, 0.06, 0.07), aaChk(tq));
              col *= 0.82 + 0.18 * n2(vec2(x, along) * 0.15);
              col *= 0.75 + 0.25 * smoothstep(0.0, 0.04, min(fract(tq.x), fract(tq.y)));
            } else if (uStyle < 0.5) {
              // floorboards, honey and worn, along the room
              float id = floor(x / 2.4);
              float jl = fract((along + h2(vec2(id, 1.0)) * 40.0) / 40.0);
              float grain = n2(vec2(x * 0.9 + id * 7.0, along * 0.05)) * 0.5 + n2(vec2(x * 3.0, along * 0.2)) * 0.25;
              col = vec3(0.4, 0.25, 0.13) * (0.7 + 0.35 * h2(vec2(id, 3.0)) + 0.3 * grain);
              col *= 0.55 + 0.45 * smoothstep(0.0, 0.03, fract(x / 2.4)) * smoothstep(0.0, 0.004, jl) * smoothstep(1.0, 0.996, jl);
            } else {
              // the carpet: dusty rose, a little worn where people walk
              col = vec3(0.34, 0.23, 0.24) * (0.85 + 0.25 * h2(floor(vec2(x, along) * 3.0)) * 0.6 + 0.2 * n2(vec2(x, along) * 0.08));
            }
            col *= lightK;
          } else if (part == 3) {
            col = vec3(0.6, 0.57, 0.52) * (0.9 + 0.1 * n2(vec2(x, along) * 0.1));
            float r = length(vec2(x, fx));
            col *= 0.45 + 0.55 * exp(-r * r / 700.0);
            col += uWarm * (smoothstep(3.6, 3.0, r) * 2.6 + exp(-r * r / 60.0) * 0.6) * uLit;
          } else {
            // the walls: old paper with faded stripes and little flowers, a skirting board,
            // a window in every stretch with the city in it
            float wa = part == 6 ? x * 1.3 + 7.0 : (side > 0.0 ? along + 30.0 : along);
            float onWall = part == 6 ? 0.0 : 1.0;
            vec3 paperC = uStyle < 0.5 ? vec3(0.62, 0.54, 0.4) : vec3(0.5, 0.52, 0.44);
            col = paperC * (0.85 + 0.15 * n2(vec2(wa * 0.05, h * 0.05)));
            float st = abs(fract(wa / 4.2) - 0.5);
            col *= 1.0 - 0.12 * smoothstep(0.06, 0.03, st);
            vec2 fl = vec2(fract(wa / 2.1) - 0.5, fract(h / 2.6 + floor(wa / 2.1) * 0.5) - 0.5);
            col = mix(col, uStyle < 0.5 ? vec3(0.66, 0.36, 0.3) : vec3(0.36, 0.46, 0.5), smoothstep(0.13, 0.07, length(fl)) * 0.5);
            col *= 0.8 + 0.2 * smoothstep(0.0, 0.6, n2(vec2(wa * 0.02, h * 0.04)));     // water stains
            col = mix(col, vec3(0.8, 0.76, 0.68), step(h, 1.6));                         // skirting
            col = mix(col, vec3(0.8, 0.76, 0.68), step(36.6, h));                        // cornice
            // the kitchen's right side: cupboards, the counter, white tiles, cupboards above
            if (uStyle > 2.5 && side > 0.0 && onWall > 0.5) {
              float dq = fract(wa / 6.0);
              vec3 cab = vec3(0.56, 0.68, 0.6) * (0.92 + 0.08 * step(0.05, dq) * step(dq, 0.95));
              cab = mix(cab, vec3(0.9, 0.86, 0.7), step(abs(dq - 0.5), 0.02) * step(abs(mod(h, 12.0) - 8.0), 1.6));
              vec2 tq = fract(vec2(wa, h) / 1.2);
              vec3 tile = vec3(0.82, 0.82, 0.78) * (0.8 + 0.2 * step(0.06, tq.x) * step(0.06, tq.y));
              col = h < 11.0 ? cab : (h < 12.4 ? vec3(0.2, 0.18, 0.17) : (h < 21.0 ? tile : (h < 33.0 ? cab : col)));
            }
            col *= lightK;
            // the window
            float wx = mod(wa, 64.0) - 20.0;
            if (abs(wx) < 10.0 && h > 7.0 && h < 31.0 && onWall > 0.5) {
              vec2 wp = vec2(wx, h - 19.0);
              float inner = step(abs(wx), 9.0) * step(abs(wp.y), 11.0);
              vec3 city = nightCity(0.5 + (wx * side) / 18.0, (h - 8.0) / 22.0, floor(wa / 64.0) + side * 3.0);
              // sheer curtains at the sides, a box fan in some
              float curtain = smoothstep(5.5, 8.6, abs(wx)) * (0.75 + 0.25 * sin(wx * 4.0 + h * 0.3));
              city = mix(city, vec3(0.86, 0.8, 0.72) * uLight * lightK, curtain * 0.7);
              float fanW = step(0.5, h2(vec2(floor(wa / 64.0), side)));
              vec2 fp = vec2(wx, h - 11.6);
              float fanBox = step(box2(fp, vec2(3.4, 3.4)), 0.0) * fanW;
              float fr = length(fp);
              float grille = step(fr, 3.0) * (0.5 + 0.5 * aaSq(fr * 1.6));
              city = mix(city, vec3(0.08, 0.08, 0.1) * (1.0 - 0.6 * grille) + vec3(0.5) * step(3.0, fr) * 0.2, fanBox);
              float mull = step(abs(wx), 0.25) + step(abs(h - 19.0), 0.25);
              col = mix(vec3(0.85, 0.82, 0.76) * uLight * lightK, city, inner * (1.0 - clamp(mull, 0.0, 1.0)));
            }
            // the war inside the wall: cracks, and the light of it through them
            float war = uWar.y * smoothstep(9.0, 0.0, abs(vT - uWar.x)) * step(side, 0.0) * onWall;
            if (war > 0.001) {
              float la = (vT - uWar.x) * 40.0;
              float path = 18.0 + 7.0 * sin(la * 0.045) + 5.0 * (n2(vec2(la * 0.12, 3.0)) - 0.5) + 2.0 * (n2(vec2(la * 0.6, 7.0)) - 0.5);
              float wdt = 0.35 + 1.1 * n2(vec2(la * 0.2, 1.0));
              float branch = abs(h - (path + (la - floor(la / 23.0) * 23.0 - 11.5) * 0.9)) - 0.25;
              float cr = min(abs(h - path) - wdt, mix(9.0, branch, step(fract(la / 23.0), 0.45) * step(abs(fract(la / 23.0) - 0.22), 0.2)));
              float crack = smoothstep(0.25, -0.1, cr);
              float boom = 0.45 + 0.55 * step(0.6, h2(vec2(floor(uTime * 7.0), 1.0))) + 0.3 * sin(uTime * 31.0);
              col = mix(col, vec3(0.05, 0.03, 0.02), crack * war);
              col += vec3(1.0, 0.5, 0.18) * crack * war * boom * 1.8;
              col += vec3(1.0, 0.45, 0.15) * war * boom * 0.08;
            }
            // the neighbours fighting: their shadows on the paint
            float fight = uFight.y * smoothstep(10.0, 0.0, abs(vT - uFight.x)) * step(side, 0.0) * onWall;
            if (fight > 0.001) {
              float sh = 0.0;
              for (int k = 0; k < 2; k++) {
                float fk = float(k), dir = fk * 2.0 - 1.0;
                float cx = uFight.x + dir * 0.18;                       // in song time: two of them
                vec2 q = vec2((vT - cx) * 40.0, h - 14.0);
                float lean = sin(uTime * (2.6 + fk) + fk * 2.0) * 1.4;
                float body = step(length(vec2(q.x / 3.4 - lean * 0.15, q.y / 8.0)), 1.0);
                float head = step(length(vec2(q.x - lean, q.y - 10.2)), 2.4);
                float arm = step(abs((q.x + dir * 2.0) - (q.y - 4.0) * (0.6 + 0.6 * sin(uTime * (5.0 + fk * 1.3)) ) * -dir), 0.6) * step(0.0, q.y - 2.0) * step(q.y - 2.0, 7.0);
                sh = max(sh, max(body, max(head, arm)));
              }
              col *= 1.0 - 0.6 * sh * fight;
            }
          }
        } else {
          // the hallway: a red runner down the middle, green below the rail, doors both sides,
          // a light every so often, one of them busted
          float fa = mod(along + 12.0, 24.0) - 12.0;
          float fixture = floor((along + 12.0) / 24.0) * 24.0;
          float busted = step(abs(fixture - uBust), 12.0);
          float lk = mix(1.0, uFlicker, busted);
          float lightK = 0.28 + 0.9 * exp(-fa * fa / 70.0) * lk;
          if (part == 0) {
            vec2 tq = fract(vec2(x, along) / 1.3);
            col = mix(vec3(0.5, 0.48, 0.44), vec3(0.08, 0.08, 0.08), aaChk(vec2(x / 1.3, along / 1.3)));
            col *= 0.8 + 0.2 * n2(vec2(x, along) * 0.3);
            float run = step(abs(x), 8.2);
            col = mix(col, vec3(0.3, 0.05, 0.06) * (0.8 + 0.25 * n2(vec2(x, along) * 0.5)), run);
            col = mix(col, vec3(0.6, 0.45, 0.18), step(abs(abs(x) - 7.4), 0.25) * run);
            col *= lightK;
          } else if (part == 3) {
            col = vec3(0.5, 0.5, 0.44) * (0.5 + 0.5 * exp(-fa * fa / 60.0) * lk);
            float r = length(vec2(x, fa));
            col += vec3(1.0, 0.95, 0.8) * smoothstep(2.6, 2.0, r) * 2.4 * lk;
          } else {
            float da = part == 6 ? x + 200.0 : (side > 0.0 ? along : along + 17.0);
            col = h < 10.0 ? vec3(0.1, 0.22, 0.16) * (0.85 + 0.15 * step(0.04, abs(fract(da / 6.0) - 0.5))) : vec3(0.62, 0.58, 0.42) * (0.88 + 0.12 * n2(vec2(da, h) * 0.08));
            col = mix(col, vec3(0.32, 0.2, 0.1), step(abs(h - 10.0), 0.35));
            col = mix(col, vec3(0.2, 0.2, 0.18), step(h, 1.2));
            // a door
            float dx = mod(da, 34.0) - 17.0;
            if (abs(dx) < 7.6 && h < 27.0 && part != 6) {
              float frame = 1.0 - step(abs(dx), 6.6) * step(h, 26.0);
              vec3 wood = vec3(0.22, 0.12, 0.07) * (0.8 + 0.25 * n2(vec2(dx * 0.4, h * 4.0)));
              vec2 pq = vec2(abs(dx) - 3.1, mod(h, 12.5) - 6.25);
              wood *= 1.0 - 0.25 * step(box2(pq, vec2(2.2, 4.6)), 0.0) * (1.0 - step(box2(pq, vec2(1.9, 4.3)), 0.0));
              col = mix(wood, vec3(0.75, 0.72, 0.64), frame);
              col = mix(col, vec3(0.95, 0.75, 0.32) * 1.4, step(length(vec2(dx - 4.6 * side, h - 12.0)), 0.55));
              col = mix(col, vec3(0.85, 0.66, 0.28), step(box2(vec2(dx, h - 20.5), vec2(1.3, 0.7)), 0.0));
            }
            col *= lightK;
          }
          col *= uLight;
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// a quad for a cap, with what the room's material needs to paint it
export function capQuad(xa, ya, xb, yb, z, part, along, yOff = 0) {
  const g = new THREE.PlaneGeometry(Math.max(0.01, xb - xa), Math.max(0.01, yb - ya)); g.translate((xa + xb) / 2, (ya + yb) / 2, z);
  const n = g.attributes.position.count, P = g.attributes.position.array;
  const pa = new Float32Array(n).fill(part), co = new Float32Array(n * 3), tt = new Float32Array(n).fill(-1e5);
  for (let i = 0; i < n; i++) { co[i * 3] = P[i * 3]; co[i * 3 + 1] = P[i * 3 + 1] + yOff; co[i * 3 + 2] = along; }
  g.setAttribute('aPart', new THREE.BufferAttribute(pa, 1)); g.setAttribute('aCoord', new THREE.BufferAttribute(co, 3)); g.setAttribute('aT', new THREE.BufferAttribute(tt, 1));
  return g;
}

export class Room {
  constructor(scene, course, span, mat, table = APARTMENT) {
    this.course = course; this.span = span; this.table = table;
    const dims = span.dims || table.dims[span.style];
    this.W = dims[0]; this.H = dims[1];
    this.ring = table.rings[table.ringOf(span.style)](...dims);
    this.style = table.styles[span.style];
    const N = 150, M = this.ring.length;
    this.N = N; this.M = M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.coord = new Float32Array(N * M * 3); this.part = new Float32Array(N * M); this.tt = new Float32Array(N * M);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { if (this.ring[j][3] !== this.ring[j + 1][3]) continue; const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCoord', new THREE.BufferAttribute(this.coord, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(this.tt, 1).setUsage(THREE.DynamicDrawUsage));
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.part[i * M + j] = this.ring[j][3];
    g.setAttribute('aPart', new THREE.BufferAttribute(this.part, 1));
    this.geo = g; this.mat = mat;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -4;
    const style = this.style;
    this.mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = style; mat.uniformsNeedUpdate = true; };
    scene.add(this.mesh);
    this.caps = [span.from, span.to].map((t, k) => ((span.caps || [])[k] ? this._cap(scene, t, k, span.caps[k]) : null)).filter(Boolean);
    this.fixtures = [];
    this._p = new THREE.Vector3();
  }

  // the wall at either end: a plain wall with a door or a window in it, or a building's front
  _cap(scene, t, k, spec) {
    prepare(this.course, null);
    const fy = floorAt(this.course, t);
    const W = this.W, H = this.H;
    const hw = spec.hw ?? 11, hh = spec.hh ?? 26, sill = spec.sill ?? 0;
    const parts = [];
    const front = spec.kind === 'front';
    const top = Math.max(...this.ring.map((r) => r[1]));
    const X0 = front ? -W - 70 : -W, X1 = -X0, Y0 = front ? -fy : 0, Y1 = front ? top + 24 : top;
    const part = front ? 7 : 6, yOff = front ? fy : 0;
    for (const [xa, ya, xb, yb] of [[X0, Y0, -hw, Y1], [hw, Y0, X1, Y1], [-hw, hh, hw, Y1], [-hw, Y0, hw, sill]]) if (yb > ya + 0.01) parts.push(capQuad(xa, ya, xb, yb, 0, part, 0, yOff));
    // the frame round the opening
    for (const z of [0.06, -0.06]) for (const [xa, ya, xb, yb] of [[-hw - 0.9, sill - 0.9, -hw, hh + 0.9], [hw, sill - 0.9, hw + 0.9, hh + 0.9], [-hw, hh, hw, hh + 0.9], [-hw, sill - 0.9, hw, sill]]) if (yb > ya + 0.01) parts.push(capQuad(xa, ya, xb, yb, z, 8, 0));
    const grp = new THREE.Group();
    const mesh = new THREE.Mesh(merge(parts), this.mat);
    const style = this.style, mat = this.mat;
    mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = style; mat.uniformsNeedUpdate = true; };
    mesh.frustumCulled = false;
    grp.add(mesh);
    grp.userData = { t, fy, k };
    scene.add(grp);
    return grp;
  }

  update(track, rider, songT) {
    const sp = this.span, c = this.course;
    const ta = Math.max(sp.from, rider.t - (rider.stopping ? 20 : 4)), tb = Math.min(sp.to, rider.t + 46);
    const shown = rider.t > (sp.showFrom ?? -1e9);
    const on = tb > ta + 0.05 && shown;
    this.mesh.visible = on;
    for (const cap of this.caps) {
      const t = cap.userData.t;
      cap.visible = shown && t > rider.t - 3 && t < rider.t + 46;
      if (!cap.visible) continue;
      track.ground(t, 0, this._p);
      cap.position.set(this._p.x, cap.userData.fy, this._p.z);
      cap.rotation.set(0, c.sample(t).yaw, 0);
    }
    this.fixtures.length = 0;
    if (!on) return;
    const N = this.N, M = this.M, ring = this.ring, W = this.W, H = this.H;
    const cum = this._cum || (this._cum = new Float32Array(N));
    const ts = this._ts || (this._ts = new Float32Array(N));
    // rows at fixed song times (every DT, the room's two ends included), so its floor and walls keep
    // to the same points as she rides through instead of being re-cut every frame (they swam and
    // flickered); a short room gets them closer together than a long one
    const DT = this._dt || (this._dt = Math.max(1 / 7, Math.min(50, sp.to - sp.from) / (N - 3)));
    let rows = 0;
    ts[rows++] = ta;
    for (let k = Math.floor(ta / DT) + 1; k * DT < tb - 1e-4 && rows < N - 1; k++) if (k * DT > ta + 1e-4) ts[rows++] = k * DT;
    ts[rows++] = tb;
    this._rows = rows;
    // the walls coming down: outward, flat, then gone; the ceiling lifted away
    const fk = sp.fallAt !== undefined ? clamp((songT - sp.fallAt) / (sp.fallFor ?? 2.2), 0, 1) : 0;
    const fa = fk * fk * (Math.PI / 2 + 0.35), drop = Math.max(0, fk - 0.55) * 160, lift = fk * fk * 900;
    const smp = this._smp || (this._smp = {});
    let lx = 0, lz = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i];
      const fy = floorAt(c, t);
      // the middle of this row and the way across it: every point of the row is on that line
      track.ground(t, 0, this._p);
      const cx = this._p.x, cz = this._p.z, yaw = c.sample(t, smp).yaw, ax = -Math.cos(yaw), az = Math.sin(yaw);
      for (let j = 0; j < M; j++) {
        const [x, y, rel, part] = ring[j];
        let xx = x, yy = y;
        if (fk > 0 && (part === 1 || part === 2)) { const sg = x < 0 ? -1 : 1; xx = sg * (W + y * Math.sin(fa)); yy = y * Math.cos(fa) - drop; }
        if (fk > 0 && part === 3) yy = y + lift;
        const o = (i * M + j) * 3;
        this.pos[o] = cx + ax * xx; this.pos[o + 1] = rel ? fy + yy : yy; this.pos[o + 2] = cz + az * xx;
        this.coord[o] = x; this.coord[o + 1] = y;
        this.tt[i * M + j] = t;
      }
      cum[i] = i ? cum[i - 1] + Math.hypot(cx - lx, cz - lz) : 0;
      lx = cx; lz = cz;
    }
    let base;
    if (rider.t <= ta) {
      let d = 0, px = 0, pz = 0;
      for (let k = 0; k <= 24; k++) { track.ground(rider.t + (ta - rider.t) * k / 24, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
      base = rider.stats.dist + d;
    } else {
      let iR = 0; while (iR < rows - 2 && ts[iR + 1] <= rider.t) iR++;
      const u = clamp((rider.t - ts[iR]) / Math.max(1e-6, ts[iR + 1] - ts[iR]), 0, 1);
      base = rider.stats.dist - (cum[iR] + (cum[iR + 1] - cum[iR]) * u);
    }
    this._base = base;
    for (let i = 0; i < rows; i++) for (let j = 0; j < M; j++) this.coord[(i * M + j) * 3 + 2] = cum[i] + base;
    this.geo.setDrawRange(0, (rows - 1) * this.idxPerRow);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aCoord.needsUpdate = true; this.geo.attributes.aT.needsUpdate = true;
    // where the lights hang (the place's table says how often)
    if (fk < 0.3) {
      const L = this.table.lights(this.style);
      const P = L ? L[0] : 1e9, off = L ? L[1] : 0;
      for (let i = 0; i < rows - 1 && L; i++) {
        const a0 = cum[i] + base, a1 = cum[i + 1] + base;
        const k0 = Math.ceil((a0 - off) / P), A = k0 * P + off;
        if (A >= a0 && A < a1) { const u = (A - a0) / Math.max(1e-6, a1 - a0); this.fixtures.push({ t: ts[i] + (ts[i + 1] - ts[i]) * u, along: A, H }); }
      }
    }
  }

  // the distance along at a song time, while the room is drawn (for the busted light)
  tToAlong(T) {
    const rows = this._rows || 0, ts = this._ts, cum = this._cum;
    for (let i = 0; i < rows - 1; i++) if (T >= ts[i] && T < ts[i + 1]) return cum[i] + this._base + (cum[i + 1] - cum[i]) * (T - ts[i]) / Math.max(1e-6, ts[i + 1] - ts[i]);
    return null;
  }
}

// ---------- the end and the place (Your Apartment Smells Like Summer only) ----------
// Since its October pass the song's place lives in yas-world.js (rooms painted by yas-room.js,
// the block in yas-street.js, its things in yas-sets.js) and its end in yas-finale.js (tar beach
// on her roof). Room above is shared by many songs and is untouched; it's handed in from here.
export class LampFinale extends YasRoof {}
export class SummerWorld extends YasWorld {
  constructor(scene, S) { super(scene, S, Room); }
}
