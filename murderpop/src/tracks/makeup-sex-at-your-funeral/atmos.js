// Air and edges: rose petals falling through the cemetery chorus, pouring at sunrise, white and blush at the
// wedding; the bright leading edge of a floor ripple (the set changing under your feet).
import * as THREE from 'three';
import { LAYER } from '../../game/arena.js';

const N = 220;
export class Petals {
  constructor(scene) {
    const g = new THREE.PlaneGeometry(0.09, 0.06);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    this.mesh = new THREE.InstancedMesh(g, this.mat, N);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.castShadow = false;
    scene.add(this.mesh);
    this.p = Array.from({ length: N }, (_, i) => ({ x: 0, y: -1, z: 0, s: Math.random() * 6, w: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28, live: false, seed: i }));
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._sc = new THREE.Vector3(1, 1, 1);
    this.rate = 0; this.palette = [new THREE.Color(0xc8102e), new THREE.Color(0xff6f8f)];
    this.acc = 0;
  }
  // rate: petals per second; palette: colours
  set(rate, palette) { this.rate = rate; if (palette) this.palette = palette; }
  clear() { for (const q of this.p) q.live = false; }
  update(dt, focus) {
    this.acc += this.rate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      const q = this.p.find((x) => !x.live); if (!q) break;
      q.live = true; q.x = focus.x + (Math.random() - 0.5) * 26; q.z = focus.z + (Math.random() - 0.6) * 18; q.y = 6 + Math.random() * 3;
      q.vy = -(0.7 + Math.random() * 0.5); q.c = this.palette[Math.floor(Math.random() * this.palette.length)];
    }
    let n = 0;
    const C = this.mesh.instanceColor.array;
    for (const q of this.p) {
      if (!q.live) continue;
      q.y += q.vy * dt; q.ph += dt * q.w * 3;
      q.x += Math.sin(q.ph * 0.7) * 0.4 * dt + 0.25 * dt; q.z += Math.cos(q.ph * 0.5) * 0.3 * dt;
      if (q.y <= 0.02) { q.y = 0.02; q.rest = (q.rest || 0) + dt; if (q.rest > 3) { q.live = false; q.rest = 0; continue; } }
      this._e.set(q.y > 0.03 ? Math.sin(q.ph) * 1.2 : -Math.PI / 2, q.ph, q.y > 0.03 ? Math.cos(q.ph * 0.8) : 0);
      this._q.setFromEuler(this._e); this._v.set(q.x, q.y, q.z);
      this._m.compose(this._v, this._q, this._sc); this.mesh.setMatrixAt(n, this._m);
      C[n * 3] = q.c.r; C[n * 3 + 1] = q.c.g; C[n * 3 + 2] = q.c.b;
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// the leading edge of a floor ripple: a thin seam of warm light at the wipe's radius (thin and dim: a white ring
// on the floor means "get out" in this game)
export class RippleEdge {
  constructor(scene) {
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uR: { value: 0 }, uK: { value: 0 }, uC: { value: new THREE.Color(1.5, 1.05, 0.8) } },
      vertexShader: 'varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uR, uK; uniform vec3 uC; uniform vec2 uO; varying vec2 vP;
        void main(){ float d = length(vP - uO); float e = exp(-pow((d - uR) / 0.12, 2.0)) + 0.18 * exp(-pow((d - uR + 0.5) / 0.4, 2.0));
          float a = e * uK; if (a < 0.01) discard; gl_FragColor = vec4(uC * a, a); }` });
    m.uniforms.uO = { value: new THREE.Vector2() };
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), m); this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.y = 0.03;
    this.mesh.renderOrder = 1; this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.layers.set(LAYER.NO_REFLECT);
    scene.add(this.mesh);
  }
  set(r) {
    const u = this.mesh.material.uniforms;
    if (!r) { this.mesh.visible = false; return; }
    this.mesh.visible = true; this.mesh.position.x = 0; this.mesh.position.z = 0;
    u.uO.value.set(r.c[0], r.c[1]); u.uR.value = r.k * 30; u.uK.value = Math.sin(Math.min(1, r.k) * Math.PI) * 0.55 + (r.k < 0.1 ? r.k * 3 : 0);
  }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
