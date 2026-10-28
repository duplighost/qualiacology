// The hero: a twirled forkful of cooked spaghetti on two noodle legs.
// Gameplay body = one sphere. Look = ~15 verlet strands carried by that sphere.
import * as THREE from 'three';
import { mulberry32, clamp, lerp, TAU, dampAngle, angleDiff } from './util.js';
import * as Shapes from './shapes.js';
import { SEA } from './world.js';

export const R = 0.45;
const BODY_R = 0.31;          // visual twirl radius
const BODY_LIFT = 0.15;       // twirl sits above the collision center so the legs reach the ground
const UP = new THREE.Vector3(0, 1, 0);

export const TUNE = {
  maxSpeed: 7.4, accel: 60, decel: 50, skid: 95, airAccel: 26, airMax: 7.4,
  gravity: 34, fallMul: 1.25, terminal: 30,
  jumpV: 10.8, jumpCut: 0.48, coyote: 0.1, buffer: 0.14,
  hopV: 10.2, hopOut: 1.6, leapV: 10.9, leapOut: 6.8, leapSide: 2.8,
  stickHold: 0.18, stickTime: [1.45, 1.0, 0.7], slideAcc: 2.4, slideMax: 5.5,
};

export class Hero {
  constructor(scene, K, ctx) {
    this.scene = scene; this.ctx = ctx; // ctx: { colliders, audio, props, fx, supports }
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.prevVel = new THREE.Vector3();
    this.contacts = [];
    this.facing = 0;
    this.state = 'play';
    this.rnd = mulberry32(42);
    this.buildStrands(K);
    this.attached = [];
  }

  reset(p, facing = Math.PI) {
    this.pos.copy(p); this.vel.set(0, 0, 0);
    this.grounded = false; this.groundC = null; this.groundN = new THREE.Vector3(0, 1, 0);
    this.coyote = 0; this.buffer = 0; this.cut = true;
    this.stuck = false; this.stuckN = new THREE.Vector3(); this.stuckC = null; this.stickT = 0;
    this.lastWall = null; this.lastWallN = new THREE.Vector3(); this.wallCount = 0; this.wallCooldown = 0; this.awayT = 0;
    this.stun = 0; this.airT = 0; this.sinkT = 0; this.state = 'play'; this.hopT = 0; this.settleT = 0;
    this.inWater = false; this.sub = 0; this.strokeT = 0; this.bubbleT = 0;
    this.sledding = false; this.sledVy = 0; this.carve = 0;
    this.facing = facing; this.spin = 0;
    this.sq = 1; this.sqv = 0; this.sqAxis = new THREE.Vector3(0, 1, 0); this.sqAxisT = new THREE.Vector3(0, 1, 0);
    this.lean = new THREE.Vector2();
    this.safe = p.clone(); this.safeT = 0;
    this.feet = [0, 1].map(() => ({ plant: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, planted: false }));
    this.stepPhase = 0;
    this.placeStrands();
  }

  // ------------------------------------------------------------------ strands
  buildStrands(K) {
    const rnd = mulberry32(7);
    const S = []; const local = []; const kind = []; // kind: 0 body-attracted, 1 free, 2 hard pin to body, 3 foot
    const addPoint = (v, k) => { local.push(v.x, v.y, v.z); kind.push(k); };
    const BODY = 18, MB = 18;
    for (let j = 0; j < BODY; j++) {
      const axis = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1 + 0.6, rnd() * 2 - 1).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, axis);
      const th0 = rnd() * TAU, turns = (0.95 + rnd() * 0.65) * (rnd() < 0.5 ? 1 : -1);
      const ya = (rnd() * 1.7 - 0.85) * BODY_R, yb = (rnd() * 1.7 - 0.85) * BODY_R;
      const freeTail = rnd() < 0.5 ? 3 + Math.floor(rnd() * 5) : 0;
      const freeHead = rnd() < 0.18 ? 2 + Math.floor(rnd() * 3) : 0;
      const start = kind.length;
      for (let i = 0; i < MB; i++) {
        const t = i / (MB - 1);
        const th = th0 + t * turns * TAU;
        const y = lerp(ya, yb, t);
        const rho = Math.sqrt(Math.max(0.0025, BODY_R * BODY_R - y * y)) * (0.86 + rnd() * 0.16);
        const v = new THREE.Vector3(Math.cos(th) * rho, y, Math.sin(th) * rho).applyQuaternion(q);
        const free = i >= MB - freeTail || i < freeHead;
        addPoint(v, free ? 1 : 0);
      }
      S.push({ start, n: MB, radius: 0.03 + rnd() * 0.006, legs: false });
    }
    this.footOf = [];
    for (const side of [-1, 1]) {
      const start = kind.length, n = 7;
      for (let i = 0; i < n; i++) { const t = i / (n - 1); addPoint(new THREE.Vector3(side * (0.09 + Math.sin(t * Math.PI) * 0.06), -0.2 - i * 0.068, 0.02 + Math.sin(t * Math.PI) * 0.04), i === 0 ? 2 : i === n - 1 ? 3 : 4); }
      this.footOf[start + n - 1] = side < 0 ? 0 : 1;
      S.push({ start, n, radius: 0.035, legs: true, side });
    }
    this.S = S;
    const N = kind.length;
    this.N = N;
    this.local = new Float32Array(local);
    this.kind = new Uint8Array(kind);
    this.X = new Float32Array(N * 3); this.PX = new Float32Array(N * 3); this.TG = new Float32Array(N * 3);
    // rest lengths from the local layout
    this.rest = new Float32Array(N);
    for (const s of S) for (let i = 1; i < s.n; i++) {
      const a = (s.start + i - 1) * 3, b = (s.start + i) * 3;
      this.rest[s.start + i] = Math.hypot(this.local[b] - this.local[a], this.local[b + 1] - this.local[a + 1], this.local[b + 2] - this.local[a + 2]);
    }
    this.strandOf = [];
    for (const s of S) for (let i = 0; i < s.n; i++) this.strandOf[s.start + i] = s;
    this.buildMesh(K);
    this.buildFace(K);
  }

  buildMesh(K) {
    const RS = 8, SUB = 2;
    this.RS = RS; this.SUB = SUB;
    let verts = 0; const idx = [];
    for (const s of this.S) {
      s.rings = (s.n - 1) * SUB + 1;
      s.v0 = verts;
      const ringBase = verts;
      for (let r = 0; r < s.rings - 1; r++) for (let k = 0; k < RS; k++) {
        const a = ringBase + r * RS + k, b = ringBase + r * RS + ((k + 1) % RS), c = a + RS, d = b + RS;
        idx.push(a, b, c, b, d, c);
      }
      verts += s.rings * RS;
      // caps: flat cut ends
      s.cap0 = verts; for (let k = 0; k < RS; k++) idx.push(verts + RS, verts + ((k + 1) % RS), verts + k); verts += RS + 1;
      s.cap1 = verts; for (let k = 0; k < RS; k++) idx.push(verts + RS, verts + k, verts + ((k + 1) % RS)); verts += RS + 1;
    }
    const g = new THREE.BufferGeometry();
    this.gPos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3); this.gPos.setUsage(THREE.DynamicDrawUsage);
    this.gNor = new THREE.BufferAttribute(new Float32Array(verts * 3), 3); this.gNor.setUsage(THREE.DynamicDrawUsage);
    const uv = new Float32Array(verts * 2);
    for (const s of this.S) {
      let len = 0;
      for (let r = 0; r < s.rings; r++) {
        const seg = Math.floor(r / this.SUB);
        len += r === 0 ? 0 : this.rest[s.start + Math.min(s.n - 1, seg + 1)] / this.SUB;
        for (let k = 0; k < RS; k++) { const v = s.v0 + r * RS + k; uv[v * 2] = len; uv[v * 2 + 1] = (k / RS) * TAU * s.radius; }
      }
    }
    g.setAttribute('position', this.gPos); g.setAttribute('normal', this.gNor);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    this.mesh = new THREE.Mesh(g, K.hero);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    // the dense middle of the twirl, so gaps show more noodle, not sky
    this.core = new THREE.Mesh(new THREE.SphereGeometry(BODY_R * 0.78, 20, 14), K.heroCore);
    this.core.castShadow = true; this.core.receiveShadow = true;
    this.scene.add(this.core);
    // scratch
    this._ring = []; for (let i = 0; i < 64; i++) this._ring.push(new THREE.Vector3());
    this._q = new THREE.Quaternion(); this._qy = new THREE.Quaternion(); this._ql = new THREE.Quaternion(); this._qs = new THREE.Quaternion();
    this._m = new THREE.Matrix3(); this._v = new THREE.Vector3(); this._c = new THREE.Vector3(); this._pc = new THREE.Vector3();
  }

  bodyCenter(out) { return out.set(this.pos.x, this.pos.y + BODY_LIFT * this.sqY(), this.pos.z); }
  sqY() { return clamp(1 + (this.sq - 1) * this.sqAxis.y, 0.6, 1.4); }

  // world target of local point i
  computeTargets() {
    const c = this.bodyCenter(this._c);
    this._qy.setFromAxisAngle(UP, this.facing + this.spin);
    const lx = this.lean.x, lz = this.lean.y; // lean as small rotation around x/z
    this._eu = this._eu || new THREE.Euler();
    this._ql.setFromEuler(this._eu.set(lz, 0, -lx, 'XYZ'));
    this._q.copy(this._ql).multiply(this._qy);
    this._qs.setFromAxisAngle(UP, this.facing); this._qleg = this._qleg || new THREE.Quaternion(); this._qleg.copy(this._ql).multiply(this._qs);
    const a = this.sqAxis, s = this.sq, inv = 1 / Math.sqrt(s);
    const v = this._v;
    for (let i = 0; i < this.N; i++) {
      if (this.kind[i] === 3 || this.kind[i] === 4) continue;
      v.set(this.local[i * 3], this.local[i * 3 + 1], this.local[i * 3 + 2]).applyQuaternion(this.kind[i] === 2 ? this._qleg : this._q);
      const d = v.dot(a);
      v.multiplyScalar(inv).addScaledVector(a, (s - inv) * d);
      this.TG[i * 3] = c.x + v.x; this.TG[i * 3 + 1] = c.y + v.y; this.TG[i * 3 + 2] = c.z + v.z;
    }
  }

  placeStrands() {
    this.computeTargets();
    const c = this.bodyCenter(this._c);
    this._q.setFromAxisAngle(UP, this.facing);
    for (let i = 0; i < this.N; i++) {
      this._v.set(this.local[i * 3], this.local[i * 3 + 1], this.local[i * 3 + 2]).applyQuaternion(this._q).add(c);
      this.X[i * 3] = this.PX[i * 3] = this._v.x; this.X[i * 3 + 1] = this.PX[i * 3 + 1] = this._v.y; this.X[i * 3 + 2] = this.PX[i * 3 + 2] = this._v.z;
    }
    this._pc.copy(c);
    for (const f of this.feet) f.planted = false;
  }

  stepStrands(dt) {
    const X = this.X, PX = this.PX, TG = this.TG, kind = this.kind;
    const c = this.bodyCenter(this._c);
    const dx = c.x - this._pc.x, dy = c.y - this._pc.y, dz = c.z - this._pc.z;
    this._pc.copy(c);
    this.computeTargets();
    const g = 15 * dt * dt;
    const kBody = (this.stuck ? 0.32 : 0.26) * (this.inWater ? 0.72 : 1);
    const wy = this.ctx.water ? this.ctx.water.y : -1e9;
    for (let i = 0; i < this.N; i++) {
      const o = i * 3, k = kind[i];
      if (k === 3) continue; // feet are integrated below
      if (k === 0 || k === 2) { X[o] += dx; X[o + 1] += dy; X[o + 2] += dz; PX[o] += dx; PX[o + 1] += dy; PX[o + 2] += dz; }
      if (k === 2) { X[o] = TG[o]; X[o + 1] = TG[o + 1]; X[o + 2] = TG[o + 2]; PX[o] = X[o]; PX[o + 1] = X[o + 1]; PX[o + 2] = X[o + 2]; continue; }
      const under = X[o + 1] < wy;                                    // in water a noodle nearly floats
      const damp = (k === 0 ? 0.9 : 0.975) * (under ? 0.95 : 1);
      const vx = (X[o] - PX[o]) * damp, vy = (X[o + 1] - PX[o + 1]) * damp, vz = (X[o + 2] - PX[o + 2]) * damp;
      PX[o] = X[o]; PX[o + 1] = X[o + 1]; PX[o + 2] = X[o + 2];
      X[o] += vx; X[o + 1] += vy - (k === 0 ? g * 0.15 : g) * (under ? 0.07 : 1); X[o + 2] += vz;
      const kp = (this.grab && this.grab.idx === i) ? 0 : k === 0 ? kBody : k === 1 ? 0.028 : 0;
      if (kp) { X[o] += (TG[o] - X[o]) * kp; X[o + 1] += (TG[o + 1] - X[o + 1]) * kp; X[o + 2] += (TG[o + 2] - X[o + 2]) * kp; }
    }
    // feet
    for (let si = 0; si < this.S.length; si++) {
      const s = this.S[si]; if (!s.legs) continue;
      const f = this.feet[s.side < 0 ? 0 : 1];
      const o = (s.start + s.n - 1) * 3;
      if (f.planted) {
        let px = f.plant.x, py = f.plant.y, pz = f.plant.z;
        if (f.t < 1) { const t = f.t; px = lerp(f.from.x, f.to.x, t); pz = lerp(f.from.z, f.to.z, t); py = lerp(f.from.y, f.to.y, t) + Math.sin(t * Math.PI) * 0.13; }
        X[o] = px; X[o + 1] = py; X[o + 2] = pz; PX[o] = px; PX[o + 1] = py; PX[o + 2] = pz;
      } else {
        const under = X[o + 1] < wy, fd = under ? 0.93 : 0.97;
        const vx = (X[o] - PX[o]) * fd, vy = (X[o + 1] - PX[o + 1]) * fd, vz = (X[o + 2] - PX[o + 2]) * fd;
        PX[o] = X[o]; PX[o + 1] = X[o + 1]; PX[o + 2] = X[o + 2];
        X[o] += vx; X[o + 1] += vy - g * (under ? 0.1 : 1); X[o + 2] += vz;
      }
    }
    if (this.grab) this.applyGrab(0.55);
    // distance constraints
    for (let it = 0; it < 3; it++) {
      for (const s of this.S) {
        const soft = this.grab && this.strandOf[this.grab.idx] === s ? 0.2 : 1;
        for (let i = 1; i < s.n; i++) {
          const ia = s.start + i - 1, ib = s.start + i;
          const a = ia * 3, b = ib * 3;
          const ka = kind[ia], kb = kind[ib];
          const fa = s.legs && i === s.n - 1 ? 0 : 1;
          let wa = ka === 2 ? 0 : 1, wb = (kb === 2 || (kb === 3 && this.feet[s.side < 0 ? 0 : 1].planted)) ? 0 : 1;
          if (ka === 0) wa = 0.35; if (kb === 0) wb = 0.35;
          const w = wa + wb; if (w === 0) continue;
          const ex = X[b] - X[a], ey = X[b + 1] - X[a + 1], ez = X[b + 2] - X[a + 2];
          const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-6;
          const rest = this.rest[ib];
          const diff = (d - rest) / (d * w) * soft;
          X[a] += ex * diff * wa; X[a + 1] += ey * diff * wa; X[a + 2] += ez * diff * wa;
          X[b] -= ex * diff * wb; X[b + 1] -= ey * diff * wb; X[b + 2] -= ez * diff * wb;
        }
      }
    }
    if (this.grab) this.applyGrab(1);
    // free points: drape over the core, rest on the world
    const coreR = BODY_R * 0.8;
    const near = this.nearCols;
    for (let i = 0; i < this.N; i++) {
      const k = kind[i]; if (k !== 1 && k !== 4 && !(k === 3 && !this.feet[this.footOf[i]].planted)) continue;
      const o = i * 3;
      const ex = X[o] - c.x, ey = X[o + 1] - c.y, ez = X[o + 2] - c.z;
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (d < coreR) { const f = coreR / (d || 1e-6); X[o] = c.x + ex * f; X[o + 1] = c.y + ey * f; X[o + 2] = c.z + ez * f; }
      const p = this._v.set(X[o], X[o + 1], X[o + 2]);
      const h = this.ctx.colliders.heightAt(p.x, p.z) + 0.03;
      if (p.y < h) { X[o + 1] = h; PX[o] = lerp(PX[o], X[o], 0.5); PX[o + 2] = lerp(PX[o + 2], X[o + 2], 0.5); }
      if (near) for (const col of near) {
        if (this.ctx.colliders.contact(col, X[o], X[o + 1], X[o + 2], 0.035)) {
          const cc = this.ctx.colliders._c;
          X[o] += cc.nx * cc.d; X[o + 1] += cc.ny * cc.d; X[o + 2] += cc.nz * cc.d;
          PX[o] = lerp(PX[o], X[o], 0.6); PX[o + 1] = lerp(PX[o + 1], X[o + 1], 0.6); PX[o + 2] = lerp(PX[o + 2], X[o + 2], 0.6);
        }
      }
    }
  }

  updateFeet(dt) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    const sx = fz, sz = -fx; // right
    if (!this.grounded || this.stuck || this.sledding) { for (const f of this.feet) f.planted = false; return; }
    const stride = 0.22 + sp * 0.075;
    const dur = clamp(0.2 - sp * 0.014, 0.08, 0.2);
    let stepping = this.feet.some(f => f.t < 1);
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i], side = i === 0 ? -1 : 1;
      const ix = this.pos.x + sx * side * 0.12 + this.vel.x * 0.07, iz = this.pos.z + sz * side * 0.12 + this.vel.z * 0.07;
      const iy = this.pos.y - R + 0.025;
      if (!f.planted) { f.plant.set(ix, iy, iz); f.planted = true; f.t = 1; continue; }
      if (f.t < 1) {
        f.t = Math.min(1, f.t + dt / dur);
        f.to.set(ix + this.vel.x * dur * 0.6, iy, iz + this.vel.z * dur * 0.6);
        if (f.t >= 1) {
          f.plant.copy(f.to);
          if (sp > 0.8) this.ctx.audio?.step(clamp(sp / TUNE.maxSpeed, 0, 1), this.surface());
          this.sqv -= 0.25 + sp * 0.06;
        }
        continue;
      }
      const lag = Math.hypot(f.plant.x - ix, f.plant.z - iz);
      if (!stepping && (lag > stride || (sp < 0.3 && lag > 0.08))) {
        f.from.copy(f.plant); f.to.set(ix, iy, iz); f.t = 0; stepping = true;
      }
      f.plant.y = iy;
    }
  }

  surface() {
    const c = this.groundC;
    if (!c || c === 'ground') { const gs = this.ctx.groundSurface; return typeof gs === 'function' ? gs(this.pos.x, this.pos.z) : (gs || 'cooked'); }
    return c.surface || 'cooked';
  }

  // ------------------------------------------------------------------ control
  fixedUpdate(dt, input) {
    const T = TUNE, au = this.ctx.audio;
    if (this.state === 'sink') return this.sinkUpdate(dt);
    this.prevVel.copy(this.vel);
    const ctrl = this.stun > 0 || this.state !== 'play' ? 0 : 1;
    this.stun = Math.max(0, this.stun - dt);
    this.wallCooldown = Math.max(0, this.wallCooldown - dt);
    // camera-relative input
    const ix = input.x * ctrl, iz = input.y * ctrl;
    const yaw = input.camYaw;
    const fwx = -Math.sin(yaw), fwz = -Math.cos(yaw), rtx = Math.cos(yaw), rtz = -Math.sin(yaw);
    let wx = rtx * ix + fwx * iz, wz = rtz * ix + fwz * iz;
    const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    const inLen = Math.min(1, wl);
    if (input.jumpPressed && ctrl) this.buffer = T.buffer;
    else this.buffer = Math.max(0, this.buffer - dt);

    // water: in when mostly under, out when mostly clear (a little hysteresis keeps the surface calm)
    const Wt = this.ctx.water;
    const sub = Wt ? clamp((Wt.y - (this.pos.y - R)) / (2 * R), 0, 1) : 0;
    this.sub = sub;
    const wasIn = this.inWater;
    this.inWater = this.state === 'play' && (wasIn ? sub > 0.3 : sub > 0.5);
    if (this.inWater && !wasIn) this.enterWater();
    if (this.stuck && this.inWater) this.unstick();
    this.sledding = false;
    if (this.stuck) {
      this.stickUpdate(dt, wx, wz, inLen, input);
    } else if (this.inWater) {
      this.swim(dt, wx, wz, inLen, input, ctrl);
    } else if (this.grounded && this.onSlick()) {
      this.sled(dt, wx, wz, inLen, input, ctrl);
    } else if (this.grounded) {
      // just climbed over a lip: plant for a beat before running on
      const mv = this.settleT > 0 ? 0 : 1; this.settleT = Math.max(0, this.settleT - dt);
      const tx = wx * mv * T.maxSpeed, tz = wz * mv * T.maxSpeed;
      const dvx = tx - this.vel.x, dvz = tz - this.vel.z;
      const dvl = Math.hypot(dvx, dvz);
      const opposing = this.vel.x * wx + this.vel.z * wz < -0.5;
      const rate = (inLen > 0.1 ? (opposing ? T.skid : T.accel) : T.decel) * dt;
      if (dvl > 0) { const k = Math.min(1, rate / dvl); this.vel.x += dvx * k; this.vel.z += dvz * k; }
      this.vel.y = Math.min(this.vel.y, 0);
      if (this.buffer > 0) this.jump();
    } else {
      const sp0 = Math.hypot(this.vel.x, this.vel.z);
      this.vel.x += wx * T.airAccel * dt; this.vel.z += wz * T.airAccel * dt;
      const sp1 = Math.hypot(this.vel.x, this.vel.z), lim = Math.max(T.airMax, sp0);
      if (sp1 > lim) { this.vel.x *= lim / sp1; this.vel.z *= lim / sp1; }
      if (inLen < 0.1) { const k = Math.max(0, 1 - 1.2 * dt); if (sp0 < T.airMax + 0.5) { this.vel.x *= k; this.vel.z *= k; } }
      if (this.coyote > 0 && this.buffer > 0) this.jump();
      // a hop up a wall rises along it; it does not fling you over the top
      if (this.hopT > 0) { this.hopT -= dt; const hs = Math.hypot(this.vel.x, this.vel.z); if (hs > 2.6) { this.vel.x *= 2.6 / hs; this.vel.z *= 2.6 / hs; } }
      if (!input.jumpHeld && !this.cut && this.vel.y > 0) { this.vel.y *= T.jumpCut; this.cut = true; }
      this.vel.y -= T.gravity * (this.vel.y < 0 ? T.fallMul : 1) * dt;
      this.vel.y = Math.max(this.vel.y, -T.terminal);
    }
    this.coyote = Math.max(0, this.coyote - dt);

    // integrate + collide
    this.pos.addScaledVector(this.vel, dt);
    const wasGrounded = this.grounded;
    const contacts = this.ctx.colliders.resolve(this.pos, R, this.contacts);
    for (const s of this.ctx.supports) { const k = s.support(this.pos, R, this.vel, dt); if (k) contacts.push(k); }
    // ground snap: keep feet on the floor going down slopes and steps
    let ground = null, gy = 0.55;
    for (const k of contacts) if (k.ny > gy) { gy = k.ny; ground = k; }
    if (!ground && wasGrounded && this.vel.y <= 0.01 && !this.stuck) {
      const y0 = this.pos.y, x0 = this.pos.x, z0 = this.pos.z;
      this.pos.y -= 0.32;
      const extra = this.ctx.colliders.resolve(this.pos, R, []);
      let g2 = null; for (const k of extra) if (k.ny > 0.55) g2 = k;
      if (!g2) for (const s of this.ctx.supports) { const k = s.support(this.pos, R, this.vel, dt); if (k) g2 = k; }
      // a snap only ever moves you down: if it would shove you sideways (into something buried), skip it
      if (g2 && Math.hypot(this.pos.x - x0, this.pos.z - z0) < 0.02) { ground = g2; contacts.push(g2); } else this.pos.set(x0, y0, z0);
    }
    // velocity response
    for (const k of contacts) {
      const vn = this.vel.x * k.nx + this.vel.y * k.ny + this.vel.z * k.nz;
      if (vn < 0) { this.vel.x -= k.nx * vn; this.vel.y -= k.ny * vn; this.vel.z -= k.nz * vn; }
      if (k.c && k.c.onTouch) k.c.onTouch(this, k);
    }
    this.grounded = !!ground && !this.stuck && this.vel.y <= 0.5;
    // off the end of a lip on the run: leave at the run's own angle
    if (this.sledding && wasGrounded && !this.grounded && this.sledVy > 0.4 && this.vel.y < this.sledVy) {
      this.vel.y = this.sledVy;
      this.ctx.audio?.launch?.(clamp(Math.hypot(this.vel.x, this.vel.z) / 14, 0, 1));
    }
    this.groundC = ground ? ground.c : null;
    if (ground) this.groundN.set(ground.nx, ground.ny, ground.nz);
    if (this.grounded) {
      this.coyote = T.coyote; this.lastWall = null; this.wallCount = 0;
      if (!wasGrounded) {
        if (this.hopT > 0) { this.vel.x *= 0.15; this.vel.z *= 0.15; this.settleT = 0.16; }
        this.hopT = 0;
        this.land();
      }
      if (this.groundC && this.groundC.onStand) this.groundC.onStand(this, dt);
      this.airT = 0;
    } else this.airT += dt;

    // walls: stick to cooked surfaces while airborne
    if (!this.grounded && !this.stuck && !this.inWater && this.state === 'play') {
      for (const k of contacts) {
        if (Math.abs(k.ny) > 0.5 || !k.c || k.c === 'ground' || !k.c.sticky) continue;
        const hl = Math.hypot(k.nx, k.nz); const nx = k.nx / hl, nz = k.nz / hl;
        const into = -(this.prevVel.x * nx + this.prevVel.z * nz);
        const want = -(wx * nx + wz * nz);
        if (into < 0.6 && want < 0.3) continue;
        const same = this.sameWall(k.c, nx, nz);
        if (same && (this.wallCount >= 3 || this.wallCooldown > 0)) continue;
        if (this.vel.y > (same ? 1.5 : 4.0)) continue; // let the climb top out first
        this.stick(k, nx, nz, Math.max(into, 0));
        break;
      }
    }

    // facing, lean, squash
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (this.stuck) this.facing = dampAngle(this.facing, Math.atan2(-this.stuckN.x, -this.stuckN.z), 16, dt);
    else if (sp > 0.6) this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), 13, dt);
    const ax = (this.vel.x - this.prevVel.x) / dt, az = (this.vel.z - this.prevVel.z) / dt;
    // lean into acceleration (in world space, mapped to x/z tilt)
    const lx = clamp(ax * 0.006, -0.3, 0.3), lz = clamp(az * 0.006, -0.3, 0.3);
    this.lean.x = lerp(this.lean.x, lx, 1 - Math.exp(-12 * dt));
    this.lean.y = lerp(this.lean.y, lz, 1 - Math.exp(-12 * dt));
    this.sqAxis.lerp(this.sqAxisT, 1 - Math.exp(-14 * dt)).normalize();
    const w = TAU * 4.2, zeta = 0.32;
    this.sqv += (-2 * zeta * w * this.sqv - w * w * (this.sq - 1)) * dt;
    this.sq = clamp(this.sq + this.sqv * dt, 0.55, 1.5);
    if (!this.stuck && this.sqAxisT.y < 0.99 && this.grounded) this.sqAxisT.set(0, 1, 0);

    this.updateFeet(dt);
    this.updateNearCols();
    this.stepStrands(dt);
    this.checkpoint(dt);

    if (this.inWater) { this.bubbleT -= dt; if (this.bubbleT <= 0) { this.bubbleT = 0.35 + Math.random() * 0.9; this.puff(1); } }
    if (this.pos.y < (this.ctx.sinkY ?? SEA + 0.1)) this.startSink();
  }

  // ------------------------------------------------------------------ water
  // Cooked pasta sinks. You settle and walk the bottom in slow motion; Space is a stroke up
  // (hold to keep stroking); a tap at the surface hops you out.
  swim(dt, wx, wz, inLen, input, ctrl) {
    const W = this.ctx.water, au = this.ctx.audio;
    const nearTop = this.pos.y > W.y - 0.62;
    this.strokeT = Math.max(0, this.strokeT - dt);
    if (input.jumpPressed && ctrl && nearTop && !this.grounded) {
      this.vel.y = 9.6; this.vel.x += wx * 2; this.vel.z += wz * 2;
      this.buffer = 0; this.cut = true; this.strokeT = 0.35;
      this.sqAxisT.set(0, 1, 0); this.sq = 1.25; this.sqv = 2;
      for (const f of this.feet) f.planted = false;
      this.kickStrands(0, -2.4, 0, 0.5);
      au?.emerge?.(0.75);
      this.ctx.fx?.splash?.(this.pos, 0.35);
      return;
    }
    if (this.grounded) {
      const max = 3.1, rate = (inLen > 0.1 ? 14 : 9) * dt;
      const dvx = wx * max - this.vel.x, dvz = wz * max - this.vel.z, dvl = Math.hypot(dvx, dvz);
      if (dvl > 0) { const k = Math.min(1, rate / dvl); this.vel.x += dvx * k; this.vel.z += dvz * k; }
      this.vel.y = Math.min(this.vel.y, 0);
      if (this.buffer > 0 && ctrl) {                   // push off the bottom
        this.buffer = 0; this.vel.y = 4.4; this.grounded = false; this.strokeT = 0.3;
        this.vel.x += wx * 1.2; this.vel.z += wz * 1.2;
        for (const f of this.feet) f.planted = false;
        this.sq = 1.18; this.sqv = 1.4;
        au?.paddle?.(0.85); this.puff(6);
      }
      return;
    }
    const drag = Math.exp(-2.1 * dt);
    this.vel.x *= drag; this.vel.z *= drag; this.vel.y *= Math.exp(-1.6 * dt);
    this.vel.y -= 5.0 * dt;
    this.vel.x += wx * 12 * dt; this.vel.z += wz * 12 * dt;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 3.9) { this.vel.x *= 3.9 / hs; this.vel.z *= 3.9 / hs; }
    if (ctrl && this.strokeT <= 0 && (this.buffer > 0 || input.jumpHeld)) {
      this.buffer = 0; this.strokeT = 0.3;
      const top = nearTop ? 0.3 : 1;                  // at the surface a stroke only treads water
      this.vel.y = Math.min(Math.max(this.vel.y, 0) + 3.4 * top, 4.6);
      this.vel.x += wx * 1.4; this.vel.z += wz * 1.4;
      this.sq = 1.16; this.sqv = 1.2;
      this.kickStrands(-wx * 1.5, -2.2, -wz * 1.5, 0.5);
      au?.paddle?.(0.4 + 0.6 * inLen);
      this.puff(3);
    }
  }
  // ------------------------------------------------------------------ the run
  // Wet cooked lasagna: no grip. The slope pulls you down it; the keys steer and brake but can't stop you.
  onSlick() { return this.groundC === 'ground' && !!this.ctx.slickAt && this.ctx.slickAt(this.pos.x, this.pos.z); }
  sled(dt, wx, wz, inLen, input, ctrl) {
    const n = this.groundN, G = TUNE.gravity;
    this.sledding = true;
    this.vel.x += G * n.y * n.x * dt; this.vel.z += G * n.y * n.z * dt;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    let carve = 0;
    if (sp > 0.6) {
      const fx = this.vel.x / sp, fz = this.vel.z / sp, lx = -fz, lz = fx;
      const lat = wx * lx + wz * lz, fwd = wx * fx + wz * fz;
      this.vel.x += lx * lat * 12 * dt; this.vel.z += lz * lat * 12 * dt;
      if (fwd < -0.3) { const k = Math.exp(1.5 * dt * fwd); this.vel.x *= k; this.vel.z *= k; }
      carve = Math.abs(lat) * clamp(sp / 8, 0, 1);
    } else { this.vel.x += wx * 6 * dt; this.vel.z += wz * 6 * dt; }
    const k = Math.exp(-(0.08 + sp * 0.02) * dt);
    this.vel.x *= k; this.vel.z *= k;
    this.vel.y = Math.min(this.vel.y, 0);
    this.sledVy = -(n.x * this.vel.x + n.z * this.vel.z) / Math.max(n.y, 0.3);
    const want = clamp(Math.max(carve, (1 - n.y) * 3), 0, 1);
    this.carve += (want - this.carve) * Math.min(1, dt * 8);
    if (this.buffer > 0 && ctrl) this.jump();
  }
  enterWater() {
    const vy = this.prevVel.y;
    if (vy < -2.2) {
      const k = clamp(-vy / 16, 0, 1);
      this.ctx.audio?.splash?.(k);
      this.ctx.fx?.splash?.(this.pos, 0.35 + k * 0.6);
      this.puff(4 + Math.round(k * 10));
    }
    this.vel.y *= 0.35; this.vel.x *= 0.7; this.vel.z *= 0.7;
    this.unstick();
  }
  puff(n) {
    const B = this.ctx.bubbles; if (!B) return;
    for (let i = 0; i < n; i++) {
      const j = Math.floor(Math.random() * this.N) * 3;
      B.emit(this._v.set(this.X[j], this.X[j + 1], this.X[j + 2]), 0.035 + Math.random() * 0.035, 0.12, 0.6);
    }
  }

  jump() {
    const T = TUNE;
    this.vel.y = T.jumpV;
    this.grounded = false; this.coyote = 0; this.buffer = 0; this.cut = false;
    this.sqAxisT.set(0, 1, 0); this.sqAxis.set(0, 1, 0); this.sq = 1.22; this.sqv = 2.0;
    for (const f of this.feet) f.planted = false;
    // fling the legs a little
    this.kickStrands(0, -1.2, 0, 0.5);
    this.ctx.audio?.jump();
  }

  land() {
    const impact = clamp(-this.prevVel.y / 22, 0, 1);
    this.sqAxisT.set(this.groundN.x, this.groundN.y, this.groundN.z); this.sqAxis.copy(this.sqAxisT);
    this.sqv -= 2.5 + impact * 7;
    this.kickStrands(0, -2.2 * impact - 0.4, 0, 1);
    if (impact > 0.08) this.ctx.audio?.land(impact, this.surface());
    if (this.ctx.fx && impact > 0.35 && this.surface() === 'cooked') this.ctx.fx.dent?.(this.pos, impact);
    this.landImpact = impact;
  }

  kickStrands(vx, vy, vz, freeOnly) {
    const dt = 1 / 120;
    for (let i = 0; i < this.N; i++) {
      const k = this.kind[i];
      if (k === 2 || (freeOnly && k === 0 && freeOnly > 0.9)) continue;
      const s = k === 0 ? 0.35 : 1;
      this.PX[i * 3] -= vx * dt * s; this.PX[i * 3 + 1] -= vy * dt * s; this.PX[i * 3 + 2] -= vz * dt * s;
    }
  }

  stick(k, nx, nz, into) {
    if (this.sameWall(k.c, nx, nz)) this.wallCount++; else { this.lastWall = k.c; this.wallCount = 1; }
    this.lastWallN.set(nx, 0, nz);
    this.stuck = true; this.stuckC = k.c; this.stuckN.set(nx, 0, nz); this.stickT = 0; this.awayT = 0; this.hopT = 0;
    this.vel.set(0, Math.max(0, this.vel.y * 0.1), 0);
    this.sqAxisT.set(nx, 0, nz); this.sqAxis.set(nx, 0, nz);
    this.sqv -= 3 + into * 0.6;
    this.kickStrands(-nx * 3, 0.5, -nz * 3, 0.5);
    this.ctx.audio?.stick(clamp(into / 8, 0.25, 1));
    this.ctx.fx?.splat?.(this.pos, this.stuckN);
  }

  stickUpdate(dt, wx, wz, inLen, input) {
    const T = TUNE, n = this.stuckN;
    this.stickT += dt;
    const limit = T.stickTime[Math.min(2, this.wallCount - 1)];
    const into = -(wx * n.x + wz * n.z), away = wx * n.x + wz * n.z;
    // slide: a short hold, then a slow starchy slide that speeds up
    const st = Math.max(0, this.stickT - T.stickHold);
    this.vel.set(-n.x * 1.2, -Math.min(0.35 + st * T.slideAcc * (1 + 0.5 * (this.wallCount - 1)), T.slideMax), -n.z * 1.2);
    this.ctx.audio?.slide(true, clamp(-this.vel.y / T.slideMax, 0, 1));
    if (this.buffer > 0) {
      this.buffer = 0;
      this.unstick();
      if (into > 0.3) {
        // climb: a hop back up the same wall
        this.vel.set(n.x * T.hopOut, T.hopV, n.z * T.hopOut);
        this.wallCooldown = 0.1; this.hopT = 0.75;
      } else {
        // leap: off the wall, steered sideways by input
        const lat = { x: wx - n.x * (wx * n.x + wz * n.z), z: wz - n.z * (wx * n.x + wz * n.z) };
        this.vel.set(n.x * T.leapOut + lat.x * T.leapSide, T.leapV, n.z * T.leapOut + lat.z * T.leapSide);
        this.wallCooldown = 0.2;
      }
      this.cut = true; // wall jumps are always full height
      this.sqAxisT.set(0, 1, 0); this.sq = 1.2; this.sqv = 1.5;
      this.kickStrands(-n.x * 2, -1, -n.z * 2, 0.5);
      this.ctx.audio?.leap();
      return;
    }
    if (away > 0.6) this.awayT += dt; else this.awayT = 0;
    if (this.awayT > 0.09 || this.stickT > limit) {
      this.unstick();
      this.vel.set(n.x * 2.2, 0, n.z * 2.2);
      if (this.stickT > limit) this.wallCount = 3; // dried out: this wall won't take us again
      this.wallCooldown = 0.25;
      return;
    }
    // still touching? if the wall ends under us we just fall
    let touching = false;
    for (const k of this.contacts) if (k.c === this.stuckC && Math.abs(k.ny) < 0.6) touching = true;
    if (!touching && this.stickT > 0.05) { this.unstick(); this.vel.set(n.x * 0.5, -1, n.z * 0.5); }
  }

  // same surface = same collider facing the same way (a tube has many walls)
  sameWall(c, nx, nz) { return c === this.lastWall && nx * this.lastWallN.x + nz * this.lastWallN.z > 0.6; }

  unstick() {
    this.stuck = false; this.stuckC = null;
    this.ctx.audio?.slide(false, 0);
    this.sqAxisT.set(0, 1, 0);
  }

  updateNearCols() {
    const p = this.pos;
    this.nearCols = this.nearCols || [];
    this.nearCols.length = 0;
    for (const c of this.ctx.colliders.list) {
      if (!c.active) continue;
      if (p.x + 1.2 < c.bx0 || p.x - 1.2 > c.bx1 || p.z + 1.2 < c.bz0 || p.z - 1.2 > c.bz1 || p.y + 1.2 < c.by0 || p.y - 1.4 > c.by1) continue;
      this.nearCols.push(c);
    }
  }

  checkpoint(dt) {
    this.safeT += dt;
    if (!this.grounded || this.safeT < 0.25) return;
    this.safeT = 0;
    const c = this.groundC;
    if (c && c !== 'ground' && !c.safe) return;
    if (this.inWater || this.pos.y < (this.ctx.safeMinY ?? SEA + 1.0)) return;
    const col = this.ctx.colliders, y = this.pos.y - R;
    for (const [ox, oz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) {
      const f = col.floorBelow(this.pos.x + ox, this.pos.y, this.pos.z + oz, 2);
      if (f < y - 0.35) return;
    }
    this.safe.copy(this.pos);
  }

  startSink() {
    if (this.state === 'sink') return;
    this.state = 'sink'; this.sinkT = 0;
    this.unstick();
    this.ctx.audio?.sink();
    this.ctx.fx?.splash?.(this.pos, clamp(-this.vel.y / 20, 0.3, 1));
  }

  sinkUpdate(dt) {
    this.sinkT += dt;
    this.vel.multiplyScalar(Math.exp(-6 * dt));
    this.vel.y = Math.min(this.vel.y, -0.6);
    this.pos.addScaledVector(this.vel, dt);
    this.stepStrands(dt);
    if (this.sinkT > 1.0) {
      this.reset(this.safe.clone().add(new THREE.Vector3(0, 2.2, 0)), this.facing);
      this.ctx.audio?.respawn();
      this.ctx.onRespawn?.();
    }
  }

  // ------------------------------------------------------------------ mesh
  updateMesh() {
    const X = this.X, RS = this.RS, SUB = this.SUB;
    const P = this.gPos.array, NN = this.gNor.array;
    const ring = this._ring;
    const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3(), prevT = new THREE.Vector3();
    for (const s of this.S) {
      // Catmull-Rom subdivision
      let r = 0;
      for (let i = 0; i < s.n - 1; i++) {
        const i0 = s.start + Math.max(0, i - 1), i1 = s.start + i, i2 = s.start + i + 1, i3 = s.start + Math.min(s.n - 1, i + 2);
        for (let k = 0; k < SUB; k++) {
          const t = k / SUB, t2 = t * t, t3 = t2 * t;
          const q = ring[r++];
          for (let a = 0; a < 3; a++) {
            const p0 = X[i0 * 3 + a], p1 = X[i1 * 3 + a], p2 = X[i2 * 3 + a], p3 = X[i3 * 3 + a];
            q.setComponent(a, 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
          }
        }
      }
      ring[r++].set(X[(s.start + s.n - 1) * 3], X[(s.start + s.n - 1) * 3 + 1], X[(s.start + s.n - 1) * 3 + 2]);
      const nr = r;
      // parallel transport frames
      for (let k = 0; k < nr; k++) {
        const a = ring[Math.max(0, k - 1)], b = ring[Math.min(nr - 1, k + 1)];
        T.subVectors(b, a); if (T.lengthSq() < 1e-12) T.copy(prevT); T.normalize();
        if (k === 0) { tmp.set(0, 1, 0); if (Math.abs(T.y) > 0.9) tmp.set(1, 0, 0); Nn.crossVectors(T, tmp).normalize(); }
        else { const d = Nn.dot(T); Nn.addScaledVector(T, -d); if (Nn.lengthSq() < 1e-8) Nn.crossVectors(T, tmp.set(0, 1, 0)); Nn.normalize(); }
        B.crossVectors(T, Nn);
        prevT.copy(T);
        const rad = s.radius;
        for (let j = 0; j < RS; j++) {
          const ang = (j / RS) * TAU, cs = Math.cos(ang), sn = Math.sin(ang);
          const nx = Nn.x * cs + B.x * sn, ny = Nn.y * cs + B.y * sn, nz = Nn.z * cs + B.z * sn;
          const v = (s.v0 + k * RS + j) * 3;
          P[v] = ring[k].x + nx * rad; P[v + 1] = ring[k].y + ny * rad; P[v + 2] = ring[k].z + nz * rad;
          NN[v] = nx; NN[v + 1] = ny; NN[v + 2] = nz;
        }
        if (k === 0 || k === nr - 1) {
          const capBase = k === 0 ? s.cap0 : s.cap1, sign = k === 0 ? -1 : 1;
          for (let j = 0; j < RS; j++) {
            const src = (s.v0 + k * RS + j) * 3, dst = (capBase + j) * 3;
            P[dst] = P[src]; P[dst + 1] = P[src + 1]; P[dst + 2] = P[src + 2];
            NN[dst] = T.x * sign; NN[dst + 1] = T.y * sign; NN[dst + 2] = T.z * sign;
          }
          const cv = (capBase + RS) * 3;
          P[cv] = ring[k].x; P[cv + 1] = ring[k].y; P[cv + 2] = ring[k].z;
          NN[cv] = T.x * sign; NN[cv + 1] = T.y * sign; NN[cv + 2] = T.z * sign;
        }
      }
    }
    this.gPos.needsUpdate = true; this.gNor.needsUpdate = true;
    const c = this.bodyCenter(this._c);
    this.core.position.copy(c);
    const a = this.sqAxis, s = this.sq;
    // approximate squash for the core: scale along the dominant axis
    this.updateFace();
    this.core.scale.set(1 + (s - 1) * Math.abs(a.x) - (s - 1) * 0.5 * (1 - Math.abs(a.x)), 1 + (s - 1) * Math.abs(a.y) - (s - 1) * 0.5 * (1 - Math.abs(a.y)), 1 + (s - 1) * Math.abs(a.z) - (s - 1) * 0.5 * (1 - Math.abs(a.z)));
  }

  // a point on the outside of the twirl (for things that get tangled in it)
  // ------------------------------------------------------------------ the face: orecchiette eyes, squid-ink pastina pupils, an elbow smile
  buildFace(K) {
    const anchor = (dir) => {
      const d = new THREE.Vector3(...dir).normalize();
      let best = -1, bd = -2;
      for (let i = 0; i < this.N; i++) {
        if (this.kind[i] !== 0) continue;
        const v = new THREE.Vector3(this.local[i * 3], this.local[i * 3 + 1], this.local[i * 3 + 2]);
        const len = v.length(); if (len < BODY_R * 0.82) continue;
        const dot = v.normalize().dot(d);
        if (dot > bd) { bd = dot; best = i; }
      }
      return { idx: best, dir: d };
    };
    this.face = [
      { a: anchor([-0.38, 0.3, 0.87]), kind: 'eye', side: -1 },
      { a: anchor([0.38, 0.3, 0.87]), kind: 'eye', side: 1 },
      { a: anchor([0, -0.27, 0.96]), kind: 'mouth' },
    ];
    const eyeG = Shapes.orecchiette({ radius: 0.082, depth: 0.03, thickness: 0.014 });
    const pupilG = new THREE.SphereGeometry(0.029, 14, 10);
    const mouthG = Shapes.gomito({ radius: 0.017, bend: 0.075, arc: 1.7 });
    for (const f of this.face) {
      if (f.kind === 'eye') {
        f.mesh = new THREE.Mesh(eyeG, K.eye); f.pupil = new THREE.Mesh(pupilG, K.pupil);
        f.pupil.castShadow = true; this.scene.add(f.pupil);
      } else f.mesh = new THREE.Mesh(mouthG, K.pupil);
      f.mesh.castShadow = true; f.mesh.receiveShadow = true;
      this.scene.add(f.mesh);
    }
    this.lookAt = new THREE.Vector3(0, 0, 0); this.lookAtOn = false;
    this._fq = new THREE.Quaternion(); this._fm = new THREE.Matrix4(); this._fu = new THREE.Vector3(); this._fo = new THREE.Vector3(); this._fx = new THREE.Vector3(); this._fp = new THREE.Vector3();
  }

  updateFace() {
    const c = this.bodyCenter(this._c);
    const up = this._fu.set(0, 1, 0).applyQuaternion(this._qleg || this._q);
    for (const f of this.face) {
      const o = f.a.idx * 3;
      const p = this._fp.set(this.X[o], this.X[o + 1], this.X[o + 2]);
      const out = this._fo.subVectors(p, c);
      if (out.lengthSq() < 1e-8) out.copy(f.a.dir); out.normalize();
      const x = this._fx.crossVectors(up, out).normalize();
      const y = new THREE.Vector3().crossVectors(out, x);
      this._fm.makeBasis(x, y, out);
      f.mesh.quaternion.setFromRotationMatrix(this._fm);
      f.mesh.position.copy(p).addScaledVector(out, f.kind === 'eye' ? 0.035 : 0.03);
      if (f.kind === 'mouth') { f.mesh.position.addScaledVector(y, -0.03); continue; }
      // pupils roll toward what the hero is looking at
      const tgt = this.lookAtOn ? this.lookAt : new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(10).add(p);
      const d = new THREE.Vector3().subVectors(tgt, f.mesh.position);
      const lx = clamp(d.dot(x) / (d.length() + 1e-6), -1, 1), ly = clamp(d.dot(y) / (d.length() + 1e-6), -1, 1);
      f.pupil.position.copy(f.mesh.position).addScaledVector(out, 0.012).addScaledVector(x, lx * 0.034).addScaledVector(y, ly * 0.03);
    }
  }

  // ------------------------------------------------------------------ grabbing noodles (the opening screen)
  // the front-most noodle point near the ray, so you grab what you see
  pickPoint(ray, maxDist = 0.16) {
    let best = -1, bs = Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.N; i++) {
      v.set(this.X[i * 3], this.X[i * 3 + 1], this.X[i * 3 + 2]);
      const d2 = ray.distanceSqToPoint(v);
      if (d2 > maxDist * maxDist) continue;
      const s = v.sub(ray.origin).dot(ray.direction) + Math.sqrt(d2) * 2.5;
      if (s < bs) { bs = s; best = i; }
    }
    return best;
  }
  startGrab(idx, target) {
    this.grab = { idx, target: target.clone(), stretch: 0 };
    if (this.kind[idx] === 3) for (const f of this.feet) f.planted = false;
  }
  moveGrab(target) { if (this.grab) this.grab.target.copy(target); }
  endGrab() { const g = this.grab; this.grab = null; return g ? g.stretch : 0; }
  applyGrab(k) {
    const g = this.grab, o = g.idx * 3, X = this.X, PX = this.PX;
    // how far the held point is pulled from where its noodle wants to be
    let rx, ry, rz;
    if (this.kind[g.idx] === 0 || this.kind[g.idx] === 2) { rx = this.TG[o]; ry = this.TG[o + 1]; rz = this.TG[o + 2]; }
    else { const c = this.bodyCenter(this._c); rx = c.x; ry = c.y; rz = c.z; }
    const pull = Math.hypot(g.target.x - rx, g.target.y - ry, g.target.z - rz);
    g.stretch = clamp(pull / 0.95, 0, 1.2);
    if (g.stretch >= 1.0) { // too far: the noodle lets go and whips back
      this.grab = null;
      PX[o] = X[o] + (X[o] - rx) * 0.25; PX[o + 1] = X[o + 1] + (X[o + 1] - ry) * 0.25; PX[o + 2] = X[o + 2] + (X[o + 2] - rz) * 0.25;
      this.ctx.audio?.strandSnap?.();
      this.snapped = 0.35;
      return;
    }
    const nx = lerp(X[o], g.target.x, k), ny = lerp(X[o + 1], g.target.y, k), nz = lerp(X[o + 2], g.target.z, k);
    PX[o] = lerp(PX[o], nx, 0.7); PX[o + 1] = lerp(PX[o + 1], ny, 0.7); PX[o + 2] = lerp(PX[o + 2], nz, 0.7);
    X[o] = nx; X[o + 1] = ny; X[o + 2] = nz;
  }

  setScene(scene) {
    const parts = [this.mesh, this.core];
    for (const f of this.face) { parts.push(f.mesh); if (f.pupil) parts.push(f.pupil); }
    for (const p of parts) { p.removeFromParent(); scene.add(p); }
    this.scene = scene;
  }

  strandPoint(i, out) { const o = i * 3; return out.set(this.X[o], this.X[o + 1], this.X[o + 2]); }
}
