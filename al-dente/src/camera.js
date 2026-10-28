// Third-person camera: lazy vertical follow, drag to orbit, eases behind you while you run,
// pulls in when a wall is in the way, hint zones, and an up-the-tube view inside the rigatoni.
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, angleDiff, smoothstep } from './util.js';

export class FollowCam {
  constructor(camera, colliders) {
    this.cam = camera; this.col = colliders;
    this.yaw = 0; this.pitch = 0.3; this.dist = 7.6; this.curDist = 7.6;
    this.target = new THREE.Vector3(); this.pos = new THREE.Vector3();
    this.tubeBlend = 0; this.tube = null; this.zones = [];
    this.basePitch = 0.3; this.baseDist = 7.6;
    this._v = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    this.shake = 0;
  }

  snap(hero) {
    this.target.set(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
    this.curDist = this.dist;
    this.place(1);
  }

  update(dt, hero, input, time) {
    const hp = hero.pos;
    // manual orbit
    if (input.dragDX || input.dragDY) {
      this.yaw -= input.dragDX * 0.0048;
      this.pitch = clamp(this.pitch + input.dragDY * 0.0036, -0.2, 1.2);
    }
    const ck = input.camKeys();
    if (ck) { this.yaw += ck * 2.4 * dt; input.lastManual = time; }
    const manualRecent = time - input.lastManual < 1.4;

    // tube interior?
    let inTube = false;
    if (this.tube) {
      const t = this.tube, rho = Math.hypot(hp.x - t.x, hp.z - t.z);
      inTube = rho < t.r0 + 0.1 && hp.y > t.y0 + 0.2 && hp.y < t.y1 + 0.6 && !(rho > t.r0 - 0.9 && hp.y < t.y0 + 2.4 && this.inNotch(hp));
    }
    this.tubeBlend = damp(this.tubeBlend, inTube ? 1 : 0, 3.2, dt);

    // zone hints
    let wantYaw = null, wantPitch = this.basePitch, wantDist = this.baseDist, zoneRate = 0;
    for (const z of this.zones) {
      if (hp.x > z.x0 && hp.x < z.x1 && hp.z > z.z0 && hp.z < z.z1 && hp.y > z.y0 && hp.y < z.y1) { wantYaw = z.yaw; wantPitch = z.pitch; wantDist = z.dist; zoneRate = 2.5; }
    }
    const vx = hero.vel.x, vz = hero.vel.z, sp = Math.hypot(vx, vz);
    if (wantYaw !== null && !manualRecent) this.yaw = dampAngle(this.yaw, wantYaw, zoneRate, dt);
    else if (!manualRecent && sp > 1.2 && !hero.stuck && this.tubeBlend < 0.5) {
      const behind = Math.atan2(-vx, -vz);
      const d = angleDiff(this.yaw, behind);
      if (Math.abs(d) < 2.3) this.yaw += d * (1 - Math.exp(-0.95 * (sp / 7.4) * dt));
    }
    if (!manualRecent) this.pitch = damp(this.pitch, wantPitch, 0.9, dt);
    this.dist = damp(this.dist, wantDist, 2.0, dt);

    // look target: quick horizontally, lazy vertically while airborne
    const ty = hp.y + 0.9;
    this.target.x = damp(this.target.x, hp.x, 12, dt);
    this.target.z = damp(this.target.z, hp.z, 12, dt);
    const below = this.target.y - ty;
    const vRate = hero.grounded || hero.stuck ? 7 : below > 2.5 ? 9 : 2.6;
    this.target.y = damp(this.target.y, ty, vRate, dt);
    if (Math.abs(this.target.y - ty) > 5) this.target.y = ty + Math.sign(this.target.y - ty) * 5;
    this.place(dt);
  }

  inNotch(p) {
    const t = this.tube; if (!t.notch) return false;
    const th = Math.atan2(p.z - t.z, p.x - t.x);
    return Math.abs(angleDiff(t.notch.angle, th)) < t.notch.half + 0.15;
  }

  place(dt) {
    const c = this.cam, tg = this.target;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dx = Math.sin(this.yaw) * cp, dy = sp, dz = Math.cos(this.yaw) * cp;
    // pull in for walls
    const hit = this.col.raycast(tg.x, tg.y, tg.z, dx, dy, dz, this.dist + 0.4, this.tubeBlend > 0.01);
    const want = Math.max(1.4, Math.min(this.dist, hit - 0.45));
    this.curDist = want < this.curDist ? damp(this.curDist, want, 22, dt) : damp(this.curDist, want, 2.5, dt);
    const ox = tg.x + dx * this.curDist, oy = tg.y + dy * this.curDist, oz = tg.z + dz * this.curDist;
    let px = ox, py = oy, pz = oz;
    let lx = tg.x, ly = tg.y, lz = tg.z;
    this._up.set(0, 1, 0);
    if (this.tubeBlend > 0.001 && this.tube) {
      const t = this.tube, b = this.tubeBlend;
      const camY = clamp(tg.y - 6.2, t.y0 + 1.0, t.y1 - 2);
      px = lerp(ox, t.x, b); py = lerp(oy, camY, b); pz = lerp(oz, t.z, b);
      lx = lerp(tg.x, tg.x, b); ly = lerp(tg.y, tg.y + 2.6, b); lz = lerp(tg.z, tg.z, b);
      const vdx = lx - px, vdy = ly - py, vdz = lz - pz, vl = Math.hypot(vdx, vdy, vdz) || 1;
      const k = smoothstep(0.35, 0.8, vdy / vl) * b;
      this._up.set(-Math.sin(this.yaw) * k, 1 - k, -Math.cos(this.yaw) * k).normalize();
    }
    if (this.shake > 0) { const s = this.shake; py += (Math.random() - 0.5) * s; px += (Math.random() - 0.5) * s; this.shake = Math.max(0, this.shake - dt * 3); }
    c.position.set(px, py, pz);
    c.up.copy(this._up);
    c.lookAt(lx, ly, lz);
  }
}
