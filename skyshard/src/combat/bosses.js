// The five guardians. One chassis runs them all: an attack scheduler dealt
// from a no-repeat bag, phase surges at HP thresholds (bullet wipe + slow-mo
// + roar + a new trick — the fair-reset ceremony from the previous games),
// a final stand under 15%, and a defeat ceremony that can't be skipped
// because the reward crystal IS the exit key. Weak cores glow; aim matters.

import * as THREE from 'three';
import { G } from '../state.js';
import { sfx } from '../core/audio.js';
import { juice } from '../fx/juice.js';
import { music } from '../core/music.js';
import { save } from '../core/save.js';
import { clamp, clamp01, damp } from '../core/math.js';
import { TRIAL_BOSS_BY_ID } from '../world/trialdata.js';

const glowMat = (color) => new THREE.MeshBasicMaterial({ color, fog: false });
const bMat = (color, emissive, ei = 0.5) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.72, metalness: 0.08 });

// The optional ruin bosses use twenty named silhouettes built from one bounded
// material family. Their attack chassis is shared with the guardians, but the
// visual reads, movement values, attack bags, arenas, names, and rewards are
// destination-specific.
function buildTrialBoss(spec) {
  const g = new THREE.Group();
  const col = new THREE.Color(...spec.relic.color);
  const glowHex = col.getHex();
  const dark = col.clone().multiplyScalar(0.16).getHex();
  const mid = col.clone().multiplyScalar(0.46).getHex();
  const armor = bMat(mid, glowHex, 0.36);
  const black = bMat(dark, glowHex, 0.12);
  const hot = bMat(col.clone().lerp(new THREE.Color(0xffffff), 0.28).getHex(), glowHex, 1.0);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), glowMat(col.clone().lerp(new THREE.Color(0xffffff), 0.45)));
  core.position.set(0, spec.fly ? 0 : 1.7, 0.72);
  const orbit = new THREE.Group();

  const part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    g.add(m); return m;
  };
  const spike = (x, y, z, s = 1, rx = 0, rz = 0) => {
    const p = part(new THREE.ConeGeometry(0.13 * s, 1.2 * s, 6), hot, x, y, z);
    p.rotation.x = rx; p.rotation.z = rz; return p;
  };

  switch (spec.bossShape) {
    case 'antler': {
      const body = part(new THREE.DodecahedronGeometry(1.25, 1), armor, 0, 1.3, 0, 1.1, 1.35, 0.85);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const branch = part(new THREE.CylinderGeometry(0.08, 0.16, 1.8 + i * 0.25, 7), black, side * (0.65 + i * 0.28), 2.5 + i * 0.42, -0.15);
        branch.rotation.z = side * (0.35 + i * 0.09);
      }
      g.userData.breathePart = body;
      break;
    }
    case 'jaw': {
      const skull = part(new THREE.SphereGeometry(1.35, 14, 9), armor, 0, 1.45, 0, 1.15, 0.75, 1.0);
      const jaw = part(new THREE.BoxGeometry(2.25, 0.38, 1.25), black, 0, 0.72, 0.35);
      for (let i = 0; i < 8; i++) spike(-0.85 + i * 0.24, 1.0, 0.95, 0.55, Math.PI, 0);
      g.userData.breathePart = skull; g.userData.spinPart = jaw;
      break;
    }
    case 'bell': {
      const bell = part(new THREE.ConeGeometry(1.5, 2.6, 16, 1, true), armor, 0, 0.3, 0);
      bell.rotation.x = Math.PI;
      const lip = part(new THREE.TorusGeometry(1.45, 0.14, 8, 28), hot, 0, -0.95, 0);
      lip.rotation.x = Math.PI / 2;
      part(new THREE.SphereGeometry(0.34, 10, 8), black, 0, -1.05, 0);
      g.userData.spinPart = lip; g.userData.breathePart = bell;
      break;
    }
    case 'hart': {
      const chest = part(new THREE.CapsuleGeometry(0.72, 1.55, 6, 12), armor, 0, 0.5, 0);
      chest.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const horn = part(new THREE.TorusGeometry(1.25, 0.1, 7, 18, Math.PI * 1.2), hot, side * 0.72, 1.35, -0.2);
        horn.rotation.y = side * 0.55; horn.rotation.z = side * 0.45;
      }
      g.userData.breathePart = chest;
      break;
    }
    case 'clinker': {
      const furnace = part(new THREE.DodecahedronGeometry(1.5, 1), black, 0, 1.45, 0, 1.2, 1.35, 0.9);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        part(new THREE.BoxGeometry(0.8, 0.22, 1.2), armor, Math.cos(a) * 1.45, 1.5 + Math.sin(i * 2) * 0.6, Math.sin(a) * 1.1).rotation.y = -a;
      }
      g.userData.breathePart = furnace;
      break;
    }
    case 'halo': {
      const saint = part(new THREE.CylinderGeometry(0.72, 1.15, 3.2, 10), black, 0, 0.35, 0);
      for (let i = 0; i < 3; i++) {
        const h = new THREE.Mesh(new THREE.TorusGeometry(1.25 + i * 0.4, 0.08, 6, 28), i === 1 ? hot : armor);
        h.rotation.set(i * 0.55, i * 0.8, 0); orbit.add(h);
      }
      orbit.position.y = 1.2; g.add(orbit); g.userData.spinPart = orbit; g.userData.breathePart = saint;
      break;
    }
    case 'widow': {
      const abdomen = part(new THREE.IcosahedronGeometry(1.15, 1), armor, 0, 0.5, -0.2, 1.1, 0.8, 1.35);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const leg = part(new THREE.BoxGeometry(0.13, 0.13, 2.7), black, Math.cos(a) * 1.2, 0.1 + Math.sin(i) * 0.3, Math.sin(a) * 1.2);
        leg.rotation.y = -a; leg.rotation.z = (i % 2 ? 1 : -1) * 0.28;
      }
      ringPart(orbit, 1.6, hot); orbit.rotation.x = Math.PI / 2; g.add(orbit); g.userData.spinPart = orbit; g.userData.breathePart = abdomen;
      break;
    }
    case 'crown': {
      const throne = part(new THREE.BoxGeometry(2.25, 2.5, 1.35), black, 0, 1.3, 0);
      for (let i = 0; i < 11; i++) spike(-1.15 + i * 0.23, 3.0 + Math.sin(i * 1.7) * 0.35, 0, 0.9 + (i % 3) * 0.35, 0, (i - 5) * 0.04);
      g.userData.breathePart = throne;
      break;
    }
    case 'whale': {
      const body = part(new THREE.CapsuleGeometry(0.85, 2.7, 7, 14), armor, 0, 0, 0);
      body.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const fin = part(new THREE.ConeGeometry(0.55, 1.8, 4), hot, side * 0.7, -0.1, 0);
        fin.rotation.z = side * 1.2;
      }
      part(new THREE.ConeGeometry(0.9, 1.5, 4), black, -2.15, 0, 0).rotation.z = Math.PI / 2;
      g.userData.breathePart = body;
      break;
    }
    case 'organ': {
      const pipes = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const h = 1.8 + (4 - Math.abs(4 - i)) * 0.55;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.26, h, 8), i % 2 ? armor : hot);
        p.position.set((i - 4) * 0.38, h / 2 - 1.1, 0); pipes.add(p);
      }
      g.add(pipes); ringPart(orbit, 1.65, hot); orbit.rotation.x = Math.PI / 2; g.add(orbit);
      g.userData.spinPart = orbit; g.userData.breathePart = pipes;
      break;
    }
    case 'bonewheel': {
      const wheel = new THREE.Group();
      ringPart(wheel, 1.75, armor);
      for (let i = 0; i < 12; i++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.4, 6), i % 3 ? black : hot);
        spoke.rotation.z = i / 12 * Math.PI * 2; wheel.add(spoke);
      }
      g.add(wheel); g.userData.spinPart = wheel;
      break;
    }
    case 'prism': {
      const prism = part(new THREE.OctahedronGeometry(1.4, 0), hot, 0, 0.2, 0, 0.8, 1.45, 0.8);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.6), armor);
        s.position.set(Math.cos(a) * 1.8, Math.sin(a * 2) * 0.6, Math.sin(a) * 1.8); orbit.add(s);
      }
      g.add(orbit); g.userData.spinPart = orbit; g.userData.breathePart = prism;
      break;
    }
    case 'fruit': {
      const mass = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const a = i * 2.399, r = i ? 1.0 : 0;
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.72 + (i % 3) * 0.12, 10, 7), i % 2 ? armor : hot);
        f.position.set(Math.cos(a) * r, Math.sin(i * 1.8) * 0.55, Math.sin(a) * r); mass.add(f);
      }
      g.add(mass); g.userData.breathePart = mass;
      break;
    }
    case 'lungs': {
      const lungs = new THREE.Group();
      for (const side of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 9), armor);
        l.position.x = side * 0.82; l.scale.set(0.8, 1.35, 0.65); lungs.add(l);
      }
      part(new THREE.CylinderGeometry(0.16, 0.28, 3.3, 8), hot, 0, 0.65, 0);
      g.add(lungs); g.userData.breathePart = lungs;
      break;
    }
    case 'jelly': {
      const dome = part(new THREE.SphereGeometry(1.45, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), armor, 0, 0.35, 0);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        const t = part(new THREE.CylinderGeometry(0.06, 0.14, 2.2 + (i % 3) * 0.4, 6), i % 2 ? hot : black, Math.cos(a) * 0.9, -1.1, Math.sin(a) * 0.9);
        t.rotation.z = Math.sin(a) * 0.28;
      }
      g.userData.breathePart = dome;
      break;
    }
    case 'bishop': {
      const robe = part(new THREE.ConeGeometry(1.35, 3.5, 12), black, 0, -0.3, 0);
      const mitre = part(new THREE.ConeGeometry(1.15, 1.8, 5), armor, 0, 1.95, 0);
      for (const x of [-0.7, 0, 0.7]) spike(x, 2.9 + Math.abs(x) * 0.3, 0, 0.8);
      g.userData.breathePart = robe; g.userData.spinPart = mitre;
      break;
    }
    case 'pendulum': {
      const frame = new THREE.Group(); ringPart(frame, 1.85, armor); frame.rotation.x = Math.PI / 2;
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.8, 6), hot); line.position.y = -1.2; frame.add(line);
      const weight = new THREE.Mesh(new THREE.OctahedronGeometry(0.68), black); weight.position.y = -2.7; frame.add(weight);
      g.add(frame); g.userData.spinPart = frame; g.userData.breathePart = weight;
      break;
    }
    case 'orrery': {
      const engine = part(new THREE.IcosahedronGeometry(0.9, 2), hot, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        const rr = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.42, 0.07, 6, 30), i % 2 ? armor : black);
        rr.rotation.set(i * 0.55, i * 0.8, i * 0.25); orbit.add(rr);
        const moon = new THREE.Mesh(new THREE.SphereGeometry(0.17 + i * 0.05, 8, 6), hot);
        moon.position.set(1.2 + i * 0.42, 0, 0); rr.add(moon);
      }
      g.add(orbit); g.userData.spinPart = orbit; g.userData.breathePart = engine;
      break;
    }
    case 'pages': {
      const spine = part(new THREE.BoxGeometry(0.5, 2.8, 0.7), black, 0, 0, 0);
      const pages = new THREE.Group();
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.15 + i * 0.12, 0.55, 0.08), i % 2 ? armor : hot);
        p.position.set(side * (0.6 + i * 0.24), 1.35 - i * 0.42, 0); p.rotation.z = side * (0.45 + i * 0.04); pages.add(p);
      }
      g.add(pages); g.userData.spinPart = pages; g.userData.breathePart = spine;
      break;
    }
    case 'bailiff': {
      const body = part(new THREE.BoxGeometry(2.4, 3.1, 1.4), black, 0, 0.8, 0);
      const head = part(new THREE.DodecahedronGeometry(0.62, 0), hot, 0, 2.75, 0);
      const gavel = part(new THREE.BoxGeometry(0.65, 3.8, 0.65), armor, 1.9, 0.8, 0);
      gavel.rotation.z = -0.65;
      part(new THREE.BoxGeometry(1.8, 0.75, 0.85), hot, 2.85, 2.25, 0).rotation.z = -0.65;
      g.userData.breathePart = body; g.userData.spinPart = head;
      break;
    }
    default:
      part(new THREE.DodecahedronGeometry(1.4, 1), armor, 0, 0.4, 0);
  }

  g.add(core);
  g.userData.coreMesh = core;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function ringPart(group, radius, material) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 7, 30), material);
  group.add(r);
  return r;
}

const BOSS_DEFS = {
  millwright: {
    name: 'THE MILLWRIGHT', hp: 52, fly: 2.0, radius: 1.7, speed: 3.0,
    color: [0.65, 0.9, 0.4], minion: 'puff', arenaR: 8.5,
    attacks: [['charge', 'radial'], ['charge', 'radial', 'aimed'], ['charge', 'radial', 'aimed', 'summon']],
    build() {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), bMat(0x4a5a28, 0x86cc44, 0.5));
      const sails = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const sail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 0.1), bMat(0x6a4a2a, 0x442200, 0.2));
        sail.position.y = 1.4;
        const h = new THREE.Group();
        h.rotation.z = (i / 4) * Math.PI * 2;
        h.add(sail);
        sails.add(h);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xd8ffa0));
      eye.position.set(0, 0, 1.0);
      g.add(core, sails, eye);
      g.userData.spinPart = sails;
      g.userData.coreMesh = eye;
      return g;
    },
  },
  slag: {
    name: 'FOREMAN SLAG', hp: 68, fly: 0, radius: 1.9, speed: 1.7,
    color: [1.0, 0.45, 0.15], minion: 'hound', arenaR: 8.5,
    attacks: [['rain', 'wave'], ['rain', 'wave', 'aimed'], ['rain', 'wave', 'aimed', 'summon']],
    build() {
      const g = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 1.4), bMat(0x241410, 0xff4400, 0.35));
      torso.position.y = 1.8;
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), bMat(0x1a0e0a, 0xff6600, 0.7));
      head.position.y = 3.2;
      const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), bMat(0x33201a, 0xcc3300, 0.4));
      fistL.position.set(-1.6, 1.2, 0.3);
      const fistR = fistL.clone();
      fistR.position.x = 1.6;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.0), bMat(0x1c110c, 0x000000, 0));
      legs.position.y = 0.5;
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), glowMat(0xffc060));
      core.position.set(0, 1.9, 0.75);
      g.add(torso, head, fistL, fistR, legs, core);
      g.userData.coreMesh = core;
      return g;
    },
  },
  keeper: {
    name: 'THE KEEPER', hp: 60, fly: 1.6, radius: 1.5, speed: 2.6,
    color: [0.55, 0.85, 1.0], minion: 'wisp', arenaR: 6.5,
    attacks: [['beam', 'radial'], ['beam', 'radial', 'rain'], ['beam', 'radial', 'rain', 'summon']],
    build() {
      const g = new THREE.Group();
      const robe = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.4, 8), bMat(0x2a3a4a, 0x113355, 0.4));
      robe.position.y = -0.4;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), glowMat(0xfff0c0));
      lamp.position.y = 1.8;
      const cage = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 14), bMat(0x3b3f46, 0x000000, 0));
      cage.position.y = 1.8;
      g.add(robe, lamp, cage);
      g.userData.coreMesh = lamp;
      return g;
    },
  },
  choir: {
    name: 'THE CHOIR OF CAPS', hp: 64, fly: 1.2, radius: 1.9, speed: 1.9,
    color: [0.45, 1.0, 0.8], minion: 'gasbag', arenaR: 5.5,
    attacks: [['seekers', 'wave'], ['seekers', 'wave', 'radial'], ['seekers', 'wave', 'radial', 'summon']],
    build() {
      const g = new THREE.Group();
      const mass = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), bMat(0x24352c, 0x116644, 0.4));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          bMat(0x7a3a5a, 0x8833aa, 0.5));
        cap.position.set(Math.cos(a) * 1.1, 0.5 + Math.sin(i * 2.1) * 0.5, Math.sin(a) * 1.1);
        cap.rotation.x = Math.random() * 0.8;
        g.add(cap);
      }
      const throat = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), glowMat(0xa0ffd8));
      throat.position.set(0, 0.3, 1.3);
      g.add(mass, throat);
      g.userData.coreMesh = throat;
      g.userData.breathePart = mass;
      return g;
    },
  },
  archivist: {
    name: 'THE ARCHIVIST', hp: 74, fly: 2.4, radius: 1.6, speed: 3.4,
    color: [0.8, 0.55, 1.0], minion: 'drone', arenaR: 6.0, teleports: true,
    attacks: [['aimed', 'pull'], ['aimed', 'pull', 'beam'], ['aimed', 'pull', 'beam', 'summon']],
    build() {
      const g = new THREE.Group();
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), glowMat(0xd8b8ff));
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0x33104a));
      iris.position.z = 0.5;
      const slabs = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.12), bMat(0x3a3050, 0x8844ff, 0.4));
        slab.userData.a = (i / 7) * Math.PI * 2;
        slab.userData.r = 1.7 + (i % 2) * 0.4;
        slabs.add(slab);
      }
      g.add(eye, iris, slabs);
      g.userData.coreMesh = eye;
      g.userData.slabs = slabs;
      return g;
    },
  },
};

for (const [key, spec] of Object.entries(TRIAL_BOSS_BY_ID)) {
  BOSS_DEFS[key] = {
    name: spec.bossName,
    hp: spec.hp,
    fly: spec.fly,
    radius: spec.radius,
    speed: spec.speed,
    color: spec.relic.color,
    minion: spec.minion,
    arenaR: spec.arenaR,
    attacks: spec.attacks,
    teleports: !!spec.teleports,
    build: () => buildTrialBoss(spec),
  };
}

const PHASE_THRESHOLDS = [0.66, 0.33];

class Boss {
  constructor(key, interior) {
    this.key = key;
    this.def = BOSS_DEFS[key];
    this.interior = interior;
    const at = interior.def.bossAt || { x: 0, z: -6 };
    this.arena = { x: at.x, z: at.z };
    this.pos = new THREE.Vector3(at.x, this.def.fly || 0.5, at.z);
    this.vel = new THREE.Vector3();
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.phase = 0;
    this.finalStand = false;
    this.dead = false;
    this.t = 0;
    this.flashT = 0;
    this.attack = null;         // { name, t, data }
    this.idleT = 2.2;           // breathing room before the first attack
    this.bag = [];
    this.contactCd = 0;
    this.teleportT = 8;

    this.mesh = this.def.build();
    this.mesh.position.copy(this.pos);
    interior.scene.add(this.mesh);
    this.mats = [];
    this.mesh.traverse((o) => { if (o.isMesh && o.material.emissive !== undefined) this.mats.push(o.material); });
    this.baseEmissive = this.mats.map((m) => m.emissiveIntensity);

    // telegraph + beam visuals (reused)
    this.ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.1, 6, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...this.def.color), transparent: true, opacity: 0.7, fog: false })
    );
    this.ringMesh.rotation.x = Math.PI / 2;
    this.ringMesh.visible = false;
    interior.scene.add(this.ringMesh);

    this.beamMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...this.def.color), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.beamMesh.geometry.translate(0, 0, -0.5);
    this.beamMesh.visible = false;
    interior.scene.add(this.beamMesh);

    this.marks = [];            // rain telegraph circles

    // ceremony: name, bar, roar, forced attention
    G.hud.bossShow(this.def.name);
    sfx('bossroar');
    juice.shake(0.4);
    music.setMode('boss');
  }

  hitSpheres() {
    const core = this.mesh.userData.coreMesh;
    const cp = new THREE.Vector3();
    core.getWorldPosition(cp);
    return [
      { x: this.pos.x, y: this.pos.y + (this.def.fly ? 0 : 1.6), z: this.pos.z, r: this.def.radius, part: 'body', boss: this },
      { x: cp.x, y: cp.y, z: cp.z, r: 0.55, part: 'core', boss: this },
    ];
  }

  testHit(x, y, z, r) {
    for (const s of this.hitSpheres()) {
      if (Math.hypot(s.x - x, s.y - y, s.z - z) < s.r + r) return true;
    }
    return false;
  }

  onHit(sphere, dmg, opts) {
    if (this.dead) return;
    const isCore = sphere.part === 'core';
    this.hp -= dmg * (isCore ? 2 : 1);
    this.flashT = 0.15;
    G.hud.bossSet(clamp01(this.hp / this.maxHp));
    G.hud.hitPip();
    sfx('hit', { pitch: isCore ? 1.6 : 0.8 });
    juice.stop('hit');
    G.particles?.burst('impact', opts.point?.x ?? this.pos.x, opts.point?.y ?? this.pos.y, opts.point?.z ?? this.pos.z,
      isCore ? 10 : 5, { color: this.def.color, dir: opts.dir });

    // phase surges (catch-up loop so huge hits can't skip one)
    while (this.phase < PHASE_THRESHOLDS.length && this.hp / this.maxHp <= PHASE_THRESHOLDS[this.phase]) {
      this.phase++;
      this._surge();
    }
    if (!this.finalStand && this.hp / this.maxHp <= 0.15 && this.hp > 0) {
      this.finalStand = true;
      this._surge(true);
      this.idleT = Math.min(this.idleT, 0.4); // desperation: no more waiting
    }
    if (this.hp <= 0) this._die();
  }

  _surge(final = false) {
    // fair reset: wipe hostile bolts, moment of slow, roar, adds
    G.projectiles.boltPool.update((b) => {
      if (!b.fromPlayer) { b.mesh.visible = false; return false; }
      return true;
    });
    juice.slowmo('bossPhase');
    juice.shake(final ? 0.8 : 0.55);
    sfx('bossroar', { pitch: final ? 1.4 : 1 + this.phase * 0.15 });
    G.particles?.burst('impact', this.pos.x, this.pos.y + 1, this.pos.z, 26, { color: this.def.color, sizeMult: 1.8 });
    this.attack = null;
    this.idleT = 1.4;
  }

  _die() {
    this.dead = true;
    const isTrial = this.interior?.dest?.kind === 'trial';
    if (isTrial) G.save.trialsDown[this.interior.dest.id] = true;
    else G.save.bossesDown[this.key] = true;
    save();
    juice.slowmo('bossDeath');
    juice.shake(1.2);
    juice.stop('boss');
    sfx('bossdie');
    music.setMode('interior');
    G.hud.bossHide();
    G.player.iFrames = Math.max(G.player.iFrames, 4.0);   // the climax cannot kill you
    // body bursts into shards + a fountain of souls
    const floor = 0;
    G.particles?.debris(this.pos.x, this.pos.y + 1, this.pos.z, 30, this.def.color, { floorY: floor, power: 1.6, sizeMult: 1.6 });
    G.particles?.burst('soul', this.pos.x, this.pos.y + 1, this.pos.z, 24, { color: this.def.color, sizeMult: 1.5 });
    // Trial bosses fund the optional constellation without replacing their
    // relic ceremony. Guardian rewards remain exactly what they were.
    if (isTrial) G.motes?.spawn('soul', this.pos.x, this.pos.y + 1, this.pos.z, 12);
    G.motes?.spawn('health', this.pos.x, this.pos.y + 1, this.pos.z, 3);
    G.enemies.killAll('interior');   // adds dissolve with their master
    this.mesh.visible = false;
    this.ringMesh.visible = false;
    this.beamMesh.visible = false;
    for (const m of this.marks) m.removeFromParent();
    this.marks.length = 0;
    this.interior && G.interiors.onBossDown();
    G.onBossDown?.(this.key);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.ringMesh.removeFromParent();
    this.beamMesh.removeFromParent();
    for (const m of this.marks) m.removeFromParent();
    if (!this.dead) { G.hud.bossHide(); music.setMode('interior'); }
  }

  // ---- attacks --------------------------------------------------------------
  _dealAttack() {
    const set = this.def.attacks[Math.min(this.phase, this.def.attacks.length - 1)];
    if (!this.bag.length) this.bag = [...set].sort(() => Math.random() - 0.5);
    const name = this.bag.pop();
    this.attack = { name, t: 0, data: {} };
  }

  _updateAttack(dt) {
    const a = this.attack;
    const pl = G.player;
    const A_SPEED = this.finalStand ? 1.25 : 1;
    a.t += dt * A_SPEED;
    const color = this.def.color;

    switch (a.name) {
      case 'charge': {
        if (a.t < 0.55) {
          // windup: lean back, ring flashes at the destination
          if (!a.data.dir) {
            a.data.dir = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z).normalize();
            sfx('enemyshoot', { pitch: 0.6, gain: 0.5 });
          }
          this.vel.multiplyScalar(0.9);
        } else if (a.t < 1.15) {
          this.vel.x = a.data.dir.x * this.def.speed * 5.5;
          this.vel.z = a.data.dir.z * this.def.speed * 5.5;
          if (Math.random() < dt * 30) G.particles?.burst('dash', this.pos.x, this.pos.y, this.pos.z, 2, { color });
          const d = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
          if (d < this.def.radius + 0.8 && this.contactCd <= 0) {
            if (pl.hurt(1, this.pos.x, this.pos.z)) this.contactCd = 0.9;
          }
        } else { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'radial': {
        if (!a.data.fired && a.t > 0.4) {
          a.data.fired = true;
          const n = 10 + this.phase * 3;
          sfx('turret', { pitch: 0.8 });
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const b = G.projectiles.boltPool.obtain();
            if (!b) break;
            b.x = this.pos.x; b.y = this.pos.y + 0.6; b.z = this.pos.z;
            b.vx = Math.cos(ang) * 8.5; b.vy = 0; b.vz = Math.sin(ang) * 8.5;
            b.life = 4; b.fromPlayer = false; b.seek = false; b.damage = 1;
            b.mesh.visible = true;
            b.mesh.material.color.setRGB(...color);
            b.mesh.scale.setScalar(1.1);
          }
        }
        if (a.t > 0.9) { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'aimed': {
        if (a.t > 0.35 && (a.data.shots || 0) < 3 && a.t > 0.35 + (a.data.shots || 0) * 0.24) {
          a.data.shots = (a.data.shots || 0) + 1;
          sfx('enemyshoot');
          G.projectiles.enemyBolt(this.pos.x, this.pos.y + 0.6, this.pos.z, pl, 13 + this.phase * 2, color);
        }
        if (a.t > 1.3) { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'rain': {
        if (!a.data.marks) {
          a.data.marks = [];
          for (let i = 0; i < 4 + this.phase; i++) {
            // one on the player, the rest scattered — read the floor, move
            const onPlayer = i === 0;
            const x = onPlayer ? pl.pos.x : this.arena.x + (Math.random() * 2 - 1) * this.def.arenaR;
            const z = onPlayer ? pl.pos.z : this.arena.z + (Math.random() * 2 - 1) * this.def.arenaR;
            const mark = this.ringMesh.clone();
            mark.material = this.ringMesh.material.clone();
            mark.position.set(x, 0.1, z);
            mark.scale.setScalar(1.6);
            mark.visible = true;
            this.interior.scene.add(mark);
            this.marks.push(mark);
            a.data.marks.push({ x, z, mark });
          }
          sfx('charge', { pitch: 0.7 });
        }
        for (const m of a.data.marks) m.mark.material.opacity = 0.3 + Math.sin(a.t * 20) * 0.25;
        if (a.t > 1.0 && !a.data.boom) {
          a.data.boom = true;
          for (const m of a.data.marks) {
            G.projectiles.explode(m.x, 0.4, m.z, 2.0, color, { hurtPlayer: 1 });
            m.mark.removeFromParent();
            const idx = this.marks.indexOf(m.mark);
            if (idx >= 0) this.marks.splice(idx, 1);
          }
          sfx('slam', { pitch: 1.2 });
        }
        if (a.t > 1.35) { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'wave': {
        if (!a.data.started) {
          a.data.started = true;
          a.data.r = 0.5;
          this.ringMesh.visible = true;
          sfx('slam', { pitch: 0.8 });
          juice.shake(0.2);
        }
        a.data.r += dt * 9;
        this.ringMesh.position.set(this.pos.x, 0.25, this.pos.z);
        this.ringMesh.scale.setScalar(a.data.r);
        this.ringMesh.material.opacity = clamp01(1.2 - a.data.r / (this.def.arenaR * 1.4));
        const pd = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
        if (!a.data.hit && Math.abs(pd - a.data.r) < 0.7 && pl.grounded && pl.pos.y < 1.5) {
          a.data.hit = true;   // jump over it — grounded players get clipped
          pl.hurt(1, this.pos.x, this.pos.z);
        }
        if (a.data.r > this.def.arenaR * 1.6) {
          this.ringMesh.visible = false;
          this.attack = null; this.idleT = this._idleGap();
        }
        break;
      }
      case 'beam': {
        const dur = 2.6;
        if (!a.data.a0) {
          const toPl = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
          a.data.a0 = toPl - 1.7;
          a.data.sweep = 3.4 * ((Math.random() < 0.5) ? 1 : -1);
          this.beamMesh.visible = true;
          sfx('charge', { pitch: 1.2 });
        }
        const prog = clamp01((a.t - 0.5) / dur);
        const ang = a.data.a0 + a.data.sweep * prog;
        const len = 16;
        const bx = Math.sin(ang), bz = Math.cos(ang);
        this.beamMesh.position.set(this.pos.x, this.pos.y + 0.4, this.pos.z);
        this.beamMesh.rotation.y = ang;
        this.beamMesh.scale.set(a.t < 0.5 ? 0.3 : 1, a.t < 0.5 ? 0.3 : 1, len);
        this.beamMesh.material.opacity = a.t < 0.5 ? 0.25 : 0.85;
        if (a.t > 0.5 && prog < 1) {
          // point-line distance in XZ
          const px = pl.pos.x - this.pos.x, pz = pl.pos.z - this.pos.z;
          const along = px * bx + pz * bz;
          if (along > 0 && along < len) {
            const perp = Math.abs(px * bz - pz * bx);
            if (perp < 0.75 && pl.iFrames <= 0) pl.hurt(1, this.pos.x, this.pos.z);
          }
        }
        if (prog >= 1) { this.beamMesh.visible = false; this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'pull': {
        if (!a.data.started) { a.data.started = true; sfx('grapple', { pitch: 0.5 }); }
        if (a.t < 1.5) {
          const dx = this.pos.x - pl.pos.x, dz = this.pos.z - pl.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          pl.vel.x += (dx / d) * 10 * dt;
          pl.vel.z += (dz / d) * 10 * dt;
          if (Math.random() < dt * 16) {
            G.particles?.burst('soul', pl.pos.x, pl.pos.y + 1, pl.pos.z, 1, { color });
          }
        } else { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'seekers': {
        if (!a.data.fired && a.t > 0.5) {
          a.data.fired = true;
          sfx('seeker', { pitch: 0.8 });
          for (let i = 0; i < 3 + this.phase; i++) {
            G.projectiles.enemyBolt(this.pos.x, this.pos.y + 1, this.pos.z, pl, 7.5, color, (i - 1.5) * 0.35);
          }
        }
        if (a.t > 1.1) { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
      case 'summon': {
        if (!a.data.done && a.t > 0.4) {
          a.data.done = true;
          sfx('bossroar', { pitch: 1.6, gain: 0.5 });
          const n = this.finalStand ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const ang = Math.random() * Math.PI * 2;
            G.enemies.spawn(this.def.minion,
              this.arena.x + Math.cos(ang) * (this.def.arenaR - 1.5),
              this.arena.z + Math.sin(ang) * (this.def.arenaR - 1.5),
              { ctx: 'interior' });
          }
        }
        if (a.t > 0.9) { this.attack = null; this.idleT = this._idleGap(); }
        break;
      }
    }
  }

  _idleGap() {
    const base = this.finalStand ? 0.7 : 1.5 - this.phase * 0.25;
    return base + Math.random() * 0.5;
  }

  update(dt) {
    if (this.dead) return;
    const pl = G.player;
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.contactCd = Math.max(0, this.contactCd - dt);

    // movement: hover-orbit the arena unless an attack drives it
    const charging = this.attack?.name === 'charge' && this.attack.t >= 0.55;
    if (!charging) {
      const orbitA = this.t * 0.4;
      const tx = this.arena.x + Math.cos(orbitA) * 2.6;
      const tz = this.arena.z + Math.sin(orbitA) * 2.6;
      this.vel.x = damp(this.vel.x, (tx - this.pos.x) * 1.2, 3, dt);
      this.vel.z = damp(this.vel.z, (tz - this.pos.z) * 1.2, 3, dt);
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // stay in the arena
    const ad = Math.hypot(this.pos.x - this.arena.x, this.pos.z - this.arena.z);
    if (ad > this.def.arenaR) {
      this.pos.x = this.arena.x + (this.pos.x - this.arena.x) / ad * this.def.arenaR;
      this.pos.z = this.arena.z + (this.pos.z - this.arena.z) / ad * this.def.arenaR;
    }
    const baseY = this.def.fly ? this.def.fly + Math.sin(this.t * 1.3) * 0.5 : 0;
    this.pos.y = damp(this.pos.y, baseY, 4, dt);

    // archivist blinks
    if (this.def.teleports) {
      this.teleportT -= dt;
      if (this.teleportT <= 0) {
        this.teleportT = this.finalStand ? 4 : 7;
        G.particles?.burst('soul', this.pos.x, this.pos.y + 1, this.pos.z, 14, { color: this.def.color });
        const ang = Math.random() * Math.PI * 2;
        this.pos.x = this.arena.x + Math.cos(ang) * (this.def.arenaR * 0.7);
        this.pos.z = this.arena.z + Math.sin(ang) * (this.def.arenaR * 0.7);
        G.particles?.burst('soul', this.pos.x, this.pos.y + 1, this.pos.z, 14, { color: this.def.color });
        sfx('doublejump', { pitch: 0.6 });
      }
    }

    // attack scheduling
    if (!this.attack) {
      this.idleT -= dt;
      if (this.idleT <= 0) this._dealAttack();
    } else {
      this._updateAttack(dt);
    }

    // contact damage
    const pd = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    if (pd < this.def.radius + 0.7 && this.contactCd <= 0 && Math.abs(pl.pos.y - this.pos.y) < 2.4) {
      if (pl.hurt(1, this.pos.x, this.pos.z)) this.contactCd = 1.0;
    }

    // present
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    const ud = this.mesh.userData;
    if (ud.spinPart) ud.spinPart.rotation.z += dt * (1.5 + this.phase * 0.8 + (this.finalStand ? 2 : 0));
    if (ud.breathePart) ud.breathePart.scale.setScalar(1 + Math.sin(this.t * 2.4) * 0.06);
    if (ud.slabs) {
      for (const slab of ud.slabs.children) {
        slab.userData.a += dt * (0.8 + this.phase * 0.3);
        slab.position.set(Math.cos(slab.userData.a) * slab.userData.r, Math.sin(slab.userData.a * 1.4) * 0.5, Math.sin(slab.userData.a) * slab.userData.r);
        slab.lookAt(this.mesh.position);
      }
    }
    const fl = this.flashT / 0.15;
    for (let i = 0; i < this.mats.length; i++) {
      this.mats[i].emissiveIntensity = this.baseEmissive[i] + fl * 1.6;
    }
    // the boss itself is a light source
    G.rovers?.request(this.pos.x, this.pos.y + 1.2, this.pos.z, this.def.color, 1.8 + fl * 2, 18);
  }
}

export function spawnBoss(key, interior) {
  const boss = new Boss(key, interior);
  G.boss = boss;
  return boss;
}

export { BOSS_DEFS };
