// Particles: sparks on the rail, the catch burst, splashes, and the ember spill when a
// boss's lines fall. One Points pool, CPU-integrated, additive, never more than one draw.
import * as THREE from 'three';

export class FX {
  constructor(scene, { max = 3000 } = {}) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 900 } },
      vertexShader: /* glsl */`
        attribute float aSize; attribute vec3 color; varying vec3 vColor; uniform float uScale;
        void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vColor * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true,
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 7; this.points.name = 'fx';
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  emit(p, { n = 10, color = 0xffb24a, speed = 6, spread = 1, dir = null, life = 0.6, size = 0.18, grav = 9, drag = 1.5, jitter = 0.5 } = {}) {
    this._c.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
      const o = i * 3;
      this.pos[o] = p.x + (Math.random() - 0.5) * jitter; this.pos[o + 1] = p.y + (Math.random() - 0.5) * jitter; this.pos[o + 2] = p.z + (Math.random() - 0.5) * jitter;
      let vx = (Math.random() - 0.5), vy = (Math.random() - 0.5), vz = (Math.random() - 0.5);
      const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
      if (dir) { vx = dir.x + vx * spread; vy = dir.y + vy * spread; vz = dir.z + vz * spread; }
      const sp = speed * (0.5 + Math.random());
      this.vel[o] = vx * sp; this.vel[o + 1] = vy * sp; this.vel[o + 2] = vz * sp;
      this.life[i] = life * (0.6 + Math.random() * 0.8); this.age[i] = 0; this.grav[i] = grav; this.drag[i] = drag;
      const v = 0.7 + Math.random() * 0.5;
      this.col[o] = this._c.r * v; this.col[o + 1] = this._c.g * v; this.col[o + 2] = this._c.b * v;
      this.size[i] = size * (0.7 + Math.random() * 0.6);
    }
  }

  update(dt) {
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      const o = i * 3;
      if (this.age[i] >= this.life[i]) { this.size[i] = 0; continue; }
      alive++;
      const k = 1 - this.age[i] / this.life[i];
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[o] *= d; this.vel[o + 2] *= d; this.vel[o + 1] = this.vel[o + 1] * d - this.grav[i] * dt;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      this.size[i] = Math.max(this.size[i], 0.001);
      this.col[o] *= (1 - dt * 0.4); this.col[o + 1] *= (1 - dt * 0.7); this.col[o + 2] *= (1 - dt * 1.2);
      if (k < 0.3) this.size[i] *= (1 - dt * 2.5);
    }
    if (alive === 0 && this.n > 0) this.n = 0;
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true;
  }
}
