// The stage camera: low and close, like the front row. It never turns (W is always up the stage, away from you),
// so the room's back wall is the backdrop and the two of you are big in the picture. It stays near YOU: when she's
// far up the stage it drops lower and looks along the floor to her (she's small, in the distance, over your
// shoulder); when you're trading blows it's right in on both of you; when she's nearer the audience than you are it
// lifts to see over her. It never looks over the top of the set. Shake and punches go on the rendered camera only
// (the steady "logic" camera is what anything that asks where the mouse points uses).
// (Until 9 Nov the camera was high, three-quarter, 52 degrees down: Alex couldn't tell what anyone looked like.)
import * as THREE from 'three';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _ndc = new THREE.Vector2();
const rad = THREE.MathUtils.degToRad, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// pitchFar: she's well up the stage from you; pitchLevel: side by side; pitchOver: she's between you and the audience
export const VIEW = { fov: 38, pitchFar: rad(12.5), pitchLevel: rad(20), pitchOver: rad(31), minDist: 7.4, maxDist: 24, lookY: 1.05 };

export class ArenaCamera {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(VIEW.fov, aspect, 0.3, 400);      // rendered
    this.logic = new THREE.PerspectiveCamera(VIEW.fov, aspect, 0.3, 400);    // for aiming
    this.pitch = null;          // null: the camera's own (by where the two of you stand); a number: held there (the credits)
    this.dist = 12; this.distT = 12; this._pitch = VIEW.pitchLevel; this._pitchT = VIEW.pitchLevel;
    this.baseMin = VIEW.minDist; this.minDist = this.baseMin; this.maxDist = VIEW.maxDist;
    this.closeK = 0;          // 0 normal, 1 intimate (a bridge)
    this.focus = new THREE.Vector3(); this.focusV = new THREE.Vector3();
    this.bounds = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
    this.weight = 0.45;       // how far toward the boss the focus sits (less as you separate: it stays with YOU)
    this.shakeT = 0; this.shakeA = 0; this.shakeF = 28; this.roll = 0;
    this.fov = VIEW.fov; this.fovKick = 0;
    this.push = 0;            // a hit pushes the camera in for a moment (0..1, decays)
    this.jolt = new THREE.Vector3();   // and knocks it the way the hit went
    this.lookY = VIEW.lookY; this.lift = 0;
    this.room = null;         // { top, backZ }: the set's height and its back wall (the picture never goes over the top)
    this.override = null;     // {pos, look, k, fov?} a brief framing (entrances, finishes) that never takes control
    this._seed = Math.random() * 100;
  }

  setAspect(a) { this.cam.aspect = this.logic.aspect = a; this.cam.updateProjectionMatrix(); this.logic.updateProjectionMatrix(); }

  // a fight starts (or ends) clean: no lean-in left over from the last finish, nothing a track set for itself
  reset() {
    this.override = null; this.closeK = 0; this.soloK = 0; this.weight = 0.45; this.minDist = this.baseMin; this.maxDist = VIEW.maxDist;
    this.fovKick = 0; this.shakeA = 0; this.shakeT = 0; this.roomMaxZ = undefined; this.bossAirY = 0; this.pitch = null; this.fov = VIEW.fov;
    this.push = 0; this.jolt.set(0, 0, 0); this.lift = 0; this.lookY = VIEW.lookY; this.youY = 0; this.room = null;
  }

  // (kept for anything that asks: the pitch it's at)
  pitchAt() { return this.pitch != null ? this.pitch : this._pitch; }

  snap(player, boss) { this._target(player, boss, _v); this.focus.copy(_v); this.focusV.set(0, 0, 0); this.dist = this.distT; this._pitch = this._pitchT; this.update(0, player, boss); }

  _target(player, boss, out) {
    const px = player.x, pz = player.z;
    const bx = boss ? boss.x : px, bz = boss ? boss.z : pz;
    const sep = Math.hypot(bx - px, bz - pz), depth = pz - bz;
    const w = this.weight * lerp(1, 0.62, smooth(4, 13, sep));
    out.set(px + (bx - px) * w, 0, pz + (bz - pz) * w);
    // keep the framed area inside the arena (a little slack so walls show)
    const b = this.bounds;
    out.x = clamp(out.x, b.minX + 3.2, b.maxX - 3.2);
    out.z = clamp(out.z, b.minZ + 1.0, b.maxZ - 0.5);
    // a room with no wall behind the camera: keep the bottom of the picture on its floor
    if (this.roomMaxZ !== undefined) out.z = Math.min(out.z, this.roomMaxZ - this._bottomReach());
    // how far down it looks: along the floor when she's up the stage, down over her when she's this side of you
    const want = this.pitch != null ? this.pitch
      : depth >= 0 ? lerp(VIEW.pitchLevel, VIEW.pitchFar, smooth(1.5, 9, depth)) : lerp(VIEW.pitchLevel, VIEW.pitchOver, smooth(0, 4.5, -depth));
    // fit: the nearest distance at which both fighters (feet and heads) sit inside safe margins
    // (the top of the screen is her bar, the bottom-left the hearts)
    const fit = this._fit(out, px, pz, bx, bz, player.y || 0, want);
    this.distT = fit.d * (1 - 0.14 * this.closeK) * (1 - 0.16 * (this.soloK || 0));
    this._pitchT = fit.p;
    return out;
  }

  // (ly: where it looks, off the floor: up a little when one of you is in the air, so it tilts up instead of backing off)
  _place(c, focus, d, p, ly = this.lookY) {
    const back = Math.cos(p) * d, up = Math.sin(p) * d;
    c.position.set(focus.x, ly + up, focus.z + back); c.lookAt(focus.x, ly, focus.z);
  }
  _liftFor() { return Math.min(1.7, Math.max(this.bossAirY || 0, this.youY || 0) * 0.55); }
  // the least it can look down from there without seeing over the top of the set at its back wall
  _floorPitch(focus, d, p, ly) {
    const R = this.room; if (!R || this.pitch != null) return p;
    const half = rad(this.fov / 2);
    for (let i = 0; i < 4; i++) {
      const camY = ly + Math.sin(p) * d, camZ = focus.z + Math.cos(p) * d;
      const need = half - Math.atan2(R.top - 0.25 - camY, Math.max(1, camZ - R.backZ));
      if (p >= need - 1e-3) break;
      p = need;
    }
    return p;
  }

  _fit(focus, px, pz, bx, bz, py = 0, want = this._pitch) {
    const c = this._fitCam || (this._fitCam = new THREE.PerspectiveCamera());
    c.fov = this.fov; c.aspect = this.logic.aspect; c.near = 0.3; c.far = 400; c.updateProjectionMatrix();
    const cap = this.room ? this.room.top - 0.5 : 99;
    const pts = [[px, 0, pz], [px, Math.min(cap, 1.95 + py), pz], [bx, 0, bz], [bx, Math.min(cap, 2.35 + (this.bossAirY || 0)), bz]];
    const q = _v2, ly = this.lookY + this._liftFor();
    let d = this.minDist, p = want;
    for (; d < this.maxDist; d += 0.4) {
      p = this._floorPitch(focus, d, want, ly);
      this._place(c, focus, d, p, ly); c.updateMatrixWorld();
      let ok = true;
      for (const t of pts) { q.set(t[0], t[1], t[2]).project(c); if (q.y > 0.7 || q.y < -0.78 || Math.abs(q.x) > 0.82 || q.z > 1) { ok = false; break; } }
      if (ok) break;
    }
    return { d, p };
  }

  // how far toward the camera the bottom edge of the picture reaches on the floor, from the focus
  _bottomReach() {
    const d = this.dist, p = this.pitchAt(), a = p + rad(this.fov / 2);
    return Math.cos(p) * d - (Math.sin(p) * d + this.lookY) / Math.tan(a) + 0.2;
  }

  shake(amount, time = 0.18) { this.shakeA = Math.max(this.shakeA, amount); this.shakeT = Math.max(this.shakeT, time); }
  kick(fovDegrees = 1.2) { this.fovKick = Math.min(5, this.fovKick + fovDegrees); }
  // a hit: the camera comes in a touch and is knocked the way the blow went (ang: world direction, k: how hard)
  punch(ang, k = 1) { this.push = Math.min(1, this.push + 0.35 * k); this.jolt.x += Math.sin(ang) * 0.16 * k; this.jolt.z += Math.cos(ang) * 0.1 * k; this.jolt.y += 0.05 * k; }

  update(dt, player, boss) {
    this._target(player, boss, _v);
    // critically damped follow
    const w = 8.0, k = 1 - Math.exp(-w * dt);
    this.focus.lerp(_v, k);
    this.dist += (this.distT - this.dist) * (1 - Math.exp(-(this.distT < this.dist ? 2.4 : 4.2) * dt));
    this._pitch += (this._pitchT - this._pitch) * (1 - Math.exp(-3.4 * dt));
    this.push *= Math.exp(-dt * 7); this.jolt.multiplyScalar(Math.exp(-dt * 11));
    // when one of you is up in the air the picture rises a little with her
    this.lift += (this._liftFor() - this.lift) * Math.min(1, dt * 7);
    const d = this.dist * (1 - 0.07 * this.push);
    const p = this.pitchAt(), back = Math.cos(p) * d, up = Math.sin(p) * d;
    const ly = this.lookY + this.lift;
    this.logic.position.set(this.focus.x, ly + up, this.focus.z + back);
    this.logic.lookAt(this.focus.x, ly, this.focus.z);
    this.logic.fov = this.fov; this.logic.updateProjectionMatrix();
    // rendered camera: logic + override blend + shake + fov kick
    this.cam.position.copy(this.logic.position).add(this.jolt);
    this.cam.quaternion.copy(this.logic.quaternion);
    if (this.override && this.override.k > 0.001) {
      const o = this.override;
      const tmp = this._lk || (this._lk = new THREE.PerspectiveCamera()); tmp.position.copy(o.pos); tmp.lookAt(o.look);  // a camera, so -z faces the look point
      this.cam.position.lerp(o.pos, o.k);
      this.cam.quaternion.slerp(tmp.quaternion, o.k);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeA * Math.max(0, this.shakeT / 0.18);
      const t = performance.now() / 1000 * this.shakeF + this._seed;
      this.cam.position.x += (Math.sin(t * 1.7) + Math.sin(t * 3.1) * 0.5) * a * 0.07;
      this.cam.position.y += (Math.sin(t * 2.3) + Math.sin(t * 4.7) * 0.4) * a * 0.06;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    this.fovKick *= Math.exp(-dt * 9);
    const of = this.override && this.override.fov && this.override.k > 0.001 ? (this.override.fov - this.fov) * this.override.k : 0;
    this.cam.fov = this.fov + of - this.fovKick;
    this.cam.updateProjectionMatrix();
  }

  // mouse (0..1 screen) -> point on the floor, using the steady logic camera
  floorPoint(mx, my, out = new THREE.Vector3(), y = 0) {
    _ndc.set(mx * 2 - 1, -(my * 2 - 1));
    _ray.setFromCamera(_ndc, this.logic);
    _plane.constant = -y;
    if (!_ray.ray.intersectPlane(_plane, out)) out.copy(this.focus);
    return out;
  }

  // world -> screen 0..1 (for HUD bits that follow things)
  toScreen(p, out = new THREE.Vector2()) {
    _v.copy(p).project(this.cam);
    return out.set((_v.x + 1) / 2, (1 - _v.y) / 2);
  }
}
