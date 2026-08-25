import * as THREE from 'three';
import { vehiclePoseRoll } from './surface-frame.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function addMesh(parent, geometry, material, {
  position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1],
  castShadow = true, receiveShadow = false, name = '',
} = {}) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position);
  result.rotation.set(...rotation);
  result.scale.set(...scale);
  result.castShadow = castShadow;
  result.receiveShadow = receiveShadow;
  result.name = name;
  parent.add(result);
  return result;
}

function makeLoftGeometry(rings, sides = 32, capEnds = false) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let r = 0; r < rings.length; r += 1) {
    const ring = rings[r];
    for (let s = 0; s < sides; s += 1) {
      const angle = (s / sides) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const lower = sin < 0 ? (ring.lower ?? 0.72) : 1;
      positions.push(
        cos * ring.width,
        ring.y + sin * ring.height * lower,
        ring.z,
      );
      uvs.push(s / sides, r / Math.max(1, rings.length - 1));
    }
  }
  for (let r = 0; r < rings.length - 1; r += 1) {
    for (let s = 0; s < sides; s += 1) {
      const next = (s + 1) % sides;
      const a = r * sides + s;
      const b = r * sides + next;
      const c = (r + 1) * sides + next;
      const d = (r + 1) * sides + s;
      indices.push(a, d, b, b, d, c);
    }
  }
  if (capEnds) {
    const first = rings[0];
    const last = rings[rings.length - 1];
    const firstCenter = positions.length / 3;
    positions.push(0, first.y, first.z);
    uvs.push(0.5, 0.5);
    const lastCenter = positions.length / 3;
    positions.push(0, last.y, last.z);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < sides; s += 1) {
      const next = (s + 1) % sides;
      // Ring order is counter-clockwise when viewed from +Z. The nose cap
      // therefore winds toward -Z and the tail cap toward +Z.
      indices.push(firstCenter, next, s);
      const lastOffset = (rings.length - 1) * sides;
      indices.push(lastCenter, lastOffset + s, lastOffset + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeExtrudedPlanformGeometry(points, thickness = 0.1) {
  const positions = [];
  const indices = [];
  const half = thickness * 0.5;
  for (const [x, z] of points) positions.push(x, -half, z);
  for (const [x, z] of points) positions.push(x, half, z);
  const count = points.length;
  for (let index = 1; index < count - 1; index += 1) {
    indices.push(0, index + 1, index);
    indices.push(count, count + index, count + index + 1);
  }
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    indices.push(index, next, count + next, index, count + next, count + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBladeGeometry(side = 1) {
  // A compact, genuinely swept pressure surface. The old almost-flat 6.9 m
  // plank dominated the rocket and read as a glider; this thicker planform
  // keeps the car's narrow fuselage as the shared identity in both modes.
  const points = [
    [0, -1.82],
    [side * 0.92, -1.22],
    [side * 2.24, 0.42],
    [side * 1.68, 1.5],
    [0, 1.78],
  ];
  if (side < 0) points.reverse();
  return makeExtrudedPlanformGeometry(points, 0.2);
}

function makeTailplaneGeometry(side = 1) {
  const points = [
    [0, -0.9],
    [side * 0.34, -0.62],
    [side * 1.08, 0.28],
    [side * 0.7, 0.78],
    [0, 0.62],
  ];
  if (side < 0) points.reverse();
  return makeExtrudedPlanformGeometry(points, 0.16);
}

function makeVantaKnifeGeometry(side = 1) {
  const points = [
    [0, -2.12],
    [side * 0.32, -1.58],
    [side * 0.82, 0.94],
    [side * 0.46, 1.48],
    [0, 1.26],
  ];
  if (side < 0) points.reverse();
  return makeExtrudedPlanformGeometry(points, 0.12);
}

function makeTaperedPanelGeometry(frontWidth, rearWidth, length, thickness = 0.045) {
  return makeExtrudedPlanformGeometry([
    [-frontWidth * 0.5, -length * 0.5],
    [frontWidth * 0.5, -length * 0.5],
    [rearWidth * 0.5, length * 0.5],
    [-rearWidth * 0.5, length * 0.5],
  ], thickness);
}

function makeDorsalFinGeometry() {
  const profile = [
    [0, -0.68],
    [0, 0.72],
    [0.68, 0.48],
    [0.36, -0.42],
  ];
  const positions = [];
  const indices = [];
  for (const x of [-0.085, 0.085]) {
    for (const [y, z] of profile) positions.push(x, y, z);
  }
  indices.push(
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeTeardropCanopyGeometry() {
  return makeLoftGeometry([
    { z: -1.94, width: 0.035, height: 0.025, y: 0.54, lower: 0.18 },
    { z: -1.56, width: 0.39, height: 0.18, y: 0.61, lower: 0.2 },
    { z: -0.86, width: 0.64, height: 0.34, y: 0.69, lower: 0.2 },
    { z: -0.08, width: 0.69, height: 0.38, y: 0.69, lower: 0.19 },
    { z: 0.66, width: 0.5, height: 0.28, y: 0.63, lower: 0.2 },
    { z: 1.14, width: 0.08, height: 0.055, y: 0.54, lower: 0.2 },
  ], 36, true);
}

function makeLightStripGeometry(side = 1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    side * 0.94, 0.47, -2.75,
    side * 1.38, 0.31, -1.05,
    side * 1.43, 0.26, 1.38,
    side * 0.98, 0.34, 2.35,
  ], 3));
  return geometry;
}

function makeShoulderPanelGeometry(side = 1) {
  const points = [
    [side * 0.58, 0.39, -2.62],
    [side * 1.08, 0.43, -1.72],
    [side * 1.36, 0.34, -0.28],
    [side * 1.3, 0.27, 1.12],
    [side * 1.02, 0.26, 2.13],
  ];
  const positions = points.flat();
  const indices = side < 0
    ? [0, 2, 1, 0, 3, 2, 0, 4, 3]
    : [0, 1, 2, 0, 2, 3, 0, 3, 4];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0,
    0.25, 1,
    0.57, 1,
    0.82, 0.78,
    1, 0.12,
  ], 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeExhaustGeometry(length, radii, sides = 20) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const lastRing = radii.length - 1;
  for (let ring = 0; ring < radii.length; ring += 1) {
    const progress = ring / Math.max(1, lastRing);
    const radius = radii[ring];
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, progress * length);
      uvs.push(side / sides, progress);
    }
  }
  for (let ring = 0; ring < lastRing; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides;
      const a = ring * sides + side;
      const b = ring * sides + next;
      const c = (ring + 1) * sides + next;
      const d = (ring + 1) * sides + side;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeSkidOriginGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.13, 0, -0.08,
    0.13, 0, -0.08,
    0.07, 0, 0.86,
    -0.07, 0, 0.86,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0,
    1, 0,
    0.77, 1,
    0.23, 1,
  ], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTurbineVanesGeometry(radius, count = 6) {
  const positions = [];
  const indices = [];
  const inner = radius * 0.28;
  const outer = radius * 0.86;
  const halfWidth = radius * 0.085;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radialX = Math.cos(angle);
    const radialY = Math.sin(angle);
    const tangentX = -radialY;
    const tangentY = radialX;
    const base = positions.length / 3;
    positions.push(
      radialX * inner - tangentX * halfWidth, radialY * inner - tangentY * halfWidth, 0,
      radialX * outer - tangentX * halfWidth, radialY * outer - tangentY * halfWidth, 0,
      radialX * outer + tangentX * halfWidth, radialY * outer + tangentY * halfWidth, 0,
      radialX * inner + tangentX * halfWidth, radialY * inner + tangentY * halfWidth, 0,
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTransform(position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
}

function mergeGeometryParts(parts) {
  const positions = [];
  const normals = [];
  const uvs = [];
  parts.forEach(({ geometry, matrix = new THREE.Matrix4() }) => {
    const transformed = geometry.clone();
    transformed.applyMatrix4(matrix);
    const source = transformed.index ? transformed.toNonIndexed() : transformed;
    positions.push(...source.getAttribute('position').array);
    if (source.getAttribute('normal')) normals.push(...source.getAttribute('normal').array);
    if (source.getAttribute('uv')) uvs.push(...source.getAttribute('uv').array);
    geometry.dispose();
    if (source !== transformed) source.dispose();
    transformed.dispose();
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else merged.computeVertexNormals();
  if (uvs.length === (positions.length / 3) * 2) merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.computeBoundingSphere();
  return merged;
}

const TIRE_BATCH_COUNT = 4;
const TIRE_BATCH_BOUNDS = Object.freeze({
  // Car-rig-local bounds over every legal wheel state: full surface travel,
  // outside-loaded drift compression, front steer, release squat, and the
  // complete retract/fold trajectory. These deliberately include a small
  // numerical guard beyond the transformed 0.66 m torus radius. Keeping one
  // conservative vehicle-local volume preserves main- and shadow-frustum
  // culling without recomputing bounds from four dynamic instances per frame.
  min: Object.freeze([-2.45, -1.25, -2.65]),
  max: Object.freeze([2.45, 1.25, 2.65]),
  center: Object.freeze([0, 0, 0]),
  radius: 3.25,
});

function createTireTransform() {
  // Keep the exact legacy leaf transform in the wheel hierarchy. It remains a
  // cheap Object3D so steer, compression, fold, and accumulated spin continue
  // to compose in precisely the same order; only its draw submission moves to
  // the four-instance vehicle-local batch.
  const tire = new THREE.Object3D();
  tire.name = 'tire-transform';
  tire.rotation.set(0, Math.PI / 2, 0);
  return tire;
}

function createTireBatch(material, wheelAssemblies, player) {
  const geometry = new THREE.TorusGeometry(0.49, 0.17, 12, 30);
  const batch = new THREE.InstancedMesh(geometry, material, TIRE_BATCH_COUNT);
  batch.name = 'tire-batch';
  batch.castShadow = player;
  batch.receiveShadow = false;
  batch.frustumCulled = true;
  batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  batch.boundingBox = new THREE.Box3(
    new THREE.Vector3(...TIRE_BATCH_BOUNDS.min),
    new THREE.Vector3(...TIRE_BATCH_BOUNDS.max),
  );
  batch.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(...TIRE_BATCH_BOUNDS.center),
    TIRE_BATCH_BOUNDS.radius,
  );
  batch.userData = {
    instanceOrder: wheelAssemblies.map((assembly) => ({
      side: assembly.userData.side,
      front: assembly.userData.front,
    })),
    matricesWrittenLastUpdate: 0,
    totalMatricesWritten: 0,
    updateCount: 0,
    boundContract: TIRE_BATCH_BOUNDS,
  };
  return batch;
}

function updateTireBatchInstances(batch, wheelAssemblies, scratchMatrix) {
  let matricesWritten = 0;
  for (let index = 0; index < TIRE_BATCH_COUNT; index += 1) {
    const assembly = wheelAssemblies[index];
    const { steer, tire } = assembly.userData;
    // These local nodes have just been animated. Updating only their local
    // matrices avoids a recursive world walk and makes the submitted matrix
    // exactly assembly * steer * legacyTireLeaf in car-rig space.
    assembly.updateMatrix();
    steer.updateMatrix();
    tire.updateMatrix();
    scratchMatrix.multiplyMatrices(assembly.matrix, steer.matrix).multiply(tire.matrix);
    batch.setMatrixAt(index, scratchMatrix);
    matricesWritten += 1;
  }
  batch.instanceMatrix.needsUpdate = true;
  batch.userData.matricesWrittenLastUpdate = matricesWritten;
  batch.userData.totalMatricesWritten += matricesWritten;
  batch.userData.updateCount += 1;
}

function createWheel(materials, accent, side, z, front) {
  const assembly = new THREE.Group();
  assembly.name = front ? 'front-wheel-pod' : 'rear-wheel-pod';
  const steer = new THREE.Group();
  assembly.add(steer);
  const tire = createTireTransform();
  steer.add(tire);
  const rim = addMesh(steer, new THREE.CylinderGeometry(0.31, 0.31, 0.16, 24), materials.brushed, {
    rotation: [0, 0, Math.PI / 2], castShadow: false, name: 'rim',
  });
  addMesh(rim, new THREE.TorusGeometry(0.2, 0.025, 6, 20), materials.glow, {
    rotation: [0, Math.PI / 2, 0], castShadow: false,
  });
  const brake = addMesh(rim, new THREE.CylinderGeometry(0.19, 0.19, 0.17, 20), materials.brake, {
    rotation: [0, 0, Math.PI / 2], castShadow: false,
  });
  const shroud = addMesh(assembly, new THREE.CapsuleGeometry(0.22, 0.62, 5, 12), materials.carbon, {
    position: [-side * 0.18, 0.2, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1.08, 0.82], castShadow: false, name: 'suspension-shroud',
  });
  const wishbones = [-1, 1].map((vertical) => addMesh(
    assembly,
    new THREE.BoxGeometry(0.76, 0.048, 0.075),
    vertical > 0 ? materials.brushedDark : materials.carbon,
    {
      position: [-side * 0.34, vertical * 0.13 + 0.08, 0],
      rotation: [0, 0, side * vertical * 0.18],
      castShadow: false,
      name: vertical > 0 ? 'upper-wishbone' : 'lower-wishbone',
    },
  ));
  const damper = addMesh(assembly, new THREE.CapsuleGeometry(0.045, 0.42, 4, 10), materials.brushedDark, {
    position: [-side * 0.24, 0.3, -0.02],
    rotation: [0, 0, side * 0.54],
    castShadow: false,
    name: 'damper',
  });
  const contactMaterial = materials.contact.clone();
  const contactPatch = addMesh(assembly, new THREE.CircleGeometry(0.48, 20), contactMaterial, {
    position: [0, -0.66, 0.04],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [1, 0.34, 1],
    castShadow: false,
    name: 'contact-patch',
  });
  let skidOrigin = null;
  if (!front) {
    const skidMaterial = materials.skid.clone();
    skidMaterial.opacity = 0;
    skidOrigin = addMesh(assembly, makeSkidOriginGeometry(), skidMaterial, {
      position: [0, -0.652, 0.16],
      castShadow: false,
      name: 'rear-skid-origin',
    });
  }
  assembly.position.set(side * 1.58, -0.28, z);
  assembly.userData = {
    side, z, front, steer, tire, rim, brake, shroud, wishbones, damper, contactPatch, skidOrigin,
    base: assembly.position.clone(),
  };
  return assembly;
}

function createMaterials(accentHex, secondaryHex, player) {
  const accent = new THREE.Color(accentHex);
  const secondary = new THREE.Color(secondaryHex);
  const paintColor = player ? new THREE.Color(0x18232d) : secondary.clone().multiplyScalar(0.2);
  const paint = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    metalness: 0.74,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.075,
    envMapIntensity: 1.9,
  });
  const brushed = new THREE.MeshStandardMaterial({
    color: player ? 0xb4c4cc : secondary,
    metalness: 0.94,
    roughness: 0.18,
    envMapIntensity: 2.1,
  });
  const brushedDark = new THREE.MeshStandardMaterial({
    color: player ? 0x27333a : secondary.clone().multiplyScalar(0.28),
    metalness: 0.9,
    roughness: 0.27,
    envMapIntensity: 1.75,
  });
  // The vacuum wings sit directly beside the engine fill light. A pale,
  // mirror-like skin bloomed into a giant white triangle whenever one wing
  // banked toward the camera, so give them their own dark aerospace finish.
  // The accent edge still carries the silhouette at speed.
  const wingSkin = new THREE.MeshStandardMaterial({
    color: player ? 0x0c1419 : secondary.clone().multiplyScalar(0.16),
    metalness: 0.42,
    roughness: 0.62,
    envMapIntensity: 0.46,
    side: THREE.DoubleSide,
  });
  const shoulder = new THREE.MeshPhysicalMaterial({
    color: player ? 0x3b4850 : secondary.clone().multiplyScalar(0.42),
    metalness: 0.62,
    roughness: 0.28,
    clearcoat: 0.72,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.7,
    side: THREE.DoubleSide,
  });
  const carbon = new THREE.MeshPhysicalMaterial({
    color: 0x06080a,
    metalness: 0.42,
    roughness: 0.31,
    clearcoat: 0.52,
    clearcoatRoughness: 0.19,
    envMapIntensity: 1.35,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x03090d).lerp(accent, 0.075),
    emissive: accent,
    emissiveIntensity: 0.025,
    metalness: 0.05,
    roughness: 0.09,
    // Real-time transmission asks Three.js for another scene prepass. Four
    // racers turned one canopy effect into ~200 extra draw calls. The dark
    // clear-coated shell keeps the glass read without re-rendering the race.
    transmission: 0,
    thickness: 0.46,
    ior: 1.42,
    clearcoat: 0.94,
    clearcoatRoughness: 0.075,
    transparent: true,
    opacity: 0.69,
    envMapIntensity: 1.9,
  });
  const tire = new THREE.MeshStandardMaterial({ color: 0x010202, roughness: 0.92, metalness: 0.03 });
  const brake = new THREE.MeshStandardMaterial({ color: 0x361008, emissive: 0xff2d0c, emissiveIntensity: 0.38, metalness: 0.65, roughness: 0.26 });
  const engineMetal = new THREE.MeshStandardMaterial({
    color: 0x11171b,
    metalness: 0.92,
    roughness: 0.34,
    envMapIntensity: 1.8,
  });
  const heatMetal = new THREE.MeshStandardMaterial({
    // Oxidised titanium: readable as worked metal under both the red planet
    // grade and the blue-white vacuum key, without spending a texture lookup.
    color: player ? 0x604955 : secondary.clone().lerp(new THREE.Color(0x6c3a28), 0.52),
    emissive: new THREE.Color(0x351018).lerp(accent, 0.08),
    emissiveIntensity: 0.08,
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: 1.72,
  });
  const engineThroat = new THREE.MeshStandardMaterial({
    color: 0x010203,
    emissive: accent,
    emissiveIntensity: 0.018,
    metalness: 0.48,
    roughness: 0.74,
  });
  const contact = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const skid = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff6a22).lerp(accent, 0.2),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true,
    side: THREE.DoubleSide,
  });
  skid.forceSinglePass = true;
  const glow = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const hot = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentHex).lerp(new THREE.Color(0xffffff), 0.72),
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  return {
    accent, secondary, paint, brushed, brushedDark, shoulder, carbon, glass, tire, brake,
    engineMetal, heatMetal, engineThroat, contact, skid, glow, hot, wingSkin,
  };
}

export function createVehicle(accentHex, secondaryHex, { player = false, personality = 0 } = {}) {
  const root = new THREE.Group();
  root.name = player ? 'player-vehicle' : `rival-${personality}`;
  const pose = new THREE.Group();
  root.add(pose);
  const materials = createMaterials(accentHex, secondaryHex, player);

  const core = new THREE.Group();
  pose.add(core);
  const lowerHull = addMesh(core, makeLoftGeometry([
    { z: -3.35, width: 0.08, height: 0.08, y: 0.02 },
    { z: -2.8, width: 0.72, height: 0.26, y: 0.02 },
    { z: -1.65, width: 1.35, height: 0.39, y: 0.04 },
    { z: 0.15, width: 1.48, height: 0.44, y: 0.02 },
    { z: 1.65, width: 1.36, height: 0.42, y: 0 },
    { z: 2.55, width: 0.96, height: 0.32, y: 0 },
    { z: 2.85, width: 0.38, height: 0.2, y: 0 },
  ], 36, true), materials.paint, { name: 'monocoque' });

  const upperHull = addMesh(core, makeLoftGeometry([
    { z: -2.25, width: 0.28, height: 0.16, y: 0.32 },
    { z: -1.55, width: 0.92, height: 0.46, y: 0.42 },
    { z: -0.45, width: 1.03, height: 0.68, y: 0.56 },
    { z: 0.65, width: 0.88, height: 0.62, y: 0.54 },
    { z: 1.45, width: 0.55, height: 0.32, y: 0.36 },
  ], 32, true), materials.carbon, { name: 'upper-spine' });

  const canopy = addMesh(core, makeTeardropCanopyGeometry(), materials.glass, {
    castShadow: false, name: 'integrated-teardrop-canopy',
  });
  canopy.rotation.x = -0.025;

  const noseBlade = addMesh(core, makeLoftGeometry([
    { z: -3.72, width: 0.02, height: 0.02, y: 0.02 },
    { z: -3.12, width: 0.56, height: 0.09, y: -0.04 },
    { z: -2.2, width: 1.48, height: 0.11, y: -0.09 },
    { z: -1.65, width: 1.34, height: 0.11, y: -0.08 },
  ], 20, true), materials.brushed, { name: 'nose-blade' });

  const shoulderPanels = [-1, 1].map((side) => addMesh(
    core,
    makeShoulderPanelGeometry(side),
    materials.shoulder,
    { castShadow: false, name: side < 0 ? 'left-shoulder-panel' : 'right-shoulder-panel' },
  ));
  const sideIntakes = [-1, 1].map((side) => addMesh(
    core,
    new THREE.CapsuleGeometry(0.105, 1.18, 5, 12),
    materials.engineThroat,
    {
      position: [side * 1.28, 0.22, 0.4],
      rotation: [Math.PI / 2, 0, side * 0.08],
      scale: [1, 1, 0.54],
      castShadow: false,
      name: 'side-intake',
    },
  ));
  const deckPanels = [-1, 1].map((side) => addMesh(
    core,
    new THREE.BoxGeometry(0.17, 0.045, 1.86),
    materials.brushedDark,
    {
      position: [side * 0.77, 0.48, 1.02],
      rotation: [-0.035, 0, side * -0.08],
      castShadow: false,
      name: 'deck-panel-break',
    },
  ));
  const canopyFrame = addMesh(core, new THREE.CapsuleGeometry(0.036, 2.58, 5, 10), materials.brushedDark, {
    position: [0, 0.98, -0.28],
    rotation: [Math.PI / 2 - 0.025, 0, 0],
    scale: [1, 1, 0.62],
    castShadow: false,
    name: 'canopy-frame',
  });

  const lightStrips = [-1, 1].map((side) => {
    const line = new THREE.Line(makeLightStripGeometry(side), new THREE.LineBasicMaterial({
      color: materials.accent,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }));
    core.add(line);
    return line;
  });
  const centerSpine = addMesh(core, new THREE.CapsuleGeometry(0.055, 3.45, 5, 10), materials.brushedDark, {
    position: [0, 0.72, 0.12], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.78], castShadow: false, name: 'engine-spine',
  });

  let surfacePanels = null;
  let surfaceSeams = null;
  let surfaceFasteners = null;
  if (player) {
    // These are three merged material batches, not dozens of independent
    // trinkets. The chase camera gets layered panel scale and real fasteners
    // while the distant rivals keep their deliberately cheaper silhouettes.
    const panelParts = [
      { geometry: makeTaperedPanelGeometry(0.1, 0.58, 0.72), matrix: makeTransform([0, 0.3, -2.55], [-0.035, 0, 0]) },
      { geometry: makeTaperedPanelGeometry(0.27, 0.43, 0.78), matrix: makeTransform([-0.75, 0.42, -1.75], [-0.025, -0.04, -0.08]) },
      { geometry: makeTaperedPanelGeometry(0.27, 0.43, 0.78), matrix: makeTransform([0.75, 0.42, -1.75], [-0.025, 0.04, 0.08]) },
      { geometry: makeTaperedPanelGeometry(0.34, 0.47, 0.82), matrix: makeTransform([-1.08, 0.49, -0.72], [-0.015, -0.035, -0.055]) },
      { geometry: makeTaperedPanelGeometry(0.34, 0.47, 0.82), matrix: makeTransform([1.08, 0.49, -0.72], [-0.015, 0.035, 0.055]) },
      { geometry: makeTaperedPanelGeometry(0.38, 0.28, 0.9), matrix: makeTransform([-0.6, 0.73, 0.98], [0.045, -0.025, -0.035]) },
      { geometry: makeTaperedPanelGeometry(0.38, 0.28, 0.9), matrix: makeTransform([0.6, 0.73, 0.98], [0.045, 0.025, 0.035]) },
      { geometry: makeTaperedPanelGeometry(0.25, 0.38, 0.58), matrix: makeTransform([0, 0.62, 1.63], [0.075, 0, 0]) },
    ];
    surfacePanels = addMesh(core, mergeGeometryParts(panelParts), materials.brushed, {
      castShadow: true,
      name: 'merged-layered-body-panels',
    });

    const seamParts = [
      { geometry: new THREE.BoxGeometry(0.026, 0.021, 0.68), matrix: makeTransform([0, 0.333, -2.54], [-0.035, 0, 0]) },
      { geometry: new THREE.BoxGeometry(0.025, 0.02, 0.74), matrix: makeTransform([-0.75, 0.451, -1.74], [-0.025, -0.04, -0.08]) },
      { geometry: new THREE.BoxGeometry(0.025, 0.02, 0.74), matrix: makeTransform([0.75, 0.451, -1.74], [-0.025, 0.04, 0.08]) },
      { geometry: new THREE.BoxGeometry(0.025, 0.02, 0.76), matrix: makeTransform([-1.08, 0.521, -0.71], [-0.015, -0.035, -0.055]) },
      { geometry: new THREE.BoxGeometry(0.025, 0.02, 0.76), matrix: makeTransform([1.08, 0.521, -0.71], [-0.015, 0.035, 0.055]) },
      { geometry: new THREE.BoxGeometry(0.023, 0.02, 0.82), matrix: makeTransform([-0.6, 0.761, 0.98], [0.045, -0.025, -0.035]) },
      { geometry: new THREE.BoxGeometry(0.023, 0.02, 0.82), matrix: makeTransform([0.6, 0.761, 0.98], [0.045, 0.025, 0.035]) },
      { geometry: new THREE.CapsuleGeometry(0.021, 1.82, 3, 8), matrix: makeTransform([-0.54, 0.78, -0.16], [Math.PI / 2 - 0.055, 0, -0.045], [1, 1, 0.72]) },
      { geometry: new THREE.CapsuleGeometry(0.021, 1.82, 3, 8), matrix: makeTransform([0.54, 0.78, -0.16], [Math.PI / 2 - 0.055, 0, 0.045], [1, 1, 0.72]) },
    ];
    surfaceSeams = addMesh(core, mergeGeometryParts(seamParts), materials.brushedDark, {
      castShadow: false,
      name: 'merged-body-and-canopy-seams',
    });

    const fastenerParts = [];
    const fasteners = [
      [-0.22, 0.34, -2.35], [0.22, 0.34, -2.35],
      [-0.89, 0.46, -1.48], [-0.61, 0.46, -1.48], [0.61, 0.46, -1.48], [0.89, 0.46, -1.48],
      [-1.22, 0.53, -0.43], [-0.94, 0.53, -0.43], [0.94, 0.53, -0.43], [1.22, 0.53, -0.43],
      [-0.72, 0.78, 1.25], [-0.49, 0.78, 1.25], [0.49, 0.78, 1.25], [0.72, 0.78, 1.25],
    ];
    for (const [x, y, z] of fasteners) {
      fastenerParts.push({
        geometry: new THREE.CylinderGeometry(0.025, 0.025, 0.026, 8),
        matrix: makeTransform([x, y, z]),
      });
    }
    surfaceFasteners = addMesh(core, mergeGeometryParts(fastenerParts), materials.heatMetal, {
      castShadow: false,
      name: 'merged-panel-fasteners',
    });
  }

  const carRig = new THREE.Group();
  pose.add(carRig);
  const rearAero = addMesh(carRig, mergeGeometryParts([
    ...[-1, 1].map((side) => ({
      geometry: makeTaperedPanelGeometry(1.28, 1.02, 0.68, 0.095),
      matrix: makeTransform([side * 0.83, 0, 0], [0, side * -0.11, 0]),
    })),
    {
      geometry: makeTaperedPanelGeometry(0.36, 0.5, 0.46, 0.12),
      matrix: makeTransform([0, 0.025, 0.03]),
    },
  ]), materials.carbon, {
    position: [0, 0.42, 2.28], rotation: [-0.08, 0, 0], name: 'rear-aero',
  });
  const rearEdgeMaterial = materials.glow.clone();
  rearEdgeMaterial.opacity = 0.3;
  const rearAeroEdge = addMesh(rearAero, mergeGeometryParts([-1, 1].map((side) => ({
    geometry: new THREE.BoxGeometry(1.08, 0.035, 0.065),
    matrix: makeTransform([side * 0.86, 0.025, 0.27], [0, side * -0.11, 0]),
  }))), rearEdgeMaterial, { castShadow: false });
  let rearStructure = null;
  let diffuser = null;
  if (player) {
    // The chase camera lives behind this surface for the entire race. Give the
    // hero car load-bearing aero rather than a single toy-like floating bar.
    const structureParts = [];
    for (const side of [-1, 1]) {
      structureParts.push({
        geometry: new THREE.BoxGeometry(0.11, 0.58, 0.13),
        matrix: makeTransform([side * 0.92, 0.18, 2.1], [0.12, 0, side * -0.08]),
      });
      structureParts.push({
        geometry: new THREE.BoxGeometry(0.12, 0.72, 0.54),
        matrix: makeTransform([side * 1.52, 0.4, 2.28], [0, 0, side * 0.045]),
      });
    }
    rearStructure = addMesh(carRig, mergeGeometryParts(structureParts), materials.brushedDark, {
      castShadow: true,
      name: 'rear-aero-structure',
    });
    const diffuserParts = [];
    for (const x of [-1.05, -0.52, 0, 0.52, 1.05]) {
      diffuserParts.push({
        geometry: new THREE.BoxGeometry(0.055, 0.34, 1.04),
        matrix: makeTransform([x, -0.38, 2.35], [-0.13, 0, 0]),
      });
    }
    diffuserParts.push({
      geometry: new THREE.BoxGeometry(2.55, 0.055, 0.82),
      matrix: makeTransform([0, -0.48, 2.35], [-0.13, 0, 0]),
    });
    diffuser = addMesh(carRig, mergeGeometryParts(diffuserParts), materials.carbon, {
      castShadow: true,
      name: 'venturi-diffuser',
    });
  }
  const sideSkirts = [-1, 1].map((side) => addMesh(carRig, new THREE.BoxGeometry(0.18, 0.2, 3.2), materials.brushed, {
    position: [side * 1.46, -0.12, 0.25], rotation: [0, 0, side * -0.06], name: 'side-skirt',
  }));

  const wheelDoors = [];
  if (player) {
    for (const { side, z, front } of [
      { side: -1, z: -1.62, front: true },
      { side: 1, z: -1.62, front: true },
      { side: -1, z: 1.55, front: false },
      { side: 1, z: 1.55, front: false },
    ]) {
      const door = addMesh(
        core,
        makeTaperedPanelGeometry(front ? 0.48 : 0.62, front ? 0.66 : 0.5, front ? 1.02 : 1.12, 0.085),
        materials.shoulder,
        {
          position: [side * 1.36, 0.24, z],
          rotation: [0, 0, side * -0.2],
          castShadow: true,
          name: front ? 'front-wheel-door' : 'rear-wheel-door',
        },
      );
      wheelDoors.push({ door, side, z, front });
    }
  }

  const wheelAssemblies = [
    createWheel(materials, materials.accent, -1, -1.62, true),
    createWheel(materials, materials.accent, 1, -1.62, true),
    createWheel(materials, materials.accent, -1, 1.55, false),
    createWheel(materials, materials.accent, 1, 1.55, false),
  ];
  wheelAssemblies.forEach((wheel) => carRig.add(wheel));
  const tireBatch = createTireBatch(materials.tire, wheelAssemblies, player);
  const tireMatrixScratch = new THREE.Matrix4();
  carRig.add(tireBatch);
  updateTireBatchInstances(tireBatch, wheelAssemblies, tireMatrixScratch);
  if (!player) {
    // Opponents spend almost the entire race at silhouette scale. Preserve the
    // tyres, hull, accent strip, and distinct signatures, but retire suspension
    // jewellery that cost over thirty draws per rival without surviving a
    // single gameplay pixel.
    for (const wheel of wheelAssemblies) {
      wheel.userData.rim.visible = false;
      wheel.userData.shroud.visible = false;
      wheel.userData.wishbones.forEach((part) => { part.visible = false; });
      wheel.userData.damper.visible = false;
      wheel.userData.contactPatch.visible = false;
      if (wheel.userData.skidOrigin) wheel.userData.skidOrigin.visible = false;
    }
  }

  const rocketRig = new THREE.Group();
  pose.add(rocketRig);
  const rocketShoulders = addMesh(
    rocketRig,
    mergeGeometryParts([-1, 1].map((side) => ({
      geometry: makeTaperedPanelGeometry(0.24, 0.58, 4.9, 0.11),
      matrix: makeTransform([side * 0.78, 0.38, -0.36], [0.02, side * 0.035, side * -0.035]),
    }))),
    materials.wingSkin,
    { castShadow: player, name: 'sealed-rocket-chines' },
  );
  // A pressure cowl closes over the compact cockpit late in the morph. It uses
  // the existing carbon material family and stays preconstructed, so the
  // endpoint becomes a sealed rocket without runtime transparency mutation.
  const canopyCowl = addMesh(
    rocketRig,
    makeTaperedPanelGeometry(0.42, 1.18, 3.05, 0.095),
    materials.carbon,
    {
      position: [0, 0.83, -0.5],
      rotation: [-0.035, 0, 0],
      scale: [0.04, 0.04, 0.04],
      castShadow: player,
      name: 'rocket-pressure-cowl',
    },
  );
  const wingEdgeMaterial = materials.glow.clone();
  wingEdgeMaterial.opacity = player ? 0.34 : 0.46;
  wingEdgeMaterial.toneMapped = true;
  const wings = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    hinge.position.set(side * 0.85, 0.02, 0.72);
    rocketRig.add(hinge);
    const wing = addMesh(hinge, makeBladeGeometry(side), materials.wingSkin, { name: 'vacuum-wing' });
    addMesh(wing, new THREE.BoxGeometry(0.045, 0.05, 1.08), wingEdgeMaterial, {
      position: [side * 2.46, 0.13, 0.65], rotation: [0, side * -0.24, 0], castShadow: false,
    });
    if (player) {
      const armor = mergeGeometryParts([
        {
          geometry: makeTaperedPanelGeometry(0.24, 0.42, 1.1, 0.038),
          matrix: makeTransform([side * 0.82, 0.122, -0.35], [0, side * 0.36, 0]),
        },
        {
          geometry: makeTaperedPanelGeometry(0.2, 0.34, 0.76, 0.036),
          matrix: makeTransform([side * 1.72, 0.126, 0.18], [0, side * 0.5, 0]),
        },
      ]);
      addMesh(wing, armor, materials.brushedDark, {
        castShadow: false,
        name: 'merged-wing-armor-panels',
      });
    }
    return { hinge, wing, side };
  });
  const gunPods = [-1, 1].map((side) => {
    const pod = addMesh(rocketRig, new THREE.CapsuleGeometry(0.16, 2.34, 6, 16), materials.carbon, {
      position: [side * 1.38, 0.04, -0.82], rotation: [Math.PI / 2, 0, 0], castShadow: player, name: 'gun-pod',
    });
    addMesh(pod, new THREE.CircleGeometry(0.135, 18), materials.hot, {
      position: [0, -1.02, 0], rotation: [Math.PI / 2, 0, 0], castShadow: false,
    });
    return pod;
  });
  const tailFins = [-1, 1].map((side) => addMesh(rocketRig, makeTailplaneGeometry(side), materials.carbon, {
    position: [0, 0.34, 1.38], scale: [0.48, 0.5, 0.5], castShadow: player, name: 'tail-fin',
  }));
  const dorsalTail = addMesh(rocketRig, makeDorsalFinGeometry(), materials.carbon, {
    position: [0, 0.48, 1.38], castShadow: player, name: 'swept-dorsal-tail',
  });
  const hingeFairings = addMesh(
    rocketRig,
    mergeGeometryParts([-1, 1].map((side) => ({
      geometry: new THREE.CapsuleGeometry(0.16, 0.84, 5, 12),
      matrix: makeTransform([side * 0.92, 0.09, 0.68], [Math.PI / 2, 0, 0], [0.82, 1, 0.76]),
    }))),
    materials.engineMetal,
    { castShadow: player, name: 'merged-wing-hinge-fairings' },
  );
  let thermalSpine = null;
  if (player) {
    thermalSpine = addMesh(
      rocketRig,
      mergeGeometryParts([
        {
          geometry: new THREE.CapsuleGeometry(0.09, 1.72, 5, 10),
          matrix: makeTransform([0, 0.74, 0.72], [Math.PI / 2, 0, 0], [1, 1, 0.72]),
        },
        {
          geometry: makeTaperedPanelGeometry(0.18, 0.34, 0.74, 0.05),
          matrix: makeTransform([0, 0.69, 1.56], [0.08, 0, 0]),
        },
        {
          geometry: new THREE.BoxGeometry(0.2, 0.25, 0.62),
          matrix: makeTransform([0, 0.65, 1.58], [-0.1, 0, 0]),
        },
      ]),
      materials.heatMetal,
      { castShadow: false, name: 'heat-stained-spine-and-tail-root' },
    );
  }

  const engineRig = new THREE.Group();
  engineRig.position.z = 2.62;
  pose.add(engineRig);
  const engineSpecs = [
    { x: -0.76, y: -0.055, radius: 0.27, length: 0.76, exitZ: 0.4, outputScale: 0.73, vanes: 5 },
    { x: 0, y: 0.045, radius: 0.38, length: 1.06, exitZ: 0.49, outputScale: 1, vanes: 8, center: true },
    { x: 0.76, y: -0.055, radius: 0.27, length: 0.76, exitZ: 0.4, outputScale: 0.73, vanes: 5 },
  ];
  const cluster = (createGeometry, createMatrix) => mergeGeometryParts(engineSpecs.map((spec) => ({
    geometry: createGeometry(spec),
    matrix: createMatrix(spec),
  })));
  const nacelle = addMesh(
    engineRig,
    cluster(
      ({ radius, length, center }) => makeExhaustGeometry(
        length,
        [radius * 0.68, radius * 0.76, radius * 0.9, radius * 1.06, radius],
        center ? 30 : 22,
      ),
      ({ x, y, length, exitZ }) => makeTransform([x, y, exitZ - length]),
    ),
    materials.engineMetal,
    { castShadow: player, name: 'differentiated-nozzle-shell-cluster' },
  );
  const nozzlePetalParts = [];
  for (const spec of engineSpecs) {
    nozzlePetalParts.push({
      geometry: new THREE.TorusGeometry(spec.radius * 0.93, spec.center ? 0.035 : 0.028, 10, spec.center ? 30 : 24),
      matrix: makeTransform([spec.x, spec.y, spec.exitZ - 0.17]),
    });
    const petalCount = spec.center ? 10 : 7;
    for (let index = 0; index < petalCount; index += 1) {
      const angle = (index / petalCount) * Math.PI * 2;
      nozzlePetalParts.push({
        geometry: new THREE.BoxGeometry(0.035, spec.radius * 0.27, spec.center ? 0.36 : 0.27),
        matrix: makeTransform([
          spec.x + Math.cos(angle) * spec.radius * 0.9,
          spec.y + Math.sin(angle) * spec.radius * 0.9,
          spec.exitZ - (spec.center ? 0.18 : 0.135),
        ], [0, 0, angle]),
      });
    }
    if (!spec.center) {
      nozzlePetalParts.push({
        geometry: new THREE.BoxGeometry(0.045, spec.radius * 1.55, 0.045),
        matrix: makeTransform([spec.x, spec.y, spec.exitZ + 0.008]),
      });
    }
  }
  const centerSpec = engineSpecs[1];
  nozzlePetalParts.push({
    geometry: new THREE.ConeGeometry(0.115, 0.42, 16, 1, false),
    matrix: makeTransform(
      [centerSpec.x, centerSpec.y, centerSpec.exitZ + 0.18],
      [Math.PI / 2, 0, 0],
    ),
  });
  const nozzlePetals = addMesh(
    engineRig,
    mergeGeometryParts(nozzlePetalParts),
    materials.heatMetal,
    { castShadow: false, name: 'heat-stained-nozzle-petals-and-aerospike' },
  );
  const lip = addMesh(
    engineRig,
    cluster(
      ({ radius, center }) => new THREE.TorusGeometry(radius, center ? 0.05 : 0.038, 12, center ? 32 : 24),
      ({ x, y, exitZ }) => makeTransform([x, y, exitZ]),
    ),
    materials.brushedDark,
    { castShadow: false, name: 'nozzle-lip-cluster' },
  );
  const throat = addMesh(
    engineRig,
    cluster(
      ({ radius, center }) => new THREE.CircleGeometry(radius * 0.82, center ? 32 : 24),
      ({ x, y, exitZ }) => makeTransform([x, y, exitZ + 0.006]),
    ),
    materials.engineThroat,
    { castShadow: false, name: 'turbine-throat-cluster' },
  );
  const vaneRotor = addMesh(
    engineRig,
    cluster(
      ({ radius, vanes }) => makeTurbineVanesGeometry(radius * 0.8, vanes),
      ({ x, y, exitZ }) => makeTransform([x, y, exitZ + 0.013]),
    ),
    materials.brushedDark,
    { castShadow: false, name: 'turbine-vane-cluster' },
  );
  const hotCoreMaterial = materials.hot.clone();
  hotCoreMaterial.color.lerp(new THREE.Color(0xffc579), 0.46);
  hotCoreMaterial.opacity = 0.52;
  const hotCore = addMesh(
    engineRig,
    cluster(
      ({ center }) => new THREE.CircleGeometry(center ? 0.074 : 0.048, 20),
      ({ x, y, exitZ }) => makeTransform([x, y, exitZ + 0.022]),
    ),
    hotCoreMaterial,
    { castShadow: false, name: 'combustor-core-cluster' },
  );
  const coronaMaterial = materials.glow.clone();
  coronaMaterial.opacity = 0.065;
  coronaMaterial.toneMapped = true;
  const corona = addMesh(
    engineRig,
    cluster(
      ({ radius }) => new THREE.RingGeometry(radius * 0.19, radius * 0.34, 24),
      ({ x, y, exitZ }) => makeTransform([x, y, exitZ + 0.021]),
    ),
    coronaMaterial,
    { castShadow: false, name: 'combustor-corona-cluster' },
  );
  const outerMaterial = materials.glow.clone();
  outerMaterial.opacity = 0.008;
  outerMaterial.blending = THREE.NormalBlending;
  outerMaterial.side = THREE.DoubleSide;
  outerMaterial.forceSinglePass = true;
  outerMaterial.toneMapped = true;
  const wakeOuter = addMesh(
    engineRig,
    cluster(
      // Compact pressure plume: a small flare at the nozzle followed by a
      // needle taper. It reads as thrust without becoming a translucent cone.
      () => makeExhaustGeometry(2.45, [0.065, 0.095, 0.058, 0.019, 0.003], 18),
      ({ x, y, exitZ, outputScale }) => makeTransform(
        [x, y, exitZ + 0.03],
        [0, 0, 0],
        [outputScale, outputScale, outputScale],
      ),
    ),
    outerMaterial,
    { castShadow: false, name: 'engine-wake-cluster' },
  );
  const innerMaterial = materials.hot.clone();
  innerMaterial.color.lerp(new THREE.Color(0xffd49a), 0.42);
  innerMaterial.opacity = 0.032;
  innerMaterial.side = THREE.DoubleSide;
  innerMaterial.forceSinglePass = true;
  innerMaterial.toneMapped = true;
  const wakeInner = addMesh(
    engineRig,
    cluster(
      () => makeExhaustGeometry(0.92, [0.031, 0.047, 0.021, 0.002], 14),
      ({ x, y, exitZ, outputScale }) => makeTransform(
        [x, y, exitZ + 0.03],
        [0, 0, 0],
        [outputScale, outputScale, outputScale],
      ),
    ),
    innerMaterial,
    { castShadow: false, name: 'engine-core-cluster' },
  );
  const turbines = [{ nacelle, nozzlePetals, lip, throat, vaneRotor, hotCore, corona }];
  const wakes = [{ outer: wakeOuter, inner: wakeInner }];

  // The hero is never culled, so its compact fill is a stable member of the
  // scene's lighting signature. Rival vehicles *are* hidden behind the launch
  // camera and outside the race envelope. Giving each of them a PointLight
  // changed NUM_POINT_LIGHTS when visibility flipped and forced every visible
  // PBR material to compile a new program family in the middle of launch.
  // Rival identity remains in emissive strips, hot cores, and pressure wakes.
  const fill = player ? new THREE.PointLight(materials.accent, 0.58, 6.2, 2) : null;
  if (fill) {
    fill.position.set(0, 1.2, 3.1);
    pose.add(fill);
  }

  const rivalSignature = new THREE.Group();
  rivalSignature.name = 'rival-signature';
  rocketRig.add(rivalSignature);
  if (!player && personality === 0) {
    for (const side of [-1, 1]) {
      addMesh(rivalSignature, makeVantaKnifeGeometry(side), materials.paint, {
        position: [side * 0.22, -0.02, -1.25],
        scale: [0.72, 0.34, 0.42],
        rotation: [0, 0, side * -0.08],
        name: 'vanta-knife',
      });
    }
  } else if (!player && personality === 1) {
    addMesh(rivalSignature, new THREE.TorusGeometry(1.42, 0.12, 12, 48), materials.glow, {
      position: [0, 0.2, 2.18],
      scale: [1.18, 0.92, 1],
      castShadow: false,
      name: 'saint-halo',
    });
  } else if (!player && personality === 2) {
    for (const side of [-1, 1]) {
      addMesh(rivalSignature, new THREE.CapsuleGeometry(0.16, 2.7, 5, 12), materials.brushed, {
        position: [side * 0.82, 0.2, 2.4],
        rotation: [Math.PI / 2 - side * 0.18, 0, 0],
        name: 'morrow-fork',
      });
    }
  }

  root.userData = {
    accent: materials.accent,
    materials,
    pose,
    core,
    lowerHull,
    upperHull,
    canopy,
    noseBlade,
    shoulderPanels,
    sideIntakes,
    deckPanels,
    canopyFrame,
    centerSpine,
    surfacePanels,
    surfaceSeams,
    surfaceFasteners,
    lightStrips,
    carRig,
    rearAero,
    rearAeroEdge,
    rearStructure,
    diffuser,
    sideSkirts,
    wheelDoors,
    wheelAssemblies,
    tireBatch,
    tireMatrixScratch,
    rocketRig,
    rocketShoulders,
    canopyCowl,
    wings,
    gunPods,
    tailFins,
    dorsalTail,
    hingeFairings,
    thermalSpine,
    engineRig,
    turbines,
    wakes,
    fill,
    rivalSignature,
    player,
    personality,
    morph: 0,
    releaseKick: 0,
  };
  root.scale.setScalar(player ? 1.13 : 0.98 + personality * 0.035);
  return root;
}

export function updateVehicleVisual(vehicle, {
  morph = 0,
  boost = 0,
  speed = 0,
  yaw = 0,
  roll = 0,
  lift = 0,
  hitFlash = 0,
  drift = 0,
  driftSide = 0,
  steer = 0,
  releaseKick = 0,
  dt = 1 / 60,
  time = 0,
} = {}) {
  const data = vehicle.userData;
  const m = smooth(morph);
  const car = 1 - m;
  const surfaceDrift = drift * car;
  data.morph = m;
  data.releaseKick = Math.max(releaseKick, data.releaseKick - dt * 2.6);
  data.rocketRig.visible = m > 0.015;

  data.pose.rotation.y = yaw;
  data.pose.rotation.z = vehiclePoseRoll({
    roll,
    driftSide,
    driftCharge: drift,
    morph,
  });
  data.pose.rotation.x = -m * 0.035 + data.releaseKick * 0.055;
  data.pose.position.y = 0.27 + lift - surfaceDrift * 0.018 + Math.sin(time * 12) * 0.012 * m;
  data.pose.position.z = -data.releaseKick * 0.3;

  data.core.scale.set(
    1 - m * 0.24,
    1 - m * 0.17,
    1 + m * 0.7,
  );
  data.core.position.z = -m * 0.54;
  // Core elongation already stretches every child longitudinally. Keep the
  // cockpit compact inside that pressure body instead of compounding it into a
  // ten-metre transparent spear.
  data.canopy.scale.set(1 - m * 0.32, 1 - m * 0.38, 1 - m * 0.08);
  data.canopy.position.y = -m * 0.15;
  data.canopy.position.z = -m * 0.32;
  data.canopyFrame.position.y = 0.98 - m * 0.1;
  data.canopyFrame.position.z = -0.28 - m * 0.08;
  data.canopyFrame.scale.set(1, 1 + m * 0.2, 0.62 - m * 0.07);
  data.noseBlade.scale.x = 1 + m * 0.3;
  data.noseBlade.position.z = -m * 0.22;

  data.rearAero.rotation.x = -0.08 + m * 1.12;
  data.rearAero.position.y = 0.42 + m * 0.48;
  data.rearAero.position.z = 2.28 - m * 0.66;
  data.rearAero.scale.set(1 - m * 0.62, 1 - m * 0.28, 1 - m * 0.56);
  if (data.rearStructure) {
    data.rearStructure.rotation.x = m * 0.46;
    data.rearStructure.position.y = m * 0.3;
    data.rearStructure.position.z = -m * 0.28;
    data.rearStructure.scale.set(1 - m * 0.16, 1 - m * 0.48, 1 - m * 0.22);
  }
  if (data.diffuser) {
    data.diffuser.position.y = m * 0.26;
    data.diffuser.position.z = -m * 0.34;
    data.diffuser.scale.set(1 - m * 0.28, 1 - m * 0.25, 1 - m * 0.5);
  }
  data.sideSkirts.forEach((skirt, index) => {
    const side = index === 0 ? -1 : 1;
    skirt.rotation.z = side * (-0.06 + m * 1.12);
    skirt.position.x = side * mix(1.46, 1.06, m);
    skirt.position.y = -0.12 + m * 0.42;
    skirt.scale.z = 1 - m * 0.23;
  });

  data.wheelAssemblies.forEach((assembly) => {
    const wheelData = assembly.userData;
    const side = wheelData.side;
    const front = wheelData.front;
    const retract = smooth(clamp((m - 0.025) / 0.61, 0, 1));
    const outsideLoad = clamp(0.5 + side * driftSide * 0.5, 0, 1);
    const compression = car * (
      surfaceDrift * (0.025 + outsideLoad * 0.082)
      + (!front ? boost * 0.018 + data.releaseKick * 0.022 : 0)
    );
    assembly.visible = retract < 0.985;
    assembly.position.x = side * mix(1.58, 0.93, retract);
    assembly.position.y = mix(-0.28, 0.27, retract);
    assembly.position.z = wheelData.z + m * (front ? -0.22 : 0.28);
    assembly.rotation.z = side * retract * Math.PI * 0.46 + driftSide * surfaceDrift * 0.085;
    assembly.rotation.x = retract * (front ? -0.18 : 0.12);
    const wheelScale = Math.max(0.08, 1 - retract * 0.9);
    wheelData.steer.scale.setScalar(wheelScale);
    wheelData.steer.position.y = compression;
    wheelData.steer.rotation.y = front
      ? clamp(steer * 0.48 - driftSide * surfaceDrift * 0.78, -0.94, 0.94)
      : driftSide * surfaceDrift * 0.055;
    wheelData.steer.rotation.z = side * compression * 0.34;
    wheelData.tire.rotation.z -= speed * dt * 0.022;
    wheelData.rim.rotation.y += dt * (2.2 + boost * 7 + m * 10);
    wheelData.brake.material.emissiveIntensity = 0.25 + drift * 1.25 + hitFlash * 2.5;
    wheelData.shroud.position.y = 0.2 + compression * 0.42;
    wheelData.shroud.scale.x = 1 - compression * 0.7;
    wheelData.wishbones.forEach((wishbone, index) => {
      const vertical = index === 0 ? -1 : 1;
      wishbone.rotation.z = side * vertical * (0.18 + compression * 0.82);
      wishbone.position.y = vertical * 0.13 + 0.08 + compression * 0.42;
    });
    wheelData.damper.scale.y = Math.max(0.78, 1 - compression * 1.65);
    wheelData.damper.position.y = 0.3 + compression * 0.34;
    wheelData.contactPatch.position.y = -0.66 + compression;
    wheelData.contactPatch.scale.set(1 + surfaceDrift * 0.24, 0.34 + surfaceDrift * 0.52, 1);
    wheelData.contactPatch.material.opacity = car * (0.18 + outsideLoad * surfaceDrift * 0.16);
    if (wheelData.skidOrigin) {
      wheelData.skidOrigin.visible = car > 0.04 && (surfaceDrift > 0.045 || data.releaseKick > 0.035);
      wheelData.skidOrigin.position.y = -0.652 + compression;
      wheelData.skidOrigin.material.opacity = car * (
        surfaceDrift * (0.18 + outsideLoad * 0.15) + data.releaseKick * 0.055
      );
      wheelData.skidOrigin.scale.set(
        0.82 + surfaceDrift * 0.28,
        1,
        0.34 + surfaceDrift * 0.96 + data.releaseKick * 0.32,
      );
    }
  });
  // All four pods share the same retract envelope, so the legacy submission
  // was either four visible tires or none. Preserve that edge exactly while
  // still advancing spin and refreshing all four matrices when hidden.
  data.tireBatch.visible = data.wheelAssemblies[0].visible;
  updateTireBatchInstances(data.tireBatch, data.wheelAssemblies, data.tireMatrixScratch);

  data.wheelDoors.forEach(({ door, side, z, front }) => {
    const retract = smooth(clamp((m - 0.025) / 0.61, 0, 1));
    door.position.x = side * mix(1.36, 1.08, retract);
    door.position.y = mix(0.24, 0.45, retract);
    door.position.z = z + retract * (front ? -0.16 : 0.2);
    door.rotation.x = retract * (front ? -0.08 : 0.07);
    door.rotation.z = side * mix(-0.2, -0.025, retract);
    door.scale.set(1 - retract * 0.05, 1, 1 - retract * 0.045);
  });

  const shellDeploy = smooth(clamp((m - 0.06) / 0.66, 0, 1));
  data.rocketShoulders.visible = shellDeploy > 0.015;
  data.rocketShoulders.scale.set(
    0.38 + shellDeploy * 0.62,
    Math.max(0.04, shellDeploy),
    0.42 + shellDeploy * 0.58,
  );
  data.rocketShoulders.position.y = mix(-0.24, 0, shellDeploy);
  const cowlDeploy = smooth(clamp((m - 0.26) / 0.56, 0, 1));
  data.canopyCowl.visible = cowlDeploy > 0.015;
  data.canopyCowl.scale.set(
    Math.max(0.04, cowlDeploy),
    Math.max(0.04, cowlDeploy),
    0.42 + cowlDeploy * 0.58,
  );
  data.canopyCowl.position.y = mix(0.34, 0.83, cowlDeploy);

  data.wings.forEach(({ hinge, side }) => {
    const deploy = smooth(clamp((m - 0.18) / 0.72, 0, 1));
    hinge.scale.set(deploy * 0.62, 0.18 + deploy * 0.82, deploy * 1.08);
    hinge.rotation.z = side * (1 - deploy) * 1.12;
    hinge.rotation.x = (1 - deploy) * -0.45;
    hinge.position.x = side * mix(0.44, 0.85, deploy);
  });
  data.gunPods.forEach((pod, index) => {
    const side = index === 0 ? -1 : 1;
    const deploy = smooth(clamp((m - 0.38) / 0.48, 0, 1));
    pod.scale.setScalar(Math.max(0.04, deploy));
    pod.position.x = side * mix(0.68, 1.38, deploy);
    pod.position.y = mix(-0.15, 0.06, deploy);
  });
  data.tailFins.forEach((fin, index) => {
    const side = index === 0 ? -1 : 1;
    const deploy = smooth(clamp((m - 0.12) / 0.7, 0, 1));
    fin.scale.set(0.48 * deploy, 0.5 * deploy, 0.5 * deploy);
    fin.rotation.z = side * (1 - deploy) * 0.9;
  });
  const tailDeploy = smooth(clamp((m - 0.16) / 0.62, 0, 1));
  data.dorsalTail.visible = tailDeploy > 0.025;
  data.dorsalTail.position.y = mix(0.13, 0.48, tailDeploy);
  data.dorsalTail.scale.set(0.72 + tailDeploy * 0.28, Math.max(0.04, tailDeploy), 0.82 + tailDeploy * 0.18);
  data.hingeFairings.scale.set(0.58 + tailDeploy * 0.42, 0.35 + tailDeploy * 0.65, 0.62 + tailDeploy * 0.38);
  data.hingeFairings.position.y = mix(-0.08, 0, tailDeploy);
  if (data.thermalSpine) {
    data.thermalSpine.visible = tailDeploy > 0.02;
    data.thermalSpine.position.y = mix(-0.18, 0, tailDeploy);
    data.thermalSpine.scale.set(0.74 + tailDeploy * 0.26, Math.max(0.06, tailDeploy), 0.68 + tailDeploy * 0.32);
  }
  if (data.rivalSignature) {
    const signatureDeploy = 0.28 + m * 0.72;
    data.rivalSignature.scale.set(signatureDeploy, signatureDeploy, signatureDeploy);
    data.rivalSignature.rotation.z = data.personality === 1 ? time * 0.34 : 0;
  }

  const speedHeat = clamp((speed - 280) / 720, 0, 1);
  const flame = clamp(0.48 + speedHeat * 0.22 + boost * 0.32 + m * 0.16 + data.releaseKick * 0.2, 0.42, 1.32);
  data.engineRig.position.z = 2.52 + m * 1.16;
  data.engineRig.scale.set(0.84 + m * 0.42, 0.72 + m * 0.28, 0.76 + m * 0.56);
  data.turbines.forEach(({ hotCore, corona, vaneRotor }) => {
    const pulse = Math.sin(time * 31) * 0.018;
    hotCore.material.opacity = 0.38 + flame * 0.12 + hitFlash * 0.08;
    corona.material.opacity = 0.025 + boost * 0.025 + m * 0.018 + data.releaseKick * 0.02;
    vaneRotor.rotation.z = 0;
    hotCore.material.opacity += pulse * 0.4;
  });
  data.wakes.forEach(({ outer, inner }) => {
    const flicker = 1 + Math.sin(time * 37) * 0.022;
    const wakeActive = m > 0.08 || boost > 0.08 || data.releaseKick > 0.035;
    outer.visible = wakeActive;
    inner.visible = wakeActive;
    outer.scale.set(1, 1, flame * flicker);
    inner.scale.set(1, 1, flame * 0.82 * flicker);
    outer.material.opacity = 0.03 + boost * 0.055 + m * 0.028 + data.releaseKick * 0.035;
    inner.material.opacity = 0.105 + boost * 0.11 + m * 0.065 + data.releaseKick * 0.075;
  });
  if (data.fill) {
    data.fill.intensity = 0.48 + boost * 0.58 + m * 0.2 + hitFlash * 0.72;
    data.fill.distance = 5.4 + boost * 1.4;
  }
  data.materials.engineThroat.emissiveIntensity = 0.018 + boost * 0.06 + m * 0.025 + hitFlash * 0.12;
  data.materials.heatMetal.emissiveIntensity = 0.045 + speedHeat * 0.055 + boost * 0.06 + m * 0.035;
  data.lightStrips.forEach((line) => {
    line.material.opacity = 0.42 + drift * 0.2 + boost * 0.1;
  });
  data.materials.glass.emissiveIntensity = 0.06 + hitFlash * 1.8 + drift * 0.08;
  data.materials.paint.emissive.set(data.accent).multiplyScalar(hitFlash * 0.55);
  data.materials.paint.emissiveIntensity = hitFlash > 0 ? 1 : 0;
}

/**
 * Restore the only vehicle-presentation values that integrate over elapsed
 * frames instead of being derived from the current simulation pose.  Keeping
 * this beside updateVehicleVisual prevents the renderer from having to know
 * the private wheel hierarchy, and guarantees the instanced tyre submission
 * is refreshed from the same reset transforms before the next draw.
 */
export function resetVehiclePresentation(vehicle) {
  const data = vehicle?.userData;
  if (!data?.wheelAssemblies || !data.tireBatch || !data.tireMatrixScratch) return false;
  data.releaseKick = 0;
  for (const assembly of data.wheelAssemblies) {
    const wheelData = assembly.userData;
    wheelData.tire.rotation.set(0, Math.PI / 2, 0);
    wheelData.rim.rotation.set(0, 0, Math.PI / 2);
  }
  updateTireBatchInstances(data.tireBatch, data.wheelAssemblies, data.tireMatrixScratch);
  return true;
}

export function disposeVehicle(vehicle) {
  const materials = new Set();
  const geometries = new Set();
  vehicle.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
    else if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
