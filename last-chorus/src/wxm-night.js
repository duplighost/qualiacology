// White Christmas: the living room at 2 a.m., everyone gone to bed. The tree with its lights still on
// (and when his heart does something weird, so do they); the couch with the blanket; the coffee table
// with every glass empty and the jug dry; his phone on the arm of the couch that lights up and goes
// dark again; the kitchen beyond, the fridge, and in it the plate grandma left, wrapped in foil, his
// name on a strip of tape and a little heart.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, clamp, smooth, merge, box, cyl, sph, lathe, tor, rod, canvasTex, VCm, pic, onFloor } from './wxm-lib.js';

const WHITE = rgb(0xf4f2ec), GLASS = rgb(0xd8e8f0), GOLD = rgb(0xd8b048), RED = rgb(0xb8141c), WOOD = rgb(0x4a2a18), PINE = rgb(0x0e3a1e), PINE2 = rgb(0x14482a);
// her plate sits on the fridge's bottom shelf, where you can see it from the road
export const PLATE_Y = 9.6;
export const TREE_COLS = [[1, 0.16, 0.1], [0.15, 0.95, 0.3], [0.25, 0.45, 1], [1, 0.7, 0.15], [1, 0.35, 0.7], [1, 0.82, 0.55]];

// the strip of tape on the foil: his name in her hand (a scrawl) and a little heart
function tapeTexture() {
  return canvasTex(512, 128, (g, W, H) => {
    g.fillStyle = '#e8dcb0'; g.beginPath(); g.moveTo(6, 14); for (let x = 6; x <= W - 6; x += 16) g.lineTo(x, 10 + (x % 32 ? 4 : 0)); g.lineTo(W - 6, 112); for (let x = W - 6; x >= 6; x -= 16) g.lineTo(x, 116 - (x % 32 ? 4 : 0)); g.closePath(); g.fill();
    g.strokeStyle = '#1a2a8a'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    const R = seeded(17); g.beginPath(); let x = 40; g.moveTo(x, 70);
    for (let i = 0; i < 9; i++) { const w = 22 + R() * 14; g.bezierCurveTo(x + w * 0.2, 20 + R() * 20, x + w * 0.6, 96, x + w, 64 - R() * 18); x += w; if (i === 0) { g.moveTo(x, 40); g.lineTo(x - 8, 92); g.moveTo(x, 64); } }
    g.stroke();
    g.fillStyle = '#d8142a'; g.beginPath(); const hx = 420, hy = 66; g.moveTo(hx, hy + 22); g.bezierCurveTo(hx - 38, hy - 4, hx - 18, hy - 34, hx, hy - 12); g.bezierCurveTo(hx + 18, hy - 34, hx + 38, hy - 4, hx, hy + 22); g.fill();
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { tape: tapeTexture() });
export const tapeTex = () => tex().tape;

export const NT = {
  // the tree: tiers of branches, a gold tinsel garland round and round, the ornaments, the star
  tree() {
    const parts = [paint(cyl(1.4, 1.8, 4, 10, 0, 2, 0), rgb(0x3a2418)), paint(cyl(5, 4, 4, 18, 0, 2, 0), RED)];
    const tiers = [[13, 10, 9], [11, 9, 15], [9, 8, 21], [7, 7, 26.5], [4.6, 6, 31]];
    for (const [r, h, y] of tiers) { parts.push(paint(new THREE.ConeGeometry(r, h, 14).translate(0, y, 0), PINE)); parts.push(paint(new THREE.ConeGeometry(r * 0.9, h * 0.8, 14, 1, true).rotateY(0.22).translate(0, y + 0.4, 0), PINE2)); }
    for (let k = 0; k < 90; k++) { const f = k / 90, y = 6 + f * 26, r = 12.4 * (1 - f * 0.86) + 0.6, a = f * Math.PI * 10; parts.push(paint(sph(0.55, 1.6, 0.6, 1.6, Math.cos(a) * r, y - 1.0, Math.sin(a) * r, 6, 4).rotateY(0), GOLD)); }
    const R = seeded(6), oc = [0xc8141c, 0xd8b048, 0x1a4ab8, 0xe8e8f0, 0x8a1a8a, 0x1a8a4a];
    for (let k = 0; k < 46; k++) { const y = 7 + R() * 24, f = (y - 5) / 30, r = 12.6 * (1 - f * 0.85) + 0.4, a = R() * Math.PI * 2; parts.push(paint(sph(1.0 + R() * 0.4, 1, 1, 1, Math.cos(a) * r, y - 2.2, Math.sin(a) * r, 10, 8), rgb(oc[k % oc.length]))); }
    const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 1.4 : 3.2; if (i) st.lineTo(Math.cos(a) * r, Math.sin(a) * r); else st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    parts.push(paint(new THREE.ExtrudeGeometry(st, { depth: 0.8, bevelEnabled: false }).translate(0, 37.6, -0.4), rgb(0xffe080)));
    return merge(parts);
  },
  // the couch, a blanket thrown on it, the cushion still dented
  couch() {
    const c = rgb(0x6a3a3a), d = rgb(0x4a2424), parts = [paint(box(36, 5, 14, 0, 4.6, 0), d), paint(box(36, 11, 4, 0, 13, -5.2), d)];
    for (const x of [-11.4, 0, 11.4]) { parts.push(paint(box(11.2, 3, 11.4, x, 8.4, 0.8), c)); parts.push(paint(box(11.2, 9, 3, x, 13.6, -2.8), c)); }
    for (const s of [-1, 1]) parts.push(paint(box(3.6, 10, 14.4, s * 18.8, 7, 0), d));
    for (const [x, z] of [[-17, -5.6], [17, -5.6], [-17, 5.6], [17, 5.6]]) parts.push(paint(cyl(0.6, 0.4, 2.2, 8, x, 1.1, z), WOOD));
    const R = seeded(12); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) parts.push(paint(box(4.2, 0.7, 4.2, -14 + i * 4.1 + R() * 0.6, 10.3 + R() * 0.8, -4 + j * 4), rgb((i + j) % 2 ? 0x2a5a8a : 0xe8e0d0)));
    return merge(parts);
  },
  // the coffee table: eight glasses, all empty, one tipped over, the jug dry
  water() {
    const parts = [paint(box(30, 1.4, 14, 0, 8, 0), WOOD)];
    for (const [x, z] of [[-13.6, -5.6], [13.6, -5.6], [-13.6, 5.6], [13.6, 5.6]]) parts.push(paint(cyl(0.7, 0.5, 8, 8, x, 4, z), WOOD));
    const glass = () => lathe([[0, 0], [1.6, 0], [1.8, 5.4], [1.65, 5.4], [1.45, 0.4], [0, 0.4]], 16);
    for (let k = 0; k < 7; k++) parts.push(paint(glass().translate(-11 + k * 3.6, 8.7, -2 + (k % 2) * 3.4), GLASS));
    parts.push(paint(glass().rotateZ(Math.PI / 2).translate(12.6, 10.4, 3.6), GLASS));
    parts.push(paint(lathe([[0, 0], [3, 0], [3.4, 4], [2.6, 9], [3.2, 10.4], [0, 10.4]], 18).translate(6, 8.7, -3.6), GLASS), paint(tor(2.2, 0.4, 9.6, 14, -3.6, 12, 6, Math.PI).rotateZ(-Math.PI / 2).translate(0, 0, 0), GLASS));
    return merge(parts);
  },
  // his phone, face up on the arm of the couch (the screen is its own)
  phone() { return paint(box(3.6, 0.6, 7.2, 0, 0.3, 0), rgb(0x141418)); },
  phoneScreen() { const g = new THREE.PlaneGeometry(3.2, 6.8); g.rotateX(-Math.PI / 2); g.translate(0, 0.62, 0); return g; },
  // the fridge: the box in white enamel, its chrome handle; inside, the shelves and what's on them
  fridge() {
    // (the box is open at the front: its back and sides and top, the inside lit white)
    const body = rgb(0xe0ded6), parts = [paint(box(20, 1.6, 16, 0, 0.8, 0), body), paint(box(20, 1.6, 16, 0, 35.2, 0), body), paint(box(1, 36, 16, -9.5, 18, 0), body), paint(box(1, 36, 16, 9.5, 18, 0), body), paint(box(20, 36, 1, 0, 18, -7.5), body), paint(box(19.4, 0.8, 15.4, 0, 36.4, 0), body)];
    parts.push(paint(box(18, 33, 0.4, 0, 18, -6.8), rgb(0xffffff)), paint(box(0.4, 33, 14.6, -8.8, 18, 0.4), rgb(0xf8fcff)), paint(box(0.4, 33, 14.6, 8.8, 18, 0.4), rgb(0xf8fcff)), paint(box(18, 0.4, 14.6, 0, 34.2, 0.4), rgb(0xffffff)));
    for (const y of [9, 17, 25]) parts.push(paint(box(18, 0.4, 14.6, 0, y, 0), rgb(0xd8e8f0)));
    parts.push(paint(box(4, 7, 4, -5, 20.5, -2), WHITE), paint(cyl(1.4, 1.4, 4, 12, 4, 19, -3), rgb(0xd83a2a)), paint(cyl(1.2, 1.2, 3.4, 12, 6.5, 19, -1), rgb(0x2a8a3a)), paint(cyl(2, 2, 3, 14, -4, 26.5, -2), rgb(0xf0d060)));
    parts.push(paint(box(20.2, 1.4, 16.2, 0, 1.4, 0), rgb(0x9a9a98)));
    return merge(parts);
  },
  fridgeDoor() { return merge([paint(box(20, 34, 2.2, 10, 18, 0), rgb(0xe8e6de)), paint(box(1.2, 12, 1.4, 17.6, 20, 1.8), rgb(0xc8ccd4)), paint(box(18, 1, 1.2, 10, 10, -1.6), rgb(0xd8e8f0)), paint(box(18, 1, 1.2, 10, 20, -1.6), rgb(0xd8e8f0)), paint(cyl(1.2, 1.2, 3.4, 10, 5, 11.8, -2), WHITE), paint(cyl(1.0, 1.0, 3, 10, 9, 21.6, -2), rgb(0xe8a030)), paint(box(1.6, 1.2, 0.4, 4, 26, 1.2), RED), paint(box(1.4, 1.4, 0.4, 13, 29, 1.2), rgb(0x2a6ad8)), paint(box(6.4, 8, 0.2, 12, 24, 1.15), rgb(0xf4f0e4))]); },
  // the plate she left: the foil over it, crumpled where she pressed it round (the tape is its own)
  plate() {
    const parts = [paint(lathe([[0, 0], [4.4, 0], [5.6, 0.5], [6.2, 0.8], [0, 0.4]], 28), WHITE)];
    const g = new THREE.SphereGeometry(5.4, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.55, 1); const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + 0.07 * Math.sin(x * 4.1 + z * 3.3) * Math.sin(y * 7.0 + x * 2.0); P.setXYZ(i, x * n, y * n, z * n); }
    g.computeVertexNormals(); g.translate(0, 0.7, 0); parts.push(paint(g, rgb(0xd8dce4)));
    return merge(parts);
  },
  tape() { const g = new THREE.PlaneGeometry(6.6, 1.65); g.rotateX(-Math.PI / 2 + 0.15); g.translate(0, 3.85, 0.4); return g; },
};

const TL = { aTint: null, aK: 1 }, KV = { aK: 1 };

extend({
  layers: {
    wxmTree: (M) => [NT.tree(), VCm(M, 'wxmTreeM', 0.22, { roughness: 0.5, metalness: 0.15 }), 4, {}],
    wxmCouch: (M) => [NT.couch(), VCm(M, 'wxmCouchM', 0.2, { roughness: 0.9 }), 4, {}],
    wxmWaterTable: (M) => [NT.water(), VCm(M, 'wxmWaterTableM', 0.4, { roughness: 0.1, metalness: 0.2 }), 4, {}],
    wxmMyPhone: (M) => [NT.phone(), VCm(M, 'wxmMyPhoneM', 0.2, { roughness: 0.3 }), 4, {}],
    wxmMyScreen: (M) => [NT.phoneScreen(), M.wxmMyScreenM || (M.wxmMyScreenM = new THREE.ShaderMaterial({ vertexShader: 'attribute float aK; varying float vK; varying vec2 vUv; void main(){ vK = aK; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }', fragmentShader: 'varying float vK; varying vec2 vUv; void main(){ vec3 c = mix(vec3(0.02), mix(vec3(0.5, 0.75, 1.0), vec3(0.95), smoothstep(0.55, 0.6, vUv.y) * step(vUv.y, 0.72) * step(0.15, vUv.x) * step(vUv.x, 0.85)), vK); gl_FragColor = vec4(c * (0.3 + 1.6 * vK), 1.0); }' })), 4, { aK: 1 }],
    wxmFridge: (M) => [NT.fridge(), VCm(M, 'wxmFridgeM', 0.55, { roughness: 0.35 }), 4, {}],
    wxmFridgeDoor: (M) => [NT.fridgeDoor(), VCm(M, 'wxmFridgeDoorM', 0.3, { roughness: 0.35 }), 4, {}],
    wxmFoilPlate: (M) => [NT.plate(), VCm(M, 'wxmFoilPlateM', 0.55, { roughness: 0.18, metalness: 0.75 }), 4, {}],
    wxmTape: (M) => [NT.tape(), pic(M, 'wxmTapeM', tex().tape, 0.7, { transparent: true, alphaTest: 0.1 }), 4, {}],
  },
  parts: {
    wxmNightProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['wxmTree', 'wxmCouch', 'wxmWaterTable', 'wxmMyPhone', 'wxmMyScreen', 'wxmFridge', 'wxmFridgeDoor', 'wxmFoilPlate', 'wxmTape', 'wxmTreeLight', 'wxmPresent', 'wxmRibbon']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind, W = S.wxm || {};
      const at = S._wxn || (S._wxn = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const o = S._o, sv = S._s;
      const put = (layer, x = 0, y = 0, z = 0, qq = q, vals) => { const w = local(at, yaw, x * s, y * s, z * s, o); m.compose(w, qq, sv.set(s, s, s)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 0, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      if (k === 'tree') { drawTree(S, it, at, q, yaw, s, T, W); }
      else if (k === 'couch') { put('wxmCouch'); poolAt(S, at.x, at.y + 0.15, at.z, 36 * s, [0.5, 0.6, 1], 0.12); }
      else if (k === 'water') { put('wxmWaterTable'); light(12, 26, [0.7, 0.85, 1], 0.12, 0); }
      else if (k === 'phone') {
        // "I should call someone": it lights up; "not tonight": dark again
        const on = it.on !== undefined ? smooth(it.on, it.on + 0.3, T) * (1 - smooth(it.off - 0.2, it.off + 0.6, T)) : 0;
        put('wxmMyPhone', 0, 0, 0); KV.aK = on; put('wxmMyScreen', 0, 0, 0, q, KV);
        if (on > 0.02) { light(2, 10, [0.6, 0.8, 1], 0.9 * on, 0); poolAt(S, at.x, at.y + 0.1, at.z, 18 * s, [0.6, 0.8, 1], 0.5 * on); }
      }
      else if (k === 'fridge') drawFridge(S, it, at, q, yaw, s, T);
    },
  },
  kits: {
    wxmNight(S, z) {
      for (const c of z.at) S.items.push(onFloor(S, { t: c.t, x: c.x, rot: c.rot ?? (c.x > 0 ? Math.PI / 2 + 0.4 : -Math.PI / 2 - 0.4), s: c.s ?? 1, y: c.y, kind: c.kind, on: c.on, off: c.off, open: c.open, heart: c.heart, h: 0, parts: 'wxmNightProp', ahead: c.ahead ?? 40 }));
    },
  },
});

// the tree's lights: twinkling, and where his heart goes strange, they stutter with it (S.wxm.beat:
// how hard his heart's last beat was, set by the world)
export function drawTree(S, it, at, q, yaw, s, T, W) {
  const L = S.layers, m = S._m, o = S._o;
  m.compose(at, q, S._s.set(s, s, s)); L.wxmTree.add(m);
  const heart = W.heartK ?? 0, beat = W.beat ?? 0;
  for (let j = 0; j < 96; j++) {
    const f = (j + 0.5) / 96, y = 6.5 + f * 25.5, r = 13.2 * (1 - f * 0.86) + 0.9, a = f * Math.PI * 18 + 0.7;
    const w = local(at, yaw, Math.cos(a) * r * s, y * s, Math.sin(a) * r * s, o); m.compose(w, q, S._s.set(s * 1.5, s * 1.5, s * 1.5));
    const tw = 0.6 + 0.4 * Math.sin(T * 1.7 + j * 2.3);
    const kk = clamp((1 - heart) * tw + heart * (0.05 + 1.6 * beat), 0, 2.2);
    TL.aTint = TREE_COLS[j % 6]; TL.aK = kk; L.wxmTreeLight.add(m, TL);
    if (j % 2 === 0) glowAt(S, w.x, w.y, w.z, 6.5 * s, TREE_COLS[j % 6], 0.75 * kk);
  }
  const w = local(at, yaw, 0, 39 * s, 0, o); glowAt(S, w.x, w.y, w.z, 12 * s, [1, 0.85, 0.45], 1.3 + 0.6 * beat * heart);
  const w2 = local(at, yaw, 0, 18 * s, 0, o); glowAt(S, w2.x, w2.y, w2.z, 60 * s, [1, 0.6, 0.45], 0.22 + 0.3 * beat * heart);
  poolAt(S, at.x, at.y + 0.15, at.z, 60 * s, [1, 0.5, 0.45], 0.5 + 0.4 * beat * heart);
  const w4 = local(at, yaw, 12 * s, 0, 14 * s, o); poolAt(S, w4.x, at.y + 0.16, w4.z, 40 * s, [0.35, 0.6, 1], 0.3 + 0.3 * beat * heart);
  // the presents underneath
  for (let j = 0; j < UNDER.length; j++) {
    const b = UNDER[j], sz = b.sz * s, hh = sz * b.hk;
    const w3 = local(at, yaw, Math.cos(b.a) * b.rr * s, 0, Math.sin(b.a) * b.rr * s, o);
    S._e.set(0, yaw + b.a, 0); const pq = (S._wxtq || (S._wxtq = new THREE.Quaternion())).setFromEuler(S._e);
    m.compose(w3, pq, S._s.set(sz, hh, sz * 0.8));
    PV.aTint = b.c; L.wxmPresent.add(m, PV); PV.aTint = b.rc; L.wxmRibbon.add(m, PV);
  }
}
const PV = { aTint: null, aK: 1 };
// the presents under the tree, laid out once
const UNDER = (() => { const R = seeded(31), cols = [[0.82, 0.08, 0.1], [0.1, 0.45, 0.2], [0.85, 0.75, 0.6], [0.15, 0.3, 0.75]], out = []; for (let j = 0; j < 7; j++) out.push({ a: j * 0.9 + 0.4, rr: 9 + R() * 4, sz: 3.4 + R() * 2.6, hk: 0.6 + R() * 0.4, c: cols[j % 4], rc: j % 2 ? [1, 0.85, 0.35] : [1, 1, 1] }); return out; })();

// the fridge: its door swings open, the light falls out, and there's her plate
export function drawFridge(S, it, at, q, yaw, s, T) {
  const L = S.layers, m = S._m, o = S._o;
  m.compose(at, q, S._s.set(s, s, s)); L.wxmFridge.add(m);
  const op = it.open !== undefined ? smooth(it.open, it.open + 1.1, T) : 1;
  const hinge = local(at, yaw, -10 * s, 0, 8.1 * s, o);
  S._e.set(0, yaw - op * 1.9, 0); const dq = (S._wxfd || (S._wxfd = new THREE.Quaternion())).setFromEuler(S._e);
  m.compose(hinge, dq, S._s.set(s, s, s)); L.wxmFridgeDoor.add(m);
  // the plate on the middle shelf, at the front
  const pw = local(at, yaw, 0, PLATE_Y * s, 3.4 * s, S._wxpw || (S._wxpw = new THREE.Vector3()));
  m.compose(pw, q, S._s.set(s, s, s)); L.wxmFoilPlate.add(m); L.wxmTape.add(m);
  if (op > 0.01) {
    const c = [0.85, 0.93, 1];
    const w = local(at, yaw, 0, 30 * s, 2 * s, o); glowAt(S, w.x, w.y, w.z, 12 * s, c, 1.1 * op);
    const w2 = local(at, yaw, 0, 18 * s, 6 * s, o); glowAt(S, w2.x, w2.y, w2.z, 34 * s, c, 0.4 * op);
    const w3 = local(at, yaw, 0, 0, 22 * s, o); poolAt(S, w3.x, at.y + 0.15, w3.z, 40 * s, c, 0.7 * op);
    // the little heart on the tape, warm in the light
    const hw = local(at, yaw, 2.6 * s, (PLATE_Y + 4.0) * s, 3.8 * s, o); glowAt(S, hw.x, hw.y, hw.z, 1.6 * s, [1, 0.15, 0.2], 0.5 * op * (it.heart !== undefined ? 0.4 + 1.4 * smooth(it.heart, it.heart + 0.5, T) : 1));
  }
}
