import * as THREE from "../vendor/three.module.js";

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const HOUSE_TOP = 26;
const CEILING_STEP = 3.2;
const STATE_FALLING = 0;
const STATE_RECOILING = 1;

const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    strands: 64,
    strandSegments: 6,
    splats: 6,
    splatSegments: 8,
    spawnRadius: 7.5,
    gravity: 8.4,
    constraintRadius: 0.0085,
    radialSegments: 5,
    splatLifetime: 1.05
  }),
  medium: Object.freeze({
    strands: 128,
    strandSegments: 9,
    splats: 8,
    splatSegments: 12,
    spawnRadius: 9,
    gravity: 9.1,
    constraintRadius: 0.0095,
    radialSegments: 6,
    splatLifetime: 1.2
  }),
  high: Object.freeze({
    strands: 220,
    strandSegments: 12,
    splats: 10,
    splatSegments: 16,
    spawnRadius: 11,
    gravity: 9.8,
    constraintRadius: 0.0105,
    radialSegments: 7,
    splatLifetime: 1.35
  })
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const smootherstep = (value) => {
  const amount = clamp(value, 0, 1);
  return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
};

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function resolvePlayerPosition(player, fallback) {
  const nested = player?.position;
  return {
    x: finite(nested?.x, finite(player?.x, fallback.x)),
    y: finite(nested?.y, finite(player?.y, fallback.y)),
    z: finite(nested?.z, finite(player?.z, fallback.z))
  };
}

function playerSurfaceFallback(player, playerY) {
  return finite(
    player?.surfaceY,
    finite(player?.floorY, finite(player?.groundY, playerY - finite(player?.eyeHeight, 1.65)))
  );
}

function readSampleHeight(sampleSurface, x, z, fallback) {
  if (typeof sampleSurface !== "function") return fallback;
  try {
    const sample = sampleSurface(x, z);
    if (Number.isFinite(sample)) return sample;
    if (sample && typeof sample === "object") {
      const candidates = [
        sample.y,
        sample.height,
        sample.level,
        sample.surfaceY,
        sample.position?.y,
        sample.point?.y
      ];
      for (const candidate of candidates) {
        if (Number.isFinite(candidate)) return candidate;
      }
    }
  } catch (_error) {
    // A bad optional terrain probe must not take the render loop down with it.
  }
  return fallback;
}

async function loadOptionalTexture(texturePath) {
  if (!texturePath) return null;
  if (texturePath.isTexture) return texturePath.clone();
  if (typeof texturePath !== "string") return null;

  let url = texturePath;
  try {
    url = new URL(texturePath, import.meta.url).href;
  } catch (_error) {
    // TextureLoader can still handle already-normalized URLs.
  }

  const texture = await new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
  });
  if (!texture) return null;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

const segmentPosition = new THREE.Vector3();
const segmentDirection = new THREE.Vector3();
const segmentScale = new THREE.Vector3();
const segmentRotation = new THREE.Quaternion();
const segmentMatrix = new THREE.Matrix4();
const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

function setSegmentMatrix(mesh, index, start, end, radius) {
  segmentDirection.subVectors(end, start);
  const measuredLength = segmentDirection.length();
  const length = Math.max(0.001, measuredLength);
  if (measuredLength > 0.00001) segmentDirection.multiplyScalar(1 / measuredLength);
  else segmentDirection.copy(UP);
  segmentPosition.addVectors(start, end).multiplyScalar(0.5);
  segmentRotation.setFromUnitVectors(UP, segmentDirection);
  segmentScale.set(Math.max(0.0001, radius), length * 1.065, Math.max(0.0001, radius));
  segmentMatrix.compose(segmentPosition, segmentRotation, segmentScale);
  mesh.setMatrixAt(index, segmentMatrix);
}

function hideInstances(mesh, first, count) {
  for (let index = first; index < first + count; index += 1) {
    mesh.setMatrixAt(index, hiddenMatrix);
  }
}

/**
 * Creates finite, pooled spaghetti rain for a tall first-person environment.
 * sampleSurface may return a number or an object with y/height/level/surfaceY.
 */
export async function createSpaghettiRain({
  scene,
  quality = "high",
  seed = 1337,
  texturePath = null
} = {}) {
  if (!scene?.isScene) throw new Error("createSpaghettiRain requires a THREE.Scene");

  const normalizedQuality = quality === "low" ? "low" : quality === "medium" ? "medium" : "high";
  const settings = QUALITY_PRESETS[normalizedQuality];
  const random = mulberry32(Number.isFinite(seed) ? seed : 1337);
  const texture = await loadOptionalTexture(texturePath);
  const lowQuality = normalizedQuality === "low";

  const materialParameters = {
    name: "rain-wet spaghetti",
    color: 0xe7b75e,
    map: texture,
    vertexColors: true,
    emissive: 0x2a0800,
    emissiveIntensity: lowQuality ? 0.08 : 0.14,
    roughness: lowQuality ? 0.36 : 0.24,
    metalness: 0.015
  };
  const noodleMaterial = lowQuality
    ? new THREE.MeshStandardMaterial(materialParameters)
    : new THREE.MeshPhysicalMaterial({
      ...materialParameters,
      clearcoat: 0.82,
      clearcoatRoughness: 0.11,
      sheen: 0.34,
      sheenColor: new THREE.Color(0xffc36b),
      sheenRoughness: 0.42
    });

  const segmentGeometry = new THREE.CylinderGeometry(
    1,
    1,
    1,
    settings.radialSegments,
    1,
    false
  );
  segmentGeometry.computeBoundingSphere();

  const fallingMesh = new THREE.InstancedMesh(
    segmentGeometry,
    noodleMaterial,
    settings.strands * settings.strandSegments
  );
  fallingMesh.name = "pooled flexible falling spaghetti";
  fallingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fallingMesh.frustumCulled = false;
  fallingMesh.castShadow = normalizedQuality === "high";
  fallingMesh.receiveShadow = true;

  const splatMaterial = lowQuality
    ? new THREE.MeshStandardMaterial({
      name: "marinara-darkened fallen spaghetti",
      color: 0x3f0905,
      vertexColors: false,
      roughness: 0.34,
      metalness: 0.01
    })
    : new THREE.MeshPhysicalMaterial({
      name: "marinara-darkened fallen spaghetti",
      color: 0x3f0905,
      vertexColors: false,
      roughness: 0.22,
      metalness: 0.01,
      clearcoat: 0.76,
      clearcoatRoughness: 0.14
    });

  const splatMesh = new THREE.InstancedMesh(
    segmentGeometry,
    splatMaterial,
    settings.splats * settings.splatSegments
  );
  splatMesh.name = "pooled wet spaghetti impact splats";
  splatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  splatMesh.frustumCulled = false;
  splatMesh.castShadow = false;
  splatMesh.receiveShadow = true;

  const root = new THREE.Group();
  root.name = "Spaghetti Rain";
  root.add(fallingMesh, splatMesh);
  scene.add(root);

  const fallingColor = new THREE.Color();
  for (let index = 0; index < fallingMesh.count; index += 1) {
    fallingColor.setHSL(
      0.085 + (random() - 0.5) * 0.014,
      0.55 + random() * 0.1,
      0.47 + random() * 0.1
    );
    fallingMesh.setColorAt(index, fallingColor);
  }
  if (fallingMesh.instanceColor) fallingMesh.instanceColor.needsUpdate = true;

  const splatColor = new THREE.Color();
  for (let index = 0; index < splatMesh.count; index += 1) {
    splatColor.setHSL(
      0.075 + (random() - 0.5) * 0.012,
      0.68 + random() * 0.12,
      0.2 + random() * 0.09
    );
    splatMesh.setColorAt(index, splatColor);
  }
  if (splatMesh.instanceColor) splatMesh.instanceColor.needsUpdate = true;

  const strands = Array.from({ length: settings.strands }, () => ({
    state: STATE_FALLING,
    x: 0,
    y: 5,
    z: 0,
    vx: 0,
    vy: -1,
    vz: 0,
    length: 1.5,
    radius: settings.constraintRadius,
    phase: 0,
    sway: 0.1,
    flutter: 1,
    bendX: 0,
    bendZ: 0,
    recoilAge: 0,
    recoilDuration: 0.2,
    recoilHeight: 0.3,
    recoilAngle: 0,
    surfaceY: 0
  }));

  const splats = Array.from({ length: settings.splats }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    age: 0,
    lifetime: settings.splatLifetime,
    radius: 0.4,
    noodleRadius: settings.constraintRadius,
    angle: 0,
    phase: 0,
    turns: 1.6,
    recoil: 1,
    mode: 0
  }));

  const pointA = new THREE.Vector3();
  const pointB = new THREE.Vector3();
  let intensity = 1;
  let splatCursor = 0;
  let elapsedTime = 0;
  let frame = 0;
  let totalImpacts = 0;
  let peakActiveSplats = 0;
  let highestSpawnY = 0;
  let lastSampleSurface = null;
  const impactEvents = [];
  const lastPlayer = { x: 0, y: 1.65, z: 0 };

  const activeStrandCount = () => Math.round(settings.strands * intensity);

  function respawnStrand(strand, playerX, playerY, playerZ, sampleSurface, scatter = false) {
    const angle = random() * TAU;
    const distance = 1.8 + Math.sqrt(random()) * (settings.spawnRadius - 1.8);
    strand.x = playerX + Math.cos(angle) * distance;
    strand.z = playerZ + Math.sin(angle) * distance;
    strand.length = 0.58 + random() * (normalizedQuality === "high" ? 1.22 : 0.94);
    strand.radius = settings.constraintRadius * (0.72 + random() * 0.72);
    strand.phase = random() * TAU;
    strand.sway = 0.1 + random() * 0.28;
    strand.flutter = 0.7 + random() * 1.75;
    strand.bendX = (random() - 0.5) * 0.72;
    strand.bendZ = (random() - 0.5) * 0.72;
    strand.vx = (random() - 0.5) * 0.2;
    strand.vy = -(0.85 + random() * 2.8);
    strand.vz = (random() - 0.5) * 0.2;
    strand.state = STATE_FALLING;
    strand.recoilAge = 0;
    strand.cameraHit = false;

    const fallbackSurface = playerY - 1.65;
    strand.surfaceY = readSampleHeight(sampleSurface, strand.x, strand.z, fallbackSurface);
    const clearanceY = Math.max(
      strand.surfaceY + strand.length + 0.55,
      playerY + 2.4
    );
    const ceilingBand = Math.ceil(clearanceY / CEILING_STEP) * CEILING_STEP - 0.06;
    const upperLevel = Math.min(HOUSE_TOP + 0.25, playerY + 5 + random() * 10.5);
    strand.y = Math.max(clearanceY, Math.max(ceilingBand, upperLevel));
    strand.y = Math.min(Math.max(HOUSE_TOP + 0.25, clearanceY), strand.y);

    if (scatter) {
      const lowestTop = strand.surfaceY + strand.length + 0.08;
      strand.y = lerp(lowestTop, strand.y, 0.12 + random() * 0.88);
    }
    highestSpawnY = Math.max(highestSpawnY, strand.y);
  }

  function activateSplat(x, y, z, impactSpeed, noodleRadius) {
    const splat = splats[splatCursor];
    splatCursor = (splatCursor + 1) % splats.length;
    splat.active = true;
    splat.x = x + (random() - 0.5) * 0.08;
    splat.y = y;
    splat.z = z + (random() - 0.5) * 0.08;
    splat.age = 0;
    splat.lifetime = settings.splatLifetime * (0.65 + random() * 0.7);
    splat.radius = 0.08 + random() * 0.15 + clamp(impactSpeed, 0, 13) * 0.004;
    splat.noodleRadius = noodleRadius * (0.86 + random() * 0.22);
    splat.angle = random() * TAU;
    splat.phase = random() * TAU;
    splat.turns = 1.25 + random() * 0.75;
    splat.recoil = clamp(impactSpeed / 7, 0.45, 1.8);
    splat.mode = 0;

    let active = 0;
    for (const item of splats) if (item.active) active += 1;
    peakActiveSplats = Math.max(peakActiveSplats, active);
  }

  function beginImpact(strand, surfaceY) {
    const speed = Math.max(0, -strand.vy);
    strand.state = STATE_RECOILING;
    strand.surfaceY = surfaceY;
    strand.recoilAge = 0;
    strand.recoilDuration = 0.16 + random() * 0.12;
    strand.recoilHeight = 0.16 + clamp(speed, 0, 14) * 0.025;
    strand.recoilAngle = Math.atan2(strand.vz, strand.vx) + (random() - 0.5) * 1.4;
    activateSplat(strand.x, surfaceY, strand.z, speed, strand.radius);
    totalImpacts += 1;
    impactEvents.push({
      kind: "surface",
      x: strand.x,
      y: surfaceY,
      z: strand.z,
      speed,
      radius: strand.radius,
      impact: totalImpacts
    });
    if (impactEvents.length > 48) impactEvents.splice(0, impactEvents.length - 48);
  }

  function updateStrandSimulation(dt, time, playerPosition, fallbackSurface, sampleSurface) {
    const count = activeStrandCount();
    const windX = Math.sin(time * 0.23) * 0.33 + Math.sin(time * 0.71 + 1.8) * 0.09;
    const windZ = Math.cos(time * 0.19 + 0.7) * 0.29 + Math.sin(time * 0.63) * 0.08;

    for (let index = 0; index < count; index += 1) {
      const strand = strands[index];
      if (strand.state === STATE_RECOILING) {
        strand.recoilAge += dt;
        strand.surfaceY = readSampleHeight(sampleSurface, strand.x, strand.z, strand.surfaceY);
        if (strand.recoilAge >= strand.recoilDuration) {
          respawnStrand(
            strand,
            playerPosition.x,
            playerPosition.y,
            playerPosition.z,
            sampleSurface,
            false
          );
        }
        continue;
      }

      const flutterX = Math.sin(time * strand.flutter + strand.phase) * 0.24;
      const flutterZ = Math.cos(time * (strand.flutter * 0.87) + strand.phase * 1.31) * 0.22;
      strand.vx += (windX + flutterX) * dt * 0.36;
      strand.vz += (windZ + flutterZ) * dt * 0.36;
      strand.vx *= Math.pow(0.88, dt);
      strand.vz *= Math.pow(0.88, dt);
      strand.vy -= settings.gravity * dt;
      strand.x += strand.vx * dt;
      strand.y += strand.vy * dt;
      strand.z += strand.vz * dt;

      const surfaceY = readSampleHeight(sampleSurface, strand.x, strand.z, fallbackSurface);
      const horizontalDistance = Math.hypot(
        strand.x - playerPosition.x,
        strand.z - playerPosition.z
      );
      const crossesEye = strand.y >= playerPosition.y - 0.34 &&
        strand.y - strand.length <= playerPosition.y + 0.38;
      if (!strand.cameraHit && horizontalDistance < 0.62 && crossesEye) {
        strand.cameraHit = true;
        impactEvents.push({
          kind: "lens",
          x: strand.x,
          y: playerPosition.y,
          z: strand.z,
          speed: Math.max(0, -strand.vy),
          radius: strand.radius,
          impact: totalImpacts
        });
        if (impactEvents.length > 48) impactEvents.splice(0, impactEvents.length - 48);
      }
      if (horizontalDistance > settings.spawnRadius * 1.72) {
        respawnStrand(
          strand,
          playerPosition.x,
          playerPosition.y,
          playerPosition.z,
          sampleSurface,
          true
        );
      } else if (strand.y - strand.length <= surfaceY + 0.012) {
        beginImpact(strand, surfaceY);
      } else if (strand.y < surfaceY - 1.5 || strand.y > HOUSE_TOP + 18) {
        respawnStrand(
          strand,
          playerPosition.x,
          playerPosition.y,
          playerPosition.z,
          sampleSurface,
          false
        );
      }
    }
  }

  function updateSplatSimulation(dt, sampleSurface) {
    for (const splat of splats) {
      if (!splat.active) continue;
      splat.age += dt;
      splat.y = readSampleHeight(sampleSurface, splat.x, splat.z, splat.y);
      if (splat.age >= splat.lifetime || !Number.isFinite(splat.y)) splat.active = false;
    }
  }

  function fallingPoint(strand, amount, time, target) {
    const weightedAmount = amount * amount;
    const ribbon = Math.sin(strand.phase + amount * 5.1 + time * strand.flutter);
    const crossRibbon = Math.cos(strand.phase * 1.27 + amount * 4.35 + time * strand.flutter * 0.81);
    const turbulence = Math.sin(time * 2.4 + strand.phase + amount * 9.2) * strand.sway * 0.16;
    target.set(
      strand.x + ribbon * strand.sway * (0.18 + amount * 0.82) + strand.bendX * weightedAmount,
      strand.y - strand.length * amount + turbulence * 0.1,
      strand.z + crossRibbon * strand.sway * (0.18 + amount * 0.82) + strand.bendZ * weightedAmount
    );
    return target;
  }

  function recoilPoint(strand, amount, _time, target) {
    const progress = clamp(strand.recoilAge / strand.recoilDuration, 0, 1);
    const spread = smootherstep(progress);
    const angle = strand.recoilAngle + amount * (2.2 + Math.sin(strand.phase) * 0.8);
    const radius = (0.035 + amount * 0.44) * spread;
    const collapse = 1 - progress;
    const arch = Math.sin(amount * Math.PI) * strand.recoilHeight * collapse;
    const slap = Math.sin(progress * Math.PI) * (1 - amount) * 0.12;
    target.set(
      strand.x + Math.cos(angle) * radius,
      strand.surfaceY + 0.018 + arch + slap,
      strand.z + Math.sin(angle) * radius
    );
    return target;
  }

  function renderStrands(time) {
    const count = activeStrandCount();
    fallingMesh.count = count * settings.strandSegments;
    let instanceIndex = 0;
    for (let strandIndex = 0; strandIndex < count; strandIndex += 1) {
      const strand = strands[strandIndex];
      const pointFunction = strand.state === STATE_FALLING ? fallingPoint : recoilPoint;
      pointFunction(strand, 0, time, pointA);
      for (let segment = 0; segment < settings.strandSegments; segment += 1) {
        const amount = (segment + 1) / settings.strandSegments;
        pointFunction(strand, amount, time, pointB);
        setSegmentMatrix(fallingMesh, instanceIndex, pointA, pointB, strand.radius);
        pointA.copy(pointB);
        instanceIndex += 1;
      }
    }
    fallingMesh.instanceMatrix.needsUpdate = true;
  }

  function splatPoint(splat, amount, target) {
    const life = clamp(splat.age / splat.lifetime, 0, 1);
    const impactGrowth = smootherstep(clamp(splat.age / 0.16, 0, 1));
    const fade = 1 - smootherstep(clamp((life - 0.72) / 0.28, 0, 1));
    const scale = impactGrowth * fade;
    const impactBounce = Math.sin(clamp(splat.age / 0.22, 0, 1) * Math.PI) *
      0.095 * splat.recoil * (1 - amount);

    let angle;
    let radius;
    if (splat.mode === 0) {
      angle = splat.angle + amount * splat.turns * TAU +
        Math.sin(splat.phase + amount * 8.3) * 0.075;
      radius = splat.radius * (0.12 + amount * 0.88) * scale;
    } else {
      angle = splat.angle + Math.sin(splat.phase + amount * 5.8) * 0.34;
      radius = splat.radius * amount * scale;
    }

    const lateral = splat.mode === 1 ? Math.sin(amount * 11 + splat.phase) * 0.08 * scale : 0;
    target.set(
      splat.x + Math.cos(angle) * radius + Math.cos(angle + Math.PI * 0.5) * lateral,
      splat.y + 0.016 + Math.sin(amount * splat.turns * TAU) * 0.012 * scale + impactBounce,
      splat.z + Math.sin(angle) * radius + Math.sin(angle + Math.PI * 0.5) * lateral
    );
    return target;
  }

  function renderSplats() {
    let instanceIndex = 0;
    for (const splat of splats) {
      if (!splat.active) {
        hideInstances(splatMesh, instanceIndex, settings.splatSegments);
        instanceIndex += settings.splatSegments;
        continue;
      }

      const life = clamp(splat.age / splat.lifetime, 0, 1);
      const fade = 1 - smootherstep(clamp((life - 0.72) / 0.28, 0, 1));
      splatPoint(splat, 0, pointA);
      for (let segment = 0; segment < settings.splatSegments; segment += 1) {
        splatPoint(splat, (segment + 1) / settings.splatSegments, pointB);
        setSegmentMatrix(
          splatMesh,
          instanceIndex,
          pointA,
          pointB,
          splat.noodleRadius * Math.max(0.08, fade)
        );
        pointA.copy(pointB);
        instanceIndex += 1;
      }
    }
    splatMesh.instanceMatrix.needsUpdate = true;
  }

  function clearSplats() {
    for (const splat of splats) splat.active = false;
    hideInstances(splatMesh, 0, settings.splats * settings.splatSegments);
    splatMesh.instanceMatrix.needsUpdate = true;
  }

  function update(dt, time, player, sampleSurface) {
    const safeDt = clamp(finite(dt, 0), 0, 0.055);
    elapsedTime = Number.isFinite(time) ? time : elapsedTime + safeDt;
    if (typeof sampleSurface === "function") lastSampleSurface = sampleSurface;

    const playerPosition = resolvePlayerPosition(player, lastPlayer);
    const fallbackSurface = playerSurfaceFallback(player, playerPosition.y);
    const teleported = Math.hypot(
      playerPosition.x - lastPlayer.x,
      playerPosition.z - lastPlayer.z
    ) > settings.spawnRadius * 0.82 || Math.abs(playerPosition.y - lastPlayer.y) > 7.5;

    if (teleported) {
      const count = activeStrandCount();
      for (let index = 0; index < count; index += 1) {
        respawnStrand(
          strands[index],
          playerPosition.x,
          playerPosition.y,
          playerPosition.z,
          lastSampleSurface,
          true
        );
      }
      clearSplats();
    }

    updateStrandSimulation(
      safeDt,
      elapsedTime,
      playerPosition,
      fallbackSurface,
      lastSampleSurface
    );
    updateSplatSimulation(safeDt, lastSampleSurface);
    renderStrands(elapsedTime);
    renderSplats();

    lastPlayer.x = playerPosition.x;
    lastPlayer.y = playerPosition.y;
    lastPlayer.z = playerPosition.z;
    frame += 1;
  }

  function setIntensity(value) {
    const previousCount = activeStrandCount();
    intensity = clamp(finite(value, intensity), 0, 1);
    const nextCount = activeStrandCount();
    for (let index = previousCount; index < nextCount; index += 1) {
      respawnStrand(
        strands[index],
        lastPlayer.x,
        lastPlayer.y,
        lastPlayer.z,
        lastSampleSurface,
        true
      );
    }
    renderStrands(elapsedTime);
    return intensity;
  }

  function reset() {
    elapsedTime = 0;
    frame = 0;
    splatCursor = 0;
    totalImpacts = 0;
    peakActiveSplats = 0;
    highestSpawnY = 0;
    impactEvents.length = 0;
    clearSplats();
    for (const strand of strands) {
      respawnStrand(
        strand,
        lastPlayer.x,
        lastPlayer.y,
        lastPlayer.z,
        lastSampleSurface,
        true
      );
    }
    renderStrands(0);
  }

  function getStats() {
    let activeSplats = 0;
    let recoilingStrands = 0;
    const count = activeStrandCount();
    for (const splat of splats) if (splat.active) activeSplats += 1;
    for (let index = 0; index < count; index += 1) {
      if (strands[index].state === STATE_RECOILING) recoilingStrands += 1;
    }
    return {
      quality: normalizedQuality,
      intensity,
      activeStrands: count,
      recoilingStrands,
      strandPool: settings.strands,
      fallingSegments: count * settings.strandSegments,
      activeSplats,
      peakActiveSplats,
      splatPool: settings.splats,
      splatSegments: settings.splats * settings.splatSegments,
      maximumDrawCalls: 2,
      totalImpacts,
      queuedImpactEvents: impactEvents.length,
      highestSpawnY,
      supportedHouseTop: HOUSE_TOP,
      frame
    };
  }

  function consumeImpacts() {
    if (!impactEvents.length) return [];
    return impactEvents.splice(0, impactEvents.length);
  }

  reset();

  return {
    update,
    setIntensity,
    reset,
    getStats,
    consumeImpacts
  };
}
