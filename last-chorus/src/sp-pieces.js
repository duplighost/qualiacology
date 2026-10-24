// Summer People's set-pieces, each on its line: the lifeguard chairs stacked bone on bone; the
// bandstand where February rehearses; the fry stand's first warm Friday; the screen doors
// getting their voices back; the hydrangeas doing the one blue trick; kites and beach balls for
// the summer people; the chair kept for you; the kids' swim rings in the cold green water; your
// grandmother's nap under the big umbrella; your bikes against the fences; the last car south;
// the plywood going up in the first cold rain.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, x, y, z, w = 10, h = 8) => { const g = new THREE.SphereGeometry(r, w, h); g.translate(x, y, z); return g; };
const TAU = Math.PI * 2;

// lit a little by itself (a summer evening keeps things visible), vertex-coloured
function litVC(opts, k, key) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = () => 'sum' + key;
  return m;
}
const VC = (M, key, opts, k = 0.35) => M[key] || (M[key] = litVC(opts, k, key));
// turned to her as she comes up the road, a little toward it
function faceQ(S, it, extra = 0) {
  const h = S.course.sample(it.t).yaw;
  S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5) + extra, 0);
  return (S._qsp || (S._qsp = new THREE.Quaternion())).setFromEuler(S._e);
}

// ---------- the things ----------
// four lifeguard chairs tipped and piled, bone on bone (one chair: 1.6 wide, 4.3 tall)
function chair() {
  const parts = [], wood = rgb(0xe8e2d4);
  for (const x of [-0.7, 0.7]) for (const z of [-0.6, 0.6]) { const l = box(0.14, 3.2, 0.14, x, 1.6, z); l.rotateX(z * 0.12); parts.push(paint(l, wood)); }
  parts.push(paint(box(1.6, 0.14, 1.0, 0, 3.2, 0), wood), paint(box(1.6, 1.0, 0.1, 0, 3.75, -0.5), wood));
  for (let y = 0.6; y < 3; y += 0.6) parts.push(paint(box(1.4, 0.09, 0.09, 0, y, 0.55), wood));
  parts.push(paint(box(1.2, 0.5, 0.06, 0, 2.3, -0.58), rgb(0xd83a3a)));      // the red cross board
  return merge(parts);
}
function chairStack() {
  const one = chair(), parts = [];
  const poses = [[0, 0.75, 0, Math.PI / 2, 0, 0], [0.3, 1.9, 0.4, Math.PI / 2, 0.35, 0.1], [-0.4, 3.0, -0.2, Math.PI / 2 - 0.2, -0.3, -0.1], [0.2, 4.0, 0.3, Math.PI / 2 + 0.25, 0.8, 0.15]];
  for (const [x, y, z, rx, ry, rz] of poses) { const g = one.clone(); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); parts.push(g); }
  return merge(parts);
}
// the bandstand: a white octagon, its roof, one mic stand in the middle
function bandstand() {
  const parts = [], white = rgb(0xf2eee8), roof = rgb(0x3a5a6a);
  parts.push(paint(cyl(6, 6.3, 1.2, 8, 0, 0.6, 0), white));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8; parts.push(paint(cyl(0.18, 0.2, 5.2, 6, Math.cos(a) * 5.5, 3.8, Math.sin(a) * 5.5), white)); parts.push(paint(box(4.2, 0.12, 0.12, Math.cos(a) * 5.5, 2.2, Math.sin(a) * 5.5).rotateY(-a + Math.PI / 2), white)); }
  const r = new THREE.ConeGeometry(7.2, 3.2, 8); r.rotateY(Math.PI / 8); r.translate(0, 7.9, 0); parts.push(paint(r, roof));
  parts.push(paint(cyl(0.35, 0.35, 0.6, 8, 0, 9.7, 0), white));
  parts.push(paint(cyl(0.05, 0.05, 1.6, 6, 0, 2.0, 0), rgb(0x2a2a30)), paint(cyl(0.5, 0.5, 0.06, 10, 0, 1.23, 0), rgb(0x2a2a30)), paint(sph(0.14, 0, 2.85, 0.05), rgb(0x3a3a40)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}
// a screen door in its frame (hinged on its left edge at x 0), 2.2 tall
function screenDoor() {
  const parts = [], frame = rgb(0xf4f0e8);
  parts.push(paint(box(0.08, 2.2, 0.06, 0.02, 1.1, 0), frame), paint(box(0.08, 2.2, 0.06, 0.94, 1.1, 0), frame));
  parts.push(paint(box(0.96, 0.08, 0.06, 0.48, 0.04, 0), frame), paint(box(0.96, 0.08, 0.06, 0.48, 2.16, 0), frame), paint(box(0.96, 0.08, 0.06, 0.48, 1.0, 0), frame));
  parts.push(paint(box(0.86, 0.9, 0.01, 0.48, 1.55, 0), rgb(0x5a6a72)), paint(box(0.86, 0.85, 0.01, 0.48, 0.5, 0), rgb(0x5a6a72)));
  return merge(parts);
}
// a hydrangea bush: a mound of leaves and its heads (the heads painted white: the tint makes them blue)
function hydrangea() {
  const parts = [], R = seeded(17);
  for (let k = 0; k < 9; k++) { const a = R() * TAU, r = R() * 1.4; parts.push(paint(sph(0.9 + R() * 0.5, Math.cos(a) * r, 0.7 + R() * 0.5, Math.sin(a) * r, 8, 6), [0.16, 0.3, 0.14])); }
  const g0 = merge(parts);
  const heads = [];
  for (let k = 0; k < 11; k++) { const a = R() * TAU, r = 0.3 + R() * 1.3; heads.push(paint(sph(0.48 + R() * 0.2, Math.cos(a) * r, 1.4 + R() * 0.7, Math.sin(a) * r, 9, 7), [1, 1, 1])); }
  return { leaves: g0, heads: merge(heads) };
}
// a kite: a diamond, its spars, a tail of bows
function kite() {
  const s = new THREE.Shape(); s.moveTo(0, 1.6); s.lineTo(1.0, 0.25); s.lineTo(0, -1.2); s.lineTo(-1.0, 0.25); s.closePath();
  const g = new THREE.ShapeGeometry(s); const parts = [paint(g, [1, 1, 1])];
  for (let k = 0; k < 6; k++) { const b = box(0.36, 0.12, 0.02, Math.sin(k * 1.3) * 0.3, -1.5 - k * 0.55, 0); b.rotateZ(Math.sin(k) * 0.5); parts.push(paint(b, [1, 1, 1])); }
  return merge(parts);
}
// a beach ball: six panels, white and colours
function beachBall() {
  const g = new THREE.SphereGeometry(1, 24, 12).toNonIndexed(), p = g.attributes.position.array, c = new Float32Array(p.length);
  const cs = [[0.95, 0.2, 0.25], [1, 1, 1], [0.15, 0.45, 0.95], [1, 1, 1], [1, 0.82, 0.15], [1, 1, 1]];
  for (let i = 0; i < p.length; i += 9) { const x = (p[i] + p[i + 3] + p[i + 6]) / 3, z = (p[i + 2] + p[i + 5] + p[i + 8]) / 3; const k = Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * 6) % 6; for (let j = 0; j < 3; j++) c.set(cs[k], i + j * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
}
// the chair kept for you: a beach chair, its towel, an umbrella over it
function keptChair() {
  const parts = [];
  const seat = box(0.9, 0.08, 1.6, 0, 0.45, 0); seat.rotateX(-0.25); parts.push(paint(seat, rgb(0x2a7a8a)));
  const back = box(0.9, 1.0, 0.08, 0, 0.95, -0.75); back.rotateX(-0.35); parts.push(paint(back, rgb(0x2a7a8a)));
  for (const x of [-0.45, 0.45]) { parts.push(paint(box(0.05, 0.5, 0.05, x, 0.25, 0.6), rgb(0xd8d8d8)), paint(box(0.05, 0.9, 0.05, x, 0.45, -0.6), rgb(0xd8d8d8))); }
  const towel = box(0.85, 0.03, 1.5, 0, 0.53, 0.02); towel.rotateX(-0.25); parts.push(paint(towel, rgb(0xff8a5c)));
  parts.push(paint(cyl(0.04, 0.04, 2.8, 6, 0.6, 1.4, -0.2), rgb(0xd8d8d8)));
  const can = new THREE.ConeGeometry(1.8, 0.7, 12, 1, true); can.translate(0.6, 2.75, -0.2);
  const cc = new Float32Array(can.attributes.position.count * 3); for (let i = 0; i < can.attributes.position.count; i++) { const a = Math.atan2(can.attributes.position.getZ(i) + 0.2, can.attributes.position.getX(i) - 0.6); const k = Math.floor(((a + Math.PI) / TAU) * 12) % 2; cc.set(k ? [1, 1, 1] : [0.95, 0.35, 0.4], i * 3); }
  can.setAttribute('color', new THREE.BufferAttribute(cc, 3)); parts.push(can);
  const g = merge(parts); g.computeVertexNormals(); return g;
}
// a grandmother's nap: a lounge chair under a big striped umbrella, her sun hat on the arm
function napShade() {
  const parts = [];
  const lounge = box(0.8, 0.1, 2.2, 0, 0.5, 0); parts.push(paint(lounge, rgb(0xf2ead8)));
  const back = box(0.8, 0.1, 0.9, 0, 0.85, -1.25); back.rotateX(0.7); parts.push(paint(back, rgb(0xf2ead8)));
  for (const x of [-0.38, 0.38]) for (const z of [-0.9, 0.9]) parts.push(paint(box(0.06, 0.5, 0.06, x, 0.25, z), rgb(0xc8c0b0)));
  const hat = cyl(0.45, 0.45, 0.04, 14, 0.55, 0.62, 0.4); parts.push(paint(hat, rgb(0xf4dca0))); parts.push(paint(cyl(0.2, 0.22, 0.18, 12, 0.55, 0.72, 0.4), rgb(0xf4dca0)));
  parts.push(paint(cyl(0.06, 0.06, 4.2, 6, -0.6, 2.1, 0), rgb(0xe8e8e8)));
  const can = new THREE.ConeGeometry(3.2, 1.0, 16, 1, true); can.translate(-0.6, 4.1, 0);
  const cc = new Float32Array(can.attributes.position.count * 3); for (let i = 0; i < can.attributes.position.count; i++) { const a = Math.atan2(can.attributes.position.getZ(i), can.attributes.position.getX(i) + 0.6); const k = Math.floor(((a + Math.PI) / TAU) * 16) % 2; cc.set(k ? [0.98, 0.95, 0.85] : [0.3, 0.55, 0.85], i * 3); }
  can.setAttribute('color', new THREE.BufferAttribute(cc, 3)); parts.push(can);
  const g = merge(parts); g.computeVertexNormals(); return g;
}
// a swim ring
function swimRing() { const g = new THREE.TorusGeometry(1, 0.42, 10, 24); g.rotateX(Math.PI / 2); return paint(g, [1, 1, 1]); }
// a bicycle leaning on its kickstand (its frame painted white: the tint colours it)
function bike() {
  const parts = [];
  for (const z of [-0.55, 0.55]) { const w = new THREE.TorusGeometry(0.34, 0.035, 6, 20); w.rotateY(Math.PI / 2); w.translate(0, 0.36, z); parts.push(paint(w, [0.1, 0.1, 0.1])); }
  const tube = (a, b, r = 0.03) => { const d = new THREE.Vector3().subVectors(b, a); const g = new THREE.CylinderGeometry(r, r, d.length(), 6); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate(a.x, a.y, a.z); return paint(g, [1, 1, 1]); };
  const V = (y, z) => new THREE.Vector3(0, y, z);
  parts.push(tube(V(0.36, -0.55), V(0.62, -0.15)), tube(V(0.62, -0.15), V(0.36, 0.2)), tube(V(0.36, 0.2), V(0.36, -0.55)), tube(V(0.62, -0.15), V(0.66, 0.42)), tube(V(0.66, 0.42), V(0.36, 0.55)), tube(V(0.36, 0.2), V(0.66, 0.42)));
  parts.push(paint(box(0.22, 0.05, 0.28, 0, 0.7, -0.18), [0.12, 0.1, 0.1]), paint(box(0.5, 0.04, 0.04, 0, 0.82, 0.44), [0.2, 0.2, 0.2]));
  const g = merge(parts); g.computeVertexNormals(); return g;
}
function picketFence() {
  const parts = [], white = rgb(0xf2f0ea);
  for (let z = -4; z <= 4; z += 0.42) { const p = box(0.08, 1.1, 0.24, 0, 0.55, z); parts.push(paint(p, white)); const tip = new THREE.ConeGeometry(0.17, 0.2, 4); tip.rotateY(Math.PI / 4); tip.translate(0, 1.2, z); parts.push(paint(tip, white)); }
  for (const y of [0.35, 0.85]) parts.push(paint(box(0.06, 0.1, 8.4, -0.05, y, 0), white));
  return merge(parts);
}
// a sheet of plywood
function plywood() { return paint(box(2.4, 1.6, 0.05, 0, 0, 0), rgb(0xb8925e)); }

const TT = { aTint: 3 };
const HYD = hydrangea();
extend({
  layers: {
    sumChairs: (M) => [chairStack(), VC(M, 'sumWood', { roughness: 0.8, metalness: 0 }), 4, {}],
    sumStand: (M) => [bandstand(), VC(M, 'sumWood', { roughness: 0.8, metalness: 0 }), 2, {}],
    sumDoor: (M) => [screenDoor(), VC(M, 'sumWood', { roughness: 0.8, metalness: 0 }), 24, {}],
    sumLeaves: (M) => [HYD.leaves, VC(M, 'sumLeaf', { roughness: 0.9, metalness: 0, flatShading: true }, 0.25), 160, {}],
    sumHeads: (M) => [HYD.heads, M.sumHeadM || (M.sumHeadM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.45;'); }; m.customProgramCacheKey = () => 'sumHeads'; return m; })()), 160, TT],
    sumKite: (M) => [kite(), M.sumKiteM || (M.sumKiteM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.5;'); }; m.customProgramCacheKey = () => 'sumKite'; return m; })()), 40, TT],
    sumBall: (M) => [beachBall(), VC(M, 'sumBallM', { roughness: 0.35, metalness: 0 }, 0.45), 40, {}],
    sumKept: (M) => [keptChair(), VC(M, 'sumCloth', { roughness: 0.7, metalness: 0, side: THREE.DoubleSide }, 0.4), 3, {}],
    sumNap: (M) => [napShade(), VC(M, 'sumCloth', { roughness: 0.7, metalness: 0, side: THREE.DoubleSide }, 0.4), 3, {}],
    sumRing: (M) => [swimRing(), M.sumRingM || (M.sumRingM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.5;'); }; m.customProgramCacheKey = () => 'sumRing'; return m; })()), 30, TT],
    sumBike: (M) => [bike(), M.sumBikeM || (M.sumBikeM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.4;'); }; m.customProgramCacheKey = () => 'sumBike'; return m; })()), 40, TT],
    sumPicket: (M) => [picketFence(), VC(M, 'sumWood', { roughness: 0.8, metalness: 0 }), 12, {}],
    sumPly: (M) => [plywood(), VC(M, 'sumWood', { roughness: 0.8, metalness: 0 }), 60, {}],
  },
  parts: {
    sumChairs(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.sumChairs.add(m); poolAt(S, p.x, p.y + 0.05, p.z, 9 * s, [0.75, 0.82, 1], 0.35); },
    // the bandstand and its one spot on the empty mic
    sumStand(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.sumStand.add(m);
      glowAt(S, p.x, p.y + 7.2 * s, p.z, 2.4 * s, [1, 0.92, 0.75], 1.6); poolAt(S, p.x, p.y + 1.25 * s, p.z, 7 * s, [1, 0.9, 0.7], 1.0);
    },
    // a door that bangs open and shut on the beat once spring has come
    sumDoor(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, alive = smooth(it.t0, it.t0 + 0.4, T);
      const swing = alive * (0.6 + 0.5 * Math.sin(T * 3.1 + it.seed * 9)) * (1 + 0.6 * (S.beat || 0));
      S._e.set(0, yaw + it.face - swing, 0); const dq = (S._qd || (S._qd = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, dq, S._s.set(s, s, s)); S.layers.sumDoor.add(m);
      const w = local(p, yaw + it.face, 0.5 * s, 1.2 * s, -0.6 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 1.8 * s, col(S.P.window ?? 0xffc070), 0.3 + 1.4 * alive);
    },
    // hydrangeas: green, then blue as the line comes, a little bigger on the beat
    sumHyd(S, it, p, q) {
      const T = S.tNow ?? 0, bloom = smooth(it.t0, it.t0 + 0.8, T);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.sumLeaves.add(m);
      const hs = s * (0.5 + 0.5 * bloom) * (1 + 0.05 * (S.beat || 0) * bloom);
      const blue = [0.32 + 0.1 * it.seed, 0.48, 1.0], green = [0.4, 0.62, 0.32];
      const c = [green[0] + (blue[0] - green[0]) * bloom, green[1] + (blue[1] - green[1]) * bloom, green[2] + (blue[2] - green[2]) * bloom];
      m.compose(p, q, S._s.set(hs, hs, hs)); S.layers.sumHeads.add(m, { aTint: c });
    },
    sumKept(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, faceQ(S, it, 0.4), S._s.set(s, s, s)); S.layers.sumKept.add(m); poolAt(S, p.x, p.y + 0.05, p.z, 8 * s, [1, 0.85, 0.6], 0.4); },
    sumNap(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, faceQ(S, it, 0.6), S._s.set(s, s, s)); S.layers.sumNap.add(m); poolAt(S, p.x, p.y + 0.05, p.z, 10 * s, [0.35, 0.45, 0.6], 0.25); },
    sumBike(S, it, p, q, yaw) {
      S._e.set(0, yaw + it.face, it.lean); const bq = (S._qb || (S._qb = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, bq, S._s.set(s, s, s)); S.layers.sumBike.add(m, { aTint: it.tint });
    },
    sumPicket(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.sumPicket.add(m); },
  },
  kits: {
    sumChairs(S, z) { S.items.push({ t: z.at, x: z.x, rot: 0.6, s: z.s ?? 2.2, parts: 'sumChairs', ahead: 30 }); },
    // one shop on its line, lit (the fry stand's first warm Friday)
    sumShop(S, z) { const sd = z.x > 0 ? 1 : -1; S.items.push({ t: z.at, x: z.x, rot: sd > 0 ? Math.PI / 2 : -Math.PI / 2, s: z.s ?? 1.3, parts: 'shop', tint: col(z.tint ?? 0xfff2c8), seed: 0.6, idx: S.atlas.index[z.sign], wake0: 1, keepLit: true }); },
    sumStand(S, z) { S.items.push({ t: z.at, x: z.x, rot: 0, s: z.s ?? 1.2, parts: 'sumStand', ahead: 30 }); },
    // screen doors on the cottage fronts along the road, each coming alive on its own beat
    sumDoors(S, z, R) { let k = 0; for (const t of z.at) { const side = z.side ?? 1; S.items.push({ t, x: side * (z.x ?? 17), rot: 0, face: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: z.s ?? 3.0, t0: (z.t0 ?? t - 1.5) + k * 0.12, seed: R(), parts: 'sumDoor', ahead: 26 }); k++; } },
    sumHyd(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.16) { const side = k++ % 2 ? 1 : -1; S.items.push({ t: t + R() * 0.05, x: side * ((z.x ?? 15) + R() * 4), rot: R() * TAU, s: (z.s ?? 2.1) * (0.8 + R() * 0.4), t0: z.t0 + (t - z.from) * 0.15, seed: R(), parts: 'sumHyd', ahead: 24 }); } },
    sumKept(S, z) { for (const t of [].concat(z.at)) S.items.push({ t, x: z.x, s: z.s ?? 3.0, parts: 'sumKept', ahead: 26 }); },
    sumNap(S, z) { S.items.push({ t: z.at, x: z.x, s: z.s ?? 3.0, parts: 'sumNap', ahead: 26 }); },
    // bikes against a picket fence along the road
    sumBikes(S, z, R) {
      const side = z.side ?? 1, cols = [0xff5a6a, 0x5ad0ff, 0xffd84a, 0x8aff8a, 0xff9ad8, 0xffffff, 0x2a2a30];
      for (let t = z.from; t < z.to; t += 0.2) S.items.push({ t, x: side * (z.x ?? 16.5) + side * 0.9, rot: 0, s: 1.8, parts: 'sumPicket', ahead: 24 });
      for (let t = z.from + 0.04; t < z.to; t += 0.055) if (R() < 0.85) S.items.push({ t, x: side * (z.x ?? 16.5), face: side > 0 ? 0.35 : Math.PI - 0.35, lean: side * 0.32, s: 2.3, tint: col(cols[Math.floor(R() * cols.length)]), parts: 'sumBike', ahead: 24 });
    },
  },
});

// ---------- what moves: kites, balls, rings, the last car south, the plywood ----------
export class SummerPieces {
  constructor(S) {
    this.S = S; this.cfg = (S.plan && S.plan.summer) || {};
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(1, 1, 1); this._o = new THREE.Vector3();
    const R = seeded(29);
    // kites over the beach while the summer is on
    this.kites = [];
    for (const [a, b] of this.cfg.kites || []) for (let k = 0; k < 10; k++) this.kites.push({ a, b, dt: R() * 30, x: -(24 + R() * 40), h: 16 + R() * 18, tint: col([0xff4f6a, 0xffd23a, 0x3ac0ff, 0xb46aff, 0xff8a3a, 0x5aff9a][k % 6]), ph: R() * TAU, s: 2.2 + R() * 1.2 });
    this.balls = [];
    for (const [a, b] of this.cfg.balls || []) for (let k = 0; k < 8; k++) this.balls.push({ a, b, dt: R() * 30, x0: -(14 + R() * 10), dx: (R() - 0.5) * 20, ph: R(), s: 1.0 + R() * 0.5 });
  }
  draw(T) {
    const S = this.S, t = S.rider.t, L = T.layers, m = this._m, q = this._q, e = this._e, s = this._s, p = this._p;
    const gy = T.floorFn || (() => 0);
    const beat = T.beat || 0;
    // kites: tugging at their strings, dipping on the beat
    for (const k of this.kites) {
      if (t < k.a - 2 || t > k.b + 2) continue;
      const on = smooth(k.a - 2, k.a, t) * (1 - smooth(k.b, k.b + 2, t));
      const tt = t + 3 + (k.dt % 12);       // each kite a few seconds up the beach ahead of her
      S.track.ground(tt, k.x + Math.sin(t * 0.7 + k.ph) * 3, p);
      p.y = gy(tt, k.x) + k.h * on + Math.sin(t * 1.3 + k.ph) * 1.5 - beat * 0.8;
      e.set(Math.sin(t * 1.1 + k.ph) * 0.25, S.course.sample(tt).yaw + Math.PI + Math.sin(t * 0.9 + k.ph) * 0.4, Math.sin(t * 1.7 + k.ph) * 0.35); q.setFromEuler(e);
      m.compose(p, q, s.set(k.s, k.s, k.s)); L.sumKite.add(m, { aTint: k.tint });
    }
    // beach balls bouncing across the sand below the boardwalk, on the beat
    for (const b of this.balls) {
      if (t < b.a - 2 || t > b.b + 1) continue;
      const tt = t + 2.5 + (b.dt % 10) * 0.4;
      const u = ((t * 0.25 + b.ph) % 1);
      const x = b.x0 + b.dx * (u - 0.5);
      S.track.ground(tt, x, p);
      const hop = Math.abs(Math.sin((t * 2 + b.ph * 7) * Math.PI)) * 4 * (0.6 + 0.4 * beat);
      p.y = gy(tt, x) + b.s + hop;
      e.set(t * 3 + b.ph, t * 2, 0); q.setFromEuler(e);
      m.compose(p, q, s.set(b.s, b.s, b.s)); L.sumBall.add(m);
    }
    // the kids' swim rings, bobbing out on the cold green water
    const rg = this.cfg.rings;
    if (rg && t > rg[0] - 6 && t < rg[1] + 2) {
      for (let k = 0; k < 14; k++) {
        const tt = rg[0] + 1 + k * ((rg[1] - rg[0]) / 14), x = -(84 + (k % 4) * 7 + Math.sin(k * 3.1) * 3);
        S.track.ground(tt, x, p); p.y = 0.15 + Math.sin(t * 1.6 + k) * 0.25;
        e.set(Math.sin(t * 1.3 + k) * 0.12, k, Math.sin(t * 1.1 + k * 2) * 0.12); q.setFromEuler(e);
        const sc = 4.2 + (k % 3) * 0.7;
        m.compose(p, q, s.set(sc, sc, sc)); L.sumRing.add(m, { aTint: col([0xff5aa0, 0xffd23a, 0x5ad8ff, 0xff7a3a][k % 4]) });
      }
    }
    // the last car south: ahead of her down the road, its tails getting smaller
    const lc = this.cfg.lastCar;
    if (lc && t > lc.from - 1 && t < lc.to + 1) {
      const u = clamp((t - lc.from) / (lc.to - lc.from), 0, 1);
      const tt = t + 1.2 + u * 3.5, x = lc.x ?? 22;
      S.track.ground(tt, x, p); p.y = gy(tt, x);
      e.set(0, S.course.sample(tt).yaw, 0); q.setFromEuler(e);
      m.compose(p, q, s.set(1, 1, 1)); L.car.add(m, { aTint: col(0xd8c8a0) });
      const fx = Math.sin(e.y), fz = Math.cos(e.y), rx = -Math.cos(e.y), rz = Math.sin(e.y);
      for (const sd of [-0.65, 0.65]) T.glow(p.x - fx * 2.3 + rx * sd, p.y + 0.66, p.z - fz * 2.3 + rz * sd, 1.6, [1, 0.08, 0.1], 1.8);
    }
    // the plywood going up in the first cold rain: sheets flying onto the town's windows on the beat
    const pw = this.cfg.plywood;
    if (pw && t > pw.from - 3 && t < pw.to + 4) {
      for (let k = 0; k < 40; k++) {
        const side = k % 2 ? 1 : -1;
        const tt = pw.from + (k / 40) * (pw.to - pw.from + 2);
        const land = pw.from + (k / 40) * (pw.to - pw.from);
        const u = smooth(land - 0.5, land, t);
        const x = side * (17.5 + (1 - u) * 6), lift = (1 - u) * 6;
        S.track.ground(tt, x, p); p.y = gy(tt, x) + 2.4 + lift;
        e.set((1 - u) * 1.4, S.course.sample(tt).yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2), (1 - u) * 0.8 * side); q.setFromEuler(e);
        m.compose(p, q, s.set(2.2, 2.2, 2.2)); L.sumPly.add(m);
      }
    }
  }
}
