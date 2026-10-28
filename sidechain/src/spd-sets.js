// Spiked: the set-pieces, each on its line. Outside: neon on the fronts, searchlights off the
// roof. The lounge: the balcony where someone watches her, the follow spot that finds her, the
// champagne popping ("gonna dirty you up"), the tall drink and the little white pill. The floor:
// the neon lips (STOP), the throne and its crown taken, the speaker walls, the rain of tears,
// the CO2 on the bar, the rig that drops with the kick, the DJ over the far door. The red room:
// the tower of glasses and the poison flowing, the exit chained shut. The corridors: phones out
// of the walls recording, the upload, the photographs going to dust, FRIENDS, FAMILY, BOSSES,
// the ropes across the way that snap as she crosses, the bed and the alarm clock. Then the pills
// in the void, the pit for lost time, and what the house lights show: the ball down, the glass.
// Every name here starts with spd.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';
import { spdTexture, cellPlane } from './spd-tex.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const ALONG = (x) => (x > 0 ? 0 : Math.PI);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
// a chain of tubes through points
const path = (pts, r, n = 6) => pts.slice(1).map((p, i) => tube(pts[i], p, r, n));
const onFloor = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x) + (it.dy || 0); return it; };
const touch = (S, ...names) => { for (const n of names) void S.layers[n]; };
const elastic = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * 2.0944));

// ---------- materials ----------
// the club's fog for the unlit things, set each frame by the club
export const SPD_FOG = { uFog: { value: new THREE.Color(0x120a20) }, uFogD: { value: 0.0028 }, uTime: { value: 0 } };
// props lit a little by themselves, so dark things in a dark club still read
function selfLit(M, key, k, opts = {}) {
  if (M[key]) return M[key];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(3) + ';'); };
  m.customProgramCacheKey = () => 'spdSelf' + k.toFixed(3) + (opts.transparent ? 't' : '') + (opts.flatShading ? 'f' : '');
  return (M[key] = m);
}
// the same, the colour times a per-instance tint
function tintLit(M, key, k, opts = {}) {
  if (M[key]) return M[key];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(3) + ';');
  };
  m.customProgramCacheKey = () => 'spdTint' + k.toFixed(3) + (opts.transparent ? 't' : '');
  return (M[key] = m);
}
// light itself: the colour is the instance's tint (neon, screens, LEDs), fogged
function neonMat(M, key, add = false) {
  return M[key] || (M[key] = new THREE.ShaderMaterial({
    uniforms: { uFog: SPD_FOG.uFog, uFogD: SPD_FOG.uFogD },
    vertexShader: 'attribute vec3 aTint; varying vec3 vC; varying float vD; void main(){ vC = aTint; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uFog; uniform float uFogD; varying vec3 vC; varying float vD; void main(){ float f = 1.0 - exp(-pow(vD * uFogD * 0.75, 1.5)); gl_FragColor = vec4(mix(vC, uFog * (1.0 - ' + (add ? '1.0' : '0.0') + '), clamp(f, 0.0, 1.0)), 1.0); }',
    ...(add ? { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false } : {}),
  }));
}
// the pictures: lit by themselves (screens, cards, photographs), cut out where the sheet is clear
function picMat(M, key, k = 1.25) {
  return M[key] || (M[key] = new THREE.MeshBasicMaterial({ map: spdTexture(), color: new THREE.Color(1, 1, 1).multiplyScalar(k), alphaTest: 0.45, side: THREE.DoubleSide }));
}
// shafts of light: bright at the lamp, gone by the far end; fading as they turn toward you
const BEAM_VS = 'attribute float aK; attribute vec3 aCol; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA; void main(){ vL = uv.y; vK = aK; vC = aCol; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vA = normalize(normalMatrix * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0)); gl_Position = projectionMatrix * mv; }';
const BEAM_FS = 'varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA; void main(){ if (vK <= 0.0) discard; vec3 V = normalize(vV); float f = abs(dot(normalize(vN), V)); float end = 1.0 - smoothstep(0.55, 0.95, abs(dot(normalize(vA), V))); float a = pow(f, 2.0) * pow(max(1.0 - vL, 0.0), 1.1) * smoothstep(0.0, 0.06, vL) * vK * end; a = (a == a) ? clamp(a, 0.0, 4.0) : 0.0; gl_FragColor = vec4(vC * a, 1.0); }';
function beamMat(M) { return M.spdBeamM || (M.spdBeamM = new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide })); }
function beamGeo(r0, r1) { const g = new THREE.CylinderGeometry(r1, r0, 1, 16, 1, true); g.translate(0, 0.5, 0); return g; }
// the CO2: white plumes, soft at the edges, pushed up out of the floor
const PLUME_VS = 'attribute float aK; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vL = uv.y; vUv = uv; vK = aK; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * mv; }';
const PLUME_FS = 'uniform float uTime; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } float n(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); } void main(){ if (vK <= 0.0) discard; float f = abs(dot(normalize(vN), normalize(vV))); float puff = 0.55 + 0.45 * n(vec2(vUv.x * 6.0, vL * 5.0 - uTime * 3.0)); float a = pow(f, 1.4) * pow(max(1.0 - vL, 0.0), 0.8) * smoothstep(0.0, 0.05, vL) * puff * vK; gl_FragColor = vec4(vec3(0.95, 0.96, 1.0) * 1.3, clamp(a, 0.0, 0.85)); }';
function plumeMat(M) { return M.spdPlumeM || (M.spdPlumeM = new THREE.ShaderMaterial({ uniforms: { uTime: SPD_FOG.uTime }, vertexShader: PLUME_VS, fragmentShader: PLUME_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide })); }

// ---------- shapes ----------
const G = {
  // a balcony along the wall: the slab, a brass rail, the posts
  balcony() {
    const parts = [], brass = rgb(0xd8b060);
    parts.push(paint(box(16, 1.4, 34, 0, 0, 0), rgb(0x1a1220)));
    parts.push(paint(box(16.4, 0.5, 34.4, 0, -0.9, 0), rgb(0xff4fd8)));
    for (const z of [-17, 17]) parts.push(paint(box(0.4, 4, 0.4, 8, 2.7, z), brass));
    parts.push(paint(cyl(0.25, 0.25, 34, 8, 0, 0, 0).rotateX(Math.PI / 2).translate(8, 4.6, 0), brass));
    for (let k = 0; k < 9; k++) parts.push(paint(box(0.18, 4, 0.18, 8, 2.7, -16 + k * 4), brass));
    return merge(parts);
  },
  // a champagne bottle, big, its foil and label (neck along +y)
  bottle() {
    const pts = [[0, 0], [2.3, 0], [2.4, 0.4], [2.4, 7.5], [2.1, 9.2], [1.1, 11], [0.9, 13.2], [1.0, 14.2], [0, 14.2]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(pts, 24); body.computeVertexNormals();
    const foil = new THREE.CylinderGeometry(1.05, 1.15, 2.8, 20, 1, true); foil.translate(0, 12.9, 0);
    const label = new THREE.CylinderGeometry(2.43, 2.43, 3.4, 24, 1, true, -0.9, 1.8); label.translate(0, 4.6, 0);
    return merge([paint(body, rgb(0x14321e)), paint(foil, rgb(0xe8c060)), paint(label, rgb(0xf4ecd8))]);
  },
  cork() { return merge([paint(cyl(0.85, 0.95, 1.6, 14, 0, 0, 0), rgb(0xc8a070)), paint(cyl(1.15, 1.15, 0.5, 14, 0, 0.9, 0), rgb(0xd8c0a0))]); },
  blob() { return paint(new THREE.IcosahedronGeometry(1, 1), [1, 1, 1]); },
  // the tall glass: open, its base, the ice, a lime on the rim, a straw
  glass() {
    const parts = [];
    const g = new THREE.CylinderGeometry(4.6, 4.0, 16, 32, 1, true); g.translate(0, 8, 0); parts.push(paint(g, rgb(0xe8f0ff)));
    parts.push(paint(cyl(4.0, 4.0, 1.2, 32, 0, 0.6, 0), rgb(0xd8e4f4)));
    const R = seeded(31);
    for (let k = 0; k < 6; k++) { const b = box(2.6, 2.6, 2.6, (R() - 0.5) * 3.6, 9 + k * 0.85 + R(), (R() - 0.5) * 3.6); b.rotateY(R()); parts.push(paint(b, rgb(0xf4faff))); }
    const lime = new THREE.CylinderGeometry(2.6, 2.6, 0.7, 20, 1, false, 0, Math.PI); lime.rotateZ(Math.PI / 2); lime.rotateY(0.3); lime.translate(3.4, 16.4, 2.2); parts.push(paint(lime, rgb(0x8ad84a)));
    const st = cyl(0.35, 0.35, 17, 8, 0, 0, 0); st.rotateZ(0.3); st.translate(-1.8, 14.5, -0.6); parts.push(paint(st, rgb(0xff5fb0)));
    return merge(parts);
  },
  liquid() { return paint(cyl(4.3, 3.9, 12.6, 32, 0, 7.6, 0), [1, 1, 1]); },
  // a pill: a white tablet, scored across
  pill() { const g = new THREE.CylinderGeometry(1, 1, 0.42, 24, 1); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const r = Math.hypot(p[i], p[i + 2]); p[i + 1] *= 1 - 0.35 * r * r; } g.computeVertexNormals(); return merge([paint(g, rgb(0xffffff)), paint(box(1.9, 0.06, 0.14, 0, 0.2, 0), rgb(0xc8c8d0))]); },
  bubble() { return new THREE.SphereGeometry(0.3, 8, 6); },
  // neon lips, about 24 metres across: the outline, the line between, the fill (its own layer)
  lipsTube() {
    const top = [], bot = [], mid = [];
    for (let i = 0; i <= 28; i++) {
      const u = i / 28, x = -12 + 24 * u, ax = Math.abs(x) / 12;
      const bow = 4.2 * Math.pow(1 - ax, 0.6) - 1.4 * Math.exp(-x * x / 3) + 0.2;
      top.push(V(x, bow + 0.2 * (1 - ax)));
      bot.push(V(x, -4.6 * Math.pow(1 - ax, 0.75) - 0.2));
      mid.push(V(x * 0.94, 0.35 * Math.sin(u * Math.PI * 2) * (1 - ax) - 0.1));
    }
    return merge([...path(top, 0.36), ...path(bot, 0.36), ...path(mid, 0.26)]);
  },
  lipsFill() {
    const s = new THREE.Shape();
    for (let i = 0; i <= 28; i++) { const u = i / 28, x = -12 + 24 * u, ax = Math.abs(x) / 12; const y = 4.2 * Math.pow(1 - ax, 0.6) - 1.4 * Math.exp(-x * x / 3) + 0.2; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    for (let i = 28; i >= 0; i--) { const u = i / 28, x = -12 + 24 * u, ax = Math.abs(x) / 12; s.lineTo(x, -4.6 * Math.pow(1 - ax, 0.75) - 0.2); }
    const g = new THREE.ShapeGeometry(s, 4); g.translate(0, 0, -0.3); return g;
  },
  // a throne on its dais: velvet, a gold frame, the crest
  throne() {
    const parts = [], gold = rgb(0xe0b048), red = rgb(0xa0102a), dark = rgb(0x5a0816);
    for (let k = 0; k < 3; k++) parts.push(paint(box(24 - k * 3, 1.2, 20 - k * 3, 0, 0.6 + k * 1.2, 0), k % 2 ? rgb(0x3a0a14) : rgb(0x6a1020)));
    const y0 = 3.6;
    parts.push(paint(box(13, 4, 10, 0, y0 + 2, 0), dark));
    parts.push(paint(sph(1, 6.2, 1.4, 4.8, 0, y0 + 4.4, 0.4, 16, 8), red));
    for (const s of [-1, 1]) { parts.push(paint(box(1.8, 5, 9, s * 6.6, y0 + 5.5, 0), dark)); parts.push(paint(sph(1, 1.2, 0.9, 4.8, s * 6.6, y0 + 8.1, 0, 10, 6), gold)); }
    parts.push(paint(box(12, 18, 1.6, 0, y0 + 13, -4.4), red));
    for (const [w, h, x, y] of [[13.6, 1.2, 0, y0 + 22.3], [1.2, 18, -6.4, y0 + 13], [1.2, 18, 6.4, y0 + 13]]) parts.push(paint(box(w, h, 2, x, y, -4.4), gold));
    for (let k = -2; k <= 2; k++) parts.push(paint(new THREE.ConeGeometry(0.9, 3.2 - Math.abs(k) * 0.6, 8).translate(k * 2.8, y0 + 24.5 - Math.abs(k) * 0.3, -4.4), gold));
    parts.push(paint(sph(1.4, 1, 1, 0.6, 0, y0 + 26.5, -4.4, 12, 8), gold));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) parts.push(paint(sph(0.35, 1, 1, 0.5, -3.6 + c * 3.6, y0 + 7 + r * 3.6, -3.55, 6, 4), gold));
    return merge(parts);
  },
  crown() {
    const parts = [], gold = rgb(0xffcc50);
    parts.push(paint(new THREE.CylinderGeometry(2.6, 2.4, 1.6, 24, 1, true), gold));
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; parts.push(paint(new THREE.ConeGeometry(0.55, 2.4, 6).translate(Math.cos(a) * 2.5, 2.0, Math.sin(a) * 2.5), gold)); parts.push(paint(sph(0.32, 1, 1, 1, Math.cos(a) * 2.5, 3.3, Math.sin(a) * 2.5, 6, 4), rgb(0xfff0c0))); parts.push(paint(sph(0.4, 1, 1, 0.6, Math.cos(a + 0.4) * 2.62, 0, Math.sin(a + 0.4) * 2.62, 6, 4).rotateY(0), k % 2 ? rgb(0xd0103a) : rgb(0x2a60ff))); }
    return merge(parts);
  },
  // the champagne tower: the table, five tiers of coupes (the liquid in each is its own instance)
  towerTable() { return merge([paint(box(18, 9, 18, 0, 4.5, 0), rgb(0x1a0a10)), paint(box(18.6, 0.5, 18.6, 0, 9.2, 0), rgb(0xd8b060))]); },
  coupes() {
    const parts = [], c = 1.9;
    for (const [x, y, z] of towerSpots()) {
      parts.push(paint(new THREE.CylinderGeometry(0.66 * c, 0.12 * c, 0.42 * c, 14, 1, true).translate(x, y + 1.08 * c, z), rgb(0xe8eef4)));
      parts.push(paint(cyl(0.05 * c, 0.05 * c, 0.86 * c, 5, x, y + 0.45 * c, z), rgb(0xe8eef4)));
      parts.push(paint(cyl(0.36 * c, 0.38 * c, 0.04, 10, x, y + 0.02, z), rgb(0xe8eef4)));
    }
    return merge(parts);
  },
  fill() { return cyl(1.2, 0.9, 0.5, 14, 0, 0, 0); },
  stream() { return cyl(0.32, 0.32, 1, 8, 0, 0.5, 0); },
  // the door out, chained: its frame, the panels, the chain in an X, the lock
  chainDoor() {
    const parts = [], frame = rgb(0x3a3a42), door = rgb(0x1e1a22), steel = rgb(0xb8bcc8);
    for (const [w, h, x, y] of [[1.4, 26, -8.6, 13], [1.4, 26, 8.6, 13], [18.6, 1.4, 0, 26.2]]) parts.push(paint(box(w, h, 1.6, x, y, 0), frame));
    for (const s of [-1, 1]) { parts.push(paint(box(7.8, 25, 0.8, s * 3.95, 12.5, -0.2), door)); parts.push(paint(box(0.4, 1.2, 4, s * 0.9, 11, 0.6), steel)); parts.push(paint(box(5.6, 0.6, 0.6, s * 3.6, 10.6, 0.5), steel)); }
    for (const [a, b] of [[V(-8, 21, 0.9), V(8, 3, 0.9)], [V(8, 21, 1.0), V(-8, 3, 1.0)]]) {
      const d = new THREE.Vector3().subVectors(b, a), L = d.length(), n = Math.floor(L / 1.1);
      for (let k = 0; k < n; k++) { const p = a.clone().addScaledVector(d, (k + 0.5) / n); const l = new THREE.TorusGeometry(0.55, 0.16, 6, 10); l.rotateZ(Math.atan2(d.y, d.x)); if (k % 2) l.rotateX(Math.PI / 2); l.translate(p.x, p.y, p.z); parts.push(paint(l, steel)); }
    }
    parts.push(paint(box(2.6, 2.8, 1.2, 0, 11.4, 1.5), rgb(0xd8b048)));
    const sh = new THREE.TorusGeometry(0.9, 0.24, 6, 14, Math.PI); sh.translate(0, 12.8, 1.5); parts.push(paint(sh, steel));
    return merge(parts);
  },
  // a hand out of the wall with a phone up, its back (and camera) to the road (out along +z)
  phoneArm() {
    const parts = [], sleeve = rgb(0x2a2432), skin = rgb(0xc89a84);
    parts.push(paint(tube(V(0, 0, 0), V(0, 2.4, 8.6), 0.9, 10), sleeve));
    parts.push(paint(sph(1.1, 1, 0.9, 1.2, 0, 2.6, 9.0, 10, 8), skin));
    parts.push(paint(box(4.4, 8.6, 0.6, 0, 6.2, 9.6), rgb(0xd8d4e0)));
    parts.push(paint(box(4.0, 8.2, 0.1, 0, 6.2, 9.95), rgb(0xf0c8d8)));
    parts.push(paint(cyl(0.7, 0.7, 0.3, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(-1.1, 9.0, 10.05), rgb(0x05050a)));
    parts.push(paint(cyl(0.5, 0.5, 0.32, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(-1.1, 7.5, 10.05), rgb(0x05050a)));
    return merge(parts);
  },
  // the upload: one segment of the bar; the frame along the wall
  upSeg() { return box(0.25, 1.4, 1.9, 0, 0, 0); },
  // a picture frame (gold) for the corridor walls; the photo is its own layer
  frame() { const parts = [], g = rgb(0xc89848); for (const [w, h, x, y] of [[9.4, 0.8, 0, 3.7], [9.4, 0.8, 0, -3.7], [0.8, 8.2, -4.3, 0], [0.8, 8.2, 4.3, 0]]) parts.push(paint(box(w, h, 0.8, x, y, 0), g)); return merge(parts); },
  shard() { const g = new THREE.TetrahedronGeometry(1, 0); g.scale(1, 0.4, 0.7); return paint(g, [1, 1, 1]); },
  // the bed: headboard tufted, pillows, the edge of the made bed; a nightstand, the lamp, the clock
  bed() {
    const parts = [], head = rgb(0xe8d8e0), wood = rgb(0x3a2418);
    parts.push(paint(box(2, 17, 30, 0, 8.5, 0), head));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) parts.push(paint(sph(0.3, 0.6, 1, 1, 1.05, 7 + r * 3.4, -12.5 + c * 5, 6, 4), rgb(0xb8a8b0)));
    parts.push(paint(box(8, 4.4, 29, 5, 2.2, 0), rgb(0xf4f0f4)));
    for (const z of [-7, 7]) parts.push(paint(sph(1, 2.4, 1.5, 5.6, 3.2, 5.4, z, 16, 10), rgb(0xffffff)));
    parts.push(paint(box(5.2, 4.7, 29.4, 6.6, 2.35, 0), rgb(0xd8c8e8)));
    parts.push(paint(box(8, 8, 8, 4, 4, 21), wood));
    parts.push(paint(box(8.4, 0.5, 8.4, 4, 8.2, 21), rgb(0x5a3a28)));
    parts.push(paint(cyl(0.8, 1.6, 4, 12, 3.2, 10.4, 23), rgb(0xd8b060)));
    parts.push(paint(new THREE.CylinderGeometry(2.0, 3.0, 3.2, 16, 1, true).translate(3.2, 13.8, 23), rgb(0xfff0d8)));
    // the clock: its body, the feet, the bells (the face is a picture)
    parts.push(paint(cyl(2.4, 2.4, 1.6, 24, 0, 0, 0).rotateZ(Math.PI / 2).translate(5.0, 11.6, 18.6), rgb(0xd02a2a)));
    for (const s of [-1, 1]) parts.push(paint(cyl(0.25, 0.25, 1.4, 6, 5.0, 8.9, 18.6 + s * 1.5), rgb(0x8a8a90)));
    return merge(parts);
  },
  bells() { const parts = []; for (const s of [-1, 1]) { parts.push(paint(sph(1.1, 1, 0.8, 1, 0, 0, s * 1.3, 12, 8), rgb(0xd8d8e0))); } parts.push(paint(box(0.3, 1, 0.3, 0, -0.4, 0), rgb(0x8a8a90))); return merge(parts); },
  // what the house lights show: the ball down on the floor, cracked open; the glass on its side
  ballDown() {
    const g = new THREE.SphereGeometry(7, 30, 18).toNonIndexed(); g.computeVertexNormals();
    const n = g.attributes.position.count, c = new Float32Array(n * 3), R = seeded(73), p = g.attributes.position.array;
    for (let i = 0; i < n; i += 6) {
      const broken = p[i * 3 + 1] < -3.2 && p[i * 3] > -2 && R() < 0.8;
      const r = R(), k = broken ? 0.04 : r < 0.35 ? 0.25 : r < 0.75 ? 0.75 : 1.25;
      for (let v = i; v < Math.min(n, i + 6); v++) { c[v * 3] = k; c[v * 3 + 1] = k; c[v * 3 + 2] = k * (broken ? 1 : 1.05); }
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.scale(1, 0.86, 1); g.rotateZ(0.5); g.translate(0, 5.8, 0);
    const parts = [g, paint(cyl(1.2, 1.6, 1.2, 12, 0, 0, 0).rotateZ(1.2).translate(6.6, 9.4, 0), rgb(0x6a6a72)), paint(cyl(0.18, 0.18, 22, 6, 0, 0, 0).rotateZ(1.45).translate(17.6, 0.6, 2), rgb(0x6a6a72))];
    const R2 = seeded(5);
    for (let k = 0; k < 40; k++) { const a = R2() * 6.28, r = 7 + R2() * 12; const s = new THREE.BoxGeometry(0.9 + R2(), 0.08, 0.9 + R2()); s.rotateY(R2() * 3); s.translate(Math.cos(a) * r, 0.05, Math.sin(a) * r); const kk = 0.6 + R2() * 0.7; parts.push(paint(s, [kk, kk, kk])); }
    return merge(parts);
  },
  glassDown() {
    const parts = [];
    const g = new THREE.CylinderGeometry(4.6, 4.0, 16, 32, 1, true); g.translate(0, 8, 0); parts.push(paint(g, rgb(0xe8f0ff)));
    parts.push(paint(cyl(4.0, 4.0, 1.2, 32, 0, 0.6, 0), rgb(0xd8e4f4)));
    const st = cyl(0.35, 0.35, 17, 8, 0, 0, 0); st.rotateZ(1.1); st.translate(3, 8, 6); parts.push(paint(st, rgb(0xff5fb0)));
    const gg = merge(parts); gg.rotateZ(Math.PI / 2); gg.translate(8, 4.4, 0);
    const R = seeded(8), ice = [];
    for (let k = 0; k < 7; k++) { const b = box(2.6, 2.6, 2.6, 0, 1.3, 0); b.rotateY(R() * 3); b.translate(-6 - R() * 12, 0, (R() - 0.5) * 16); ice.push(paint(b, rgb(0xf4faff))); }
    return merge([gg, ...ice]);
  },
  // the pit under lost time: the black, and its red edge
  pitHole() { const g = new THREE.CircleGeometry(1, 48); g.rotateX(-Math.PI / 2); return g; },
  pitRim() { const g = new THREE.RingGeometry(0.94, 1.0, 64, 1); g.rotateX(-Math.PI / 2); return g; },
  // the rig: a truss right across the room
  truss() {
    const parts = [], L = 112, steel = rgb(0x2a2a32);
    for (const [y, z] of [[0, -0.9], [0, 0.9], [1.8, -0.9], [1.8, 0.9]]) parts.push(paint(cyl(0.16, 0.16, L, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, y, z), steel));
    for (let k = 0; k < 56; k++) { const x = -L / 2 + k * 2; parts.push(paint(tube(V(x, 0, -0.9), V(x + 2, 1.8, -0.9), 0.08, 4), steel)); parts.push(paint(tube(V(x, 1.8, 0.9), V(x + 2, 0, 0.9), 0.08, 4), steel)); }
    for (let k = 0; k < 14; k++) { const x = -52 + k * 8; parts.push(paint(box(1.4, 1.8, 1.4, x, -1.6, 0), rgb(0x16161c))); parts.push(paint(cyl(0.6, 0.6, 0.2, 12, x, -2.55, 0), rgb(0xffffff))); }
    return merge(parts);
  },
  // the DJ's booth over the far door
  booth() {
    const parts = [];
    parts.push(paint(box(30, 7, 9, 0, 3.5, 0), rgb(0x0e0c14)));
    parts.push(paint(box(30.4, 0.5, 9.4, 0, 7.2, 0), rgb(0xff4fd8)));
    for (const s of [-1, 1]) { parts.push(paint(box(7, 0.8, 5, s * 6, 7.8, 0), rgb(0x2a2a32))); parts.push(paint(cyl(2, 2, 0.3, 20, s * 6, 8.3, 0), rgb(0x0a0a0c))); }
    parts.push(paint(box(30, 1, 0.3, 0, 1.2, 4.6), rgb(0x40d8ff)));
    return merge(parts);
  },
  // when the lights come up: the yellow wet-floor sign, the mop in its bucket, one shoe
  wetSign() {
    const parts = [], yel = rgb(0xffcc1a);
    for (const s of [-1, 1]) { const g = box(4.2, 7.2, 0.25, 0, 3.6, 0); g.rotateX(s * 0.2); g.translate(0, 0, s * 0.75); parts.push(paint(g, yel)); }
    parts.push(paint(box(4.4, 0.5, 0.6, 0, 7.3, 0), yel));
    // the figure slipping, in black on both faces
    for (const s of [-1, 1]) {
      const fig = [sph(0.42, 1, 1, 0.3, 0.6, 5.2, 0), box(0.35, 1.7, 0.1, 0.1, 4.0, 0).rotateZ(0.7), box(0.3, 1.3, 0.1, -0.5, 2.9, 0).rotateZ(-0.3), box(0.3, 1.2, 0.1, 0.9, 2.6, 0).rotateZ(0.9), box(1.6, 0.18, 0.1, 0, 1.9, 0)];
      for (const f of fig) { f.rotateX(s * 0.2); f.translate(0, 0, s * 0.92); parts.push(paint(f, rgb(0x141414))); }
    }
    return merge(parts);
  },
  mop() {
    const parts = [];
    parts.push(paint(cyl(2.6, 2.2, 3.4, 18, 0, 1.7, 0), rgb(0xffd02a)));
    parts.push(paint(cyl(2.5, 2.5, 0.2, 18, 0, 3.0, 0), rgb(0x6a8aa8)));
    for (const s of [-1, 1]) parts.push(paint(cyl(0.45, 0.45, 0.6, 10, s * 2.0, 0.3, 1.6), rgb(0x1a1a1a)));
    const h = cyl(0.16, 0.16, 13, 8, 0, 0, 0); h.rotateZ(0.28); h.translate(-1.4, 7.6, 0); parts.push(paint(h, rgb(0xb8a080)));
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, st = cyl(0.12, 0.12, 2.6, 5, 0, 0, 0); st.rotateX(0.5 * Math.sin(a)); st.rotateZ(0.5 * Math.cos(a)); st.translate(0.2 + Math.cos(a) * 0.5, 2.0, Math.sin(a) * 0.5); parts.push(paint(st, rgb(0xd8d0c0))); }
    return merge(parts);
  },
  shoe() {
    const parts = [], red = rgb(0xd0102a);
    const sole = box(1.5, 0.22, 7, 0, 0.11, 0); parts.push(paint(sole, rgb(0x1a0a0a)));
    const body = sph(1, 0.85, 0.75, 2.4, 0, 0.75, 1.2, 14, 8); body.scale(1, 1, 1); parts.push(paint(body, red));
    const back = sph(1, 0.85, 1.1, 1.0, 0, 1.4, -2.0, 12, 8); parts.push(paint(back, red));
    parts.push(paint(cyl(0.14, 0.24, 3.0, 8, 0, 1.5, -3.1), rgb(0x1a0a0a)));
    const g = merge(parts); g.rotateZ(Math.PI / 2 - 0.2); g.translate(1.2, 0.85, 0); return g;
  },
  // a sign on a facade, lit (the words are the sign layer)
  wallBox() { return merge([paint(box(16.4, 5.6, 1.0, 0, 0, -0.6), rgb(0x0c0a10)), paint(box(16.8, 0.4, 1.2, 0, 2.9, -0.5), rgb(0x3a3440)), paint(box(16.8, 0.4, 1.2, 0, -2.9, -0.5), rgb(0x3a3440))]); },
};
// where the coupes stand in the tower (table top at 9.4)
function towerSpots() {
  const out = [], c = 1.9; let y = 9.4;
  for (let n = 5; n >= 1; n--) { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([(i - (n - 1) / 2) * 1.32 * c, y, (j - (n - 1) / 2) * 1.32 * c, 5 - n]); y += 1.32 * c; }
  return out;
}
const TOWER = towerSpots();

const TT = { aTint: 3 };
const BK = { aK: 1, aCol: 3 };
extend({
  layers: {
    spdBalcony: (M) => [G.balcony(), selfLit(M, 'spdDarkM', 0.25, { roughness: 0.4, metalness: 0.3 }), 4, {}],
    spdBeam: (M) => [beamGeo(0.6, 5.5), beamMat(M), 90, BK],
    spdBottle: (M) => [G.bottle(), selfLit(M, 'spdBottleM', 0.7, { roughness: 0.12, metalness: 0.25 }), 3, {}],
    spdCork: (M) => [G.cork(), selfLit(M, 'spdMatteM', 0.45, { roughness: 0.7 }), 3, {}],
    spdFoam: (M) => [G.blob(), tintLit(M, 'spdFoamM', 0.8, { roughness: 0.6 }), 160, TT],
    spdGlass: (M) => [G.glass(), selfLit(M, 'spdGlassM', 0.35, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false }), 3, {}],
    spdLiquid: (M) => [G.liquid(), tintLit(M, 'spdLiquidM', 0.9, { roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), 3, TT],
    spdPill: (M) => [G.pill(), tintLit(M, 'spdPillM', 0.9, { roughness: 0.35 }), 220, TT],
    spdBubble: (M) => [G.bubble(), neonMat(M, 'spdNeonM'), 260, TT],
    spdLipsTube: (M) => [G.lipsTube(), neonMat(M, 'spdNeonM'), 4, TT],
    spdLipsFill: (M) => [G.lipsFill(), neonMat(M, 'spdNeonM'), 4, TT],
    spdThrone: (M) => [G.throne(), selfLit(M, 'spdVelvetM', 0.3, { roughness: 0.55, metalness: 0.25 }), 3, {}],
    spdCrown: (M) => [G.crown(), selfLit(M, 'spdGoldM', 0.6, { roughness: 0.25, metalness: 0.6 }), 3, {}],
    spdRain: (M) => [box(0.08, 3.0, 0.08, 0, 0, 0), neonMat(M, 'spdAddM', true), 500, TT],
    spdTable: (M) => [G.towerTable(), selfLit(M, 'spdGlossM', 0.35, { roughness: 0.15, metalness: 0.3 }), 3, {}],
    spdCoupes: (M) => [G.coupes(), selfLit(M, 'spdGlassM', 0.35, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false }), 3, {}],
    spdFill: (M) => [G.fill(), neonMat(M, 'spdNeonM'), 120, TT],
    spdStream: (M) => [G.stream(), neonMat(M, 'spdNeonM'), 60, TT],
    spdChainDoor: (M) => [G.chainDoor(), selfLit(M, 'spdSteelM', 0.3, { roughness: 0.35, metalness: 0.5 }), 3, {}],
    spdPhoneArm: (M) => [G.phoneArm(), selfLit(M, 'spdPhoneM', 0.45, { roughness: 0.3, metalness: 0.2 }), 24, {}],
    spdScreen: (M) => [cellPlane('rec', 3.9, 7.9), picMat(M, 'spdPicM', 1.1), 24, {}],
    spdUpSeg: (M) => [G.upSeg(), neonMat(M, 'spdNeonM'), 80, TT],
    spdUpLabel: (M) => [cellPlane('upload', 12, 3), picMat(M, 'spdPicM', 1.1), 3, {}],
    spdUpDone: (M) => [cellPlane('done', 8, 2), picMat(M, 'spdPicM', 1.1), 3, {}],
    spdFrame: (M) => [G.frame(), selfLit(M, 'spdGoldM', 0.6, { roughness: 0.25, metalness: 0.6 }), 16, {}],
    spdPhoto0: (M) => [cellPlane('photo0', 7.8, 6.6), picMat(M, 'spdPicM', 1.1), 6, {}],
    spdPhoto1: (M) => [cellPlane('photo1', 7.8, 6.6), picMat(M, 'spdPicM', 1.1), 6, {}],
    spdPhoto2: (M) => [cellPlane('photo2', 7.8, 6.6), picMat(M, 'spdPicM', 1.1), 6, {}],
    spdPhoto3: (M) => [cellPlane('photo3', 7.8, 6.6), picMat(M, 'spdPicM', 1.1), 6, {}],
    spdDust: (M) => [G.blob(), tintLit(M, 'spdDustM', 0.22, { roughness: 0.95 }), 200, TT],
    spdShard: (M) => [G.shard(), tintLit(M, 'spdShardM', 0.6, { roughness: 0.3, metalness: 0.5 }), 120, TT],
    spdCardFriends: (M) => [cellPlane('friends', 20, 10), picMat(M, 'spdPicM', 1.25), 3, {}],
    spdCardFamily: (M) => [cellPlane('family', 20, 10), picMat(M, 'spdPicM', 1.25), 3, {}],
    spdCardBosses: (M) => [cellPlane('bosses', 20, 10), picMat(M, 'spdPicM', 1.25), 3, {}],
    spdBub0: (M) => [cellPlane('bubble', 10, 5), picMat(M, 'spdPicM', 1.25), 40, {}],
    spdBub1: (M) => [cellPlane('bubble2', 10, 5), picMat(M, 'spdPicM', 1.25), 40, {}],
    spdBub2: (M) => [cellPlane('bubble3', 10, 5), picMat(M, 'spdPicM', 1.25), 40, {}],
    spdBub3: (M) => [cellPlane('seen', 10, 5), picMat(M, 'spdPicM', 1.25), 40, {}],
    spdBed: (M) => [G.bed(), selfLit(M, 'spdSoftM', 0.4, { roughness: 0.8 }), 3, {}],
    spdBells: (M) => [G.bells(), selfLit(M, 'spdSteelM', 0.3, { roughness: 0.35, metalness: 0.5 }), 3, {}],
    spdClock: (M) => [cellPlane('clock', 4.2, 4.2), picMat(M, 'spdPicM', 1.25), 3, {}],
    spdBallDown: (M) => [G.ballDown(), selfLit(M, 'spdBallM', 0.5, { roughness: 0.15, metalness: 0.2, flatShading: true }), 3, {}],
    spdGlassDown: (M) => [G.glassDown(), selfLit(M, 'spdGlassM', 0.35, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false }), 3, {}],
    spdPitHole: (M) => [G.pitHole(), M.spdBlackM || (M.spdBlackM = new THREE.MeshBasicMaterial({ color: 0x000000 })), 3, {}],
    spdPitRim: (M) => [G.pitRim(), neonMat(M, 'spdNeonM'), 3, TT],
    spdTruss: (M) => [G.truss(), selfLit(M, 'spdTrussM', 0.18, { roughness: 0.5, metalness: 0.5 }), 24, {}],
    spdPlume: (M) => [(() => { const g = new THREE.CylinderGeometry(4.5, 1.2, 1, 14, 1, true); g.translate(0, 0.5, 0); return g; })(), plumeMat(M), 40, { aK: 1 }],
    spdDJBooth: (M) => [G.booth(), selfLit(M, 'spdDarkM', 0.25, { roughness: 0.4, metalness: 0.3 }), 3, {}],
    spdWallBox: (M) => [G.wallBox(), selfLit(M, 'spdDarkM', 0.25, { roughness: 0.4, metalness: 0.3 }), 40, {}],
    spdWallFace: (M) => [new THREE.PlaneGeometry(7.5, 2.35), M.sign, 40, { aIdx: 1, aWake: 2 }],
    spdWetSign: (M) => [G.wetSign(), selfLit(M, 'spdPlainM', 0.3, { roughness: 0.5 }), 3, {}],
    spdMop: (M) => [G.mop(), selfLit(M, 'spdPlainM', 0.3, { roughness: 0.5 }), 3, {}],
    spdShoe: (M) => [G.shoe(), selfLit(M, 'spdBottleM', 0.7, { roughness: 0.12, metalness: 0.25 }), 3, {}],
  },
  parts: {
    // the balcony; on it the one who watches (he's one of the crowd)
    spdBalcony(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.spdBalcony.add(m); for (const z of [-12, 0, 12]) { const w = local(p, S.course.sample(it.t).yaw + (it.rot || 0), -6, 5.5, z, S._o); glowAt(S, w.x, w.y, w.z, 3, [1, 0.6, 0.85], 0.8); } },
    // the follow spot: from his balcony onto her, while he watches
    spdSpot(S, it, p) {
      touch(S, 'spdBeam'); const T = S.tNow ?? -99; if (!S.track) return;
      const k = smooth(it.t0, it.t0 + 0.5, T) * (1 - smooth(it.t1 - 0.4, it.t1, T)); if (k <= 0.01) return;
      const a = S._sa || (S._sa = new THREE.Vector3()), b = S._sb || (S._sb = new THREE.Vector3());
      S.track.ground(it.t, it.x, a); a.y = it.h;
      S.track.at(T + 0.08, 0, 0.9, b);
      const d = S._sd || (S._sd = new THREE.Vector3()); d.subVectors(b, a); const L = d.length();
      const qq = (S._sq || (S._sq = new THREE.Quaternion())).setFromUnitVectors(S._up || (S._up = new THREE.Vector3(0, 1, 0)), d.normalize());
      S._m.compose(a, qq, S._s.set(1, L * 1.05, 1)); S.layers.spdBeam.add(S._m, { aK: 1.4 * k, aCol: [1, 0.92, 0.85] });
      glowAt(S, a.x, a.y, a.z, 4, [1, 0.95, 0.9], 1.8 * k);
      poolAt(S, b.x, b.y - 0.85, b.z, 9, [1, 0.95, 0.9], 0.9 * k);
    },
    // the champagne: on the bar, then the cork goes and the foam comes over the road
    spdBottle(S, it, p, q, yaw) {
      touch(S, 'spdBottle', 'spdCork', 'spdFoam');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1;
      S._e.set(0, yaw, it.tilt ?? 0.75); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(s, s, s)); S.layers.spdBottle.add(m);
      const lb = S._bl || (S._bl = new THREE.Vector3()); lb.set(0, 5 * s, 0).applyQuaternion(bq).add(p); glowAt(S, lb.x, lb.y, lb.z, 12 * s, [1, 0.9, 0.7], 0.45);
      // the mouth, out along the bottle's axis
      const mouth = S._bm || (S._bm = new THREE.Vector3()); mouth.set(0, 14.4 * s, 0).applyQuaternion(bq).add(p);
      const dir = S._bd || (S._bd = new THREE.Vector3()); dir.set(0, 1, 0).applyQuaternion(bq);
      const age = T - it.pop;
      if (age < 0) { S._m.compose(mouth, bq, S._s.set(s, s, s)); S.layers.spdCork.add(S._m); return; }
      // the cork, flying
      if (age < 2.5) { const c = S._bc || (S._bc = new THREE.Vector3()); c.copy(mouth).addScaledVector(dir, 34 * age * s); c.y -= 0.5 * 22 * age * age; S._e.set(age * 9, age * 7, 0); const cq = (S._q7 || (S._q7 = new THREE.Quaternion())).setFromEuler(S._e); S._m.compose(c, cq, S._s.set(s, s, s)); S.layers.spdCork.add(S._m); }
      // the foam: blobs out of the mouth for a second, each on its own arc
      for (let k = 0; k < 70; k++) {
        const t0 = (k / 70) * 1.3, a = age - t0; if (a < 0 || a > 1.6) continue;
        const sp = 18 + ((k * 7.31) % 1) * 12, sx = (((k * 3.7) % 1) - 0.5) * 7, sz = (((k * 5.3) % 1) - 0.5) * 7;
        const f = S._bf || (S._bf = new THREE.Vector3());
        f.copy(mouth).addScaledVector(dir, sp * a * s); f.x += sx * a; f.z += sz * a; f.y += 4 * a - 0.5 * 26 * a * a;
        const r = (1.1 + ((k * 1.9) % 1) * 1.2) * s * (1 - a / 1.8);
        S._m.makeScale(r, r, r); S._m.setPosition(f); S.layers.spdFoam.add(S._m, { aTint: [1, 0.98, 0.9] });
      }
      if (age < 0.25) glowAt(S, mouth.x, mouth.y, mouth.z, 10 * s, [1, 1, 0.9], 2 * (1 - age / 0.25));
    },
    // the drink: the pill drops in on its beat; the splash, the fizz, the liquid clouding over
    spdDrink(S, it, p, q, yaw) {
      touch(S, 'spdGlass', 'spdLiquid', 'spdPill', 'spdBubble');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1, age = T - it.drop;
      const cloud = smooth(0, 1.4, age);
      m.compose(p, q, S._s.set(s, s, s));
      S.layers.spdLiquid.add(m, { aTint: [0.35 + 0.85 * cloud, 0.75 - 0.05 * cloud, 1.6 - 0.25 * cloud] });
      S.layers.spdGlass.add(m);
      const b = S._db || (S._db = new THREE.Vector3());
      // the pill: falling from the dark into it, then going down slowly, getting smaller
      const surf = 13.9 * s;
      let py, ps = 1.25 * s;
      if (age < 0) py = surf + Math.min(40 * s, 0.5 * 30 * age * age);
      else { py = Math.max(2.2 * s, surf - 7 * s * age); ps *= Math.max(0, 1 - age / 2.2); }
      if (ps > 0.02 && age > -1.5) { local(p, yaw, 0.6 * s, py, 0.4 * s, b); S._e.set(0.4 + age * 1.6, age * 2, 0.2); const pq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e); m.compose(b, pq, S._s.set(ps, ps, ps)); S.layers.spdPill.add(m, { aTint: [1.1, 1.1, 1.15] }); if (age < 0) glowAt(S, b.x, b.y, b.z, 4 * s, [1, 1, 1], 0.9); }
      // bubbles: a few always, a storm after it goes in
      const nb = age > 0 ? 120 : 30;
      for (let k = 0; k < nb; k++) {
        const fast = age > 0 && k >= 30, rate = fast ? 0.9 + (k % 7) * 0.12 : 0.3 + (k % 5) * 0.06;
        const ph = ((T * rate + k * 0.137) % 1), a = k * 2.399, r = 3.3 * Math.sqrt((k * 0.618) % 1);
        if (fast && age < 2.5 && ph > age * 0.9) continue;
        local(p, yaw, Math.cos(a) * r * s, (1.4 + ph * 12.4) * s, Math.sin(a) * r * s, b);
        const bs = s * (0.6 + ph) * (fast ? 1.2 : 1);
        m.makeScale(bs, bs, bs); m.setPosition(b); S.layers.spdBubble.add(m, { aTint: fast ? [1.3, 1.25, 1.5] : [0.9, 1.0, 1.2] });
      }
      // the splash: up and out as it hits
      if (age > 0 && age < 0.9) for (let k = 0; k < 26; k++) { const a = k * 0.2416 * 6.28, v = 9 + (k % 5) * 3; local(p, yaw, Math.cos(a) * v * age * s, surf + (14 * age - 0.5 * 30 * age * age) * s, Math.sin(a) * v * age * s, b); if (b.y < p.y + surf - 2) continue; const ds = 0.9 * s * (1 - age); m.makeScale(ds, ds, ds); m.setPosition(b); S.layers.spdBubble.add(m, { aTint: [1.2, 1.2, 1.3] }); }
      glowAt(S, p.x, p.y + 9 * s, p.z, 26 * s, [0.35 + 0.6 * cloud, 0.7 - 0.1 * cloud, 1], 0.6 + 0.2 * cloud);
      if (age > 0 && age < 0.4) glowAt(S, p.x, p.y + surf, p.z, 14 * s, [1, 1, 1], 1.6 * (1 - age / 0.4));
    },
    // neon lips; dying ones flicker and go out tube by tube
    spdLips(S, it, p, q) {
      touch(S, 'spdLipsTube', 'spdLipsFill');
      const T = S.tNow ?? -99, h = S.course.sample(it.t).yaw;
      S._e.set(0, h + Math.PI + (it.x > 0 ? -0.45 : 0.45), it.tilt || 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      let k = 1;
      if (it.dying) { const r = Math.sin(T * 37 + 1.3) * Math.sin(T * 11.3); k = (r > 0.3 ? 0.12 : 1) * (1 - smooth(it.out - 0.2, it.out, T) * 0.92); }
      else k = 0.85 + 0.3 * (S.beat || 0);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s));
      S.layers.spdLipsTube.add(m, { aTint: [3.2 * k, 0.25 * k, 0.6 * k] });
      S.layers.spdLipsFill.add(m, { aTint: [0.5 * k, 0.02 * k, 0.1 * k] });
      glowAt(S, p.x, p.y, p.z, 30 * s, [1, 0.1, 0.3], 0.45 * k);
    },
    // the throne; the crown on it goes up and away on "throne"
    spdThrone(S, it, p, q, yaw) {
      touch(S, 'spdThrone', 'spdCrown');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.spdThrone.add(m);
      const a = Math.max(0, T - it.lift), c = S._tc || (S._tc = new THREE.Vector3());
      // up off the cushion, then over toward the road and away high
      local(p, yaw, 0, (9.6 + 3 * a * a + 6 * a) * s, (0.6 + 9 * a * a) * s, c);
      S._e.set(0.3 * Math.sin(a * 2), T * 0.6 + a * 4, 0.25 * Math.sin(a * 3)); const cq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      if (a < 3) { m.compose(c, cq, S._s.set(s, s, s)); S.layers.spdCrown.add(m); glowAt(S, c.x, c.y + 1.5 * s, c.z, 9 * s, [1, 0.85, 0.4], 0.9); }
      const w = local(p, yaw, 0, 30 * s, -2 * s, S._o); glowAt(S, w.x, w.y, w.z, 22 * s, [1, 0.3, 0.35], 0.4); poolAt(S, p.x, p.y + 0.1, p.z, 36 * s, [1, 0.3, 0.3], 0.6);
    },
    // the rain: a curtain of drops from the ceiling, lit by the lasers, that she rides through
    spdRain(S, it, p, q, yaw) {
      touch(S, 'spdRain'); const T = S.tNow ?? -99; if (T < it.t0 - 4 || T > it.t1 + 1) return;
      const m = S._m, b = S._rb2 || (S._rb2 = new THREE.Vector3()), v = S.rider ? 38 : 38;
      const k = smooth(it.t0 - 0.6, it.t0, T) * (1 - smooth(it.t1, it.t1 + 0.6, T)) * 0.6 + 0.4;
      const H = it.top ?? 40, R = it.seed || 1;
      for (let i = 0; i < 460; i++) {
        const u = ((i * 0.6180339) % 1), w = ((i * 0.7548776 + R) % 1), z0 = (u - 0.5) * (it.t1 - it.t0) * v;
        const x = (w - 0.5) * 70, fall = ((T * 34 + ((i * 0.5698) % 1) * H) % H);
        local(p, yaw, x, H - fall, z0, b);
        m.makeTranslation(b.x, b.y, b.z); S.layers.spdRain.add(m, { aTint: [0.55 * k, 0.7 * k, 1.15 * k] });
      }
    },
    // the tower of glasses: the bottle pouring the green over the top, tier by tier, over onto the floor
    spdTower(S, it, p, q, yaw) {
      touch(S, 'spdTable', 'spdCoupes', 'spdFill', 'spdStream', 'spdBottle');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.spdTable.add(m); S.layers.spdCoupes.add(m);
      const age = T - it.pour, b = S._tb || (S._tb = new THREE.Vector3());
      const green = [0.35, 2.4, 0.6];
      for (const [x, y, z, tier] of TOWER) {
        const full = smooth(tier * 0.35, tier * 0.35 + 0.3, age);
        local(p, yaw, x * s, (y + 2.05) * s, z * s, b);
        m.makeScale(1.9 * s, (0.2 + 0.8 * full) * s, 1.9 * s); m.setPosition(b);
        S.layers.spdFill.add(m, { aTint: full > 0.05 ? [green[0] * full, green[1] * full, green[2] * full] : [0.12, 0.1, 0.1] });
      }
      // the bottle over the top, tipped; the pour; the falls down the sides as it overflows
      const top = 9.4 + 4 * 1.32 * 1.9 + 3.5;
      local(p, yaw, -7 * s, (top + 8) * s, 0, b); S._e.set(0, yaw, -2.3); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(b, bq, S._s.set(0.7 * s, 0.7 * s, 0.7 * s)); S.layers.spdBottle.add(m);
      if (age > -0.3) {
        local(p, yaw, 0.5 * s, (top - 1.4) * s, 0, b); m.compose(b, S._q.identity(), S._s.set(s, 2.8 * s, s)); S.layers.spdStream.add(m, { aTint: [0.5, 3, 0.8] });
        for (let k = 0; k < 12; k++) {
          const ph = smooth(0.3 + (k % 4) * 0.35, 0.6 + (k % 4) * 0.35, age); if (ph <= 0) continue;
          const a = k / 12 * Math.PI * 2, r = (4.8 - (k % 4) * 0.8) * 1.9 * 0.66;
          local(p, yaw, Math.cos(a) * r * s, 9.4 * s, Math.sin(a) * r * s, b); m.compose(b, S._q.identity(), S._s.set(0.6 * s, ph * (2 + (k % 4) * 2.5) * s, 0.6 * s)); S.layers.spdStream.add(m, { aTint: [0.35, 2.2, 0.55] });
        }
        const pool = smooth(1.2, 3.2, age);
        if (pool > 0) poolAt(S, p.x, p.y + 0.12, p.z, (14 + 26 * pool) * s, [0.2, 1, 0.35], 1.2 * pool);
      }
      glowAt(S, p.x, p.y + 16 * s, p.z, 26 * s, [0.4, 1, 0.5], 0.2 + 0.4 * smooth(0, 1.5, age));
    },
    // the door out, chained, its EXIT lit over it
    spdChainDoor(S, it, p, q, yaw) {
      touch(S, 'spdChainDoor', 'exitBox', 'exitFace');
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.spdChainDoor.add(m);
      const w = local(p, yaw, 0, 31 * s, 1.5 * s, S._o); m.compose(w, q, S._s.set(1.4 * s, 1.4 * s, 1.4 * s)); S.layers.exitBox.add(m); S.layers.exitFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      glowAt(S, w.x, w.y, w.z, 14 * s, [1, 0.1, 0.1], 0.8);
      const l = local(p, yaw, 0, 11 * s, 3 * s, S._o); glowAt(S, l.x, l.y, l.z, 5 * s, [1, 0.8, 0.4], 0.5);
    },
    // a phone held out of the wall, recording: its light flashing on the beat
    spdPhone(S, it, p, q, yaw) {
      touch(S, 'spdPhoneArm', 'spdScreen');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1;
      S._e.set(0.05 * Math.sin(T * 3 + it.t * 7), yaw + 0.05 * Math.sin(T * 2.3 + it.t), 0.04 * Math.sin(T * 2.7)); const pq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, pq, S._s.set(s, s, s)); S.layers.spdPhoneArm.add(m);
      // the screen faces the wall; seen past the phone as she goes by
      const sc = S._ps || (S._ps = new THREE.Vector3()); sc.set(0, 6.2 * s, 9.28 * s).applyQuaternion(pq).add(p);
      const back = (S._q8 || (S._q8 = new THREE.Quaternion())).copy(pq).multiply(S._q.setFromAxisAngle(S._up || (S._up = new THREE.Vector3(0, 1, 0)), Math.PI));
      m.compose(sc, back, S._s.set(s, s, s)); S.layers.spdScreen.add(m);
      const bpos = S.spd ? S.spd.beatF : T * 2.2, bf = bpos - Math.floor(bpos);
      const fl = sc.set(-1.1 * s, 7.5 * s, 10.3 * s).applyQuaternion(pq).add(p);
      glowAt(S, fl.x, fl.y, fl.z, 4.2 * s, [1, 1, 0.95], (0.9 + 3.2 * Math.exp(-bf * 8)) * (it.flash ?? 1)); glowAt(S, fl.x, fl.y, fl.z, 14 * s, [0.8, 0.85, 1], 0.25 * Math.exp(-bf * 5));
      const rd = sc.set(1.3 * s, 10.0 * s, 10.3 * s).applyQuaternion(pq).add(p);
      glowAt(S, rd.x, rd.y, rd.z, 1.4 * s, [1, 0.05, 0.08], Math.sin(T * 6.3) > 0 ? 2.2 : 0.3);
    },
    // the upload: a bar along the wall filling ahead of her, the word at its start, 100% at its end
    spdUpload(S, it, p, q) {
      touch(S, 'spdUpSeg', 'spdUpLabel', 'spdUpDone'); const T = S.tNow ?? -99; if (!S.track) return;
      const m = S._m, b = S._ub || (S._ub = new THREE.Vector3()), n = 36, fill = it.t0 + (T - it.t0 + 1.6) * (it.rate ?? 1.35);
      const yw = S.course.sample(it.t0).yaw;
      for (let k = 0; k < n; k++) {
        const tk = it.t0 + (it.t1 - it.t0) * (k + 0.5) / n;
        S.track.ground(tk, it.x, b); b.y = floorAt(S.course, tk) + it.hh;
        S._e.set(0, S.course.sample(tk).yaw, 0); const sq = S._q.setFromEuler(S._e);
        m.compose(b, sq, S._s.set(1, 1, 1));
        const on = tk < fill;
        S.layers.spdUpSeg.add(m, { aTint: on ? [0.22, 0.7, 1.15] : [0.035, 0.04, 0.06] });
      }
      // the word, facing her at the bar's start; the hundred at its end, once it's full
      S.track.ground(it.t0, it.x, b); b.y = floorAt(S.course, it.t0) + it.hh + 3.2;
      S._e.set(0, yw + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); m.compose(b, S._q.setFromEuler(S._e), S._s.set(1, 1, 1)); S.layers.spdUpLabel.add(m);
      if (fill > it.t1) { S.track.ground(it.t1, it.x, b); b.y = floorAt(S.course, it.t1) + it.hh + 3; const k = elastic(clamp((fill - it.t1) / 0.4, 0, 1)); S._e.set(0, S.course.sample(it.t1).yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); m.compose(b, S._q.setFromEuler(S._e), S._s.set(k * 1.4, k * 1.4, 1)); S.layers.spdUpDone.add(m); glowAt(S, b.x, b.y, b.z, 14, [0.5, 0.9, 1], 0.6 * k); }
    },
    // a photograph on the wall, until it goes to dust: the frame drops apart, a cloud of it
    spdFrame(S, it, p, q, yaw) {
      touch(S, 'spdFrame', 'spdPhoto0', 'spdPhoto1', 'spdPhoto2', 'spdPhoto3', 'spdDust');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1, age = T - it.burst;
      if (age < 0) {
        m.compose(p, q, S._s.set(s, s, s)); S.layers.spdFrame.add(m);
        local(p, yaw, 0, 0, 0.45 * s, S._o); m.compose(S._o, q, S._s.set(s, s, s)); S.layers['spdPhoto' + (it.v % 4)].add(m);
        glowAt(S, p.x, p.y, p.z, 12 * s, [1, 0.85, 0.6], 0.25);
        return;
      }
      if (age > 2.6) return;
      // the frame, falling and turning
      local(p, yaw, 0, -0.5 * 26 * age * age * s, (1.6 * age) * s, S._o);
      S._e.set(age * 1.4, yaw, age * 0.9 * (it.x > 0 ? 1 : -1)); const fq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      if (S._o.y > p.y - it.h0) { m.compose(S._o, fq, S._s.set(s, s, s)); S.layers.spdFrame.add(m); }
      // the dust: out of where it hung, spreading, falling, going
      const b = S._fb || (S._fb = new THREE.Vector3());
      for (let k = 0; k < 22; k++) {
        const a = k * 2.399, e = ((k * 0.618) % 1) - 0.3, v = 3 + (k % 7) * 1.2;
        local(p, yaw, Math.cos(a) * v * age * s, (e * v * age - 2.5 * age * age) * s, (1 + Math.abs(Math.sin(a)) * v * age) * s, b);
        const r = (0.35 + (k % 3) * 0.22 + 0.8 * age) * s * Math.max(0, 1 - age / 2.2);
        m.makeScale(r, r, r); m.setPosition(b); S.layers.spdDust.add(m, { aTint: [0.36, 0.32, 0.29] });
      }
    },
    // a notification, popping up on its word, and staying
    spdCard(S, it, p, q) {
      const L = ['spdCardFriends', 'spdCardFamily', 'spdCardBosses', 'spdBub0', 'spdBub1', 'spdBub2', 'spdBub3'];
      touch(S, ...L);
      const T = S.tNow ?? -99, k = elastic(clamp((T - it.pop) / 0.45, 0, 1)); if (k <= 0.01) return;
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.55 : 0.55), (it.tilt || 0)); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = (it.s ?? 1) * k; m.compose(p, fq, S._s.set(s, s, s)); S.layers[L[it.v]].add(m);
      glowAt(S, p.x, p.y, p.z, (it.v < 3 ? 22 : 11) * (it.s ?? 1), [0.75, 0.85, 1], 0.35 * k);
    },
    // a rope across the way, brass posts either side: it snaps as she gets to it
    spdRopeX(S, it, p, q, yaw) {
      touch(S, 'stanchion', 'rope'); const T = S.tNow ?? -99; if (!S.track) return;
      const c = S.course, ry = c.sample(it.t).y, w = c.sample(it.t).width + 2.2, fy = floorAt(c, it.t), H = ry + 1.9 - fy;
      const m = S._m, a = S._xa || (S._xa = new THREE.Vector3()), b = S._xb || (S._xb = new THREE.Vector3());
      const sy = H / 2.7, ss = 2.2;
      for (const sd of [-1, 1]) { S.track.ground(it.t, sd * w, a); a.y = fy; m.compose(a, q, S._s.set(ss, sy, ss)); S.layers.stanchion.add(m); }
      const snap = Math.max(0, T - (it.t - 0.04));
      S.track.ground(it.t, -w, a); a.y = fy + H - 0.3; S.track.ground(it.t, w, b); b.y = fy + H - 0.3;
      const Z = S._zAxis || (S._zAxis = new THREE.Vector3(0, 0, 1)), d = S._rd || (S._rd = new THREE.Vector3()), qq = S._rq || (S._rq = new THREE.Quaternion());
      const prev = S._rp || (S._rp = new THREE.Vector3()), cur = S._rc || (S._rc = new THREE.Vector3());
      const n = 10;
      for (const half of [0, 1]) {
        const from = half ? b : a, to = half ? a : b;
        prev.copy(from);
        for (let k = 1; k <= n / 2; k++) {
          const u = k / n;
          cur.lerpVectors(from, to, u); cur.y -= Math.sin(Math.PI * u) * 0.8;
          if (snap > 0) { const fall = Math.min(1, snap * 2.2), ang = fall * 1.35 * (u * 2); cur.y -= Math.sin(ang) * (u * w * 2) * 0.55; const fw = snap * 9 * u; cur.x += Math.sin(yaw) * fw; cur.z += Math.cos(yaw) * fw; }
          d.subVectors(cur, prev); const L = d.length(); if (L > 0.01) { qq.setFromUnitVectors(Z, d.normalize()); m.compose(prev, qq, S._s.set(2.4, 2.4, L)); S.layers.rope.add(m); }
          prev.copy(cur);
        }
      }
    },
    // the bed by the wall, the lamp on, the alarm clock ringing on the beat
    spdBed(S, it, p, q, yaw) {
      touch(S, 'spdBed', 'spdBells', 'spdClock');
      const T = S.tNow ?? -99, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.spdBed.add(m);
      const bpos = S.spd ? S.spd.beatF : T * 2.2, bf = bpos - Math.floor(bpos), ring = T > it.ring ? Math.exp(-bf * 5) : 0;
      const c = local(p, yaw, 5.85 * s, 11.6 * s, 18.6 * s, S._o);
      S._e.set(0, yaw + Math.PI / 2, 0); m.compose(c, S._q.setFromEuler(S._e), S._s.set(s, s, s)); S.layers.spdClock.add(m);
      const bl = local(p, yaw, 5.0 * s, 14.4 * s, 18.6 * s, S._fb || (S._fb = new THREE.Vector3()));
      S._e.set(0, yaw + Math.PI / 2, 0.25 * ring * Math.sin(T * 60)); m.compose(bl, S._q.setFromEuler(S._e), S._s.set(s, s, s)); S.layers.spdBells.add(m);
      const lamp = local(p, yaw, 3.2 * s, 14 * s, 23 * s, S._o); glowAt(S, lamp.x, lamp.y, lamp.z, 12 * s, [1, 0.85, 0.6], 0.9); poolAt(S, lamp.x, p.y + 0.1, lamp.z, 30 * s, [1, 0.8, 0.55], 0.6);
      // morning at the window over it
      const win = local(p, yaw, 1.2 * s, 22 * s, 0, S._o); glowAt(S, win.x, win.y, win.z, 26 * s, [1, 0.8, 0.6], 0.35);
    },
    // under the house lights: the ball down, the glass on its side
    spdBallDown(S, it, p, q) { touch(S, 'spdBallDown'); const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.spdBallDown.add(m); const T = S.tNow ?? 0; for (let k = 0; k < 6; k++) { const on = Math.max(0, Math.sin(T * 2.3 + k * 2.1)); glowAt(S, p.x + Math.cos(k * 2.4) * 6 * s, p.y + (5 + Math.sin(k * 1.3) * 4) * s, p.z + Math.sin(k * 2.4) * 6 * s, 1.4 * s, [1, 1, 1], 1.4 * on * on); } },
    spdGlassDown(S, it, p, q) { touch(S, 'spdGlassDown'); const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.spdGlassDown.add(m); },
    // the pit: a hole in the floor, black, its edge burning red
    spdPit(S, it, p, q) {
      touch(S, 'spdPitHole', 'spdPitRim');
      const m = S._m, T = S.tNow ?? 0; p.y += 0.2; m.compose(p, q, S._s.set(it.w, 1, it.l)); S.layers.spdPitHole.add(m);
      p.y += 0.05; m.compose(p, q, S._s.set(it.w, 1, it.l)); const k = 0.8 + 0.2 * Math.sin(T * 9); S.layers.spdPitRim.add(m, { aTint: [3.2 * k, 0.15 * k, 0.1 * k] });
      poolAt(S, p.x, p.y + 0.1, p.z, it.l * 2.6, [1, 0.05, 0.05], 0.5);
    },
    // pills hanging in the void, turning, pastel
    spdPills(S, it, p, q, yaw) {
      touch(S, 'spdPill'); const T = S.tNow ?? -99; if (T < it.t0 - 12 || T > it.t1 + 1) return;
      const m = S._m, b = S._pb || (S._pb = new THREE.Vector3()), R = seeded(97), c = S.course;
      const cols = [[0.95, 0.5, 0.85], [0.5, 0.85, 0.95], [0.95, 0.85, 0.5], [0.7, 0.95, 0.55], [0.85, 0.85, 0.95]];
      for (let k = 0; k < 115; k++) {
        const tk = it.t0 + R() * (it.t1 - it.t0), sd = R() < 0.5 ? -1 : 1, x = sd * (11 + R() * 24), hy = R() * 20, s = 1.7 + R() * 1.6, sp = R();
        if (tk < T - 1 || tk > T + 12) continue;
        if (!S.track) continue;
        S.track.ground(tk, x, b); b.y = c.sample(tk).y + hy - 6 + Math.sin(T * (0.6 + sp) + k) * 1.5;
        S._e.set(T * (0.3 + sp) + k, T * (0.5 + sp * 0.5), k); m.compose(b, S._q.setFromEuler(S._e), S._s.set(s, s, s));
        S.layers.spdPill.add(m, { aTint: cols[k % cols.length] });
        if (k % 5 === 0) glowAt(S, b.x, b.y, b.z, s * 2.2, cols[k % cols.length], 0.22);
      }
    },
    // the rig: trusses right across the room, dropping with the kick, their lamps answering
    spdTruss(S, it, p, q, yaw) {
      touch(S, 'spdTruss', 'spdBeam');
      const st = S.spd || {}, T = S.tNow ?? 0, bf = st.beatF !== undefined ? st.beatF - Math.floor(st.beatF) : 0;
      const live = 1 - (st.freeze || 0), drop = (st.rigDrop || 0) * Math.exp(-bf * 6) * live;
      p.y += -2.6 * drop + (st.dropY || 0);
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.spdTruss.add(m);
      const cols = [[1, 0.25, 0.85], [0.3, 0.8, 1], [1, 0.95, 0.9]], bi = Math.floor(st.beatF || 0);
      const on = (st.rig ?? 0) * (1 - (st.house || 0));
      if (on < 0.02) return;
      for (let k = 0; k < 14; k++) {
        const x = -52 + k * 8, w = local(p, yaw, x, -2.7, 0, S._o), c = cols[(k + bi) % 3];
        const kk = on * (0.4 + 1.4 * ((k + bi) % 2 ? Math.exp(-bf * 5) : 0.3)) * (0.3 + 0.7 * live);
        glowAt(S, w.x, w.y, w.z, 2.6, c, 1.6 * kk);
        // every other lamp throws a beam down at the floor, swinging
        if (k % 3 === 1 && live > 0.5) {
          const sw = Math.sin(T * 1.3 + k + it.seed * 5) * 0.5;
          S._e.set(Math.PI + 0.25 * Math.cos(T * 0.9 + k), yaw, sw); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
          m.compose(w, bq, S._s.set(1, 40, 1)); S.layers.spdBeam.add(m, { aK: 0.55 * kk, aCol: c });
        }
      }
    },
    // the CO2: plumes up out of the floor on the bar
    spdJet(S, it, p, q) {
      touch(S, 'spdPlume'); const st = S.spd || {}; const a = st.jetAge ?? 9, k = st.jet ?? 0;
      if (k <= 0.01 || a > 1.1) return;
      const h = 30 * smooth(0, 0.35, a) + 4, fade = (1 - smooth(0.45, 1.1, a)) * k;
      const m = S._m; m.compose(p, q, S._s.set(1 + a * 0.6, h, 1 + a * 0.6)); S.layers.spdPlume.add(m, { aK: 0.9 * fade });
    },
    // the booth over the far door: the decks, and the DJ (one of the crowd) at them
    spdDJ(S, it, p, q, yaw) { touch(S, 'spdDJBooth'); const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.spdDJBooth.add(m); const b = S.beat || 0; for (const sd of [-1, 1]) { const w = local(p, yaw, sd * 13, 9, 2, S._o); glowAt(S, w.x, w.y, w.z, 6, sd > 0 ? [0.3, 0.8, 1] : [1, 0.3, 0.85], 1 + 2 * b); } },
    // searchlights off the club's roof, sweeping the sky
    spdSearch(S, it, p) {
      touch(S, 'spdBeam'); const T = S.tNow ?? 0, m = S._m;
      for (let k = 0; k < 2; k++) {
        const ey = S._eY || (S._eY = new THREE.Euler(0, 0, 0, 'YXZ'));
        ey.set(-0.35 + 0.28 * Math.sin(T * 0.7 + k * 2 + it.seed), S.course.sample(it.t).yaw, (k ? 1 : -1) * (0.3 + 0.25 * Math.sin(T * 0.5 + k)));
        const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(ey);
        m.compose(p, bq, S._s.set(1.6, 220, 1.6)); S.layers.spdBeam.add(m, { aK: 0.5, aCol: k ? [0.75, 0.6, 1] : [1, 0.5, 0.85] });
      }
      glowAt(S, p.x, p.y, p.z, 8, [1, 0.8, 1], 1.2);
    },
    // after: the sign, the mop, the shoe
    spdAfter(S, it, p, q) { touch(S, 'spdWetSign', 'spdMop', 'spdShoe'); const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers[{ sign: 'spdWetSign', mop: 'spdMop', shoe: 'spdShoe' }[it.kind]].add(m); },
    // a lit sign on a facade, turned to the street (one of the street's own: COCKTAILS, DANCING...)
    spdWallSign(S, it, p) {
      touch(S, 'spdWallBox', 'spdWallFace');
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -1.1 : 1.1), 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.spdWallBox.add(m);
      const T = S.tNow ?? 0, fl = it.flick && Math.sin(T * 23 + it.t * 9) > 0.92 ? 0.3 : 1;
      m.compose(p, fq, S._s.set(2.05 * s, 2.2 * s, 1)); S.layers.spdWallFace.add(m, { aIdx: it.idx, aWake: [fl, 0] });
      glowAt(S, p.x, p.y, p.z, 12 * s, it.glow || [1, 0.4, 0.8], 0.35 * fl);
    },
  },
  kits: {
    spdBalcony(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: ALONG(z.x), parts: 'spdBalcony', dy: z.y ?? 12, ahead: z.ahead ?? 30 })); },
    spdSpot(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x, h: floorAt(S.course, z.at) + (z.y ?? 24), t0: z.t0, t1: z.t1, parts: 'spdSpot', ahead: 40 }); },
    spdBottle(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, tilt: (z.x > 0 ? -1 : 1) * (z.tilt ?? 0.75), pop: z.pop, parts: 'spdBottle', dy: z.y ?? 12.9, ahead: 30 })); },
    spdDrink(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, drop: z.drop, parts: 'spdDrink', dy: z.y ?? 12.9, ahead: 30 })); },
    spdLips(S, z) { for (const l of z.at) S.items.push(onFloor(S, { t: l.t, x: l.x, s: l.s ?? 1, dying: l.dying, out: l.out, tilt: l.tilt, parts: 'spdLips', dy: l.y ?? 22, ahead: 34 })); },
    spdThrone(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, lift: z.lift, parts: 'spdThrone', ahead: 30 })); },
    spdRain(S, z) { prepare(S.course, S.plan); const tm = (z.t0 + z.t1) / 2; S.items.push({ t: tm, x: 0, h: floorAt(S.course, tm), t0: z.t0, t1: z.t1, top: z.top ?? 40, seed: 0.37, parts: 'spdRain', ahead: 12 }); },
    spdTower(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, pour: z.pour, parts: 'spdTower', ahead: 30 })); },
    spdChainDoor(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, idx: S.atlas.index[z.sign || 'EXITR'], parts: 'spdChainDoor', ahead: 30 })); },
    spdPhones(S, z) { for (const [t, x, y, r] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x) + (r ?? (x > 0 ? 0.35 : -0.35)), s: z.s ?? 1, parts: 'spdPhone', dy: y, ahead: 20 })); },
    spdUpload(S, z) { S.items.push({ t: z.t0, x: z.x, h: 0, t0: z.t0, t1: z.t1, hh: z.y ?? 14, rate: z.rate, parts: 'spdUpload', ahead: 20 }); },
    spdFrames(S, z) { let k = 0; for (const [t, x, y] of z.at) { const it = onFloor(S, { t, x, rot: SIDE(x), s: z.s ?? 1, v: k++, burst: t - (z.lead ?? 1.0), parts: 'spdFrame', dy: y ?? 13, ahead: 20 }); it.h0 = y ?? 13; S.items.push(it); } },
    spdCards(S, z) { for (const c of z.at) S.items.push(onFloor(S, { t: c.t, x: c.x, s: c.s ?? 1, v: c.v, pop: c.pop, tilt: c.tilt, parts: 'spdCard', dy: c.y ?? 14, ahead: 20 })); },
    spdRopesX(S, z) { for (const t of z.at) S.items.push({ t, x: 0, h: 0, parts: 'spdRopeX', ahead: 14 }); },
    spdBed(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: ALONG(z.x) + (z.x > 0 ? Math.PI : 0), s: z.s ?? 1, ring: z.ring, parts: 'spdBed', ahead: 20 })); },
    spdBallDown(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.6, s: z.s ?? 1, parts: 'spdBallDown', ahead: 30 })); },
    spdGlassDown(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.4, s: z.s ?? 1, parts: 'spdGlassDown', ahead: 30 })); },
    spdPit(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, w: z.w ?? 26, l: z.l ?? 30, parts: 'spdPit', ahead: 20 })); },
    spdPills(S, z) { const tm = (z.t0 + z.t1) / 2; S.items.push({ t: z.t0, x: 0, h: 0, t0: z.t0, t1: z.t1, parts: 'spdPills', ahead: 14 }); },
    spdRig(S, z, R) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 1.79) S.items.push({ t, x: 0, rot: 0, h: floorAt(S.course, t) + (z.y ?? 34), seed: R(), parts: 'spdTruss', ahead: 16 }); },
    spdJets(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const sd of [-1, 1]) S.items.push(onFloor(S, { t, x: sd * (z.x ?? 24), rot: 0, parts: 'spdJet', ahead: 12 })); },
    spdDJ(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: floorAt(S.course, z.at) + (z.y ?? 30), parts: 'spdDJ', ahead: 46 }); },
    spdSearch(S, z, R) { prepare(S.course, S.plan); for (const [t, x] of z.at) S.items.push({ t, x, rot: 0, h: floorAt(S.course, t) + (z.y ?? 58), seed: R(), parts: 'spdSearch', ahead: 46 }); },
    spdAfter(S, z) { for (const [t, x, kind, rot, s] of z.at) S.items.push(onFloor(S, { t, x, rot: rot ?? 0, s: s ?? 1, kind, parts: 'spdAfter', ahead: 30 })); },
    spdStacks(S, z) { for (const [t, x, s] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x), s: s ?? 1, parts: 'speakers', ahead: 30 })); },
    spdWallSigns(S, z, R) { for (const [t, x, y, sg, flick] of z.at) S.items.push(onFloor(S, { t, x, s: z.s ?? 1, idx: S.atlas.index[sg], flick, parts: 'spdWallSign', dy: y, ahead: 40, glow: z.glow })); },
  },
});
