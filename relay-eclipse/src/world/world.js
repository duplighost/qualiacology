// RELAY//ECLIPSE world composition.
//
// The terrain, underground network, observatory, and every gameplay system use
// the same analytic floor resolver. The relay's spiral ramp is therefore as
// solid as it looks, while the upper aperture remains a real hole in geometry
// and collision rather than an invisible-wall approximation.

import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildCave } from './cave.js';
import { buildCosmos } from './cosmos.js';
import { buildRelayStructure, RELAY_STRUCTURE_DEFAULTS } from './relay-structure.js';
import { ENTRANCES, caveSDF, inCraterMouth } from './layout.js';
import { clamp01, damp, lerp } from '../engine/math.js';

const TAU = Math.PI * 2;
const RELAY_CENTER = Object.freeze({ x: 0, y: 0, z: 0 });

export function buildWorld(scene, renderer) {
  const terrain = buildTerrain(scene);

  // Lift the observatory just above the highest terrain sample under its lower
  // floor. This prevents height-field triangles from poking through the metal
  // while retaining a walkable (sub-step-height) join around the perimeter.
  const relayBaseY = highestTerrainUnderRelay(terrain, RELAY_STRUCTURE_DEFAULTS.footprintRadius) + 0.08;
  const anisotropy = renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
    : 4;
  const relayStructure = buildRelayStructure(scene, {
    center: RELAY_CENTER,
    baseY: relayBaseY,
    groundAt: terrain.groundAt,
    anisotropy,
    power: 1,
  });
  // The donor stored compass-style headings, while CameraRig yaw zero faces -Z.
  // Normalize every spawn here so starts and QA teleports actually look toward
  // the relay instead of presenting the player with an accidental 180-degree
  // view of the outer wall.
  const relay = withCameraHeadings(relayStructure);

  const foundation = buildRelayFoundation(scene, relay);
  const lunarField = buildLunarField(scene, terrain, relay);
  const cache = buildRelayCache(scene, relay);
  const cave = buildCave(scene);
  const cosmos = buildCosmos(scene, renderer, { intensity: 0.96 });

  // The cosmos module's key light doubles as the legacy `world.sun` contract.
  // Shadow settings live here because the world owns the battlefield scale.
  const sun = cosmos.lighting.cyanKey;
  const sunDir = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -78;
  sun.shadow.camera.right = 78;
  sun.shadow.camera.top = 78;
  sun.shadow.camera.bottom = -78;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.45;

  // A low, cool ambient floor preserves material detail inside hard moon
  // shadows. It is intentionally neutral-blue (not a flat white wash), so the
  // cyan relay trim and violet threat light keep their separate hierarchy.
  const lunarAmbient = new THREE.AmbientLight(0x7692bd, 0.3);
  lunarAmbient.name = 'lunar-readability-fill';
  scene.add(lunarAmbient);

  scene.fog = new THREE.FogExp2(0x101827, 0.0044);

  // The former pond lies beneath the new lower relay floor. Keeping its old
  // interaction there would create invisible water/ice effects through metal,
  // so this deliberately inert object preserves callers without lying visually.
  const pond = Object.freeze({
    frozen: false,
    setFrozen() {},
    update() {},
  });

  const colliders = [
    ...relay.colliders,
    ...cave.colliders,
    ...lunarField.colliders,
  ];
  const platforms = [
    ...relay.platforms,
    ...lunarField.platforms,
  ];
  const solids = [
    terrain.mesh,
    ...relay.solids,
    ...cave.solids,
    ...foundation.solids,
    ...lunarField.solids,
    ...cache.solids,
  ];
  // Terrain and cave floor sheets are sampled analytically by weapon marching;
  // excluding those dense height fields keeps every shot inexpensive.
  const bulletSolids = [
    ...relay.bulletSolids,
    ...foundation.bulletSolids,
    ...lunarField.bulletSolids,
    ...cache.bulletSolids,
  ];
  const spawnPoints = Object.freeze([
    ...relay.spawnPoints,
    ...buildOuterSpawnPoints(terrain),
  ]);

  let elapsed = 0;
  let underT = 0;
  let stormBoost = 0;
  let threatTarget = 0;
  let threatCurrent = 0;
  let manualThreat = null;
  let powerTarget = 1;
  let lastSeason = { season: 0, haunt: 0, storm: 0 };

  const coldFog = new THREE.Color(0x101827);
  const threatFog = new THREE.Color(0x21162f);
  const underFog = new THREE.Color(0x080b12);
  const fogColor = new THREE.Color();

  function applyAtmosphere() {
    const threat = threatCurrent;
    fogColor.copy(coldFog).lerp(threatFog, threat * 0.58).lerp(underFog, underT * 0.78);
    scene.fog.color.copy(fogColor);
    scene.fog.density = 0.0039 + threat * 0.0020 + underT * 0.017;

    // Cosmos.update() also drives these lights; explicit absolute values here
    // make the legacy per-frame season/night hooks deterministic rather than
    // allowing intensity multipliers to accumulate.
    sun.intensity = (1.65 - threat * 0.18) * (1 - underT * 0.78);
    cosmos.lighting.hemisphere.intensity = (1.14 - threat * 0.08) * (1 - underT * 0.48);
    cosmos.lighting.violetFill.intensity = (0.5 + threat * 0.14) * (1 - underT * 0.42);
    // The outer field used to bottom out into an unreadable black past the
    // relay's own lighting: real terrain relief and real cover were out there
    // and none of it survived to the eye. The fill and exposure are lifted
    // enough to give the ground form again without turning night into dusk.
    lunarAmbient.intensity = (0.62 + threat * 0.04) * (1 - underT * 0.58);
    if (renderer) renderer.toneMappingExposure = 1.36 - threat * 0.06 - underT * 0.12;
  }

  function setThreat(value) {
    if (!Number.isFinite(value)) {
      manualThreat = null;
    } else {
      manualThreat = clamp01(value);
    }
    const seasonal = Math.max(
      lastSeason.haunt,
      lastSeason.storm,
      lastSeason.season * 0.38,
      stormBoost,
    );
    threatTarget = Math.max(seasonal, manualThreat ?? 0);
    cosmos.setThreat(threatTarget);
    relay.setThreat(threatTarget);
  }

  // Existing wave code still calls this method. Here, "season" is interpreted
  // as eclipse escalation: no autumn grass, snowstorm, or daylight sky survives.
  function setSeason(season, haunt = 0, storm = 0) {
    lastSeason = {
      season: clamp01(season),
      haunt: clamp01(haunt),
      storm: clamp01(storm),
    };
    setThreat(manualThreat);
    cosmos.setIntensity(0.94 + lastSeason.haunt * 0.06);
    applyAtmosphere();
  }

  function setStormBoost(value) {
    stormBoost = clamp01(value);
    setThreat(manualThreat);
  }

  function setPower(value) {
    powerTarget = clamp01(value);
    relay.setPower(powerTarget);
  }

  // Compose the lunar terrain/cave floor with every relay tier. The y-aware
  // resolver selects only surfaces the actor can actually stand on, which is
  // what lets one x/z coordinate represent several turns of the helical ramp.
  function groundAt(x, z, y = Infinity) {
    return relay.groundAt(x, z, y);
  }

  // Preserved exactly as the old movement contract expects. Relay surface
  // descriptors remain available through `world.relay.surfaceAt()`.
  function surfaceAt() {
    return null;
  }

  setSeason(0, 0, 0);

  return {
    terrain,
    cosmos,
    relay,
    colliders,
    platforms,
    nook: cache.nook,
    solids,
    bulletSolids,
    spawnPoints,
    playerStart: relay.playerStart,
    sun,
    sunDir,
    playRadius: terrain.playRadius,
    groundAt,
    inCrater: inCraterMouth,
    surfaceAt,
    caveSDF,
    isUnder: terrain.isUnder,
    ceilAt: terrain.ceilAt,
    entrances: ENTRANCES,
    pond,
    getUnder: () => underT,
    getThreat: () => threatCurrent,
    setThreat,
    setPower,
    setSeason,
    setStormBoost,
    update(dt, playerPos) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      elapsed += dt;
      const anchor = playerPos && playerPos.isVector3 ? playerPos : relay.center;
      const targetUnder = terrain.isUnder(anchor.x, anchor.z, anchor.y + 0.6) ? 1 : 0;
      underT = damp(underT, targetUnder, 3.2, dt);
      threatCurrent = damp(threatCurrent, threatTarget, 2.4, dt);

      cosmos.update(dt, anchor, { threat: threatCurrent });
      relay.update(dt, { power: powerTarget, threat: threatCurrent });
      cache.update(elapsed, powerTarget, threatCurrent);
      cave.update(elapsed);
      cave.setUnderground(underT);
      applyAtmosphere();
    },
  };
}

function highestTerrainUnderRelay(terrain, radius) {
  let highest = -Infinity;
  // Two-metre sampling is much denser than the terrain mesh's vertex spacing.
  for (let x = -radius; x <= radius; x += 2) {
    for (let z = -radius; z <= radius; z += 2) {
      if (x * x + z * z > radius * radius) continue;
      highest = Math.max(highest, terrain.height(RELAY_CENTER.x + x, RELAY_CENTER.z + z));
    }
  }
  return highest;
}

function withCameraHeadings(relay) {
  const faceCenter = (point) => Object.freeze({
    ...point,
    heading: Math.atan2(point.x - relay.center.x, point.z - relay.center.z),
  });
  const spawnPoints = relay.spawnPoints
    .map(faceCenter)
    .filter((point) => relay.colliders.every((collider) => {
      if (collider.yMin !== undefined && point.y < collider.yMin - 0.3) return true;
      if (collider.yMax !== undefined && point.y > collider.yMax + 0.3) return true;
      const dx = point.x - collider.x;
      const dz = point.z - collider.z;
      return dx * dx + dz * dz > (collider.r + 1.2) ** 2;
    }));
  const lowerStart = spawnPoints.find((point) => point.tier === 0 && point.kind === 'lower-arena');
  const playerStart = Object.freeze({
    ...(lowerStart || faceCenter(relay.playerStart)),
    kind: 'player-start',
    clearance: 4,
  });
  return {
    ...relay,
    metrics: Object.freeze({ ...relay.metrics, spawnPointCount: spawnPoints.length }),
    spawnPoints: Object.freeze(spawnPoints),
    playerStart,
  };
}

function buildRelayFoundation(scene, relay) {
  const top = relay.center.y + relay.config.lowerFloorY - 0.03;
  const height = 3.2;
  const material = new THREE.MeshStandardMaterial({
    color: 0x252c3a,
    roughness: 0.72,
    metalness: 0.34,
  });
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(relay.config.footprintRadius, relay.config.footprintRadius + 0.4, height, 72, 1, true),
    material,
  );
  wall.name = 'relay-visible-foundation-skirt';
  wall.position.set(relay.center.x, top - height * 0.5, relay.center.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  return { solids: [wall], bulletSolids: [wall] };
}

function buildLunarField(scene, terrain, relay) {
  const solids = [];
  const bulletSolids = [];
  const colliders = [];
  const platforms = [];
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x59606c,
    roughness: 0.96,
    metalness: 0.035,
    flatShading: true,
  });
  const fractureMaterial = new THREE.MeshStandardMaterial({
    color: 0x232a36,
    emissive: 0x12283a,
    emissiveIntensity: 0.32,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });

  // Deliberate LOS-breaking cover on the outer battlefield. The cylinder-based
  // rocks have genuinely flat tops, so each platform descriptor matches what
  // the player sees and can mantle onto.
  const coverSpecs = [
    [-39, -18, 2.8, 4.2, 0], [37, -20, 2.5, 3.5, 1],
    [-46, 14, 3.2, 5.1, 1], [43, 20, 2.7, 4.6, 0],
    [-18, 47, 2.6, 3.8, 1], [17, 51, 3.1, 5.4, 0],
    [-22, -51, 2.9, 4.5, 0], [23, -47, 2.4, 3.3, 1],
    [-61, -6, 3.5, 5.8, 1], [59, 4, 3.1, 5.0, 0],
    [-9, 66, 2.8, 4.1, 1], [10, -64, 3.2, 5.3, 0],
  ];

  coverSpecs.forEach(([x, z, radius, height, dark], index) => {
    if (inCraterMouth(x, z)) return;
    const groundY = terrain.height(x, z);
    const geometry = new THREE.CylinderGeometry(radius * 0.76, radius, height, 7, 2, false);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const px = positions.getX(i);
      const py = positions.getY(i);
      const pz = positions.getZ(i);
      const edge = Math.abs(py) < height * 0.45 ? 1 : 0.35;
      const chip = 1 + Math.sin((i + 1) * 19.71 + index * 7.31) * 0.075 * edge;
      positions.setXYZ(i, px * chip, py, pz * chip);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const rock = new THREE.Mesh(geometry, dark ? fractureMaterial : rockMaterial);
    rock.name = `lunar-cover-${index + 1}`;
    rock.position.set(x, groundY + height * 0.5 - 0.08, z);
    rock.rotation.y = index * 1.913;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    solids.push(rock);
    bulletSolids.push(rock);

    const topY = groundY + height - 0.08;
    colliders.push({
      x,
      z,
      r: radius * 0.92,
      yMax: topY - 1.7,
      kind: 'visible-lunar-cover',
    });
    platforms.push({
      x,
      z,
      y: topY,
      r: radius * 0.7,
      kind: 'lunar-cover-top',
    });
  });

  // Small rubble is instanced: enough detail to break up the large lunar map
  // without turning every pebble into a movement snag or a separate draw call.
  const rubbleCount = 84;
  const rubble = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    rockMaterial,
    rubbleCount,
  );
  rubble.name = 'instanced-lunar-rubble';
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const euler = new THREE.Euler();
  const random = makeRandom(0x7e1a9c53);
  let placed = 0;
  for (let tries = 0; tries < 1600 && placed < rubbleCount; tries += 1) {
    const angle = random() * TAU;
    const radius = lerp(relay.config.footprintRadius + 5, terrain.playRadius - 4, Math.sqrt(random()));
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (inCraterMouth(x, z)) continue;
    const size = 0.32 + random() * 0.68;
    position.set(x, terrain.height(x, z) + size * 0.34, z);
    euler.set(random() * 2.2, random() * TAU, random() * 2.2);
    rotation.setFromEuler(euler);
    scale.set(size * (0.8 + random() * 0.5), size * (0.5 + random() * 0.55), size * (0.85 + random() * 0.45));
    matrix.compose(position, rotation, scale);
    rubble.setMatrixAt(placed, matrix);
    placed += 1;
  }
  rubble.count = placed;
  rubble.instanceMatrix.needsUpdate = true;
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  scene.add(rubble);
  solids.push(rubble);
  bulletSolids.push(rubble);

  return { solids, bulletSolids, colliders, platforms };
}

function buildRelayCache(scene, relay) {
  const x = relay.center.x + 0.4;
  const z = relay.center.z - 13.1;
  const deckY = relay.metrics.deckY;
  const root = new THREE.Group();
  root.name = 'relay-visible-loot-cache';

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x172433,
    metalness: 0.7,
    roughness: 0.31,
  });
  const energyMaterial = new THREE.MeshStandardMaterial({
    color: 0x18374a,
    emissive: 0x44dcff,
    emissiveIntensity: 1.4,
    metalness: 0.4,
    roughness: 0.25,
  });
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.38, 0.28, 12), shellMaterial);
  floor.position.y = 0.14;
  floor.castShadow = true;
  root.add(floor);
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * TAU;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.15, 6), energyMaterial);
    bar.position.set(Math.cos(angle) * 0.92, 1.28, Math.sin(angle) * 0.92);
    root.add(bar);
  }
  for (const y of [0.37, 2.32]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 6, 28), energyMaterial);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = y;
    root.add(ring);
  }
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), energyMaterial);
  beacon.position.y = 2.72;
  root.add(beacon);
  root.position.set(x, deckY, z);
  scene.add(root);
  const bulletMeshes = [];
  root.traverse((object) => { if (object.isMesh) bulletMeshes.push(object); });

  const nook = Object.freeze({
    x,
    z,
    y: deckY + 0.2,
    cageFloorY: deckY + 0.72,
    cageConfine: 0.76,
    catchR: 5.7,
    cap: 5,
  });
  return {
    nook,
    solids: [root],
    bulletSolids: bulletMeshes,
    update(time, power, threat) {
      root.rotation.y = Math.sin(time * 0.16) * 0.025;
      beacon.rotation.y = time * (0.72 + threat * 0.28);
      energyMaterial.emissiveIntensity = (1.12 + Math.sin(time * 2.2) * 0.24) * (0.45 + power * 0.55);
    },
  };
}

function buildOuterSpawnPoints(terrain) {
  const points = [];
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * TAU + Math.PI / 16;
    const radius = 66 + (i % 3) * 3;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(Object.freeze({
      x,
      y: terrain.height(x, z),
      z,
      heading: Math.PI * 0.5 - angle,
      tier: 0,
      kind: 'outer-lunar-field',
      clearance: 4,
    }));
  }
  return points;
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
