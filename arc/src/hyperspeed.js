// Hyperspeed streaks: a tube of light around the camera axis that rushes past you, lit
// only by the catch dash. In-world (a child of the camera), one InstancedMesh, nothing
// inside INNER_RADIUS so the rider and the rail stay readable. SPACEBOARDING's lesson:
// a reward that nothing draws is a reward the player does not have.
import * as THREE from 'three';

const INNER_RADIUS = 5.5;
const OUTER_RADIUS = 34;
const FAR_Z = -160;
const NEAR_Z = 6;
const THRESHOLD = 0.08;
const FULL = 0.7;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / Math.max(1e-6, b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Hyperspeed {
  constructor(camera, { count = 220, random = Math.random } = {}) {
    this.count = count; this.random = random; this.intensity = 0;
    const geometry = new THREE.BoxGeometry(0.05, 0.05, 1, 1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, count);
    this.mesh.name = 'hyperspeed'; this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 8;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    camera.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(1, 1, 1); this.p = new THREE.Vector3();
    this.streaks = Array.from({ length: count }, () => this._spawn(true));
  }
  _spawn(initial = false) {
    const radius = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * Math.sqrt(this.random());
    const angle = this.random() * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.7 + 1.5, z: initial ? FAR_Z + this.random() * (NEAR_Z - FAR_Z) : FAR_Z - this.random() * 30, rate: 0.85 + this.random() * 0.5, length: 0.6 + this.random() * 0.9 };
  }
  // amount in 0..1 is the dash energy the player feels; speed in m/s
  update({ amount = 0, speed = 0, dt = 1 / 60 } = {}) {
    const wanted = smoothstep(THRESHOLD, FULL, amount);
    const rate = wanted > this.intensity ? 9.5 : 2.4;
    this.intensity += (wanted - this.intensity) * clamp(rate * dt, 0, 1);
    if (this.intensity < 0.004) { if (this.mesh.visible) this.mesh.visible = false; return; }
    this.mesh.visible = true;
    this.material.opacity = this.intensity * 0.8;
    const travel = (speed * 1.4 + 90) * (0.45 + this.intensity * 1.35);
    const stretch = 2.2 + this.intensity * 12;
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      s.z += travel * s.rate * dt;
      if (s.z > NEAR_Z) Object.assign(s, this._spawn(false));
      this.p.set(s.x, s.y, s.z); this.s.set(1, 1, s.length * stretch);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
