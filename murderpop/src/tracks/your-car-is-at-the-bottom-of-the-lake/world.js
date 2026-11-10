// Her lake house through the song: the baked set (tools/arena/arenas/your-car-is-at-the-bottom-of-the-lake.py) with
// everything that moves on top of it. Water is the variable that changes the world: DRY at night, FLOODED shin-deep
// mirror water, the lake RISING into a wall round the property, UNDER at the bottom of the lake, DRAINED at dawn.
// Everything here is a function of song time (stateAt), except what YOU did to things (knocked a case over the
// balustrade, broke a flamingo, trimmed a topiary), which is snapshotted at each section and put back on a rewind.
import * as THREE from 'three';
import { Arena, LAYER } from '../../game/arena.js';
import { liteArena } from '../../game/arena-lite.js';
import { FXK } from '../../engine/post.js';
import { Shafts, Motes } from '../../fx/atmos.js';
import { BOUNDS, PIER, PIER_ANGLE, CAR_S, pierPoint, floorAt, onPier, landward, staticColliders, pushOut, keepOut, SPOTS, GATE, SHORE } from './lake.js';
import { S, NEON1, NEON2, clamp01, ease, ramp } from './song.js';
import * as P from './props.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ID = 'your-car-is-at-the-bottom-of-the-lake';
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// ---------------------------------------------------------------------------------------------- particles
const PVS = /* glsl */`
attribute vec4 aP; attribute vec4 aC; attribute vec2 aK; varying vec2 vUv; varying vec4 vC; varying float vS;
void main(){ vUv = position.xy; vC = aC; vS = aK.x; vec4 mv = viewMatrix * vec4(aP.xyz, 1.0); float a = aK.y; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  mv.xy += R * position.xy * aP.w; gl_Position = projectionMatrix * mv; }`;
const PFS = /* glsl */`
varying vec2 vUv; varying vec4 vC; varying float vS;
void main(){ float d = length(vUv); float a;
  if (vS < 0.5) a = smoothstep(1.0, 0.0, d) * 0.7;                                  // soft: steam, mist, dust
  else if (vS < 1.5) a = smoothstep(1.0, 0.55, d);                                  // drop
  else if (vS < 2.5) a = smoothstep(1.0, 0.82, d) * smoothstep(0.55, 0.78, d) + smoothstep(0.5, 0.0, length(vUv - vec2(-0.3, 0.35))) * 0.6; // bubble
  else { vec2 q = abs(vUv); a = step(max(q.x * 1.6, q.y), 0.8); }                   // bit: clippings, cloth, dust chips
  a *= vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb * a, a); }`;
class Particles {
  constructor(scene, max = 1600) {
    this.max = max; this.list = [];
    const g = new THREE.PlaneGeometry(2, 2);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aK = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
    for (const a of [this.aP, this.aC, this.aK]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aP', this.aP); g.setAttribute('aC', this.aC); g.setAttribute('aK', this.aK);
    this.mesh = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }), max);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.mesh.layers.set(LAYER.NO_REFLECT);
    scene.add(this.mesh);
  }
  add(o) {
    if (this.list.length >= this.max) return;
    this.list.push({ x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 1, age: 0, size: o.size || 0.1, grow: o.grow || 0,
      r: o.color ? o.color.r : 1, g: o.color ? o.color.g : 1, b: o.color ? o.color.b : 1, a: o.alpha ?? 1, grav: o.gravity ?? 0, drag: o.drag ?? 0.5, shape: o.shape || 0, rot: Math.random() * 6.28, spin: o.spin ?? 0, wob: o.wobble || 0, floor: o.floor ?? -99 });
  }
  burst(n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (o.speed || 2) * (0.4 + Math.random() * 0.8); this.add({ ...o, x: o.x + (Math.random() - 0.5) * (o.jitter || 0), z: o.z + (Math.random() - 0.5) * (o.jitter || 0), vx: Math.cos(a) * sp * (o.flat ?? 1), vz: Math.sin(a) * sp * (o.flat ?? 1), vy: (o.up || 0) * (0.6 + Math.random() * 0.8), life: (o.life || 1) * (0.6 + Math.random() * 0.6), size: (o.size || 0.1) * (0.6 + Math.random() * 0.8) }); } }
  clear() { this.list.length = 0; this.mesh.count = 0; }
  update(dt) {
    const L = this.list, P = this.aP.array, C = this.aC.array, K = this.aK.array;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.age += dt;
      if (p.age >= p.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.grav * dt;
      if (p.wob) { p.vx += Math.sin(p.age * 9 + p.rot) * p.wob * dt; p.vz += Math.cos(p.age * 7 + p.rot) * p.wob * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt; p.size += p.grow * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vy = Math.abs(p.vy) * 0.25; p.vx *= 0.6; p.vz *= 0.6; }
    }
    for (const p of L) {
      if (n >= this.max) break;
      const k = p.age / p.life, a = p.a * Math.min(1, k * 8) * (1 - k * k);
      P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = p.size;
      C[n * 4] = p.r; C[n * 4 + 1] = p.g; C[n * 4 + 2] = p.b; C[n * 4 + 3] = a; K[n * 2] = p.shape; K[n * 2 + 1] = p.rot;
      n++;
    }
    this.mesh.count = n; this.aP.needsUpdate = this.aC.needsUpdate = this.aK.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------------------------- the flood water
const WATER_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const WATER_FS = /* glsl */`
uniform sampler2D uMirror; uniform mat4 uMirrorMatrix; uniform float uMirrorOn, uTime, uAlpha, uFront, uPuddle, uFoamK, uReflK;
uniform vec3 uDeep, uSky; uniform vec4 uRip[16]; uniform vec2 uTilt;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vW.xz;
  float a = uAlpha;
  a *= smoothstep(uFront - 0.35, uFront + 0.35, vW.z);                 // the surge: water only behind its front
  if (uPuddle > 0.0) { float m = vnoise(p * 0.7 + 3.1) * 0.6 + vnoise(p * 2.3) * 0.4; a *= mix(1.0, smoothstep(0.74, 0.79, m), uPuddle); }
  if (a < 0.004) discard;
  vec2 g = vec2(cos(p.x * 0.9 + uTime * 0.55 + p.y * 0.3), sin(p.y * 1.1 - uTime * 0.45)) * 0.035;
  g += vec2(sin((p.x + p.y) * 2.6 + uTime * 1.4), cos((p.x - p.y) * 2.3 - uTime * 1.2)) * 0.016;
  g += uTilt;
  // ripples: wakes and impacts, kept small, quick and faint (a white ring on this floor means "get out of it")
  float foam = 0.0;
  for (int i = 0; i < 16; i++) {
    vec4 r = uRip[i]; if (r.w <= 0.0) continue;
    vec2 d = p - r.xy; float L = length(d) + 1e-3; float R = 0.2 + r.z * 1.7;
    float env = exp(-r.z * 3.0) * r.w;
    float w = exp(-pow((L - R) * 4.5, 2.0)) - 0.5 * exp(-pow((L - R + 0.25) * 4.5, 2.0));
    g += d / L * w * env * 0.2; foam += max(0.0, w) * env;
  }
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vW);
  float fres = 0.22 + 0.78 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec4 mc = uMirrorMatrix * vec4(vW, 1.0);
  vec2 muv = mc.xy / mc.w + g * 0.22;
  vec3 refl = mix(uSky, texture2D(uMirror, muv).rgb, uMirrorOn);
  vec3 col = mix(uDeep, refl, (0.5 + 0.5 * fres) * uReflK);
  col += vec3(0.75, 0.85, 1.0) * clamp(foam, 0.0, 1.0) * 0.07 * uFoamK;
  gl_FragColor = vec4(col * a, a);
}`;
// a white zone over the land (the first stop): filled from the shore toward the house, the pier and its ramp clear
const ZONE_FS = /* glsl */`
uniform float uFill, uAlpha, uFlash, uFxK; uniform vec3 uCol; uniform vec2 uShore[12]; uniform vec4 uPier; uniform vec2 uPierN;
varying vec3 vW;
float landZ(float x) {
  if (x <= 2.0) return 5.5;
  for (int i = 0; i < 11; i++) { vec2 a = uShore[i], b = uShore[i + 1]; if (x >= a.x && x <= b.x) return mix(a.y, b.y, (x - a.x) / max(1e-3, b.x - a.x)); }
  return -2.4;
}
void main() {
  vec2 p = vW.xz;
  if (p.x < -11.0 || p.x > 6.05 || p.y < -7.0) discard;
  float z0 = landZ(p.x);
  float s = dot(p - uPier.xy, uPier.zw), q = dot(p - uPier.xy, uPierN);
  float pier = step(-0.3, s) * step(abs(q), 1.32);
  float inside = (1.0 - smoothstep(z0 - 0.04, z0 + 0.04, p.y)) * (1.0 - pier);
  if (inside < 0.01) discard;
  float front = mix(5.6, -7.2, uFill);                       // filling from the shore toward the house
  float prog = smoothstep(front - 0.08, front + 0.08, p.y);
  float edge = (1.0 - smoothstep(0.0, 0.1, abs(p.y - z0))) * step(p.x, 6.0) + (1.0 - smoothstep(0.0, 0.1, abs(abs(q) - 1.32))) * step(-0.3, s) * step(s, 4.5);
  float hatch = 0.5 + 0.5 * sin((p.x + p.y) * 9.0);
  float near = smoothstep(0.6, 1.0, uFill);
  float a = inside * (0.035 + 0.03 * hatch) + prog * inside * (0.05 + 0.07 * near) * (0.6 + 0.4 * hatch) + edge * (0.45 + 0.4 * near) + (1.0 - smoothstep(0.0, 0.3, abs(p.y - front))) * inside * 0.5 * (1.0 - step(1.0, uFill));
  a = clamp(a, 0.0, 1.0) * uAlpha;
  vec3 col = uCol * (0.6 + 0.8 * near) + vec3(uFlash * 1.6);
  gl_FragColor = vec4(col * a * uFxK, a);
}`;
// the second stop's white: everything outside the eye round her, closing in from the edges to the slam
const EYE_FS = /* glsl */`
uniform float uFill, uAlpha, uFlash, uFxK; uniform vec3 uCol; uniform vec3 uEye;
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  if (abs(p.x) > 11.3 || p.y < -7.2 || p.y > 7.4) discard;
  float d = length(p - uEye.xy), r = uEye.z;
  float inside = smoothstep(r - 0.05, r + 0.05, d);
  float edge = 1.0 - smoothstep(0.0, 0.07, abs(d - r));
  if (inside < 0.01 && edge < 0.01) discard;
  float front = mix(15.0, r, uFill);
  float prog = smoothstep(front - 0.12, front + 0.12, d);
  float hatch = 0.5 + 0.5 * sin((p.x + p.y) * 9.0);
  float near = smoothstep(0.6, 1.0, uFill);
  float line = (1.0 - smoothstep(0.0, 0.28, abs(d - front))) * (1.0 - step(0.999, uFill));
  float a = inside * (0.035 + 0.03 * hatch) + prog * inside * (0.05 + 0.08 * near) * (0.6 + 0.4 * hatch) + edge * (0.75 + 0.25 * near) + line * inside * 0.5;
  a = clamp(a, 0.0, 1.0) * uAlpha;
  vec3 col = uCol * (0.6 + 0.8 * near) + vec3(uFlash * 1.6);
  gl_FragColor = vec4(col * a * uFxK, a);
}`;
// light on the floor from things above it: the police light bar's two beams, the sunken headlights' glow
const GLOW_FS = /* glsl */`
uniform vec3 uBar; uniform float uRed, uBlue, uBarK; uniform vec4 uHead[2]; uniform float uHeadK;
uniform float uCaus, uCausT, uLidK; uniform vec2 uShaft; uniform float uDark;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cell(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(float(x), float(y)); vec2 r = o + vec2(hash(i + o), hash(i + o + 7.1)) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return sqrt(d2) - sqrt(d1); }
void main() {
  vec2 p = vW.xz; vec3 c = vec3(0.0); float dark = 0.0;
  if (uBarK > 0.0) {
    vec2 d = p - uBar.xz; float L = length(d); float ang = atan(d.x, d.y);
    float fall = 1.0 / (1.0 + L * L * 0.012);
    float r = exp(-pow(atan(sin(ang - uRed), cos(ang - uRed)) / 0.16, 2.0));
    float b = exp(-pow(atan(sin(ang - uBlue), cos(ang - uBlue)) / 0.16, 2.0));
    c += (vec3(1.0, 0.07, 0.12) * r * 1.25 + vec3(0.1, 0.25, 1.0) * b * 0.9) * fall * uBarK * smoothstep(1.0, 3.0, L);
  }
  if (uHeadK > 0.0) for (int i = 0; i < 2; i++) { vec2 d = (p - uHead[i].xy) / uHead[i].zw; c += vec3(1.0, 0.85, 0.55) * exp(-dot(d, d)) * 0.5 * uHeadK; }
  if (uCaus > 0.0) {
    vec2 q = p * 0.9 + vec2(sin(p.y * 1.3 + uCausT * 0.7), cos(p.x * 1.1 - uCausT * 0.6)) * 0.22;
    float e1 = cell(q + vec2(uCausT * 0.31, uCausT * 0.17)), e2 = cell(q * 1.31 - vec2(uCausT * 0.23, -uCausT * 0.29) + 3.7);
    float caus = pow(1.0 - smoothstep(0.0, 0.22, e1), 2.0) * 0.55 + pow(1.0 - smoothstep(0.0, 0.18, e2), 2.0) * 0.4;
    caus *= 0.55 + 0.45 * sin(p.x * 0.4 + p.y * 0.3 + uCausT * 0.5);
    float sh = exp(-dot(p - uShaft, p - uShaft) / 9.0);
    c += vec3(0.45, 1.0, 0.9) * caus * uCaus * mix(1.0, 0.2 + sh * 1.8, uLidK);
    c += vec3(0.6, 1.0, 0.95) * sh * uLidK * 0.35;
    dark = uLidK * 0.42 * (1.0 - sh);
  }
  dark = max(dark, uDark);
  float a = max(dark, 0.0);
  gl_FragColor = vec4(c, a);
}`;

// ---------------------------------------------------------------------------------------------- the sky (seen only in reflections)
const SKY_FS = /* glsl */`
uniform vec3 uTop, uHorizon, uMoonDir; uniform float uMoon, uStars, uCloud;
varying vec3 vD;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vD); float h = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uTop, pow(h, 0.55));
  vec3 s = floor(d * 300.0); float st = step(0.9988, hash(s)) * uStars * smoothstep(0.05, 0.4, h);
  c += vec3(st * 0.5);
  // the moon is only ever seen in the mirror water, in the middle of the floor: a pearly gleam, never a white disc
  // (a white circle on this floor means "get out of it")
  float m = dot(d, normalize(uMoonDir));
  float disc = smoothstep(0.99986, 0.99993, m), halo = pow(max(m, 0.0), 2400.0) * 0.12 + pow(max(m, 0.0), 60.0) * 0.035;
  c += vec3(0.95, 0.94, 1.0) * (disc * 0.32 + halo) * uMoon * (1.0 - uCloud * 0.85);
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------------------------------------- screen: the meniscus wipes
const WIPE_VS = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const WIPE_FS = /* glsl */`
uniform float uLine, uT, uK; varying vec2 vUv;
void main() {
  if (uK <= 0.0) discard;
  float y = vUv.y, x = vUv.x;
  float wav = uLine + 0.018 * sin(x * 21.0 + uT * 9.0) + 0.01 * sin(x * 47.0 - uT * 13.0);
  float below = smoothstep(wav + 0.004, wav - 0.004, y);
  float lip = exp(-pow((y - wav) / 0.006, 2.0));
  vec3 c = vec3(0.04, 0.24, 0.22) * below * 0.55 + vec3(0.8, 1.0, 0.98) * lip * 1.6;
  float a = (below * 0.45 + lip * 0.9) * uK;
  gl_FragColor = vec4(c * uK, a);
}`;

// the wall of black water that climbs round the property and curls in. The side toward the camera stays low and
// see-through (a cutaway: you always see yourself and her); the rest is black glass with the moon on it and a foaming lip.
const WALL_VS = /* glsl */`
uniform float uH, uFall; varying vec3 vW; varying vec3 vN; varying float vY; varying float vA; varying float vH; varying float vNear;
void main() {
  vec3 p = position; vY = p.y; vA = atan(p.z / 8.9, p.x / 12.4);
  float nearV = smoothstep(-0.1, 0.6, dot(normalize(p.xz), normalize(cameraPosition.xz - vec2(-1.4, 0.4))));
  float H = uH * (1.0 - 0.65 * nearV); vH = H; vNear = nearV;
  float k = clamp((p.y - H * 0.3) / max(0.5, H * 0.7), 0.0, 1.0);
  float fold = uFall * k * k * (1.0 - nearV);
  p.xz *= 1.0 - fold * 0.55; p.y -= fold * H * 0.3;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const WALL_FS = /* glsl */`
uniform float uH, uT, uK, uFall; uniform vec3 uMoon; varying vec3 vW; varying vec3 vN; varying float vY; varying float vA; varying float vH; varying float vNear;
void main() {
  if (vY > vH) discard;
  vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - abs(dot(normalize(vN), V)), 3.0);
  float streak = 0.5 + 0.25 * sin(vA * 140.0 + sin(vY * 0.9 - uT * 2.0) * 2.0) + 0.25 * sin(vA * 57.0 - vY * 0.35 + uT * 1.3);
  float lip = smoothstep(vH - min(0.5, 0.06 + 0.12 * vH), vH - 0.03, vY);
  float foam = lip * (0.6 + 0.4 * sin(vA * 90.0 + uT * 7.0));
  vec2 d = normalize(vW.xz - vec2(-1.4, 0.4));
  float moon = pow(max(dot(d, normalize(uMoon.xz)), 0.0), 6.0) * smoothstep(0.0, vH, vY) * (0.75 + 0.25 * sin(vY * 1.7 - uT * 3.0 + vA * 9.0));
  vec3 c = vec3(0.004, 0.012, 0.02) + vec3(0.03, 0.08, 0.11) * f * streak + vec3(0.75, 0.9, 1.0) * foam * 1.1 + vec3(0.22, 0.34, 0.46) * moon * (0.55 + 0.45 * streak);
  float a = mix(0.94, 0.6, vNear) * (1.0 - 0.45 * uFall * smoothstep(vH * 0.5, vH, vY) * (1.0 - vNear));
  a = max(a, foam * 0.95);
  gl_FragColor = vec4(c * uK, a * uK);
}`;

// ---------------------------------------------------------------------------------------------- the world
export class World {
  constructor(f) {
    this.f = f; this.scene = f.scene; this.t = 0; this.cols = staticColliders(); this.dyn = [];
    // level: the water's height; surf: the surface you can see and stand things on (none under the lake: the
    // surface is fifty feet up, and what's drawn on the floor sits on the lakebed)
    this.level = 0; this.surf = 0; this.ripples = []; this.ripT = 0; this.snap = new Map(); this.events = {};
    this.postsAt = null;  // where the depth posts rose (set by the choreography)
    this.kill = null;     // her death scene's hold on YOUR car, its lid and lamps, the key ring (death.js)
  }
  get killOn() { return !!(this.kill && this.kill.on); }

  async build() {
    const f = this.f;
    try {
      this.arena = await Arena.load(`assets/arenas/${ID}/${ID}.json`, f.app.renderer, f.scene, { camera: f.cam.cam, mirrorScale: 0.5 });
      this.arena.prepareCamera(f.cam.cam);
      this.arena.setState('night');
      this._findSetMeshes();
    } catch (e) {
      console.warn('lake: the set did not load, playing on the plain floor:', e.message);
      this.lite = liteArena(f.scene, { color: 0x1a2440, accent: 0xff4fa0 });
    }
    this.group = new THREE.Group(); this.group.name = 'lake world'; f.scene.add(this.group);
    // a fill for the figures from the lake side (the set takes no real-time light; this lifts faces the moon leaves dark)
    this.fill = new THREE.DirectionalLight(0x9fb3ff, 0.9); this.fill.position.set(3, 9, 16); this.fill.target.position.set(0, 0.8, 0);
    this.group.add(this.fill, this.fill.target);
    this.particles = new Particles(f.scene);
    this._water(); this._sky(); this._strings(); this._neon(); this._police(); this._glow(); this._zone(); this._eyeZone(); this._wipe(); this._wall(); this._under();
    await this._props();
    this.hooks();
    this.stateAt(0, true);
  }

  // the set's meshes the song changes: the lake surface, the doors, the topiaries
  _findSetMeshes() {
    const a = this.arena;
    this.lakeMeshes = []; a.group.traverse((o) => { if (o.isMesh && o.material && o.material.name && /lake/.test(o.material.name)) this.lakeMeshes.push(o); });
    if (!this.lakeMeshes.length) a.group.traverse((o) => { if (o.isMesh && a.mirrors && a.mirrors.includes(o)) this.lakeMeshes.push(o); });
    this.door = a.nodes.door || null; this.doorQ = this.door ? this.door.quaternion.clone() : null;
    this.topiary = [a.nodes.topiary0 || null, a.nodes.topiary1 || null];
    this.porchLamp = a.emissive.find((e) => e.name === 'porch_lamp') || null;
    this.mirrorObj = a.mirror;
  }

  // ---------------------------------------------------------------- pieces
  _water() {
    const a = this.arena;
    const u = {
      uMirror: { value: a ? a.u.uMirrorTex.value : null }, uMirrorMatrix: { value: a ? a.u.uMirrorMatrix.value : new THREE.Matrix4() }, uMirrorOn: { value: a && a.mirror ? 1 : 0 },
      uTime: { value: 0 }, uAlpha: { value: 0 }, uFront: { value: -99 }, uPuddle: { value: 0 }, uFoamK: { value: 1 },
      uDeep: { value: new THREE.Color(0.006, 0.008, 0.016) }, uSky: { value: new THREE.Color(0.02, 0.03, 0.08) },
      uRip: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) }, uTilt: { value: new THREE.Vector2() }, uReflK: { value: 1 },
    };
    const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: WATER_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const g = new THREE.PlaneGeometry(17.4, 13.0, 1, 1); g.rotateX(-Math.PI / 2); g.translate(-2.6, 0, -0.8);
    this.water = new THREE.Mesh(g, m); this.water.renderOrder = 1; this.water.layers.set(LAYER.NO_REFLECT); this.water.frustumCulled = false; this.water.visible = false;
    this.group.add(this.water); this.wu = u;
    // the surge's front: a rolling crest of white water
    const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT, uK; varying vec2 vUv; varying vec3 vW;
        void main(){ float n = 0.5 + 0.5 * sin(vW.x * 7.0 + uT * 23.0) * sin(vW.x * 3.1 - uT * 17.0);
          float top = smoothstep(0.55 + 0.25 * n, 0.25, vUv.y); float a = top * uK * (0.55 + 0.45 * smoothstep(0.0, 0.6, vUv.y));
          vec3 c = mix(vec3(0.03, 0.05, 0.09), vec3(0.85, 0.92, 1.0), smoothstep(0.15, 0.6, vUv.y) * (0.6 + 0.4 * n));
          if (a < 0.01) discard; gl_FragColor = vec4(c * a, a); }` });
    const cg = new THREE.PlaneGeometry(18.5, 0.9, 64, 1); cg.translate(-2.4, 0.45, 0);
    this.crest = new THREE.Mesh(cg, cm); this.crest.visible = false; this.crest.renderOrder = 3; this.crest.layers.set(LAYER.NO_REFLECT); this.group.add(this.crest);
  }

  _sky() {
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uTop: { value: new THREE.Color(0.012, 0.016, 0.05) }, uHorizon: { value: new THREE.Color(0.06, 0.04, 0.16) }, uMoonDir: { value: V3(-0.32, 0.8, -0.5).normalize() }, uMoon: { value: 1 }, uStars: { value: 1 }, uCloud: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SKY_FS });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), m);
    this.sky.layers.set(LAYER.HIDDEN); this.sky.layers.enable(LAYER.ARENA); this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky); this.su = m.uniforms;
  }

  // the string lights along her porch beam, in swags between the posts; they pop on left to right
  _strings() {
    const posts = [-7.0, -4.3, 0.3, 3.0], pts = [];
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i], b = posts[i + 1], n = Math.round((b - a) / 0.42);
      for (let k = 0; k < n; k++) { const u = k / n, x = a + (b - a) * u; pts.push(V3(x, 2.6 - 0.34 * Math.sin(u * Math.PI), -4.9)); }
    }
    pts.push(V3(3.0, 2.6, -4.9));
    this.bulbs = pts;
    const g = new THREE.SphereGeometry(0.05, 10, 8);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.bulbMesh = new THREE.InstancedMesh(g, m, pts.length);
    const M = new THREE.Matrix4();
    pts.forEach((p, i) => { M.makeTranslation(p.x, p.y - 0.06, p.z); this.bulbMesh.setMatrixAt(i, M); this.bulbMesh.setColorAt(i, new THREE.Color(0, 0, 0)); });
    this.bulbMesh.frustumCulled = false; this.group.add(this.bulbMesh);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.008, 4, false), new THREE.MeshBasicMaterial({ color: 0x1a1418 }));
    this.group.add(wire);
    this.bulbCol = new THREE.Color();
  }

  // pink neon script on the boathouse's front roof: YOUR CAR IS AT THE BOTTOM OF THE LAKE; under it, later, YOU'RE MINE FOREVER NOW
  _neon() {
    const word = (text, h) => {
      const c = document.createElement('canvas'), g = c.getContext('2d');
      const font = `italic 700 ${Math.round(h * 220)}px Fraunces, Georgia, serif`;
      g.font = font; const w = Math.ceil(g.measureText(text).width + 70); c.width = w; c.height = Math.round(h * 300);
      g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center';
      for (const [blur, col] of [[30, '#ff2e88'], [12, '#ff4fa0']]) { g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.fillText(text, w / 2, c.height / 2); }
      g.shadowBlur = 0; g.fillStyle = '#fff0f6'; g.fillText(text, w / 2, c.height / 2);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0, 0, 0) });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / c.height * h * 1.36, h * 1.36), m); mesh.renderOrder = 4;
      return { mesh, w: w / c.height * h * 1.36 };
    };
    const lay = (list, rows, h, at) => {
      const out = []; let i = 0;
      rows.forEach((n, r) => {
        const ws = list.slice(i, i + n).map(([w, t]) => ({ ...word(w, h), t })); i += n;
        const total = ws.reduce((s, x) => s + x.w * 0.86, 0); let x = at.x - total / 2;
        for (const w of ws) { w.mesh.position.set(x + w.w * 0.43, at.y - r * h * 1.05 * Math.cos(at.tilt), at.z + r * h * 1.05 * Math.sin(at.tilt)); w.mesh.rotation.x = -at.tilt; x += w.w * 0.86; this.group.add(w.mesh); out.push(w); }
      });
      return out;
    };
    // on the boathouse's front roof slope (it climbs from z -2.25 at 3.0 m to the ridge at z -4.95, 4.7 m)
    this.neon1 = lay(NEON1, [5, 4], 0.46, { x: 8.75, y: 4.32, z: -4.25, tilt: 1.0 });
    this.neon2 = lay(NEON2, [4], 0.42, { x: 8.6, y: 2.62, z: -2.4, tilt: 0.2 });
  }

  // the cruiser beyond the gate and its light bar's sweep across the yard and the house (no siren)
  _police() {
    this.cruiser = P.makeCruiser(); this.cruiser.rotation.y = Math.PI; this.cruiser.visible = false; this.group.add(this.cruiser);
  }
  _glow() {
    const u = { uBar: { value: V3(SPOTS.cruiser.x, 2, SPOTS.cruiser.z) }, uRed: { value: 0 }, uBlue: { value: Math.PI }, uBarK: { value: 0 }, uHead: { value: [new THREE.Vector4(10.4, 7.6, 0.9, 0.6), new THREE.Vector4(11.0, 7.0, 0.9, 0.6)] }, uHeadK: { value: 0 },
      uCaus: { value: 0 }, uCausT: { value: 0 }, uLidK: { value: 0 }, uShaft: { value: new THREE.Vector2(SPOTS.shaft.x, SPOTS.shaft.z) }, uDark: { value: 0 } };
    const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: GLOW_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -2 });
    const g = new THREE.PlaneGeometry(40, 30); g.rotateX(-Math.PI / 2); g.translate(-1, 0, 2);
    this.glow = new THREE.Mesh(g, m); this.glow.position.y = 0.03; this.glow.renderOrder = 1; this.glow.layers.set(LAYER.NO_REFLECT); this.glow.frustumCulled = false;
    this.group.add(this.glow); this.gu = u;
    // the same sweep on the face of her house
    const fm = m.clone(); fm.uniforms = u;
    const fg = new THREE.PlaneGeometry(18, 6); fg.translate(-2.5, 3, 0);
    this.facade = new THREE.Mesh(fg, new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: GLOW_FS.replace('vec2 p = vW.xz;', 'vec2 p = vec2(vW.x, -6.9 + (vW.y) * 0.9);'), uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.facade.position.z = -6.86; this.facade.layers.set(LAYER.NO_REFLECT); this.facade.renderOrder = 1; this.group.add(this.facade);
  }

  // the first stop's white: every bit of land, the porch too; only the pier and its ramp stay clear
  _zone() {
    const shore = SHORE.filter((p) => p.x >= 1.9).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 11)) === 0).slice(0, 12);
    while (shore.length < 12) shore.push({ x: 6.05 + shore.length, z: -2.4 });
    // uFxK: like the shared telegraphs, its glow follows the room's exposure (this white is a telegraph: the rule)
    const u = { uFill: { value: 0 }, uAlpha: { value: 0 }, uFlash: { value: 0 }, uCol: { value: new THREE.Color(1.25, 1.55, 1.9) }, uFxK: FXK,
      uShore: { value: shore.map((p) => new THREE.Vector2(p.x, p.z)) }, uPier: { value: new THREE.Vector4(PIER.a.x, PIER.a.z, PIER.u.x, PIER.u.z) }, uPierN: { value: new THREE.Vector2(PIER.n.x, PIER.n.z) } };
    const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: ZONE_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -4 });
    const g = new THREE.PlaneGeometry(17.2, 13.0); g.rotateX(-Math.PI / 2); g.translate(-2.45, 0.035, -0.75);
    const ground = new THREE.Mesh(g, m); ground.renderOrder = 2;
    const pg = new THREE.PlaneGeometry(10.1, 2.25); pg.rotateX(-Math.PI / 2); pg.translate(-2, 0.47, -5.9);
    const porch = new THREE.Mesh(pg, m); porch.renderOrder = 2;
    const sg = new THREE.PlaneGeometry(10.1, 0.34); sg.rotateX(-Math.PI / 2); sg.translate(-2, 0.24, -4.64);
    const step = new THREE.Mesh(sg, m); step.renderOrder = 2;
    this.zone = new THREE.Group(); this.zone.add(ground, porch, step); this.zone.visible = false;
    this.zone.traverse((o) => o.layers && o.layers.set(LAYER.NO_REFLECT));
    this.group.add(this.zone); this.zu = u;
  }
  _eyeZone() {
    const u = { uFill: { value: 0 }, uAlpha: { value: 0 }, uFlash: { value: 0 }, uCol: { value: new THREE.Color(1.25, 1.55, 1.9) }, uFxK: FXK, uEye: { value: new THREE.Vector3(0, 0, 2.6) } };
    const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: EYE_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const g = new THREE.PlaneGeometry(23, 15); g.rotateX(-Math.PI / 2);
    this.eyeZone = new THREE.Mesh(g, m); this.eyeZone.renderOrder = 2; this.eyeZone.visible = false; this.eyeZone.frustumCulled = false; this.eyeZone.layers.set(LAYER.NO_REFLECT);
    this.group.add(this.eyeZone); this.eu = u;
  }
  _wipe() {
    const m = new THREE.ShaderMaterial({ vertexShader: WIPE_VS, fragmentShader: WIPE_FS, uniforms: { uLine: { value: 0 }, uT: { value: 0 }, uK: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.wipe = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); this.wipe.frustumCulled = false; this.wipe.renderOrder = 1000; this.wipe.layers.set(LAYER.NO_REFLECT);
    this.group.add(this.wipe);
  }
  _wall() {
    const g = new THREE.CylinderGeometry(1, 1, 14, 96, 24, true); g.translate(0, 7 - 0.3, 0); g.scale(12.4, 1, 8.9);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uH: { value: 0 }, uT: { value: 0 }, uK: { value: 0 }, uMoon: { value: V3(-0.32, 0.8, -0.5) }, uFall: { value: 0 } },
      vertexShader: WALL_VS,
      fragmentShader: WALL_FS });
    this.wallMesh = new THREE.Mesh(g, m); this.wallMesh.position.set(-1.4, 0, 0.4); this.wallMesh.visible = false; this.wallMesh.renderOrder = 8; this.wallMesh.frustumCulled = false;
    this.wallMesh.layers.set(LAYER.NO_REFLECT); this.group.add(this.wallMesh);
  }
  _under() {
    // the lakebed past the shore (where the lake's surface was) and the god rays, silt, bubbles
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x0b1714, roughness: 0.95 }));
    bed.rotation.x = -Math.PI / 2; bed.position.set(4, -0.32, 12); bed.visible = false; bed.receiveShadow = true; this.group.add(bed); this.bed = bed;
    this.shafts = new Shafts(this.scene);
    this.shaftList = [];
    const col = new THREE.Color(0.55, 1.0, 0.9);
    for (const [x, z, r] of [[-7, -3, 1.3], [-3.5, -1.0, 1.6], [0.5, 2.0, 1.2], [3.5, -2.5, 1.0], [-5.5, 3.5, 1.1], [1.5, -5.0, 1.2]]) {
      const s = this.shafts.add({ x: x - 1.2, y: 14, z: z - 1.8, dir: V3(0.08, -1, 0.13), len: 14.5, r0: r * 0.7, r1: r * 1.4, color: col, k: 0 });
      s.m.layers.set(LAYER.NO_REFLECT); this.shaftList.push(s);
    }
    this.motes = new Motes(this.scene, { n: 500, box: [-13, 0.2, -8, 9, 8, 9], color: new THREE.Color(0.9, 1.6, 1.5), size: 0.035, k: 0 });
    this.motes.pts.layers.set(LAYER.NO_REFLECT);
  }

  // ---------------------------------------------------------------- props
  async _props() {
    const f = this.f, g = this.group;
    // YOUR car, on a pivot at the pier's end so it can teeter and tip
    this.car = P.makeCar(); this.carPivot = new THREE.Group(); this.carPivot.add(this.car); g.add(this.carPivot);
    const end = pierPoint(PIER.len); this.carEnd = end;
    // her key ring as it flies in her death scene (death.js moves it)
    this.keyRing = P.makeKeyRing(); this.keyRing.visible = false; g.add(this.keyRing);
    // YOUR cases
    this.cases = SPOTS.cases.map((p, i) => { const o = P.makeCase(); g.add(o); return { o, home: { ...p }, x: p.x, z: p.z, vx: 0, vz: 0, state: 'lawn', id: i, spin: 0, ry: i ? 0.6 : -0.4 }; });
    this.case3 = P.makeCase(); this.case3.visible = false; g.add(this.case3);
    // the flamingos, the garden set, the mailbox
    this.flamingos = SPOTS.flamingo.map((p, i) => { const o = P.makeFlamingo(); o.rotation.y = i ? 2.4 : 0.6; g.add(o); return { o, home: p, broken: false }; });
    this.garden = P.makeGardenSet(); this.garden.position.set(SPOTS.table.x, 0, SPOTS.table.z); g.add(this.garden);
    this.mailbox = { o: P.makeMailbox(), broken: false }; this.mailbox.o.position.set(SPOTS.mailbox.x, 0, SPOTS.mailbox.z); this.mailbox.o.rotation.y = Math.PI / 2; g.add(this.mailbox.o);
    // the MISSING poles, YOUR face on every one
    const photo = this.portrait();
    const ptex = P.posterTexture(photo);
    this.poles = SPOTS.poles.map((p) => { const o = P.makePole(ptex); o.position.set(p.x, -5, p.z); o.visible = false; g.add(o); return { o, p }; });
    // the depth posts, the stick shift and its H on the water
    this.posts = ['10 FT', '20 FT', '30 FT', '40 FT', '50 FT'].map((l) => { const o = P.makeDepthPost(l); o.visible = false; g.add(o); return { o, x: 0, z: 0 }; });
    this.stick = P.makeStick(); this.stick.position.set(SPOTS.stick.x, -4, SPOTS.stick.z); this.stick.visible = false; g.add(this.stick);
    this.hpat = this._hPattern(); g.add(this.hpat);
    // her cinder blocks (a small pool)
    this.blocks = Array.from({ length: 8 }, () => { const o = P.makeBlock(); o.visible = false; g.add(o); return { o, busy: false }; });
    // the doormat and the key plaque by her door
    this.mat = P.makeDoormat(); this.mat.position.set(SPOTS.door.x, 0.455, -6.25); g.add(this.mat);
    this.plaque = P.makePlaque(); this.plaque.position.set(SPOTS.plaque.x, 1.5, -6.93); g.add(this.plaque);
    this.keyGlow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.keyGlow.position.set(SPOTS.plaque.x - 0.04, 1.37, -6.88); g.add(this.keyGlow);
    this.keyTaken = false;
    // the topiary stumps (shown when YOUR rings trim a heart to one)
    this.stumps = SPOTS.topiary.map((p) => { const o = P.makeStump(); o.position.set(p.x, 0, p.z); o.visible = false; g.add(o); return o; });
    this.topHits = [0, 0]; this.trimmed = [false, false];
    for (const o of [this.car, this.garden, this.mailbox.o, ...this.cases.map((c) => c.o), ...this.flamingos.map((x) => x.o), ...this.poles.map((x) => x.o), ...this.posts.map((x) => x.o), this.stick, this.cruiser]) if (this.arena) this.arena.addCaster(o);
    // light throws no shadow: the car's beam cones and lamps stay out of the casters
    for (const o of [this.car.userData.beams, this.car.userData.lights]) o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.layers.disable(LAYER.CASTER); } });
  }
  _hPattern() {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.0, 0.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const g = new THREE.Group(); g.name = 'H pattern';
    const add = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0); const b = new THREE.Mesh(new THREE.PlaneGeometry(0.09, l), m); b.rotation.x = -Math.PI / 2; b.rotation.z = -Math.atan2(x1 - x0, z1 - z0); b.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); b.renderOrder = 2; g.add(b); };
    for (const x of GATE.x) add(x, GATE.z0, x, GATE.z1);
    add(GATE.x[0], GATE.zN, GATE.x[2], GATE.zN);
    g.userData.m = m; g.layers && g.traverse((o) => o.layers.set(LAYER.NO_REFLECT));
    return g;
  }

  // YOUR face, rendered from YOU yourself, for the posters
  portrait() {
    try {
      const f = this.f, r = f.app.renderer, pl = f.player;
      const head = pl.h.rig.bones.Head || pl.h.rig.bones.head;
      const sc = new THREE.Scene(); const parent = pl.root.parent;
      const pos = pl.root.position.clone(), rot = pl.root.rotation.y;
      sc.add(pl.root); pl.root.position.set(0, 0, 0); pl.root.rotation.y = 0;
      pl.h.rig.play('Idle_Loop', { fade: 0, force: true }); pl.h.rig.mixer.update(0.5); pl.root.updateMatrixWorld(true);
      const hp = head.getWorldPosition(new THREE.Vector3());
      const cam = new THREE.PerspectiveCamera(24, 0.8, 0.05, 10); cam.position.set(hp.x + 0.08, hp.y + 0.02, hp.z + 0.75); cam.lookAt(hp.x, hp.y - 0.02, hp.z);
      sc.add(new THREE.HemisphereLight(0xfff0e8, 0x403038, 1.4)); const key = new THREE.DirectionalLight(0xfff2e0, 2.4); key.position.set(0.6, 1.2, 1.4); sc.add(key);
      sc.background = new THREE.Color(0.32, 0.28, 0.3);
      const rt = new THREE.WebGLRenderTarget(256, 320, { type: THREE.UnsignedByteType });
      const prev = r.getRenderTarget(); r.setRenderTarget(rt); r.clear(); r.render(sc, cam); r.setRenderTarget(prev);
      const px = new Uint8Array(256 * 320 * 4); r.readRenderTargetPixels(rt, 0, 0, 256, 320, px); rt.dispose();
      parent.add(pl.root); pl.root.position.copy(pos); pl.root.rotation.y = rot;
      const c = document.createElement('canvas'); c.width = 256; c.height = 320; const g = c.getContext('2d'); const img = g.createImageData(256, 320);
      for (let y = 0; y < 320; y++) for (let x = 0; x < 256; x++) { const s = ((319 - y) * 256 + x) * 4, d = (y * 256 + x) * 4; for (let k = 0; k < 3; k++) img.data[d + k] = Math.min(255, Math.pow(px[s + k] / 255, 1 / 2.2) * 255 * 0.92 + 8); img.data[d + 3] = 255; }
      g.putImageData(img, 0, 0);
      // a little photocopier grey: these were run off at the police station
      g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,0.55)'; g.fillRect(0, 0, 256, 320); g.globalCompositeOperation = 'source-over';
      return c;
    } catch (e) { console.warn('lake: no portrait', e.message); return null; }
  }

  // ---------------------------------------------------------------- the fight's hooks: walls, heights, telegraphs over the water
  hooks() {
    const f = this.f, pl = f.player, self = this;
    // YOU stands on the porch and the pier: lift her feet to the floor under her (smoothed, like a step), and her
    // jump is on top of that (this.y: without it she never left the floor in this yard). In her death scene the
    // scene sets YOU's height itself, from the lawn's level (death.js)
    this._plSync = pl._sync;
    let y = 0;
    pl._sync = function () {
      this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.facing;
      if (this.state === 'scene') { y = 0; this.root.position.y = this.y; return; }
      const want = floorAt(this.x, this.z); y += (want - y) * Math.min(1, (f.dt || 0.016) * 16); this.root.position.y = y + this.y;
    };
    // telegraphs sit on the floor under them, above the water
    const add = f.tele.add.bind(f.tele);
    f.tele.add = (o) => add({ ...o, y: o.y ?? Math.max(floorAt(o.x, o.z), self.surf) + 0.025 });
  }

  resolve(x, z, r) {
    const out = this._out || (this._out = { x, z, hit: false, nx: 0, nz: 0 }); out.hit = false;
    x = Math.max(BOUNDS.minX + r, Math.min(BOUNDS.maxX - r, x)); z = Math.max(BOUNDS.minZ + r, Math.min(BOUNDS.maxZ - r, z));
    pushOut(this.cols, x, z, r, out);
    pushOut(this.dyn, out.x, out.z, r, out);
    out.x = Math.max(BOUNDS.minX + r, Math.min(BOUNDS.maxX - r, out.x)); out.z = Math.max(BOUNDS.minZ + r, Math.min(BOUNDS.maxZ - r, out.z));
    keepOut(out.x, out.z, r, out);
    return out;
  }

  // ---------------------------------------------------------------- song time -> the set
  waterAt(t) {
    if (t < S.surge) return 0;
    if (t < S.rise) return 0.2 + 0.25 * Math.exp(-(t - S.surge) * 4) * (t < S.settled ? 1 : 0);
    if (t < S.under) { const k = ramp(t, S.rise, S.under); return 0.2 + 1.15 * k * k; }
    if (t < S.drain) return 1.6;
    if (t < S.drained) { const k = ramp(t, S.drain + 0.6, S.drained); return 1.35 * (1 - k) * (1 - k); }
    return 0;
  }

  // the snapshot of what YOU changed: taken at each section, put back on a rewind to it
  snapshot(t0) {
    this.snap.set(t0.toFixed(2), {
      cases: this.cases.map((c) => ({ x: c.x, z: c.z, state: c.state, ry: c.ry })),
      flamingos: this.flamingos.map((x) => x.broken), mailbox: this.mailbox.broken, trimmed: [...this.trimmed], topHits: [...this.topHits],
      garden: { x: this.garden.position.x, z: this.garden.position.z }, posts: this.postsAt ? this.postsAt.map((p) => ({ ...p })) : null,
    });
  }
  restore(t0) {
    const s = this.snap.get(t0.toFixed(2));
    if (!s) return false;
    s.cases.forEach((c, i) => Object.assign(this.cases[i], c, { vx: 0, vz: 0 }));
    s.flamingos.forEach((b, i) => { this.flamingos[i].broken = b; });
    this.mailbox.broken = s.mailbox; this.trimmed = [...s.trimmed]; this.topHits = [...s.topHits];
    this.garden.position.x = s.garden.x; this.garden.position.z = s.garden.z;
    this.postsAt = s.posts ? s.posts.map((p) => ({ ...p })) : (this.postsAt && t0 < S.posts[0] ? null : this.postsAt);
    return true;
  }

  // everything derived from the song's time; `hard`: also put back what YOU changed to how it was at t (no history)
  stateAt(t, hard = false) {
    this.t = t;
    // (the car went in at the first stop: a start after it doesn't throw its fountain up again)
    this.events.splash = t >= S.splash;
    // her death scene's hold on the car and the lights is over (a rewind, a start anywhere)
    this.kill = null; if (this.keyRing) this.keyRing.visible = false;
    if (hard) {
      this.cases.forEach((c) => { Object.assign(c, c.home, { vx: 0, vz: 0, state: t < S.band ? 'tumble' : 'lawn' }); if (t > 16.710) c.state = 'burst'; else if (t > 15.951 && c.id === 0) c.state = 'burst'; });
      this.flamingos.forEach((x) => { x.broken = false; }); this.mailbox.broken = false; this.trimmed = [false, false]; this.topHits = [0, 0];
      this.garden.position.set(SPOTS.table.x, 0, SPOTS.table.z);
      if (t < S.posts[0]) this.postsAt = null;
    }
    this.particles.clear();
    this.ripples.length = 0;
    this.update(0, t);
  }

  // ---------------------------------------------------------------- per frame
  update(dt, t) {
    const f = this.f; this.t = t;
    const lvl = this.waterAt(t); this.level = lvl;
    const under = t >= S.under && t < S.drain + 0.5;
    this.surf = under ? 0 : lvl;
    this._lights(t, under);
    this._waterFrame(dt, t, lvl, under);
    this._carFrame(dt, t, under);
    this._propsFrame(dt, t, lvl, under);
    this._stringsFrame(t);
    this._neonFrame(t);
    this._policeFrame(t);
    this._underFrame(dt, t, under);
    this._zoneFrame(t);
    { const on = !!this.eye && t >= S.white2 && t < S.under + 0.15; this.eyeZone.visible = on;
      if (on) { const e = this.eye; this.eu.uEye.value.set(e.x, e.z, e.r); this.eu.uFill.value = ramp(t, S.white2, S.under); this.eu.uAlpha.value = t < S.under ? Math.min(1, (t - S.white2) / 0.08) : 1 - ramp(t, S.under, S.under + 0.15); this.eu.uFlash.value = t >= S.under ? 1 - ramp(t, S.under, S.under + 0.15) : 0; this.eyeZone.position.y = lvl + 0.04; } }
    this.particles.update(dt);
    this._colliders(t);
    if (this.arena) {
      this.arena.update(dt, f.cam.cam, f.player.root.position);
      f.app.post.fx.exposure = this.arena.exposure * this.expo;
    }
  }

  _lights(t, under) {
    const a = this.arena; let expo = 1;
    const f = this.f, fx = f.app.post.fx;
    if (a) {
      if (t < S.still) a.setState('night');
      else if (t < S.police) { a.setState('night'); expo = t < S.surge ? 1.12 : 1.0; }
      else if (t < S.dark) { a.setState('night'); expo = 0.8; }
      else if (t < S.rise) a.setState('night', 'dark', ramp(t, S.dark, S.dark + 0.7));
      else if (t < S.under) a.setState('dark', 'under', ramp(t, S.rise, S.under) * 0.7);
      else if (t < S.drain) { a.setState('under'); expo = 0.62 * (t >= S.lid && !this.killOn ? lerp(1, 0.8, ramp(t, S.lid, S.lid + 1.2)) : 1); if (t >= S.black && t < S.lightsBack) expo *= 0.55; }
      else a.setState('under', 'dawn', ramp(t, S.drain + 0.5, S.drained));
      // the porch light: the last thing to go off, on "home"
      if (this.porchLamp && t >= S.home && this.won) this.porchLamp.mat.emissive.setRGB(0, 0, 0);
      // the lake's mirror only while there's a surface to see; the lake itself turns to lakebed under it
      a.mirror = under ? null : this.mirrorObj;
      for (const m of this.lakeMeshes || []) m.visible = !under;
    }
    this.expo = expo;
    // the fill: cool off the lake at night, low in the dark, teal under the water, peach at dawn
    { const fl = this.fill, dawnK = ramp(t, S.drain + 0.5, S.drained);
      if (t < S.dark) fl.color.setRGB(0.62, 0.7, 1.0), fl.intensity = t >= S.police ? 0.75 : 0.95;
      else if (t < S.rise) fl.color.setRGB(1.0, 0.78, 0.6), fl.intensity = 0.45;
      else if (t < S.drain) fl.color.setRGB(0.55, 1.0, 0.92), fl.intensity = 0.7;
      else fl.color.setRGB(1.0, 0.82, 0.72), fl.intensity = 0.6 + 0.3 * dawnK; }
    // the underwater look: a teal grade, deeper toward the lid (mild, so pink, white and gold still read). No scene fog:
    // fog is part of every material's shader, and the first fog frame recompiled ~60 of them (a six-second freeze at
    // 79 s on this machine, right before the lake comes down)
    const uk = under ? 1 : t >= S.rise && t < S.under ? ramp(t, S.under - 1.2, S.under) * 0.6 : t >= S.drain && t < S.drain + 1.5 ? 1 - ramp(t, S.drain + 0.2, S.drain + 1.5) : 0;
    const deep = under ? (t >= S.lid ? 1 : ramp(t, S.c2, S.lid)) : 0;
    fx.gain.setRGB(lerp(1, 0.88 - 0.05 * deep, uk), lerp(1, 1.04 - 0.02 * deep, uk), lerp(1, 1.04 - 0.02 * deep, uk));
    fx.lift.setRGB(0, lerp(0, 0.006, uk), lerp(0, 0.008, uk));
    const dawn = ramp(t, S.drain + 0.5, S.drained);
    fx.highTint.setRGB(lerp(1, 1.05, dawn), lerp(1, 0.98, dawn), lerp(1, 0.95, dawn));
    fx.vignette = 0.55 + (t >= S.lid && t < S.drain && !this.killOn ? 0.25 : 0) + (t >= S.dark && t < S.rise ? 0.12 : 0);
    // the sky in the reflections: night, the moon behind cloud in the dark, lavender and peach at dawn
    const su = this.su;
    const cloud = t >= S.dark && t < S.rise ? ramp(t, S.dark, S.dark + 1) : 0;
    su.uCloud.value = cloud; su.uStars.value = 1 - dawn; su.uMoon.value = 1 - dawn * 0.8;
    su.uTop.value.setRGB(lerp(0.012, 0.36, dawn), lerp(0.016, 0.3, dawn), lerp(0.05, 0.5, dawn));
    su.uHorizon.value.setRGB(lerp(0.06, 1.0, dawn), lerp(0.04, 0.62, dawn), lerp(0.16, 0.5, dawn));
  }

  _waterFrame(dt, t, lvl, under) {
    const u = this.wu, f = this.f;
    u.uTime.value += dt;
    const dawnPuddles = t >= S.drained;
    const show = !under && (lvl > 0.01 || (t >= S.surge && t < S.surge + 0.4) || dawnPuddles);
    this.water.visible = show;
    if (show) {
      this.water.position.y = dawnPuddles ? 0.012 : lvl;
      const front = t < S.surge + 0.32 ? lerp(5.6, -7.5, ramp(t, S.surge, S.surge + 0.3)) : -99;
      u.uFront.value = front;
      const rising = t >= S.rise && t < S.under ? ramp(t, S.rise, S.under) : 0;
      u.uAlpha.value = dawnPuddles ? 0.7 : (0.9 - 0.42 * rising) * (t >= S.drain ? 1 - ramp(t, S.drained - 0.8, S.drained) * 0.5 : 1);
      u.uPuddle.value = dawnPuddles ? 1 : 0;
      u.uMirrorOn.value = this.arena && this.arena.mirror ? 1 : 0;
      u.uMirrorMatrix.value = this.arena ? this.arena.u.uMirrorMatrix.value : u.uMirrorMatrix.value;
      u.uSky.value.copy(this.su.uHorizon.value).multiplyScalar(0.5);
      u.uReflK.value = t >= S.dark && t < S.rise ? 0.35 : t >= S.rise && t < S.under ? 0.45 : 1;
      // NEUTRAL: the brakes come off the world; the surface tilts toward the lake
      const tilt = t >= S.lean && t < S.rise ? smooth(S.lean, S.lean + 0.4, t) * 0.06 : 0;
      u.uTilt.value.set(-tilt * 0.6, -tilt * 0.8);
      // ripples: YOU's steps and dashes, her glide, every impact on the water
      if (lvl > 0.05 && t > S.surge + 0.3 && t < S.under) this._wakes(dt, t);
    }
    this.ripples = this.ripples.filter((r) => { r.age += dt; return r.age < 1.4; });
    for (let i = 0; i < 16; i++) { const r = this.ripples[i]; u.uRip.value[i].set(r ? r.x : 0, r ? r.z : 0, r ? r.age : 0, r ? r.k : 0); }
    // the crest of the surge, racing from the shore to the house
    const surging = t >= S.surge && t < S.surge + 0.36;
    this.crest.visible = surging;
    if (surging) { const k = ramp(t, S.surge, S.surge + 0.3); this.crest.position.set(0, 0, lerp(5.4, -7.2, k)); this.crest.material.uniforms.uT.value = t; this.crest.material.uniforms.uK.value = 1 - ramp(t, S.surge + 0.28, S.surge + 0.36); if (Math.random() < 0.9) for (let i = 0; i < 6; i++) this.particles.add({ x: -11 + Math.random() * 17, y: 0.5, z: this.crest.position.z, vx: (Math.random() - 0.5), vy: 2 + Math.random() * 3, vz: -3 - Math.random() * 3, life: 0.6, size: 0.12, color: new THREE.Color(0.9, 0.95, 1.0), gravity: 9, shape: 1 }); }
    // the rising wall of black water, and its fall
    const wallOn = t >= S.rise && t < S.under + 0.1;
    this.wallMesh.visible = wallOn;
    if (wallOn) { const k = ramp(t, S.rise, S.topple), wu = this.wallMesh.material.uniforms; wu.uH.value = 0.2 + 10.5 * k * Math.sqrt(k); wu.uT.value = t; wu.uK.value = Math.min(1, (t - S.rise) * 2); wu.uFall.value = ramp(t, S.topple, S.under); }
    // the meniscus wipes: over the camera into the lake at the second slam, back down past it at the drain
    const wu = this.wipe.material.uniforms; wu.uT.value = t;
    if (t >= S.under - 0.12 && t < S.under + 0.75) { wu.uK.value = 1 - ramp(t, S.under + 0.45, S.under + 0.75); wu.uLine.value = lerp(-0.1, 1.15, ramp(t, S.under - 0.12, S.under + 0.35)); }
    else if (t >= S.drain && t < S.drain + 0.9) { wu.uK.value = 1 - ramp(t, S.drain + 0.6, S.drain + 0.9); wu.uLine.value = lerp(1.15, -0.1, ramp(t, S.drain, S.drain + 0.55)); }
    else wu.uK.value = 0;
  }
  ripple(x, z, k = 1) { if (this.ripples.length >= 16) this.ripples.shift(); this.ripples.push({ x, z, age: 0, k: Math.min(1, k) }); }
  _wakes(dt, t) {
    const f = this.f, pl = f.player, b = f.boss;
    this.ripT -= dt;
    const sp = Math.hypot(pl.vx, pl.vz);
    if (this.ripT <= 0 && !onPier(pl.x, pl.z) && floorAt(pl.x, pl.z) < this.level && sp > 1) { this.ripT = 0.24; this.ripple(pl.x, pl.z, pl.state === 'dash' ? 1.3 : 0.55); if (pl.state === 'dash') this.splash(pl.x, pl.z, 10, 1.2); }
    if (b && this.solver && this.solver.glide && Math.random() < dt * 7) { this.ripple(b.x, b.z, 0.7); this.particles.add({ x: b.x, y: this.level + 0.05, z: b.z, vy: 1.5, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, life: 0.5, size: 0.07, color: new THREE.Color(0.85, 0.95, 1), gravity: 7, shape: 1 }); }
    // every impact on the water rings out
    for (const g of f.tele.list) if (g.end <= t && g.end > t - dt - 1e-4 && !g._rip) { g._rip = true; if (floorAt(g.x, g.z) < this.level) { this.ripple(g.x, g.z, 1.0); this.splash(g.x, g.z, 6, 0.8); } }
  }
  splash(x, z, n = 12, k = 1) { for (let i = 0; i < n; i++) this.particles.add({ x: x + (Math.random() - 0.5) * 0.4 * k, y: this.surf + 0.05, z: z + (Math.random() - 0.5) * 0.4 * k, vx: (Math.random() - 0.5) * 3 * k, vy: (2 + Math.random() * 3) * k, vz: (Math.random() - 0.5) * 3 * k, life: 0.7, size: 0.08 * k, color: new THREE.Color(0.85, 0.94, 1.0), gravity: 11, shape: 1 }); }
  fountain(x, z) { for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = Math.random(); this.particles.add({ x: x + Math.cos(a) * r * 0.8, y: 0, z: z + Math.sin(a) * r * 0.8, vx: Math.cos(a) * (1 + r * 3), vy: 7 + Math.random() * 5, vz: Math.sin(a) * (1 + r * 3), life: 1.6 + Math.random() * 0.6, size: 0.035 + Math.random() * 0.05, color: new THREE.Color(0.85, 0.92, 1.0), gravity: 10, drag: 0.4, shape: 1, alpha: 0.85 }); } for (let i = 0; i < 24; i++) this.particles.add({ x: x + (Math.random() - 0.5), y: 0.4, z: z + (Math.random() - 0.5), vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, life: 2.2, size: 0.4, grow: 0.8, color: new THREE.Color(0.7, 0.78, 0.85), gravity: 1, shape: 0, alpha: 0.25 }); }

  // YOUR car: rolls to the end of her pier, teeters, flares, tips, plunges; later sits on the lakebed, beams up the slope
  _carFrame(dt, t, under) {
    const c = this.car, pv = this.carPivot, ud = c.userData, end = this.carEnd;
    // her death scene has the car (death.js): where it stands on the lakebed, its lid, its lamps, and how it goes
    const K = this.kill;
    if (K && K.on) {
      pv.visible = K.vis !== false;
      pv.position.set(K.x, K.y + K.dip, K.z); pv.rotation.set(0, Math.PI, 0); pv.updateMatrixWorld();
      c.position.set(0, 0, 0); c.rotation.set(K.pitch, 0, 0);
      ud.hatch.rotation.x = K.hatch; ud.beamM.uniforms.uK.value = K.beam; MATS_HEAD(K.head); P.MAT.tail.emissiveIntensity = K.tail;
      return;
    }
    ud.hatch.rotation.x = 0; P.MAT.tail.emissiveIntensity = 1.2;
    let vis = true, theta = 0, slide = 0, drop = 0, lights = 1, beamK = 0;
    if (t < S.clunk) { slide = -3.5 * (S.clunk - t); }
    else if (t < S.tick) { const u = t - S.clunk; theta = 0.07 + 0.11 * Math.exp(-u * 2.2) * Math.sin(u * 8.5); }
    else if (t < S.tip) { const u = t - S.tick; theta = 0.07 + 0.07 * Math.exp(-u * 1.6) * Math.sin(Math.min(u, 0.3) * 10.5 + Math.max(0, u - 0.3) * 6); lights = 2.6; beamK = 1; }
    else if (t < S.splash) { const k = ramp(t, S.tip, S.splash); theta = lerp(0.1, 1.15, k * k); slide = 1.1 * k * k; lights = 2.6; beamK = 1; }
    else if (t < S.surge + 0.2) { const k = ramp(t, S.splash, S.surge + 0.2); theta = lerp(1.15, 1.5, k); slide = 1.1 + 2.2 * k; drop = 3.6 * k * k; lights = 2.6 * (1 - k); beamK = 1 - k; }
    else vis = false;
    if (under && t < S.drain + 0.3) {
      vis = true;
      pv.position.set(SPOTS.sunkCar.x, -0.32, SPOTS.sunkCar.z); pv.rotation.set(0, Math.PI, 0); pv.updateMatrixWorld();
      c.position.set(0, 0, 0); c.rotation.set(-0.12, 0, 0);
      const dark = t >= S.black && t < S.lightsBack;
      lights = dark ? 0 : 2.4; beamK = dark ? 0 : 0.75;
    } else if (vis) {
      pv.position.set(end.x + PIER.u.x * slide, PIER.deck - drop, end.z + PIER.u.z * slide);
      pv.rotation.set(0, PIER_ANGLE, 0, 'YXZ'); pv.rotateX(theta);
      c.position.set(0, 0.02, -(PIER.len - CAR_S)); c.rotation.set(0, 0, 0);
      for (const w of ud.wheels) w.rotation.x = t < S.clunk ? t * 10.6 : S.clunk * 10.6;
    }
    pv.visible = vis;
    ud.beamM.uniforms.uK.value = beamK;
    MATS_HEAD(lights);
    // the splash where the nose hits the water, the bulge, the car going under
    if (t >= S.splash && !this.events.splash) { this.events.splash = true; this.fountain(SPOTS.splash.x, SPOTS.splash.z); }
    if (t < S.splash) this.events.splash = false;
  }

  _propsFrame(dt, t, lvl, under) {
    const f = this.f;
    // YOUR cases: tumbling out of the car (0..1.4 s), then on the lawn until they burst
    for (const c of this.cases) {
      const o = c.o;
      if (c.state === 'burst' || c.state === 'sunk') { o.visible = false; continue; }
      o.visible = true;
      if (t < 1.4) {
        const k = clamp01(t / 1.4), door = pierPoint(CAR_S - 2.2 - 1.9 * (1 - Math.min(1, t / S.clunk)), c.id ? 0.4 : -0.4);
        const mid = pierPoint(0.2, c.id ? 0.4 : -0.3);
        const p = k < 0.55 ? { x: lerp(door.x, mid.x, k / 0.55), z: lerp(door.z, mid.z, k / 0.55) } : { x: lerp(mid.x, c.home.x, (k - 0.55) / 0.45), z: lerp(mid.z, c.home.z, (k - 0.55) / 0.45) };
        c.x = p.x; c.z = p.z;
        o.position.set(p.x, floorAt(p.x, p.z) + Math.abs(Math.sin(k * Math.PI * 3)) * 0.35 * (1 - k), p.z);
        o.rotation.set(Math.sin(k * 9) * 0.5 * (1 - k), c.ry + k * 3, Math.cos(k * 7) * 0.4 * (1 - k));
        continue;
      }
      // physics: knocked about by YOUR strikes, sliding to rest, over the balustrade and gone
      if (c.state === 'flying') {
        c.fly += dt; const k = c.fly / 0.7;
        o.position.set(lerp(c.fx, c.tx, k), Math.max(-1.2, 0.2 + Math.sin(Math.min(1, k) * Math.PI) * 1.2 - Math.max(0, k - 1) * 2), lerp(c.fz, c.tz, k));
        o.rotation.x += dt * 6; if (k >= 1 && !c.splashed) { c.splashed = true; this.splash(c.tx, c.tz, 18, 1.1); this.f.sfx && this.snd && this.snd('splashSmall', c.tx); }
        if (k > 1.6) c.state = 'sunk';
        continue;
      }
      // walked into, it's shoved aside (YOU and she never stand in a suitcase)
      for (const q of [f.player, f.boss]) {
        if (!q || (q.root && !q.root.visible) || q.intangible) continue;
        const R = (q === f.player ? 0.34 : 0.55) + 0.42, dx = c.x - q.x, dz = c.z - q.z, d = Math.hypot(dx, dz);
        if (d >= R) continue;
        const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
        const r = this.resolve(q.x + nx * R, q.z + nz * R, 0.42); c.x = r.x; c.z = r.z;
        if (c.vx * nx + c.vz * nz < 1.2) { c.vx = nx * 1.2; c.vz = nz * 1.2; }
      }
      const sp = Math.hypot(c.vx, c.vz);
      if (sp > 0.01) {
        const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
        const r = this.resolve(nx, nz, 0.42);
        if (r.hit && sp > 2.6 && !landward(nx + c.vx * 0.15, nz + c.vz * 0.15) && !onPier(nx, nz)) { c.state = 'flying'; c.fly = 0; c.fx = c.x; c.fz = c.z; c.tx = c.x + c.vx * 0.5; c.tz = c.z + c.vz * 0.5; this.snd && this.snd('leather', c.x); continue; }
        c.x = r.x; c.z = r.z; const dec = Math.max(0, sp - 7 * dt) / sp; c.vx *= dec; c.vz *= dec; c.ry += sp * dt * 1.5;
      }
      const shake = this.caseShake ? this.caseShake(c.id, t) : 0;
      const fl = Math.max(floorAt(c.x, c.z), lvl > 0.05 ? lvl - 0.12 : 0);
      o.position.set(c.x + shake * 0.03 * Math.sin(t * 90), fl + Math.abs(shake) * 0.04, c.z + shake * 0.02 * Math.cos(t * 77));
      o.rotation.set(0, c.ry + shake * 0.08 * Math.sin(t * 63), shake * 0.06 * Math.sin(t * 71));
    }
    // the third case comes out of the water in her hands, skips and bursts (driven by the choreography)
    // the flamingos: on the lawn; afloat and drifting in the flood; off over the balustrade at the lean
    this.flamingos.forEach((fl, i) => {
      const o = fl.o;
      if (fl.broken || under || t >= S.fall[0] + 1.4) { o.visible = false; return; }
      o.visible = true;
      let x = fl.home.x, z = fl.home.z, y = 0, roll = 0;
      if (lvl > 0.05 && t > S.surge + 0.2) {
        const u = t - S.surge; x += Math.sin(u * 0.4 + i * 2) * 0.9 + u * 0.01; z += Math.cos(u * 0.33 + i) * 0.6; y = lvl - 0.08 + Math.sin(u * 2.2 + i) * 0.03; roll = Math.sin(u * 1.7 + i) * 0.08;
        if (t >= S.fall[0]) { const k = ramp(t, S.fall[0], S.fall[0] + 1.4); z = lerp(z, 7.5, k * k); x = lerp(x, x + 2, k); y -= k * k * 0.8; }
      }
      fl.x = x; fl.z = z;
      o.position.set(x, y, z); o.rotation.z = roll;
    });
    // the garden table and chairs slide off into the lake at the lean
    { const g = this.garden; g.visible = t < S.fall[0] + 1.5;
      if (t >= S.fall[0] && g.visible) { const k = ramp(t, S.fall[0], S.fall[0] + 1.5); g.position.y = -k * k * 1.2; g.position.z = lerp(this.gardenZ ?? SPOTS.table.z, 7.2, k * k); } else if (t < S.fall[0]) { g.position.y = 0; this.gardenZ = g.position.z; } }
    this.mailbox.o.visible = !this.mailbox.broken;
    // the MISSING poles: up out of the water at "photo", leaning at "gravity", falling in pairs, lying in the silt, plastered on the lawn at dawn
    this.poles.forEach((p, i) => {
      const o = p.o; const up = S.poles;
      if (t < up) { o.visible = false; return; }
      o.visible = true;
      const rise = ramp(t, up, up + 0.16), over = Math.sin(clamp01((t - up) / 0.35) * Math.PI) * 0.25 * (1 - rise * 0.6);
      o.position.set(p.p.x, lerp(-4.2, 0, ease(rise)) + over, p.p.z);
      const pair = i % 3, tf = S.fall[pair];
      const lean = t >= S.lean ? smooth(S.lean, S.lean + 0.3, t) * 0.14 : 0;
      const fall = t >= tf ? ramp(t, tf, tf + 0.42) : 0;
      const ang = lean + (Math.PI / 2 - lean) * fall * fall + (fall >= 1 ? Math.sin(Math.min(1, (t - tf - 0.42) * 5) * Math.PI) * 0.05 * Math.exp(-(t - tf)) : 0);
      o.rotation.set(0, Math.atan2(0.6, 0.8), 0); o.rotateX(ang);
      if (fall >= 1) o.position.y = t > S.drained ? 0.02 : (under ? -0.2 : 0.08);
      const bd = o.userData.board;
      if (under && t > S.under + 2) { const k = ramp(t, S.under + 2 + i * 0.7, S.under + 8 + i); bd.position.set(Math.sin(t * 0.5 + i) * 0.4 * k, 3.05 + k * 1.2, 0.11 + k * 0.8); bd.rotation.set(-0.32 + k * 1.2, k * 0.8 * Math.sin(i), Math.sin(t * 0.7 + i) * 0.4 * k); }
      else if (t > S.drained) { bd.position.set(0.7, 2.6, 0.03); bd.rotation.set(-0.32, 0, 0.0); }
      else { bd.position.set(0, 3.05, 0.11); bd.rotation.set(-0.32, 0, 0); }
    });
    // the depth posts (10 FT .. 50 FT) along the line she drew toward YOU, rising one after another
    const PA = this.postsAt || defaultPosts();
    this.posts.forEach((p, i) => {
      const o = p.o, tu = S.posts[i];
      if (t < tu - 0.01) { o.visible = false; p.up = false; return; }
      o.visible = true; p.up = true; p.x = PA[i].x; p.z = PA[i].z;
      const k = ramp(t, tu, tu + 0.14); o.position.set(PA[i].x, lerp(-3.0, 0, ease(k)) + Math.sin(clamp01((t - tu) / 0.3) * Math.PI) * 0.12, PA[i].z);
      o.rotation.y = Math.atan2(this.f.cam.cam.position.x - PA[i].x, this.f.cam.cam.position.z - PA[i].z) * 0.0;
    });
    // YOUR gear lever, giant, up out of the black water; its H drawn on the water round it
    if (t >= S.stick - 0.01) { this.stick.visible = true; const k = ramp(t, S.stick, S.stick + 0.22); this.stick.position.y = lerp(-3.6, 0, ease(k)) + Math.sin(clamp01((t - S.stick) / 0.4) * Math.PI) * 0.15; this.stick.rotation.z = t >= S.fall[0] - 0.4 && t < S.rise ? Math.sin(t * 30) * 0.01 : 0; }
    else this.stick.visible = false;
    const hk = t >= S.stick && t < S.under ? ramp(t, S.stick, S.stick + 0.6) : 0;
    this.hpat.visible = hk > 0; this.hpat.position.y = lvl + 0.03; this.hpat.userData.m.opacity = hk * 0.32;
    this.hpat.children.forEach((b, i) => { b.scale.y = Math.max(0.001, clamp01(hk * 1.6 - i * 0.15)); });
    // the doormat's film of lake water, gone on "Just"; the spare key on its hook, lit on "spare key"
    const fm = this.mat.userData.film; fm.visible = t >= S.drain && t < S.just + 0.8; fm.material.opacity = 0.6 * (1 - ramp(t, S.just, S.just + 0.7)); fm.position.x = ramp(t, S.just, S.just + 0.7) * 1.4;
    const kg = t >= S.spare - 0.2 && t < S.home && !this.keyTaken ? Math.min(1, ramp(t, S.spare - 0.2, S.spare + 0.3)) * (0.6 + 0.4 * Math.sin(t * 6)) : 0;
    this.keyGlow.material.opacity = kg * 0.6;
    this.plaque.userData.key.visible = !this.keyTaken;
    // the topiaries: a heart, or a stump once trimmed
    this.topiary.forEach((n, i) => { if (n) n.visible = !this.trimmed[i]; this.stumps[i].visible = this.trimmed[i]; });
    // the front door: open in the outro when she goes home
    if (this.door) { const k = this.doorOpen ? clamp01(this.doorOpen(t)) : 0; this.door.quaternion.copy(this.doorQ).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -k * 1.6)); }
  }

  _stringsFrame(t) {
    const n = this.bulbs.length, m = this.bulbMesh, c = this.bulbCol;
    let k = 1;
    if (t >= S.still && t < S.surge) k = 0.3; else if (t >= S.dark) k = t < S.dark + 0.5 ? (Math.sin(t * 80) > 0 ? 0.4 : 0) * (1 - ramp(t, S.dark, S.dark + 0.5)) : 0;
    for (let i = 0; i < n; i++) {
      const on = t >= lerp(S.stringsOn, S.stringsFull, i / (n - 1)) ? 1 : 0;
      const tw = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7);
      const v = on * k * tw;
      c.setRGB(3.2 * v, 2.1 * v, 1.25 * v); m.setColorAt(i, c);
    }
    m.instanceColor.needsUpdate = true;
  }
  _neonFrame(t) {
    const flick = (t0) => (t - t0 < 0.4 ? (Math.sin((t - t0) * 70) > -0.2 ? 1 : 0.15) : 1);
    const buzz = 0.92 + 0.08 * Math.sin(t * 47) * Math.sin(t * 13);
    const relit = t >= S.neonRelit, dead = (t >= S.dark && t < S.neonRelit) || t >= S.neonDie;
    const verse2 = t >= S.police && t < S.dark ? (Math.sin(t * 9.3) * Math.sin(t * 4.1) > 0.82 ? 0.25 : 1) : 1;
    for (const w of this.neon1) {
      let k = t >= w.t ? flick(w.t) : 0;
      if (dead) k = t >= S.dark && t < S.dark + 0.6 ? (Math.sin(t * 60) > 0.3 ? 0.4 : 0) : 0;
      if (relit && !dead) k = flick(S.neonRelit) * 0.85;
      if (t >= S.drain && t < S.neonDie) k *= 0.6 + 0.4 * (Math.sin(t * 40) > 0 ? 1 : 0);
      w.mesh.material.color.setScalar(k * buzz * verse2 * 2.6); w.mesh.visible = k > 0.001;
    }
    for (const w of this.neon2) { let k = t >= w.t ? flick(w.t) : 0; if (t >= S.neonDie) k = 0; w.mesh.material.color.setScalar(k * buzz * 2.6); w.mesh.visible = k > 0.001; }
  }
  // the light bar turns once per bar; it stops with a beam on her for "on cue", then turns again
  barAngle(t) {
    const bm = this.f.bm; if (!bm) return 0;
    const bars = (bm.beatAt(t) - bm.beatAt(S.police)) / 4;
    const stopB = (bm.beatAt(S.cueStop) - bm.beatAt(S.police)) / 4, goB = (bm.beatAt(S.cueGo) - bm.beatAt(S.police)) / 4;
    const eff = bars < stopB ? bars : bars < goB ? stopB : bars - (goB - stopB);
    return this.barPhase + eff * Math.PI * 2;
  }
  _policeFrame(t) {
    const cr = this.cruiser, on = t >= S.police - 1.4 && t < S.dark + 3;
    cr.visible = on;
    if (!on) { this.gu.uBarK.value = 0; return; }
    const z = t < S.police ? lerp(-15, SPOTS.cruiser.z, ease(ramp(t, S.police - 1.4, S.police))) : t > S.dark ? lerp(SPOTS.cruiser.z, 17, ramp(t, S.dark + 0.3, S.dark + 3) ** 2) : SPOTS.cruiser.z;
    cr.position.set(SPOTS.cruiser.x, 0, z);
    const lit = t >= S.police && t < S.dark ? 1 : 0;
    if (this.barPhase === undefined) {
      // phase it so a beam lands on the porch steps where she'll be crying when the bar stops
      const bm = this.f.bm, stopB = (bm.beatAt(S.cueStop) - bm.beatAt(S.police)) / 4;
      const want = Math.atan2(SPOTS.steps.x - SPOTS.cruiser.x, SPOTS.steps.z - SPOTS.cruiser.z);
      this.barPhase = want - stopB * Math.PI * 2;
    }
    const a = this.barAngle(t);
    this.gu.uRed.value = a; this.gu.uBlue.value = a + Math.PI; this.gu.uBarK.value = lit * 0.75;
    this.gu.uBar.value.set(SPOTS.cruiser.x, 2, z);
    cr.userData.red.material.emissiveIntensity = lit * (2 + 2 * Math.max(0, Math.cos(a - Math.PI / 2)));
    cr.userData.blue.material.emissiveIntensity = lit * (2 + 2 * Math.max(0, Math.cos(a + Math.PI / 2)));
  }
  // is a beam on her right now (for her tears)
  beamOn(x, z, t) {
    if (t < S.police || t >= S.dark) return false;
    const a = this.barAngle(t), ang = Math.atan2(x - SPOTS.cruiser.x, z - SPOTS.cruiser.z);
    const d = (q) => Math.abs(Math.atan2(Math.sin(ang - q), Math.cos(ang - q)));
    return d(a) < 0.17 || d(a + Math.PI) < 0.17;
  }

  _underFrame(dt, t, under) {
    const gu = this.gu;
    this.bed.visible = under;
    // the sunken headlights: two soft warm ovals in the black past the pier's end; sliding to the front at the rise
    const flooded = t >= S.surge && t < S.under;
    let hk = flooded ? (t < S.dark ? 0.55 : 0.8) : 0;
    if (t >= S.rise && t < S.under) { const k = ramp(t, S.rise, S.under); gu.uHead.value[0].set(lerp(10.4, -1.6, k), lerp(7.6, 8.2, k), 0.9, 0.6); gu.uHead.value[1].set(lerp(11.0, -0.4, k), lerp(7.0, 8.2, k), 0.9, 0.6); }
    else { gu.uHead.value[0].set(10.4, 7.6, 0.9, 0.6); gu.uHead.value[1].set(11.0, 7.0, 0.9, 0.6); }
    // after her death scene: YOUR car's lamps, still on, down in the lake where it went (death.js fades them)
    const K = this.kill;
    if (K && K.glow > 0.002) { gu.uHead.value[0].set(K.gx - 0.6, K.gz, 0.8, 0.55); gu.uHead.value[1].set(K.gx + 0.6, K.gz, 0.8, 0.55); hk = K.glow; }
    gu.uHeadK.value = hk;
    this.glow.position.y = under ? 0.03 : Math.max(0.03, this.level + 0.02);
    // god rays, caustics, silt; at the lid the rays converge on her moon shaft and the rest goes dark (not in her
    // death scene: it's out past the shore, and the whole lakebed is its stage)
    const lid = t >= S.lid && t < S.drain && !this.killOn ? ramp(t, S.lid, S.lid + 1.0) : 0;
    this.shaftList.forEach((s, i) => this.shafts.set(s, under ? (i === 1 ? 0.55 + lid * 1.2 : 0.5 * (1 - lid)) : 0));
    this.shafts.update(dt);
    gu.uCaus.value = under ? 0.22 : 0; gu.uCausT.value += dt * (1 - lid * 0.92); gu.uLidK.value = lid;
    gu.uDark.value = t >= S.black && t < S.lightsBack ? 0.45 : 0;
    this.motes.mat.uniforms.uK.value = under ? 0.8 : 0; this.motes.update(dt);
    if (under && Math.random() < dt * 14) this.particles.add({ x: -12 + Math.random() * 18, y: 0.1, z: -7 + Math.random() * 13, vy: 0.9 + Math.random() * 0.8, life: 4, size: 0.04 + Math.random() * 0.05, color: new THREE.Color(0.7, 1.0, 1.0), wobble: 1.2, shape: 2, alpha: 0.7 });
  }

  _zoneFrame(t) {
    const on = t >= S.still && t < S.surge + 0.15;
    this.zone.visible = on;
    if (!on) return;
    this.zu.uFill.value = ramp(t, S.still, S.surge);
    this.zu.uAlpha.value = t < S.surge ? Math.min(1, (t - S.still) / 0.08) : 1 - ramp(t, S.surge, S.surge + 0.15);
    this.zu.uFlash.value = t >= S.surge ? 1 - ramp(t, S.surge, S.surge + 0.15) : 0;
  }

  // things that stand in the yard for a while: the car on the pier, the poles while they stand, the posts, the stick
  _colliders(t) {
    const d = this.dyn; d.length = 0;
    if (t < S.tip) { const c = pierPoint(CAR_S + Math.min(0, -3.5 * (S.clunk - t))), rot = -Math.atan2(PIER.u.z, PIER.u.x); d.push({ type: 'box', x: c.x, z: c.z, hx: 2.3, hz: 1.0, rot, cos: Math.cos(rot), sin: Math.sin(rot), tag: 'car' }); }
    for (const p of this.poles) if (p.o.visible && t >= S.poles + 0.1 && t < S.fall[this.poles.indexOf(p) % 3]) d.push({ type: 'circle', x: p.p.x, z: p.p.z, r: 0.3, tag: 'pole' });
    for (const p of this.posts) if (p.up) d.push({ type: 'circle', x: p.x, z: p.z, r: 0.17, tag: 'post' });
    if (this.stick.visible && t >= S.stick + 0.1) d.push({ type: 'circle', x: SPOTS.stick.x, z: SPOTS.stick.z, r: 0.52, tag: 'stick' });
    this.topiary.forEach((n, i) => { const p = SPOTS.topiary[i]; d.push({ type: 'circle', x: p.x, z: p.z, r: this.trimmed[i] ? 0.42 : 0.62, tag: 'topiary' }); });
    if (!this.garden.visible) {} else if (t < S.fall[0]) d.push({ type: 'circle', x: this.garden.position.x, z: this.garden.position.z, r: 0.5, tag: 'table' });
  }
  // her shots stop at cover: the topiary hearts, the poles while they stand, the stick shift, the car on the pier
  cover() {
    const out = this._cov || (this._cov = []); out.length = 0; const t = this.t;
    this.topiary.forEach((n, i) => { if (!this.trimmed[i]) out.push({ x: SPOTS.topiary[i].x, z: SPOTS.topiary[i].z, r: 0.75 }); });
    for (let i = 0; i < this.poles.length; i++) { const p = this.poles[i]; if (t >= S.poles + 0.1 && t < S.fall[i % 3]) out.push({ x: p.p.x, z: p.p.z, r: 0.32 }); }
    if (t >= S.stick + 0.1) out.push({ x: SPOTS.stick.x, z: SPOTS.stick.z, r: 0.55 });
    return out;
  }
  // what blocks YOUR headlights' beams on the lakebed
  beamBlockers() {
    const out = []; const t = this.t;
    if (t >= S.stick) out.push({ x: SPOTS.stick.x, z: SPOTS.stick.z, r: 0.75 });
    for (const p of this.posts) if (p.up) out.push({ x: p.x, z: p.z, r: 0.42 });
    this.topiary.forEach((n, i) => out.push({ x: SPOTS.topiary[i].x, z: SPOTS.topiary[i].z, r: this.trimmed[i] ? 0.45 : 0.85 }));
    return out;
  }

  // a cinder block from the pool
  block() { const b = this.blocks.find((x) => !x.busy) || this.blocks[0]; b.busy = true; b.o.visible = true; return b; }
  freeBlocks() { for (const b of this.blocks) { b.busy = false; b.o.visible = false; } }

  dispose() {
    const f = this.f, fx = f.app.post.fx;
    if (this._plSync) { delete f.player._sync; f.player.root.position.y = 0; }
    fx.gain.setRGB(1, 1, 1); fx.lift.setRGB(0, 0, 0); fx.highTint.setRGB(1, 1, 1); fx.vignette = 0.55;
    if (P.MAT.tail) P.MAT.tail.emissiveIntensity = 1.2;
    if (this.arena) { this.arena.mirror = this.mirrorObj; this.arena.dispose(); }
    if (this.lite) this.lite.dispose();
    this.scene.remove(this.group, this.sky, this.particles.mesh);
    this.shafts.dispose(); this.motes.dispose();
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } } });
  }
}

// the posts' line when nobody saw it drawn (practice from later in the song): down the left of the yard toward the
// shore, clear of the stick shift (2.7 m at the closest) so the two never wall off the middle of the yard
export function defaultPosts() { const a = { x: -6.6, z: -3.2 }, d = { x: 0.35, z: 0.937 }; const l = Math.hypot(d.x, d.z); return [3, 5.5, 8, 10.5, 13].map((s) => ({ x: a.x + d.x / l * s * 0.72, z: Math.min(5.0, a.z + d.z / l * s * 0.72) })); }

// headlight brightness lives on the shared car material
function MATS_HEAD(k) { if (P.MAT.head) P.MAT.head.emissiveIntensity = k; }
