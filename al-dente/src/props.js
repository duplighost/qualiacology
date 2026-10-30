// Everything on the stage that moves or reacts: the dry spaghetti bridge that snaps,
// cavatappi springs, the tagliatelle bridge, lumache snails, rotelle to collect,
// the giant rigatoni and the stellina at the top. Plus pooled FX.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { mulberry32, clamp, lerp, damp, TAU } from './util.js';
import { SEA } from './world.js';
import { R as HERO_R } from './hero.js';

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

// ------------------------------------------------------------------ helpers
export function rodGeometry(len, rad, seg = 10, lenSeg = 10) {
  const g = new THREE.CylinderGeometry(rad, rad, len, seg, lenSeg, false);
  g.rotateZ(Math.PI / 2); // along x
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const side = Math.abs(Math.abs(x) - len / 2) > 1e-4;
    uv.setXY(i, side ? x : y, side ? Math.atan2(z, y) * rad : z);
  }
  return g;
}
export function mergeWithShade(geos, shades) {
  let vc = 0, ic = 0;
  for (const g of geos) { vc += g.getAttribute('position').count; ic += g.getIndex().count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), sh = new Float32Array(vc), idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  geos.forEach((g, gi) => {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv'), ix = g.getIndex();
    pos.set(p.array, vo * 3); nor.set(n.array, vo * 3); uv.set(u.array, vo * 2);
    sh.fill(shades[gi], vo, vo + p.count);
    for (let i = 0; i < ix.count; i++) idx[io + i] = ix.getX(i) + vo;
    vo += p.count; io += ix.count;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aShade', new THREE.BufferAttribute(sh, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ FX: rod fragments + pastina splashes
export class FX {
  constructor(scene, K, audio) {
    this.audio = audio;
    this.frag = new THREE.InstancedMesh(rodGeometry(1, 0.072, 8, 1), K.dry, 96);
    this.frag.count = 96; this.frag.castShadow = true; this.frag.frustumCulled = false;
    this.fr = [];
    for (let i = 0; i < 96; i++) { this.fr.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), len: 1, t: 0, hits: 0 }); this.hide(this.frag, i); }
    scene.add(this.frag);
    const grain = new THREE.IcosahedronGeometry(0.05, 0);
    this.gr = []; this.grain = new THREE.InstancedMesh(grain, K.dry, 160); this.grain.frustumCulled = false;
    for (let i = 0; i < 160; i++) { this.gr.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), t: 0, s: 1 }); this.hide(this.grain, i); }
    scene.add(this.grain);
    // damp starch prints where the hero slapped into something
    const mg = new THREE.CircleGeometry(1, 20);
    const pa = mg.getAttribute('position');
    for (let i = 1; i < pa.count; i++) { const a = Math.atan2(pa.getY(i), pa.getX(i)); const r = 0.82 + 0.18 * Math.sin(a * 5 + 1.3) * Math.cos(a * 3); pa.setXY(i, pa.getX(i) * r, pa.getY(i) * r); }
    this.markMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#b98f3c'), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
      transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.marks = new THREE.InstancedMesh(mg, this.markMat, 14);
    this.marks.frustumCulled = false; this.marks.receiveShadow = true;
    this.mk = [];
    for (let i = 0; i < 14; i++) { this.mk.push({ live: false, p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, t: 0 }); this.hide(this.marks, i); }
    this.mkNext = 0;
    scene.add(this.marks);
    this.rnd = mulberry32(5);
  }
  mark(p, n, size = 0.42) {
    const m = this.mk[this.mkNext]; this.mkNext = (this.mkNext + 1) % this.mk.length;
    m.live = true; m.t = 0; m.s = size * (0.85 + this.rnd() * 0.3);
    m.p.copy(p).addScaledVector(n, -0.43);
    m.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    m.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.rnd() * TAU));
  }
  splat(p, n) { this.mark(p, n, 0.46); }
  dent(p, impact) { this.mark(p.clone().add(new THREE.Vector3(0, 0.0, 0)), new THREE.Vector3(0, 1, 0), 0.3 + impact * 0.25); }
  hide(mesh, i) { _m.makeScale(0, 0, 0); mesh.setMatrixAt(i, _m); mesh.instanceMatrix.needsUpdate = true; }
  fragment(p, dir, len, v) {
    const f = this.fr.find(f => !f.live); if (!f) return;
    f.live = true; f.t = 0; f.hits = 0; f.p.copy(p); f.v.copy(v); f.len = len;
    _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); f.q.copy(_q);
    f.w.set((this.rnd() - 0.5) * 9, (this.rnd() - 0.5) * 4, (this.rnd() - 0.5) * 9);
  }
  splash(p, k = 1) {
    const n = Math.round(26 + k * 30);
    for (let i = 0; i < n; i++) {
      const g = this.gr.find(g => !g.live); if (!g) break;
      g.live = true; g.t = 0; g.s = 0.6 + this.rnd() * 0.9;
      const a = this.rnd() * TAU, r = this.rnd() * 0.5;
      g.p.set(p.x + Math.cos(a) * r, SEA + 0.05, p.z + Math.sin(a) * r);
      const sp = 1.5 + this.rnd() * 3.5 * k;
      g.v.set(Math.cos(a) * sp * 0.6, 3 + this.rnd() * 5 * k, Math.sin(a) * sp * 0.6);
    }
  }
  update(dt, colliders) {
    let dirty = false;
    for (let i = 0; i < this.fr.length; i++) {
      const f = this.fr[i]; if (!f.live) continue;
      dirty = true; f.t += dt;
      f.v.y -= 30 * dt;
      f.p.addScaledVector(f.v, dt);
      _q.setFromEuler(_e.set(f.w.x * dt, f.w.y * dt, f.w.z * dt)); f.q.premultiply(_q);
      const floor = Math.max(SEA, colliders.floorBelow(f.p.x, f.p.y + 0.3, f.p.z, 1));
      if (f.p.y < floor + 0.05) {
        if (floor <= SEA + 0.01) { f.p.y = Math.max(f.p.y, SEA - 0.4); f.v.multiplyScalar(0.8); f.w.multiplyScalar(0.9); f.v.y = Math.max(f.v.y, -0.4); }
        else {
          f.p.y = floor + 0.05; if (f.v.y < -2 && f.hits < 3) { this.audio?.clatter(clamp(-f.v.y / 14, 0.1, 1), clamp(1.2 - f.len, 0, 1)); f.hits++; }
          f.v.y = Math.abs(f.v.y) * 0.3; f.v.x *= 0.6; f.v.z *= 0.6; f.w.multiplyScalar(0.6);
        }
      }
      if (f.t > 7) { f.live = false; this.hide(this.frag, i); continue; }
      const sink = f.t > 5 ? (f.t - 5) / 2 : 0;
      _s.set(f.len * (1 - sink), 1 - sink, 1 - sink);
      _m.compose(f.p, f.q, _s); this.frag.setMatrixAt(i, _m);
    }
    if (dirty) this.frag.instanceMatrix.needsUpdate = true;
    let gd = false;
    for (let i = 0; i < this.gr.length; i++) {
      const g = this.gr[i]; if (!g.live) continue;
      gd = true; g.t += dt; g.v.y -= 22 * dt; g.p.addScaledVector(g.v, dt);
      if (g.p.y < SEA - 0.05 || g.t > 2.5) { g.live = false; this.hide(this.grain, i); continue; }
      _q.setFromEuler(_e.set(g.t * 7 + i, g.t * 5, 0));
      _s.setScalar(g.s);
      _m.compose(g.p, _q, _s); this.grain.setMatrixAt(i, _m);
    }
    if (gd) this.grain.instanceMatrix.needsUpdate = true;
    let md = false;
    for (let i = 0; i < this.mk.length; i++) {
      const m = this.mk[i]; if (!m.live) continue;
      md = true; m.t += dt;
      if (m.t > 8) { m.live = false; this.hide(this.marks, i); continue; }
      const k = m.t < 0.08 ? m.t / 0.08 : 1 - Math.max(0, (m.t - 3) / 5);
      _m.compose(m.p, m.q, _s.set(m.s * (0.6 + 0.4 * Math.min(1, m.t / 0.08)), m.s * (0.6 + 0.4 * Math.min(1, m.t / 0.08)), 1).multiplyScalar(Math.max(0.001, Math.sqrt(k))));
      this.marks.setMatrixAt(i, _m);
    }
    if (md) this.marks.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ dry spaghetti planks (they snap)
export class Plank {
  constructor(scene, K, colliders, fx, audio, { x, y, z, len = 4.2, rods = 7, rot = 0, crack = 0.18, brk = 0.52, seed = 1, safeFirst = false, regrow = 5, cantilever = false }) {
    this.fx = fx; this.audio = audio; this.rods = rods; this.len = len; this.regrow = regrow; this.cantilever = cantilever;
    this.crackAt = crack; this.breakAt = brk;
    const rnd = mulberry32(seed);
    const geos = [], shades = [];
    this.rodZ = [];
    for (let i = 0; i < rods; i++) {
      const g = rodGeometry(len + (rnd() - 0.5) * 0.25, 0.072);
      const oz = (i - (rods - 1) / 2) * 0.148;
      g.translate((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.012, oz);
      geos.push(g); shades.push(rnd()); this.rodZ.push(oz);
    }
    this.geo = mergeWithShade(geos, shades);
    this.base = this.geo.getAttribute('position').array.slice();
    this.mesh = new THREE.Mesh(this.geo, K.dryShade);
    this.mesh.position.set(x, y, z); this.mesh.rotation.y = rot;
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, y, z); this.rot = rot;
    this.col = colliders.add({ type: 'box', x, y, z, hx: len / 2, hy: 0.075, hz: rods * 0.074, rot, surface: 'dry', sticky: false, safe: false,
      onStand: (hero, dt) => this.stand(hero, dt) });
    this.reset();
  }
  reset() {
    this.t = 0; this.state = 'whole'; this.sag = 0; this.creaked = 0; this.down = 0; this.grow = 1;
    this.col.active = true; this.mesh.visible = true; this.mesh.scale.setScalar(1);
    this.applySag(0);
  }
  stand(hero, dt) { if (this.state === 'whole' || this.state === 'cracking') { this.state = 'cracking'; this.load = 1; } }
  applySag(s) {
    const p = this.geo.getAttribute('position'), a = p.array, b = this.base, L = this.len / 2;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3];
      const u = clamp(x / L, -1, 1);
      // a bridge sags in the middle; rods stuck in a wall droop at the free end (local -x)
      a[i * 3 + 1] = b[i * 3 + 1] - s * (this.cantilever ? ((1 - u) / 2) * ((1 - u) / 2) * 1.6 : Math.cos(u * Math.PI / 2));
    }
    p.needsUpdate = true;
  }
  break() {
    this.state = 'broken'; this.col.active = false; this.mesh.visible = false; this.down = 0;
    this.audio?.snap(0.8);
    const rnd = Math.random;
    const dir = new THREE.Vector3(Math.cos(this.rot), 0, -Math.sin(this.rot));
    const side = new THREE.Vector3(Math.sin(this.rot), 0, Math.cos(this.rot));
    for (let r = 0; r < this.rods; r++) {
      // dry spaghetti rarely breaks in two: 3 or 4 pieces
      const cuts = [0, 1];
      const nc = rnd() < 0.6 ? 2 : 3;
      for (let c = 0; c < nc; c++) cuts.push(0.18 + rnd() * 0.64);
      cuts.sort((a, b) => a - b);
      for (let k = 0; k < cuts.length - 1; k++) {
        const a = cuts[k], b = cuts[k + 1]; if (b - a < 0.04) continue;
        const mid = ((a + b) / 2 - 0.5) * this.len;
        const p = this.pos.clone().addScaledVector(dir, mid).addScaledVector(side, this.rodZ[r]);
        p.y -= this.sag;
        const out = mid / (this.len / 2);
        const v = new THREE.Vector3(dir.x * out * 2.2 + (rnd() - 0.5), -1.5 - rnd() * 2 + Math.abs(out) * 1.5, dir.z * out * 2.2 + (rnd() - 0.5));
        const d = dir.clone().applyAxisAngle(side, (rnd() - 0.5) * 0.5 + out * 0.35);
        this.fx.fragment(p, d, (b - a) * this.len, v);
      }
    }
  }
  update(dt, heroNear) {
    if (this.state === 'cracking') {
      this.t += dt;
      if (this.t > this.crackAt && this.creaked === 0) { this.creaked = 1; this.audio?.creak(0.4); }
      if (this.t > (this.crackAt + this.breakAt) * 0.5 && this.creaked === 1) { this.creaked = 2; this.audio?.creak(0.85); }
      this.sag = damp(this.sag, 0.04 + 0.16 * clamp(this.t / this.breakAt, 0, 1), 18, dt);
      this.applySag(this.sag + Math.sin(this.t * 70) * 0.004);
      if (this.t > this.breakAt) this.break();
    } else if (this.state === 'broken') {
      this.down += dt;
      if (this.down > this.regrow && !heroNear) { this.reset(); this.mesh.scale.setScalar(0.01); this.grow = 0; }
    }
    if (this.grow < 1) { this.grow = Math.min(1, this.grow + dt * 3); const g = 1 - Math.pow(1 - this.grow, 3); this.mesh.scale.set(g, 1, 1); }
  }
}

// ------------------------------------------------------------------ cavatappi spring
export class Spring {
  // wide: fatter coil and top; toss: {x, z} sideways throw; keep: how much run speed the launch keeps
  constructor(scene, mat, colliders, audio, { x, y, z, power = 22.5, wide = 1, toss = null, keep = 1 }) {
    this.audio = audio; this.power = power; this.wide = wide; this.toss = toss; this.keep = keep;
    const g = Shapes.cavatappi({ coilRadius: 0.62, tubeRadius: 0.2, height: 1.5, turns: 3.2, ridges: 10, wall: 0.05 });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.position.set(x, y, z); this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    if (toss) { const l = Math.hypot(toss.x, toss.z) || 1; this.mesh.rotation.set(-toss.z / l * 0.12, 0, toss.x / l * 0.12); }
    scene.add(this.mesh);
    this.h = 1.5; this.base = y;
    this.c = 0; this.cv = 0; this.cool = 0;
    this.col = colliders.add({ type: 'cyl', x, z, r: 0.86 * wide, y0: y, y1: y + this.h - 0.05, surface: 'cooked', sticky: false, safe: false,
      onStand: (hero) => this.launch(hero) });
  }
  launch(hero) {
    if (this.cool > 0) return;
    this.cool = 0.25;
    hero.vel.y = this.power; hero.grounded = false; hero.cut = true; hero.coyote = 0;
    hero.vel.x *= this.keep; hero.vel.z *= this.keep;
    if (this.toss) { hero.vel.x += this.toss.x; hero.vel.z += this.toss.z; }
    hero.sqAxisT.set(0, 1, 0); hero.sq = 1.35; hero.sqv = 2.5;
    for (const f of hero.feet) f.planted = false;
    this.cv = -9; this.c = -0.15;
    this.audio?.spring(1);
  }
  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    const w = TAU * 5.5;
    this.cv += (-2 * 0.18 * w * this.cv - w * w * this.c) * dt;
    this.c += this.cv * dt;
    this.mesh.scale.set((1 - this.c * 0.25) * this.wide, 1 + this.c, (1 - this.c * 0.25) * this.wide);
  }
}

// ------------------------------------------------------------------ tagliatelle bridge
export class Ribbon {
  constructor(scene, mat, audio, { a, b, strips = 3, width = 0.5, gap = 0.05, nodes = 30, slack = 0.016, seed = 3 }) {
    this.a = a.clone(); this.b = b.clone(); this.audio = audio;
    this.dir = b.clone().sub(a); this.L = this.dir.length(); this.dir.normalize();
    this.side = new THREE.Vector3().crossVectors(UP, this.dir).normalize();
    this.N = nodes; this.strips = [];
    this.halfW = (strips * width + (strips - 1) * gap) / 2;
    const rnd = mulberry32(seed);
    for (let s = 0; s < strips; s++) {
      const off = (s - (strips - 1) / 2) * (width + gap);
      const X = new Float32Array(nodes * 3), PX = new Float32Array(nodes * 3);
      for (let i = 0; i < nodes; i++) {
        const t = i / (nodes - 1);
        const p = this.a.clone().lerp(this.b, t).addScaledVector(this.side, off);
        p.y -= Math.sin(t * Math.PI) * 1.0;
        X.set([p.x, p.y, p.z], i * 3); PX.set([p.x, p.y, p.z], i * 3);
      }
      const rest = (this.L * (1 + slack + (rnd() - 0.5) * 0.004)) / (nodes - 1);
      const geo = this.stripGeometry(nodes, width);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      scene.add(mesh);
      this.strips.push({ off, X, PX, rest, geo, mesh, width, curl: 0.03 + rnd() * 0.02, twist: (rnd() - 0.5) * 0.3 });
    }
    this.col = { surface: 'cooked', safe: false, sticky: false, isBridge: true };
    this.load = 0; this.loadT = 0;
  }
  stripGeometry(nodes, width) {
    const cols = 5, rows = (nodes - 1) * 2 + 1;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(rows * cols * 3 * 2), uv = new Float32Array(rows * cols * 2 * 2);
    const idx = [];
    for (let side = 0; side < 2; side++) for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const base = side * rows * cols;
      const a = base + r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      if (side === 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
    }
    for (let side = 0; side < 2; side++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = side * rows * cols + r * cols + c;
      uv[i * 2] = (r / (rows - 1)) * this.L; uv[i * 2 + 1] = (c / (cols - 1)) * width;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.userData = { rows, cols };
    return g;
  }
  // where along the bridge, and the height of the deck there
  sample(p) {
    const rx = p.x - this.a.x, rz = p.z - this.a.z;
    const t = (rx * this.dir.x + rz * this.dir.z) / (this.L * Math.hypot(this.dir.x, this.dir.z));
    const lat = rx * this.side.x + rz * this.side.z;
    if (t < 0 || t > 1) return null;
    const fi = t * (this.N - 1), i = Math.min(this.N - 2, Math.floor(fi)), f = fi - i;
    // height from the strip under the point (blend between strips)
    let y = 0, wsum = 0;
    for (const s of this.strips) {
      const w = Math.max(0.05, 1 - Math.abs(lat - s.off) / 0.6);
      y += lerp(s.X[i * 3 + 1], s.X[(i + 1) * 3 + 1], f) * w; wsum += w;
    }
    return { t, lat, y: y / wsum, i, f };
  }
  support(pos, r, vel) {
    const s = this.sample(pos);
    if (!s || Math.abs(s.lat) > this.halfW + 0.15) return null;
    const top = s.y + 0.03;
    if (pos.y - r > top + 0.06 || pos.y - r < top - 0.55 || vel.y > 0.5) return null;
    pos.y = top + r;
    this.load = 1; this.loadAt = s;
    return { nx: 0, ny: 1, nz: 0, c: this.col };
  }
  update(dt, steps) {
    const g = 14 * dt * dt;
    for (const s of this.strips) {
      const X = s.X, PX = s.PX, N = this.N;
      for (let i = 1; i < N - 1; i++) {
        const o = i * 3;
        const vx = (X[o] - PX[o]) * 0.985, vy = (X[o + 1] - PX[o + 1]) * 0.985, vz = (X[o + 2] - PX[o + 2]) * 0.985;
        PX[o] = X[o]; PX[o + 1] = X[o + 1]; PX[o + 2] = X[o + 2];
        X[o] += vx; X[o + 1] += vy - g; X[o + 2] += vz;
      }
      if (this.load > 0 && this.loadAt) {
        const c = this.loadAt.t * (N - 1);
        const w = Math.max(0, 1 - Math.abs(this.loadAt.lat - s.off) / 0.9);
        for (let i = 1; i < N - 1; i++) { const k = Math.exp(-((i - c) ** 2) / 2.2) * w; X[i * 3 + 1] -= k * 0.012; }
      }
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < N - 1; i++) {
          const a = i * 3, b = (i + 1) * 3;
          const ex = X[b] - X[a], ey = X[b + 1] - X[a + 1], ez = X[b + 2] - X[a + 2];
          const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-6;
          const wa = i === 0 ? 0 : 1, wb = i + 1 === N - 1 ? 0 : 1, w = wa + wb; if (!w) continue;
          const k = (d - s.rest) / (d * w);
          X[a] += ex * k * wa; X[a + 1] += ey * k * wa; X[a + 2] += ez * k * wa;
          X[b] -= ex * k * wb; X[b + 1] -= ey * k * wb; X[b + 2] -= ez * k * wb;
        }
      }
    }
    this.load = Math.max(0, this.load - dt * 20);
  }
  updateMesh(time) {
    for (const s of this.strips) {
      const { rows, cols } = s.geo.userData;
      const P = s.geo.getAttribute('position').array;
      const X = s.X, N = this.N;
      const half = rows * cols;
      for (let r = 0; r < rows; r++) {
        const t = r / (rows - 1), fi = t * (N - 1), i = Math.min(N - 2, Math.floor(fi)), f = fi - i;
        const cx = lerp(X[i * 3], X[(i + 1) * 3], f), cy = lerp(X[i * 3 + 1], X[(i + 1) * 3 + 1], f), cz = lerp(X[i * 3 + 2], X[(i + 1) * 3 + 2], f);
        const tw = Math.sin(t * Math.PI * 3 + s.off * 4) * s.twist * Math.sin(t * Math.PI);
        for (let c = 0; c < cols; c++) {
          const u = (c / (cols - 1)) * 2 - 1;
          const lx = u * s.width * 0.5;
          const ly = (u * u) * s.curl + lx * tw;
          const i0 = (r * cols + c) * 3, i1 = (half + r * cols + c) * 3;
          P[i0] = cx + this.side.x * lx; P[i0 + 1] = cy + ly; P[i0 + 2] = cz + this.side.z * lx;
          P[i1] = P[i0]; P[i1 + 1] = P[i0 + 1] - 0.028; P[i1 + 2] = P[i0 + 2];
        }
      }
      s.geo.getAttribute('position').needsUpdate = true;
      s.geo.computeVertexNormals();
    }
  }
}

// ------------------------------------------------------------------ lumache snails
export class Snail {
  constructor(scene, K, colliders, audio, opts) {
    this.audio = audio; this.opts = opts;
    this.group = new THREE.Group();
    const shell = new THREE.Mesh(Shapes.lumache({ size: 0.8 }), K.ink);
    shell.castShadow = true; shell.receiveShadow = true;
    this.shell = shell;
    const body = new THREE.Mesh(Shapes.tube([new THREE.Vector3(0, 0.1, -0.15), new THREE.Vector3(0, 0.08, 0.25), new THREE.Vector3(0, 0.1, 0.6), new THREE.Vector3(0, 0.2, 0.82)], { radius: 0.13, radialSegments: 12, radiusFn: (t) => 1 - t * 0.25 }), K.cookedStrand);
    body.castShadow = true; this.body = body;
    const ant = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(Shapes.tube([new THREE.Vector3(s * 0.05, 0.24, 0.8), new THREE.Vector3(s * 0.09, 0.42, 0.9), new THREE.Vector3(s * 0.13, 0.55, 0.88)], { radius: 0.018, radialSegments: 6 }), K.cookedStrand);
      ant.push(a); this.group.add(a);
    }
    this.ant = ant;
    this.group.add(body, shell);
    scene.add(this.group);
    this.col = colliders.add({ type: 'sphere', x: 0, y: -99, z: 0, r: 0.6, surface: 'cooked', sticky: false, noCamera: true,
      onTouch: (hero, k) => this.touch(hero, k) });
    this.colliders = colliders;
    this.t = Math.random() * 10; this.withdrawn = 0; this.dirSign = 1; this.param = opts.start ?? 0;
    this.pos = new THREE.Vector3(); this.heading = 0;
  }
  touch(hero, k) {
    if (hero.state !== 'play') return;
    if (k.ny > 0.45 && hero.prevVel.y < -1) {
      hero.vel.y = 12.5; hero.cut = true; hero.grounded = false;
      this.withdrawn = 2.2; this.audio?.bonk();
      return;
    }
    if (this.withdrawn > 0) return;
    const dx = hero.pos.x - this.pos.x, dz = hero.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
    hero.vel.set(dx / l * 8.5, 6.8, dz / l * 8.5);
    hero.stun = 0.42; hero.grounded = false; hero.unstick?.();
    this.audio?.bonk();
    this.bumped = 0.4;
  }
  update(dt, ribbon) {
    this.t += dt;
    this.withdrawn = Math.max(0, this.withdrawn - dt);
    this.bumped = Math.max(0, (this.bumped || 0) - dt);
    const o = this.opts;
    const moving = this.withdrawn <= 0 && this.bumped <= 0;
    const speed = 0.85 * (0.6 + 0.4 * Math.max(0, Math.sin(this.t * 3.1)));
    if (o.ribbon) {
      if (moving) { this.param += this.dirSign * speed * dt / ribbon.L; if (this.param > o.max || this.param < o.min) { this.dirSign *= -1; this.param = clamp(this.param, o.min, o.max); } }
      const p = ribbon.a.clone().lerp(ribbon.b, this.param);
      const s = ribbon.sample(p);
      this.pos.set(p.x, (s ? s.y : p.y) + 0.03, p.z);
      this.heading = Math.atan2(ribbon.dir.x * this.dirSign, ribbon.dir.z * this.dirSign);
    } else {
      if (moving) this.param += speed * dt / o.r;
      const a = this.param;
      const x = o.x + Math.cos(a) * o.r, z = o.z + Math.sin(a) * o.r;
      this.pos.set(x, this.colliders.floorBelow(x, o.y + 2, z, 6) + 0.0, z);
      this.heading = Math.atan2(-Math.sin(a), Math.cos(a));
    }
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    const crawl = moving ? Math.sin(this.t * 6.2) : 0;
    const out = this.withdrawn > 0 ? 0.0 : 1.0;
    this.body.scale.set(out, out * (1 + crawl * 0.06), out * (1 + crawl * 0.1));
    for (const a of this.ant) a.visible = out > 0.5;
    this.shell.position.y = 0.04 + Math.max(0, crawl) * 0.03;
    this.shell.rotation.z = crawl * 0.03;
    this.col.x = this.pos.x; this.col.y = this.pos.y + 0.42; this.col.z = this.pos.z;
    this.colliders.refreshSphere(this.col);
  }
}

// ------------------------------------------------------------------ rotelle
export class Pickups {
  constructor(scene, K, audio, spots) {
    this.audio = audio;
    const g = Shapes.rotelle({ radius: 0.34, thickness: 0.1, spokes: 6 });
    this.world = new THREE.InstancedMesh(g, K.dry, spots.length);
    this.world.castShadow = true; this.world.receiveShadow = true;
    scene.add(this.world);
    this.items = spots.map((s, i) => ({ p: new THREE.Vector3(s[0], s[1], s[2]), n: s[3] ? new THREE.Vector3(...s[3]).normalize() : null, got: false, fly: 0, phase: i * 1.7 }));
    this.worn = new THREE.InstancedMesh(Shapes.rotelle({ radius: 0.13, thickness: 0.04, spokes: 6 }), K.dry, spots.length);
    this.worn.castShadow = true; this.worn.count = 0; this.worn.frustumCulled = false;
    scene.add(this.worn);
    this.attached = []; this.count = 0; this.total = spots.length;
    this.rnd = mulberry32(17);
    this.onCount = null;
  }
  reset() { for (const it of this.items) { it.got = false; it.fly = 0; } this.attached.length = 0; this.count = 0; this.worn.count = 0; }
  update(dt, time, hero) {
    const hp = hero.pos;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.got && hero.state === 'play' && it.p.distanceToSquared(hp) < 1.05 * 1.05) {
        it.got = true; it.fly = 0.0001; this.count++;
        this.audio?.collect(this.count);
        // a body strand point to tangle into
        let idx = 0; for (let tries = 0; tries < 20; tries++) { idx = Math.floor(this.rnd() * hero.N); if (hero.kind[idx] === 0) break; }
        this.attached.push({ idx, spin: this.rnd() * TAU, from: it.p.clone(), t: 0 });
        this.onCount?.(this.count, this.total);
      }
      if (it.got) { _m.makeScale(0, 0, 0); this.world.setMatrixAt(i, _m); continue; }
      const rock = Math.sin(time * 1.6 + it.phase) * 0.12;
      if (it.n) { _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), it.n); _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), time * 0.3 + it.phase)); }
      else { _e.set(0, it.phase + Math.sin(time * 0.5 + it.phase) * 0.3, rock); _q.setFromEuler(_e); }
      _m.compose(it.p, _q, _s.setScalar(1)); this.world.setMatrixAt(i, _m);
    }
    this.world.instanceMatrix.needsUpdate = true;
    // tangled in the hero
    const c = hero.bodyCenter(new THREE.Vector3());
    let n = 0;
    for (const a of this.attached) {
      a.t = Math.min(1, a.t + dt * 6);
      hero.strandPoint(a.idx, _p);
      const out = _p.clone().sub(c).normalize();
      const target = _p.clone().addScaledVector(out, 0.04);
      const k = 1 - Math.pow(1 - a.t, 3);
      const pos = a.from.clone().lerp(target, k);
      const sc = lerp(2.6, 1, k);
      _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a.spin));
      _m.compose(pos, _q, _s.setScalar(sc)); this.worn.setMatrixAt(n++, _m);
    }
    this.worn.count = n;
    this.worn.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the stage's props
export function buildProps(scene, K, W, audio) {
  const col = W.colliders;
  const fx = new FX(scene, K, audio);
  const P = { fx, planks: [], springs: [], snails: [], supports: [] };

  // the dry bridge over the ravine: bundles of dry spaghetti laid across rod-bundle posts
  const zs = []; for (let i = 0; i < 10; i++) zs.push(-4.2 - i * 1.55);
  zs.forEach((z, i) => P.planks.push(new Plank(scene, K, col, fx, audio, { x: 0, y: 9.33 - i * 0.02, z, crack: i === 0 ? 0.55 : 0.16, brk: i === 0 ? 1.5 : 0.5, seed: 30 + i })));
  const postGeo = Shapes.rodBundle({ count: 11, length: 10.6, rodRadius: 0.045, bundleRadius: 0.2, twist: 0.4, flareBottom: 0.2, flareTop: 0.15, seed: 4 });
  const posts = new THREE.InstancedMesh(postGeo, K.dryShade, zs.length * 2);
  zs.forEach((z, i) => {
    for (const sx of [-1, 1]) {
      const y0 = SEA - 1.5, top = 9.33 - i * 0.02 - 0.08;
      _m.compose(_p.set(sx * 2.25, y0, z), _q.identity(), _s.set(1, (top - y0) / 10.6, 1));
      posts.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), _m);
      col.add({ type: 'cyl', x: sx * 2.25, z, r: 0.22, y0, y1: top, surface: 'dry', sticky: false, safe: false });
    }
  });
  posts.castShadow = true; posts.receiveShadow = true;
  scene.add(posts);
  // broken rods from earlier crossings poking out of the pastina
  const brokenGeo = rodGeometry(1, 0.072, 8, 1);
  const broken = new THREE.InstancedMesh(brokenGeo, K.dry, 34);
  const br = mulberry32(77);
  for (let i = 0; i < 34; i++) {
    _p.set((br() - 0.5) * 9, SEA + 0.1 + br() * 0.3, -4.5 - br() * 13);
    _e.set(br() * 1.2 - 0.6, br() * TAU, 0.3 + br() * 0.9); _q.setFromEuler(_e);
    _m.compose(_p, _q, _s.set(0.5 + br() * 1.4, 1, 1)); broken.setMatrixAt(i, _m);
  }
  broken.castShadow = true; scene.add(broken);

  // springs
  P.springs.push(new Spring(scene, K.tomato, col, audio, { x: -3.2, y: 9.2, z: -26.5 }));
  P.springs.push(new Spring(scene, K.verdeSolid ?? K.turmeric, col, audio, { x: -11.3, y: 14.0, z: -35.2 }));

  // tagliatelle bridge from the shelf to the tower ground
  const ribbon = new Ribbon(scene, K.cookedRibbon ?? K.cookedStrand, audio, { a: new THREE.Vector3(-4.7, 19.52, -44.5), b: new THREE.Vector3(14.6, 18.52, -44.5) });
  P.ribbon = ribbon; P.supports.push(ribbon);

  // snails
  P.snails.push(new Snail(scene, K, col, audio, { x: -8, y: 3, z: 38, r: 4.5, start: 0 }));
  P.snails.push(new Snail(scene, K, col, audio, { ribbon: true, min: 0.18, max: 0.82, start: 0.5 }));
  P.snails.push(new Snail(scene, K, col, audio, { x: 6, y: 11, z: -24, r: 3.2, start: 2 }));

  // the giant rigatoni
  const tower = { x: 25, z: -52, y0: 18.5, h: 12, r0: 1.9, r1: 2.5, notch: { angle: Math.PI, half: 0.42, h: 2.6 } };
  const rg = Shapes.rigatoniTower({ innerRadius: tower.r0, outerRadius: tower.r1, height: tower.h, ridges: 30, notch: { angle: Math.PI, halfWidth: 0.42, height: 2.6 } });
  const rig = new THREE.Mesh(rg, K.rigatoni ?? K.cookedStrand);
  rig.position.set(tower.x, tower.y0, tower.z); rig.castShadow = true; rig.receiveShadow = true;
  scene.add(rig);
  col.add({ type: 'tube', x: tower.x, z: tower.z, r0: tower.r0, r1: tower.r1, y0: tower.y0, y1: tower.y0 + tower.h, notch: tower.notch, sticky: true, surface: 'cooked', safe: true });
  P.tube = { x: tower.x, z: tower.z, r0: tower.r0, r1: tower.r1, y0: tower.y0, y1: tower.y0 + tower.h, notch: tower.notch };
  // perches inside: dry bundles across the tube (they snap too)
  // short dry bundles jutting out of the wall: rests, not ceilings. See-through while above you (the camera
  // looks down the tube from over your head), solid once you're on or over them.
  P.tubeRests = [];
  [[22.6, 0.6], [25.4, 3.6], [28.1, 2.1]].forEach(([y, th], i) => {
    const rr = tower.r0 - 0.6;
    const rest = new Plank(scene, K, col, fx, audio, { x: tower.x + Math.cos(th) * rr, y, z: tower.z + Math.sin(th) * rr, len: 1.3, rods: 6, rot: -th, crack: 0.25, brk: 0.9, seed: 60 + i });
    rest.ghost = K.dryGhost ? K.dryGhost() : null;
    if (rest.ghost) rest.mesh.material = rest.ghost;
    P.planks.push(rest); P.tubeRests.push(rest);
  });

  // star column: an upright bundle of dry whole-wheat spaghetti, a nest on top, the stellina in it
  const sx = tower.x, sz = tower.z - 4.4, colTop = 31.3;
  const colGeo = Shapes.rodBundle({ count: 90, length: colTop - tower.y0, rodRadius: 0.05, bundleRadius: 0.95, twist: 0.5, flareBottom: 0.6, flareTop: 0.35, seed: 12 });
  const column = new THREE.Mesh(colGeo, K.wheat);
  column.position.set(sx, tower.y0, sz); column.castShadow = true; column.receiveShadow = true;
  scene.add(column);
  col.add({ type: 'cyl', x: sx, z: sz, r: 1.0, y0: tower.y0, y1: colTop + 0.2, surface: 'dry', sticky: false, safe: true });
  const nest = new THREE.Mesh(Shapes.nido({ radius: 1.2, height: 0.55, ribbons: 26, ribbonWidth: 0.12, ribbonThickness: 0.025, seed: 8 }), K.nest ?? K.cookedStrand);
  nest.position.set(sx, colTop - 0.05, sz); nest.castShadow = true; nest.receiveShadow = true;
  scene.add(nest);
  const star = new THREE.Mesh(Shapes.stellina({ outerRadius: 1.25, innerRadius: 0.66, thickness: 0.4, points: 5, holeRadius: 0.14 }), K.star ?? K.dry);
  star.position.set(sx, colTop + 1.2, sz); star.castShadow = true; star.receiveShadow = true;
  scene.add(star);
  P.star = { mesh: star, home: star.position.clone(), taken: false };

  // rotelle: a trail through the stage. [x, y, z, wallNormal?]
  const spots = [
    [0, 2.0, 50], [0.5, 2.0, 45], [-1, 2.1, 40], [1.5, 2.2, 35], [0.5, 2.3, 30],
    [-14, 4.2, 66], [18, 3.6, 62], [-25, 4.0, 46],
    [2.0, 2.6, 25.2, [0, 0, 1]], [-2.0, 3.25, 25.2, [0, 0, 1]],
    [-1.25, 5.6, 16.0, [1, 0, 0]], [1.25, 7.0, 16.0, [-1, 0, 0]], [-1.25, 8.5, 16.0, [1, 0, 0]],
    [0, 10.6, 6], [8, 10.6, 10], [-9, 10.6, 3],
    [0, 9.7, -8.85, 'f'], [0, 9.7, -13.5, 'f'],
    [-3.2, 11.08, -26.5, 'f'], [5, 10.3, -30], [-10, 15.1, -32], [-11.3, 15.88, -35.2, 'f'],
    [-10, 20.6, -44.5], [3, 0, -44.5, 'r'], [9, 0, -44.5, 'r'],
    [18, 19.6, -46], [22, 19.6, -58],
    [25 + 1.85, 21.5, -52, [-1, 0, 0]], [25 - 1.85, 23.0, -52, [1, 0, 0]], [25 + 1.85, 26.0, -52, [-1, 0, 0]], [25 - 1.85, 28.5, -52, [1, 0, 0]],
  ];
  for (const s of spots) {
    if (Array.isArray(s[3]) || s[3] === 'f') continue;
    if (s[3] === 'r') { const q = ribbon.sample(new THREE.Vector3(s[0], 0, s[2])); s[1] = (q ? q.y : 19) + 0.4; continue; }
    s[1] = col.floorBelow(s[0], s[1] + 4, s[2], 30) + 0.36;
  }
  P.pickups = new Pickups(scene, K, audio, spots.map(s => (s[3] === 'f' || s[3] === 'r') ? s.slice(0, 3) : s));

  P.update = (dt, time, hero) => {
    fx.update(dt, col);
    const onBridge = hero.pos.z < -2.5 && hero.pos.z > -20 && Math.abs(hero.pos.x) < 3 && hero.pos.y > 8;
    const inTube = Math.hypot(hero.pos.x - tower.x, hero.pos.z - tower.z) < 3 && hero.pos.y > 22;
    P.planks.forEach((p, i) => p.update(dt, i < 10 ? onBridge : inTube));
    for (const r of P.tubeRests) {
      if (!r.ghost) continue;
      // solid under you; above you see-through, and fainter still the nearer it hangs to the camera over your head
      const dh = r.mesh.position.y - hero.pos.y;
      r.mesh.material = dh > -0.3 ? r.ghost : K.dryShade;
      r.ghost.opacity = 0.35 - 0.23 * clamp((dh - 2.5) / 2, 0, 1);
    }
    for (const s of P.springs) s.update(dt);
    for (const s of P.snails) s.update(dt, ribbon);
    ribbon.updateMesh(time);
    P.pickups.update(dt, time, hero);
    if (!P.star.taken) {
      star.rotation.y = Math.sin(time * 0.45) * 0.35 - 0.6;
      star.rotation.z = Math.sin(time * 0.8) * 0.04;
    }
  };
  P.fixed = (dt) => ribbon.update(dt);
  P.resetBreakables = () => { for (const p of P.planks) p.reset(); };
  P.reset = () => { P.resetBreakables(); P.pickups.reset(); P.star.taken = false; star.position.copy(P.star.home); };
  return P;
}
