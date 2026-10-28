// Stage three: the bay. Starchy pasta water with islands of pastina floating on it, a beach of
// pastina sand, cooked lasagna cliffs, a dry-spaghetti pier, mafaldine kelp, calamarata rings,
// farfalle swimming like rays, a squid of squid-ink pasta, and a giant conchiglione at the bottom
// that breathes out bubbles. The star is inside the shell.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { Colliders } from './collide.js';
import { lasagnaStack, addSeaSky, SEA } from './world.js';
import { FX, Plank, Pickups, rodGeometry } from './props.js';
import { scatterGrass, addWillow, addFlowers, addButterflies } from './kit.js';
import { Water } from './water.js';
import { G } from './materials.js';
import { mulberry32, makeNoise2D, clamp, lerp, smoothstep, TAU } from './util.js';

const WY = SEA;                    // the bay's surface is the world's sea level
const DEEP = { x: 0, z: -24 };     // where the shell lies, 16 m down
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ the ground: beach, terrace, basin, and the open deep outside
const nz = makeNoise2D(41);
const shoreZ = (x) => 24 - 0.012 * x * x;
export function bayElev(x, z) {
  const zs = shoreZ(x);
  let e;
  if (z >= zs) {
    e = (z - zs) * 0.11 + 1.0 * smoothstep(46, 62, z) + 0.4 * nz(x * 0.07, z * 0.07) * smoothstep(zs + 3, zs + 14, z);
  } else {
    const dx = x / 31, dz = (z - DEEP.z) / (z > DEEP.z ? Math.max(zs - DEEP.z, 1) : 15);
    const r = Math.sqrt(dx * dx + dz * dz);
    let f = 1 - smoothstep(0, 1, r);
    // a terrace about 7 m down where the kelp grows, then the drop to the shell
    const w = smoothstep(0.3, 0.38, f) * (1 - smoothstep(0.52, 0.62, f)) * 0.85;
    f = f + (0.43 - f) * w;
    const shallow = -0.55 * (1 - smoothstep(zs - 6, zs, z));
    e = Math.min(shallow, -16 * Math.pow(f, 0.85) + shallow * (1 - f));
  }
  e += 0.06 * Math.sin(x * 1.05 + z * 0.37 + nz(x * 0.2, z * 0.2) * 2.2) + 0.25 * nz(x * 0.11 + 7, z * 0.11);
  const out = Math.max(smoothstep(37, 44, Math.abs(x)), 1 - smoothstep(-50, -43, z));
  return lerp(e, -39, out);
}
export const bayH = (x, z) => WY + bayElev(x, z);

function terrain(scene, mat, x0, x1, z0, z1, step) {
  const nx = Math.round((x1 - x0) / step), nzc = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nzc); g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = bayH(x, z);
    p.setY(i, y); uv.setXY(i, x, z);
    // dry sand above the tide line, wet and darker under it, greyer in the deep
    const e = y - WY;
    const dry = smoothstep(0.05, 0.6, e), deep = smoothstep(2, 14, -e);
    col[i * 3] = lerp(lerp(0.74, 0.62, deep), 1.0, dry);
    col[i * 3 + 1] = lerp(lerp(0.69, 0.6, deep), 0.97, dry);
    col[i * 3 + 2] = lerp(lerp(0.58, 0.55, deep), 0.9, dry);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
  return m;
}

// ------------------------------------------------------------------ a squid of squid-ink pasta
class Squid {
  constructor(scene, K, audio, home, radius) {
    this.home = home.clone(); this.R = radius; this.audio = audio;
    this.group = new THREE.Group(); scene.add(this.group);
    const mantle = new THREE.Mesh(Shapes.squidMantle({ length: 2.0, radius: 0.48 }), K.ink);
    mantle.castShadow = true; this.group.add(mantle); this.mantle = mantle;
    const eyeG = Shapes.orecchiette({ radius: 0.15, depth: 0.05, thickness: 0.024 }), pupG = new THREE.SphereGeometry(0.055, 12, 8);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(eyeG, K.eye); e.position.set(s * 0.42, 0.3, 0.06); e.rotation.y = s * Math.PI / 2; this.group.add(e);
      const p = new THREE.Mesh(pupG, K.pupil); p.position.set(s * 0.47, 0.3, 0.1); this.group.add(p);
    }
    this.NA = 8; this.NP = 12; this.seg = 0.19; this.RS = 6;
    const n = this.NA * this.NP;
    this.X = new Float32Array(n * 3); this.PX = new Float32Array(n * 3);
    this.anch = [];
    for (let a = 0; a < this.NA; a++) { const ang = (a / this.NA) * TAU; this.anch.push(new THREE.Vector3(Math.cos(ang) * 0.3, 0.04, Math.sin(ang) * 0.3)); }
    const verts = this.NA * this.NP * this.RS;
    this.gPos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3); this.gNor = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.gPos.setUsage(THREE.DynamicDrawUsage); this.gNor.setUsage(THREE.DynamicDrawUsage);
    const idx = [], uvs = new Float32Array(verts * 2);
    for (let a = 0; a < this.NA; a++) for (let i = 0; i < this.NP - 1; i++) for (let j = 0; j < this.RS; j++) {
      const b = (a * this.NP + i) * this.RS, j1 = (j + 1) % this.RS;
      idx.push(b + j, b + this.RS + j, b + j1, b + j1, b + this.RS + j, b + this.RS + j1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', this.gPos); g.setAttribute('normal', this.gNor); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setIndex(idx);
    this.arms = new THREE.Mesh(g, K.ink); this.arms.frustumCulled = false; this.arms.castShadow = true; scene.add(this.arms);
    this.ink = new Ink(scene);
    this.reset();
  }
  reset() {
    this.pos = this.home.clone().add(new THREE.Vector3(this.R, 0, 0)); this.vel = new THREE.Vector3(); this.dir = new THREE.Vector3(0, 0, -1);
    this.ang = 0; this.pulseT = 0.5; this.cool = 0; this.flee = 0; this.sq = 1; this.mode = 'patrol';
    this.place();
    for (let a = 0; a < this.NA; a++) for (let i = 0; i < this.NP; i++) {
      const o = (a * this.NP + i) * 3;
      _v.copy(this.anch[a]).applyMatrix4(this.group.matrixWorld).addScaledVector(this.dir, -i * this.seg);
      this.X[o] = this.PX[o] = _v.x; this.X[o + 1] = this.PX[o + 1] = _v.y; this.X[o + 2] = this.PX[o + 2] = _v.z;
    }
  }
  place() {
    this.group.position.copy(this.pos);
    this.group.quaternion.setFromUnitVectors(UP, this.dir);
    this.mantle.scale.set(this.sq, 1 / Math.sqrt(this.sq), this.sq);
    this.group.updateMatrixWorld(true);
  }
  update(dt, time, hero, floorAt, near) {
    const hp = hero.pos;
    this.cool = Math.max(0, this.cool - dt); this.flee = Math.max(0, this.flee - dt);
    const dh = hp.distanceTo(this.pos);
    const chase = hero.inWater && dh < 8 && this.cool <= 0 && hero.state === 'play';
    let target;
    if (this.flee > 0) target = _w.copy(this.pos).addScaledVector(this.away, 4);
    else if (chase) target = _w.copy(hp);
    else { this.ang += dt * 0.32; target = _w.set(this.home.x + Math.cos(this.ang) * this.R, this.home.y + Math.sin(time * 0.37) * 1.3, this.home.z + Math.sin(this.ang) * this.R * 0.75); }
    // jet: a contraction every so often throws it toward where it wants to go
    this.pulseT -= dt;
    if (this.pulseT <= 0) {
      this.pulseT = chase ? 0.78 : 1.2;
      _v.subVectors(target, this.pos); const l = _v.length() || 1;
      this.vel.addScaledVector(_v, (chase ? 3.3 : 2.4) / l);
      this.sq = 0.78;
      if (near) this.audio?.squid?.('pulse');
    }
    this.sq += (1 - this.sq) * Math.min(1, dt * 3);
    this.vel.multiplyScalar(Math.exp(-1.25 * dt));
    this.pos.addScaledVector(this.vel, dt);
    const floor = floorAt(this.pos.x, this.pos.z) + 1.3;
    if (this.pos.y < floor) { this.pos.y = floor; this.vel.y = Math.abs(this.vel.y) * 0.3; }
    if (this.pos.y > WY - 1.6) { this.pos.y = WY - 1.6; this.vel.y = Math.min(this.vel.y, 0); }
    if (this.vel.lengthSq() > 0.04) { _v.copy(this.vel).normalize(); this.dir.lerp(_v, 1 - Math.exp(-3 * dt)).normalize(); }
    this.place();
    this.stepArms(dt, time);
    // touching it: its arms slap you away and it inks
    if (hero.state === 'play' && this.cool <= 0) {
      let hit = _v.copy(this.pos).addScaledVector(this.dir, 1.0).distanceTo(hp) < 0.62 + 0.45;
      if (!hit) for (let k = 0; k < this.NA * this.NP && !hit; k += 2) { const o = k * 3; if (Math.hypot(this.X[o] - hp.x, this.X[o + 1] - hp.y, this.X[o + 2] - hp.z) < 0.5) hit = true; }
      if (hit) {
        this.away = new THREE.Vector3().subVectors(this.pos, hp); this.away.y *= 0.3; this.away.normalize();
        _v.subVectors(hp, this.pos).normalize();
        hero.vel.copy(_v).multiplyScalar(7.5); hero.vel.y += 2.2; hero.stun = 0.5; hero.grounded = false;
        hero.kickStrands?.(-_v.x * 3, -1, -_v.z * 3, 0.5);
        this.cool = 3.6; this.flee = 1.6;
        this.audio?.squid?.('bonk'); this.audio?.squid?.('ink');
        this.ink.puff(this.pos);
      }
    }
    this.ink.update(dt);
  }
  stepArms(dt, time) {
    const X = this.X, PX = this.PX, g = 0.5 * dt * dt;
    for (let a = 0; a < this.NA; a++) {
      _v.copy(this.anch[a]).applyMatrix4(this.group.matrixWorld);
      const o0 = a * this.NP * 3;
      X[o0] = PX[o0] = _v.x; X[o0 + 1] = PX[o0 + 1] = _v.y; X[o0 + 2] = PX[o0 + 2] = _v.z;
      for (let i = 1; i < this.NP; i++) {
        const o = o0 + i * 3;
        const vx = (X[o] - PX[o]) * 0.94, vy = (X[o + 1] - PX[o + 1]) * 0.94, vz = (X[o + 2] - PX[o + 2]) * 0.94;
        PX[o] = X[o]; PX[o + 1] = X[o + 1]; PX[o + 2] = X[o + 2];
        // limp cooked spaghetti: a slow wave runs down each arm
        const ph = time * 2.2 + a * 0.9 - i * 0.6, wig = Math.sin(ph) * 0.0045 * i, wig2 = Math.cos(ph * 0.8 + a) * 0.0035 * i;
        X[o] += vx + wig; X[o + 1] += vy - g + wig2; X[o + 2] += vz - wig * 0.7;
      }
      for (let it = 0; it < 2; it++) for (let i = 1; i < this.NP; i++) {
        const a3 = o0 + (i - 1) * 3, b3 = o0 + i * 3;
        const ex = X[b3] - X[a3], ey = X[b3 + 1] - X[a3 + 1], ez = X[b3 + 2] - X[a3 + 2];
        const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-6, k = (d - this.seg) / d;
        const wa = i === 1 ? 0 : 0.5, wb = i === 1 ? 1 : 0.5;
        X[a3] += ex * k * wa; X[a3 + 1] += ey * k * wa; X[a3 + 2] += ez * k * wa;
        X[b3] -= ex * k * wb; X[b3 + 1] -= ey * k * wb; X[b3 + 2] -= ez * k * wb;
      }
    }
    // tubes
    const P = this.gPos.array, N = this.gNor.array, RS = this.RS;
    const T = _p, Nn = _s, B = _w, tmp = new THREE.Vector3();
    for (let a = 0; a < this.NA; a++) {
      for (let i = 0; i < this.NP; i++) {
        const o = (a * this.NP + i) * 3, oa = (a * this.NP + Math.max(0, i - 1)) * 3, ob = (a * this.NP + Math.min(this.NP - 1, i + 1)) * 3;
        T.set(X[ob] - X[oa], X[ob + 1] - X[oa + 1], X[ob + 2] - X[oa + 2]).normalize();
        tmp.set(0, 1, 0); if (Math.abs(T.y) > 0.9) tmp.set(1, 0, 0);
        Nn.crossVectors(T, tmp).normalize(); B.crossVectors(T, Nn);
        const rad = 0.095 * (1 - i / this.NP * 0.7);
        for (let j = 0; j < RS; j++) {
          const ang = (j / RS) * TAU, cs = Math.cos(ang), sn = Math.sin(ang);
          const nx = Nn.x * cs + B.x * sn, ny = Nn.y * cs + B.y * sn, nzz = Nn.z * cs + B.z * sn;
          const v = ((a * this.NP + i) * RS + j) * 3;
          P[v] = X[o] + nx * rad; P[v + 1] = X[o + 1] + ny * rad; P[v + 2] = X[o + 2] + nzz * rad;
          N[v] = nx; N[v + 1] = ny; N[v + 2] = nzz;
        }
      }
    }
    this.gPos.needsUpdate = true; this.gNor.needsUpdate = true;
    this.arms.geometry.computeBoundingSphere();
  }
}

// squid ink: a dark cloud that spreads and thins
class Ink {
  constructor(scene) {
    this.n = 10;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying float vA; attribute float aA;
        void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vA = aA; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying float vA;
        void main(){ float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(vec3(0.035, 0.03, 0.04), pow(f, 1.6) * vA); }`,
    });
    const g = new THREE.IcosahedronGeometry(1, 2);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(this.n), 1);
    g.setAttribute('aA', this.alpha);
    this.mesh = new THREE.InstancedMesh(g, mat, this.n); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = 15;
    this.b = []; for (let i = 0; i < this.n; i++) this.b.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), t: 0, s: 1 });
    scene.add(this.mesh);
  }
  puff(p) {
    for (const b of this.b) { b.live = true; b.t = 0; b.s = 0.7 + Math.random() * 0.8; b.p.copy(p).add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5))); b.v.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 1.6); }
  }
  update(dt) {
    let k = 0;
    for (const b of this.b) {
      if (!b.live) continue;
      b.t += dt; if (b.t > 4) { b.live = false; continue; }
      b.p.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-1.2 * dt));
      const r = b.s * (0.4 + 1.9 * (1 - Math.exp(-b.t * 1.4)));
      _m.compose(b.p, _q.identity(), _s.setScalar(r)); this.mesh.setMatrixAt(k, _m);
      this.alpha.array[k] = 0.8 * Math.min(1, b.t * 6) * (1 - b.t / 4);
      k++;
    }
    this.mesh.count = k;
    if (k) { this.mesh.instanceMatrix.needsUpdate = true; this.alpha.needsUpdate = true; }
  }
}

// ------------------------------------------------------------------ farfalle swimming like rays, in loose schools
class School {
  constructor(scene, K, { center, rx, ry, rz, count, seed, speed = 0.18 }) {
    const rnd = mulberry32(seed);
    this.c = center.clone(); this.rx = rx; this.ry = ry; this.rz = rz; this.n = count; this.w = speed;
    this.ph = rnd() * TAU;
    this.mesh = new THREE.InstancedMesh(Shapes.farfalle({ width: 0.62, height: 0.38, thickness: 0.02 }), K.ray, count);
    this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    const palette = ['#f2cf7f', '#86a84c', '#e8793f', '#f2b52c', '#d4566e', '#f6e2a8'].map(c => new THREE.Color(c));
    this.f = [];
    for (let i = 0; i < count; i++) {
      this.mesh.setColorAt(i, palette[Math.floor(rnd() * palette.length)]);
      this.f.push({ p: center.clone(), v: new THREE.Vector3(), off: new THREE.Vector3((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 2.4), lag: rnd() * 0.9, s: 0.75 + rnd() * 0.5 });
    }
    this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }
  lead(t, out) { const a = t * this.w + this.ph; return out.set(this.c.x + Math.cos(a) * this.rx, this.c.y + Math.sin(a * 1.7) * this.ry, this.c.z + Math.sin(a) * this.rz); }
  update(dt, time, hero) {
    for (let i = 0; i < this.n; i++) {
      const f = this.f[i];
      this.lead(time - f.lag, _p).add(f.off);
      const dh = _p.distanceTo(hero.pos);
      if (dh < 3.2) _p.addScaledVector(_v.subVectors(_p, hero.pos).normalize(), (3.2 - dh) * 1.4);
      _v.subVectors(_p, f.p);
      f.v.addScaledVector(_v, dt * 2.2); f.v.multiplyScalar(Math.exp(-1.6 * dt));
      f.p.addScaledVector(f.v, dt);
      const sp = Math.max(0.05, Math.hypot(f.v.x, f.v.z));
      _e.set(-Math.PI / 2 + clamp(-f.v.y / sp * 0.4, -0.5, 0.5), Math.atan2(f.v.x, f.v.z), Math.sin(time * 1.3 + i) * 0.25, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(f.p, _q, _s.setScalar(f.s)); this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the stage
export function buildBay(scene, K, audio, T) {
  const col = new Colliders(bayH);
  const S = { id: 'bay', scene, colliders: col, zones: [], supports: [], tube: null };
  const SS = addSeaSky(scene, K, { sea: false }); S.skyMat = SS.skyMat;
  const fx = new FX(scene, K, audio); S.fx = fx;
  const sun = G.uWaterSun.value;
  const water = new Water(scene, T, { y: WY, sun });
  water.motes.setMaterial(K.dry);
  S.water = { y: WY }; S.bubbles = water.bubbles; S.sinkY = WY - 27; S.safeMinY = WY + 0.25; S.groundSurface = 'sand';
  water.bubbles.onPop = (p, r) => { if (Math.random() < 0.3) audio?.bubble?.(clamp(r * 6, 0, 1), 0.5); };

  // ground
  terrain(scene, K.sand, -47, 47, -54, 74, 0.75);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), K.sand);
  deep.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4 * 3).fill(0.5), 3));
  deep.position.y = WY - 40; scene.add(deep);

  // cooked lasagna cliffs all round, standing in the shallows
  const stack = (o) => {
    const g = lasagnaStack({ w: o.w, d: o.d, y0: o.y0 ?? WY - 5, y1: o.y1, seed: o.seed, lh: o.lh ?? 0.4, step: o.step ?? 0.6, rc: o.rc ?? 1.2, bands: o.bands ?? ((L) => (L % 8) < 1) });
    const m = new THREE.Mesh(g, K.sheet); m.position.set(o.x, 0, o.z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    col.add({ type: 'box', x: o.x, y: ((o.y0 ?? WY - 5) + o.y1) / 2, z: o.z, hx: o.w / 2, hy: (o.y1 - (o.y0 ?? WY - 5)) / 2, hz: o.d / 2, sticky: true, surface: 'cooked', safe: true });
  };
  const cliffs = [
    // west, from the beach round to the north
    { x: -36, z: 52, w: 12, d: 22, y1: WY + 10.5, seed: 101 }, { x: -37, z: 30, w: 12, d: 22, y1: WY + 8.2, seed: 102 },
    { x: -38, z: 8, w: 12, d: 23, y1: WY + 11.5, seed: 103 }, { x: -37, z: -15, w: 13, d: 24, y1: WY + 9.4, seed: 104 },
    { x: -32, z: -41, w: 22, d: 14, y1: WY + 12.6, seed: 105 },
    // north
    { x: -10, z: -46, w: 22, d: 12, y1: WY + 10.2, seed: 106 }, { x: 12, z: -46, w: 22, d: 12, y1: WY + 13.4, seed: 107 },
    // east
    { x: 33, z: -40, w: 20, d: 14, y1: WY + 9.8, seed: 108 }, { x: 37, z: -16, w: 13, d: 24, y1: WY + 12.2, seed: 109 },
    { x: 38, z: 8, w: 12, d: 23, y1: WY + 8.8, seed: 110 }, { x: 37, z: 30, w: 12, d: 22, y1: WY + 10.9, seed: 111 },
    { x: 36, z: 52, w: 12, d: 22, y1: WY + 9.2, seed: 112 },
    // behind the beach
    { x: -18, z: 69, w: 26, d: 10, y0: WY - 1, y1: WY + 9.6, seed: 113 }, { x: 10, z: 70, w: 30, d: 10, y0: WY - 1, y1: WY + 11.2, seed: 114 },
  ];
  for (const c of cliffs) stack(c);
  // rocks breaking the surface: places to stand in the water
  const rocks = [
    { x: -17, z: 3, w: 4.2, d: 3.6, y0: WY - 9, y1: WY + 1.1, rc: 1.3, seed: 120 },
    { x: 19, z: -9, w: 3.6, d: 4.4, y0: WY - 12, y1: WY + 0.8, rc: 1.2, seed: 121 },
    { x: -9, z: -33, w: 3.4, d: 3.2, y0: WY - 12, y1: WY + 1.4, rc: 1.1, seed: 122 },
  ];
  for (const r of rocks) stack({ ...r, lh: 0.3, step: 0.45, bands: (L) => L % 7 === 3 });

  // ---------------------------------------------------------------- the pier: dry spaghetti planks on rigatoni pilings
  const PX = 9, DECK = WY + 1.55;
  const planks = [];
  for (let i = 0; i < 7; i++) planks.push(new Plank(scene, K, col, fx, audio, { x: PX, y: DECK, z: 34.9 - i * 4.2, len: 4.25, rods: 9, rot: Math.PI / 2, crack: 0.3, brk: 0.95, seed: 130 + i, regrow: 4 }));
  const pile = Shapes.rigatoniTower({ innerRadius: 0.17, outerRadius: 0.25, height: 1, ridges: 14, notch: null, cols: 42, rows: 3 });
  const pileSpots = [];
  for (let i = 0; i <= 7; i++) for (const s of [-1, 1]) { const z = 37 - i * 4.2, x = PX + s * 0.78, y0 = bayH(x, z) - 0.3; if (DECK - 0.12 - y0 > 0.3) pileSpots.push([x, y0, z, DECK - 0.12 - y0]); }
  const piles = new THREE.InstancedMesh(pile, K.dryBig, pileSpots.length);
  pileSpots.forEach(([x, y0, z, h], i) => {
    _m.compose(_p.set(x, y0, z), _q.identity(), _s.set(1, h, 1)); piles.setMatrixAt(i, _m);
    col.add({ type: 'cyl', x, z, r: 0.27, y0, y1: y0 + h, surface: 'dry', sticky: false });
  });
  piles.castShadow = true; piles.receiveShadow = true; scene.add(piles);

  // ---------------------------------------------------------------- calamarata rings standing in the sand: swim through
  const ringG = Shapes.rigatoniTower({ innerRadius: 2.15, outerRadius: 2.75, height: 2.0, ridges: 44, notch: null, cols: 176, rows: 4 });
  ringG.translate(0, -1, 0); ringG.rotateX(Math.PI / 2);
  const rings = [[-5, -5, 0.15], [3, -11, -0.25], [-2, -17, 0.1]];
  for (const [x, z, yaw] of rings) {
    const cy = bayH(x, z) + 2.0;
    const m = new THREE.Mesh(ringG, K.dryBig); m.position.set(x, cy, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, rx = Math.cos(a) * 2.45, ry = Math.sin(a) * 2.45;
      const lx = rx * Math.cos(yaw), lz = -rx * Math.sin(yaw);
      if (cy + ry < bayH(x + lx, z + lz) - 0.3) continue;
      col.add({ type: 'sphere', x: x + lx, y: cy + ry, z: z + lz, r: 0.42, surface: 'dry', sticky: false });
    }
  }

  // ---------------------------------------------------------------- the giant conchiglione and the star inside it
  const shellR = 2.3, shellL = 7.2;
  const shell = new THREE.Mesh(Shapes.conchiglione({ length: shellL, radius: shellR, thick: 0.22 }), K.shell);
  const sy = bayH(DEEP.x, DEEP.z) + 1.85;
  shell.position.set(DEEP.x, sy, DEEP.z); shell.rotation.x = 0.92; shell.castShadow = true; shell.receiveShadow = true; scene.add(shell);
  shell.updateMatrixWorld(true);
  const mouthN = new THREE.Vector3(0, 1, 0).applyQuaternion(shell.quaternion).normalize();
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5, x = (u - 0.5) * shellL * 0.86, r = shellR * Math.pow(Math.sin(Math.PI * u), 0.6) * 0.62;
    _p.set(x, 0, 0).applyQuaternion(shell.quaternion).add(shell.position).addScaledVector(mouthN, -shellR * 0.62);
    col.add({ type: 'sphere', x: _p.x, y: _p.y, z: _p.z, r: Math.max(0.6, r), surface: 'cooked', sticky: false });
  }
  const mouth = shell.position.clone().addScaledVector(mouthN, 0.9);
  const pushN = new THREE.Vector3(mouthN.x, mouthN.y * 0.35, mouthN.z).normalize();
  const star = new THREE.Mesh(Shapes.stellina({ outerRadius: 0.95, innerRadius: 0.5, thickness: 0.32, points: 5, holeRadius: 0.1 }), K.star);
  star.position.copy(shell.position).addScaledVector(mouthN, 0.35); star.castShadow = true; scene.add(star);
  S.star = { mesh: star, home: star.position.clone(), taken: false };
  // the shell breathes: a slow gush of bubbles out of its mouth that pushes you away
  const breath = { t: 2.2, on: 0, period: 5.4, dur: 1.8 };

  // ---------------------------------------------------------------- bubble vents: rigatoni stubs in the sand; ride them up
  const stub = Shapes.rigatoniTower({ innerRadius: 0.3, outerRadius: 0.42, height: 0.9, ridges: 16, notch: null, cols: 64, rows: 3 });
  const vents = [{ x: 7.5, z: -19 }, { x: -12, z: 6 }, { x: 13, z: 9 }].map((v) => {
    const y = bayH(v.x, v.z) - 0.25;
    const m = new THREE.Mesh(stub, K.dryBig); m.position.set(v.x, y, v.z); m.castShadow = true; scene.add(m);
    col.add({ type: 'tube', x: v.x, z: v.z, r0: 0.3, r1: 0.42, y0: y, y1: y + 0.9, sticky: false, surface: 'dry' });
    return { ...v, y: y + 0.9, t: 0 };
  });

  // ---------------------------------------------------------------- mafaldine kelp on the terrace and the slope
  const kelpGeos = [4.5, 7.5, 10.5].map((L, i) => Shapes.mafaldina({ length: L, width: 0.36, rows: Math.round(L * 5), seed: 150 + i }));
  const krnd = mulberry32(160);
  const kelpSpots = [[], [], []];
  for (let i = 0; i < 900 && kelpSpots.flat().length < 190; i++) {
    const x = (krnd() - 0.5) * 50, z = -21 + krnd() * 37;
    const y = bayH(x, z), depth = WY - y;
    if (depth < 3.5 || depth > 14.5) continue;
    if (Math.abs(x - PX) < 2.2 && z > 6) continue;                             // under the pier
    if (Math.hypot(x - DEEP.x, z - DEEP.z) < 7.5) continue;                     // round the shell
    if (rings.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 3.2)) continue;
    if (vents.some(v => Math.hypot(x - v.x, z - v.z) < 1.4)) continue;
    const clump = 0.5 + 0.5 * nz(x * 0.13, z * 0.13);
    if (krnd() > clump * 0.9 + 0.15) continue;
    const gi = depth > 11 ? 2 : depth > 7 ? (krnd() < 0.6 ? 1 : 2) : (krnd() < 0.7 ? 0 : 1);
    const L = [4.5, 7.5, 10.5][gi], top = y + L;
    const sc = Math.min(1.15, (WY - 0.6 - y) / L) * (0.8 + krnd() * 0.3);
    if (sc < 0.45) continue;
    kelpSpots[gi].push([x, y - 0.05, z, krnd() * TAU, sc]);
  }
  const kelpCols = ['#86a84c', '#7f9f46', '#9bbb5a', '#f2cf7f', '#e8c46a', '#d9734a'].map(c => new THREE.Color(c));
  kelpSpots.forEach((list, gi) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(kelpGeos[gi], K.kelp, list.length);
    list.forEach(([x, y, z, a, sc], i) => {
      _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, a), _s.set(1, sc, 1)); im.setMatrixAt(i, _m);
      const r = krnd(); im.setColorAt(i, kelpCols[r < 0.55 ? Math.floor(krnd() * 3) : r < 0.9 ? 3 + Math.floor(krnd() * 2) : 5]);
    });
    im.castShadow = true; im.receiveShadow = true; im.instanceColor.needsUpdate = true; scene.add(im);
  });

  // ---------------------------------------------------------------- the beach: grass on the dunes, willows, flowers, washed-up rods, small shells
  const grnd = mulberry32(170), spots = [];
  for (let i = 0; i < 1400; i++) {
    const x = (grnd() - 0.5) * 64, z = 30 + grnd() * 36, y = bayH(x, z);
    if (y < WY + 1.4 || Math.abs(x - PX) < 1.6 && z < 39) continue;
    if (nz(x * 0.09 + 3, z * 0.09) + grnd() * 0.5 < 0.25 + smoothstep(52, 34, z) * 0.6) continue;
    spots.push([x, y, z]);
  }
  scatterGrass(scene, K, spots, 171);
  addWillow(scene, K, col, -22, bayH(-22, 50), 50, { seed: 172, scale: 1.0 });
  addWillow(scene, K, col, 24, bayH(24, 55), 55, { seed: 173, scale: 0.85 });
  addFlowers(scene, K, [[-13, 56, bayH(-13, 56), 2.2], [17, 47, bayH(17, 47), 1.6], [-26, 40, bayH(-26, 40), 1.4]], 174);
  const flies = addButterflies(scene, K, col, [[-12, bayH(-12, 54) + 1.6, 54], [16, bayH(16, 46) + 1.6, 46]], 8, 175);
  const drift = rodGeometry(1, 0.075, 8, 1);
  const dIM = new THREE.InstancedMesh(drift, K.dry, 26), drnd = mulberry32(176);
  for (let i = 0; i < 26; i++) {
    const x = (drnd() - 0.5) * 50, z = shoreZ(x) + 0.6 + drnd() * 4.5;
    _m.compose(_p.set(x, bayH(x, z) + 0.06, z), _q.setFromEuler(_e.set(0, drnd() * TAU, (drnd() - 0.5) * 0.12)), _s.set(0.5 + drnd() * 2.2, 1, 1)); dIM.setMatrixAt(i, _m);
  }
  dIM.castShadow = true; dIM.receiveShadow = true; scene.add(dIM);
  const littleShell = Shapes.conchiglione({ length: 0.42, radius: 0.13, thick: 0.03, rows: 11, cols: 20, ribs: 10 });
  const sIM = new THREE.InstancedMesh(littleShell, K.shell, 40), srnd = mulberry32(177);
  for (let i = 0; i < 40; i++) {
    const x = (srnd() - 0.5) * 56, z = shoreZ(x) - 4 + srnd() * 14;
    _m.compose(_p.set(x, bayH(x, z) + 0.06, z), _q.setFromEuler(_e.set(srnd() * 0.8 - 0.4, srnd() * TAU, srnd() * 0.6)), _s.setScalar(0.7 + srnd() * 0.9)); sIM.setMatrixAt(i, _m);
  }
  sIM.castShadow = true; sIM.receiveShadow = true; scene.add(sIM);

  // ---------------------------------------------------------------- swimmers
  const schools = [
    new School(scene, K, { center: new THREE.Vector3(-8, WY - 6, 4), rx: 9, ry: 1.2, rz: 6, count: 11, seed: 180, speed: 0.16 }),
    new School(scene, K, { center: new THREE.Vector3(10, WY - 9, -8), rx: 7, ry: 1.5, rz: 7, count: 9, seed: 181, speed: 0.2 }),
    new School(scene, K, { center: new THREE.Vector3(0, WY - 12.5, -24), rx: 9, ry: 1.0, rz: 5, count: 8, seed: 182, speed: 0.13 }),
  ];
  const squid = new Squid(scene, K, audio, new THREE.Vector3(DEEP.x, WY - 11.5, DEEP.z + 3), 7.5);

  // ---------------------------------------------------------------- rotelle along the way
  const R = 0.36;
  const pk = [
    [-2, bayH(-2, 44) + 0.8, 44], [3, bayH(3, 40) + 0.8, 40], [6.5, bayH(6.5, 37) + 0.8, 37],
    [PX, DECK + 0.6, 30.7], [PX, DECK + 0.6, 22.3], [PX, DECK + 0.6, 13.9],
    [PX, WY - 3, 8], [PX - 1, WY - 5.5, 6], [-3, WY - 6, 2], [-8, WY - 6.5, 8], [-14, WY - 5, 10], [14, WY - 6, 4],
    [-5, bayH(-5, -5) + 2.0, -5], [3, bayH(3, -11) + 2.0, -11], [-2, bayH(-2, -17) + 2.0, -17],
    [7.5, WY - 9, -19], [7.5, WY - 5, -19], [13, WY - 4, 9],
    [-17, WY + 1.1 + R + 0.1, 3], [19, WY + 0.8 + R + 0.1, -9],
    [-5, WY - 13, -27], [5, WY - 13, -27], [0, WY - 9, -18], [-6, WY - 11, -21], [6, WY - 11, -21],
  ];
  const pickups = new Pickups(scene, K, audio, pk);
  S.pickups = pickups;

  S.spawn = new THREE.Vector3(0, bayH(0, 50) + 0.46, 50);
  S.facing = Math.PI;
  const st = S.star.home;
  S.intro = {
    len: 7.2,
    fly: new THREE.CatmullRomCurve3([st.clone().add(new THREE.Vector3(2.6, 1.8, 4.2)), new THREE.Vector3(6, WY - 8, -8), new THREE.Vector3(-2, WY - 4, 6),
      new THREE.Vector3(4, WY + 2.5, 18), new THREE.Vector3(2, WY + 4.5, 40), new THREE.Vector3(0, WY + 5.6, 57.5)], false, 'centripetal'),
    look: new THREE.CatmullRomCurve3([st.clone(), st.clone().add(new THREE.Vector3(0, 1, 2)), new THREE.Vector3(-2, WY - 9, -10),
      new THREE.Vector3(4, WY - 2, 6), new THREE.Vector3(2, WY + 1.5, 30), new THREE.Vector3(0, WY + 2.4, 46)], false, 'centripetal'),
  };

  const near = (p, cam, d) => p.distanceToSquared(cam) < d * d;
  let camPos = new THREE.Vector3();
  S.update = (dt, time, hero) => {
    fx.update(dt, col);
    // over the cliffs is the open deep: it takes you straight back to the beach
    if (hero.state === 'play' && (Math.abs(hero.pos.x) > 41.5 || hero.pos.z < -49.5) && hero.pos.y < WY + 0.2) hero.startSink();
    for (const p of planks) p.update(dt, Math.abs(hero.pos.x - p.pos.x) < 1.6 && Math.abs(hero.pos.z - p.pos.z) < 2.6 && Math.abs(hero.pos.y - p.pos.y) < 1.4);
    pickups.update(dt, time, hero);
    flies.update(dt, time, hero);
    for (const s of schools) s.update(dt, time, hero);
    squid.update(dt, time, hero, bayH, near(squid.pos, camPos, 26));
    // vents
    for (const v of vents) {
      v.t -= dt;
      if (v.t <= 0) { v.t = 0.07 + Math.random() * 0.08; water.bubbles.emit(_p.set(v.x, v.y, v.z), 0.05 + Math.random() * 0.06, 0.25, 1.4); }
      const dx = hero.pos.x - v.x, dz = hero.pos.z - v.z;
      if (hero.inWater && dx * dx + dz * dz < 1.1 && hero.pos.y > v.y - 0.6) { hero.vel.y = Math.min(hero.vel.y + 16 * dt, 5.6); hero.grounded = false; }
    }
    // the shell breathes
    breath.t -= dt;
    if (breath.t <= 0) { breath.t = breath.period; breath.on = breath.dur; if (near(mouth, camPos, 30)) audio?.burst?.(1); }
    const pulse = breath.on > 0 ? 1 : 0;
    if (breath.on > 0) {
      breath.on -= dt;
      for (let k = 0; k < 3; k++) water.bubbles.emit(_p.copy(mouth).add(_v.set((Math.random() - 0.5) * shellL * 0.55, 0, 0).applyQuaternion(shell.quaternion)), 0.05 + Math.random() * 0.12, 0.6, 2.4);
      _v.subVectors(hero.pos, mouth);
      const d = _v.length();
      if (d < 6.5 && _v.dot(mouthN) > -1.2) {
        // a gush that shoves you back a few metres, mostly sideways
        const f = (1 - d / 6.5) * 11 * dt;
        hero.vel.addScaledVector(pushN, f); hero.vel.addScaledVector(_v.normalize(), f * 0.5);
        if (hero.vel.y > 2.2) hero.vel.y = 2.2;
        hero.grounded = false;
      }
    }
    const k = 1 + (breath.on > 0 ? 0.035 * Math.sin(Math.min(1, (breath.dur - breath.on) / breath.dur) * Math.PI) : -0.015 * Math.sin(clamp(1 - breath.t / breath.period, 0, 1) * Math.PI));
    shell.scale.set(1, k, k);
    if (!S.star.taken) { star.rotation.y = time * 0.6; star.position.y = S.star.home.y + Math.sin(time * 1.3) * 0.06; }
    S._pulse = pulse;
  };
  // per frame, before drawing: the water reads the camera
  S.view = (dt, time, camera) => {
    camPos.copy(camera.position);
    const under = water.update(dt, time, camera, scene);
    G.uWaterOn.value = 1; G.uWaterY.value = WY;
    scene.fog.near = under ? 1e5 : 130; scene.fog.far = under ? 1e6 : 950;
    const depth01 = clamp((WY - camera.position.y) / 16, 0, 1);
    const shore = clamp(1 - Math.abs(camera.position.z - shoreZ(camera.position.x)) / 22, 0, 1) * (under ? 0 : 1);
    return { underwater: under ? 1 : 0, depth01, shore01: shore };
  };
  S.fixed = () => {};
  S.resetBreakables = () => { for (const p of planks) p.reset(); };
  S.reset = () => { S.resetBreakables(); pickups.reset(); squid.reset(); breath.t = 2.2; breath.on = 0; S.star.taken = false; star.position.copy(S.star.home); };
  S.leave = () => { G.uWaterOn.value = 0; };
  return S;
}
