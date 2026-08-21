// The three silhouettes — WEDGE / ANVIL / MAST (Cinderbloom's law of three:
// a roster you learn in one encounter, identifiable in fog at 40 m). Violet
// anatomy carries the threat hue; armor is matte dark. Each build returns
// named parts for procedural animation, sphere hit zones, and the per-enemy
// emissive handles (telegraph / hit flash / death glow).

import * as THREE from 'three';
import { TAU, DEG, clamp01, lerp } from '../engine/math.js';

const VIOLET = 0x896dff;
const VOID_BODY = 0x191527;
const VOID_DARK = 0x100d1a;
const ARMOR = 0x232a38;

export const SPECIES = {
  thrall: {
    hp: 55, speed: 7.5, height: 1.1, radius: 0.42, mass: 46,
    burstMs: 0.6, pauseMs: 0.35,
    lungeRange: 4.2, strikeRange: 7.6, standoff: 3.2,
    telegraph: 0.320, attack: 0.470, recover: 0.380, dmg: 22,
    leapCdInd: 5.5, lungeSpeed: 11.0, lungeMs: 0.26,
    engage: [0, 15], drop: 14,
  },
  warden: {
    hp: 340, speed: 2.8, height: 2.4, radius: 0.85, mass: 900,
    burstMs: 1e9, pauseMs: 0,
    strikeRange: 3.4, standoff: 2.1,
    telegraph: 0.480, attack: 0.520, strikeAt: 0.16, recover: 0.700, dmg: 55,
    ventOpen: 1.1, ventCycle: 4.5,
    engage: [0, 6], drop: 40,
  },
  chorister: {
    hp: 120, speed: 1.2, height: 1.8, radius: 0.5, mass: 140,
    burstMs: 1e9, pauseMs: 0,
    strikeRange: 40, standoff: 24, minRange: 13,
    telegraph: 0.850, attack: 0.240, releaseAt: 0.10, recover: 1.500, dmg: 34,
    boltSpeed: 9.0, engage: [18, 40], drop: 20,
  },
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.12, flatShading: true, ...opts });
}

function emissiveMat(base, emissive, intensity) {
  return new THREE.MeshStandardMaterial({
    color: base, roughness: 0.5, metalness: 0.1, flatShading: true,
    emissive, emissiveIntensity: intensity,
  });
}

const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

/* ---------------- THRALL: low void hound, the crowd ---------------- */
function buildThrall() {
  const g = new THREE.Group();
  const body = mat(VOID_BODY);
  const dark = mat(VOID_DARK);
  const glow = emissiveMat(0x241d3d, VIOLET, 1.1);      // spine + eyes: the anatomy IS the telegraph surface

  const torso = new THREE.Group();
  g.add(torso);
  torso.position.y = 0.66;
  // wedge body: tapered toward the head
  const bodyMesh = add(torso, new THREE.ConeGeometry(0.40, 1.2, 5), body, 0, 0, 0.1);
  bodyMesh.rotation.x = -Math.PI / 2;
  bodyMesh.scale.set(1, 1, 0.66);
  const head = add(torso, new THREE.DodecahedronGeometry(0.22, 0), dark, 0, 0.04, -0.70);
  add(torso, new THREE.SphereGeometry(0.052, 6, 6), glow, -0.10, 0.09, -0.84);
  add(torso, new THREE.SphereGeometry(0.052, 6, 6), glow, 0.10, 0.09, -0.84);
  add(torso, new THREE.BoxGeometry(0.06, 0.07, 0.9), glow, 0, 0.20, 0.05);   // spine bloom
  const tail = add(torso, new THREE.ConeGeometry(0.08, 0.55, 4), dark, 0, 0.05, 0.68);
  tail.rotation.x = Math.PI / 2;

  const legs = [];
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const side = i % 2 ? 1 : -1;
    const leg = add(g, new THREE.ConeGeometry(0.08, 0.78, 4), dark, side * 0.3, 0.39, front ? -0.36 : 0.38);
    legs.push(leg);
  }
  return {
    group: g, glowMats: [glow], armorMats: [],
    parts: { torso, legs, head },
    zones: [
      { x: 0, y: 0.70, z: -0.74, r: 0.24, zone: 'head' },
      { x: 0, y: 0.88, z: 0.05, r: 0.19, zone: 'vent' },   // the spine bloom — weak
      { x: 0, y: 0.62, z: 0.05, r: 0.46, zone: 'torso' },
      { x: 0, y: 0.34, z: 0.42, r: 0.3, zone: 'limb' },
    ],
    animate(parts, a) {
      // gallop: legs scissor, torso pitches with the burst
      for (let i = 0; i < 4; i++) {
        const ph = a.gait + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI * 0.5);
        parts.legs[i].rotation.x = Math.sin(ph) * 0.55 * a.moveAmp;
      }
      parts.torso.position.y = 0.66 + Math.abs(Math.sin(a.gait)) * 0.05 * a.moveAmp;
      parts.torso.rotation.x = a.coil * -0.35 + Math.sin(a.gait * 2) * 0.03 * a.moveAmp;
      parts.torso.position.z = a.coil * 0.22;      // coil-back = leap is coming
      parts.torso.rotation.z = a.bank * 0.4;
    },
  };
}

/* ---------------- WARDEN: armored anvil, duty-cycle vents ---------------- */
function buildWarden() {
  const g = new THREE.Group();
  const armor = mat(ARMOR, { roughness: 0.55, metalness: 0.45 });
  const dark = mat(VOID_DARK);
  const glow = emissiveMat(0x241d3d, VIOLET, 0.9);
  const ventGlow = emissiveMat(0x2a1f4d, VIOLET, 0.6);   // brightens hard when open

  const torso = new THREE.Group();
  g.add(torso);
  torso.position.y = 1.46;
  add(torso, new THREE.BoxGeometry(1.15, 1.1, 0.75), dark, 0, 0, 0);
  // front plate: broad, matte, angled — the "you are wasting ammo" surface
  const plate = add(torso, new THREE.BoxGeometry(1.3, 1.25, 0.16), armor, 0, 0.02, -0.44);
  plate.rotation.x = -0.08;
  add(torso, new THREE.BoxGeometry(0.5, 0.42, 0.4), armor, 0, 0.72, -0.1); // head block
  add(torso, new THREE.BoxGeometry(0.34, 0.06, 0.05), glow, 0, 0.71, -0.32); // visor slit
  // faint violet shoulder seams: front-facing identity without a third hue
  add(torso, new THREE.BoxGeometry(0.05, 0.5, 0.05), glow, -0.66, 0.02, -0.47);
  add(torso, new THREE.BoxGeometry(0.05, 0.5, 0.05), glow, 0.66, 0.02, -0.47);
  // shoulders
  add(torso, new THREE.DodecahedronGeometry(0.34, 0), armor, -0.75, 0.42, 0);
  add(torso, new THREE.DodecahedronGeometry(0.34, 0), armor, 0.75, 0.42, 0);
  // arms
  const armL = add(torso, new THREE.BoxGeometry(0.26, 0.95, 0.26), dark, -0.78, -0.25, -0.05);
  const armR = add(torso, new THREE.BoxGeometry(0.26, 0.95, 0.26), dark, 0.78, -0.25, -0.05);
  // dorsal vents: the ONLY route to a stagger
  const ventL = add(torso, new THREE.SphereGeometry(0.21, 8, 6), ventGlow, -0.3, 0.5, 0.44);
  const ventR = add(torso, new THREE.SphereGeometry(0.21, 8, 6), ventGlow, 0.3, 0.5, 0.44);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = add(g, new THREE.BoxGeometry(0.34, 0.95, 0.4), dark, side * 0.38, 0.48, 0.05);
    legs.push(leg);
  }
  return {
    group: g, glowMats: [glow, ventGlow], armorMats: [armor], ventMat: ventGlow,
    parts: { torso, legs, armL, armR, ventL, ventR },
    zones: [
      { x: 0, y: 2.18, z: -0.1, r: 0.3, zone: 'plate' },     // head is armored too
      { x: -0.3, y: 1.96, z: 0.44, r: 0.26, zone: 'ventL' },
      { x: 0.3, y: 1.96, z: 0.44, r: 0.26, zone: 'ventR' },
      { x: 0, y: 1.46, z: -0.3, r: 0.75, zone: 'plate' },
      { x: 0, y: 1.46, z: 0.15, r: 0.6, zone: 'plate' },
      { x: 0, y: 0.5, z: 0, r: 0.45, zone: 'limb' },
    ],
    animate(parts, a) {
      for (let i = 0; i < 2; i++) {
        parts.legs[i].rotation.x = Math.sin(a.gait + (i % 2 ? Math.PI : 0)) * 0.3 * a.moveAmp;
      }
      parts.torso.position.y = 1.46 + Math.abs(Math.sin(a.gait)) * 0.04 * a.moveAmp;
      parts.torso.rotation.y = a.swing * 1.15;           // the sweep travels
      parts.torso.rotation.x = a.coil * -0.18;           // rear-up telegraph
      parts.torso.position.z = a.coil * -0.1;
      parts.armL.rotation.x = a.swing < 0 ? a.swing * 1.6 : 0;
      parts.armR.rotation.x = a.swing > 0 ? -a.swing * 1.6 : 0;
      const vs = 1 + a.ventOpen * 0.45;
      parts.ventL.scale.setScalar(vs);
      parts.ventR.scale.setScalar(vs);
    },
  };
}

/* ---------------- CHORISTER: rooted mast, the pressure ---------------- */
function buildChorister() {
  const g = new THREE.Group();
  const robe = mat(VOID_BODY);
  const dark = mat(VOID_DARK);
  const glow = emissiveMat(0x241d3d, VIOLET, 1.0);
  const sacGlow = emissiveMat(0x2a1f4d, VIOLET, 1.2);    // the tell IS the target

  const body = new THREE.Group();
  g.add(body);
  // tall robed cone
  add(body, new THREE.ConeGeometry(0.52, 1.9, 7), robe, 0, 0.95, 0);
  add(body, new THREE.ConeGeometry(0.3, 0.6, 6), dark, 0, 1.95, 0);       // hood
  add(body, new THREE.BoxGeometry(0.2, 0.05, 0.05), glow, 0, 1.78, -0.24); // eye slit
  // the sac: held forward on a stalk, inflates 1.6x during windup
  const stalk = add(body, new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5), dark, 0, 1.5, -0.4);
  stalk.rotation.x = 0.8;
  const sac = add(body, new THREE.SphereGeometry(0.24, 10, 8), sacGlow, 0, 1.62, -0.72);
  // trailing tendrils
  for (let i = 0; i < 3; i++) {
    const t = add(body, new THREE.ConeGeometry(0.06, 0.7, 4), dark, (i - 1) * 0.22, 0.2, 0.3);
    t.rotation.x = Math.PI;
  }
  return {
    group: g, glowMats: [glow], armorMats: [], sacMat: sacGlow,
    parts: { body, sac, stalk },
    zones: [
      { x: 0, y: 1.62, z: -0.72, r: 0.3, zone: 'vent' },    // the sac
      { x: 0, y: 1.9, z: 0, r: 0.28, zone: 'head' },
      { x: 0, y: 1.1, z: 0, r: 0.5, zone: 'torso' },
      { x: 0, y: 0.4, z: 0, r: 0.45, zone: 'limb' },
    ],
    animate(parts, a) {
      parts.body.position.y = Math.sin(a.time * 1.3) * 0.05;
      parts.body.rotation.z = Math.sin(a.time * 0.9) * 0.04 + a.bank * 0.3;
      const inflate = 1 + a.coil * 0.6;                    // sac inflation = the 850 ms tell
      parts.sac.scale.setScalar(inflate);
      parts.body.rotation.x = a.coil * 0.1;
    },
  };
}

export const BUILDERS = { thrall: buildThrall, warden: buildWarden, chorister: buildChorister };
