// The Skyshard is an ability exam, not a health sponge with flavor text. Its
// shield cycles through physical checks for Dash, Lance, Seekers, Grapple,
// Glide, and Slam before ordinary Sparkcaster damage can matter.

import * as THREE from 'three';
import { G } from '../state.js';
import { sfx } from '../core/audio.js';
import { save } from '../core/save.js';
import { music } from '../core/music.js';
import { juice } from '../fx/juice.js';
import { clamp01, damp } from '../core/math.js';

const STAGES = ['dash', 'lance', 'seeker', 'grapple', 'glide', 'slam', 'vulnerable'];
const LABELS = {
  dash: 'WIND BREAK · DASH', lance: 'SUN ANCHORS · LANCE', seeker: 'MOVING STARS · SEEKERS',
  grapple: 'TAKE THE CROWN · GRAPPLE', glide: 'CROSS THE OPEN CROWN · GLIDE',
  slam: 'THE HEART BELOW · SLAM', vulnerable: 'THE SKYSHARD OPENS',
};

export class FinalBoss {
  constructor(interior) {
    this.key = 'skyshard';
    this.requiresAbilities = true;
    this.interior = interior;
    this.arena = { x: 0, z: -83 };
    this.pos = new THREE.Vector3(0, 7.5, -83);
    this.vel = new THREE.Vector3();
    this.hp = 240;
    this.maxHp = 240;
    this.cycle = 0;
    this.cycleFloor = 160;
    this.stage = 'dash';
    this.stageCount = 0;
    this.dead = false;
    this.t = 0;
    this.flashT = 0;
    this.attackT = 2.2;
    this.radialT = 5.5;
    this.contactCd = 0;
    this.lastAbilityHit = -9;
    this.marks = [];
    this.mesh = this._build();
    this.mesh.position.copy(this.pos);
    interior.scene.add(this.mesh);
    this._makeTelegraphs();
    G.hud.bossShow('THE SKYSHARD');
    music.setMode('boss');
    sfx('bossroar', { pitch: .62, gain: 1.2 });
    juice.shake(.85);
    G.hud.whisper(LABELS.dash, 2.8);
  }

  _build() {
    const g = new THREE.Group();
    const pearl = new THREE.MeshStandardMaterial({ color: 0xe9f4ff, emissive: 0x7fb8ff, emissiveIntensity: .72, roughness: .18, metalness: .12 });
    const night = new THREE.MeshStandardMaterial({ color: 0x17152f, emissive: 0x51449a, emissiveIntensity: .55, roughness: .46, metalness: .42 });
    const sun = new THREE.MeshStandardMaterial({ color: 0xffd37a, emissive: 0xff842e, emissiveIntensity: 1.1, roughness: .16 });
    const star = new THREE.MeshBasicMaterial({ color: 0xc9efff, fog: false });

    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 2), sun);
    this.core.scale.set(.8, 1.35, .8);
    this.shell = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const plate = new THREE.Mesh(new THREE.TetrahedronGeometry(1.05 + (i % 3) * .2, 1), i % 2 ? pearl : night);
      plate.position.set(Math.cos(a) * 2.4, Math.sin(a * 2) * 1.15, Math.sin(a) * 2.4);
      plate.rotation.set(a * .7, a, a * .35); this.shell.add(plate);
    }
    this.orbits = new THREE.Group();
    this.abilityNodes = [];
    const colors = [0x8de378, 0xff9a48, 0x63ffc7, 0x9f7bff, 0xa9eaff, 0xffdb87];
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(3.3 + i * .42, .075, 6, 36),
        new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: .58, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      r.rotation.set(i * .38, i * .63, i * .19); r.userData.baseOpacity = .58; this.orbits.add(r);
      const n = new THREE.Mesh(i === 0 ? new THREE.BoxGeometry(.42, .42, .42) : i === 5 ? new THREE.OctahedronGeometry(.38, 1) : new THREE.TetrahedronGeometry(.4, 1),
        new THREE.MeshBasicMaterial({ color: colors[i], fog: false }));
      n.position.set(3.3 + i * .42, 0, 0); r.add(n); this.abilityNodes.push(n);
    }
    this.crown = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const ray = new THREE.Mesh(new THREE.ConeGeometry(.16, 3.4 + (i % 3), 6), pearl);
      const a = i / 9 * Math.PI * 2; ray.position.set(Math.cos(a) * 1.8, 2.6, Math.sin(a) * 1.8); ray.rotation.z = Math.sin(a) * .5; ray.rotation.x = Math.cos(a) * .5; this.crown.add(ray);
    }
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 10), star);
    this.eye.position.z = 1.25;
    g.add(this.core, this.shell, this.orbits, this.crown, this.eye);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _makeTelegraphs() {
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xb8e7ff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.wave = new THREE.Mesh(new THREE.TorusGeometry(1, .13, 6, 48), ringMat);
    this.wave.rotation.x = Math.PI / 2; this.wave.visible = false; this.interior.scene.add(this.wave);
    this.windWalls = new THREE.Group();
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x9bdfff, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(11, 10, 14, 6), wallMat.clone());
      const a = i / 4 * Math.PI * 2; w.position.set(Math.cos(a) * 8, 5, -83 + Math.sin(a) * 8); w.rotation.y = -a; this.windWalls.add(w);
    }
    this.interior.scene.add(this.windWalls);
  }

  hitSpheres() {
    // One sphere prevents a piercing lance from counting multiple locks in a
    // single release. Core multipliers are applied inside onHit.
    return [{ x: this.pos.x, y: this.pos.y, z: this.pos.z, r: this.stage === 'vulnerable' ? 1.45 : 2.35, part: 'core', boss: this }];
  }

  testHit(x, y, z, r) {
    return Math.hypot(this.pos.x - x, this.pos.y - y, this.pos.z - z) < 2.35 + r;
  }

  onHit(_sphere, dmg, opts = {}) {
    if (this.dead) return;
    const now = G.time.now;
    const kind = opts.kind || 'shot';
    if (this.stage === 'lance' && kind === 'lance' && now - this.lastAbilityHit > .18) {
      this.lastAbilityHit = now; this.stageCount++;
      this._abilityFlash(opts.point, [1, .55, .2]);
      if (this.stageCount >= 3) this._advance('seeker');
      return;
    }
    if (this.stage === 'seeker' && kind === 'seeker' && now - this.lastAbilityHit > .08) {
      this.lastAbilityHit = now; this.stageCount++;
      this._abilityFlash(opts.point, [.4, 1, .72]);
      if (this.stageCount >= 3) this._advance('grapple');
      return;
    }
    if (this.stage !== 'vulnerable') {
      this.flashT = .1;
      if (now - this.lastAbilityHit > .28) {
        this.lastAbilityHit = now;
        sfx('hit', { pitch: .52, gain: .28 });
        G.particles?.burst('spark', opts.point?.x ?? this.pos.x, opts.point?.y ?? this.pos.y, opts.point?.z ?? this.pos.z, 5, { color: [.65, .78, 1] });
      }
      return;
    }

    const dealt = dmg * (kind === 'shot' ? 2 : 1);
    this.hp -= dealt;
    this.flashT = .15;
    G.hud.bossSet(clamp01(this.hp / this.maxHp));
    G.hud.hitPip();
    sfx('hit', { pitch: 1.45 });
    juice.stop('hit');
    G.particles?.burst('impact', opts.point?.x ?? this.pos.x, opts.point?.y ?? this.pos.y, opts.point?.z ?? this.pos.z, 10, { color: [1, .75, .36], sizeMult: 1.35 });

    if (this.hp <= 0) this._die();
    else if (this.hp <= this.cycleFloor) {
      this.cycle++;
      this.cycleFloor = Math.max(0, this.cycleFloor - 80);
      juice.slowmo('bossPhase'); juice.shake(.8); sfx('bossroar', { pitch: .8 + this.cycle * .15 });
      this._advance('dash');
    }
  }

  onAbility(kind, pos) {
    if (this.dead || kind !== 'slam' || this.stage !== 'slam') return;
    if (Math.hypot(pos.x - this.pos.x, pos.z - this.pos.z) < 9) {
      this._abilityFlash({ x: pos.x, y: pos.y, z: pos.z }, [.7, .86, 1]);
      this._advance('vulnerable');
    }
  }

  _abilityFlash(point, color) {
    const p = point || this.pos;
    sfx('unlock', { pitch: 1.2 + this.stageCount * .08, gain: .75 });
    juice.shake(.35); G.postfx?.pulse(.35);
    G.particles?.burst('impact', p.x, p.y, p.z, 18, { color, sizeMult: 1.5 });
  }

  _advance(stage) {
    this.stage = stage;
    this.stageCount = 0;
    this.lastAbilityHit = G.time.now;
    G.hud.whisper(LABELS[stage], stage === 'vulnerable' ? 2.4 : 2.0);
    if (G.hud.bossName) G.hud.bossName.textContent = stage === 'vulnerable' ? 'THE SKYSHARD · OPEN' : `THE SKYSHARD · ${stage.toUpperCase()}`;
    for (let i = 0; i < this.orbits.children.length; i++) {
      const ring = this.orbits.children[i];
      ring.material.opacity = stage === 'vulnerable' ? .12 : (STAGES.indexOf(stage) === i ? .95 : .25);
    }
    this.windWalls.visible = stage === 'dash';
    if (stage === 'vulnerable') {
      juice.slowmo('bossPhase');
      this.core.scale.set(1.25, 1.7, 1.25);
    } else this.core.scale.set(.8, 1.35, .8);
  }

  _attack() {
    const pl = G.player;
    const count = 2 + this.cycle;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * .17;
      G.projectiles.enemyBolt(this.pos.x, this.pos.y, this.pos.z, pl, 14 + this.cycle * 1.8, [.62, .78, 1], spread);
    }
    sfx('enemyshoot', { pitch: .72 + this.cycle * .1 });
  }

  _radial() {
    const n = 12 + this.cycle * 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + this.t * .2;
      const b = G.projectiles.boltPool.obtain();
      if (!b) break;
      b.x = this.pos.x; b.y = 1.1; b.z = this.pos.z;
      b.vx = Math.cos(a) * (8.8 + this.cycle); b.vy = 0; b.vz = Math.sin(a) * (8.8 + this.cycle);
      b.life = 5; b.fromPlayer = false; b.seek = false; b.damage = 1; b.mesh.visible = true;
      b.mesh.material.color.setRGB(.64, .78, 1); b.mesh.scale.setScalar(1.15);
    }
    this.wave.visible = true; this.wave.userData.r = .5; this.wave.position.set(this.pos.x, .24, this.pos.z);
    sfx('slam', { pitch: .82 }); juice.shake(.22);
  }

  update(dt) {
    if (this.dead) return;
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.contactCd = Math.max(0, this.contactCd - dt);
    const pl = G.player;

    // Ability locks are embodied checks. The generous radii recognize the
    // player's intent while still requiring the real verbs and their real
    // movement states.
    const pd = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    if (this.stage === 'dash' && pl.dashT > 0 && pd < 8.5) this._advance('lance');
    else if (this.stage === 'grapple' && pl.grappling && pl.pos.y > 3.2 && pd < 25) this._advance('glide');
    else if (this.stage === 'glide' && pl.gliding && pl.pos.y > 2.2 && pd < 27) this._advance('slam');

    // A wide, slow orbit leaves space to read attacks and use traversal.
    const a = this.t * (.18 + this.cycle * .025);
    const tx = this.arena.x + Math.cos(a) * (5 + this.cycle * 1.2);
    const tz = this.arena.z + Math.sin(a) * (5 + this.cycle * 1.2);
    this.pos.x = damp(this.pos.x, tx, 1.7, dt);
    this.pos.z = damp(this.pos.z, tz, 1.7, dt);
    this.pos.y = damp(this.pos.y, 7.5 + Math.sin(this.t * .9) * 1.2, 2.4, dt);

    this.attackT -= dt; this.radialT -= dt;
    if (this.attackT <= 0) { this.attackT = Math.max(.72, 1.55 - this.cycle * .18); this._attack(); }
    if (this.radialT <= 0) { this.radialT = Math.max(3.7, 6.2 - this.cycle * .65); this._radial(); }
    if (this.wave.visible) {
      this.wave.userData.r += dt * (10 + this.cycle * 2);
      const r = this.wave.userData.r; this.wave.scale.setScalar(r); this.wave.material.opacity = Math.max(0, .9 - r / 30);
      if (r > 30) this.wave.visible = false;
      else if (!this.wave.userData.hit && Math.abs(pd - r) < .75 && pl.grounded) {
        this.wave.userData.hit = true; pl.hurt(1, this.pos.x, this.pos.z);
      }
      if (!this.wave.visible) this.wave.userData.hit = false;
    }
    if (pd < 2.7 && Math.abs(pl.pos.y - this.pos.y) < 3 && this.contactCd <= 0) {
      if (pl.hurt(1, this.pos.x, this.pos.z)) this.contactCd = .9;
    }

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    this.shell.rotation.y += dt * (.32 + this.cycle * .12);
    this.orbits.rotation.x += dt * .09; this.orbits.rotation.y -= dt * (.18 + this.cycle * .05);
    this.crown.rotation.y += dt * .2;
    const flash = this.flashT / .15;
    this.core.material.emissiveIntensity = 1.1 + flash * 2.2 + (this.stage === 'vulnerable' ? .8 : 0);
    G.rovers?.request(this.pos.x, this.pos.y, this.pos.z, this.stage === 'vulnerable' ? [1, .66, .25] : [.58, .78, 1], 3 + flash * 2, 24);
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    G.save.finalDefeated = true; save();
    juice.slowmo('bossDeath'); juice.shake(1.4); juice.stop('boss');
    sfx('bossdie', { pitch: .72, gain: 1.3 });
    G.hud.bossHide(); music.setMode('interior');
    G.player.iFrames = Math.max(G.player.iFrames, 8);
    G.particles?.debris(this.pos.x, this.pos.y, this.pos.z, 56, [.72, .86, 1], { floorY: 0, power: 2, sizeMult: 2 });
    G.particles?.burst('soul', this.pos.x, this.pos.y, this.pos.z, 70, { color: [1, .72, .38], sizeMult: 2.4 });
    G.enemies.killAll('interior');
    this.mesh.visible = false; this.wave.visible = false; this.windWalls.visible = false;
    G.interiors?.onFinalDown?.();
    G.onFinalVictory?.();
  }

  debugDefeat() { this._die(); }

  dispose() {
    this.mesh.removeFromParent(); this.wave.removeFromParent(); this.windWalls.removeFromParent();
    if (!this.dead) { G.hud.bossHide(); music.setMode('interior'); }
  }
}

export function spawnFinalBoss(interior) {
  const boss = new FinalBoss(interior);
  G.boss = boss;
  return boss;
}

