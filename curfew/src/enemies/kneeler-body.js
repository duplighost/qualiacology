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
// THE MATERIALS COME OFF bodies.js's OWN FACTORIES. As of ROUND 7 bodies.js exports
// makeShell() and contactTex() (docs/ROUND-6/HANDOFF-C.md item 1, docs/NEXT.md section E), so
// the shell Lambert, the glint Basic and the contact disc are built by the one factory that
// exists and cannot drift out of program-sharing with the six species. The old path — build a
// whole hound at boot, keep three of its materials and throw the body away — is still below
// as a guarded fallback and is no longer taken.
//
// ROUND 7 REBUILT THE BODY. The round-6 build read as a CARTOON OWL at 3.4 m under the torch
// (tests/shots/bodylook/before-kneeler-cathedral-near.png): two big round glowing eyes on a
// smooth ball head, sausage arms, capsule legs. See the note at the top of kneelerSet() for
// the five rules that replaced it and the measurement behind each one.
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
const SKIN = 0x141210;      // the limbs, one step lighter so a joint has an edge
const BONE = 0x1e1a16;     // spurs, plates, the brow, the claws. MEASURED 2026-09-03 (ROUND 7): at
                            // 0x36302a the new crest, ribs and jaw blew to near-white under the
                            // torch at 3.4 m — tests/shots/bodylook/after1-kneeler-garden-of-rest-near.png
                            // read a PALE SANDSTONE SNOUT, the mannequin fault wearing a new costume.
                            // and MEASURED AGAIN with tests/artifacts/d-hide.mjs, which turns the
                            // rim and the albedo off separately in one rAF: mid-sweep at 2.6 m
                            // under the torch the rim was worth 16 of the 40 mean and the albedo
                            // the other 24, and tests/boss.mjs (e) reads 125 against a gate of 46.
                            // The rebuild put FAR more bone on screen than the old body had —
                            // crest, ribs, plates, jaw, teeth, claws, arm plates — so the same hex
                            // is three times the area. 0x1e1a16 is 1.6x CLOTH: the bone still
                            // gives the torch an edge to find, and the crest earns its read at
                            // range from SHAPE against the sky, which costs no value at all.
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
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  torus: new THREE.TorusGeometry(0.5, 0.10, 5, 10),
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
  { x: 0.10, y: 1.24, z: -1.58, r: 0.56, zone: 'head' },
  { x: -0.46, y: 1.62, z: 0.76, r: 0.36, zone: 'vent' },
  { x: 0.46, y: 1.62, z: 0.76, r: 0.36, zone: 'vent' },
  { x: 0.00, y: 1.42, z: -0.05, r: 1.02, zone: 'plate' },
  { x: 0.00, y: 0.38, z: 0.06, r: 0.82, zone: 'plate' },
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

  /* ------------------------------------------------------------------ WHY THIS IS A REBUILD.
     MEASURED 2026-09-03, ROUND 7 lane D (tools/bodylook.mjs --boss, PNG
     tests/shots/bodylook/before-kneeler-cathedral-near.png): at 3.4 m under the torch the old
     body read as a CARTOON OWL. Two big round glowing eyes dead centre of a smooth ball head,
     plump sausage arms, capsule legs, every surface a soft overlapping ellipsoid. Nothing in
     it was wrong in code; it was round, symmetric and front-faced, and those three things are
     what "cute" is made of. NEXT.md B4 called it a mannequin; the picture says owl. Same bug.

     So the rules for this build, and every one of them is a thing the picture showed:

       1. THE FACE IS NOT ON THE FRONT. The head hangs UNDER and AHEAD of the yoke on a long
          neck, bowed toward the ground, the way a bear's or a bull's does. You meet the top
          of a skull before you meet its eyes, and the eyes are set on the SIDES of it.
       2. THE GLINTS ARE SLITS, NOT MOONS. Two 17 cm x 4.5 cm lozenges recessed under a bone
          brow, not two 13 cm spheres proud of the socket. A slit blooms into a LINE; a sphere
          blooms into a headlamp, and a headlamp is a face.
       3. HARD BONE BREAKS EVERY ROUND. A crest of eleven uneven spurs down the spine, ribs
          that overhang the flank, plates that stand off the chest, a jaw with teeth. The
          crest is also the ROAD READ: a jagged edge against the sky resolves at 30 m where a
          smooth lump does not (docs/STATUS.md bug 5 — at night the sky is the light).
       4. NOTHING IS SYMMETRIC. The left shoulder is 18 cm higher than the right, the hump sits
          off to -X, the ribs are offset a rib apart, the crest leans.
       5. IT IS THIN WHERE A PERSON IS THICK. The chest is 0.78 deep against 1.14 wide, so from
          the front it is a mass and from the side it is a blade.
     ---------------------------------------------------------------------------------------- */

  // --- the pelvis and haunches: low, wide, and heavier on one side
  w.add(P.sph, 0.06, 0.06, 0.10, CLOTH, { sx: 1.44, sy: 0.66, sz: 1.06, rz: 0.10 });
  w.add(P.sph, -0.32, 0.30, 0.46, CLOTH, { sx: 1.12, sy: 0.74, sz: 0.88, rz: 0.22 });
  w.add(P.sph, 0.44, 0.22, 0.30, CLOTH, { sx: 0.86, sy: 0.58, sz: 0.76, rz: -0.16 });

  // --- the barrel. NARROW IN Z: 0.78 deep against 1.14 wide, so the thing is a blade from
  //     the side and a wall from the front. A starved chest, not a ball.
  w.add(P.cap, -0.02, 0.88, -0.10, CLOTH, { sx: 1.14, sy: 0.86, sz: 0.78, rz: 0.06 });
  w.add(P.sph, 0.08, 1.24, -0.28, CLOTH, { sx: 1.06, sy: 0.62, sz: 0.66, rz: -0.10 });

  // --- the yoke, TIPPED: the left shoulder rides high and the right has dropped
  w.add(P.sph, -0.12, 1.66, -0.06, CLOTH, { sx: 1.72, sy: 0.68, sz: 0.78, rz: -0.17 });
  // --- the HUMP: the weight collapsed to -X and back. The top of the folded shape.
  w.add(P.sph, -0.42, 2.04, 0.42, CLOTH, { sx: 1.38, sy: 1.04, sz: 1.26, rz: 0.16 });
  w.add(P.sph, 0.34, 1.80, 0.30, CLOTH, { sx: 0.90, sy: 0.64, sz: 0.86, rz: -0.20 });
  // shoulder caps at two different heights (the pivots are mirrored to match, see the rig)
  w.add(P.sph, -1.04, 1.84, -0.02, CLOTH, { sx: 0.68, sy: 0.58, sz: 0.70 });
  w.add(P.sph, 0.98, 1.54, -0.06, CLOTH, { sx: 0.58, sy: 0.50, sz: 0.60 });

  // A collapsed antler crown grows sideways out of the load-bearing yoke.
  // These are not decorative spikes on the back: they change the whole outline
  // at road range and stop the raised body becoming a large gorilla.
  const ANTLER = [
    [-0.72, 2.22, 0.04, -0.62, 1.24], [-1.13, 2.52, 0.04, 0.48, 0.82],
    [-1.34, 2.38, 0.02, -0.88, 0.56], [0.62, 2.05, 0.02, 0.58, 1.04],
    [0.98, 2.30, 0.01, -0.42, 0.68], [1.16, 2.17, -0.01, 0.92, 0.48],
  ];
  for (let i = 0; i < ANTLER.length; i++) {
    const a = ANTLER[i];
    w.add(P.cone3, a[0], a[1], a[2], BONE,
      { rx: -0.12 + (i % 2) * 0.22, rz: a[3], sx: 0.11, sy: a[4], sz: 0.11 });
  }

  // Four open thoracic hoops replace a single smooth chest wall. Their front
  // halves catch the torch while the black gaps remain black, even point blank.
  for (let i = 0; i < 4; i++) {
    w.add(P.torus, (i % 2 ? 0.05 : -0.04), 0.92 + i * 0.23, -0.40 - i * 0.025, BONE,
      { rz: (i - 1.5) * 0.035, sx: 1.42 - i * 0.09,
        sy: 0.76 - i * 0.055, sz: 0.48 });
  }

  // --- RIBS. Curved bone spurs standing off the flank, offset one rib between the sides so
  //     the two halves never line up. These are what a torch finds at 3 m: an edge, not a wall.
  const RIB = [1.02, 1.26, 1.50, 1.74];
  for (let i = 0; i < RIB.length; i++) {
    for (const side of [-1, 1]) {
      const y = RIB[i] + (side < 0 ? 0.11 : 0);
      const k = 1 - i * 0.11;
      w.add(P.cone3, side * (0.72 + i * 0.03), y, 0.06 + i * 0.05, BONE, {
        rz: side * (1.15 - i * 0.10), rx: -0.28,
        sx: 0.15 * k, sy: 0.86 * k, sz: 0.15 * k,
      });
    }
  }

  // --- THE CREST. Eleven uneven spurs from the pelvis to the crown of the hump. This is the
  //     silhouette at 30 m: measured before this build, the boss's box from the road at the
  //     Cathedral was 124 x 175 px and only 2151 of them were the body, because a smooth lump
  //     that is 0.19 of its backdrop is a smudge. A saw edge is a shape.
  const CREST = [
    [-0.10, 1.02, 0.86, 0.62, -1.05, 0.10],
    [-0.22, 1.34, 0.92, 0.78, -1.15, 0.26],
    [-0.06, 1.66, 0.94, 0.92, -1.20, -0.10],
    [-0.34, 1.92, 0.88, 1.12, -1.05, 0.34],
    [-0.02, 2.14, 0.80, 1.34, -0.86, -0.06],
    [-0.48, 2.28, 0.62, 1.18, -0.72, 0.52],
    [-0.18, 2.46, 0.46, 1.40, -0.55, 0.18],
    [0.24, 2.30, 0.44, 0.98, -0.62, -0.40],
    [-0.72, 2.06, 0.28, 0.86, -0.50, 0.74],
    [0.54, 2.00, 0.26, 0.74, -0.46, -0.66],
    [-0.06, 2.56, 0.10, 1.06, -0.30, 0.06],
  ];
  for (let i = 0; i < CREST.length; i++) {
    const c = CREST[i];
    w.add(P.cone3, c[0], c[1], c[2], BONE, {
      rx: c[4], rz: c[5], sx: 0.19, sy: c[3], sz: 0.19,
    });
  }

  // --- the plates: bone bands standing OFF the chest, crooked, so the front is not a sheet
  const PLATES = [
    [0.10, 0.86, -0.52, 1.06, -0.14], [-0.10, 1.10, -0.58, 1.30, 0.08],
    [0.16, 1.32, -0.60, 0.92, -0.22], [-0.14, 1.52, -0.60, 1.16, 0.12],
    [0.42, 1.00, -0.50, 0.44, 0.36], [-0.44, 0.70, -0.44, 0.52, -0.30],
  ];
  for (let i = 0; i < PLATES.length; i++) {
    const p = PLATES[i];
    w.add(P.box, p[0], p[1], p[2], BONE, { sx: p[3], sy: 0.070, sz: 0.13, rz: p[4], rx: -0.16 });
  }

  // --- THE NECK. Three segments going forward and DOWN from under the yoke. The head is not
  //     on top of this animal; it is slung under the front of it, and that one fact is most of
  //     what stops the shape reading as a person in a costume.
  w.add(P.cap, 0.06, 1.52, -0.56, SKIN, { rx: 1.02, sx: 0.50, sy: 0.44, sz: 0.50 });
  w.add(P.cap, 0.09, 1.36, -0.98, SKIN, { rx: 1.24, sx: 0.44, sy: 0.40, sz: 0.44 });
  w.add(P.cap, 0.10, 1.26, -1.28, SKIN, { rx: 1.36, sx: 0.38, sy: 0.30, sz: 0.38 });

  // --- THE SKULL. Long, narrow, and bowed toward the ground: 1.05 m of it along -Z against
  //     0.44 m across. Cavity first, then the cranial plate, then the jaw with the mouth void
  //     between them, then sockets sunk into the SIDES (bodies.js sculptHead order).
  const HX = 0.10, HY = 1.24, HZ = -1.62;
  w.add(P.sph, HX, HY, HZ + 0.12, VOID, { sx: 0.52, sy: 0.52, sz: 0.92 });
  // MEASURED 2026-09-03 (tests/shots/bodylook/after2-kneeler-garden-of-rest-near.png): a full
  // width BONE cranium and a BONE muzzle made the head one solid pale mass at 3.4 m — a
  // sandstone snout with nothing dark anywhere on it. So the head is HIDE with a narrow bone
  // ridge, and bone is spent only where it is an EDGE: the ridge, the brows, the jaw, the
  // teeth. The VOID cavity is left showing down both flanks, which is where the head gets its
  // value from at every range.
  w.add(P.sph, HX, HY + 0.16, HZ + 0.04, CLOTH, { rx: 0.12, sx: 0.46, sy: 0.28, sz: 0.94 });
  w.add(P.box, HX, HY + 0.28, HZ + 0.02, BONE, { rx: 0.10, sx: 0.11, sy: 0.07, sz: 0.86 });
  // the muzzle tapers to a point: a skull, not a helmet. Hide over it, bone only at the tip.
  w.add(P.cone5, HX, HY - 0.02, HZ - 0.50, CLOTH, { rx: -1.57, sx: 0.30, sy: 0.44, sz: 0.28 });
  w.add(P.cone5, HX, HY - 0.02, HZ - 0.74, BONE, { rx: -1.57, sx: 0.17, sy: 0.16, sz: 0.16 });
  // temple horns sweeping BACK over the neck
  for (const side of [-1, 1]) {
    w.add(P.cone3, HX + side * 0.24, HY + 0.24, HZ + 0.34, BONE, {
      rx: -2.25, rz: side * 0.42, sx: 0.14, sy: 0.92, sz: 0.14,
    });
  }
  // the long lower jaw, hung slightly open
  w.add(P.box, HX, HY - 0.28, HZ - 0.04, BONE, { rx: -0.12, sx: 0.32, sy: 0.10, sz: 1.00 });
  // and a VOID gap between the jaw and the head, so the jaw is a separate bone and not a chin
  w.add(P.box, HX, HY - 0.205, HZ - 0.04, VOID, { rx: -0.11, sx: 0.30, sy: 0.05, sz: 0.98 });
  // the mouth: a VOID slot the whole length of the jaw. A hole, not a painted line.
  w.add(P.box, HX, HY - 0.15, HZ - 0.04, VOID, { rx: -0.10, sx: 0.31, sy: 0.15, sz: 0.96 });
  // teeth, both rows, uneven
  for (let i = 0; i < 5; i++) {
    const z = HZ - 0.44 + i * 0.20;
    const h = 0.11 + (i % 2 ? 0.05 : 0);
    for (const side of [-1, 1]) {
      w.add(P.cone3, HX + side * 0.12, HY - 0.10, z, BONE, { rx: Math.PI, sx: 0.06, sy: h, sz: 0.06 });
      w.add(P.cone3, HX + side * 0.12, HY - 0.235, z + 0.08, BONE, { sx: 0.055, sy: h * 0.9, sz: 0.055 });
    }
  }
  // sockets: deep VOID pits, high and set on the sides of the skull and a little forward
  for (const side of [-1, 1]) {
    w.add(P.sphLo, HX + side * 0.215, HY + 0.09, HZ + 0.14, VOID, { sx: 0.24, sy: 0.24, sz: 0.34 });
  }
  // a bone brow standing OVER each socket. It hides MOST of the ember and not all of it: at
  // after2 the brow was 0.10 deep over a socket 4 cm behind it and the glints were simply gone
  // from every angle, which is not "sunk", it is absent.
  for (const side of [-1, 1]) {
    w.add(P.box, HX + side * 0.225, HY + 0.235, HZ + 0.20, BONE, {
      rz: side * 0.34, rx: -0.14, sx: 0.12, sy: 0.075, sz: 0.40,
    });
  }

  // --- the vents: two VOID seams on the back with bone lips, now on the hump's flanks
  for (const side of [-1, 1]) {
    w.add(P.box, side * 0.46, 1.62, 0.70, BONE, { rx: 0.25, sx: 0.42, sy: 0.66, sz: 0.06 });
    w.add(P.box, side * 0.46, 1.62, 0.735, VOID, { rx: 0.25, sx: 0.28, sy: 0.50, sz: 0.05 });
  }
  const shell = w.geometry('kneeler-shell');

  // --- THE GLINTS: slits, recessed. Rule 2 above. 17 x 4.5 cm, sunk 4 cm INSIDE the socket
  //     mouth so the brow above cuts them from any angle over the head.
  const e = new Weld();
  for (const side of [-1, 1]) {
    e.add(P.sphLo, HX + side * 0.235, HY + 0.095, HZ + 0.10, 0xffffff,
      { rz: side * 0.20, sx: 0.095, sy: 0.015, sz: 0.070 });
  }
  const eyes = e.geometry('kneeler-eyes');

  // --- the open vents: two lozenges standing 3 cm proud of the seams
  const v = new Weld();
  for (const side of [-1, 1]) {
    v.add(P.box, side * 0.46, 1.62, 0.765, 0xffffff, { rx: 0.25, sx: 0.22, sy: 0.44, sz: 0.05 });
  }
  const vents = v.geometry('kneeler-vents');

  // --- limbs, each authored hanging DOWN from its own pivot.
  //     The old arm was one capsule and one capsule: a sausage. This one has a deltoid, a
  //     taper, three bone plates down the outside and a spur at the elbow.
  const au = new Weld();
  au.add(P.sph, 0, -0.16, 0, CLOTH, { sx: 0.70, sy: 0.62, sz: 0.68 });
  au.add(P.cap, 0, -ARM_UPPER * 0.52, 0, SKIN, { sx: 0.42, sy: ARM_UPPER * 0.60, sz: 0.38 });
  for (let i = 0; i < 3; i++) {
    au.add(P.box, 0.20, -0.42 - i * 0.32, 0.02, BONE, { rz: -0.30 + i * 0.08, sx: 0.10, sy: 0.26, sz: 0.24 });
  }
  au.add(P.cone3, 0.12, -ARM_UPPER + 0.06, 0.16, BONE, { rx: -1.9, rz: -0.5, sx: 0.13, sy: 0.42, sz: 0.13 });
  au.add(P.sphLo, 0, -ARM_UPPER, 0, SKIN, { sx: 0.40, sy: 0.36, sz: 0.40 });
  const armUpper = au.geometry('kneeler-arm');

  // the forearm: a bone blade the whole length of it, and FOUR claws that reach past the hand
  const af = new Weld();
  af.add(P.cap, 0, -ARM_FORE * 0.5, 0, SKIN, { sx: 0.34, sy: ARM_FORE * 0.60, sz: 0.30 });
  af.add(P.box, -0.14, -ARM_FORE * 0.5, 0.02, BONE, { rz: 0.05, sx: 0.07, sy: ARM_FORE * 0.86, sz: 0.20 });
  af.add(P.box, 0, -ARM_FORE - 0.06, -0.12, BONE, { sx: 0.40, sy: 0.20, sz: 0.50 });
  const CLAW = [-0.20, -0.07, 0.07, 0.20];
  for (let i = 0; i < CLAW.length; i++) {
    const long = i === 1 || i === 2;
    af.add(P.cone3, CLAW[i], -ARM_FORE - 0.16, -0.44, BONE, {
      rx: -1.32 - (i % 2) * 0.10, rz: CLAW[i] * 0.9,
      sx: 0.075, sy: long ? 0.52 : 0.38, sz: 0.075,
    });
  }
  const armFore = af.geometry('kneeler-fore');

  // the thigh: heavy, with a bone cap over the knee
  const th = new Weld();
  th.add(P.sph, 0, -0.14, 0, CLOTH, { sx: 0.72, sy: 0.60, sz: 0.68 });
  th.add(P.cap, 0, -THIGH * 0.52, 0, SKIN, { sx: 0.52, sy: THIGH * 0.60, sz: 0.48 });
  th.add(P.box, 0, -THIGH + 0.04, -0.20, BONE, { rx: 0.20, sx: 0.44, sy: 0.30, sz: 0.10 });
  th.add(P.sphLo, 0, -THIGH, 0, SKIN, { sx: 0.46, sy: 0.40, sz: 0.46 });
  const thigh = th.geometry('kneeler-thigh');

  // the shin: thin, bladed, on a long three-toed foot
  const sh = new Weld();
  sh.add(P.cap, 0, -SHIN * 0.5, 0, SKIN, { sx: 0.36, sy: SHIN * 0.60, sz: 0.34 });
  sh.add(P.box, 0, -SHIN * 0.5, 0.16, BONE, { sx: 0.16, sy: SHIN * 0.80, sz: 0.06 });
  sh.add(P.box, 0, -SHIN - 0.04, -0.16, BONE, { sx: 0.42, sy: 0.16, sz: 0.72 });
  for (let i = -1; i <= 1; i++) {
    sh.add(P.cone3, i * 0.15, -SHIN - 0.10, -0.52, BONE, { rx: -1.45, sx: 0.07, sy: 0.30, sz: 0.07 });
  }
  const shin = sh.geometry('kneeler-shin');

  SET = { shell, eyes, vents, armUpper, armFore, thigh, shin };
  return SET;
}

/* ==========================================================================
   Materials. Borrowed from the one factory (see the header).
   ========================================================================== */
function borrowMaterials(rng) {
  // THE PREFERRED PATH, and it is live since ROUND 7: bodies.js exports makeShell and
  // contactTex (docs/ROUND-6/HANDOFF-C.md item 1, docs/NEXT.md section E). The boss no longer
  // builds a whole hound at boot just to steal three materials off it.
  if (typeof bodiesMod.makeShell === 'function' && typeof bodiesMod.contactTex === 'function') {
    const shell = bodiesMod.makeShell(1, 1, 1);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      bodiesMod.makeBasic(bodiesMod.contactTex(), 0x000000));
    contact.material.opacity = 0.72;
    contact.rotation.x = -Math.PI / 2;
    // THE PAINTED CAST SHADOW. NEXT.md B4: "fully lit, no shadow". A real one needs
    // castShadow, and castShadow on a vertexColors Lambert links a DEPTH program the day the
    // boss first enters the moon's cascade — mid-play, which is the one thing the program
    // budget forbids (AGENTS.md). So the shadow is PAINTED: the same soft disc, stretched
    // along the ground away from the moon and laid under the body. One draw, no program, and
    // at 3 m it is the difference between a thing standing on the ground and a thing floating
    // over it. Its offset and stretch are written once by the rig from the moon's bearing.
    const cast = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      bodiesMod.makeBasic(bodiesMod.contactTex(), 0x000000));
    cast.material.opacity = 0.46;
    cast.rotation.x = -Math.PI / 2;
    return {
      shell, contact, cast,
      eye: bodiesMod.makeBasic(bodiesMod.whiteTex(), new THREE.Color(EYE).multiplyScalar(EYE_GAIN)),
      vent: bodiesMod.makeBasic(bodiesMod.whiteTex(), new THREE.Color(VENT).multiplyScalar(VENT_GAIN)),
      reveal: (v) => { shell.userData.reveal = v; const u = shell.userData.uniforms; if (u) u.uReveal.value = v; },
      rimGain: (v) => { shell.userData.rimGain = v; const u = shell.userData.uniforms; if (u) u.uRimGain.value = v; },
      dispose() { shell.dispose(); if (contact.material) contact.material.dispose(); if (cast.material) cast.material.dispose(); },
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
    // ASYMMETRY, rule 4: the -X shoulder rides 18 cm higher and 6 cm wider than the +X one,
    // matching the tipped yoke in the shell. A body whose two halves line up is a mannequin
    // however good its surface is, and the two halves lining up is the only thing the old
    // rig and the old shell agreed on.
    const lift = side < 0 ? 0.18 : 0;
    sh.position.set(side * (SHOULDER.x + (side < 0 ? 0.07 : 0)), SHOULDER.y + lift, SHOULDER.z);
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

  // The painted cast shadow (see borrowMaterials). It hangs off a pivot in the ROOT's frame,
  // so it does not rise with the pelvis or pitch with the torso: a shadow stays on the ground.
  // The pivot's yaw aims the long axis away from the moon; rig.shadow() writes it.
  const cast = M.cast || null;
  let castPivot = null;
  if (cast) {
    castPivot = new THREE.Group();
    castPivot.name = 'kneeler-cast';
    cast.position.set(0, 0.030, 2.4);   // 5 mm under the contact disc, and thrown 2.4 m out
    cast.scale.set(5.6, 9.4, 1);
    cast.frustumCulled = true;
    castPivot.add(cast);
    root.add(castPivot);
  }

  let drawCount = 0;
  root.traverse((o) => { if (o.isMesh) drawCount++; });

  const eyeBase = M.eye.color.clone();
  const ventBase = M.vent.color.clone();
  // The rim is what separates a silhouette from the trees (bodies.js RIM_GAIN 0.055,
  // ART.md 5.4). A boss carried 1.6x of it, and that was sized for a body of smooth capsules
  // with almost no grazing geometry on it. The rebuilt hide is crest spurs, ribs, plates,
  // teeth and claws, and rimF is (1 - dot)^3 — every one of those edges is a rim edge, so the
  // SAME gain now paints three times as much of the body. Measured mid-sweep at 2.6 m
  // (tests/artifacts/d-hide.mjs): the rim alone was worth 16 of a 40 mean. 1.10x.
  const RIM = M.shell.userData.rimGain * 1.10;
  M.rimGain(RIM);

  const rig = {
    root, pelvis, torso, shellMesh, eyeMesh, ventMesh, contact, arms, legs,
    shellMat: M.shell, eyeMat: M.eye, ventMat: M.vent,
    drawCount,          // meshes inside the root: shell + eyes + vents + contact + 8 limbs
    shellDraws: 1,      // the merged trunk is ONE draw

    /** 0 = held back in the dark, 1 = fully lit. THE REVEAL BUDGET. */
    reveal(v) { M.reveal(v); },

    /**
     * Aim the painted cast shadow. (wx, wz) is the WORLD direction the shadow falls in — the
     * moon's bearing, negated — and yaw is the root's own yaw, because the pivot lives inside
     * it. Allocation-free; kneeler.js calls it from present().
     * `up` is how high the moon is: a light overhead throws a short shadow.
     */
    shadow(wx, wz, yaw, up) {
      if (!castPivot) return;
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const lx = wx * c - wz * s;
      const lz = wx * s + wz * c;
      castPivot.rotation.y = Math.atan2(lx, lz);
      const stretch = 0.55 + 1.7 * (1 - (up < 0 ? 0 : up > 1 ? 1 : up));
      cast.scale.set(5.6, 9.4 * stretch, 1);
      cast.position.z = 1.1 + 2.6 * stretch;
    },

    /** 0..1 windup charge: the rim x2 (x3 at full) and the eyes flare. */
    telegraph(v) {
      M.rimGain(RIM * (1 + v * 1.8));
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
