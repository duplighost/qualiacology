// THE HERON — chapter II. 140 m tall, standing among the towers, facing you, lantern in
// its throat. While the swift is AWAY it stabs where you are: 1.4 s telegraph (head cocks,
// throat brightens), then the beak comes down. Catch the swift during the telegraph and
// the stab is called off (the head un-cocks: the call is also a guard). Its legs are walls
// to throw at. Three hits; after each it walks to a new stance and the throat relights.
import * as THREE from 'three';
import { Boss, VIOLET } from './base.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class Heron extends Boss {
  constructor(ctx, { x, z }) {
    super(ctx, { tag: 'heron', x, z });
    const g = this.group;
    // the bird is built facing local -z; the group is turned so it faces SOUTH (+z), the approach
    g.rotation.y = Math.PI;
    const skin = new THREE.MeshStandardMaterial({ color: 0x232a58, roughness: 0.8, emissive: 0x2a1f60, emissiveIntensity: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0f1230, roughness: 0.9 });
    this.bodyMats = [skin];
    // legs: two tall pillars, 18 m apart
    this.legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 92, 12), dark); leg.position.set(s * 9, 46, 0); g.add(leg); this.legs.push(leg);
      for (let k = 0; k < 6; k++) this.addCollider(new THREE.Vector3(s * 9, 8 + k * 15, 0), 4.6);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), dark); knee.position.set(s * 9, 58, 0); g.add(knee);
    }
    // body
    const body = new THREE.Mesh(new THREE.SphereGeometry(18, 18, 14), skin); body.position.set(0, 100, -4); body.scale.set(1, 0.75, 1.5); g.add(body);
    this.addCollider(new THREE.Vector3(0, 100, -4), 19);
    // tail feathers
    const tail = new THREE.Mesh(new THREE.ConeGeometry(9, 26, 8), skin); tail.rotation.x = Math.PI / 2 + 0.5; tail.position.set(0, 102, 24); g.add(tail);
    // neck: a chain of segments we bend in the stab
    this.neck = new THREE.Group(); this.neck.position.set(0, 108, -16); g.add(this.neck);
    this.neckSegs = [];
    let prev = this.neck;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(3.6 - i * 0.3, 4 - i * 0.3, 8, 10), skin); m.position.y = 4; seg.add(m); seg.position.y = i === 0 ? 0 : 8; prev.add(seg); this.neckSegs.push(seg); prev = seg;
    }
    this.head = new THREE.Group(); this.head.position.y = 8; prev.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(5.5, 12, 10), skin); skull.scale.set(1, 0.8, 1.4); this.head.add(skull);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(2.2, 22, 8), dark); beak.rotation.x = -Math.PI / 2; beak.position.set(0, -1, -14); this.head.add(beak);
    this.beak = beak;
    const eyeMat = new THREE.MeshBasicMaterial({ color: VIOLET, toneMapped: false }); this.eyeMat = eyeMat;
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), eyeMat); e.position.set(s * 3.4, 1.5, -3); this.head.add(e); }
    // the throat lantern, in the front of the neck base, facing the approach
    this.throat = this.addLantern(new THREE.Vector3(0, 114, -24), 2.8);
    this.lanterns = [this.throat];
    this.hits = 0; this.stances = [[x, z], [x + 70, z - 60], [x - 60, z - 130]];
    this.stanceIndex = 0; this.moving = 0; this.moveFrom = new THREE.Vector3(); this.moveTo = new THREE.Vector3();
    this.stabTimer = 4.5; this.stabPhase = 0; this.stabState = 'idle'; this.stabTarget = new THREE.Vector3(); this.strike = new THREE.Vector3();
    this.bend = 0; this.cock = 0; this.headYaw = 0; this.kneel = 0;
    this.headTargetYaw = 0;
    this.pendingRelight = false;
  }

  onLantern(l) {
    this.hits++;
    if (this.hits < 3) {
      // a new stance, then the throat relights when the stance lands
      this.stanceIndex = Math.min(this.stances.length - 1, this.hits);
      const [sx, sz] = this.stances[this.stanceIndex];
      this.moveFrom.copy(this.group.position); this.moveTo.set(sx, 0, sz); this.moving = 1;
      this.pendingRelight = true;
      // a stab in progress is dropped: the head lifts to walk
      this.stabState = 'idle'; this.stabTimer = 5; this.cock = 0;
    }
    this.dimBody(1 - this.hits / 3);
  }

  // Override: the heron only dies on the third hit; its one lantern relights twice.
  checkLanterns(rider) {
    if (this.dead || rider.dashTimer <= 0 || !this.throat.lit || this.throat.relight > 0) return;
    const l = this.throat;
    const d = rider.pos.distanceTo(l.world);
    if (d < 7 + l.radius * 0.5) {
      l.snuff(); this.hitFlash = 1;
      this.ctx.events.emit('lantern', { t: this.ctx.time, boss: this.tag, remaining: 2 - this.hits, pos: l.world.clone() });
      this.ctx.fx.emit(l.world, { n: 90, color: VIOLET, speed: 14, life: 1.4, size: 0.26, grav: 4, drag: 1.2 });
      this.ctx.fx.emit(l.world, { n: 40, color: 0xffb24a, speed: 9, life: 1.0, size: 0.2, grav: 6 });
      this.onLantern(l);
      if (this.hits >= 3) this.die();
    }
  }

  onDeath() { this.headTargetYaw = Math.PI; this.stabState = 'idle'; this.cock = 0; }

  update(dt, rider) {
    super.update(dt, rider);
    const g = this.group;
    // stance moves: a slow, heavy walk between stances (3.2 s)
    if (this.moving > 0) {
      this.moving = Math.max(0, this.moving - dt / 3.2);
      const k = 1 - this.moving, e = k * k * (3 - 2 * k);
      g.position.lerpVectors(this.moveFrom, this.moveTo, e);
      g.position.y = Math.sin(k * Math.PI * 2) * 3;
      for (const [i, leg] of this.legs.entries()) leg.position.y = 46 + Math.max(0, Math.sin(k * Math.PI * 2 + i * Math.PI)) * 6;
      if (this.moving === 0) {
        this.ctx.camera.shake(0.3);
        this.ctx.fx.emit(g.position.clone().setY(this.ctx.world.waterY + 0.5), { n: 50, color: 0x9fb4ff, speed: 8, life: 1.0, size: 0.28, grav: 10, spread: 1.4 });
        if (this.pendingRelight) { this.pendingRelight = false; this.throat.light_(); }
      }
    }
    // the stab: begins only while the swift is away; called off if it comes home in the telegraph
    if (this.active && !this.dead && this.moving === 0) {
      const away = this.ctx.swift.state !== 'hand';
      if (this.stabState === 'idle') {
        this.stabTimer -= dt * (away ? 1 : 0.35);
        if (this.stabTimer <= 0 && away) { this.stabState = 'warn'; this.stabPhase = 0; this.stabTarget.copy(rider.pos); this.ctx.events.emit('stabWarn', { t: this.ctx.time, pos: rider.pos.clone() }); }
      } else if (this.stabState === 'warn') {
        this.stabPhase += dt / 1.4;
        this.stabTarget.lerp(rider.pos, 1 - Math.exp(-2.5 * dt));
        this.cock = Math.min(1, this.stabPhase);
        if (!away) { this.stabState = 'idle'; this.stabTimer = 3.5; this.cock = 0; }
        else if (this.stabPhase >= 1) {
          this.stabState = 'strike'; this.stabPhase = 0; this.strike.copy(this.stabTarget);
          this.ctx.events.emit('stab', { t: this.ctx.time, pos: this.strike.clone() }); this.ctx.camera.shake(0.45);
          this.ctx.fx.emit(this.strike, { n: 80, color: 0x9fb4ff, speed: 12, life: 1.0, size: 0.3, grav: 10 });
          if (rider.pos.distanceTo(this.strike) < 6 && rider.state !== 'fallen') { _w.subVectors(rider.pos, this.strike).setY(0).normalize(); if (_w.lengthSq() < 0.1) _w.set(1, 0, 0); rider.knockOff(_w, 12); }
        }
      } else if (this.stabState === 'strike') {
        this.stabPhase += dt / 0.9;
        if (this.stabPhase >= 1) { this.stabState = 'idle'; this.stabTimer = 6; this.cock = 0; }
      }
    }
    // neck pose: cock back in the warn, drive down in the strike, droop when dead
    const strikeK = this.stabState === 'strike' ? Math.sin(Math.min(1, this.stabPhase) * Math.PI) : 0;
    const bendWant = -this.cock * 0.35 + strikeK * 0.55;
    this.bend += (bendWant - this.bend) * (1 - Math.exp(-(this.stabState === 'strike' ? 22 : 4) * dt));
    for (const [i, seg] of this.neckSegs.entries()) seg.rotation.x = this.bend * (0.6 + i * 0.15) - this.kneel * 0.32;
    // the throat brightens with the cock
    if (this.throat.lit && this.throat.relight <= 0) { this.throat.halo.scale.setScalar(1 + this.cock * 0.9); this.throat.light.intensity = 60 + this.cock * 140; }
    // head tracks the rider; dead, it turns north and kneels
    if (!this.dead) {
      _v.copy(rider.pos); this.neck.worldToLocal(_v);
      const yaw = Math.atan2(_v.x, -_v.z);
      this.headYaw += (THREE.MathUtils.clamp(yaw, -1.2, 1.2) - this.headYaw) * (1 - Math.exp(-2 * dt));
    } else {
      this.headYaw += (this.headTargetYaw - this.headYaw) * (1 - Math.exp(-0.4 * dt));
      this.kneel = Math.min(1, this.kneel + dt * 0.2);
      g.position.y = -this.kneel * 30;
      this.eyeMat.color.lerp(new THREE.Color(0xffb24a), 1 - Math.exp(-0.8 * dt));
    }
    this.neck.rotation.y = this.headYaw;
  }
}
