import * as THREE from 'three';

export const NOTE_COLORS = [0xff5fcf, 0x5de8ff, 0xffc45b];
export const NOTE_CSS = ['#ff5fcf', '#5de8ff', '#ffc45b'];
export const NOTE_NAMES = ['Bloom', 'Tide', 'Ember'];

const UP = new THREE.Vector3(0, 1, 0);
const temp = new THREE.Vector3();
const temp2 = new THREE.Vector3();

function material(color, emissive = color, intensity = 0.1, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.08,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
  });
}

function mesh(geometry, mat, position, parent, rotation) {
  const object = new THREE.Mesh(geometry, mat);
  if (position) object.position.set(position[0], position[1], position[2]);
  if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent?.add(object);
  return object;
}

function instances(geometry, mat, transforms, parent) {
  const object = new THREE.InstancedMesh(geometry, mat, transforms.length);
  const pivot = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    const position = transform.position || [0, 0, 0];
    const rotation = transform.rotation || [0, 0, 0];
    const scale = transform.scale ?? 1;
    pivot.position.set(position[0], position[1], position[2]);
    pivot.rotation.set(rotation[0], rotation[1], rotation[2]);
    if (Array.isArray(scale)) pivot.scale.set(scale[0], scale[1], scale[2]);
    else pivot.scale.setScalar(scale);
    pivot.updateMatrix();
    object.setMatrixAt(index, pivot.matrix);
    if (transform.color !== undefined) object.setColorAt(index, new THREE.Color(transform.color));
  });
  object.instanceMatrix.needsUpdate = true;
  if (object.instanceColor) object.instanceColor.needsUpdate = true;
  parent?.add(object);
  return object;
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPlayer() {
  const group = new THREE.Group();
  group.name = 'The Bellwether';
  const robeMat = material(0x171a36, 0x5f4b8b, 0.18, { roughness: 0.48 });
  const trimMat = material(0xe9e5ff, 0x948cff, 0.2, { roughness: 0.32, metalness: 0.25 });
  const skinMat = material(0x241b2e, 0xff5fcf, 0.08, { roughness: 0.7 });
  const body = mesh(new THREE.CapsuleGeometry(0.52, 1.05, 5, 12), robeMat, [0, 1.15, 0], group);
  body.scale.set(1, 1, 0.82);
  const cloak = mesh(new THREE.ConeGeometry(0.88, 1.5, 12, 1, true), robeMat, [0, 0.72, 0.12], group, [0, 0, 0]);
  cloak.material = robeMat.clone();
  cloak.material.side = THREE.DoubleSide;
  const head = mesh(new THREE.SphereGeometry(0.39, 16, 12), skinMat, [0, 2.05, -0.02], group);
  head.scale.set(0.86, 1.02, 0.9);
  const bell = mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), trimMat, [0, 2.2, 0], group, [Math.PI / 2, 0, 0]);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf7f4ff, toneMapped: false });
  instances(new THREE.SphereGeometry(0.045, 8, 6), eyeMat, [
    { position: [-0.13, 2.08, -0.35] },
    { position: [0.13, 2.08, -0.35] },
  ], group);
  const noteHaloMat = new THREE.MeshBasicMaterial({ color: NOTE_COLORS[0], transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const noteHalo = mesh(new THREE.TorusGeometry(0.78, 0.025, 6, 40), noteHaloMat, [0, 0.32, 0], group, [Math.PI / 2, 0, 0]);
  const shadow = mesh(new THREE.CircleGeometry(0.78, 24), new THREE.MeshBasicMaterial({ color: 0x02030a, transparent: true, opacity: 0.48, depthWrite: false }), [0, 0.035, 0.13], group, [-Math.PI / 2, 0, 0]);
  shadow.renderOrder = -1;
  const glow = new THREE.PointLight(NOTE_COLORS[0], 1.2, 9, 2);
  glow.position.set(0, 1.25, 0);
  group.add(glow);
  group.userData = { body, cloak, head, bell, noteHalo, noteHaloMat, glow, shadow, note: 0, walk: 0 };
  return group;
}

export function setPlayerNote(player, note) {
  player.userData.note = note;
  player.userData.noteHaloMat.color.setHex(NOTE_COLORS[note]);
  player.userData.glow.color.setHex(NOTE_COLORS[note]);
}

function buildStars(scene, amount, rand) {
  const positions = new Float32Array(amount * 3);
  const colors = new Float32Array(amount * 3);
  const palette = [new THREE.Color(0x9fa8ff), new THREE.Color(0x6ff2ff), new THREE.Color(0xffa9e7), new THREE.Color(0xffdda1)];
  for (let i = 0; i < amount; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 70 + rand() * 145;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 12 + rand() * 110;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    const color = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.45 + rand() * 0.55);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.3, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(points);
  return points;
}

function makeTree(parent, x, z, scale, note, rand) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const color = NOTE_COLORS[note];
  const trunkMat = material(0x15172c, color, 0.08, { roughness: 0.86 });
  const leafMat = material(new THREE.Color(color).multiplyScalar(0.22), color, 0.38, { roughness: 0.45, metalness: 0.1 });
  const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.36, 3.4, 7), trunkMat, [0, 1.7, 0], group);
  trunk.rotation.z = (rand() - 0.5) * 0.09;
  const crownCount = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < crownCount; i++) {
    const crown = mesh(new THREE.IcosahedronGeometry(0.78 + rand() * 0.38, 1), leafMat, [(rand() - 0.5) * 1.1, 3.3 + rand() * 1.4, (rand() - 0.5) * 1.1], group);
    crown.scale.y = 0.85 + rand() * 0.6;
    crown.rotation.set(rand(), rand(), rand());
  }
  const lanternMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false });
  for (let i = 0; i < 2; i++) {
    mesh(new THREE.SphereGeometry(0.055 + rand() * 0.035, 8, 6), lanternMat, [(rand() - 0.5) * 1.4, 2.8 + rand() * 1.4, (rand() - 0.5) * 1.4], group);
  }
  parent.add(group);
  return group;
}

function makeFlower(parent, x, z, note, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0.05, z);
  group.scale.setScalar(scale);
  const color = NOTE_COLORS[note];
  const petalMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 5; i++) {
    const petal = mesh(new THREE.CircleGeometry(0.2, 10), petalMat, [Math.cos(i * Math.PI * 0.4) * 0.18, 0.09, Math.sin(i * Math.PI * 0.4) * 0.18], group, [-Math.PI / 2, 0, i * Math.PI * 0.4]);
    petal.scale.set(1.4, 0.65, 1);
  }
  mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), [0, 0.11, 0], group);
  parent.add(group);
  return group;
}

function makeArch(parent, x, z, note, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const color = NOTE_COLORS[note];
  const stone = material(0x171a31, color, 0.17, { roughness: 0.65, metalness: 0.12 });
  instances(new THREE.BoxGeometry(0.75, 4.2, 0.8), stone, [
    { position: [-2, 2.1, 0] },
    { position: [2, 2.1, 0] },
  ], group);
  const arc = mesh(new THREE.TorusGeometry(2, 0.37, 8, 30, Math.PI), stone, [0, 4.15, 0], group, [0, 0, 0]);
  arc.rotation.z = 0;
  const line = mesh(new THREE.TorusGeometry(2.42, 0.025, 6, 40, Math.PI), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }), [0, 4.15, 0], group);
  group.userData.line = line;
  parent.add(group);
  return group;
}

function createGod(note, index, position) {
  const group = new THREE.Group();
  const form = new THREE.Group();
  group.add(form);
  group.position.set(position[0], 1.3, position[1]);
  group.name = `${NOTE_NAMES[note]} god ${index + 1}`;
  const color = NOTE_COLORS[note];
  const dark = new THREE.Color(color).multiplyScalar(0.24);
  const bodyMat = material(dark, color, 0.58, { roughness: 0.36, metalness: 0.08 });
  const bright = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: 0xfaf6ff, toneMapped: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x03040a });

  if (note === 0) {
    const body = mesh(new THREE.SphereGeometry(0.55, 16, 12), bodyMat, [0, 0, 0], form);
    body.scale.set(1.02, 0.9, 0.85);
    const earGeometry = new THREE.ConeGeometry(0.16, 0.72, 8);
    instances(earGeometry, bodyMat, [
      { position: [-0.28, 0.62, 0], rotation: [0, 0, -0.28], scale: [1, 1, 0.55] },
      { position: [0.28, 0.62, 0], rotation: [0, 0, 0.28], scale: [1, 1, 0.55] },
    ], form);
    instances(new THREE.CircleGeometry(0.52, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [
      { position: [-0.52, 0.03, 0.12], rotation: [0, -0.5, 0], scale: [0.55, 1.25, 1] },
      { position: [0.52, 0.03, 0.12], rotation: [0, 0.5, 0], scale: [0.55, 1.25, 1] },
    ], form);
  } else if (note === 1) {
    const body = mesh(new THREE.SphereGeometry(0.58, 16, 12), bodyMat, [0, 0, 0], form);
    body.scale.set(1.35, 0.72, 0.78);
    const tail = mesh(new THREE.ConeGeometry(0.34, 0.92, 8), bodyMat, [0, -0.02, 0.76], form, [Math.PI / 2, 0, 0]);
    tail.scale.x = 1.25;
    instances(new THREE.ConeGeometry(0.24, 0.74, 8), bodyMat, [
      { position: [-0.58, -0.02, 0.12], rotation: [0, 0, 1.12], scale: [1, 1, 0.55] },
      { position: [0.58, -0.02, 0.12], rotation: [0, 0, -1.12], scale: [1, 1, 0.55] },
    ], form);
    const crest = mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 24, Math.PI), bright, [0, 0.5, -0.02], form, [Math.PI / 2, 0, 0]);
    crest.rotation.z = Math.PI / 2;
  } else {
    const body = mesh(new THREE.SphereGeometry(0.53, 16, 12), bodyMat, [0, 0, 0], form);
    body.scale.set(0.9, 1.02, 0.85);
    const muzzle = mesh(new THREE.SphereGeometry(0.28, 12, 8), bodyMat, [0, -0.04, -0.43], form);
    muzzle.scale.set(0.9, 0.65, 1.1);
    const hornMat = material(0xffefba, color, 0.35, { metalness: 0.2, roughness: 0.32 });
    instances(new THREE.ConeGeometry(0.08, 0.72, 7), hornMat, [
      { position: [-0.25, 0.66, -0.01], rotation: [0, 0, 0.32], scale: [1, 1, 0.65] },
      { position: [0.25, 0.66, -0.01], rotation: [0, 0, -0.32], scale: [1, 1, 0.65] },
    ], form);
    mesh(new THREE.ConeGeometry(0.16, 0.68, 8), bodyMat, [0, -0.02, 0.64], form, [Math.PI / 2, 0, 0]);
  }

  instances(new THREE.SphereGeometry(0.072, 8, 6), white, [
    { position: [-0.16, 0.09, -0.43] },
    { position: [0.16, 0.09, -0.43] },
  ], form);
  instances(new THREE.SphereGeometry(0.034, 8, 6), black, [
    { position: [-0.16, 0.09, -0.49] },
    { position: [0.16, 0.09, -0.49] },
  ], form);
  const heart = mesh(new THREE.SphereGeometry(0.1, 8, 6), bright, [0, -0.05, -0.55], form);
  if (index === 0) {
    form.scale.set(0.92, 1.06, 0.92);
    mesh(new THREE.OctahedronGeometry(0.16, 0), bright, [0, 0.93, -0.08], form, [0, Math.PI / 4, 0]);
  } else if (index === 1) {
    form.scale.set(1.12, 0.88, 1.05);
    const collar = mesh(new THREE.TorusGeometry(0.53, 0.035, 6, 28), bright, [0, -0.25, 0.02], form, [Math.PI / 2, 0, 0]);
    collar.scale.z = 0.82;
  } else {
    form.scale.set(0.96, 1.12, 0.96);
    instances(new THREE.ConeGeometry(0.075, 0.38, 6), bright, [-1, 0, 1].map((thorn) => ({
      position: [thorn * 0.2, 0.5 + (1 - Math.abs(thorn)) * 0.13, 0.35],
      rotation: [0.22, 0, -thorn * 0.18],
      scale: [1, (0.38 - Math.abs(thorn) * 0.06) / 0.38, 1],
    })), form);
  }
  const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = mesh(new THREE.TorusGeometry(0.92, 0.028, 6, 48), haloMat, [0, 0, 0], group, [Math.PI / 2, 0, 0]);
  const outerHalo = mesh(new THREE.TorusGeometry(1.16, 0.012, 5, 48), haloMat.clone(), [0, 0, 0], group, [Math.PI / 2, 0, 0]);
  outerHalo.material.opacity = 0.24;
  const light = new THREE.PointLight(color, 1.25, 8, 2);
  light.position.set(0, 0.2, 0);
  group.add(light);
  group.userData = {
    note,
    index,
    state: 'wild',
    attune: 0,
    phase: index * 1.73 + note,
    base: group.position.clone(),
    velocity: new THREE.Vector3(),
    halo,
    outerHalo,
    haloMat,
    heart,
    light,
    homeSlot: -1,
    followIndex: -1,
    startled: 0,
    justChanged: 0,
    scattered: 0,
  };
  return group;
}

function createHush(index, rand) {
  const group = new THREE.Group();
  const coreMat = material(0x010207, 0x311d52, 0.34, { roughness: 0.82, transparent: true, opacity: 0.94 });
  const core = mesh(new THREE.IcosahedronGeometry(0.7 + rand() * 0.25, 1), coreMat, [0, 0, 0], group);
  core.scale.y = 1.25;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe9ddff, toneMapped: false });
  instances(new THREE.SphereGeometry(0.055, 8, 6), eyeMat, [
    { position: [-0.16, 0.11, -0.62] },
    { position: [0.16, 0.11, -0.62] },
  ], group);
  const tendrilMat = new THREE.MeshBasicMaterial({ color: 0x6d438f, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  instances(new THREE.ConeGeometry(0.11, 1.6, 6), tendrilMat, Array.from({ length: 4 }, (_, i) => ({
    position: [(i - 1.5) * 0.18, -0.85, 0],
    rotation: [0, 0, (i - 1.5) * 0.18],
    scale: [1, (1.2 + rand() * 0.8) / 1.6, 1],
  })), group);
  group.visible = false;
  group.userData = { index, core, active: false, respawn: 4 + index * 1.3, phase: rand() * 10, velocity: new THREE.Vector3(), stunned: 0, touchCooldown: 0, target: null };
  return group;
}

function createSeed(index, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0.45, position[1]);
  const stemMat = material(0x0d0f1c, 0x8b68ac, 0.15, { roughness: 0.8 });
  const seedMat = material(0xebe8ff, 0xffffff, 0.9, { roughness: 0.2, metalness: 0.25 });
  mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.65, 6), stemMat, [0, -0.18, 0], group);
  const center = mesh(new THREE.OctahedronGeometry(0.18, 0), seedMat, [0, 0.22, 0], group);
  instances(new THREE.CircleGeometry(0.17, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), Array.from({ length: 6 }, (_, i) => ({
    position: [Math.cos(i * Math.PI / 3) * 0.2, 0.22, Math.sin(i * Math.PI / 3) * 0.2],
    rotation: [-Math.PI / 2, 0, i * Math.PI / 3],
    scale: [1.35, 0.72, 1],
    color: NOTE_COLORS[i % 3],
  })), group);
  const light = new THREE.PointLight(0xdcc8ff, 1.1, 7, 2);
  light.position.y = 0.25;
  group.add(light);
  group.userData = { index, center, light, collected: false, phase: index * 2.3 };
  return group;
}

export function createWorld(scene, quality = 'high') {
  const rand = seeded(0x51a11f0e);
  const group = new THREE.Group();
  scene.add(group);

  scene.background = new THREE.Color(0x050711);
  scene.fog = new THREE.FogExp2(0x080a18, quality === 'low' ? 0.018 : 0.014);
  const hemi = new THREE.HemisphereLight(0x7482c7, 0x080510, 1.35);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xbcc9ff, 1.7);
  moon.position.set(-18, 34, 22);
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xff90df, 0.55);
  fill.position.set(28, 12, -18);
  scene.add(fill);

  const stars = buildStars(scene, quality === 'low' ? 520 : 1100, rand);
  const moonDisc = mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ color: 0xdde2ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [-42, 54, -92], scene);
  moonDisc.lookAt(0, 20, 0);
  const moonCore = mesh(new THREE.CircleGeometry(6.7, 64), new THREE.MeshBasicMaterial({ color: 0xf0efff, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }), [-42, 54, -91.8], scene);
  moonCore.lookAt(0, 20, 0);

  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x090d25, emissive: 0x0c1a3a, emissiveIntensity: 0.18, roughness: 0.22, metalness: 0.4, transparent: true, opacity: 0.78, clearcoat: 0.9, clearcoatRoughness: 0.24 });
  const water = mesh(new THREE.CircleGeometry(100, 128), waterMat, [0, -1.2, 0], group, [-Math.PI / 2, 0, 0]);

  const groundMat = material(0x10142b, 0x1c2044, 0.16, { roughness: 0.72, metalness: 0.08 });
  const ground = mesh(new THREE.CircleGeometry(52, 128), groundMat, [0, -0.04, 0], group, [-Math.PI / 2, 0, 0]);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x8192d7, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const rim = mesh(new THREE.TorusGeometry(52, 0.12, 8, 160), rimMat, [0, 0.02, 0], group, [Math.PI / 2, 0, 0]);

  const zoneCenters = [new THREE.Vector3(-25, 0, 3), new THREE.Vector3(19, 0, -23), new THREE.Vector3(23, 0, 22)];
  const zoneRings = [];
  zoneCenters.forEach((center, note) => {
    const ringMat = new THREE.MeshBasicMaterial({ color: NOTE_COLORS[note], transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ring = mesh(new THREE.RingGeometry(7.5, 12.5, 64), ringMat, [center.x, 0.005, center.z], group, [-Math.PI / 2, 0, 0]);
    zoneRings.push(ring);
    const rune = mesh(new THREE.TorusGeometry(7.7, 0.035, 5, 80), ringMat.clone(), [center.x, 0.03, center.z], group, [Math.PI / 2, 0, 0]);
    rune.material.opacity = 0.28;
    zoneRings.push(rune);
  });

  const sanctuary = new THREE.Group();
  sanctuary.position.y = 0.02;
  group.add(sanctuary);
  const sanctuaryRings = [];
  [3.2, 5.2, 7.2].forEach((radius, index) => {
    const color = NOTE_COLORS[index % 3];
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.27 - index * 0.045, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ring = mesh(new THREE.TorusGeometry(radius, 0.045, 6, 96), ringMat, [0, 0.04 + index * 0.012, 0], sanctuary, [Math.PI / 2, 0, 0]);
    sanctuaryRings.push(ring);
  });
  const well = mesh(new THREE.CylinderGeometry(2.1, 2.5, 0.4, 48), material(0x15182e, 0x8672d7, 0.22, { roughness: 0.45, metalness: 0.25 }), [0, 0.18, 0], sanctuary);
  const wellSurface = mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshBasicMaterial({ color: 0xa59cff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [0, 0.4, 0], sanctuary, [-Math.PI / 2, 0, 0]);
  const wellLight = new THREE.PointLight(0x9288ff, 1.6, 18, 2);
  wellLight.position.set(0, 2, 0);
  sanctuary.add(wellLight);

  const arches = [
    makeArch(group, -10.5, 1.2, 0, -Math.PI / 2),
    makeArch(group, 8.2, -10.2, 1, Math.PI / 4),
    makeArch(group, 10.2, 9.2, 2, Math.PI * 0.75),
  ];

  const trees = [];
  if (quality === 'low') {
    const dummy = new THREE.Object3D();
    const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.36, 3.4, 7);
    const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
    const lanternGeometry = new THREE.SphereGeometry(0.075, 7, 5);
    for (let note = 0; note < 3; note++) {
      const center = zoneCenters[note];
      const placements = [];
      const treeCount = 8;
      for (let i = 0; i < treeCount; i++) {
        const angle = (i / treeCount) * Math.PI * 2 + rand() * 0.6;
        const radius = 10 + rand() * 11;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        if (Math.hypot(x, z) < 9 || Math.hypot(x, z) > 48) continue;
        placements.push({
          x,
          z,
          scale: 0.72 + rand() * 0.65,
          tilt: (rand() - 0.5) * 0.09,
          crownX: (rand() - 0.5) * 0.85,
          crownY: 3.55 + rand() * 0.8,
          crownZ: (rand() - 0.5) * 0.85,
          crownScale: 0.82 + rand() * 0.34,
          crownStretch: 0.9 + rand() * 0.45,
          crownRotation: [rand(), rand(), rand()],
          lanternX: (rand() - 0.5) * 1.2,
          lanternY: 3 + rand() * 1.05,
          lanternZ: (rand() - 0.5) * 1.2,
        });
      }
      const color = NOTE_COLORS[note];
      const trunks = new THREE.InstancedMesh(trunkGeometry, material(0x15172c, color, 0.08, { roughness: 0.86 }), placements.length);
      const crowns = new THREE.InstancedMesh(crownGeometry, material(new THREE.Color(color).multiplyScalar(0.22), color, 0.38, { roughness: 0.45, metalness: 0.1 }), placements.length);
      const lanterns = new THREE.InstancedMesh(lanternGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false }), placements.length);
      placements.forEach((placement, index) => {
        const scale = placement.scale;
        dummy.position.set(placement.x, 1.7 * scale, placement.z);
        dummy.rotation.set(0, 0, placement.tilt);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);

        dummy.position.set(placement.x + placement.crownX * scale, placement.crownY * scale, placement.z + placement.crownZ * scale);
        dummy.rotation.set(...placement.crownRotation);
        dummy.scale.set(scale * placement.crownScale, scale * placement.crownScale * placement.crownStretch, scale * placement.crownScale);
        dummy.updateMatrix();
        crowns.setMatrixAt(index, dummy.matrix);

        dummy.position.set(placement.x + placement.lanternX * scale, placement.lanternY * scale, placement.z + placement.lanternZ * scale);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        lanterns.setMatrixAt(index, dummy.matrix);
      });
      trunks.instanceMatrix.needsUpdate = true;
      crowns.instanceMatrix.needsUpdate = true;
      lanterns.instanceMatrix.needsUpdate = true;
      group.add(trunks, crowns, lanterns);
    }

    const flowerGeometry = new THREE.RingGeometry(0.1, 0.32, 5);
    const flowerCenterGeometry = new THREE.SphereGeometry(0.09, 7, 5);
    const flowersByNote = [[], [], []];
    for (let i = 0; i < 12; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 15 + rand() * 33;
      flowersByNote[i % 3].push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, scale: 0.45 + rand() * 0.7, rotation: rand() * Math.PI * 2 });
    }
    flowersByNote.forEach((placements, note) => {
      const petals = new THREE.InstancedMesh(flowerGeometry, new THREE.MeshBasicMaterial({ color: NOTE_COLORS[note], transparent: true, opacity: 0.62, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), placements.length);
      const centers = new THREE.InstancedMesh(flowerCenterGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), placements.length);
      placements.forEach((placement, index) => {
        dummy.position.set(placement.x, 0.14, placement.z);
        dummy.rotation.set(-Math.PI / 2, 0, placement.rotation);
        dummy.scale.setScalar(placement.scale);
        dummy.updateMatrix();
        petals.setMatrixAt(index, dummy.matrix);
        dummy.position.y = 0.17;
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(placement.scale);
        dummy.updateMatrix();
        centers.setMatrixAt(index, dummy.matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
      centers.instanceMatrix.needsUpdate = true;
      group.add(petals, centers);
    });
  } else {
    for (let note = 0; note < 3; note++) {
      const center = zoneCenters[note];
      const treeCount = 13;
      for (let i = 0; i < treeCount; i++) {
        const angle = (i / treeCount) * Math.PI * 2 + rand() * 0.6;
        const radius = 10 + rand() * 11;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        if (Math.hypot(x, z) < 9 || Math.hypot(x, z) > 48) continue;
        trees.push(makeTree(group, x, z, 0.72 + rand() * 0.65, note, rand));
        if (i % 2 === 0) makeFlower(group, x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, note, 0.6 + rand());
      }
    }
    for (let i = 0; i < 24; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 15 + rand() * 33;
      makeFlower(group, Math.cos(angle) * radius, Math.sin(angle) * radius, i % 3, 0.45 + rand() * 0.7);
    }
  }

  const godPositions = [
    [[-30, -7], [-28, 13], [-40, 7]],
    [[19, -29], [34, -20], [8, -35]],
    [[19, 31], [35, 18], [8, 37]],
  ];
  const gods = [];
  for (let note = 0; note < 3; note++) {
    godPositions[note].forEach((position, index) => {
      const god = createGod(note, index, position);
      group.add(god);
      if (quality === 'low') god.userData.light.visible = false;
      gods.push(god);
    });
  }

  const seedPositions = [[-42, -14], [38, -24], [38, 24]];
  const seeds = seedPositions.map((position, index) => {
    const seed = createSeed(index, position);
    group.add(seed);
    return seed;
  });

  const hushlings = Array.from({ length: quality === 'low' ? 3 : 5 }, (_, index) => {
    const hush = createHush(index, rand);
    group.add(hush);
    return hush;
  });

  const finalHush = new THREE.Group();
  finalHush.visible = false;
  finalHush.position.set(0, 17, 0);
  const hushCore = mesh(new THREE.IcosahedronGeometry(4.2, 3), material(0x000106, 0x25133e, 0.38, { roughness: 0.78 }), [0, 0, 0], finalHush);
  const hushRing = mesh(new THREE.TorusGeometry(6.2, 0.12, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9a72d4, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [0, 0, 0], finalHush, [Math.PI / 2, 0, 0]);
  const hushRing2 = mesh(new THREE.TorusGeometry(7.6, 0.04, 6, 96), hushRing.material.clone(), [0, 0, 0], finalHush, [0, 0, Math.PI / 2]);
  hushRing2.material.opacity = 0.18;
  const hushLight = new THREE.PointLight(0x61308f, 5, 50, 2);
  finalHush.add(hushLight);
  scene.add(finalHush);

  const pulseRings = [];
  const bursts = [];
  const state = { home: 0, seeds: 0, stage: 0, finale: false, finaleProgress: 0, completed: false };

  function emitPulse(position, note, strength = 1, dark = false) {
    const color = dark ? 0x8f5db4 : NOTE_COLORS[note];
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: dark ? 0.36 : 0.68, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.08, 64), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.15, position.z);
    ring.userData = { life: 0, max: dark ? 0.7 : 0.85, strength, dark };
    scene.add(ring);
    pulseRings.push(ring);
    burst(position, color, dark ? 7 : Math.round(10 + strength * 5), dark ? 0.7 : 1.2);
    return ring;
  }

  function burst(position, color, count = 12, power = 1) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.5 + rand();
      positions[i * 3 + 2] = position.z;
      velocities[i * 3] = Math.cos(angle) * (1.5 + rand() * 3) * power;
      velocities[i * 3 + 1] = 0.8 + rand() * 3.4 * power;
      velocities[i * 3 + 2] = Math.sin(angle) * (1.5 + rand() * 3) * power;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: quality === 'low' ? 0.12 : 0.15, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const particles = new THREE.Points(geometry, mat);
    particles.userData = { life: 0, max: 0.72 + rand() * 0.36, velocities };
    scene.add(particles);
    bursts.push(particles);
    return particles;
  }

  function bondGod(god, followIndex) {
    const data = god.userData;
    if (data.state !== 'wild') return false;
    data.state = 'bonded';
    data.followIndex = followIndex;
    data.attune = 2;
    data.justChanged = 1;
    data.haloMat.opacity = 0.9;
    data.light.intensity = 2.2;
    burst(god.position, NOTE_COLORS[data.note], 24, 1.4);
    return true;
  }

  function homeGod(god, slot) {
    const data = god.userData;
    const actualHome = gods.filter((item) => item.userData.state === 'home').length;
    if (data.state !== 'bonded' || data.scattered > 0 || slot !== actualHome) return false;
    data.state = 'home';
    data.homeSlot = slot;
    data.justChanged = 1;
    data.light.intensity = 2.5;
    state.home = actualHome + 1;
    burst(god.position, NOTE_COLORS[data.note], 30, 1.7);
    wellLight.intensity = 1.6 + state.home * 0.36;
    return true;
  }

  function startleGod(god) {
    const data = god.userData;
    if (data.state !== 'wild') return;
    data.startled = 1.2;
    temp.copy(god.position).sub(temp2.set(0, god.position.y, 0)).normalize();
    data.velocity.add(temp.multiplyScalar(3));
  }

  function scatterGod(god, source) {
    const data = god.userData;
    if (data.state !== 'bonded' || data.scattered > 0) return false;
    data.scattered = 2.2;
    temp.copy(god.position).sub(source).setY(0);
    if (temp.lengthSq() < 0.1) temp.set(1, 0, 0);
    data.velocity.copy(temp.normalize().multiplyScalar(7.5));
    data.justChanged = 0.6;
    burst(god.position, NOTE_COLORS[data.note], 12, 0.8);
    return true;
  }

  function attuneGod(god) {
    const data = god.userData;
    if (data.state !== 'wild') return data.attune;
    data.attune = Math.min(2, data.attune + 1);
    data.justChanged = 0.6;
    data.haloMat.opacity = 0.58 + data.attune * 0.18;
    data.light.intensity = 1.25 + data.attune * 0.45;
    burst(god.position, NOTE_COLORS[data.note], 10 + data.attune * 5, 1);
    return data.attune;
  }

  function repelHush(hush, force = 1) {
    const data = hush.userData;
    if (!data.active) return false;
    data.stunned = 1.2 + force * 0.35;
    temp.copy(hush.position).setY(0).normalize();
    if (temp.lengthSq() < 0.1) temp.set(1, 0, 0);
    data.velocity.add(temp.multiplyScalar(8 + force * 4));
    emitPulse(hush.position, 0, force, true);
    if (force > 1.35) {
      data.active = false;
      data.respawn = 7 + rand() * 6;
      hush.visible = false;
    }
    return true;
  }

  function collectSeed(seed) {
    if (seed.userData.collected) return false;
    seed.userData.collected = true;
    state.seeds += 1;
    burst(seed.position, 0xffffff, 34, 1.8);
    seed.visible = false;
    return true;
  }

  function setFinale(progress = 0) {
    state.finale = true;
    state.finaleProgress = progress;
    finalHush.visible = true;
    const remaining = Math.max(0.12, 1 - progress / 4);
    finalHush.scale.setScalar(0.65 + remaining * 0.55);
    hushCore.material.emissiveIntensity = 0.2 + remaining * 0.4;
    hushLight.intensity = 2 + remaining * 4;
    if (progress > 0) burst(finalHush.position, NOTE_COLORS[(progress - 1) % 3], 22, 2);
  }

  function awakenStage(stage) {
    const next = Math.max(state.stage, Math.min(3, Number(stage) || 0));
    if (next === state.stage) return false;
    state.stage = next;
    const center = next <= 2 ? zoneCenters[next - 1] : new THREE.Vector3(0, 0, 0);
    emitPulse(center, (next - 1) % 3, 3.2);
    burst(center.clone().setY(1), NOTE_COLORS[(next - 1) % 3], quality === 'low' ? 28 : 52, 2.2);
    return true;
  }

  function complete() {
    state.completed = true;
    state.finaleProgress = 4;
    burst(new THREE.Vector3(0, 5, 0), 0xffffff, quality === 'low' ? 50 : 100, 3);
    finalHush.visible = false;
    ground.material.emissive.setHex(0x303b65);
    ground.material.emissiveIntensity = 0.48;
    scene.fog.color.setHex(0x17172f);
    moonDisc.material.opacity = 0.28;
    moonCore.material.opacity = 0.42;
    for (const hush of hushlings) {
      hush.userData.active = false;
      hush.userData.respawn = Number.POSITIVE_INFINITY;
      hush.visible = false;
    }
  }

  function updateGod(god, dt, time, beatPhase, playerPosition, bonded) {
    const data = god.userData;
    data.justChanged = Math.max(0, data.justChanged - dt);
    data.startled = Math.max(0, data.startled - dt);
    data.scattered = Math.max(0, data.scattered - dt);
    const beatDistance = Math.min(beatPhase, 1 - beatPhase);
    const close = 1 - Math.min(1, beatDistance / 0.5);
    const haloScale = 0.76 + (1 - close) * 0.62 + (data.attune ? -0.08 : 0);
    data.halo.scale.setScalar(haloScale + Math.sin(time * 2.2 + data.phase) * 0.025);
    data.outerHalo.scale.setScalar(1.08 + Math.sin(time * 1.1 + data.phase) * 0.08);
    data.outerHalo.rotation.z += dt * (data.note % 2 ? -0.32 : 0.32);
    data.heart.scale.setScalar(0.88 + close * 0.32 + (data.justChanged > 0 ? 0.25 : 0));
    data.light.intensity += ((data.state === 'home' ? 2.25 : 1.25 + data.attune * 0.45) + close * 0.45 - data.light.intensity) * Math.min(1, dt * 5);

    if (data.state === 'wild') {
      const wander = temp.set(
        data.base.x + Math.cos(time * 0.25 + data.phase) * (1.2 + data.index * 0.25),
        1.25 + Math.sin(time * 1.35 + data.phase) * 0.25,
        data.base.z + Math.sin(time * 0.21 + data.phase * 1.2) * (1.2 + data.index * 0.25),
      );
      if (data.attune > 0 && playerPosition.distanceToSquared(god.position) < 26 * 26) {
        wander.lerp(temp2.copy(playerPosition).setY(1.35), 0.22);
      }
      data.velocity.lerp(temp2.copy(wander).sub(god.position).multiplyScalar(0.8), Math.min(1, dt * 1.7));
      if (data.startled > 0) data.velocity.multiplyScalar(Math.pow(0.9, dt * 60));
      god.position.addScaledVector(data.velocity, dt);
    } else if (data.state === 'bonded') {
      if (data.scattered > 0) {
        data.velocity.multiplyScalar(Math.pow(0.982, dt * 60));
        god.position.addScaledVector(data.velocity, dt);
        god.position.y = 1.45 + Math.sin(time * 3 + data.phase) * 0.3;
        return;
      }
      const index = Math.max(0, bonded.indexOf(god));
      const lane = Math.floor(index / 3);
      const angle = time * (0.72 - lane * 0.08) + index * (Math.PI * 2 / Math.max(1, Math.min(3, bonded.length)));
      const radius = 2.4 + lane * 1.35;
      const target = temp.set(playerPosition.x + Math.cos(angle) * radius, 1.45 + Math.sin(time * 2 + data.phase) * 0.26, playerPosition.z + Math.sin(angle) * radius);
      data.velocity.lerp(temp2.copy(target).sub(god.position).multiplyScalar(4.2), Math.min(1, dt * 5));
      god.position.addScaledVector(data.velocity, dt);
    } else {
      const angle = (data.homeSlot / 9) * Math.PI * 2 - Math.PI / 2;
      const radius = 4.1 + (data.homeSlot % 2) * 0.55;
      const target = temp.set(Math.cos(angle) * radius, 1.35 + Math.sin(time * 1.8 + data.phase) * 0.18, Math.sin(angle) * radius);
      data.velocity.lerp(temp2.copy(target).sub(god.position).multiplyScalar(3.2), Math.min(1, dt * 4));
      god.position.addScaledVector(data.velocity, dt);
    }
    god.rotation.y = Math.atan2(data.velocity.x, data.velocity.z || 0.0001);
    god.rotation.z = Math.sin(time * 1.8 + data.phase) * 0.045;
  }

  function spawnHush(hush, index) {
    const angle = (index / hushlings.length) * Math.PI * 2 + rand() * 0.8;
    const radius = 39 + rand() * 8;
    hush.position.set(Math.cos(angle) * radius, 1.5 + rand() * 1.5, Math.sin(angle) * radius);
    hush.visible = true;
    hush.userData.active = true;
    hush.userData.stunned = 0;
    hush.userData.velocity.set(0, 0, 0);
  }

  function updateHush(hush, dt, time, playerPosition, bonded) {
    const data = hush.userData;
    if (!data.active) {
      if (state.home < 2 || state.completed) return;
      data.respawn -= dt * (0.65 + state.home * 0.06);
      if (data.respawn <= 0) spawnHush(hush, data.index);
      return;
    }
    data.stunned = Math.max(0, data.stunned - dt);
    data.touchCooldown = Math.max(0, data.touchCooldown - dt);
    const targetObject = bonded.length ? bonded[data.index % bonded.length] : null;
    const target = targetObject ? targetObject.position : playerPosition;
    temp.copy(target).sub(hush.position).setY(0);
    const distance = Math.max(0.001, temp.length());
    temp.divideScalar(distance);
    const speed = data.stunned > 0 ? -0.8 : 1.6 + state.home * 0.08;
    temp.multiplyScalar(speed);
    data.velocity.lerp(temp, Math.min(1, dt * (data.stunned > 0 ? 0.8 : 2)));
    hush.position.addScaledVector(data.velocity, dt);
    hush.position.y = 1.65 + Math.sin(time * 1.7 + data.phase) * 0.42;
    hush.rotation.y = Math.atan2(data.velocity.x, data.velocity.z || 0.0001);
    hush.rotation.z = Math.sin(time * 2.3 + data.phase) * 0.12;
    data.core.rotation.x += dt * 0.3;
    data.core.rotation.y += dt * 0.46;
    if (Math.hypot(hush.position.x, hush.position.z) > 55) {
      data.active = false;
      data.respawn = 1;
      hush.visible = false;
    }
  }

  function update(dt, time, playerPosition, beatPhase) {
    stars.rotation.y = time * 0.0025;
    water.material.emissiveIntensity = 0.15 + Math.sin(time * 0.26) * 0.035 + state.home * 0.008 + state.stage * 0.025;
    ground.material.emissiveIntensity += ((0.16 + state.stage * 0.075) - ground.material.emissiveIntensity) * Math.min(1, dt * 0.8);
    const fogTarget = new THREE.Color(state.completed ? 0x17172f : state.stage >= 3 ? 0x11162c : state.stage >= 2 ? 0x0c1024 : 0x080a18);
    scene.fog.color.lerp(fogTarget, Math.min(1, dt * 0.35));
    scene.fog.density += ((state.completed ? 0.009 : Math.max(0.0095, (quality === 'low' ? 0.018 : 0.014) - state.stage * 0.0012)) - scene.fog.density) * Math.min(1, dt * 0.6);
    sanctuary.rotation.y = time * 0.025;
    wellSurface.rotation.z = -time * 0.11;
    sanctuaryRings.forEach((ring, index) => {
      ring.rotation.z += dt * (index % 2 ? -0.06 : 0.07);
      ring.material.opacity = 0.18 + state.home * 0.012 + Math.sin(time * 1.1 + index) * 0.035;
    });
    zoneRings.forEach((ring, index) => {
      ring.rotation.z += dt * (index % 2 ? 0.025 : -0.018);
    });
    arches.forEach((arch, index) => {
      arch.userData.line.material.opacity = 0.42 + Math.sin(time * 1.2 + index) * 0.16;
    });
    trees.forEach((tree, index) => {
      tree.rotation.z = Math.sin(time * 0.42 + index * 0.77) * 0.008;
    });

    const bonded = gods.filter((god) => god.userData.state === 'bonded');
    gods.forEach((god) => updateGod(god, dt, time, beatPhase, playerPosition, bonded));
    hushlings.forEach((hush) => updateHush(hush, dt, time, playerPosition, bonded));
    seeds.forEach((seed) => {
      if (!seed.visible) return;
      seed.rotation.y += dt * 0.55;
      seed.position.y = 0.45 + Math.sin(time * 1.4 + seed.userData.phase) * 0.12;
      seed.userData.center.rotation.y += dt * 1.2;
      seed.userData.light.intensity = 0.9 + Math.sin(time * 2 + seed.userData.phase) * 0.35;
    });

    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const ring = pulseRings[i];
      ring.userData.life += dt;
      const p = ring.userData.life / ring.userData.max;
      const scale = 1 + p * (ring.userData.dark ? 9 : 12 + ring.userData.strength * 3);
      ring.scale.setScalar(scale);
      ring.material.opacity = (1 - p) * (ring.userData.dark ? 0.36 : 0.62);
      if (p >= 1) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); pulseRings.splice(i, 1); }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const particles = bursts[i];
      particles.userData.life += dt;
      const p = particles.userData.life / particles.userData.max;
      const positions = particles.geometry.attributes.position.array;
      const velocities = particles.userData.velocities;
      for (let j = 0; j < positions.length; j += 3) {
        positions[j] += velocities[j] * dt;
        positions[j + 1] += velocities[j + 1] * dt;
        positions[j + 2] += velocities[j + 2] * dt;
        velocities[j + 1] -= dt * 1.8;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = Math.max(0, 1 - p);
      particles.material.size = (quality === 'low' ? 0.12 : 0.15) * (1 + p * 1.2);
      if (p >= 1) { scene.remove(particles); particles.geometry.dispose(); particles.material.dispose(); bursts.splice(i, 1); }
    }
    if (finalHush.visible) {
      finalHush.rotation.y += dt * 0.12;
      finalHush.rotation.z = Math.sin(time * 0.38) * 0.1;
      hushCore.rotation.x += dt * 0.16;
      hushCore.rotation.y += dt * 0.22;
      hushRing.rotation.z += dt * 0.2;
      hushRing2.rotation.z -= dt * 0.16;
    }
  }

  return {
    group,
    ground,
    water,
    rim,
    well,
    gods,
    hushlings,
    seeds,
    finalHush,
    state,
    zoneCenters,
    update,
    emitPulse,
    burst,
    bondGod,
    homeGod,
    startleGod,
    scatterGod,
    attuneGod,
    repelHush,
    collectSeed,
    setFinale,
    awakenStage,
    complete,
  };
}
