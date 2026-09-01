// The rider: a skater who is a dark silhouette until the swift lights them. States:
// ground (a roof), air, rail, and the fall. The catch dash is the only fast thing they
// can do without a rail, and it arrives over 0.18 s so you can watch it.
import * as THREE from 'three';
import { CFG } from './config.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

export class Rider {
  constructor(scene, ctx) {
    this.scene = scene; this.ctx = ctx;
    this.pos = new THREE.Vector3(0, 8.4, 0); this.vel = new THREE.Vector3();
    this.yaw = 0; this.state = 'ground'; this.rail = null; this.s = 0; this.railV = 0;
    this.regrabLock = 0; this.coyote = 0; this.airTime = 0; this.groundTime = 0;
    this.lastSafe = { pos: this.pos.clone(), yaw: 0 };
    this.dashTimer = 0; this.dashRise = 0; this.dashFrom = new THREE.Vector3(); this.dashTo = new THREE.Vector3(); this.halfGrav = 0; this.dashEnergy = 0;
    this.freeze = 0; this.respawnTimer = 0; this.falls = 0; this.thrown = 0; this.called = 0;
    this.lean = 0; this.tuck = 0; this.drag = 0; this.crouch = 0; this.flinch = 0; this.chain = 0; this.chainTimer = 0;
    this.latchBlend = 0; this.latchFrom = new THREE.Vector3();
    this.surface = null; this._surf = {}; this.surfaceBuilding = null; this.knock = 0; this.frozenPose = false;
    this.facing = new THREE.Vector3(0, 0, -1);
    this.sparkTimer = 0;
    this.metresRidden = 0;

    // ---- mesh: three value tiers. LIGHT mass, BLACK breaks, reserved amber trim. ----
    const g = new THREE.Group(); g.name = 'rider';
    const light = new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.7, metalness: 0.0 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.5, metalness: 0.1 });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffb24a, toneMapped: false });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), light); torso.position.y = 1.05; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), light); head.position.y = 1.52; g.add(head);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), black); hood.position.y = 1.53; g.add(hood);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10), black); belt.position.y = 0.82; g.add(belt);
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 3, 8), light); legL.position.set(-0.12, 0.46, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.12; g.add(legR);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.3), black); bootL.position.set(-0.12, 0.12, 0.02); g.add(bootL);
    const bootR = bootL.clone(); bootR.position.x = 0.12; g.add(bootR);
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 3, 8), light); armL.position.set(-0.3, 1.1, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.3; g.add(armR);
    const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), black); gloveL.position.set(-0.3, 0.8, 0); g.add(gloveL);
    const gloveR = gloveL.clone(); gloveR.position.x = 0.3; g.add(gloveR);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 1.05), black); board.position.y = 0.05; g.add(board);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.9), amber); trim.position.y = 0.02; g.add(trim);
    const truckF = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), black); truckF.position.set(0, 0.03, -0.32); g.add(truckF);
    const truckB = truckF.clone(); truckB.position.z = 0.32; g.add(truckB);
    // a dim cool fill so the silhouette always reads; the swift's warm light dominates when it is near
    const fill = new THREE.PointLight(0x9fb4ff, 5, 7, 1.4); fill.position.set(0, 1.9, 0.6); g.add(fill);
    this.parts = { torso, head, hood, belt, legL, legR, bootL, bootR, armL, armR, gloveL, gloveR, board, trim, truckF, truckB, fill };
    this.group = g; scene.add(g);
    this.handPos = new THREE.Vector3();
  }

  get speed() { return this.state === 'rail' ? Math.abs(this.railV) : this.vel.length(); }
  get airborne() { return this.state === 'air'; }

  // World-space hand: right hand, in front, at hand height.
  hand(out = this.handPos) {
    _t.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); // forward = -z at yaw 0 -> use (sin, 0, -cos)
    _t.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _r.crossVectors(_t, UP);
    return out.copy(this.pos).addScaledVector(_r, 0.42).addScaledVector(_t, 0.3).add(_v.set(0, CFG.rider.handHeight - this.crouch * 0.35, 0));
  }

  // ---- state changes ---------------------------------------------------------------------
  latchTo(rail, s, entryVel) {
    this.rail = rail; this.s = s; this.state = 'rail';
    rail.tangentAt(s, _t);
    const along = entryVel.dot(_t);
    // the floor is a reward and it ARRIVES: speed rises from the entry to the floor over latchRise
    this.railEntry = Math.max(6, along); this.railV = this.railEntry; this.railRise = CFG.rail.latchRise;
    this.latchBlend = CFG.rail.latchBlend; this.latchFrom.copy(this.pos);
    this.coyote = 0; this.airTime = 0;
    this.ctx.events.emit('latch', { t: this.ctx.time, s, speed: this.railV, entry: along });
  }

  // Turn the facing toward dir exponentially (rate) but never faster than maxRate rad/s: no
  // assist closes an angle in one tick (that IS a snap). A 60 deg entry at 6.5 rad/s takes 0.16 s.
  _turnToward(dir, rate, maxRate, dt) {
    const ang = Math.acos(THREE.MathUtils.clamp(this.facing.dot(dir), -1, 1));
    if (ang < 1e-4) return;
    const step = Math.min(ang * (1 - Math.exp(-rate * dt)), maxRate * dt);
    this.facing.lerp(dir, step / ang).normalize();
  }

  leaveRail(silent = false) {
    if (this.state !== 'rail') return;
    const rail = this.rail;
    rail.tangentAt(this.s, _t);
    this.vel.copy(_t).multiplyScalar(this.railV);
    this.state = 'air'; this.rail = null; this.airTime = 0;
    this.regrabLock = CFG.rail.regrabLock;
    if (!silent) this.ctx.events.emit('unlatch', { t: this.ctx.time, speed: this.railV });
  }

  pop() {
    if (this.state !== 'rail') return false;
    this.leaveRail(true); this.vel.y += CFG.rail.popV;
    this.ctx.events.emit('pop', { t: this.ctx.time, speed: this.vel.length() });
    return true;
  }

  jump() {
    if (this.state === 'ground' || (this.state === 'air' && this.coyote > 0)) {
      this.vel.y = CFG.rider.jumpV; this.state = 'air'; this.coyote = 0; this.airTime = 0;
      return true;
    }
    return false;
  }

  onCatch({ dash, speed = 0, eaten = 0 }) {
    this.chain++; this.chainTimer = 0;
    if (!dash) { return; }
    const aim = this.ctx.camera.aimDir(_v);
    if (this.state === 'rail') this.leaveRail(true);
    this.state = 'air'; this.airTime = 0; this.regrabLock = 0.25;
    this.dashFrom.copy(this.vel);
    this.dashTo.copy(aim).multiplyScalar(speed);
    this.dashRise = CFG.dash.rise; this.dashTimer = CFG.dash.duration; this.halfGrav = CFG.dash.halfGravity; this.dashEnergy = 1;
    this.facing.copy(aim);
  }

  fall() {
    if (this.state === 'fallen') return;
    this.falls++;
    this.state = 'fallen'; this.freeze = CFG.fail.freeze; this.respawnTimer = CFG.fail.dip + 0.25;
    this.chain = 0; this.dashTimer = 0; this.dashRise = 0; this.dashEnergy = 0;
    if (this.rail) { this.rail = null; }
    this.ctx.events.emit('fall', { t: this.ctx.time, pos: this.pos.clone() });
  }

  respawn(at = null) {
    let p = at || this.lastSafe.pos;
    if (!Number.isFinite(p.x + p.y + p.z)) { p = this.ctx.spawn || new THREE.Vector3(0, 8.4, 0); this.lastSafe.pos.copy(p); }
    this.pos.copy(p); this.pos.y += 0.05; this.vel.set(0, 0, 0); this.yaw = at ? this.yaw : this.lastSafe.yaw;
    this.state = 'ground'; this.rail = null; this.railV = 0; this.regrabLock = 0.3;
    this.ctx.events.emit('respawn', { t: this.ctx.time, pos: this.pos.clone() });
  }

  knockOff(dir, power = 8) {
    if (this.state === 'rail') this.leaveRail(true);
    if (this.state === 'fallen') return;
    this.state = 'air'; this.vel.addScaledVector(dir, power); this.vel.y = Math.max(this.vel.y, 4); this.regrabLock = 0.6; this.knock = 1;
  }

  // ---- per step ---------------------------------------------------------------------------
  update(dt, snap, camYaw) {
    const ctx = this.ctx, world = ctx.world, C = CFG.rider;
    this.regrabLock = Math.max(0, this.regrabLock - dt);
    this.knock = Math.max(0, this.knock - dt * 2);
    this.flinch = Math.max(0, this.flinch - dt * 4);
    this.chainTimer += dt;
    if (this.state === 'fallen') { this.respawnTimer -= dt; return; }

    // camera-relative wish direction
    const fwd = _t.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = _r.crossVectors(fwd, UP);
    const wish = _w.set(0, 0, 0).addScaledVector(fwd, snap.forward).addScaledVector(right, snap.strafe);
    if (wish.lengthSq() > 1) wish.normalize();

    // dash rise: the speed arrives over CFG.dash.rise
    if (this.dashRise > 0) {
      this.dashRise -= dt;
      const k = 1 - Math.max(0, this.dashRise) / CFG.dash.rise;
      const e = k * k * (3 - 2 * k);
      this.vel.lerpVectors(this.dashFrom, this.dashTo, e);
      this.state = 'air';
    }
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.halfGrav = Math.max(0, this.halfGrav - dt);
    this.dashEnergy = THREE.MathUtils.damp(this.dashEnergy, this.dashTimer > 0 ? 1 : 0, 2.2, dt);

    if (this.state === 'rail') this._updateRail(dt, snap, wish);
    else this._updateFree(dt, snap, wish);

    // latch test: skate onto a live rail
    if (this.state !== 'rail' && this.regrabLock <= 0) this._tryLatch();

    // water
    if (this.state !== 'rail' && this.pos.y < world.waterY + CFG.fail.waterDepth) { this.fall(); return; }

    // yaw from motion
    if (this.state === 'rail') { this.rail.tangentAt(this.s, _v); if (this.railV < 0) _v.negate(); this._turnToward(_v, 12, CFG.rail.maxTurnRate, dt); }
    else if (this.vel.x * this.vel.x + this.vel.z * this.vel.z > 0.3) { _v.copy(this.vel); _v.y = 0; _v.normalize(); this.facing.lerp(_v, 1 - Math.exp(-(this.state === 'air' ? 4 : 10) * dt)); }
    else if (this.state === 'ground' && wish.lengthSq() < 0.01) { _v.copy(fwd); this.facing.lerp(_v, 1 - Math.exp(-3 * dt)); }
    if (this.facing.lengthSq() > 1e-6) { this.facing.normalize(); this.yaw = Math.atan2(-this.facing.x, -this.facing.z); }

    this._pose(dt, snap, wish);
  }

  _updateFree(dt, snap, wish) {
    const world = this.ctx.world, C = CFG.rider;
    const h = world.heightAt(this.pos.x, this.pos.z);
    const onSurface = h > -Infinity && this.pos.y <= h + C.stepUp && this.vel.y <= 0.5 && this.pos.y >= h - 1.2;

    if (this.state === 'ground') {
      if (!onSurface) { this.state = 'air'; this.coyote = C.coyote; this.airTime = 0; }
    }
    if (this.state === 'air' && onSurface && this.vel.y <= 0.5) {
      // land (a dash that meets a roof lands too; the rise is cut short)
      this.state = 'ground'; this.pos.y = h; this.vel.y = 0; this.airTime = 0; this.dashRise = 0; this.halfGrav = 0;
      this.chain = 0;
      if (this.dashTimer > 0) this.dashTimer = 0;
      this.ctx.events.emit('grindStop', { t: this.ctx.time, landing: true });
    }

    if (this.state === 'ground') {
      this.groundTime += dt;
      this.pos.y = h;
      world.heightAt(this.pos.x, this.pos.z, this._surf); this.surfaceBuilding = this._surf.building;
      // skate: accelerate toward wish, friction otherwise
      if (wish.lengthSq() > 0.01) {
        _v.copy(wish).multiplyScalar(C.walkSpeed);
        this.vel.x = THREE.MathUtils.damp(this.vel.x, _v.x, C.walkAccel / C.walkSpeed, dt);
        this.vel.z = THREE.MathUtils.damp(this.vel.z, _v.z, C.walkAccel / C.walkSpeed, dt);
      } else {
        const f = Math.max(0, 1 - C.friction * dt);
        this.vel.x *= f; this.vel.z *= f;
      }
      if (snap.jumpPressed) this.jump();
      if (this.groundTime > 0.3 && this.pos.y > world.waterY + 1.5 && Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) { this.lastSafe.pos.copy(this.pos); this.lastSafe.yaw = this.yaw; }
    } else {
      this.groundTime = 0; this.airTime += dt;
      this.coyote = Math.max(0, this.coyote - dt);
      if (snap.jumpPressed && this.coyote > 0) this.jump();
      const g = CFG.world.gravity * (this.halfGrav > 0 ? 0.5 : 1);
      if (this.dashRise <= 0) this.vel.y -= g * dt;
      // a little air control, never enough to fix a bad throw
      if (wish.lengthSq() > 0.01 && this.dashRise <= 0) { this.vel.x += wish.x * C.airControl * dt; this.vel.z += wish.z * C.airControl * dt; }
      const d = Math.max(0, 1 - C.airDrag * dt);
      this.vel.x *= d; this.vel.z *= d;
    }
    this.pos.addScaledVector(this.vel, dt);
    // walls
    const hit = world.resolveWalls(this.pos, C.radius, C.stepUp);
    if (hit) { const nv = _v.copy(this.vel); nv.y = 0; if (nv.lengthSq() > 4) { this.vel.x *= 0.2; this.vel.z *= 0.2; } }
    // never below a surface we are over
    const h2 = world.heightAt(this.pos.x, this.pos.z);
    // a parapet's worth of rescue, never a rail that ended a metre under the edge (that would teach nothing)
    if (h2 > -Infinity && this.pos.y < h2 && this.pos.y > h2 - C.stepUp && this.state !== 'rail') { this.pos.y = h2; if (this.vel.y < 0) this.vel.y = 0; if (this.state === 'air' && this.vel.y <= 0.5) { this.state = 'ground'; this.chain = 0; this.dashRise = 0; this.halfGrav = 0; } }
  }

  _updateRail(dt, snap, wish) {
    const rail = this.rail, R = CFG.rail;
    if (!rail || !rail.live) { this.leaveRail(true); return; }
    rail.tangentAt(this.s, _t);
    // gravity along the tangent: down pays 1.4x, up costs 0.7x
    const slope = -_t.y; // positive when going down
    const a = R.gRail * slope * (slope > 0 ? R.downMult : R.upMult);
    this.railV += a * dt;
    // W tuck, S drag
    this.tuck = THREE.MathUtils.damp(this.tuck, snap.forward > 0 ? 1 : 0, 8, dt);
    this.drag = THREE.MathUtils.damp(this.drag, snap.forward < 0 ? 1 : 0, 8, dt);
    if (snap.forward > 0) this.railV += R.tuckAccel * dt * (slope > -0.2 ? 1 : 0.3);
    if (snap.forward < 0) this.railV = Math.max(8, this.railV - R.dragDecel * dt);
    this.lean = THREE.MathUtils.damp(this.lean, snap.strafe, 6, dt);
    if (this.railRise > 0) {
      this.railRise -= dt;
      const k = 1 - Math.max(0, this.railRise) / R.latchRise, e = k * k * (3 - 2 * k);
      const want = THREE.MathUtils.lerp(this.railEntry, R.floor, e);
      if (this.railV < want) this.railV = want;
    }
    this.railV = Math.min(R.cap, Math.max(6, this.railV));
    this.s += this.railV * dt;
    this.metresRidden += this.railV * dt;
    if (this.s > rail.maxRidden) rail.maxRidden = this.s;
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) { this.sparkTimer = 0.05; this.ctx.fx.emit(this.pos, { n: 2 + (this.drag > 0.5 ? 6 : 0), color: 0xffc070, speed: 2 + this.railV * 0.12 + this.drag * 6, life: 0.35, size: 0.07, grav: 6, dir: _v.copy(_t).negate(), spread: 0.8, jitter: 0.1 }); }
    if (snap.jumpPressed) { this.pop(); return; }
    if (this.s >= rail.visEnd - 0.05) {
      // the road ends in the air
      this.s = rail.visEnd; rail.pointAt(this.s, this.pos); this.pos.y += 0.05;
      this.leaveRail();
      return;
    }
    if (this.s < rail.visStart) { this.s = rail.visStart; this.leaveRail(); return; }
    rail.pointAt(this.s, _v); _v.y += 0.05;
    if (this.latchBlend > 0) {
      this.latchBlend -= dt;
      const k = 1 - Math.max(0, this.latchBlend) / R.latchBlend;
      this.pos.lerpVectors(this.latchFrom, _v, k * k * (3 - 2 * k));
    } else this.pos.copy(_v);
    // the velocity is the rail's
    this.vel.copy(_t).multiplyScalar(this.railV);
  }

  _tryLatch() {
    const rail = this.ctx.rail;
    const candidates = [rail, ...(this.ctx.livingRails || [])];
    for (const r of candidates) {
      if (!r || !r.live || r.points.length < 3) continue;
      _v.copy(this.pos); _v.y += 0.6;
      const c = r.closest(_v);
      if (c.dist > CFG.rail.magnet) continue;
      const moving = this.vel.x * this.vel.x + this.vel.z * this.vel.z > 4 || this.state === 'air';
      if (r === rail && c.s < CFG.rail.unlatchableStart && !moving) continue;
      if (r === rail && this.ctx.swift.state === 'flight' && c.s < 1) continue;
      // must be roughly heading along the rail, or falling onto it
      r.tangentAt(c.s, _t);
      const along = this.vel.dot(_t);
      if (along < -6 && this.state !== 'air') continue;
      this.latchTo(r, c.s, this.vel);
      return;
    }
  }

  _pose(dt, snap, wish) {
    const g = this.group, P = this.parts;
    g.position.copy(this.pos);
    _m.lookAt(_v.set(0, 0, 0), _w.copy(this.facing).negate(), UP);
    _q.setFromRotationMatrix(_m);
    g.quaternion.slerp(_q, 1 - Math.exp(-14 * dt));
    // lean/bank on rails and in the dash
    const bank = this.state === 'rail' ? -this.lean * 0.35 : 0;
    g.rotateZ(bank);
    this.crouch = THREE.MathUtils.damp(this.crouch, (this.ctx.swift.charging ? 0.5 + this.ctx.swift.charge * 0.5 : 0) + this.tuck * 0.6 + (this.state === 'air' ? 0.15 : 0), 10, dt);
    const c = this.crouch;
    // the refusal's knock: the whole body takes it. A chase camera sees an arm pitch end-on
    // (measured 0.75% of the rider's pixels); a body dip and an inward sweep read (4.9%).
    const dip = this.flinch * 0.2;
    P.torso.position.y = 1.05 - c * 0.28 - dip; P.torso.rotation.x = c * 0.35 + (this.state === 'air' ? -0.1 : 0) + this.flinch * 0.4;
    P.head.position.y = 1.52 - c * 0.3 - dip; P.hood.position.y = 1.53 - c * 0.3 - dip;
    P.legL.scale.y = P.legR.scale.y = 1 - c * 0.45; P.legL.position.y = P.legR.position.y = 0.46 * (1 - c * 0.45) + 0.02;
    P.belt.position.y = 0.82 - c * 0.3;
    // arms: throwing arm forward while charging, out in the air, hanging otherwise
    const air = this.state === 'air' ? 1 : 0;
    P.armR.rotation.x = -1.4 * (this.ctx.swift.charging ? 1 : 0.35) - air * 0.5 + this.flinch * 0.3;
    P.armR.rotation.z = -0.3 - air * 0.9 - this.flinch * 1.5; // INWARD, across the body: the sweep the camera can see
    P.armL.rotation.x = -0.2 - air * 0.4; P.armL.rotation.z = 0.3 + air * 0.9 + this.lean * 0.4;
    P.gloveR.position.set(0.3 + Math.sin(P.armR.rotation.x) * 0.0, 0.8 + (this.ctx.swift.charging ? 0.35 : 0.05), -0.05 - (this.ctx.swift.charging ? 0.25 : 0));
    // drag foot
    P.bootL.position.y = 0.12 - this.drag * 0.09; P.bootL.position.z = 0.02 + this.drag * 0.3;
    // board tilt with lean
    P.board.rotation.z = P.trim.rotation.z = -this.lean * 0.25;
    // knock stagger
    if (this.knock > 0) g.rotateX(Math.sin(this.ctx.time * 40) * this.knock * 0.2);
    g.visible = this.state !== 'fallen' || this.respawnTimer > CFG.fail.dip * 0.6;
  }
}
