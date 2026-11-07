// The arena camera: three-quarter, high, never rotates (so WASD is always the screen's directions).
// It frames YOU and the boss with more weight on you, pulls back as you separate, comes in for intimate
// sections, and keeps inside the arena. Shake and punch go on the rendered camera only: aiming always uses
// the steady "logic" camera, so shake never moves the aim.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _ndc = new THREE.Vector2();

export class ArenaCamera {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(30, aspect, 0.3, 400);      // rendered
    this.logic = new THREE.PerspectiveCamera(30, aspect, 0.3, 400);    // for aiming
    this.pitch = THREE.MathUtils.degToRad(52);
    this.dist = 21; this.distT = 21;
    // (Alex, 7 Nov: "its still a bit close most of the time": the nearest it comes is further out, and it fits wider)
    this.baseMin = 13.5; this.minDist = this.baseMin; this.maxDist = 27;
    this.closeK = 0;          // 0 normal, 1 intimate (bridge)
    this.focus = new THREE.Vector3(); this.focusV = new THREE.Vector3();
    this.bounds = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
    this.weight = 0.45;       // how far toward the boss the focus sits
    this.shakeT = 0; this.shakeA = 0; this.shakeF = 28; this.punch = 0; this.roll = 0;
    this.fov = 30; this.fovKick = 0;
    this.override = null;     // {pos, look, k} a brief framing (entrances, finishes) that never takes control
    this._seed = Math.random() * 100;
  }

  setAspect(a) { this.cam.aspect = this.logic.aspect = a; this.cam.updateProjectionMatrix(); this.logic.updateProjectionMatrix(); }

  // a fight starts (or ends) clean: no lean-in left over from the last finish (it stayed on into the next song: black
  // bars and a camera half-pointed at the last room), nothing a track set for itself
  reset() {
    this.override = null; this.closeK = 0; this.soloK = 0; this.weight = 0.45; this.minDist = this.baseMin;
    this.fovKick = 0; this.shakeA = 0; this.shakeT = 0; this.roomMaxZ = undefined; this.bossAirY = 0;
  }

  snap(player, boss) { this._target(player, boss, _v); this.focus.copy(_v); this.focusV.set(0, 0, 0); this.dist = this.distT; this.update(0, player, boss); }

  _target(player, boss, out) {
    const px = player.x, pz = player.z;
    const bx = boss ? boss.x : px, bz = boss ? boss.z : pz;
    out.set(px + (bx - px) * this.weight, 0, pz + (bz - pz) * this.weight);
    // keep the framed area inside the arena (a little slack so walls show)
    const b = this.bounds;
    out.x = THREE.MathUtils.clamp(out.x, b.minX + 4, b.maxX - 4);
    out.z = THREE.MathUtils.clamp(out.z, b.minZ + 1.0, b.maxZ - 0.5);
    // a room with no wall behind the camera: keep the bottom of the picture on its floor
    if (this.roomMaxZ !== undefined) out.z = Math.min(out.z, this.roomMaxZ - this._bottomReach());
    // fit: the nearest distance at which both fighters (feet and heads) sit inside safe margins
    // (the top of the screen is the boss bar, the bottom-left the hearts)
    this.distT = this._fit(out, px, pz, bx, bz) * (1 - 0.2 * this.closeK) * (1 - 0.22 * (this.soloK || 0));
    return out;
  }

  _fit(focus, px, pz, bx, bz) {
    const c = this._fitCam || (this._fitCam = new THREE.PerspectiveCamera());
    c.fov = this.fov; c.aspect = this.logic.aspect; c.near = 0.3; c.far = 400; c.updateProjectionMatrix();
    const pts = [[px, 0, pz], [px, 1.9, pz], [bx, 0, bz], [bx, 2.3 + (this.bossAirY || 0), bz]];
    const p = _v2;
    let d = this.minDist;
    for (; d < this.maxDist; d += 0.5) {
      const back = Math.cos(this.pitch) * d, up = Math.sin(this.pitch) * d;
      c.position.set(focus.x, up, focus.z + back); c.lookAt(focus.x, 0.4, focus.z); c.updateMatrixWorld();
      let ok = true;
      for (const q of pts) { p.set(q[0], q[1], q[2]).project(c); if (p.y > 0.64 || p.y < -0.76 || Math.abs(p.x) > 0.82) { ok = false; break; } }
      if (ok) break;
    }
    return d;
  }

  // how far toward the camera the bottom edge of the picture reaches on the floor, from the focus
  _bottomReach() {
    const a = this.pitch + THREE.MathUtils.degToRad(this.fov / 2), d = this.dist;
    return Math.cos(this.pitch) * d - Math.sin(this.pitch) * d / Math.tan(a) + 0.2;
  }

  shake(amount, time = 0.18) { this.shakeA = Math.max(this.shakeA, amount); this.shakeT = Math.max(this.shakeT, time); }
  kick(fovDegrees = 1.2) { this.fovKick = Math.min(4, this.fovKick + fovDegrees); }

  update(dt, player, boss) {
    this._target(player, boss, _v);
    // critically damped follow
    const w = 9.0, k = 1 - Math.exp(-w * dt);
    this.focus.lerp(_v, k);
    this.dist += (this.distT - this.dist) * (1 - Math.exp(-3.2 * dt));
    const back = Math.cos(this.pitch) * this.dist, up = Math.sin(this.pitch) * this.dist;
    this.logic.position.set(this.focus.x, this.focus.y + up, this.focus.z + back);
    this.logic.lookAt(this.focus.x, this.focus.y + 0.4, this.focus.z);
    this.logic.fov = this.fov; this.logic.updateProjectionMatrix();
    // rendered camera: logic + override blend + shake + fov kick
    this.cam.position.copy(this.logic.position);
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
      this.cam.position.x += (Math.sin(t * 1.7) + Math.sin(t * 3.1) * 0.5) * a * 0.12;
      this.cam.position.y += (Math.sin(t * 2.3) + Math.sin(t * 4.7) * 0.4) * a * 0.1;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    this.fovKick *= Math.exp(-dt * 9);
    this.cam.fov = this.fov - this.fovKick;
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
