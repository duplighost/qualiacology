import * as THREE from '../vendor/three.module.min.js';
import { createBossRig } from './characters.js';

const TAU = Math.PI * 2;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const pulse = (time, speed = 1, phase = 0) => 0.5 + Math.sin(time * speed + phase) * 0.5;

function material(name, options) {
  const result = new THREE.MeshStandardMaterial({
    name,
    roughness: .34,
    metalness: .55,
    ...options,
  });
  result.dithering = true;
  return result;
}

function mesh(parent, geometry, surface, {
  name = '', position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1],
  castShadow = true, receiveShadow = true, renderOrder = 0,
} = {}) {
  const object = new THREE.Mesh(geometry, surface);
  object.name = name;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = castShadow;
  object.receiveShadow = receiveShadow;
  object.renderOrder = renderOrder;
  parent.add(object);
  return object;
}

function joint(parent, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  object.rotation.set(...rotation);
  parent?.add(object);
  return object;
}

function orientBetween(object, from, to) {
  const direction = new THREE.Vector3().subVectors(to, from);
  object.position.copy(from).add(to).multiplyScalar(.5);
  object.scale.y = direction.length();
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const surface of list) if (surface) materials.add(surface);
  });
  root.removeFromParent();
  for (const geometry of geometries) geometry.dispose?.();
  for (const surface of materials) surface.dispose?.();
}

function createGlassWidowRig() {
  const group = joint(null, 'Lacrima — glass widow boss rig');
  group.scale.setScalar(1.42);
  group.userData.character = 'Lacrima';
  group.userData.forward = '+Z';
  const motion = joint(group, 'Lacrima motion root', [0, .05, 0]);
  const body = joint(motion, 'Lacrima cathedral thorax', [0, 1.85, 0]);
  const facePivot = joint(body, 'Lacrima mirrored face', [0, .7, .16]);

  const obsidian = material('Lacrima wet obsidian', {
    color: 0x10152a, roughness: .18, metalness: .86,
    emissive: 0x080d24, emissiveIntensity: .42,
  });
  const pearl = material('Lacrima drowned pearl', {
    color: 0xeafaff, roughness: .2, metalness: .68,
    emissive: 0x183c51, emissiveIntensity: .28,
  });
  const rose = material('Lacrima widow rose', {
    color: 0xff79dd, roughness: .22, metalness: .5,
    emissive: 0x7b164f, emissiveIntensity: 1.05,
  });
  const cyan = new THREE.MeshBasicMaterial({
    name: 'Lacrima cold prism light', color: 0x8ffaff, toneMapped: false,
  });
  const glass = new THREE.MeshStandardMaterial({
    name: 'Lacrima living glass',
    color: 0x8fefff,
    roughness: .12,
    metalness: .34,
    transparent: true,
    opacity: .62,
    side: THREE.DoubleSide,
    depthWrite: false,
    emissive: new THREE.Color(0x113d66),
    emissiveIntensity: .82,
  });
  const wardMaterial = new THREE.MeshBasicMaterial({
    name: 'Lacrima prism ward', color: 0x7bf7ff, wireframe: true,
    transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const surfaces = [obsidian, pearl, rose, cyan, glass, wardMaterial];
  const flashable = [obsidian, pearl, rose, glass].map((surface) => ({
    surface,
    color: surface.color.clone(),
    emissive: surface.emissive?.clone() || new THREE.Color(),
    emissiveIntensity: surface.emissiveIntensity || 0,
  }));

  const thorax = mesh(body, new THREE.IcosahedronGeometry(.9, 2), obsidian, {
    name: 'faceted drowned cathedral thorax', scale: [1.0, 1.35, .72],
  });
  mesh(body, new THREE.OctahedronGeometry(.78, 1), glass, {
    name: 'floating glass sternum reliquary', position: [0, .12, .47], scale: [.68, 1.05, .28],
    castShadow: false, renderOrder: 4,
  });
  const core = mesh(body, new THREE.OctahedronGeometry(.28, 2), cyan, {
    name: 'Lacrima exposed tidal heart', position: [0, .05, .68], scale: [.72, 1.08, .38],
    castShadow: false, receiveShadow: false, renderOrder: 7,
  });
  core.userData.isCore = true;

  const mask = mesh(facePivot, new THREE.SphereGeometry(.38, 28, 18), pearl, {
    name: 'featureless widow mask', scale: [.84, 1.24, .34], rotation: [.04, 0, 0],
  });
  const widowHalo = mesh(body, new THREE.TorusGeometry(1.18, .055, 9, 72), rose, {
    name: 'widow eclipse halo', position: [0, .68, -.18], scale: [1, 1.16, 1],
    castShadow: false, receiveShadow: false, renderOrder: 2,
  });
  mesh(body, new THREE.TorusGeometry(1.43, .025, 7, 72), cyan, {
    name: 'widow outer tear halo', position: [0, .68, -.2], scale: [1, 1.16, 1],
    castShadow: false, receiveShadow: false, renderOrder: 2,
  });
  mesh(facePivot, new THREE.ConeGeometry(.36, .7, 5), glass, {
    name: 'glass widow crown', position: [0, .46, -.04], rotation: [0, 0, Math.PI],
    scale: [1.28, 1.0, .72], castShadow: false,
  });
  const eyes = [];
  for (const side of [-1, 1]) {
    eyes.push(mesh(facePivot, new THREE.SphereGeometry(.046, 12, 8), rose, {
      name: `${side < 0 ? 'left' : 'right'} widow eye`,
      position: [side * .12, .06, .128], scale: [1.45, .42, .45], castShadow: false,
    }));
  }

  const wingRoots = [];
  const wingPanels = [];
  const bladeArms = [];
  const bladeTips = [];
  const bladeGeometry = new THREE.ConeGeometry(.18, 2.25, 4, 1);
  bladeGeometry.translate(0, 1.06, 0);
  for (const side of [-1, 1]) {
    const wingRoot = joint(body, `${side < 0 ? 'left' : 'right'} mirror wing root`, [side * .5, .24, -.24]);
    wingRoots.push(wingRoot);
    for (let layer = 0; layer < 4; layer += 1) {
      const panel = mesh(wingRoot, new THREE.OctahedronGeometry(.5, 0), glass, {
        name: `${side < 0 ? 'left' : 'right'} mirror wing blade ${layer + 1}`,
        position: [side * (.42 + layer * .3), .34 - layer * .14, -.18 - layer * .18],
        rotation: [.15 + layer * .05, 0, side * (-.52 - layer * .12)],
        scale: [.38, 1.42 + layer * .14, .08], castShadow: false, renderOrder: 3,
      });
      panel.userData.baseY = panel.position.y;
      wingPanels.push(panel);
    }
    for (let arm = 0; arm < 3; arm += 1) {
      const root = joint(body, `${side < 0 ? 'left' : 'right'} glass scissor arm ${arm + 1}`,
        [side * (.5 + arm * .05), .18 - arm * .42, .04 - arm * .12],
        [0, 0, side * (.65 + arm * .28)]);
      const blade = mesh(root, bladeGeometry, arm === 1 ? rose : glass, {
        name: `${side < 0 ? 'left' : 'right'} widow blade ${arm + 1}`,
        rotation: [0, 0, side * -.08], scale: [1 + arm * .12, .72 + arm * .06, .75],
        castShadow: arm === 1,
      });
      const tip = joint(root, `${side < 0 ? 'left' : 'right'} widow blade tip ${arm + 1}`,
        [0, 1.62 + arm * .12, 0]);
      bladeArms.push(root);
      bladeTips.push(tip);
      blade.userData.blade = true;
    }
  }

  const legs = [];
  const legGeometry = new THREE.CylinderGeometry(.085, .145, 1, 8);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU + Math.PI / 6;
    const hip = new THREE.Vector3(Math.sin(angle) * .58, 1.75, Math.cos(angle) * .46);
    const knee = new THREE.Vector3(Math.sin(angle) * 1.48, .94 + (index % 2) * .12, Math.cos(angle) * 1.18);
    const foot = new THREE.Vector3(Math.sin(angle) * 2.05, .08, Math.cos(angle) * 1.65);
    const root = joint(motion, `cathedral spider leg ${index + 1}`);
    const upper = mesh(root, legGeometry, index % 2 ? pearl : obsidian, {
      name: `upper glass widow leg ${index + 1}`, scale: [1.0, 1, 1.0],
    });
    orientBetween(upper, hip, knee);
    const lower = mesh(root, legGeometry, glass, {
      name: `lower glass widow leg ${index + 1}`, castShadow: index % 2 === 0,
    });
    orientBetween(lower, knee, foot);
    const claw = mesh(root, new THREE.ConeGeometry(.12, .62, 5), rose, {
      name: `widow foot needle ${index + 1}`, position: foot.toArray(), rotation: [Math.PI * .5, 0, -angle],
      castShadow: false,
    });
    legs.push({ root, upper, lower, claw, angle });
  }

  const ward = mesh(body, new THREE.IcosahedronGeometry(1.58, 2), wardMaterial, {
    name: 'visible prism ward shell', position: [0, .05, 0], scale: [1.28, 1.15, 1.02],
    castShadow: false, receiveShadow: false, renderOrder: 8,
  });
  const wardInner = mesh(body, new THREE.TorusGeometry(1.18, .035, 8, 52), cyan, {
    name: 'prism ward meridian', position: [0, .06, .08], rotation: [Math.PI * .5, 0, 0],
    castShadow: false, receiveShadow: false, renderOrder: 8,
  });
  const weapon = bladeArms[1];
  weapon.name = 'Lacrima principal scissor weapon';
  const weaponTip = bladeTips[1];
  weaponTip.userData.isWeaponTip = true;

  const hitReaction = { strength: 0, side: 1, lift: 0 };
  let flash = 0;
  let phase = 1;
  let mechanic = { sealed: true, broken: 0, total: 3, openProgress: 0 };

  function setPhase(value) {
    phase = Math.max(1, Math.min(3, Math.round(value || 1)));
    group.userData.phase = phase;
    const phaseColor = [0, 0x8ffaff, 0xff8de2, 0xb68cff][phase];
    wardMaterial.color.setHex(phaseColor);
    rose.color.setHex(phase === 1 ? 0xff79dd : phase === 2 ? 0xffa0e8 : 0xb886ff);
    rose.emissive.setHex(phase === 3 ? 0x471173 : 0x7b164f);
  }

  function setSeams(count) {
    group.userData.seams = Math.max(0, Math.min(3, Math.round(count || 0)));
  }

  function setMechanicState(state = {}) {
    mechanic = { ...mechanic, ...state };
    group.userData.mechanic = { ...mechanic };
  }

  function react({ strength = .4, side = 1, lift = 0 } = {}) {
    hitReaction.strength = Math.max(hitReaction.strength, clamp01(strength));
    hitReaction.side = side < 0 ? -1 : 1;
    hitReaction.lift = lift;
  }

  function hitFlash(strength = 1) {
    flash = Math.max(flash, clamp01(strength));
  }

  function update(pose = {}, time = 0, dt = 1 / 60) {
    const action = String(pose.action || 'bossIdle').toLowerCase();
    const at = Math.max(0, Number(pose.actionTime) || 0);
    const telegraph = clamp01(Number(pose.telegraph) || 0);
    const dead = Boolean(pose.dead);
    const speed = Math.max(0, Number(pose.moveSpeed) || 0);
    const breathe = Math.sin(time * 1.6) * .025;
    const stride = Math.sin(time * 4.6) * Math.min(1, speed / 4);
    hitReaction.strength *= Math.exp(-dt * 6.8);
    flash *= Math.exp(-dt * 12);

    motion.position.y = .05 + breathe + Math.abs(stride) * .025;
    motion.rotation.z = hitReaction.side * hitReaction.strength * -.16;
    motion.rotation.x = hitReaction.lift * hitReaction.strength * -.12;
    body.rotation.y = Math.sin(time * .46) * .06;
    facePivot.rotation.x = -.04 + Math.sin(time * 1.1) * .025;
    facePivot.rotation.y = Math.sin(time * .72) * .055;

    const gaze = action.includes('gaze') ? smooth(at / .72) * (1 - smooth((at - 1.62) / .38)) : 0;
    const scissor = action.includes('scissor') || action.includes('claw')
      ? Math.sin(clamp01(at / 1.46) * Math.PI) : 0;
    const tide = action.includes('tide') || action.includes('rain') || action.includes('cast')
      ? smooth(at / .72) * (1 - smooth((at - 1.72) / .48)) : 0;
    const stagger = action === 'stagger' ? Math.sin(clamp01(at / Math.max(.2, pose.duration || .82)) * Math.PI) : 0;
    const transition = action === 'transition' ? Math.sin(clamp01(at / 1.7) * Math.PI) : 0;
    const death = dead || action === 'death' ? smooth(at / 1.9) : 0;

    facePivot.rotation.x -= gaze * .32;
    facePivot.position.z = .16 + gaze * .18;
    body.rotation.z += stagger * .22;
    body.position.y = transition * .62 - death * 1.15;
    body.rotation.x = death * 1.05;
    thorax.scale.set(1 + telegraph * .06, 1.35 + tide * .16, .72 + gaze * .08);

    wingRoots.forEach((root, index) => {
      const side = index === 0 ? -1 : 1;
      root.rotation.z = side * (.2 + phase * .08 + gaze * .68 + tide * .35);
      root.rotation.y = side * (Math.sin(time * .8 + index) * .06 + transition * .22);
    });
    wingPanels.forEach((panel, index) => {
      panel.rotation.y = Math.sin(time * 1.2 + index) * .08 + death * (index % 2 ? 1 : -1) * .8;
      panel.position.y = panel.userData.baseY + Math.sin(time * 1.4 + index * .7) * .012;
    });
    bladeArms.forEach((root, index) => {
      const side = index < 3 ? -1 : 1;
      const layer = index % 3;
      root.rotation.z = side * (.65 + layer * .28 - scissor * (1.0 + layer * .12));
      root.rotation.x = tide * (layer - 1) * .38 + gaze * .18;
      root.rotation.y = side * gaze * .28;
    });
    legs.forEach((leg, index) => {
      leg.root.rotation.y = Math.sin(time * 3.8 + index * 1.7) * .028 * Math.min(1, speed / 3);
      leg.root.rotation.z = stride * (index % 2 ? 1 : -1) * .06;
    });

    const sealed = mechanic.sealed !== false;
    const wardStrength = sealed ? 1 : Math.max(0, 1 - (mechanic.openProgress || 1));
    ward.visible = wardStrength > .025;
    wardInner.visible = ward.visible;
    ward.material.opacity = (.09 + pulse(time, 3.4) * .1 + telegraph * .13) * wardStrength;
    ward.rotation.x = time * .13;
    ward.rotation.y = time * -.18;
    ward.rotation.z = time * .09;
    wardInner.rotation.z = time * .7;
    widowHalo.rotation.z = Math.sin(time * .31) * .08;
    const coreScale = 1 + pulse(time, 4.2) * .14 + gaze * .62 + (sealed ? 0 : .35);
    core.scale.set(.72 * coreScale, 1.08 * coreScale, .38 * coreScale);
    eyes.forEach((eye, index) => {
      const eyeScale = 1 + gaze * 2.4 + telegraph * .6;
      eye.scale.set(1.45 * eyeScale, .42 * eyeScale, .45 * eyeScale);
      eye.material.emissiveIntensity = 1.05 + gaze * 3.5 + pulse(time, 5.5, index) * .35;
    });
    for (const entry of flashable) {
      entry.surface.color.copy(entry.color).lerp(new THREE.Color(0xffffff), flash * .58);
      if (entry.surface.emissive) {
        entry.surface.emissive.copy(entry.emissive).lerp(new THREE.Color(0xeaffff), flash * .7);
        entry.surface.emissiveIntensity = entry.emissiveIntensity + flash * 1.9;
      }
    }
    group.userData.phasePulse = pulse(time, 2.6 + phase * .5);
    group.userData.wardStrength = wardStrength;
  }

  setPhase(1);
  setSeams(0);
  setMechanicState({ sealed: true, broken: 0, total: 3, openProgress: 0 });
  return {
    group,
    body,
    weapon,
    weaponTip,
    core,
    setPhase,
    setSeams,
    setMechanicState,
    react,
    hitFlash,
    update,
    dispose: () => disposeTree(group),
  };
}

function createStarEaterRig() {
  const group = joint(null, 'Cathedra-9 — star eater boss rig');
  group.scale.setScalar(1.82);
  group.userData.character = 'Cathedra-9';
  group.userData.forward = '+Z';
  const motion = joint(group, 'Cathedra gravitic motion root');
  const body = joint(motion, 'Cathedra last-engine chassis', [0, 1.35, 0]);

  const voidMetal = material('Cathedra void-black armour', {
    color: 0x08090d, roughness: .16, metalness: .94,
    emissive: 0x07000f, emissiveIntensity: .35,
  });
  const burntGold = material('Cathedra burnt crown gold', {
    color: 0xd69435, roughness: .25, metalness: .9,
    emissive: 0x4d1900, emissiveIntensity: .64,
  });
  const bone = material('Cathedra stellar bone', {
    color: 0xe8ddc7, roughness: .38, metalness: .35,
    emissive: 0x2a1707, emissiveIntensity: .24,
  });
  const violet = material('Cathedra singularity violet', {
    color: 0x8e62ff, roughness: .18, metalness: .4,
    emissive: 0x3a129e, emissiveIntensity: 1.8,
  });
  const star = new THREE.MeshBasicMaterial({
    name: 'Cathedra captive star', color: 0xffe3a0, toneMapped: false,
  });
  const nodeOff = material('severed crown node', {
    color: 0x2d2132, roughness: .48, metalness: .72,
    emissive: 0x09020d, emissiveIntensity: .25,
  });
  const surfaces = [voidMetal, burntGold, bone, violet, star, nodeOff];
  const flashable = [voidMetal, burntGold, bone, violet].map((surface) => ({
    surface,
    color: surface.color.clone(),
    emissive: surface.emissive.clone(),
    emissiveIntensity: surface.emissiveIntensity,
  }));

  const shell = mesh(body, new THREE.DodecahedronGeometry(1.02, 1), voidMetal, {
    name: 'star-eater armoured furnace', scale: [1.22, 1.05, .92],
  });
  mesh(body, new THREE.SphereGeometry(.82, 24, 18), bone, {
    name: 'ribbed stellar bone mantle', scale: [1.08, .8, .72], position: [0, .28, .12],
  });
  const core = mesh(body, new THREE.SphereGeometry(.32, 24, 16), star, {
    name: 'Cathedra captive sun core', position: [0, .02, .8], scale: [1, 1.24, .38],
    castShadow: false, receiveShadow: false, renderOrder: 8,
  });
  core.userData.isCore = true;
  const coreHalo = mesh(body, new THREE.TorusGeometry(.56, .055, 8, 42), violet, {
    name: 'singularity core halo', position: [0, .02, .66], rotation: [Math.PI * .5, 0, 0],
    castShadow: false, receiveShadow: false,
  });

  const ringRoots = [];
  for (let index = 0; index < 3; index += 1) {
    const ringRoot = joint(body, `broken orrery ring ${index + 1}`);
    ringRoot.rotation.set(index * .6, index * .9, index * .4);
    mesh(ringRoot, new THREE.TorusGeometry(1.28 + index * .23, .045 + index * .012, 8, 64),
      index === 1 ? violet : burntGold, {
        name: `Cathedra orbital ring ${index + 1}`, castShadow: false, receiveShadow: false,
      });
    ringRoots.push(ringRoot);
  }

  const crownRoots = [];
  const hornGeometry = new THREE.ConeGeometry(.16, 1.6, 5);
  hornGeometry.translate(0, .72, 0);
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * TAU;
    const root = joint(body, `star-eater crown tooth ${index + 1}`,
      [Math.sin(angle) * .84, .74 + (index % 2) * .18, Math.cos(angle) * .68],
      [Math.sin(angle) * .22, angle, -Math.sin(angle) * .35]);
    mesh(root, hornGeometry, index % 3 === 0 ? bone : burntGold, {
      name: `load-bearing crown fang ${index + 1}`, scale: [1 + (index % 2) * .2, .82 + (index % 3) * .08, 1],
    });
    crownRoots.push(root);
  }

  const claws = [];
  const clawTips = [];
  const armGeometry = new THREE.CylinderGeometry(.13, .22, 1.55, 8);
  const talonGeometry = new THREE.ConeGeometry(.17, 1.18, 5);
  talonGeometry.translate(0, .48, 0);
  for (const side of [-1, 1]) {
    for (let level = 0; level < 2; level += 1) {
      const root = joint(body, `${side < 0 ? 'left' : 'right'} event-horizon claw ${level + 1}`,
        [side * .88, .24 - level * .5, .05 - level * .18],
        [0, 0, side * (.88 + level * .2)]);
      mesh(root, armGeometry, voidMetal, {
        name: `Cathedra articulated claw arm ${side}:${level}`,
        position: [0, .68, 0], scale: [1 + level * .1, 1, 1 + level * .1],
      });
      mesh(root, talonGeometry, level ? violet : burntGold, {
        name: `Cathedra event-horizon talon ${side}:${level}`,
        position: [0, 1.48, 0], rotation: [0, 0, side * -.22],
      });
      const tip = joint(root, `Cathedra claw contact tip ${side}:${level}`, [0, 2.2, 0]);
      claws.push(root);
      clawTips.push(tip);
    }
  }
  const weapon = claws[3];
  weapon.name = 'Cathedra principal event-horizon claw';
  const weaponTip = clawTips[3];
  weaponTip.userData.isWeaponTip = true;

  const nodeRoot = joint(group, 'orbiting crown tether assembly', [0, 2.25, 0]);
  const nodeMaterial = violet.clone();
  nodeMaterial.name = 'live crown tether';
  const nodeCoreMaterial = star.clone();
  nodeCoreMaterial.name = 'live crown tether star';
  const nodeBeamMaterial = new THREE.LineBasicMaterial({
    name: 'crown tether beam', color: 0xa87bff, transparent: true, opacity: .58,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  surfaces.push(nodeMaterial, nodeCoreMaterial, nodeBeamMaterial);
  const nodes = [];
  for (let index = 0; index < 5; index += 1) {
    const root = joint(nodeRoot, `crown tether node ${index + 1}`);
    const cage = mesh(root, new THREE.OctahedronGeometry(.36, 1), nodeMaterial, {
      name: `crown tether cage ${index + 1}`, castShadow: false, receiveShadow: false,
    });
    const nodeCore = mesh(root, new THREE.SphereGeometry(.12, 12, 8), nodeCoreMaterial, {
      name: `crown tether core ${index + 1}`, castShadow: false, receiveShadow: false,
    });
    const beamGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0),
    ]);
    const beam = new THREE.Line(beamGeometry, nodeBeamMaterial);
    beam.name = `crown tether beam ${index + 1}`;
    beam.frustumCulled = false;
    group.add(beam);
    nodes.push({ root, cage, core: nodeCore, beam, alive: true, active: true, index });
  }

  const hitReaction = { strength: 0, side: 1, lift: 0 };
  let flash = 0;
  let phase = 1;
  let mechanic = { sealed: true, broken: 0, total: 3, openProgress: 0, activeNode: 0 };

  function setPhase(value) {
    phase = Math.max(1, Math.min(3, Math.round(value || 1)));
    group.userData.phase = phase;
    violet.color.setHex(phase === 1 ? 0x8e62ff : phase === 2 ? 0xff724d : 0xb36dff);
    violet.emissive.setHex(phase === 2 ? 0x821c0b : 0x3a129e);
  }

  function setSeams(count) {
    group.userData.seams = Math.max(0, Math.min(3, Math.round(count || 0)));
  }

  function setMechanicState(state = {}) {
    mechanic = { ...mechanic, ...state };
    nodes.forEach((node, index) => {
      node.active = index < (mechanic.total || 0);
      node.alive = node.active && index >= (mechanic.broken || 0);
      node.root.visible = node.active;
      node.beam.visible = node.alive;
      node.cage.material = node.alive ? nodeMaterial : nodeOff;
      node.core.visible = node.alive;
    });
    group.userData.mechanic = { ...mechanic };
  }

  function react({ strength = .4, side = 1, lift = 0 } = {}) {
    hitReaction.strength = Math.max(hitReaction.strength, clamp01(strength));
    hitReaction.side = side < 0 ? -1 : 1;
    hitReaction.lift = lift;
  }

  function hitFlash(strength = 1) {
    flash = Math.max(flash, clamp01(strength));
  }

  const center = new THREE.Vector3();
  const nodePosition = new THREE.Vector3();
  function update(pose = {}, time = 0, dt = 1 / 60) {
    const action = String(pose.action || 'bossIdle').toLowerCase();
    const at = Math.max(0, Number(pose.actionTime) || 0);
    const telegraph = clamp01(Number(pose.telegraph) || 0);
    const dead = Boolean(pose.dead);
    const airborne = Boolean(pose.airborne);
    hitReaction.strength *= Math.exp(-dt * 7.2);
    flash *= Math.exp(-dt * 12);
    const hover = airborne ? Math.sin(time * 1.35) * .16 : Math.sin(time * 2.1) * .035;
    motion.position.y = hover - hitReaction.lift * hitReaction.strength * .16;
    motion.rotation.z = hitReaction.side * hitReaction.strength * -.14;
    body.rotation.y = Math.sin(time * .42) * .05;

    const gravity = action.includes('gravity') ? smooth(at / .74) * (1 - smooth((at - 2.12) / .46)) : 0;
    const rake = action.includes('rake') || action.includes('claw')
      ? Math.sin(clamp01(at / 1.48) * Math.PI) : 0;
    const bombard = action.includes('bombard') ? smooth(at / .65) * (1 - smooth((at - 2.1) / .52)) : 0;
    const crash = action.includes('crash') ? Math.sin(clamp01(at / 1.35) * Math.PI) : 0;
    const transition = action === 'transition' ? Math.sin(clamp01(at / 1.8) * Math.PI) : 0;
    const stagger = action === 'stagger' ? Math.sin(clamp01(at / .82) * Math.PI) : 0;
    const death = dead || action === 'death' ? smooth(at / 2.05) : 0;
    motion.rotation.x = gravity * -.16 + crash * .3 + death * 1.18;
    motion.position.y += transition * 1.1 - death * 2.4;
    body.rotation.z = stagger * .26 + death * .58;
    shell.scale.set(1.22 + gravity * .12, 1.05 + bombard * .08, .92 + gravity * .12);

    ringRoots.forEach((root, index) => {
      const direction = index % 2 ? -1 : 1;
      root.rotation.x += dt * direction * (.18 + index * .09 + gravity * .8);
      root.rotation.y += dt * -direction * (.14 + index * .07 + bombard * .6);
      root.rotation.z += dt * direction * (.11 + telegraph * .5);
      root.scale.setScalar(1 + gravity * (.08 + index * .03) + death * index * .18);
    });
    crownRoots.forEach((root, index) => {
      root.rotation.x = Math.sin(time * 1.4 + index) * .04 + gravity * .26;
      root.rotation.z += death * (index % 2 ? 1 : -1) * .018;
    });
    claws.forEach((root, index) => {
      const side = index < 2 ? -1 : 1;
      const level = index % 2;
      root.rotation.z = side * (.88 + level * .2 - rake * (1.0 + level * .25));
      root.rotation.x = gravity * (level ? -.45 : .42) + bombard * .26 + crash * -.38;
      root.rotation.y = side * (gravity * .2 + crash * .35);
    });

    nodeRoot.rotation.y = time * (.38 + phase * .07);
    nodeRoot.rotation.x = Math.sin(time * .31) * .12;
    group.updateMatrixWorld(true);
    body.getWorldPosition(center);
    nodes.forEach((node, index) => {
      if (!node.active) return;
      const angle = time * (.72 + phase * .09) + index * TAU / Math.max(1, mechanic.total || 3);
      const radius = 2.25 + phase * .18 + Math.sin(time * .7 + index) * .12;
      node.root.position.set(
        Math.sin(angle) * radius,
        .2 + Math.sin(time * 1.45 + index * 1.7) * .55,
        Math.cos(angle) * radius * .72,
      );
      const active = index === (mechanic.activeNode || 0) && node.alive;
      const beat = 1 + pulse(time, 5.4, index) * .16 + (active ? .48 : 0);
      node.root.scale.setScalar(node.alive ? beat : .7);
      node.root.rotation.x = time * (1.1 + index * .08);
      node.root.rotation.y = time * (-.9 - index * .05);
      node.root.getWorldPosition(nodePosition);
      const localCenter = group.worldToLocal(center.clone());
      const localNode = group.worldToLocal(nodePosition.clone());
      const positions = node.beam.geometry.attributes.position;
      positions.setXYZ(0, localCenter.x, localCenter.y, localCenter.z);
      positions.setXYZ(1, localNode.x, localNode.y, localNode.z);
      positions.needsUpdate = true;
      node.beam.material.opacity = node.alive ? .34 + pulse(time, 4.3, index) * .34 : 0;
    });

    const coreScale = 1 + pulse(time, 4.0) * .13 + gravity * .62 + (mechanic.sealed === false ? .44 : 0);
    core.scale.set(coreScale, coreScale * 1.24, coreScale * .38);
    coreHalo.rotation.z += dt * (1.2 + gravity * 3.4);
    coreHalo.scale.setScalar(1 + gravity * .26 + bombard * .12);
    violet.emissiveIntensity = 1.8 + telegraph * 1.6 + gravity * 2.4 + bombard * 1.1;
    for (const entry of flashable) {
      entry.surface.color.copy(entry.color).lerp(new THREE.Color(0xffffff), flash * .56);
      entry.surface.emissive.copy(entry.emissive).lerp(new THREE.Color(0xfff2d0), flash * .66);
      entry.surface.emissiveIntensity = entry.emissiveIntensity + flash * 1.8;
    }
    group.userData.phasePulse = pulse(time, 2.4 + phase * .45);
    group.userData.nodeCount = mechanic.total || 0;
    group.userData.nodesAlive = Math.max(0, (mechanic.total || 0) - (mechanic.broken || 0));
  }

  setPhase(1);
  setSeams(0);
  setMechanicState({ sealed: true, broken: 0, total: 3, openProgress: 0, activeNode: 0 });
  return {
    group,
    body,
    weapon,
    weaponTip,
    core,
    nodes,
    setPhase,
    setSeams,
    setMechanicState,
    react,
    hitFlash,
    update,
    dispose: () => disposeTree(group),
  };
}

export function createBossRoster() {
  const group = joint(null, 'SECONDHAND SAINT complete boss roster');
  const rigs = [createBossRig(), createGlassWidowRig(), createStarEaterRig()];
  for (const rig of rigs) group.add(rig.group);
  let encounterIndex = 0;

  function active() {
    return rigs[encounterIndex] || rigs[0];
  }

  function setEncounter(index = 0) {
    encounterIndex = Math.max(0, Math.min(rigs.length - 1, Math.round(index || 0)));
    rigs.forEach((rig, rigIndex) => {
      rig.group.visible = rigIndex === encounterIndex;
      if (rigIndex !== encounterIndex) rig.group.position.set(0, 0, 0);
    });
    group.userData.encounterIndex = encounterIndex;
    group.userData.character = active().group.userData.character;
  }

  setEncounter(0);
  return {
    group,
    rigs,
    get encounterIndex() { return encounterIndex; },
    get weapon() { return active().weapon; },
    get weaponTip() { return active().weaponTip; },
    get core() { return active().core; },
    get leftShoulderMuzzle() { return active().leftShoulderMuzzle; },
    get rightShoulderMuzzle() { return active().rightShoulderMuzzle; },
    get nodes() { return active().nodes || []; },
    setEncounter,
    setPhase: (phase) => active().setPhase?.(phase),
    setSeams: (count) => active().setSeams?.(count),
    setMechanicState: (state) => active().setMechanicState?.(state),
    react: (state) => active().react?.(state),
    hitFlash: (strength) => active().hitFlash?.(strength),
    update: (pose, time, dt) => active().update?.(pose, time, dt),
    dispose() {
      for (const rig of rigs) rig.dispose?.();
      group.removeFromParent();
    },
  };
}
