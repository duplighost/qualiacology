// A Million Ducks: what moves every frame. The projector's beam over the seats; the seeds from the
// film drifting out over the audience; in the machine, a claw coming down on every bar and ducks
// thrown up on every beat; popcorn popping on the beat; a million ducks coming down in the lobby;
// the searchlights over the car park; the claw that comes down into his room for the one he
// couldn't lose. Everything here is worked out from song time, so it's the same every ride.

import * as THREE from 'three';
import { extend, glowAt } from './scenery.js';
import { duckLo, duneAt } from './dck-pieces.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const G = 22;

function flyMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (vColor.r > 0.9 && vColor.g > 0.6) diffuseColor.rgb = vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.35;');
  };
  m.customProgramCacheKey = () => 'dckFly';
  return m;
}
const TT = { aTint: 3 };
extend({
  layers: {
    dckFly: (M) => [duckLo(9), M.dckFlyM || (M.dckFlyM = flyMaterial()), 520, TT],
    dckCorn: (M) => [(() => { const g = new THREE.IcosahedronGeometry(0.16, 0); return g; })(), M.dckCornM || (M.dckCornM = new THREE.MeshStandardMaterial({ color: 0xfff0c8, roughness: 0.8, emissive: 0x5a4a30 })), 360, {}],
  },
});

const SEED_HALO = [0.55, 1, 0.92], SEED_CORE = [0.9, 1, 1];
const DUCK_TINTS = [[1, 0.78, 0.12], [1, 0.78, 0.12], [1, 0.78, 0.12], [1, 0.78, 0.12], [1, 0.45, 0.65], [0.35, 0.6, 1], [0.96, 0.96, 0.98], [1, 0.55, 0.15], [0.32, 0.78, 0.34]];

// ---------- the projector's beam: a cone of light from the booth to the screen ----------
const BEAM_VS = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
  void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const BEAM_FS = /* glsl */`
  uniform float uK, uTime, uBeat; uniform vec3 uCol;
  varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    vec3 V = normalize(vV);
    float f = abs(dot(normalize(vN), V));
    // brightest near the booth, spreading and fading toward the screen; dust drifting in it
    float u = vUv.x;
    float a = pow(f, 2.2) * (0.25 + 0.75 * pow(max(1.0 - u, 0.0), 1.4));
    float dust = 0.7 + 0.6 * n3(vW * 0.35 + vec3(0.0, uTime * 0.4, uTime * 0.2));
    float flick = 0.86 + 0.08 * sin(uTime * 23.0) * sin(uTime * 7.3) + 0.06 * sin(uTime * 3.1);
    a *= dust * flick * uK * (1.0 + 0.35 * uBeat);
    a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0;
    gl_FragColor = vec4(uCol * a * 0.32, 1.0);
  }`;
class ProjBeam {
  constructor(scene, cfg, floorFn) {
    this.cfg = cfg; this.floor = floorFn;
    const L = 40, A = 14;
    this.L = L; this.A = A;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array((L + 1) * (A + 1) * 3); this.nrm = new Float32Array((L + 1) * (A + 1) * 3);
    const uv = new Float32Array((L + 1) * (A + 1) * 2), idx = [];
    for (let i = 0; i <= L; i++) for (let j = 0; j <= A; j++) { uv[(i * (A + 1) + j) * 2] = i / L; uv[(i * (A + 1) + j) * 2 + 1] = j / A; if (i < L && j < A) { const a = i * (A + 1) + j, b = a + 1, c = a + A + 1, d = c + 1; idx.push(a, c, b, b, c, d); } }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.mat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uCol: { value: new THREE.Color(cfg.color ?? 0xbfe4ff) } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(S, time) {
    const c = this.cfg, r = S.rider, t = r.t;
    const lo = Math.min(c.booth, c.screen), hi = Math.max(c.booth, c.screen);
    const a = Math.max(lo, t - 3), b = Math.min(hi, t + 30);
    const k = (c.on ? smooth(c.on[0], c.on[1], t) : 1) * (c.off ? 1 - smooth(c.off, c.off + 0.5, t) : 1);
    this.mesh.visible = b > a + 0.2 && k > 0.01;
    if (!this.mesh.visible) return;
    const L = this.L, A = this.A, pos = this.pos, nrm = this.nrm, T = S.track, crs = S.course;
    for (let i = 0; i <= L; i++) {
      const tt = a + (b - a) * (i / L);
      const u = (tt - c.booth) / (c.screen - c.booth);           // 0 at the booth, 1 at the screen
      const yaw = crs.sample(tt).yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      T.ground(tt, 0, this._p);
      const cy = this.floor(tt) + c.yBooth + (c.yScreen - c.yBooth) * u;
      const rad = c.rBooth + (c.rScreen - c.rBooth) * Math.pow(clamp(u, 0, 1), 0.9);
      for (let j = 0; j <= A; j++) {
        const an = (j / A) * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an);
        const o = (i * (A + 1) + j) * 3;
        pos[o] = this._p.x + rx * ca * rad; pos[o + 1] = cy + sa * rad; pos[o + 2] = this._p.z + rz * ca * rad;
        nrm[o] = rx * ca; nrm[o + 1] = sa; nrm[o + 2] = rz * ca;
      }
      // the uv's x is how far along from the booth, so the light falls off the same however it's cut
      this.mesh.geometry.attributes.uv.array[(i * (A + 1)) * 2] = 0;
    }
    const uvA = this.mesh.geometry.attributes.uv.array;
    for (let i = 0; i <= L; i++) { const tt = a + (b - a) * (i / L), u = clamp((tt - c.booth) / (c.screen - c.booth), 0, 1); for (let j = 0; j <= A; j++) uvA[(i * (A + 1) + j) * 2] = u; }
    this.mesh.geometry.attributes.uv.needsUpdate = true;
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.normal.needsUpdate = true;
    const u = this.mat.uniforms; u.uK.value = k * (c.k ?? 1); u.uTime.value = time; u.uBeat.value = S.town.beat || 0;
  }
}

// ---------- premiere searchlights over the car park ----------
const SL_VS = `attribute float aK; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vA;
void main(){ vL = uv.y; vK = aK; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vA = normalize(normalMatrix * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0)); gl_Position = projectionMatrix * mv; }`;
const SL_FS = `uniform vec3 uCol; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vA;
void main(){ vec3 V = normalize(vV); float f = abs(dot(normalize(vN), V)); float end = 1.0 - smoothstep(0.55, 0.92, abs(dot(normalize(vA), V)));
  float a = pow(f, 2.6) * pow(max(1.0 - vL, 0.0), 1.3) * smoothstep(0.0, 0.05, vL) * vK * end;
  a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; if (vK <= 0.0) discard; gl_FragColor = vec4(uCol * a, 1.0); }`;
class Searchlights {
  constructor(scene, cfg, floorFn) {
    this.cfg = cfg; this.floor = floorFn;
    const len = cfg.len ?? 300;
    const g = new THREE.CylinderGeometry(cfg.r ?? 7, 0.7, len, 16, 1, true); g.translate(0, len / 2, 0);
    // uv.y runs 1 at the top, 0 at the bottom: flip it so 0 is at the lamp
    const uv = g.attributes.uv.array; for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
    this.n = cfg.at.length;
    this.aK = new THREE.InstancedBufferAttribute(new Float32Array(this.n), 1); this.aK.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aK', this.aK);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(cfg.color ?? 0xfff2d8) } }, vertexShader: SL_VS, fragmentShader: SL_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  update(S, time) {
    const c = this.cfg, t = S.rider.t;
    const on = smooth(c.from - 1, c.from + 0.6, t) * (1 - smooth(c.to - 0.6, c.to, t));
    this.mesh.visible = on > 0.01;
    if (!this.mesh.visible) return;
    const crs = S.course, bp = crs.beatAt(t), bf = bp - Math.floor(bp), bi = Math.floor(bp);
    const lift = S.lift ? S.lift.k : 0;
    let n = 0;
    for (let i = 0; i < c.at.length; i++) {
      const [tt, x] = c.at[i];
      if (tt < t - 3 || tt > t + 40) continue;
      S.track.ground(tt, x, this._p); this._p.y = this.floor(tt) + 4.5;
      // each leans out over the lot and swings across on the beat, crossing its neighbour
      const sw = Math.sin((bi % 2 ? 1 : -1) * (1 - Math.pow(1 - bf, 3)) * 1.1 + i * 1.3 + time * 0.35) * 0.4;
      this._e.set(-0.25 - 0.15 * Math.sin(time * 0.5 + i), crs.sample(tt).yaw + (x > 0 ? -0.5 : 0.5) + sw * 0.8, (x > 0 ? 1 : -1) * (0.35 + sw * 0.45));
      this._q.setFromEuler(this._e);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this.aK.array[n] = on * (0.45 + 0.4 * lift + 0.25 * Math.exp(-bf * 5) * lift);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true; this.aK.needsUpdate = true;
  }
}

// ---------- the car park's tarmac: bays painted either side of the aisles, arrows ----------
class Lot {
  constructor(scene, span, P, floorFn) {
    this.span = span; this.floor = floorFn;
    // the lot across, and beyond it the bank down to the ground
    this.xs = [-140, -105]; for (let j = 0; j < 12; j++) this.xs.push(-80 + 160 * j / 11); this.xs.push(105, 140);
    const N = 90, C = this.xs.length;
    this.N = N; this.C = C;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * C * 3); this.uv = new Float32Array(N * C * 2);
    const idx = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < C - 1; j++) { const a = i * C + j, b = a + 1, c = a + C, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform vec3 uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float aaLine(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
        void main(){
          float x = vUv.x, ax = abs(x), along = vUv.y;
          vec3 col = vec3(0.045, 0.043, 0.05) * (0.85 + 0.3 * h2(floor(vW.xz * 1.3)));
          // two rows of bays either side of each aisle: bay lines every 2.7 m, the line down the middle
          float inBays = step(18.0, ax) * step(ax, 30.0) + step(37.0, ax) * step(ax, 49.0) + step(56.0, ax) * step(ax, 68.0);
          float m = inBays * aaLine(mod(along, 2.7) - 1.35, 0.06);
          float mid = aaLine(ax - 24.0, 0.07) + aaLine(ax - 43.0, 0.07) + aaLine(ax - 62.0, 0.07);
          float ends = aaLine(ax - 18.0, 0.07) + aaLine(ax - 30.0, 0.07) + aaLine(ax - 37.0, 0.07) + aaLine(ax - 49.0, 0.07);
          // arrows in the aisles
          vec2 aq = vec2(ax - 33.5, mod(along, 40.0) - 20.0);
          float arrow = step(abs(aq.x), 0.35) * step(abs(aq.y), 3.0) + step(abs(aq.x), 1.2 - (aq.y - 3.0) * 0.6) * step(3.0, aq.y) * step(aq.y, 5.0);
          col += vec3(0.42, 0.41, 0.38) * clamp(m + mid * inBays + ends + arrow * 0.8, 0.0, 1.0) * (0.75 + 0.25 * h2(floor(vec2(along * 0.2, x))));
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
    this._cum = new Float32Array(N);
  }
  update(S, camera) {
    const r = S.rider, [a0, b0] = this.span;
    const ta = Math.max(a0, r.t - 3), tb = Math.min(b0, r.t + 30);
    this.mesh.visible = tb > ta + 0.1;
    if (!this.mesh.visible) return;
    const N = this.N, C = this.C, T = S.track, cum = this._cum;
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = ta + (tb - ta) * (i / (N - 1));
      const fy = this.floor(t);
      for (let j = 0; j < C; j++) { const x = this.xs[j]; T.ground(t, x, this._p); const o = (i * C + j) * 3; this.pos[o] = this._p.x; this.pos[o + 1] = fy * clamp((140 - Math.abs(x)) / 55, 0, 1) + 0.02; this.pos[o + 2] = this._p.z; this.uv[(i * C + j) * 2] = x; }
      T.ground(t, 0, this._p);
      cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0; lx = this._p.x; lz = this._p.z;
    }
    // along, fixed to the world: walk from her to the first row if it's ahead
    let base;
    if (r.t <= ta) { let d = 0, px = 0, pz = 0; for (let k = 0; k <= 16; k++) { T.ground(r.t + (ta - r.t) * k / 16, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; } base = r.stats.dist + d; }
    else { const f = clamp((r.t - ta) / (tb - ta), 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(f)); base = r.stats.dist - (cum[i] + (cum[i + 1] - cum[i]) * (f - i)); }
    for (let i = 0; i < N; i++) for (let j = 0; j < C; j++) this.uv[(i * C + j) * 2 + 1] = cum[i] + base;
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.uv.needsUpdate = true;
    const u = this.mat.uniforms; u.uFog.value.set(S.P.fog); u.uFogDensity.value = S.P.fogDensity; u.uCam.value.copy(camera.position);
  }
}

export class DuckFx {
  constructor(scene, S, world) {
    this.S = S; this.world = world; this.floor = world.floor;
    const cfg = (S.plan && S.plan.fx) || {};
    this.cfg = cfg;
    this.beams = (cfg.beams || []).map((b) => new ProjBeam(scene, b, this.floor));
    this.search = cfg.search ? new Searchlights(scene, cfg.search, this.floor) : null;
    this.lot = cfg.lot ? new Lot(scene, cfg.lot, S.P, this.floor) : null;
    // the lines' boards light when their line starts
    const lyr = S.plan.lyrics || [];
    for (const it of S.town.items) if (it.parts === 'dckMarquee') { const i = lyr.findIndex((l, k) => S.town.atlas.index['LYR' + k] === it.idx); if (i >= 0) it.t0 = lyr[i].t; }
    // the seeds: where each drifts, fixed for the ride
    this.seeds = [];
    for (const sp of cfg.seeds || []) {
      const n = Math.round((sp.to - sp.from) * (sp.rate ?? 9));
      for (let k = 0; k < n; k++) { const t = sp.from + (sp.to - sp.from) * hash(k, sp.from); this.seeds.push({ t, x: (hash(k, 3) - 0.5) * 2 * (sp.w ?? 30), h: 3 + hash(k, 5) * (sp.hMax ?? 20), ph: hash(k, 7) * 6.28, s: 0.5 + hash(k, 9) * 0.8, burst: sp.burstAt, from: sp.from, to: sp.to }); }
    }
    this.seeds.sort((a, b) => a.t - b.t);
    // the crowds in the auditoriums and the ducks heaped in the machine: drawn from their own sorted lists
    this.crowd = (S.town.dckCrowd || []).sort((a, b) => a.t - b.t);
    this.sea = (S.town.dckSea || []).sort((a, b) => a.t - b.t);
    // make the layers now, so nothing compiles mid-ride
    void S.town.layers.dckFly; void S.town.layers.dckCorn; void S.town.layers.dckBigClaw;
    if (this.crowd.length) for (let v = 0; v < 5; v++) void S.town.layers['dckAud' + v];
    if (this.sea.length) void S.town.layers.dckSeaDuck;
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3();
    // scratch for per-instance values (the layers copy them, so one array does for all)
    this._tint = [0, 0, 0]; this._vals = { aTint: this._tint };
  }
  update(S, dt, camera, time) {
    for (const b of this.beams) b.update(S, time);
    if (this.search) this.search.update(S, time);
    if (this.lot) this.lot.update(S, camera);
    S.town.dckSeaHop = 0;
    const kind = S.course.sectionAt(S.rider.t).kind;
    for (const [a, b] of this.cfg.seaHop || []) if (S.rider.t > a && S.rider.t < b) S.town.dckSeaHop = kind === 'chorus' || kind === 'final' ? 0.5 + 0.5 * (S.lift ? S.lift.k : 0) : 0.15;
  }

  // a duck in the air: at (t, x) on the course, height y over the floor there, turned by a
  duck(T, t, x, y, a, b, s, tint) {
    T.track.ground(t, x, this._p); this._p.y = y;
    this._e.set(a, T.course.sample(t).yaw + b, a * 0.6); this._q.setFromEuler(this._e);
    this._m.compose(this._p, this._q, this._s.set(s, s, s)); T.layers.dckFly.add(this._m, { aTint: tint });
  }

  // the first index in a sorted list at or after song time a
  static from(list, a) { let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].t < a) lo = m + 1; else hi = m; } return lo; }

  draw(T, rider, songT) {
    const S = this.S, c = S.course, t = rider.t, cfg = this.cfg, L = T.layers, beat = T.beat || 0;
    const lift = S.lift ? S.lift.k : 0;
    const behind = T.dckCull ? 0.45 : 5;
    const p = this._p, q = this._q, e = this._e, m = this._m, s = this._s;
    // ---- the audience: four seats a block, faces in the screen's light (blue from "to turn blue") ----
    if (this.crowd.length) {
      for (let i = DuckFx.from(this.crowd, t - behind); i < this.crowd.length; i++) {
        const it = this.crowd[i];
        if (it.t > t + it.ahead) break;
        T.track.ground(it.t, it.x, p); p.y = it.h;
        e.set(0, c.sample(it.t).yaw + it.rot, 0); q.setFromEuler(e);
        m.compose(p, q, s.set(1.15, 1.15, 1.15));
        const blue = it.blueAt ? smooth(it.blueAt, it.blueAt + 0.9 + it.seed * 0.8, t) : 0, k = it.lit ?? 1;
        const tint = this._tint; tint[0] = (0.55 + 0.25 * it.seed) * (1 - blue) * k + 0.16 * blue; tint[1] = (0.62 + 0.18 * it.seed) * (1 - blue) * k + 0.46 * blue; tint[2] = 0.85 * (1 - blue) * k + 1.05 * blue;
        L['dckAud' + it.v].add(m, this._vals);
      }
    }
    // ---- the ducks heaped in the machine, jumping a little on the beat in the chorus ----
    if (this.sea.length) {
      const hopK = T.dckSeaHop || 0, bf = T.dckBeatF ?? 0;
      for (let i = DuckFx.from(this.sea, t - behind); i < this.sea.length; i++) {
        const it = this.sea[i];
        if (it.t > t + 6) break;
        if (it.t > t + it.ahead) continue;
        const hop = hopK * Math.max(0, Math.sin(Math.PI * clamp(bf * 2 - it.seed * 0.8, 0, 1))) * 0.9 * it.s;
        T.track.ground(it.t, it.x, p); p.y = it.h + hop;
        e.set(it.rx, c.sample(it.t).yaw + it.rot, it.rz + hop * 0.2); q.setFromEuler(e);
        m.compose(p, q, s.set(it.s, it.s, it.s)); L.dckSeaDuck.add(m, { aTint: it.tint });
      }
    }
    // ---- the seeds from the film, drifting over the seats ----
    for (const sd of this.seeds) {
      if (sd.t < t - 0.6) continue;
      if (sd.t > t + 7) break;
      const bk = sd.burst !== undefined ? smooth(sd.burst - 0.2, sd.burst + 1.0, t) : 1;
      const pre = sd.burst !== undefined ? 0.25 : 1;
      if (bk <= 0 && pre <= 0) continue;
      const k = Math.max(pre, bk) * smooth(sd.from - 0.5, sd.from + 1, t);
      const x = sd.x + Math.sin(songT * 0.35 + sd.ph) * 2.5, swirl = sd.burst !== undefined ? bk * Math.sin(songT * 0.9 + sd.ph) * 4 : 0;
      T.track.ground(sd.t, x + swirl, this._p);
      const y = this.floor(sd.t) + sd.h + Math.sin(songT * 0.6 + sd.ph * 2) * 1.2 + (sd.burst !== undefined ? bk * 3 * Math.sin(songT * 0.5 + sd.ph) : 0);
      const pulse = 0.75 + 0.35 * Math.sin(songT * 2.2 + sd.ph) + 0.35 * beat * lift;
      glowAt(T, this._p.x, y, this._p.z, sd.s * 1.5, SEED_HALO, 0.55 * pulse * k);
      glowAt(T, this._p.x, y, this._p.z, sd.s * 0.45, SEED_CORE, 1.4 * pulse * k);
    }
    // ---- the claws in the machine: one comes down every bar, grabs a duck, goes back up ----
    for (const [a, b] of cfg.claws || []) {
      if (t < a - 3 || t > b + 3) continue;
      const b0 = Math.ceil(c.beatAt(Math.max(a, t - 2.2)));
      for (let bi = b0; c.beats[bi] !== undefined && c.beats[bi] < Math.min(b, t + 0.2); bi++) {
        if (!c.isBar(bi)) continue;
        const tb = c.beats[bi], age = t - tb, n = bi >> 2;
        const place = tb + 1.75, x = (n % 2 ? 1 : -1) * (10.5 + (n % 3) * 1.8);
        const top = this.floor(place) + 31, dn = this.floor(place) + duneAt(x) + 3.4;
        const down = smooth(-0.1, 0.55, age), up = smooth(0.8, 1.9, age);
        const y = top + (dn - top) * down * (1 - up) - (up > 0 ? 0 : 0);
        T.track.ground(place, x, this._p); this._p.y = y;
        this._e.set(0, c.sample(place).yaw + n, Math.sin(songT * 3 + n) * 0.04 * down); this._q.setFromEuler(this._e);
        this._m.compose(this._p, this._q, this._s.set(2.4, 2.4, 2.4)); L.dckBigClaw.add(this._m);
        glowAt(T, this._p.x, y + 2.5, this._p.z, 6, [1, 0.6, 0.85], (0.5 + 0.8 * beat) * smooth(0.2, 0.6, age) * (1 - up * 0.5));
        if (age > 0.62) this.duck(T, place, x, y - 2.6, 0.2, n * 0.7, 1.9, DUCK_TINTS[n % DUCK_TINTS.length]);
      }
    }
    // ---- ducks thrown up out of the heap on every beat ----
    for (const f of cfg.fountains || []) {
      if (t < f.from - 2 || t > f.to + 2) continue;
      const b0 = Math.ceil(c.beatAt(Math.max(f.from, t - 1.7)));
      const n = Math.round((f.n ?? 5) * (0.6 + 0.6 * lift));
      for (let bi = b0; c.beats[bi] !== undefined && c.beats[bi] < Math.min(f.to, t + 0.02); bi++) {
        const tb = c.beats[bi], age = t - tb;
        for (const side of [-1, 1]) for (let k = 0; k < n; k++) {
          const h1 = hash(bi * 7 + k, side), h2 = hash(bi * 3 + k, side + 5), h3 = hash(bi + k * 13, side + 9);
          const place = tb + (f.lead ?? 1.8) + (h1 - 0.5) * 0.5;
          const x0 = side * ((f.x0 ?? 14) + h2 * (f.dx ?? 12));
          const vy = 13 + 6 * h3, vx = -side * (2 + 4 * h1);
          const y0 = this.floor(place) + (f.desk ? 0.5 : duneAt(x0) + 0.6);
          const y = y0 + vy * age - 0.5 * G * age * age;
          if (y < y0 - 1) continue;
          this.duck(T, place, x0 + vx * age, y, age * (4 + 3 * h2), h1 * 6.28 + age * 3, (f.s ?? 1.8) * (0.8 + 0.4 * h3), DUCK_TINTS[(bi + k) % DUCK_TINTS.length]);
        }
      }
    }
    // ---- a million ducks coming down all round her, bouncing on the road ----
    const sh = cfg.shower;
    if (sh && t > sh.from - 2 && t < sh.to + 3) {
      const b0 = Math.ceil(c.beatAt(Math.max(sh.from, t - 2.6)));
      for (let bi = b0; c.beats[bi] !== undefined && c.beats[bi] < Math.min(sh.to, t + 0.02); bi++) {
        const tb = c.beats[bi], age = t - tb;
        for (let k = 0; k < (sh.n ?? 22); k++) {
          const h1 = hash(bi * 11 + k, 1), h2 = hash(bi * 5 + k, 2), h3 = hash(bi * 17 + k, 3);
          const place = tb + 1.0 + h1 * 1.6, x = (h2 - 0.5) * 2 * (sh.w ?? 22);
          const onRoad = Math.abs(x) < c.sample(place).width - 0.6;
          const top = this.floor(place) + (sh.h ?? 19), ground = onRoad ? c.sample(place).y + 0.45 : this.floor(place) + 0.4;
          let y = top - 0.5 * G * age * age;
          if (y < ground) {
            // bounce once, then lie there
            const tHit = Math.sqrt(2 * (top - ground) / G), v = G * tHit * 0.42, a2 = age - tHit;
            y = ground + Math.max(0, v * a2 - 0.5 * G * a2 * a2);
          }
          this.duck(T, place, x, y, age * 5 * h3, h1 * 6.28 + age * 2, 1.25 + 0.6 * h3, DUCK_TINTS[(bi + k) % DUCK_TINTS.length]);
        }
      }
    }
    // ---- popcorn popping out of the machines on the beat ----
    for (const pp of cfg.popcorn || []) {
      if (t < pp.from - 3 || t > pp.to + 2) continue;
      const b0 = Math.ceil(c.beatAt(Math.max(pp.from, t - 1.4)));
      for (let bi = b0; c.beats[bi] !== undefined && c.beats[bi] < Math.min(pp.to, t + 0.02); bi++) {
        const age = t - c.beats[bi];
        for (const [mt, mx, ms] of pp.at) {
          if (mt < t - 1 || mt > t + 12) continue;
          const y0 = this.floor(mt) + 4.6 * ms;
          for (let k = 0; k < 16; k++) {
            const h1 = hash(bi * 13 + k, mt), h2 = hash(bi * 7 + k, mx), h3 = hash(bi + k * 3, mt + mx);
            const vy = 9 + 7 * h1, a = h2 * 6.28, sp = 2 + 4 * h3;
            const y = y0 + vy * age - 0.5 * G * age * age;
            if (y < y0 - 6) continue;
            T.track.ground(mt + Math.sin(a) * sp * age / 40, mx + Math.cos(a) * sp * age, this._p); this._p.y = y;
            this._e.set(age * 6 + h1 * 6, h2 * 6, 0); this._q.setFromEuler(this._e);
            const s = (1.1 + 0.6 * h3) * ms;
            this._m.compose(this._p, this._q, this._s.set(s, s, s)); L.dckCorn.add(this._m);
          }
        }
      }
    }
    // ---- light on the bedroom floor far down under the gaps in the dresser, so the drop reads ----
    for (const [a, b] of cfg.voids || []) {
      if (t < a - 3 || t > b + 0.5) continue;
      for (const g of c.gaps) {
        if (g.lip < a || g.lip > b) continue;
        const mid = (g.from + g.to) / 2;
        T.track.ground(mid, 0, this._p);
        T.pool(this._p.x, -149.6, this._p.z, 170, [0.55, 0.65, 1.0], 0.95);
        T.pool(this._p.x, -149.5, this._p.z, 60, [1, 0.85, 0.6], 0.8);
      }
    }
    // ---- the claw in his room: it comes down for the one he couldn't lose and takes it away ----
    const bc = cfg.roomClaw;
    if (bc && t > bc.down - 4 && t < bc.gone + 3) {
      const fy = this.floor(bc.at);
      const top = fy + 300, low = fy + 9;
      const d = smooth(bc.down, bc.grab, t), u = smooth(bc.grab + 0.4, bc.gone, t);
      const y = top + (low - top) * d + (top - low) * u * u;
      T.track.ground(bc.at, bc.x, this._p); this._p.y = y;
      this._e.set(0, c.sample(bc.at).yaw + songT * 0.2, Math.sin(songT * 1.4) * 0.03); this._q.setFromEuler(this._e);
      this._m.compose(this._p, this._q, this._s.set(bc.s ?? 9, bc.s ?? 9, bc.s ?? 9)); L.dckBigClaw.add(this._m);
      const dy = t < bc.grab + 0.4 ? fy + 0.3 * (bc.ds ?? 6) : y - 1.15 * (bc.s ?? 9) * 0.95;
      this.duck(T, bc.at, bc.x, dy, t < bc.grab + 0.4 ? 0 : Math.sin(songT * 2) * 0.15, 0.6, bc.ds ?? 6, [0.95, 0.12, 0.2]);
      // a spot on it, from up in the dark
      T.track.ground(bc.at, bc.x, this._p);
      glowAt(T, this._p.x, dy + 4, this._p.z, 18, [1, 0.6, 0.6], 0.35 * (1 - u));
      T.pool(this._p.x, fy + 0.15, this._p.z, 30, [1, 0.75, 0.6], 0.7 * (1 - u));
    }
  }
}
