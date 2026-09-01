// Chase camera. The mouse always aims (Odyssey); on a rail the yaw eases onto the tangent
// so the arc's shape reads and the player still owns the look. FOV punches on the catch,
// trauma shakes it, and it never cuts.
import * as THREE from 'three';
import { CFG } from './config.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3(), _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class ChaseCamera {
  constructor(camera, ctx) {
    this.cam = camera; this.ctx = ctx;
    this.yaw = 0; this.pitch = -0.12;
    this.pos = new THREE.Vector3(0, 12, 8);
    this.look = new THREE.Vector3();
    this.trauma = 0; this.punch = 0; this.pull = 0;
    this.fov = CFG.camera.fov;
    this.shakeSeed = Math.random() * 100;
    this.orbit = null; // {centre, radius, height, speed} during the ending
  }

  addLook(dx, dy) {
    this.yaw -= dx * CFG.camera.sens; this.pitch -= dy * CFG.camera.sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, CFG.camera.pitchMin, CFG.camera.pitchMax);
  }

  aimDir(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp).normalize();
  }

  shake(t) { this.trauma = Math.min(1, this.trauma + t); }
  punchFov(deg) { this.punch = Math.max(this.punch, deg); this.pull = 1; }

  snapTo(yaw, pitch = -0.12) { this.yaw = yaw; this.pitch = pitch; this._settle = true; }

  update(dt, rider, snap, time) {
    const C = CFG.camera;
    if (snap) { this.addLook(snap.lookX, snap.lookY); if (Math.abs(snap.lookX) + Math.abs(snap.lookY) > 0.5) this.lookedAt = time; }

    if (this.orbit) {
      const o = this.orbit; o.angle = (o.angle || 0) + dt * o.speed;
      _v.set(o.centre.x + Math.cos(o.angle) * o.radius, o.centre.y + o.height, o.centre.z + Math.sin(o.angle) * o.radius);
      this.pos.lerp(_v, 1 - Math.exp(-2 * dt));
      this.look.lerp(o.centre, 1 - Math.exp(-3 * dt));
      this.cam.position.copy(this.pos); this.cam.lookAt(this.look);
      this.cam.fov = THREE.MathUtils.damp(this.cam.fov, o.fov || 58, 2, dt); this.cam.updateProjectionMatrix();
      return;
    }

    // on a rail, ease the yaw onto the tangent (the player can still steer it)
    if (rider.state === 'rail' && rider.rail) {
      rider.rail.tangentAt(rider.s, _f); if (rider.railV < 0) _f.negate();
      const ty = Math.atan2(-_f.x, -_f.z);
      let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      // the rail pulls the look onto the tangent only while the player is not aiming: a held
      // pre-aim before a call must still be the aim at the catch
      const aiming = (time - (this.lookedAt || -10)) < 1.2;
      const rate = aiming ? 0 : C.railFollow;
      this.yaw += d * (1 - Math.exp(-rate * dt));
      const tp = Math.asin(THREE.MathUtils.clamp(_f.y, -1, 1)) * 0.35 - 0.08;
      if (!aiming) this.pitch += (tp - this.pitch) * (1 - Math.exp(-1.6 * dt));
    }

    // target and desired position
    const target = _v.copy(rider.pos); target.y += 1.25;
    const back = C.back + this.pull * (C.dashPull - C.back) + Math.min(6, rider.speed * 0.06);
    this.pull = THREE.MathUtils.damp(this.pull, 0, 1.6, dt);
    const dir = this.aimDir(_f);
    const desired = _w.copy(target).addScaledVector(dir, -back);
    // over the shoulder: the rider sits left of centre so the road AHEAD is never hidden behind them
    _s.set(-dir.z, 0, dir.x).normalize();
    desired.addScaledVector(_s, C.shoulder);
    desired.y += C.up * 0.55;
    // keep out of buildings and above water
    const h = this.ctx.world.heightAt(desired.x, desired.z);
    if (h > -Infinity && desired.y < h + 0.9) desired.y = h + 0.9;
    if (desired.y < C.minY) desired.y = C.minY;
    const solid = this.ctx.world.solidAt(desired);
    if (solid) { desired.lerp(target, 0.55); }
    const rate = this._settle ? 60 : 1 / C.lag;
    this._settle = false;
    this.pos.x = THREE.MathUtils.damp(this.pos.x, desired.x, rate, dt);
    this.pos.y = THREE.MathUtils.damp(this.pos.y, desired.y, rate, dt);
    this.pos.z = THREE.MathUtils.damp(this.pos.z, desired.z, rate, dt);

    // look slightly ahead of the rider along the aim
    const lookAt = target.addScaledVector(dir, 3.5).addScaledVector(_s, C.shoulder * 0.75);
    this.look.lerp(lookAt, 1 - Math.exp(-14 * dt));

    // trauma
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const sh = this.trauma * this.trauma;
    const n = (k) => Math.sin(time * 37 * k + this.shakeSeed * k) * Math.cos(time * 23 * k + k);
    this.cam.position.copy(this.pos);
    this.cam.position.x += n(1) * sh * 0.35; this.cam.position.y += n(1.7) * sh * 0.3;
    this.cam.lookAt(this.look);
    this.cam.rotateZ(n(2.3) * sh * 0.03);

    // fov: base + speed + punch
    this.punch = THREE.MathUtils.damp(this.punch, 0, 1 / C.fov * 60 * (1 / CFG.dash.fovDecay) * 0.6, dt);
    const speedFov = Math.min(10, rider.speed * 0.16);
    const want = C.fov + speedFov + this.punch;
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, want, this.punch > 0.5 ? 18 : 6, dt);
    this.cam.updateProjectionMatrix();
  }
}
