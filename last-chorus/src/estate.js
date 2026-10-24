// Your Wife, My Number. An early-summer heat wave at a big house. The drive between cypresses in the
// glare; the gates swinging open (one shut, four open); all the money on your wrist; the napkin with
// my digits on it; gold heels for her step; the thermometer up in the red; the privacy hedges and
// the thunder; the house changing its plan; the valet curb; a set of hearts; the storm breaking; the
// marble bathroom with its loose pearls; and the cage of polished wood that splinters as you go
// through it. At the end, the house after the rain.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
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
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.5, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const GOLD = rgb(0xe0b84a), STONE = rgb(0xece4d4), IRON = rgb(0x1e2420), WOOD = rgb(0x5a2e16), SUN = [1, 0.92, 0.7];

// ---------- the pictures ----------
// the watch face: a sunburst dial, batons, the hands at ten past ten
function dialTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    const cx = W / 2, cy = H / 2;
    const grd = g.createRadialGradient(cx, cy, 10, cx, cy, 250); grd.addColorStop(0, '#1e3a2e'); grd.addColorStop(1, '#0c1a14'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 120; k++) { const a = k / 120 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260); g.stroke(); }
    g.fillStyle = '#e8c860'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.save(); g.translate(cx + Math.sin(a) * 200, cy - Math.cos(a) * 200); g.rotate(a); g.fillRect(-7, -26, 14, k % 3 ? 40 : 56); g.restore(); }
    g.strokeStyle = '#f4e8c8'; g.lineCap = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(-1.05) * 130, cy - Math.cos(-1.05) * 130); g.stroke();
    g.lineWidth = 10; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(1.05) * 190, cy - Math.cos(1.05) * 190); g.stroke();
    g.fillStyle = '#e8c860'; g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
  });
}
// the napkin: a cocktail napkin, embossed edge, and the digits in a quick hand
function napkinTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(180,170,150,0.6)'; g.lineWidth = 3; g.strokeRect(26, 26, W - 52, H - 52);
    for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(26 + k * 11.6, 26, 3, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.translate(W / 2, H / 2 + 10); g.rotate(-0.08); g.fillStyle = '#16244a'; g.font = 'italic 700 92px "Brush Script MT", "Segoe Script", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('555-0173', 0, 0); g.restore();
    g.strokeStyle = '#16244a'; g.lineWidth = 5; g.beginPath(); g.moveTo(130, 330); g.bezierCurveTo(200, 350, 320, 345, 390, 325); g.stroke();
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { dial: dialTexture(), napkin: napkinTexture() });

// ---------- the estate, and her things in it ----------
const YM = {
  // a gate: stone pillars with urns on top (the leaves are their own, hinged)
  pillars() { const parts = []; for (const s of [-1, 1]) { parts.push(paint(box(6, 34, 6, s * 33, 17, 0), STONE), paint(box(7.4, 2, 7.4, s * 33, 34.6, 0), STONE), paint(lathe([[0, 0], [2.6, 0], [3.4, 1.6], [2, 3.4], [3, 5.6], [0, 6]], 16).translate(s * 33, 35.6, 0), STONE)); } return merge(parts); },
  leaf() { const parts = [], w = 29, h = 28; parts.push(paint(box(w, 1, 0.6, w / 2, 1, 0), IRON), paint(box(w, 1, 0.6, w / 2, 14, 0), IRON), paint(box(1, h, 0.6, 0.5, h / 2, 0), IRON), paint(box(1, h, 0.6, w - 0.5, h / 2, 0), IRON)); for (let k = 1; k < 13; k++) { const x = k * w / 13, top = h - 3 + Math.sin(k / 13 * Math.PI) * 5; parts.push(paint(box(0.5, top, 0.5, x, top / 2, 0), IRON), paint(new THREE.ConeGeometry(0.6, 2, 6).translate(x, top + 1, 0), GOLD)); } for (let k = 0; k < 6; k++) { const c = new THREE.TorusGeometry(1.6, 0.25, 6, 14); c.translate(2.4 + k * 4.8, 7.5, 0); parts.push(paint(c, GOLD)); } return merge(parts); },
  // cypresses down the drive
  cypress() { return merge([paint(cyl(0.6, 0.8, 3, 6, 0, 1.5, 0), rgb(0x4a3020)), paint(lathe([[0, 0], [3.4, 2], [3.8, 8], [3.2, 16], [2, 22], [0, 26]], 10).translate(0, 2, 0), rgb(0x1e4a2a))]); },
  hedge() { return paint(box(6, 16, 40, 0, 8, 0), rgb(0x2a5a2a)); },
  // the watch: case, bezel, crown, the bracelet looped behind
  watch() {
    const parts = [paint(cyl(10, 10, 3.6, 48, 0, 0, 0).rotateX(Math.PI / 2), GOLD), paint(new THREE.TorusGeometry(10, 1, 10, 48).translate(0, 0, 1.8), GOLD), paint(box(1.6, 2.4, 2.4, 11, 0, 0), GOLD)];
    for (let k = 0; k < 16; k++) { const a = Math.PI * 0.62 + k / 15 * Math.PI * 1.76, r = 15; parts.push(paint(box(7, 3.4, 1.4, 0, 0, 0).rotateZ(a + Math.PI / 2).translate(Math.cos(a) * r * 0.5, Math.sin(a) * r + 2, -4), GOLD)); }
    return merge(parts).translate(0, 22, 0);
  },
  watchFace() { const g = new THREE.CircleGeometry(9, 48); g.translate(0, 22, 1.85); return g; },
  // the napkin, folded and standing like a card
  napkin() { const a = new THREE.PlaneGeometry(22, 22); a.rotateX(-0.22); a.translate(0, 11, 1.2); const b = new THREE.PlaneGeometry(22, 22); b.rotateX(0.22); b.translate(0, 11, -1.2); return [a, b]; },
  // gold heels: a pair of stilettos
  heel() { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.2, 0); sh.lineTo(1.6, 9); sh.quadraticCurveTo(2.6, 11.4, 7, 9.6); sh.quadraticCurveTo(13, 6.6, 18.6, 1.2); sh.quadraticCurveTo(19.4, 0, 18, 0); sh.lineTo(14, 0); sh.quadraticCurveTo(9, 3.6, 4, 7.2); sh.lineTo(3, 7.6); sh.lineTo(2.4, 0.6); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 4.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 12 }); g.translate(-9, 0, -2.2); return g; },
  // the thermometer, up in the red
  thermo() { return merge([paint(box(8, 46, 1.4, 0, 25, -0.8), rgb(0xf4f0e8)), paint(cyl(1.6, 1.6, 36, 16, 0, 27, 0.6), rgb(0xe8eef2)), paint(sph(3.4, 1, 1, 1, 0, 6.6, 0.6, 16, 12), rgb(0xd82a1a)), ...Array.from({ length: 12 }, (_, k) => paint(box(k % 3 ? 2 : 3.6, 0.3, 0.3, -2.8, 11 + k * 2.8, 0.2), rgb(0x2a2a30)))]); },
  mercury() { return cyl(0.9, 0.9, 1, 12, 0, 0.5, 0); },
  // the house: white planes, glass bands, a flat roof floating over it
  house() {
    const parts = [paint(box(70, 12, 30, 0, 6, 0), STONE), paint(box(56, 12, 26, 8, 18, -2), STONE), paint(box(80, 1.4, 38, 4, 24.7, -2), rgb(0xf4f0e8)), paint(box(24, 8, 22, -30, 4, 16), rgb(0xd8d0c0))];
    return merge(parts);
  },
  houseGlass() { const parts = [box(66, 8, 0.4, 0, 6, 15.1), box(52, 8, 0.4, 8, 18, 11.1)]; return merge(parts); },
  // the valet: a podium, a key box on the wall behind, a curb with a carpet
  valet() { return merge([paint(box(8, 9, 5, 0, 4.5, 0), rgb(0x1e3a2a)), paint(box(8.8, 0.8, 5.8, 0, 9.4, 0), GOLD), paint(box(12, 16, 1.4, 0, 10, -8), rgb(0x2a2a2e)), paint(box(40, 1.6, 14, 0, 0.8, 0), STONE), paint(box(10, 0.3, 14, 0, 1.7, 0), rgb(0x9a1a2a)), ...Array.from({ length: 12 }, (_, k) => paint(box(0.4, 2.4, 0.4, -4.4 + (k % 4) * 3, 15 - Math.floor(k / 4) * 4, -7.1), GOLD))]); },
  // the marble sink: a pedestal basin, the gold tap
  sink() { return merge([paint(lathe([[0, 0], [4, 0], [3, 2], [2.6, 10], [6, 13], [9, 15.4], [9.4, 16], [0, 16]], 32), rgb(0xf2eee8)), paint(cyl(7.8, 7.8, 0.4, 32, 0, 15.6, 0), rgb(0xb8c8d0)), paint(tube(V(0, 15.8, -7), V(0, 20, -7), 0.6), GOLD), paint(tube(V(0, 20, -7), V(0, 20.6, -3.4), 0.6), GOLD), paint(sph(0.9, 1, 1, 1, 2.4, 18, -7, 8, 6), GOLD), paint(sph(0.9, 1, 1, 1, -2.4, 18, -7, 8, 6), GOLD)]); },
  pearl() { return sph(1, 1, 1, 1, 0, 0, 0, 14, 10); },
  // the cage of polished wood: bars round, a dome, a ring at the top
  cageBar() { return paint(cyl(0.7, 0.7, 40, 8, 0, 20, 0), WOOD); },
  cageTop() { const parts = []; for (const y of [0.6, 40]) parts.push(paint(new THREE.TorusGeometry(26, 1.1, 8, 64).rotateX(Math.PI / 2).translate(0, y, 0), WOOD)); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; for (let j = 0; j < 6; j++) { const u0 = j / 6, u1 = (j + 1) / 6; const p0 = V(Math.cos(a) * 26 * Math.cos(u0 * Math.PI / 2), 40 + 14.3 * Math.sin(u0 * Math.PI / 2), Math.sin(a) * 26 * Math.cos(u0 * Math.PI / 2)); const p1 = V(Math.cos(a) * 26 * Math.cos(u1 * Math.PI / 2), 40 + 14.3 * Math.sin(u1 * Math.PI / 2), Math.sin(a) * 26 * Math.cos(u1 * Math.PI / 2)); parts.push(paint(tube(p0, p1, 0.6), WOOD)); } } parts.push(paint(new THREE.TorusGeometry(3, 0.8, 8, 20).translate(0, 57, 0), GOLD)); return merge(parts); },
  // his lines on a stone plaque, hung on chains of gold
  signBoard() { return merge([paint(box(25.8, 10.2, 1.4, 0, 0, -1.1), rgb(0xd8ccb4)), paint(box(24.6, 9, 0.4, 0, 0, -0.5), rgb(0xf4efe4)), ...[-9, 9].map((x) => paint(box(0.18, 40, 0.18, x, 25.1, -1.1), GOLD))]); },
};
const ymGlass = (M) => M.ymGlassM || (M.ymGlassM = (() => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.6, emissive: 0xffffff, emissiveIntensity: 1 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vec3(0.25, 0.3, 0.35);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint;'); }; return m; })());

extend({
  layers: {
    ymPillars: (M) => [YM.pillars(), VCm(M, 'ymPillarsM', 0.25, { roughness: 0.8 }), 10, {}],
    ymLeaf: (M) => [YM.leaf(), VCm(M, 'ymLeafM', 0.25, { roughness: 0.4, metalness: 0.6 }), 20, {}],
    ymCypress: (M) => [YM.cypress(), VCm(M, 'ymCypressM', 0.12, { roughness: 0.9 }), 400, {}],
    ymHedge: (M) => [YM.hedge(), VCm(M, 'ymHedgeM', 0.12, { roughness: 0.95 }), 40, {}],
    ymWatch: (M) => [YM.watch(), VCm(M, 'ymWatchM', 0.4, { roughness: 0.2, metalness: 0.9 }), 2, {}],
    ymWatchFace: (M) => [YM.watchFace(), pic(M, 'ymWatchFaceM', tex().dial, 0.6, { roughness: 0.2 }), 2, {}],
    ymNapkinA: (M) => [YM.napkin()[0], pic(M, 'ymNapkinM', tex().napkin, 0.6), 2, {}],
    ymNapkinB: (M) => [YM.napkin()[1], pic(M, 'ymNapkinM', tex().napkin, 0.6), 2, {}],
    ymHeel: (M) => [YM.heel(), M.ymHeelM || (M.ymHeelM = new THREE.MeshStandardMaterial({ color: 0xe0b84a, roughness: 0.18, metalness: 0.95, emissive: 0x8a6a1a, emissiveIntensity: 0.5 })), 4, {}],
    ymThermo: (M) => [YM.thermo(), VCm(M, 'ymThermoM', 0.4, { roughness: 0.4 }), 2, {}],
    ymMercury: (M) => [YM.mercury(), M.ymMercuryM || (M.ymMercuryM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.12, 0.08) })), 2, {}],
    ymHouse: (M) => [YM.house(), VCm(M, 'ymHouseM', 0.3, { roughness: 0.6 }), 2, {}],
    ymHouseGlass: (M) => [YM.houseGlass(), ymGlass(M), 2, { aTint: 3 }],
    ymValet: (M) => [YM.valet(), VCm(M, 'ymValetM', 0.3, { roughness: 0.5 }), 2, {}],
    ymSink: (M) => [YM.sink(), VCm(M, 'ymSinkM', 0.3, { roughness: 0.15, metalness: 0.2 }), 2, {}],
    ymPearl: (M) => [YM.pearl(), M.ymPearlM || (M.ymPearlM = new THREE.MeshStandardMaterial({ color: 0xf8f2ec, roughness: 0.12, metalness: 0.25, emissive: 0xfff4ec, emissiveIntensity: 0.35 })), 260, {}],
    ymCageBar: (M) => [YM.cageBar(), VCm(M, 'ymCageM', 0.3, { roughness: 0.15, metalness: 0.3 }), 48, {}],
    ymCageTop: (M) => [YM.cageTop(), VCm(M, 'ymCageM', 0.3, { roughness: 0.15, metalness: 0.3 }), 2, {}],
    ymSignBoard: (M) => [YM.signBoard(), VCm(M, 'ymSignM', 0.3, { roughness: 0.6 }), 14, {}],
    ymSignFace: (M) => [signFace(23.4, 7.8, 0, 0, 0.05), M.sign, 14, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a gate across the drive, its leaves swinging open on their moment (or shut)
    ymGate(S, it, p, q, yaw) {
      const L = S.layers; void L.ymPillars; void L.ymLeaf; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const at = S._ymg || (S._ymg = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      m.compose(at, q, S._s.set(s, s, s)); L.ymPillars.add(m);
      const open = it.shut !== undefined ? 1 - smooth(it.shut, it.shut + 0.5, T) : smooth(it.open ?? -1e9, (it.open ?? -1e9) + 0.6, T);
      for (const sd of [-1, 1]) {
        const hinge = local(at, yaw, sd * 30 * s, 0, 0, S._o);
        S._e.set(0, yaw + (sd > 0 ? Math.PI : 0) + sd * open * 1.45, 0); const lq = (S._ymlq || (S._ymlq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(hinge, lq, S._s.set(s, s, s)); L.ymLeaf.add(m);
      }
      for (const sd of [-1, 1]) { const w = local(at, yaw, sd * 33 * s, 40 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 4 * s, SUN, 0.4); }
    },
    ymCypress(S, it, p, q) { const L = S.layers; void L.ymCypress; if (!S.track) return; const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s)); L.ymCypress.add(m); },
    ymHedge(S, it, p, q) { const L = S.layers; void L.ymHedge; if (!S.track) return; const m = S._m; m.compose(p, q, S._s.set(1, it.sy ?? 1, 1)); L.ymHedge.add(m); },
    // the set-pieces
    ymProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['ymWatch', 'ymWatchFace', 'ymNapkinA', 'ymNapkinB', 'ymHeel', 'ymThermo', 'ymMercury', 'ymHouse', 'ymHouseGlass', 'ymValet', 'ymSink', 'ymPearl']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._ymv || (S._ymv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.4, c = SUN, r = 40) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'watch') { put('ymWatch'); put('ymWatchFace'); for (let j = 0; j < 4; j++) { const a = T * 1.2 + j * 1.6; const w = local(at, yaw, Math.cos(a) * 10 * s, (22 + Math.sin(a) * 10) * s, 2.4 * s, S._o); if (Math.sin(T * 5 + j * 2) > 0.7) glowAt(S, w.x, w.y, w.z, 3 * s, [1, 0.95, 0.8], 1.6); } spot(0.4, [1, 0.85, 0.5]); }
      else if (k === 'napkin') { put('ymNapkinA'); put('ymNapkinB'); light(12, 30, SUN, 0.2, 4); spot(0.3); }
      else if (k === 'heels') { put('ymHeel', -6, 0, 0, quat('_ymh1', 0.2)); put('ymHeel', 7, 0, 3, quat('_ymh2', -0.35)); for (let j = 0; j < 3; j++) if (Math.sin(T * 4 + j * 2.4) > 0.8) light(6 + j * 2, 4, [1, 0.95, 0.75], 1.4, 2.6, -6 + j * 6); spot(0.45, [1, 0.85, 0.5]); }
      else if (k === 'thermo') { put('ymThermo'); const lvl = 0.35 + 0.6 * smooth(it.rise ?? 0, (it.rise ?? 0) + 2.5, T); const w = local(at, yaw, 0, 9 * s, 0.6 * s, S._o); m.makeScale(1.1 * s, 34 * lvl * s, 1.1 * s); m.setPosition(w.x, w.y, w.z); L.ymMercury.add(m); light(6.6, 12, [1, 0.2, 0.1], 0.8, 1); spot(0.3, [1, 0.5, 0.3]); }
      else if (k === 'house') {
        // the house changing its plan: the rooms going dark and light in a new order
        put('ymHouse');
        const flip = it.flip !== undefined ? smooth(it.flip, it.flip + 0.3, T) : 0, ph = Math.floor(T * 3.6);
        const g = flip > 0 && T < (it.flip ?? 0) + 2.2 ? 0.3 + 1.2 * (hash(ph) > 0.5 ? 1 : 0.1) : 0.5 + 0.5 * (it.lit ?? 0.5);
        put('ymHouseGlass', 0, 0, 0, q, s, { aTint: [1.1 * g, 0.86 * g, 0.62 * g] }); light(10, 90, [1, 0.85, 0.6], 0.15 * g, 20);
      }
      else if (k === 'valet') { put('ymValet'); light(10, 20, [1, 0.9, 0.7], 0.4, 3); spot(0.4); }
      else if (k === 'sink') {
        put('ymSink');
        // a string of pearls over the edge, and the loose ones on the floor
        for (let j = 0; j < 22; j++) { const u = j / 21; const w = local(at, yaw, (-8 + u * 10) * s, (16.4 - Math.sin(u * Math.PI) * 2 - (u > 0.7 ? (u - 0.7) * 30 : 0)) * s, (5 + (u > 0.7 ? (u - 0.7) * 6 : 0)) * s, S._o); m.compose(w, q, S._s.set(0.7 * s, 0.7 * s, 0.7 * s)); L.ymPearl.add(m); }
        light(16, 30, [1, 0.97, 0.9], 0.3, 2); spot(0.35, [1, 0.95, 0.9]);
      }
    },
    // loose pearls rolling over the bathroom floor
    ymPearls(S, it, p, q, yaw) {
      const L = S.layers; void L.ymPearl; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded((it.seed * 1000) | 0), base = it.h ?? 0;
      for (let j = 0; j < 40; j++) { const x0 = (R() - 0.5) * 60, z0 = (R() - 0.5) * 40, v = (R() - 0.5) * 6; if (Math.abs(x0) < 8) continue; const x = x0 + Math.sin(T * 0.8 + j) * 2 + v * ((T * 0.3) % 1); const w = local(p, yaw, x, 0, z0, S._o); w.y = base + 1.2; m.compose(w, q, S._s.set(1.2, 1.2, 1.2)); L.ymPearl.add(m); }
    },
    // the cage of polished wood over the drive, splintering when he says so
    ymCage(S, it, p, q, yaw) {
      const L = S.layers; void L.ymCageBar; void L.ymCageTop; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, br = it.burst ?? 1e9, f = Math.max(0, T - br);
      const at = S._ymc || (S._ymc = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      if (f <= 0) { m.compose(at, q, S._s.set(s, s, s)); L.ymCageTop.add(m); }
      for (let j = 0; j < 40; j++) {
        const a = j / 40 * Math.PI * 2, r = 26 * s; if (Math.abs(Math.cos(a)) < 0.25) continue;
        const d = f * (30 + hash(j) * 30), up = f * (18 + hash(j * 3) * 20) - 20 * f * f;
        const w = local(at, yaw, Math.cos(a) * (r + d), up, Math.sin(a) * (r + d), S._o);
        S._e.set(f * (hash(j * 5) - 0.5) * 6, a, f * (hash(j * 7) - 0.5) * 6); const bq = (S._ymbq || (S._ymbq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, bq, S._s.set(s, s * (f > 0 ? 0.3 + 0.7 * hash(j * 11) : 1), s)); L.ymCageBar.add(m);
        if (f > 0 && f < 1.2) glowAt(S, w.x, w.y + 6, w.z, 2, [1, 0.85, 0.6], 1.2 * (1 - f / 1.2));
      }
      glowAt(S, at.x, (at.y + 30) * 1, at.z, 50 * s, [1, 0.85, 0.6], 0.12);
    },
    // his lines on a stone plaque, hung on gold chains over the drive
    ymSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._ymsq || (S._ymsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.ymSignBoard.add(m); S.layers.ymSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      glowAt(S, p.x, p.y, p.z, 30 * s, [1, 0.92, 0.75], 0.1);
    },
  },
  kits: {
    ymProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, rise: c.rise, flip: c.flip, lit: c.lit, h: 0, parts: 'ymProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // gates across the drive: { at: [[t, open], ...] } or shut
    ymGates(S, z) { for (const [t, open, shut] of z.at) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, open, shut, h: 0, parts: 'ymGate', ahead: 40 }); },
    ymDrive(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.38) for (const side of [-1, 1]) { if ((z.gaps || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue; S.items.push({ t: t + R() * 0.05, x: side * ((z.x ?? 38) + R() * 2), rot: R() * 6.28, s: 0.9 + R() * 0.3, sy: 0.9 + R() * 0.4, h: 0, parts: 'ymCypress', ahead: 40 }); if (R() < 0.5) S.items.push({ t: t + R() * 0.2, x: side * (50 + R() * 90), rot: R() * 6.28, s: 0.9 + R() * 0.5, h: 0, parts: 'ymCypress', ahead: 40 }); } },
    ymHedges(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 21), rot: 0, sy: z.sy ?? 1, h: 0, parts: 'ymHedge', ahead: 36 }); },
    ymPearls(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push(onFloor(S, { t, x: 0, rot: 0, seed: R(), h: 0, parts: 'ymPearls', ahead: 30 })); },
    ymCage(S, z) { S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, burst: z.burst, h: 0, parts: 'ymCage', ahead: 40 }); },
  },
});

// ---------- the marble bathroom ----------
const ringBath = (W = 32, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const BATH = { rings: { bath: ringBath }, ringOf: () => 'bath', styles: { marble: 0 }, dims: { marble: [32, 36] }, lights: () => [18, 9] };
function bathMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogDensity; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float marble(vec2 q){ float n = n2(q * 0.08) * 0.6 + n2(q * 0.2) * 0.3 + n2(q * 0.6) * 0.1; return smoothstep(0.02, 0.0, abs(sin(q.x * 0.05 + q.y * 0.03 + n * 7.0)) * 0.12); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float wa = part == 6 ? x : along;
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) { col = vec3(0.92, 0.9, 0.86) * 0.7; }
        else if (part == 8) { col = vec3(0.88, 0.72, 0.36); glow += vec3(0.3, 0.22, 0.08); }
        else if (part == 0) { vec2 q = vec2(x, along); vec2 t = q / 8.0; col = mix(vec3(0.95, 0.94, 0.92), vec3(0.18, 0.18, 0.2), mod(floor(t.x) + floor(t.y), 2.0)); col = mix(col, vec3(0.55, 0.55, 0.58), marble(q * 3.0) * 0.6); col *= 0.9 + 0.1 * edge(fract(t), 0.02); }
        else if (part == 3) { col = vec3(0.96, 0.95, 0.93); vec2 q = fract(vec2(x, along) / 12.0); col *= 0.88 + 0.12 * edge(q, 0.08); col = mix(col, vec3(0.88, 0.72, 0.36), 1.0 - edge(q, 0.03)); }
        else {
          vec2 q = vec2(wa, h); col = vec3(0.95, 0.94, 0.92); col = mix(col, vec3(0.5, 0.5, 0.54), marble(q * 2.0) * 0.75);
          float notCap = part == 6 ? 0.0 : 1.0;
          // a long mirror in a gold frame, sconces either side
          float per = 30.0; vec2 mv = vec2(mod(wa, per), h);
          float mir = notCap * step(6.0, mv.x) * step(mv.x, 24.0) * step(12.0, mv.y) * step(mv.y, 30.0);
          float frm = notCap * step(5.2, mv.x) * step(mv.x, 24.8) * step(11.2, mv.y) * step(mv.y, 30.8) * (1.0 - mir);
          vec3 mc = mix(vec3(0.55, 0.6, 0.62), vec3(0.9, 0.92, 0.94), smoothstep(12.0, 30.0, mv.y + sin(wa * 0.1) * 3.0));
          col = mix(col, mc, mir); glow += mc * mir * 0.2; col = mix(col, vec3(0.88, 0.72, 0.36), frm); glow += vec3(0.3, 0.22, 0.08) * frm;
          float sc = notCap * (smoothstep(1.2, 0.0, length(mv - vec2(3.0, 24.0))) + smoothstep(1.2, 0.0, length(mv - vec2(27.0, 24.0))));
          glow += vec3(1.0, 0.85, 0.6) * sc * 1.2;
          col = mix(col, vec3(0.88, 0.72, 0.36), step(abs(h - 8.0), 0.3) * notCap);
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the house after the rain, the gates open, the pool lit ----------
export class GlassHouseFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    const house = new THREE.Mesh(YM.house(), selfLit({ roughness: 0.6 }, 0.28)); this.group.add(house);
    const glass = new THREE.Mesh(YM.houseGlass(), new THREE.MeshStandardMaterial({ color: 0x3a3428, roughness: 0.05, metalness: 0.5, emissive: 0xffc890, emissiveIntensity: 0.9 })); this.group.add(glass);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(50, 0.6, 16).translate(0, 0.3, 30), new THREE.MeshStandardMaterial({ color: 0x3ab8d8, roughness: 0.05, metalness: 0.2, emissive: 0x1a8ab8, emissiveIntensity: 0.8 })); this.group.add(pool);
    const deck = new THREE.Mesh(paint(box(64, 0.5, 26, 0, 0.1, 30), STONE), selfLit({ roughness: 0.8 }, 0.2)); this.group.add(deck);
    for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(YM.cypress(), selfLit({ roughness: 0.9 }, 0.1)); c.position.set(-44 + (k % 2) * 92, 0, -20 + Math.floor(k / 2) * 18); c.scale.setScalar(1.3); this.group.add(c); }
    this.group.scale.setScalar(cfg.s ?? 1.4);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() {}
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.4;
    this._w.set(0, 1, 30).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y + 2, this._w.z, 40 * s, [0.4, 0.85, 1], 0.25); S.pool(this._w.x, 0.3, this._w.z, 60 * s, [0.4, 0.85, 1], 0.4);
    for (const [x, y, z] of [[0, 6, 16], [8, 18, 12]]) { this._w.set(x, y, z).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 40 * s, [1, 0.8, 0.55], 0.2); }
  }
}

// ---------- the place, per frame ----------
export class EstateWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = bathMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, BATH));
    const car = S.plan.car;
    if (car) {
      this.carGroup = new THREE.Group(); scene.add(this.carGroup);
      new GLTFLoader().loadAsync('assets/props/coupe.glb').then((g) => {
        const obj = g.scene;
        obj.traverse((o) => {
          if (!o.isMesh) return; o.frustumCulled = false;
          const n = (o.material && o.material.name) || '';
          if (n === 'Glass') o.material = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.8 });
          else o.material = o.material.clone();
          const m = o.material;
          if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(car.paint ?? 0xf2f0ea); m.metalness = 0.6; m.roughness = 0.2; m.emissive = new THREE.Color(car.paint ?? 0xf2f0ea); m.emissiveIntensity = 0.25; }
          if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 1.2; }
        });
        const bb = new THREE.Box3().setFromObject(obj), sz = new THREE.Vector3(); bb.getSize(sz);
        const k = (car.len ?? 26) / Math.max(sz.x, sz.z); obj.scale.setScalar(k); obj.position.y = -bb.min.y * k;
        this.carGroup.add(obj); this.car = obj; this._warm = 4;
      }).catch(() => {});
    }
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    if (this.carGroup) {
      const c = S.plan.car, show = t > c.t - 46 && t < c.t + 3, warm = (this._warm ?? 0) > 0; if (warm) this._warm--;
      this.carGroup.visible = show || warm;
      if (show || warm) { S.track.ground(c.t, c.x, this._g); this.carGroup.position.set(this._g.x, c.y ?? 1.6, this._g.z); this.carGroup.rotation.set(0, S.course.sample(c.t).yaw + (c.rot ?? 0.5), 0); }
    }
  }
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 2, g.z, 8, [1, 0.92, 0.8], 0.8); T.pool(g.x, fy + 0.08, g.z, 30, [1, 0.92, 0.85], 0.25); }
    }
  }
}
