// Your Apartment Smells Like Summer: the small tools its pieces are made with, and the clock
// they all move by. Every name this song adds to the scenery starts with "yas".
// (Copies of summer.js's little helpers, so these files never import summer.js.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
export const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => mergeGeometries(gs.map(ni), false);
export const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const cyl = (r0, r1, h, n, x = 0, y = 0, z = 0, open = false) => { const g = new THREE.CylinderGeometry(r0, r1, h, n, 1, open); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
// a hex colour, or three floats (over 1 for the things that glow)
export const rgb = (hex, g, b) => { if (g !== undefined) return [hex, g, b]; const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
// a whole piece one colour (vertex colours)
export function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
// a per-vertex float the shaders read (how far down a cloth, which bulb, which arm...)
export function tag(g, name, v, size = 1) {
  const n = g.attributes.position.count, a = new Float32Array(n * size);
  for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) a[i * size + k] = typeof v === 'function' ? v(i, k, g.attributes.position) : (Array.isArray(v) ? v[k] : v);
  g.setAttribute(name, new THREE.BufferAttribute(a, size));
  return g;
}
// merge pieces that carry the same extra attributes (missing ones filled with a default)
export function mergeTagged(gs, names) {
  const out = gs.map(ni);
  for (const g of out) for (const [nm, size, def] of names) if (!g.attributes[nm]) tag(g, nm, def, size);
  return mergeGeometries(out, false);
}

// ---------- the song's clock: one set of uniforms every material here reads ----------
// time, the beat (a pulse that falls away), where in the beat grid we are, the wind (0 still,
// 1 the chorus throwing the windows open), the storm, the lift, the beat's energy
export const U = {
  uTime: { value: 0 }, uBeat: { value: 0 }, uBeatPos: { value: 0 }, uWind: { value: 0 }, uStorm: { value: 0 },
  uLift: { value: 0 }, uEnergy: { value: 0 }, uSongT: { value: 0 }, uFlash: { value: 0 }, uParty: { value: 0 },
};
const UNI = 'uniform float uTime, uBeat, uBeatPos, uWind, uStorm, uLift, uEnergy, uSongT, uFlash, uParty;';

// A vertex-coloured standard material, lit a little by itself (k) so it reads at night, with
// optional per-instance tint (aTint) and a vertex hook (glsl that moves `transformed`).
// key makes each variant its own program.
export function yasMaterial(key, { k = 0.3, tint = false, vert = '', vertDecl = '', frag = '', fragDecl = '', ...opts } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, ...opts });
  m.onBeforeCompile = (sh) => {
    for (const n in U) sh.uniforms[n] = U[n];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${UNI}\n${tint ? 'attribute vec3 aTint; varying vec3 vTint;' : ''}\n${vertDecl}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${tint ? 'vTint = aTint;' : ''}\n${vert}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${UNI}\n${tint ? 'varying vec3 vTint;' : ''}\n${fragDecl}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${tint ? 'diffuseColor.rgb *= vTint;' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(3)};\n${frag}`);
  };
  m.customProgramCacheKey = () => 'yas-' + key;
  return m;
}
// one material per key per scenery (the scenery's material table M)
export const VCM = (M, key, opts) => M[key] || (M[key] = yasMaterial(key, opts));
// plain emissive (bulbs, flames, lit glass): colour times strength, nothing else
export const glowMat = (M, key, mult = 2.5) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1, 1, 1).multiplyScalar(mult) }));

// turned to her as she comes up the road, a little toward it
export function faceQ(S, it, extra = 0) {
  const h = S.course.sample(it.t).yaw;
  S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5) + extra, 0);
  return (S._qyas || (S._qyas = new THREE.Quaternion())).setFromEuler(S._e);
}
// along the road, its front (+z) turned to the road
export const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
