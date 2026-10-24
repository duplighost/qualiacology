// Until She Stopped Fighting. A mill town, one night to morning. The song is his, from the
// inside of a man who did something unspeakable; none of it is shown. The place carries the
// sound, and the story is only in the world around it: the bar at the mill gate, her walk home
// lit lamp by lamp, the church on the hill going dark on "He left you here with me". Then the
// works at full blast: the pour on the drop (over the casting pit), spark fountains on every
// beat, the stacks breathing fire, the white-hot ingot coming up slow from the soaking pit, the
// quench tower's cloud, the hammer on the riff, the rolling mill. A memorial on the fence on
// "She was only 23", posters on every pole; the cooling yard going cold and dead; everything
// stopping still on "Her silence". The converter blowing, the cast over a river of iron, and
// the blast furnace at dawn: the sun coming up slow.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { buildingMaterial, GEO } from './props.js';
import { prepare, groundAt, Terrain } from './trail.js';
import { seeded } from './summer.js';
import { G, T as TOWN, M as MEM, FLAMES, furnace, furnaceGlow, merge } from './usf-geo.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const nz = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
const TAU = Math.PI * 2;
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);          // facing the road from x
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);   // and turned to her coming
const GRAV = 14;

// ---------- fog for our own materials (the scene has none: every shader does its own) ----------
const FOG = { uUsfFog: { value: new THREE.Color(0x0c0a0c) }, uUsfFogD: { value: 0.0016 } };
function fogPatch(sh) {
  sh.uniforms.uUsfFog = FOG.uUsfFog; sh.uniforms.uUsfFogD = FOG.uUsfFogD;
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uUsfFog; uniform float uUsfFogD;')
    .replace('#include <fog_fragment>', 'float usfD = length(vViewPosition); float usfF = 1.0 - exp(-pow(usfD * uUsfFogD, 1.5)); gl_FragColor.rgb = mix(gl_FragColor.rgb, uUsfFog, clamp(usfF, 0.0, 1.0));');
}
// vertex-coloured, lit a little by itself (dark steel on a dark night vanishes otherwise), fogged;
// tinted: times a per-instance colour
function litMat(key, k, opts = {}, tinted = false) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0.25, side: opts.side ?? THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    if (tinted) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;');
    }
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(3) + ';');
    fogPatch(sh);
  };
  m.customProgramCacheKey = () => 'usf-' + key;
  return m;
}
const LM = (M, key, k, opts, tinted) => M[key] || (M[key] = litMat(key, k, opts, tinted));
// light in a shape (doors, windows, glass): its vertex colour times a per-instance colour, fogged
function emitMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: FOG.uUsfFog, uFogD: FOG.uUsfFogD },
    vertexShader: `attribute vec3 aTint; varying vec3 vC; varying float vF; uniform float uFogD;
      void main(){ vC = color * aTint; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); float d = length(mv.xyz); vF = 1.0 - exp(-pow(d * uFogD, 1.5)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uFog; varying vec3 vC; varying float vF; void main(){ gl_FragColor = vec4(mix(vC, uFog, clamp(vF, 0.0, 1.0)), 1.0); }`,
    vertexColors: true,
  });
}
const EM = (M) => M.usfEmitM || (M.usfEmitM = emitMat());
// molten metal: white-hot in the middle, orange at the edges, crawling
function moltenMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: FOG.uUsfFog, uFogD: FOG.uUsfFogD },
    vertexShader: `attribute float aHeat; varying vec3 vP; varying float vH; varying float vF; uniform float uFogD;
      void main(){ vP = position; vH = aHeat; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); float d = length(mv.xyz); vF = 1.0 - exp(-pow(d * uFogD * 0.8, 1.5)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uFog; varying vec3 vP; varying float vH; varying float vF;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec2 q = vP.xz + vec2(vP.y * 0.7, 0.0);
        float n = n2(q * 0.35 + vec2(0.0, -uTime * 1.6)) * 0.6 + n2(q * 1.1 + vec2(uTime * 0.4, -uTime * 2.6)) * 0.4;
        float t = clamp(vH * (0.75 + 0.5 * n), 0.0, 1.4);
        vec3 c = mix(vec3(0.22, 0.02, 0.0), vec3(1.0, 0.32, 0.02), smoothstep(0.08, 0.55, t)); c = mix(c, vec3(1.0, 0.82, 0.42), smoothstep(0.55, 0.95, t)); c = mix(c, vec3(1.0, 1.0, 0.9), smoothstep(0.95, 1.3, t));
        c *= 1.2 + 0.7 * t;
        // gone cold: dark steel, a last red in the cracks
        c = mix(vec3(0.06, 0.058, 0.065) * (0.7 + 0.6 * n) + vec3(0.12, 0.01, 0.0) * smoothstep(0.55, 0.9, n) * smoothstep(0.0, 0.12, vH), c, smoothstep(0.05, 0.22, vH));
        gl_FragColor = vec4(mix(c, uFog, clamp(vF, 0.0, 1.0) * 0.85), 1.0); }`,
  });
}
const MOLT = (M) => M.usfMoltenM || (M.usfMoltenM = moltenMaterial());
// sparks: a short streak along where each one's going, additive
function sparkMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aTint; attribute vec4 aVel; varying vec3 vC; varying vec2 vUv;
      void main(){
        vec3 head = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float w = length(instanceMatrix[0].xyz);
        vec4 a = viewMatrix * vec4(head, 1.0), b = viewMatrix * vec4(head - aVel.xyz, 1.0);
        vec2 d = b.xy - a.xy; float L = length(d);
        vec2 sd = L > 1e-4 ? vec2(-d.y, d.x) / L : vec2(1.0, 0.0);
        vec3 p = mix(a.xyz, b.xyz, position.y); p.xy += sd * position.x * w * (1.0 - 0.7 * position.y);
        vUv = position.xy; vC = aTint * aVel.w;
        gl_Position = projectionMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float a = (1.0 - abs(vUv.x)) * (1.0 - vUv.y * 0.8); gl_FragColor = vec4(vC * a, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}
function sparkGeo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 0, 0, 1, 1, 0, -1, 1, 0]), 3)); return g; }
// steam and smoke: soft puffs, alpha-blended (additive white would bloom), fogged
function steamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: FOG.uUsfFog, uFogD: FOG.uUsfFogD },
    vertexShader: `attribute vec3 aTint; attribute vec2 aWake; varying vec2 vUv; varying vec3 vC; varying float vA; varying float vS; varying float vF; uniform float uFogD;
      void main(){ vUv = uv; vC = aTint; vA = aWake.x; vS = aWake.y;
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz);
        float an = vS * 6.2831; vec2 r = vec2(cos(an) * position.x - sin(an) * position.y, sin(an) * position.x + cos(an) * position.y);
        c.xy += r * s; float d = length(c.xyz); vF = 1.0 - exp(-pow(d * uFogD, 1.5)); gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform vec3 uFog; varying vec2 vUv; varying vec3 vC; varying float vA; varying float vS; varying float vF;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec2 p = vUv - 0.5; float d = length(p) * 2.0;
        float n = n2(p * 3.2 + vS * 17.0) * 0.6 + n2(p * 7.0 - vS * 9.0) * 0.4;
        float a = (1.0 - smoothstep(0.25, 1.0, d + (n - 0.5) * 0.55)) * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(mix(vC * (0.75 + 0.5 * n), uFog, clamp(vF, 0.0, 1.0)), a); }`,
    transparent: true, depthWrite: false,
  });
}
// the church's glass: each window has its number, and they go out one by one (uDark counts them)
function churchGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uDark: { value: 0 }, uTime: { value: 0 }, uFog: FOG.uUsfFog, uFogD: FOG.uUsfFogD },
    vertexShader: `attribute float aWin; varying vec3 vC; varying float vW; varying float vF; varying vec2 vP; uniform float uFogD;
      void main(){ vC = color; vW = aWin; vP = position.xy; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); float d = length(mv.xyz); vF = 1.0 - exp(-pow(d * uFogD, 1.5)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uDark, uTime; uniform vec3 uFog; varying vec3 vC; varying float vW; varying float vF; varying vec2 vP;
      void main(){ float k = 1.0 - smoothstep(vW - 0.2, vW + 0.8, uDark);
        // a flicker in the window that's about to go
        float last = smoothstep(vW - 1.2, vW - 0.2, uDark) * k; k *= 1.0 - 0.6 * last * step(0.5, fract(uTime * 13.0 + vW));
        float lead = 0.75 + 0.25 * step(0.12, fract(vP.y * 0.9)) * step(0.12, fract(vP.x * 1.1 + 0.5));
        vec3 c = vC * lead * (0.06 + 2.2 * k);
        gl_FragColor = vec4(mix(c, uFog, clamp(vF, 0.0, 1.0)), 1.0); }`,
    vertexColors: true,
  });
}

// ---------- the ground: cinder and slag, wet in places, rail sidings both sides ----------
const YD = 0.3;
// the song's ground: the shared shelf under the road, with the town's hill rising on the left, the
// casting pit under the first jump, the trough under the last, slag heaps in the cooling yard
export function usfGround(c, t, x) {
  let y = groundAt(c, t, x);
  const U = c._usf; if (!U) return y;
  for (const h of U.hills) {
    if (t < h.from - 6 || t > h.to + 6) continue;
    const d = h.side * x - h.x0; if (d <= 0) continue;
    const k = smooth(h.from - 5, h.from, t) * (1 - smooth(h.to, h.to + 5, t));
    y += k * h.rise * Math.pow(clamp(d / h.w, 0, 1), 1.25) * (0.85 + 0.3 * nz(t * 0.15 + x * 0.013));
  }
  for (const m of U.mounds) {
    const dt = (t - m.t) * 38; if (dt > m.r || dt < -m.r) continue;
    const d = Math.hypot(dt, x - m.x); if (d < m.r) y += m.h * (1 - smooth(0, m.r, d)) * (0.9 + 0.2 * nz(x * 0.2 + t));
  }
  for (const p of U.pits) {
    if (t < p.from - 0.4 || t > p.to + 0.4) continue;
    const k = smooth(p.from - 0.3, p.from, t) * (1 - smooth(p.to, p.to + 0.3, t)) * (1 - smooth(p.w - 4, p.w, Math.abs(x)));
    y = Math.max(0.6, y - p.depth * k);
  }
  return y;
}
function usfPrep(c, plan) {
  prepare(c, plan);
  if (c._usf) return c._usf;
  const u = (plan && plan.usf) || {};
  c._usf = { hills: u.hills || [], pits: u.pits || [], mounds: [], freeze: u.freeze || null };
  const R = seeded(77);
  for (const md of u.heaps || []) for (let k = 0; k < (md.n ?? 6); k++) c._usf.mounds.push({ t: md.from + (md.to - md.from) * R(), x: (R() < 0.5 ? -1 : 1) * (md.x + R() * md.spread), r: 18 + R() * 22, h: 6 + R() * 12 });
  return c._usf;
}
// the animation clock: in the silence everything stands still where it was
function animT(S) {
  const t = S.tNow ?? 0, F = S.course._usf && S.course._usf.freeze;
  return F && t >= F[0] && t < F[1] ? F[0] : t;
}
function terrainMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Color(P.moon) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunK: { value: 1 },
      uSky: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHemiK: { value: 1.5 },
      uFill: { value: new THREE.Color() }, uFillDir: { value: new THREE.Vector3(0, 1, 0) }, uFillK: { value: 0.3 },
      uGrass: { value: new THREE.Color(P.ground) }, uDirt: { value: new THREE.Color(0x3a2e28) }, uWood: { value: 0 }, uDry: { value: 0 }, uPath: { value: 0 }, uLawn: { value: 0 },
      uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() },
      uHot: { value: new THREE.Color(0xff7a2a) }, uHorizon: { value: new THREE.Color() }, uFrost: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSky, uBounce, uFill, uFillDir, uGrass, uDirt, uFog, uCam, uHot, uHorizon;
      uniform float uSunK, uHemiK, uFillK, uFogDensity, uFrost, uTime;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ return n2(p) * 0.55 + n2(p * 2.07 + 3.1) * 0.3 + n2(p * 4.31 + 7.7) * 0.15; }
      float aa(float d, float w){ float f = fwidth(d); return 1.0 - smoothstep(w - f, w + f, abs(d)); }
      void main(){
        float x = vUv.x, ax = abs(x), along = vUv.y;
        vec3 N = vN / max(length(vN), 1e-4);
        float d = length(uCam - vW);
        float near = 1.0 - smoothstep(40.0, 160.0, d);
        vec2 wp = vW.xz;
        // cinder and slag: dark, grainy, rust in patches; packed concrete aprons here and there
        float pat = fbm(wp * 0.035);
        vec3 alb = uGrass * (0.65 + 0.7 * pat) * (0.85 + 0.3 * mix(0.5, n2(wp * 1.9), near));
        alb = mix(alb, uDirt * (0.8 + 0.4 * n2(wp * 0.6)), smoothstep(0.55, 0.75, fbm(wp * 0.012 + 4.0)) * 0.6);
        float slab = smoothstep(0.6, 0.62, fbm(floor(wp / 9.0) * 0.37 + 2.0)) * smoothstep(22.0, 26.0, ax);
        alb = mix(alb, vec3(0.2, 0.19, 0.18) * (0.9 + 0.2 * h2(floor(wp / 9.0))), slab * 0.8);
        // the sidings: two tracks each side, sleepers under the rails
        float rails = 0.0, ties = 0.0;
        for (int k = 0; k < 2; k++) {
          float c = k == 0 ? 27.5 : 32.5; float dx = ax - c;
          rails += aa(abs(dx) - 0.72, 0.05);
          ties += step(fract(along / 0.7), 0.32) * (1.0 - smoothstep(1.15, 1.3, abs(dx)));
        }
        rails *= near * 0.9 + 0.1; ties = clamp(ties, 0.0, 1.0) * mix(0.5, 1.0, near);
        alb = mix(alb, vec3(0.07, 0.05, 0.04), ties * 0.85);
        // puddles: black water with the sky and the fires in it
        float pud = smoothstep(0.64, 0.68, fbm(wp * 0.022 + 9.0)) * smoothstep(19.0, 23.0, ax) * (1.0 - ties);
        float ndl = max(dot(N, normalize(uSunDir)), 0.0);
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
        vec3 col = alb * (amb + uSun * uSunK * ndl + uFill * uFillK * max(dot(N, normalize(uFillDir)), 0.0)) * 0.3183;
        vec3 V = normalize(uCam - vW); float graze = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        col = mix(col, uHorizon * 0.25 + uHot * 0.18 * (0.6 + 0.4 * n2(wp * 0.05 + uTime * 0.05)), pud * (0.35 + 0.65 * graze));
        col += (uHot * 0.35 + uSky * 0.08) * rails * (0.4 + 0.6 * graze);
        // frost over everything in the cooling yard: pale, glittering close by
        float fr = uFrost * (0.75 + 0.25 * n2(wp * 0.3));
        col = mix(col, vec3(0.32, 0.38, 0.5) * (0.8 + 0.3 * n2(wp * 2.3)), fr * 0.8);
        col += vec3(0.7, 0.85, 1.0) * fr * step(0.985, h2(floor(wp * 6.0))) * near;
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
class UsfTerrain extends Terrain {
  constructor(scene, course, P, plan) {
    super(scene, course, P, plan);
    this.mat.dispose();
    this.mat = terrainMaterial(P); this.mesh.material = this.mat;
    this._c = new THREE.Vector3(); this._s = {};
  }
  // the heights on a row never change: each row is a fixed song time, worked out as it comes into view
  rowHeights(k) {
    let h = this.hc.get(k);
    if (!h) { h = new Float32Array(this.M); const t = k * YD; for (let j = 0; j < this.M; j++) h[j] = usfGround(this.course, t, this.cols[j]); this.hc.set(k, h); }
    return h;
  }
  update(track, rider, P, cam, time, fogD, frost) {
    const N = this.N, M = this.M, c = this.course, cols = this.cols, pos = this.pos;
    const k0 = Math.floor((rider.t - 4) / YD), t0 = k0 * YD;
    if (!this.hc) this.hc = new Map();
    for (const k of this.hc.keys()) if (k < k0 - 2) this.hc.delete(k);
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = t0 + i * YD, hs = this.rowHeights(k0 + i);
      track.ground(t, 0, this._c);
      const yaw = c.sample(t, this._s).yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      for (let j = 0; j < M; j++) {
        const x = cols[j], o = i * M + j;
        pos[o * 3] = this._c.x + rx * x; pos[o * 3 + 1] = hs[j]; pos[o * 3 + 2] = this._c.z + rz * x;
        this.uvs[o * 2] = x;
      }
      cum[i] = i ? cum[i - 1] + Math.hypot(this._c.x - lx, this._c.z - lz) : 0;
      lx = this._c.x; lz = this._c.z;
    }
    const iR = clamp(Math.round((rider.t - t0) / YD), 0, N - 1), base = rider.stats.dist - cum[iR];
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.uvs[(i * M + j) * 2 + 1] = cum[i] + base;
    const a = this._a, b = this._b;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(M - 1, j + 1);
      a.set(pos[(i1 * M + j) * 3] - pos[(i0 * M + j) * 3], pos[(i1 * M + j) * 3 + 1] - pos[(i0 * M + j) * 3 + 1], pos[(i1 * M + j) * 3 + 2] - pos[(i0 * M + j) * 3 + 2]);
      b.set(pos[(i * M + j1) * 3] - pos[(i * M + j0) * 3], pos[(i * M + j1) * 3 + 1] - pos[(i * M + j0) * 3 + 1], pos[(i * M + j1) * 3 + 2] - pos[(i * M + j0) * 3 + 2]);
      a.cross(b).normalize(); if (a.y < 0) a.negate();
      const o = (i * M + j) * 3; this.nor[o] = a.x; this.nor[o + 1] = a.y; this.nor[o + 2] = a.z;
    }
    const g = this.geo.attributes; g.position.needsUpdate = true; g.normal.needsUpdate = true; g.uv.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uSun.value.set(P.moon); if (P.moonDir) u.uSunDir.value.set(...P.moonDir).normalize();
    u.uSunK.value = P.sunK ?? 1; u.uHemiK.value = P.hemiK ?? 1.5;
    u.uSky.value.set(P.skyLight ?? 0x8090a0); u.uBounce.value.set(P.bounce ?? 0x404030);
    u.uFill.value.set(P.skyGlow ?? 0xffffff); if (P.glowDir) u.uFillDir.value.set(...P.glowDir).normalize(); u.uFillK.value = P.fillK ?? 0.7;
    u.uGrass.value.set(P.ground); u.uHot.value.set(P.glow ?? 0xff7a2a); u.uHorizon.value.set(P.horizon);
    u.uFog.value.set(P.fog); u.uFogDensity.value = fogD; u.uCam.value.copy(cam);
    u.uTime.value = time; u.uFrost.value = frost;
  }
}

// ---------- the beat, for everything that moves to it ----------
function beat(S, T) {
  const B = S._usfB || (S._usfB = { T: -1e9 });
  if (B.T === T) return B;
  const c = S.course, x = c.beatAt(T), i = Math.floor(x), f = x - i;
  B.T = T; B.i = i; B.f = f; B.pulse = Math.exp(-f * 6); B.e = c.beatEnergy[i] ?? 0.5;
  B.bar = c.isBar(i); B.lift = S._usfLiftK ?? 0;
  return B;
}

// ---------- sparks and steam, drawn through their own layers ----------
const _m = new THREE.Matrix4(), _tv = [0, 0, 0, 0], _tc = [0, 0, 0], _tw = [0, 0], _o = new THREE.Vector3(), _o2 = new THREE.Vector3();
function spark(S, x, y, z, vx, vy, vz, w, r, g, b, k) {
  w *= 1.7;
  _m.makeScale(w, w, w); _m.setPosition(x, y, z);
  _tv[0] = vx; _tv[1] = vy; _tv[2] = vz; _tv[3] = k; _tc[0] = r; _tc[1] = g; _tc[2] = b;
  S.layers.usfSpark.add(_m, { aVel: _tv, aTint: _tc });
}
// a burst from a point o (world) at song time tb, each spark with its own way out
function burst(S, o, yaw, T, tb, n, v, seed, k, spread = 1, up = 1, w = 1) {
  const age = T - tb; if (age < 0 || age > 1.5) return;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let j = 0; j < n; j++) {
    const h3 = hash(j * 0.97 + seed * 7.3), life = 0.45 + 0.95 * h3; if (age > life) continue;
    const a = hash(j * 1.31 + seed) * TAU, sp = v * (0.35 + 0.65 * hash(j * 2.71 + seed * 3.1));
    const lx = Math.cos(a) * sp * spread, lz = Math.sin(a) * sp * spread, ly = sp * up * (0.5 + 0.9 * hash(j * 5.3 + seed));
    const wx = lx * c + lz * s, wz = -lx * s + lz * c, vy = ly - GRAV * age;
    const f = age / life;
    spark(S, o.x + wx * age, o.y + ly * age - 0.5 * GRAV * age * age, o.z + wz * age, wx * 0.05, vy * 0.05, wz * 0.05, (0.13 + 0.12 * (1 - f)) * w, 1, 0.88 - 0.5 * f, 0.45 - 0.35 * f, k * (1 - f * f) * 2.4);
  }
}
// a steady fountain (a grinder, a stream's splash): sparks on their own cycles
function fountain(S, o, yaw, T, n, v, seed, k, up = 1, spread = 1) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let j = 0; j < n; j++) {
    const life = 0.5 + 0.7 * hash(j * 0.71 + seed), ph = ((T / life + hash(j * 3.3 + seed)) % 1 + 1) % 1, age = ph * life, cyc = Math.floor(T / life + hash(j * 3.3 + seed));
    const a = hash(j * 1.7 + cyc * 0.37 + seed) * TAU, sp = v * (0.4 + 0.6 * hash(j * 2.3 + cyc * 0.11));
    const lx = Math.cos(a) * sp * 0.6 * spread, lz = Math.sin(a) * sp * 0.6 * spread, ly = sp * up;
    const wx = lx * c + lz * s, wz = -lx * s + lz * c;
    spark(S, o.x + wx * age, o.y + ly * age - 0.5 * GRAV * age * age, o.z + wz * age, wx * 0.05, (ly - GRAV * age) * 0.05, wz * 0.05, 0.12 + 0.1 * (1 - ph), 1, 0.85 - 0.45 * ph, 0.42 - 0.32 * ph, k * (1 - ph * ph) * 2.2);
  }
}
function puff(S, x, y, z, size, r, g, b, a, seed) {
  _m.makeScale(size, size, size); _m.setPosition(x, y, z);
  _tc[0] = r; _tc[1] = g; _tc[2] = b; _tw[0] = a; _tw[1] = seed;
  S.layers.usfSteam.add(_m, { aTint: _tc, aWake: _tw });
}
// a plume of steam (or smoke) out of o: puffs rising, drifting, growing, thinning; lit from below by heat
function plume(S, o, T, n, rate, rise, grow, seed, k, light, heat = 0, wind = 6, dark = 0) {
  for (let j = 0; j < n; j++) {
    const f = ((T * rate + j / n + seed) % 1 + 1) % 1;
    const age = f / rate, sd = hash(j * 1.9 + seed * 3.7 + Math.floor(T * rate + j / n + seed));
    const y = o.y + rise * age * (1 - 0.35 * f), sz = 2 + grow * f;
    const hot = heat * Math.exp(-f * 4);
    const base = 0.42 - 0.3 * dark;
    puff(S, o.x + wind * age + (sd - 0.5) * 4 * f, y, o.z + (hash(sd * 7) - 0.5) * 5 * f, sz,
      base * light[0] + hot * 1.0, base * light[1] + hot * 0.45, base * light[2] + hot * 0.12, k * Math.sin(Math.PI * Math.min(1, f * 1.4)) * (1 - f) * 1.4, sd);
  }
}

// ---------- the layers ----------
const FL = { aTint: 3 }, HEAT = { aHeat: 1 };
extend({
  layers: {
    usfShed: (M) => [G.shed(), LM(M, 'usfShedM', 0.08, { rough: 0.8, metal: 0.3 }), 120, {}],
    usfShedGlow: (M) => [G.shedGlow(), EM(M), 120, FL],
    usfStack: (M) => [G.stack(), LM(M, 'usfStackM', 0.14, { rough: 0.8 }), 70, {}],
    usfFlare: (M) => [G.flare(), LM(M, 'usfFlareM', 0.18, { rough: 0.6, metal: 0.4 }), 40, {}],
    usfCrane: (M) => [G.crane(), LM(M, 'usfCraneM', 0.2, { rough: 0.6, metal: 0.4 }), 20, {}],
    usfHook: (M) => [G.hook(), LM(M, 'usfHookM', 0.14, { rough: 0.6, metal: 0.5 }), 20, {}],
    usfCabGlow: (M) => [G.cabGlow(), EM(M), 20, FL],
    usfPipes: (M) => [G.pipes(), LM(M, 'usfPipesM', 0.05, { rough: 0.7, metal: 0.3 }), 240, {}],
    usfConveyor: (M) => [G.conveyor(), LM(M, 'usfConvM', 0.1, { rough: 0.7, metal: 0.3 }), 10, {}],
    usfConvGlow: (M) => [G.conveyorGlow(), EM(M), 10, FL],
    usfHopper: (M) => [G.hopper(), LM(M, 'usfHopM', 0.16, { rough: 0.8, metal: 0.2 }), 160, {}],
    usfTorpedo: (M) => [G.torpedo(), LM(M, 'usfTorpM', 0.2, { rough: 0.8, metal: 0.2 }), 80, {}],
    usfLadle: (M) => [G.ladle(), LM(M, 'usfLadleM', 0.4, { rough: 0.7, metal: 0.3 }), 12, {}],
    usfLadleTop: (M) => [G.ladleTop(), MOLT(M), 12, HEAT],
    usfMolds: (M) => [G.molds(), LM(M, 'usfMoldsM', 0.12, { rough: 0.8 }), 40, {}],
    usfMoltenMold: (M) => [G.moldMetal(), MOLT(M), 40, HEAT],
    usfHammer: (M) => [G.hammer(), LM(M, 'usfHammerM', 0.2, { rough: 0.5, metal: 0.5 }), 4, {}],
    usfRam: (M) => [G.ram(), LM(M, 'usfRamM', 0.16, { rough: 0.4, metal: 0.6 }), 4, {}],
    usfMoltenBillet: (M) => [G.billet(), MOLT(M), 4, HEAT],
    usfRollers: (M) => [G.rollers(), LM(M, 'usfRollM', 0.12, { rough: 0.5, metal: 0.5 }), 120, {}],
    usfMoltenSlab: (M) => [G.slab(), MOLT(M), 120, HEAT],
    usfCoilStand: (M) => [G.coilStand(), LM(M, 'usfCoilM', 0.12, { rough: 0.6 }), 8, {}],
    usfMoltenCoil: (M) => [G.coil(), MOLT(M), 8, HEAT],
    usfReheat: (M) => [G.reheat(), LM(M, 'usfReheatM', 0.12, { rough: 0.8 }), 30, {}],
    usfReheatDoors: (M) => [G.reheatDoors(), EM(M), 30, FL],
    usfMoltenIngot: (M) => [G.ingot(), MOLT(M), 420, HEAT],
    usfConverter: (M) => [G.converter(), LM(M, 'usfConvertM', 0.2, { rough: 0.6, metal: 0.4 }), 4, {}],
    usfSlagPot: (M) => [G.slagPot(), LM(M, 'usfSlagM', 0.15, { rough: 0.8 }), 6, {}],
    usfRunner: (M) => [G.runner(), LM(M, 'usfRunM', 0.12, { rough: 0.9 }), 140, {}],
    usfMoltenRunner: (M) => [G.runnerIron(), MOLT(M), 140, HEAT],
    usfPitPool: (M) => [G.pitPool(), MOLT(M), 2, HEAT],
    usfTrough: (M) => [G.trough(), LM(M, 'usfTroughM', 0.15, { rough: 0.9 }), 2, {}],
    usfMoltenTrough: (M) => [G.troughIron(), MOLT(M), 2, HEAT],
    usfSoakPit: (M) => [G.soakPit(), LM(M, 'usfSoakM', 0.18, { rough: 0.8, metal: 0.2 }), 3, {}],
    usfSoakLid: (M) => [G.soakLid(), LM(M, 'usfLidM', 0.15, { rough: 0.8 }), 3, {}],
    usfTongs: (M) => [G.tongs(), LM(M, 'usfTongsM', 0.2, { rough: 0.5, metal: 0.5 }), 3, {}],
    usfMoltenSoak: (M) => [G.soakIngot(), MOLT(M), 3, HEAT],
    usfQuench: (M) => [G.quench(), LM(M, 'usfQuenchM', 0.12, { rough: 0.9 }), 3, {}],
    usfGate: (M) => [G.gate(), LM(M, 'usfGateM', 0.22, { rough: 0.6, metal: 0.4 }), 3, {}],
    usfWhistle: (M) => [G.whistle(), LM(M, 'usfWhistleM', 0.35, { rough: 0.4, metal: 0.7 }), 40, {}],
    usfBar: (M) => [TOWN.bar(), LM(M, 'usfBarM', 0.16, { rough: 0.85, metal: 0 }), 3, {}],
    usfBarGlow: (M) => [TOWN.barGlow(), EM(M), 3, FL],
    usfRowWalls: (M) => [TOWN.rowWalls(), M.usfRowM || (M.usfRowM = rowMaterial(M.P)), 140, { aWake: 3, aTint: 3 }],
    usfRowTrim: (M) => [TOWN.rowTrim(), LM(M, 'usfRowTrimM', 0.12, { rough: 0.9, metal: 0 }), 140, {}],
    usfChurch: (M) => [TOWN.church(), LM(M, 'usfChurchM', 0.3, { rough: 0.9, metal: 0 }), 2, {}],
    usfChurchGlass: (M) => [TOWN.churchGlass(), M.usfGlassM || (M.usfGlassM = churchGlassMaterial()), 2, {}],
    usfMemorial: (M) => [MEM.memorial(), LM(M, 'usfMemM', 0.3, { rough: 0.9, metal: 0 }), 2, {}],
    usfSheet: (M) => [MEM.sheet(), LM(M, 'usfSheetM', 0.25, { rough: 0.95, metal: 0, side: THREE.DoubleSide }), 6, {}],
    usfPosterPole: (M) => [MEM.posterPole(), LM(M, 'usfPosterM', 0.3, { rough: 0.9, metal: 0.1 }), 240, {}],
    usfPosterHead: (M) => [posterHead(), M.sign, 240, { aIdx: 1, aWake: 2 }],
    usfLamp: (M) => [MEM.lamp(), LM(M, 'usfLampM', 0.14, { rough: 0.6, metal: 0.4 }), 200, {}],
    usfWall: (M) => [wallGeo(), LM(M, 'usfWallM', 0.2, { rough: 0.95, metal: 0 }), 4, {}],
    usfPlate: (M) => [plateGeo(), LM(M, 'usfPlateM', 0.25, { rough: 0.5, metal: 0.6 }), 4, {}],
    usfFurnace: (M) => [furnace(), LM(M, 'usfFurnM', 0.12, { rough: 0.7, metal: 0.3 }), 2, {}],
    usfFurnaceGlow: (M) => [furnaceGlow(), EM(M), 2, FL],
    usfMoltenStream: (M) => [new THREE.CylinderGeometry(1, 1, 1, 12, 1).translate(0, -0.5, 0), MOLT(M), 12, HEAT],
    usfSpark: (M) => [sparkGeo(), M.usfSparkM || (M.usfSparkM = sparkMaterial()), 2800, { aTint: 3, aVel: 4 }],
    usfSteam: (M) => [GEO.quad(), M.usfSteamM || (M.usfSteamM = steamMaterial()), 900, { aTint: 3, aWake: 2 }],
  },
  parts: {
    // ---- the yard: sheds with their doors and whistles, stacks with their smoke, pipe racks ----
    usfShed(S, it, p, q, yaw) {
      const L = S.layers; void L.usfShed; void L.usfShedGlow; void L.usfWhistle; void L.usfSteam; if (!S.track) return;
      const T = animT(S), m = S._m, s = it.s ?? 1, B = beat(S, T);
      m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s)); L.usfShed.add(m);
      let g = (0.1 + 0.9 * smooth(it.on, it.on + 0.8, T)) * (it.dim !== undefined ? 1 - 0.8 * smooth(it.dim, it.dim + 2, T) : 1);
      g *= (0.92 + 0.08 * Math.sin(T * 7 + it.seed * 9)) * (1 + 0.45 * B.lift * B.pulse * B.e) * (0.5 + 0.45 * hash(it.seed * 7.7));
      if (it.open !== undefined) g *= 0.55 + 0.75 * smooth(it.open, it.open + 0.6, T);
      if (it.hush !== undefined) g *= 1 - 0.7 * smooth(it.hush, it.hush + 0.2, T) * (1 - smooth(it.hush + 1.6, it.hush + 1.9, T));
      _tc[0] = 0.04 + 1.3 * g; _tc[1] = 0.03 + 0.55 * g; _tc[2] = 0.03 + 0.15 * g;
      L.usfShedGlow.add(m, { aTint: _tc });
      if (g > 0.25 && Math.abs(it.x) < 80 && it.t - S.tNow < 12) { const w = local(p, yaw, 0, 0, 20 * s, S._o); poolAt(S, w.x, p.y + 0.25, w.z, 36 * s, [1, 0.5, 0.15], 0.4 * g); }
      if (it.whistle) {
        for (const wx of [-16, 14]) {
          const w = local(p, yaw, wx * s, 29.5 * s, 3 * s, _o); m.compose(w, q, S._s.set(2.4, 2.4, 2.4)); L.usfWhistle.add(m);
          // on every beat of "every scream set me free" each whistle throws a jet of steam
          if (T > it.whistle[0] - 0.5 && T < it.whistle[1] + 3 && Math.abs(it.t - S.tNow) < 14) {
            for (let back = 0; back < 3; back++) {
              const tb = S.course.timeOfBeat(B.i - back); if (tb < it.whistle[0] || tb > it.whistle[1]) continue;
              const age = T - tb;
              for (let j = 0; j < 8; j++) { const f = (age * 1.8 - j * 0.06); if (f < 0 || f > 1) continue; puff(S, w.x, w.y + 26 * Math.pow(f, 0.55) + 3, w.z, 2.6 + f * 13, 0.9, 0.86, 0.84, 0.85 * (1 - f), hash(j + tb)); }
            }
          }
        }
      }
    },
    usfStack(S, it, p, q, yaw) {
      const L = S.layers; void L.usfStack; void L.usfSteam; if (!S.track) return;
      const T = animT(S), m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.usfStack.add(m);
      glowAt(S, p.x, p.y + 82 * s, p.z, 2.6, [1, 0.1, 0.08], Math.sin(T * 3 + it.seed * 7) > 0 ? 1.6 : 0.3, 1);
      if (it.t - S.tNow < 20) { _o.set(p.x, p.y + 81 * s, p.z); plume(S, _o, T, 5, 0.09, 7, 26 * s, it.seed, 0.5 * (it.k ?? 1), [0.55, 0.5, 0.52], 0.25, 3, 0.5); }
    },
    // ---- the flare stacks: a pilot flame, and through every chorus they roar up on the downbeats ----
    usfFlare(S, it, p, q, yaw) {
      const L = S.layers; void L.usfFlare; if (!S.track) return;
      const T = animT(S), m = S._m, s = it.s ?? 1, B = beat(S, T); m.compose(p, q, S._s.set(s, s, s)); L.usfFlare.add(m);
      const roar = B.lift * (B.bar ? 1 : 0.45) * B.pulse * (0.4 + 0.6 * B.e), hf = (3 + 34 * roar + 2 * Math.sin(T * 9 + it.seed * 5)) * s;
      const tip = p.y + 66 * s, near = it.t - S.tNow < 22, nk = near ? 7 : 3;
      for (let k = 0; k < nk; k++) { const u = k / (nk - 1), wob = Math.sin(T * (11 + k) + it.seed * 9 + k) * 0.8 * u * s; glowAt(S, p.x + wob, tip + hf * u, p.z + wob * 0.5, (3.5 + 4 * (1 - u) + 4 * roar) * s, [1, 0.5 + 0.35 * (1 - u), 0.12 + 0.1 * (1 - u)], (0.9 + 1.4 * roar) * (1 - 0.6 * u)); }
      if (roar > 0.2 && near) glowAt(S, p.x, tip + hf * 0.4, p.z, 34 * s * roar, [1, 0.45, 0.1], 0.25 * roar);
    },
    usfPipes(S, it, p, q) { const L = S.layers; void L.usfPipes; if (!S.track) return; const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.usfPipes.add(m); },
    // ---- a crane over the road: its trolley drifting, the hook swinging, the cab lit ----
    usfCrane(S, it, p, q, yaw) {
      const L = S.layers; void L.usfCrane; void L.usfHook; void L.usfCabGlow; if (!S.track) return;
      const T = animT(S), m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.usfCrane.add(m);
      const tx = Math.sin(T * 0.3 + it.seed * 6) * 18, sw = Math.sin(T * 1.1 + it.seed * 3) * 0.06;
      const h = local(p, yaw, tx, 0, 0, S._o); S._e.set(sw, yaw, 0); const hq = (S._usfHq || (S._usfHq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(h, hq, S._s.set(1, 1, 1)); L.usfHook.add(m); _tc[0] = 1.3; _tc[1] = 1.0; _tc[2] = 0.6; L.usfCabGlow.add(m, { aTint: _tc });
      glowAt(S, h.x, h.y + 37, h.z, 1.8, [1, 0.6, 0.2], Math.sin(T * 4 + it.seed * 5) > 0.2 ? 1.2 : 0.2, 1);
    },
    usfConveyor(S, it, p, q, yaw) {
      const L = S.layers; void L.usfConveyor; void L.usfConvGlow; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.usfConveyor.add(m); _tc[0] = 1.1; _tc[1] = 0.75; _tc[2] = 0.4; L.usfConvGlow.add(m, { aTint: _tc });
      const T = animT(S); for (let k = 0; k < 3; k++) { const u = ((T * 0.12 + k / 3 + it.seed) % 1); const w = local(p, yaw, 62 - 110 * u, 9 + 21 * u + 1.9, 0, S._o); glowAt(S, w.x, w.y, w.z, 2.4, [1, 0.8, 0.5], 0.9); }
    },
    // ---- rolling stock on the sidings: ore cars, and the torpedoes glowing at their mouths ----
    usfHopper(S, it, p, q) { const L = S.layers; void L.usfHopper; if (!S.track) return; const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.usfHopper.add(m); },
    usfTorpedo(S, it, p, q, yaw) {
      const L = S.layers; void L.usfTorpedo; if (!S.track) return;
      const T = animT(S), m = S._m, B = beat(S, T); m.compose(p, q, S._s.set(1, 1, 1)); L.usfTorpedo.add(m);
      const k = 0.8 + 0.6 * B.pulse * B.lift;
      glowAt(S, p.x, p.y + 6.9, p.z, 4.2, [1, 0.6, 0.2], 1.4 * k); if (it.t - S.tNow < 10) glowAt(S, p.x, p.y + 9, p.z, 12, [1, 0.45, 0.1], 0.25 * k);
    },
    // ---- the grinders at the roadside: a fan of sparks on every beat, bigger the louder ----
    usfGrinder(S, it, p, q, yaw) {
      const L = S.layers; void L.usfSpark; if (!S.track) return;
      const T = animT(S), k = (it.k ?? 1) * smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.3, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 0.5, T)); if (k <= 0) return;
      _o.set(p.x, p.y + (it.y ?? 9), p.z);
      glowAt(S, _o.x, _o.y, _o.z, 7, [1, 0.6, 0.2], 0.5 * k);
      if (it.t - S.tNow > 9) return;
      const B = beat(S, T);
      for (let back = 0; back < 2; back++) { const tb = S.course.timeOfBeat(B.i - back), e = S.course.beatEnergy[B.i - back] ?? 0.5; burst(S, _o, yaw, T, tb, Math.round(6 + 12 * e * Math.min(k, 1.3)), 12 + 14 * e, it.seed * 13 + B.i - back, k * (0.55 + 0.75 * e), 0.8, 1.1, 1.15); }
    },
    // ---- the rolling mill: a slab shot down the table on every beat ----
    usfMill(S, it, p, q, yaw) {
      const L = S.layers; void L.usfRollers; void L.usfMoltenSlab; void L.usfSteam; if (!S.track) return;
      const T = animT(S), m = S._m, B = beat(S, T); m.compose(p, q, S._s.set(1, 1, 1)); L.usfRollers.add(m);
      const f = B.f, z = -34 + 70 * (1 - Math.pow(1 - f, 2.2));
      if (Math.abs(z) < 26) { const w = local(p, yaw, 0, 0, z, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.usfMoltenSlab.add(m, { aHeat: 0.7 + 0.3 * B.pulse }); glowAt(S, w.x, w.y + 19, w.z, 30, [1, 0.45, 0.12], 0.45); poolAt(S, w.x, p.y + 0.3, w.z, 40, [1, 0.45, 0.12], 0.45); }
      if (it.spray && it.t - S.tNow < 12) { const w = local(p, yaw, 0, 17, 14, _o); const k = B.pulse * (B.bar ? 1 : 0.5); for (let j = 0; j < 5; j++) puff(S, w.x + (hash(j + B.i) - 0.5) * 6, w.y + 2 + j * 1.8 * (1 - B.f), w.z, 3 + 4 * B.f + j, 0.8, 0.78, 0.76, 0.55 * k, hash(j * 3 + B.i)); }
    },
    usfReheat(S, it, p, q) {
      const L = S.layers; void L.usfReheat; void L.usfReheatDoors; if (!S.track) return;
      const T = animT(S), m = S._m, B = beat(S, T); m.compose(p, q, S._s.set(1, 1, 1)); L.usfReheat.add(m);
      const g = 0.6 + 1.2 * (B.bar ? B.pulse : 0.3 * B.pulse); _tc[0] = 1.4 * g; _tc[1] = 0.6 * g; _tc[2] = 0.18 * g; L.usfReheatDoors.add(m, { aTint: _tc });
      poolAt(S, p.x, p.y + 0.3, p.z, 50, [1, 0.5, 0.15], 0.3 * g);
    },
    // ---- the cooling yard: rows of ingots going from orange to dark ----
    usfIngots(S, it, p, q, yaw) {
      const L = S.layers; void L.usfMoltenIngot; if (!S.track) return;
      const T = animT(S), m = S._m, heat = 0.04 + 0.32 * (it.heat ?? 1) * (1 - smooth(it.cool ?? 1e9, (it.cool ?? 1e9) + (it.coolFor ?? 12), T));
      for (let lv = 0; lv < 2; lv++) for (let r = 0; r < 3 - lv; r++) for (let j = 0; j < 2; j++) { const w = local(p, yaw, -(r * 6.5 + lv * 3.2) * Math.sign(it.x), lv * 4, (j - 0.5) * 13, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.usfMoltenIngot.add(m, { aHeat: heat * (0.7 + 0.5 * hash(lv * 9 + r * 4 + j + it.seed)) }); }
      if (heat > 0.12 && it.t - S.tNow < 14) glowAt(S, p.x, p.y + 4, p.z, 24, [1, 0.4, 0.1], 0.35 * (heat - 0.1));
    },
    // ---- the cast: iron running in its runner, surging on the beat, sparks springing off it ----
    usfRunner(S, it, p, q, yaw) {
      const L = S.layers; void L.usfRunner; void L.usfMoltenRunner; void L.usfSpark; if (!S.track) return;
      const T = animT(S), m = S._m, B = beat(S, T); m.compose(p, q, S._s.set(1, 1, 1)); L.usfRunner.add(m);
      const fill = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 1.2, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 3, T));
      if (fill > 0.02) {
        L.usfMoltenRunner.add(m, { aHeat: (0.6 + 0.22 * B.pulse) * fill });
        if (it.t - S.tNow < 12) { poolAt(S, p.x, p.y + 1.4, p.z, 24, [1, 0.5, 0.12], 0.7 * fill); glowAt(S, p.x, p.y + 4, p.z, 18, [1, 0.55, 0.18], 0.35 * fill); }
        if (it.t - S.tNow < 7) { _o.set(p.x, p.y + 1.4, p.z); fountain(S, _o, yaw, T, 6, 10, it.seed * 9, fill, 1.4); }
      }
    },
    // ---- the town: a terrace of houses, some windows lit, a porch light or two ----
    usfRow(S, it, p, q, yaw) {
      const L = S.layers; void L.usfRowWalls; void L.usfRowTrim; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1));
      L.usfRowWalls.add(m, { aWake: [it.wake ?? 0.5, it.seed, 0], aTint: it.tint });
      L.usfRowTrim.add(m);
      if (Math.abs(it.x) < 110) for (let k = 0; k < 6; k++) if (hash(k + it.seed * 31) < 0.45) { const w = local(p, yaw, -15 + k * 6, 3.0, 6.4, S._o); glowAt(S, w.x, w.y, w.z, 1.4, [1, 0.75, 0.4], 1.2); poolAt(S, w.x, p.y + 0.6, w.z + 0.0, 6, [1, 0.7, 0.35], 0.4); }
    },
    // ---- sodium lamps: along the street, and up her walk home (each comes on at its time) ----
    usfLamp(S, it, p, q, yaw) {
      const L = S.layers; void L.usfLamp; if (!S.track) return;
      const T = animT(S), m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.usfLamp.add(m);
      let k = it.on !== undefined ? smooth(it.on, it.on + 0.12, T) * (0.75 + 0.25 * (Math.sin(T * 40 + it.seed * 9) > -0.6 ? 1 : 0.3) * (T < it.on + 0.6 ? 1 : 0) + 0.25 * (T >= it.on + 0.6 ? 1 : 0)) : 1;
      if (it.off !== undefined) k *= 1 - smooth(it.off, it.off + 0.15, T);
      k *= it.dim ?? 1;
      const w = local(p, yaw, 0, 8.7, 2.5, S._o), lc = col(S.P.lamp);
      glowAt(S, w.x, w.y, w.z, 3.4, lc, 1.5 * k); poolAt(S, w.x, p.y + 0.1, w.z, 16, lc, 0.75 * k);
    },
    // ---- the posters on the poles: MISSING, all the way along ----
    usfPoster(S, it, p, q, yaw) {
      const L = S.layers; void L.usfPosterPole; void L.usfPosterHead; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1.4, it.s ?? 1.4, it.s ?? 1.4)); L.usfPosterPole.add(m); L.usfPosterHead.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
      const w = local(p, yaw, 0, 7.4 * (it.s ?? 1.4), 2.4 * (it.s ?? 1.4), S._o), lc = col(S.P.lamp);
      glowAt(S, w.x, w.y, w.z, 3, lc, 1.0 * (it.lit ?? 1)); poolAt(S, w.x, p.y + 0.1, w.z, 12, lc, 0.5 * (it.lit ?? 1));
    },
    // ---- the boards: his words painted on a brick end wall, on a sheet on the fence, on a steel plate ----
    usfWallBoard(S, it, p, q, yaw) {
      const L = S.layers; void L.usfWall; void L.board; if (!S.track) return;
      const m = S._m, s = it.s ?? 1.25, fy = S.course.sample(it.t).yaw + (it.x > 0 ? Math.PI / 2 + 0.55 : -Math.PI / 2 - 0.55);
      S._e.set(0, fy, 0); const fq = (S._usfFq || (S._usfFq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(s, s, s)); L.usfWall.add(m);
      const w = local(p, fy, 0, (9.4 - 13 * 0.9) * s, 3.15 * s, S._o); m.compose(w, fq, S._s.set(0.9 * s, 0.9 * s, 0.9 * s)); L.board.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const lw = local(p, fy, 0, 1.0, 9 * s, S._o); glowAt(S, lw.x, lw.y, lw.z, 3, [1, 0.8, 0.5], 0.6); poolAt(S, lw.x, p.y + 0.15, lw.z, 18 * s, [1, 0.6, 0.3], 0.5);
    },
    usfSheetBoard(S, it, p, q, yaw) {
      const L = S.layers; void L.usfSheet; void L.board; if (!S.track) return;
      const m = S._m, s = it.s ?? 1.25, fy = S.course.sample(it.t).yaw + (it.x > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5);
      S._e.set(0, fy, 0); const fq = (S._usfFq || (S._usfFq = new THREE.Quaternion())).setFromEuler(S._e);
      const c = local(p, fy, 0, 3.6 * s, 0, S._o); m.compose(c, fq, S._s.set(s, s, s)); L.usfSheet.add(m);
      const w = local(p, fy, 0, (3.6 - 13 * 0.72) * s, 0.4 * s, _o); m.compose(w, fq, S._s.set(0.72 * s, 0.72 * s, 0.72 * s)); L.board.add(m, { aIdx: it.idx, aWake: [0.7, 0] });
      const T = animT(S); for (const sx of [-5, 5]) { const lw = local(p, fy, sx * s, 0.4, 1.5 * s, S._o); glowAt(S, lw.x, lw.y, lw.z, 1.2, [1, 0.7, 0.35], 1.2 * (0.85 + 0.15 * Math.sin(T * 17 + sx))); }
      poolAt(S, p.x, p.y + 0.12, p.z, 14 * s, [1, 0.65, 0.35], 0.5);
    },
    usfPlateBoard(S, it, p, q, yaw) {
      const L = S.layers; void L.usfPlate; void L.board; if (!S.track) return;
      const m = S._m, s = it.s ?? 1.25, fy = S.course.sample(it.t).yaw + (it.x > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5);
      S._e.set(0, fy, 0); const fq = (S._usfFq || (S._usfFq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(s, s, s)); L.usfPlate.add(m);
      const w = local(p, fy, 0, (8.2 - 13 * 0.8) * s, 0.42 * s, S._o); m.compose(w, fq, S._s.set(0.8 * s, 0.8 * s, 0.8 * s)); L.board.add(m, { aIdx: it.idx, aWake: [0.85, 0] });
      const lw = local(p, fy, 0, 13 * s, 2.5 * s, S._o); glowAt(S, lw.x, lw.y, lw.z, 2.2, [0.75, 0.85, 1], 1.0); poolAt(S, p.x, p.y + 0.12, p.z, 16 * s, [0.6, 0.75, 1], 0.4);
    },
    // ---- the set-pieces, each on its line ----
    usfProp(S, it, p, q, yaw) {
      const L = S.layers;
      for (const k of ['usfPitPool', 'usfLadle', 'usfLadleTop', 'usfMolds', 'usfMoltenMold', 'usfHammer', 'usfRam', 'usfMoltenBillet', 'usfCoilStand', 'usfMoltenCoil', 'usfConverter', 'usfSlagPot', 'usfMoltenStream', 'usfSoakPit', 'usfSoakLid', 'usfTongs', 'usfMoltenSoak', 'usfQuench', 'usfGate', 'usfBar', 'usfBarGlow', 'usfChurch', 'usfChurchGlass', 'usfMemorial', 'usfFurnace', 'usfFurnaceGlow', 'usfTrough', 'usfMoltenTrough', 'usfSpark', 'usfSteam', 'usfCrane', 'usfHook', 'usfCabGlow', 'sign', 'signPole']) void L[k];
      if (!S.track) return;
      const T = animT(S), s = it.s ?? 1, m = S._m, k = it.kind, B = beat(S, T), near = it.t - S.tNow < 16;
      const at = S._usfAt || (S._usfAt = new THREE.Vector3()); at.set(p.x, p.y + (it.y ?? 0), p.z);
      const W = (x, y, z, out = S._o) => local(at, yaw, x * s, y * s, z * s, out);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = W(x, y, z); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, c, k2) => { const w = W(x, y, z); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2, c = [1, 0.5, 0.15], r = 60, x = 0, z = 0) => { const w = W(x, 0, z); poolAt(S, w.x, at.y + 0.2, w.z, r * s, c, k2); };
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'pour' || k === 'castpit') {
        // the ladle comes up and tips; the stream into the molds (or the pit), sparks off where it lands
        const up = smooth(it.lift ?? -1e9, (it.lift ?? -1e9) + 1.6, T), tip = smooth(it.go ?? 1e9, (it.go ?? 1e9) + 0.45, T) * (1 - smooth(it.stop ?? 1e9, (it.stop ?? 1e9) + 1, T));
        const pit = k === 'castpit', ly = pit ? 6 + 5 * up : 5 + 9 * up, lx = pit ? 0 : -8;
        put('usfLadle', lx, ly, 0, quat('_usfLq' + (pit ? 1 : 0), 0, 0, -0.95 * tip)); put('usfLadleTop', lx, ly, 0, quat('_usfLq' + (pit ? 1 : 0), 0, 0, -0.95 * tip), s, { aHeat: 0.7 });
        if (!pit) { for (let j = 0; j < 3; j++) put('usfMolds', 0, 0, -10 + j * 10); const fill = smooth(it.go ?? 1e9, (it.go ?? 1e9) + 4, T); for (let j = 0; j < 3; j++) put('usfMoltenMold', 0, 0, -10 + j * 10, q, s, { aHeat: 0.25 + 0.95 * fill * (1 - 0.2 * j) }); }
        const land = pit ? (it.floor ?? 0.4) : 6;
        if (tip > 0.05) {
          const lip = W(lx + 13, ly + 12, 0, _o2), len = (ly + 12 - land) * s;
          m.makeScale(1.8 * s * tip, len, 1.8 * s * tip); m.setPosition(lip.x, lip.y, lip.z); L.usfMoltenStream.add(m, { aHeat: 0.82 });
          if (near) { const o = W(lx + 13, land, 0, _o); fountain(S, o, yaw, T, pit ? 50 : 34, pit ? 20 : 14, it.t, tip * (pit ? 1.2 : 1)); }
          light(lx + 13, land + 1, 0, pit ? 30 : 42, [1, 0.6, 0.2], 0.7 * tip); light(lx + 13, ly + 12, 0, pit ? 14 : 30, [1, 0.6, 0.2], 0.45 * tip);
          for (let j = 0; j < 5; j++) light(lx + 13, land + (ly + 12 - land) * (j + 0.5) / 5, 0, 6, [1, 0.62, 0.22], 0.7 * tip);
        }
        light(lx, ly + 8, 0, pit ? 18 : 34, [1, 0.45, 0.12], 0.3 + 0.35 * up); spot(0.4 + 0.6 * tip, [1, 0.5, 0.15], pit ? 50 : 60, lx + 11);
        if (pit) {
          // the pit under the road, full of it: brighter as the stream fills it
          const fillP = 0.55 + 0.6 * smooth(it.go ?? 1e9, (it.go ?? 1e9) + 1.5, T), px = it.pitX ?? 15;
          const pw = W(px, 0, 0, _o); pw.y = (S.floorFn ? S.floorFn(it.t, it.x - px * s) : at.y) + 0.25;
          m.compose(pw, q, S._s.set(1.7, 1, 1.2)); L.usfPitPool.add(m, { aHeat: fillP * (0.42 + 0.12 * B.pulse) });
          poolAt(S, pw.x, pw.y + 0.7, pw.z, 50, [1, 0.5, 0.12], 0.6 * fillP); glowAt(S, pw.x, pw.y + 3, pw.z, 40, [1, 0.45, 0.1], 0.25 * fillP);
        }
      }
      else if (k === 'hammer') {
        // the ram falls on every hit of the riff; sparks off the billet
        put('usfHammer'); let fall = 0, hit = 0, last = -1e9;
        for (const h of it.hits || []) { const d = T - h; if (d > -0.22 && d < 0) fall = Math.max(fall, 1 + d / 0.22); if (d >= 0 && d < 0.6) { hit = Math.max(hit, 1 - d / 0.6); fall = Math.max(fall, 1 - d / 0.6); } if (d >= 0) last = Math.max(last, h); }
        put('usfRam', 0, 30 - 18 * fall * fall, 0); put('usfMoltenBillet', 0, 0, 0, q, s, { aHeat: 0.7 + 0.5 * hit });
        if (near && last > -1e8) { const o = W(0, 11, 0, _o); burst(S, o, yaw, T, last, 60, 22, last * 7, 1.3, 1.2, 0.7, 1.3); }
        light(0, 11, 4, 40, [1, 0.6, 0.2], 0.4 + 1.6 * hit); spot(0.5 + 0.8 * hit);
      }
      else if (k === 'coil') { put('usfCoilStand'); S._e.set(T * 1.6, yaw, 0); const cq = (S._usfCq || (S._usfCq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(W(0, 12, 0), cq, S._s.set(s, s, s)); L.usfMoltenCoil.add(m, { aHeat: 0.75 + 0.2 * B.pulse }); light(0, 12, 0, 40, [1, 0.45, 0.12], 0.6); spot(0.6); }
      else if (k === 'converter') {
        // tipped, then upright for the blow: a jet of flame and sparks up into the sky on the drop
        const blow = smooth(it.blow ?? 1e9, (it.blow ?? 1e9) + 0.35, T) * (1 - smooth(it.end ?? 1e9, (it.end ?? 1e9) + 2, T));
        const tilt = smooth(it.tilt ?? -1e9, (it.tilt ?? -1e9) + 3, T);
        put('usfConverter', 0, 0, 0, quat('_usfVq', 0, 0, 0.5 * (1 - tilt) * (1 - blow)));
        const surge = 0.75 + 0.5 * B.pulse * (B.bar ? 1 : 0.6);
        for (let j = 0; j < 16; j++) { const f = ((T * 1.8 + j / 16) % 1); const w = W(Math.sin(j * 2.1 + T * 3) * 4 * f, 33 + f * 46 * surge, Math.cos(j * 1.7) * 4 * f); glowAt(S, w.x, w.y, w.z, (9 + f * 18) * s, [1, 0.85 - 0.4 * f, 0.5 - 0.3 * f], 1.5 * (1 - f) * blow); }
        light(0, 33, 0, 26 * surge, [1, 0.8, 0.45], 1.4 * blow);
        if (near && blow > 0.05) { const o = W(0, 34, 0, _o); fountain(S, o, yaw, T, 60, 30, it.t, blow * 1.2, 1.6, 0.6); }
        light(0, 40, 0, 100, [1, 0.6, 0.2], 0.8 * blow); spot(0.4 + 0.8 * blow, [1, 0.6, 0.2], 90);
      }
      else if (k === 'slag') {
        // the pot tips, a glowing fall down the heap
        const go = smooth(it.go ?? -1e9, (it.go ?? -1e9) + 1, T); put('usfSlagPot', 0, 14, 0, quat('_usfSq', 0, 0, -1.3 * go));
        for (let j = 0; j < 26; j++) { const f = ((T * 0.6 + j / 26) % 1); const w = W(9 + f * 16, 20 - f * 20, Math.sin(j * 1.9) * 5); glowAt(S, w.x, w.y, w.z, (3 + f * 3) * s, [1, 0.5 - 0.3 * f, 0.1], 1.2 * go * (1 - 0.5 * f)); }
        light(14, 10, 0, 50, [1, 0.45, 0.1], 0.5 * go); spot(0.6 * go, [1, 0.4, 0.1], 60, 14);
      }
      else if (k === 'soak') {
        // the soaking pit: the lid slides off, and the white-hot ingot comes up slow on the tongs
        const open = smooth(it.open, it.open + 0.7, T), u = smooth(it.rise, it.rise + it.dur, T), hy = 2.4 + 15 * u;
        put('usfSoakPit'); put('usfSoakLid', -10 * open, 2.6, 0);
        put('usfMoltenSoak', 0, hy - 8 + 0.5, 0, q, s, { aHeat: 1.05 + 0.25 * open });
        put('usfTongs', 0, hy + 0.6, 0);
        const g = open * (0.4 + 0.6 * u);
        light(0, hy - 3, 0, 16 + 18 * u, [1, 0.8, 0.5], 1.0 * g); light(0, hy + 4, 0, 70, [1, 0.55, 0.2], 0.22 * g); spot(1.0 * g, [1, 0.7, 0.4], 60);
        if (near && g > 0.05) { const o = W(0, hy - 4, 0, _o); fountain(S, o, yaw, T, 18, 5, it.t, g * 0.7, 1.4, 1.4); plume(S, W(0, 3, 0, _o2), T, 8, 0.4, 8, 14, it.seed ?? 0.3, 0.55 * g, [0.7, 0.65, 0.6], 0.8, 2); }
      }
      else if (k === 'quench') {
        // the quench tower lets go: a cloud up out of it, lit orange from below, as tall as the sky
        put('usfQuench');
        const go = smooth(it.go, it.go + 0.4, T) * (1 - smooth(it.go + 7, it.go + 10, T));
        if (go > 0.01) { const o = W(0, 47, 0, _o); plume(S, o, T, 26, 0.32, 11, 50 * s, it.t, 0.95 * go, [0.9, 0.84, 0.8], 0.6, 9); }
        light(0, 50, 0, 70, [1, 0.6, 0.3], 0.18 * go);
      }
      else if (k === 'gate') {
        // the mill gate over the road, its lamps; the guard's hut lit
        put('usfGate'); for (const x of [-12, 12]) { light(x, 23, 1.8, 3.6, [1, 0.75, 0.4], 1.6); const w = W(x, 0, 6); poolAt(S, w.x, at.y + 0.2, w.z, 22, [1, 0.6, 0.3], 0.6); }
        light(-26, 2.4, 4.7, 2.2, [1, 0.85, 0.6], 1.2);
      }
      else if (k === 'bar') {
        // the bar at the gate: its windows warm, the sign on the roof buzzing on as he starts singing
        put('usfBar');
        _tc[0] = 1.5; _tc[1] = 0.85; _tc[2] = 0.35; put('usfBarGlow', 0, 0, 0, q, s, { aTint: _tc });
        const on = smooth(it.on, it.on + 0.05, T), fl = T < it.on + 0.7 ? (hash(Math.floor(T * 18)) > 0.45 ? 1 : 0.15) : 1;
        const sw = W(0, 12.4 - 10.4 * 0.9, 4.4); m.compose(sw, q, S._s.set(0.9 * s, 0.9 * s, 0.9 * s)); L.sign.add(m, { aIdx: it.idx, aWake: [0.08 + 0.92 * on * fl, 0] });
        light(0, 12.3, 5.2, 16, [1, 0.12, 0.08], 0.5 * on * fl);
        light(-1.5, 3.2, 7.4, 1.6, [1, 0.8, 0.5], 1.4); spot(0.7, [1, 0.6, 0.3], 26, 0, 9);
        for (let j = 0; j < 3; j++) { const w = W(-6 + j * 6, 0, 12); S.parkedCar(w.x, at.y, w.z, yaw + (j % 2 ? 0.2 : -0.15), [[0.35, 0.3, 0.28], [0.5, 0.12, 0.1], [0.25, 0.3, 0.38]][j]); }
      }
      else if (k === 'church') {
        // the church on the hill: lit, until "He left you here with me", and then one window after another goes out
        put('usfChurch'); put('usfChurchGlass');
        const dk = 9.2 * smooth(it.dark, it.dark + (it.darkFor ?? 1.9), T);
        if (L.usfChurchGlass.mesh.material.uniforms) { L.usfChurchGlass.mesh.material.uniforms.uDark.value = dk; L.usfChurchGlass.mesh.material.uniforms.uTime.value = T; }
        const lit = 1 - smooth(it.dark, it.dark + (it.darkFor ?? 1.9), T);
        const cross = T < it.dark + (it.darkFor ?? 1.9) + 0.4 ? (T > it.dark + (it.darkFor ?? 1.9) - 0.4 && hash(Math.floor(T * 15)) < 0.5 ? 0.2 : 1) : 0;
        light(-17, 53.2, 0, 3.4, [1, 0.85, 0.6], 1.8 * cross); light(-17, 53.2, 0, 22, [1, 0.6, 0.3], 0.18 * cross);
        light(0, 7, 9, 46, [1, 0.6, 0.3], 0.3 * lit); spot(0.6 * lit + 0.05, [1, 0.6, 0.3], 50, 0, 10);
        light(-17, 40, 6, 30, [0.8, 0.7, 0.6], 0.16 * lit);
        // the floodlights at its foot, up the tower and the front; they go with the glass
        for (const fx of [-21, -13, -4, 6, 14]) light(fx, 1.2, 11, 3.2, [1, 0.85, 0.6], 1.5 * lit);
      }
      else if (k === 'memorial') {
        // at the fence: ribbons, flowers, a frame, twenty-three candles
        put('usfMemorial');
        for (let j = 0; j < FLAMES.length; j++) { const [x, y, z] = FLAMES[j], f = 0.8 + 0.2 * Math.sin(T * (13 + j) + j * 2.3); light(x, y, z, 0.55, [1, 0.72, 0.32], 2.2 * f); }
        light(0, 0.6, 1.2, 12, [1, 0.6, 0.3], 0.35); spot(0.9, [1, 0.62, 0.32], 16, 0, 1.2);
        light(1.2, 1.0, 0.5, 1.4, [0.9, 0.88, 0.85], 0.35);
      }
      else if (k === 'furnace2') {
        // the next furnace along, close to the road, its cast house wide open
        put('usfFurnace'); const g = 0.9 + 0.5 * B.pulse * B.lift; _tc[0] = 1.6 * g; _tc[1] = 0.65 * g; _tc[2] = 0.18 * g; put('usfFurnaceGlow', 0, 0, 0, q, s, { aTint: _tc });
        light(0, 10, 52, 80, [1, 0.5, 0.15], 0.5 * g); spot(0.8 * g, [1, 0.5, 0.15], 120, 0, 50);
        if (it.t - S.tNow < 40) { plume(S, W(0, 90, 0, _o), T, 10, 0.06, 6, 60 * s, 0.3, 0.6, [0.7, 0.6, 0.6], 0.5, 4, 0.3); plume(S, W(110, 112, -30, _o), T, 8, 0.07, 6, 50 * s, 0.7, 0.5, [0.6, 0.55, 0.55], 0.3, 4, 0.5); }
      }
      else if (k === 'tap') {
        // the tap: iron out of the furnace's hole along the trough, under the road where it breaks
        const go = smooth(it.go, it.go + 0.5, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 3, T));
        put('usfTrough', 0, 0, 0, q, 1); put('usfMoltenTrough', 0, 0, 0, q, 1, { aHeat: (0.3 + 0.5 * go) * (0.92 + 0.15 * B.pulse) });
        for (let j = -6; j <= 6; j += 3) { const w = W(j * 11, 2, 0); glowAt(S, w.x, w.y, w.z, 16, [1, 0.5, 0.12], 0.35 * go); poolAt(S, w.x, at.y + 0.4, w.z, 22, [1, 0.5, 0.12], 0.4 * go); }
        if (near && go > 0.05) for (const sx of [-50, -20, 20, 50]) { const o = W(sx, 2, 0, _o); fountain(S, o, yaw, T, 12, 10, sx + it.t, go * 0.9, 1.4); }
        const src = W(it.src ?? -75, 4, 0, _o2); fountain(S, src, yaw + Math.PI / 2, T, 40, 26, it.t * 3, go * 1.3, 0.7, 0.5); glowAt(S, src.x, src.y, src.z, 30, [1, 0.8, 0.5], 1.2 * go);
      }
    },
  },
  kits: {
    // the yard: sheds and stacks back from the road, pipe racks close in (sides: which sides)
    usfYard(S, z, R) {
      for (const side of z.sides || [-1, 1]) {
        for (let t = z.from + R() * 0.3; t < z.to; t += (z.every ?? 1.5) + R() * 0.6) S.items.push({ t, x: side * ((z.x ?? 46) + R() * 10), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: 0.9 + R() * 0.4, seed: R(), on: (z.on ?? -1e9) + R() * 1.5, dim: z.dim, open: z.open !== undefined ? z.open + R() * 1.5 : undefined, hush: z.hush, whistle: z.whistle && R() < 0.8 ? z.whistle : null, h: 0, parts: 'usfShed', ahead: 46 });
        for (let t = z.from + R(); t < z.to; t += 2.2 + R() * 1.6) S.items.push({ t, x: side * (90 + R() * 80), rot: 0, s: 0.8 + R() * 0.5, seed: R(), k: z.smoke ?? 1, h: 0, parts: 'usfStack', ahead: 46 });
        if (z.pipes !== false) for (let t = z.from; t < z.to; t += 0.42) S.items.push({ t, x: side * (z.pipeX ?? 23), rot: 0, h: 0, parts: 'usfPipes', ahead: 26 });
      }
    },
    usfCranes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 3.0) S.items.push({ t, x: 0, rot: 0, seed: R(), ladle: z.ladles ? R() < 0.6 : false, h: 0, parts: 'usfCrane', ahead: 40 }); },
    usfConveyors(S, z, R) { for (const t of z.at) S.items.push({ t, x: 0, rot: R() < 0.5 ? 0 : Math.PI, seed: R(), h: 0, parts: 'usfConveyor', ahead: 44 }); },
    usfGrinders(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push({ t: t + R() * 0.2, x: (z.side ?? (R() < 0.5 ? -1 : 1)) * ((z.x ?? 26) + R() * 6), y: (z.y ?? 6) + R() * 6, rot: R() * 6.28, seed: R(), k: z.k, on: z.on, off: z.off, h: 0, parts: 'usfGrinder', ahead: 30 }); },
    usfMill(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 34), rot: 0, seed: R(), spray: R() < 0.35, h: 0, parts: 'usfMill', ahead: 36 }); },
    usfReheat(S, z) { for (const [t, x] of z.at) S.items.push({ t, x, rot: x > 0 ? Math.PI : 0, h: 0, parts: 'usfReheat', ahead: 40 }); },
    usfIngots(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 28), rot: 0, seed: R(), heat: z.heat, cool: z.cool, coolFor: z.coolFor, h: 0, parts: 'usfIngots', ahead: 36 }); },
    usfRunners(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 24), rot: 0, seed: R(), on: (z.on ?? -1e9) + Math.max(0, t - z.from) * (z.wave ?? 0), off: z.off, h: 0, parts: 'usfRunner', ahead: 40 }); },
    usfFlares(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 2.4) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.8, x: side * ((z.x ?? 70) + R() * 50), rot: 0, s: 0.9 + R() * 0.4, seed: R(), h: 0, parts: 'usfFlare', ahead: 46 }); },
    // cars on the sidings, nose to tail
    usfSidings(S, z, R) { for (const side of z.sides || [-1, 1]) { const x = side * (z.x ?? 30); for (let t = z.from + R() * 0.3; t < z.to; t += (z.every ?? 0.32) * (R() < 0.15 ? 3 : 1)) S.items.push({ t, x: x + (R() < 0.5 ? 2.5 : -2.5), rot: 0, seed: R(), h: 0, parts: z.kind === 'torpedo' ? 'usfTorpedo' : 'usfHopper', ahead: 30 }); } },
    // the town at the gate: terraces stepping up the hill on one side, three rows deep
    usfTown(S, z, R) {
      const tints = [0x8a4a3a, 0x7a5a48, 0x9a8a78, 0x6a6a78, 0x8a7a58, 0x7a3a2e, 0x8a8478];
      for (const [x0, gap] of [[46, 0.62], [74, 0.7], [104, 0.8], [136, 0.9]]) for (let t = z.from + R() * 0.4; t < z.to; t += gap + R() * 0.25) {
        const c = new THREE.Color(tints[Math.floor(R() * tints.length)]);
        if (x0 < 80 && (z.clear || []).some(([a, b]) => t > a && t < b)) continue;
        S.items.push({ t, x: z.side * ((z.xOff ?? 0) + x0 + R() * 8), rot: SIDE(z.side) + (R() - 0.5) * 0.12, seed: R(), tint: [c.r, c.g, c.b], wake: (z.wake ?? 0.35) + R() * 0.45, h: 0, parts: 'usfRow', ahead: 46 });
      }
    },
    // sodium lamps along both sides of the street (and a list of them with their own times)
    usfLamps(S, z, R) {
      if (z.from !== undefined) for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of z.sides || [-1, 1]) S.items.push({ t, x: side * (z.x ?? 19), rot: SIDE(side), seed: R(), dim: z.dim, off: z.off, h: 0, parts: 'usfLamp', ahead: 34 });
      for (const [t, x, on] of z.at || []) S.items.push({ t, x, rot: SIDE(x) + (z.turn ?? 0), seed: R(), on, h: 0, parts: 'usfLamp', ahead: 40 });
    },
    usfPosters(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) if (!(z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) S.items.push({ t: t + (side > 0 ? z.every / 2 : 0), x: side * (z.x ?? 21), rot: SIDE(side), s: 1.5, seed: R(), idx: S.atlas.index[z.sign ?? 'USFMISSING'], h: 0, parts: 'usfPoster', ahead: 30 }); },
    usfSets(S, z) {
      for (const c of z.at) S.items.push({ ...c, rot: c.rot ?? (c.face === 'side' ? SIDE(c.x) : c.face === 'road' ? 0 : FACE(c.x)), s: c.s ?? 1, h: c.h ?? 0, idx: c.sign ? S.atlas.index[c.sign] : undefined, parts: 'usfProp', ahead: c.ahead ?? 44 });
    },
  },
});

// the windowed walls of the terraces, fogged like the rest
function rowMaterial(P) {
  const m = buildingMaterial(P, [3.0, 2.9], { floors: 2, sill: 1.0 });
  const ob = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { ob(sh, r); fogPatch(sh); };
  m.customProgramCacheKey = () => 'usf-rowwalls';
  return m;
}
// a poster's header: its own little quad on the shared sign sheet
function posterHead() { const g = new THREE.PlaneGeometry(1.0, 0.31); g.translate(0, 3.18, 0.19); return g; }
// a brick end wall the opening lines are painted on (the words are a board on it)
function wallGeo() {
  const parts = [], P = (g, hex) => { const c = new THREE.Color(hex); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const b = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  parts.push(P(b(17, 18, 3, 0, 9, 1.5), 0x5a2a20), P(b(17.6, 0.8, 3.6, 0, 18.3, 1.5), 0x2a1e1a));
  for (let k = 0; k < 9; k++) parts.push(P(b(17.02, 0.06, 3.02, 0, 1 + k * 2, 1.5), 0x4a2018));
  parts.push(P(b(1.2, 1.4, 0.3, 6.5, 3.2, 3.1), 0x1a1210), P(b(0.25, 18, 0.25, -8.2, 9, 3.1), 0x2a2a2e));
  return merge(parts);
}
// the steel plate the silence is written on: a frame on two legs
function plateGeo() {
  const parts = [], P = (g, hex) => { const c = new THREE.Color(hex); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const b = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  parts.push(P(b(14.4, 5.4, 0.3, 0, 8.2, 0), 0x1c2028), P(b(15, 0.4, 0.5, 0, 11, 0), 0x2a3038), P(b(15, 0.4, 0.5, 0, 5.4, 0), 0x2a3038));
  for (const x of [-6, 6]) parts.push(P(b(0.5, 11, 0.5, x, 5.5, -0.3), 0x2a3038));
  parts.push(P(b(0.3, 2.6, 0.3, 0, 12.3, 1.6), 0x2a3038), P(b(0.3, 0.3, 2.4, 0, 13.5, 1.0), 0x2a3038));
  return merge(parts);
}

// ---------- the end: the blast furnace at dawn ----------
export class FurnaceFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    const s = cfg.s ?? 1.4;
    this.mesh = new THREE.Mesh(furnace(seeded(11)), litMat('finFurn', 0.14, { rough: 0.7, metal: 0.3 })); this.group.add(this.mesh);
    this.glowMat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 1 }, uFog: FOG.uUsfFog, uFogD: FOG.uUsfFogD }, vertexShader: `varying vec3 vC; varying float vF; uniform float uFogD; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = 1.0 - exp(-pow(length(mv.xyz) * uFogD, 1.5)); gl_Position = projectionMatrix * mv; }`, fragmentShader: `uniform float uK; uniform vec3 uFog; varying vec3 vC; varying float vF; void main(){ gl_FragColor = vec4(mix(vC * vec3(1.6, 0.68, 0.2) * uK, uFog, clamp(vF, 0.0, 1.0) * 0.7), 1.0); }`, vertexColors: true });
    this.glow = new THREE.Mesh(furnaceGlow(), this.glowMat); this.group.add(this.glow);
    this.group.scale.setScalar(s);
    this.lit = 0.6; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const c = this.course, gy = this.gy || ((t, x) => usfGround(c, t, x));
    track.ground(this.t, this.x, this._p); this._p.y = gy(this.t, this.x);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, c.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    this.lit += ((this.fired ? 1.0 + 0.6 * this.earned : 0.6) - this.lit) * Math.min(1, dt * 0.8);
    this.glowMat.uniforms.uK.value = this.lit;
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.4, T = songT, W = (x, y, z) => this._w.set(x, y, z).applyMatrix4(this.group.matrixWorld);
    // the cast house doors pouring light, the iron running out under them to the cars
    W(0, 6, 52); S.glow(this._w.x, this._w.y, this._w.z, 40 * s, [1, 0.5, 0.15], 0.7 * this.lit); S.pool(this._w.x, this._p.y + 0.3, this._w.z, 80 * s, [1, 0.5, 0.15], 0.9 * this.lit);
    for (let j = 0; j < 8; j++) { W(-14 + j * 4, 1.5, 54 + (j % 3) * 4); S.glow(this._w.x, this._w.y, this._w.z, 8 * s, [1, 0.6, 0.2], 0.8 * this.lit); }
    // three hot-metal cars on the track in front of it, each taking its stream of iron
    const L = S.layers;
    if (L.usfTorpedo && L.usfMoltenStream) {
      const yaw = this.group.rotation.y, q = this._q || (this._q = new THREE.Quaternion()), e = this._e || (this._e = new THREE.Euler());
      const m = this._m || (this._m = new THREE.Matrix4()), sc = this._sc || (this._sc = new THREE.Vector3());
      e.set(0, yaw + Math.PI / 2, 0); q.setFromEuler(e);
      for (let k = 0; k < 3; k++) {
        W(-19 + k * 19, 0, 60); m.compose(this._w, q, sc.set(s, s, s)); L.usfTorpedo.add(m);
        const pour = 0.6 + 0.4 * this.lit;
        W(-19 + k * 19, 13.5, 60); m.makeScale(0.9 * s * pour, 7.2 * s, 0.9 * s * pour); m.setPosition(this._w.x, this._w.y, this._w.z); L.usfMoltenStream.add(m, { aHeat: 0.85 });
        W(-19 + k * 19, 6.6, 60); S.glow(this._w.x, this._w.y, this._w.z, 7 * s, [1, 0.62, 0.22], 1.1 * this.lit);
        for (let j = 0; j < 6; j++) { const f = ((T * 1.7 + j / 6 + k * 0.31) % 1); W(-19 + k * 19 + Math.sin(j * 2.3 + k) * 3 * f, 6.8 + 5 * f - 7 * f * f, 60 + Math.cos(j * 1.9) * 3 * f); S.glow(this._w.x, this._w.y, this._w.z, 0.9 * s, [1, 0.8, 0.4], 1.6 * (1 - f) * this.lit); }
        W(-19 + k * 19, 13.6, 56); S.glow(this._w.x, this._w.y, this._w.z, 3 * s, [1, 0.7, 0.3], 1.0 * this.lit);
      }
    }
    // steam off the top, the stoves and the cast house, the dawn in it
    if (S.layers.usfSteam) {
      W(0, 90, 0); plume(S, this._w, T, 16, 0.045, 7, 80 * s, 0.2, 1.0, [1.25, 1.0, 0.95], 0.2 * this.lit, 6);
      W(-34, 62, -4); plume(S, this._w, T, 10, 0.055, 5, 50 * s, 0.6, 0.8, [1.2, 0.98, 0.94], 0, 6);
      W(110, 114, -30); plume(S, this._w, T, 12, 0.05, 6, 60 * s, 0.4, 0.85, [1.15, 0.95, 0.92], 0, 7);
      W(0, 26, 34); plume(S, this._w, T, 10, 0.12, 8, 34 * s, 0.8, 0.7, [1.1, 0.9, 0.85], 0.5 * this.lit, 4);
    }
    W(0, 62, 0); S.glow(this._w.x, this._w.y, this._w.z, 4, [1, 0.1, 0.08], Math.sin(T * 3) > 0 ? 1.5 : 0.3, 1);
    W(110, 112, -30); S.glow(this._w.x, this._w.y, this._w.z, 4, [1, 0.1, 0.08], Math.sin(T * 3 + 1) > 0 ? 1.5 : 0.3, 1);
    for (let k = 0; k < 4; k++) { W(30 + k * 16, 21, -18); S.glow(this._w.x, this._w.y, this._w.z, 3, [1, 0.8, 0.5], 1.0); }
    // when she's earned it: the bleeders flare at the top, one after another
    if (this.fired) for (let j = 0; j < 4; j++) { const ph = ((T * 0.5 + j * 0.25) % 1); W(Math.cos(j * 1.6) * 3, 88 + ph * 10, Math.sin(j * 1.6) * 3); S.glow(this._w.x, this._w.y, this._w.z, (6 + ph * 10) * s, [1, 0.6, 0.25], 0.9 * (1 - ph) * this.earned); }
  }
}

// ---------- the place, per frame ----------
export class FoundryWorld {
  constructor(scene, S) {
    this.S = S;
    const c = S.course;
    usfPrep(c, S.plan);
    this.terrain = new UsfTerrain(scene, c, S.P, S.plan);
    this.gy = (t, x) => usfGround(c, t, x);
    // everything the scenery placed stands on the ground (its heights become heights above it)
    if (S.town) {
      S.town.floorFn = this.gy;
      for (const r of S.town.roadMeshes) r.floorFn = this.gy;
      for (const it of S.town.items) if (!it.abs) it.h = (it.h || 0) + this.gy(it.t, it.x);
    }
    this.frostAt = (S.plan.usf && S.plan.usf.frost) || null;
  }
  update(S, dt, camera, time) {
    const P = S.P, LK = S.lift ? S.lift.k : 0;
    const fogD = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * LK);
    FOG.uUsfFog.value.set(P.fog); FOG.uUsfFogD.value = fogD;
    const t = S.rider.t, fr = this.frostAt ? smooth(this.frostAt[0], this.frostAt[0] + 3, t) * (1 - smooth(this.frostAt[1] - 2, this.frostAt[1] + 1, t)) : 0;
    this.terrain.update(S.track, S.rider, P, camera.position, time, fogD, fr);
    const M = S.town.mats;
    if (M.usfMoltenM) M.usfMoltenM.uniforms.uTime.value = animT(S.town);
    S.town._usfLiftK = LK;
    const rs = M.usfRowM && M.usfRowM.userData.shader;
    if (rs) { rs.uniforms.uWarm.value.set(P.window); rs.uniforms.uCandy.value.set(P.windowAlt); rs.uniforms.uWinK.value = P.windowK ?? 1; rs.uniforms.uBeat.value = S.town.beat; }
    if (S.finale && !S.finale.gy) S.finale.gy = this.gy;
  }
  // the chorus, this place's way: molten rain. On the drop a shower of sparks comes down over the
  // road ahead of her as if the roof let go, thinning through the rest of it, harder on the beat
  draw(T, rider) {
    const S = this.S, c = S.course, t = rider.t;
    if (!S.lift || S.lift.k < 0.04) return;
    const sec = c.sectionAt(t); if (sec.kind !== 'chorus' && sec.kind !== 'final') return;
    const since = t - sec.ta, B = beat(T, animT(T));
    const dens = S.lift.k * (0.3 + 0.7 * Math.exp(-Math.max(0, since - 1.2) / 2.2)) * (0.8 + 0.4 * B.pulse);
    const n = Math.round(240 * dens);
    const p = this._rp || (this._rp = new THREE.Vector3()), sm = this._rs || (this._rs = {});
    for (let j = 0; j < n; j++) {
      const life = 1.5 + 0.6 * hash(j * 0.37 + 1.3);
      const u = t / life + hash(j * 1.7 + 0.1), cyc = Math.floor(u), ph = u - cyc, age = ph * life, born = t - age;
      const ta = born + 0.55 + 1.5 * hash(j * 2.3 + cyc * 0.17), x = (hash(j * 3.1 + cyc * 0.29) - 0.5) * 30;
      if (ta < t + 0.18 || ta < sec.ta) continue;
      S.track.ground(ta, x, p);
      const top = c.sample(ta, sm).y + 16 + 10 * hash(j * 5.7 + cyc * 0.4);
      const y = top - 0.5 * GRAV * age * age;
      if (y < this.gy(ta, x)) continue;
      spark(T, p.x, y, p.z, 0, -GRAV * age * 0.12 - 1.2, 0, 0.3, 1, 0.8 - 0.3 * ph, 0.38 - 0.2 * ph, 2.6 * (1 - 0.4 * ph));
    }
  }
}
