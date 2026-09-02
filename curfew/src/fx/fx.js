// fx — pooled particles, tracers, decals, trauma and hitstop. Manifest #14.
//
// Lifted wholesale from vigil/src/fx/fx.js:14-168 (ring-buffer particles, instanced
// tracers with a screen-space minimum width, pooled decals, the impact() door). Two
// deliberate changes for CURFEW:
//
// 1. VIGIL kept its own pool of five PointLights. CURFEW has a census: every dynamic light
//    in the county comes from gfx/lights.js's 8-rover pool, so flash() BORROWS. fx owns no
//    lights at all.
// 2. Hitstop scales ctx.time.scale and NOTHING ELSE. CINDERBLOOM had two owners of that
//    scalar and melee hitstop silently could not use it. fx is the only writer.
//
// 3. PARTICLES AND TRACERS KEEP prev/curr AND ARE INTERPOLATED IN present(alpha). The
//    CONTRACT's loop law applies to the one effect the player sees on every single shot: a
//    tracer covers 340 m/s in a 55 ms life, so integrated only on the 60 Hz step it holds
//    THREE identical positions on a 144 Hz display — the CINDERBLOOM teleport in miniature.
//    step() therefore advances the simulation into pCur / t.dist and writes NOTHING the GPU
//    reads; present() lerps prev -> curr by alpha into the bound position buffer and the
//    tracer instance matrices, and is the only writer of either. Decals are exempt on
//    purpose: they are placed once and only fade, so they never move and have no prev.
//
// impact() is the ONLY door into hit feedback (FLARE's law): particles, light, decal and
// hitstop all route through it, so a hit can never half-happen.
//
// The hot path allocates nothing: every buffer, state object and scratch vector below is
// created once, at init.

import * as THREE from 'three';
import { TAU, clamp } from '../engine/math.js';

const MAX_PARTICLES = 1400;
const MAX_TRACERS = 24;
const MAX_DECALS = 64;

// Trauma decays to zero in ~1/TRAUMA_DECAY seconds; shake is trauma squared so a small
// hit is a tap and a big one is a wallop [cinderbloom COMBAT_FEEL].
const TRAUMA_DECAY = 1.6;

// Module-level scratch.
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);

const COLORS = {
  rock: new THREE.Color(0.55, 0.50, 0.42),
  dust: new THREE.Color(0.32, 0.33, 0.38),
  wood: new THREE.Color(0.42, 0.30, 0.18),
  metal: new THREE.Color(1.00, 0.75, 0.35),
  flesh: new THREE.Color(0.62, 0.16, 0.16),
  deflect: new THREE.Color(0.55, 0.62, 0.75),
};

export class Fx {
  static id = 'fx';

  constructor(ctx) {
    this.ctx = ctx;
    this.trauma = 0;
    this._freeze = 0;
    this.points = null;
    this.tracers = null;
    this.decals = null;
  }

  async init() {
    const scene = this.ctx.scene;
    if (!scene) throw new Error('fx: ctx.scene missing (gfx must be manifest #1)');
    this.scene = scene;
    this.rng = this.ctx.rng.fork('fx');

    /* ---------------- particles: one Points, CPU-integrated ring -------------- */
    // THREE buffers per interpolated quantity, with three different jobs:
    //   pPos / pAttr   — what the GPU reads. Written ONLY by present(), never by step().
    //   pCur / pAttrC  — the simulation's truth at the end of the last fixed step.
    //   pPrv / pAttrP  — the same, one step earlier.
    // Interpolating in place would feed a fractional position back into the next step and
    // the debris would drift, so the render buffer is its own array.
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCur = new Float32Array(MAX_PARTICLES * 3);
    this.pPrv = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pAttr = new Float32Array(MAX_PARTICLES * 2);   // size, alpha
    this.pAttrC = new Float32Array(MAX_PARTICLES * 2);
    this.pAttrP = new Float32Array(MAX_PARTICLES * 2);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES * 2);   // age, life
    this.pDrag = new Float32Array(MAX_PARTICLES);
    this.pGrav = new Float32Array(MAX_PARTICLES);
    this.pSize0 = new Float32Array(MAX_PARTICLES);
    this.pAlpha0 = new Float32Array(MAX_PARTICLES);
    this.pPos.fill(-9999); this.pCur.fill(-9999); this.pPrv.fill(-9999);
    this.pCursor = 0;
    this.pColDirty = true;

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    pGeo.setAttribute('aP', new THREE.BufferAttribute(this.pAttr, 2));
    // never culled: the bounding sphere of a ring buffer is meaningless and recomputing
    // it every frame is the cost we are avoiding by pooling in the first place
    pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.pGeo = pGeo;

    const pMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: /* glsl */`
        attribute vec2 aP;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = aP.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // aP.x is an approximate world diameter in metres
          gl_PointSize = clamp(aP.x * 700.0 / max(1.0, -mv.z), 1.5, 90.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float r = length(p) * 2.0;
          float a = (1.0 - smoothstep(0.35, 1.0, r)) * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.points = new THREE.Points(pGeo, pMat);
    this.points.frustumCulled = false;
    this.points.name = 'fx.particles';
    scene.add(this.points);

    /* ---------------- tracers: instanced stretched boxes ---------------------- */
    // Camera-facing ribbons approximated as thin instanced boxes oriented along flight.
    // The screen-space minimum width matters: a sub-pixel additive line vanishes entirely
    // (CINDERBLOOM's receipt), so a shot at range reads as nothing happening.
    const trGeo = new THREE.BoxGeometry(1, 1, 1);
    const trMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.5, 2.6, 1.15),   // >1 on purpose: this is what bloom is for
      transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.tracers = new THREE.InstancedMesh(trGeo, trMat, MAX_TRACERS);
    this.tracers.frustumCulled = false;
    this.tracers.count = MAX_TRACERS;
    this.tracers.name = 'fx.tracers';
    scene.add(this.tracers);
    this.trState = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      this.trState.push({
        // age/dist are curr; page/pdist are the same two one fixed step earlier.
        live: false, age: 0, dist: 0, page: 0, pdist: 0, speed: 340, maxDist: 0,
        origin: new THREE.Vector3(), dir: new THREE.Vector3(),
      });
      _m4.makeScale(0, 0, 0);
      this.tracers.setMatrixAt(i, _m4);
    }
    this.tracers.instanceMatrix.needsUpdate = true;
    this.trCursor = 0;

    /* ---------------- decals: pooled dark scorch discs ------------------------ */
    const dcGeo = new THREE.CircleGeometry(1, 10);
    const dcMat = new THREE.MeshBasicMaterial({
      color: 0x0a0d14, transparent: true, opacity: 0.55, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.decals = new THREE.InstancedMesh(dcGeo, dcMat, MAX_DECALS);
    this.decals.count = MAX_DECALS;
    this.decals.frustumCulled = false;
    this.decals.name = 'fx.decals';
    scene.add(this.decals);
    this.dcState = [];
    for (let i = 0; i < MAX_DECALS; i++) {
      this.dcState.push({ age: 99 });
      _m4.makeScale(0, 0, 0);
      this.decals.setMatrixAt(i, _m4);
    }
    this.decals.instanceMatrix.needsUpdate = true;
    this.dcCursor = 0;
  }

  /* --------------------------------------------------------------- spawners -- */

  spawnParticle(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 12, drag = 0.9, alpha0 = 1) {
    const i = this.pCursor;
    const i3 = i * 3, i2 = i * 2;
    this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
    // prev = curr = render at birth. The ring reuses slots, and a slot whose prev still held
    // the last owner's position would draw one frame of streak from wherever that one died.
    this.pCur[i3] = x; this.pCur[i3 + 1] = y; this.pCur[i3 + 2] = z;
    this.pPrv[i3] = x; this.pPrv[i3 + 1] = y; this.pPrv[i3 + 2] = z;
    this.pPos[i3] = x; this.pPos[i3 + 1] = y; this.pPos[i3 + 2] = z;
    this.pVel[i3] = vx; this.pVel[i3 + 1] = vy; this.pVel[i3 + 2] = vz;
    this.pLife[i2] = 0; this.pLife[i2 + 1] = life;
    this.pCol[i3] = r; this.pCol[i3 + 1] = g; this.pCol[i3 + 2] = b;
    this.pGrav[i] = grav; this.pDrag[i] = drag;
    this.pSize0[i] = size; this.pAlpha0[i] = alpha0;
    this.pAttrC[i2] = size; this.pAttrC[i2 + 1] = alpha0;
    this.pAttrP[i2] = size; this.pAttrP[i2 + 1] = alpha0;
    this.pAttr[i2] = size; this.pAttr[i2 + 1] = alpha0;
    this.pColDirty = true;   // colour is written on spawn only, never integrated
  }

  burst(point, normal, count, speed, life, size, color, opts) {
    const spread = opts && opts.spread !== undefined ? opts.spread : 1;
    const grav = opts && opts.grav !== undefined ? opts.grav : 12;
    const drag = opts && opts.drag !== undefined ? opts.drag : 0.9;
    const alpha = opts && opts.alpha !== undefined ? opts.alpha : 1;
    const rng = this.rng;
    for (let i = 0; i < count; i++) {
      const a = rng.next() * TAU;
      const up = rng.next();
      const s = speed * (0.4 + rng.next() * 0.8);
      const vx = (normal.x * (1 - spread * 0.5) + Math.cos(a) * spread * (1 - up * 0.5)) * s;
      const vy = (normal.y + up * spread) * s * 0.8;
      const vz = (normal.z * (1 - spread * 0.5) + Math.sin(a) * spread * (1 - up * 0.5)) * s;
      this.spawnParticle(point.x, point.y, point.z, vx, vy, vz,
        life * (0.6 + rng.next() * 0.8), size * (0.7 + rng.next() * 0.6),
        color.r, color.g, color.b, grav, drag, alpha);
    }
  }

  tracer(origin, dir, maxDist) {
    const t = this.trState[this.trCursor];
    this.trCursor = (this.trCursor + 1) % MAX_TRACERS;
    t.live = true; t.age = 0; t.dist = 1.2;   // hidden for the first 1.2 m: it left the barrel
    t.page = 0; t.pdist = 1.2;                // prev = curr at birth; see spawnParticle
    t.origin.copy(origin); t.dir.copy(dir); t.maxDist = maxDist;
  }

  decal(point, normal, size) {
    const i = this.dcCursor;
    this.dcCursor = (this.dcCursor + 1) % MAX_DECALS;
    this.dcState[i].age = 0;
    _q.setFromUnitVectors(_zAxis, normal);
    _p.copy(point).addScaledVector(normal, 0.02);
    _m4.compose(_p, _q, _s.set(size, size, size));
    this.decals.setMatrixAt(i, _m4);
    this.decals.instanceMatrix.needsUpdate = true;
  }

  /**
   * A one-shot light. Borrows a rover from the census — fx owns no lights.
   * The rover pool's distance is fixed by CFG.lights.rovers.distance; a per-flash radius
   * is not part of the borrow() interface in CONTRACT.md.
   */
  flash(x, y, z, colour, intensity, life = 0.06) {
    const lights = this.ctx.systems && this.ctx.systems.get('lights');   // lazy, at use
    if (!lights) return null;
    return lights.borrow('flash', x, y, z, colour, intensity, life);
  }

  /* ----------------------------------------------------------------- feel --- */

  /** Camera shake fuel, 0..1. The camera owner reads shake(), fx never moves the camera. */
  addTrauma(v) { this.trauma = Math.min(1, this.trauma + v); }
  shake() { return this.trauma * this.trauma; }

  /**
   * Freeze the simulation for t seconds. THE ONLY WRITER of ctx.time.scale in the game.
   * It is decayed on RAW frame time in present(), never on the scaled step — decaying it
   * with the scaled dt means scale 0 stops the clock that would have ended the freeze and
   * the game hangs forever.
   */
  hitstop(t) { this._freeze = Math.max(this._freeze, t); }

  /* ---------------------------------------------------------------- impact -- */

  impact(kind, point, normal, power = 1) {
    const n = normal || _up;
    switch (kind) {
      case 'rock':
        this.burst(point, n, 6, 5.2 * power, 0.24, 0.05, COLORS.rock, { grav: 14 });
        this.burst(point, n, 4, 1.8 * power, 0.80, 0.42, COLORS.dust, { grav: 2.5, drag: 2.4, spread: 1.4, alpha: 0.15 });
        this.decal(point, n, 0.16);
        break;
      case 'wood':
        this.burst(point, n, 7, 4.6 * power, 0.30, 0.055, COLORS.wood, { grav: 15 });
        this.burst(point, n, 3, 1.4 * power, 0.70, 0.34, COLORS.dust, { grav: 2.0, drag: 2.4, spread: 1.3, alpha: 0.12 });
        this.decal(point, n, 0.13);
        break;
      case 'metal':
        this.burst(point, n, 9, 6.5 * power, 0.18, 0.045, COLORS.metal, { grav: 16 });
        this.flash(point.x, point.y, point.z, 0xffc46a, 14, 0.05);
        this.decal(point, n, 0.11);
        break;
      case 'flesh':
        this.burst(point, n, 12, 3.6 * power, 0.42, 0.075, COLORS.flesh, { grav: 8, spread: 1.2, alpha: 0.9 });
        break;
      case 'deflect':
        this.burst(point, n, 8, 7.0 * power, 0.15, 0.04, COLORS.deflect, { grav: 12 });
        this.flash(point.x, point.y, point.z, 0x9fb4d8, 10, 0.04);
        break;
      default:
        this.burst(point, n, 5, 3.5 * power, 0.26, 0.05, COLORS.dust, { grav: 10, spread: 1.2, alpha: 0.4 });
        break;
    }
  }

  /**
   * One of everything, far below the world, so no shader in this module compiles on the
   * first shot of the game.
   */
  warmup() {
    _p.set(0, -400, 0);
    this.impact('rock', _p, _up); this.impact('wood', _p, _up);
    this.impact('metal', _p, _up); this.impact('flesh', _p, _up);
    this.impact('deflect', _p, _up);
    this.tracer(_p, _up, 1);
  }

  /* ------------------------------------------------------------------ loop -- */

  step(dt) {
    // Particles, tracers and decals run on the SCALED step on purpose: during hitstop the
    // debris hangs in the air, which is the whole effect.
    //
    // NOTHING HERE TOUCHES pPos, pAttr OR A TRACER MATRIX. Those are the GPU's copies and
    // present() owns them; this method only advances curr and remembers prev.
    const pCur = this.pCur, pPrv = this.pPrv, pAC = this.pAttrC, pAP = this.pAttrP;
    const pVel = this.pVel, pLife = this.pLife;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3, i2 = i * 2;
      if (pLife[i2] >= pLife[i2 + 1]) continue;
      pPrv[i3] = pCur[i3]; pPrv[i3 + 1] = pCur[i3 + 1]; pPrv[i3 + 2] = pCur[i3 + 2];
      pAP[i2] = pAC[i2]; pAP[i2 + 1] = pAC[i2 + 1];
      pLife[i2] += dt;
      const t = pLife[i2] / pLife[i2 + 1];
      if (t >= 1) {
        // Dead: park BOTH ends under the world with zero alpha, so present has nothing to
        // interpolate between and cannot draw a streak down to the parking spot.
        pCur[i3 + 1] = -9999; pPrv[i3 + 1] = -9999;
        pAC[i2 + 1] = 0; pAP[i2 + 1] = 0;
        continue;
      }
      const dr = Math.exp(-this.pDrag[i] * dt);
      pVel[i3] *= dr;
      pVel[i3 + 1] = pVel[i3 + 1] * dr - this.pGrav[i] * dt;
      pVel[i3 + 2] *= dr;
      pCur[i3] += pVel[i3] * dt;
      pCur[i3 + 1] += pVel[i3 + 1] * dt;
      pCur[i3 + 2] += pVel[i3 + 2] * dt;
      pAC[i2 + 1] = this.pAlpha0[i] * (1 - t * t);
      pAC[i2] = this.pSize0[i] * (1 + t * 0.6);
    }

    // tracers: the head advances at 340 m/s. The matrix is composed in present().
    let trDirty = false;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = this.trState[i];
      if (!t.live) continue;
      t.page = t.age; t.pdist = t.dist;
      t.age += dt;
      t.dist += t.speed * dt;
      if (t.dist > t.maxDist + 2.6 || t.age > 0.055 + t.maxDist / t.speed) {
        t.live = false;
        _m4.makeScale(0, 0, 0);
        this.tracers.setMatrixAt(i, _m4);
        trDirty = true;
      }
    }
    if (trDirty) this.tracers.instanceMatrix.needsUpdate = true;

    // decals fade out over 22 s. They never move, so they keep no prev and are placed once.
    let dcDirty = false;
    for (let i = 0; i < MAX_DECALS; i++) {
      const d = this.dcState[i];
      if (d.age > 22) continue;
      d.age += dt;
      if (d.age > 22) {
        _m4.makeScale(0, 0, 0);
        this.decals.setMatrixAt(i, _m4);
        dcDirty = true;
      }
    }
    if (dcDirty) this.decals.instanceMatrix.needsUpdate = true;
  }

  /**
   * PRESENTATION ONLY, and it is the whole reason ctx.time.alpha exists for this system.
   * Every visible quantity is read prev -> curr at `alpha`; nothing here advances the sim.
   */
  present(alpha) {
    const a = alpha === undefined ? 1 : (alpha < 0 ? 0 : (alpha > 1 ? 1 : alpha));

    /* ---- particles ------------------------------------------------------- */
    const pPos = this.pPos, pCur = this.pCur, pPrv = this.pPrv;
    const pAttr = this.pAttr, pAC = this.pAttrC, pAP = this.pAttrP, pLife = this.pLife;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3, i2 = i * 2;
      if (pLife[i2] >= pLife[i2 + 1]) {
        // Idempotent, and only writes on the frame a particle actually retired.
        if (pAttr[i2 + 1] !== 0) { pAttr[i2 + 1] = 0; pPos[i3 + 1] = -9999; }
        continue;
      }
      pPos[i3] = pPrv[i3] + (pCur[i3] - pPrv[i3]) * a;
      pPos[i3 + 1] = pPrv[i3 + 1] + (pCur[i3 + 1] - pPrv[i3 + 1]) * a;
      pPos[i3 + 2] = pPrv[i3 + 2] + (pCur[i3 + 2] - pPrv[i3 + 2]) * a;
      pAttr[i2] = pAP[i2] + (pAC[i2] - pAP[i2]) * a;
      pAttr[i2 + 1] = pAP[i2 + 1] + (pAC[i2 + 1] - pAP[i2 + 1]) * a;
    }
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.aP.needsUpdate = true;
    if (this.pColDirty) { this.pGeo.attributes.color.needsUpdate = true; this.pColDirty = false; }

    /* ---- tracers --------------------------------------------------------- */
    // 340 m/s is 5.7 m per fixed step: without this lerp a 144 Hz display sees the same
    // tracer three times in the same place and the shot reads as a stutter, not a shot.
    const camPos = this.ctx.camera ? this.ctx.camera.position : null;
    let trDirty = false;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = this.trState[i];
      if (!t.live) continue;
      const dist = t.pdist + (t.dist - t.pdist) * a;
      const age = t.page + (t.age - t.page) * a;
      const headD = Math.min(dist, t.maxDist);
      const tailD = clamp(dist - 2.6, 1.2, t.maxDist);
      const len = Math.max(headD - tailD, 0.05);
      const mid = (headD + tailD) / 2;
      _p.copy(t.origin).addScaledVector(t.dir, mid);
      // screen-space minimum width: thicken with distance so the line never falls under
      // a pixel and disappears
      const dCam = camPos ? _p.distanceTo(camPos) : 10;
      const wBase = 0.022 * (age < 0.12 ? 1.6 : 1);
      const w = Math.max(wBase, dCam * 0.0011);
      _q.setFromUnitVectors(_zAxis, t.dir);
      _m4.compose(_p, _q, _s.set(w, w, len));
      this.tracers.setMatrixAt(i, _m4);
      trDirty = true;
    }
    if (trDirty) this.tracers.instanceMatrix.needsUpdate = true;

    /* ---- feel ------------------------------------------------------------ */
    // RAW frame time. ctx.time.dt is the unscaled clamped frame dt (see HANDOFF.md):
    // hitstop must be able to end itself.
    const raw = (this.ctx.time && this.ctx.time.dt) || 1 / 60;
    if (this._freeze > 0) this._freeze = Math.max(0, this._freeze - raw);
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * raw);
    // The one and only write of ctx.time.scale.
    if (this.ctx.time) this.ctx.time.scale = this._freeze > 0 ? 0 : 1;
  }

  ready() { return !!(this.points && this.tracers && this.decals); }

  dispose() {
    for (const m of [this.points, this.tracers, this.decals]) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
      if (m.dispose) m.dispose();
    }
    this.points = this.tracers = this.decals = null;
  }
}

export default Fx;
