// Boss framework. A boss is data on one system: sphere colliders the swift can stick to,
// lanterns the rider snuffs by flying through them during a catch dash, and a body that
// dims section by section. When the last lantern goes, every rail thrown on it breaks
// into embers, and it turns its head toward the next chapter.
//
// Legibility law (two-hue): the LANTERNS are the only saturated violet in the game. A boss
// body is a dark animal with a faint indigo glow that fades as its lanterns go; each
// lantern carries its own point light so the body near it is the "section" that goes dark.
import * as THREE from 'three';
import { CFG } from '../config.js';

export const VIOLET = 0x8a4dff;
export const SNUFFED = 0x1a1030;
const _v = new THREE.Vector3();

export class Lantern {
  constructor(boss, localPos, radius = 2.2) {
    this.boss = boss; this.local = localPos.clone(); this.lit = true; this.radius = radius;
    const mat = new THREE.MeshBasicMaterial({ color: VIOLET, toneMapped: false });
    // core + two halos: the inner one is the bright bead, the outer one the glow that reads at 120 m
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 16, 12), mat);
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.6, 16, 12), new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.haloFar = new THREE.Mesh(new THREE.SphereGeometry(radius * 3.2, 16, 12), new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.mesh.add(this.halo); this.mesh.add(this.haloFar);
    this.light = new THREE.PointLight(VIOLET, 60, 70, 1.4); this.mesh.add(this.light);
    this.mesh.name = 'lantern';
    boss.group.add(this.mesh);
    this.mesh.position.copy(localPos);
    this.world = new THREE.Vector3();
    this.pulse = Math.random() * 10;
    this.relight = 0;     // > 0 while a relight rises (0.5 s)
    // a lantern is sticky: the swift can perch on it, so a throw AT a lantern ends at the lantern
    this.collider = boss.addCollider(localPos, radius, true);
  }
  update(dt, time) {
    this.pulse += dt;
    this.mesh.getWorldPosition(this.world);
    if (this.relight > 0) {
      // the rise: the bead grows and brightens over 0.5 s, never pops in
      this.relight = Math.max(0, this.relight - dt / 0.5);
      const k = 1 - this.relight, e = k * k * (3 - 2 * k);
      this.mesh.scale.setScalar(0.2 + 0.8 * e); this.halo.visible = this.haloFar.visible = true;
      this.halo.material.opacity = 0.26 * e; this.haloFar.material.opacity = 0.08 * e;
      this.light.intensity = 60 * e;
      this.mesh.material.color.copy(new THREE.Color(SNUFFED).lerp(new THREE.Color(VIOLET), e));
      return;
    }
    if (this.lit) {
      const p = 1 + 0.12 * Math.sin(this.pulse * 3.2);
      this.halo.scale.setScalar(p); this.haloFar.scale.setScalar(1 + 0.06 * Math.sin(this.pulse * 2.1));
      this.light.intensity = 60 + 16 * Math.sin(this.pulse * 3.2);
    }
  }
  snuff() {
    if (!this.lit) return false;
    this.lit = false;
    this.mesh.material.color.setHex(SNUFFED);
    this.halo.visible = this.haloFar.visible = false; this.light.intensity = 0;
    return true;
  }
  // relit by a boss that takes a new stance: rises over 0.5 s
  light_() {
    if (this.lit) return;
    this.lit = true; this.relight = 1;
    this.mesh.scale.setScalar(0.2);
    this.halo.material.opacity = 0; this.haloFar.material.opacity = 0;
  }
}

export class Boss {
  constructor(ctx, { tag, x, z }) {
    this.ctx = ctx; this.tag = tag; this.dead = false; this.active = false;
    this.group = new THREE.Group(); this.group.name = 'boss-' + tag; this.group.position.set(x, 0, z);
    ctx.scene.add(this.group);
    this.lanterns = []; this.colliders = []; this.perches = [];
    this.time = 0; this.headTarget = null; this.hitFlash = 0;
    this.bodyMats = [];
    this.dim = 1;          // 1 = every lantern lit, 0 = dark. Eases; never steps.
    this.dimTarget = 1;
  }
  addLantern(local, radius) { const l = new Lantern(this, local, radius); this.lanterns.push(l); return l; }
  // colliders are {local: Vector3, radius}; world centres refreshed per frame. `first` puts
  // it ahead of the body so a throw aimed at a lantern sticks to the lantern, not the shell.
  addCollider(local, radius, first = false) {
    const c = { local: local.clone(), radius, centre: new THREE.Vector3(), owner: this };
    if (first) this.colliders.unshift(c); else this.colliders.push(c);
    return c;
  }
  refreshColliders() { for (const c of this.colliders) { c.centre.copy(c.local); this.group.localToWorld(c.centre); } }
  // A perch rides with the collider it stuck to (a stance that walks, an eel that swims).
  registerPerch(perch) {
    if (perch.collider && perch.collider.centre) { perch.colliderRef = perch.collider; perch.offset = perch.point.clone().sub(perch.collider.centre); }
    else perch.local = this.group.worldToLocal(perch.point.clone());
    this.perches.push(perch);
  }
  perchPoint(perch, out) {
    if (perch.colliderRef) return out.copy(perch.colliderRef.centre).add(perch.offset);
    return out.copy(perch.local).applyMatrix4(this.group.matrixWorld);
  }
  onCalled(swift) { this.perches = this.perches.filter(p => p !== swift.perch); }

  get litCount() { return this.lanterns.filter(l => l.lit).length; }

  // Called by main each step with the rider: checks lantern hits.
  checkLanterns(rider) {
    if (this.dead || rider.dashTimer <= 0) return;
    for (const l of this.lanterns) {
      if (!l.lit || l.relight > 0) continue;
      const d = rider.pos.distanceTo(l.world);
      if (d < CFG.dash.lanternRadius + l.radius * 0.5) {
        this.hitLantern(l);
        return;
      }
    }
  }

  hitLantern(l) {
    l.snuff();
    this.hitFlash = 1;
    this.ctx.events.emit('lantern', { t: this.ctx.time, boss: this.tag, remaining: this.litCount, pos: l.world.clone() });
    this.ctx.fx.emit(l.world, { n: 90, color: VIOLET, speed: 14, life: 1.4, size: 0.26, grav: 4, drag: 1.2 });
    this.ctx.fx.emit(l.world, { n: 40, color: 0xffb24a, speed: 9, life: 1.0, size: 0.2, grav: 6 });
    this.onLantern(l);
    if (this.litCount === 0 && !this.dead) this.die();
  }

  onLantern(l) { /* subclasses */ }

  die() {
    this.dead = true;
    // every rail thrown on it breaks into embers and falls
    const pts = [];
    this.ctx.embers.removeTag(this.tag, pts);
    for (let i = 0; i < pts.length; i += 2) this.ctx.fx.emit(pts[i], { n: 2, color: 0xff8a2a, speed: 1.5, life: 2.2, size: 0.22, grav: 5, drag: 0.6, jitter: 0.6 });
    // the spill: a slow amber rain from every lantern, the reward you can watch
    for (const l of this.lanterns) this.ctx.fx.emit(l.world, { n: 60, color: 0xff8a2a, speed: 3, life: 2.6, size: 0.24, grav: 3, drag: 0.8, jitter: 2 });
    this.ctx.events.emit('bossDown', { t: this.ctx.time, boss: this.tag });
    this.onDeath();
  }
  onDeath() { /* subclasses */ }

  update(dt, rider) {
    this.time += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
    this.group.updateMatrixWorld(true);
    this.refreshColliders();
    for (const l of this.lanterns) l.update(dt, this.time);
    // section dimming: eases toward the target over ~1 s, with a flash on the hit first
    this.dim += (this.dimTarget - this.dim) * (1 - Math.exp(-2.5 * dt));
    const flash = this.hitFlash * this.hitFlash;
    for (const m of this.bodyMats) {
      if (!m.emissive) continue;
      if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = m.emissiveIntensity;
      m.emissiveIntensity = m.userData.baseEmissive * (0.12 + 0.88 * this.dim) + flash * 0.9;
    }
  }

  // body materials fade with lanterns lost (k = share still lit; default from the lanterns)
  dimBody(k = null) {
    if (k === null) k = this.lanterns.length ? this.litCount / this.lanterns.length : 0;
    this.dimTarget = k;
  }
}
