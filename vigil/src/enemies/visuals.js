// High-detail enemy bodies kept separate from navigation and combat logic.
//
// All rigid decoration is baked into module-scope BufferGeometries. This buys
// ribs, bevels, pistons, cages, and claws without turning every detail into a
// draw call. Opaque surface materials are shared across the whole pool; the
// small emissive telegraph materials are cloned per actor because enemies.js
// intentionally animates their emissiveIntensity independently.

import * as THREE from 'three';
import { chamferedBox, taperedPanel } from '../gfx/shapes.js';

const PI = Math.PI;
const VIOLET = 0x896dff;

/* -------------------------------------------------------------------------
 * Rigid-geometry assembly
 * ---------------------------------------------------------------------- */

const UNIT_ROD_5 = new THREE.CylinderGeometry(1, 1, 1, 5, 1, false);
const UNIT_ROD_6 = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
const UNIT_TAPER_5 = new THREE.CylinderGeometry(0.58, 1, 1, 5, 1, false);
const UNIT_CLAW_4 = new THREE.ConeGeometry(1, 1, 4, 1, false);
const UP = new THREE.Vector3(0, 1, 0);

function at(geometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return {
    geometry,
    position: new THREE.Vector3(x, y, z),
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    scale: new THREE.Vector3(sx, sy, sz),
  };
}

function between(geometry, ax, ay, az, bx, by, bz, radius = 0.05, endRadius = radius) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const delta = b.clone().sub(a);
  const length = delta.length();
  const radiusScale = (radius + endRadius) * 0.5;
  return {
    geometry,
    position: a.add(b).multiplyScalar(0.5),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, delta.normalize()),
    scale: new THREE.Vector3(radiusScale, length, radiusScale),
  };
}

function mergeRigid(...pieces) {
  const prepared = [];
  let vertexCount = 0;

  for (const piece of pieces.flat().filter(Boolean)) {
    const matrix = new THREE.Matrix4().compose(piece.position, piece.quaternion, piece.scale);
    const transformed = piece.geometry.clone();
    transformed.applyMatrix4(matrix);
    const flat = transformed.index ? transformed.toNonIndexed() : transformed;
    const position = flat.getAttribute('position');
    const normal = flat.getAttribute('normal');
    prepared.push({ transformed, flat, position, normal });
    vertexCount += position.count;
  }

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  let offset = 0;
  for (const item of prepared) {
    positions.set(item.position.array, offset * 3);
    if (item.normal) normals.set(item.normal.array, offset * 3);
    offset += item.position.count;
    if (item.flat !== item.transformed) item.flat.dispose();
    item.transformed.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (prepared.some(item => !item.normal)) merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/* -------------------------------------------------------------------------
 * Shared opaque materials + per-actor emissive prototypes
 * ---------------------------------------------------------------------- */

function surface(name, color, opts = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.76,
    metalness: 0.14,
    flatShading: true,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    ...opts,
  });
  material.name = name;
  return material;
}

function emissivePrototype(name, color, intensity) {
  return surface(name, color, {
    roughness: 0.44,
    metalness: 0.12,
    emissive: VIOLET,
    emissiveIntensity: intensity,
  });
}

function reactiveMaterial(prototype, suffix) {
  const material = prototype.clone();
  material.name = `${prototype.name}-${suffix}`;
  return material;
}

// Dark enough to remain alien, but never crushed to black under the relay.
// Threat still owns violet; readable value separation owns silhouette.
const VOID_DARK_MAT = surface('enemy-void-dark', 0x171824, { roughness: 0.9, metalness: 0.08 });
const THRALL_BODY_MAT = surface('thrall-sinew', 0x2d263d, { roughness: 0.88, metalness: 0.06 });
const THRALL_RIB_MAT = surface('thrall-ribs', 0x4a3b59, { roughness: 0.67, metalness: 0.2 });
const WARDEN_ARMOR_MAT = surface('warden-armor', 0x3c485a, { roughness: 0.48, metalness: 0.52 });
const CHORISTER_SHELL_MAT = surface('chorister-carapace', 0x322a42, { roughness: 0.72, metalness: 0.18 });

const THRALL_GLOW_PROTO = emissivePrototype('thrall-violet', 0x241d3d, 1.1);
const WARDEN_GLOW_PROTO = emissivePrototype('warden-violet', 0x241d3d, 0.9);
const WARDEN_VENT_PROTO = emissivePrototype('warden-vent-violet', 0x2a1f4d, 0.6);
const CHORISTER_GLOW_PROTO = emissivePrototype('chorister-violet', 0x241d3d, 1.0);
const CHORISTER_SAC_PROTO = emissivePrototype('chorister-sac-violet', 0x2a1f4d, 1.2);
const PLANET_CRUST_MAT = surface('planet-lunar-crust', 0x737b89, { roughness: 0.94, metalness: 0.035 });
const PLANET_CRATER_MAT = surface('planet-crater-shadow', 0x2d3240, { roughness: 0.97, metalness: 0.025 });
const PLANET_CAGE_MAT = surface('planet-armillary-cage', 0x202938, { roughness: 0.58, metalness: 0.61 });
const PLANET_APERTURE_PROTO = emissivePrototype('planet-target-aperture', 0x241d3d, 1.28);

const PLANET_VIOLET = new THREE.Color(VIOLET);
const PLANET_AMBER = new THREE.Color(0xffb35d);
const NEG_Z = new THREE.Vector3(0, 0, -1);

function addMesh(parent, geometry, material, name, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  const emissive = material.emissive && material.emissive.getHex() !== 0;
  // Mass-bearing opaque forms ground the silhouette. Tiny telegraph anatomy
  // stays out of the shadow map so eyes, seams, vents, and sacs remain cheap.
  mesh.castShadow = !emissive;
  mesh.receiveShadow = !emissive;
  parent.add(mesh);
  return mesh;
}

/* -------------------------------------------------------------------------
 * PLANET — hostile siege moon / world-space orbital artillery
 * Four meshes: deformed lunar crust, dark crater inlays, armillary cage,
 * and the protruding reactive aperture. All geometry is boot-built and all
 * opaque materials are shared; only the aperture material is actor-local.
 * ---------------------------------------------------------------------- */

const PLANET_CRATERS = [
  { n: new THREE.Vector3(0.34, 0.57, -0.75).normalize(), size: 0.34, depth: 0.18, squash: 0.86 },
  { n: new THREE.Vector3(-0.71, 0.21, -0.67).normalize(), size: 0.25, depth: 0.13, squash: 1.18 },
  { n: new THREE.Vector3(0.82, -0.36, -0.44).normalize(), size: 0.22, depth: 0.11, squash: 0.78 },
  { n: new THREE.Vector3(-0.29, -0.78, 0.56).normalize(), size: 0.30, depth: 0.15, squash: 1.06 },
  { n: new THREE.Vector3(0.12, 0.91, 0.40).normalize(), size: 0.18, depth: 0.08, squash: 0.92 },
  { n: new THREE.Vector3(0.65, 0.18, 0.74).normalize(), size: 0.16, depth: 0.07, squash: 1.12 },
];

function planetCrustGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const position = geometry.getAttribute('position');
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).normalize();
    // Low-amplitude, deterministic macro relief breaks the perfect sphere
    // before the authored crater bowls and raised rims are applied.
    let radius = 1.78
      + Math.sin(p.x * 17.3 + p.z * 8.1) * 0.026
      + Math.sin(p.y * 23.7 - p.x * 5.4) * 0.017
      + Math.sin((p.x + p.y + p.z) * 31.9) * 0.010;
    for (const crater of PLANET_CRATERS) {
      const angle = Math.acos(Math.max(-1, Math.min(1, p.dot(crater.n))));
      const u = angle / crater.size;
      if (u >= 1.18) continue;
      if (u < 1) {
        const bowl = 1 - u * u;
        radius -= crater.depth * bowl * bowl;
      }
      const rim = Math.exp(-Math.pow((u - 0.96) / 0.105, 2));
      radius += crater.depth * 0.32 * rim;
    }
    position.setXYZ(i, p.x * radius, p.y * radius, p.z * radius);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function radialPiece(geometry, normal, radius, sx = 1, sy = 1, sz = 1) {
  return {
    geometry,
    position: normal.clone().multiplyScalar(radius),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal),
    scale: new THREE.Vector3(sx, sy, sz),
  };
}

const PLANET_CRUST_GEO = planetCrustGeometry();
const PLANET_CRATER_DISC = new THREE.CylinderGeometry(1, 0.82, 0.075, 14, 1, false);
const PLANET_CRATER_GEO = mergeRigid(
  ...PLANET_CRATERS.map((crater, i) => radialPiece(
    PLANET_CRATER_DISC,
    crater.n,
    1.78 - crater.depth + 0.018,
    crater.size * (1.24 + (i % 2) * 0.08) * crater.squash,
    1,
    crater.size * 1.24 / crater.squash,
  )),
);

const PLANET_RING = new THREE.TorusGeometry(2.08, 0.055, 6, 48);
const PLANET_NODE = new THREE.DodecahedronGeometry(0.105, 0);
const PLANET_CAGE_GEO = mergeRigid(
  at(PLANET_RING),
  at(PLANET_RING, 0, 0, 0, 0.64, 0.15, 0.08),
  at(PLANET_RING, 0, 0, 0, -0.47, 0.42, -0.18),
  ...[
    [2.08, 0, 0], [-2.08, 0, 0], [0, 2.08, 0], [0, -2.08, 0],
    [0, 0, 2.08], [0, 0, -2.08],
  ].map(([x, y, z]) => at(PLANET_NODE, x, y, z)),
);

const PLANET_APERTURE_GEO = mergeRigid(
  at(new THREE.CylinderGeometry(0.31, 0.47, 0.26, 12, 1, false), 0, 0, 0, -PI / 2),
  at(new THREE.TorusGeometry(0.49, 0.072, 7, 20), 0, 0, -0.13),
  ...[0, 1, 2].map(i => at(
    new THREE.ConeGeometry(0.085, 0.30, 5),
    Math.cos(i * PI * 2 / 3) * 0.55,
    Math.sin(i * PI * 2 / 3) * 0.55,
    0.02,
    PI / 2,
    0,
    -i * PI * 2 / 3,
  )),
);

function buildPlanet() {
  const group = new THREE.Group();
  group.name = 'planet';
  const apertureGlow = reactiveMaterial(PLANET_APERTURE_PROTO, group.uuid);

  const body = new THREE.Group();
  body.name = 'lunar-body';
  group.add(body);
  addMesh(body, PLANET_CRUST_GEO, PLANET_CRUST_MAT, 'deformed-cratered-crust');
  addMesh(body, PLANET_CRATER_GEO, PLANET_CRATER_MAT, 'crater-shadow-inlays');

  const cage = addMesh(group, PLANET_CAGE_GEO, PLANET_CAGE_MAT, 'counter-rotating-armillary');

  // AI may pass a world-space aimDir to animate(). The pivot keeps the
  // visible aperture and the aimed weak-zone contract on the same -Z axis.
  const aimPivot = new THREE.Group();
  aimPivot.name = 'targeting-pivot';
  group.add(aimPivot);
  const aperture = addMesh(
    aimPivot, PLANET_APERTURE_GEO, apertureGlow, 'reactive-target-aperture', 0, 0, -1.82,
  );
  aperture.castShadow = false;
  aperture.receiveShadow = false;

  const aimScratch = new THREE.Vector3();
  return {
    group,
    glowMats: [apertureGlow],
    armorMats: [],
    parts: { body, cage, aimPivot, aperture },
    aimAxis: { x: 0, y: 0, z: -1 },
    zones: [
      // The aperture protrudes beyond the torso sphere, so its nearer sphere
      // wins ray selection when the player actually places a shot on it.
      { x: 0, y: 0, z: -1.82, r: 0.50, zone: 'vent', aimed: true, radialOffset: 1.82 },
      { x: 0, y: 0, z: 0, r: 1.76, zone: 'torso' },
    ],
    animate(parts, a = {}) {
      const time = Number.isFinite(a.time) ? a.time : 0;
      const charge = Math.max(0, Math.min(1, a.charge ?? a.coil ?? 0));
      const firePulse = Math.max(0, Math.min(1, a.firePulse ?? 0));
      parts.body.rotation.y = time * 0.105;
      parts.body.rotation.x = Math.sin(time * 0.23) * 0.065;
      parts.cage.rotation.y = -time * 0.165;
      parts.cage.rotation.x = 0.18 + Math.sin(time * 0.31) * 0.10;
      parts.cage.rotation.z = Math.sin(time * 0.19) * 0.08;

      if (a.aimDir && aimScratch.copy(a.aimDir).lengthSq() > 1e-8) {
        aimScratch.normalize();
        parts.aimPivot.quaternion.setFromUnitVectors(NEG_Z, aimScratch);
      }

      const apertureScale = 1 + charge * 0.20 + firePulse * 0.24;
      parts.aperture.scale.setScalar(apertureScale);
      apertureGlow.emissive.copy(PLANET_VIOLET).lerp(PLANET_AMBER, charge * charge);
    },
  };
}

/* -------------------------------------------------------------------------
 * THRALL — biomechanical reverse-jointed wedge
 * Eight meshes: shell, ribs, skull, telegraph anatomy, four articulated legs.
 * ---------------------------------------------------------------------- */

const THRALL_BODY_GEO = mergeRigid(
  at(taperedPanel(0.78, 1.14, 0.44, 0.42), 0, -0.02, 0.03, -PI / 2),
  at(new THREE.DodecahedronGeometry(0.31, 0), -0.22, -0.01, 0.38, 0, 0, 0, 0.78, 0.72, 0.95),
  at(new THREE.DodecahedronGeometry(0.31, 0), 0.22, -0.01, 0.38, 0, 0, 0, 0.78, 0.72, 0.95),
  at(chamferedBox(0.44, 0.18, 0.34, 0.06, 0.022), 0, -0.10, 0.47),
  between(UNIT_TAPER_5, 0, 0.01, 0.52, 0, 0.11, 1.10, 0.072, 0.035),
  between(UNIT_ROD_5, -0.28, 0.04, -0.27, -0.34, 0.02, 0.28, 0.034),
  between(UNIT_ROD_5, 0.28, 0.04, -0.27, 0.34, 0.02, 0.28, 0.034),
);

const THRALL_RIB_GEO = mergeRigid(
  ...[-0.34, -0.12, 0.10, 0.30].map((z, i) =>
    at(new THREE.TorusGeometry(0.315 - i * 0.012, 0.026, 4, 8), 0, 0.015, z, 0, 0, 0, 1, 0.62, 1)),
  between(UNIT_ROD_5, 0, 0.18, -0.40, 0, 0.20, 0.42, 0.026),
  between(UNIT_ROD_5, -0.33, 0.03, -0.30, -0.24, 0.18, -0.44, 0.026),
  between(UNIT_ROD_5, 0.33, 0.03, -0.30, 0.24, 0.18, -0.44, 0.026),
);

const THRALL_HEAD_GEO = mergeRigid(
  at(new THREE.DodecahedronGeometry(0.23, 0), 0, 0, 0, 0, 0, 0, 1.06, 0.80, 1.12),
  at(taperedPanel(0.34, 0.36, 0.17, 0.38), 0, -0.085, -0.17, -PI / 2),
  between(UNIT_CLAW_4, -0.15, -0.02, -0.06, -0.22, 0.055, -0.31, 0.052, 0.012),
  between(UNIT_CLAW_4, 0.15, -0.02, -0.06, 0.22, 0.055, -0.31, 0.052, 0.012),
  at(taperedPanel(0.10, 0.25, 0.045, 0.55), -0.17, 0.10, 0.01, 0.18, -0.28, -0.20),
  at(taperedPanel(0.10, 0.25, 0.045, 0.55), 0.17, 0.10, 0.01, 0.18, 0.28, 0.20),
);

const THRALL_GLOW_GEO = mergeRigid(
  at(new THREE.SphereGeometry(0.047, 6, 4), -0.105, 0.10, -0.855),
  at(new THREE.SphereGeometry(0.047, 6, 4), 0.105, 0.10, -0.855),
  ...[-0.31, -0.14, 0.03, 0.20, 0.37].map(z =>
    at(chamferedBox(0.046, 0.045, 0.105, 0.012, 0.008), 0, 0.225, z)),
  at(taperedPanel(0.20, 0.10, 0.025, 0.35), 0, 0.17, -0.44, -PI / 2),
);

const THRALL_LEG_GEO = mergeRigid(
  between(UNIT_TAPER_5, 0, 0.30, -0.02, 0, 0.045, 0.12, 0.070, 0.055),
  at(new THREE.DodecahedronGeometry(0.09, 0), 0, 0.035, 0.12, 0, 0, 0, 1, 0.86, 1),
  between(UNIT_ROD_5, 0, 0.01, 0.12, 0, -0.20, 0.23, 0.054),
  between(UNIT_TAPER_5, 0, -0.20, 0.23, 0, -0.34, -0.02, 0.052, 0.038),
  at(chamferedBox(0.19, 0.085, 0.29, 0.035, 0.016), 0, -0.35, -0.12, -0.04),
  between(UNIT_CLAW_4, -0.060, -0.37, -0.20, -0.076, -0.38, -0.43, 0.030, 0.008),
  between(UNIT_CLAW_4, 0, -0.37, -0.21, 0, -0.38, -0.46, 0.033, 0.008),
  between(UNIT_CLAW_4, 0.060, -0.37, -0.20, 0.076, -0.38, -0.43, 0.030, 0.008),
);

function buildThrall() {
  const group = new THREE.Group();
  group.name = 'thrall';
  const glow = reactiveMaterial(THRALL_GLOW_PROTO, group.uuid);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.y = 0.66;
  group.add(torso);

  addMesh(torso, THRALL_BODY_GEO, THRALL_BODY_MAT, 'sinew-shell');
  addMesh(torso, THRALL_RIB_GEO, THRALL_RIB_MAT, 'exposed-rib-cage');
  const head = addMesh(torso, THRALL_HEAD_GEO, VOID_DARK_MAT, 'skull', 0, 0.04, -0.70);
  addMesh(torso, THRALL_GLOW_GEO, glow, 'telegraph-anatomy');

  const legs = [];
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const side = i % 2 ? 1 : -1;
    legs.push(addMesh(group, THRALL_LEG_GEO, VOID_DARK_MAT, `reverse-leg-${i}`, side * 0.30, 0.39, front ? -0.36 : 0.38));
  }

  return {
    group,
    glowMats: [glow],
    armorMats: [],
    parts: { torso, legs, head },
    zones: [
      { x: 0, y: 0.70, z: -0.74, r: 0.24, zone: 'head' },
      { x: 0, y: 0.88, z: 0.05, r: 0.19, zone: 'vent' },
      { x: 0, y: 0.62, z: 0.05, r: 0.46, zone: 'torso' },
      { x: 0, y: 0.34, z: 0.42, r: 0.3, zone: 'limb' },
    ],
    animate(parts, a) {
      for (let i = 0; i < 4; i++) {
        const ph = a.gait + (i % 2 ? PI : 0) + (i < 2 ? 0 : PI * 0.5);
        parts.legs[i].rotation.x = Math.sin(ph) * 0.55 * a.moveAmp;
      }
      parts.torso.position.y = 0.66 + Math.abs(Math.sin(a.gait)) * 0.05 * a.moveAmp;
      parts.torso.rotation.x = a.coil * -0.35 + Math.sin(a.gait * 2) * 0.03 * a.moveAmp;
      parts.torso.position.z = a.coil * 0.22;
      parts.torso.rotation.z = a.bank * 0.4;
    },
  };
}

/* -------------------------------------------------------------------------
 * WARDEN — layered beveled anvil with visible hydraulics and vent vanes
 * Nine meshes: core, armor, glow, two arms, two vents, two legs.
 * ---------------------------------------------------------------------- */

const WARDEN_CORE_GEO = mergeRigid(
  at(chamferedBox(1.12, 1.06, 0.70, 0.09, 0.035)),
  at(chamferedBox(0.82, 0.32, 0.58, 0.07, 0.026), 0, -0.54, 0.03),
  between(UNIT_ROD_6, -0.43, 0.30, -0.28, -0.64, 0.43, -0.02, 0.052),
  between(UNIT_ROD_6, 0.43, 0.30, -0.28, 0.64, 0.43, -0.02, 0.052),
  between(UNIT_ROD_6, -0.28, 0.47, 0.22, -0.12, 0.70, 0.08, 0.044),
  between(UNIT_ROD_6, 0.28, 0.47, 0.22, 0.12, 0.70, 0.08, 0.044),
  between(UNIT_ROD_6, -0.44, -0.23, 0.28, -0.55, 0.28, 0.31, 0.038),
  between(UNIT_ROD_6, 0.44, -0.23, 0.28, 0.55, 0.28, 0.31, 0.038),
  at(new THREE.TorusGeometry(0.22, 0.052, 5, 10), -0.30, 0.50, 0.425),
  at(new THREE.TorusGeometry(0.22, 0.052, 5, 10), 0.30, 0.50, 0.425),
);

const WARDEN_ARMOR_GEO = mergeRigid(
  at(taperedPanel(1.34, 1.22, 0.16, 0.10), 0, 0.02, -0.44, -0.08),
  at(taperedPanel(1.04, 0.40, 0.12, 0.22), 0, 0.34, -0.555, -0.05),
  at(chamferedBox(0.94, 0.25, 0.13, 0.055, 0.022), 0, -0.43, -0.535, -0.03),
  at(chamferedBox(0.52, 0.42, 0.40, 0.075, 0.028), 0, 0.72, -0.10),
  at(taperedPanel(0.61, 0.17, 0.17, 0.22), 0, 0.78, -0.325),
  at(chamferedBox(0.48, 0.36, 0.42, 0.085, 0.026), -0.73, 0.42, -0.015, 0, -0.06, -0.12),
  at(chamferedBox(0.48, 0.36, 0.42, 0.085, 0.026), 0.73, 0.42, -0.015, 0, 0.06, 0.12),
  at(taperedPanel(0.23, 0.42, 0.08, 0.30), -0.57, 0.13, -0.515, 0, 0, -0.08),
  at(taperedPanel(0.23, 0.42, 0.08, 0.30), 0.57, 0.13, -0.515, 0, 0, 0.08),
  at(chamferedBox(0.25, 0.12, 0.26, 0.035, 0.016), -0.31, -0.55, -0.10),
  at(chamferedBox(0.25, 0.12, 0.26, 0.035, 0.016), 0.31, -0.55, -0.10),
);

const WARDEN_GLOW_GEO = mergeRigid(
  at(chamferedBox(0.35, 0.055, 0.045, 0.012, 0.008), 0, 0.71, -0.325),
  at(chamferedBox(0.048, 0.50, 0.040, 0.010, 0.007), -0.665, 0.02, -0.542),
  at(chamferedBox(0.048, 0.50, 0.040, 0.010, 0.007), 0.665, 0.02, -0.542),
  at(taperedPanel(0.18, 0.07, 0.028, 0.30), 0, 0.22, -0.585),
  at(taperedPanel(0.14, 0.055, 0.028, 0.30), 0, 0.10, -0.592),
);

const WARDEN_ARM_GEO = mergeRigid(
  at(chamferedBox(0.31, 0.47, 0.34, 0.065, 0.026), 0, 0.23, 0),
  at(taperedPanel(0.28, 0.48, 0.30, 0.18), 0, -0.22, -0.015),
  at(chamferedBox(0.35, 0.22, 0.38, 0.07, 0.026), 0, -0.50, -0.04),
  between(UNIT_ROD_6, -0.105, 0.39, 0.15, -0.105, -0.36, 0.15, 0.035),
  between(UNIT_ROD_6, 0.105, 0.39, 0.15, 0.105, -0.36, 0.15, 0.035),
  at(new THREE.DodecahedronGeometry(0.13, 0), 0, -0.03, 0.14, 0, 0, 0, 1.12, 0.85, 0.9),
);

const WARDEN_LEG_GEO = mergeRigid(
  at(chamferedBox(0.36, 0.44, 0.42, 0.075, 0.028), 0, 0.23, 0.02),
  at(taperedPanel(0.34, 0.48, 0.38, 0.16), 0, -0.20, -0.015),
  at(chamferedBox(0.42, 0.18, 0.58, 0.075, 0.026), 0, -0.45, -0.12),
  between(UNIT_ROD_6, -0.11, 0.38, 0.18, -0.11, -0.30, 0.20, 0.036),
  between(UNIT_ROD_6, 0.11, 0.38, 0.18, 0.11, -0.30, 0.20, 0.036),
  at(new THREE.DodecahedronGeometry(0.14, 0), 0, 0, -0.20, 0, 0, 0, 1.15, 0.86, 0.72),
);

const WARDEN_VENT_GEO = mergeRigid(
  at(new THREE.CylinderGeometry(0.06, 0.075, 0.055, 8), 0, 0, 0.018, PI / 2),
  ...[0, PI / 2, PI, PI * 1.5].map(angle =>
    at(taperedPanel(0.070, 0.245, 0.035, 0.42), Math.sin(angle) * 0.090, Math.cos(angle) * 0.090, 0, 0, 0, -angle)),
);

function buildWarden() {
  const group = new THREE.Group();
  group.name = 'warden';
  const glow = reactiveMaterial(WARDEN_GLOW_PROTO, group.uuid);
  const ventGlow = reactiveMaterial(WARDEN_VENT_PROTO, group.uuid);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.y = 1.46;
  group.add(torso);

  addMesh(torso, WARDEN_CORE_GEO, VOID_DARK_MAT, 'hydraulic-core');
  addMesh(torso, WARDEN_ARMOR_GEO, WARDEN_ARMOR_MAT, 'layered-beveled-armor');
  addMesh(torso, WARDEN_GLOW_GEO, glow, 'visor-and-seams');

  const armL = addMesh(torso, WARDEN_ARM_GEO, VOID_DARK_MAT, 'arm-left', -0.78, -0.25, -0.05);
  const armR = addMesh(torso, WARDEN_ARM_GEO, VOID_DARK_MAT, 'arm-right', 0.78, -0.25, -0.05);
  const ventL = addMesh(torso, WARDEN_VENT_GEO, ventGlow, 'vent-vanes-left', -0.30, 0.50, 0.44);
  const ventR = addMesh(torso, WARDEN_VENT_GEO, ventGlow, 'vent-vanes-right', 0.30, 0.50, 0.44);

  const legs = [
    addMesh(group, WARDEN_LEG_GEO, VOID_DARK_MAT, 'leg-left', -0.38, 0.48, 0.05),
    addMesh(group, WARDEN_LEG_GEO, VOID_DARK_MAT, 'leg-right', 0.38, 0.48, 0.05),
  ];

  return {
    group,
    glowMats: [glow, ventGlow],
    armorMats: [WARDEN_ARMOR_MAT],
    ventMat: ventGlow,
    parts: { torso, legs, armL, armR, ventL, ventR },
    zones: [
      { x: 0, y: 2.18, z: -0.1, r: 0.3, zone: 'plate' },
      { x: -0.3, y: 1.96, z: 0.44, r: 0.26, zone: 'ventL' },
      { x: 0.3, y: 1.96, z: 0.44, r: 0.26, zone: 'ventR' },
      { x: 0, y: 1.46, z: -0.3, r: 0.75, zone: 'plate' },
      { x: 0, y: 1.46, z: 0.15, r: 0.6, zone: 'plate' },
      { x: 0, y: 0.5, z: 0, r: 0.45, zone: 'limb' },
    ],
    animate(parts, a) {
      for (let i = 0; i < 2; i++) {
        parts.legs[i].rotation.x = Math.sin(a.gait + (i % 2 ? PI : 0)) * 0.3 * a.moveAmp;
      }
      parts.torso.position.y = 1.46 + Math.abs(Math.sin(a.gait)) * 0.04 * a.moveAmp;
      parts.torso.rotation.y = a.swing * 1.15;
      parts.torso.rotation.x = a.coil * -0.18;
      parts.torso.position.z = a.coil * -0.1;
      parts.armL.rotation.x = a.swing < 0 ? a.swing * 1.6 : 0;
      parts.armR.rotation.x = a.swing > 0 ? -a.swing * 1.6 : 0;
      const vs = 1 + a.ventOpen * 0.45;
      parts.ventL.scale.setScalar(vs);
      parts.ventR.scale.setScalar(vs);
    },
  };
}

/* -------------------------------------------------------------------------
 * CHORISTER — segmented mast, caged sac, trailing tendrils
 * Four meshes: rigid carapace/cage/tendrils, eye anatomy, sac, stalk.
 * ---------------------------------------------------------------------- */

const choristerTendrils = [];
for (let i = 0; i < 5; i++) {
  const x = (i - 2) * 0.13;
  const sway = (i % 2 ? 1 : -1) * (0.05 + Math.abs(i - 2) * 0.025);
  choristerTendrils.push(
    between(UNIT_TAPER_5, x, 0.31, 0.19, x + sway * 0.35, 0.15, 0.42, 0.052, 0.038),
    between(UNIT_TAPER_5, x + sway * 0.35, 0.15, 0.42, x + sway, 0.055, 0.68 + Math.abs(i - 2) * 0.06, 0.040, 0.024),
    between(UNIT_CLAW_4, x + sway, 0.055, 0.68 + Math.abs(i - 2) * 0.06, x + sway * 1.2, 0.025, 0.88 + Math.abs(i - 2) * 0.07, 0.027, 0.008),
  );
}

const CHORISTER_BODY_GEO = mergeRigid(
  at(new THREE.CylinderGeometry(0.43, 0.52, 0.55, 7), 0, 0.275, 0),
  at(new THREE.CylinderGeometry(0.37, 0.47, 0.52, 7), 0, 0.75, 0),
  at(new THREE.CylinderGeometry(0.30, 0.42, 0.50, 7), 0, 1.22, 0),
  at(new THREE.CylinderGeometry(0.23, 0.34, 0.42, 7), 0, 1.60, 0),
  at(new THREE.ConeGeometry(0.31, 0.58, 7), 0, 1.97, 0),
  at(new THREE.TorusGeometry(0.45, 0.025, 4, 7), 0, 0.52, 0, PI / 2),
  at(new THREE.TorusGeometry(0.39, 0.023, 4, 7), 0, 1.00, 0, PI / 2),
  at(new THREE.TorusGeometry(0.32, 0.021, 4, 7), 0, 1.45, 0, PI / 2),
  // Three low-poly hoops form a real cage around the inflating weak sac.
  at(new THREE.TorusGeometry(0.33, 0.018, 4, 9), 0, 1.62, -0.72),
  at(new THREE.TorusGeometry(0.33, 0.018, 4, 9), 0, 1.62, -0.72, PI / 2),
  at(new THREE.TorusGeometry(0.33, 0.018, 4, 9), 0, 1.62, -0.72, 0, PI / 2),
  between(UNIT_ROD_5, -0.29, 1.45, -0.72, -0.29, 1.79, -0.72, 0.018),
  between(UNIT_ROD_5, 0.29, 1.45, -0.72, 0.29, 1.79, -0.72, 0.018),
  ...choristerTendrils,
);

const CHORISTER_GLOW_GEO = mergeRigid(
  at(chamferedBox(0.21, 0.052, 0.042, 0.012, 0.007), 0, 1.78, -0.245),
  at(taperedPanel(0.13, 0.055, 0.026, 0.35), 0, 1.47, -0.325),
  at(taperedPanel(0.10, 0.045, 0.024, 0.35), 0, 1.36, -0.365),
);

const CHORISTER_SAC_GEO = mergeRigid(
  at(new THREE.IcosahedronGeometry(0.24, 1)),
  ...[
    [0.18, 0.09, 0.02], [-0.18, 0.09, 0.02], [0.15, -0.12, -0.04], [-0.15, -0.12, -0.04],
    [0, 0.17, 0.10], [0, -0.17, 0.10], [0.08, 0, -0.18], [-0.08, 0, -0.18],
  ].map(([x, y, z]) => at(new THREE.IcosahedronGeometry(0.075, 0), x, y, z, 0, 0, 0, 1, 0.72, 1)),
);

const CHORISTER_STALK_GEO = mergeRigid(
  between(UNIT_TAPER_5, 0, -0.35, 0, 0, -0.10, 0, 0.052, 0.042),
  at(new THREE.DodecahedronGeometry(0.065, 0), 0, -0.07, 0),
  between(UNIT_ROD_5, 0, -0.04, 0, 0, 0.16, -0.015, 0.043),
  at(new THREE.DodecahedronGeometry(0.058, 0), 0, 0.19, -0.015),
  between(UNIT_TAPER_5, 0, 0.20, -0.015, 0, 0.35, 0, 0.040, 0.025),
);

function buildChorister() {
  const group = new THREE.Group();
  group.name = 'chorister';
  const glow = reactiveMaterial(CHORISTER_GLOW_PROTO, group.uuid);
  const sacGlow = reactiveMaterial(CHORISTER_SAC_PROTO, group.uuid);

  const body = new THREE.Group();
  body.name = 'body';
  group.add(body);

  addMesh(body, CHORISTER_BODY_GEO, CHORISTER_SHELL_MAT, 'segmented-carapace-cage-tendrils');
  addMesh(body, CHORISTER_GLOW_GEO, glow, 'eye-and-throat-anatomy');
  const stalk = addMesh(body, CHORISTER_STALK_GEO, VOID_DARK_MAT, 'segmented-stalk', 0, 1.50, -0.40);
  stalk.rotation.x = 0.8;
  const sac = addMesh(body, CHORISTER_SAC_GEO, sacGlow, 'caged-sac', 0, 1.62, -0.72);

  return {
    group,
    glowMats: [glow],
    armorMats: [],
    sacMat: sacGlow,
    parts: { body, sac, stalk },
    zones: [
      { x: 0, y: 1.62, z: -0.72, r: 0.3, zone: 'vent' },
      { x: 0, y: 1.9, z: 0, r: 0.28, zone: 'head' },
      { x: 0, y: 1.1, z: 0, r: 0.5, zone: 'torso' },
      { x: 0, y: 0.4, z: 0, r: 0.45, zone: 'limb' },
    ],
    animate(parts, a) {
      parts.body.position.y = Math.sin(a.time * 1.3) * 0.05;
      parts.body.rotation.z = Math.sin(a.time * 0.9) * 0.04 + a.bank * 0.3;
      const inflate = 1 + a.coil * 0.6;
      parts.sac.scale.setScalar(inflate);
      parts.body.rotation.x = a.coil * 0.1;
    },
  };
}

export const BUILDERS = {
  thrall: buildThrall,
  warden: buildWarden,
  chorister: buildChorister,
  planet: buildPlanet,
};
