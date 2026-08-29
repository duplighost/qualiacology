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

function createMaterials(accentHex, secondaryHex, player, racer = RACERS.player) {
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
  // The rider's suit.
  //
  // Every other material on this vehicle was authored for a dark chassis, and
  // a figure built out of them vanished: on Thunderglass the rider read as a
  // floating head over a dark wedge. A person has to hold together as ONE
  // shape on every world, so the suit is a light, self-lifting material with
  // the world's accent in its emissive -- bright against a dark road, and
  // still separated from a bright one by the accent rim.
  // --- the rider's materials ---------------------------------------------
  //
  // Alex sent reference sheets -- one man and one woman, recoloured five ways
  // each -- and they are all built the same way: a single saturated METALLIC
  // hue over the whole body, crisp dark panel lines cut into it, and bright
  // EMISSIVE piping running the limbs and the spine. A rounded full-face
  // helmet with a dark visor. No bolt-on armour anywhere.
  //
  // That is a different solution to the same problem the measurement found
  // earlier, and a better one. The worry was that a single-value body
  // disappears against half the game: the five roads span 555:1 in luminance
  // and four of them are nearly black. Bright ends on a dark body fixed it by
  // splitting the AREA. The reference sheets fix it by making the second tier
  // EMISSIVE instead -- piping is unlit, so no world can dim it, and the body
  // underneath is then free to be one clean metal. Same principle, and it
  // reads as a suit somebody wears rather than as a figure in pads.
  //
  // The player takes the silver-blue of the last male sheet. It is the only
  // one in the set that is not a saturated hue, which matters: the worlds own
  // orange, cyan and green, and the three rivals own crimson, yellow and
  // violet. Silver is the one thing on screen nothing else is.

  // The body. Glossy metal, smooth-shaded: the panel lines and the piping
  // carry the internal edges now, so the facets are not needed to provide
  // them and the reference look is smooth.
  const riderSuit = new THREE.MeshStandardMaterial({
    color: racer.suit,
    metalness: 0.62,
    roughness: 0.26,
    envMapIntensity: 2.0,
  });
  // A half-step brighter, for the helmet crown, the shoulders and the boots --
  // the parts the eye tracks. Same metal, just caught more light.
  const riderGear = new THREE.MeshStandardMaterial({
    color: racer.gear,
    metalness: 0.66,
    roughness: 0.2,
    envMapIntensity: 2.2,
  });
  // The panel lines, and everything that should read as a cut rather than as
  // a part: visor surround, belt, gauntlet, boot sole, knee and elbow.
  const riderShell = new THREE.MeshStandardMaterial({
    color: racer.shell,
    metalness: 0.55,
    roughness: 0.42,
    envMapIntensity: 1.2,
  });
  // The piping. Unlit, so its value is the one thing on the figure that no
  // world can touch -- which is what lets the body be a single metal.
  //
  // Deliberately not the vehicle accent 0x62f6ff: that is the same cyan as
  // Thunderglass and Ion Suture, their own lane lines and gates, so the
  // player would be camouflaged on forty per cent of the game. And
  // deliberately pale rather than saturated, because trick tier three is
  // 0xff4bd0 and the legibility gate counts tier pixels by normalised hue --
  // a saturated rider would sit inside a tier readout and eat it.
  const riderTrim = new THREE.MeshBasicMaterial({
    color: racer.trim,
    toneMapped: true,
  });
  // The visor. Dark and reflective, with just enough of the piping colour in
  // it to read as lit from inside.
  const riderVisor = new THREE.MeshPhysicalMaterial({
    color: 0x05090e,
    emissive: racer.visor,
    emissiveIntensity: 1,
    metalness: 0.2,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 2.4,
  });
  const suit = new THREE.MeshPhysicalMaterial({
    color: player ? 0xd6dee6 : secondary.clone().lerp(new THREE.Color(0xffffff), 0.55),
    emissive: accent.clone().multiplyScalar(player ? 0.10 : 0.06),
    metalness: 0.25,
    roughness: 0.45,
    clearcoat: 0.4,
    envMapIntensity: 1.2,
  });
  return {
    accent, secondary, paint, brushed, brushedDark, shoulder, carbon, glass, tire, brake,
    engineMetal, heatMetal, engineThroat, contact, skid, glow, hot, wingSkin, suit,
    riderSuit, riderShell, riderGear, riderTrim, riderVisor,
  };
}

/**
 * The rider. A person on a rocket board, built to be looked at for an hour.
 *
 * Alex, after the second play: "the character are just like white pill shaped
 * parts. its important to get the thing right the the player will be looking at
 * for so much of the game."
 *
 * The old rig failed for two reasons that are worth writing down, because they
 * are the two reasons any primitive-built figure fails.
 *
 * ONE VALUE. Every part -- torso, arms, legs, head -- was the same material at
 * the same near-white luminance. A human form in a single uniform material is
 * the definition of a mannequin; you get that read whatever shapes you use, and
 * no amount of added geometry fixes it. So the figure is built in three tiers
 * now, and which parts go in which tier is the whole design:
 *
 *   LIGHT   helmet, shoulder yoke, gloves, boots -- the extremities, which are
 *           exactly the parts whose silhouette the eye tracks.
 *   DARK    suit, limbs, torso core -- the mass between them.
 *   ACCENT  visor, spine line, pack chevron. A few per cent, and reserved.
 *
 * Bright ends on a dark body reads on ANY background, which matters because
 * this rider crosses Scoria's near-black road and Verdant Maw's mid green in
 * the same run. A single-tier character is guaranteed to vanish against half
 * the game.
 *
 * CAPSULES. A capsule is a pill because its radius never changes, both ends are
 * round, and its cross-section is circular. All three are fixed here: limbs are
 * tapered cylinders, they terminate in flat-cut blocks (gloves, boots) rather
 * than dissolving into a dome, and forearms and shins are flattened on one
 * axis. Every limb also BREAKS at its joint -- a pad, a cuff, a diameter step --
 * because an unbroken tube cannot express an elbow, and a pose that cannot
 * express an elbow cannot express effort.
 *
 * And the thing that decides the rest: at this camera you are looking at the
 * BACK, slightly from above, essentially always. So the back is designed first.
 * The pack, the shoulder yoke, the spine line and the trailing fin are the
 * shapes doing the work; a beautiful chest would contribute nothing.
 *
 * Proportions are the arcade-athletic band rather than anatomical: five heads
 * tall, shoulders about two and a half head-widths, hips three quarters of the
 * shoulders, legs half the height, and deliberately oversized helmet, gloves
 * and boots. Anatomically correct proportions plus no facial detail is, again,
 * precisely a shop dummy.
 */
// How much bigger the rig is drawn than it is modelled.
//
// Measured rather than guessed: the chase camera sits 12.9 units back at a 61
// degree fov, which puts 15.2 units of world across the frame height. A rider
// needs about 3.8 of those to read as a person rather than a speck, and this
// is what gets a 1.77-unit rig there. The framing solver's screenTarget and
// minimum distance are NOT the lever -- the camera is pinned at its MAXIMUM
// distance, so neither is in play.
const BOARD_RIG_SCALE = 1.9;

// In rider space: -z is the direction of travel, +z is toward the camera. The
// pack, the fin and the spine line all live at +z for that reason -- they are
// what is actually on screen.
const RIDER_HEAD_Y = 1.30;

/**
 * One mesh out of several parts, placed by transform.
 *
 * The rider is built almost entirely out of these, and the reason is draw
 * calls rather than tidiness. On a planet the board rig IS the whole vehicle,
 * every mesh costs roughly four draws once shadows and the three rivals are
 * counted -- rivals share this rig exactly -- and the perf gate in main.js
 * fails above 240. A first pass at this character was 45 meshes and measured
 * 284 draws on Scoria. Merging every static part into the joint that carries
 * it brings the mesh count to about 30 with no visible difference at all,
 * because none of those parts were ever going to move relative to each other.
 *
 * The rule the rig follows: ONE MESH PER ANIMATED JOINT PER MATERIAL. If two
 * parts share a parent and a material and never move apart, they are one mesh.
 *
 * mergeGeometryParts DISPOSES what it is given, so nothing handed to this may
 * be used anywhere else.
 */
function partsMesh(parent, material, parts, { castShadow = true, name = '' } = {}) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const merged = mergeGeometryParts(parts.map((part) => {
    position.set(...(part.position ?? [0, 0, 0]));
    euler.set(...(part.rotation ?? [0, 0, 0]));
    quaternion.setFromEuler(euler);
    scale.set(...(part.scale ?? [1, 1, 1]));
    return { geometry: part.geometry, matrix: matrix.clone().compose(position, quaternion, scale) };
  }));
  return addMesh(parent, merged, material, { castShadow, name });
}

/** A tapered, optionally flattened limb segment. Never a capsule. */
function limbSegment(parent, material, {
  top, bottom, length, name, flatten = 1, sides = 12,
}) {
  const geometry = new THREE.CylinderGeometry(top, bottom, length, sides, 1);
  const mesh = addMesh(parent, geometry, material, { name });
  mesh.scale.z = flatten;
  return mesh;
}

/**
 * A soft round falloff for the trick underglow.
 *
 * Alex: "When i do tricks in this it shows different color squares under the
 * board im riding, which probably shouldn't happen."
 *
 * They were literally squares. The underglow was a bare PlaneGeometry with no
 * alpha map and normal blending, so it drew as a hard-cornered, uniformly
 * opaque coloured quad -- and because a trick tier is held while AIRBORNE, at
 * nine to twelve units of measured lift, what the player saw was a solid
 * rectangle hanging in space under the board rather than a glow on anything.
 *
 * Two separate faults made it a square and both had to go: no falloff, so it
 * had four corners; and normal blending with tone mapping, so it PAINTED over
 * what was behind it instead of adding light to it. A glow adds.
 *
 * Built once at module scope. createBoardRig runs four times -- the player and
 * three rivals -- and this is a canvas upload every time it is called.
 */
let underglowTexture = null;
function makeUnderglowTexture(size = 64) {
  if (underglowTexture) return underglowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.30, 'rgba(255,255,255,.70)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  underglowTexture = new THREE.CanvasTexture(canvas);
  underglowTexture.colorSpace = THREE.NoColorSpace;
  underglowTexture.needsUpdate = true;
  return underglowTexture;
}

/**
 * The two bodies.
 *
 * Alex sent reference sheets of one male and one female figure, each
 * recoloured five ways, and asked for both: "you need to use those characters
 * i gave you. one male and one female. and then you can make them different
 * colors basically."
 *
 * WHAT ACTUALLY DIFFERS at this size is a short list, and most of the obvious
 * answers are not on it. At 12.9 units back the rider is about 150 pixels
 * tall, seen from behind and slightly above, in motion. Faces, hair, skin,
 * surface form and muscle definition are all either absent or sub-pixel. So
 * is the front hemisphere, which is never seen.
 *
 * HEIGHT IS DEAD TOO, and getting that wrong would have been the easy
 * mistake: a shorter figure at a fixed chase distance does not read as female,
 * it reads as further away or as a child, and it breaks the framing that
 * BOARD_RIG_SCALE was solved against. Both bodies are exactly the same height,
 * with the same joint positions, so one animation drives both.
 *
 * What survives is the OUTLINE, and specifically its two widest horizontals:
 * the shoulder line and the hip line. M is a monotonic wedge -- widest at the
 * shoulders, narrowing all the way down, no concavity anywhere. F reads
 * pelvis-wide, pinches at a higher waist, and flares to a narrower chest. The
 * torso-only shoulder-to-pelvis ratio is 1.87 against 1.35, and the waist
 * notch is the single most valuable number in the table.
 *
 * Every value here already existed in this function. No new meshes, no new
 * materials, no changed part counts -- which matters, because rivals share
 * this rig and draw calls are the binding constraint.
 */
/**
 * Who the four racers are.
 *
 * Alex: "one male and one female. and then you can make them different colors
 * basically."
 *
 * The suit colours are EXPLICIT here rather than derived from each racer's
 * accent, and that is a fix rather than a shortcut. The rivals could not have
 * a body colour at all before: the suit was built as
 * secondary.lerp(white, 0.42), three.js r161 runs Color.lerp in linear space
 * with colour management on, and that expression floors every channel at 0.42
 * linear -- 0xAE in sRGB -- whatever the input. VANTA's deep crimson came out
 * 0xB2AEAE. All three rivals were wearing the player's silver with a four-in-
 * 255 red bias, and a saturated metallic body was unreachable by construction.
 * The same shape of bug as every other one in this project: a derivation
 * authored for one case, with everything else falling through it.
 *
 * The vehicle accents are deliberately NOT touched -- they drive the HUD, the
 * standings, the trails, the glow and the flame, so repainting them has a far
 * wider blast radius than the suit.
 *
 * The hue space is genuinely crowded. The worlds own orange (15-16 deg), green
 * (110) and cyan (188-189); the trick tiers own 205, 32 and 317. That leaves
 * 240-360 and 40-60, which is why two of the reference sheet colours cannot be
 * used at all: green walks straight into Verdant Maw, and blue into two of the
 * five worlds. So: silver, red, brass, violet -- one achromatic and three hues
 * 90, 147 and 103 degrees apart, which also separate by value.
 *
 * Both bodies are on screen at once. Two of the four are female, so whichever
 * way the pack is running the player is looking at both silhouettes.
 */
export const RACERS = Object.freeze({
  player: { suit: 0xb9c6d4, gear: 0xd6e2ee, shell: 0x11161d, trim: 0xbdf3ff, visor: 0x0a2a38, body: 'M' },
  // VANTA, the knife.
  0: { suit: 0xe0596a, gear: 0xf2909c, shell: 0x1c0a0e, trim: 0xffd7dd, visor: 0x2e0a14, body: 'F' },
  // SAINT-0, the halo.
  1: { suit: 0xd9b45c, gear: 0xf0d590, shell: 0x1a1206, trim: 0xfff2c8, visor: 0x2a1f06, body: 'M' },
  // MORROW, the ghost.
  2: { suit: 0x9b8ee6, gear: 0xc0b6f4, shell: 0x0d0a1e, trim: 0xe2dcff, visor: 0x150e33, body: 'F' },
});

export const BODY_M = Object.freeze({
  torso: [
    { z: -0.05, width: 0.150, height: 0.104 },
    { z: 0.11, width: 0.158, height: 0.104 },
    { z: 0.26, width: 0.208, height: 0.120 },
    { z: 0.41, width: 0.264, height: 0.142 },
    { z: 0.53, width: 0.280, height: 0.146 },
    { z: 0.63, width: 0.228, height: 0.120 },
  ],
  shoulderX: 0.242,
  yokeSpan: 0.248,
  armX: 0.276,
  upperArm: [0.060, 0.048],
  foreArm: [0.048, 0.038],
  thigh: [0.086, 0.064],
  shin: [0.058, 0.046],
  hipX: 0.14,
  belt: [0.33, 0.054, 0.225],
  hair: null,
});

export const BODY_F = Object.freeze({
  torso: [
    { z: -0.05, width: 0.176, height: 0.112 },
    { z: 0.15, width: 0.146, height: 0.098 },
    { z: 0.29, width: 0.194, height: 0.118 },
    { z: 0.42, width: 0.226, height: 0.136 },
    { z: 0.53, width: 0.238, height: 0.138 },
    { z: 0.63, width: 0.204, height: 0.116 },
  ],
  shoulderX: 0.212,
  yokeSpan: 0.218,
  armX: 0.246,
  upperArm: [0.054, 0.044],
  foreArm: [0.043, 0.035],
  thigh: [0.092, 0.066],
  shin: [0.056, 0.045],
  hipX: 0.152,
  belt: [0.352, 0.050, 0.232],
  // Alex: "you need to use those characters i gave you." Every female sheet
  // has a huge flowing hair mass -- a quarter of the whole silhouette -- and
  // the earlier call that "hair is dead at this size" was made about a fringe,
  // not about this. A mass this large is the single strongest read the figure
  // has, and it is the one thing that tells the two bodies apart from behind,
  // which is the only angle this camera ever gives you.
  //
  // Three lofted shells, merged into ONE mesh: the draw budget is the binding
  // constraint on this rig (240, and each mesh costs about four), so hair that
  // cost three draws would have to come out of somewhere else.
  hair: [
    { z: -0.02, width: 0.150, height: 0.120, y: 0 },
    { z: 0.18, width: 0.196, height: 0.168, y: 0.044 },
    { z: 0.40, width: 0.176, height: 0.152, y: 0.118 },
    { z: 0.60, width: 0.124, height: 0.108, y: 0.206 },
    { z: 0.74, width: 0.064, height: 0.056, y: 0.286 },
  ],
});

// The height of the deck's own centreline inside the rig. The board spins
// about THIS, not about the rig origin -- a board pivoting around the rider's
// waist is a windmill, not a kickflip.
const BOARD_AXIS_Y = -0.17;

function createBoardRig(materials, player, body = BODY_M) {
  const rig = new THREE.Group();
  rig.name = 'board-rig';

  // Everything the RIDER does not stand on hangs off here, and this group is
  // what a kickflip turns. The rider is a sibling, so they stay upright with
  // their knees tucked while the deck comes round under their feet -- which is
  // what the trick is. Rotating the shared parent instead (which is what
  // `state.roll` did) put the whole figure on its side in mid-air and read as
  // a wipeout.
  const boardSpin = new THREE.Group();
  boardSpin.name = 'board-spin';
  boardSpin.position.y = BOARD_AXIS_Y;
  rig.add(boardSpin);

  // --- the board ---------------------------------------------------------
  // Short, thin, upturned at both ends. It is furniture for the rider, not the
  // vehicle: at this size it should read as something under someone's feet.
  // Chunky, not a plank. Alex's sheets show a hoverboard with real depth and
  // thrusters slung under it; what shipped was a thin dark board that read as
  // a shadow with the rider standing on it. Roughly doubling the section is
  // most of the difference, and it is also what makes the board worth grabbing
  // -- a deck the hand can actually find has to have a side to it.
  const deck = addMesh(boardSpin, makeLoftGeometry([
    { z: -1.32, width: 0.13, height: 0.052, y: 0.088 },
    { z: -1.06, width: 0.28, height: 0.082, y: 0.028 },
    { z: -0.42, width: 0.33, height: 0.098, y: 0 },
    { z: 0.42, width: 0.33, height: 0.098, y: 0 },
    { z: 1.06, width: 0.28, height: 0.082, y: 0.028 },
    { z: 1.32, width: 0.13, height: 0.052, y: 0.088 },
  ], 22, true), materials.brushedDark, { name: 'board-deck' });
  deck.position.y = 0;

  // Two lit strips down the deck edges, plus the two glowing rings slung
  // UNDER it that every one of Alex's board sheets has. All four are one mesh
  // on purpose: the two strips used to be two meshes, so folding the rings in
  // here adds the detail the sheets ask for and still costs one draw fewer
  // than before. The draw budget is what decides what this rig can have.
  const railParts = [
    { geometry: new THREE.BoxGeometry(0.05, 0.032, 2.45), position: [-0.158, -0.140 - BOARD_AXIS_Y, 0] },
    { geometry: new THREE.BoxGeometry(0.05, 0.032, 2.45), position: [0.158, -0.140 - BOARD_AXIS_Y, 0] },
    { geometry: new THREE.TorusGeometry(0.115, 0.022, 6, 16), position: [0, -0.196 - BOARD_AXIS_Y, -0.64], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.TorusGeometry(0.115, 0.022, 6, 16), position: [0, -0.196 - BOARD_AXIS_Y, 0.68], rotation: [Math.PI / 2, 0, 0] },
  ];
  const rail = [partsMesh(boardSpin, materials.glow, railParts, {
    castShadow: false, name: 'board-rail',
  })];

  // Thrusters where the trucks would be, tips swept back.
  const pods = [partsMesh(
    boardSpin,
    materials.engineMetal,
    [-1, 1].flatMap((side) => [-0.62, 0.66].map((z) => ({
      geometry: new THREE.ConeGeometry(0.062, 0.26, 8),
      position: [side * 0.12, -0.25 - BOARD_AXIS_Y, z],
      rotation: [Math.PI / 2 - 0.22, 0, 0],
    }))),
    { name: 'board-thruster' },
  )];

  // Underglow: the trick flame, written on the thing the rider stands on.
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: makeUnderglowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    // Additive, so it reads as light thrown onto whatever is under the board
    // rather than as a decal stuck over it. That is the difference between a
    // glow and a sticker, and it is most of why the old one looked like a
    // rectangle even before the missing falloff is counted.
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4), flameMaterial);
  flame.rotation.x = -Math.PI / 2;
  // Raised from -0.40. At BOARD_RIG_SCALE that left 0.10 units of clearance
  // over the road, so any bank or roll cut the plane through the surface --
  // which is what turned the last third of a second after a landing into a
  // clipped rectangle sliding through the ground.
  flame.position.y = -0.30;
  flame.renderOrder = 3;
  rig.add(flame);

  const exhausts = [-1, 1].map((side) => {
    const cone = addMesh(boardSpin, new THREE.ConeGeometry(0.085, 0.5, 10), materials.hot, {
      castShadow: false, name: 'board-exhaust',
    });
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(side * 0.11, -0.15 - BOARD_AXIS_Y, 1.32);
    return cone;
  });

  // --- the rider ---------------------------------------------------------
  const rider = new THREE.Group();
  rig.add(rider);
  // A SIDEWAYS stance -- you do not stand on a board facing where you are
  // going. It is applied to the BODY, not to the whole rider: rotating the
  // rider group swung the feet off the board with it, and the result was a
  // torso floating beside a deck it was not standing on. The feet stay planted
  // along the board's length and the shoulders turn above them.
  const STANCE = -1.15;

  // --- legs --------------------------------------------------------------
  // Shin slightly longer than thigh and noticeably thinner. Equal-length,
  // equal-thickness segments read as furniture; this ratio reads as sprung.
  //
  // Three meshes per leg, one per value tier: the suit, the hard breaks, and
  // the boot. The knee pad and the binding never move relative to the leg, so
  // they are part of the shell mesh rather than meshes of their own.
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * body.hipX, -0.045, side * 0.40);
    leg.rotation.y = STANCE * 0.55;
    rider.add(leg);

    const limb = partsMesh(leg, materials.riderSuit, [
      { geometry: new THREE.CylinderGeometry(body.thigh[0], body.thigh[1], 0.34, 12, 1), position: [0, 0.52, 0] },
      { geometry: new THREE.CylinderGeometry(body.shin[0], body.shin[1], 0.31, 12, 1), position: [0, 0.165, 0], scale: [1, 1, 0.78] },
    ], { name: 'rider-leg' });

    // The knee BREAK and the binding. An unbroken tube cannot express a knee
    // angle, and a pose that cannot express a knee cannot express effort; a
    // foot with nothing holding it to the deck reads as propped, not planted.
    const shell = partsMesh(leg, materials.riderShell, [
      { geometry: new THREE.BoxGeometry(0.118, 0.078, 0.104), position: [0, 0.345, -0.022] },
      { geometry: new THREE.BoxGeometry(0.104, 0.028, 0.058), position: [0, 0.048, 0.012] },
      // The boot's sole, folded in: same tier, same group, never moves apart.
      { geometry: new THREE.BoxGeometry(0.155, 0.030, 0.285), position: [0, -0.030, -0.012] },
    ], { name: 'rider-leg-shell' });

    // Boot: deliberately oversized, flat-soled, wedged toe forward. This is the
    // base of the figure's wedge and the thing that plants it on the deck. A
    // limb that tapers to a rounded stop is the definitive mannequin cue.
    const boot = addMesh(leg, makeLoftGeometry([
      { z: -0.17, width: 0.058, height: 0.032, y: 0.032 },
      { z: -0.09, width: 0.080, height: 0.048, y: 0.012 },
      { z: 0.06, width: 0.084, height: 0.060, y: 0 },
      { z: 0.14, width: 0.066, height: 0.053, y: 0.008 },
    ], 10, true), materials.riderGear, { name: 'rider-boot' });
    boot.position.y = 0.012;

    // The piping, down the outside of the thigh and the shin.
    const pipe = partsMesh(leg, materials.riderTrim, [
      { geometry: new THREE.BoxGeometry(0.016, 0.20, 0.030), position: [side * (body.thigh[0] - 0.004), 0.55, -0.020] },
      { geometry: new THREE.BoxGeometry(0.014, 0.17, 0.026), position: [side * 0.056, 0.19, -0.026] },
    ], { castShadow: false, name: 'rider-leg-pipe' });

    return { group: leg, limb, shell, boot, pipe };
  });

  // Hips carry everything above the knees, so a crouch is one rotation -- and
  // the stance turn lives here, above the feet.
  const hips = new THREE.Group();
  hips.position.y = 0.755;
  hips.rotation.y = STANCE;
  rider.add(hips);

  // --- torso -------------------------------------------------------------
  // Wider than it is deep, narrowest just above the belt, widest at the chest.
  // A tube of constant width is the second-largest mannequin cue after uniform
  // value. Shoulder-to-hip taper IS the athleticism.
  //
  // After the -PI/2 rotation about x, a ring's `z` is height and its `height`
  // is front-to-back depth. And -z is the direction of travel: the chest faces
  // away from the camera, the pack faces toward it.
  const torso = addMesh(hips, makeLoftGeometry(
    body.torso.map((ring) => ({ ...ring, y: 0 })),
    20,
    true,
  ), materials.riderSuit, { name: 'rider-torso' });
  torso.rotation.x = -Math.PI / 2;

  // --- the back, which is what the player actually looks at ---------------
  // One dark-shell mesh: the belt, the pack, and the pack's lower fairing. The
  // pack is the biggest shape above the waist and the chase camera sees it for
  // the whole game, so it is designed first and everything else fits round it.
  // The belt is a hard horizontal break at the waist -- the eye needs somewhere
  // to stop between the legs and the chest.
  const shell = partsMesh(hips, materials.riderShell, [
    { geometry: new THREE.BoxGeometry(...body.belt), position: [0, 0.075, 0] },
    {
      geometry: makeLoftGeometry([
        { z: -0.02, width: 0.125, height: 0.058, y: 0 },
        { z: 0.06, width: 0.148, height: 0.076, y: 0 },
        { z: 0.30, width: 0.152, height: 0.080, y: 0 },
        { z: 0.38, width: 0.116, height: 0.062, y: 0 },
      ], 8, true),
      position: [0, 0.235, 0.150],
      rotation: [-Math.PI / 2, 0, 0],
    },
  ], { name: 'rider-shell' });

  // --- shoulders and gear ------------------------------------------------
  // One light-tier mesh: the shoulder yoke, both pads and the tank.
  //
  // Angular hard-shell caps against the round helmet dome. The collision of a
  // circle with a wedge is what the eye locks onto; a figure built entirely
  // from one shape family is uniform and therefore illegible.
  //
  // Two deliberate asymmetries live here: the left pad is a sixth larger than
  // the right, and there is ONE tank rather than a matched pair. Asymmetry is a
  // spice -- two or three touches read as a person who packed it that way,
  // while a rig where nothing lines up reads as broken.
  const shoulderProfile = () => makeLoftGeometry([
    { z: -0.12, width: 0.064, height: 0.052, y: 0 },
    { z: 0.02, width: 0.104, height: 0.082, y: 0.005 },
    { z: 0.15, width: 0.082, height: 0.064, y: -0.012 },
  ], 8, true);
  const gear = partsMesh(hips, materials.riderGear, [
    {
      geometry: shoulderProfile(),
      position: [-body.shoulderX, 0.551, 0.008],
      rotation: [-Math.PI / 2, 0, -0.30],
      scale: [1.16, 1.16, 1.16],
    },
    {
      geometry: shoulderProfile(),
      position: [body.shoulderX, 0.551, 0.008],
      rotation: [-Math.PI / 2, 0, 0.30],
      scale: [0.92, 0.92, 0.92],
    },
    {
      // The yoke, tying the two pads into one shape so the shoulder line reads
      // as a single wide plane rather than as two bumps.
      geometry: makeLoftGeometry([
        { z: -body.yokeSpan, width: 0.052, height: 0.042, y: 0 },
        { z: -0.08, width: 0.080, height: 0.056, y: 0.012 },
        { z: 0.08, width: 0.080, height: 0.056, y: 0.012 },
        { z: body.yokeSpan, width: 0.052, height: 0.042, y: 0 },
      ], 8, true),
      position: [0, 0.581, 0.052],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.042, 0.048, 0.21, 8),
      position: [-0.092, 0.30, 0.200],
      rotation: [0.10, 0, 0],
    },
  ], { name: 'rider-gear' });

  // --- the reserved accent ------------------------------------------------
  // One saturated colour, used on the player and almost nowhere else: a spine
  // line up the back, a chevron on the pack, a plate on the chest. A thin
  // bright vertical is the cheapest thing there is for saying which way a dark
  // mass is facing, and at distance it is what says which racer is you.
  const trim = partsMesh(hips, materials.riderTrim, [
    { geometry: new THREE.BoxGeometry(0.028, 0.30, 0.020), position: [0, 0.32, 0.120] },
    { geometry: new THREE.BoxGeometry(0.044, 0.23, 0.022), position: [0.032, 0.34, 0.234] },
    { geometry: new THREE.BoxGeometry(0.078, 0.22, 0.030), position: [0.026, 0.39, -0.144] },
  ], { castShadow: false, name: 'rider-trim' });
  // updateBoardRig drives `chest` by name; it is part of the trim now.
  const chest = trim;

  // --- head --------------------------------------------------------------
  // No neck. A pale cylinder between head and shoulders is a strong dummy
  // signal, so the helmet sits nearly on the yoke.
  //
  // The helmet is the single most important shape on the figure: it is the top
  // fifth, it is what the player consciously tracks, and it must not be a shape
  // anything else in the scene has. So: a dome longer front-to-back than it is
  // wide, a brow over the visor, and a crest swept off the back of the crown --
  // which, at this camera, points straight at the player all game.
  const skull = new THREE.Group();
  skull.position.y = 0.555;
  hips.add(skull);

  const head = addMesh(skull, new THREE.SphereGeometry(0.178, 20, 14), materials.riderSuit, {
    castShadow: false, name: 'rider-helmet',
  });
  head.scale.set(1, 0.94, 1.10);

  // The visor: a band, not a face. At this size eyes and a mouth are five
  // pixels of noise that break under motion; DIRECTION is what is needed, and
  // a band gives it without pretending to be features.
  const visor = addMesh(skull, new THREE.SphereGeometry(0.181, 14, 8, 0, Math.PI, 0.62, 0.72), materials.riderVisor, {
    castShadow: false, name: 'rider-visor',
  });
  visor.scale.set(1, 0.94, 1.10);
  visor.rotation.y = -Math.PI / 2;

  // Brow and crest: the two shapes that turn a sphere into a head that is
  // pointing somewhere. A sphere is the only primitive with no orientation, and
  // that absence of attention is exactly the mannequin read.
  const skullShell = partsMesh(skull, materials.riderShell, [
    {
      geometry: makeLoftGeometry([
        { z: -0.140, width: 0.034, height: 0.026, y: 0 },
        { z: 0, width: 0.062, height: 0.036, y: 0.014 },
        { z: 0.140, width: 0.034, height: 0.026, y: 0 },
      ], 8, true),
      position: [0, 0.058, -0.142],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: makeLoftGeometry([
        { z: -0.04, width: 0.024, height: 0.060, y: 0 },
        { z: 0.11, width: 0.019, height: 0.078, y: -0.012 },
        { z: 0.26, width: 0.011, height: 0.044, y: -0.064 },
      ], 6, true),
      position: [0, 0.090, 0.058],
      rotation: [-Math.PI / 2, 0, 0],
    },
    // Ear pods, in every one of Alex's sheets. Cheap, distinctive, and free:
    // they never move relative to the helmet, so they are part of this mesh
    // rather than a mesh of their own.
    {
      geometry: new THREE.CylinderGeometry(0.052, 0.046, 0.038, 10),
      position: [-0.166, -0.010, 0.016],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new THREE.CylinderGeometry(0.052, 0.046, 0.038, 10),
      position: [0.166, -0.010, 0.016],
      rotation: [0, 0, Math.PI / 2],
    },
  ], { castShadow: false, name: 'rider-skull-shell' });

  // The hair, on its own pivot so it can LAG. Free secondary motion: the fin
  // already proves the machinery (see finLag), and one element arriving late
  // is the whole difference between a figure and a rigid object being moved
  // through space. It hangs off the helmet and swings behind the shoulders,
  // which at this camera is the part the player actually sees.
  let hairPivot = null;
  let hair = null;
  if (body.hair) {
    hairPivot = new THREE.Group();
    hairPivot.position.set(0, 0.040, 0.092);
    skull.add(hairPivot);
    hair = addMesh(hairPivot, makeLoftGeometry(body.hair, 10, true), materials.riderShell, {
      castShadow: false, name: 'rider-hair',
    });
    hair.rotation.x = Math.PI / 2;
  }

  // --- arms --------------------------------------------------------------
  // Three meshes an arm: the upper, the forearm, and the gauntlet the forearm
  // ends in. The forearm and everything below it hang off their own group so
  // the elbow can actually bend -- an arm that is one rigid tube cannot express
  // an elbow angle, and a pose that cannot express an elbow cannot express
  // effort.
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * body.armX, 0.518, 0.012);
    hips.add(arm);

    const upper = limbSegment(arm, materials.riderSuit, {
      top: body.upperArm[0], bottom: body.upperArm[1], length: 0.25, name: 'rider-upper-arm',
    });
    upper.position.y = -0.145;

    const forearm = new THREE.Group();
    forearm.position.y = -0.278;
    arm.add(forearm);

    const fore = limbSegment(forearm, materials.riderSuit, {
      top: body.foreArm[0], bottom: body.foreArm[1], length: 0.22, name: 'rider-forearm', flatten: 0.76,
    });
    fore.position.y = -0.127;

    // The gauntlet: elbow cap, cuff and glove as one light-tier mesh. The
    // glove is deliberately oversized -- small hands vanish at distance and
    // take the arm's readability with them -- and the left gauntlet is the
    // longer one, which is the figure's third asymmetry.
    const gauntlet = partsMesh(forearm, materials.riderShell, [
      { geometry: new THREE.BoxGeometry(0.086, 0.058, 0.082), position: [0, 0.008, 0] },
      { geometry: new THREE.CylinderGeometry(0.054, 0.047, side < 0 ? 0.115 : 0.062, 8), position: [0, -0.214, 0] },
      {
        geometry: makeLoftGeometry([
          { z: -0.070, width: 0.054, height: 0.046, y: 0 },
          { z: 0.026, width: 0.074, height: 0.064, y: 0 },
          { z: 0.084, width: 0.052, height: 0.050, y: -0.005 },
        ], 8, true),
        position: [0, -0.267, 0],
        rotation: [-Math.PI / 2, 0, 0],
      },
    ], { name: 'rider-gauntlet' });

    // And down the outside of the upper arm and the forearm.
    const pipe = partsMesh(arm, materials.riderTrim, [
      { geometry: new THREE.BoxGeometry(0.014, 0.16, 0.026), position: [side * 0.058, -0.145, -0.014] },
    ], { castShadow: false, name: 'rider-arm-pipe' });
    const forePipe = partsMesh(forearm, materials.riderTrim, [
      { geometry: new THREE.BoxGeometry(0.012, 0.14, 0.022), position: [side * 0.046, -0.127, -0.012] },
    ], { castShadow: false, name: 'rider-forearm-pipe' });

    return { group: arm, forearm, upper, fore, gauntlet, pipe, forePipe, side };
  });

  // --- the trailing fin ---------------------------------------------------
  // The one element allowed to arrive late. A figure where every part reaches
  // its new orientation on the same frame reads as one rigid object being
  // translated through space; a single lagging piece breaks that, and it costs
  // one eased angle.
  // Hung off the RIDER rather than the hips, and that is the whole point: the
  // hips carry the sideways stance turn, so anything parented to them points
  // sixty-six degrees off the direction of travel. A pack riding on the rider's
  // back should turn with the rider. A thing that streams behind them in the
  // air should not -- it streams down the board, whichever way the shoulders
  // happen to be facing.
  const finPivot = new THREE.Group();
  finPivot.position.set(0.02, 1.02, 0.14);
  rider.add(finPivot);
  const fin = addMesh(finPivot, makeLoftGeometry([
    { z: 0, width: 0.030, height: 0.052, y: 0 },
    { z: 0.12, width: 0.024, height: 0.086, y: -0.016 },
    { z: 0.30, width: 0.017, height: 0.070, y: -0.056 },
    { z: 0.44, width: 0.008, height: 0.030, y: -0.108 },
  ], 6, true), materials.riderShell, { castShadow: false, name: 'rider-fin' });
  fin.rotation.x = 0.30;

  rig.userData = {
    deck, rail, pods, flame, flameMaterial, exhausts, boardSpin,
    rider, hips, torso, chest, head, visor, arms, legs, stance: STANCE,
    shell, gear, trim, skull, skullShell, fin, finPivot,
    hair, hairPivot, hairLag: 0,
    player,
  };
  return rig;
}

export function createVehicle(accentHex, secondaryHex, { player = false, personality = 0 } = {}) {
  const racer = player ? RACERS.player : (RACERS[personality] ?? RACERS.player);
  const root = new THREE.Group();
  root.name = player ? 'player-vehicle' : `rival-${personality}`;
  const pose = new THREE.Group();
  root.add(pose);
  const materials = createMaterials(accentHex, secondaryHex, player, racer);

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

  const boardRig = createBoardRig(materials, player, racer.body === 'F' ? BODY_F : BODY_M);
  pose.add(boardRig);

  root.userData = {
    accent: materials.accent,
    materials,
    pose,
    boardRig,
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
  // Rider flip angle. Phase 5's air tricks drive it, and it composes with the
  // launch fold rather than replacing it.
  pitch = 0,
  // The BOARD's rotation about its own long axis, under a rider who stays
  // upright. This is a kickflip. It is deliberately NOT `roll`: `roll` turns
  // the pose group the rider is parented under, which inverts the person too.
  boardFlip = 0,
  // Which trick flame is lit, 0-3. Written on the board's underglow, and lit
  // WHILE the trick is in the air so the player can see what they are about to
  // cash before choosing to keep spinning or square up.
  trickTier = 0,
  // Seconds the grab has been held. Drives the rider reaching for the board.
  grab = 0,
  trickMeter = 0,
  crouch = 0,
  landingSettle = 0,
  landingQuality = 0,
  flameColor = null,
  airborne = false,
  grinding = false,
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
  updateBoardRig(data, {
    morph: m,
    steer,
    driftSide,
    driftCharge: drift,
    boardFlip,
    trickTier,
    trickMeter,
    crouch,
    landingSettle,
    landingQuality,
    flameColor,
    airborne,
    grinding,
    grab,
    boost,
    speed,
    dt,
    time,
  });
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
  data.pose.rotation.x = pitch - m * 0.035 + data.releaseKick * 0.055;
  data.pose.position.y = 0.27 + lift - surfaceDrift * 0.018 + Math.sin(time * 12) * 0.012 * m;
  data.pose.position.z = -data.releaseKick * 0.3;

  data.core.scale.set(
    1 - m * 0.24,
    1 - m * 0.17,
    1 + m * 0.7,
  );
  // On the ground the vehicle IS the board -- the hull and the car rig are the
  // glider's body, and they unfold out of the board as the morph rises rather
  // than sitting inside it. The crossover is the same 0-0.22 window the board
  // fades across, so there is never a frame containing two vehicles.
  const hullPresence = smooth(clamp(m / 0.22, 0, 1));
  data.core.visible = hullPresence > 0.005;
  data.carRig.visible = hullPresence > 0.005;
  // The engine rig belongs to the glider: it is sized and placed for a hull
  // that is not there on the ground, and left visible it read as car turbines
  // hanging off the back of a skateboard. The board carries its own exhaust.
  data.engineRig.visible = hullPresence > 0.005;
  if (data.core.visible) data.core.scale.multiplyScalar(Math.max(0.02, hullPresence));
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
/**
 * The board's own animation.
 *
 * The lean is the point, and so is the crouch. A rider who visibly loads up
 * before a pop and visibly absorbs a landing tells the player what their own
 * hands are doing, in the middle of the screen where they are already looking.
 */
function updateBoardRig(data, {
  morph, steer, driftSide, driftCharge, boardFlip, trickTier, trickMeter, crouch,
  landingSettle, landingQuality, flameColor, airborne, grinding, grab,
  boost, speed, dt, time,
}) {
  const rig = data.boardRig;
  if (!rig) return;
  const board = rig.userData;
  // The board folds away as the glider unfolds; they cross over quickly so
  // there is never a frame with two vehicles in it.
  const present = 1 - smooth(clamp(morph / 0.22, 0, 1));
  rig.visible = present > 0.01;
  if (!rig.visible) return;
  // Fold-away times base scale. Setting it to `present` alone silently wiped
  // the base scale every frame, which is why two rounds of resizing the rig
  // changed nothing on screen.
  rig.scale.setScalar(present * BOARD_RIG_SCALE);

  // The GRAB. Alex: "grab tricks where you grab your board as well."
  //
  // A grab is not a pose the arm holds -- it is the rider folding up and
  // pulling the board to meet the hand, which is how it works on a real board
  // and why it reads as effort rather than as a limb sticking out. So one arm
  // reaches down and across, the knees come up harder, and the whole body
  // shortens. The leading arm does the reaching; the other stays out for
  // balance, which is the asymmetry that makes it look deliberate.
  const reach = clamp((grab ?? 0) * 5.5, 0, 1) * (airborne ? 1 : 0);
  const lean = clamp(-steer * 0.46, -0.95, 0.95);
  // One crouch channel: the pop being loaded, plus a landing being absorbed,
  // plus a little squat under boost.
  const absorbing = clamp(landingSettle * 2.4, 0, 1) * (1.15 - landingQuality * 0.5);
  const squat = clamp(crouch * 0.85 + absorbing * 0.75 + boost * 0.10, 0, 1);

  rig.rotation.z = lean * 0.42;
  // THE KICKFLIP. One assignment, on a group the rider is not inside: the deck,
  // its lit strips, its thrusters and its exhausts come round the board's long
  // axis while the person above them stays on their feet. The underglow is
  // deliberately left out of this group -- it is light thrown on the road, and
  // spinning it would strobe the trick-tier readout the player is reading.
  //
  // THE POKE rides on the same group. A grab where only the rider moves reads
  // from the chase camera as an air crouch, because the thing being grabbed
  // never answers: the hand goes down, the board does nothing, and nothing
  // connects. So the board answers. The nose kicks out and the deck tilts up
  // toward the reaching hand, which is the shape every real grab has and the
  // reason it is legible at 150 pixels.
  if (board.boardSpin) {
    board.boardSpin.rotation.z = (boardFlip ?? 0) - reach * 0.24;
    board.boardSpin.rotation.x = reach * 0.32;
    // And the board comes UP. A grab is the rider pulling the deck to their
    // hand, not the hand falling to the deck -- the arm is not long enough for
    // the second one, which is the geometry the previous attempt lost to. The
    // knees are already tucking by the same `reach`, so the feet travel with
    // it and the rider stays standing on the thing they are holding.
    board.boardSpin.position.y = BOARD_AXIS_Y + reach * 0.20;
  }
  board.rider.rotation.z = lean * 0.30;
  // Hips drop and the torso folds forward as the board is loaded. This is the
  // tell for how much pop is coming, and it is why holding the button feels
  // like winding something up.
  // On a grab the whole body drops toward the deck as well as folding. Tucking
  // the knees alone left the hand a clear gap above the board -- which reads as
  // reaching for it and missing, and is worse than not reaching at all.
  board.hips.position.y = 0.80 - squat * 0.36 - reach * 0.30;
  board.hips.rotation.x = (airborne ? -0.34 : squat * 0.62) + reach * 0.42;
  board.hips.rotation.y = board.stance + lean * 0.18;
  board.torso.rotation.z = -lean * 0.22;
  board.chest.material = data.materials.glow;
  // The head, and everything bolted to it, move together. A helmet that stays
  // put while the shoulders drop is a helmet floating above a person.
  // The head, and everything bolted to it, move together -- a helmet that
  // stays put while the shoulders drop is a helmet floating above a person.
  // They share a group, so that is one assignment.
  if (board.skull) board.skull.position.y = 0.555 - squat * 0.08;

  board.legs.forEach(({ group, limb }, index) => {
    const side = index === 0 ? -1 : 1;
    // Knees bend outward under load and tuck up in the air. The leg is one
    // merged mesh per tier now, so the compression is a scale on the limb
    // rather than a per-segment offset -- visually the same at this size, and
    // three draws a leg instead of five.
    // Knees come up hard on a grab. The board rises with them, which is the
    // half of the motion that makes the hand and the deck actually meet.
    const bend = squat * 0.9 + (airborne ? 0.5 : 0) + reach * 0.75;
    group.rotation.x = side * 0.10 - bend * 0.18;
    group.rotation.z = side * (0.05 + bend * 0.22) + lean * 0.12;
    limb.scale.y = 1 - bend * 0.14;
    group.position.y = -0.045 + (airborne ? 0.10 : 0);
  });

  board.arms.forEach(({ group, side, forearm }) => {
    // Arms out for balance, wider the harder the board is leaning, thrown up
    // in the air and tucked in on a grind.
    //
    // The spread is not vanity: the GAP between the inner arm and the torso is
    // what makes the figure read as a figure at all. A solid convex mass reads
    // as a blob at any resolution -- it is the holes that carry it -- so the
    // arms are never allowed to lie flat against the body.
    const spread = 0.40 + Math.abs(lean) * 0.62 + (airborne ? 0.62 : 0) - (grinding ? 0.16 : 0);
    // Asymmetric by a few per cent. A figure caught perfectly symmetric is a
    // figure nobody is inside.
    const bias = side < 0 ? 1.09 : 0.94;
    // side < 0 is the leading arm, and it is the one that reaches.
    const grabbing = side < 0 ? reach : reach * 0.18;
    // The other arm goes UP. Both arms drifting toward the board is two hands
    // doing the same job; one down and one high is a figure counterweighting
    // itself, and the asymmetry is what sells the grab from behind.
    const counterweight = side > 0 ? reach * 0.62 : 0;
    group.rotation.z = (side * spread * bias + lean * 0.3) * (1 - grabbing * 0.72)
      + grabbing * side * 0.34;
    group.rotation.x = airborne
      ? -0.7 - trickMeter * 0.4 + grabbing * 2.05 - counterweight
      : side * 0.30 - 0.10 + Math.sin(time * 2.4 + side) * 0.05;
    // The elbow actually bends, and everything below it follows -- which is
    // the whole reason the forearm hangs off its own group. Without it the arm
    // is one rigid tube, and a tube cannot express effort.
    // The elbow OPENS on a grab. It used to close: `+ grabbing * 0.85` folded
    // the forearm back 1.9 rad while the shoulder swung down 1.35, so the net
    // hand direction pointed UP and the reach ended at the rider's own chest.
    // That is why the grab read as an air crouch -- the arm was not reaching
    // for anything, it was hugging. You cannot grab something by curling up.
    const flex = 0.62 + squat * 0.55 + (airborne ? 0.45 : 0) + Math.abs(lean) * 0.22
      - grabbing * 0.62;
    forearm.rotation.x = -flex;
  });

  // The fin LAGS. One element arriving late is the whole difference between a
  // figure and a rigid object being translated through space, and it costs a
  // single eased angle. It trails the lean and lifts with speed.
  if (board.finPivot) {
    const wanted = lean * 0.62 + Math.sin(time * 3.1) * 0.05;
    board.finLag = (board.finLag ?? 0) + (wanted - (board.finLag ?? 0)) * Math.min(1, dt * 7.5);
    board.finPivot.rotation.z = board.finLag;
    board.finPivot.rotation.x = 0.22 - clamp(speed / 900, 0, 1) * 0.30 - boost * 0.14;
  }

  // The hair lags harder and slower than the fin, because it is heavier and
  // because a mass this size arriving late is the motion cue doing the work.
  // It streams up as speed rises and swings across the lean.
  if (board.hairPivot) {
    const wanted = lean * 0.95 + Math.sin(time * 2.2) * 0.075;
    board.hairLag = (board.hairLag ?? 0) + (wanted - (board.hairLag ?? 0)) * Math.min(1, dt * 4.2);
    board.hairPivot.rotation.z = board.hairLag;
    board.hairPivot.rotation.x = 0.30 - clamp(speed / 780, 0, 1) * 0.62 - boost * 0.22
      + (airborne ? 0.18 : 0);
  }

  // The reserved accent stretches with earned speed, so the one saturated
  // colour on the figure is also a readout.
  if (board.trim) board.trim.scale.y = 1 + boost * 0.22;

  // Deliberately not scaled. The four thrusters are one merged mesh now, and
  // scaling a merged mesh moves its parts apart instead of growing them in
  // place -- so the boost read lives entirely in the exhausts below, which is
  // where it was always loudest anyway.

  board.exhausts.forEach((cone) => {
    // Length tracks BOOST, not speed, so what is behind the board is the speed
    // the player earned rather than the speed the segment gave them.
    // Nearly nothing at rest: two idle cones behind the board read as wheels,
    // and a wheel is the one thing this vehicle must not appear to have.
    const lit = clamp(boost * 1.6, 0, 1);
    cone.visible = lit > 0.02;
    cone.scale.set(0.35 + lit * 0.55, 0.2 + lit * 2.4, 0.35 + lit * 0.55);
    cone.position.z = 1.32 + lit * 0.42;
  });

  // The flame. No tier lit means no colour at all, so "nothing yet" reads as
  // clearly as blue, orange or pink.
  const wanted = trickTier > 0 && flameColor !== null ? 0.46 + trickTier * 0.15 : 0;
  const material = board.flameMaterial;
  material.opacity = material.opacity + (wanted - material.opacity) * Math.min(1, dt * 12);
  if (flameColor !== null) material.color.setHex(flameColor);
  board.flame.scale.set(1 + trickMeter * 0.35, 1, 1 + boost * 0.3);
  for (const strip of board.rail) strip.material = data.materials.glow;
}

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
