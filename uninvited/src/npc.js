// The people in the house — a family of four, and the officer who ends the night.
// Simple low-poly figures, simple behaviour: each keeps to a zone, either pacing
// or busy at something, and murmurs lines that sound like a haunting and are
// only a frightened family. No real pathfinding: zones are open floor.
import * as THREE from 'three';
import { LINES, FAMILY } from './story.js';

function pivotLimb(mat, len, rad, sx) {
  const p = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len - rad * 2, 3, 6), mat);
  m.position.y = -len / 2;
  m.castShadow = true;
  p.add(m);
  return p;
}

// build a person out of primitives; returns a Group with limb pivots in userData
export function figure(M, spec) {
  const s = spec.child ? 0.64 : 1;
  const g = new THREE.Group();
  const skin = M[spec.skin] || M.skinLight;
  const hair = M[spec.hair] || M.hairDark;
  const cloth = M[spec.color] || M.clothNavy;

  const hipY = 0.9 * s, shoulderY = 1.4 * s, headY = 1.6 * s;

  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * s, 0.42 * s, 4, 8), cloth);
  torso.position.y = (hipY + shoulderY) / 2;
  torso.scale.z = 0.7;
  torso.castShadow = true;
  g.add(torso);
  // hips
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.19 * s, 0.14 * s, 3, 8), cloth);
  hips.position.y = hipY;
  hips.scale.z = 0.7;
  g.add(hips);

  // legs
  const legL = pivotLimb(cloth, 0.9 * s, 0.09 * s);
  legL.position.set(-0.1 * s, hipY, 0);
  const legR = pivotLimb(cloth, 0.9 * s, 0.09 * s);
  legR.position.set(0.1 * s, hipY, 0);
  g.add(legL, legR);

  // arms (from shoulders)
  const armL = pivotLimb(cloth, 0.62 * s, 0.07 * s);
  armL.position.set(-0.26 * s, shoulderY, 0);
  const armR = pivotLimb(cloth, 0.62 * s, 0.07 * s);
  armR.position.set(0.26 * s, shoulderY, 0);
  g.add(armL, armR);
  // hands
  for (const [arm, sx] of [[armL, -1], [armR, 1]]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6), skin);
    hand.position.y = -0.6 * s;
    arm.add(hand);
  }

  // neck + head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135 * s, 12, 12), skin);
  head.position.y = headY;
  head.scale.z = 0.92;
  head.castShadow = true;
  g.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.145 * s, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  hairCap.position.y = headY + 0.02 * s;
  g.add(hairCap);

  if (spec.police) {
    // hi-viz shoulders, a custodian cap, a torch
    const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.34, 4, 8), M.hiviz);
    vest.position.y = (hipY + shoulderY) / 2 + 0.03; vest.scale.z = 0.72;
    g.add(vest);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.13, 12), M.copHat);
    cap.position.y = headY + 0.14; g.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), M.copHat);
    brim.position.y = headY + 0.08; g.add(brim);
  }

  g.userData = { armL, armR, legL, legR, phase: 0, s };
  return g;
}

class NPC {
  constructor(ctx, def) {
    this.ctx = ctx;
    this.def = def;
    this.name = def.name;
    this.level = def.level;
    this.lines = def.lines.slice();
    this.g = def.group;
    this.floorY = def.floorY;
    this.pos = new THREE.Vector3(def.start.x, def.floorY, def.start.z);
    this.yaw = def.baseYaw ?? 0;
    this.mode = def.zone ? 'wander' : 'activity';   // a zone means they roam it
    this.zone = def.zone;
    this.speed = def.child ? 0.7 : 0.95;
    this.target = this._pick();
    this.wait = 0.5 + Math.random() * 2;
    this.sayT = 5 + Math.random() * 6;
    this.faceT = 0;             // >0 = turning to look at the player
    this.moving = false;
    this.li = Math.floor(Math.random() * this.lines.length);
    this.g.position.copy(this.pos);
    this.g.rotation.y = this.yaw;
  }

  _pick() {
    const z = this.zone;
    if (!z) return this.pos.clone();
    return new THREE.Vector3(
      z.x0 + Math.random() * (z.x1 - z.x0),
      this.floorY,
      z.z0 + Math.random() * (z.z1 - z.z0));
  }

  say(forced) {
    const line = this.lines[this.li % this.lines.length];
    this.li++;
    this.ctx.ui.say(this.name, line);
    this.ctx.audio.murmur?.(this.def.voice ?? 1);
    this.ctx.fx.fearTarget = Math.max(this.ctx.fx.fearTarget, forced ? 0.34 : 0.2);
    clearTimeout(this._fclr);
    this._fclr = setTimeout(() => { this.ctx.fx.fearTarget = 0; }, 2600);
  }

  update(dt, playerPos) {
    const sameLevel = this.ctx.world.levelAt(playerPos.y) === this.level;
    const dx = playerPos.x - this.pos.x, dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const near = sameLevel && dist < 7.5;

    // notice the intruder: stop, turn, speak
    if (near && this.faceT <= 0 && Math.random() < dt * 0.9) {
      this.faceT = 2.4 + Math.random() * 1.5;
      this.say(true);
    }
    if (this.faceT > 0) this.faceT -= dt;

    // ambient speech
    this.sayT -= dt;
    if (this.sayT <= 0) {
      this.sayT = 8 + Math.random() * 8;
      if (sameLevel && dist < 16) this.say(false);
    }

    let targetYaw = this.yaw;
    this.moving = false;

    if (this.faceT > 0) {
      // face the player, hold still
      targetYaw = Math.atan2(-dx, -dz);
    } else if (this.mode === 'wander') {
      const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z;
      const td = Math.hypot(tx, tz);
      if (td < 0.3) {
        this.wait -= dt;
        if (this.wait <= 0) { this.target = this._pick(); this.wait = 1 + Math.random() * 3; }
      } else {
        const step = Math.min(td, this.speed * dt);
        this.pos.x += (tx / td) * step;
        this.pos.z += (tz / td) * step;
        this.moving = true;
        targetYaw = Math.atan2(-tx, -tz);
      }
    }

    // smooth turn
    let d = targetYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 6);

    // animation
    const u = this.g.userData;
    if (this.moving) {
      u.phase += dt * 7;
      const sw = Math.sin(u.phase) * 0.5;
      u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
      u.armL.rotation.x = -sw * 0.7; u.armR.rotation.x = sw * 0.7;
    } else {
      u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
      // activity flourishes
      const t = (this.ctx._t7 || 0);
      if (this.def.activity === 'wash') {
        u.armL.rotation.x = -1.15 + Math.sin(t * 4) * 0.25;
        u.armR.rotation.x = -1.15 + Math.sin(t * 4 + 1) * 0.25;
      } else if (this.def.activity === 'phone') {
        u.armR.rotation.x = -0.2; u.armR.rotation.z = -2.4;   // hand to ear
        u.armL.rotation.x = Math.sin(t * 1.3) * 0.15;
      } else if (this.def.activity === 'doll') {
        u.armL.rotation.x = -1.5; u.armR.rotation.x = -1.5;    // cradling
      } else if (this.def.activity === 'play') {
        u.armR.rotation.x = -1.2 + Math.sin(t * 3.5) * 0.4;    // pushing a toy
      } else {
        u.armL.rotation.x *= 0.9; u.armR.rotation.x *= 0.9;
      }
    }

    this.g.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.g.rotation.y = this.yaw;
  }
}

export class NPCs {
  constructor(ctx) {
    this.ctx = ctx;
    const M = ctx.world.M, S = ctx.world.scene;
    this.list = [];

    const defs = [
      { key: 'mother', level: 'ground', floorY: 0, activity: 'wash', voice: 1.0,
        start: { x: 57.5, z: 33 }, baseYaw: -Math.PI / 2, lines: LINES.mother },
      { key: 'father', level: 'ground', floorY: 0, activity: 'phone', voice: 0.7,
        start: { x: 6, z: 21 }, baseYaw: 0, zone: { x0: 3, z0: 18, x1: 9, z1: 24 }, lines: LINES.father },
      { key: 'boy', level: 'ground', floorY: 0, activity: 'play', voice: 1.5, child: true,
        start: { x: 40, z: 7 }, baseYaw: Math.PI, lines: LINES.boy },
      { key: 'girl', level: 'first', floorY: 4.2, voice: 1.7, child: true,
        start: { x: 14, z: 27 }, baseYaw: Math.PI,
        zone: { x0: 5, z0: 26.4, x1: 25, z1: 27.8 }, activity: 'doll', lines: LINES.girl },
    ];

    for (const d of defs) {
      const fam = FAMILY[d.key];
      const g = figure(M, { skin: fam.skin, hair: fam.hair, color: fam.color, child: d.child });
      g.position.set(d.start.x, d.floorY, d.start.z);
      S.add(g);
      // a phone in the father's hand
      if (d.activity === 'phone') {
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.02), M.phoneGlow);
        g.userData.armR.add(phone); phone.position.set(0, -0.58, 0.04);
      }
      // a doll for the girl
      if (d.activity === 'doll') {
        const doll = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 3, 6), M.clothMustard);
        doll.position.set(0, 0.85, 0.22); g.add(doll);
      }
      const npc = new NPC(ctx, { ...d, group: g, name: fam.name });
      this.list.push(npc);
      // optional: face-to-face interaction
      ctx.interactions.add(g, () => `${fam.name}…`, () => npc.say(true));
    }

    // the officer — built, hidden until the finale
    this.officer = figure(M, { skin: 'skinLight', hair: 'hairDark', color: 'uniform', police: true });
    this.officer.visible = false;
    S.add(this.officer);
  }

  update(dt, playerPos) {
    this.ctx._t7 = (this.ctx._t7 || 0) + dt;
    for (const n of this.list) n.update(dt, playerPos);
  }
}
