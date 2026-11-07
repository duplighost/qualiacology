// Fire: every flame in the yard in one instanced draw. A flame is a camera-facing card (it turns about its own
// upright) drawn as a licking tongue of scrolled noise, crimson at the tips through orange at the root, never
// yellow-gold (gold is YOU's). Each flame belongs to a group (the bed, the ring of fire, the block, a present,
// the table...) whose level the set drives from song time; a flame can also have its own ignition time (the
// fuse running round the block). Additive, depth-tested, no depth write.
import * as THREE from 'three';

const MAX_G = 24;
const VS = /* glsl */`
attribute vec4 aFlame;   // x, y, z, width
attribute vec4 aLook;    // height, phase, group, ignite (song time; -1 = always)
uniform float uTime, uSong;
uniform vec2 uG[${MAX_G}];   // per group: level 0..1, height multiplier
varying vec2 vUv; varying float vLevel; varying float vPhase; varying float vHot;
void main() {
  int gi = int(aLook.z + 0.5);
  vec2 G = uG[gi];
  float ign = aLook.w < 0.0 ? 1.0 : smoothstep(aLook.w, aLook.w + 0.25, uSong);
  float lvl = G.x * ign;
  vLevel = lvl; vPhase = aLook.y; vUv = uv;
  vHot = clamp(1.0 - abs(uv.x - 0.5) * 2.0, 0.0, 1.0);
  vec3 base = (modelMatrix * vec4(aFlame.xyz, 1.0)).xyz;
  float h = aLook.x * G.y * (0.75 + 0.25 * lvl) * (0.82 + 0.18 * sin(uTime * 7.0 + aLook.y * 6.28));
  float w = aFlame.w * (0.7 + 0.3 * lvl);
  // a cylindrical billboard: the card turns about its upright to face the camera
  vec3 toCam = cameraPosition - base; toCam.y = 0.0;
  vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-5);
  float sway = sin(uTime * 3.1 + aLook.y * 9.0) * 0.12 * uv.y * uv.y * h;
  vec3 p = base + right * ((uv.x - 0.5) * w + sway) + vec3(0.0, uv.y * h * step(0.001, lvl), 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FS = /* glsl */`
uniform float uTime, uGain;
varying vec2 vUv; varying float vLevel; varying float vPhase; varying float vHot;
float h2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main() {
  if (vLevel < 0.005) discard;
  vec2 uv = vUv;
  float t = uTime * 1.35 + vPhase * 10.0;
  float n1 = vn(vec2(uv.x * 2.6 + vPhase * 7.0, uv.y * 2.1 - t * 1.9));
  float n2 = vn(vec2(uv.x * 6.0 - vPhase * 3.0, uv.y * 4.6 - t * 3.2));
  float n = n1 * 0.62 + n2 * 0.38;
  float h = uv.y;
  // the tongue: a teardrop that narrows and sways to its tip; licks break off near the top
  float w = 0.44 * pow(max(0.0, 1.0 - h), 0.85) * smoothstep(-0.04, 0.1, h);
  float x = uv.x - 0.5 + (n - 0.5) * 0.55 * h;
  float body = 1.0 - smoothstep(w * 0.5, w, abs(x));
  float cut = smoothstep(0.22, 0.5, n + (1.0 - h) * 0.62 - 0.22);
  float a = body * cut;
  if (a < 0.02) discard;
  float core = (1.0 - smoothstep(0.0, w * 0.55, abs(x))) * (1.0 - smoothstep(0.05, 0.62, h));
  vec3 crimson = vec3(0.62, 0.02, 0.04), orange = vec3(1.0, 0.24, 0.02), hot = vec3(1.0, 0.45, 0.12);
  vec3 c = mix(crimson, orange, smoothstep(0.7, 0.18, h) * (0.55 + 0.45 * n));
  c = mix(c, hot, core * 0.6);
  float k = vLevel * uGain;
  float e = (0.42 + 0.78 * core) * a * k;
  gl_FragColor = vec4(c * e, a * k * 0.38);
}`;

export class Flames {
  constructor(scene, parent = scene) {
    this.scene = scene; this.parent = parent; this.items = []; this.groups = new Map(); this.mesh = null;
    this.u = { uTime: { value: 0 }, uSong: { value: 0 }, uGain: { value: 1 }, uG: { value: Array.from({ length: MAX_G }, () => new THREE.Vector2(0, 1)) } };
  }
  group(name) { if (!this.groups.has(name)) { if (this.groups.size >= MAX_G) throw new Error('fire: too many groups'); this.groups.set(name, this.groups.size); } return this.groups.get(name); }
  // a flame: x, z, y (base), w (card width), h (height), group, ignite (song time or -1)
  add({ x, z, y = 0, w = 0.7, h = 1.2, group = 'misc', ignite = -1, phase }) {
    this.items.push({ x, y, z, w, h, g: this.group(group), ignite, phase: phase ?? Math.random() });
  }
  // flames scattered over a rectangle (x0..x1, z0..z1), about `step` metres apart
  fillRect(x0, z0, x1, z1, step, o = {}) {
    for (let z = z0 + step * 0.5; z < z1; z += step) for (let x = x0 + step * 0.5; x < x1; x += step) {
      const jx = (Math.random() - 0.5) * step * 0.9, jz = (Math.random() - 0.5) * step * 0.9;
      this.add({ ...o, x: x + jx, z: z + jz, h: (o.h ?? 2) * (0.7 + Math.random() * 0.6), w: (o.w ?? 1.1) * (0.8 + Math.random() * 0.5) });
    }
  }
  build() {
    const n = this.items.length;
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1, 1, 4); base.translate(0.5, 0.5, 0);
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    const A = new Float32Array(n * 4), L = new Float32Array(n * 4);
    this.items.forEach((it, i) => { A.set([it.x, it.y, it.z, it.w], i * 4); L.set([it.h, it.phase, it.g, it.ignite], i * 4); });
    geo.setAttribute('aFlame', new THREE.InstancedBufferAttribute(A, 4));
    geo.setAttribute('aLook', new THREE.InstancedBufferAttribute(L, 4));
    geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8;
    this.parent.add(this.mesh);
    return this;
  }
  set(name, level, height = 1) { const i = this.groups.get(name); if (i === undefined) return; this.u.uG.value[i].set(Math.max(0, level), height); }
  level(name) { const i = this.groups.get(name); return i === undefined ? 0 : this.u.uG.value[i].x; }
  update(dt, songT) { this.u.uTime.value += dt; this.u.uSong.value = songT; }
  dispose() { if (this.mesh) { this.mesh.parent && this.mesh.parent.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); } }
}
