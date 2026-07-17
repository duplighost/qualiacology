// The people in the house — a family of four, and the officer who ends the night.
// Simple low-poly figures, simple behaviour: each keeps to a zone, either pacing
// or busy at something, and murmurs lines that sound like a haunting and are
// only a frightened family. No real pathfinding: zones are open floor.
import * as THREE from 'three';
import { LINES, FAMILY } from './story.js';

// build a person out of primitives; returns a Group with limb pivots in userData.
// spec: { skin, hair, color, legs, child, female, longHair, broad, police, h }
// The figure faces its local -z. Pivot API (armL/armR/legL/legR) is stable — the
// walk/activity animation in this file, scares.js and events.js all drive it.
export function figure(M, spec) {
  const s = (spec.child ? 0.62 : 1) * (spec.h || 1);
  const broad = spec.broad ? 1.14 : 1;
  const g = new THREE.Group();
  const skin = M[spec.skin] || M.skinLight;
  const hair = M[spec.hair] || M.hairDark;
  const cloth = M[spec.color] || M.clothNavy;
  const legMat = M[spec.legs] || cloth;
  const eyeMat = M.screenOff;                    // glossy near-black: catches the torch

  const hipY = 0.92 * s, shoulderY = 1.42 * s, headY = 1.62 * s;
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };

  // torso from stacked blocks: pelvis, tapered waist, broad chest + rounded
  // shoulders — a clear human silhouette instead of one smooth tube
  const blk = (w, h, d, mat, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  blk(0.34 * s, 0.2 * s, 0.23 * s, legMat, hipY - 0.02 * s);                 // pelvis
  blk(0.3 * s * broad, 0.26 * s, 0.21 * s, cloth, hipY + 0.19 * s);          // waist
  blk(0.44 * s * broad, 0.32 * s, 0.23 * s, cloth, shoulderY - 0.14 * s);    // chest + shoulders
  for (const sx of [-1, 1]) {                                               // shoulder caps
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.092 * s, 10, 8), cloth);
    cap.position.set(sx * 0.205 * s * broad, shoulderY - 0.03 * s, 0);
    cap.castShadow = true; g.add(cap);
  }

  // neck + head, with a face on the -z side
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.062 * s, 0.1 * s, 8), skin), 0, shoulderY + 0.05 * s, 0);
  const headG = new THREE.Group();
  headG.position.set(0, headY, 0);
  g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.132 * s, 14, 12), skin);
  head.scale.set(0.94, 1.06, 0.9);
  head.castShadow = true;
  headG.add(head);
  // a real face: white eyes with dark pupils, brows, a nose, ears
  const scleraMat = M.tileWhite || skin;
  for (const sx of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(spec.child ? 0.024 * s : 0.021 * s, 7, 6), scleraMat);
    sclera.position.set(sx * 0.047 * s, 0.012 * s, -0.104 * s);
    sclera.scale.z = 0.55;
    headG.add(sclera);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(spec.child ? 0.012 * s : 0.01 * s, 6, 5), eyeMat);
    pupil.position.set(sx * 0.047 * s, 0.012 * s, -0.118 * s);
    headG.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045 * s, 0.012 * s, 0.014 * s), hair);
    brow.position.set(sx * 0.049 * s, 0.052 * s, -0.112 * s);
    brow.rotation.z = sx * -0.12;
    headG.add(brow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028 * s, 6, 5), skin);
    ear.position.set(sx * 0.124 * s, -0.005 * s, -0.01 * s);
    ear.scale.set(0.5, 1, 0.7);
    headG.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.026 * s, 0.045 * s, 0.03 * s), skin);
  nose.position.set(0, -0.03 * s, -0.124 * s);
  headG.add(nose);
  // hair: cap for everyone; long back fall + side strands for longHair
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.142 * s, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
  cap.position.y = 0.022 * s;
  cap.scale.z = 0.94;
  headG.add(cap);
  if (spec.longHair) {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.085 * s, 0.24 * s, 3, 8), hair);
    back.position.set(0, -0.12 * s, 0.1 * s);
    back.scale.z = 0.6;
    headG.add(back);
    for (const sx of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035 * s, 0.2 * s, 3, 6), hair);
      strand.position.set(sx * 0.115 * s, -0.1 * s, 0.03 * s);
      headG.add(strand);
    }
  }

  // arms: shoulder pivot -> upper arm -> ELBOW pivot -> forearm + hand.
  // The elbow is what lets poses read as human (hand to ear, cradling, scrubbing)
  // instead of a rigid oar swinging from the shoulder.
  const arm = (sx) => {
    const p = new THREE.Group();
    p.position.set(sx * 0.21 * s * broad, shoulderY - 0.02 * s, 0);
    g.add(p);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.058 * s, 0.2 * s, 4, 8), cloth);
    upper.position.y = -0.15 * s; upper.castShadow = true; p.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3 * s;
    p.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.046 * s, 0.17 * s, 4, 8), cloth);
    fore.position.y = -0.13 * s; fore.castShadow = true; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 8), skin);
    hand.scale.set(0.8, 1.1, 0.9);
    hand.position.y = -0.27 * s; elbow.add(hand);
    elbow.rotation.x = -0.22;                     // a natural resting bend
    p.userData.elbow = elbow;
    return p;
  };
  const armL = arm(-1), armR = arm(1);

  // legs: hip pivot -> thigh -> KNEE pivot -> shin + foot
  const leg = (sx) => {
    const p = new THREE.Group();
    p.position.set(sx * 0.095 * s, hipY - 0.02 * s, 0);
    g.add(p);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.078 * s, 0.3 * s, 4, 8), legMat);
    thigh.position.y = -0.2 * s; thigh.castShadow = true; p.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42 * s;
    p.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.058 * s, 0.28 * s, 4, 8), legMat);
    shin.position.y = -0.18 * s; shin.castShadow = true; knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 0.055 * s, 0.19 * s), M.hairDark);
    foot.position.set(0, -0.43 * s, -0.045 * s); knee.add(foot);
    p.userData.knee = knee;
    return p;
  };
  const legL = leg(-1), legR = leg(1);

  // a nightdress/robe silhouette over the legs
  if (spec.female) {
    const skirtMat = new THREE.MeshStandardMaterial({ color: cloth.color, roughness: 1, side: THREE.DoubleSide });
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.24 * s, 0.7 * s, 12, 1, true), skirtMat);
    skirt.position.y = hipY - 0.28 * s;
    skirt.castShadow = true;
    g.add(skirt);
  }

  if (spec.police) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46 * s * broad, 0.5 * s, 0.25 * s), M.hiviz);
    vest.position.y = shoulderY - 0.2 * s;
    vest.castShadow = true;
    g.add(vest);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * s, 0.19 * s, 0.07 * s, 12), M.copHat);
    belt.position.y = hipY + 0.05 * s; belt.scale.z = 0.75; g.add(belt);
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.08 * s, 0.03 * s), M.copHat);
    radio.position.set(0.12 * s, shoulderY - 0.04 * s, -0.13 * s); g.add(radio);
    const cop = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * s, 0.135 * s, 0.12 * s, 12), M.copHat);
    cop.position.y = 0.12 * s; headG.add(cop);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.165 * s, 0.165 * s, 0.028 * s, 12), M.copHat);
    brim.position.y = 0.06 * s; headG.add(brim);
  }

  g.userData = {
    armL, armR, legL, legR, phase: 0, s,
    elbowL: armL.userData.elbow, elbowR: armR.userData.elbow,
    kneeL: legL.userData.knee, kneeR: legR.userData.knee,
  };
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

  // people don't walk through walls: test a candidate step against the world's
  // wall/door colliders (radius 0.26, torso band)
  _blocked(x, z) {
    const y0 = this.floorY + 0.25, y1 = this.floorY + 1.5, r = 0.26;
    for (const cl of this.ctx.world.colliders) {
      if (cl.max.y <= y0 || cl.min.y >= y1) continue;
      if (x + r > cl.min.x && x - r < cl.max.x && z + r > cl.min.z && z - r < cl.max.z) return true;
    }
    return false;
  }

  say(forced) {
    // no subtitle — the family are heard as muffled voices through the house,
    // never spelled out. The words only land, in hindsight, at the arrest.
    this.ctx.audio.murmur?.(this.def.voice ?? 1);
    this.ctx.fx.fearTarget = Math.max(this.ctx.fx.fearTarget, forced ? 0.34 : 0.2);
    clearTimeout(this._fclr);
    const floor = forced ? 0.34 : 0.2;
    this._fclr = setTimeout(() => {
      // don't stomp the scripted dread ramp or the finale — only clear our own murmur unease
      if (!this.ctx.events.finale.active && this.ctx.fx.fearTarget <= floor) this.ctx.fx.fearTarget = 0;
    }, 2600);
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
        const nx = this.pos.x + (tx / td) * step, nz = this.pos.z + (tz / td) * step;
        if (this._blocked(nx, nz)) {
          // a wall (or a shut door) is in the way — give up on this spot
          this.target = this._pick();
        } else {
          this.pos.x = nx; this.pos.z = nz;
          this.moving = true;
          targetYaw = Math.atan2(-tx, -tz);
        }
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
      // knees flex on the back-swing, elbows relax — reads as a gait, not oars
      if (u.kneeL) { u.kneeL.rotation.x = Math.max(0, -Math.sin(u.phase)) * 0.7; u.kneeR.rotation.x = Math.max(0, Math.sin(u.phase)) * 0.7; }
      if (u.elbowL) {
        u.elbowL.rotation.x = -0.35;
        // a man pacing on a call keeps the phone half-raised
        u.elbowR.rotation.x = this.def.activity === 'phone' ? -1.35 : -0.35;
        if (this.def.activity === 'phone') u.armR.rotation.x = Math.min(u.armR.rotation.x, -0.15);
      }
    } else {
      u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
      if (u.kneeL) { u.kneeL.rotation.x *= 0.85; u.kneeR.rotation.x *= 0.85; }
      // activity flourishes — all elbow-driven now, so the hands land where hands go
      const t = (this.ctx._t7 || 0);
      if (this.def.activity === 'wash') {
        u.armL.rotation.x = -0.55 + Math.sin(t * 4) * 0.12;
        u.armR.rotation.x = -0.55 + Math.sin(t * 4 + 1) * 0.12;
        if (u.elbowL) { u.elbowL.rotation.x = -0.85 + Math.sin(t * 4) * 0.2; u.elbowR.rotation.x = -0.85 + Math.sin(t * 4 + 1) * 0.2; }
      } else if (this.def.activity === 'phone') {
        // hand to the ear: upper arm slightly forward and tucked, forearm folded up
        u.armR.rotation.x = -0.5; u.armR.rotation.z = -0.28;
        if (u.elbowR) u.elbowR.rotation.x = -2.05;
        u.armL.rotation.x = Math.sin(t * 1.3) * 0.15;
        if (u.elbowL) u.elbowL.rotation.x = -0.25;
      } else if (this.def.activity === 'doll') {
        // cradling: both arms folded across the chest
        u.armL.rotation.x = -0.65; u.armR.rotation.x = -0.65;
        if (u.elbowL) { u.elbowL.rotation.x = -1.6; u.elbowR.rotation.x = -1.6; }
      } else if (this.def.activity === 'play') {
        u.armR.rotation.x = -0.7 + Math.sin(t * 3.5) * 0.3;    // pushing a toy
        if (u.elbowR) u.elbowR.rotation.x = -0.5;
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
      { key: 'mother', level: 'ground', floorY: 0, activity: 'wash', voice: 1.25,
        start: { x: 57.5, z: 33 }, baseYaw: -Math.PI / 2, lines: LINES.mother },
      { key: 'father', level: 'ground', floorY: 0, activity: 'phone', voice: 0.7,
        start: { x: 6, z: 21 }, baseYaw: 0, zone: { x0: 4.8, z0: 18.5, x1: 9, z1: 23 }, lines: LINES.father },   // clear of the desk + armchair
      { key: 'boy', level: 'ground', floorY: 0, activity: 'play', voice: 1.5, child: true,
        start: { x: 40, z: 7 }, baseYaw: Math.PI, lines: LINES.boy },
      { key: 'girl', level: 'first', floorY: 4.2, voice: 1.7, child: true,
        start: { x: 14, z: 27 }, baseYaw: Math.PI,
        zone: { x0: 5, z0: 26.4, x1: 25, z1: 27.8 }, activity: 'doll', lines: LINES.girl },
    ];

    for (const d of defs) {
      const fam = FAMILY[d.key];
      const g = figure(M, fam);
      g.position.set(d.start.x, d.floorY, d.start.z);
      S.add(g);
      // a phone in the father's hand — attached to the FOREARM so the elbow
      // fold carries it to his ear, not into his skull
      if (d.activity === 'phone') {
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.02), M.phoneGlow);
        g.userData.elbowR.add(phone); phone.position.set(-0.02, -0.28, -0.03);
      }
      // a doll cradled by the girl (figures face -z)
      if (d.activity === 'doll') {
        const doll = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 3, 6), M.clothMustard);
        doll.position.set(0, 0.8, -0.2); g.add(doll);
      }
      const npc = new NPC(ctx, { ...d, group: g, name: fam.name });
      this.list.push(npc);
      // optional: face-to-face interaction
      ctx.interactions.add(g, '…', () => npc.say(true));   // no name — you've never met these people
    }

    // the officer — built, hidden until the finale
    this.officer = figure(M, { skin: 'skinLight', hair: 'hairDark', color: 'uniform', legs: 'uniform', police: true, broad: true, h: 0.95 });
    this.officer.visible = false;
    S.add(this.officer);
  }

  update(dt, playerPos) {
    this.ctx._t7 = (this.ctx._t7 || 0) + dt;
    for (const n of this.list) n.update(dt, playerPos);
  }
}
