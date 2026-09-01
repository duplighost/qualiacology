// Five optional apex ruins are guarded in the open world. These forecourt
// wardens are deliberately separate from canonical guardians and expedition
// bosses: they own their own save map, never write bossesDown/trialsDown, and
// never clean up unrelated world enemies. Their job is to make a few exterior
// approaches feel like true high-level encounters instead of another doorway.

import * as THREE from 'three';
import { G } from '../state.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { music } from '../core/music.js';
import { juice } from '../fx/juice.js';
import { clamp01, damp } from '../core/math.js';
import { TRIAL_DESTS } from './trialdata.js';
import { REGIONS } from './regions.js';

export const FORECOURT_DEFS = Object.freeze({
  mossglass: Object.freeze({
    name: 'THE ROOT-CROWNED HART', shape: 'hart', hp: 116, reward: 18,
    color: [0.42, 0.94, 0.66], radius: 2.2, hover: 0, arenaR: 16, speed: 4.2,
    attacks: [['aimed', 'charge'], ['aimed', 'charge', 'wave'], ['radial', 'charge', 'rain', 'wave']],
  }),
  ashenamphitheater: Object.freeze({
    name: 'THE GLASS CALDERA', shape: 'furnace', hp: 132, reward: 20,
    color: [1.0, 0.42, 0.16], radius: 2.45, hover: 0, arenaR: 17, speed: 3.8,
    attacks: [['radial', 'aimed'], ['radial', 'rain', 'charge'], ['radial', 'rain', 'wave', 'charge']],
  }),
  glacierossuary: Object.freeze({
    name: 'THE WHITE BELL-JAW', shape: 'maw', hp: 146, reward: 22,
    color: [0.66, 0.9, 1.0], radius: 2.5, hover: 1.4, arenaR: 18, speed: 3.6,
    attacks: [['aimed', 'wave'], ['aimed', 'rain', 'wave'], ['radial', 'rain', 'wave', 'charge']],
  }),
  capcathedral: Object.freeze({
    name: 'THE BLOOMING TYRANT', shape: 'bloom', hp: 160, reward: 24,
    color: [0.9, 0.42, 1.0], radius: 2.65, hover: 0.5, arenaR: 18, speed: 3.5,
    attacks: [['rain', 'aimed'], ['rain', 'radial', 'charge'], ['rain', 'radial', 'wave', 'charge']],
  }),
  suspendedtribunal: Object.freeze({
    name: 'THE LAST VERDICT', shape: 'verdict', hp: 178, reward: 30,
    color: [0.78, 0.58, 1.0], radius: 2.55, hover: 2.3, arenaR: 19, speed: 4.0,
    attacks: [['aimed', 'radial'], ['aimed', 'wave', 'rain'], ['radial', 'wave', 'rain', 'charge']],
  }),
});

const siteById = Object.fromEntries(TRIAL_DESTS.filter((d) => FORECOURT_DEFS[d.id]).map((d) => [d.id, d]));
const PHASES = [0.66, 0.33];

const standard = (color, dark = 0.34, emissive = 0.38) => {
  const c = new THREE.Color(...color);
  return new THREE.MeshStandardMaterial({
    color: c.clone().multiplyScalar(dark), emissive: c, emissiveIntensity: emissive,
    roughness: 0.62, metalness: 0.24, flatShading: true,
  });
};

const glow = (color, opacity = 0.9) => new THREE.MeshBasicMaterial({
  color: new THREE.Color(...color), transparent: opacity < 1, opacity,
  blending: THREE.AdditiveBlending, depthWrite: opacity >= 1, fog: false, toneMapped: false,
});

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildWarden(def) {
  const g = new THREE.Group();
  const armor = standard(def.color, 0.38, 0.42);
  const dark = standard(def.color, 0.13, 0.16);
  const hot = glow(def.color);
  const core = mesh(new THREE.OctahedronGeometry(0.62, 1), hot, 0, 3.25, 1.05);
  core.name = 'forecourt-core';
  g.add(core);

  if (def.shape === 'hart') {
    const chest = mesh(new THREE.DodecahedronGeometry(2.0, 1), armor, 0, 2.15, 0);
    chest.scale.set(1.05, 1.25, 0.82);
    g.add(chest);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const antler = mesh(new THREE.CylinderGeometry(0.1, 0.22, 3.2 + i * 0.45, 6), i % 2 ? armor : dark,
          side * (0.9 + i * 0.52), 4.4 + i * 0.48, -0.25);
        antler.rotation.z = side * (0.52 + i * 0.08);
        g.add(antler);
      }
      for (const z of [-0.65, 0.65]) {
        const leg = mesh(new THREE.CylinderGeometry(0.25, 0.38, 2.4, 7), dark, side * 1.2, 0.75, z);
        leg.rotation.z = side * 0.08;
        g.add(leg);
      }
    }
    g.userData.breathe = chest;
  } else if (def.shape === 'furnace') {
    const body = mesh(new THREE.CylinderGeometry(2.25, 2.8, 4.8, 10), dark, 0, 2.4, 0);
    g.add(body);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const plate = mesh(new THREE.BoxGeometry(1.25, 0.42, 2.0), i % 3 ? armor : hot,
        Math.cos(a) * 2.45, 2.65 + Math.sin(i * 1.7) * 1.15, Math.sin(a) * 2.0);
      plate.rotation.y = -a;
      g.add(plate);
    }
    const crown = mesh(new THREE.TorusGeometry(3.25, 0.22, 7, 28), hot, 0, 5.3, 0);
    crown.rotation.x = Math.PI / 2;
    g.add(crown);
    g.userData.spin = crown;
    g.userData.breathe = body;
  } else if (def.shape === 'maw') {
    const skull = mesh(new THREE.SphereGeometry(2.45, 14, 9), armor, 0, 2.75, 0);
    skull.scale.set(1.12, 0.76, 0.95);
    g.add(skull);
    for (const side of [-1, 1]) {
      const jaw = mesh(new THREE.BoxGeometry(2.5, 0.46, 2.5), dark, side * 1.2, 1.55, 0.45);
      jaw.rotation.z = side * 0.2;
      g.add(jaw);
    }
    for (let i = 0; i < 12; i++) {
      const tooth = mesh(new THREE.ConeGeometry(0.16, 1.1 + (i % 3) * 0.25, 6), hot,
        -2.0 + i * 0.36, 2.05 + Math.sin(i) * 0.16, 1.3);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }
    g.userData.breathe = skull;
  } else if (def.shape === 'bloom') {
    const trunk = mesh(new THREE.CylinderGeometry(1.25, 2.1, 5.4, 9), dark, 0, 2.7, 0);
    g.add(trunk);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const petal = mesh(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? armor : hot,
        Math.cos(a) * 2.45, 5.15 + Math.sin(i * 2) * 0.36, Math.sin(a) * 2.45);
      petal.scale.set(1.2, 0.38, 0.72);
      petal.rotation.y = -a;
      g.add(petal);
    }
    const cap = new THREE.Group();
    cap.position.y = 4.8;
    g.add(cap);
    g.userData.spin = cap;
    g.userData.breathe = trunk;
  } else {
    const monolith = mesh(new THREE.OctahedronGeometry(2.65, 0), armor, 0, 2.9, 0);
    monolith.scale.set(0.82, 1.6, 0.78);
    g.add(monolith);
    const orrery = new THREE.Group();
    orrery.position.y = 3.0;
    for (let i = 0; i < 4; i++) {
      const ring = mesh(new THREE.TorusGeometry(3.3 + i * 0.72, 0.13, 6, 28), i % 2 ? hot : armor);
      ring.rotation.set(i * 0.7, i * 0.52, i * 0.31);
      orrery.add(ring);
    }
    g.add(orrery);
    g.userData.spin = orrery;
    g.userData.breathe = monolith;
  }

  const halo = mesh(new THREE.TorusGeometry(def.radius * 1.45, 0.12, 6, 30), hot, 0, 3.2, 0);
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  g.userData.halo = halo;
  g.userData.core = core;
  return g;
}

function buildSeal(dest, def) {
  const g = new THREE.Group();
  g.name = `forecourt-seal-${dest.id}`;
  g.position.set(dest.x, dest.y, dest.z);
  const key = new THREE.Color(...def.color);
  const mat = new THREE.MeshBasicMaterial({
    color: key, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, toneMapped: false,
  });
  const ring = mesh(new THREE.TorusGeometry(6.6, 0.16, 6, 36), mat, 0, 8.5, 12);
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const shard = mesh(new THREE.OctahedronGeometry(0.65 + (i % 2) * 0.22, 0), mat,
      Math.cos(a) * 7.3, 5.2 + (i % 3) * 2.3, 12 + Math.sin(a) * 6.3);
    shard.scale.y = 2.4;
    g.add(shard);
  }
  g.userData.ring = ring;
  return g;
}

class ForecourtBoss {
  constructor(site, def, scene, onDown) {
    this.site = site;
    this.key = `forecourt:${site.id}`;
    this.def = def;
    this.scene = scene;
    this.onDown = onDown;
    // Trial doors face +z. Keep the giant physically in the forecourt where
    // the approaching player can see and fight it, never hidden inside the
    // destination shell it is meant to guard.
    this.arena = { x: site.x, y: site.y, z: site.z + 18 };
    this.pos = new THREE.Vector3(site.x, site.y + def.hover, site.z + 18);
    this.vel = new THREE.Vector3();
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.phase = 0;
    this.dead = false;
    this.finalStand = false;
    this.requiresAbilities = true; // lets seekers damage and home to the weak core
    this.t = 0;
    this.flashT = 0;
    this.contactCd = 0;
    this.idleT = 1.8;
    this.attack = null;
    this.bag = [];
    this.marks = [];
    this.mesh = buildWarden(def);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
    this.materials = [];
    this.mesh.traverse((o) => {
      if (o.isMesh && o.material?.emissive !== undefined) {
        this.materials.push({ mat: o.material, base: o.material.emissiveIntensity });
      }
    });
    this.wave = mesh(new THREE.TorusGeometry(1, 0.12, 7, 40), glow(def.color, 0.74));
    this.wave.rotation.x = Math.PI / 2;
    this.wave.visible = false;
    scene.add(this.wave);

    G.hud?.bossShow(def.name);
    G.hud?.challengeStart({
      id: this.key, label: `${site.name} · FORECOURT`, total: 3, value: 0, detail: 'BREAK THE WARDEN',
    });
    music.setMode('boss');
    sfx('bossroar', { pitch: 0.72, gain: 1.15 });
    juice.shake(0.55);
  }

  hitSpheres() {
    return [
      { x: this.pos.x, y: this.pos.y + 2.6, z: this.pos.z, r: this.def.radius, part: 'body', boss: this },
      { x: this.pos.x, y: this.pos.y + 3.25, z: this.pos.z + 1.05, r: 0.72, part: 'core', boss: this },
    ];
  }

  testHit(x, y, z, r) {
    return this.hitSpheres().some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < s.r + r);
  }

  onHit(sphere, damage, opts = {}) {
    if (this.dead) return;
    const core = sphere?.part === 'core';
    this.hp -= damage * (core ? 2 : 1);
    this.flashT = 0.16;
    G.hud?.bossSet(clamp01(this.hp / this.maxHp));
    G.hud?.hitPip();
    sfx('hit', { pitch: core ? 1.62 : 0.72 });
    G.particles?.burst('impact', opts.point?.x ?? this.pos.x, opts.point?.y ?? this.pos.y + 2, opts.point?.z ?? this.pos.z,
      core ? 13 : 6, { color: this.def.color, sizeMult: core ? 1.35 : 1, dir: opts.dir });
    while (this.phase < PHASES.length && this.hp / this.maxHp <= PHASES[this.phase]) {
      this.phase++;
      this._surge();
    }
    if (!this.finalStand && this.hp > 0 && this.hp / this.maxHp <= 0.14) {
      this.finalStand = true;
      this._surge(true);
    }
    if (this.hp <= 0) this._die();
  }

  onAbility(kind, at) {
    if (this.dead || kind !== 'slam') return;
    const d = Math.hypot(at.x - this.pos.x, at.z - this.pos.z);
    if (d < 5.8) this.onHit({ part: 'body' }, 3, { kind: 'slam', point: { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z } });
  }

  _surge(final = false) {
    this._clearMarks();
    this.wave.visible = false;
    this.attack = null;
    this.idleT = final ? 0.45 : 1.05;
    juice.slowmo('bossPhase');
    juice.shake(final ? 0.85 : 0.58);
    sfx('bossroar', { pitch: final ? 1.35 : 0.92 + this.phase * 0.15, gain: 1.05 });
    G.particles?.burst('impact', this.pos.x, this.pos.y + 2.4, this.pos.z, 30,
      { color: this.def.color, sizeMult: final ? 2.2 : 1.7 });
    G.hud?.challengeUpdate({
      id: this.key, label: `${this.site.name} · FORECOURT`, total: 3, value: Math.min(2, this.phase),
      detail: final ? 'FINAL STAND' : `WARDEN PHASE ${this.phase + 1}`,
    });
  }

  _dealAttack() {
    const set = this.def.attacks[Math.min(this.phase, this.def.attacks.length - 1)];
    if (!this.bag.length) this.bag = [...set].sort(() => Math.random() - 0.5);
    this.attack = { name: this.bag.pop(), t: 0, data: {} };
  }

  _finishAttack(gap = 0.78) {
    this.attack = null;
    this.idleT = (this.finalStand ? 0.36 : gap) + Math.random() * 0.28;
  }

  _updateAttack(dt) {
    const a = this.attack;
    const pl = G.player;
    const rate = this.finalStand ? 1.28 : 1 + this.phase * 0.07;
    a.t += dt * rate;

    if (a.name === 'aimed') {
      const count = 3 + this.phase * 2;
      if (a.t > 0.38 && (a.data.shots || 0) < count && a.t > 0.38 + (a.data.shots || 0) * 0.2) {
        a.data.shots = (a.data.shots || 0) + 1;
        G.projectiles?.enemyBolt(this.pos.x, this.pos.y + 3.0, this.pos.z, pl, 13.5 + this.phase * 1.6,
          this.def.color, (a.data.shots - (count + 1) / 2) * 0.035);
        sfx('enemyshoot', { pitch: 0.62 + a.data.shots * 0.04 });
      }
      if (a.t > 0.9 + count * 0.2) this._finishAttack();
      return;
    }

    if (a.name === 'radial') {
      if (!a.data.fired && a.t > 0.65) {
        a.data.fired = true;
        const n = 14 + this.phase * 4;
        sfx('turret', { pitch: 0.66 });
        for (let i = 0; i < n; i++) {
          const ang = i / n * Math.PI * 2 + this.t * 0.12;
          const b = G.projectiles?.boltPool.obtain();
          if (!b) break;
          b.x = this.pos.x; b.y = this.pos.y + 2.2; b.z = this.pos.z;
          b.vx = Math.cos(ang) * 9.5; b.vy = Math.sin(i * 2.1) * 0.38; b.vz = Math.sin(ang) * 9.5;
          b.life = 4; b.fromPlayer = false; b.seek = false; b.damage = 1;
          b.mesh.visible = true; b.mesh.material.color.setRGB(...this.def.color); b.mesh.scale.setScalar(1.25);
        }
      }
      if (a.t > 1.2) this._finishAttack(0.92);
      return;
    }

    if (a.name === 'wave') {
      if (!a.data.started) {
        a.data.started = true;
        a.data.r = 0.5;
        this.wave.visible = true;
        sfx('slam', { pitch: 0.7 });
      }
      a.data.r += dt * (10.2 + this.phase * 1.4);
      this.wave.position.set(this.pos.x, this.site.y + 0.22, this.pos.z);
      this.wave.scale.setScalar(a.data.r);
      this.wave.material.opacity = clamp01(1.15 - a.data.r / (this.def.arenaR * 1.5));
      const d = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
      if (!a.data.hit && Math.abs(d - a.data.r) < 0.72 && pl.grounded && pl.pos.y < this.site.y + 1.6) {
        a.data.hit = true;
        pl.hurt(1, this.pos.x, this.pos.z);
      }
      if (a.data.r > this.def.arenaR * 1.55) {
        this.wave.visible = false;
        this._finishAttack(0.66);
      }
      return;
    }

    if (a.name === 'rain') {
      if (!a.data.marks) {
        a.data.marks = [];
        const count = 5 + this.phase;
        for (let i = 0; i < count; i++) {
          const onPlayer = i < 2;
          const x = onPlayer ? pl.pos.x + (i ? pl.vel.x * 0.42 : 0) : this.arena.x + (Math.random() * 2 - 1) * this.def.arenaR * 0.8;
          const z = onPlayer ? pl.pos.z + (i ? pl.vel.z * 0.42 : 0) : this.arena.z + (Math.random() * 2 - 1) * this.def.arenaR * 0.8;
          const mark = mesh(new THREE.TorusGeometry(1.6, 0.09, 6, 28), glow(this.def.color, 0.62), x, this.site.y + 0.12, z);
          mark.rotation.x = Math.PI / 2;
          this.scene.add(mark);
          this.marks.push(mark);
          a.data.marks.push({ x, z, mark });
        }
        sfx('charge', { pitch: 0.62 });
      }
      for (const m of a.data.marks) m.mark.material.opacity = 0.28 + Math.sin(a.t * 22) * 0.24;
      if (a.t > 1.02 && !a.data.boom) {
        a.data.boom = true;
        for (const m of a.data.marks) {
          G.projectiles?.explode(m.x, this.site.y + 0.35, m.z, 2.25, this.def.color, { hurtPlayer: 1 });
          m.mark.removeFromParent();
          m.mark.geometry?.dispose?.();
          m.mark.material?.dispose?.();
        }
        this.marks.length = 0;
        sfx('slam', { pitch: 1.15 });
      }
      if (a.t > 1.4) this._finishAttack(0.72);
      return;
    }

    if (a.name === 'charge') {
      if (!a.data.dir) {
        a.data.dir = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z).normalize();
        this.wave.visible = true;
        this.wave.position.set(this.pos.x, this.site.y + 0.2, this.pos.z);
        this.wave.scale.setScalar(2.2);
        sfx('charge', { pitch: 0.54 });
      }
      if (a.t < 0.58) {
        this.vel.multiplyScalar(0.86);
        this.wave.material.opacity = 0.28 + Math.sin(a.t * 28) * 0.2;
      } else if (a.t < 1.18) {
        this.wave.visible = false;
        this.vel.x = a.data.dir.x * this.def.speed * 5.4;
        this.vel.z = a.data.dir.z * this.def.speed * 5.4;
      } else {
        this.wave.visible = false;
        this._finishAttack(0.9);
      }
    }
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    G.save.worldBossesDown ||= {};
    G.save.worldBossesDown[this.site.id] = true;
    save();
    this._clearMarks();
    this.wave.visible = false;
    G.hud?.bossHide();
    G.hud?.challengeComplete({
      id: this.key, label: `${this.site.name} · FORECOURT`, total: 3,
      detail: `WARDEN BROKEN · +${this.def.reward} ASTER`, holdMs: 3600,
    });
    G.constellation?.collect(this.def.reward);
    G.hud?.reward({
      kind: 'FORECOURT CONQUERED', name: this.def.name,
      detail: `+${this.def.reward} ASTER · EXPEDITION UNSEALED`, duration: 4300,
    });
    G.player.iFrames = Math.max(G.player.iFrames, 4);
    // The win is a clean beat: lingering hostile bolts cannot cheap-shot the
    // player while the boss is shattering and the reward card is on screen.
    G.projectiles?.boltPool.update((bolt) => {
      if (bolt.fromPlayer) return true;
      bolt.mesh.visible = false;
      return false;
    });
    music.setMode('world');
    juice.slowmo('bossDeath');
    juice.shake(1.25);
    sfx('bossdie', { pitch: 0.78, gain: 1.2 });
    G.particles?.debris(this.pos.x, this.pos.y + 2.2, this.pos.z, 36, this.def.color,
      { floorY: this.site.y, power: 1.75, sizeMult: 1.75 });
    G.particles?.burst('soul', this.pos.x, this.pos.y + 2.4, this.pos.z, 34,
      { color: this.def.color, sizeMult: 2 });
    this.mesh.visible = false;
    this.onDown?.(this);
    G.onBossDown?.(this.key);
  }

  _clearMarks() {
    for (const mark of this.marks) {
      mark.removeFromParent();
      mark.geometry?.dispose?.();
      mark.material?.dispose?.();
    }
    this.marks.length = 0;
  }

  update(dt) {
    if (this.dead) return;
    const pl = G.player;
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.contactCd = Math.max(0, this.contactCd - dt);

    const charging = this.attack?.name === 'charge' && this.attack.t >= 0.58 && this.attack.t < 1.18;
    if (!charging) {
      const a = this.t * (0.32 + this.phase * 0.07);
      const tx = this.arena.x + Math.cos(a) * 4.1;
      const tz = this.arena.z + Math.sin(a) * 4.1;
      this.vel.x = damp(this.vel.x, (tx - this.pos.x) * 1.05, 3.4, dt);
      this.vel.z = damp(this.vel.z, (tz - this.pos.z) * 1.05, 3.4, dt);
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const ad = Math.hypot(this.pos.x - this.arena.x, this.pos.z - this.arena.z);
    if (ad > this.def.arenaR) {
      this.pos.x = this.arena.x + (this.pos.x - this.arena.x) / ad * this.def.arenaR;
      this.pos.z = this.arena.z + (this.pos.z - this.arena.z) / ad * this.def.arenaR;
    }
    this.pos.z = Math.max(this.site.z + 9.5, this.pos.z);
    const targetY = this.site.y + this.def.hover + (this.def.hover ? Math.sin(this.t * 1.35) * 0.45 : 0);
    this.pos.y = damp(this.pos.y, targetY, 4.2, dt);

    if (!this.attack) {
      this.idleT -= dt;
      if (this.idleT <= 0) this._dealAttack();
    } else {
      this._updateAttack(dt);
    }

    const d = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    if (d < this.def.radius + 0.8 && this.contactCd <= 0 && Math.abs(pl.pos.y - this.pos.y) < 4) {
      if (pl.hurt(1, this.pos.x, this.pos.z)) this.contactCd = 0.9;
    }

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.y += dt * (0.7 + this.phase * 0.42);
    if (this.mesh.userData.halo) this.mesh.userData.halo.rotation.z += dt * (0.55 + this.phase * 0.3);
    if (this.mesh.userData.breathe) {
      const pulse = 1 + Math.sin(this.t * 2.5) * 0.045;
      this.mesh.userData.breathe.scale.multiplyScalar(pulse / (this.mesh.userData.lastPulse || 1));
      this.mesh.userData.lastPulse = pulse;
    }
    const flash = this.flashT / 0.16;
    for (const m of this.materials) m.mat.emissiveIntensity = m.base + flash * 1.7;
    G.rovers?.request(this.pos.x, this.pos.y + 3, this.pos.z, this.def.color, 2.4 + flash * 2.6, 22);
  }

  dispose({ resetProjectiles = true } = {}) {
    this._clearMarks();
    this.mesh.removeFromParent();
    this.wave.removeFromParent();
    this.mesh.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material && !Array.isArray(o.material)) o.material.dispose?.();
    });
    this.wave.geometry?.dispose?.();
    this.wave.material?.dispose?.();
    if (resetProjectiles) G.projectiles?.setScene(G.worldScene);
    if (!this.dead) {
      G.hud?.bossHide();
      G.hud?.challengeHide(this.key);
      music.setMode('world');
    }
  }
}

export class WorldBosses {
  constructor(scene) {
    this.scene = scene;
    this.active = null;
    this.blockedT = 0;
    this.seals = new Map();
    G.save.worldBossesDown ||= {};
    for (const [id, def] of Object.entries(FORECOURT_DEFS)) {
      const site = siteById[id];
      if (!site) continue;
      const seal = buildSeal(site, def);
      seal.visible = !G.save.worldBossesDown[id];
      scene.add(seal);
      this.seals.set(id, seal);
    }
  }

  isSealed(dest) {
    return !!(FORECOURT_DEFS[dest?.id] && !G.save.worldBossesDown?.[dest.id]);
  }

  blocked(dest) {
    if (!this.isSealed(dest) || this.blockedT > 0) return;
    this.blockedT = 1.4;
    G.hud?.whisper('THE FORECOURT WARDEN LIVES', 1.7);
    sfx('bossroar', { pitch: 1.7, gain: 0.32 });
  }

  _spawn(site, def) {
    if (this.active || G.boss) return;
    const boss = new ForecourtBoss(site, def, this.scene, (deadBoss) => this._onDown(deadBoss));
    this.active = boss;
    G.boss = boss;
  }

  _onDown(boss) {
    const seal = this.seals.get(boss.site.id);
    if (seal) {
      seal.visible = false;
      G.particles?.burst('impact', boss.site.x, boss.site.y + 8, boss.site.z, 28,
        { color: boss.def.color, sizeMult: 2.2 });
    }
    // Leave the dead object in G.boss only until the current damage call
    // unwinds; update() disposes it on the following render frame.
  }

  onPlayerDeath() {
    if (!this.active) return;
    const boss = this.active;
    this.active = null;
    if (G.boss === boss) G.boss = null;
    boss.dispose();
  }

  update(dt, t) {
    this.blockedT = Math.max(0, this.blockedT - dt);
    for (const [id, seal] of this.seals) {
      const down = !!G.save.worldBossesDown?.[id];
      seal.visible = !down;
      if (!down && seal.visible) {
        seal.userData.ring.rotation.z = t * 0.13;
        seal.rotation.y = Math.sin(t * 0.31 + id.length) * 0.08;
      }
    }
    if (G.mode !== 'world') return;

    if (this.active) {
      const boss = this.active;
      if (boss.dead) {
        this.active = null;
        if (G.boss === boss) G.boss = null;
        boss.dispose({ resetProjectiles: false });
        return;
      }
      const d = Math.hypot(G.player.pos.x - boss.site.x, G.player.pos.z - boss.site.z);
      if (d > 64) {
        this.active = null;
        if (G.boss === boss) G.boss = null;
        boss.dispose();
      }
      return;
    }

    if (G.boss) return;
    let nearest = null;
    let nearestD = Infinity;
    for (const [id, def] of Object.entries(FORECOURT_DEFS)) {
      if (G.save.worldBossesDown?.[id]) continue;
      const site = siteById[id];
      if (!site) continue;
      const d = Math.hypot(G.player.pos.x - site.x, G.player.pos.z - site.z);
      if (d < 34 && d < nearestD) { nearest = { site, def }; nearestD = d; }
    }
    if (nearest) this._spawn(nearest.site, nearest.def);
  }

  snapshot() {
    return {
      total: Object.keys(FORECOURT_DEFS).length,
      down: { ...(G.save.worldBossesDown || {}) },
      sealed: Object.keys(FORECOURT_DEFS).filter((id) => !G.save.worldBossesDown?.[id]),
      active: this.active ? {
        id: this.active.site.id, key: this.active.key, name: this.active.def.name,
        hp: this.active.hp, maxHp: this.active.maxHp, phase: this.active.phase,
      } : null,
    };
  }
}
