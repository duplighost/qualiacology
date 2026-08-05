// The central RELAY observatory: a grounded lower combat arena, a continuous
// spiral ascent, and an open-aperture moon deck high above the battlefield.
//
// Collision philosophy:
//   - floors are resolved analytically through groundAt(x, z, y), preserving
//     Duskfall's layer-aware movement and avoiding expensive floor raycasts;
//   - returned cylinder colliders correspond one-for-one with visible columns,
//     pylons, or telescope pedestals;
//   - the upper deck's central opening is a real hole in both geometry and the
//     analytic surface.  There is no hidden boundary or invisible safety wall.
//
// The module is self-contained and does not import terrain/world state.  Pass
// the existing world ground function through options.groundAt to receive a
// composed resolver suitable for direct assignment to Controller.groundFn.

import * as THREE from 'three';

export const OBSERVATORY_FLOOR_URL = new URL(
  '../../assets/art/observatory-floor-v1.png',
  import.meta.url,
).href;

export const RELAY_STRUCTURE_DEFAULTS = Object.freeze({
  footprintRadius: 28,
  lowerFloorY: 0.28,
  deckY: 34,
  deckOuterRadius: 19.5,
  deckOpeningRadius: 5.15,
  rampInnerRadius: 6.55,
  rampOuterRadius: 10.35,
  rampTurns: 3.25,
  rampStartAngle: -Math.PI * 0.5,
  stepGrace: 1.7,
});

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smooth(current, target, speed, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
}

function asCenter(value) {
  if (value && value.isVector3) return value.clone();
  if (value && Number.isFinite(value.x) && Number.isFinite(value.z)) {
    return new THREE.Vector3(value.x, Number.isFinite(value.y) ? value.y : 0, value.z);
  }
  return new THREE.Vector3();
}

function setShadowFlags(object, cast = true, receive = true) {
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

function makeHelixGeometry(config, segments = 144, thickness = 0.3) {
  const vertexCount = (segments + 1) * 4;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];
  const totalAngle = config.rampTurns * TAU;

  function writeVertex(index, radius, y, theta, u, v) {
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
  }

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = config.rampStartAngle + totalAngle * t;
    const y = THREE.MathUtils.lerp(config.lowerFloorY + 0.03, config.deckY + 0.035, t);
    const offset = i * 4;
    const along = t * config.rampTurns * 1.55;
    writeVertex(offset, config.rampInnerRadius, y, theta, along, 0);
    writeVertex(offset + 1, config.rampOuterRadius, y, theta, along, 1);
    writeVertex(offset + 2, config.rampInnerRadius, y - thickness, theta, along, 0);
    writeVertex(offset + 3, config.rampOuterRadius, y - thickness, theta, along, 1);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    // top / underside
    indices.push(a, b, a + 1, b, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
    // inner / outer vertical fascia
    indices.push(a, a + 2, b, b, a + 2, b + 2);
    indices.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3);
  }
  const last = segments * 4;
  indices.push(0, 1, 2, 1, 3, 2);
  indices.push(last, last + 2, last + 1, last + 1, last + 2, last + 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBeamBetween(start, end, radius, material, radialSegments = 6) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1),
    material,
  );
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

function makeDish(material, trimMaterial) {
  const yaw = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.position.y = 3.75;
  yaw.add(tilt);

  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 28, 12, 0, TAU, 0, Math.PI * 0.31),
    material,
  );
  bowl.rotation.x = Math.PI * 0.5;
  bowl.scale.z = 0.46;
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  tilt.add(bowl);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.46, 0.105, 6, 36), trimMaterial);
  rim.position.z = 0.84;
  rim.castShadow = true;
  tilt.add(rim);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.1, 6), trimMaterial);
  boom.rotation.x = Math.PI * 0.5;
  boom.position.z = 1.55;
  tilt.add(boom);
  const receiver = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), trimMaterial);
  receiver.position.z = 2.55;
  tilt.add(receiver);

  return { yaw, tilt, bowl, rim, boom, receiver };
}

/**
 * Construct the relay and its analytic traversal/collision contract.
 *
 * options:
 *   center: Vector3 | {x,y,z}; baseY: explicit world-space base elevation
 *   groundAt(x,z,y): pre-existing terrain/cave resolver to compose beneath relay
 *   textureLoader, floorUrl, anisotropy, power, threat
 */
export function buildRelayStructure(scene, options = {}) {
  const defaults = RELAY_STRUCTURE_DEFAULTS;
  const center = asCenter(options.center);
  const baseGroundAt = typeof options.groundAt === 'function' ? options.groundAt : null;
  const sampledBase = baseGroundAt ? baseGroundAt(center.x, center.z, center.y + 100) : center.y;
  const baseY = Number.isFinite(options.baseY) ? options.baseY : (Number.isFinite(sampledBase) ? sampledBase : center.y);
  const config = {
    footprintRadius: options.footprintRadius ?? defaults.footprintRadius,
    lowerFloorY: options.lowerFloorY ?? defaults.lowerFloorY,
    deckY: options.deckY ?? defaults.deckY,
    deckOuterRadius: options.deckOuterRadius ?? defaults.deckOuterRadius,
    deckOpeningRadius: options.deckOpeningRadius ?? defaults.deckOpeningRadius,
    rampInnerRadius: options.rampInnerRadius ?? defaults.rampInnerRadius,
    rampOuterRadius: options.rampOuterRadius ?? defaults.rampOuterRadius,
    rampTurns: options.rampTurns ?? defaults.rampTurns,
    rampStartAngle: options.rampStartAngle ?? defaults.rampStartAngle,
    stepGrace: options.stepGrace ?? defaults.stepGrace,
  };
  const totalRampAngle = config.rampTurns * TAU;
  const averageRampRadius = (config.rampInnerRadius + config.rampOuterRadius) * 0.5;
  const rampRise = config.deckY - config.lowerFloorY;
  const rampLength = Math.hypot(averageRampRadius * totalRampAngle, rampRise);
  const rampGrade = Math.atan2(rampRise, averageRampRadius * totalRampAngle);

  const root = new THREE.Group();
  root.name = 'relay-observatory';
  root.position.set(center.x, baseY, center.z);
  scene.add(root);

  const solids = [];
  const bulletSolids = [];
  const colliders = [];
  const platforms = [];
  const localSupports = [];
  const disposableGeometries = new Set();
  const disposableMaterials = new Set();

  function register(object, { solid = true, bullet = solid, cast = true, receive = true } = {}) {
    setShadowFlags(object, cast, receive);
    root.add(object);
    if (solid) solids.push(object);
    if (bullet) bulletSolids.push(object);
    if (object.geometry) disposableGeometries.add(object.geometry);
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) disposableMaterials.add(material);
    }
    return object;
  }

  const textureLoader = options.textureLoader || new THREE.TextureLoader();
  const floorTexture = textureLoader.load(options.floorUrl || OBSERVATORY_FLOOR_URL, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.max(1, options.anisotropy || 8);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  });
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.anisotropy = Math.max(1, options.anisotropy || 8);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xb4bfd0,
    roughness: 0.42,
    metalness: 0.56,
    emissive: 0x08162b,
    emissiveIntensity: 0.23,
  });
  const deckMaterial = floorMaterial.clone();
  deckMaterial.color.setHex(0xa9b6cb);
  deckMaterial.roughness = 0.38;
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x243047,
    emissive: 0x07101d,
    emissiveIntensity: 0.22,
    roughness: 0.44,
    metalness: 0.72,
  });
  const panelMetal = new THREE.MeshStandardMaterial({
    color: 0x344764,
    emissive: 0x08152a,
    emissiveIntensity: 0.16,
    roughness: 0.36,
    metalness: 0.68,
  });
  const lunarMaterial = new THREE.MeshStandardMaterial({
    color: 0x666d7b,
    roughness: 0.91,
    metalness: 0.04,
    flatShading: true,
  });
  const cyanTrim = new THREE.MeshStandardMaterial({
    color: 0x193044,
    emissive: 0x35dfff,
    emissiveIntensity: 1.28,
    roughness: 0.24,
    metalness: 0.58,
  });
  const violetTrim = new THREE.MeshStandardMaterial({
    color: 0x25193f,
    emissive: 0x896dff,
    emissiveIntensity: 1.05,
    roughness: 0.25,
    metalness: 0.52,
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x74cfe8,
    emissive: 0x102e42,
    emissiveIntensity: 0.42,
    roughness: 0.12,
    metalness: 0.12,
    transmission: 0.22,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x68ddff,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  [floorMaterial, deckMaterial, darkMetal, panelMetal, lunarMaterial, cyanTrim, violetTrim, glassMaterial, beamMaterial]
    .forEach((material) => disposableMaterials.add(material));

  // Lower arena: the supplied observatory art is the actual PBR surface, not a
  // decorative billboard.  Its circular language lines up with the structure.
  const lowerFloor = register(new THREE.Mesh(
    new THREE.CircleGeometry(config.footprintRadius, 72),
    floorMaterial,
  ));
  lowerFloor.name = 'relay-lower-arena-floor';
  lowerFloor.rotation.x = -Math.PI * 0.5;
  lowerFloor.position.y = config.lowerFloorY;
  lowerFloor.castShadow = false;

  const lowerOuterTrim = register(new THREE.Mesh(
    new THREE.TorusGeometry(config.footprintRadius - 0.45, 0.22, 7, 72),
    cyanTrim,
  ), { solid: false, bullet: false, cast: false });
  lowerOuterTrim.name = 'relay-lower-arena-trim';
  lowerOuterTrim.rotation.x = Math.PI * 0.5;
  lowerOuterTrim.position.y = config.lowerFloorY + 0.13;

  // Lower-arena practicals: localized bounce for the playable floor and the
  // load-bearing silhouettes. The moon deck keeps its darker orbital contrast;
  // these short-range lights cannot wash out the sky or upper composition.
  const practicalLights = [];
  const fixtureGeometry = new THREE.OctahedronGeometry(0.22, 0);
  disposableGeometries.add(fixtureGeometry);
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
    const color = i % 2 ? 0xb08cff : 0x66dfff;
    const light = new THREE.PointLight(color, 82, 30, 2);
    light.name = `relay-lower-practical-${i + 1}`;
    light.position.set(Math.cos(angle) * 13.2, config.lowerFloorY + 5.4, Math.sin(angle) * 13.2);
    light.castShadow = false;
    root.add(light);
    practicalLights.push(light);

    const fixture = register(new THREE.Mesh(fixtureGeometry, i % 2 ? violetTrim : cyanTrim), {
      solid: false, bullet: false, cast: false, receive: false,
    });
    fixture.name = `relay-lower-practical-fixture-${i + 1}`;
    fixture.position.copy(light.position);
    fixture.scale.set(1.2, 2.1, 1.2);
  }

  // Continuous helical climb.  One indexed mesh is cheaper and smoother than a
  // staircase of dozens of overlapping boxes; the resolver below samples the
  // exact same mathematical helix.
  const rampGeometry = makeHelixGeometry(config, 144, 0.31);
  const ramp = register(new THREE.Mesh(rampGeometry, panelMetal));
  ramp.name = 'relay-continuous-spiral-ramp';

  const innerCurvePoints = [];
  const outerCurvePoints = [];
  for (let i = 0; i <= 96; i++) {
    const t = i / 96;
    const theta = config.rampStartAngle + totalRampAngle * t;
    const y = THREE.MathUtils.lerp(config.lowerFloorY + 0.18, config.deckY + 0.18, t);
    innerCurvePoints.push(new THREE.Vector3(
      Math.cos(theta) * (config.rampInnerRadius + 0.08), y, Math.sin(theta) * (config.rampInnerRadius + 0.08),
    ));
    outerCurvePoints.push(new THREE.Vector3(
      Math.cos(theta) * (config.rampOuterRadius - 0.08), y, Math.sin(theta) * (config.rampOuterRadius - 0.08),
    ));
  }
  const innerEdge = register(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerCurvePoints), 144, 0.075, 5, false),
    violetTrim,
  ), { solid: false, bullet: false, cast: false });
  innerEdge.name = 'relay-ramp-inner-guide';
  const outerEdge = register(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerCurvePoints), 144, 0.085, 5, false),
    cyanTrim,
  ), { solid: false, bullet: false, cast: false });
  outerEdge.name = 'relay-ramp-outer-guide';

  // Visible outer handrail: posts are instanced and the rail follows the ramp.
  // It is intentionally not an invisible radial clamp; traversal remains honest
  // to the geometry and skilled players can jump over or off it.
  const railPostCount = 45;
  const railPosts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.065, 0.075, 1.02, 5),
    darkMetal,
    railPostCount,
  );
  railPosts.name = 'relay-ramp-rail-posts';
  const instanceMatrix = new THREE.Matrix4();
  for (let i = 0; i < railPostCount; i++) {
    const t = i / (railPostCount - 1);
    const theta = config.rampStartAngle + totalRampAngle * t;
    const y = THREE.MathUtils.lerp(config.lowerFloorY, config.deckY, t);
    instanceMatrix.makeTranslation(
      Math.cos(theta) * (config.rampOuterRadius - 0.08),
      y + 0.63,
      Math.sin(theta) * (config.rampOuterRadius - 0.08),
    );
    railPosts.setMatrixAt(i, instanceMatrix);
  }
  railPosts.instanceMatrix.needsUpdate = true;
  register(railPosts, { solid: false, bullet: false, cast: true });

  const handrailPoints = outerCurvePoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.98, 0)));
  const handrail = register(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(handrailPoints), 144, 0.07, 5, false),
    darkMetal,
  ), { solid: false, bullet: false, cast: true });
  handrail.name = 'relay-ramp-visible-handrail';

  // Three physically overlapping rest/battle pads turn the climb into readable
  // encounter tiers.  Their returned platform descriptors match their visible
  // circular tops exactly.
  const landingSpecs = [];
  for (let index = 0; index < 3; index++) {
    const t = (index + 1) / 4;
    const theta = config.rampStartAngle + totalRampAngle * t;
    const y = THREE.MathUtils.lerp(config.lowerFloorY, config.deckY, t);
    const radius = 2.65;
    const radial = config.rampOuterRadius + 1.55;
    const x = Math.cos(theta) * radial;
    const z = Math.sin(theta) * radial;
    const landing = register(new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.95, 0.38, 28),
      deckMaterial,
    ));
    landing.name = `relay-tier-landing-${index + 1}`;
    landing.position.set(x, y - 0.19, z);
    const trim = register(new THREE.Mesh(
      new THREE.TorusGeometry(radius - 0.1, 0.1, 5, 28),
      index % 2 ? violetTrim : cyanTrim,
    ), { solid: false, bullet: false, cast: false });
    trim.rotation.x = Math.PI * 0.5;
    trim.position.set(x, y + 0.04, z);
    const platform = { x: center.x + x, z: center.z + z, y: baseY + y, r: radius, kind: 'relay-landing', tier: index + 1 };
    platforms.push(platform);
    landingSpecs.push({ x, z, y, r: radius, tier: index + 1, object: landing });
  }

  // Moon deck.  RingGeometry means the central aperture is genuinely absent
  // from the vertex/index buffers; isDeckOpening() and groundAt() mirror it.
  const moonDeck = register(new THREE.Mesh(
    new THREE.RingGeometry(config.deckOpeningRadius, config.deckOuterRadius, 80, 4),
    deckMaterial,
  ));
  moonDeck.name = 'relay-moon-surface-deck';
  moonDeck.rotation.x = -Math.PI * 0.5;
  moonDeck.position.y = config.deckY;
  moonDeck.castShadow = false;

  const openingTrim = register(new THREE.Mesh(
    new THREE.TorusGeometry(config.deckOpeningRadius + 0.12, 0.17, 7, 64),
    violetTrim,
  ), { solid: false, bullet: false, cast: false });
  openingTrim.name = 'relay-real-deck-opening-trim';
  openingTrim.rotation.x = Math.PI * 0.5;
  openingTrim.position.y = config.deckY + 0.11;

  const deckOuterTrim = register(new THREE.Mesh(
    new THREE.TorusGeometry(config.deckOuterRadius - 0.24, 0.2, 7, 72),
    cyanTrim,
  ), { solid: false, bullet: false, cast: false });
  deckOuterTrim.rotation.x = Math.PI * 0.5;
  deckOuterTrim.position.y = config.deckY + 0.1;

  // Low lunar armour/regolith blocks around the deck's outside edge.  They are
  // set below foot height so the combat surface stays clear and readable.
  const lunarBlockCount = 30;
  const lunarBlocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.9, 0),
    lunarMaterial,
    lunarBlockCount,
  );
  lunarBlocks.name = 'relay-lunar-deck-armour';
  const scaleMatrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let i = 0; i < lunarBlockCount; i++) {
    const angle = (i / lunarBlockCount) * TAU + Math.sin(i * 4.91) * 0.045;
    position.set(
      Math.cos(angle) * (config.deckOuterRadius + 0.35),
      config.deckY - 0.33 + Math.sin(i * 2.7) * 0.08,
      Math.sin(angle) * (config.deckOuterRadius + 0.35),
    );
    rotation.setFromEuler(new THREE.Euler(i * 0.31, angle, i * 0.17));
    scale.set(1.3 + (i % 4) * 0.13, 0.44 + (i % 3) * 0.06, 0.9 + (i % 5) * 0.08);
    scaleMatrix.compose(position, rotation, scale);
    lunarBlocks.setMatrixAt(i, scaleMatrix);
  }
  lunarBlocks.instanceMatrix.needsUpdate = true;
  register(lunarBlocks, { solid: false, bullet: false, cast: true });

  // Twelve visible load-bearing columns support the upper ring.  They are one
  // instanced draw call, while movement uses matching world-space cylinders.
  const columnCount = 12;
  const columnHeight = config.deckY - 0.55;
  const columns = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.46, 0.68, columnHeight, 8),
    darkMetal,
    columnCount,
  );
  columns.name = 'relay-deck-support-columns';
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * TAU;
    const x = Math.cos(angle) * 17.05;
    const z = Math.sin(angle) * 17.05;
    instanceMatrix.makeTranslation(x, config.lowerFloorY + columnHeight * 0.5, z);
    columns.setMatrixAt(i, instanceMatrix);
    const support = {
      x: center.x + x,
      z: center.z + z,
      r: 0.66,
      yMin: baseY + config.lowerFloorY - 0.2,
      yMax: baseY + config.deckY + 0.15,
      kind: 'deck-column',
    };
    colliders.push(support);
    localSupports.push({ ...support, localX: x, localZ: z });
  }
  columns.instanceMatrix.needsUpdate = true;
  register(columns);

  // Cross-bracing uses a second instanced draw call.  The visible geometry is
  // detailed, but the thin braces are omitted from cylinder movement collision
  // to avoid broad phantom blockers around their diagonals.
  const bracePairs = [];
  for (let i = 0; i < columnCount; i++) {
    const a0 = (i / columnCount) * TAU;
    const a1 = ((i + 1) / columnCount) * TAU;
    bracePairs.push([
      new THREE.Vector3(Math.cos(a0) * 17.05, config.lowerFloorY + 1.3, Math.sin(a0) * 17.05),
      new THREE.Vector3(Math.cos(a1) * 17.05, config.deckY - 1.1, Math.sin(a1) * 17.05),
    ]);
    bracePairs.push([
      new THREE.Vector3(Math.cos(a0) * 17.05, config.deckY - 1.1, Math.sin(a0) * 17.05),
      new THREE.Vector3(Math.cos(a1) * 17.05, config.lowerFloorY + 1.3, Math.sin(a1) * 17.05),
    ]);
  }
  const braces = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.34), panelMetal, bracePairs.length);
  braces.name = 'relay-cross-braces';
  const beamMatrix = new THREE.Matrix4();
  const beamRotation = new THREE.Quaternion();
  const beamScale = new THREE.Vector3();
  for (let i = 0; i < bracePairs.length; i++) {
    const [start, end] = bracePairs[i];
    const direction = end.clone().sub(start);
    const midpoint = start.clone().addScaledVector(direction, 0.5);
    const length = direction.length();
    beamRotation.setFromUnitVectors(UP, direction.normalize());
    beamScale.set(1, length, 1);
    beamMatrix.compose(midpoint, beamRotation, beamScale);
    braces.setMatrixAt(i, beamMatrix);
  }
  braces.instanceMatrix.needsUpdate = true;
  register(braces, { solid: false, bullet: false, cast: true });

  // Six inner relay pylons describe the vertical shaft without filling it.  The
  // spaces between them remain open all the way through the deck aperture.
  const pylonCount = 6;
  const pylonRadius = config.deckOpeningRadius + 0.78;
  const pylonHeight = config.deckY + 12.5;
  const pylons = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.32, 0.48, pylonHeight, 7),
    panelMetal,
    pylonCount,
  );
  pylons.name = 'relay-open-shaft-pylons';
  for (let i = 0; i < pylonCount; i++) {
    const angle = (i / pylonCount) * TAU + Math.PI / 6;
    const x = Math.cos(angle) * pylonRadius;
    const z = Math.sin(angle) * pylonRadius;
    instanceMatrix.makeTranslation(x, config.lowerFloorY + pylonHeight * 0.5, z);
    pylons.setMatrixAt(i, instanceMatrix);
    const support = {
      x: center.x + x,
      z: center.z + z,
      r: 0.45,
      yMin: baseY + config.lowerFloorY - 0.15,
      yMax: baseY + config.lowerFloorY + pylonHeight + 0.15,
      kind: 'relay-pylon',
    };
    colliders.push(support);
    localSupports.push({ ...support, localX: x, localZ: z });
  }
  pylons.instanceMatrix.needsUpdate = true;
  register(pylons);

  for (const level of [config.deckY * 0.34, config.deckY * 0.68, config.deckY + 10.8]) {
    const ring = register(new THREE.Mesh(
      new THREE.TorusGeometry(pylonRadius, 0.18, 6, 48),
      level > config.deckY ? violetTrim : darkMetal,
    ), { solid: false, bullet: false, cast: true });
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = level;
  }

  // A translucent energy column marks the open shaft without creating a solid.
  const energyBeam = register(new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 1.28, config.deckY + 29, 16, 1, true),
    beamMaterial,
  ), { solid: false, bullet: false, cast: false, receive: false });
  energyBeam.name = 'relay-energy-column';
  energyBeam.position.y = (config.deckY + 29) * 0.5;
  energyBeam.renderOrder = 5;

  // Twin tracking dishes on the upper deck.  Their bases are visible collider
  // cylinders; the articulated bowls animate gently in update().
  const dishes = [];
  for (const [index, spec] of [[0, { x: -13.1, z: -4.1 }], [1, { x: 12.4, z: 5.2 }]]) {
    const base = register(new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.55, 2.7, 12),
      darkMetal,
    ));
    base.name = `relay-dish-base-${index + 1}`;
    base.position.set(spec.x, config.deckY + 1.35, spec.z);
    const support = {
      x: center.x + spec.x,
      z: center.z + spec.z,
      r: 1.48,
      yMin: baseY + config.deckY - 0.2,
      yMax: baseY + config.deckY + 5.1,
      kind: 'dish-base',
    };
    colliders.push(support);
    localSupports.push({ ...support, localX: spec.x, localZ: spec.z });

    const dish = makeDish(glassMaterial, index ? violetTrim : cyanTrim);
    dish.yaw.name = `relay-tracking-dish-${index + 1}`;
    dish.yaw.position.set(spec.x, config.deckY + 2.45, spec.z);
    root.add(dish.yaw);
    dishes.push(dish);
    dish.yaw.traverse((object) => {
      if (object.geometry) disposableGeometries.add(object.geometry);
    });
  }

  // Four massive exterior buttresses visually tie the lower arena to the deck.
  // Matching movement colliders use the beams' midpoints and conservative radii
  // only where players can actually reach them near ground level.
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5 + Math.PI * 0.25;
    const start = new THREE.Vector3(Math.cos(angle) * 25.2, config.lowerFloorY + 0.45, Math.sin(angle) * 25.2);
    const end = new THREE.Vector3(Math.cos(angle) * 18.2, config.deckY - 0.65, Math.sin(angle) * 18.2);
    const buttress = register(makeBeamBetween(start, end, 0.72, darkMetal, 8));
    buttress.name = `relay-exterior-buttress-${i + 1}`;
    const support = {
      x: center.x + start.x,
      z: center.z + start.z,
      r: 0.86,
      yMin: baseY + config.lowerFloorY - 0.2,
      yMax: baseY + config.lowerFloorY + 4.3,
      kind: 'buttress-foot',
    };
    colliders.push(support);
    localSupports.push({ ...support, localX: start.x, localZ: start.z });
  }

  const lowerRingSpawns = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TAU + Math.PI / 12;
    lowerRingSpawns.push({
      x: center.x + Math.cos(angle) * 22.2,
      y: baseY + config.lowerFloorY,
      z: center.z + Math.sin(angle) * 22.2,
      heading: angle + Math.PI,
      tier: 0,
      kind: 'lower-arena',
      clearance: 3.2,
    });
  }
  const landingSpawns = landingSpecs.map((landing) => ({
    x: center.x + landing.x,
    y: baseY + landing.y,
    z: center.z + landing.z,
    heading: Math.atan2(-landing.z, -landing.x),
    tier: landing.tier,
    kind: 'ramp-landing',
    clearance: landing.r * 0.72,
  }));
  const deckSpawns = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU + Math.PI / 8;
    deckSpawns.push({
      x: center.x + Math.cos(angle) * 15.4,
      y: baseY + config.deckY,
      z: center.z + Math.sin(angle) * 15.4,
      heading: angle + Math.PI,
      tier: 4,
      kind: 'moon-deck',
      clearance: 2.6,
    });
  }
  const spawnPoints = Object.freeze([...lowerRingSpawns, ...landingSpawns, ...deckSpawns]);
  const playerStart = Object.freeze({
    x: center.x,
    y: baseY + config.lowerFloorY,
    z: center.z + 17.5,
    heading: Math.PI,
    tier: 0,
    kind: 'player-start',
    clearance: 4,
  });

  function localCoordinates(x, z) {
    return { x: x - center.x, z: z - center.z };
  }

  function landingSurfaceAt(localX, localZ, queryY) {
    let best = -Infinity;
    let bestLanding = null;
    for (const landing of landingSpecs) {
      const dx = localX - landing.x;
      const dz = localZ - landing.z;
      if (dx * dx + dz * dz > landing.r * landing.r) continue;
      const worldY = baseY + landing.y;
      if (worldY <= queryY + config.stepGrace && worldY > best) {
        best = worldY;
        bestLanding = landing;
      }
    }
    return bestLanding ? { y: best, landing: bestLanding } : null;
  }

  function rampSurfaceAt(localX, localZ, queryY) {
    const radius = Math.hypot(localX, localZ);
    if (radius < config.rampInnerRadius - 0.12 || radius > config.rampOuterRadius + 0.12) return null;
    const angle = Math.atan2(localZ, localX);
    let relative = angle - config.rampStartAngle;
    relative = ((relative % TAU) + TAU) % TAU;
    let bestY = -Infinity;
    let bestT = 0;
    const maxTurn = Math.ceil(config.rampTurns);
    for (let turn = 0; turn <= maxTurn; turn++) {
      const theta = relative + turn * TAU;
      if (theta < -1e-5 || theta > totalRampAngle + 1e-5) continue;
      const t = clamp01(theta / totalRampAngle);
      const worldY = baseY + THREE.MathUtils.lerp(config.lowerFloorY + 0.03, config.deckY + 0.035, t);
      if (worldY <= queryY + config.stepGrace && worldY > bestY) {
        bestY = worldY;
        bestT = t;
      }
    }
    return bestY > -Infinity ? { y: bestY, t: bestT, radius } : null;
  }

  // Allocation-free mirror of the detailed surface probes below.  Player,
  // enemy, and projectile ground checks can call this hundreds of times per
  // frame, so the composed groundAt hot path only deals in numbers.
  function relayHeightAt(x, z, y) {
    const localX = x - center.x;
    const localZ = z - center.z;
    const radius = Math.hypot(localX, localZ);
    let best = -Infinity;

    const lowerY = baseY + config.lowerFloorY;
    if (radius <= config.footprintRadius && lowerY <= y + config.stepGrace) best = lowerY;

    for (const landing of landingSpecs) {
      const dx = localX - landing.x;
      const dz = localZ - landing.z;
      const landingY = baseY + landing.y;
      if (
        dx * dx + dz * dz <= landing.r * landing.r &&
        landingY <= y + config.stepGrace &&
        landingY > best
      ) best = landingY;
    }

    if (radius >= config.rampInnerRadius - 0.12 && radius <= config.rampOuterRadius + 0.12) {
      const angle = Math.atan2(localZ, localX);
      let relative = ((angle - config.rampStartAngle) % TAU + TAU) % TAU;
      const maxTurn = Math.ceil(config.rampTurns);
      for (let turn = 0; turn <= maxTurn; turn++) {
        const theta = relative + turn * TAU;
        if (theta < -1e-5 || theta > totalRampAngle + 1e-5) continue;
        const t = clamp01(theta / totalRampAngle);
        const rampY = baseY + THREE.MathUtils.lerp(config.lowerFloorY + 0.03, config.deckY + 0.035, t);
        if (rampY <= y + config.stepGrace && rampY > best) best = rampY;
      }
    }

    const deckY = baseY + config.deckY;
    if (
      radius >= config.deckOpeningRadius &&
      radius <= config.deckOuterRadius &&
      deckY <= y + config.stepGrace &&
      deckY > best
    ) best = deckY;
    return best;
  }

  function relaySurfaceAt(x, z, y = Infinity) {
    const local = localCoordinates(x, z);
    const radius = Math.hypot(local.x, local.z);
    let best = null;
    const lowerY = baseY + config.lowerFloorY;
    if (radius <= config.footprintRadius && lowerY <= y + config.stepGrace) {
      best = { y: lowerY, kind: 'lower-arena', tier: 0, slope: 0 };
    }
    const landing = landingSurfaceAt(local.x, local.z, y);
    if (landing && (!best || landing.y > best.y)) {
      best = { y: landing.y, kind: 'ramp-landing', tier: landing.landing.tier, slope: 0 };
    }
    const rampSample = rampSurfaceAt(local.x, local.z, y);
    if (rampSample && (!best || rampSample.y > best.y)) {
      best = { y: rampSample.y, kind: 'spiral-ramp', tier: 1 + Math.floor(rampSample.t * 3), slope: rampGrade };
    }
    const deckY = baseY + config.deckY;
    if (
      radius >= config.deckOpeningRadius &&
      radius <= config.deckOuterRadius &&
      deckY <= y + config.stepGrace &&
      (!best || deckY > best.y)
    ) {
      best = { y: deckY, kind: 'moon-deck', tier: 4, slope: 0 };
    }
    return best;
  }

  function groundAt(x, z, y = Infinity) {
    let ground = baseGroundAt ? baseGroundAt(x, z, y) : -Infinity;
    if (!Number.isFinite(ground)) ground = baseY - 1000;
    const relayHeight = relayHeightAt(x, z, y);
    if (relayHeight > ground) ground = relayHeight;
    return ground;
  }

  function surfaceAt(x, z, y = Infinity) {
    const surface = relaySurfaceAt(x, z, y);
    if (!surface) return null;
    // An allocated descriptor is appropriate for occasional gameplay probes;
    // the hot-path groundAt() above is allocation-free.
    return {
      ...surface,
      material: surface.kind === 'moon-deck' ? 'observatory-alloy' : 'relay-alloy',
      structure: 'relay-observatory',
    };
  }

  function supportAt(x, z, y, margin = 0) {
    for (const support of localSupports) {
      if (y < support.yMin - margin || y > support.yMax + margin) continue;
      const dx = x - support.x;
      const dz = z - support.z;
      const radius = support.r + margin;
      if (dx * dx + dz * dz <= radius * radius) return support;
    }
    return null;
  }

  function isDeckOpening(x, z) {
    const local = localCoordinates(x, z);
    return Math.hypot(local.x, local.z) < config.deckOpeningRadius;
  }

  function navigationAt(x, z, y = Infinity) {
    const surface = relaySurfaceAt(x, z, y);
    if (!surface) return { walkable: false, y: groundAt(x, z, y), kind: 'outside-relay', tier: -1, slope: 0 };
    return {
      walkable: true,
      y: surface.y,
      kind: surface.kind,
      tier: surface.tier,
      slope: surface.slope,
      deckOpening: isDeckOpening(x, z) && y >= baseY + config.deckY - config.stepGrace,
    };
  }

  let elapsed = 0;
  let targetPower = clamp01(options.power ?? 1);
  let currentPower = targetPower;
  let targetThreat = clamp01(options.threat ?? 0);
  let currentThreat = targetThreat;

  function setPower(value) {
    targetPower = clamp01(value);
  }

  function setThreat(value) {
    targetThreat = clamp01(value);
  }

  function update(dt, state = null) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    elapsed += dt;
    if (state && Number.isFinite(state.power)) setPower(state.power);
    if (state && Number.isFinite(state.threat)) setThreat(state.threat);
    currentPower = smooth(currentPower, targetPower, 3.2, dt);
    currentThreat = smooth(currentThreat, targetThreat, 2.4, dt);

    dishes[0].yaw.rotation.y = 0.42 + Math.sin(elapsed * 0.075) * 0.48;
    dishes[0].tilt.rotation.x = -0.31 + Math.sin(elapsed * 0.051) * 0.11;
    dishes[1].yaw.rotation.y = -1.25 - Math.sin(elapsed * 0.061 + 1.7) * 0.58;
    dishes[1].tilt.rotation.x = -0.22 + Math.sin(elapsed * 0.043 + 0.8) * 0.13;

    const pulse = 0.5 + 0.5 * Math.sin(elapsed * (1.35 + currentThreat * 0.55));
    cyanTrim.emissiveIntensity = (1.02 + pulse * 0.27) * currentPower;
    violetTrim.emissiveIntensity = (0.84 + pulse * 0.24 + currentThreat * 0.2) * currentPower;
    floorMaterial.emissiveIntensity = 0.17 + currentPower * 0.14;
    deckMaterial.emissiveIntensity = 0.17 + currentPower * 0.15;
    beamMaterial.opacity = currentPower * (0.055 + pulse * 0.038 + currentThreat * 0.018);
    energyBeam.scale.x = energyBeam.scale.z = 0.94 + pulse * 0.08;
    energyBeam.rotation.y += dt * (0.035 + currentThreat * 0.025);
  }

  function dispose() {
    scene.remove(root);
    for (const geometry of disposableGeometries) geometry.dispose();
    for (const material of disposableMaterials) material.dispose();
    floorTexture.dispose();
  }

  const metrics = Object.freeze({
    footprintRadius: config.footprintRadius,
    totalHeight: config.deckY + 29,
    deckY: baseY + config.deckY,
    openingRadius: config.deckOpeningRadius,
    rampTurns: config.rampTurns,
    rampLength,
    rampGradeDegrees: THREE.MathUtils.radToDeg(rampGrade),
    visibleSupportColumns: columnCount + pylonCount + 4 + dishes.length,
    lowerPracticalLights: practicalLights.length,
    instancedElements: columnCount + bracePairs.length + pylonCount + railPostCount + lunarBlockCount,
    spawnPointCount: spawnPoints.length,
    platformDescriptorCount: platforms.length,
    hasInvisibleBoundary: false,
    deckOpeningIsGeometric: true,
    floorArtMaterialUrl: options.floorUrl || OBSERVATORY_FLOOR_URL,
  });

  return {
    group: root,
    center: new THREE.Vector3(center.x, baseY, center.z),
    config: Object.freeze({ ...config }),
    meshes: { lowerFloor, ramp, moonDeck, energyBeam, columns, braces, pylons, dishes, practicalLights },
    materials: { floor: floorMaterial, deck: deckMaterial, metal: darkMetal, panel: panelMetal, lunar: lunarMaterial, cyanTrim, violetTrim },
    solids,
    bulletSolids,
    colliders,
    platforms,
    spawnPoints,
    playerStart,
    metrics,
    groundAt,
    relaySurfaceAt,
    surfaceAt,
    supportAt,
    navigationAt,
    isDeckOpening,
    rampSurfaceAt: (x, z, y = Infinity) => {
      const local = localCoordinates(x, z);
      return rampSurfaceAt(local.x, local.z, y);
    },
    setPower,
    setThreat,
    update,
    dispose,
  };
}
