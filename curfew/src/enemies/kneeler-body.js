// CURFEW — the Kneeler's body. ROUND 6, lane C. Owner: the boss lane.
//
// Alex, fifth playtest: "I hope there are bosses somewhere." and "Certain enemies should
// definitely look really scary and good graphics and good style."
//
// A 4.40 m load-bearing shape, weight collapsed to one side, that has to read as a BOULDER
// OR A ROOT BALL from 40 m and as a body from 15. DESIGN section 4's row: 4.40 m, folded,
// weight on one side. Built the way bodies.js builds the six species, and deliberately
// with the SAME materials, so it costs no new shader program:
//
//   - rigid parts on real joints (shoulder -> ELBOW -> forearm + claw; hip -> KNEE -> shin +
//     foot). Cylinder people were rejected outright (bodies.js rule 1).
//   - ONE merged shell for the whole torso-and-head (a Weld with a baked colour attribute),
//     so the trunk is one draw and the shared Lambert shell program carries bone, hide and
//     the lightless cavity at once. The limbs are eight more draws on the same material.
//   - Lambert, never MeshStandard. Albedos below the torch (bodies.js rule 3).
//   - eyes proud of the sockets as MeshBasic glints, and TWO DORSAL VENTS on the back that
//     glow when open through the same emissive trick the eyes use — a second MeshBasic mesh
//     on the identical config (makeBasic), hidden while the vents are shut. No light.
//
// THE MATERIALS ARE BORROWED, NOT REBUILT. bodies.js does not export makeShell, and this
// lane may not edit it (one owner per file), so the shell Lambert, the glint Basic and the
// contact disc come off a body the existing factory builds (buildBody) and the rest of that
// body is thrown away at boot. A shell built here by hand with the same text would share
// the program only for as long as nobody edited one of the two copies; a shell built by
// the one factory that exists cannot drift. docs/ROUND-6/HANDOFF-C.md asks for the export
// and the guarded path below prefers it the day it lands.
//
// donor: Projects/qualiacology/fetch/src/enemies.js:18-22 (KIND.kneeler — h 4.4, r 0.9,
//   chase 6.2, the hit-zone ladder) and :682-763 (buildKneeler — "a load-bearing animal
//   silhouette rather than a scaled walker. Its weight has collapsed to one side, the
//   shoulder yoke is broader than its pelvis, and two crooked forelimb joints plant ahead
//   of a face hung underneath it"; the hump at (-0.09, 1.48, -0.25), the three bone spine
//   spurs, the jaw and the mouth void). The proportions below are those, scaled to 4.40 m
//   and re-jointed so the thing can KNEEL, STAND, SWEEP and FOLD.
// donor: src/enemies/bodies.js:466-520 (Weld), :567-640 (sculptHead: cavity first, brow
//   above, a SHALLOW mask, sockets sunk so the glints have holes to sit in).

import * as THREE from 'three';
import * as bodiesMod from './bodies.js';

/* ==========================================================================
   Palette. VALUES, not hues (bodies.js / species.js night-value law): every
   surface sits far under the sky (hemi Y 0.221); the glints are the only thing
   on it above the bone. VOID is the cavity and the shut vents.
   ========================================================================== */
const VOID = 0x040406;
const CLOTH = 0x110f0d;     // the hide. Y ~0.005, the darkest cloth in the roster.
const SKIN = 0x1a1613;      // the limbs, one step lighter so a joint has an edge
const BONE = 0x36302a;      // spurs, plates, the brow, the claws
const EYE = 0xffb070;       // an ember. Peak channel 1.0; EYE_GAIN lifts it over bloom.
const VENT = 0xff7a3a;      // the vents, open

/* bodies.js EYE_EMISSIVE is 1.85 and not exported; the same number, for the same
   reason (Rec.709 luma over CFG.render.bloom.threshold 1.05 so a glint spreads
   instead of vanishing). Kept identical so the boss's eye sits on the same rung
   as the hunter's, not above the ladder. */
const EYE_GAIN = 1.85;
const VENT_GAIN = 2.6;      // hotter than an eye: two vents 0.4 m tall are the tell

/* ==========================================================================
   Weld — merge primitives into ONE geometry with a baked colour attribute.
   Boot-time only. donor: src/enemies/bodies.js:466-520.
   ========================================================================== */
const _wm = new THREE.Matrix4();
const _we = new THREE.Euler();
const _wq = new THREE.Quaternion();
const _wp = new THREE.Vector3();
const _ws = new THREE.Vector3();
const _wc = new THREE.Color();
const EMPTY = {};

class Weld {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.uv = []; }
  add(geo, x, y, z, colour, opt) {
    const o = opt || EMPTY;
    _wp.set(x, y, z);
    _we.set(o.rx || 0, o.ry || 0, o.rz || 0);
    _wq.setFromEuler(_we);
    _ws.set(o.sx === undefined ? 1 : o.sx, o.sy === undefined ? 1 : o.sy, o.sz === undefined ? 1 : o.sz);
    _wm.compose(_wp, _wq, _ws);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(_wm);
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const uv = g.attributes.uv ? g.attributes.uv.array : null;
    _wc.setHex(colour);
    for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
      this.pos.push(p[i], p[i + 1], p[i + 2]);
      this.nrm.push(n[i], n[i + 1], n[i + 2]);
      this.col.push(_wc.r, _wc.g, _wc.b);
      this.uv.push(uv ? uv[j] : 0.5, uv ? uv[j + 1] : 0.5);
    }
    g.dispose();
    return this;
  }
  /** Never without a colour attribute: the shell material has vertexColors on. */
  geometry(name) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    g.name = name;
    return g;
  }
}

const P = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 10, 8),
  sphLo: new THREE.SphereGeometry(0.5, 8, 6),
  cap: new THREE.CapsuleGeometry(0.5, 1, 3, 7),
  cone3: new THREE.ConeGeometry(0.5, 1, 3),
  cone5: new THREE.ConeGeometry(0.5, 1, 5),
};

/* ==========================================================================
   The frame. The torso is authored in the PELVIS frame: origin at the hip
   pivot line, +Y up, -Z forward (the sculptHead convention). The rig hangs the
   torso group under a pelvis group that rises when it stands, and pitches the
   torso to fold it. Every zone below is in this same torso-local frame, and
   kneeler.js transforms them with the SAME two numbers present() uses
   (pelvis height, torso pitch), so a bullet and a pixel can never disagree.
   ========================================================================== */
export const SHOULDER = Object.freeze({ x: 0.95, y: 1.65, z: -0.05 });
export const HIP = Object.freeze({ x: 0.48, y: -0.05, z: 0.05 });
export const ARM_UPPER = 1.35, ARM_FORE = 1.25, THIGH = 1.00, SHIN = 0.95;

/* Hit zones, torso-local. r is world metres. The vents sit behind the plate
   sphere's back face (0.66 + 0.36 = 1.02 vs 1.00), so a round from behind meets
   a vent before it meets the plate; from the front it meets the head or the
   plate first. kneeler.js maps 'vent' back to 'plate' while the vents are shut. */
export const ZONES = Object.freeze([
  { x: 0.12, y: 2.05, z: -0.95, r: 0.50, zone: 'head' },
  { x: -0.45, y: 1.60, z: 0.66, r: 0.36, zone: 'vent' },
  { x: 0.45, y: 1.60, z: 0.66, r: 0.36, zone: 'vent' },
  { x: 0.00, y: 1.45, z: -0.05, r: 1.05, zone: 'plate' },
  { x: 0.00, y: 0.45, z: 0.00, r: 0.75, zone: 'plate' },
]);

/* The three key poses. Order: pelvisY, torsoPitch, shoulderRx, shoulderRz,
   elbowRx, hipRx, hipRz, kneeRx. Rz is mirrored per side. Rx > 0 on a hanging
   limb swings it FORWARD (-Z); on the torso, pitch < 0 leans it forward.

   KNEEL is the boulder: pelvis at 1.22 m, the torso folded to 41 degrees so the
   hump is the top of the shape at ~3.2 m (the FETCH donor knelt 3.5 m high) —
   the first cut folded it to 2.3 m and a 1.5 m wall hid it from the road at
   every distance past 10 m. Knees on the ground, shins flat behind, the
   forearms tucked under with the claws planted. STAND is the full 4.40 m with a
   forward hunch. DEAD is face down, folded over its own knees, and it never
   sinks. */
const KNEEL = [1.22, -0.72, 1.05, 0.22, -1.05, -0.20, 0.10, -1.55];
const STAND = [2.00, -0.15, 0.25, 0.14, -0.35, 0.02, 0.05, -0.12];
const DEAD = [0.80, -1.45, 0.75, 0.30, -0.30, -0.55, 0.12, -1.25];

function ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ==========================================================================
   Geometry set, built once and shared by the three bodies.
   ========================================================================== */
let SET = null;

export function kneelerSet() {
  if (SET) return SET;
  const w = new Weld();

  // --- the trunk. Pelvis block, a belly, the broad yoke, and the HUMP that is
  //     the whole silhouette at 40 m — offset to -X because its weight has
  //     collapsed to one side (donor hump at -0.09/-0.25, scaled and pushed).
  // MEASURED 2026-09-03 (tests/shots/boss2-cathedral-midsweep.png): the first trunk was a
  // box chest over a box pelvis with pale knee caps, and at 3 m under the torch it read as a
  // mannequin — the cylinder-people failure in a different primitive. Nothing below is a box
  // except the plates and the vent seams: a hide is overlapping ellipsoids, lopsided.
  w.add(P.sph, 0.05, 0.10, 0.05, CLOTH, { sx: 1.30, sy: 0.72, sz: 0.95, rz: 0.08 });
  w.add(P.cap, -0.05, 0.75, -0.02, CLOTH, { sx: 1.20, sy: 0.80, sz: 0.90, rz: 0.05 });
  w.add(P.sph, 0.10, 1.40, -0.12, CLOTH, { sx: 1.95, sy: 0.90, sz: 1.10, rz: -0.08 });   // the yoke
  w.add(P.sph, -0.35, 1.30, 0.20, CLOTH, { sx: 1.20, sy: 0.85, sz: 1.00, rz: 0.18 });    // the collapsed side
  w.add(P.sph, -0.25, 1.85, 0.35, CLOTH, { sx: 1.45, sy: 1.00, sz: 1.25, rz: 0.10 });    // the HUMP
  w.add(P.sph, 0.30, 1.75, 0.15, CLOTH, { sx: 1.00, sy: 0.70, sz: 0.90, rz: -0.12 });
  // shoulder caps: the low side and the high side are NOT the same height
  w.add(P.sph, 0.95, 1.55, -0.05, CLOTH, { sx: 0.74, sy: 0.58, sz: 0.74 });
  w.add(P.sph, -1.00, 1.72, 0.00, CLOTH, { sx: 0.84, sy: 0.66, sz: 0.82 });
  // the bone ridge along the back: three crooked spurs (donor spineDefs), which
  // is what makes the folded shape read as a ROOT BALL and not a rock
  w.add(P.cone3, -0.30, 2.40, 0.35, BONE, { rx: -0.50, rz: 0.30, sx: 0.22, sy: 0.95, sz: 0.22 });
  w.add(P.cone3, 0.05, 2.55, 0.25, BONE, { rx: -0.35, rz: -0.06, sx: 0.24, sy: 1.10, sz: 0.24 });
  w.add(P.cone3, 0.38, 2.35, 0.30, BONE, { rx: -0.60, rz: -0.28, sx: 0.20, sy: 0.85, sz: 0.20 });
  w.add(P.cone3, -0.65, 2.05, 0.55, BONE, { rx: -0.80, rz: 0.55, sx: 0.18, sy: 0.75, sz: 0.18 });
  w.add(P.cone3, 0.70, 1.95, 0.45, BONE, { rx: -0.70, rz: -0.65, sx: 0.16, sy: 0.70, sz: 0.16 });
  w.add(P.cone3, -0.15, 2.15, 0.85, BONE, { rx: -1.35, rz: 0.10, sx: 0.17, sy: 0.80, sz: 0.17 });
  w.add(P.cone3, 0.25, 2.05, 0.90, BONE, { rx: -1.50, rz: -0.20, sx: 0.15, sy: 0.65, sz: 0.15 });
  // the PLATE: four bone bands across the chest. Shootable at x0.55.
  const PLATES = [
    [0.10, 0.92, -0.50, 1.10, -0.12], [-0.08, 1.16, -0.55, 1.34, 0.06],
    [0.14, 1.38, -0.60, 0.95, -0.20], [-0.12, 1.58, -0.62, 1.20, 0.10],
    [0.40, 1.05, -0.48, 0.45, 0.35],
  ];
  for (let i = 0; i < PLATES.length; i++) {
    const p = PLATES[i];
    w.add(P.box, p[0], p[1], p[2], BONE, { sx: p[3], sy: 0.065, sz: 0.10, rz: p[4], rx: -0.15 });
  }
  // neck, forward and down: the head hangs UNDER the yoke, not on top of it
  w.add(P.cap, 0.12, 1.95, -0.55, SKIN, { rx: 1.10, sx: 0.40, sy: 0.35, sz: 0.40 });

  // --- the head. Cavity first, the cowl behind it, a brow above, a shallow
  //     mask, a jaw, then sockets sunk into the front (bodies.js sculptHead order).
  w.add(P.sph, 0.12, 2.05, -0.95, VOID, { sx: 0.52, sy: 0.60, sz: 0.46 });
  w.add(P.sph, 0.12, 2.02, -0.78, CLOTH, { sx: 0.62, sy: 0.68, sz: 0.50 });
  w.add(P.cone3, 0.12, 2.34, -1.00, BONE, { rx: 1.28, rz: Math.PI, sx: 0.52, sy: 0.30, sz: 0.34 });
  w.add(P.sph, 0.12, 2.04, -1.12, BONE, { sx: 0.38, sy: 0.54, sz: 0.10 });
  w.add(P.box, 0.14, 1.76, -1.08, BONE, { rx: -0.20, sx: 0.40, sy: 0.13, sz: 0.36 });
  w.add(P.box, 0.12, 1.86, -1.17, VOID, { sx: 0.26, sy: 0.05, sz: 0.04 });    // the mouth
  for (const side of [-1, 1]) {
    w.add(P.sphLo, 0.12 + side * 0.13, 2.11, -1.15, VOID, { sx: 0.19, sy: 0.15, sz: 0.10 });
  }

  // --- the vents: two VOID seams on the back with bone lips. The glowing lozenge
  //     that fills each one is a separate mesh (ventGeometry) and is hidden shut.
  for (const side of [-1, 1]) {
    w.add(P.box, side * 0.45, 1.60, 0.60, BONE, { rx: 0.25, sx: 0.40, sy: 0.64, sz: 0.06 });
    w.add(P.box, side * 0.45, 1.60, 0.635, VOID, { rx: 0.25, sx: 0.28, sy: 0.50, sz: 0.05 });
  }
  const shell = w.geometry('kneeler-shell');

  // --- glints: 9 cm embers, proud of the sockets
  const e = new Weld();
  for (const side of [-1, 1]) {
    e.add(P.sphLo, 0.12 + side * 0.13, 2.11, -1.23, 0xffffff, { sx: 0.13, sy: 0.11, sz: 0.08 });
  }
  const eyes = e.geometry('kneeler-eyes');

  // --- the open vents: two lozenges standing 3 cm proud of the seams
  const v = new Weld();
  for (const side of [-1, 1]) {
    v.add(P.box, side * 0.45, 1.60, 0.665, 0xffffff, { rx: 0.25, sx: 0.22, sy: 0.42, sz: 0.05 });
  }
  const vents = v.geometry('kneeler-vents');

  // --- limbs, each authored hanging DOWN from its own pivot
  const au = new Weld();
  au.add(P.cap, 0, -ARM_UPPER * 0.5, 0, SKIN, { sx: 0.44, sy: ARM_UPPER * 0.62, sz: 0.44 });
  au.add(P.sphLo, 0, -ARM_UPPER, 0, SKIN, { sx: 0.44, sy: 0.38, sz: 0.44 });
  const armUpper = au.geometry('kneeler-arm');

  const af = new Weld();
  af.add(P.cap, 0, -ARM_FORE * 0.5, 0, SKIN, { sx: 0.36, sy: ARM_FORE * 0.62, sz: 0.36 });
  af.add(P.box, 0, -ARM_FORE - 0.05, -0.10, BONE, { sx: 0.42, sy: 0.22, sz: 0.55 });
  for (let i = -1; i <= 1; i++) {
    af.add(P.cone3, i * 0.14, -ARM_FORE - 0.16, -0.42, BONE, { rx: -1.40, sx: 0.07, sy: 0.30 + (i === 0 ? 0.06 : 0), sz: 0.07 });
  }
  const armFore = af.geometry('kneeler-fore');

  const th = new Weld();
  th.add(P.cap, 0, -THIGH * 0.5, 0, SKIN, { sx: 0.52, sy: THIGH * 0.62, sz: 0.52 });
  th.add(P.sphLo, 0, -THIGH, 0, SKIN, { sx: 0.48, sy: 0.42, sz: 0.48 });
  const thigh = th.geometry('kneeler-thigh');

  const sh = new Weld();
  sh.add(P.cap, 0, -SHIN * 0.5, 0, SKIN, { sx: 0.40, sy: SHIN * 0.62, sz: 0.40 });
  sh.add(P.box, 0, -SHIN - 0.03, -0.18, BONE, { sx: 0.46, sy: 0.16, sz: 0.80 });
  const shin = sh.geometry('kneeler-shin');

  SET = { shell, eyes, vents, armUpper, armFore, thigh, shin };
  return SET;
}

/* ==========================================================================
   Materials. Borrowed from the one factory (see the header).
   ========================================================================== */
function borrowMaterials(rng) {
  // Preferred path the day bodies.js exports its shell factory (HANDOFF-C).
  if (typeof bodiesMod.makeShell === 'function') {
    const shell = bodiesMod.makeShell(0.98, 0.98, 0.98);
    return {
      shell,
      eye: bodiesMod.makeBasic(bodiesMod.whiteTex(), new THREE.Color(EYE).multiplyScalar(EYE_GAIN)),
      vent: bodiesMod.makeBasic(bodiesMod.whiteTex(), new THREE.Color(VENT).multiplyScalar(VENT_GAIN)),
      contact: null,
      reveal: (v) => { shell.userData.reveal = v; const u = shell.userData.uniforms; if (u) u.uReveal.value = v; },
      rimGain: (v) => { shell.userData.rimGain = v; const u = shell.userData.uniforms; if (u) u.uRimGain.value = v; },
      dispose() { shell.dispose(); },
    };
  }
  // The path that exists today: build a hound, keep its materials and its contact
  // disc, discard the rest. Boot-time only; the geometry set is cached inside
  // bodies.js and is never disposed here.
  const donor = bodiesMod.buildBody('hound', rng);
  const shell = donor.shellMat;
  // The hound's per-instance tint is a value spread 0.78..1.14 on a hex that is
  // already near-black; the boss uses the ladder's own value (1.0) so its
  // silhouette is the authored CLOTH and nothing else.
  shell.color.setRGB(1, 1, 1);
  const contact = donor.parts.contact;
  if (contact.parent) contact.parent.remove(contact);
  const eye = donor.eyeMat;
  eye.color.set(EYE).multiplyScalar(EYE_GAIN);
  eye.opacity = 1;
  const vent = bodiesMod.makeBasic(bodiesMod.whiteTex(), new THREE.Color(VENT).multiplyScalar(VENT_GAIN));
  return {
    shell, eye, vent, contact,
    reveal: (v) => donor.reveal(v),
    rimGain: (v) => { shell.userData.rimGain = v; const u = shell.userData.uniforms; if (u) u.uRimGain.value = v; },
    dispose() { shell.dispose(); eye.dispose(); vent.dispose(); if (contact.material) contact.material.dispose(); },
  };
}

/* ==========================================================================
   The rig.
   ========================================================================== */
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;          // a shadow-depth variant is another program
  m.receiveShadow = false;
  m.frustumCulled = true;
  return m;
}

/**
 * Build one Kneeler rig. Returns a record kneeler.js owns the world transform
 * of; everything inside the root is this file's.
 * @param rng  a forked Rng (boot-time only)
 */
export function buildKneelerRig(rng) {
  const set = kneelerSet();
  const M = borrowMaterials(rng);

  const root = new THREE.Group();
  root.name = 'kneeler';
  const pelvis = new THREE.Group();
  pelvis.name = 'kneeler-pelvis';
  root.add(pelvis);
  const torso = new THREE.Group();
  torso.name = 'kneeler-torso';
  pelvis.add(torso);

  const shellMesh = mesh(set.shell, M.shell);
  shellMesh.name = 'kneeler-shell';
  torso.add(shellMesh);
  const eyeMesh = mesh(set.eyes, M.eye);
  eyeMesh.name = 'kneeler-eyes';
  torso.add(eyeMesh);
  const ventMesh = mesh(set.vents, M.vent);
  ventMesh.name = 'kneeler-vents';
  ventMesh.visible = false;
  torso.add(ventMesh);

  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
    torso.add(sh);
    sh.add(mesh(set.armUpper, M.shell));
    const el = new THREE.Group();
    el.position.set(0, -ARM_UPPER, 0);
    sh.add(el);
    el.add(mesh(set.armFore, M.shell));
    arms.push({ side, pivot: sh, elbow: el });

    const hip = new THREE.Group();
    hip.position.set(side * HIP.x, HIP.y, HIP.z);
    pelvis.add(hip);
    hip.add(mesh(set.thigh, M.shell));
    const knee = new THREE.Group();
    knee.position.set(0, -THIGH, 0);
    hip.add(knee);
    knee.add(mesh(set.shin, M.shell));
    legs.push({ side, pivot: hip, knee });
  }

  let contact = M.contact;
  if (!contact) {
    contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bodiesMod.makeBasic(bodiesMod.whiteTex(), 0x000000));
    contact.material.opacity = 0.72;
    contact.rotation.x = -Math.PI / 2;
  }
  contact.position.set(0, 0.035, 0);
  contact.scale.setScalar(6.4);   // 1.3 m radius x 4.6, the factory's own proportion
  contact.frustumCulled = true;
  root.add(contact);

  let drawCount = 0;
  root.traverse((o) => { if (o.isMesh) drawCount++; });

  const eyeBase = M.eye.color.clone();
  const ventBase = M.vent.color.clone();
  // The rim is what separates a silhouette from the trees (bodies.js RIM_GAIN 0.055,
  // ART.md 5.4). A boss carries 1.6x of it: at 4.40 m its edge is most of what the moon
  // gives you at 40 m, and it is measured in tests/boss.mjs, not argued.
  const RIM = M.shell.userData.rimGain * 1.6;
  M.rimGain(RIM);

  const rig = {
    root, pelvis, torso, shellMesh, eyeMesh, ventMesh, contact, arms, legs,
    shellMat: M.shell, eyeMat: M.eye, ventMat: M.vent,
    drawCount,          // meshes inside the root: shell + eyes + vents + contact + 8 limbs
    shellDraws: 1,      // the merged trunk is ONE draw

    /** 0 = held back in the dark, 1 = fully lit. THE REVEAL BUDGET. */
    reveal(v) { M.reveal(v); },

    /** 0..1 windup charge: the rim x2 (x3 at full) and the eyes flare. */
    telegraph(v) {
      M.rimGain(RIM * (1 + v * 3.0));
      const g = 1 + v * 2.4;
      M.eye.color.setRGB(eyeBase.r * g, eyeBase.g * g, eyeBase.b * g);
    },

    /** 0 = shut (mesh hidden), 1 = fully open and glowing. */
    vents(v) {
      if (v <= 0.02) { ventMesh.visible = false; return; }
      ventMesh.visible = true;
      M.vent.color.setRGB(ventBase.r * v, ventBase.g * v, ventBase.b * v);
    },

    /** dead: the embers go out over the fold and never come back. */
    deathGlow(v) {
      M.eye.color.setRGB(eyeBase.r * v, eyeBase.g * v, eyeBase.b * v);
      M.eye.opacity = v;
    },

    /**
     * Write every joint from the pose record. Pure, allocation-free.
     *  a.stand   0..1 kneeling -> standing
     *  a.fold    0..1 alive -> face down
     *  a.sweep   0..1 the raised arm (telegraph)
     *  a.swing   0..1 the arc across the front
     *  a.side    -1 | 1 which arm sweeps
     *  a.gait    stride phase, radians
     *  a.moveAmp 0..1
     *  a.breath  metres of chest lift
     */
    pose(a) {
      const s = ease(a.stand), f = ease(a.fold);
      const P0 = KNEEL, P1 = STAND, P2 = DEAD;
      const pelvisY = lerp(lerp(P0[0], P1[0], s), P2[0], f);
      const pitch = lerp(lerp(P0[1], P1[1], s), P2[1], f);
      const shRx = lerp(lerp(P0[2], P1[2], s), P2[2], f);
      const shRz = lerp(lerp(P0[3], P1[3], s), P2[3], f);
      const elRx = lerp(lerp(P0[4], P1[4], s), P2[4], f);
      const hipRx = lerp(lerp(P0[5], P1[5], s), P2[5], f);
      const hipRz = lerp(lerp(P0[6], P1[6], s), P2[6], f);
      const kneeRx = lerp(lerp(P0[7], P1[7], s), P2[7], f);
      const amp = a.moveAmp * s * (1 - f);

      pelvis.position.y = pelvisY + Math.sin(a.gait * 2) * 0.05 * amp;
      torso.rotation.x = pitch - Math.abs(Math.sin(a.gait)) * 0.04 * amp;
      torso.position.y = a.breath;

      for (let i = 0; i < 2; i++) {
        const A = arms[i];
        const sw = A.side === a.side ? 1 : 0;
        const other = 1 - sw;
        const swing = Math.sin(a.gait + (A.side < 0 ? Math.PI : 0)) * 0.40 * amp;
        let rx = shRx - swing;
        let rz = A.side * shRz;
        let ex = elRx - Math.abs(swing) * 0.5;
        // the sweep: the striking arm goes high and out to its side, then across
        const raise = a.sweep * sw + a.sweep * 0.25 * other;
        rx = lerp(rx, 1.75, raise);
        rz = lerp(rz, A.side * 1.35, raise);
        ex = lerp(ex, -0.20, raise);
        if (sw) {
          rx = lerp(rx, 1.35, a.swing);
          rz = lerp(rz, -A.side * 0.85, a.swing);
        }
        A.pivot.rotation.x = rx;
        A.pivot.rotation.z = rz;
        A.elbow.rotation.x = ex;
      }
      for (let i = 0; i < 2; i++) {
        const L = legs[i];
        const ph = a.gait + (L.side < 0 ? 0 : Math.PI);
        L.pivot.rotation.x = hipRx + Math.sin(ph) * 0.55 * amp;
        L.pivot.rotation.z = L.side * hipRz;
        L.knee.rotation.x = kneeRx - Math.max(0, -Math.sin(ph - 0.7)) * 0.70 * amp;
      }
    },

    dispose() { M.dispose(); },
  };
  return rig;
}

/**
 * The two numbers the zones need, from the same pose the rig would draw.
 * Returns pelvis height and torso pitch into `out` — kneeler.js calls this in
 * step() so a hit zone is where the pixels are without touching a matrix.
 */
export function poseFrame(stand, fold, out) {
  const s = ease(stand), f = ease(fold);
  out.pelvisY = lerp(lerp(KNEEL[0], STAND[0], s), DEAD[0], f);
  out.pitch = lerp(lerp(KNEEL[1], STAND[1], s), DEAD[1], f);
  return out;
}

export const KNEELER_HEIGHT = 4.40;
export default { buildKneelerRig, kneelerSet, poseFrame, ZONES };
