// Your Wife, My Number: shared bits for the song's own modules (ywn-*.js, estate.js).
// Geometry helpers, the self-lit vertex-colour materials (one uniform lifts them all at night),
// and picture textures drawn on canvas. Everything here is made lazily: nothing touches the
// page at import.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const TAU = Math.PI * 2;
export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export function seeded(seed) { let s = Math.max(1, Math.floor(seed) % 2147483646); return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const ni = (g) => (g.index ? g.toNonIndexed() : g);
// merge pieces that may or may not carry uvs and colours
export function merge(gs) {
  gs = gs.map(ni);
  const hasUv = gs.every((g) => g.attributes.uv), hasCol = gs.every((g) => g.attributes.color);
  for (const g of gs) { if (!hasUv && g.attributes.uv) g.deleteAttribute('uv'); if (!hasCol && g.attributes.color) g.deleteAttribute('color'); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); }
  return mergeGeometries(gs, false);
}
export function paint(g, c, k = 1) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0] * k; a[i * 3 + 1] = c[1] * k; a[i * 3 + 2] = c[2] * k; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
// paint with a little shade from top to bottom (lighter up top), so plain shapes read
export function shade(g, c, lo = 0.8, hi = 1.05) {
  g.computeBoundingBox(); const b = g.boundingBox, y0 = b.min.y, y1 = Math.max(b.max.y, y0 + 1e-3);
  const p = g.attributes.position.array, n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const k = lo + (hi - lo) * (p[i * 3 + 1] - y0) / (y1 - y0); a[i * 3] = c[0] * k; a[i * 3 + 1] = c[1] * k; a[i * 3 + 2] = c[2] * k; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x = 0, y = 0, z = 0, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
export const torus = (R, r, a = 8, b = 24, arc = TAU) => new THREE.TorusGeometry(R, r, a, b, arc);
// a round bar from a to b
export function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
// a rounded rectangle shape centred on 0
export function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
// a box with rounded edges, centred on 0 (w across x, h up y, d along z)
export function rbox(w, h, d, r = 0.2, x = 0, y = 0, z = 0) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  // the inner outline, grown back out to w x h by the bevel
  const iw = Math.max(1e-3, w - 2 * r), ih = Math.max(1e-3, h - 2 * r);
  const g = new THREE.ExtrudeGeometry(roundRect(iw, ih, Math.min(iw, ih) * 0.2), { depth: Math.max(1e-3, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  g.computeVertexNormals(); g.translate(x, y, z);
  return g;
}
export function heartShape(k = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i) s.lineTo(x / 17 * k, y / 17 * k); else s.moveTo(x / 17 * k, y / 17 * k);
  }
  return s;
}

// ---------- materials ----------
// Every prop of the song is lit a little by itself, so it reads at dusk and in the storm.
// One uniform for all of them: the world raises it as the light goes.
export const SELF = { value: 0.25 };
// vertex-coloured standard material; opts: rough, metal, k (how much self light),
// tint (per-instance aTint), glow (per-instance aGlow: extra light in its own colour), flat, side
export function vcMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
  const k = (o.k ?? 1).toFixed(3), tint = !!o.tint, glow = !!o.glow;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uYwnSelf = SELF;
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    if (tint || glow) {
      vs = vs.replace('#include <common>', '#include <common>\n' + (tint ? 'attribute vec3 aTint; varying vec3 vTint;\n' : '') + (glow ? 'attribute float aGlow; varying float vGlow;\n' : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (tint ? 'vTint = aTint;\n' : '') + (glow ? 'vGlow = aGlow;\n' : ''));
    }
    fs = fs.replace('#include <common>', '#include <common>\nuniform float uYwnSelf;\n' + (tint ? 'varying vec3 vTint;\n' : '') + (glow ? 'varying float vGlow;\n' : ''));
    if (tint) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;');
    fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uYwnSelf * ' + k + (glow ? ' + diffuseColor.rgb * vGlow' : '') + ';');
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => 'ywnvc' + k + (tint ? 't' : '') + (glow ? 'g' : '') + (o.flat ? 'f' : '');
  return m;
}
// a lit picture (its own light, so it reads at any hour)
export function picMat(map, k = 0.6, o = {}) {
  return new THREE.MeshStandardMaterial({ map, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: o.side ?? THREE.DoubleSide, transparent: !!o.transparent, alphaTest: o.alphaTest ?? 0, depthWrite: o.depthWrite ?? true });
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// the yaw that faces the rider coming up the road, a little toward the road
export function faceYaw(S, it, turn = 0.55) { return S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -turn : turn); }
// turned to face the rider coming up the road, and a little toward the road
// (the yaw it used is left on S._ywnFy)
export function faceRoad(S, it, turn = 0.55, key = '_ywnFq') {
  const h = S.course.sample(it.t).yaw;
  S._ywnFy = h + Math.PI + (it.x > 0 ? -turn : turn);
  S._e.set(0, S._ywnFy, 0);
  return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e);
}
// a quaternion from a yaw and two tilts about the piece's own axes, kept on the scenery under a key
const EY = new THREE.Euler(0, 0, 0, 'YXZ');
export function quat(S, key, ry, rx = 0, rz = 0) { EY.set(rx, ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(EY); }
