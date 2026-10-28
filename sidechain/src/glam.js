// Overdose Aesthetic. Glamour and sirens: a red carpet at night between velvet ropes, cameras going
// off behind them and siren light sweeping over it all. Polish bottles in coordinated blue, perfume
// that breathes, a beautiful bomb, porcelain, a tiara for seventeen; the price tag, the gilded
// trinity, the heart, the counter from zero to infinity; a hall of mirrors; and at dawn, when the
// music's gone, the empty vanity with its bulbs still on.

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
function tintLit(k = 0.5, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb * diffuseColor.rgb;');
  };
  return m;
}
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.3, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, ...opts }));
const FONT = '"Arial Black", Impact, sans-serif';
const GOLD = rgb(0xe8c060), BRASS = rgb(0xc8a050), PINK = [1, 0.45, 0.75], WARM = [1, 0.85, 0.65], RED = [1, 0.12, 0.1], BLUE = [0.15, 0.35, 1];

// ---------- the pictures ----------
// blue-and-white china: scrolls and flowers round the vase
function chinaTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1e3a8a'; g.fillStyle = '#1e3a8a';
    for (const y of [40, 64, H - 64, H - 40]) { g.lineWidth = y === 40 || y === H - 40 ? 10 : 4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.lineWidth = 6;
    for (let k = 0; k < 8; k++) { const x0 = k * 128; g.beginPath(); for (let u = 0; u <= 1; u += 0.02) { const x = x0 + u * 128, y = 52 + Math.sin(u * Math.PI * 2) * 8; if (u === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    const R = seeded(9);
    for (let k = 0; k < 7; k++) {
      const cx = 70 + k * 146, cy = 250 + (k % 2 ? 40 : -30);
      g.beginPath(); g.moveTo(cx - 60, cy + 120); g.bezierCurveTo(cx - 20, cy + 40, cx + 30, cy + 60, cx, cy); g.stroke();
      for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 22, 12, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1e3a8a';
      for (let l = 0; l < 3; l++) { const lx = cx - 40 + R() * 30, ly = cy + 60 + R() * 40; g.beginPath(); g.ellipse(lx, ly, 18, 7, -0.6, 0, Math.PI * 2); g.fill(); }
    }
  });
}
// the price tag: a barcode and a number with too many zeros
function tagTexture() {
  return canvasTex(256, 512, (g, W, H) => {
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8d2c6'; g.beginPath(); g.arc(W / 2, 54, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1e'; const R = seeded(13); let x = 34; while (x < W - 34) { const w = 2 + Math.floor(R() * 6); if (R() > 0.35) g.fillRect(x, 300, w, 120); x += w + 2; }
    g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.fillText('$', W / 2, 190); g.font = `900 34px ${FONT}`; g.fillText('000,000', W / 2, 250);
  });
}
// the counter: numbers going by too fast to read, then the eight on its side
function counterTexture(inf) {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#08060c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff5aa8'; g.shadowColor = '#ff5aa8'; g.shadowBlur = 24; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (inf) { g.font = `900 230px ${FONT}`; g.fillText('∞', W / 2, H / 2 + 10); return; }
    g.font = `900 150px ${FONT}`;
    for (let k = 0; k < 7; k++) { const x = 90 + k * 140; for (let j = -1; j <= 1; j++) { g.globalAlpha = j ? 0.25 : 0.9; g.fillText(String((k * 3 + j + 10) % 10), x, H / 2 + j * 70); } }
    g.globalAlpha = 1;
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { china: chinaTexture(), tag: tagTexture(), spin: counterTexture(false), inf: counterTexture(true) });

// mist from the atomizers, glitter in it
function mistMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vK; float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 q = vUv - 0.5; float d = length(q); float a = smoothstep(0.5, 0.0, d) * vK; vec2 g = floor(vUv * 26.0); float sp = step(0.93, h2(g + floor(uTime * 6.0))) * smoothstep(0.45, 0.1, d);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.95) * a * 0.22 + vec3(1.0) * sp * vK * 0.8, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

// ---------- the glamour, enormous ----------
const OA = {
  // a bottle of polish: the glass, the colour in it, the tall black cap
  polish() { return paint(lathe([[0, 0], [7.6, 0], [8.4, 0.8], [8.6, 3], [8.6, 19], [8, 20.6], [3.4, 21.6], [3.2, 23], [0, 23]], 6).rotateY(Math.PI / 6), [1, 1, 1]); },
  polishCap() { return merge([paint(cyl(3.6, 3.6, 14, 24, 0, 30.2, 0), GOLD), paint(cyl(3.7, 3.7, 0.8, 24, 0, 23.2, 0), rgb(0x2a2a30))]); },
  // a perfume bottle: cut crystal, a gold collar, the atomizer bulb on its tube
  perfume() { return merge([paint(lathe([[0, 0.6], [9.2, 0.6], [9.2, 11], [0, 11]], 8), rgb(0xff6aa8)), paint(cyl(3.2, 3.2, 3, 16, 0, 19.4, 0), GOLD), paint(cyl(1.2, 1.2, 2, 10, 0, 21.8, 0), GOLD), paint(tube(V(0, 22.6), V(7, 24.6), 0.35), GOLD), paint(sph(2.6, 1, 1.25, 1, 9.6, 23.6, 0, 14, 10), rgb(0xc82a6a)), paint(cyl(0.8, 0.2, 3.4, 8, 9.6, 19.6, 0), rgb(0xe8c060))]); },
  // the beautiful bomb: a round crystal flacon, a gold neck, a corded tassel for a fuse
  bombGlass() { return sph(11, 1, 1, 1, 0, 11, 0, 32, 24); },
  bomb() { const parts = [paint(cyl(3, 3.6, 4, 20, 0, 23, 0), GOLD), paint(cyl(3.8, 3.8, 1.2, 20, 0, 25.4, 0), GOLD)]; let a = V(0, 26), k = 0; for (let i = 1; i <= 8; i++) { const b = V(Math.sin(i * 1.3) * 2 + i * 0.9, 26 + i * 1.6, Math.cos(i * 1.1) * 1.5); parts.push(paint(tube(a, b, 0.4), GOLD)); a = b; k++; } parts.push(paint(cyl(0.4, 2, 5, 12, a.x, a.y + 2.5, a.z), rgb(0xd82a6a))); return merge(parts); },
  bombLiquid() { return paint(sph(10.2, 1, 0.62, 1, 0, 6.6, 0, 28, 14), rgb(0xff5aa8)); },
  // a porcelain vase, painted blue on white
  vase() { const g = lathe([[0, 0], [7, 0], [8.5, 2], [11, 9], [11.4, 14], [9, 20], [5, 25], [4.4, 29], [6, 31], [6.2, 32], [0, 32]], 40); return g; },
  // the tiara on its cushion
  tiara() {
    const parts = [paint(box(26, 4, 16, 0, 2, 0), rgb(0x8a1a5a)), ...[[-13, -8], [13, -8], [-13, 8], [13, 8]].map(([x, z]) => paint(sph(1.2, 1, 1, 1, x, 4, z, 8, 6), GOLD))];
    const band = new THREE.TorusGeometry(10, 0.7, 8, 40, Math.PI); band.translate(0, 0, 0); band.rotateX(0); band.translate(0, 4.6, 0); parts.push(paint(band, rgb(0xd8dce4)));
    for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI, h = 3 + (k === 4 ? 6 : (k % 2 ? 2 : 4)); const x = Math.cos(a) * 10, y = 4.6 + Math.sin(a) * 10; parts.push(paint(new THREE.ConeGeometry(0.9, h, 6).translate(0, h / 2, 0).rotateZ(a - Math.PI / 2).translate(x, y, 0), rgb(0xd8dce4))); }
    for (const p of parts) p.translate(0, 16, 0);
    parts.push(paint(cyl(7, 8, 14, 32, 0, 7, 0), rgb(0xf0e8ec)), paint(cyl(9, 9, 2, 32, 0, 15, 0), rgb(0xf0e8ec)), paint(cyl(9.5, 9.5, 2, 32, 0, 1, 0), rgb(0xf0e8ec)));
    return merge(parts);
  },
  // the price tag on its string
  tag() { return merge([paint(box(10, 18, 0.4, 0, -12, 0), [1, 1, 1]), paint(box(0.12, 34, 0.12, 0, 14, 0), rgb(0xd8d2c6))]); },
  tagFace() { const g = new THREE.PlaneGeometry(9.6, 17.6); g.translate(0, -12, 0.22); return g; },
  // the trinity: three gilded arches, the middle one tallest
  triptych() {
    const parts = [];
    for (const [x, w, h] of [[-14, 9, 22], [0, 11, 28], [14, 9, 22]]) {
      parts.push(paint(box(w + 2.4, h, 1.6, x, h / 2, 0), GOLD));
      const arch = new THREE.CylinderGeometry(w / 2 + 1.2, w / 2 + 1.2, 1.6, 24, 1, false, -Math.PI / 2, Math.PI); arch.rotateX(-Math.PI / 2); arch.translate(x, h, 0); parts.push(paint(arch, GOLD));
    }
    parts.push(paint(box(44, 2.4, 6, 0, -1.2, 0), rgb(0x8a6a2a)));
    return merge(parts);
  },
  triptychGlow() {
    const parts = [];
    for (const [x, w, h] of [[-14, 9, 22], [0, 11, 28], [14, 9, 22]]) { parts.push(paint(box(w, h - 2, 0.3, x, h / 2, 0.9), rgb(0xffd890))); const a = new THREE.CircleGeometry(w / 2, 24, 0, Math.PI); a.translate(x, h - 1, 0.92); parts.push(paint(a, rgb(0xffd890))); }
    return merge(parts);
  },
  // the counter's case (the numbers are its face)
  counter() { return merge([paint(box(46, 13, 3, 0, 34, -1.6), rgb(0x1a1a20)), paint(box(47, 1, 3.4, 0, 40.8, -1.6), rgb(0xff5aa8)), paint(box(47, 1, 3.4, 0, 27.2, -1.6), rgb(0xff5aa8)), paint(box(1.2, 28, 1.2, -18, 14, -2), rgb(0x2a2a30)), paint(box(1.2, 28, 1.2, 18, 14, -2), rgb(0x2a2a30))]); },
  counterFace() { const g = new THREE.PlaneGeometry(44, 11); g.translate(0, 34, 0.02); return g; },
  // the heart
  heart() { const sh = new THREE.Shape(); sh.moveTo(0, -10); sh.bezierCurveTo(-4, -6, -14, 0, -12, 7); sh.bezierCurveTo(-10, 13, -2, 13, 0, 6.5); sh.bezierCurveTo(2, 13, 10, 13, 12, 7); sh.bezierCurveTo(14, 0, 4, -6, 0, -10); const g = new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.4, bevelSegments: 4, curveSegments: 24 }); g.translate(0, 0, -2); return paint(g, rgb(0xff4a8a)); },
  // brass posts with velvet rope slung between
  post() { return merge([paint(cyl(1.6, 2, 0.6, 18, 0, 0.3, 0), BRASS), paint(cyl(0.4, 0.4, 7, 10, 0, 3.8, 0), BRASS), paint(sph(0.75, 1, 1, 1, 0, 7.6, 0, 12, 8), BRASS)]); },
  rope() { const parts = []; let a = V(0, 6.8, 0); for (let i = 1; i <= 8; i++) { const u = i / 8, b = V(0, 6.8 - Math.sin(u * Math.PI) * 1.6, u * 10); parts.push(paint(tube(a, b, 0.32), rgb(0x9a0a1e))); a = b; } return merge(parts); },
  // a siren bar on a pole: the red half and the blue half
  sirenPole() { return merge([paint(cyl(0.5, 0.6, 22, 8, 0, 11, 0), rgb(0x2a2a30)), paint(box(9, 1, 2.4, 0, 22.2, 0), rgb(0x1a1a1e))]); },
  sirenLights() { return merge([paint(box(4, 1.4, 2, -2.2, 23.3, 0), rgb(0xff2a1a)), paint(box(4, 1.4, 2, 2.2, 23.3, 0), rgb(0x2a5aff))]); },
  // his lines on a marquee: black, bulbs all round
  signBoard() { const parts = [paint(box(25.8, 10.2, 1.4, 0, 0, -1.2), rgb(0x16101a)), paint(box(24.6, 9, 0.4, 0, 0, -0.5), rgb(0x0c0a10)), ...[-9, 9].map((x) => paint(box(0.18, 40, 0.18, x, 25.1, -1.2), rgb(0x3a3040)))]; for (let k = 0; k < 13; k++) for (const y of [-4.7, 4.7]) parts.push(paint(sph(0.42, 1, 1, 1, -12 + k * 2, y, -0.3, 8, 6), rgb(0xfff2d8))); for (let k = 0; k < 4; k++) for (const x of [-12.5, 12.5]) parts.push(paint(sph(0.42, 1, 1, 1, x, -3 + k * 2, -0.3, 8, 6), rgb(0xfff2d8))); return merge(parts); },
  // the vanity: the table, the drawers, the mirror ringed with bulbs, a stool, bottles on top
  vanity() {
    const parts = [paint(box(30, 1.4, 12, 0, 10, 0), rgb(0xf0e6ea)), paint(box(8, 9.4, 11, -11, 4.7, 0), rgb(0xe8dce2)), paint(box(8, 9.4, 11, 11, 4.7, 0), rgb(0xe8dce2))];
    for (const x of [-11, 11]) for (const y of [2.4, 5.4, 8.2]) { parts.push(paint(box(6.6, 2.2, 0.3, x, y, 5.6), rgb(0xf6eef2))); parts.push(paint(sph(0.4, 1, 1, 1, x, y, 5.9, 8, 6), GOLD)); }
    parts.push(paint(box(22, 20, 1, 0, 21.4, -5), rgb(0xf0e6ea)), paint(box(19, 17, 0.4, 0, 21.4, -4.4), rgb(0xb8c4d0)));
    parts.push(paint(cyl(3.6, 3.6, 7, 20, 0, 3.5, 9), rgb(0xf0e6ea)), paint(cyl(4, 4, 1.6, 20, 0, 7.6, 9), rgb(0xd86a9a)));
    for (const [x, h, c] of [[-8, 4, 0xff5aa8], [-5.6, 3, 0x2a5aff], [6, 5, 0xe8c060], [8.4, 2.6, 0xd82a3a]]) parts.push(paint(cyl(0.9, 1.1, h, 10, x, 10.7 + h / 2, 1), rgb(c)));
    return merge(parts);
  },
};
const glass = (M, key, col, op = 0.55) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ color: col, roughness: 0.04, metalness: 0.1, transparent: true, opacity: op, emissive: col, emissiveIntensity: 0.35, depthWrite: false }));

extend({
  layers: {
    oaPolish: (M) => [OA.polish(), M.oaPolishM || (M.oaPolishM = tintLit(0.75, { roughness: 0.05, metalness: 0.2 })), 40, { aTint: 3 }],
    oaPolishCap: (M) => [OA.polishCap(), VCm(M, 'oaPolishCapM', 0.4, { roughness: 0.2, metalness: 0.85 }), 40, {}],
    oaPerfume: (M) => [OA.perfume(), VCm(M, 'oaPerfumeM', 0.4, { roughness: 0.05, metalness: 0.3 }), 8, {}],
    oaPerfumeGlass: (M) => [lathe([[0, 0], [9, 0], [10, 1], [10, 15], [8.5, 17], [3, 18], [0, 18]], 8), glass(M, 'oaPerfumeGlassM', 0xffd0e4, 0.38), 8, {}],
    oaMist: (M) => [new THREE.PlaneGeometry(1, 1), M.oaMistM || (M.oaMistM = mistMaterial()), 60, { aK: 1 }],
    oaBomb: (M) => [OA.bomb(), VCm(M, 'oaBombM', 0.4, { roughness: 0.2, metalness: 0.8 }), 2, {}],
    oaBombGlass: (M) => [OA.bombGlass(), glass(M, 'oaBombGlassM', 0xffd8ec, 0.32), 2, {}],
    oaBombLiquid: (M) => [OA.bombLiquid(), VCm(M, 'oaBombLiquidM', 0.8, { roughness: 0.1 }), 2, {}],
    oaVase: (M) => [OA.vase(), M.oaVaseM || (M.oaVaseM = new THREE.MeshStandardMaterial({ map: tex().china, roughness: 0.12, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex().china, emissiveIntensity: 0.22 })), 12, {}],
    oaTiara: (M) => [OA.tiara(), VCm(M, 'oaTiaraM', 0.35, { roughness: 0.15, metalness: 0.8 }), 2, {}],
    oaTag: (M) => [OA.tag(), VCm(M, 'oaTagM', 0.4, { roughness: 0.8 }), 4, {}],
    oaTagFace: (M) => [OA.tagFace(), pic(M, 'oaTagFaceM', tex().tag, 0.55, { side: THREE.DoubleSide }), 4, {}],
    oaTriptych: (M) => [OA.triptych(), VCm(M, 'oaTriptychM', 0.35, { roughness: 0.2, metalness: 0.9 }), 2, {}],
    oaTriptychGlow: (M) => [OA.triptychGlow(), VCm(M, 'oaTriptychGlowM', 1.2, { roughness: 0.6 }), 2, {}],
    oaCounter: (M) => [OA.counter(), VCm(M, 'oaCounterM', 0.6, { roughness: 0.4 }), 2, {}],
    oaCounterSpin: (M) => [OA.counterFace(), M.oaCounterSpinM || (M.oaCounterSpinM = new THREE.MeshBasicMaterial({ map: tex().spin, color: new THREE.Color(1.4, 1.4, 1.4) })), 2, {}],
    oaCounterInf: (M) => [OA.counterFace(), M.oaCounterInfM || (M.oaCounterInfM = new THREE.MeshBasicMaterial({ map: tex().inf, color: new THREE.Color(1.5, 1.5, 1.5) })), 2, {}],
    oaHeart: (M) => [OA.heart(), VCm(M, 'oaHeartM', 0.6, { roughness: 0.2, metalness: 0.2 }), 2, {}],
    oaPost: (M) => [OA.post(), VCm(M, 'oaPostM', 0.3, { roughness: 0.25, metalness: 0.8 }), 160, {}],
    oaRope: (M) => [OA.rope(), VCm(M, 'oaRopeM', 0.25, { roughness: 0.9 }), 160, {}],
    oaSirenPole: (M) => [OA.sirenPole(), VCm(M, 'oaSirenPoleM', 0.1, { roughness: 0.5 }), 40, {}],
    oaSirenLights: (M) => [OA.sirenLights(), VCm(M, 'oaSirenLightsM', 1.0, { roughness: 0.3 }), 40, {}],
    oaVanity: (M) => [OA.vanity(), VCm(M, 'oaVanityM', 0.25, { roughness: 0.3 }), 1, {}],
    oaSignBoard: (M) => [OA.signBoard(), VCm(M, 'oaSignM', 0.5, { roughness: 0.4 }), 12, {}],
    oaSignFace: (M) => [signFace(23.4, 7.8, 0, 0, 0.05), M.sign, 12, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the set-pieces, each where he sings it
    oaProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['oaPolish', 'oaPolishCap', 'oaPerfume', 'oaPerfumeGlass', 'oaMist', 'oaBomb', 'oaBombGlass', 'oaBombLiquid', 'oaVase', 'oaTiara', 'oaTag', 'oaTagFace', 'oaTriptych', 'oaTriptychGlow', 'oaCounter', 'oaCounterSpin', 'oaCounterInf', 'oaHeart']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._oav || (S._oav = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.5, c = PINK, r = 40) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'polish') { put('oaPolish', 0, 0, 0, q, s, { aTint: it.tint || [0.2, 0.4, 1] }); put('oaPolishCap'); light(9, 30, it.tint || [0.3, 0.5, 1], 0.35, 4); spot(0.4, it.tint || [0.3, 0.5, 1]); }
      else if (k === 'perfume') {
        put('oaPerfume'); put('oaPerfumeGlass');
        // breathing: a puff from the bulb on the beat, glitter in the mist
        const ph = ((T - (it.puff ?? 0)) / (it.every ?? 0.8)) % 1, pk = Math.exp(-ph * 4);
        for (let j = 0; j < 4; j++) { const f = (ph + j * 0.12) % 1; const w = local(at, yaw, (-2 - f * 14) * s, (22 + f * 6) * s, (f * 6) * s, S._o); m.makeScale((3 + f * 10) * s, 1, 1); m.setPosition(w.x, w.y, w.z); L.oaMist.add(m, { aK: (1 - f) * 0.8 }); }
        light(10, 34, [1, 0.6, 0.85], 0.4 + 0.4 * pk, 0); spot(0.5);
      }
      else if (k === 'bomb') { put('oaBombLiquid'); put('oaBomb'); put('oaBombGlass'); light(11, 46, [1, 0.45, 0.75], 0.55, 0); light(38, 10, [1, 0.8, 0.9], 0.6 + 0.4 * Math.sin(T * 9), 0, 6); spot(0.6); }
      else if (k === 'vase') { put('oaVase'); light(18, 34, [0.8, 0.88, 1], 0.25, 2); spot(0.35, [0.7, 0.8, 1]); }
      else if (k === 'tiara') { put('oaTiara'); const R = seeded(3); for (let j = 0; j < 14; j++) { const a = R() * Math.PI, w = local(at, yaw, Math.cos(a) * 10 * s, (20.6 + Math.sin(a) * 10) * s, 0.8 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * s, [0.9, 0.95, 1], Math.max(0, Math.sin(T * 7 + j * 2.1)) * 1.6); } light(28, 40, [0.9, 0.85, 1], 0.45, 4); spot(0.5, [0.9, 0.85, 1]); }
      else if (k === 'tag') { const sw = Math.sin(T * 1.6 + it.t) * 0.3; put('oaTag', 0, 0, 0, quat('_oatq', sw)); put('oaTagFace', 0, 0, 0, quat('_oatq', sw)); light(-10, 30, WARM, 0.3, 4); }
      else if (k === 'triptych') { put('oaTriptych'); put('oaTriptychGlow'); light(16, 60, [1, 0.85, 0.5], 0.45, 4); spot(0.6, [1, 0.85, 0.5]); }
      else if (k === 'counter') { put('oaCounter'); if (T < (it.inf ?? 1e9)) put('oaCounterSpin'); else put('oaCounterInf'); light(34, 50, [1, 0.35, 0.65], T < (it.inf ?? 1e9) ? 0.35 : 0.8 * (1 + Math.exp(-(T - it.inf) * 3)), 2); }
      else if (k === 'heart') { const beat = 1 + 0.12 * Math.exp(-((T * 2.5) % 1) * 5); put('oaHeart', 0, 0, 0, q, s * beat); light(0, 46, [1, 0.3, 0.55], 0.6, 4); }
    },
    // velvet ropes along the carpet, posts and the rope slung between
    oaRopes(S, it, p, q, yaw) {
      const L = S.layers; void L.oaPost; void L.oaRope;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1.4, 1.4, 1.4)); L.oaPost.add(m); L.oaRope.add(m);
    },
    // a siren bar on a pole, red and blue turning
    oaSiren(S, it, p, q, yaw) {
      const L = S.layers; void L.oaSirenPole; void L.oaSirenLights;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.oaSirenPole.add(m); L.oaSirenLights.add(m);
      const on = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.3, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 2, T)); if (on <= 0) return;
      const ph = (T * 2.2 + it.seed) % 1, a = ph < 0.5 ? 1 : 0;
      for (const [x, c, k2] of [[-2.2, RED, a], [2.2, BLUE, 1 - a]]) { const w = local(p, yaw, x * s, 23.3 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 7 * s, c, (0.3 + 1.6 * k2) * on); }
      const w = local(p, yaw, 0, 0, 0, S._o); poolAt(S, w.x, 0.2, w.z, 60 * s, a ? RED : BLUE, 0.35 * on);
    },
    // cameras going off behind the ropes
    oaFlash(S, it, p, q, yaw) {
      if (!S.track) return;
      const T = S.tNow ?? 0, R = it.seed;
      for (let j = 0; j < 5; j++) {
        const rate = 1.3 + hash(R * 7 + j) * 2, ph = (T * rate + hash(R + j * 3.1)) % 1;
        if (ph > 0.12) continue;
        const w = local(p, yaw, (hash(R * 3 + j) - 0.5) * 10, 9 + hash(R * 5 + j) * 12, (hash(R * 9 + j) - 0.5) * 12, S._o);
        glowAt(S, w.x, w.y, w.z, 5 + hash(j + R) * 3, [1, 0.97, 0.94], 2.2 * (1 - ph / 0.12) * (it.k ?? 1));
      }
    },
    // his lines on the marquee, hung over the carpet
    oaSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._oasq || (S._oasq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.oaSignBoard.add(m); S.layers.oaSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      glowAt(S, p.x, p.y, p.z, 32 * s, [1, 0.85, 0.75], 0.16 + 0.04 * Math.sin(T * 14));
    },
  },
  kits: {
    oaProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, tint: c.tint, puff: c.puff, every: c.every, inf: c.inf, h: 0, parts: 'oaProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // a row of polish bottles, colours coordinated
    oaPolishRow(S, z, R) { const tints = z.tints || [[0.15, 0.3, 1], [0.3, 0.5, 1], [0.1, 0.2, 0.8]]; let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.1, x: side * ((z.x ?? 28) + R() * 6), rot: R() * 6.28, s: (z.s ?? 1) * (0.8 + R() * 0.4), kind: 'polish', tint: tints[k++ % tints.length], h: 0, parts: 'oaProp', ahead: 40 }); },
    oaVases(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.15, x: side * ((z.x ?? 28) + R() * 8), rot: R() * 6.28, s: (z.s ?? 1) * (0.75 + R() * 0.5), kind: 'vase', h: 0, parts: 'oaProp', ahead: 40 }); },
    oaPerfumes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 30) + R() * 4), rot: FACE(side), s: z.s ?? 1.2, kind: 'perfume', puff: z.puff ?? 0, every: z.beat ?? 0.8, h: 0, parts: 'oaProp', ahead: 40 }); },
    oaRopes(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.17) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 17), rot: 0, h: 0, parts: 'oaRopes', ahead: 26 }); },
    oaSirens(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 24) + R() * 4), rot: SIDE(side), s: z.s ?? 1, seed: R(), on: z.on, off: z.off, h: 0, parts: 'oaSiren', ahead: 40 }); },
    oaFlashes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.35) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 26) + R() * 10), rot: 0, seed: R(), k: z.k, h: 0, parts: 'oaFlash', ahead: 30 }); },
  },
});

// ---------- the hall of mirrors ----------
const ringHall = (W = 30, H = 34) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [W * 0.5, H + 6, 1, 3], [0, H + 8, 1, 3], [-W * 0.5, H + 6, 1, 3], [-W, H, 1, 3],
];
const HALL = {
  rings: { hall: ringHall },
  ringOf: () => 'hall',
  styles: { mirrors: 0 },
  dims: { mirrors: [30, 34] },
  lights: (id) => ({ 0: [22, 11] }[id] || null),
};
function hallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSiren: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uSiren; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float wa = part == 6 ? x : along;
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) { col = vec3(0.2, 0.08, 0.12); float pil = step(0.82, fract(x / 14.0)); col = mix(col, vec3(0.9, 0.75, 0.4), pil); glow += vec3(1.0, 0.75, 0.45) * pil * 0.2; float lit = step(0.2, fract(x / 14.0)) * step(fract(x / 14.0), 0.7) * step(6.0, h) * step(h, 20.0); glow += vec3(1.0, 0.6, 0.8) * lit * 0.5; }
        else if (part == 8) { col = vec3(0.9, 0.72, 0.36); glow += vec3(0.25, 0.18, 0.08); }
        else if (part == 0) { vec2 q = vec2(x, along) / 4.0; float ch = mod(floor(q.x) + floor(q.y), 2.0); col = mix(vec3(0.92, 0.9, 0.9), vec3(0.12, 0.1, 0.12), ch); float vein = smoothstep(0.03, 0.0, abs(sin(q.x * 3.0 + q.y * 2.0 + sin(q.y * 5.0)) * 0.1 - 0.02)); col = mix(col, vec3(0.6), vein * 0.3 * (1.0 - ch)); col *= 0.85 + 0.15 * edge(fract(q), 0.02); }
        else if (part == 3) { col = vec3(0.5, 0.2, 0.28); vec2 q = fract(vec2(x / 10.0, along / 10.0)); col *= 0.8 + 0.2 * edge(q, 0.1); col = mix(col, vec3(0.9, 0.72, 0.36), 1.0 - edge(q, 0.06)); glow += vec3(1.0, 0.8, 0.5) * (1.0 - edge(q, 0.06)) * 0.1; }
        else {
          // the walls: tall arched mirrors in gilt frames, pilasters between
          float per = 16.0, u = mod(wa, per), notCap = part == 6 ? 0.0 : 1.0;
          col = vec3(0.42, 0.12, 0.2);
          vec2 mq = vec2((u - 2.0) / 12.0, (h - 3.0) / 26.0);
          float inR = step(0.0, mq.x) * step(mq.x, 1.0) * step(0.0, mq.y) * step(mq.y, 1.0);
          float arch = step(length(vec2((mq.x - 0.5) * 2.0, max(0.0, (mq.y - 0.8) / 0.2))), 1.0);
          float mir = inR * arch * notCap;
          float frame = notCap * step(0.0, mq.x + 0.05) * step(mq.x, 1.05) * step(-0.03, mq.y) * step(mq.y, 1.04) * (1.0 - mir);
          vec3 mirror = mix(vec3(0.3, 0.26, 0.34), vec3(0.85, 0.78, 0.9), smoothstep(0.0, 1.0, fract(mq.y * 0.7 + mq.x * 0.3 - along * 0.002)));
          float streak = smoothstep(0.08, 0.0, abs(fract(mq.x * 0.6 - mq.y * 0.4 + uTime * 0.05) - 0.5));
          mirror += vec3(1.0) * streak * 0.25 + mix(vec3(1.0, 0.1, 0.1), vec3(0.1, 0.3, 1.0), step(0.5, fract(uTime * 2.2))) * uSiren * 0.6;
          col = mix(col, mirror, mir); glow += mirror * mir * 0.28;
          col = mix(col, vec3(0.9, 0.7, 0.32), clamp(frame, 0.0, 1.0)); glow += vec3(0.3, 0.2, 0.06) * frame;
          col = mix(col, vec3(0.92, 0.88, 0.8), step(h, 1.2));
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

// ---------- the end: the vanity at dawn, the chair empty, its bulbs still on ----------
export class VanityFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -36;
    this.group = new THREE.Group(); scene.add(this.group);
    const mesh = new THREE.Mesh(OA.vanity(), selfLit({ roughness: 0.3 }, 0.22)); this.group.add(mesh);
    this.group.scale.setScalar(cfg.s ?? 2.2);
    this.bulbs = []; for (let k = 0; k < 7; k++) { this.bulbs.push([-11 + k * 3.67, 31.6]); } for (let k = 1; k < 5; k++) for (const x of [-11, 11]) this.bulbs.push([x, 31.6 - k * 4]);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() {}
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 2.2;
    for (const [x, y] of this.bulbs) { this._w.set(x, y, -4.2).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 1.5 * s, [1, 0.92, 0.8], 1.3); }
    this._w.set(0, 21, -3).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 16 * s, [1, 0.9, 0.85], 0.25);
    this._w.set(0, 0, 4).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, 0.2, this._w.z, 30 * s, [1, 0.85, 0.8], 0.45);
  }
}

// ---------- the place, per frame ----------
export class GlamWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = hallMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HALL));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    const sr = S.plan.sirenHall; u.uSiren.value = sr ? smooth(sr[0], sr[0] + 0.5, t) * (1 - smooth(sr[1], sr[1] + 0.5, t)) : 0;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats; if (M.oaMistM) M.oaMistM.uniforms.uTime.value = time;
  }
  // the chandeliers down the hall
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H + 2, g.z, 12, [1, 0.88, 0.7], 0.9); for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; T.glow(g.x + Math.cos(a) * 4, fy + r.H - 0.5, g.z + Math.sin(a) * 4, 2.2, [1, 0.92, 0.8], 1.3); } T.pool(g.x, fy + 0.08, g.z, 34, [1, 0.88, 0.75], 0.3); }
    }
  }
}
