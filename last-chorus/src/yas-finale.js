// Your Apartment Smells Like Summer: where it ends. The walls have fallen through and her floor
// has run on into the tar of the roof: tar beach. The mattress dragged up under a canopy of
// bulbs on poles, the floor fan on its long cord turned on it, the jug of cheap wine and two
// glasses, the saucepan of cereal with the fork in it, the boombox on a crate, a kiddie pool,
// two lawn chairs turned to the view, the dead plant finally all in bloom, the water tower on
// the next roof; fireworks going up all over the city behind. Everything at her apartment's
// size (we're small in it). Her arms up beside it.

import * as THREE from 'three';
import { prepare, floorAt } from './trail.js';
import { clamp, TAU, merge, box, cyl, sph, seeded, rgb, paint, pick, tag, mergeTagged, yasMaterial, U } from './yas-kit.js';

function mattress() {
  const parts = [];
  const body = new THREE.BoxGeometry(28, 4.2, 20, 10, 2, 8); body.translate(0, 2.1, 0);
  const p = body.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const ex = Math.abs(p[i]) / 14, ez = Math.abs(p[i + 2]) / 10; const k = Math.pow(Math.max(ex, ez), 6); p[i + 1] -= k * 0.5 * (p[i + 1] > 2.1 ? 1 : -1); }
  body.computeVertexNormals(); parts.push(paint(body, rgb(0xe8e6f0)));
  const sheet = new THREE.PlaneGeometry(31, 25, 36, 28); sheet.rotateX(-Math.PI / 2);
  const s = sheet.attributes.position.array;
  for (let i = 0; i < s.length; i += 3) {
    const x = s[i] - 1.0, z = s[i + 2] + 0.6;
    let y = 4.35 + 0.7 * Math.sin(x * 0.45 + z * 0.3) * Math.sin(z * 0.6) + 0.45 * Math.sin(x * 1.3 - z * 0.9) + 0.5 * Math.max(0, Math.sin(x * 0.2));
    // over the edges it falls down the sides
    const ox = Math.max(0, Math.abs(x) - 14), oz = Math.max(0, Math.abs(z) - 10), o = Math.max(ox, oz);
    if (o > 0) { y = 4.3 - o * 1.6 + 0.3 * Math.sin(x * 2 + z); s[i] += Math.sign(x) * Math.min(ox, 0.5) * 0.4; s[i + 2] += Math.sign(z) * Math.min(oz, 0.5) * 0.4; }
    s[i + 1] = Math.max(0.2, y);
  }
  sheet.computeVertexNormals(); sheet.translate(-1.0, 0, 0.6); parts.push(paint(sheet, rgb(0xff8a72)));
  for (const z of [-4.6, 4.6]) parts.push(paint(sph(1, 2.6, 1.15, 4.2, 11.0, 5.0, z, 16, 10), rgb(0xfff8f2)));
  return merge(parts);
}
// four poles round it and the bulbs strung pole to pole and across the middle (aBu: bulb index)
function canopy() {
  const parts = [], R = seeded(3);
  const corners = [[-17, -13], [17, -13], [17, 13], [-17, 13]], H = 22;
  for (const [x, z] of corners) { parts.push(tag(paint(cyl(0.35, 0.45, H, 8, x, H / 2, z), rgb(0x6a5a4a)), 'aBu', -1)); parts.push(tag(paint(cyl(1.6, 2.0, 0.8, 10, x, 0.4, z), rgb(0x3a3a3a)), 'aBu', -1)); }
  const runs = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
  let bi = 0;
  for (const [a, b] of runs) {
    const A = corners[a], B = corners[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.round(L / 2.4), sag = L * 0.09;
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u, y = H - 0.3 - sag * 4 * u * (1 - u);
      if (prev) { const d = new THREE.Vector3(x - prev[0], y - prev[1], z - prev[2]), len = d.length(); const w = new THREE.CylinderGeometry(0.06, 0.06, len, 4); w.translate(0, len / 2, 0); w.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); w.translate(prev[0], prev[1], prev[2]); parts.push(tag(paint(w, rgb(0x1a1a1a)), 'aBu', -1)); }
      prev = [x, y, z];
      if (k > 0 && k < n) parts.push(tag(paint(sph(0.42, 1, 1.3, 1, x, y - 0.6, z, 8, 6), pick(R, [[1, 0.72, 0.38], [1, 0.45, 0.6], [0.5, 0.85, 1], [1, 0.86, 0.32]])), 'aBu', bi++));
    }
  }
  return mergeTagged(parts, [['aBu', 1, -1]]);
}
function fanBody() {
  const parts = [], cream = rgb(0xe8e4dc), chrome = rgb(0xd8dce4);
  parts.push(paint(cyl(3.4, 3.7, 0.6, 32, 0, 0.3, 0), cream));
  parts.push(paint(cyl(0.32, 0.36, 11, 12, 0, 6.0, 0), rgb(0xc8ccd2)));
  const head = [];
  head.push(paint(cyl(1.25, 1.45, 2.6, 20).rotateX(Math.PI / 2).translate(0, 0, -1.6), cream));
  for (const z of [0.9, -0.55]) head.push(paint(new THREE.TorusGeometry(4.3, 0.1, 6, 48).translate(0, 0, z), chrome));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; for (const z of [0.9, -0.55]) { const s = box(0.06, 4.2, 0.06, 0, 2.15, 0); s.rotateZ(a); s.translate(0, 0, z); head.push(paint(s, chrome)); } }
  head.push(paint(cyl(0.75, 0.75, 0.12, 20).rotateX(Math.PI / 2).translate(0, 0, 1.05), rgb(0x5aa0d8)));
  const h = merge(head); h.rotateX(-0.1); h.translate(0, 11.6, 0); parts.push(h);
  // the cord, orange, off across the roof
  for (let k = 0; k < 12; k++) parts.push(paint(cyl(0.18, 0.18, 2.6, 6).rotateZ(Math.PI / 2).rotateY(0.3 * Math.sin(k)).translate(-2 - k * 2.4, 0.18, Math.sin(k * 0.9) * 1.6), rgb(0xff7a1a)));
  return merge(parts);
}
function blades() { const parts = []; for (let k = 0; k < 3; k++) { const b = new THREE.SphereGeometry(1, 16, 8); b.scale(1.25, 2.1, 0.12); b.translate(0, 2.2, 0); b.rotateY(0.32); b.rotateZ((k / 3) * TAU); parts.push(paint(b, rgb(0xbfe0f4))); } parts.push(paint(cyl(0.6, 0.6, 0.5, 16).rotateX(Math.PI / 2), rgb(0xe8e4dc))); return merge(parts); }
function props() {
  const parts = [], R = seeded(11);
  // the jug of wine and its glasses, at the foot
  const jug = new THREE.LatheGeometry([[0, 0], [2.6, 0], [3.0, 0.6], [3.2, 2.8], [2.9, 4.6], [1.7, 6.0], [0.9, 6.6], [0.9, 7.4], [1.0, 7.5], [1.0, 8.0], [0, 8.0]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  jug.translate(-19, 0, -6); parts.push(paint(jug, rgb(0x2a5a2a)));
  parts.push(paint(cyl(2.95, 3.12, 2.4, 24, -19, 1.3, -6), rgb(0x8a1428)));
  parts.push(paint(cyl(1.05, 1.05, 0.6, 16, -19, 7.7, -6), rgb(0xd8c060)));
  for (const [x, z, tip] of [[-15.2, -9, 0], [-14.0, -3.5, 1]]) {
    const g = new THREE.LatheGeometry([[0, 0], [1.0, 0], [1.0, 0.1], [0.12, 0.3], [0.12, 2.0], [0.9, 2.6], [1.1, 3.8], [1.0, 4.4]].map(([r, y]) => new THREE.Vector2(r, y)), 16);
    if (tip) { g.rotateZ(1.45); g.translate(1.9, 1.0, 0); }
    g.translate(x, 0, z); parts.push(paint(g, rgb(0xd8e0e8)));
    if (!tip) parts.push(paint(cyl(0.98, 0.9, 0.6, 16, x, 3.1, z), rgb(0x8a1428)));
  }
  parts.push(paint(cyl(2.6, 2.6, 0.06, 20, -12.0, 0.04, -3.6), rgb(0x5a0a18)));                 // the spill
  // the saucepan of cereal and its fork
  parts.push(paint(cyl(4.0, 3.7, 3.4, 28, 0, 1.7, 0, true).translate(10, 0, -16), rgb(0xc8ccd4)));
  parts.push(paint(cyl(3.7, 3.7, 0.2, 28, 10, 0.1, -16), rgb(0xc8ccd4)));
  parts.push(paint(cyl(3.9, 3.9, 0.15, 28, 10, 2.9, -16), rgb(0xfffaf0)));
  for (let k = 0; k < 40; k++) { const a = R() * TAU, r = R() * 3.3; parts.push(paint(new THREE.TorusGeometry(0.42, 0.2, 6, 10).rotateX(R() * 3).translate(10 + Math.cos(a) * r, 3.1 + R() * 0.3, -16 + Math.sin(a) * r), rgb(0xf0b048))); }
  parts.push(paint(box(7.4, 0.6, 0.9, 4.5, 3.1, -16).rotateZ(-0.1), rgb(0x1a1a1e)));
  const fork = merge([box(0.35, 8, 0.18, 0, 4, 0), box(1.3, 0.3, 0.18, 0, 8.1, 0), ...[-0.5, -0.17, 0.17, 0.5].map((dx) => box(0.14, 1.7, 0.14, dx, 9.0, 0))].map((g) => paint(g, rgb(0xe0e4ec)))); fork.rotateZ(0.25); fork.translate(9.2, 2.0, -15.4); parts.push(fork);
  // the boombox on a milk crate
  const crate = rgb(0xd83a3a);
  for (const [w, h, d, x, y, z] of [[6.6, 0.4, 6.6, 0, 0.2, 0], [6.6, 0.5, 0.4, 0, 5.4, 3.1], [6.6, 0.5, 0.4, 0, 5.4, -3.1], [0.4, 0.5, 6.6, 3.1, 5.4, 0], [0.4, 0.5, 6.6, -3.1, 5.4, 0]]) parts.push(paint(box(w, h, d, x - 24, y, z + 8), crate));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(box(0.5, 5.6, 0.5, sx * 3.05 - 24, 2.8, sz * 3.05 + 8), crate));
  parts.push(paint(box(9.2, 4.6, 2.4, -24, 8.0, 8), rgb(0x2a2a30)));
  for (const s of [-1, 1]) { parts.push(paint(cyl(1.7, 1.7, 0.3, 26).rotateX(Math.PI / 2).translate(-24 + s * 2.9, 7.9, 9.25), rgb(0xb8bcc8))); parts.push(paint(new THREE.ConeGeometry(1.45, 0.6, 24, 1, true).rotateX(-Math.PI / 2).translate(-24 + s * 2.9, 7.9, 9.3), rgb(0x141418))); }
  parts.push(paint(box(1.8, 0.5, 0.3, -24, 9.5, 9.25), rgb(2.4, 1.2, 3.0)));
  // a kiddie pool: three blue rings, the water lit by everything round it
  for (let k = 0; k < 3; k++) parts.push(paint(new THREE.TorusGeometry(8.4, 1.0, 10, 40).rotateX(Math.PI / 2).translate(-30, 1.0 + k * 1.9, 30), rgb([0x3a9ad8, 0xffffff, 0x3a9ad8][k])));
  parts.push(paint(cyl(8.3, 8.3, 0.2, 40, -30, 4.4, 30), rgb(0.25, 0.9, 1.3)));
  // two lawn chairs, turned to the city
  for (const [x, z, ry] of [[-6, 26, 0.3], [6, 24, -0.2]]) {
    const ch = [], c1 = rgb(0x2ab0a0), c2 = rgb(0xffffff);
    for (let k = 0; k < 6; k++) ch.push(paint(box(5.6, 0.25, 1.1, 0, 4.4, -2.6 + k * 1.1), k % 2 ? c1 : c2));
    for (let k = 0; k < 6; k++) ch.push(paint(box(5.6, 1.1, 0.25, 0, 5.2 + k * 1.1, 3.2 + k * 0.32).rotateX(0.0), k % 2 ? c2 : c1));
    for (const sx of [-1, 1]) { ch.push(paint(box(0.25, 0.25, 7.4, sx * 2.9, 4.3, 0.2), rgb(0xd8dce4))); ch.push(paint(box(0.25, 4.4, 0.25, sx * 2.9, 2.2, -3.2), rgb(0xd8dce4))); ch.push(paint(box(0.25, 9, 0.25, sx * 2.9, 6.5, 3.6).rotateX(0.3), rgb(0xd8dce4))); }
    const g = merge(ch); g.rotateY(ry + Math.PI); g.translate(x, 0, z); parts.push(g);
  }
  // the plant, all in bloom now: the clay pot, stems, pink everywhere
  const P0 = [12, 0, 16];
  parts.push(paint(cyl(3.1, 2.3, 4.8, 24, P0[0], 2.4, P0[2]), rgb(0xb8643c)));
  parts.push(paint(new THREE.TorusGeometry(3.1, 0.28, 8, 28).rotateX(Math.PI / 2).translate(P0[0], 4.8, P0[2]), rgb(0xa8583a)));
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + R() * 0.5, lean = 0.2 + R() * 0.3, L = 8 + R() * 6;
    const tip = [P0[0] + Math.cos(a) * L * lean, 4.6 + L, P0[2] + Math.sin(a) * L * lean];
    const d = new THREE.Vector3(tip[0] - P0[0], tip[1] - 4.6, tip[2] - P0[2]), len = d.length();
    const st = new THREE.CylinderGeometry(0.12, 0.16, len, 6); st.translate(0, len / 2, 0); st.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); st.translate(P0[0], 4.6, P0[2]); parts.push(paint(st, rgb(0x4a7a3a)));
    for (let q = 0; q < 3; q++) parts.push(paint(sph(1, 1.6, 0.4, 0.9, P0[0] + (tip[0] - P0[0]) * (0.4 + q * 0.2) + 0.8, 4.6 + (tip[1] - 4.6) * (0.4 + q * 0.2), P0[2] + (tip[2] - P0[2]) * (0.4 + q * 0.2), 8, 6), rgb(0x3a8a3a)));
    for (let pe = 0; pe < 6; pe++) { const g = new THREE.SphereGeometry(1, 10, 8); g.scale(0.9, 1.6, 0.22); g.translate(0, 1.3, 0); g.rotateX(-0.6); g.rotateY((pe / 6) * TAU); g.translate(tip[0], tip[1], tip[2]); parts.push(paint(g, rgb(pick(R, [0xff5aa8, 0xff7ac0, 0xff4a8a])))); }
    parts.push(paint(sph(0.6, 1, 1, 1, tip[0], tip[1] + 0.4, tip[2], 8, 6), rgb(0xffd24a)));
  }
  return merge(parts);
}
// the water tower on the next roof: a wooden tank on legs, its conical cap, a ladder, a lamp
function tower() {
  const parts = [], wood = rgb(0x8a5a3a), iron = rgb(0x2a2a2e);
  for (const [x, z] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) parts.push(paint(box(0.7, 16, 0.7, x, 8, z), iron));
  for (const y of [5, 11]) { parts.push(paint(box(10.7, 0.4, 0.4, 0, y, -5), iron)); parts.push(paint(box(10.7, 0.4, 0.4, 0, y, 5), iron)); parts.push(paint(box(0.4, 0.4, 10.7, -5, y, 0), iron)); parts.push(paint(box(0.4, 0.4, 10.7, 5, y, 0), iron)); }
  parts.push(paint(cyl(7, 7, 0.8, 24, 0, 16.4, 0), iron));
  const tank = cyl(6.4, 6.6, 14, 28, 0, 23.8, 0); parts.push(paint(tank, wood));
  for (const y of [18.5, 22.5, 26.5, 30]) parts.push(paint(new THREE.TorusGeometry(6.62, 0.16, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), iron));
  parts.push(paint(new THREE.ConeGeometry(7.2, 6, 28).translate(0, 33.8, 0), rgb(0x3a2a24)));
  parts.push(paint(sph(0.7, 1, 1, 1, 0, 37.2, 0, 8, 6), iron));
  for (let k = 0; k < 18; k++) parts.push(paint(box(1.8, 0.15, 0.15, 0, 2 + k * 1.6, 6.9), iron));
  for (const x of [-0.9, 0.9]) parts.push(paint(box(0.15, 30, 0.15, x, 16, 6.9), iron));
  return merge(parts);
}

export class YasRoof {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -12;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const m = (key, opts) => yasMaterial(key, opts);
    const shiny = m('fin-shiny', { k: 0.34, roughness: 0.4, metalness: 0.15 });
    this.group.add(new THREE.Mesh(mattress(), m('fin-sheet', { k: 0.36, roughness: 0.9, side: THREE.DoubleSide })));
    this.group.add(new THREE.Mesh(props(), shiny));
    const bulbs = yasMaterial('fin-bulbs', { k: 0.2, vertDecl: 'attribute float aBu; varying float vBu;', vert: 'vBu = aBu;', fragDecl: 'varying float vBu;', frag: `
      if (vBu > -0.5) {
        float ch = pow(0.5 + 0.5 * cos(6.2832 * (vBu / 7.0 - uBeatPos * 0.5)), 6.0);
        vec3 bc = mix(vec3(1.0, 0.72, 0.42), vColor.rgb, 0.45);
        totalEmissiveRadiance = bc * (2.0 + 0.6 * uBeat + 1.6 * ch * uParty);
        diffuseColor.rgb = bc;
      }` });
    this.group.add(new THREE.Mesh(canopy(), bulbs));
    // the fan, turned on the bed, its head going side to side
    this.fan = new THREE.Group(); this.fan.position.set(12, 0, -5); this.fan.rotation.y = 2.1; this.group.add(this.fan);
    this.fan.add(new THREE.Mesh(fanBody(), shiny));
    this.blades = new THREE.Mesh(blades(), m('fin-blades', { k: 0.3, roughness: 0.25, transparent: true, opacity: 0.85 })); this.blades.position.set(0, 11.6, 0.4); this.fan.add(this.blades);
    // the water tower, on the next roof over, behind it all
    this.tower = new THREE.Mesh(tower(), m('fin-tower', { k: 0.3, roughness: 0.85 })); this.tower.position.set(cfg.towerX ?? -24, cfg.towerY ?? -8, cfg.towerZ ?? 44); this.tower.scale.setScalar(cfg.towerS ?? 1.25); this.group.add(this.tower);
    this.lit = 0.6; this.fired = false; this.earned = 0; this.next = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.bulbAt = [];
    const R = seeded(5);
    const corners = [[-17, -13], [17, -13], [17, 13], [-17, 13]];
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]]) for (let k = 1; k < 8; k++) { const u = k / 8, A = corners[a], B = corners[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]); this.bulbAt.push([A[0] + (B[0] - A[0]) * u, 22 - 0.9 - L * 0.09 * 4 * u * (1 - u), A[1] + (B[1] - A[1]) * u, R()]); }
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt, fireworks) {
    const fy = floorAt(this.course, this.t);
    track.ground(this.t, this.x, this._p);
    this.group.position.set(this._p.x, fy, this._p.z);
    this.group.rotation.set(0, this.course.sample(this.t).yaw, 0);
    this.lit += ((this.fired ? 1.25 : 0.85) - this.lit) * Math.min(1, dt);
    this.blades.rotation.z += dt * 14;
    this.fan.children[0].rotation.y = 0;
    this.fan.rotation.y = 2.1 + Math.sin(songT * 0.8) * 0.45;
    const S = this.S;
    if (S && this.t - rider.t < 46) {
      this.group.updateMatrixWorld(true);
      const M = this.group.matrixWorld, warm = [1, 0.74, 0.42], b = U.uBeat.value;
      for (const [x, y, z, ph] of this.bulbAt) { this._w.set(x, y, z).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 2.6, warm, (0.55 + 0.25 * Math.sin(songT * 3 + ph * 9) + 0.3 * b) * this.lit); }
      this._w.set(0, 14, 0).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 60, [1, 0.7, 0.45], 0.16 * this.lit);
      this._w.set(0, 0.1, 0).applyMatrix4(M); S.pool(this._w.x, this._w.y, this._w.z, 95, [1, 0.72, 0.48], 0.85 * this.lit);
      this._w.set(14, 0.1, -12).applyMatrix4(M); S.pool(this._w.x, this._w.y, this._w.z, 60, [1, 0.66, 0.42], 0.55 * this.lit);
      this._w.set(-30, 5, 30).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 22, [0.4, 0.85, 1], 0.35 * this.lit);
      const tp = this.tower.position; this._w.set(tp.x, tp.y + 24 * this.tower.scale.y, tp.z - 9).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 30, [1, 0.8, 0.55], 0.25 * this.lit);
    }
    // fireworks all over the city behind it, once the walls are down
    if (this.fired && fireworks) {
      this.next -= dt;
      if (this.next <= 0) {
        this.next = 0.3 + Math.random() * 0.6 * (1.2 - 0.5 * this.earned);
        const tt = Math.max(rider.t, this.t - 2) + 2.5 + Math.random() * 6, side = Math.random() < 0.5 ? -1 : 1;
        const from = track.ground(tt, side * (30 + Math.random() * 140), new THREE.Vector3()); from.y = 10 + Math.random() * 20;
        const to = from.clone(); to.y = fy + 50 + Math.random() * 70;
        fireworks.launch(from, to, 0.9 + 0.6 * this.earned);
      }
    }
  }
}
