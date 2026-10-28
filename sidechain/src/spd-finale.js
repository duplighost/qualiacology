// Spiked: outside, the morning. Out of the club's doors into the light: a street of brick and
// stone with the sun coming up at the end of it, steam off the grates, the pigeons going up off
// the road as she comes, and the bus waiting for her on the road, lit inside, HOME on its sign.
// The night said "never going home". Back to her own size, and the bus.

import * as THREE from 'three';
import { extend, col } from './scenery.js';
import { prepare, groundAt, floorAt } from './trail.js';
import { buildBus } from './vehicles.js';
import { spdTexture, cellPlane } from './spd-tex.js';
import { seeded } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };

// ---------- the street in the morning ----------
extend({
  kits: {
    spdMorning(S, z, R) {
      const fronts = [0xb8664a, 0xc8a07a, 0xdccbaa, 0x9e5a48, 0xa88a6a, 0xe6d6bc, 0xc07858, 0x8a6a5a];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.3 + R() * 0.16) {
          S.items.push(onGround(S, { t, x: side * (25 + R() * 5), rot: SIDE(side) + (R() - 0.5) * 0.04, s: 0.95 + R() * 0.3, sy: 0.6 + R() * 1.1, parts: 'block', tint: col(pick(R, fronts)), seed: R(), wake0: z.wake0 ?? 0.12 }));
          if (R() < 0.7) S.items.push(onGround(S, { t: t + R() * 0.2, x: side * (58 + R() * 110), rot: R() * 0.4, s: 0.9 + R() * 0.5, sy: 0.7 + R() * 1.8, parts: R() < 0.45 ? 'tower' : 'block', tint: col(pick(R, [0xd8b8a0, 0xc8a890, 0xe8d0b8, 0xb89880])), seed: R(), wake0: 0.08 }));
          if (R() < 0.55) S.items.push(onGround(S, { t: t + 0.1, x: side * (15.8 + R() * 1.5), s: 0.75 + R() * 0.3, sy: 1 + R() * 0.3, parts: 'tree', tint: col(pick(R, [0x3a6a2a, 0x4a7a32, 0x2e5a26])), seed: R() }));
          if (R() < 0.5) S.items.push(onGround(S, { t: t + R() * 0.2, x: side * 11.2, rot: SIDE(side) + Math.PI / 2 + (R() - 0.5) * 0.1, parts: 'parked', tint: col(pick(R, [0xe8e4dc, 0x3a4a6a, 0x8a2a2a, 0x2a2a30, 0xd8c8a0, 0x5a6a5a])) }));
        }
        for (let t = z.from; t < z.to; t += 0.62) S.items.push(onGround(S, { t, x: side * 13.5, rot: SIDE(side), parts: 'lamp', seed: R(), dim: z.dim ?? 0.3 }));
      }
      for (const [t, x, sg] of z.signs || []) S.items.push(onGround(S, { t, x, s: 1.1, parts: 'sign', idx: S.atlas.index[sg], seed: 0.5, wake0: 0.9, keepLit: true }));
    },
  },
});

// ---------- the pigeons ----------
function birdBody() {
  const g = new THREE.SphereGeometry(0.22, 8, 6); g.scale(1, 0.85, 1.7);
  const h = new THREE.SphereGeometry(0.12, 8, 6); h.translate(0, 0.12, 0.34);
  const t = new THREE.ConeGeometry(0.1, 0.32, 5); t.rotateX(-Math.PI / 2); t.translate(0, 0, -0.42);
  const parts = [g, h, t].map((x) => (x.index ? x.toNonIndexed() : x));
  const out = new THREE.BufferGeometry();
  const pos = [], nor = [];
  for (const p of parts) { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
function birdWing() { const g = new THREE.PlaneGeometry(0.62, 0.3); g.translate(0.31, 0, 0); g.rotateX(-Math.PI / 2); return g; }

// a soft plume for the steam off the grates
const STEAM_VS = 'varying float vL; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vL = uv.y; vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }';
const STEAM_FS = 'uniform float uTime; uniform vec3 uCol; uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } float n(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); } void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float puff = 0.5 + 0.5 * n(vec2(vUv.x * 5.0 + uTime * 0.2, vL * 3.0 - uTime * 0.7)); float a = pow(f, 1.5) * pow(max(1.0 - vL, 0.0), 1.2) * smoothstep(0.0, 0.08, vL) * puff * uK; gl_FragColor = vec4(uCol, clamp(a, 0.0, 0.7)); }';

export class SpdMorningFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 3.2;
    prepare(course, scenery.plan);
    // the bus, on the road ahead of her, come for her: its nose to her, waiting
    this.group = new THREE.Group(); scene.add(this.group);
    this.bus = buildBus('HOME');
    const sc = cfg.busS ?? 1.3; this.bus.scale.setScalar(sc); this.bus.rotation.y = Math.PI;
    this.group.add(this.bus);
    // HOME big over its windscreen, where a bus says where it's going
    const sign = new THREE.Mesh(cellPlane('home', 2.4, 0.6), new THREE.MeshBasicMaterial({ map: spdTexture(), color: new THREE.Color(1.7, 1.6, 1.5), polygonOffset: true, polygonOffsetFactor: -4 }));
    sign.position.set(0, 2.98, 6.22); this.bus.add(sign);
    this.lights = this.bus.userData.lights || [];
    // the pigeons, down on the street until she comes
    const R = seeded(311);
    this.birds = [];
    for (let k = 0; k < 34; k++) this.birds.push({ t: (cfg.birdsAt ?? 138.8) + R() * 2.4, x: (R() < 0.5 ? -1 : 1) * (4 + R() * 18), go: (cfg.birdsGo ?? 135.8) + R() * 0.9, a: R() * 6.28, r: 10 + R() * 20, up: 26 + R() * 30, sp: 0.35 + R() * 0.3, ph: R() * 6.28, white: R() < 0.2 });
    const bm = new THREE.MeshStandardMaterial({ color: 0x8a8a96, roughness: 0.8 });
    const wm = new THREE.MeshStandardMaterial({ color: 0x9a9aa8, roughness: 0.8, side: THREE.DoubleSide });
    this.bodies = new THREE.InstancedMesh(birdBody(), bm, 34); this.wings = new THREE.InstancedMesh(birdWing(), wm, 68);
    for (const m of [this.bodies, this.wings]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; scene.add(m); }
    // the steam off the grates
    this.steamMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(1, 0.94, 0.88) }, uK: { value: 0.8 } }, vertexShader: STEAM_VS, fragmentShader: STEAM_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const sg = new THREE.CylinderGeometry(4.5, 1.0, 16, 14, 1, true); sg.translate(0, 8, 0);
    this.steam = (cfg.steam || []).map(([t, x]) => { const m = new THREE.Mesh(sg, this.steamMat); m.frustumCulled = false; m.visible = false; scene.add(m); return { t, x, m }; });
    this.fired = false; this.earned = 0.5; this.lit = 0.6;
    this._p = new THREE.Vector3(); this._f = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._s = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned ?? 0.6; }
  update(track, rider, songT, dt) {
    const c = this.course, T = rider.t, S = this.S;
    const show = T > this.t - 40;
    this.bus.visible = show; this.bodies.visible = show; this.wings.visible = show;
    // the bus on the road ahead, its nose to her. Once she's stopping it rolls up to the same
    // thirty-odd metres in front of where she'll stop, however fast she came
    if (this.busT === undefined) this.busT = this.t;
    if (rider.stopping && this.stop0 === undefined) this.stop0 = rider.t;
    const v0 = Math.max(12, rider.stopV0 || rider.v || 38);
    const want = this.stop0 !== undefined ? this.stop0 + 0.62 + (this.cfg.busGap ?? 31) / v0 : this.t;
    this.busT += (want - this.busT) * Math.min(1, dt * 1.6);
    const p = track.at(this.busT, this.x, 0.02, this._p);
    const f = track.dirAt(this.busT, this._f);
    this.group.position.copy(p);
    this.group.rotation.set(-Math.asin(clamp(f.y, -1, 1)), Math.atan2(f.x, f.z), -track.bankAt(this.busT), 'YXZ');
    this.group.updateMatrixWorld(true);
    this.lit += ((this.fired ? 0.75 + 0.35 * this.earned : 0.6) - this.lit) * Math.min(1, dt);
    if (S && show) {
      // its lights; hazards blinking while it waits
      const blink = Math.sin(songT * 6.5) > 0 ? 1 : 0.15;
      for (const [ox, oy, oz, size, cc, k0, mode] of this.lights) { this._w.set(ox, oy, oz).applyMatrix4(this.bus.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, size * 1.3, cc, k0 * (oz < 0 ? blink : 1)); }
      // warm light in the windows, the sign
      this._w.set(0, 2.2, 0).applyMatrix4(this.bus.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 16, [1, 0.8, 0.55], 0.28 * this.lit);
      this._w.set(0, 2.36, -6.4).applyMatrix4(this.bus.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 5, [1, 0.75, 0.4], 0.7 * this.lit);
    }
    // the pigeons: on the street, then up and away ahead into the light, round and round
    let nb = 0, nw = 0;
    const m = this._m, q = this._q, e = this._e, s = this._s, b = this._b;
    for (const bd of this.birds) {
      if (bd.t > T + 40 || !show) continue;
      track.ground(bd.t, bd.x, b); const gy = groundAt(c, bd.t, bd.x);
      const a = Math.max(0, T - bd.go);
      const yaw0 = c.sample(bd.t).yaw;
      let y = gy + 0.25, flap = 0, heading = yaw0 + bd.a;
      if (a > 0) {
        // up fast at first, then circling high over the street ahead
        const up = bd.up * (1 - Math.exp(-a * 0.9)), ang = bd.a + a * bd.sp, fwd = 30 * (1 - Math.exp(-a * 0.5));
        b.x += Math.sin(yaw0) * fwd + Math.cos(ang) * bd.r * smooth(0, 4, a); b.z += Math.cos(yaw0) * fwd - Math.sin(ang) * bd.r * smooth(0, 4, a);
        y = gy + 0.25 + up;
        heading = ang + Math.PI / 2;
        flap = Math.sin((songT + bd.ph) * (a < 2 ? 24 : 14));
      } else { heading += Math.sin(songT * 1.3 + bd.ph) * 0.6; y += Math.abs(Math.sin(songT * 3 + bd.ph)) * 0.05; }
      e.set(a > 0 ? -0.25 : 0, heading, 0); q.setFromEuler(e);
      b.y = y; m.compose(b, q, s.set(1.6, 1.6, 1.6)); this.bodies.setMatrixAt(nb++, m);
      for (const sd of [-1, 1]) {
        e.set(a > 0 ? -0.25 : 0, heading, sd * (a > 0 ? 0.2 + 0.9 * flap : 1.35)); q.setFromEuler(e);
        m.compose(b, q, s.set(sd * 1.6, 1.6, 1.6)); this.wings.setMatrixAt(nw++, m);
      }
    }
    this.bodies.count = nb; this.wings.count = nw;
    this.bodies.instanceMatrix.needsUpdate = true; this.wings.instanceMatrix.needsUpdate = true;
    // the steam
    this.steamMat.uniforms.uTime.value = songT;
    for (const st of this.steam) {
      st.m.visible = show && st.t < T + 30 && st.t > T - 4;
      if (!st.m.visible) continue;
      track.ground(st.t, st.x, b); b.y = groundAt(c, st.t, st.x);
      st.m.position.copy(b); st.m.rotation.set(0.12 * Math.sin(songT * 0.4 + st.x), 0, 0.15 * Math.sin(songT * 0.3 + st.t));
    }
  }
}
