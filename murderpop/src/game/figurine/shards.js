// Debris for the figurines: rigid bodies that tumble and settle on the floor, chips (instanced shards
// that fly off a hit), glitter, and the SHATTER: every glazed surface of the figurine, in its current
// pose, cut into a few hundred clustered shards with white bisque walls and inner caps, each one moved
// by a transform texture (one draw call per material).
import * as THREE from 'three';
import { makeShardDepth } from './glaze.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _r = new THREE.Vector3(), _q = new THREE.Quaternion(), _n = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------------------
// rigid body against a floor plane: support points in local space, impulses at the deepest contact
export class Body {
  constructor(support, { radius = 0.05, restitution = 0.32, friction = 0.55 } = {}) {
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.q = new THREE.Quaternion(); this.w = new THREE.Vector3();
    this.support = support; // array of Vector3 (local)
    this.radius = radius; this.e = restitution; this.mu = friction;
    this.sleep = 0; this.asleep = false; this.hits = 0; this.lastImpact = 0;
  }
  step(dt, floorY, onImpact) {
    if (this.asleep) return;
    this.vel.y -= 9.8 * dt;
    this.pos.addScaledVector(this.vel, dt);
    const wl = this.w.length();
    if (wl > 1e-6) { _q.setFromAxisAngle(_r.copy(this.w).divideScalar(wl), wl * dt); this.q.premultiply(_q).normalize(); }
    // deepest support point
    let deep = 0, dp = null;
    for (const s of this.support) { _v.copy(s).applyQuaternion(this.q); const y = this.pos.y + _v.y - floorY; if (y < deep) { deep = y; dp = _w.copy(_v); } }
    if (dp) {
      this.pos.y -= deep;
      const r = dp; // contact arm (world orientation)
      const vc = _v.copy(this.w).cross(r).add(this.vel); // contact velocity
      const invI = 1 / (0.4 * this.radius * this.radius);
      if (vc.y < 0) {
        const rn = _r.copy(r).cross(_n);
        const j = -(1 + (vc.y < -1.2 ? this.e : 0.05)) * vc.y / (1 + rn.lengthSq() * invI);
        this.vel.y += j;
        this.w.addScaledVector(rn, j * invI);
        // friction against the sliding velocity
        const vt = new THREE.Vector3(vc.x, 0, vc.z); const vtl = vt.length();
        if (vtl > 1e-4) {
          const jt = Math.min(this.mu * j, vtl / (1 + 0.5 * invI * this.radius * this.radius));
          vt.multiplyScalar(-jt / vtl);
          this.vel.add(vt);
          this.w.add(new THREE.Vector3().copy(r).cross(vt).multiplyScalar(invI * 0.6));
        }
        if (-vc.y > 0.7 && onImpact) onImpact(this, -vc.y);
        this.hits++;
      }
      // rolling resistance and settling
      this.w.multiplyScalar(Math.exp(-dt * 2.5));
      this.vel.x *= Math.exp(-dt * 1.2); this.vel.z *= Math.exp(-dt * 1.2);
      if (this.vel.lengthSq() < 0.0025 && this.w.lengthSq() < 0.04) { this.sleep += dt; if (this.sleep > 0.4) { this.asleep = true; this.vel.set(0, 0, 0); this.w.set(0, 0, 0); } } else this.sleep = 0;
    } else this.w.multiplyScalar(Math.exp(-dt * 0.15));
  }
}

// up to `n` extreme points of a point set (directions of an icosahedron-ish set)
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, -1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]].map((d) => new THREE.Vector3(...d).normalize());
export function supportPoints(pts) {
  const out = new Set();
  for (const d of DIRS) { let best = -Infinity, bi = 0; for (let i = 0; i < pts.length; i++) { const v = pts[i].dot(d); if (v > best) { best = v; bi = i; } } out.add(bi); }
  return [...out].map((i) => pts[i].clone());
}

// ---------------------------------------------------------------------------------------------
// chips: small glazed shards with white broken edges, flung from a hit; they stay on the floor
export class Chips {
  constructor(max = 220) {
    this.max = max;
    const geo = chipGeometry();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTop; varying float vTop;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTop = aTop;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTop;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb = mix(vec3(0.88, 0.86, 0.82), vColor.rgb, vTop);')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.85, 0.28, vTop);')
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n material.clearcoat = vTop;');
    };
    mat.customProgramCacheKey = () => 'fig-chip';
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.castShadow = true; this.mesh.frustumCulled = false; this.mesh.name = 'chips';
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.items = []; this.next = 0;
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3();
  }
  burst(pos, dir, color, n = 10, speed = 3, size = 1) {
    for (let i = 0; i < n; i++) {
      const k = this.next; this.next = (this.next + 1) % this.max;
      const s = (0.005 + Math.random() * Math.random() * 0.014) * size;
      const sup = [new THREE.Vector3(s, 0.3 * s, s), new THREE.Vector3(-s, 0.3 * s, s), new THREE.Vector3(0, 0.3 * s, -s), new THREE.Vector3(0, -0.3 * s, 0)];
      const b = new Body(sup, { radius: s, restitution: 0.4, friction: 0.5 });
      b.pos.copy(pos);
      const rv = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
      b.vel.copy(dir).multiplyScalar(-0.6).add(rv.multiplyScalar(1.0)).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.9));
      b.vel.y += 1.2 + Math.random() * 1.6;
      b.q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      b.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(40);
      b.scale = s; b.age = 0; b.shape = new THREE.Vector3(0.55 + Math.random() * 0.9, 0.6 + Math.random() * 0.8, 0.45 + Math.random() * 0.9);
      this.items[k] = b;
      const white = Math.random() < 0.25;
      this.mesh.setColorAt(k, white ? new THREE.Color(0.9, 0.88, 0.84) : color);
      this.mesh.count = Math.max(this.mesh.count, k + 1);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt, floorY) {
    let any = false;
    for (let k = 0; k < this.items.length; k++) {
      const b = this.items[k]; if (!b) continue;
      b.age += dt;
      if (!b.asleep) { b.step(dt, floorY); any = true; }
      this._s.copy(b.shape).multiplyScalar(b.scale / 0.01);
      this._m.compose(b.pos, b.q, this._s);
      this.mesh.setMatrixAt(k, this._m);
    }
    if (any || this._dirty !== false) { this.mesh.instanceMatrix.needsUpdate = true; this._dirty = any; }
  }
  clear() { this.items = []; this.mesh.count = 0; this.next = 0; }
}

function chipGeometry() {
  // an irregular flat shard (1 cm): glazed top face, bisque sides and bottom
  const top = [[1, 0.1], [0.35, 0.95], [-0.55, 0.7], [-0.95, -0.2], [-0.2, -0.9], [0.7, -0.6]].map(([x, z]) => [x * 0.01, z * 0.01]);
  const n = top.length, h = 0.003;
  const pos = [], nrm = [], aTop = [], ind = [];
  const add = (p, nn, t) => { pos.push(...p); nrm.push(...nn); aTop.push(t); return pos.length / 3 - 1; };
  const ct = add([0, h, 0], [0, 1, 0], 1); const tops = top.map(([x, z]) => add([x, h, z], [0, 1, 0], 1));
  for (let i = 0; i < n; i++) ind.push(ct, tops[(i + 1) % n], tops[i]);
  const cb = add([0, -h, 0], [0, -1, 0], 0); const bots = top.map(([x, z]) => add([x * 0.9, -h, z * 0.9], [0, -1, 0], 0));
  for (let i = 0; i < n; i++) ind.push(cb, bots[i], bots[(i + 1) % n]);
  for (let i = 0; i < n; i++) {
    const a = top[i], b = top[(i + 1) % n]; const nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz);
    const nn = [nx / l, 0.2, nz / l];
    const i0 = add([a[0], h, a[1]], nn, 0), i1 = add([b[0], h, b[1]], nn, 0), i2 = add([b[0] * 0.9, -h, b[1] * 0.9], nn, 0), i3 = add([a[0] * 0.9, -h, a[1] * 0.9], nn, 0);
    ind.push(i0, i1, i2, i0, i2, i3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(aTop, 1)); g.setIndex(ind);
  return g;
}

// ---------------------------------------------------------------------------------------------
// glitter: twinkling points that burst, drift down and lie on the floor catching the light
export class Glitter {
  constructor(max = 1400) {
    this.max = max;
    const geo = new THREE.BufferGeometry();
    this.p = new Float32Array(max * 3); this.c = new Float32Array(max * 3); this.a = new Float32Array(max * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    geo.setAttribute('aInfo', new THREE.BufferAttribute(this.a, 2).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 600 } },
      vertexShader: /* glsl */`
        attribute vec3 color; attribute vec2 aInfo; varying vec3 vC; varying float vA; uniform float uTime; uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = pow(0.5 + 0.5 * sin(uTime * (9.0 + aInfo.x * 13.0) + aInfo.x * 40.0), 6.0);
          vA = aInfo.y * (0.25 + 0.75 * tw);
          vC = color;
          gl_PointSize = uScale * (0.022 + 0.05 * tw) / -mv.z * aInfo.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vA;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float core = exp(-dot(d, d) * 60.0);
          float star = exp(-abs(d.x) * 40.0) * exp(-abs(d.y) * 6.0) + exp(-abs(d.y) * 40.0) * exp(-abs(d.x) * 6.0);
          float a = (core + star * 0.6) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vC * a * 4.0, 1.0);
        }`,
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.name = 'glitter';
    geo.setDrawRange(0, 0);
    this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.n = 0; this.next = 0;
  }
  burst(center, n, colors, spread = 1, up = 3) {
    for (let i = 0; i < n; i++) {
      const k = this.next; this.next = (this.next + 1) % this.max; this.n = Math.min(this.max, this.n + 1);
      const r = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.cbrt(Math.random()));
      this.p[k * 3] = center.x + r.x * 0.25 * spread; this.p[k * 3 + 1] = center.y + r.y * 0.6 * spread; this.p[k * 3 + 2] = center.z + r.z * 0.25 * spread;
      const sp = 1.5 + Math.random() * 4.5;
      this.v[k * 3] = r.x * sp; this.v[k * 3 + 1] = r.y * sp * 0.7 + up * (0.4 + Math.random()); this.v[k * 3 + 2] = r.z * sp;
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.c[k * 3] = c.r; this.c[k * 3 + 1] = c.g; this.c[k * 3 + 2] = c.b;
      this.a[k * 2] = Math.random(); this.a[k * 2 + 1] = 0.6 + Math.random() * 0.6;
      this.life[k] = 7 + Math.random() * 5;
    }
    this.points.geometry.attributes.color.needsUpdate = true;
  }
  clear() { this.n = 0; this.next = 0; this.life.fill(0); this.points.geometry.setDrawRange(0, 0); }
  update(dt, floorY, t) {
    if (!this.n) return;
    this.mat.uniforms.uTime.value = t;
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) { this.a[k * 2 + 1] = 0; continue; }
      this.life[k] -= dt;
      const drag = Math.exp(-dt * 2.6);
      this.v[k * 3] *= drag; this.v[k * 3 + 2] *= drag; this.v[k * 3 + 1] = this.v[k * 3 + 1] * Math.exp(-dt * 1.6) - 3.2 * dt;
      // flutter
      this.v[k * 3] += Math.sin(t * 3 + k) * dt * 0.3; this.v[k * 3 + 2] += Math.cos(t * 2.7 + k * 1.3) * dt * 0.3;
      this.p[k * 3] += this.v[k * 3] * dt; this.p[k * 3 + 1] += this.v[k * 3 + 1] * dt; this.p[k * 3 + 2] += this.v[k * 3 + 2] * dt;
      if (this.p[k * 3 + 1] < floorY + 0.004) { this.p[k * 3 + 1] = floorY + 0.004; this.v[k * 3] = this.v[k * 3 + 1] = this.v[k * 3 + 2] = 0; }
      if (this.life[k] < 2) this.a[k * 2 + 1] = Math.max(0, this.a[k * 2 + 1] - dt * 0.4);
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = true; g.attributes.aInfo.needsUpdate = true; g.setDrawRange(0, this.n);
  }
}

// ---------------------------------------------------------------------------------------------
// voronoi fracture of a triangle mesh: every triangle is clipped by the bisector planes of the seeds its
// corners are nearest to, so the pieces have straight fracture lines (not the mesh's zig-zag edges).
// Works in bind space (stable, pose-independent), so it is planned once. Output vertices refer to the
// source's vertices by barycentric weights (positions come from the pose at the moment of the shatter);
// every other attribute is interpolated now.
// src: { index, attrs: { aBind (itemSize 4), ... }, nv }   ->   { ref, bw, attrs, index, clusterOf }
export function fracture(src, seeds, cellSize, fixed = null) {
  const B = src.attrs.aBind.array, bs = src.attrs.aBind.itemSize;
  const idx = src.index, nt = idx.length / 3, nv = src.attrs.aBind.count;
  const grid = new Map(); const key = (x, y, z) => x + ',' + y + ',' + z;
  seeds.forEach((q, i) => { const k = key(Math.floor(q.x / cellSize), Math.floor(q.y / cellSize), Math.floor(q.z / cellSize)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const nearest = (x, y, z) => {
    const cx = Math.floor(x / cellSize), cy = Math.floor(y / cellSize), cz = Math.floor(z / cellSize);
    let best = -1, bd = Infinity;
    for (let r = 1; r <= 3 && best < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
      for (const s2 of l) { const q = seeds[s2]; const d = (q.x - x) ** 2 + (q.y - y) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = s2; } }
    }
    return Math.max(0, best);
  };
  const cellV = new Int32Array(nv); for (let v = 0; v < nv; v++) cellV[v] = nearest(B[v * bs], B[v * bs + 1], B[v * bs + 2]);
  const names = Object.keys(src.attrs);
  const oRef = [], oW = [], oA = Object.fromEntries(names.map((k) => [k, []])), oI = [], oC = [];
  const memo = new Map();
  const emit = (a, b, c, wa, wb, wc, mkey) => {
    if (mkey && memo.has(mkey)) return memo.get(mkey);
    oRef.push(a, b, c); oW.push(wa, wb, wc);
    for (const k of names) { const at = src.attrs[k], it = at.itemSize, A = at.array; for (let c2 = 0; c2 < it; c2++) oA[k].push(A[a * it + c2] * wa + A[b * it + c2] * wb + A[c * it + c2] * wc); }
    const i = oRef.length / 3 - 1; if (mkey) memo.set(mkey, i); return i;
  };
  const bp = (a, b, c, w) => [0, 1, 2].map((k) => B[a * bs + k] * w[0] + B[b * bs + k] * w[1] + B[c * bs + k] * w[2]);
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    if (fixed && fixed[t] !== undefined && fixed[t] !== null) {
      if (fixed[t] < 0) continue;  // excluded (broken off already)
      const f = 'f' + fixed[t] + ':';
      oI.push(emit(a, b, c, 1, 0, 0, f + a), emit(a, b, c, 0, 1, 0, f + b), emit(a, b, c, 0, 0, 1, f + c)); oC.push(-1000 - fixed[t]);
      continue;
    }
    const ca = cellV[a], cb = cellV[b], cc = cellV[c];
    if (ca === cb && cc === ca) {
      oI.push(emit(a, b, c, 1, 0, 0, ca + ':' + a), emit(a, b, c, 0, 1, 0, ca + ':' + b), emit(a, b, c, 0, 0, 1, ca + ':' + c)); oC.push(ca);
      continue;
    }
    const cells = [...new Set([ca, cb, cc])];
    for (const k of cells) {
      let poly = [{ w: [1, 0, 0], e: 'v' + a }, { w: [0, 1, 0], e: 'v' + b }, { w: [0, 0, 1], e: 'v' + c }];
      for (const m of cells) {
        if (m === k) continue;
        const sk = seeds[k], sm = seeds[m];
        const nx = sk.x - sm.x, ny = sk.y - sm.y, nz = sk.z - sm.z; const mx = (sk.x + sm.x) / 2, my = (sk.y + sm.y) / 2, mz = (sk.z + sm.z) / 2;
        const f = (w) => { const q = bp(a, b, c, w); return (q[0] - mx) * nx + (q[1] - my) * ny + (q[2] - mz) * nz; };
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const A1 = poly[i], B1 = poly[(i + 1) % poly.length];
          const fa = f(A1.w), fb = f(B1.w);
          if (fa >= 0) out.push(A1);
          if ((fa >= 0) !== (fb >= 0)) {
            const tt = fa / (fa - fb);
            const w = [0, 1, 2].map((j) => A1.w[j] + (B1.w[j] - A1.w[j]) * tt);
            const ea = A1.e, eb = B1.e;
            const edgeKey = ea.startsWith('v') && eb.startsWith('v') ? [ea, eb].sort().join('-') + '|' + Math.min(k, m) + '/' + Math.max(k, m) : null;
            out.push({ w, e: edgeKey ? 'c' + edgeKey : 'x' + t + ':' + out.length + ':' + m, ea, eb, tt });
          }
        }
        poly = out; if (poly.length < 3) break;
      }
      if (poly.length < 3) continue;
      const ids = poly.map((q) => {
        if (q.e.startsWith('v')) return emit(a, b, c, q.w[0], q.w[1], q.w[2], k + ':' + q.e.slice(1));
        if (q.e.startsWith('c')) {
          // express the cut point on the edge between its two source vertices, so both triangles agree exactly
          const va = +q.ea.slice(1), vb = +q.eb.slice(1);
          const lo = Math.min(va, vb), hi = Math.max(va, vb), t2 = va === lo ? q.tt : 1 - q.tt;
          return emit(lo, hi, hi, 1 - t2, t2, 0, k + ':' + q.e);
        }
        return emit(a, b, c, q.w[0], q.w[1], q.w[2], null);
      });
      for (let i = 1; i < ids.length - 1; i++) { oI.push(ids[0], ids[i], ids[i + 1]); oC.push(k); }
    }
  }
  const attrs = {}; for (const k of names) attrs[k] = new THREE.BufferAttribute(new Float32Array(oA[k]), src.attrs[k].itemSize);
  return { ref: Int32Array.from(oRef), bw: Float32Array.from(oW), attrs, index: oI, clusterOf: Int32Array.from(oC) };
}

// the identity "fracture": keep the mesh's triangles, clustered as given
export function clusters(src, clusterOf) {
  const nv = src.attrs.aBind.count; const ref = new Int32Array(nv * 3), bw = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) { ref[v * 3] = ref[v * 3 + 1] = ref[v * 3 + 2] = v; bw[v * 3] = 1; }
  return { ref, bw, attrs: src.attrs, index: Array.from(src.index), clusterOf };
}

// jittered seeds over a set of bind positions: a cell size, finer within `near` of a point
export function seedsFor(bind, itemSize, cell, focus = null, fine = 0.6, near = 0.32, seed = 1234567) {
  let rs = seed; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const seen = new Set(), out = [];
  for (let v = 0; v < bind.length / itemSize; v++) {
    const x = bind[v * itemSize], y = bind[v * itemSize + 1], z = bind[v * itemSize + 2];
    const isNear = focus ? Math.hypot(x - focus.x, y - focus.y, z - focus.z) < near : false;
    const c = isNear ? cell * fine : cell;
    const k = Math.floor(x / c) + ',' + Math.floor(y / c) + ',' + Math.floor(z / c) + (isNear ? 'f' : '');
    if (seen.has(k)) continue; seen.add(k);
    out.push(new THREE.Vector3(x + (rnd() - 0.5) * c * 0.5, y + (rnd() - 0.5) * c * 0.5, z + (rnd() - 0.5) * c * 0.5));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The shatter. plan() turns a fractured source into shard topology (glazed faces, inner caps, white
// bisque walls along each piece's edges) and builds its mesh, once, ahead of time: every attribute but
// position/normal is static, and each shard owns two texels of a transform texture. fire() takes the
// source's vertex positions/normals in the current pose, writes the shards' local shapes, gives each a
// rigid body and shows the mesh. upload() pushes all the planned meshes to the GPU early (no hitch).
export class Shatter {
  constructor(U, maxShards = 1400) {
    this.U = U; this.max = maxShards;
    this.data = new Float32Array(maxShards * 8);
    this.tex = new THREE.DataTexture(this.data, maxShards * 2, 1, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter; this.tex.needsUpdate = true;
    U.fShardTex.value = this.tex; U.fShardN.value = maxShards;
    this.bodies = []; this.meshes = []; this.reserved = 0; this.group = new THREE.Group(); this.group.name = 'shards';
    this.plans = [];
  }

  plan(fr, makeMaterial, { thickness = 0.008, keepGlaze = false, name = '' } = {}) {
    const { ref, bw, index, clusterOf } = fr;
    const names = Object.keys(fr.attrs);
    const groups = new Map();
    for (let t = 0; t < clusterOf.length; t++) { const c = clusterOf[t]; if (c === -1) continue; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(t); }
    if (this.reserved + groups.size > this.max) { console.warn('figurine: shard budget exceeded, skipping', name); return null; }
    const base = this.reserved; this.reserved += groups.size;
    const vSrc = [], vInner = [], vEdge = [], vShard = [], vWall = [], vWallQ = [], oInd = [];
    const shardFront = [];
    let sid = 0;
    for (const [, tris] of groups) {
      const front = new Map(), back = new Map();
      const fv = [];
      const getF = (v) => { if (!front.has(v)) { front.set(v, vSrc.length); vSrc.push(v); vInner.push(0); vEdge.push(keepGlaze ? 3 : 0); vShard.push(sid); vWall.push(-1); vWallQ.push(-1); fv.push(vSrc.length - 1); } return front.get(v); };
      const getB = (v) => { if (!back.has(v)) { back.set(v, vSrc.length); vSrc.push(v); vInner.push(1); vEdge.push(2); vShard.push(sid); vWall.push(-1); vWallQ.push(-1); } return back.get(v); };
      const edges = new Map();
      for (const t of tris) {
        const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
        oInd.push(getF(a), getF(b), getF(c));
        oInd.push(getB(a), getB(c), getB(b));
        for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? p + '_' + q : q + '_' + p; const e = edges.get(k); if (e) e.n++; else edges.set(k, { p, q, n: 1 }); }
      }
      for (const { p, q, n } of edges.values()) {
        if (n !== 1) continue;
        // wall quad along the boundary edge p->q (as wound in its triangle): top p, top q, inner q, inner p
        const b0 = vSrc.length;
        for (const [v, inner] of [[p, 0], [q, 0], [q, 1], [p, 1]]) { vSrc.push(v); vInner.push(inner); vEdge.push(1); vShard.push(sid); vWall.push(p); vWallQ.push(q); }
        oInd.push(b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
      }
      shardFront.push(Int32Array.from(fv));
      sid++;
    }
    const n = vSrc.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const aShard = new Float32Array(n); for (let i = 0; i < n; i++) aShard[i] = base + vShard[i];
    g.setAttribute('aShard', new THREE.BufferAttribute(aShard, 1));
    g.setAttribute('aEdge', new THREE.BufferAttribute(Float32Array.from(vEdge), 1));
    for (const k of names) {
      const A = fr.attrs[k], it = A.itemSize, out = new Float32Array(n * it);
      for (let i = 0; i < n; i++) for (let c = 0; c < it; c++) out[i * it + c] = A.array[vSrc[i] * it + c];
      g.setAttribute(k, new THREE.BufferAttribute(out, it));
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    g.setIndex(new THREE.BufferAttribute(n > 65535 ? Uint32Array.from(oInd) : Uint16Array.from(oInd), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.Mesh(g, makeMaterial());
    m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.name = 'shards:' + name; m.visible = false;
    m.customDepthMaterial = this.depthMat || (this.depthMat = makeShardDepth(this.U));
    this.group.add(m); this.meshes.push(m);
    const plan = { fr, n, mesh: m, base, vSrc: Int32Array.from(vSrc), vInner: Uint8Array.from(vInner), vWall: Int32Array.from(vWall), vWallQ: Int32Array.from(vWallQ), vShard: Int32Array.from(vShard), attrs: g.attributes, shardFront, shards: sid, thickness, fired: false };
    this.plans.push(plan);
    return plan;
  }

  // draw every planned mesh once, offscreen, so their buffers are on the GPU before they are needed
  // (inside the real room when it's given: its lights pick the shader variant the shatter will use)
  upload(renderer, camera, room = null) {
    if (!renderer || !this.meshes.length) return;
    const keep = this.group.parent;
    let scene = room, temp = false;
    if (!scene) { scene = new THREE.Scene(); temp = true; }
    scene.add(this.group);
    const vis = this.meshes.map((m) => m.visible); this.meshes.forEach((m) => { m.visible = true; });
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }); const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(prev); rt.dispose();
    this.meshes.forEach((m, i) => { m.visible = vis[i]; });
    if (keep) keep.add(this.group); else if (temp) scene.remove(this.group);
  }

  // P, N: the source's vertex positions/normals (world) right now
  fire(plan, P, N, { impact = null, center = new THREE.Vector3(), power = 1 } = {}) {
    if (!plan || plan.fired) return null;
    plan.fired = true;
    const { fr, n, vSrc, vInner, vShard, vWall, vWallQ, thickness, base } = plan;
    const pos = plan.attrs.position.array, nrm = plan.attrs.normal.array;
    const ref = fr.ref, bw = fr.bw;
    // fractured vertices from the pose
    const nf = ref.length / 3;
    const fp = new Float32Array(nf * 3), fn = new Float32Array(nf * 3);
    for (let i = 0; i < nf; i++) {
      const a = ref[i * 3] * 3, b = ref[i * 3 + 1] * 3, c = ref[i * 3 + 2] * 3, wa = bw[i * 3], wb = bw[i * 3 + 1], wc = bw[i * 3 + 2];
      const x = N[a] * wa + N[b] * wb + N[c] * wc, y = N[a + 1] * wa + N[b + 1] * wb + N[c + 1] * wc, z = N[a + 2] * wa + N[b + 2] * wb + N[c + 2] * wc;
      const l = Math.hypot(x, y, z) || 1;
      fp[i * 3] = P[a] * wa + P[b] * wb + P[c] * wc; fp[i * 3 + 1] = P[a + 1] * wa + P[b + 1] * wb + P[c + 1] * wc; fp[i * 3 + 2] = P[a + 2] * wa + P[b + 2] * wb + P[c + 2] * wc;
      fn[i * 3] = x / l; fn[i * 3 + 1] = y / l; fn[i * 3 + 2] = z / l;
    }
    for (let i = 0; i < n; i++) {
      const v = vSrc[i] * 3, inner = vInner[i], off = inner ? -thickness : 0, sg = inner ? -1 : 1;
      pos[i * 3] = fp[v] + fn[v] * off; pos[i * 3 + 1] = fp[v + 1] + fn[v + 1] * off; pos[i * 3 + 2] = fp[v + 2] + fn[v + 2] * off;
      nrm[i * 3] = fn[v] * sg; nrm[i * 3 + 1] = fn[v + 1] * sg; nrm[i * 3 + 2] = fn[v + 2] * sg;
    }
    // wall normals: (q - p) x n points out of the piece across its edge p->q (the edge as its triangle winds it)
    for (let i = 0; i < n; i++) {
      const a = vWall[i]; if (a < 0) continue;
      const b = vWallQ[i];
      const ex = fp[b * 3] - fp[a * 3], ey = fp[b * 3 + 1] - fp[a * 3 + 1], ez = fp[b * 3 + 2] - fp[a * 3 + 2];
      const nx = fn[a * 3] + fn[b * 3], ny = fn[a * 3 + 1] + fn[b * 3 + 1], nz = fn[a * 3 + 2] + fn[b * 3 + 2];
      const ox = ey * nz - ez * ny, oy = ez * nx - ex * nz, oz = ex * ny - ey * nx; const l = Math.hypot(ox, oy, oz) || 1;
      nrm[i * 3] = ox / l; nrm[i * 3 + 1] = oy / l; nrm[i * 3 + 2] = oz / l;
    }
    // shard centres -> local coordinates, rigid bodies
    const S = plan.shards, shardC = new Float32Array(S * 3);
    for (let s = 0; s < S; s++) { const fv = plan.shardFront[s]; let x = 0, y = 0, z = 0; for (const i of fv) { x += pos[i * 3]; y += pos[i * 3 + 1]; z += pos[i * 3 + 2]; } const k = fv.length || 1; shardC[s * 3] = x / k; shardC[s * 3 + 1] = y / k; shardC[s * 3 + 2] = z / k; }
    for (let i = 0; i < n; i++) { const s = vShard[i] * 3; pos[i * 3] -= shardC[s]; pos[i * 3 + 1] -= shardC[s + 1]; pos[i * 3 + 2] -= shardC[s + 2]; }
    const tmp = new THREE.Vector3(), out = [];
    const best = new Float32Array(DIRS.length), bi = new Int32Array(DIRS.length);
    for (let s = 0; s < S; s++) {
      const fv = plan.shardFront[s]; if (!fv.length) continue;
      // extreme points along a few directions (no allocations: this runs for every vertex of the figurine)
      let rad2 = 0; best.fill(-Infinity);
      for (let j = 0; j < fv.length; j++) {
        const i = fv[j] * 3, x = pos[i], y = pos[i + 1], z = pos[i + 2];
        const r2 = x * x + y * y + z * z; if (r2 > rad2) rad2 = r2;
        for (let d = 0; d < DIRS.length; d++) { const D = DIRS[d]; const v = x * D.x + y * D.y + z * D.z; if (v > best[d]) { best[d] = v; bi[d] = fv[j]; } }
      }
      const sup = [...new Set(bi)].map((i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      const rad = Math.sqrt(rad2);
      const b = new Body(sup, { radius: Math.max(0.01, rad), restitution: 0.28, friction: 0.6 });
      b.pos.set(shardC[s * 3], shardC[s * 3 + 1], shardC[s * 3 + 2]);
      const away = tmp.copy(b.pos).sub(center); away.y *= 0.3; const dist = away.length() || 1; away.divideScalar(dist);
      const sp = (0.6 + Math.random() * 1.4) * power;
      b.vel.copy(away).multiplyScalar(sp).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 1.9 * power, (Math.random() - 0.5) * 0.8));
      if (impact) { const d = Math.max(0.15, b.pos.distanceTo(impact.pos)); b.vel.addScaledVector(impact.dir, (2.2 / (d * 3 + 0.6)) * power); }
      b.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar((10 + Math.random() * 18) * Math.min(1.5, 0.05 / Math.max(0.02, rad)));
      b.scale = 1; b.sid = base + s; b.local = s;
      this.bodies.push(b); out.push(b);
    }
    plan.attrs.position.needsUpdate = true; plan.attrs.normal.needsUpdate = true;
    plan.mesh.visible = true; plan.bodies = out;
    this.write();
    return out;
  }

  // un-fire a plan: its shards vanish and it can fire again
  reset(plan) {
    if (!plan) return;
    plan.fired = false; plan.mesh.visible = false;
    const gone = new Set(plan.bodies || []);
    for (const b of gone) this.data[b.sid * 8 + 3] = 0;
    this.bodies = this.bodies.filter((b) => !gone.has(b));
    plan.bodies = [];
    this.tex.needsUpdate = true;
  }

  // hide some shards of a fired plan (pieces of a part that had already broken off)
  drop(bodies) { for (const b of bodies) { b.scale = 0; b.asleep = true; this.data[b.sid * 8 + 3] = 0; } this.bodies = this.bodies.filter((b) => b.scale > 0); this.tex.needsUpdate = true; }

  write() {
    const d = this.data;
    for (const b of this.bodies) { const i = b.sid * 8; d[i] = b.pos.x; d[i + 1] = b.pos.y; d[i + 2] = b.pos.z; d[i + 3] = b.scale; d[i + 4] = b.q.x; d[i + 5] = b.q.y; d[i + 6] = b.q.z; d[i + 7] = b.q.w; }
    this.tex.needsUpdate = true;
  }
  update(dt, floorY, onImpact) {
    if (!this.bodies.length) return;
    const sub = 2; const h = dt / sub;
    let moving = false;
    for (let s = 0; s < sub; s++) for (const b of this.bodies) { if (!b.asleep) { b.step(h, floorY, onImpact); moving = true; } }
    if (moving) this.write();
  }
}
