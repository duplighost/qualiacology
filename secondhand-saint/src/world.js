import * as THREE from '../vendor/three.module.min.js';

const TAU = Math.PI * 2;
const ARENA_RADIUS = 18.25;
const FINAL_PLAYER_RADIUS = 12;
const FINAL_BOSS_ORBIT_RADIUS = 18.55;
const FLOOR_Y = 0;
// The scaled hour-gate footprint reaches roughly 2.3 m from its pivot. The
// remaining margin protects Nera's on-screen silhouette when a gate is beyond
// her focus point and perspective compresses both into the same screen band.
const HOUR_GATE_SIGHTLINE_RADIUS = 3.15;
// The raised bronze lip is made from 24 short torus arcs. At the close combat
// camera, an arc immediately behind the lens can still enter the wide frustum
// as a screen-height curve even though its centre is behind the player ray.
// This clearance removes only those near-lens presentation instances; the
// physical arena boundary and the distant silhouette remain unchanged.
const BOUNDARY_LIP_RADIUS = 19.61;
const BOUNDARY_SEGMENT_COUNT = 24;
const BOUNDARY_SEGMENT_STEP = TAU / BOUNDARY_SEGMENT_COUNT;
const BOUNDARY_SEGMENT_ARC = BOUNDARY_SEGMENT_STEP * 0.982;
const BOUNDARY_SIGHTLINE_RADIUS = 5.2;
const BOUNDARY_NEAR_CAMERA_RADIUS = 10.15;
const BOUNDARY_SEGMENT_SAMPLES = 9;
const BOUNDARY_SCREEN_HALF_WIDTH = 0.84;
const BOUNDARY_SCREEN_BOTTOM = -0.96;
const BOUNDARY_SCREEN_TOP = 0.96;
const BOUNDARY_SCREEN_SAMPLE_Y = Object.freeze([-0.02, 0.2, 0.42]);

const COLORS = Object.freeze({
  void: 0x050711,
  storm: 0x0a1020,
  blueBlack: 0x101522,
  stone: 0x292f3e,
  stoneLight: 0x4a5363,
  stonePale: 0x8f9aaa,
  ink: 0x090b12,
  brass: 0xc68c35,
  brassDark: 0x67451f,
  bone: 0xe8e0ce,
  phaseBlue: 0x54bce8,
  phaseGold: 0xffc65f,
  phaseWhite: 0xe8f5ff,
  phaseViolet: 0xb436ff,
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function hourGateSightlineMask(
  hourGates,
  cameraPosition,
  focusPosition,
  corridorRadius = HOUR_GATE_SIGHTLINE_RADIUS,
) {
  if (!cameraPosition || !focusPosition || !hourGates?.length) return 0;
  const viewX = focusPosition.x - cameraPosition.x;
  const viewZ = focusPosition.z - cameraPosition.z;
  const viewLength = Math.hypot(viewX, viewZ);
  if (viewLength < 0.001) return 0;
  const directionX = viewX / viewLength;
  const directionZ = viewZ / viewLength;
  const safeRadius = Math.max(0, Number(corridorRadius) || 0);
  const safeRadiusSq = safeRadius * safeRadius;
  let mask = 0;
  for (let index = 0; index < hourGates.length; index += 1) {
    const position = hourGates[index]?.position;
    if (!position) continue;
    const offsetX = position.x - cameraPosition.x;
    const offsetZ = position.z - cameraPosition.z;
    const along = offsetX * directionX + offsetZ * directionZ;
    if (along < -safeRadius) continue;
    const perpendicularX = offsetX - directionX * along;
    const perpendicularZ = offsetZ - directionZ * along;
    if (perpendicularX * perpendicularX + perpendicularZ * perpendicularZ <= safeRadiusSq) {
      mask |= (1 << index);
    }
  }
  return mask;
}

export function hourGateCompositionMask(
  hourGates,
  cameraPosition,
  focusPositions,
  corridorRadius = HOUR_GATE_SIGHTLINE_RADIUS,
) {
  const focuses = Array.isArray(focusPositions) ? focusPositions : [focusPositions];
  let mask = 0;
  for (const focusPosition of focuses) {
    if (!focusPosition) continue;
    mask |= hourGateSightlineMask(hourGates, cameraPosition, focusPosition, corridorRadius);
  }
  return mask;
}

export function boundarySegmentOcclusionMask(
  segmentAngles,
  cameraOrPosition,
  focusPositions,
  {
    boundaryRadius = BOUNDARY_LIP_RADIUS,
    segmentArc = BOUNDARY_SEGMENT_ARC,
    corridorRadius = BOUNDARY_SIGHTLINE_RADIUS,
    nearCameraRadius = BOUNDARY_NEAR_CAMERA_RADIUS,
    samples = BOUNDARY_SEGMENT_SAMPLES,
    screenHalfWidth = BOUNDARY_SCREEN_HALF_WIDTH,
    screenBottom = BOUNDARY_SCREEN_BOTTOM,
    screenTop = BOUNDARY_SCREEN_TOP,
  } = {},
) {
  const empty = {
    hiddenMask: 0,
    nearCameraMask: 0,
    compositionMask: 0,
    screenCompositionMask: 0,
  };
  const projectionCamera = cameraOrPosition?.isCamera ? cameraOrPosition : null;
  const cameraPosition = projectionCamera?.position || cameraOrPosition;
  if (!cameraPosition || !segmentAngles?.length) return empty;
  const focuses = (Array.isArray(focusPositions) ? focusPositions : [focusPositions])
    .filter(Boolean)
    .map((focusPosition) => {
      const viewX = focusPosition.x - cameraPosition.x;
      const viewZ = focusPosition.z - cameraPosition.z;
      const viewLength = Math.hypot(viewX, viewZ);
      if (viewLength < 0.001) return null;
      return { directionX: viewX / viewLength, directionZ: viewZ / viewLength };
    })
    .filter(Boolean);
  const safeSamples = Math.max(3, Math.min(9, Math.round(Number(samples) || BOUNDARY_SEGMENT_SAMPLES)));
  const safeBoundaryRadius = Math.max(0, Number(boundaryRadius) || 0);
  const safeSegmentArc = Math.max(0, Number(segmentArc) || 0);
  const safeCorridorRadiusSq = Math.max(0, Number(corridorRadius) || 0) ** 2;
  const safeNearCameraRadiusSq = Math.max(0, Number(nearCameraRadius) || 0) ** 2;
  const safeScreenHalfWidth = Math.max(0, Math.min(1, Number(screenHalfWidth) || 0));
  const safeScreenBottom = Math.max(-1, Math.min(1, Number(screenBottom) || 0));
  const safeScreenTop = Math.max(safeScreenBottom, Math.min(1, Number(screenTop) || 0));
  const viewElements = projectionCamera?.matrixWorldInverse?.elements || null;
  const projectionElements = projectionCamera?.projectionMatrix?.elements || null;
  const screenProjectionActive = Boolean(viewElements && projectionElements);
  const nearClipW = Math.max(0.025, Number(projectionCamera?.near) || 0.1) * 0.75;
  let nearCameraMask = 0;
  let compositionMask = 0;
  let screenCompositionMask = 0;
  const previousFront = screenProjectionActive ? [false, false, false] : null;
  const previousX = screenProjectionActive ? [0, 0, 0] : null;
  const previousY = screenProjectionActive ? [0, 0, 0] : null;
  const hasPrevious = screenProjectionActive ? [false, false, false] : null;

  for (let index = 0; index < segmentAngles.length; index += 1) {
    const bit = 1 << index;
    const centerAngle = segmentAngles[index];
    if (hasPrevious) hasPrevious.fill(false);
    for (let sampleIndex = 0; sampleIndex < safeSamples; sampleIndex += 1) {
      const sampleProgress = safeSamples === 1 ? 0 : sampleIndex / (safeSamples - 1) - 0.5;
      const sampleAngle = centerAngle + safeSegmentArc * sampleProgress;
      const sampleX = Math.cos(sampleAngle) * safeBoundaryRadius;
      const sampleZ = Math.sin(sampleAngle) * safeBoundaryRadius;
      const offsetX = sampleX - cameraPosition.x;
      const offsetZ = sampleZ - cameraPosition.z;
      if (offsetX * offsetX + offsetZ * offsetZ <= safeNearCameraRadiusSq) {
        nearCameraMask |= bit;
      }
      for (const focus of focuses) {
        const along = offsetX * focus.directionX + offsetZ * focus.directionZ;
        if (along <= -0.4) continue;
        const perpendicularX = offsetX - focus.directionX * along;
        const perpendicularZ = offsetZ - focus.directionZ * along;
        if (perpendicularX * perpendicularX + perpendicularZ * perpendicularZ <= safeCorridorRadiusSq) {
          compositionMask |= bit;
          break;
        }
      }
      if (screenProjectionActive && !(screenCompositionMask & bit)) {
        for (let rowIndex = 0; rowIndex < BOUNDARY_SCREEN_SAMPLE_Y.length; rowIndex += 1) {
          const sampleY = BOUNDARY_SCREEN_SAMPLE_Y[rowIndex];
          const viewX = viewElements[0] * sampleX
            + viewElements[4] * sampleY
            + viewElements[8] * sampleZ
            + viewElements[12];
          const viewY = viewElements[1] * sampleX
            + viewElements[5] * sampleY
            + viewElements[9] * sampleZ
            + viewElements[13];
          const viewZ = viewElements[2] * sampleX
            + viewElements[6] * sampleY
            + viewElements[10] * sampleZ
            + viewElements[14];
          const clipX = projectionElements[0] * viewX
            + projectionElements[4] * viewY
            + projectionElements[8] * viewZ
            + projectionElements[12];
          const clipY = projectionElements[1] * viewX
            + projectionElements[5] * viewY
            + projectionElements[9] * viewZ
            + projectionElements[13];
          const clipW = projectionElements[3] * viewX
            + projectionElements[7] * viewY
            + projectionElements[11] * viewZ
            + projectionElements[15];
          const front = clipW > nearClipW;
          const projectedX = clipW === 0 ? 0 : clipX / clipW;
          const projectedY = clipW === 0 ? 0 : clipY / clipW;
          if (front
            && projectedX >= -safeScreenHalfWidth
            && projectedX <= safeScreenHalfWidth
            && projectedY >= safeScreenBottom
            && projectedY <= safeScreenTop) {
            screenCompositionMask |= bit;
            break;
          }
          if (hasPrevious[rowIndex] && previousFront[rowIndex] !== front) {
            screenCompositionMask |= bit;
            break;
          }
          const overlapsProtectedScreen = hasPrevious[rowIndex]
            && front
            && Math.max(previousX[rowIndex], projectedX) >= -safeScreenHalfWidth
            && Math.min(previousX[rowIndex], projectedX) <= safeScreenHalfWidth
            && Math.max(previousY[rowIndex], projectedY) >= safeScreenBottom
            && Math.min(previousY[rowIndex], projectedY) <= safeScreenTop;
          if (overlapsProtectedScreen) {
            screenCompositionMask |= bit;
            break;
          }
          hasPrevious[rowIndex] = true;
          previousFront[rowIndex] = front;
          previousX[rowIndex] = projectedX;
          previousY[rowIndex] = projectedY;
        }
      }
    }
  }
  // One neighbouring arc on either side forms a guard band for the torus
  // tube's thickness and the small curve between projection samples. This is
  // deliberately conservative: a lip seam may disappear at the viewport
  // edge, but no adjacent bronze end-cap can leak back through the fighters.
  if (screenCompositionMask) {
    const projectedMask = screenCompositionMask;
    for (let index = 0; index < segmentAngles.length; index += 1) {
      if (!(projectedMask & (1 << index))) continue;
      const previousIndex = (index - 1 + segmentAngles.length) % segmentAngles.length;
      const nextIndex = (index + 1) % segmentAngles.length;
      screenCompositionMask |= (1 << previousIndex) | (1 << nextIndex);
    }
  }
  // A live PerspectiveCamera means this is the active rendered fight, not a
  // geometry-only planning query. The four sectors left by a bounded aperture
  // can still draw enormous torus curves across the viewport as the camera
  // settles or an attack shifts its target. Hide the complete decorative lip
  // for that presentation pass; the floor rim, gates, witnesses, pylons and
  // physical arena boundary remain independently rendered and unchanged.
  const liveCombatMask = screenProjectionActive && focuses.length
    ? segmentAngles.reduce((mask, _, index) => mask | (1 << index), 0)
    : 0;
  return {
    hiddenMask: liveCombatMask || (nearCameraMask | compositionMask | screenCompositionMask),
    nearCameraMask,
    compositionMask,
    screenCompositionMask,
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSurfaceTexture(renderer) {
  if (typeof document === 'undefined') return null;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;

  const image = context.createImageData(size, size);
  const random = seededRandom(0x5ec0a5);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin(x * 0.031 + Math.sin(y * 0.017) * 2.1) * 5;
      const grit = (random() - 0.5) * 19;
      const vignette = Math.abs((x / size) - 0.5) + Math.abs((y / size) - 0.5);
      const value = Math.max(154, Math.min(225, 205 + broad + grit - vignette * 9));
      const offset = (y * size + x) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value + 1;
      image.data[offset + 2] = value + 3;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  context.globalAlpha = 0.24;
  context.strokeStyle = '#545c68';
  context.lineWidth = 1.2;
  for (let vein = 0; vein < 15; vein += 1) {
    let x = random() * size;
    let y = random() * size;
    context.beginPath();
    context.moveTo(x, y);
    for (let segment = 0; segment < 8; segment += 1) {
      x += (random() - 0.5) * 70;
      y += (random() - 0.5) * 38 + 11;
      context.lineTo(x, y);
    }
    context.stroke();
  }

  context.globalAlpha = 0.16;
  context.fillStyle = '#ffffff';
  for (let fleck = 0; fleck < 480; fleck += 1) {
    const radius = random() < 0.93 ? 0.45 : 1.2;
    context.fillRect(random() * size, random() * size, radius, radius);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'meridian-stone-surface';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  texture.needsUpdate = true;
  return texture;
}

function makeCloudTexture() {
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const random = seededRandom(0xc10d5);
  context.clearRect(0, 0, size, size);
  context.globalCompositeOperation = 'lighter';
  for (let cloud = 0; cloud < 22; cloud += 1) {
    const x = 45 + random() * 166;
    const y = 82 + random() * 94;
    const radius = 18 + random() * 54;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(178,205,224,${0.1 + random() * 0.14})`);
    gradient.addColorStop(0.43, `rgba(82,112,139,${0.08 + random() * 0.08})`);
    gradient.addColorStop(1, 'rgba(12,18,31,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const mask = context.createRadialGradient(128, 128, 35, 128, 128, 128);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.72, 'rgba(255,255,255,.8)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = mask;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'procedural-storm-cloud';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function sectorBandGeometry(innerRadius, outerRadius, count, gapRatio, offset, parity = null) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const arc = TAU / count;
  const subdivisions = Math.max(2, Math.round(16 / count * 4));

  for (let sector = 0; sector < count; sector += 1) {
    if (parity !== null && sector % 2 !== parity) continue;
    const start = offset + sector * arc + arc * gapRatio * 0.5;
    const end = offset + (sector + 1) * arc - arc * gapRatio * 0.5;
    const base = positions.length / 3;

    for (let step = 0; step <= subdivisions; step += 1) {
      const amount = step / subdivisions;
      const angle = THREE.MathUtils.lerp(start, end, amount);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);

      positions.push(cosine * innerRadius, 0, sine * innerRadius);
      positions.push(cosine * outerRadius, 0, sine * outerRadius);
      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(amount, 0, amount, 1);
    }

    for (let step = 0; step < subdivisions; step += 1) {
      const cursor = base + step * 2;
      indices.push(cursor, cursor + 3, cursor + 1);
      indices.push(cursor, cursor + 2, cursor + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// A local-space annular plate with its pivot at the center of the sector.
// Keeping the pivot on the plate (instead of at the arena origin) lets phase
// changes separate the dial into readable pieces without visually implying a
// collision step inside the currently playable radius.
function sectorPlateGeometry(innerRadius, outerRadius, arc, subdivisions = 8, depth = 0.12) {
  const middleRadius = (innerRadius + outerRadius) * 0.5;
  const shape = new THREE.Shape();
  for (let step = 0; step <= subdivisions; step += 1) {
    const angle = THREE.MathUtils.lerp(-arc * 0.5, arc * 0.5, step / subdivisions);
    const x = Math.sin(angle) * innerRadius;
    const z = Math.cos(angle) * innerRadius - middleRadius;
    if (step === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  for (let step = subdivisions; step >= 0; step -= 1) {
    const angle = THREE.MathUtils.lerp(-arc * 0.5, arc * 0.5, step / subdivisions);
    shape.lineTo(
      Math.sin(angle) * outerRadius,
      Math.cos(angle) * outerRadius - middleRadius,
    );
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(Math.PI * 0.5);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeStarShape(points, outerRadius, innerRadius) {
  const shape = new THREE.Shape();
  for (let point = 0; point < points * 2; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = point / (points * 2) * TAU + Math.PI * 0.5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function makeNeedleGeometry(length, width, tail = 0.48) {
  const shape = new THREE.Shape();
  shape.moveTo(0, length);
  shape.lineTo(width * 0.7, length * 0.12);
  shape.lineTo(width, 0);
  shape.lineTo(width * 0.45, -tail);
  shape.lineTo(0, -tail * 1.32);
  shape.lineTo(-width * 0.45, -tail);
  shape.lineTo(-width, 0);
  shape.lineTo(-width * 0.7, length * 0.12);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 1);
}

function makeFlatCrackGeometry(random, radiusMin, radiusMax) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const angle = random() * TAU;
  const startRadius = radiusMin + random() * (radiusMax - radiusMin) * 0.45;
  const segmentCount = 3 + Math.floor(random() * 4);
  let previous = new THREE.Vector2(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const radial = startRadius + (segment + 1) / segmentCount * (radiusMax - startRadius);
    const drift = (random() - 0.5) * 0.3;
    const nextAngle = angle + drift;
    const next = new THREE.Vector2(Math.cos(nextAngle) * radial, Math.sin(nextAngle) * radial);
    const direction = next.clone().sub(previous).normalize();
    const perpendicular = new THREE.Vector2(-direction.y, direction.x);
    const halfWidth = 0.018 + random() * 0.035;
    const cursor = positions.length / 3;

    positions.push(
      previous.x + perpendicular.x * halfWidth, 0, previous.y + perpendicular.y * halfWidth,
      previous.x - perpendicular.x * halfWidth, 0, previous.y - perpendicular.y * halfWidth,
      next.x - perpendicular.x * halfWidth, 0, next.y - perpendicular.y * halfWidth,
      next.x + perpendicular.x * halfWidth, 0, next.y + perpendicular.y * halfWidth,
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(cursor, cursor + 2, cursor + 1, cursor, cursor + 3, cursor + 2);
    previous = next;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function orientHorizontal(mesh) {
  mesh.rotation.x = -Math.PI * 0.5;
  return mesh;
}

function markShadows(root, castShadow, receiveShadow) {
  root.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;
    object.castShadow = castShadow;
    object.receiveShadow = receiveShadow;
  });
}

function buildWitnessStatue(materials) {
  const group = new THREE.Group();
  group.name = 'veiled-hour-witness';

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.18, 0.46, 10),
    materials.stoneDark,
  );
  plinth.position.y = 0.2;
  group.add(plinth);

  const plinthStep = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.96, 0.34, 10),
    materials.stoneTrim,
  );
  plinthStep.position.y = 0.58;
  plinthStep.rotation.y = Math.PI / 10;
  group.add(plinthStep);

  const robeProfile = [
    new THREE.Vector2(0.78, 0),
    new THREE.Vector2(0.9, 0.18),
    new THREE.Vector2(0.67, 0.7),
    new THREE.Vector2(0.61, 1.85),
    new THREE.Vector2(0.45, 2.62),
    new THREE.Vector2(0.35, 2.9),
  ];
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robeProfile, 18), materials.statue);
  robe.position.y = 0.72;
  robe.scale.z = 0.72;
  group.add(robe);

  const mantle = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.3, 7, 1, true),
    materials.statueLight,
  );
  mantle.position.set(0, 3.45, 0);
  mantle.rotation.y = Math.PI / 7;
  mantle.scale.z = 0.72;
  group.add(mantle);

  const hood = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), materials.statueLight);
  hood.position.set(0, 4.25, 0.03);
  hood.scale.set(0.82, 1.13, 0.78);
  hood.rotation.set(0.1, 0.12, 0);
  group.add(hood);

  const face = new THREE.Mesh(new THREE.DodecahedronGeometry(0.23, 0), materials.ink);
  face.position.set(0, 4.2, 0.29);
  face.scale.set(0.76, 1.05, 0.35);
  group.add(face);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.065, 6, 28), materials.brass);
  halo.position.set(0, 4.31, -0.23);
  group.add(halo);

  const forearmGeometry = new THREE.CylinderGeometry(0.105, 0.16, 1.42, 6);
  for (const side of [-1, 1]) {
    const forearm = new THREE.Mesh(forearmGeometry, materials.statueLight);
    forearm.position.set(side * 0.35, 2.95, 0.35);
    forearm.rotation.z = side * -0.49;
    forearm.rotation.x = 0.17;
    group.add(forearm);
  }

  const relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.31, 0), materials.brass);
  relic.position.set(0, 2.68, 0.55);
  relic.scale.y = 1.42;
  relic.rotation.z = Math.PI * 0.25;
  group.add(relic);

  const lowerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.035, 5, 24), materials.glow);
  lowerHalo.position.copy(relic.position);
  lowerHalo.rotation.x = Math.PI * 0.5;
  group.add(lowerHalo);

  markShadows(group, true, true);
  return group;
}

function buildHourGate(materials) {
  const group = new THREE.Group();
  group.name = 'cardinal-hour-gate';
  const columnGeometry = new THREE.CylinderGeometry(0.38, 0.58, 6.5, 8, 1);
  const footGeometry = new THREE.CylinderGeometry(0.74, 0.92, 0.52, 8);
  const collarGeometry = new THREE.CylinderGeometry(0.58, 0.48, 0.3, 8);

  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(footGeometry, materials.stoneDark);
    foot.position.set(side * 3.15, 0.23, 0);
    foot.rotation.y = Math.PI / 8;
    group.add(foot);

    const shaft = new THREE.Mesh(columnGeometry, materials.stone);
    shaft.position.set(side * 3.15, 3.68, 0);
    shaft.rotation.y = Math.PI / 8;
    group.add(shaft);

    const collar = new THREE.Mesh(collarGeometry, materials.brassDark);
    collar.position.set(side * 3.15, 6.82, 0);
    group.add(collar);

    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), materials.stoneTrim);
    crown.position.set(side * 3.15, 7.38, 0);
    crown.scale.y = 1.48;
    group.add(crown);

    const innerBlade = new THREE.Mesh(new THREE.ConeGeometry(0.23, 2.25, 5), materials.brass);
    innerBlade.position.set(side * 2.72, 4.85, 0.02);
    innerBlade.rotation.z = side * -0.13;
    group.add(innerBlade);
  }

  const outerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.16, 6.75, 0),
    new THREE.Vector3(-2.2, 8.25, 0),
    new THREE.Vector3(0, 9.08, 0),
    new THREE.Vector3(2.2, 8.25, 0),
    new THREE.Vector3(3.16, 6.75, 0),
  ]);
  const innerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.76, 6.6, 0.02),
    new THREE.Vector3(-1.78, 7.72, 0.02),
    new THREE.Vector3(0, 8.3, 0.02),
    new THREE.Vector3(1.78, 7.72, 0.02),
    new THREE.Vector3(2.76, 6.6, 0.02),
  ]);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(outerCurve, 32, 0.27, 7, false), materials.stoneTrim);
  const archInlay = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 28, 0.065, 5, false), materials.glow);
  group.add(arch, archInlay);

  const dial = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.1, 6, 32), materials.brassDark);
  dial.position.set(0, 7.37, 0);
  group.add(dial);

  const dialInner = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.034, 5, 28), materials.glow);
  dialInner.position.copy(dial.position);
  group.add(dialInner);

  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.25, 5), materials.brass);
  chain.position.set(0, 6.12, 0);
  group.add(chain);

  const pendulumPivot = new THREE.Group();
  pendulumPivot.name = 'gate-pendulum-pivot';
  pendulumPivot.position.set(0, 5.02, 0.05);
  const pendulum = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), materials.brass);
  pendulum.scale.y = 1.72;
  pendulumPivot.add(pendulum);
  group.add(pendulumPivot);

  const gateTicks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, 0.46, 0.12),
    materials.brass,
    11,
  );
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 11; index += 1) {
    const angle = THREE.MathUtils.lerp(Math.PI * 0.78, Math.PI * 0.22, index / 10);
    dummy.position.set(Math.cos(angle) * 3.45, 6.02 + Math.sin(angle) * 3.1, 0);
    dummy.rotation.set(0, 0, angle - Math.PI * 0.5);
    dummy.scale.set(1, index % 5 === 0 ? 1.7 : 1, 1);
    dummy.updateMatrix();
    gateTicks.setMatrixAt(index, dummy.matrix);
  }
  gateTicks.instanceMatrix.needsUpdate = true;
  group.add(gateTicks);

  markShadows(group, true, true);
  return group;
}

function buildNeedlePylon(materials, phaseMaterials) {
  const group = new THREE.Group();
  group.name = 'meridian-needle-pylon';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.82, 0.42, 7), materials.stoneDark);
  base.position.y = 0.18;
  group.add(base);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 4.8, 7), materials.stoneTrim);
  shaft.position.y = 2.66;
  group.add(shaft);

  const cut = new THREE.Mesh(new THREE.ConeGeometry(0.37, 1.76, 5), materials.brassDark);
  cut.position.y = 5.83;
  cut.rotation.y = Math.PI / 5;
  group.add(cut);

  const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), materials.glow);
  eye.position.set(0, 5.23, 0.3);
  eye.scale.y = 1.45;
  group.add(eye);
  if (!phaseMaterials.includes(eye.material)) phaseMaterials.push(eye.material);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.045, 5, 22), materials.brass);
  halo.position.y = 5.23;
  group.add(halo);

  markShadows(group, true, true);
  return group;
}

function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    name: 'storm-vault-sky',
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uFlash: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec3 vDirection;
      uniform float uTime;
      uniform float uPhase;
      uniform float uFlash;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 direction = normalize(vDirection);
        float height = direction.y * 0.5 + 0.5;
        float phaseTwo = smoothstep(0.04, 0.50, uPhase);
        float phaseThree = smoothstep(0.54, 0.99, uPhase);

        vec3 nadir = mix(vec3(0.006, 0.014, 0.045), vec3(0.12, 0.018, 0.006), phaseTwo);
        vec3 horizon = mix(vec3(0.045, 0.15, 0.27), vec3(0.48, 0.075, 0.008), phaseTwo);
        vec3 zenith = mix(vec3(0.012, 0.025, 0.105), vec3(0.115, 0.008, 0.028), phaseTwo);
        nadir = mix(nadir, vec3(0.002, 0.001, 0.009), phaseThree);
        horizon = mix(horizon, vec3(0.19, 0.012, 0.36), phaseThree);
        zenith = mix(zenith, vec3(0.007, 0.002, 0.024), phaseThree);
        vec3 color = mix(nadir, horizon, smoothstep(0.05, 0.48, height));
        color = mix(color, zenith, smoothstep(0.5, 0.94, height));

        float stormBand = sin(direction.x * 10.0 + direction.z * 7.0 + direction.y * 17.0 + uTime * 0.018);
        stormBand += sin(direction.x * 23.0 - direction.z * 13.0 + uTime * 0.012) * 0.5;
        vec3 stormColor = mix(vec3(0.025, 0.05, 0.09), vec3(0.20, 0.025, 0.008), phaseTwo);
        stormColor = mix(stormColor, vec3(0.07, 0.008, 0.13), phaseThree);
        color += stormColor * smoothstep(0.38, 1.18, stormBand) * (1.15 - height);

        vec2 starCell = floor((direction.xz / max(0.16, 1.0 + direction.y)) * 420.0);
        float star = step(mix(0.9975, 0.9925, phaseThree), hash21(starCell));
        star *= smoothstep(0.48, 0.86, height);
        vec3 starColor = mix(vec3(0.42, 0.66, 0.98), vec3(1.0, 0.47, 0.17), phaseTwo);
        starColor = mix(starColor, vec3(0.80, 0.50, 1.0), phaseThree);
        color += starColor * star * mix(0.42, 1.0, phaseThree);

        float meridianGlow = exp(-abs(direction.x * 0.72 + direction.y * 0.26 + 0.04) * 35.0);
        vec3 phaseColor = mix(vec3(0.025, 0.22, 0.34), vec3(0.70, 0.14, 0.015), phaseTwo);
        phaseColor = mix(phaseColor, vec3(0.43, 0.025, 0.82), phaseThree);
        color += phaseColor * meridianGlow * mix(0.38, 0.72, max(phaseTwo, phaseThree));

        float emberHorizon = exp(-abs(height - 0.45) * 19.0) * phaseTwo * (1.0 - phaseThree);
        float solarVein = pow(max(0.0, sin(direction.x * 31.0 + direction.z * 17.0 + uTime * 0.055)), 24.0);
        color += vec3(0.62, 0.08, 0.008) * emberHorizon * (0.32 + solarVein * 0.62);

        float rift = exp(-abs(direction.x + sin(direction.y * 5.0 + uTime * 0.008) * 0.026) * 44.0) * phaseThree;
        color *= 1.0 - rift * 0.62;
        color += vec3(0.48, 0.035, 0.92) * pow(rift, 3.2) * 0.72;
        color += vec3(0.17, 0.24, 0.36) * uFlash;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function makeStormMaterial() {
  return new THREE.ShaderMaterial({
    name: 'storm-sea-clouds',
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uIntensity: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPhase;
      uniform float uIntensity;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.54;
        mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
        for (int octave = 0; octave < 4; octave++) {
          value += noise(p) * amplitude;
          p = turn * p * 2.02 + 17.1;
          amplitude *= 0.48;
        }
        return value;
      }

      void main() {
        vec2 centered = vUv - 0.5;
        vec2 drift = vec2(uTime * 0.007, -uTime * 0.004);
        float broad = fbm(centered * 5.5 + drift);
        float detail = fbm(centered * 13.0 - drift * 2.4);
        float cloud = smoothstep(0.43, 0.88, broad * 0.76 + detail * 0.38);
        float fissure = pow(max(0.0, sin((centered.x + centered.y * 0.4) * 27.0 + detail * 9.0)), 18.0);
        vec3 cold = vec3(0.025, 0.095, 0.17);
        vec3 warm = vec3(0.52, 0.075, 0.008);
        vec3 rupture = vec3(0.31, 0.015, 0.58);
        vec3 stormPhase = uPhase < 0.5
          ? mix(cold, warm, uPhase * 2.0)
          : mix(warm, rupture, (uPhase - 0.5) * 2.0);
        vec3 cloudDark = uPhase < 0.5
          ? mix(vec3(0.035, 0.06, 0.11), vec3(0.16, 0.025, 0.018), uPhase * 2.0)
          : mix(vec3(0.16, 0.025, 0.018), vec3(0.025, 0.006, 0.045), (uPhase - 0.5) * 2.0);
        vec3 cloudLight = uPhase < 0.5
          ? mix(vec3(0.27, 0.43, 0.58), vec3(0.72, 0.20, 0.035), uPhase * 2.0)
          : mix(vec3(0.72, 0.20, 0.035), vec3(0.38, 0.12, 0.58), (uPhase - 0.5) * 2.0);
        vec3 cloudColor = mix(cloudDark, cloudLight, cloud);
        cloudColor += stormPhase * fissure * (0.5 + uIntensity * 0.85 + uPhase * 0.25);
        float fade = 1.0 - smoothstep(0.38, 0.72, length(centered));
        gl_FragColor = vec4(cloudColor, (0.52 + cloud * 0.34) * fade);
      }
    `,
  });
}

function disposeHierarchy(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      if (material.uniforms) {
        for (const uniform of Object.values(material.uniforms)) {
          if (uniform?.value?.isTexture) textures.add(uniform.value);
        }
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function createReflectionEnvironment(renderer) {
  if (!renderer || typeof THREE.PMREMGenerator !== 'function') return null;
  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color(0x080b13);
  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panels = [];

  function addPanel(name, position, scale, color) {
    const panel = new THREE.Mesh(panelGeometry, new THREE.MeshBasicMaterial({
      name,
      color,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    panel.position.set(...position);
    panel.scale.set(...scale);
    panel.lookAt(0, 0.8, 0);
    environmentScene.add(panel);
    panels.push(panel);
  }

  // Broad sources create readable, filmic material bands rather than tiny
  // pinprick highlights. They are captured once into a prefiltered cube map;
  // no extra lights or draw calls remain in live combat.
  addPanel('warm-reflection-bank', [-4.8, 3.1, 3.6], [3.2, 5.8, 1], new THREE.Color(1.7, 1.12, 0.68));
  addPanel('cool-reflection-bank', [4.5, 2.2, -3.8], [3.8, 4.8, 1], new THREE.Color(0.45, 0.9, 1.7));
  addPanel('overhead-reflection-bank', [0, 6.2, 0.4], [5.4, 4.2, 1], new THREE.Color(1.35, 1.48, 1.7));
  addPanel('low-violet-reflection-bank', [-0.6, -3.8, -1.5], [6.2, 5.2, 1], new THREE.Color(0.22, 0.11, 0.3));

  const generator = new THREE.PMREMGenerator(renderer);
  // Stay inside Three's bounded PMREM kernel. The previous 0.055 sigma asked
  // for 27 taps against a 20-tap ceiling and emitted two startup warnings.
  const target = generator.fromScene(environmentScene, 0.038, 0.1, 24);
  target.texture.name = 'meridian-prefiltered-character-reflections';
  generator.dispose();
  for (const panel of panels) panel.material.dispose();
  panelGeometry.dispose();
  return target;
}

export function createWorld(scene, renderer) {
  const arenaRadius = ARENA_RADIUS;
  const finalPlayerRadius = FINAL_PLAYER_RADIUS;
  const finalBossOrbitRadius = FINAL_BOSS_ORBIT_RADIUS;
  const floorY = FLOOR_Y;
  const arenaGroup = new THREE.Group();
  const skyGroup = new THREE.Group();
  arenaGroup.name = 'the-meridian-arena';
  skyGroup.name = 'storm-vault';
  scene.add(skyGroup, arenaGroup);

  const previousSceneState = {
    background: scene.background,
    fog: scene.fog,
    environment: scene.environment,
  };
  const previousRendererState = renderer ? {
    shadowEnabled: renderer.shadowMap.enabled,
    shadowType: renderer.shadowMap.type,
    toneMapping: renderer.toneMapping,
    toneMappingExposure: renderer.toneMappingExposure,
    outputColorSpace: renderer.outputColorSpace,
  } : null;

  const worldBackground = new THREE.Color(COLORS.void);
  const worldFog = new THREE.FogExp2(COLORS.storm, 0.0068);
  scene.background = worldBackground;
  scene.fog = worldFog;
  const reflectionEnvironment = createReflectionEnvironment(renderer);
  if (reflectionEnvironment) scene.environment = reflectionEnvironment.texture;

  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const surfaceTexture = makeSurfaceTexture(renderer);
  const stoneMapOptions = surfaceTexture ? { map: surfaceTexture } : {};
  const materials = {
    floor: new THREE.MeshStandardMaterial({
      name: 'meridian-mineral-floor',
      color: COLORS.stone,
      roughness: 0.69,
      metalness: 0.18,
      ...stoneMapOptions,
    }),
    floorAlt: new THREE.MeshStandardMaterial({
      name: 'meridian-panel-alternate',
      color: 0x414858,
      roughness: 0.61,
      metalness: 0.21,
      ...stoneMapOptions,
    }),
    floorDark: new THREE.MeshStandardMaterial({
      name: 'meridian-panel-shadow',
      color: 0x1a1f2b,
      roughness: 0.76,
      metalness: 0.12,
      ...stoneMapOptions,
    }),
    stone: new THREE.MeshStandardMaterial({
      name: 'architectural-blue-stone',
      color: COLORS.stone,
      roughness: 0.77,
      metalness: 0.08,
      ...stoneMapOptions,
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      name: 'architectural-dark-stone',
      color: COLORS.blueBlack,
      roughness: 0.82,
      metalness: 0.1,
      ...stoneMapOptions,
    }),
    stoneTrim: new THREE.MeshStandardMaterial({
      name: 'architectural-cut-stone',
      color: COLORS.stoneLight,
      roughness: 0.59,
      metalness: 0.16,
      ...stoneMapOptions,
    }),
    statue: new THREE.MeshStandardMaterial({
      name: 'weathered-witness-stone',
      color: COLORS.stonePale,
      roughness: 0.84,
      metalness: 0.03,
      ...stoneMapOptions,
    }),
    statueLight: new THREE.MeshStandardMaterial({
      name: 'witness-worn-edges',
      color: 0xb0b7bc,
      roughness: 0.8,
      metalness: 0.02,
      ...stoneMapOptions,
    }),
    brass: new THREE.MeshStandardMaterial({
      name: 'warm-meridian-brass',
      color: COLORS.brass,
      roughness: 0.27,
      metalness: 0.88,
      emissive: 0x211205,
      emissiveIntensity: 0.34,
    }),
    brassDark: new THREE.MeshStandardMaterial({
      name: 'aged-meridian-brass',
      color: COLORS.brassDark,
      roughness: 0.42,
      metalness: 0.81,
      emissive: 0x130a02,
      emissiveIntensity: 0.18,
    }),
    channel: new THREE.MeshStandardMaterial({
      name: 'recessed-meridian-channel',
      color: 0x30271f,
      roughness: 0.72,
      metalness: 0.38,
      emissive: 0x080401,
      emissiveIntensity: 0.035,
    }),
    ink: new THREE.MeshStandardMaterial({
      name: 'engraving-ink',
      color: COLORS.ink,
      roughness: 0.91,
      metalness: 0.05,
    }),
    glow: new THREE.MeshStandardMaterial({
      name: 'borrowed-second-light',
      color: 0xb8e9ff,
      roughness: 0.3,
      metalness: 0.38,
      emissive: COLORS.phaseBlue,
      emissiveIntensity: 1.65,
    }),
    cloudMetal: new THREE.MeshStandardMaterial({
      name: 'undercroft-dark-metal',
      color: 0x111725,
      roughness: 0.47,
      metalness: 0.71,
    }),
  };

  const phaseMaterials = [materials.glow];
  const rotators = [];
  const floaters = [];

  // The arena is a built object: a deep suspended mechanism rather than a thin disc.
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(19.9, 21.15, 1.34, 96, 2),
    materials.stoneDark,
  );
  slab.name = 'arena-load-bearing-slab';
  slab.position.y = -0.72;
  slab.receiveShadow = true;
  slab.castShadow = true;
  arenaGroup.add(slab);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(19.55, 19.82, 0.16, 96, 1),
    materials.floor,
  );
  top.name = 'arena-authored-floor';
  top.position.y = -0.07;
  top.receiveShadow = true;
  arenaGroup.add(top);

  const undercroft = new THREE.Mesh(
    new THREE.CylinderGeometry(9.7, 2.1, 12.6, 16, 3),
    materials.stoneDark,
  );
  undercroft.name = 'suspended-meridian-undercroft';
  undercroft.position.y = -7.62;
  undercroft.rotation.y = Math.PI / 16;
  undercroft.castShadow = true;
  undercroft.receiveShadow = true;
  arenaGroup.add(undercroft);

  const undercroftCore = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 0.08, 10.8, 10, 1),
    materials.cloudMetal,
  );
  undercroftCore.position.y = -16.9;
  undercroftCore.rotation.y = Math.PI / 10;
  arenaGroup.add(undercroftCore);

  for (let level = 0; level < 4; level += 1) {
    const ring = orientHorizontal(new THREE.Mesh(
      new THREE.TorusGeometry(14.7 - level * 2.25, 0.15 + level * 0.014, 7, 64),
      level % 2 === 0 ? materials.brassDark : materials.cloudMetal,
    ));
    ring.position.y = -1.38 - level * 2.1;
    ring.rotation.z = level * 0.09;
    arenaGroup.add(ring);
    rotators.push({ object: ring, speed: (level % 2 ? -1 : 1) * (0.008 + level * 0.003), base: ring.rotation.y });
  }

  const innerPanelsA = new THREE.Mesh(
    sectorBandGeometry(4.65, 13.82, 12, 0.035, Math.PI / 12, 0),
    materials.floorAlt,
  );
  const innerPanelsB = new THREE.Mesh(
    sectorBandGeometry(4.65, 13.82, 12, 0.035, Math.PI / 12, 1),
    materials.floorDark,
  );
  const outerPanelsA = new THREE.Mesh(
    sectorBandGeometry(14.18, 19.22, 24, 0.06, Math.PI / 24, 0),
    materials.floorAlt,
  );
  const outerPanelsB = new THREE.Mesh(
    sectorBandGeometry(14.18, 19.22, 24, 0.06, Math.PI / 24, 1),
    materials.floorDark,
  );
  for (const panels of [innerPanelsA, innerPanelsB, outerPanelsA, outerPanelsB]) {
    panels.position.y = 0.018;
    panels.receiveShadow = true;
    arenaGroup.add(panels);
  }

  // Twelve fitted outer veneers make phase I read as one complete celestial
  // instrument. During phase II they rise by only a few centimetres (the
  // collision surface remains truthfully flat) and drift apart to expose a
  // bright escapement seam. During rupture they fall below the void mask.
  const fractureGlowMaterial = new THREE.MeshBasicMaterial({
    name: 'phase-two-exposed-gold-seam',
    color: COLORS.phaseGold,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const fractureSectors = [];
  const fractureSectorInner = 12.42;
  const fractureSectorOuter = 18.86;
  const fractureSectorMiddle = (fractureSectorInner + fractureSectorOuter) * 0.5;
  const fractureSectorArc = TAU / 12 * 0.89;
  const fractureSectorGeometry = sectorPlateGeometry(
    fractureSectorInner,
    fractureSectorOuter,
    fractureSectorArc,
    9,
    0.105,
  );
  const fractureSeamGeometry = new THREE.BoxGeometry(0.052, 0.018, 5.72);
  for (let sectorIndex = 0; sectorIndex < 12; sectorIndex += 1) {
    const angle = sectorIndex / 12 * TAU;
    const parity = sectorIndex % 2 === 0 ? 1 : -1;
    const root = new THREE.Group();
    root.name = `separating-dial-sector-${sectorIndex + 1}`;
    root.position.set(
      Math.sin(angle) * fractureSectorMiddle,
      0.073,
      Math.cos(angle) * fractureSectorMiddle,
    );
    root.rotation.y = angle;

    const plate = new THREE.Mesh(
      fractureSectorGeometry,
      sectorIndex % 2 === 0 ? materials.floorAlt : materials.floorDark,
    );
    plate.castShadow = true;
    plate.receiveShadow = true;
    root.add(plate);

    const seam = new THREE.Mesh(fractureSeamGeometry, fractureGlowMaterial);
    seam.position.set(0, 0.018, 0.04);
    seam.renderOrder = 3;
    root.add(seam);

    arenaGroup.add(root);
    fractureSectors.push({ root, angle, parity, phase: sectorIndex * 0.71 });
  }

  const ringDefinitions = [
    [4.42, 4.62, materials.brass],
    [6.82, 6.91, materials.brassDark],
    [9.76, 9.86, materials.brassDark],
    [13.84, 14.13, materials.brass],
    [17.32, 17.41, materials.brassDark],
    [18.47, 18.6, materials.glow],
    [19.23, 19.5, materials.brass],
  ];
  for (const [inside, outside, material] of ringDefinitions) {
    const ring = orientHorizontal(new THREE.Mesh(new THREE.RingGeometry(inside, outside, 96), material));
    ring.position.y = 0.034 + (material === materials.glow ? 0.012 : 0);
    ring.receiveShadow = true;
    arenaGroup.add(ring);
  }

  // The four cardinal channels remain strong navigation anchors.  The other
  // twenty are narrow, recessed cuts so boss lanes and sector warnings own the
  // floor hierarchy instead of competing with a brass sunburst.
  const dummy = new THREE.Object3D();
  const minorSpokeGeometry = new THREE.BoxGeometry(0.032, 0.016, 8.55);
  minorSpokeGeometry.translate(0, 0, 4.275);
  const minorSpokes = new THREE.InstancedMesh(minorSpokeGeometry, materials.channel, 20);
  minorSpokes.name = 'twenty-recessed-meridian-channels';
  let minorSpokeIndex = 0;
  for (let spoke = 0; spoke < 24; spoke += 1) {
    if (spoke % 6 === 0) continue;
    dummy.position.set(0, 0.054, 4.72);
    dummy.rotation.set(0, spoke / 24 * TAU, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    minorSpokes.setMatrixAt(minorSpokeIndex, dummy.matrix);
    minorSpokeIndex += 1;
  }
  minorSpokes.instanceMatrix.needsUpdate = true;
  minorSpokes.receiveShadow = true;
  arenaGroup.add(minorSpokes);

  const cardinalSpokeGeometry = new THREE.BoxGeometry(0.112, 0.03, 8.55);
  cardinalSpokeGeometry.translate(0, 0, 4.275);
  const cardinalSpokes = new THREE.InstancedMesh(cardinalSpokeGeometry, materials.brassDark, 4);
  cardinalSpokes.name = 'four-cardinal-meridian-channels';
  for (let spoke = 0; spoke < 4; spoke += 1) {
    dummy.position.set(0, 0.055, 4.72);
    dummy.rotation.set(0, spoke / 4 * TAU, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    cardinalSpokes.setMatrixAt(spoke, dummy.matrix);
  }
  cardinalSpokes.instanceMatrix.needsUpdate = true;
  cardinalSpokes.receiveShadow = true;
  arenaGroup.add(cardinalSpokes);

  const tickGeometry = new THREE.BoxGeometry(0.09, 0.052, 0.64);
  const ticks = new THREE.InstancedMesh(tickGeometry, materials.brass, 60);
  ticks.name = 'sixty-second-index';
  for (let tick = 0; tick < 60; tick += 1) {
    const angle = tick / 60 * TAU;
    const major = tick % 5 === 0;
    const cardinal = tick % 15 === 0;
    dummy.position.set(Math.sin(angle) * 17.91, 0.071, Math.cos(angle) * 17.91);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(cardinal ? 2.3 : major ? 1.45 : 0.7, 1, major ? 1.38 : 0.72);
    dummy.updateMatrix();
    ticks.setMatrixAt(tick, dummy.matrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  arenaGroup.add(ticks);

  // The final phase contracts the playable radius to 12 m. This bright inner
  // fracture lip is the exact visual promise of that collision boundary.
  const phaseClosureMaterial = new THREE.MeshBasicMaterial({
    name: 'final-phase-closure-light',
    color: COLORS.phaseWhite,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const phaseClosureRing = orientHorizontal(new THREE.Mesh(
    new THREE.RingGeometry(finalPlayerRadius - 0.17, finalPlayerRadius + 0.08, 128),
    phaseClosureMaterial,
  ));
  phaseClosureRing.name = 'visible-final-phase-boundary';
  phaseClosureRing.position.y = 0.082;
  phaseClosureRing.renderOrder = 3;
  phaseClosureRing.visible = false;
  arenaGroup.add(phaseClosureRing);

  const phaseClosureTicks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.10, 0.025, 0.82),
    phaseClosureMaterial,
    48,
  );
  phaseClosureTicks.name = 'final-phase-boundary-index';
  for (let tick = 0; tick < 48; tick += 1) {
    const angle = tick / 48 * TAU;
    dummy.position.set(Math.sin(angle) * (finalPlayerRadius - 0.035), 0.087, Math.cos(angle) * (finalPlayerRadius - 0.035));
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(tick % 4 === 0 ? 1.8 : 0.72, 1, tick % 4 === 0 ? 1.26 : 0.74);
    dummy.updateMatrix();
    phaseClosureTicks.setMatrixAt(tick, dummy.matrix);
  }
  phaseClosureTicks.instanceMatrix.needsUpdate = true;
  phaseClosureTicks.renderOrder = 3;
  phaseClosureTicks.visible = false;
  arenaGroup.add(phaseClosureTicks);

  // The final platform is not merely outlined: an opaque depth layer hides
  // the old dial from 12.08 m outward, a recessed inner wall gives the gap
  // thickness, and violet fracture veins make the unreachable space legible
  // even during the boss's brightest missile patterns.
  const ruptureVoidMaterial = new THREE.MeshBasicMaterial({
    name: 'final-phase-bottomless-chasm',
    color: 0x010107,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ruptureGlowMaterial = new THREE.MeshBasicMaterial({
    name: 'final-phase-violet-underlight',
    color: COLORS.phaseViolet,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ruptureWallMaterial = new THREE.MeshStandardMaterial({
    name: 'exposed-platform-depth',
    color: 0x080713,
    roughness: 0.72,
    metalness: 0.38,
    emissive: 0x3b0758,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  });
  const ruptureGroup = new THREE.Group();
  ruptureGroup.name = 'truthful-final-arena-rupture';
  ruptureGroup.userData.playerCollisionRadius = finalPlayerRadius;
  ruptureGroup.userData.chasmStartsAt = finalPlayerRadius + 0.075;
  ruptureGroup.visible = false;
  arenaGroup.add(ruptureGroup);

  const chasmMask = orientHorizontal(new THREE.Mesh(
    new THREE.RingGeometry(finalPlayerRadius + 0.075, 19.5, 128),
    ruptureVoidMaterial,
  ));
  chasmMask.name = 'unreachable-chasm-surface-mask';
  chasmMask.position.y = 0.112;
  chasmMask.renderOrder = 5;
  ruptureGroup.add(chasmMask);

  const chasmInnerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      finalPlayerRadius + 0.14,
      finalPlayerRadius + 0.48,
      7.4,
      72,
      1,
      true,
    ),
    ruptureWallMaterial,
  );
  chasmInnerWall.name = 'visible-central-platform-depth-wall';
  chasmInnerWall.position.y = -3.66;
  ruptureGroup.add(chasmInnerWall);

  const chasmRim = orientHorizontal(new THREE.Mesh(
    new THREE.RingGeometry(finalPlayerRadius + 0.015, finalPlayerRadius + 0.24, 128),
    ruptureGlowMaterial,
  ));
  chasmRim.name = 'violet-chasm-inner-rim';
  chasmRim.position.y = 0.126;
  chasmRim.renderOrder = 6;
  ruptureGroup.add(chasmRim);

  const chasmVeinGeometry = new THREE.BoxGeometry(0.055, 0.018, 5.55);
  const chasmVeins = new THREE.InstancedMesh(chasmVeinGeometry, ruptureGlowMaterial, 20);
  chasmVeins.name = 'twenty-visible-chasm-depth-streaks';
  for (let vein = 0; vein < 20; vein += 1) {
    const angle = vein / 20 * TAU + (vein % 2) * 0.035;
    const radius = 15.25 + (vein % 3) * 0.18;
    dummy.position.set(Math.sin(angle) * radius, 0.132, Math.cos(angle) * radius);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(vein % 4 === 0 ? 1.55 : 0.62, 1, 0.82 + (vein % 5) * 0.08);
    dummy.updateMatrix();
    chasmVeins.setMatrixAt(vein, dummy.matrix);
  }
  chasmVeins.instanceMatrix.needsUpdate = true;
  chasmVeins.renderOrder = 6;
  ruptureGroup.add(chasmVeins);

  // An elevated, broken orbital rail describes the boss-only route. It is
  // centered exactly on finalBossOrbitRadius and never masquerades as a path
  // the grounded player can reach.
  const bossOrbitGroup = new THREE.Group();
  bossOrbitGroup.name = 'unreachable-aerial-boss-orbit';
  bossOrbitGroup.userData.radius = finalBossOrbitRadius;
  bossOrbitGroup.userData.nominalFlightY = 5.2;
  bossOrbitGroup.userData.playerReachable = false;
  bossOrbitGroup.visible = false;
  arenaGroup.add(bossOrbitGroup);
  const bossOrbitSegments = [];
  const orbitSegmentArc = TAU / 10 * 0.57;
  const orbitPlateGeometry = sectorPlateGeometry(
    finalBossOrbitRadius - 0.72,
    finalBossOrbitRadius + 0.72,
    orbitSegmentArc,
    7,
    0.22,
  );
  const orbitInlayGeometry = sectorPlateGeometry(
    finalBossOrbitRadius - 0.47,
    finalBossOrbitRadius + 0.47,
    orbitSegmentArc * 0.78,
    6,
    0.025,
  );
  for (let orbitIndex = 0; orbitIndex < 10; orbitIndex += 1) {
    const angle = orbitIndex / 10 * TAU + Math.PI / 10;
    const root = new THREE.Group();
    root.name = `boss-orbit-fragment-${orbitIndex + 1}`;
    root.position.set(
      Math.sin(angle) * finalBossOrbitRadius,
      -7.5,
      Math.cos(angle) * finalBossOrbitRadius,
    );
    root.rotation.y = angle;

    const plate = new THREE.Mesh(
      orbitPlateGeometry,
      orbitIndex % 2 === 0 ? materials.stoneTrim : materials.floorDark,
    );
    plate.castShadow = true;
    plate.receiveShadow = true;
    root.add(plate);

    const inlay = new THREE.Mesh(orbitInlayGeometry, ruptureGlowMaterial);
    inlay.position.y = 0.035;
    inlay.renderOrder = 6;
    root.add(inlay);
    bossOrbitGroup.add(root);
    bossOrbitSegments.push({
      root,
      angle,
      phase: orbitIndex * 0.83,
      targetY: 2.7 + (orbitIndex % 3) * 0.58,
      roll: (orbitIndex % 2 === 0 ? 1 : -1) * (0.045 + (orbitIndex % 4) * 0.025),
    });
  }

  // Broken slabs rise beyond the boss rail rather than between the final-phase
  // camera and combatants. Their sparse, deterministic placement preserves the
  // ruptured silhouette without letting one near-camera boulder eat the HUD or
  // obscure a returned missile.
  const ruptureDebris = [];
  const debrisRandom = seededRandom(0x12ab155);
  const debrisGeometries = [
    new THREE.DodecahedronGeometry(0.78, 0),
    new THREE.TetrahedronGeometry(0.92, 0),
    new THREE.BoxGeometry(1.2, 0.42, 1.7, 1, 1, 1),
  ];
  for (let debrisIndex = 0; debrisIndex < 22; debrisIndex += 1) {
    const angle = debrisRandom() * TAU;
    const radius = 22.5 + debrisRandom() * 9.5;
    const root = new THREE.Group();
    root.name = `levitating-rupture-debris-${debrisIndex + 1}`;
    root.position.set(Math.sin(angle) * radius, -9, Math.cos(angle) * radius);
    root.rotation.set(debrisRandom() * 0.7, angle + debrisRandom() * 0.8, debrisRandom() * 0.7);
    const shard = new THREE.Mesh(
      debrisGeometries[debrisIndex % debrisGeometries.length],
      debrisIndex % 4 === 0 ? materials.brassDark : debrisIndex % 2 === 0 ? materials.floorAlt : materials.stoneDark,
    );
    shard.scale.set(
      0.4 + debrisRandom() * 0.42,
      0.18 + debrisRandom() * 0.32,
      0.4 + debrisRandom() * 0.5,
    );
    // These distant fragments are already shaded and fogged; omitting them
    // from the animated key-light pass saves 22 invisible shadow submissions.
    shard.castShadow = false;
    shard.receiveShadow = true;
    root.add(shard);
    root.visible = false;
    arenaGroup.add(root);
    ruptureDebris.push({
      root,
      angle,
      radius,
      phase: debrisRandom() * TAU,
      targetY: 0.5 + debrisRandom() * 4.9,
      spin: (debrisRandom() - 0.5) * 0.34,
      drift: 0.25 + debrisRandom() * 0.72,
    });
  }

  // The raised lip is segmented so the camera can open a narrow, moving
  // sightline through it without removing the arena boundary. A single torus
  // projected as two enormous foreground arcs whenever the camera was close
  // enough for Nera's authored shell to read.
  const boundary = new THREE.Group();
  boundary.name = 'broken-dial-lip';
  boundary.position.y = 0.2;
  boundary.rotation.x = -Math.PI * 0.5;
  const boundarySegmentCount = BOUNDARY_SEGMENT_COUNT;
  const boundarySegmentStep = BOUNDARY_SEGMENT_STEP;
  const boundarySegmentArc = BOUNDARY_SEGMENT_ARC;
  const boundarySegmentGeometry = new THREE.TorusGeometry(
    BOUNDARY_LIP_RADIUS,
    0.22,
    8,
    5,
    boundarySegmentArc,
  );
  const boundarySegments = new THREE.InstancedMesh(
    boundarySegmentGeometry,
    materials.stoneTrim,
    boundarySegmentCount,
  );
  boundarySegments.name = 'camera-occludable-dial-lip-segments';
  boundarySegments.castShadow = true;
  boundarySegments.receiveShadow = true;
  boundarySegments.frustumCulled = false;
  const boundarySegmentAngles = [];
  const boundarySegmentTransform = new THREE.Object3D();
  for (let index = 0; index < boundarySegmentCount; index += 1) {
    const angle = index * boundarySegmentStep;
    boundarySegmentAngles.push(angle);
    boundarySegmentTransform.position.set(0, 0, 0);
    boundarySegmentTransform.rotation.set(0, 0, -angle - boundarySegmentArc * 0.5);
    boundarySegmentTransform.scale.setScalar(1);
    boundarySegmentTransform.updateMatrix();
    boundarySegments.setMatrixAt(index, boundarySegmentTransform.matrix);
  }
  boundarySegments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  boundarySegments.instanceMatrix.needsUpdate = true;
  boundary.add(boundarySegments);
  arenaGroup.add(boundary);

  const boundaryTeeth = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.36, 0.78, 0.82),
    materials.stoneDark,
    24,
  );
  boundaryTeeth.name = 'dial-lip-teeth';
  for (let tooth = 0; tooth < 24; tooth += 1) {
    const angle = tooth / 24 * TAU;
    dummy.position.set(Math.sin(angle) * 19.68, 0.46, Math.cos(angle) * 19.68);
    dummy.rotation.set(0, angle, tooth % 2 === 0 ? 0.05 : -0.05);
    dummy.scale.set(tooth % 3 === 0 ? 1.25 : 0.82, tooth % 6 === 0 ? 1.45 : 0.72, 1);
    dummy.updateMatrix();
    boundaryTeeth.setMatrixAt(tooth, dummy.matrix);
  }
  boundaryTeeth.instanceMatrix.needsUpdate = true;
  boundaryTeeth.castShadow = true;
  boundaryTeeth.receiveShadow = true;
  arenaGroup.add(boundaryTeeth);

  // Phase II opens the arena's escapement: eight low dial shutters lift at the
  // lip while a crown of needle blades rises behind them.  Every part remains
  // outside the 18.25 m playable radius (the nearest shutter edge is 18.62 m),
  // so this is a truthful structural phase change rather than hidden collision.
  // In phase III the same mechanism tears outward and joins the levitating
  // wreckage beyond the new 12 m central platform.
  const phaseTwoStructures = [];
  const shutterGeometry = new THREE.BoxGeometry(4.05, 0.34, 0.76);
  const bladeGeometry = new THREE.BoxGeometry(0.34, 3.72, 0.52);
  bladeGeometry.translate(0, 1.86, 0);
  const bladeTipGeometry = new THREE.ConeGeometry(0.47, 1.08, 4, 1);
  const bladeCollarGeometry = new THREE.BoxGeometry(0.78, 0.22, 0.78);
  const bladeInlayGeometry = new THREE.BoxGeometry(0.075, 2.76, 0.035);

  for (let escapement = 0; escapement < 8; escapement += 1) {
    const angle = Math.PI / 8 + escapement / 8 * TAU;
    const parity = escapement % 2 === 0 ? 1 : -1;

    const shutterRoot = new THREE.Group();
    shutterRoot.name = `phase-two-dial-shutter-${escapement + 1}`;
    shutterRoot.position.set(Math.sin(angle) * 19, -0.33, Math.cos(angle) * 19);
    shutterRoot.rotation.y = angle;
    const shutter = new THREE.Mesh(
      shutterGeometry,
      escapement % 2 === 0 ? materials.stoneTrim : materials.stoneDark,
    );
    shutter.castShadow = true;
    shutter.receiveShadow = true;
    shutterRoot.add(shutter);
    arenaGroup.add(shutterRoot);

    const bladeRoot = new THREE.Group();
    bladeRoot.name = `phase-two-escapement-blade-${escapement + 1}`;
    bladeRoot.position.set(Math.sin(angle) * 20.22, -4.78, Math.cos(angle) * 20.22);
    bladeRoot.rotation.y = angle;

    const blade = new THREE.Mesh(bladeGeometry, materials.stoneTrim);
    blade.castShadow = true;
    blade.receiveShadow = true;
    bladeRoot.add(blade);

    const tip = new THREE.Mesh(bladeTipGeometry, materials.brass);
    tip.position.y = 4.22;
    tip.rotation.y = Math.PI * 0.25;
    tip.castShadow = true;
    bladeRoot.add(tip);

    const collar = new THREE.Mesh(bladeCollarGeometry, materials.brassDark);
    collar.position.y = 0.54;
    collar.rotation.y = Math.PI * 0.25;
    collar.castShadow = true;
    bladeRoot.add(collar);

    const inlay = new THREE.Mesh(bladeInlayGeometry, materials.glow);
    inlay.position.set(0, 2.08, -0.278);
    bladeRoot.add(inlay);

    arenaGroup.add(bladeRoot);
    phaseTwoStructures.push({
      shutterRoot,
      shutter,
      bladeRoot,
      parity,
      baseAngle: angle,
    });
  }

  const centralDial = new THREE.Mesh(
    new THREE.CylinderGeometry(4.52, 4.6, 0.09, 64),
    materials.floorDark,
  );
  centralDial.name = 'keeper-dial';
  centralDial.position.y = -0.014;
  centralDial.receiveShadow = true;
  arenaGroup.add(centralDial);

  const star = new THREE.Mesh(new THREE.ShapeGeometry(makeStarShape(8, 3.58, 1.62)), materials.brassDark);
  star.name = 'eightfold-saint-mark';
  star.rotation.x = -Math.PI * 0.5;
  star.position.y = 0.04;
  star.receiveShadow = true;
  arenaGroup.add(star);

  const starInset = new THREE.Mesh(new THREE.ShapeGeometry(makeStarShape(8, 2.71, 1.28)), materials.floorAlt);
  starInset.rotation.x = -Math.PI * 0.5;
  starInset.rotation.z = Math.PI / 8;
  starInset.position.y = 0.052;
  starInset.receiveShadow = true;
  arenaGroup.add(starInset);

  const dialHands = new THREE.Group();
  dialHands.name = 'living-dial-hands';
  dialHands.position.y = 0.086;
  const longHand = new THREE.Mesh(makeNeedleGeometry(3.85, 0.11, 0.52), materials.brass);
  longHand.rotation.x = -Math.PI * 0.5;
  longHand.rotation.z = Math.PI * 0.12;
  const shortHand = new THREE.Mesh(makeNeedleGeometry(2.52, 0.17, 0.43), materials.statueLight);
  shortHand.rotation.x = -Math.PI * 0.5;
  shortHand.rotation.z = -Math.PI * 0.64;
  dialHands.add(longHand, shortHand);
  arenaGroup.add(dialHands);
  rotators.push({ object: dialHands, speed: 0.018, base: 0 });

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.2, 10), materials.glow);
  hub.position.y = 0.15;
  arenaGroup.add(hub);

  const crackRandom = seededRandom(0xb16c10c);
  for (let crack = 0; crack < 11; crack += 1) {
    const mark = new THREE.Mesh(makeFlatCrackGeometry(crackRandom, 7.2, 18.6), materials.ink);
    mark.position.y = 0.061;
    mark.receiveShadow = true;
    arenaGroup.add(mark);
  }

  // Four cardinal gates frame the fight; the diagonal witnesses watch from detached plinths.
  const gatePrototype = buildHourGate(materials);
  const hourGates = [];
  for (let gateIndex = 0; gateIndex < 4; gateIndex += 1) {
    const angle = gateIndex / 4 * TAU;
    const gate = gatePrototype.clone(true);
    // Keep the monumental arches in the silhouette band instead of letting
    // their near curves sweep across the active combat plane at wide FOV.
    gate.position.set(Math.sin(angle) * 31.5, floorY, Math.cos(angle) * 31.5);
    gate.rotation.y = angle;
    gate.scale.setScalar(0.56);
    arenaGroup.add(gate);
    hourGates.push(gate);
    const pendulumPivot = gate.getObjectByName('gate-pendulum-pivot');
    if (pendulumPivot) {
      floaters.push({
        object: pendulumPivot,
        baseY: pendulumPivot.position.y,
        phase: gateIndex * Math.PI * 0.5,
        amount: 0.08,
        sway: true,
      });
    }
  }

  const witnessPrototype = buildWitnessStatue(materials);
  for (let witnessIndex = 0; witnessIndex < 4; witnessIndex += 1) {
    const angle = Math.PI * 0.25 + witnessIndex / 4 * TAU;
    const witness = witnessPrototype.clone(true);
    witness.position.set(Math.sin(angle) * 22.15, floorY - 0.02, Math.cos(angle) * 22.15);
    witness.rotation.y = angle + Math.PI;
    witness.scale.setScalar(witnessIndex % 2 === 0 ? 1.03 : 0.94);
    arenaGroup.add(witness);
  }

  const pylonPrototype = buildNeedlePylon(materials, phaseMaterials);
  for (let pylonIndex = 0; pylonIndex < 8; pylonIndex += 1) {
    const angle = Math.PI / 8 + pylonIndex / 8 * TAU;
    const pylon = pylonPrototype.clone(true);
    pylon.position.set(Math.sin(angle) * 21.1, floorY - 0.02, Math.cos(angle) * 21.1);
    pylon.rotation.y = angle;
    pylon.scale.setScalar(pylonIndex % 2 === 0 ? 0.88 : 0.73);
    arenaGroup.add(pylon);
    floaters.push({ object: pylon, baseY: pylon.position.y, phase: pylonIndex * 0.7, amount: 0.045, sway: false });
  }

  // Lighting: one deliberate shadow-casting key, with inexpensive non-shadow accents.
  const hemisphere = new THREE.HemisphereLight(0xa9c8e1, 0x17101a, 1.18);
  hemisphere.name = 'storm-vault-ambient';
  skyGroup.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffe2ad, 3.25);
  keyLight.name = 'single-shadow-key';
  keyLight.position.set(-14, 28, 11);
  keyLight.target.position.set(0, 0, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 72;
  keyLight.shadow.camera.left = -28;
  keyLight.shadow.camera.right = 28;
  keyLight.shadow.camera.top = 28;
  keyLight.shadow.camera.bottom = -28;
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.036;
  keyLight.shadow.radius = 2;
  skyGroup.add(keyLight, keyLight.target);

  const rimLight = new THREE.DirectionalLight(0x6198ff, 1.72);
  rimLight.name = 'non-shadow-storm-rim';
  rimLight.position.set(18, 12, -15);
  rimLight.target.position.set(0, 2, 0);
  rimLight.castShadow = false;
  skyGroup.add(rimLight, rimLight.target);

  const underLight = new THREE.PointLight(COLORS.phaseBlue, 44, 62, 1.75);
  underLight.name = 'non-shadow-undercroft-glow';
  underLight.position.set(0, -8.5, 0);
  underLight.castShadow = false;
  skyGroup.add(underLight);

  const fractureStormLight = new THREE.PointLight(COLORS.phaseGold, 0, 54, 2);
  fractureStormLight.name = 'phase-two-gold-storm-light';
  fractureStormLight.position.set(-8, 10, 5);
  fractureStormLight.castShadow = false;
  skyGroup.add(fractureStormLight);

  const ruptureStormLight = new THREE.PointLight(COLORS.phaseViolet, 0, 52, 1.8);
  ruptureStormLight.name = 'phase-three-violet-chasm-light';
  ruptureStormLight.position.set(0, -2.5, 0);
  ruptureStormLight.castShadow = false;
  skyGroup.add(ruptureStormLight);

  const pulseLight = new THREE.PointLight(COLORS.phaseBlue, 0, 16, 2);
  pulseLight.name = 'non-shadow-impact-echo';
  pulseLight.castShadow = false;
  skyGroup.add(pulseLight);

  const skyMaterial = makeSkyMaterial();
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(132, 48, 28), skyMaterial);
  skyDome.name = 'procedural-storm-vault';
  skyDome.position.y = 12;
  skyDome.frustumCulled = false;
  skyGroup.add(skyDome);

  const stormMaterial = makeStormMaterial();
  const stormSea = new THREE.Mesh(new THREE.PlaneGeometry(168, 168), stormMaterial);
  stormSea.name = 'storm-sea-below-the-arena';
  stormSea.rotation.x = -Math.PI * 0.5;
  stormSea.position.y = -20.5;
  stormSea.renderOrder = -3;
  skyGroup.add(stormSea);

  const cloudLayer = new THREE.Group();
  cloudLayer.name = 'low-cloud-procession';
  skyGroup.add(cloudLayer);
  const cloudTexture = makeCloudTexture();
  let cloudMaterials = [];
  if (cloudTexture) {
    cloudMaterials = [0.16, 0.22, 0.29].map((opacity, index) => new THREE.SpriteMaterial({
      name: `storm-cloud-${index}`,
      map: cloudTexture,
      color: index === 2 ? 0x9bb5c7 : 0x526b82,
      opacity,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: true,
    }));
    cloudMaterials.forEach((material, index) => { material.userData.baseOpacity = [0.16, 0.22, 0.29][index]; });
    const cloudRandom = seededRandom(0x57a1c10d);
    for (let cloud = 0; cloud < 24; cloud += 1) {
      const angle = cloudRandom() * TAU;
      const radius = 23 + cloudRandom() * 61;
      const sprite = new THREE.Sprite(cloudMaterials[cloud % cloudMaterials.length]);
      sprite.position.set(
        Math.cos(angle) * radius,
        -9.5 - cloudRandom() * 17,
        Math.sin(angle) * radius,
      );
      const width = 15 + cloudRandom() * 25;
      sprite.scale.set(width, width * (0.32 + cloudRandom() * 0.2), 1);
      sprite.userData.baseY = sprite.position.y;
      sprite.userData.phase = cloudRandom() * TAU;
      cloudLayer.add(sprite);
    }
  }

  // A complete celestial dial sits behind the north gate in phase I. Its
  // fitted arcs separate in II and tear apart in III, mirroring the floor at
  // horizon scale instead of relying on a color grade alone.
  const celestialDial = new THREE.Group();
  celestialDial.name = 'transforming-celestial-meridian';
  celestialDial.position.set(-11, 24, -83);
  celestialDial.rotation.z = -0.24;
  const celestialMaterial = new THREE.MeshBasicMaterial({
    name: 'celestial-meridian-light',
    color: 0x86b8d5,
    transparent: true,
    opacity: 0.29,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
  });
  const celestialGold = celestialMaterial.clone();
  celestialGold.name = 'celestial-meridian-warm-light';
  celestialGold.color.setHex(0xd6a455);
  celestialGold.opacity = 0.18;
  const celestialCoreMaterial = new THREE.MeshBasicMaterial({
    name: 'celestial-body-core',
    color: 0x74c9ee,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    fog: true,
    toneMapped: false,
  });
  const celestialCoronaMaterial = new THREE.MeshBasicMaterial({
    name: 'celestial-body-corona',
    color: 0x7bdfff,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: false,
  });
  const celestialCore = new THREE.Mesh(new THREE.CircleGeometry(12.4, 64), celestialCoreMaterial);
  celestialCore.name = 'transforming-sun-eclipse-core';
  celestialCore.position.z = -0.42;
  celestialCore.renderOrder = -2;
  const celestialCorona = new THREE.Mesh(new THREE.RingGeometry(12.7, 16.8, 64), celestialCoronaMaterial);
  celestialCorona.name = 'transforming-sun-eclipse-corona';
  celestialCorona.position.z = -0.5;
  celestialCorona.renderOrder = -3;
  celestialDial.add(celestialCorona, celestialCore);
  const celestialSegments = [];
  const outerCelestialCount = 6;
  const innerCelestialCount = 8;
  const outerCelestialArc = TAU / outerCelestialCount * 0.986;
  const innerCelestialArc = TAU / innerCelestialCount * 0.978;
  const outerCelestialGeometry = new THREE.TorusGeometry(25.5, 0.2, 5, 20, outerCelestialArc);
  const innerCelestialGeometry = new THREE.TorusGeometry(21.5, 0.075, 5, 18, innerCelestialArc);
  for (let segmentIndex = 0; segmentIndex < outerCelestialCount; segmentIndex += 1) {
    const angle = segmentIndex / outerCelestialCount * TAU + Math.PI * 0.14;
    const segment = new THREE.Mesh(outerCelestialGeometry, celestialMaterial);
    segment.name = `celestial-outer-arc-${segmentIndex + 1}`;
    segment.rotation.z = angle;
    celestialDial.add(segment);
    celestialSegments.push({
      object: segment,
      baseRotation: angle,
      direction: new THREE.Vector2(Math.cos(angle), Math.sin(angle)),
      parity: segmentIndex % 2 === 0 ? 1 : -1,
      scale: 1,
    });
  }
  for (let segmentIndex = 0; segmentIndex < innerCelestialCount; segmentIndex += 1) {
    const angle = segmentIndex / innerCelestialCount * TAU - Math.PI * 0.36;
    const segment = new THREE.Mesh(innerCelestialGeometry, celestialGold);
    segment.name = `celestial-inner-arc-${segmentIndex + 1}`;
    segment.rotation.z = angle;
    celestialDial.add(segment);
    celestialSegments.push({
      object: segment,
      baseRotation: angle,
      direction: new THREE.Vector2(Math.cos(angle), Math.sin(angle)),
      parity: segmentIndex % 2 === 0 ? -1 : 1,
      scale: 0.72,
    });
  }

  const celestialTicks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 2.4, 0.18),
    celestialMaterial,
    28,
  );
  for (let tick = 0; tick < 28; tick += 1) {
    const angle = tick / 28 * TAU + 0.08;
    dummy.position.set(Math.cos(angle) * 23.4, Math.sin(angle) * 23.4, 0);
    dummy.rotation.set(0, 0, angle - Math.PI * 0.5);
    dummy.scale.set(tick % 7 === 0 ? 1.8 : 0.72, tick % 7 === 0 ? 1.45 : 0.62, 1);
    dummy.updateMatrix();
    celestialTicks.setMatrixAt(tick, dummy.matrix);
  }
  celestialTicks.instanceMatrix.needsUpdate = true;
  celestialDial.add(celestialTicks);

  const celestialHandLong = new THREE.Mesh(makeNeedleGeometry(19.5, 0.32, 1.6), celestialMaterial);
  const celestialHandShort = new THREE.Mesh(makeNeedleGeometry(12.8, 0.52, 1.3), celestialGold);
  celestialHandLong.rotation.z = 0.72;
  celestialHandShort.rotation.z = -1.15;
  celestialDial.add(celestialHandLong, celestialHandShort);
  skyGroup.add(celestialDial);
  rotators.push({ object: celestialHandLong, speed: 0.0032, base: celestialHandLong.rotation.z, axis: 'z' });
  rotators.push({ object: celestialHandShort, speed: -0.0015, base: celestialHandShort.rotation.z, axis: 'z' });

  // Pulses are pooled so repeated hits never allocate geometry, materials, or lights mid-fight.
  const pulsePool = [];
  const pulseGeometry = new THREE.RingGeometry(0.72, 1, 48);
  for (let index = 0; index < 10; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      name: `arena-impact-ring-${index}`,
      color: COLORS.phaseBlue,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = orientHorizontal(new THREE.Mesh(pulseGeometry, material));
    mesh.name = `pooled-impact-echo-${index}`;
    mesh.visible = false;
    mesh.renderOrder = 4;
    arenaGroup.add(mesh);
    pulsePool.push({ mesh, material, active: false, elapsed: 0, duration: 1, strength: 1 });
  }

  let disposed = false;
  let phaseGoal = 0;
  let phaseBlend = 0;
  let phaseTwoBlend = 0;
  let phaseThreeBlend = 0;
  let lastUpdateTime = 0;
  let lastCombatIntensity = 0;
  let pulseLightLife = 0;
  let pulseLightDuration = 0.36;
  let pulseLightStrength = 0;
  const activePhaseColor = new THREE.Color(COLORS.phaseBlue);
  const phaseBlue = new THREE.Color(COLORS.phaseBlue);
  const phaseGold = new THREE.Color(COLORS.phaseGold);
  const phaseViolet = new THREE.Color(COLORS.phaseViolet);
  const phaseBone = new THREE.Color(COLORS.bone);
  const phaseScarlet = new THREE.Color(0xff5b19);
  const phaseVoid = new THREE.Color(0x110018);
  const phaseColdLight = new THREE.Color(0xc7ecff);
  const phaseWarmLight = new THREE.Color(0xff9a45);
  const phaseVioletLight = new THREE.Color(0xc884ff);
  const phaseGroundCold = new THREE.Color(0x17101a);
  const phaseGroundWarm = new THREE.Color(0x3b0b04);
  const phaseGroundVoid = new THREE.Color(0x09000f);
  const cloudColdColors = [0x46647e, 0x607b92, 0x8eafc4].map((hex) => new THREE.Color(hex));
  const cloudWarmColors = [0x6d2116, 0x98351c, 0xd46a2a].map((hex) => new THREE.Color(hex));
  const cloudVoidColors = [0x21122f, 0x39204f, 0x6b3d82].map((hex) => new THREE.Color(hex));
  const fogBlue = new THREE.Color(COLORS.storm);
  const fogGold = new THREE.Color(0x431006);
  const fogViolet = new THREE.Color(0x12001d);
  const backgroundBlue = new THREE.Color(0x030817);
  const backgroundGold = new THREE.Color(0x240601);
  const backgroundViolet = new THREE.Color(0x020005);

  function setPhase(phase, { immediate = false } = {}) {
    if (disposed) return;
    if (typeof phase === 'string') {
      const normalized = phase.toLowerCase();
      if (normalized.includes('final') || normalized.includes('iii') || normalized.includes('three')) phaseGoal = 2;
      else if (normalized.includes('ii') || normalized.includes('two')) phaseGoal = 1;
      else phaseGoal = 0;
    } else {
      // Boss, audio, and UI phases are one-based; zero is accepted as an initial-state alias.
      const numericPhase = Number.isFinite(phase) ? Math.round(phase) : 0;
      phaseGoal = Math.max(0, Math.min(2, numericPhase <= 0 ? 0 : numericPhase - 1));
    }
    if (immediate) {
      phaseBlend = phaseGoal * 0.5;
      phaseTwoBlend = phaseGoal === 1 ? 1 : 0;
      phaseThreeBlend = phaseGoal === 2 ? 1 : 0;
      update(lastUpdateTime, 0, lastCombatIntensity);
    }
  }

  let occludedBoundarySegmentMask = -1;
  let occludedBoundarySegmentCount = 0;
  let nearCameraBoundarySegmentCount = 0;
  let compositionBoundarySegmentCount = 0;
  let screenCompositionBoundarySegmentCount = 0;
  let visibleCompositionBoundarySegmentCount = 0;
  let visibleScreenCompositionBoundarySegmentCount = 0;
  let occludedHourGateCount = 0;
  let sightlineHourGateCount = 0;
  let visibleSightlineHourGateCount = 0;
  let cameraCompositionFocusCount = 0;

  function setCameraOcclusion(cameraOrPosition, focusPosition = null, secondaryFocusPosition = null) {
    const cameraPosition = cameraOrPosition?.position || cameraOrPosition;
    if (disposed || !cameraPosition || hourGates.length === 0) return;
    const compositionFocuses = [focusPosition, secondaryFocusPosition].filter(Boolean);
    cameraCompositionFocusCount = compositionFocuses.length;
    let nearestIndex = 0;
    let nearestDistanceSq = Infinity;
    for (let index = 0; index < hourGates.length; index += 1) {
      const gate = hourGates[index];
      const dx = gate.position.x - cameraPosition.x;
      const dz = gate.position.z - cameraPosition.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestIndex = index;
      }
    }
    // Retain the existing near-camera guard, then also hide every arch whose
    // footprint intersects the live camera→player ray. The ray intentionally
    // continues beyond the focus point: an arch behind Nera can still project
    // through her during orbit and the airborne backflip. Nearest-only hiding
    // selected the wrong cardinal gate whenever the camera sat opposite the
    // actual sightline obstruction.
    const sightlineMask = hourGateCompositionMask(hourGates, cameraPosition, compositionFocuses);
    const hiddenGateMask = (1 << nearestIndex) | sightlineMask;
    occludedHourGateCount = 0;
    sightlineHourGateCount = 0;
    visibleSightlineHourGateCount = 0;
    hourGates.forEach((gate, index) => {
      const bit = 1 << index;
      const crossesSightline = Boolean(sightlineMask & bit);
      gate.visible = !Boolean(hiddenGateMask & bit);
      if (!gate.visible) occludedHourGateCount += 1;
      if (crossesSightline) sightlineHourGateCount += 1;
      if (crossesSightline && gate.visible) visibleSightlineHourGateCount += 1;
    });

    // The decorative torus lip is removed from the live camera presentation.
    // Its huge projected curves repeatedly crossed readable combat space even
    // when only four distant sectors survived. The floor rim, cardinal gates,
    // witnesses, pylons, collision and arena radius remain fully independent.
    if (!compositionFocuses.length) return;
    const boundaryMask = boundarySegmentOcclusionMask(
      boundarySegmentAngles,
      cameraOrPosition,
      compositionFocuses,
    );
    const hiddenMask = boundaryMask.hiddenMask;
    nearCameraBoundarySegmentCount = 0;
    compositionBoundarySegmentCount = 0;
    screenCompositionBoundarySegmentCount = 0;
    visibleCompositionBoundarySegmentCount = 0;
    visibleScreenCompositionBoundarySegmentCount = 0;
    for (let index = 0; index < boundarySegmentCount; index += 1) {
      const bit = 1 << index;
      if (boundaryMask.nearCameraMask & bit) nearCameraBoundarySegmentCount += 1;
      if (boundaryMask.compositionMask & bit) compositionBoundarySegmentCount += 1;
      if (boundaryMask.screenCompositionMask & bit) screenCompositionBoundarySegmentCount += 1;
      if ((boundaryMask.compositionMask & bit) && !(hiddenMask & bit)) {
        visibleCompositionBoundarySegmentCount += 1;
      }
      if ((boundaryMask.screenCompositionMask & bit) && !(hiddenMask & bit)) {
        visibleScreenCompositionBoundarySegmentCount += 1;
      }
    }
    if (hiddenMask !== occludedBoundarySegmentMask) {
      occludedBoundarySegmentMask = hiddenMask;
      occludedBoundarySegmentCount = 0;
      for (let index = 0; index < boundarySegmentCount; index += 1) {
        const angle = boundarySegmentAngles[index];
        const crossesSightline = Boolean(hiddenMask & (1 << index));
        if (crossesSightline) occludedBoundarySegmentCount += 1;
        // Keep the instance transform invertible: a literal zero scale can
        // produce undefined normal matrices on some WebGL drivers. Occluded
        // sectors collapse to 0.1% and park below the undercroft instead.
        boundarySegmentTransform.position.set(0, 0, crossesSightline ? -96 : 0);
        boundarySegmentTransform.rotation.set(0, 0, -angle - boundarySegmentArc * 0.5);
        boundarySegmentTransform.scale.setScalar(crossesSightline ? 0.001 : 1);
        boundarySegmentTransform.updateMatrix();
        boundarySegments.setMatrixAt(index, boundarySegmentTransform.matrix);
      }
      boundarySegments.instanceMatrix.needsUpdate = true;
    }
  }

  function pulse(position, color = COLORS.phaseBlue, strength = 1) {
    if (disposed || !position) return;
    let entry = pulsePool.find((candidate) => !candidate.active);
    if (!entry) entry = pulsePool.reduce((oldest, candidate) => candidate.elapsed > oldest.elapsed ? candidate : oldest, pulsePool[0]);

    const normalizedStrength = Math.max(0.15, Math.min(2.5, Number(strength) || 1));
    entry.active = true;
    entry.elapsed = 0;
    entry.duration = THREE.MathUtils.lerp(0.58, 1.05, clamp01(normalizedStrength / 2));
    entry.strength = normalizedStrength;
    entry.mesh.visible = true;
    entry.mesh.position.set(
      Number(position.x) || 0,
      Math.max(floorY + 0.065, Number(position.y) || floorY + 0.065),
      Number(position.z) || 0,
    );
    entry.mesh.scale.setScalar(0.22 + normalizedStrength * 0.08);
    entry.material.color.set(color);
    entry.material.opacity = Math.min(0.92, 0.48 + normalizedStrength * 0.2);

    pulseLight.position.copy(entry.mesh.position);
    pulseLight.position.y += 1.15;
    pulseLight.color.set(color);
    pulseLightLife = pulseLightDuration;
    pulseLightStrength = normalizedStrength;
  }

  function update(t = 0, dt = 0, intensity = 0) {
    if (disposed) return;
    const safeTime = Number.isFinite(t) ? t : 0;
    const safeDelta = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
    const combatIntensity = clamp01(intensity);
    lastUpdateTime = safeTime;
    lastCombatIntensity = combatIntensity;
    const targetBlend = phaseGoal * 0.5;
    phaseBlend += (targetBlend - phaseBlend) * (1 - Math.exp(-safeDelta * 3.0));
    const targetPhaseTwoBlend = phaseGoal === 1 ? 1 : 0;
    phaseTwoBlend += (targetPhaseTwoBlend - phaseTwoBlend) * (1 - Math.exp(-safeDelta * 3.8));
    const targetPhaseThreeBlend = phaseGoal === 2 ? 1 : 0;
    phaseThreeBlend += (targetPhaseThreeBlend - phaseThreeBlend) * (1 - Math.exp(-safeDelta * 2.65));
    const warmSkyAmount = clamp01(phaseBlend * 2);
    const voidSkyAmount = clamp01((phaseBlend - 0.5) * 2);

    if (phaseBlend < 0.52) activePhaseColor.copy(phaseBlue).lerp(phaseGold, phaseBlend / 0.52);
    else activePhaseColor.copy(phaseGold).lerp(phaseViolet, (phaseBlend - 0.52) / 0.48);
    const closureAmount = phaseThreeBlend * phaseThreeBlend * (3 - 2 * phaseThreeBlend);
    phaseClosureMaterial.color.copy(activePhaseColor);
    phaseClosureMaterial.opacity = closureAmount * (0.58 + Math.sin(safeTime * 5.2) * 0.07);
    phaseClosureRing.visible = closureAmount > 0.008;
    phaseClosureTicks.visible = closureAmount > 0.008;

    // The independent envelope avoids replaying the phase-II crown when a
    // rematch resets directly from III to I. Smoothstep removes mechanical
    // popping at both transitions while keeping the settled crown stable.
    const phaseTwoAmount = phaseTwoBlend * phaseTwoBlend * (3 - 2 * phaseTwoBlend);
    const ruptureAmount = closureAmount;

    for (let index = 0; index < fractureSectors.length; index += 1) {
      const sector = fractureSectors[index];
      const separatedRadius = fractureSectorMiddle
        + phaseTwoAmount * (0.46 + (index % 3) * 0.11)
        + ruptureAmount * (0.78 + (index % 4) * 0.16);
      sector.root.position.x = Math.sin(sector.angle) * separatedRadius;
      sector.root.position.z = Math.cos(sector.angle) * separatedRadius;
      sector.root.position.y = 0.073
        + phaseTwoAmount * (0.045 + (index % 2) * 0.035)
        - ruptureAmount * (1.55 + (index % 3) * 0.42);
      sector.root.rotation.x = ruptureAmount * sector.parity * (0.055 + (index % 3) * 0.025);
      sector.root.rotation.y = sector.angle
        + sector.parity * phaseTwoAmount * 0.032
        + sector.parity * ruptureAmount * 0.047;
      sector.root.rotation.z = ruptureAmount * sector.parity * (0.11 + (index % 4) * 0.018);
    }
    fractureGlowMaterial.opacity = phaseTwoAmount * (0.46 + Math.sin(safeTime * 4.4) * 0.08);

    for (let index = 0; index < phaseTwoStructures.length; index += 1) {
      const structure = phaseTwoStructures[index];
      const shutterRadius = 19 + ruptureAmount * (1.25 + (index % 3) * 0.18);
      structure.shutterRoot.position.x = Math.sin(structure.baseAngle) * shutterRadius;
      structure.shutterRoot.position.z = Math.cos(structure.baseAngle) * shutterRadius;
      structure.shutterRoot.position.y = THREE.MathUtils.lerp(-0.33, 1.24, phaseTwoAmount)
        + ruptureAmount * (1.74 + (index % 2) * 0.42)
        + Math.sin(safeTime * 0.62 + index) * ruptureAmount * 0.12;
      structure.shutterRoot.rotation.y = structure.baseAngle
        + structure.parity * phaseTwoAmount * 0.016
        + structure.parity * ruptureAmount * 0.11;
      structure.shutterRoot.rotation.z = structure.parity * ruptureAmount * (0.12 + (index % 3) * 0.045);
      structure.shutter.rotation.x = structure.parity * (phaseTwoAmount * 0.31 + ruptureAmount * 0.29);

      const bladeRadius = 20.22 + ruptureAmount * (1.58 + (index % 2) * 0.32);
      structure.bladeRoot.position.x = Math.sin(structure.baseAngle) * bladeRadius;
      structure.bladeRoot.position.z = Math.cos(structure.baseAngle) * bladeRadius;
      structure.bladeRoot.position.y = THREE.MathUtils.lerp(-4.78, 0.52, phaseTwoAmount)
        + ruptureAmount * (6.05 + (index % 3) * 0.48)
        + Math.sin(safeTime * 0.5 + index * 0.8) * ruptureAmount * 0.16;
      structure.bladeRoot.rotation.x = ruptureAmount * structure.parity * 0.07;
      structure.bladeRoot.rotation.y = structure.baseAngle
        + structure.parity * phaseTwoAmount * 0.035
        + structure.parity * ruptureAmount * 0.16;
      structure.bladeRoot.rotation.z = structure.parity * (phaseTwoAmount * 0.085 + ruptureAmount * 0.18);
    }

    ruptureGroup.visible = ruptureAmount > 0.006;
    bossOrbitGroup.visible = ruptureAmount > 0.006;
    ruptureVoidMaterial.opacity = ruptureAmount * 0.975;
    ruptureGlowMaterial.opacity = ruptureAmount * (0.46 + Math.sin(safeTime * 4.9) * 0.075);
    ruptureWallMaterial.opacity = ruptureAmount * 0.96;
    ruptureWallMaterial.emissiveIntensity = ruptureAmount * (0.72 + combatIntensity * 0.55);
    bossOrbitGroup.rotation.y = safeTime * 0.012 * ruptureAmount;
    for (let index = 0; index < bossOrbitSegments.length; index += 1) {
      const segment = bossOrbitSegments[index];
      segment.root.position.y = THREE.MathUtils.lerp(-7.5, segment.targetY, ruptureAmount)
        + Math.sin(safeTime * 0.68 + segment.phase) * ruptureAmount * 0.2;
      segment.root.rotation.x = Math.sin(safeTime * 0.31 + segment.phase) * ruptureAmount * 0.035;
      segment.root.rotation.y = segment.angle + Math.sin(safeTime * 0.24 + segment.phase) * ruptureAmount * 0.025;
      segment.root.rotation.z = segment.roll * ruptureAmount;
    }
    for (let index = 0; index < ruptureDebris.length; index += 1) {
      const debris = ruptureDebris[index];
      debris.root.visible = ruptureAmount > 0.015;
      const radialDrift = Math.sin(safeTime * 0.19 + debris.phase) * debris.drift * ruptureAmount;
      const radius = debris.radius + radialDrift;
      debris.root.position.x = Math.sin(debris.angle) * radius;
      debris.root.position.z = Math.cos(debris.angle) * radius;
      debris.root.position.y = THREE.MathUtils.lerp(-9, debris.targetY, ruptureAmount)
        + Math.sin(safeTime * 0.57 + debris.phase) * ruptureAmount * 0.36;
      debris.root.rotation.x += safeDelta * debris.spin * ruptureAmount;
      debris.root.rotation.y += safeDelta * debris.spin * 0.72 * ruptureAmount;
      debris.root.rotation.z -= safeDelta * debris.spin * 0.43 * ruptureAmount;
    }

    for (const segment of celestialSegments) {
      const separation = phaseTwoAmount * 2.15 + ruptureAmount * 6.4;
      segment.object.position.x = segment.direction.x * separation * segment.scale;
      segment.object.position.y = segment.direction.y * separation * segment.scale;
      segment.object.position.z = segment.parity * ruptureAmount * 0.38;
      segment.object.rotation.z = segment.baseRotation
        + segment.parity * (phaseTwoAmount * 0.018 + ruptureAmount * 0.105);
    }

    celestialDial.position.x = THREE.MathUtils.lerp(-11, -7.8, warmSkyAmount);
    celestialDial.position.x = THREE.MathUtils.lerp(celestialDial.position.x, -1.8, voidSkyAmount);
    celestialDial.position.y = THREE.MathUtils.lerp(24, 26.5, warmSkyAmount);
    celestialDial.position.y = THREE.MathUtils.lerp(celestialDial.position.y, 29.5, voidSkyAmount);
    celestialDial.rotation.z = -0.24 + warmSkyAmount * 0.11 + voidSkyAmount * 0.31;
    celestialDial.scale.setScalar(1 + warmSkyAmount * 0.08 + voidSkyAmount * 0.2);
    celestialCoreMaterial.color.copy(phaseColdLight).lerp(phaseScarlet, warmSkyAmount).lerp(phaseVoid, voidSkyAmount);
    celestialCoreMaterial.opacity = THREE.MathUtils.lerp(0.28, 0.76, warmSkyAmount);
    celestialCoreMaterial.opacity = THREE.MathUtils.lerp(celestialCoreMaterial.opacity, 0.965, voidSkyAmount);
    celestialCoronaMaterial.color.copy(phaseBlue).lerp(phaseScarlet, warmSkyAmount).lerp(phaseViolet, voidSkyAmount);
    celestialCoronaMaterial.opacity = THREE.MathUtils.lerp(0.25, 0.68, warmSkyAmount);
    celestialCoronaMaterial.opacity = THREE.MathUtils.lerp(celestialCoronaMaterial.opacity, 0.94, voidSkyAmount);

    const lightningA = Math.pow(Math.max(0, Math.sin(safeTime * 0.73 + 1.4)), 32);
    const lightningB = Math.pow(Math.max(0, Math.sin(safeTime * 0.317 - 0.8)), 68);
    const lightning = Math.min(1, lightningA * 0.3 + lightningB * (0.45 + combatIntensity * 0.38));

    skyMaterial.uniforms.uTime.value = safeTime;
    skyMaterial.uniforms.uPhase.value = phaseBlend;
    skyMaterial.uniforms.uFlash.value = lightning;
    stormMaterial.uniforms.uTime.value = safeTime;
    stormMaterial.uniforms.uPhase.value = phaseBlend;
    stormMaterial.uniforms.uIntensity.value = combatIntensity;

    cloudLayer.rotation.y = safeTime * (0.0025 + phaseBlend * 0.002);
    cloudLayer.children.forEach((cloud, index) => {
      cloud.position.y = cloud.userData.baseY + Math.sin(safeTime * 0.12 + cloud.userData.phase + index * 0.2) * 0.65;
    });
    cloudMaterials.forEach((material, index) => {
      material.color.copy(cloudColdColors[index]).lerp(cloudWarmColors[index], warmSkyAmount).lerp(cloudVoidColors[index], voidSkyAmount);
      const baseOpacity = material.userData.baseOpacity || 0.2;
      material.opacity = baseOpacity * (1 + phaseTwoAmount * 0.52 + ruptureAmount * 0.34);
    });

    for (const rotator of rotators) {
      const axis = rotator.axis || 'y';
      rotator.object.rotation[axis] = rotator.base + safeTime * rotator.speed * (1 + phaseBlend * 0.55);
    }

    for (const floater of floaters) {
      floater.object.position.y = floater.baseY + Math.sin(safeTime * 0.72 + floater.phase) * floater.amount * (1 + phaseBlend * 0.55);
      if (floater.sway) floater.object.rotation.z = Math.sin(safeTime * 0.43 + floater.phase) * 0.025 * (1 + combatIntensity);
    }

    for (const material of phaseMaterials) {
      material.emissive.copy(activePhaseColor);
      material.color.copy(activePhaseColor).lerp(phaseBone, 0.38);
      material.emissiveIntensity = 1.35 + combatIntensity * 0.75 + lightning * 0.85;
    }
    underLight.color.copy(activePhaseColor);
    underLight.intensity = 36 + phaseBlend * 18 + ruptureAmount * 22 + combatIntensity * 15 + lightning * 28;
    fractureStormLight.intensity = phaseTwoAmount * (30 + combatIntensity * 15 + lightning * 22);
    ruptureStormLight.intensity = ruptureAmount * (46 + combatIntensity * 22 + lightning * 30);
    hemisphere.color.copy(phaseColdLight).lerp(phaseWarmLight, warmSkyAmount).lerp(phaseVioletLight, voidSkyAmount);
    hemisphere.groundColor.copy(phaseGroundCold).lerp(phaseGroundWarm, warmSkyAmount).lerp(phaseGroundVoid, voidSkyAmount);
    hemisphere.intensity = 1.08 + phaseTwoAmount * 0.2 + lightning * 0.18;
    keyLight.color.copy(phaseColdLight).lerp(phaseWarmLight, warmSkyAmount).lerp(phaseVioletLight, voidSkyAmount);
    keyLight.intensity = 3.15 + phaseTwoAmount * 0.72 - ruptureAmount * 0.18 + lightning * 0.32;
    rimLight.color.copy(phaseBlue).lerp(phaseViolet, ruptureAmount * 0.72);
    rimLight.intensity = 1.58 + combatIntensity * 0.44 + lightning * 0.72 + ruptureAmount * 0.34;
    celestialMaterial.opacity = 0.28 + phaseTwoAmount * 0.14 + ruptureAmount * 0.18 + lightning * 0.12;
    celestialGold.opacity = 0.18 + phaseTwoAmount * 0.15 + combatIntensity * 0.06;

    if (phaseBlend < 0.52) {
      const transition = phaseBlend / 0.52;
      worldFog.color.copy(fogBlue).lerp(fogGold, transition);
      worldBackground.copy(backgroundBlue).lerp(backgroundGold, transition);
    } else {
      const transition = (phaseBlend - 0.52) / 0.48;
      worldFog.color.copy(fogGold).lerp(fogViolet, transition);
      worldBackground.copy(backgroundGold).lerp(backgroundViolet, transition);
    }
    worldFog.density = 0.0068 + phaseTwoAmount * 0.0009 + ruptureAmount * 0.00135;

    for (const entry of pulsePool) {
      if (!entry.active) continue;
      entry.elapsed += safeDelta;
      const progress = clamp01(entry.elapsed / entry.duration);
      const expansion = 1 - Math.pow(1 - progress, 3);
      const scale = 0.25 + expansion * (2.7 + entry.strength * 2.15);
      entry.mesh.scale.setScalar(scale);
      entry.material.opacity = Math.pow(1 - progress, 1.65) * Math.min(0.88, 0.42 + entry.strength * 0.2);
      entry.mesh.rotation.z += safeDelta * (0.2 + entry.strength * 0.12);
      if (progress >= 1) {
        entry.active = false;
        entry.mesh.visible = false;
        entry.material.opacity = 0;
      }
    }

    if (pulseLightLife > 0) {
      pulseLightLife = Math.max(0, pulseLightLife - safeDelta);
      const pulseAmount = pulseLightLife / pulseLightDuration;
      pulseLight.intensity = pulseAmount * pulseAmount * (22 + pulseLightStrength * 31);
    } else {
      pulseLight.intensity = 0;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(arenaGroup, skyGroup);
    disposeHierarchy(arenaGroup);
    disposeHierarchy(skyGroup);

    if (scene.background === worldBackground) scene.background = previousSceneState.background;
    if (scene.fog === worldFog) scene.fog = previousSceneState.fog;
    if (!reflectionEnvironment || scene.environment === reflectionEnvironment.texture) {
      scene.environment = previousSceneState.environment;
    }
    reflectionEnvironment?.dispose();
    if (renderer && previousRendererState) {
      renderer.shadowMap.enabled = previousRendererState.shadowEnabled;
      renderer.shadowMap.type = previousRendererState.shadowType;
      renderer.toneMapping = previousRendererState.toneMapping;
      renderer.toneMappingExposure = previousRendererState.toneMappingExposure;
      renderer.outputColorSpace = previousRendererState.outputColorSpace;
    }
  }

  return {
    arenaRadius,
    finalPlayerRadius,
    finalBossOrbitRadius,
    finalBossFlightHeight: bossOrbitGroup.userData.nominalFlightY,
    floorY,
    arenaGroup,
    skyGroup,
    get phaseTarget() { return phaseGoal + 1; },
    get phaseProgress() { return phaseBlend; },
    get ruptureBlend() { return phaseThreeBlend; },
    get cameraOccludedBoundarySegments() { return occludedBoundarySegmentCount; },
    get cameraNearOccludedBoundarySegments() { return nearCameraBoundarySegmentCount; },
    get cameraCompositionBoundarySegments() { return compositionBoundarySegmentCount; },
    get cameraScreenCompositionBoundarySegments() { return screenCompositionBoundarySegmentCount; },
    get cameraVisibleCompositionBoundarySegments() { return visibleCompositionBoundarySegmentCount; },
    get cameraVisibleScreenCompositionBoundarySegments() { return visibleScreenCompositionBoundarySegmentCount; },
    get cameraOccludedHourGates() { return occludedHourGateCount; },
    get cameraSightlineHourGates() { return sightlineHourGateCount; },
    get cameraVisibleSightlineHourGates() { return visibleSightlineHourGateCount; },
    get cameraCompositionFocusCount() { return cameraCompositionFocusCount; },
    update,
    setPhase,
    setCameraOcclusion,
    pulse,
    dispose,
  };
}
