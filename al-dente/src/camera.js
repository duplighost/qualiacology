// Third-person camera: lazy vertical follow, drag to orbit, eases behind you while you run,
// pulls in when a wall is in the way, hint zones, and inside the rigatoni a view straight down
// the tube from above you, with forward kept at the top of the screen.
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, angleDiff, smoothstep } from './util.js';

// Inside the tube the camera sits this far above you, high enough to frame the whole ring with you on it.
const TUBE_ABOVE = 5.4;

export class FollowCam {
  constructor(camera, colliders) {
    this.cam = camera; this.col = colliders;
    this.yaw = 0; this.pitch = 0.3; this.dist = 7.6; this.curDist = 7.6;
    this.target = new THREE.Vector3(); this.pos = new THREE.Vector3();
    this.tubeBlend = 0; this.tube = null; this.zones = [];
    this.tubeY = 0;
    this.basePitch = 0.3; this.baseDist = 7.6;
    this._v = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    this.shake = 0;
  }

  snap(hero) {
    this.target.set(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
    this.curDist = this.dist;
    this.tubeBlend = this.inside(hero.pos) ? 1 : 0;
    this.tubeY = hero.pos.y + TUBE_ABOVE;
    this.place(1);
  }

  // inside the rigatoni, past the notch you walk in through
  inside(hp) {
    const t = this.tube; if (!t) return false;
    const rho = Math.hypot(hp.x - t.x, hp.z - t.z);
    return rho < t.r0 + 0.1 && hp.y > t.y0 + 0.2 && hp.y < t.y1 + 0.6 && !(rho > t.r0 - 0.9 && hp.y < t.y0 + 2.4 && this.inNotch(hp));
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

    this.tubeBlend = damp(this.tubeBlend, this.inside(hp) ? 1 : 0, 3.2, dt);
    // in there the camera hangs on the tube's axis above you, following your height a touch lazily and never too close
    const wantY = hp.y + TUBE_ABOVE;
    this.tubeY = this.tubeBlend < 0.001 ? wantY : Math.max(damp(this.tubeY, wantY, 5, dt), hp.y + 3.4);

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
    const vRate = hero.grounded || hero.stuck ? 7 : below > 2.5 ? 9 : hero.vel.y > 12 ? 6 : 2.6;
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
    const hit = this.col.raycast(tg.x, tg.y, tg.z, dx, dy, dz, this.dist + 0.4);
    const want = Math.max(1.4, Math.min(this.dist, hit - 0.45));
    this.curDist = want < this.curDist ? damp(this.curDist, want, 22, dt) : damp(this.curDist, want, 2.5, dt);
    const ox = tg.x + dx * this.curDist, oy = tg.y + dy * this.curDist, oz = tg.z + dz * this.curDist;
    let px = ox, py = oy, pz = oz;
    let lx = tg.x, ly = tg.y, lz = tg.z;
    this._up.set(0, 1, 0);
    if (this.tubeBlend > 0.001 && this.tube) {
      // straight down the tube: the whole ring of its wall centred, you on it, the wall across, the rests below
      // (the rests above you turn see-through, in props.js, so they don't hide you)
      const t = this.tube, b = this.tubeBlend;
      px = lerp(ox, t.x, b); py = lerp(oy, this.tubeY, b); pz = lerp(oz, t.z, b);
      lx = lerp(tg.x, t.x, b); ly = lerp(tg.y, this.tubeY - 6, b); lz = lerp(tg.z, t.z, b);
      // looking down, the screen's top is the way you were facing, so forward stays forward
      const vdx = lx - px, vdy = ly - py, vdz = lz - pz, vl = Math.hypot(vdx, vdy, vdz) || 1;
      const k = smoothstep(0.35, 0.8, -vdy / vl) * b;
      this._up.set(-Math.sin(this.yaw) * k, 1 - k, -Math.cos(this.yaw) * k).normalize();
    }
    if (this.shake > 0) { const s = this.shake; py += (Math.random() - 0.5) * s; px += (Math.random() - 0.5) * s; this.shake = Math.max(0, this.shake - dt * 3); }
    c.position.set(px, py, pz);
    c.up.copy(this._up);
    c.lookAt(lx, ly, lz);
  }
}
