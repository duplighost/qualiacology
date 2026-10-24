// What tells you how you're doing, in the world: the diamonds you steer through, and
// the shockwave round the board when you hit a pump.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

// diamonds to steer through, each one a note of a melody. Collected ones fly into the
// board; missed ones go grey and drop away, so you always know which it was.
export class Notes {
  constructor(scene, course, P, kind) {
    this.course = course;
    this.duck = kind === 'duck';
    this.key = kind === 'key';
    this.lily = kind === 'lily';
    this.corn = kind === 'corn';
    this.chip = kind === 'chip';
    this.pick = kind === 'pick';
    this.star = kind === 'star';
    this.coin = kind === 'coin';
    this.quill = kind === 'quill';
    this.flake = kind === 'flake';
    this.apple = kind === 'apple';
    this.bulb = kind === 'bulb';
    this.like = kind === 'like';
    this.ember = kind === 'ember';
    this.pearl = kind === 'pearl';
    let g;
    if (this.pearl) {
      // Your Wife, My Number: loose pearls
      g = pearlGeometry();
      this.color = new THREE.Color(P.gem ?? 0xfff4ec);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xf4ece4, vertexColors: true, roughness: 0.12, metalness: 0.3, emissive: 0xfff0e4, emissiveIntensity: 0.22 });
    } else if (this.ember) {
      // Until She Stopped Fighting: embers, red hot
      g = emberGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffa040);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0.1, emissive: 0xff5a10, emissiveIntensity: 1.2, flatShading: true });
    } else if (this.like) {
      // So Pretty When You Cry: likes, hearts that glow
      g = likeGeometry();
      this.color = new THREE.Color(P.gem ?? 0xff4a8a);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.2, metalness: 0.1, emissive: 0xff2a6a, emissiveIntensity: 0.6 });
    } else if (this.bulb) {
      // Make It A No: light bulbs, left on
      g = bulbGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffd080);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.2, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 1.1 });
      this.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
    } else if (this.apple) {
      // I FUCKED YOUR DAD: apples, off the tree
      g = appleGeometry();
      this.color = new THREE.Color(P.gem ?? 0xff3a2a);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.25, metalness: 0.05, emissive: new THREE.Color(0x3a0808), emissiveIntensity: 1 });
    } else if (this.flake) {
      // Good Girls Don't Fight Back: snowflakes
      g = flakeGeometry();
      this.color = new THREE.Color(P.gem ?? 0xd8f8ff);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.15, metalness: 0.2, emissive: new THREE.Color(0x2a4a5a), emissiveIntensity: 1 });
    } else if (this.quill) {
      // ETYMOLOGY OF SCREAMS: quills, for the writing
      g = quillGeometry();
      this.color = new THREE.Color(P.gem ?? 0xfff0d0);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0.1, emissive: new THREE.Color(0x3a3020), emissiveIntensity: 1, side: THREE.DoubleSide });
    } else if (this.coin) {
      // Cunt Holiday: gold coins, all of it charged to him
      g = coinGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffd860);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.2, metalness: 0.55, emissive: new THREE.Color(0x3a2808), emissiveIntensity: 1 });
    } else if (this.star) {
      // Come Countdown: gold stars, the kind you get for trying
      g = starGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffe08a);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.22, metalness: 0.35, emissive: new THREE.Color(0x3a2a0a), emissiveIntensity: 1 });
    } else if (this.pick) {
      // Back by Popular Demand: guitar picks
      g = pickGeometry();
      this.color = new THREE.Color(P.gem ?? 0xfff0c0);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.25, metalness: 0.3, emissive: new THREE.Color(0x3a2a10), emissiveIntensity: 1 });
    } else if (this.chip) {
      // AI GF: her chips
      g = chipGeometry();
      this.color = new THREE.Color(P.gem ?? 0x46f0e0);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0.4, emissive: new THREE.Color(0x0a2a28), emissiveIntensity: 1 });
      this.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * step(0.9, vColor.g) * 1.4;'); };
    } else if (this.corn) {
      // Sexy Trauma Costume: candy corn from the bowl by the till
      g = cornGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffb060);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.35, metalness: 0.0, emissive: new THREE.Color(0x3a2008), emissiveIntensity: 1 });
    } else if (this.lily) {
      // Makeup Sex at Your Funeral: lilies from the casket
      g = lilyGeometry();
      this.color = new THREE.Color(P.gem ?? 0xfff2f6);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.45, metalness: 0.0, emissive: new THREE.Color(0x3a3436), emissiveIntensity: 1 });
    } else if (this.key) {
      // Rent Free: the keys he gave her without knowing it
      g = keyGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffc860);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.28, metalness: 0.65, emissive: new THREE.Color(0x4a3008), emissiveIntensity: 1 });
    } else if (this.duck) {
      // A Million Ducks: what you pick up are the ducks from the claw machine
      g = duckGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffd23a);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.0, emissive: new THREE.Color(0x3a2a00), emissiveIntensity: 1 });
    } else {
      g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(0.8, 1.25, 0.8);
      this.color = new THREE.Color(P.gem ?? P.glow).lerp(new THREE.Color(P.fret), 0.3);
      this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    }
    this.mesh = new THREE.InstancedMesh(g, this.mat, 256);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    // a soft halo per diamond, and a ring of light on the ribbon under it so you can read where it is across
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
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.78) / 0.09, 2.0)); gl_FragColor = vec4(vC * (ring * 0.9 + exp(-d * d * 3.0) * 0.35) * (1.0 - smoothstep(0.92, 1.0, d)), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.spotCol = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); this.spotCol.setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('aCol', this.spotCol);
    this.spot = new THREE.InstancedMesh(sg, this.spotMat, 256);
    this.spot.frustumCulled = false; this.spot.count = 0; scene.add(this.spot);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this._b = new THREE.Vector3(); this._g = new THREE.Vector3(); this._c = new THREE.Color(); this._w = new THREE.Color(1, 1, 1);
    this.lo = 0;
  }

  update(track, rider, time, board, cam) {
    const notes = this.course.notes, t = rider.t;
    while (this.lo < notes.length && notes[this.lo].t < t - 1.5) this.lo++;
    let k = 0;
    const m = this._m, p = this._p, q = this._q, s = this._s, col = this._c;
    if (board) board.getWorldPosition(this._b);
    for (let i = this.lo; i < notes.length && k < 256; i++) {
      const n = notes[i];
      if (n.t > t + 9) break;
      let scale = n.bar ? 1.2 : 0.95, bright = 2.4;
      col.copy(this.color);
      const ahead = n.t - t;
      track.at(n.t, n.x, 1.2 + 0.12 * Math.sin(time * 4 + i), p);
      if (n.got) {
        if (n.gotT === undefined) n.gotT = t;
        // flies into the board and is gone
        const age = t - n.gotT;
        if (age > 0.16) continue;
        const f = age / 0.16;
        p.lerp(this._b, f * f);
        scale *= 1.3 - f;
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
      } else {
        // the next few burn a little brighter
        bright *= 1 + 0.35 * Math.exp(-Math.max(0, ahead) * 1.5);
      }
      // right in front of the lens they'd fill the screen: fade the ones about to pass under the camera
      if (cam && !n.got) {
        const d = p.distanceTo(cam.position);
        const k = clamp((d - 2.5) / 6, 0, 1);
        bright *= 0.25 + 0.75 * k; scale *= this.duck ? k * (2 - k) : this.lily || this.corn || this.chip || this.pick || this.star || this.coin || this.quill || this.flake || this.apple || this.bulb || this.like || this.ember || this.pearl ? k * k : 0.55 + 0.45 * k;   // a duck is big: gone before the lens
      }
      if (this.key) {
        // keys hang bow up and turn, catching the light
        this._e.set(Math.sin(time * 1.9 + i) * 0.15, time * 2.2 + i * 1.7, Math.sin(time * 2.6 + i) * 0.12); q.setFromEuler(this._e);
        s.setScalar(scale * 1.55);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.4 : (ahead < -0.02 ? 0.45 : 1.25);
        this.mesh.instanceColor.setXYZ(k, db, db, db * (ahead < -0.02 && !n.got ? 1.1 : 1));
      } else if (this.pearl) {
        // a pearl rolling in the air, catching the light
        this._e.set(time * 0.9 + i, time * 1.4 + i * 1.3, 0); q.setFromEuler(this._e);
        s.setScalar(scale * 1.2);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 1.8 : (ahead < -0.02 ? 0.35 : 1.0);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.ember) {
        // an ember tumbling, flaring as it turns
        this._e.set(time * 1.7 + i, time * 2.3 + i * 1.3, time * 1.1); q.setFromEuler(this._e);
        s.setScalar(scale * 1.7);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.2 : (ahead < -0.02 ? 0.35 : 1.0 + 0.3 * Math.sin(time * 9 + i));
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.like) {
        // a like turning to face you, pulsing on the beat
        this._e.set(Math.sin(time * 1.4 + i) * 0.15, Math.sin(time * 1.1 + i * 1.3) * 0.9, Math.sin(time * 1.2 + i) * 0.1); q.setFromEuler(this._e);
        s.setScalar(scale * 1.9);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.35 : 1.15);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.bulb) {
        // a bulb turning slowly, glass up, swaying as if on its cord
        this._e.set(Math.sin(time * 1.6 + i) * 0.25, time * 1.2 + i * 1.3, Math.sin(time * 1.2 + i) * 0.2); q.setFromEuler(this._e);
        s.setScalar(scale * 1.4);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.35 : 1.15);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.apple) {
        // an apple turning slowly, stalk up
        this._e.set(Math.sin(time * 1.3 + i) * 0.2, time * 2.0 + i * 1.3, Math.sin(time * 1.1 + i) * 0.2); q.setFromEuler(this._e);
        s.setScalar(scale * 1.15);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.flake) {
        // a snowflake turning face-on, glinting as it comes round
        this._e.set(Math.sin(time * 1.4 + i) * 0.4, time * 2.2 + i * 1.3, time * 0.8 + i); q.setFromEuler(this._e);
        s.setScalar(scale * 1.7);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.2 : (ahead < -0.02 ? 0.4 : 1.25);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.quill) {
        // a quill turning slowly in the air, nib down
        this._e.set(Math.sin(time * 1.5 + i) * 0.2, time * 1.8 + i * 1.3, Math.sin(time * 1.1 + i) * 0.15); q.setFromEuler(this._e);
        s.setScalar(scale * 2.0);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.coin) {
        // a coin spinning on its edge, flashing as it comes round
        this._e.set(Math.sin(time * 1.6 + i) * 0.15, time * 3.4 + i * 1.3, 0); q.setFromEuler(this._e);
        s.setScalar(scale * 1.6);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.star) {
        // a star turning in the air, flashing gold as it comes round
        this._e.set(Math.sin(time * 1.8 + i) * 0.25, time * 2.8 + i * 1.3, Math.sin(time * 1.3 + i) * 0.2); q.setFromEuler(this._e);
        s.setScalar(scale * 1.6);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.pick) {
        // a pick turning in the air, flashing gold as it comes round
        this._e.set(Math.sin(time * 2.0 + i) * 0.3, time * 2.6 + i * 1.3, Math.sin(time * 1.4 + i) * 0.3); q.setFromEuler(this._e);
        s.setScalar(scale * 1.6);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.chip) {
        // a chip turning in the air, catching the light on its legs
        this._e.set(Math.sin(time * 2.2 + i) * 0.35, time * 2.4 + i * 1.3, Math.sin(time * 1.6 + i) * 0.25); q.setFromEuler(this._e);
        s.setScalar(scale * 1.45);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.15);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.corn) {
        // candy corn turning in the air, tip up, catching the light
        this._e.set(Math.sin(time * 2.4 + i) * 0.25, time * 2.0 + i * 1.3, Math.sin(time * 1.7 + i) * 0.2); q.setFromEuler(this._e);
        s.setScalar(scale * 1.5);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.2);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.lily) {
        // lilies face you coming, nodding and turning a little on their stems
        const yaw = this.course.sample(n.t).yaw + Math.PI;
        this._e.set(Math.sin(time * 2.1 + i) * 0.2 - 0.25, yaw + Math.sin(time * 1.3 + i * 2.3) * 0.4, time * 0.8 + i); q.setFromEuler(this._e);
        s.setScalar(scale * 1.05);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.0 : (ahead < -0.02 ? 0.4 : 1.15);
        this.mesh.instanceColor.setXYZ(k, db, db, db);
      } else if (this.duck) {
        // ducks face you coming, bobbing as if on water; bigger than a diamond, lit not glowing
        const yaw = this.course.sample(n.t).yaw + Math.PI;
        this._e.set(Math.sin(time * 3.1 + i) * 0.12, yaw + Math.sin(time * 1.7 + i * 2.3) * 0.35, Math.sin(time * 2.3 + i) * 0.15); q.setFromEuler(this._e);
        s.setScalar(scale * 1.25);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.2 : (ahead < -0.02 ? 0.45 : 1.15);
        const dc = ahead < -0.02 && !n.got ? 0.45 : 1;
        this.mesh.instanceColor.setXYZ(k, db * (dc + (1 - dc) * 0.6), db * (dc + (1 - dc) * 0.6), db * (dc + (1 - dc) * 0.7));
      } else {
      this._e.set(0, time * 2.5 + i, 0); q.setFromEuler(this._e);
      s.setScalar(scale);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(k, m);
      this.mesh.instanceColor.setXYZ(k, col.r * bright, col.g * bright, col.b * bright);
      }
      s.setScalar(scale * 3.4);
      m.compose(p, q.identity(), s);
      this.halo.setMatrixAt(k, m);
      const hb = (n.got ? 1.2 : (ahead < -0.02 ? 0.15 : 0.7)) * Math.min(1, bright / 2.4);
      this.haloCol.setXYZ(k, col.r * hb, col.g * hb, col.b * hb);
      // the ring of light on the ribbon under it, only while it's still to come
      const gp = track.at(n.t, n.x, 0.05, this._g);
      const sb = !n.got && ahead > -0.02 ? 0.55 * (1 - clamp((ahead - 4) / 3, 0, 1)) : 0;
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

// shockwaves round the board when you hit a pump: they travel with you, opening out to the rails
export class Rings {
  constructor(scene, n = 10) {
    this.items = [];
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color() }, uA: { value: 0 }, uW: { value: 0.08 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uA, uW; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.9) / uW, 2.0)); float fill = smoothstep(0.35, 0.9, d) * 0.06; float rear = 0.35 + 0.65 * smoothstep(0.12, 0.55, vUv.y); gl_FragColor = vec4(uCol * (ring * 1.9 + fill) * uA * rear * (1.0 - smoothstep(0.97, 1.0, d)), 1.0); }`,
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
        track.at(t, rider.x, Math.max(0.08, rider.y - rider.course.sample(t).y + 0.08), this._p);
        const fwd = track.dirAt(t, this._f);
        const right = this._r.set(-fwd.z, 0, fwd.x).normalize().applyAxisAngle(fwd, track.bankAt(t));
        const up = this._u.crossVectors(right, fwd).normalize();
        if (up.y < 0) up.negate();
        const z = this._z.crossVectors(right, up).normalize();
        this._m.makeBasis(right, up, z);
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
