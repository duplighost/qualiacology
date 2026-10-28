// A Million Ducks: the set-pieces, each on its line. The audience on the tiers, their faces in the
// screen's light; the two masks; the popcorn and the counter; the marquee boards with the lines;
// the claw machine's prizes (the pirate one, the captain one), the dog who knows he's not a duck,
// the hoodie stuffed with them; the auditorium door with her in the blue light; the prize wall;
// her pictures on the dresser, the one face down, the mirror; every duck he ever won in rows; the
// big duck on the multiplex roof; the searchlights' trucks; the ducks heaped in the machine.
// Every name here starts with dck (the scenery registry is shared by every song).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { duckGeometry } from './feedback.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const TAU = Math.PI * 2;
const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
function paint(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
// faced back down the road at her as she comes, turned a toward the road
const FACE = (x, a) => Math.PI + (x > 0 ? -a : a);
// the floor here (the dresser top, the hall floor, the car park) for things set down at planning time
const floorOf = (S, t) => { prepare(S.course, S.plan); const lot = S.plan.lot; return lot && t > lot[0] && t < lot[1] ? 0 : floorAt(S.course, t); };

// lit a little by itself (it's dark in a cinema), one colour
export function dckLit(color, k = 0.3, rough = 0.6) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = () => 'dckLit' + k.toFixed(2);
  return m;
}
// vertex-coloured and lit a little by itself
function litVC(k, opts, key) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = () => 'dckVC' + key;
  return m;
}
const VC = (M, key, k, opts = {}) => M[key] || (M[key] = litVC(k, { roughness: 0.6, metalness: 0, ...opts }, key));
// vertex-coloured, and the white parts take the instance's colour (and glow with it)
function tintVC(k, key, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float dckFace = step(0.97, vColor.r) * step(0.97, vColor.g) * step(0.97, vColor.b);
        float dckCloth = step(abs(vColor.r - 0.5), 0.02) * step(abs(vColor.g - 0.5), 0.02) * step(abs(vColor.b - 0.5), 0.02);
        if (dckFace > 0.5) diffuseColor.rgb = vTint; else if (dckCloth > 0.5) diffuseColor.rgb = vTint * 0.22 + vec3(0.03);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += dckFace * vTint * ${k.toFixed(2)} + dckCloth * vTint * 0.06 + diffuseColor.rgb * 0.12 * (1.0 - dckFace);`);
  };
  m.customProgramCacheKey = () => 'dckTint' + key;
  return m;
}

// ---------- ducks at any size ----------
// the duck with fewer facets, for the many: body, tail, head, beak, eyes (faces +z, ~1.3 long)
export function duckLo(seg = 10, body = [1, 0.78, 0.12]) {
  const parts = [], O = [1, 0.42, 0.06], K = [0.03, 0.03, 0.04];
  const b = new THREE.SphereGeometry(0.5, seg, Math.max(4, Math.round(seg * 0.6))); b.scale(1.05, 0.72, 1.3); b.translate(0, 0, -0.05); parts.push(paint(b, body));
  const tl = new THREE.ConeGeometry(0.2, 0.42, Math.max(4, seg >> 1)); tl.rotateX(-0.9); tl.translate(0, 0.22, -0.68); parts.push(paint(tl, body));
  const hd = new THREE.SphereGeometry(0.31, Math.max(6, seg - 2), Math.max(4, Math.round((seg - 2) * 0.6))); hd.translate(0, 0.52, 0.36); parts.push(paint(hd, body));
  const bk = new THREE.SphereGeometry(0.16, 6, 4); bk.scale(1.15, 0.42, 1.25); bk.translate(0, 0.45, 0.68); parts.push(paint(bk, O));
  for (const x of [-0.14, 0.14]) { const e = new THREE.SphereGeometry(0.05, 4, 3); e.translate(x, 0.62, 0.62); parts.push(paint(e, K)); }
  // (each piece keeps its own smooth normals: no recompute after the merge, that would facet it)
  const g = merge(parts); g.translate(0, -0.1, 0);
  return g;
}

// ---------- the audience ----------
// four seats along x facing +z, and the people in them (the pattern says which are taken)
function audienceRow(pattern, seed) {
  const parts = [], R = seeded(seed);
  const velvet = rgb(0x6a0812), dark = rgb(0x120c10), hairs = [rgb(0x1a120c), rgb(0x3a2414), rgb(0x0c0a0a), rgb(0x5a3a1a), rgb(0x8a6a3a)];
  for (let k = 0; k < 4; k++) {
    const x = -1.35 + k * 0.9;
    const back = box(0.8, 1.15, 0.18, 0, 0.57, 0); back.rotateX(-0.14); back.translate(x, 0.55, -0.32); parts.push(paint(back, velvet));
    parts.push(paint(box(0.78, 0.2, 0.6, x, 0.5, 0.02), velvet));
    if (!pattern[k]) continue;
    // someone sitting in it, faced to the screen: shoulders, head, hair, the glasses
    const hs = 0.92 + R() * 0.2, dx = (R() - 0.5) * 0.08, dy = (R() - 0.5) * 0.1;
    parts.push(paint(sph(0.4, 1.1, 1.2, 0.72, x + dx, 1.15 + dy, -0.02, 6, 4), [0.5, 0.5, 0.5]));
    parts.push(paint(sph(0.2 * hs, 1, 1.18, 1, x + dx, 1.84 + dy, 0.02, 7, 5), [1, 1, 1]));
    const hair = pick2(R, hairs), long = R() < 0.45;
    parts.push(paint(sph(0.215 * hs, 1.05, long ? 1.5 : 1.1, 1.0, x + dx, (long ? 1.78 : 1.9) + dy, -0.07, 6, 4), hair));
    parts.push(paint(box(0.38 * hs, 0.08, 0.05, x + dx, 1.86 + dy, 0.21), [0.02, 0.02, 0.03]));
  }
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) parts.push(paint(box(0.1, 0.62, 0.66, x, 0.31, -0.04), dark));
  const g = merge(parts); return g;
}
function pick2(R, arr) { return arr[Math.floor(R() * arr.length)]; }
const PATTERNS = [[1, 1, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 1, 0], [0, 0, 0, 0]];

// ---------- the masks: hers (tragedy) and his (comedy) ----------
function maskGeometry(comedy) {
  // the front half of a sphere (x across, y up, the face to +z), shaped into a face
  const g = new THREE.SphereGeometry(1, 48, 40, 0, Math.PI, 0.05, Math.PI * 0.9);
  const p = g.attributes.position.array, n = g.attributes.position.count, c = new Float32Array(n * 3);
  const gold = [1, 0.74, 0.28], dark = [0.04, 0.02, 0.02];
  for (let i = 0; i < n; i++) {
    let x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
    // a face: wider at the brow, a chin, flatter at the back
    x *= 0.82 - 0.12 * Math.max(0, -y); z *= 0.55;
    // the features (x across, y up, seen from the front)
    const ex = Math.abs(x) - 0.33, ey = y - 0.24;
    const tilt = comedy ? -0.5 : 0.55;                                         // the eyes slant
    const eye = (ex * ex) / 0.03 + ((ey + tilt * ex * (x > 0 ? 1 : 1)) ** 2) / 0.012 < 1;
    const my = comedy ? -0.42 + 0.9 * x * x : -0.58 - 0.9 * x * x + 0.18;      // the mouth curves up or down
    const mouth = Math.abs(y - my) < 0.07 + 0.05 * (1 - Math.abs(x) / 0.5) && Math.abs(x) < 0.48;
    const brow = Math.abs(y - (0.42 + (comedy ? 0.12 : -0.12) * Math.abs(x) * 2)) < 0.025 && Math.abs(x) > 0.15 && Math.abs(x) < 0.5;
    const hole = eye || mouth;
    if (hole) z -= 0.18;
    if (brow) z += 0.04;
    if (Math.abs(x) < 0.07 && y > -0.2 && y < 0.25) z += 0.08 * (1 - Math.abs(x) / 0.07);   // the nose
    p[i * 3] = x; p[i * 3 + 1] = y * 1.18; p[i * 3 + 2] = z;
    c.set(hole ? dark : gold, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  const parts = [ni(g)];
  // the ribbons tied behind, their tails hanging
  for (const s of [-1, 1]) { const r = box(0.1, 1.6, 0.03, 0, 0, 0); r.rotateZ(s * 0.35); r.translate(s * 0.95, -0.5, -0.2); parts.push(paint(r, [0.8, 0.08, 0.16])); }
  return merge(parts);
}

// ---------- the popcorn machine: a glass case of popcorn on a red cart, the kettle at its top ----------
function popper() {
  const parts = [], red = rgb(0xc8102a), gold = rgb(0xf0c040), steel = rgb(0xc8ccd4), R = seeded(31);
  parts.push(paint(box(2.4, 1.6, 1.6, 0, 0.8, 0), red));
  parts.push(paint(box(2.5, 0.1, 1.7, 0, 1.62, 0), gold), paint(box(2.5, 0.1, 1.7, 0, 0.06, 0), gold));
  for (const x of [-0.8, 0.8]) parts.push(paint(cyl(0.3, 0.3, 0.12, 12, 0, 0, 0).rotateX(Math.PI / 2).translate(x, 0.3, 0.82), rgb(0x1a1a1a)));
  for (const x of [-1.1, 1.1]) for (const z of [-0.72, 0.72]) parts.push(paint(cyl(0.05, 0.05, 2.5, 6, x, 2.9, z), gold));
  parts.push(paint(box(2.5, 0.5, 1.7, 0, 4.4, 0), red), paint(box(2.6, 0.08, 1.8, 0, 4.66, 0), gold));
  // stripes round the roof
  for (let k = 0; k < 10; k++) parts.push(paint(box(0.12, 0.42, 1.72, -1.13 + k * 0.25, 4.4, 0), k % 2 ? gold : rgb(0xffffff)));
  // the kettle on its arm
  parts.push(paint(cyl(0.38, 0.3, 0.42, 14, 0.25, 3.7, 0), steel), paint(box(0.06, 0.6, 0.06, 0.25, 4.1, 0), steel));
  // the popcorn heaped in the bottom of the case
  for (let k = 0; k < 140; k++) { const x = (R() - 0.5) * 2.0, z = (R() - 0.5) * 1.3, y = 1.75 + R() * 0.55 * (1 - Math.abs(x) * 0.3); const p = new THREE.IcosahedronGeometry(0.1 + R() * 0.06, 0); p.translate(x, y, z); parts.push(paint(p, R() < 0.7 ? rgb(0xfff2c8) : rgb(0xffd870))); }
  return merge(parts);
}
// the glass of the case, faint
function popGlass() { return box(2.2, 2.45, 1.44, 0, 2.9, 0); }

// ---------- the concession counter: the glass case of candy, the back bar, the menu panels ----------
function counter() {
  const parts = [], wood = rgb(0x3a0a12), gold = rgb(0xd8a040), R = seeded(7);
  parts.push(paint(box(18, 2.2, 3, 0, 1.1, 0), wood), paint(box(18.4, 0.2, 3.3, 0, 2.3, 0), gold));
  // candy in the case front: rows of little bright boxes
  for (let k = 0; k < 60; k++) parts.push(paint(box(0.45, 0.6, 0.12, -8.5 + (k % 30) * 0.58, 0.7 + Math.floor(k / 30) * 0.75, 1.52), rgb([0xff3a5a, 0xffd23a, 0x3ac0ff, 0x7aff6a, 0xff8a3a, 0xb46aff][Math.floor(R() * 6)])));
  // cups stacked on the counter, a soda tower
  for (let k = 0; k < 5; k++) parts.push(paint(cyl(0.32, 0.24, 1.6, 10, 5 + k * 0.7, 3.2, 0.4), rgb(0xf4f0e8)));
  parts.push(paint(box(2.2, 2.6, 1.2, -5.5, 3.6, -0.6), rgb(0x1a1a20)));
  for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.12, 0.12, 0.6, 6, -6.3 + k * 0.5, 2.9, 0.05), rgb(0xc8ccd4)));
  // the back wall and its shelf
  parts.push(paint(box(20, 9, 0.6, 0, 4.5, -4.2), rgb(0x24060c)), paint(box(20, 0.25, 1.2, 0, 3.8, -3.6), gold));
  return merge(parts);
}
// the menu panels: food drawn, no words
function menuTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#120408'; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 4; i++) {
    const x0 = i * 256 + 12;
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, ['#ff3a5a', '#ffb020', '#3ab0ff', '#ff5ad0'][i]); gr.addColorStop(1, '#2a0610');
    g.fillStyle = gr; g.fillRect(x0, 12, 232, 232);
    g.fillStyle = '#ffffff';
    if (i === 0) { g.fillStyle = '#f4f0e8'; g.beginPath(); g.moveTo(x0 + 70, 90); g.lineTo(x0 + 162, 90); g.lineTo(x0 + 148, 220); g.lineTo(x0 + 84, 220); g.fill(); g.fillStyle = '#e8203a'; for (let k = 0; k < 4; k++) g.fillRect(x0 + 82 + k * 20, 92, 8, 126); g.fillStyle = '#fff2c8'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(x0 + 76 + (k % 7) * 14, 82 - Math.floor(k / 7) * 14 + (k % 2) * 4, 11, 0, 6.3); g.fill(); } }
    if (i === 1) { g.fillStyle = '#f4f0e8'; g.fillRect(x0 + 80, 80, 72, 140); g.fillStyle = '#e8203a'; g.fillRect(x0 + 80, 120, 72, 30); g.fillStyle = '#ffffff'; g.fillRect(x0 + 112, 40, 8, 50); }
    if (i === 2) { g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(x0 + 116, 160, 70, 46, 0, 0, 6.3); g.fill(); g.beginPath(); g.arc(x0 + 148, 102, 34, 0, 6.3); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(x0 + 188, 110, 22, 9, 0, 0, 6.3); g.fill(); }
    if (i === 3) { for (let k = 0; k < 6; k++) { g.fillStyle = ['#ff3a5a', '#ffd23a', '#7aff6a'][k % 3]; g.fillRect(x0 + 40 + (k % 3) * 52, 70 + Math.floor(k / 3) * 80, 40, 64); } }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- a big claw on its cable (opens up when it lets go) ----------
export function bigClaw(open = 0.35) {
  const parts = [], steel = rgb(0xd0d4dc), dark = rgb(0x4a4c54);
  parts.push(paint(cyl(0.06, 0.06, 30, 5, 0, 15 + 1.4, 0), dark));
  parts.push(paint(cyl(0.5, 0.42, 0.9, 12, 0, 1.0, 0), steel), paint(cyl(0.22, 0.22, 0.6, 8, 0, 1.6, 0), dark));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU, prong = [];
    prong.push(box(0.18, 1.2, 0.18, 0, -0.6, 0).rotateX(-0.6 - open).translate(0, 0.6, 0.35));
    const lo = box(0.16, 1.1, 0.16, 0, -0.55, 0); lo.rotateX(0.55 - open * 0.5); lo.translate(0, 0.6 - 0.95, 0.35 + 0.62 + open * 0.4); prong.push(lo);
    prong.push(sph(0.13, 1, 1, 1, 0, -0.95, 0.95 + open * 0.75, 6, 4));
    for (const g of prong) { g.rotateY(a); parts.push(paint(g, steel)); }
  }
  return merge(parts);
}

// ---------- the dog who knows he's not a duck: a plush dog, sitting, head on one side ----------
function dog() {
  const parts = [], tan = rgb(0xb07a48), cream = rgb(0xf2dcb8), brown = rgb(0x5a3418), black = rgb(0x0c0808);
  parts.push(paint(sph(1, 1.15, 1.35, 1.05, 0, 1.45, 0, 16, 12), tan));
  parts.push(paint(sph(0.7, 0.8, 1.0, 0.5, 0, 1.4, 0.62, 12, 8), cream));
  for (const s of [-1, 1]) {
    parts.push(paint(cyl(0.3, 0.32, 1.3, 10, s * 0.45, 0.65, 0.75), tan), paint(sph(0.36, 1, 0.7, 1.3, s * 0.45, 0.12, 0.95, 10, 6), cream));
    parts.push(paint(sph(0.62, 1, 0.8, 1.5, s * 0.85, 0.5, 0.0, 12, 8), tan));
  }
  parts.push(paint(sph(0.25, 1, 1, 2.2, 0, 0.8, -1.15, 8, 6).rotateX(-0.6), tan));
  // the head, on one side
  const head = [];
  head.push(paint(sph(0.95, 1.05, 0.95, 1, 0, 0, 0, 16, 12), tan));
  head.push(paint(sph(0.5, 1, 0.78, 1.15, 0, -0.22, 0.85, 12, 8), cream));
  head.push(paint(sph(0.17, 1.2, 0.9, 1, 0, -0.08, 1.42, 8, 6), black));
  for (const s of [-1, 1]) {
    head.push(paint(sph(0.13, 1, 1, 0.6, s * 0.36, 0.25, 0.78, 8, 6), black));
    head.push(paint(sph(0.04, 1, 1, 1, s * 0.33, 0.3, 0.86, 4, 3), rgb(0xffffff)));
    const ear = sph(0.55, 0.42, 1.0, 0.16, 0, -0.5, 0, 10, 8); ear.rotateZ(s * 0.25); ear.translate(s * 0.88, 0.25, -0.05); head.push(paint(ear, brown));
  }
  head.push(paint(sph(0.24, 1.3, 0.6, 1, 0, -0.62, 0.62, 8, 6), rgb(0xd84a5a)));        // the tongue out a little
  for (const g of head) { g.rotateZ(0.28); g.translate(0.1, 3.35, 0.35); parts.push(g); }
  // the collar and its tag
  const collar = new THREE.TorusGeometry(0.72, 0.1, 6, 20); collar.rotateX(Math.PI / 2); collar.translate(0, 2.55, 0.25); parts.push(paint(collar, rgb(0xd81a2a)));
  parts.push(paint(cyl(0.16, 0.16, 0.04, 10, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 2.32, 0.98), rgb(0xf0c040)));
  const g = merge(parts); return g;
}

// ---------- the hoodie: pockets full of ducks, the hood full, the rest held in a hug ----------
// laid out flat the way you'd know it anywhere (front to +z, then leant back on the heap)
function hoodie() {
  const parts = [], red = rgb(0xc8202e), rib = rgb(0x8a121e), R = seeded(77);
  const Y = rgb(0xffcc1e), cord = rgb(0xf4f0e8);
  const tube = (a, b, r, c) => { const d = new THREE.Vector3().subVectors(b, a); const g = new THREE.CylinderGeometry(r, r, d.length(), 12); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate(a.x, a.y, a.z); parts.push(paint(g, c)); parts.push(paint(sph(r, 1, 1, 1, b.x, b.y, b.z, 10, 8), c)); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // the body: shoulders, sides, the ribbed hem
  const sh = new THREE.Shape(); sh.moveTo(-1.3, -1.4); sh.lineTo(1.3, -1.4); sh.lineTo(1.3, 0.9); sh.quadraticCurveTo(1.25, 1.25, 0.8, 1.35); sh.lineTo(-0.8, 1.35); sh.quadraticCurveTo(-1.25, 1.25, -1.3, 0.9); sh.closePath();
  const body = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2, curveSegments: 8 }); body.translate(0, 0, -0.2); parts.push(paint(body, red));
  parts.push(paint(box(2.7, 0.32, 0.72, 0, -1.4, 0.05), rib));
  // the hood at the top, its opening full of ducks spilling out
  parts.push(paint(sph(1.0, 1.15, 0.85, 0.5, 0, 1.75, -0.05, 16, 10), red));
  parts.push(paint(sph(0.62, 1.1, 0.62, 0.3, 0, 1.72, 0.32, 12, 8), rib));
  for (let k = 0; k < 7; k++) { const d = duckLo(8, k === 3 ? rgb(0xff6a9a) : Y); d.scale(0.5, 0.5, 0.5); d.rotateY(R() * TAU); d.rotateX(-0.6 + (R() - 0.5) * 0.6); d.translate((R() - 0.5) * 1.1, 1.75 + (R() - 0.3) * 0.7, 0.55 + R() * 0.2); parts.push(d); }
  // the drawstrings
  for (const s of [-1, 1]) { parts.push(paint(cyl(0.035, 0.035, 0.9, 5, s * 0.22, 0.75, 0.42), cord)); parts.push(paint(cyl(0.06, 0.06, 0.14, 6, s * 0.22, 0.28, 0.42), cord)); }
  // the pocket, bulging, ducks looking out of both ends
  parts.push(paint(sph(1, 1.0, 0.42, 0.25, 0, -0.75, 0.35, 14, 8), rib));
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const d = duckLo(8, Y); d.scale(0.42, 0.42, 0.42); d.rotateY(s * Math.PI / 2 + (R() - 0.5) * 0.5); d.translate(s * (0.95 + k * 0.22), -0.7 + k * 0.2, 0.42); parts.push(d); }
  // the rest held in a hug: a heap of them on its front, the sleeves crossed round it
  for (let k = 0; k < 16; k++) { const a = R() * TAU, r = R() * 0.75; const d = duckLo(8, k % 7 === 0 ? rgb(0x5aa8ff) : Y); d.scale(0.46, 0.46, 0.46); d.rotateY(R() * TAU); d.rotateX((R() - 0.5) * 0.8); d.translate(Math.cos(a) * r, 0.05 + Math.sin(a) * r * 0.8, 0.75 + R() * 0.45); parts.push(d); }
  tube(V(-1.25, 0.95, 0.15), V(-0.15, -0.15, 1.05), 0.36, red); tube(V(1.25, 0.95, 0.15), V(0.15, -0.3, 1.0), 0.36, red);
  for (const [x, y, z] of [[-0.15, -0.15, 1.05], [0.15, -0.3, 1.0]]) parts.push(paint(sph(0.4, 1, 1, 1, x, y, z, 10, 8), rib));
  const g = merge(parts);
  // leant back on the heap, face up to her
  g.rotateX(-0.75); g.translate(0, 1.1, 0);
  return g;
}

// ---------- the auditorium door in the lobby wall, and her in the blue light ----------
function doorFrame() {
  const parts = [], gold = rgb(0xe0a840), dark = rgb(0x1a0408);
  parts.push(paint(box(20, 18, 0.8, 0, 9, -0.6), dark));
  for (const [w, h, x, y] of [[1, 13.6, -6.5, 6.8], [1, 13.6, 6.5, 6.8], [14, 1, 0, 13.6]]) parts.push(paint(box(w, h, 1.2, x, y, 0), gold));
  // the inside: the auditorium, all blue from the screen in there
  parts.push(paint(box(12, 13, 0.2, 0, 6.5, -6), rgb(0x5aaaff)), paint(box(0.2, 13, 6, -6, 6.5, -3), rgb(0x2a64c8)), paint(box(0.2, 13, 6, 6, 6.5, -3), rgb(0x2a64c8)), paint(box(12, 0.2, 6, 0, 13, -3), rgb(0x1a3a80)), paint(box(12, 0.2, 6, 0, 0.1, -3), rgb(0x1a2a50)));
  return merge(parts);
}
function doorLeaf() { const parts = [paint(box(6, 13, 0.4, 3, 6.5, 0), rgb(0x3a0a14))]; parts.push(paint(box(0.3, 2.4, 0.2, 5.2, 6.5, 0.3), rgb(0xf0c040))); for (let k = 0; k < 6; k++) parts.push(paint(box(5.4, 0.1, 0.12, 3, 1.2 + k * 2.1, 0.22), rgb(0x24060c))); return merge(parts); }
// her, drawn: standing in the doorway, the light from behind in her hair; or seated, from behind
export function dckHerTexture(standing = false) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 320);
  const ink = '#05060c';
  g.fillStyle = ink;
  if (standing) {
    g.beginPath(); g.ellipse(128, 58, 26, 32, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(98, 50); g.quadraticCurveTo(90, 120, 82, 150); g.lineTo(174, 150); g.quadraticCurveTo(166, 120, 158, 50); g.fill();
    g.beginPath(); g.moveTo(96, 96); g.lineTo(160, 96); g.lineTo(178, 300); g.lineTo(78, 300); g.closePath(); g.fill();
    g.fillRect(108, 296, 14, 24); g.fillRect(134, 296, 14, 24);
  } else {
    g.beginPath(); g.ellipse(128, 120, 46, 54, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(82, 110); g.quadraticCurveTo(70, 220, 64, 250); g.lineTo(192, 250); g.quadraticCurveTo(186, 220, 174, 110); g.fill();
    g.beginPath(); g.moveTo(40, 320); g.quadraticCurveTo(48, 236, 128, 226); g.quadraticCurveTo(208, 236, 216, 320); g.fill();
    g.fillRect(70, 112, 116, 10);
  }
  // blue light in her hair: the rim of it lit
  g.globalCompositeOperation = 'source-atop';
  const rg = g.createRadialGradient(128, standing ? 40 : 90, 10, 128, standing ? 70 : 130, standing ? 90 : 120);
  rg.addColorStop(0, 'rgba(120,210,255,0.0)'); rg.addColorStop(0.65, 'rgba(90,190,255,0.0)'); rg.addColorStop(0.85, 'rgba(110,210,255,0.85)'); rg.addColorStop(1, 'rgba(170,235,255,1)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, standing ? 160 : 260);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- the prize wall: shelves of ducks along the lobby walls ----------
function prizeWall() {
  const parts = [], R = seeded(19), gold = rgb(0xd8a040), back = rgb(0x2a0810);
  parts.push(paint(box(0.4, 17, 24, 0, 8.5, 0), back));
  const cols = [rgb(0xffcc1e), rgb(0xffcc1e), rgb(0xffcc1e), rgb(0xff6a9a), rgb(0x5aa8ff), rgb(0xf4f4f4), rgb(0x6ad86a), rgb(0x9a6aff), rgb(0xff8a2a)];
  for (let s = 0; s < 5; s++) {
    const y = 1.6 + s * 3.2;
    parts.push(paint(box(1.6, 0.18, 24, 0.75, y, 0), gold));
    for (let k = 0; k < 20; k++) { const d = duckLo(7, cols[Math.floor(R() * cols.length)]); const sc = 1.15 + R() * 0.3; d.scale(sc, sc, sc); d.rotateY(Math.PI / 2 + (R() - 0.5) * 0.5); d.translate(0.85, y + 0.62 * sc, -11.4 + k * 1.2 + (R() - 0.5) * 0.2); parts.push(d); }
  }
  return merge(parts);
}

// ---------- her pictures on the dresser: a frame on its stand; and one lying face down ----------
function photoFrame(down) {
  const parts = [], gold = rgb(0xc89a48), back = rgb(0x5a3a22);
  for (const [w, h, x, y] of [[8.8, 0.7, 0, 11.35], [8.8, 0.7, 0, 0.35], [0.7, 11.7, -4.05, 5.85], [0.7, 11.7, 4.05, 5.85]]) parts.push(paint(box(w, h, 0.7, x, y, 0), gold));
  parts.push(paint(box(8.2, 11.2, 0.2, 0, 5.85, -0.3), back));
  const leg = box(1.4, 10, 0.3, 0, 5, 0); leg.rotateX(-0.32); leg.translate(0, 0.4, -1.9); parts.push(paint(leg, back));
  const g = merge(parts);
  if (down) { g.translate(0, 0, 0.35); g.rotateX(-Math.PI / 2); g.translate(0, 0.35, 0); }
  return g;
}
function photosTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 384;
  const g = c.getContext('2d');
  const draw = (i, f) => { g.save(); g.translate(i * 256, 0); f(); g.restore(); };
  // a beach at dusk, her hair blowing
  draw(0, () => { const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#ff9a6a'); gr.addColorStop(0.55, '#ffd8a0'); gr.addColorStop(0.56, '#3a6a9a'); gr.addColorStop(1, '#d8c090'); g.fillStyle = gr; g.fillRect(0, 0, 256, 384); g.fillStyle = '#1a1018'; g.beginPath(); g.ellipse(120, 170, 24, 30, 0, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(100, 160); g.quadraticCurveTo(60, 150, 40, 180); g.quadraticCurveTo(80, 170, 104, 190); g.fill(); g.beginPath(); g.moveTo(96, 196); g.lineTo(146, 196); g.lineTo(160, 384); g.lineTo(84, 384); g.fill(); });
  // the red dress, at a party, lights behind
  draw(1, () => { g.fillStyle = '#1a0a1a'; g.fillRect(0, 0, 256, 384); for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255,${180 + (k * 37) % 70},${80 + (k * 53) % 120},0.6)`; g.beginPath(); g.arc((k * 83) % 256, (k * 47) % 200, 6 + k % 9, 0, 6.3); g.fill(); } g.fillStyle = '#2a1410'; g.beginPath(); g.ellipse(128, 120, 22, 28, 0, 0, 6.3); g.fill(); g.fillStyle = '#d8102a'; g.beginPath(); g.moveTo(104, 150); g.lineTo(152, 150); g.lineTo(178, 384); g.lineTo(78, 384); g.fill(); });
  // in the blue of a screen, three-quarters turned away
  draw(2, () => { g.fillStyle = '#06142e'; g.fillRect(0, 0, 256, 384); const rg = g.createRadialGradient(200, 100, 10, 200, 100, 220); rg.addColorStop(0, 'rgba(90,180,255,0.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 384); g.fillStyle = '#04060c'; g.beginPath(); g.ellipse(110, 150, 40, 48, 0, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(70, 150); g.quadraticCurveTo(60, 280, 50, 384); g.lineTo(190, 384); g.quadraticCurveTo(170, 260, 150, 150); g.fill(); g.strokeStyle = 'rgba(140,220,255,0.9)'; g.lineWidth = 4; g.beginPath(); g.arc(110, 150, 46, -1.2, 0.5); g.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function photoGeometry() { const g = new THREE.PlaneGeometry(8.1, 11.1); g.translate(0, 5.85, 0.37); return g; }

// ---------- the mirror on the dresser: an oval glass on a stand, a red dress in it ----------
function mirrorStand() {
  const parts = [], gold = rgb(0xd8a848), wood = rgb(0x4a2a14);
  const ring = new THREE.TorusGeometry(10, 0.9, 10, 48); ring.scale(1, 1.35, 1); ring.translate(0, 18, 0); parts.push(paint(ring, gold));
  for (const s of [-1, 1]) { parts.push(paint(box(1.2, 18, 1.2, s * 11.2, 9, 0), wood)); parts.push(paint(sph(1, 1, 1, 1, s * 11.2, 18.2, 0, 10, 8), gold)); }
  parts.push(paint(box(26, 1.4, 6, 0, 0.7, 0), wood));
  return merge(parts);
}
function mirrorGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK; varying vec2 vUv;
      void main(){
        vec2 p = vUv - vec2(0.5, 0.0);
        // the room behind you, warm, the lamp a blur
        vec3 c = mix(vec3(0.3, 0.2, 0.14), vec3(0.62, 0.5, 0.4), vUv.y) + vec3(1.0, 0.8, 0.5) * 0.5 * exp(-length((vUv - vec2(0.78, 0.8)) * vec2(3.0, 2.2)) * 3.0);
        c += vec3(0.25) * smoothstep(0.06, 0.0, abs(vUv.x - vUv.y * 0.55 - 0.12));
        // a red dress, from the back, standing in it; her dark hair down her back
        float body = smoothstep(0.015, 0.0, abs(p.x) - (0.07 + 0.13 * smoothstep(0.6, 0.06, vUv.y))) * step(vUv.y, 0.64) * step(0.04, vUv.y);
        float head = smoothstep(0.05, 0.04, length((vUv - vec2(0.5, 0.72)) * vec2(1.0, 0.82)));
        float hair = smoothstep(0.012, 0.0, abs(p.x) - 0.075) * step(0.5, vUv.y) * step(vUv.y, 0.74);
        c = mix(c, vec3(0.86, 0.04, 0.1) * (1.1 + 0.25 * sin(uT * 2.0)), body);
        c = mix(c, vec3(0.06, 0.03, 0.02), max(head, hair));
        gl_FragColor = vec4(c * uK, 1.0); }`,
    side: THREE.DoubleSide,
  });
}

// ---------- a light mast over the car park: a tall pole, a bar, four floods ----------
function mast() {
  const parts = [], grey = rgb(0x6a6a72), dark = rgb(0x2a2a30);
  parts.push(paint(cyl(0.35, 0.6, 22, 8, 0, 11, 0), grey), paint(cyl(1.2, 1.4, 0.8, 10, 0, 0.4, 0), dark));
  parts.push(paint(box(6, 0.3, 0.3, 0, 22, 0), grey));
  for (const x of [-2.4, -0.8, 0.8, 2.4]) { const h = box(1.2, 0.5, 0.9, x, 21.6, 0.2); h.rotateX(0.0); parts.push(paint(h, dark)); parts.push(paint(box(1.0, 0.06, 0.7, x, 21.33, 0.25), rgb(0xfff0c8))); }
  return merge(parts);
}

// ---------- a searchlight on a little trailer, out on the lot ----------
function truck() {
  const parts = [], body = rgb(0x2a2a30), steel = rgb(0xb8bcc4);
  parts.push(paint(box(3, 1.2, 5, 0, 1.2, 0), body));
  for (const z of [-1.6, 1.6]) for (const s of [-1, 1]) parts.push(paint(cyl(0.55, 0.55, 0.4, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 1.5, 0.55, z), rgb(0x0a0a0c)));
  parts.push(paint(cyl(1.1, 1.1, 1.4, 16, 0, 2.6, 0), steel), paint(cyl(1.15, 1.15, 0.12, 16, 0, 3.35, 0), rgb(0xffffff)));
  return merge(parts);
}

// ---------- the film's forest growing out into the room: ferns, glowing mushrooms, a stalk with a bulb ----------
function bloomFern() {
  const parts = [], R = seeded(5);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + R() * 0.4, lean = 0.45 + R() * 0.35, len = 2.6 + R() * 1.4;
    for (let j = 0; j < 5; j++) {
      // each blade a curl of flattened beads, brighter toward the tip
      const u = j / 4, r = 0.32 * (1 - u * 0.6);
      const b = sph(1, r, 0.55, r * 0.35, 0, 0, 0, 6, 4);
      const d = u * len, y = Math.sin(lean + u * 0.9) * d + 0.2, out = Math.cos(lean + u * 0.9) * d * 0.9;
      b.rotateZ(-(lean + u * 0.9) + Math.PI / 2); b.rotateY(a); b.translate(Math.cos(a) * out, y, Math.sin(a) * out);
      parts.push(paint(b, u > 0.6 ? [0.6, 1, 0.95] : [0.12, 0.85, 0.8]));
    }
  }
  parts.push(paint(sph(0.35, 1, 0.6, 1, 0, 0.2, 0, 8, 5), [0.1, 0.5, 0.45]));
  return merge(parts);
}
function bloomShroom() {
  const parts = [];
  parts.push(paint(cyl(0.18, 0.28, 2.4, 8, 0, 1.2, 0), [0.75, 0.55, 0.95]));
  const cap = new THREE.SphereGeometry(1.1, 14, 8, 0, TAU, 0, Math.PI / 2); cap.scale(1, 0.55, 1); cap.translate(0, 2.35, 0); parts.push(paint(cap, [0.95, 0.3, 0.95]));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; parts.push(paint(sph(0.11, 1, 1, 1, Math.cos(a) * 0.7, 2.62, Math.sin(a) * 0.7, 6, 4), [0.6, 1, 1])); }
  const s2 = new THREE.SphereGeometry(0.6, 10, 6, 0, TAU, 0, Math.PI / 2); s2.scale(1, 0.55, 1); s2.translate(0.9, 1.3, 0.2); parts.push(paint(s2, [0.4, 0.5, 1]));
  parts.push(paint(cyl(0.08, 0.12, 1.3, 6, 0.9, 0.65, 0.2), [0.6, 0.6, 0.95]));
  return merge(parts);
}
function bloomStalk() {
  const parts = [];
  for (let j = 0; j < 6; j++) { const y = j * 0.9; parts.push(paint(cyl(0.12 - j * 0.012, 0.14 - j * 0.012, 0.95, 6, Math.sin(j * 0.6) * 0.25, y + 0.45, 0), [0.2, 0.7, 0.9])); }
  parts.push(paint(sph(0.55, 1, 1.3, 1, Math.sin(3.6) * 0.25, 5.9, 0, 10, 8), [0.85, 1, 1]));
  for (const s of [-1, 1]) { const l = sph(1, 0.9, 0.12, 0.4, 0, 0, 0, 8, 4); l.rotateZ(s * 0.6); l.translate(s * 0.7, 2.2 + s * 0.5, 0); parts.push(paint(l, [0.15, 0.9, 0.7])); }
  return merge(parts);
}
// glowing: mostly its own light, a little of the room's
function bloomMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPulse = { value: 0 }; m.userData.shader = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; uniform float uPulse;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vTint * (1.1 + 0.9 * uPulse);');
  };
  m.customProgramCacheKey = () => 'dckBloom';
  return m;
}

// ---------- the marquee board for the lines: a lit face, bulbs round it ----------
function marqueeBox(hang = false) {
  const parts = [], dark = rgb(0x14101a), gold = rgb(0xd8a848);
  parts.push(paint(box(16.6, 6.2, 0.9, 0, 0, -0.1), dark));
  for (const [w, h, x, y] of [[16.8, 0.35, 0, 3.1], [16.8, 0.35, 0, -3.1], [0.35, 6.4, -8.3, 0], [0.35, 6.4, 8.3, 0]]) parts.push(paint(box(w, h, 1.0, x, y, 0), gold));
  if (hang) for (const s of [-1, 1]) parts.push(paint(box(0.08, 24, 0.08, s * 6, 15.1, -0.2), rgb(0x8a8a90)));
  else for (const s of [-1, 1]) parts.push(paint(box(0.5, 30, 0.5, s * 6, -18.2, -0.2), dark));
  return merge(parts);
}

// ---------- the claw machine's ducks heaped in dunes up to the glass ----------
const DUNE = [[0, 0], [9, 0], [13, 1.2], [17, 3.2], [21, 6.0], [25, 9.4], [29, 12.6], [32, 13.4]];
export function duneAt(x) { const ax = Math.abs(x); for (let i = 1; i < DUNE.length; i++) if (ax <= DUNE[i][0]) { const [x0, y0] = DUNE[i - 1], [x1, y1] = DUNE[i]; return y0 + (y1 - y0) * (ax - x0) / (x1 - x0); } return 13.4; }

const TT = { aTint: 3 };
const SEA_DUCK = () => duckLo(9);
const BULB = [1, 0.86, 0.55], BULB_HALO = [1, 0.92, 0.8];
let PHOTOS = null, MENU = null;
extend({
  layers: {
    dckAud0: (M) => [audienceRow(PATTERNS[0], 11), M.dckAudM || (M.dckAudM = tintVC(0.62, 'aud')), 420, TT],
    dckAud1: (M) => [audienceRow(PATTERNS[1], 23), M.dckAudM || (M.dckAudM = tintVC(0.62, 'aud')), 420, TT],
    dckAud2: (M) => [audienceRow(PATTERNS[2], 37), M.dckAudM || (M.dckAudM = tintVC(0.62, 'aud')), 420, TT],
    dckAud3: (M) => [audienceRow(PATTERNS[3], 41), M.dckAudM || (M.dckAudM = tintVC(0.62, 'aud')), 420, TT],
    dckAud4: (M) => [audienceRow(PATTERNS[4], 5), M.dckAudM || (M.dckAudM = tintVC(0.62, 'aud')), 420, TT],
    dckMaskC: (M) => [maskGeometry(true), VC(M, 'dckGold', 0.32, { roughness: 0.3, metalness: 0.55 }), 2, {}],
    dckMaskT: (M) => [maskGeometry(false), VC(M, 'dckGold', 0.32, { roughness: 0.3, metalness: 0.55 }), 2, {}],
    dckPopper: (M) => [popper(), VC(M, 'dckCart', 0.35, { roughness: 0.45 }), 4, {}],
    dckPopGlass: (M) => [popGlass(), M.glass || M.dckPopGlassM || (M.dckPopGlassM = new THREE.MeshBasicMaterial({ color: 0x223040, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })), 4, {}],
    dckCounter: (M) => [counter(), VC(M, 'dckCart', 0.35, { roughness: 0.45 }), 2, {}],
    dckMenu: (M) => [(() => { const g = new THREE.PlaneGeometry(18, 4.5); g.translate(0, 6.6, -3.85); return g; })(), M.dckMenuM || (M.dckMenuM = new THREE.MeshBasicMaterial({ map: (MENU = MENU || menuTexture()), color: new THREE.Color(1.5, 1.5, 1.5) })), 2, {}],
    dckBigClaw: (M) => [bigClaw(0.25), VC(M, 'dckSteel', 0.3, { roughness: 0.25, metalness: 0.6 }), 24, {}],
    dckDog: (M) => [dog(), VC(M, 'dckPlush', 0.32, { roughness: 0.95 }), 2, {}],
    dckHoodie: (M) => [hoodie(), VC(M, 'dckPlush', 0.32, { roughness: 0.95 }), 2, {}],
    dckDoorFrame: (M) => [doorFrame(), VC(M, 'dckDoorM', 0.3, { roughness: 0.6 }), 2, {}],
    dckDoorLeaf: (M) => [doorLeaf(), VC(M, 'dckDoorM', 0.3, { roughness: 0.6 }), 4, {}],
    dckHer: (M) => [(() => { const g = new THREE.PlaneGeometry(6.4, 8); g.translate(0, 4, 0); return g; })(), M.dckHerM || (M.dckHerM = new THREE.MeshBasicMaterial({ map: dckHerTexture(true), transparent: true, alphaTest: 0.05, depthWrite: false, side: THREE.DoubleSide })), 2, {}],
    dckPrizeWall: (M) => [prizeWall(), VC(M, 'dckShelfM', 0.42, { roughness: 0.4 }), 6, {}],
    dckFrame: (M) => [photoFrame(false), VC(M, 'dckWoodM', 0.3, { roughness: 0.5, metalness: 0.2 }), 6, {}],
    dckFrameDown: (M) => [photoFrame(true), VC(M, 'dckWoodM', 0.3, { roughness: 0.5, metalness: 0.2 }), 2, {}],
    dckPhoto: (M) => [photoGeometry(), M.dckPhotoM || (M.dckPhotoM = new THREE.ShaderMaterial({ uniforms: { uMap: { value: (PHOTOS = PHOTOS || photosTexture()) } }, vertexShader: 'attribute float aIdx; varying vec2 vUv; void main(){ vUv = vec2((uv.x + aIdx) / 3.0, uv.y); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uMap, vUv).rgb * 1.15, 1.0); }' })), 6, { aIdx: 1 }],
    dckMirrorStand: (M) => [mirrorStand(), VC(M, 'dckWoodM', 0.3, { roughness: 0.5, metalness: 0.2 }), 2, {}],
    dckMirrorGlass: (M) => [(() => { const g = new THREE.CircleGeometry(10, 48); g.scale(1, 1.35, 1); g.translate(0, 18, 0.15); const uv = g.attributes.uv.array; for (let i = 0; i < uv.length; i += 2) { uv[i + 1] = uv[i + 1]; } return g; })(), M.dckMirrorM || (M.dckMirrorM = mirrorGlassMaterial()), 2, {}],
    dckTruck: (M) => [truck(), VC(M, 'dckTruckM', 0.25, { roughness: 0.5, metalness: 0.4 }), 12, {}],
    dckMast: (M) => [mast(), VC(M, 'dckTruckM', 0.25, { roughness: 0.5, metalness: 0.4 }), 90, {}],
    dckBloomF: (M) => [bloomFern(), M.dckBloomM || (M.dckBloomM = bloomMaterial()), 260, TT],
    dckBloomM: (M) => [bloomShroom(), M.dckBloomM || (M.dckBloomM = bloomMaterial()), 260, TT],
    dckBloomS: (M) => [bloomStalk(), M.dckBloomM || (M.dckBloomM = bloomMaterial()), 260, TT],
    dckMarquee: (M) => [marqueeBox(), VC(M, 'dckMarqM', 0.28, { roughness: 0.5, metalness: 0.3 }), 24, {}],
    dckMarqueeHang: (M) => [marqueeBox(true), VC(M, 'dckMarqM', 0.28, { roughness: 0.5, metalness: 0.3 }), 8, {}],
    dckMarqFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.0, 2.3, 1); g.translate(0, 0, 0.4); return g; })(), M.sign, 24, { aIdx: 1, aWake: 2 }],
    dckSeaDuck: (M) => [SEA_DUCK(), M.dckSeaM || (M.dckSeaM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n if (vColor.r > 0.9 && vColor.g > 0.6) diffuseColor.rgb = vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.3;'); }; m.customProgramCacheKey = () => 'dckSea'; return m; })()), 1400, TT],
  },
  parts: {
    // a block of four seats and who's in them; their faces in the light of the screen
    dckAud(S, it, p, q) {
      if (p.y < -400) for (let v = 0; v < 5; v++) void S.layers['dckAud' + v];
      if (S.dckCull && it.t < (S.tNow ?? 0) - 0.45) return;
      const m = S._m; m.compose(p, q, S._s.set(1.15, 1.15, 1.15));
      // the screen's light on them, and at "to turn blue" they turn blue
      const T = S.tNow ?? 0, blue = it.blueAt ? smooth(it.blueAt, it.blueAt + 0.9 + it.seed * 0.8, T) : 0;
      const k = it.lit ?? 1;
      const tint = [(0.55 + 0.25 * it.seed) * (1 - blue) * k + 0.16 * blue, (0.62 + 0.18 * it.seed) * (1 - blue) * k + 0.46 * blue, 0.85 * (1 - blue) * k + 1.05 * blue];
      S.layers['dckAud' + it.v].add(m, { aTint: tint });
    },
    dckMask(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 7, T = S.tNow ?? 0;
      // it turns to you as its line comes, and breathes on the beat
      const on = smooth(it.t0, it.t0 + 0.8, T);
      // faced back down the road at her, turned toward the road, and more toward her when its line comes
      S._e.set(0.1, yaw + Math.PI + (it.x > 0 ? -1 : 1) * (0.95 - 0.5 * on), Math.sin(T * 0.8 + it.seed) * 0.05); const mq = (S._qm || (S._qm = new THREE.Quaternion())).setFromEuler(S._e);
      const ss = s * (1 + 0.025 * (S.beat || 0) * on);
      m.compose(p, mq, S._s.set(ss, ss, ss)); S.layers[it.comedy ? 'dckMaskC' : 'dckMaskT'].add(m);
      const w = local(p, yaw, 0, 0, 2.5, S._o);
      glowAt(S, w.x, w.y, w.z, s * 2.6, it.comedy ? [1, 0.75, 0.35] : [0.45, 0.65, 1], 0.18 + 0.32 * on);
      glowAt(S, w.x, w.y - s * 1.6, w.z, s * 1.2, [1, 0.8, 0.5], 0.4 + 0.5 * on);
    },
    dckPopper(S, it, p, q) { const m = S._m, s = it.s ?? 2.2; m.compose(p, q, S._s.set(s, s, s)); S.layers.dckPopper.add(m); S.layers.dckPopGlass.add(m); glowAt(S, p.x, p.y + 3.3 * s, p.z, 3.4 * s, [1, 0.85, 0.5], 0.7 + 0.4 * (S.beat || 0)); poolAt(S, p.x, p.y + 0.05, p.z, 9 * s, [1, 0.8, 0.45], 0.55); },
    dckCounter(S, it, p, q) { const m = S._m, s = it.s ?? 1.4; m.compose(p, q, S._s.set(s, s, s)); S.layers.dckCounter.add(m); S.layers.dckMenu.add(m); poolAt(S, p.x, p.y + 0.05, p.z, 30 * s, [1, 0.72, 0.4], 0.6); },
    // a prize in the claw: a big duck held up, swaying, going up as you pass under it
    dckPrize(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, up = smooth(it.t - 1.2, it.t + 0.8, T) * (it.lift ?? 6);
      const sw = Math.sin(T * 2.1 + it.seed * 7) * 0.12;
      p.y += it.hy + up;
      S._e.set(sw * 0.5, yaw + Math.sin(T * 0.9) * 0.3, sw); const cq = (S._qc || (S._qc = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 3;
      m.compose(p, cq, S._s.set(s, s, s)); S.layers.dckBigClaw.add(m);
      const d = S._o.set(0, -1.15 * s, 0).applyQuaternion(cq).add(p);
      S._e.set(0.15 + sw, yaw + Math.PI + 0.4 + Math.sin(T * 1.3) * 0.2, sw * 2); const dq = (S._qd2 || (S._qd2 = new THREE.Quaternion())).setFromEuler(S._e);
      const ds = s * 1.35; m.compose(d, dq, S._s.set(ds, ds, ds)); S.layers.giantDuck.add(m, { aTint: it.tint });
      if (it.hat) S.layers[it.hat].add(m, { aTint: it.hat === 'pirateHat' ? [0.08, 0.07, 0.08] : [0.95, 0.95, 0.97] });
      glowAt(S, d.x, d.y, d.z, 7 * s, [1, 0.85, 0.45], 0.25);
    },
    dckDog(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, on = smooth(it.t0, it.t0 + 0.5, T);
      // a little nod on the beat once his line comes
      S._e.set(0.06 * on * (S.beat || 0), yaw + it.face, 0); const dq = (S._qg || (S._qg = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 3.2; m.compose(p, dq, S._s.set(s, s, s)); S.layers.dckDog.add(m);
      poolAt(S, p.x, p.y + 0.1, p.z, 9 * s, [1, 0.85, 0.6], 0.5);
      const w = local(p, yaw + it.face, 0, 3.5 * s, 3 * s, S._o); glowAt(S, w.x, w.y, w.z, 4.5 * s, [1, 0.9, 0.7], 0.3);
    },
    dckHoodie(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 3.4; S._e.set(0, yaw + it.face, 0); const hq = (S._qh || (S._qh = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, hq, S._s.set(s, s, s)); S.layers.dckHoodie.add(m);
      poolAt(S, p.x, p.y + 0.1, p.z, 9 * s, [1, 0.85, 0.6], 0.45);
      const w = local(p, yaw + it.face, 0, 2.5 * s, 2.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 4 * s, [1, 0.9, 0.6], 0.32);
    },
    // the door swings open, the blue pours out, and she's there in it, the light in her hair
    dckDoor(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, op = smooth(it.open, it.open + 0.35, T), her = smooth(it.open + 0.2, it.open + 0.9, T);
      if (p.y < -400) void S.layers.dckHer;
      const m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.dckDoorFrame.add(m);
      const ry = yaw;   // (the yaw a part gets already has the item's turn in it)
      // two leaves hinged at the posts, swinging out toward the road as it opens
      for (const sd of [-1, 1]) {
        const h = local(p, ry, sd * 6 * s, 0, 0.2 * s, S._o);
        S._e.set(0, ry + (sd < 0 ? 0 : Math.PI) + sd * op * 1.9, 0);
        const lq = (S._ql || (S._ql = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(h, lq, S._s.set(s, s, s)); S.layers.dckDoorLeaf.add(m);
      }
      if (her > 0.01) {
        const h = local(p, ry, 0, 0, -2.2 * s, S._o);
        m.compose(h, q, S._s.set(s * (0.6 + 0.4 * her), s, s)); S.layers.dckHer.add(m);
      }
      const k = op * (0.85 + 0.3 * (S.beat || 0));
      const w = local(p, ry, 0, 7 * s, 1.5 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 22 * s, [0.3, 0.6, 1], 0.55 * k); glowAt(S, w.x, w.y + 2 * s, w.z, 8 * s, [0.6, 0.85, 1], 0.9 * k);
      const f = local(p, ry, 0, 0.1, 9 * s, S._o); poolAt(S, f.x, p.y + 0.06, f.z, 26 * s, [0.3, 0.6, 1], 0.9 * k);
      const hh = local(p, ry, 0, 7.4 * s, -2.0 * s, S._o); glowAt(S, hh.x, hh.y, hh.z, 3.2 * s, [0.5, 0.85, 1], 1.4 * her);
    },
    // the film's forest: each plant comes up on its beat as she comes, then glows with the music
    dckBloom(S, it, p, q, yaw) {
      if (p.y < -400) { void S.layers.dckBloomF; void S.layers.dckBloomM; void S.layers.dckBloomS; }
      if (S.dckCull && it.t < (S.tNow ?? 0) - 0.45 && p.y > -400) return;
      const T = S.tNow ?? 0, a = T - it.tg;
      if (a <= 0 && p.y > -400) return;
      const g = clamp(a / 0.42, 0, 1), pop = g < 1 ? g * g * (3 - 2 * g) * (1 + 0.35 * Math.sin(Math.PI * g)) : 1;
      const sh = S.mats.dckBloomM && S.mats.dckBloomM.userData.shader; if (sh) sh.uniforms.uPulse.value = S.beat || 0;
      S._e.set(Math.sin(T * 0.7 + it.seed * 9) * 0.05, yaw + it.spin, Math.sin(T * 0.9 + it.seed * 5) * 0.06); const bq = (S._qbl || (S._qbl = new THREE.Quaternion())).setFromEuler(S._e);
      const s = it.s * Math.max(0.001, pop), m = S._m; m.compose(p, bq, S._s.set(s, s * (1 + 0.04 * (S.beat || 0)), s));
      S.layers[it.kind].add(m, { aTint: it.tint });
      if (it.kind === 'dckBloomS') glowAt(S, p.x, p.y + 5.9 * s, p.z, 2.6 * s, [0.6, 1, 1], 0.9 * pop * (0.8 + 0.5 * (S.beat || 0)));
      else if (g < 1) glowAt(S, p.x, p.y + 1.5 * s, p.z, 5 * s, [0.4, 1, 0.9], 0.8 * (1 - g));
    },
    // her, standing in the doorway with the blue behind her, faced to him coming through it
    dckHerStand(S, it, p, q, yaw) {
      if (p.y < -400) void S.layers.dckHer;
      const T = S.tNow ?? 0, k = smooth(it.t0, it.t0 + 0.5, T);
      if (k <= 0.001) return;
      const s = it.s ?? 1.25, m = S._m;
      S._e.set(0, yaw + Math.PI + (it.x > 0 ? -0.35 : 0.35), 0); const hq = (S._qh2 || (S._qh2 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, hq, S._s.set(s, s * (0.98 + 0.02 * Math.sin(T * 2)), s)); S.layers.dckHer.add(m);
      const b = S.beat || 0;
      // the light from behind her (so she stands dark against it), and in her hair
      const w = local(p, yaw, 0, 4.5 * s, 4, S._o);
      glowAt(S, w.x, w.y, w.z, 22 * s, [0.25, 0.55, 1], 0.75 * k);
      glowAt(S, w.x, w.y + 2.2 * s, w.z, 7 * s, [0.55, 0.85, 1], (1.2 + 0.5 * b) * k);
      poolAt(S, p.x, p.y + 0.06, p.z, 26, [0.3, 0.6, 1], 0.9 * k);
    },
    dckPrizeWall(S, it, p, q) {
      const T = S.tNow ?? 0, on = smooth(it.t0, it.t0 + 0.6, T);
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.dckPrizeWall.add(m);
      const yaw = S.course.sample(it.t).yaw + (it.rot || 0);
      for (let k = 0; k < 5; k++) { const w = local(p, yaw, 1.6, 1.4 + k * 3.2, 0, S._o); glowAt(S, w.x, w.y, w.z, 10, [1, 0.85, 0.5], (0.12 + 0.5 * on) * (0.8 + 0.4 * (S.beat || 0))); }
    },
    dckFrame(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; S._e.set(0, yaw + it.face, 0); const fq = (S._qf || (S._qf = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(s, s, s));
      if (p.y < -400) { void S.layers.dckFrameDown; void S.layers.dckFrame; void S.layers.dckPhoto; }
      if (it.down) { S.layers.dckFrameDown.add(m); return; }
      S.layers.dckFrame.add(m); S.layers.dckPhoto.add(m, { aIdx: it.photo });
      const w = local(p, yaw + it.face, 0, 6 * s, 3 * s, S._o); glowAt(S, w.x, w.y, w.z, 9 * s, [1, 0.9, 0.75], 0.25);
    },
    dckMirror(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; S._e.set(0, yaw + it.face, 0); const fq = (S._qf || (S._qf = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.dckMirrorStand.add(m); S.layers.dckMirrorGlass.add(m);
      if (S.mats.dckMirrorM) S.mats.dckMirrorM.uniforms.uT.value = S.tNow ?? 0;
      const w = local(p, yaw + it.face, 0, 18 * s, 2 * s, S._o); glowAt(S, w.x, w.y, w.z, 22 * s, [1, 0.3, 0.35], 0.22);
    },
    dckTruck(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.6, 1.6, 1.6)); S.layers.dckTruck.add(m); glowAt(S, p.x, p.y + 5.5, p.z, 5, [1, 0.95, 0.85], 1.2); },
    // a light mast: its floods breathe with the beat in the chorus, the lot lit orange under it
    dckMast(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.dckMast.add(m);
      // the lamp colour, worked out again only when the look changes it
      if (S._dckLampHex !== S.P.lamp) { S._dckLampHex = S.P.lamp; S._dckLampCol = col(S.P.lamp ?? 0xffa040); }
      const lamp = S._dckLampCol;
      for (const x of [-1.6, 1.6]) { const w = local(p, yaw, x, 21.2, 0.3, S._o); glowAt(S, w.x, w.y, w.z, 4.2, lamp, 1.3, S.beatLamps ? 4 : 0); }
      glowAt(S, p.x, p.y + 21, p.z, 16, lamp, 0.22, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, p.y + 0.05, p.z, 46, lamp, 0.85);
    },
    // the big inflatable duck on the cinema's roof, bobbing on its ropes
    dckBalloon(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, b = S.beat || 0;
      p.y += Math.sin(T * 1.4 + it.seed) * 0.9 + b * 0.7;
      S._e.set(Math.sin(T * 0.9) * 0.06 - b * 0.03, yaw + it.face + Math.sin(T * 0.5) * 0.15, Math.sin(T * 1.1) * 0.05); const bq = (S._qb2 || (S._qb2 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 16; m.compose(p, bq, S._s.set(s, s, s)); S.layers.giantDuck.add(m, { aTint: [1, 0.8, 0.12] });
      glowAt(S, p.x, p.y + 0.3 * s, p.z, 1.6 * s, [1, 0.8, 0.3], 0.3);
      poolAt(S, p.x, p.y - 0.3 * s, p.z, 1.5 * s, [1, 0.85, 0.4], 0.5);
    },
    // a line on a marquee: lit when its line comes, the bulbs round it chasing on the beat
    dckMarquee(S, it, p, q, yaw) {
      if (p.y < -400) { void S.layers.dckMarquee; void S.layers.dckMarqueeHang; void S.layers.dckMarqFace; }
      const fl = S.floorFn ? S.floorFn(it.t, it.x) : 0;
      p.y = fl + (it.h || 12);
      const T = S.tNow ?? 0, s = it.s ?? 1.1;
      const h = S.course.sample(it.t).yaw;
      S._e.set(0, h + Math.PI + (it.x > 0.5 ? -0.42 : (it.x < -0.5 ? 0.42 : 0)), 0); const fq = (S._qq || (S._qq = new THREE.Quaternion())).setFromEuler(S._e);
      // over the road it hangs on cables; at the side it stands on its posts
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s)); S.layers[Math.abs(it.x) < 1 ? 'dckMarqueeHang' : 'dckMarquee'].add(m);
      const on = smooth(it.t0 ?? it.t - 1.4, (it.t0 ?? it.t - 1.4) + 0.25, T);
      S.layers.dckMarqFace.add(m, { aIdx: it.idx, aWake: [0.3 + 0.8 * on, 0] });
      const by = h + Math.PI + (it.x > 0.5 ? -0.42 : (it.x < -0.5 ? 0.42 : 0));
      const bi = Math.floor(S.course.beatAt(T)), bf = S.beat || 0;
      // bulbs: round the face, every other one lit and the lit ones moving on each beat
      let k = 0;
      for (let u = -7.8; u <= 7.81; u += 1.2) for (let j = 0; j < 2; j++) { const v = j ? 2.75 : -2.75; const lit = (k + bi) % 2 === 0; const w = local(p, by, u * s, v * s, 0.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.1 * s, BULB, (lit ? 1.1 + 0.6 * bf : 0.25) * (0.3 + 0.7 * on)); k++; }
      for (let v = -1.55; v <= 1.56; v += 1.55) for (let j = 0; j < 2; j++) { const u = j ? 7.8 : -7.8; const lit = (k + bi) % 2 === 0; const w = local(p, by, u * s, v * s, 0.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.1 * s, BULB, (lit ? 1.1 + 0.6 * bf : 0.25) * (0.3 + 0.7 * on)); k++; }
      const c = local(p, by, 0, 0, 4 * s, S._o); glowAt(S, c.x, c.y, c.z, 18 * s, BULB_HALO, 0.12 * on);
    },
    // a duck on the dunes in the machine; they jump a little on the beat in the chorus
    dckSeaDuck(S, it, p, q) {
      if (S.dckCull && it.t < (S.tNow ?? 0) - 0.45 && p.y > -400) return;
      const hop = (S.dckSeaHop || 0) * Math.max(0, Math.sin(Math.PI * clamp((S.dckBeatF ?? 0) * 2 - it.seed * 0.8, 0, 1))) * 0.9 * it.s;
      p.y += hop;
      if (hop > 0.001) { S._e.set(it.rx, S.course.sample(it.t).yaw + (it.rot || 0), it.rz + hop * 0.2); q = (S._qs || (S._qs = new THREE.Quaternion())).setFromEuler(S._e); }
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.dckSeaDuck.add(m, { aTint: it.tint });
    },
  },
  kits: {
    // the seats on the tiers either side of the aisle, and who's in them. There are thousands, so
    // they go in a list of their own that dck-fx draws, only the stretch in view (not as scenery items)
    dckAudience(S, z, R) {
      const every = z.every ?? 0.075, list = S.dckCrowd || (S.dckCrowd = []);
      for (let t = z.from; t < z.to; t += every) {
        const fy = floorOf(S, t);
        for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
          if ((z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          const x = side * (12 + 4.2 * k + 2.1);
          const v = k === 0 ? 4 : Math.floor(R() * 4);
          list.push({ t: t + (k % 2) * every * 0.5, x, h: fy + 1.35 * k, rot: z.face === 'back' ? Math.PI : 0, v, seed: R(), blueAt: z.blueAt, lit: z.lit, ahead: z.ahead ?? 4.5 });
        }
      }
    },
    dckMasks(S, z) {
      for (const m of z.at) S.items.push({ t: m.t, x: m.x, h: floorOf(S, m.t) + (m.h ?? 11), rot: 0, t0: m.t0, comedy: m.comedy, s: m.s ?? 5.2, seed: m.t, parts: 'dckMask', ahead: 30 });
    },
    dckPoppers(S, z) { for (const [t, x] of z.at) S.items.push({ t, x, h: floorOf(S, t), rot: SIDE(x), s: z.s ?? 2.2, parts: 'dckPopper', ahead: 20 }); },
    dckCounter(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at), rot: SIDE(z.x), s: z.s ?? 1.4, parts: 'dckCounter', ahead: 22 }); },
    dckPrizes(S, z, R) { for (const pz of z.at) S.items.push({ t: pz.t, x: pz.x, h: S.course.sample(pz.t).y, hy: pz.hy ?? 7, lift: pz.lift ?? 7, rot: 0, s: pz.s ?? 2.8, tint: pz.tint ?? [1, 0.78, 0.12], hat: pz.hat, seed: R(), parts: 'dckPrize', ahead: 14 }); },
    dckDog(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at) + duneAt(z.x), rot: 0, face: FACE(z.x, 0.6), s: z.s ?? 3.2, t0: z.t0 ?? z.at - 1.4, parts: 'dckDog', ahead: 20 }); },
    dckHoodie(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at) + duneAt(z.x) - 0.6, rot: 0, face: FACE(z.x, 0.7), s: z.s ?? 4.4, parts: 'dckHoodie', ahead: 20 }); },
    dckDoor(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at), rot: SIDE(z.x), s: z.s ?? 1, open: z.open, parts: 'dckDoor', ahead: 18 }); },
    // the shelves stick out from the wall toward the road whichever side they're on
    // the forest out of the screen: from the burst, each plant coming up on the first beat after it's this close
    dckBloom(S, z, R) {
      const c = S.course, kinds = ['dckBloomF', 'dckBloomF', 'dckBloomM', 'dckBloomS'];
      const tints = { dckBloomF: [[0.7, 1.2, 1.1], [0.5, 1.3, 1.0]], dckBloomM: [[1.3, 0.6, 1.3], [0.8, 0.8, 1.4]], dckBloomS: [[0.9, 1.2, 1.3]] };
      for (let t = z.from; t < z.to; t += z.every ?? 0.07) for (const side of [-1, 1]) {
        const x = side * (9.6 + R() * (z.w ?? 24)), ax = Math.abs(x);
        // her seat in the front row stays clear: [from, to, side, out to |x|]
        if ((z.clear || []).some(([a, b, sd, xm]) => t > a && t < b && side === sd && ax < xm)) continue;
        const tier = ax < 12 ? 0 : 1.35 * Math.min(5, Math.floor((ax - 12) / 4.2));
        const want = Math.max(z.burst, t - (z.lead ?? 2.8) + R() * 0.3);
        const tg = c.beats[Math.min(c.beats.length - 1, Math.ceil(c.beatAt(want) - 1e-6))];
        const kind = kinds[Math.floor(R() * kinds.length)], tl = tints[kind];
        S.items.push({ t: t + R() * 0.03, x, h: floorOf(S, t) + tier + (ax < 12 ? 0 : 0.6), rot: 0, spin: R() * 6.28, s: (kind === 'dckBloomS' ? 1.0 : 1.2) * (0.9 + R() * 0.9), kind, tint: tl[Math.floor(R() * tl.length)], tg, seed: R(), parts: 'dckBloom', ahead: 5 });
      }
    },
    dckHerStand(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at), rot: 0, s: z.s ?? 1.25, t0: z.t0, parts: 'dckHerStand', ahead: 14 }); },
    dckPrizeWall(S, z) { for (const [t, x] of z.at) S.items.push({ t, x, h: floorOf(S, t), rot: x > 0 ? 0 : Math.PI, t0: z.t0, parts: 'dckPrizeWall', ahead: 16 }); },
    dckFrames(S, z) { for (const f of z.at) S.items.push({ t: f.t, x: f.x, h: floorOf(S, f.t), rot: 0, face: f.down ? FACE(f.x, 0.4) : FACE(f.x, 0.55), s: f.s ?? 1, photo: f.photo ?? 0, down: f.down, parts: 'dckFrame', ahead: 24 }); },
    dckMirror(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at), rot: 0, face: FACE(z.x, 0.65), s: z.s ?? 1, parts: 'dckMirror', ahead: 30 }); },
    // every duck he ever won: ranks of them along the dresser, all faced to her coming
    dckParade(S, z, R) {
      const Y = [1, 0.78, 0.12];
      const tints = [Y, Y, Y, [1, 0.42, 0.62], [0.3, 0.56, 1.0], [0.95, 0.95, 0.97], [0.32, 0.78, 0.34], [0.58, 0.38, 0.9], [1, 0.55, 0.15]];
      for (let t = z.from; t < z.to; t += z.every ?? 0.11) for (const side of [-1, 1]) for (const x0 of z.ranks ?? [11, 16, 21]) {
        const x = side * (x0 + (R() - 0.5) * 1.2);
        S.items.push({ t: t + (R() - 0.5) * 0.03, x, h: floorOf(S, t), rot: Math.PI + side * 0.25 + (R() - 0.5) * 0.2, s: (z.s ?? 3.2) * (0.85 + R() * 0.3), parts: 'giantDuck', tint: tints[Math.floor(R() * tints.length)], ahead: 10, hop: true, seed: R() });
      }
    },
    dckTrucks(S, z, R) { for (const [t, x] of z.at) S.items.push({ t, x, h: floorOf(S, t), rot: R() * 6.28, parts: 'dckTruck', ahead: 30 }); },
    dckMasts(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) { const tt = t + (side > 0 ? 0.37 : 0); S.items.push({ t: tt, x: side * (z.x ?? 33.5), h: floorOf(S, tt), rot: SIDE(side) + Math.PI / 2, parts: 'dckMast', ahead: 12 }); } },
    dckBalloon(S, z) { S.items.push({ t: z.at, x: z.x, h: floorOf(S, z.at) + (z.h ?? 22), rot: 0, face: FACE(z.x, 0.9), s: z.s ?? 16, seed: 1.3, parts: 'dckBalloon', ahead: 40 }); },
    // the claw machine's ducks: heaped on the dunes either side, and right under you over the gap
    dckDunes(S, z, R) {
      const Y = [1, 0.78, 0.12];
      const tints = [Y, Y, Y, Y, Y, [1, 0.45, 0.65], [0.35, 0.6, 1.0], [0.96, 0.96, 0.98], [0.08, 0.08, 0.09], [1, 0.55, 0.15]];
      // thousands of them: a list of their own that dck-fx draws, only the stretch in view
      const list = S.dckSea || (S.dckSea = []);
      for (let t = z.from; t < z.to; t += z.every ?? 0.05) {
        const fy = floorOf(S, t);
        for (const side of [-1, 1]) for (let k = 0; k < (z.n ?? 3); k++) {
          const x = side * (12.5 + R() * 18);
          list.push({ t: t + R() * 0.03, x, h: fy + duneAt(x) + 0.35, rot: R() * 6.28, rx: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6, s: 1.3 + R() * 0.8, tint: tints[Math.floor(R() * tints.length)], seed: R(), ahead: z.ahead ?? 4.2 });
        }
      }
      // a mound of them under the hole in the road (the gaps in this stretch)
      const under = z.under === true ? (S.course.gaps || []).filter((g) => g.lip > z.from - 0.5 && g.lip < z.to).map((g) => [g.from - 0.1, g.to + 0.25]) : (z.under || []);
      for (const [a, b] of under) for (let t = a; t < b; t += 0.012) for (let k = 0; k < 4; k++) {
        const x = (R() - 0.5) * 18, fy = floorOf(S, t);
        list.push({ t, x, h: fy + 0.4 + R() * 1.2, rot: R() * 6.28, rx: (R() - 0.5) * 0.8, rz: (R() - 0.5) * 0.8, s: 1.4 + R() * 0.7, tint: tints[Math.floor(R() * tints.length)], seed: R(), ahead: 6 });
      }
    },
  },
});
