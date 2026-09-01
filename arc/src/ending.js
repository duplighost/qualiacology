// THE DAM — chapter IV's end. One dark socket at the top. You throw the swift into it.
// RMB does nothing but turn its head to look at you (a gesture that fades). Then, on its
// own, the recall gesture happens to the whole valley: every line you ever rode lights
// from the far end back toward you, the dam stands up under you with the water sheeting
// off, and the sky goes to dawn. Endcard: time, falls, thrown, called.
import * as THREE from 'three';

const _v = new THREE.Vector3();

export class Ending {
  constructor(ctx, socket) {
    this.ctx = ctx; this.tag = 'socket'; this.active = false; this.dead = false; this.done = false;
    this.socket = new THREE.Vector3(socket.x, socket.y, socket.z);
    this.group = new THREE.Group(); ctx.scene.add(this.group);
    const mat = new THREE.MeshStandardMaterial({ color: 0x090b1c, roughness: 0.95, emissive: 0x000000 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 1.1, 10, 28), mat); ring.position.copy(this.socket); ring.rotation.x = Math.PI / 2; this.group.add(ring);
    this.ring = ring;
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xffb24a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), this.glowMat); glow.position.copy(this.socket); this.group.add(glow);
    this.colliders = [{ local: new THREE.Vector3(), radius: 3.2, centre: this.socket.clone(), owner: this }];
    this.phase = 'waiting'; this.t = 0; this.lookTimer = 0; this.stand = 0; this.recall = 0; this.rise = 0;
    this.lanterns = [];
    this.looks = 0;
  }
  refreshColliders() { }
  registerPerch(perch) { if (this.phase === 'waiting') { this.phase = 'perched'; this.t = 0; this.ctx.events.emit('ending', { t: this.ctx.time }); } }
  onCalled() { }
  checkLanterns() { }
  perchPoint(perch, out) { return out.copy(perch.point); }

  // RMB during the wait: the swift turns to look, nothing else
  look() {
    if (this.phase !== 'perched') return false;
    this.lookTimer = 1.2; this.looks++;
    this.ctx.audio && this.ctx.audio.chirp && this.ctx.audio.chirp(this.ctx.swift.pos, 620, 'perched');
    return true;
  }

  _holdSwift() {
    const swift = this.ctx.swift;
    swift.state = 'ending';
    swift.pos.copy(this.socket).add(_v.set(0, 1.2 + this.rise, 0));
    // the look: the head turns to the rider and turns back, a gesture with a rise and a fall
    const k = Math.min(1, this.lookTimer / 1.2);
    swift.lookBack = Math.sin(k * Math.PI) * 0.8;
    if (this.lookTimer > 0) { _v.subVectors(this.ctx.rider.pos, swift.pos).normalize(); swift.facing.lerp(_v, 0.1); }
  }

  update(dt, rider) {
    if (this.phase === 'waiting') { this.glowMat.opacity = 0.02 + 0.02 * Math.sin(this.ctx.time * 1.5); return; }
    this.t += dt;
    this.lookTimer = Math.max(0, this.lookTimer - dt);
    if (this.phase === 'perched') {
      this.glowMat.opacity = Math.min(0.35, this.t * 0.06);
      this._holdSwift();
      if (this.t > 5.5) { this.phase = 'recall'; this.t = 0; this.dawn0 = this.ctx.world.dawn; this.ctx.events.emit('endingStand', { t: this.ctx.time }); }
      return;
    }
    if (this.phase === 'recall') {
      // the valley recalls itself: ember-lines light from far to near, the dawn comes (from
      // wherever the chapters left it, never back to night first), the dam stands
      const k = Math.min(1, this.t / 14);
      this.recall = k;
      this.ctx.embers.setRecall(Math.min(1, this.t / 4));
      const d0 = this.dawn0 || 0;
      this.ctx.world.setDawn(d0 + (1 - d0) * Math.min(1, this.t / 12));
      this.glowMat.opacity = 0.35 + 0.4 * Math.min(1, this.t / 3);
      // the dam stands: the whole chapter group and the rider rise and tilt
      const stand = Math.min(1, Math.max(0, (this.t - 3) / 9));
      const e = stand * stand * (3 - 2 * stand);
      this.stand = e;
      const rise = this.rise = e * 38;
      const grp = this.ctx.chapterGroups[3];
      if (grp) { grp.position.y = rise; grp.rotation.x = -e * 0.05; }
      this.group.position.y = rise;
      rider.pos.y = rider.standY + rise; rider.frozenPose = true;
      this._holdSwift();
      this.ctx.world.setWaterY(-e * 60);
      if (this.t > 2) this.ctx.camera.shake(0.12 * (1 - stand));
      if (this.t > 17) { this.phase = 'done'; this.done = true; }
    }
  }
}
