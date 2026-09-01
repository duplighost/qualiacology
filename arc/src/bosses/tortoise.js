// THE TORTOISE — chapter I. Island-sized, standing in the bay. Three violet lanterns on
// its shell at 30 / 50 / 70 m; one faces away from your approach so you throw the road
// the long way round. Every step sends a ring wave across the water that knocks you off
// anything under 4 m: ride high. While the swift is away it steps more often.
import * as THREE from 'three';
import { Boss, VIOLET } from './base.js';
import { CFG } from '../config.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const SHELL_R = 48, SHELL_Y = 32;

export class Tortoise extends Boss {
  constructor(ctx, { x, z }) {
    super(ctx, { tag: 'tortoise', x, z });
    const g = this.group;
    // the body is a DARK animal: a faint indigo glow, never the lanterns' violet
    // the glow is most of what you see of it, so losing the glow is most of what you see change
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x1c2148, roughness: 0.82, metalness: 0.05, emissive: 0x2b2160, emissiveIntensity: 0.95 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x181d40, roughness: 0.9, emissive: 0x241a50, emissiveIntensity: 0.5 });
    this.bodyMats = [shellMat, skinMat];
    // the shell: a sphere sunk to its equator, ridged with plates
    const shell = new THREE.Mesh(new THREE.SphereGeometry(SHELL_R, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), shellMat); shell.position.y = SHELL_Y; g.add(shell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(44, 5, 10, 40), skinMat); rim.rotation.x = Math.PI / 2; rim.position.y = 16; g.add(rim);
    // plates: darker bosses on the shell
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x0f1330, roughness: 0.95 });
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, e = 0.45 + (i % 3) * 0.35;
      const p = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 4) * 2, 10, 8), plateMat);
      p.position.set(Math.cos(a) * Math.cos(e) * SHELL_R, SHELL_Y + Math.sin(e) * SHELL_R, Math.sin(a) * Math.cos(e) * SHELL_R);
      p.scale.y = 0.45; p.lookAt(0, SHELL_Y, 0); g.add(p);
    }
    // the head on a neck, facing south (toward the player's approach)
    this.neck = new THREE.Mesh(new THREE.CylinderGeometry(6, 9, 32, 12), skinMat); this.neck.position.set(0, 14, 52); this.neck.rotation.x = -0.9; g.add(this.neck);
    this.head = new THREE.Group(); this.head.position.set(0, 27, 66); g.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 12), skinMat); skull.scale.set(1, 0.8, 1.3); this.head.add(skull);
    const eyeMat = new THREE.MeshBasicMaterial({ color: VIOLET, toneMapped: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), eyeMat); e.position.set(s * 6.5, 3.5, 9); this.head.add(e); }
    this.eyeMat = eyeMat;
    // legs: four pillars at the corners
    this.legs = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 30, 10), skinMat); leg.position.set(sx * 34, 2, sz * 30); g.add(leg); this.legs.push(leg);
      this.addCollider(new THREE.Vector3(sx * 34, 6, sz * 30), 11);
    }
    this.addCollider(new THREE.Vector3(0, SHELL_Y, 0), SHELL_R + 0.5);
    this.addCollider(new THREE.Vector3(0, 27, 66), 13);
    this.addCollider(new THREE.Vector3(0, 14, 52), 8);
    // lanterns stand proud of the shell on short posts: 30 m east, 50 m south-west,
    // 70 m north (faces away from the approach). Each is a sticky perch of its own.
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0d1028, roughness: 0.9 });
    const lanternOn = (dir) => {
      const d = dir.clone().normalize();
      const base = new THREE.Vector3(0, SHELL_Y, 0).addScaledVector(d, SHELL_R - 1);
      const top = new THREE.Vector3(0, SHELL_Y, 0).addScaledVector(d, SHELL_R + 5.5);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 7, 8), postMat);
      post.position.lerpVectors(base, top, 0.5); post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(post);
      return this.addLantern(top, 2.6);
    };
    lanternOn(new THREE.Vector3(47.5, -2, 0));      // east, ~30 m up
    lanternOn(new THREE.Vector3(-31, 18, 31));      // south-west, ~50 m up
    lanternOn(new THREE.Vector3(0, 38, -29.5));     // north, ~70 m up: faces away
    // ring waves
    this.rings = [];
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xb59cff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 128), ringMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.name = 'wave';
      ctx.scene.add(m); this.rings.push({ mesh: m, r: 0, active: false, hit: false });
    }
    this.stepTimer = 3.0; this.stomp = 0; this.bob = 0;
    this.kneel = 0; this.headYaw = 0; this.headNod = 0;
  }

  onLantern(l) { this.dimBody(); this.stomp = 1; this.headNod = 1; }
  onDeath() { this.headTarget = 1; for (const r of this.rings) { r.active = false; r.mesh.visible = false; } }

  update(dt, rider) {
    super.update(dt, rider);
    const g = this.group;
    // breathing: the only clock in the fight
    this.bob += dt;
    const breath = Math.sin(this.bob * 0.7) * 0.6;
    g.position.y = breath - this.kneel * 16 + (this.stomp > 0 ? -Math.sin(this.stomp * Math.PI) * 2.2 : 0);
    this.stomp = Math.max(0, this.stomp - dt * 1.6);
    this.headNod = Math.max(0, this.headNod - dt * 1.2);
    // head tracks the rider, or turns north when dead
    if (!this.dead) {
      _v.copy(rider.pos); g.worldToLocal(_v); _v.sub(this.head.position);
      const yaw = Math.atan2(_v.x, _v.z);
      this.headYaw += (THREE.MathUtils.clamp(yaw, -0.9, 0.9) - this.headYaw) * (1 - Math.exp(-1.2 * dt));
    } else {
      this.headYaw += (Math.PI - this.headYaw) * (1 - Math.exp(-0.5 * dt));
      this.kneel = Math.min(1, this.kneel + dt * 0.25);
      this.eyeMat.color.lerp(new THREE.Color(0xffb24a), 1 - Math.exp(-0.8 * dt));
    }
    this.head.rotation.y = this.headYaw;
    this.head.rotation.x = Math.sin(this.headNod * Math.PI) * 0.35 - this.kneel * 0.3;
    this.head.position.y = 27 + Math.sin(this.bob * 0.9) * 1.2;

    if (this.active && !this.dead) {
      const swiftAway = this.ctx.swift.state !== 'hand';
      this.stepTimer -= dt * (swiftAway ? 1.45 : 1);
      if (this.stepTimer <= 0) { this.stepTimer = 3.2; this._step(); }
    }
    // waves
    for (const ring of this.rings) {
      if (!ring.active) continue;
      ring.r += 15 * dt;
      const m = ring.mesh; m.scale.set(ring.r, ring.r, ring.r); m.position.y = this.ctx.world.waterY + 0.15;
      m.material.opacity = 0.45 * Math.max(0, 1 - ring.r / 260);
      if (ring.r > 260) { ring.active = false; m.visible = false; continue; }
      // knock the rider off anything under 4 m as the wave passes
      if (rider.state !== 'fallen') {
        _w.set(rider.pos.x - m.position.x, 0, rider.pos.z - m.position.z);
        const d = _w.length();
        const low = rider.pos.y < this.ctx.world.waterY + 4;
        if (low && Math.abs(d - ring.r) < 3.5 && !ring.hit) {
          ring.hit = true;
          rider.knockOff(_w.normalize(), 9);
          this.ctx.fx.emit(rider.pos, { n: 30, color: 0xb59cff, speed: 6, life: 0.7, size: 0.2 });
        }
      }
    }
  }

  _step() { this.wave(Math.floor(Math.random() * 4)); }

  // A foot comes down: the wave starts at that leg. Exposed so a test can pick the leg.
  wave(legIndex = 0) {
    const leg = this.legs[legIndex % 4];
    const ring = this.rings.find(r => !r.active); if (!ring) return null;
    ring.active = true; ring.r = 8; ring.hit = false; ring.mesh.visible = true;
    _v.copy(leg.position); this.group.localToWorld(_v);
    ring.mesh.position.set(_v.x, this.ctx.world.waterY + 0.15, _v.z);
    this.stomp = 1;
    this.ctx.events.emit('wave', { t: this.ctx.time, pos: _v.clone() });
    this.ctx.fx.emit(_v.clone().setY(this.ctx.world.waterY + 0.5), { n: 60, color: 0x9fb4ff, speed: 10, life: 1.2, size: 0.3, grav: 12, spread: 1.5 });
    this.ctx.camera.shake(0.25);
    return ring;
  }
}
