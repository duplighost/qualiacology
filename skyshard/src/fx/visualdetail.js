// R6 presentation shells. These sit around the unchanged gameplay meshes so
// combat radii, hit logic, movement, progression and weapon timing remain
// byte-for-byte owned by their original systems. The extra geometry only
// replaces visibly primitive silhouettes at player-facing distances.

import * as THREE from 'three';
import { worldSurface } from '../world/materials.js';

const P = Math.PI;

function standard(color, emissive = 0x000000, intensity = 0, roughness = .58, metalness = .02) {
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity,
    roughness, metalness, flatShading: false,
  });
}

function physical(color, emissive = 0x000000, intensity = 0, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, emissive, emissiveIntensity: intensity,
    roughness: opts.roughness ?? .34,
    metalness: opts.metalness ?? .04,
    clearcoat: opts.clearcoat ?? .58,
    clearcoatRoughness: opts.clearcoatRoughness ?? .24,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? !opts.transparent,
    side: opts.side ?? THREE.FrontSide,
  });
}

function glow(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity,
    blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opacity >= 1, fog: false, toneMapped: false,
  });
}

function part(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = !material.transparent;
  mesh.receiveShadow = !material.transparent;
  parent.add(mesh);
  return mesh;
}

function capsule(radius, length, radial = 16) {
  return new THREE.CapsuleGeometry(radius, length, 7, radial);
}

function roundedReceiver(width, height, depth, radius = .012, bevel = .004) {
  const x = width / 2, y = height / 2, r = Math.min(radius, x, y);
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 7,
    bevelEnabled: true, bevelSegments: 3,
    bevelSize: bevel, bevelThickness: bevel,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

function registerFlashMaterials(root, presentation) {
  const known = new Set(root.userData.mats || []);
  presentation.traverse((object) => {
    if (!object.isMesh || !object.material || object.material.emissive === undefined || known.has(object.material)) return;
    known.add(object.material);
    root.userData.mats.push(object.material);
    root.userData.baseEmissive.push(object.material.emissiveIntensity);
    root.userData.baseEmissiveHex.push(object.material.emissive.getHex());
  });
}

function hideDirect(root, predicate) {
  for (const child of root.children) {
    if (child.isMesh && predicate(child)) child.visible = false;
  }
}

function addPuff(root, g) {
  hideDirect(root, (m) => m.geometry?.type === 'DodecahedronGeometry');
  const skin = physical(0x87ae62, 0x294b18, .30, { roughness: .74, clearcoat: .12 });
  const bloom = physical(0xa6c989, 0x1f3a17, .24, {
    roughness: .46, clearcoat: .34, clearcoatRoughness: .34,
    transparent: true, opacity: .055, depthWrite: false, side: THREE.DoubleSide,
  });
  part(g, new THREE.SphereGeometry(.35, 26, 17), skin, [0, 0, 0], [1.12, .96, 1.06]);
  const lobes = [
    [-.25, .07, .02, .24], [.24, .08, -.02, .23],
    [-.08, .24, -.08, .22], [.08, -.22, .04, .21],
    [.02, .03, -.25, .22],
  ];
  for (const [x, y, z, r] of lobes) {
    part(g, new THREE.SphereGeometry(r, 20, 13), skin, [x, y, z], [1.04, .92, 1]);
  }
  part(g, new THREE.SphereGeometry(.545, 22, 15), bloom);
  const budMat = standard(0x587c3c, 0x1e3713, .20, .66);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * P * 2;
    part(g, new THREE.SphereGeometry(.052 + (i % 3) * .009, 10, 7), budMat,
      [Math.cos(a) * .42, Math.sin(i * 2.17) * .25, Math.sin(a) * .42],
      [1, .76, 1]);
  }
}

function addHopper(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const hide = physical(0x789e49, 0x223d12, .32, { roughness: .52, clearcoat: .34 });
  const leg = standard(0x4f6f31, 0x182a0d, .20, .66);
  part(g, capsule(.29, .32, 18), hide, [0, .48, 0], [1, 1.08, .88]);
  part(g, new THREE.SphereGeometry(.31, 20, 13), hide, [0, .72, .02], [.86, .72, .82]);
  for (const side of [-1, 1]) {
    part(g, capsule(.085, .33, 12), leg, [side * .27, .24, -.05], [1, 1, 1], [0, 0, side * .20]);
    part(g, capsule(.065, .22, 12), leg, [side * .31, .10, .15], [1, 1, 1.12], [P / 2, 0, side * .10]);
  }
  const leaf = standard(0x9fc66a, 0x294c17, .28, .56);
  part(g, new THREE.ConeGeometry(.11, .34, 10), leaf, [-.18, .90, -.03], [1, 1, .58], [0, 0, -.42]);
  part(g, new THREE.ConeGeometry(.11, .30, 10), leaf, [.18, .88, -.03], [1, 1, .58], [0, 0, .45]);
}

function addHound(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const hide = physical(0x321b12, 0x7e2108, .62, { roughness: .46, clearcoat: .22 });
  const dark = standard(0x1f100b, 0x5a1705, .42, .58);
  part(g, capsule(.24, .58, 18), hide, [0, .57, -.02], [1.18, 1, 1], [P / 2, 0, 0]);
  part(g, capsule(.18, .22, 16), hide, [0, .64, .52], [1.02, 1, .92], [P / 2, 0, 0]);
  part(g, new THREE.ConeGeometry(.14, .35, 14), dark, [0, .60, .81], [1, 1, .82], [P / 2, 0, 0]);
  for (const side of [-1, 1]) for (const z of [-.23, .22]) {
    part(g, capsule(.055, .27, 10), dark, [side * .24, .28, z], [1, 1, 1], [0, 0, side * .10]);
  }
  const tail = part(g, new THREE.TorusGeometry(.27, .035, 8, 22, P * 1.08), dark,
    [0, .62, -.42], [1, 1, 1], [0, P / 2, P * .34]);
  tail.castShadow = true;
}

function addTurret(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const base = physical(0x2c1710, 0x4f1305, .26, { roughness: .52, metalness: .34, clearcoat: .28 });
  const hot = physical(0x67250c, 0xff3c08, .88, { roughness: .22, metalness: .20, clearcoat: .72 });
  part(g, new THREE.CylinderGeometry(.55, .76, .42, 24, 3), base, [0, .22, 0]);
  part(g, new THREE.TorusGeometry(.61, .045, 10, 30), hot, [0, .45, 0], [1, 1, 1], [P / 2, 0, 0]);
  const core = part(g, new THREE.IcosahedronGeometry(.47, 2), hot, [0, .97, 0], [1, 1.08, 1]);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * P * 2;
    part(g, capsule(.045, .32, 10), base, [Math.cos(a) * .43, .76, Math.sin(a) * .43], [1, 1, 1], [Math.sin(a) * .6, 0, Math.cos(a) * .6]);
  }
  root.userData.spin = core;
}

function addWisp(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const ice = physical(0xd8f2ff, 0x55bfff, 1.05, { roughness: .10, clearcoat: .96, clearcoatRoughness: .08 });
  const veil = physical(0xa5dfff, 0x4baeff, .84, {
    roughness: .08, clearcoat: 1, transparent: true, opacity: .16,
    depthWrite: false, side: THREE.DoubleSide,
  });
  part(g, new THREE.IcosahedronGeometry(.36, 2), ice);
  part(g, new THREE.SphereGeometry(.48, 24, 16), veil);
  const ring = part(g, new THREE.TorusGeometry(.55, .028, 10, 36), ice, [0, 0, 0], [1, 1, 1], [P / 2, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * P * 2;
    part(g, new THREE.SphereGeometry(.035, 8, 6), glow(0xcff8ff), [Math.cos(a) * .60, Math.sin(i * 1.7) * .11, Math.sin(a) * .60]);
  }
  root.userData.spin = ring;
}

function addGolem(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const ice = physical(0x86abc5, 0x1f587b, .30, { roughness: .34, clearcoat: .46 });
  const pale = physical(0xb8d7e8, 0x2b7199, .48, { roughness: .25, clearcoat: .62 });
  part(g, new THREE.DodecahedronGeometry(.72, 2), ice, [0, 1.18, 0], [.82, 1.03, .66]);
  part(g, new THREE.DodecahedronGeometry(.34, 2), pale, [0, 2.03, 0], [1, .92, .92]);
  for (const side of [-1, 1]) {
    part(g, capsule(.16, .74, 14), ice, [side * .67, 1.08, 0], [1, 1, .92], [0, 0, side * .10]);
    part(g, new THREE.DodecahedronGeometry(.22, 1), pale, [side * .72, .50, .02], [1, .8, 1]);
  }
  for (const side of [-1, 1]) part(g, capsule(.18, .38, 14), ice, [side * .25, .35, 0], [1, 1, 1]);
}

function addGasbag(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const flesh = physical(0x39594e, 0x22c98c, .46, { roughness: .40, clearcoat: .42 });
  const film = physical(0x6bc9a8, 0x31e5aa, .74, {
    roughness: .16, clearcoat: .92, transparent: true, opacity: .14,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const body = part(g, new THREE.SphereGeometry(.65, 26, 18), flesh, [0, 0, 0], [1, 1.18, 1]);
  part(g, new THREE.SphereGeometry(.71, 24, 16), film, [0, 0, 0], [1, 1.18, 1]);
  part(g, new THREE.SphereGeometry(.51, 24, 12, 0, P * 2, 0, P / 2), flesh, [0, .70, 0], [1, .55, 1]);
  const tendril = standard(0x1e332c, 0x145d43, .32, .68);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * P * 2;
    part(g, capsule(.035, .48 + (i % 2) * .14, 9), tendril,
      [Math.cos(a) * .23, -.75, Math.sin(a) * .23], [1, 1, 1], [Math.sin(a) * .15, 0, Math.cos(a) * .15]);
  }
  root.userData.swell = body;
}

function addCreeper(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const hide = physical(0x28483c, 0x167c56, .42, { roughness: .52, clearcoat: .26 });
  const pod = physical(0x4d8069, 0x23bd7d, .58, { roughness: .34, clearcoat: .48 });
  part(g, new THREE.SphereGeometry(.50, 24, 15), hide, [0, .29, 0], [1.30, .56, 1.30]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * P * 2;
    part(g, new THREE.SphereGeometry(.085 + (i % 3) * .018, 10, 7), pod,
      [Math.cos(a) * .43, .51 + Math.sin(i * 2.3) * .12, Math.sin(a) * .43], [1, .82, 1]);
  }
  part(g, new THREE.ConeGeometry(.18, .52, 10), pod, [0, .72, 0], [1, 1, .78]);
}

function addSentinel(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const star = physical(0x3a2d54, 0xa45cff, 1.0, { roughness: .18, metalness: .34, clearcoat: .82 });
  const core = part(g, new THREE.OctahedronGeometry(.49, 2), star);
  const ringA = part(g, new THREE.TorusGeometry(.80, .035, 10, 42), star, [0, 0, 0], [1, 1, 1], [.14, .12, 0]);
  const ringB = part(g, new THREE.TorusGeometry(.66, .028, 10, 38), star, [0, 0, 0], [1, 1, 1], [P / 2, .30, 0]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * P * 2;
    part(g, new THREE.OctahedronGeometry(.08, 1), star, [Math.cos(a) * .92, Math.sin(i * 2) * .20, Math.sin(a) * .92]);
  }
  root.userData.spin = ringA;
  root.userData.spin2 = ringB;
  core.rotation.y = .24;
}

function addDrone(root, g) {
  hideDirect(root, (m) => m.material?.isMeshStandardMaterial);
  const shell = physical(0x42284e, 0xff4aac, .84, { roughness: .20, metalness: .24, clearcoat: .78 });
  const core = part(g, new THREE.OctahedronGeometry(.39, 2), shell, [0, 0, 0], [1, .88, 1]);
  part(g, new THREE.TorusGeometry(.50, .024, 9, 34), shell, [0, 0, 0], [1, 1, 1], [1.08, .24, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * P * 2;
    part(g, new THREE.ConeGeometry(.07, .28, 8), shell,
      [Math.cos(a) * .38, 0, Math.sin(a) * .38], [1, 1, .65], [0, 0, -a + P / 2]);
  }
  root.userData.spin = core;
}

const ENHANCERS = {
  puff: addPuff, hopper: addHopper, hound: addHound, turret: addTurret,
  wisp: addWisp, golem: addGolem, gasbag: addGasbag, creeper: addCreeper,
  sentinel: addSentinel, drone: addDrone,
};

const ENEMY_SURFACE = Object.freeze({
  puff: 'forest', hopper: 'forest', hound: 'obsidian', turret: 'obsidian',
  wisp: 'ice', golem: 'ice', gasbag: 'mycel', creeper: 'mycel',
  sentinel: 'stone', drone: 'stone',
});

function addSurfaceRelief(presentation, type) {
  const surface = worldSurface(ENEMY_SURFACE[type]);
  if (!surface) return;
  const seen = new Set();
  presentation.traverse((object) => {
    const material = object.isMesh ? object.material : null;
    if (!material?.isMeshStandardMaterial || seen.has(material) || material.transparent) return;
    seen.add(material);
    material.bumpMap = surface.bump;
    material.bumpScale = type === 'golem' || type === 'turret' ? .075 : .045;
    material.needsUpdate = true;
  });
}

function enhanceEnemy(root, type) {
  if (!root || root.userData.r6Presentation) return root;
  const presentation = new THREE.Group();
  presentation.name = `r6-${type}-presentation`;
  root.add(presentation);
  ENHANCERS[type]?.(root, presentation);
  addSurfaceRelief(presentation, type);
  registerFlashMaterials(root, presentation);
  presentation.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  root.userData.r6Presentation = presentation;
  return root;
}

export function enhanceEnemyPresentation(enemies) {
  if (!enemies || enemies.userData?.r6PresentationWrapped) return;
  const obtain = enemies._obtainMesh.bind(enemies);
  enemies._obtainMesh = (type) => enhanceEnemy(obtain(type), type);
  enemies.userData = enemies.userData || {};
  enemies.userData.r6PresentationWrapped = true;
}

export function enhanceSparkcaster(weapon) {
  if (!weapon?.rig || weapon.rig.userData.r6Presentation) return;

  // Hide the primitive receiver pieces, but leave progression add-ons, the
  // functional muzzle object, relic band and core pulse under original control.
  const original = weapon.rig.children.slice();
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) if (original[index]?.isMesh) original[index].visible = false;

  const g = new THREE.Group();
  g.name = 'r6-sparkcaster-presentation';
  const body = physical(0x596a87, 0x121a29, .18, { roughness: .46, metalness: .46, clearcoat: .28, clearcoatRoughness: .34 });
  const metal = physical(0x8a9ab5, 0x182236, .22, { roughness: .34, metalness: .66, clearcoat: .34, clearcoatRoughness: .30 });
  const grip = physical(0x2c3548, 0x0c111d, .12, { roughness: .68, metalness: .10, clearcoat: .08 });
  const inset = physical(0x253149, 0x0b1627, .20, { roughness: .52, metalness: .34, clearcoat: .18 });
  const light = glow(0x86d8ff, .94);

  part(g, roundedReceiver(.142, .116, .305, .018, .006), body, [0, .005, -.060]);
  part(g, roundedReceiver(.100, .052, .238, .014, .004), metal, [0, .066, -.102]);
  part(g, roundedReceiver(.112, .094, .105, .022, .005), body, [0, .006, .138]);
  for (const side of [-1, 1]) {
    part(g, roundedReceiver(.018, .072, .205, .004, .002), inset, [side * .074, .002, -.072]);
  }
  part(g, new THREE.CylinderGeometry(.029, .037, .305, 20, 3), metal, [0, .020, -.363], [1, 1, 1], [P / 2, 0, 0]);
  part(g, new THREE.CylinderGeometry(.052, .058, .075, 16, 2), metal, [0, .020, -.505], [1, 1, 1], [P / 2, 0, 0]);
  part(g, new THREE.CylinderGeometry(.041, .046, .080, 12, 2), inset, [0, .020, -.558], [1, 1, 1], [P / 2, 0, 0]);
  part(g, capsule(.034, .105, 18), grip, [0, -.105, .055], [1, 1, .92], [0, 0, -.08]);
  part(g, new THREE.SphereGeometry(.043, 18, 12), grip, [0, -.175, .064], [1.08, .86, 1.02]);

  for (const [z, r] of [[-.14, .074], [-.025, .075], [.092, .070]]) {
    part(g, new THREE.TorusGeometry(r, .0055, 8, 30), metal, [0, .002, z], [1, 1, 1], [P / 2, 0, 0]);
  }
  part(g, new THREE.TorusGeometry(.052, .006, 8, 30), light, [0, .068, -.112], [1, 1, 1], [P / 2, 0, 0]);
  part(g, roundedReceiver(.032, .018, .055, .004, .002), light, [0, .098, -.235]);
  for (const side of [-1, 1]) {
    part(g, capsule(.009, .205, 10), metal, [side * .067, .043, -.080], [1, 1, 1], [P / 2, 0, 0]);
    for (let i = 0; i < 3; i++) part(g, new THREE.SphereGeometry(.008, 8, 6), light,
      [side * .069, .052, -.15 + i * .078]);
  }

  g.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.renderOrder = 11;
  });
  weapon.rig.add(g);
  weapon.rig.userData.r6Presentation = g;

  const syncPresentationSkin = () => {
    body.color.copy(weapon.skinMats.body.color).multiplyScalar(1.38);
    body.emissive.copy(weapon.skinMats.body.color).multiplyScalar(.24);
    metal.color.copy(weapon.skinMats.barrel.color).multiplyScalar(1.34);
    metal.emissive.copy(weapon.skinMats.barrel.color).multiplyScalar(.21);
    grip.color.copy(weapon.skinMats.grip.color).multiplyScalar(1.18);
    grip.emissive.copy(weapon.skinMats.grip.color).multiplyScalar(.16);
    inset.color.copy(weapon.skinMats.grip.color).multiplyScalar(1.04);
    inset.emissive.copy(weapon.skinMats.barrel.color).multiplyScalar(.12);
    light.color.copy(weapon.coreGlow.material.color);
  };
  const applySkin = weapon.applySkin.bind(weapon);
  weapon.applySkin = (key) => {
    applySkin(key);
    syncPresentationSkin();
  };
  syncPresentationSkin();
}
