import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';

// SECONDHAND SAINT character rigs
// --------------------------------
// These rigs deliberately keep animation in code. Combat owns the clock and
// supplies actionTime; the render layer only poses a hierarchy, so restart and
// rematch never depend on a clip mixer that can be left in a stale state.

const TAU = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
const WHITE = new THREE.Color(0xffffff);
const HIT_EMISSIVE = new THREE.Color(0xdffcff);

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function saturate(value) {
  return clamp(value, 0, 1);
}

function smooth01(value) {
  const x = saturate(value);
  return x * x * (3 - 2 * x);
}

function smoother01(value) {
  const x = saturate(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function segment(time, start, end) {
  if (end <= start) return time >= end ? 1 : 0;
  return smooth01((time - start) / (end - start));
}

function windowPulse(time, inStart, inEnd, outStart, outEnd) {
  return segment(time, inStart, inEnd) * (1 - segment(time, outStart, outEnd));
}

function keyCurve(time, frames) {
  if (!frames.length) return 0;
  if (time <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i += 1) {
    const [nextTime, nextValue] = frames[i];
    if (time <= nextTime) {
      const [prevTime, prevValue] = frames[i - 1];
      const alpha = smoother01((time - prevTime) / Math.max(0.0001, nextTime - prevTime));
      return lerp(prevValue, nextValue, alpha);
    }
  }
  return frames[frames.length - 1][1];
}

function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function dampAngle(current, target, lambda, dt) {
  let delta = (target - current + Math.PI) % TAU;
  if (delta < 0) delta += TAU;
  delta -= Math.PI;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function normalizedSpeed(value) {
  const speed = Math.abs(finite(value));
  // Accept either a normalized animation value or a velocity in metres/sec.
  return saturate(speed > 1.25 ? speed / 7.5 : speed);
}

function normalizeAction(value, fallback) {
  if (typeof value !== 'string') return fallback;
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function resolvePhase(value) {
  if (Number.isFinite(value)) return clamp(Math.round(value), 1, 3);
  const text = String(value || '').toLowerCase();
  if (text.includes('3') || text.includes('final') || text.includes('crown')) return 3;
  if (text.includes('2') || text.includes('second') || text.includes('open')) return 2;
  return 1;
}

// Only the large silhouette-defining surfaces enter the arena shadow
// pass. The rigs keep every close-up mesh in the beauty pass, but asking the
// key light to redraw eyelashes, individual knuckles, filigree and tiny clock
// teeth contributed no readable gameplay shadow and more than doubled the
// animated character draw budget on the available GPU.
// Authored-shell names are matched against what GLTFLoader actually produces at
// runtime, not against the names inside the GLB. The loader strips dots from
// node names and splits a multi-primitive mesh into a Group carrying the node
// name plus one child per primitive carrying the *mesh* name. Matching only the
// in-file node names therefore tagged two empty Groups and left every armour,
// cape and hair primitive as a non-caster, so the whole character was lit flat
// with only the bare body mesh dropping shadow.
const PLAYER_SHADOW_CASTERS = /voluminous crimson hair crown|deep crimson rear hair mantle|continuous flexible duelist cuirass foundation|sculpted pearl (?:cuirass|dorsal)|pauldron|ink-stroke blade|pearl armoured hip foundation|battle-skirt|crimson asymmetric inner panel|continuous tailored torso|continuous (?:arm|leg)|Nera_Armor_(?:Hard|Cloth)(?:_Mesh)?[0-9_]*(?:_export)?|Nera_Basemesh_Source[._]?(?:culturalibre_hair_17)?_export|Nera_Original_Hair_Cards_export/i;
const BOSS_SHADOW_CASTERS = /vespera shadow proxy/i;

function applyCharacterShadowBudget(root, essentialPattern) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = essentialPattern.test(object.name || '');
  });
}

// Procedural rigs are authored from many small, readable plates. Geometry that
// shares one articulation parent and one material can be submitted as a single
// mesh without changing its pixels or animation: the parent bone still carries
// the whole batch. Individually animated/queried meshes stay protected.
function mergeStaticSiblingMeshes(root, protectedObjects, registerGeometry) {
  const visit = (parent) => {
    for (const child of [...parent.children]) {
      if (!child.isMesh && !child.isInstancedMesh) visit(child);
    }

    const buckets = new Map();
    for (const object of [...parent.children]) {
      if (!object.isMesh || object.isSkinnedMesh || object.isInstancedMesh
        || object.children.length || protectedObjects.has(object) || Array.isArray(object.material)) continue;
      const attributes = Object.keys(object.geometry.attributes).sort().join(',');
      const key = [
        object.material.uuid,
        object.geometry.index ? 'indexed' : 'plain',
        attributes,
        object.visible ? 'visible' : 'hidden',
        object.renderOrder,
      ].join('|');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }

    for (const objects of buckets.values()) {
      if (objects.length < 2) continue;
      const transformed = objects.map((object) => {
        object.updateMatrix();
        const geometry = object.geometry.clone();
        geometry.applyMatrix4(object.matrix);
        return geometry;
      });
      const mergedGeometry = mergeGeometries(transformed, false);
      transformed.forEach((geometry) => geometry.dispose());
      if (!mergedGeometry) continue;
      mergedGeometry.computeBoundingSphere();
      registerGeometry(mergedGeometry);
      const merged = new THREE.Mesh(mergedGeometry, objects[0].material);
      merged.name = `batched ${objects.map((object) => object.name).join(' + ')}`;
      merged.castShadow = objects.some((object) => object.castShadow);
      merged.receiveShadow = objects.some((object) => object.receiveShadow);
      merged.visible = objects[0].visible;
      merged.renderOrder = objects[0].renderOrder;
      objects.forEach((object) => parent.remove(object));
      parent.add(merged);
    }
  };
  visit(root);
}

// Vespera's silhouette is made from many independently articulated relic
// plates. Merging only siblings preserves the animation, but still asks WebGL
// to submit more than a hundred tiny meshes every frame. BatchedMesh lets those
// pieces keep their own live matrices and visibility while sharing one draw per
// material/shadow class. The original Objects stay in the rig on an unused
// layer so animation markers, missile muzzles and authored transforms remain
// inspectable; only their pixels move through the dynamic batches.
function createDynamicCharacterBatches(root) {
  const sourceLayer = 31;
  const buckets = new Map();
  const candidates = [];

  root.traverse((object) => {
    if (!object.isMesh || object.isSkinnedMesh || object.isInstancedMesh || object.isBatchedMesh) return;
    if (!object.geometry?.attributes?.position || !object.material || Array.isArray(object.material)) return;
    if (object.material.transparent || object.morphTargetInfluences
      || object.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) {
      // Transparent pieces need object-level depth sorting. Morph targets and
      // custom render hooks likewise retain their ordinary Mesh submission.
      return;
    }
    candidates.push(object);
  });

  for (const object of candidates) {
    const attributes = Object.keys(object.geometry.attributes).sort().join(',');
    const key = [
      object.material.uuid,
      object.geometry.index ? 'indexed' : 'plain',
      attributes,
      object.castShadow ? 'caster' : 'beauty-only',
      object.receiveShadow ? 'receiver' : 'unshadowed',
      object.renderOrder,
    ].join('|');
    if (!buckets.has(key)) buckets.set(key, {
      material: object.material,
      castShadow: object.castShadow,
      receiveShadow: object.receiveShadow,
      renderOrder: object.renderOrder,
      objects: [],
    });
    buckets.get(key).objects.push(object);
  }

  const batches = [];
  const inverseBatch = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();

  for (const bucket of buckets.values()) {
    // A one-object batch adds matrix-texture overhead without saving a draw.
    if (bucket.objects.length < 2) continue;
    let maxVertexCount = 0;
    let maxIndexCount = 0;
    for (const object of bucket.objects) {
      maxVertexCount += object.geometry.attributes.position.count;
      maxIndexCount += object.geometry.index?.count || 0;
    }

    const batch = new THREE.BatchedMesh(
      bucket.objects.length,
      maxVertexCount,
      maxIndexCount,
      bucket.material,
    );
    batch.name = `dynamic Vespera batch — ${bucket.material.name || 'surface'}`;
    batch.castShadow = bucket.castShadow;
    batch.receiveShadow = bucket.receiveShadow;
    batch.renderOrder = bucket.renderOrder;
    batch.frustumCulled = false;
    batch.perObjectFrustumCulled = false;
    batch.sortObjects = false;
    batch.userData.dynamicCharacterBatch = true;
    root.add(batch);

    const entries = bucket.objects.map((source) => {
      // Three r161's BatchedMesh uses one geometry slot as one independently
      // transformed item; repeated source geometry is copied into another slot.
      const instanceId = batch.addGeometry(source.geometry);
      source.layers.set(sourceLayer);
      return { source, instanceId };
    });
    batches.push({ batch, entries });
  }

  function effectivelyVisible(source) {
    let object = source;
    while (object && object !== root) {
      if (!object.visible) return false;
      object = object.parent;
    }
    return true;
  }

  function sync() {
    root.updateMatrixWorld(true);
    for (const { batch, entries } of batches) {
      batch.updateMatrixWorld(true);
      inverseBatch.copy(batch.matrixWorld).invert();
      for (const { source, instanceId } of entries) {
        localMatrix.multiplyMatrices(inverseBatch, source.matrixWorld);
        batch.setMatrixAt(instanceId, localMatrix);
        batch.setVisibleAt(instanceId, effectivelyVisible(source));
      }
    }
  }

  return {
    batches,
    sourceCount: batches.reduce((total, bucket) => total + bucket.entries.length, 0),
    sync,
    dispose() {
      for (const { batch } of batches) {
        batch.removeFromParent();
        batch.dispose();
      }
    },
  };
}

function makeShapeGeometry(points, depth = 0.04, bevel = 0.008) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 2,
    curveSegments: 4,
    bevelEnabled: bevel > 0,
    bevelSegments: bevel > 0 ? 3 : 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

// Ring-authored surfaces keep the deterministic joint animation while replacing
// visibly assembled primitive bodies with continuous anatomical volumes. Each
// profile entry is [y, radiusX, radiusZ, offsetX?, offsetZ?, twist?].
function makeOrganicGeometry(profile, radialSegments = 28) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const ringStride = radialSegments + 1;

  profile.forEach((entry, ring) => {
    const [y, radiusX, radiusZ, offsetX = 0, offsetZ = 0, twist = 0] = entry;
    for (let segmentIndex = 0; segmentIndex <= radialSegments; segmentIndex += 1) {
      const u = segmentIndex / radialSegments;
      const angle = u * TAU + twist;
      positions.push(
        offsetX + Math.cos(angle) * radiusX,
        y,
        offsetZ + Math.sin(angle) * radiusZ,
      );
      uvs.push(u, ring / Math.max(1, profile.length - 1));
    }
  });

  for (let ring = 0; ring < profile.length - 1; ring += 1) {
    for (let segmentIndex = 0; segmentIndex < radialSegments; segmentIndex += 1) {
      const a = ring * ringStride + segmentIndex;
      const b = a + ringStride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// A skinned variant uses the same ring language in bind-pose coordinates. Each
// entry is [x, y, z, radiusX, radiusZ, boneA, boneB?, boneBWeight?, twist?].
function makeSkinnedOrganicGeometry(profile, radialSegments = 28) {
  const positions = [];
  const uvs = [];
  const skinIndices = [];
  const skinWeights = [];
  const indices = [];
  const ringStride = radialSegments + 1;

  profile.forEach((entry, ring) => {
    const [x, y, z, radiusX, radiusZ, boneA, boneB = boneA, blend = 0, twist = 0] = entry;
    const safeBlend = saturate(blend);
    for (let segmentIndex = 0; segmentIndex <= radialSegments; segmentIndex += 1) {
      const u = segmentIndex / radialSegments;
      const angle = u * TAU + twist;
      positions.push(
        x + Math.cos(angle) * radiusX,
        y,
        z + Math.sin(angle) * radiusZ,
      );
      uvs.push(u, ring / Math.max(1, profile.length - 1));
      skinIndices.push(boneA, boneB, 0, 0);
      skinWeights.push(1 - safeBlend, safeBlend, 0, 0);
    }
  });

  for (let ring = 0; ring < profile.length - 1; ring += 1) {
    for (let segmentIndex = 0; segmentIndex < radialSegments; segmentIndex += 1) {
      const a = ring * ringStride + segmentIndex;
      const b = a + ringStride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeSculptedHeadGeometry({
  width = 0.18,
  height = 0.23,
  depth = 0.17,
  jaw = 0.76,
  crown = 1.02,
  face = 0.02,
} = {}) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 24);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const sourceX = position.getX(index) * 2;
    const sourceY = position.getY(index) * 2;
    const sourceZ = position.getZ(index) * 2;
    const lower = smooth01(saturate((-sourceY - 0.03) / 0.9));
    const upper = smooth01(saturate((sourceY - 0.18) / 0.72));
    const cheek = Math.exp(-Math.pow((sourceY + 0.03) * 2.7, 2))
      * Math.exp(-Math.pow(Math.abs(sourceX) - 0.48, 2) * 7);
    const front = Math.max(0, sourceZ);
    const xScale = lerp(1, jaw, lower) * lerp(1, crown, upper);
    const zSculpt = front * (face + cheek * depth * 0.045) - lower * depth * 0.025;
    position.setXYZ(
      index,
      sourceX * width * xScale,
      sourceY * height,
      sourceZ * depth + zSculpt,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeCurvedPanelGeometry({
  width = 0.4,
  length = 0.8,
  taper = 0.15,
  flare = 0.12,
  curl = 0.08,
  wrap = 0.035,
  sway = 0,
  hem = 0,
  folds = 0,
  foldDepth = 0,
  raggedness = 0,
  raggedTeeth = 5,
  segmentsX = 8,
  segmentsY = 12,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const rowStride = segmentsX + 1;

  for (let row = 0; row <= segmentsY; row += 1) {
    const v = row / segmentsY;
    const shaped = smoother01(v);
    const halfWidth = width * 0.5 * (1 - taper * v + flare * v * v);
    for (let column = 0; column <= segmentsX; column += 1) {
      const u = column / segmentsX;
      const lateral = u * 2 - 1;
      const edge = Math.pow(Math.abs(lateral), 1.45);
      const raggedHem = raggedness > 0
        ? raggedness
          * Math.pow(shaped, 7)
          * (0.32
            + 0.68 * Math.pow(Math.abs(Math.sin((u * raggedTeeth + 0.17) * Math.PI)), 1.35))
        : 0;
      positions.push(
        lateral * halfWidth + sway * shaped,
        -length * v + hem * (1 - edge) * shaped + raggedHem,
        curl * shaped * shaped + wrap * lateral * lateral
          + Math.sin(v * Math.PI) * (1 - edge) * 0.025
          + (folds > 0
            ? Math.cos(lateral * Math.PI * folds) * foldDepth * Math.sin(v * Math.PI * 0.94)
            : 0),
      );
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < segmentsY; row += 1) {
    for (let column = 0; column < segmentsX; column += 1) {
      const a = row * rowStride + column;
      const b = a + rowStride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeTubeGeometry(points, radius = 0.01, tubularSegments = 24, radialSegments = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
}

function makeDetailTexture(kind = 'fabric', repeatX = 7, repeatY = 10, size = 192) {
  const data = new Uint8Array(size * size * 4);
  const hash = (x, y, seed) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const noise = hash(x, y, kind.length) - 0.5;
      let value = 128;
      if (kind === 'fabric') {
        const warp = Math.pow(Math.abs(Math.sin(x * Math.PI * 0.42)), 9);
        const weft = Math.pow(Math.abs(Math.sin(y * Math.PI * 0.36)), 11);
        value = 105 + warp * 52 + weft * 38 + noise * 12;
      } else if (kind === 'skin') {
        const pores = Math.pow(hash(x * 1.7, y * 1.7, 19), 8);
        value = 136 + noise * 13 - pores * 38;
      } else if (kind === 'porcelain') {
        const cloud = Math.sin(x * 0.09 + Math.sin(y * 0.075) * 1.7) * 5;
        const hairline = Math.abs(Math.sin(x * 0.061 + y * 0.047 + Math.sin(y * 0.11))) < 0.018 ? -38 : 0;
        value = 154 + cloud + noise * 5 + hairline;
      } else if (kind === 'brushed') {
        value = 122 + Math.sin(y * 2.2) * 11 + Math.sin(y * 0.31) * 7 + noise * 15;
      }
      const byte = clamp(Math.round(value), 0, 255);
      const offset = (y * size + x) * 4;
      data[offset] = byte;
      data[offset + 1] = byte;
      data[offset + 2] = byte;
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `${kind}-micro-surface`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createRigContext() {
  const geometries = new Set();
  const materialSet = new Set();
  const textureSet = new Set();
  const skeletonSet = new Set();
  const flashables = [];
  const materials = {};

  const geometry = {
    sphere: new THREE.SphereGeometry(0.5, 28, 20),
    lowSphere: new THREE.SphereGeometry(0.5, 18, 12),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 8, 16),
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 2),
    cone: new THREE.ConeGeometry(0.5, 1, 24, 3),
    torus: new THREE.TorusGeometry(0.5, 0.08, 12, 36),
    octa: new THREE.OctahedronGeometry(0.5, 2),
  };
  Object.values(geometry).forEach((item) => geometries.add(item));

  function addGeometry(item) {
    geometries.add(item);
    return item;
  }

  function addTexture(item) {
    if (item) textureSet.add(item);
    return item;
  }

  function addSkeleton(item) {
    if (item) skeletonSet.add(item);
    return item;
  }

  function material(name, params, flashable = true) {
    const Type = params.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const clean = { ...params };
    delete clean.physical;
    const item = new Type(clean);
    item.name = name;
    materials[name] = item;
    materialSet.add(item);
    if (flashable) {
      flashables.push({
        material: item,
        color: item.color.clone(),
        emissive: item.emissive ? item.emissive.clone() : new THREE.Color(0),
        emissiveIntensity: finite(item.emissiveIntensity, 1),
      });
    }
    return item;
  }

  function mesh(parent, geometryItem, materialItem, options = {}) {
    const item = new THREE.Mesh(geometryItem, materialItem);
    item.name = options.name || 'rig-detail';
    if (options.position) item.position.set(...options.position);
    if (options.rotation) item.rotation.set(...options.rotation);
    if (options.scale) item.scale.set(...options.scale);
    item.castShadow = options.castShadow !== false;
    item.receiveShadow = options.receiveShadow !== false;
    item.frustumCulled = options.frustumCulled !== false;
    if (Number.isFinite(options.renderOrder)) item.renderOrder = options.renderOrder;
    parent.add(item);
    return item;
  }

  function skinnedMesh(parent, geometryItem, materialItem, skeleton, options = {}) {
    const item = new THREE.SkinnedMesh(geometryItem, materialItem);
    item.name = options.name || 'skinned-rig-surface';
    if (options.position) item.position.set(...options.position);
    if (options.rotation) item.rotation.set(...options.rotation);
    if (options.scale) item.scale.set(...options.scale);
    item.castShadow = options.castShadow !== false;
    item.receiveShadow = options.receiveShadow !== false;
    item.frustumCulled = false;
    parent.add(item);
    parent.updateMatrixWorld(true);
    item.bind(skeleton);
    return item;
  }

  function joint(parent, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const item = new THREE.Bone();
    item.name = name;
    item.position.set(...position);
    item.rotation.set(...rotation);
    if (parent) parent.add(item);
    return item;
  }

  function dispose(group) {
    group.removeFromParent();
    geometries.forEach((item) => item.dispose());
    materialSet.forEach((item) => item.dispose());
    textureSet.forEach((item) => item.dispose());
    skeletonSet.forEach((item) => item.dispose());
  }

  return {
    geometry,
    geometries,
    materials,
    flashables,
    addGeometry,
    addTexture,
    addSkeleton,
    material,
    mesh,
    skinnedMesh,
    joint,
    dispose,
  };
}

function createPoseAnimator(objects) {
  const entries = objects.map((object) => ({
    object,
    restPosition: object.position.clone(),
    restRotation: new THREE.Vector3(object.rotation.x, object.rotation.y, object.rotation.z),
    restScale: object.scale.clone(),
    position: object.position.clone(),
    rotation: new THREE.Vector3(object.rotation.x, object.rotation.y, object.rotation.z),
    scale: object.scale.clone(),
  }));
  const lookup = new Map(entries.map((entry) => [entry.object, entry]));

  function reset() {
    for (const entry of entries) {
      entry.position.copy(entry.restPosition);
      entry.rotation.copy(entry.restRotation);
      entry.scale.copy(entry.restScale);
    }
  }

  function rotate(object, x = 0, y = 0, z = 0) {
    const entry = lookup.get(object);
    if (!entry) return;
    entry.rotation.set(
      entry.restRotation.x + x,
      entry.restRotation.y + y,
      entry.restRotation.z + z,
    );
  }

  function addRotation(object, x = 0, y = 0, z = 0) {
    const entry = lookup.get(object);
    if (!entry) return;
    entry.rotation.x += x;
    entry.rotation.y += y;
    entry.rotation.z += z;
  }

  function position(object, x = 0, y = 0, z = 0) {
    const entry = lookup.get(object);
    if (!entry) return;
    entry.position.set(
      entry.restPosition.x + x,
      entry.restPosition.y + y,
      entry.restPosition.z + z,
    );
  }

  function scale(object, x = 1, y = x, z = x) {
    const entry = lookup.get(object);
    if (!entry) return;
    entry.scale.set(
      entry.restScale.x * x,
      entry.restScale.y * y,
      entry.restScale.z * z,
    );
  }

  function apply(dt, rate = 28, immediate = false) {
    const snap = immediate ? 1 : 1 - Math.exp(-rate * dt);
    for (const entry of entries) {
      entry.object.position.lerp(entry.position, snap);
      entry.object.scale.lerp(entry.scale, snap);
      if (immediate) {
        entry.object.rotation.set(entry.rotation.x, entry.rotation.y, entry.rotation.z);
      } else {
        entry.object.rotation.x = dampAngle(entry.object.rotation.x, entry.rotation.x, rate, dt);
        entry.object.rotation.y = dampAngle(entry.object.rotation.y, entry.rotation.y, rate, dt);
        entry.object.rotation.z = dampAngle(entry.object.rotation.z, entry.rotation.z, rate, dt);
      }
    }
  }

  return { reset, rotate, addRotation, position, scale, apply };
}

function createSpring(initial = 0) {
  return { value: initial, velocity: 0 };
}

function springTo(spring, target, stiffness, dampingValue, dt) {
  spring.velocity += (target - spring.value) * stiffness * dt;
  spring.velocity *= Math.exp(-dampingValue * dt);
  spring.value += spring.velocity * dt;
  return spring.value;
}

function applyMaterialFlash(flashables, strength, overrides = null) {
  const amount = saturate(strength);
  for (const entry of flashables) {
    const override = overrides?.get(entry.material);
    // Keep authored material separation through hitstop. Impact energy lives in
    // the emissive rim/core instead of bleaching every plate into one white toy.
    entry.material.color.copy(entry.color).lerp(WHITE, amount * 0.16);
    if (entry.material.emissive) {
      entry.material.emissive.copy(entry.emissive).lerp(HIT_EMISSIVE, amount * 0.45);
      entry.material.emissiveIntensity = (override ?? entry.emissiveIntensity) + amount * 1.4;
    }
  }
}

const AUTHORED_PLAYER_ASSET_ID = 'nera-player-v016';
// Below this the wrists already agree and moving the socket would only add
// jitter; above it something is wrong enough that snapping the sword across
// the arena would be worse than leaving it where the author put it.
const GRIP_SNAP_EPSILON = 0.004;
const GRIP_SNAP_LIMIT = 0.9;

function disposeImportedTree(root) {
  if (!root?.traverse) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    const materialList = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materialList.filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose?.());
  root.removeFromParent();
}

function reshapeImportedAccessory(object, scaleX, scaleY, scaleZ, offsetY = 0, offsetZ = 0) {
  const geometry = object?.geometry;
  const attribute = geometry?.attributes?.position;
  if (!attribute || geometry.userData.neraRuntimeReshaped) return;
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  for (let index = 0; index < attribute.count; index += 1) {
    attribute.setXYZ(
      index,
      center.x + (attribute.getX(index) - center.x) * scaleX,
      center.y + (attribute.getY(index) - center.y) * scaleY + offsetY,
      center.z + (attribute.getZ(index) - center.z) * scaleZ + offsetZ,
    );
  }
  attribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.neraRuntimeReshaped = true;
}

// Both authored hair layers are waist-length curtains roughly 0.77 wide that
// hang flat across the whole upper back, so from the gameplay camera they cover
// the pearl shoulder yoke and merge with the cape into a single pointed mass
// with no shoulders in it. Tapering the fall into a centre-back tail keeps the
// long crimson silhouette while letting the armour underneath read again.
//
// The rest position is edited, not the skinning, so the hair still deforms from
// its original bones and every pose stays authored.
const HAIR_TAPER = Object.freeze({
  // Above this bind height the hair is crown and is left completely alone.
  crownY: 1.94,
  // The fall is fully tapered by this height.
  hemY: 1.16,
  // Half-width multiplier at the hem.
  hemWidth: 0.46,
  // How far the tapered fall is pushed behind the shoulder line, in bind units.
  backset: 0.036,
});

function taperAuthoredHairFall(object) {
  const geometry = object?.geometry;
  const attribute = geometry?.attributes?.position;
  if (!attribute || geometry.userData.neraHairTapered) return;
  const span = Math.max(1e-4, HAIR_TAPER.crownY - HAIR_TAPER.hemY);
  for (let index = 0; index < attribute.count; index += 1) {
    const y = attribute.getY(index);
    if (y >= HAIR_TAPER.crownY) continue;
    // 0 at the crown, 1 at the hem, eased so the taper starts gently and the
    // hair does not develop a visible crease at the shoulder line.
    const fall = smoother01(saturate((HAIR_TAPER.crownY - y) / span));
    const width = 1 - (1 - HAIR_TAPER.hemWidth) * fall;
    attribute.setX(index, attribute.getX(index) * width);
    attribute.setZ(index, attribute.getZ(index) - HAIR_TAPER.backset * fall);
  }
  attribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.neraHairTapered = true;
}

// The authored cape is a full-length curtain whose widest point is the shoulder
// line and which then falls straight to a point at the ankles. That outline has
// no waist in it, so from behind Nera reads as a dart rather than a person. The
// cape is also the only thing covering her below the ribs, so it cannot be
// shortened or removed - it has to be given a figure instead.
//
// Half-width multiplier against bind height: tucked at the shoulders, pinched
// at the waist, flared through the hem so the fall still moves like cloth.
const CAPE_PROFILE = Object.freeze([
  [0.148, 1.16],
  [0.62, 1.06],
  [1.05, 0.82],
  [1.38, 0.63],
  [1.62, 0.74],
  [1.837, 0.88],
]);

function capeWidthAt(y) {
  const first = CAPE_PROFILE[0];
  const last = CAPE_PROFILE[CAPE_PROFILE.length - 1];
  if (y <= first[0]) return first[1];
  if (y >= last[0]) return last[1];
  for (let index = 1; index < CAPE_PROFILE.length; index += 1) {
    const [y1, w1] = CAPE_PROFILE[index];
    if (y > y1) continue;
    const [y0, w0] = CAPE_PROFILE[index - 1];
    return w0 + (w1 - w0) * smooth01((y - y0) / Math.max(1e-4, y1 - y0));
  }
  return last[1];
}

function shapeAuthoredCape(object) {
  const geometry = object?.geometry;
  const attribute = geometry?.attributes?.position;
  if (!attribute || geometry.userData.neraCapeShaped) return;
  for (let index = 0; index < attribute.count; index += 1) {
    const width = capeWidthAt(attribute.getY(index));
    attribute.setX(index, attribute.getX(index) * width);
  }
  attribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.neraCapeShaped = true;
}

// A broad, curved standing collar swept around an ellipse, rising toward the
// back. The rear of the sweep is what the gameplay camera sees, so that is the
// tall part: it puts a hard horizontal edge across the top of the silhouette,
// which is what turns a vertical column back into head-plus-shoulders.
function makeGorgetGeometry({
  radiusX = 0.17,
  radiusZ = 0.14,
  height = 0.1,
  rise = 0.055,
  flare = 1.34,
  arcStart = -Math.PI * 0.94,
  arcEnd = Math.PI * 0.94,
  segments = 44,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const rows = 3;
  for (let column = 0; column <= segments; column += 1) {
    const t = column / segments;
    const angle = arcStart + (arcEnd - arcStart) * t;
    // 0 at the front opening, 1 directly behind her.
    const rearness = smooth01(saturate((Math.abs(angle) - Math.PI * 0.16) / (Math.PI * 0.78)));
    const columnHeight = height + rise * rearness;
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      // The collar leans outward as it rises so it reads as a gorget rather
      // than a tube, and so it never intersects the jaw.
      const spread = 1 + (flare - 1) * v * v;
      positions.push(
        Math.sin(angle) * radiusX * spread,
        columnHeight * v,
        Math.cos(angle) * radiusZ * spread,
      );
      uvs.push(t, v);
    }
  }
  const stride = rows + 1;
  for (let column = 0; column < segments; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = column * stride + row;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Nera's authored hair is two donor layers that read as smooth ribbon tubes
// with hard edges, exposed scalp wedges and grey backfaces at any close angle.
// It is the least beautiful thing on the character and no amount of tinting
// fixes a ribbon. This builds real hair instead: many thin tapered cards swept
// along curves that leave the scalp, bend over the skull and fall with a wave.
//
// Everything is generated in the head bone's own local frame, measured from the
// skull vertices of the authored body mesh, and merged into a single geometry so
// the whole head of hair is one draw call.
// Skull measured from the authored body mesh's head-weighted vertices, posed,
// expressed in the head bone's own local frame. Everything below is built in
// that frame and parented straight to the head bone, so no placement maths.
// Measured: skull 0.204 wide, 0.284 tall, 0.263 deep; crown at y +0.172; brow
// front at z +0.158; back of skull at z -0.104.
//
// The hair is sculpted volume rather than individual strands. Without an alpha
// hair atlas, thin geometry strips can only ever read as tinsel, and this game
// is stylised anyway - the arena and the boss are clean carved forms. So the
// hair is a small number of large smooth locks with a striated surface, which
// is what actually reads as hair at both portrait and gameplay distance.
const HAIR_SKULL = Object.freeze({
  centre: [0, 0.03, 0.027],
  radii: [0.104, 0.148, 0.134],
});

function scalpPoint(theta, phi, lift = 0) {
  const [cx, cy, cz] = HAIR_SKULL.centre;
  const [rx, ry, rz] = HAIR_SKULL.radii;
  const sinT = Math.sin(theta);
  return new THREE.Vector3(
    cx + Math.sin(phi) * sinT * (rx + lift),
    cy + Math.cos(theta) * (ry + lift),
    cz + Math.cos(phi) * sinT * (rz + lift),
  );
}

// A lock of hair: an elliptical cross-section swept along a smooth curve, with
// the section scaled per-step so the lock swells and then tapers to a point.
function pushHairLock(target, options) {
  const {
    points,
    halfWidth,
    halfDepth,
    steps = 26,
    sides = 10,
    profile = (t) => Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.72) * (1 - t * 0.55) + 0.08,
    roll = 0,
    vStart = 0,
    vScale = 1,
  } = options;
  const { positions, uvs, indices } = target;
  const base = positions.length / 3;
  const curve = new THREE.CatmullRomCurve3(points.map((point) => (
    point instanceof THREE.Vector3 ? point : new THREE.Vector3(...point)
  )));
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const point = new THREE.Vector3();
  const reference = new THREE.Vector3();

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent).normalize();
    // A stable frame: prefer world up, fall back to forward when the lock runs
    // vertically, so the cross-section never flips mid-lock.
    reference.set(0, 1, 0);
    if (Math.abs(tangent.dot(reference)) > 0.94) reference.set(0, 0, 1);
    right.crossVectors(tangent, reference).normalize();
    up.crossVectors(right, tangent).normalize();
    const scale = profile(t);
    const twist = roll * t;
    for (let side = 0; side <= sides; side += 1) {
      const u = side / sides;
      const angle = u * TAU + twist;
      // Locks are flattened against the head, not round.
      const ox = Math.cos(angle) * halfWidth * scale;
      const oy = Math.sin(angle) * halfDepth * scale;
      positions.push(
        point.x + right.x * ox + up.x * oy,
        point.y + right.y * ox + up.y * oy,
        point.z + right.z * ox + up.z * oy,
      );
      uvs.push(u * 2.4, vStart + t * vScale);
    }
  }
  const stride = sides + 1;
  for (let step = 0; step < steps; step += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = base + step * stride + side;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

// Strand striations down the length of every lock. This is what turns a smooth
// sculpted volume into something that reads as hair.
function makeHairStriationTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const hash = (x, seed) => {
    const value = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      // Several overlapping strand frequencies, plus a soft lengthwise sheen.
      let strand = 0;
      strand += Math.sin(u * Math.PI * 2 * 26 + hash(Math.floor(u * 26), 1) * 6) * 0.5;
      strand += Math.sin(u * Math.PI * 2 * 11 + hash(Math.floor(u * 11), 2) * 6) * 0.32;
      strand += Math.sin(u * Math.PI * 2 * 47 + hash(Math.floor(u * 47), 3) * 6) * 0.18;
      const v = y / size;
      const sheen = Math.exp(-Math.pow((v - 0.26) * 3.1, 2)) * 0.5
        + Math.exp(-Math.pow((v - 0.72) * 4.4, 2)) * 0.22;
      const shade = 0.62 + strand * 0.19 + sheen * 0.5;
      const index = (y * size + x) * 4;
      data[index] = Math.max(0, Math.min(255, Math.round(255 * shade * 1.02)));
      data[index + 1] = Math.max(0, Math.min(255, Math.round(255 * shade * 0.88)));
      data[index + 2] = Math.max(0, Math.min(255, Math.round(255 * shade * 0.9)));
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function makeNeraHairGeometry() {
  const target = { positions: [], uvs: [], indices: [] };
  const { positions, uvs, indices } = target;
  const [cx, cy, cz] = HAIR_SKULL.centre;
  const [rx, ry, rz] = HAIR_SKULL.radii;

  // The hair is one continuous shell: a cap that hugs the skull, flowing
  // without a seam into a fall that descends from the cap's own lower edge.
  // Separate locks read as tubes stuck to a head; a single shell with lobe
  // grooves cut into its radius reads as hair.
  const COLUMNS = 76;
  const CAP_ROWS = 12;
  const FALL_ROWS = 26;
  const ROWS = CAP_ROWS + FALL_ROWS;
  const CAP_V = 0.34;

  // How far down the skull the cap reaches, per azimuth. The face is cut out at
  // a hairline; the back runs to the nape.
  // Measured against the authored head: the brow tops out at y 0.0445 and the
  // crown at 0.172, so a natural hairline sits near y 0.118, which is a polar
  // angle of about 0.98 from the crown. The earlier 0.42 left her balding.
  const capReach = (phi) => {
    const facing = Math.cos(phi);
    const peak = Math.pow(Math.max(0, facing), 8) * 0.05;
    return 1.12 - 0.13 * facing - peak;
  };
  // How long the hair falls, per azimuth. Zero across the brow so nothing hangs
  // over the eyes, moderate at the temples, longest down the back.
  const fallLength = (phi) => {
    const facing = Math.cos(phi);
    const back = (1 - facing) * 0.5;
    const shaped = Math.pow(back, 0.62);
    // Tips vary with the lock grooves so the hem breaks into points instead of
    // ending on one blunt line.
    const scallop = 1 + 0.15 * Math.cos(phi * 5 + 0.4) + 0.07 * Math.cos(phi * 9 - 1.1);
    // Nothing falls across the front arc, or it drapes over her eyes. The gate
    // ramps in behind the temples so the transition is not a hard edge.
    const fromFront = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi)));
    const gate = smooth01(saturate((fromFront - 0.72) / 0.66));
    return shaped * 0.99 * gate * scallop;
  };
  // Lock grooves. Five channels around the mass, deepest at the back, fading
  // out near the face so the framing stays smooth. These are what stop the fall
  // reading as one glossy egg.
  const lobe = (phi, t) => {
    const facing = Math.cos(phi);
    const depth = 0.135 * (0.4 + 0.6 * (1 - facing) * 0.5)
      * Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.82);
    return 1 + depth * Math.cos(phi * 5 + 0.4) + 0.05 * Math.cos(phi * 9 - 1.1) * t;
  };

  for (let row = 0; row <= ROWS; row += 1) {
    const isCap = row <= CAP_ROWS;
    for (let column = 0; column <= COLUMNS; column += 1) {
      const u = column / COLUMNS;
      const phi = u * TAU;
      const reach = capReach(phi);
      let px;
      let py;
      let pz;
      let v;
      if (isCap) {
        const capT = row / CAP_ROWS;
        const theta = capT * reach;
        // The hairline has to finish *inside* the scalp. Left proud of it, the
        // shell's open edge shows its unlit backface as a dark band across the
        // forehead that reads as a headband.
        const lift = 0.009 + 0.02 * Math.sin(theta) * (0.35 + 0.65 * (1 - Math.max(0, Math.cos(phi))) * 0.5)
          - 0.019 * Math.pow(capT, 4) * Math.max(0, Math.cos(phi));
        const sinT = Math.sin(theta);
        px = cx + Math.sin(phi) * sinT * (rx + lift);
        py = cy + Math.cos(theta) * (ry + lift);
        pz = cz + Math.cos(phi) * sinT * (rz + lift);
        v = capT * CAP_V;
      } else {
        const fallT = (row - CAP_ROWS) / FALL_ROWS;
        const eased = fallT * fallT * (3 - 2 * fallT);
        const length = fallLength(phi);
        // Start exactly on the cap's lower edge so the shell has no seam.
        const lift = 0.009 + 0.02 * Math.sin(reach) * (0.35 + 0.65 * (1 - Math.max(0, Math.cos(phi))) * 0.5)
          - 0.019 * Math.max(0, Math.cos(phi));
        const sinR = Math.sin(reach);
        const edgeX = cx + Math.sin(phi) * sinR * (rx + lift);
        const edgeY = cy + Math.cos(reach) * (ry + lift);
        const edgeZ = cz + Math.cos(phi) * sinR * (rz + lift);
        // The mass swells just below the head, then draws in toward the tips.
        const swell = 1 + 0.42 * Math.sin(Math.min(1, fallT * 1.5) * Math.PI * 0.85) - 0.8 * eased * eased;
        const spread = lobe(phi, fallT) * swell;
        px = cx + (edgeX - cx) * spread;
        pz = cz + (edgeZ - cz) * spread - 0.1 * eased * (1 - Math.max(0, Math.cos(phi)) * 0.5);
        py = edgeY - length * eased;
        v = CAP_V + fallT * 1.9;
      }
      positions.push(px, py, pz);
      uvs.push(u * 4.6, v);
    }
  }
  {
    const stride = COLUMNS + 1;
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const a = row * stride + column;
        const b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  // Two face-framing locks in front of the shoulders. These sit outside the
  // shell so the portrait has a shape of its own, and they are the only pieces
  // that cross in front of the collarbone.
  for (const side of [-1, 1]) {
    pushHairLock(target, {
      points: [
        scalpPoint(0.72, side * 1.12, 0.022),
        scalpPoint(1.08, side * 1.2, 0.036),
        new THREE.Vector3(side * 0.122, -0.1, 0.028),
        new THREE.Vector3(side * 0.112, -0.28, 0.012),
        new THREE.Vector3(side * 0.088, -0.45, -0.03),
      ],
      halfWidth: 0.038,
      halfDepth: 0.022,
      steps: 24,
      sides: 10,
      roll: side * 0.45,
      vScale: 1.9,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// A panelled skirt swept around the hips and hanging to mid-thigh. The panel
// count is baked into the radius so the hem reads as separate plates catching
// the light rather than as one smooth cone.
function makeSkirtGeometry({
  hipRadiusX = 0.2,
  hipRadiusZ = 0.16,
  length = 0.44,
  flare = 1.5,
  panels = 9,
  panelDepth = 0.1,
  segments = 72,
  rows = 5,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let column = 0; column <= segments; column += 1) {
    const t = column / segments;
    const angle = t * TAU;
    // Scalloped radius: each panel bulges slightly and the seams pull in.
    const seam = Math.cos(angle * panels);
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const spread = 1 + (flare - 1) * v * v;
      const scallop = 1 + panelDepth * seam * v;
      // Seams also hang a little shorter so the hem is not a flat ring.
      const drop = length * v * (1 - 0.09 * (1 - seam) * 0.5);
      positions.push(
        Math.sin(angle) * hipRadiusX * spread * scallop,
        -drop,
        Math.cos(angle) * hipRadiusZ * spread * scallop,
      );
      uvs.push(t, v);
    }
  }
  const stride = rows + 1;
  for (let column = 0; column < segments; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = column * stride + row;
      const b = a + stride;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Nera's authored shell has pearl armour across the shoulder blades, but the
// hair and cape cover it, so from behind she has no shoulder line at all and
// reads as a pointed column. This adds the one shape the character has always
// been missing: a broad curved gorget bridging neck to breastplate, plus a cap
// over each deltoid, in the same ivory and antique gold as the rest of her kit.
//
// It is built against the authored skeleton rather than the procedural rig so
// it sits on the body the camera can actually see, and attached with attach()
// so the measured world placement survives the rig's non-uniform presentation
// scale.
function buildAuthoredShoulderYoke(ctx, bones, surfaces) {
  const { ivory, gold } = surfaces;
  const chest = bones.get('spine_03');
  const neck = bones.get('neck_01');
  const leftArm = bones.get('upperarm_l');
  const rightArm = bones.get('upperarm_r');
  if (!chest || !neck || !leftArm || !rightArm) return null;

  chest.updateWorldMatrix(true, false);
  neck.updateWorldMatrix(true, false);
  leftArm.updateWorldMatrix(true, false);
  rightArm.updateWorldMatrix(true, false);

  const neckPoint = neck.getWorldPosition(new THREE.Vector3());
  const leftPoint = leftArm.getWorldPosition(new THREE.Vector3());
  const rightPoint = rightArm.getWorldPosition(new THREE.Vector3());
  const shoulderHalf = Math.max(0.06, Math.abs(leftPoint.x - rightPoint.x) * 0.5);
  const shoulderY = (leftPoint.y + rightPoint.y) * 0.5;

  const yoke = new THREE.Group();
  yoke.name = 'high pearl gorget assembly';

  // The collar hugs the neck. A wide flare here reads as a flat shelf across
  // the chest from the front rather than as armour, so it stays close.
  const collar = (makeGorgetGeometry({
    radiusX: shoulderHalf * 0.66,
    radiusZ: shoulderHalf * 0.58,
    height: shoulderHalf * 0.66,
    rise: shoulderHalf * 0.5,
    flare: 1.16,
  }));
  ctx.mesh(yoke, collar, ivory, {
    name: 'high pearl gorget',
    position: [0, -shoulderHalf * 0.24, -shoulderHalf * 0.04],
    receiveShadow: true,
  });
  const rim = (makeGorgetGeometry({
    radiusX: shoulderHalf * 0.7,
    radiusZ: shoulderHalf * 0.62,
    height: shoulderHalf * 0.1,
    rise: shoulderHalf * 0.5,
    flare: 1.14,
  }));
  ctx.mesh(yoke, rim, gold, {
    name: 'gorget collar rim',
    position: [0, shoulderHalf * 0.2, -shoulderHalf * 0.04],
    receiveShadow: true,
  });

  const capGeometry = new THREE.SphereGeometry(0.5, 22, 16);
  const capRimGeometry = new THREE.SphereGeometry(0.5, 22, 14);

  // Deltoid caps. These carry the actual width of the shoulder read, so they
  // sit proud of the arm joint and are flattened into caps rather than balls.
  // Nera's authored shoulder span is only about 15% of her height where a
  // person's is nearer 24%, so the width here is corrective as well as
  // decorative.
  for (const side of [-1, 1]) {
    ctx.mesh(yoke, capGeometry, ivory, {
      name: `gorget wing ${side < 0 ? 'left' : 'right'}`,
      position: [side * shoulderHalf * 1.16, -shoulderHalf * 0.34, -shoulderHalf * 0.04],
      rotation: [0, 0, side * 0.3],
      scale: [shoulderHalf * 1.42, shoulderHalf * 0.78, shoulderHalf * 1.36],
      receiveShadow: true,
    });
    // A single thin gold band along the lower edge of each cap, sunk into the
    // pearl so it reads as a rolled rim and never as a free-standing hoop.
    ctx.mesh(yoke, capRimGeometry, gold, {
      name: `gorget wing ${side < 0 ? 'left' : 'right'} edge`,
      position: [side * shoulderHalf * 1.16, -shoulderHalf * 0.52, -shoulderHalf * 0.04],
      rotation: [0, 0, side * 0.3],
      scale: [shoulderHalf * 1.3, shoulderHalf * 0.3, shoulderHalf * 1.24],
      receiveShadow: true,
    });
  }

  // Place the assembly at the shoulder line, keeping the body's own axes, then
  // hand it to the chest bone without moving it.
  chest.matrixWorld.decompose(new THREE.Vector3(), yoke.quaternion, new THREE.Vector3());
  yoke.position.set(neckPoint.x, shoulderY, neckPoint.z);
  yoke.updateMatrixWorld(true);
  chest.attach(yoke);
  return yoke;
}

// The authored shell has boots and greaves below the knee and a cuirass above
// the ribs, and nothing at all in between - the hip and thigh band is bare skin
// that only the cape happened to hide. Giving the cape a waist made that gap
// visible, so the gap gets filled properly instead: a pearl hip belt and a
// panelled crimson battle-skirt to mid-thigh. It also supplies the hip width
// that turns the outline into an hourglass instead of a straight column.
function buildAuthoredWaistArmour(ctx, bones, surfaces) {
  const { ivory, gold, cloth } = surfaces;
  const pelvis = bones.get('pelvis');
  const leftLeg = bones.get('thigh_l');
  const rightLeg = bones.get('thigh_r');
  const leftKnee = bones.get('calf_l');
  if (!pelvis || !leftLeg || !rightLeg || !leftKnee) return null;

  pelvis.updateWorldMatrix(true, false);
  leftLeg.updateWorldMatrix(true, false);
  rightLeg.updateWorldMatrix(true, false);
  leftKnee.updateWorldMatrix(true, false);

  const pelvisPoint = pelvis.getWorldPosition(new THREE.Vector3());
  const leftPoint = leftLeg.getWorldPosition(new THREE.Vector3());
  const rightPoint = rightLeg.getWorldPosition(new THREE.Vector3());
  const kneePoint = leftKnee.getWorldPosition(new THREE.Vector3());
  const hipHalf = Math.max(0.05, Math.abs(leftPoint.x - rightPoint.x) * 0.5);
  // Stop above the knee so the greaves and boots still read as their own shape.
  const drop = Math.max(0.12, (leftPoint.y - kneePoint.y) * 0.62);

  const waist = new THREE.Group();
  waist.name = 'pearl waist and battle-skirt assembly';

  const belt = (makeSkirtGeometry({
    hipRadiusX: hipHalf * 1.72,
    hipRadiusZ: hipHalf * 1.3,
    length: hipHalf * 0.5,
    flare: 1.06,
    panels: 6,
    panelDepth: 0.03,
    rows: 3,
  }));
  ctx.mesh(waist, belt, ivory, {
    name: 'authored pearl armoured hip foundation',
    position: [0, hipHalf * 0.24, 0],
    receiveShadow: true,
  });
  const beltRim = (makeSkirtGeometry({
    hipRadiusX: hipHalf * 1.78,
    hipRadiusZ: hipHalf * 1.35,
    length: hipHalf * 0.14,
    flare: 1.02,
    panels: 6,
    panelDepth: 0.02,
    rows: 2,
  }));
  ctx.mesh(waist, beltRim, gold, {
    name: 'authored fitted duelist waist',
    position: [0, -hipHalf * 0.2, 0],
    receiveShadow: true,
  });

  const skirt = (makeSkirtGeometry({
    hipRadiusX: hipHalf * 1.74,
    hipRadiusZ: hipHalf * 1.32,
    length: drop,
    flare: 1.42,
    panels: 9,
    panelDepth: 0.1,
  }));
  ctx.mesh(waist, skirt, cloth, {
    name: 'authored crimson battle-skirt',
    position: [0, -hipHalf * 0.26, 0],
    receiveShadow: true,
  });

  pelvis.matrixWorld.decompose(new THREE.Vector3(), waist.quaternion, new THREE.Vector3());
  waist.position.copy(pelvisPoint);
  waist.updateMatrixWorld(true);
  pelvis.attach(waist);
  return waist;
}

// Mount the authored hair on the head bone. Head-local coordinates are exactly
// the frame makeNeraHairGeometry generates in, so this needs no placement maths.
function buildAuthoredHair(ctx, bones, surface) {
  const head = bones.get('head');
  if (!head) return null;
  const hair = ctx.mesh(head, makeNeraHairGeometry(), surface, {
    name: 'authored crimson hair',
    receiveShadow: true,
  });
  hair.frustumCulled = false;
  return hair;
}

function normalizeAuthoredPlayerMaterials(root) {
  const materials = new Set();
  const textures = new Set();
  const flashables = [];
  root.traverse((object) => {
    if (!object.isMesh && !object.isSkinnedMesh) return;
    const objectName = object.name.toLowerCase();
    // The eyeballs were being shrunk to 72%, which pulled them clear of the
    // lids and left the raw orange socket showing around a tiny offset iris -
    // the single worst thing on the face. They are full size now; the small Z
    // push is all that was ever needed to keep them behind the lashes.
    if (objectName.includes('low-poly')) reshapeImportedAccessory(object, 1, 1, 1, 0, -0.004);
    if (objectName.includes('teeth_base') || objectName.includes('tongue01')) object.visible = false;
    // Replaced by the authored hair built below; the donor ribbons and the
    // coarse cards are what made every close angle read as plastic.
    if (objectName.includes('hair_17') || objectName.includes('hair_cards')) object.visible = false;
    if (objectName.includes('armor_cloth')) shapeAuthoredCape(object);
    object.receiveShadow = true;
    object.frustumCulled = false;
    const materialList = Array.isArray(object.material) ? object.material : [object.material];
    materialList.filter(Boolean).forEach((material) => materials.add(material));
  });

  for (const material of materials) {
    const name = material.name.toLowerCase();
    const isPearlArmor = name === 'nera_armor_pearlsilver';
    const isGoldArmor = name === 'nera_armor_gold';
    const isCrimsonCloth = name === 'nera_armor_crimson';
    const isDonorHair = name.includes('culturalibre_hair_17');
    const isOriginalHairCards = name === 'nera_original_crimson_hair_cards';
    const isHair = isDonorHair || isOriginalHairCards || name.includes('hair');
    // The exporter marked most MPFB surfaces BLEND even though their textures
    // are opaque. In Three that disables depth writes, letting eyes and teeth
    // draw through the face. Start from a deterministic opaque contract, then
    // opt only cutout surfaces back into alpha testing below.
    material.transparent = false;
    material.opacity = 1;
    material.alphaTest = 0;
    material.depthWrite = true;
    material.depthTest = true;
    material.side = THREE.FrontSide;
    if ('envMapIntensity' in material) material.envMapIntensity = 1.08;

    // Photo 1's armour reads through warm separation rather than raw mirror
    // strength. The GLB values made pearl clip toward chalk-white while the
    // half-value gold fell into the blue arena. These restrained overrides keep
    // the embedded filigree maps intact but restore an ivory / antique-gold
    // value hierarchy at gameplay distance.
    if (isPearlArmor) {
      material.color?.setHex(0xf3ede2);
      if ('metalness' in material) material.metalness = 0.62;
      if ('roughness' in material) material.roughness = 0.26;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.18;
      if ('clearcoat' in material) material.clearcoat = 0.3;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.18;
      if ('specularIntensity' in material) material.specularIntensity = 0.78;
      material.specularColor?.setHex(0xffead0);
      if (material.emissive) {
        material.emissive.setHex(0x18120c);
        material.emissiveIntensity = 0.1;
      }
    } else if (isGoldArmor) {
      material.color?.setHex(0xd4a14a);
      if ('metalness' in material) material.metalness = 0.8;
      if ('roughness' in material) material.roughness = 0.24;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.24;
      if ('clearcoat' in material) material.clearcoat = 0.2;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.22;
      if ('specularIntensity' in material) material.specularIntensity = 0.82;
      if (material.emissive) {
        material.emissive.setHex(0x0c0400);
        material.emissiveIntensity = 0.06;
      }
    } else if (isCrimsonCloth) {
      // The authored damask decodes to about 1% reflectance, which is darker
      // than the arena floor it is seen against, so the cape used to swallow
      // half of Nera's rear silhouette into a shape with no value of its own.
      // The tint is already near-white, so brightness has to come from the
      // environment and a contained emissive floor. Form still comes from cast
      // shadow and the env map rather than the emissive, so the folds survive.
      material.color?.setHex(0xf9e7e9);
      if ('metalness' in material) material.metalness = 0.015;
      if ('roughness' in material) material.roughness = 0.46;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.34;
      if ('clearcoat' in material) material.clearcoat = 0.1;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.4;
      if ('sheen' in material) material.sheen = 0.72;
      material.sheenColor?.setHex(0xc4384c);
      if ('sheenRoughness' in material) material.sheenRoughness = 0.6;
      if (material.emissive) {
        material.emissive.setHex(0x4a0a15);
        material.emissiveIntensity = 0.62;
      }
      material.side = THREE.DoubleSide;
    }

    // The two hair systems have different jobs. The opaque donor mesh supplies
    // a dark crown and parallax depth; the original alpha cards supply the long
    // wavy silhouette. Treating both with one glossy burgundy multiplier made
    // the donor's tubes dominate and cut the cards into pink braided ribbons.
    if (isDonorHair) {
      // The crown sits directly above the cape in the rear view, so it needs a
      // value of its own or the head merges into the shoulders. It stays the
      // darkest red of the three so the long cards can read brighter over it.
      material.color?.setHex(0x6d1826);
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = 0.74;
      if ('envMapIntensity' in material) material.envMapIntensity = 0.92;
      material.alphaTest = 0;
      material.side = THREE.DoubleSide;
    } else if (isOriginalHairCards) {
      // These cards own the long silhouette and a quarter of everything the
      // camera sees from behind, so they carry Nera's identity colour. They are
      // deliberately the brightest red on her: crown darkest, cape deeper, this
      // layer lifted, which is what turns one red mass back into three shapes.
      material.color?.setHex(0xf0cfd2);
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = 0.54;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.42;
      if ('clearcoat' in material) material.clearcoat = 0.04;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.66;
      if ('specularIntensity' in material) material.specularIntensity = 0.46;
      if ('sheen' in material) material.sheen = 0.5;
      material.sheenColor?.setHex(0xb83046);
      if ('sheenRoughness' in material) material.sheenRoughness = 0.68;
      if (material.emissive) {
        material.emissive.setHex(0x5c111d);
        material.emissiveIntensity = 0.7;
      }
      material.alphaTest = 0.08;
      material.alphaToCoverage = true;
      material.side = THREE.DoubleSide;
    } else if (isHair) {
      material.color?.setHex(0x72101d);
      if ('metalness' in material) material.metalness = 0.015;
      if ('roughness' in material) material.roughness = 0.52;
      material.alphaTest = 0.24;
      material.side = THREE.DoubleSide;
    }
    const isSkin = name.includes('.body') || name.endsWith('body');
    if (isSkin) {
      // The diffuse map is already a pale complexion, and between the key, the
      // rim and the fill it was clipping to chalk. A warm multiplier puts blood
      // back under it and a higher roughness stops the waxy sheen.
      material.color?.setHex(0xe9bfa8);
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = 0.66;
      if ('envMapIntensity' in material) material.envMapIntensity = 0.72;
      if ('sheen' in material) material.sheen = 0.4;
      material.sheenColor?.setHex(0xffbfa2);
      if ('sheenRoughness' in material) material.sheenRoughness = 0.85;
      if (material.emissive) {
        material.emissive.setHex(0x1d0905);
        material.emissiveIntensity = 0.13;
      }
    }
    if (name.includes('low-poly')) {
      // Eyes need a specular catchlight more than they need a colour. Wet and
      // slightly deepened reads alive; matte reads dead.
      material.color?.setHex(0xcbb6a6);
      if ('metalness' in material) material.metalness = 0.02;
      if ('roughness' in material) material.roughness = 0.11;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.5;
      if ('clearcoat' in material) material.clearcoat = 0.9;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.06;
      if ('specularIntensity' in material) material.specularIntensity = 1;
    }
    if (name.includes('eyelash')) {
      material.color?.setHex(0x4a3033);
      if ('roughness' in material) material.roughness = 0.62;
      material.alphaTest = 0.3;
    }
    if (name.includes('eyebrow')) {
      material.color?.setHex(0x8a5238);
      if ('roughness' in material) material.roughness = 0.68;
      material.alphaTest = 0.26;
    }
    if (name.includes('eyelash') || name.includes('eyebrow') || isHair) {
      material.transparent = false;
      material.depthWrite = true;
    }
    material.dithering = true;
    material.needsUpdate = true;
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value);
    }
    if (material.color) {
      flashables.push({
        material,
        color: material.color.clone(),
        emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0),
        emissiveIntensity: finite(material.emissiveIntensity, 1),
      });
    }
  }
  textures.forEach((texture) => {
    texture.anisotropy = Math.max(4, finite(texture.anisotropy, 1));
    texture.needsUpdate = true;
  });
  return flashables;
}

// Nera measures 9.5 heads tall with her hips at 58% of her height and a
// shoulder span of 15.5%; a person is nearer 7.5 heads, 47% and 24%. That is
// the "giraffe" the character checkpoint named, and it comes from the runtime
// presentation scale, not from the Blender proportion study.
//
// The scale itself cannot move - it is baked into the bind-marker baselines the
// character contract asserts at 1e-5. But those markers belong to the
// PROCEDURAL rig, and the body the camera sees is the authored shell, so the
// shell's own skeleton can be retargeted freely. Editing rest positions before
// the retarget descriptors are built means every pose inherits the correction.
// Hips at exactly half her height needs a 22% longer torso, which pulls the
// authored cuirass plates apart at the ribs and drops her hands past the skirt.
// The checkpoint's own guidance is to keep the long-legged direction and
// moderate it, so this settles near 54% - clearly heroic, no longer a giraffe -
// and buys the rest of the read back from a larger head and wider shoulders.
const NERA_PROPORTION = Object.freeze({
  leg: 0.93,
  spine: 1.08,
  // Scales the whole collarbone offset, not just its X. The upperarm's local
  // offset barely points along world X, so scaling that component alone moved
  // the shoulder by 7mm.
  shoulder: 1.28,
  head: 1.12,
  // Trimmed with the torso so her hands still fall at the hip.
  arm: 0.94,
});

function reproportionAuthoredSkeleton(bones) {
  const foot = bones.get('foot_l');
  const pelvis = bones.get('pelvis');
  if (!foot || !pelvis) return;
  const before = foot.getWorldPosition(new THREE.Vector3()).y;

  for (const name of ['calf_l', 'calf_r', 'foot_l', 'foot_r']) {
    bones.get(name)?.position.multiplyScalar(NERA_PROPORTION.leg);
  }
  for (const name of ['spine_01', 'spine_02', 'spine_03', 'neck_01']) {
    bones.get(name)?.position.multiplyScalar(NERA_PROPORTION.spine);
  }
  for (const name of ['clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r']) {
    bones.get(name)?.position.multiplyScalar(NERA_PROPORTION.shoulder);
  }
  for (const name of ['lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r']) {
    bones.get(name)?.position.multiplyScalar(NERA_PROPORTION.arm);
  }
  const head = bones.get('head');
  if (head) head.scale.multiplyScalar(NERA_PROPORTION.head);

  // Put her feet back on the floor. Shortening the legs lifts them, so the
  // pelvis drops by exactly what was removed. The glTF root carries a rotation,
  // so the drop is resolved through the parent's inverse rather than by nudging
  // a local axis and hoping it points at world up.
  pelvis.updateWorldMatrix(true, true);
  const after = foot.getWorldPosition(new THREE.Vector3()).y;
  const parent = pelvis.parent;
  if (parent && Number.isFinite(after) && Number.isFinite(before)) {
    parent.updateWorldMatrix(true, false);
    const inverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const current = pelvis.getWorldPosition(new THREE.Vector3());
    const wanted = current.clone().setY(current.y - (after - before));
    const localCurrent = current.applyMatrix4(inverse);
    const localWanted = wanted.applyMatrix4(inverse);
    pelvis.position.add(localWanted.sub(localCurrent));
  }
  pelvis.updateWorldMatrix(true, true);
}

function createPlayerVisualBridge(authoredShell, {
  group,
  body,
  weapon,
  weaponSocket,
  core,
  sources,
  ctx,
}) {
  const visualMount = new THREE.Group();
  visualMount.name = 'Nera authored visual mount';
  body.add(visualMount);

  const metadata = authoredShell && typeof authoredShell === 'object' ? authoredShell : {};
  const shellRoot = metadata.scene?.isObject3D ? metadata.scene : null;
  const loadCount = Math.max(0, Math.floor(finite(metadata.loadCount)));
  const shellUuid = typeof metadata.assetUuid === 'string'
    ? metadata.assetUuid
    : (shellRoot?.uuid || null);
  const legacyMeshes = [];
  group.traverse((object) => {
    if (object.isMesh || object.isSkinnedMesh) legacyMeshes.push(object);
  });

  let mode = 'procedural-fallback';
  let mappedBones = Object.freeze([]);
  let missingBones = Object.freeze([]);
  let finitePose = true;
  let gripError = null;
  let descriptors = [];
  let flashables = [];
  let weaponHand = null;
  let disposed = false;
  // Left off for the single validation pose inside initialize(), so the
  // reported gripError and the rig's bind markers still describe the
  // authored rest pose rather than the corrected one.
  let correctGrip = false;

  const matrix = new THREE.Matrix4();
  const inverse = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const sourceCurrent = new THREE.Quaternion();
  const delta = new THREE.Quaternion();
  const remapped = new THREE.Quaternion();
  const weighted = new THREE.Quaternion();
  const identityQuaternion = new THREE.Quaternion();
  const align = new THREE.Quaternion();
  const directionA = new THREE.Vector3();
  const directionB = new THREE.Vector3();
  const pointA = new THREE.Vector3();
  const pointB = new THREE.Vector3();
  const gripPoint = new THREE.Vector3();
  const weaponPoint = new THREE.Vector3();

  function relativeTransform(object, reference, outPosition, outQuaternion) {
    // Both rigs live below `body`. Build the relative matrix from local links
    // so the player's intentionally non-uniform presentation scale never
    // introduces shear into quaternion decomposition.
    matrix.identity();
    let cursor = object;
    while (cursor && cursor !== reference) {
      cursor.updateMatrix();
      matrix.premultiply(cursor.matrix);
      cursor = cursor.parent;
    }
    if (cursor !== reference) {
      reference.updateWorldMatrix(true, false);
      object.updateWorldMatrix(true, false);
      inverse.copy(reference.matrixWorld).invert();
      matrix.multiplyMatrices(inverse, object.matrixWorld);
    }
    matrix.decompose(outPosition, outQuaternion, scale);
  }

  function relativeQuaternion(object, reference, out) {
    relativeTransform(object, reference, position, out);
    return out.normalize();
  }

  function relativePosition(object, reference, out) {
    relativeTransform(object, reference, out, quaternion);
    return out;
  }

  function isFiniteObjectPose(object) {
    return [
      object.position.x, object.position.y, object.position.z,
      object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w,
      object.scale.x, object.scale.y, object.scale.z,
    ].every(Number.isFinite);
  }

  function physicalPair(bones, stem) {
    const namedLeft = bones.get(`${stem}_l`);
    const namedRight = bones.get(`${stem}_r`);
    if (!namedLeft || !namedRight) throw new Error(`missing ${stem} side pair`);
    const leftX = relativePosition(namedLeft, body, pointA).x;
    const rightX = relativePosition(namedRight, body, pointB).x;
    return leftX <= rightX
      ? { left: namedLeft, right: namedRight, leftSuffix: 'l', rightSuffix: 'r' }
      : { left: namedRight, right: namedLeft, leftSuffix: 'r', rightSuffix: 'l' };
  }

  function buildDescriptor(definition, descriptorByTarget) {
    const targetRestWorld = relativeQuaternion(definition.target, body, new THREE.Quaternion()).clone();
    const sourceRestWorld = relativeQuaternion(definition.source, body, new THREE.Quaternion()).clone();
    const sourceLocalRest = definition.source.quaternion.clone();
    const baseWorld = targetRestWorld.clone();
    if (definition.alignDirection && definition.sourceChild && definition.targetChild) {
      relativePosition(definition.source, body, pointA);
      relativePosition(definition.sourceChild, body, pointB);
      directionA.subVectors(pointB, pointA).normalize();
      relativePosition(definition.target, body, pointA);
      relativePosition(definition.targetChild, body, pointB);
      directionB.subVectors(pointB, pointA).normalize();
      if (directionA.lengthSq() > 0.99 && directionB.lengthSq() > 0.99) {
        align.setFromUnitVectors(directionB, directionA);
        baseWorld.premultiply(align);
      }
    } else {
      const parentDescriptor = descriptorByTarget.get(definition.target.parent);
      if (parentDescriptor) {
        delta.copy(parentDescriptor.baseWorld)
          .multiply(parentDescriptor.targetRestWorld.clone().invert());
        baseWorld.premultiply(delta);
      }
    }
    if (definition.gripReference) {
      const referenceRestWorld = relativeQuaternion(
        definition.gripReference,
        body,
        new THREE.Quaternion(),
      );
      delta.copy(sourceRestWorld).multiply(referenceRestWorld.invert());
      baseWorld.premultiply(delta);
    }

    const parentDescriptor = descriptorByTarget.get(definition.target.parent);
    const parentBaseWorld = parentDescriptor
      ? parentDescriptor.baseWorld
      : relativeQuaternion(definition.target.parent, body, new THREE.Quaternion());
    const hasBaseCorrection = 1 - Math.abs(baseWorld.dot(targetRestWorld)) > 1e-8;
    const baseLocal = hasBaseCorrection
      ? parentBaseWorld.clone().invert().multiply(baseWorld).normalize()
      : definition.target.quaternion.clone();
    // Axis-map conjugation lets a procedural joint's local delta drive a bone
    // whose authored roll/orientation is completely different, while setting
    // an identity source delta restores the exact authored local bind pose.
    const axisMap = sourceRestWorld.clone().invert().multiply(baseWorld).normalize();
    return {
      ...definition,
      sourceLocalRest,
      sourceRestWorld,
      targetRestWorld,
      baseWorld: baseWorld.clone().normalize(),
      baseLocal,
      axisMap,
      weight: clamp(finite(definition.weight, 1), 0, 1),
    };
  }

  function updatePose() {
    if (mode !== 'authored') return;
    finitePose = true;
    for (const descriptor of descriptors) {
      sourceCurrent.copy(descriptor.source.quaternion);
      delta.copy(descriptor.sourceLocalRest).invert().multiply(sourceCurrent).normalize();
      remapped.copy(descriptor.axisMap).invert()
        .multiply(delta)
        .multiply(descriptor.axisMap)
        .normalize();
      weighted.slerpQuaternions(identityQuaternion, remapped, descriptor.weight);
      descriptor.target.quaternion.copy(descriptor.baseLocal).multiply(weighted).normalize();
      finitePose = finitePose && isFiniteObjectPose(descriptor.target);
    }
    body.updateWorldMatrix(true, true);
    if (weaponHand) {
      weaponHand.getWorldPosition(gripPoint);
      weapon.getWorldPosition(weaponPoint);
      gripError = gripPoint.distanceTo(weaponPoint);
      finitePose = finitePose && Number.isFinite(gripError);
      // The greatblade hangs off the procedural arm, but the arm the camera can
      // see belongs to the authored shell, and the two wrists are about 0.38
      // apart. Uncorrected, Nera holds the sword a hand's length below her fist.
      // The socket is the whole weapon's parent, so translating it carries the
      // blade, the guard, the pommel and the contact tip together and the trail
      // stays welded to the edge. Rotation is already reconciled by the 'sword
      // hand' descriptor above.
      if (correctGrip && gripError > GRIP_SNAP_EPSILON && gripError < GRIP_SNAP_LIMIT) {
        const socketParent = weaponSocket.parent;
        if (socketParent) {
          socketParent.updateWorldMatrix(true, false);
          inverse.copy(socketParent.matrixWorld).invert();
          pointA.copy(weaponPoint).applyMatrix4(inverse);
          pointB.copy(gripPoint).applyMatrix4(inverse);
          pointB.sub(pointA);
          if (Number.isFinite(pointB.x) && Number.isFinite(pointB.y) && Number.isFinite(pointB.z)) {
            weaponSocket.position.add(pointB);
            weaponSocket.updateMatrixWorld(true);
          }
        }
      }
    }
  }

  function updateFlash(strength) {
    if (mode === 'authored') applyMaterialFlash(flashables, strength);
  }

  function initialize() {
    if (!shellRoot) return;
    const bones = new Map();
    let skinnedMeshes = 0;
    let invalidGeometry = false;
    shellRoot.traverse((object) => {
      if (object.isBone) bones.set(object.name, object);
      if (object.isSkinnedMesh) skinnedMeshes += 1;
      if ((object.isMesh || object.isSkinnedMesh)
        && (!object.geometry?.attributes?.position?.count
          || !Number.isFinite(object.geometry.attributes.position.count))) invalidGeometry = true;
    });
    if (skinnedMeshes < 1 || bones.size < 20 || invalidGeometry) {
      disposeImportedTree(shellRoot);
      return;
    }

    const requiredBones = [
      'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head',
      'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r',
      'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r',
      'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r',
    ];
    missingBones = Object.freeze(requiredBones.filter((name) => !bones.has(name)).sort());
    if (missingBones.length) {
      disposeImportedTree(shellRoot);
      return;
    }

    const rawBounds = new THREE.Box3().setFromObject(shellRoot);
    const rawHeight = rawBounds.getSize(new THREE.Vector3()).y;
    if (!Number.isFinite(rawHeight) || rawHeight < 1.5 || rawHeight > 3.2) {
      disposeImportedTree(shellRoot);
      return;
    }

    try {
      visualMount.add(shellRoot);
      visualMount.updateMatrixWorld(true);
      // Retarget before any descriptor is built, so the whole rig - handedness,
      // axis maps, grip - is derived from the corrected proportions.
      reproportionAuthoredSkeleton(bones);
      visualMount.updateMatrixWorld(true);
      const arm = physicalPair(bones, 'upperarm');
      const leg = physicalPair(bones, 'thigh');

      const target = (name) => {
        const bone = bones.get(name);
        if (!bone) throw new Error(`missing authored bone ${name}`);
        return bone;
      };
      // The procedural presentation root is intentionally tall and narrow,
      // but applying that non-uniform scale to an already proportioned human
      // shell stretched Nera's face into a long, pinched mask. Cancel the root
      // distortion at the authored neck hierarchy so the body keeps its
      // gameplay silhouette while the neck, face, and hair crown retain their
      // source proportions instead of inheriting the fallback's 1.25x stretch.
      const authoredNeck = target('neck_01');
      authoredNeck.scale.set(
        authoredNeck.scale.x / Math.max(0.001, Math.abs(group.scale.x)),
        authoredNeck.scale.y / Math.max(0.001, Math.abs(group.scale.y)),
        authoredNeck.scale.z / Math.max(0.001, Math.abs(group.scale.z)),
      );
      const definitions = [
        { label: 'pelvis', source: sources.pelvis, target: target('pelvis'), sourceChild: sources.spine, targetChild: target('spine_01') },
        { label: 'spine lower', source: sources.spine, target: target('spine_01'), sourceChild: sources.chest, targetChild: target('spine_02') },
        { label: 'spine upper', source: sources.chest, target: target('spine_02'), sourceChild: sources.neck, targetChild: target('spine_03'), weight: 0.46 },
        { label: 'chest', source: sources.chest, target: target('spine_03'), sourceChild: sources.neck, targetChild: target('neck_01'), weight: 0.54 },
        { label: 'neck', source: sources.neck, target: target('neck_01'), sourceChild: sources.head, targetChild: target('head') },
        { label: 'head', source: sources.head, target: target('head') },
        { label: 'left clavicle', source: sources.chest, target: target(`clavicle_${arm.leftSuffix}`), weight: 0 },
        { label: 'left upper arm', source: sources.leftShoulder, target: target(`upperarm_${arm.leftSuffix}`), sourceChild: sources.leftElbow, targetChild: target(`lowerarm_${arm.leftSuffix}`), alignDirection: true },
        { label: 'left lower arm', source: sources.leftElbow, target: target(`lowerarm_${arm.leftSuffix}`), sourceChild: sources.leftHand, targetChild: target(`hand_${arm.leftSuffix}`), alignDirection: true },
        { label: 'left hand', source: sources.leftHand, target: target(`hand_${arm.leftSuffix}`) },
        { label: 'right clavicle', source: sources.chest, target: target(`clavicle_${arm.rightSuffix}`), weight: 0 },
        { label: 'right upper arm', source: sources.rightShoulder, target: target(`upperarm_${arm.rightSuffix}`), sourceChild: sources.rightElbow, targetChild: target(`lowerarm_${arm.rightSuffix}`), alignDirection: true },
        { label: 'right lower arm', source: sources.rightElbow, target: target(`lowerarm_${arm.rightSuffix}`), sourceChild: sources.rightHand, targetChild: target(`hand_${arm.rightSuffix}`), alignDirection: true },
        { label: 'sword hand', source: weaponSocket, target: target(`hand_${arm.rightSuffix}`), gripReference: sources.rightHand },
        { label: 'left thigh', source: sources.leftHip, target: target(`thigh_${leg.leftSuffix}`), sourceChild: sources.leftKnee, targetChild: target(`calf_${leg.leftSuffix}`) },
        { label: 'left calf', source: sources.leftKnee, target: target(`calf_${leg.leftSuffix}`), sourceChild: sources.leftAnkle, targetChild: target(`foot_${leg.leftSuffix}`) },
        { label: 'left foot', source: sources.leftAnkle, target: target(`foot_${leg.leftSuffix}`) },
        { label: 'right thigh', source: sources.rightHip, target: target(`thigh_${leg.rightSuffix}`), sourceChild: sources.rightKnee, targetChild: target(`calf_${leg.rightSuffix}`) },
        { label: 'right calf', source: sources.rightKnee, target: target(`calf_${leg.rightSuffix}`), sourceChild: sources.rightAnkle, targetChild: target(`foot_${leg.rightSuffix}`) },
        { label: 'right foot', source: sources.rightAnkle, target: target(`foot_${leg.rightSuffix}`) },
      ];
      const descriptorByTarget = new Map();
      descriptors = definitions.map((definition) => {
        const descriptor = buildDescriptor(definition, descriptorByTarget);
        descriptorByTarget.set(descriptor.target, descriptor);
        return descriptor;
      });
      weaponHand = target(`hand_${arm.rightSuffix}`);
      mappedBones = Object.freeze(descriptors.map((descriptor) => (
        `${descriptor.label}:${descriptor.source.name}->${descriptor.target.name}`
      )).sort());
      flashables = normalizeAuthoredPlayerMaterials(shellRoot);
      // Built after the retarget so it can be placed from measured bone
      // positions, and after the material pass so it is not re-tinted by it.
      if (ctx) {
        // These surfaces belong to the authored shell tree, so the shell's own
        // disposer owns them. They deliberately carry no maps: a cloned rig
        // material would share its bump texture with the procedural rig and be
        // released twice.
        const surfaces = {
          ivory: new THREE.MeshStandardMaterial({
            name: 'neraGorgetIvory', color: 0xe9e2d6, roughness: 0.33, metalness: 0.52,
            envMapIntensity: 1.16,
          }),
          gold: new THREE.MeshStandardMaterial({
            name: 'neraGorgetGold', color: 0xd0a251, roughness: 0.29, metalness: 0.8,
            envMapIntensity: 1.2,
          }),
          cloth: new THREE.MeshStandardMaterial({
            name: 'neraBattleSkirtCloth', color: 0x8d1b2c, roughness: 0.62, metalness: 0.02,
            envMapIntensity: 1.1, emissive: new THREE.Color(0x3a0710), emissiveIntensity: 0.5,
            side: THREE.DoubleSide,
          }),
          // Hair is double sided because a card seen from behind must not go
          // grey, and slightly rough so the rim light runs along the strands
          // instead of blowing out one facet.
          hair: new THREE.MeshStandardMaterial({
            name: 'neraAuthoredHair', color: 0x8a1020, roughness: 0.56, metalness: 0.02,
            envMapIntensity: 0.95, emissive: new THREE.Color(0x33050e), emissiveIntensity: 0.42,
            map: makeHairStriationTexture(),
            side: THREE.DoubleSide,
          }),
        };
        buildAuthoredShoulderYoke(ctx, bones, surfaces);
        buildAuthoredWaistArmour(ctx, bones, surfaces);
        buildAuthoredHair(ctx, bones, surfaces.hair);
      }
      mode = 'authored';
      updatePose();
      if (!finitePose || !Number.isFinite(gripError) || gripError > 0.8) {
        throw new Error('authored player retarget validation failed');
      }
      correctGrip = true;
      for (const mesh of legacyMeshes) {
        const keepWeapon = mesh === weapon || weapon.getObjectById(mesh.id) === mesh;
        const keepCore = mesh === core || mesh.userData.isCore;
        // Object3D traversal only suppresses a branch when `visible` is the
        // boolean false. `false || undefined` previously assigned undefined to
        // ordinary fallback meshes, so the entire procedural face and hair rig
        // still rendered underneath the authored shell as a second head.
        mesh.visible = Boolean(keepWeapon || keepCore);
      }
      visualMount.userData.mode = mode;
      visualMount.userData.assetId = AUTHORED_PLAYER_ASSET_ID;
    } catch (error) {
      mode = 'procedural-fallback';
      descriptors = [];
      mappedBones = Object.freeze([]);
      weaponHand = null;
      gripError = null;
      finitePose = true;
      flashables = [];
      shellRoot.removeFromParent();
      disposeImportedTree(shellRoot);
      legacyMeshes.forEach((mesh) => { mesh.visible = true; });
      visualMount.userData.error = String(error?.message || error);
    }
  }

  function visualSnapshot() {
    return Object.freeze({
      mode,
      assetId: mode === 'authored' ? AUTHORED_PLAYER_ASSET_ID : null,
      loadCount,
      shellUuid,
      mappedBones,
      missingBones,
      finitePose: Boolean(finitePose),
      gripError: Number.isFinite(gripError) ? Number(gripError.toFixed(5)) : null,
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (mode === 'authored') disposeImportedTree(shellRoot);
    visualMount.removeFromParent();
  }

  initialize();
  return { visualMount, updatePose, updateFlash, visualSnapshot, dispose };
}

function buildDetailedHand(ctx, parent, materials, side, prefix, scale = 1) {
  const palmGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.055, 0.045, 0.035],
    [0.025, 0.078, 0.054],
    [-0.055, 0.084, 0.061],
    [-0.13, 0.064, 0.048],
    [-0.155, 0.026, 0.022],
  ], 20));
  ctx.mesh(parent, palmGeometry, materials.hand, {
    name: `${prefix} articulated palm`,
    scale: [scale, scale, scale],
  });

  const fingerGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.01, 0.018, 0.016],
    [-0.055, 0.024, 0.021],
    [-0.12, 0.019, 0.017],
    [-0.16, 0.006, 0.006],
  ], 12));
  const knuckleGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.022, 0.026, 0.022],
    [0, 0.035, 0.029],
    [-0.028, 0.022, 0.02],
  ], 12));
  const fingerScales = [0.86, 1, 0.96, 0.79];
  for (let index = 0; index < 4; index += 1) {
    const lateral = (index - 1.5) * 0.034;
    ctx.mesh(parent, knuckleGeometry, materials.accent ?? materials.hand, {
      name: `${prefix} knuckle ${index + 1}`,
      position: [lateral * scale, -0.102 * scale, 0.028 * scale],
      scale: [scale * 0.82, scale * 0.82, scale * 0.82],
    });
    ctx.mesh(parent, fingerGeometry, materials.hand, {
      name: `${prefix} finger ${index + 1}`,
      position: [lateral * scale, -0.118 * scale, 0.015 * scale],
      rotation: [index < 2 ? -0.07 : 0.04, 0, (index - 1.5) * -0.025],
      scale: [scale, scale * fingerScales[index], scale],
    });
  }

  ctx.mesh(parent, fingerGeometry, materials.hand, {
    name: `${prefix} thumb`,
    position: [side * 0.075 * scale, -0.035 * scale, 0.012 * scale],
    rotation: [0.16, 0.05, side * -0.92],
    scale: [scale * 1.04, scale * 0.78, scale * 1.04],
  });
}

function buildDetailedBoot(ctx, parent, materials, side, prefix, scale = 1) {
  ctx.mesh(parent, ctx.geometry.capsule, materials.boot, {
    name: `${prefix} fitted boot body`,
    position: [0, -0.018 * scale, 0.09 * scale],
    rotation: [HALF_PI, 0, 0],
    scale: [0.115 * scale, 0.16 * scale, 0.1 * scale],
  });
  ctx.mesh(parent, ctx.geometry.sphere, materials.boot, {
    name: `${prefix} sculpted toe`,
    position: [0, -0.065 * scale, 0.225 * scale],
    scale: [0.122 * scale, 0.075 * scale, 0.19 * scale],
  });
  ctx.mesh(parent, ctx.geometry.sphere, materials.sole ?? materials.boot, {
    name: `${prefix} grounded heel`,
    position: [0, -0.09 * scale, -0.015 * scale],
    scale: [0.118 * scale, 0.055 * scale, 0.105 * scale],
  });
  const toeGuard = ctx.addGeometry(makeShapeGeometry([
    [-0.11, -0.03], [-0.07, 0.08], [0, 0.12], [0.08, 0.08], [0.12, -0.03], [0, -0.075],
  ], 0.035, 0.012));
  ctx.mesh(parent, toeGuard, materials.accent ?? materials.boot, {
    name: `${prefix} toe guard`,
    position: [0, -0.015 * scale, 0.37 * scale],
    rotation: [0.04, 0, side * 0.035],
    scale: [scale, scale, scale],
  });
}

function addPanelPiping(ctx, parent, materials, points, prefix, radius = 0.012) {
  const geometry = ctx.addGeometry(makeTubeGeometry(points, radius, 24, 6));
  return ctx.mesh(parent, geometry, materials, {
    name: `${prefix} tailored piping`,
    castShadow: false,
  });
}

function buildGreatblade(ctx, parent, materials) {
  const weapon = ctx.joint(parent, 'Nera calligraphic greatblade');
  const { mesh, geometry, addGeometry } = ctx;

  mesh(weapon, geometry.cylinder, materials.grip, {
    name: 'silk-wrapped grip',
    position: [0, -0.12, 0],
    scale: [0.07, 0.34, 0.07],
  });
  mesh(weapon, geometry.torus, materials.gold, {
    name: 'gilded crescent guard',
    position: [0, 0.13, 0],
    rotation: [HALF_PI, 0, 0],
    scale: [0.34, 0.34, 0.34],
  });
  mesh(weapon, geometry.octa, materials.crimsonGem, {
    name: 'garnet pommel light',
    position: [0, -0.39, 0],
    scale: [0.1, 0.15, 0.08],
  });
  const quillonGeometry = addGeometry(makeShapeGeometry([
    [-0.33, 0.08], [-0.08, 0.15], [0, 0.1], [0.08, 0.15], [0.33, 0.08],
    [0.18, 0.015], [0, 0.055], [-0.18, 0.015],
  ], 0.045, 0.009));
  mesh(weapon, quillonGeometry, materials.gold, {
    name: 'winged gold quillons',
    position: [0, 0.13, 0],
  });
  mesh(weapon, geometry.octa, materials.crimsonGem, {
    name: 'guard garnet',
    position: [0, 0.15, 0.06],
    rotation: [0, 0, Math.PI * .25],
    scale: [.07, .09, .035],
    castShadow: false,
  });

  const bladeGeometry = addGeometry(makeShapeGeometry([
    [-0.055, 0.12],
    [0.055, 0.12],
    [0.072, 0.44],
    [0.067, 0.92],
    [0.057, 1.4],
    [0.036, 1.75],
    [0, 1.91],
    [-0.036, 1.75],
    [-0.057, 1.4],
    [-0.067, 0.92],
    [-0.072, 0.44],
  ], 0.028, 0.006));
  mesh(weapon, bladeGeometry, materials.blade, {
    name: 'ink-stroke blade',
    position: [0, 0.03, 0],
  });

  const edgeGeometry = addGeometry(makeShapeGeometry([
    [0.041, 0.2],
    [0.061, 0.46],
    [0.056, 0.94],
    [0.046, 1.4],
    [0.028, 1.72],
    [0.004, 1.86],
    [0.019, 1.69],
    [0.033, 1.38],
    [0.041, 0.91],
    [0.04, 0.46],
  ], 0.008, 0.001));
  mesh(weapon, edgeGeometry, materials.cyan, {
    name: 'cyan calligraphy edge',
    position: [0, 0.03, 0.031],
    castShadow: false,
  });
  mesh(weapon, edgeGeometry, materials.cyan, {
    name: 'cyan calligraphy edge reverse',
    position: [0, 0.03, -0.031],
    castShadow: false,
  });

  const fullerGeometry = addGeometry(makeShapeGeometry([
    [-0.012, 0.28],
    [0.012, 0.28],
    [0.026, 0.62],
    [0.022, 1.04],
    [0.016, 1.42],
    [0, 1.68],
    [-0.016, 1.42],
    [-0.022, 1.04],
    [-0.026, 0.62],
  ], 0.009, 0));
  mesh(weapon, fullerGeometry, materials.gold, {
    name: 'gilded blade fuller',
    position: [0, 0.03, 0.032],
    castShadow: false,
  });

  const weaponTip = ctx.joint(weapon, 'greatblade contact tip', [-0.005, 1.94, 0]);
  weaponTip.userData.isWeaponTip = true;
  return { weapon, weaponTip };
}

function buildPlayerSeams(ctx, parent, materials) {
  const seams = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = lerp(-0.78, 0.78, i / 4);
    const base = ctx.joint(parent, `seam socket ${i + 1}`, [Math.sin(angle) * 0.29, 0.03, Math.cos(angle) * 0.19]);
    ctx.mesh(base, ctx.geometry.box, materials.grip, {
      name: 'seam housing',
      scale: [0.048, 0.1, 0.036],
      rotation: [0, angle, 0],
    });
    const glow = ctx.mesh(base, ctx.geometry.box, materials.cyan, {
      name: 'charged seam',
      position: [0, 0.01, 0.021],
      scale: [0.022, 0.067, 0.012],
      rotation: [0, angle, 0],
      castShadow: false,
    });
    seams.push(glow);
  }
  return seams;
}

export function createPlayerRig(authoredShell = null) {
  const ctx = createRigContext();
  const { geometry, material, mesh, joint } = ctx;
  const fabricDetail = ctx.addTexture(makeDetailTexture('fabric', 8, 14));
  const skinDetail = ctx.addTexture(makeDetailTexture('skin', 7, 9));
  const brushedDetail = ctx.addTexture(makeDetailTexture('brushed', 5, 13));

  // Nera's armour is a warm ceremonial composite rather than a neon body
  // suit. Ivory owns the large readable planes, antique gold describes their
  // construction, and cyan is reserved for combat-state information.
  const charcoal = material('neraIvoryPlate', {
    color: 0xe5ded2,
    roughness: 0.25,
    metalness: 0.58,
    bumpMap: brushedDetail,
    bumpScale: 0.011,
    physical: true,
    clearcoat: 0.24,
    clearcoatRoughness: 0.27,
    specularIntensity: 0.72,
    specularColor: 0xfff0d8,
    emissive: 0x18120c,
    emissiveIntensity: 0.1,
  });
  const graphite = material('neraAntiqueGold', {
    color: 0xd0a251,
    roughness: 0.3,
    metalness: 0.78,
    bumpMap: brushedDetail,
    bumpScale: 0.012,
    physical: true,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    emissive: 0x090300,
    emissiveIntensity: 0.025,
  });
  const cloth = material('neraCrimsonBattleCloth', {
    color: 0x681522,
    roughness: 0.72,
    metalness: 0.02,
    bumpMap: fabricDetail,
    bumpScale: 0.035,
    physical: true,
    sheen: 0.46,
    sheenColor: 0xd95b5f,
    sheenRoughness: 0.7,
    side: THREE.DoubleSide,
  });
  const clothInner = material('neraCrimsonClothInner', {
    color: 0x28060c,
    roughness: 0.7,
    metalness: 0.025,
    emissive: 0x170205,
    emissiveIntensity: 0.12,
    bumpMap: fabricDetail,
    bumpScale: 0.028,
    physical: true,
    sheen: 0.66,
    sheenColor: 0x8f2630,
    sheenRoughness: 0.6,
    side: THREE.DoubleSide,
  });
  const underSuit = material('neraTailoredUnderSuit', {
    color: 0x3a171d,
    roughness: 0.67,
    metalness: 0.06,
    bumpMap: fabricDetail,
    bumpScale: 0.027,
    physical: true,
    sheen: 0.34,
    sheenColor: 0x64403a,
    sheenRoughness: 0.76,
  });
  const cyan = material('neraSeamLight', {
    color: 0x39dce2,
    roughness: 0.2,
    metalness: 0.34,
    emissive: 0x0b9ca6,
    emissiveIntensity: 0.82,
    physical: true,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });
  const skin = material('warmSkin', {
    color: 0xd19a88,
    roughness: 0.49,
    metalness: 0,
    emissive: 0x1d0905,
    emissiveIntensity: 0.13,
    bumpMap: skinDetail,
    bumpScale: 0.009,
    physical: true,
    clearcoat: 0.025,
    clearcoatRoughness: 0.72,
    specularIntensity: 0.27,
    specularColor: 0xffdfd0,
  });
  const hair = material('neraCrimsonHair', {
    color: 0x72101d,
    roughness: 0.49,
    metalness: 0.02,
    bumpMap: fabricDetail,
    bumpScale: 0.012,
    physical: true,
    sheen: 0.52,
    sheenColor: 0xb12d3a,
    sheenRoughness: 0.64,
    anisotropy: 0.9,
    anisotropyRotation: HALF_PI,
  });
  const hairShadow = material('neraDeepCrimsonHair', {
    color: 0x290309,
    roughness: 0.57,
    metalness: 0.02,
    bumpMap: fabricDetail,
    bumpScale: 0.014,
    physical: true,
    sheen: 0.38,
    sheenColor: 0x68111c,
    sheenRoughness: 0.57,
    anisotropy: 0.78,
    anisotropyRotation: HALF_PI,
  });
  const hairHighlight = material('neraRubyHairHighlight', {
    color: 0xa62938,
    roughness: 0.46,
    metalness: 0.015,
    physical: true,
    sheen: 0.62,
    sheenColor: 0xd55457,
    sheenRoughness: 0.59,
    anisotropy: 0.88,
    anisotropyRotation: HALF_PI,
  });
  const crimsonGem = material('neraGarnetJewels', {
    color: 0x9d1f2f,
    roughness: 0.12,
    metalness: 0.22,
    emissive: 0x4b0711,
    emissiveIntensity: 0.45,
    physical: true,
    clearcoat: 0.92,
    clearcoatRoughness: 0.05,
  });
  const grip = material('weaponGrip', {
    color: 0x211014,
    roughness: 0.78,
    metalness: 0.12,
    bumpMap: fabricDetail,
    bumpScale: 0.04,
  });
  const blade = material('calligraphicBlade', {
    color: 0xe2ddd3,
    roughness: 0.16,
    metalness: 0.96,
    physical: true,
    clearcoat: 0.38,
    clearcoatRoughness: 0.16,
    bumpMap: brushedDetail,
    bumpScale: 0.012,
  });
  const eye = material('neraEyes', {
    color: 0xe8fff8,
    emissive: 0x2a8b79,
    emissiveIntensity: 1.15,
    roughness: 0.12,
    metalness: 0.1,
  }, false);
  const sclera = material('neraSclera', {
    color: 0xf0e8df,
    roughness: 0.38,
    metalness: 0,
    physical: true,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42,
  });
  const iris = material('neraIris', {
    color: 0x355d4f,
    emissive: 0x123b32,
    emissiveIntensity: 0.28,
    roughness: 0.16,
    metalness: 0,
    physical: true,
    clearcoat: 0.82,
    clearcoatRoughness: 0.08,
  }, false);
  const lip = material('neraLips', {
    color: 0x8f3d45,
    roughness: 0.52,
    metalness: 0,
  });

  const group = joint(null, 'Nera — player rig');
  group.userData.character = 'Nera';
  group.userData.forward = '+Z';
  // Presentation-only vertical proportion correction. Gameplay collision and
  // horizontal reach remain authoritative in game.js, while the rendered
  // heroine reads as an adult duelist instead of a compact figurine.
  group.scale.set(0.9, 1.25, 0.92);
  // A presentation-only aerial pivot lets the second jump describe a complete
  // somersault without changing the gameplay root, bind markers, or any
  // collision data owned by game.js. At rest it is an identity transform, so
  // the long-standing weapon/core contracts remain byte-for-byte stable.
  const aerialPivot = joint(group, 'Nera second-jump somersault pivot');
  const body = joint(aerialPivot, 'Nera motion root', [0, 0.035, 0]);
  const pelvis = joint(body, 'pelvis', [0, 0.92, 0]);
  const spine = joint(pelvis, 'spine', [0, 0.16, 0]);
  const chest = joint(spine, 'chest', [0, 0.34, 0]);
  const neck = joint(chest, 'neck', [0, 0.28, 0.01]);
  const head = joint(neck, 'head', [0, 0.18, 0.015]);
  // A slightly narrower, vertically biased head scale pushes the body toward
  // an elegant adult proportion without moving the head joint or combat
  // markers. The extra crown height is carried by hair rather than a larger
  // face, preventing the old collectible-figure read.
  head.scale.set(0.76, 0.72, 0.77);

  // Tailored armour shells sit over a continuous skinned under-suit built
  // below. The profile is intentionally human: a protected ribcage, narrow
  // articulated waist, and strong hips make her read as an adult duelist
  // without exposing anatomy or turning armour into a skin-tight costume.
  const hipArmorGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.13, 0.11, 0.085], [-0.085, 0.175, 0.125], [-0.025, 0.205, 0.148],
    [0.045, 0.218, 0.158], [0.115, 0.19, 0.132], [0.165, 0.105, 0.078],
  ], 36));
  mesh(pelvis, hipArmorGeometry, charcoal, {
    name: 'pearl armoured hip foundation',
    position: [0, 0.015, 0],
  });
  mesh(pelvis, geometry.torus, graphite, {
    name: 'segmented gilded waist ring',
    position: [0, .11, 0],
    rotation: [HALF_PI, 0, 0],
    scale: [.38, .27, .54],
  });
  const hipPetalGeometry = ctx.addGeometry(makeShapeGeometry([
    [-.075, .12], [.075, .12], [.105, .015], [.055, -.17], [0, -.25], [-.055, -.17], [-.105, .015],
  ], .033, .008));
  for (const side of [-1, 1]) {
    mesh(pelvis, hipPetalGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} pearl hip petal`,
      position: [side * .175, -.018, .164],
      rotation: [.055, side * -.065, side * -.14],
      scale: [.82, 1.04, .9],
    });
    mesh(pelvis, hipPetalGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} gold hip petal inlay`,
      position: [side * .175, -.014, .201],
      rotation: [.055, side * -.065, side * -.14],
      scale: [.57, .81, .48],
      castShadow: false,
    });
    mesh(pelvis, geometry.octa, crimsonGem, {
      name: `${side < 0 ? 'left' : 'right'} hip garnet`,
      position: [side * .175, .076, .226],
      rotation: [0, 0, Math.PI * .25],
      scale: [.032, .045, .018],
      castShadow: false,
    });
  }
  const waistGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.105, 0.145, 0.102], [-0.025, 0.155, 0.11], [0.075, 0.164, 0.118],
    [0.175, 0.198, 0.136], [0.265, 0.177, 0.12], [0.305, 0.125, 0.086],
  ], 36));
  mesh(spine, waistGeometry, skin, {
    name: 'fitted duelist waist',
  });
  const cuirassGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.255, 0.118, 0.092], [-0.19, 0.178, 0.132], [-0.095, 0.244, 0.176],
    [0.025, 0.282, 0.198], [0.13, 0.274, 0.188], [0.225, 0.222, 0.148],
    [0.305, 0.142, 0.102],
  ], 40));
  mesh(chest, cuirassGeometry, underSuit, {
    name: 'continuous flexible duelist cuirass foundation',
    position: [0, -0.015, 0],
  });
  // Two overlapping forged cups form a full-coverage cuirass. Their mirrored
  // plates give a feminine ribcage read through construction, not bare skin.
  const chestPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [0.015, 0.294], [-0.115, 0.305], [-0.235, 0.22], [-0.27, 0.055],
    [-0.195, -0.155], [-0.055, -0.235], [0.032, -0.165], [0.052, 0.065],
  ], 0.048, 0.014));
  mesh(chest, chestPlateGeometry, charcoal, {
    name: 'left sculpted pearl cuirass plate',
    position: [-0.008, -0.012, 0.198],
    rotation: [0.025, -0.035, -0.035],
    scale: [0.78, 0.94, 0.52],
  });
  mesh(chest, chestPlateGeometry, charcoal, {
    name: 'right sculpted pearl cuirass plate',
    position: [0.008, -0.012, 0.198],
    rotation: [0.025, 0.035, 0.035],
    scale: [-0.78, 0.94, 0.52],
  });
  const sculptedBustGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.112, height: 0.132, depth: 0.052, jaw: 0.82, crown: 0.91, face: 0.006,
  }));
  for (const side of [-1, 1]) {
    mesh(chest, sculptedBustGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} pearl anatomical breastplate`,
      position: [side * 0.103, 0.082, 0.205],
      rotation: [0.035, side * -0.075, side * 0.04],
      scale: [0.94, 1.08, 0.72],
    });
    const bustFiligree = ctx.addGeometry(makeTubeGeometry([
      [side * 0.02, 0.2, 0.286], [side * 0.105, 0.23, 0.292],
      [side * 0.205, 0.14, 0.286], [side * 0.205, 0.015, 0.274],
      [side * 0.11, -0.06, 0.268], [side * 0.035, -0.095, 0.26],
    ], 0.006, 28, 7));
    mesh(chest, bustFiligree, graphite, {
      name: `${side < 0 ? 'left' : 'right'} readable cuirass scrollwork`,
      castShadow: false,
    });
  }
  const sternumGoldGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.027, 0.27], [0.027, 0.27], [0.052, 0.08], [0.036, -0.16],
    [0, -0.275], [-0.036, -0.16], [-0.052, 0.08],
  ], 0.025, 0.006));
  mesh(chest, sternumGoldGeometry, graphite, {
    name: 'gilded sternum keel',
    position: [0, 0.012, 0.268],
    scale: [0.43, 0.9, 0.48],
    castShadow: false,
  });
  const breastplateFiligreeLeft = ctx.addGeometry(makeTubeGeometry([
    [-0.022, 0.24, 0.276], [-0.13, 0.22, 0.285], [-0.225, 0.12, 0.278], [-0.19, -0.055, 0.277], [-0.08, -0.19, 0.27],
  ], 0.0055, 30, 7));
  const breastplateFiligreeRight = ctx.addGeometry(makeTubeGeometry([
    [0.022, 0.24, 0.276], [0.13, 0.22, 0.285], [0.225, 0.12, 0.278], [0.19, -0.055, 0.277], [0.08, -0.19, 0.27],
  ], 0.0055, 30, 7));
  mesh(chest, breastplateFiligreeLeft, graphite, { name: 'left cuirass gold filigree', castShadow: false });
  mesh(chest, breastplateFiligreeRight, graphite, { name: 'right cuirass gold filigree', castShadow: false });
  mesh(chest, geometry.octa, crimsonGem, {
    name: 'garnet sternum seal',
    position: [0, -0.205, 0.302],
    rotation: [0, 0, Math.PI * 0.25],
    scale: [0.045, 0.065, 0.025],
    castShadow: false,
  });
  const rearPlateGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.155, height: 0.255, depth: 0.044, jaw: 0.56, crown: 0.84, face: 0.006,
  }));
  mesh(chest, rearPlateGeometry, charcoal, {
    name: 'sculpted pearl dorsal armour plate',
    position: [0.025, -0.02, -0.205],
    rotation: [0.02, Math.PI, -0.035],
  });
  const scapularPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.105, 0.145], [0.055, 0.165], [0.115, 0.07], [0.08, -0.125],
    [-0.045, -0.17], [-0.12, -0.055],
  ], 0.038, 0.012));
  mesh(chest, scapularPlateGeometry, graphite, {
    name: 'left layered scapular plate',
    position: [-0.125, 0.015, -0.216],
    rotation: [0.025, Math.PI, -0.11],
    scale: [0.92, 1, 1],
  });
  mesh(chest, scapularPlateGeometry, charcoal, {
    name: 'right layered scapular plate',
    position: [0.135, 0.005, -0.218],
    rotation: [0.02, Math.PI, 0.12],
    scale: [0.88, 0.96, 1],
  });
  const dorsalInlayGeometry = ctx.addGeometry(makeTubeGeometry([
    [0.015, 0.195, -0.253], [0.04, 0.055, -0.264], [0.015, -0.105, -0.258], [-0.02, -0.235, -0.235],
  ], 0.009, 22, 6));
  mesh(chest, dorsalInlayGeometry, cyan, { name: 'dorsal seam inlay', castShadow: false });
  mesh(chest, geometry.box, graphite, {
    name: 'diagonal gold seam',
    position: [0.065, -0.01, 0.235],
    rotation: [0, 0, 0.51],
    scale: [0.025, 0.34, 0.018],
    castShadow: false,
  });
  const core = mesh(chest, geometry.octa, cyan, {
    name: 'Nera seam core',
    position: [-0.13, 0.02, 0.275],
    rotation: [0, 0, Math.PI * 0.25],
    scale: [0.052, 0.052, 0.027],
    castShadow: false,
  });
  core.userData.isCore = true;

  // An intentionally incomplete collar leaves clean negative space around the
  // face. Separate forged arcs read as tailored armour instead of a rubber
  // torus, and their unequal lengths reinforce Nera's asymmetry.
  const leftCollarGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.31, 0.225, -0.055], [-0.265, 0.305, -0.02], [-0.17, 0.35, 0.012], [-0.055, 0.325, 0.048],
  ], 0.028, 28, 8));
  const rightCollarGeometry = ctx.addGeometry(makeTubeGeometry([
    [0.045, 0.325, 0.048], [0.135, 0.345, 0.02], [0.235, 0.295, -0.025], [0.275, 0.245, -0.06],
  ], 0.023, 24, 8));
  mesh(chest, leftCollarGeometry, graphite, { name: 'left broken meridian collar' });
  mesh(chest, rightCollarGeometry, charcoal, { name: 'right broken meridian collar' });
  mesh(chest, geometry.octa, cyan, {
    name: 'collar terminal light',
    position: [-0.31, 0.225, -0.055],
    scale: [0.045, 0.065, 0.04],
    castShadow: false,
  });
  const faceGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.174, height: 0.214, depth: 0.158, jaw: 0.67, crown: 1.015, face: 0.026,
  }));
  mesh(head, faceGeometry, skin, {
    name: 'sculpted human face',
    position: [0, -0.006, 0.004],
    scale: [1.015, 1.075, 1.025],
  });
  const hairCrownGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.226, height: 0.278, depth: 0.211, jaw: 0.8, crown: 1.17,
  }));
  mesh(head, hairCrownGeometry, hairShadow, {
    name: 'voluminous crimson hair crown',
    position: [0, 0.098, -0.056],
    scale: [1.025, 0.82, 1.055],
  });
  const sweptCrownGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.218, 0.105, 0.09], [-0.13, 0.216, 0.143], [0.015, 0.252, 0.146],
    [0.15, 0.205, 0.096], [0.228, 0.095, 0.018],
  ], 0.038, 36, 9));
  mesh(head, sweptCrownGeometry, hairHighlight, {
    name: 'swept ruby crown wave',
    rotation: [0.02, 0, -0.08],
  });
  const fringeGeo = ctx.addGeometry(makeShapeGeometry([
    [-0.212, 0.13], [0.195, 0.13], [0.17, 0.065], [0.085, 0.075],
    [0.01, 0.055], [-0.09, 0.046], [-0.188, 0.068],
  ], 0.021, 0.003));
  mesh(head, fringeGeo, hair, {
    name: 'swept crimson fringe',
    position: [0, 0.082, 0.15],
    rotation: [0.018, 0, -0.045],
  });
  const diagonalFringeGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.165, 0.115, 0.171], [-0.11, 0.055, 0.181], [-0.055, -0.012, 0.184],
    [-0.012, 0.004, 0.18], [0.038, 0.015, 0.17],
  ], 0.013, 24, 7));
  mesh(head, diagonalFringeGeometry, hairHighlight, {
    name: 'fine diagonal ruby fringe lock',
    castShadow: false,
  });
  for (const side of [-1, 1]) {
    mesh(head, geometry.sphere, sclera, {
      name: `${side < 0 ? 'left' : 'right'} eye`,
      position: [side * 0.061, -0.02, 0.158],
      rotation: [0, side * -0.12, side * -0.035],
      scale: [0.046, 0.021, 0.018],
    });
    mesh(head, geometry.sphere, iris, {
      name: `${side < 0 ? 'left' : 'right'} iris`,
      position: [side * 0.061, -0.02, 0.175],
      scale: [0.013, 0.013, 0.007],
      castShadow: false,
    });
    mesh(head, geometry.sphere, eye, {
      name: `${side < 0 ? 'left' : 'right'} eye glint`,
      position: [side * 0.057, -0.014, 0.181],
      scale: [0.0045, 0.0045, 0.003],
      castShadow: false,
    });
    const browGeometry = ctx.addGeometry(makeTubeGeometry([
      [side * 0.105, 0.025, 0.17], [side * 0.068, 0.035, 0.183], [side * 0.03, 0.026, 0.178],
    ], 0.008, 10, 5));
    mesh(head, browGeometry, hair, {
      name: `${side < 0 ? 'left' : 'right'} eyebrow`,
      castShadow: false,
    });
    mesh(head, geometry.sphere, skin, {
      name: `${side < 0 ? 'left' : 'right'} ear`,
      position: [side * 0.175, -0.015, -0.004],
      scale: [0.026, 0.052, 0.019],
    });
  }
  const noseGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.045, 0.006, 0.006], [0.01, 0.022, 0.018], [-0.055, 0.017, 0.016], [-0.085, 0.004, 0.004],
  ], 16));
  mesh(head, noseGeometry, skin, {
    name: 'sculpted nose bridge',
    position: [0, -0.01, 0.17],
    rotation: [HALF_PI, 0, 0],
    scale: [0.69, 0.58, 0.69],
  });
  const mouthGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.044, -0.09, 0.166], [0, -0.098, 0.173], [0.044, -0.09, 0.166],
  ], 0.0045, 12, 5));
  mesh(head, mouthGeometry, lip, { name: 'defined mouth', castShadow: false });
  const sideLockGeometry = ctx.addGeometry(makeTubeGeometry([
    [0, 0.145, 0], [0.045, 0.025, 0.016], [-0.025, -0.125, -0.004],
    [0.06, -0.305, -0.045], [-0.01, -0.5, -0.09], [0.04, -0.61, -0.14],
  ], 0.027, 34, 8));
  mesh(head, sideLockGeometry, hairHighlight, {
    name: 'left face-framing crimson wave',
    position: [-0.168, 0.05, 0.012],
    rotation: [0.05, 0.08, -0.11],
    scale: [1.1, 1.72, 1.1],
  });
  mesh(head, sideLockGeometry, hair, {
    name: 'right face-framing crimson wave',
    position: [0.168, 0.045, 0.014],
    rotation: [0.03, -0.08, 0.08],
    scale: [1.02, 1.66, 1.02],
  });
  mesh(head, sideLockGeometry, hairShadow, {
    name: 'left outer sculpted crimson wave',
    position: [-0.215, 0.11, -0.005],
    rotation: [0.07, 0.16, -0.2],
    scale: [0.82, 1.48, 0.82],
  });
  mesh(head, sideLockGeometry, hairHighlight, {
    name: 'right outer sculpted crimson wave',
    position: [0.215, 0.1, -0.01],
    rotation: [0.06, -0.16, 0.19],
    scale: [0.8, 1.42, 0.8],
  });
  const portraitHairPanelGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.17, length: 0.74, taper: 0.62, flare: 0.06, curl: 0.19,
    wrap: 0.075, sway: 0.075, hem: 0.04, folds: 7, foldDepth: 0.016,
    raggedness: 0.11, raggedTeeth: 7, segmentsX: 11, segmentsY: 22,
  }));
  mesh(head, portraitHairPanelGeometry, hair, {
    name: 'left broad face-framing crimson hair mass',
    position: [-0.17, 0.115, 0.025],
    rotation: [0.045, 0.31, -0.12],
    scale: [1.25, 1.72, 1.08],
  });
  mesh(head, portraitHairPanelGeometry, hairShadow, {
    name: 'right broad face-framing crimson hair mass',
    position: [0.17, 0.11, 0.02],
    rotation: [0.04, -0.31, 0.11],
    scale: [-1.22, 1.68, 1.06],
  });

  const leftShoulder = joint(chest, 'left shoulder', [-0.335, 0.17, 0]);
  const leftElbow = joint(leftShoulder, 'left elbow', [0, -0.34, 0]);
  const leftHand = joint(leftElbow, 'left hand', [0, -0.31, 0]);
  const rightShoulder = joint(chest, 'right shoulder', [0.335, 0.17, 0]);
  const rightElbow = joint(rightShoulder, 'right elbow', [0, -0.34, 0]);
  const rightHand = joint(rightElbow, 'right hand', [0, -0.31, 0]);
  const wristCuffPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.078, 0.055], [0.062, 0.062], [0.086, 0.005], [0.052, -0.068],
    [-0.052, -0.071], [-0.088, -0.012],
  ], 0.024, 0.008));
  const forearmPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.065, 0.12], [0.055, 0.115], [0.078, 0.02], [0.052, -0.135],
    [-0.038, -0.16], [-0.075, -0.035],
  ], 0.025, 0.007));

  for (const [side, shoulder, elbow, handJoint] of [
    [-1, leftShoulder, leftElbow, leftHand],
    [1, rightShoulder, rightElbow, rightHand],
  ]) {
    const bracerGeometry = ctx.addGeometry(makeOrganicGeometry([
      [0.035, 0.09, 0.084], [0.005, 0.108, 0.096], [-0.12, 0.097, 0.09],
      [-0.25, 0.083, 0.075], [-0.315, 0.066, 0.059],
    ], 26));
    mesh(elbow, bracerGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} fitted bracer`,
      scale: [0.84, 1, 0.84],
    });
    mesh(elbow, forearmPlateGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} sculpted pearl outer forearm shell`,
      position: [side * 0.052, -0.13, 0.096],
      rotation: [0.02, 0, side * -0.05],
      scale: [0.52, 0.86, 0.58],
    });
    mesh(elbow, forearmPlateGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} narrow gilded forearm inlay`,
      position: [side * 0.052, -0.13, 0.122],
      rotation: [0.02, 0, side * -0.05],
      scale: [0.17, 0.64, 0.28],
      castShadow: false,
    });
    for (const face of [-1, 1]) {
      mesh(elbow, wristCuffPlateGeometry, face > 0 ? graphite : charcoal, {
        name: `${side < 0 ? 'left' : 'right'} ${face > 0 ? 'front' : 'rear'} broken wrist cuff plate`,
        position: [0, -0.29, face * 0.066],
        rotation: [0, face < 0 ? Math.PI : 0, side * face * 0.035],
        scale: [0.66, 0.68, 0.68],
      });
    }
    buildDetailedHand(ctx, handJoint, { hand: charcoal, accent: graphite }, side,
      `${side < 0 ? 'left' : 'right'} pearl gauntlet`, 0.92);
  }
  // Layered pauldrons echo each other without becoming symmetrical: the left
  // is her heraldic shoulder while the weapon side remains smaller and clear.
  const pauldronGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.07, 0.09, 0.105], [-0.035, 0.16, 0.145], [0.015, 0.185, 0.16],
    [0.07, 0.15, 0.13], [0.12, 0.05, 0.04],
  ], 28));
  mesh(leftShoulder, pauldronGeometry, charcoal, {
    name: 'heraldic pearl left pauldron',
    position: [-0.035, 0.015, 0],
    rotation: [0.04, 0.02, -0.16],
    scale: [0.7, 0.8, 0.74],
  });
  mesh(rightShoulder, pauldronGeometry, charcoal, {
    name: 'compact pearl weapon-side pauldron',
    position: [0.025, 0.008, 0],
    rotation: [0.035, -0.02, 0.14],
    scale: [0.66, 0.75, 0.7],
  });
  const pauldronFaceGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.15, 0.055], [-0.035, 0.11], [0.135, 0.075], [0.17, -0.015],
    [0.065, -0.105], [-0.12, -0.08],
  ], 0.036, 0.011));
  mesh(leftShoulder, pauldronFaceGeometry, charcoal, {
    name: 'layered pauldron face plate',
    position: [-0.02, 0.02, -0.145],
    rotation: [0.02, Math.PI, -0.08],
    scale: [0.68, 0.82, 0.76],
  });
  mesh(rightShoulder, pauldronFaceGeometry, charcoal, {
    name: 'weapon-side pearl pauldron face',
    position: [0.015, 0.015, -0.14],
    rotation: [0.02, Math.PI, 0.07],
    scale: [-0.64, 0.76, 0.72],
  });
  mesh(leftShoulder, pauldronFaceGeometry, charcoal, {
    name: 'front heraldic pearl pauldron blade plate',
    position: [-0.02, 0.02, 0.145],
    rotation: [0.02, 0, -0.08],
    scale: [0.68, 0.82, 0.76],
  });
  mesh(rightShoulder, pauldronFaceGeometry, charcoal, {
    name: 'front compact pauldron blade plate',
    position: [0.015, 0.015, 0.14],
    rotation: [0.02, 0, 0.07],
    scale: [-0.64, 0.76, 0.72],
  });
  mesh(leftShoulder, pauldronFaceGeometry, graphite, {
    name: 'front heraldic gilded pauldron inlay',
    position: [-0.02, 0.02, 0.172],
    rotation: [0.02, 0, -0.08],
    scale: [0.4, 0.52, 0.42],
    castShadow: false,
  });
  mesh(rightShoulder, pauldronFaceGeometry, graphite, {
    name: 'front weapon-side gilded pauldron inlay',
    position: [0.015, 0.015, 0.167],
    rotation: [0.02, 0, 0.07],
    scale: [-0.4, 0.52, 0.42],
    castShadow: false,
  });
  const pauldronBladeGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.12, 0.025], [-0.035, 0.115], [0.145, 0.07], [0.19, -0.005],
    [0.06, -0.062], [-0.09, -0.045],
  ], 0.026, 0.007));
  mesh(leftShoulder, pauldronBladeGeometry, charcoal, {
    name: 'floating upper pauldron blade',
    position: [-0.055, 0.105, -0.178],
    rotation: [0.015, Math.PI, -0.16],
    scale: [0.68, 0.7, 0.7],
  });
  mesh(leftShoulder, pauldronBladeGeometry, graphite, {
    name: 'floating upper pauldron gilded inlay',
    position: [-0.055, 0.105, -0.153],
    rotation: [0.015, Math.PI, -0.16],
    scale: [0.42, 0.48, 0.4],
    castShadow: false,
  });
  mesh(leftShoulder, pauldronBladeGeometry, clothInner, {
    name: 'dark lower pauldron gasket',
    position: [-0.015, -0.055, -0.168],
    rotation: [0.02, Math.PI, 0.055],
    scale: [0.74, 0.58, 0.82],
  });
  mesh(leftShoulder, geometry.box, graphite, {
    name: 'gilded pauldron slash',
    position: [-0.075, 0.03, 0.185],
    rotation: [0, 0, -0.22],
    scale: [0.12, 0.018, 0.018],
    castShadow: false,
  });
  mesh(leftShoulder, geometry.octa, crimsonGem, {
    name: 'left pauldron garnet',
    position: [-0.075, 0.03, 0.205],
    rotation: [0, 0, Math.PI * 0.25],
    scale: [0.035, 0.052, 0.018],
    castShadow: false,
  });

  const leftHip = joint(pelvis, 'left hip', [-0.22, -0.05, 0]);
  const leftKnee = joint(leftHip, 'left knee', [0, -0.48, 0]);
  const leftAnkle = joint(leftKnee, 'left ankle', [0, -0.43, 0]);
  const rightHip = joint(pelvis, 'right hip', [0.22, -0.05, 0]);
  const rightKnee = joint(rightHip, 'right knee', [0, -0.48, 0]);
  const rightAnkle = joint(rightKnee, 'right ankle', [0, -0.43, 0]);
  const duelistBootGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.09, 0.058, 0.052], [-0.015, 0.095, 0.075], [0.12, 0.105, 0.078],
    [0.255, 0.078, 0.052], [0.385, 0.035, 0.025], [0.445, 0.006, 0.006],
  ], 32));
  const duelistKneePlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.09, 0.055], [0, 0.12], [0.09, 0.055], [0.072, -0.055],
    [0, -0.12], [-0.072, -0.055],
  ], 0.025, 0.007));
  const duelistKneeUnderformGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.095, 0.045], [-0.035, 0.105], [0.065, 0.088], [0.105, 0.018],
    [0.058, -0.085], [-0.052, -0.102], [-0.108, -0.025],
  ], 0.048, 0.012));
  const shinPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.06, 0.13], [0.045, 0.12], [0.078, 0.015], [0.038, -0.16],
    [-0.045, -0.19], [-0.075, -0.03],
  ], 0.027, 0.007));

  for (const [side, hip, knee, ankle] of [
    [-1, leftHip, leftKnee, leftAnkle],
    [1, rightHip, rightKnee, rightAnkle],
  ]) {
    mesh(knee, duelistKneeUnderformGeometry, clothInner, {
      name: `${side < 0 ? 'left' : 'right'} faceted knee underform`,
      position: [0, 0.005, 0.076],
      rotation: [0.05, 0, side * -0.05],
      scale: [0.72, 0.76, 0.82],
    });
    mesh(knee, duelistKneePlateGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} pearl duelist knee plate`,
      position: [0, 0.008, 0.128],
      rotation: [0.06, 0, side * -0.06],
      scale: [0.63, 0.76, 0.68],
    });
    const greaveGeometry = ctx.addGeometry(makeOrganicGeometry([
      [0.025, 0.09, 0.09], [-0.045, 0.102, 0.102], [-0.15, 0.096, 0.092],
      [-0.265, 0.082, 0.078], [-0.365, 0.066, 0.063], [-0.445, 0.052, 0.05],
    ], 30));
    mesh(knee, greaveGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} tapered greave`,
      scale: [0.75, 1, 0.82],
    });
    mesh(knee, shinPlateGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} gilded outer shin plate`,
      position: [side * 0.05, -0.19, 0.105],
      rotation: [0.02, 0, side * -0.055],
      scale: [0.38, 0.92, 0.45],
    });
    mesh(knee, shinPlateGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} sculpted pearl front shin shell`,
      position: [0, -0.185, 0.087],
      rotation: [0.02, 0, side * -0.025],
      scale: [0.57, 1.04, 0.5],
    });
    mesh(knee, shinPlateGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} narrow gilded front shin inlay`,
      position: [0, -0.185, 0.115],
      rotation: [0.02, 0, side * -0.025],
      scale: [0.19, 0.8, 0.24],
      castShadow: false,
    });
    mesh(ankle, duelistBootGeometry, charcoal, {
      name: `${side < 0 ? 'left' : 'right'} sculpted pearl duelist boot`,
      position: [0, -0.052, 0.015],
      rotation: [HALF_PI, 0, side * 0.025],
      scale: [0.84, 1, 0.86],
    });
    mesh(ankle, geometry.box, grip, {
      name: `${side < 0 ? 'left' : 'right'} beveled boot heel`,
      position: [0, -0.102, -0.022],
      rotation: [0.03, 0, side * 0.02],
      scale: [0.045, 0.075, 0.04],
    });
    const bootInlayGeometry = ctx.addGeometry(makeTubeGeometry([
      [0, -0.005, 0.09], [side * 0.008, -0.01, 0.2], [0, -0.025, 0.3],
    ], 0.009, 18, 6));
    mesh(ankle, bootInlayGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} gilded boot inlay`,
      castShadow: false,
    });
    const shinSeamGeometry = ctx.addGeometry(makeTubeGeometry([
      [0, -0.055, 0.132], [0, -0.2, 0.125], [side * 0.012, -0.35, 0.098],
    ], 0.011, 18, 6));
    mesh(knee, shinSeamGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} gilded shin seam`,
      castShadow: false,
    });
    mesh(knee, geometry.octa, crimsonGem, {
      name: `${side < 0 ? 'left' : 'right'} knee garnet`,
      position: [0, 0.012, 0.157],
      rotation: [0, 0, Math.PI * 0.25],
      scale: [0.028, 0.04, 0.015],
      castShadow: false,
    });
  }

  // One skeleton drives continuous under-suit surfaces through the existing
  // authored joints. Combat still reads the same transforms and marker nodes;
  // only the rendered skin now bends through shoulders, elbows, hips, and knees.
  const skinBones = [
    pelvis, spine, chest, neck, head,
    leftShoulder, leftElbow, leftHand, rightShoulder, rightElbow, rightHand,
    leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle,
  ];
  group.updateMatrixWorld(true);
  const skinSkeleton = ctx.addSkeleton(new THREE.Skeleton(skinBones));
  const boneIndex = Object.fromEntries(skinBones.map((bone, index) => [bone.name, index]));
  const torsoSkin = ctx.addGeometry(makeSkinnedOrganicGeometry([
    [0, 0.81, 0, 0.122, 0.096, boneIndex.pelvis],
    [0, 0.88, 0, 0.204, 0.151, boneIndex.pelvis],
    [0, 1.0, 0, 0.225, 0.164, boneIndex.pelvis, boneIndex.spine, 0.25],
    [0, 1.12, 0, 0.158, 0.125, boneIndex.spine],
    [0, 1.3, 0, 0.224, 0.155, boneIndex.spine, boneIndex.chest, 0.5],
    [0, 1.5, 0, 0.272, 0.185, boneIndex.chest],
    [0, 1.65, 0.005, 0.202, 0.142, boneIndex.chest, boneIndex.neck, 0.22],
    [0, 1.73, 0.008, 0.115, 0.095, boneIndex.neck],
    [0, 1.8, 0.01, 0.085, 0.075, boneIndex.neck],
  ], 32));
  ctx.skinnedMesh(group, torsoSkin, skin, skinSkeleton, { name: 'continuous tailored torso' });

  for (const [side, shoulderName, elbowName, handName] of [
    [-1, 'left shoulder', 'left elbow', 'left hand'],
    [1, 'right shoulder', 'right elbow', 'right hand'],
  ]) {
    const armSkin = ctx.addGeometry(makeSkinnedOrganicGeometry([
      [side * 0.335, 1.67, 0, 0.055, 0.065, boneIndex[shoulderName]],
      [side * 0.335, 1.61, 0, 0.115, 0.118, boneIndex[shoulderName]],
      [side * 0.335, 1.49, 0, 0.11, 0.112, boneIndex[shoulderName]],
      [side * 0.335, 1.36, 0, 0.09, 0.092, boneIndex[shoulderName], boneIndex[elbowName], 0.42],
      [side * 0.335, 1.285, 0, 0.086, 0.086, boneIndex[elbowName]],
      [side * 0.335, 1.17, 0, 0.082, 0.078, boneIndex[elbowName]],
      [side * 0.335, 1.045, 0, 0.068, 0.064, boneIndex[elbowName], boneIndex[handName], 0.48],
      [side * 0.335, 0.98, 0, 0.06, 0.055, boneIndex[handName]],
    ], 24));
    ctx.skinnedMesh(group, armSkin, skin, skinSkeleton, {
      name: `${side < 0 ? 'left' : 'right'} continuous arm`,
    });
  }

  for (const [side, hipName, kneeName, ankleName] of [
    [-1, 'left hip', 'left knee', 'left ankle'],
    [1, 'right hip', 'right knee', 'right ankle'],
  ]) {
    const legSkin = ctx.addGeometry(makeSkinnedOrganicGeometry([
      [side * 0.22, 0.95, 0, 0.06, 0.069, boneIndex[hipName]],
      [side * 0.22, 0.88, 0, 0.112, 0.118, boneIndex[hipName]],
      [side * 0.22, 0.72, 0, 0.116, 0.12, boneIndex[hipName]],
      [side * 0.22, 0.55, 0, 0.094, 0.097, boneIndex[hipName], boneIndex[kneeName], 0.42],
      [side * 0.22, 0.43, 0.015, 0.078, 0.081, boneIndex[kneeName]],
      [side * 0.22, 0.31, 0.005, 0.093, 0.089, boneIndex[kneeName]],
      [side * 0.22, 0.16, 0, 0.073, 0.069, boneIndex[kneeName]],
      [side * 0.22, 0.04, 0, 0.06, 0.056, boneIndex[kneeName], boneIndex[ankleName], 0.48],
      [side * 0.22, -0.005, 0, 0.057, 0.052, boneIndex[ankleName]],
    ], 26));
    ctx.skinnedMesh(group, legSkin, skin, skinSkeleton, {
      name: `${side < 0 ? 'left' : 'right'} continuous leg`,
    });
  }

  // A separated upper/hem construction leaves daylight between the legs and
  // gives each tail two different inertias. This reads as cloth in motion
  // rather than one curved plastic slab, while all combat joints stay intact.
  const leftTail = joint(pelvis, 'long left coat spring', [-0.205, 0.04, -0.17], [0.07, 0.055, -0.16]);
  const rightTail = joint(pelvis, 'short right coat spring', [0.205, 0.04, -0.165], [0.05, -0.045, 0.16]);
  const sideTail = joint(pelvis, 'asymmetric side coat spring', [0.14, 0.045, -0.205], [0.04, Math.PI, -0.18]);
  const leftTailHem = joint(leftTail, 'long left coat hem spring', [0, -0.445, 0.055], [0.025, 0, -0.025]);
  const rightTailHem = joint(rightTail, 'short right coat hem spring', [0, -0.415, 0.05], [0.02, 0, 0.025]);
  const leftTailGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.29, length: 0.56, taper: 0.3, flare: 0.16, curl: 0.11,
    wrap: 0.052, sway: -0.03, hem: 0.045, folds: 4, foldDepth: 0.02,
    raggedness: 0.075, raggedTeeth: 4,
    segmentsX: 10, segmentsY: 18,
  }));
  const rightTailGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.275, length: 0.53, taper: 0.32, flare: 0.17, curl: 0.105,
    wrap: 0.048, sway: 0.028, hem: -0.025, folds: 4, foldDepth: 0.018,
    raggedness: 0.08, raggedTeeth: 5,
    segmentsX: 10, segmentsY: 18,
  }));
  const leftTailHemGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.315, length: 0.77, taper: 0.48, flare: 0.29, curl: 0.25,
    wrap: 0.052, sway: -0.075, hem: 0.115, folds: 4, foldDepth: 0.016,
    raggedness: 0.16, raggedTeeth: 5,
    segmentsX: 11, segmentsY: 22,
  }));
  const rightTailHemGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.3, length: 0.72, taper: 0.5, flare: 0.28, curl: 0.24,
    wrap: 0.05, sway: 0.07, hem: -0.08, folds: 4, foldDepth: 0.016,
    raggedness: 0.155, raggedTeeth: 6,
    segmentsX: 11, segmentsY: 21,
  }));
  const sideTailGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.38, length: 1.16, taper: 0.36, flare: 0.34, curl: 0.18,
    wrap: 0.045, sway: 0.025, hem: 0.075, folds: 5, foldDepth: 0.024,
    raggedness: 0.18, raggedTeeth: 7,
    segmentsX: 10, segmentsY: 22,
  }));
  mesh(leftTail, leftTailGeo, cloth, { name: 'tailored pearl battle-skirt upper' });
  mesh(rightTail, rightTailGeo, cloth, { name: 'tailored pearl battle-skirt upper short' });
  mesh(leftTailHem, leftTailHemGeo, cloth, { name: 'articulated pearl battle-skirt hem' });
  mesh(rightTailHem, rightTailHemGeo, cloth, { name: 'articulated pearl battle-skirt hem short' });
  mesh(sideTail, sideTailGeo, clothInner, { name: 'crimson asymmetric inner panel' });
  addPanelPiping(ctx, sideTail, graphite, [
    [0, -0.02, 0.048], [-0.025, -0.28, 0.09], [0.018, -0.58, 0.15],
    [-0.012, -0.88, 0.23],
  ], 'crimson cape meridian spine', 0.007);
  addPanelPiping(ctx, leftTail, graphite, [
    [-0.13, -0.02, 0.045], [-0.135, -0.22, 0.06], [-0.115, -0.43, 0.09],
  ], 'left coat upper', 0.006);
  addPanelPiping(ctx, leftTailHem, graphite, [
    [-0.115, -0.01, 0.04], [-0.12, -0.19, 0.07], [-0.09, -0.39, 0.13],
  ], 'left coat hem', 0.0055);
  addPanelPiping(ctx, rightTail, graphite, [
    [0.12, -0.02, 0.04], [0.125, -0.2, 0.055], [0.105, -0.38, 0.08],
  ], 'right coat upper', 0.006);
  addPanelPiping(ctx, rightTailHem, graphite, [
    [0.105, -0.01, 0.04], [0.11, -0.17, 0.06], [0.075, -0.34, 0.11],
  ], 'right coat hem', 0.0055);
  const skirtSigilGeometry = ctx.addGeometry(makeShapeGeometry([
    [0, 0.08], [0.04, 0], [0.018, -0.12], [0, -0.22], [-0.018, -0.12], [-0.04, 0],
  ], 0.012, 0.002));
  for (const [parent, side, y] of [[leftTailHem, -1, -0.2], [rightTailHem, 1, -0.18]]) {
    mesh(parent, skirtSigilGeometry, graphite, {
      name: `${side < 0 ? 'left' : 'right'} hanging gold skirt sigil`,
      position: [side * 0.02, y, 0.13],
      scale: [0.8, 1, 1],
      castShadow: false,
    });
    mesh(parent, geometry.octa, crimsonGem, {
      name: `${side < 0 ? 'left' : 'right'} skirt garnet`,
      position: [side * 0.02, y - 0.02, 0.15],
      rotation: [0, 0, Math.PI * 0.25],
      scale: [0.025, 0.035, 0.014],
      castShadow: false,
    });
  }

  // The single shoulder scarf creates a long, readable diagonal independent
  // of the greatblade and carries a slower secondary-motion beat.
  const scarfTail = joint(chest, 'left meridian scarf spring', [-0.245, 0.27, -0.075], [0.08, 0.13, -0.16]);
  const scarfGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.18, length: 0.98, taper: 0.4, flare: 0.4, curl: 0.2,
    wrap: 0.025, sway: -0.16, hem: 0.065, folds: 3, foldDepth: 0.017,
    raggedness: 0.12, raggedTeeth: 4,
    segmentsX: 7, segmentsY: 18,
  }));
  mesh(scarfTail, scarfGeometry, clothInner, { name: 'asymmetric meridian shoulder scarf' });
  addPanelPiping(ctx, scarfTail, graphite, [
    [-0.055, -0.02, 0.035], [-0.075, -0.25, 0.07], [-0.11, -0.58, 0.14],
  ], 'shoulder scarf edge', 0.006);

  const hairRibbon = joint(head, 'hair ribbon spring', [-0.17, 0.09, -0.145], [0.05, 0.03, -0.1]);
  const braidGeometry = ctx.addGeometry(makeTubeGeometry([
    [0, 0.03, 0], [-0.035, -0.09, -0.008], [-0.075, -0.22, -0.035],
    [-0.035, -0.38, -0.075], [0.055, -0.57, -0.13],
  ], 0.043, 34, 10));
  mesh(hairRibbon, braidGeometry, hairHighlight, { name: 'weighted ruby side braid' });
  const ribbonGeo = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.11, length: 0.56, taper: 0.2, flare: 0.34, curl: 0.085,
    wrap: 0.01, sway: -0.035, hem: 0.05, segmentsX: 4, segmentsY: 10,
  }));
  mesh(hairRibbon, ribbonGeo, clothInner, {
    name: 'left silk braid ribbon',
    position: [-0.035, -0.055, -0.005],
    rotation: [0.04, 0.08, -0.11],
  });
  mesh(hairRibbon, ribbonGeo, cloth, {
    name: 'right silk braid ribbon',
    position: [0.04, -0.07, -0.012],
    rotation: [0.02, -0.05, 0.17],
    scale: [0.88, 0.92, 0.88],
  });
  mesh(hairRibbon, geometry.torus, graphite, {
    name: 'gilded braid clasp', position: [0, 0.008, 0], rotation: [HALF_PI, 0, 0], scale: [0.14, 0.14, 0.11], castShadow: false,
  });
  mesh(hairRibbon, geometry.octa, crimsonGem, {
    name: 'braid clasp garnet', position: [0, -0.006, 0.052], rotation: [0, 0, Math.PI * .25], scale: [.04, .055, .018], castShadow: false,
  });

  // The old three-lock ponytail read as a small accessory. A layered mantle,
  // distinct S-waves and a delayed lower cascade now create a long
  // crimson silhouette from every gameplay angle without strand simulation.
  const hairFan = joint(head, 'voluminous rear hair spring', [0.02, 0.11, -0.165], [0.035, -0.02, 0.045]);
  // Hair volume is intentionally counter-scaled against the small adult head:
  // the face stays refined while the waist-length waves own Nera's silhouette.
  hairFan.scale.set(1.42, 1.28, 1.2);
  const hairMantleGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.52, length: 1.12, taper: 0.56, flare: 0.08, curl: 0.21,
    wrap: 0.12, sway: -0.02, hem: 0.08, folds: 9, foldDepth: 0.016,
    raggedness: 0.1, raggedTeeth: 9,
    segmentsX: 17, segmentsY: 27,
  }));
  mesh(hairFan, hairMantleGeometry, hairShadow, {
    name: 'deep crimson rear hair mantle',
    position: [0, 0.025, -0.055],
    rotation: [0.02, Math.PI, 0],
  });
  const rearLocks = [
    { points: [[-0.165, 0.105, 0.045], [-0.085, -0.12, 0.012], [-0.2, -0.37, -0.04], [-0.07, -0.68, -0.13], [-0.16, -1.075, -0.25]], radius: 0.019, material: hair },
    { points: [[-0.095, 0.115, 0.055], [-0.18, -0.09, 0.018], [-0.045, -0.35, -0.045], [-0.17, -0.65, -0.13], [-0.025, -0.99, -0.235]], radius: 0.016, material: hairShadow },
    { points: [[-0.03, 0.13, 0.06], [0.045, -0.1, 0.018], [-0.075, -0.39, -0.05], [0.055, -0.72, -0.15], [-0.035, -1.12, -0.27]], radius: 0.02, material: hair },
    { points: [[0.03, 0.13, 0.055], [-0.055, -0.11, 0.008], [0.075, -0.37, -0.05], [-0.045, -0.69, -0.145], [0.095, -1.05, -0.245]], radius: 0.017, material: hairShadow },
    { points: [[0.095, 0.115, 0.05], [0.17, -0.12, 0.01], [0.035, -0.4, -0.05], [0.18, -0.67, -0.135], [0.075, -1.0, -0.23]], radius: 0.018, material: hair },
    { points: [[0.16, 0.1, 0.04], [0.075, -0.13, 0], [0.205, -0.38, -0.06], [0.075, -0.7, -0.14], [0.22, -0.99, -0.22]], radius: 0.016, material: hairShadow },
  ];
  rearLocks.forEach((lock, index) => {
    const lockGeometry = ctx.addGeometry(makeTubeGeometry(lock.points, lock.radius, 42, 8));
    mesh(hairFan, lockGeometry, lock.material, {
      name: `long crimson rear wave ${index + 1}`,
      position: [0, 0, -0.135],
    });
  });
  const hairCascade = joint(hairFan, 'lower crimson hair cascade spring', [0, -0.54, -0.075], [0.035, 0.015, -0.025]);
  const lowerCurls = [
    { x: -0.2, sway: -0.12, length: 0.56, radius: 0.027 },
    { x: -0.075, sway: 0.105, length: 0.64, radius: 0.031 },
    { x: 0.08, sway: -0.1, length: 0.61, radius: 0.03 },
    { x: 0.2, sway: 0.12, length: 0.54, radius: 0.026 },
  ];
  lowerCurls.forEach((curl, index) => {
    const curlGeometry = ctx.addGeometry(makeTubeGeometry([
      [curl.x, 0.04, 0], [curl.x + curl.sway, -curl.length * .32, -0.035],
      [curl.x - curl.sway * .55, -curl.length * .7, -0.09],
      [curl.x + curl.sway * .45, -curl.length, -0.15],
    ], curl.radius * 0.68, 24, 7));
    mesh(hairCascade, curlGeometry, index % 2 ? hairShadow : hair, {
      name: `articulated lower crimson curl ${index + 1}`,
      position: [0, 0, -0.135],
    });
  });

  const weaponSocket = joint(rightHand, 'greatblade socket', [0, -0.035, 0], [0.18, 0.12, -2.05]);
  const { weapon, weaponTip } = buildGreatblade(ctx, weaponSocket, {
    grip, cyan, blade, graphite, gold: graphite, crimsonGem,
  });
  const seams = buildPlayerSeams(ctx, pelvis, { grip, cyan });

  const animated = [
    body, pelvis, spine, chest, neck, head,
    leftShoulder, leftElbow, leftHand, rightShoulder, rightElbow, rightHand,
    leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle,
    weaponSocket,
  ];
  const animator = createPoseAnimator(animated);
  const authoredVisual = createPlayerVisualBridge(authoredShell, {
    group,
    body,
    weapon,
    weaponSocket,
    core,
    ctx,
    sources: {
      pelvis,
      spine,
      chest,
      neck,
      head,
      leftShoulder,
      leftElbow,
      leftHand,
      rightShoulder,
      rightElbow,
      rightHand,
      leftHip,
      leftKnee,
      leftAnkle,
      rightHip,
      rightKnee,
      rightAnkle,
    },
  });
  const springs = {
    leftTailX: createSpring(0.07), leftTailZ: createSpring(-0.2),
    leftHemX: createSpring(0.025), leftHemZ: createSpring(-0.025),
    rightTailX: createSpring(0.05), rightTailZ: createSpring(0.2),
    rightHemX: createSpring(0.02), rightHemZ: createSpring(0.025),
    sideTailX: createSpring(0.04), sideTailZ: createSpring(-0.24),
    ribbonX: createSpring(0.05), ribbonZ: createSpring(-0.1),
    hairFanX: createSpring(0.04), hairFanZ: createSpring(0.08),
    hairCascadeX: createSpring(0.035), hairCascadeZ: createSpring(-0.025),
    scarfX: createSpring(0.08), scarfZ: createSpring(-0.16),
  };

  let flash = 0;
  let seamCount = 0;
  let phase = 1;
  let previousAction = 'idle';
  let previousPoseAction = 'idle';
  let previousPoseActionTime = 0;
  let wasAirborne = false;
  let aerialStage = 0;
  let somersaultTime = -1;
  const secondJumpFlip = { active: false, progress: 0, tuck: 0 };

  function setSeams(count) {
    seamCount = clamp(Math.round(finite(count)), 0, seams.length);
    seams.forEach((item, index) => { item.visible = index < seamCount; });
    group.userData.seams = seamCount;
  }

  function setPhase(value) {
    phase = resolvePhase(value);
    group.userData.phase = phase;
  }

  function hitFlash(strength = 1) {
    flash = Math.max(flash, saturate(finite(strength, 1)));
    applyMaterialFlash(ctx.flashables, flash);
    authoredVisual.updateFlash(flash);
  }

  function advanceSecondJump(action, at, airborne, terminal, dt) {
    if (terminal || !airborne) {
      aerialStage = 0;
      somersaultTime = -1;
    } else if (!wasAirborne) {
      // Any new airborne chain consumes the grounded rise. This also handles
      // launch-cancel routes, where the first airborne frame is `launcher`
      // rather than `jump` but the next accepted jump is still the air jump.
      aerialStage = 1;
      somersaultTime = -1;
    } else {
      const restartedJump = action === 'jump'
        && (previousPoseAction !== 'jump' || at + 1 / 120 < previousPoseActionTime);
      if (restartedJump && aerialStage === 1) {
        aerialStage = 2;
        somersaultTime = 0;
      }
    }

    if (somersaultTime >= 0) somersaultTime += dt;
    const duration = 0.5;
    const active = airborne && somersaultTime >= 0 && somersaultTime <= duration + 1 / 60;
    const progress = active ? saturate(somersaultTime / duration) : 0;
    const tuck = active ? Math.sin(progress * Math.PI) : 0;

    wasAirborne = airborne;
    previousPoseAction = action;
    previousPoseActionTime = at;
    secondJumpFlip.active = active;
    secondJumpFlip.progress = progress;
    secondJumpFlip.tuck = tuck;
    group.userData.secondJumpFlip = active;
    group.userData.secondJumpFlipProgress = progress;
    return secondJumpFlip;
  }

  function applySecondJumpPose(flip) {
    if (!flip.active) return;
    const { tuck, progress } = flip;
    const open = Math.sin(Math.min(1, progress * 1.35) * Math.PI);
    animator.addRotation(pelvis, tuck * 0.38, 0, tuck * -0.05);
    animator.addRotation(spine, tuck * 0.5, 0, 0);
    animator.addRotation(chest, tuck * 0.4, 0, tuck * 0.05);
    animator.addRotation(head, tuck * -0.34, 0, 0);
    animator.addRotation(leftHip, tuck * 0.92 - open * 0.12, 0, -tuck * 0.12);
    animator.addRotation(rightHip, tuck * 1.02 - open * 0.08, 0, tuck * 0.12);
    animator.addRotation(leftKnee, tuck * 1.36, 0, 0);
    animator.addRotation(rightKnee, tuck * 1.48, 0, 0);
    animator.addRotation(leftAnkle, tuck * -0.28, 0, 0);
    animator.addRotation(rightAnkle, tuck * -0.34, 0, 0);
    animator.addRotation(leftShoulder, tuck * -0.72, 0, -tuck * 0.42);
    animator.addRotation(leftElbow, tuck * -0.46, 0, tuck * 0.2);
    animator.addRotation(rightShoulder, tuck * -0.64, 0, tuck * 0.32);
    animator.addRotation(rightElbow, tuck * -0.5, 0, -tuck * 0.16);
    animator.addRotation(weaponSocket, tuck * 0.24, progress * 0.12, tuck * -0.46);
  }

  function basePlayerPose(pose, time, action) {
    const speed = Math.max(normalizedSpeed(pose.moveSpeed), action === 'run' ? 0.68 : 0);
    const airborne = Boolean(pose.airborne) || action === 'jump' || action.startsWith('airlight') || action === 'plunge';
    const runCycle = time * lerp(7.2, 10.4, speed);
    const stride = Math.sin(runCycle) * speed;
    const cross = Math.sin(runCycle + HALF_PI) * speed;
    const breath = Math.sin(time * 2.25);

    animator.position(body, 0, airborne ? 0.025 : Math.abs(Math.sin(runCycle * 2)) * speed * 0.025, 0);
    animator.rotate(pelvis, -speed * 0.07, stride * 0.07, stride * 0.035);
    animator.rotate(spine, speed * 0.095 + breath * 0.012, -stride * 0.08, -stride * 0.03);
    animator.rotate(chest, -speed * 0.045 + breath * 0.009, -stride * 0.1, stride * 0.045);
    animator.rotate(neck, -breath * 0.012, stride * 0.07, -stride * 0.025);
    animator.rotate(head, -speed * 0.035, stride * 0.045, -stride * 0.02);

    animator.rotate(leftHip, stride * 0.72, 0, cross * 0.045);
    animator.rotate(rightHip, -stride * 0.72, 0, -cross * 0.045);
    animator.rotate(leftKnee, Math.max(0, -stride) * 0.86 + speed * 0.08, 0, 0);
    animator.rotate(rightKnee, Math.max(0, stride) * 0.86 + speed * 0.08, 0, 0);
    animator.rotate(leftAnkle, -stride * 0.22, 0, 0);
    animator.rotate(rightAnkle, stride * 0.22, 0, 0);

    animator.rotate(leftShoulder, -stride * 0.42 - speed * 0.08, 0, -0.08);
    animator.rotate(leftElbow, -0.18 - Math.max(0, stride) * 0.3, 0, -0.03);
    animator.rotate(rightShoulder, stride * 0.17 - speed * 0.06, 0, 0.04);
    animator.rotate(rightElbow, -0.32 + Math.max(0, -stride) * 0.1, 0.05, 0.05);
    animator.rotate(weaponSocket, speed * 0.06, -stride * 0.04, cross * 0.035);

    if (airborne) {
      const lift = finite(pose.verticalVelocity, 0) >= 0 ? 1 : -1;
      animator.addRotation(spine, -0.08 * lift, 0, 0);
      animator.addRotation(leftHip, -0.4 + lift * 0.1, 0, -0.08);
      animator.addRotation(rightHip, 0.18 - lift * 0.08, 0, 0.08);
      animator.addRotation(leftKnee, 0.85, 0, 0);
      animator.addRotation(rightKnee, 0.46, 0, 0);
      animator.addRotation(leftShoulder, -0.24, 0, -0.2);
      animator.addRotation(rightShoulder, 0.16, 0, 0.14);
    }
  }

  function applyPlayerAction(action, at) {
    if (action === 'light1' || action === 'light') {
      const arc = keyCurve(at, [[0, 0], [0.065, -0.92], [0.115, -1], [0.155, 1], [0.28, 0.88], [0.44, 0]]);
      const drive = windowPulse(at, 0.105, 0.155, 0.27, 0.44);
      animator.addRotation(pelvis, 0, arc * 0.24, -drive * 0.08);
      animator.addRotation(chest, -drive * 0.12, arc * 0.45, -arc * 0.16);
      animator.addRotation(rightShoulder, -0.32 - drive * 0.35, arc * 0.3, -arc * 0.55);
      animator.addRotation(rightElbow, -0.34, 0, arc * 0.25);
      animator.addRotation(weaponSocket, -0.15, arc * 0.18, arc * 1.36);
      animator.addRotation(leftShoulder, -drive * 0.22, 0, 0.25);
      animator.position(body, 0, -drive * 0.045, drive * 0.14);
    } else if (action === 'light2') {
      const arc = keyCurve(at, [[0, 0], [0.075, 0.82], [0.135, 1], [0.18, -1], [0.33, -0.84], [0.47, 0]]);
      const drive = windowPulse(at, 0.125, 0.18, 0.31, 0.47);
      animator.addRotation(pelvis, 0, arc * 0.36, drive * 0.07);
      animator.addRotation(chest, -drive * 0.1, arc * 0.58, arc * 0.13);
      animator.addRotation(rightShoulder, -0.45, arc * 0.33, -arc * 0.46);
      animator.addRotation(rightElbow, -0.2, 0, -arc * 0.22);
      animator.addRotation(weaponSocket, arc * 0.15, -arc * 0.18, arc * 1.58);
      animator.position(body, 0, -drive * 0.05, drive * 0.18);
    } else if (action === 'light3') {
      const wind = windowPulse(at, 0, 0.14, 0.225, 0.28);
      const cut = keyCurve(at, [[0, 0], [0.155, -0.8], [0.245, 1], [0.41, 0.92], [0.58, 0]]);
      const drive = windowPulse(at, 0.19, 0.245, 0.42, 0.58);
      animator.addRotation(pelvis, -drive * 0.18, cut * 0.4, cut * -0.12);
      animator.addRotation(chest, wind * 0.16 - drive * 0.28, cut * 0.72, cut * -0.2);
      animator.addRotation(rightShoulder, -0.4 - drive * 0.6, cut * 0.28, -cut * 0.7);
      animator.addRotation(rightElbow, -0.42, 0, cut * 0.18);
      animator.addRotation(weaponSocket, -0.28, cut * 0.24, cut * 1.72);
      animator.addRotation(leftHip, drive * 0.38, 0, 0);
      animator.addRotation(rightKnee, drive * 0.58, 0, 0);
      animator.position(body, 0, -drive * 0.08, drive * 0.25);
    } else if (action === 'heavy') {
      const hew = keyCurve(at, [[0, 0], [0.18, -0.86], [0.34, -1], [0.405, 1], [0.61, 0.9], [0.86, 0]]);
      const brace = windowPulse(at, 0.08, 0.2, 0.34, 0.52);
      const impact = windowPulse(at, 0.37, 0.42, 0.55, 0.78);
      animator.addRotation(pelvis, -brace * 0.28, hew * 0.38, -hew * 0.13);
      animator.addRotation(chest, -brace * 0.22 - impact * 0.24, hew * 0.78, -hew * 0.25);
      animator.addRotation(rightShoulder, -0.62 - impact * 0.55, hew * 0.35, -hew * 0.8);
      animator.addRotation(rightElbow, -0.7 + impact * 0.4, 0, hew * 0.22);
      animator.addRotation(weaponSocket, brace * 0.35 - impact * 0.5, hew * 0.26, hew * 1.82);
      animator.addRotation(leftShoulder, -0.72, -0.25, 0.58 + hew * 0.25);
      animator.addRotation(leftElbow, -0.78, 0, -0.35);
      animator.addRotation(leftHip, impact * 0.45, 0, 0);
      animator.addRotation(rightKnee, impact * 0.52, 0, 0);
      animator.position(body, 0, -brace * 0.09 - impact * 0.04, impact * 0.34);
    } else if (action === 'launcher') {
      const lift = keyCurve(at, [[0, 0], [0.17, -0.8], [0.25, -1], [0.335, 1], [0.49, 0.86], [0.68, 0]]);
      const rise = windowPulse(at, 0.2, 0.29, 0.42, 0.63);
      animator.addRotation(pelvis, -rise * 0.32, lift * 0.18, 0);
      animator.addRotation(chest, lift * -0.48, lift * 0.24, lift * 0.18);
      animator.addRotation(rightShoulder, -0.62 - rise * 0.5, 0.1, lift * -0.78);
      animator.addRotation(rightElbow, -0.38, 0, -0.18);
      animator.addRotation(weaponSocket, lift * -0.74, lift * 0.16, lift * 1.55);
      animator.addRotation(leftShoulder, -0.3, 0, 0.4);
      animator.position(body, 0, rise * 0.14, rise * 0.15);
    } else if (action === 'airlight' || action === 'airlight1' || action === 'airlight2' || action === 'airlight3') {
      const stage = action.endsWith('1') ? 1 : action.endsWith('3') ? 3 : 2;
      const spin = stage === 1
        ? keyCurve(at, [[0, 0], [0.055, -0.72], [0.105, -1], [0.15, 1], [0.29, 0.82], [0.41, 0]])
        : stage === 2
          ? keyCurve(at, [[0, 0], [0.065, 0.72], [0.12, 1], [0.17, -1], [0.31, -0.82], [0.43, 0]])
          : keyCurve(at, [[0, 0], [0.105, -0.58], [0.165, -1], [0.23, 1], [0.37, 0.86], [0.51, 0]]);
      const finisher = stage === 3 ? windowPulse(at, 0.15, 0.23, 0.36, 0.51) : 0;
      animator.addRotation(pelvis, 0.1 + finisher * 0.08, spin * (stage === 3 ? .28 : .5), spin * 0.12);
      animator.addRotation(chest, -0.18 - finisher * .18, spin * (stage === 3 ? .42 : .72), -spin * 0.22);
      animator.addRotation(rightShoulder, -0.72 - finisher * .38, spin * 0.25, -spin * (stage === 3 ? .78 : .6));
      animator.addRotation(rightElbow, -0.28, 0, 0);
      animator.addRotation(weaponSocket, -0.1 - finisher * .5, spin * 0.18, spin * (stage === 3 ? 1.88 : 1.63));
      animator.addRotation(leftShoulder, finisher * -.45, 0, finisher * .5);
      animator.addRotation(leftHip, -0.22 + finisher * .18, 0, -0.25);
      animator.addRotation(rightHip, 0.35 - finisher * .22, 0, 0.2);
      animator.addRotation(leftKnee, 0.7 + finisher * .24, 0, 0);
      animator.addRotation(rightKnee, 0.38 + finisher * .32, 0, 0);
    } else if (action === 'plunge') {
      const ready = segment(at, 0, 0.16) * (1 - segment(at, 0.25, 0.32));
      const fall = segment(at, 0.17, 0.3);
      const land = windowPulse(at, 0.31, 0.37, 0.5, 0.8);
      const bladeSnap = keyCurve(at, [[0, 0], [0.2, -0.2], [0.28, -0.7], [0.34, 1], [0.48, 0.72], [0.72, 0]]);
      animator.addRotation(chest, ready * -0.28 + fall * 0.48 - land * 0.5, 0, 0);
      animator.addRotation(rightShoulder, -1.2 + fall * -0.36, 0, -0.2);
      animator.addRotation(rightElbow, -0.25, 0, 0);
      animator.addRotation(weaponSocket, ready * -0.55 + fall * 1.35 + land * .22, bladeSnap * .14, 0.12 + bladeSnap * .62);
      animator.addRotation(leftShoulder, -0.55, 0, 0.55);
      animator.addRotation(leftHip, 0.2 + land * 0.7, 0, -0.15);
      animator.addRotation(rightHip, -0.1 + land * 0.45, 0, 0.15);
      animator.addRotation(leftKnee, 0.55 + land * 0.5, 0, 0);
      animator.addRotation(rightKnee, 0.35 + land * 0.7, 0, 0);
      animator.position(body, 0, -land * 0.25, fall * 0.12);
    } else if (action === 'dodge') {
      const duck = windowPulse(at, 0, 0.075, 0.25, 0.43);
      const roll = keyCurve(at, [[0, 0], [0.1, -0.25], [0.24, 0.3], [0.43, 0]]);
      animator.addRotation(pelvis, -duck * 0.34, roll * 0.38, roll * 0.2);
      animator.addRotation(spine, duck * 0.28, roll * -0.44, roll * -0.2);
      animator.addRotation(chest, duck * 0.38, roll * -0.38, roll * -0.24);
      animator.addRotation(head, duck * -0.22, roll * 0.32, 0);
      animator.addRotation(leftHip, duck * 0.64, 0, -0.2);
      animator.addRotation(rightHip, duck * 0.25, 0, 0.22);
      animator.addRotation(leftKnee, duck * 0.86, 0, 0);
      animator.addRotation(rightKnee, duck * 0.72, 0, 0);
      animator.addRotation(rightShoulder, duck * -0.25, 0, 0.35);
      animator.addRotation(weaponSocket, duck * 0.28, 0, -duck * 0.42);
      animator.position(body, 0, -duck * 0.25, duck * 0.16);
    } else if (action === 'parry' || action === 'deflect') {
      const guard = windowPulse(at, 0, 0.055, 0.23, 0.42);
      const snap = windowPulse(at, 0.06, 0.1, 0.15, 0.25);
      animator.addRotation(pelvis, -guard * 0.1, -guard * 0.14, 0);
      animator.addRotation(chest, -guard * 0.09, -guard * 0.34, guard * 0.06);
      animator.addRotation(rightShoulder, -guard * 0.82, -guard * 0.3, guard * 0.55);
      animator.addRotation(rightElbow, -guard * 0.7, 0, -guard * 0.28);
      animator.addRotation(weaponSocket, guard * 1.08, guard * 0.2, guard * 1.22 + snap * 0.28);
      animator.addRotation(leftShoulder, -guard * 0.75, guard * 0.18, guard * -0.42);
      animator.addRotation(leftElbow, -guard * 0.82, 0, guard * 0.28);
      animator.position(body, 0, -guard * 0.055, -guard * 0.04);
    } else if (action === 'special') {
      const charge = windowPulse(at, 0, 0.23, 0.41, 0.49);
      const release = keyCurve(at, [[0, 0], [0.39, 0], [0.45, 1], [0.68, 1], [0.88, 0]]);
      const turn = keyCurve(at, [[0, 0], [0.21, -0.35], [0.36, -1], [0.48, 1], [0.68, 0.45], [0.88, 0]]);
      animator.addRotation(pelvis, -charge * 0.25, turn * 0.7, release * 0.08);
      animator.addRotation(chest, charge * 0.22 - release * 0.2, turn * 1.05, -turn * 0.22);
      animator.addRotation(head, -charge * 0.24, -turn * 0.48, 0);
      animator.addRotation(rightShoulder, -0.58 - release * 0.45, turn * 0.32, -turn * 0.72);
      animator.addRotation(rightElbow, -0.3, 0, turn * 0.18);
      animator.addRotation(weaponSocket, -charge * 0.65 - release * 0.2, turn * 0.28, turn * 1.95);
      animator.addRotation(leftShoulder, -charge * 0.7, 0, charge * -0.78 + release * 0.42);
      animator.addRotation(leftElbow, -charge * 0.7, 0, 0.22);
      animator.position(body, 0, charge * -0.12 + release * 0.08, release * 0.34);
    } else if (action === 'gapcloser' || action === 'lunge' || action === 'chase') {
      // Chase is mechanically complete at .50 s.  Its visual recovery therefore
      // settles inside that same envelope instead of snapping out of an authored
      // pose that used to continue until .65 s.
      const thrust = keyCurve(at, [[0, 0], [0.143, -0.8], [0.223, -1], [0.278, 1], [0.38, 0.82], [0.49, 0]]);
      const travel = windowPulse(at, 0.17, 0.26, 0.39, 0.49);
      const stance = windowPulse(at, 0, 0.035, 0.39, 0.49);
      animator.addRotation(chest, -travel * 0.35, thrust * 0.15, 0);
      animator.addRotation(rightShoulder, stance * -0.78 - travel * 0.45, 0, stance * -0.3);
      animator.addRotation(rightElbow, stance * -0.1, 0, 0);
      animator.addRotation(weaponSocket, travel * 1.35, 0, thrust * 0.36);
      animator.addRotation(leftShoulder, travel * 0.24, 0, stance * -0.38);
      animator.addRotation(leftHip, travel * 0.42, 0, 0);
      animator.addRotation(rightKnee, travel * 0.5, 0, 0);
      animator.position(body, 0, -travel * 0.09, travel * 0.31);
    } else if (action === 'ranged' || action === 'shot') {
      const cast = windowPulse(at, 0, 0.1, 0.22, 0.4);
      animator.addRotation(chest, -cast * 0.08, -cast * 0.18, 0);
      animator.addRotation(leftShoulder, -cast * 1.2, 0, -cast * 0.18);
      animator.addRotation(leftElbow, cast * 0.55, 0, cast * 0.15);
      animator.addRotation(rightShoulder, -cast * 0.3, 0, cast * 0.08);
      animator.addRotation(weaponSocket, cast * 0.16, 0, -cast * 0.2);
    } else if (action === 'hit') {
      const recoil = windowPulse(at, 0, 0.045, 0.2, 0.48);
      animator.addRotation(pelvis, recoil * 0.18, -recoil * 0.22, recoil * 0.12);
      animator.addRotation(spine, recoil * 0.38, -recoil * 0.28, recoil * 0.16);
      animator.addRotation(chest, recoil * 0.34, -recoil * 0.4, recoil * 0.18);
      animator.addRotation(head, recoil * -0.32, recoil * 0.22, recoil * -0.15);
      animator.addRotation(leftShoulder, recoil * 0.42, 0, -recoil * 0.4);
      animator.addRotation(rightShoulder, recoil * 0.32, 0, recoil * 0.3);
      animator.position(body, 0, -recoil * 0.08, -recoil * 0.11);
    }
  }

  function applyPlayerDeath(at) {
    const drop = segment(at, 0, 0.72);
    const settle = segment(at, 0.7, 1.35);
    animator.position(body, 0.08 * drop, -0.63 * drop, -0.1 * drop);
    animator.rotate(pelvis, 0.72 * drop, -0.22 * drop, 0.82 * drop);
    animator.rotate(spine, 0.38 * drop, 0.2 * drop, 0.28 * drop);
    animator.rotate(chest, 0.4 * drop, -0.15 * drop, 0.22 * drop);
    animator.rotate(head, -0.38 * drop + settle * 0.12, 0.2, -0.35 * drop);
    animator.rotate(leftHip, 0.64 * drop, 0, -0.42 * drop);
    animator.rotate(rightHip, -0.2 * drop, 0, 0.32 * drop);
    animator.rotate(leftKnee, 1.25 * drop, 0, 0);
    animator.rotate(rightKnee, 0.72 * drop, 0, 0);
    animator.rotate(leftShoulder, 0.35 * drop, 0, -0.65 * drop);
    animator.rotate(rightShoulder, 0.5 * drop, 0, 0.5 * drop);
    animator.rotate(rightElbow, -0.12, 0, 0);
    animator.rotate(weaponSocket, 0.7 * drop, 0.2 * drop, -0.8 * drop);
  }

  function applyPlayerVictory(time) {
    const settle = smooth01(Math.min(time, 1.2) / 1.2);
    const breath = Math.sin(time * 1.8) * 0.025;
    animator.position(body, 0, -0.04 * settle, 0);
    animator.rotate(pelvis, -0.06, -0.16 * settle, 0);
    animator.rotate(chest, -0.08 + breath, 0.22 * settle, -0.04);
    animator.rotate(head, -0.12, -0.18, 0.04);
    animator.rotate(rightShoulder, -0.18, 0, 0.12);
    animator.rotate(rightElbow, -0.48, 0, 0.12);
    animator.rotate(weaponSocket, 0.08, 0, -0.38 * settle);
    animator.rotate(leftShoulder, -0.3, 0, -0.36);
    animator.rotate(leftElbow, -0.6, 0, 0.18);
  }

  function update(pose = {}, time = 0, dt = 1 / 60) {
    const safeTime = finite(time);
    const safeDt = clamp(finite(dt, 1 / 60), 1 / 240, 0.05);
    const action = normalizeAction(pose.action, 'idle');
    const at = Math.max(0, finite(pose.actionTime));
    const speed = normalizedSpeed(pose.moveSpeed);
    const dead = Boolean(pose.dead) || finite(pose.healthRatio, 1) <= 0;
    const airborneNow = Boolean(pose.airborne);
    const terminal = dead || action === 'death' || Boolean(pose.victory) || action === 'victory';
    const flip = advanceSecondJump(action, at, airborneNow, terminal, safeDt);

    animator.reset();
    basePlayerPose(pose, safeTime, action);
    if (dead || action === 'death') applyPlayerDeath(at);
    else if (pose.victory || action === 'victory') applyPlayerVictory(action === 'victory' ? at : safeTime);
    else applyPlayerAction(action, at);
    applySecondJumpPose(flip);

    const visualAction = dead ? 'death' : (pose.victory ? 'victory' : action);
    const contactAction = ['light1', 'light2', 'light3', 'heavy', 'launcher', 'plunge', 'special', 'gapcloser', 'lunge', 'chase'].includes(action) || action.startsWith('airlight');
    const rate = flip.active ? 48 : visualAction !== previousAction ? 42 : (contactAction ? 34 : 27);
    const resetFromTerminalPose = ['death', 'victory'].includes(previousAction) && !['death', 'victory'].includes(visualAction);
    animator.apply(safeDt, rate, resetFromTerminalPose);
    if (flip.active) {
      aerialPivot.rotation.x = -TAU * smoother01(flip.progress);
      aerialPivot.position.y = Math.sin(flip.progress * Math.PI) * 0.075;
      aerialPivot.position.z = -Math.sin(flip.progress * Math.PI) * 0.07;
    } else {
      aerialPivot.rotation.x = 0;
      aerialPivot.position.set(0, 0, 0);
    }
    authoredVisual.updatePose();
    if (resetFromTerminalPose) flash = 0;
    previousAction = visualAction;

    const actionWhip = contactAction ? Math.sin(Math.min(at * 11, Math.PI)) * 0.18 : 0;
    const airborne = airborneNow;
    const flipWhip = flip.active ? flip.tuck * 0.42 : 0;
    const tailDrag = speed * 0.34 + (airborne ? 0.18 : 0) + Math.abs(actionWhip) + flipWhip;
    const sway = Math.sin(safeTime * lerp(2.5, 8.5, speed)) * (0.025 + speed * 0.1);
    leftTail.rotation.x = springTo(springs.leftTailX, 0.07 + tailDrag, 70, 12, safeDt);
    leftTail.rotation.z = springTo(springs.leftTailZ, -0.2 - sway - actionWhip, 58, 11, safeDt);
    leftTailHem.rotation.x = springTo(springs.leftHemX, 0.025 + tailDrag * 0.34 + Math.abs(actionWhip) * 0.55, 38, 8.2, safeDt);
    leftTailHem.rotation.z = springTo(springs.leftHemZ, -0.025 - sway * 0.85 - actionWhip * 0.5, 34, 7.6, safeDt);
    rightTail.rotation.x = springTo(springs.rightTailX, 0.05 + tailDrag * 0.84, 74, 13, safeDt);
    rightTail.rotation.z = springTo(springs.rightTailZ, 0.2 + sway * 0.8 + actionWhip * 0.7, 61, 11, safeDt);
    rightTailHem.rotation.x = springTo(springs.rightHemX, 0.02 + tailDrag * 0.29 + Math.abs(actionWhip) * 0.46, 41, 8.6, safeDt);
    rightTailHem.rotation.z = springTo(springs.rightHemZ, 0.025 + sway * 0.72 + actionWhip * 0.42, 36, 7.9, safeDt);
    sideTail.rotation.x = springTo(springs.sideTailX, 0.04 + tailDrag * 0.72, 66, 11, safeDt);
    sideTail.rotation.z = springTo(springs.sideTailZ, -0.24 + sway * 1.35, 54, 10, safeDt);
    hairRibbon.rotation.x = springTo(springs.ribbonX, 0.05 + tailDrag * 0.58, 50, 9, safeDt);
    hairRibbon.rotation.z = springTo(springs.ribbonZ, -0.1 - sway * 0.72 - actionWhip * 0.45, 46, 9, safeDt);
    hairFan.rotation.x = springTo(springs.hairFanX, 0.04 + tailDrag * 0.42, 44, 8.4, safeDt);
    hairFan.rotation.z = springTo(springs.hairFanZ, 0.08 - sway * 0.9 - actionWhip * 0.34, 39, 7.8, safeDt);
    hairCascade.rotation.x = springTo(springs.hairCascadeX, 0.035 + tailDrag * 0.62 + Math.abs(actionWhip) * .3, 31, 6.9, safeDt);
    hairCascade.rotation.z = springTo(springs.hairCascadeZ, -0.025 - sway * 1.15 - actionWhip * .48, 28, 6.3, safeDt);
    scarfTail.rotation.x = springTo(springs.scarfX, 0.08 + tailDrag * 0.7, 45, 8.5, safeDt);
    scarfTail.rotation.z = springTo(springs.scarfZ, -0.16 - sway * 1.18 - actionWhip * 0.56, 37, 7.6, safeDt);

    const telegraph = pose.telegraph ? (Number.isFinite(pose.telegraph) ? saturate(pose.telegraph) : 1) : 0;
    const healthRatio = saturate(finite(pose.healthRatio, 1));
    const seamBoost = seamCount / Math.max(1, seams.length);
    cyan.emissiveIntensity = 0.74 + seamBoost * 0.5 + telegraph * 0.82 + (action === 'special' ? 1.25 : 0);
    eye.emissiveIntensity = 1.15 + (1 - healthRatio) * 0.28 + telegraph * 0.42;
    const corePulse = 1 + Math.sin(safeTime * 4.4) * 0.045 + telegraph * 0.12;
    core.scale.set(0.052 * corePulse, 0.052 * corePulse, 0.027 * corePulse);
    flash = Math.max(0, flash - safeDt * 5.8);
    const overrides = new Map([[cyan, cyan.emissiveIntensity]]);
    applyMaterialFlash(ctx.flashables, flash, overrides);
    authoredVisual.updateFlash(flash);
  }

  function dispose() {
    authoredVisual.dispose();
    ctx.dispose(group);
  }

  setSeams(0);
  setPhase(1);
  applyCharacterShadowBudget(group, PLAYER_SHADOW_CASTERS);

  return {
    group,
    body,
    weapon,
    weaponTip,
    core,
    visualMount: authoredVisual.visualMount,
    materials: ctx.materials,
    visualSnapshot: authoredVisual.visualSnapshot,
    update,
    setPhase,
    setSeams,
    hitFlash,
    dispose,
  };
}

function buildSaintSpear(ctx, parent, materials) {
  // Combat still owns the historical weapon root and contact-tip marker. The
  // visible relic is deliberately shorter: a weighty execution greatblade
  // cannot rake across the camera like the former full-height polearm, while
  // the unchanged marker keeps every authored contact and test deterministic.
  const weapon = ctx.joint(parent, 'Vespera long second-hand spear');
  const { mesh, geometry, addGeometry } = ctx;

  mesh(weapon, geometry.cylinder, materials.shaft, {
    name: 'blackened greatblade leather grip',
    position: [0, -0.22, 0],
    scale: [0.052, 0.78, 0.052],
  });
  mesh(weapon, geometry.cylinder, materials.brass, {
    name: 'greatblade upper grip collar',
    position: [0, 0.155, 0],
    scale: [0.092, 0.105, 0.092],
  });
  mesh(weapon, geometry.cylinder, materials.brass, {
    name: 'greatblade lower grip collar',
    position: [0, -0.59, 0],
    scale: [0.082, 0.11, 0.082],
  });
  mesh(weapon, geometry.cone, materials.ivory, {
    name: 'greatblade counterweight thorn',
    position: [0, -0.78, 0],
    rotation: [0, 0, Math.PI],
    scale: [0.115, 0.31, 0.115],
  });

  const greatbladeGeometry = addGeometry(makeShapeGeometry([
    [-0.16, 0.18], [0.16, 0.18], [0.31, 0.35], [0.43, 0.62],
    [0.39, 1.05], [0.31, 1.34], [0.19, 1.58], [0.075, 1.79],
    [0, 1.9], [-0.075, 1.79], [-0.19, 1.58], [-0.31, 1.34],
    [-0.39, 1.05], [-0.43, 0.62], [-0.31, 0.35],
  ], 0.09, 0.012));
  mesh(weapon, greatbladeGeometry, materials.brass, {
    name: 'gilded execution greatblade edge',
    position: [0, 0, 0.03],
    scale: [1.045, 1.012, 1],
    castShadow: false,
  });
  mesh(weapon, greatbladeGeometry, materials.void, {
    name: 'blackened execution greatblade',
    position: [0, 0, 0.055],
    scale: [0.9, 0.98, 0.92],
  });
  const greatbladeInlayGeometry = addGeometry(makeShapeGeometry([
    [-0.055, 0.3], [0.055, 0.3], [0.13, 0.56], [0.19, 0.91],
    [0.145, 1.25], [0.065, 1.56], [0, 1.75], [-0.065, 1.56],
    [-0.145, 1.25], [-0.19, 0.91], [-0.13, 0.56],
  ], 0.016, 0.002));
  mesh(weapon, greatbladeInlayGeometry, materials.violet, {
    name: 'greatblade contained violet inlay',
    position: [0, 0, 0.08],
    castShadow: false,
  });
  mesh(weapon, greatbladeGeometry, materials.void, {
    name: 'blackened execution greatblade rear face',
    position: [0, 0, -0.042],
    scale: [0.9, 0.98, 0.92],
  });
  mesh(weapon, greatbladeInlayGeometry, materials.violet, {
    name: 'greatblade rear contained violet inlay',
    position: [0, 0, -0.096],
    castShadow: false,
  });
  const guardGeometry = addGeometry(makeShapeGeometry([
    [-0.48, 0.09], [-0.2, 0.13], [-0.105, 0.24], [0, 0.18],
    [0.105, 0.24], [0.2, 0.13], [0.48, 0.09], [0.24, 0.02],
    [0, 0.055], [-0.24, 0.02],
  ], 0.07, 0.01));
  mesh(weapon, guardGeometry, materials.brass, {
    name: 'greatblade winged reliquary guard',
    position: [0, 0.06, 0.025],
  });
  mesh(weapon, geometry.torus, materials.brass, {
    name: 'greatblade chronometer ring',
    position: [0, 0.14, 0.075],
    rotation: [HALF_PI, 0, 0],
    scale: [0.19, 0.19, 0.19],
  });
  mesh(weapon, geometry.box, materials.violet, {
    name: 'greatblade violet timing filament',
    position: [0, 0.83, 0.102],
    scale: [0.018, 0.47, 0.012],
    castShadow: false,
  });

  const weaponTip = ctx.joint(weapon, 'spear contact tip', [0, 2.12, 0]);
  weaponTip.userData.isWeaponTip = true;
  return { weapon, weaponTip };
}

function buildBossHalo(ctx, parent, materials) {
  const haloRoot = ctx.joint(parent, 'segmented brass halo', [0, 2.45, -0.22], [0.08, 0, 0]);
  const segments = [];
  const segmentGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.14, 0.012, 0.01], [-0.115, 0.043, 0.031], [-0.045, 0.052, 0.038],
    [0.045, 0.052, 0.038], [0.115, 0.043, 0.031], [0.14, 0.012, 0.01],
  ], 18));
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU;
    const segmentJoint = ctx.joint(haloRoot, `halo segment ${i + 1}`);
    const segmentMesh = ctx.mesh(segmentJoint, segmentGeometry, materials.brass, {
      name: `engraved halo segment ${i + 1}`,
      scale: [0.94, 1, 0.82],
    });
    if (i % 3 === 0) {
      ctx.mesh(segmentJoint, ctx.geometry.octa, materials.telegraph, {
        name: `halo cardinal light ${i / 3 + 1}`,
        position: [0, 0.145, 0],
        scale: [0.065, 0.08, 0.045],
        castShadow: false,
      });
    }
    segments.push({ joint: segmentJoint, mesh: segmentMesh, angle, index: i });
  }
  return { haloRoot, segments };
}

function buildBossSeams(ctx, parent, materials) {
  const seams = [];
  const placements = [
    [-0.2, 0.21, 0.265, -0.5],
    [0.11, 0.13, 0.28, 0.4],
    [-0.12, -0.01, 0.292, 0.82],
  ];
  placements.forEach(([x, y, z, angle], index) => {
    ctx.mesh(parent, ctx.geometry.box, materials.seamHousing, {
      name: `sealed fault ${index + 1}`,
      position: [x, y, z - 0.006],
      rotation: [0, 0, angle],
      scale: [0.025, 0.13, 0.018],
    });
    const glow = ctx.mesh(parent, ctx.geometry.box, materials.telegraph, {
      name: `open fault ${index + 1}`,
      position: [x, y, z + 0.01],
      rotation: [0, 0, angle],
      scale: [0.012, 0.095, 0.01],
      castShadow: false,
    });
    seams.push(glow);
  });
  return seams;
}

function buildPhaseOrnaments(ctx, chest, materials) {
  const ornamentGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.15, -0.08], [0.1, -0.04], [0.24, 0.22], [0.14, 0.48],
    [0.25, 0.68], [0.13, 0.94], [0.095, 1.37], [0, 1.79],
    [-0.095, 1.38], [-0.2, 0.98], [-0.135, 0.65], [-0.26, 0.38],
  ], 0.09, 0.012));
  const edgeGeometry = ctx.addGeometry(makeShapeGeometry([
    [0.07, 0.02], [0.16, 0.24], [0.085, 0.48], [0.17, 0.68],
    [0.075, 0.94], [0.052, 1.34], [0, 1.64], [0.014, 1.2], [0.022, 0.58],
  ], 0.02, 0.002));
  const inlayGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.028, 0.14], [0.028, 0.14], [0.055, 0.42], [0.027, 0.68],
    [0.048, 0.97], [0, 1.51], [-0.048, 0.97], [-0.027, 0.68], [-0.055, 0.42],
  ], 0.012, 0));
  const ornaments = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const pivot = ctx.joint(
        chest,
        `${side < 0 ? 'left' : 'right'} mechanical blade pinion ${row + 1}`,
        [side * (0.56 + row * 0.18), 0.31 + row * 0.055, -0.44 - row * 0.055],
      );
      const bladeWidth = 0.82 - row * 0.035;
      const bladeLength = 1.13 - row * 0.065;
      const bladeDepth = 1.04 - row * 0.02;
      const ornament = ctx.mesh(
        pivot,
        ornamentGeometry,
        row === 1 ? materials.void : materials.ivory,
        {
        name: `${side < 0 ? 'left' : 'right'} transforming war blade ${row + 1}`,
        scale: [bladeWidth, bladeLength, bladeDepth],
        },
      );
      ctx.mesh(pivot, edgeGeometry, materials.brass, {
        name: 'mechanical war blade gold edge',
        position: [0, 0, 0.038],
        scale: [bladeWidth, bladeLength, bladeDepth],
        castShadow: false,
      });
      ctx.mesh(pivot, edgeGeometry, materials.brass, {
        name: 'mechanical war blade mirrored gold edge',
        position: [0, 0, 0.039],
        scale: [-bladeWidth, bladeLength, bladeDepth],
        castShadow: false,
      });
      ctx.mesh(pivot, inlayGeometry, materials.brass, {
        name: 'mechanical war blade gold channel bed',
        position: [0, 0, 0.052],
        scale: [bladeWidth, bladeLength, bladeDepth],
        castShadow: false,
      });
      ctx.mesh(pivot, inlayGeometry, materials.violet, {
        name: 'mechanical war blade violet channel',
        position: [0, 0, 0.068],
        scale: [bladeWidth * 0.24, bladeLength * 0.72, bladeDepth],
        castShadow: false,
      });
      ornaments.push({ pivot, ornament, side, row });
    }
    const lowerPivot = ctx.joint(
      chest,
      `${side < 0 ? 'left' : 'right'} lower cannon-wing fang`,
      [side * 0.66, 0.34, -0.39],
      [0, 0, -side * 2.58],
    );
    ctx.mesh(lowerPivot, ornamentGeometry, materials.ivory, {
      name: `${side < 0 ? 'left' : 'right'} lower cannon-wing blade fang`,
      scale: [0.66, 0.94, 1.02],
    });
    ctx.mesh(lowerPivot, edgeGeometry, materials.brass, {
      name: `${side < 0 ? 'left' : 'right'} lower cannon-wing gold edge`,
      position: [0, 0, 0.038],
      scale: [0.66, 0.94, 1.02],
      castShadow: false,
    });
    ctx.mesh(lowerPivot, edgeGeometry, materials.brass, {
      name: `${side < 0 ? 'left' : 'right'} lower cannon-wing mirrored gold edge`,
      position: [0, 0, 0.039],
      scale: [-0.66, 0.94, 1.02],
      castShadow: false,
    });
    ctx.mesh(lowerPivot, inlayGeometry, materials.brass, {
      name: `${side < 0 ? 'left' : 'right'} lower cannon-wing gold channel bed`,
      position: [0, 0, 0.052],
      scale: [0.66, 0.94, 1.02],
      castShadow: false,
    });
    ctx.mesh(lowerPivot, inlayGeometry, materials.violet, {
      name: `${side < 0 ? 'left' : 'right'} lower cannon-wing violet channel`,
      position: [0, 0, 0.068],
      scale: [0.17, 0.72, 1.02],
      castShadow: false,
    });
  }
  return ornaments;
}

export function createBossRig() {
  const ctx = createRigContext();
  const { geometry, material, mesh, joint } = ctx;
  const porcelainDetail = ctx.addTexture(makeDetailTexture('porcelain', 5, 8));
  const vestmentDetail = ctx.addTexture(makeDetailTexture('fabric', 9, 15));
  const brassDetail = ctx.addTexture(makeDetailTexture('brushed', 5, 14));

  // Vespera is now a blackened war reliquary. Broad plates absorb light,
  // antique gold catches his silhouette, and violet is isolated to the core,
  // cannon apertures, and awakened blade machinery.
  const ivory = material('vesperaBlackenedGoldPlate', {
    color: 0x30231a,
    roughness: 0.37,
    metalness: 0.82,
    physical: true,
    clearcoat: 0.3,
    clearcoatRoughness: 0.24,
    bumpMap: brassDetail,
    bumpScale: 0.014,
    specularIntensity: 0.7,
    specularColor: 0xd9a95f,
  });
  const ivoryShadow = material('vesperaCharredBronzePlate', {
    color: 0x110d0e,
    roughness: 0.44,
    metalness: 0.75,
    physical: true,
    clearcoat: 0.2,
    clearcoatRoughness: 0.38,
    bumpMap: brassDetail,
    bumpScale: 0.022,
  });
  const boneMask = material('vesperaReliquaryBoneMask', {
    color: 0xb3a796,
    roughness: 0.54,
    metalness: 0.08,
    physical: true,
    clearcoat: 0.14,
    clearcoatRoughness: 0.48,
    bumpMap: porcelainDetail,
    bumpScale: 0.023,
    specularIntensity: 0.48,
    specularColor: 0xffe2b8,
  });
  const voidMaterial = material('vesperaVoid', {
    color: 0x05080d,
    roughness: 0.3,
    metalness: 0.76,
    bumpMap: brassDetail,
    bumpScale: 0.01,
    physical: true,
    clearcoat: 0.18,
    clearcoatRoughness: 0.24,
  });
  const blackCloth = material('vesperaBlackVestments', {
    color: 0x0d0a10,
    roughness: 0.79,
    metalness: 0.01,
    bumpMap: vestmentDetail,
    bumpScale: 0.04,
    physical: true,
    sheen: 0.45,
    sheenColor: 0x342238,
    sheenRoughness: 0.78,
    side: THREE.DoubleSide,
  });
  const mourningCloth = material('vesperaBlackNoonVestments', {
    color: 0x241434,
    roughness: 0.64,
    metalness: 0.035,
    emissive: 0x27073e,
    emissiveIntensity: 0.48,
    bumpMap: vestmentDetail,
    bumpScale: 0.045,
    physical: true,
    sheen: 0.68,
    sheenColor: 0x894bd2,
    sheenRoughness: 0.58,
    side: THREE.DoubleSide,
  });
  const eclipseEdge = material('vesperaBlackNoonEdge', {
    color: 0x522681,
    roughness: 0.38,
    metalness: 0.46,
    emissive: 0x26064f,
    emissiveIntensity: 1.08,
    physical: true,
    clearcoat: 0.38,
    clearcoatRoughness: 0.22,
  });
  const ivoryVestment = material('vesperaIvoryVestments', {
    color: 0x171119,
    roughness: 0.68,
    metalness: 0.025,
    bumpMap: vestmentDetail,
    bumpScale: 0.032,
    physical: true,
    sheen: 0.38,
    sheenColor: 0x5c3d63,
    sheenRoughness: 0.72,
    clearcoat: 0.12,
    clearcoatRoughness: 0.58,
    side: THREE.DoubleSide,
  });
  const brass = material('vesperaAgedBrass', {
    color: 0xc89d54,
    roughness: 0.34,
    metalness: 0.9,
    emissive: 0x321a05,
    emissiveIntensity: 0.44,
    physical: true,
    clearcoat: 0.34,
    clearcoatRoughness: 0.24,
    bumpMap: brassDetail,
    bumpScale: 0.014,
  });
  const telegraph = material('vesperaTelegraphLight', {
    color: 0xffe4a6,
    roughness: 0.16,
    metalness: 0.28,
    emissive: 0xf09b2d,
    emissiveIntensity: 1.8,
    physical: true,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
  });
  const violetCore = material('vesperaVioletCore', {
    color: 0xb985ff,
    roughness: 0.1,
    metalness: 0.34,
    emissive: 0x641de0,
    emissiveIntensity: 2.55,
    physical: true,
    clearcoat: 0.86,
    clearcoatRoughness: 0.06,
  });
  const shaft = material('vesperaSpearShaft', {
    color: 0x17171a,
    roughness: 0.24,
    metalness: 0.88,
    bumpMap: brassDetail,
    bumpScale: 0.012,
  });
  const seamHousing = material('vesperaSeamHousing', {
    color: 0x4c4334,
    roughness: 0.58,
    metalness: 0.62,
  });
  // Depth-only broad forms replace tens of thousands of decorative shadow
  // triangles. They draw no colour or depth into the beauty pass, but the key
  // light still receives Vespera's articulated combat silhouette.
  const shadowProxy = material('vesperaShadowProxy', {
    color: 0x000000,
    roughness: 1,
    metalness: 0,
    colorWrite: false,
    depthWrite: false,
  }, false);

  const group = joint(null, 'Saint Vespera — boss rig');
  group.userData.character = 'Saint Vespera';
  group.userData.forward = '+Z';
  // Vespera owns more screen space without changing the simulation's
  // collision radii or phase-three flight path.
  group.scale.set(1.14, 1.25, 1.14);
  const body = joint(group, 'Vespera motion root', [0, 0.035, 0]);
  const pelvis = joint(body, 'Vespera pelvis', [0, 1.15, 0]);
  const spine = joint(pelvis, 'Vespera spine', [0, 0.22, 0]);
  const chest = joint(spine, 'Vespera chest', [0, 0.4, 0]);
  const neck = joint(chest, 'Vespera neck', [0, 0.37, 0]);
  const head = joint(neck, 'Vespera head', [0, 0.245, 0]);
  const shellPivot = joint(chest, 'Vespera presentation-only reliquary shell');
  shellPivot.scale.set(1.19, 1.09, 1.16);
  // Head scale is presentation-only: the core, weapon, cannon muzzles, orbit,
  // and collision assumptions remain on their existing authoritative joints.
  // The taller hood makes the far-rail silhouette read as a commander rather
  // than a player-sized duplicate.
  head.scale.set(1.1, 1.14, 1.08);

  // The porcelain pieces are tailored shells over a continuous vestment body,
  // not disconnected capsules. Their profiles deliberately overlap so the
  // silhouette reads as one carved reliquary even at close camera distances.
  const pelvisShellGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.2, 0.17, 0.135], [-0.14, 0.29, 0.215], [-0.03, 0.355, 0.255],
    [0.1, 0.34, 0.235], [0.2, 0.25, 0.175], [0.25, 0.16, 0.12],
  ], 36));
  mesh(pelvis, pelvisShellGeometry, voidMaterial, {
    name: 'carved reliquary pelvis',
    position: [0, -0.015, 0],
  });
  const waistShellGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.19, 0.25, 0.18], [-0.1, 0.275, 0.19], [0.02, 0.26, 0.175],
    [0.15, 0.285, 0.18], [0.27, 0.335, 0.205], [0.32, 0.27, 0.17],
  ], 36));
  mesh(spine, waistShellGeometry, blackCloth, {
    name: 'concave black reliquary waist',
  });
  const cathedralTorsoGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.42, 0.265, 0.182], [-0.31, 0.348, 0.225], [-0.17, 0.455, 0.265],
    [0.015, 0.515, 0.3], [0.18, 0.53, 0.292], [0.325, 0.462, 0.245],
    [0.42, 0.285, 0.162],
  ], 44));
  mesh(shellPivot, cathedralTorsoGeometry, ivory, {
    name: 'continuous blackened-gold cathedral cuirass',
    position: [0, -0.01, -0.008],
  });

  const sternumGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.185, height: 0.28, depth: 0.052, jaw: 0.58, crown: 0.82, face: 0.006,
  }));
  mesh(shellPivot, sternumGeometry, voidMaterial, {
    name: 'recessed sternum reliquary',
    position: [0, -0.055, 0.272],
  });
  const clockHandGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.025, -0.24, 0.329], [-0.006, -0.06, 0.337], [0.035, 0.205, 0.32],
  ], 0.017, 24, 8));
  mesh(shellPivot, clockHandGeometry, brass, {
    name: 'sternum clock hand',
    rotation: [0, 0, -0.08],
  });
  const sternumRimLeft = ctx.addGeometry(makeTubeGeometry([
    [-0.105, 0.2, 0.318], [-0.155, 0.055, 0.33], [-0.13, -0.15, 0.322], [-0.055, -0.275, 0.305],
  ], 0.012, 28, 7));
  const sternumRimRight = ctx.addGeometry(makeTubeGeometry([
    [0.105, 0.2, 0.318], [0.155, 0.055, 0.33], [0.13, -0.15, 0.322], [0.055, -0.275, 0.305],
  ], 0.012, 28, 7));
  mesh(shellPivot, sternumRimLeft, brass, { name: 'left sternum filigree', castShadow: false });
  mesh(shellPivot, sternumRimRight, brass, { name: 'right sternum filigree', castShadow: false });
  const core = mesh(chest, geometry.octa, violetCore, {
    name: 'Vespera exposed violet hour core',
    position: [0, 0.09, 0.365],
    rotation: [0, 0, Math.PI * 0.25],
    scale: [0.19, 0.21, 0.085],
    castShadow: false,
  });
  core.userData.isCore = true;
  const leftGimbalGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.018, 0.275, 0.345], [-0.135, 0.235, 0.351], [-0.195, 0.1, 0.354], [-0.14, -0.045, 0.349],
  ], 0.018, 30, 8));
  const rightGimbalGeometry = ctx.addGeometry(makeTubeGeometry([
    [0.02, -0.092, 0.345], [0.14, -0.045, 0.35], [0.195, 0.1, 0.354], [0.13, 0.238, 0.35],
  ], 0.014, 28, 8));
  mesh(chest, leftGimbalGeometry, brass, { name: 'broken left core gimbal' });
  mesh(chest, rightGimbalGeometry, brass, { name: 'broken right core gimbal' });
  for (const [x, y, scale] of [[-.19, .1, .055], [.19, .1, .047], [0, .278, .042], [0, -.09, .038]]) {
    mesh(chest, geometry.octa, brass, {
      name: 'gimbal bezel tooth',
      position: [x, y, .353],
      scale: [scale, scale * 1.35, scale * .55],
    });
  }
  for (const side of [-1, 1]) {
    const breastTracery = ctx.addGeometry(makeTubeGeometry([
      [0, 0.245, 0.346], [side * 0.12, 0.205, 0.355],
      [side * 0.255, 0.075, 0.35], [side * 0.29, -0.095, 0.333],
      [side * 0.17, -0.245, 0.314], [side * 0.035, -0.31, 0.302],
    ], 0.016, 34, 7));
    mesh(shellPivot, breastTracery, brass, {
      name: `${side < 0 ? 'left' : 'right'} cathedral breast filigree`,
      castShadow: false,
    });
    const branchTracery = ctx.addGeometry(makeTubeGeometry([
      [side * 0.275, 0.14, 0.351], [side * 0.36, 0.205, 0.325],
      [side * 0.43, 0.285, 0.255], [side * 0.49, 0.24, 0.16],
    ], 0.012, 24, 6));
    mesh(shellPivot, branchTracery, brass, {
      name: `${side < 0 ? 'left' : 'right'} mantle gold branch`,
      castShadow: false,
    });
  }

  // Three overlapping lamellae articulate the cuirass at gameplay distance.
  // Dark gaskets remain visible through impact flashes, and the damaged left
  // side is deliberately less complete rather than becoming a mirrored shell.
  const ribPlateGeometry = ctx.addGeometry(makeShapeGeometry([
    [0.018, 0.13], [0.145, 0.18], [0.305, 0.09], [0.235, 0.01],
    [0.31, -0.08], [0.17, -0.15], [0.025, -0.092],
  ], 0.038, 0.009));
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      const size = 1 - row * .145;
      const damaged = side < 0;
      mesh(shellPivot, ribPlateGeometry, damaged && row === 0 ? voidMaterial : brass, {
        name: `${side < 0 ? 'left' : 'right'} rib ${damaged && row === 0 ? 'dark break' : 'gilded underplate'} ${row + 1}`,
        position: [side * (0.004 + row * .022), 0.17 - row * .165, 0.302 + row * .007],
        rotation: [0, side * .025, side * (damaged ? -.075 - row * .035 : .035 + row * .02)],
        scale: [side * size * 1.25, size * 1.1, 1],
      });
      // The damaged side has lost its entire outer plate; the exposed gasket
      // is a readable missing mass instead of three subtly misaligned chips.
      if (!(damaged && row === 0)) {
        mesh(shellPivot, ribPlateGeometry, damaged ? ivoryShadow : ivory, {
          name: `${side < 0 ? 'broken left' : 'intact right'} porcelain rib ${row + 1}`,
          position: [side * (0.014 + row * .03), 0.175 - row * .165 - (damaged ? .018 : 0), 0.332 + row * .009],
          rotation: [0, side * .035, side * (damaged ? -.13 - row * .045 : .045 + row * .018)],
          scale: [side * size * (damaged ? .88 : 1.06), size * (damaged ? .92 : 1.04), 1],
        });
      }
    }
  }

  // Wide fluted mantle plus pinched waist gives Vespera a cathedral-bell
  // silhouette without the old pair of visibly squashed spheres.
  const mantleGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.12, 0.12, 0.105], [-0.065, 0.245, 0.195], [0.005, 0.35, 0.25],
    [0.08, 0.34, 0.24], [0.155, 0.215, 0.15], [0.215, 0.045, 0.035],
  ], 38));
  mesh(shellPivot, mantleGeometry, ivoryShadow, {
    name: 'left fluted cathedral mantle',
    position: [-0.5, 0.17, -0.02],
    rotation: [0.06, -0.09, 0.19],
    scale: [1.28, 1.14, 1.08],
  });
  mesh(shellPivot, mantleGeometry, ivory, {
    name: 'right fluted cathedral mantle',
    position: [0.51, 0.21, -0.015],
    rotation: [0.04, 0.06, -0.13],
    scale: [1.28, 1.14, 1.08],
  });
  const mantleFaceGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.225, 0.09], [-0.075, 0.17], [0.13, 0.13], [0.25, 0.035],
    [0.18, -0.095], [-0.055, -0.14], [-0.23, -0.045],
  ], 0.05, 0.014));
  mesh(shellPivot, mantleFaceGeometry, ivory, {
    name: 'left layered cathedral mantle face',
    position: [-0.5, 0.18, 0.225],
    rotation: [0.025, -0.075, -0.12],
    scale: [1.32, 1.14, 1.1],
  });
  mesh(shellPivot, mantleFaceGeometry, ivoryShadow, {
    name: 'right layered cathedral mantle face',
    position: [0.51, 0.215, 0.225],
    rotation: [0.015, 0.04, 0.055],
    scale: [1.32, 1.14, 1.1],
  });
  mesh(shellPivot, mantleFaceGeometry, ivory, {
    name: 'right nested mantle reliquary plate',
    position: [0.438, 0.215, 0.273],
    rotation: [0.02, 0.045, 0.085],
    scale: [0.76, 0.75, 0.86],
  });
  const leftCollarRecess = ctx.addGeometry(makeTubeGeometry([
    [-0.56, 0.325, -0.06], [-0.455, 0.39, 0.13], [-0.27, 0.42, 0.255], [-0.075, 0.39, 0.3],
  ], 0.06, 30, 10));
  const rightCollarRecess = ctx.addGeometry(makeTubeGeometry([
    [0.075, 0.39, 0.3], [0.27, 0.42, 0.255], [0.455, 0.39, 0.13], [0.56, 0.325, -0.06],
  ], 0.052, 30, 10));
  mesh(shellPivot, leftCollarRecess, voidMaterial, { name: 'segmented left black collar recess' });
  mesh(shellPivot, rightCollarRecess, voidMaterial, { name: 'segmented right black collar recess' });
  for (const side of [-1, 1]) {
    const mantleFlute = ctx.addGeometry(makeTubeGeometry([
      [side * 0.34, 0.16, 0.25], [side * 0.47, 0.22, 0.255], [side * 0.59, 0.18, 0.18],
    ], 0.018, 22, 7));
    mesh(shellPivot, mantleFlute, brass, {
      name: `${side < 0 ? 'left' : 'right'} mantle flute`,
      castShadow: false,
    });
  }
  const finialGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.055, -0.19], [0.055, -0.19], [0.09, -0.025], [0.035, 0.095],
    [0.11, 0.2], [0, 0.47], [-0.11, 0.2], [-0.035, 0.095], [-0.09, -0.025],
  ], 0.055, 0.01));
  for (const side of [-1, 1]) {
    const damaged = side < 0;
    const rotation = side < 0 ? 0.37 : -0.31;
    mesh(shellPivot, finialGeometry, voidMaterial, {
      name: `${damaged ? 'broken left' : 'intact right'} finial backing`,
      position: [side * (damaged ? .595 : .65), damaged ? .285 : .345, -0.04],
      rotation: [0, 0, rotation],
      scale: [damaged ? .82 : 1.16, damaged ? .76 : 1.16, 1.12],
    });
    mesh(shellPivot, finialGeometry, brass, {
      name: `${damaged ? 'broken left' : 'intact right'} clock-hand finial`,
      position: [side * (damaged ? .595 : .65), damaged ? .285 : .345, 0.012],
      rotation: [0, 0, rotation],
      scale: [damaged ? .63 : .96, damaged ? .58 : .99, .8],
    });
  }

  const headVoidGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.31, height: 0.395, depth: 0.25, jaw: 0.66, crown: 1.24,
  }));
  mesh(head, headVoidGeometry, voidMaterial, {
    name: 'lightless hood cavity',
    position: [0, 0.035, -0.06],
  });
  const hoodSideGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.39, 0.4], [-0.07, 0.5], [-0.145, 0.29], [-0.195, -0.19],
    [-0.32, -0.43], [-0.45, -0.23], [-0.48, 0.1],
  ], 0.085, 0.014));
  mesh(head, hoodSideGeometry, blackCloth, {
    name: 'left deep reliquary hood fold',
    position: [0.005, 0.02, 0.075],
    rotation: [0.015, -0.05, -0.02],
  });
  mesh(head, hoodSideGeometry, blackCloth, {
    name: 'right deep reliquary hood fold',
    position: [-0.005, 0.02, 0.075],
    rotation: [0.015, 0.05, 0.02],
    scale: [-1, 1, 1],
  });
  const hoodBrowGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.32, 0.18], [-0.145, 0.41], [0, 0.56], [0.145, 0.41], [0.32, 0.18],
    [0.16, 0.235], [0, 0.335], [-0.16, 0.235],
  ], 0.08, 0.012));
  mesh(head, hoodBrowGeometry, ivoryShadow, {
    name: 'armoured pointed hood brow',
    position: [0, 0.015, 0.085],
    rotation: [0.03, 0, 0],
  });
  const hoodRimLeft = ctx.addGeometry(makeTubeGeometry([
    [0, 0.56, 0.178], [-0.16, 0.41, 0.192], [-0.285, 0.16, 0.192], [-0.3, -0.16, 0.175], [-0.2, -0.38, 0.15],
  ], 0.016, 32, 7));
  const hoodRimRight = ctx.addGeometry(makeTubeGeometry([
    [0, 0.56, 0.178], [0.16, 0.41, 0.192], [0.285, 0.16, 0.192], [0.3, -0.16, 0.175], [0.2, -0.38, 0.15],
  ], 0.016, 32, 7));
  mesh(head, hoodRimLeft, brass, { name: 'left gilded hood rim', castShadow: false });
  mesh(head, hoodRimRight, brass, { name: 'right gilded hood rim', castShadow: false });
  const hoodDrapeGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: .56, length: .66, taper: -.04, flare: .32, curl: .14,
    wrap: .09, sway: .015, hem: .065, folds: 5, foldDepth: .028,
    segmentsX: 12, segmentsY: 16,
  }));
  mesh(neck, hoodDrapeGeometry, blackCloth, {
    name: 'deep hood rear cowl',
    position: [0, .19, -.14],
    rotation: [.03, Math.PI, 0],
  });
  addPanelPiping(ctx, neck, brass, [
    [-.22, .17, -.075], [-.26, -.04, -.11], [-.24, -.3, -.18],
  ], 'left hood cowl edge', .008);
  addPanelPiping(ctx, neck, brass, [
    [.22, .17, -.075], [.26, -.04, -.11], [.24, -.3, -.18],
  ], 'right hood cowl edge', .008);
  // The bone face is deliberately shallow. The previous mask projected far
  // enough to bury its own eye sockets, nasal void and teeth, collapsing to a
  // white teardrop at gameplay distance. These dark features now sit clearly
  // in front of a wider cranium and pinched maxilla.
  const maskGeometry = ctx.addGeometry(makeSculptedHeadGeometry({
    width: 0.17, height: 0.29, depth: 0.052, jaw: 0.43, crown: 1.05, face: 0.008,
  }));
  mesh(head, maskGeometry, boneMask, {
    name: 'skeletal reliquary judgement mask',
    position: [0, -0.008, 0.19],
    rotation: [0.015, 0, 0],
    scale: [1, 1, 0.96],
  });
  for (const side of [-1, 1]) {
    mesh(head, geometry.sphere, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} skeletal eye socket`,
      position: [side * 0.067, 0.064, 0.263],
      rotation: [0, side * -.08, side * -.04],
      scale: [0.108, 0.082, 0.028],
      castShadow: false,
    });
    mesh(head, geometry.sphere, violetCore, {
      name: `${side < 0 ? 'left' : 'right'} violet judgement eye`,
      position: [side * 0.067, 0.061, 0.278],
      scale: [0.02, 0.017, 0.007],
      castShadow: false,
    });
    mesh(head, geometry.sphere, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} skull temporal fossa`,
      position: [side * 0.126, -0.018, 0.258],
      rotation: [0, side * -0.12, side * 0.1],
      scale: [0.058, 0.13, 0.025],
      castShadow: false,
    });
  }
  const noseRidgeGeometry = ctx.addGeometry(makeTubeGeometry([
    [0, 0.045, 0.266], [-0.008, -0.035, 0.272], [0.012, -0.115, 0.259],
  ], 0.012, 18, 7));
  mesh(head, noseRidgeGeometry, boneMask, { name: 'skeletal mask nose ridge', castShadow: false });
  const noseVoidGeometry = ctx.addGeometry(makeShapeGeometry([
    [0, 0.045], [0.038, -0.04], [0.018, -0.09], [0, -0.075], [-0.018, -0.09], [-0.038, -0.04],
  ], 0.014, 0.002));
  mesh(head, noseVoidGeometry, voidMaterial, {
    name: 'triangular nasal void',
    position: [0, -0.068, 0.279],
    scale: [1.28, 1.34, 1.2],
    castShadow: false,
  });
  const mouthCleftGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.076, -0.154, 0.267], [0, -0.177, 0.276], [0.076, -0.154, 0.267],
  ], 0.013, 14, 6));
  mesh(head, mouthCleftGeometry, voidMaterial, { name: 'skeletal mouth cleft', castShadow: false });
  for (let tooth = -2; tooth <= 2; tooth += 1) {
    mesh(head, geometry.box, voidMaterial, {
      name: `skeletal tooth division ${tooth + 3}`,
      position: [tooth * .026, -0.181 + Math.abs(tooth) * .002, .282],
      rotation: [0, 0, tooth * -.012],
      scale: [.006, .038 - Math.abs(tooth) * .002, .008],
      castShadow: false,
    });
  }
  for (const side of [-1, 1]) {
    const cheekVoidGeometry = ctx.addGeometry(makeShapeGeometry([
      [0, 0.04], [side * 0.07, 0.025], [side * 0.105, -0.045],
      [side * 0.07, -0.105], [side * 0.018, -0.075],
    ], 0.012, 0.0015));
    mesh(head, cheekVoidGeometry, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} skeletal cheek hollow`,
      position: [side * 0.043, -0.072, 0.275],
      scale: [1.72, 1.72, 1.15],
      castShadow: false,
    });
    mesh(head, geometry.sphere, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} broad maxilla void`,
      position: [side * 0.093, -0.095, 0.274],
      rotation: [0, side * -0.12, side * 0.12],
      scale: [0.072, 0.1, 0.018],
      castShadow: false,
    });
    const cheekArcGeometry = ctx.addGeometry(makeTubeGeometry([
      [side * 0.025, -0.035, 0.282], [side * 0.09, -0.075, 0.281],
      [side * 0.115, -0.14, 0.269], [side * 0.075, -0.205, 0.248],
    ], 0.009, 18, 6));
    mesh(head, cheekArcGeometry, boneMask, {
      name: `${side < 0 ? 'left' : 'right'} skeletal cheekbone ridge`,
      castShadow: false,
    });
  }
  const maskFractureGeometry = ctx.addGeometry(makeTubeGeometry([
    [-0.11, 0.16, 0.258], [-0.075, 0.115, 0.274], [-0.102, 0.045, 0.272], [-0.068, -0.02, 0.277],
  ], 0.008, 18, 6));
  mesh(head, maskFractureGeometry, brass, { name: 'gilded mask fracture', castShadow: false });
  const secondaryFractureGeometry = ctx.addGeometry(makeTubeGeometry([
    [0.105, -0.015, 0.273], [0.128, -0.07, 0.268], [0.102, -0.125, 0.258], [0.13, -0.16, 0.248],
  ], 0.0055, 16, 5));
  mesh(head, secondaryFractureGeometry, brass, { name: 'short right mask fracture', castShadow: false });
  const crownNeedleGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.1, 0.06, 0.05], [0.02, 0.095, 0.078], [0.19, 0.06, 0.05],
    [0.4, 0.022, 0.019], [0.58, 0.003, 0.003],
  ], 22));
  mesh(head, crownNeedleGeometry, brass, {
    name: 'hood crown execution needle',
    position: [0, 0.34, -0.055],
  });

  // Twin shoulder reliquaries give the ranged phase a physical source. Their
  // apertures and iris doors remain visual children of the presentation shell,
  // so recoil never moves the combat body's authoritative markers.
  const shoulderCannons = [];
  const cannonFinGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.145, -0.1], [-0.035, 0.02], [0.025, 0.64], [0.115, 0.18], [0.255, -0.06], [0, -0.15],
  ], 0.045, 0.008));
  const cannonDoorGeometry = ctx.addGeometry(makeShapeGeometry([
    [-0.135, -0.01], [-0.075, 0.095], [-0.04, 0.17], [0, 0.245],
    [0.04, 0.17], [0.075, 0.095], [0.135, -0.01], [0.055, -0.09], [-0.055, -0.09],
  ], 0.032, 0.006));
  for (const side of [-1, 1]) {
    const pivot = joint(shellPivot,
      `${side < 0 ? 'left' : 'right'} shoulder cannon reliquary`,
      [side * 0.69, 0.5, -0.075], [-0.08, side * -0.08, side * -0.08]);
    mesh(pivot, geometry.cylinder, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} cannon main housing`,
      position: [0, 0, -0.015],
      rotation: [HALF_PI, 0, 0],
      scale: [0.46, 0.76, 0.46],
    });
    mesh(pivot, geometry.cylinder, ivory, {
      name: `${side < 0 ? 'left' : 'right'} cannon rear turbine`,
      position: [0, 0, -0.255],
      rotation: [HALF_PI, 0, 0],
      scale: [0.49, 0.38, 0.49],
    });
    for (const [z, scale] of [[-0.41, .62], [-0.15, .59], [.295, .56]]) {
      mesh(pivot, geometry.torus, brass, {
        name: `${side < 0 ? 'left' : 'right'} cannon gold compression ring`,
        position: [0, 0, z],
        scale: [scale, scale, scale * .7],
      });
    }
    mesh(pivot, geometry.cylinder, violetCore, {
      name: `${side < 0 ? 'left' : 'right'} cannon violet aperture`,
      position: [0, 0, 0.385],
      rotation: [HALF_PI, 0, 0],
      scale: [0.34, 0.028, 0.34],
      castShadow: false,
    });
    mesh(pivot, geometry.torus, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} cannon aperture lip`,
      position: [0, 0, .4],
      scale: [.53, .53, .34],
    });
    const muzzle = joint(
      pivot,
      `${side < 0 ? 'left' : 'right'} shoulder missile muzzle`,
      [0, 0, .52],
    );
    muzzle.userData.isMissileMuzzle = true;
    const upperDoor = joint(pivot, `${side < 0 ? 'left' : 'right'} cannon upper iris`, [0, .145, .415]);
    const lowerDoor = joint(pivot, `${side < 0 ? 'left' : 'right'} cannon lower iris`, [0, -.145, .415], [0, 0, Math.PI]);
    mesh(upperDoor, cannonDoorGeometry, ivory, {
      name: 'blackened upper missile iris',
      position: [0, .02, 0],
      scale: [1.03, 1.03, .9],
    });
    mesh(lowerDoor, cannonDoorGeometry, ivoryShadow, {
      name: 'charred lower missile iris',
      position: [0, .02, 0],
      scale: [1.03, 1.03, .9],
    });
    mesh(pivot, geometry.cylinder, violetCore, {
      name: `${side < 0 ? 'left' : 'right'} visible violet cannon lens`,
      position: [0, 0, .456],
      rotation: [HALF_PI, 0, 0],
      scale: [.27, .024, .27],
      castShadow: false,
    });
    mesh(pivot, geometry.torus, brass, {
      name: `${side < 0 ? 'left' : 'right'} cannon lens inner bezel`,
      position: [0, 0, .477],
      scale: [.4, .4, .2],
      castShadow: false,
    });
    for (const finSide of [-1, 1]) {
      const outer = finSide === side;
      mesh(pivot, cannonFinGeometry, finSide < 0 ? ivoryShadow : ivory, {
        name: `${side < 0 ? 'left' : 'right'} cannon ${finSide < 0 ? 'inner' : 'outer'} crown fin`,
        position: [finSide * (outer ? .2 : .16), .17, -.16],
        rotation: [0, finSide * .16, finSide * (outer ? -.32 : -.22)],
        scale: [finSide * (outer ? 1.22 : 0.98), outer ? 1.62 : 1.38, 1.04],
      });
      const finInlay = ctx.addGeometry(makeTubeGeometry([
        [finSide * .08, .09, -.065], [finSide * .12, .21, -.06], [finSide * .16, .31, -.075],
      ], .008, 16, 5));
      mesh(pivot, finInlay, brass, {
        name: `${side < 0 ? 'left' : 'right'} cannon fin gold vein`,
        castShadow: false,
      });
    }
    shoulderCannons.push({ pivot, upperDoor, lowerDoor, muzzle, side });
  }
  group.userData.shoulderCannons = shoulderCannons.length;

  const leftShoulder = joint(chest, 'Vespera left shoulder', [-0.47, 0.17, 0], [-0.04, 0, -0.06]);
  const leftElbow = joint(leftShoulder, 'Vespera left elbow', [0, -0.45, 0], [-0.22, 0, 0]);
  const leftHand = joint(leftElbow, 'Vespera left hand', [0, -0.4, 0]);
  const rightShoulder = joint(chest, 'Vespera right shoulder', [0.47, 0.17, 0], [-0.02, 0, 0.05]);
  const rightElbow = joint(rightShoulder, 'Vespera right elbow', [0, -0.45, 0], [-0.2, 0, 0]);
  const rightHand = joint(rightElbow, 'Vespera right hand', [0, -0.4, 0]);

  const porcelainForearmGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.035, 0.105, 0.105], [0.005, 0.14, 0.135], [-0.12, 0.145, 0.14],
    [-0.25, 0.115, 0.105], [-0.35, 0.082, 0.075], [-0.405, 0.057, 0.05],
  ], 30));
  const upperArmPlateGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.04, 0.18, 0.16], [0, 0.205, 0.18], [-0.12, 0.19, 0.17],
    [-0.28, 0.145, 0.13], [-0.38, 0.1, 0.09],
  ], 30));
  for (const [side, shoulder, elbow, handJoint] of [
    [-1, leftShoulder, leftElbow, leftHand],
    [1, rightShoulder, rightElbow, rightHand],
  ]) {
    mesh(shoulder, upperArmPlateGeometry, side < 0 ? ivoryShadow : ivory, {
      name: `${side < 0 ? 'left' : 'right'} layered cathedral upper-arm shell`,
      position: [0, -0.02, 0.02],
      rotation: [0, 0, side * 0.04],
      scale: [1.1, 1.06, 1.08],
    });
    mesh(elbow, porcelainForearmGeometry, side < 0 ? ivoryShadow : ivory, {
      name: `${side < 0 ? 'left' : 'right'} tapered porcelain forearm shell`,
      scale: [1.06, 1.03, 1.06],
    });
    mesh(elbow, geometry.cone, brass, {
      name: `${side < 0 ? 'left' : 'right'} elbow thorn`,
      position: [side * 0.115, -0.025, -0.025],
      rotation: [0, 0, side * -HALF_PI],
      scale: [0.065, 0.255, 0.065],
    });
    mesh(elbow, geometry.torus, brass, {
      name: `${side < 0 ? 'left' : 'right'} articulated wrist ring`,
      position: [0, -0.375, 0],
      rotation: [HALF_PI, 0, 0],
      scale: [0.19, 0.19, 0.15],
    });
    const forearmInlay = ctx.addGeometry(makeTubeGeometry([
      [0, -0.035, 0.142], [side * 0.012, -0.17, 0.13], [0, -0.31, 0.085],
    ], 0.009, 18, 6));
    mesh(elbow, forearmInlay, brass, {
      name: `${side < 0 ? 'left' : 'right'} forearm inlay`,
      castShadow: false,
    });
    buildDetailedHand(ctx, handJoint, { hand: voidMaterial, accent: brass }, side,
      `${side < 0 ? 'left' : 'right'} reliquary hand`, 1.06);
  }

  const leftHip = joint(pelvis, 'Vespera left hip', [-0.21, -0.07, 0]);
  const leftKnee = joint(leftHip, 'Vespera left knee', [0, -0.55, 0]);
  const leftAnkle = joint(leftKnee, 'Vespera left ankle', [0, -0.5, 0]);
  const rightHip = joint(pelvis, 'Vespera right hip', [0.21, -0.07, 0]);
  const rightKnee = joint(rightHip, 'Vespera right knee', [0, -0.55, 0]);
  const rightAnkle = joint(rightKnee, 'Vespera right ankle', [0, -0.5, 0]);
  const porcelainGreaveGeometry = ctx.addGeometry(makeOrganicGeometry([
    [0.045, 0.135, 0.14], [0.005, 0.165, 0.17], [-0.1, 0.15, 0.155],
    [-0.25, 0.13, 0.125], [-0.4, 0.1, 0.092], [-0.49, 0.071, 0.065],
  ], 30));
  const reliquaryFootGeometry = ctx.addGeometry(makeOrganicGeometry([
    [-0.1, 0.08, 0.065], [0.015, 0.14, 0.105], [0.14, 0.15, 0.1],
    [0.3, 0.105, 0.065], [0.41, 0.014, 0.012],
  ], 30));
  for (const [side, hip, knee, ankle] of [
    [-1, leftHip, leftKnee, leftAnkle],
    [1, rightHip, rightKnee, rightAnkle],
  ]) {
    mesh(knee, geometry.torus, brass, {
      name: `${side < 0 ? 'left' : 'right'} clockwork knee`,
      position: [0, 0.005, 0.125],
      scale: [0.27, 0.24, 0.24],
    });
    mesh(knee, geometry.octa, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} knee spindle`,
      position: [0, 0.005, 0.132],
      scale: [0.085, 0.085, 0.052],
    });
    mesh(knee, porcelainGreaveGeometry, side < 0 ? ivory : ivoryShadow, {
      name: `${side < 0 ? 'left' : 'right'} tapered porcelain greave`,
    });
    mesh(ankle, reliquaryFootGeometry, voidMaterial, {
      name: `${side < 0 ? 'left' : 'right'} sculpted reliquary foot`,
      position: [0, -0.06, 0.025],
      rotation: [HALF_PI, 0, side * 0.018],
    });
    mesh(ankle, geometry.sphere, blackCloth, {
      name: `${side < 0 ? 'left' : 'right'} grounded reliquary heel`,
      position: [0, -0.115, -0.025],
      scale: [0.125, 0.045, 0.105],
    });
    const footCrestGeometry = ctx.addGeometry(makeTubeGeometry([
      [0, -0.006, 0.1], [side * 0.008, -0.012, 0.23], [0, -0.035, 0.345],
    ], 0.013, 20, 7));
    mesh(ankle, footCrestGeometry, side < 0 ? ivoryShadow : ivory, {
      name: `${side < 0 ? 'left' : 'right'} porcelain foot crest`,
      castShadow: false,
    });
    const shinInlay = ctx.addGeometry(makeTubeGeometry([
      [0, -0.045, 0.16], [side * 0.012, -0.2, 0.145], [0, -0.405, 0.09],
    ], 0.009, 20, 6));
    mesh(knee, shinInlay, brass, {
      name: `${side < 0 ? 'left' : 'right'} greave inlay`,
      castShadow: false,
    });
  }

  // A single skeleton deforms the continuous vestment beneath the porcelain.
  // This removes daylight through elbows/hips and gives every attack an
  // unbroken anatomical line while retaining the existing procedural poses.
  const bossSkinBones = [
    pelvis, spine, chest, neck, head,
    leftShoulder, leftElbow, leftHand, rightShoulder, rightElbow, rightHand,
    leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle,
  ];
  group.updateMatrixWorld(true);
  const bossSkinSkeleton = ctx.addSkeleton(new THREE.Skeleton(bossSkinBones));
  const bossBoneIndex = Object.fromEntries(bossSkinBones.map((bone, index) => [bone.name, index]));
  const vestmentTorsoGeometry = ctx.addGeometry(makeSkinnedOrganicGeometry([
    [0, 0.98, 0, 0.105, 0.085, bossBoneIndex['Vespera pelvis']],
    [0, 1.08, 0, 0.285, 0.2, bossBoneIndex['Vespera pelvis']],
    [0, 1.21, 0, 0.365, 0.245, bossBoneIndex['Vespera pelvis']],
    [0, 1.36, 0, 0.275, 0.18, bossBoneIndex['Vespera pelvis'], bossBoneIndex['Vespera spine'], 0.55],
    [0, 1.5, 0, 0.32, 0.2, bossBoneIndex['Vespera spine']],
    [0, 1.68, 0, 0.39, 0.23, bossBoneIndex['Vespera spine'], bossBoneIndex['Vespera chest'], 0.62],
    [0, 1.86, 0, 0.475, 0.27, bossBoneIndex['Vespera chest']],
    [0, 2.04, 0, 0.425, 0.23, bossBoneIndex['Vespera chest']],
    [0, 2.17, 0, 0.22, 0.14, bossBoneIndex['Vespera chest'], bossBoneIndex['Vespera neck'], 0.55],
    [0, 2.26, 0, 0.105, 0.085, bossBoneIndex['Vespera neck']],
  ], 36));
  ctx.skinnedMesh(group, vestmentTorsoGeometry, blackCloth, bossSkinSkeleton, {
    name: 'continuous cathedral vestment torso',
  });

  for (const [side, shoulderName, elbowName, handName] of [
    [-1, 'Vespera left shoulder', 'Vespera left elbow', 'Vespera left hand'],
    [1, 'Vespera right shoulder', 'Vespera right elbow', 'Vespera right hand'],
  ]) {
    const armX = side * 0.47;
    const vestmentArmGeometry = ctx.addGeometry(makeSkinnedOrganicGeometry([
      [armX, 2.02, 0, 0.06, 0.065, bossBoneIndex[shoulderName]],
      [armX, 1.96, 0, 0.16, 0.165, bossBoneIndex[shoulderName]],
      [armX, 1.8, 0, 0.155, 0.16, bossBoneIndex[shoulderName]],
      [armX, 1.63, 0.01, 0.13, 0.135, bossBoneIndex[shoulderName], bossBoneIndex[elbowName], 0.44],
      [armX, 1.52, 0.02, 0.12, 0.125, bossBoneIndex[elbowName]],
      [armX, 1.37, 0.035, 0.11, 0.112, bossBoneIndex[elbowName]],
      [armX, 1.2, 0.055, 0.085, 0.082, bossBoneIndex[elbowName], bossBoneIndex[handName], 0.52],
      [armX, 1.1, 0.07, 0.06, 0.055, bossBoneIndex[handName]],
    ], 26));
    ctx.skinnedMesh(group, vestmentArmGeometry, blackCloth, bossSkinSkeleton, {
      name: `${side < 0 ? 'left' : 'right'} continuous vestment arm`,
    });
  }

  for (const [side, hipName, kneeName, ankleName] of [
    [-1, 'Vespera left hip', 'Vespera left knee', 'Vespera left ankle'],
    [1, 'Vespera right hip', 'Vespera right knee', 'Vespera right ankle'],
  ]) {
    const legX = side * 0.21;
    const vestmentLegGeometry = ctx.addGeometry(makeSkinnedOrganicGeometry([
      [legX, 1.2, 0, 0.07, 0.075, bossBoneIndex[hipName]],
      [legX, 1.12, 0, 0.17, 0.175, bossBoneIndex[hipName]],
      [legX, 0.94, 0, 0.18, 0.18, bossBoneIndex[hipName]],
      [legX, 0.75, 0.01, 0.155, 0.155, bossBoneIndex[hipName], bossBoneIndex[kneeName], 0.48],
      [legX, 0.61, 0.02, 0.13, 0.135, bossBoneIndex[kneeName]],
      [legX, 0.43, 0.01, 0.125, 0.125, bossBoneIndex[kneeName]],
      [legX, 0.23, 0, 0.1, 0.095, bossBoneIndex[kneeName]],
      [legX, 0.08, 0, 0.075, 0.068, bossBoneIndex[kneeName], bossBoneIndex[ankleName], 0.52],
      [legX, 0.025, 0, 0.06, 0.052, bossBoneIndex[ankleName]],
    ], 28));
    ctx.skinnedMesh(group, vestmentLegGeometry, blackCloth, bossSkinSkeleton, {
      name: `${side < 0 ? 'left' : 'right'} continuous vestment leg`,
    });
  }

  const frontLeftRobe = joint(pelvis, 'front left robe spring', [-0.22, 0.085, 0.08], [0.02, 0.03, 0]);
  const frontRightRobe = joint(pelvis, 'front right robe spring', [0.22, 0.085, 0.08], [0.02, -0.03, 0]);
  const frontLeftHem = joint(frontLeftRobe, 'front left robe hem spring', [0, -0.55, 0.075], [0.02, 0, -0.02]);
  const frontRightHem = joint(frontRightRobe, 'front right robe hem spring', [0, -0.53, 0.07], [0.018, 0, 0.02]);
  const backRobe = joint(pelvis, 'back robe spring', [0, 0.1, -0.13], [0.04, 0, 0]);
  const frontLeftRobeGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.67, length: 0.8, taper: 0.07, flare: 0.49, curl: 0.11,
    wrap: 0.06, sway: -0.035, hem: 0.04, folds: 5, foldDepth: 0.029,
    raggedness: 0.13, raggedTeeth: 5, segmentsX: 12, segmentsY: 14,
  }));
  const frontRightRobeGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.65, length: 0.79, taper: 0.08, flare: 0.48, curl: 0.105,
    wrap: 0.058, sway: 0.035, hem: -0.03, folds: 5, foldDepth: 0.028,
    raggedness: 0.14, raggedTeeth: 6, segmentsX: 12, segmentsY: 14,
  }));
  const frontLeftHemGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.65, length: 0.82, taper: 0.08, flare: 0.72, curl: 0.22,
    wrap: 0.065, sway: -0.08, hem: 0.09, folds: 5, foldDepth: 0.035,
    raggedness: 0.24, raggedTeeth: 7, segmentsX: 12, segmentsY: 18,
  }));
  const frontRightHemGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.69, length: 0.88, taper: 0.09, flare: 0.7, curl: 0.205,
    wrap: 0.063, sway: 0.07, hem: -0.065, folds: 5, foldDepth: 0.034,
    raggedness: 0.27, raggedTeeth: 8, segmentsX: 12, segmentsY: 18,
  }));
  const backRobeGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 1.4, length: 1.56, taper: 0.01, flare: 0.56, curl: 0.26,
    wrap: 0.092, sway: -0.025, hem: 0.12, folds: 7, foldDepth: 0.037,
    raggedness: 0.28, raggedTeeth: 9, segmentsX: 18, segmentsY: 22,
  }));
  const centerRobeGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
    width: 0.54, length: 1.2, taper: 0.15, flare: 0.34, curl: 0.12,
    wrap: 0.043, hem: 0.05, folds: 4, foldDepth: 0.026,
    raggedness: 0.2, raggedTeeth: 6, segmentsX: 10, segmentsY: 18,
  }));
  mesh(pelvis, centerRobeGeometry, blackCloth, {
    name: 'layered central void stole',
    position: [0, 0.015, 0.1],
  });
  mesh(frontLeftRobe, frontLeftRobeGeometry, ivoryVestment, {
    name: 'curved left ivory vestment panel',
    rotation: [0, -0.035, 0.025],
  });
  mesh(frontRightRobe, frontRightRobeGeometry, ivoryVestment, {
    name: 'curved right ivory vestment panel',
    rotation: [0, 0.035, -0.025],
  });
  mesh(frontLeftHem, frontLeftHemGeometry, ivoryShadow, {
    name: 'articulated left ivory vestment hem',
    rotation: [0, -0.045, 0.065],
  });
  mesh(frontRightHem, frontRightHemGeometry, ivoryVestment, {
    name: 'articulated right ivory vestment hem',
    rotation: [0, 0.045, -0.055],
  });
  mesh(backRobe, backRobeGeometry, blackCloth, {
    name: 'folded black trailing chasuble',
    rotation: [0, Math.PI, 0],
  });
  addPanelPiping(ctx, frontLeftHem, eclipseEdge, [
    [-0.2, -0.56, 0.18], [-0.08, -0.64, 0.2], [0.04, -0.6, 0.205], [0.19, -0.69, 0.18],
  ], 'left violet ragged vestment edge', 0.012);
  addPanelPiping(ctx, frontRightHem, eclipseEdge, [
    [-0.22, -0.64, 0.18], [-0.07, -0.72, 0.205], [0.08, -0.68, 0.2], [0.23, -0.75, 0.18],
  ], 'right violet ragged vestment edge', 0.012);
  addPanelPiping(ctx, frontLeftRobe, brass, [
    [-0.155, -0.02, 0.05], [-0.16, -0.28, 0.075], [-0.135, -0.55, 0.11],
  ], 'left vestment upper', 0.012);
  addPanelPiping(ctx, frontLeftHem, brass, [
    [-0.13, -0.01, 0.045], [-0.14, -0.23, 0.085], [-0.085, -0.46, 0.145],
  ], 'left vestment hem', 0.011);
  addPanelPiping(ctx, frontRightRobe, brass, [
    [0.15, -0.02, 0.05], [0.155, -0.27, 0.072], [0.13, -0.53, 0.105],
  ], 'right vestment upper', 0.012);
  addPanelPiping(ctx, frontRightHem, brass, [
    [0.125, -0.01, 0.045], [0.135, -0.25, 0.08], [0.085, -0.52, 0.145],
  ], 'right vestment hem', 0.011);
  addPanelPiping(ctx, frontLeftHem, ivoryShadow, [
    [-0.19, -0.52, 0.17], [0, -0.485, 0.185], [0.19, -0.52, 0.17],
  ], 'left weighted hem', 0.017);
  addPanelPiping(ctx, frontRightHem, ivoryShadow, [
    [-0.215, -0.6, 0.17], [0, -0.635, 0.185], [0.215, -0.6, 0.17],
  ], 'right weighted hem', 0.017);
  addPanelPiping(ctx, backRobe, brass, [
    [0, -0.02, 0.045], [0.02, -0.38, 0.095], [-0.015, -0.78, 0.17], [0.03, -1.08, 0.23],
  ], 'chasuble spine', 0.012);
  for (const [parent, side] of [[frontLeftRobe, -1], [frontRightRobe, 1]]) {
    addPanelPiping(ctx, parent, brass, [
      [side * 0.03, -0.05, 0.075], [side * 0.13, -0.18, 0.095],
      [side * 0.04, -0.34, 0.115], [side * 0.16, -0.55, 0.14],
    ], `${side < 0 ? 'left' : 'right'} vestment branching filigree`, 0.011);
  }
  for (const [parent, side] of [[frontLeftHem, -1], [frontRightHem, 1]]) {
    addPanelPiping(ctx, parent, brass, [
      [side * 0.04, -0.035, 0.12], [side * 0.16, -0.19, 0.145],
      [side * 0.045, -0.37, 0.18], [side * 0.2, -0.58, 0.205],
      [side * 0.085, -0.76, 0.23],
    ], `${side < 0 ? 'left' : 'right'} lower robe branching filigree`, 0.012);
  }
  addPanelPiping(ctx, pelvis, brass, [
    [0, 0.03, 0.205], [-0.095, -0.2, 0.22], [0.015, -0.43, 0.245],
    [0.105, -0.66, 0.27], [-0.01, -0.92, 0.285],
  ], 'central chasuble gilded spine', 0.013);

  // In Black Noon the reliquary does not merely gain particles: its sealed
  // vestments unfold into two long, calligraphic mourning wings. They begin at
  // near-zero scale, so phases one and two retain their learned silhouette.
  const phaseStreamers = [];
  for (const side of [-1, 1]) {
    const upperLength = side < 0 ? 0.72 : 0.79;
    const tipLength = side < 0 ? 0.69 : 0.84;
    const pivot = joint(chest, `${side < 0 ? 'left' : 'right'} Black Noon streamer`, [side * 0.34, 0.24, -0.11], [0, 0, side * 0.14]);
    const streamerGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
      width: side < 0 ? 0.37 : 0.405, length: upperLength, taper: 0.2, flare: 0.25, curl: 0.15,
      wrap: 0.04, sway: side * 0.18, hem: side * 0.04, folds: 3, foldDepth: 0.028, segmentsX: 10, segmentsY: 16,
    }));
    mesh(pivot, streamerGeometry, mourningCloth, {
      name: `${side < 0 ? 'left' : 'right'} calligraphic mourning wing upper`,
    });
    const leadingFaceGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
      width: 0.075, length: upperLength * 0.94, taper: 0.08, flare: 0.08, curl: 0.1,
      wrap: 0.012, sway: side * 0.17, hem: side * 0.025, folds: 1, foldDepth: 0.008, segmentsX: 4, segmentsY: 12,
    }));
    mesh(pivot, leadingFaceGeometry, eclipseEdge, {
      name: `${side < 0 ? 'left' : 'right'} mourning wing leading face`,
      position: [side * 0.105, -0.015, 0.04],
      castShadow: false,
    });
    const tip = joint(pivot, `${side < 0 ? 'left' : 'right'} Black Noon trailing tip`, [side * 0.08, -upperLength * 0.86, 0.075], [0.05, 0, side * 0.12]);
    const tipGeometry = ctx.addGeometry(makeCurvedPanelGeometry({
      width: side < 0 ? 0.325 : 0.36, length: tipLength, taper: 0.61, flare: 0.35, curl: 0.245,
      wrap: 0.045, sway: side * 0.28, hem: side * 0.08, folds: 2, foldDepth: 0.025, segmentsX: 9, segmentsY: 18,
    }));
    mesh(tip, tipGeometry, mourningCloth, {
      name: `${side < 0 ? 'left' : 'right'} articulated mourning wing tip`,
    });
    addPanelPiping(ctx, pivot, eclipseEdge, [
      [side * 0.13, -0.02, 0.05], [side * 0.18, -upperLength * 0.48, 0.1],
      [side * 0.22, -upperLength * 0.9, 0.15],
    ], `${side < 0 ? 'left' : 'right'} mourning wing upper edge`, 0.024);
    addPanelPiping(ctx, tip, eclipseEdge, [
      [side * 0.13, -0.02, 0.05], [side * 0.2, -tipLength * 0.5, 0.13],
      [side * 0.27, -tipLength * 0.94, 0.23],
    ], `${side < 0 ? 'left' : 'right'} mourning wing trailing edge`, 0.021);
    mesh(tip, geometry.octa, eclipseEdge, {
      name: `${side < 0 ? 'left' : 'right'} mourning wing terminal`,
      position: [side * 0.27, -tipLength * 0.94, 0.23],
      scale: [0.12, 0.17, 0.07],
    });
    pivot.scale.setScalar(0.02);
    phaseStreamers.push({ pivot, tip, side });
  }

  const { haloRoot, segments: haloSegments } = buildBossHalo(ctx, body, { brass, telegraph });
  const ornaments = buildPhaseOrnaments(ctx, chest, {
    ivory, void: voidMaterial, brass, violet: eclipseEdge,
  });
  const weaponSocket = joint(rightHand, 'Vespera spear socket', [0, -0.04, 0], [0.04, 0, -0.06]);
  const { weapon, weaponTip } = buildSaintSpear(ctx, weaponSocket, {
    shaft, brass, ivory, void: voidMaterial, telegraph, violet: violetCore,
  });
  const seams = buildBossSeams(ctx, chest, { seamHousing, telegraph });

  const shadowProxyOptions = { castShadow: true, receiveShadow: false };
  mesh(chest, geometry.capsule, shadowProxy, {
    ...shadowProxyOptions,
    name: 'vespera shadow proxy torso',
    position: [0, -0.04, -0.02],
    scale: [0.62, 0.72, 0.4],
  });
  mesh(pelvis, geometry.capsule, shadowProxy, {
    ...shadowProxyOptions,
    name: 'vespera shadow proxy pelvis',
    position: [0, -0.09, 0],
    scale: [0.47, 0.46, 0.34],
  });
  mesh(head, geometry.lowSphere, shadowProxy, {
    ...shadowProxyOptions,
    name: 'vespera shadow proxy hood',
    position: [0, 0.04, -0.02],
    scale: [0.38, 0.44, 0.36],
  });
  for (const [side, shoulder, elbow, hip, knee] of [
    [-1, leftShoulder, leftElbow, leftHip, leftKnee],
    [1, rightShoulder, rightElbow, rightHip, rightKnee],
  ]) {
    mesh(shoulder, geometry.capsule, shadowProxy, {
      ...shadowProxyOptions,
      name: `vespera shadow proxy ${side < 0 ? 'left' : 'right'} upper arm`,
      position: [0, -0.22, 0],
      scale: [0.18, 0.4, 0.18],
    });
    mesh(elbow, geometry.capsule, shadowProxy, {
      ...shadowProxyOptions,
      name: `vespera shadow proxy ${side < 0 ? 'left' : 'right'} forearm`,
      position: [0, -0.2, 0],
      scale: [0.15, 0.36, 0.15],
    });
    mesh(hip, geometry.capsule, shadowProxy, {
      ...shadowProxyOptions,
      name: `vespera shadow proxy ${side < 0 ? 'left' : 'right'} thigh`,
      position: [0, -0.25, 0],
      scale: [0.21, 0.46, 0.21],
    });
    mesh(knee, geometry.capsule, shadowProxy, {
      ...shadowProxyOptions,
      name: `vespera shadow proxy ${side < 0 ? 'left' : 'right'} lower leg`,
      position: [0, -0.23, 0],
      scale: [0.17, 0.42, 0.17],
    });
  }
  mesh(backRobe, geometry.box, shadowProxy, {
    ...shadowProxyOptions,
    name: 'vespera shadow proxy trailing chasuble',
    position: [0, -0.72, -0.08],
    scale: [0.62, 1.42, 0.18],
  });
  mesh(weapon, geometry.box, shadowProxy, {
    ...shadowProxyOptions,
    name: 'vespera shadow proxy execution spear',
    position: [0, 1.06, 0],
    scale: [0.15, 2.14, 0.11],
  });
  for (const { pivot, side } of shoulderCannons) {
    mesh(pivot, geometry.cylinder, shadowProxy, {
      ...shadowProxyOptions,
      name: `vespera shadow proxy ${side < 0 ? 'left' : 'right'} shoulder cannon`,
      position: [0, 0, -0.02],
      rotation: [HALF_PI, 0, 0],
      scale: [0.5, 0.82, 0.5],
    });
  }

  const animated = [
    body, pelvis, spine, chest, neck, head,
    leftShoulder, leftElbow, leftHand, rightShoulder, rightElbow, rightHand,
    leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle,
    weaponSocket, haloRoot,
  ];
  const animator = createPoseAnimator(animated);
  const robeSprings = {
    frontLX: createSpring(0.02), frontLZ: createSpring(0),
    frontLHemX: createSpring(0.02), frontLHemZ: createSpring(-0.02),
    frontRX: createSpring(0.02), frontRZ: createSpring(0),
    frontRHemX: createSpring(0.018), frontRHemZ: createSpring(0.02),
    backX: createSpring(0.04), backZ: createSpring(0),
  };

  let flash = 0;
  let seamCount = seams.length;
  let phaseTarget = 1;
  let phaseValue = 1;
  let previousAction = 'bossidle';
  let dynamicBatches = null;
  const reaction = { strength: 0, side: 1, lift: 0, kind: 'hit', armored: true };

  function setSeams(count) {
    seamCount = clamp(Math.round(finite(count, seams.length)), 0, seams.length);
    seams.forEach((item, index) => { item.visible = index < seamCount; });
    group.userData.seams = seamCount;
  }

  function setPhase(value) {
    const nextPhase = resolvePhase(value);
    // Phase increases unfold during the authored transition pose. A reset or
    // rematch must never inherit the final-phase silhouette for even one beat.
    if (nextPhase < phaseTarget || nextPhase === 1) {
      phaseValue = nextPhase;
      if (nextPhase === 1) {
        reaction.strength = 0;
        shellPivot.position.set(0, 0, 0);
        shellPivot.rotation.set(0, 0, 0);
        for (const segmentInfo of haloSegments) {
          const { joint: haloJoint, angle } = segmentInfo;
          haloJoint.position.set(Math.sin(angle) * 0.56, Math.cos(angle) * 0.56, 0);
          haloJoint.rotation.set(0, 0, angle - HALF_PI);
          haloJoint.scale.setScalar(1);
        }
        for (const ornament of ornaments) {
          ornament.pivot.rotation.set(
            -0.04 - ornament.row * 0.025,
            ornament.side * (0.08 + ornament.row * 0.045),
            -ornament.side * (0.46 + ornament.row * 0.22),
          );
          ornament.pivot.scale.setScalar(0.94);
        }
        for (const streamer of phaseStreamers) {
          streamer.pivot.rotation.set(0, 0, streamer.side * 0.08);
          streamer.tip.rotation.set(0.05, 0, streamer.side * 0.12);
          streamer.pivot.scale.setScalar(0.02);
        }
        for (const cannon of shoulderCannons) {
          cannon.pivot.position.set(cannon.side * .69, .5, -.075);
          cannon.pivot.rotation.set(-.08, cannon.side * -.08, cannon.side * -.08);
          cannon.pivot.scale.setScalar(.92);
          cannon.upperDoor.rotation.set(0, 0, 0);
          cannon.lowerDoor.rotation.set(0, 0, Math.PI);
        }
      }
    }
    phaseTarget = nextPhase;
    group.userData.phase = phaseTarget;
  }

  function react({ strength = .4, side = 1, lift = 0, kind = 'hit', armored = true } = {}) {
    const amount = saturate(finite(strength, .4));
    if (amount < reaction.strength * .72) return;
    reaction.strength = Math.max(reaction.strength, amount);
    reaction.side = finite(side, 1) < 0 ? -1 : 1;
    reaction.lift = saturate(finite(lift));
    reaction.kind = String(kind || 'hit');
    reaction.armored = Boolean(armored);
    // Seed the render-only shell immediately so a hitstop frame never freezes
    // the untouched upright pose. The spear and exposed core are not children
    // of this pivot and therefore retain their truthful combat transforms.
    const breakScale = reaction.armored ? .55 : 1;
    shellPivot.rotation.x -= amount * (.035 + reaction.lift * .055) * breakScale;
    shellPivot.rotation.z += reaction.side * amount * .07 * breakScale;
    shellPivot.position.y += reaction.lift * amount * .035;
    group.userData.reactionStrength = reaction.strength;
  }

  function hitFlash(strength = 1) {
    flash = Math.max(flash, saturate(finite(strength, 1)));
    applyMaterialFlash(ctx.flashables, flash);
  }

  function baseBossPose(pose, time) {
    const speed = normalizedSpeed(pose.moveSpeed);
    const step = Math.sin(time * lerp(2.3, 6.2, speed)) * speed;
    const breath = Math.sin(time * 1.5);
    animator.position(body, 0, Math.abs(Math.sin(time * 3.1)) * speed * 0.025, 0);
    animator.rotate(pelvis, -speed * 0.045, step * 0.05, step * 0.025);
    animator.rotate(spine, breath * 0.014 + speed * 0.05, -step * 0.06, -step * 0.02);
    animator.rotate(chest, -breath * 0.012, -step * 0.07, step * 0.026);
    animator.rotate(neck, breath * 0.008, step * 0.04, -step * 0.01);
    animator.rotate(head, -0.035 + breath * -0.012, step * 0.055, -step * 0.018);
    animator.rotate(leftHip, step * 0.34, 0, -0.02);
    animator.rotate(rightHip, -step * 0.34, 0, 0.02);
    animator.rotate(leftKnee, Math.max(0, -step) * 0.42, 0, 0);
    animator.rotate(rightKnee, Math.max(0, step) * 0.42, 0, 0);
    animator.rotate(leftShoulder, -step * 0.14 + breath * 0.018, 0, -0.08);
    animator.rotate(leftElbow, -0.28 - Math.max(0, step) * 0.12, 0, -0.04);
    animator.rotate(rightShoulder, step * 0.08, 0, 0.06);
    animator.rotate(rightElbow, -0.28, 0, 0.06);
    animator.rotate(weaponSocket, breath * 0.008, 0, -step * 0.025);
    animator.rotate(haloRoot, 0.08 + breath * 0.025, Math.sin(time * 0.63) * 0.045, time * 0.055 * (phaseValue - 0.65));
  }

  function applyBossAction(action, at, pose) {
    const actionPhase = resolvePhase(pose.phase ?? phaseTarget);
    if (action === 'slash') {
      // The slash family is intentionally a measured sequence. Each reversal
      // reaches its visual contact on the same beat as combat's hit event.
      const contacts = actionPhase >= 3 ? [0.48, 0.79, 1.12, 1.43] : [0.49, 0.87, 1.23];
      const frames = actionPhase >= 3
        ? [[0, 0], [0.25, -1], [0.48, 1], [0.69, 0.86], [0.73, 1], [0.79, -1], [1, -0.86], [1.05, -1], [1.12, 1], [1.32, 0.86], [1.36, 1], [1.43, -1], [1.72, -0.72], [2.06, 0]]
        : [[0, 0], [0.34, -1], [0.52, 1], [0.73, 0.86], [0.79, 1], [0.87, -1], [1.08, -0.86], [1.14, -1], [1.23, 1], [1.43, 0.78], [1.62, 0]];
      const arc = keyCurve(at, frames);
      const strike = Math.max(...contacts.map((contact) => windowPulse(at, contact - 0.07, contact, contact + 0.13, contact + 0.25)));
      animator.addRotation(pelvis, 0, arc * 0.38, -strike * 0.1);
      animator.addRotation(chest, -strike * 0.18, arc * 0.62, -arc * 0.16);
      animator.addRotation(head, 0, -arc * 0.2, arc * 0.05);
      animator.addRotation(rightShoulder, -0.5 - strike * 0.52, arc * 0.28, -arc * 0.62);
      animator.addRotation(rightElbow, -0.42, 0, arc * 0.2);
      animator.addRotation(weaponSocket, arc * 0.18, arc * 0.24, arc * 1.5);
      animator.addRotation(leftShoulder, -strike * 0.42, 0, 0.34);
      animator.position(body, 0, -strike * 0.1, strike * 0.3);
    } else if (action === 'thrust') {
      const contact = actionPhase >= 3 ? 0.83 : 1.08;
      const line = keyCurve(at, [[0, 0], [contact * 0.5, -0.82], [contact - 0.12, -1], [contact, 1], [contact + 0.27, 0.88], [contact + 0.68, 0]]);
      const extend = Math.max(0, line);
      const recoil = Math.max(0, -line);
      animator.addRotation(pelvis, -extend * 0.16, line * 0.12, 0);
      animator.addRotation(chest, recoil * 0.22 - extend * 0.38, -line * 0.18, 0);
      animator.addRotation(rightShoulder, recoil * 0.3 - extend * 1.05, 0, -extend * 0.16);
      animator.addRotation(rightElbow, recoil * -0.5 + extend * 0.25, 0, 0);
      animator.addRotation(weaponSocket, recoil * -0.52 + extend * 1.48, 0, line * -0.08);
      animator.addRotation(leftShoulder, -extend * 0.8, 0, -extend * 0.48);
      animator.addRotation(leftElbow, -extend * 0.68, 0, extend * 0.18);
      animator.addRotation(leftHip, extend * 0.52, 0, 0);
      animator.addRotation(rightKnee, extend * 0.65, 0, 0);
      animator.position(body, 0, -extend * 0.11, extend * 0.42);
    } else if (action === 'sweep') {
      const contacts = actionPhase === 2 ? [0.72, 1.22] : [0.96];
      const turn = actionPhase === 2
        ? keyCurve(at, [[0, 0], [0.53, -1], [0.91, 1], [1.08, 0.84], [1.1, 1], [1.34, -1], [1.52, -0.76], [1.68, 0], [1.82, 0]])
        : keyCurve(at, [[0, 0], [0.8, -1], [1.04, 1], [1.3, 0.78], [1.52, 0], [1.68, 0]]);
      const stance = actionPhase === 2
        ? windowPulse(at, 0, 0.08, 1.58, 1.76)
        : windowPulse(at, 0, 0.08, 1.4, 1.58);
      const ready = windowPulse(at, 0, 0.24, contacts[0] - 0.15, contacts[0] + 0.03);
      const swing = Math.max(...contacts.map((contact) => windowPulse(at, contact - 0.08, contact, contact + 0.16, contact + 0.32)));
      animator.addRotation(pelvis, -ready * 0.2, turn * 0.72, turn * 0.12);
      animator.addRotation(spine, ready * 0.14 - swing * 0.2, turn * 0.62, -turn * 0.14);
      animator.addRotation(chest, -swing * 0.19, turn * 0.8, -turn * 0.17);
      animator.addRotation(rightShoulder, stance * -0.62, turn * 0.26, -turn * 0.54);
      animator.addRotation(rightElbow, stance * -0.32, 0, turn * 0.12);
      animator.addRotation(weaponSocket, stance * -0.05, turn * 0.2, stance * -HALF_PI + turn * 0.68);
      animator.addRotation(leftShoulder, stance * -0.72, -turn * 0.25, stance * 0.48);
      animator.addRotation(leftElbow, stance * -0.75, 0, stance * -0.25);
      animator.addRotation(leftHip, swing * 0.42, 0, -0.1);
      animator.addRotation(rightKnee, swing * 0.56, 0, 0);
      animator.position(body, 0, -swing * 0.12, swing * 0.22);
    } else if (action === 'slam') {
      const lift = windowPulse(at, 0, 0.28, 0.78, 0.91);
      const down = keyCurve(at, [[0, 0], [0.48, -0.7], [0.79, -1], [0.91, 1], [1.18, 0.88], [1.69, 0]]);
      const impact = windowPulse(at, 0.82, 0.91, 1.16, 1.55);
      animator.addRotation(pelvis, lift * -0.25 + impact * 0.34, 0, 0);
      animator.addRotation(spine, lift * -0.28 + impact * 0.48, 0, 0);
      animator.addRotation(chest, lift * -0.36 + impact * 0.56, down * 0.1, 0);
      animator.addRotation(head, lift * 0.22 - impact * 0.3, 0, 0);
      animator.addRotation(rightShoulder, -1.45 + impact * 0.52, 0, -0.18);
      animator.addRotation(rightElbow, -0.45 + impact * 0.32, 0, 0);
      animator.addRotation(weaponSocket, lift * -0.7 + impact * 1.7, down * 0.08, down * 0.16);
      animator.addRotation(leftShoulder, -1.1 + impact * 0.42, 0, 0.62);
      animator.addRotation(leftElbow, -0.6, 0, -0.2);
      animator.addRotation(leftHip, impact * 0.7, 0, -0.12);
      animator.addRotation(rightHip, impact * 0.42, 0, 0.12);
      animator.addRotation(leftKnee, impact * 0.82, 0, 0);
      animator.addRotation(rightKnee, impact * 0.66, 0, 0);
      animator.position(body, 0, lift * 0.08 - impact * 0.28, impact * 0.18);
    } else if (action === 'dive') {
      const firstContact = actionPhase >= 3 ? 0.91 : 1.0;
      const rise = windowPulse(at, 0, 0.3, firstContact - 0.2, firstContact - 0.05);
      const dive = segment(at, firstContact - 0.28, firstContact - 0.08) * (1 - segment(at, firstContact + 0.02, firstContact + 0.2));
      const land = windowPulse(at, firstContact - 0.06, firstContact, firstContact + 0.23, firstContact + 0.48);
      const finalBlow = actionPhase >= 3 ? windowPulse(at, 1.7, 1.92, 2.16, 2.52) : 0;
      const channel = actionPhase >= 3 ? windowPulse(at, 1.1, 1.34, 1.82, 2.0) : windowPulse(at, 1.08, 1.24, 1.38, 1.72);
      animator.position(body, 0, rise * 0.56 + channel * 0.1 - land * 0.28 - finalBlow * 0.18, dive * 0.4 + finalBlow * 0.15);
      animator.addRotation(chest, rise * -0.18 + dive * 0.82 - land * 0.56 + channel * -0.16 + finalBlow * 0.48, 0, 0);
      animator.addRotation(head, rise * -0.12 + dive * -0.35, 0, 0);
      animator.addRotation(rightShoulder, -1.05 - dive * 0.42 - finalBlow * 0.36, 0, -0.2);
      animator.addRotation(rightElbow, -0.22, 0, 0);
      animator.addRotation(weaponSocket, dive * 1.5 - rise * 0.35 + channel * -0.28 + finalBlow * 1.34, 0, 0.08);
      animator.addRotation(leftShoulder, rise * -0.8 + dive * 0.4 - channel * 0.68 + finalBlow * 0.45, 0, 0.7);
      animator.addRotation(leftHip, rise * -0.42 + land * 0.8, 0, -0.2);
      animator.addRotation(rightHip, rise * 0.28 + land * 0.55, 0, 0.2);
      animator.addRotation(leftKnee, rise * 0.75 + land * 0.72, 0, 0);
      animator.addRotation(rightKnee, rise * 0.42 + land * 0.86, 0, 0);
    } else if (action === 'cast') {
      const castContacts = actionPhase >= 3 ? [1.04, 1.61] : [0.86, 1.28, 1.68];
      const gather = windowPulse(at, 0, 0.3, castContacts[0] - 0.11, castContacts[0] + 0.07);
      const channel = windowPulse(at, castContacts[0] - 0.08, castContacts[0], castContacts[castContacts.length - 1] + 0.18, castContacts[castContacts.length - 1] + 0.42);
      const release = Math.max(...castContacts.map((contact) => windowPulse(at, contact - 0.055, contact, contact + 0.09, contact + 0.18)));
      animator.addRotation(pelvis, -gather * 0.08, 0, 0);
      animator.addRotation(chest, -gather * 0.18 - channel * 0.1 + release * 0.14, 0, 0);
      animator.addRotation(head, -gather * 0.2 - channel * 0.09, 0, 0);
      animator.addRotation(leftShoulder, -(gather + channel) * 1.05 + release * 0.34, 0, -(gather + channel) * 0.22);
      animator.addRotation(leftElbow, (gather + channel) * 0.54, 0, (gather + channel) * 0.15);
      animator.addRotation(rightShoulder, -(gather + channel) * 0.24, 0, (gather + channel) * 0.08);
      animator.addRotation(rightElbow, -(gather + channel) * 0.38, 0, 0);
      animator.addRotation(weaponSocket, (gather + channel) * -0.08, 0, (gather + channel) * 0.1);
      animator.addRotation(haloRoot, (gather + channel) * 0.15, (gather + channel) * 0.2, at * channel * 0.85 + release * 0.6);
      animator.position(body, 0, gather * 0.09 + channel * 0.06, 0);
    } else if (action === 'stagger' || pose.stunned) {
      const stagger = windowPulse(at, 0, 0.08, 0.56, 0.92);
      const shake = Math.sin(at * 23) * stagger;
      animator.addRotation(pelvis, stagger * 0.22, -shake * 0.08, stagger * 0.12);
      animator.addRotation(spine, stagger * 0.38, -stagger * 0.23, shake * 0.06);
      animator.addRotation(chest, stagger * 0.45, -stagger * 0.35, stagger * 0.18);
      animator.addRotation(head, stagger * -0.42, stagger * 0.22 + shake * 0.08, -stagger * 0.16);
      animator.addRotation(leftShoulder, stagger * 0.55, 0, -stagger * 0.5);
      animator.addRotation(rightShoulder, stagger * 0.42, 0, stagger * 0.4);
      animator.addRotation(rightElbow, stagger * 0.3, 0, 0);
      animator.addRotation(weaponSocket, stagger * 0.55, 0, -stagger * 0.45);
      animator.addRotation(leftHip, stagger * 0.34, 0, -0.1);
      animator.addRotation(rightKnee, stagger * 0.72, 0, 0);
      animator.position(body, 0, -stagger * 0.18, -stagger * 0.16);
    } else if (action === 'transition') {
      const open = segment(at, 0, 0.7) * (1 - segment(at, 1.65, 2.15));
      const shudder = Math.sin(at * 18) * open * (1 - segment(at, 1.1, 1.55));
      animator.position(body, 0, open * 0.18, 0);
      animator.addRotation(pelvis, -open * 0.15, shudder * 0.025 - open * 0.08, -open * 0.06);
      animator.addRotation(spine, -open * 0.2, shudder * -0.035 - open * 0.14, open * 0.11);
      animator.addRotation(chest, -open * 0.28, -open * 0.18, open * 0.14);
      animator.addRotation(head, -open * 0.35, open * 0.24, -open * 0.08);
      animator.addRotation(leftShoulder, -open * 1.16, open * 0.18, -open * 0.52);
      animator.addRotation(leftElbow, open * 1.08, 0, open * 0.18);
      animator.addRotation(rightShoulder, -open * 0.38, -open * 0.22, open * 0.76);
      animator.addRotation(rightElbow, -open * 1.02, 0, -open * 0.12);
      animator.addRotation(weaponSocket, open * -0.72, open * 0.24, open * 0.52);
      animator.addRotation(haloRoot, open * 0.32, open * 0.25, at * open * 1.7 + open * 0.18);
    }
  }

  function applyBossDeath(at) {
    const breakPose = segment(at, 0, 0.7);
    const kneel = segment(at, 0.62, 1.45);
    const fall = segment(at, 1.35, 2.35);
    animator.position(body, 0, -kneel * 0.48 - fall * 0.5, -fall * 0.2);
    animator.rotate(pelvis, kneel * 0.34 + fall * 0.72, 0.12 * breakPose, fall * -0.42);
    animator.rotate(spine, breakPose * 0.28 + fall * 0.55, -breakPose * 0.15, fall * -0.25);
    animator.rotate(chest, -breakPose * 0.2 + fall * 0.62, breakPose * 0.18, fall * -0.22);
    animator.rotate(head, -breakPose * 0.52 + fall * 0.3, breakPose * -0.2, fall * 0.35);
    animator.rotate(leftShoulder, breakPose * -0.7 + fall * 0.5, 0, -breakPose * 0.85);
    animator.rotate(rightShoulder, breakPose * -0.52 + fall * 0.7, 0, breakPose * 0.64);
    animator.rotate(leftElbow, breakPose * 0.4, 0, 0);
    animator.rotate(rightElbow, breakPose * 0.28, 0, 0);
    animator.rotate(weaponSocket, breakPose * 0.6 + fall * 0.4, 0, breakPose * 0.5);
    animator.rotate(leftHip, kneel * 0.65, 0, -kneel * 0.2);
    animator.rotate(rightHip, kneel * 0.42, 0, kneel * 0.18);
    animator.rotate(leftKnee, kneel * 1.22, 0, 0);
    animator.rotate(rightKnee, kneel * 1.42, 0, 0);
    animator.rotate(haloRoot, fall * 0.55, breakPose * 0.3, breakPose * 0.8);
  }

  function updatePhaseSilhouette(dt, time, action, at, dead, move = '') {
    phaseValue = damp(phaseValue, phaseTarget, action === 'transition' ? 4.5 : 2.4, dt);
    const phase2 = saturate(phaseValue - 1);
    const phase3 = saturate(phaseValue - 2);
    const transitionPulse = action === 'transition' ? Math.sin(at * 14) * (1 - segment(at, 1.2, 1.8)) : 0;
    const deathDrop = dead ? segment(at, 0.8, 2.2) : 0;
    const finalCannonContacts = {
      twinMeridian: [1.02, 1.52, 2.02],
      hourbreak: [1.62, 2.16],
      totality: [1.62, 2.02, 2.42, 2.82],
      blackSpearline: [1.68, 2.16],
    }[move];
    const cannonContacts = phaseTarget >= 3
      ? (finalCannonContacts || [1.04, 1.61])
      : [0.86, 1.28, 1.68];
    const cannonFire = (action === 'cast' || Boolean(finalCannonContacts))
      ? Math.max(...cannonContacts.map((contact) => windowPulse(at, contact - .055, contact, contact + .06, contact + .17)))
      : 0;

    for (const cannon of shoulderCannons) {
      const { pivot, upperDoor, lowerDoor, side } = cannon;
      const awaken = smoother01(phase2);
      const siege = smoother01(phase3);
      const targetScale = .92 + awaken * .1 + siege * .12;
      pivot.position.x = damp(pivot.position.x, side * (.69 + awaken * .055 + siege * .105), 8, dt);
      pivot.position.y = damp(pivot.position.y, .5 + awaken * .075 + siege * .12 - deathDrop * .15, 8, dt);
      pivot.position.z = damp(pivot.position.z, -.075 - cannonFire * .095 + siege * .025, 17, dt);
      pivot.rotation.x = dampAngle(pivot.rotation.x, -.08 - awaken * .07 - siege * .09 + cannonFire * .12, 9, dt);
      pivot.rotation.y = dampAngle(pivot.rotation.y, side * (-.08 - awaken * .1 - siege * .12), 9, dt);
      pivot.rotation.z = dampAngle(pivot.rotation.z, side * (-.08 - awaken * .13 - siege * .18 + transitionPulse * .025), 9, dt);
      pivot.scale.set(
        damp(pivot.scale.x, targetScale, 8, dt),
        damp(pivot.scale.y, targetScale, 8, dt),
        damp(pivot.scale.z, targetScale, 8, dt),
      );
      const doorOpen = .12 + awaken * .38 + siege * .62 + cannonFire * .24;
      upperDoor.rotation.x = dampAngle(upperDoor.rotation.x, -doorOpen, 13, dt);
      lowerDoor.rotation.x = dampAngle(lowerDoor.rotation.x, doorOpen, 13, dt);
      lowerDoor.rotation.z = Math.PI;
    }
    group.userData.cannonCharge = cannonFire;

    for (const segmentInfo of haloSegments) {
      const { joint: haloJoint, angle, index } = segmentInfo;
      const alternating = index % 2 === 0 ? 1 : -1;
      const radius = 0.56 + phase2 * 0.11 + phase3 * (0.22 + Math.sin(angle * 2) * 0.045);
      const spreadX = 1 + phase3 * 0.62;
      const spreadY = 1 + phase3 * 0.24;
      const targetX = Math.sin(angle) * radius * spreadX + Math.sin(angle) * deathDrop * 0.24;
      const targetY = Math.cos(angle) * radius * spreadY - deathDrop * (0.15 + index * 0.027);
      const targetZ = alternating * phase2 * 0.035 + phase3 * (0.06 + alternating * 0.055) + deathDrop * alternating * 0.16;
      haloJoint.position.x = damp(haloJoint.position.x, targetX, 8, dt);
      haloJoint.position.y = damp(haloJoint.position.y, targetY, 8, dt);
      haloJoint.position.z = damp(haloJoint.position.z, targetZ, 8, dt);
      const targetRotation = angle - HALF_PI + alternating * phase2 * 0.08 + phase3 * Math.sin(angle * 3) * 0.2 + deathDrop * alternating * 0.45;
      haloJoint.rotation.z = dampAngle(haloJoint.rotation.z, targetRotation, 9, dt);
      haloJoint.rotation.x = dampAngle(haloJoint.rotation.x, phase2 * alternating * 0.08 + deathDrop * 0.3, 8, dt);
      const scale = 1 + phase2 * 0.08 + phase3 * 0.2;
      haloJoint.scale.set(
        damp(haloJoint.scale.x, scale, 8, dt),
        damp(haloJoint.scale.y, scale, 8, dt),
        damp(haloJoint.scale.z, scale, 8, dt),
      );
    }

    for (const ornament of ornaments) {
      const { pivot, side, row } = ornament;
      const foldedZ = -side * (0.46 + row * 0.22);
      const phase2Z = -side * (0.58 + row * 0.24);
      const phase3Z = -side * (0.5 + row * 0.28);
      let targetZ = lerp(foldedZ, phase2Z, phase2);
      targetZ = lerp(targetZ, phase3Z, phase3);
      targetZ -= transitionPulse * side * (0.035 + row * 0.02);
      if (dead) targetZ = lerp(targetZ, -side * (2.25 - row * 0.15), deathDrop);
      pivot.rotation.z = dampAngle(pivot.rotation.z, targetZ, 7.5, dt);
      pivot.rotation.y = dampAngle(
        pivot.rotation.y,
        side * (0.08 + row * 0.045 + phase2 * -0.18 + phase3 * 0.36),
        7,
        dt,
      );
      pivot.rotation.x = dampAngle(
        pivot.rotation.x,
        -0.04 - row * 0.025 + phase3 * (row ? -0.12 : 0.08) + deathDrop * 0.45,
        7,
        dt,
      );
      const targetScale = 0.94 + phase2 * 0.18 + phase3 * 0.22;
      pivot.scale.x = damp(pivot.scale.x, targetScale, 7, dt);
      pivot.scale.y = damp(pivot.scale.y, targetScale, 7, dt);
      pivot.scale.z = damp(pivot.scale.z, targetScale, 7, dt);
    }

    for (const streamer of phaseStreamers) {
      const { pivot, tip, side } = streamer;
      const unfurl = smoother01(phase3);
      const fullScale = dead ? lerp(1.34, 0.76, deathDrop) : 1.34;
      const targetScale = 0.02 + unfurl * fullScale;
      const openZ = side * (0.14 + unfurl * 0.9);
      const collapsedZ = side * 0.28;
      pivot.rotation.z = dampAngle(pivot.rotation.z, dead ? lerp(openZ, collapsedZ, deathDrop) : openZ, 6.8, dt);
      pivot.rotation.x = dampAngle(pivot.rotation.x, unfurl * -0.12 + deathDrop * 0.55, 6.4, dt);
      pivot.rotation.y = dampAngle(pivot.rotation.y, side * unfurl * 0.36, 6.4, dt);
      const tipDrag = unfurl * (0.16 + Math.sin(time * 2.7 + side) * 0.055);
      tip.rotation.x = dampAngle(tip.rotation.x, 0.05 + tipDrag * 0.7 + deathDrop * 0.38, 5.4, dt);
      tip.rotation.y = dampAngle(tip.rotation.y, side * unfurl * -0.12, 5.2, dt);
      tip.rotation.z = dampAngle(tip.rotation.z, side * (0.12 + tipDrag), 5.1, dt);
      pivot.scale.set(
        damp(pivot.scale.x, targetScale, 6.5, dt),
        damp(pivot.scale.y, targetScale, 6.5, dt),
        damp(pivot.scale.z, targetScale, 6.5, dt),
      );
    }

    group.userData.phaseBlend = phaseValue;
    group.userData.phasePulse = 0.5 + Math.sin(time * (2 + phaseValue)) * 0.5;
  }

  function update(pose = {}, time = 0, dt = 1 / 60) {
    const safeTime = finite(time);
    const safeDt = clamp(finite(dt, 1 / 60), 1 / 240, 0.05);
    const action = normalizeAction(pose.action, 'bossidle');
    const at = Math.max(0, finite(pose.actionTime));
    const speed = normalizedSpeed(pose.moveSpeed);
    const dead = Boolean(pose.dead) || finite(pose.healthRatio, 1) <= 0 || action === 'death';

    animator.reset();
    baseBossPose(pose, safeTime);
    if (dead) applyBossDeath(at);
    else applyBossAction(action, at, pose);
    if (dead) reaction.strength = 0;
    const recoil = dead ? 0 : reaction.strength;
    if (recoil > .001) {
      const breakScale = reaction.armored ? .56 : 1;
      const side = reaction.side;
      animator.addRotation(head, -recoil * (.08 + reaction.lift * .12) * breakScale, side * recoil * .24 * breakScale, side * recoil * .17 * breakScale);
      animator.addRotation(neck, recoil * .05 * breakScale, side * recoil * .13 * breakScale, side * recoil * .08 * breakScale);
      animator.addRotation(leftShoulder, recoil * .1 * breakScale, side * recoil * .04, -side * recoil * .16 * breakScale);
      animator.addRotation(leftElbow, recoil * .13 * breakScale, 0, side * recoil * .07);
      animator.addRotation(haloRoot, recoil * (.08 + reaction.lift * .15) * breakScale, -side * recoil * .16 * breakScale, side * recoil * .28 * breakScale);
    }
    const aggressive = ['slash', 'thrust', 'sweep', 'slam', 'dive'].includes(action);
    const resetFromDeath = previousAction === 'death' && !dead;
    animator.apply(safeDt, action !== previousAction ? 38 : (aggressive ? 31 : 24), resetFromDeath);
    if (resetFromDeath) flash = 0;
    previousAction = action;

    const shellBreak = reaction.armored ? .56 : 1;
    shellPivot.rotation.x = dampAngle(shellPivot.rotation.x, -recoil * (.055 + reaction.lift * .075) * shellBreak, 31, safeDt);
    shellPivot.rotation.y = dampAngle(shellPivot.rotation.y, reaction.side * recoil * .075 * shellBreak, 29, safeDt);
    shellPivot.rotation.z = dampAngle(shellPivot.rotation.z, reaction.side * recoil * .12 * shellBreak, 32, safeDt);
    shellPivot.position.y = damp(shellPivot.position.y, reaction.lift * recoil * .055, 28, safeDt);
    shellPivot.position.z = damp(shellPivot.position.z, -recoil * .025 * shellBreak, 28, safeDt);

    updatePhaseSilhouette(safeDt, safeTime, action, at, dead, pose.move || '');

    const actionDrag = (aggressive ? Math.abs(Math.sin(Math.min(at * 7, Math.PI))) * 0.26 : 0) + recoil * .12;
    const stepSway = Math.sin(safeTime * lerp(2.1, 6.2, speed)) * (0.02 + speed * 0.08);
    const phaseDrag = (phaseValue - 1) * 0.04;
    frontLeftRobe.rotation.x = springTo(robeSprings.frontLX, 0.02 + speed * 0.22 + actionDrag, 58, 11, safeDt);
    frontLeftRobe.rotation.z = springTo(robeSprings.frontLZ, -stepSway - actionDrag * 0.18, 47, 9, safeDt);
    frontLeftHem.rotation.x = springTo(robeSprings.frontLHemX, 0.02 + speed * 0.12 + actionDrag * 0.44 + phaseDrag, 34, 7.5, safeDt);
    frontLeftHem.rotation.z = springTo(robeSprings.frontLHemZ, -0.02 - stepSway * 0.8 - actionDrag * 0.12, 31, 7.1, safeDt);
    frontRightRobe.rotation.x = springTo(robeSprings.frontRX, 0.02 + speed * 0.2 + actionDrag * 0.86, 61, 11, safeDt);
    frontRightRobe.rotation.z = springTo(robeSprings.frontRZ, stepSway + actionDrag * 0.15, 49, 9, safeDt);
    frontRightHem.rotation.x = springTo(robeSprings.frontRHemX, 0.018 + speed * 0.11 + actionDrag * 0.38 + phaseDrag * 0.85, 36, 7.8, safeDt);
    frontRightHem.rotation.z = springTo(robeSprings.frontRHemZ, 0.02 + stepSway * 0.76 + actionDrag * 0.1, 32, 7.2, safeDt);
    backRobe.rotation.x = springTo(robeSprings.backX, 0.04 + speed * 0.34 + actionDrag + phaseDrag, 52, 9, safeDt);
    backRobe.rotation.z = springTo(robeSprings.backZ, stepSway * 0.7, 42, 8, safeDt);

    reaction.strength *= Math.exp(-(reaction.armored ? 8.8 : 6.4) * safeDt);
    if (reaction.strength < .002) reaction.strength = 0;
    group.userData.reactionStrength = reaction.strength;

    const telegraphAmount = pose.telegraph ? (Number.isFinite(pose.telegraph) ? saturate(pose.telegraph) : 1) : 0;
    const healthRatio = saturate(finite(pose.healthRatio, 1));
    const phaseGlow = (phaseValue - 1) * 0.58;
    const seamGlow = seamCount / Math.max(1, seams.length) * 0.35;
    const castGlow = action === 'cast' || action === 'transition' ? 1 : 0;
    telegraph.emissiveIntensity = 1.55 + phaseGlow + seamGlow + telegraphAmount * 2.7 + castGlow * 1.2;
    brass.emissiveIntensity = 0.22 + phaseGlow * 0.25 + telegraphAmount * 0.32;
    violetCore.emissiveIntensity = 2.35 + phaseGlow * 1.15 + telegraphAmount * 1.4
      + castGlow * 1.65 + finite(group.userData.cannonCharge) * 2.2;
    const corePulse = 1 + Math.sin(safeTime * (3.1 + phaseValue)) * 0.055 + telegraphAmount * 0.16 + castGlow * 0.08;
    core.scale.set(0.19 * corePulse, 0.21 * corePulse, 0.085 * corePulse);
    core.rotation.z += safeDt * (0.35 + phaseValue * 0.22 + telegraphAmount * 1.8);
    if (healthRatio < 0.34) core.rotation.x = Math.sin(safeTime * 9) * 0.06;

    flash = Math.max(0, flash - safeDt * 4.6);
    const overrides = new Map([
      [telegraph, telegraph.emissiveIntensity],
      [brass, brass.emissiveIntensity],
      [violetCore, violetCore.emissiveIntensity],
    ]);
    applyMaterialFlash(ctx.flashables, flash, overrides);
    dynamicBatches?.sync();
  }

  function dispose() {
    dynamicBatches?.dispose();
    ctx.dispose(group);
  }

  setSeams(seams.length);
  setPhase(1);
  const protectedBossObjects = new Set([
    core,
    weapon,
    weaponTip,
    ...seams,
    ...animated,
    ...shoulderCannons.flatMap(({ pivot, upperDoor, lowerDoor, muzzle }) => [pivot, upperDoor, lowerDoor, muzzle]),
    ...haloSegments.flatMap(({ joint: haloJoint, mesh: haloMesh }) => [haloJoint, haloMesh]),
    ...ornaments.flatMap(({ pivot, ornament }) => [pivot, ornament]),
    ...phaseStreamers.flatMap(({ pivot, tip }) => [pivot, tip]),
  ].filter(Boolean));
  mergeStaticSiblingMeshes(group, protectedBossObjects, ctx.addGeometry);
  applyCharacterShadowBudget(group, BOSS_SHADOW_CASTERS);
  dynamicBatches = createDynamicCharacterBatches(group);
  dynamicBatches.sync();
  group.userData.dynamicBatchCount = dynamicBatches.batches.length;
  group.userData.dynamicBatchSourceCount = dynamicBatches.sourceCount;

  return {
    group,
    body,
    weapon,
    weaponTip,
    core,
    leftShoulderMuzzle: shoulderCannons.find((cannon) => cannon.side < 0)?.muzzle,
    rightShoulderMuzzle: shoulderCannons.find((cannon) => cannon.side > 0)?.muzzle,
    materials: ctx.materials,
    update,
    setPhase,
    setSeams,
    hitFlash,
    react,
    dispose,
  };
}
