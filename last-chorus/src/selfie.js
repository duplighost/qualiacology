// So Pretty When You Cry at the Abortion Center. The performance, never the clinic: a selfie museum,
// room after themed room. The prom room in lace with its balloon arch and disco ball, the mascara,
// the phone with the bestie on it; the likes spawning; brunch; the ring lights ("watch me glow"); the
// pink hall with coupons coming down and a camera that won't stop clicking; a ball pit; the fashion
// medals; the lights going low, the hashtag, the tears; the infinity room; the filters; a halo. On
// "you're free" the walls come down and the balloons go up, and the set stays behind in the open.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
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
const FONT = '"Arial Black", Impact, sans-serif';
const PINK = [1, 0.45, 0.75], WHITE = rgb(0xf6f2f4), GOLD = rgb(0xe8c060), RING = [1, 0.96, 0.92];

// ---------- the pictures ----------
// a phone open on the chat: bubbles back and forth
function chatTexture() {
  return canvasTex(512, 1024, (g, W, H) => {
    g.fillStyle = '#fbf3f8'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2d6e6'; g.fillRect(0, 0, W, 110);
    g.fillStyle = '#e8a8c8'; g.beginPath(); g.arc(70, 56, 30, 0, Math.PI * 2); g.fill();
    const R = seeded(7);
    for (let k = 0; k < 8; k++) { const y = 150 + k * 104, me = k % 3 !== 1, w = 160 + R() * 180, x = me ? W - 36 - w : 36; g.fillStyle = me ? '#ff5aa8' : '#e4e0e8'; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, 70, 32) : g.rect(x, y, w, 70); g.fill(); g.fillStyle = me ? '#ffd8ec' : '#9a96a2'; for (let j = 0; j < 2; j++) g.fillRect(x + 24, y + 20 + j * 20, (w - 56) * (0.45 + R() * 0.55), 9); }
  });
}
// the coupon: a dashed border, a percent sign, a barcode
function couponTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#fff8e8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.setLineDash([18, 12]); g.strokeRect(12, 12, W - 24, H - 24); g.setLineDash([]);
    g.fillStyle = '#e83a6a'; g.font = `900 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('%', 150, H / 2 + 8);
    g.fillStyle = '#1a1a1e'; const R = seeded(17); let x = 280; while (x < W - 40) { const w = 2 + Math.floor(R() * 7); if (R() > 0.3) g.fillRect(x, 70, w, 120); x += w + 3; }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { chat: chatTexture(), coupon: couponTexture() });

// ---------- the sets, enormous ----------
const SP = {
  // a ring light on its stand
  ringStand() { return merge([paint(cyl(0.5, 0.5, 22, 8, 0, 11, 0), rgb(0x2a2a30)), ...[0, 2.1, 4.2].map((a) => paint(tube(V(0, 2.4), V(Math.cos(a) * 6, 0, Math.sin(a) * 6), 0.35), rgb(0x2a2a30))), paint(box(1.6, 3, 1.6, 0, 22.5, 0), rgb(0x2a2a30))]); },
  ring() { const g = new THREE.TorusGeometry(8, 0.9, 10, 48); g.translate(0, 30, 0); return paint(g, [1, 1, 1]); },
  // the balloon arch: pink, white, gold
  arch() {
    const parts = [], cols = [0xff7ab8, 0xfff2f6, 0xe8c060, 0xffb8d8], R = seeded(23);
    for (let k = 0; k <= 70; k++) { const a = k / 70 * Math.PI; for (let j = 0; j < 3; j++) { const r = 24 + (R() - 0.5) * 4, x = Math.cos(a) * r * 1.1, y = Math.sin(a) * r * 1.25; parts.push(paint(sph(2.4 + R() * 1.4, 1, 1.1, 1, x, y, (R() - 0.5) * 4, 10, 8), rgb(cols[(k + j) % cols.length]))); } }
    return merge(parts);
  },
  // the disco ball on its chain
  disco() { const g = new THREE.IcosahedronGeometry(7, 2); return merge([paint(g, rgb(0xd8dce4)), paint(box(0.3, 30, 0.3, 0, 22, 0), rgb(0x8a8a90))]); },
  // the mascara: the tube and the wand beside it
  mascara() { return merge([paint(cyl(4, 4, 30, 24, 0, 15, 0), rgb(0x1a1a1e)), paint(cyl(4.1, 4.1, 1.2, 24, 0, 30.5, 0), GOLD), paint(cyl(3.6, 3.6, 12, 24, 0, 37, 0), rgb(0xd83a7a)), paint(cyl(0.5, 0.5, 26, 8, 10, 16, 0).rotateZ(0).translate(0, 0, 0), rgb(0x2a2a30)), paint(cyl(2.2, 2.2, 9, 12, 10, 4.5, 0), rgb(0x0a0a0c))]); },
  bristles() { const parts = []; for (let k = 0; k < 40; k++) { const a = k * 2.4, y = 0.6 + (k / 40) * 8.2; parts.push(paint(box(0.25, 0.25, 2.2, 0, 0, 1.1).rotateY(a).translate(10, y, 0), rgb(0x0a0a0c))); } return merge(parts); },
  // a phone standing up, the chat on its face
  phone() { return merge([paint(box(14, 28, 1.6, 0, 14.6, -0.9), rgb(0xe8a8c8)), paint(box(10, 1.2, 4, 0, 0.6, -0.9), rgb(0xd898b8))]); },
  phoneFace() { const g = new THREE.PlaneGeometry(12.6, 25.2); g.translate(0, 14.8, 0.1); return g; },
  // a heart, the likes
  heart() { const sh = new THREE.Shape(); sh.moveTo(0, -1); sh.bezierCurveTo(-0.4, -0.6, -1.4, 0, -1.2, 0.7); sh.bezierCurveTo(-1, 1.3, -0.2, 1.3, 0, 0.65); sh.bezierCurveTo(0.2, 1.3, 1, 1.3, 1.2, 0.7); sh.bezierCurveTo(1.4, 0, 0.4, -0.6, 0, -1); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -0.15); return paint(g, rgb(0xff3a7a)); },
  // brunch: a marble table, mimosas, a stack of pancakes, croissants
  brunch() {
    const parts = [paint(cyl(14, 14, 1, 40, 0, 10, 0), rgb(0xf4f0ec)), paint(cyl(1.4, 2, 9.6, 12, 0, 4.8, 0), GOLD), paint(cyl(5, 5.6, 0.8, 24, 0, 0.4, 0), GOLD)];
    for (const [x, z] of [[-7, 3], [-4.4, 6.4], [7.6, 2]]) { parts.push(paint(cyl(1.4, 0.4, 5, 16, x, 15.6, z), rgb(0xf4a830)), paint(cyl(0.2, 0.2, 3.6, 8, x, 11.8, z), WHITE), paint(cyl(1.4, 1.4, 0.2, 16, x, 10.6, z), WHITE)); }
    for (let k = 0; k < 6; k++) parts.push(paint(cyl(4.4, 4.4, 1.1, 28, 2, 11.1 + k * 1.15, -4), rgb(0xd8a050)));
    parts.push(paint(cyl(4.6, 4.6, 0.4, 28, 2, 10.6, -4), WHITE), paint(cyl(4.2, 4.0, 0.5, 28, 2, 18, -4), rgb(0x8a4a10)), paint(box(1.6, 1.2, 1.6, 2, 18.8, -4), rgb(0xfff2c0)));
    for (const [x, z, r] of [[-3, -7, 0.4], [-8, -3, -0.8]]) { const c = new THREE.TorusGeometry(2, 1, 8, 12, Math.PI * 1.2); c.rotateX(Math.PI / 2); c.rotateY(r); c.translate(x, 11.2, z); parts.push(paint(c, rgb(0xd89040))); }
    return merge(parts);
  },
  // the coupon, its own card
  coupon() { const g = new THREE.PlaneGeometry(9, 4.5); return g; },
  // the camera that won't stop clicking
  camera() { return merge([paint(box(30, 20, 14, 0, 22, 0), rgb(0x1a1a1e)), paint(box(10, 6, 10, -6, 35, 0), rgb(0x1a1a1e)), paint(cyl(7, 7.4, 12, 32, 0, 0, 0).rotateX(Math.PI / 2).translate(2, 22, 13), rgb(0x2a2a30)), paint(cyl(5.4, 5.4, 0.6, 32, 0, 0, 0).rotateX(Math.PI / 2).translate(2, 22, 19.2), rgb(0x3a4a6a)), paint(new THREE.TorusGeometry(6.8, 0.5, 8, 40).translate(2, 22, 19.1), rgb(0xd8dce4)), paint(box(6, 3, 3, 8, 34, 0), rgb(0xd8d8e0)), paint(box(4, 2, 1, 8, 34, 1.6), rgb(0xfff8f0)), paint(cyl(2, 2, 2, 16, 10, 33, 0), rgb(0x8a8a90)), paint(box(1.6, 12, 1.6, 0, 6, 0), rgb(0x2a2a30)), ...[0, 2.1, 4.2].map((a) => paint(tube(V(0, 6), V(Math.cos(a) * 8, 0, Math.sin(a) * 8), 0.5), rgb(0x2a2a30)))]); },
  // a medal on its ribbon
  medal() { return merge([paint(box(2.4, 6, 0.2, -0.8, -3, 0).rotateZ(0.18), rgb(0xd82a3a)), paint(box(2.4, 6, 0.2, 0.8, -3, 0.05).rotateZ(-0.18), rgb(0x2a4ab8)), paint(cyl(2.6, 2.6, 0.5, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, -7.8, 0.1), GOLD), paint(cyl(1.6, 1.6, 0.56, 6, 0, 0, 0).rotateX(Math.PI / 2).translate(0, -7.8, 0.1), rgb(0xfff0a0))]); },
  string() { return paint(box(0.07, 1, 0.07, 0, -0.5, 0), rgb(0x3a3a40)); },
  // the hashtag in neon
  hash() { const parts = []; for (const x of [-4, 4]) parts.push(paint(box(1.6, 26, 1.2, x, 0, 0).rotateZ(-0.15), [1, 1, 1])); for (const y of [-5, 5]) parts.push(paint(box(24, 1.6, 1.2, 0, y, 0), [1, 1, 1])); return merge(parts); },
  // a crystal tear
  tear() { return paint(lathe([[0, -2], [1.2, -1.7], [1.7, -0.8], [1.6, 0.2], [1.0, 1.5], [0.4, 2.8], [0, 3.8]], 10), [0.85, 0.92, 1]); },
  // a filter: a big frame, tinted glass in it
  filterFrame() { return merge([paint(box(2, 44, 2, -24, 22, 0), WHITE), paint(box(2, 44, 2, 24, 22, 0), WHITE), paint(box(50, 2, 2, 0, 44, 0), WHITE)]); },
  filterGlass() { const g = new THREE.PlaneGeometry(46, 42); g.translate(0, 22, 0); return g; },
  // the halo
  halo() { const g = new THREE.TorusGeometry(22, 1.4, 12, 64); g.rotateX(Math.PI / 2 - 0.3); return paint(g, rgb(0xffe08a)); },
  // a balloon on its string
  balloon() { return merge([sph(2.6, 1, 1.18, 1, 0, 0, 0, 12, 10), cyl(0.3, 0.1, 0.5, 6, 0, -3.2, 0), box(0.05, 8, 0.05, 0, -7.4, 0)]); },
  // the marquee for his lines: a neon sign on clear acrylic, hung on wires
  signBoard() { return merge([paint(box(25.4, 9.8, 0.5, 0, 0, -0.6), rgb(0x2a1424)), ...[-9, 9].map((x) => paint(box(0.1, 40, 0.1, x, 25.1, -0.6), rgb(0x8a8a90)))]); },
  // the set, at the end: a velvet chair, a phone on a tripod
  chair() { return merge([paint(box(12, 3, 11, 0, 6.5, 0), rgb(0xd84a8a)), paint(box(12, 14, 3, 0, 14, -4.2), rgb(0xd84a8a)), paint(box(2.4, 6, 11, -7, 9.5, 0), rgb(0xc83a7a)), paint(box(2.4, 6, 11, 7, 9.5, 0), rgb(0xc83a7a)), ...[[-5, -4], [5, -4], [-5, 4], [5, 4]].map(([x, z]) => paint(cyl(0.4, 0.3, 5, 8, x, 2.5, z), GOLD))]); },
  tripod() { return merge([...[0, 2.1, 4.2].map((a) => paint(tube(V(0, 14), V(Math.cos(a) * 5, 0, Math.sin(a) * 5), 0.3), rgb(0x2a2a30))), paint(cyl(0.3, 0.3, 4, 8, 0, 16, 0), rgb(0x2a2a30)), paint(box(4.4, 8.4, 0.5, 0, 22, 0), rgb(0x1a1a1e)), paint(box(3.8, 7.6, 0.1, 0, 22, 0.3), rgb(0x3a2a40))]); },
};
const tintGlass = (M, key, col, op = 0.35) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));

extend({
  layers: {
    spRingStand: (M) => [SP.ringStand(), VCm(M, 'spRingStandM', 0.1, { roughness: 0.5 }), 40, {}],
    spRing: (M) => [SP.ring(), VCm(M, 'spRingM', 1.6, { roughness: 0.4 }), 40, {}],
    spArch: (M) => [SP.arch(), VCm(M, 'spArchM', 0.4, { roughness: 0.25, metalness: 0.1 }), 3, {}],
    spDisco: (M) => [SP.disco(), M.spDiscoM || (M.spDiscoM = selfLit({ roughness: 0.1, metalness: 0.9, flatShading: true }, 0.5)), 2, {}],
    spMascara: (M) => [SP.mascara(), VCm(M, 'spMascaraM', 0.35, { roughness: 0.25, metalness: 0.4 }), 2, {}],
    spBristles: (M) => [SP.bristles(), VCm(M, 'spBristlesM', 0.1, { roughness: 0.9 }), 2, {}],
    spPhone: (M) => [SP.phone(), VCm(M, 'spPhoneM', 0.3, { roughness: 0.3 }), 3, {}],
    spPhoneFace: (M) => [SP.phoneFace(), M.spPhoneFaceM || (M.spPhoneFaceM = new THREE.MeshBasicMaterial({ map: tex().chat, color: new THREE.Color(1.1, 1.1, 1.1) })), 3, {}],
    spHeart: (M) => [SP.heart(), VCm(M, 'spHeartM', 0.9, { roughness: 0.3 }), 120, {}],
    spBrunch: (M) => [SP.brunch(), VCm(M, 'spBrunchM', 0.3, { roughness: 0.4 }), 3, {}],
    spCoupon: (M) => [SP.coupon(), pic(M, 'spCouponM', tex().coupon, 0.55), 120, {}],
    spCamera: (M) => [SP.camera(), VCm(M, 'spCameraM', 0.25, { roughness: 0.4, metalness: 0.4 }), 2, {}],
    spMedal: (M) => [SP.medal(), VCm(M, 'spMedalM', 0.5, { roughness: 0.25, metalness: 0.7 }), 260, {}],
    spString: (M) => [SP.string(), VCm(M, 'spStringM', 0.1, { roughness: 0.9 }), 260, {}],
    spHash: (M) => [SP.hash(), VCm(M, 'spHashM', 2.2, { roughness: 0.4 }), 2, {}],
    spTear: (M) => [SP.tear(), M.spTearM || (M.spTearM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.75, emissive: 0xc8e0ff, emissiveIntensity: 0.6 })), 200, {}],
    spFilterFrame: (M) => [SP.filterFrame(), VCm(M, 'spFilterFrameM', 0.6, { roughness: 0.4 }), 6, {}],
    spFilterPink: (M) => [SP.filterGlass(), tintGlass(M, 'spFilterPinkM', 0xff5aa8), 2, {}],
    spFilterBlue: (M) => [SP.filterGlass(), tintGlass(M, 'spFilterBlueM', 0x4a8aff), 2, {}],
    spFilterAmber: (M) => [SP.filterGlass(), tintGlass(M, 'spFilterAmberM', 0xffb040), 2, {}],
    spHalo: (M) => [SP.halo(), VCm(M, 'spHaloM', 1.6, { roughness: 0.3, metalness: 0.5 }), 2, {}],
    spBalloon: (M) => [SP.balloon(), M.spBalloonM || (M.spBalloonM = (() => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.25 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint;'); }; return m; })()), 300, { aTint: 3 }],
    spChair: (M) => [SP.chair(), VCm(M, 'spChairM', 0.3, { roughness: 0.8 }), 1, {}],
    spSignBoard: (M) => [SP.signBoard(), VCm(M, 'spSignM', 0.3, { roughness: 0.3 }), 14, {}],
    spSignFace: (M) => [signFace(23.4, 7.8, 0, 0, 0.05), M.sign, 14, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the sets, each where he sings it
    spProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['spRingStand', 'spRing', 'spArch', 'spDisco', 'spMascara', 'spBristles', 'spPhone', 'spPhoneFace', 'spHeart', 'spBrunch', 'spCoupon', 'spCamera', 'spHash', 'spTear', 'spFilterFrame', 'spFilterPink', 'spFilterBlue', 'spFilterAmber', 'spHalo']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._spv || (S._spv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.5, c = PINK, r = 40) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'ring') {
        // a ring light: off until its moment, then on
        const on = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.12, T);
        put('spRingStand'); if (on > 0.02) put('spRing'); const R = 8 * s;
        for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; const w = local(at, yaw, Math.cos(a) * R, 30 * s + Math.sin(a) * R, 0.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.6 * s, RING, 1.2 * on); }
        light(30, 40, RING, 0.35 * on, 4); spot(0.5 * on, RING);
      }
      else if (k === 'arch') { put('spArch'); light(28, 60, PINK, 0.25, 0); }
      else if (k === 'disco') {
        S._e.set(0, yaw + T * 0.8, 0); const dq = (S._spdq || (S._spdq = new THREE.Quaternion())).setFromEuler(S._e); put('spDisco', 0, 0, 0, dq);
        const R = seeded(it.t * 10 | 0); for (let j = 0; j < 16; j++) { const a = R() * 6.28 + T * 0.8, b = (R() - 0.5) * 2.4; const w = local(at, yaw, Math.cos(a) * 7.2 * s, Math.sin(b) * 7 * s, Math.sin(a) * 7.2 * s, S._o); if (Math.sin(T * 9 + j * 1.7) > 0.6) glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.95, 1], 1.6); }
        for (let j = 0; j < 10; j++) { const a = j * 0.63 + T * 0.8; const w = local(at, yaw, Math.cos(a) * 30 * s, -12 * s, Math.sin(a) * 30 * s, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, [1, 0.8, 0.95], 0.5); }
      }
      else if (k === 'mascara') { put('spMascara'); put('spBristles'); light(20, 40, PINK, 0.3, 4); spot(0.45); }
      else if (k === 'phone') { put('spPhone'); put('spPhoneFace'); light(15, 34, [1, 0.8, 0.9], 0.3, 4); spot(0.45); }
      else if (k === 'likes') {
        // the likes spawning off the phone, hearts going up
        put('spPhone'); put('spPhoneFace');
        for (let j = 0; j < 28; j++) { const f = ((T * 0.5 + j / 28) % 1); const w = local(at, yaw, (Math.sin(j * 2.3) * 9 + Math.sin(T + j) * 2) * s, (24 + f * 30) * s, (2 + Math.cos(j * 1.7) * 4) * s, S._o); const sc = (1.6 + 1.6 * Math.sin(f * Math.PI)) * s; S._e.set(0, yaw + Math.sin(T * 2 + j) * 0.5, 0); const hq = (S._sphq || (S._sphq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, hq, S._s.set(sc, sc, sc)); L.spHeart.add(m); }
        light(20, 50, [1, 0.35, 0.6], 0.35, 4); spot(0.45);
      }
      else if (k === 'brunch') { put('spBrunch'); light(14, 36, [1, 0.85, 0.6], 0.35, 2); spot(0.5, [1, 0.9, 0.75]); }
      else if (k === 'camera') {
        put('spCamera');
        // the flash on every click
        let fl = 0; for (const c of it.clicks || []) if (T > c && T < c + 0.25) fl = Math.max(fl, 1 - (T - c) / 0.25);
        light(34, 30, [1, 1, 1], 0.4 + 3 * fl, 1.6, 8); if (fl > 0) spot(1.2 * fl, [1, 1, 1], 120);
      }
      else if (k === 'hash') { put('spHash'); light(0, 50, [1, 0.35, 0.7], 0.6 + 0.2 * Math.sin(T * 7), 2); }
      else if (k === 'halo') { const bob = Math.sin(T * 1.5) * 1.5; put('spHalo', 0, bob, 0, q); for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2; const w = local(at, yaw, Math.cos(a) * 22 * s, (bob + Math.sin(a) * 22 * Math.sin(0.3)) * s, Math.sin(a) * 22 * Math.cos(0.3) * s, S._o); glowAt(S, w.x, w.y, w.z, 4 * s, [1, 0.9, 0.55], 1.0); } light(0, 90, [1, 0.88, 0.5], 0.3, 0); }
      else if (k === 'filter') { put('spFilterFrame'); put(['spFilterPink', 'spFilterBlue', 'spFilterAmber'][it.tone ?? 0]); }
    },
    // coupons coming down, turning over
    spCoupons(S, it, p, q, yaw) {
      const L = S.layers; void L.spCoupon; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, top = (it.h ?? 0) + (it.top ?? 34);
      for (let j = 0; j < 30; j++) { const f = ((T * 0.18 + hash(j + it.seed) ) % 1); const w = local(p, yaw, (hash(j * 3.1 + it.seed) - 0.5) * 60, 0, (hash(j * 7.7) - 0.5) * 60, S._o); w.y = top - f * (top - (it.h ?? 0)); S._e.set(T * 1.3 + j, T * 0.9 + j * 2, T * 0.7); const cq = (S._spcq || (S._spcq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, cq, S._s.set(1.4, 1.4, 1.4)); L.spCoupon.add(m); }
    },
    // the fashion medals hung from the ceiling on strings, swinging
    spMedals(S, it, p, q, yaw) {
      const L = S.layers; void L.spMedal; void L.spString; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded((it.seed * 1000) | 0), top = (it.h ?? 0) + (it.top ?? 30);
      for (let j = 0; j < 32; j++) {
        const x = (R() - 0.5) * 2 * (it.hw ?? 26), z = (R() - 0.5) * 30, len = 2 + R() * 9, sw = Math.sin(T * (1.4 + R()) + j) * 0.2;
        if (Math.abs(x) < 7 && R() < 0.7) continue;
        const a = local(p, yaw, x, 0, z, S._o); a.y = top;
        S._e.set(sw, yaw + Math.sin(T * 0.7 + j) * 0.6, 0); const kq = (S._spmq || (S._spmq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(a, kq, S._s.set(1, len, 1)); L.spString.add(m);
        const b = S._spmb || (S._spmb = new THREE.Vector3()); b.set(0, -len, 0).applyQuaternion(kq).add(a);
        m.compose(b, kq, S._s.set(1.4, 1.4, 1.4)); L.spMedal.add(m);
        if (Math.sin(T * 4 + j * 1.9) > 0.9) glowAt(S, b.x, b.y - 11, b.z, 2.4, [1, 0.9, 0.5], 1.3);
      }
    },
    // crystal tears hung in the air
    spTears(S, it, p, q, yaw) {
      const L = S.layers; void L.spTear; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded((it.seed * 1000) | 0), base = it.h ?? 0;
      for (let j = 0; j < 24; j++) { const x = (R() - 0.5) * 70, z = (R() - 0.5) * 30; if (Math.abs(x) < 8) continue; const y = base + 14 + R() * 18 + Math.sin(T * 1.2 + j) * 0.8; const w = local(p, yaw, x, 0, z, S._o); w.y = y; m.compose(w, q, S._s.set(1.6, 1.6, 1.6)); L.spTear.add(m); if (Math.sin(T * 5 + j * 2.3) > 0.85) glowAt(S, w.x, w.y, w.z, 2.4, [0.85, 0.92, 1], 1.4); }
    },
    // the balloons let go: up into the open
    spBalloons(S, it, p, q, yaw) {
      const L = S.layers; void L.spBalloon; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded((it.seed * 1000) | 0), go = it.go ?? 0, cols = [[1, 0.48, 0.72], [1, 0.95, 0.97], [0.91, 0.75, 0.38], [1, 0.72, 0.85]];
      for (let j = 0; j < 36; j++) { const x = (R() - 0.5) * 90, z = (R() - 0.5) * 50, rise = Math.max(0, T - go - R() * 0.8), y = (it.h ?? 0) + 8 + R() * 10 + rise * rise * 2.5 + rise * 6; const w = local(p, yaw, x + Math.sin(T * 0.8 + j) * 2, 0, z, S._o); w.y = y; S._e.set(Math.sin(T + j) * 0.15, 0, Math.cos(T * 0.9 + j) * 0.15); const bq = (S._spbq || (S._spbq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, bq, S._s.set(1.4, 1.4, 1.4)); L.spBalloon.add(m, { aTint: cols[j % 4] }); }
    },
    // his lines in neon, hung over the road
    spSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._spsq || (S._spsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.spSignBoard.add(m); S.layers.spSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      glowAt(S, p.x, p.y, p.z, 34 * s, [1, 0.4, 0.75], 0.2 + 0.03 * Math.sin(T * 11));
    },
  },
  kits: {
    spProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, on: c.on, clicks: c.clicks, tone: c.tone, h: 0, parts: 'spProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // ring lights standing along both sides, coming on
    spRings(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.7) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * ((z.x ?? 24) + R() * 3), rot: FACE(side), s: z.s ?? 1, kind: 'ring', on: (z.on ?? -1e9) + (t - z.from) * (z.wave ?? 0), h: 0, parts: 'spProp', ahead: 40 })); },
    spCoupons(S, z, R) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, seed: R(), top: z.top, h: 0, parts: 'spCoupons', ahead: 30 })); },
    spMedals(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push(onFloor(S, { t, x: 0, rot: 0, seed: R(), hw: z.hw, top: z.top, h: 0, parts: 'spMedals', ahead: 30 })); },
    spTears(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push(onFloor(S, { t, x: 0, rot: 0, seed: R(), h: 0, parts: 'spTears', ahead: 30 })); },
    spBalloons(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push(onFloor(S, { t, x: 0, rot: 0, seed: R(), go: z.go, h: 0, parts: 'spBalloons', ahead: 40 })); },
    spFilters(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push(onFloor(S, { t, x: 0, rot: 0, s: z.s ?? 1, kind: 'filter', tone: k++ % 3, h: 0, parts: 'spProp', ahead: 40 })); },
  },
});

// ---------- the museum ----------
const ringRoom = (W = 34, H = 40) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const MUSEUM = {
  rings: { room: ringRoom },
  ringOf: () => 'room',
  styles: { lace: 0, mint: 1, neon: 2, pink: 3, gold: 4, white: 5, pit: 6 },
  dims: { lace: [34, 40], mint: [34, 40], neon: [34, 40], pink: [36, 44], gold: [34, 42], white: [36, 44], pit: [38, 42] },
  lights: (id) => (id === 2 ? null : [20, 10]),
};
function museumMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uLow: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLow; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float heartF(vec2 p){ p.y -= 0.25; float a = atan(p.x, p.y) / 3.14159; float r = length(p); float hh = abs(a); float d = (13.0 * hh - 22.0 * hh * hh + 10.0 * hh * hh * hh) / (6.0 - 5.0 * hh); return step(r, d * 0.4); }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float wa = part == 6 ? x : along;
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) {
          // the museum from outside: pink, a neon heart over the door, the name in lights
          col = vec3(0.95, 0.55, 0.72) * 0.55; float stripe = step(0.5, fract(x / 8.0)); col *= 0.9 + 0.1 * stripe;
          vec2 hp = vec2(x / 30.0, (h - 40.0) / 30.0); float hf = heartF(hp) - heartF(hp * 1.12);
          glow += vec3(1.0, 0.25, 0.6) * clamp(hf, 0.0, 1.0) * 1.6;
          float bulbs = step(abs(h - 30.0), 0.6) * step(0.6, fract(x / 2.0)); glow += vec3(1.0, 0.9, 0.8) * bulbs * 0.8;
        }
        else if (part == 8) { col = st == 2 ? vec3(0.1, 0.05, 0.12) : vec3(0.98, 0.95, 0.96); glow += st == 2 ? vec3(1.0, 0.2, 0.7) * 0.6 : vec3(0.05); }
        else if (part == 0) {
          vec2 q = vec2(x, along);
          if (st == 1) { vec2 t2 = q / 3.0; col = mix(vec3(0.95, 0.95, 0.92), vec3(0.4, 0.75, 0.62), mod(floor(t2.x) + floor(t2.y), 2.0)); }
          else if (st == 2) { col = vec3(0.05, 0.04, 0.07); vec2 g = fract(q / 4.0) - 0.5; glow += vec3(1.0, 0.4, 0.9) * smoothstep(0.08, 0.0, length(g)) * 0.9; }
          else if (st == 4) { col = vec3(0.1, 0.12, 0.3); col = mix(col, vec3(0.9, 0.72, 0.36), step(abs(abs(x) - 16.0), 0.6)); }
          else if (st == 6) { vec2 c = q / 3.4; vec2 id = floor(c); vec2 f = fract(c) - 0.5 + (vec2(h2(id), h2(id + 7.0)) - 0.5) * 0.3; float b = step(length(f), 0.46); float k = h2(id + 3.0); vec3 bc = k < 0.25 ? vec3(1.0, 0.35, 0.6) : k < 0.5 ? vec3(0.35, 0.75, 1.0) : k < 0.75 ? vec3(1.0, 0.85, 0.3) : vec3(0.95, 0.95, 1.0); col = mix(vec3(0.2), bc * (0.75 + 0.35 * (0.5 - f.y)), b); glow += bc * b * 0.12; }
          else if (st == 5) { col = vec3(0.94, 0.93, 0.95) * (0.92 + 0.08 * edge(fract(q / 6.0), 0.02)); }
          else { col = st == 0 ? vec3(0.95, 0.62, 0.76) : vec3(0.98, 0.55, 0.75); float sp = step(0.985, h2(floor(q * 2.0))); glow += vec3(1.0, 0.9, 1.0) * sp * 0.5; }
        }
        else if (part == 3) {
          col = st == 2 ? vec3(0.04, 0.03, 0.06) : vec3(0.98, 0.96, 0.97);
          if (st == 2) { vec2 g = fract(vec2(x, along) / 5.0) - 0.5; glow += vec3(1.0, 0.85, 1.0) * smoothstep(0.1, 0.0, length(g)) * 1.2; }
        }
        else {
          // the walls, each room its own
          float notCap = part == 6 ? 0.0 : 1.0;
          vec2 q = vec2(wa, h);
          if (st == 0) {
            // lace on pink: a doily repeat, scalloped
            col = vec3(0.96, 0.6, 0.74); vec2 c = fract(q / 7.0) - 0.5; float r = length(c), ang = atan(c.y, c.x);
            float lace = step(r, 0.42) * step(0.5, fract(r * 9.0 + 0.5 * sin(ang * 8.0))) + step(abs(r - 0.46), 0.03) * step(0.5, fract(ang * 6.0));
            col = mix(col, vec3(1.0, 0.97, 0.98), clamp(lace, 0.0, 1.0) * 0.85);
          }
          else if (st == 1) { vec2 t2 = vec2(q.x / 2.0 + 0.5 * mod(floor(q.y / 1.2), 2.0), q.y / 1.2); col = mix(vec3(0.58, 0.86, 0.74), vec3(0.98, 0.98, 0.95), step(h, 10.0)); col *= 0.9 + 0.1 * edge(fract(t2), 0.07); }
          else if (st == 2) { col = vec3(0.07, 0.04, 0.1); vec2 g = fract(q / 5.0) - 0.5; glow += vec3(1.0, 0.6, 1.0) * smoothstep(0.09, 0.0, length(g)) * 1.1; glow += vec3(0.4, 0.2, 1.0) * step(abs(h - 2.0), 0.35) * notCap * 1.4; }
          else if (st == 3) { col = vec3(1.0, 0.56, 0.76); vec2 c = fract(q / 10.0) - 0.5; float hf = heartF(c * 1.4); col = mix(col, vec3(1.0, 0.82, 0.9), hf); glow += vec3(1.0, 0.6, 0.8) * hf * 0.1; }
          else if (st == 4) { col = vec3(0.12, 0.14, 0.34); float pin = step(0.88, fract(q.x / 12.0)); col = mix(col, vec3(0.9, 0.72, 0.36), pin); glow += vec3(0.35, 0.25, 0.08) * pin; col = mix(col, vec3(0.9, 0.72, 0.36), step(abs(h - 30.0), 0.5)); }
          else if (st == 6) { col = vec3(1.0, 0.86, 0.36); vec2 c = fract(q / 5.0) - 0.5; col = mix(col, vec3(1.0, 1.0, 0.95), step(length(c), 0.18)); }
          else { col = vec3(0.86, 0.8, 0.95); vec2 fr = vec2(mod(q.x, 24.0), q.y); float frame = notCap * step(4.0, fr.x) * step(fr.x, 20.0) * step(10.0, fr.y) * step(fr.y, 26.0); float inner = notCap * step(5.0, fr.x) * step(fr.x, 19.0) * step(11.0, fr.y) * step(fr.y, 25.0); float id = h2(vec2(floor(q.x / 24.0), 4.0)); vec3 art = mix(vec3(1.0, 0.3, 0.6), vec3(0.3, 0.55, 1.0), id) * (0.8 + 0.3 * sin(q.x * 0.9 + q.y * 0.6)); col = mix(col, vec3(0.9, 0.72, 0.36), frame); col = mix(col, art, inner); glow += art * inner * 0.25; }
          col = mix(col, vec3(0.98, 0.96, 0.97), step(h, 0.8) * notCap);
        }
        col *= uLight * (1.0 - 0.75 * uLow);
        col += glow * (1.0 - 0.6 * uLow);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the set left standing in the open, the chair empty ----------
export class SetFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -40;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.4 }, 0.25);
    const add = (geo, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(SP.chair(), 0, 0, 0); add(SP.tripod(), -15, 0, 14, Math.PI - 0.7); add(SP.ringStand(), 17, 0, -2, -0.35);
    const ring = new THREE.Mesh(SP.ring(), selfLit({ roughness: 0.4 }, 1.4)); ring.position.set(17, 0, -2); ring.rotation.y = -0.35; this.group.add(ring);
    const arch = new THREE.Mesh(SP.arch(), selfLit({ roughness: 0.25 }, 0.4)); arch.scale.setScalar(0.62); arch.position.set(0, 0, -8); this.group.add(arch);
    this.group.scale.setScalar(cfg.s ?? 1.8);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() {}
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.8;
    for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; this._w.set(17 + Math.cos(a) * 8 * Math.cos(0.35), 30 + Math.sin(a) * 8, -1.4 + Math.cos(a) * 8 * Math.sin(0.35)).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 2.6 * s, RING, 1.1); }
    this._w.set(0, 0, 6).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, 0.2, this._w.z, 30 * s, [1, 0.85, 0.9], 0.5);
  }
}

// ---------- the place, per frame ----------
export class SelfieWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = museumMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, MUSEUM));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    const lo = S.plan.lightsLow; u.uLow.value = lo ? smooth(lo[0], lo[0] + 0.6, t) * (1 - smooth(lo[1], lo[1] + 0.8, t)) : 0;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
  }
  // the track lights in the ceilings
  draw(T) {
    const g = this._g, low = this.mat.uniforms.uLow.value;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); for (const x of [-14, 14]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1, g.z, 4, [1, 0.95, 0.95], 0.9 * (1 - 0.8 * low)); } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 30, [1, 0.9, 0.95], 0.25 * (1 - 0.8 * low)); }
    }
  }
}
