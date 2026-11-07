// Strings of bulbs on the house, the shrubs, the hedge and the porch: one instanced draw. Each bulb has a group
// (eaves, shrubs, hedge fairy lights, porch), a palette slot and a phase. The set drives, per group, how bright
// it is; the palette (a holiday's colours); a beat flash; and how many have popped (the single click, the dawn).
import * as THREE from 'three';

const VS = /* glsl */`
attribute vec4 aB;     // x, y, z, size
attribute vec4 aI;     // group, palette slot, phase, hash
uniform vec4 uOn;      // per group brightness
uniform vec3 uPal[4];
uniform float uPop, uFlash, uTime, uChase;
varying vec3 vC; varying vec2 vUv;
void main() {
  int g = int(aI.x + 0.5); int s = int(aI.y + 0.5);
  float on = g == 0 ? uOn.x : g == 1 ? uOn.y : g == 2 ? uOn.z : uOn.w;
  on *= step(uPop, aI.w);
  float chase = 0.55 + 0.45 * sin(uTime * 6.0 - aI.z * 6.2832 * 3.0);
  on *= mix(1.0, chase, uChase);
  on *= 1.0 + uFlash * (0.6 + 0.4 * sin(aI.z * 40.0));
  vC = uPal[s] * on; vUv = position.xy;
  vec4 mv = viewMatrix * vec4(aB.xyz, 1.0);
  mv.xy += position.xy * aB.w * (on > 0.01 ? 1.0 : 0.0);
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */`
varying vec3 vC; varying vec2 vUv;
void main() { float r = length(vUv); float a = smoothstep(1.0, 0.0, r); a = a * a; if (a < 0.02 || max(vC.r, max(vC.g, vC.b)) < 0.005) discard; gl_FragColor = vec4(vC * (0.3 + 1.1 * a * a), 0.0) * a; }`;

export const PAL = {
  christmas: [0xff7a40, 0xffb04a, 0xfff1d6, 0xffc860], halloween: [0xff7a1a, 0xb070ff, 0xffb04a, 0xff7a1a], newyear: [0xffd060, 0xfff1d6, 0xffd060, 0xe0e0ff],
  valentine: [0xff5a4a, 0xffd060, 0xffe0d0, 0xff5a4a], easter: [0xffd060, 0xc8b8ff, 0xfff1d6, 0x9ae0d0], july: [0xffd060, 0xfff1d6, 0xff5a4a, 0xffffff],
  dad: [0xffd060, 0xfff1d6, 0xffb04a, 0xffd060], all: [0xff6a50, 0xffd060, 0xc8b8ff, 0xfff1d6],
};

export class Bulbs {
  constructor(parent) { this.parent = parent; this.items = []; }
  add(x, y, z, group, size = 0.07) { this.items.push([x, y, z, size, group, this.items.length % 4, Math.random(), Math.random()]); }
  line(a, b, n, group, sag = 0, size) { for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; this.add(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, a[2] + (b[2] - a[2]) * k, group, size); } }
  build() {
    const n = this.items.length;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(2, 2);
    geo.index = q.index; geo.setAttribute('position', q.attributes.position);
    const B = new Float32Array(n * 4), I = new Float32Array(n * 4);
    this.items.forEach((it, i) => { B.set(it.slice(0, 4), i * 4); I.set(it.slice(4), i * 4); });
    geo.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4)); geo.setAttribute('aI', new THREE.InstancedBufferAttribute(I, 4));
    geo.instanceCount = n;
    this.u = { uOn: { value: new THREE.Vector4() }, uPal: { value: PAL.christmas.map((c) => new THREE.Color(c).multiplyScalar(1.6)) }, uPop: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }, uChase: { value: 0 } };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 7;
    this.parent.add(this.mesh);
    return this;
  }
  palette(name, k = 1.25) { const p = PAL[name] || PAL.christmas; p.forEach((c, i) => this.u.uPal.value[i].set(c).multiplyScalar(k)); }
  set(eaves, shrubs, hedge, porch) { this.u.uOn.value.set(eaves, shrubs, hedge, porch); }
  dispose() { this.mesh.parent && this.mesh.parent.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
