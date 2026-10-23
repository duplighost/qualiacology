// You Are Here. August 1st, drenched in heat: a trail up through the woods to the top
// of the hill he loved, and the sidewalk home after. The ground here is real: it rises
// and falls with the course, so the climb is a climb and the top is the top.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { tintMaterial } from './props.js';
import { RATE } from './course.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const nz = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

// ---------- the ground under the trail ----------
// The trail is a shelf a little under the lowest the course goes nearby, so the ground
// never comes up through the ribbon; off the shelf the hill falls away to the fields.
export function prepare(course, plan) {
  if (course._terrain) return course._terrain;
  const n = course.n, Y = course.y;
  const w = Math.round(1.4 * RATE);
  const lo = new Float32Array(n);
  // sliding-window minimum over [c - w, c + w]
  const dq = new Int32Array(n + 1); let head = 0, tail = 0, k = 0;
  for (let c = 0; c < n; c++) {
    const hi = Math.min(n - 1, c + w);
    while (k <= hi) { while (tail > head && Y[dq[tail - 1]] >= Y[k]) tail--; dq[tail++] = k; k++; }
    while (dq[head] < c - w) head++;
    lo[c] = Y[dq[head]];
  }
  // three box passes: about a gaussian of 0.6 s
  let a = lo;
  const r = Math.round(0.35 * RATE);
  for (let pass = 0; pass < 3; pass++) {
    const b = new Float32Array(n);
    let s = 0;
    for (let i = -r; i <= r; i++) s += a[clamp(i, 0, n - 1)];
    for (let i = 0; i < n; i++) { b[i] = s / (2 * r + 1); s += a[clamp(i + r + 1, 0, n - 1)] - a[clamp(i - r, 0, n - 1)]; }
    a = b;
  }
  course._terrain = { base: a, flats: (plan && plan.flat) || [] };
  return course._terrain;
}

// the floor a song's indoor places stand on: the trail's shelf, without the hillside
export function floorAt(course, t) { return groundAt(course, t, 0); }

export function groundAt(course, t, x) {
  const T = course._terrain;
  if (!T) return 0;
  const f = (t - course.t0) * RATE;
  const i = clamp(Math.floor(f), 0, course.n - 2), a = clamp(f - i, 0, 1);
  let base = T.base[i] + (T.base[i + 1] - T.base[i]) * a - 2.6;
  for (const [a0, a1, y] of T.flats) { const k = smooth(a0 - 4, a0, t) * (1 - smooth(a1, a1 + 4, t)); base += (y - base) * k; }
  base = Math.max(0, base);
  const ax = Math.abs(x);
  if (ax < 7.5) return base;
  const side = x > 0 ? 1 : -1;
  // how steeply the hill falls away here: changes slowly along the trail, differently each side
  const steep = 0.08 + 0.32 * nz(t * 0.021 + side * 3.1);
  const hx = ax - 7.5;
  let y = base - steep * hx * (1 + hx / 260) + 6 * (nz(t * 0.06 + x * 0.011 + 9) - 0.5) * smooth(12, 60, ax);
  y *= 1 - smooth(230, 310, ax);
  return Math.max(0, y);
}

function terrainMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Color(P.moon) }, uSunDir: { value: new THREE.Vector3(...(P.moonDir || [0, 1, 0])).normalize() }, uSunK: { value: P.sunK ?? 1 },
      uSky: { value: new THREE.Color(P.skyLight ?? 0x8090a0) }, uBounce: { value: new THREE.Color(P.bounce ?? 0x404030) }, uHemiK: { value: P.hemiK ?? 1.5 },
      uGrass: { value: new THREE.Color(P.ground) }, uDirt: { value: new THREE.Color(P.dirt ?? 0x8a6a4a) }, uWood: { value: 1 }, uDry: { value: 1 },
      uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSky, uBounce, uGrass, uDirt, uFog, uCam; uniform float uSunK, uHemiK, uWood, uDry, uFogDensity;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vUv.x, along = vUv.y, ax = abs(x);
        vec3 N = normalize(vN);
        // August grass, dry and gold in patches; under the woods a floor of leaves and needles
        float pat = n2(vW.xz * 0.045) * 0.6 + n2(vW.xz * 0.23) * 0.4;
        vec3 grass = mix(uGrass, uGrass * vec3(1.45, 1.25, 0.6), smoothstep(0.35, 0.8, pat) * uDry);
        vec3 leaves = mix(uGrass * vec3(0.55, 0.5, 0.36), vec3(0.2, 0.14, 0.08), 0.4) * (0.75 + 0.5 * pat);
        vec3 alb = mix(grass, leaves, uWood * smoothstep(8.0, 15.0, ax));
        // the path: packed dirt, wandering a little
        float path = 1.0 - smoothstep(3.4, 5.0, ax + (n2(vec2(along * 0.12, 3.0)) - 0.5) * 1.8);
        vec3 dirt = uDirt * (0.8 + 0.35 * n2(vec2(along * 0.5, x * 1.3)));
        alb = mix(alb, dirt, path);
        // rock where it's steep
        alb = mix(alb, vec3(0.46, 0.44, 0.42) * (0.75 + 0.35 * pat), smoothstep(0.3, 0.55, 1.0 - N.y));
        float ndl = max(dot(N, normalize(uSunDir)), 0.0);
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
        vec3 col = alb * (amb + uSun * uSunK * ndl) / 3.14159;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

export class Terrain {
  constructor(scene, course, P, plan) {
    this.course = course;
    prepare(course, plan);
    this.cols = [-320, -240, -175, -125, -90, -64, -46, -33, -24, -17, -12, -8.5, -6, -3.5, 0, 3.5, 6, 8.5, 12, 17, 24, 33, 46, 64, 90, 125, 175, 240, 320];
    const N = 170, M = this.cols.length;
    this.N = N; this.M = M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.nor = new Float32Array(N * M * 3); this.uvs = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = terrainMaterial(P);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._p = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }

  update(track, rider, P, cam, wood) {
    const t0 = rider.t - 4, t1 = rider.t + 46, N = this.N, M = this.M, c = this.course;
    const cum = this._cum || (this._cum = new Float32Array(N));
    const iR = Math.round((rider.t - t0) / (t1 - t0) * (N - 1));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = t0 + (t1 - t0) * (i / (N - 1));
      for (let j = 0; j < M; j++) {
        const x = this.cols[j];
        track.ground(t, x, this._p);
        const o = (i * M + j) * 3;
        this.pos[o] = this._p.x; this.pos[o + 1] = groundAt(c, t, x); this.pos[o + 2] = this._p.z;
        this.uvs[(i * M + j) * 2] = x;
      }
      const cx = this.pos[(i * M + 14) * 3], cz = this.pos[(i * M + 14) * 3 + 2];
      cum[i] = i ? cum[i - 1] + Math.hypot(cx - lx, cz - lz) : 0;
      lx = cx; lz = cz;
    }
    const base = rider.stats.dist - cum[iR];
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.uvs[(i * M + j) * 2 + 1] = cum[i] + base;
    // normals from the neighbours
    const P3 = this.pos, a = this._a, b = this._b;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(M - 1, j + 1);
      a.set(P3[(i1 * M + j) * 3] - P3[(i0 * M + j) * 3], P3[(i1 * M + j) * 3 + 1] - P3[(i0 * M + j) * 3 + 1], P3[(i1 * M + j) * 3 + 2] - P3[(i0 * M + j) * 3 + 2]);
      b.set(P3[(i * M + j1) * 3] - P3[(i * M + j0) * 3], P3[(i * M + j1) * 3 + 1] - P3[(i * M + j0) * 3 + 1], P3[(i * M + j1) * 3 + 2] - P3[(i * M + j0) * 3 + 2]);
      a.cross(b).normalize(); if (a.y < 0) a.negate();
      const o = (i * M + j) * 3; this.nor[o] = a.x; this.nor[o + 1] = a.y; this.nor[o + 2] = a.z;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(...P.moonDir).normalize();
    u.uSunK.value = P.sunK ?? 1; u.uHemiK.value = P.hemiK ?? 1.5;
    u.uSky.value.set(P.skyLight ?? 0x8090a0); u.uBounce.value.set(P.bounce ?? 0x404030);
    u.uGrass.value.set(P.ground); if (P.dirt !== undefined) u.uDirt.value.set(P.dirt);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uCam.value.copy(cam.position);
    u.uWood.value += ((wood ?? 1) - u.uWood.value) * 0.03;
  }
}

// ---------- trees, painted arrows, rocks, the church, benches ----------
function paint(g, c, jitter = 0, R = Math.random) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  const pos = g.attributes.position.array;
  for (let i = 0; i < n; i += 3) {
    // one shade per face, so the low-poly crowns read; lighter toward the top
    const k = (1 + (R() - 0.5) * jitter) * (0.86 + 0.28 * clamp(pos[i * 3 + 1] / 14, 0, 1));
    for (let v = i; v < Math.min(n, i + 3); v++) { a[v * 3] = c[0] * k; a[v * 3 + 1] = c[1] * k; a[v * 3 + 2] = c[2] * k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const TG = {
  oak() {
    const R = seeded(11), parts = [];
    const trunk = new THREE.CylinderGeometry(0.22, 0.42, 5.2, 6); trunk.translate(0, 2.6, 0); parts.push(paint(ni(trunk), [0.32, 0.22, 0.15], 0.2, R));
    const blobs = [[0, 7.2, 0, 3.1], [1.9, 6.0, 0.6, 2.2], [-1.7, 6.3, -0.4, 2.3], [0.4, 8.9, -0.6, 2.2], [-0.6, 5.6, 1.6, 1.9]];
    for (const [x, y, z, r] of blobs) {
      const b = new THREE.IcosahedronGeometry(r, 1); b.translate(x, y, z);
      const nb = ni(b), p = nb.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const s = 1 + (R() - 0.5) * 0.18; p[i] = x + (p[i] - x) * s; p[i + 1] = y + (p[i + 1] - y) * s; p[i + 2] = z + (p[i + 2] - z) * s; }
      const cc = [0.3 + R() * 0.06, 0.48 + R() * 0.08, 0.2], k = (y - 5) / 5;
      parts.push(paint(nb, [cc[0] * (0.8 + 0.4 * k), cc[1] * (0.8 + 0.4 * k), cc[2]], 0.22, R));
    }
    return mergeGeometries(parts, false);
  },
  fir() {
    const R = seeded(23), parts = [];
    const trunk = new THREE.CylinderGeometry(0.16, 0.3, 3.4, 6); trunk.translate(0, 1.7, 0); parts.push(paint(ni(trunk), [0.3, 0.2, 0.14], 0.2, R));
    const tiers = [[3.0, 5.2, 4.2], [2.4, 4.4, 7.0], [1.7, 3.6, 9.6], [1.0, 2.8, 12.0]];
    for (const [r, h, y] of tiers) { const c = new THREE.ConeGeometry(r, h, 8); c.translate(0, y, 0); parts.push(paint(ni(c), [0.14, 0.3 + R() * 0.05, 0.18], 0.25, R)); }
    return mergeGeometries(parts, false);
  },
  // a white arrow painted on a trunk, pointing up the trail (+z), facing +x
  arrow() {
    const s = new THREE.Shape();
    s.moveTo(-0.08, -0.22); s.lineTo(0.08, -0.22); s.lineTo(0.08, 0.04); s.lineTo(0.18, 0.04); s.lineTo(0, 0.26); s.lineTo(-0.18, 0.04); s.lineTo(-0.08, 0.04); s.closePath();
    // pointing up the trunk (straight on, up the hill), its face turned to +x
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    return paint(ni(g), [1, 1, 1], 0);
  },
  post() {
    const p = new THREE.BoxGeometry(0.16, 1.5, 0.16); p.translate(0, 0.75, 0);
    const board = new THREE.BoxGeometry(0.06, 0.26, 0.9); board.translate(0.11, 1.3, 0.15);
    const tip = new THREE.CylinderGeometry(0.0, 0.2, 0.36, 3); tip.rotateX(Math.PI / 2); tip.rotateZ(Math.PI / 2); tip.scale(1, 1, 1); tip.translate(0.11, 1.3, 0.75);
    return merge([p, board, tip]);
  },
  rock() {
    const R = seeded(5);
    const g = ni(new THREE.DodecahedronGeometry(1, 0));
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const k = 0.8 + R() * 0.4; p[i] *= k * 1.3; p[i + 1] *= k * 0.75; p[i + 2] *= k; }
    g.translate(0, 0.35, 0);
    g.computeVertexNormals();
    return g;
  },
  church() {
    const body = new THREE.BoxGeometry(10, 8, 18); body.translate(0, 4, 0);
    return body;
  },
  steeple() {
    const roof = new THREE.CylinderGeometry(0.01, 7.6, 4.2, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 1.75); roof.translate(0, 10.1, 0);
    const tower = new THREE.BoxGeometry(3.6, 7, 3.6); tower.translate(0, 11.5, 7.2);
    const spire = new THREE.ConeGeometry(2.4, 7.5, 4); spire.rotateY(Math.PI / 4); spire.translate(0, 18.7, 7.2);
    const cross1 = new THREE.BoxGeometry(0.18, 1.8, 0.18); cross1.translate(0, 23.3, 7.2);
    const cross2 = new THREE.BoxGeometry(0.9, 0.18, 0.18); cross2.translate(0, 23.6, 7.2);
    const door = new THREE.BoxGeometry(1.6, 2.6, 0.2); door.translate(0, 1.3, 9.05);
    return merge([roof, tower, spire, cross1, cross2, door]);
  },
  bench() {
    const parts = [];
    const seat = new THREE.BoxGeometry(1.9, 0.08, 0.5); seat.translate(0, 0.46, 0); parts.push(seat);
    const back = new THREE.BoxGeometry(1.9, 0.42, 0.06); back.translate(0, 0.78, -0.25); back.rotateX(-0.12); parts.push(back);
    for (const x of [-0.8, 0.8]) { const l = new THREE.BoxGeometry(0.08, 0.46, 0.46); l.translate(x, 0.23, 0); parts.push(l); }
    const plaque = new THREE.BoxGeometry(0.34, 0.1, 0.02); plaque.translate(0, 0.84, -0.22); parts.push(plaque);
    return merge(parts);
  },
  cairn() {
    const parts = [];
    let y = 0;
    for (const [r, h] of [[1.0, 0.5], [0.8, 0.45], [0.62, 0.4], [0.46, 0.36], [0.3, 0.3]]) { const s = new THREE.DodecahedronGeometry(r, 0); s.scale(1, h / r, 1); s.translate(0, y + h / 2, 0); parts.push(s); y += h * 0.9; }
    return merge(parts);
  },
  boardPosts() {
    const parts = [];
    for (const x of [-1.7, 1.7]) { const p = new THREE.BoxGeometry(0.16, 2.6, 0.16); p.translate(x, 1.3, -0.06); parts.push(p); }
    const back = new THREE.BoxGeometry(3.7, 1.25, 0.08); back.translate(0, 1.85, -0.1); parts.push(back);
    return merge(parts);
  },
  boardFace() { const g = new THREE.PlaneGeometry(3.5, 1.09); g.translate(0, 1.85, -0.05); return g; },
  gate() {
    const parts = [];
    for (const x of [-4.2, 4.2]) { const p = new THREE.BoxGeometry(0.3, 3.4, 0.3); p.translate(x, 1.7, 0); parts.push(p); }
    const beam = new THREE.BoxGeometry(9, 0.3, 0.3); beam.translate(0, 3.3, 0); parts.push(beam);
    return merge(parts);
  },
};

function blobMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec2 aWake; varying vec2 vUv; varying float vA; void main(){ vUv = uv; vA = aWake.x; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying float vA; void main(){ float d = length(vUv - 0.5) * 2.0; float a = (1.0 - smoothstep(0.35, 1.0, d)) * vA; gl_FragColor = vec4(0.02, 0.03, 0.01, a); }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

function leafMaterial() {
  const m = tintMaterial(0xffffff, { rough: 0.92 });
  m.vertexColors = true; m.flatShading = true;
  return m;
}

const TT = { aTint: 3 };
// the shade a tree throws: a soft dark disc on the ground under it, lying with the slope
function treeShadow(S, it, p, yaw, r) {
  const e = S._eb || (S._eb = new THREE.Euler(0, 0, 0, 'YZX'));
  e.set(0, yaw - (it.rot || 0), it.tilt || 0);
  const q = S._qb || (S._qb = new THREE.Quaternion()); q.setFromEuler(e);
  const o = S._ob || (S._ob = new THREE.Vector3()); o.copy(p); o.y += 0.06;
  const m = S._mb || (S._mb = new THREE.Matrix4());
  m.compose(o, q, S._sb ? S._sb.set(r * 2 * it.s, 1, r * 2 * it.s) : (S._sb = new THREE.Vector3(r * 2 * it.s, 1, r * 2 * it.s)));
  S.layers.blob.add(m, { aWake: [S.P.dapple !== undefined ? 0.28 + 0.3 * (S.P.sunK ?? 1) / 3 : 0.3, 0] });
}
function tiltAt(c, t, x) { return Math.atan(-(groundAt(c, t, x + 1.5) - groundAt(c, t, x - 1.5)) / 3); }

extend({
  layers: {
    oak: (M) => [TG.oak(), M.leaf || (M.leaf = leafMaterial()), 1700, TT],
    fir: (M) => [TG.fir(), M.leaf || (M.leaf = leafMaterial()), 1300, TT],
    arrow: (M) => [TG.arrow(), M.paintMat || (M.paintMat = (() => { const m = tintMaterial(0xffffff, { rough: 0.6, emissive: 0x202020 }); m.vertexColors = true; return m; })()), 300, TT],
    trailPost: (M) => [TG.post(), M.wood, 160, TT],
    rock: (M) => [TG.rock(), M.rockMat || (M.rockMat = (() => { const m = tintMaterial(0xffffff, { rough: 0.95 }); m.flatShading = true; return m; })()), 700, TT],
    church: (M) => [TG.church(), M.house, 3, { aWake: 3, aTint: 3 }],
    steeple: (M) => [TG.steeple(), M.roof, 3, TT],
    bench: (M) => [TG.bench(), M.wood, 12, TT],
    cairn: (M) => [TG.cairn(), M.rockMat || (M.rockMat = (() => { const m = tintMaterial(0xffffff, { rough: 0.95 }); m.flatShading = true; return m; })()), 6, TT],
    trailGate: (M) => [TG.gate(), M.wood, 6, TT],
    boardPosts: (M) => [TG.boardPosts(), M.wood, 30, TT],
    blob: (M) => [(() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })(), M.blob || (M.blob = blobMaterial()), 1400, { aWake: 2 }],
    boardFace: (M) => [TG.boardFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    oak(S, it, p, q, yaw) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers.oak.add(m, { aTint: it.tint }); if (it.blob) treeShadow(S, it, p, yaw, 4.2); },
    fir(S, it, p, q, yaw) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers.fir.add(m, { aTint: it.tint }); if (it.blob) treeShadow(S, it, p, yaw, 3.4); },
    arrow(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.4, 1.4, 1.4)); S.layers.arrow.add(m, { aTint: it.tint }); },
    trailPost(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.trailPost.add(m, { aTint: [0.5, 0.36, 0.24] }); },
    rock(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s * (it.sz ?? 1))); S.layers.rock.add(m, { aTint: it.tint }); },
    church(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1));
      S.layers.church.add(m, { aWake: [it.wakeNow, it.seed, 0], aTint: [0.95, 0.94, 0.9] });
      S.layers.steeple.add(m, { aTint: [0.92, 0.9, 0.88] });
    },
    bench(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.bench.add(m, { aTint: [0.55, 0.4, 0.28] }); },
    cairn(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.cairn.add(m, { aTint: [0.7, 0.68, 0.64] }); },
    // a lyric on a trail sign, turned toward you coming up the path
    trailsign(S, it, p, q) {
      p.y = groundAt(S.course, it.t, it.x);
      const h = S.course.sample(it.t).yaw;
      S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); const fq = S._q.setFromEuler(S._e);
      const m = S._m; m.compose(p, fq, S._s.set(it.s ?? 1.3, it.s ?? 1.3, it.s ?? 1.3));
      S.layers.boardPosts.add(m, { aTint: [0.42, 0.3, 0.2] });
      S.layers.boardFace.add(m, { aIdx: it.idx, aWake: [0.55, 0] });
    },
    trailGate(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.trailGate.add(m, { aTint: [0.45, 0.32, 0.22] }); },
  },
  kits: {
    // the woods: a corridor of trees close on both sides, more down the slopes; arrows on the trunks
    woods(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      // leave room round the landmarks so you can see them
      const clear = S._clear || (S._clear = (S.plan.zones || []).filter((q) => q.at !== undefined).map((q) => ({ t: q.at, x: q.x ?? 0, r: q.clear ?? 26 })));
      // (song seconds to metres at a typical speed, near enough for a clearing)
      const open = (t, x) => { for (const k of clear) { const dt = (t - k.t) * 45, dx = x - k.x; if (dt * dt + dx * dx < k.r * k.r) return false; } return true; };
      const dens = z.density ?? 1;
      const noArrows = z.arrows === false;
      const greens = [[0.95, 1, 0.9], [0.85, 0.95, 0.8], [1.05, 1.0, 0.82], [0.9, 1.05, 0.95], [1.1, 0.96, 0.7]];
      for (const side of [-1, 1]) {
        // close in: trunks lining the trail
        for (let t = z.from + R() * 0.1; t < z.to; t += (0.16 + R() * 0.12) / dens) {
          const x = side * (9.5 + R() * 6.5);
          const fir = R() < (z.firs ?? 0.35);
          const tt = t;
          const h = groundAt(c, tt, x);
          if (!open(tt, x)) continue;
          S.items.push({ t: tt, x, h, rot: R() * 6.28, s: 0.8 + R() * 0.45, sy: 0.9 + R() * 0.35, parts: fir ? 'fir' : 'oak', tint: pick(R, greens), ahead: 26, blob: true, tilt: tiltAt(c, tt, x) });
          if (!noArrows && !fir && R() < 0.12 && Math.abs(x) < 13) {
            // a painted arrow on the side of the trunk that faces the trail
            const ax = x - side * 0.4;
            S.items.push({ t: tt, x: ax, h: h + 1.7, rot: side > 0 ? Math.PI : 0, parts: 'arrow', tint: [1, 1, 1], ahead: 14 });
          }
        }
        // the slope below
        for (let t = z.from + R() * 0.2; t < z.to; t += (0.07 + R() * 0.08) / dens) {
          const x = side * (17 + Math.pow(R(), 1.35) * 150);
          const fir = R() < (z.firs ?? 0.35) + 0.1;
          if (!open(t, x)) continue;
          S.items.push({ t, x, h: groundAt(c, t, x), rot: R() * 6.28, s: 0.85 + R() * 0.6, sy: 0.9 + R() * 0.4, parts: fir ? 'fir' : 'oak', tint: pick(R, greens), ahead: Math.abs(x) < 60 ? 30 : 40, blob: Math.abs(x) < 45, tilt: tiltAt(c, t, x) });
        }
        if (R() < 0.8) for (let t = z.from; t < z.to; t += 0.6 + R() * 0.9) { const x = side * (8 + R() * 30); S.items.push({ t, x, h: groundAt(c, t, x), rot: R() * 6.28, s: 0.4 + R() * 0.8, sy: 0.6 + R() * 0.5, sz: 0.8 + R() * 0.6, parts: 'rock', tint: [0.78, 0.75, 0.7], ahead: 22 }); }
      }
      // wooden posts pointing the way, every few seconds
      if (!noArrows) for (let t = z.from + 1; t < z.to; t += 2.6 + R() * 1.6) { const side = R() < 0.5 ? -1 : 1; S.items.push({ t, x: side * 6.8, h: groundAt(c, t, side * 6.8), rot: side > 0 ? 0 : Math.PI, parts: 'trailPost', ahead: 16 }); }
    },
    // open ground: the ridge, the meadow, the top. A few trees standing alone, rocks, the view
    ridge(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      const greens = [[1.05, 1, 0.8], [0.95, 1.05, 0.85], [1.15, 1.0, 0.7]];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.5; t < z.to; t += (0.5 + R() * 0.8) / (z.density ?? 1)) {
          const x = side * (11 + Math.pow(R(), 1.2) * 160);
          S.items.push({ t, x, h: groundAt(c, t, x), rot: R() * 6.28, s: 0.9 + R() * 0.6, sy: 0.85 + R() * 0.4, parts: R() < 0.4 ? 'fir' : 'oak', tint: pick(R, greens), ahead: 40, blob: Math.abs(x) < 60, tilt: tiltAt(c, t, x) });
        }
        for (let t = z.from; t < z.to; t += 0.25 + R() * 0.4) { const x = side * (7.5 + Math.pow(R(), 1.5) * 60); S.items.push({ t, x, h: groundAt(c, t, x), rot: R() * 6.28, s: 0.35 + R() * (z.rocky ? 1.6 : 0.7), sy: 0.6 + R() * 0.5, sz: 0.8 + R() * 0.6, parts: 'rock', tint: [0.82, 0.8, 0.76], ahead: 28 }); }
      }
    },
    // the bottom of the trail: a gravel lot, a few cars, the map board, the gate into the woods
    trailhead(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      for (let k = 0; k < 9; k++) { const t = z.from + 1 + k * 0.9 + R() * 0.3, side = k % 2 ? 1 : -1; S.items.push({ t, x: side * (11 + R() * 5), h: 0, rot: side * Math.PI / 2 + (R() - 0.5) * 0.2, parts: 'parked', tint: col(pick(R, [0xd8d0c8, 0x3a4a6a, 0xa83a3a, 0x2a2a2e, 0xe8e4dc, 0x5a7a5a])) }); }
      S.items.push({ t: z.to - 0.6, x: 0, h: 0, rot: 0, parts: 'trailGate' });
      for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 24, h: 0, rot: 0, s: 1, parts: 'fence', tint: col(0x8a6a4a) });
    },
    // the building on the hill that is a church but isn't one: no arrows here, private property
    church(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      const x = z.x ?? -36;
      S.items.push({ t: z.at, x, h: groundAt(c, z.at, x) - 0.5, rot: (x > 0 ? -1 : 1) * Math.PI / 2 + 0.35 * Math.sign(x), parts: 'church', seed: R(), wake0: 0.05, ahead: 40 });
      // its signs on the trail: private property, every so often, both sides
      for (let t = z.from; t < z.to; t += 1.5 + R() * 0.7) {
        const side = R() < 0.6 ? Math.sign(x) : -Math.sign(x);
        S.items.push({ t, x: side * 8.4, idx: S.atlas.index.PRIVATE, s: 0.9, parts: 'trailsign', ahead: 20 });
      }
    },
    bench(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      const x = z.x ?? 8.5;
      S.items.push({ t: z.at, x, h: groundAt(c, z.at, x), rot: x > 0 ? -Math.PI / 2 : Math.PI / 2, parts: 'bench', ahead: 20 });
    },
    summit(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      S.items.push({ t: z.at, x: 5.6, h: groundAt(c, z.at, 5.6), rot: 0, parts: 'cairn', ahead: 30 });
      S.items.push({ t: z.at + 0.25, x: -8.6, h: groundAt(c, z.at + 0.25, -8.6), rot: Math.PI / 2, parts: 'bench', ahead: 30 });
    },
    // the rock that gets the leg
    therock(S, z, R) {
      const c = S.course;
      prepare(c, S.plan);
      S.items.push({ t: z.at, x: z.x ?? 4.6, h: groundAt(c, z.at, z.x ?? 4.6) - 0.3, rot: 0.6, s: 1.6, sy: 1.1, sz: 1.3, parts: 'rock', tint: [0.72, 0.68, 0.64], ahead: 20 });
    },
  },
});

// ---------- the end: home, the porch light on ----------
export class HomeFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -15;
    this.group = new THREE.Group(); scene.add(this.group);
    const wall = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.85 });
    const roofM = new THREE.MeshStandardMaterial({ color: 0x4a3a36, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 9), wall); body.position.y = 3; this.group.add(body);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.6, 3.6, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.9); roof.position.y = 7.8; this.group.add(roof);
    this.winMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, emissive: new THREE.Color(0xffc070), emissiveIntensity: 0.15, roughness: 0.3 });
    for (const [x, y] of [[-2.8, 4.3], [2.8, 4.3], [-2.8, 1.7], [2.8, 1.7]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), this.winMat); w.position.set(x, y, 4.52); this.group.add(w); }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), this.winMat); door.position.set(0, 1.15, 4.53); this.group.add(door);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 2.4), roofM); porch.position.set(0, 2.9, 5.7); this.group.add(porch);
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.2), wall); step.position.set(0, 0.15, 5.1); this.group.add(step);
    this.lit = 0; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const p = track.ground(this.t, this.x, this._p);
    const yaw = this.course.sample(this.t).yaw;
    this.group.position.copy(p);
    this.group.rotation.y = yaw + (this.x < 0 ? -Math.PI / 2 : Math.PI / 2);
    this.lit += ((this.fired ? 1 : 0.1) - this.lit) * Math.min(1, dt * 0.8);
    this.winMat.emissiveIntensity = 0.15 + 2.2 * this.lit;
    const S = this.S; if (!S || this.t - rider.t > 40) return;
    // the porch light, and the light from the door on the path
    this.group.updateMatrixWorld(true);
    const w = new THREE.Vector3(0, 2.7, 5.2).applyMatrix4(this.group.matrixWorld);
    S.glow(w.x, w.y, w.z, 2.6, col(this.P.lamp ?? 0xffc070), 0.5 + 2.2 * this.lit);
    const f = new THREE.Vector3(0, 0.1, 7.5).applyMatrix4(this.group.matrixWorld);
    S.pool(f.x, f.y, f.z, 12, col(this.P.lamp ?? 0xffc070), 0.3 + 1.0 * this.lit);
  }
}

// ---------- the place itself, per frame ----------
export class TrailWorld {
  constructor(scene, S) {
    this.terrain = new Terrain(scene, S.course, S.P, S.plan);
    this.S = S;
  }
  update(S, dt, camera) {
    // how wooded it is right here, for the floor under the trees
    const t = S.rider.t;
    let wood = 0;
    for (const z of S.plan.zones || []) if (z.kits.includes('woods') && t > z.from - 2 && t < z.to + 2) wood = 1;
    this.terrain.update(S.track, S.rider, S.P, camera, wood);
  }
}
