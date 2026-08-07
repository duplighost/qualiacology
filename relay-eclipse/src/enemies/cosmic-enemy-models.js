// Articulated procedural enemy models, ported from RELAY ZERO.
//
// These are real geometry with real joints: a capsule torso, a helmet with a
// glowing visor rim, a life-support pack, oxygen tanks, and arms and legs on
// their own pivots that a gait can actually drive. They replace the single
// photograph per role that used to be billboarded toward the camera and warped
// in a vertex shader — that approach could never walk, because there was only
// ever one pose of it.
//
// Kept as close to the donor as possible so behaviour is comparable: only the
// import path and the sky builder (RELAY//ECLIPSE has its own cosmos) differ.
import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;

const ROLE_PALETTES = {
  rusher: 0xff3f68,
  shooter: 0x46efff,
  brute: 0xff9d3d,
  warden: 0xd15cff,
  planet: 0xff5b9e
};

const ROLE_SCALE = {
  rusher: [0.9, 0.98, 0.84],
  shooter: [0.98, 1.02, 0.98],
  brute: [1.2, 1.2, 1.12],
  warden: [1.55, 1.68, 1.42]
};

const ROLE_METRICS = {
  rusher: { healthY: 2.45, aimHeight: 1.32 },
  shooter: { healthY: 2.65, aimHeight: 1.45 },
  brute: { healthY: 3.15, aimHeight: 1.62 },
  warden: { healthY: 4.45, aimHeight: 2.2 },
  planet: { healthY: 1.72, aimHeight: 0.08 }
};
export function buildEnemyVisual(type, def = {}, { touchMode = false } = {}) {
  const normalizedType = type === "planet" ? "planet" : ROLE_METRICS[type] ? type : "rusher";
  const color = new THREE.Color(def.color ?? ROLE_PALETTES[normalizedType]);
  const materials = makeEnemyMaterials(normalizedType, color);
  const modelRoot = new THREE.Group();
  modelRoot.name = normalizedType === "planet" ? "LivingPlanet" : `Astronaut-${normalizedType}`;
  modelRoot.userData.cosmicEnemyVisual = true;

  const hitboxes = [];
  const parts = [];
  const nodes = { type: normalizedType };
  const extras = [];

  if (normalizedType === "planet") {
    buildLivingPlanet(modelRoot, materials, hitboxes, parts, nodes, extras, touchMode, color);
  } else {
    buildAstronaut(modelRoot, normalizedType, materials, hitboxes, parts, nodes, touchMode, color);
  }

  const metrics = ROLE_METRICS[normalizedType];
  const visual = {
    modelRoot,
    materials,
    hitboxes,
    visualFamily: normalizedType === "planet" ? "planet" : "astronaut",
    airborne: normalizedType === "planet",
    parts,
    healthY: metrics.healthY,
    aimHeight: metrics.aimHeight
  };

  // Internal animation state is intentionally attached as non-semantic data.
  visual._nodes = nodes;
  visual._extraMaterials = extras;
  visual._type = normalizedType;
  modelRoot.userData.visualFamily = visual.visualFamily;
  return visual;
}

/** Updates only the model's cosmetic pose and material response. */
export function updateEnemyVisual(
  visual,
  time = 0,
  dt = 0,
  { moving = false, speed = 0, hurt = 0, charging = false, phase = 0 } = {}
) {
  if (!visual?.modelRoot || !visual._nodes) return;

  const nodes = visual._nodes;
  const safeTime = Number.isFinite(time) ? time : 0;
  const safeDt = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0;
  const safePhase = Number.isFinite(phase) ? phase : 0;
  const hurtAmount = clamp(Number(hurt) || 0, 0, 1);
  const chargeAmount = typeof charging === "number" ? clamp(charging, 0, 1) : charging ? 1 : 0;
  const speedAmount = clamp(Math.abs(Number(speed) || 0) / 4, 0, 1.25);
  const motion = moving ? Math.max(0.28, speedAmount) : 0.08;

  const { shell, glow, visor } = visual.materials;
  shell.emissiveIntensity = shell.userData.baseEmissive + hurtAmount * 2.8;
  glow.emissiveIntensity = glow.userData.baseEmissive + hurtAmount * 4.5 + chargeAmount * 3.1;
  visor.emissiveIntensity = visor.userData.baseEmissive + hurtAmount * 1.5 + chargeAmount * 0.6;

  if (visual._type === "planet") {
    const pulse = 0.5 + Math.sin(safeTime * 3.2 + safePhase) * 0.5;
    if (nodes.planetFigure) nodes.planetFigure.position.y = Math.sin(safeTime * 1.7 + safePhase) * 0.12;
    if (nodes.ringRoot) {
      nodes.ringRoot.rotation.y = safeTime * 0.62 + safePhase;
      nodes.ringRoot.rotation.z = 0.22 + Math.sin(safeTime * 0.7 + safePhase) * 0.08;
    }
    if (nodes.orbitRoot) {
      nodes.orbitRoot.rotation.y = safeTime * 0.88 + safePhase;
      nodes.orbitRoot.rotation.z = 0.36 + Math.sin(safeTime * 0.55 + safePhase) * 0.12;
    }
    if (nodes.mouth) nodes.mouth.scale.y = 0.3 + pulse * 0.15 + chargeAmount * 0.12;
    if (nodes.atmosphere) nodes.atmosphere.material.opacity = 0.09 + pulse * 0.045 + chargeAmount * 0.035;
    if (nodes.leftMoon) nodes.leftMoon.rotation.y += safeDt * 1.7;
    if (nodes.rightMoon) nodes.rightMoon.rotation.x += safeDt * 1.3;
    return;
  }

  const gaitRate = visual._type === "rusher" ? 8.5 : visual._type === "brute" ? 4.3 : 5.6;
  const gait = safeTime * (gaitRate + speedAmount * 1.4) + safePhase;
  const stride = Math.sin(gait);
  const counterStride = Math.sin(gait + Math.PI);

  if (visual._type === "rusher") {
    setPivotX(nodes.leftArm, -0.16 + stride * 0.72 * motion);
    setPivotX(nodes.rightArm, -0.16 + counterStride * 0.72 * motion);
    setPivotX(nodes.leftLeg, counterStride * 0.62 * motion);
    setPivotX(nodes.rightLeg, stride * 0.62 * motion);
    if (nodes.figure) nodes.figure.position.y = Math.abs(stride) * 0.035 * motion;
    if (nodes.torso) nodes.torso.rotation.x = -0.13 - Math.abs(stride) * 0.035;
    if (nodes.bladeRoot) nodes.bladeRoot.rotation.z = Math.sin(safeTime * 4.2 + safePhase) * 0.045;
  } else if (visual._type === "shooter") {
    const drift = Math.sin(safeTime * 1.75 + safePhase);
    setPivotX(nodes.leftArm, -0.72 + drift * 0.1);
    setPivotX(nodes.rightArm, -0.58 - drift * 0.08);
    setPivotX(nodes.leftLeg, 0.12 + drift * 0.13);
    setPivotX(nodes.rightLeg, -0.12 - drift * 0.13);
    if (nodes.figure) nodes.figure.position.y = drift * 0.085;
    if (nodes.roleRing) nodes.roleRing.rotation.z = safeTime * 0.72 + safePhase;
    if (nodes.cannonGlow) {
      const flare = 1 + chargeAmount * 0.5 + Math.sin(safeTime * 5 + safePhase) * 0.05;
      nodes.cannonGlow.scale.setScalar(flare);
    }
  } else if (visual._type === "brute") {
    setPivotX(nodes.leftArm, -0.08 + stride * 0.36 * motion);
    setPivotX(nodes.rightArm, -0.08 + counterStride * 0.36 * motion);
    setPivotX(nodes.leftLeg, counterStride * 0.32 * motion);
    setPivotX(nodes.rightLeg, stride * 0.32 * motion);
    if (nodes.figure) nodes.figure.position.y = Math.abs(stride) * 0.022 * motion;
    if (nodes.torso) nodes.torso.rotation.x = -0.045 - Math.abs(stride) * 0.018;
  } else if (visual._type === "warden") {
    const drift = Math.sin(safeTime * 1.22 + safePhase);
    setPivotX(nodes.leftArm, -0.12 + drift * 0.18);
    setPivotX(nodes.rightArm, -0.12 - drift * 0.18);
    setPivotX(nodes.leftLeg, drift * 0.06);
    setPivotX(nodes.rightLeg, -drift * 0.06);
    if (nodes.figure) nodes.figure.position.y = drift * 0.035;
    if (nodes.roleRing) {
      nodes.roleRing.rotation.z = safeTime * 0.46 + safePhase;
      nodes.roleRing.rotation.x = 0.12 + Math.sin(safeTime * 0.63) * 0.08;
    }
    if (nodes.crown) nodes.crown.rotation.y = safeTime * 0.34;
  }
}
function makeEnemyMaterials(type, accent) {
  const shellColor = type === "planet"
    ? new THREE.Color(0x171326).lerp(accent, 0.28)
    : new THREE.Color(0xd5e2e0).lerp(accent, type === "warden" ? 0.16 : 0.08);
  const shell = new THREE.MeshStandardMaterial({
    color: shellColor,
    emissive: accent,
    emissiveIntensity: type === "planet" ? 0.34 : 0.2,
    metalness: type === "planet" ? 0.38 : 0.26,
    roughness: type === "planet" ? 0.62 : 0.58
  });
  const glow = new THREE.MeshStandardMaterial({
    color: accent.clone().lerp(new THREE.Color(0xffffff), 0.12),
    emissive: accent,
    emissiveIntensity: 3.5,
    metalness: 0.28,
    roughness: 0.2
  });
  const visor = new THREE.MeshStandardMaterial({
    color: type === "planet" ? 0x08030c : 0x050c14,
    emissive: accent,
    emissiveIntensity: type === "planet" ? 0.14 : 0.36,
    metalness: 0.88,
    roughness: 0.12
  });
  shell.userData.baseEmissive = shell.emissiveIntensity;
  glow.userData.baseEmissive = glow.emissiveIntensity;
  visor.userData.baseEmissive = visor.emissiveIntensity;
  return { shell, glow, visor };
}

function buildAstronaut(modelRoot, type, materials, hitboxes, parts, nodes, touchMode, accent) {
  const capSegments = touchMode ? 3 : 5;
  const radialSegments = touchMode ? 6 : 8;
  const sphereSegments = touchMode ? 10 : 14;
  const sphereRings = touchMode ? 7 : 9;
  const figure = new THREE.Group();
  figure.name = `${capitalize(type)}AstronautFigure`;
  const roleScale = ROLE_SCALE[type];
  figure.scale.set(...roleScale);
  modelRoot.add(figure);
  nodes.figure = figure;

  const torsoGeo = new THREE.CapsuleGeometry(0.34, 0.56, capSegments, radialSegments);
  const helmetGeo = new THREE.SphereGeometry(0.35, sphereSegments, sphereRings);
  const visorGeo = new THREE.SphereGeometry(0.29, sphereSegments, sphereRings);
  const armGeo = new THREE.CapsuleGeometry(0.105, 0.42, capSegments, radialSegments);
  const legGeo = new THREE.CapsuleGeometry(0.13, 0.5, capSegments, radialSegments);
  const gloveGeo = new THREE.SphereGeometry(0.135, radialSegments, Math.max(5, sphereRings - 2));
  const torso = addMesh(figure, torsoGeo, materials.shell, "Torso", [0, 1.28, 0], null, null, !touchMode);
  torso.scale.set(type === "brute" ? 1.12 : 1, type === "warden" ? 1.08 : 1, type === "rusher" ? 0.82 : 0.92);
  nodes.torso = torso;
  hitboxes.push({ mesh: torso, headshot: false });

  addMesh(figure, new THREE.BoxGeometry(0.52, 0.25, 0.38), materials.visor, "Pelvis", [0, 0.73, 0], null, null, !touchMode);
  const helmet = addMesh(figure, helmetGeo, materials.shell, "Helmet", [0, 1.98, 0], null, null, !touchMode);
  const visor = addMesh(
    figure,
    visorGeo,
    materials.visor,
    "Visor",
    [0, 1.96, 0.285],
    null,
    [0.9, 0.68, 0.32]
  );
  if (!touchMode) {
    const visorRim = addMesh(
      figure,
      new THREE.TorusGeometry(0.275, 0.025, 7, 18),
      materials.glow,
      "VisorRim",
      [0, 1.96, 0.307],
      null,
      [1, 0.76, 1]
    );
    visorRim.renderOrder = 2;
  }
  hitboxes.push({ mesh: helmet, headshot: true }, { mesh: visor, headshot: true });

  const backpack = addMesh(
    figure,
    new THREE.BoxGeometry(type === "brute" ? 0.72 : 0.58, type === "warden" ? 1 : 0.82, 0.32),
    materials.visor,
    "LifeSupportBackpack",
    [0, type === "warden" ? 1.38 : 1.34, -0.32],
    null,
    null,
    !touchMode
  );
  nodes.backpack = backpack;

  if (!touchMode) {
    const tankGeo = new THREE.CylinderGeometry(0.105, 0.105, type === "warden" ? 0.78 : 0.62, radialSegments);
    for (const side of [-1, 1]) {
      addMesh(
        figure,
        tankGeo,
        materials.shell,
        side < 0 ? "LeftOxygenTank" : "RightOxygenTank",
        [side * (type === "brute" ? 0.27 : 0.2), type === "warden" ? 1.48 : 1.38, -0.51]
      );
    }
  }

  const leftArm = makeLimbPivot(figure, "LeftArm", [-0.47, 1.49, 0], armGeo, gloveGeo, materials, -1, touchMode);
  const rightArm = makeLimbPivot(figure, "RightArm", [0.47, 1.49, 0], armGeo, gloveGeo, materials, 1, touchMode);
  const leftLeg = makeLegPivot(figure, "LeftLeg", [-0.22, 0.67, 0], legGeo, materials, -1, touchMode);
  const rightLeg = makeLegPivot(figure, "RightLeg", [0.22, 0.67, 0], legGeo, materials, 1, touchMode);
  Object.assign(nodes, { leftArm, rightArm, leftLeg, rightLeg });

  if (type === "rusher") {
    const bladeRoot = new THREE.Group();
    bladeRoot.name = "RusherBladeRig";
    const bladeGeo = new THREE.ConeGeometry(0.09, 0.78, touchMode ? 4 : 6);
    const leftBlade = addMesh(bladeRoot, bladeGeo, materials.glow, "LeftForearmBlade", [-0.64, 1.02, 0.1], [0, 0, -0.28]);
    const rightBlade = addMesh(bladeRoot, bladeGeo, materials.glow, "RightForearmBlade", [0.64, 1.02, 0.1], [0, 0, 0.28]);
    leftBlade.scale.y = rightBlade.scale.y = 1.08;
    figure.add(bladeRoot);
    nodes.bladeRoot = bladeRoot;
    if (!touchMode) {
      const finGeo = new THREE.BoxGeometry(0.09, 0.74, 0.32);
      addMesh(figure, finGeo, materials.glow, "LeftThrusterFin", [-0.35, 1.42, -0.43], [0, 0, -0.25]);
      addMesh(figure, finGeo, materials.glow, "RightThrusterFin", [0.35, 1.42, -0.43], [0, 0, 0.25]);
    }
    parts.push("forearm-blades");
    if (!touchMode) parts.push("thruster-fins");
  } else if (type === "shooter") {
    leftArm.rotation.x = -0.72;
    rightArm.rotation.x = -0.58;
    const roleRing = addMesh(
      figure,
      new THREE.TorusGeometry(0.69, 0.035, touchMode ? 5 : 7, touchMode ? 18 : 28),
      materials.glow,
      "ZeroGRig",
      [0, 1.38, -0.38]
    );
    nodes.roleRing = roleRing;
    addMesh(
      figure,
      new THREE.BoxGeometry(0.18, 0.18, 0.9),
      materials.visor,
      "ShoulderCannon",
      [0.54, 1.58, 0.33],
      [0, 0, -0.04]
    );
    const cannonGlow = addMesh(
      figure,
      new THREE.CylinderGeometry(0.075, 0.1, 0.08, radialSegments),
      materials.glow,
      "CannonMuzzle",
      [0.54, 1.58, 0.79],
      [Math.PI / 2, 0, 0]
    );
    nodes.cannonGlow = cannonGlow;
    parts.push("shoulder-cannon", "zero-g-ring");
  } else if (type === "brute") {
    const shoulderGeo = new THREE.BoxGeometry(0.56, 0.42, 0.54);
    for (const side of [-1, 1]) {
      const shoulder = addMesh(
        figure,
        shoulderGeo,
        materials.shell,
        side < 0 ? "LeftExcavatorShoulder" : "RightExcavatorShoulder",
        [side * 0.62, 1.57, 0],
        [0, 0, side * -0.08],
        null,
        !touchMode
      );
      hitboxes.push({ mesh: shoulder, headshot: false });
      if (!touchMode) {
        addMesh(
          figure,
          new THREE.BoxGeometry(0.29, 0.36, 0.38),
          materials.glow,
          side < 0 ? "LeftPowerGauntlet" : "RightPowerGauntlet",
          [side * 0.5, 0.95, 0.05]
        );
      }
    }
    parts.push("excavator-shoulders");
    if (!touchMode) parts.push("power-gauntlets");
  } else if (type === "warden") {
    const roleRing = addMesh(
      figure,
      new THREE.TorusGeometry(0.98, 0.055, touchMode ? 6 : 8, touchMode ? 22 : 34),
      materials.glow,
      "CommanderHalo",
      [0, 1.45, -0.42],
      [0.12, 0, 0]
    );
    nodes.roleRing = roleRing;
    const crown = new THREE.Group();
    crown.name = "CommanderCrown";
    const spikeGeo = new THREE.ConeGeometry(0.065, 0.42, touchMode ? 4 : 6);
    const crownExtent = touchMode ? 1 : 2;
    for (let i = -crownExtent; i <= crownExtent; i += 1) {
      addMesh(crown, spikeGeo, materials.glow, `CrownSpike${i + crownExtent + 1}`, [i * 0.12, 2.37 - Math.abs(i) * 0.035, -0.03]);
    }
    figure.add(crown);
    nodes.crown = crown;
    if (!touchMode) {
      const towerGeo = new THREE.BoxGeometry(0.16, 1.05, 0.24);
      addMesh(figure, towerGeo, materials.glow, "LeftCommandTower", [-0.38, 1.56, -0.48], [0, 0, -0.1]);
      addMesh(figure, towerGeo, materials.glow, "RightCommandTower", [0.38, 1.56, -0.48], [0, 0, 0.1]);
    }
    parts.push("commander-halo", "crown");
    if (!touchMode) parts.push("command-towers");
  }

  parts.unshift("helmet", "visor", "backpack", "torso", "arms", "legs");
  if (!touchMode) parts.splice(6, 0, "boots", "oxygen-tanks");
  figure.userData.accent = accent.getHex();
}

function buildLivingPlanet(modelRoot, materials, hitboxes, parts, nodes, extras, touchMode, accent) {
  const segments = touchMode ? 12 : 18;
  const rings = touchMode ? 8 : 12;
  const figure = new THREE.Group();
  figure.name = "LivingPlanetFigure";
  modelRoot.add(figure);
  nodes.planetFigure = figure;

  const body = addMesh(
    figure,
    new THREE.SphereGeometry(0.92, segments, rings),
    materials.shell,
    "LivingPlanetBody",
    [0, 0, 0],
    [0, 0.18, 0],
    [1, 0.94, 1],
    false
  );
  hitboxes.push({ mesh: body, headshot: false });

  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    fog: false,
    toneMapped: false
  });
  extras.push(atmosphereMaterial);
  const atmosphere = addMesh(
    figure,
    new THREE.SphereGeometry(1.05, segments, rings),
    atmosphereMaterial,
    "LivingPlanetAtmosphere"
  );
  atmosphere.renderOrder = 3;
  nodes.atmosphere = atmosphere;

  const socketGeo = new THREE.SphereGeometry(0.17, touchMode ? 8 : 10, touchMode ? 5 : 7);
  const eyeGeo = new THREE.SphereGeometry(0.078, touchMode ? 7 : 9, touchMode ? 5 : 7);
  for (const side of [-1, 1]) {
    addMesh(
      figure,
      socketGeo,
      materials.visor,
      side < 0 ? "LeftCraterSocket" : "RightCraterSocket",
      [side * 0.26, 0.16, 0.835],
      null,
      [1, 0.86, 0.32]
    );
    const eye = addMesh(
      figure,
      eyeGeo,
      materials.glow,
      side < 0 ? "LeftCraterEye" : "RightCraterEye",
      [side * 0.26, 0.16, 0.89],
      null,
      [1, 0.82, 0.55]
    );
    hitboxes.push({ mesh: eye, headshot: true });
  }

  const mouth = addMesh(
    figure,
    new THREE.SphereGeometry(0.3, touchMode ? 9 : 12, touchMode ? 6 : 8),
    materials.visor,
    "PlanetMaw",
    [0, -0.24, 0.84],
    null,
    [1, 0.34, 0.2]
  );
  nodes.mouth = mouth;
  const toothGeo = new THREE.ConeGeometry(0.045, 0.16, touchMode ? 4 : 5);
  const toothCount = touchMode ? 3 : 5;
  for (let i = 0; i < toothCount; i += 1) {
    const u = toothCount === 1 ? 0 : i / (toothCount - 1) - 0.5;
    addMesh(
      figure,
      toothGeo,
      materials.shell,
      `MawTooth${i + 1}`,
      [u * 0.4, -0.2 + Math.abs(u) * 0.025, 0.93],
      [0, 0, Math.PI]
    );
  }

  const ringRoot = new THREE.Group();
  ringRoot.name = "LivingPlanetRingSystem";
  figure.add(ringRoot);
  const primaryRing = addMesh(
    ringRoot,
    new THREE.TorusGeometry(1.28, 0.055, touchMode ? 5 : 7, touchMode ? 22 : 34),
    materials.glow,
    "PrimaryPlanetRing",
    [0, 0, 0],
    [1.05, 0.12, 0.24]
  );
  primaryRing.renderOrder = 2;
  const secondaryRing = addMesh(
    ringRoot,
    new THREE.TorusGeometry(1.08, 0.025, touchMode ? 4 : 6, touchMode ? 18 : 28),
    atmosphereMaterial,
    "SecondaryPlanetRing",
    [0, 0, 0],
    [0.42, 0.55, -0.38]
  );
  secondaryRing.renderOrder = 2;
  nodes.ringRoot = ringRoot;

  const orbitRoot = new THREE.Group();
  orbitRoot.name = "LivingPlanetMoonlets";
  orbitRoot.rotation.z = 0.36;
  figure.add(orbitRoot);
  const moonGeo = new THREE.IcosahedronGeometry(0.17, touchMode ? 0 : 1);
  const leftMoon = addMesh(orbitRoot, moonGeo, materials.shell, "LeftMoonlet", [-1.56, 0.08, 0], [0.2, 0, 0.1]);
  const rightMoon = addMesh(orbitRoot, moonGeo, materials.glow, "RightMoonlet", [1.56, -0.08, 0], [-0.2, 0, -0.1], [0.72, 0.72, 0.72]);
  nodes.orbitRoot = orbitRoot;
  nodes.leftMoon = leftMoon;
  nodes.rightMoon = rightMoon;

  parts.push("planet-body", "atmosphere", "crater-eyes", "face", "maw", "rings", "moonlets");
}

function makeLimbPivot(parent, name, position, limbGeometry, gloveGeometry, materials, side, touchMode) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(...position);
  const arm = addMesh(pivot, limbGeometry, materials.shell, `${name}Suit`, [0, -0.3, 0], null, null, !touchMode);
  arm.rotation.z = side * 0.025;
  if (!touchMode) addMesh(pivot, gloveGeometry, materials.visor, `${name}Glove`, [0, -0.64, 0.03], null, [1.08, 1, 1]);
  parent.add(pivot);
  return pivot;
}

function makeLegPivot(parent, name, position, legGeometry, materials, side, touchMode) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(...position);
  const leg = addMesh(pivot, legGeometry, materials.shell, `${name}Suit`, [0, -0.37, 0], null, null, !touchMode);
  leg.rotation.z = side * 0.018;
  if (!touchMode) {
    addMesh(
      pivot,
      new THREE.BoxGeometry(0.24, 0.24, 0.39),
      materials.visor,
      `${name}Boot`,
      [0, -0.77, 0.085],
      [-0.08, 0, 0]
    );
  }
  parent.add(pivot);
  return pivot;
}

function addMesh(parent, geometry, material, name, position, rotation, scale, castShadow = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  mesh.userData.cosmicPart = name;
  parent.add(mesh);
  return mesh;
}

function setPivotX(node, value) {
  if (node) node.rotation.x = value;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
