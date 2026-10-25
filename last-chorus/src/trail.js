// You Are Here. August 1st, drenched in heat: a trail up through the woods to the top
// of the hill he loved, and the sidewalk home after. The ground here is real: it rises
// and falls with the course, so the climb is a climb and the top is the top.
// prepare/groundAt/floorAt/Terrain and the oak and fir are shared with other songs; the
// song's own place (the yah* names, TrailWorld, HomeFinale) is from "You Are Here, August" on.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { tintMaterial } from './props.js';
import { RATE } from './course.js';
import { broadleaf, birch, pine, spruce, shrub, fernPatch, flowerPatch, grassPatch, boulder, ledge, stoneWall, log, natureMaterial, lightNature, yahRng, yahNoise } from './yah-trees.js';
import * as YS from './yah-sets.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// the distance along the rows at a fractional row (where she is): the ground's along-the-road
// coordinate is anchored there, so it stays fixed to the world between rows instead of creeping
// forward with her and snapping back at each new row (lawn stripes and paths flickered)
export function alongAt(cum, f) {
  const n = cum.length, i = clamp(Math.floor(f), 0, n - 2), a = clamp(f - i, 0, 1);
  return cum[i] + (cum[i + 1] - cum[i]) * a;
}
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
  course._terrain = { base: a, flats: (plan && plan.flat) || [], shelf: (plan && plan.shelf) || 7.5, drop: (plan && plan.drop) ?? 2.6 };
  return course._terrain;
}

// the floor a song's indoor places stand on: the trail's shelf, without the hillside
export function floorAt(course, t) { return groundAt(course, t, 0); }

export function groundAt(course, t, x) {
  const T = course._terrain;
  if (!T) return 0;
  return groundSide(course, t, x, groundBase(course, t));
}
// the same in two parts, so a whole row across the trail costs one lookup along it:
// the shelf's height at t, then the hillside x metres off it
export function groundBase(course, t) {
  const T = course._terrain;
  if (!T) return 0;
  const f = (t - course.t0) * RATE;
  const i = clamp(Math.floor(f), 0, course.n - 2), a = clamp(f - i, 0, 1);
  let base = T.base[i] + (T.base[i + 1] - T.base[i]) * a - T.drop;
  for (const [a0, a1, y] of T.flats) { const k = smooth(a0 - 4, a0, t) * (1 - smooth(a1, a1 + 4, t)); base += (y - base) * k; }
  return Math.max(0, base);
}
export function groundSide(course, t, x, base) {
  const T = course._terrain;
  if (!T) return 0;
  const ax = Math.abs(x), shelf = T.shelf;
  if (ax < shelf) return base;
  const side = x > 0 ? 1 : -1;
  // how steeply the hill falls away here: changes slowly along the trail, differently each side
  const steep = 0.08 + 0.32 * nz(t * 0.021 + side * 3.1);
  const hx = ax - shelf;
  let y = base - steep * hx * (1 + hx / 260) + 6 * (nz(t * 0.06 + x * 0.011 + 9) - 0.5) * smooth(12, 60, ax);
  y *= 1 - smooth(230, 310, ax);
  return Math.max(0, y);
}

function terrainMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Color(P.moon) }, uSunDir: { value: new THREE.Vector3(...(P.moonDir || [0, 1, 0])).normalize() }, uSunK: { value: P.sunK ?? 1 },
      uSky: { value: new THREE.Color(P.skyLight ?? 0x8090a0) }, uBounce: { value: new THREE.Color(P.bounce ?? 0x404030) }, uHemiK: { value: P.hemiK ?? 1.5 },
      uGrass: { value: new THREE.Color(P.ground) }, uDirt: { value: new THREE.Color(P.dirt ?? 0x8a6a4a) }, uWood: { value: 1 }, uDry: { value: 1 }, uPath: { value: 1 }, uLawn: { value: 0 },
      uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSky, uBounce, uGrass, uDirt, uFog, uCam; uniform float uSunK, uHemiK, uWood, uDry, uFogDensity, uPath, uLawn;
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
        float path = (1.0 - smoothstep(3.4, 5.0, ax + (n2(vec2(along * 0.12, 3.0)) - 0.5) * 1.8)) * uPath;
        // a town: mown lawns in stripes, a driveway now and then
        alb = mix(alb, uGrass * (0.92 + 0.16 * step(0.5, fract(along / 3.0 + (ax > 9.0 ? 0.25 : 0.0)))), uLawn * smoothstep(8.0, 10.0, ax) * (1.0 - smoothstep(60.0, 90.0, ax)));
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
    // (wound to face up: +x is her right, so a-b-c runs anticlockwise seen from above)
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = terrainMaterial(P);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    // (the street-grid ground plane goes a little lower in a place with a hillside: where the hill
    // comes down to nothing the two lay at the same height and fought, flickering)
    scene.userData.hasTerrain = true;
    this._p = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }

  // the ground's heights on a row never change: worked out once per row as it comes into view
  baseRow(k) {
    const hc = this._hc || (this._hc = new Map());
    let h = hc.get(k);
    if (!h) { h = new Float32Array(this.M); const t = k * YD, base = groundBase(this.course, t); for (let j = 0; j < this.M; j++) h[j] = groundSide(this.course, t, this.cols[j], base); hc.set(k, h); }
    return h;
  }
  update(track, rider, P, cam, wood) {
    // rows locked to song time (not sliding with her): a hillside sampled at new points every
    // frame swam, its slopes and shading shimmering along both sides of the road
    const N = this.N, M = this.M, c = this.course;
    const k0 = Math.floor((rider.t - 4) / YD), t0 = k0 * YD;
    this.rowT0 = t0; this.rowDT = YD;
    if (this._hc) for (const k of this._hc.keys()) if (k < k0 - 2) this._hc.delete(k);
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    const smp = this._smp || (this._smp = {});
    for (let i = 0; i < N; i++) {
      const t = t0 + i * YD, hs = this.baseRow(k0 + i);
      // (track.ground(t, x) is the row's centre slid x along its right: once per row, not per point)
      track.ground(t, 0, this._p);
      const yaw = c.sample(t, smp).yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      for (let j = 0; j < M; j++) {
        const x = this.cols[j];
        const o = (i * M + j) * 3;
        this.pos[o] = this._p.x + rx * x; this.pos[o + 1] = hs[j]; this.pos[o + 2] = this._p.z + rz * x;
        this.uvs[(i * M + j) * 2] = x;
      }
      cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0;
      lx = this._p.x; lz = this._p.z;
    }
    const base = rider.stats.dist - alongAt(cum, (rider.t - t0) / YD);
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

// =====================================================================================
// You Are Here, August: the song's own place. Everything from here down is this song's
// (the yah names); the shared ground above stays as it is for the others.
// =====================================================================================

const YD = 0.3;                                         // the ground's rows, locked to song time so nothing swims
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);   // turned to face the trail from x
const FACE = (x) => Math.PI + (x > 0 ? -0.55 : 0.55);      // turned to the rider coming, a little to the trail

// the song's ground: the shared hillside, with the gorge cut where the footbridge is out, and
// level pads where the bigger things stand
export function yahGround(c, t, x) {
  let y = groundAt(c, t, x);
  const pads = c._yahPads;
  if (pads) for (const p of pads) {
    const dt = (t - p.t) * 38;
    if (dt > p.r || dt < -p.r) continue;
    const d = Math.hypot(dt, x - p.x);
    // (a raised knoll never comes up under the trail itself)
    if (d < p.r) { const k = (1 - smooth(p.r * 0.55, p.r, d)) * (p.raised > 0 ? smooth(6.5, 9.5, Math.abs(x)) : 1); y += (p.y - y) * k; }
  }
  const cuts = c._yahCuts;
  if (cuts) for (const g of cuts) {
    if (t < g.from - g.edge || t > g.to + g.edge) continue;
    const k = smooth(g.from - g.edge, g.from, t) * (1 - smooth(g.to, g.to + g.edge, t));
    // a rim: the ground comes up to just under the trail, so the edge is a cliff; a cut: the gorge
    if (g.rim) y += (Math.max(y, c.sample(t).y - g.below) - y) * k * (1 - smooth(60, 120, Math.abs(x)));
    else y = Math.max(1, y - g.depth * k * (0.92 + 0.16 * nz(x * 0.05 + g.from)));
  }
  return y;
}
function yahPrep(c, plan) {
  prepare(c, plan);
  if (c._yahCuts) return;
  c._yahCuts = (plan && plan.cuts) || [];
  // pads under the set-pieces that ask for one: levelled where they stand, or (lift) raised into a
  // knoll that brings them up to the trail's height so they stand where you can see them
  c._yahPads = [];
  for (const z of (plan && plan.zones) || []) if (z.kits.includes('yahSets')) for (const a of z.at || []) if (a.pad) {
    const g = groundAt(c, a.t, a.x), y = a.lift !== undefined ? Math.max(g, c.sample(a.t).y - a.lift) : g + (a.padY ?? 0);
    c._yahPads.push({ t: a.t, x: a.x, r: a.pad, y, raised: y - g, clr: Math.max(a.pad * 1.05, a.clr ?? 0) });
  }
  // and the lyric boards stand in clearings of their own
  c._yahClear = c._yahPads.slice();
  (plan && plan.lyrics || []).forEach((l, i) => {
    const side = l.side ?? (i % 2 ? -1 : 1), s = l.s ?? plan.lyricS ?? 1.25;
    c._yahClear.push({ t: l.t + (l.lead ?? 1.4), x: side * (l.x ?? plan.lyricX ?? 24), clr: 5 + 3.4 * s });
  });
}
// inside a set-piece's or a board's clearing: the woods leave it, and the way you see it from, clear
const inPad = (c, t, x) => {
  for (const p of c._yahClear || []) {
    const dt = (t - p.t) * 38;
    if (dt > p.clr || dt < -p.clr * 2.2) continue;
    // a longer clearing on the near side, the side you come at it from
    const d = Math.hypot(dt < 0 ? dt / 2.2 : dt, x - p.x);
    if (d < p.clr && Math.sign(x) === Math.sign(p.x)) return true;
  }
  return false;
};
const onGround = (S, it) => { yahPrep(S.course, S.plan); if (it.h === undefined) it.h = yahGround(S.course, it.t, it.x) + (it.dy ?? 0); return it; };

// how wooded, open, rocky or town it is at song time t on a side, from the plan's zones
function zoneAt(plan, t, side) {
  let wood = 0, open = 0, rock = 0, lawn = 0;
  for (const z of plan.zones || []) {
    if (z.from === undefined) continue;
    const k = smooth(z.from - 1.2, z.from + 0.3, t) * (1 - smooth(z.to - 0.3, z.to + 1.2, t));
    if (k <= 0) continue;
    if (z.kits.includes('yahWoods')) {
      let w = k * (z.floor ?? 1);
      for (const [a, b, sd] of z.clear || []) if (!sd || sd === side) w *= 1 - smooth(a - 0.6, a + 0.2, t) * (1 - smooth(b - 0.2, b + 0.6, t));
      wood = Math.max(wood, w);
    }
    if (z.kits.includes('yahOpen') || z.kits.includes('yahLot')) { open = Math.max(open, k); if (z.rocky) rock = Math.max(rock, k); }
    if (z.kits.includes('yahStreet')) lawn = Math.max(lawn, k);
  }
  return [wood, open, rock, lawn];
}

// ---------- the ground: leaf litter and moss and sun in flecks under the trees, August grass
// gone gold in patches out in the open, granite on the top, lawns in the town ----------
function yahTerrainMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Color(P.moon) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunK: { value: 1 },
      uSky: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHemiK: { value: 1.5 },
      uFill: { value: new THREE.Color() }, uFillDir: { value: new THREE.Vector3(0, 1, 0) }, uFillK: { value: 0.3 },
      uGrass: { value: new THREE.Color(P.ground) }, uDirt: { value: new THREE.Color(P.dirt ?? 0x8a6a4a) },
      uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() },
      uTime: { value: 0 }, uDapple: { value: 0 }, uDry: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute vec4 aZone; varying vec4 vZ; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vN = normal; vZ = aZone; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSky, uBounce, uFill, uFillDir, uGrass, uDirt, uFog, uCam;
      uniform float uSunK, uHemiK, uFillK, uFogDensity, uTime, uDapple, uDry;
      varying vec4 vZ; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ return n2(p) * 0.55 + n2(p * 2.07 + 3.1) * 0.3 + n2(p * 4.31 + 7.7) * 0.15; }
      void main(){
        float ax = abs(vUv.x);
        vec3 N = vN / max(length(vN), 1e-4);
        float d = length(uCam - vW);
        float near = 1.0 - smoothstep(50.0, 180.0, d);
        vec2 wp = vW.xz;
        float pat = fbm(wp * 0.04);
        // August grass, green going to straw in patches
        vec3 meadow = mix(uGrass, uGrass * vec3(1.6, 1.3, 0.55), smoothstep(0.42, 0.78, pat) * uDry);
        meadow *= 0.86 + 0.28 * mix(0.5, n2(wp * 0.55), near);
        // a sprinkle of flowers in it: round heads close up. Where a flower would be smaller than a
        // few pixels (further off, and sooner on a phone) the heads give way to a faint even tint
        // of their colour: dots below a pixel only sparkle and smear into dashes as you move
        vec2 fw = wp * 1.2;
        float px = max(length(dFdx(fw)), length(dFdy(fw)));          // flower cells per pixel
        float sharp = 1.0 - smoothstep(0.16, 0.34, px);
        vec2 fc = floor(fw);
        vec2 fo = fract(fw) - 0.5 - (vec2(h2(fc + 3.1), h2(fc + 5.7)) - 0.5) * 0.3;
        float fr = mix(0.2, 0.3, smoothstep(6.0, 30.0, d));
        float fe = max(0.04, px);
        float fl = step(0.9, h2(fc)) * (1.0 - smoothstep(fr - fe, fr + fe, length(fo))) * sharp * near * vZ.y * smoothstep(0.3, 0.6, pat);
        meadow = mix(meadow, mix(vec3(0.95, 0.62, 0.05), vec3(0.9, 0.9, 0.85), step(0.55, h2(fc + 7.0))), fl * 0.7);
        meadow = mix(meadow, vec3(0.95, 0.78, 0.4), 0.05 * (1.0 - sharp) * near * vZ.y * smoothstep(0.3, 0.6, pat));
        // the woods' floor: last year's leaves, moss, needles
        float lm = fbm(wp * 0.11);
        vec3 litter = mix(vec3(0.17, 0.115, 0.06), uGrass * vec3(0.62, 0.7, 0.45), smoothstep(0.42, 0.7, lm));
        litter *= 0.8 + 0.4 * mix(0.5, n2(wp * 1.6), near);
        float wood = vZ.x * smoothstep(6.5, 11.0, ax);
        vec3 alb = mix(meadow, litter, wood);
        // granite: where it's steep, and out on the top in ledges
        float rk = smoothstep(0.32, 0.55, 1.0 - N.y) + vZ.z * smoothstep(0.48, 0.62, fbm(wp * 0.035 + 3.0));
        vec3 gr = vec3(0.4, 0.39, 0.37) * (0.75 + 0.4 * fbm(wp * 0.25));
        gr = mix(gr, vec3(0.56, 0.58, 0.48), step(0.68, n2(wp * 0.8)) * 0.45 * near);
        alb = mix(alb, gr, clamp(rk, 0.0, 1.0));
        // blueberry going red here and there on the top
        alb = mix(alb, vec3(0.32, 0.12, 0.08), vZ.z * step(0.82, n2(wp * 0.3 + 9.0)) * 0.5 * (1.0 - clamp(rk, 0.0, 1.0)));
        // lawns in the town, mown in stripes
        alb = mix(alb, uGrass * vec3(0.85, 1.0, 0.8) * (0.92 + 0.12 * step(0.5, fract(vUv.y / 3.2))), vZ.w * smoothstep(9.5, 11.5, ax) * (1.0 - smoothstep(70.0, 100.0, ax)));
        // the light: under the trees the sun comes through in flecks, and the shade is deep
        vec2 lp = wp * 0.11 + vec2(uTime * 0.05, 0.0);
        float leaf = smoothstep(0.42, 0.62, sin(lp.x * 2.3 + sin(lp.y * 1.7)) * 0.5 + 0.5 * sin(lp.y * 2.9 + sin(lp.x * 1.3)));
        float sun = mix(1.0, 0.12 + 1.1 * leaf, wood * uDapple);
        float ndl = max(dot(N, normalize(uSunDir)), 0.0);
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK * (1.0 - 0.3 * wood);
        vec3 col = alb * (amb + uSun * uSunK * ndl * sun + uFill * uFillK * max(dot(N, normalize(uFillDir)), 0.0)) * 0.3183;
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

class YahTerrain extends Terrain {
  constructor(scene, course, P, plan) {
    super(scene, course, P, plan);
    this.mat.dispose();
    this.mat = yahTerrainMaterial(P); this.mesh.material = this.mat;
    // the shared grid's triangles face down (it's culled seen from above); wind ours facing up
    const idx = [];
    for (let i = 0; i < this.N - 1; i++) for (let j = 0; j < this.M - 1; j++) { const a = i * this.M + j, b = a + 1, c = a + this.M, d = c + 1; idx.push(a, b, c, b, d, c); }
    this.geo.setIndex(idx);
    this.zone = new Float32Array(this.N * this.M * 4);
    this.geo.setAttribute('aZone', new THREE.BufferAttribute(this.zone, 4).setUsage(THREE.DynamicDrawUsage));
    // the zones by song time, each side, worked out once
    const n = Math.ceil((course.t1 - course.t0) / YD) + 3;
    this.zt = [new Float32Array(n * 4), new Float32Array(n * 4)];
    for (let i = 0; i < n; i++) { const t = course.t0 + i * YD; this.zt[0].set(zoneAt(plan || {}, t, -1), i * 4); this.zt[1].set(zoneAt(plan || {}, t, 1), i * 4); }
    this._c = new THREE.Vector3();
  }
  zoneAt(t, side) { const i = clamp(Math.round((t - this.course.t0) / YD), 0, this.zt[0].length / 4 - 1) * 4, z = this.zt[side > 0 ? 1 : 0]; return [z[i], z[i + 1], z[i + 2], z[i + 3]]; }
  // the ground's heights on a row never change: worked out once per row as it comes into view
  rowHeights(k) {
    let h = this.hc.get(k);
    if (!h) { h = new Float32Array(this.M); const t = k * YD; for (let j = 0; j < this.M; j++) h[j] = yahGround(this.course, t, this.cols[j]); this.hc.set(k, h); }
    return h;
  }
  update(track, rider, P, cam, time, fogD) {
    const N = this.N, M = this.M, c = this.course, cols = this.cols, pos = this.pos, Z = this.zone;
    const k0 = Math.floor((rider.t - 4) / YD), t0 = k0 * YD;
    if (!this.hc) this.hc = new Map();
    for (const k of this.hc.keys()) if (k < k0 - 2) this.hc.delete(k);
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = t0 + i * YD, hs = this.rowHeights(k0 + i);
      // one point on the line and the way across it; the columns are along that
      track.ground(t, 0, this._c);
      const yaw = c.sample(t).yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const zi = clamp(Math.round((t - c.t0) / YD), 0, this.zt[0].length / 4 - 1) * 4;
      for (let j = 0; j < M; j++) {
        const x = cols[j], o = i * M + j;
        pos[o * 3] = this._c.x + rx * x; pos[o * 3 + 1] = hs[j]; pos[o * 3 + 2] = this._c.z + rz * x;
        this.uvs[o * 2] = x;
        const zt = this.zt[x > 0 ? 1 : 0];
        Z[o * 4] = zt[zi]; Z[o * 4 + 1] = zt[zi + 1]; Z[o * 4 + 2] = zt[zi + 2]; Z[o * 4 + 3] = zt[zi + 3];
      }
      cum[i] = i ? cum[i - 1] + Math.hypot(this._c.x - lx, this._c.z - lz) : 0;
      lx = this._c.x; lz = this._c.z;
    }
    const base = rider.stats.dist - alongAt(cum, (rider.t - t0) / YD);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.uvs[(i * M + j) * 2 + 1] = cum[i] + base;
    const a = this._a, b = this._b;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(M - 1, j + 1);
      a.set(pos[(i1 * M + j) * 3] - pos[(i0 * M + j) * 3], pos[(i1 * M + j) * 3 + 1] - pos[(i0 * M + j) * 3 + 1], pos[(i1 * M + j) * 3 + 2] - pos[(i0 * M + j) * 3 + 2]);
      b.set(pos[(i * M + j1) * 3] - pos[(i * M + j0) * 3], pos[(i * M + j1) * 3 + 1] - pos[(i * M + j0) * 3 + 1], pos[(i * M + j1) * 3 + 2] - pos[(i * M + j0) * 3 + 2]);
      a.cross(b).normalize(); if (a.y < 0) a.negate();
      const o = (i * M + j) * 3; this.nor[o] = a.x; this.nor[o + 1] = a.y; this.nor[o + 2] = a.z;
    }
    const g = this.geo.attributes; g.position.needsUpdate = true; g.normal.needsUpdate = true; g.uv.needsUpdate = true; g.aZone.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(...P.moonDir).normalize();
    u.uSunK.value = P.sunK ?? 1; u.uHemiK.value = P.hemiK ?? 1.5;
    u.uSky.value.set(P.skyLight ?? 0x8090a0); u.uBounce.value.set(P.bounce ?? 0x404030);
    u.uFill.value.set(P.skyGlow ?? 0xffffff); if (P.glowDir) u.uFillDir.value.set(...P.glowDir).normalize(); u.uFillK.value = P.fillK ?? 0.7;
    u.uGrass.value.set(P.ground); if (P.dirt !== undefined) u.uDirt.value.set(P.dirt);
    u.uFog.value.set(P.fog); u.uFogDensity.value = fogD; u.uCam.value.copy(cam);
    u.uTime.value = time; u.uDapple.value = P.dapple ?? 0;
  }
}

// ---------- the lights of the woods ----------
// sun coming down through the canopy in shafts, brighter all through a chorus, on every beat
const SHAFT_VS = /* glsl */`
  attribute float aK; uniform vec3 uL; varying vec2 vUv; varying float vK; varying vec3 vP;
  void main(){
    vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float w = length(instanceMatrix[0].xyz), len = length(instanceMatrix[1].xyz);
    vec3 ax = normalize(uL);
    vec3 tc = cameraPosition - base; tc = tc / max(length(tc), 1e-3);
    vec3 sd = cross(ax, tc); sd = sd / max(length(sd), 1e-3);
    vec3 p = base + ax * position.y * len + sd * position.x * w * (0.5 + 0.5 * position.y);
    vUv = vec2(position.x + 0.5, position.y); vK = aK; vP = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`;
const SHAFT_FS = /* glsl */`
  uniform vec3 uCol, uL; varying vec2 vUv; varying float vK; varying vec3 vP;
  void main(){
    float across = clamp(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0, 1.0);
    float a = across * across * smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y)) * max(vK, 0.0);
    vec3 d = vP - cameraPosition; float dist = length(d);
    a *= smoothstep(14.0, 40.0, dist) * (1.0 - smoothstep(260.0, 420.0, dist));
    // light in the air is seen looking toward the sun, hardly at all with it behind you, and not
    // from up over the trees looking down on it
    a *= 0.15 + 0.85 * smoothstep(-0.1, 0.75, dot(d / max(dist, 1e-3), normalize(uL)));
    a *= smoothstep(-0.5, -0.18, d.y / max(dist, 1e-3));
    gl_FragColor = vec4(uCol * clamp(a, 0.0, 1.0), 1.0);
  }`;
class YahShafts {
  constructor(scene) {
    const g = new THREE.PlaneGeometry(1, 1, 1, 8); g.translate(0, 0.5, 0);
    this.N = 34;
    this.aK = new THREE.InstancedBufferAttribute(new Float32Array(this.N), 1); this.aK.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aK', this.aK);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uL: { value: new THREE.Vector3(0, 1, 0) }, uCol: { value: new THREE.Color() } }, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.N); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }
  update(S, terrain, k, beat, spots) {
    const r = S.rider, c = S.course, P = S.P, L = P.moonDir || [0, 1, 0];
    const sunUp = clamp(L[1] * 4, 0, 1) * clamp((P.sunK ?? 0) / 2, 0, 1);
    const up = sunUp * (P.dapple ?? 0);
    let n = 0;
    this.mat.uniforms.uL.value.set(L[0], L[1], L[2]).normalize();
    this.mat.uniforms.uCol.value.set(P.moon);
    // the sun finds the things on the way: a shaft on each, a little before you get there
    if (sunUp > 0.05) for (const a of spots || []) {
      if (a.t < r.t - 0.3 || a.t > r.t + 9 || n >= this.N) continue;
      this._p.copy(S.track.ground(a.t, a.x, this._p)); this._p.y = yahGround(c, a.t, a.x);
      const kk = sunUp * (a.beamK ?? 0.42) * Math.min(1, (r.t + 9 - a.t) / 2.5) * (1 + 0.6 * beat);
      this._m.compose(this._p, this._q.identity(), this._s.set(5 + 2.2 * (a.s ?? 1), 60, 1));
      this.mesh.setMatrixAt(n, this._m); this.aK.array[n] = kk; n++;
    }
    if (up > 0.01) {
      const step = 0.42, from = Math.ceil((r.t - 1) / step) * step;
      for (let ts = from; ts < r.t + 13 && n < this.N; ts += step) {
        const i = Math.round(ts / step), side = i % 2 ? 1 : -1;
        const h = Math.sin(i * 12.9898) * 43758.5453, f = h - Math.floor(h);
        const w0 = terrain.zoneAt(ts, side)[0];
        if (w0 < 0.2) continue;
        const x = side * (8 + f * 26);
        S.track.ground(ts, x, this._p); this._p.y = yahGround(c, ts, x);
        const kk = w0 * up * (0.07 + 0.4 * k + 0.3 * beat) * (0.5 + 0.7 * ((f * 7.3) % 1)) * Math.min(1, (r.t + 13 - ts) / 3);
        if (kk < 0.005) continue;
        this._m.compose(this._p, this._q.identity(), this._s.set(6 + f * 8, 46, 1));
        this.mesh.setMatrixAt(n, this._m); this.aK.array[n] = kk; n++;
      }
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; this.aK.needsUpdate = true;
  }
}

// birds: a flock bursts up out of the trees when a chorus lands; swifts wheel over the top
const BIRD_VS = /* glsl */`
  attribute float aWing; attribute float aPh; uniform float uTime; uniform vec3 uCam; uniform float uFogDensity; varying float vFog;
  void main(){
    vec3 p = position;
    p.y += sin(uTime * 14.0 + aPh * 6.28) * aWing * 0.55;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    float d = length(uCam - w.xyz); vFog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const BIRD_FS = /* glsl */`uniform vec3 uCol, uFog; varying float vFog; void main(){ gl_FragColor = vec4(mix(uCol, uFog, clamp(vFog, 0.0, 1.0)), 1.0); }`;
class YahBirds {
  constructor(scene) {
    const p = [0, 0, 0.5, -0.12, 0, -0.35, 0.12, 0, -0.35,  0, 0.02, 0.15, -0.9, 0.05, -0.1, 0, 0.02, -0.25,  0, 0.02, 0.15, 0, 0.02, -0.25, 0.9, 0.05, -0.1];
    const wing = [0, 0, 0, 0, 1, 0, 0, 0, 1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
    this.N = 140;
    this.aPh = new THREE.InstancedBufferAttribute(new Float32Array(this.N), 1); g.setAttribute('aPh', this.aPh);
    for (let i = 0; i < this.N; i++) this.aPh.array[i] = Math.random();
    this.mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(0x14120e) }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uFogDensity: { value: 0.001 } }, vertexShader: BIRD_VS, fragmentShader: BIRD_FS, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.N); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.flocks = [];
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._s = new THREE.Vector3(1, 1, 1);
    this._f = new THREE.Vector3(); this._g = new THREE.Vector3();
  }
  // a flock up out of the trees ahead at song time t, n birds
  burst(S, t, n, opts = {}) {
    const R = yahRng(Math.floor(t * 100) + 7), c = S.course;
    const at = t + (opts.ahead ?? 2.4), side = opts.side ?? (R() < 0.5 ? -1 : 1);
    const o = S.track.ground(at, side * (opts.x ?? 18), new THREE.Vector3()); o.y = Math.max(yahGround(c, at, side * (opts.x ?? 18)) + 6, c.sample(at).y + 1);
    const f = S.track.dirAt(at, new THREE.Vector3()); f.y = 0; f.normalize();
    // the trail's right, so a bird going -side crosses over it
    const right = new THREE.Vector3(-f.z, 0, f.x);
    const birds = [];
    for (let i = 0; i < n; i++) birds.push({ o: new THREE.Vector3((R() - 0.5) * 8, R() * 4, (R() - 0.5) * 12), v: new THREE.Vector3(-side * (5 + R() * 9), 4 + R() * 6, 3 + R() * 8), w: R() * 6.28, s: (opts.s ?? 2.1) * (0.75 + R() * 0.5) });
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(f.x, f.z), 0));
    this.flocks.push({ t0: t, o, f, right, birds, hq, life: opts.life ?? 9, wheel: opts.wheel });
  }
  update(S, songT, time, fogD, camPos) {
    const u = this.mat.uniforms; u.uTime.value = time; u.uFog.value.set(S.P.fog); u.uCam.value.copy(camPos); u.uFogDensity.value = fogD;
    // dark against the day, darker still at dusk
    u.uCol.value.setRGB(0.06, 0.055, 0.05);
    let n = 0;
    this.flocks = this.flocks.filter((F) => songT - F.t0 < F.life && songT > F.t0 - 1);
    for (const F of this.flocks) {
      const tau = Math.max(0, songT - F.t0);
      for (const b of F.birds) {
        if (n >= this.N) break;
        let x, y, z;
        if (F.wheel) {
          // swifts: round and round over the place, rising and falling
          const a = b.w + tau * (0.5 + b.s * 0.4), r = 14 + b.o.x * 2.2;
          x = Math.cos(a) * r; y = 6 + b.o.y * 3 + Math.sin(tau * 0.7 + b.w) * 3; z = Math.sin(a) * r + b.o.z;
          this._e.set(0, -a, 0.5);
        } else {
          x = b.o.x + b.v.x * tau + Math.sin(tau * 1.3 + b.w) * 1.5; y = b.o.y + b.v.y * tau - 0.25 * tau * tau; z = b.o.z + b.v.z * tau;
          this._e.set(-0.3, Math.atan2(-b.v.x, b.v.z), 0);
        }
        this._p.copy(F.o).addScaledVector(F.right, x).addScaledVector(F.f, z); this._p.y += y;
        const fade = Math.min(1, tau * 3 + 0.2) * Math.min(1, (F.life - tau) / 1.5);
        // its own turn, inside the flock's heading
        this._q.setFromEuler(this._e).premultiply(F.hq);
        this._m.compose(this._p, this._q, this._s.setScalar(b.s * fade * 0.9));
        this.mesh.setMatrixAt(n++, this._m);
      }
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// water: the brook down in the gorge, the fall into it, the spring's trickle. Flowing bands, sun glints
const WATER_VS = /* glsl */`
  attribute float aFall; varying vec2 vUv; varying vec3 vW; varying float vFall;
  void main(){ vUv = uv; vFall = aFall; vec4 w = modelMatrix * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #endif
    vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FS = /* glsl */`
  uniform float uTime, uFogDensity; uniform vec3 uSky, uSun, uSunDir, uFog, uCam, uDeep;
  varying vec2 vUv; varying vec3 vW; varying float vFall;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec3 V = normalize(uCam - vW);
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    vec3 col;
    if (vFall > 0.5) {
      // falling: white water streaking down
      float s = n2(vec2(vUv.x * 14.0, vUv.y * 3.0 + uTime * 6.0)) * 0.6 + n2(vec2(vUv.x * 31.0, vUv.y * 7.0 + uTime * 9.0)) * 0.4;
      col = mix(uDeep * 1.6, vec3(0.92, 0.95, 0.97), smoothstep(0.3, 0.75, s)) * (0.6 + 0.6 * uSun.r);
    } else {
      float flow = n2(vec2(vW.x * 0.35 + uTime * 0.8, vW.z * 0.35)) * 0.6 + n2(vec2(vW.x * 1.1 - uTime * 0.5, vW.z * 1.1 + uTime * 1.2)) * 0.4;
      col = mix(uDeep, uSky * 0.6, fres * 0.7 + 0.15) * (0.75 + 0.5 * flow);
      vec3 H = normalize(V + normalize(uSunDir));
      col += uSun * pow(max(H.y, 0.0), 300.0) * 4.0 * step(0.6, flow);
      col += vec3(0.8) * smoothstep(0.78, 0.92, flow) * 0.35;
    }
    float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;
function waterMaterial() {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uFogDensity: { value: 0.0013 }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Color(0x0e2a2a) } }, vertexShader: WATER_VS, fragmentShader: WATER_FS, side: THREE.DoubleSide });
}
class YahGorge {
  constructor(scene, cut, mat) {
    this.cut = cut; this.NX = 40;
    const NX = this.NX, g = new THREE.BufferGeometry();
    // the brook: a strip across the bottom; the fall: a curtain down the far wall
    this.pos = new Float32Array((NX * 2 + 2 * 6) * 3);
    const uv = new Float32Array((NX * 2 + 2 * 6) * 2), fall = new Float32Array(NX * 2 + 2 * 6), idx = [];
    for (let i = 0; i < NX; i++) { uv.set([i / (NX - 1), 0, i / (NX - 1), 1], i * 4); if (i) idx.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1); }
    const f0 = NX * 2;
    for (let k = 0; k < 6; k++) { uv.set([0, k / 5, 1, k / 5], (f0 + k * 2) * 2); fall[f0 + k * 2] = 1; fall[f0 + k * 2 + 1] = 1; if (k) idx.push(f0 + (k - 1) * 2, f0 + k * 2, f0 + (k - 1) * 2 + 1, f0 + (k - 1) * 2 + 1, f0 + k * 2, f0 + k * 2 + 1); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aFall', new THREE.BufferAttribute(fall, 1));
    this.geo = g;
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(S) {
    const c = S.course, r = S.rider, cut = this.cut, tm = (cut.from + cut.to) / 2;
    const on = r.t > cut.from - 40 && r.t < cut.to + 6;
    this.mesh.visible = on;
    if (!on) return;
    const NX = this.NX, P = this.pos;
    for (let i = 0; i < NX; i++) {
      const x = -190 + (380 * i) / (NX - 1);
      const wy = yahGround(c, tm, x) + 0.35;
      for (let e = 0; e < 2; e++) {
        S.track.ground(tm + (e ? 0.1 : -0.1), x, this._p);
        const o = (i * 2 + e) * 3; P[o] = this._p.x; P[o + 1] = wy; P[o + 2] = this._p.z;
      }
    }
    // the fall comes down the far wall, off to the right
    const xf = cut.fallX ?? 30, top = yahGround(c, cut.to + cut.edge + 0.1, xf), bot = yahGround(c, tm, xf) + 0.4;
    for (let k = 0; k < 6; k++) {
      const f = k / 5, t = cut.to + cut.edge * (1 - f) * 0.9 + 0.02;
      for (let e = 0; e < 2; e++) { S.track.ground(t, xf + (e ? 4 : -4), this._p); const o = (NX * 2 + k * 2 + e) * 3; P[o] = this._p.x; P[o + 1] = top + (bot - top) * f; P[o + 2] = this._p.z; }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ---------- the song's layers, parts and kits ----------
const natM = (M) => M.yahNat || (M.yahNat = natureMaterial(false));
const natM2 = (M) => M.yahNat2 || (M.yahNat2 = natureMaterial(true));
const waterM = (M) => M.yahWaterM || (M.yahWaterM = waterMaterial());
const mapM = (M) => M.yahMapM || (M.yahMapM = YS.pictureMaterial(YS.mapTexture()));
const YAH_TREES = ['yahOak0', 'yahOak1', 'yahOak2', 'yahOak3', 'yahBirch0', 'yahBirch1', 'yahPine0', 'yahPine1', 'yahSpruce0', 'yahSpruce1'];
const YAH_FLOOR = ['yahShrub0', 'yahShrub1', 'yahBerry', 'yahFern0', 'yahFern1', 'yahFern2', 'yahFlower0', 'yahFlower1', 'yahFlower2', 'yahFlower3', 'yahGrass0', 'yahGrass1', 'yahRock0', 'yahRock1', 'yahRock2', 'yahMoss0', 'yahMoss1', 'yahLedge0', 'yahLedge1', 'yahWall0', 'yahWall1', 'yahLog0', 'yahLog1', 'yahCairn0', 'yahCairn1', 'yahHydra0', 'yahHydra1'];
const YAH_SETS = ['yahKiosk', 'yahKioskFace', 'yahFinger', 'yahFingerUp', 'yahFingerOut', 'yahHammock', 'yahChurch', 'yahCircle', 'yahBridge', 'yahBluff', 'yahBench', 'yahCabin', 'yahTheRock', 'yahSpring', 'yahSpringWater', 'yahTower', 'yahRegister', 'yahBlaze', 'yahPrivate', 'yahHouse0', 'yahHouse1', 'yahWin0', 'yahWin1', 'yahPicket', 'yahLamp', 'yahMailbox'];
const touch = (S, list) => { for (const k of list) void S.layers[k]; };
// the scenery's first pass calls each part once: build every layer of the song's then, not mid-ride
const touchAll = (S) => { if (S._yahAll) return; S._yahAll = true; touch(S, YAH_TREES); touch(S, YAH_TREES.map((k) => k + 'Lo')); touch(S, YAH_FLOOR); touch(S, YAH_SETS); touch(S, ['yahSign', 'yahSignFace']); };
const BIGT = 900, NEART = 200;

extend({
  layers: {
    yahOak0: (M) => [broadleaf(0, false), natM(M), NEART, TT], yahOak0Lo: (M) => [broadleaf(0, true), natM(M), BIGT, TT],
    yahOak1: (M) => [broadleaf(1, false), natM(M), NEART, TT], yahOak1Lo: (M) => [broadleaf(1, true), natM(M), BIGT, TT],
    yahOak2: (M) => [broadleaf(2, false), natM(M), NEART, TT], yahOak2Lo: (M) => [broadleaf(2, true), natM(M), BIGT, TT],
    yahOak3: (M) => [broadleaf(3, false), natM(M), NEART, TT], yahOak3Lo: (M) => [broadleaf(3, true), natM(M), BIGT, TT],
    yahBirch0: (M) => [birch(0, false), natM(M), NEART, TT], yahBirch0Lo: (M) => [birch(0, true), natM(M), BIGT, TT],
    yahBirch1: (M) => [birch(1, false), natM(M), NEART, TT], yahBirch1Lo: (M) => [birch(1, true), natM(M), BIGT, TT],
    yahPine0: (M) => [pine(0, false), natM(M), NEART, TT], yahPine0Lo: (M) => [pine(0, true), natM(M), BIGT, TT],
    yahPine1: (M) => [pine(1, false), natM(M), NEART, TT], yahPine1Lo: (M) => [pine(1, true), natM(M), BIGT, TT],
    yahSpruce0: (M) => [spruce(0, false), natM(M), NEART, TT], yahSpruce0Lo: (M) => [spruce(0, true), natM(M), BIGT, TT],
    yahSpruce1: (M) => [spruce(1, false), natM(M), NEART, TT], yahSpruce1Lo: (M) => [spruce(1, true), natM(M), BIGT, TT],
    yahShrub0: (M) => [shrub(0, false), natM(M), 300, TT], yahShrub1: (M) => [shrub(1, false), natM(M), 300, TT], yahBerry: (M) => [shrub(0, true), natM(M), 200, TT],
    yahFern0: (M) => [fernPatch(0), natM2(M), 300, TT], yahFern1: (M) => [fernPatch(1), natM2(M), 300, TT], yahFern2: (M) => [fernPatch(2), natM2(M), 300, TT],
    yahFlower0: (M) => [flowerPatch(0), natM2(M), 240, TT], yahFlower1: (M) => [flowerPatch(1), natM2(M), 240, TT],
    yahFlower2: (M) => [flowerPatch(2), natM2(M), 240, TT], yahFlower3: (M) => [flowerPatch(3), natM2(M), 240, TT],
    yahGrass0: (M) => [grassPatch(0), natM2(M), 400, TT], yahGrass1: (M) => [grassPatch(1), natM2(M), 400, TT],
    yahRock0: (M) => [boulder(0, false), natM(M), 300, TT], yahRock1: (M) => [boulder(1, false), natM(M), 300, TT], yahRock2: (M) => [boulder(2, false), natM(M), 300, TT],
    yahMoss0: (M) => [boulder(0, true), natM(M), 300, TT], yahMoss1: (M) => [boulder(1, true), natM(M), 300, TT],
    yahLedge0: (M) => [ledge(0), natM(M), 120, TT], yahLedge1: (M) => [ledge(1), natM(M), 120, TT],
    yahWall0: (M) => [stoneWall(0), natM(M), 200, TT], yahWall1: (M) => [stoneWall(1), natM(M), 200, TT],
    yahLog0: (M) => [log(0), natM(M), 80, TT], yahLog1: (M) => [log(1), natM(M), 80, TT],
    yahCairn0: (M) => [YS.cairn(0), natM(M), 60, TT], yahCairn1: (M) => [YS.cairn(1), natM(M), 60, TT],
    yahHydra0: (M) => [YS.hydrangea(false), natM(M), 80, TT], yahHydra1: (M) => [YS.hydrangea(true), natM(M), 80, TT],
    yahKiosk: (M) => [YS.kiosk(), natM(M), 3, TT], yahKioskFace: (M) => [YS.kioskFace(), mapM(M), 3, {}],
    yahSign: (M) => [YS.trailSign(), natM(M), 30, TT], yahSignFace: (M) => [YS.trailSignFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
    yahFinger: (M) => [YS.fingerpost(), natM(M), 3, TT],
    yahFingerUp: (M) => [mergeGeometries(YS.fingerFaces().slice(0, 2), false), M.sign, 3, { aIdx: 1, aWake: 2 }],
    yahFingerOut: (M) => [mergeGeometries(YS.fingerFaces().slice(2, 4), false), M.sign, 3, { aIdx: 1, aWake: 2 }],
    yahHammock: (M) => [YS.hammock(), natM2(M), 3, TT],
    yahChurch: (M) => [YS.church(), natM2(M), 3, TT],
    yahCircle: (M) => [YS.stoneCircle(), natM(M), 3, TT],
    yahBridge: (M) => [YS.brokenBridge(46, 14, [-1]), natM(M), 3, TT],
    yahBluff: (M) => [YS.bluffTrunk(), natM(M), 3, TT],
    yahBench: (M) => [YS.bench(), natM(M), 6, TT],
    yahCabin: (M) => [YS.cabin(), natM(M), 3, TT],
    yahTheRock: (M) => [YS.theRock(), natM(M), 3, TT],
    yahSpring: (M) => [YS.spring(), natM(M), 3, TT], yahSpringWater: (M) => [YS.springWater(), waterM(M), 3, {}],
    yahTower: (M) => [YS.fireTower(), natM(M), 3, TT],
    yahRegister: (M) => [YS.register(), natM(M), 4, TT],
    yahBlaze: (M) => [YS.blaze(), natM(M), 160, TT],
    yahPrivate: (M) => [(() => { const g = new THREE.PlaneGeometry(1.5, 0.47); g.translate(0, 0, 0.02); return g; })(), M.sign, 40, { aIdx: 1, aWake: 2 }],
    yahHouse0: (M) => [YS.house(0, 0xf2efe6), natM(M), 40, TT], yahHouse1: (M) => [YS.house(1, 0xf2efe6), natM(M), 40, TT],
    yahWin0: (M) => [YS.houseWindows(0), natM(M), 40, TT], yahWin1: (M) => [YS.houseWindows(1), natM(M), 40, TT],
    yahPicket: (M) => [YS.picket(), natM(M), 160, TT],
    yahLamp: (M) => [YS.lampPost(), natM(M), 80, TT],
    yahMailbox: (M) => [YS.mailbox(), natM(M), 40, TT],
  },
  parts: {
    // a tree: the near version within seventy metres of the camera, the far one beyond
    yahTree(S, it, p, q) {
      if (S.tNow === undefined) touchAll(S);
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s));
      const c = S.yahCam;
      const near = c && (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 4900;
      S.layers[near ? it.sp : it.sp + 'Lo'].add(m, { aTint: it.tint });
    },
    // the floor of things: ferns, flowers, grass, rocks, walls, logs, cairns, bushes
    yahFloor(S, it, p, q) {
      if (S.tNow === undefined) touchAll(S);
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, (it.s ?? 1) * (it.sy ?? 1), (it.s ?? 1) * (it.sz ?? 1)));
      S.layers[it.ly].add(m, { aTint: it.tint || WHITE });
    },
    // a lyric on a trail sign: raised on its posts so it stands over the trail's edge, turned to you coming up
    yahBoard(S, it, p, q) {
      if (S.tNow === undefined) touchAll(S);
      const c = S.course; yahPrep(c, S.plan);
      const s = it.s ?? 1.3;
      // its words stand a few metres over the trail, wherever the ground has fallen away to
      if (it.yb === undefined) { const g = yahGround(c, it.t, it.x), ry = c.sample(it.t).y; it.yb = g + clamp(ry + (it.lift ?? 4.0) - (g + 2.95 * s), 0, 8.5 * s); }
      p.y = it.yb;
      S._e.set(0, c.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); const fq = S._q.setFromEuler(S._e);
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s));
      S.layers.yahSign.add(m, { aTint: WHITE });
      S.layers.yahSignFace.add(m, { aIdx: it.idx, aWake: [0.92, 0] });
    },
    // an arrow painted on a trunk, turned to you coming up the trail
    yahBlaze(S, it, p, q) {
      if (S.tNow === undefined) touchAll(S);
      const c = S.course, yaw = c.sample(it.t).yaw + FACE(it.x);
      S._e.set(0, yaw, it.spin ?? 0); const fq = S._q.setFromEuler(S._e);
      p.x += Math.sin(yaw) * it.r; p.z += Math.cos(yaw) * it.r;
      const m = S._m; m.compose(p, fq, S._s.set(it.s ?? 1, it.s ?? 1, 1));
      if (it.idx !== undefined) S.layers.yahPrivate.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
      else S.layers.yahBlaze.add(m, { aTint: it.tint || WHITE });
    },
    // the set-pieces, each drawn from its kind
    yahSet(S, it, p, q, yaw) {
      if (S.tNow === undefined) touchAll(S);
      const m = S._m, s = it.s ?? 1, L = S.layers, T = S.tNow ?? 0;
      const q2 = S._yq || (S._yq = new THREE.Quaternion());
      const one = (ly, tint) => { m.compose(p, q, S._s.set(s, s, s)); L[ly].add(m, { aTint: tint || WHITE }); };
      // something placed with it: offsets scale with the piece, a tree keeps its own size (abs)
      const at = (ly, ox, oy, oz, sc, tint, ry = 0, abs = false) => { local(p, yaw, ox * s, oy * s, oz * s, S._o); S._e.set(0, yaw + ry, 0); q2.setFromEuler(S._e); const k = abs ? sc : sc * s; m.compose(S._o, q2, S._s.set(k, k, k)); L[ly].add(m, { aTint: tint || WHITE }); };
      switch (it.kind) {
        case 'kiosk': {
          // raised so the map stands over the trail's edge
          one('yahKiosk'); m.compose(p, q, S._s.set(s, s, s)); L.yahKioskFace.add(m);
          break;
        }
        case 'finger': {
          m.compose(p, q, S._s.set(s, s, s));
          L.yahFinger.add(m, { aTint: WHITE });
          L.yahFingerUp.add(m, { aIdx: it.up, aWake: [0.85, 0] });
          L.yahFingerOut.add(m, { aIdx: it.out, aWake: [0.85, 0] });
          break;
        }
        case 'hammock': {
          one('yahHammock');
          at('yahOak2', 0, 0, -2.9 - 0.35, 1.25, [0.95, 1, 0.9], 0.7, true); at('yahOak2', 0, 0, 2.9 + 0.35, 1.15, [1, 1, 0.9], 2.1, true);
          break;
        }
        case 'church': one('yahChurch'); break;
        case 'circle': one('yahCircle'); break;
        case 'bridge': one('yahBridge'); break;
        case 'erratic': {
          m.compose(p, q, S._s.set(4.2 * s, 4.6 * s, 3.6 * s)); L.yahRock1.add(m, { aTint: [1.25, 1.22, 1.15] });
          at('yahBirch1', 0.6, 4.6, 0.2, 1.15, [1, 1, 0.95], 0.4, true);
          break;
        }
        case 'bluff': one('yahBluff'); at('yahOak2', 0, 0, 0, 1.7, [1, 1, 0.92], 0, true); break;
        case 'bench': one('yahBench'); at('yahOak1', 2.4, 0, 0.8, 1.1, [1.02, 1, 0.92], 1.3, true); break;
        case 'cabin': {
          one('yahCabin');
          const lit = clamp(1.2 - (S.P.sunK ?? 1) / 2.5, 0.2, 1);
          local(p, yaw, 0, 1.6 * s, 2.8 * s, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 3.5 * s, [1, 0.72, 0.4], 0.5 * lit);
          local(p, yaw, 0, 0.1, 4.5 * s, S._o); poolAt(S, S._o.x, S._o.y, S._o.z, 7 * s, [1, 0.7, 0.4], 0.35 * lit);
          break;
        }
        case 'rock': one('yahTheRock'); break;
        case 'spring': one('yahSpring'); m.compose(p, q, S._s.set(s, s, s)); L.yahSpringWater.add(m); break;
        case 'tower': {
          one('yahTower');
          // the light on the top, slow, and the cab lit once the sun's going
          const blink = 0.35 + 0.65 * (Math.sin(T * 2.4) > 0.2 ? 1 : 0);
          local(p, yaw, 0, 24.4 * s, 0, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 2.6 * s, [1, 0.12, 0.08], 1.6 * blink);
          local(p, yaw, 0, 20.9 * s, 0, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 9 * s, [1, 0.8, 0.5], 0.35 * clamp(1.4 - (S.P.sunK ?? 1) / 2, 0, 1));
          break;
        }
        case 'register': {
          one('yahRegister');
          local(p, yaw, 0, 1.75 * s, 0, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 1.6 * s, [1, 0.9, 0.7], 0.25 + 0.5 * clamp(1.2 - (S.P.sunK ?? 1), 0, 1));
          break;
        }
        case 'cairn': one(it.big ? 'yahCairn1' : 'yahCairn0'); break;
      }
    },
    // the street at the bottom: a house set back on its lawn, its windows, its porch light
    yahHouse(S, it, p, q, yaw) {
      if (S.tNow === undefined) touchAll(S);
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s));
      S.layers[it.v ? 'yahHouse1' : 'yahHouse0'].add(m, { aTint: it.tint });
      const night = clamp(1.3 - (S.P.sunK ?? 1), 0, 1), on = it.lit * (0.25 + 0.75 * Math.max(night, it.wakeNow ?? 0));
      S.layers[it.v ? 'yahWin1' : 'yahWin0'].add(m, { aTint: [on, on * 0.85, on * 0.62] });
      local(p, yaw, 0, 3.05 * it.s, 6.6 * it.s, S._o); glowAt(S, S._o.x, S._o.y, S._o.z, 1.6, [1, 0.78, 0.45], (0.4 + 1.4 * night) * it.lit);
      local(p, yaw, 0, 0.1, 8.0 * it.s, S._o); poolAt(S, S._o.x, S._o.y, S._o.z, 7, [1, 0.72, 0.42], (0.15 + 0.6 * night) * it.lit);
    },
    // a lamp post by the sidewalk, its lantern and the light on the ground
    yahLampPost(S, it, p, q) {
      if (S.tNow === undefined) touchAll(S);
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.yahLamp.add(m, { aTint: WHITE });
      const night = clamp(1.3 - (S.P.sunK ?? 1), 0, 1);
      glowAt(S, p.x, p.y + 3.95, p.z, 1.8, [1, 0.72, 0.4], 0.2 + 0.65 * night, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, p.y + 0.06, p.z, 11, [1, 0.72, 0.42], 0.12 + 0.5 * night);
    },
  },
  kits: {
    // the woods: trunks lining the trail, more down the slopes, the floor of ferns and rocks and
    // old walls, the arrows on the trunks. z.mix: hardwood | mixed | pines | birch
    yahWoods(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      const dens = z.density ?? 1, arrows = z.arrows ?? 1;
      const mixes = {
        hardwood: [['yahOak0', 3], ['yahOak1', 3], ['yahOak2', 2], ['yahOak3', 2], ['yahBirch0', 1], ['yahBirch1', 1], ['yahPine0', 1]],
        mixed: [['yahOak0', 2], ['yahOak1', 2], ['yahOak2', 2], ['yahBirch0', 1.5], ['yahBirch1', 1], ['yahPine0', 1.5], ['yahPine1', 1], ['yahSpruce0', 1]],
        pines: [['yahPine0', 3], ['yahPine1', 2], ['yahSpruce0', 2], ['yahSpruce1', 1.5], ['yahOak2', 1], ['yahBirch0', 1]],
        birch: [['yahBirch0', 3], ['yahBirch1', 3], ['yahOak2', 2], ['yahOak1', 1], ['yahPine0', 1]],
      };
      const mix = mixes[z.mix || 'hardwood'];
      const tot = mix.reduce((a, b) => a + b[1], 0);
      const pickSp = (narrow) => { for (let k = 0; k < 4; k++) { let r = R() * tot; for (const [sp, w] of mix) { r -= w; if (r <= 0) { if (narrow && (sp === 'yahOak0' || sp === 'yahOak1' || sp === 'yahOak3') && k < 3) break; return sp; } } } return 'yahOak2'; };
      const greens = [[1, 1, 1], [0.92, 1.0, 0.94], [1.06, 1.02, 0.86], [0.96, 1.05, 1.0], [1.1, 1.0, 0.8], [0.88, 0.95, 0.9]];
      const clear = z.clear || [];
      const open = (t, side, x) => !clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side) && Math.abs(x) < (z.clearX ?? 90));
      const cuts = c._yahCuts || [];
      const inCut = (t) => cuts.some((g) => t > g.from - g.edge - 0.25 && t < g.to + g.edge + 0.25);
      const tree = (t, x, sp, ahead, sMul = 1) => { if (!open(t, Math.sign(x), x) || inCut(t) || inPad(c, t, x)) return null; const it = onGround(S, { t, x, rot: R() * 6.28, s: (0.82 + R() * 0.4) * sMul, sy: 0.9 + R() * 0.25, parts: 'yahTree', sp, tint: greens[Math.floor(R() * greens.length)], ahead }); S.items.push(it); return it; };
      for (const side of [-1, 1]) {
        // close in: trunks along the trail, the narrow ones nearest
        for (let t = z.from + R() * 0.2; t < z.to; t += (0.2 + R() * 0.16) / dens) {
          const x = side * (10.5 + R() * 6.5), sp = pickSp(Math.abs(x) < 13);
          const it = tree(t, x, sp, 22);
          if (it && arrows > 0 && R() < 0.11 * arrows && (sp === 'yahOak2' || sp.startsWith('yahPine') || sp.startsWith('yahBirch'))) {
            // a painted arrow on the side of the trunk facing the trail, at the trail's height
            const ry = c.sample(t).y, hh = clamp(ry + 0.5 - it.h, 1.5, 4.8 * it.s);
            S.items.push({ t, x, h: it.h + hh, r: 0.42 * it.s, parts: 'yahBlaze', s: 1.1 + 0.3 * arrows, tint: arrows > 1.5 ? [1, 0.86, 0.3] : [1, 1, 1], spin: z.wild ? (R() - 0.5) * 3 : (R() - 0.5) * 0.25, ahead: 14 });
          }
          if (it && z.priv && R() < 0.22) {
            const ry = c.sample(t).y, hh = clamp(ry + 0.8 - it.h, 1.6, 4.5);
            S.items.push({ t, x, h: it.h + hh, r: 0.45 * it.s, parts: 'yahBlaze', idx: S.atlas.index.PRIVATE, s: 1.15, ahead: 16 });
          }
        }
        // the slope: more trees, thinning out
        for (let t = z.from + R() * 0.3; t < z.to; t += (0.11 + R() * 0.1) / dens) {
          const far = Math.pow(R(), 1.3), x = side * (17 + far * 60);
          tree(t, x, pickSp(false), 26, 0.95 + far * 0.3);
        }
        for (let t = z.from + R() * 0.3; t < z.to; t += (0.3 + R() * 0.3) / dens) tree(t, side * (77 + R() * 130), pickSp(false), 30, 1.2);
        // the floor: ferns, bushes, rocks with moss, a log now and then
        for (let t = z.from + R() * 0.3; t < z.to; t += 0.32 + R() * 0.3) {
          if (inCut(t)) continue;
          const x = side * (7.5 + Math.pow(R(), 1.4) * 26);
          if (!open(t, side, x) && R() < 0.5) continue;
          const r = R();
          const ly = r < 0.5 * (z.ferns ?? 1) ? 'yahFern' + Math.floor(R() * 3) : r < 0.72 ? 'yahShrub' + Math.floor(R() * 2) : r < 0.9 ? 'yahMoss' + Math.floor(R() * 2) : 'yahLog' + Math.floor(R() * 2);
          const big = ly.startsWith('yahMoss') ? 0.6 + R() * 1.2 : 1;
          S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: (0.8 + R() * 0.5) * big, sy: ly.startsWith('yahMoss') ? 0.6 + R() * 0.6 : 1, parts: 'yahFloor', ly, tint: [0.9 + R() * 0.2, 0.9 + R() * 0.2, 0.9 + R() * 0.15], ahead: 12, dy: ly.startsWith('yahMoss') ? -0.3 : 0 }));
        }
        // an old stone wall running through the woods, broken here and there
        if (z.walls) for (let t = z.from + 1 + R() * 2; t < z.to - 1; t += 2.5 + R() * 4) {
          const x0 = side * (13 + R() * 10), runs = 3 + Math.floor(R() * 5);
          for (let k = 0; k < runs; k++) { const tt = t + k * 0.17; if (inCut(tt)) continue; S.items.push(onGround(S, { t: tt, x: x0 + side * k * 0.3, rot: (R() - 0.5) * 0.12, s: 1, parts: 'yahFloor', ly: 'yahWall' + (k % 2), ahead: 16, dy: -0.15 })); }
          t += runs * 0.17;
        }
      }
    },
    // the open ground: the ridge, the meadow, the top. Lone trees, flowers, rocks, ledges, blueberry
    yahOpen(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      const dens = z.density ?? 1;
      const greens = [[1.04, 1, 0.86], [0.96, 1.04, 0.9], [1.12, 1.0, 0.76]];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.5; t < z.to; t += (0.45 + R() * 0.7) / dens) {
          const x = side * (13 + Math.pow(R(), 1.2) * 150);
          if (inPad(c, t, x)) continue;
          const sp = z.rocky ? (R() < 0.6 ? 'yahSpruce' + Math.floor(R() * 2) : 'yahPine' + Math.floor(R() * 2)) : ['yahOak0', 'yahOak1', 'yahOak3', 'yahPine0', 'yahBirch0'][Math.floor(R() * 5)];
          S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: (z.rocky ? 0.55 : 0.9) + R() * 0.5, sy: 0.9 + R() * 0.3, parts: 'yahTree', sp, tint: greens[Math.floor(R() * greens.length)], ahead: 34 }));
        }
        // flowers and tall grass close to the trail
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.16 + R() * 0.14) {
          const x = side * (7 + Math.pow(R(), 1.5) * 30);
          const ly = z.rocky ? (R() < 0.55 ? 'yahBerry' : 'yahGrass' + Math.floor(R() * 2)) : (R() < 0.62 * (z.flowers ?? 1) ? 'yahFlower' + Math.floor(R() * 4) : 'yahGrass' + Math.floor(R() * 2));
          S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: 0.9 + R() * 0.5, parts: 'yahFloor', ly, ahead: 9 }));
        }
        // granite: boulders, and ledges coming up out of the ground on the top
        for (let t = z.from + R(); t < z.to; t += (z.rocky ? 0.35 : 0.9) + R() * 0.8) {
          const x = side * (8 + Math.pow(R(), 1.5) * 45), lg = z.rocky && R() < 0.45;
          S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: lg ? 0.8 + R() * 0.9 : 0.5 + R() * 1.3, sy: lg ? 0.6 + R() * 0.6 : 0.7 + R() * 0.5, parts: 'yahFloor', ly: lg ? 'yahLedge' + Math.floor(R() * 2) : 'yahRock' + Math.floor(R() * 3), ahead: 20, dy: lg ? -1.0 : -0.25 }));
        }
      }
    },
    // the trailhead: a gravel lot, boulders round it, flowers, the woods' edge ahead
    yahLot(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      for (const side of [-1, 1]) {
        for (let t = z.from; t < z.to; t += 0.5 + R() * 0.3) S.items.push(onGround(S, { t, x: side * (9 + R() * 2), rot: R() * 6.28, s: 0.5 + R() * 0.4, sy: 0.7, parts: 'yahFloor', ly: 'yahRock' + Math.floor(R() * 3), dy: -0.2 }));
        for (let t = z.from; t < z.to; t += 0.18 + R() * 0.15) { const x = side * (12 + Math.pow(R(), 1.4) * 40); S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: 0.9 + R() * 0.5, parts: 'yahFloor', ly: R() < 0.6 ? 'yahFlower' + Math.floor(R() * 4) : 'yahGrass' + Math.floor(R() * 2) })); }
        for (let t = z.from + R(); t < z.to; t += 0.9 + R() * 0.9) { const x = side * (30 + R() * 120); S.items.push(onGround(S, { t, x, rot: R() * 6.28, s: 0.9 + R() * 0.4, parts: 'yahTree', sp: ['yahOak0', 'yahOak1', 'yahOak3'][Math.floor(R() * 3)], tint: [1, 1, 0.9], ahead: 40 })); }
      }
    },
    // the things on the way, each on its line: z.at = [{ t, x, kind, s, rot }]
    yahSets(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      for (const a of z.at) {
        if (a.kind === 'gorge') {
          // the gorge's walls: granite faces along the near rim and the far wall, boulders in the brook
          for (let x = -70; x <= 70; x += 7 + R() * 4) {
            if (Math.abs(x) < 7) continue;
            for (const [tt, dy, big] of [[a.from - 0.04, -6, 2.4], [a.from + 0.1, -16, 2.0], [a.to - 0.06, -9, 2.2], [a.to + 0.12, -3, 1.6]]) {
              S.items.push(onGround(S, { t: tt + (R() - 0.5) * 0.08, x: x + (R() - 0.5) * 3, rot: R() * 6.28, s: big * (0.8 + R() * 0.5), sy: 1.4 + R(), parts: 'yahFloor', ly: 'yahLedge' + Math.floor(R() * 2), ahead: 30, dy }));
            }
            if (R() < 0.6) S.items.push(onGround(S, { t: (a.from + a.to) / 2 + (R() - 0.5) * 0.3, x, rot: R() * 6.28, s: 0.6 + R() * 1.2, sy: 0.6, parts: 'yahFloor', ly: 'yahMoss' + Math.floor(R() * 2), ahead: 30, dy: -0.3 }));
          }
          continue;
        }
        const it = onGround(S, { ...a, parts: 'yahSet', rot: a.rot ?? (a.face ? FACE(a.x) : SIDE(a.x)), s: a.s ?? 1, ahead: a.ahead ?? 30 });
        if (a.ty !== undefined) it.h = yahGround(c, a.ty, a.x) + (a.dy ?? 0);
        if (a.kind === 'finger') { it.up = S.atlas.index.YAHTOP; it.out = S.atlas.index.YAHCHI; }
        S.items.push(it);
        // a raised knoll shows its granite on the way up, and keeps a little green
        const pad = a.lift !== undefined && a.kind !== 'lot' && (c._yahPads || []).find((p) => p.t === a.t && p.x === a.x);
        if (pad && pad.raised > 2) {
          const n = 5 + Math.floor(pad.raised / 3);
          for (let k = 0; k < n; k++) {
            const ang = (k / n) * Math.PI * 2 + R() * 0.5, rr = pad.r * (0.62 + R() * 0.22);
            const tt = a.t + Math.cos(ang) * rr / 38, xx = a.x + Math.sin(ang) * rr;
            if (Math.abs(xx) < 8) continue;
            S.items.push(onGround(S, { t: tt, x: xx, rot: R() * 6.28, s: 0.9 + R() * 0.8, sy: 0.7 + R() * 0.6, parts: 'yahFloor', ly: R() < 0.5 ? 'yahLedge' + Math.floor(R() * 2) : 'yahMoss' + Math.floor(R() * 2), ahead: 26, dy: -0.8 }));
          }
        }
      }
    },
    // the cairns that show the way over the ledges to the top
    yahCairns(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.9) { const side = k++ % 2 ? 1 : -1; S.items.push(onGround(S, { t, x: side * (z.x ?? 8.5), rot: R() * 6.28, s: 1 + R() * 0.3, parts: 'yahSet', kind: 'cairn', ahead: 16 })); }
    },
    // the street at the bottom of the hill: old houses on their lawns, picket fences, maples,
    // hydrangeas, lamp posts along the sidewalk
    yahStreet(S, z, R) {
      const c = S.course; yahPrep(c, S.plan);
      const walls = [[1, 1, 1], [0.78, 0.86, 0.96], [0.98, 0.9, 0.72], [0.8, 0.88, 0.78], [0.96, 0.82, 0.78], [0.86, 0.86, 0.9]];
      for (const side of [-1, 1]) {
        for (let t = z.from + (side > 0 ? 0.3 : 0); t < z.to; t += 0.62 + R() * 0.25) {
          const x = side * (21 + R() * 3), skip = (z.skip || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
          if (skip) continue;
          S.items.push(onGround(S, { t, x, rot: SIDE(x), s: 1 + R() * 0.12, v: R() < 0.45 ? 1 : 0, parts: 'yahHouse', tint: walls[Math.floor(R() * walls.length)], lit: R() < 0.8 ? 1 : 0.3, seed: R(), wake0: 0.3, ahead: 30 }));
          S.items.push(onGround(S, { t: t + 0.05, x: side * 12.6, rot: Math.PI / 2, s: 1, parts: 'yahFloor', ly: 'yahPicket', ahead: 20, dy: 0 }));
          if (R() < 0.6) S.items.push(onGround(S, { t: t + 0.12, x: side * 14.5, rot: R() * 6.28, s: 0.9 + R() * 0.3, parts: 'yahFloor', ly: 'yahHydra' + Math.floor(R() * 2), ahead: 16 }));
          if (R() < 0.55) S.items.push(onGround(S, { t: t + 0.3, x: side * (16 + R() * 3), rot: R() * 6.28, s: 1.0 + R() * 0.3, sy: 1, parts: 'yahTree', sp: R() < 0.7 ? 'yahOak1' : 'yahOak0', tint: [0.95, 1, 0.92], ahead: 30 }));
          if (R() < 0.4) S.items.push(onGround(S, { t: t + 0.2, x: side * 11.6, rot: SIDE(side) + Math.PI, s: 1, parts: 'yahFloor', ly: 'yahMailbox', ahead: 14 }));
          if (R() < 0.5) S.items.push(onGround(S, { t: t + R() * 0.3, x: side * (48 + R() * 60), rot: SIDE(side), s: 1 + R() * 0.2, v: R() < 0.5 ? 1 : 0, parts: 'yahHouse', tint: walls[Math.floor(R() * walls.length)], lit: R() < 0.7 ? 1 : 0.2, ahead: 40 }));
        }
        for (let t = z.from; t < z.to; t += 0.55) S.items.push(onGround(S, { t, x: side * (z.lampX ?? 9.6), rot: 0, parts: 'yahLampPost', seed: R() }));
      }
    },
  },
});
const WHITE = [1, 1, 1];

// ---------- the end: home, at the bottom of the street, the hill behind it ----------
// A white colonial with green shutters, its porch light on and every window lit, the maple in
// the yard, hydrangeas, the picket fence and the mailbox; fireflies over the lawn; and up behind
// the house the hill, its tower's light blinking on the top where she was.
export class HomeFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -22;
    yahPrep(course, scenery ? scenery.plan : {});
    // the group's origin is where the end shot looks; the house stands a little right of it, so
    // the end card on the left of the screen leaves it in view beside her
    this.group = new THREE.Group(); scene.add(this.group);
    this.inner = new THREE.Group(); this.group.add(this.inner);
    this.mat = natureMaterial(false); this.mat.userData.ownLit = true;
    this.mat2 = natureMaterial(true); this.mat2.userData.ownLit = true;
    this.win = natureMaterial(false); this.win.userData.ownLit = true;
    const add = (g, m, x, y, z, ry = 0, s = 1) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.scale.setScalar(s); mesh.frustumCulled = false; this.inner.add(mesh); return mesh; };
    // the house, its windows, the porch; facing the street (+z)
    add(YS.house(0, 0xf4f1e8), this.mat, 0, 0, 0, 0, 1.15);
    add(YS.houseWindows(0), this.win, 0, 0, 0, 0, 1.15);
    // the yard: the walk, the fence with its gate open, the mailbox, hydrangeas, the maple
    for (const x of [-9, -3.4, 3.4, 9]) add(YS.picket(), this.mat, x * 1.0, 0, 12.5, 0, 0.95);
    // the lot stands up on its bank over the street: the stone wall, and the steps up it
    add(YS.retainingWall(34, 10), this.mat, 0, 0, 14.6, 0, 1);
    add(YS.mailbox(), this.mat, 2.4, 0, 13.4, Math.PI, 1);
    for (const [x, z, pink] of [[-4.4, 6.6, 0], [4.6, 6.4, 1], [-6.2, 6.9, 1], [6.8, 6.6, 0]]) add(YS.hydrangea(!!pink), this.mat, x, 0, z, x, 1.1);
    add(broadleaf(1, false), this.mat, -15, 0, 2, 0.6, 1.25);
    add(broadleaf(3, false), this.mat, 14, 0, -7, 2.0, 1.1);
    add(birch(0, false), this.mat, 10.5, 0, 9.5, 1.0, 0.9);
    add(YS.lampPost(), this.win, 5.5, 0, 12.2, 0, 1);
    add(fernPatch(1), this.mat2, -3.2, 0, 4.8, 0, 0.8);
    // the hill behind, far off, and its tower
    const hill = new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(260, 95, 140);
    const hg = new THREE.BufferGeometry(); const hp = hill.toNonIndexed().attributes.position;
    const hc = new Float32Array(hp.count * 3), hk = new Float32Array(hp.count), hs = new Float32Array(hp.count);
    for (let i = 0; i < hp.count; i++) { const y = hp.getY(i), v = 0.6 + 0.4 * yahNoise(hp.getX(i) * 0.03, y * 0.03, hp.getZ(i) * 0.03); hc.set([0.05 * v, 0.07 * v, 0.06 * v], i * 3); hk[i] = 1; }
    hg.setAttribute('position', hp); hg.setAttribute('normal', hill.toNonIndexed().attributes.normal); hg.setAttribute('color', new THREE.BufferAttribute(hc, 3)); hg.setAttribute('aKind', new THREE.BufferAttribute(hk, 1)); hg.setAttribute('aSway', new THREE.BufferAttribute(hs, 1));
    this.hillMat = natureMaterial(false); this.hillMat.userData.ownLit = true;
    add(hg, this.hillMat, 60, -6, -420, 0, 1);
    this.tower = add(YS.fireTower(), this.hillMat, 60, 86, -420, 0.4, 1.4);
    // the instanced attribute the shader wants, on these plain meshes: a white tint
    this.group.traverse((o) => { if (o.isMesh && !o.geometry.attributes.aTint) { const n = o.geometry.attributes.position.count; o.geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); } });
    this.lit = 0.35; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.flies = []; const R = yahRng(613);
    for (let i = 0; i < 90; i++) this.flies.push({ x: (R() - 0.5) * 40, y: 0.5 + R() * 3.2, z: -2 + R() * 18, ph: R() * 6.28, sp: 0.3 + R() * 0.5, per: 2 + R() * 3 });
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const c = this.course, S = this.S;
    track.ground(this.t, this.x, this._p);
    const yaw = c.sample(this.t).yaw, shift = this.cfg.shift ?? 9;
    // the shot aims at the group: put that a little left (across the road) of the house
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);
    this.group.position.set(this._p.x - rx * shift, yahGround(c, this.t, this.x), this._p.z - rz * shift);
    // its front to the street, turned three-quarters toward her coming down it
    const turn = this.cfg.turn ?? 0.75;
    const ry = yaw + (this.x < 0 ? -Math.PI / 2 - turn : Math.PI / 2 + turn);
    this.group.rotation.set(0, ry, 0);
    this.inner.position.set(rx * shift, 0, rz * shift).applyAxisAngle(this._up || (this._up = new THREE.Vector3(0, 1, 0)), -ry);
    this.lit += ((this.fired ? 0.75 + 0.25 * this.earned : 0.45) - this.lit) * Math.min(1, dt * 0.7);
    if (!S || this.t - rider.t > 46) { this.group.visible = this.t - rider.t <= 46; return; }
    this.group.visible = true;
    const P = S.P, cam = this.camPos || this._w;
    const fogD = P.fogDensity;
    lightNature([this.mat, this.mat2, this.win, this.hillMat], P, cam, songT, fogD, 0.2, 0);
    this.mat.uniforms.uLit.value = 1.2; this.mat2.uniforms.uLit.value = 1.2; this.hillMat.uniforms.uLit.value = 1.6;
    // every window lit, the better the ride the warmer
    this.win.uniforms.uLit.value = 1.0 + 2.0 * this.lit;
    this.group.updateMatrixWorld(true);
    const M = this.inner.matrixWorld, w = this._w;
    const lamp = [1, 0.78, 0.45];
    w.set(0, 3.5, 6.9).applyMatrix4(M); S.glow(w.x, w.y, w.z, 2.2, lamp, 0.8 + 1.8 * this.lit);
    w.set(0, 0.1, 9.5).applyMatrix4(M); S.pool(w.x, w.y, w.z, 12, lamp, 0.35 + 0.9 * this.lit);
    w.set(5.5, 3.95, 12.2).applyMatrix4(M); S.glow(w.x, w.y, w.z, 2.2, lamp, 0.6 + 1.2 * this.lit);
    w.set(5.5, 0.1, 12.2).applyMatrix4(M); S.pool(w.x, w.y, w.z, 10, lamp, 0.3 + 0.6 * this.lit);
    // the windows' light lying out on the lawn
    for (const x of [-4.1, -1.8, 1.8, 4.1]) { w.set(x * 1.15, 0.1, 7.2).applyMatrix4(M); S.pool(w.x, w.y, w.z, 6.5, lamp, 0.22 + 0.35 * this.lit); }
    // the tower's light on the hill, slow
    const bl = Math.sin(songT * 2.2) > 0.3 ? 1 : 0.2;
    this.tower.updateMatrixWorld(true); w.set(0, 24.4, 0).applyMatrix4(this.tower.matrixWorld); S.glow(w.x, w.y, w.z, 9, [1, 0.12, 0.08], 1.6 * bl);
    // fireflies over the lawn, more of them the better she rode
    const n = Math.round(this.flies.length * (0.45 + 0.55 * this.lit));
    for (let i = 0; i < n; i++) {
      const f = this.flies[i], tt = songT * f.sp + f.ph;
      const on = Math.max(0, Math.sin(songT * 6.28 / f.per + f.ph * 3)) ** 6;
      if (on < 0.05) continue;
      w.set(f.x + Math.sin(tt) * 1.2, f.y + Math.sin(tt * 1.7) * 0.4, f.z + Math.cos(tt * 0.8) * 1.2).applyMatrix4(M);
      S.glow(w.x, w.y, w.z, 0.75, [0.75, 1, 0.35], 2.0 * on);
    }
  }
}

// ---------- the place itself, per frame ----------
export class TrailWorld {
  constructor(scene, S) {
    this.S = S;
    const c = S.course, plan = S.plan || {};
    yahPrep(c, plan);
    this.terrain = new YahTerrain(scene, c, S.P, plan);
    const M = S.town.mats;
    this.mats = [natM(M), natM2(M)];
    this.shafts = new YahShafts(scene);
    this.birds = new YahBirds(scene);
    this.water = waterM(M);
    this.gorges = (c._yahCuts || []).filter((g) => !g.rim).map((g) => new YahGorge(scene, g, this.water));
    this.fired = new Set();
    this.spots = []; this.hits = [];
    for (const z of plan.zones || []) if (z.kits.includes('yahSets')) for (const a of z.at || []) { if (a.beam) this.spots.push(a); else if (a.hit !== undefined) this.hits.push(a); }
    this._v = new THREE.Vector3(); this._f = new THREE.Vector3();
    // the halo: a fan of light breaking through ahead ("he looked exactly like Jesus")
    const hg = new THREE.BufferGeometry(), hp = [], ha = [];
    for (let i = 0; i < 18; i++) { const a0 = (i / 18) * Math.PI * 2, a1 = a0 + 0.07, L0 = 1; hp.push(0, 0, 0, Math.cos(a0) * L0, Math.sin(a0) * L0, 0, Math.cos(a1) * L0, Math.sin(a1) * L0, 0); ha.push(1, 0, 0); }
    hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('aC', new THREE.Float32BufferAttribute(ha, 1));
    this.haloMat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uCol: { value: new THREE.Color(1, 0.86, 0.6) } }, vertexShader: 'attribute float aC; varying float vC; void main(){ vC = aC; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform float uK; uniform vec3 uCol; varying float vC; void main(){ gl_FragColor = vec4(uCol * vC * vC * uK, 1.0); }', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.halo = new THREE.Mesh(hg, this.haloMat); this.halo.frustumCulled = false; this.halo.visible = false; scene.add(this.halo);
  }
  update(S, dt, camera, time) {
    this.sess = S;
    const r = S.rider, c = S.course, P = S.P, t = r.t;
    const LK = S.lift ? S.lift.k : 0, LB = S.lift ? S.lift.beat || 0 : 0;
    const fogD = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * LK);
    S.town.yahCam = camera.position;
    this.terrain.update(S.track, r, P, camera.position, time, fogD);
    // the trees breathe in the heat; on a chorus every beat leans them, on a verse a little
    const sec = c.sectionAt(t), big = sec.kind === 'chorus' || sec.kind === 'final';
    const bpos = c.beatAt(t), bf = bpos - Math.floor(bpos), pulse = Math.exp(-bf * 5);
    const lean = pulse * (big ? 0.12 + 0.22 * LK : 0.04);
    // in a chorus the woods take every beat in gold, as much as the sun's still up
    const sunny = clamp((P.sunK ?? 1) / 2.4, 0.25, 1);
    const glow = big ? (0.12 + 0.55 * pulse) * LK * sunny : 0.05 * pulse * sunny;
    lightNature(this.mats, P, camera.position, time, fogD, 0.12 + 0.12 * LK, lean, glow);
    const wu = this.water.uniforms;
    wu.uTime.value = time; wu.uFog.value.set(P.fog); wu.uFogDensity.value = fogD; wu.uCam.value.copy(camera.position); wu.uSky.value.set(P.horizon); wu.uSun.value.set(P.moon).multiplyScalar(Math.min(1, (P.sunK ?? 1) / 2)); if (P.moonDir) wu.uSunDir.value.set(...P.moonDir).normalize();
    const mm = S.town.mats.yahMapM; if (mm) { const u = mm.uniforms; u.uFog.value.set(P.fog); u.uFogDensity.value = fogD; u.uCam.value.copy(camera.position); u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar(0.25 * (P.hemiK ?? 1.5)).add(new THREE.Color(P.moon).multiplyScalar(0.22 * (P.sunK ?? 1))); }
    for (const g of this.gorges) g.update(S);
    this.shafts.update(S, this.terrain, LK, LB, this.spots);
    // a flock up out of the trees on every chorus, and at the thunder; swifts over the top
    const songT = S.rider.t;
    for (const s of c.sections) {
      if (!(s.kind === 'chorus' || s.kind === 'final') || this.fired.has(s.ta) || t < s.ta || t > s.ta + 0.5) continue;
      this.fired.add(s.ta);
      this.birds.burst(S, s.ta, 30, { side: 1, ahead: 1.9, x: 13 }); this.birds.burst(S, s.ta + 0.15, 24, { side: -1, ahead: 2.5, x: 15 });
      // and the trees let go of a cloud of gold either side
      const gold = new THREE.Color(1, 0.8, 0.42).multiplyScalar(2.4);
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
        const ts = t + 1.0 + k * 0.6, x = side * (11 + k * 3);
        const p = S.track.ground(ts, x, new THREE.Vector3()); p.y = c.sample(ts).y + 3 + k;
        S.sparks.emit(p, new THREE.Vector3(0, 2.5, 0), gold, 46, { spread: 9, life: 1.7, size: 0.24, grav: 1.2, up: 1, drag: 0.9 });
      }
    }
    for (const b of S.plan.birds || []) {
      if (this.fired.has('b' + b.t) || t < b.t || t > b.t + 0.5) continue;
      this.fired.add('b' + b.t);
      this.birds.burst(S, b.t, b.n ?? 24, b);
    }
    // the rock that gets the leg: chips fly off it as she clips it
    for (const a of this.spots.concat(this.hits)) {
      if (a.hit === undefined || this.fired.has('h' + a.t) || t < a.hit || t > a.hit + 0.4) continue;
      this.fired.add('h' + a.t);
      const p = S.track.ground(a.t, a.x - Math.sign(a.x) * 2.2 * (a.s ?? 1), new THREE.Vector3()); p.y = c.sample(a.t).y + 0.6;
      const back = S.track.dirAt(a.t, new THREE.Vector3()).multiplyScalar(-6);
      S.sparks.emit(p, back.add(new THREE.Vector3(0, 4, 0)), new THREE.Color(0.75, 0.72, 0.68).multiplyScalar(1.6), 60, { spread: 7, life: 0.9, size: 0.18, grav: 16, up: 1.2, drag: 0.6 });
    }
    this.birds.update(S, songT, time, fogD, camera.position);
    // the halo, over the trail ahead while the line is sung
    const hz = S.plan.halo;
    const hk = hz ? smooth(hz[0] - 0.4, hz[0] + 0.6, t) * (1 - smooth(hz[1] - 0.8, hz[1], t)) : 0;
    this.halo.visible = hk > 0.01;
    if (this.halo.visible) {
      const f = S.track.dirAt(t + 2, this._f); f.y = 0; f.normalize();
      this.halo.position.copy(camera.position).addScaledVector(f, 380); this.halo.position.y += 120;
      this.halo.lookAt(camera.position); this.halo.rotateZ(time * 0.15);
      this.halo.scale.setScalar(150 + 30 * pulse);
      this.haloMat.uniforms.uK.value = 0.32 * hk * (0.8 + 0.3 * pulse);
    }
  }
  // things of light drawn into the glow layer: seeds and pollen in the sun, fireflies at dusk,
  // the core of the halo
  draw(T, rider, songNow) {
    const S = this.sess, c = this.S.course, P = T.P, t = rider.t, track = T.track;
    if (!track || !S) return;
    const sun = clamp((P.sunK ?? 0) / 2.2, 0, 1) * clamp((P.moonDir ? P.moonDir[1] : 0) * 5, 0, 1);
    const LK = S.lift ? S.lift.k : 0;
    const v = this._v, sc = col(P.moon);
    // the air full of seed and pollen in the light, thicker in a chorus
    if (sun > 0.05) {
      const n = Math.round(30 + 110 * LK), step = 9 / n;
      for (let i = 0; i < n; i++) {
        const ts = Math.floor(t / step) * step + i * step - 0.4, k = Math.floor(ts / step);
        const h = Math.sin(k * 78.233) * 43758.5453, f = h - Math.floor(h), g = (f * 13.7) % 1;
        const x = (f - 0.5) * 34, y = c.sample(ts).y - 1 + g * 9 + Math.sin(songNow * 0.7 + k) * 0.6;
        track.ground(ts, x + Math.sin(songNow * 0.4 + k * 1.7) * 1.2, v); v.y = y;
        const tw = 0.6 + 0.4 * Math.sin(songNow * 3 + k * 5.1);
        T.glow(v.x, v.y, v.z, 0.22 + 0.2 * g, sc, sun * (0.5 + 0.9 * LK) * tw);
      }
    }
    // fireflies once the sun's gone, blinking, some of them with the beat
    const dusk = clamp(1.2 - (P.sunK ?? 1) / 1.2, 0, 1);
    if (dusk > 0.05) {
      const bpos = c.beatAt(t), bf = bpos - Math.floor(bpos);
      const n = Math.round(70 * dusk), step = 10 / n;
      for (let i = 0; i < n; i++) {
        const ts = Math.floor(t / step) * step + i * step - 0.5, k = Math.floor(ts / step);
        const h = Math.sin(k * 41.17) * 43758.5453, f = h - Math.floor(h), g = (f * 9.31) % 1;
        const side = g < 0.5 ? -1 : 1, x = side * (7 + f * 30);
        const per = 1.6 + g * 2.4, ph = (songNow / per + f * 7) % 1;
        const on = g > 0.7 ? Math.exp(-bf * 7) : Math.max(0, Math.sin(ph * 6.28)) ** 8;
        if (on < 0.04) continue;
        // over the grass, or, where the ground has fallen away, up where you can see them
        track.ground(ts, x, v); v.y = Math.max(yahGround(c, ts, x), c.sample(ts).y - 4) + 0.6 + f * 3.2 + Math.sin(songNow + k) * 0.3;
        T.glow(v.x, v.y, v.z, 1.1, [0.72, 1, 0.3], 1.8 * on * dusk);
      }
    }
    // the light at the heart of the halo
    if (this.halo.visible) T.glow(this.halo.position.x, this.halo.position.y, this.halo.position.z, 90, [1, 0.88, 0.62], this.haloMat.uniforms.uK.value * 2.2);
    // a patch of sun on the ground under each of the things the light finds
    if (sun > 0.05) for (const a of this.spots) {
      if (a.t < t - 0.3 || a.t > t + 9) continue;
      track.ground(a.t, a.x, v); v.y = yahGround(c, a.t, a.x) + 0.12;
      T.pool(v.x, v.y, v.z, 9 + 4 * (a.s ?? 1), sc, 0.5 * sun);
    }
  }
}
