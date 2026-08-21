// The relay — VIGIL's hero structure and orientation compass. One parametric
// CFG drives the visible geometry, the colliders, and the ground layers, so
// the structure IS its collision (Eclipse's relay lesson). Simplified from
// Eclipse's 34 m helix tower to a 9 m deck with two broad straight ramps: a
// horde needs a clean fighting bowl and ramps enemies can actually walk.

import * as THREE from 'three';
import { TAU, clamp } from '../engine/math.js';

export const CFG = {
  floorY: 0.40,        // circular floor plate over the flattened bowl
  floorR: 15.5,
  deckY: 9.0,
  deckIn: 4.6,
  deckOut: 13.0,
  coreR: 4.2,          // central shaft, floor -> above deck
  columnR: 17.0,       // outer column ring (under-deck arcade)
  columns: 10,
  pylonR: 5.9,
  pylons: 6,
  rampW: 7.0,          // two straight ramps along +X / -X
  rampFoot: 26.0,      // ground end (x = rampFoot), sits on the flat bowl
  rampHead: 12.4,      // deck end   (x = rampHead), under the deck lip
  rampFootY: 0.30,     // the flat bowl height — the ramp MEETS the ground
  railH: 1.05,         // rail height above the ramp surface
  beamTop: 46,
};

/* ---------------- materials (Eclipse palette, verbatim) ---------------- */

function materials() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0xb4bfd0, roughness: 0.42, metalness: 0.56, emissive: 0x08162b, emissiveIntensity: 0.23 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x8fa0b5, roughness: 0.5, metalness: 0.42, side: THREE.DoubleSide }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x243047, roughness: 0.62, metalness: 0.45, emissive: 0x07101d, emissiveIntensity: 0.22 }),
    panelMetal: new THREE.MeshStandardMaterial({ color: 0x344764, roughness: 0.55, metalness: 0.4, emissive: 0x08152a, emissiveIntensity: 0.16 }),
    cyanTrim: new THREE.MeshStandardMaterial({ color: 0x193044, roughness: 0.24, metalness: 0.58, emissive: 0x35dfff, emissiveIntensity: 1.28 }),
    violetTrim: new THREE.MeshStandardMaterial({ color: 0x25193f, roughness: 0.25, metalness: 0.52, emissive: 0x896dff, emissiveIntensity: 1.05 }),
    beam: new THREE.MeshBasicMaterial({ color: 0x68ddff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  };
}

/* ramp height along its run, or null when (x,z) is off this ramp.
   sign +1 = the +X ramp, -1 = the -X ramp.
   t = 0 at the FOOT (ground, far from centre), 1 at the HEAD (deck, near
   centre): the ramp climbs TOWARD the tower. The visible mesh must be
   rotated -sign*slope to match this — getting that sign backwards is what
   made the first build's ramps un-walkable and back-to-front. */
function rampHeight(x, z, sign) {
  const lx = x * sign;
  if (Math.abs(z) > CFG.rampW / 2) return null;
  if (lx < CFG.rampHead || lx > CFG.rampFoot) return null;
  const t = (CFG.rampFoot - lx) / (CFG.rampFoot - CFG.rampHead);
  return CFG.rampFootY + (CFG.deckY - CFG.rampFootY) * t;
}

/**
 * Public: the walkable centreline of a ramp, for enemy routing.
 * `foot` sits OUTSIDE the rail mouth on purpose — the rails are solid, so a
 * body must come around to the opening rather than grind against the side.
 */
export function rampWaypoints(sign) {
  return {
    foot: { x: sign * (CFG.rampFoot + 2.4), z: 0 },
    head: { x: sign * (CFG.rampHead + 0.6), z: 0 },
  };
}
/** Is (x,z) inside a ramp corridor? Returns the sign, or 0. */
export function onRamp(x, z) {
  if (Math.abs(z) > CFG.rampW / 2) return 0;
  const ax = Math.abs(x);
  if (ax < CFG.rampHead - 0.5 || ax > CFG.rampFoot + 1.0) return 0;
  return x >= 0 ? 1 : -1;
}

/**
 * Structure ground layers for groundAt: returns the highest structure surface
 * at (x,z), or null. Caller applies the one-way platform grace.
 */
export function structureSurfaces(x, z) {
  const d = Math.hypot(x, z);
  const out = [];
  if (d < CFG.floorR) out.push(CFG.floorY);
  if (d >= CFG.deckIn && d <= CFG.deckOut) out.push(CFG.deckY);
  const ra = rampHeight(x, z, 1);
  if (ra !== null) out.push(ra);
  const rb = rampHeight(x, z, -1);
  if (rb !== null) out.push(rb);
  return out.length ? out : null;
}

export function buildStructure(colliderApi) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'relay';
  const trims = { cyan: M.cyanTrim, violet: M.violetTrim };

  const add = (mesh, { shadow = true } = {}) => {
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // floor plate
  add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.floorR, CFG.floorR + 0.6, 0.4, 48), M.floor), { shadow: false })
    .position.y = CFG.floorY - 0.2;
  colliderApi.place({ kind: 'relay-floor', decor: true }); // walkable layer, not a wall

  // floor edge trim ring
  const floorRing = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.floorR + 0.3, 0.09, 8, 64), M.cyanTrim), { shadow: false });
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = CFG.floorY + 0.05;

  // central core shaft
  const core = add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.coreR, CFG.coreR + 0.5, CFG.deckY + 3.4, 24), M.panelMetal));
  core.position.y = (CFG.deckY + 3.4) / 2;
  colliderApi.place({ kind: 'relay-core', x: 0, z: 0, r: CFG.coreR + 0.25, yMin: 0, yMax: CFG.deckY + 3.4 });
  // core bands
  for (const [y, mat] of [[2.2, M.cyanTrim], [5.4, M.violetTrim], [8.4, M.cyanTrim]]) {
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.coreR + 0.28, 0.07, 8, 40), mat), { shadow: false });
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
  }

  // deck annulus (with a real hole)
  const deckGeo = new THREE.RingGeometry(CFG.deckIn, CFG.deckOut, 56, 1);
  deckGeo.rotateX(-Math.PI / 2);
  const deck = add(new THREE.Mesh(deckGeo, M.deck), { shadow: false });
  deck.position.y = CFG.deckY;
  const deckSkirt = add(new THREE.Mesh(new THREE.CylinderGeometry(CFG.deckOut + 0.15, CFG.deckOut + 0.15, 0.55, 56, 1, true), M.darkMetal), { shadow: false });
  deckSkirt.position.y = CFG.deckY - 0.28;
  // deck rims
  for (const [r, mat] of [[CFG.deckOut + 0.18, M.cyanTrim], [CFG.deckIn - 0.12, M.violetTrim]]) {
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.10, 8, 64), mat), { shadow: false });
    rim.rotation.x = Math.PI / 2;
    rim.position.y = CFG.deckY + 0.10;
  }

  // outer columns with cross-braces (the under-deck arcade)
  for (let i = 0; i < CFG.columns; i++) {
    const a = (i / CFG.columns) * TAU;
    const x = Math.cos(a) * CFG.columnR, z = Math.sin(a) * CFG.columnR;
    // skip columns that would block the two ramps
    if (Math.abs(z) < CFG.rampW / 2 + 0.9 && Math.abs(x) > CFG.rampHead - 1) continue;
    const col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.68, CFG.deckY, 10), M.darkMetal));
    col.position.set(x, CFG.deckY / 2, z);
    colliderApi.place({ kind: 'relay-column', x, z, r: 0.62, yMin: 0, yMax: CFG.deckY });
    const shoe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 10), M.panelMetal), { shadow: false });
    shoe.position.set(x, 0.55, z);
  }

  // pylons rising past the deck, with trim rings
  for (let i = 0; i < CFG.pylons; i++) {
    const a = (i / CFG.pylons) * TAU + 0.26;
    const x = Math.cos(a) * CFG.pylonR, z = Math.sin(a) * CFG.pylonR;
    const h = CFG.deckY + 8.5;
    const py = add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, h, 8), M.panelMetal));
    py.position.set(x, h / 2, z);
    colliderApi.place({ kind: 'relay-pylon', x, z, r: 0.5, yMin: 0, yMax: h });
    const ringT = add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 22), i % 2 ? M.violetTrim : M.cyanTrim), { shadow: false });
    ringT.rotation.x = Math.PI / 2;
    ringT.position.set(x, CFG.deckY + 6.8, z);
  }

  // aperture crown above the core + dishes
  const crown = add(new THREE.Mesh(new THREE.TorusGeometry(CFG.coreR + 0.9, 0.16, 10, 48), M.cyanTrim), { shadow: false });
  crown.rotation.x = Math.PI / 2;
  crown.position.y = CFG.deckY + 3.6;

  const dishes = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 8), M.darkMetal);
    mast.position.y = 1.3;
    mast.castShadow = true;
    arm.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 12, 0, TAU, 0, 1.05), M.panelMetal);
    dish.position.y = 2.7;
    dish.rotation.x = -0.9;
    dish.castShadow = true;
    arm.add(dish);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), s > 0 ? M.cyanTrim : M.violetTrim);
    eye.position.set(0, 2.7, 0.6);
    arm.add(eye);
    arm.position.set(s * 2.6, CFG.deckY + 3.4, s * 1.4);
    g.add(arm);
    dishes.push(arm);
  }

  // the energy beam up through the aperture — near-invisible, additive
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, CFG.beamTop, 14, 1, true), M.beam);
  beam.position.y = CFG.beamTop / 2 + 2;
  g.add(beam);

  // ---- ramps: the only way up, so they must read as a road and behave as one
  const rise = CFG.deckY - CFG.rampFootY;
  const len = CFG.rampFoot - CFG.rampHead;
  const run = Math.hypot(len, rise);
  const slope = Math.atan2(rise, len);            // 34.5 deg
  for (const sign of [1, -1]) {
    const midX = sign * (CFG.rampFoot + CFG.rampHead) / 2;
    const midY = (CFG.rampFootY + CFG.deckY) / 2;
    // deck (rotation NEGATED vs sign: the head end must be the HIGH end)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(run, 0.34, CFG.rampW), M.deck);
    ramp.position.set(midX, midY - 0.17, 0);
    ramp.rotation.z = -sign * slope;
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    g.add(ramp);

    // treads: cross-bars that make the climb legible at a glance
    const treads = 11;
    for (let i = 0; i < treads; i++) {
      const t = (i + 0.5) / treads;                       // 0 foot .. 1 head
      const lx = sign * (CFG.rampFoot - t * len);
      const ly = CFG.rampFootY + rise * t;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, CFG.rampW - 0.5), M.darkMetal);
      bar.position.set(lx, ly + 0.03, 0);
      bar.rotation.z = -sign * slope;
      g.add(bar);
    }

    for (const zs of [-1, 1]) {
      const zEdge = zs * (CFG.rampW / 2 - 0.18);
      // rail post-and-beam, plus the emissive guide tube on top
      const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(run, 0.14, 0.16), M.darkMetal);
      beamMesh.position.set(midX, midY + CFG.railH, zEdge);
      beamMesh.rotation.z = -sign * slope;
      beamMesh.castShadow = true;
      g.add(beamMesh);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, run, 6), zs > 0 ? M.cyanTrim : M.violetTrim);
      tube.rotation.z = Math.PI / 2 - sign * slope;
      tube.position.set(midX, midY + CFG.railH + 0.14, zEdge);
      g.add(tube);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const lx = sign * (CFG.rampFoot - t * len);
        const ly = CFG.rampFootY + rise * t;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, CFG.railH, 0.12), M.darkMetal);
        post.position.set(lx, ly + CFG.railH / 2, zEdge);
        post.castShadow = true;
        g.add(post);
      }
      // ONE box collider per rail: a low wall you slide along, and bullets
      // clear it above railH. Spans the ramp run in X, thin in Z.
      // The box stops 1.6 m short of the head: up there the ramp is level
      // with the deck, and a rail spanning that far would wall off the deck
      // edge and make anything standing on the deck path all the way around.
      const railLoX = CFG.rampHead + 1.6, railHiX = CFG.rampFoot;
      colliderApi.place({
        kind: 'ramp-rail',
        box: {
          minX: Math.min(sign * railLoX, sign * railHiX),
          maxX: Math.max(sign * railLoX, sign * railHiX),
          minZ: zEdge - 0.22, maxZ: zEdge + 0.22,
          yMin: CFG.rampFootY, yMax: CFG.deckY + CFG.railH,
        },
      });
    }

    // an apron wedge so the foot visibly meets the moon instead of floating
    const apron = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, CFG.rampW), M.deck);
    apron.position.set(sign * (CFG.rampFoot + 0.7), CFG.rampFootY - 0.22, 0);
    apron.receiveShadow = true;
    g.add(apron);

    colliderApi.place({ kind: 'relay-ramp', decor: true }); // walkable via structureSurfaces
  }

  let t = 0;
  return {
    group: g,
    dishes,
    /** trim breathing + beam + power-up over the run (world.update drives). */
    update(dt, threat, powerIn) {
      const power = 0.35 + powerIn * 0.65;
      t += dt;
      const pulse = 0.5 + 0.5 * Math.sin(t * (1.35 + threat * 0.55));
      M.cyanTrim.emissiveIntensity = (1.02 + pulse * 0.27) * power;
      M.violetTrim.emissiveIntensity = (0.84 + pulse * 0.24 + threat * 0.2) * power;
      M.floor.emissiveIntensity = 0.17 + power * 0.145;
      M.beam.opacity = power * (0.055 + pulse * 0.038 + threat * 0.018);
      beam.scale.set(0.94 + pulse * 0.08, 1, 0.94 + pulse * 0.08);
      beam.rotation.y += (0.035 + threat * 0.025) * dt;
      dishes[0].rotation.y = 0.42 + Math.sin(t * 0.075) * 0.48;
      dishes[1].rotation.y = -1.25 - Math.sin(t * 0.061 + 1.7) * 0.58;
      dishes[0].rotation.x = Math.sin(t * 0.055) * 0.12;
      dishes[1].rotation.x = Math.sin(t * 0.047 + 0.9) * 0.11;
    },
  };
}
