// The swift: the small black animal with a tail of light. It is the only warm light in
// the valley and the thing on the other end of every verb. Its body is the charge meter,
// it leans toward where a throw would stick, it looks back, it reaches, it gives up
// waiting, and it always catches you.
import * as THREE from 'three';
import { CFG } from './config.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// Rotate a velocity toward a direction by at most `rate*dt` radians, preserving magnitude
// (KICKMOON's exponential bend: the wronger the velocity, the harder it is corrected).
function bendToward(vel, dir, rate, dt) {
  const speed = vel.length(); if (speed < 1e-4) return;
  _a.copy(vel).normalize();
  const cosA = THREE.MathUtils.clamp(_a.dot(dir), -1, 1);
  const ang = Math.acos(cosA);
  if (ang < 1e-4) return;
  const step = Math.min(ang, rate * dt * (0.4 + ang));
  _b.crossVectors(_a, dir);
  if (_b.lengthSq() < 1e-8) return;
  _b.normalize();
  _q.setFromAxisAngle(_b, step);
  _a.applyQuaternion(_q);
  vel.copy(_a).multiplyScalar(speed);
}

export class Swift {
  constructor(scene, ctx) {
    this.scene = scene; this.ctx = ctx;
    this.state = 'hand';
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.charge = 0; this.charging = false; this.gather = 0; this.pendingThrow = null;
    this.flightTime = 0;
    this.perch = null;          // {point, normal, owner, kind, boss, collider, local}
    this.returnMode = 'along'; this.returnS = 0; this.eaten = 0; this.returnTime = 0;
    this.giveUpTimer = 0;
    this.chirpTimer = 0.6;
    this.lookBack = 0;          // 0..1 during flight: one look back at the rider
    this.reach = 0;             // perched: leans toward the rider when they can reach it
    this.heat = 0;              // brightness with the rider's speed
    this.flap = 0;
    this.shrug = 0;             // refusal animation
    this.divePhase = 0; this.diveFrom = new THREE.Vector3(); this.diveTo = new THREE.Vector3();
    this.leanTarget = new THREE.Vector3(); this.leanAmount = 0;
    this.facing = new THREE.Vector3(0, 0, -1);
    this.wingBeat = 0;
    this.lightPower = 1;

    // ---- mesh: a small black animal, amber eyes, a short glowing tail ----
    const g = new THREE.Group(); g.name = 'swift';
    const black = new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.55, metalness: 0.1 });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffb24a, toneMapped: false });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), black); body.scale.set(1, 0.72, 1.6); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8), black); head.position.set(0, 0.08, -0.3); g.add(head);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), amber); eyeL.position.set(-0.06, 0.1, -0.38); g.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.06; g.add(eyeR);
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.05, 0.62, 0.02, 0.25, 0.1, 0.0, -0.18], 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0d0d18, roughness: 0.6, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(wingGeo, wingMat); wingL.position.set(-0.05, 0.03, 0); wingL.scale.x = -1; g.add(wingL);
    const wingR = new THREE.Mesh(wingGeo, wingMat); wingR.position.set(0.05, 0.03, 0); g.add(wingR);
    // the tail: a tapered glowing cone behind it
    const tailGeo = new THREE.ConeGeometry(0.07, 0.9, 8, 1, true); tailGeo.rotateX(-Math.PI / 2); tailGeo.translate(0, 0, 0.6);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xffb24a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const tail = new THREE.Mesh(tailGeo, tailMat); g.add(tail);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb24a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(glow);
    this.light = new THREE.PointLight(0xffb24a, CFG.swift.lightIntensity, CFG.swift.lightDistance, 1.6); this.light.position.set(0, 0.15, 0); g.add(this.light);
    this.parts = { body, head, wingL, wingR, tail, tailMat, glow, eyeL, eyeR };
    this.group = g;
    scene.add(g);
  }

  // ---- input -----------------------------------------------------------------
  startCharge() { if (this.state !== 'hand' || this.pendingThrow) return false; this.charging = true; this.charge = 0; this.ctx.events.emit('charge', { t: this.ctx.time }); return true; }

  release(aim, riderVel, handPos) {
    if (!this.charging) return false;
    this.charging = false;
    const c = this.charge;
    this.pendingThrow = { aim: aim.clone(), riderVel: riderVel.clone(), charge: c, timer: CFG.throw.gather };
    this.ctx.events.emit('gather', { t: this.ctx.time, charge: c });
    return true;
  }

  refuseThrow() { this.shrug = 1; this.ctx.events.emit('throwRefused', { t: this.ctx.time }); }

  _launch(handPos) {
    const p = this.pendingThrow; this.pendingThrow = null;
    const speed = THREE.MathUtils.lerp(CFG.throw.vMin, CFG.throw.vMax, p.charge);
    this.vel.copy(p.aim).multiplyScalar(speed).addScaledVector(p.riderVel, CFG.throw.inherit);
    if (this.vel.length() > 60) this.vel.setLength(60);
    if (this.vel.length() < CFG.throw.minSpeedFloor) this.vel.copy(p.aim).multiplyScalar(CFG.throw.minSpeedFloor);
    this.pos.copy(handPos);
    this.state = 'flight'; this.flightTime = 0; this.lookBack = 0; this.perch = null; this.eaten = 0;
    const rail = this.ctx.rail;
    // throwing from a rail: the old road becomes memory and you are in the air, carrying its
    // speed, before the new road starts under your hand (a throw inherits your velocity)
    if (rail.live) this._retireRail();
    rail.begin(handPos);
    this.ctx.rider.thrown++;
    this.ctx.events.emit('throw', { t: this.ctx.time, charge: p.charge, speed: this.vel.length(), pos: this.pos.clone() });
  }

  call() {
    const ctx = this.ctx;
    if (this.state === 'perched') {
      const rider = ctx.rider;
      this.state = 'returning'; this.eaten = 0; this.returnTime = 0;
      // along the rail if the rail still exists and the rider is on it; else straight home
      if (ctx.rail.live && rider.state === 'rail' && rider.rail === ctx.rail) { this.returnMode = 'along'; this.returnS = ctx.rail.visEnd; }
      else { this.returnMode = 'straight'; }
      this.giveUpTimer = 0;
      rider.called++;
      if (this.perch && this.perch.boss && this.perch.boss.onCalled) this.perch.boss.onCalled(this);
      ctx.events.emit('call', { t: ctx.time, mode: this.returnMode, distance: this.pos.distanceTo(rider.pos), s: this.returnS });
      return true;
    }
    if (this.state === 'flight') {
      this.state = 'returning'; this.returnMode = 'straight'; this.eaten = 0; this.returnTime = 0; this.early = true;
      ctx.rail.finish(null); ctx.rail.fade = 1;
      ctx.rider.called++;
      ctx.events.emit('earlyCall', { t: ctx.time });
      return true;
    }
    if (this.state === 'hand' || this.pendingThrow || this.state === 'returning') { this.shrug = 1; ctx.events.emit('callRefused', { t: ctx.time }); return false; }
    return false;
  }

  // The swift gives up waiting and comes back on its own, slowly (LEAD's trust as behaviour).
  giveUp() {
    if (this.state !== 'perched') return;
    this.state = 'returning'; this.returnMode = 'straight'; this.slow = true; this.eaten = 0; this.returnTime = 0;
    this.ctx.events.emit('giveUp', { t: this.ctx.time });
  }

  // The rider fell in: dive after them, then carry them home.
  dive(from, to) {
    this.state = 'diving'; this.divePhase = 0; this.diveFrom.copy(from); this.diveTo.copy(to);
    this.charging = false; this.pendingThrow = null;
    if (this.ctx.rail.live) this._retireRail();
  }

  _retireRail() {
    const rail = this.ctx.rail, rider = this.ctx.rider;
    if (rail.live && rail.maxRidden > 2) this.ctx.embers.appendFromRail(rail, 0, Math.min(rail.maxRidden, rail.total), rail.perchOwner ? rail.perchOwner.tag : null);
    rail.vanish();
    if (rider.state === 'rail' && rider.rail === rail) rider.leaveRail(true);
  }

  // ---- per step ------------------------------------------------------------------
  update(dt, handPos, aimDir, riderVel) {
    const ctx = this.ctx, rail = ctx.rail, rider = ctx.rider, world = ctx.world;
    this.shrug = Math.max(0, this.shrug - dt * 3);
    this.heat = THREE.MathUtils.damp(this.heat, THREE.MathUtils.clamp((rider.speed - 8) / 36, 0, 1), 6, dt);

    if (this.charging) {
      this.charge = Math.min(1, this.charge + dt / CFG.throw.chargeTime);
    }
    if (this.pendingThrow) {
      this.pendingThrow.timer -= dt;
      this.pendingThrow.aim.copy(aimDir); this.pendingThrow.riderVel.copy(riderVel);
      if (this.pendingThrow.timer <= 0) this._launch(handPos);
    }

    switch (this.state) {
      case 'hand': {
        this.pos.copy(handPos);
        // lean toward where the current aim would stick (the affordance that replaces every toast)
        this._probeLean(handPos, aimDir, riderVel);
        this.facing.lerp(aimDir, 1 - Math.exp(-10 * dt)).normalize();
        break;
      }
      case 'flight': {
        this.flightTime += dt;
        this.vel.y -= CFG.throw.gravity * dt;
        bendToward(this.vel, aimDir, CFG.throw.bendRate, dt);
        _c.copy(this.pos).addScaledVector(this.vel, dt);
        // the roof you are standing on cannot catch your own throw in its first 0.12 s
        const hit = world.hitTest(this.pos, _c, ctx.colliders, this.flightTime < 0.12 ? rider.surfaceBuilding : null);
        if (hit) {
          this.pos.copy(hit.hit);
          rail.push(this.pos);
          this._perchAt(hit);
          break;
        }
        if (_c.y < world.waterY + CFG.throw.hangHeight) {
          _c.y = world.waterY + CFG.throw.hangHeight;
          this.pos.copy(_c); rail.push(this.pos);
          this._hang();
          break;
        }
        this.pos.copy(_c);
        rail.push(this.pos);
        this.facing.copy(this.vel).normalize();
        if (this.flightTime > 0.35 && this.flightTime < 0.75) this.lookBack = Math.sin((this.flightTime - 0.35) / 0.4 * Math.PI);
        if (this.flightTime >= CFG.throw.maxFlight || rail.points.length >= rail.maxPoints - 1) this._hang();
        break;
      }
      case 'perched': {
        // the perch may be on something that moves (a boss stance, the eel)
        if (this.perch && this.perch.boss && this.perch.boss.perchPoint) {
          this.perch.boss.perchPoint(this.perch, _c);
          if (_c.distanceToSquared(this.pos) > 0.0001) { this.pos.copy(_c); rail.moveEnd(this.pos); }
        }
        _d.subVectors(rider.pos, this.pos); _d.y += 1; _d.normalize();
        this.facing.lerp(_d, 1 - Math.exp(-6 * dt)).normalize();
        // reach: when the rider is on my rail and near the end, or moving fast toward me
        const near = rider.state === 'rail' && rider.rail === rail ? THREE.MathUtils.clamp(1 - (rail.visEnd - rider.s) / 25, 0, 1) : 0;
        this.reach = THREE.MathUtils.damp(this.reach, near, 5, dt);
        // give up waiting
        if (rider.state === 'ground' && rider.speed < 1.2) { this.giveUpTimer += dt; if (this.giveUpTimer > CFG.recall.giveUp) this.giveUp(); }
        else this.giveUpTimer = 0;
        break;
      }
      case 'returning': {
        this.returnTime += dt;
        const speed = this.slow ? CFG.recall.giveUpSpeed : (this.early ? CFG.recall.earlySpeed : Math.max(CFG.recall.alongSpeed, CFG.recall.alongMult * rider.speed));
        if (this.returnMode === 'along' && rail.live && rider.state === 'rail' && rider.rail === rail) {
          const prevS = this.returnS;
          this.returnS -= speed * dt;
          this.eaten += prevS - this.returnS;
          const target = rider.s + 0.6;
          if (this.returnS <= target + CFG.recall.catchRadius) { this._catch(handPos, true); break; }
          rail.pointAt(this.returnS, this.pos);
          rail.setFront(this.returnS);
          rail.tangentAt(this.returnS, this.facing).negate();
          // the last 0.3 s line up with the aim so the fling is pre-drawn on what you stare at
          const eta = (this.returnS - target) / speed;
          if (eta < CFG.recall.aimAlign) { _d.copy(handPos).addScaledVector(aimDir, -2).sub(this.pos).normalize(); this.facing.lerp(_d, 0.3); }
        } else {
          // straight home: KICKMOON's return law
          if (this.returnMode === 'along') { this.returnMode = 'straight'; }
          _d.subVectors(handPos, this.pos); const dist = _d.length();
          if (dist < 0.05) { this._catch(handPos, false); break; }
          _d.normalize();
          const want = this.slow ? CFG.recall.giveUpSpeed : THREE.MathUtils.clamp(speed, CFG.recall.straightFloor, CFG.recall.straightCap);
          if (this.vel.lengthSq() < 1) this.vel.copy(_d).multiplyScalar(want * 0.5);
          bendToward(this.vel, _d, CFG.recall.straightBend, dt);
          const cur = this.vel.length(); const next = THREE.MathUtils.damp(cur, want, 8, dt); this.vel.setLength(next);
          this.pos.addScaledVector(this.vel, dt);
          this.facing.copy(this.vel).normalize();
          if (rail.live) { rail.fade = Math.max(0, rail.fade - dt * 2.2); if (rail.fade <= 0) this._retireRail(); }
          if (dist < CFG.recall.catchRadius + cur * dt) { this._catch(handPos, false); break; }
          if (this.returnTime > 6) { this._catch(handPos, false); break; }
        }
        break;
      }
      case 'diving': {
        this.divePhase += dt / CFG.fail.dip;
        const k = THREE.MathUtils.clamp(this.divePhase, 0, 1);
        const e = k * k * (3 - 2 * k);
        this.pos.lerpVectors(this.diveFrom, this.diveTo, e);
        this.pos.y += Math.sin(k * Math.PI) * 6 - (1 - k) * 2;
        _d.subVectors(this.diveTo, this.diveFrom).normalize(); this.facing.lerp(_d, 0.2);
        if (this.divePhase >= 1) { this.state = 'hand'; this.pos.copy(handPos); }
        break;
      }
      case 'ending': {
        break;
      }
    }

    // chirps: the only spatial voice
    this.chirpTimer -= dt;
    if (this.chirpTimer <= 0 && this.state !== 'hand' && this.state !== 'ending') {
      const dist = this.pos.distanceTo(rider.pos);
      const every = this.state === 'returning' ? 0.22 : THREE.MathUtils.clamp(0.35 + dist / 60, 0.35, 1.6);
      this.chirpTimer = every;
      const hz = this.state === 'perched' ? CFG.swift.hzPerched : this.state === 'returning' ? CFG.swift.hzReturning + THREE.MathUtils.clamp(this.vel.length() + (this.returnMode === 'along' ? 40 : 0), 0, 120) * 4 : CFG.swift.hzFlight;
      ctx.audio && ctx.audio.chirp(this.pos, hz, this.state);
    }
    if (!Number.isFinite(this.pos.x) || !Number.isFinite(this.pos.y) || !Number.isFinite(this.pos.z)) { this.pos.copy(handPos); this.vel.set(0, 0, 0); this.state = 'hand'; }
    this._pose(dt, aimDir);
  }

  _perchAt(hit) {
    this.state = 'perched'; this.vel.set(0, 0, 0); this.giveUpTimer = 0; this.reach = 0; this.slow = false; this.early = false;
    const boss = hit.kind === 'boss' ? hit.object : null;
    this.perch = { point: this.pos.clone(), normal: hit.normal ? hit.normal.clone() : null, owner: hit.object, kind: hit.kind, boss, collider: hit.collider, local: null };
    if (boss && boss.registerPerch) boss.registerPerch(this.perch);
    this.ctx.rail.finish(boss ? { tag: boss.tag, boss } : null);
    this.ctx.events.emit('stick', { t: this.ctx.time, pos: this.pos.clone(), kind: hit.kind, length: this.ctx.rail.total });
  }

  _hang() {
    this.state = 'perched'; this.vel.set(0, 0, 0); this.giveUpTimer = 0; this.reach = 0; this.slow = false; this.early = false;
    this.perch = { point: this.pos.clone(), normal: null, owner: null, kind: 'air', boss: null };
    this.ctx.rail.finish(null);
    this.ctx.events.emit('hang', { t: this.ctx.time, pos: this.pos.clone(), length: this.ctx.rail.total });
  }

  _catch(handPos, along) {
    const ctx = this.ctx, rider = ctx.rider, rail = ctx.rail;
    const speed = rider.speed;
    const eaten = along ? this.eaten : Math.max(0, rail.total - rail.maxRidden);
    this.state = 'hand'; this.pos.copy(handPos); this.vel.set(0, 0, 0); this.slow = false; this.early = false;
    this._retireRail();
    if (speed > CFG.dash.minSpeed && !this.slowCatch) {
      const fling = THREE.MathUtils.clamp(CFG.dash.mult * speed + CFG.dash.eatenBonus * eaten, CFG.dash.min, CFG.dash.max);
      rider.onCatch({ dash: true, speed: fling, eaten });
      ctx.events.emit('catchDash', { t: ctx.time, speed: fling, eaten, riderSpeed: speed });
    } else {
      rider.onCatch({ dash: false });
      ctx.events.emit('catchSoft', { t: ctx.time, riderSpeed: speed });
    }
    this.perch = null;
  }

  // Where would a throw at the current aim stick? Cheap probe: integrate 40 coarse steps.
  _probeLean(handPos, aim, riderVel) {
    const speed = THREE.MathUtils.lerp(CFG.throw.vMin, CFG.throw.vMax, this.charging ? this.charge : 0.4);
    _a.copy(aim).multiplyScalar(speed).addScaledVector(riderVel, CFG.throw.inherit);
    _b.copy(handPos);
    const step = 0.08; let found = null;
    for (let i = 0; i < 32; i++) {
      _a.y -= CFG.throw.gravity * step;
      _c.copy(_b).addScaledVector(_a, step);
      const hit = this.ctx.world.hitTest(_b, _c, this.ctx.colliders);
      if (hit) { found = hit.hit; break; }
      if (_c.y < this.ctx.world.waterY + CFG.throw.hangHeight) { found = _c.clone(); found.y = this.ctx.world.waterY + CFG.throw.hangHeight; break; }
      _b.copy(_c);
    }
    if (found) { this.leanTarget.copy(found); this.leanAmount = THREE.MathUtils.damp(this.leanAmount, 1, 8, 1 / 60); }
    else { this.leanTarget.copy(_b); this.leanAmount = THREE.MathUtils.damp(this.leanAmount, 0.3, 8, 1 / 60); }
    this.leanKind = found && this.ctx.world.solidAt(found) ? 'solid' : 'air';
  }

  _pose(dt, aimDir) {
    const g = this.group, P = this.parts, ctx = this.ctx;
    g.position.copy(this.pos);
    // orientation from facing
    _d.copy(this.facing); if (_d.lengthSq() < 1e-6) _d.set(0, 0, -1);
    _m.lookAt(_a.set(0, 0, 0), _d.clone().negate(), UP);
    _q.setFromRotationMatrix(_m);
    g.quaternion.slerp(_q, 1 - Math.exp(-14 * dt));

    const flying = this.state === 'flight' || this.state === 'returning' || this.state === 'diving';
    this.wingBeat += dt * (flying ? 34 : (this.charging ? 26 : 5));
    const beat = Math.sin(this.wingBeat);
    const spread = flying ? 1 : (this.charging ? 0.55 + 0.45 * this.charge : 0.25);
    P.wingL.rotation.z = (0.35 + beat * 0.7 * spread) * -1; P.wingR.rotation.z = 0.35 + beat * 0.7 * spread;
    P.wingL.rotation.x = P.wingR.rotation.x = flying ? -0.2 : 0.4;
    // charge: crouch and brighten; the body IS the meter
    const c = this.charging ? this.charge : (this.pendingThrow ? 1 : 0);
    const gatherK = this.pendingThrow ? 1 - this.pendingThrow.timer / CFG.throw.gather : 0;
    P.body.scale.set(1 + c * 0.25, 0.72 - c * 0.22, 1.55 + c * 0.35 + gatherK * 0.5);
    P.body.position.z = -gatherK * 0.25;
    const glow = 0.5 + c * 1.6 + this.heat * 0.9 + (this.state === 'returning' ? 0.8 : 0) + this.reach * 0.5;
    this.light.intensity = CFG.swift.lightIntensity * (0.55 + 0.45 * Math.min(1.8, glow)) * (this.state === 'hand' ? 1 : 1.15);
    this.lightPower = this.light.intensity / CFG.swift.lightIntensity;
    P.glow.material.opacity = 0.04 + 0.05 * glow;
    P.glow.scale.setScalar(1 + c * 0.6 + this.heat * 0.5);
    P.tailMat.opacity = 0.55 + 0.45 * Math.min(1, glow * 0.5);
    P.tail.scale.set(1 + this.heat * 0.6, 1 + this.heat * 0.6, 0.6 + this.heat * 1.6 + (flying ? 1.4 : 0) + c * 0.4);
    // look back in flight; reach when perched; shrug on refusal; tail flick rate = distance
    const headYaw = this.lookBack * 2.6 + this.shrug * Math.sin(ctx.time * 30) * 0.4;
    P.head.rotation.y = headYaw; P.eyeL.rotation.y = P.eyeR.rotation.y = headYaw;
    const dist = this.pos.distanceTo(ctx.rider.pos);
    const flick = this.state === 'perched' ? Math.sin(ctx.time * (2 + 60 / Math.max(6, dist)) * 2) * 0.35 : 0;
    P.tail.rotation.x = flick * 0.6 + this.reach * 0.7;
    g.position.y += this.state === 'perched' ? Math.sin(ctx.time * 2.2) * 0.04 + this.reach * -0.12 : 0;
    if (this.state === 'perched' && this.reach > 0.05) g.position.addScaledVector(this.facing, this.reach * 0.35);
    // in hand, lean toward the stick point
    if (this.state === 'hand') {
      _d.subVectors(this.leanTarget, this.pos).normalize();
      g.position.addScaledVector(_d, 0.12 * this.leanAmount + c * 0.1);
    }
  }
}
