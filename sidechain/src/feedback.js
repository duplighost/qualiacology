// What tells you how you're doing, in the world: the diamonds you steer through, and
// the shockwave round the board when you hit a pump.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lipsGeometry, shellGeometry, candyGeometry, perfumeGeometry, donutGeometry, cuffsGeometry, coffeeGeometry, crownGeometry, popsicleGeometry, drinkGeometry, pinGeometry, realHeartGeometry, polaroidGeometry, whistleGeometry, cupGeometry } from './pickups.js';
import { tabGeometry } from './yst-tab.js';
import { wGeometry } from './scs-props.js';
import { pickup as hglPickup } from './hgl-props.js';
import { pickup as ptdPickup } from './ptd-props.js';
import { pickup as itdPickup } from './itd-props.js';
import { pickup as gcoPickup } from './gco-props.js';
import { pickup as gsaPickup } from './gsa-props.js';
import { pickup as mmsPickup } from './mms-props.js';
import { pickup as tmfPickup } from './tmf-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// a rubber duck: yellow body and head, orange beak, two black eyes, facing +z
export function duckGeometry() {
  const parts = [];
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  const Y = [1, 0.78, 0.12], O = [1, 0.42, 0.06], K = [0.03, 0.03, 0.04];
  const body = new THREE.SphereGeometry(0.5, 18, 12); body.scale(1.05, 0.72, 1.3); body.translate(0, 0, -0.05); parts.push(paint(body, Y));
  const tail = new THREE.ConeGeometry(0.2, 0.42, 10); tail.rotateX(-0.9); tail.translate(0, 0.22, -0.68); parts.push(paint(tail, Y));
  const head = new THREE.SphereGeometry(0.31, 16, 12); head.translate(0, 0.52, 0.36); parts.push(paint(head, Y));
  const beak = new THREE.SphereGeometry(0.16, 10, 6); beak.scale(1.15, 0.42, 1.25); beak.translate(0, 0.45, 0.68); parts.push(paint(beak, O));
  for (const x of [-0.14, 0.14]) { const e = new THREE.SphereGeometry(0.045, 8, 6); e.translate(x, 0.62, 0.62); parts.push(paint(e, K)); }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  g.translate(0, -0.1, 0);
  return g;
}

// an old brass key: a ring to hold it by, the shaft, the bit with its teeth (bow up)
export function keyGeometry() {
  const parts = [];
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  const B = [1, 0.78, 0.36], D = [0.8, 0.56, 0.22];
  const bow = new THREE.TorusGeometry(0.3, 0.075, 8, 22); bow.translate(0, 0.62, 0); parts.push(paint(bow, B));
  for (const a of [0, Math.PI / 2]) { const c = new THREE.BoxGeometry(0.46, 0.05, 0.05); c.rotateZ(a); c.translate(0, 0.62, 0); parts.push(paint(c, D)); }
  const collar = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10); collar.translate(0, 0.26, 0); parts.push(paint(collar, B));
  const shaft = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 10); shaft.translate(0, -0.3, 0); parts.push(paint(shaft, B));
  for (const [y, w] of [[-0.62, 0.26], [-0.74, 0.2], [-0.5, 0.16]]) { const t = new THREE.BoxGeometry(w, 0.09, 0.05); t.translate(w / 2, y, 0); parts.push(paint(t, B)); }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  return g;
}

// a white lily, open toward +z, a bit of stem behind it and a leaf
export function lilyGeometry() {
  const parts = [];
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  const W = [1, 0.98, 0.95], P = [1, 0.86, 0.9], G = [0.36, 0.6, 0.26], O = [0.86, 0.36, 0.1];
  for (let k = 0; k < 6; k++) {
    const pe = new THREE.SphereGeometry(1, 10, 6); pe.scale(0.17, 0.62, 0.05); pe.translate(0, 0.52, 0);
    pe.rotateX(0.85 + (k % 2) * 0.18); pe.rotateY((k / 6) * Math.PI * 2 + (k % 2) * 0.25);
    parts.push(paint(pe, k % 2 ? W : P));
  }
  const th = new THREE.CylinderGeometry(0.13, 0.04, 0.4, 8); th.translate(0, 0.18, 0); parts.push(paint(th, [0.8, 0.88, 0.6]));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const an = new THREE.SphereGeometry(0.035, 5, 4); an.scale(1, 2.2, 1); an.translate(Math.cos(a) * 0.1, 0.62, Math.sin(a) * 0.1); parts.push(paint(an, O)); }
  const st = new THREE.CylinderGeometry(0.03, 0.035, 0.9, 6); st.translate(0, -0.42, 0); parts.push(paint(st, G));
  const lf = new THREE.SphereGeometry(1, 8, 5); lf.scale(0.09, 0.42, 0.025); lf.rotateZ(0.7); lf.translate(0.2, -0.5, 0); parts.push(paint(lf, G));
  const g = mergeGeometries(parts, false);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// a candy corn: yellow at the base, orange through the middle, a white tip
export function cornGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.45, -0.5); s.quadraticCurveTo(0, -0.62, 0.45, -0.5); s.quadraticCurveTo(0.3, 0.2, 0.06, 0.58); s.quadraticCurveTo(0, 0.64, -0.06, 0.58); s.quadraticCurveTo(-0.3, 0.2, -0.45, -0.5);
  let g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -0.14);
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); c.set(y < -0.17 ? [1, 0.8, 0.14] : y < 0.22 ? [1, 0.46, 0.06] : [1, 0.98, 0.94], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// a microchip: the black package, gold legs down both sides, her teal light in the middle
export function chipGeometry() {
  const parts = [];
  const paintG = (g, c) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  parts.push(paintG(box(0.9, 0.9, 0.2, 0, 0, 0), [0.07, 0.07, 0.09]));
  parts.push(paintG(box(0.5, 0.5, 0.06, 0, 0, 0.11), [0.3, 1.0, 0.92]));
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const y = -0.36 + k * 0.18; parts.push(paintG(box(0.26, 0.07, 0.06, s * 0.57, y, -0.05), [1, 0.78, 0.3])); parts.push(paintG(box(0.07, 0.26, 0.06, y, s * 0.57, -0.05), [1, 0.78, 0.3])); }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  return g;
}

// a guitar pick: a rounded triangle, gold, a little pearl in it
export function pickGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.62); s.quadraticCurveTo(0.2, -0.5, 0.48, 0.12); s.quadraticCurveTo(0.6, 0.48, 0.22, 0.56); s.quadraticCurveTo(0, 0.6, -0.22, 0.56); s.quadraticCurveTo(-0.6, 0.48, -0.48, 0.12); s.quadraticCurveTo(-0.2, -0.5, 0, -0.62);
  let g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -0.04);
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.15 * Math.sin(p.getX(i) * 9 + p.getY(i) * 7); c.set([1 * k, 0.8 * k, 0.42 * k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// a gold star, five points, a little bevel to catch the light
export function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.27 : 0.66; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  let g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 2 });
  g.translate(0, 0, -0.05);
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.18 * Math.sin(p.getX(i) * 8 + p.getY(i) * 6); c.set([1 * k, 0.82 * k, 0.36 * k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// a gold coin, a star struck on both faces
export function coinGeometry() {
  const parts = [];
  const add = (g) => parts.push(g.index ? g.toNonIndexed() : g);
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 28).rotateX(Math.PI / 2));
  add(new THREE.TorusGeometry(0.47, 0.05, 6, 28));
  for (const z of [0.06, -0.06]) { const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.12 : 0.28; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); g.translate(0, 0, z > 0 ? 0.05 : -0.08); add(g); }
  const g = mergeGeometries(parts, false);
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.15 * Math.sin(p.getX(i) * 7 + p.getY(i) * 5); c.set([1 * k, 0.8 * k, 0.32 * k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// a quill: a white feather, its shaft, a gold nib
export function quillGeometry() {
  const parts = [];
  const add = (g, c) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = 0.85 + 0.15 * Math.sin(g.attributes.position.getY(i) * 20); a.set([c[0] * k, c[1] * k, c[2] * k], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g); };
  const s = new THREE.Shape(); s.moveTo(0, -0.25); s.quadraticCurveTo(0.26, -0.05, 0.2, 0.4); s.quadraticCurveTo(0.12, 0.62, 0.02, 0.72); s.quadraticCurveTo(-0.12, 0.5, -0.14, 0.2); s.quadraticCurveTo(-0.14, -0.05, 0, -0.25);
  const vane = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); vane.translate(0, 0, -0.015); add(vane, [1, 0.97, 0.9]);
  add(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 6).translate(0, 0.2, 0), [0.95, 0.9, 0.75]);
  add(new THREE.ConeGeometry(0.05, 0.18, 6).rotateX(Math.PI).translate(0, -0.44, 0), [1, 0.78, 0.3]);
  const g = mergeGeometries(parts, false); g.rotateZ(-0.35); g.computeVertexNormals();
  return g;
}

// a snowflake: six arms, a pair of little branches on each
export function flakeGeometry() {
  const parts = [];
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const arm = new THREE.BoxGeometry(0.09, 0.62, 0.05); arm.translate(0, 0.31, 0); arm.rotateZ(a); parts.push(arm.toNonIndexed()); for (const s of [-1, 1]) { const b = new THREE.BoxGeometry(0.07, 0.22, 0.05); b.translate(0, 0.11, 0); b.rotateZ(s * 0.75); b.translate(0, 0.36, 0); b.rotateZ(a); parts.push(b.toNonIndexed()); } }
  const hub = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6).rotateX(Math.PI / 2); parts.push(hub.toNonIndexed());
  for (const g of parts) g.deleteAttribute('uv');
  const g = mergeGeometries(parts, false);
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); c.set([0.75 + 0.25 * r, 0.92 + 0.08 * r, 1], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// a light bulb: the glass, the neck, the screw base
export function bulbGeometry() {
  const parts = [];
  const add = (g, c) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g); };
  add(new THREE.LatheGeometry([[0.2, 0], [0.22, 0.12], [0.34, 0.32], [0.45, 0.55], [0.48, 0.75], [0.44, 0.92], [0.32, 1.05], [0.16, 1.11], [0, 1.13]].map(([r, y]) => new THREE.Vector2(r, y)), 20), [1, 0.9, 0.62]);
  add(new THREE.CylinderGeometry(0.2, 0.19, 0.34, 16).translate(0, -0.17, 0), [0.42, 0.43, 0.47]);
  for (const y of [-0.06, -0.16, -0.26]) add(new THREE.TorusGeometry(0.2, 0.03, 6, 16).rotateX(Math.PI / 2).translate(0, y, 0), [0.36, 0.37, 0.41]);
  add(new THREE.CylinderGeometry(0.09, 0.05, 0.08, 10).translate(0, -0.38, 0), [0.1, 0.1, 0.1]);
  const g = mergeGeometries(parts, false); g.computeVertexNormals(); g.translate(0, -0.38, 0);
  return g;
}

// a pearl
export function pearlGeometry() {
  let g = new THREE.SphereGeometry(0.42, 20, 14);
  g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, a = new Float32Array(n * 3), P = g.attributes.position; for (let i = 0; i < n; i++) { const y = P.getY(i); a.set([1, 0.95 + 0.03 * y, 0.92 + 0.05 * y], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// an ember: a chip of something red hot
export function emberGeometry() {
  let g = new THREE.IcosahedronGeometry(0.5, 0); g.scale(1, 1.3, 0.9);
  g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = 0.75 + 0.25 * Math.sin(i * 1.7); a.set([1, 0.45 * k, 0.12 * k], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.computeVertexNormals();
  return g;
}

// a like: a heart, bevelled
export function likeGeometry() {
  const sh = new THREE.Shape(); sh.moveTo(0, -0.5); sh.bezierCurveTo(-0.2, -0.3, -0.7, 0, -0.6, 0.35); sh.bezierCurveTo(-0.5, 0.65, -0.1, 0.65, 0, 0.32); sh.bezierCurveTo(0.1, 0.65, 0.5, 0.65, 0.6, 0.35); sh.bezierCurveTo(0.7, 0, 0.2, -0.3, 0, -0.5);
  let g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 12 }); g.translate(0, 0, -0.09);
  g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([1, 0.28, 0.52], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.computeVertexNormals();
  return g;
}

// an apple: red, a stalk, a leaf
export function appleGeometry() {
  const parts = [];
  const add = (g, c) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g); };
  const body = new THREE.SphereGeometry(0.42, 18, 14); const p = body.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), r = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, y * 0.92 - 0.08 * Math.exp(-r * r * 30) * Math.sign(y)); } add(body, [0.95, 0.12, 0.1]);
  add(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 6).translate(0.02, 0.45, 0), [0.35, 0.22, 0.1]);
  const leaf = new THREE.SphereGeometry(0.14, 8, 6); leaf.scale(1.4, 0.18, 0.7); leaf.rotateZ(0.5); leaf.translate(0.16, 0.5, 0); add(leaf, [0.3, 0.7, 0.2]);
  const g = mergeGeometries(parts, false); g.computeVertexNormals();
  return g;
}

// How each kind of pickup is made, lit and moved. move(e, time, i, faceYaw) sets the Euler e.
// lit: how bright one still to come is; s: its size; near: how it shrinks right in front of the lens.
const std = (o) => ({ rough: 0.3, metal: 0.2, emissive: 0x2a2018, ...o });
const turn = (ax, ry, az, sx = 1.4, sz = 1.2) => (e, time, i) => e.set(Math.sin(time * sx + i) * ax, time * ry + i * 1.3, Math.sin(time * sz + i) * az);
const PICKUP = {
  diamond: { basic: true, s: 1, near: 'diamond', move: (e, time, i) => e.set(0, time * 2.5 + i, 0) },
  duck: { geo: duckGeometry, color: 0xffd23a, mat: std({ rough: 0.32, metal: 0, emissive: 0x3a2a00 }), s: 1.25, lit: 1.15, near: 'big', face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 3.1 + i) * 0.12, yaw + Math.sin(time * 1.7 + i * 2.3) * 0.35, Math.sin(time * 2.3 + i) * 0.15) },
  key: { geo: keyGeometry, color: 0xffc860, mat: std({ rough: 0.28, metal: 0.65, emissive: 0x4a3008 }), s: 1.55, lit: 1.25, move: (e, time, i) => e.set(Math.sin(time * 1.9 + i) * 0.15, time * 2.2 + i * 1.7, Math.sin(time * 2.6 + i) * 0.12) },
  lily: { geo: lilyGeometry, color: 0xfff2f6, mat: std({ rough: 0.45, metal: 0, emissive: 0x3a3436 }), s: 1.05, lit: 1.15, face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 2.1 + i) * 0.2 - 0.25, yaw + Math.sin(time * 1.3 + i * 2.3) * 0.4, time * 0.8 + i) },
  corn: { geo: cornGeometry, color: 0xffb060, mat: std({ rough: 0.35, metal: 0, emissive: 0x3a2008 }), s: 1.5, move: turn(0.25, 2.0, 0.2, 2.4, 1.7) },
  chip: { geo: chipGeometry, color: 0x46f0e0, mat: std({ rough: 0.3, metal: 0.4, emissive: 0x0a2a28, glowGreen: true }), s: 1.45, lit: 1.15, move: turn(0.35, 2.4, 0.25, 2.2, 1.6) },
  pick: { geo: pickGeometry, color: 0xfff0c0, mat: std({ rough: 0.25, metal: 0.3, emissive: 0x3a2a10 }), s: 1.6, move: turn(0.3, 2.6, 0.3, 2.0, 1.4) },
  star: { geo: starGeometry, color: 0xffe08a, mat: std({ rough: 0.22, metal: 0.35, emissive: 0x3a2a0a }), s: 1.6, move: turn(0.25, 2.8, 0.2, 1.8, 1.3) },
  coin: { geo: coinGeometry, color: 0xffd860, mat: std({ rough: 0.2, metal: 0.55, emissive: 0x3a2808 }), s: 1.6, move: (e, time, i) => e.set(Math.sin(time * 1.6 + i) * 0.15, time * 3.4 + i * 1.3, 0) },
  quill: { geo: quillGeometry, color: 0xfff0d0, mat: std({ rough: 0.5, metal: 0.1, emissive: 0x3a3020, side: THREE.DoubleSide }), s: 2.0, move: turn(0.2, 1.8, 0.15, 1.5, 1.1) },
  flake: { geo: flakeGeometry, color: 0xd8f8ff, mat: std({ rough: 0.15, metal: 0.2, emissive: 0x2a4a5a }), s: 1.7, lit: 1.25, move: (e, time, i) => e.set(Math.sin(time * 1.4 + i) * 0.4, time * 2.2 + i * 1.3, time * 0.8 + i) },
  apple: { geo: appleGeometry, color: 0xff3a2a, mat: std({ rough: 0.25, metal: 0.05, emissive: 0x3a0808 }), s: 1.15, move: turn(0.2, 2.0, 0.2, 1.3, 1.1) },
  bulb: { geo: bulbGeometry, color: 0xffd080, mat: std({ rough: 0.2, metal: 0.1, emissive: 0xffffff, emissiveK: 1.1, glowColour: true }), s: 1.4, lit: 1.15, move: turn(0.25, 1.2, 0.2, 1.6, 1.2) },
  like: { geo: likeGeometry, color: 0xff4a8a, mat: std({ rough: 0.2, metal: 0.1, emissive: 0xff2a6a, emissiveK: 0.6 }), s: 1.9, lit: 1.15, beat: 0.12, move: (e, time, i) => e.set(Math.sin(time * 1.4 + i) * 0.15, Math.sin(time * 1.1 + i * 1.3) * 0.9, Math.sin(time * 1.2 + i) * 0.1) },
  ember: { geo: emberGeometry, color: 0xffa040, mat: std({ rough: 0.6, metal: 0.1, emissive: 0xff5a10, emissiveK: 1.2, flat: true }), s: 1.7, lit: 1.0, flicker: true, move: (e, time, i) => e.set(time * 1.7 + i, time * 2.3 + i * 1.3, time * 1.1) },
  pearl: { geo: pearlGeometry, color: 0xfff4ec, mat: std({ rough: 0.12, metal: 0.3, emissive: 0xfff0e4, emissiveK: 0.22, colour: 0xf4ece4 }), s: 1.2, lit: 1.0, move: (e, time, i) => e.set(time * 0.9 + i, time * 1.4 + i * 1.3, 0) },
  // the new ones
  lips: { geo: lipsGeometry, color: 0xff3a5a, mat: std({ rough: 0.14, metal: 0.25, emissive: 0x5a0410 }), s: 1.15, lit: 1.2, beat: 0.1, face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 1.5 + i) * 0.15, yaw + Math.sin(time * 1.2 + i * 1.7) * 0.6, Math.sin(time * 1.1 + i) * 0.12) },
  shell: { geo: shellGeometry, color: 0xffc8a8, mat: std({ rough: 0.3, metal: 0.25, emissive: 0x4a2a20 }), s: 1.5, lit: 1.2, face: true, move: (e, time, i, yaw) => e.set(-0.2 + Math.sin(time * 1.3 + i) * 0.15, yaw + Math.sin(time * 0.9 + i * 1.9) * 0.7, Math.sin(time * 1.6 + i) * 0.2) },
  candy: { geo: candyGeometry, color: 0xff5aa0, mat: std({ rough: 0.18, metal: 0.15, emissive: 0x4a0a28 }), s: 1.35, lit: 1.2, move: (e, time, i) => e.set(Math.sin(time * 1.2 + i) * 0.3, time * 1.6 + i, time * 2.6 + i * 0.7) },
  perfume: { geo: perfumeGeometry, color: 0xff9ad0, mat: std({ rough: 0.08, metal: 0.35, emissive: 0x5a1838 }), s: 1.35, lit: 1.25, move: turn(0.18, 1.9, 0.18, 1.5, 1.1) },
  donut: { geo: donutGeometry, color: 0xff8ac0, mat: std({ rough: 0.4, metal: 0.05, emissive: 0x3a1420 }), s: 1.35, lit: 1.2, face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 1.4 + i) * 0.2, yaw + time * 1.4 + i, Math.sin(time * 1.1 + i) * 0.15) },
  cuffs: { geo: cuffsGeometry, color: 0xffd060, mat: std({ rough: 0.18, metal: 0.75, emissive: 0x4a3008 }), s: 1.5, lit: 1.3, move: (e, time, i) => e.set(Math.sin(time * 1.8 + i) * 0.35, time * 2.0 + i * 1.3, Math.sin(time * 2.4 + i) * 0.25) },
  coffee: { geo: coffeeGeometry, color: 0xfff2e0, mat: std({ rough: 0.45, metal: 0.05, emissive: 0x2a2420 }), s: 1.25, lit: 1.2, move: turn(0.15, 1.6, 0.15, 1.3, 1.0) },
  crown: { geo: crownGeometry, color: 0xffd860, mat: std({ rough: 0.2, metal: 0.7, emissive: 0x4a3410 }), s: 1.4, lit: 1.3, move: (e, time, i) => e.set(0.35 + Math.sin(time * 1.5 + i) * 0.15, time * 1.8 + i * 1.3, Math.sin(time * 1.2 + i) * 0.15) },
  popsicle: { geo: popsicleGeometry, color: 0xff7a8a, mat: std({ rough: 0.25, metal: 0.05, emissive: 0x3a1418 }), s: 1.25, lit: 1.25, move: turn(0.25, 1.8, 0.3, 1.7, 1.3) },
  drink: { geo: drinkGeometry, color: 0x60ffe0, mat: std({ rough: 0.08, metal: 0.3, emissive: 0x0a4a40, emissiveK: 1.3 }), s: 1.4, lit: 1.2, beat: 0.08, move: turn(0.12, 1.6, 0.12, 1.4, 1.1) },
  pin: { geo: pinGeometry, color: 0xff3040, mat: std({ rough: 0.2, metal: 0.2, emissive: 0x5a0810 }), s: 1.45, lit: 1.25, bob: 0.25, move: (e, time, i) => e.set(0, time * 2.2 + i * 1.3, 0) },
  heart: { geo: realHeartGeometry, color: 0xff2a40, mat: std({ rough: 0.22, metal: 0.15, emissive: 0x6a0812 }), s: 1.45, lit: 1.25, beat: 0.22, move: (e, time, i) => e.set(Math.sin(time * 1.2 + i) * 0.2, time * 1.3 + i * 1.3, Math.sin(time * 1.4 + i) * 0.15) },
  polaroid: { geo: polaroidGeometry, color: 0xf4f0e8, mat: std({ rough: 0.35, metal: 0.05, emissive: 0x3a3430 }), s: 1.5, lit: 1.2, face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 1.3 + i) * 0.15, yaw + Math.sin(time * 1.1 + i * 1.7) * 0.5, Math.sin(time * 0.9 + i) * 0.12) },
  whistle: { geo: whistleGeometry, color: 0xff5a2a, mat: std({ rough: 0.25, metal: 0.1, emissive: 0x4a1008 }), s: 1.35, lit: 1.2, move: turn(0.25, 2.2, 0.2, 1.7, 1.3) },
  cup: { geo: cupGeometry, color: 0xe8302a, mat: std({ rough: 0.3, metal: 0.05, emissive: 0x4a0808 }), s: 1.45, lit: 1.2, move: turn(0.25, 1.8, 0.2, 1.5, 1.2) },
  w: { geo: wGeometry, color: 0xffd84a, mat: std({ rough: 0.18, metal: 0.65, emissive: 0x4a3008 }), s: 1.5, lit: 1.3, face: true, move: (e, time, i, yaw) => e.set(Math.sin(time * 1.6 + i) * 0.12, yaw + Math.sin(time * 1.3 + i * 1.7) * 0.5, Math.sin(time * 1.1 + i) * 0.1) },
  tab: { geo: tabGeometry, color: 0xf6f4ee, mat: std({ rough: 0.65, metal: 0, emissive: 0x2a3038, side: THREE.DoubleSide }), s: 1.6, lit: 1.2, move: (e, time, i) => e.set(Math.sin(time * 2.0 + i) * 0.45, time * 1.7 + i * 1.3, Math.sin(time * 2.6 + i) * 0.35) },
};
// the songs added 28 Oct 2026 keep their pickup in their own props file:
// { key, geo, color, mat (std's options), s, lit, face, beat, bob, flicker, move }
for (const p of [hglPickup, ptdPickup, itdPickup, gcoPickup, gsaPickup, mmsPickup, tmfPickup]) if (p) PICKUP[p.key] = { ...p, mat: std(p.mat) };
export const PICKUP_KINDS = Object.keys(PICKUP);

// Pickups to steer through, each one a note of a melody. Collected ones fly into the board;
// missed ones go grey and drop away, so you always know which it was.
export class Notes {
  constructor(scene, course, P, kind) {
    this.course = course;
    this.kind = PICKUP[kind] ? kind : 'diamond';
    const K = this.K = PICKUP[this.kind];
    let g;
    if (K.basic) {
      g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(0.8, 1.25, 0.8);
      this.color = new THREE.Color(P.gem ?? P.glow).lerp(new THREE.Color(P.fret), 0.3);
      this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    } else {
      g = K.geo();
      this.color = new THREE.Color(P.gem ?? K.color);
      const m = K.mat;
      this.mat = new THREE.MeshStandardMaterial({ color: m.colour ?? 0xffffff, vertexColors: true, roughness: m.rough, metalness: m.metal, emissive: new THREE.Color(m.emissive), emissiveIntensity: m.emissiveK ?? 1, flatShading: !!m.flat, side: m.side ?? THREE.FrontSide });
      if (m.glowGreen) this.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * step(0.9, vColor.g) * 1.4;'); };
      if (m.glowColour) this.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
    }
    this.mesh = new THREE.InstancedMesh(g, this.mat, 256);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    // a soft halo per pickup, and a ring of light on the ribbon under it so you can read where it is across
    this.haloMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`,
      fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vC * (exp(-d * d * 5.0) * 0.8 + exp(-d * d * 40.0) * 0.6), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    const hg = new THREE.PlaneGeometry(1, 1);
    this.haloCol = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); this.haloCol.setUsage(THREE.DynamicDrawUsage);
    hg.setAttribute('aCol', this.haloCol);
    this.halo = new THREE.InstancedMesh(hg, this.haloMat, 256);
    this.halo.frustumCulled = false; this.halo.count = 0; scene.add(this.halo);
    this.spotMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.78) / 0.09, 2.0)); gl_FragColor = vec4(vC * (ring * 0.9 + exp(-d * d * 3.0) * 0.35) * (1.0 - smoothstep(0.92, 1.0, d)), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.spotCol = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); this.spotCol.setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('aCol', this.spotCol);
    this.spot = new THREE.InstancedMesh(sg, this.spotMat, 256);
    this.spot.frustumCulled = false; this.spot.count = 0; scene.add(this.spot);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this._b = new THREE.Vector3(); this._g = new THREE.Vector3(); this._c = new THREE.Color(); this._w = new THREE.Color(1, 1, 1); this._h = new THREE.Color();
    this.lo = 0;
  }

  update(track, rider, time, board, cam, beat = 0, groovy = 0) {
    const notes = this.course.notes, t = rider.t, K = this.K;
    while (this.lo < notes.length && notes[this.lo].t < t - 1.5) this.lo++;
    if (this.lo > 0 && notes[this.lo - 1] && notes[this.lo - 1].t > t) this.lo = 0;
    let k = 0;
    const m = this._m, p = this._p, q = this._q, s = this._s, col = this._c;
    if (board) board.getWorldPosition(this._b);
    for (let i = this.lo; i < notes.length && k < 256; i++) {
      const n = notes[i];
      if (n.t > t + 9) break;
      let scale = n.bar ? 1.2 : 0.95, bright = 2.4;
      col.copy(this.color);
      const ahead = n.t - t;
      track.at(n.t, n.x, 1.2 + 0.12 * Math.sin(time * 4 + i) + (K.bob ? K.bob * Math.abs(Math.sin(time * 3 + i)) : 0), p);
      if (n.got) {
        // flies into the board and is gone
        // (shrinking all the way: one that swelled as it went in stood between the camera and her,
        // and on a rail, where there's one a beat, she was hidden behind them)
        const age = t - (n.gotT ?? t);
        if (age > 0.13) continue;
        const f = Math.max(0, age) / 0.13;
        p.lerp(this._b, f * (2 - f));
        scale *= (1 - f) * (1 - f) * 0.9;
        bright = 4;
        col.lerp(this._w, 0.5);
      } else if (ahead < -0.02) {
        // missed: goes grey and drops away
        const age = -ahead;
        if (age > 0.5) continue;
        col.setRGB(0.28, 0.27, 0.32);
        bright = 1.2 * (1 - age * 2);
        p.y -= age * age * 14;
        scale *= 1 - age * 1.2;
      } else if (n.mag) {
        // Groovy: pulled in to her, slow then fast, arcing up and over on the way (it arrives as she
        // reaches its beat, so its note still lands there)
        const span = Math.max(0.05, n.t - (n.magT ?? t));
        const u = clamp(1 - Math.max(0, ahead) / span, 0, 1), e = u * u * (3 - 2 * u);
        p.lerp(this._b, e);
        p.y += Math.sin(u * Math.PI) * 0.9;
        scale *= 1 + 0.35 * Math.sin(u * Math.PI);
        bright *= 1.5;
      } else {
        // the next few burn a little brighter
        bright *= 1 + 0.35 * Math.exp(-Math.max(0, ahead) * 1.5);
      }
      // and in a Groovy every one of them takes a colour of its own, turning
      if (groovy > 0.01) col.lerp(this._h.setHSL(((i * 0.13 + time * 0.35) % 1 + 1) % 1, 1, 0.62), 0.75 * groovy);
      // right in front of the lens they'd fill the screen: fade the ones about to pass under the camera
      if (cam && !n.got) {
        const d = p.distanceTo(cam.position);
        const kk = clamp((d - 2.5) / 6, 0, 1);
        bright *= 0.25 + 0.75 * kk;
        scale *= K.near === 'big' ? kk * (2 - kk) : K.near === 'diamond' ? 0.55 + 0.45 * kk : kk * kk;
      }
      // some of them beat with the song
      if (K.beat && !n.got && ahead > -0.02) scale *= 1 + K.beat * beat;
      const yaw = K.face ? this.course.sample(n.t).yaw + Math.PI : 0;
      K.move(this._e, time, i, yaw);
      q.setFromEuler(this._e);
      s.setScalar(scale * K.s);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(k, m);
      if (K.basic) this.mesh.instanceColor.setXYZ(k, col.r * bright, col.g * bright, col.b * bright);
      else {
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : (K.lit ?? 1.2) * (K.flicker ? 1 + 0.3 * Math.sin(time * 9 + i) : 1));
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      }
      s.setScalar(scale * 3.4);
      m.compose(p, q.identity(), s);
      this.halo.setMatrixAt(k, m);
      const hb = (n.got ? 1.2 : (ahead < -0.02 ? 0.15 : 0.7)) * Math.min(1, bright / 2.4);
      this.haloCol.setXYZ(k, col.r * hb, col.g * hb, col.b * hb);
      // the ring of light on the ribbon under it, only while it's still to come
      const gp = track.at(n.t, n.x, 0.05, this._g);
      const sb = !n.got && !n.mag && ahead > -0.02 ? 0.55 * (1 - clamp((ahead - 4) / 3, 0, 1)) : 0;
      m.compose(gp, this._q.identity(), s.set(1.9, 1, 1.9));
      this.spot.setMatrixAt(k, m);
      this.spotCol.setXYZ(k, col.r * sb, col.g * sb, col.b * sb);
      k++;
    }
    this.mesh.count = k; this.halo.count = k; this.spot.count = k;
    this.mesh.instanceMatrix.needsUpdate = true; this.halo.instanceMatrix.needsUpdate = true; this.spot.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true; this.haloCol.needsUpdate = true; this.spotCol.needsUpdate = true;
  }
}

// shockwaves round the board when you hit a pump: they travel with you, opening out to the rails.
// The road under them curves (up out of a dip, up at the lipped edges), so a flat disc sank into
// it and only half of each ring showed: the ring bends to the road's surface instead, all the way round.
const RING_VS = /* glsl */`
  uniform vec3 uC, uF, uR, uU; uniform float uK, uX0, uHW, uG;
  varying vec2 vUv;
  float lip(float x){ float u = clamp(abs(x) / uHW, 0.0, 1.0); return 0.55 * pow(u, 6.0); }
  void main(){
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec3 o = w.xyz - uC;
    float d = dot(o, uF), x = dot(o, uR);
    w.xyz += uU * ((uK * d * d + lip(uX0 + x) - lip(uX0)) * uG + 0.05);
    gl_Position = projectionMatrix * (viewMatrix * w);
  }`;
export class Rings {
  constructor(scene, n = 10) {
    this.items = [];
    const g = new THREE.PlaneGeometry(2, 2, 24, 24); g.rotateX(-Math.PI / 2);
    this.u = {   // where the road is under her this frame, shared by every ring
      uC: { value: new THREE.Vector3() }, uF: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3() }, uU: { value: new THREE.Vector3(0, 1, 0) },
      uK: { value: 0 }, uX0: { value: 0 }, uHW: { value: 8 }, uG: { value: 1 },
    };
    for (let i = 0; i < n; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...this.u, uCol: { value: new THREE.Color() }, uA: { value: 0 }, uW: { value: 0.08 } },
        vertexShader: RING_VS,
        fragmentShader: `uniform vec3 uCol; uniform float uA, uW; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.9) / uW, 2.0)); float fill = smoothstep(0.35, 0.9, d) * 0.06; gl_FragColor = vec4(uCol * (ring * 1.9 + fill) * uA * (1.0 - smoothstep(0.97, 1.0, d)), 1.0); }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      });
      const mesh = new THREE.Mesh(g, mat); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 5;
      scene.add(mesh);
      this.items.push({ mesh, mat, age: 1, life: 0.4, size: 6 });
    }
    this.next = 0;
    this._p = new THREE.Vector3(); this._f = new THREE.Vector3(); this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._z = new THREE.Vector3(); this._m = new THREE.Matrix4();
  }
  fire(color, size = 6, life = 0.42, width = 0.08, delay = 0) {
    const it = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
    it.age = -delay; it.life = life; it.size = size; it.mat.uniforms.uCol.value.set(color); it.mat.uniforms.uW.value = width;
  }
  update(track, rider, dt) {
    const t = rider.t;
    let placed = false;
    for (const it of this.items) {
      it.age += dt;
      const f = it.age / it.life;
      it.mesh.visible = f >= 0 && f < 1;
      if (!it.mesh.visible) continue;
      if (!placed) {
        // on the ribbon under the board, tilted with it
        const c = rider.course, s = c.sample(t), above = rider.y - s.y;
        track.at(t, rider.x, Math.max(0.08, above + 0.08), this._p);
        const fwd = track.dirAt(t, this._f);
        // (the ribbon raises its right edge for a positive bank; turning the right vector about
        // the forward axis by +bank lowers it, so it's -bank: the other way round, half of every
        // ring in a turn went under the road)
        const right = this._r.set(-fwd.z, 0, fwd.x).normalize().applyAxisAngle(fwd, -track.bankAt(t));
        const up = this._u.crossVectors(right, fwd).normalize();
        if (up.y < 0) up.negate();
        const z = this._z.crossVectors(right, up).normalize();
        this._m.makeBasis(right, up, z);
        // how the road bends away from that flat plane: along it (its curvature, per metre
        // squared) and across it (the lipped edges); in the air the ring stays flat under her
        const v = Math.max(8, track.speedAt(t));
        const k = 0.5 * (s.ay || 0) / (v * v);
        const U = this.u;
        U.uC.value.copy(this._p); U.uF.value.copy(fwd); U.uR.value.copy(right); U.uU.value.copy(up);
        U.uK.value = k; U.uX0.value = rider.x; U.uHW.value = Math.max(1, s.width);
        U.uG.value = Math.max(0, Math.min(1, 1 - (above - 0.6) / 1.2));
        placed = true;
      }
      it.mesh.position.copy(this._p);
      it.mesh.quaternion.setFromRotationMatrix(this._m);
      const e = 1 - Math.pow(1 - f, 3);
      it.mesh.scale.setScalar(0.4 + it.size * e);
      it.mat.uniforms.uA.value = (1 - f) * (1 - f);
    }
  }
}
