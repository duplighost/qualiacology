// THE VIEWMODEL RIG — four transforms, one gun, and the sight alignment that the
// source game got wrong by 0.4 degrees for its entire life.
//
// This module takes three.js off `ctx.THREE` rather than importing 'three'. That
// is deliberate and it is not stylistic: it keeps this file loadable in node, so
// tests/weapons.mjs can assert the SIGHT MATHS — the one part of a viewmodel that
// is a correctness question rather than a taste question — without a GPU, a
// browser or an import map. Everything that needs a real device is behind
// `create`d state and degrades to an honest no-op rig. `./models.js` obeys the
// same rule for the same reason: it emits typed arrays, not BufferGeometries.
//
// THE FOUR TRANSFORMS, composed in this order every frame:
//   1. POSE     hip <-> ADS, front-loaded (70% of travel in the first 45% of the
//               time) while the FOV eases separately, so the weapon snaps to the
//               eye and the world does not lurch. The hip pose carries a
//               ROTATION as well as a translation — a gun that is axis-aligned
//               with the camera reads as a decal stuck to the lens — and that
//               rotation eases to zero as the sights come up, because at ADS the
//               gun must be square to the world or the front post walks.
//   2. BOB      0.55x the camera's positional amplitude, lagged ~42 ms, driven by
//               the SAME phase clock as the camera and the footsteps. A separate
//               weapon-bob timer is how a viewmodel starts to read as a sticker.
//   3. KICK     the weapon-kick spring — ~70% of all felt recoil, and entirely
//               cosmetic. The gun moves seven times as far as your aim does; that
//               ratio is the whole illusion.
//   4. RELOAD   a phase animation off the reload clock, so the magazine leaves,
//               seats (ammo is credited HERE) and returns.
//
// THE POSE IS APPLIED AT CONSTRUCTION, not on the first update(). That is not a
// micro-optimisation, it is a bug fix with a screenshot attached: the gate's
// frame driver calls render.update()/render.render() without ticking gameplay,
// so on every captured frame the rig sat at its own local origin — which is the
// player's eye — and the emissive readout block rendered 12 cm from the near
// plane as a flat rectangle across the middle of the picture. Anything whose
// FRAMING depends on a gameplay tick having happened is a viewmodel that is
// wrong for one frame in the game and wrong forever in the harness.
//
// THE SIGHT. Aim is aligned to the WORLD camera's projected centre, never the
// viewmodel camera's. Both cameras share a transform in FLARE, so with a zero
// offset the two agree — but the moment anyone gives the viewmodel camera the
// small lateral offset that every engine eventually acquires, aligning to it puts
// the front post off the world camera's centre ray by atan(offset / sightDistance),
// which at 4 mm and 0.6 m is 0.38 degrees, left, forever. `sightAngularError()`
// below is that arithmetic, and the gate asserts both halves of it.

import FEEL from '../feel.js';
import { clamp, clamp01, DEG } from '../core/math.js';
import { WEAPONS, reserveNotch, reloadPhase, TABLE as WT } from './table.js';
import { MODEL_TABLE, buildAll } from './models.js';

/** The ONE frozen table this module owns. */
export const VIEWMODEL_TABLE = Object.freeze({
  sightDistance: 0.6,        // metres from the eye to the front post at ADS

  // THE HIP POSE. Lower-right, canted, and far enough forward that the receiver
  // sits in the lower-right third of the frame rather than across the middle of
  // it. Verified by screenshot (tests/shots/viewmodel-*.png), never by
  // arithmetic: the two are different because the P4 lens is 48 degrees while
  // the world runs 68, so intuition calibrated on the world camera is wrong here
  // by a factor of about 1.6 in solid angle.
  hip: Object.freeze({ x: 0.155, y: -0.128, z: -0.335 }),
  // Radians. The yaw is what keeps a 0.68 m barrel out of the centre of the
  // frame: without it the LANCE's muzzle converges on the crosshair, which is
  // both ugly and an automatic failure on the framing check.
  hipRot: Object.freeze({ pitch: -0.028, yaw: -0.075, roll: 0.105 }),

  poseFrontLoad: 0.45,       // 70% of the travel happens inside this fraction
  poseFrontAmount: 0.70,
  bobLagMs: FEEL.camera.bob.weaponLagMs,
  kickZ: 0.028, kickY: 0.006,
  kickPitchDeg: 3.4, kickYawDeg: 1.1, kickRollDeg: 2.2,
  reloadDropY: -0.11, reloadRollDeg: 22, reloadYawDeg: -16,
  reloadReturn: 0.86,

  // Per-weapon silhouette. `len` is the distance from the model origin to the
  // muzzle crown, `sight` to the front post, `postY` the height of the sighting
  // element above the bore — the LANCE's is its scope's optical axis, which is
  // why it is four times anyone else's. models.js is authored against these
  // three numbers, so the ADS solve and the mesh cannot drift apart.
  //
  //
  // `girth` and `chamber` are GONE. They were the box rig's two dimensions and
  // nothing outside this file ever read them; leaving a dead field in a frozen
  // table is how the next person tunes a number that does not do anything.
  // `hx/hy/hz` shift the HIP pose per weapon, and they are not decoration: a
  // pistol is held closer to the chest and higher than a rifle, and a shotgun
  // rides low and wide. They also do measurable work — four weapons posed
  // identically overlap far more of each other's screen footprint than four
  // weapons held the way they would be held, and the silhouette gate reads that
  // overlap directly.
  shapes: Object.freeze({
    sidearm: Object.freeze({ len: 0.30, sight: 0.26, postY: 0.0245, hx: 0.004, hy: 0.016, hz: 0.032 }),
    repeater: Object.freeze({ len: 0.52, sight: 0.46, postY: 0.0262, hx: 0, hy: 0, hz: 0 }),
    breacher: Object.freeze({ len: 0.42, sight: 0.36, postY: 0.0322, hx: 0.012, hy: -0.016, hz: -0.008 }),
    // The LANCE's sighting element is its OPTIC's front lens, not a post on the
    // barrel: that is what a scoped rifle aims with, it is what `postY` is the
    // height of, and putting it on the ray at 0.6 m is the same solve as a
    // pistol's blade. A front post at 0.62 m would be a 5.5 cm tower of iron
    // sight co-witnessed through a scope, which is not a thing.
    lance: Object.freeze({ len: 0.68, sight: 0.20, postY: 0.0555, hx: -0.006, hy: -0.006, hz: -0.020 }),
  }),

  // The reserve readout's colour. Warm, and at FEEL.enemies.stripEmissive.max
  // (0.18) it is a long way under the 0.85 bloom threshold, so it reads as three
  // countable marks and never as glare.
  notchEmissive: 0xffc27a,
});

const V = VIEWMODEL_TABLE;

/**
 * The front post's target position, in RIG space (which is exactly world-camera
 * space, because render.viewmodelRig copies the world camera's matrix).
 *
 * `alignTo` is 'world' (correct) or 'view' (the bug). With the viewmodel camera
 * offset from the world camera by (ox, oy), aligning to it puts the post that far
 * off the centre ray.
 */
export function sightTarget(distance, ox, oy, alignTo, out) {
  const o = out || { x: 0, y: 0, z: 0 };
  const useView = alignTo === 'view';
  o.x = useView ? ox : 0;
  o.y = useView ? oy : 0;
  o.z = -distance;
  return o;
}

/** Angular error, in degrees, of a post placed `ox,oy` off the centre ray. */
export function sightAngularError(ox, oy, distance) {
  if (!(distance > 0)) return 0;
  return Math.atan(Math.hypot(ox, oy) / distance) / DEG;
}

/**
 * The ADS translation that puts a weapon's own front post on the world camera's
 * centre ray. Pure, so the gate can check it against the shapes table directly.
 *
 * The Y term is the half of this that the box-model rig never had: the sighting
 * element sits ABOVE the bore (2.4 cm on a pistol, 5.6 cm on a scoped rifle), so
 * a pose that only solves Z leaves the post floating that far over the crosshair
 * and the player aims with the barrel instead of the sights.
 */
export function adsOffset(shape, out) {
  const o = out || { x: 0, y: 0, z: 0 };
  o.x = 0;                                  // the post is on the weapon's centreline
  o.y = -(shape.postY || 0);                // drop the gun until the post is on the ray
  o.z = -V.sightDistance + shape.sight;     // slide it back until post == 0.6 m
  return o;
}

/** Front-loaded ease: 70% of the travel inside the first 45% of the time. */
export function poseEase(t) {
  const p = clamp01(t);
  const a = V.poseFrontLoad, b = V.poseFrontAmount;
  return p <= a ? (p / a) * b : b + ((p - a) / (1 - a)) * (1 - b);
}

/** A no-op rig. Standalone development and the headless gate both land here. */
function nullRig() {
  return {
    enabled: false,
    update() {}, kick() {}, select() {}, dispose() {},
    snapshot: () => ({ enabled: false, meshes: 0, notch: 0, programsDelta: 0 }),
    verify: () => ({ allOnViewmodelLayer: true, programsDelta: 0, detail: 'no device — rig not built' }),
  };
}

export function makeViewmodel(ctx) {
  const THREE = ctx && ctx.THREE;
  const render = ctx && ctx.render;
  if (!THREE || !render || !render.viewmodelRig || !render.materials) return nullRig();

  const programsBefore = ctx.renderer && ctx.renderer.info ? ctx.renderer.info.programs.length : 0;

  const group = new THREE.Group();
  render.viewmodelRig.add(group);

  const meshes = [];
  const addMesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    // THREE'S LAYERS DO NOT INHERIT. A mesh that misses this line renders in P1,
    // at world scale, through the 68-degree lens, six metres behind the player —
    // and P4's own contribution test still "passes" at 0.09%.
    m.layers.set(render.LAYERS.VIEWMODEL);
    // The rig lives 0.25-0.6 m from a camera whose matrix is copied every frame;
    // there is no frustum in which it is absent and culling it costs a sphere
    // test per mesh for nothing.
    m.frustumCulled = false;
    group.add(m);
    meshes.push(m);
    return m;
  };

  // ---- geometry: every weapon, built once, off the GPU ---------------------
  // Three surface draws and four readout draws for whichever gun is in hand.
  // The part count is irrelevant to the draw count because models.js merges by
  // MATERIAL, which is the only merge that matters (BufferGeometryUtils is not
  // vendored; this is the same job done at the source).
  const GROUPS = MODEL_TABLE.groupOrder;
  const ids = WEAPONS.map(w => w.id);
  const data = buildAll(ids);
  const geo = {};          // geo[id][group] and geo[id].notches[i]
  const allGeometries = [];

  const toGeometry = d => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(d.normal, 3));
    g.setIndex(new THREE.BufferAttribute(d.index, 1));
    g.computeBoundingSphere();
    allGeometries.push(g);
    return g;
  };

  let allTriangles = 0;
  for (const id of ids) {
    const built = data[id];
    const entry = { notches: [], triangles: 0 };
    for (const g of GROUPS) {
      entry[g] = toGeometry(built.groups[g]);
      entry.triangles += built.groups[g].triangles;
      allTriangles += built.groups[g].triangles;
    }
    // reserveNotchMax BLOCKS, reserveNotchMax + 1 countable states (0 = dark).
    for (let i = 0; i < WT.reserveNotchMax; i++) entry.notches.push(toGeometry(built.notches[i]));
    geo[id] = entry;
  }

  // ---- materials: three finishes and four readout segments ----------------
  // Seven materials, TWO programs. r161 interns a RawShaderMaterial's program by
  // source string, so a per-part finish costs uniforms and nothing else — which
  // is what lets the gun have a polymer grip, a parkerised receiver and a bright
  // barrel instead of one albedo everywhere. The rim strength is the roughness
  // channel: it is the only gloss term FS_VIEWMODEL_SURFACE has, and rim is what
  // makes a silhouette legible against black without lifting the body.
  const surfaceMats = {};
  const surfaceMeshes = {};
  for (const g of GROUPS) {
    const spec = MODEL_TABLE.groups[g];
    surfaceMats[g] = render.materials.viewmodelSurface({ color: spec.color, rim: spec.rim });
    surfaceMeshes[g] = addMesh(geo[ids[0]][g], surfaceMats[g]);
  }

  const notchMats = [];
  const notchMeshes = [];
  for (let i = 0; i < WT.reserveNotchMax; i++) {
    const mat = render.materials.viewmodelEmissive({
      emissive: V.notchEmissive, intensity: FEEL.enemies.stripEmissive.max,
    });
    notchMats.push(mat);
    notchMeshes.push(addMesh(geo[ids[0]].notches[i], mat));
  }

  const programsAfter = ctx.renderer && ctx.renderer.info ? ctx.renderer.info.programs.length : 0;

  // ---- per-frame state, allocated once ------------------------------------
  const pos = new THREE.Vector3();
  const ads = { x: 0, y: 0, z: 0 };
  let shapeId = WEAPONS[0].id;
  let shape = V.shapes[shapeId];
  let adsBlend = 0;
  let bobPhase = 0, bobX = 0, bobY = 0;
  // The weapon-kick spring. Underdamped on purpose: the overshoot is the "snap".
  const kick = { p: 0, pv: 0, y: 0, yv: 0, r: 0, rv: 0, z: 0, zv: 0, sign: 1 };
  const springK = FEEL.recoil.weaponSpring.k;
  const springD = FEEL.recoil.weaponSpring.d;
  let notch = WT.reserveNotchMax;

  function applyShape() {
    const entry = geo[shapeId] || geo[ids[0]];
    for (const g of GROUPS) surfaceMeshes[g].geometry = entry[g];
    for (let i = 0; i < notchMeshes.length; i++) notchMeshes[i].geometry = entry.notches[i];
    adsOffset(shape, ads);
    pose();
  }

  function select(index) {
    shapeId = (WEAPONS[index] && V.shapes[WEAPONS[index].id]) ? WEAPONS[index].id : WEAPONS[0].id;
    shape = V.shapes[shapeId];
    applyShape();
  }

  /**
   * Compose the four transforms onto the group. Called every frame AND once at
   * construction, so a rig that is never updated is still framed correctly.
   */
  function pose() {
    const e = poseEase(adsBlend);
    const rest = 1 - e;
    const R = V.hipRot;
    // The hip pose is per-weapon; the ADS pose is not, because the ADS pose is
    // the SOLVE (post on the centre ray at 0.6 m) and a per-weapon nudge there
    // would be a per-weapon aiming error.
    const hx = V.hip.x + (shape.hx || 0);
    const hy = V.hip.y + (shape.hy || 0);
    const hz = V.hip.z + (shape.hz || 0);
    pos.set(
      hx + (ads.x - hx) * e + bobX,
      hy + (ads.y - hy) * e + bobY + kick.y + poseDropY,
      hz + (ads.z - hz) * e + kick.z,
    );
    group.position.copy(pos);
    group.rotation.set(
      kick.p + R.pitch * rest,
      kick.y + poseYaw + R.yaw * rest,
      kick.r + poseRoll + R.roll * rest,
    );
  }
  let poseDropY = 0, poseRoll = 0, poseYaw = 0;   // the reload animation's channels

  select(0);

  /** One shot's worth of cosmetic kick. `mul` is the WEAPON column of the state table. */
  function kickShot(aimPitch, aimYaw, mul, index) {
    kick.sign = -kick.sign;
    kick.pv += V.kickPitchDeg * DEG * mul;
    kick.yv += V.kickYawDeg * DEG * mul * kick.sign;
    kick.rv += V.kickRollDeg * DEG * mul * kick.sign;
    kick.zv += V.kickZ * mul;
    if (index !== undefined && WEAPONS[index] && shapeId !== WEAPONS[index].id) select(index);
  }

  function spring(value, vel, dt) {
    // Semi-implicit, so it stays stable at 144 Hz and at 30.
    const a = -springK * springK * value - 2 * springD * springK * vel;
    const v = vel + a * dt;
    return [value + v * dt, v];
  }

  function update(rdt, state, recoil, aim, clock) {
    const dt = Math.min(rdt, FEEL.time.rawDtClamp);

    // 1. POSE
    const want = aim && aim.ads ? 1 : 0;
    const rate = 1 / Math.max(1e-3, FEEL.camera.adsMs / 1e3);
    adsBlend = clamp01(adsBlend + (want ? rate : -rate) * dt);
    const e = poseEase(adsBlend);

    // 2. BOB — one clock, lagged. The lag is what stops the gun reading as welded
    //    to the skull; without it a bobbing camera and a bobbing weapon are one
    //    rigid object and the whole effect disappears.
    const lag = V.bobLagMs / 1e3;
    const speed = aim ? aim.speed || 0 : 0;
    const B = FEEL.camera.bob;
    const hz = clamp(B.hzBase + B.hzPerSpeed * speed, B.hzBase, B.hzMax);
    // ONE clock. If the aim provider publishes the camera rig's t_c we ride it,
    // lagged; only the standalone path falls back to a local phase, and that
    // fallback is a second timer by definition — which is why it is a fallback.
    const shared = aim && aim.bobPhase >= 0;
    bobPhase = shared ? aim.bobPhase - lag * Math.PI * 2 * hz : (clock - lag) * Math.PI * 2 * hz;
    const amp = Math.pow(Math.max(0, speed) / B.speedRef, B.speedPow) * B.weaponScale * (1 - e * (1 - B.adsScale));
    bobX = B.ax * Math.sin(bobPhase) * amp;
    bobY = -B.ay * Math.cos(bobPhase * 2) * amp;

    // 3. KICK
    let r = spring(kick.p, kick.pv, dt); kick.p = r[0]; kick.pv = r[1];
    r = spring(kick.y, kick.yv, dt); kick.y = r[0]; kick.yv = r[1];
    r = spring(kick.r, kick.rv, dt); kick.r = r[0]; kick.rv = r[1];
    r = spring(kick.z, kick.zv, dt); kick.z = r[0]; kick.zv = r[1];

    // 4. RELOAD
    const phase = state ? reloadPhase(state) : 0;
    poseDropY = 0; poseRoll = 0; poseYaw = 0;
    if (phase > 0) {
      // Out to the drop, hold through the seat, back by reloadReturn.
      const outP = clamp01(phase / WT.reloadDrop);
      const backP = clamp01((phase - V.reloadReturn) / Math.max(1e-3, 1 - V.reloadReturn));
      const held = outP * (1 - backP);
      poseDropY = V.reloadDropY * held;
      poseRoll = V.reloadRollDeg * DEG * held;
      poseYaw = V.reloadYawDeg * DEG * held;
    }

    pose();

    // The RESERVE readout: four discrete notches, countable through bloom, a 17x
    // gain range and a deuteran eye. Each notch is its OWN mesh with its own
    // uNotch, so three-of-four is three lit blocks and one dark one — a count,
    // not a brightness. A single block dimmed to 0.75 is unreadable through the
    // grade, which is what the previous rig asked the player to do.
    // Empty reserve goes fully dark and STAYS dark.
    if (state) {
      notch = reserveNotch(state);
      for (let i = 0; i < notchMats.length; i++) notchMats[i].uniforms.uNotch.value = i < notch ? 1 : 0;
    }
    // The MAGAZINE readout rides on the muzzle flash (fire.js), never here: two
    // readouts on one channel is how the draft made 12/12-with-empty-reserve the
    // brightest possible frame.
    void recoil;
  }

  function dispose() {
    for (const m of meshes) group.remove(m);
    meshes.length = 0;
    render.viewmodelRig.remove(group);
    for (const g of allGeometries) g.dispose();
    allGeometries.length = 0;
    for (const g of GROUPS) surfaceMats[g].dispose();
    for (const m of notchMats) m.dispose();
  }

  return {
    enabled: true,
    group, meshes,
    update,
    kick: kickShot,
    select,
    dispose,
    get notch() { return notch; },
    snapshot: () => ({
      enabled: true, meshes: meshes.length, notch, adsBlend,
      // The triangle count of what is IN HAND, not the whole armoury: all four
      // are resident (they are 30 KB of vertex data between them and swapping a
      // geometry reference must never hitch), but only one is ever drawn.
      weapon: shapeId, triangles: (geo[shapeId] || geo[ids[0]]).triangles, allTriangles,
      programsDelta: programsAfter - programsBefore,
      kickPitchDeg: kick.p / DEG,
    }),
    verify() {
      const bad = meshes.filter(m => !m.layers.test(maskOf(render.LAYERS.VIEWMODEL)));
      // A rig whose pose was never composed sits at the player's own eye, which
      // is not a subtle failure — it is a flat rectangle across the middle of
      // every frame — and it is invisible to a layer check, so it is asserted
      // here as well.
      const posed = group.position.lengthSq() > 0;
      return {
        allOnViewmodelLayer: bad.length === 0,
        posed,
        programsDelta: programsAfter - programsBefore,
        detail: `${meshes.length} meshes, ${(geo[shapeId] || geo[ids[0]]).triangles} tris in hand (${allTriangles} resident), ${bad.length} off-layer, posed=${posed}`,
      };
    },
  };

  function maskOf(layer) {
    const l = new THREE.Layers();
    l.set(layer);
    return l;
  }
}

export default makeViewmodel;
