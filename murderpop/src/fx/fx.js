// Effects: particles (sparks, chips, glitter, dust, petals), ribbon trails, the aim line, the catch flash,
// near-miss glints, the spotlight cone, and screen pushes (flash, aberration) on the post stack. The strike's own
// pictures (the cut's arc, the star where it lands, floor rings, the guard, the solo's pips) are in strikes.js.
import * as THREE from 'three';
import { FXK } from '../engine/post.js';
import { StrikeFX, SX_GOLD, SX_IVORY, SX_PINK, SX_WHITE } from './strikes.js';

const TRAIL_VS = 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * (viewMatrix * vec4(position,1.0)); }';
const TRAIL_FS = 'uniform vec3 uC; uniform float uFxK; varying float vA; void main(){ gl_FragColor = vec4(uC * vA * uFxK, vA); }';

const MAXP = 2400;
const PVS = /* glsl */`
attribute vec4 aP;   // x y z size
attribute vec4 aV;   // vx vy vz (for stretch), shape
attribute vec4 aC;   // r g b alpha
varying vec2 vUv; varying vec4 vC; varying float vShape;
void main() {
  vUv = position.xy; vC = aC; vShape = aV.w;
  vec4 mv = viewMatrix * vec4(aP.xyz, 1.0);
  vec3 vel = (viewMatrix * vec4(aV.xyz, 0.0)).xyz;
  float sp = length(vel.xy);
  vec2 dir = sp > 0.001 ? vel.xy / sp : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float stretch = 1.0 + min(sp * 0.06, 3.0) * step(0.5, aV.w) * step(aV.w, 1.5); // sparks stretch
  vec2 p = nrm * position.x * aP.w + dir * position.y * aP.w * stretch;
  mv.xy += p;
  gl_Position = projectionMatrix * mv;
}`;
const PFS = /* glsl */`
uniform float uFxK;
varying vec2 vUv; varying vec4 vC; varying float vShape;
void main() {
  float r = length(vUv);
  float a;
  int s = int(vShape + 0.5);
  if (s == 1) a = smoothstep(1.0, 0.0, abs(vUv.x) * 1.6 + abs(vUv.y) * 0.5);            // spark streak
  else if (s == 2) { vec2 q = abs(vUv); a = step(q.x * 1.6 + q.y, 0.9) * 0.95; }        // chip / shard
  else if (s == 3) { vec2 q = abs(vUv); a = max(smoothstep(0.18, 0.0, q.x) * smoothstep(1.0, 0.0, q.y), smoothstep(0.18, 0.0, q.y) * smoothstep(1.0, 0.0, q.x)); } // glitter cross
  else if (s == 4) { vec2 q = vUv; q.x *= 1.8; a = smoothstep(0.75, 0.55, length(q)); }  // petal
  else a = smoothstep(1.0, 0.0, r) * 0.6;                                                 // soft dust/glow
  a *= vC.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC.rgb * a * (s == 2 ? 1.0 : uFxK), a * (s == 2 ? 1.0 : 0.6));
}`;

export class FX {
  constructor(scene, post, camera) {
    this.scene = scene; this.post = post; this.camera = camera;
    this.p = [];
    const geo = new THREE.PlaneGeometry(2, 2);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4);
    this.aV = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4);
    this.aC = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4);
    for (const a of [this.aP, this.aV, this.aC]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aP', this.aP); geo.setAttribute('aV', this.aV); geo.setAttribute('aC', this.aC);
    this.pm = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ vertexShader: PVS, fragmentShader: PFS, uniforms: { uFxK: FXK }, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }), MAXP);
    this.pm.count = 0; this.pm.frustumCulled = false; this.pm.renderOrder = 6;
    scene.add(this.pm);
    this.trails = [];
    // aim line: a flat gold lane + landing circle
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.4), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    this.aim = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1), lm); this.aim.rotation.x = -Math.PI / 2; this.aim.visible = false; this.aim.renderOrder = 4;
    this.aimEnd = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), lm); this.aimEnd.rotation.x = -Math.PI / 2; this.aimEnd.visible = false;
    scene.add(this.aim, this.aimEnd);
    // catch ring around YOU
    this.catchRing = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 0.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.catchRing.rotation.x = -Math.PI / 2; this.catchRing.renderOrder = 4; scene.add(this.catchRing);
    this.catchK = 0; this.catchPerfect = false;
    // spotlight cone
    const cone = new THREE.ConeGeometry(2.2, 14, 40, 1, true); cone.translate(0, -7, 0);
    this.spotCone = new THREE.Mesh(cone, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uK: { value: 0 }, uCol: { value: new THREE.Color(1.6, 1.4, 1.1) }, uFxK: FXK },
      vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; uniform vec3 uCol; uniform float uFxK; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 1.5); float h = smoothstep(-14.0, -10.0, vY) * smoothstep(0.0, -3.0, vY); float a = (0.03 + 0.12 * (1.0 - f)) * h * uK; gl_FragColor = vec4(uCol * a * uFxK, a); }` }));
    this.spotCone.position.set(0, 14, 0); this.spotCone.visible = false; scene.add(this.spotCone);
    // the light's pool on the floor: soft, a little brighter at its rim, like a real follow-spot
    this.spotPool = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uK: { value: 0 }, uCol: { value: new THREE.Color(1.15, 1.0, 0.8) }, uFxK: FXK },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy / 2.3; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position, 1.0))); }',
      fragmentShader: 'uniform float uK; uniform vec3 uCol; uniform float uFxK; varying vec2 vP; void main(){ float r = length(vP); float a = (smoothstep(1.0, 0.82, r) * (0.16 + 0.1 * smoothstep(0.55, 0.9, r)) + smoothstep(0.98, 0.9, r) * smoothstep(0.8, 0.9, r) * 0.18) * uK; if (a < 0.003) discard; gl_FragColor = vec4(uCol * a * uFxK, a); }' }));
    this.spotPool.rotation.x = -Math.PI / 2; this.spotPool.position.y = 0.03; scene.add(this.spotPool);
    this.spotK = 0; this.spotTarget = 0;
    this.flashC = new THREE.Color(); this.caK = 0;
    this._v = new THREE.Vector3(); this._sv = new THREE.Vector3();
    this.sx = new StrikeFX(scene);
    // trail materials are shared by colour, so a new trail never waits for a shader; each is drawn once at load
    this._trailMats = new Map();
    for (const c of [new THREE.Color(3.2, 1.9, 0.5), new THREE.Color(0.95, 0.66, 0.36), new THREE.Color(3.2, 1.95, 0.5), new THREE.Color(1.9, 1.65, 1.35)]) {
      const warm = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -9, 0, 0.01, -9, 0, 0, -9, 0.01], 3)).setAttribute('alpha', new THREE.Float32BufferAttribute([0, 0, 0], 1)), this._trailMat(c));
      warm.frustumCulled = false; warm.visible = false; scene.add(warm);
    }
  }
  _trailMat(color) {
    const key = color.r.toFixed(3) + ',' + color.g.toFixed(3) + ',' + color.b.toFixed(3);
    let m = this._trailMats.get(key);
    if (!m) { m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uC: { value: color.clone() }, uFxK: FXK }, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS }); this._trailMats.set(key, m); }
    return m;
  }

  // ---------- particles ----------
  emit(n, o) {
    for (let i = 0; i < n && this.p.length < MAXP; i++) {
      const sp = (o.speed ?? 6) * (0.5 + Math.random() * 0.8);
      const a = (o.angle ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const up = (o.up ?? 0.5) + Math.random() * (o.upVar ?? 0.6);
      const col = o.color || new THREE.Color(1, 1, 1);
      this.p.push({ x: o.x + (Math.random() - 0.5) * (o.jitter ?? 0.1), y: (o.y ?? 1) + (Math.random() - 0.5) * (o.jitter ?? 0.1), z: o.z + (Math.random() - 0.5) * (o.jitter ?? 0.1),
        vx: Math.sin(a) * sp * Math.sqrt(1 - Math.min(0.9, up * up * 0.3)), vy: up * sp, vz: Math.cos(a) * sp, g: o.gravity ?? 14, drag: o.drag ?? 1.5,
        life: (o.life ?? 0.5) * (0.6 + Math.random() * 0.7), age: 0, size: (o.size ?? 0.06) * (0.6 + Math.random() * 0.8), shape: o.shape ?? 1,
        r: col.r, gC: col.g, b: col.b, bounce: o.bounce ?? 0, spin: (Math.random() - 0.5) * 20 });
    }
  }
  sparks(x, y, z, color, n = 18, dir) { this.emit(n, { x, y, z, color, shape: 1, speed: 9, life: 0.32, size: 0.05, gravity: 10, angle: dir, spread: dir === undefined ? Math.PI * 2 : 2.2, up: 0.3 }); }
  chips(x, y, z, color, n = 10, dir) { this.emit(n, { x, y, z, color, shape: 2, speed: 5, life: 0.9, size: 0.07, gravity: 18, angle: dir, spread: dir === undefined ? Math.PI * 2 : 2.4, up: 0.9, bounce: 0.35, drag: 0.6 }); }
  glitter(x, y, z, color, n = 24, spread = 1.5) { this.emit(n, { x, y, z, color, shape: 3, speed: 2.5, life: 1.2, size: 0.09, gravity: 1.5, jitter: spread, up: 0.6, drag: 1.2 }); }
  dust(x, z, n = 8, color = new THREE.Color(0.5, 0.45, 0.42)) { this.emit(n, { x, y: 0.1, z, color, shape: 0, speed: 1.6, life: 0.6, size: 0.35, gravity: -0.5, up: 0.2, jitter: 0.4, drag: 2.5 }); }

  _updateParticles(dt) {
    const P = this.aP.array, V = this.aV.array, C = this.aC.array;
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i];
      p.age += dt;
      if (p.age >= p.life) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { if (p.bounce > 0) { p.y = 0.02; p.vy = -p.vy * p.bounce; p.vx *= 0.6; p.vz *= 0.6; } else if (p.g > 0) { p.y = 0.02; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; } }
    }
    for (const p of this.p) {
      if (n >= MAXP) break;
      const k = p.age / p.life, a = k < 0.1 ? k / 0.1 : 1 - Math.pow((k - 0.1) / 0.9, 2);
      const tw = p.shape === 3 ? 0.5 + 0.5 * Math.sin(p.age * 40 + p.spin * 3) : 1;
      P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = p.size * (p.shape === 0 ? 1 + k : 1);
      V[n * 4] = p.vx; V[n * 4 + 1] = p.vy; V[n * 4 + 2] = p.vz; V[n * 4 + 3] = p.shape;
      C[n * 4] = p.r; C[n * 4 + 1] = p.gC; C[n * 4 + 2] = p.b; C[n * 4 + 3] = a * tw;
      n++;
    }
    this.pm.count = n;
    this.aP.needsUpdate = this.aV.needsUpdate = this.aC.needsUpdate = true;
  }

  // ---------- trails ----------
  // a ribbon following get() (a Vector3), width w, colour c; flat=true lies on the floor
  trail(get, { w = 0.22, color = new THREE.Color(3, 1.9, 0.5), len = 18, flat = false, life = 0.25 } = {}) {
    const n = len;
    const pos = new Float32Array(n * 2 * 3), al = new Float32Array(n * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(al, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    const mesh = new THREE.Mesh(g, this._trailMat(color)); mesh.frustumCulled = false; mesh.renderOrder = 5; this.scene.add(mesh);
    const tr = { get, w, flat, pts: [], mesh, g, pos, al, n, live: true, fade: 1, life };
    this.trails.push(tr);
    return tr;
  }
  _updateTrails(dt, camPos) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      if (t.live) { const p = t.get(); if (p) { t.pts.unshift(p.clone()); if (t.pts.length > t.n) t.pts.pop(); } }
      else { t.fade -= dt / t.life; if (t.pts.length > 1) t.pts.pop(); if (t.fade <= 0 || t.pts.length < 2) { this.scene.remove(t.mesh); t.g.dispose(); this.trails.splice(i, 1); continue; } }
      const pts = t.pts, P = t.pos, A = t.al;
      for (let k = 0; k < t.n; k++) {
        const a = pts[Math.min(k, pts.length - 1)] || pts[0];
        const b = pts[Math.min(k + 1, pts.length - 1)] || a;
        if (!a) continue;
        const dir = this._v.copy(a).sub(b); if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
        let side;
        if (t.flat) side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        else side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3().subVectors(camPos, a)).normalize();
        const w = t.w * (1 - k / t.n);
        P[k * 6] = a.x + side.x * w; P[k * 6 + 1] = a.y + side.y * w; P[k * 6 + 2] = a.z + side.z * w;
        P[k * 6 + 3] = a.x - side.x * w; P[k * 6 + 4] = a.y - side.y * w; P[k * 6 + 5] = a.z - side.z * w;
        const al = k < pts.length ? (1 - k / t.n) * t.fade : 0;
        A[k * 2] = al; A[k * 2 + 1] = al;
      }
      t.g.attributes.position.needsUpdate = true; t.g.attributes.alpha.needsUpdate = true;
    }
  }

  // ---------- player hooks ----------
  aimLine(on) { this.aim.visible = on; this.aimEnd.visible = on; }
  setAim(px, pz, ax, az, range) {
    const dx = ax - px, dz = az - pz, d = Math.min(range, Math.hypot(dx, dz) || 0.001);
    const a = Math.atan2(dx, dz);
    this.aim.scale.y = d; this.aim.position.set(px + Math.sin(a) * d / 2, 0.04, pz + Math.cos(a) * d / 2); this.aim.rotation.set(-Math.PI / 2, 0, -a);
    this.aimEnd.position.set(px + Math.sin(a) * d, 0.04, pz + Math.cos(a) * d);
  }
  catchFlash(pl, perfect) { this.catchK = 1; this.catchPerfect = perfect; }
  caught(x, y, z, perfect) {
    this.sparks(x, y, z, perfect ? new THREE.Color(4, 3, 1.2) : new THREE.Color(3, 2, 0.6), perfect ? 28 : 16);
    if (perfect) { this.glitter(x, y, z, new THREE.Color(3, 2.4, 1), 14, 0.6); this.flash(new THREE.Color(0.12, 0.095, 0.035), 1); this.aberrate(1.2); }
    this.catchK = 1.2; this.catchPerfect = perfect;
  }
  dashStart(pl) {
    this.dashEnd(pl);
    this.dust(pl.x, pl.z, 6);
    const tr = this.trail(() => new THREE.Vector3(pl.x, 0.9, pl.z), { w: 0.3, color: new THREE.Color(0.95, 0.66, 0.36), len: 10, life: 0.16 });
    this._dashTrail = tr;
  }
  dashEnd(pl) { if (this._dashTrail) { this._dashTrail.live = false; this._dashTrail = null; } }
  nearMiss(pl) { this.glitter(pl.x, 1.2, pl.z, new THREE.Color(2.6, 2.6, 3.2), 18, 0.5); this.aberrate(1.6); this.flash(new THREE.Color(0.05, 0.05, 0.07), 1); }
  ringTrail(r, on) {
    if (on) r.trail = this.trail(() => r.pos, { w: 0.2, color: new THREE.Color(3.2, 1.9, 0.5), len: 16, life: 0.2 });
    else if (r.trail) { r.trail.live = false; r.trail = null; }
  }
  // a strike: ribbons off both rings (or her fists) for as long as it lasts, gold when it's on the beat
  swing(pl, s) {
    this._endSwing();
    const big = !!(s.finisher || s.riposte);
    const col = s.on || s.riposte ? new THREE.Color(3.2, 1.95, 0.5) : new THREE.Color(1.9, 1.65, 1.35);
    const srcs = [];
    if (s.armed !== false && pl.rings) for (const r of pl.rings) if (r.state === 'hand' && r.holder) srcs.push(() => r.holder.getWorldPosition(this._sv));
    if (!srcs.length) for (const b of [pl.rig.bones.hand_l, pl.rig.bones.hand_r]) if (b) srcs.push(() => b.getWorldPosition(this._sv));
    this._swing = { s, trails: srcs.map((get) => this.trail(get, { w: big ? 0.24 : s.on ? 0.17 : 0.12, color: col, len: big ? 18 : 12, life: big ? 0.22 : 0.13 })) };
  }
  _endSwing() { if (this._swing) { for (const t of this._swing.trails) t.live = false; this._swing = null; } }
  // the cut's arc in the air, at the moment it lands
  slash(pl, s, ang) {
    const big = !!(s.finisher || s.riposte);
    // off the beat the cut is a thin grey ghost of itself
    this.sx.slash(pl.x, pl.z, ang, { sweep: big ? 1 : s.sweep, gold: s.on || s.riposte, big, color: s.on || s.riposte ? undefined : new THREE.Color(0.9, 0.85, 0.8), r: s.on || big ? undefined : 1.45 });
    if (big) this.sx.slash(pl.x, pl.z, ang + 0.35, { sweep: -1, gold: true, big: true, r: 1.7 });
  }
  impact(x, y, z, dir, o = {}) { this.sx.impact(x, y, z, o); }
  ring(x, z, color, r = 2) { this.sx.ring(x, z, color, r); }
  // a pink hit on the guard: sparks where it met the shield, the shield flares (pl.blockK)
  blocked(pl, fx, fz) {
    const a = Math.atan2(fx - pl.x, fz - pl.z), x = pl.x + Math.sin(a) * 0.8, z = pl.z + Math.cos(a) * 0.8;
    this.sparks(x, 1.1, z, new THREE.Color(3.4, 2.4, 0.9), 18, a);
    this.sx.impact(x, 1.1, z, { gold: true, power: 0.7 });
  }
  // a white hit goes through the guard: the shield breaks into white glass
  guardBreak(pl) {
    const a = pl.facing, x = pl.x + Math.sin(a) * 0.75, z = pl.z + Math.cos(a) * 0.75;
    this.emit(22, { x, y: 1.0, z, color: new THREE.Color(2.4, 2.6, 2.9), shape: 2, speed: 4.5, life: 0.6, size: 0.06, gravity: 12, angle: a, spread: 2.6, up: 0.6, bounce: 0.3, drag: 0.8 });
    this.aberrate(1.4);
  }
  // her tell: a pink glint where she'll answer from
  tell(b) { this.sx.tell(b.x, 1.6, b.z); }
  // the meter's full: the spotlight is yours to take
  meterFull(pl) { this.glitter(pl.x, 1.3, pl.z, new THREE.Color(3.2, 2.2, 0.7), 22, 0.7); this.sx.ring(pl.x, pl.z, SX_GOLD, 1.6, 0.4); }
  soloBeats(left, n, pulse, pl) { this.sx.soloBeats(left, n, pulse, pl, this._dt || 1 / 60); }
  // gold motes from what earned the spotlight to YOU's ring: you see where it comes from
  mote(from, pl, n = 3) {
    for (let i = 0; i < n; i++) {
      const m = { p: new THREE.Vector3(from.x + (Math.random() - 0.5) * 0.4, (from.y ?? 1) + (Math.random() - 0.5) * 0.3, from.z + (Math.random() - 0.5) * 0.4), t: -i * 0.05, pl };
      m.from = m.p.clone();
      m.trail = this.trail(() => m.p, { w: 0.07, color: new THREE.Color(3.2, 1.95, 0.5), len: 10, life: 0.15 });
      (this.motes ||= []).push(m);
    }
  }
  _updateMotes(dt) {
    if (!this.motes) return;
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]; m.t += dt; if (m.t < 0) continue;
      const k = Math.min(1, m.t / 0.42), e = k * k * (3 - 2 * k);
      m.p.set(m.from.x + (m.pl.x - m.from.x) * e, m.from.y + (0.25 - m.from.y) * e + Math.sin(k * Math.PI) * 0.9, m.from.z + (m.pl.z - m.from.z) * e);
      if (k >= 1) { m.trail.live = false; this.glitter(m.pl.x, 0.3, m.pl.z, new THREE.Color(3.2, 2.2, 0.7), 3, 0.25); this.motes.splice(i, 1); }
    }
  }
  drawTargets(list, pulse) { this.sx.drawTargets(list, pulse); }
  dazeStars(b, n, dur) { this.sx.dazeStars(b, n, dur); }

  // ---------- screen ----------
  flash(color, k = 1) { this.flashC.r = Math.max(this.flashC.r, color.r * k); this.flashC.g = Math.max(this.flashC.g, color.g * k); this.flashC.b = Math.max(this.flashC.b, color.b * k); }
  aberrate(k) { this.caK = Math.max(this.caK, k); }

  spotlight(on, x, z) { this.spotTarget = on ? 1 : 0; if (x !== undefined) { this.spotX = x; this.spotZ = z; } }

  update(dt, camPos, player) {
    this._dt = dt; this._time = (this._time || 0) + dt;
    this._updateParticles(dt);
    this._updateTrails(dt, camPos);
    if (this._dashTrail && player && player.state !== 'dash') this.dashEnd(player);
    if (this._swing && (!player || player.state !== 'strike' || player.strike !== this._swing.s)) this._endSwing();
    this.sx.update(dt);
    this.sx.updateGuard(dt, player, this._time);
    this._updateMotes(dt);
    // catch ring
    if (player) {
      this.catchRing.position.set(player.x, 0.05, player.z);
      const k = Math.max(0, Math.min(1, this.catchK));
      this.catchRing.material.opacity = k * k * (this.catchPerfect ? 0.85 : 0.5) * Math.min(1, FXK.value);
      const s = 0.85 + (1 - k) * 0.45; this.catchRing.scale.setScalar(s);
      this.catchK -= dt * 6;
    }
    // spotlight
    this.spotK += (this.spotTarget - this.spotK) * Math.min(1, dt * 10);
    this.spotCone.visible = this.spotK > 0.01;
    if (player) { this.spotCone.position.set(player.x, 14, player.z); this.spotPool.position.set(player.x, 0.03, player.z); }
    this.spotCone.material.uniforms.uK.value = this.spotK;
    this.spotPool.material.uniforms.uK.value = this.spotK; this.spotPool.visible = this.spotK > 0.01;
    // post pushes
    const fx = this.post.fx;
    fx.flash.copy(this.flashC);
    this.flashC.multiplyScalar(Math.exp(-dt * 12));
    fx.ca = (fx.caBase ?? 0) + this.caK * 0.0025;
    this.caK *= Math.exp(-dt * 7);
  }

  clear() { this.p.length = 0; for (const t of this.trails) { this.scene.remove(t.mesh); t.g.dispose(); } this.trails.length = 0; this._swing = null; this._dashTrail = null; this.motes = []; this.sx.clear(); }
}
